import { BIBLE_BOOKS } from '@/data/bibleData';
import { fetchChapter, type ChapterResponse, type BibleVerse } from '@/hooks/useBibleApi';
import { isLicensedVersion } from '@/lib/bibleVersions';

const DB_NAME = 'holyword-bible-cache';
const DB_VERSION = 1;
const STORE_NAME = 'chapters';

// Bump this version whenever content/API changes are made.
// Users with an older cached version will have their cache cleared automatically.
const CONTENT_VERSION = '2026-04-01-v3';
const CONTENT_VERSION_KEY = 'hw-cache-content-version';

/** Check and invalidate stale offline cache on app start */
export async function invalidateStaleCacheIfNeeded(): Promise<void> {
  try {
    const stored = localStorage.getItem(CONTENT_VERSION_KEY);
    if (stored === CONTENT_VERSION) return; // up to date

    // Version mismatch — clear entire IndexedDB store
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).clear();
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });

    localStorage.setItem(CONTENT_VERSION_KEY, CONTENT_VERSION);
    console.log('[Cache] Stale offline cache cleared — new content version:', CONTENT_VERSION);
  } catch {
    // If anything fails, just update the key so we don't loop
    try { localStorage.setItem(CONTENT_VERSION_KEY, CONTENT_VERSION); } catch {}
  }
}

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

// Licensed text (AMP, NIV, NKJV) is never written to IndexedDB / offline storage.
// It is only held in memory for a short time; the server keeps the (<=14 day) cache.
const LICENSED_MEMORY_TTL_MS = 30 * 60 * 1000;
const licensedMemory = new Map<string, { data: ChapterResponse; at: number }>();

/** Fetch with cache-first strategy */
export async function fetchChapterCached(book: string, chapter: number, translation: string): Promise<ChapterResponse> {
  if (isLicensedVersion(translation)) {
    const key = cacheKey(book, chapter, translation);
    const hit = licensedMemory.get(key);
    if (hit && Date.now() - hit.at < LICENSED_MEMORY_TTL_MS) return hit.data;
    const data = await fetchChapter(book, chapter, translation);
    // Don't remember automatic fallbacks, so the licensed version is retried next time.
    if (!data.fallback) licensedMemory.set(key, { data, at: Date.now() });
    return data;
  }
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

/** Check if a translation is fully downloaded */
export async function isFullyDownloaded(translation: string): Promise<boolean> {
  const count = await getCachedCount(translation);
  return count >= getTotalChapters();
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
  if (isLicensedVersion(translation)) {
    throw new Error('Licensed versions cannot be downloaded for offline use.');
  }
  const total = getTotalChapters();
  let downloaded = 0;
  const BATCH_SIZE = 15;

  // Build flat list of all chapters
  const allChapters: { book: string; chapter: number }[] = [];
  for (const book of BIBLE_BOOKS) {
    for (let ch = 1; ch <= book.chapters; ch++) {
      allChapters.push({ book: book.name, chapter: ch });
    }
  }

  // Process in parallel batches
  for (let i = 0; i < allChapters.length; i += BATCH_SIZE) {
    if (signal?.aborted) return;

    const batch = allChapters.slice(i, i + BATCH_SIZE);
    await Promise.allSettled(
      batch.map(async ({ book, chapter }) => {
        // Skip if already cached
        const cached = await getCachedChapter(book, chapter, translation);
        if (cached) return;

        try {
          const data = await fetchChapter(book, chapter, translation);
          await cacheChapter(book, chapter, translation, data);
        } catch {
          // retry once
          try {
            const data = await fetchChapter(book, chapter, translation);
            await cacheChapter(book, chapter, translation, data);
          } catch {
            // skip failed chapter
          }
        }
      })
    );

    downloaded += batch.length;
    const lastBook = batch[batch.length - 1].book;
    onProgress({ downloaded: Math.min(downloaded, total), total, currentBook: lastBook, done: false });
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

/** Search through all cached chapters for a translation */
export interface OfflineSearchResult {
  reference: string;
  book_name: string;
  chapter: number;
  verse: number;
  text: string;
}

export async function searchCachedBible(
  query: string,
  translation: string,
  limit: number = 50
): Promise<{ results: OfflineSearchResult[]; count: number }> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);

    const allKeys: IDBValidKey[] = await new Promise((resolve, reject) => {
      const req = store.getAllKeys();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

    const translationKeys = (allKeys as string[]).filter(k => k.startsWith(`${translation}::`));
    const lowerQuery = query.toLowerCase();
    const words = lowerQuery.split(/\s+/).filter(Boolean);
    const results: OfflineSearchResult[] = [];
    let totalCount = 0;

    // Process in batches to avoid blocking UI
    for (const key of translationKeys) {
      const chapter: ChapterResponse = await new Promise((resolve, reject) => {
        const req2 = store.get(key);
        req2.onsuccess = () => resolve(req2.result);
        req2.onerror = () => reject(req2.error);
      });

      if (!chapter?.verses) continue;

      for (const verse of chapter.verses) {
        const lowerText = verse.text.toLowerCase();
        const matches = words.every(w => lowerText.includes(w));
        if (matches) {
          totalCount++;
          if (results.length < limit) {
            results.push({
              reference: `${verse.book_name} ${verse.chapter}:${verse.verse}`,
              book_name: verse.book_name,
              chapter: verse.chapter,
              verse: verse.verse,
              text: verse.text,
            });
          }
        }
      }
    }

    return { results, count: totalCount };
  } catch {
    return { results: [], count: 0 };
  }
}
