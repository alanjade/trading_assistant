export type ProfileEvent = {
  name: string;
  durationMs: number;
  timestamp: number;
};

export type BenchmarkResult<T = unknown> = {
  name: string;
  iterations: number;
  minMs: number;
  maxMs: number;
  meanMs: number;
  medianMs: number;
  totalMs: number;
  result?: T;
};

const isPerformanceAvailable = typeof globalThis !== 'undefined' && typeof globalThis.performance !== 'undefined';
const isProfilingEnabled = process.env.NODE_ENV !== 'production' && isPerformanceAvailable;

const profileEvents: ProfileEvent[] = [];

function now(): number {
  return isPerformanceAvailable ? globalThis.performance.now() : Date.now();
}

export function profile<T>(name: string, fn: () => T): T {
  if (!isProfilingEnabled) {
    return fn();
  }

  const start = now();
  const result = fn();
  const durationMs = now() - start;

  profileEvents.push({
    name,
    durationMs,
    timestamp: Date.now(),
  });

  return result;
}

export async function profileAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
  if (!isProfilingEnabled) {
    return fn();
  }

  const start = now();
  const result = await fn();
  const durationMs = now() - start;

  profileEvents.push({
    name,
    durationMs,
    timestamp: Date.now(),
  });

  return result;
}

export function getProfileEvents(): ProfileEvent[] {
  return [...profileEvents];
}

export function clearProfileEvents() {
  profileEvents.length = 0;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

export function bench<T>(name: string, fn: () => T, iterations = 100): BenchmarkResult<T> {
  const durations: number[] = [];
  let lastResult: T | undefined;

  for (let i = 0; i < iterations; i += 1) {
    const start = now();
    lastResult = fn();
    durations.push(now() - start);
  }

  const totalMs = durations.reduce((sum, value) => sum + value, 0);
  const minMs = Math.min(...durations);
  const maxMs = Math.max(...durations);
  const meanMs = totalMs / durations.length;
  const medianMs = median(durations);

  return {
    name,
    iterations,
    minMs,
    maxMs,
    meanMs,
    medianMs,
    totalMs,
    result: lastResult,
  };
}
