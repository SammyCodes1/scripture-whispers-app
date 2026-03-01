import { useState } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { DAILY_VERSES } from '@/data/bibleData';
import { TOPICS } from '@/data/topicsData';

interface SearchResult {
  ref: string;
  text: string;
}

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = () => {
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);

    // Search through local data
    const q = query.toLowerCase();
    const found: SearchResult[] = [];

    // Search daily verses
    DAILY_VERSES.forEach(v => {
      if (v.ref.toLowerCase().includes(q) || v.text.toLowerCase().includes(q)) {
        found.push({ ref: v.ref, text: v.text });
      }
    });

    // Search topic verses
    TOPICS.forEach(topic => {
      topic.verses.forEach(v => {
        if (
          (v.ref.toLowerCase().includes(q) || v.text.toLowerCase().includes(q)) &&
          !found.some(f => f.ref === v.ref)
        ) {
          found.push({ ref: v.ref, text: v.text });
        }
      });
    });

    setResults(found);
    setLoading(false);
  };

  return (
    <div className="fade-in">
      <h2 className="font-display text-xl font-bold text-foreground mb-4">Search Bible Verses</h2>

      <div className="flex gap-2 mb-6">
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
          <p className="text-xs text-muted-foreground mb-3">
            {results.length} result{results.length !== 1 ? 's' : ''} found
          </p>
          <div className="space-y-2">
            {results.map((r, i) => (
              <div key={i} className="rounded-xl bg-card border border-border p-4">
                <p className="text-xs font-bold text-primary mb-1">{r.ref}</p>
                <p className="verse-text text-sm">{r.text}</p>
              </div>
            ))}
            {results.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-8">
                No verses found. Try a different keyword.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
