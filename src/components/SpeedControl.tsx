import { useState, useRef, useEffect, forwardRef } from 'react';
import { Gauge } from 'lucide-react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { SPEED_STORAGE_KEY } from '@/hooks/useChapterAudio';
import { motion, AnimatePresence } from 'framer-motion';

const SPEED_STEPS = [0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3];

const SpeedControl = forwardRef<HTMLDivElement>(function SpeedControl(_props, forwardedRef) {
  const [speed, setSpeed] = useLocalStorage<number>(SPEED_STORAGE_KEY, 1);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const cycle = () => {
    const idx = SPEED_STEPS.indexOf(speed);
    const next = SPEED_STEPS[(idx + 1) % SPEED_STEPS.length];
    setSpeed(next);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={cycle}
        onContextMenu={(e) => { e.preventDefault(); setOpen(prev => !prev); }}
        className="flex items-center gap-1 text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded-full hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer"
        title="Tap to cycle speed, long-press for picker"
      >
        <Gauge size={12} />
        {speed}x
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-1 z-50 bg-card border border-border rounded-lg shadow-lg overflow-hidden min-w-[100px]"
          >
            {SPEED_STEPS.map(s => (
              <button
                key={s}
                onClick={() => { setSpeed(s); setOpen(false); }}
                className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                  speed === s ? 'bg-primary/10 text-primary font-medium' : 'text-card-foreground hover:bg-secondary/50'
                }`}
              >
                {s}x
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
