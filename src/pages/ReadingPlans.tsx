import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, CheckCircle2, Circle, BookOpen, RotateCcw } from 'lucide-react';
import { READING_PLANS, type ReadingPlan } from '@/data/readingPlansData';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { PLAN_PROGRESS_KEY, type PlanProgress } from '@/lib/planToday';

type View = 'select' | 'overview' | 'day';

export default function ReadingPlans() {
  const navigate = useNavigate();
  const [view, setView] = useState<View>('select');
  const [selectedPlan, setSelectedPlan] = useState<ReadingPlan | null>(null);
  const [selectedDay, setSelectedDay] = useState<number>(0);
  const [progress, setProgress] = useLocalStorage<PlanProgress[]>(PLAN_PROGRESS_KEY, []);

  const getPlanProgress = (planId: string) => progress.find(p => p.planId === planId);

  const startPlan = (plan: ReadingPlan) => {
    if (!getPlanProgress(plan.id)) {
      const now = Date.now();
      setProgress(prev => [...prev, { planId: plan.id, startedAt: now, completedDays: [], updatedAt: now }]);
    }
    setSelectedPlan(plan);
    setView('overview');
  };

  const resetPlan = (planId: string) => {
    setProgress(prev => prev.filter(p => p.planId !== planId));
    toast.success('Plan progress reset');
  };

  const toggleDay = (planId: string, day: number) => {
    setProgress(prev =>
      prev.map(p => {
        if (p.planId !== planId) return p;
        const completed = p.completedDays.includes(day)
          ? p.completedDays.filter(d => d !== day)
          : [...p.completedDays, day];
        return { ...p, completedDays: completed, updatedAt: Date.now() };
      })
    );
  };

  const isDayComplete = (planId: string, day: number) =>
    getPlanProgress(planId)?.completedDays.includes(day) ?? false;

  const getCompletionPercent = (plan: ReadingPlan) => {
    const p = getPlanProgress(plan.id);
    if (!p) return 0;
    return Math.round((p.completedDays.length / plan.totalDays) * 100);
  };

  const openDayInReader = (book: string, chapter: number) => {
    navigate(`/read?book=${encodeURIComponent(book)}&chapter=${chapter}`);
  };

  return (
    <div className="fade-in">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        {view !== 'select' && (
          <button
            onClick={() => setView(view === 'day' ? 'overview' : 'select')}
            className="p-2 rounded-lg hover:bg-secondary text-foreground"
          >
            <ChevronLeft size={20} />
          </button>
        )}
        <h2 className="font-display text-xl font-bold text-foreground">
          {view === 'select' && 'Reading Plans'}
          {view === 'overview' && selectedPlan?.name}
          {view === 'day' && selectedPlan && `Day ${selectedDay}`}
        </h2>
      </div>

      <AnimatePresence mode="wait">
        {/* Plan selection */}
        {view === 'select' && (
          <motion.div key="select" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
            <p className="text-sm text-muted-foreground mb-4">Choose a pace to read through the entire Bible.</p>
            {READING_PLANS.map(plan => {
              const pct = getCompletionPercent(plan);
              const started = !!getPlanProgress(plan.id);
              return (
                <button
                  key={plan.id}
                  onClick={() => startPlan(plan)}
                  className="w-full text-left rounded-xl bg-card border border-border p-4 hover:shadow-md transition-all hover:-translate-y-0.5"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-3xl">{plan.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-display font-bold text-card-foreground">{plan.name}</h3>
                        <span className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full">
                          {plan.months} months
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{plan.description}</p>
                      {started && (
                        <div className="mt-2">
                          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                            <span>{pct}% complete</span>
                            <span>{getPlanProgress(plan.id)!.completedDays.length} / {plan.totalDays} days</span>
                          </div>
                          <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </motion.div>
        )}

        {/* Plan overview – day grid */}
        {view === 'overview' && selectedPlan && (
          <motion.div key="overview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-muted-foreground">
                {getCompletionPercent(selectedPlan)}% complete
              </p>
              {getPlanProgress(selectedPlan.id) && (
                <button
                  onClick={() => resetPlan(selectedPlan.id)}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors"
                >
                  <RotateCcw size={12} /> Reset
                </button>
              )}
            </div>

            {/* Progress bar */}
            <div className="w-full h-2 bg-secondary rounded-full overflow-hidden mb-4">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${getCompletionPercent(selectedPlan)}%` }}
              />
            </div>

            <div className="grid grid-cols-7 sm:grid-cols-10 gap-1.5">
              {selectedPlan.days.map(d => {
                const done = isDayComplete(selectedPlan.id, d.day);
                return (
                  <button
                    key={d.day}
                    onClick={() => { setSelectedDay(d.day); setView('day'); }}
                    className={`aspect-square rounded-lg flex items-center justify-center text-xs font-medium transition-colors border ${
                      done
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-card text-card-foreground border-border hover:bg-secondary'
                    }`}
                  >
                    {d.day}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Day detail */}
        {view === 'day' && selectedPlan && (
          <motion.div key="day" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {(() => {
              const dayData = selectedPlan.days.find(d => d.day === selectedDay);
              if (!dayData) return <p className="text-muted-foreground text-sm">Day not found.</p>;
              const done = isDayComplete(selectedPlan.id, selectedDay);

              return (
                <div className="space-y-4">
                  {/* Mark complete */}
                  <button
                    onClick={() => toggleDay(selectedPlan.id, selectedDay)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                      done
                        ? 'bg-primary/10 border-primary text-primary'
                        : 'bg-card border-border text-card-foreground hover:bg-secondary'
                    }`}
                  >
                    {done ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                    <span className="font-medium text-sm">{done ? 'Completed!' : 'Mark as complete'}</span>
                  </button>

                  {/* Readings list */}
                  <div className="space-y-1.5">
                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Today's Readings</h3>
                    {dayData.readings.map((r, i) => (
                      <button
                        key={i}
                        onClick={() => openDayInReader(r.book, r.chapter)}
                        className="w-full flex items-center gap-3 p-3 rounded-lg bg-card border border-border hover:bg-secondary transition-colors text-left"
                      >
                        <BookOpen size={16} className="text-primary shrink-0" />
                        <span className="text-sm text-card-foreground font-medium">
                          {r.book} {r.chapter}
                        </span>
                      </button>
                    ))}
                  </div>

                  {/* Nav between days */}
                  <div className="flex gap-2 pt-2">
                    {selectedDay > 1 && (
                      <button
                        onClick={() => setSelectedDay(selectedDay - 1)}
                        className="flex-1 py-2 rounded-xl bg-secondary text-secondary-foreground text-sm font-medium hover:opacity-90"
                      >
                        ← Day {selectedDay - 1}
                      </button>
                    )}
                    {selectedDay < selectedPlan.totalDays && (
                      <button
                        onClick={() => setSelectedDay(selectedDay + 1)}
                        className="flex-1 py-2 rounded-xl bg-secondary text-secondary-foreground text-sm font-medium hover:opacity-90"
                      >
                        Day {selectedDay + 1} →
                      </button>
                    )}
                  </div>
                </div>
              );
            })()}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
