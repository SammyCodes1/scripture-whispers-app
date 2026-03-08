import { useState } from 'react';
import { THEMES, BIBLE_VERSIONS, FONT_SIZES, FONT_FAMILIES, useTheme } from '@/contexts/ThemeContext';
import { Trash2, Check, Type } from 'lucide-react';
import { toast } from 'sonner';
import DailyReminderSettings from '@/components/DailyReminderSettings';
import VoiceSettings from '@/components/VoiceSettings';
import AudioSpeedSettings from '@/components/AudioSpeedSettings';
import OfflineDownload from '@/components/OfflineDownload';

export default function SettingsPage() {
  const { theme, setTheme, version, setVersion, fontSize, setFontSize, fontFamily, setFontFamily } = useTheme();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDelete = () => {
    localStorage.clear();
    toast.success('All data has been deleted');
    setShowDeleteConfirm(false);
    window.location.reload();
  };

  return (
    <div className="fade-in space-y-6">
      <h2 className="font-display text-xl font-bold text-foreground">Settings</h2>

      {/* Theme Selection */}
      <section>
        <h3 className="font-display text-base font-bold text-foreground mb-3">App Theme</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {THEMES.map(t => (
            <button
              key={t.id}
              onClick={() => setTheme(t.id)}
              className={`flex items-center gap-2 rounded-xl border p-3 transition-all ${
                theme === t.id
                  ? 'border-primary bg-primary/10 ring-2 ring-primary'
                  : 'border-border bg-card hover:shadow-md'
              }`}
            >
              <span className="text-xl">{t.emoji}</span>
              <span className="text-sm font-medium text-card-foreground flex-1 text-left">{t.name}</span>
              {theme === t.id && <Check size={16} className="text-primary" />}
            </button>
          ))}
        </div>
      </section>

      {/* Bible Version */}
      <section>
        <h3 className="font-display text-base font-bold text-foreground mb-3">Bible Version</h3>
        <div className="flex flex-wrap gap-2">
          {BIBLE_VERSIONS.map(v => (
            <button
              key={v.id}
              onClick={() => setVersion(v.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                version === v.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-primary/10'
              }`}
            >
              <span className="font-bold">{v.name}</span>
              <span className="text-xs opacity-70 ml-1 hidden sm:inline">({v.full})</span>
            </button>
          ))}
        </div>
      </section>

      {/* Font Size */}
      <section>
        <h3 className="font-display text-base font-bold text-foreground mb-3 flex items-center gap-2">
          <Type size={18} /> Font Size
        </h3>
        <div className="flex gap-2">
          {FONT_SIZES.map(f => (
            <button
              key={f.id}
              onClick={() => setFontSize(f.id)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                fontSize === f.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-primary/10'
              }`}
            >
              {f.name}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-2">Preview: <span style={{ fontSize: FONT_SIZES.find(f => f.id === fontSize)?.value, fontFamily: FONT_FAMILIES.find(f => f.id === fontFamily)?.value }}>The Lord is my shepherd.</span></p>
      </section>

      {/* Font Family */}
      <section>
        <h3 className="font-display text-base font-bold text-foreground mb-3 flex items-center gap-2">
          <Type size={18} /> Font Family
        </h3>
        <div className="flex gap-2">
          {FONT_FAMILIES.map(f => (
            <button
              key={f.id}
              onClick={() => setFontFamily(f.id)}
              className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                fontFamily === f.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-primary/10'
              }`}
            >
              <span>{f.emoji}</span>
              <span style={{ fontFamily: f.value }}>{f.name}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Daily Reminder */}
      <DailyReminderSettings />

      {/* Voice Selection */}
      <VoiceSettings />

      {/* Audio Speed */}
      <AudioSpeedSettings />

      {/* Offline Download */}
      <OfflineDownload />

      {/* Delete Account */}
      <section className="border-t border-border pt-6">
        <h3 className="font-display text-base font-bold text-foreground mb-2">Danger Zone</h3>
        <p className="text-sm text-muted-foreground mb-3">
          Delete all your data including bookmarks, highlights, and community posts.
        </p>

        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-destructive text-destructive-foreground text-sm font-medium hover:opacity-90 transition"
          >
            <Trash2 size={16} />
            Delete Account Data
          </button>
        ) : (
          <div className="rounded-xl border border-destructive/50 bg-destructive/5 p-4 space-y-3">
            <p className="text-sm font-medium text-foreground">
              Are you sure? This action cannot be undone.
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleDelete}
                className="px-4 py-2 rounded-lg bg-destructive text-destructive-foreground text-sm font-medium hover:opacity-90 transition"
              >
                Yes, delete everything
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 rounded-lg bg-secondary text-secondary-foreground text-sm font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
