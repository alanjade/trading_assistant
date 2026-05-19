'use client';

import {
  AccentCard,
  Badge,
  ColorText,
  MetricBox,
  MetricGrid,
  PanelHeader,
  ProgressBar,
} from '@/components/ui';
import { buildSuggestionPresentation } from '@/features/chart/services/suggestionPresentationService';
import { fmtPrice } from '@/lib/indicators';
import { useStore } from '@/lib/store';

export default function SuggestionCard() {
  const {
    suggestion,
    entryQuality,
    applySuggestionToCalc,
    strategySignal,
    activeStrategyId,
    strategies,
  } = useStore();

  const signal = buildSuggestionPresentation({
    suggestion,
    entryQuality,
    strategySignal,
    activeStrategyId,
    strategies,
  });

  const canApply = !signal.showWaitingState && signal.showPriceLevels;

  return (
    <AccentCard>
      <PanelHeader
        title={
          <div>
            <div className="text-11px font-mono font-semibold uppercase tracking-wide text-text2">
              {signal.headerLabel}
            </div>
            {signal.activeName && (
              <div className="text-9px font-mono text-text3 mt-0.5">{signal.activeName}</div>
            )}
          </div>
        }
        actions={
          <div className="flex items-center gap-2 ml-auto">
            <Badge
              color={signal.scoreColor}
              bg={signal.scoreBadgeBg}
              border={signal.scoreBadgeBorder}
              className="rounded-[20px] px-2 py-0.5 text-10px"
            >
              {signal.scoreLabel}
            </Badge>
            {signal.dir && (
              <Badge
                color={signal.dir === 'long' ? 'var(--green)' : 'var(--red)'}
                bg={signal.dir === 'long' ? 'rgba(0,229,160,0.1)' : 'rgba(255,61,90,0.1)'}
                border={`${signal.dir === 'long' ? 'var(--green)' : 'var(--red)'}33`}
              >
                {signal.dir === 'long' ? 'LONG' : 'SHORT'} SETUP
              </Badge>
            )}
          </div>
        }
      />

      {signal.showWaitingState && (
        <p className="font-mono text-10px text-text3 text-center py-4">Waiting for chart data...</p>
      )}

      {signal.showPriceLevels && (
        <MetricGrid columns={3}>
          <MetricBox label="Entry" value={fmtPrice(signal.entry)} valueColor="var(--blue)" />
          <MetricBox label="Stop Loss" value={fmtPrice(signal.stop)} valueColor="var(--red)" />
          <MetricBox label="Target" value={fmtPrice(signal.target)} valueColor="var(--green)" />
        </MetricGrid>
      )}

      {signal.usingStrategy && signal.targets.length > 1 && (
        <div className="flex flex-wrap gap-1.5 mb-2.5">
          {signal.targets.map((target, index) => (
            <div
              key={index}
              className="flex-1 min-w-0 text-center rounded-sm border border-border bg-bg3 px-2 py-1.5"
            >
              <div className="font-mono text-9px uppercase text-text3 mb-0.5">TP{index + 1}</div>
              <div className="font-mono text-xs font-bold text-green">{fmtPrice(target)}</div>
            </div>
          ))}
        </div>
      )}

      <p className="font-mono text-10px leading-relaxed text-text2 mb-2 px-2.5 py-2 rounded-sm border-l-2 border-l-accent bg-bg3 break-words overflow-hidden">
        {signal.reasons}
      </p>

      <div className="flex items-center gap-2 mb-2 min-w-0">
        <span className="font-mono text-9px uppercase tracking-wide text-text3 whitespace-nowrap shrink-0">
          Signal Quality
        </span>
        <ProgressBar value={signal.score} color={signal.scoreColor} />
        <ColorText
          color={signal.scoreColor}
          className="font-mono text-10px font-bold min-w-[28px] text-right shrink-0"
        >
          {signal.score}%
        </ColorText>
      </div>

      {signal.showNoActiveSignal && (
        <p className="font-mono text-9px text-text3 text-center mb-2">
          No signal from &quot;{signal.activeName}&quot; on current bar
        </p>
      )}

      <button
        type="button"
        onClick={canApply ? applySuggestionToCalc : undefined}
        disabled={!canApply}
        className={`w-full rounded-sm border transition-all ${
          canApply
            ? 'py-2.5 px-3.5 border-accent bg-green-bg text-accent cursor-pointer opacity-100'
            : 'py-2 px-3.5 border-border bg-bg3 text-text3 cursor-not-allowed opacity-50'
        }`}
      >
        {canApply ? (
          <div className="flex flex-col gap-1">
            <div className="font-mono text-10px font-bold tracking-wide uppercase">
              ↗ Apply to Calculator
            </div>
            <div className="flex justify-center gap-3.5">
              <span className="font-mono text-9px text-blue">E {fmtPrice(signal.entry)}</span>
              <span className="font-mono text-9px text-red">SL {fmtPrice(signal.stop)}</span>
              <span className="font-mono text-9px text-green">
                TP {fmtPrice(signal.targets[0] ?? signal.target)}
              </span>
            </div>
          </div>
        ) : (
          <span className="font-mono text-10px font-bold tracking-wide uppercase">
            — No Signal to Apply
          </span>
        )}
      </button>
    </AccentCard>
  );
}
