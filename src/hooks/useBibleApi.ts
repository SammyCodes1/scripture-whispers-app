const BIBLE_API_BASE = 'https://dailybible.ca';

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
  const url = `${BIBLE_API_BASE}/api/${encodeURIComponent(reference)}?translation=${translation}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch chapter: ${res.status}`);
  return res.json();
}

export async function searchBible(query: string, translation: string = 'kjv', limit: number = 50): Promise<SearchResponse> {
  const url = `${BIBLE_API_BASE}/api/search?q=${encodeURIComponent(query)}&translation=${translation}&limit=${limit}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to search: ${res.status}`);
  return res.json();
}

export async function fetchVerse(ref: string, translation: string = 'kjv'): Promise<ChapterResponse> {
  const url = `${BIBLE_API_BASE}/api/${encodeURIComponent(ref)}?translation=${translation}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch verse: ${res.status}`);
  return res.json();
}
