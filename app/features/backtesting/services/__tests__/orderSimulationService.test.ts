import { describe, expect, it } from 'vitest';
import {
  applySlippage,
  calculateFillRatio,
  calculateFee,
  calculateFundingPayment,
  resolveBracketExit,
  resolveMarketEntry,
} from '../orderSimulationService';
import type { Candle } from '@/lib/indicators';

const candle = (overrides: Partial<Candle>): Candle => ({
  t: 1,
  o: 100,
  h: 105,
  l: 95,
  c: 101,
  v: 1000,
  ...overrides,
});

describe('orderSimulationService', () => {
  it('fills market entries on a delayed candle open', () => {
    const candles = [candle({ o: 100 }), candle({ o: 102 }), candle({ o: 104 })];

    expect(resolveMarketEntry({ candles, signalIndex: 0, latencyBars: 2, fallbackPrice: 99 })).toEqual(
      {
        index: 2,
        price: 104,
        fillRatio: 1,
        filledNotional: 0,
      }
    );
  });

  it('returns null when latency pushes the fill beyond available candles', () => {
    const candles = [candle({ o: 100 })];

    expect(resolveMarketEntry({ candles, signalIndex: 0, latencyBars: 1, fallbackPrice: 99 })).toBeNull();
  });

  it('uses conservative stop-first resolution when stop and target are both touched', () => {
    const fill = resolveBracketExit({
      candle: candle({ h: 112, l: 94 }),
      direction: 'long',
      stopPrice: 95,
      takeProfitPrices: [110],
    });

    expect(fill).toEqual({ price: 95, reason: 'sl' });
  });

  it('can use optimistic target-first resolution for ambiguous candles', () => {
    const fill = resolveBracketExit({
      candle: candle({ h: 112, l: 94 }),
      direction: 'long',
      stopPrice: 95,
      takeProfitPrices: [110],
      intrabarPolicy: 'optimistic',
    });

    expect(fill).toEqual({ price: 110, reason: 'tp1', takeProfitIndex: 0 });
  });

  it('resolves short take profits and trailing stops', () => {
    expect(
      resolveBracketExit({
        candle: candle({ h: 101, l: 88 }),
        direction: 'short',
        stopPrice: 106,
        takeProfitPrices: [90],
      })
    ).toEqual({ price: 90, reason: 'tp1', takeProfitIndex: 0 });

    expect(
      resolveBracketExit({
        candle: candle({ h: 98, l: 92 }),
        direction: 'short',
        stopPrice: 110,
        takeProfitPrices: [88],
        trailStopPrice: 97,
      })
    ).toEqual({ price: 97, reason: 'trail' });
  });

  it('calculates notional fees defensively', () => {
    expect(calculateFee(1000, 0.0005)).toBe(0.5);
    expect(calculateFee(Number.NaN, 0.0005)).toBe(0);
    expect(calculateFee(1000, -1)).toBe(0);
  });

  it('applies adverse slippage by trade direction and side', () => {
    expect(applySlippage(100, 'long', 'entry', 10)).toBeCloseTo(100.1);
    expect(applySlippage(100, 'long', 'exit', 10)).toBeCloseTo(99.9);
    expect(applySlippage(100, 'short', 'entry', 10)).toBeCloseTo(99.9);
    expect(applySlippage(100, 'short', 'exit', 10)).toBeCloseTo(100.1);
  });

  it('caps oversized orders with volume-based partial fills', () => {
    const fill = resolveMarketEntry({
      candles: [candle({ o: 100, v: 10 }), candle({ o: 100, v: 10 })],
      signalIndex: 0,
      latencyBars: 1,
      fallbackPrice: 100,
      orderNotional: 10_000,
      maxVolumeParticipationPct: 20,
    });

    expect(fill?.fillRatio).toBeCloseTo(0.02);
    expect(fill?.filledNotional).toBeCloseTo(200);
    expect(calculateFillRatio(10_000, candle({ v: 10 }), 100, 20)).toBeCloseTo(0.02);
  });

  it('applies slippage to bracket exits', () => {
    const fill = resolveBracketExit({
      candle: candle({ h: 112, l: 100 }),
      direction: 'long',
      stopPrice: 95,
      takeProfitPrices: [110],
      slippageBps: 10,
    });

    expect(fill?.price).toBeCloseTo(109.89);
    expect(fill?.reason).toBe('tp1');
    expect(fill?.takeProfitIndex).toBe(0);
  });

  it('charges or credits funding based on side and holding time', () => {
    const eightHours = 8 * 60 * 60 * 1000;

    expect(
      calculateFundingPayment({
        direction: 'long',
        notional: 10_000,
        entryTime: 0,
        exitTime: eightHours * 2 + 1,
        fundingRate: 0.0001,
      })
    ).toBeCloseTo(2);

    expect(
      calculateFundingPayment({
        direction: 'short',
        notional: 10_000,
        entryTime: 0,
        exitTime: eightHours * 2 + 1,
        fundingRate: 0.0001,
      })
    ).toBeCloseTo(-2);
  });
});
