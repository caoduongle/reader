import React, { useEffect, useRef } from 'react';
import { Chapter, SentenceItem, TTSSettings } from '../types';
import { THEMES, FONT_FAMILIES, getHighlightClass } from '../utils/themeStyles';
import {
  BookOpen,
  Clock,
  FileText,
  ChevronLeft,
  ChevronRight,
  Bookmark,
  Upload,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
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
  onResetToSample?: () => void;
  onOpenSettings?: () => void;
  onOpenTOC?: () => void;
}

export const ReaderContent: React.FC<ReaderContentProps> = ({
  currentChapter,
  chapterIndex,
  totalChapters,
  currentSentenceIndex,
  settings,
  bookmarkedSentenceIndices = new Set(),
  onSentenceClick,
  onPrevChapter,
  onNextChapter,
  onOpenUpload,
  onResetToSample,
  onOpenSettings,
  onOpenTOC,
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
      <div className={`flex-1 flex items-center justify-center p-6 sm:p-8 ${themeConfig.readerBg}`}>
        <div className="text-center max-w-md w-full p-8 rounded-3xl bg-[#16161A] border border-white/10 space-y-5 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center mx-auto shadow-inner">
            <BookOpen className="w-8 h-8" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 text-[11px] font-semibold tracking-wide uppercase mb-2">
              <span>Trạng thái 404 • Chưa có nội dung</span>
            </div>
            <h3 className="text-xl font-bold text-white tracking-tight">Chưa tải tài liệu hoặc chương đọc</h3>
            <p className="text-xs sm:text-sm text-slate-400 mt-2 leading-relaxed">
              Không tìm thấy nội dung chương sách hoặc tài liệu chưa được nạp. Hãy chọn một tác phẩm từ thư viện hoặc tải lên tài liệu mới (.txt, .epub, .pdf) để tiếp tục đọc.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={onOpenUpload}
              className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-black font-bold text-xs sm:text-sm shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer touch-manipulation"
              aria-label="Mở thư viện tài liệu để tải sách"
            >
              <Upload className="w-4 h-4" />
              <span>Mở Thư viện / Tải tệp</span>
            </button>
            {onResetToSample && (
              <button
                type="button"
                onClick={onResetToSample}
                className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 active:scale-95 border border-white/10 text-slate-200 font-semibold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer touch-manipulation"
                aria-label="Đọc tác phẩm văn học mẫu"
              >
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Đọc tác phẩm mẫu</span>
              </button>
            )}
          </div>
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
            Chương {chapterIndex + 1} / {totalChapters}
          </p>
          <div className="flex items-center justify-center space-x-3 text-xs font-sans text-slate-500">
            <span className="flex items-center space-x-1">
              <FileText className="w-3.5 h-3.5" />
              <span>{currentChapter.wordCount.toLocaleString()} từ</span>
            </span>
            <span>•</span>
            <span className="flex items-center space-x-1">
              <Clock className="w-3.5 h-3.5" />
              <span>~{Math.ceil(currentChapter.wordCount / 180)} phút đọc</span>
            </span>
          </div>
        </header>

        {/* Paragraphs and Sentences */}
        <article className="space-y-6 leading-relaxed selection:bg-amber-500/30 selection:text-white">
          {currentChapter.paragraphs.map(paragraph => (
            <p key={paragraph.id} className="text-justify font-normal">
              {paragraph.sentences.map(sentence => {
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
                    className={`inline ${highlightClass} mr-1 group/sentence relative transition-colors cursor-pointer`}
                    title="Nhấp để bắt đầu đọc từ câu này"
                  >
                    {isBookmarked && (
                      <span
                        className="inline-flex items-center text-amber-400 mr-1 align-middle"
                        title="Vị trí đánh dấu"
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
        <div className="mt-14 pt-8 border-t border-white/5 flex items-center justify-between select-none">
          <button
            type="button"
            onClick={onPrevChapter}
            disabled={chapterIndex <= 0}
            aria-label="Chương trước"
            className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-sans font-semibold flex items-center space-x-1.5 border transition-all touch-manipulation ${
              chapterIndex <= 0
                ? 'opacity-25 cursor-not-allowed border-transparent text-slate-500'
                : 'border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white cursor-pointer'
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Chương trước</span>
          </button>

          <div className="text-center font-sans text-xs text-slate-500">
            {currentSentenceIndex >= currentChapter.totalSentences - 1 ? (
              <button
                type="button"
                onClick={handleCompleteCelebration}
                className="text-amber-400 font-semibold cursor-pointer hover:underline inline-flex items-center gap-1"
                aria-label="Chúc mừng đã hoàn thành chương sách"
              >
                <span>🎉 Đã đọc xong chương!</span>
              </button>
            ) : (
              <span>
                Câu {Math.min(currentSentenceIndex + 1, currentChapter.totalSentences)} /{' '}
                {currentChapter.totalSentences}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={onNextChapter}
            disabled={chapterIndex >= totalChapters - 1}
            aria-label="Chương kế tiếp"
            className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-sans font-semibold flex items-center space-x-1.5 border transition-all touch-manipulation ${
              chapterIndex >= totalChapters - 1
                ? 'opacity-25 cursor-not-allowed border-transparent text-slate-500'
                : 'border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white cursor-pointer'
            }`}
          >
            <span>Chương sau</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Reader Footer Navigation & Copyright */}
        <footer className="mt-16 pt-8 border-t border-white/10 flex flex-col items-center justify-center gap-4 text-xs text-slate-400 select-none pb-8">
          <nav className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 font-sans">
            {onOpenTOC && (
              <button
                type="button"
                onClick={onOpenTOC}
                className="hover:text-amber-400 transition-colors py-1 cursor-pointer focus:outline-none focus:underline"
              >
                Mục lục tác phẩm
              </button>
            )}
            {onOpenSettings && (
              <button
                type="button"
                onClick={onOpenSettings}
                className="hover:text-amber-400 transition-colors py-1 cursor-pointer focus:outline-none focus:underline"
              >
                Cài đặt đọc & giọng nói
              </button>
            )}
            <a
              href="https://github.com/caoduongle/reader"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-amber-400 transition-colors inline-flex items-center gap-1 py-1 focus:outline-none focus:underline"
              aria-label="Xem mã nguồn VoxRead trên GitHub"
            >
              <span>Tài liệu & Mã nguồn</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            <a
              href="https://github.com/caoduongle/reader/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-amber-400 transition-colors inline-flex items-center gap-1 py-1 focus:outline-none focus:underline"
              aria-label="Báo cáo sự cố hoặc đóng góp ý kiến trên GitHub"
            >
              <span>Báo lỗi / Góp ý</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </nav>

          <p className="text-[11px] text-slate-500 text-center font-sans">
            © {new Date().getFullYear()} VoxRead. Giữ toàn quyền. Trình đọc sách thông minh hỗ trợ giọng đọc AI.
          </p>
        </footer>
      </div>
    </div>
  );
};
