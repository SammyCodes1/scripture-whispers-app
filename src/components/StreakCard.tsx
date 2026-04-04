import { Flame, Trophy, Calendar, CheckCircle2 } from 'lucide-react';
import { useReadingStreak } from '@/hooks/useReadingStreak';
import { motion } from 'framer-motion';

export default function StreakCard() {
  const { currentStreak, longestStreak, totalDaysRead, readToday } = useReadingStreak();

  return (
    <div className="rounded-2xl bg-card border border-border/60 p-5 overflow-hidden relative">
      {readToday && (
        <div className="absolute top-0 right-0 w-20 h-20 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2" />
      )}
      <div className="flex items-center gap-2.5 mb-4">
        <div className={`p-2 rounded-xl ${readToday ? 'bg-primary/15' : 'bg-secondary/60'}`}>
          <Flame size={18} className={readToday ? 'text-primary' : 'text-muted-foreground'} />
        </div>
        <h3 className="font-display font-bold text-card-foreground text-sm">Reading Streak</h3>
      </div>
      <div className="grid grid-cols-3 gap-4 text-center">
        {[
          { value: currentStreak, label: 'Current', icon: Flame, active: currentStreak > 0 },
          { value: longestStreak, label: 'Best', icon: Trophy, active: false },
          { value: totalDaysRead, label: 'Total', icon: Calendar, active: false },
        ].map(stat => (
          <div key={stat.label} className="space-y-1">
            <motion.p
              className={`text-2xl font-bold tabular-nums ${stat.active ? 'text-primary' : 'text-foreground'}`}
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 300 }}
            >
              {stat.value}
            </motion.p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">{stat.label}</p>
          </div>
        ))}
      </div>
      {readToday && (
        <div className="flex items-center justify-center gap-1.5 mt-4 py-2 rounded-xl bg-primary/8 text-primary">
          <CheckCircle2 size={14} />
          <p className="text-xs font-semibold">You've read today!</p>
        </div>
      )}
      {!readToday && currentStreak > 0 && (
        <p className="text-xs text-muted-foreground text-center mt-4">Read today to keep your {currentStreak}-day streak! 🔥</p>
      )}
    </div>
  );
}
