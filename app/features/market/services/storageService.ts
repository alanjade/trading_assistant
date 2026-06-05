/**
 * Storage Service
 * Provides a unified interface for persisting and retrieving application data.
 * Abstracts IndexedDB for trades and localStorage for app state.
 */

import {
  idbClearExpiredCache,
  idbClearTrades,
  idbDeleteStrategy,
  idbDeleteTrade,
  idbGetAllChartLayouts,
  idbGetAllStrategies,
  idbGetAllTrades,
  idbGetCache,
  idbGetChartLayout,
  idbGetMetadata,
  idbPutChartLayout,
  idbPutStrategies,
  idbPutStrategy,
  idbPutTrade,
  idbPutTrades,
  idbRemoveCache,
  idbReplaceTrades,
  idbSetCache,
  idbSetMetadata,
  type ChartLayoutRecord,
} from '@/lib/journalDb';
import type { TradeJournalEntry } from '@/lib/store/types';
import type { Strategy } from '@/lib/strategy';

const JOURNAL_CACHE_KEY = 'journal:snapshot';
const STRATEGY_CACHE_KEY = 'strategies:snapshot';
const WORKSPACES_KEY = 'app:workspaces';
const CURRENT_WORKSPACE_KEY = 'app:currentWorkspace';

type JournalSnapshot = {
  trades: TradeJournalEntry[];
  updatedAt: number;
};

type StrategySnapshot = {
  strategies: Strategy[];
  updatedAt: number;
};

export type WorkspaceRecord = {
  id: string;
  name: string;
  description?: string;
  chartLayoutIds: string[];
  updatedAt: number;
};

// ─────────────────────────────────────────────────────────────────────────────
// Trade Journal Storage
// ─────────────────────────────────────────────────────────────────────────────

export const tradeStorage = {
  /**
   * Retrieve all trades from IndexedDB.
   */
  getAllTrades: async (): Promise<TradeJournalEntry[]> => {
    try {
      return await idbGetAllTrades();
    } catch (error) {
      console.error('[tradeStorage] Failed to get all trades:', error);
      return (await idbGetCache<JournalSnapshot>(JOURNAL_CACHE_KEY))?.trades ?? [];
    }
  },

  /**
   * Save a single trade to IndexedDB.
   */
  saveTrade: async (trade: TradeJournalEntry): Promise<boolean> => {
    try {
      await idbPutTrade(trade);
      const current = await tradeStorage.getAllTrades();
      await idbSetCache<JournalSnapshot>(JOURNAL_CACHE_KEY, {
        trades: current,
        updatedAt: Date.now(),
      });
      return true;
    } catch (error) {
      console.error('[tradeStorage] Failed to save trade:', error);
      return false;
    }
  },

  /**
   * Save multiple trades to IndexedDB.
   */
  saveTrades: async (trades: TradeJournalEntry[]): Promise<boolean> => {
    try {
      await idbPutTrades(trades);
      const current = await tradeStorage.getAllTrades();
      await idbSetCache<JournalSnapshot>(JOURNAL_CACHE_KEY, {
        trades: current,
        updatedAt: Date.now(),
      });
      return true;
    } catch (error) {
      console.error('[tradeStorage] Failed to save trades:', error);
      return false;
    }
  },

  /**
   * Delete a single trade from IndexedDB.
   */
  deleteTrade: async (id: string): Promise<boolean> => {
    try {
      await idbDeleteTrade(id);
      const current = await tradeStorage.getAllTrades();
      await idbSetCache<JournalSnapshot>(JOURNAL_CACHE_KEY, {
        trades: current,
        updatedAt: Date.now(),
      });
      return true;
    } catch (error) {
      console.error('[tradeStorage] Failed to delete trade:', error);
      return false;
    }
  },

  /**
   * Clear all trades from IndexedDB.
   */
  clearAllTrades: async (): Promise<boolean> => {
    try {
      await idbClearTrades();
      await idbSetCache<JournalSnapshot>(JOURNAL_CACHE_KEY, { trades: [], updatedAt: Date.now() });
      return true;
    } catch (error) {
      console.error('[tradeStorage] Failed to clear trades:', error);
      return false;
    }
  },

  /**
   * Replace all trades in IndexedDB (used for imports/resets).
   */
  replaceTrades: async (trades: TradeJournalEntry[]): Promise<boolean> => {
    try {
      await idbReplaceTrades(trades);
      await idbSetCache<JournalSnapshot>(JOURNAL_CACHE_KEY, {
        trades,
        updatedAt: Date.now(),
      });
      return true;
    } catch (error) {
      console.error('[tradeStorage] Failed to replace trades:', error);
      return false;
    }
  },
};

export const strategyStorage = {
  getAllStrategies: async (): Promise<Strategy[]> => {
    try {
      const strategies = await idbGetAllStrategies();
      if (strategies.length > 0) return strategies;
      return (await idbGetCache<StrategySnapshot>(STRATEGY_CACHE_KEY))?.strategies ?? [];
    } catch (error) {
      console.error('[strategyStorage] Failed to get strategies:', error);
      return (await idbGetCache<StrategySnapshot>(STRATEGY_CACHE_KEY))?.strategies ?? [];
    }
  },

  saveStrategy: async (strategy: Strategy): Promise<boolean> => {
    try {
      await idbPutStrategy(strategy);
      const strategies = await strategyStorage.getAllStrategies();
      await idbSetCache<StrategySnapshot>(STRATEGY_CACHE_KEY, {
        strategies,
        updatedAt: Date.now(),
      });
      return true;
    } catch (error) {
      console.error('[strategyStorage] Failed to save strategy:', error);
      return false;
    }
  },

  saveStrategies: async (strategies: Strategy[]): Promise<boolean> => {
    try {
      await idbPutStrategies(strategies);
      await idbSetCache<StrategySnapshot>(STRATEGY_CACHE_KEY, {
        strategies,
        updatedAt: Date.now(),
      });
      return true;
    } catch (error) {
      console.error('[strategyStorage] Failed to save strategies:', error);
      return false;
    }
  },

  deleteStrategy: async (id: string): Promise<boolean> => {
    try {
      await idbDeleteStrategy(id);
      const strategies = await strategyStorage.getAllStrategies();
      await idbSetCache<StrategySnapshot>(STRATEGY_CACHE_KEY, {
        strategies,
        updatedAt: Date.now(),
      });
      return true;
    } catch (error) {
      console.error('[strategyStorage] Failed to delete strategy:', error);
      return false;
    }
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Application State Storage (localStorage)
// ─────────────────────────────────────────────────────────────────────────────

export const schemaStorage = {
  getMetadata: async <T>(key: string): Promise<T | null> => {
    try {
      return await idbGetMetadata<T>(key);
    } catch (error) {
      console.error(`[schemaStorage] Failed to get metadata "${key}":`, error);
      return null;
    }
  },

  setMetadata: async (key: string, value: unknown): Promise<boolean> => {
    try {
      await idbSetMetadata(key, value);
      return true;
    } catch (error) {
      console.error(`[schemaStorage] Failed to set metadata "${key}":`, error);
      return false;
    }
  },
};

export const workspaceStorage = {
  getWorkspace: async (id: string): Promise<WorkspaceRecord | null> => {
    const workspaces = await workspaceStorage.getAllWorkspaces();
    return workspaces.find((workspace) => workspace.id === id) ?? null;
  },

  getAllWorkspaces: async (): Promise<WorkspaceRecord[]> => {
    try {
      const stored = await schemaStorage.getMetadata<WorkspaceRecord[]>(WORKSPACES_KEY);
      return (stored ?? []).sort((a, b) => b.updatedAt - a.updatedAt);
    } catch (error) {
      console.error('[workspaceStorage] Failed to get workspaces:', error);
      return [];
    }
  },

  saveWorkspace: async (workspace: WorkspaceRecord): Promise<WorkspaceRecord | null> => {
    try {
      const workspaces = await workspaceStorage.getAllWorkspaces();
      const nextWorkspace = {
        ...workspace,
        updatedAt: workspace.updatedAt || Date.now(),
      } satisfies WorkspaceRecord;
      const nextWorkspaces = [
        ...workspaces.filter((item) => item.id !== nextWorkspace.id),
        nextWorkspace,
      ].sort((a, b) => b.updatedAt - a.updatedAt);

      await schemaStorage.setMetadata(WORKSPACES_KEY, nextWorkspaces);

      const hasCurrent = await schemaStorage.getMetadata<string | null>(CURRENT_WORKSPACE_KEY);
      if (!hasCurrent) {
        await schemaStorage.setMetadata(CURRENT_WORKSPACE_KEY, nextWorkspace.id);
      }

      return nextWorkspace;
    } catch (error) {
      console.error('[workspaceStorage] Failed to save workspace:', error);
      return null;
    }
  },

  deleteWorkspace: async (id: string): Promise<boolean> => {
    try {
      const workspaces = await workspaceStorage.getAllWorkspaces();
      const nextWorkspaces = workspaces.filter((workspace) => workspace.id !== id);
      await schemaStorage.setMetadata(WORKSPACES_KEY, nextWorkspaces);

      const current = await schemaStorage.getMetadata<string | null>(CURRENT_WORKSPACE_KEY);
      if (current === id) {
        await schemaStorage.setMetadata(CURRENT_WORKSPACE_KEY, nextWorkspaces[0]?.id ?? null);
      }
      return true;
    } catch (error) {
      console.error('[workspaceStorage] Failed to delete workspace:', error);
      return false;
    }
  },

  getCurrentWorkspace: async (): Promise<WorkspaceRecord | null> => {
    try {
      const currentId = await schemaStorage.getMetadata<string | null>(CURRENT_WORKSPACE_KEY);
      if (!currentId) return null;
      return (await workspaceStorage.getWorkspace(currentId)) ?? null;
    } catch (error) {
      console.error('[workspaceStorage] Failed to get current workspace:', error);
      return null;
    }
  },

  setCurrentWorkspace: async (id: string): Promise<boolean> => {
    try {
      const workspace = await workspaceStorage.getWorkspace(id);
      if (!workspace) return false;
      await schemaStorage.setMetadata(CURRENT_WORKSPACE_KEY, id);
      return true;
    } catch (error) {
      console.error('[workspaceStorage] Failed to set current workspace:', error);
      return false;
    }
  },
};

export const chartLayoutStorage = {
  getLayout: async (sym: string, tf: string): Promise<ChartLayoutRecord | null> => {
    try {
      return await idbGetChartLayout(sym, tf);
    } catch (error) {
      console.error('[chartLayoutStorage] Failed to get chart layout:', error);
      return null;
    }
  },

  getAllLayouts: async (): Promise<ChartLayoutRecord[]> => {
    try {
      return await idbGetAllChartLayouts();
    } catch (error) {
      console.error('[chartLayoutStorage] Failed to get chart layouts:', error);
      return [];
    }
  },

  saveLayout: async (
    layout: Omit<ChartLayoutRecord, 'id' | 'createdAt' | 'updatedAt'> &
      Partial<Pick<ChartLayoutRecord, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<ChartLayoutRecord | null> => {
    try {
      return await idbPutChartLayout(layout);
    } catch (error) {
      console.error('[chartLayoutStorage] Failed to save chart layout:', error);
      return null;
    }
  },
};

const STATE_KEY = 'trading_assistant_state';

export interface StoredAppState {
  theme: 'dark' | 'light';
  defaultSym: string;
  defaultTf: string;
  soundEnabled: boolean;
  notifEnabled: boolean;
}

export const appStateStorage = {
  /**
   * Get stored app preferences from localStorage.
   */
  getState: (): Partial<StoredAppState> => {
    try {
      if (typeof window === 'undefined') return {};
      const stored = localStorage.getItem(STATE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error('[appStateStorage] Failed to get state:', error);
      return {};
    }
  },

  /**
   * Save app preferences to localStorage.
   */
  setState: (state: Partial<StoredAppState>): boolean => {
    try {
      if (typeof window === 'undefined') return false;
      localStorage.setItem(STATE_KEY, JSON.stringify(state));
      return true;
    } catch (error) {
      console.error('[appStateStorage] Failed to set state:', error);
      return false;
    }
  },

  /**
   * Update a single preference in localStorage.
   */
  updateState: (key: keyof StoredAppState, value: unknown): boolean => {
    try {
      if (typeof window === 'undefined') return false;
      const current = appStateStorage.getState();
      const updated = { ...current, [key]: value };
      localStorage.setItem(STATE_KEY, JSON.stringify(updated));
      return true;
    } catch (error) {
      console.error('[appStateStorage] Failed to update state:', error);
      return false;
    }
  },

  /**
   * Clear all stored app state.
   */
  clear: (): boolean => {
    try {
      if (typeof window === 'undefined') return false;
      localStorage.removeItem(STATE_KEY);
      return true;
    } catch (error) {
      console.error('[appStateStorage] Failed to clear state:', error);
      return false;
    }
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Local Cache for Transient Data
// ─────────────────────────────────────────────────────────────────────────────

const CACHE_KEY_PREFIX = 'trading_assistant_cache_';

export const cacheStorage = {
  /**
   * Get a cached value by key.
   */
  get<T>(key: string): T | null {
    try {
      if (typeof window === 'undefined') return null;
      const stored = localStorage.getItem(CACHE_KEY_PREFIX + key);
      if (!stored) return null;
      const { value, expiresAt } = JSON.parse(stored);
      if (expiresAt && Date.now() > expiresAt) {
        localStorage.removeItem(CACHE_KEY_PREFIX + key);
        return null;
      }
      return value as T;
    } catch (error) {
      console.error(`[cacheStorage] Failed to get key "${key}":`, error);
      return null;
    }
  },

  async getIdb<T>(key: string): Promise<T | null> {
    try {
      return await idbGetCache<T>(key);
    } catch (error) {
      console.error(`[cacheStorage] Failed to get IndexedDB key "${key}":`, error);
      return cacheStorage.get<T>(key);
    }
  },

  /**
   * Set a cached value with optional expiration (in seconds).
   */
  set(key: string, value: unknown, expiresInSeconds?: number): boolean {
    try {
      if (typeof window === 'undefined') return false;
      const expiresAt = expiresInSeconds ? Date.now() + expiresInSeconds * 1000 : null;
      localStorage.setItem(CACHE_KEY_PREFIX + key, JSON.stringify({ value, expiresAt }));
      return true;
    } catch (error) {
      console.error(`[cacheStorage] Failed to set key "${key}":`, error);
      return false;
    }
  },

  async setIdb(key: string, value: unknown, expiresInSeconds?: number): Promise<boolean> {
    try {
      await idbSetCache(key, value, expiresInSeconds);
      cacheStorage.set(key, value, expiresInSeconds);
      return true;
    } catch (error) {
      console.error(`[cacheStorage] Failed to set IndexedDB key "${key}":`, error);
      return cacheStorage.set(key, value, expiresInSeconds);
    }
  },

  /**
   * Remove a cached value.
   */
  remove(key: string): boolean {
    try {
      if (typeof window === 'undefined') return false;
      localStorage.removeItem(CACHE_KEY_PREFIX + key);
      return true;
    } catch (error) {
      console.error(`[cacheStorage] Failed to remove key "${key}":`, error);
      return false;
    }
  },

  async removeIdb(key: string): Promise<boolean> {
    try {
      await idbRemoveCache(key);
      cacheStorage.remove(key);
      return true;
    } catch (error) {
      console.error(`[cacheStorage] Failed to remove IndexedDB key "${key}":`, error);
      return cacheStorage.remove(key);
    }
  },

  async clearExpiredIdb(): Promise<boolean> {
    try {
      await idbClearExpiredCache();
      return true;
    } catch (error) {
      console.error('[cacheStorage] Failed to clear expired IndexedDB cache:', error);
      return false;
    }
  },

  /**
   * Clear all cached values.
   */
  clearAll(): boolean {
    try {
      if (typeof window === 'undefined') return false;
      const keys = Object.keys(localStorage);
      keys.filter((k) => k.startsWith(CACHE_KEY_PREFIX)).forEach((k) => localStorage.removeItem(k));
      return true;
    } catch (error) {
      console.error('[cacheStorage] Failed to clear cache:', error);
      return false;
    }
  },
};
