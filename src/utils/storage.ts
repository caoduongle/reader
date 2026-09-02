export const READING_POSITION_STORAGE_KEY = 'voxread_reading_position_v1';
export const LEGACY_ACTIVE_DOC_KEY = 'voxread_active_document_v1';

export interface StoredReadingPosition {
  documentId: string;
  chapterIndex: number;
  sentenceIndex: number;
  progressPercentage: number;
  updatedAt: number;
}

/**
 * Saves lightweight reading coordinates (~250 bytes) into localStorage.
 * Invokes onQuotaError if browser quota is exceeded.
 */
export function saveReadingPosition(
  position: StoredReadingPosition,
  onQuotaError?: () => void
): boolean {
  try {
    localStorage.setItem(READING_POSITION_STORAGE_KEY, JSON.stringify(position));
    return true;
  } catch (error: unknown) {
    console.warn('[VoxRead Storage] Failed to save reading position:', error);

    const isQuotaError =
      error instanceof DOMException &&
      (error.name === 'QuotaExceededError' ||
        error.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
        error.code === 22 ||
        error.code === 1014);

    if (isQuotaError && onQuotaError) {
      try {
        onQuotaError();
      } catch {
        // Prevent notification failure from crashing
      }
    }
    return false;
  }
}

/**
 * Retrieves the stored reading position from localStorage, or null if none exists.
 */
export function getReadingPosition(): StoredReadingPosition | null {
  try {
    const raw = localStorage.getItem(READING_POSITION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      typeof parsed.documentId === 'string' &&
      typeof parsed.chapterIndex === 'number' &&
      typeof parsed.sentenceIndex === 'number'
    ) {
      return parsed as StoredReadingPosition;
    }
    return null;
  } catch (error) {
    console.warn('[VoxRead Storage] Failed to parse reading position:', error);
    return null;
  }
}

/**
 * Clears stored reading position from localStorage.
 */
export function clearReadingPosition(): void {
  try {
    localStorage.removeItem(READING_POSITION_STORAGE_KEY);
  } catch (error) {
    console.warn('[VoxRead Storage] Failed to remove reading position key:', error);
  }
}
