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

export interface MACDPoint {
  macd: number | null;
  signal: number | null;
  histogram: number | null;
}

export interface BollingerBandPoint {
  upper: number | null;
  middle: number | null;
  lower: number | null;
  width: number | null;
  pct: number | null;
}

export interface IndicatorCandle {
  high: number;
  low: number;
  close: number;
}

export interface VolumeProfileCandle extends IndicatorCandle {
  open: number;
  volume: number;
}

export interface SupertrendPoint {
  value: number | null;
  upperBand: number | null;
  lowerBand: number | null;
  direction: 'bull' | 'bear';
}

export interface IchimokuPoint {
  tenkan: number | null;
  kijun: number | null;
  senkouA: number | null;
  senkouB: number | null;
  chikou: number | null;
}

export interface VolumeProfileBucket {
  price: number;
  volume: number;
  buyVolume: number;
  sellVolume: number;
}

export interface VolumeProfileResult {
  buckets: VolumeProfileBucket[];
  pointOfControl: number;
  valueAreaHigh: number;
  valueAreaLow: number;
  totalVolume: number;
}

export interface FairValueGap {
  type: 'bullish' | 'bearish';
  startIndex: number;
  endIndex: number;
  lower: number;
  upper: number;
  midpoint: number;
  gapPct: number;
  filled: boolean;
  filledIndex: number | null;
}

export interface OrderBlock {
  type: 'bullish' | 'bearish';
  candleIndex: number;
  impulseIndex: number;
  lower: number;
  upper: number;
  midpoint: number;
  volume: number;
  mitigated: boolean;
  mitigatedIndex: number | null;
}

export interface TimeframeInput {
  timeframe: string;
  candles: VolumeProfileCandle[];
}

export interface TimeframeAnalysis {
  timeframe: string;
  trend: 'bull' | 'bear' | 'neutral';
  score: number;
  close: number | null;
  emaFast: number | null;
  emaSlow: number | null;
  rsi: number | null;
}

export interface MultiTimeframeAnalysis {
  timeframes: TimeframeAnalysis[];
  bullCount: number;
  bearCount: number;
  neutralCount: number;
  confluence: 'strong_bull' | 'weak_bull' | 'neutral' | 'weak_bear' | 'strong_bear';
  score: number;
}

export interface HigherTimeframeConfirmation {
  baseTimeframe: string;
  higherTimeframe: string;
  direction: 'bull' | 'bear' | 'neutral';
  confirmed: boolean;
  score: number;
  reason: 'aligned' | 'opposed' | 'neutral' | 'missing_timeframe';
  baseTrend: TimeframeAnalysis['trend'] | null;
  higherTrend: TimeframeAnalysis['trend'] | null;
}

export interface SynchronizedIndicatorPoint {
  timeframe: string;
  close: number | null;
  trend: TimeframeAnalysis['trend'];
  rsi: number | null;
  macd: number | null;
  macdSignal: number | null;
  macdHistogram: number | null;
  bollingerPct: number | null;
  supertrendDirection: SupertrendPoint['direction'] | null;
}

export interface SynchronizedMultiTimeframeIndicators {
  points: SynchronizedIndicatorPoint[];
  alignment: 'bull' | 'bear' | 'mixed' | 'neutral';
  aligned: boolean;
  score: number;
}

export interface MarketBreadthInput {
  symbol: string;
  candles: VolumeProfileCandle[];
  group?: string;
}

export interface HeatmapCell {
  symbol: string;
  group: string;
  trend: TimeframeAnalysis['trend'];
  percentChange: number;
  intensity: number;
  close: number | null;
  volume: number;
  score: number;
}

export interface MarketBreadthResult {
  total: number;
  advancers: number;
  decliners: number;
  unchanged: number;
  advanceDeclineRatio: number;
  percentAdvancing: number;
  percentDeclining: number;
  percentAboveEma: number;
  heatmap: HeatmapCell[];
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

export function calculateEMASeries(prices: number[], period: number): (number | null)[] {
  const out = new Array<number | null>(prices.length).fill(null);
  if (prices.length < period) return out;

  const k = 2 / (period + 1);
  let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
  out[period - 1] = ema;

  for (let i = period; i < prices.length; i++) {
    ema = prices[i] * k + ema * (1 - k);
    out[i] = ema;
  }

  return out;
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
    const series = calculateRSISeries(prices, period);
    const value = series[series.length - 1];

    if (value === null || value === undefined) {
      return { value: 50, timestamp: Date.now(), isReady: false };
    }

    return {
      value,
      timestamp: Date.now(),
      isReady: true,
    };
  });
}

export function calculateRSISeries(
  prices: number[],
  period: number = INDICATOR_PERIODS.RSI
): (number | null)[] {
  const out = new Array<number | null>(prices.length).fill(null);
  if (prices.length < period + 1) return out;

  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const change = prices[i] - prices[i - 1];
    gains += Math.max(0, change);
    losses += Math.max(0, -change);
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;
  out[period] = rsiFromAverages(avgGain, avgLoss);

  for (let i = period + 1; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    avgGain = (avgGain * (period - 1) + Math.max(0, change)) / period;
    avgLoss = (avgLoss * (period - 1) + Math.max(0, -change)) / period;
    out[i] = rsiFromAverages(avgGain, avgLoss);
  }

  return out;
}

function rsiFromAverages(avgGain: number, avgLoss: number): number {
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
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

export function calculateATRSeries(
  candles: IndicatorCandle[],
  period: number = INDICATOR_PERIODS.ATR
): (number | null)[] {
  const trueRanges = candles.map((candle, index) => {
    const previousClose = index > 0 ? candles[index - 1].close : candle.close;
    return Math.max(
      candle.high - candle.low,
      Math.abs(candle.high - previousClose),
      Math.abs(candle.low - previousClose)
    );
  });
  const out = new Array<number | null>(candles.length).fill(null);
  if (trueRanges.length < period) return out;

  let atr = trueRanges.slice(0, period).reduce((a, b) => a + b, 0) / period;
  out[period - 1] = atr;

  for (let i = period; i < trueRanges.length; i++) {
    atr = (atr * (period - 1) + trueRanges[i]) / period;
    out[i] = atr;
  }

  return out;
}

export function calculateBollingerBandsSeries(
  prices: number[],
  period: number = INDICATOR_PERIODS.BOLLINGER_BANDS_PERIOD,
  stdDev: number = INDICATOR_PERIODS.BOLLINGER_BANDS_STDDEV
): BollingerBandPoint[] {
  return prices.map((price, index) => {
    if (index < period - 1) {
      return { upper: null, middle: null, lower: null, width: null, pct: null };
    }

    const window = prices.slice(index - period + 1, index + 1);
    const middle = window.reduce((a, b) => a + b, 0) / period;
    const variance = window.reduce((sum, value) => sum + Math.pow(value - middle, 2), 0) / period;
    const std = Math.sqrt(variance);
    const upper = middle + std * stdDev;
    const lower = middle - std * stdDev;
    const width = upper - lower;
    const pct = width > 0 ? (price - lower) / width : 0.5;

    return { upper, middle, lower, width, pct };
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
  signalPeriod: number = INDICATOR_PERIODS.MACD_SIGNAL
): MultiValueIndicatorResult {
  return profile('calculateMACD', () => {
    const series = calculateMACDSeries(prices, fastPeriod, slowPeriod, signalPeriod);
    const latest = series[series.length - 1];

    if (!latest || latest.macd === null || latest.signal === null || latest.histogram === null) {
      return { values: { macd: 0, signal: 0, histogram: 0 }, timestamp: Date.now(), isReady: false };
    }

    return {
      values: {
        macd: latest.macd,
        signal: latest.signal,
        histogram: latest.histogram,
      },
      timestamp: Date.now(),
      isReady: true,
    };
  });
}

export function calculateMACDSeries(
  prices: number[],
  fastPeriod: number = INDICATOR_PERIODS.MACD_FAST,
  slowPeriod: number = INDICATOR_PERIODS.MACD_SLOW,
  signalPeriod: number = INDICATOR_PERIODS.MACD_SIGNAL
): MACDPoint[] {
  const out: MACDPoint[] = Array.from({ length: prices.length }, () => ({
    macd: null,
    signal: null,
    histogram: null,
  }));
  const fastEMA = calculateEMASeries(prices, fastPeriod);
  const slowEMA = calculateEMASeries(prices, slowPeriod);
  const signalK = 2 / (signalPeriod + 1);
  let signalEMA: number | null = null;

  for (let i = 0; i < prices.length; i++) {
    if (fastEMA[i] === null || slowEMA[i] === null) continue;

    const macd = fastEMA[i]! - slowEMA[i]!;
    signalEMA = signalEMA === null ? macd : macd * signalK + signalEMA * (1 - signalK);
    out[i] = {
      macd,
      signal: signalEMA,
      histogram: macd - signalEMA,
    };
  }

  return out;
}

export function calculateSupertrendSeries(
  candles: IndicatorCandle[],
  period: number = INDICATOR_PERIODS.SUPERTREND_PERIOD,
  multiplier: number = INDICATOR_PERIODS.SUPERTREND_MULTIPLIER
): SupertrendPoint[] {
  const atr = calculateATRSeries(candles, period);
  const out: SupertrendPoint[] = Array.from({ length: candles.length }, () => ({
    value: null,
    upperBand: null,
    lowerBand: null,
    direction: 'bull',
  }));

  let finalUpper: number | null = null;
  let finalLower: number | null = null;
  let supertrend: number | null = null;
  let direction: 'bull' | 'bear' = 'bull';

  for (let i = 0; i < candles.length; i++) {
    if (atr[i] === null) {
      out[i] = { value: null, upperBand: finalUpper, lowerBand: finalLower, direction };
      continue;
    }

    const candle = candles[i];
    const hl2 = (candle.high + candle.low) / 2;
    const basicUpper = hl2 + multiplier * atr[i]!;
    const basicLower = hl2 - multiplier * atr[i]!;
    const previousClose = i > 0 ? candles[i - 1].close : candle.close;

    const previousUpper: number | null = finalUpper;
    const previousLower: number | null = finalLower;
    const previousSupertrend: number | null = supertrend;

    finalUpper =
      previousUpper === null || basicUpper < previousUpper || previousClose > previousUpper
        ? basicUpper
        : previousUpper;
    finalLower =
      previousLower === null || basicLower > previousLower || previousClose < previousLower
        ? basicLower
        : previousLower;

    if (previousSupertrend === previousUpper) {
      supertrend = candle.close <= finalUpper ? finalUpper : finalLower;
    } else if (previousSupertrend === previousLower) {
      supertrend = candle.close >= finalLower ? finalLower : finalUpper;
    } else {
      supertrend = candle.close >= finalLower ? finalLower : finalUpper;
    }

    direction = supertrend === finalLower ? 'bull' : 'bear';
    out[i] = { value: supertrend, upperBand: finalUpper, lowerBand: finalLower, direction };
  }

  return out;
}

export function calculateIchimokuSeries(
  candles: IndicatorCandle[],
  conversionPeriod = 9,
  basePeriod = 26,
  spanBPeriod = 52,
  displacement = 26
): IchimokuPoint[] {
  const out: IchimokuPoint[] = Array.from({ length: candles.length }, () => ({
    tenkan: null,
    kijun: null,
    senkouA: null,
    senkouB: null,
    chikou: null,
  }));

  for (let i = 0; i < candles.length; i++) {
    const tenkan = midpointOfRange(candles, i, conversionPeriod);
    const kijun = midpointOfRange(candles, i, basePeriod);
    out[i].tenkan = tenkan;
    out[i].kijun = kijun;

    const forwardIndex = i + displacement;
    if (forwardIndex < out.length && tenkan !== null && kijun !== null) {
      out[forwardIndex].senkouA = (tenkan + kijun) / 2;
    }

    const spanB = midpointOfRange(candles, i, spanBPeriod);
    if (forwardIndex < out.length && spanB !== null) {
      out[forwardIndex].senkouB = spanB;
    }

    const laggingIndex = i - displacement;
    if (laggingIndex >= 0) {
      out[laggingIndex].chikou = candles[i].close;
    }
  }

  return out;
}

export function calculateVolumeProfile(
  candles: VolumeProfileCandle[],
  bucketCount = INDICATOR_PERIODS.VOLUME_PROFILE_ROWS,
  valueAreaPct = 0.7
): VolumeProfileResult {
  if (!candles.length || bucketCount <= 0) {
    return { buckets: [], pointOfControl: 0, valueAreaHigh: 0, valueAreaLow: 0, totalVolume: 0 };
  }

  const low = Math.min(...candles.map((c) => c.low));
  const high = Math.max(...candles.map((c) => c.high));
  const range = high - low;
  if (range <= 0) {
    return { buckets: [], pointOfControl: low, valueAreaHigh: low, valueAreaLow: low, totalVolume: 0 };
  }

  const step = range / bucketCount;
  const buckets: VolumeProfileBucket[] = Array.from({ length: bucketCount }, (_, index) => ({
    price: low + (index + 0.5) * step,
    volume: 0,
    buyVolume: 0,
    sellVolume: 0,
  }));

  for (const candle of candles) {
    const start = Math.max(0, Math.floor((candle.low - low) / step));
    const end = Math.min(bucketCount - 1, Math.floor((candle.high - low) / step));
    const span = Math.max(1, end - start + 1);
    const volumePerBucket = candle.volume / span;
    const isBuy = candle.close >= candle.open;

    for (let i = start; i <= end; i++) {
      buckets[i].volume += volumePerBucket;
      if (isBuy) buckets[i].buyVolume += volumePerBucket;
      else buckets[i].sellVolume += volumePerBucket;
    }
  }

  const totalVolume = buckets.reduce((sum, bucket) => sum + bucket.volume, 0);
  const pocIndex = buckets.reduce(
    (bestIndex, bucket, index) => (bucket.volume > buckets[bestIndex].volume ? index : bestIndex),
    0
  );
  const targetVolume = totalVolume * Math.max(0, Math.min(1, valueAreaPct));
  let valueLowIndex = pocIndex;
  let valueHighIndex = pocIndex;
  let accumulated = buckets[pocIndex].volume;

  while (accumulated < targetVolume && (valueLowIndex > 0 || valueHighIndex < buckets.length - 1)) {
    const lowerVolume = valueLowIndex > 0 ? buckets[valueLowIndex - 1].volume : -1;
    const upperVolume = valueHighIndex < buckets.length - 1 ? buckets[valueHighIndex + 1].volume : -1;

    if (lowerVolume >= upperVolume && lowerVolume >= 0) {
      valueLowIndex--;
      accumulated += lowerVolume;
    } else if (upperVolume >= 0) {
      valueHighIndex++;
      accumulated += upperVolume;
    } else {
      break;
    }
  }

  return {
    buckets,
    pointOfControl: buckets[pocIndex].price,
    valueAreaHigh: buckets[valueHighIndex].price,
    valueAreaLow: buckets[valueLowIndex].price,
    totalVolume,
  };
}

export function detectFairValueGaps(
  candles: IndicatorCandle[],
  minGapPct = 0
): FairValueGap[] {
  const gaps: FairValueGap[] = [];

  for (let i = 2; i < candles.length; i++) {
    const first = candles[i - 2];
    const third = candles[i];

    if (first.high < third.low) {
      const lower = first.high;
      const upper = third.low;
      const gapPct = ((upper - lower) / lower) * 100;
      if (gapPct >= minGapPct) {
        gaps.push(buildGap('bullish', i - 2, i, lower, upper, candles));
      }
    }

    if (first.low > third.high) {
      const lower = third.high;
      const upper = first.low;
      const gapPct = ((upper - lower) / upper) * 100;
      if (gapPct >= minGapPct) {
        gaps.push(buildGap('bearish', i - 2, i, lower, upper, candles));
      }
    }
  }

  return gaps;
}

export function detectOrderBlocks(
  candles: VolumeProfileCandle[],
  lookback = 120,
  impulseRangeMultiplier = 1.5,
  minBodyRatio = 0.55
): OrderBlock[] {
  const start = Math.max(1, candles.length - lookback);
  const ranges = candles.map((c) => c.high - c.low);
  const blocks: OrderBlock[] = [];

  for (let i = start; i < candles.length; i++) {
    const impulse = candles[i];
    const previous = candles[i - 1];
    const avgRange = average(ranges.slice(Math.max(0, i - 20), i)) || ranges[i];
    const range = impulse.high - impulse.low;
    const body = Math.abs(impulse.close - impulse.open);
    const bodyRatio = range > 0 ? body / range : 0;
    const isImpulse = range >= avgRange * impulseRangeMultiplier && bodyRatio >= minBodyRatio;

    if (!isImpulse) continue;

    const bullishImpulse = impulse.close > impulse.open;
    const bearishImpulse = impulse.close < impulse.open;
    const previousBear = previous.close < previous.open;
    const previousBull = previous.close > previous.open;

    if (bullishImpulse && previousBear) {
      blocks.push(buildOrderBlock('bullish', i - 1, i, previous, candles));
    }

    if (bearishImpulse && previousBull) {
      blocks.push(buildOrderBlock('bearish', i - 1, i, previous, candles));
    }
  }

  return blocks;
}

export function calculateMultiTimeframeAnalysis(
  inputs: TimeframeInput[],
  fastPeriod: number = INDICATOR_PERIODS.EMA_FAST,
  slowPeriod: number = INDICATOR_PERIODS.EMA_SLOW,
  rsiPeriod: number = INDICATOR_PERIODS.RSI
): MultiTimeframeAnalysis {
  const timeframes = inputs.map(({ timeframe, candles }) => {
    const closes = candles.map((c) => c.close);
    const close = closes[closes.length - 1] ?? null;
    const fast = calculateEMA(closes, fastPeriod);
    const slow = calculateEMA(closes, slowPeriod);
    const rsi = calculateRSI(closes, rsiPeriod);
    const emaFast = fast.isReady ? fast.value : null;
    const emaSlow = slow.isReady ? slow.value : null;
    const rsiValue = rsi.isReady ? rsi.value : null;

    let trend: TimeframeAnalysis['trend'] = 'neutral';
    let score = 50;

    if (close !== null && emaFast !== null && emaSlow !== null) {
      if (close > emaFast && emaFast > emaSlow) {
        trend = 'bull';
        score = 75;
      } else if (close < emaFast && emaFast < emaSlow) {
        trend = 'bear';
        score = 25;
      }
    }

    if (rsiValue !== null) {
      if (trend === 'bull') score += rsiValue > 50 ? 10 : -10;
      if (trend === 'bear') score += rsiValue < 50 ? -10 : 10;
      if (trend === 'neutral') score = rsiValue > 55 ? 60 : rsiValue < 45 ? 40 : 50;
    }

    return {
      timeframe,
      trend,
      score: Math.max(0, Math.min(100, score)),
      close,
      emaFast,
      emaSlow,
      rsi: rsiValue,
    };
  });

  const bullCount = timeframes.filter((t) => t.trend === 'bull').length;
  const bearCount = timeframes.filter((t) => t.trend === 'bear').length;
  const neutralCount = timeframes.length - bullCount - bearCount;
  const score = timeframes.length > 0 ? average(timeframes.map((t) => t.score)) : 50;
  const bullRatio = timeframes.length > 0 ? bullCount / timeframes.length : 0;
  const bearRatio = timeframes.length > 0 ? bearCount / timeframes.length : 0;

  const confluence: MultiTimeframeAnalysis['confluence'] =
    bullRatio >= 0.75
      ? 'strong_bull'
      : bullRatio >= 0.5 && bullCount > bearCount
        ? 'weak_bull'
        : bearRatio >= 0.75
          ? 'strong_bear'
          : bearRatio >= 0.5 && bearCount > bullCount
            ? 'weak_bear'
            : 'neutral';

  return { timeframes, bullCount, bearCount, neutralCount, confluence, score };
}

export function confirmHigherTimeframeTrend(
  analysis: MultiTimeframeAnalysis,
  baseTimeframe: string,
  higherTimeframe: string,
  minScore = 60
): HigherTimeframeConfirmation {
  const base = analysis.timeframes.find((timeframe) => timeframe.timeframe === baseTimeframe);
  const higher = analysis.timeframes.find((timeframe) => timeframe.timeframe === higherTimeframe);

  if (!base || !higher) {
    return {
      baseTimeframe,
      higherTimeframe,
      direction: 'neutral',
      confirmed: false,
      score: 0,
      reason: 'missing_timeframe',
      baseTrend: base?.trend ?? null,
      higherTrend: higher?.trend ?? null,
    };
  }

  if (base.trend === 'neutral' || higher.trend === 'neutral') {
    return {
      baseTimeframe,
      higherTimeframe,
      direction: 'neutral',
      confirmed: false,
      score: Math.round((base.score + higher.score) / 2),
      reason: 'neutral',
      baseTrend: base.trend,
      higherTrend: higher.trend,
    };
  }

  const aligned = base.trend === higher.trend;
  const score = aligned ? Math.round((base.score + higher.score) / 2) : Math.round(Math.abs(base.score - higher.score));

  return {
    baseTimeframe,
    higherTimeframe,
    direction: aligned ? base.trend : 'neutral',
    confirmed: aligned && score >= minScore,
    score,
    reason: aligned ? 'aligned' : 'opposed',
    baseTrend: base.trend,
    higherTrend: higher.trend,
  };
}

export function calculateSynchronizedMultiTimeframeIndicators(
  inputs: TimeframeInput[]
): SynchronizedMultiTimeframeIndicators {
  const analysis = calculateMultiTimeframeAnalysis(inputs);
  const points = inputs.map(({ timeframe, candles }) => {
    const closes = candles.map((candle) => candle.close);
    const latestAnalysis = analysis.timeframes.find((item) => item.timeframe === timeframe);
    const macd = latestOrNull(calculateMACDSeries(closes));
    const bands = latestOrNull(calculateBollingerBandsSeries(closes));
    const supertrend = latestOrNull(calculateSupertrendSeries(candles));

    return {
      timeframe,
      close: closes[closes.length - 1] ?? null,
      trend: latestAnalysis?.trend ?? 'neutral',
      rsi: latestAnalysis?.rsi ?? null,
      macd: macd?.macd ?? null,
      macdSignal: macd?.signal ?? null,
      macdHistogram: macd?.histogram ?? null,
      bollingerPct: bands?.pct ?? null,
      supertrendDirection: supertrend?.value === null || supertrend === null ? null : supertrend.direction,
    };
  });

  const nonNeutral = points.filter((point) => point.trend !== 'neutral');
  const bullCount = nonNeutral.filter((point) => point.trend === 'bull').length;
  const bearCount = nonNeutral.filter((point) => point.trend === 'bear').length;
  const aligned = nonNeutral.length > 0 && (bullCount === nonNeutral.length || bearCount === nonNeutral.length);
  const alignment: SynchronizedMultiTimeframeIndicators['alignment'] =
    nonNeutral.length === 0 ? 'neutral' : aligned && bullCount > 0 ? 'bull' : aligned && bearCount > 0 ? 'bear' : 'mixed';
  const score = points.length > 0 ? average(points.map((point) => latestIndicatorScore(point))) : 50;

  return { points, alignment, aligned, score };
}

export function calculateMarketBreadth(
  inputs: MarketBreadthInput[],
  emaPeriod: number = INDICATOR_PERIODS.EMA_MEDIUM,
  flatThresholdPct = 0.05
): MarketBreadthResult {
  const heatmap = inputs.map(({ symbol, candles, group }) => {
    const closes = candles.map((candle) => candle.close);
    const firstClose = closes[0] ?? null;
    const lastClose = closes[closes.length - 1] ?? null;
    const percentChange =
      firstClose !== null && lastClose !== null && firstClose !== 0 ? ((lastClose - firstClose) / firstClose) * 100 : 0;
    const trend: TimeframeAnalysis['trend'] =
      Math.abs(percentChange) <= flatThresholdPct ? 'neutral' : percentChange > 0 ? 'bull' : 'bear';
    const ema = calculateEMA(closes, emaPeriod);
    const aboveEma = ema.isReady && lastClose !== null && lastClose > ema.value;

    return {
      symbol,
      group: group ?? 'Market',
      trend,
      percentChange,
      intensity: Math.min(1, Math.abs(percentChange) / 5),
      close: lastClose,
      volume: candles.reduce((sum, candle) => sum + candle.volume, 0),
      score: trend === 'bull' ? (aboveEma ? 75 : 60) : trend === 'bear' ? (aboveEma ? 40 : 25) : 50,
    };
  });

  const total = heatmap.length;
  const advancers = heatmap.filter((cell) => cell.trend === 'bull').length;
  const decliners = heatmap.filter((cell) => cell.trend === 'bear').length;
  const unchanged = total - advancers - decliners;
  const aboveEmaCount = inputs.filter(({ candles }) => {
    const closes = candles.map((candle) => candle.close);
    const close = closes[closes.length - 1];
    const ema = calculateEMA(closes, emaPeriod);
    return ema.isReady && close !== undefined && close > ema.value;
  }).length;

  return {
    total,
    advancers,
    decliners,
    unchanged,
    advanceDeclineRatio: decliners > 0 ? advancers / decliners : advancers,
    percentAdvancing: total > 0 ? (advancers / total) * 100 : 0,
    percentDeclining: total > 0 ? (decliners / total) * 100 : 0,
    percentAboveEma: total > 0 ? (aboveEmaCount / total) * 100 : 0,
    heatmap,
  };
}

function latestOrNull<T>(values: T[]): T | null {
  return values.length > 0 ? values[values.length - 1] : null;
}

function latestIndicatorScore(point: SynchronizedIndicatorPoint): number {
  let score = point.trend === 'bull' ? 65 : point.trend === 'bear' ? 35 : 50;

  if (point.rsi !== null) {
    if (point.trend === 'bull') score += point.rsi > 50 ? 10 : -10;
    if (point.trend === 'bear') score += point.rsi < 50 ? -10 : 10;
  }

  if (point.macdHistogram !== null) {
    if (point.macdHistogram > 0) score += 5;
    if (point.macdHistogram < 0) score -= 5;
  }

  if (point.supertrendDirection !== null) {
    if (point.supertrendDirection === 'bull') score += 5;
    if (point.supertrendDirection === 'bear') score -= 5;
  }

  return Math.max(0, Math.min(100, score));
}

function midpointOfRange(candles: IndicatorCandle[], index: number, period: number): number | null {
  if (index < period - 1) return null;
  const window = candles.slice(index - period + 1, index + 1);
  const high = Math.max(...window.map((c) => c.high));
  const low = Math.min(...window.map((c) => c.low));
  return (high + low) / 2;
}

function buildGap(
  type: FairValueGap['type'],
  startIndex: number,
  endIndex: number,
  lower: number,
  upper: number,
  candles: IndicatorCandle[]
): FairValueGap {
  const filledIndex = findGapFill(type, lower, upper, candles, endIndex + 1);
  return {
    type,
    startIndex,
    endIndex,
    lower,
    upper,
    midpoint: (lower + upper) / 2,
    gapPct: type === 'bullish' ? ((upper - lower) / lower) * 100 : ((upper - lower) / upper) * 100,
    filled: filledIndex !== null,
    filledIndex,
  };
}

function findGapFill(
  type: FairValueGap['type'],
  lower: number,
  upper: number,
  candles: IndicatorCandle[],
  startIndex: number
): number | null {
  for (let i = startIndex; i < candles.length; i++) {
    if (type === 'bullish' && candles[i].low <= lower) return i;
    if (type === 'bearish' && candles[i].high >= upper) return i;
  }
  return null;
}

function buildOrderBlock(
  type: OrderBlock['type'],
  candleIndex: number,
  impulseIndex: number,
  candle: VolumeProfileCandle,
  candles: VolumeProfileCandle[]
): OrderBlock {
  const lower = candle.low;
  const upper = candle.high;
  const mitigatedIndex = findOrderBlockMitigation(type, lower, upper, candles, impulseIndex + 1);

  return {
    type,
    candleIndex,
    impulseIndex,
    lower,
    upper,
    midpoint: (lower + upper) / 2,
    volume: candle.volume,
    mitigated: mitigatedIndex !== null,
    mitigatedIndex,
  };
}

function findOrderBlockMitigation(
  type: OrderBlock['type'],
  lower: number,
  upper: number,
  candles: VolumeProfileCandle[],
  startIndex: number
): number | null {
  for (let i = startIndex; i < candles.length; i++) {
    if (type === 'bullish' && candles[i].low <= upper && candles[i].high >= lower) return i;
    if (type === 'bearish' && candles[i].high >= lower && candles[i].low <= upper) return i;
  }
  return null;
}

function average(values: number[]): number {
  return values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
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
