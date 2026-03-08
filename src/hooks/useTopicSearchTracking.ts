import { useLocalStorage } from './useLocalStorage';
import { useCallback, useMemo } from 'react';

interface SearchEntry {
  query: string;
  count: number;
  lastSearched: number;
}

export function useTopicSearchTracking() {
  const [searches, setSearches] = useLocalStorage<SearchEntry[]>('hw-topic-searches', []);

  const trackSearch = useCallback((query: string) => {
    const q = query.toLowerCase().trim();
    if (!q || q.length < 2) return;

    setSearches(prev => {
      const existing = prev.find(s => s.query === q);
      if (existing) {
        return prev.map(s =>
          s.query === q ? { ...s, count: s.count + 1, lastSearched: Date.now() } : s
        );
      }
      return [...prev, { query: q, count: 1, lastSearched: Date.now() }];
    });
  }, [setSearches]);

  const topSearches = useMemo(() => {
    return [...searches]
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [searches]);

  const clearSearchHistory = useCallback(() => {
    setSearches([]);
  }, [setSearches]);

  return { trackSearch, topSearches, clearSearchHistory };
}
