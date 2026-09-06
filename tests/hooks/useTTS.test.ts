import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTTS } from '../../src/hooks/useTTS';
import { SentenceItem } from '../../src/types';

describe('useTTS hook race condition guards', () => {
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

  it('Acceptance Criterion 1: does not autoplay when user paused while fetch was in-flight', async () => {
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

  it('Acceptance Criterion 2: does not play or assign stale audio when user jumped to another sentence while fetch was in-flight', async () => {
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

  it('invalidates pending synthesis when stop() is called during in-flight fetch', async () => {
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
});
