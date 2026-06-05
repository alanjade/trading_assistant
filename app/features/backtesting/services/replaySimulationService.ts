import type { BacktestTrade } from '@/lib/backtestTypes';
import type { Candle } from '@/lib/indicators';

export type ReplayEventType = 'trade-open' | 'trade-close';

export interface ReplayEvent {
  type: ReplayEventType;
  tradeIndex: number;
  trade: BacktestTrade;
}

export interface ReplayFrame {
  index: number;
  candle: Candle;
  equity: number;
  openTrades: BacktestTrade[];
  events: ReplayEvent[];
}

export interface ReplayTimeline {
  frames: ReplayFrame[];
  totalFrames: number;
}

export function buildReplayTimeline({
  candles,
  trades,
  equity,
}: {
  candles: Candle[];
  trades: BacktestTrade[];
  equity: number[];
}): ReplayTimeline {
  const openByIndex = groupTrades(trades, 'entryIdx');
  const closeByIndex = groupTrades(trades, 'exitIdx');
  const openTrades = new Map<number, BacktestTrade>();

  const frames = candles.map((candle, index) => {
    const events: ReplayEvent[] = [];

    for (const item of openByIndex.get(index) ?? []) {
      openTrades.set(item.tradeIndex, item.trade);
      events.push({ type: 'trade-open', ...item });
    }

    for (const item of closeByIndex.get(index) ?? []) {
      openTrades.delete(item.tradeIndex);
      events.push({ type: 'trade-close', ...item });
    }

    return {
      index,
      candle,
      equity: equity[index] ?? equity[equity.length - 1] ?? 0,
      openTrades: [...openTrades.values()],
      events,
    };
  });

  return { frames, totalFrames: frames.length };
}

function groupTrades(
  trades: BacktestTrade[],
  key: 'entryIdx' | 'exitIdx'
): Map<number, Array<{ tradeIndex: number; trade: BacktestTrade }>> {
  const grouped = new Map<number, Array<{ tradeIndex: number; trade: BacktestTrade }>>();

  trades.forEach((trade, tradeIndex) => {
    const bucket = grouped.get(trade[key]) ?? [];
    bucket.push({ tradeIndex, trade });
    grouped.set(trade[key], bucket);
  });

  return grouped;
}
