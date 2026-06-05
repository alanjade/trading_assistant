import { describe, expect, it } from 'vitest';
import { buildReplayTimeline } from '../replaySimulationService';
import type { BacktestTrade } from '@/lib/backtestTypes';
import type { Candle } from '@/lib/indicators';

const candles: Candle[] = Array.from({ length: 4 }, (_, i) => ({
  t: i,
  o: 100 + i,
  h: 101 + i,
  l: 99 + i,
  c: 100 + i,
  v: 1000,
}));

const trade: BacktestTrade = {
  dir: 'long',
  entryIdx: 1,
  exitIdx: 3,
  entryPrice: 101,
  exitPrice: 103,
  size: 1000,
  pnl: 20,
  pnlPct: 0.2,
  r: 1,
  exitReason: 'tp1',
  mae: -0.5,
  mfe: 1.5,
  entryTime: 1,
  exitTime: 3,
};

describe('replaySimulationService', () => {
  it('builds candle-by-candle replay frames with trade events', () => {
    const timeline = buildReplayTimeline({
      candles,
      trades: [trade],
      equity: [1000, 1000, 1010, 1020],
    });

    expect(timeline.totalFrames).toBe(4);
    expect(timeline.frames[1].events[0]?.type).toBe('trade-open');
    expect(timeline.frames[1].openTrades).toHaveLength(1);
    expect(timeline.frames[2].openTrades).toHaveLength(1);
    expect(timeline.frames[3].events[0]?.type).toBe('trade-close');
    expect(timeline.frames[3].openTrades).toHaveLength(0);
    expect(timeline.frames[3].equity).toBe(1020);
  });
});
