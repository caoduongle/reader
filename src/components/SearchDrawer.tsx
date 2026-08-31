import React, { useState, useMemo } from 'react';
import { X, Search, ChevronRight, CornerDownLeft } from 'lucide-react';
import { DocumentItem, SearchMatch } from '../types';

interface SearchDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  document: DocumentItem | null;
  onJumpToMatch: (chapterIndex: number, sentenceIndex: number) => void;
}

export const SearchDrawer: React.FC<SearchDrawerProps> = ({
  isOpen,
  onClose,
  document,
  onJumpToMatch,
}) => {
  const [query, setQuery] = useState('');

  const matches = useMemo<SearchMatch[]>(() => {
    if (!document || !query.trim() || query.length < 2) return [];

    const lowerQuery = query.toLowerCase();
    const results: SearchMatch[] = [];

    document.chapters.forEach((chapter, cIdx) => {
      chapter.paragraphs.forEach((p, pIdx) => {
        p.sentences.forEach((s) => {
          if (s.text.toLowerCase().includes(lowerQuery)) {
            // Create snippet with highlighted match
            results.push({
              chapterIndex: cIdx,
              paragraphIndex: pIdx,
              sentenceIndex: s.globalIndex,
              globalIndex: s.globalIndex,
              text: s.text,
              matchSnippet: chapter.title,
            });
          }
        });
      });
    });

    return results;
  }, [document, query]);

  if (!isOpen || !document) return null;

  return (
    <div
      id="search-drawer-backdrop"
      className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm select-none"
    >
      <div
        id="search-drawer-content"
        className="w-full max-w-md h-full bg-[#0D0D0F] text-slate-200 shadow-2xl border-l border-white/10 flex flex-col"
      >
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Search className="w-4 h-4 text-amber-500" />
            <h3 className="font-bold text-sm text-white">Find in Document</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Input */}
        <div className="p-3 border-b border-white/10">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              autoFocus
              placeholder="Type word or phrase to search..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>
          <div className="mt-1.5 text-[11px] text-slate-400 flex justify-between px-1">
            <span>{query.length >= 2 ? `${matches.length} matches found` : 'Enter at least 2 characters'}</span>
          </div>
        </div>

        {/* Search Results */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {matches.map((m, idx) => (
            <div
              key={idx}
              onClick={() => {
                onJumpToMatch(m.chapterIndex, m.sentenceIndex);
                onClose();
              }}
              className="p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-amber-500/50 cursor-pointer transition-all text-xs group"
            >
              <div className="flex items-center justify-between text-[10px] text-amber-500 font-semibold mb-1">
                <span>{m.matchSnippet}</span>
                <span className="opacity-75 flex items-center space-x-1 group-hover:translate-x-1 transition-transform">
                  <span>Jump</span>
                  <CornerDownLeft className="w-3 h-3" />
                </span>
              </div>
              <p className="text-slate-300 font-serif leading-relaxed line-clamp-3">
                {m.text}
              </p>
            </div>
          ))}

          {query.length >= 2 && matches.length === 0 && (
            <div className="text-center py-10 text-slate-500 text-xs">
              No results found for &quot;{query}&quot;.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
