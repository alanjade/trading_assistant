// ─────────────────────────────────────────────────────────────────────────────
//  Backward Compatibility Re-export
//
//  The store has been refactored into separate slices for better maintainability.
//  This file re-exports the main store and types for backward compatibility.
//  See /app/lib/store/ folder for the new modular structure.
//
//  Migration guide: No changes needed for component code!
//  The useStore hook and all types work exactly as before.
// ─────────────────────────────────────────────────────────────────────────────

export { useStore } from './store/index';
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
} from './store/types';
export {
  resetIndicatorState,
  getIndicatorState,
  type IndicatorStateContainer,
} from './store/module-indicators';
export { playAlertSound } from './store/helpers';
