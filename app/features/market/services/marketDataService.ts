/**
 * Market Data Service
 * Abstracts all market data API calls and provides a clean interface for market operations.
 */

import { fetchKlines as fetchKlinesApi, fetchTicker as fetchTickerApi, TF_MS } from '@/lib/api';
import type { Candle } from '@/lib/indicators';

export interface TickerData {
  price: number;
  api: string;
}

/**
 * Fetches candle data for a given symbol and timeframe.
 * Handles multi-exchange fallback logic automatically.
 */
export async function fetchCandles(
  symbol: string,
  timeframe: string,
  limit: number = 200,
  endTime?: number
): Promise<Candle[] | null> {
  try {
    return await fetchKlinesApi(symbol, timeframe, limit, endTime);
  } catch (error) {
    console.error(`[marketDataService] Failed to fetch candles for ${symbol} ${timeframe}:`, error);
    return null;
  }
}

/**
 * Fetches current ticker price for a symbol.
 * Tries multiple exchanges with fallback logic.
 */
export async function fetchPrice(symbol: string): Promise<TickerData | null> {
  try {
    return await fetchTickerApi(symbol);
  } catch (error) {
    console.error(`[marketDataService] Failed to fetch price for ${symbol}:`, error);
    return null;
  }
}

/**
 * Gets the interval duration in milliseconds for a given timeframe string.
 */
export function getTimeframeMs(timeframe: string): number {
  return TF_MS[timeframe] ?? 300_000;
}

/**
 * Determines if a new candle load is needed based on the last load time.
 */
export function shouldLoadNewCandles(lastLoadTime: number, timeframe: string): boolean {
  const interval = getTimeframeMs(timeframe);
  return Date.now() - lastLoadTime > interval;
}
