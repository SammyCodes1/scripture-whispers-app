import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Loader2, WifiOff } from 'lucide-react';
import { useTheme, BIBLE_VERSIONS } from '@/contexts/ThemeContext';
import { searchBible, type SearchResult as ApiSearchResult } from '@/hooks/useBibleApi';
import { searchCachedBible, isFullyDownloaded } from '@/hooks/useBibleCache';
import { parseVerseRef } from '@/lib/verseRef';

const CACHED_SEARCH_VERSIONS = new Set(['web', 'bbe']);

interface SearchResult {
  ref: string;
  text: string;
}

export default function SearchPage() {
  const { version } = useTheme();
  const navigate = useNavigate();

  const openVerse = (ref: string) => {
    const parsed = parseVerseRef(ref);
    if (!parsed) return;
    navigate(`/read?book=${encodeURIComponent(parsed.book)}&chapter=${parsed.chapter}&verse=${parsed.verse}`);
  };
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [searchedOffline, setSearchedOffline] = useState(false);
  const [needsDownload, setNeedsDownload] = useState(false);

  const applyOfflineResults = (mapped: SearchResult[], count: number, downloaded: boolean) => {
    setResults(mapped);
    setTotalCount(count);
    setSearchedOffline(true);
    setNeedsDownload(!downloaded && count === 0);
  };

  const handleSearch = async (term?: string) => {
    const q = (term ?? query).trim();
    if (!q) return;
    if (term) setQuery(term);
    setLoading(true);
    setSearched(true);
    setSearchedOffline(false);
    setNeedsDownload(false);

    const mapOffline = (results: { reference: string; text: string }[]) =>
      results.map(r => ({ ref: r.reference, text: r.text }));

    try {
      if (CACHED_SEARCH_VERSIONS.has(version)) {
        const [offlineData, downloaded] = await Promise.all([
          searchCachedBible(q, version, 50),
          isFullyDownloaded(version),
        ]);
        applyOfflineResults(mapOffline(offlineData.results), offlineData.count, downloaded);
      } else {
        try {
          const data = await searchBible(q, version, 50);
          const mapped = (data.results || []).map((r: ApiSearchResult) => ({
            ref: r.reference || `${r.book_name} ${r.chapter}:${r.verse}`,
            text: r.text,
          }));
          setResults(mapped);
          setTotalCount(data.count || mapped.length);
        } catch {
          const offlineData = await searchCachedBible(q, version, 50);
          const downloaded = await isFullyDownloaded(version);
          applyOfflineResults(mapOffline(offlineData.results), offlineData.count, downloaded);
        }
      }
    } catch {
      setResults([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  };

  const versionName = BIBLE_VERSIONS.find(v => v.id === version)?.name || version.toUpperCase();

  return (
    <div className="fade-in">
      <h2 className="font-display text-lg sm:text-xl font-bold text-foreground mb-3 sm:mb-4 tracking-tight">
        Search Bible Verses
      </h2>

      <div className="flex gap-2 mb-2">
        <div className="flex-1 relative min-w-0">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') void handleSearch(); }}
            placeholder="Search by verse, keyword, or topic..."
            className="w-full rounded-lg bg-card border border-input pl-9 pr-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <button
          onClick={() => { void handleSearch(); }}
          disabled={loading}
          className="shrink-0 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition disabled:opacity-50 active:scale-95"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : 'Search'}
        </button>
      </div>

      <p className="text-[11px] sm:text-xs text-muted-foreground mb-4 break-words">Searching in {versionName}</p>

      {/* Popular searches */}
      {!searched && (
        <div>
          <p className="text-xs text-muted-foreground mb-2">Popular searches</p>
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {['love', 'faith', 'peace', 'strength', 'forgiveness', 'hope', 'prayer'].map(term => (
              <button
                key={term}
                onClick={() => { void handleSearch(term); }}
                className="px-3 py-1.5 rounded-full bg-secondary text-secondary-foreground text-xs hover:bg-primary hover:text-primary-foreground transition-colors active:scale-95"
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
              <WifiOff size={14} className="shrink-0" />
              <span className="break-words">Searching offline downloaded Bible</span>
            </div>
          )}
          <p className="text-xs text-muted-foreground mb-3">
            Showing {results.length} of {totalCount} result{totalCount !== 1 ? 's' : ''}
          </p>
          <div className="space-y-2">
            {results.map((r, i) => (
              <button
                key={i}
                onClick={() => openVerse(r.ref)}
                className="w-full text-left rounded-xl bg-card border border-border p-3 sm:p-4 hover:border-primary/50 hover:bg-secondary/40 transition-all active:scale-[0.99]"
              >
                <p className="text-[11px] sm:text-xs font-bold text-primary mb-1 break-words">{r.ref}</p>
                <p className="verse-text text-[13px] sm:text-sm leading-relaxed break-words">{r.text}</p>
              </button>
            ))}
            {results.length === 0 && !loading && (
              <p className="text-center text-sm text-muted-foreground py-8 px-4 leading-relaxed">
                {needsDownload
                  ? `Download ${versionName} in Settings to search it. This version is searched from the chapters saved on this device.`
                  : 'No verses found. Try a different keyword.'}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
