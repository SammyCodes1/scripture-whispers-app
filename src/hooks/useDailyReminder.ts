import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useEffect, useCallback } from 'react';
import { toast } from 'sonner';

interface ReminderSettings {
  enabled: boolean;
  hour: number; // 0-23
  minute: number; // 0-59
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
    setSettings({ enabled: true, hour, minute });
    toast.success(`Daily reminder set for ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`);
  }, [requestPermission, setSettings]);

  const disableReminder = useCallback(() => {
    setSettings(prev => ({ ...prev, enabled: false }));
    toast.info('Daily reminder disabled');
  }, [setSettings]);

  const updateTime = useCallback((hour: number, minute: number) => {
    setSettings(prev => ({ ...prev, hour, minute }));
  }, [setSettings]);

  // Check & fire notification
  useEffect(() => {
    if (!settings.enabled) return;
    if (!('Notification' in window) || Notification.permission !== 'granted') return;

    const check = () => {
      const now = new Date();
      const lastShown = localStorage.getItem('hw-reminder-last-shown');
      const today = now.toISOString().split('T')[0];

      if (
        lastShown !== today &&
        now.getHours() === settings.hour &&
        now.getMinutes() >= settings.minute &&
        now.getMinutes() < settings.minute + 2
      ) {
        new Notification('📖 HolyWord', {
          body: 'Time for your daily Bible reading! Keep your streak going 🔥',
          icon: '/favicon.ico',
        });
        localStorage.setItem('hw-reminder-last-shown', today);
      }
    };

    check();
    const interval = setInterval(check, 60_000); // check every minute
    return () => clearInterval(interval);
  }, [settings]);

  return { settings, enableReminder, disableReminder, updateTime };
}
