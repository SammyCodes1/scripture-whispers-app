import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useCallback, useMemo } from 'react';
import { BIBLE_BOOKS } from '@/data/bibleData';

export interface ChapterReadEntry {
  book: string;
  chapter: number;
  timestamp: number; // epoch ms
}

const STORAGE_KEY = 'hw-chapter-history';

export function useReadingHistory() {
  const [history, setHistory] = useLocalStorage<ChapterReadEntry[]>(STORAGE_KEY, []);

  const recordChapter = useCallback((book: string, chapter: number) => {
    setHistory(prev => {
      // Avoid duplicate for same session (same book+chapter within last 60s)
      const now = Date.now();
      const isDuplicate = prev.some(
        e => e.book === book && e.chapter === chapter && now - e.timestamp < 60_000
      );
      if (isDuplicate) return prev;
      return [...prev, { book, chapter, timestamp: now }];
    });
  }, [setHistory]);

  /** Set of "book::chapter" keys that have been read */
  const readChapters = useMemo(() => {
    const set = new Set<string>();
    for (const e of history) {
      set.add(`${e.book}::${e.chapter}`);
    }
    return set;
  }, [history]);

  /** Per-book stats */
  const bookStats = useMemo(() => {
    const map: Record<string, { read: number; total: number }> = {};
    for (const b of BIBLE_BOOKS) {
      const read = Array.from({ length: b.chapters }, (_, i) => i + 1)
        .filter(ch => readChapters.has(`${b.name}::${ch}`)).length;
      map[b.name] = { read, total: b.chapters };
    }
    return map;
  }, [readChapters]);

  /** Overall Bible completion */
  const totalChapters = useMemo(() => BIBLE_BOOKS.reduce((s, b) => s + b.chapters, 0), []);
  const totalRead = useMemo(() => {
    let count = 0;
    for (const b of BIBLE_BOOKS) {
      count += bookStats[b.name]?.read || 0;
    }
    return count;
  }, [bookStats]);
  const completionPct = totalChapters > 0 ? Math.round((totalRead / totalChapters) * 100) : 0;

  /** Recent reading history (last 20, newest first) */
  const recentHistory = useMemo(() => {
    return [...history].sort((a, b) => b.timestamp - a.timestamp).slice(0, 20);
  }, [history]);

  /** Check if a specific chapter was read */
  const isChapterRead = useCallback((book: string, chapter: number) => {
    return readChapters.has(`${book}::${chapter}`);
  }, [readChapters]);

  return {
    history,
    recordChapter,
    readChapters,
    bookStats,
    totalChapters,
    totalRead,
    completionPct,
    recentHistory,
    isChapterRead,
  };
}
