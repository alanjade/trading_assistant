/**
 * Centralized trading constants and configuration values.
 * This module prevents magic numbers from being scattered across the codebase.
 * Update these values to adjust trading behavior globally.
 */

// ============================================================================
// INDICATOR PERIODS & TECHNICAL ANALYSIS
// ============================================================================

export const INDICATOR_PERIODS = {
  // Moving Averages
  EMA_FAST: 9,
  EMA_MEDIUM: 21,
  EMA_SLOW: 50,
  SMA_SHORT: 10,
  SMA_MEDIUM: 20,
  SMA_LONG: 50,

  // Momentum & Volatility
  RSI: 14,
  ATR: 14,
  MACD_FAST: 12,
  MACD_SLOW: 26,
  MACD_SIGNAL: 9,
  BOLLINGER_BANDS_PERIOD: 20,
  BOLLINGER_BANDS_STDDEV: 2,

  // Volume & Trend
  VOLUME_PROFILE_ROWS: 20,
  SUPERTREND_PERIOD: 10,
  SUPERTREND_MULTIPLIER: 3,
} as const;

// ============================================================================
// TRADING FEES & COSTS
// ============================================================================

export const FEES = {
  MAKER_RATE: 0.0002, // 0.02%
  TAKER_RATE: 0.0005, // 0.05%
  EXCHANGE_DEFAULT: 0.0005, // Default to taker fee
} as const;

// ============================================================================
// POSITION SIZING & RISK MANAGEMENT
// ============================================================================

export const POSITION_SIZING = {
  // Risk defaults
  DEFAULT_RISK_PERCENT: 0.01, // 1% per trade
  DEFAULT_RISK_AMOUNT: 100, // $100 default risk

  // Kelly Criterion
  KELLY_FRACTION: 0.5, // Use 0.5x Kelly (conservative)
  MAX_KELLY: 0.25, // Cap Kelly position at 25% of account
  MAX_TRADE_SIZE: 500, // Max $500 per trade

  // Concurrent trades
  MAX_CONCURRENT_TRADES: 1,

  // Account defaults
  DEFAULT_STARTING_BALANCE: 10000, // $10,000
  PAPER_TRADING_BALANCE: 10000, // Paper trading starting balance
} as const;

// ============================================================================
// STOP LOSS & TAKE PROFIT LOGIC
// ============================================================================

export const STOP_LOSS = {
  // Stop placement (multiples of ATR)
  ATR_MULTIPLIER: 2,

  // Break-even triggers
  BREAKEVEN_TRIGGER_R: 1, // Move to break-even at 1R profit
  BREAKEVEN_OFFSET: 0, // No offset after break-even

  // Trailing stop
  TRAIL_ACTIVATION_R: 2, // Activate trailing stop at 2R profit
  TRAIL_ATR_MULTIPLIER: 1.5, // Trail distance = ATR × 1.5
} as const;

// ============================================================================
// TAKE PROFIT PRESET CONFIGURATIONS
// ============================================================================

export const TP_PRESETS = {
  // Risk-Reward ratios (common targets)
  RR_RATIOS: [2, 1.5, 3, 5] as const,

  // Default TP distribution: [RR ratio, allocation %]
  DEFAULT_MULTI_TP: [
    { ratio: 1.5, allocation: 0.33 }, // 33% at 1.5R
    { ratio: 2.5, allocation: 0.34 }, // 34% at 2.5R
    { ratio: 4, allocation: 0.33 }, // 33% at 4R
  ] as const,

  // Simple TP presets
  SIMPLE_TP_PRESET: 2, // Default to 2:1 RR
} as const;

// ============================================================================
// CHART & CANDLE SETTINGS
// ============================================================================

export const CHART = {
  // Candle update frequency
  CANDLE_UPDATE_INTERVAL: 1000, // 1 second

  // Default timeframe
  DEFAULT_TIMEFRAME: '15m',

  // Max candles to display
  MAX_CANDLES: 300,

  // Price alert sensitivity
  ALERT_PRECISION: 0.0001, // 0.01% minimum difference
} as const;

// ============================================================================
// SESSION & BACKTESTING
// ============================================================================

export const SESSION = {
  // Session tracking
  SESSION_TIMEOUT: 3600000, // 1 hour
  TRADE_LOG_RETENTION: 90, // Days

  // Backtesting defaults
  BACKTEST_MAX_CANDLES: 1000,
  BACKTEST_PROGRESS_UPDATE_INTERVAL: 100, // Update progress every N candles
} as const;

// ============================================================================
// UI & UX SETTINGS
// ============================================================================

export const UI = {
  // Toast notifications
  TOAST_DURATION: 3000, // 3 seconds
  TOAST_MAX_VISIBLE: 3,

  // Debounce delays (ms)
  SYMBOL_SEARCH_DEBOUNCE: 300,
  SCREENER_FILTER_DEBOUNCE: 500,
  CALCULATOR_INPUT_DEBOUNCE: 250,

  // Animation timings
  TRANSITION_DURATION: 200,
  DRAWER_ANIMATION: 300,
} as const;

// ============================================================================
// DATA LIMITS & CONSTRAINTS
// ============================================================================

export const DATA_LIMITS = {
  // Cache TTL
  MARKET_DATA_CACHE_TTL: 60000, // 1 minute
  SYMBOL_CACHE_TTL: 300000, // 5 minutes

  // API constraints
  MAX_CANDLES_PER_REQUEST: 1000,
  MAX_SYMBOLS_PER_BATCH: 50,

  // Storage limits
  MAX_TRADES_IN_JOURNAL: 10000,
  MAX_BACKTEST_RESULTS: 100,
} as const;

// ============================================================================
// MARKET CONDITIONS & VALIDATION
// ============================================================================

export const MARKET = {
  // Price precision
  MIN_PRICE: 0.00000001, // Minimum tradeable price
  MAX_PRICE: 1000000, // Maximum reasonable price

  // Volume constraints
  MIN_VOLUME: 0.00001, // Minimum position size
  MAX_VOLUME: 10000000, // Maximum position size

  // Leverage limits
  DEFAULT_LEVERAGE: 1, // No leverage by default
  MAX_LEVERAGE: 20, // Maximum available leverage
} as const;

// ============================================================================
// TYPE-SAFE EXPORTS FOR COMMON USE CASES
// ============================================================================

/** Get all indicator period names for validation */
export const INDICATOR_PERIOD_KEYS = Object.keys(INDICATOR_PERIODS) as Array<
  keyof typeof INDICATOR_PERIODS
>;

/** Get all RR ratio presets */
export const RR_RATIOS = TP_PRESETS.RR_RATIOS;

/** Get multi-TP configuration */
export const DEFAULT_MULTI_TP = TP_PRESETS.DEFAULT_MULTI_TP;

// ============================================================================
// VALIDATION & HELPER FUNCTIONS
// ============================================================================

/**
 * Validates if a price is within acceptable trading range
 */
export function isValidPrice(price: number): boolean {
  return Number.isFinite(price) && price >= MARKET.MIN_PRICE && price <= MARKET.MAX_PRICE;
}

/**
 * Validates if a volume/size is within acceptable range
 */
export function isValidVolume(volume: number): boolean {
  return Number.isFinite(volume) && volume >= MARKET.MIN_VOLUME && volume <= MARKET.MAX_VOLUME;
}

/**
 * Calculates risk amount from risk percentage and account balance
 */
export function calculateRiskAmount(balance: number, riskPercent: number = POSITION_SIZING.DEFAULT_RISK_PERCENT): number {
  return balance * riskPercent;
}

/**
 * Calculates stop loss distance from risk amount and entry price
 */
export function calculateStopDistance(riskAmount: number, entryPrice: number, units: number): number {
  return riskAmount / units / entryPrice;
}
