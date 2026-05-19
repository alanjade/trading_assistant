'use client';

import { normalizeSymbol, useSymbolSearch } from '../hooks/useSymbolSearch';
import { ALL_SYMS } from '../symbols';
import type { RefObject } from 'react';
import { fmtSymDisplay } from '@/lib/indicators';

interface SymbolSearchProps {
  sym: string;
  onSelect: (symbol: string) => void;
  inputRef?: RefObject<HTMLInputElement | null>;
}

export default function SymbolSearch({ sym, onSelect, inputRef }: SymbolSearchProps) {
  const {
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
  } = useSymbolSearch({ symbols: ALL_SYMS, onSelect });

  return (
    <div className="relative shrink-0" data-onboard="symbol-search">
      <input
        ref={inputRef}
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
      {open && (
        <div
          ref={listRef}
          onMouseDown={handleListMouseDown}
          className="absolute top-[calc(100%+4px)] left-0 z-[200] bg-bg2 border border-border2 rounded-sm max-h-60 overflow-y-auto min-w-40 shadow-[0_8px_32px_rgba(0,0,0,0.5)]"
        >
          {filtered.length > 0 ? (
            <>
              <div className="px-3 pt-1.5 pb-0.5 text-9px font-mono text-text3 uppercase tracking-widest">
                Search results
              </div>
              {filtered.map((symbol, index) => {
                const highlighted = index === cursor;
                const isActive = symbol === sym;
                return (
                  <div
                    key={symbol}
                    onMouseEnter={() => setCursor(index)}
                    onMouseDown={() => commit(symbol)}
                    className={`px-3 py-1.5 text-11px font-mono cursor-pointer flex items-center justify-between gap-2 ${
                      isActive ? 'text-accent' : 'text-text'
                    } ${
                      highlighted
                        ? 'bg-bg3'
                        : isActive
                          ? 'bg-green-bg'
                          : 'bg-transparent'
                    }`}
                  >
                    <span>{fmtSymDisplay(symbol)}</span>
                    {isActive && <span className="text-9px text-accent">active</span>}
                  </div>
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
              Type a symbol to search...
            </div>
          )}
        </div>
      )}
    </div>
  );
}
