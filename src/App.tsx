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
import { ErrorBoundary } from './components/ErrorBoundary';
import { useReadingStats } from './hooks/useReadingStats';
import { THEMES } from './utils/themeStyles';
import {
  saveReadingPosition,
  getReadingPosition,
  clearReadingPosition,
  LEGACY_ACTIVE_DOC_KEY,
} from './utils/storage';
import {
  saveDocument,
  getDocument,
  getActiveDocument,
  setActiveDocumentId,
} from './utils/indexedDB';

export default function App() {
  // Initialize with sample document as default fallback
  const [currentDocument, setCurrentDocument] = useState<DocumentItem>(SAMPLE_DOCUMENTS[0]);
  const [currentChapterIndex, setCurrentChapterIndex] = useState<number>(0);
  const [pendingJumpSentence, setPendingJumpSentence] = useState<number | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 2400);
  }, []);

  // Restore persisted document and reading position on mount
  useEffect(() => {
    let isMounted = true;
    async function restoreSession() {
      try {
        const savedPos = getReadingPosition();
        let loadedDoc: DocumentItem | null = null;

        if (savedPos?.documentId) {
          loadedDoc = await getDocument(savedPos.documentId);
        }

        if (!loadedDoc) {
          loadedDoc = await getActiveDocument();
        }

        // Fallback: check legacy localStorage for seamless upgrade
        if (!loadedDoc) {
          const legacyRaw = localStorage.getItem(LEGACY_ACTIVE_DOC_KEY);
          if (legacyRaw) {
            try {
              const legacyDoc = JSON.parse(legacyRaw);
              if (legacyDoc && legacyDoc.id && legacyDoc.chapters) {
                loadedDoc = legacyDoc;
                await saveDocument(legacyDoc);
              }
            } catch {
              // ignore
            }
          }
        }

        if (isMounted && loadedDoc) {
          setCurrentDocument(loadedDoc);
          if (savedPos && savedPos.documentId === loadedDoc.id) {
            const safeChap = Math.max(
              0,
              Math.min(loadedDoc.chapters.length - 1, savedPos.chapterIndex)
            );
            setCurrentChapterIndex(safeChap);
            if (savedPos.sentenceIndex > 0) {
              setPendingJumpSentence(savedPos.sentenceIndex);
            }
          } else if (loadedDoc.lastRead) {
            setCurrentChapterIndex(loadedDoc.lastRead.chapterIndex || 0);
            if (loadedDoc.lastRead.sentenceIndex > 0) {
              setPendingJumpSentence(loadedDoc.lastRead.sentenceIndex);
            }
          }
        } else if (isMounted && savedPos) {
          showToast('Không thể khôi phục phiên đọc trước đó, đang mở tài liệu mẫu');
        }
      } catch (error) {
        console.warn('[VoxRead] Failed to restore session:', error);
        if (isMounted) {
          showToast('Không thể khôi phục phiên đọc trước đó, đang mở tài liệu mẫu');
        }
      }
    }

    restoreSession();
    return () => {
      isMounted = false;
    };
  }, [showToast]);

  // Modals state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isTOCOpen, setIsTOCOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isBookmarksOpen, setIsBookmarksOpen] = useState(false);
  const [isStatsOpen, setIsStatsOpen] = useState(false);

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
        saveReadingPosition(
          {
            documentId: currentDocument.id,
            chapterIndex: currentChapterIndex,
            sentenceIndex: sentenceIdx,
            progressPercentage: Math.round(
              ((sentenceIdx + 1) / Math.max(1, currentSentences.length)) * 100
            ),
            updatedAt: Date.now(),
          },
          () => showToast('Không lưu được tiến trình đọc — thiết bị đầy bộ nhớ trình duyệt')
        );
      }
    },
    handleChapterComplete
  );

  // Switch document
  const handleDocumentLoaded = (newDoc: DocumentItem) => {
    stop();
    setCurrentDocument(newDoc);
    setCurrentChapterIndex(0);
    saveDocument(newDoc).catch(() =>
      showToast('Không lưu được tài liệu vào bộ nhớ dài hạn — phiên đọc chỉ tồn tại trong tab hiện tại')
    );
    setActiveDocumentId(newDoc.id);
    saveReadingPosition({
      documentId: newDoc.id,
      chapterIndex: 0,
      sentenceIndex: 0,
      progressPercentage: 0,
      updatedAt: Date.now(),
    });
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

  // Reactive sentence jumping (for cross-chapter search jumps and session restoration)
  useEffect(() => {
    if (pendingJumpSentence !== null && currentSentences.length > 0) {
      const target = Math.min(pendingJumpSentence, currentSentences.length - 1);
      jumpToSentence(target, false);
      setPendingJumpSentence(null);
    }
  }, [currentChapterIndex, currentSentences, pendingJumpSentence, jumpToSentence]);

  // Jump from search
  const handleJumpToSearchMatch = (chapterIdx: number, sentenceIdx: number) => {
    if (chapterIdx !== currentChapterIndex) {
      setCurrentChapterIndex(chapterIdx);
      setPendingJumpSentence(sentenceIdx);
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
        <ErrorBoundary
          isContentOnly
          fallbackTitle="Lỗi hiển thị nội dung"
          fallbackDescription="Nội dung tài liệu gặp sự cố khi hiển thị. Bạn có thể thử tải lại hoặc quay về tài liệu mẫu."
          onResetToSample={() => {
            clearReadingPosition();
            setCurrentDocument(SAMPLE_DOCUMENTS[0]);
            setCurrentChapterIndex(0);
            showToast('Đã quay về tài liệu mẫu');
          }}
        >
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
        </ErrorBoundary>
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
