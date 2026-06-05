'use client';

import {
  getSymbolBase,
  getSymbolQuote,
  normalizeSymbol,
  useSymbolSearch,
  type SymbolCategoryFilter,
  type SymbolQuoteFilter,
} from '../hooks/useSymbolSearch';
import { ALL_SYMS } from '../symbols';
import { AnimatePresence, motion } from 'framer-motion';
import type { RefObject } from 'react';
import { fmtSymDisplay } from '@/lib/indicators';

interface SymbolSearchProps {
  sym: string;
  onSelect: (symbol: string) => void;
  inputRef?: RefObject<HTMLInputElement | null>;
}

const quoteFilters: Array<{ id: SymbolQuoteFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'USDT', label: 'USDT' },
  { id: 'BTC', label: 'BTC' },
  { id: 'ETH', label: 'ETH' },
];

const categoryFilters: Array<{ id: SymbolCategoryFilter; label: string }> = [
  { id: 'all', label: 'Any' },
  { id: 'majors', label: 'Majors' },
  { id: 'layer1', label: 'L1' },
  { id: 'defi', label: 'DeFi' },
  { id: 'ai', label: 'AI' },
  { id: 'meme', label: 'Meme' },
];

export default function SymbolSearch({ sym, onSelect, inputRef }: SymbolSearchProps) {
  const {
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
  } = useSymbolSearch({ symbols: ALL_SYMS, onSelect });

  const hasActiveFilters = quoteFilter !== 'all' || categoryFilter !== 'all';
  const listboxId = 'symbol-search-results';
  const activeOptionId =
    cursor >= 0 && filtered[cursor] ? `symbol-option-${filtered[cursor]}` : undefined;

  return (
    <div className="relative shrink-0" data-onboard="symbol-search">
      <input
        ref={inputRef}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-activedescendant={activeOptionId}
        aria-label="Search trading pair"
        value={query}
        placeholder={fmtSymDisplay(sym)}
        onChange={(event) => handleQueryChange(event.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        autoComplete="off"
        spellCheck={false}
        className={`w-[120px] px-2 py-1.5 text-11px font-mono font-semibold bg-bg3 text-text rounded-sm outline-none tracking-wider transition-colors ${
          open ? 'border border-accent' : 'border border-border2'
        }`}
      />
      <AnimatePresence>
        {open && (
          <motion.div
            ref={listRef}
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.14, ease: 'easeOut' }}
            onMouseDown={handleListMouseDown}
            id={listboxId}
            role="listbox"
            aria-label="Symbol search results"
            className="absolute top-[calc(100%+4px)] left-0 z-[200] bg-bg2 border border-border2 rounded-sm max-h-[320px] overflow-y-auto min-w-[260px] shadow-[0_8px_32px_rgba(0,0,0,0.5)]"
          >
            <div className="border-b border-border px-2.5 py-2">
              <div className="mb-1.5 text-9px font-mono text-text3 uppercase tracking-widest">
                Quote
              </div>
              <div className="mb-2 flex flex-wrap gap-1">
                {quoteFilters.map((filter) => (
                  <button
                    key={filter.id}
                    type="button"
                    aria-pressed={quoteFilter === filter.id}
                    onMouseDown={(event) => {
                      event.preventDefault();
                      setQuoteFilter(filter.id);
                      setCursor(-1);
                    }}
                    className={`rounded-sm border px-2 py-1 font-mono text-9px font-semibold ${
                      quoteFilter === filter.id
                        ? 'border-accent bg-green-bg text-accent'
                        : 'border-border2 bg-bg3 text-text3'
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
              <div className="mb-1.5 text-9px font-mono text-text3 uppercase tracking-widest">
                Segment
              </div>
              <div className="flex flex-wrap gap-1">
                {categoryFilters.map((filter) => (
                  <button
                    key={filter.id}
                    type="button"
                    aria-pressed={categoryFilter === filter.id}
                    onMouseDown={(event) => {
                      event.preventDefault();
                      setCategoryFilter(filter.id);
                      setCursor(-1);
                    }}
                    className={`rounded-sm border px-2 py-1 font-mono text-9px font-semibold ${
                      categoryFilter === filter.id
                        ? 'border-accent bg-green-bg text-accent'
                        : 'border-border2 bg-bg3 text-text3'
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>

            {filtered.length > 0 ? (
              <>
                <div className="px-3 pt-1.5 pb-0.5 text-9px font-mono text-text3 uppercase tracking-widest">
                  {query.trim() || hasActiveFilters ? 'Filtered symbols' : 'Popular symbols'}
                </div>
                {filtered.map((symbol, index) => {
                  const highlighted = index === cursor;
                  const isActive = symbol === sym;
                  return (
                    <motion.div
                      key={symbol}
                      id={`symbol-option-${symbol}`}
                      role="option"
                      aria-selected={highlighted || isActive}
                      layout
                      initial={{ opacity: 0, x: -4 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.12, delay: Math.min(index, 6) * 0.015 }}
                      onMouseEnter={() => setCursor(index)}
                      onMouseDown={() => commit(symbol)}
                      className={`px-3 py-1.5 text-11px font-mono cursor-pointer flex items-center justify-between gap-3 ${
                        isActive ? 'text-accent' : 'text-text'
                      } ${highlighted ? 'bg-bg3' : isActive ? 'bg-green-bg' : 'bg-transparent'}`}
                    >
                      <span>{fmtSymDisplay(symbol)}</span>
                      <span className="ml-auto text-9px text-text3">
                        {getSymbolBase(symbol)} / {getSymbolQuote(symbol)}
                      </span>
                      {isActive && <span className="text-9px text-accent">active</span>}
                    </motion.div>
                  );
                })}
              </>
            ) : query.trim() ? (
              <div className="px-3 py-2">
                <div className="text-9px font-mono text-text3 uppercase tracking-widest mb-1.5">
                  Custom pair
                </div>
                <div
                  onMouseDown={() => commit(query.trim())}
                  className="py-1.5 text-11px font-mono cursor-pointer text-accent flex items-center justify-between"
                >
                  <span>Load {customSymbol || normalizeSymbol(query.trim())}</span>
                  <span className="text-9px text-text3">Enter</span>
                </div>
              </div>
            ) : (
              <div className="px-3 py-2.5 text-10px font-mono text-text3">
                Adjust filters or type a symbol...
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
