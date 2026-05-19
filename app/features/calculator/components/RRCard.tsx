'use client';

import { memo, useEffect, useMemo, useRef, useState } from 'react';
import {
  Card,
  DirBtns,
  InputRow,
  MetricBox,
  MetricGrid,
  miniInputClass,
  NumInput,
  PanelHeader,
  PillBtn,
  PillGroup,
  settingsInputClass,
} from '@/components/ui';
import {
  calculateAtrTrailDisplay,
  calculatePartialTakeProfitsAsync,
  calculateRiskReward,
  calculateRiskRewardAsync,
  calculateSizeFromTokens,
  calculateTokensFromSize,
  parseFiniteNumber,
  RR_PRESETS,
  updatePartialTakeProfitPct,
  updatePartialTakeProfitRatio,
} from '@/features/calculator/services/riskRewardService';
import { fmtPrice } from '@/lib/indicators';
import { useStore } from '@/lib/store';
import type { PartialTP } from '@/lib/store';

const TP_GRID = 'grid grid-cols-[36px_1fr_80px_60px_72px_28px] gap-1 items-center';

function TPListContent({
  partialTPs,
  entry,
  updateTPRatio,
  updateTPPct,
  toggleTPHit,
}: {
  partialTPs: PartialTP[];
  entry: number;
  updateTPRatio: (index: number, value: string) => void;
  updateTPPct: (index: number, value: string) => void;
  toggleTPHit: (index: number) => void;
}) {
  const totalPnlIfAll = useMemo(
    () => partialTPs.reduce((s, t) => s + t.pnlUsd, 0),
    [partialTPs]
  );
  const realised = useMemo(
    () => partialTPs.filter((t) => t.hit).reduce((s, t) => s + t.pnlUsd, 0),
    [partialTPs]
  );

  return (
    <div className="mb-3.5">
      <div className="text-10px font-mono font-semibold text-text2 tracking-wide uppercase mb-1.5">
        Partial Take-Profits
      </div>
      <div className={`${TP_GRID} mb-1 pr-0.5`}>
        {['', 'Price', 'RR ×', '% Size', 'P&L $', '✓'].map((h) => (
          <div key={h} className="text-9px font-mono text-text3 uppercase tracking-wide">
            {h}
          </div>
        ))}
      </div>

      {partialTPs.map((tp, i) => (
        <div
          key={i}
          className={`${TP_GRID} mb-1.5 px-2 py-1.5 rounded-sm border transition-all ${
            tp.hit
              ? 'bg-green-bg border-green/20 opacity-70'
              : 'bg-bg3 border-border opacity-100'
          }`}
        >
          <span className="text-10px font-mono font-bold text-green">TP{i + 1}</span>
          <span
            className={`text-xs font-mono font-bold ${
              tp.hit ? 'text-text3 line-through' : 'text-green'
            }`}
          >
            {entry > 0 ? fmtPrice(tp.price) : '—'}
          </span>
          <input
            type="number"
            value={tp.ratio}
            step={0.1}
            min={0.1}
            onChange={(e) => updateTPRatio(i, e.target.value)}
            className={miniInputClass}
          />
          <input
            type="number"
            value={tp.pct}
            step={1}
            min={1}
            max={100}
            onChange={(e) => updateTPPct(i, e.target.value)}
            className={miniInputClass}
          />
          <span
            className={`text-11px font-mono font-semibold ${tp.hit ? 'text-text3' : 'text-green'}`}
          >
            {entry > 0 ? `+$${tp.pnlUsd.toFixed(2)}` : '—'}
          </span>
          <button
            type="button"
            onClick={() => toggleTPHit(i)}
            title={tp.hit ? 'Mark as not hit' : 'Mark as hit'}
            className={`w-[22px] h-[22px] rounded flex items-center justify-center text-11px font-mono font-bold border transition-all ${
              tp.hit
                ? 'border-green bg-green-bg text-green'
                : 'border-border2 bg-bg4 text-text3'
            }`}
          >
            {tp.hit ? '✓' : '○'}
          </button>
        </div>
      ))}

      {entry > 0 && partialTPs.length > 0 && (
        <div className="flex items-center justify-between px-2 py-1.5 bg-bg3 rounded-sm border border-border text-10px font-mono gap-2">
          <span className="text-text3">All TPs hit</span>
          <span className="text-green font-bold">+${totalPnlIfAll.toFixed(2)}</span>
          {realised > 0 && (
            <>
              <span className="text-text3">Realised</span>
              <span className="text-green font-bold">+${realised.toFixed(2)}</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}

const TPList = memo(TPListContent);

export default function RRCard() {
  const {
    currentDir,
    setCurrentDir,
    rrRatio,
    setRrRatio,
    entryPrice,
    setEntryPrice,
    stopPrice,
    setStopPrice,
    sizeUsd,
    setSizeUsd,
    tokens,
    setTokens,
    livePrice,
    sym,
    partialTPs,
    setPartialTPs,
    toggleTPHit,
    atrTrailMult,
    setAtrTrailMult,
    atrTrailActive,
    setAtrTrailActive,
    trailingStopPrice,
    atrVals,
  } = useStore();

  const [localEntry, setLocalEntry] = useState(entryPrice);
  const [localStop, setLocalStop] = useState(stopPrice);
  const [localSize, setLocalSize] = useState(sizeUsd);
  const [localTokens, setLocalTokens] = useState(tokens);
  const [workerResult, setWorkerResult] = useState<ReturnType<typeof calculateRiskReward> | null>(null);
  const commitTimer = useRef<number | null>(null);
  const previousPartialTpsRef = useRef(partialTPs);

  useEffect(() => {
    previousPartialTpsRef.current = partialTPs;
  }, [partialTPs]);

  useEffect(() => setLocalEntry(entryPrice), [entryPrice]);
  useEffect(() => setLocalStop(stopPrice), [stopPrice]);
  useEffect(() => setLocalSize(sizeUsd), [sizeUsd]);
  useEffect(() => setLocalTokens(tokens), [tokens]);

  useEffect(() => {
    if (commitTimer.current) window.clearTimeout(commitTimer.current);
    commitTimer.current = window.setTimeout(() => {
      setEntryPrice(localEntry);
      setStopPrice(localStop);
      setSizeUsd(localSize);
      setTokens(localTokens);
      commitTimer.current = null;
    }, 300);
    return () => {
      if (commitTimer.current) window.clearTimeout(commitTimer.current);
    };
  }, [localEntry, localStop, localSize, localTokens, setEntryPrice, setStopPrice, setSizeUsd, setTokens]);

  const syncResult = calculateRiskReward({
    currentDir,
    rrRatio,
    entryPrice: localEntry,
    stopPrice: localStop,
    sizeUsd: localSize,
    tokens: localTokens,
    sym,
  });

  const result = workerResult ?? syncResult;

  const {
    entry,
    stop,
    size,
    tokenAmount: tok,
    isLong,
    riskPerUnit: r,
    target,
    breakEven: be,
    riskUsdLabel: riskUSD,
    rewardUsdLabel: rwdUSD,
    ticker,
    rrLabel,
    riskBarPct: rp,
  } = result;

  useEffect(() => {
    let mounted = true;
    setWorkerResult(null);
    calculateRiskRewardAsync({
      currentDir,
      rrRatio,
      entryPrice: localEntry,
      stopPrice: localStop,
      sizeUsd: localSize,
      tokens: localTokens,
      sym,
    }).then((res) => {
      if (mounted) setWorkerResult(res);
    });
    return () => {
      mounted = false;
    };
  }, [currentDir, rrRatio, localEntry, localStop, localSize, localTokens, sym]);

  const syncTokens = (e: string, s: string) => {
    const nextTokens = calculateTokensFromSize(e, s);
    if (nextTokens) setLocalTokens(nextTokens);
  };

  const handleEntryChange = (v: string) => {
    setLocalEntry(v);
    syncTokens(v, localSize);
  };
  const handleStopChange = (v: string) => {
    setLocalStop(v);
  };
  const handleSizeChange = (v: string) => {
    setLocalSize(v);
    const nextTokens = calculateTokensFromSize(localEntry, v);
    if (nextTokens) setLocalTokens(nextTokens);
  };
  const handleTokensChange = (v: string) => {
    setLocalTokens(v);
    const nextSize = calculateSizeFromTokens(localEntry, v);
    if (nextSize) setLocalSize(nextSize);
  };
  const useLivePrice = () => {
    if (!livePrice) return;
    handleEntryChange(livePrice.toFixed(livePrice > 100 ? 2 : 4));
  };

  useEffect(() => {
    let mounted = true;
    calculatePartialTakeProfitsAsync({
      previousTps: previousPartialTpsRef.current,
      entry: result.entry,
      stop: result.stop,
      tokenAmount: result.tokenAmount,
      isLong: result.isLong,
    }).then((tps) => {
      if (!mounted) return;
      if (!tps.length) return;
      setPartialTPs(tps);
    });
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result.entry, result.stop, result.tokenAmount, result.isLong]);

  const lastAtr = atrVals.length ? atrVals[atrVals.length - 1] : null;
  const atrTrailDisplay = calculateAtrTrailDisplay(entry, isLong, lastAtr, atrTrailMult);

  const updateTPRatio = (idx: number, val: string) => {
    const ratio = parseFiniteNumber(val, Number.NaN);
    const tps = partialTPs.map((t, i) => {
      if (i !== idx) return t;
      return updatePartialTakeProfitRatio(t, ratio, entry, stop, tok, isLong) ?? t;
    });
    setPartialTPs(tps);
  };

  const updateTPPct = (idx: number, val: string) => {
    const pct = parseFiniteNumber(val, Number.NaN);
    const tps = partialTPs.map((t, i) => {
      if (i !== idx) return t;
      return updatePartialTakeProfitPct(t, pct, entry, tok) ?? t;
    });
    setPartialTPs(tps);
  };


  return (
    <Card>
      <PanelHeader title="⚖ R:R Calculator" actions={<DirBtns dir={currentDir} onChange={setCurrentDir} />} />

      <InputRow label="Entry">
        <NumInput value={localEntry} onChange={handleEntryChange} step={0.01} />
        <button
          type="button"
          onClick={useLivePrice}
          className={`${settingsInputClass} shrink-0 whitespace-nowrap py-1.5 px-2.5 text-10px text-text2 hover:text-text`}
        >
          ⟳ Live
        </button>
      </InputRow>
      <InputRow label="Stop Loss">
        <NumInput value={localStop} onChange={handleStopChange} step={0.01} />
      </InputRow>
      <InputRow label="Size ($)">
        <NumInput value={localSize} onChange={handleSizeChange} step={1} />
      </InputRow>
      <InputRow label="Tokens" style={{ marginBottom: 4 }}>
        <NumInput value={localTokens} onChange={handleTokensChange} step={0.0001} placeholder="auto" />
      </InputRow>
      <p className="text-10px font-mono text-text3 mb-3 pl-24">Size ($) ÷ Entry = Tokens · edit either to sync</p>

      <InputRow label="R:R Ratio" style={{ marginBottom: 6 }}>
        <NumInput
          value={rrRatio}
          onChange={(v) => setRrRatio(parseFloat(v) || 2)}
          step={0.1}
          min={0.5}
          max={10}
          style={{ width: 70, flex: 'none' }}
        />
        <PillGroup style={{ flex: 1, marginLeft: 4 }}>
          {RR_PRESETS.map((preset) => (
            <PillBtn key={preset} active={rrRatio === preset} onClick={() => setRrRatio(preset)}>
              1:{preset}
            </PillBtn>
          ))}
        </PillGroup>
      </InputRow>

      <MetricGrid columns={3} style={{ marginBottom: 10 }}>
        <MetricBox
          label="Risk / unit"
          value={fmtPrice(r)}
          sub={tok > 0 ? `${tok.toFixed(4)} ${ticker} = $${riskUSD}` : `$${size}`}
        />
        <MetricBox
          label={`${rrLabel} Target`}
          value={fmtPrice(target)}
          sub={`${isLong ? '+' : '-'}$${rwdUSD}`}
          valueColor={isLong ? 'var(--green)' : 'var(--red)'}
        />
        <MetricBox label="Break-even" value={fmtPrice(be)} sub="1:1 level" />
      </MetricGrid>

      <div className="mb-3.5">
        <div className="flex justify-between text-10px font-mono text-text2 mb-0.5">
          <span>Risk ${riskUSD}</span>
          <span className="text-text">{rrLabel}</span>
          <span className="text-green">Reward ${rwdUSD}</span>
        </div>
        <div className="h-[7px] rounded border border-border bg-bg3 overflow-hidden flex">
          <div className="bg-red transition-[width] duration-300" style={{ width: `${rp}%` }} />
          <div className="flex-1 bg-green transition-all duration-300" />
        </div>
      </div>

      <TPList
        partialTPs={partialTPs}
        entry={entry}
        updateTPRatio={updateTPRatio}
        updateTPPct={updateTPPct}
        toggleTPHit={toggleTPHit}
      />

      <div className="bg-bg3 rounded-sm border border-border px-3 py-2.5 mb-1.5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-10px font-mono font-semibold text-text2 tracking-wide uppercase">
            ATR Trailing Stop
          </span>
          <button
            type="button"
            onClick={() => setAtrTrailActive(!atrTrailActive)}
            className={`px-2.5 py-0.5 text-10px font-mono font-bold rounded-full cursor-pointer border transition-all ${
              atrTrailActive
                ? 'border-amber bg-amber/10 text-amber'
                : 'border-border2 bg-transparent text-text3'
            }`}
          >
            {atrTrailActive ? '● ACTIVE' : '○ OFF'}
          </button>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="text-10px font-mono text-text2 w-16 shrink-0">Multiplier</span>
          <input
            type="range"
            min={0.5}
            max={5}
            step={0.1}
            value={atrTrailMult}
            onChange={(e) => setAtrTrailMult(parseFloat(e.target.value))}
            className="flex-1 h-1 rounded-sm cursor-pointer appearance-none"
            style={{
              background: `linear-gradient(90deg, var(--amber) 0%, var(--amber) ${((atrTrailMult - 0.5) / 4.5) * 100}%, var(--bg4) ${((atrTrailMult - 0.5) / 4.5) * 100}%)`,
            }}
          />
          <span className="text-[13px] font-mono font-bold text-amber min-w-8 text-right">
            {atrTrailMult}×
          </span>
        </div>

        {lastAtr !== null && (
          <div className="flex gap-3 mt-2 flex-wrap text-10px font-mono text-text3">
            <div>
              ATR <span className="text-text2 font-semibold">{fmtPrice(lastAtr)}</span>
            </div>
            <div>
              Initial trail{' '}
              <span className="text-amber font-semibold">
                {entry > 0 && atrTrailDisplay !== null ? fmtPrice(atrTrailDisplay) : '—'}
              </span>
            </div>
            {trailingStopPrice !== null && atrTrailActive && (
              <div>
                Live trail{' '}
                <span className="text-green font-bold">{fmtPrice(trailingStopPrice)}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
