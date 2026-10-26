import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Bookmark, Highlighter, Loader2, Copy, Share2, Volume2, VolumeX, ChevronDown, CheckCircle2, StickyNote, CheckSquare, X } from 'lucide-react';
import VerseNoteModal from '@/components/VerseNoteModal';
import { useNotes } from '@/hooks/useNotes';

import { BIBLE_BOOKS } from '@/data/bibleData';
import { BIBLE_VERSIONS, useTheme } from '@/contexts/ThemeContext';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { SAVED_VERSES_KEY } from '@/lib/verseLibrary';
import { isLicensedTranslation, type BibleVerse } from '@/hooks/useBibleApi';
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
  const [savedVerses, setSavedVerses] = useLocalStorage<SavedVerse[]>(SAVED_VERSES_KEY, []);
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
  const [compareVersion, setCompareVersion] = useLocalStorage<string>('hw-compare-version', '');
  const [compareTexts, setCompareTexts] = useState<Record<number, string>>({});
  const [compareLoading, setCompareLoading] = useState(false);

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

  const buildSelection = () => {
    if (selectedVerses.size === 0) return null;
    const chosen = verses
      .filter(v => selectedVerses.has(v.verse))
      .sort((a, b) => a.verse - b.verse);
    if (chosen.length === 0) return null;
    const nums = chosen.map(v => v.verse);
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
    const ref = `${book} ${chapter}:${ranges.join(', ')}`;
    const text = chosen.length === 1
      ? chosen[0].text.trim()
      : chosen.map(v => `${v.verse} ${v.text.trim()}`).join(' ');
    return { ref, text, count: chosen.length };
  };

  const copySelectedVerses = () => {
    const sel = buildSelection();
    if (!sel) { toast.info('Select at least one verse'); return; }
    navigator.clipboard.writeText(`${sel.ref} (${version.toUpperCase()})\n${sel.text}`);
    toast.success(`Copied ${sel.count} verse${sel.count > 1 ? 's' : ''}`);
    exitSelectMode();
  };

  const shareSelectedVerses = () => {
    const sel = buildSelection();
    if (!sel) { toast.info('Select at least one verse'); return; }
    setShareVerse({ ref: sel.ref, text: sel.text });
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
      .catch(err => { if (!cancelled) { console.error('Bible API error:', err); toast.error(isLicensedTranslation(version) ? 'This chapter is not on this phone yet. Open it while you are online, and it stays for 30 days.' : 'Could not load verses.'); } })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [selectedBook, selectedChapter, version, view]);

  useEffect(() => {
    if (compareVersion && (compareVersion === version || !BIBLE_VERSIONS.some(item => item.id === compareVersion))) {
      setCompareVersion('');
    }
  }, [compareVersion, version, setCompareVersion]);

  useEffect(() => {
    if (!selectedBook || !selectedChapter || view !== 'reading' || !compareVersion || compareVersion === version) {
      setCompareTexts({});
      setCompareLoading(false);
      return;
    }
    let cancelled = false;
    setCompareLoading(true);
    fetchChapterCached(selectedBook, selectedChapter, compareVersion)
      .then(data => {
        if (cancelled) return;
        const next: Record<number, string> = {};
        for (const item of data.verses || []) next[item.verse] = item.text;
        setCompareTexts(next);
      })
      .catch(err => {
        if (!cancelled) {
          console.error('Comparison load error:', err);
          setCompareTexts({});
          toast.error(isLicensedTranslation(compareVersion) ? 'This comparison chapter is not on this phone yet. Open it while you are online, and it stays for 30 days.' : 'Could not load the comparison.');
        }
      })
      .finally(() => { if (!cancelled) setCompareLoading(false); });
    return () => { cancelled = true; };
  }, [selectedBook, selectedChapter, compareVersion, version, view]);

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
    const other = compareVersion ? compareTexts[verse.verse] : '';
    const body = other
      ? `${verse.text.trim()}\n\n${compareVersion.toUpperCase()}\n${other.trim()}`
      : verse.text;
    navigator.clipboard.writeText(`${verse.book_name} ${verse.chapter}:${verse.verse} (${version.toUpperCase()})\n${body}`);
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
      <div className="mb-5 flex min-w-0 items-center gap-2">
        {view !== 'books' && (
          <button
            onClick={() => { stop(); setView(view === 'reading' ? 'chapters' : 'books'); setVerses([]); }}
            className="shrink-0 p-2 rounded-xl hover:bg-secondary/80 text-foreground transition-all active:scale-95"
          >
            <ChevronLeft size={20} />
          </button>
        )}
        <h2 className="min-w-0 flex-1 truncate font-display text-lg font-bold tracking-tight text-foreground sm:text-xl">
          {view === 'books' && 'Select a Book'}
          {view === 'chapters' && selectedBook}
          {view === 'reading' && `${selectedBook} ${selectedChapter}`}
        </h2>
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
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
                  className="absolute right-0 top-full mt-2 z-50 max-h-[min(22rem,calc(100dvh-9rem))] w-[min(16rem,calc(100vw-2rem))] overflow-y-auto rounded-xl border border-border/60 bg-card/95 shadow-xl backdrop-blur-xl"
                >
                  {BIBLE_VERSIONS.map(v => (
                    <button
                      key={v.id}
                      onClick={() => { setVersion(v.id); setShowVersionPicker(false); }}
                      className={`flex w-full flex-col items-start px-4 py-2.5 text-left text-sm transition-colors hover:bg-secondary/50 ${
                        version === v.id ? 'bg-primary/10 text-primary font-semibold' : 'text-card-foreground'
                      }`}
                    >
                      <span>{v.name}</span>
                      <span className="text-xs font-normal text-muted-foreground">{v.full}</span>
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

      <div className="mb-4 flex items-center gap-2">
        <span className="shrink-0 text-[11px] font-medium text-muted-foreground">Version</span>
        <div className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto scrollbar-hide">
          {BIBLE_VERSIONS.map(v => (
            <button
              key={v.id}
              type="button"
              onClick={() => setVersion(v.id)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition active:scale-95 ${
                version === v.id ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'
              }`}
            >
              {v.name}
            </button>
          ))}
        </div>
      </div>

      {view === 'reading' && (
        <div className="mb-4 flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-medium text-muted-foreground">Compare</span>
          <button
            type="button"
            onClick={() => setCompareVersion('')}
            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition active:scale-95 ${
              !compareVersion ? 'bg-primary text-primary-foreground' : 'bg-secondary/70 text-secondary-foreground'
            }`}
          >
            Off
          </button>
          {BIBLE_VERSIONS.filter(item => item.id !== version).map(item => (
            <button
              key={item.id}
              type="button"
              onClick={() => setCompareVersion(item.id)}
              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition active:scale-95 ${
                compareVersion === item.id ? 'bg-primary text-primary-foreground' : 'bg-secondary/70 text-secondary-foreground'
              }`}
            >
              {item.name}
            </button>
          ))}
          {compareLoading && <span className="text-[11px] text-muted-foreground">Loading…</span>}
        </div>
      )}

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
              <div className={`space-y-0.5 ${selectMode ? 'pb-28' : ''}`}>
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
                    className={`group flex w-full min-w-0 max-w-full flex-wrap gap-3 rounded-xl p-3 transition-colors ${
                      isVerseSaved(i, 'highlight') ? 'verse-highlight' : 'hover:bg-secondary/40'
                    } ${currentVerseIndex === i ? 'ring-1 ring-inset ring-primary/30' : ''} ${
                      targetVerse === verse.verse ? 'ring-2 ring-inset ring-primary/50' : ''
                    } ${selectMode ? 'cursor-pointer' : ''} ${
                      isSelected ? 'bg-primary/15 ring-2 ring-inset ring-primary' : ''
                    }`}
                  >
                    <span className="mt-1 min-w-[24px] shrink-0 text-xs font-bold tabular-nums text-primary">{verse.verse}</span>
                    <div className={`min-w-0 flex-1 basis-0 ${compareVersion ? 'sm:grid sm:grid-cols-2 sm:gap-4' : ''}`}>
                      <div className="min-w-0">
                        {compareVersion && (
                          <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-primary">{version.toUpperCase()}</p>
                        )}
                        <p
                          className={`verse-text break-words text-sm leading-relaxed ${isVerseSaved(i, 'highlight') ? 'verse-mark' : ''} ${!selectMode && verseNote ? 'cursor-pointer underline decoration-note/50 decoration-dotted underline-offset-4' : ''}`}
                          onClick={(e) => { if (selectMode) return; if (verseNote) { e.stopPropagation(); setExpandedNoteRef(isExpanded ? null : verseRef); } }}
                        >
                          {verse.text}
                        </p>
                      </div>
                      {compareVersion && (
                        <div className="mt-2 min-w-0 border-t border-border/50 pt-2 sm:mt-0 sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0">
                          <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{compareVersion.toUpperCase()}</p>
                          <p className="verse-text break-words text-sm leading-relaxed text-muted-foreground">
                            {compareTexts[verse.verse] || (compareLoading ? '…' : 'This verse is not in that translation.')}
                          </p>
                        </div>
                      )}
                    </div>
                    {!selectMode && (
                      <div
                        className={`flex w-full basis-full justify-end gap-0.5 sm:w-auto sm:basis-auto sm:shrink-0 ${
                          verseNote ? 'opacity-100' : 'opacity-100 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100'
                        }`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button onClick={() => openShare(i)} className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all" title="Share as image" aria-label="Share verse">
                          <Share2 size={14} />
                        </button>
                        <button onClick={() => copyVerse(i)} className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all" title="Copy" aria-label="Copy verse">
                          <Copy size={14} />
                        </button>
                        <button onClick={() => saveVerse(i, 'bookmark')} className={`p-1.5 rounded-lg transition-all ${isVerseSaved(i, 'bookmark') ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-primary hover:bg-primary/10'}`} title="Bookmark" aria-label="Bookmark verse">
                          <Bookmark size={14} fill={isVerseSaved(i, 'bookmark') ? 'currentColor' : 'none'} />
                        </button>
                        <button onClick={() => saveVerse(i, 'highlight')} className={`p-1.5 rounded-lg transition-all ${isVerseSaved(i, 'highlight') ? 'text-accent-ink bg-highlight/20' : 'text-muted-foreground hover:text-accent-ink hover:bg-highlight/15'}`} title="Highlight" aria-label="Highlight verse">
                          <Highlighter size={14} />
                        </button>
                        <button
                          onClick={() => setNoteVerse({ ref: verseRef, text: verse.text })}
                          title={verseNote ? 'Edit note' : 'Add note'}
                          aria-label={verseNote ? 'Edit note' : 'Add note'}
                          className={`p-1.5 rounded-lg transition-all ${verseNote ? 'text-note bg-note/10' : 'text-muted-foreground hover:text-note hover:bg-note/10'}`}
                        >
                          <StickyNote size={14} fill={verseNote ? 'currentColor' : 'none'} />
                        </button>
                      </div>
                    )}
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
                          <div className="mt-2 ml-[36px] rounded-lg border-l-4 border-l-note bg-note/10 p-3">
                            <div className="flex items-center justify-between gap-2 mb-1.5">
                              <div className="flex items-center gap-1.5 text-note">
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
                {verses.length > 0 && (() => {
                  const current = BIBLE_VERSIONS.find(item => item.id === version);
                  const notice = current && 'notice' in current ? current.notice : '';
                  return notice ? (
                    <p className="mt-8 text-[10px] leading-relaxed text-muted-foreground">{notice}</p>
                  ) : null;
                })()}
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
            className="fixed inset-x-3 bottom-20 z-50 mx-auto w-auto max-w-md"
          >
            <div className="rounded-2xl border border-border/60 bg-card/95 px-3 py-2.5 shadow-xl backdrop-blur-xl">
              <div className="flex items-center gap-2">
                <span className="min-w-0 truncate text-sm font-semibold text-foreground">
                  {selectedVerses.size} selected
                </span>
                <div className="ml-auto hidden items-center gap-1.5 sm:flex">
                  {selectedVerses.size > 0 && (
                    <button
                      onClick={() => setSelectedVerses(new Set())}
                      className="rounded-lg px-2 py-1.5 text-xs font-semibold text-muted-foreground transition-all hover:bg-secondary/60 hover:text-foreground"
                    >
                      Clear
                    </button>
                  )}
                  <button
                    onClick={copySelectedVerses}
                    disabled={selectedVerses.size === 0}
                    className="flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-1.5 text-sm font-semibold text-secondary-foreground transition-all hover:bg-secondary/80 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Copy size={14} />
                    Copy
                  </button>
                  <button
                    onClick={shareSelectedVerses}
                    disabled={selectedVerses.size === 0}
                    className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Share2 size={14} />
                    Share
                  </button>
                  <button
                    onClick={exitSelectMode}
                    className="rounded-lg p-1.5 text-muted-foreground transition-all hover:bg-secondary/60 hover:text-foreground"
                    title="Cancel"
                  >
                    <X size={16} />
                  </button>
                </div>
                <button
                  onClick={exitSelectMode}
                  className="ml-auto shrink-0 rounded-lg p-1.5 text-muted-foreground transition-all hover:bg-secondary/60 hover:text-foreground sm:hidden"
                  title="Cancel"
                >
                  <X size={16} />
                </button>
              </div>
              <div className={`mt-2 grid gap-1.5 sm:hidden ${selectedVerses.size > 0 ? 'grid-cols-3' : 'grid-cols-2'}`}>
                {selectedVerses.size > 0 && (
                  <button
                    onClick={() => setSelectedVerses(new Set())}
                    className="min-w-0 rounded-lg px-2 py-2 text-xs font-semibold text-muted-foreground transition-all hover:bg-secondary/60 hover:text-foreground"
                  >
                    Clear
                  </button>
                )}
                <button
                  onClick={copySelectedVerses}
                  disabled={selectedVerses.size === 0}
                  className="flex min-w-0 items-center justify-center gap-1.5 rounded-lg bg-secondary px-2 py-2 text-xs font-semibold text-secondary-foreground transition-all hover:bg-secondary/80 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Copy size={14} className="shrink-0" />
                  Copy
                </button>
                <button
                  onClick={shareSelectedVerses}
                  disabled={selectedVerses.size === 0}
                  className="flex min-w-0 items-center justify-center gap-1.5 rounded-lg bg-primary px-2 py-2 text-xs font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Share2 size={14} className="shrink-0" />
                  Share
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
