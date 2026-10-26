import { describe, expect, it } from 'vitest';
import { emptyLibrary, mergeLibraries, sanitizePayload } from './verseLibrary';
import {
  emptyHabits,
  habitsFromParts,
  mergeHabits,
  sanitizeHabits,
  streakRecord,
} from './readerHabits';

const NOW = Date.UTC(2026, 9, 26, 12);
const T0 = 1_760_000_000_000;

function plan(planId: string, updatedAt: number, completedDays: number[], startedAt = updatedAt - 1000) {
  return { planId, startedAt, completedDays, updatedAt };
}

describe('reader habits', () => {
  it('unions reading days from two phones and rebuilds the streak', () => {
    const merged = mergeHabits(
      { ...emptyHabits(), readDates: ['2026-10-24'], longestStreak: 1 },
      { ...emptyHabits(), readDates: ['2026-10-25', '2026-10-26'], longestStreak: 2 },
      NOW,
    );
    expect(merged.readDates).toEqual(['2026-10-24', '2026-10-25', '2026-10-26']);
    expect(streakRecord(merged)).toMatchObject({
      lastReadDate: '2026-10-26',
      currentStreak: 3,
      longestStreak: 3,
      totalDaysRead: 3,
    });
  });

  it('keeps the newer plan and unions days when the edits tie', () => {
    const newer = mergeHabits(
      { ...emptyHabits(), plans: [plan('12-month', T0 + 1000, [1])] },
      { ...emptyHabits(), plans: [plan('12-month', T0 + 2000, [2], T0 + 50)] },
      NOW,
    );
    expect(newer.plans[0].completedDays).toEqual([2]);
    expect(newer.plans[0].startedAt).toBe(T0 + 50);

    const tied = mergeHabits(
      { ...emptyHabits(), plans: [plan('12-month', T0 + 2000, [1])] },
      { ...emptyHabits(), plans: [plan('12-month', T0 + 2000, [2])] },
      NOW,
    );
    expect(tied.plans[0].completedDays).toEqual([1, 2]);
  });

  it('drops a reset plan and keeps a later restart', () => {
    const reset = mergeHabits(
      { ...emptyHabits(), plans: [plan('3-month', T0 + 1000, [1, 2])] },
      { ...emptyHabits(), removedPlans: [{ planId: '3-month', at: T0 + 1500 }] },
      NOW,
    );
    expect(reset.plans).toHaveLength(0);
    expect(reset.removedPlans).toEqual([{ planId: '3-month', at: T0 + 1500 }]);

    const restarted = mergeHabits(reset, {
      ...emptyHabits(),
      plans: [plan('3-month', T0 + 3000, [])],
    }, NOW);
    expect(restarted.plans).toHaveLength(1);
    expect(restarted.removedPlans).toHaveLength(0);
  });

  it('keeps the newer reminder and ignores the untouched default', () => {
    const merged = mergeHabits(
      { ...emptyHabits(), reminder: { enabled: false, hour: 7, minute: 30, updatedAt: 10 } },
      { ...emptyHabits(), reminder: { enabled: true, hour: 21, minute: 0, updatedAt: 20 } },
      NOW,
    );
    expect(merged.reminder).toMatchObject({ enabled: true, hour: 21, minute: 0 });

    const clean = sanitizeHabits({
      reminder: { enabled: false, hour: 8, minute: 0 },
    }, NOW);
    expect(clean.reminder).toBeNull();
  });

  it('reads an older streak record that only stored the last day', () => {
    const habits = habitsFromParts(
      { lastReadDate: '2026-10-26', currentStreak: 4, longestStreak: 9, totalDaysRead: 4, readDates: ['2026-10-26'] },
      [{ planId: '6-month', startedAt: 1_700_000_000_000, completedDays: [1], updatedAt: 1_700_000_000_100 }],
      [],
      { enabled: true, hour: 6, minute: 15, updatedAt: 1_700_000_000_200 },
      NOW,
    );
    expect(habits.readDates).toEqual(['2026-10-26']);
    expect(habits.longestStreak).toBe(9);
    expect(habits.plans[0].planId).toBe('6-month');
    expect(habits.reminder?.hour).toBe(6);
  });

  it('survives a verse merge', () => {
    const merged = mergeLibraries(
      {
        ...emptyLibrary(),
        habits: sanitizeHabits({ readDates: ['2026-10-20'], longestStreak: 1 }, NOW),
      },
      { ...emptyLibrary(), saved: [{ id: 'bookmark:John 3:16', ref: 'John 3:16', text: 'For God so loved', type: 'bookmark', createdAt: 10 }] },
    );
    expect(merged.saved).toHaveLength(1);
    expect(merged.habits?.readDates).toEqual(['2026-10-20']);
    const again = sanitizePayload(merged);
    expect(again.habits?.readDates).toEqual(['2026-10-20']);
  });
});
