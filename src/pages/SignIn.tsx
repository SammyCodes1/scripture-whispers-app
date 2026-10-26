import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { signInWithGoogle, signOut } from '@/lib/auth';
import { useAuth } from '@/hooks/useAuth';

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 8 3.1l5.7-5.7C34.2 6.1 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 12 24 12c3.1 0 5.8 1.2 8 3.1l5.7-5.7C34.2 6.1 29.4 4 24 4 16.3 4 9.6 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.6-5.2l-6.3-5.3C29.3 35.1 26.8 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-1.1 3.2-3.5 5.7-6.6 7.1l6.3 5.3C37.4 38.3 44 34 44 24c0-1.2-.1-2.3-.4-3.5z" />
    </svg>
  );
}

export default function SignInPage() {
  const { ready, email, name } = useAuth();
  const [params] = useSearchParams();
  const [busy, setBusy] = useState(false);
  const failed = params.get('error');

  const onGoogle = async () => {
    setBusy(true);
    try {
      await signInWithGoogle();
    } catch {
      setBusy(false);
      toast.error('Google sign-in did not start. Try again in a moment.');
    }
  };

  const onSignOut = async () => {
    setBusy(true);
    try {
      await signOut();
      toast.success('Signed out. Verses already on this phone stay here.');
    } catch {
      toast.error('Could not sign out.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fade-in max-w-md mx-auto pt-4 sm:pt-8">
      <h2 className="font-display text-lg sm:text-xl font-bold text-foreground tracking-tight">Sign in</h2>
      <p className="text-xs sm:text-sm text-muted-foreground mt-2 mb-4 leading-relaxed">
        Use a Google account and your bookmarks, highlights, notes, reading streak, plans, and reminder open on the next phone you sign in with.
      </p>
      <div className="rounded-xl bg-card border border-border p-3 sm:p-4 space-y-3">
        {!ready ? (
          <p className="text-sm text-muted-foreground">Checking your account…</p>
        ) : email ? (
          <>
            <p className="text-sm text-foreground leading-relaxed">
              Signed in{name ? ` as ${name}` : ''}.
            </p>
            <p className="text-xs text-muted-foreground break-all">{email}</p>
            <button
              type="button"
              onClick={onSignOut}
              disabled={busy}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-secondary text-secondary-foreground text-xs sm:text-sm font-medium disabled:opacity-50 active:scale-95"
            >
              <LogOut size={16} />
              Sign out
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={onGoogle}
              disabled={busy}
              className="w-full flex items-center justify-center gap-3 rounded-xl border border-border bg-background px-4 py-3 text-sm font-medium text-foreground disabled:opacity-50 active:scale-[0.98]"
            >
              <GoogleMark />
              {busy ? 'Opening Google…' : 'Continue with Google'}
            </button>
            <p className="text-xs text-muted-foreground leading-relaxed">
              HolyWord asks Google for your name and email. The library code in Settings still brings this with you if you skip sign-in.
            </p>
          </>
        )}
        {failed && !email && (
          <p className="text-xs text-destructive leading-relaxed">
            Google sign-in did not finish. Try again.
          </p>
        )}
      </div>
    </div>
  );
}
