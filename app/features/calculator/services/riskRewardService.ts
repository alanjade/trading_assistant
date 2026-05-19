import type { PartialTP } from '@/lib/store';
import { FEES, TP_PRESETS } from '@/lib/tradingConstants';

export type TradeDirection = 'long' | 'short';
export type FeeType = 'maker' | 'taker';
export type MarginMode = 'isolated' | 'cross';
export type TradeCount = number | '-' | 'Infinity';

const MAINTENANCE_MARGIN_SCHEDULE = [
  { maxLeverage: 20, rate: 0.005 },
  { maxLeverage: 50, rate: 0.01 },
  { maxLeverage: 100, rate: 0.015 },
  { maxLeverage: 125, rate: 0.02 },
] as const;

export function getMaintenanceMarginRate(leverage: number) {
  return (
    MAINTENANCE_MARGIN_SCHEDULE.find((entry) => leverage <= entry.maxLeverage)?.rate ??
    MAINTENANCE_MARGIN_SCHEDULE[MAINTENANCE_MARGIN_SCHEDULE.length - 1].rate
  );
}

export function calculateLiquidationPrice(
  entry: number,
  positionSize: number,
  availableMargin: number,
  maintenanceMarginRate: number,
  feeTotal: number,
  isLong: boolean
) {
  if (entry <= 0 || positionSize <= 0) return 0;
  const units = positionSize / entry;
  if (!units) return 0;

  const maintenanceMarginAmount = positionSize * maintenanceMarginRate;
  const marginGap = maintenanceMarginAmount + feeTotal - availableMargin;
  const pnlPerUnitAtLiquidation = marginGap / units;
  const price = isLong ? entry + pnlPerUnitAtLiquidation : entry - pnlPerUnitAtLiquidation;

  return Math.max(0, price);
}

export function calculateLiquidationDistancePct(entry: number, liquidationPrice: number) {
  return entry > 0 ? (Math.abs(entry - liquidationPrice) / entry) * 100 : 0;
}

export const RR_PRESETS = TP_PRESETS.RR_RATIOS;

export const DEFAULT_TP_CONFIGS: Array<[ratio: number, pct: number]> = TP_PRESETS.DEFAULT_MULTI_TP.map(
  (tp) => [tp.ratio, Math.round(tp.allocation * 100)] as const
);

export const FEE_RATES: Record<FeeType, number> = {
  maker: FEES.MAKER_RATE,
  taker: FEES.TAKER_RATE,
};

export function parseFiniteNumber(value: string | number, fallback = 0) {
  const parsed = typeof value === 'number' ? value : Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function formatRiskRewardLabel(rrRatio: number) {
  return `1:${rrRatio % 1 === 0 ? rrRatio : rrRatio.toFixed(1)}`;
}

export function calculateTokensFromSize(entryPrice: string | number, sizeUsd: string | number) {
  const entry = parseFiniteNumber(entryPrice);
  const size = parseFiniteNumber(sizeUsd);

  if (entry <= 0 || size <= 0) return null;
  return (size / entry).toFixed(6);
}

export function calculateSizeFromTokens(entryPrice: string | number, tokens: string | number) {
  const entry = parseFiniteNumber(entryPrice);
  const tokenAmount = parseFiniteNumber(tokens);

  if (entry <= 0 || tokenAmount <= 0) return null;
  return (tokenAmount * entry).toFixed(2);
}

export interface RiskRewardInputs {
  currentDir: TradeDirection;
  rrRatio: number;
  entryPrice: string;
  stopPrice: string;
  sizeUsd: string;
  tokens: string;
  sym: string;
}

export function calculateRiskReward({
  currentDir,
  rrRatio,
  entryPrice,
  stopPrice,
  sizeUsd,
  tokens,
  sym,
}: RiskRewardInputs) {
  const entry = parseFiniteNumber(entryPrice);
  const stop = parseFiniteNumber(stopPrice);
  const size = parseFiniteNumber(sizeUsd, 1) || 1;
  const tokenAmount = parseFiniteNumber(tokens) || (entry > 0 ? size / entry : 0);
  const isLong = currentDir === 'long';
  const riskPerUnit = Math.abs(entry - stop);
  const target = isLong ? entry + riskPerUnit * rrRatio : entry - riskPerUnit * rrRatio;
  const breakEven = isLong ? entry + riskPerUnit : entry - riskPerUnit;
  const riskUsd = riskPerUnit * tokenAmount;
  const rewardUsd = riskPerUnit * rrRatio * tokenAmount;
  const total = riskUsd + rewardUsd;

  return {
    entry,
    stop,
    size,
    tokenAmount,
    isLong,
    riskPerUnit,
    target,
    breakEven,
    riskUsd,
    rewardUsd,
    riskUsdLabel: riskUsd.toFixed(2),
    rewardUsdLabel: rewardUsd.toFixed(2),
    ticker: sym.replace('USDT', ''),
    rrLabel: formatRiskRewardLabel(rrRatio),
    riskBarPct:
      total > 0 ? Math.round((riskUsd / total) * 100) : Math.round((1 / (1 + rrRatio)) * 100),
  };
}

export function calculateRiskRewardAsync(inputs: RiskRewardInputs): Promise<ReturnType<typeof calculateRiskReward>> {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && 'Worker' in window) {
      try {
        const worker = new Worker('/calc.worker.js');
        const id = Math.random().toString(36).slice(2, 9);
        const onMsg = (e: MessageEvent) => {
          if (e.data?.id !== id) return;
          worker.removeEventListener('message', onMsg);
          worker.terminate();
          resolve(e.data.result);
        };
        worker.addEventListener('message', onMsg);
        worker.postMessage({ id, type: 'riskReward', payload: inputs });
        setTimeout(() => {
          try {
            worker.terminate();
          } catch {}
          resolve(calculateRiskReward(inputs));
        }, 1000);
        return;
      } catch {
        // fallthrough
      }
    }
    resolve(calculateRiskReward(inputs));
  });
}

export function calculatePartialTakeProfitsAsync({
  previousTps,
  entry,
  stop,
  tokenAmount,
  isLong,
  configs = DEFAULT_TP_CONFIGS,
}: TakeProfitCalculationInputs): Promise<PartialTP[]> {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && 'Worker' in window) {
      try {
        const worker = new Worker('/calc.worker.js');
        const id = Math.random().toString(36).slice(2, 9);
        const onMsg = (e: MessageEvent) => {
          if (e.data?.id !== id) return;
          worker.removeEventListener('message', onMsg);
          worker.terminate();
          resolve(e.data.result);
        };
        worker.addEventListener('message', onMsg);
        worker.postMessage({
          id,
          type: 'partialTps',
          payload: { previousTps, entry, stop, tokenAmount, isLong, configs },
        });
        setTimeout(() => {
          try {
            worker.terminate();
          } catch {}
          resolve(calculatePartialTakeProfits({ previousTps, entry, stop, tokenAmount, isLong, configs }));
        }, 1000);
        return;
      } catch {
        // fallthrough
      }
    }
    resolve(calculatePartialTakeProfits({ previousTps, entry, stop, tokenAmount, isLong, configs }));
  });
}

export interface TakeProfitCalculationInputs {
  previousTps: PartialTP[];
  entry: number;
  stop: number;
  tokenAmount: number;
  isLong: boolean;
  configs?: Array<[ratio: number, pct: number]>;
}

export function calculatePartialTakeProfits({
  previousTps,
  entry,
  stop,
  tokenAmount,
  isLong,
  configs = DEFAULT_TP_CONFIGS,
}: TakeProfitCalculationInputs): PartialTP[] {
  const riskPerUnit = Math.abs(entry - stop);

  if (!entry || !stop || riskPerUnit === 0 || tokenAmount === 0) return [];

  return configs.map(([ratio, pct], index) => {
    const price = isLong ? entry + riskPerUnit * ratio : entry - riskPerUnit * ratio;
    const portion = tokenAmount * (pct / 100);
    const pnlUsd = Math.abs(price - entry) * portion;

    return {
      ratio,
      pct,
      price,
      pnlUsd,
      hit: previousTps[index]?.hit ?? false,
    };
  });
}

export function updatePartialTakeProfitRatio(
  tp: PartialTP,
  ratio: number,
  entry: number,
  stop: number,
  tokenAmount: number,
  isLong: boolean
): PartialTP | null {
  if (!Number.isFinite(ratio) || ratio <= 0 || !entry || !stop) return null;

  const riskPerUnit = Math.abs(entry - stop);
  const price = isLong ? entry + riskPerUnit * ratio : entry - riskPerUnit * ratio;
  const portion = tokenAmount * (tp.pct / 100);

  return { ...tp, ratio, price, pnlUsd: Math.abs(price - entry) * portion };
}

export function updatePartialTakeProfitPct(
  tp: PartialTP,
  pct: number,
  entry: number,
  tokenAmount: number
): PartialTP | null {
  if (!Number.isFinite(pct) || pct < 0 || pct > 100) return null;

  const portion = tokenAmount * (pct / 100);
  return { ...tp, pct, pnlUsd: Math.abs(tp.price - entry) * portion };
}

export function calculateAtrTrailDisplay(
  entry: number,
  isLong: boolean,
  atr: number | null,
  multiplier: number
) {
  if (!atr) return null;
  return isLong ? entry - atr * multiplier : entry + atr * multiplier;
}

export interface FuturesInputs {
  entryPrice: string;
  stopPrice: string;
  capital: string;
  margin: string;
  leverage: number;
  feeType: FeeType;
  marginMode?: MarginMode;
}

export function calculateFutures({
  entryPrice,
  stopPrice,
  capital,
  margin,
  leverage,
  feeType,
  marginMode = 'isolated',
}: FuturesInputs) {
  const entry = parseFiniteNumber(entryPrice);
  const stop = parseFiniteNumber(stopPrice);
  const capitalAmount = parseFiniteNumber(capital, 200) || 200;
  const marginAmount = parseFiniteNumber(margin, 20) || 20;
  const feeRate = FEE_RATES[feeType];
  const positionSize = marginAmount * leverage;
  const feeOpen = positionSize * feeRate;
  const feeClose = positionSize * feeRate;
  const feeTotal = feeOpen + feeClose;
  const maintenanceMarginRate = getMaintenanceMarginRate(leverage);
  const maintenanceMarginAmount = positionSize * maintenanceMarginRate;
  const isLong = stop < entry;
  const availableMargin = marginMode === 'cross' ? capitalAmount : marginAmount;
  const liquidationPrice = calculateLiquidationPrice(
    entry,
    positionSize,
    availableMargin,
    maintenanceMarginRate,
    0,
    isLong
  );
  const feeAwareLiquidationPrice = calculateLiquidationPrice(
    entry,
    positionSize,
    availableMargin,
    maintenanceMarginRate,
    feeTotal,
    isLong
  );
  const effectiveLiquidationBuffer = Math.max(0, availableMargin - maintenanceMarginAmount - feeTotal);
  const feeAwareLiquidationDistancePct = leverage > 0 ? calculateLiquidationDistancePct(entry, feeAwareLiquidationPrice) : 0;
  const liquidationDistancePct = leverage > 0 ? calculateLiquidationDistancePct(entry, liquidationPrice) : 0;

  let profit = 0;
  let loss = 0;
  let roiWin = 0;
  let roiLoss = 0;
  let breakEven = 0;

  if (entry > 0 && stop > 0) {
    const riskPerUnit = Math.abs(entry - stop);
    const tokenAmount = positionSize / entry;
    profit = tokenAmount * riskPerUnit * 2 - feeTotal;
    loss = tokenAmount * riskPerUnit + feeTotal;
    roiWin = capitalAmount > 0 ? (profit / capitalAmount) * 100 : 0;
    roiLoss = capitalAmount > 0 ? (loss / capitalAmount) * 100 : 0;
    breakEven = isLong
      ? entry + feeTotal / tokenAmount
      : entry - feeTotal / tokenAmount;
  }

  const liquidationBarPct = Math.min((liquidationDistancePct / 10) * 100, 100);
  const liquidationColor =
    liquidationDistancePct > 5
      ? 'var(--green)'
      : liquidationDistancePct > 2
        ? 'var(--amber)'
        : 'var(--red)';

  return {
    entry,
    stop,
    capitalAmount,
    marginAmount,
    feeRate,
    positionSize,
    feeOpen,
    feeClose,
    feeTotal,
    maintenanceMarginAmount,
    effectiveLiquidationBuffer,
    feeAwareLiquidationPrice,
    feeAwareLiquidationDistancePct,
    marginMode,
    liquidationDistancePct,
    liquidationPrice,
    maintenanceMarginRate,
    liquidationBarPct,
    liquidationColor,
    danger: feeAwareLiquidationDistancePct <= 2,
    showWarning: leverage >= 10,
    leveragePct: ((leverage - 1) / 124) * 100,
    profit,
    loss,
    roiWin,
    roiLoss,
    breakEven,
    riskPct: capitalAmount > 0 ? (loss / capitalAmount) * 100 : 0,
  };
}

export function calculateFuturesAsync(inputs: FuturesInputs): Promise<ReturnType<typeof calculateFutures>> {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && 'Worker' in window) {
      try {
        const worker = new Worker('/calc.worker.js');
        const id = Math.random().toString(36).slice(2, 9);
        const onMsg = (e: MessageEvent) => {
          if (e.data?.id !== id) return;
          worker.removeEventListener('message', onMsg);
          worker.terminate();
          resolve(e.data.result);
        };
        worker.addEventListener('message', onMsg);
        worker.postMessage({ id, type: 'futures', payload: inputs });
        // Timeout fallback
        setTimeout(() => {
          try {
            worker.terminate();
          } catch {}
          resolve(calculateFutures(inputs));
        }, 1000);
        return;
      } catch {
        // fallthrough
      }
    }
    // Fallback to synchronous calculation
    resolve(calculateFutures(inputs));
  });
}

export interface GoalInputs {
  capital: string;
  goalPct: string;
  margin: string;
  leverage: number;
  feeType: FeeType;
  rrRatio: number;
  entryPrice: string;
  stopPrice: string;
}

export function calculateDailyGoal({
  capital,
  goalPct,
  margin,
  leverage,
  feeType,
  rrRatio,
  entryPrice,
  stopPrice,
}: GoalInputs) {
  const capitalAmount = parseFiniteNumber(capital, 200) || 200;
  const goalPctAmount = parseFiniteNumber(goalPct, 10) || 10;
  const marginAmount = parseFiniteNumber(margin, 20) || 20;
  const entry = parseFiniteNumber(entryPrice);
  const stop = parseFiniteNumber(stopPrice);
  const positionSize = marginAmount * leverage;
  const feeTotal = positionSize * FEE_RATES[feeType] * 2;
  const goalUsd = (capitalAmount * goalPctAmount) / 100;
  const rrLabel = formatRiskRewardLabel(rrRatio);

  let perTrade = 0;
  let tradesNeeded: TradeCount = '-';
  let summaryText =
    'Set your Entry and Stop Loss in the R:R Calculator to see how many winning trades you need.';

  if (entry > 0 && stop > 0) {
    const stopDistancePct = (Math.abs(entry - stop) / entry) * 100;
    const grossProfit = positionSize * (stopDistancePct / 100) * rrRatio;
    perTrade = grossProfit - feeTotal;

    if (perTrade > 0) {
      tradesNeeded = Math.ceil(goalUsd / perTrade);
      const tradeCount = tradesNeeded;
      const setupNote =
        tradeCount <= 2
          ? 'Realistic with 1-2 clean 3-EMA setups.'
          : tradeCount <= 5
            ? `Requires ${tradeCount} wins; avoid overtrading.`
            : 'Too many trades needed; consider increasing margin or leverage cautiously.';

      summaryText =
        `At ${leverage}x with $${marginAmount} margin ($${capitalAmount} capital), each winning trade nets ~$${perTrade.toFixed(2)} (${rrLabel} RR). ` +
        `You need ${tradeCount} winning trade${tradeCount > 1 ? 's' : ''} to hit the $${goalUsd.toFixed(2)} daily goal. ` +
        `Fees total $${feeTotal.toFixed(3)} per round-trip. ${setupNote}`;
    } else {
      tradesNeeded = 'Infinity';
      summaryText = `Fees ($${feeTotal.toFixed(3)}) exceed gross profit at this stop distance. Widen TP or reduce fees.`;
    }
  }

  return {
    capitalAmount,
    goalPctAmount,
    marginAmount,
    entry,
    stop,
    positionSize,
    feeTotal,
    goalUsd,
    rrLabel,
    perTrade,
    tradesNeeded,
    summaryText,
  };
}

export function calculateDailyGoalAsync(inputs: GoalInputs): Promise<ReturnType<typeof calculateDailyGoal>> {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && 'Worker' in window) {
      try {
        const worker = new Worker('/calc.worker.js');
        const id = Math.random().toString(36).slice(2, 9);
        const onMsg = (e: MessageEvent) => {
          if (e.data?.id !== id) return;
          worker.removeEventListener('message', onMsg);
          worker.terminate();
          resolve(e.data.result);
        };
        worker.addEventListener('message', onMsg);
        worker.postMessage({ id, type: 'goal', payload: inputs });
        setTimeout(() => {
          try {
            worker.terminate();
          } catch {}
          resolve(calculateDailyGoal(inputs));
        }, 1000);
        return;
      } catch {
        // fallthrough
      }
    }
    resolve(calculateDailyGoal(inputs));
  });
}
