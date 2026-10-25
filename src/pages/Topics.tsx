import { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, Search, TrendingUp, X } from 'lucide-react';
import { TOPICS } from '@/data/topicsData';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { versePath } from '@/lib/verseRef';
import { useTopicSearchTracking } from '@/hooks/useTopicSearchTracking';

export default function Topics() {
  const navigate = useNavigate();
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
      <h2 className="font-display text-lg sm:text-xl font-bold text-foreground mb-2 tracking-tight">Biblical Topics</h2>
      <p className="text-xs sm:text-sm text-muted-foreground mb-4 sm:mb-6 leading-relaxed">
        Explore verses from both Old and New Testament organized by topic.
      </p>

      <div className="mb-4 flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-2">
        <Search size={18} className="text-muted-foreground shrink-0" />
        <input
          type="text"
          placeholder="Search topics, verses, or references..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-0 bg-transparent outline-none text-sm placeholder:text-muted-foreground text-foreground"
        />
        {search && (
          <button onClick={() => setSearch('')} className="shrink-0 text-muted-foreground hover:text-foreground p-1 -m-1">
            <X size={16} />
          </button>
        )}
      </div>

      {/* Most Searched Topics */}
      {topSearches.length > 0 && !search && (
        <div className="mb-5 sm:mb-6 rounded-xl bg-card border border-border p-3 sm:p-4">
          <div className="flex items-center justify-between mb-3 gap-2">
            <h3 className="text-sm font-bold text-card-foreground flex items-center gap-2">
              <TrendingUp size={16} className="text-primary shrink-0" />
              <span className="truncate">Most Searched</span>
            </h3>
            <button
              onClick={clearSearchHistory}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0"
            >
              Clear
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {topSearches.map((entry) => (
              <button
                key={entry.query}
                onClick={() => handleTrendingClick(entry.query)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary text-secondary-foreground text-xs font-medium hover:bg-primary/10 hover:text-primary transition-colors active:scale-95"
              >
                <span className="capitalize">{entry.query}</span>
                <span className="text-muted-foreground">({entry.count})</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-8 px-4">No topics found matching your search.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map(topic => {
            const isExpanded = expandedId === topic.id;
            return (
              <div key={topic.id} className="rounded-xl bg-card border border-border overflow-hidden">
                <button
                  onClick={() => setExpandedId(isExpanded ? '' : topic.id)}
                  className="w-full flex items-center gap-3 p-3 sm:p-4 hover:bg-secondary/50 transition-colors text-left"
                >
                  <span className="text-xl sm:text-2xl shrink-0">{topic.emoji}</span>
                  <div className="text-left flex-1 min-w-0">
                    <p className="font-display font-bold text-sm sm:text-base text-card-foreground truncate">{topic.name}</p>
                    <p className="text-[11px] sm:text-xs text-muted-foreground line-clamp-2 leading-snug">{topic.description}</p>
                  </div>
                  <span className="hidden xs:inline text-[10px] sm:text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full shrink-0 whitespace-nowrap">
                    {topic.verses.length} verses
                  </span>
                  {isExpanded ? <ChevronUp size={16} className="text-muted-foreground shrink-0" /> : <ChevronDown size={16} className="text-muted-foreground shrink-0" />}
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
                      <div className="px-3 sm:px-4 pb-3 sm:pb-4 space-y-2 sm:space-y-3 border-t border-border pt-3">
                        {topic.verses.map((verse, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => {
                              const path = versePath(verse.ref);
                              if (path) navigate(path);
                            }}
                            className="block w-full rounded-lg bg-background p-3 text-left hover:bg-secondary/40 transition-colors"
                          >
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="text-[11px] sm:text-xs font-bold text-primary break-words">{verse.ref}</span>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full whitespace-nowrap ${
                                verse.testament === 'OT'
                                  ? 'bg-highlight/25 text-foreground'
                                  : 'bg-primary/10 text-primary'
                              }`}>
                                {verse.testament === 'OT' ? 'Old Testament' : 'New Testament'}
                              </span>
                            </div>
                            <p className="verse-text text-[13px] sm:text-sm leading-relaxed break-words">{verse.text}</p>
                          </button>
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
