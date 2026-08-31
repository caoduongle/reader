import { useState, useEffect, useRef, useCallback } from 'react';
import { TTSVoiceOption, TTSSettings, SentenceItem } from '../types';

export const DEFAULT_SETTINGS: TTSSettings = {
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
        return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
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

  // Load and classify available voices
  const loadVoices = useCallback(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    const rawVoices = window.speechSynthesis.getVoices();
    if (rawVoices.length === 0) return;

    const formatted: TTSVoiceOption[] = rawVoices.map((v) => {
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

    // Sort voices: Vietnamese & English first, then by lang
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

    // If no voice is selected yet, select a default or appropriate voice
    setSettings((prev) => {
      if (!prev.voiceURI && formatted.length > 0) {
        const defaultVoice =
          formatted.find((v) => v.default) ||
          formatted.find((v) => v.lang.startsWith('en')) ||
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

  // KeepAlive timer to prevent Chromium speech synthesis from freezing
  const startKeepAlive = () => {
    stopKeepAlive();
    keepAliveIntervalRef.current = window.setInterval(() => {
      if (window.speechSynthesis && isPlayingRef.current && !isPausedRef.current) {
        window.speechSynthesis.pause();
        window.speechSynthesis.resume();
      }
    }, 10000);
  };

  const stopKeepAlive = () => {
    if (keepAliveIntervalRef.current !== null) {
      clearInterval(keepAliveIntervalRef.current);
      keepAliveIntervalRef.current = null;
    }
  };

  // Speak a specific sentence
  const speakSentence = useCallback(
    (index: number) => {
      if (typeof window === 'undefined' || !window.speechSynthesis) return;

      const sentenceList = sentencesRef.current;
      if (!sentenceList || index < 0 || index >= sentenceList.length) {
        // Chapter complete!
        setIsPlaying(false);
        setIsPaused(false);
        stopKeepAlive();
        if (onChapterComplete) {
          onChapterComplete();
        }
        return;
      }

      // Cancel any ongoing utterance
      window.speechSynthesis.cancel();

      const currentSentence = sentenceList[index];
      const textToSpeak = currentSentence.text.trim();

      if (!textToSpeak) {
        // Skip empty sentence
        if (index + 1 < sentenceList.length) {
          speakSentence(index + 1);
        }
        return;
      }

      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utteranceRef.current = utterance;

      // Apply settings
      utterance.rate = Math.max(0.5, Math.min(3.0, settingsRef.current.rate));
      utterance.pitch = Math.max(0.5, Math.min(2.0, settingsRef.current.pitch));
      utterance.volume = Math.max(0, Math.min(1.0, settingsRef.current.volume));

      // Match voice
      if (settingsRef.current.voiceURI) {
        const rawVoices = window.speechSynthesis.getVoices();
        const selectedVoice = rawVoices.find(
          (v) => v.voiceURI === settingsRef.current.voiceURI
        );
        if (selectedVoice) {
          utterance.voice = selectedVoice;
          utterance.lang = selectedVoice.lang;
        }
      }

      // Word boundary event for sub-sentence tracking if supported
      utterance.onboundary = (event) => {
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

      utterance.onerror = (e) => {
        // 'canceled' or 'interrupted' is normal when user skips or pauses
        if (e.error !== 'canceled' && e.error !== 'interrupted') {
          console.warn('Speech synthesis error:', e);
        }
      };

      startKeepAlive();
      window.speechSynthesis.speak(utterance);
    },
    [onSentenceChange, onChapterComplete]
  );

  // Play from current sentence or start
  const play = useCallback(
    (index?: number) => {
      const targetIndex = typeof index === 'number' ? index : currentSentenceIndex;
      setIsPlaying(true);
      setIsPaused(false);
      speakSentence(targetIndex);
    },
    [currentSentenceIndex, speakSentence]
  );

  // Pause
  const pause = useCallback(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.pause();
    setIsPaused(true);
    stopKeepAlive();
  }, []);

  // Resume
  const resume = useCallback(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
      setIsPlaying(true);
      startKeepAlive();
    } else {
      // Re-trigger current sentence
      play(currentSentenceIndex);
    }
  }, [currentSentenceIndex, play]);

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
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    setIsPlaying(false);
    setIsPaused(false);
    setCurrentWordCharIndex(null);
    stopKeepAlive();
  }, []);

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
    [isPlaying, isPaused, speakSentence, onSentenceChange]
  );

  // Jump to specific paragraph index
  const jumpToParagraph = useCallback(
    (paragraphIndex: number, shouldPlay: boolean = true) => {
      const sentence = sentencesRef.current.find((s) => s.paragraphIndex === paragraphIndex);
      if (sentence) {
        jumpToSentence(sentence.globalIndex, shouldPlay);
      }
    },
    [jumpToSentence]
  );

  // Test / preview sample audio with current settings
  const testVoice = useCallback(
    (voiceURI: string, rate: number, pitch: number, volume: number, testText?: string) => {
      if (typeof window === 'undefined' || !window.speechSynthesis) return;
      window.speechSynthesis.cancel();

      const rawVoices = window.speechSynthesis.getVoices();
      const voice = rawVoices.find((v) => v.voiceURI === voiceURI);

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
    setSettings((prev) => {
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
    };
  }, []);

  return {
    voices,
    settings,
    updateSettings,
    isPlaying,
    isPaused,
    currentSentenceIndex,
    currentWordCharIndex,
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
