import { fetchChapterCached } from '@/hooks/useBibleCache';
import { HW_STORAGE_EVENT } from '@/hooks/useLocalStorage';
import { chaptersAhead } from '@/lib/planAhead';
import { PLAN_PROGRESS_KEY, type PlanProgress } from '@/lib/planToday';

export type PlanAheadPhase = 'idle' | 'saving' | 'saved' | 'partial' | 'offline';

const listeners = new Set<(phase: PlanAheadPhase) => void>();
let phase: PlanAheadPhase = 'idle';
let listening = false;
let generation = 0;
let timer = 0;
let chain: Promise<void> = Promise.resolve();

function setPhase(next: PlanAheadPhase) {
  phase = next;
  listeners.forEach(listener => listener(next));
}

export function getPlanAheadPhase(): PlanAheadPhase {
  return phase;
}

export function subscribePlanAhead(listener: (next: PlanAheadPhase) => void) {
  listeners.add(listener);
  listener(phase);
  return () => {
    listeners.delete(listener);
  };
}

function readProgress(): PlanProgress[] {
  try {
    const raw = localStorage.getItem(PLAN_PROGRESS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function readVersion() {
  return localStorage.getItem('hw-version') || 'kjv';
}

async function saveWindow(gen: number) {
  const chapters = chaptersAhead(readProgress());
  if (chapters.length === 0) {
    if (gen === generation) setPhase('idle');
    return;
  }
  if (!navigator.onLine) {
    if (gen === generation) setPhase('offline');
    return;
  }

  if (gen === generation) setPhase('saving');
  const version = readVersion();
  let saved = 0;
  let failed = 0;
  const pending = [...chapters];

  const worker = async () => {
    while (pending.length > 0 && gen === generation && navigator.onLine) {
      const next = pending.shift();
      if (!next) return;
      try {
        await fetchChapterCached(next.book, next.chapter, version);
        saved += 1;
      } catch {
        failed += 1;
      }
    }
  };

  await Promise.all([worker(), worker()]);
  if (gen !== generation) return;
  if (saved >= chapters.length && failed === 0) {
    retries = 0;
    setPhase('saved');
    return;
  }
  setPhase(!navigator.onLine && saved === 0 ? 'offline' : 'partial');
  retries += 1;
  if (retries >= 3) return;
  window.clearTimeout(timer);
  timer = window.setTimeout(schedule, 60_000);
}

let windowKey = '';
let retries = 0;

function schedule() {
  const chapters = chaptersAhead(readProgress());
  const key = `${readVersion()}|${chapters.map(chapter => `${chapter.book}:${chapter.chapter}`).join(',')}`;
  if (key !== windowKey) retries = 0;
  if (key === windowKey && (phase === 'saving' || phase === 'saved')) return;
  if (key === windowKey && phase === 'partial' && retries >= 3) return;
  windowKey = key;
  const gen = ++generation;
  const run = chain.then(() => saveWindow(gen), () => saveWindow(gen));
  chain = run.then(() => undefined, () => undefined);
}

function onStorage(event: Event) {
  const key = event instanceof StorageEvent ? event.key : (event as CustomEvent<string>).detail;
  if (key !== PLAN_PROGRESS_KEY && key !== 'hw-version') return;
  schedule();
}

function onVisible() {
  if (document.visibilityState === 'visible') schedule();
}

export function startPlanAhead() {
  if (listening) return;
  listening = true;
  window.addEventListener('online', schedule);
  window.addEventListener(HW_STORAGE_EVENT, onStorage);
  window.addEventListener('storage', onStorage);
  document.addEventListener('visibilitychange', onVisible);
  schedule();
}

export function stopPlanAhead() {
  if (!listening) return;
  listening = false;
  generation += 1;
  window.clearTimeout(timer);
  window.removeEventListener('online', schedule);
  window.removeEventListener(HW_STORAGE_EVENT, onStorage);
  window.removeEventListener('storage', onStorage);
  document.removeEventListener('visibilitychange', onVisible);
}
