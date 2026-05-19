/**
 * Storage Service
 * Provides a unified interface for persisting and retrieving application data.
 * Abstracts IndexedDB for trades and localStorage for app state.
 */

import {
  idbClearTrades,
  idbDeleteTrade,
  idbGetAllTrades,
  idbPutTrade,
  idbPutTrades,
  idbReplaceTrades,
} from '@/lib/journalDb';
import type { TradeJournalEntry } from '@/lib/store';

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
      return [];
    }
  },

  /**
   * Save a single trade to IndexedDB.
   */
  saveTrade: async (trade: TradeJournalEntry): Promise<boolean> => {
    try {
      await idbPutTrade(trade);
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
      return true;
    } catch (error) {
      console.error('[tradeStorage] Failed to replace trades:', error);
      return false;
    }
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Application State Storage (localStorage)
// ─────────────────────────────────────────────────────────────────────────────

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
