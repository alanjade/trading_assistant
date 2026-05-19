/**
 * Store Selectors
 * Memoized selectors to prevent unnecessary re-renders and improve performance.
 * Each selector extracts a specific slice of state needed by UI surfaces.
 */

import { useShallow } from 'zustand/react/shallow';
import { useStore } from './store';

// ─────────────────────────────────────────────────────────────────────────────
// Chart Surface Selectors
// ─────────────────────────────────────────────────────────────────────────────

export const useChartSymbol = () => useStore((state) => state.sym);

export const useChartTimeframe = () => useStore((state) => state.tf);

export const useChartCandles = () => useStore((state) => state.candles);

export const useChartConnectionStatus = () =>
  useStore(
    useShallow((state) => ({
      status: state.connStatus,
      label: state.connLabel,
    }))
  );

export const useChartIndicators = () =>
  useStore(
    useShallow((state) => ({
      e9s: state.e9s,
      e20s: state.e20s,
      e50s: state.e50s,
      rsiVals: state.rsiVals,
      stochRsiK: state.stochRsiK,
      stochRsiD: state.stochRsiD,
      macdLine: state.macdLine,
      macdSignal: state.macdSignal,
      macdHist: state.macdHist,
      bbUpper: state.bbUpper,
      bbMiddle: state.bbMiddle,
      bbLower: state.bbLower,
      stVals: state.stVals,
      stBull: state.stBull,
      psarVals: state.psarVals,
      adxVals: state.adxVals,
      plusDI: state.plusDI,
      minusDI: state.minusDI,
      obvVals: state.obvVals,
      willRVals: state.willRVals,
      cciVals: state.cciVals,
      vwapVals: state.vwapVals,
      vwapUpper1: state.vwapUpper1,
      vwapLower1: state.vwapLower1,
      vwapUpper2: state.vwapUpper2,
      vwapLower2: state.vwapLower2,
      cvdBarDeltas: state.cvdBarDeltas,
      cvdCumDeltas: state.cvdCumDeltas,
      atrVals: state.atrVals,
    }))
  );

export const useChartPrice = () =>
  useStore(
    useShallow((state) => ({
      livePrice: state.livePrice,
      prevLivePrice: state.prevLivePrice,
      openPrice: state.openPrice,
    }))
  );

export const useChartSuggestion = () =>
  useStore(
    useShallow((state) => ({
      suggestion: state.suggestion,
      entryQuality: state.entryQuality,
    }))
  );

export const useChartPatterns = () => useStore((state) => state.patterns);

export const useChartCrossovers = () => useStore((state) => state.crossovers);

export const useChartPriceAlerts = () => useStore((state) => state.priceAlerts);

export const useChartDrawings = () => useStore((state) => state.chartDrawings);

export const useChartTrail = () =>
  useStore(
    useShallow((state) => ({
      active: state.atrTrailActive,
      price: state.trailingStopPrice,
    }))
  );

// ─────────────────────────────────────────────────────────────────────────────
// Calculator Surface Selectors
// ─────────────────────────────────────────────────────────────────────────────

export const useCalcInputs = () =>
  useStore(
    useShallow((state) => ({
      currentDir: state.currentDir,
      rrRatio: state.rrRatio,
      entryPrice: state.entryPrice,
      stopPrice: state.stopPrice,
      sizeUsd: state.sizeUsd,
      tokens: state.tokens,
      leverage: state.leverage,
      feeType: state.feeType,
      capital: state.capital,
      goalPct: state.goalPct,
      margin: state.margin,
    }))
  );

export const useCalcActions = () =>
  useStore(
    useShallow((state) => ({
      setCurrentDir: state.setCurrentDir,
      setRrRatio: state.setRrRatio,
      setEntryPrice: state.setEntryPrice,
      setStopPrice: state.setStopPrice,
      setSizeUsd: state.setSizeUsd,
      setTokens: state.setTokens,
      setLeverage: state.setLeverage,
      setFeeType: state.setFeeType,
      setCapital: state.setCapital,
      setGoalPct: state.setGoalPct,
      setMargin: state.setMargin,
      applySuggestionToCalc: state.applySuggestionToCalc,
    }))
  );

export const useCalcSessionTrades = () =>
  useStore(
    useShallow((state) => ({
      trades: state.sessionTrades,
      pnl: state.sessionPnL,
    }))
  );

export const useCalcSessionActions = () =>
  useStore(
    useShallow((state) => ({
      addSessionTrade: state.addSessionTrade,
      clearSessionTrades: state.clearSessionTrades,
    }))
  );

// ─────────────────────────────────────────────────────────────────────────────
// Journal Surface Selectors
// ─────────────────────────────────────────────────────────────────────────────

export const useJournalTrades = () => useStore((state) => state.trades);

export const useJournalActions = () =>
  useStore(
    useShallow((state) => ({
      addTrade: state.addTrade,
      updateTrade: state.updateTrade,
      deleteTrade: state.deleteTrade,
      importTradesCsv: state.importTradesCsv,
      exportTradesCsv: state.exportTradesCsv,
      hydrateTradesFromIdb: state.hydrateTradesFromIdb,
    }))
  );

export const useJournalPaperAccount = () =>
  useStore(
    useShallow((state) => ({
      balance: state.paperAccount.balance,
      startBalance: state.paperAccount.startBalance,
      totalPnl: state.paperAccount.totalPnl,
      winCount: state.paperAccount.winCount,
      lossCount: state.paperAccount.lossCount,
      openPositions: state.paperAccount.openPositions,
      closedPositions: state.paperAccount.closedPositions,
    }))
  );

export const useJournalPaperActions = () =>
  useStore(
    useShallow((state) => ({
      openPaperPos: state.openPaperPos,
      closePaperPos: state.closePaperPos,
      tickPaperPositions: state.tickPaperPositions,
      resetPaperAccount: state.resetPaperAccount,
      updatePaperNote: state.updatePaperNote,
    }))
  );

// ─────────────────────────────────────────────────────────────────────────────
// Strategy Surface Selectors
// ─────────────────────────────────────────────────────────────────────────────

export const useStrategyList = () => useStore((state) => state.strategies);

export const useActiveStrategy = () =>
  useStore(
    useShallow((state) => ({
      id: state.activeStrategyId,
      signal: state.strategySignal,
      active: state.strategies.find((s) => s.id === state.activeStrategyId),
    }))
  );

export const useStrategyActions = () =>
  useStore(
    useShallow((state) => ({
      addStrategy: state.addStrategy,
      updateStrategy: state.updateStrategy,
      deleteStrategy: state.deleteStrategy,
      setActiveStrategy: state.setActiveStrategy,
      evalActiveStrategy: state.evalActiveStrategy,
      exportStrategy: state.exportStrategy,
      importStrategy: state.importStrategy,
      duplicateStrategy: state.duplicateStrategy,
      toggleStrategyEnabled: state.toggleStrategyEnabled,
    }))
  );

// ─────────────────────────────────────────────────────────────────────────────
// Settings Surface Selectors
// ─────────────────────────────────────────────────────────────────────────────

export const useSettingsTheme = () => useStore((state) => state.theme);

export const useSettingsActiveIndicators = () => useStore((state) => state.activeIndicators);

export const useSettingsIndicatorParams = () => useStore((state) => state.indicatorParams);

export const useSettingsAtrTrail = () =>
  useStore(
    useShallow((state) => ({
      multiplier: state.atrTrailMult,
    }))
  );

export const useSettingsDailyLoss = () =>
  useStore(
    useShallow((state) => ({
      maxUsd: state.maxDailyLossUsd,
      bannerDismissed: state.dailyLossBannerDismissed,
    }))
  );

export const useSettingsAudio = () =>
  useStore(
    useShallow((state) => ({
      soundEnabled: state.soundEnabled,
      notifEnabled: state.notifEnabled,
    }))
  );

export const useSettingsActions = () =>
  useStore(
    useShallow((state) => ({
      setSettings: state.setSettings,
      toggleIndicator: state.toggleIndicator,
      setIndicatorParam: state.setIndicatorParam,
      resetIndicatorParams: state.resetIndicatorParams,
      setChartDrawings: state.setChartDrawings,
      setSoundEnabled: state.setSoundEnabled,
      setNotifEnabled: state.setNotifEnabled,
      setAtrTrailMult: state.setAtrTrailMult,
      setMaxDailyLossUsd: state.setMaxDailyLossUsd,
      setDailyLossBannerDismissed: state.setDailyLossBannerDismissed,
    }))
  );

// ─────────────────────────────────────────────────────────────────────────────
// Tab Navigation Selector
// ─────────────────────────────────────────────────────────────────────────────

export const useActiveTab = () => useStore((state) => state.activeTab);

export const useSetActiveTab = () => useStore((state) => state.setActiveTab);

// ─────────────────────────────────────────────────────────────────────────────
// Backtesting Selectors
// ─────────────────────────────────────────────────────────────────────────────

export const useBacktestState = () =>
  useStore(
    useShallow((state) => ({
      result: state.backtestResult,
      running: state.backtestRunning,
      setResult: state.setBacktestResult,
      setRunning: state.setBacktestRunning,
    }))
  );

// ─────────────────────────────────────────────────────────────────────────────
// Partial TP Selectors
// ─────────────────────────────────────────────────────────────────────────────

export const usePartialTPs = () => useStore((state) => state.partialTPs);

export const usePartialTPActions = () =>
  useStore(
    useShallow((state) => ({
      setPartialTPs: state.setPartialTPs,
      toggleTPHit: state.toggleTPHit,
    }))
  );
