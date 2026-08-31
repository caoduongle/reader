import { useState, useEffect, useCallback } from 'react';
import { BookmarkItem } from '../types';

const BOOKMARKS_STORAGE_KEY = 'voxread_bookmarks_v1';

export function useBookmarks(documentId?: string) {
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>(() => {
    try {
      const saved = localStorage.getItem(BOOKMARKS_STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // fallback
    }
    return [];
  });

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(BOOKMARKS_STORAGE_KEY, JSON.stringify(bookmarks));
    } catch (e) {
      console.error('Failed to save bookmarks:', e);
    }
  }, [bookmarks]);

  // Bookmarks specific to the currently active document
  const currentDocBookmarks = bookmarks.filter(
    (b) => !documentId || b.documentId === documentId
  );

  const addBookmark = useCallback(
    (
      docId: string,
      chapterIndex: number,
      chapterTitle: string,
      sentenceIndex: number,
      snippet: string,
      note?: string
    ): BookmarkItem => {
      const newBookmark: BookmarkItem = {
        id: `bm_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        documentId: docId,
        chapterIndex,
        chapterTitle,
        sentenceIndex,
        snippet: snippet.trim(),
        note: note?.trim() || '',
        createdAt: Date.now(),
      };

      setBookmarks((prev) => {
        // Prevent exact duplicate bookmarks for same chapter & sentence
        const exists = prev.some(
          (b) =>
            b.documentId === docId &&
            b.chapterIndex === chapterIndex &&
            b.sentenceIndex === sentenceIndex
        );
        if (exists) {
          return prev.map((b) =>
            b.documentId === docId &&
            b.chapterIndex === chapterIndex &&
            b.sentenceIndex === sentenceIndex
              ? { ...b, snippet: snippet.trim(), note: note?.trim() || b.note, createdAt: Date.now() }
              : b
          );
        }
        return [newBookmark, ...prev];
      });

      return newBookmark;
    },
    []
  );

  const removeBookmark = useCallback((id: string) => {
    setBookmarks((prev) => prev.filter((b) => b.id !== id));
  }, []);

  const updateBookmarkNote = useCallback((id: string, note: string) => {
    setBookmarks((prev) =>
      prev.map((b) => (b.id === id ? { ...b, note } : b))
    );
  }, []);

  const clearAllBookmarksForDoc = useCallback((docId: string) => {
    setBookmarks((prev) => prev.filter((b) => b.documentId !== docId));
  }, []);

  const isBookmarked = useCallback(
    (docId: string, chapterIndex: number, sentenceIndex: number) => {
      return bookmarks.some(
        (b) =>
          b.documentId === docId &&
          b.chapterIndex === chapterIndex &&
          b.sentenceIndex === sentenceIndex
      );
    },
    [bookmarks]
  );

  return {
    bookmarks,
    currentDocBookmarks,
    addBookmark,
    removeBookmark,
    updateBookmarkNote,
    clearAllBookmarksForDoc,
    isBookmarked,
  };
}
