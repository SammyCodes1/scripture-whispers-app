import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export default function BibleIntro({ onComplete }: { onComplete: () => void }) {
  const [phase, setPhase] = useState<'showing' | 'fading'>('showing');

  useEffect(() => {
    const t = setTimeout(() => setPhase('fading'), 2500);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (phase === 'fading') {
      const t = setTimeout(onComplete, 1000);
      return () => clearTimeout(t);
    }
  }, [phase, onComplete]);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      animate={{ opacity: phase === 'fading' ? 0 : 1 }}
      transition={{ duration: 0.8 }}
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background"
    >
      {/* Glowing logo */}
      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="relative"
      >
        {/* Glow effect behind the image */}
        <div
          className="absolute inset-0 rounded-2xl blur-3xl opacity-40"
          style={{ background: 'hsl(var(--primary) / 0.5)', transform: 'scale(1.3)' }}
        />
        <img
          src="/logo.png"
          alt="HolyWord"
          className="relative w-64 h-48 object-contain drop-shadow-2xl"
        />
      </motion.div>

      {/* App name */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.6 }}
        className="text-center mt-6"
      >
        <h1 className="font-display text-3xl font-bold text-foreground tracking-tight">
          HolyWord
        </h1>
        <p className="text-sm text-muted-foreground mt-1.5">
          Your Daily Bible Companion
        </p>
      </motion.div>

      {/* Subtle loading indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 0.5 }}
        className="absolute bottom-12"
      >
        <div className="flex gap-1.5">
          {[0, 1, 2].map(i => (
            <motion.div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-primary/60"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
            />
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
