import { HW_STORAGE_EVENT } from '@/hooks/useLocalStorage';
import {
  describeLibrary,
  emptyLibrary,
  generateLibraryCode,
  LIBRARY_CODE_KEY,
  LIBRARY_CODE_RE,
  LIBRARY_REMOVED_KEY,
  LIBRARY_REV_KEY,
  librarySignature,
  mergeLibraries,
  normalizeLibraryCode,
  sanitizePayload,
  SAVED_VERSES_KEY,
  VERSE_NOTES_KEY,
  type LibraryPayload,
  type LibraryTombstone,
} from '@/lib/verseLibrary';

export type LibraryPhase = 'checking' | 'saving' | 'saved' | 'offline' | 'local';

const listeners = new Set<(phase: LibraryPhase) => void>();
let phase: LibraryPhase = 'checking';
let knownKeys = new Set<string>();
let suppress = false;
let ready = false;
let dirty = false;
let listening = false;
let generation = 0;
let timer = 0;
let chain: Promise<void> = Promise.resolve();

function setPhase(next: LibraryPhase) {
  phase = next;
  listeners.forEach(listener => listener(next));
}

export function getLibraryPhase(): LibraryPhase {
  return phase;
}

export function subscribeLibraryPhase(listener: (next: LibraryPhase) => void) {
  listeners.add(listener);
  listener(phase);
  return () => {
    listeners.delete(listener);
  };
}

function enqueue<T>(job: () => Promise<T>): Promise<T> {
  const run = chain.then(job, job);
  chain = run.then(() => undefined, () => undefined);
  return run;
}

export function ensureLibraryCode(): string {
  const existing = localStorage.getItem(LIBRARY_CODE_KEY);
  if (existing && LIBRARY_CODE_RE.test(existing)) return existing;
  const code = generateLibraryCode();
  localStorage.setItem(LIBRARY_CODE_KEY, code);
  return code;
}

function readPayload(): LibraryPayload {
  const read = (key: string) => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  };
  return sanitizePayload({
    saved: read(SAVED_VERSES_KEY),
    notes: read(VERSE_NOTES_KEY),
    removed: read(LIBRARY_REMOVED_KEY),
  });
}

function itemKeys(payload: LibraryPayload) {
  const keys = new Set<string>();
  for (const verse of payload.saved) keys.add(`${verse.type}:${verse.ref}`);
  for (const note of payload.notes) keys.add(`note:${note.ref}`);
  return keys;
}

function writePayload(payload: LibraryPayload) {
  const clean = sanitizePayload(payload);
  suppress = true;
  try {
    localStorage.setItem(SAVED_VERSES_KEY, JSON.stringify(clean.saved));
    localStorage.setItem(VERSE_NOTES_KEY, JSON.stringify(clean.notes));
    localStorage.setItem(LIBRARY_REMOVED_KEY, JSON.stringify(clean.removed));
    knownKeys = itemKeys(clean);
    window.dispatchEvent(new CustomEvent(HW_STORAGE_EVENT, { detail: SAVED_VERSES_KEY }));
    window.dispatchEvent(new CustomEvent(HW_STORAGE_EVENT, { detail: VERSE_NOTES_KEY }));
  } catch {
    setPhase('offline');
  } finally {
    suppress = false;
  }
}

function recordRemovals() {
  const current = readPayload();
  const present = itemKeys(current);
  const now = Date.now();
  const extra: LibraryTombstone[] = [];
  for (const key of knownKeys) {
    if (!present.has(key)) extra.push({ key, at: now });
  }
  if (extra.length === 0) {
    knownKeys = present;
    return;
  }
  writePayload({ ...current, removed: [...current.removed, ...extra] });
}

function getRevision(): number | null {
  const raw = localStorage.getItem(LIBRARY_REV_KEY);
  if (!raw) return null;
  const revision = Number(raw);
  if (!Number.isInteger(revision) || revision < 1) return null;
  return revision;
}

function setRevision(value: unknown) {
  const revision = Number(value);
  if (!Number.isInteger(revision) || revision < 1) return;
  localStorage.setItem(LIBRARY_REV_KEY, String(revision));
}

function libraryUrl() {
  const project = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!project || !key) return null;
  return {
    url: `https://${project}.supabase.co/functions/v1/verse-library`,
    key: key as string,
  };
}

async function callLibrary(body: unknown): Promise<{ status: number; json: Record<string, unknown> }> {
  const target = libraryUrl();
  if (!target) throw new Error('library unavailable');
  const response = await fetch(target.url, {
    method: 'POST',
    headers: {
      apikey: target.key,
      Authorization: `Bearer ${target.key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const json = await response.json().catch(() => ({}));
  return { status: response.status, json: json && typeof json === 'object' ? json as Record<string, unknown> : {} };
}

async function pull(code: string): Promise<{ payload: LibraryPayload; revision: number } | null> {
  const { status, json } = await callLibrary({ action: 'pull', code });
  if (status !== 200) throw new Error('pull failed');
  if (json.empty === true) return null;
  const revision = Number(json.revision);
  if (!Number.isInteger(revision) || revision < 1) throw new Error('pull failed');
  return { payload: sanitizePayload(json.payload), revision };
}

function hasLibrary(payload: LibraryPayload) {
  return payload.saved.length > 0 || payload.notes.length > 0 || payload.removed.length > 0;
}

async function pushWithRetry() {
  const payload = readPayload();
  if (!hasLibrary(payload) && getRevision() === null) {
    setPhase('local');
    return;
  }
  setPhase('saving');
  const code = ensureLibraryCode();
  for (let attempt = 0; attempt < 3; attempt++) {
    const current = readPayload();
    const { status, json } = await callLibrary({
      action: 'push',
      code,
      payload: current,
      baseRevision: getRevision(),
    });
    if (status === 200 && json.payload && typeof json.payload === 'object') {
      setRevision(json.revision);
      const stored = sanitizePayload(json.payload);
      if (librarySignature(stored) !== librarySignature(readPayload())) writePayload(stored);
      setPhase('saved');
      return;
    }
    if (status === 409 && json.payload && typeof json.payload === 'object') {
      writePayload(mergeLibraries(readPayload(), sanitizePayload(json.payload)));
      setRevision(json.revision);
      continue;
    }
    throw new Error('push failed');
  }
  throw new Error('push failed');
}

async function flush() {
  if (!dirty) return;
  dirty = false;
  try {
    await pushWithRetry();
  } catch {
    dirty = true;
    setPhase('offline');
  }
}

function schedulePush() {
  dirty = true;
  if (!ready || !listening) return;
  window.clearTimeout(timer);
  timer = window.setTimeout(() => {
    void enqueue(() => flush());
  }, 700);
}

async function initialSync() {
  setPhase('checking');
  const code = ensureLibraryCode();
  let remote: { payload: LibraryPayload; revision: number } | null = null;
  try {
    remote = await pull(code);
  } catch {
    ready = true;
    setPhase('offline');
    if (dirty) schedulePush();
    return;
  }
  recordRemovals();
  const local = readPayload();
  const merged = remote ? mergeLibraries(local, remote.payload) : local;
  if (librarySignature(merged) !== librarySignature(local)) writePayload(merged);
  else knownKeys = itemKeys(merged);
  ready = true;
  if (remote && librarySignature(readPayload()) === librarySignature(remote.payload)) {
    setRevision(remote.revision);
    setPhase('saved');
    if (dirty) await flush();
    return;
  }
  if (!remote && !hasLibrary(readPayload())) {
    setPhase('local');
    return;
  }
  dirty = true;
  await flush();
}

function onLocal(event: Event) {
  if (suppress) return;
  const key = (event as CustomEvent<string>).detail;
  if (key !== SAVED_VERSES_KEY && key !== VERSE_NOTES_KEY) return;
  recordRemovals();
  schedulePush();
}

function onNativeStorage(event: StorageEvent) {
  if (
    event.key !== SAVED_VERSES_KEY &&
    event.key !== VERSE_NOTES_KEY &&
    event.key !== LIBRARY_REMOVED_KEY
  ) return;
  knownKeys = itemKeys(readPayload());
}

function onOnline() {
  if (!listening) return;
  dirty = true;
  void enqueue(() => initialSync());
}

function onHide() {
  if (document.visibilityState !== 'hidden' || !dirty || !ready) return;
  window.clearTimeout(timer);
  void enqueue(() => flush());
}

export function startLibrarySync() {
  if (listening) return;
  listening = true;
  ready = false;
  const gen = ++generation;
  knownKeys = itemKeys(readPayload());
  window.addEventListener(HW_STORAGE_EVENT, onLocal);
  window.addEventListener('storage', onNativeStorage);
  window.addEventListener('online', onOnline);
  document.addEventListener('visibilitychange', onHide);
  void enqueue(async () => {
    if (gen !== generation) return;
    await initialSync();
  });
}

export function stopLibrarySync() {
  if (!listening) return;
  listening = false;
  ready = false;
  generation += 1;
  window.removeEventListener(HW_STORAGE_EVENT, onLocal);
  window.removeEventListener('storage', onNativeStorage);
  window.removeEventListener('online', onOnline);
  document.removeEventListener('visibilitychange', onHide);
  window.clearTimeout(timer);
}

export function restoreLibrary(raw: string): Promise<string> {
  const code = normalizeLibraryCode(raw);
  if (!code) {
    return Promise.reject(new Error('Enter the code from your other phone. It has four groups, like abcd-efgh-ijkl-mnop.'));
  }
  return enqueue(async () => {
    const previousCode = localStorage.getItem(LIBRARY_CODE_KEY);
    const previousRev = localStorage.getItem(LIBRARY_REV_KEY);
    localStorage.setItem(LIBRARY_CODE_KEY, code);
    localStorage.removeItem(LIBRARY_REV_KEY);
    ready = true;
    let remote: { payload: LibraryPayload; revision: number } | null;
    try {
      remote = await pull(code);
    } catch {
      if (previousCode) localStorage.setItem(LIBRARY_CODE_KEY, previousCode);
      else localStorage.removeItem(LIBRARY_CODE_KEY);
      if (previousRev) localStorage.setItem(LIBRARY_REV_KEY, previousRev);
      else localStorage.removeItem(LIBRARY_REV_KEY);
      throw new Error('HolyWord could not open that library. Check the connection and try again.');
    }
    const local = readPayload();
    if (!remote) {
      if (hasLibrary(local)) {
        dirty = true;
        await flush();
        if (phase === 'offline') throw new Error('HolyWord could not save this library. Try again when you are online.');
        return 'Nothing was saved under that code yet. This phone is saved with it now.';
      }
      setPhase('local');
      return 'Nothing is saved under that code yet.';
    }
    const merged = mergeLibraries(local, remote.payload);
    writePayload(merged);
    if (librarySignature(merged) !== librarySignature(remote.payload)) {
      setRevision(remote.revision);
      dirty = true;
      await flush();
      if (phase === 'offline') throw new Error('HolyWord could not finish restoring. Your verses are on this phone.');
    } else {
      setRevision(remote.revision);
      setPhase('saved');
    }
    return describeLibrary(readPayload());
  });
}

export function deleteRemoteLibrary(): Promise<boolean> {
  return enqueue(async () => {
    const code = localStorage.getItem(LIBRARY_CODE_KEY);
    if (!code || !LIBRARY_CODE_RE.test(code)) return true;
    try {
      const { status } = await callLibrary({ action: 'delete', code });
      return status === 200;
    } catch {
      return false;
    }
  });
}
