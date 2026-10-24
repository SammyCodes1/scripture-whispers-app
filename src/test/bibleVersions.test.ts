import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  AMP_NOTICE,
  CACHE_TTL_MS,
  MAX_CACHE_AGE_MS,
  NKJV_NOTICE,
  checkRateLimit,
  getChapter,
  parseChapterRequest,
  parseChapterText,
  type CacheStore,
  type ChapterPayload,
  type Deps,
} from '../../supabase/functions/_shared/bible-core';
import { parseBsbChapter, fetchChapter, fetchVerse } from '@/hooks/useBibleApi';
import { buildManualFumsUrl, reportFumsView } from '@/lib/fums';
import { splitLockmanLink, isLicensedVersion } from '@/lib/bibleVersions';

// All API.Bible traffic below is MOCKED. No real API key was used or is needed.
const NIV_COPY = 'The Holy Bible, New International Version® NIV® Copyright © 1973, 1978, 1984, 2011 by Biblica, Inc.® Used by Permission of Biblica, Inc.® All rights reserved worldwide.';

function memCache(): CacheStore & { store: Map<string, { payload: ChapterPayload; fetchedAt: number }> } {
  const store = new Map<string, { payload: ChapterPayload; fetchedAt: number }>();
  return {
    store,
    async get(k) { return store.get(k) ?? null; },
    async set(k, payload, fetchedAt) { store.set(k, { payload, fetchedAt }); },
  };
}

function apiResponse(content: string, copyright = NIV_COPY, fums: string | undefined = 'tok123') {
  return new Response(JSON.stringify({ data: { content, copyright }, meta: fums ? { fumsToken: fums } : {} }), { status: 200 });
}

function req(version: string, book = 'John', chapter = 3) {
  const r = parseChapterRequest(new URLSearchParams({ version, book, chapter: String(chapter) }));
  if (r.ok !== true) throw new Error('bad request');
  return r;
}

describe('parseChapterText', () => {
  it('splits bracketed verse markers and strips titles/pilcrows/newlines', () => {
    const v = parseChapterText('The Beginning\n   [1] In the beginning God created.\n  [2] ¶ The earth was\n formless. ');
    expect(v).toEqual([
      { verse: 1, text: 'In the beginning God created.' },
      { verse: 2, text: 'The earth was formless.' },
    ]);
  });
  it('handles verse bridges by keeping the first number', () => {
    expect(parseChapterText('[2-3] Combined verse text')).toEqual([{ verse: 2, text: 'Combined verse text' }]);
  });
  it('returns nothing for empty content', () => {
    expect(parseChapterText('')).toEqual([]);
  });
});

describe('parseChapterRequest', () => {
  it('maps the three licensed versions to the verified Bible IDs', () => {
    expect(req('amp').version.bibleId).toBe('a81b73293d3080c9-01');
    expect(req('NIV').version.bibleId).toBe('78a9f6124f344018-01');
    expect(req('nkjv').version.bibleId).toBe('63097d2a0a2f7db3-01');
  });
  it('rejects bad input', () => {
    expect(parseChapterRequest(new URLSearchParams({ version: 'kjv', book: 'John', chapter: '3' })).ok).toBe(false);
    expect(parseChapterRequest(new URLSearchParams({ version: 'amp', book: 'Hezekiah', chapter: '3' })).ok).toBe(false);
    expect(parseChapterRequest(new URLSearchParams({ version: 'amp', book: 'John', chapter: '0' })).ok).toBe(false);
    expect(parseChapterRequest(new URLSearchParams({ version: 'amp', book: 'John', chapter: 'x' })).ok).toBe(false);
  });
});

describe('getChapter (server proxy logic, mocked API.Bible)', () => {
  let now = 1_000_000;
  let cache: ReturnType<typeof memCache>;
  const mk = (fetchImpl: typeof fetch, apiKey = 'TEST-KEY'): Deps => ({ apiKey, fetch: fetchImpl, cache, now: () => now });
  beforeEach(() => { now = 1_000_000; cache = memCache(); });

  it('calls rest.api.bible with api-key header, text content and fums-version=3', async () => {
    const f = vi.fn(async () => apiResponse('[1] For God so loved the world. [2] Second.'));
    const r = await getChapter(req('niv'), mk(f as unknown as typeof fetch));
    expect(r.status).toBe(200);
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url.startsWith('https://rest.api.bible/v1/bibles/78a9f6124f344018-01/chapters/JHN.3?')).toBe(true);
    expect(url).toContain('fums-version=3');
    expect(url).toContain('content-type=text');
    expect((init.headers as Record<string, string>)['api-key']).toBe('TEST-KEY');
    const body = r.body as ChapterPayload;
    expect(body.verses).toHaveLength(2);
    expect(body.verses[0]).toMatchObject({ book_name: 'John', chapter: 3, verse: 1, book_id: 'JHN' });
    expect(body.fumsToken).toBe('tok123');
    expect(body.translation_id).toBe('niv');
  });

  it('uses the API copyright field for NIV and exact fixed notices for AMP and NKJV', async () => {
    const f = vi.fn(async () => apiResponse('[1] text', 'API-COPY-IGNORED-FOR-FIXED'));
    const niv = await getChapter(req('niv'), mk((async () => apiResponse('[1] text')) as unknown as typeof fetch));
    expect((niv.body as ChapterPayload).notice).toBe(NIV_COPY);
    const amp = await getChapter(req('amp'), mk(f as unknown as typeof fetch));
    expect((amp.body as ChapterPayload).notice).toBe(AMP_NOTICE);
    expect(AMP_NOTICE).toBe('Scripture quotations taken from the Amplified® Bible (AMP), Copyright © 2015 by The Lockman Foundation. Used by permission. www.Lockman.org');
    const nkjv = await getChapter(req('nkjv'), mk(f as unknown as typeof fetch));
    expect((nkjv.body as ChapterPayload).notice).toBe(NKJV_NOTICE);
    expect(NKJV_NOTICE).toBe('Scripture taken from the New King James Version®. Copyright © 1982 by Thomas Nelson. Used by permission. All rights reserved.');
  });

  it('refuses to serve NIV text if the API gives no copyright', async () => {
    const f = vi.fn(async () => new Response(JSON.stringify({ data: { content: '[1] x' }, meta: {} }), { status: 200 }));
    const r = await getChapter(req('niv'), mk(f as unknown as typeof fetch));
    expect(r.status).toBe(502);
  });

  it('caches per chapter and refreshes after the TTL (<= 14 days)', async () => {
    expect(CACHE_TTL_MS).toBeLessThanOrEqual(MAX_CACHE_AGE_MS);
    expect(MAX_CACHE_AGE_MS).toBe(14 * 24 * 3600 * 1000);
    const f = vi.fn(async () => apiResponse('[1] text'));
    const deps = mk(f as unknown as typeof fetch);
    await getChapter(req('amp'), deps);
    await getChapter(req('amp'), deps);
    expect(f).toHaveBeenCalledTimes(1);
    now += CACHE_TTL_MS + 1;
    await getChapter(req('amp'), deps);
    expect(f).toHaveBeenCalledTimes(2);
    await getChapter(req('amp', 'John', 4), deps);
    expect(f).toHaveBeenCalledTimes(3);
  });

  it('returns missing_key (503) without calling the API when no key is configured', async () => {
    const f = vi.fn();
    const r = await getChapter(req('amp'), mk(f as unknown as typeof fetch, ''));
    expect(r.status).toBe(503);
    expect((r.body as { code: string }).code).toBe('missing_key');
    expect(f).not.toHaveBeenCalled();
  });

  it('still serves a cached chapter when the key is missing', async () => {
    const f = vi.fn(async () => apiResponse('[1] text'));
    await getChapter(req('amp'), mk(f as unknown as typeof fetch));
    const r = await getChapter(req('amp'), mk(vi.fn() as unknown as typeof fetch, ''));
    expect(r.status).toBe(200);
  });

  it('maps quota exhaustion (429/402) to a friendly quota error', async () => {
    for (const status of [429, 402]) {
      const f = vi.fn(async () => new Response('{}', { status, headers: { 'retry-after': '120' } }));
      const r = await getChapter(req('nkjv'), mk(f as unknown as typeof fetch));
      expect(r.status).toBe(429);
      expect(r.body).toMatchObject({ code: 'quota', retryAfter: 120 });
      expect((r.body as { error: string }).error).toMatch(/limit/i);
    }
  });

  it('maps auth, 404, 5xx, network and garbage to safe errors without leaking details', async () => {
    const cases: Array<[() => Promise<Response>, number, string]> = [
      [async () => new Response('secret detail TEST-KEY', { status: 401 }), 502, 'upstream_auth'],
      [async () => new Response('', { status: 404 }), 404, 'not_found'],
      [async () => new Response('boom', { status: 500 }), 502, 'upstream'],
      [async () => { throw new Error('ECONNRESET'); }, 502, 'upstream'],
      [async () => new Response('not json', { status: 200 }), 502, 'upstream'],
      [async () => apiResponse(''), 502, 'upstream'],
    ];
    for (const [impl, status, code] of cases) {
      const r = await getChapter(req('amp'), mk(vi.fn(impl) as unknown as typeof fetch));
      expect(r.status).toBe(status);
      expect((r.body as { code: string }).code).toBe(code);
      expect(JSON.stringify(r.body)).not.toContain('TEST-KEY');
    }
  });

  it('survives a broken cache', async () => {
    const broken: CacheStore = { get: async () => { throw new Error('db down'); }, set: async () => { throw new Error('db down'); } };
    const f = vi.fn(async () => apiResponse('[1] text'));
    const r = await getChapter(req('amp'), { apiKey: 'k', fetch: f as unknown as typeof fetch, cache: broken, now: () => now });
    expect(r.status).toBe(200);
  });
});

describe('checkRateLimit', () => {
  it('allows up to the limit per IP per window, then blocks with retryAfter, then resets', () => {
    const store = { hits: new Map() };
    for (let i = 0; i < 5; i++) expect(checkRateLimit(store, '1.1.1.1', 1000, 5, 60_000).allowed).toBe(true);
    const blocked = checkRateLimit(store, '1.1.1.1', 2000, 5, 60_000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfter).toBeGreaterThan(0);
    expect(checkRateLimit(store, '2.2.2.2', 2000, 5, 60_000).allowed).toBe(true);
    expect(checkRateLimit(store, '1.1.1.1', 61_001, 5, 60_000).allowed).toBe(true);
  });
});

describe('client: BSB + automatic fallback (mocked fetch)', () => {
  const bsbJson = { chapter: { content: [
    { type: 'heading', content: ['Title'] },
    { type: 'verse', number: 1, content: [{ text: 'The LORD is my shepherd;', poem: 1 }, { noteId: 5 }, { text: 'I shall not want.', poem: 2 }] },
    { type: 'line_break' },
    { type: 'verse', number: 2, content: ['He makes me lie down.'] },
  ] } };

  beforeEach(() => { vi.restoreAllMocks(); });

  it('parses helloao BSB chapters, dropping headings, notes and line breaks', () => {
    const r = parseBsbChapter('Psalms', 23, bsbJson);
    expect(r.verses.map(v => v.text)).toEqual(['The LORD is my shepherd; I shall not want.', 'He makes me lie down.']);
    expect(r.translation_id).toBe('bsb');
    expect(r.verses[0].book_id).toBe('PSA');
  });

  it('fetches a licensed version from the proxy and returns notice + fumsToken', async () => {
    const payload = { reference: 'John 3', verses: [{ book_id: 'JHN', book_name: 'John', chapter: 3, verse: 16, text: 'x' }], text: 'x', translation_id: 'amp', translation_name: 'Amplified Bible', notice: AMP_NOTICE, fumsToken: 'abc' };
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(payload), { status: 200 }));
    const r = await fetchChapter('John', 3, 'amp');
    expect(String(spy.mock.calls[0][0])).toContain('/functions/v1/bible-versions?version=amp&book=John&chapter=3');
    expect(r.notice).toBe(AMP_NOTICE);
    expect(r.fumsToken).toBe('abc');
    expect(r.fallback).toBeUndefined();
  });

  it.each([
    ['missing_key', 503],
    ['quota', 429],
    ['upstream', 502],
  ])('falls back to BSB automatically when the licensed version fails (%s)', async (code, status) => {
    const spy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes('bible-versions')) return new Response(JSON.stringify({ error: 'nope', code }), { status });
      return new Response(JSON.stringify(bsbJson), { status: 200 });
    });
    const r = await fetchChapter('Psalms', 23, 'niv');
    expect(spy).toHaveBeenCalledTimes(2);
    expect(r.translation_id).toBe('bsb');
    expect(r.fallback).toMatchObject({ from: 'niv', code });
    expect(r.fallback?.message).toBeTruthy();
    expect(r.fumsToken).toBeUndefined();
  });

  it('falls back to BSB when the network call itself fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      if (String(input).includes('bible-versions')) throw new TypeError('Failed to fetch');
      return new Response(JSON.stringify(bsbJson), { status: 200 });
    });
    const r = await fetchChapter('Psalms', 23, 'nkjv');
    expect(r.fallback).toMatchObject({ from: 'nkjv', code: 'network' });
  });

  it('fetchVerse slices a licensed chapter to the requested range', async () => {
    const verses = [1, 2, 3, 4].map(n => ({ book_id: 'JHN', book_name: 'John', chapter: 3, verse: n, text: `v${n}` }));
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ reference: 'John 3', verses, text: '', translation_id: 'nkjv', translation_name: 'x', notice: NKJV_NOTICE, fumsToken: 't' }), { status: 200 }));
    const r = await fetchVerse('John 3:2-3', 'nkjv');
    expect(r.verses.map(v => v.verse)).toEqual([2, 3]);
  });
});

describe('FUMS reporting', () => {
  it('builds the documented manual report URL', () => {
    const u = new URL(buildManualFumsUrl('tok/+=', 'dev1', 'sess1'));
    expect(u.origin + u.pathname).toBe('https://fums.api.bible/f3');
    expect(u.searchParams.get('t')).toBe('tok/+=');
    expect(u.searchParams.get('dId')).toBe('dev1');
    expect(u.searchParams.get('sId')).toBe('sess1');
  });

  it('uses the FUMS script when loaded, otherwise the manual pixel, and ignores empty tokens', () => {
    const w = window as unknown as { fums?: unknown; __fumsLoaded?: boolean };
    const fums = vi.fn();
    w.fums = fums; w.__fumsLoaded = true;
    reportFumsView('tokA');
    expect(fums).toHaveBeenCalledWith('trackView', 'tokA');

    w.__fumsLoaded = false;
    const srcs: string[] = [];
    const Orig = window.Image;
    class FakeImage { referrerPolicy = ''; set src(v: string) { srcs.push(v); } }
    (window as unknown as { Image: unknown }).Image = FakeImage;
    reportFumsView('tokB');
    reportFumsView(null);
    (window as unknown as { Image: unknown }).Image = Orig;
    expect(fums).toHaveBeenCalledTimes(1);
    expect(srcs).toHaveLength(1);
    expect(srcs[0]).toContain('fums.api.bible/f3');
    expect(srcs[0]).toContain('t=tokB');
  });
});

describe('helpers', () => {
  it('splits the Lockman URL so it can be linked', () => {
    const p = splitLockmanLink(AMP_NOTICE);
    expect(p.link).toBe('www.Lockman.org');
    expect(p.before + p.link + p.after).toBe(AMP_NOTICE);
    expect(splitLockmanLink(NKJV_NOTICE).link).toBeNull();
  });
  it('identifies licensed versions', () => {
    expect(['amp', 'niv', 'nkjv'].every(isLicensedVersion)).toBe(true);
    expect(['kjv', 'bsb', 'web', 'msg'].some(isLicensedVersion)).toBe(false);
  });
});
