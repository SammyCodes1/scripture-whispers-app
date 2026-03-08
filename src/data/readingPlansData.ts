// Bible has 1189 chapters total
// 3 months ≈ 90 days → ~13 chapters/day
// 6 months ≈ 180 days → ~7 chapters/day
// 12 months ≈ 365 days → ~3-4 chapters/day

export interface ReadingDay {
  day: number;
  readings: { book: string; chapter: number }[];
}

export interface ReadingPlan {
  id: string;
  name: string;
  description: string;
  months: number;
  totalDays: number;
  emoji: string;
  days: ReadingDay[];
}

import { BIBLE_BOOKS } from './bibleData';

function generateFullBiblePlan(totalDays: number): ReadingDay[] {
  // Flatten all chapters
  const allChapters: { book: string; chapter: number }[] = [];
  for (const book of BIBLE_BOOKS) {
    for (let ch = 1; ch <= book.chapters; ch++) {
      allChapters.push({ book: book.name, chapter: ch });
    }
  }

  const days: ReadingDay[] = [];
  const chaptersPerDay = Math.ceil(allChapters.length / totalDays);
  let idx = 0;

  for (let d = 1; d <= totalDays; d++) {
    const readings: { book: string; chapter: number }[] = [];
    const count = d === totalDays
      ? allChapters.length - idx // last day gets remainder
      : Math.min(chaptersPerDay, allChapters.length - idx);

    for (let i = 0; i < count && idx < allChapters.length; i++, idx++) {
      readings.push(allChapters[idx]);
    }
    if (readings.length > 0) {
      days.push({ day: d, readings });
    }
  }

  return days;
}

export const READING_PLANS: ReadingPlan[] = [
  {
    id: '3-month',
    name: 'Sprint',
    description: 'Read the entire Bible in 3 months — about 13 chapters per day. An intense, immersive journey.',
    months: 3,
    totalDays: 90,
    emoji: '🏃',
    days: generateFullBiblePlan(90),
  },
  {
    id: '6-month',
    name: 'Steady',
    description: 'Read the entire Bible in 6 months — about 7 chapters per day. A balanced, committed pace.',
    months: 6,
    totalDays: 180,
    emoji: '🚶',
    days: generateFullBiblePlan(180),
  },
  {
    id: '12-month',
    name: 'Journey',
    description: 'Read the entire Bible in 12 months — about 3–4 chapters per day. A classic, sustainable pace.',
    months: 12,
    totalDays: 365,
    emoji: '🗓️',
    days: generateFullBiblePlan(365),
  },
];
