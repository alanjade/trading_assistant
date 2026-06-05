export type TradeDirection = 'long' | 'short';

export interface RiskPolicy {
  accountEquity: number;
  maxRiskPctPerTrade: number;
  maxPositionPctOfEquity: number;
  maxLeverage: number;
  maxDailyLossPct: number;
  dailyPnl: number;
  maxOpenPositions: number;
  openPositions: number;
  minRewardRiskRatio?: number;
}

export interface RiskOrderDraft {
  symbol: string;
  direction: TradeDirection;
  entryPrice: number;
  stopPrice: number;
  targetPrice?: number;
  notional: number;
  leverage: number;
}

export interface RiskCheckResult {
  approved: boolean;
  errors: string[];
  warnings: string[];
  riskAmount: number;
  riskPct: number;
  rewardRiskRatio: number | null;
  suggestedNotional: number;
}

export function evaluateRisk(order: RiskOrderDraft, policy: RiskPolicy): RiskCheckResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const equity = finitePositive(policy.accountEquity);
  const entry = finitePositive(order.entryPrice);
  const stop = finitePositive(order.stopPrice);
  const notional = finitePositive(order.notional);
  const leverage = finitePositive(order.leverage);

  if (!order.symbol.trim()) errors.push('Symbol is required.');
  if (entry <= 0) errors.push('Entry price must be greater than zero.');
  if (stop <= 0) errors.push('Stop price must be greater than zero.');
  if (notional <= 0) errors.push('Order notional must be greater than zero.');
  if (equity <= 0) errors.push('Account equity must be greater than zero.');

  const units = entry > 0 ? notional / entry : 0;
  const riskAmount = Math.abs(entry - stop) * units;
  const riskPct = equity > 0 ? (riskAmount / equity) * 100 : 0;
  const maxRiskAmount = equity * (Math.max(0, policy.maxRiskPctPerTrade) / 100);
  const maxPositionNotional = equity * (Math.max(0, policy.maxPositionPctOfEquity) / 100);
  const suggestedNotional =
    Math.abs(entry - stop) > 0 && maxRiskAmount > 0 ? (maxRiskAmount / Math.abs(entry - stop)) * entry : 0;

  if (riskAmount > maxRiskAmount) {
    errors.push(`Risk exceeds ${policy.maxRiskPctPerTrade}% per-trade limit.`);
  }
  if (notional > maxPositionNotional) {
    errors.push(`Position exceeds ${policy.maxPositionPctOfEquity}% equity exposure limit.`);
  }
  if (leverage > policy.maxLeverage) {
    errors.push(`Leverage exceeds ${policy.maxLeverage}x limit.`);
  }
  if (policy.openPositions >= policy.maxOpenPositions) {
    errors.push(`Open position limit reached (${policy.maxOpenPositions}).`);
  }

  const dailyLossPct = equity > 0 && policy.dailyPnl < 0 ? (Math.abs(policy.dailyPnl) / equity) * 100 : 0;
  if (dailyLossPct >= policy.maxDailyLossPct) {
    errors.push(`Daily loss limit reached (${policy.maxDailyLossPct}%).`);
  } else if (dailyLossPct >= policy.maxDailyLossPct * 0.8) {
    warnings.push('Daily loss is near the configured limit.');
  }

  const rewardRiskRatio = calculateRewardRiskRatio(order);
  if (
    rewardRiskRatio !== null &&
    policy.minRewardRiskRatio !== undefined &&
    rewardRiskRatio < policy.minRewardRiskRatio
  ) {
    warnings.push(`Reward/risk is below ${policy.minRewardRiskRatio.toFixed(2)}R.`);
  }

  return {
    approved: errors.length === 0,
    errors,
    warnings,
    riskAmount,
    riskPct,
    rewardRiskRatio,
    suggestedNotional,
  };
}

export function calculateRewardRiskRatio(order: RiskOrderDraft): number | null {
  if (order.targetPrice === undefined) return null;

  const risk = Math.abs(order.entryPrice - order.stopPrice);
  if (!Number.isFinite(risk) || risk <= 0) return null;

  const reward =
    order.direction === 'long'
      ? order.targetPrice - order.entryPrice
      : order.entryPrice - order.targetPrice;

  return reward > 0 ? reward / risk : 0;
}

function finitePositive(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0;
}
