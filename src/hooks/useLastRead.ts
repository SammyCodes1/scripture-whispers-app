import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useCallback } from 'react';

export interface LastReadPosition {
  book: string;
  chapter: number;
  timestamp: number;
  scrollY?: number;
}

const STORAGE_KEY = 'hw-last-read';

export function useLastRead() {
  const [lastRead, setLastRead] = useLocalStorage<LastReadPosition | null>(STORAGE_KEY, null);

  const savePosition = useCallback(
    (book: string, chapter: number, scrollY?: number) => {
      setLastRead({ book, chapter, timestamp: Date.now(), scrollY });
    },
    [setLastRead]
  );

  const clearPosition = useCallback(() => {
    setLastRead(null);
  }, [setLastRead]);

  return { lastRead, savePosition, clearPosition };
}
