// ─────────────────────────────────────────────────────────────────────────────
//  Main Store Composition
//  Combines all slices into a single Zustand store
// ─────────────────────────────────────────────────────────────────────────────

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { createCalcSlice } from './slices/calcSlice';
import { createChartSlice } from './slices/chartSlice';
import { createJournalSlice } from './slices/journalSlice';
import { createSettingsSlice } from './slices/settingsSlice';
import { createStrategySlice } from './slices/strategySlice';
import type { StoreState } from './types';

// ─────────────────────────────────────────────────────────────────────────────
//  Store Creation
// ─────────────────────────────────────────────────────────────────────────────

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      // Compose all slices
      ...createChartSlice(set, get, undefined as never),
      ...createCalcSlice(set, get, undefined as never),
      ...createJournalSlice(set, get, undefined as never),
      ...createSettingsSlice(set, get, undefined as never),
      ...createStrategySlice(set, get, undefined as never),
    }),
    {
      name: 'trading_assistant',
      partialize: (s) => ({
        trades: s.trades,
        theme: s.theme,
        defaultSym: s.defaultSym,
        defaultTf: s.defaultTf,
        defaultLeverage: s.defaultLeverage,
        defaultFeeType: s.defaultFeeType,
        defaultCapital: s.defaultCapital,
        defaultRR: s.defaultRR,
        capital: s.capital,
        margin: s.margin,
        goalPct: s.goalPct,
        leverage: s.leverage,
        feeType: s.feeType,
        rrRatio: s.rrRatio,
        activeIndicators: s.activeIndicators,
        indicatorParams: s.indicatorParams,
        strategies: s.strategies,
        activeStrategyId: s.activeStrategyId,
        chartDrawings: s.chartDrawings,
        atrTrailMult: s.atrTrailMult,
        maxDailyLossUsd: s.maxDailyLossUsd,
        soundEnabled: s.soundEnabled,
        notifEnabled: s.notifEnabled,
        priceAlerts: s.priceAlerts.filter((a) => !a.triggered),
        paperAccount: { ...s.paperAccount, openPositions: [] },
      }),
    }
  )
);

// Export types for use in components
export type {
  StoreState,
  ChartSlice,
  CalcSlice,
  JournalSlice,
  SettingsSlice,
  StrategySlice,
  ActiveIndicators,
  IndicatorParams,
  PartialTP,
  SessionTrade,
  TradeJournalEntry,
} from './types';
export { resetIndicatorState, getIndicatorState } from './module-indicators';
export { playAlertSound } from './helpers';
