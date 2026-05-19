'use client';

import { memo, useEffect, useState } from 'react';
import { Card, MetricBox, MetricGrid, PanelHeader, settingsInputClass } from '@/components/ui';
import { calculateDailyGoal, calculateDailyGoalAsync } from '@/features/calculator/services/riskRewardService';
import { useStore } from '@/lib/store';

export default memo(function GoalCard() {
  const {
    capital,
    goalPct,
    setGoalPct,
    margin,
    leverage,
    feeType,
    rrRatio,
    entryPrice,
    stopPrice,
  } = useStore();

  const [workerGoal, setWorkerGoal] = useState<ReturnType<typeof calculateDailyGoal> | null>(null);

  const syncGoal = calculateDailyGoal({
    capital,
    goalPct,
    margin,
    leverage,
    feeType,
    rrRatio,
    entryPrice,
    stopPrice,
  });

  const {
    capitalAmount: cap,
    goalPctAmount: gPct,
    goalUsd: goalUSD,
    rrLabel,
    perTrade,
    tradesNeeded,
    summaryText,
  } = workerGoal ?? syncGoal;

  useEffect(() => {
    let mounted = true;
    setWorkerGoal(null);
    calculateDailyGoalAsync({
      capital,
      goalPct,
      margin,
      leverage,
      feeType,
      rrRatio,
      entryPrice,
      stopPrice,
    }).then((result) => {
      if (mounted) setWorkerGoal(result);
    });
    return () => {
      mounted = false;
    };
  }, [capital, goalPct, margin, leverage, feeType, rrRatio, entryPrice, stopPrice]);

  return (
    <Card>
      <PanelHeader
        title="Daily Goal Tracker"
        actions={
          <div className="flex gap-1.5 items-center">
            <span className="text-11px font-mono text-text2">Goal %</span>
            <input
              type="number"
              value={goalPct}
              step={1}
              min={1}
              max={100}
              onChange={(e) => setGoalPct(e.target.value)}
              className={`${settingsInputClass} w-16`}
            />
          </div>
        }
      />

      <MetricGrid columns={3}>
        <MetricBox
          label="Goal ($)"
          value={'$' + goalUSD.toFixed(2)}
          sub={gPct + '% of $' + cap}
          valueColor="var(--green)"
        />
        <MetricBox
          label="Per Win Trade"
          value={perTrade > 0 ? '$' + perTrade.toFixed(2) : '-'}
          sub="after fees"
        />
        <MetricBox label="Trades Needed" value={String(tradesNeeded)} sub={`at ${rrLabel} RR`} />
      </MetricGrid>

      <p className="text-10px font-mono text-text2 px-2.5 py-1.5 bg-bg3 rounded-sm border border-border leading-relaxed">
        {summaryText}
      </p>
    </Card>
  );
});
