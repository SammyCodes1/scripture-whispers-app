import { useState } from 'react';
import { Search, Loader2, WifiOff } from 'lucide-react';
import { useTheme, BIBLE_VERSIONS } from '@/contexts/ThemeContext';
import { searchBible, type SearchResult as ApiSearchResult } from '@/hooks/useBibleApi';
import { searchCachedBible, isFullyDownloaded } from '@/hooks/useBibleCache';

interface SearchResult {
  ref: string;
  text: string;
}

export default function SearchPage() {
  const { version } = useTheme();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [searchedOffline, setSearchedOffline] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    setSearchedOffline(false);

    // Try online search first
    try {
      const data = await searchBible(query.trim(), version, 50);
      const mapped = (data.results || []).map((r: ApiSearchResult) => ({
        ref: r.reference || `${r.book_name} ${r.chapter}:${r.verse}`,
        text: r.text,
      }));
      setResults(mapped);
      setTotalCount(data.count || mapped.length);
    } catch {
      // Online failed — try offline search
      try {
        const offlineData = await searchCachedBible(query.trim(), version, 50);
        const mapped = offlineData.results.map(r => ({
          ref: r.reference,
          text: r.text,
        }));
        setResults(mapped);
        setTotalCount(offlineData.count);
        setSearchedOffline(true);
      } catch {
        setResults([]);
        setTotalCount(0);
      }
    } finally {
      setLoading(false);
    }
  };

  const versionName = BIBLE_VERSIONS.find(v => v.id === version)?.name || version.toUpperCase();

  return (
    <div className="fade-in">
      <h2 className="font-display text-xl font-bold text-foreground mb-4">Search Bible Verses</h2>

      <div className="flex gap-2 mb-2">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="Search by verse, keyword, or topic..."
            className="w-full rounded-lg bg-card border border-input pl-9 pr-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <button
          onClick={handleSearch}
          disabled={loading}
          className="px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition disabled:opacity-50"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : 'Search'}
        </button>
      </div>

      <p className="text-xs text-muted-foreground mb-4">Searching in {versionName}</p>

      {/* Popular searches */}
      {!searched && (
        <div>
          <p className="text-xs text-muted-foreground mb-2">Popular searches</p>
          <div className="flex flex-wrap gap-2">
            {['love', 'faith', 'peace', 'strength', 'forgiveness', 'hope', 'prayer'].map(term => (
              <button
                key={term}
                onClick={() => { setQuery(term); }}
                className="px-3 py-1.5 rounded-full bg-secondary text-secondary-foreground text-xs hover:bg-primary hover:text-primary-foreground transition-colors"
              >
                {term}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Results */}
      {searched && (
        <div>
          {searchedOffline && (
            <div className="flex items-center gap-2 mb-3 text-xs text-muted-foreground bg-secondary/50 rounded-lg px-3 py-2">
              <WifiOff size={14} />
              <span>Searching offline downloaded Bible</span>
            </div>
          )}
          <p className="text-xs text-muted-foreground mb-3">
            Showing {results.length} of {totalCount} result{totalCount !== 1 ? 's' : ''}
          </p>
          <div className="space-y-2">
            {results.map((r, i) => (
              <div key={i} className="rounded-xl bg-card border border-border p-4">
                <p className="text-xs font-bold text-primary mb-1">{r.ref}</p>
                <p className="verse-text text-sm">{r.text}</p>
              </div>
            ))}
            {results.length === 0 && !loading && (
              <p className="text-center text-sm text-muted-foreground py-8">
                No verses found. Try a different keyword{!searchedOffline ? '' : ' or download the Bible for offline search'}.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
