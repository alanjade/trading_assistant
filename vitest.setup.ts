import '@testing-library/jest-dom';
import { afterEach, expect, vi } from 'vitest';
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
class MockIDBRequest extends EventTarget {
  result: any;
  error: Error | null = null;
}

class MockIDBObjectStore {
  private data: Map<any, any> = new Map();

  add = vi.fn((value) => {
    const req = new MockIDBRequest();
    const key = Math.random().toString(36);
    this.data.set(key, value);
    req.result = key;
    setTimeout(() => req.dispatchEvent(new Event('success')), 0);
    return req;
  });

  put = vi.fn((value, key?) => {
    const req = new MockIDBRequest();
    const k = key || Math.random().toString(36);
    this.data.set(k, value);
    req.result = k;
    setTimeout(() => req.dispatchEvent(new Event('success')), 0);
    return req;
  });

  get = vi.fn((key) => {
    const req = new MockIDBRequest();
    req.result = this.data.get(key);
    setTimeout(() => req.dispatchEvent(new Event('success')), 0);
    return req;
  });

  delete = vi.fn(() => {
    const req = new MockIDBRequest();
    setTimeout(() => req.dispatchEvent(new Event('success')), 0);
    return req;
  });

  clear = vi.fn(() => {
    const req = new MockIDBRequest();
    this.data.clear();
    setTimeout(() => req.dispatchEvent(new Event('success')), 0);
    return req;
  });
}

class MockIDBDatabase {
  objectStore = vi.fn(() => new MockIDBObjectStore());
  close = vi.fn();
}

class MockIDBOpenDBRequest extends EventTarget {
  result: MockIDBDatabase | null = null;

  constructor() {
    super();
    this.result = new MockIDBDatabase();
  }
}

(globalThis as any).indexedDB = {
  open: vi.fn(() => new MockIDBOpenDBRequest()),
};
