// Proxy for API.Bible (scripture.api.bible) used for The Message (MSG) translation.
// Returns responses normalized to the same shape used elsewhere in the app
// (matching dailybible.ca / bible-api.com format).
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const API_BIBLE_KEY = Deno.env.get('API_BIBLE_KEY');
// The Message (MSG) Bible ID on API.Bible
const MSG_BIBLE_ID = '65eec8e0b60e656b-01';
const API_BASE = 'https://api.scripture.api.bible/v1';

// Map full book name -> API.Bible bookId (OSIS-style 3-letter codes)
const BOOK_ID: Record<string, string> = {
  'Genesis': 'GEN', 'Exodus': 'EXO', 'Leviticus': 'LEV', 'Numbers': 'NUM', 'Deuteronomy': 'DEU',
  'Joshua': 'JOS', 'Judges': 'JDG', 'Ruth': 'RUT',
  '1 Samuel': '1SA', '2 Samuel': '2SA', '1 Kings': '1KI', '2 Kings': '2KI',
  '1 Chronicles': '1CH', '2 Chronicles': '2CH', 'Ezra': 'EZR', 'Nehemiah': 'NEH', 'Esther': 'EST',
  'Job': 'JOB', 'Psalms': 'PSA', 'Psalm': 'PSA', 'Proverbs': 'PRO', 'Ecclesiastes': 'ECC',
  'Song of Solomon': 'SNG', 'Song of Songs': 'SNG',
  'Isaiah': 'ISA', 'Jeremiah': 'JER', 'Lamentations': 'LAM', 'Ezekiel': 'EZK', 'Daniel': 'DAN',
  'Hosea': 'HOS', 'Joel': 'JOL', 'Amos': 'AMO', 'Obadiah': 'OBA', 'Jonah': 'JON', 'Micah': 'MIC',
  'Nahum': 'NAM', 'Habakkuk': 'HAB', 'Zephaniah': 'ZEP', 'Haggai': 'HAG', 'Zechariah': 'ZEC', 'Malachi': 'MAL',
  'Matthew': 'MAT', 'Mark': 'MRK', 'Luke': 'LUK', 'John': 'JHN', 'Acts': 'ACT',
  'Romans': 'ROM', '1 Corinthians': '1CO', '2 Corinthians': '2CO', 'Galatians': 'GAL',
  'Ephesians': 'EPH', 'Philippians': 'PHP', 'Colossians': 'COL',
  '1 Thessalonians': '1TH', '2 Thessalonians': '2TH', '1 Timothy': '1TI', '2 Timothy': '2TI',
  'Titus': 'TIT', 'Philemon': 'PHM', 'Hebrews': 'HEB', 'James': 'JAS',
  '1 Peter': '1PE', '2 Peter': '2PE', '1 John': '1JN', '2 John': '2JN', '3 John': '3JN',
  'Jude': 'JUD', 'Revelation': 'REV',
};

function bookId(name: string): string | null {
  return BOOK_ID[name] ?? BOOK_ID[name.replace(/\s+/g, ' ').trim()] ?? null;
}

// Strip HTML tags & normalize whitespace
function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

async function apiBibleFetch(path: string, query: Record<string, string> = {}) {
  const qs = new URLSearchParams(query).toString();
  const url = `${API_BASE}/bibles/${MSG_BIBLE_ID}${path}${qs ? `?${qs}` : ''}`;
  const res = await fetch(url, { headers: { 'api-key': API_BIBLE_KEY! } });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API.Bible ${res.status}: ${text}`);
  }
  return res.json();
}

async function getChapter(book: string, chapter: number) {
  const id = bookId(book);
  if (!id) throw new Error(`Unknown book: ${book}`);
  const chapterId = `${id}.${chapter}`;
  const data = await apiBibleFetch(`/chapters/${chapterId}/verses`);
  const verseRefs: Array<{ id: string }> = data.data ?? [];

  // Fetch all verses in parallel (chapters typically 5-50 verses)
  const verses = await Promise.all(
    verseRefs.map(async (v) => {
      const verseData = await apiBibleFetch(`/verses/${v.id}`, {
        'content-type': 'text',
        'include-notes': 'false',
        'include-titles': 'false',
        'include-chapter-numbers': 'false',
        'include-verse-numbers': 'false',
        'include-verse-spans': 'false',
      });
      const d = verseData.data;
      const verseNum = parseInt(d.id.split('.').pop()!, 10);
      return {
        book_id: id,
        book_name: book,
        chapter,
        verse: verseNum,
        text: stripHtml(d.content || ''),
      };
    })
  );

  verses.sort((a, b) => a.verse - b.verse);

  return {
    reference: `${book} ${chapter}`,
    verses,
    text: verses.map((v) => v.text).join(' '),
    translation_id: 'msg',
    translation_name: 'The Message',
  };
}

async function getVerse(reference: string) {
  // reference like "John 3:16" or "John 3:16-18"
  const m = reference.match(/^(.+?)\s+(\d+):(\d+)(?:-(\d+))?$/);
  if (!m) throw new Error(`Invalid reference: ${reference}`);
  const [, book, chapStr, startStr, endStr] = m;
  const id = bookId(book);
  if (!id) throw new Error(`Unknown book: ${book}`);
  const chapter = parseInt(chapStr, 10);
  const start = parseInt(startStr, 10);
  const end = endStr ? parseInt(endStr, 10) : start;

  const verses = await Promise.all(
    Array.from({ length: end - start + 1 }, (_, i) => start + i).map(async (vNum) => {
      const verseData = await apiBibleFetch(`/verses/${id}.${chapter}.${vNum}`, {
        'content-type': 'text',
        'include-notes': 'false',
        'include-titles': 'false',
        'include-chapter-numbers': 'false',
        'include-verse-numbers': 'false',
        'include-verse-spans': 'false',
      });
      const d = verseData.data;
      return {
        book_id: id,
        book_name: book,
        chapter,
        verse: vNum,
        text: stripHtml(d.content || ''),
      };
    })
  );

  return {
    reference,
    verses,
    text: verses.map((v) => v.text).join(' '),
    translation_id: 'msg',
    translation_name: 'The Message',
  };
}

async function search(query: string, limit: number) {
  const data = await apiBibleFetch(`/search`, { query, limit: String(limit) });
  const verses: Array<any> = data.data?.verses ?? [];
  // Reverse book lookup id -> name
  const idToName: Record<string, string> = {};
  for (const [name, code] of Object.entries(BOOK_ID)) idToName[code] = name;

  const results = verses.map((v) => {
    const [bId, ch, vs] = v.id.split('.');
    return {
      reference: v.reference,
      book_name: idToName[bId] || v.bookId || bId,
      chapter: parseInt(ch, 10),
      verse: parseInt(vs, 10),
      text: stripHtml(v.text || ''),
    };
  });

  return { query, results, count: results.length };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    if (!API_BIBLE_KEY) throw new Error('API_BIBLE_KEY is not configured');

    const url = new URL(req.url);
    const action = url.searchParams.get('action') || 'chapter';

    let result;
    if (action === 'chapter') {
      const book = url.searchParams.get('book')!;
      const chapter = parseInt(url.searchParams.get('chapter') || '1', 10);
      result = await getChapter(book, chapter);
    } else if (action === 'verse') {
      const ref = url.searchParams.get('ref')!;
      result = await getVerse(ref);
    } else if (action === 'search') {
      const q = url.searchParams.get('q') || '';
      const limit = parseInt(url.searchParams.get('limit') || '50', 10);
      result = await search(q, limit);
    } else {
      throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('bible-msg error:', msg);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
