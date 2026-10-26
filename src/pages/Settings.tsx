import { useState } from 'react';
import { THEMES, BIBLE_VERSIONS, FONT_SIZES, FONT_FAMILIES, useTheme } from '@/contexts/ThemeContext';
import { Link } from 'react-router-dom';
import { Trash2, Check, Type, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import DailyReminderSettings from '@/components/DailyReminderSettings';
import VoiceSettings from '@/components/VoiceSettings';
import AudioSpeedSettings from '@/components/AudioSpeedSettings';
import OfflineDownload from '@/components/OfflineDownload';
import AdminAnnouncementPanel from '@/components/AdminAnnouncementPanel';
import LibrarySyncSettings from '@/components/LibrarySyncSettings';
import { deleteRemoteLibrary } from '@/lib/verseLibrarySync';
import { signOut } from '@/lib/auth';
import { useAuth } from '@/hooks/useAuth';

function deleteDatabase(name: string) {
  return new Promise<void>((resolve) => {
    const request = indexedDB.deleteDatabase(name);
    request.onsuccess = () => resolve();
    request.onerror = () => resolve();
    request.onblocked = () => resolve();
  });
}

export default function SettingsPage() {
  const { theme, setTheme, version, setVersion, fontSize, setFontSize, fontFamily, setFontFamily } = useTheme();
  const { ready, email, name } = useAuth();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDelete = async () => {
    const libraryDeleted = await deleteRemoteLibrary();
    if (!libraryDeleted) {
      toast.error('The library on HolyWord could not be deleted. Local data will still be cleared.');
    }
    const deviceId = localStorage.getItem('hw-device-id');
    if (deviceId) {
      const { error } = await supabase.from('community_posts').delete().eq('device_id', deviceId);
      if (error) toast.error('Community posts on the server could not be deleted. Local data will still be cleared.');
      const { error: prayerError } = await supabase.from('prayer_requests').delete().eq('device_id', deviceId);
      if (prayerError && prayerError.code !== 'PGRST205' && prayerError.code !== '42P01') {
        toast.error('Prayers on the server could not be deleted. Local data will still be cleared.');
      }
    }
    await Promise.all([
      'holyword-bible-cache',
      'hw-offline-files',
      'hw-location-images',
    ].map(deleteDatabase));
    localStorage.clear();
    window.location.reload();
  };

  return (
    <div className="fade-in space-y-5 sm:space-y-6">
      <h2 className="font-display text-lg sm:text-xl font-bold text-foreground tracking-tight">Settings</h2>

      <section>
        <h3 className="font-display text-sm sm:text-base font-bold text-foreground mb-3">Account</h3>
        <div className="rounded-xl bg-card border border-border p-3 sm:p-4 space-y-3">
          {!ready ? (
            <p className="text-sm text-muted-foreground">Checking your account…</p>
          ) : email ? (
            <>
              <p className="text-sm text-foreground leading-relaxed">
                Signed in{name ? ` as ${name}` : ''}. Your library, reading streak, plans, and reminder follow this Google account.
              </p>
              <p className="text-xs text-muted-foreground break-all">{email}</p>
              <button
                type="button"
                onClick={() => { void signOut(); }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-secondary text-secondary-foreground text-xs sm:text-sm font-medium active:scale-95"
              >
                <LogOut size={16} />
                Sign out
              </button>
            </>
          ) : (
            <>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Sign in with Google and your library, streak, plans, and reminder open on the next phone, without copying a code.
              </p>
              <Link
                to="/sign-in"
                className="inline-flex items-center px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-xs sm:text-sm font-medium active:scale-95"
              >
                Sign in with Google
              </Link>
            </>
          )}
        </div>
      </section>

      <LibrarySyncSettings />

      {/* Theme Selection */}
      <section>
        <h3 className="font-display text-sm sm:text-base font-bold text-foreground mb-3">App Theme</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {THEMES.map(t => (
            <button
              key={t.id}
              onClick={() => setTheme(t.id)}
              className={`flex items-center gap-2 rounded-xl border p-2.5 sm:p-3 transition-all text-left active:scale-[0.98] ${
                theme === t.id
                  ? 'border-primary bg-primary/10 ring-2 ring-primary'
                  : 'border-border bg-card hover:shadow-md'
              }`}
            >
              <span className="text-lg sm:text-xl shrink-0">{t.emoji}</span>
              <span className="text-xs sm:text-sm font-medium text-card-foreground flex-1 truncate">{t.name}</span>
              {theme === t.id && <Check size={16} className="text-primary shrink-0" />}
            </button>
          ))}
        </div>
      </section>

      {/* Bible Version */}
      <section>
        <h3 className="font-display text-sm sm:text-base font-bold text-foreground mb-3">Bible Version</h3>
        <div className="flex flex-wrap gap-1.5 sm:gap-2">
          {BIBLE_VERSIONS.map(v => (
            <button
              key={v.id}
              onClick={() => setVersion(v.id)}
              className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors active:scale-95 ${
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
        <h3 className="font-display text-sm sm:text-base font-bold text-foreground mb-3 flex items-center gap-2">
          <Type size={18} /> Font Size
        </h3>
        <div className="flex flex-wrap gap-2">
          {FONT_SIZES.map(f => (
            <button
              key={f.id}
              onClick={() => setFontSize(f.id)}
              className={`px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors active:scale-95 ${
                fontSize === f.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-primary/10'
              }`}
            >
              {f.name}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-2 leading-relaxed break-words">
          Preview:{' '}
          <span style={{ fontSize: FONT_SIZES.find(f => f.id === fontSize)?.value, fontFamily: FONT_FAMILIES.find(f => f.id === fontFamily)?.value }}>
            The Lord is my shepherd.
          </span>
        </p>
      </section>

      {/* Font Family */}
      <section>
        <h3 className="font-display text-sm sm:text-base font-bold text-foreground mb-3 flex items-center gap-2">
          <Type size={18} /> Font Family
        </h3>
        <div className="flex flex-wrap gap-2">
          {FONT_FAMILIES.map(f => (
            <button
              key={f.id}
              onClick={() => setFontFamily(f.id)}
              className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-colors flex items-center gap-2 active:scale-95 ${
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


      {/* Offline Download */}
      <OfflineDownload />

      {/* Admin Announcement Panel */}
      <AdminAnnouncementPanel />

      {/* Delete Account */}
      <section className="border-t border-border pt-5 sm:pt-6">
        <h3 className="font-display text-sm sm:text-base font-bold text-foreground mb-2">Danger Zone</h3>
        <p className="text-xs sm:text-sm text-muted-foreground mb-3 leading-relaxed">
          Deletes bookmarks, highlights, notes, the reading streak, plans, the reminder, and the HolyWord library for this code, plus offline Bibles, saved map images, and community posts from this device.
        </p>

        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-destructive text-destructive-foreground text-xs sm:text-sm font-medium hover:opacity-90 transition active:scale-95"
          >
            <Trash2 size={16} />
            Delete Account Data
          </button>
        ) : (
          <div className="rounded-xl border border-destructive/50 bg-destructive/5 p-3 sm:p-4 space-y-3">
            <p className="text-sm font-medium text-foreground leading-relaxed">
              Are you sure? This action cannot be undone.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleDelete}
                className="px-4 py-2 rounded-lg bg-destructive text-destructive-foreground text-xs sm:text-sm font-medium hover:opacity-90 transition active:scale-95"
              >
                Yes, delete everything
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 rounded-lg bg-secondary text-secondary-foreground text-xs sm:text-sm font-medium active:scale-95"
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
