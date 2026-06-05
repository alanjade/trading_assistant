'use client';

import { STATUS_DOT_CLASS } from '../constants';
import { useRef } from 'react';
import { PillBtnSm } from '@/components/ui';
import CommandPalette, { useKeyboardShortcuts } from '@/components/ui/CommandPalette';
import { toast } from '@/components/ui/Toast';
import SymbolSearch from '@/features/market/components/SymbolSearch';
import { PRESET_SYMS, TIMEFRAMES } from '@/features/market/symbols';
import { useSyncStatus } from '@/lib/hooks/useSyncStatus';
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
  const syncStatus = useSyncStatus();

  const priceFlash = livePrice >= prevLivePrice ? 'flash-green' : 'flash-red';
  const dayChgPct = openPrice > 0 ? ((livePrice - openPrice) / openPrice) * 100 : 0;
  const dayChgClass = dayChgPct >= 0 ? 'text-green' : 'text-red';

  const handleSymbolSelect = (symbol: string) => {
    setSym(symbol);
    toast.info(`Loaded ${fmtSymDisplay(symbol)}`);
  };

  return (
    <>
      <header className="sticky top-0 z-[100] flex flex-wrap items-center gap-2.5 border-b border-border/80 bg-bg2/95 px-3.5 py-3 shadow-[0_8px_24px_rgba(0,0,0,0.25)] backdrop-blur-md">
        <span className="mr-1 shrink-0 rounded-full border border-accent/25 bg-green/8 px-2.5 py-1 text-[13px] font-mono font-bold tracking-[0.18em] text-accent uppercase">
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
            className="flex items-center gap-1 rounded-sm border border-border2 bg-bg3/90 px-2.5 py-1 text-10px font-mono font-semibold text-text2 transition-all hover:border-accent/40 hover:bg-bg4 hover:text-text"
          >
            Indicators
          </button>
        )}

        <button
          ref={paletteButtonRef}
          type="button"
          onClick={paletteOpen ? onClosePalette : onOpenPalette}
          title="Command palette (Cmd+K)"
          className={`flex items-center gap-1 rounded-sm border px-2 py-1 text-10px font-mono transition-all ${
            paletteOpen
              ? 'border-accent bg-green-bg text-accent shadow-[0_0_0_1px_rgba(0,229,160,0.18)]'
              : 'border-border2 bg-bg3/90 text-text3 hover:border-accent/35 hover:bg-bg4 hover:text-text'
          }`}
        >
          {paletteOpen ? '✕ Close' : 'Cmd+K'}
        </button>

        <div className="ml-auto flex flex-wrap items-center gap-2.5">
          {openPrice > 0 && (
            <span className={`day-change text-11px font-mono font-semibold ${dayChgClass}`}>
              {dayChgPct >= 0 ? '+' : ''}
              {dayChgPct.toFixed(2)}%
            </span>
          )}
          <span className={`live-price rounded-md border border-border/70 bg-bg3/80 px-2 py-1 text-xl font-mono font-bold shadow-sm ${priceFlash}`}>
            {livePrice > 0 ? fmtPrice(livePrice) : '-'}
          </span>
          <span className="text-10px font-mono text-text2">USDT</span>
        </div>

        <div className="flex items-center gap-1 shrink-0 rounded-full border border-border/80 bg-bg3/90 px-2.5 py-1 shadow-sm">
          <div
            className={`w-[7px] h-[7px] rounded-full shrink-0 ${
              STATUS_DOT_CLASS[connStatus] ?? 'bg-text3'
            }`}
          />
          <span className="conn-label text-10px font-mono text-text2">{connLabel}</span>
        </div>

        <div
          className={`flex items-center gap-1 shrink-0 rounded-full border px-2.5 py-1 shadow-sm ${
            syncStatus.online
              ? syncStatus.pending > 0
                ? 'border-amber/50 bg-bg3 text-amber'
                : 'border-border/80 bg-bg3/90 text-text2'
              : 'border-red/50 bg-red-bg text-red'
          }`}
          title={
            syncStatus.online
              ? syncStatus.pending > 0
                ? `${syncStatus.pending} local change${syncStatus.pending === 1 ? '' : 's'} queued`
                : 'Local changes are synced'
              : 'Offline mode: local changes will sync when online'
          }
          aria-live="polite"
        >
          <span className="text-10px font-mono">
            {!syncStatus.online
              ? 'Offline'
              : syncStatus.syncing
                ? 'Syncing'
                : syncStatus.pending > 0
                  ? `Queued ${syncStatus.pending}`
                  : 'Synced'}
          </span>
        </div>
      </header>

      <CommandPalette open={paletteOpen} onClose={onClosePalette} anchorRef={paletteButtonRef} />
    </>
  );
}
