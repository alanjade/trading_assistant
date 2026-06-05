import type { Candle } from '@/lib/indicators';

export type OrderDirection = 'long' | 'short';
export type IntrabarPolicy = 'conservative' | 'optimistic';
export type SimExitReason = 'tp1' | 'tp2' | 'tp3' | 'sl' | 'trail';

export interface BracketExitRequest {
  candle: Candle;
  direction: OrderDirection;
  stopPrice: number;
  takeProfitPrices: number[];
  nextTakeProfitIndex?: number;
  trailStopPrice?: number | null;
  intrabarPolicy?: IntrabarPolicy;
  slippageBps?: number;
}

export interface BracketExitFill {
  price: number;
  reason: SimExitReason;
  takeProfitIndex?: number;
}

export interface MarketEntryRequest {
  candles: Candle[];
  signalIndex: number;
  latencyBars?: number;
  fallbackPrice: number;
  direction?: OrderDirection;
  slippageBps?: number;
  orderNotional?: number;
  maxVolumeParticipationPct?: number;
}

export interface MarketEntryFill {
  index: number;
  price: number;
  fillRatio: number;
  filledNotional: number;
}

function isFinitePositive(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

export function resolveMarketEntry({
  candles,
  signalIndex,
  latencyBars = 1,
  fallbackPrice,
  direction = 'long',
  slippageBps = 0,
  orderNotional = 0,
  maxVolumeParticipationPct = 100,
}: MarketEntryRequest): MarketEntryFill | null {
  const index = signalIndex + Math.max(0, Math.floor(latencyBars));
  const candle = candles[index];
  if (!candle) return null;
  const basePrice = isFinitePositive(candle.o) ? candle.o : fallbackPrice;
  const price = applySlippage(basePrice, direction, 'entry', slippageBps);
  const fillRatio = calculateFillRatio(orderNotional, candle, price, maxVolumeParticipationPct);

  return {
    index,
    price,
    fillRatio,
    filledNotional: orderNotional > 0 ? orderNotional * fillRatio : 0,
  };
}

export function resolveBracketExit({
  candle,
  direction,
  stopPrice,
  takeProfitPrices,
  nextTakeProfitIndex = 0,
  trailStopPrice = null,
  intrabarPolicy = 'conservative',
  slippageBps = 0,
}: BracketExitRequest): BracketExitFill | null {
  const stopHit = direction === 'long' ? candle.l <= stopPrice : candle.h >= stopPrice;
  const trailHit =
    trailStopPrice !== null
      ? direction === 'long'
        ? candle.l <= trailStopPrice
        : candle.h >= trailStopPrice
      : false;

  const nextTp = takeProfitPrices[nextTakeProfitIndex];
  const tpHit =
    nextTp !== undefined
      ? direction === 'long'
        ? candle.h >= nextTp
        : candle.l <= nextTp
      : false;

  const protectiveFill = pickProtectiveFill(
    stopHit,
    stopPrice,
    trailHit,
    trailStopPrice,
    direction,
    slippageBps
  );
  const tpFill =
    tpHit && nextTp !== undefined
      ? {
          price: applySlippage(nextTp, direction, 'exit', slippageBps),
          reason: `tp${nextTakeProfitIndex + 1}` as SimExitReason,
          takeProfitIndex: nextTakeProfitIndex,
        }
      : null;

  if (protectiveFill && tpFill) {
    return intrabarPolicy === 'optimistic' ? tpFill : protectiveFill;
  }

  return protectiveFill ?? tpFill;
}

function pickProtectiveFill(
  stopHit: boolean,
  stopPrice: number,
  trailHit: boolean,
  trailStopPrice: number | null,
  direction?: OrderDirection,
  slippageBps?: number
): BracketExitFill | null {
  const dir = direction ?? 'long';
  const bps = slippageBps ?? 0;
  if (stopHit) {
    return { price: applySlippage(stopPrice, dir, 'exit', bps), reason: 'sl' };
  }
  if (trailHit && trailStopPrice !== null) {
    return { price: applySlippage(trailStopPrice, dir, 'exit', bps), reason: 'trail' };
  }
  return null;
}

export function calculateFee(notional: number, feeRate: number): number {
  if (!Number.isFinite(notional) || !Number.isFinite(feeRate)) return 0;
  return Math.abs(notional) * Math.max(0, feeRate);
}

export function calculateFundingPayment({
  direction,
  notional,
  entryTime,
  exitTime,
  fundingRate,
  intervalHours = 8,
}: {
  direction: OrderDirection;
  notional: number;
  entryTime: number;
  exitTime: number;
  fundingRate: number;
  intervalHours?: number;
}): number {
  if (!Number.isFinite(notional) || notional <= 0) return 0;
  if (!Number.isFinite(entryTime) || !Number.isFinite(exitTime) || exitTime <= entryTime) return 0;
  if (!Number.isFinite(fundingRate) || fundingRate === 0) return 0;

  const intervalMs = Math.max(1, intervalHours) * 60 * 60 * 1000;
  const intervalsHeld = Math.floor((exitTime - entryTime) / intervalMs);
  if (intervalsHeld <= 0) return 0;

  const signedRate = direction === 'long' ? fundingRate : -fundingRate;
  return notional * signedRate * intervalsHeld;
}

export function applySlippage(
  price: number,
  direction: OrderDirection,
  side: 'entry' | 'exit',
  slippageBps: number
): number {
  if (!Number.isFinite(price) || price <= 0) return price;
  const bps = Number.isFinite(slippageBps) ? Math.max(0, slippageBps) : 0;
  const multiplier = bps / 10_000;
  const buysAsset = (direction === 'long' && side === 'entry') || (direction === 'short' && side === 'exit');
  return buysAsset ? price * (1 + multiplier) : price * (1 - multiplier);
}

export function calculateFillRatio(
  orderNotional: number,
  candle: Candle,
  fillPrice: number,
  maxVolumeParticipationPct: number
): number {
  if (!Number.isFinite(orderNotional) || orderNotional <= 0) return 1;
  if (!Number.isFinite(fillPrice) || fillPrice <= 0) return 1;
  if (!Number.isFinite(candle.v) || candle.v <= 0) return 1;

  const participation = Number.isFinite(maxVolumeParticipationPct)
    ? Math.max(0, Math.min(100, maxVolumeParticipationPct)) / 100
    : 1;
  if (participation <= 0) return 0;

  const availableNotional = candle.v * fillPrice * participation;
  return Math.max(0, Math.min(1, availableNotional / orderNotional));
}
