import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';

interface UseSymbolSearchOptions {
  symbols: string[];
  onSelect: (symbol: string) => void;
  debounceMs?: number;
}

export type SymbolQuoteFilter = 'all' | 'USDT' | 'BTC' | 'ETH';
export type SymbolCategoryFilter = 'all' | 'majors' | 'layer1' | 'defi' | 'ai' | 'meme';

const QUOTES = ['USDT', 'BTC', 'ETH'] as const;
const CATEGORY_BASES: Record<Exclude<SymbolCategoryFilter, 'all'>, Set<string>> = {
  majors: new Set(['BTC', 'ETH', 'BNB', 'SOL', 'XRP', 'TON']),
  layer1: new Set(['ADA', 'AVAX', 'TRX', 'DOT', 'ATOM', 'NEAR', 'APT', 'SUI', 'SEI', 'ICP']),
  defi: new Set(['UNI', 'AAVE', 'COMP', 'SNX', 'MKR', 'RUNE', 'INJ']),
  ai: new Set(['RENDER', 'FET', 'AGIX', 'OCEAN', 'TAO']),
  meme: new Set(['DOGE', 'PEPE', 'FLOKI', 'SHIB', 'APE']),
};

export function normalizeSymbol(symbol: string) {
  return symbol.replace(/[\s/\-_.]/g, '').toUpperCase();
}

export function getSymbolQuote(symbol: string): SymbolQuoteFilter {
  const normalized = normalizeSymbol(symbol);
  return QUOTES.find((quote) => normalized.endsWith(quote)) ?? 'USDT';
}

export function getSymbolBase(symbol: string) {
  const normalized = normalizeSymbol(symbol);
  const quote = getSymbolQuote(normalized);
  return normalized.endsWith(quote) ? normalized.slice(0, -quote.length) : normalized;
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
  const [quoteFilter, setQuoteFilter] = useState<SymbolQuoteFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<SymbolCategoryFilter>('all');
  const listRef = useRef<HTMLDivElement>(null);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), debounceMs);
    return () => clearTimeout(timer);
  }, [debounceMs, query]);

  const filtered = useMemo(() => {
    const normalizedQuery = normalizeSymbol(debouncedQuery.trim());

    const categorySet = categoryFilter === 'all' ? null : CATEGORY_BASES[categoryFilter];

    return symbols
      .filter((symbol) => {
        const normalized = normalizeSymbol(symbol);
        const base = getSymbolBase(symbol);
        const quote = getSymbolQuote(symbol);
        const matchesQuery =
          !normalizedQuery ||
          normalized.includes(normalizedQuery) ||
          base.includes(normalizedQuery);
        const matchesQuote = quoteFilter === 'all' || quote === quoteFilter;
        const matchesCategory = !categorySet || categorySet.has(base);

        return matchesQuery && matchesQuote && matchesCategory;
      })
      .sort((a, b) => {
        const baseA = getSymbolBase(a);
        const baseB = getSymbolBase(b);
        const score = (symbol: string, base: string) => {
          const normalized = normalizeSymbol(symbol);
          if (!normalizedQuery) return 0;
          if (base === normalizedQuery) return 0;
          if (normalized === normalizedQuery) return 1;
          if (base.startsWith(normalizedQuery)) return 2;
          if (normalized.startsWith(normalizedQuery)) return 3;
          return 4;
        };

        return score(a, baseA) - score(b, baseB) || a.localeCompare(b);
      })
      .slice(0, 20);
  }, [categoryFilter, debouncedQuery, quoteFilter, symbols]);

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
    categoryFilter,
    quoteFilter,
    listRef,
    commit,
    handleBlur,
    handleKeyDown,
    handleListMouseDown,
    handleQueryChange,
    setCategoryFilter,
    setCursor,
    setOpen,
    setQuoteFilter,
  };
}
