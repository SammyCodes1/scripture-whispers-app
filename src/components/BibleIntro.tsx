import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const BIBLE_BOOKS_PREVIEW = [
  'Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy',
  'Joshua', 'Judges', 'Ruth', '1 Samuel', '2 Samuel',
  '1 Kings', '2 Kings', '1 Chronicles', '2 Chronicles',
  'Ezra', 'Nehemiah', 'Esther', 'Job', 'Psalms', 'Proverbs',
  'Ecclesiastes', 'Song of Solomon', 'Isaiah', 'Jeremiah',
  'Lamentations', 'Ezekiel', 'Daniel', 'Hosea', 'Joel', 'Amos',
  'Obadiah', 'Jonah', 'Micah', 'Nahum', 'Habakkuk', 'Zephaniah',
  'Haggai', 'Zechariah', 'Malachi',
  'Matthew', 'Mark', 'Luke', 'John', 'Acts',
  'Romans', '1 Corinthians', '2 Corinthians', 'Galatians',
  'Ephesians', 'Philippians', 'Colossians',
  '1 Thessalonians', '2 Thessalonians', '1 Timothy', '2 Timothy',
  'Titus', 'Philemon', 'Hebrews', 'James',
  '1 Peter', '2 Peter', '1 John', '2 John', '3 John',
  'Jude', 'Revelation',
];

// Landing page index (middle of the Bible ≈ Psalms)
const MIDDLE_INDEX = 18; // Psalms
const TOTAL_FLIPS = MIDDLE_INDEX;
const FLIP_DURATION = 0.18;

export default function BibleIntro({ onComplete }: { onComplete: () => void }) {
  const [currentPage, setCurrentPage] = useState(0);
  const [phase, setPhase] = useState<'flipping' | 'landed' | 'fading'>('flipping');

  useEffect(() => {
    if (phase !== 'flipping') return;

    if (currentPage >= TOTAL_FLIPS) {
      setPhase('landed');
      const t = setTimeout(() => setPhase('fading'), 1200);
      return () => clearTimeout(t);
    }

    const delay = currentPage < 4
      ? FLIP_DURATION * 1000
      : currentPage < 10
        ? FLIP_DURATION * 600
        : FLIP_DURATION * 400;

    const t = setTimeout(() => setCurrentPage(p => p + 1), delay);
    return () => clearTimeout(t);
  }, [currentPage, phase]);

  useEffect(() => {
    if (phase === 'fading') {
      const t = setTimeout(onComplete, 800);
      return () => clearTimeout(t);
    }
  }, [phase, onComplete]);

  const bookName = BIBLE_BOOKS_PREVIEW[currentPage] || 'Psalms';

  return (
    <AnimatePresence>
      {phase !== 'fading' ? (
        <motion.div
          key="intro"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.7 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center"
          style={{ background: 'hsl(var(--background))' }}
        >
          {/* Book container */}
          <div className="relative" style={{ perspective: '1200px' }}>
            {/* Book spine shadow */}
            <div
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-lg"
              style={{
                width: 280,
                height: 380,
                boxShadow: '0 25px 60px -15px hsl(var(--foreground) / 0.25)',
              }}
            />

            {/* Back cover */}
            <div
              className="rounded-r-lg border border-border"
              style={{
                width: 280,
                height: 380,
                background: 'linear-gradient(135deg, hsl(20 35% 28%), hsl(20 40% 22%))',
              }}
            />

            {/* Stacked pages underneath (static) */}
            {[...Array(5)].map((_, i) => (
              <div
                key={`stack-${i}`}
                className="absolute top-0 left-0 rounded-r-lg border-r border-b border-border/40"
                style={{
                  width: 280,
                  height: 380,
                  background: `hsl(38 ${30 - i * 3}% ${94 - i}%)`,
                  transform: `translateX(${2 + i * 0.5}px) translateZ(${-i * 2}px)`,
                  zIndex: -i,
                }}
              />
            ))}

            {/* Flipping page */}
            <motion.div
              key={currentPage}
              className="absolute top-0 left-0 rounded-r-lg overflow-hidden"
              style={{
                width: 280,
                height: 380,
                transformOrigin: 'left center',
                backfaceVisibility: 'hidden',
                background: 'hsl(38 35% 96%)',
                zIndex: TOTAL_FLIPS - currentPage + 10,
              }}
              initial={{ rotateY: 0 }}
              animate={phase === 'flipping' && currentPage < TOTAL_FLIPS
                ? { rotateY: -180 }
                : { rotateY: 0 }
              }
              transition={{
                duration: currentPage < 4 ? 0.22 : currentPage < 10 ? 0.15 : 0.1,
                ease: [0.4, 0, 0.2, 1],
              }}
            >
              {/* Page content */}
              <div className="flex flex-col items-center justify-center h-full p-8">
                <div
                  className="w-16 h-0.5 mb-6 rounded-full"
                  style={{ background: 'hsl(var(--primary) / 0.3)' }}
                />
                <p
                  className="font-display text-2xl font-bold text-center"
                  style={{ color: 'hsl(var(--foreground))' }}
                >
                  {bookName}
                </p>
                <div
                  className="w-16 h-0.5 mt-6 rounded-full"
                  style={{ background: 'hsl(var(--primary) / 0.3)' }}
                />

                {/* Faux text lines */}
                <div className="mt-10 space-y-2.5 w-full px-4">
                  {[...Array(8)].map((_, i) => (
                    <div
                      key={i}
                      className="rounded-full"
                      style={{
                        height: 3,
                        width: `${70 + Math.sin(i * 1.8) * 25}%`,
                        background: 'hsl(var(--foreground) / 0.08)',
                      }}
                    />
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Front cover (shown until flipping starts) */}
            {currentPage === 0 && phase === 'flipping' && (
              <motion.div
                className="absolute top-0 left-0 rounded-r-lg overflow-hidden flex flex-col items-center justify-center"
                style={{
                  width: 280,
                  height: 380,
                  transformOrigin: 'left center',
                  background: 'linear-gradient(145deg, hsl(4 52% 32%), hsl(4 52% 24%))',
                  zIndex: 100,
                }}
                initial={{ rotateY: 0 }}
                animate={{ rotateY: -180 }}
                transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
              >
                <div className="text-center">
                  <p
                    className="text-lg tracking-[0.3em] uppercase font-medium mb-2"
                    style={{ color: 'hsl(38 30% 85%)' }}
                  >
                    Holy
                  </p>
                  <p
                    className="font-display text-3xl font-bold"
                    style={{ color: 'hsl(38 30% 92%)' }}
                  >
                    Bible
                  </p>
                  <div
                    className="w-12 h-0.5 mx-auto mt-4 rounded-full"
                    style={{ background: 'hsl(36 60% 50% / 0.6)' }}
                  />
                </div>
              </motion.div>
            )}

            {/* Landed state — Psalms title card */}
            {phase === 'landed' && (
              <motion.div
                className="absolute top-0 left-0 rounded-r-lg overflow-hidden flex flex-col items-center justify-center"
                style={{
                  width: 280,
                  height: 380,
                  background: 'hsl(38 35% 96%)',
                  zIndex: 200,
                }}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                <motion.div
                  className="text-center"
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.15, duration: 0.4 }}
                >
                  <div
                    className="w-10 h-0.5 mx-auto mb-4 rounded-full"
                    style={{ background: 'hsl(var(--primary) / 0.4)' }}
                  />
                  <p
                    className="font-display text-3xl font-bold"
                    style={{ color: 'hsl(var(--primary))' }}
                  >
                    Psalms
                  </p>
                  <p
                    className="text-sm mt-2"
                    style={{ color: 'hsl(var(--muted-foreground))' }}
                  >
                    The heart of Scripture
                  </p>
                  <div
                    className="w-10 h-0.5 mx-auto mt-4 rounded-full"
                    style={{ background: 'hsl(var(--primary) / 0.4)' }}
                  />
                </motion.div>

                {/* HolyWord branding */}
                <motion.p
                  className="absolute bottom-6 text-xs tracking-widest uppercase"
                  style={{ color: 'hsl(var(--muted-foreground) / 0.6)' }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  HolyWord
                </motion.p>
              </motion.div>
            )}
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
