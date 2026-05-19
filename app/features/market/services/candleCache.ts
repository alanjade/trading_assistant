import type { Candle } from '@/lib/indicators';

const DB_NAME = 'trading_assistant';
const STORE_NAME = 'candles';
const DB_VERSION = 1;

export class CandleCache {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: ['symbol', 'timeframe', 't'] });
          store.createIndex('symbol_tf', ['symbol', 'timeframe'], { unique: false });
        }
      };
    });
  }

  async save(symbol: string, timeframe: string, candles: Candle[]): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);

      for (const candle of candles) {
        store.put({ symbol, timeframe, ...candle });
      }

      tx.onerror = () => reject(tx.error);
      tx.oncomplete = () => resolve();
    });
  }

  async load(symbol: string, timeframe: string, limit = 500): Promise<Candle[]> {
    if (!this.db) return [];

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const index = store.index('symbol_tf');
      const range = IDBKeyRange.only([symbol, timeframe]);

      const request = index.getAll(range, limit);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const results = request.result as Array<Record<string, unknown>>;
        resolve(
          results.map((r) => {
            const record = r as Record<'t' | 'o' | 'h' | 'l' | 'c' | 'v', unknown>;
            return {
              t: Number(record.t),
              o: Number(record.o),
              h: Number(record.h),
              l: Number(record.l),
              c: Number(record.c),
              v: Number(record.v),
            };
          })
        );
      };
    });
  }

  async clear(): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.clear();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }
}

export const candleCache = new CandleCache();
