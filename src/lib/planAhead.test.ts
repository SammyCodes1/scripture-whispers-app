import { describe, expect, it } from 'vitest';
import { chaptersAhead, AHEAD_CAP } from './planAhead';

const now = new Date(2026, 9, 26, 15, 0, 0);
const startedAt = new Date(2026, 9, 26, 8, 0, 0).getTime();

describe('chapters ahead', () => {
  it('starts at Genesis and stays within three days', () => {
    const chapters = chaptersAhead([{ planId: '12-month', startedAt, completedDays: [] }], now);
    expect(chapters[0]).toEqual({ book: 'Genesis', chapter: 1 });
    expect(chapters.length).toBeGreaterThanOrEqual(8);
    expect(chapters.length).toBeLessThanOrEqual(16);
    expect(chapters.length).toBeLessThanOrEqual(AHEAD_CAP);
  });

  it('moves forward as the calendar moves', () => {
    const later = new Date(2026, 9, 28, 15, 0, 0);
    const first = chaptersAhead([{ planId: '12-month', startedAt, completedDays: [] }], now);
    const third = chaptersAhead([{ planId: '12-month', startedAt, completedDays: [] }], later);
    expect(third[0]).not.toEqual(first[0]);
    expect(third.some(chapter => chapter.book === 'Genesis' && chapter.chapter === 1)).toBe(false);
  });

  it('returns nothing when the plan is finished or missing', () => {
    expect(chaptersAhead([], now)).toEqual([]);
    const old = new Date(2020, 0, 1).getTime();
    expect(chaptersAhead([{ planId: '12-month', startedAt: old, completedDays: [] }], now)).toEqual([]);
  });
});
