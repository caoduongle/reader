import { useEffect, useRef } from 'react';
import { DocumentItem } from '../types';
import { parseNovelText } from '../utils/textParser';

export type ScreenReaderCaptureCallback = (doc: DocumentItem) => void;

export interface UseScreenReaderClipboardOptions {
  onNewScreenCapture?: ScreenReaderCaptureCallback;
}

/**
 * Custom hook subscribing to Electron clipboard screen-reader events.
 * Safely no-ops in pure web environments via optional chaining.
 */
export function useScreenReaderClipboard(
  callbackOrOptions?: ScreenReaderCaptureCallback | UseScreenReaderClipboardOptions
) {
  const callback =
    typeof callbackOrOptions === 'function'
      ? callbackOrOptions
      : callbackOrOptions?.onNewScreenCapture;

  const onCaptureRef = useRef(callback);
  onCaptureRef.current = callback;

  useEffect(() => {
    // Safe no-op on web (outside Electron desktop)
    const subscribe = window.voxreadDesktop?.screenReader?.onClipboardCaptured;
    if (!subscribe) {
      return;
    }

    const unsubscribe = subscribe((text: string) => {
      const content = text ? text.trim() : '';
      if (!content) return;

      const title = 'Nội dung từ màn hình';
      const chapters = parseNovelText(content, title);
      const totalWords = chapters.reduce((acc, c) => acc + c.wordCount, 0);
      const totalSentences = chapters.reduce((acc, c) => acc + c.totalSentences, 0);

      if (totalSentences === 0) return;

      const newDoc: DocumentItem = {
        id: `doc-${Date.now()}`,
        title,
        format: 'screen-capture',
        chapters,
        createdAt: Date.now(),
        lastRead: {
          chapterIndex: 0,
          sentenceIndex: 0,
          progressPercentage: 0,
          updatedAt: Date.now(),
        },
        totalWords,
        totalSentences,
      };

      onCaptureRef.current?.(newDoc);
    });

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, []);
}
