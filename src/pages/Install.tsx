import { useState, useEffect } from 'react';
import { Download, Smartphone, CheckCircle2, Share } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallPage() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent;
    setIsIOS(/iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);

    window.addEventListener('appinstalled', () => setInstalled(true));

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setInstalled(true);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setInstalled(true);
    setDeferredPrompt(null);
  };

  return (
    <div className="fade-in flex flex-col items-center text-center px-4 py-8 space-y-6">
      <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center">
        <Smartphone className="text-primary" size={40} />
      </div>

      <div>
        <h2 className="font-display text-2xl font-bold text-foreground mb-2">Install HolyWord</h2>
        <p className="text-sm text-muted-foreground max-w-sm">
          Add HolyWord to your home screen for quick access and offline reading — no app store needed.
        </p>
      </div>

      {installed ? (
        <div className="flex items-center gap-2 text-primary font-medium">
          <CheckCircle2 size={20} />
          App is installed!
        </div>
      ) : isIOS ? (
        <div className="rounded-xl border border-border bg-card p-5 max-w-sm space-y-3 text-left">
          <p className="text-sm font-medium text-card-foreground">To install on iPhone / iPad:</p>
          <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
            <li className="flex items-start gap-2">
              <span>Tap the <Share size={14} className="inline text-primary" /> Share button in Safari</span>
            </li>
            <li>Scroll down and tap <strong className="text-card-foreground">Add to Home Screen</strong></li>
            <li>Tap <strong className="text-card-foreground">Add</strong></li>
          </ol>
        </div>
      ) : deferredPrompt ? (
        <button
          onClick={handleInstall}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-medium text-base hover:opacity-90 transition shadow-lg"
        >
          <Download size={20} />
          Install App
        </button>
      ) : (
        <div className="rounded-xl border border-border bg-card p-5 max-w-sm space-y-2 text-left">
          <p className="text-sm text-muted-foreground">
            Open this page in your mobile browser to install. On Android, you can use the browser menu → <strong className="text-card-foreground">Add to Home Screen</strong>.
          </p>
        </div>
      )}

      <div className="text-xs text-muted-foreground max-w-xs space-y-1">
        <p>✓ Works offline</p>
        <p>✓ Fast loading</p>
        <p>✓ No storage permissions needed</p>
      </div>
    </div>
  );
}
