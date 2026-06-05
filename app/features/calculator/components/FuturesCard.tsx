'use client';

import { memo, useEffect, useState, useRef } from 'react';
import {
  AccentCard,
  FieldLabel,
  MetricBox,
  MetricGrid,
  NumInput,
  PanelHeader,
  SegmentBtn,
} from '@/components/ui';
import { calculateFutures, calculateFuturesAsync } from '@/features/calculator/services/riskRewardService';
import { fmtPrice } from '@/lib/indicators';
import { useStore } from '@/lib/store';

export default memo(function FuturesCard() {
  const {
    leverage,
    setLeverage,
    feeType,
    setFeeType,
    entryPrice,
    stopPrice,
    margin,
    setMargin,
    capital,
    setCapital,
  } = useStore();

  const [marginMode, setMarginMode] = useState<'isolated' | 'cross'>('isolated');

  const {
    entry,
    marginAmount: mar,
    positionSize: posSize,
    feeTotal: feeTot,
    feeOpen,
    feeClose,
    liquidationDistancePct: liqDistPct,
    liquidationPrice: liqPrice,
    liquidationBarPct: liqPct,
    liquidationColor: liqCol,
    danger,
    showWarning: showWarn,
    leveragePct: levPct,
    profit,
    loss,
    roiWin,
    roiLoss,
    breakEven: be,
    riskPct,
  } = calculateFutures({ entryPrice, stopPrice, capital, margin, leverage, feeType, marginMode });

  // Local debounced inputs for smoother typing
  const [localCapital, setLocalCapital] = useState(capital);
  const [localMargin, setLocalMargin] = useState(margin);
  const commitTimer = useRef<number | null>(null);

  useEffect(() => {
    setLocalCapital(capital);
  }, [capital]);
  useEffect(() => {
    setLocalMargin(margin);
  }, [margin]);

  useEffect(() => {
    if (commitTimer.current) window.clearTimeout(commitTimer.current);
    commitTimer.current = window.setTimeout(() => {
      setCapital(localCapital);
      setMargin(localMargin);
      commitTimer.current = null;
    }, 300);
    return () => {
      if (commitTimer.current) window.clearTimeout(commitTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localCapital, localMargin]);

  // Async worker-backed calculation (updates UI when ready)
  const [workerResult, setWorkerResult] = useState<ReturnType<typeof calculateFutures> | null>(null);
  useEffect(() => {
    let mounted = true;
    calculateFuturesAsync({ entryPrice, stopPrice, capital, margin, leverage, feeType, marginMode }).then((res) => {
      if (!mounted) return;
      setWorkerResult(res);
    });
    return () => {
      mounted = false;
    };
  }, [entryPrice, stopPrice, capital, margin, leverage, feeType, marginMode]);

  const useRes = workerResult ?? {
    entry,
    stop,
    capitalAmount: capital,
    marginAmount: margin,
    feeRate: 0,
    positionSize: 0,
    feeOpen: 0,
    feeClose: 0,
    feeTotal: 0,
    liquidationDistancePct: 0,
    liquidationPrice: 0,
    feeAwareLiquidationPrice: 0,
    feeAwareLiquidationDistancePct: 0,
    liquidationBarPct: 0,
    liquidationColor: 'var(--green)',
    danger: false,
    showWarning: false,
    leveragePct: 0,
    profit: 0,
    loss: 0,
    roiWin: 0,
    roiLoss: 0,
    breakEven: 0,
    riskPct: 0,
  };

  return (
    <AccentCard colors="linear-gradient(90deg,#ff3d5a,#ffb82e,#ff6b35)">
      <PanelHeader
        title="⚡ Futures Calculator"
        actions={
          <span className="text-10px font-mono font-bold px-2.5 py-0.5 rounded-full tracking-wider bg-amber/10 text-amber border border-amber/25">
            FUTURES
          </span>
        }
      />

      <div className="grid grid-cols-2 gap-2 mb-3">
        <div>
          <FieldLabel>Total Capital ($)</FieldLabel>
          <NumInput value={localCapital} onChange={setLocalCapital} step={10} min={1} />
        </div>
        <div>
          <FieldLabel>Margin Used ($)</FieldLabel>
          <NumInput value={localMargin} onChange={setLocalMargin} step={5} min={1} />
        </div>
      </div>

      <div className="flex items-center gap-2.5 mb-3">
        <span className="text-11px font-mono text-text2 w-[88px] shrink-0">Leverage</span>
        <div className="flex-1">
          <input
            type="range"
            min={1}
            max={125}
            value={leverage}
            onChange={(e) => setLeverage(Number(e.target.value))}
            className="w-full h-1 rounded-sm cursor-pointer appearance-none"
            style={{
              background: `linear-gradient(90deg, var(--amber) 0%, var(--amber) ${levPct}%, var(--bg4) ${levPct}%)`,
            }}
          />
          <div className="flex justify-between text-9px font-mono text-text3 px-px mt-0.5">
            {['1×', '10×', '25×', '50×', '75×', '100×', '125×'].map((t) => (
              <span key={t}>{t}</span>
            ))}
          </div>
        </div>
        <span className="text-[22px] font-mono font-bold text-amber min-w-[54px] text-right">
          {leverage}×
        </span>
      </div>

      <div className="flex items-center gap-2 mb-3">
        <span className="text-11px font-mono text-text2 w-[88px] shrink-0">Fee Type</span>
        {(['maker', 'taker'] as const).map((f) => (
          <SegmentBtn key={f} variant="amber" active={feeType === f} onClick={() => setFeeType(f)}>
            {f.charAt(0).toUpperCase() + f.slice(1)} {f === 'maker' ? '0.02%' : '0.05%'}
          </SegmentBtn>
        ))}
      </div>

      <div className="flex items-center gap-2 mb-3">
        <span className="text-11px font-mono text-text2 w-[88px] shrink-0">Margin Mode</span>
        {(['isolated', 'cross'] as const).map((mode) => (
          <SegmentBtn
            key={mode}
            variant="amber"
            active={marginMode === mode}
            onClick={() => setMarginMode(mode)}
          >
            {mode === 'isolated' ? 'Isolated' : 'Cross'}
          </SegmentBtn>
        ))}
      </div>

      <div className="mb-2.5">
        <div className="flex justify-between items-center mb-1">
          <span className="text-9px font-mono text-text3 uppercase tracking-widest">
            Liquidation Distance
          </span>
          <span className="text-11px font-mono font-bold" style={{ color: liqCol }}>
            {liqDistPct.toFixed(2)}%
          </span>
        </div>
        <div className="h-2 bg-bg3 rounded border border-border overflow-hidden">
          <div
            className="h-full rounded transition-[width,background] duration-400"
            style={{ width: `${liqPct}%`, background: liqCol }}
          />
        </div>
          <div className="flex justify-between text-9px font-mono text-text3 mt-0.5">
          <span className="text-red">Liq</span>
          <span>Entry</span>
          <span className="text-green">TP</span>
        </div>
      </div>

      {showWarn && (
        <p className="text-10px font-mono px-2.5 py-2 rounded-sm leading-normal mb-2 bg-amber/10 border border-amber/20 text-[#ffd080]">
          ⚠ {leverage}× leverage: liquidation at {liqDistPct.toFixed(2)}% move. Keep stop well inside
          that distance. Fees eat ${feeTot.toFixed(3)} per trade (${mar} margin used).
        </p>
      )}

      <MetricGrid columns={2} className="mb-2.5">
        <MetricBox
          label="Position Size"
          value={'$' + (useRes.positionSize ?? posSize).toFixed(0)}
          sub={`${leverage}× × $${useRes.marginAmount ?? mar} margin`}
        />
        <MetricBox
          label="Liq. Price"
          value={useRes.entry > 0 ? fmtPrice(useRes.liquidationPrice ?? liqPrice) : '—'}
          sub="~1/leverage from entry"
          valueColor="var(--red)"
          danger={useRes.danger ?? danger}
        />
        <MetricBox
          label="Fee-aware Liq"
          value={useRes.entry > 0 ? fmtPrice(useRes.feeAwareLiquidationPrice) : '—'}
          sub="includes fees + margin buffer"
          valueColor="var(--red)"
          danger={useRes.feeAwareLiquidationDistancePct <= 2}
        />
        <MetricBox
          label="Profit (TP hit)"
          value={useRes.entry > 0 && (useRes.profit ?? profit) > 0 ? '$' + (useRes.profit ?? profit).toFixed(2) : '—'}
          sub="after fees"
          valueColor="var(--green)"
          good={!!entry}
        />
        <MetricBox
          label="Loss (SL hit)"
          value={useRes.entry > 0 && (useRes.loss ?? loss) > 0 ? '-$' + (useRes.loss ?? loss).toFixed(2) : '—'}
          sub="after fees"
          valueColor="var(--red)"
        />
        <MetricBox
          label="ROI Win"
          value={useRes.entry > 0 ? (useRes.roiWin ?? roiWin).toFixed(2) + '%' : '—'}
          sub="% of capital"
          valueColor="var(--green)"
        />
        <MetricBox
          label="ROI Loss"
          value={useRes.entry > 0 ? '-' + ((useRes.roiLoss ?? roiLoss).toFixed(2)) + '%' : '—'}
          sub="% of capital"
          valueColor="var(--red)"
        />
        <MetricBox
          label="Risk % of Capital"
          value={useRes.entry > 0 ? (useRes.riskPct ?? riskPct).toFixed(2) + '%' : '—'}
          sub="loss / capital"
          valueColor="var(--amber)"
          warn={(useRes.riskPct ?? riskPct) > 2}
        />
        <MetricBox
          label="Break-even"
          value={useRes.entry > 0 ? fmtPrice(useRes.breakEven ?? be) : '—'}
          sub="covers open fee"
          valueColor="var(--blue)"
        />
      </MetricGrid>

      <div className="flex justify-between items-center px-2.5 py-1.5 bg-bg3 rounded-sm border border-border font-mono text-10px mb-2">
        <span className="text-text3">Open fee</span>
        <span className="font-semibold">${feeOpen.toFixed(3)}</span>
        <span className="text-text3 ml-3">Close fee</span>
        <span className="font-semibold">${feeClose.toFixed(3)}</span>
        <span className="text-text3 ml-3">Total fees</span>
        <span className="font-semibold">${feeTot.toFixed(3)}</span>
      </div>
    </AccentCard>
  );
});
