// Pure, runtime-agnostic logic for the `bible-versions` edge function.
// No Deno globals in here so it can be unit-tested with vitest.
// Licensed text is NEVER stored in this repo: it is fetched at request time
// from API.Bible and cached server-side for at most CACHE_TTL_MS.

export const API_BASE = 'https://rest.api.bible/v1';

/** Chapters are refreshed after 7 days. API.Bible terms allow caching for at most 14 days. */
export const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const MAX_CACHE_AGE_MS = 14 * 24 * 60 * 60 * 1000;

export const AMP_NOTICE =
  'Scripture quotations taken from the Amplified® Bible (AMP), Copyright © 2015 by The Lockman Foundation. Used by permission. www.Lockman.org';
export const NKJV_NOTICE =
  'Scripture taken from the New King James Version®. Copyright © 1982 by Thomas Nelson. Used by permission. All rights reserved.';

export interface VersionConfig {
  id: 'amp' | 'niv' | 'nkjv';
  bibleId: string;
  name: string;
  /** Fixed notice text. NIV has none: the API's `copyright` field is used instead. */
  notice: string | null;
}

export const LICENSED_VERSIONS: Record<string, VersionConfig> = {
  amp: { id: 'amp', bibleId: 'a81b73293d3080c9-01', name: 'Amplified Bible', notice: AMP_NOTICE },
  niv: { id: 'niv', bibleId: '78a9f6124f344018-01', name: 'New International Version (2011)', notice: null },
  nkjv: { id: 'nkjv', bibleId: '63097d2a0a2f7db3-01', name: 'New King James Version', notice: NKJV_NOTICE },
};

export const BOOK_IDS: Record<string, string> = {
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

export interface Verse {
  book_id: string;
  book_name: string;
  chapter: number;
  verse: number;
  text: string;
}

export interface ChapterPayload {
  reference: string;
  verses: Verse[];
  text: string;
  translation_id: string;
  translation_name: string;
  licensed: true;
  /** Exact notice to display under the passage. */
  notice: string;
  /** Raw `copyright` field from API.Bible, when present. */
  copyright: string | null;
  /** Token to report to FUMS every time this passage is displayed. */
  fumsToken: string | null;
  /** ISO time this chapter was fetched from API.Bible (cache age). */
  fetchedAt: string;
}

export type ErrorCode =
  | 'bad_request'
  | 'missing_key'
  | 'quota'
  | 'rate_limited'
  | 'upstream_auth'
  | 'not_found'
  | 'upstream';

export interface HandlerResult {
  status: number;
  body: ChapterPayload | { error: string; code: ErrorCode; retryAfter?: number };
}

/** Parse API.Bible `content-type=text` chapter content ("[1] text [2] text") into verses. */
export function parseChapterText(content: string): Array<{ verse: number; text: string }> {
  const out: Array<{ verse: number; text: string }> = [];
  const re = /\[(\d+)(?:\s*[-–]\s*\d+)?\]/g;
  const marks: Array<{ verse: number; start: number; end: number }> = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) {
    marks.push({ verse: parseInt(m[1], 10), start: m.index, end: m.index + m[0].length });
  }
  for (let i = 0; i < marks.length; i++) {
    const raw = content.slice(marks[i].end, i + 1 < marks.length ? marks[i + 1].start : content.length);
    // Drop pilcrows and collapse whitespace/newlines. Section titles are excluded by the request.
    const text = raw.replace(/¶/g, ' ').replace(/\s+/g, ' ').trim();
    if (text) out.push({ verse: marks[i].verse, text });
  }
  return out;
}

export function parseChapterRequest(params: URLSearchParams):
  | { ok: true; version: VersionConfig; book: string; bookId: string; chapter: number }
  | { ok: false; message: string } {
  const version = LICENSED_VERSIONS[(params.get('version') || '').toLowerCase()];
  if (!version) return { ok: false, message: 'Unknown or unsupported version.' };
  const book = (params.get('book') || '').replace(/\s+/g, ' ').trim();
  const bookId = BOOK_IDS[book];
  if (!bookId) return { ok: false, message: 'Unknown book.' };
  const chapter = Number(params.get('chapter'));
  if (!Number.isInteger(chapter) || chapter < 1 || chapter > 150) return { ok: false, message: 'Invalid chapter.' };
  return { ok: true, version, book, bookId, chapter };
}

export interface CacheStore {
  get(key: string): Promise<{ payload: ChapterPayload; fetchedAt: number } | null>;
  set(key: string, payload: ChapterPayload, fetchedAt: number): Promise<void>;
}

export interface Deps {
  apiKey: string | undefined;
  fetch: typeof fetch;
  cache: CacheStore;
  now: () => number;
}

export function cacheKey(versionId: string, bookId: string, chapter: number) {
  return `${versionId}:${bookId}.${chapter}`;
}

export async function getChapter(
  req: { version: VersionConfig; book: string; bookId: string; chapter: number },
  deps: Deps,
): Promise<HandlerResult> {
  const { version, book, bookId, chapter } = req;
  const key = cacheKey(version.id, bookId, chapter);

  try {
    const hit = await deps.cache.get(key);
    if (hit && deps.now() - hit.fetchedAt < CACHE_TTL_MS) return { status: 200, body: hit.payload };
  } catch {
    // A broken cache must never break reading: fall through to the API.
  }

  if (!deps.apiKey) {
    return { status: 503, body: { error: 'This Bible version is not configured yet.', code: 'missing_key' } };
  }

  const qs = new URLSearchParams({
    'content-type': 'text',
    'include-verse-numbers': 'true',
    'include-titles': 'false',
    'include-notes': 'false',
    'include-chapter-numbers': 'false',
    'include-verse-spans': 'false',
    'fums-version': '3',
  });
  const url = `${API_BASE}/bibles/${version.bibleId}/chapters/${bookId}.${chapter}?${qs}`;

  let res: Response;
  try {
    res = await deps.fetch(url, { headers: { 'api-key': deps.apiKey } });
  } catch {
    return { status: 502, body: { error: 'Could not reach the Bible service.', code: 'upstream' } };
  }

  if (res.status === 429 || res.status === 402) {
    const retry = Number(res.headers.get('retry-after'));
    return {
      status: 429,
      body: {
        error: 'The daily limit for licensed Bible versions has been reached. Please try again later.',
        code: 'quota',
        ...(Number.isFinite(retry) && retry > 0 ? { retryAfter: retry } : {}),
      },
    };
  }
  if (res.status === 401 || res.status === 403) {
    return { status: 502, body: { error: 'This Bible version is not available right now.', code: 'upstream_auth' } };
  }
  if (res.status === 404) {
    return { status: 404, body: { error: 'That chapter is not available in this version.', code: 'not_found' } };
  }
  if (!res.ok) {
    return { status: 502, body: { error: 'The Bible service had a problem. Please try again.', code: 'upstream' } };
  }

  let json: { data?: { content?: string; copyright?: string }; meta?: { fumsToken?: string } };
  try {
    json = await res.json();
  } catch {
    return { status: 502, body: { error: 'The Bible service sent an unreadable response.', code: 'upstream' } };
  }

  const parsed = parseChapterText(json.data?.content ?? '');
  if (parsed.length === 0) {
    return { status: 502, body: { error: 'That chapter came back empty.', code: 'upstream' } };
  }

  const copyright = json.data?.copyright?.trim() || null;
  const notice = version.notice ?? copyright;
  if (!notice) {
    // Licence requires a notice under every passage. Refuse to serve text without one.
    return { status: 502, body: { error: 'Copyright information was missing for this version.', code: 'upstream' } };
  }

  const fetchedAt = deps.now();
  const verses: Verse[] = parsed.map(p => ({
    book_id: bookId,
    book_name: book,
    chapter,
    verse: p.verse,
    text: p.text,
  }));
  const payload: ChapterPayload = {
    reference: `${book} ${chapter}`,
    verses,
    text: verses.map(v => v.text).join(' '),
    translation_id: version.id,
    translation_name: version.name,
    licensed: true,
    notice,
    copyright,
    fumsToken: json.meta?.fumsToken ?? null,
    fetchedAt: new Date(fetchedAt).toISOString(),
  };

  try {
    await deps.cache.set(key, payload, fetchedAt);
  } catch {
    // ignore cache write failures
  }
  return { status: 200, body: payload };
}

// ─── Per-IP rate limiting (fixed window, in-memory, best effort per instance) ──

export interface RateStore {
  hits: Map<string, { count: number; resetAt: number }>;
}

export function checkRateLimit(
  store: RateStore,
  ip: string,
  now: number,
  limit = 60,
  windowMs = 60_000,
): { allowed: boolean; retryAfter: number } {
  // Opportunistic cleanup so the map cannot grow without bound.
  if (store.hits.size > 5000) {
    for (const [k, v] of store.hits) if (v.resetAt <= now) store.hits.delete(k);
  }
  const cur = store.hits.get(ip);
  if (!cur || cur.resetAt <= now) {
    store.hits.set(ip, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfter: 0 };
  }
  cur.count += 1;
  if (cur.count > limit) return { allowed: false, retryAfter: Math.max(1, Math.ceil((cur.resetAt - now) / 1000)) };
  return { allowed: true, retryAfter: 0 };
}

export function clientIp(headers: Headers): string {
  const fwd = headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return headers.get('cf-connecting-ip') || headers.get('x-real-ip') || 'unknown';
}
