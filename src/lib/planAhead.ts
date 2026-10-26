import { todaysPlan, type PlanProgress } from '@/lib/planToday';

/** Today plus the next two days. A sprint day is about 13 chapters, so three days stay under 40. */
export const AHEAD_DAYS = 3;
export const AHEAD_CAP = 40;

export interface AheadChapter {
  book: string;
  chapter: number;
}

export function aheadLabel(status: 'saving' | 'saved' | 'partial' | 'offline') {
  if (status === 'saving') return 'Saving today and the next two days on this phone…';
  if (status === 'saved') return 'Today and the next two days are saved on this phone.';
  if (status === 'partial') return 'HolyWord will keep saving the next few days when the connection is steady.';
  return 'Connect once to save today and the next two days.';
}

export function chaptersAhead(progress: PlanProgress[], now = new Date()): AheadChapter[] {
  const current = todaysPlan(progress, now);
  if (!current?.day) return [];

  const chapters: AheadChapter[] = [];
  const seen = new Set<string>();
  for (let offset = 0; offset < AHEAD_DAYS && chapters.length < AHEAD_CAP; offset += 1) {
    const day = current.plan.days.find(entry => entry.day === current.dayNumber + offset);
    if (!day) break;
    for (const reading of day.readings) {
      const key = `${reading.book}:${reading.chapter}`;
      if (seen.has(key)) continue;
      seen.add(key);
      chapters.push({ book: reading.book, chapter: reading.chapter });
      if (chapters.length >= AHEAD_CAP) break;
    }
  }
  return chapters;
}
