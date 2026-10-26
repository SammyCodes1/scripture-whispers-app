import { useState, useEffect, useRef } from 'react';
import { Download, CheckCircle2, Trash2, WifiOff } from 'lucide-react';
import { BIBLE_VERSIONS, OFFLINE_VERSIONS, useTheme } from '@/contexts/ThemeContext';
import { getCachedCount, getTotalChapters, clearCache } from '@/hooks/useBibleCache';
import { getDownloadState, subscribeDownload, startGlobalDownload, cancelGlobalDownload } from '@/hooks/useDownloadManager';
import { toast } from 'sonner';

const LICENSED_VERSIONS = BIBLE_VERSIONS.filter(v => 'licensed' in v && v.licensed);

export default function OfflineDownload() {
  const { version } = useTheme();
  type BibleVersion = typeof BIBLE_VERSIONS[number]['id'];
  const [selectedTranslation, setSelectedTranslation] = useState<BibleVersion>(
    BIBLE_VERSIONS.some(v => v.id === version) ? version : 'kjv'
  );
  const [cachedCount, setCachedCount] = useState(0);
  const [dlState, setDlState] = useState(getDownloadState);
  const total = getTotalChapters();
  const wasDownloadingRef = useRef(false);

  // Subscribe to global download state
  useEffect(() => {
    const initialState = getDownloadState();
    setDlState(initialState);
    wasDownloadingRef.current = initialState.active;

    return subscribeDownload(() => {
      const s = getDownloadState();
      const justFinished = wasDownloadingRef.current && !s.active;
      wasDownloadingRef.current = s.active;
      setDlState(s);

      if (!s.active) {
        getCachedCount(selectedTranslation).then(count => {
          setCachedCount(count);
          if (justFinished) {
            if (count >= total) {
              toast.success('Bible downloaded for offline use!');
            } else {
              toast.info(`Downloaded ${count} of ${total} chapters. Tap Continue Download to finish.`);
            }
          }
        });
      }
    });
  }, [selectedTranslation, total]);

  // If a download is active for a different translation, sync the selector
  useEffect(() => {
    if (dlState.active && dlState.translation) {
      setSelectedTranslation(dlState.translation as BibleVersion);
    }
  }, [dlState.active, dlState.translation]);

  useEffect(() => {
    getCachedCount(selectedTranslation).then(setCachedCount);
  }, [selectedTranslation]);

  const licensed = LICENSED_VERSIONS.some(v => v.id === selectedTranslation);
  const selectedName = BIBLE_VERSIONS.find(v => v.id === selectedTranslation)?.full;
  const downloading = dlState.active;
  const progress = dlState.progress;
  const pct = progress ? Math.round((progress.downloaded / progress.total) * 100) : 0;
  const isFullyCached = cachedCount >= total;

  const handleStart = () => {
    startGlobalDownload(selectedTranslation);
  };

  const handleCancel = () => {
    cancelGlobalDownload();
    toast('Download cancelled');
  };

  const handleClear = async () => {
    await clearCache(selectedTranslation);
    setCachedCount(0);
    toast.success('Offline data cleared');
  };

  return (
    <section>
      <h3 className="font-display text-base font-bold text-foreground mb-1 flex items-center gap-2">
        <WifiOff size={18} /> Offline Bible
      </h3>
      <p className="text-xs text-muted-foreground mb-3">
        KJV, ASV, and WEB can be downloaded in full. NIV, NLT, and Amplified keep each chapter you open for 30 days.
      </p>

      {/* Translation picker */}
      <div className="flex flex-wrap gap-2 mb-3">
        {OFFLINE_VERSIONS.map(v => (
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
        {LICENSED_VERSIONS.map(v => (
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
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-card-foreground">
            {licensed ? (
              cachedCount > 0
                ? `${cachedCount} chapter${cachedCount === 1 ? '' : 's'} saved`
                : 'No chapters saved yet'
            ) : isFullyCached ? (
              <span className="flex items-center gap-1.5 text-primary font-medium">
                <CheckCircle2 size={16} /> Fully downloaded
              </span>
            ) : (
              `${cachedCount} / ${total} chapters cached`
            )}
          </span>
          <span className="text-xs text-muted-foreground text-right">{selectedName}</span>
        </div>

        {licensed && (
          <p className="text-xs text-muted-foreground leading-relaxed">
            Open a chapter in the reader while you are online. It stays on this phone for 30 days, then needs a connection again. The whole Bible cannot be downloaded for this translation.
          </p>
        )}

        {/* Progress bar */}
        {!licensed && (cachedCount > 0 || downloading) && (
          <div className="w-full h-2 rounded-full bg-secondary overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: `${downloading ? pct : (cachedCount / total) * 100}%` }}
            />
          </div>
        )}

        {!licensed && downloading && progress && (
          <p className="text-xs text-muted-foreground">
            Downloading {progress.currentBook}… {pct}%
          </p>
        )}

        <div className="flex gap-2">
          {!downloading ? (
            <>
              {!licensed && !isFullyCached && (
                <button
                  onClick={handleStart}
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
              onClick={handleCancel}
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
