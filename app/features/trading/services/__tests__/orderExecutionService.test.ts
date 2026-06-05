import { describe, expect, it } from 'vitest';
import { executeOrder, PaperBrokerAdapter } from '../orderExecutionService';
import type { ExecutionOrderRequest } from '../orderExecutionService';
import type { RiskCheckResult } from '../riskManagementService';

const order: ExecutionOrderRequest = {
  symbol: 'BTCUSDT',
  direction: 'long',
  entryPrice: 100,
  stopPrice: 98,
  targetPrice: 104,
  notional: 1_000,
  leverage: 2,
  type: 'market',
  clientOrderId: 'test-order',
};

const approvedRisk: RiskCheckResult = {
  approved: true,
  errors: [],
  warnings: [],
  riskAmount: 20,
  riskPct: 0.2,
  rewardRiskRatio: 2,
  suggestedNotional: 5_000,
};

describe('orderExecutionService', () => {
  it('fills paper orders locally after risk approval', async () => {
    const result = await executeOrder(order, {
      mode: 'paper',
      adapter: new PaperBrokerAdapter(),
      risk: approvedRisk,
    });

    expect(result.status).toBe('filled');
    expect(result.filledNotional).toBe(1_000);
    expect(result.avgFillPrice).toBe(100);
  });

  it('rejects orders when risk checks fail', async () => {
    const result = await executeOrder(order, {
      mode: 'paper',
      adapter: new PaperBrokerAdapter(),
      risk: {
        ...approvedRisk,
        approved: false,
        errors: ['Risk exceeds limit.'],
      },
    });

    expect(result.status).toBe('rejected');
    expect(result.message).toContain('Risk exceeds limit.');
  });

  it('blocks live execution unless the explicit live guard is enabled', async () => {
    const result = await executeOrder(order, {
      mode: 'live',
      adapter: new PaperBrokerAdapter(),
      risk: approvedRisk,
    });

    expect(result.status).toBe('rejected');
    expect(result.message).toBe('Live trading is disabled by execution guard.');
  });
});
