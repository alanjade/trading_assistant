// ─────────────────────────────────────────────────────────────────────────────
//  Strategy Slice
//  Trading strategy management and evaluation
// ─────────────────────────────────────────────────────────────────────────────

import type { Candle } from '../../indicators';
import type { Strategy } from '../../strategy';
import { buildSnapshot, evaluateStrategy, PRESET_STRATEGIES } from '../../strategy';
import { makeId } from '../helpers';
import type { StoreState, StrategySlice, StrategySliceCreator } from '../types';
import type { StateCreator } from 'zustand';
import { strategyStorage } from '@/features/market/services/storageService';
import { enqueueOptimisticUpdate } from '@/lib/syncEngine';

const defaultStrategy: StrategySlice = {
  strategies: [],
  activeStrategyId: 'preset-3ema',
  strategySignal: null,
};

// ─────────────────────────────────────────────────────────────────────────────
//  Slice Creator
// ─────────────────────────────────────────────────────────────────────────────

export const createStrategySlice: StateCreator<StoreState, [], [], StrategySliceCreator> = (
  set,
  get
) => ({
  ...defaultStrategy,

  addStrategy: (s: Strategy) => {
    set((state: StoreState) => ({
      strategies: [...state.strategies, s],
    }));
    enqueueOptimisticUpdate({ entity: 'strategy', action: 'create', payload: s }).catch(
      console.error
    );
    strategyStorage.saveStrategy(s).catch(console.error);
  },

  updateStrategy: (id: string, patch: Partial<Strategy>) =>
    set((state: StoreState) => {
      const strategies = state.strategies.map((s: Strategy) =>
        s.id === id ? { ...s, ...patch } : s
      );
      const updated = strategies.find((s: Strategy) => s.id === id);
      if (updated) {
        enqueueOptimisticUpdate({ entity: 'strategy', action: 'update', payload: updated }).catch(
          console.error
        );
        strategyStorage.saveStrategy(updated).catch(console.error);
      }
      return { strategies };
    }),

  deleteStrategy: (id: string) => {
    set((state: StoreState) => ({
      strategies: state.strategies.filter((s: Strategy) => s.id !== id),
      activeStrategyId: state.activeStrategyId === id ? 'preset-3ema' : state.activeStrategyId,
      strategySignal: state.activeStrategyId === id ? null : state.strategySignal,
    }));
    enqueueOptimisticUpdate({ entity: 'strategy', action: 'delete', payload: { id } }).catch(
      console.error
    );
    strategyStorage.deleteStrategy(id).catch(console.error);
  },

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
      const imported = {
        ...p,
        id: makeId(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
        enabled: p.enabled ?? true,
      };
      set((s: StoreState) => ({
        strategies: [...s.strategies, imported],
      }));
      enqueueOptimisticUpdate({ entity: 'strategy', action: 'create', payload: imported }).catch(
        console.error
      );
      strategyStorage.saveStrategy(imported).catch(console.error);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: `${e}` };
    }
  },

  duplicateStrategy: (id: string) => {
    const orig = [...PRESET_STRATEGIES, ...get().strategies].find((s) => s.id === id);
    if (!orig) return;
    const copy = {
      ...JSON.parse(JSON.stringify(orig)),
      id: makeId(),
      name: orig.name + ' (copy)',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      enabled: false,
    };
    set((s: StoreState) => ({
      strategies: [...s.strategies, copy],
    }));
    enqueueOptimisticUpdate({ entity: 'strategy', action: 'create', payload: copy }).catch(
      console.error
    );
    strategyStorage.saveStrategy(copy).catch(console.error);
  },

  toggleStrategyEnabled: (id: string) =>
    set((s: StoreState) => {
      const strategies = s.strategies.map((st: Strategy) =>
        st.id === id ? { ...st, enabled: !st.enabled, updatedAt: Date.now() } : st
      );
      const updated = strategies.find((strategy: Strategy) => strategy.id === id);
      if (updated) {
        enqueueOptimisticUpdate({ entity: 'strategy', action: 'update', payload: updated }).catch(
          console.error
        );
        strategyStorage.saveStrategy(updated).catch(console.error);
      }
      return { strategies };
    }),

  hydrateStrategiesFromCache: async () => {
    try {
      const strategies = await strategyStorage.getAllStrategies();
      if (strategies.length) set({ strategies });
    } catch (error) {
      console.error('hydrateStrategiesFromCache failed:', error);
    }
  },
});
