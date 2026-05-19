'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Hook for debouncing callback functions
 * Useful for expensive operations like filtering, searching, or calculations
 */
export function useDebounce<T extends (...args: readonly unknown[]) => void>(
  callback: T,
  delayMs: number
): (...args: Parameters<T>) => void {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  return useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delayMs);
    },
    [callback, delayMs]
  );
}

/**
 * Hook for debouncing state values
 * Returns the debounced value that updates after delay
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    timeoutRef.current = setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [value, delayMs]);

  return debouncedValue;
}
