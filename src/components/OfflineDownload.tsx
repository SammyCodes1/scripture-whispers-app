import { useState, useEffect, useRef } from 'react';
import { Download, Loader2, CheckCircle2, Trash2, WifiOff } from 'lucide-react';
import { BIBLE_VERSIONS, useTheme } from '@/contexts/ThemeContext';
import { downloadAllChapters, getCachedCount, getTotalChapters, clearCache, type DownloadProgress } from '@/hooks/useBibleCache';
import { toast } from 'sonner';

export default function OfflineDownload() {
  const { version } = useTheme();
  const [selectedTranslation, setSelectedTranslation] = useState(version);
  const [cachedCount, setCachedCount] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState<DownloadProgress | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const total = getTotalChapters();

  useEffect(() => {
    getCachedCount(selectedTranslation).then(setCachedCount);
  }, [selectedTranslation, downloading]);

  const startDownload = async () => {
    setDownloading(true);
    abortRef.current = new AbortController();
    try {
      await downloadAllChapters(selectedTranslation, setProgress, abortRef.current.signal);
      toast.success('Bible downloaded for offline use!');
      getCachedCount(selectedTranslation).then(setCachedCount);
    } catch {
      toast.error('Download interrupted');
    } finally {
      setDownloading(false);
      setProgress(null);
    }
  };

  const cancelDownload = () => {
    abortRef.current?.abort();
    setDownloading(false);
    setProgress(null);
  };

  const handleClear = async () => {
    await clearCache(selectedTranslation);
    setCachedCount(0);
    toast.success('Offline data cleared');
  };

  const pct = progress ? Math.round((progress.downloaded / progress.total) * 100) : 0;
  const isFullyCached = cachedCount >= total;

  return (
    <section>
      <h3 className="font-display text-base font-bold text-foreground mb-1 flex items-center gap-2">
        <WifiOff size={18} /> Offline Bible
      </h3>
      <p className="text-xs text-muted-foreground mb-3">
        Download the full Bible for offline reading — no internet needed.
      </p>

      {/* Translation picker */}
      <div className="flex flex-wrap gap-2 mb-3">
        {BIBLE_VERSIONS.map(v => (
          <button
            key={v.id}
            onClick={() => !downloading && setSelectedTranslation(v.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              selectedTranslation === v.id
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-primary/10'
            } ${downloading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {v.name}
          </button>
        ))}
      </div>

      {/* Status */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-card-foreground">
            {isFullyCached ? (
              <span className="flex items-center gap-1.5 text-primary font-medium">
                <CheckCircle2 size={16} /> Fully downloaded
              </span>
            ) : (
              `${cachedCount} / ${total} chapters cached`
            )}
          </span>
          <span className="text-xs text-muted-foreground">
            {BIBLE_VERSIONS.find(v => v.id === selectedTranslation)?.full}
          </span>
        </div>

        {/* Progress bar */}
        {(cachedCount > 0 || downloading) && (
          <div className="w-full h-2 rounded-full bg-secondary overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: `${downloading ? pct : (cachedCount / total) * 100}%` }}
            />
          </div>
        )}

        {downloading && progress && (
          <p className="text-xs text-muted-foreground">
            Downloading {progress.currentBook}… {pct}%
          </p>
        )}

        <div className="flex gap-2">
          {!downloading ? (
            <>
              {!isFullyCached && (
                <button
                  onClick={startDownload}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition"
                >
                  <Download size={16} />
                  {cachedCount > 0 ? 'Continue Download' : 'Download Bible'}
                </button>
              )}
              {cachedCount > 0 && (
                <button
                  onClick={handleClear}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary text-secondary-foreground text-sm font-medium hover:bg-destructive/10 hover:text-destructive transition"
                >
                  <Trash2 size={16} />
                  Clear
                </button>
              )}
            </>
          ) : (
            <button
              onClick={cancelDownload}
              className="px-4 py-2 rounded-lg bg-secondary text-secondary-foreground text-sm font-medium hover:bg-destructive/10 transition"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
