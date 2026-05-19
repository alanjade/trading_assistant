// ─────────────────────────────────────────────────────────────────────────────
//  Journal Slice
//  Trade journal management and persistence
// ─────────────────────────────────────────────────────────────────────────────

import { idbDeleteTrade, idbGetAllTrades, idbPutTrade, idbReplaceTrades } from '../../journalDb';
import { splitCsvLine } from '../helpers';
import type { JournalSlice, JournalSliceCreator, TradeJournalEntry, StoreState } from '../types';
import type { StateCreator } from 'zustand';

const defaultJournal: JournalSlice = {
  trades: [],
};

// ─────────────────────────────────────────────────────────────────────────────
//  Slice Creator
// ─────────────────────────────────────────────────────────────────────────────

export const createJournalSlice: StateCreator<StoreState, [], [], JournalSliceCreator> = (set, get) => ({
  ...defaultJournal,

  addTrade: (t: Omit<TradeJournalEntry, 'id'>) => {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2);
    const trade: TradeJournalEntry = {
      ...t,
      id,
      tags: t.tags ?? [],
      screenshotUrl: t.screenshotUrl ?? '',
    };
    set((s: StoreState) => ({ trades: [...s.trades, trade] }));
    idbPutTrade(trade).catch(console.error);
  },

  updateTrade: (id: string, updates: Partial<TradeJournalEntry>) => {
    set((s: StoreState) => {
      const trades = s.trades.map((t: TradeJournalEntry) =>
        t.id === id ? { ...t, ...updates } : t
      );
      const updated = trades.find((t: TradeJournalEntry) => t.id === id);
      if (updated) idbPutTrade(updated).catch(console.error);
      return { trades };
    });
  },

  deleteTrade: (id: string) => {
    set((s: StoreState) => ({ trades: s.trades.filter((t: TradeJournalEntry) => t.id !== id) }));
    idbDeleteTrade(id).catch(console.error);
  },

  hydrateTradesFromIdb: async () => {
    try {
      const trades = await idbGetAllTrades();
      if (trades && trades.length > 0) {
        set({ trades });
      }
    } catch (e) {
      console.error('hydrateTradesFromIdb failed:', e);
    }
  },

  importTradesCsv: async (csv: string, mode: 'merge' | 'replace') => {
    const lines = csv.trim().split('\n');
    const header = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
    let count = 0,
      errors = 0;

    const parsed: TradeJournalEntry[] = [];
    for (let i = 1; i < lines.length; i++) {
      try {
        const cols = splitCsvLine(lines[i]);
        const row: Record<string, string> = {};
        header.forEach((h, j) => {
          row[h] = cols[j] ?? '';
        });
        parsed.push({
          id: row['id'] || Date.now().toString(36) + i,
          date: row['date'] || new Date().toISOString().slice(0, 10),
          symbol: row['symbol'] || 'UNKNOWN',
          dir: row['dir'] === 'short' ? 'short' : 'long',
          entry: parseFloat(row['entry']) || 0,
          stop: parseFloat(row['stop']) || 0,
          target: parseFloat(row['target']) || 0,
          outcome: (['win', 'loss', 'be', 'open'].includes(row['outcome'])
            ? row['outcome']
            : 'open') as 'win' | 'loss' | 'be' | 'open',
          pnl: parseFloat(row['pnl']) || 0,
          notes: row['notes'] || '',
          tags: row['tags'] ? row['tags'].split(';').filter(Boolean) : [],
          screenshotUrl: row['screenshotUrl'] || '',
        });
        count++;
      } catch {
        errors++;
      }
    }

    if (mode === 'replace') {
      set({ trades: parsed });
      await idbReplaceTrades(parsed);
    } else {
      set((s: StoreState) => {
        const existing = new Set(s.trades.map((t: TradeJournalEntry) => t.id));
        const toAdd = parsed.filter((t) => !existing.has(t.id));
        return { trades: [...s.trades, ...toAdd] };
      });
      await Promise.all(parsed.map((t) => idbPutTrade(t)));
    }
    return { count, errors };
  },

  exportTradesCsv: () => {
    const trades = get().trades;
    const headers = [
      'id',
      'date',
      'symbol',
      'dir',
      'entry',
      'stop',
      'target',
      'outcome',
      'pnl',
      'notes',
      'tags',
      'screenshotUrl',
    ];
    const rows = trades.map((t: TradeJournalEntry) => [
      t.id,
      t.date,
      t.symbol,
      t.dir,
      t.entry.toFixed(4),
      t.stop.toFixed(4),
      t.target.toFixed(4),
      t.outcome,
      t.pnl.toFixed(2),
      `"${(t.notes || '').replace(/"/g, '""')}"`,
      `"${(t.tags || []).join(';')}"`,
      `"${t.screenshotUrl || ''}"`,
    ]);
    return [headers.join(','), ...rows.map((r: Array<string | number>) => r.join(','))].join('\n');
  },
});
