/**
 * Indicator calculation service wrapper.
 * Consolidates all indicator calculations with consistent patterns and centralized configuration.
 * Acts as a facade for indicatorService and advancedIndicatorService.
 */

import { INDICATOR_PERIODS } from './tradingConstants';
import { profile } from './performance';

// Re-export common indicator types and functions
export type { Candle } from './indicators';

/**
 * Unified interface for all technical indicators.
 * Ensures consistent parameter naming and return types across all calculations.
 */
export interface IndicatorResult {
  value: number;
  timestamp: number;
  isReady: boolean;
}

export interface MultiValueIndicatorResult {
  values: Record<string, number>;
  timestamp: number;
  isReady: boolean;
}

// ============================================================================
// MOVING AVERAGES
// ============================================================================

/**
 * Calculates Simple Moving Average (SMA).
 * Includes all prices equally with period from INDICATOR_PERIODS.SMA_*
 */
export function calculateSMA(prices: number[], period: number = INDICATOR_PERIODS.SMA_MEDIUM): IndicatorResult {
  if (prices.length < period) {
    return { value: 0, timestamp: Date.now(), isReady: false };
  }

  const recentPrices = prices.slice(-period);
  const sum = recentPrices.reduce((a, b) => a + b, 0);
  const sma = sum / period;

  return {
    value: sma,
    timestamp: Date.now(),
    isReady: true,
  };
}

/**
 * Calculates Exponential Moving Average (EMA).
 * More recent prices have higher weight using INDICATOR_PERIODS.EMA_*
 */
export function calculateEMA(prices: number[], period: number = INDICATOR_PERIODS.EMA_MEDIUM): IndicatorResult {
  if (prices.length < period) {
    return { value: 0, timestamp: Date.now(), isReady: false };
  }

  const k = 2 / (period + 1);
  let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;

  for (let i = period; i < prices.length; i++) {
    ema = prices[i] * k + ema * (1 - k);
  }

  return {
    value: ema,
    timestamp: Date.now(),
    isReady: true,
  };
}

// ============================================================================
// MOMENTUM INDICATORS
// ============================================================================

/**
 * Calculates Relative Strength Index (RSI).
 * Default period: 14 (from INDICATOR_PERIODS.RSI)
 * Range: 0-100
 * Overbought: > 70, Oversold: < 30
 */
export function calculateRSI(prices: number[], period: number = INDICATOR_PERIODS.RSI): IndicatorResult {
  return profile('calculateRSI', () => {
    if (prices.length < period + 1) {
      return { value: 50, timestamp: Date.now(), isReady: false };
    }

    let gains = 0;
    let losses = 0;

    // Calculate initial average gains/losses
    for (let i = 1; i <= period; i++) {
      const change = prices[i] - prices[i - 1];
      if (change > 0) gains += change;
      else losses += Math.abs(change);
    }

    let avgGain = gains / period;
    let avgLoss = losses / period;

    // Calculate smoothed averages for remaining prices
    for (let i = period + 1; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1];
      const currentGain = change > 0 ? change : 0;
      const currentLoss = change < 0 ? Math.abs(change) : 0;

      avgGain = (avgGain * (period - 1) + currentGain) / period;
      avgLoss = (avgLoss * (period - 1) + currentLoss) / period;
    }

    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    const rsi = 100 - 100 / (1 + rs);

    return {
      value: rsi,
      timestamp: Date.now(),
      isReady: true,
    };
  });
}

// ============================================================================
// VOLATILITY INDICATORS
// ============================================================================

/**
 * Calculates Average True Range (ATR).
 * Default period: 14 (from INDICATOR_PERIODS.ATR)
 * Measures volatility independent of price direction.
 */
export function calculateATR(
  candles: Array<{ high: number; low: number; close: number }>,
  period: number = INDICATOR_PERIODS.ATR
): IndicatorResult {
  return profile('calculateATR', () => {
    if (candles.length < period) {
      return { value: 0, timestamp: Date.now(), isReady: false };
    }

    let trueRanges: number[] = [];

    for (let i = 0; i < candles.length; i++) {
      const high = candles[i].high;
      const low = candles[i].low;
      const close = i > 0 ? candles[i - 1].close : candles[i].close;

      const tr = Math.max(high - low, Math.abs(high - close), Math.abs(low - close));
      trueRanges.push(tr);
    }

    // Calculate ATR
    let atr = trueRanges.slice(0, period).reduce((a, b) => a + b, 0) / period;

    for (let i = period; i < trueRanges.length; i++) {
      atr = (atr * (period - 1) + trueRanges[i]) / period;
    }

    return {
      value: atr,
      timestamp: Date.now(),
      isReady: true,
    };
  });
}

/**
 * Calculates Bollinger Bands.
 * Default period: 20 (from INDICATOR_PERIODS.BOLLINGER_BANDS_PERIOD)
 * Standard deviation: 2 (from INDICATOR_PERIODS.BOLLINGER_BANDS_STDDEV)
 */
export function calculateBollingerBands(
  prices: number[],
  period: number = INDICATOR_PERIODS.BOLLINGER_BANDS_PERIOD,
  stdDev: number = INDICATOR_PERIODS.BOLLINGER_BANDS_STDDEV
): MultiValueIndicatorResult {
  return profile('calculateBollingerBands', () => {
    if (prices.length < period) {
      return { values: { upper: 0, middle: 0, lower: 0, width: 0, pct: 0 }, timestamp: Date.now(), isReady: false };
    }

    const recentPrices = prices.slice(-period);
    const middle = recentPrices.reduce((a, b) => a + b, 0) / period;

    const variance = recentPrices.reduce((sum, price) => sum + Math.pow(price - middle, 2), 0) / period;
    const std = Math.sqrt(variance);
    const upper = middle + std * stdDev;
    const lower = middle - std * stdDev;
    const width = upper - lower;
    const pct = width > 0 ? (prices[prices.length - 1] - lower) / width : 0.5;

    return {
      values: {
        upper,
        middle,
        lower,
        width,
        pct,
      },
      timestamp: Date.now(),
      isReady: true,
    };
  });
}

// ============================================================================
// TREND INDICATORS
// ============================================================================

/**
 * Calculates MACD (Moving Average Convergence Divergence).
 * Default periods: 12 fast, 26 slow, 9 signal (from INDICATOR_PERIODS)
 */
export function calculateMACD(
  prices: number[],
  fastPeriod: number = INDICATOR_PERIODS.MACD_FAST,
  slowPeriod: number = INDICATOR_PERIODS.MACD_SLOW,
  _signalPeriod: number = INDICATOR_PERIODS.MACD_SIGNAL
): MultiValueIndicatorResult {
  return profile('calculateMACD', () => {
    if (prices.length < slowPeriod) {
      return { values: { macd: 0, signal: 0, histogram: 0 }, timestamp: Date.now(), isReady: false };
    }

    // Calculate EMAs
    const fastEMA = calculateEMA(prices, fastPeriod).value;
    const slowEMA = calculateEMA(prices, slowPeriod).value;
    const macd = fastEMA - slowEMA;

    // For signal line, we'd need to track MACD history, so simplified version
    const signal = macd; // In production, calculate from MACD history
    const histogram = macd - signal;

    return {
      values: {
        macd,
        signal,
        histogram,
      },
      timestamp: Date.now(),
      isReady: true,
    };
  });
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Extracts closing prices from candles.
 * Helper for indicator calculations.
 */
export function extractClosingPrices(candles: Array<{ close: number }>): number[] {
  return candles.map((c) => c.close);
}

/**
 * Validates that we have enough data for an indicator calculation.
 */
export function hasEnoughDataForIndicator(dataLength: number, requiredLength: number): boolean {
  return dataLength >= requiredLength;
}

/**
 * Gets all configured indicator periods as a lookup object.
 * Useful for validation and configuration UIs.
 */
export function getAllIndicatorPeriods(): typeof INDICATOR_PERIODS {
  return INDICATOR_PERIODS;
}

/**
 * Creates a configuration snapshot of all indicator settings.
 * Useful for backtesting reproducibility.
 */
export interface IndicatorConfiguration {
  rsiPeriod: number;
  atrPeriod: number;
  macdFast: number;
  macdSlow: number;
  macdSignal: number;
  bBandsPeriod: number;
  bBandsStdDev: number;
  emaFast: number;
  emaMedium: number;
  emaSlow: number;
}

export function createIndicatorConfiguration(): IndicatorConfiguration {
  return {
    rsiPeriod: INDICATOR_PERIODS.RSI,
    atrPeriod: INDICATOR_PERIODS.ATR,
    macdFast: INDICATOR_PERIODS.MACD_FAST,
    macdSlow: INDICATOR_PERIODS.MACD_SLOW,
    macdSignal: INDICATOR_PERIODS.MACD_SIGNAL,
    bBandsPeriod: INDICATOR_PERIODS.BOLLINGER_BANDS_PERIOD,
    bBandsStdDev: INDICATOR_PERIODS.BOLLINGER_BANDS_STDDEV,
    emaFast: INDICATOR_PERIODS.EMA_FAST,
    emaMedium: INDICATOR_PERIODS.EMA_MEDIUM,
    emaSlow: INDICATOR_PERIODS.EMA_SLOW,
  };
}

/**
 * Validates indicator configuration for backtest reproducibility.
 */
export function validateIndicatorConfiguration(config: Partial<IndicatorConfiguration>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (config.rsiPeriod && config.rsiPeriod < 2) {
    errors.push('RSI period must be at least 2');
  }

  if (config.atrPeriod && config.atrPeriod < 2) {
    errors.push('ATR period must be at least 2');
  }

  if (config.bBandsPeriod && config.bBandsPeriod < 2) {
    errors.push('Bollinger Bands period must be at least 2');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
