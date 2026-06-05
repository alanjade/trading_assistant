'use client';

import { useState } from 'react';
import { settingsInputClass, ToggleSwitch } from '@/components/ui';
import { ActiveIndicators, IndicatorParams, useStore } from '@/lib/store';

interface IndicatorDef {
  key: keyof ActiveIndicators;
  label: string;
  group: 'price' | 'oscillator' | 'volume' | 'pattern';
  params?: Array<{
    key: keyof IndicatorParams;
    label: string;
    min: number;
    max: number;
    step: number;
  }>;
}

const INDICATORS: IndicatorDef[] = [
  {
    key: 'ema9',
    label: 'EMA 9',
    group: 'price',
    params: [{ key: 'ema9Period', label: 'Period', min: 1, max: 200, step: 1 }],
  },
  {
    key: 'ema20',
    label: 'EMA 20',
    group: 'price',
    params: [{ key: 'ema20Period', label: 'Period', min: 1, max: 200, step: 1 }],
  },
  {
    key: 'ema50',
    label: 'EMA 50',
    group: 'price',
    params: [{ key: 'ema50Period', label: 'Period', min: 1, max: 500, step: 1 }],
  },
  { key: 'vwap', label: 'VWAP', group: 'price' },
  { key: 'vwapBands', label: 'VWAP Bands ±1σ ±2σ', group: 'price' },
  {
    key: 'bb',
    label: 'Bollinger Bands',
    group: 'price',
    params: [
      { key: 'bbPeriod', label: 'Period', min: 5, max: 100, step: 1 },
      { key: 'bbStdDev', label: 'Std Dev', min: 0.5, max: 4, step: 0.1 },
    ],
  },
  {
    key: 'superTrend',
    label: 'SuperTrend',
    group: 'price',
    params: [
      { key: 'stPeriod', label: 'ATR Period', min: 3, max: 50, step: 1 },
      { key: 'stMultiplier', label: 'Multiplier', min: 1, max: 10, step: 0.1 },
    ],
  },
  {
    key: 'psar',
    label: 'Parabolic SAR',
    group: 'price',
    params: [
      { key: 'psarStep', label: 'Step', min: 0.001, max: 0.1, step: 0.001 },
      { key: 'psarMax', label: 'Max', min: 0.1, max: 0.5, step: 0.01 },
    ],
  },
  {
    key: 'rsi',
    label: 'RSI',
    group: 'oscillator',
    params: [{ key: 'rsiPeriod', label: 'Period', min: 2, max: 50, step: 1 }],
  },
  {
    key: 'stochRsi',
    label: 'Stoch RSI',
    group: 'oscillator',
    params: [{ key: 'stochRsiPeriod', label: 'Period', min: 5, max: 50, step: 1 }],
  },
  {
    key: 'macd',
    label: 'MACD',
    group: 'oscillator',
    params: [
      { key: 'macdFast', label: 'Fast', min: 3, max: 50, step: 1 },
      { key: 'macdSlow', label: 'Slow', min: 5, max: 200, step: 1 },
      { key: 'macdSignal', label: 'Signal', min: 2, max: 50, step: 1 },
    ],
  },
  {
    key: 'adx',
    label: 'ADX',
    group: 'oscillator',
    params: [{ key: 'adxPeriod', label: 'Period', min: 5, max: 50, step: 1 }],
  },
  {
    key: 'williamsR',
    label: 'Williams %R',
    group: 'oscillator',
    params: [{ key: 'williamsRPeriod', label: 'Period', min: 5, max: 50, step: 1 }],
  },
  {
    key: 'cci',
    label: 'CCI',
    group: 'oscillator',
    params: [{ key: 'cciPeriod', label: 'Period', min: 5, max: 50, step: 1 }],
  },
  { key: 'volume', label: 'Volume', group: 'volume' },
  { key: 'cvd', label: 'CVD', group: 'volume' },
  { key: 'obv', label: 'OBV', group: 'volume' },
  { key: 'patterns', label: 'Candle Patterns', group: 'pattern' },
];

const GROUP_LABELS: Record<string, string> = {
  price: '📈 Price Pane',
  oscillator: '〰 Oscillators',
  volume: '📊 Volume',
  pattern: '🕯 Patterns',
};

const GROUP_TEXT: Record<string, string> = {
  price: 'text-blue',
  oscillator: 'text-amber',
  volume: 'text-green',
  pattern: 'text-purple',
};

const GROUP_BORDER: Record<string, string> = {
  price: 'border-l-blue',
  oscillator: 'border-l-amber',
  volume: 'border-l-green',
  pattern: 'border-l-purple',
};

export default function IndicatorPanel({ onClose }: { onClose: () => void }) {
  const {
    activeIndicators,
    indicatorParams,
    toggleIndicator,
    setIndicatorParam,
    resetIndicatorParams,
  } = useStore();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const groups = ['price', 'oscillator', 'volume', 'pattern'] as const;
  const filtered = INDICATORS.filter(
    (ind) => search === '' || ind.label.toLowerCase().includes(search.toLowerCase())
  );
  const activeCount = Object.values(activeIndicators).filter(Boolean).length;

  return (
    <div className="fixed inset-0 z-500 flex items-start justify-end">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden
      />
      <div className="relative z-[1] w-80 h-screen bg-bg2 border-l border-border flex flex-col overflow-y-auto">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-bg3 shrink-0">
          <div>
            <div className="text-xs font-mono font-bold text-text">Indicators</div>
            <div className="text-10px font-mono text-text3 mt-0.5">{activeCount} active</div>
          </div>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={resetIndicatorParams}
              className="text-10px font-mono px-2 py-1 rounded-sm cursor-pointer border border-border2 bg-bg4 text-text3 transition-all hover:text-text2"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-sm font-mono px-2 py-1 rounded-sm cursor-pointer border border-border2 bg-bg4 text-text2 leading-none"
              aria-label="Close"
            >
              ×
            </button>
          </div>
        </div>

        <div className="px-3.5 py-2.5 border-b border-border shrink-0">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search indicators…"
            className={`${settingsInputClass} w-full py-1.5`}
          />
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          {groups.map((group) => {
            const items = filtered.filter((i) => i.group === group);
            if (!items.length) return null;
            return (
              <div key={group} className="mb-1">
                <div
                  className={`text-9px font-mono font-bold uppercase tracking-widest px-4 pt-2 pb-1 ${GROUP_TEXT[group]}`}
                >
                  {GROUP_LABELS[group]}
                </div>
                {items.map((ind) => {
                  const isOn = activeIndicators[ind.key];
                  const isExp = expanded === ind.key;
                  const hasParams = ind.params && ind.params.length > 0;
                  return (
                    <div key={ind.key}>
                      <div
                        className={`flex items-center gap-2 px-4 py-1.5 border-l-2 transition-colors ${
                          isExp ? 'bg-bg3' : 'bg-transparent'
                        } ${isOn ? GROUP_BORDER[group] : 'border-l-transparent'}`}
                      >
                        <ToggleSwitch
                          on={isOn}
                          onToggle={() => toggleIndicator(ind.key)}
                          size="sm"
                        />
                        <span
                          className={`text-11px font-mono flex-1 transition-colors ${
                            isOn ? 'text-text font-semibold' : 'text-text2 font-normal'
                          }`}
                        >
                          {ind.label}
                        </span>
                        {hasParams && isOn && (
                          <button
                            type="button"
                            onClick={() => setExpanded(isExp ? null : ind.key)}
                            className={`text-9px font-mono px-1.5 py-0.5 rounded cursor-pointer border shrink-0 transition-all ${
                              isExp
                                ? 'border-accent bg-green-bg text-accent'
                                : 'border-border2 bg-bg4 text-text3'
                            }`}
                          >
                            {isExp ? '▲' : '▼'} params
                          </button>
                        )}
                      </div>
                      {isExp && hasParams && isOn && (
                        <div className="px-4 pb-3 pt-2 pl-[52px] bg-bg3 border-b border-border">
                          {ind.params!.map((param) => (
                            <div key={param.key} className="flex items-center gap-2 mb-2">
                              <span className="text-10px font-mono text-text3 w-[70px] shrink-0">
                                {param.label}
                              </span>
                              <input
                                type="number"
                                value={indicatorParams[param.key]}
                                min={param.min}
                                max={param.max}
                                step={param.step}
                                onChange={(e) =>
                                  setIndicatorParam(
                                    param.key,
                                    parseFloat(e.target.value) || param.min
                                  )
                                }
                                className={`${settingsInputClass} w-[72px] bg-bg4`}
                              />
                              <span className="text-9px font-mono text-text3">
                                {param.min}–{param.max}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        <p className="px-4 py-2.5 border-t border-border text-9px font-mono text-text3 leading-normal shrink-0 bg-bg3">
          Changes apply immediately · Params are saved between sessions
        </p>
      </div>
    </div>
  );
}
