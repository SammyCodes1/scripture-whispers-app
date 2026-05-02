import { useEffect, useState, useCallback } from 'react';
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
async function fetchWikiImages(title: string, max = 6): Promise<{ url: string; title: string; description?: string }[]> {
  const api = `https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*&prop=images&imlimit=30&titles=${encodeURIComponent(title)}`;
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

  // Resolve URLs via imageinfo
  const infoApi = `https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*&prop=imageinfo&iiprop=url|extmetadata&titles=${encodeURIComponent(fileNames.join('|'))}`;
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
      url: info.url,
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
          wikiModern ? fetchWikiImages(wikiModern, 4) : Promise.resolve([]),
          wikiHistorical ? fetchWikiImages(wikiHistorical, 4) : Promise.resolve([]),
        ]);
        meta = { modern, historical, fetchedAt: Date.now() };
        await idbSet(META_STORE, locationId, meta);
      }
      if (!meta) { if (!cancelled) { setImages([]); setLoading(false); } return; }

      // 3. Resolve blobs (cached or fetch+cache)
      const all = [
        ...meta.modern.map(m => ({ ...m, era: 'modern' as const })),
        ...meta.historical.map(m => ({ ...m, era: 'historical' as const })),
      ];
      const resolved: LocationImage[] = [];
      for (const item of all) {
        const blob = await cacheImageBlob(item.url);
        resolved.push({
          url: item.url,
          title: item.title,
          description: item.description,
          era: item.era,
          blobUrl: blob ? URL.createObjectURL(blob) : item.url,
        });
        if (!cancelled) setImages([...resolved]);
      }
      if (!cancelled) setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [locationId, wikiModern, wikiHistorical]);

  return { images, loading };
}

// Pre-download all locations' images for full offline access.
export function usePreDownloadAllImages() {
  const [progress, setProgress] = useState<{ current: number; total: number; running: boolean }>({
    current: 0,
    total: 0,
    running: false,
  });

  const download = useCallback(async () => {
    if (!navigator.onLine) {
      throw new Error('You need to be online to pre-download images.');
    }
    setProgress({ current: 0, total: BIBLICAL_LOCATIONS.length, running: true });

    for (let i = 0; i < BIBLICAL_LOCATIONS.length; i++) {
      const loc = BIBLICAL_LOCATIONS[i];
      try {
        let meta = await idbGet<MetaEntry>(META_STORE, loc.id);
        if (!meta) {
          const [modern, historical] = await Promise.all([
            loc.wikiModern ? fetchWikiImages(loc.wikiModern, 3) : Promise.resolve([]),
            loc.wikiHistorical ? fetchWikiImages(loc.wikiHistorical, 3) : Promise.resolve([]),
          ]);
          meta = { modern, historical, fetchedAt: Date.now() };
          await idbSet(META_STORE, loc.id, meta);
        }
        const all = [...meta.modern, ...meta.historical];
        await Promise.all(all.map(im => cacheImageBlob(im.url)));
      } catch (err) {
        console.warn('Failed to pre-download for', loc.id, err);
      }
      setProgress({ current: i + 1, total: BIBLICAL_LOCATIONS.length, running: true });
    }
    setProgress(p => ({ ...p, running: false }));
  }, []);

  return { progress, download };
}
