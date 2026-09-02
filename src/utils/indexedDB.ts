import { DocumentItem } from '../types';

const DB_NAME = 'voxread_db';
const DB_VERSION = 1;
const DOC_STORE = 'documents';
const META_STORE = 'metadata';
const ACTIVE_DOC_KEY = 'active_document_id';

/**
 * Opens or initializes the native IndexedDB instance for VoxRead.
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB is not supported in this environment'));
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(DOC_STORE)) {
        db.createObjectStore(DOC_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE, { keyPath: 'key' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Failed to open IndexedDB'));
  });
}

/**
 * Saves a full document item into IndexedDB.
 */
export async function saveDocument(doc: DocumentItem): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([DOC_STORE, META_STORE], 'readwrite');
      const docStore = tx.objectStore(DOC_STORE);
      const metaStore = tx.objectStore(META_STORE);

      docStore.put(doc);
      metaStore.put({ key: ACTIVE_DOC_KEY, value: doc.id });

      tx.oncomplete = () => resolve();
      tx.onerror = () => {
        console.warn('[VoxRead IndexedDB] Failed to save document:', tx.error);
        reject(tx.error);
      };
    });
  } catch (error) {
    console.warn('[VoxRead IndexedDB] Error opening database to save document:', error);
  }
}

/**
 * Retrieves a document by its ID.
 */
export async function getDocument(id: string): Promise<DocumentItem | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(DOC_STORE, 'readonly');
      const store = tx.objectStore(DOC_STORE);
      const req = store.get(id);

      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => {
        console.warn('[VoxRead IndexedDB] Failed to get document:', req.error);
        reject(req.error);
      };
    });
  } catch (error) {
    console.warn('[VoxRead IndexedDB] Error opening database to get document:', error);
    return null;
  }
}

/**
 * Retrieves the currently active document ID.
 */
export async function getActiveDocumentId(): Promise<string | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(META_STORE, 'readonly');
      const store = tx.objectStore(META_STORE);
      const req = store.get(ACTIVE_DOC_KEY);

      req.onsuccess = () => resolve(req.result ? req.result.value : null);
      req.onerror = () => {
        console.warn('[VoxRead IndexedDB] Failed to get active doc ID:', req.error);
        reject(req.error);
      };
    });
  } catch (error) {
    console.warn('[VoxRead IndexedDB] Error reading active document ID:', error);
    return null;
  }
}

/**
 * Sets the active document ID in the metadata store.
 */
export async function setActiveDocumentId(id: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(META_STORE, 'readwrite');
      const store = tx.objectStore(META_STORE);
      store.put({ key: ACTIVE_DOC_KEY, value: id });

      tx.oncomplete = () => resolve();
      tx.onerror = () => {
        console.warn('[VoxRead IndexedDB] Failed to set active doc ID:', tx.error);
        reject(tx.error);
      };
    });
  } catch (error) {
    console.warn('[VoxRead IndexedDB] Error updating active document ID:', error);
  }
}

/**
 * Retrieves the most recently active document from IndexedDB.
 */
export async function getActiveDocument(): Promise<DocumentItem | null> {
  try {
    const activeId = await getActiveDocumentId();
    if (!activeId) return null;
    return await getDocument(activeId);
  } catch (error) {
    console.warn('[VoxRead IndexedDB] Error getting active document:', error);
    return null;
  }
}

/**
 * Deletes a document from IndexedDB by ID.
 */
export async function deleteDocument(id: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(DOC_STORE, 'readwrite');
      const store = tx.objectStore(DOC_STORE);
      store.delete(id);

      tx.oncomplete = () => resolve();
      tx.onerror = () => {
        console.warn('[VoxRead IndexedDB] Failed to delete document:', tx.error);
        reject(tx.error);
      };
    });
  } catch (error) {
    console.warn('[VoxRead IndexedDB] Error opening database to delete document:', error);
  }
}

/**
 * Clears all documents and resets the database.
 */
export async function clearAllDocuments(): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([DOC_STORE, META_STORE], 'readwrite');
      tx.objectStore(DOC_STORE).clear();
      tx.objectStore(META_STORE).clear();

      tx.oncomplete = () => resolve();
      tx.onerror = () => {
        console.warn('[VoxRead IndexedDB] Failed to clear database:', tx.error);
        reject(tx.error);
      };
    });
  } catch (error) {
    console.warn('[VoxRead IndexedDB] Error clearing database:', error);
  }
}
