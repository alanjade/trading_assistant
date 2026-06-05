import type { Drawing } from './drawingTools';
import type { TradeJournalEntry } from './store/types';
import type { Strategy } from './strategy';

const DB_NAME = 'tradeassist';
const DB_VERSION = 3;
const STORE_NAME = 'trades';
const CACHE_STORE = 'cache';
const STRATEGY_STORE = 'strategies';
const METADATA_STORE = 'metadata';
const CHART_LAYOUT_STORE = 'chartLayouts';

export type CacheRecord<T = unknown> = {
  key: string;
  value: T;
  createdAt: number;
  updatedAt: number;
  expiresAt: number | null;
};

export type DbMetadataRecord = {
  key: string;
  value: unknown;
  updatedAt: number;
};

export type ChartLayoutRecord = {
  id: string;
  sym: string;
  tf: string;
  drawings: Drawing[];
  showVolumeProfile: boolean;
  showAutoFib: boolean;
  visibleCandleCount: number;
  panOffset: number;
  createdAt: number;
  updatedAt: number;
};

// ── Open (singleton) ──────────────────────────────────────────────────────────
let _db: IDBDatabase | null = null;

export function openDb(): Promise<IDBDatabase> {
  if (_db) return Promise.resolve(_db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('date', 'date', { unique: false });
        store.createIndex('symbol', 'symbol', { unique: false });
        store.createIndex('outcome', 'outcome', { unique: false });
      }
      if (!db.objectStoreNames.contains(CACHE_STORE)) {
        const store = db.createObjectStore(CACHE_STORE, { keyPath: 'key' });
        store.createIndex('expiresAt', 'expiresAt', { unique: false });
        store.createIndex('updatedAt', 'updatedAt', { unique: false });
      }
      if (!db.objectStoreNames.contains(STRATEGY_STORE)) {
        const store = db.createObjectStore(STRATEGY_STORE, { keyPath: 'id' });
        store.createIndex('updatedAt', 'updatedAt', { unique: false });
        store.createIndex('enabled', 'enabled', { unique: false });
      }
      if (!db.objectStoreNames.contains(METADATA_STORE)) {
        db.createObjectStore(METADATA_STORE, { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains(CHART_LAYOUT_STORE)) {
        const store = db.createObjectStore(CHART_LAYOUT_STORE, { keyPath: 'id' });
        store.createIndex('symbolTimeframe', ['sym', 'tf'], { unique: true });
        store.createIndex('updatedAt', 'updatedAt', { unique: false });
      }
    };
    req.onsuccess = () => {
      _db = req.result;
      void idbSetMetadata('schema', {
        dbName: DB_NAME,
        version: DB_VERSION,
        stores: [STORE_NAME, CACHE_STORE, STRATEGY_STORE, METADATA_STORE, CHART_LAYOUT_STORE],
      });
      resolve(_db);
    };
    req.onerror = () => reject(req.error);
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function tx(db: IDBDatabase, mode: IDBTransactionMode) {
  return db.transaction(STORE_NAME, mode).objectStore(STORE_NAME);
}

function storeTx(db: IDBDatabase, storeName: string, mode: IDBTransactionMode) {
  return db.transaction(storeName, mode).objectStore(storeName);
}

function wrap<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((res, rej) => {
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function idbGetAllTrades(): Promise<TradeJournalEntry[]> {
  const db = await openDb();
  return wrap<TradeJournalEntry[]>(tx(db, 'readonly').getAll());
}

export async function idbPutTrade(trade: TradeJournalEntry): Promise<void> {
  const db = await openDb();
  await wrap(tx(db, 'readwrite').put(trade));
}

export async function idbPutTrades(trades: TradeJournalEntry[]): Promise<void> {
  const db = await openDb();
  const store = db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME);
  await Promise.all(trades.map((t) => wrap(store.put(t))));
}

export async function idbDeleteTrade(id: string): Promise<void> {
  const db = await openDb();
  await wrap(tx(db, 'readwrite').delete(id));
}

export async function idbClearTrades(): Promise<void> {
  const db = await openDb();
  await wrap(tx(db, 'readwrite').clear());
}

export async function idbReplaceTrades(trades: TradeJournalEntry[]): Promise<void> {
  await idbClearTrades();
  await idbPutTrades(trades);
}

export async function idbGetCache<T>(key: string): Promise<T | null> {
  const db = await openDb();
  const record = await wrap<CacheRecord<T> | undefined>(
    storeTx(db, CACHE_STORE, 'readonly').get(key)
  );
  if (!record) return null;
  if (record.expiresAt && Date.now() > record.expiresAt) {
    await idbRemoveCache(key);
    return null;
  }
  return record.value;
}

export async function idbSetCache<T>(
  key: string,
  value: T,
  expiresInSeconds?: number
): Promise<void> {
  const db = await openDb();
  const now = Date.now();
  const record: CacheRecord<T> = {
    key,
    value,
    createdAt: now,
    updatedAt: now,
    expiresAt: expiresInSeconds ? now + expiresInSeconds * 1000 : null,
  };
  await wrap(storeTx(db, CACHE_STORE, 'readwrite').put(record));
}

export async function idbRemoveCache(key: string): Promise<void> {
  const db = await openDb();
  await wrap(storeTx(db, CACHE_STORE, 'readwrite').delete(key));
}

export async function idbClearExpiredCache(): Promise<void> {
  const db = await openDb();
  const store = storeTx(db, CACHE_STORE, 'readwrite');
  const records = await wrap<CacheRecord[]>(store.getAll());
  const now = Date.now();
  await Promise.all(
    records
      .filter((record) => record.expiresAt && record.expiresAt < now)
      .map((record) => wrap(store.delete(record.key)))
  );
}

export async function idbGetAllStrategies(): Promise<Strategy[]> {
  const db = await openDb();
  return wrap<Strategy[]>(storeTx(db, STRATEGY_STORE, 'readonly').getAll());
}

export async function idbPutStrategy(strategy: Strategy): Promise<void> {
  const db = await openDb();
  await wrap(storeTx(db, STRATEGY_STORE, 'readwrite').put(strategy));
}

export async function idbPutStrategies(strategies: Strategy[]): Promise<void> {
  const db = await openDb();
  const store = db.transaction(STRATEGY_STORE, 'readwrite').objectStore(STRATEGY_STORE);
  await Promise.all(strategies.map((strategy) => wrap(store.put(strategy))));
}

export async function idbDeleteStrategy(id: string): Promise<void> {
  const db = await openDb();
  await wrap(storeTx(db, STRATEGY_STORE, 'readwrite').delete(id));
}

export async function idbGetMetadata<T>(key: string): Promise<T | null> {
  const db = await openDb();
  const record = await wrap<DbMetadataRecord | undefined>(
    storeTx(db, METADATA_STORE, 'readonly').get(key)
  );
  return (record?.value as T | undefined) ?? null;
}

export async function idbSetMetadata(key: string, value: unknown): Promise<void> {
  const db = await openDb();
  await wrap(
    storeTx(db, METADATA_STORE, 'readwrite').put({
      key,
      value,
      updatedAt: Date.now(),
    } satisfies DbMetadataRecord)
  );
}

export async function idbGetChartLayout(
  sym: string,
  tf: string
): Promise<ChartLayoutRecord | null> {
  const db = await openDb();
  const index = storeTx(db, CHART_LAYOUT_STORE, 'readonly').index('symbolTimeframe');
  const record = await wrap<ChartLayoutRecord | undefined>(index.get([sym, tf]));
  return record ?? null;
}

export async function idbPutChartLayout(
  layout: Omit<ChartLayoutRecord, 'id' | 'createdAt' | 'updatedAt'> &
    Partial<Pick<ChartLayoutRecord, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<ChartLayoutRecord> {
  const db = await openDb();
  const now = Date.now();
  const record: ChartLayoutRecord = {
    ...layout,
    id: layout.id ?? `${layout.sym}:${layout.tf}`,
    createdAt: layout.createdAt ?? now,
    updatedAt: now,
  };
  await wrap(storeTx(db, CHART_LAYOUT_STORE, 'readwrite').put(record));
  return record;
}

export async function idbGetAllChartLayouts(): Promise<ChartLayoutRecord[]> {
  const db = await openDb();
  return wrap<ChartLayoutRecord[]>(storeTx(db, CHART_LAYOUT_STORE, 'readonly').getAll());
}
