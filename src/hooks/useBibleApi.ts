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


// Some books fail on the primary chapter endpoint even though the translation exists there.
const PRIMARY_API_FALLBACK_BOOKS = new Set(['Song of Solomon']);

function resolveContentApiBase(book: string, translation: string) {
  const apiBase = getApiBase(translation);
  return apiBase === PRIMARY_API && PRIMARY_API_FALLBACK_BOOKS.has(book)
    ? FALLBACK_API
    : apiBase;
}

function normalizeChapterResponse(data: ChapterResponse, book: string, reference: string): ChapterResponse {
  if (data.verses) {
    data.verses = data.verses.map(verse =>
      verse.book_name === book ? verse : { ...verse, book_name: book }
    );
  }
  data.reference = reference;
  return data;
}

function getBookFromReference(reference: string) {
  return reference.replace(/\s+\d+(?::\d+(?:-\d+)?)?$/, '');
}

// ─── Public API ──────────────────────────────────────────────

export async function fetchChapter(book: string, chapter: number, translation: string = 'kjv'): Promise<ChapterResponse> {
  const apiBase = resolveContentApiBase(book, translation);
  const reference = `${book} ${chapter}`;
  const url = buildUrl(apiBase, reference, translation);
  const res = await fetch(url);

  if (!res.ok) throw new Error(`Failed to fetch chapter: ${res.status}`);

  const data: ChapterResponse = await res.json();
  return normalizeChapterResponse(data, book, reference);
}

export async function searchBible(query: string, translation: string = 'kjv', limit: number = 50): Promise<SearchResponse> {
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
  const book = getBookFromReference(ref);
  const apiBase = resolveContentApiBase(book, translation);
  const url = buildUrl(apiBase, ref, translation);
  const res = await fetch(url);

  if (!res.ok) throw new Error(`Failed to fetch verse: ${res.status}`);

  const data: ChapterResponse = await res.json();
  return normalizeChapterResponse(data, book, ref);
}
