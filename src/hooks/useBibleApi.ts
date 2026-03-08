// Primary API for KJV, ASV, DRA, Darby
const PRIMARY_API = 'https://dailybible.ca';
// Fallback API for WEB, BBE (same response format)
const FALLBACK_API = 'https://bible-api.com';

// Translations served by the fallback API
const FALLBACK_TRANSLATIONS = ['web', 'bbe'];

function getApiBase(translation: string) {
  return FALLBACK_TRANSLATIONS.includes(translation) ? FALLBACK_API : PRIMARY_API;
}

function buildUrl(apiBase: string, reference: string, translation: string) {
  if (apiBase === FALLBACK_API) {
    return `${apiBase}/${encodeURIComponent(reference)}?translation=${translation}`;
  }
  return `${apiBase}/api/${encodeURIComponent(reference)}?translation=${translation}`;
}

export interface BibleVerse {
  book_id: string;
  book_name: string;
  chapter: number;
  verse: number;
  text: string;
}

export interface ChapterResponse {
  reference: string;
  verses: BibleVerse[];
  text: string;
  translation_id: string;
  translation_name: string;
}

export interface SearchResult {
  reference: string;
  book_name: string;
  chapter: number;
  verse: number;
  text: string;
}

export interface SearchResponse {
  query: string;
  results: SearchResult[];
  count: number;
}

// ─── API.Bible support ───────────────────────────────────────
import { isApiBibleTranslation, API_BIBLE_TRANSLATIONS, BOOK_NAME_TO_API_BIBLE_ID, isNltTranslation } from '@/data/apiBibleMapping';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

async function callEdgeFunction(params: Record<string, string>): Promise<any> {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${SUPABASE_URL}/functions/v1/bible-api-proxy?${qs}`, {
    headers: {
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Edge function error ${res.status}: ${body}`);
  }
  return res.json();
}

/**
 * Fetch a chapter from API.Bible and normalise to our ChapterResponse format.
 */
async function fetchChapterFromApiBible(book: string, chapter: number, translation: string): Promise<ChapterResponse> {
  const config = API_BIBLE_TRANSLATIONS[translation];
  const bookId = BOOK_NAME_TO_API_BIBLE_ID[book];
  if (!config || !bookId) throw new Error(`Unknown API.Bible translation or book: ${translation} / ${book}`);

  const chapterId = `${bookId}.${chapter}`;

  // First get verse list for the chapter
  const versesData = await callEdgeFunction({
    action: 'verses',
    bibleId: config.bibleId,
    chapterId,
  });

  const verseItems: any[] = versesData?.data || [];

  // Fetch each verse's content in parallel (API.Bible verses endpoint only gives references)
  // To avoid too many calls, fetch the chapter content as a whole and parse
  const chapterData = await callEdgeFunction({
    action: 'chapter',
    bibleId: config.bibleId,
    chapterId,
  });

  const chapterContent: string = chapterData?.data?.content || '';
  // API.Bible returns text content — split by verse markers or use verse list
  // Build verse objects from the verse list with text from chapter content
  const verses: BibleVerse[] = [];

  if (verseItems.length > 0) {
    // Fetch individual verse texts in batches
    const BATCH = 10;
    for (let i = 0; i < verseItems.length; i += BATCH) {
      const batch = verseItems.slice(i, i + BATCH);
      const results = await Promise.allSettled(
        batch.map(v =>
          callEdgeFunction({
            action: 'verse',
            bibleId: config.bibleId,
            verseId: v.id,
          })
        )
      );
      for (let j = 0; j < results.length; j++) {
        const r = results[j];
        const verseInfo = batch[j];
        const verseNum = parseInt(verseInfo.id.split('.').pop() || '0', 10);
        let text = '';
        if (r.status === 'fulfilled' && r.value?.data?.content) {
          text = r.value.data.content.replace(/<[^>]+>/g, '').trim();
        }
        verses.push({
          book_id: bookId,
          book_name: book,
          chapter,
          verse: verseNum,
          text,
        });
      }
    }
  }

  // Fallback: if we got no individual verses but have chapter content
  if (verses.length === 0 && chapterContent) {
    const cleanText = chapterContent.replace(/<[^>]+>/g, '').trim();
    verses.push({
      book_id: bookId,
      book_name: book,
      chapter,
      verse: 1,
      text: cleanText,
    });
  }

  return {
    reference: `${book} ${chapter}`,
    verses,
    text: verses.map(v => v.text).join(' '),
    translation_id: translation,
    translation_name: config.name,
  };
}

async function searchApiBible(query: string, translation: string, limit: number): Promise<SearchResponse> {
  const config = API_BIBLE_TRANSLATIONS[translation];
  if (!config) throw new Error(`Unknown API.Bible translation: ${translation}`);

  const data = await callEdgeFunction({
    action: 'search',
    bibleId: config.bibleId,
    query,
  });

  const passages: any[] = data?.data?.passages || [];
  const verses: any[] = data?.data?.verses || [];
  const results: SearchResult[] = [];

  for (const v of verses.slice(0, limit)) {
    const text = (v.text || '').replace(/<[^>]+>/g, '').trim();
    results.push({
      reference: v.reference || '',
      book_name: v.bookId || '',
      chapter: parseInt(v.chapterId?.split('.').pop() || '0', 10),
      verse: parseInt(v.id?.split('.').pop() || '0', 10),
      text,
    });
  }

  return {
    query,
    results,
    count: data?.data?.total || results.length,
  };
}

// ─── NLT API support ────────────────────────────────────────

async function callNltProxy(params: Record<string, string>): Promise<any> {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${SUPABASE_URL}/functions/v1/nlt-api-proxy?${qs}`, {
    headers: {
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`NLT proxy error ${res.status}: ${body}`);
  }
  return res.json();
}

async function fetchChapterFromNlt(book: string, chapter: number): Promise<ChapterResponse> {
  const data = await callNltProxy({ action: 'chapter', book, chapter: String(chapter) });
  return {
    reference: data.reference || `${book} ${chapter}`,
    verses: data.verses || [],
    text: data.text || '',
    translation_id: 'nlt',
    translation_name: 'New Living Translation',
  };
}

async function searchNlt(query: string, limit: number): Promise<SearchResponse> {
  const data = await callNltProxy({ action: 'search', query });
  return {
    query,
    results: (data.results || []).slice(0, limit),
    count: data.count || 0,
  };
}

// ─── Public API ──────────────────────────────────────────────

export async function fetchChapter(book: string, chapter: number, translation: string = 'kjv'): Promise<ChapterResponse> {
  if (isNltTranslation(translation)) {
    return fetchChapterFromNlt(book, chapter);
  }
  if (isApiBibleTranslation(translation)) {
    return fetchChapterFromApiBible(book, chapter, translation);
  }
  const reference = `${book} ${chapter}`;
  const apiBase = getApiBase(translation);
  const url = buildUrl(apiBase, reference, translation);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch chapter: ${res.status}`);
  return res.json();
}

export async function searchBible(query: string, translation: string = 'kjv', limit: number = 50): Promise<SearchResponse> {
  if (isNltTranslation(translation)) {
    return searchNlt(query, limit);
  }
  if (isApiBibleTranslation(translation)) {
    return searchApiBible(query, translation, limit);
  }
  const apiBase = getApiBase(translation);
  if (apiBase === FALLBACK_API) {
    const url = `${PRIMARY_API}/api/search?q=${encodeURIComponent(query)}&translation=kjv&limit=${limit}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to search: ${res.status}`);
    return res.json();
  }
  const url = `${PRIMARY_API}/api/search?q=${encodeURIComponent(query)}&translation=${translation}&limit=${limit}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to search: ${res.status}`);
  return res.json();
}

export async function fetchVerse(ref: string, translation: string = 'kjv'): Promise<ChapterResponse> {
  if (isNltTranslation(translation)) {
    const match = ref.match(/^(.+?)\s+(\d+):(\d+)$/);
    if (match) {
      const [, book, ch] = match;
      return fetchChapterFromNlt(book, parseInt(ch, 10));
    }
    throw new Error(`Cannot parse verse reference for NLT: ${ref}`);
  }
  if (isApiBibleTranslation(translation)) {
    const match = ref.match(/^(.+?)\s+(\d+):(\d+)$/);
    if (match) {
      const [, book, ch] = match;
      return fetchChapterFromApiBible(book, parseInt(ch, 10), translation);
    }
    throw new Error(`Cannot parse verse reference for API.Bible: ${ref}`);
  }
  const apiBase = getApiBase(translation);
  const url = buildUrl(apiBase, ref, translation);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch verse: ${res.status}`);
  return res.json();
}
