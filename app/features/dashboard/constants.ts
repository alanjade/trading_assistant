import type { AppTab, ChartSection } from './types';

export const STATUS_DOT_CLASS: Record<string, string> = {
  idle: 'bg-text2',
  live: 'bg-green shadow-[0_0_6px_var(--green)] animate-[pulse_2s_infinite]',
  warn: 'bg-amber',
  err: 'bg-red',
};

export const TAB_LABELS: Record<AppTab, string> = {
  chart: 'Chart',
  calc: 'Calculator',
  journal: 'Journal',
  strategy: 'Strategy',
  screener: 'Screener',
};

export const CHART_SECTION_LABELS: Array<[ChartSection, string]> = [
  ['analysis', 'Analysis'],
  ['session', 'Session P&L'],
  ['alerts', 'Alerts'],
  ['backtest', 'Backtest'],
  ['paper', 'Paper Trade'],
];

export const SHORTCUT_HINTS = ['C', 'K', 'J', 'S', '1-6', 'Cmd+K'];
