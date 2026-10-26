// Reading streak, plan progress, and the daily reminder.
// They travel inside the verse-library payload, under the same code and Google account.

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const PLAN_ID_RE = /^[a-z0-9-]{1,40}$/;
const MAX_DATES = 5000;
const MAX_PLANS = 20;
const MAX_PLAN_DAYS = 400;
const MAX_PLAN_TOMBS = 50;
const DAY_MS = 86_400_000;

export const READING_STREAK_KEY = 'hw-reading-streak';
export const PLAN_REMOVED_KEY = 'hw-reading-plans-removed';
export const REMINDER_KEY = 'hw-daily-reminder';

export interface HabitPlan {
  planId: string;
  startedAt: number;
  completedDays: number[];
  updatedAt: number;
}

export interface HabitPlanTombstone {
  planId: string;
  at: number;
}

export interface HabitReminder {
  enabled: boolean;
  hour: number;
  minute: number;
  updatedAt: number;
}

export interface HabitPayload {
  readDates: string[];
  longestStreak: number;
  plans: HabitPlan[];
  removedPlans: HabitPlanTombstone[];
  reminder: HabitReminder | null;
}

export interface StreakRecord {
  lastReadDate: string;
  currentStreak: number;
  longestStreak: number;
  totalDaysRead: number;
  readDates: string[];
}

export function emptyHabits(): HabitPayload {
  return { readDates: [], longestStreak: 0, plans: [], removedPlans: [], reminder: null };
}

export function hasHabits(habits: HabitPayload | undefined): boolean {
  if (!habits) return false;
  return habits.readDates.length > 0
    || habits.plans.length > 0
    || habits.removedPlans.length > 0
    || habits.reminder !== null;
}

function cleanTime(value: unknown, now: number): number | null {
  const n = typeof value === 'number' ? value : NaN;
  if (!Number.isFinite(n)) return null;
  const rounded = Math.round(n);
  if (rounded < 0 || rounded > now + DAY_MS) return null;
  return rounded;
}

function parseDate(value: unknown, now: number): string | null {
  if (typeof value !== 'string') return null;
  const match = DATE_RE.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const stamp = Date.UTC(year, month - 1, day);
  const check = new Date(stamp);
  if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) return null;
  if (stamp < Date.UTC(2000, 0, 1) || stamp > now + 2 * DAY_MS) return null;
  return value;
}

function utcDay(iso: string): number {
  const [year, month, day] = iso.split('-').map(Number);
  return Math.floor(Date.UTC(year, month - 1, day) / DAY_MS);
}

export function longestRun(dates: string[]): number {
  let best = 0;
  let run = 0;
  let prev = -1;
  for (const date of dates) {
    const day = utcDay(date);
    run = prev >= 0 && day === prev + 1 ? run + 1 : 1;
    if (run > best) best = run;
    prev = day;
  }
  return best;
}

export function consecutiveEnding(dates: string[]): number {
  if (dates.length === 0) return 0;
  let run = 1;
  for (let i = dates.length - 1; i > 0; i -= 1) {
    if (utcDay(dates[i]) - utcDay(dates[i - 1]) !== 1) break;
    run += 1;
  }
  return run;
}

function parsePlan(item: unknown, now: number): HabitPlan | null {
  if (!item || typeof item !== 'object') return null;
  const row = item as Record<string, unknown>;
  const planId = typeof row.planId === 'string' ? row.planId : '';
  const startedAt = cleanTime(row.startedAt, now);
  if (!PLAN_ID_RE.test(planId) || startedAt === null || startedAt < 1_500_000_000_000) return null;
  const stamped = cleanTime(row.updatedAt, now);
  const updatedAt = stamped === null || stamped === 0 ? startedAt : stamped;
  const days = new Set<number>();
  if (Array.isArray(row.completedDays)) {
    for (const day of row.completedDays) {
      if (!Number.isInteger(day) || day < 1 || day > MAX_PLAN_DAYS) continue;
      days.add(day as number);
      if (days.size >= MAX_PLAN_DAYS) break;
    }
  }
  return {
    planId,
    startedAt,
    completedDays: [...days].sort((a, b) => a - b),
    updatedAt,
  };
}

function parseReminder(value: unknown, now: number): HabitReminder | null {
  if (!value || typeof value !== 'object') return null;
  const row = value as Record<string, unknown>;
  if (typeof row.enabled !== 'boolean') return null;
  const hour = row.hour;
  const minute = row.minute;
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) return null;
  if (!Number.isInteger(minute) || minute < 0 || minute > 59) return null;
  const updatedAt = cleanTime(row.updatedAt, now) ?? 0;
  if (!row.enabled && hour === 8 && minute === 0 && updatedAt === 0) return null;
  return { enabled: row.enabled, hour, minute, updatedAt };
}

export function sanitizeHabits(input: unknown, now = Date.now()): HabitPayload {
  const row = input && typeof input === 'object' ? input as Record<string, unknown> : {};
  const dates = new Set<string>();
  const rawDates = Array.isArray(row.readDates) ? row.readDates : [];
  for (const value of rawDates) {
    const date = parseDate(value, now);
    if (date) dates.add(date);
  }
  let readDates = [...dates].sort();
  if (readDates.length > MAX_DATES) readDates = readDates.slice(readDates.length - MAX_DATES);

  const plans = new Map<string, HabitPlan>();
  if (Array.isArray(row.plans)) {
    for (const item of row.plans) {
      const plan = parsePlan(item, now);
      if (!plan) continue;
      const current = plans.get(plan.planId);
      if (!current || plan.updatedAt >= current.updatedAt) plans.set(plan.planId, plan);
      if (plans.size > MAX_PLANS) break;
    }
  }

  const removed = new Map<string, number>();
  if (Array.isArray(row.removedPlans)) {
    for (const item of row.removedPlans) {
      if (!item || typeof item !== 'object') continue;
      const tomb = item as Record<string, unknown>;
      const planId = typeof tomb.planId === 'string' ? tomb.planId : '';
      const at = cleanTime(tomb.at, now);
      if (!PLAN_ID_RE.test(planId) || at === null) continue;
      const prev = removed.get(planId);
      if (prev === undefined || at > prev) removed.set(planId, at);
    }
  }

  for (const [planId, at] of removed) {
    const plan = plans.get(planId);
    if (plan && at >= plan.updatedAt) plans.delete(planId);
    const kept = plans.get(planId);
    if (kept && kept.updatedAt > at) removed.delete(planId);
  }

  const claimed = Number.isInteger(row.longestStreak) ? Number(row.longestStreak) : 0;
  const longestStreak = Math.min(
    MAX_DATES,
    Math.max(0, claimed, longestRun(readDates)),
  );

  const removedPlans = [...removed.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_PLAN_TOMBS)
    .map(([planId, at]) => ({ planId, at }));

  return {
    readDates,
    longestStreak,
    plans: [...plans.values()].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, MAX_PLANS),
    removedPlans,
    reminder: parseReminder(row.reminder, now),
  };
}

export function mergeHabits(a: HabitPayload, b: HabitPayload, now = Date.now()): HabitPayload {
  const plans = new Map<string, HabitPlan>();
  const takePlan = (plan: HabitPlan) => {
    const current = plans.get(plan.planId);
    if (!current || plan.updatedAt > current.updatedAt) {
      plans.set(plan.planId, plan);
      return;
    }
    if (plan.updatedAt < current.updatedAt) return;
    const days = new Set([...current.completedDays, ...plan.completedDays]);
    plans.set(plan.planId, {
      planId: plan.planId,
      startedAt: Math.min(current.startedAt, plan.startedAt),
      completedDays: [...days].sort((x, y) => x - y),
      updatedAt: plan.updatedAt,
    });
  };
  for (const plan of [...a.plans, ...b.plans]) takePlan(plan);

  let reminder = a.reminder;
  if (!reminder || (b.reminder && b.reminder.updatedAt >= reminder.updatedAt)) reminder = b.reminder;

  return sanitizeHabits({
    readDates: [...a.readDates, ...b.readDates],
    longestStreak: Math.max(a.longestStreak, b.longestStreak),
    plans: [...plans.values()],
    removedPlans: [...a.removedPlans, ...b.removedPlans],
    reminder,
  }, now);
}

export function streakRecord(habits: HabitPayload): StreakRecord {
  const readDates = habits.readDates;
  return {
    lastReadDate: readDates[readDates.length - 1] ?? '',
    currentStreak: consecutiveEnding(readDates),
    longestStreak: Math.max(habits.longestStreak, longestRun(readDates)),
    totalDaysRead: readDates.length,
    readDates,
  };
}

/** Read the pieces kept in localStorage and turn them into one habit payload. */
export function habitsFromParts(
  streak: unknown,
  plans: unknown,
  removedPlans: unknown,
  reminder: unknown,
  now = Date.now(),
): HabitPayload {
  const row = streak && typeof streak === 'object' ? streak as Record<string, unknown> : {};
  const readDates = Array.isArray(row.readDates) ? [...row.readDates] : [];
  if (typeof row.lastReadDate === 'string') readDates.push(row.lastReadDate);
  return sanitizeHabits({
    readDates,
    longestStreak: row.longestStreak,
    plans,
    removedPlans,
    reminder,
  }, now);
}
