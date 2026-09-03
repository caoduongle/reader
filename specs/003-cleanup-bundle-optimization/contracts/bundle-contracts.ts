/**
 * Contracts for Dynamic Code-Splitting and Lazy Loading
 * Feature: 003-cleanup-bundle-optimization
 */

import { Chapter, TTSSettings, ReadingStatsSummary, MascotType } from '../../../src/types';

/**
 * Result returned by file parser functions
 */
export interface ParsedDocumentResult {
  title: string;
  chapters: Chapter[];
  rawText: string;
}

/**
 * Contract for PDF parser loader
 */
export type PdfJsModule = typeof import('pdfjs-dist');

export interface DynamicPdfParserContract {
  /**
   * Lazily resolves and configures the pdfjs-dist module with the local offline worker
   */
  getPdfJs(): Promise<PdfJsModule>;

  /**
   * Parses a PDF file with on-demand chunk resolution and cancellation support
   */
  parsePdfFile(
    file: File,
    onProgress?: (percent: number) => void,
    signal?: AbortSignal
  ): Promise<ParsedDocumentResult>;
}

/**
 * Contract for EPUB parser loader
 */
export type JsZipModule = typeof import('jszip');

export interface DynamicEpubParserContract {
  /**
   * Lazily resolves the JSZip module
   */
  getJsZip(): Promise<any>;

  /**
   * Parses an EPUB file with on-demand chunk resolution and cancellation support
   */
  parseEpubFile(
    file: File,
    signal?: AbortSignal
  ): Promise<ParsedDocumentResult>;
}

/**
 * Props contract for lazy SettingsModal
 */
export interface SettingsModalLazyProps {
  isOpen: boolean;
  onClose: () => void;
  settings: TTSSettings;
  voices: SpeechSynthesisVoice[];
  rvcServerStatus: 'checking' | 'running' | 'offline' | 'error';
  serverErrorMessage?: string;
  onCheckRVCHealth: () => void;
  onSaveSettings: (newSettings: TTSSettings) => void;
  onTestVoice: () => void;
}

/**
 * Props contract for lazy ReadingStatsModal
 */
export interface ReadingStatsModalLazyProps {
  isOpen: boolean;
  onClose: () => void;
  stats: ReadingStatsSummary;
  mascotType: MascotType;
  onResetStats: () => void;
}
