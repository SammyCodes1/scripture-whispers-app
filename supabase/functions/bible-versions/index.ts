// Server-side proxy for licensed Bible versions (AMP, NIV 2011, NKJV) via API.Bible.
// The API key lives only in the edge function secret API_BIBLE_KEY, never in client code.
//
//   GET /functions/v1/bible-versions?version=amp|niv|nkjv&book=John&chapter=3
//
// Chapters are cached server-side in `bible_chapter_cache` (7 day TTL, hard limit 14 days)
// with an in-memory fallback if the table is not available.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import {
  CACHE_TTL_MS,
  MAX_CACHE_AGE_MS,
  checkRateLimit,
  clientIp,
  getChapter,
  parseChapterRequest,
  type CacheStore,
  type ChapterPayload,
  type RateStore,
} from '../_shared/bible-core.ts';

const API_BIBLE_KEY = Deno.env.get('API_BIBLE_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const db = SUPABASE_URL && SERVICE_KEY ? createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } }) : null;

const memory = new Map<string, { payload: ChapterPayload; fetchedAt: number }>();
const rate: RateStore = { hits: new Map() };
let lastCleanup = 0;

const cache: CacheStore = {
  async get(key) {
    const mem = memory.get(key);
    if (mem && Date.now() - mem.fetchedAt < CACHE_TTL_MS) return mem;
    if (!db) return null;
    const { data, error } = await db.from('bible_chapter_cache').select('payload, fetched_at').eq('key', key).maybeSingle();
    if (error || !data) return null;
    const fetchedAt = new Date(data.fetched_at).getTime();
    if (Date.now() - fetchedAt >= MAX_CACHE_AGE_MS) return null;
    const hit = { payload: data.payload as ChapterPayload, fetchedAt };
    memory.set(key, hit);
    return hit;
  },
  async set(key, payload, fetchedAt) {
    memory.set(key, { payload, fetchedAt });
    if (memory.size > 500) memory.delete(memory.keys().next().value as string);
    if (!db) return;
    await db.from('bible_chapter_cache').upsert({ key, payload, fetched_at: new Date(fetchedAt).toISOString() });
    // Purge anything older than the 14 day licence limit, at most once an hour per instance.
    if (Date.now() - lastCleanup > 3_600_000) {
      lastCleanup = Date.now();
      await db.from('bible_chapter_cache').delete().lt('fetched_at', new Date(Date.now() - MAX_CACHE_AGE_MS).toISOString());
    }
  },
};

function json(body: unknown, status: number, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json', ...extra },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'GET') return json({ error: 'Method not allowed', code: 'bad_request' }, 405);

  const rl = checkRateLimit(rate, clientIp(req.headers), Date.now());
  if (!rl.allowed) {
    return json(
      { error: 'Too many requests. Please slow down for a moment.', code: 'rate_limited', retryAfter: rl.retryAfter },
      429,
      { 'Retry-After': String(rl.retryAfter) },
    );
  }

  const parsed = parseChapterRequest(new URL(req.url).searchParams);
  if (!parsed.ok) return json({ error: parsed.message, code: 'bad_request' }, 400);

  const result = await getChapter(parsed, { apiKey: API_BIBLE_KEY, fetch, cache, now: Date.now });
  return json(result.body, result.status, result.status === 200 ? { 'Cache-Control': 'private, max-age=300' } : {});
});
