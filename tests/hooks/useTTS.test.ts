import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTTS } from '../../src/hooks/useTTS';
import { SentenceItem } from '../../src/types';

describe('useTTS hook race condition guards & loaded audio index', () => {
  let audioInstances: MockAudio[] = [];

  class MockAudio {
    src = '';
    preload = 'auto';
    playbackRate = 1.0;
    volume = 1.0;
    paused = true;
    ended = false;
    onplaying: ((this: GlobalEventHandlers, ev: Event) => unknown) | null = null;
    onended: (() => void) | null = null;
    onerror: (() => void) | null = null;
    play = vi.fn().mockImplementation(async () => {
      this.paused = false;
      this.ended = false;
      return Promise.resolve();
    });
    pause = vi.fn().mockImplementation(() => {
      this.paused = true;
    });
    constructor() {
      audioInstances.push(this);
    }
  }

  const sampleSentences: SentenceItem[] = [
    { text: 'Câu thứ nhất.', paragraphIndex: 0, globalIndex: 0 },
    { text: 'Câu thứ hai.', paragraphIndex: 0, globalIndex: 1 },
    { text: 'Câu thứ ba.', paragraphIndex: 0, globalIndex: 2 },
  ];

  beforeEach(() => {
    audioInstances = [];
    vi.stubGlobal('Audio', MockAudio);

    if (!window.URL.createObjectURL) {
      window.URL.createObjectURL = vi.fn();
    }
    if (!window.URL.revokeObjectURL) {
      window.URL.revokeObjectURL = vi.fn();
    }
    vi.spyOn(URL, 'createObjectURL').mockImplementation((blob: Blob) => {
      const type = blob.type || 'audio/wav';
      return `blob:mock-audio-${Math.random()}-${type}`;
    });
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    localStorage.setItem(
      'voxread_tts_settings_v1',
      JSON.stringify({
        ttsProvider: 'rvc-local',
        rvcServerUrl: 'http://localhost:8008',
      })
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('Acceptance Criterion 1 (Race Guard): does not autoplay when user paused while fetch was in-flight', async () => {
    let resolveFetch: (value: Response) => void;
    const fetchPromise = new Promise<Response>(resolve => {
      resolveFetch = resolve;
    });

    const mockFetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/speak')) {
        return fetchPromise;
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ ok: true }),
      });
    });
    vi.stubGlobal('fetch', mockFetch);

    const { result } = renderHook(() => useTTS(sampleSentences));
    const mainAudio = audioInstances[0];
    expect(mainAudio).toBeDefined();

    // Trigger playback of sentence 0 (RVC fetch starts)
    act(() => {
      result.current.play(0);
    });

    expect(result.current.isPlaying).toBe(true);
    expect(result.current.isPaused).toBe(false);
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:8008/speak',
      expect.objectContaining({ method: 'POST' })
    );

    // User pauses while fetch is in-flight
    act(() => {
      result.current.pause();
    });

    expect(result.current.isPaused).toBe(true);
    expect(mainAudio.play).not.toHaveBeenCalled();

    // Complete the in-flight fetch now
    const dummyBlob = new Blob(['wav-data'], { type: 'audio/wav' });
    resolveFetch!({
      ok: true,
      status: 200,
      blob: async () => dummyBlob,
    } as unknown as Response);

    // Allow promise chain to resolve
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    // Audio MUST NOT automatically play after fetch finishes while paused
    expect(mainAudio.play).not.toHaveBeenCalled();
    expect(mainAudio.src).toBe('');
  });

  it('Acceptance Criterion 2 (Race Guard): does not play or assign stale audio when user jumped to another sentence while fetch was in-flight', async () => {
    let resolveSentence0: (value: Response) => void;
    const sentence0Promise = new Promise<Response>(resolve => {
      resolveSentence0 = resolve;
    });

    let resolveSentence1: (value: Response) => void;
    const sentence1Promise = new Promise<Response>(resolve => {
      resolveSentence1 = resolve;
    });

    const mockFetch = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (url.includes('/speak')) {
        const body = init?.body ? JSON.parse(init.body as string) : {};
        if (body.text?.includes('Câu thứ nhất')) {
          return sentence0Promise;
        }
        if (body.text?.includes('Câu thứ hai')) {
          return sentence1Promise;
        }
      }
      return Promise.resolve({
        ok: true,
        blob: async () => new Blob(['default-wav'], { type: 'audio/wav' }),
      });
    });
    vi.stubGlobal('fetch', mockFetch);

    const { result } = renderHook(() => useTTS(sampleSentences));
    const mainAudio = audioInstances[0];
    expect(mainAudio).toBeDefined();

    // Start playing sentence 0
    act(() => {
      result.current.play(0);
    });

    // While sentence 0 fetch is pending, user jumps to sentence 1
    act(() => {
      result.current.jumpToSentence(1);
    });

    expect(result.current.currentSentenceIndex).toBe(1);

    // Sentence 0 resolves now (it is stale)
    const sentence0Blob = new Blob(['sentence-0-audio'], { type: 'audio/wav' });
    resolveSentence0!({
      ok: true,
      status: 200,
      blob: async () => sentence0Blob,
    } as unknown as Response);

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    // Verify sentence 0 audio was discarded and did NOT trigger play()
    expect(mainAudio.play).not.toHaveBeenCalled();

    // Now resolve sentence 1 fetch
    const sentence1Blob = new Blob(['sentence-1-audio'], { type: 'audio/wav' });
    resolveSentence1!({
      ok: true,
      status: 200,
      blob: async () => sentence1Blob,
    } as unknown as Response);

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    // Sentence 1 should now be configured and played
    expect(mainAudio.play).toHaveBeenCalledTimes(1);
    expect(mainAudio.src).toContain('blob:mock-audio-');
  });

  it('Acceptance Criterion 3 (Loaded Audio Index): does not replay finished sentence N-1 when user calls play or resume while sentence N is fetching', async () => {
    let resolveSentence1: (value: Response) => void;
    const sentence1Promise = new Promise<Response>(resolve => {
      resolveSentence1 = resolve;
    });

    const mockFetch = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (url.includes('/speak')) {
        const body = init?.body ? JSON.parse(init.body as string) : {};
        if (body.text?.includes('Câu thứ nhất')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            blob: async () => new Blob(['audio-sentence-0'], { type: 'audio/wav' }),
          });
        }
        if (body.text?.includes('Câu thứ hai')) {
          return sentence1Promise;
        }
      }
      return Promise.resolve({
        ok: true,
        blob: async () => new Blob(['default-wav'], { type: 'audio/wav' }),
      });
    });
    vi.stubGlobal('fetch', mockFetch);

    const { result } = renderHook(() => useTTS(sampleSentences));
    const mainAudio = audioInstances[0];

    // 1. Play sentence 0 to completion
    await act(async () => {
      result.current.play(0);
    });

    expect(mainAudio.play).toHaveBeenCalledTimes(1);
    expect(mainAudio.src).toBeTruthy();

    // Mark sentence 0 audio as ended and paused
    mainAudio.ended = true;
    mainAudio.paused = true;
    mainAudio.play.mockClear();

    // 2. Now start playing sentence 1 (fetch is in-flight)
    act(() => {
      result.current.play(1);
    });

    // While sentence 1 is in-flight, audioRef.current.src still holds sentence 0's blob
    expect(mainAudio.play).not.toHaveBeenCalled();

    // 3. User clicks resume() or play(1) while sentence 1 is still awaiting fetch
    act(() => {
      result.current.resume();
    });

    // CRITICAL: Must NOT have called audio.play() on sentence 0!
    expect(mainAudio.play).not.toHaveBeenCalled();

    act(() => {
      result.current.play(1);
    });

    // Still must NOT have called audio.play() on sentence 0!
    expect(mainAudio.play).not.toHaveBeenCalled();

    // 4. Resolve sentence 1 fetch
    const sentence1Blob = new Blob(['audio-sentence-1'], { type: 'audio/wav' });
    resolveSentence1!({
      ok: true,
      status: 200,
      blob: async () => sentence1Blob,
    } as unknown as Response);

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    // Sentence 1 audio should now play exactly once
    expect(mainAudio.play).toHaveBeenCalledTimes(1);
  });

  it('resumes in-place without re-fetching when paused mid-sentence on active audio', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      blob: async () => new Blob(['audio-sentence-0'], { type: 'audio/wav' }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const { result } = renderHook(() => useTTS(sampleSentences));
    const mainAudio = audioInstances[0];

    // Start playing sentence 0
    await act(async () => {
      result.current.play(0);
    });

    expect(mainAudio.play).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalled();

    // User pauses mid-sentence (audio is paused, but not ended)
    act(() => {
      result.current.pause();
    });

    expect(result.current.isPaused).toBe(true);
    expect(mainAudio.paused).toBe(true);
    expect(mainAudio.ended).toBe(false);

    mockFetch.mockClear();
    mainAudio.play.mockClear();

    // User calls resume()
    await act(async () => {
      result.current.resume();
      await Promise.resolve();
    });

    // Must resume in-place: audio.play() called without triggering fetch
    expect(mainAudio.play).toHaveBeenCalledTimes(1);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('invalidates pending synthesis and clears loaded index when stop() is called', async () => {
    let resolveFetch: (value: Response) => void;
    const fetchPromise = new Promise<Response>(resolve => {
      resolveFetch = resolve;
    });

    const mockFetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/speak')) {
        return fetchPromise;
      }
      return Promise.resolve({ ok: true });
    });
    vi.stubGlobal('fetch', mockFetch);

    const { result } = renderHook(() => useTTS(sampleSentences));
    const mainAudio = audioInstances[0];

    act(() => {
      result.current.play(0);
    });

    expect(result.current.isPlaying).toBe(true);

    // User calls stop() while fetch is pending
    act(() => {
      result.current.stop();
    });

    expect(result.current.isPlaying).toBe(false);

    // Resolve the fetch
    resolveFetch!({
      ok: true,
      status: 200,
      blob: async () => new Blob(['wav'], { type: 'audio/wav' }),
    } as unknown as Response);

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    // Audio MUST NOT play after stop()
    expect(mainAudio.play).not.toHaveBeenCalled();
    expect(mainAudio.src).toBe('');
  });

  it('sets isBuffering to true during RVC fetch and reverts to false once audio.src is configured', async () => {
    let resolveFetch: (value: Response) => void;
    const fetchPromise = new Promise<Response>(resolve => {
      resolveFetch = resolve;
    });

    const mockFetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/speak')) {
        return fetchPromise;
      }
      return Promise.resolve({ ok: true });
    });
    vi.stubGlobal('fetch', mockFetch);

    const { result } = renderHook(() => useTTS(sampleSentences));
    const mainAudio = audioInstances[0];

    expect(result.current.isBuffering).toBe(false);

    act(() => {
      result.current.play(0);
    });

    // In-flight fetch: isBuffering must be true
    expect(result.current.isBuffering).toBe(true);

    // Resolve fetch
    resolveFetch!({
      ok: true,
      status: 200,
      blob: async () => new Blob(['wav'], { type: 'audio/wav' }),
    } as unknown as Response);

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    // Once audio.src is configured, isBuffering must revert to false
    expect(result.current.isBuffering).toBe(false);
    expect(mainAudio.src).toContain('blob:mock-audio');
  });

  it('resets isBuffering to false when RVC fetch fails', async () => {
    let resolveFetch: (value: Response) => void;
    const fetchPromise = new Promise<Response>(resolve => {
      resolveFetch = resolve;
    });

    const mockFetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/speak')) {
        return fetchPromise;
      }
      return Promise.resolve({ ok: true });
    });
    vi.stubGlobal('fetch', mockFetch);

    const { result } = renderHook(() => useTTS(sampleSentences));

    act(() => {
      result.current.play(0);
    });

    expect(result.current.isBuffering).toBe(true);

    // Simulate server failure
    resolveFetch!({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Internal Server Error' }),
    } as unknown as Response);

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 550));
    });

    expect(result.current.isBuffering).toBe(false);
    expect(result.current.isPlaying).toBe(false);
  });

  it('resets isBuffering to false when stop() or pause() is called while fetch is in-flight', async () => {
    let resolveFetch: (value: Response) => void;
    const fetchPromise = new Promise<Response>(resolve => {
      resolveFetch = resolve;
    });

    const mockFetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/speak')) {
        return fetchPromise;
      }
      return Promise.resolve({ ok: true });
    });
    vi.stubGlobal('fetch', mockFetch);

    const { result } = renderHook(() => useTTS(sampleSentences));

    // Test stop() reset
    act(() => {
      result.current.play(0);
    });
    expect(result.current.isBuffering).toBe(true);

    act(() => {
      result.current.stop();
    });
    expect(result.current.isBuffering).toBe(false);

    // Test pause() reset
    act(() => {
      result.current.play(1);
    });
    expect(result.current.isBuffering).toBe(true);

    act(() => {
      result.current.pause();
    });
    expect(result.current.isBuffering).toBe(false);
    expect(result.current.isPaused).toBe(true);

    // Cleanup pending promise
    resolveFetch!({
      ok: true,
      status: 200,
      blob: async () => new Blob(['wav'], { type: 'audio/wav' }),
    } as unknown as Response);

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
  });

  it('aborts in-flight background prefetch when stop() or jumpToSentence() is called', async () => {
    let resolveSentence1: (value: Response) => void;
    const sentence1Promise = new Promise<Response>(resolve => {
      resolveSentence1 = resolve;
    });

    const abortSpy = vi.spyOn(AbortController.prototype, 'abort');

    const mockFetch = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (url.includes('/speak')) {
        const body = JSON.parse((init?.body as string) || '{}');
        if (body.text === 'Câu thứ nhất.') {
          return Promise.resolve({
            ok: true,
            status: 200,
            blob: async () => new Blob(['wav0'], { type: 'audio/wav' }),
          });
        }
        if (body.text === 'Câu thứ hai.') {
          return sentence1Promise;
        }
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        blob: async () => new Blob(['wav'], { type: 'audio/wav' }),
      });
    });
    vi.stubGlobal('fetch', mockFetch);

    const { result } = renderHook(() => useTTS(sampleSentences));

    // Play sentence 0 -> when it starts, prefetchUpcoming(0) launches prefetch for sentence 1
    await act(async () => {
      result.current.play(0);
      await Promise.resolve();
      await Promise.resolve();
    });

    // Verify sentence 1 prefetch was dispatched
    const sentence1Call = mockFetch.mock.calls.find(call => {
      const body = JSON.parse((call[1]?.body as string) || '{}');
      return body.text === 'Câu thứ hai.';
    });
    expect(sentence1Call).toBeDefined();

    const signal = sentence1Call![1]?.signal as AbortSignal;
    expect(signal).toBeDefined();
    expect(signal.aborted).toBe(false);

    abortSpy.mockClear();

    // Call stop() -> must abort the in-flight prefetch request
    act(() => {
      result.current.stop();
    });

    expect(abortSpy).toHaveBeenCalled();
    expect(signal.aborted).toBe(true);

    // Clean up pending promise
    resolveSentence1!({
      ok: true,
      status: 200,
      blob: async () => new Blob(['wav1'], { type: 'audio/wav' }),
    } as unknown as Response);

    await act(async () => {
      await Promise.resolve();
    });
  });

  it('reuses in-flight prefetch promise when advancing to that sentence without redundant fetch', async () => {
    let resolveSentence1: (value: Response) => void;
    const sentence1Promise = new Promise<Response>(resolve => {
      resolveSentence1 = resolve;
    });

    const mockFetch = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (url.includes('/speak')) {
        const body = JSON.parse((init?.body as string) || '{}');
        if (body.text === 'Câu thứ nhất.') {
          return Promise.resolve({
            ok: true,
            status: 200,
            blob: async () => new Blob(['wav0'], { type: 'audio/wav' }),
          });
        }
        if (body.text === 'Câu thứ hai.') {
          return sentence1Promise;
        }
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        blob: async () => new Blob(['wav'], { type: 'audio/wav' }),
      });
    });
    vi.stubGlobal('fetch', mockFetch);

    const { result } = renderHook(() => useTTS(sampleSentences));
    const mainAudio = audioInstances[0];

    // Play sentence 0 -> sentence 1 prefetch starts in background
    await act(async () => {
      result.current.play(0);
      await Promise.resolve();
      await Promise.resolve();
    });

    const callsCountBefore = mockFetch.mock.calls.filter(call => {
      const body = JSON.parse((call[1]?.body as string) || '{}');
      return body.text === 'Câu thứ hai.';
    }).length;
    expect(callsCountBefore).toBe(1);

    // User advances to sentence 1 while prefetch is in-flight
    act(() => {
      result.current.play(1);
    });

    // Must NOT fire another network fetch for sentence 1
    const callsCountAfter = mockFetch.mock.calls.filter(call => {
      const body = JSON.parse((call[1]?.body as string) || '{}');
      return body.text === 'Câu thứ hai.';
    }).length;
    expect(callsCountAfter).toBe(1);

    // Resolve prefetch
    resolveSentence1!({
      ok: true,
      status: 200,
      blob: async () => new Blob(['wav1'], { type: 'audio/wav' }),
    } as unknown as Response);

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    // Audio source must now be set
    expect(mainAudio.src).toContain('blob:mock-audio');
    expect(result.current.currentSentenceIndex).toBe(1);
  });

  it('handles errors gracefully if a controller abort() throws in clearPrefetchCache()', async () => {
    const originalAbort = AbortController.prototype.abort;
    let shouldThrow = false;
    vi.spyOn(AbortController.prototype, 'abort').mockImplementation(function (this: AbortController) {
      if (shouldThrow) {
        throw new Error('Forced abort error');
      }
      return originalAbort.apply(this);
    });

    const mockFetch = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (url.includes('/speak')) {
        const body = JSON.parse((init?.body as string) || '{}');
        if (body.text === 'Câu thứ nhất.') {
          return Promise.resolve({
            ok: true,
            status: 200,
            blob: async () => new Blob(['wav0'], { type: 'audio/wav' }),
          });
        }
        return new Promise(() => {}); // never resolves
      }
      return Promise.resolve({ ok: true });
    });
    vi.stubGlobal('fetch', mockFetch);

    const { result } = renderHook(() => useTTS(sampleSentences));

    await act(async () => {
      result.current.play(0);
      await Promise.resolve();
      await Promise.resolve();
    });

    shouldThrow = true;

    // Should NOT throw unhandled exception
    expect(() => {
      act(() => {
        result.current.stop();
      });
    }).not.toThrow();

    expect(result.current.isPlaying).toBe(false);
  });

  describe('fetchRVCSpeech transient network retry (feature 046)', () => {
    it('retries once on transient HTTP 500 error after 400ms and succeeds on second attempt', async () => {
      let speakCallCount = 0;
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const mockFetch = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
        if (url.includes('/speak')) {
          const body = JSON.parse((init?.body as string) || '{}');
          if (body.text === 'Câu thứ nhất.') {
            speakCallCount++;
            if (speakCallCount === 1) {
              return Promise.resolve({
                ok: false,
                status: 500,
                json: async () => ({ error: 'edge_tts.exceptions.NoAudioReceived' }),
              } as unknown as Response);
            }
            return Promise.resolve({
              ok: true,
              status: 200,
              blob: async () => new Blob(['audio-data'], { type: 'audio/wav' }),
            } as unknown as Response);
          }
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          blob: async () => new Blob(['wav'], { type: 'audio/wav' }),
          json: async () => ({ ok: true, model_loaded: true }),
        });
      });
      vi.stubGlobal('fetch', mockFetch);

      const { result } = renderHook(() => useTTS(sampleSentences));
      const mainAudio = audioInstances[0];

      await act(async () => {
        result.current.play(0);
      });

      // Wait for the 400ms retry backoff delay to complete and promise to resolve
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 550));
      });

      const sentence0Calls = mockFetch.mock.calls.filter(call => {
        const body = JSON.parse((call[1]?.body as string) || '{}');
        return body.text === 'Câu thứ nhất.';
      });
      expect(sentence0Calls.length).toBe(2);

      // Successfully resolved audio blob URL
      expect(mainAudio.src).toContain('blob:mock-audio');
      expect(result.current.isPlaying).toBe(true);
      expect(result.current.serverErrorMessage).toBeNull();

      // Warning logged
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[VoxRead] Retry fetch RVC speech sau lỗi')
      );
    });

    it('does NOT retry on HTTP 400 client error (fail fast with 1 call)', async () => {
      vi.spyOn(console, 'warn').mockImplementation(() => {});

      const mockFetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes('/speak')) {
          return Promise.resolve({
            ok: false,
            status: 400,
            json: async () => ({ error: 'Invalid text parameter' }),
          } as unknown as Response);
        }
        return Promise.resolve({ ok: true });
      });
      vi.stubGlobal('fetch', mockFetch);

      const { result } = renderHook(() => useTTS(sampleSentences));

      await act(async () => {
        result.current.play(0);
      });

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 550));
      });

      const speakCalls = mockFetch.mock.calls.filter(call => call[0].includes('/speak'));
      expect(speakCalls.length).toBe(1);
      expect(result.current.isPlaying).toBe(false);
      expect(result.current.serverErrorMessage).toBe('Invalid text parameter');
    });

    it('does NOT retry on HTTP 503 model unavailable (fail fast with 1 call)', async () => {
      vi.spyOn(console, 'warn').mockImplementation(() => {});

      const mockFetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes('/speak')) {
          return Promise.resolve({
            ok: false,
            status: 503,
            json: async () => ({ error: 'RVC model not loaded' }),
          } as unknown as Response);
        }
        return Promise.resolve({ ok: true });
      });
      vi.stubGlobal('fetch', mockFetch);

      const { result } = renderHook(() => useTTS(sampleSentences));

      await act(async () => {
        result.current.play(0);
      });

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 550));
      });

      const speakCalls = mockFetch.mock.calls.filter(call => call[0].includes('/speak'));
      expect(speakCalls.length).toBe(1);
      expect(result.current.isPlaying).toBe(false);
      expect(result.current.serverErrorMessage).toBe('RVC model not loaded');
    });

    it('does NOT retry if user stops/aborts during 400ms delay', async () => {
      let sentence1Calls = 0;
      vi.spyOn(console, 'warn').mockImplementation(() => {});

      const mockFetch = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
        if (url.includes('/speak')) {
          const body = JSON.parse((init?.body as string) || '{}');
          if (body.text === 'Câu thứ nhất.') {
            return Promise.resolve({
              ok: true,
              status: 200,
              blob: async () => new Blob(['wav0'], { type: 'audio/wav' }),
            } as unknown as Response);
          }
          if (body.text === 'Câu thứ hai.') {
            sentence1Calls++;
            return Promise.resolve({
              ok: false,
              status: 500,
              json: async () => ({ error: 'edge_tts.exceptions.NoAudioReceived' }),
            } as unknown as Response);
          }
        }
        return Promise.resolve({ ok: true });
      });
      vi.stubGlobal('fetch', mockFetch);

      const { result } = renderHook(() => useTTS(sampleSentences));

      await act(async () => {
        result.current.play(0);
        await Promise.resolve();
        await Promise.resolve();
      });

      // Sentence 1 prefetch failed with 500 once and entered 400ms backoff
      expect(sentence1Calls).toBe(1);

      // Stop while backoff is waiting -> aborts in-flight prefetch controller
      act(() => {
        result.current.stop();
      });

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 550));
      });

      // Sentence 1 must NOT have fired a retry call
      expect(sentence1Calls).toBe(1);
    });

    it('bounds retries to maximum 1 retry on persistent HTTP 500 errors (total 2 calls)', async () => {
      vi.spyOn(console, 'warn').mockImplementation(() => {});

      const mockFetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes('/speak')) {
          return Promise.resolve({
            ok: false,
            status: 500,
            json: async () => ({ error: 'Persistent server failure' }),
          } as unknown as Response);
        }
        return Promise.resolve({ ok: true });
      });
      vi.stubGlobal('fetch', mockFetch);

      const { result } = renderHook(() => useTTS(sampleSentences));

      await act(async () => {
        result.current.play(0);
      });

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 600));
      });

      const speakCalls = mockFetch.mock.calls.filter(call => call[0].includes('/speak'));
      expect(speakCalls.length).toBe(2);
      expect(result.current.isPlaying).toBe(false);
      expect(result.current.serverErrorMessage).toBe('Persistent server failure');
    });
  });
});

