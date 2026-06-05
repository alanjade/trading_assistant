// ─────────────────────────────────────────────────────────────────────────────
//  Shared Types for Store Slices
// ─────────────────────────────────────────────────────────────────────────────

import type { BacktestResult } from '../backtestTypes';
import type { Drawing } from '../drawingTools';
import type { Candle, CrossoverEvent, PatternResult } from '../indicators';
import type { PaperAccount, PaperPosition } from '../paperTrading';
import type { Strategy, StrategySignal } from '../strategy';

export type ConnStatus = 'idle' | 'live' | 'err' | 'warn';

export interface Suggestion {
  entry: number;
  stop: number;
  target: number;
  dir: 'long' | 'short';
  reason: string;
}

export interface EntryQuality {
  score: number;
  label: string;
  cls: string;
  factors: string[];
}

export interface TradeJournalEntry {
  id: string;
  date: string;
  symbol: string;
  dir: 'long' | 'short';
  entry: number;
  stop: number;
  target: number;
  outcome: 'win' | 'loss' | 'be' | 'open';
  pnl: number;
  notes: string;
  tags: string[];
  screenshotUrl: string;
}

export interface PartialTP {
  ratio: number;
  pct: number;
  price: number;
  pnlUsd: number;
  hit: boolean;
}

export interface SessionTrade {
  id: string;
  time: number;
  sym: string;
  dir: 'long' | 'short';
  entry: number;
  exit: number;
  size: number;
  pnl: number;
  note?: string;
}

export interface PriceAlert {
  id: string;
  sym: string;
  price: number;
  dir: 'above' | 'below';
  label: string;
  triggered: boolean;
  createdAt: number;
}

export interface ActiveIndicators {
  ema9: boolean;
  ema20: boolean;
  ema50: boolean;
  vwap: boolean;
  vwapBands: boolean;
  bb: boolean;
  superTrend: boolean;
  psar: boolean;
  macd: boolean;
  rsi: boolean;
  stochRsi: boolean;
  adx: boolean;
  obv: boolean;
  williamsR: boolean;
  cci: boolean;
  volume: boolean;
  cvd: boolean;
  patterns: boolean;
  fib: boolean;
  volumeProfile: boolean;
}

export interface IndicatorParams {
  ema9Period: number;
  ema20Period: number;
  ema50Period: number;
  bbPeriod: number;
  bbStdDev: number;
  rsiPeriod: number;
  stochRsiPeriod: number;
  macdFast: number;
  macdSlow: number;
  macdSignal: number;
  atrPeriod: number;
  stPeriod: number;
  stMultiplier: number;
  adxPeriod: number;
  williamsRPeriod: number;
  cciPeriod: number;
  psarStep: number;
  psarMax: number;
}

// ─────────────────────────────────────────────────────────────────────────────
//  Slice Type Definitions
// ─────────────────────────────────────────────────────────────────────────────

export interface ChartSlice {
  // Symbol & Timeframe
  sym: string;
  tf: string;

  // Candlestick data
  candles: Candle[];
  currentCandle: Candle | null;
  lastCandleTime: number;

  // EMA values
  e9s: (number | null)[];
  e20s: (number | null)[];
  e50s: (number | null)[];
  e9: number | null;
  e20: number | null;
  e50: number | null;

  // Indicator values (technical analysis)
  rsiVals: (number | null)[];
  stochRsiK: (number | null)[];
  stochRsiD: (number | null)[];
  macdLine: (number | null)[];
  macdSignal: (number | null)[];
  macdHist: (number | null)[];
  bbUpper: (number | null)[];
  bbMiddle: (number | null)[];
  bbLower: (number | null)[];
  bbWidth: (number | null)[];
  bbPct: (number | null)[];
  atrVals: (number | null)[];
  stVals: (number | null)[];
  stBull: boolean[];
  adxVals: (number | null)[];
  plusDI: (number | null)[];
  minusDI: (number | null)[];
  obvVals: number[];
  willRVals: (number | null)[];
  cciVals: (number | null)[];
  psarVals: (number | null)[];
  psarBull: boolean[];
  vwapVals: (number | null)[];
  vwapUpper1: (number | null)[];
  vwapLower1: (number | null)[];
  vwapUpper2: (number | null)[];
  vwapLower2: (number | null)[];
  cvdBarDeltas: number[];
  cvdCumDeltas: number[];
  patterns: PatternResult[][];

  // Price & crossovers
  livePrice: number;
  prevLivePrice: number;
  openPrice: number;
  crossovers: CrossoverEvent[];

  // Connection status
  connStatus: ConnStatus;
  connLabel: string;

  // Entry suggestion & analysis
  suggestion: Suggestion | null;
  entryQuality: EntryQuality | null;

  // Trading positions & trails
  partialTPs: PartialTP[];
  atrTrailActive: boolean;
  trailingStopPrice: number | null;

  // Session trading
  sessionTrades: SessionTrade[];
  sessionPnL: number;
  maxDailyLossUsd: number;
  dailyLossBannerDismissed: boolean;

  // Price alerts
  priceAlerts: PriceAlert[];

  // Backtesting
  backtestResult: BacktestResult | null;
  backtestRunning: boolean;

  // Paper trading
  paperAccount: PaperAccount;
}

export interface CalcSlice {
  activeTab: 'chart' | 'calc' | 'journal' | 'strategy' | 'screener';
  currentDir: 'long' | 'short';
  rrRatio: number;
  entryPrice: string;
  stopPrice: string;
  sizeUsd: string;
  tokens: string;
  leverage: number;
  feeType: 'maker' | 'taker';
  capital: string;
  goalPct: string;
  margin: string;
}

export interface JournalSlice {
  trades: TradeJournalEntry[];
}

export interface SettingsSlice {
  theme: 'dark' | 'light';
  defaultSym: string;
  defaultTf: string;
  defaultLeverage: number;
  defaultFeeType: 'maker' | 'taker';
  defaultCapital: number;
  defaultRR: number;
  activeIndicators: ActiveIndicators;
  indicatorParams: IndicatorParams;
  chartDrawings: Drawing[];
  atrTrailMult: number;
  soundEnabled: boolean;
  notifEnabled: boolean;
}

export interface StrategySlice {
  strategies: Strategy[];
  activeStrategyId: string | null;
  strategySignal: StrategySignal | null;
}

export interface Actions {
  setSym: (sym: string) => void;
  setTf: (tf: string) => void;
  resetChartState: () => void;
  addCandleToState: (c: Candle) => void;
  setCurrentCandle: (c: Candle | null) => void;
  setLivePrice: (price: number, apiName: string) => void;
  setConnStatus: (status: ConnStatus, label: string) => void;
  refreshSuggestion: () => void;
  toggleIndicator: (key: keyof ActiveIndicators) => void;
  setIndicatorParam: (key: keyof IndicatorParams, value: number) => void;
  resetIndicatorParams: () => void;
  setActiveTab: (tab: CalcSlice['activeTab']) => void;
  setCurrentDir: (dir: CalcSlice['currentDir']) => void;
  setRrRatio: (r: number) => void;
  setEntryPrice: (v: string) => void;
  setStopPrice: (v: string) => void;
  setSizeUsd: (v: string) => void;
  setTokens: (v: string) => void;
  setLeverage: (v: number) => void;
  setFeeType: (v: CalcSlice['feeType']) => void;
  setCapital: (v: string) => void;
  setGoalPct: (v: string) => void;
  setMargin: (v: string) => void;
  applySuggestionToCalc: () => void;
  addTrade: (t: Omit<TradeJournalEntry, 'id'>) => void;
  updateTrade: (id: string, updates: Partial<TradeJournalEntry>) => void;
  deleteTrade: (id: string) => void;
  setSettings: (s: Partial<SettingsSlice>) => void;
  addStrategy: (s: Strategy) => void;
  updateStrategy: (id: string, patch: Partial<Strategy>) => void;
  deleteStrategy: (id: string) => void;
  setActiveStrategy: (id: string | null) => void;
  evalActiveStrategy: () => void;
  setChartDrawings: (d: Drawing[]) => void;
  setPartialTPs: (tps: PartialTP[]) => void;
  toggleTPHit: (idx: number) => void;
  setAtrTrailMult: (v: number) => void;
  setAtrTrailActive: (v: boolean) => void;
  addSessionTrade: (t: Omit<SessionTrade, 'id' | 'time'>) => void;
  clearSessionTrades: () => void;
  setMaxDailyLossUsd: (v: number) => void;
  setDailyLossBannerDismissed: (v: boolean) => void;
  addPriceAlert: (a: Omit<PriceAlert, 'id' | 'triggered' | 'createdAt'>) => void;
  removePriceAlert: (id: string) => void;
  clearTriggeredAlerts: () => void;
  setSoundEnabled: (v: boolean) => void;
  setNotifEnabled: (v: boolean) => void;
  setBacktestResult: (r: BacktestResult | null) => void;
  setBacktestRunning: (v: boolean) => void;
  exportStrategy: (id: string) => void;
  importStrategy: (json: string) => { ok: boolean; error?: string };
  duplicateStrategy: (id: string) => void;
  toggleStrategyEnabled: (id: string) => void;
  hydrateStrategiesFromCache: () => Promise<void>;
  openPaperPos: (pos: PaperPosition) => void;
  closePaperPos: (id: string, price: number, reason: PaperPosition['status']) => void;
  tickPaperPositions: (price: number, atr: number | null) => void;
  resetPaperAccount: (startBalance?: number) => void;
  updatePaperNote: (id: string, note: string) => void;
  hydrateTradesFromIdb: () => Promise<void>;
  importTradesCsv: (
    csv: string,
    mode: 'merge' | 'replace'
  ) => Promise<{ count: number; errors: number }>;
  exportTradesCsv: () => string;
}

// Combined store state type
export type CalcSliceCreator = CalcSlice &
  Pick<
    Actions,
    | 'setActiveTab'
    | 'setCurrentDir'
    | 'setRrRatio'
    | 'setEntryPrice'
    | 'setStopPrice'
    | 'setSizeUsd'
    | 'setTokens'
    | 'setLeverage'
    | 'setFeeType'
    | 'setCapital'
    | 'setGoalPct'
    | 'setMargin'
    | 'applySuggestionToCalc'
  >;

export type SettingsSliceCreator = SettingsSlice &
  Pick<
    Actions,
    | 'setChartDrawings'
    | 'setSettings'
    | 'toggleIndicator'
    | 'setIndicatorParam'
    | 'resetIndicatorParams'
    | 'setSoundEnabled'
    | 'setNotifEnabled'
  >;

export type ChartSliceCreator = ChartSlice &
  Pick<
    Actions,
    | 'setSym'
    | 'setTf'
    | 'resetChartState'
    | 'addCandleToState'
    | 'setCurrentCandle'
    | 'setLivePrice'
    | 'setConnStatus'
    | 'refreshSuggestion'
    | 'setChartDrawings'
    | 'setPartialTPs'
    | 'toggleTPHit'
    | 'setAtrTrailMult'
    | 'setAtrTrailActive'
    | 'addSessionTrade'
    | 'clearSessionTrades'
    | 'setMaxDailyLossUsd'
    | 'setDailyLossBannerDismissed'
    | 'addPriceAlert'
    | 'removePriceAlert'
    | 'clearTriggeredAlerts'
    | 'setBacktestResult'
    | 'setBacktestRunning'
    | 'openPaperPos'
    | 'closePaperPos'
    | 'tickPaperPositions'
    | 'resetPaperAccount'
    | 'updatePaperNote'
  >;

export type JournalSliceCreator = JournalSlice &
  Pick<
    Actions,
    | 'addTrade'
    | 'updateTrade'
    | 'deleteTrade'
    | 'hydrateTradesFromIdb'
    | 'importTradesCsv'
    | 'exportTradesCsv'
  >;

export type StrategySliceCreator = StrategySlice &
  Pick<
    Actions,
    | 'addStrategy'
    | 'updateStrategy'
    | 'deleteStrategy'
    | 'setActiveStrategy'
    | 'evalActiveStrategy'
    | 'exportStrategy'
    | 'importStrategy'
    | 'duplicateStrategy'
    | 'toggleStrategyEnabled'
    | 'hydrateStrategiesFromCache'
  >;
export type StoreState = ChartSlice &
  CalcSlice &
  JournalSlice &
  SettingsSlice &
  StrategySlice &
  Actions;
