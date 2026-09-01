/**
 * TTS Contract Definitions
 * Feature: 001-rvc-tts-desktop
 */

import { SentenceItem, TTSVoiceOption, TTSSettings } from '../../../src/types';

export type TTSProvider = 'browser' | 'rvc-local';

export type RVCServerStatus = 'unknown' | 'checking' | 'connected' | 'unreachable';

export interface UseTTSReturn {
  // State
  voices: TTSVoiceOption[];
  settings: TTSSettings;
  isPlaying: boolean;
  isPaused: boolean;
  currentSentenceIndex: number;
  currentWordCharIndex: number | null;
  rvcServerStatus: RVCServerStatus;

  // Actions
  updateSettings: (newSettings: Partial<TTSSettings>) => void;
  play: (index?: number) => void;
  pause: () => void;
  resume: () => void;
  togglePlay: () => void;
  stop: () => void;
  nextSentence: () => void;
  prevSentence: () => void;
  jumpToSentence: (index: number, shouldPlay?: boolean) => void;
  jumpToParagraph: (paragraphIndex: number, shouldPlay?: boolean) => void;
  testVoice: (voiceURI: string, rate: number, pitch: number, volume: number, testText?: string) => void;
  checkRVCServerHealth: () => Promise<boolean>;
}

export interface AudioPrefetchEntry {
  sentenceIndex: number;
  blobUrl: string;
  abortController: AbortController;
}
