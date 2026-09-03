import { useState, useEffect, useRef, useCallback } from 'react';
import { TTSVoiceOption, TTSSettings, SentenceItem, RVCServerStatus } from '../types';

export const DEFAULT_SETTINGS: TTSSettings = {
  ttsProvider: 'browser',
  rvcServerUrl: 'http://localhost:8008',
  voiceURI: '',
  rate: 1.0,
  pitch: 1.0,
  volume: 1.0,
  highlightStyle: 'soft-gold',
  autoScroll: true,
  continuousReading: true,
  mascotEnabled: true,
  mascotType: 'fox',
  mascotBounceAnimation: true,
  mascotBlinkAnimation: true,
  mascotFloatingAnimation: true,
  mascotSpeechBubble: true,
  fontSize: 18,
  lineHeight: 1.8,
  contentWidth: 'medium',
  fontFamily: 'merriweather',
  theme: 'dark',
};

const SETTINGS_STORAGE_KEY = 'voxread_tts_settings_v1';
const MAX_PREFETCH_AHEAD = 2; // Prefetch next 2 sentences (N+1, N+2)

interface CacheEntry {
  blobUrl: string;
  abortController?: AbortController;
}

export function useTTS(
  currentSentences: SentenceItem[],
  onSentenceChange?: (sentenceIndex: number) => void,
  onChapterComplete?: () => void
) {
  const [voices, setVoices] = useState<TTSVoiceOption[]>([]);
  const [settings, setSettings] = useState<TTSSettings>(() => {
    try {
      const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...DEFAULT_SETTINGS,
          ...parsed,
          ttsProvider: parsed.ttsProvider || 'browser',
          rvcServerUrl: parsed.rvcServerUrl || 'http://localhost:8008',
        };
      }
    } catch {
      // fallback
    }
    return DEFAULT_SETTINGS;
  });

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState<number>(0);
  const [currentWordCharIndex, setCurrentWordCharIndex] = useState<number | null>(null);
  const [rvcServerStatus, setRvcServerStatus] = useState<RVCServerStatus>('unknown');
  const [serverErrorMessage, setServerErrorMessage] = useState<string | null>(null);

  // Keep references to avoid stale closures in event listeners
  const sentencesRef = useRef<SentenceItem[]>(currentSentences);
  sentencesRef.current = currentSentences;

  const currentIdxRef = useRef<number>(currentSentenceIndex);
  currentIdxRef.current = currentSentenceIndex;

  const isPlayingRef = useRef<boolean>(isPlaying);
  isPlayingRef.current = isPlaying;

  const isPausedRef = useRef<boolean>(isPaused);
  isPausedRef.current = isPaused;

  const settingsRef = useRef<TTSSettings>(settings);
  settingsRef.current = settings;

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const keepAliveIntervalRef = useRef<number | null>(null);

  // Reusable HTMLAudioElement for RVC Local playback
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // Audio prefetch cache mapping sentenceIndex -> CacheEntry
  const prefetchCacheRef = useRef<Map<number, CacheEntry>>(new Map());
  // In-flight fetch promises to prevent duplicate fetches
  const inFlightFetchesRef = useRef<Map<number, Promise<string | null>>>(new Map());
  // Dedicated audio element for previewing test voice
  const testAudioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize single reusable Audio instances
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const audio = new Audio();
      audio.preload = 'auto';
      audioRef.current = audio;

      const testAudio = new Audio();
      testAudio.preload = 'auto';
      testAudioRef.current = testAudio;
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
      if (testAudioRef.current) {
        testAudioRef.current.pause();
        testAudioRef.current.src = '';
      }
    };
  }, []);

  // Clear prefetch cache & revoke object URLs
  const clearPrefetchCache = useCallback(() => {
    prefetchCacheRef.current.forEach(entry => {
      if (entry.abortController) {
        try {
          entry.abortController.abort();
        } catch {
          // ignore
        }
      }
      if (entry.blobUrl) {
        URL.revokeObjectURL(entry.blobUrl);
      }
    });
    prefetchCacheRef.current.clear();
    inFlightFetchesRef.current.clear();
  }, []);

  // Evict old cache entries that precede current sentence
  const evictOldCache = useCallback((currentIndex: number) => {
    prefetchCacheRef.current.forEach((entry, idx) => {
      if (idx < currentIndex) {
        if (entry.blobUrl) {
          URL.revokeObjectURL(entry.blobUrl);
        }
        prefetchCacheRef.current.delete(idx);
      }
    });
  }, []);

  // Server health probe
  const checkRVCServerHealth = useCallback(async (customUrl?: string): Promise<boolean> => {
    const targetUrl = (
      customUrl ||
      settingsRef.current.rvcServerUrl ||
      'http://localhost:8008'
    ).replace(/\/+$/, '');
    setRvcServerStatus('checking');
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);
      const res = await fetch(`${targetUrl}/health`, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        if (data.ok) {
          setRvcServerStatus('connected');
          setServerErrorMessage(null);
          return true;
        }
      }
      setRvcServerStatus('unreachable');
      return false;
    } catch (err: unknown) {
      setRvcServerStatus('unreachable');
      setServerErrorMessage(err instanceof Error ? err.message : 'Không thể kết nối');
      return false;
    }
  }, []);

  // Check health on mount or when provider/url changes
  useEffect(() => {
    if (settings.ttsProvider === 'rvc-local') {
      checkRVCServerHealth(settings.rvcServerUrl);
    }
  }, [settings.ttsProvider, settings.rvcServerUrl, checkRVCServerHealth]);

  // Load and classify available browser voices
  const loadVoices = useCallback(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    const rawVoices = window.speechSynthesis.getVoices();
    if (rawVoices.length === 0) return;

    const formatted: TTSVoiceOption[] = rawVoices.map(v => {
      let genderGuess: 'Male' | 'Female' | 'Neutral' = 'Neutral';
      const lower = v.name.toLowerCase();
      if (
        lower.includes('female') ||
        lower.includes('zira') ||
        lower.includes('jenny') ||
        lower.includes('samantha') ||
        lower.includes('victoria') ||
        lower.includes('karen') ||
        lower.includes('hoaimy') ||
        lower.includes('linh') ||
        lower.includes('mai') ||
        lower.includes('kyoko') ||
        lower.includes('amira')
      ) {
        genderGuess = 'Female';
      } else if (
        lower.includes('male') ||
        lower.includes('david') ||
        lower.includes('guy') ||
        lower.includes('alex') ||
        lower.includes('daniel') ||
        lower.includes('george') ||
        lower.includes('namminh') ||
        lower.includes('otoya') ||
        lower.includes('thomas')
      ) {
        genderGuess = 'Male';
      }

      return {
        voiceURI: v.voiceURI,
        name: v.name,
        lang: v.lang,
        default: v.default,
        localService: v.localService,
        genderGuess,
        displayName: `${v.name} (${v.lang})`,
      };
    });

    formatted.sort((a, b) => {
      const aLang = a.lang.toLowerCase();
      const bLang = b.lang.toLowerCase();
      if (aLang.startsWith('vi') && !bLang.startsWith('vi')) return -1;
      if (!aLang.startsWith('vi') && bLang.startsWith('vi')) return 1;
      if (aLang.startsWith('en') && !bLang.startsWith('en')) return -1;
      if (!aLang.startsWith('en') && bLang.startsWith('en')) return 1;
      return a.lang.localeCompare(b.lang) || a.name.localeCompare(b.name);
    });

    setVoices(formatted);

    setSettings(prev => {
      if (!prev.voiceURI && formatted.length > 0) {
        const defaultVoice =
          formatted.find(v => v.default) ||
          formatted.find(v => v.lang.startsWith('en')) ||
          formatted[0];
        return { ...prev, voiceURI: defaultVoice.voiceURI };
      }
      return prev;
    });
  }, []);

  useEffect(() => {
    loadVoices();
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, [loadVoices]);

  // KeepAlive timer for Chromium speech synthesis
  const stopKeepAlive = useCallback(() => {
    if (keepAliveIntervalRef.current !== null) {
      clearInterval(keepAliveIntervalRef.current);
      keepAliveIntervalRef.current = null;
    }
  }, []);

  const startKeepAlive = useCallback(() => {
    stopKeepAlive();
    keepAliveIntervalRef.current = window.setInterval(() => {
      if (window.speechSynthesis && isPlayingRef.current && !isPausedRef.current) {
        window.speechSynthesis.pause();
        window.speechSynthesis.resume();
      }
    }, 10000);
  }, [stopKeepAlive]);

  // Helper to fetch RVC speech audio blob from server
  const fetchRVCSpeech = useCallback(
    async (
      text: string,
      serverUrl: string,
      abortController?: AbortController
    ): Promise<string | null> => {
      const cleanUrl = serverUrl.replace(/\/+$/, '');
      try {
        const res = await fetch(`${cleanUrl}/speak`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, language: 'vi' }),
          signal: abortController?.signal,
        });

        if (!res.ok) {
          throw new Error(`Server returned status ${res.status}`);
        }

        const blob = await res.blob();
        if (blob.size === 0) {
          throw new Error('Received empty audio blob');
        }
        return URL.createObjectURL(blob);
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') {
          return null;
        }
        console.warn('RVC speech synthesis fetch failed:', err);
        return null;
      }
    },
    []
  );

  // Background prefetch for upcoming sentences (N+1, N+2)
  const prefetchUpcoming = useCallback(
    (fromIndex: number) => {
      if (settingsRef.current.ttsProvider !== 'rvc-local') return;

      const sentenceList = sentencesRef.current;
      const serverUrl = settingsRef.current.rvcServerUrl;

      for (let offset = 1; offset <= MAX_PREFETCH_AHEAD; offset++) {
        const targetIdx = fromIndex + offset;
        if (targetIdx >= sentenceList.length) break;

        // Skip if already in cache or in-flight
        if (prefetchCacheRef.current.has(targetIdx) || inFlightFetchesRef.current.has(targetIdx)) {
          continue;
        }

        const text = sentenceList[targetIdx].text.trim();
        if (!text) continue;

        const controller = new AbortController();
        const fetchPromise = fetchRVCSpeech(text, serverUrl, controller).then(blobUrl => {
          inFlightFetchesRef.current.delete(targetIdx);
          if (blobUrl) {
            prefetchCacheRef.current.set(targetIdx, { blobUrl, abortController: controller });
          }
          return blobUrl;
        });

        inFlightFetchesRef.current.set(targetIdx, fetchPromise);
      }
    },
    [fetchRVCSpeech]
  );

  // Speak a specific sentence
  const speakSentence = useCallback(
    async (index: number) => {
      const sentenceList = sentencesRef.current;
      if (!sentenceList || index < 0 || index >= sentenceList.length) {
        // Chapter complete!
        setIsPlaying(false);
        setIsPaused(false);
        stopKeepAlive();
        clearPrefetchCache();
        if (onChapterComplete) {
          onChapterComplete();
        }
        return;
      }

      const currentSentence = sentenceList[index];
      const textToSpeak = currentSentence.text.trim();

      if (!textToSpeak) {
        // Skip empty sentence
        if (index + 1 < sentenceList.length) {
          speakSentence(index + 1);
        }
        return;
      }

      const provider = settingsRef.current.ttsProvider;

      // -------------------------------------------------------------
      // PROVIDER: BROWSER (Web Speech API)
      // -------------------------------------------------------------
      if (provider === 'browser') {
        if (typeof window === 'undefined' || !window.speechSynthesis) return;

        // Stop any playing RVC audio
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.src = '';
        }

        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(textToSpeak);
        utteranceRef.current = utterance;

        utterance.rate = Math.max(0.5, Math.min(3.0, settingsRef.current.rate));
        utterance.pitch = Math.max(0.5, Math.min(2.0, settingsRef.current.pitch));
        utterance.volume = Math.max(0, Math.min(1.0, settingsRef.current.volume));

        if (settingsRef.current.voiceURI) {
          const rawVoices = window.speechSynthesis.getVoices();
          const selectedVoice = rawVoices.find(v => v.voiceURI === settingsRef.current.voiceURI);
          if (selectedVoice) {
            utterance.voice = selectedVoice;
            utterance.lang = selectedVoice.lang;
          }
        }

        utterance.onboundary = event => {
          if (event.name === 'word') {
            setCurrentWordCharIndex(event.charIndex);
          }
        };

        utterance.onstart = () => {
          setIsPlaying(true);
          setIsPaused(false);
          setCurrentSentenceIndex(index);
          if (onSentenceChange) {
            onSentenceChange(index);
          }
        };

        utterance.onend = () => {
          setCurrentWordCharIndex(null);
          if (isPlayingRef.current && !isPausedRef.current) {
            const nextIdx = index + 1;
            if (nextIdx < sentencesRef.current.length) {
              setCurrentSentenceIndex(nextIdx);
              speakSentence(nextIdx);
            } else {
              setIsPlaying(false);
              setIsPaused(false);
              stopKeepAlive();
              if (onChapterComplete) {
                onChapterComplete();
              }
            }
          }
        };

        utterance.onerror = e => {
          if (e.error !== 'canceled' && e.error !== 'interrupted') {
            console.warn('Speech synthesis error:', e);
          }
        };

        startKeepAlive();
        window.speechSynthesis.speak(utterance);
        return;
      }

      // -------------------------------------------------------------
      // PROVIDER: RVC LOCAL SERVER (HTMLAudioElement + Fetch)
      // -------------------------------------------------------------
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      stopKeepAlive();
      setCurrentWordCharIndex(null);

      const audio = audioRef.current;
      if (!audio) return;

      // Update state immediately to reflect active sentence
      setIsPlaying(true);
      setIsPaused(false);
      setCurrentSentenceIndex(index);
      if (onSentenceChange) {
        onSentenceChange(index);
      }

      let audioBlobUrl: string | null = null;

      // Check if sentence audio is already cached
      if (prefetchCacheRef.current.has(index)) {
        audioBlobUrl = prefetchCacheRef.current.get(index)!.blobUrl;
      } else if (inFlightFetchesRef.current.has(index)) {
        // Await in-flight prefetch
        audioBlobUrl = await inFlightFetchesRef.current.get(index)!;
      }

      // If not cached, fetch on demand
      if (!audioBlobUrl) {
        const controller = new AbortController();
        audioBlobUrl = await fetchRVCSpeech(
          textToSpeak,
          settingsRef.current.rvcServerUrl,
          controller
        );
      }

      // If fetch failed or was aborted while navigating
      if (!audioBlobUrl) {
        if (isPlayingRef.current && currentIdxRef.current === index) {
          setIsPlaying(false);
          setIsPaused(false);
          setRvcServerStatus('unreachable');
          setServerErrorMessage('Không thể tạo âm thanh từ server RVC.');
        }
        return;
      }

      // Stale check: verify user hasn't jumped to another sentence while fetching
      if (!isPlayingRef.current || currentIdxRef.current !== index) {
        return;
      }

      // Configure audio element
      audio.src = audioBlobUrl;
      audio.playbackRate = Math.max(0.5, Math.min(3.0, settingsRef.current.rate));
      audio.volume = Math.max(0, Math.min(1.0, settingsRef.current.volume));

      // Bind events
      audio.onended = () => {
        evictOldCache(index + 1);
        if (isPlayingRef.current && !isPausedRef.current) {
          const nextIdx = index + 1;
          if (nextIdx < sentencesRef.current.length) {
            setCurrentSentenceIndex(nextIdx);
            speakSentence(nextIdx);
          } else {
            setIsPlaying(false);
            setIsPaused(false);
            clearPrefetchCache();
            if (onChapterComplete) {
              onChapterComplete();
            }
          }
        }
      };

      audio.onerror = e => {
        console.warn('Audio element error:', e);
        setIsPlaying(false);
        setIsPaused(false);
        setServerErrorMessage('Lỗi phát âm thanh WAV.');
      };

      try {
        await audio.play();
        // Prefetch next sentences concurrently while audio is playing
        prefetchUpcoming(index);
      } catch (err: unknown) {
        console.warn('audio.play() error:', err);
      }
    },
    [
      fetchRVCSpeech,
      prefetchUpcoming,
      evictOldCache,
      clearPrefetchCache,
      onSentenceChange,
      onChapterComplete,
      startKeepAlive,
      stopKeepAlive,
    ]
  );

  // Play
  const play = useCallback(
    (index?: number) => {
      const targetIndex = typeof index === 'number' ? index : currentSentenceIndex;
      setIsPlaying(true);
      setIsPaused(false);

      if (settingsRef.current.ttsProvider === 'rvc-local') {
        // If already paused on current sentence audio, resume directly
        if (
          audioRef.current &&
          audioRef.current.src &&
          targetIndex === currentIdxRef.current &&
          audioRef.current.paused &&
          !audioRef.current.ended
        ) {
          audioRef.current
            .play()
            .then(() => {
              prefetchUpcoming(targetIndex);
            })
            .catch(() => {
              speakSentence(targetIndex);
            });
          return;
        }
      }

      speakSentence(targetIndex);
    },
    [currentSentenceIndex, speakSentence, prefetchUpcoming]
  );

  // Pause
  const pause = useCallback(() => {
    setIsPaused(true);
    if (settingsRef.current.ttsProvider === 'rvc-local') {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    } else {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.pause();
      }
      stopKeepAlive();
    }
  }, [stopKeepAlive]);

  // Resume
  const resume = useCallback(() => {
    if (settingsRef.current.ttsProvider === 'rvc-local') {
      if (audioRef.current && audioRef.current.src) {
        audioRef.current
          .play()
          .then(() => {
            setIsPaused(false);
            setIsPlaying(true);
            prefetchUpcoming(currentIdxRef.current);
          })
          .catch(() => {
            speakSentence(currentIdxRef.current);
          });
      } else {
        play(currentSentenceIndex);
      }
    } else {
      if (typeof window === 'undefined' || !window.speechSynthesis) return;
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
        setIsPaused(false);
        setIsPlaying(true);
        startKeepAlive();
      } else {
        play(currentSentenceIndex);
      }
    }
  }, [currentSentenceIndex, play, speakSentence, prefetchUpcoming, startKeepAlive]);

  // Toggle Play / Pause
  const togglePlay = useCallback(() => {
    if (isPlaying && !isPaused) {
      pause();
    } else if (isPaused) {
      resume();
    } else {
      play(currentSentenceIndex);
    }
  }, [isPlaying, isPaused, pause, resume, play, currentSentenceIndex]);

  // Stop completely
  const stop = useCallback(() => {
    setIsPlaying(false);
    setIsPaused(false);
    setCurrentWordCharIndex(null);

    if (settingsRef.current.ttsProvider === 'rvc-local') {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current.src = '';
      }
      clearPrefetchCache();
    } else {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      stopKeepAlive();
    }
  }, [clearPrefetchCache, stopKeepAlive]);

  // Next Sentence
  const nextSentence = useCallback(() => {
    const nextIdx = Math.min(sentencesRef.current.length - 1, currentSentenceIndex + 1);
    setCurrentSentenceIndex(nextIdx);
    if (isPlaying && !isPaused) {
      speakSentence(nextIdx);
    } else {
      if (onSentenceChange) onSentenceChange(nextIdx);
    }
  }, [currentSentenceIndex, isPlaying, isPaused, speakSentence, onSentenceChange]);

  // Previous Sentence
  const prevSentence = useCallback(() => {
    const prevIdx = Math.max(0, currentSentenceIndex - 1);
    setCurrentSentenceIndex(prevIdx);
    if (isPlaying && !isPaused) {
      speakSentence(prevIdx);
    } else {
      if (onSentenceChange) onSentenceChange(prevIdx);
    }
  }, [currentSentenceIndex, isPlaying, isPaused, speakSentence, onSentenceChange]);

  // Jump to specific sentence index
  const jumpToSentence = useCallback(
    (index: number, shouldPlay: boolean = true) => {
      const bounded = Math.max(0, Math.min(sentencesRef.current.length - 1, index));
      setCurrentSentenceIndex(bounded);
      clearPrefetchCache();

      if (shouldPlay) {
        setIsPlaying(true);
        setIsPaused(false);
        speakSentence(bounded);
      } else {
        if (isPlaying && !isPaused) {
          speakSentence(bounded);
        }
        if (onSentenceChange) onSentenceChange(bounded);
      }
    },
    [isPlaying, isPaused, speakSentence, onSentenceChange, clearPrefetchCache]
  );

  // Jump to specific paragraph index
  const jumpToParagraph = useCallback(
    (paragraphIndex: number, shouldPlay: boolean = true) => {
      const sentence = sentencesRef.current.find(s => s.paragraphIndex === paragraphIndex);
      if (sentence) {
        jumpToSentence(sentence.globalIndex, shouldPlay);
      }
    },
    [jumpToSentence]
  );

  // Test / preview sample audio with current settings
  const testVoice = useCallback(
    async (voiceURI: string, rate: number, pitch: number, volume: number, testText?: string) => {
      // Branch: RVC Local
      if (settingsRef.current.ttsProvider === 'rvc-local') {
        const sampleText =
          testText ||
          'Xin chào! Tôi là giọng đọc của bạn được nhân bản bằng mô hình RVC trong VoxRead.';
        const targetUrl = settingsRef.current.rvcServerUrl;

        try {
          const res = await fetch(`${targetUrl.replace(/\/+$/, '')}/speak`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: sampleText, language: 'vi' }),
          });

          if (!res.ok) {
            throw new Error(`Server status ${res.status}`);
          }

          const blob = await res.blob();
          const blobUrl = URL.createObjectURL(blob);

          if (testAudioRef.current) {
            testAudioRef.current.pause();
            testAudioRef.current.src = blobUrl;
            testAudioRef.current.playbackRate = Math.max(0.5, Math.min(3.0, rate));
            testAudioRef.current.volume = Math.max(0, Math.min(1.0, volume));
            testAudioRef.current.play().catch(err => {
              console.warn('testAudio.play() error:', err);
            });
            testAudioRef.current.onended = () => {
              URL.revokeObjectURL(blobUrl);
            };
          }
        } catch (err) {
          console.warn('RVC testVoice failed:', err);
          setRvcServerStatus('unreachable');
        }
        return;
      }

      // Branch: Browser
      if (typeof window === 'undefined' || !window.speechSynthesis) return;
      window.speechSynthesis.cancel();

      const rawVoices = window.speechSynthesis.getVoices();
      const voice = rawVoices.find(v => v.voiceURI === voiceURI);

      const defaultText = voice?.lang.startsWith('vi')
        ? 'Xin chào! Tôi là giọng đọc tiếng Việt của bạn trong ứng dụng VoxRead.'
        : voice?.lang.startsWith('ja')
          ? 'こんにちは！VoxReadの音声リーダーへようこそ。'
          : voice?.lang.startsWith('fr')
            ? 'Bonjour! Bienvenue dans votre lecteur de texte VoxRead.'
            : 'Hello! This is a test of the speech voice in VoxRead.';

      const utterance = new SpeechSynthesisUtterance(testText || defaultText);
      utterance.rate = rate;
      utterance.pitch = pitch;
      utterance.volume = volume;
      if (voice) {
        utterance.voice = voice;
        utterance.lang = voice.lang;
      }

      window.speechSynthesis.speak(utterance);
    },
    []
  );

  // Update & persist settings
  const updateSettings = useCallback((newSettings: Partial<TTSSettings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...newSettings };
      try {
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // storage quota or private mode
      }
      return updated;
    });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      stopKeepAlive();
      clearPrefetchCache();
    };
  }, [clearPrefetchCache, stopKeepAlive]);

  return {
    voices,
    settings,
    updateSettings,
    isPlaying,
    isPaused,
    currentSentenceIndex,
    currentWordCharIndex,
    rvcServerStatus,
    serverErrorMessage,
    checkRVCServerHealth,
    play,
    pause,
    resume,
    togglePlay,
    stop,
    nextSentence,
    prevSentence,
    jumpToSentence,
    jumpToParagraph,
    testVoice,
  };
}
