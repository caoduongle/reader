import React, { useState } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Settings,
  BookOpen,
  ScanText,
} from 'lucide-react';
import { TTSSettings, ThemeMode } from '../types';

interface ControlBarProps {
  isPlaying: boolean;
  isPaused: boolean;
  currentSentenceIndex: number;
  totalSentences: number;
  currentChapterTitle: string;
  currentChapterIndex: number;
  totalChapters: number;
  settings: TTSSettings;
  theme: ThemeMode;
  onTogglePlay: () => void;
  onPrevSentence: () => void;
  onNextSentence: () => void;
  onJumpToSentence: (index: number) => void;
  onPrevChapter: () => void;
  onNextChapter: () => void;
  onOpenSettings: () => void;
  onOpenTOC: () => void;
  onOpenScreenReaderGuide?: () => void;
  onUpdateSettings: (newSettings: Partial<TTSSettings>) => void;
}

export const ControlBar: React.FC<ControlBarProps> = ({
  isPlaying,
  isPaused,
  currentSentenceIndex,
  totalSentences,
  currentChapterTitle,
  settings,
  theme,
  onTogglePlay,
  onPrevSentence,
  onNextSentence,
  onJumpToSentence,
  onOpenSettings,
  onOpenTOC,
  onOpenScreenReaderGuide,
  onUpdateSettings,
}) => {
  const [showVolumePopup, setShowVolumePopup] = useState(false);
  const [showSpeedPopup, setShowSpeedPopup] = useState(false);

  const progressPercent =
    totalSentences > 0
      ? Math.min(100, Math.round(((currentSentenceIndex + 1) / totalSentences) * 100))
      : 0;

  const speedOptions = [0.75, 1.0, 1.25, 1.5, 1.75, 2.0, 2.5];

  const isDark = theme === 'dark' || theme === 'midnight' || theme === 'forest';

  return (
    <div
      id="floating-audio-control-bar"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 w-[95%] max-w-3xl select-none"
    >
      <div
        className={`rounded-full backdrop-blur-xl px-6 py-2.5 shadow-2xl border transition-all ${
          isDark
            ? 'bg-[#0D0D0F]/95 border-white/10 text-slate-200 shadow-black/80'
            : 'bg-white/95 border-amber-900/15 text-neutral-800 shadow-neutral-500/20'
        }`}
      >
        <div className="flex items-center justify-between gap-4">
          {/* Left: Previous / Play / Next */}
          <div className="flex items-center space-x-2">
            {/* Prev Sentence */}
            <button
              id="tts-prev-sentence-btn"
              onClick={onPrevSentence}
              disabled={currentSentenceIndex <= 0}
              title="Previous Sentence (Arrow Left)"
              className={`p-2 rounded-full transition-all ${
                currentSentenceIndex <= 0
                  ? 'opacity-20 cursor-not-allowed text-slate-500'
                  : 'text-slate-400 hover:text-white active:scale-95'
              }`}
            >
              <SkipBack className="w-4 h-4 fill-current" />
            </button>

            {/* Main Play / Pause Button */}
            <button
              id="tts-play-pause-btn"
              onClick={onTogglePlay}
              title={isPlaying && !isPaused ? 'Pause (Space)' : 'Play (Space)'}
              className="w-10 h-10 rounded-full bg-white hover:bg-slate-100 active:scale-95 text-black flex items-center justify-center shadow-lg transition-all cursor-pointer"
            >
              {isPlaying && !isPaused ? (
                <Pause className="w-4 h-4 fill-black text-black" />
              ) : (
                <Play className="w-4 h-4 fill-black text-black ml-0.5" />
              )}
            </button>

            {/* Next Sentence */}
            <button
              id="tts-next-sentence-btn"
              onClick={onNextSentence}
              disabled={currentSentenceIndex >= totalSentences - 1}
              title="Next Sentence (Arrow Right)"
              className={`p-2 rounded-full transition-all ${
                currentSentenceIndex >= totalSentences - 1
                  ? 'opacity-20 cursor-not-allowed text-slate-500'
                  : 'text-slate-400 hover:text-white active:scale-95'
              }`}
            >
              <SkipForward className="w-4 h-4 fill-current" />
            </button>
          </div>

          {/* Center: Timeline Progress & Counters */}
          <div className="flex-1 flex flex-col gap-1 min-w-0">
            <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono uppercase">
              <span className="truncate max-w-[120px] md:max-w-[200px] text-slate-400">
                {currentChapterTitle}
              </span>
              <span>
                {totalSentences > 0 ? `${currentSentenceIndex + 1}/${totalSentences}` : '0/0'} (
                {progressPercent}%)
              </span>
            </div>

            {/* Interactive Range Scrubber */}
            <div className="relative w-full group flex items-center">
              <div
                className={`w-full h-1 rounded-full overflow-hidden transition-all ${
                  isDark ? 'bg-white/10' : 'bg-neutral-200'
                }`}
              >
                <div
                  className="h-full bg-amber-500 rounded-full transition-all duration-150 shadow-[0_0_10px_rgba(245,158,11,0.5)]"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <input
                id="tts-timeline-scrubber"
                type="range"
                min={0}
                max={Math.max(0, totalSentences - 1)}
                value={currentSentenceIndex}
                onChange={e => onJumpToSentence(Number(e.target.value))}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                title="Scrub reading position"
              />
            </div>
          </div>

          {/* Right Action Icons */}
          <div className="flex items-center gap-2 border-l border-white/10 pl-3">
            {/* Speed Quick Selector */}
            <div className="relative">
              <button
                id="tts-speed-badge-btn"
                onClick={() => {
                  setShowSpeedPopup(!showSpeedPopup);
                  setShowVolumePopup(false);
                }}
                title="Playback Rate"
                className={`px-2 py-1 rounded-lg text-xs font-mono font-medium transition-colors ${
                  isDark ? 'text-amber-500 hover:bg-white/5' : 'text-amber-800 bg-amber-100'
                }`}
              >
                {settings.rate}x
              </button>

              {/* Speed Popover */}
              {showSpeedPopup && (
                <div
                  className={`absolute bottom-full right-0 mb-3 p-2 rounded-xl shadow-2xl border backdrop-blur-xl flex flex-col gap-1 z-50 min-w-[120px] ${
                    isDark
                      ? 'bg-[#16161A] border-white/10 text-slate-200'
                      : 'bg-white/95 border-neutral-200'
                  }`}
                >
                  <div className="text-[10px] uppercase font-bold tracking-wider px-2 py-1 text-slate-500">
                    Voice Speed
                  </div>
                  {speedOptions.map(rate => (
                    <button
                      key={rate}
                      onClick={() => {
                        onUpdateSettings({ rate });
                        setShowSpeedPopup(false);
                      }}
                      className={`text-left px-2.5 py-1.5 rounded-lg text-xs font-mono font-medium flex items-center justify-between transition-colors ${
                        settings.rate === rate
                          ? 'bg-amber-600 text-black font-bold'
                          : isDark
                            ? 'hover:bg-white/5 text-slate-300'
                            : 'hover:bg-neutral-100 text-neutral-800'
                      }`}
                    >
                      <span>{rate}x</span>
                      {rate === 1.0 && <span className="text-[10px] opacity-75">Normal</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Volume Control Button & Popover */}
            <div className="relative">
              <button
                id="tts-volume-btn"
                onClick={() => {
                  setShowVolumePopup(!showVolumePopup);
                  setShowSpeedPopup(false);
                }}
                title="Volume"
                className={`p-1.5 rounded-lg transition-colors ${
                  isDark
                    ? 'text-slate-400 hover:text-white hover:bg-white/5'
                    : 'hover:bg-neutral-100 text-neutral-700'
                }`}
              >
                {settings.volume === 0 ? (
                  <VolumeX className="w-4 h-4 text-red-400" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </button>

              {/* Volume Popover */}
              {showVolumePopup && (
                <div
                  className={`absolute bottom-full right-0 mb-3 p-3 rounded-xl shadow-2xl border backdrop-blur-xl flex items-center space-x-2 z-50 min-w-[170px] ${
                    isDark
                      ? 'bg-[#16161A] border-white/10 text-slate-200'
                      : 'bg-white/95 border-neutral-200'
                  }`}
                >
                  <button
                    onClick={() => onUpdateSettings({ volume: settings.volume === 0 ? 1.0 : 0 })}
                    className="p-1 text-slate-400 hover:text-amber-500"
                  >
                    {settings.volume === 0 ? (
                      <VolumeX className="w-4 h-4" />
                    ) : (
                      <Volume2 className="w-4 h-4" />
                    )}
                  </button>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={settings.volume}
                    onChange={e => onUpdateSettings({ volume: Number(e.target.value) })}
                    className="w-24 accent-amber-500 cursor-pointer h-1 bg-white/20 rounded-lg"
                  />
                  <span className="text-xs font-mono w-8 text-right text-slate-300">
                    {Math.round(settings.volume * 100)}%
                  </span>
                </div>
              )}
            </div>

            {/* Screen Reader Guide Button */}
            {onOpenScreenReaderGuide && (
              <button
                id="dock-screen-reader-btn"
                onClick={onOpenScreenReaderGuide}
                title="Đọc màn hình (Ctrl+Shift+Space)"
                className={`p-1.5 rounded-lg transition-colors ${
                  isDark
                    ? 'text-slate-400 hover:text-white hover:bg-white/5'
                    : 'hover:bg-neutral-100 text-neutral-700'
                }`}
              >
                <ScanText className="w-4 h-4" />
              </button>
            )}

            {/* Chapters / TOC Button */}
            <button
              id="dock-toc-btn"
              onClick={onOpenTOC}
              title="Table of Contents"
              className={`p-1.5 rounded-lg transition-colors ${
                isDark
                  ? 'text-slate-400 hover:text-white hover:bg-white/5'
                  : 'hover:bg-neutral-100 text-neutral-700'
              }`}
            >
              <BookOpen className="w-4 h-4" />
            </button>

            {/* Settings Gear Button */}
            <button
              id="tts-open-settings-btn"
              onClick={onOpenSettings}
              title="Voice & Reader Settings"
              className={`p-1.5 rounded-lg transition-colors ${
                isDark
                  ? 'text-slate-400 hover:text-amber-500 hover:bg-white/5'
                  : 'hover:bg-amber-100 text-neutral-800'
              }`}
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
