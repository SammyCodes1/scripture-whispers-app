import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useEffect, useCallback } from 'react';
import { toast } from 'sonner';

const REMINDER_KEY = 'hw-daily-reminder';
const LAST_SHOWN_KEY = 'hw-reminder-last-shown';

function localDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Fires the reminder on every page while the app is open. Settings only stores the time. */
export function DailyReminderWatcher() {
  useEffect(() => {
    const check = () => {
      let settings: ReminderSettings | null = null;
      try {
        const raw = localStorage.getItem(REMINDER_KEY);
        settings = raw ? JSON.parse(raw) : null;
      } catch {
        return;
      }
      if (!settings?.enabled) return;
      if (!('Notification' in window) || Notification.permission !== 'granted') return;

      const now = new Date();
      const today = localDate(now);
      const lastShown = localStorage.getItem(LAST_SHOWN_KEY);
      const minute = now.getMinutes();
      if (
        lastShown !== today &&
        now.getHours() === settings.hour &&
        minute >= settings.minute &&
        minute < settings.minute + 2
      ) {
        new Notification('📖 HolyWord', {
          body: 'Time for your daily Bible reading! Keep your streak going 🔥',
          icon: '/favicon.ico',
        });
        localStorage.setItem(LAST_SHOWN_KEY, today);
      }
    };

    check();
    const interval = setInterval(check, 30_000);
    document.addEventListener('visibilitychange', check);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', check);
    };
  }, []);

  return null;
}

interface ReminderSettings {
  enabled: boolean;
  hour: number; // 0-23
  minute: number; // 0-59
  updatedAt?: number;
}

const DEFAULT_SETTINGS: ReminderSettings = {
  enabled: false,
  hour: 8,
  minute: 0,
};

export function useDailyReminder() {
  const [settings, setSettings] = useLocalStorage<ReminderSettings>('hw-daily-reminder', DEFAULT_SETTINGS);

  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      toast.error('Notifications are not supported in this browser.');
      return false;
    }
    if (Notification.permission === 'granted') return true;
    const permission = await Notification.requestPermission();
    if (permission === 'granted') return true;
    toast.error('Notification permission denied. Enable it in your browser settings.');
    return false;
  }, []);

  const enableReminder = useCallback(async (hour: number, minute: number) => {
    const granted = await requestPermission();
    if (!granted) return;
    setSettings({ enabled: true, hour, minute, updatedAt: Date.now() });
    toast.success(`Daily reminder set for ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`);
  }, [requestPermission, setSettings]);

  const disableReminder = useCallback(() => {
    setSettings(prev => ({ ...prev, enabled: false, updatedAt: Date.now() }));
    toast.info('Daily reminder disabled');
  }, [setSettings]);

  const updateTime = useCallback((hour: number, minute: number) => {
    setSettings(prev => ({ ...prev, hour, minute, updatedAt: Date.now() }));
  }, [setSettings]);

  return { settings, enableReminder, disableReminder, updateTime, requestPermission };
}
