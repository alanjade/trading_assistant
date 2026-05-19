// ─────────────────────────────────────────────────────────────────────────────
//  Strategy Slice
//  Trading strategy management and evaluation
// ─────────────────────────────────────────────────────────────────────────────

import type { Strategy } from '../../strategy';
import type { Candle } from '../../indicators';
import { buildSnapshot, evaluateStrategy, PRESET_STRATEGIES } from '../../strategy';
import { makeId } from '../helpers';
import type { StrategySlice, StoreState, StrategySliceCreator } from '../types';
import type { StateCreator } from 'zustand';

const defaultStrategy: StrategySlice = {
  strategies: [],
  activeStrategyId: 'preset-3ema',
  strategySignal: null,
};

// ─────────────────────────────────────────────────────────────────────────────
//  Slice Creator
// ─────────────────────────────────────────────────────────────────────────────

export const createStrategySlice: StateCreator<StoreState, [], [], StrategySliceCreator> = (set, get) => ({
  ...defaultStrategy,

  addStrategy: (s: Strategy) =>
    set((state: StoreState) => ({
      strategies: [...state.strategies, s],
    })),


  updateStrategy: (id: string, patch: Partial<Strategy>) =>
    set((state: StoreState) => ({
      strategies: state.strategies.map((s: Strategy) => (s.id === id ? { ...s, ...patch } : s)),
    })),


  deleteStrategy: (id: string) =>
    set((state: StoreState) => ({
      strategies: state.strategies.filter((s: Strategy) => s.id !== id),
      activeStrategyId: state.activeStrategyId === id ? 'preset-3ema' : state.activeStrategyId,
      strategySignal: state.activeStrategyId === id ? null : state.strategySignal,
    })),


  setActiveStrategy: (id: string | null) =>
    set({
      activeStrategyId: id,
      strategySignal: null,
    }),

  evalActiveStrategy: () => {
    const state = get();
    const { activeStrategyId, strategies, livePrice, candles, capital } = state;
    if (!activeStrategyId || !livePrice || candles.length < 10) return;
    const strat = [...PRESET_STRATEGIES, ...strategies].find((s) => s.id === activeStrategyId);
    if (!strat) return;
    const snap = buildSnapshot(state);
    const recent = candles.slice(-20);
    set({
      strategySignal: evaluateStrategy(
        strat,
        snap,
        parseFloat(capital) || 200,
        Math.min(...recent.map((c: Candle) => c.l)),
        Math.max(...recent.map((c: Candle) => c.h))
      ),
    });
  },

  exportStrategy: (id: string) => {
    const strat = [...PRESET_STRATEGIES, ...get().strategies].find((s) => s.id === id);
    if (!strat) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(
      new Blob([JSON.stringify(strat, null, 2)], { type: 'application/json' })
    );
    a.download = `strategy_${strat.name.replace(/\s+/g, '_')}.json`;
    a.click();
  },

  importStrategy: (json: string) => {
    try {
      const p = JSON.parse(json);
      if (!p?.name) return { ok: false, error: 'Missing name' };
      if (!p.longEntry && !p.shortEntry) return { ok: false, error: 'No entry conditions' };
      set((s: StoreState) => ({
        strategies: [
          ...s.strategies,
          {
            ...p,
            id: makeId(),
            createdAt: Date.now(),
            updatedAt: Date.now(),
            enabled: p.enabled ?? true,
          },
        ],
      }));
      return { ok: true };
    } catch (e) {
      return { ok: false, error: `${e}` };
    }
  },

  duplicateStrategy: (id: string) => {
    const orig = [...PRESET_STRATEGIES, ...get().strategies].find((s) => s.id === id);
    if (!orig) return;
    set((s: StoreState) => ({
      strategies: [
        ...s.strategies,
        {
          ...JSON.parse(JSON.stringify(orig)),
          id: makeId(),
          name: orig.name + ' (copy)',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          enabled: false,
        },
      ],
    }));
  },

  toggleStrategyEnabled: (id: string) =>
    set((s: StoreState) => ({
      strategies: s.strategies.map((st: Strategy) =>
        st.id === id ? { ...st, enabled: !st.enabled, updatedAt: Date.now() } : st
      ),
    })),

});
