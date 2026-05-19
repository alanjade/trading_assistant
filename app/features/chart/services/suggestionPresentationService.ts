import type { EntryQuality, Suggestion } from '@/lib/store/types';
import { PRESET_STRATEGIES, type Strategy, type StrategySignal } from '@/lib/strategy';

export interface SuggestionPresentationInput {
  suggestion: Suggestion | null;
  entryQuality: EntryQuality | null;
  strategySignal: StrategySignal | null;
  activeStrategyId: string | null;
  strategies: Strategy[];
}

export function buildSuggestionPresentation({
  suggestion,
  entryQuality,
  strategySignal,
  activeStrategyId,
  strategies,
}: SuggestionPresentationInput) {
  const usingStrategy = Boolean(strategySignal);
  const allStrategies = [...PRESET_STRATEGIES, ...strategies];
  const activeName =
    allStrategies.find((strategy) => strategy.id === activeStrategyId)?.name ?? null;

  const dir = strategySignal?.dir ?? suggestion?.dir;
  const entry = strategySignal?.entry ?? suggestion?.entry;
  const stop = strategySignal?.stop ?? suggestion?.stop;
  const target = strategySignal?.targets[0] ?? suggestion?.target;
  const targets = strategySignal?.targets ?? [];
  const reasons =
    strategySignal?.reasons.join(' | ') ?? suggestion?.reason ?? 'Waiting for chart data...';
  const score = strategySignal?.score ?? entryQuality?.score ?? 0;
  const scoreIsDirectional = score >= 50 && dir != null;

  const dirColor = dir === 'long' ? 'var(--green)' : 'var(--red)';
  const dirBg = dir === 'long' ? 'rgba(0,229,160,0.1)' : 'rgba(255,61,90,0.1)';
  const dirBorder = dir === 'long' ? 'rgba(0,229,160,0.3)' : 'rgba(255,61,90,0.3)';
  const scoreColor =
    score >= 75
      ? dirColor
      : score >= 50
        ? 'var(--blue)'
        : score >= 30
          ? 'var(--amber)'
          : 'var(--text3)';
  const scoreLabel = usingStrategy ? getStrategyScoreLabel(score) : (entryQuality?.label ?? 'WAIT');

  return {
    usingStrategy,
    activeName,
    dir,
    entry,
    stop,
    target,
    targets,
    reasons,
    score,
    dirColor,
    dirBg,
    dirBorder,
    scoreColor,
    scoreLabel,
    headerLabel: usingStrategy ? 'Strategy Signal' : '3-EMA Setup',
    showWaitingState: !usingStrategy && !suggestion,
    showNoActiveSignal: !usingStrategy && Boolean(activeName) && !strategySignal,
    showPriceLevels: entry != null || stop != null || target != null,
    scoreBadgeBg: scoreIsDirectional
      ? dir === 'long'
        ? 'rgba(0,229,160,0.1)'
        : 'rgba(255,61,90,0.1)'
      : 'rgba(255,255,255,0.04)',
    scoreBadgeBorder: scoreIsDirectional
      ? dir === 'long'
        ? 'rgba(0,229,160,0.3)'
        : 'rgba(255,61,90,0.3)'
      : 'var(--border)',
  };
}

function getStrategyScoreLabel(score: number) {
  if (score >= 75) return 'PRIME ENTRY';
  if (score >= 50) return 'GOOD SETUP';
  if (score >= 30) return 'WEAK SETUP';
  return 'WAIT';
}
