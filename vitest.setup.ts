import '@testing-library/jest-dom';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock IndexedDB for storage service tests
function dispatchRequestSuccess<T>(req: MockIDBRequest<T>) {
  const handler = req.onsuccess;
  if (handler) {
    handler.call(req as unknown as IDBRequest<T>, new Event('success'));
  }
}

function dispatchOpenRequestSuccess(req: MockIDBOpenDBRequest) {
  const handler = req.onsuccess;
  if (handler) {
    handler.call(req as unknown as IDBOpenDBRequest, new Event('success'));
  }
}

function dispatchUpgradeNeeded(req: MockIDBOpenDBRequest) {
  const handler = req.onupgradeneeded;
  if (handler) {
    handler.call(req as unknown as IDBOpenDBRequest, new Event('upgradeneeded') as IDBVersionChangeEvent);
  }
}

class MockIDBRequest<T = unknown> extends EventTarget {
  result: T;
  error: Error | null = null;
  onsuccess: ((this: IDBRequest<T>, ev: Event) => unknown) | null = null;
  onerror: ((this: IDBRequest<T>, ev: Event) => unknown) | null = null;

  constructor(result?: T) {
    super();
    this.result = result as T;
  }
}

class MockIDBObjectStore<T = unknown> {
  private data = new Map<string, T>();

  constructor(private readonly keyPath?: string) {}

  createIndex = vi.fn(() => ({
    get: vi.fn(() => {
      const req = new MockIDBRequest<unknown>();
      setTimeout(() => {
        req.dispatchEvent(new Event('success'));
        dispatchRequestSuccess(req);
      }, 0);
      return req;
    }),
    getAll: vi.fn(() => []),
  }));

  index = vi.fn(() => ({
    get: vi.fn((key?: unknown) => {
      const req = new MockIDBRequest<unknown>();
      const candidates = Array.from(this.data.values());
      const record = Array.isArray(key)
        ? candidates.find(
            (item) =>
              typeof item === 'object' &&
              item !== null &&
              'sym' in item &&
              'tf' in item &&
              (item as { sym?: unknown; tf?: unknown }).sym === key[0] &&
              (item as { tf?: unknown }).tf === key[1]
          )
        : undefined;
      req.result = record;
      setTimeout(() => {
        req.dispatchEvent(new Event('success'));
        dispatchRequestSuccess(req);
      }, 0);
      return req;
    }),
    getAll: vi.fn(() => Array.from(this.data.values())),
  }));

  getAll = vi.fn(() => Array.from(this.data.entries()).map(([, value]) => value));

  add = vi.fn((value: T) => {
    const req = new MockIDBRequest<string>();
    const key = Math.random().toString(36);
    this.data.set(key, value);
    req.result = key;
    setTimeout(() => {
      req.dispatchEvent(new Event('success'));
      dispatchRequestSuccess(req);
    }, 0);
    return req;
  });

  put = vi.fn((value: T, key?: string) => {
    const req = new MockIDBRequest<string>();
    const derivedKey =
      key ??
      (this.keyPath && value && typeof value === 'object'
        ? String((value as Record<string, unknown>)[this.keyPath])
        : undefined);
    const k = derivedKey || Math.random().toString(36);
    this.data.set(k, value);
    req.result = k;
    setTimeout(() => {
      req.dispatchEvent(new Event('success'));
      dispatchRequestSuccess(req);
    }, 0);
    return req;
  });

  get = vi.fn((key: string) => {
    const req = new MockIDBRequest<T | undefined>();
    req.result = this.data.get(key);
    setTimeout(() => {
      req.dispatchEvent(new Event('success'));
      dispatchRequestSuccess(req);
    }, 0);
    return req;
  });

  delete = vi.fn((key: string) => {
    const req = new MockIDBRequest();
    this.data.delete(key);
    setTimeout(() => {
      req.dispatchEvent(new Event('success'));
      dispatchRequestSuccess(req);
    }, 0);
    return req;
  });

  clear = vi.fn(() => {
    const req = new MockIDBRequest();
    this.data.clear();
    setTimeout(() => {
      req.dispatchEvent(new Event('success'));
      dispatchRequestSuccess(req);
    }, 0);
    return req;
  });
}

class MockIDBDatabase {
  private stores = new Map<string, MockIDBObjectStore<unknown>>();

  objectStoreNames = {
    contains: vi.fn((name: string) => this.stores.has(name)),
  };

  createObjectStore = vi.fn((name: string, options?: { keyPath?: string | string[] }) => {
    const store = new MockIDBObjectStore<unknown>(
      typeof options?.keyPath === 'string' ? options.keyPath : undefined
    );
    this.stores.set(name, store);
    return store;
  });

  transaction = vi.fn((name: string) => {
    const store = this.stores.get(name) ?? this.createObjectStore(name);
    return {
      objectStore: vi.fn(() => store),
    };
  });

  objectStore = vi.fn((name: string) => this.stores.get(name) ?? this.createObjectStore(name));
  close = vi.fn();
}

class MockIDBOpenDBRequest extends EventTarget {
  result: MockIDBDatabase | null = null;
  error: Error | null = null;
  onupgradeneeded: ((this: IDBOpenDBRequest, ev: IDBVersionChangeEvent) => unknown) | null = null;
  onsuccess: ((this: IDBOpenDBRequest, ev: Event) => unknown) | null = null;
  onerror: ((this: IDBOpenDBRequest, ev: Event) => unknown) | null = null;

  constructor() {
    super();
    this.result = new MockIDBDatabase();
    setTimeout(() => {
      dispatchUpgradeNeeded(this);
      this.dispatchEvent(new Event('success'));
      dispatchOpenRequestSuccess(this);
    }, 0);
  }
}

(globalThis as unknown as { indexedDB: { open: ReturnType<typeof vi.fn> } }).indexedDB = {
  open: vi.fn(() => new MockIDBOpenDBRequest()),
};
