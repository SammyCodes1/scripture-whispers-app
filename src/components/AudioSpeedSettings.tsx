import { Gauge } from 'lucide-react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { SPEED_STORAGE_KEY } from '@/hooks/useChapterAudio';

const SPEED_STEPS = [0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3];

export default function AudioSpeedSettings() {
  const [speed, setSpeed] = useLocalStorage<number>(SPEED_STORAGE_KEY, 1);

  return (
    <section>
      <h3 className="font-display text-base font-bold text-foreground mb-2 flex items-center gap-2">
        <Gauge size={18} /> Audio Reading Speed
      </h3>
      <p className="text-xs text-muted-foreground mb-3">
        Adjust playback speed for the chapter audio reader.
      </p>
      <div className="flex flex-wrap gap-1.5">
        {SPEED_STEPS.map(s => (
          <button
            key={s}
            onClick={() => setSpeed(s)}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              speed === s
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-primary/10'
            }`}
          >
            {s}x
          </button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground mt-2">
        Current speed: <span className="font-bold text-foreground">{speed}x</span>
      </p>
    </section>
  );
}
