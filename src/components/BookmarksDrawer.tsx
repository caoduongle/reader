import React, { useState, useMemo } from 'react';
import {
  Bookmark,
  X,
  Trash2,
  Play,
  Clock,
  BookOpen,
  Edit2,
  Check,
  Search,
  Plus,
} from 'lucide-react';
import { BookmarkItem, DocumentItem } from '../types';

interface BookmarksDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  document: DocumentItem | null;
  currentChapterIndex: number;
  currentSentenceIndex: number;
  currentSentenceText: string;
  bookmarks: BookmarkItem[];
  onJumpToBookmark: (chapterIndex: number, sentenceIndex: number) => void;
  onAddCurrentBookmark: (note?: string) => void;
  onRemoveBookmark: (id: string) => void;
  onUpdateBookmarkNote: (id: string, note: string) => void;
  onClearAll: () => void;
}

export const BookmarksDrawer: React.FC<BookmarksDrawerProps> = ({
  isOpen,
  onClose,
  document,
  currentChapterIndex,
  currentSentenceIndex,
  currentSentenceText,
  bookmarks,
  onJumpToBookmark,
  onAddCurrentBookmark,
  onRemoveBookmark,
  onUpdateBookmarkNote,
  onClearAll,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'current' | 'all'>('current');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNoteText, setEditNoteText] = useState('');
  const [newBookmarkNote, setNewBookmarkNote] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  // Filter bookmarks
  const displayedBookmarks = useMemo(() => {
    return bookmarks.filter(bm => {
      const matchesDoc = filterMode === 'all' || !document || bm.documentId === document.id;
      const matchesQuery =
        !searchQuery ||
        bm.snippet.toLowerCase().includes(searchQuery.toLowerCase()) ||
        bm.chapterTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (bm.note && bm.note.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchesDoc && matchesQuery;
    });
  }, [bookmarks, filterMode, document, searchQuery]);

  const handleStartEdit = (bm: BookmarkItem) => {
    setEditingId(bm.id);
    setEditNoteText(bm.note || '');
  };

  const handleSaveEdit = (id: string) => {
    onUpdateBookmarkNote(id, editNoteText);
    setEditingId(null);
  };

  const handleAddBookmarkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddCurrentBookmark(newBookmarkNote);
    setNewBookmarkNote('');
    setShowAddForm(false);
  };

  if (!isOpen) return null;

  return (
    <div
      id="bookmarks-drawer-backdrop"
      className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-fade-in select-none"
      onClick={onClose}
    >
      <div
        id="bookmarks-drawer-content"
        className="w-full max-w-md h-full bg-[#0D0D0F] text-slate-200 shadow-2xl border-l border-white/10 flex flex-col animate-slide-left"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Bookmark className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Document Bookmarks</h3>
              <p className="text-[11px] text-slate-400 truncate max-w-[200px]">
                {document ? document.title : 'All Saved Positions'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Add Current Position Banner */}
        <div className="p-3.5 border-b border-white/10 bg-[#16161A]">
          {!showAddForm ? (
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider">
                  Current Reading Point
                </div>
                <div className="text-xs text-slate-300 truncate mt-0.5 font-serif italic">
                  &quot;
                  {currentSentenceText
                    ? currentSentenceText.substring(0, 55) + '...'
                    : 'Beginning of Section'}
                  &quot;
                </div>
              </div>
              <button
                id="drawer-quick-bookmark-btn"
                onClick={() => setShowAddForm(true)}
                className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 active:scale-95 text-black font-bold text-xs flex items-center space-x-1.5 shrink-0 shadow-md transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Bookmark</span>
              </button>
            </div>
          ) : (
            <form onSubmit={handleAddBookmarkSubmit} className="space-y-2">
              <div className="text-xs font-semibold text-white flex items-center justify-between">
                <span>Save Reading Position</span>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="text-slate-400 hover:text-white text-[11px]"
                >
                  Cancel
                </button>
              </div>
              <div className="text-[11px] text-slate-400 font-mono">
                Chapter {currentChapterIndex + 1} • Sentence {currentSentenceIndex + 1}
              </div>
              <input
                type="text"
                autoFocus
                placeholder="Thêm ghi chú tuỳ chọn (ví dụ: Trích dẫn hay, tình tiết quan trọng)..."
                value={newBookmarkNote}
                onChange={e => setNewBookmarkNote(e.target.value)}
                className="w-full px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-2.5 py-1 text-xs text-slate-400 hover:text-white"
                >
                  Huỷ
                </button>
                <button
                  type="submit"
                  className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-black text-xs font-bold rounded-lg transition-colors"
                >
                  Lưu dấu trang
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Search & Filter Bar */}
        <div className="p-3 border-b border-white/10 space-y-2 bg-[#0D0D0F]">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm trong đoạn trích hoặc ghi chú đánh dấu..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center space-x-1.5">
              <button
                onClick={() => setFilterMode('current')}
                className={`px-2.5 py-0.5 rounded-lg text-[11px] font-medium transition-colors ${
                  filterMode === 'current'
                    ? 'bg-amber-500/20 text-amber-400 font-semibold border border-amber-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Current Book (
                {bookmarks.filter(b => !document || b.documentId === document.id).length})
              </button>
              <button
                onClick={() => setFilterMode('all')}
                className={`px-2.5 py-0.5 rounded-lg text-[11px] font-medium transition-colors ${
                  filterMode === 'all'
                    ? 'bg-amber-500/20 text-amber-400 font-semibold border border-amber-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                All Documents ({bookmarks.length})
              </button>
            </div>

            {displayedBookmarks.length > 0 && (
              <button
                onClick={onClearAll}
                className="text-[10px] text-red-400/80 hover:text-red-400 flex items-center space-x-1"
                title="Clear filtered bookmarks"
              >
                <Trash2 className="w-3 h-3" />
                <span>Clear</span>
              </button>
            )}
          </div>
        </div>

        {/* Bookmarks List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
          {displayedBookmarks.length === 0 ? (
            <div className="text-center py-14 px-4 space-y-3">
              <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-amber-500">
                <Bookmark className="w-6 h-6" />
              </div>
              <div className="text-sm font-semibold text-slate-300">
                {searchQuery ? 'No bookmarks match your query' : 'No Bookmarks Saved Yet'}
              </div>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                Click &quot;Bookmark&quot; or tap the bookmark pin next to any sentence while
                reading to save meaningful quotes and reading checkpoints.
              </p>
              {!searchQuery && (
                <button
                  onClick={() => setShowAddForm(true)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-amber-400 transition-colors inline-flex items-center space-x-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Bookmark Current Spot</span>
                </button>
              )}
            </div>
          ) : (
            displayedBookmarks.map(bm => {
              const isEditing = editingId === bm.id;
              const dateStr = new Date(bm.createdAt).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={bm.id}
                  id={`bookmark-card-${bm.id}`}
                  className="p-3.5 rounded-2xl bg-white/5 border border-white/10 hover:border-amber-500/50 transition-all space-y-2.5 group"
                >
                  {/* Top Metadata */}
                  <div className="flex items-center justify-between text-[11px]">
                    <div className="flex items-center space-x-1.5 text-amber-400 font-semibold truncate max-w-[240px]">
                      <BookOpen className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{bm.chapterTitle}</span>
                      <span className="text-slate-500 font-mono">• S#{bm.sentenceIndex + 1}</span>
                    </div>

                    <div className="flex items-center space-x-1 text-slate-500 text-[10px] shrink-0">
                      <Clock className="w-3 h-3" />
                      <span>{dateStr}</span>
                    </div>
                  </div>

                  {/* Snippet Quotation */}
                  <p className="text-xs font-serif text-slate-200 leading-relaxed italic bg-black/30 p-2.5 rounded-xl border border-white/5">
                    &quot;{bm.snippet}&quot;
                  </p>

                  {/* Note Section */}
                  {isEditing ? (
                    <div className="flex items-center space-x-1.5 pt-1">
                      <input
                        type="text"
                        autoFocus
                        value={editNoteText}
                        onChange={e => setEditNoteText(e.target.value)}
                        placeholder="Chỉnh sửa ghi chú..."
                        className="flex-1 px-2.5 py-1 bg-white/10 border border-white/20 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveEdit(bm.id)}
                        className="p-1.5 bg-amber-600 hover:bg-amber-500 text-black rounded-lg transition-colors cursor-pointer"
                        title="Lưu ghi chú"
                        aria-label="Lưu ghi chú"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="p-1.5 text-slate-400 hover:text-white cursor-pointer"
                        title="Huỷ"
                        aria-label="Huỷ chỉnh sửa ghi chú"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    bm.note && (
                      <div className="flex items-start justify-between text-xs text-amber-300/90 bg-amber-500/10 px-2.5 py-1.5 rounded-lg border border-amber-500/20">
                        <span className="font-sans italic">{bm.note}</span>
                        <button
                          onClick={() => handleStartEdit(bm)}
                          className="text-slate-400 hover:text-amber-300 p-0.5 ml-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Edit note"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                      </div>
                    )
                  )}

                  {/* Action Buttons */}
                  <div className="flex items-center justify-between pt-1 border-t border-white/5 text-xs">
                    <div className="flex items-center space-x-1.5">
                      {!bm.note && !isEditing && (
                        <button
                          onClick={() => handleStartEdit(bm)}
                          className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center space-x-1 transition-colors"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>Add note</span>
                        </button>
                      )}
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => onRemoveBookmark(bm.id)}
                        className="p-1 text-slate-500 hover:text-red-400 transition-colors"
                        title="Delete bookmark"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        id={`jump-bookmark-${bm.id}`}
                        onClick={() => {
                          onJumpToBookmark(bm.chapterIndex, bm.sentenceIndex);
                          onClose();
                        }}
                        className="px-3 py-1 rounded-xl bg-amber-600 hover:bg-amber-500 text-black font-bold text-xs flex items-center space-x-1 shadow-md transition-all cursor-pointer"
                      >
                        <Play className="w-3 h-3 fill-black" />
                        <span>Jump & Read</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Drawer Footer Info */}
        <div className="p-3 border-t border-white/10 bg-[#0A0A0B] text-xs text-slate-500 flex items-center justify-between font-mono">
          <span>{displayedBookmarks.length} Bookmarks</span>
          <span className="text-[11px]">Click &apos;Jump &amp; Read&apos; to listen</span>
        </div>
      </div>
    </div>
  );
};
