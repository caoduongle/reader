/**
 * Interface contracts for cancelable and guarded document parsers.
 */

import { Chapter } from '../../../src/types';

export interface ParseOptions {
  /** Optional callback for tracking parsing progress (0 - 100) */
  onProgress?: (percent: number) => void;
  /** Optional abort signal to cancel parsing cooperatively */
  signal?: AbortSignal;
}

export interface ParseResult {
  title: string;
  author?: string;
  chapters: Chapter[];
  rawText: string;
}

export interface IFileParser {
  /**
   * Maximum allowed file size in Megabytes and Bytes.
   */
  MAX_FILE_SIZE_MB: number; // 100
  MAX_FILE_SIZE_BYTES: number; // 100 * 1024 * 1024

  /**
   * Validates if file size is within acceptable limits.
   * Throws Error if file exceeds MAX_FILE_SIZE_BYTES.
   */
  validateFileSize(file: File): void;

  /**
   * Parses TXT / Markdown file.
   */
  parseTxtFile(file: File, options?: ParseOptions): Promise<ParseResult>;

  /**
   * Parses PDF file using local worker, supporting progress reporting and cancellation.
   */
  parsePdfFile(file: File, options?: ParseOptions): Promise<ParseResult>;

  /**
   * Parses EPUB file using JSZip, supporting progress reporting and cancellation.
   */
  parseEpubFile(file: File, options?: ParseOptions): Promise<ParseResult>;
}
