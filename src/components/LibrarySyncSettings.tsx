import { useEffect, useState } from 'react';
import { Check, Copy, Library } from 'lucide-react';
import { toast } from 'sonner';
import {
  ensureLibraryCode,
  getLibraryPhase,
  restoreLibrary,
  subscribeLibraryPhase,
  type LibraryPhase,
} from '@/lib/verseLibrarySync';

const PHASE_COPY: Record<LibraryPhase, string> = {
  checking: 'Checking HolyWord…',
  saving: 'Saving to HolyWord…',
  saved: 'Saved with HolyWord.',
  local: 'Saved on this phone. A bookmark, note, streak, or plan is copied to HolyWord.',
  offline: 'On this phone for now. HolyWord will catch up when you are back online.',
};

export default function LibrarySyncSettings() {
  const [code, setCode] = useState(() => ensureLibraryCode());
  const [draft, setDraft] = useState('');
  const [phase, setPhase] = useState<LibraryPhase>(getLibraryPhase);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => subscribeLibraryPhase(setPhase), []);

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      const area = document.createElement('textarea');
      area.value = code;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.left = '-9999px';
      document.body.appendChild(area);
      area.select();
      document.execCommand('copy');
      area.remove();
    }
    setCopied(true);
    toast.success('Library code copied.');
    window.setTimeout(() => setCopied(false), 2000);
  };

  const onRestore = async () => {
    setBusy(true);
    try {
      const message = await restoreLibrary(draft);
      setCode(ensureLibraryCode());
      setDraft('');
      toast.success(message);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not restore that library.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section data-library-status={phase} data-library-code={code}>
      <h3 className="font-display text-sm sm:text-base font-bold text-foreground mb-3 flex items-center gap-2">
        <Library size={18} /> Library
      </h3>
      <div className="rounded-xl bg-card border border-border p-3 sm:p-4 space-y-3">
        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
          Bookmarks, highlights, notes, your reading streak, plans, and reminder are saved with HolyWord. On a new phone, sign in or enter this code. Keep the code. Without it, a cleared site cannot find them.
        </p>
        <div className="flex items-start gap-2">
          <p className="flex-1 min-w-0 font-mono text-sm text-foreground break-all leading-relaxed">{code}</p>
          <button
            type="button"
            onClick={copyCode}
            className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg bg-secondary text-secondary-foreground text-xs font-medium active:scale-95"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            value={draft}
            onChange={event => setDraft(event.target.value)}
            placeholder="Paste a library code"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            aria-label="Library code from another phone"
            className="w-full min-w-0 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            type="button"
            onClick={onRestore}
            disabled={busy || draft.trim().length === 0}
            className="shrink-0 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs sm:text-sm font-medium disabled:opacity-50 active:scale-95"
          >
            {busy ? 'Restoring…' : 'Restore'}
          </button>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed" data-library-phase-copy>
          {PHASE_COPY[phase]}
        </p>
      </div>
    </section>
  );
}
