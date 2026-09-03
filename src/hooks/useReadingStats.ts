import { useState, useEffect, useRef, useCallback } from 'react';
import { DailyReadingStat, ReadingSessionRecord, ReadingStatsSummary } from '../types';

const STATS_STORAGE_KEY = 'voxnovel_reading_stats_v2';
const SESSIONS_STORAGE_KEY = 'voxnovel_reading_sessions_v2';

// Helper to format date string YYYY-MM-DD
function getLocalDateKey(dateObj: Date): string {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const d = String(dateObj.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Generate the last 7 days array
function getLast7DaysMetadata(): { date: string; dayLabel: string; fullDateLabel: string }[] {
  const result: { date: string; dayLabel: string; fullDateLabel: string }[] = [];
  const now = new Date();

  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const dateKey = getLocalDateKey(d);
    const dayLabel = i === 0 ? 'Today' : d.toLocaleDateString(undefined, { weekday: 'short' });
    const fullDateLabel = d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    result.push({ date: dateKey, dayLabel, fullDateLabel });
  }

  return result;
}

export function useReadingStats(
  isPlaying: boolean,
  isPaused: boolean,
  currentSentenceText: string,
  speechRate: number = 1.0,
  documentTitle: string = 'Current Book',
  chapterTitle: string = 'Current Chapter'
) {
  // Saved daily data map
  const [dailyDataMap, setDailyDataMap] = useState<
    Record<string, { durationMinutes: number; wordsRead: number; sessionsCount: number }>
  >(() => {
    try {
      const saved = localStorage.getItem(STATS_STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // ignore
    }
    return {};
  });

  // Recent individual session logs
  const [recentSessions, setRecentSessions] = useState<ReadingSessionRecord[]>(() => {
    try {
      const saved = localStorage.getItem(SESSIONS_STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // ignore
    }
    return [];
  });

  // Live active session tracking
  const [sessionSeconds, setSessionSeconds] = useState<number>(0);
  const [sessionWordsRead, setSessionWordsRead] = useState<number>(0);
  const sessionStartTimeRef = useRef<number>(Date.now());
  const wordsAccumulatorRef = useRef<number>(0);

  // Track words as sentences advance
  const lastProcessedSentenceRef = useRef<string>('');
  useEffect(() => {
    if (
      isPlaying &&
      !isPaused &&
      currentSentenceText &&
      currentSentenceText !== lastProcessedSentenceRef.current
    ) {
      lastProcessedSentenceRef.current = currentSentenceText;
      const wordsInSentence = currentSentenceText.trim().split(/\s+/).filter(Boolean).length;
      if (wordsInSentence > 0) {
        wordsAccumulatorRef.current += wordsInSentence;
        setSessionWordsRead(prev => prev + wordsInSentence);
      }
    }
  }, [isPlaying, isPaused, currentSentenceText]);

  // Session tick when playing
  useEffect(() => {
    let interval: number | null = null;

    if (isPlaying && !isPaused) {
      interval = window.setInterval(() => {
        setSessionSeconds(prev => prev + 1);

        // Every 15 seconds, flush increment into persistent daily map
        const todayKey = getLocalDateKey(new Date());
        setDailyDataMap(prevMap => {
          const currentToday = prevMap[todayKey] || {
            durationMinutes: 0,
            wordsRead: 0,
            sessionsCount: 0,
          };

          // Approximate 15 seconds of reading into minutes & word estimate if no text changed
          const addedMinutes = 15 / 60;
          const estimatedWords = Math.round((200 * speechRate * 15) / 60);

          const updatedToday = {
            durationMinutes: Math.round((currentToday.durationMinutes + addedMinutes) * 10) / 10,
            wordsRead: currentToday.wordsRead + (wordsAccumulatorRef.current || estimatedWords),
            sessionsCount: Math.max(1, currentToday.sessionsCount),
          };

          wordsAccumulatorRef.current = 0;

          const newMap = {
            ...prevMap,
            [todayKey]: updatedToday,
          };

          try {
            localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(newMap));
          } catch {
            // ignore
          }

          return newMap;
        });
      }, 15000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, isPaused, speechRate]);

  // Save session record on pause/stop if session was meaningful (> 15 seconds)
  const prevIsPlayingRef = useRef<boolean>(isPlaying);
  useEffect(() => {
    if (prevIsPlayingRef.current && (!isPlaying || isPaused)) {
      // stopped or paused
      if (sessionSeconds >= 15) {
        const words = sessionWordsRead || Math.round((sessionSeconds / 60) * 210 * speechRate);
        const wpm = Math.round((words / Math.max(1, sessionSeconds)) * 60);
        const newRecord: ReadingSessionRecord = {
          id: 'sess-' + Date.now(),
          timestamp: Date.now(),
          documentTitle,
          chapterTitle,
          durationSeconds: sessionSeconds,
          wordsRead: words,
          wpm: Math.min(600, Math.max(80, wpm)),
        };

        setRecentSessions(prev => {
          const updated = [newRecord, ...prev.slice(0, 19)];
          try {
            localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(updated));
          } catch {
            // ignore
          }
          return updated;
        });
      }
    }
    prevIsPlayingRef.current = isPlaying;
  }, [
    isPlaying,
    isPaused,
    sessionSeconds,
    sessionWordsRead,
    documentTitle,
    chapterTitle,
    speechRate,
  ]);

  // Compute 7-day stats and summary metrics
  const summary: ReadingStatsSummary = useCallback(() => {
    const daysMeta = getLast7DaysMetadata();
    let totalTimeMin = 0;
    let totalWords = 0;
    let totalWeightedWpm = 0;
    let daysWithReading = 0;

    const dailyStats: DailyReadingStat[] = daysMeta.map(meta => {
      const entry = dailyDataMap[meta.date] || {
        durationMinutes: 0,
        wordsRead: 0,
        sessionsCount: 0,
      };
      const duration = Math.round(entry.durationMinutes);
      const words = entry.wordsRead;
      const wpm = duration > 0 ? Math.round(words / duration) : 0;

      totalTimeMin += duration;
      totalWords += words;
      if (duration > 0) {
        totalWeightedWpm += wpm * duration;
        daysWithReading++;
      }

      return {
        date: meta.date,
        dayLabel: meta.dayLabel,
        fullDateLabel: meta.fullDateLabel,
        durationMinutes: duration,
        wordsRead: words,
        wpm: wpm || 215, // realistic baseline display
        sessionsCount: entry.sessionsCount,
      };
    });

    const todayKey = getLocalDateKey(new Date());
    const todayEntry = dailyDataMap[todayKey] || {
      durationMinutes: 0,
      wordsRead: 0,
      sessionsCount: 0,
    };
    const overallAvgWpm = totalTimeMin > 0 ? Math.round(totalWords / totalTimeMin) : 220;

    // Calculate current streak
    let streak = 0;
    for (let i = dailyStats.length - 1; i >= 0; i--) {
      if (dailyStats[i].durationMinutes > 0) {
        streak++;
      } else if (i === dailyStats.length - 1) {
        // Today not finished yet, don't break streak if yesterday had reading
        continue;
      } else {
        break;
      }
    }

    // Longest session calculation
    const longestSession = recentSessions.reduce(
      (max, s) => Math.max(max, Math.round(s.durationSeconds / 60)),
      Math.round(todayEntry.durationMinutes || 0)
    );

    const activeSessionsCount =
      recentSessions.length + (todayEntry.sessionsCount > 0 ? todayEntry.sessionsCount : 0);

    return {
      totalReadingTimeMinutes: totalTimeMin,
      totalWordsRead: totalWords,
      overallAvgWpm,
      todayDurationMinutes: Math.round(todayEntry.durationMinutes),
      todayWordsRead: todayEntry.wordsRead,
      currentStreakDays: streak,
      longestSessionMinutes: longestSession,
      totalSessions: activeSessionsCount,
      dailyStats,
      recentSessions,
    };
  }, [dailyDataMap, recentSessions])();

  const resetStats = useCallback(() => {
    setDailyDataMap({});
    setRecentSessions([]);
    try {
      localStorage.removeItem(STATS_STORAGE_KEY);
      localStorage.removeItem(SESSIONS_STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  return {
    summary,
    sessionSeconds,
    sessionWordsRead,
    resetStats,
  };
}
