/**
 * Screener Formatting Service
 * Handles all data formatting and display constants for the screener UI
 */

import { type ExchangeId } from '@/lib/exchangeAdapters';

// Color palette for screener display
export const SCREENER_COLORS = {
  bull: '#00e5a0',
  bear: '#ff3d5a',
  amber: '#ffb82e',
  blue: '#4da6ff',
  purple: '#a78bff',
  text2: '#6b7591',
  text3: '#3d4460',
};

// Exchange brand colors (for active pill borders)
export const EXCHANGE_COLORS: Record<ExchangeId, string> = {
  binance: '#f0b90b',
  bybit: '#f7a600',
  okx: '#ffffff',
};

// Exchange logo emoji stand-ins
export const EXCHANGE_ICONS: Record<ExchangeId, string> = {
  binance: '🟡',
  bybit: '🟠',
  okx: '⚪',
};

// Typical API latency per exchange (in seconds)
export const EXCHANGE_DELAYS: Record<ExchangeId, number> = {
  binance: 0.12,
  bybit: 0.5,
  okx: 0.3,
};

/**
 * Format a numeric price for display
 * Large numbers (>1000): no decimals with thousand separators
 * Numbers 1-10: 4 decimals
 * Numbers 10+: 2 decimals
 */
export function formatPrice(value: number): string {
  if (value > 1000) {
    return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
  }
  return value.toFixed(value > 10 ? 2 : 4);
}

/**
 * Format volume/scale value as human-readable
 * 1B for billions, 1M for millions, 1K for thousands
 */
export function formatVolume(value: number): string {
  if (value >= 1e9) return (value / 1e9).toFixed(1) + 'B';
  if (value >= 1e6) return (value / 1e6).toFixed(1) + 'M';
  if (value >= 1e3) return (value / 1e3).toFixed(1) + 'K';
  return value.toFixed(0);
}

/**
 * Format a generic number with specified decimal places
 */
export function formatNumber(value: number | null, decimals = 2): string {
  return value == null ? '—' : value.toFixed(decimals);
}

/**
 * Estimate how many minutes a screener scan would take
 */
export function estimateScanMinutes(symbolCount: number, exchangeId?: ExchangeId): string {
  const delay = exchangeId ? (EXCHANGE_DELAYS[exchangeId] ?? 0.12) : 0.12;
  return ((symbolCount * delay) / 60).toFixed(0);
}

/**
 * Determine EMA stack trend
 * Bull: EMA9 > EMA20 > EMA50
 * Bear: EMA9 < EMA20 < EMA50
 */
export function detectEmaTrend(
  ema9: number | null | undefined,
  ema20: number | null | undefined,
  ema50: number | null | undefined
): 'bull' | 'bear' | null {
  if (!ema9 || !ema20 || !ema50) return null;
  if (ema9 > ema20 && ema20 > ema50) return 'bull';
  if (ema9 < ema20 && ema20 < ema50) return 'bear';
  return null;
}

/**
 * Get background color for heatmap cell based on trend
 */
export function getHeatmapBackground(trend: 'bull' | 'bear' | null): string {
  if (trend === 'bull') return 'rgba(0,229,160,0.12)';
  if (trend === 'bear') return 'rgba(255,61,90,0.12)';
  return 'rgba(255,255,255,0.04)';
}

/**
 * Get border color for heatmap cell based on trend
 */
export function getHeatmapBorder(trend: 'bull' | 'bear' | null): string {
  if (trend === 'bull') return 'rgba(0,229,160,0.4)';
  if (trend === 'bear') return 'rgba(255,61,90,0.4)';
  return 'var(--border)';
}

/**
 * Get color for change percentage display
 */
export function getChangeColor(change: number): string {
  return change >= 0 ? SCREENER_COLORS.bull : SCREENER_COLORS.bear;
}

/**
 * Get color for RSI display based on overbought/oversold
 */
export function getRsiColor(rsi: number | null | undefined): string {
  if (rsi == null) return SCREENER_COLORS.text3;
  if (rsi > 70) return SCREENER_COLORS.bear; // overbought
  if (rsi < 30) return SCREENER_COLORS.bull; // oversold
  return SCREENER_COLORS.amber; // neutral
}

/**
 * Format symbol for display (remove USDT suffix if present)
 */
export function formatSymbol(sym: string): string {
  return sym.replace('USDT', '');
}
