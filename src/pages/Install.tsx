import { useState, useEffect, useRef } from 'react';
import { Download, Smartphone, CheckCircle2, Share, Loader2, WifiOff } from 'lucide-react';
import { OFFLINE_VERSIONS } from '@/contexts/ThemeContext';
import { downloadAllChapters, getCachedCount, getTotalChapters, type DownloadProgress } from '@/hooks/useBibleCache';
import { toast } from 'sonner';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

type Step = 'pick-version' | 'downloading' | 'done' | 'install-app';

export default function InstallPage() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [step, setStep] = useState<Step>('pick-version');
  const [selectedVersion, setSelectedVersion] = useState('');
  const [progress, setProgress] = useState<DownloadProgress | null>(null);
  const [cachedCounts, setCachedCounts] = useState<Record<string, number>>({});
  const abortRef = useRef<AbortController | null>(null);
  const total = getTotalChapters();

  useEffect(() => {
    const ua = navigator.userAgent;
    setIsIOS(/iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => setInstalled(true));
    if (window.matchMedia('(display-mode: standalone)').matches) setInstalled(true);

    // Load cached counts for all versions
    Promise.all(OFFLINE_VERSIONS.map(async v => {
      const count = await getCachedCount(v.id);
      return { id: v.id, count };
    })).then(results => {
      const counts: Record<string, number> = {};
      results.forEach(r => counts[r.id] = r.count);
      setCachedCounts(counts);
    });

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const pickAndDownload = async (versionId: string) => {
    setSelectedVersion(versionId);
    setStep('downloading');
    setProgress(null);
    abortRef.current = new AbortController();
    try {
      await downloadAllChapters(versionId, setProgress, abortRef.current.signal);
      const count = await getCachedCount(versionId);
      setCachedCounts(prev => ({ ...prev, [versionId]: count }));

      if (count >= total) {
        setStep('done');
        toast.success('Bible downloaded for offline use!');
      } else {
        setStep('pick-version');
        setProgress(null);
        toast.info(`Downloaded ${count} of ${total} chapters. Tap again to finish offline access.`);
      }
    } catch {
      setStep('pick-version');
      setProgress(null);
      if (abortRef.current?.signal.aborted) {
        toast('Download cancelled');
      } else {
        toast.error('Download interrupted');
      }
    }
  };

  const cancelDownload = () => {
    abortRef.current?.abort();
    setStep('pick-version');
    setProgress(null);
  };

  const handleInstallApp = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setInstalled(true);
    setDeferredPrompt(null);
  };

  const pct = progress ? Math.round((progress.downloaded / progress.total) * 100) : 0;
  const versionLabel = OFFLINE_VERSIONS.find(v => v.id === selectedVersion)?.full || '';

  return (
    <div className="fade-in flex flex-col items-center text-center px-4 py-8 space-y-6 max-w-md mx-auto">
      <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center">
        <Smartphone className="text-primary" size={40} />
      </div>

      <div>
        <h2 className="font-display text-2xl font-bold text-foreground mb-2">Install HolyWord</h2>
        <p className="text-sm text-muted-foreground">
          Download the Bible for offline reading — no internet needed.
        </p>
      </div>

      {/* Step 1: Pick version */}
      {step === 'pick-version' && (
        <div className="w-full space-y-3">
          <p className="text-sm font-medium text-foreground">Choose a Bible version to download:</p>
          <div className="grid grid-cols-1 gap-2">
            {OFFLINE_VERSIONS.map(v => {
              const cached = cachedCounts[v.id] || 0;
              const isComplete = cached >= total;
              return (
                <button
                  key={v.id}
                  onClick={() => !isComplete && pickAndDownload(v.id)}
                  className={`w-full flex items-center justify-between rounded-xl border p-4 transition-all ${
                    isComplete
                      ? 'border-primary/30 bg-primary/5 cursor-default'
                      : 'border-border bg-card hover:shadow-md hover:-translate-y-0.5 hover:border-primary/50'
                  }`}
                >
                  <div className="text-left">
                    <p className="font-display font-bold text-sm text-card-foreground">{v.name}</p>
                    <p className="text-xs text-muted-foreground">{v.full}</p>
                  </div>
                  {isComplete ? (
                    <span className="flex items-center gap-1 text-xs text-primary font-medium">
                      <CheckCircle2 size={14} /> Downloaded
                    </span>
                  ) : cached > 0 ? (
                    <span className="text-xs text-muted-foreground">{cached}/{total}</span>
                  ) : (
                    <Download size={16} className="text-muted-foreground" />
                  )}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground text-left leading-relaxed">
            NIV, NLT, and Amplified keep each chapter you open for 30 days. They are not in this download list.
          </p>
        </div>
      )}

      {/* Step 2: Downloading */}
      {step === 'downloading' && progress && (
        <div className="w-full space-y-4">
          <p className="text-sm font-medium text-foreground">
            Downloading {versionLabel}…
          </p>
          <div className="w-full h-3 rounded-full bg-secondary overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {progress.currentBook} — {progress.downloaded} / {progress.total} chapters ({pct}%)
          </p>
          <button
            onClick={cancelDownload}
            className="px-4 py-2 rounded-lg bg-secondary text-secondary-foreground text-sm font-medium hover:bg-destructive/10 transition"
          >
            Cancel
          </button>
        </div>
      )}

      {step === 'downloading' && !progress && (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 size={20} className="animate-spin" />
          <span className="text-sm">Starting download…</span>
        </div>
      )}

      {/* Step 3: Done */}
      {step === 'done' && (
        <div className="w-full space-y-4">
          <div className="flex items-center justify-center gap-2 text-primary font-medium">
            <CheckCircle2 size={20} />
            <span>{versionLabel} downloaded!</span>
          </div>

          <div className="flex flex-col gap-2">
            <button
              onClick={() => { setStep('pick-version'); setProgress(null); }}
              className="px-4 py-2 rounded-lg bg-secondary text-secondary-foreground text-sm font-medium hover:bg-primary/10 transition"
            >
              Download another version
            </button>
          </div>

          {/* Install to home screen */}
          <div className="border-t border-border pt-4 space-y-3">
            <p className="text-sm font-medium text-foreground">Add to home screen</p>
            {installed ? (
              <div className="flex items-center justify-center gap-2 text-primary font-medium text-sm">
                <CheckCircle2 size={16} /> App is installed!
              </div>
            ) : isIOS ? (
              <div className="rounded-xl border border-border bg-card p-4 text-left space-y-2">
                <p className="text-xs text-muted-foreground">
                  Tap <Share size={12} className="inline text-primary" /> Share in Safari → <strong className="text-card-foreground">Add to Home Screen</strong>
                </p>
              </div>
            ) : deferredPrompt ? (
              <button
                onClick={handleInstallApp}
                className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition"
              >
                <Download size={16} /> Install App
              </button>
            ) : (
              <p className="text-xs text-muted-foreground">
                Use your browser menu → <strong className="text-card-foreground">Add to Home Screen</strong>
              </p>
            )}
          </div>
        </div>
      )}

      <div className="text-xs text-muted-foreground space-y-1">
        <p>✓ Works offline</p>
        <p>✓ Fast loading</p>
        <p>✓ No storage permissions needed</p>
      </div>
    </div>
  );
}
