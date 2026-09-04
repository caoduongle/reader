import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useScreenReaderClipboard } from '../../src/hooks/useScreenReaderClipboard';
import { DocumentItem } from '../../src/types';

describe('useScreenReaderClipboard hook', () => {
  beforeEach(() => {
    // Reset window.voxreadDesktop
    delete (window as unknown as { voxreadDesktop?: unknown }).voxreadDesktop;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('safely no-ops in standard web environment when window.voxreadDesktop is undefined', () => {
    const onCapture = vi.fn();
    expect(() => {
      renderHook(() => useScreenReaderClipboard(onCapture));
    }).not.toThrow();

    expect(onCapture).not.toHaveBeenCalled();
  });

  it('subscribes to clipboard captured events in Electron environment', () => {
    let capturedHandler: ((text: string) => void) | null = null;
    const mockUnsubscribe = vi.fn();
    const mockOnClipboardCaptured = vi.fn().mockImplementation(cb => {
      capturedHandler = cb;
      return mockUnsubscribe;
    });

    window.voxreadDesktop = {
      isDesktop: true,
      platform: 'win32',
      screenReader: {
        onClipboardCaptured: mockOnClipboardCaptured,
        removeClipboardListener: vi.fn(),
      },
    };

    const onCapture = vi.fn();
    renderHook(() => useScreenReaderClipboard(onCapture));

    expect(mockOnClipboardCaptured).toHaveBeenCalledTimes(1);
    expect(capturedHandler).toBeTypeOf('function');
  });

  it('parses received clipboard text into DocumentItem with format screen-capture and fires callback', () => {
    let capturedHandler: ((text: string) => void) | null = null;
    const mockUnsubscribe = vi.fn();

    window.voxreadDesktop = {
      isDesktop: true,
      platform: 'win32',
      screenReader: {
        onClipboardCaptured: vi.fn().mockImplementation(cb => {
          capturedHandler = cb;
          return mockUnsubscribe;
        }),
        removeClipboardListener: vi.fn(),
      },
    };

    const onCapture = vi.fn();
    renderHook(() => useScreenReaderClipboard(onCapture));

    const sampleText =
      'Đây là câu thứ nhất. Đây là câu thứ hai từ màn hình desktop!\nCâu tiếp theo của đoạn mới.';

    act(() => {
      capturedHandler!(sampleText);
    });

    expect(onCapture).toHaveBeenCalledTimes(1);
    const doc: DocumentItem = onCapture.mock.calls[0][0];

    expect(doc.title).toBe('Nội dung từ màn hình');
    expect(doc.format).toBe('screen-capture');
    expect(doc.chapters.length).toBeGreaterThan(0);
    expect(doc.totalSentences).toBeGreaterThanOrEqual(2);
    expect(doc.totalWords).toBeGreaterThan(0);
    expect(doc.lastRead).toEqual({
      chapterIndex: 0,
      sentenceIndex: 0,
      progressPercentage: 0,
      updatedAt: expect.any(Number),
    });
  });

  it('ignores empty or whitespace-only text silently', () => {
    let capturedHandler: ((text: string) => void) | null = null;

    window.voxreadDesktop = {
      isDesktop: true,
      platform: 'win32',
      screenReader: {
        onClipboardCaptured: vi.fn().mockImplementation(cb => {
          capturedHandler = cb;
          return vi.fn();
        }),
        removeClipboardListener: vi.fn(),
      },
    };

    const onCapture = vi.fn();
    renderHook(() => useScreenReaderClipboard(onCapture));

    act(() => {
      capturedHandler!('');
    });
    act(() => {
      capturedHandler!('   \n\t  ');
    });

    expect(onCapture).not.toHaveBeenCalled();
  });

  it('unsubscribes listener upon component unmount to prevent leaks', () => {
    const mockUnsubscribe = vi.fn();

    window.voxreadDesktop = {
      isDesktop: true,
      platform: 'win32',
      screenReader: {
        onClipboardCaptured: vi.fn().mockReturnValue(mockUnsubscribe),
        removeClipboardListener: vi.fn(),
      },
    };

    const { unmount } = renderHook(() => useScreenReaderClipboard(vi.fn()));

    expect(mockUnsubscribe).not.toHaveBeenCalled();
    unmount();
    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });

  it('works with options object syntax: { onNewScreenCapture }', () => {
    let capturedHandler: ((text: string) => void) | null = null;

    window.voxreadDesktop = {
      isDesktop: true,
      platform: 'win32',
      screenReader: {
        onClipboardCaptured: vi.fn().mockImplementation(cb => {
          capturedHandler = cb;
          return vi.fn();
        }),
        removeClipboardListener: vi.fn(),
      },
    };

    const onCapture = vi.fn();
    renderHook(() => useScreenReaderClipboard({ onNewScreenCapture: onCapture }));

    act(() => {
      capturedHandler!('Một đoạn văn bản thử nghiệm.');
    });

    expect(onCapture).toHaveBeenCalledTimes(1);
    expect(onCapture.mock.calls[0][0].format).toBe('screen-capture');
  });
});
