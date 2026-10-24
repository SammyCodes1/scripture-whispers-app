import { getDeviceId } from '@/hooks/useDeviceId';

// FUMS (API.Bible Fair Use Management System) v3.
// The tracker script is loaded in index.html. If it is blocked (ad blockers, offline loading
// issues) we fall back to the documented manual GET report so usage is still counted.
interface FumsWindow extends Window {
  fums?: (...args: unknown[]) => void;
  __fumsLoaded?: boolean;
}

const SESSION_KEY = 'hw-fums-session';

function sessionId(): string {
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return 'anon-session';
  }
}

export function buildManualFumsUrl(token: string, deviceId: string, sessId: string): string {
  const qs = new URLSearchParams({ t: token, dId: deviceId, sId: sessId });
  return `https://fums.api.bible/f3?${qs.toString()}`;
}

/** Report that a passage carrying this `fumsToken` was displayed. Safe to call repeatedly. */
export function reportFumsView(token: string | null | undefined): void {
  if (!token || typeof window === 'undefined') return;
  const w = window as FumsWindow;
  try {
    if (w.__fumsLoaded && typeof w.fums === 'function') {
      w.fums('trackView', token);
      return;
    }
    const img = new Image();
    img.referrerPolicy = 'no-referrer';
    img.src = buildManualFumsUrl(token, getDeviceId(), sessionId());
  } catch {
    // Reporting must never break reading.
  }
}
