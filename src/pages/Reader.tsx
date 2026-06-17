import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Bookmark, Highlighter, Loader2, Copy, Share2, Volume2, VolumeX, ChevronDown, CheckCircle2, StickyNote, CheckSquare, X } from 'lucide-react';
import VerseNoteModal from '@/components/VerseNoteModal';
import { useNotes } from '@/hooks/useNotes';

import { BIBLE_BOOKS } from '@/data/bibleData';
import { BIBLE_VERSIONS, useTheme } from '@/contexts/ThemeContext';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { type BibleVerse } from '@/hooks/useBibleApi';
import { fetchChapterCached } from '@/hooks/useBibleCache';
import { useChapterAudio } from '@/hooks/useChapterAudio';
import { useReadingHistory } from '@/hooks/useReadingHistory';
import { useLastRead } from '@/hooks/useLastRead';
import VerseShareCard from '@/components/VerseShareCard';
import ReadingStats from '@/components/ReadingStats';
import { useReadingStreak } from '@/hooks/useReadingStreak';
import { useSwipeGesture } from '@/hooks/useSwipeGesture';
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
  const [searchParams, setSearchParams] = useSearchParams();
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
  const [noteVerse, setNoteVerse] = useState<{ ref: string; text: string } | null>(null);
  const [expandedNoteRef, setExpandedNoteRef] = useState<string | null>(null);
  const { getNote } = useNotes();
  const hasRestoredRef = useRef(false);
  const [targetVerse, setTargetVerse] = useState<number | null>(null);
  const verseRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const [selectMode, setSelectMode] = useState(false);
  const [selectedVerses, setSelectedVerses] = useState<Set<number>>(new Set());

  const toggleSelectVerse = (verseNum: number) => {
    setSelectedVerses(prev => {
      const next = new Set(prev);
      if (next.has(verseNum)) next.delete(verseNum); else next.add(verseNum);
      return next;
    });
  };

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedVerses(new Set());
  };

  const copySelectedVerses = () => {
    if (selectedVerses.size === 0) {
      toast.info('Select at least one verse');
      return;
    }
    const chosen = verses
      .filter(v => selectedVerses.has(v.verse))
      .sort((a, b) => a.verse - b.verse);
    if (chosen.length === 0) return;
    const nums = chosen.map(v => v.verse);
    // Build a compact reference like "John 3:16-18, 20"
    const ranges: string[] = [];
    let start = nums[0], prev = nums[0];
    for (let i = 1; i < nums.length; i++) {
      if (nums[i] === prev + 1) { prev = nums[i]; continue; }
      ranges.push(start === prev ? `${start}` : `${start}-${prev}`);
      start = nums[i]; prev = nums[i];
    }
    ranges.push(start === prev ? `${start}` : `${start}-${prev}`);
    const book = chosen[0].book_name;
    const chapter = chosen[0].chapter;
    const header = `${book} ${chapter}:${ranges.join(', ')} (${version.toUpperCase()})`;
    const body = chosen.map(v => `${v.verse} ${v.text.trim()}`).join(' ');
    navigator.clipboard.writeText(`${header}\n${body}`);
    toast.success(`Copied ${chosen.length} verse${chosen.length > 1 ? 's' : ''}`);
    exitSelectMode();
  };

  const books = BIBLE_BOOKS.filter(b => b.testament === testament);
  const currentBook = BIBLE_BOOKS.find(b => b.name === selectedBook);
  const { isPlaying, currentVerseIndex, toggle, stop } = useChapterAudio(verses);
  const { recordReading } = useReadingStreak();
  const { recordChapter, isChapterRead, bookStats } = useReadingHistory();
  const { savePosition } = useLastRead();

  const goNextChapter = useCallback(() => {
    if (!currentBook || selectedChapter >= currentBook.chapters) return;
    stop();
    setSelectedChapter(prev => prev + 1);
    setVerses([]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentBook, selectedChapter, stop]);

  const goPrevChapter = useCallback(() => {
    if (selectedChapter <= 1) return;
    stop();
    setSelectedChapter(prev => prev - 1);
    setVerses([]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [selectedChapter, stop]);

  const swipeHandlers = useSwipeGesture(goNextChapter, goPrevChapter);

  useEffect(() => {
    if (hasRestoredRef.current) return;
    const bookParam = searchParams.get('book');
    const chapterParam = searchParams.get('chapter');
    if (bookParam && chapterParam) {
      const bookExists = BIBLE_BOOKS.find(b => b.name === bookParam);
      const ch = parseInt(chapterParam, 10);
      if (bookExists && ch > 0 && ch <= bookExists.chapters) {
        setSelectedBook(bookParam);
        setSelectedChapter(ch);
        setTestament(bookExists.testament);
        setView('reading');
        const verseParam = searchParams.get('verse');
        if (verseParam) {
          const v = parseInt(verseParam, 10);
          if (v > 0) setTargetVerse(v);
        }
        setSearchParams({}, { replace: true });
      }
    }
    hasRestoredRef.current = true;
  }, [searchParams, setSearchParams]);

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
      .then(data => {
        if (!cancelled && data.verses) {
          setVerses(data.verses);
          recordReading();
          recordChapter(selectedBook, selectedChapter);
          savePosition(selectedBook, selectedChapter);
        }
      })
      .catch(err => { if (!cancelled) { console.error('Bible API error:', err); toast.error('Could not load verses.'); } })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [selectedBook, selectedChapter, version, view]);

  // Scroll to and briefly highlight the target verse after verses load
  useEffect(() => {
    if (!targetVerse || verses.length === 0) return;
    const tryScroll = () => {
      const el = verseRefs.current[targetVerse];
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const clearTimer = setTimeout(() => setTargetVerse(null), 2500);
        return () => clearTimeout(clearTimer);
      }
    };
    const t = setTimeout(tryScroll, 100);
    return () => clearTimeout(t);
  }, [targetVerse, verses]);

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
      <div className="flex items-center gap-2 mb-5">
        {view !== 'books' && (
          <button
            onClick={() => { stop(); setView(view === 'reading' ? 'chapters' : 'books'); setVerses([]); }}
            className="p-2 rounded-xl hover:bg-secondary/80 text-foreground transition-all active:scale-95"
          >
            <ChevronLeft size={20} />
          </button>
        )}
        <h2 className="font-display text-xl font-bold text-foreground tracking-tight">
          {view === 'books' && 'Select a Book'}
          {view === 'chapters' && selectedBook}
          {view === 'reading' && `${selectedBook} ${selectedChapter}`}
        </h2>
        <div className="ml-auto flex items-center gap-2">
          {view === 'reading' && verses.length > 0 && (
            <button
              onClick={toggle}
              className={`p-2 rounded-xl transition-all active:scale-95 ${isPlaying ? 'bg-primary text-primary-foreground shadow-sm' : 'hover:bg-secondary/80 text-muted-foreground'}`}
              title={isPlaying ? 'Stop reading' : 'Read chapter aloud'}
            >
              {isPlaying ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
          )}
          <div className="relative" ref={versionRef}>
            <button
              onClick={() => setShowVersionPicker(prev => !prev)}
              className="flex items-center gap-1 text-xs bg-secondary/80 text-secondary-foreground px-3 py-1.5 rounded-full hover:bg-primary/10 hover:text-primary transition-all cursor-pointer font-semibold active:scale-95"
            >
              {version.toUpperCase()}
              <ChevronDown size={12} />
            </button>

            <AnimatePresence>
              {showVersionPicker && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-2 z-50 bg-card/95 backdrop-blur-xl border border-border/60 rounded-xl shadow-xl overflow-hidden min-w-[200px]"
                >
                  {BIBLE_VERSIONS.map(v => (
                    <button
                      key={v.id}
                      onClick={() => { setVersion(v.id); setShowVersionPicker(false); }}
                      className={`w-full text-left px-4 py-2.5 text-sm flex items-center justify-between hover:bg-secondary/50 transition-colors ${
                        version === v.id ? 'bg-primary/10 text-primary font-semibold' : 'text-card-foreground'
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
          {view === 'reading' && verses.length > 0 && (
            <button
              onClick={() => { if (selectMode) exitSelectMode(); else setSelectMode(true); }}
              className={`p-2 rounded-xl transition-all active:scale-95 ${selectMode ? 'bg-primary text-primary-foreground shadow-sm' : 'hover:bg-secondary/80 text-muted-foreground'}`}
              title={selectMode ? 'Cancel selection' : 'Select multiple verses'}
            >
              {selectMode ? <X size={18} /> : <CheckSquare size={18} />}
            </button>
          )}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {view === 'books' && (
          <motion.div key="books" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} transition={{ duration: 0.2 }}>
            <ReadingStats />
            <div className="flex gap-2 mb-5">
              {(['OT', 'NT'] as const).map(t => (
                <button key={t} onClick={() => setTestament(t)}
                  className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95 ${
                    testament === t ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-secondary/60 text-secondary-foreground hover:bg-secondary'
                  }`}
                >
                  {t === 'OT' ? 'Old Testament' : 'New Testament'}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {books.map(book => {
                const stats = bookStats[book.name];
                const readCount = stats?.read || 0;
                const isComplete = readCount === book.chapters;
                return (
                  <motion.button
                    key={book.name}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => { setSelectedBook(book.name); setView('chapters'); }}
                    className={`text-left rounded-xl bg-card border p-3.5 hover:shadow-md transition-all ${isComplete ? 'border-green-500/40' : 'border-border/60'}`}
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-display font-bold text-sm text-card-foreground">{book.name}</p>
                      {isComplete ? (
                        <CheckCircle2 size={14} className="text-green-500" />
                      ) : readCount > 0 ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">
                          {readCount}/{book.chapters}
                        </span>
                      ) : null}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{book.chapters} chapters</p>
                    {readCount > 0 && (
                      <div className="mt-2 h-1 rounded-full bg-border overflow-hidden">
                        <motion.div
                          className={`h-full rounded-full ${isComplete ? 'bg-green-500' : 'bg-primary'}`}
                          initial={{ width: 0 }}
                          animate={{ width: `${(readCount / book.chapters) * 100}%` }}
                          transition={{ duration: 0.6, ease: 'easeOut' }}
                        />
                      </div>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        )}

        {view === 'chapters' && currentBook && (
          <motion.div key="chapters" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} transition={{ duration: 0.2 }}>
            <div className="grid grid-cols-5 sm:grid-cols-8 gap-2.5">
              {Array.from({ length: currentBook.chapters }, (_, i) => i + 1).map(ch => {
                const read = isChapterRead(selectedBook, ch);
                return (
                  <motion.button
                    key={ch}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => { setSelectedChapter(ch); setView('reading'); }}
                    className={`aspect-square rounded-xl border flex items-center justify-center font-display font-bold text-sm transition-all relative ${
                      read
                        ? 'bg-primary/10 border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground'
                        : 'bg-card border-border/60 text-card-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary'
                    }`}
                  >
                    {ch}
                    {read && (
                      <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-green-500" />
                    )}
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        )}

        {view === 'reading' && (
          <motion.div key="reading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} {...swipeHandlers}>
            {loading ? (
              <div className="flex items-center justify-center py-24">
                <Loader2 className="animate-spin text-primary" size={32} />
              </div>
            ) : (
              <div className="space-y-0.5">
                {verses.map((verse, i) => {
                  const verseRef = `${verse.book_name} ${verse.chapter}:${verse.verse}`;
                  const verseNote = getNote(verseRef);
                  const isExpanded = expandedNoteRef === verseRef;
                  const isSelected = selectedVerses.has(verse.verse);
                  return (
                  <motion.div
                    key={i}
                    ref={el => { verseRefs.current[verse.verse] = el; }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.01, duration: 0.3 }}
                    onClick={selectMode ? () => toggleSelectVerse(verse.verse) : undefined}
                    className={`group flex flex-wrap gap-3 p-3 rounded-xl transition-colors ${
                      isVerseSaved(i, 'highlight') ? 'bg-accent/15' : 'hover:bg-secondary/40'
                    } ${currentVerseIndex === i ? 'bg-primary/10 ring-1 ring-primary/30' : ''} ${
                      targetVerse === verse.verse ? 'bg-primary/15 ring-2 ring-primary/50' : ''
                    } ${selectMode ? 'cursor-pointer' : ''} ${
                      isSelected ? 'bg-primary/15 ring-2 ring-primary' : ''
                    }`}
                  >
                    <span className="text-xs font-bold text-primary mt-1 min-w-[24px] tabular-nums">{verse.verse}</span>
                    <p
                      className={`verse-text text-sm flex-1 leading-relaxed ${!selectMode && verseNote ? 'cursor-pointer underline decoration-amber-500/40 decoration-dotted underline-offset-4' : ''}`}
                      onClick={(e) => { if (selectMode) return; if (verseNote) { e.stopPropagation(); setExpandedNoteRef(isExpanded ? null : verseRef); } }}
                    >
                      {verse.text}
                    </p>
                    <div className="flex gap-0.5 shrink-0">
                      <div className="hidden sm:flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openShare(i)} className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all" title="Share as image">
                          <Share2 size={14} />
                        </button>
                        <button onClick={() => copyVerse(i)} className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all" title="Copy">
                          <Copy size={14} />
                        </button>
                        <button onClick={() => saveVerse(i, 'bookmark')} className={`p-1.5 rounded-lg transition-all ${isVerseSaved(i, 'bookmark') ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-primary hover:bg-primary/10'}`}>
                          <Bookmark size={14} fill={isVerseSaved(i, 'bookmark') ? 'currentColor' : 'none'} />
                        </button>
                        <button onClick={() => saveVerse(i, 'highlight')} className={`p-1.5 rounded-lg transition-all ${isVerseSaved(i, 'highlight') ? 'text-accent bg-accent/15' : 'text-muted-foreground hover:text-accent hover:bg-accent/10'}`}>
                          <Highlighter size={14} />
                        </button>
                      </div>
                      <button
                        onClick={() => setNoteVerse({ ref: verseRef, text: verse.text })}
                        title={verseNote ? 'Edit note' : 'Add note'}
                        className={`p-1.5 rounded-lg transition-all ${verseNote ? 'text-amber-500 bg-amber-500/10 opacity-100' : 'text-muted-foreground hover:text-amber-500 hover:bg-amber-500/10 opacity-0 group-hover:opacity-100 max-sm:hidden'}`}
                      >
                        <StickyNote size={14} fill={verseNote ? 'currentColor' : 'none'} />
                      </button>
                    </div>
                    <AnimatePresence initial={false}>
                      {isExpanded && verseNote && (
                        <motion.div
                          key="note"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="w-full overflow-hidden"
                        >
                          <div className="mt-2 ml-[36px] rounded-lg border-l-4 border-l-amber-500 bg-amber-500/10 p-3">
                            <div className="flex items-center justify-between gap-2 mb-1.5">
                              <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                                <StickyNote size={12} />
                                <span className="text-[10px] font-bold uppercase tracking-wide">Your Note</span>
                              </div>
                              <button
                                onClick={(e) => { e.stopPropagation(); setNoteVerse({ ref: verseRef, text: verse.text }); }}
                                className="text-[10px] font-semibold text-primary hover:underline"
                              >
                                Edit
                              </button>
                            </div>
                            <p className="text-xs leading-relaxed text-foreground whitespace-pre-wrap">{verseNote.note}</p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                  );
                })}
                {verses.length === 0 && !loading && (
                  <p className="text-center text-muted-foreground py-12 text-sm">No verses found for this chapter.</p>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {shareVerse && (
        <VerseShareCard reference={shareVerse.ref} text={shareVerse.text} version={version} onClose={() => setShareVerse(null)} />
      )}

      <VerseNoteModal
        open={!!noteVerse}
        reference={noteVerse?.ref ?? ''}
        verseText={noteVerse?.text ?? ''}
        onClose={() => setNoteVerse(null)}
      />

      <AnimatePresence>
        {selectMode && view === 'reading' && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-md"
          >
            <div className="flex items-center gap-2 bg-card/95 backdrop-blur-xl border border-border/60 rounded-2xl shadow-xl px-3 py-2">
              <span className="text-sm font-semibold text-foreground px-2">
                {selectedVerses.size} selected
              </span>
              <div className="ml-auto flex items-center gap-1.5">
                {selectedVerses.size > 0 && (
                  <button
                    onClick={() => setSelectedVerses(new Set())}
                    className="text-xs font-semibold text-muted-foreground hover:text-foreground px-2 py-1.5 rounded-lg hover:bg-secondary/60 transition-all"
                  >
                    Clear
                  </button>
                )}
                <button
                  onClick={copySelectedVerses}
                  disabled={selectedVerses.size === 0}
                  className="flex items-center gap-1.5 text-sm font-semibold bg-primary text-primary-foreground px-3 py-1.5 rounded-lg shadow-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-all active:scale-95"
                >
                  <Copy size={14} />
                  Copy
                </button>
                <button
                  onClick={exitSelectMode}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-all"
                  title="Cancel"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
