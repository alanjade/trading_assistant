// ─────────────────────────────────────────────────────────────────────────────
//  Chart Slice
//  Technical analysis, price data, indicators, and paper trading
// ─────────────────────────────────────────────────────────────────────────────

import type { BacktestResult } from '../../backtestTypes';
import type { Candle } from '../../indicators';
import {
  calcADX,
  calcATR,
  calcBB,
  calcCCI,
  calcCVD,
  calcMACD,
  calcOBV,
  calcPSAR,
  calcSuperTrend,
  calcVWAP,
  calcWilderRSI,
  calcWilliamsR,
  computeSuggestion,
  detectPatterns,
  emaK,
  scoreEntryQuality,
  updEMA,
} from '../../indicators';
import { calcAutoFibo, fiboEntryScore } from '../../indicators2';
import type { PaperAccount, PaperPosition } from '../../paperTrading';
import { tickPosition } from '../../paperTrading';
import type { Drawing } from '../../drawingTools';
import { computeAtrTrail, fireNotification, playAlertSound } from '../helpers';
import { getIndicatorState, resetIndicatorState } from '../module-indicators';
import type { ChartSlice, ChartSliceCreator, ConnStatus, PartialTP, PriceAlert, SessionTrade, StoreState } from '../types';
import type { StateCreator } from 'zustand';

const defaultPaperAccount: PaperAccount = {
  balance: 10_000,
  startBalance: 10_000,
  totalPnl: 0,
  winCount: 0,
  lossCount: 0,
  openPositions: [],
  closedPositions: [],
};

function makeDefaultChartSlice(): ChartSlice {
  return {
    sym: 'BTCUSDT',
    tf: '5m',
    candles: [],
    e9s: [],
    e20s: [],
    e50s: [],
    e9: null,
    e20: null,
    e50: null,
    rsiVals: [],
    stochRsiK: [],
    stochRsiD: [],
    macdLine: [],
    macdSignal: [],
    macdHist: [],
    bbUpper: [],
    bbMiddle: [],
    bbLower: [],
    bbWidth: [],
    bbPct: [],
    atrVals: [],
    stVals: [],
    stBull: [],
    adxVals: [],
    plusDI: [],
    minusDI: [],
    obvVals: [],
    willRVals: [],
    cciVals: [],
    psarVals: [],
    psarBull: [],
    vwapVals: [],
    vwapUpper1: [],
    vwapLower1: [],
    vwapUpper2: [],
    vwapLower2: [],
    cvdBarDeltas: [],
    cvdCumDeltas: [],
    patterns: [],
    crossovers: [],
    livePrice: 0,
    prevLivePrice: 0,
    openPrice: 0,
    currentCandle: null,
    lastCandleTime: 0,
    connStatus: 'idle',
    connLabel: 'Connecting…',
    suggestion: null,
    entryQuality: null,
    partialTPs: [],
    atrTrailActive: false,
    trailingStopPrice: null,
    sessionTrades: [],
    sessionPnL: 0,
    maxDailyLossUsd: 0,
    dailyLossBannerDismissed: false,
    priceAlerts: [],
    backtestResult: null,
    backtestRunning: false,
    paperAccount: { ...defaultPaperAccount },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
//  Slice Creator - Part 1: Setup and Symbol/Timeframe Changes
// ─────────────────────────────────────────────────────────────────────────────

export const createChartSlice: StateCreator<StoreState, [], [], ChartSliceCreator> = (set, get) => ({
  ...makeDefaultChartSlice(),

  setSym: (sym: string) =>
    set((s: StoreState) => {
      resetIndicatorState();
      return { ...makeDefaultChartSlice(), sym, tf: s.tf, paperAccount: s.paperAccount };
    }),

  setTf: (tf: string) =>
    set((s: StoreState) => {
      resetIndicatorState();
      return { ...makeDefaultChartSlice(), sym: s.sym, tf, paperAccount: s.paperAccount };
    }),

  resetChartState: () => {
    resetIndicatorState();
    set((s: StoreState) => ({
      ...makeDefaultChartSlice(),
      sym: s.sym,
      tf: s.tf,
      paperAccount: s.paperAccount,
    }));
  },

  setCurrentCandle: (c: Candle | null) => {
    if (!c) return set({ currentCandle: null });
    set({ currentCandle: c });
  },

  setConnStatus: (connStatus: ConnStatus, connLabel: string) => set({ connStatus, connLabel }),

  // ─────────────────────────────────────────────────────────────────────────────
  //  Core Indicator Update: addCandleToState
  //  This is the most critical and complex action
  // ─────────────────────────────────────────────────────────────────────────────

  addCandleToState: (c: Candle) => {
    const s = get();
    const p = s.indicatorParams;
    const prev = s.candles[s.candles.length - 1] ?? null;
    const ind = getIndicatorState();

    // EMA calculations
    const prevE9 = ind.e9;
    const newE9 = updEMA(ind.e9, c.c, emaK(p.ema9Period));
    const newE20 = updEMA(ind.e20, c.c, emaK(p.ema20Period));
    const newE50 = updEMA(ind.e50, c.c, emaK(p.ema50Period));

    // Indicator calculations
    const rsiState = { ...ind.rsiState };
    const rsiVal = calcWilderRSI(c.c, ind.prevClose, rsiState, p.rsiPeriod);
    const macdState = { ...ind.macdState };
    const {
      macdLine,
      signalLine: macdSig,
      histogram: macdH,
    } = calcMACD(c.c, macdState, p.macdFast, p.macdSlow, p.macdSignal);
    const bbState = { closes: [...ind.bbState.closes] };
    const {
      upper: bbU,
      middle: bbM,
      lower: bbL,
      width: bbW,
      pct: bbP,
    } = calcBB(c.c, bbState, p.bbPeriod, p.bbStdDev);
    const atrState = {
      prevClose: ind.atrState.prevClose,
      atr: ind.atrState.atr,
      seed: [...ind.atrState.seed],
    };
    const atrVal = calcATR(c, atrState, p.atrPeriod);
    const stState = {
      atrState: {
        prevClose: ind.stState.atrState.prevClose,
        atr: ind.stState.atrState.atr,
        seed: [...ind.stState.atrState.seed],
      },
      upperBand: ind.stState.upperBand,
      lowerBand: ind.stState.lowerBand,
      superTrend: ind.stState.superTrend,
      direction: ind.stState.direction,
    };
    const { value: stVal, bull: stB } = calcSuperTrend(c, stState, p.stPeriod, p.stMultiplier);
    const adxState = {
      prevHigh: ind.adxState.prevHigh,
      prevLow: ind.adxState.prevLow,
      prevClose: ind.adxState.prevClose,
      atr: { ...ind.adxState.atr, seed: [...ind.adxState.atr.seed] },
      plusDM: ind.adxState.plusDM,
      minusDM: ind.adxState.minusDM,
      adx: ind.adxState.adx,
      seedTR: [...ind.adxState.seedTR],
      seedPlus: [...ind.adxState.seedPlus],
      seedMinus: [...ind.adxState.seedMinus],
      seedDX: [...ind.adxState.seedDX],
    };
    const { adx: adxVal, plusDI: pDI, minusDI: mDI } = calcADX(c, adxState, p.adxPeriod);
    const obvState = { ...ind.obvState };
    const obvVal = calcOBV(c, obvState);
    const willRState = { highs: [...ind.willRState.highs], lows: [...ind.willRState.lows] };
    const willRVal = calcWilliamsR(c, willRState, p.williamsRPeriod);
    const cciState = { typicals: [...ind.cciState.typicals] };
    const cciVal = calcCCI(c, cciState, p.cciPeriod);
    const psarState = { ...ind.psarState };
    const { value: psarVal, bull: psarB } = calcPSAR(c, psarState, p.psarStep, p.psarMax);
    const vwapState = { ...ind.vwapState };
    const {
      vwap: vwapV,
      upper1: vu1,
      lower1: vl1,
      upper2: vu2,
      lower2: vl2,
    } = calcVWAP(c, vwapState);
    const cvdState = { ...ind.cvdState };
    const { barDelta, cumDelta } = calcCVD(c, cvdState);
    const candlePatterns = detectPatterns(c, prev);

    // Update module-level state
    ind.e9 = newE9;
    ind.e20 = newE20;
    ind.e50 = newE50;
    ind.prevClose = c.c;
    ind.rsiState = rsiState;
    ind.macdState = macdState;
    ind.bbState = bbState;
    ind.atrState = atrState;
    ind.stState = stState;
    ind.adxState = adxState;
    ind.obvState = obvState;
    ind.willRState = willRState;
    ind.cciState = cciState;
    ind.psarState = psarState;
    ind.vwapState = vwapState;
    ind.cvdState = cvdState;

    // Check for EMA crossovers
    let newCrossovers = [...s.crossovers];
    if (prevE9 !== null && ind.e20 !== null) {
      const bull = prevE9 <= ind.e20 && newE9 > newE20;
      const bear = prevE9 >= ind.e20 && newE9 < newE20;
      if (bull || bear) {
        newCrossovers.push({
          type: bull ? 'bull' : 'bear',
          price: c.c,
          idx: s.candles.length,
          time: Date.now(),
        });
        if (newCrossovers.length > 8) newCrossovers.shift();
        if (s.soundEnabled) playAlertSound('crossover');
      }
    }

    // Build array updates
    const push = <T>(arr: T[], val: T) => [...arr, val];
    let nC = push(s.candles, c),
      nE9 = push(s.e9s, newE9),
      nE20 = push(s.e20s, newE20),
      nE50 = push(s.e50s, newE50);
    let nR = push(s.rsiVals, rsiVal),
      nML = push(s.macdLine, macdLine),
      nMS = push(s.macdSignal, macdSig),
      nMH = push(s.macdHist, macdH);
    let nBU = push(s.bbUpper, bbU),
      nBM = push(s.bbMiddle, bbM),
      nBL = push(s.bbLower, bbL),
      nBW = push(s.bbWidth, bbW),
      nBP = push(s.bbPct, bbP);
    let nA = push(s.atrVals, atrVal),
      nSV = push(s.stVals, stVal),
      nSB = push(s.stBull, stB);
    let nAD = push(s.adxVals, adxVal),
      nPD = push(s.plusDI, pDI),
      nMD = push(s.minusDI, mDI);
    let nOB = push(s.obvVals, obvVal),
      nWR = push(s.willRVals, willRVal);
    let nCCI = push(s.cciVals, cciVal);
    let nPV = push(s.psarVals, psarVal),
      nPB = push(s.psarBull, psarB);
    let nVW = push(s.vwapVals, vwapV),
      nVU1 = push(s.vwapUpper1, vu1),
      nVL1 = push(s.vwapLower1, vl1),
      nVU2 = push(s.vwapUpper2, vu2),
      nVL2 = push(s.vwapLower2, vl2);
    let nCB = push(s.cvdBarDeltas, barDelta),
      nCvdCumDeltas = push(s.cvdCumDeltas, cumDelta);
    let nPat = push(s.patterns, candlePatterns);

    // Stochastic RSI (smoothed K and D)
    const srPeriod = p.stochRsiPeriod;
    const stochKRaw = nR.map((_, i) => {
      const win = nR
        .slice(Math.max(0, i - srPeriod + 1), i + 1)
        .filter((v) => v !== null) as number[];
      if (win.length < srPeriod) return null;
      const lo = Math.min(...win),
        hi = Math.max(...win),
        cur = nR[i] as number;
      return hi === lo ? 50 : ((cur - lo) / (hi - lo)) * 100;
    });
    const smoothK = stochKRaw.map((_, i) => {
      const w = stochKRaw.slice(Math.max(0, i - 2), i + 1).filter((v) => v !== null) as number[];
      return w.length === 3 ? w.reduce((a, b) => a + b, 0) / 3 : null;
    });
    const smoothD = smoothK.map((_, i) => {
      const w = smoothK.slice(Math.max(0, i - 2), i + 1).filter((v) => v !== null) as number[];
      return w.length === 3 ? w.reduce((a, b) => a + b, 0) / 3 : null;
    });
    let nSK = [...s.stochRsiK, smoothK[smoothK.length - 1] ?? null];
    let nSD = [...s.stochRsiD, smoothD[smoothD.length - 1] ?? null];

    // Trim to 200 candles max
    if (nC.length > 200) {
      nC.shift();
      nE9.shift();
      nE20.shift();
      nE50.shift();
      nR.shift();
      nML.shift();
      nMS.shift();
      nMH.shift();
      nBU.shift();
      nBM.shift();
      nBL.shift();
      nBW.shift();
      nBP.shift();
      nA.shift();
      nSV.shift();
      nSB.shift();
      nAD.shift();
      nPD.shift();
      nMD.shift();
      nOB.shift();
      nWR.shift();
      nCCI.shift();
      nPV.shift();
      nPB.shift();
      nVW.shift();
      nVU1.shift();
      nVL1.shift();
      nVU2.shift();
      nVL2.shift();
      nCB.shift();
      nCvdCumDeltas.shift();
      nPat.shift();
      nSK.shift();
      nSD.shift();
      newCrossovers = newCrossovers
        .map((x) => ({ ...x, idx: x.idx - 1 }))
        .filter((x) => x.idx >= 0);
    }

    set({
      candles: nC,
      e9s: nE9,
      e20s: nE20,
      e50s: nE50,
      e9: newE9,
      e20: newE20,
      e50: newE50,
      rsiVals: nR,
      stochRsiK: nSK,
      stochRsiD: nSD,
      macdLine: nML,
      macdSignal: nMS,
      macdHist: nMH,
      bbUpper: nBU,
      bbMiddle: nBM,
      bbLower: nBL,
      bbWidth: nBW,
      bbPct: nBP,
      atrVals: nA,
      stVals: nSV,
      stBull: nSB,
      adxVals: nAD,
      plusDI: nPD,
      minusDI: nMD,
      obvVals: nOB,
      willRVals: nWR,
      cciVals: nCCI,
      psarVals: nPV,
      psarBull: nPB,
      vwapVals: nVW,
      vwapUpper1: nVU1,
      vwapLower1: nVL1,
      vwapUpper2: nVU2,
      vwapLower2: nVL2,
      cvdBarDeltas: nCB,
      cvdCumDeltas: nCvdCumDeltas,
      patterns: nPat,
      crossovers: newCrossovers,
    });
  },

  setLivePrice: (price: number, _apiName: string) => {
    const s = get();
    const tf = s.tf;
    const prev = s.livePrice;
    const cur = s.currentCandle;
    const now = Date.now();
    if (!cur) {
      set({
        currentCandle: { o: price, h: price, l: price, c: price, v: 500, t: now },
        lastCandleTime: now,
        livePrice: price,
        prevLivePrice: prev,
      });
    } else {
      set({
        currentCandle: {
          ...cur,
          c: price,
          h: Math.max(cur.h, price),
          l: Math.min(cur.l, price),
          v: cur.v + 50 + Math.random() * 200,
        },
        livePrice: price,
        prevLivePrice: prev,
      });
    }

    const intervalMap: Record<string, number> = {
      '1m': 60000,
      '5m': 300000,
      '15m': 900000,
      '1h': 3600000,
      '4h': 14400000,
      '1d': 86400000,
    };
    const interval = intervalMap[tf] ?? 300000;
    if (now - get().lastCandleTime >= interval) {
      const fin = get().currentCandle;
      if (fin) get().addCandleToState({ ...fin });
      set({
        currentCandle: { o: price, h: price, l: price, c: price, v: 500, t: now },
        lastCandleTime: now,
      });
    }

    // Price alerts
    const alerts = get().priceAlerts;
    if (alerts.length) {
      const sym = get().sym;
      const upd = alerts.map((a: PriceAlert) => {
        if (a.triggered || a.sym !== sym) return a;
        const hit = a.dir === 'above' ? price >= a.price : price <= a.price;
        if (hit) {
          if (get().soundEnabled) playAlertSound('alert');
          if (get().notifEnabled)
            fireNotification(`🔔 ${a.sym}`, `${a.label || a.dir} ${a.price} hit`);
          return { ...a, triggered: true };
        }
        return a;
      });
      if (upd.some((a: PriceAlert, i: number) => a.triggered !== alerts[i].triggered))
        set({ priceAlerts: upd });
    }

    // ATR trail ratchet
    const st = get();
    if (st.atrTrailActive) {
      const newTrail = computeAtrTrail(price, st.suggestion, st.atrVals, st.atrTrailMult);
      if (newTrail !== null) {
        const p2 = st.trailingStopPrice;
        const dir = st.suggestion?.dir ?? 'long';
        set({
          trailingStopPrice:
            p2 === null
              ? newTrail
              : dir === 'long'
                ? Math.max(p2, newTrail)
                : Math.min(p2, newTrail),
        });
      }
    }

    get().refreshSuggestion();
  },

  refreshSuggestion: () => {
    const s = get();
    if (!s.e9 || !s.e20 || !s.e50 || s.candles.length < 20) return;
    const rsi = (s.rsiVals.filter((v: number | null) => v !== null) as number[]).slice(-1)[0] ?? 50;
    const sug = computeSuggestion(s.e9, s.e20, s.e50, s.livePrice, rsi, s.candles, s.rrRatio);
    const fibo = calcAutoFibo(s.candles, 50);
    const lastAtr = s.atrVals.length ? s.atrVals[s.atrVals.length - 1] : null;
    const { bonus } = fiboEntryScore(s.livePrice, fibo, lastAtr);
    const q = scoreEntryQuality(sug.dir, rsi, s.e9, s.e20, s.e50, s.livePrice, s.crossovers, bonus);
    set({ suggestion: sug, entryQuality: q });
    get().evalActiveStrategy();
  },

  // ─────────────────────────────────────────────────────────────────────────────
  //  Partial Take-Profits Management
  // ─────────────────────────────────────────────────────────────────────────────

  setPartialTPs: (tps: PartialTP[]) => set({ partialTPs: tps }),

  toggleTPHit: (idx: number) =>
    set((s: StoreState) => ({
      partialTPs: s.partialTPs.map((t: PartialTP, i: number) =>
        i === idx ? { ...t, hit: !t.hit } : t
      ),
    })),

  // ─────────────────────────────────────────────────────────────────────────────
  //  ATR Trailing Stop Management
  // ─────────────────────────────────────────────────────────────────────────────

  setAtrTrailMult: (v: number) => set({ atrTrailMult: v, trailingStopPrice: null }),

  setAtrTrailActive: (v: boolean) => {
    set({ atrTrailActive: v });
    if (!v) set({ trailingStopPrice: null });
  },

  // ─────────────────────────────────────────────────────────────────────────────
  //  Session Trading
  // ─────────────────────────────────────────────────────────────────────────────

  addSessionTrade: (t: Omit<SessionTrade, 'id' | 'time'>) =>
    set((s: StoreState) => {
      const id = Date.now().toString(36) + Math.random().toString(36).slice(2);
      const trade: SessionTrade = { ...t, id, time: Date.now() };
      const trades = [...s.sessionTrades, trade];
      return { sessionTrades: trades, sessionPnL: trades.reduce((a, x) => a + x.pnl, 0) };
    }),

  clearSessionTrades: () =>
    set({ sessionTrades: [], sessionPnL: 0, dailyLossBannerDismissed: false }),

  setMaxDailyLossUsd: (v: number) => set({ maxDailyLossUsd: v }),

  setDailyLossBannerDismissed: (v: boolean) => set({ dailyLossBannerDismissed: v }),

  // ─────────────────────────────────────────────────────────────────────────────
  //  Price Alerts
  // ─────────────────────────────────────────────────────────────────────────────

  addPriceAlert: (a: Omit<PriceAlert, 'id' | 'triggered' | 'createdAt'>) => {
    if (typeof window !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission();
    }
    set((s: StoreState) => ({
      priceAlerts: [
        ...s.priceAlerts,
        {
          ...a,
          id: Date.now().toString(36) + Math.random().toString(36).slice(2),
          triggered: false,
          createdAt: Date.now(),
        },
      ],
    }));
  },

  removePriceAlert: (id: string) =>
    set((s: StoreState) => ({
      priceAlerts: s.priceAlerts.filter((a: PriceAlert) => a.id !== id),
    })),

  clearTriggeredAlerts: () =>
    set((s: StoreState) => ({
      priceAlerts: s.priceAlerts.filter((a: PriceAlert) => !a.triggered),
    })),

  // ─────────────────────────────────────────────────────────────────────────────
  //  Backtesting
  // ─────────────────────────────────────────────────────────────────────────────

  setBacktestResult: (r: BacktestResult | null) => set({ backtestResult: r }),

  setBacktestRunning: (v: boolean) => set({ backtestRunning: v }),

  // ─────────────────────────────────────────────────────────────────────────────
  //  Paper Trading
  // ─────────────────────────────────────────────────────────────────────────────

  openPaperPos: (pos: PaperPosition) =>
    set((s: StoreState) => ({
      paperAccount: { ...s.paperAccount, openPositions: [...s.paperAccount.openPositions, pos] },
    })),


  closePaperPos: (id: string, price: number, reason: PaperPosition['status']) =>
    set((s: StoreState) => {
      const pos = s.paperAccount.openPositions.find((p: PaperPosition) => p.id === id);
      if (!pos) return s;
      const units = pos.size / pos.entryPrice;
      const isLong = pos.dir === 'long';
      const hitPct = pos.tpLevels
        .filter((t) => t.hit)
        .reduce((acc, t) => acc + t.sizePercent, 0);
      const remainUnits = units * ((100 - hitPct) / 100);
      const closePnl = isLong
        ? (price - pos.entryPrice) * remainUnits
        : (pos.entryPrice - price) * remainUnits;
      const totalPnl = pos.realised + closePnl;
      const isWin = totalPnl > 0;
      const closed: PaperPosition = {
        ...pos,
        status: reason,
        closedAt: Date.now(),
        closePrice: price,
        realised: totalPnl,
      };
      const acc = s.paperAccount;
      return {
        paperAccount: {
          ...acc,
          balance: acc.balance + totalPnl,
          totalPnl: acc.totalPnl + totalPnl,
          winCount: isWin ? acc.winCount + 1 : acc.winCount,
          lossCount: !isWin ? acc.lossCount + 1 : acc.lossCount,
          openPositions: acc.openPositions.filter((p: PaperPosition) => p.id !== id),
          closedPositions: [closed, ...acc.closedPositions].slice(0, 100),
        },
      };
    }),

  tickPaperPositions: (price: number, atr: number | null) => {
    const s = get();
    const acc = s.paperAccount;
    if (!acc.openPositions.length) return;
    let balDelta = 0,
      wins = 0,
      losses = 0;
    const stillOpen: PaperPosition[] = [];
    const newClosed: PaperPosition[] = [];
    for (const pos of acc.openPositions) {
      const r = tickPosition(pos, price, atr);
      balDelta += r.pnlDelta;
      if (r.closed) {
        r.position.realised > 0 ? wins++ : losses++;
        newClosed.push(r.position);
      } else {
        stillOpen.push(r.position);
      }
    }
    // Auto-journal closed positions
    for (const closed of newClosed) {
      const riskPerUnit = Math.abs(closed.entryPrice - closed.initialStop);
      const units = closed.size / closed.entryPrice;
      get().addTrade({
        date: new Date().toISOString().slice(0, 10),
        symbol: closed.sym,
        dir: closed.dir,
        entry: closed.entryPrice,
        stop: closed.initialStop,
        target: closed.tpLevels[0]?.price ?? closed.closePrice ?? closed.entryPrice,
        outcome: closed.realised > 0 ? 'win' : closed.realised < 0 ? 'loss' : 'be',
        pnl: closed.realised,
        notes: `[Paper] ${closed.strategyName} · ${(closed.realised / (riskPerUnit * units) || 0).toFixed(2)}R`,
        tags: [],
        screenshotUrl: '',
      });
    }
    if (balDelta === 0 && newClosed.length === 0) return;
    set({
      paperAccount: {
        ...acc,
        balance: acc.balance + balDelta,
        totalPnl: acc.totalPnl + balDelta,
        winCount: acc.winCount + wins,
        lossCount: acc.lossCount + losses,
        openPositions: stillOpen,
        closedPositions: [...newClosed, ...acc.closedPositions].slice(0, 100),
      },
    });
  },

  resetPaperAccount: (startBalance?: number) => {
    const bal = startBalance ?? get().paperAccount.startBalance;
    set({ paperAccount: { ...defaultPaperAccount, balance: bal, startBalance: bal } });
  },

    updatePaperNote: (id: string, note: string) =>
set((s: StoreState) => ({
        paperAccount: {
          ...s.paperAccount,
          openPositions: s.paperAccount.openPositions.map((p: PaperPosition) =>
            p.id === id ? { ...p, notes: note } : p
          ),
        },
      })),

  // ─────────────────────────────────────────────────────────────────────────────
  //  Chart Drawings (Settings-related but chart state)
  // ─────────────────────────────────────────────────────────────────────────────

  setChartDrawings: (d: Drawing[]) => set({ chartDrawings: d }),
});
