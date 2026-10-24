import { BOOK_IDS } from '../../supabase/functions/_shared/bible-core';
import { BSB_NOTICE, FALLBACK_VERSION, isLicensedVersion } from '@/lib/bibleVersions';

// Primary API for KJV, ASV, DRA, Darby
const PRIMARY_API = 'https://dailybible.ca';
// Fallback API for WEB, BBE (same response format)
const FALLBACK_API = 'https://bible-api.com';
// MSG (The Message) is served via our edge function which proxies API.Bible
const MSG_FN_URL = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/bible-msg`;
const MSG_HEADERS = { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string };

// Licensed versions (AMP, NIV, NKJV) come from our `bible-versions` edge function (API.Bible).
// BSB (public domain) comes from the free helloao.org API and is the automatic fallback.
const VERSIONS_FN_URL = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/bible-versions`;
const BSB_API = 'https://bible.helloao.org/api/BSB';

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
  /** Licensed versions only: exact copyright notice to show under the passage. */
  notice?: string;
  /** Licensed versions only: token to report to API.Bible FUMS whenever the passage is shown. */
  fumsToken?: string | null;
  licensed?: boolean;
  /** Set when a licensed version failed and BSB was substituted automatically. */
  fallback?: { from: string; code: string; message: string };
}

export class LicensedVersionError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
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

// ─── Licensed versions + BSB ─────────────────────────────────

const BSB_NAME = 'Berean Standard Bible';

type BsbItem = string | { text?: string; noteId?: number; lineBreak?: boolean };

export function parseBsbChapter(book: string, chapter: number, json: {
  chapter?: { content?: Array<{ type: string; number?: number; content?: BsbItem[] }> };
}): ChapterResponse {
  const verses: BibleVerse[] = [];
  for (const block of json.chapter?.content ?? []) {
    if (block.type !== 'verse' || typeof block.number !== 'number') continue;
    const text = (block.content ?? [])
      .map(c => (typeof c === 'string' ? c : c.text ?? ''))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (text) verses.push({ book_id: BOOK_IDS[book] ?? '', book_name: book, chapter, verse: block.number, text });
  }
  return {
    reference: `${book} ${chapter}`,
    verses,
    text: verses.map(v => v.text).join(' '),
    translation_id: 'bsb',
    translation_name: BSB_NAME,
    notice: BSB_NOTICE,
  };
}

async function fetchBsbChapter(book: string, chapter: number, signal?: AbortSignal): Promise<ChapterResponse> {
  const id = BOOK_IDS[book];
  if (!id) throw new Error(`Unknown book: ${book}`);
  const res = await fetch(`${BSB_API}/${id}/${chapter}.json`, { signal });
  if (!res.ok) throw new Error(`Failed to fetch chapter: ${res.status}`);
  const data = parseBsbChapter(book, chapter, await res.json());
  if (data.verses.length === 0) throw new Error('Empty chapter');
  return data;
}

async function fetchLicensedChapter(book: string, chapter: number, translation: string, signal?: AbortSignal): Promise<ChapterResponse> {
  const url = `${VERSIONS_FN_URL}?version=${encodeURIComponent(translation)}&book=${encodeURIComponent(book)}&chapter=${chapter}`;
  let res: Response;
  try {
    res = await fetch(url, { signal, headers: MSG_HEADERS });
  } catch (err) {
    if ((err as Error)?.name === 'AbortError') throw err;
    throw new LicensedVersionError('network', 'You appear to be offline.');
  }
  if (!res.ok) {
    let body: { error?: string; code?: string } = {};
    try { body = await res.json(); } catch { /* ignore */ }
    throw new LicensedVersionError(body.code || 'upstream', body.error || `Request failed (${res.status})`);
  }
  return res.json();
}

export function friendlyLicensedMessage(code: string): string {
  switch (code) {
    case 'quota': return 'The daily limit for this version has been reached.';
    case 'rate_limited': return 'Too many requests right now.';
    case 'missing_key': return 'This version is not set up yet.';
    case 'network': return 'You appear to be offline.';
    default: return 'This version could not be loaded right now.';
  }
}

// ─── Public API ──────────────────────────────────────────────

export async function fetchChapter(
  book: string,
  chapter: number,
  translation: string = 'kjv',
  signal?: AbortSignal
): Promise<ChapterResponse> {
  if (translation === 'bsb') return fetchBsbChapter(book, chapter, signal);
  if (isLicensedVersion(translation)) {
    try {
      return await fetchLicensedChapter(book, chapter, translation, signal);
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') throw err;
      const code = err instanceof LicensedVersionError ? err.code : 'upstream';
      // Automatic public-domain fallback so reading never dead-ends.
      const bsb = await fetchBsbChapter(book, chapter, signal);
      return { ...bsb, fallback: { from: translation, code, message: friendlyLicensedMessage(code) } };
    }
  }
  if (translation === 'msg') {
    const url = `${MSG_FN_URL}?action=chapter&book=${encodeURIComponent(book)}&chapter=${chapter}`;
    const res = await fetch(url, { signal, headers: MSG_HEADERS });
    if (!res.ok) throw new Error(`Failed to fetch chapter: ${res.status}`);
    return res.json();
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
  // Licensed text can't be searched wholesale (no bulk caching), and BSB has no search endpoint.
  if (isLicensedVersion(translation) || translation === 'bsb') {
    throw new Error('SEARCH_UNSUPPORTED');
  }
  if (translation === 'msg') {
    const url = `${MSG_FN_URL}?action=search&q=${encodeURIComponent(query)}&limit=${limit}`;
    const res = await fetch(url, { headers: MSG_HEADERS });
    if (!res.ok) throw new Error(`Failed to search: ${res.status}`);
    return res.json();
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
  if (translation === 'bsb' || isLicensedVersion(translation)) {
    const m = ref.match(/^(.+?)\s+(\d+):(\d+)(?:-(\d+))?$/);
    if (!m) throw new Error(`Invalid reference: ${ref}`);
    const [, book, chap, a, b] = m;
    const data = await fetchChapter(book, parseInt(chap, 10), translation, signal);
    const start = parseInt(a, 10);
    const end = b ? parseInt(b, 10) : start;
    const verses = data.verses.filter(v => v.verse >= start && v.verse <= end);
    return { ...data, reference: ref, verses, text: verses.map(v => v.text).join(' ') };
  }
  if (translation === 'msg') {
    const url = `${MSG_FN_URL}?action=verse&ref=${encodeURIComponent(ref)}`;
    const res = await fetch(url, { signal, headers: MSG_HEADERS });
    if (!res.ok) throw new Error(`Failed to fetch verse: ${res.status}`);
    return res.json();
  }
  const book = getBookFromReference(ref);
  const apiBase = resolveContentApiBase(book, translation);
  const url = buildUrl(apiBase, ref, translation);
  const res = await fetch(url, { signal });

  if (!res.ok) throw new Error(`Failed to fetch verse: ${res.status}`);

  const data: ChapterResponse = await res.json();
  return normalizeChapterResponse(data, book, ref);
}
