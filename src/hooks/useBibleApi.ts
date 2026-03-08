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

export async function fetchChapter(book: string, chapter: number, translation: string = 'kjv'): Promise<ChapterResponse> {
  const reference = `${book} ${chapter}`;
  const apiBase = getApiBase(translation);
  const url = buildUrl(apiBase, reference, translation);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch chapter: ${res.status}`);
  return res.json();
}

export async function searchBible(query: string, translation: string = 'kjv', limit: number = 50): Promise<SearchResponse> {
  const apiBase = getApiBase(translation);
  if (apiBase === FALLBACK_API) {
    // bible-api.com doesn't have a search endpoint, fall back to primary
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
  const apiBase = getApiBase(translation);
  const url = buildUrl(apiBase, ref, translation);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch verse: ${res.status}`);
  return res.json();
}
