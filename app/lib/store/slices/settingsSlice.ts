// ─────────────────────────────────────────────────────────────────────────────
//  Settings Slice
//  User preferences and default values
// ─────────────────────────────────────────────────────────────────────────────

import type { Drawing } from '../../drawingTools';
import type { ActiveIndicators, IndicatorParams, SettingsSlice, SettingsSliceCreator, StoreState } from '../types';
import type { StateCreator } from 'zustand';
import { INDICATOR_PERIODS, STOP_LOSS } from '../../tradingConstants';

const defaultActiveIndicators: ActiveIndicators = {
  ema9: true,
  ema20: true,
  ema50: true,
  vwap: true,
  vwapBands: false,
  bb: false,
  superTrend: false,
  psar: false,
  macd: false,
  rsi: true,
  stochRsi: false,
  adx: false,
  obv: false,
  williamsR: false,
  cci: false,
  volume: true,
  cvd: true,
  patterns: true,
  fib: true,
  volumeProfile: true,
};

const defaultIndicatorParams: IndicatorParams = {
  ema9Period: INDICATOR_PERIODS.EMA_FAST,
  ema20Period: INDICATOR_PERIODS.EMA_MEDIUM,
  ema50Period: INDICATOR_PERIODS.EMA_SLOW,
  bbPeriod: INDICATOR_PERIODS.BOLLINGER_BANDS_PERIOD,
  bbStdDev: INDICATOR_PERIODS.BOLLINGER_BANDS_STDDEV,
  rsiPeriod: INDICATOR_PERIODS.RSI,
  stochRsiPeriod: INDICATOR_PERIODS.RSI,
  macdFast: INDICATOR_PERIODS.MACD_FAST,
  macdSlow: INDICATOR_PERIODS.MACD_SLOW,
  macdSignal: INDICATOR_PERIODS.MACD_SIGNAL,
  atrPeriod: INDICATOR_PERIODS.ATR,
  stPeriod: INDICATOR_PERIODS.SUPERTREND_PERIOD,
  stMultiplier: INDICATOR_PERIODS.SUPERTREND_MULTIPLIER,
  adxPeriod: INDICATOR_PERIODS.RSI,
  williamsRPeriod: INDICATOR_PERIODS.RSI,
  cciPeriod: INDICATOR_PERIODS.SMA_MEDIUM,
  psarStep: 0.02,
  psarMax: 0.2,
};

const defaultSettings: SettingsSlice = {
  theme: 'dark',
  defaultSym: 'BTCUSDT',
  defaultTf: '5m',
  defaultLeverage: 10,
  defaultFeeType: 'maker',
  defaultCapital: 200,
  defaultRR: 2,
  activeIndicators: defaultActiveIndicators,
  indicatorParams: defaultIndicatorParams,
  chartDrawings: [],
  atrTrailMult: STOP_LOSS.TRAIL_ATR_MULTIPLIER,
  soundEnabled: true,
  notifEnabled: false,
};

// ─────────────────────────────────────────────────────────────────────────────
//  Slice Creator
// ─────────────────────────────────────────────────────────────────────────────

export const createSettingsSlice: StateCreator<StoreState, [], [], SettingsSliceCreator> = (set) => ({
  ...defaultSettings,

  setChartDrawings: (d: Drawing[]) => set({ chartDrawings: d }),

  setSettings: (patch: Partial<SettingsSlice>) => set(patch),

  toggleIndicator: (key: keyof ActiveIndicators) =>
    set((state) => ({
      activeIndicators: { ...state.activeIndicators, [key]: !state.activeIndicators[key] },
    })),

  setIndicatorParam: (key: keyof IndicatorParams, value: number) =>
    set((state) => ({
      indicatorParams: { ...state.indicatorParams, [key]: value },
    })),

  resetIndicatorParams: () =>
    set({
      indicatorParams: defaultIndicatorParams,
    }),

  setSoundEnabled: (v: boolean) => set({ soundEnabled: v }),

  setNotifEnabled: (v: boolean) => set({ notifEnabled: v }),
});
