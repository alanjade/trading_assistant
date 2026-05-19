'use client';

import { useCallback, useEffect, useRef } from 'react';
import { toast } from '@/components/ui/Toast';
import {
  fetchCandles,
  fetchPrice,
  shouldLoadNewCandles,
} from '@/features/market/services/marketDataService';
import type { Candle } from '@/lib/indicators';
import { fmtSymDisplay } from '@/lib/indicators';
import { useStore } from '@/lib/store';

export function useMarketPolling(sym: string, tf: string) {
  const setConnStatus = useStore((state) => state.setConnStatus);
  const resetChartState = useStore((state) => state.resetChartState);
  const addCandleToState = useStore((state) => state.addCandleToState);
  const setLivePrice = useStore((state) => state.setLivePrice);

  const lastKlineLoad = useRef(0);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadCandles = useCallback(
    async (symbol: string, timeframe: string) => {
      setConnStatus('idle', 'Loading...');
      const candles = await fetchCandles(symbol, timeframe);

      if (!candles || candles.length === 0) {
        setConnStatus('err', 'Failed to load candles');
        toast.error(`Failed to load ${fmtSymDisplay(symbol)}`);
        return;
      }

      resetChartState();
      candles.slice(0, -1).forEach((candle: Candle) => addCandleToState(candle));
      lastKlineLoad.current = Date.now();
      setConnStatus('live', 'Live');
    },
    [addCandleToState, resetChartState, setConnStatus]
  );

  const tick = useCallback(async () => {
    const state = useStore.getState();
    const symbol = state.sym;
    const timeframe = state.tf;
    const result = await fetchPrice(symbol);

    if (!result) {
      setConnStatus('warn', 'Price unavailable');
      return;
    }

    setLivePrice(result.price, result.api);
    setConnStatus('live', `Live - ${result.api}`);

    if (shouldLoadNewCandles(lastKlineLoad.current, timeframe)) {
      await loadCandles(symbol, timeframe);
    }
  }, [loadCandles, setConnStatus, setLivePrice]);

  useEffect(() => {
    if (pollingRef.current) clearInterval(pollingRef.current);

    loadCandles(sym, tf).then(() => tick());
    pollingRef.current = setInterval(tick, 5_000);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [loadCandles, sym, tf, tick]);
}
