import { describe, expect, it } from 'vitest';
import { evaluateRisk } from '../riskManagementService';
import type { RiskOrderDraft, RiskPolicy } from '../riskManagementService';

const policy: RiskPolicy = {
  accountEquity: 10_000,
  maxRiskPctPerTrade: 1,
  maxPositionPctOfEquity: 50,
  maxLeverage: 5,
  maxDailyLossPct: 3,
  dailyPnl: 0,
  maxOpenPositions: 3,
  openPositions: 0,
  minRewardRiskRatio: 1.5,
};

const order: RiskOrderDraft = {
  symbol: 'BTCUSDT',
  direction: 'long',
  entryPrice: 100,
  stopPrice: 98,
  targetPrice: 104,
  notional: 2_000,
  leverage: 2,
};

describe('riskManagementService', () => {
  it('approves orders inside policy limits', () => {
    const result = evaluateRisk(order, policy);

    expect(result.approved).toBe(true);
    expect(result.riskAmount).toBe(40);
    expect(result.riskPct).toBeCloseTo(0.4);
    expect(result.rewardRiskRatio).toBe(2);
  });

  it('rejects excessive risk, exposure, leverage, and open positions', () => {
    const result = evaluateRisk(
      { ...order, stopPrice: 90, notional: 8_000, leverage: 10 },
      { ...policy, openPositions: 3 }
    );

    expect(result.approved).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        'Risk exceeds 1% per-trade limit.',
        'Position exceeds 50% equity exposure limit.',
        'Leverage exceeds 5x limit.',
        'Open position limit reached (3).',
      ])
    );
  });

  it('rejects trading after the daily loss limit is hit', () => {
    const result = evaluateRisk(order, { ...policy, dailyPnl: -350 });

    expect(result.approved).toBe(false);
    expect(result.errors).toContain('Daily loss limit reached (3%).');
  });

  it('warns when reward/risk is below policy but does not reject', () => {
    const result = evaluateRisk({ ...order, targetPrice: 101 }, policy);

    expect(result.approved).toBe(true);
    expect(result.warnings).toContain('Reward/risk is below 1.50R.');
  });
});
