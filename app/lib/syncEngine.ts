'use client';

import { cacheStorage } from '@/features/market/services/storageService';
import { pushStateToCloud, SUPABASE_ENABLED } from '@/lib/supabase';

type SyncEntity = 'journal' | 'strategy' | 'state';
type SyncAction = 'create' | 'update' | 'delete' | 'replace';

export type SyncOperation = {
  id: string;
  entity: SyncEntity;
  action: SyncAction;
  payload: unknown;
  createdAt: number;
  attempts: number;
  lastError?: string;
};

export type SyncStatus = {
  online: boolean;
  pending: number;
  syncing: boolean;
  lastSyncedAt: number | null;
  lastError: string | null;
};

const SYNC_QUEUE_KEY = 'sync:queue';
const SYNC_META_KEY = 'sync:meta';
const SYNC_INTERVAL_MS = 60_000;

let status: SyncStatus = {
  online: typeof navigator === 'undefined' ? true : navigator.onLine,
  pending: 0,
  syncing: false,
  lastSyncedAt: null,
  lastError: null,
};

let syncTimer: ReturnType<typeof setInterval> | null = null;
const listeners = new Set<(status: SyncStatus) => void>();

function makeId() {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
}

function publish(patch: Partial<SyncStatus>) {
  status = { ...status, ...patch };
  listeners.forEach((listener) => listener(status));
}

async function readQueue(): Promise<SyncOperation[]> {
  return (await cacheStorage.getIdb<SyncOperation[]>(SYNC_QUEUE_KEY)) ?? [];
}

async function writeQueue(queue: SyncOperation[]) {
  await cacheStorage.setIdb(SYNC_QUEUE_KEY, queue);
  publish({ pending: queue.length });
}

export function subscribeSyncStatus(listener: (status: SyncStatus) => void) {
  listeners.add(listener);
  listener(status);
  return () => {
    listeners.delete(listener);
  };
}

export function getSyncStatus() {
  return status;
}

export async function hydrateSyncStatus() {
  const [queue, meta] = await Promise.all([
    readQueue(),
    cacheStorage.getIdb<{ lastSyncedAt: number | null; lastError: string | null }>(SYNC_META_KEY),
  ]);
  publish({
    online: typeof navigator === 'undefined' ? true : navigator.onLine,
    pending: queue.length,
    lastSyncedAt: meta?.lastSyncedAt ?? null,
    lastError: meta?.lastError ?? null,
  });
}

export async function enqueueOptimisticUpdate(
  operation: Omit<SyncOperation, 'id' | 'createdAt' | 'attempts'>
) {
  const queue = await readQueue();
  const next: SyncOperation[] = [
    ...queue,
    {
      ...operation,
      id: makeId(),
      createdAt: Date.now(),
      attempts: 0,
    },
  ];
  await writeQueue(next);
}

export async function flushSyncQueue(getState: () => object) {
  const online = typeof navigator === 'undefined' ? true : navigator.onLine;
  const queue = await readQueue();
  publish({ online, pending: queue.length });

  if (!online || status.syncing || queue.length === 0) return;
  if (!SUPABASE_ENABLED) return;

  publish({ syncing: true, lastError: null });
  const result = await pushStateToCloud(getState() as Record<string, unknown>);
  if (result.ok) {
    await writeQueue([]);
    const lastSyncedAt = Date.now();
    await cacheStorage.setIdb(SYNC_META_KEY, { lastSyncedAt, lastError: null });
    publish({ syncing: false, pending: 0, lastSyncedAt, lastError: null });
    return;
  }

  const failed = queue.map((operation) => ({
    ...operation,
    attempts: operation.attempts + 1,
    lastError: result.error,
  }));
  await writeQueue(failed);
  await cacheStorage.setIdb(SYNC_META_KEY, {
    lastSyncedAt: status.lastSyncedAt,
    lastError: result.error ?? 'Sync failed',
  });
  publish({ syncing: false, lastError: result.error ?? 'Sync failed' });
}

export function startSyncEngine(getState: () => object) {
  if (typeof window === 'undefined') return () => {};

  const onOnline = () => {
    publish({ online: true });
    void flushSyncQueue(getState);
  };
  const onOffline = () => publish({ online: false });

  void hydrateSyncStatus();
  window.addEventListener('online', onOnline);
  window.addEventListener('offline', onOffline);

  if (syncTimer) clearInterval(syncTimer);
  syncTimer = setInterval(() => {
    void flushSyncQueue(getState);
  }, SYNC_INTERVAL_MS);

  void flushSyncQueue(getState);

  return () => {
    window.removeEventListener('online', onOnline);
    window.removeEventListener('offline', onOffline);
    if (syncTimer) {
      clearInterval(syncTimer);
      syncTimer = null;
    }
  };
}
