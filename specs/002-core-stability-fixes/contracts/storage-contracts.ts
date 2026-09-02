/**
 * Interface contracts for decoupled storage and reading position persistence.
 */

import { DocumentItem } from '../../../src/types';

export interface StoredReadingPosition {
  documentId: string;
  chapterIndex: number;
  sentenceIndex: number;
  progressPercentage: number;
  updatedAt: number;
}

export interface IReadingPositionStorage {
  /**
   * Saves lightweight reading coordinates to localStorage.
   * Emits console warning and invokes onQuotaExceeded if write fails.
   */
  savePosition(position: StoredReadingPosition, onQuotaExceeded?: () => void): boolean;

  /**
   * Retrieves saved reading position or null if none exists.
   */
  getPosition(): StoredReadingPosition | null;

  /**
   * Clears saved reading position from storage.
   */
  clearPosition(): void;
}

export interface IDocumentStorage {
  /**
   * Saves a full document into durable IndexedDB storage.
   */
  saveDocument(doc: DocumentItem): Promise<void>;

  /**
   * Retrieves a document by its unique ID from IndexedDB.
   */
  getDocument(id: string): Promise<DocumentItem | null>;

  /**
   * Retrieves the most recently active document from IndexedDB.
   */
  getActiveDocument(): Promise<DocumentItem | null>;

  /**
   * Sets the active document ID in storage.
   */
  setActiveDocumentId(id: string): Promise<void>;

  /**
   * Removes a document from IndexedDB by ID.
   */
  deleteDocument(id: string): Promise<void>;

  /**
   * Clears all documents and resets storage.
   */
  clearAllDocuments(): Promise<void>;
}
