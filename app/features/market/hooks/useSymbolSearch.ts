import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';

interface UseSymbolSearchOptions {
  symbols: string[];
  onSelect: (symbol: string) => void;
  debounceMs?: number;
}

export function normalizeSymbol(symbol: string) {
  return symbol.replace(/[\s/\-_.]/g, '').toUpperCase();
}

function withDefaultQuote(symbol: string) {
  if (!symbol || symbol.endsWith('USDT') || symbol.endsWith('BTC') || symbol.endsWith('ETH')) {
    return symbol;
  }

  return `${symbol}USDT`;
}

export function useSymbolSearch({ symbols, onSelect, debounceMs = 120 }: UseSymbolSearchOptions) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(-1);
  const listRef = useRef<HTMLDivElement>(null);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), debounceMs);
    return () => clearTimeout(timer);
  }, [debounceMs, query]);

  const filtered = useMemo(() => {
    const normalizedQuery = normalizeSymbol(debouncedQuery.trim());

    if (!normalizedQuery) return [];

    return symbols
      .filter(
        (symbol) =>
          normalizeSymbol(symbol).includes(normalizedQuery) ||
          symbol.replace('USDT', '').includes(normalizedQuery)
      )
      .slice(0, 20);
  }, [debouncedQuery, symbols]);

  const commit = useCallback(
    (symbol: string) => {
      const selectedSymbol = withDefaultQuote(normalizeSymbol(symbol));

      if (!selectedSymbol) return;

      onSelect(selectedSymbol);
      setQuery('');
      setDebouncedQuery('');
      setOpen(false);
      setCursor(-1);
    },
    [onSelect]
  );

  const clearSearch = useCallback(() => {
    setOpen(false);
    setQuery('');
    setDebouncedQuery('');
    setCursor(-1);
  }, []);

  const handleBlur = useCallback(() => {
    blurTimer.current = setTimeout(clearSearch, 180);
  }, [clearSearch]);

  const handleListMouseDown = useCallback(() => {
    if (blurTimer.current) clearTimeout(blurTimer.current);
  }, []);

  const handleQueryChange = useCallback((value: string) => {
    setQuery(value);
    setOpen(true);
    setCursor(-1);
  }, []);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setCursor((current) => Math.min(current + 1, filtered.length - 1));
        return;
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setCursor((current) => Math.max(current - 1, -1));
        return;
      }

      if (event.key === 'Enter') {
        event.preventDefault();
        if (cursor >= 0 && filtered[cursor]) commit(filtered[cursor]);
        else if (query.trim()) commit(query.trim());
        return;
      }

      if (event.key === 'Escape') clearSearch();
    },
    [clearSearch, commit, cursor, filtered, query]
  );

  useEffect(() => {
    if (cursor >= 0 && listRef.current) {
      (listRef.current.children[cursor] as HTMLElement | undefined)?.scrollIntoView({
        block: 'nearest',
      });
    }
  }, [cursor]);

  useEffect(() => {
    return () => {
      if (blurTimer.current) clearTimeout(blurTimer.current);
    };
  }, []);

  const customSymbol = withDefaultQuote(normalizeSymbol(query.trim()));

  return {
    query,
    open,
    cursor,
    filtered,
    customSymbol,
    listRef,
    commit,
    handleBlur,
    handleKeyDown,
    handleListMouseDown,
    handleQueryChange,
    setCursor,
    setOpen,
  };
}
