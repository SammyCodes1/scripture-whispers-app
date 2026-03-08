import { Flame, Trophy, Calendar } from 'lucide-react';
import { useReadingStreak } from '@/hooks/useReadingStreak';

export default function StreakCard() {
  const { currentStreak, longestStreak, totalDaysRead, readToday } = useReadingStreak();

  return (
    <div className="rounded-xl bg-card border border-border p-4">
      <div className="flex items-center gap-2 mb-3">
        <Flame size={20} className={readToday ? 'text-primary' : 'text-muted-foreground'} />
        <h3 className="font-display font-bold text-card-foreground text-sm">Reading Streak</h3>
      </div>
      <div className="grid grid-cols-3 gap-3 text-center">
        <div>
          <p className={`text-2xl font-bold ${currentStreak > 0 ? 'text-primary' : 'text-muted-foreground'}`}>
            {currentStreak}
          </p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">Current</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-card-foreground">{longestStreak}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">Best</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-card-foreground">{totalDaysRead}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">Total</p>
        </div>
      </div>
      {readToday && (
        <p className="text-xs text-primary text-center mt-3 font-medium">✓ You've read today!</p>
      )}
      {!readToday && currentStreak > 0 && (
        <p className="text-xs text-muted-foreground text-center mt-3">Read today to keep your {currentStreak}-day streak! 🔥</p>
      )}
    </div>
  );
}
