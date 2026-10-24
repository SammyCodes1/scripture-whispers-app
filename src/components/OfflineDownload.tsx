import { useState, useEffect, useRef } from 'react';
import { Download, CheckCircle2, Trash2, WifiOff } from 'lucide-react';
import { BIBLE_VERSIONS, useTheme } from '@/contexts/ThemeContext';
import { isLicensedVersion } from '@/lib/bibleVersions';
import { getCachedCount, getTotalChapters, clearCache } from '@/hooks/useBibleCache';
import { getDownloadState, subscribeDownload, startGlobalDownload, cancelGlobalDownload } from '@/hooks/useDownloadManager';
import { toast } from 'sonner';

// AMP, NIV and NKJV are licensed for online use only, so they are not offered for download.
const OFFLINE_VERSIONS = BIBLE_VERSIONS.filter(v => !isLicensedVersion(v.id));

export default function OfflineDownload() {
  const { version } = useTheme();
  type BibleVersion = typeof BIBLE_VERSIONS[number]['id'];
  const [selectedTranslation, setSelectedTranslation] = useState<BibleVersion>(
    isLicensedVersion(version) ? 'kjv' : version
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
        Download the full Bible for offline reading — no internet needed. The download continues even if you leave this page.
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
