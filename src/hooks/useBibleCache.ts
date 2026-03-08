import { BIBLE_BOOKS } from '@/data/bibleData';
import { fetchChapter, type ChapterResponse } from '@/hooks/useBibleApi';

const DB_NAME = 'holyword-bible-cache';
const DB_VERSION = 1;
const STORE_NAME = 'chapters';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function cacheKey(book: string, chapter: number, translation: string) {
  return `${translation}::${book}::${chapter}`;
}

export async function getCachedChapter(book: string, chapter: number, translation: string): Promise<ChapterResponse | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(cacheKey(book, chapter, translation));
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

export async function cacheChapter(book: string, chapter: number, translation: string, data: ChapterResponse): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(data, cacheKey(book, chapter, translation));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // silently fail
  }
}

/** Fetch with cache-first strategy */
export async function fetchChapterCached(book: string, chapter: number, translation: string): Promise<ChapterResponse> {
  const cached = await getCachedChapter(book, chapter, translation);
  if (cached) return cached;

  const data = await fetchChapter(book, chapter, translation);
  await cacheChapter(book, chapter, translation, data);
  return data;
}

/** Get total chapter count for a translation */
export function getTotalChapters(): number {
  return BIBLE_BOOKS.reduce((sum, b) => sum + b.chapters, 0);
}

/** Check how many chapters are cached for a translation */
export async function getCachedCount(translation: string): Promise<number> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAllKeys();
      req.onsuccess = () => {
        const keys = req.result as string[];
        const count = keys.filter(k => k.startsWith(`${translation}::`)).length;
        resolve(count);
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return 0;
  }
}

export interface DownloadProgress {
  downloaded: number;
  total: number;
  currentBook: string;
  done: boolean;
  error?: string;
}

/** Download all chapters for a translation, calling onProgress for each */
export async function downloadAllChapters(
  translation: string,
  onProgress: (p: DownloadProgress) => void,
  signal?: AbortSignal
): Promise<void> {
  const total = getTotalChapters();
  let downloaded = 0;

  for (const book of BIBLE_BOOKS) {
    for (let ch = 1; ch <= book.chapters; ch++) {
      if (signal?.aborted) return;

      // Skip if already cached
      const cached = await getCachedChapter(book.name, ch, translation);
      if (cached) {
        downloaded++;
        continue;
      }

      try {
        const data = await fetchChapter(book.name, ch, translation);
        await cacheChapter(book.name, ch, translation, data);
        downloaded++;
        onProgress({ downloaded, total, currentBook: book.name, done: false });
      } catch (err) {
        // retry once
        try {
          await new Promise(r => setTimeout(r, 1000));
          const data = await fetchChapter(book.name, ch, translation);
          await cacheChapter(book.name, ch, translation, data);
          downloaded++;
          onProgress({ downloaded, total, currentBook: book.name, done: false });
        } catch {
          downloaded++;
          onProgress({ downloaded, total, currentBook: book.name, done: false, error: `Failed: ${book.name} ${ch}` });
        }
      }

      // Small delay to avoid hammering the API
      await new Promise(r => setTimeout(r, 100));
    }
  }

  onProgress({ downloaded: total, total, currentBook: '', done: true });
}

/** Clear all cached data for a translation */
export async function clearCache(translation: string): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAllKeys();
    req.onsuccess = () => {
      const keys = req.result as string[];
      keys.filter(k => k.startsWith(`${translation}::`)).forEach(k => store.delete(k));
    };
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // silently fail
  }
}
