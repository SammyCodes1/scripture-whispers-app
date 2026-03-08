import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Bookmark, Highlighter, Loader2, Copy, Share2, Volume2, VolumeX, ChevronDown } from 'lucide-react';
import { BIBLE_BOOKS } from '@/data/bibleData';
import { BIBLE_VERSIONS, useTheme } from '@/contexts/ThemeContext';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { type BibleVerse } from '@/hooks/useBibleApi';
import { fetchChapterCached } from '@/hooks/useBibleCache';
import { useChapterAudio } from '@/hooks/useChapterAudio';
import { useReadingHistory } from '@/hooks/useReadingHistory';
import VerseShareCard from '@/components/VerseShareCard';
import ReadingStats from '@/components/ReadingStats';
import { useReadingStreak } from '@/hooks/useReadingStreak';
import { toast } from 'sonner';

type View = 'books' | 'chapters' | 'reading';

export interface SavedVerse {
  id: string;
  ref: string;
  text: string;
  type: 'bookmark' | 'highlight';
  color?: string;
  createdAt: number;
}

export default function Reader() {
  const { version, setVersion } = useTheme();
  const [view, setView] = useState<View>('books');
  const [showVersionPicker, setShowVersionPicker] = useState(false);
  const versionRef = useRef<HTMLDivElement>(null);
  const [selectedBook, setSelectedBook] = useState('');
  const [selectedChapter, setSelectedChapter] = useState(0);
  const [testament, setTestament] = useState<'OT' | 'NT'>('OT');
  const [savedVerses, setSavedVerses] = useLocalStorage<SavedVerse[]>('hw-saved-verses', []);
  const [verses, setVerses] = useState<BibleVerse[]>([]);
  const [loading, setLoading] = useState(false);
  const [shareVerse, setShareVerse] = useState<{ ref: string; text: string } | null>(null);

  const books = BIBLE_BOOKS.filter(b => b.testament === testament);
  const currentBook = BIBLE_BOOKS.find(b => b.name === selectedBook);
  const { isPlaying, currentVerseIndex, toggle, stop } = useChapterAudio(verses);
  const { recordReading } = useReadingStreak();
  const { recordChapter, isChapterRead } = useReadingHistory();

  // Close version picker on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (versionRef.current && !versionRef.current.contains(e.target as Node)) {
        setShowVersionPicker(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (!selectedBook || !selectedChapter || view !== 'reading') return;
    let cancelled = false;
    setLoading(true);
    fetchChapterCached(selectedBook, selectedChapter, version)
      .then(data => { if (!cancelled && data.verses) { setVerses(data.verses); recordReading(); recordChapter(selectedBook, selectedChapter); } })
      .catch(err => { if (!cancelled) { console.error('Bible API error:', err); toast.error('Could not load verses.'); } })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [selectedBook, selectedChapter, version, view]);

  const saveVerse = (index: number, type: 'bookmark' | 'highlight') => {
    const verse = verses[index];
    if (!verse) return;
    const ref = `${verse.book_name} ${verse.chapter}:${verse.verse}`;
    const exists = savedVerses.some(v => v.ref === ref && v.type === type);
    if (exists) {
      setSavedVerses(prev => prev.filter(v => !(v.ref === ref && v.type === type)));
      toast.info(`${type === 'bookmark' ? 'Bookmark' : 'Highlight'} removed`);
    } else {
      setSavedVerses(prev => [...prev, { id: `${ref}-${type}-${Date.now()}`, ref, text: verse.text, type, color: type === 'highlight' ? 'yellow' : undefined, createdAt: Date.now() }]);
      toast.success(`${type === 'bookmark' ? 'Bookmarked' : 'Highlighted'} ${ref}`);
    }
  };

  const isVerseSaved = (index: number, type: 'bookmark' | 'highlight') => {
    const verse = verses[index];
    if (!verse) return false;
    const ref = `${verse.book_name} ${verse.chapter}:${verse.verse}`;
    return savedVerses.some(v => v.ref === ref && v.type === type);
  };

  const copyVerse = (index: number) => {
    const verse = verses[index];
    if (!verse) return;
    navigator.clipboard.writeText(`${verse.book_name} ${verse.chapter}:${verse.verse}\n${verse.text}`);
    toast.success('Verse copied to clipboard');
  };

  const openShare = (index: number) => {
    const verse = verses[index];
    if (!verse) return;
    setShareVerse({ ref: `${verse.book_name} ${verse.chapter}:${verse.verse}`, text: verse.text });
  };

  return (
    <div className="fade-in">
      {/* Header bar */}
      <div className="flex items-center gap-2 mb-4">
        {view !== 'books' && (
          <button
            onClick={() => { stop(); setView(view === 'reading' ? 'chapters' : 'books'); setVerses([]); }}
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
        <div className="ml-auto flex items-center gap-2">
          {view === 'reading' && verses.length > 0 && (
            <button
              onClick={toggle}
              className={`p-2 rounded-lg transition-colors ${isPlaying ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary text-muted-foreground'}`}
              title={isPlaying ? 'Stop reading' : 'Read chapter aloud'}
            >
              {isPlaying ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
          )}
          <div className="relative" ref={versionRef}>
            <button
              onClick={() => setShowVersionPicker(prev => !prev)}
              className="flex items-center gap-1 text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded-full hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer"
            >
              {version.toUpperCase()}
              <ChevronDown size={12} />
            </button>

            <AnimatePresence>
              {showVersionPicker && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-1 z-50 bg-card border border-border rounded-lg shadow-lg overflow-hidden min-w-[180px]"
                >
                  {BIBLE_VERSIONS.map(v => (
                    <button
                      key={v.id}
                      onClick={() => { setVersion(v.id); setShowVersionPicker(false); }}
                      className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between hover:bg-secondary/50 transition-colors ${
                        version === v.id ? 'bg-primary/10 text-primary font-medium' : 'text-card-foreground'
                      }`}
                    >
                      <span>{v.name}</span>
                      <span className="text-xs text-muted-foreground">{v.full}</span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {view === 'books' && (
          <motion.div key="books" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <ReadingStats />
            <div className="flex gap-2 mb-4">
              {(['OT', 'NT'] as const).map(t => (
                <button key={t} onClick={() => setTestament(t)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${testament === t ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'}`}
                >
                  {t === 'OT' ? 'Old Testament' : 'New Testament'}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {books.map(book => {
                const stats = bookStats[book.name];
                const readCount = stats?.read || 0;
                const isComplete = readCount === book.chapters;
                return (
                  <button key={book.name} onClick={() => { setSelectedBook(book.name); setView('chapters'); }}
                    className={`text-left rounded-lg bg-card border p-3 hover:shadow-md transition-all hover:-translate-y-0.5 ${isComplete ? 'border-green-500/40' : 'border-border'}`}
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-display font-bold text-sm text-card-foreground">{book.name}</p>
                      {readCount > 0 && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${isComplete ? 'bg-green-500/15 text-green-600' : 'bg-primary/10 text-primary'}`}>
                          {readCount}/{book.chapters}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{book.chapters} chapters</p>
                    {readCount > 0 && (
                      <div className="mt-1.5 h-1 rounded-full bg-border overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${isComplete ? 'bg-green-500' : 'bg-primary'}`} style={{ width: `${(readCount / book.chapters) * 100}%` }} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}

        {view === 'chapters' && currentBook && (
          <motion.div key="chapters" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="grid grid-cols-5 sm:grid-cols-8 gap-2">
              {Array.from({ length: currentBook.chapters }, (_, i) => i + 1).map(ch => (
                <button key={ch} onClick={() => { setSelectedChapter(ch); setView('reading'); }}
                  className="aspect-square rounded-lg bg-card border border-border flex items-center justify-center font-display font-bold text-card-foreground hover:bg-primary hover:text-primary-foreground transition-colors"
                >
                  {ch}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {view === 'reading' && (
          <motion.div key="reading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="animate-spin text-primary" size={32} />
              </div>
            ) : (
              <div className="space-y-1">
                {verses.map((verse, i) => (
                  <div
                    key={i}
                    className={`group flex gap-2 p-2 rounded-lg hover:bg-secondary/50 transition-colors ${
                      isVerseSaved(i, 'highlight') ? 'bg-accent/20' : ''
                    } ${currentVerseIndex === i ? 'bg-primary/10 ring-1 ring-primary/30' : ''}`}
                  >
                    <span className="text-xs font-bold text-primary mt-1 min-w-[24px]">{verse.verse}</span>
                    <p className="verse-text text-sm flex-1">{verse.text}</p>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openShare(i)} className="p-1 rounded text-muted-foreground hover:text-primary transition-colors" title="Share as image">
                        <Share2 size={14} />
                      </button>
                      <button onClick={() => copyVerse(i)} className="p-1 rounded text-muted-foreground hover:text-primary transition-colors" title="Copy">
                        <Copy size={14} />
                      </button>
                      <button onClick={() => saveVerse(i, 'bookmark')} className={`p-1 rounded ${isVerseSaved(i, 'bookmark') ? 'text-primary' : 'text-muted-foreground'}`}>
                        <Bookmark size={14} fill={isVerseSaved(i, 'bookmark') ? 'currentColor' : 'none'} />
                      </button>
                      <button onClick={() => saveVerse(i, 'highlight')} className={`p-1 rounded ${isVerseSaved(i, 'highlight') ? 'text-accent' : 'text-muted-foreground'}`}>
                        <Highlighter size={14} />
                      </button>
                    </div>
                  </div>
                ))}
                {verses.length === 0 && !loading && (
                  <p className="text-center text-muted-foreground py-8 text-sm">No verses found for this chapter.</p>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {shareVerse && (
        <VerseShareCard reference={shareVerse.ref} text={shareVerse.text} version={version} onClose={() => setShareVerse(null)} />
      )}
    </div>
  );
}
