// Primary API for KJV, ASV, DRA, Darby
const PRIMARY_API = 'https://dailybible.ca';
// Fallback API for WEB, BBE (same response format)
const FALLBACK_API = 'https://bible-api.com';
// NIV, NLT, and AMP are served via the edge function, which holds the API.Bible key.
// The function name still says bible-msg; that path is the licensed-text proxy.
const LICENSED_FN_URL = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/bible-msg`;
const LICENSED_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
const LICENSED_HEADERS = { apikey: LICENSED_KEY, Authorization: `Bearer ${LICENSED_KEY}` };
const LICENSED_TRANSLATIONS = new Set(['niv', 'nlt', 'amp']);

// Translations served by the fallback API
const FALLBACK_TRANSLATIONS = ['web', 'bbe'];

export function isLicensedTranslation(translation: string) {
  return LICENSED_TRANSLATIONS.has(translation);
}

function acknowledgeFums(fums?: string) {
  if (!fums || typeof Image === 'undefined') return;
  const img = new Image();
  img.referrerPolicy = 'no-referrer';
  img.src = fums;
}

function withoutFums<T extends { fums?: string }>(data: T): Omit<T, 'fums'> {
  acknowledgeFums(data.fums);
  const { fums: _fums, ...rest } = data;
  return rest;
}

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
  /** Present only on a live licensed response. Stripped before the chapter is cached. */
  fums?: string;
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

export async function fetchChapter(
  book: string,
  chapter: number,
  translation: string = 'kjv',
  signal?: AbortSignal
): Promise<ChapterResponse> {
  if (isLicensedTranslation(translation)) {
    const url = `${LICENSED_FN_URL}?action=chapter&translation=${encodeURIComponent(translation)}&book=${encodeURIComponent(book)}&chapter=${chapter}`;
    const res = await fetch(url, { signal, headers: LICENSED_HEADERS });
    if (!res.ok) throw new Error(`Failed to fetch chapter: ${res.status}`);
    return withoutFums(await res.json());
  }
  const apiBase = resolveContentApiBase(book, translation);
  const reference = `${book} ${chapter}`;
  const url = buildUrl(apiBase, reference, translation);
  const res = await fetch(url, { signal });

  if (!res.ok) throw new Error(`Failed to fetch chapter: ${res.status}`);

  const data: ChapterResponse = await res.json();
  return normalizeChapterResponse(data, book, reference);
}

export async function searchBible(query: string, translation: string = 'kjv', limit: number = 50): Promise<SearchResponse> {
  if (isLicensedTranslation(translation)) {
    const url = `${LICENSED_FN_URL}?action=search&translation=${encodeURIComponent(translation)}&q=${encodeURIComponent(query)}&limit=${limit}`;
    const res = await fetch(url, { headers: LICENSED_HEADERS });
    if (!res.ok) throw new Error(`Failed to search: ${res.status}`);
    const data = await res.json();
    acknowledgeFums(data.fums);
    delete data.fums;
    return data;
  }
  const apiBase = getApiBase(translation);
  // bible-api.com has no search. Callers search the downloaded WEB or BBE text.
  if (apiBase === FALLBACK_API) {
    throw new Error('OFFLINE_SEARCH_ONLY');
  }
  const url = `${PRIMARY_API}/api/search?q=${encodeURIComponent(query)}&translation=${translation}&limit=${limit}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to search: ${res.status}`);
  return res.json();
}

export async function fetchVerse(ref: string, translation: string = 'kjv', signal?: AbortSignal): Promise<ChapterResponse> {
  if (isLicensedTranslation(translation)) {
    const url = `${LICENSED_FN_URL}?action=verse&translation=${encodeURIComponent(translation)}&ref=${encodeURIComponent(ref)}`;
    const res = await fetch(url, { signal, headers: LICENSED_HEADERS });
    if (!res.ok) throw new Error(`Failed to fetch verse: ${res.status}`);
    return withoutFums(await res.json());
  }
  const book = getBookFromReference(ref);
  const apiBase = resolveContentApiBase(book, translation);
  const url = buildUrl(apiBase, ref, translation);
  const res = await fetch(url, { signal });

  if (!res.ok) throw new Error(`Failed to fetch verse: ${res.status}`);

  const data: ChapterResponse = await res.json();
  return normalizeChapterResponse(data, book, ref);
}
