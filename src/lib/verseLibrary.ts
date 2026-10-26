// Bookmarks, highlights, notes, and reader habits synced through the verse-library function.
// The library code is the secret. The row is not readable by the anon key.
import {
  emptyHabits,
  mergeHabits,
  sanitizeHabits,
  type HabitPayload,
} from '@/lib/readerHabits';

export const SAVED_VERSES_KEY = 'hw-saved-verses';
export const VERSE_NOTES_KEY = 'hw-verse-notes';
export const LIBRARY_REMOVED_KEY = 'hw-library-removed';
export const LIBRARY_CODE_KEY = 'hw-library-code';
export const LIBRARY_REV_KEY = 'hw-library-rev';

const ALPHABET = 'abcdefghijkmnpqrstuvwxyz23456789';
export const LIBRARY_CODE_RE = /^[abcdefghijkmnpqrstuvwxyz23456789]{4}(?:-[abcdefghijkmnpqrstuvwxyz23456789]{4}){3}$/;
const TOMB_RE = /^(bookmark|highlight|note):.{1,80}$/;
const MAX_ITEMS = 2000;
const MAX_TOMBS = 4000;

export interface LibraryVerse {
  id: string;
  ref: string;
  text: string;
  type: 'bookmark' | 'highlight';
  color?: string;
  createdAt: number;
}

export interface LibraryNote {
  id: string;
  ref: string;
  verseText: string;
  note: string;
  createdAt: number;
  updatedAt: number;
}

export interface LibraryTombstone {
  key: string;
  at: number;
}

export interface LibraryPayload {
  saved: LibraryVerse[];
  notes: LibraryNote[];
  removed: LibraryTombstone[];
  habits?: HabitPayload;
}

export function emptyLibrary(): LibraryPayload {
  return { saved: [], notes: [], removed: [], habits: emptyHabits() };
}

export function generateLibraryCode(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let raw = '';
  for (const byte of bytes) raw += ALPHABET[byte % ALPHABET.length];
  return `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}-${raw.slice(12, 16)}`;
}

export function normalizeLibraryCode(raw: string): string | null {
  const compact = raw.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  if (compact.length !== 16) return null;
  const code = `${compact.slice(0, 4)}-${compact.slice(4, 8)}-${compact.slice(8, 12)}-${compact.slice(12, 16)}`;
  return LIBRARY_CODE_RE.test(code) ? code : null;
}

function cleanString(value: unknown, max: number): string {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, max);
}

function cleanTime(value: unknown): number | null {
  const n = typeof value === 'number' ? value : NaN;
  if (!Number.isFinite(n)) return null;
  const rounded = Math.round(n);
  if (rounded < 0 || rounded > Date.now() + 86_400_000) return null;
  return rounded;
}

function parseSaved(value: unknown): LibraryVerse[] {
  if (!Array.isArray(value)) return [];
  const saved: LibraryVerse[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    const ref = cleanString(row.ref, 80);
    const type = row.type === 'highlight' ? 'highlight' : row.type === 'bookmark' ? 'bookmark' : null;
    const createdAt = cleanTime(row.createdAt);
    if (!ref || !type || createdAt === null) continue;
    const color = typeof row.color === 'string' && /^[a-z]{3,20}$/.test(row.color) ? row.color : undefined;
    const id = cleanString(row.id, 80) || `${type}:${ref}`;
    const verse: LibraryVerse = { id, ref, text: cleanString(row.text, 2000), type, createdAt };
    if (color) verse.color = color;
    saved.push(verse);
  }
  return saved;
}

function parseNotes(value: unknown): LibraryNote[] {
  if (!Array.isArray(value)) return [];
  const notes: LibraryNote[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    const ref = cleanString(row.ref, 80);
    const note = cleanString(row.note, 4000);
    const updatedAt = cleanTime(row.updatedAt) ?? cleanTime(row.createdAt);
    if (!ref || !note || updatedAt === null) continue;
    const createdAt = cleanTime(row.createdAt) ?? updatedAt;
    notes.push({
      id: cleanString(row.id, 80) || `note:${ref}`,
      ref,
      verseText: cleanString(row.verseText, 2000),
      note,
      createdAt,
      updatedAt,
    });
  }
  return notes;
}

function parseRemoved(value: unknown): LibraryTombstone[] {
  if (!Array.isArray(value)) return [];
  const removed: LibraryTombstone[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    const key = cleanString(row.key, 100);
    const at = cleanTime(row.at);
    if (!TOMB_RE.test(key) || at === null) continue;
    removed.push({ key, at });
  }
  return removed;
}

export function sanitizePayload(input: unknown): LibraryPayload {
  const row = input && typeof input === 'object' ? input as Record<string, unknown> : {};
  return mergeLibraries(
    {
      saved: parseSaved(row.saved),
      notes: parseNotes(row.notes),
      removed: parseRemoved(row.removed),
      habits: sanitizeHabits(row.habits),
    },
    emptyLibrary(),
  );
}

export function mergeLibraries(a: LibraryPayload, b: LibraryPayload): LibraryPayload {
  const removed = new Map<string, number>();
  const considerRemoved = (list: LibraryTombstone[]) => {
    for (const tomb of list) {
      if (!tomb || !TOMB_RE.test(tomb.key) || !Number.isFinite(tomb.at)) continue;
      const prev = removed.get(tomb.key);
      if (prev === undefined || tomb.at > prev) removed.set(tomb.key, tomb.at);
    }
  };
  considerRemoved(a.removed);
  considerRemoved(b.removed);

  const saved = new Map<string, LibraryVerse>();
  const notes = new Map<string, LibraryNote>();
  const takeSaved = (item: LibraryVerse) => {
    const key = `${item.type}:${item.ref}`;
    const current = saved.get(key);
    if (!current || item.createdAt >= current.createdAt) saved.set(key, item);
  };
  const takeNote = (item: LibraryNote) => {
    const key = `note:${item.ref}`;
    const current = notes.get(key);
    if (!current || item.updatedAt >= current.updatedAt) notes.set(key, item);
  };
  for (const item of [...a.saved, ...b.saved]) takeSaved(item);
  for (const item of [...a.notes, ...b.notes]) takeNote(item);

  for (const [key, at] of removed) {
    const verse = saved.get(key);
    if (verse && at >= verse.createdAt) saved.delete(key);
    const note = notes.get(key);
    if (note && at >= note.updatedAt) notes.delete(key);
    const kept = saved.get(key) ?? notes.get(key);
    const keptAt = kept ? ('note' in kept ? kept.updatedAt : kept.createdAt) : undefined;
    if (keptAt !== undefined && keptAt > at) removed.delete(key);
  }

  let savedList = [...saved.entries()].sort((x, y) => y[1].createdAt - x[1].createdAt);
  if (savedList.length > MAX_ITEMS) {
    for (const [key, item] of savedList.slice(MAX_ITEMS)) removed.set(key, item.createdAt);
    savedList = savedList.slice(0, MAX_ITEMS);
  }
  let noteList = [...notes.entries()].sort((x, y) => y[1].updatedAt - x[1].updatedAt);
  if (noteList.length > MAX_ITEMS) {
    for (const [key, item] of noteList.slice(MAX_ITEMS)) removed.set(key, item.updatedAt);
    noteList = noteList.slice(0, MAX_ITEMS);
  }

  const removedList = [...removed.entries()]
    .sort((x, y) => y[1] - x[1])
    .slice(0, MAX_TOMBS)
    .map(([key, at]) => ({ key, at }));

  return {
    saved: savedList.map(([, item]) => item),
    notes: noteList.map(([, item]) => item),
    removed: removedList,
    habits: mergeHabits(a.habits ?? emptyHabits(), b.habits ?? emptyHabits()),
  };
}

export function librarySignature(payload: LibraryPayload): string {
  const saved = payload.saved
    .map(verse => `${verse.type}|${verse.ref}|${verse.text}|${verse.createdAt}|${verse.color ?? ''}`)
    .sort();
  const notes = payload.notes
    .map(note => `${note.ref}|${note.note}|${note.verseText}|${note.updatedAt}`)
    .sort();
  const removed = payload.removed.map(tomb => `${tomb.key}|${tomb.at}`).sort();
  const habits = payload.habits ?? emptyHabits();
  const plans = habits.plans
    .map(plan => `${plan.planId}|${plan.startedAt}|${plan.updatedAt}|${plan.completedDays.join(',')}`)
    .sort();
  const removedPlans = habits.removedPlans.map(tomb => `${tomb.planId}|${tomb.at}`).sort();
  const reminder = habits.reminder
    ? `${habits.reminder.enabled}|${habits.reminder.hour}|${habits.reminder.minute}|${habits.reminder.updatedAt}`
    : '';
  return JSON.stringify({
    saved,
    notes,
    removed,
    readDates: [...habits.readDates].sort(),
    longestStreak: habits.longestStreak,
    plans,
    removedPlans,
    reminder,
  });
}

export function describeLibrary(payload: LibraryPayload): string {
  const parts: string[] = [];
  const bookmarks = payload.saved.filter(verse => verse.type === 'bookmark').length;
  const highlights = payload.saved.filter(verse => verse.type === 'highlight').length;
  if (bookmarks) parts.push(`${bookmarks} bookmark${bookmarks === 1 ? '' : 's'}`);
  if (highlights) parts.push(`${highlights} highlight${highlights === 1 ? '' : 's'}`);
  if (payload.notes.length) parts.push(`${payload.notes.length} note${payload.notes.length === 1 ? '' : 's'}`);
  const habitNames: string[] = [];
  const habits = payload.habits;
  if (habits?.readDates.length) habitNames.push('reading streak');
  if (habits && habits.plans.length > 0) habitNames.push(habits.plans.length === 1 ? 'reading plan' : 'reading plans');
  if (habits?.reminder) habitNames.push('reminder');
  const habitText = habitNames.length === 0
    ? ''
    : habitNames.length === 1
      ? habitNames[0]
      : habitNames.length === 2
        ? `${habitNames[0]} and ${habitNames[1]}`
        : `${habitNames[0]}, ${habitNames[1]}, and ${habitNames[2]}`;

  if (parts.length === 0 && !habitText) return 'That library is empty.';
  if (parts.length === 0) return `Restored your ${habitText}.`;
  const verseText = parts.length === 1
    ? parts[0]
    : parts.length === 2
      ? `${parts[0]} and ${parts[1]}`
      : `${parts[0]}, ${parts[1]}, and ${parts[2]}`;
  if (!habitText) return `Restored ${verseText}.`;
  return `Restored ${verseText}, along with your ${habitText}.`;
}
