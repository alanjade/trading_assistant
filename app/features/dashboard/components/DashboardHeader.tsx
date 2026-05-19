'use client';

import { STATUS_DOT_CLASS } from '../constants';
import { useRef } from 'react';
import CommandPalette, { useKeyboardShortcuts } from '@/components/ui/CommandPalette';
import { PillBtnSm } from '@/components/ui';
import { toast } from '@/components/ui/Toast';
import SymbolSearch from '@/features/market/components/SymbolSearch';
import { PRESET_SYMS, TIMEFRAMES } from '@/features/market/symbols';
import { fmtPrice, fmtSymDisplay } from '@/lib/indicators';
import { useStore } from '@/lib/store';

interface DashboardHeaderProps {
  onOpenIndicators: () => void;
  paletteOpen: boolean;
  onOpenPalette: () => void;
  onClosePalette: () => void;
}

export default function DashboardHeader({
  onOpenIndicators,
  paletteOpen,
  onOpenPalette,
  onClosePalette,
}: DashboardHeaderProps) {
  const {
    sym,
    setSym,
    tf,
    setTf,
    livePrice,
    prevLivePrice,
    openPrice,
    connStatus,
    connLabel,
    activeTab,
  } = useStore();

  const symbolInputRef = useRef<HTMLInputElement>(null);
  useKeyboardShortcuts(onOpenPalette, symbolInputRef);
  const paletteButtonRef = useRef<HTMLButtonElement>(null);

  const priceFlash = livePrice >= prevLivePrice ? 'flash-green' : 'flash-red';
  const dayChgPct = openPrice > 0 ? ((livePrice - openPrice) / openPrice) * 100 : 0;
  const dayChgClass = dayChgPct >= 0 ? 'text-green' : 'text-red';

  const handleSymbolSelect = (symbol: string) => {
    setSym(symbol);
    toast.info(`Loaded ${fmtSymDisplay(symbol)}`);
  };

  return (
    <>
      <header className="flex items-center gap-2.5 flex-wrap px-3.5 py-2 border-b border-border bg-bg2 sticky top-0 z-[100]">
        <span className="text-[13px] font-mono font-bold text-accent tracking-wide shrink-0 mr-1">
          TradeAssist
        </span>

        <div className="flex items-center gap-1.5 flex-wrap">
          <SymbolSearch sym={sym} onSelect={handleSymbolSelect} inputRef={symbolInputRef} />
          <div className="flex gap-0.5 flex-wrap">
            {PRESET_SYMS.map((symbol) => (
              <PillBtnSm
                key={symbol}
                active={sym === symbol}
                accent={sym === symbol}
                onClick={() => handleSymbolSelect(symbol)}
              >
                {symbol.replace('USDT', '')}
              </PillBtnSm>
            ))}
          </div>
        </div>

        <div className="w-px h-5 bg-border2 shrink-0 mx-0.5" />

        <div className="flex gap-0.5" data-onboard="timeframe">
          {TIMEFRAMES.map((timeframe) => (
            <PillBtnSm
              key={timeframe}
              active={tf === timeframe}
              onClick={() => {
                setTf(timeframe);
                toast.info(`Timeframe -> ${timeframe}`);
              }}
            >
              {timeframe}
            </PillBtnSm>
          ))}
        </div>

        {activeTab === 'chart' && (
          <button
            type="button"
            onClick={onOpenIndicators}
            title="Configure indicators"
            data-onboard="indicators-btn"
            className="flex items-center gap-1 px-2.5 py-1 text-10px font-mono font-semibold rounded-sm cursor-pointer border border-border2 bg-bg3 text-text2 transition-all hover:text-text"
          >
            Indicators
          </button>
        )}

        <button
          ref={paletteButtonRef}
          type="button"
          onClick={paletteOpen ? onClosePalette : onOpenPalette}
          title="Command palette (Cmd+K)"
          className={`flex items-center gap-1 px-2 py-1 text-10px font-mono rounded-sm cursor-pointer border transition-all ${
            paletteOpen
              ? 'border-accent bg-green-bg text-accent'
              : 'border-border2 bg-bg3 text-text3'
          }`}
        >
          {paletteOpen ? '✕ Close' : 'Cmd+K'}
        </button>

        <div className="ml-auto flex items-center gap-2.5 flex-wrap">
          {openPrice > 0 && (
            <span className={`day-change text-11px font-mono font-semibold ${dayChgClass}`}>
              {dayChgPct >= 0 ? '+' : ''}
              {dayChgPct.toFixed(2)}%
            </span>
          )}
          <span className={`live-price text-xl font-mono font-bold ${priceFlash}`}>
            {livePrice > 0 ? fmtPrice(livePrice) : '-'}
          </span>
          <span className="text-10px font-mono text-text2">USDT</span>
        </div>

        <div className="flex items-center gap-1 shrink-0 px-2.5 py-1 bg-bg3 border border-border rounded-full">
          <div
            className={`w-[7px] h-[7px] rounded-full shrink-0 ${
              STATUS_DOT_CLASS[connStatus] ?? 'bg-text3'
            }`}
          />
          <span className="conn-label text-10px font-mono text-text2">{connLabel}</span>
        </div>
      </header>

      <CommandPalette open={paletteOpen} onClose={onClosePalette} anchorRef={paletteButtonRef} />
    </>
  );
}
