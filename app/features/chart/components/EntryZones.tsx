'use client';

import { AccentCard, ActionBtn, Badge, PanelHeader } from '@/components/ui';
import { fmtPrice } from '@/lib/indicators';
import { useStore } from '@/lib/store';

export default function EntryZones() {
  const { e9, e20, livePrice, suggestion, setEntryPrice, setStopPrice, setCurrentDir } = useStore();

  if (!e9 || !e20 || !livePrice) {
    return (
      <AccentCard colors="linear-gradient(90deg,var(--ema9),var(--ema20),var(--ema50))">
        <p className="font-mono text-11px text-text3">Waiting for chart data...</p>
      </AccentCard>
    );
  }

  const dir = suggestion?.dir ?? 'long';
  const aggressive = e9;
  const balanced = (e9 + e20) / 2;
  const conservative = e20;

  const zones = [
    { key: 'aggressive', price: aggressive, dotClass: 'bg-ema9' },
    { key: 'balanced', price: balanced, dotClass: 'bg-ema20' },
    { key: 'conservative', price: conservative, dotClass: 'bg-ema50' },
  ];

  const applyZone = (price: number) => {
    if (!price) return;
    setCurrentDir(dir);
    const decimals = price > 100 ? 2 : 4;
    setEntryPrice(price.toFixed(decimals));
    if (suggestion?.stop) setStopPrice(suggestion.stop.toFixed(suggestion.stop > 100 ? 2 : 4));
  };

  const dirColor = dir === 'long' ? 'var(--green)' : 'var(--red)';
  const dirBg = dir === 'long' ? 'rgba(0,229,160,0.1)' : 'rgba(255,61,90,0.1)';

  const missCount = zones.filter((zone) =>
    dir === 'long' ? zone.price > livePrice : zone.price < livePrice
  ).length;

  let note = '';
  if (dir === 'long') {
    if (livePrice < aggressive) {
      note = 'Price is below all EMA zones — pullback entry may have occurred. Watch for bounce.';
    } else if (missCount === 0) {
      note = `All 3 zones are below current price — wait for a pullback. ${fmtPrice(conservative)} (EMA20) offers best R/R on deeper dip.`;
    } else {
      note = `${missCount} zone${missCount > 1 ? 's' : ''} below price. Aggressive entry at EMA9 (${fmtPrice(aggressive)}) if momentum holds.`;
    }
  } else if (livePrice > aggressive) {
    note = 'Price is above all EMA zones — pullback entry may have occurred. Watch for rejection.';
  } else if (missCount === 0) {
    note = `All 3 zones are above current price — wait for a bounce up. ${fmtPrice(conservative)} offers best R/R on retest.`;
  } else {
    note = `${missCount} zone${missCount > 1 ? 's' : ''} above price. Aggressive short at EMA9 (${fmtPrice(aggressive)}) on rejection.`;
  }

  return (
    <AccentCard colors="linear-gradient(90deg,var(--ema9),var(--ema20),var(--ema50))">
      <PanelHeader
        title="Entry Zones"
        actions={
          <Badge color={dirColor} bg={dirBg} border={`${dirColor}33`}>
            {dir === 'long' ? 'LONG PULLBACK' : 'SHORT PULLBACK'}
          </Badge>
        }
      />

      {zones.map((zone) => {
        const distPct = ((zone.price - livePrice) / livePrice) * 100;
        const distStr = `${distPct >= 0 ? '+' : ''}${distPct.toFixed(2)}%`;
        const isAbove = zone.price > livePrice;
        const distClass =
          dir === 'long'
            ? isAbove
              ? 'text-text3'
              : 'text-green'
            : isAbove
              ? 'text-red'
              : 'text-text3';

        return (
          <div
            key={zone.key}
            className="flex items-center gap-2 mb-1.5 px-2.5 py-2 rounded-sm border border-border bg-bg3"
          >
            <div className={`w-2 h-2 rounded-full shrink-0 ${zone.dotClass}`} />
            <span className="font-mono text-9px uppercase tracking-wide text-text3 w-20 shrink-0">
              {zone.key}
            </span>
            <span className="font-mono text-[15px] font-bold flex-1">{fmtPrice(zone.price)}</span>
            <span className={`font-mono text-10px min-w-16 text-right ${distClass}`}>{distStr} away</span>
            <ActionBtn
              onClick={() => applyZone(zone.price)}
              className="whitespace-nowrap px-2.5 py-1 text-10px"
            >
              Apply
            </ActionBtn>
          </div>
        );
      })}

      <p className="font-mono text-10px leading-relaxed text-text3 px-2.5 py-2 rounded-sm border border-border bg-bg3 mt-1">
        {note}
      </p>
    </AccentCard>
  );
}
