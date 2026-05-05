import { useEffect, useState, useCallback, useRef } from 'react';
import { BIBLICAL_LOCATIONS } from '@/data/biblicalLocations';

// Lightweight IndexedDB wrapper for caching location images as blobs.
const DB_NAME = 'hw-location-images';
const STORE = 'images';
const META_STORE = 'meta';

export interface LocationImage {
  url: string;        // wikimedia URL (used as cache key)
  title: string;
  description?: string;
  blobUrl?: string;   // object URL created from cached blob
  era: 'modern' | 'historical';
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
      if (!db.objectStoreNames.contains(META_STORE)) db.createObjectStore(META_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGet<T = unknown>(store: string, key: string): Promise<T | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).get(key);
    req.onsuccess = () => resolve(req.result as T | undefined);
    req.onerror = () => reject(req.error);
  });
}

async function idbSet(store: string, key: string, value: unknown): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// Fetch images for a single Wikipedia article via the public REST API.
// No API key required, CORS-enabled.
async function fetchWikiImages(title: string, max = 3): Promise<{ url: string; title: string; description?: string }[]> {
  const api = `https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*&prop=images&imlimit=15&titles=${encodeURIComponent(title)}`;
  const res = await fetch(api);
  if (!res.ok) return [];
  const data = await res.json();
  const pages = data.query?.pages || {};
  const fileNames: string[] = [];
  for (const p of Object.values<any>(pages)) {
    for (const im of p.images || []) {
      const f = im.title as string;
      if (!/\.(jpg|jpeg|png)$/i.test(f)) continue;
      if (/icon|logo|flag|coat|seal|commons-logo|wiki|edit-icon|symbol|ambox/i.test(f)) continue;
      fileNames.push(f);
      if (fileNames.length >= max) break;
    }
    if (fileNames.length >= max) break;
  }
  if (!fileNames.length) return [];

  // Resolve URLs via imageinfo - request 400px thumbnails to drastically reduce download size
  const infoApi = `https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=400&titles=${encodeURIComponent(fileNames.join('|'))}`;
  const ir = await fetch(infoApi);
  if (!ir.ok) return [];
  const idata = await ir.json();
  const ipages = idata.query?.pages || {};
  const out: { url: string; title: string; description?: string }[] = [];
  for (const p of Object.values<any>(ipages)) {
    const info = p.imageinfo?.[0];
    if (!info?.url) continue;
    const desc = info.extmetadata?.ImageDescription?.value as string | undefined;
    out.push({
      url: info.thumburl || info.url,
      title: (p.title as string).replace(/^File:/, '').replace(/\.(jpg|jpeg|png)$/i, ''),
      description: desc?.replace(/<[^>]+>/g, '').slice(0, 160),
    });
  }
  return out;
}

async function cacheImageBlob(url: string): Promise<Blob | null> {
  const cached = await idbGet<Blob>(STORE, url);
  if (cached) return cached;
  try {
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) return null;
    const blob = await res.blob();
    await idbSet(STORE, url, blob);
    return blob;
  } catch {
    return null;
  }
}

interface MetaEntry {
  modern: { url: string; title: string; description?: string }[];
  historical: { url: string; title: string; description?: string }[];
  fetchedAt: number;
}

export function useLocationImages(locationId: string | null, wikiModern?: string, wikiHistorical?: string) {
  const [images, setImages] = useState<LocationImage[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!locationId) { setImages([]); return; }
    let cancelled = false;
    setLoading(true);

    (async () => {
      // 1. Try cached metadata
      let meta = await idbGet<MetaEntry>(META_STORE, locationId);

      // 2. If no meta and online, fetch
      if (!meta && navigator.onLine) {
        const [modern, historical] = await Promise.all([
          wikiModern ? fetchWikiImages(wikiModern, 3) : Promise.resolve([]),
          wikiHistorical ? fetchWikiImages(wikiHistorical, 3) : Promise.resolve([]),
        ]);
        meta = { modern, historical, fetchedAt: Date.now() };
        await idbSet(META_STORE, locationId, meta);
      }
      if (!meta) { if (!cancelled) { setImages([]); setLoading(false); } return; }

      // 3. Resolve blobs in parallel for fast loading
      const all = [
        ...meta.modern.map(m => ({ ...m, era: 'modern' as const })),
        ...meta.historical.map(m => ({ ...m, era: 'historical' as const })),
      ];
      // Show metadata immediately with direct URLs, then swap in cached blobs
      const initial: LocationImage[] = all.map(item => ({
        url: item.url,
        title: item.title,
        description: item.description,
        era: item.era,
        blobUrl: item.url,
      }));
      if (!cancelled) setImages(initial);

      await Promise.all(all.map(async (item, idx) => {
        const blob = await cacheImageBlob(item.url);
        if (!blob || cancelled) return;
        const blobUrl = URL.createObjectURL(blob);
        setImages(prev => {
          const next = [...prev];
          if (next[idx]) next[idx] = { ...next[idx], blobUrl };
          return next;
        });
      }));
      if (!cancelled) setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [locationId, wikiModern, wikiHistorical]);

  return { images, loading };
}

// Pre-download all locations' images for full offline access.
// Resumable: progress is persisted to localStorage and auto-resumes on next launch.
const RESUME_KEY = 'hw-map-images-download-active';

async function isLocationFullyCached(locId: string): Promise<boolean> {
  const meta = await idbGet<MetaEntry>(META_STORE, locId);
  if (!meta) return false;
  const all = [...meta.modern, ...meta.historical];
  if (!all.length) return true;
  for (const im of all) {
    const blob = await idbGet<Blob>(STORE, im.url);
    if (!blob) return false;
  }
  return true;
}

export function usePreDownloadAllImages() {
  const [progress, setProgress] = useState<{
    current: number;
    total: number;
    running: boolean;
    paused: boolean;
    hasResumable: boolean;
  }>({
    current: 0,
    total: 0,
    running: false,
    paused: false,
    hasResumable: false,
  });

  const pausedRef = useRef(false);
  const runningRef = useRef(false);

  // On mount, compute initial cached count + whether a previous download is resumable
  useEffect(() => {
    (async () => {
      const cachedFlags = await Promise.all(BIBLICAL_LOCATIONS.map(l => isLocationFullyCached(l.id)));
      const completed = cachedFlags.filter(Boolean).length;
      let resumable = false;
      try { resumable = localStorage.getItem(RESUME_KEY) === '1'; } catch {}
      setProgress(p => ({
        ...p,
        current: completed,
        total: BIBLICAL_LOCATIONS.length,
        hasResumable: resumable && completed < BIBLICAL_LOCATIONS.length,
      }));
    })();
  }, []);

  const runDownload = useCallback(async () => {
    if (runningRef.current) return;
    if (!navigator.onLine) {
      throw new Error('You need to be online to pre-download images.');
    }
    runningRef.current = true;
    pausedRef.current = false;
    try { localStorage.setItem(RESUME_KEY, '1'); } catch {}

    const cachedFlags = await Promise.all(BIBLICAL_LOCATIONS.map(l => isLocationFullyCached(l.id)));
    let completed = cachedFlags.filter(Boolean).length;
    setProgress({
      current: completed,
      total: BIBLICAL_LOCATIONS.length,
      running: true,
      paused: false,
      hasResumable: true,
    });

    const CONCURRENCY = 5;
    const queue = BIBLICAL_LOCATIONS.filter((_, i) => !cachedFlags[i]);

    const worker = async () => {
      while (queue.length) {
        if (pausedRef.current) return;
        const loc = queue.shift();
        if (!loc) break;
        try {
          let meta = await idbGet<MetaEntry>(META_STORE, loc.id);
          if (!meta) {
            const [modern, historical] = await Promise.all([
              loc.wikiModern ? fetchWikiImages(loc.wikiModern, 2) : Promise.resolve([]),
              loc.wikiHistorical ? fetchWikiImages(loc.wikiHistorical, 2) : Promise.resolve([]),
            ]);
            meta = { modern, historical, fetchedAt: Date.now() };
            await idbSet(META_STORE, loc.id, meta);
          }
          const all = [...meta.modern, ...meta.historical];
          await Promise.all(all.map(im => cacheImageBlob(im.url)));
        } catch (err) {
          console.warn('Failed to pre-download for', loc.id, err);
        }
        completed++;
        setProgress(p => ({ ...p, current: completed, running: true, paused: false }));
      }
    };

    await Promise.all(Array.from({ length: CONCURRENCY }, worker));
    runningRef.current = false;

    if (pausedRef.current) {
      // Paused mid-flight — keep resume flag so it can continue later
      setProgress(p => ({ ...p, running: false, paused: true, hasResumable: true }));
    } else {
      try { localStorage.removeItem(RESUME_KEY); } catch {}
      setProgress(p => ({ ...p, running: false, paused: false, hasResumable: false }));
    }
  }, []);

  const pause = useCallback(() => {
    if (!runningRef.current) return;
    pausedRef.current = true;
    setProgress(p => ({ ...p, paused: true }));
  }, []);

  const resume = useCallback(() => {
    if (runningRef.current) return;
    runDownload().catch(err => console.warn('Resume failed:', err));
  }, [runDownload]);

  // Auto-resume on launch if previously active and online — but only if user hasn't explicitly paused.
  useEffect(() => {
    let shouldResume = false;
    try { shouldResume = localStorage.getItem(RESUME_KEY) === '1'; } catch {}
    if (!shouldResume) return;

    const tryResume = () => {
      if (navigator.onLine && !runningRef.current && !pausedRef.current) {
        runDownload().catch(err => console.warn('Resume download failed:', err));
      }
    };
    const t = setTimeout(tryResume, 1500);
    const onOnline = () => tryResume();
    window.addEventListener('online', onOnline);
    return () => { clearTimeout(t); window.removeEventListener('online', onOnline); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { progress, download: runDownload, pause, resume };
}

