import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Loader2, WifiOff } from 'lucide-react';
import { useTheme, BIBLE_VERSIONS } from '@/contexts/ThemeContext';
import { searchBible, type SearchResult as ApiSearchResult } from '@/hooks/useBibleApi';
import { searchCachedBible, isFullyDownloaded } from '@/hooks/useBibleCache';
import { BIBLE_BOOKS } from '@/data/bibleData';

function parseReference(ref: string): { book: string; chapter: number; verse: number } | null {
  // Match "Book Name 1:2" — book may contain spaces and digits like "1 Kings"
  const m = ref.match(/^(.+?)\s+(\d+):(\d+)/);
  if (!m) return null;
  const bookRaw = m[1].trim();
  const chapter = parseInt(m[2], 10);
  const verse = parseInt(m[3], 10);
  // Find a matching book (case-insensitive, allow partial)
  const book = BIBLE_BOOKS.find(b => b.name.toLowerCase() === bookRaw.toLowerCase())
    || BIBLE_BOOKS.find(b => b.name.toLowerCase().startsWith(bookRaw.toLowerCase()))
    || BIBLE_BOOKS.find(b => bookRaw.toLowerCase().startsWith(b.name.toLowerCase()));
  if (!book) return null;
  return { book: book.name, chapter, verse };
}

interface SearchResult {
  ref: string;
  text: string;
}

export default function SearchPage() {
  const { version } = useTheme();
  const navigate = useNavigate();

  const openVerse = (ref: string) => {
    const parsed = parseReference(ref);
    if (!parsed) return;
    navigate(`/read?book=${encodeURIComponent(parsed.book)}&chapter=${parsed.chapter}&verse=${parsed.verse}`);
  };
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
      <h2 className="font-display text-lg sm:text-xl font-bold text-foreground mb-3 sm:mb-4 tracking-tight">
        Search Bible Verses
      </h2>

      <div className="flex gap-2 mb-2">
        <div className="flex-1 relative min-w-0">
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
                onClick={() => { setQuery(term); }}
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
              <div key={i} className="rounded-xl bg-card border border-border p-3 sm:p-4">
                <p className="text-[11px] sm:text-xs font-bold text-primary mb-1 break-words">{r.ref}</p>
                <p className="verse-text text-[13px] sm:text-sm leading-relaxed break-words">{r.text}</p>
              </div>
            ))}
            {results.length === 0 && !loading && (
              <p className="text-center text-sm text-muted-foreground py-8 px-4 leading-relaxed">
                No verses found. Try a different keyword{!searchedOffline ? '' : ' or download the Bible for offline search'}.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
