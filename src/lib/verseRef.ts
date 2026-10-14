import { BIBLE_BOOKS } from '@/data/bibleData';

/** Turn "Psalm 23:1" or "1 Kings 2:3" into a book the reader knows. */
export function parseVerseRef(ref: string): { book: string; chapter: number; verse: number } | null {
  const match = ref.match(/^(.+?)\s+(\d+):(\d+)/);
  if (!match) return null;
  const bookRaw = match[1].trim().toLowerCase();
  const chapter = parseInt(match[2], 10);
  const verse = parseInt(match[3], 10);
  const book = BIBLE_BOOKS.find(item => item.name.toLowerCase() === bookRaw)
    || BIBLE_BOOKS.find(item => item.name.toLowerCase().startsWith(bookRaw))
    || BIBLE_BOOKS.find(item => bookRaw.startsWith(item.name.toLowerCase()));
  if (!book) return null;
  return { book: book.name, chapter, verse };
}

export function versePath(ref: string): string | null {
  const parsed = parseVerseRef(ref);
  if (!parsed) return null;
  return `/read?book=${encodeURIComponent(parsed.book)}&chapter=${parsed.chapter}&verse=${parsed.verse}`;
}
