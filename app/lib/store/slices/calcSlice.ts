// ─────────────────────────────────────────────────────────────────────────────
//  Calculator Slice
//  Risk/reward ratio calculator inputs and state
// ─────────────────────────────────────────────────────────────────────────────

import type { CalcSlice, CalcSliceCreator, Suggestion, StoreState } from '../types';
import type { StateCreator } from 'zustand';

const defaultCalc: CalcSlice = {
  activeTab: 'chart',
  currentDir: 'long',
  rrRatio: 2,
  entryPrice: '',
  stopPrice: '',
  sizeUsd: '100',
  tokens: '',
  leverage: 10,
  feeType: 'maker',
  capital: '200',
  goalPct: '10',
  margin: '20',
};

// ─────────────────────────────────────────────────────────────────────────────
//  Slice Creator
// ─────────────────────────────────────────────────────────────────────────────

export const createCalcSlice: StateCreator<StoreState, [], [], CalcSliceCreator> = (set, get) => ({
  ...defaultCalc,

  setActiveTab: (activeTab: 'chart' | 'calc' | 'journal' | 'strategy' | 'screener') =>
    set({ activeTab }),

  setCurrentDir: (currentDir: 'long' | 'short') => set({ currentDir }),

  setRrRatio: (rrRatio: number) => set({ rrRatio }),

  setEntryPrice: (entryPrice: string) => set({ entryPrice }),

  setStopPrice: (stopPrice: string) => set({ stopPrice }),

  setSizeUsd: (sizeUsd: string) => set({ sizeUsd }),

  setTokens: (tokens: string) => set({ tokens }),

  setLeverage: (leverage: number) => set({ leverage }),

  setFeeType: (feeType: 'maker' | 'taker') => set({ feeType }),

  setCapital: (capital: string) => set({ capital }),

  setGoalPct: (goalPct: string) => set({ goalPct }),

  setMargin: (margin: string) => set({ margin }),

  applySuggestionToCalc: () => {
    const state = get() as unknown as { suggestion: Suggestion | null };
    const suggestion = state.suggestion;
    if (!suggestion) return;
    const d = suggestion.entry > 100 ? 2 : 4;
    set({
      activeTab: 'calc',
      currentDir: suggestion.dir,
      entryPrice: suggestion.entry.toFixed(d),
      stopPrice: suggestion.stop.toFixed(d),
    });
  },
});
