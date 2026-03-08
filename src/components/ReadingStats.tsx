import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart3, ChevronDown, ChevronUp, BookOpen, Clock, Trophy } from 'lucide-react';
import { BIBLE_BOOKS } from '@/data/bibleData';
import { useReadingHistory } from '@/hooks/useReadingHistory';

export default function ReadingStats() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'progress' | 'books' | 'history'>('progress');
  const { bookStats, totalChapters, totalRead, completionPct, recentHistory } = useReadingHistory();

  const otBooks = BIBLE_BOOKS.filter(b => b.testament === 'OT');
  const ntBooks = BIBLE_BOOKS.filter(b => b.testament === 'NT');

  const otRead = otBooks.reduce((s, b) => s + (bookStats[b.name]?.read || 0), 0);
  const otTotal = otBooks.reduce((s, b) => s + b.chapters, 0);
  const ntRead = ntBooks.reduce((s, b) => s + (bookStats[b.name]?.read || 0), 0);
  const ntTotal = ntBooks.reduce((s, b) => s + b.chapters, 0);

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    const now = new Date();
    const diff = now.getTime() - ts;
    if (diff < 60_000) return 'Just now';
    if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`;
    if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}h ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="mb-4">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 w-full px-3 py-2 rounded-lg bg-card border border-border text-sm font-medium text-card-foreground hover:bg-secondary/50 transition-colors"
      >
        <BarChart3 size={16} className="text-primary" />
        <span>Reading Stats</span>
        <span className="ml-auto flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{completionPct}% complete</span>
          {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="mt-2 rounded-lg bg-card border border-border p-4 space-y-4">
              {/* Tab switcher */}
              <div className="flex gap-1 bg-secondary/50 rounded-lg p-0.5">
                {([
                  { id: 'progress' as const, label: 'Overview', icon: Trophy },
                  { id: 'books' as const, label: 'By Book', icon: BookOpen },
                  { id: 'history' as const, label: 'History', icon: Clock },
                ]).map(t => (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id)}
                    className={`flex-1 flex items-center justify-center gap-1.5 text-xs py-1.5 rounded-md transition-colors ${
                      tab === t.id ? 'bg-primary text-primary-foreground font-medium' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <t.icon size={12} />
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Overview Tab */}
              {tab === 'progress' && (
                <div className="space-y-4">
                  {/* Overall progress ring */}
                  <div className="flex items-center gap-6">
                    <div className="relative w-20 h-20 flex-shrink-0">
                      <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
                        <circle cx="40" cy="40" r="34" fill="none" stroke="hsl(var(--border))" strokeWidth="6" />
                        <circle
                          cx="40" cy="40" r="34"
                          fill="none"
                          stroke="hsl(var(--primary))"
                          strokeWidth="6"
                          strokeLinecap="round"
                          strokeDasharray={`${2 * Math.PI * 34}`}
                          strokeDashoffset={`${2 * Math.PI * 34 * (1 - completionPct / 100)}`}
                          className="transition-all duration-700"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="font-display text-lg font-bold text-foreground">{completionPct}%</span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-foreground">{totalRead} of {totalChapters} chapters</p>
                      <p className="text-xs text-muted-foreground">
                        {totalChapters - totalRead} chapters remaining
                      </p>
                    </div>
                  </div>

                  {/* OT / NT breakdown */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg bg-secondary/30 p-3">
                      <p className="text-xs text-muted-foreground mb-1">Old Testament</p>
                      <p className="font-display text-lg font-bold text-foreground">{otRead}<span className="text-xs text-muted-foreground font-normal">/{otTotal}</span></p>
                      <div className="mt-1.5 h-1.5 rounded-full bg-border overflow-hidden">
                        <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${otTotal > 0 ? (otRead / otTotal) * 100 : 0}%` }} />
                      </div>
                    </div>
                    <div className="rounded-lg bg-secondary/30 p-3">
                      <p className="text-xs text-muted-foreground mb-1">New Testament</p>
                      <p className="font-display text-lg font-bold text-foreground">{ntRead}<span className="text-xs text-muted-foreground font-normal">/{ntTotal}</span></p>
                      <div className="mt-1.5 h-1.5 rounded-full bg-border overflow-hidden">
                        <div className="h-full rounded-full bg-accent transition-all duration-500" style={{ width: `${ntTotal > 0 ? (ntRead / ntTotal) * 100 : 0}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* By Book Tab */}
              {tab === 'books' && (
                <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1">
                  {BIBLE_BOOKS.map(book => {
                    const stats = bookStats[book.name];
                    if (!stats) return null;
                    const pct = stats.total > 0 ? Math.round((stats.read / stats.total) * 100) : 0;
                    return (
                      <div key={book.name} className="flex items-center gap-2">
                        <span className="text-xs text-foreground w-28 truncate" title={book.name}>
                          {book.name}
                        </span>
                        <div className="flex-1 h-2 rounded-full bg-border overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              pct === 100 ? 'bg-green-500' : pct > 0 ? 'bg-primary' : 'bg-transparent'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-muted-foreground w-12 text-right">
                          {stats.read}/{stats.total}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* History Tab */}
              {tab === 'history' && (
                <div className="max-h-64 overflow-y-auto space-y-1 pr-1">
                  {recentHistory.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">
                      No reading history yet. Start reading to track your progress!
                    </p>
                  ) : (
                    recentHistory.map((entry, i) => (
                      <div key={i} className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-secondary/30 transition-colors">
                        <div className="flex items-center gap-2">
                          <BookOpen size={12} className="text-primary" />
                          <span className="text-xs font-medium text-foreground">
                            {entry.book} {entry.chapter}
                          </span>
                        </div>
                        <span className="text-[10px] text-muted-foreground">{formatDate(entry.timestamp)}</span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
