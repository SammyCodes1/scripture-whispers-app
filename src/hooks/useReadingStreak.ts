import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useCallback } from 'react';

interface StreakData {
  lastReadDate: string; // YYYY-MM-DD
  currentStreak: number;
  longestStreak: number;
  totalDaysRead: number;
  readDates: string[]; // all dates ever read
}

function formatLocalDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const getToday = () => formatLocalDate(new Date());

const getYesterday = () => {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return formatLocalDate(date);
};

const DEFAULT_STREAK: StreakData = {
  lastReadDate: '',
  currentStreak: 0,
  longestStreak: 0,
  totalDaysRead: 0,
  readDates: [],
};

export function useReadingStreak() {
  const [streak, setStreak] = useLocalStorage<StreakData>('hw-reading-streak', DEFAULT_STREAK);

  const recordReading = useCallback(() => {
    const today = getToday();
    setStreak(prev => {
      if (prev.lastReadDate === today) return prev; // already recorded today

      const yesterday = getYesterday();
      const newStreak = prev.lastReadDate === yesterday ? prev.currentStreak + 1 : 1;
      const longest = Math.max(prev.longestStreak, newStreak);

      return {
        lastReadDate: today,
        currentStreak: newStreak,
        longestStreak: longest,
        totalDaysRead: prev.totalDaysRead + 1,
        readDates: [...prev.readDates, today],
      };
    });
  }, [setStreak]);

  // Check if streak is still active (read today or yesterday)
  const today = getToday();
  const yesterday = getYesterday();
  const isActive = streak.lastReadDate === today || streak.lastReadDate === yesterday;
  const currentStreak = isActive ? streak.currentStreak : 0;
  const readToday = streak.lastReadDate === today;

  return {
    currentStreak,
    longestStreak: streak.longestStreak,
    totalDaysRead: streak.totalDaysRead,
    readToday,
    recordReading,
  };
}
