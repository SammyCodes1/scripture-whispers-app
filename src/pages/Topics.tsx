import { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, Search, TrendingUp, X } from 'lucide-react';
import { TOPICS } from '@/data/topicsData';
import { useSearchParams } from 'react-router-dom';
import { useTopicSearchTracking } from '@/hooks/useTopicSearchTracking';

export default function Topics() {
  const [searchParams] = useSearchParams();
  const initialTopic = searchParams.get('t') || '';
  const [expandedId, setExpandedId] = useState<string>(initialTopic);
  const [search, setSearch] = useState('');
  const { trackSearch, topSearches, clearSearchHistory } = useTopicSearchTracking();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Track searches with debounce
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (search.trim().length >= 2) {
      debounceRef.current = setTimeout(() => {
        trackSearch(search);
      }, 1500);
    }
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search, trackSearch]);

  const filtered = useMemo(() => {
    if (!search.trim()) return TOPICS;
    const q = search.toLowerCase();
    return TOPICS.filter(topic =>
      topic.name.toLowerCase().includes(q) ||
      topic.description.toLowerCase().includes(q) ||
      topic.verses.some(v =>
        v.ref.toLowerCase().includes(q) ||
        v.text.toLowerCase().includes(q)
      )
    );
  }, [search]);

  const handleTrendingClick = (query: string) => {
    setSearch(query);
  };

  return (
    <div className="fade-in">
      <h2 className="font-display text-xl font-bold text-foreground mb-4">Biblical Topics</h2>
      <p className="text-sm text-muted-foreground mb-6">
        Explore verses from both Old and New Testament organized by topic.
      </p>

      <div className="mb-4 flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-2">
        <Search size={18} className="text-muted-foreground" />
        <input
          type="text"
          placeholder="Search topics, verses, or references..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground text-foreground"
        />
        {search && (
          <button onClick={() => setSearch('')} className="text-muted-foreground hover:text-foreground">
            <X size={16} />
          </button>
        )}
      </div>

      {/* Most Searched Topics */}
      {topSearches.length > 0 && !search && (
        <div className="mb-6 rounded-xl bg-card border border-border p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-card-foreground flex items-center gap-2">
              <TrendingUp size={16} className="text-primary" />
              Most Searched
            </h3>
            <button
              onClick={clearSearchHistory}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Clear
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {topSearches.map((entry) => (
              <button
                key={entry.query}
                onClick={() => handleTrendingClick(entry.query)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary text-secondary-foreground text-xs font-medium hover:bg-primary/10 hover:text-primary transition-colors"
              >
                <span className="capitalize">{entry.query}</span>
                <span className="text-muted-foreground">({entry.count})</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">No topics found matching your search.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map(topic => {
            const isExpanded = expandedId === topic.id;
            return (
              <div key={topic.id} className="rounded-xl bg-card border border-border overflow-hidden">
                <button
                  onClick={() => setExpandedId(isExpanded ? '' : topic.id)}
                  className="w-full flex items-center gap-3 p-4 hover:bg-secondary/50 transition-colors"
                >
                  <span className="text-2xl">{topic.emoji}</span>
                  <div className="text-left flex-1">
                    <p className="font-display font-bold text-card-foreground">{topic.name}</p>
                    <p className="text-xs text-muted-foreground">{topic.description}</p>
                  </div>
                  <span className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full">
                    {topic.verses.length} verses
                  </span>
                  {isExpanded ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
                </button>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
                        {topic.verses.map((verse, i) => (
                          <div key={i} className="rounded-lg bg-background p-3">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-bold text-primary">{verse.ref}</span>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                                verse.testament === 'OT'
                                  ? 'bg-accent/20 text-accent-foreground'
                                  : 'bg-primary/10 text-primary'
                              }`}>
                                {verse.testament === 'OT' ? 'Old Testament' : 'New Testament'}
                              </span>
                            </div>
                            <p className="verse-text text-sm">{verse.text}</p>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
