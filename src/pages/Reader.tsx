import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Bookmark, Highlighter } from 'lucide-react';
import { BIBLE_BOOKS } from '@/data/bibleData';
import { useTheme } from '@/contexts/ThemeContext';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { toast } from 'sonner';

type View = 'books' | 'chapters' | 'reading';

// Simple mock content generator
function generateVerses(book: string, chapter: number): string[] {
  const seed = `${book}${chapter}`;
  const count = 15 + (seed.length % 20);
  return Array.from({ length: count }, (_, i) =>
    `This is verse ${i + 1} of ${book} chapter ${chapter}. The full text will be available with Bible API integration.`
  );
}

export interface SavedVerse {
  id: string;
  ref: string;
  text: string;
  type: 'bookmark' | 'highlight';
  color?: string;
  createdAt: number;
}

export default function Reader() {
  const { version } = useTheme();
  const [view, setView] = useState<View>('books');
  const [selectedBook, setSelectedBook] = useState('');
  const [selectedChapter, setSelectedChapter] = useState(0);
  const [testament, setTestament] = useState<'OT' | 'NT'>('OT');
  const [savedVerses, setSavedVerses] = useLocalStorage<SavedVerse[]>('hw-saved-verses', []);

  const books = BIBLE_BOOKS.filter(b => b.testament === testament);
  const currentBook = BIBLE_BOOKS.find(b => b.name === selectedBook);
  const verses = selectedBook && selectedChapter ? generateVerses(selectedBook, selectedChapter) : [];

  const saveVerse = (index: number, type: 'bookmark' | 'highlight') => {
    const ref = `${selectedBook} ${selectedChapter}:${index + 1}`;
    const exists = savedVerses.some(v => v.ref === ref && v.type === type);
    if (exists) {
      setSavedVerses(prev => prev.filter(v => !(v.ref === ref && v.type === type)));
      toast.info(`${type === 'bookmark' ? 'Bookmark' : 'Highlight'} removed`);
    } else {
      const newVerse: SavedVerse = {
        id: `${ref}-${type}-${Date.now()}`,
        ref,
        text: verses[index],
        type,
        color: type === 'highlight' ? 'yellow' : undefined,
        createdAt: Date.now(),
      };
      setSavedVerses(prev => [...prev, newVerse]);
      toast.success(`${type === 'bookmark' ? 'Bookmarked' : 'Highlighted'} ${ref}`);
    }
  };

  const isVerseSaved = (index: number, type: 'bookmark' | 'highlight') => {
    const ref = `${selectedBook} ${selectedChapter}:${index + 1}`;
    return savedVerses.some(v => v.ref === ref && v.type === type);
  };

  return (
    <div className="fade-in">
      {/* Header bar */}
      <div className="flex items-center gap-2 mb-4">
        {view !== 'books' && (
          <button
            onClick={() => setView(view === 'reading' ? 'chapters' : 'books')}
            className="p-2 rounded-lg hover:bg-secondary text-foreground"
          >
            <ChevronLeft size={20} />
          </button>
        )}
        <h2 className="font-display text-xl font-bold text-foreground">
          {view === 'books' && 'Select a Book'}
          {view === 'chapters' && selectedBook}
          {view === 'reading' && `${selectedBook} ${selectedChapter}`}
        </h2>
        <span className="ml-auto text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded-full">
          {version}
        </span>
      </div>

      <AnimatePresence mode="wait">
        {/* Books view */}
        {view === 'books' && (
          <motion.div key="books" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="flex gap-2 mb-4">
              {(['OT', 'NT'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setTestament(t)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    testament === t ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'
                  }`}
                >
                  {t === 'OT' ? 'Old Testament' : 'New Testament'}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {books.map(book => (
                <button
                  key={book.name}
                  onClick={() => { setSelectedBook(book.name); setView('chapters'); }}
                  className="text-left rounded-lg bg-card border border-border p-3 hover:shadow-md transition-all hover:-translate-y-0.5"
                >
                  <p className="font-display font-bold text-sm text-card-foreground">{book.name}</p>
                  <p className="text-xs text-muted-foreground">{book.chapters} chapters</p>
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Chapters view */}
        {view === 'chapters' && currentBook && (
          <motion.div key="chapters" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="grid grid-cols-5 sm:grid-cols-8 gap-2">
              {Array.from({ length: currentBook.chapters }, (_, i) => i + 1).map(ch => (
                <button
                  key={ch}
                  onClick={() => { setSelectedChapter(ch); setView('reading'); }}
                  className="aspect-square rounded-lg bg-card border border-border flex items-center justify-center font-display font-bold text-card-foreground hover:bg-primary hover:text-primary-foreground transition-colors"
                >
                  {ch}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Reading view */}
        {view === 'reading' && (
          <motion.div key="reading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="space-y-1">
              {verses.map((text, i) => (
                <div
                  key={i}
                  className={`group flex gap-2 p-2 rounded-lg hover:bg-secondary/50 transition-colors ${
                    isVerseSaved(i, 'highlight') ? 'bg-accent/20' : ''
                  }`}
                >
                  <span className="text-xs font-bold text-primary mt-1 min-w-[24px]">{i + 1}</span>
                  <p className="verse-text text-sm flex-1">{text}</p>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => saveVerse(i, 'bookmark')}
                      className={`p-1 rounded ${isVerseSaved(i, 'bookmark') ? 'text-primary' : 'text-muted-foreground'}`}
                    >
                      <Bookmark size={14} fill={isVerseSaved(i, 'bookmark') ? 'currentColor' : 'none'} />
                    </button>
                    <button
                      onClick={() => saveVerse(i, 'highlight')}
                      className={`p-1 rounded ${isVerseSaved(i, 'highlight') ? 'text-accent' : 'text-muted-foreground'}`}
                    >
                      <Highlighter size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
