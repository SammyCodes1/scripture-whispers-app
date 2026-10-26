import { useEffect } from 'react';
import { startLibrarySync, stopLibrarySync } from '@/lib/verseLibrarySync';

export function VerseLibrarySync() {
  useEffect(() => {
    startLibrarySync();
    return () => stopLibrarySync();
  }, []);
  return null;
}
