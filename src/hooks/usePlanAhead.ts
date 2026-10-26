import { useEffect, useState } from 'react';
import { invalidateStaleCacheIfNeeded } from '@/hooks/useBibleCache';
import {
  getPlanAheadPhase,
  startPlanAhead,
  stopPlanAhead,
  subscribePlanAhead,
  type PlanAheadPhase,
} from '@/lib/planAheadSync';

export function usePlanAheadPhase() {
  const [phase, setPhase] = useState<PlanAheadPhase>(getPlanAheadPhase);
  useEffect(() => subscribePlanAhead(setPhase), []);
  return phase;
}

export function PlanAheadWatch() {
  useEffect(() => {
    let cancel = false;
    invalidateStaleCacheIfNeeded().finally(() => {
      if (!cancel) startPlanAhead();
    });
    return () => {
      cancel = true;
      stopPlanAhead();
    };
  }, []);
  return null;
}
