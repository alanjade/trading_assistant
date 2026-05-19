import type { SessionTrade } from '@/lib/store';

export type SessionTradeDraft = Partial<Omit<SessionTrade, 'id' | 'time'>>;

export interface SessionTradeDraftContext {
  sym: string;
  currentDir: SessionTrade['dir'];
  entryPrice: string;
  sizeUsd: string;
  livePrice: number;
}

export function parseSessionNumber(value: unknown, fallback = 0) {
  const parsed = typeof value === 'number' ? value : Number.parseFloat(String(value));
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function createSessionTradeDraft({
  sym,
  currentDir,
  entryPrice,
  sizeUsd,
  livePrice,
}: SessionTradeDraftContext): SessionTradeDraft {
  return {
    sym,
    dir: currentDir,
    entry: parseSessionNumber(entryPrice) || livePrice,
    exit: livePrice,
    size: parseSessionNumber(sizeUsd, 100) || 100,
    note: '',
  };
}

export function calculateSessionTradePnl(
  dir: SessionTrade['dir'],
  entry: number,
  exit: number,
  size: number
) {
  if (entry <= 0 || exit <= 0 || size <= 0) return 0;

  const units = size / entry;
  return dir === 'long' ? (exit - entry) * units : (entry - exit) * units;
}

export function buildSessionTradeFromDraft(draft: SessionTradeDraft, fallbackSym: string) {
  const entry = parseSessionNumber(draft.entry);
  const exit = parseSessionNumber(draft.exit);
  const size = parseSessionNumber(draft.size, 100) || 100;

  if (!entry || !exit) return null;

  const dir = draft.dir ?? 'long';

  return {
    sym: draft.sym || fallbackSym,
    dir,
    entry,
    exit,
    size,
    pnl: calculateSessionTradePnl(dir, entry, exit, size),
    note: draft.note,
  } satisfies Omit<SessionTrade, 'id' | 'time'>;
}

export function calculateSessionStats(
  sessionTrades: SessionTrade[],
  sessionPnL: number,
  maxDailyLossUsd: number
) {
  const dailyLossHit = maxDailyLossUsd > 0 && -sessionPnL >= maxDailyLossUsd;
  const dailyLossWarn = maxDailyLossUsd > 0 && -sessionPnL >= maxDailyLossUsd * 0.75;

  return {
    dailyLossHit,
    dailyLossWarn,
    pnlColor: sessionPnL >= 0 ? 'var(--green)' : 'var(--red)',
    lossUsedPct: maxDailyLossUsd > 0 ? Math.min(100, (-sessionPnL / maxDailyLossUsd) * 100) : 0,
    wins: sessionTrades.filter((trade) => trade.pnl > 0).length,
    losses: sessionTrades.filter((trade) => trade.pnl <= 0).length,
  };
}

export function calculateTradeReturnPct(trade: SessionTrade) {
  return trade.size > 0 ? (trade.pnl / trade.size) * 100 : 0;
}
