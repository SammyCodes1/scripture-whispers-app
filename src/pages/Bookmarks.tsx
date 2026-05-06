import { useState } from 'react';
import { Bookmark, Highlighter, Trash2 } from 'lucide-react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import type { SavedVerse } from './Reader';
import { toast } from 'sonner';

export default function BookmarksPage() {
  const [savedVerses, setSavedVerses] = useLocalStorage<SavedVerse[]>('hw-saved-verses', []);
  const [tab, setTab] = useState<'bookmark' | 'highlight'>('bookmark');

  const filtered = savedVerses.filter(v => v.type === tab).sort((a, b) => b.createdAt - a.createdAt);

  const remove = (id: string) => {
    setSavedVerses(prev => prev.filter(v => v.id !== id));
    toast.info('Removed');
  };

  return (
    <div className="fade-in">
      <h2 className="font-display text-lg sm:text-xl font-bold text-foreground mb-3 sm:mb-4 tracking-tight">
        Bookmarks &amp; Highlights
      </h2>

      <div className="flex gap-2 mb-3 sm:mb-4">
        <button
          onClick={() => setTab('bookmark')}
          className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors active:scale-95 ${
            tab === 'bookmark' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'
          }`}
        >
          <Bookmark size={14} /> Bookmarks
        </button>
        <button
          onClick={() => setTab('highlight')}
          className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors active:scale-95 ${
            tab === 'highlight' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'
          }`}
        >
          <Highlighter size={14} /> Highlights
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-10 sm:py-12 px-4">
          <p className="text-muted-foreground text-sm">
            No {tab === 'bookmark' ? 'bookmarks' : 'highlights'} yet.
          </p>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            Tap the {tab === 'bookmark' ? 'bookmark' : 'highlight'} icon while reading to save verses.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(verse => (
            <div
              key={verse.id}
              className={`rounded-xl bg-card border border-border p-3 sm:p-4 ${
                verse.type === 'highlight' ? 'border-l-4 border-l-accent' : ''
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] sm:text-xs font-bold text-primary mb-1 break-words">{verse.ref}</p>
                  <p className="verse-text text-[13px] sm:text-sm leading-relaxed break-words">{verse.text}</p>
                </div>
                <button
                  onClick={() => remove(verse.id)}
                  aria-label="Remove"
                  className="shrink-0 p-2 -m-1 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
