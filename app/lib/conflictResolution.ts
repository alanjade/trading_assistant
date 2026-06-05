import type { SafeKey } from './stateIO';
import type { TradeJournalEntry } from './store/types';
import type { Strategy } from './strategy';

export type ConflictResolutionReport = {
  mergedKeys: SafeKey[];
  remoteWins: SafeKey[];
  localWins: SafeKey[];
};

type SafeState = Partial<Record<SafeKey, unknown>>;

function hasUpdatedAt(value: unknown): value is { updatedAt: number } {
  return Boolean(
    value &&
    typeof value === 'object' &&
    typeof (value as { updatedAt?: unknown }).updatedAt === 'number'
  );
}

function mergeById<T extends { id: string }>(
  localItems: T[] | undefined,
  remoteItems: T[] | undefined
) {
  const merged = new Map<string, T>();
  localItems?.forEach((item) => merged.set(item.id, item));
  remoteItems?.forEach((remoteItem) => {
    const localItem = merged.get(remoteItem.id);
    if (!localItem) {
      merged.set(remoteItem.id, remoteItem);
      return;
    }
    if (hasUpdatedAt(localItem) && hasUpdatedAt(remoteItem)) {
      merged.set(
        remoteItem.id,
        remoteItem.updatedAt >= localItem.updatedAt ? remoteItem : localItem
      );
      return;
    }
    merged.set(remoteItem.id, remoteItem);
  });
  return Array.from(merged.values());
}

export function resolveStateConflict(
  localState: SafeState,
  remoteState: SafeState,
  remoteExportedAt?: string
): { state: SafeState; report: ConflictResolutionReport } {
  const remoteTime = remoteExportedAt ? Date.parse(remoteExportedAt) || 0 : 0;
  const mergedKeys: SafeKey[] = [];
  const remoteWins: SafeKey[] = [];
  const localWins: SafeKey[] = [];
  const next: SafeState = { ...localState };

  for (const [key, remoteValue] of Object.entries(remoteState) as Array<[SafeKey, unknown]>) {
    const localValue = localState[key];

    if (key === 'trades' && Array.isArray(remoteValue)) {
      next[key] = mergeById(
        Array.isArray(localValue) ? (localValue as TradeJournalEntry[]) : [],
        remoteValue as TradeJournalEntry[]
      );
      mergedKeys.push(key);
      continue;
    }

    if (key === 'strategies' && Array.isArray(remoteValue)) {
      next[key] = mergeById(
        Array.isArray(localValue) ? (localValue as Strategy[]) : [],
        remoteValue as Strategy[]
      );
      mergedKeys.push(key);
      continue;
    }

    if (localValue === undefined || remoteTime > 0) {
      next[key] = remoteValue;
      remoteWins.push(key);
    } else {
      localWins.push(key);
    }
  }

  return { state: next, report: { mergedKeys, remoteWins, localWins } };
}
