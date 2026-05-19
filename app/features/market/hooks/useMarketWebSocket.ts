'use client';

import { useCallback, useEffect, useRef } from 'react';
import { toast } from '@/components/ui/Toast';
import { createThrottledQueue } from '@/lib/throttle';
import { fetchCandles } from '@/features/market/services/marketDataService';
import type { Candle } from '@/lib/indicators';
import { fmtSymDisplay } from '@/lib/indicators';
import { useStore } from '@/lib/store';
import { BinanceWebSocketManager } from '@/features/market/services/websocketManager';
import { CandleAggregator } from '@/features/market/services/candleAggregator';
import { candleCache } from '@/features/market/services/candleCache';

export function useMarketWebSocket(sym: string, tf: string) {
  const setConnStatus = useStore((state) => state.setConnStatus);
  const resetChartState = useStore((state) => state.resetChartState);
  const addCandleToState = useStore((state) => state.addCandleToState);
  const setLivePrice = useStore((state) => state.setLivePrice);

  const wsManagerRef = useRef<BinanceWebSocketManager | null>(null);
  const aggregatorRef = useRef<CandleAggregator | null>(null);
  const initialLoadDoneRef = useRef(false);

  const loadInitialCandles = useCallback(
    async (symbol: string, timeframe: string) => {
      if (initialLoadDoneRef.current) return;

      setConnStatus('idle', 'Loading...');

      // Try to load from cache first
      await candleCache.init();
      let candles = await candleCache.load(symbol, timeframe);

      // If no cache, fetch from API
      if (candles.length === 0) {
        const fetched = await fetchCandles(symbol, timeframe);
        if (!fetched || fetched.length === 0) {
          setConnStatus('err', 'Failed to load candles');
          toast.error(`Failed to load ${fmtSymDisplay(symbol)}`);
          return;
        }
        candles = fetched;
        // Cache the fetched candles
        await candleCache.save(symbol, timeframe, candles);
      }

      resetChartState();
      candles.slice(0, -1).forEach((candle: Candle) => addCandleToState(candle));
      initialLoadDoneRef.current = true;
      setConnStatus('live', 'Live - WebSocket');
    },
    [addCandleToState, resetChartState, setConnStatus]
  );

  useEffect(() => {
    if (!wsManagerRef.current) {
      wsManagerRef.current = new BinanceWebSocketManager();
    }
    if (!aggregatorRef.current) {
      aggregatorRef.current = new CandleAggregator();
    }

    const manager = wsManagerRef.current;
    const aggregator = aggregatorRef.current;
    initialLoadDoneRef.current = false;

    aggregator.reset();

    // Throttle live price updates to max 10 times per second
    const throttledSetLivePrice = createThrottledQueue(
      (price: number, source: string) => setLivePrice(price, source),
      100
    );

    // Load initial candles first
    loadInitialCandles(sym, tf).then(() => {
      // Then connect WebSocket for live updates
      const unsubscribe = manager.subscribe((msg) => {
        if (msg.type === 'connected') {
          setConnStatus('live', 'Live - WebSocket');
        } else if (msg.type === 'disconnected') {
          setConnStatus('warn', 'Disconnected');
        } else if (msg.type === 'error') {
          setConnStatus('err', msg.error || 'Error');
          toast.error(msg.error || 'WebSocket error');
        } else if (msg.type === 'candle' && msg.data) {
          const candle = msg.data as Candle;
          const result = aggregator.process(candle);

          // Add completed candle
          if (result.add) {
            addCandleToState(result.add);
            // Cache completed candles
            candleCache.save(sym, tf, [result.add]).catch(() => {
              /* ignore cache errors */
            });
          }

          // Update live price (throttled)
          throttledSetLivePrice(candle.c, 'Binance WS');
        }
      });

      manager.connect({ symbol: sym, timeframe: tf });

      return () => {
        unsubscribe();
      };
    });

    return () => {
      manager.disconnect();
    };
  }, [sym, tf, loadInitialCandles, addCandleToState, setConnStatus, setLivePrice]);
}
