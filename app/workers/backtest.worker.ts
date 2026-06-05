/// <reference lib="webworker" />
import { expose } from 'comlink';
import {
  calculateFee,
  calculateFundingPayment,
  resolveBracketExit,
  resolveMarketEntry,
} from '@/features/backtesting/services/orderSimulationService';
import type { BacktestRequest, BacktestResult, BacktestTrade } from '@/lib/backtestTypes';
import type { Candle } from '@/lib/indicators';

// ── Worker message types ───────────────────────────────────────────────────────

export interface BacktestWorkerRequest extends BacktestRequest {}

export interface BacktestWorkerResponse {
  ok: boolean;
  result?: BacktestResult;
  error?: string;
}

// ── Minimal EMA ───────────────────────────────────────────────────────────────

function ema(prev: number | null, val: number, k: number): number {
  return prev === null ? val : val * k + prev * (1 - k);
}

const k9 = 2 / 10;
const k20 = 2 / 21;
const k50 = 2 / 51;
const k12 = 2 / 13;
const k26 = 2 / 27;
const k9s = 2 / 10;

// ── ATR ───────────────────────────────────────────────────────────────────────

function calcATR(candles: Candle[], period: number = 14): number[] {
  const atrs = new Array(candles.length).fill(0);
  let atr: number | null = null;
  const seed: number[] = [];
  let prev: number | null = null;

  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];
    const tr =
      prev === null ? c.h - c.l : Math.max(c.h - c.l, Math.abs(c.h - prev), Math.abs(c.l - prev));
    prev = c.c;

    if (atr === null) {
      seed.push(tr);
      if (seed.length === period) {
        atr = seed.reduce((a, b) => a + b, 0) / period;
      }
    } else {
      atr = (atr * (period - 1) + tr) / period;
    }
    atrs[i] = atr ?? tr;
  }

  return atrs;
}

// ── RSI ───────────────────────────────────────────────────────────────────────

function calcRSI(candles: Candle[], period: number = 14): (number | null)[] {
  const out = new Array(candles.length).fill(null);
  let avgGain: number | null = null;
  let avgLoss: number | null = null;
  const seedG: number[] = [];
  const seedL: number[] = [];

  for (let i = 1; i < candles.length; i++) {
    const ch = candles[i].c - candles[i - 1].c;
    const gain = Math.max(0, ch);
    const loss = Math.max(0, -ch);

    if (avgGain === null) {
      seedG.push(gain);
      seedL.push(loss);
      if (seedG.length === period) {
        avgGain = seedG.reduce((a, b) => a + b, 0) / period;
        avgLoss = seedL.reduce((a, b) => a + b, 0) / period;
        const rs = avgLoss === 0 ? Infinity : avgGain / avgLoss;
        out[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + rs);
      }
    } else {
      avgGain = (avgGain! * (period - 1) + gain) / period;
      avgLoss = (avgLoss! * (period - 1) + loss) / period;
      const rs = avgLoss === 0 ? Infinity : avgGain / avgLoss;
      out[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + rs);
    }
  }

  return out;
}

interface SignalSnapshot {
  dir: 'long' | 'short';
  stop: number;
  tp: number[];
}

// ── Backtest engine ───────────────────────────────────────────────────────────

function runBacktest(req: BacktestWorkerRequest): BacktestResult {
  const { candles, strategy, capital } = req;
  const execution = {
    latencyBars: req.execution?.latencyBars ?? 1,
    slippageBps: req.execution?.slippageBps ?? 2,
    feeRate: req.execution?.feeRate ?? 0.0005,
    fundingRate8h: req.execution?.fundingRate8h ?? 0,
    fundingIntervalHours: req.execution?.fundingIntervalHours ?? 8,
    maxVolumeParticipationPct: req.execution?.maxVolumeParticipationPct ?? 10,
    intrabarPolicy: req.execution?.intrabarPolicy ?? 'conservative',
  } as const;
  const n = candles.length;

  const atrs = calcATR(candles, 14);
  const rsis = calcRSI(candles, 14);

  // EMA series
  const e9s: number[] = [];
  const e20s: number[] = [];
  const e50s: number[] = [];
  const mcdL: number[] = [];
  const mcdS: number[] = [];
  const mcdH: number[] = [];

  let e9v: number | null = null;
  let e20v: number | null = null;
  let e50v: number | null = null;
  let ef: number | null = null;
  let es: number | null = null;
  let esig: number | null = null;

  for (let i = 0; i < n; i++) {
    const c = candles[i].c;
    e9v = ema(e9v, c, k9);
    e20v = ema(e20v, c, k20);
    e50v = ema(e50v, c, k50);
    ef = ema(ef, c, k12);
    es = ema(es, c, k26);
    e9s.push(e9v);
    e20s.push(e20v);
    e50s.push(e50v);

    const ml = ef - es;
    esig = ema(esig, ml, k9s);
    mcdL.push(ml);
    mcdS.push(esig ?? ml);
    mcdH.push(ml - (esig ?? ml));
  }

  function evalSnap(i: number): SignalSnapshot | null {
    if (i < 30) return null;
    if (!e9s[i] || !e20s[i] || !e50s[i] || rsis[i] === null) return null;

    const atr = atrs[i];
    const bull = e9s[i] > e20s[i] && e20s[i] > e50s[i];
    const bear = e9s[i] < e20s[i] && e20s[i] < e50s[i];
    const rsi = rsis[i]!;
    const stopMult = strategy?.stop?.value ?? 2;
    const tp1mult = strategy?.takeProfit?.targets?.[0]?.rrMultiple ?? 1.5;
    const tp2mult = strategy?.takeProfit?.targets?.[1]?.rrMultiple ?? 3;

    if (bull && rsi > 45 && rsi < 70) {
      const stopDist = atr * stopMult;
      const entry = candles[i].c;
      return {
        dir: 'long',
        stop: entry - stopDist,
        tp: [entry + stopDist * tp1mult, entry + stopDist * tp2mult],
      };
    }

    if (bear && rsi < 55 && rsi > 30) {
      const stopDist = atr * stopMult;
      const entry = candles[i].c;
      return {
        dir: 'short',
        stop: entry + stopDist,
        tp: [entry - stopDist * tp1mult, entry - stopDist * tp2mult],
      };
    }

    return null;
  }

  let equity = capital;
  const equityCurve = new Array(n).fill(capital);
  const ddCurve = new Array(n).fill(0);
  let peakEquity = capital;
  const trades: BacktestTrade[] = [];

  let inTrade = false;
  let tradeDir: 'long' | 'short' = 'long';
  let tradeEntry: number = 0;
  let tradeStop: number = 0;
  let tradeTPs: number[] = [];
  let tradeEntryIdx: number = 0;
  let tradeSize: number = 0;
  let tpHits: number = 0;
  let cumulRisk: number = 0;
  let mae: number = 0;
  let mfe: number = 0;
  let trailStop: number | null = null;

  const markToMarket = (candle: Candle): number => {
    if (!inTrade || tradeEntry <= 0 || tradeSize <= 0) return equity;
    const units = tradeSize / tradeEntry;
    const unrealized =
      tradeDir === 'long'
        ? (candle.c - tradeEntry) * units
        : (tradeEntry - candle.c) * units;
    const accruedFunding = calculateFundingPayment({
      direction: tradeDir,
      notional: tradeSize,
      entryTime: candles[tradeEntryIdx]?.t ?? candle.t,
      exitTime: candle.t,
      fundingRate: execution.fundingRate8h,
      intervalHours: execution.fundingIntervalHours,
    });
    return equity + unrealized - accruedFunding;
  };

  for (let i = 1; i < n; i++) {
    const c = candles[i];

    if (!inTrade) {
      const signal = evalSnap(i);
      if (signal) {
        const riskDist = Math.abs(c.c - signal.stop);
        const riskAmt = equity * 0.01;
        const units = riskDist > 0 ? riskAmt / riskDist : 0;
        tradeSize = units * c.c;

        if (tradeSize < 1) continue;

        const entryFill = resolveMarketEntry({
          candles,
          signalIndex: i,
          latencyBars: execution.latencyBars,
          fallbackPrice: c.c,
          direction: signal.dir,
          slippageBps: execution.slippageBps,
          orderNotional: tradeSize,
          maxVolumeParticipationPct: execution.maxVolumeParticipationPct,
        });
        if (!entryFill) continue;
        if (entryFill.fillRatio <= 0) continue;

        inTrade = true;
        tradeDir = signal.dir;
        tradeEntry = entryFill.price;
        tradeStop = signal.stop;
        tradeTPs = signal.tp;
        tpHits = 0;
        tradeEntryIdx = entryFill.index;
        tradeSize = entryFill.filledNotional > 0 ? entryFill.filledNotional : tradeSize;
        cumulRisk = riskDist;
        mae = 0;
        mfe = 0;
        trailStop = null;
        i = entryFill.index;
      }
    } else {
      // MAE / MFE
      const unreal =
        tradeDir === 'long'
          ? ((c.l - tradeEntry) / tradeEntry) * 100
          : ((tradeEntry - c.h) / tradeEntry) * 100;
      const unrFav =
        tradeDir === 'long'
          ? ((c.h - tradeEntry) / tradeEntry) * 100
          : ((tradeEntry - c.l) / tradeEntry) * 100;

      if (unreal < mae) mae = unreal;
      if (unrFav > mfe) mfe = unrFav;

      // ATR trail
      const trailMult = strategy?.stop?.trailValue ?? 1.5;
      const trail =
        tradeDir === 'long' ? c.c - atrs[i] * trailMult : c.c + atrs[i] * trailMult;
      trailStop =
        tradeDir === 'long'
          ? Math.max(trailStop ?? trail, trail)
          : Math.min(trailStop ?? trail, trail);

      const exitFill = resolveBracketExit({
        candle: c,
        direction: tradeDir,
        stopPrice: tradeStop,
        takeProfitPrices: tradeTPs,
        nextTakeProfitIndex: tpHits,
        trailStopPrice: trailStop,
        intrabarPolicy: execution.intrabarPolicy,
        slippageBps: execution.slippageBps,
      });

      if (exitFill !== null) {
        if (exitFill.takeProfitIndex !== undefined) {
          tpHits = exitFill.takeProfitIndex + 1;
        }
        const exitPrice = exitFill.price;
        const units = tradeSize / tradeEntry;
        const grossPnl =
          tradeDir === 'long'
            ? (exitPrice - tradeEntry) * units
            : (tradeEntry - exitPrice) * units;
        const entryFee = calculateFee(tradeSize, execution.feeRate);
        const exitFee = calculateFee(exitPrice * units, execution.feeRate);
        const funding = calculateFundingPayment({
          direction: tradeDir,
          notional: tradeSize,
          entryTime: candles[tradeEntryIdx].t,
          exitTime: c.t,
          fundingRate: execution.fundingRate8h,
          intervalHours: execution.fundingIntervalHours,
        });
        const fees = entryFee + exitFee;
        const pnl = grossPnl - fees - funding;
        const r = cumulRisk > 0 ? pnl / (cumulRisk * units) : 0;

        trades.push({
          dir: tradeDir,
          entryIdx: tradeEntryIdx,
          exitIdx: i,
          entryPrice: tradeEntry,
          exitPrice,
          size: tradeSize,
          pnl,
          pnlPct: (pnl / equity) * 100,
          fees,
          funding,
          r,
          exitReason: exitFill.reason,
          mae,
          mfe,
          entryTime: candles[tradeEntryIdx].t,
          exitTime: c.t,
        });

        equity += pnl;
        inTrade = false;
        trailStop = null;
      }
    }

    const markedEquity = markToMarket(c);
    equityCurve[i] = markedEquity;
    if (markedEquity > peakEquity) peakEquity = markedEquity;
    ddCurve[i] = peakEquity > 0 ? ((peakEquity - markedEquity) / peakEquity) * 100 : 0;
  }

  if (inTrade && n > 0) {
    const exitIdx = n - 1;
    const c = candles[exitIdx];
    const units = tradeSize / tradeEntry;
    const exitPrice = c.c;
    const grossPnl =
      tradeDir === 'long'
        ? (exitPrice - tradeEntry) * units
        : (tradeEntry - exitPrice) * units;
    const entryFee = calculateFee(tradeSize, execution.feeRate);
    const exitFee = calculateFee(exitPrice * units, execution.feeRate);
    const funding = calculateFundingPayment({
      direction: tradeDir,
      notional: tradeSize,
      entryTime: candles[tradeEntryIdx].t,
      exitTime: c.t,
      fundingRate: execution.fundingRate8h,
      intervalHours: execution.fundingIntervalHours,
    });
    const fees = entryFee + exitFee;
    const pnl = grossPnl - fees - funding;
    const r = cumulRisk > 0 ? pnl / (cumulRisk * units) : 0;

    trades.push({
      dir: tradeDir,
      entryIdx: tradeEntryIdx,
      exitIdx,
      entryPrice: tradeEntry,
      exitPrice,
      size: tradeSize,
      pnl,
      pnlPct: (pnl / equity) * 100,
      fees,
      funding,
      r,
      exitReason: 'eod',
      mae,
      mfe,
      entryTime: candles[tradeEntryIdx].t,
      exitTime: c.t,
    });

    equity += pnl;
    equityCurve[exitIdx] = equity;
    if (equity > peakEquity) peakEquity = equity;
    ddCurve[exitIdx] = peakEquity > 0 ? ((peakEquity - equity) / peakEquity) * 100 : 0;
  }

  // ── Metrics ────────────────────────────────────────────────────────────────

  const wins = trades.filter((t) => t.pnl > 0);
  const losses = trades.filter((t) => t.pnl <= 0);
  const grossW = wins.reduce((s, t) => s + t.pnl, 0);
  const grossL = Math.abs(losses.reduce((s, t) => s + t.pnl, 0));

  const profitFactor = grossL > 0 ? grossW / grossL : grossW > 0 ? Infinity : 0;
  const winRate = trades.length > 0 ? wins.length / trades.length : 0;
  const expectancy = trades.length > 0 ? (equity - capital) / trades.length : 0;
  const avgWin = wins.length > 0 ? grossW / wins.length : 0;
  const avgLoss = losses.length > 0 ? grossL / losses.length : 0;
  const avgR = trades.length > 0 ? trades.reduce((s, t) => s + t.r, 0) / trades.length : 0;
  const maxDD = Math.max(...ddCurve, 0);
  const maxDDabs = (peakEquity * maxDD) / 100;

  // Sharpe / Sortino
  const returns: number[] = [];
  for (let i = 1; i < equityCurve.length; i++) {
    if (equityCurve[i - 1] > 0) {
      returns.push((equityCurve[i] - equityCurve[i - 1]) / equityCurve[i - 1]);
    }
  }

  const meanR = returns.length > 0 ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
  const stdR =
    returns.length > 1
      ? Math.sqrt(returns.reduce((a, b) => a + (b - meanR) ** 2, 0) / (returns.length - 1))
      : 0;
  const downDev =
    returns.length > 0
      ? Math.sqrt(returns.filter((r) => r < 0).reduce((a, b) => a + b ** 2, 0) / returns.length)
      : 0;
  const sharpe = stdR > 0 ? (meanR / stdR) * Math.sqrt(365) : 0;
  const sortino = downDev > 0 ? (meanR / downDev) * Math.sqrt(365) : 0;

  // Monthly breakdown
  const monthMap = new Map<string, { month: string; pnl: number; trades: number; wins: number }>();
  for (const t of trades) {
    const d = new Date(t.entryTime);
    const k = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    const m = monthMap.get(k) ?? { month: k, pnl: 0, trades: 0, wins: 0 };
    m.pnl += t.pnl;
    m.trades++;
    if (t.pnl > 0) m.wins++;
    monthMap.set(k, m);
  }

  return {
    trades,
    equity: equityCurve,
    drawdown: ddCurve,
    totalPnl: equity - capital,
    totalPnlPct: ((equity - capital) / capital) * 100,
    winRate,
    profitFactor,
    sharpe,
    sortino,
    maxDrawdown: maxDDabs,
    maxDrawdownPct: maxDD,
    expectancy,
    avgWin,
    avgLoss,
    avgR,
    totalTrades: trades.length,
    wins: wins.length,
    losses: losses.length,
    monthly: [...monthMap.values()].sort((a, b) => a.month.localeCompare(b.month)),
    maeArr: trades.map((t) => t.mae),
    mfeArr: trades.map((t) => t.mfe),
    rArr: trades.map((t) => t.r),
  };
}

// ── Worker message handler ─────────────────────────────────────────────────────

const BacktestWorker = {
  async runBacktest(req: BacktestWorkerRequest): Promise<BacktestResult> {
    return runBacktest(req);
  },
};

expose(BacktestWorker);
