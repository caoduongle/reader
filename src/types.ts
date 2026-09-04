export type ThemeMode = 'light' | 'dark' | 'sepia' | 'forest' | 'midnight' | 'paper';

export type FontFamily = 'sans' | 'lora' | 'merriweather' | 'mono' | 'playfair';

export type HighlightStyle =
  'soft-gold' | 'neon-glow' | 'emerald' | 'underlined' | 'lilac' | 'amber-box';

export type MascotType = 'fox' | 'owl' | 'bot' | 'cat' | 'bunny' | 'dragon';

export type MascotMood = 'idle' | 'reading' | 'paused' | 'happy' | 'celebrate';

export interface TTSVoiceOption {
  voiceURI: string;
  name: string;
  lang: string;
  default: boolean;
  localService: boolean;
  genderGuess?: 'Male' | 'Female' | 'Neutral';
  displayName: string;
}

export type TTSProvider = 'browser' | 'rvc-local';

export type RVCServerStatus = 'unknown' | 'checking' | 'connected' | 'unreachable';

export interface TTSSettings {
  ttsProvider: TTSProvider;
  rvcServerUrl: string;
  voiceURI: string;
  rate: number; // 0.5 to 3.0
  pitch: number; // 0.5 to 2.0
  volume: number; // 0 to 1.0
  highlightStyle: HighlightStyle;
  autoScroll: boolean;
  continuousReading: boolean;
  mascotEnabled: boolean;
  mascotType: MascotType;
  mascotBounceAnimation: boolean;
  mascotBlinkAnimation: boolean;
  mascotFloatingAnimation: boolean;
  mascotSpeechBubble: boolean;
  fontSize: number; // 14 to 32
  lineHeight: number; // 1.4 to 2.4
  contentWidth: 'narrow' | 'medium' | 'wide' | 'full';
  fontFamily: FontFamily;
  theme: ThemeMode;
}

export interface BookmarkItem {
  id: string;
  documentId: string;
  chapterIndex: number;
  chapterTitle: string;
  sentenceIndex: number;
  snippet: string;
  note?: string;
  createdAt: number;
}

export interface SentenceItem {
  id: string;
  globalIndex: number;
  paragraphIndex: number;
  sentenceIndex: number;
  text: string;
}

export interface ParagraphItem {
  id: string;
  paragraphIndex: number;
  sentences: SentenceItem[];
  rawText: string;
}

export interface Chapter {
  id: string;
  title: string;
  paragraphs: ParagraphItem[];
  totalSentences: number;
  wordCount: number;
  htmlContent?: string;
}

export interface DocumentItem {
  id: string;
  title: string;
  author?: string;
  format: 'txt' | 'pdf' | 'epub' | 'pasted' | 'sample' | 'url' | 'screen-capture';
  chapters: Chapter[];
  createdAt: number;
  lastRead: {
    chapterIndex: number;
    sentenceIndex: number;
    progressPercentage: number;
    updatedAt: number;
  };
  totalWords: number;
  totalSentences: number;
}

export interface SearchMatch {
  chapterIndex: number;
  paragraphIndex: number;
  sentenceIndex: number;
  globalIndex: number;
  text: string;
  matchSnippet: string;
}

export interface DailyReadingStat {
  date: string; // 'YYYY-MM-DD'
  dayLabel: string; // 'Mon', 'Tue', 'Wed', etc.
  fullDateLabel: string; // 'Aug 25, 2026'
  durationMinutes: number; // total minutes read that day
  wordsRead: number; // total words read that day
  wpm: number; // avg words per minute that day
  sessionsCount: number;
}

export interface ReadingSessionRecord {
  id: string;
  timestamp: number;
  documentTitle: string;
  chapterTitle: string;
  durationSeconds: number;
  wordsRead: number;
  wpm: number;
}

export interface ReadingStatsSummary {
  totalReadingTimeMinutes: number;
  totalWordsRead: number;
  overallAvgWpm: number;
  todayDurationMinutes: number;
  todayWordsRead: number;
  currentStreakDays: number;
  longestSessionMinutes: number;
  totalSessions: number;
  dailyStats: DailyReadingStat[]; // last 7 days (chronological order)
  recentSessions: ReadingSessionRecord[];
}

export interface FetchUrlSuccessResponse {
  ok: true;
  title: string;
  content: string;
  byline?: string;
  siteName?: string;
}

export interface FetchUrlErrorResponse {
  ok: false;
  error: string;
}

export type FetchUrlResponse = FetchUrlSuccessResponse | FetchUrlErrorResponse;

export interface ScreenReaderBridge {
  onClipboardCaptured: (callback: (text: string) => void) => () => void;
  removeClipboardListener: () => void;
}

export interface VoxReadDesktopBridge {
  isDesktop: boolean;
  platform: string;
  screenReader?: ScreenReaderBridge;
}

declare global {
  interface Window {
    voxreadDesktop?: VoxReadDesktopBridge;
  }
}

