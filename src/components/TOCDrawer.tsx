import React from 'react';
import { X, BookOpen, Clock, FileText, CheckCircle2 } from 'lucide-react';
import { DocumentItem } from '../types';

interface TOCDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  document: DocumentItem | null;
  currentChapterIndex: number;
  onSelectChapter: (index: number) => void;
}

export const TOCDrawer: React.FC<TOCDrawerProps> = ({
  isOpen,
  onClose,
  document,
  currentChapterIndex,
  onSelectChapter,
}) => {
  if (!isOpen || !document) return null;

  return (
    <div
      id="toc-drawer-backdrop"
      className="fixed inset-0 z-50 flex justify-start bg-black/60 backdrop-blur-sm select-none"
    >
      <div
        id="toc-drawer-content"
        className="w-full max-w-sm h-full bg-[#0D0D0F] text-slate-200 shadow-2xl border-r border-white/10 flex flex-col animate-slide-right"
      >
        {/* Drawer Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Table of Contents</h3>
              <p className="text-[11px] text-slate-400 truncate max-w-[200px]">{document.title}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Chapters List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
          {document.chapters.map((chapter, idx) => {
            const isCurrent = idx === currentChapterIndex;
            return (
              <div
                key={chapter.id}
                onClick={() => {
                  onSelectChapter(idx);
                  onClose();
                }}
                className={`p-3 rounded-xl cursor-pointer text-xs transition-all flex items-start justify-between ${
                  isCurrent
                    ? 'bg-white/10 text-white border border-amber-500/60 ring-1 ring-amber-500/30'
                    : 'hover:bg-white/5 text-slate-300 border border-transparent'
                }`}
              >
                <div className="space-y-1 min-w-0 pr-2">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-[10px] text-amber-500 font-bold">
                      {(idx + 1).toString().padStart(2, '0')}
                    </span>
                    <span className="font-bold text-white truncate">{chapter.title}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-[11px] text-slate-400 font-sans">
                    <span className="flex items-center space-x-1">
                      <FileText className="w-3 h-3" />
                      <span>{chapter.totalSentences} sentences</span>
                    </span>
                    <span>•</span>
                    <span className="flex items-center space-x-1">
                      <Clock className="w-3 h-3" />
                      <span>{chapter.wordCount} words</span>
                    </span>
                  </div>
                </div>

                {isCurrent && <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-1" />}
              </div>
            );
          })}
        </div>

        {/* Drawer Footer Info */}
        <div className="p-3 border-t border-white/10 bg-[#0A0A0B] text-xs text-slate-500 flex items-center justify-between font-mono">
          <span>Total: {document.chapters.length} Sections</span>
          <span>{document.totalWords.toLocaleString()} Words</span>
        </div>
      </div>
    </div>
  );
};
