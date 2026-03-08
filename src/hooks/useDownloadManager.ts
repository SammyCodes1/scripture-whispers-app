import { downloadAllChapters, type DownloadProgress } from '@/hooks/useBibleCache';

type Listener = () => void;

export interface DownloadState {
  active: boolean;
  translation: string | null;
  progress: DownloadProgress | null;
}

let state: DownloadState = { active: false, translation: null, progress: null };
let abortController: AbortController | null = null;
const listeners = new Set<Listener>();

function notify() {
  listeners.forEach(fn => fn());
}

export function getDownloadState(): DownloadState {
  return state;
}

export function subscribeDownload(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function startGlobalDownload(translation: string): void {
  if (state.active) return; // already downloading

  abortController = new AbortController();
  state = { active: true, translation, progress: null };
  notify();

  downloadAllChapters(
    translation,
    (p) => {
      state = { active: true, translation, progress: p };
      notify();
    },
    abortController.signal
  ).then(() => {
    state = { active: false, translation: null, progress: null };
    notify();
  }).catch(() => {
    state = { active: false, translation: null, progress: null };
    notify();
  });
}

export function cancelGlobalDownload(): void {
  abortController?.abort();
  state = { active: false, translation: null, progress: null };
  notify();
}
