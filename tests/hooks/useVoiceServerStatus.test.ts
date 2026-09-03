import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useVoiceServerStatus } from '../../src/hooks/useVoiceServerStatus';

describe('useVoiceServerStatus hook', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllTimers();
  });

  it('transitions from checking to connected when /health returns ok: true', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, model_loaded: true }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const { result } = renderHook(() =>
      useVoiceServerStatus({
        serverUrl: 'http://localhost:8008',
        enabled: true,
        intervalMs: 5000,
      })
    );

    // Initial state before promise resolution
    expect(result.current.status).toBe('checking');
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:8008/health',
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );

    // Resolve fetch promise
    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.status).toBe('connected');
    expect(result.current.errorMessage).toBeNull();
  });

  it('transitions to unreachable when /health throws a network error', async () => {
    const mockFetch = vi
      .fn()
      .mockRejectedValue(new Error('Failed to fetch: Connection refused'));
    vi.stubGlobal('fetch', mockFetch);

    const { result } = renderHook(() =>
      useVoiceServerStatus({
        serverUrl: 'http://localhost:8008',
        enabled: true,
        intervalMs: 5000,
      })
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.status).toBe('unreachable');
    expect(result.current.errorMessage).toBe('Failed to fetch: Connection refused');
  });

  it('transitions to unreachable when server returns 500 or ok: false', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ ok: false }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const { result } = renderHook(() =>
      useVoiceServerStatus({
        serverUrl: 'http://localhost:8008',
        enabled: true,
        intervalMs: 5000,
      })
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.status).toBe('unreachable');
    expect(result.current.errorMessage).toContain('không sẵn sàng');
  });

  it('does NOT invoke fetch when enabled is false (default voice selected)', async () => {
    const mockFetch = vi.fn();
    vi.stubGlobal('fetch', mockFetch);

    const { result } = renderHook(() =>
      useVoiceServerStatus({
        serverUrl: 'http://localhost:8008',
        enabled: false,
        intervalMs: 5000,
      })
    );

    // Advance timers by 30 seconds
    act(() => {
      vi.advanceTimersByTime(30000);
    });

    expect(mockFetch).toHaveBeenCalledTimes(0);
    expect(result.current.isChecking).toBe(false);
  });

  it('polls periodically when enabled is true', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, model_loaded: true }),
    });
    vi.stubGlobal('fetch', mockFetch);

    renderHook(() =>
      useVoiceServerStatus({
        serverUrl: 'http://localhost:8008',
        enabled: true,
        intervalMs: 5000,
      })
    );

    expect(mockFetch).toHaveBeenCalledTimes(1);

    // Advance 5 seconds -> trigger 2nd poll
    await act(async () => {
      vi.advanceTimersByTime(5000);
      await Promise.resolve();
    });
    expect(mockFetch).toHaveBeenCalledTimes(2);

    // Advance another 5 seconds -> trigger 3rd poll
    await act(async () => {
      vi.advanceTimersByTime(5000);
      await Promise.resolve();
    });
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it('cleans up interval timer and aborts pending fetch upon unmount', async () => {
    const mockFetch = vi.fn().mockImplementation(
      (_url, options) =>
        new Promise((_, reject) => {
          if (options?.signal) {
            options.signal.addEventListener('abort', () => {
              const abortErr = new Error('The user aborted a request.');
              abortErr.name = 'AbortError';
              reject(abortErr);
            });
          }
        })
    );
    vi.stubGlobal('fetch', mockFetch);

    const { unmount } = renderHook(() =>
      useVoiceServerStatus({
        serverUrl: 'http://localhost:8008',
        enabled: true,
        intervalMs: 5000,
      })
    );

    expect(mockFetch).toHaveBeenCalledTimes(1);

    // Unmount hook
    unmount();

    // Advance time - no further calls should occur
    act(() => {
      vi.advanceTimersByTime(15000);
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});
