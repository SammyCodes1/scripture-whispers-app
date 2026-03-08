import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, Search } from 'lucide-react';
import { TOPICS } from '@/data/topicsData';
import { useSearchParams } from 'react-router-dom';

export default function Topics() {
  const [searchParams] = useSearchParams();
  const initialTopic = searchParams.get('t') || '';
  const [expandedId, setExpandedId] = useState<string>(initialTopic);
  const [search, setSearch] = useState('');

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

  return (
    <div className="fade-in">
      <h2 className="font-display text-xl font-bold text-foreground mb-4">Biblical Topics</h2>
      <p className="text-sm text-muted-foreground mb-6">
        Explore verses from both Old and New Testament organized by topic.
      </p>

      <div className="space-y-3">
        {TOPICS.map(topic => {
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
    </div>
  );
}
