import React, { useEffect, useRef } from 'react';
import { Chapter, SentenceItem, TTSSettings } from '../types';
import { THEMES, FONT_FAMILIES, getHighlightClass } from '../utils/themeStyles';
import { BookOpen, Clock, FileText, ChevronLeft, ChevronRight, Bookmark } from 'lucide-react';
import confetti from 'canvas-confetti';

interface ReaderContentProps {
  currentChapter: Chapter | null;
  chapterIndex: number;
  totalChapters: number;
  currentSentenceIndex: number;
  isPlaying: boolean;
  isPaused: boolean;
  settings: TTSSettings;
  bookmarkedSentenceIndices?: Set<number>;
  onSentenceClick: (sentence: SentenceItem) => void;
  onToggleBookmarkSentence?: (sentence: SentenceItem) => void;
  onPrevChapter: () => void;
  onNextChapter: () => void;
  onOpenUpload: () => void;
}

export const ReaderContent: React.FC<ReaderContentProps> = ({
  currentChapter,
  chapterIndex,
  totalChapters,
  currentSentenceIndex,
  isPlaying,
  isPaused,
  settings,
  bookmarkedSentenceIndices = new Set(),
  onSentenceClick,
  onToggleBookmarkSentence,
  onPrevChapter,
  onNextChapter,
  onOpenUpload,
}) => {
  const activeSentenceRef = useRef<HTMLSpanElement | null>(null);
  const readerContainerRef = useRef<HTMLDivElement | null>(null);

  const themeConfig = THEMES[settings.theme] || THEMES.dark;
  const fontConfig = FONT_FAMILIES[settings.fontFamily] || FONT_FAMILIES.merriweather;

  // Auto-scroll active sentence into view when sentence changes
  useEffect(() => {
    if (settings.autoScroll && activeSentenceRef.current) {
      activeSentenceRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [currentSentenceIndex, settings.autoScroll, chapterIndex]);

  // Width container sizing
  const widthClasses = {
    narrow: 'max-w-xl',
    medium: 'max-w-3xl',
    wide: 'max-w-4xl',
    full: 'max-w-5xl',
  }[settings.contentWidth || 'medium'];

  // Trigger celebration confetti if at the end of chapter
  const handleCompleteCelebration = () => {
    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.85 },
      });
    } catch {
      // ignore if canvas unavailable
    }
  };

  if (!currentChapter) {
    return (
      <div className={`flex-1 flex items-center justify-center p-8 ${themeConfig.readerBg}`}>
        <div className="text-center max-w-md p-8 rounded-2xl bg-[#16161A] border border-white/10 space-y-4 shadow-2xl">
          <BookOpen className="w-12 h-12 text-amber-500 mx-auto" />
          <h3 className="text-xl font-bold text-white">
            No Document Loaded
          </h3>
          <p className="text-sm text-slate-400">
            Import a novel file (.txt, .pdf, .epub) or select a classic story to begin reading with voice synthesis.
          </p>
          <button
            onClick={onOpenUpload}
            className="px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-black font-bold text-sm shadow-md transition-all cursor-pointer"
          >
            Open Document Library
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={readerContainerRef}
      id="reader-main-viewport"
      className={`flex-1 overflow-y-auto pt-8 pb-36 px-4 md:px-8 transition-colors duration-300 ${themeConfig.readerBg} ${themeConfig.text}`}
      style={{
        fontFamily: fontConfig.cssFamily,
        fontSize: `${settings.fontSize}px`,
        lineHeight: settings.lineHeight,
      }}
    >
      <div className={`mx-auto ${widthClasses} transition-all duration-200`}>
        {/* Chapter Header */}
        <header className="mb-10 text-center select-none">
          <h2 className="text-3xl md:text-4xl font-serif text-white mb-2 italic tracking-tight">
            {currentChapter.title}
          </h2>
          <p className="text-amber-500/80 text-xs md:text-sm tracking-widest uppercase font-sans mb-4">
            Chapter {chapterIndex + 1} of {totalChapters}
          </p>
          <div className="flex items-center justify-center space-x-3 text-xs font-sans text-slate-500">
            <span className="flex items-center space-x-1">
              <FileText className="w-3.5 h-3.5" />
              <span>{currentChapter.wordCount.toLocaleString()} words</span>
            </span>
            <span>•</span>
            <span className="flex items-center space-x-1">
              <Clock className="w-3.5 h-3.5" />
              <span>~{Math.max(1, Math.ceil(currentChapter.wordCount / (200 * settings.rate)))} min read</span>
            </span>
          </div>
        </header>

        {/* Paragraphs and Highlightable Sentences */}
        <article className="space-y-6 reader-article-body text-slate-300 font-serif">
          {currentChapter.paragraphs.map((paragraph) => (
            <p
              key={paragraph.id}
              id={`reader-paragraph-${paragraph.paragraphIndex}`}
              className="relative text-justify leading-relaxed transition-all"
            >
              {paragraph.sentences.map((sentence) => {
                const isActive = sentence.globalIndex === currentSentenceIndex;
                const isBookmarked = bookmarkedSentenceIndices.has(sentence.globalIndex);
                const highlightClass = getHighlightClass(
                  settings.highlightStyle,
                  settings.theme,
                  isActive
                );

                return (
                  <span
                    key={sentence.id}
                    ref={isActive ? activeSentenceRef : null}
                    id={`sentence-${sentence.globalIndex}`}
                    onClick={() => onSentenceClick(sentence)}
                    className={`inline ${highlightClass} mr-1 group/sentence relative transition-colors`}
                    title="Click to start reading from here"
                  >
                    {isBookmarked && (
                      <span
                        className="inline-flex items-center text-amber-400 mr-1 align-middle"
                        title="Bookmarked position"
                      >
                        <Bookmark className="w-3.5 h-3.5 fill-amber-400 inline" />
                      </span>
                    )}
                    {sentence.text}{' '}
                  </span>
                );
              })}
            </p>
          ))}
        </article>

        {/* Chapter Navigation Footer inside reader */}
        <footer className="mt-14 pt-8 border-t border-white/5 flex items-center justify-between select-none">
          <button
            onClick={onPrevChapter}
            disabled={chapterIndex <= 0}
            className={`px-4 py-2 rounded-xl text-xs font-sans font-semibold flex items-center space-x-1.5 border transition-all ${
              chapterIndex <= 0
                ? 'opacity-25 cursor-not-allowed border-transparent text-slate-500'
                : 'border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white cursor-pointer'
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Previous Chapter</span>
          </button>

          <div className="text-center font-sans text-xs text-slate-500">
            {currentSentenceIndex >= currentChapter.totalSentences - 1 ? (
              <span
                onClick={handleCompleteCelebration}
                className="text-amber-400 font-semibold cursor-pointer"
              >
                🎉 Chapter Completed!
              </span>
            ) : (
              <span>
                Sentence {Math.min(currentSentenceIndex + 1, currentChapter.totalSentences)} of{' '}
                {currentChapter.totalSentences}
              </span>
            )}
          </div>

          <button
            onClick={onNextChapter}
            disabled={chapterIndex >= totalChapters - 1}
            className={`px-4 py-2 rounded-xl text-xs font-sans font-semibold flex items-center space-x-1.5 border transition-all ${
              chapterIndex >= totalChapters - 1
                ? 'opacity-25 cursor-not-allowed border-transparent text-slate-500'
                : 'border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white cursor-pointer'
            }`}
          >
            <span>Next Chapter</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </footer>
      </div>
    </div>
  );
};
