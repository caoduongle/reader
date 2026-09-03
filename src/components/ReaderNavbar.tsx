import React, { useState } from 'react';
import {
  BookOpen,
  Upload,
  Search,
  Settings,
  Sparkles,
  Sun,
  Moon,
  Coffee,
  Palette,
  Minus,
  Plus,
  Compass,
  Bookmark,
  BookmarkPlus,
  EyeOff,
  TrendingUp,
} from 'lucide-react';
import { DocumentItem, TTSSettings, ThemeMode } from '../types';
import { THEMES } from '../utils/themeStyles';

interface ReaderNavbarProps {
  currentDocument: DocumentItem | null;
  settings: TTSSettings;
  bookmarkCount: number;
  isCurrentBookmarked: boolean;
  onOpenUpload: () => void;
  onOpenTOC: () => void;
  onOpenSearch: () => void;
  onOpenBookmarks: () => void;
  onQuickToggleCurrentBookmark: () => void;
  onOpenSettings: () => void;
  onOpenStats: () => void;
  onToggleMascot: () => void;
  onUpdateSettings: (newSettings: Partial<TTSSettings>) => void;
}

export const ReaderNavbar: React.FC<ReaderNavbarProps> = ({
  currentDocument,
  settings,
  bookmarkCount,
  isCurrentBookmarked,
  onOpenUpload,
  onOpenTOC,
  onOpenSearch,
  onOpenBookmarks,
  onQuickToggleCurrentBookmark,
  onOpenSettings,
  onOpenStats,
  onToggleMascot,
  onUpdateSettings,
}) => {
  const [showThemeMenu, setShowThemeMenu] = useState(false);

  const isDark =
    settings.theme === 'dark' || settings.theme === 'midnight' || settings.theme === 'forest';

  const themeIcons: Record<ThemeMode, React.ReactNode> = {
    sepia: <Coffee className="w-4 h-4 text-amber-600" />,
    light: <Sun className="w-4 h-4 text-amber-500" />,
    dark: <Moon className="w-4 h-4 text-neutral-300" />,
    forest: <Palette className="w-4 h-4 text-emerald-400" />,
    midnight: <Moon className="w-4 h-4 text-cyan-400" />,
    paper: <BookOpen className="w-4 h-4 text-amber-700" />,
  };

  return (
    <header
      id="reader-top-navbar"
      className={`h-16 px-4 md:px-8 border-b flex items-center justify-between select-none transition-colors duration-200 z-20 ${
        isDark
          ? 'bg-[#0D0D0F] border-white/5 text-slate-200'
          : 'bg-white/95 border-neutral-200 text-neutral-800'
      }`}
    >
      {/* Left: Brand & Active Document Name */}
      <div className="flex items-center space-x-3.5 min-w-0">
        <div className="flex items-center space-x-2.5 shrink-0">
          <div className="w-8 h-8 bg-amber-600 rounded flex items-center justify-center text-black font-bold shadow-md shadow-amber-500/20 text-base">
            📖
          </div>
          <h1 className="text-lg font-medium text-white tracking-tight flex items-center">
            <span>VoxNovel</span>
            <span className="text-slate-500 font-normal text-sm ml-2 hidden sm:inline">Reader</span>
          </h1>
        </div>

        {/* Vertical divider */}
        <div className="h-4 w-[1px] bg-white/10 hidden sm:block" />

        {/* Current Document Badge / Selector */}
        {currentDocument ? (
          <div
            onClick={onOpenTOC}
            title="Click to view chapters"
            className={`flex items-center space-x-2 px-2.5 py-1 rounded-lg cursor-pointer transition-colors max-w-[180px] md:max-w-xs lg:max-w-md ${
              isDark
                ? 'bg-white/5 border border-white/10 hover:bg-white/10 text-slate-200'
                : 'hover:bg-amber-50 border border-transparent'
            }`}
          >
            <span className="text-xs font-medium truncate text-slate-200">
              {currentDocument.title}
            </span>
            <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-semibold shrink-0">
              {currentDocument.format}
            </span>
          </div>
        ) : (
          <span className="text-xs text-slate-500 italic">No book loaded</span>
        )}
      </div>

      {/* Right Controls */}
      <div className="flex items-center space-x-1.5 sm:space-x-2">
        {/* Upload / Open Document Library */}
        <button
          id="navbar-upload-btn"
          onClick={onOpenUpload}
          className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 active:scale-95 text-black font-semibold text-xs flex items-center space-x-1.5 shadow-sm transition-all cursor-pointer"
        >
          <Upload className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Library</span>
        </button>

        {/* TOC Button */}
        <button
          id="navbar-toc-btn"
          onClick={onOpenTOC}
          title="Chapters & Table of Contents"
          className={`p-2 rounded-lg transition-colors cursor-pointer ${
            isDark
              ? 'bg-white/5 border border-white/10 hover:bg-white/10 text-slate-400 hover:text-white'
              : 'hover:bg-neutral-100 text-neutral-700'
          }`}
        >
          <Compass className="w-4 h-4" />
        </button>

        {/* Bookmarks Drawer Button with Count Badge */}
        <button
          id="navbar-bookmarks-btn"
          onClick={onOpenBookmarks}
          title={`View Bookmarks (${bookmarkCount} saved)`}
          className={`p-2 rounded-lg transition-colors relative cursor-pointer ${
            bookmarkCount > 0
              ? 'bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20'
              : isDark
                ? 'bg-white/5 border border-white/10 hover:bg-white/10 text-slate-400 hover:text-white'
                : 'hover:bg-neutral-100 text-neutral-700'
          }`}
        >
          <Bookmark className="w-4 h-4" />
          {bookmarkCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-amber-500 text-black text-[9px] font-mono font-bold w-4 h-4 rounded-full flex items-center justify-center shadow-md">
              {bookmarkCount > 9 ? '9+' : bookmarkCount}
            </span>
          )}
        </button>

        {/* Quick Bookmark Current Position Button */}
        <button
          id="navbar-quick-bookmark-btn"
          onClick={onQuickToggleCurrentBookmark}
          title={
            isCurrentBookmarked
              ? 'Bookmarked! Click to remove bookmark'
              : 'Bookmark Current Position'
          }
          className={`p-2 rounded-lg transition-colors cursor-pointer ${
            isCurrentBookmarked
              ? 'bg-amber-500 text-black font-bold shadow-md shadow-amber-500/20'
              : isDark
                ? 'bg-white/5 border border-white/10 hover:bg-white/10 text-slate-400 hover:text-amber-400'
                : 'hover:bg-neutral-100 text-neutral-700'
          }`}
        >
          <BookmarkPlus className="w-4 h-4" />
        </button>

        {/* Search in Document */}
        <button
          id="navbar-search-btn"
          onClick={onOpenSearch}
          title="Find text in document"
          className={`p-2 rounded-lg transition-colors cursor-pointer ${
            isDark
              ? 'bg-white/5 border border-white/10 hover:bg-white/10 text-slate-400 hover:text-white'
              : 'hover:bg-neutral-100 text-neutral-700'
          }`}
        >
          <Search className="w-4 h-4" />
        </button>

        {/* Font Size Quick Tweak (A- / A+) */}
        <div
          className={`hidden md:flex items-center space-x-1 px-1.5 py-1 rounded-lg border ${
            isDark
              ? 'border-white/10 bg-white/5 text-slate-300'
              : 'border-neutral-200 bg-neutral-50'
          }`}
        >
          <button
            onClick={() => onUpdateSettings({ fontSize: Math.max(14, settings.fontSize - 1) })}
            title="Decrease Font Size"
            className="p-1 hover:text-amber-400 text-xs font-bold text-slate-400 hover:text-white"
          >
            <Minus className="w-3 h-3" />
          </button>
          <span className="text-[11px] font-mono font-semibold px-1 min-w-[2.2rem] text-center text-slate-200">
            {settings.fontSize}px
          </span>
          <button
            onClick={() => onUpdateSettings({ fontSize: Math.min(32, settings.fontSize + 1) })}
            title="Increase Font Size"
            className="p-1 hover:text-amber-400 text-xs font-bold text-slate-400 hover:text-white"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>

        {/* Theme Picker Dropdown */}
        <div className="relative">
          <button
            id="navbar-theme-btn"
            onClick={() => setShowThemeMenu(!showThemeMenu)}
            title="Switch Reading Theme"
            className={`p-2 rounded-lg transition-colors cursor-pointer ${
              isDark
                ? 'bg-white/5 border border-white/10 hover:bg-white/10 text-slate-400 hover:text-white'
                : 'hover:bg-neutral-100'
            }`}
          >
            {themeIcons[settings.theme] || <Palette className="w-4 h-4 text-amber-500" />}
          </button>

          {showThemeMenu && (
            <div
              className={`absolute top-full right-0 mt-2 p-2 rounded-2xl shadow-2xl border backdrop-blur-xl z-50 min-w-[180px] space-y-1 ${
                isDark
                  ? 'bg-[#16161A] border-white/10 text-slate-200'
                  : 'bg-white/95 border-neutral-200'
              }`}
            >
              <div className="text-[10px] uppercase font-bold tracking-wider px-2 py-1 text-slate-500">
                Theme Palette
              </div>
              {(Object.keys(THEMES) as ThemeMode[]).map(themeKey => {
                const t = THEMES[themeKey];
                const isSelected = settings.theme === themeKey;
                return (
                  <button
                    key={themeKey}
                    onClick={() => {
                      onUpdateSettings({ theme: themeKey });
                      setShowThemeMenu(false);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs flex items-center justify-between transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-amber-600 text-black font-bold shadow-sm'
                        : isDark
                          ? 'hover:bg-white/5 text-slate-300 hover:text-white'
                          : 'hover:bg-neutral-100 text-neutral-800'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      {themeIcons[themeKey]}
                      <span>{t.name}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Mascot Master Quick Toggle Button */}
        <button
          id="navbar-toggle-mascot-btn"
          onClick={onToggleMascot}
          title={
            settings.mascotEnabled
              ? 'Disable Mascot Companion (Distraction-free mode)'
              : 'Enable Mascot Companion'
          }
          className={`p-2 rounded-lg transition-all cursor-pointer ${
            settings.mascotEnabled
              ? 'text-amber-400 bg-amber-500/15 border border-amber-500/30 shadow-sm'
              : isDark
                ? 'bg-white/5 border border-white/10 hover:bg-white/10 text-slate-500 hover:text-slate-300'
                : 'hover:bg-neutral-100 text-neutral-400'
          }`}
        >
          {settings.mascotEnabled ? (
            <Sparkles className="w-4 h-4" />
          ) : (
            <EyeOff className="w-4 h-4" />
          )}
        </button>

        {/* Reading Statistics Button */}
        <button
          id="navbar-stats-btn"
          onClick={onOpenStats}
          title="Reading Statistics (7-Day Progress & WPM)"
          className={`p-2 rounded-lg transition-colors cursor-pointer ${
            isDark
              ? 'bg-white/5 border border-white/10 hover:bg-white/10 text-slate-400 hover:text-amber-400'
              : 'hover:bg-neutral-100 text-neutral-700'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
        </button>

        {/* Settings Button */}
        <button
          id="navbar-settings-btn"
          onClick={onOpenSettings}
          title="TTS & Voice Settings"
          className={`p-2 rounded-lg transition-colors cursor-pointer ${
            isDark
              ? 'bg-white/5 border border-white/10 hover:bg-white/10 text-slate-400 hover:text-white'
              : 'hover:bg-neutral-100 text-neutral-700'
          }`}
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
