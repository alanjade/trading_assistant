/**
 * PnL (Profit and Loss) calculation utilities.
 * Consolidates calculations that were previously duplicated across 3 different files.
 * Provides consistent, testable functions for all trading P&L computations.
 */

/**
 * Safely parses a value to a finite number, returning 0 if invalid.
 * Used for defensive calculations when values might be undefined or invalid.
 */
export function parseFiniteNumber(value: unknown, defaultValue: number = 0): number {
  const num = typeof value === 'number' ? value : typeof value === 'string' ? parseFloat(value) : defaultValue;
  return Number.isFinite(num) ? num : defaultValue;
}

// ============================================================================
// BASIC PnL CALCULATIONS
// ============================================================================

/**
 * Calculates unrealized PnL for an open position.
 *
 * @param direction - 'long' or 'short'
 * @param entryPrice - Entry price per unit
 * @param exitPrice - Current price per unit
 * @param units - Position size in units
 * @returns PnL in account currency
 *
 * @example
 * // Long position: entry $100, current $110, 10 units
 * calculateUnrealizedPnL('long', 100, 110, 10) // → 100 profit
 *
 * // Short position: entry $100, current $90, 10 units
 * calculateUnrealizedPnL('short', 100, 90, 10) // → 100 profit
 */
export function calculateUnrealizedPnL(
  direction: 'long' | 'short',
  entryPrice: number,
  exitPrice: number,
  units: number
): number {
  entryPrice = parseFiniteNumber(entryPrice);
  exitPrice = parseFiniteNumber(exitPrice);
  units = parseFiniteNumber(units);

  if (direction === 'long') {
    return (exitPrice - entryPrice) * units;
  } else {
    return (entryPrice - exitPrice) * units;
  }
}

/**
 * Calculates realized PnL from a completed trade.
 * Same formula as unrealized, but used for closed positions.
 *
 * @param direction - 'long' or 'short'
 * @param entryPrice - Entry price per unit
 * @param exitPrice - Exit price per unit
 * @param units - Position size in units
 * @returns PnL in account currency
 */
export function calculateRealizedPnL(
  direction: 'long' | 'short',
  entryPrice: number,
  exitPrice: number,
  units: number
): number {
  return calculateUnrealizedPnL(direction, entryPrice, exitPrice, units);
}

/**
 * Calculates PnL including trading fees.
 *
 * @param pnl - Base PnL before fees
 * @param entryPrice - Entry price per unit
 * @param exitPrice - Exit price per unit
 * @param units - Position size
 * @param makerFee - Maker fee rate (default 0.02%)
 * @param takerFee - Taker fee rate (default 0.05%)
 * @returns PnL after deducting entry and exit fees
 */
export function calculatePnLWithFees(
  pnl: number,
  entryPrice: number,
  exitPrice: number,
  units: number,
  _makerFee: number = 0.0002,
  takerFee: number = 0.0005
): number {
  entryPrice = parseFiniteNumber(entryPrice);
  exitPrice = parseFiniteNumber(exitPrice);
  units = parseFiniteNumber(units);

  // Calculate total notional value for fee calculations
  const entryNotional = Math.abs(entryPrice * units);
  const exitNotional = Math.abs(exitPrice * units);

  // Use maker fee for entry and taker fee for exit
  const entryFee = entryNotional * _makerFee;
  const exitFee = exitNotional * takerFee;

  return pnl - entryFee - exitFee;
}

// ============================================================================
// SESSION & CUMULATIVE PnL
// ============================================================================

/**
 * Calculates session P&L by summing all trades.
 * Used for daily/weekly/monthly trading summaries.
 *
 * @param trades - Array of trade objects with direction, entryPrice, exitPrice, units
 * @returns Total PnL from all trades
 */
export function calculateSessionPnL(
  trades: Array<{
    direction: 'long' | 'short';
    entryPrice: number;
    exitPrice: number;
    units: number;
    fees?: number;
  }>
): number {
  return trades.reduce((total, trade) => {
    const basePnL = calculateRealizedPnL(trade.direction, trade.entryPrice, trade.exitPrice, trade.units);
    const fees = parseFiniteNumber(trade.fees);
    return total + basePnL - fees;
  }, 0);
}

/**
 * Calculates cumulative PnL and win rate statistics for a trading session.
 *
 * @param trades - Array of completed trades
 * @returns Object with total PnL, winning trades, losing trades, and win rate
 */
export function calculateSessionStats(
  trades: Array<{
    direction: 'long' | 'short';
    entryPrice: number;
    exitPrice: number;
    units: number;
    fees?: number;
  }>
): {
  totalPnL: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number;
} {
  const winningTrades: number[] = [];
  const losingTrades: number[] = [];

  trades.forEach((trade) => {
    const pnl = calculateRealizedPnL(trade.direction, trade.entryPrice, trade.exitPrice, trade.units) - parseFiniteNumber(trade.fees);
    if (pnl > 0) {
      winningTrades.push(pnl);
    } else if (pnl < 0) {
      losingTrades.push(pnl);
    }
  });

  const totalWins = winningTrades.reduce((a, b) => a + b, 0);
  const totalLosses = Math.abs(losingTrades.reduce((a, b) => a + b, 0));
  const totalPnL = totalWins - totalLosses;
  const winRate = trades.length > 0 ? (winningTrades.length / trades.length) * 100 : 0;

  return {
    totalPnL,
    winningTrades: winningTrades.length,
    losingTrades: losingTrades.length,
    winRate,
    avgWin: winningTrades.length > 0 ? totalWins / winningTrades.length : 0,
    avgLoss: losingTrades.length > 0 ? totalLosses / losingTrades.length : 0,
    profitFactor: totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? Infinity : 0,
  };
}

// ============================================================================
// POSITION TRACKING & PARTIAL EXIT
// ============================================================================

/**
 * Calculates realized PnL from a partial exit.
 *
 * @param direction - 'long' or 'short'
 * @param entryPrice - Original entry price per unit
 * @param exitPrice - Exit price per unit for this batch
 * @param exitUnits - How many units to exit (not total position)
 * @returns Realized PnL from this partial exit
 */
export function calculatePartialExitPnL(
  direction: 'long' | 'short',
  entryPrice: number,
  exitPrice: number,
  exitUnits: number
): number {
  return calculateRealizedPnL(direction, entryPrice, exitPrice, exitUnits);
}

/**
 * Calculates average entry price after multiple entries/pyramiding.
 *
 * @param entries - Array of [units, price] tuples
 * @returns Weighted average entry price
 */
export function calculateAverageEntryPrice(entries: Array<[units: number, price: number]>): number {
  const totalUnits = entries.reduce((sum, [units]) => sum + units, 0);
  if (totalUnits === 0) return 0;

  const totalValue = entries.reduce((sum, [units, price]) => sum + units * price, 0);
  return totalValue / totalUnits;
}

/**
 * Calculates unrealized PnL for a position with multiple entries.
 *
 * @param direction - 'long' or 'short'
 * @param entries - Array of [units, price] tuples
 * @param currentPrice - Current market price
 * @returns Total unrealized PnL
 */
export function calculateMultiEntryUnrealizedPnL(
  direction: 'long' | 'short',
  entries: Array<[units: number, price: number]>,
  currentPrice: number
): number {
  const totalUnits = entries.reduce((sum, [units]) => sum + units, 0);
  const avgEntry = calculateAverageEntryPrice(entries);
  return calculateUnrealizedPnL(direction, avgEntry, currentPrice, totalUnits);
}

// ============================================================================
// RISK & RETURN METRICS
// ============================================================================

/**
 * Calculates Risk-to-Reward ratio for a trade.
 *
 * @param entryPrice - Entry price per unit
 * @param stopPrice - Stop loss price per unit
 * @param targetPrice - Take profit price per unit
 * @param direction - 'long' or 'short'
 * @returns Risk:Reward ratio (e.g., 1:2)
 */
export function calculateRiskRewardRatio(
  entryPrice: number,
  stopPrice: number,
  targetPrice: number,
  _direction: 'long' | 'short'
): number {
  entryPrice = parseFiniteNumber(entryPrice);
  stopPrice = parseFiniteNumber(stopPrice);
  targetPrice = parseFiniteNumber(targetPrice);

  const risk = Math.abs(entryPrice - stopPrice);
  const reward = Math.abs(targetPrice - entryPrice);

  if (risk === 0) return 0;
  return reward / risk;
}

/**
 * Calculates expected value (EV) of a trading strategy.
 *
 * @param winRate - Win rate as decimal (0-1)
 * @param avgWin - Average winning trade PnL
 * @param avgLoss - Average losing trade PnL (negative)
 * @returns Expected value per trade
 */
export function calculateExpectedValue(winRate: number, avgWin: number, avgLoss: number): number {
  return winRate * avgWin + (1 - winRate) * avgLoss;
}

// ============================================================================
// RETURN CALCULATIONS
// ============================================================================

/**
 * Calculates percentage return on a position.
 *
 * @param pnl - Profit or loss amount
 * @param capital - Capital invested (entry price × units)
 * @returns Return percentage (e.g., 5 for 5%)
 */
export function calculateReturnPercent(pnl: number, capital: number): number {
  if (capital === 0) return 0;
  return (pnl / capital) * 100;
}

/**
 * Calculates return as a multiple of risk (R-multiple).
 *
 * @param pnl - Profit or loss amount
 * @param riskAmount - Amount at risk per trade
 * @returns Number of Rs (e.g., 2 for 2R)
 */
export function calculateRMultiple(pnl: number, riskAmount: number): number {
  if (riskAmount === 0) return 0;
  return pnl / riskAmount;
}

// ============================================================================
// ACCOUNT & DRAWDOWN CALCULATIONS
// ============================================================================

/**
 * Calculates maximum drawdown from an account balance history.
 *
 * @param balances - Array of account balances over time (chronological)
 * @returns Maximum drawdown as percentage (e.g., 10 for 10%)
 */
export function calculateMaxDrawdown(balances: number[]): number {
  if (balances.length === 0) return 0;

  let maxBalance = balances[0];
  let maxDrawdown = 0;

  for (const balance of balances) {
    if (balance > maxBalance) {
      maxBalance = balance;
    } else {
      const drawdown = ((maxBalance - balance) / maxBalance) * 100;
      maxDrawdown = Math.max(maxDrawdown, drawdown);
    }
  }

  return maxDrawdown;
}

/**
 * Calculates recovery factor (Total PnL / Max Drawdown).
 * Higher values indicate more efficient strategies.
 *
 * @param totalPnL - Total cumulative profit or loss
 * @param maxDrawdownPercent - Maximum drawdown as percentage
 * @returns Recovery factor
 */
export function calculateRecoveryFactor(totalPnL: number, maxDrawdownPercent: number): number {
  if (maxDrawdownPercent === 0) return totalPnL > 0 ? Infinity : 0;
  return totalPnL / maxDrawdownPercent;
}

/**
 * Calculates Sharpe ratio approximation (simple version).
 * For production, use a dedicated stats library.
 *
 * @param returns - Array of returns (in percentage or decimals)
 * @param riskFreeRate - Risk-free rate (usually 0 or small value)
 * @returns Sharpe ratio
 */
export function calculateSharpeRatio(returns: number[], riskFreeRate: number = 0): number {
  if (returns.length < 2) return 0;

  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / (returns.length - 1);
  const stdDev = Math.sqrt(variance);

  if (stdDev === 0) return 0;
  return (mean - riskFreeRate) / stdDev;
}
