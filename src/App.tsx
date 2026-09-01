import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { DocumentItem, SentenceItem, TTSSettings, MascotType, BookmarkItem } from './types';
import { SAMPLE_DOCUMENTS } from './utils/sampleNovels';
import { useTTS } from './hooks/useTTS';
import { useBookmarks } from './hooks/useBookmarks';
import { ReaderNavbar } from './components/ReaderNavbar';
import { ReaderContent } from './components/ReaderContent';
import { ControlBar } from './components/ControlBar';
import { MascotWidget } from './components/MascotWidget';
import { SettingsModal } from './components/SettingsModal';
import { UploadModal } from './components/UploadModal';
import { TOCDrawer } from './components/TOCDrawer';
import { SearchDrawer } from './components/SearchDrawer';
import { BookmarksDrawer } from './components/BookmarksDrawer';
import { ReadingStatsModal } from './components/ReadingStatsModal';
import { useReadingStats } from './hooks/useReadingStats';
import { THEMES } from './utils/themeStyles';

const RECENT_DOC_STORAGE_KEY = 'voxread_active_document_v1';

export default function App() {
  // Load saved document or default to Sherlock Holmes
  const [currentDocument, setCurrentDocument] = useState<DocumentItem>(() => {
    try {
      const saved = localStorage.getItem(RECENT_DOC_STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // fallback
    }
    return SAMPLE_DOCUMENTS[0];
  });

  const [currentChapterIndex, setCurrentChapterIndex] = useState<number>(() => {
    return currentDocument?.lastRead?.chapterIndex || 0;
  });

  // Modals state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isTOCOpen, setIsTOCOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isBookmarksOpen, setIsBookmarksOpen] = useState(false);
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 2400);
  }, []);

  // Bookmarks management
  const {
    bookmarks,
    currentDocBookmarks,
    addBookmark,
    removeBookmark,
    updateBookmarkNote,
    clearAllBookmarksForDoc,
    isBookmarked,
  } = useBookmarks(currentDocument?.id);

  // Active Chapter
  const currentChapter = useMemo(() => {
    if (!currentDocument || !currentDocument.chapters.length) return null;
    const safeIdx = Math.max(0, Math.min(currentDocument.chapters.length - 1, currentChapterIndex));
    return currentDocument.chapters[safeIdx];
  }, [currentDocument, currentChapterIndex]);

  // Flattened active sentences for current chapter
  const currentSentences = useMemo<SentenceItem[]>(() => {
    if (!currentChapter) return [];
    const list: SentenceItem[] = [];
    currentChapter.paragraphs.forEach((p) => {
      p.sentences.forEach((s) => {
        list.push(s);
      });
    });
    return list;
  }, [currentChapter]);

  // Set of bookmarked sentence indices for the active chapter
  const bookmarkedSentenceIndices = useMemo<Set<number>>(() => {
    if (!currentDocument) return new Set();
    const set = new Set<number>();
    bookmarks.forEach((b) => {
      if (b.documentId === currentDocument.id && b.chapterIndex === currentChapterIndex) {
        set.add(b.sentenceIndex);
      }
    });
    return set;
  }, [bookmarks, currentDocument, currentChapterIndex]);

  // On chapter completion callback
  const handleChapterComplete = useCallback(() => {
    if (currentDocument && currentChapterIndex < currentDocument.chapters.length - 1) {
      setCurrentChapterIndex((prev) => prev + 1);
    }
  }, [currentDocument, currentChapterIndex]);

  // TTS Hook
  const {
    voices,
    settings,
    updateSettings,
    isPlaying,
    isPaused,
    currentSentenceIndex,
    play,
    pause,
    resume,
    togglePlay,
    stop,
    nextSentence,
    prevSentence,
    jumpToSentence,
    testVoice,
    rvcServerStatus,
    serverErrorMessage,
    checkRVCServerHealth,
  } = useTTS(
    currentSentences,
    (sentenceIdx) => {
      if (currentDocument) {
        const updated = {
          ...currentDocument,
          lastRead: {
            chapterIndex: currentChapterIndex,
            sentenceIndex: sentenceIdx,
            progressPercentage: Math.round(
              ((sentenceIdx + 1) / Math.max(1, currentSentences.length)) * 100
            ),
            updatedAt: Date.now(),
          },
        };
        try {
          localStorage.setItem(RECENT_DOC_STORAGE_KEY, JSON.stringify(updated));
        } catch {
          // ignore
        }
      }
    },
    handleChapterComplete
  );

  // Switch document
  const handleDocumentLoaded = (newDoc: DocumentItem) => {
    stop();
    setCurrentDocument(newDoc);
    setCurrentChapterIndex(0);
    try {
      localStorage.setItem(RECENT_DOC_STORAGE_KEY, JSON.stringify(newDoc));
    } catch {
      // ignore
    }
  };

  // Switch chapter
  const handleSelectChapter = (chapterIdx: number) => {
    stop();
    setCurrentChapterIndex(chapterIdx);
    jumpToSentence(0, false);
  };

  const handlePrevChapter = () => {
    if (currentChapterIndex > 0) {
      handleSelectChapter(currentChapterIndex - 1);
    }
  };

  const handleNextChapter = () => {
    if (currentDocument && currentChapterIndex < currentDocument.chapters.length - 1) {
      handleSelectChapter(currentChapterIndex + 1);
    }
  };

  // Jump from search
  const handleJumpToSearchMatch = (chapterIdx: number, sentenceIdx: number) => {
    if (chapterIdx !== currentChapterIndex) {
      setCurrentChapterIndex(chapterIdx);
      setTimeout(() => {
        jumpToSentence(sentenceIdx, true);
      }, 100);
    } else {
      jumpToSentence(sentenceIdx, true);
    }
  };

  // Sentence click in reading area
  const handleSentenceClick = (sentence: SentenceItem) => {
    jumpToSentence(sentence.globalIndex, true);
  };

  // Current active sentence text
  const currentSentenceText = currentSentences[currentSentenceIndex]?.text || '';

  // Reading Statistics Tracking (7-day history & live metrics)
  const { summary: readingStats, resetStats } = useReadingStats(
    isPlaying,
    isPaused,
    currentSentenceText,
    settings.rate,
    currentDocument?.title,
    currentChapter?.title
  );

  // Check if current active sentence is already bookmarked
  const isCurrentSentenceBookmarked = useMemo(() => {
    if (!currentDocument) return false;
    return isBookmarked(currentDocument.id, currentChapterIndex, currentSentenceIndex);
  }, [currentDocument, isBookmarked, currentChapterIndex, currentSentenceIndex]);

  // Quick bookmark toggle for active sentence
  const handleQuickToggleCurrentBookmark = useCallback(() => {
    if (!currentDocument || !currentChapter) return;
    const docId = currentDocument.id;
    const existing = bookmarks.find(
      (b) =>
        b.documentId === docId &&
        b.chapterIndex === currentChapterIndex &&
        b.sentenceIndex === currentSentenceIndex
    );

    if (existing) {
      removeBookmark(existing.id);
      showToast('Bookmark removed');
    } else {
      addBookmark(
        docId,
        currentChapterIndex,
        currentChapter.title,
        currentSentenceIndex,
        currentSentenceText || `Sentence ${currentSentenceIndex + 1}`
      );
      showToast('Bookmark saved!');
    }
  }, [
    currentDocument,
    currentChapter,
    currentChapterIndex,
    currentSentenceIndex,
    currentSentenceText,
    bookmarks,
    addBookmark,
    removeBookmark,
    showToast,
  ]);

  // Jump to specific bookmark
  const handleJumpToBookmark = (chapterIdx: number, sentenceIdx: number) => {
    if (chapterIdx !== currentChapterIndex) {
      setCurrentChapterIndex(chapterIdx);
      setTimeout(() => {
        jumpToSentence(sentenceIdx, true);
      }, 120);
    } else {
      jumpToSentence(sentenceIdx, true);
    }
    showToast(`Jumped to Chapter ${chapterIdx + 1}, Sentence ${sentenceIdx + 1}`);
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore when typing inside input or textarea
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        nextSentence();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        prevSentence();
      } else if (e.key === 'b' || e.key === 'B') {
        e.preventDefault();
        handleQuickToggleCurrentBookmark();
      } else if (e.key === 'm' || e.key === 'M') {
        updateSettings({ mascotEnabled: !settings.mascotEnabled });
        showToast(settings.mascotEnabled ? 'Mascot hidden' : 'Mascot companion active');
      } else if (e.key === 's' || e.key === 'S') {
        setIsStatsOpen((prev) => !prev);
      } else if (e.code === 'Escape') {
        setIsSettingsOpen(false);
        setIsUploadOpen(false);
        setIsTOCOpen(false);
        setIsSearchOpen(false);
        setIsBookmarksOpen(false);
        setIsStatsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    togglePlay,
    nextSentence,
    prevSentence,
    handleQuickToggleCurrentBookmark,
    settings.mascotEnabled,
    updateSettings,
    showToast,
  ]);

  const themeConfig = THEMES[settings.theme] || THEMES.dark;

  return (
    <div
      id="voxread-app-root"
      className={`min-h-screen flex flex-col transition-colors duration-300 ${themeConfig.bg} selection:bg-amber-500/30 selection:text-amber-200`}
    >
      {/* Top Navigation */}
      <ReaderNavbar
        currentDocument={currentDocument}
        settings={settings}
        bookmarkCount={currentDocBookmarks.length}
        isCurrentBookmarked={isCurrentSentenceBookmarked}
        onOpenUpload={() => setIsUploadOpen(true)}
        onOpenTOC={() => setIsTOCOpen(true)}
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenBookmarks={() => setIsBookmarksOpen(true)}
        onQuickToggleCurrentBookmark={handleQuickToggleCurrentBookmark}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenStats={() => setIsStatsOpen(true)}
        onToggleMascot={() => {
          const next = !settings.mascotEnabled;
          updateSettings({ mascotEnabled: next });
          showToast(next ? 'Mascot companion enabled' : 'Mascot disabled (distraction-free)');
        }}
        onUpdateSettings={updateSettings}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div
          id="reader-toast-notification"
          className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-[#16161A]/95 text-amber-400 font-semibold text-xs border border-amber-500/40 shadow-2xl backdrop-blur-md animate-fade-in flex items-center space-x-2"
        >
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Distraction-free Reading Canvas */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        <ReaderContent
          currentChapter={currentChapter}
          chapterIndex={currentChapterIndex}
          totalChapters={currentDocument?.chapters?.length || 1}
          currentSentenceIndex={currentSentenceIndex}
          isPlaying={isPlaying}
          isPaused={isPaused}
          settings={settings}
          bookmarkedSentenceIndices={bookmarkedSentenceIndices}
          onSentenceClick={handleSentenceClick}
          onPrevChapter={handlePrevChapter}
          onNextChapter={handleNextChapter}
          onOpenUpload={() => setIsUploadOpen(true)}
        />
      </main>

      {/* Floating Audio Control Bar */}
      <ControlBar
        isPlaying={isPlaying}
        isPaused={isPaused}
        currentSentenceIndex={currentSentenceIndex}
        totalSentences={currentSentences.length}
        currentChapterTitle={currentChapter?.title || 'No Chapter'}
        currentChapterIndex={currentChapterIndex}
        totalChapters={currentDocument?.chapters?.length || 1}
        settings={settings}
        theme={settings.theme}
        onTogglePlay={togglePlay}
        onPrevSentence={prevSentence}
        onNextSentence={nextSentence}
        onJumpToSentence={(idx) => jumpToSentence(idx, isPlaying)}
        onPrevChapter={handlePrevChapter}
        onNextChapter={handleNextChapter}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenTOC={() => setIsTOCOpen(true)}
        onUpdateSettings={updateSettings}
      />

      {/* Interactive Floating Mascot */}
      {settings.mascotEnabled && (
        <MascotWidget
          type={settings.mascotType}
          mood={isPlaying && !isPaused ? 'reading' : isPaused ? 'paused' : 'idle'}
          isPlaying={isPlaying}
          isPaused={isPaused}
          currentSentenceText={currentSentenceText}
          currentSentenceIndex={currentSentenceIndex}
          totalSentences={currentSentences.length}
          settings={settings}
          onTogglePlay={togglePlay}
          onChangeMascot={(nextType: MascotType) => {
            updateSettings({ mascotType: nextType });
            showToast(`Switched companion to ${nextType.toUpperCase()}`);
          }}
          onDisableMascot={() => {
            updateSettings({ mascotEnabled: false });
            showToast('Mascot disabled. Re-enable anytime in Settings or top bar.');
          }}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />
      )}

      {/* Bookmarks Drawer */}
      <BookmarksDrawer
        isOpen={isBookmarksOpen}
        onClose={() => setIsBookmarksOpen(false)}
        document={currentDocument}
        currentChapterIndex={currentChapterIndex}
        currentSentenceIndex={currentSentenceIndex}
        currentSentenceText={currentSentenceText}
        bookmarks={bookmarks}
        onJumpToBookmark={handleJumpToBookmark}
        onAddCurrentBookmark={(note) => {
          if (currentDocument && currentChapter) {
            addBookmark(
              currentDocument.id,
              currentChapterIndex,
              currentChapter.title,
              currentSentenceIndex,
              currentSentenceText || `Sentence ${currentSentenceIndex + 1}`,
              note
            );
            showToast('Bookmark added');
          }
        }}
        onRemoveBookmark={(id) => {
          removeBookmark(id);
          showToast('Bookmark deleted');
        }}
        onUpdateBookmarkNote={(id, note) => {
          updateBookmarkNote(id, note);
          showToast('Bookmark note updated');
        }}
        onClearAll={() => {
          if (currentDocument) {
            clearAllBookmarksForDoc(currentDocument.id);
            showToast('Bookmarks cleared for this book');
          }
        }}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        voices={voices}
        rvcServerStatus={rvcServerStatus}
        serverErrorMessage={serverErrorMessage}
        onCheckRVCHealth={checkRVCServerHealth}
        onSaveSettings={(newSettings: TTSSettings) => {
          updateSettings(newSettings);
          showToast('Settings saved');
        }}
        onTestVoice={testVoice}
      />

      {/* Upload & Import Modal */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onDocumentLoaded={handleDocumentLoaded}
      />

      {/* Table of Contents Drawer */}
      <TOCDrawer
        isOpen={isTOCOpen}
        onClose={() => setIsTOCOpen(false)}
        document={currentDocument}
        currentChapterIndex={currentChapterIndex}
        onSelectChapter={handleSelectChapter}
      />

      {/* Search in Document Drawer */}
      <SearchDrawer
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        document={currentDocument}
        onJumpToMatch={handleJumpToSearchMatch}
      />

      {/* Reading Statistics Modal */}
      <ReadingStatsModal
        isOpen={isStatsOpen}
        onClose={() => setIsStatsOpen(false)}
        stats={readingStats}
        mascotType={settings.mascotType}
        onResetStats={resetStats}
      />
    </div>
  );
}
