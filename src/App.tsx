import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { DocumentItem, SentenceItem, TTSSettings, MascotType } from './types';
import { SAMPLE_DOCUMENTS } from './utils/sampleNovels';
import { useTTS } from './hooks/useTTS';
import { useBookmarks } from './hooks/useBookmarks';
import { ReaderNavbar } from './components/ReaderNavbar';
import { ReaderContent } from './components/ReaderContent';
import { ControlBar } from './components/ControlBar';
import { MascotWidget } from './components/MascotWidget';
import { UploadModal } from './components/UploadModal';
import { TOCDrawer } from './components/TOCDrawer';
import { SearchDrawer } from './components/SearchDrawer';
import { BookmarksDrawer } from './components/BookmarksDrawer';
import { ErrorBoundary } from './components/ErrorBoundary';

const SettingsModal = React.lazy(() => import('./components/SettingsModal'));
const ReadingStatsModal = React.lazy(() => import('./components/ReadingStatsModal'));
import { useReadingStats } from './hooks/useReadingStats';
import { THEMES } from './utils/themeStyles';
import { ScanText } from 'lucide-react';
import { useScreenReaderClipboard } from './hooks/useScreenReaderClipboard';
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
  const [pendingAutoPlay, setPendingAutoPlay] = useState<boolean>(false);
  const [showScreenReaderGuide, setShowScreenReaderGuide] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(prev => (prev === msg ? null : prev));
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
    currentChapter.paragraphs.forEach(p => {
      p.sentences.forEach(s => {
        list.push(s);
      });
    });
    return list;
  }, [currentChapter]);

  // Set of bookmarked sentence indices for the active chapter
  const bookmarkedSentenceIndices = useMemo<Set<number>>(() => {
    if (!currentDocument) return new Set();
    const set = new Set<number>();
    bookmarks.forEach(b => {
      if (b.documentId === currentDocument.id && b.chapterIndex === currentChapterIndex) {
        set.add(b.sentenceIndex);
      }
    });
    return set;
  }, [bookmarks, currentDocument, currentChapterIndex]);

  // On chapter completion callback
  const handleChapterComplete = useCallback(() => {
    if (currentDocument && currentChapterIndex < currentDocument.chapters.length - 1) {
      setCurrentChapterIndex(prev => prev + 1);
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
    sentenceIdx => {
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
      showToast(
        'Không lưu được tài liệu vào bộ nhớ dài hạn — phiên đọc chỉ tồn tại trong tab hiện tại'
      )
    );
    setActiveDocumentId(newDoc.id);
    saveReadingPosition({
      documentId: newDoc.id,
      chapterIndex: 0,
      sentenceIndex: 0,
      progressPercentage: 0,
      updatedAt: Date.now(),
    });
    showToast(`Đã nạp thành công: "${newDoc.title}"`);
  };

  // Dynamically synchronize browser tab title with active novel & chapter
  useEffect(() => {
    if (currentDocument) {
      const chapter = currentDocument.chapters[currentChapterIndex];
      const chapterName = chapter?.title ? ` - ${chapter.title}` : '';
      document.title = `${currentDocument.title}${chapterName} | VoxRead`;
    } else {
      document.title = 'VoxRead - Trình đọc truyện & Tài liệu giọng AI';
    }
  }, [currentDocument, currentChapterIndex]);

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

  // Handle new screen capture from global shortcut clipboard
  const handleNewScreenCapture = useCallback(
    (newDoc: DocumentItem) => {
      stop();
      setCurrentDocument(newDoc);
      setCurrentChapterIndex(0);
      setPendingAutoPlay(true);
      saveDocument(newDoc).catch(() =>
        showToast(
          'Không lưu được tài liệu vào bộ nhớ dài hạn — phiên đọc chỉ tồn tại trong tab hiện tại'
        )
      );
      setActiveDocumentId(newDoc.id);
      saveReadingPosition({
        documentId: newDoc.id,
        chapterIndex: 0,
        sentenceIndex: 0,
        progressPercentage: 0,
        updatedAt: Date.now(),
      });
      showToast('Đã nạp văn bản từ màn hình — Bắt đầu đọc...');
    },
    [stop, showToast]
  );

  useScreenReaderClipboard(handleNewScreenCapture);

  // Reactive sentence jumping (for cross-chapter search jumps and session restoration)
  // & Reactive autoplay for screen reader capture
  useEffect(() => {
    if (pendingJumpSentence !== null && currentSentences.length > 0) {
      const target = Math.min(pendingJumpSentence, currentSentences.length - 1);
      jumpToSentence(target, false);
      setPendingJumpSentence(null);
    }
    if (pendingAutoPlay && currentSentences.length > 0) {
      play(0);
      setPendingAutoPlay(false);
    }
  }, [
    currentChapterIndex,
    currentSentences,
    pendingJumpSentence,
    pendingAutoPlay,
    jumpToSentence,
    play,
  ]);

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
      b =>
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
        setIsStatsOpen(prev => !prev);
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
      className={`min-h-screen max-w-full overflow-x-hidden flex flex-col transition-colors duration-300 ${themeConfig.bg} selection:bg-amber-500/30 selection:text-amber-200`}
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
            onResetToSample={() => {
              clearReadingPosition();
              setCurrentDocument(SAMPLE_DOCUMENTS[0]);
              setCurrentChapterIndex(0);
              showToast('Đã quay về tài liệu mẫu');
            }}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onOpenTOC={() => setIsTOCOpen(true)}
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
        onJumpToSentence={idx => jumpToSentence(idx, isPlaying)}
        onPrevChapter={handlePrevChapter}
        onNextChapter={handleNextChapter}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenTOC={() => setIsTOCOpen(true)}
        onOpenScreenReaderGuide={() => setShowScreenReaderGuide(true)}
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
        onAddCurrentBookmark={note => {
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
        onRemoveBookmark={id => {
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
      {isSettingsOpen && (
        <React.Suspense fallback={null}>
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
        </React.Suspense>
      )}

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
      {isStatsOpen && (
        <React.Suspense fallback={null}>
          <ReadingStatsModal
            isOpen={isStatsOpen}
            onClose={() => setIsStatsOpen(false)}
            stats={readingStats}
            mascotType={settings.mascotType}
            onResetStats={resetStats}
          />
        </React.Suspense>
      )}

      {/* Screen Reader Guide Modal */}
      {showScreenReaderGuide && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
          onClick={() => setShowScreenReaderGuide(false)}
        >
          <div
            className={`w-full max-w-md p-6 rounded-2xl shadow-2xl border transition-all ${
              settings.theme === 'dark' ||
              settings.theme === 'midnight' ||
              settings.theme === 'forest'
                ? 'bg-[#16161A] border-white/10 text-slate-200 shadow-black/80'
                : 'bg-white border-neutral-200 text-neutral-800 shadow-xl'
            }`}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
                <ScanText className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold">Đọc màn hình từ Clipboard</h3>
                <p className="text-xs opacity-70">Phím tắt toàn cục: Ctrl + Shift + Space</p>
              </div>
            </div>

            <div className="space-y-3 my-4 text-sm">
              <div className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/5">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-500 text-black font-bold text-xs shrink-0">
                  1
                </span>
                <p>
                  <strong>Bôi đen văn bản</strong> ở bất kỳ ứng dụng nào đang mở (Word, PDF reader,
                  trình duyệt web, Notepad...).
                </p>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/5">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-500 text-black font-bold text-xs shrink-0">
                  2
                </span>
                <p>
                  Nhấn tổ hợp phím{' '}
                  <kbd className="px-1.5 py-0.5 rounded bg-white/10 font-mono text-xs border border-white/10">
                    Ctrl + C
                  </kbd>{' '}
                  để sao chép vào bộ nhớ tạm.
                </p>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/5">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-500 text-black font-bold text-xs shrink-0">
                  3
                </span>
                <p>
                  Bấm{' '}
                  <kbd className="px-1.5 py-0.5 rounded bg-white/10 font-mono text-xs border border-white/10">
                    Ctrl + Shift + Space
                  </kbd>{' '}
                  (hoặc Cmd+Shift+Space trên Mac). VoxRead sẽ tự động hiện lên và đọc ngay lập tức!
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowScreenReaderGuide(false)}
              className="w-full mt-2 py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-98 text-black font-medium transition-all cursor-pointer text-center"
            >
              Đã hiểu, sẵn sàng đọc
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
