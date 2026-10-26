import { READING_PLANS, type ReadingDay, type ReadingPlan } from '@/data/readingPlansData';

export interface PlanProgress {
  planId: string;
  startedAt: number;
  completedDays: number[];
  updatedAt?: number;
}

export const PLAN_PROGRESS_KEY = 'hw-reading-plans';

/** Day 1 is the calendar day the plan was started. */
export function calendarDayNumber(startedAt: number, totalDays: number, now = new Date()) {
  const start = new Date(startedAt);
  start.setHours(0, 0, 0, 0);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const diff = Math.floor((today.getTime() - start.getTime()) / 86400000) + 1;
  return Math.min(Math.max(diff, 1), totalDays + 1);
}

export function readingRange(readings: { book: string; chapter: number }[]) {
  const first = readings[0];
  const last = readings[readings.length - 1];
  if (!first) return '';
  if (!last || readings.length === 1 || (first.book === last.book && first.chapter === last.chapter)) {
    return `${first.book} ${first.chapter}`;
  }
  if (first.book === last.book) return `${first.book} ${first.chapter}–${last.chapter}`;
  return `${first.book} ${first.chapter} – ${last.book} ${last.chapter}`;
}

export function todaysPlan(progress: PlanProgress[], now = new Date()) {
  const active = progress
    .map(item => ({ item, plan: READING_PLANS.find(plan => plan.id === item.planId) }))
    .filter((entry): entry is { item: PlanProgress; plan: ReadingPlan } => Boolean(entry.plan))
    .sort((a, b) => b.item.startedAt - a.item.startedAt)[0];

  if (!active) return null;

  const dayNumber = calendarDayNumber(active.item.startedAt, active.plan.totalDays, now);
  const day: ReadingDay | undefined = active.plan.days.find(entry => entry.day === dayNumber);
  const behind = active.plan.days.some(entry => entry.day < dayNumber && !active.item.completedDays.includes(entry.day));

  return {
    plan: active.plan,
    day,
    dayNumber,
    finished: !day,
    done: day ? active.item.completedDays.includes(day.day) : active.item.completedDays.length >= active.plan.totalDays,
    behind,
  };
}
