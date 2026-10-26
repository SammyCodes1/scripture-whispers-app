import { useEffect, useState } from 'react';
import { Bell, BellOff, Clock } from 'lucide-react';
import { useDailyReminder } from '@/hooks/useDailyReminder';

export default function DailyReminderSettings() {
  const { settings, enableReminder, disableReminder, updateTime, requestPermission } = useDailyReminder();
  const [hour, setHour] = useState(settings.hour);
  const [minute, setMinute] = useState(settings.minute);
  const [permission, setPermission] = useState(() => (
    typeof Notification === 'undefined' ? 'unsupported' : Notification.permission
  ));

  useEffect(() => {
    setHour(settings.hour);
    setMinute(settings.minute);
    if (typeof Notification !== 'undefined') setPermission(Notification.permission);
  }, [settings.hour, settings.minute, settings.enabled]);

  const allowOnThisPhone = async () => {
    const granted = await requestPermission();
    if (typeof Notification !== 'undefined') setPermission(granted ? 'granted' : Notification.permission);
  };

  const handleToggle = () => {
    if (settings.enabled) {
      disableReminder();
    } else {
      enableReminder(hour, minute);
    }
  };

  const handleTimeChange = (newHour: number, newMinute: number) => {
    setHour(newHour);
    setMinute(newMinute);
    if (settings.enabled) {
      updateTime(newHour, newMinute);
    }
  };

  return (
    <section>
      <h3 className="font-display text-base font-bold text-foreground mb-3 flex items-center gap-2">
        <Bell size={18} /> Daily Reminder
      </h3>
      <div className="rounded-xl bg-card border border-border p-4 space-y-3">
        {/* Toggle */}
        <button
          onClick={handleToggle}
          className={`w-full flex items-center justify-between p-3 rounded-lg border transition-colors ${
            settings.enabled
              ? 'bg-primary/10 border-primary text-primary'
              : 'bg-secondary border-border text-secondary-foreground'
          }`}
        >
          <span className="flex items-center gap-2 text-sm font-medium">
            {settings.enabled ? <Bell size={16} /> : <BellOff size={16} />}
            {settings.enabled ? 'Reminder On' : 'Reminder Off'}
          </span>
          <div className={`w-10 h-5 rounded-full transition-colors relative ${settings.enabled ? 'bg-primary' : 'bg-muted'}`}>
            <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-card shadow transition-transform ${settings.enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </div>
        </button>

        {/* Time picker */}
        <div className="flex items-center gap-2">
          <Clock size={14} className="text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Remind me at:</span>
          <select
            value={hour}
            onChange={e => handleTimeChange(Number(e.target.value), minute)}
            className="text-sm bg-secondary text-secondary-foreground rounded-lg px-2 py-1 border border-border"
          >
            {Array.from({ length: 24 }, (_, i) => (
              <option key={i} value={i}>{String(i).padStart(2, '0')}</option>
            ))}
          </select>
          <span className="text-muted-foreground">:</span>
          <select
            value={minute}
            onChange={e => handleTimeChange(hour, Number(e.target.value))}
            className="text-sm bg-secondary text-secondary-foreground rounded-lg px-2 py-1 border border-border"
          >
            {[0, 15, 30, 45].map(m => (
              <option key={m} value={m}>{String(m).padStart(2, '0')}</option>
            ))}
          </select>
        </div>

        {settings.enabled && permission !== 'granted' && (
          <button
            type="button"
            onClick={() => { void allowOnThisPhone(); }}
            className="w-full px-3 py-2 rounded-lg bg-secondary text-secondary-foreground text-xs font-medium active:scale-95"
          >
            Allow notifications on this phone
          </button>
        )}

        <p className="text-[11px] text-muted-foreground">
          {settings.enabled
            ? `While HolyWord is open, you'll be notified at ${String(settings.hour).padStart(2, '0')}:${String(settings.minute).padStart(2, '0')}.`
            : 'Enable to get a notification while the app is open, so you can keep your streak going.'}
        </p>
      </div>
    </section>
  );
}
