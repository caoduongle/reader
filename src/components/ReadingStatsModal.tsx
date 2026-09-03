import React, { useState } from 'react';
import {
  X,
  Clock,
  Zap,
  Flame,
  Calendar,
  BookOpen,
  TrendingUp,
  Award,
  Sparkles,
  BarChart2,
  RefreshCw,
  Layers,
  ChevronRight,
  Info,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Area,
  AreaChart,
} from 'recharts';
import { ReadingStatsSummary, DailyReadingStat, MascotType } from '../types';

interface ReadingStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats: ReadingStatsSummary;
  mascotType?: MascotType;
  onResetStats?: () => void;
}

type ChartMetric = 'duration' | 'words' | 'wpm';

export const ReadingStatsModal: React.FC<ReadingStatsModalProps> = ({
  isOpen,
  onClose,
  stats,
  mascotType = 'fox',
  onResetStats,
}) => {
  const [selectedMetric, setSelectedMetric] = useState<ChartMetric>('duration');
  const [chartType, setChartType] = useState<'line' | 'area'>('area');
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  if (!isOpen) return null;

  // Format minutes into "X hrs Y mins" or "X mins"
  const formatTime = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} mins`;
    }
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hrs} hr${hrs > 1 ? 's' : ''} ${mins > 0 ? `${mins}m` : ''}`;
  };

  // Average session length
  const avgSessionMinutes = Math.round(
    stats.totalReadingTimeMinutes / Math.max(1, stats.totalSessions)
  );

  const hasReadingData =
    stats.totalReadingTimeMinutes > 0 ||
    stats.totalWordsRead > 0 ||
    (stats.recentSessions && stats.recentSessions.length > 0);

  // Mascot personalized coaching feedback
  const mascotComment = !hasReadingData
    ? `✨ Chào mừng bạn! Bắt đầu đọc hoặc nghe sách để theo dõi tiến trình và số liệu tại đây.`
    : {
        fox: `🦊 Kitsune: "Outstanding pace! You've logged ${formatTime(
          stats.totalReadingTimeMinutes
        )} with an impressive ${stats.overallAvgWpm} WPM average. Keep up the daily reading momentum!"`,
        owl: `🦉 Barnaby: "Scholarly dedication! Your ${stats.currentStreakDays}-day streak and focus on literary immersion demonstrates admirable consistency."`,
        bot: `🤖 Voxie-9: "Telemetry analyzed: Speech processing engine operating at peak efficiency (${stats.overallAvgWpm} WPM across ${stats.totalWordsRead.toLocaleString()} words)."`,
        cat: `🐱 Mochi: "Purr-fect cozy reading time! ${formatTime(
          stats.todayDurationMinutes
        )} enjoyed today with delightful stories."`,
        bunny: `🐰 Luna: "Gentle progress illuminated by the moon! You've completed ${formatTime(
          stats.totalReadingTimeMinutes
        )} of wonderful tales."`,
        dragon: `🐲 Astral Dragon: "Fiery reading passion! ${stats.totalWordsRead.toLocaleString()} words conquered with boundless mythical energy!"`,
      }[mascotType];

  // Custom Chart Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data: DailyReadingStat = payload[0].payload;
      return (
        <div className="bg-[#16161A] border border-white/20 p-3 rounded-xl shadow-2xl backdrop-blur-md text-xs font-sans space-y-1.5 min-w-[170px]">
          <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
            <span className="font-bold text-white">{data.dayLabel}</span>
            <span className="text-[10px] text-slate-400 font-mono">{data.fullDateLabel}</span>
          </div>
          <div className="flex items-center justify-between text-amber-400">
            <span className="flex items-center space-x-1">
              <Clock className="w-3 h-3" />
              <span>Session Duration:</span>
            </span>
            <span className="font-mono font-bold">{data.durationMinutes} mins</span>
          </div>
          <div className="flex items-center justify-between text-emerald-400">
            <span className="flex items-center space-x-1">
              <BookOpen className="w-3 h-3" />
              <span>Words Read:</span>
            </span>
            <span className="font-mono font-bold">{data.wordsRead.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between text-cyan-400">
            <span className="flex items-center space-x-1">
              <Zap className="w-3 h-3" />
              <span>Speed (WPM):</span>
            </span>
            <span className="font-mono font-bold">{data.wpm} WPM</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div
      id="reading-stats-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in select-none"
    >
      <div
        id="reading-stats-modal"
        className="w-full max-w-3xl bg-[#0D0D0F] text-slate-200 rounded-3xl shadow-2xl border border-white/10 flex flex-col max-h-[92vh] overflow-hidden"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#16161A]">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center shadow-inner">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-white">Reading Statistics</h2>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-semibold">
                  Last 7 Days
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Track reading time, speed metrics, and daily immersion progress
              </p>
            </div>
          </div>

          <button
            id="close-reading-stats-modal-btn"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Zero-State Encouraging Banner */}
          {!hasReadingData && (
            <div className="p-6 rounded-2xl bg-[#16161A] border border-amber-500/20 flex flex-col items-center justify-center text-center space-y-3 animate-fade-in">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <BookOpen className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-white tracking-wide">
                  Chưa có dữ liệu đọc sách
                </h4>
                <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
                  Bắt đầu đọc hoặc nghe sách bằng giọng đọc để theo dõi thời gian, tốc độ và số từ
                  đã đọc mỗi ngày tại đây.
                </p>
              </div>
            </div>
          )}

          {/* Top 3 Core Metrics Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            {/* 1. Total Reading Time */}
            <div
              id="stat-card-total-time"
              className="p-4 rounded-2xl bg-[#16161A] border border-white/10 flex flex-col justify-between hover:border-amber-500/40 transition-colors"
            >
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center space-x-1.5">
                  <Clock className="w-4 h-4 text-amber-500" />
                  <span>Total Reading Time</span>
                </span>
                <span className="text-[10px] text-amber-400 font-mono">7 Days</span>
              </div>
              <div className="space-y-1">
                <div className="text-2xl font-bold text-white font-mono">
                  {formatTime(stats.totalReadingTimeMinutes)}
                </div>
                <div className="text-[11px] text-slate-400 flex items-center justify-between">
                  <span>Today&apos;s session:</span>
                  <span className="font-mono text-amber-400 font-semibold">
                    {formatTime(stats.todayDurationMinutes)}
                  </span>
                </div>
              </div>
            </div>

            {/* 2. Average Words Per Minute */}
            <div
              id="stat-card-avg-wpm"
              className="p-4 rounded-2xl bg-[#16161A] border border-white/10 flex flex-col justify-between hover:border-cyan-500/40 transition-colors"
            >
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center space-x-1.5">
                  <Zap className="w-4 h-4 text-cyan-400" />
                  <span>Average Speed</span>
                </span>
                <span className="text-[10px] text-cyan-400 font-mono">TTS Pace</span>
              </div>
              <div className="space-y-1">
                <div className="text-2xl font-bold text-white font-mono flex items-baseline space-x-1.5">
                  <span>{stats.overallAvgWpm}</span>
                  <span className="text-xs font-normal text-slate-400">WPM</span>
                </div>
                <div className="text-[11px] text-slate-400 flex items-center justify-between">
                  <span>Standard novel pace:</span>
                  <span className="font-mono text-cyan-400 font-semibold">200-250 WPM</span>
                </div>
              </div>
            </div>

            {/* 3. Session Duration Tracking */}
            <div
              id="stat-card-session-duration"
              className="p-4 rounded-2xl bg-[#16161A] border border-white/10 flex flex-col justify-between hover:border-emerald-500/40 transition-colors"
            >
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center space-x-1.5">
                  <Flame className="w-4 h-4 text-emerald-400" />
                  <span>Session Duration</span>
                </span>
                <span className="text-[10px] text-emerald-400 font-mono">
                  {stats.currentStreakDays}d Streak
                </span>
              </div>
              <div className="space-y-1">
                <div className="text-2xl font-bold text-white font-mono">
                  {avgSessionMinutes} mins
                </div>
                <div className="text-[11px] text-slate-400 flex items-center justify-between">
                  <span>Longest focus block:</span>
                  <span className="font-mono text-emerald-400 font-semibold">
                    {stats.longestSessionMinutes} mins
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Recharts Line Chart Progress Visualizer */}
          <div className="p-5 rounded-2xl bg-[#16161A] border border-white/10 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center space-x-2">
                  <BarChart2 className="w-4 h-4 text-amber-500" />
                  <span className="text-sm font-bold text-white">7-Day Reading Progress Curve</span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Daily fluctuations in focus time, words processed, and speech tempo
                </p>
              </div>

              {/* Metric Selector Tabs */}
              <div className="flex items-center space-x-1 bg-white/5 p-1 rounded-xl border border-white/10 self-start sm:self-auto">
                <button
                  id="chart-metric-duration-btn"
                  onClick={() => setSelectedMetric('duration')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    selectedMetric === 'duration'
                      ? 'bg-amber-600 text-black shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Duration (mins)
                </button>
                <button
                  id="chart-metric-words-btn"
                  onClick={() => setSelectedMetric('words')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    selectedMetric === 'words'
                      ? 'bg-emerald-600 text-black shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Words Read
                </button>
                <button
                  id="chart-metric-wpm-btn"
                  onClick={() => setSelectedMetric('wpm')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    selectedMetric === 'wpm'
                      ? 'bg-cyan-600 text-black shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Speed (WPM)
                </button>
              </div>
            </div>

            {/* Recharts Chart Viewport */}
            <div className="h-60 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={stats.dailyStats}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="durationGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="wordsGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="wpmGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>

                  <CartesianGrid strokeDasharray="3 3" stroke="#26262B" vertical={false} />
                  <XAxis
                    dataKey="dayLabel"
                    stroke="#737373"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: '#333' }}
                  />
                  <YAxis
                    stroke="#737373"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: '#333' }}
                    tickFormatter={val =>
                      selectedMetric === 'words' && val >= 1000
                        ? `${(val / 1000).toFixed(1)}k`
                        : val
                    }
                  />
                  <Tooltip content={<CustomTooltip />} />

                  {selectedMetric === 'duration' && (
                    <Area
                      type="monotone"
                      dataKey="durationMinutes"
                      name="Session Duration (mins)"
                      stroke="#f59e0b"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#durationGradient)"
                      activeDot={{ r: 6, stroke: '#f59e0b', strokeWidth: 2, fill: '#ffffff' }}
                    />
                  )}

                  {selectedMetric === 'words' && (
                    <Area
                      type="monotone"
                      dataKey="wordsRead"
                      name="Words Read"
                      stroke="#10b981"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#wordsGradient)"
                      activeDot={{ r: 6, stroke: '#10b981', strokeWidth: 2, fill: '#ffffff' }}
                    />
                  )}

                  {selectedMetric === 'wpm' && (
                    <Area
                      type="monotone"
                      dataKey="wpm"
                      name="Speed (WPM)"
                      stroke="#06b6d4"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#wpmGradient)"
                      activeDot={{ r: 6, stroke: '#06b6d4', strokeWidth: 2, fill: '#ffffff' }}
                    />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Chart Legend / Summary note */}
            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-white/5">
              <div className="flex items-center space-x-2">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{
                    backgroundColor:
                      selectedMetric === 'duration'
                        ? '#f59e0b'
                        : selectedMetric === 'words'
                          ? '#10b981'
                          : '#06b6d4',
                  }}
                />
                <span>
                  Tracking{' '}
                  <strong className="text-white">
                    {selectedMetric === 'duration'
                      ? 'Daily Session Duration (Minutes)'
                      : selectedMetric === 'words'
                        ? 'Total Words Read Daily'
                        : 'Average Words Per Minute'}
                  </strong>
                </span>
              </div>
              <span className="font-mono text-slate-400">
                Peak:{' '}
                {Math.max(
                  ...stats.dailyStats.map(d =>
                    selectedMetric === 'duration'
                      ? d.durationMinutes
                      : selectedMetric === 'words'
                        ? d.wordsRead
                        : d.wpm
                  )
                )}{' '}
                {selectedMetric === 'duration'
                  ? 'mins'
                  : selectedMetric === 'words'
                    ? 'words'
                    : 'WPM'}
              </span>
            </div>
          </div>

          {/* 7-Day Day-by-Day Detailed Breakdown List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-1.5">
                <Calendar className="w-4 h-4 text-amber-500" />
                <span>Daily Log Breakdown</span>
              </h3>
              <span className="text-[11px] text-slate-500 font-mono">
                {stats.totalWordsRead.toLocaleString()} total words across 7 days
              </span>
            </div>

            <div className="grid grid-cols-1 gap-2">
              {stats.dailyStats.map(day => {
                const maxDailyMin = Math.max(...stats.dailyStats.map(d => d.durationMinutes), 1);
                const percent = Math.min(
                  100,
                  Math.round((day.durationMinutes / maxDailyMin) * 100)
                );
                const isToday = day.dayLabel === 'Today';

                return (
                  <div
                    key={day.date}
                    className={`p-3 rounded-xl border flex items-center justify-between text-xs transition-colors ${
                      isToday
                        ? 'bg-amber-500/10 border-amber-500/30'
                        : 'bg-[#16161A] border-white/5 hover:border-white/10'
                    }`}
                  >
                    <div className="flex items-center space-x-3 min-w-[120px]">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-[11px] ${
                          isToday ? 'bg-amber-500 text-black' : 'bg-white/10 text-slate-300'
                        }`}
                      >
                        {day.dayLabel.slice(0, 3)}
                      </div>
                      <div>
                        <div className="font-semibold text-white flex items-center space-x-1.5">
                          <span>{day.dayLabel}</span>
                          {isToday && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 font-mono">
                              Active
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-500">{day.fullDateLabel}</div>
                      </div>
                    </div>

                    {/* Progress Bar in list */}
                    <div className="hidden sm:flex flex-1 max-w-[200px] mx-4 items-center space-x-2">
                      <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
                        <div
                          className="h-full bg-amber-500 rounded-full"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-mono text-slate-500 min-w-[2rem] text-right">
                        {day.durationMinutes}m
                      </span>
                    </div>

                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <div className="font-mono font-bold text-emerald-400">
                          {day.wordsRead.toLocaleString()} words
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">{day.wpm} WPM</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Mascot Companion Encouragement Box */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-600/5 to-transparent border border-amber-500/20 flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="text-xs text-slate-300 leading-relaxed italic">{mascotComment}</div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-white/10 bg-[#16161A]">
          {showResetConfirm ? (
            <div className="flex items-center space-x-2">
              <span className="text-xs text-red-400">Reset 7-day stats?</span>
              <button
                onClick={() => {
                  if (onResetStats) onResetStats();
                  setShowResetConfirm(false);
                }}
                className="px-2.5 py-1 rounded bg-red-600 hover:bg-red-500 text-white text-[11px] font-bold cursor-pointer"
              >
                Yes, Reset
              </button>
              <button
                onClick={() => setShowResetConfirm(false)}
                className="px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-slate-300 text-[11px] cursor-pointer"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowResetConfirm(true)}
              className="text-xs text-slate-500 hover:text-slate-300 flex items-center space-x-1.5 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset Statistics</span>
            </button>
          )}

          <button
            id="done-reading-stats-btn"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 active:scale-95 text-black font-bold text-xs flex items-center space-x-1.5 shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
          >
            <span>Done</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReadingStatsModal;
