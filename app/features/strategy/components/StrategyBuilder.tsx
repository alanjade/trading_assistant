'use client';

import { useCallback, useRef, useState } from 'react';
import {
  accentBtnClass,
  chartLabelClass,
  delBtnClass,
  editorPanelClass,
  FieldLabel,
  fullInputClass,
  ghostBtnClass,
  numInputClass,
  optionBtnClass,
  pillToggleClass,
  ruleRowClass,
  sectionTitleClass,
  selectInputClass,
  settingsInputClass,
} from '@/components/ui';
import { fmtPrice } from '@/lib/indicators';
import { useStore } from '@/lib/store';
import {
  Condition,
  EntryCondition,
  IndicatorId,
  PRESET_STRATEGIES,
  Rule,
  SizingConfig,
  StopConfig,
  Strategy,
  TakeProfitConfig,
} from '@/lib/strategy';

// ── Label maps ────────────────────────────────────────────────────────────────
const INDICATOR_LABELS: Record<IndicatorId, string> = {
  price_close: 'Price (Close)',
  price_open: 'Price (Open)',
  price_high: 'Price (High)',
  price_low: 'Price (Low)',
  ema9: 'EMA 9',
  ema20: 'EMA 20',
  ema50: 'EMA 50',
  rsi: 'RSI',
  stoch_rsi_k: 'Stoch RSI K',
  stoch_rsi_d: 'Stoch RSI D',
  macd_line: 'MACD Line',
  macd_signal: 'MACD Signal',
  macd_hist: 'MACD Hist',
  bb_upper: 'BB Upper',
  bb_middle: 'BB Middle',
  bb_lower: 'BB Lower',
  bb_pct: 'BB %B',
  bb_width: 'BB Width',
  atr: 'ATR',
  supertrend_dir: 'SuperTrend Dir',
  adx: 'ADX',
  plus_di: '+DI',
  minus_di: '-DI',
  obv: 'OBV',
  williams_r: 'Williams %R',
  cci: 'CCI',
  psar_dir: 'PSAR Dir',
  vwap: 'VWAP',
  cvd_cum: 'CVD (Cum)',
  volume: 'Volume',
};

const CONDITION_LABELS: Record<Condition, string> = {
  crosses_above: 'crosses above',
  crosses_below: 'crosses below',
  greater_than: '>',
  less_than: '<',
  greater_equal: '≥',
  less_equal: '≤',
  equals: '=',
  is_true: 'is true',
};

const INDICATOR_IDS = Object.keys(INDICATOR_LABELS) as IndicatorId[];

// ── Helpers ───────────────────────────────────────────────────────────────────
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function makeRule(): Rule {
  return {
    id: uid(),
    left: { type: 'indicator', id: 'rsi' },
    condition: 'greater_than',
    right: { type: 'fixed', value: 50 },
    lookback: 1,
  };
}

function makeEntryCondition(): EntryCondition {
  return {
    rules: [makeRule()],
    logic: 'AND',
    filters: { minADX: 0, sessionOnly: false },
  };
}

const defaultStop: StopConfig = {
  type: 'atr_multiple',
  value: 2,
  breakEvenAt: 1,
  trailAfter: 2,
  trailType: 'atr_multiple',
  trailValue: 1.5,
};

const defaultTP: TakeProfitConfig = {
  targets: [
    { rrMultiple: 1.5, sizePercent: 50 },
    { rrMultiple: 3, sizePercent: 50 },
  ],
};

const patchedDefaultSizing: SizingConfig = {
  method: 'risk_pct',
  value: 1,
  kellyWinRate: 0.55,
  kellyAvgWinR: 1.5,
  kellyAvgLossR: 1.0,
  kellyFraction: 0.5,
  maxPerTrade: 500,
  maxOpen: 1,
  maxDailyLoss: 0,
};

function makeStrategy(name = 'New Strategy'): Strategy {
  return {
    id: uid(),
    name,
    description: '',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    enabled: true,
    longEntry: makeEntryCondition(),
    shortEntry: null,
    exitRules: null,
    stop: { ...defaultStop },
    takeProfit: { targets: [...defaultTP.targets.map((t) => ({ ...t }))] },
    sizing: { ...patchedDefaultSizing },
  };
}

// ── RuleRow ───────────────────────────────────────────────────────────────────
function RuleRow({
  rule,
  onChange,
  onDelete,
}: {
  rule: Rule;
  onChange: (r: Rule) => void;
  onDelete: () => void;
}) {
  const setLeft = (id: IndicatorId) => onChange({ ...rule, left: { type: 'indicator', id } });

  const setCond = (c: Condition) => onChange({ ...rule, condition: c });

  const setRightIndicator = (id: IndicatorId) =>
    onChange({ ...rule, right: { type: 'indicator', id } });

  const setRightFixed = (v: string) =>
    onChange({ ...rule, right: { type: 'fixed', value: parseFloat(v) || 0 } });

  const rightIsFixed = rule.right.type === 'fixed';
  const rightFixed = rightIsFixed ? (rule.right as { type: 'fixed'; value: number }).value : 0;
  const rightIndId = !rightIsFixed
    ? (rule.right as { type: 'indicator'; id: IndicatorId }).id
    : 'rsi';

  return (
    <div className={ruleRowClass}>
      {/* Left operand */}
      <select
        value={(rule.left as { type: 'indicator'; id: IndicatorId }).id}
        onChange={(e) => setLeft(e.target.value as IndicatorId)}
        className={`${selectInputClass} flex-1 min-w-[110px]`}
      >
        {INDICATOR_IDS.map((id) => (
          <option key={id} value={id}>
            {INDICATOR_LABELS[id]}
          </option>
        ))}
      </select>

      {/* Condition */}
      <select
        value={rule.condition}
        onChange={(e) => setCond(e.target.value as Condition)}
        className={`${selectInputClass} min-w-[110px]`}
      >
        {(Object.entries(CONDITION_LABELS) as [Condition, string][]).map(([c, lbl]) => (
          <option key={c} value={c}>
            {lbl}
          </option>
        ))}
      </select>

      {/* Right operand type toggle */}
      <select
        value={rightIsFixed ? 'fixed' : 'indicator'}
        onChange={(e) => {
          if (e.target.value === 'fixed')
            onChange({ ...rule, right: { type: 'fixed', value: 50 } });
          else onChange({ ...rule, right: { type: 'indicator', id: 'ema20' } });
        }}
        className={`${selectInputClass} w-20`}
      >
        <option value="indicator">Indicator</option>
        <option value="fixed">Value</option>
      </select>

      {/* Right operand value */}
      {rightIsFixed ? (
        <input
          type="number"
          value={rightFixed}
          step={0.1}
          onChange={(e) => setRightFixed(e.target.value)}
          className={numInputClass}
        />
      ) : (
        <select
          value={rightIndId}
          onChange={(e) => setRightIndicator(e.target.value as IndicatorId)}
          className={`${selectInputClass} flex-1 min-w-[110px]`}
        >
          {INDICATOR_IDS.map((id) => (
            <option key={id} value={id}>
              {INDICATOR_LABELS[id]}
            </option>
          ))}
        </select>
      )}

      {/* Delete */}
      <button type="button" onClick={onDelete} className={delBtnClass}>
        ×
      </button>
    </div>
  );
}

// ── EntryConditionEditor ──────────────────────────────────────────────────────
function EntryConditionEditor({
  label,
  cond,
  onChange,
  onClear,
}: {
  label: string;
  cond: EntryCondition | null;
  onChange: (c: EntryCondition | null) => void;
  onClear?: () => void;
}) {
  if (!cond) {
    return (
      <div className="mb-3">
        <div className="text-10px font-mono font-semibold text-text3 uppercase tracking-widest mb-1.5">
          {label}
        </div>
        <button type="button" onClick={() => onChange(makeEntryCondition())} className={ghostBtnClass}>
          + Enable {label}
        </button>
      </div>
    );
  }

  const updateRule = (idx: number, r: Rule) => {
    const rules = [...cond.rules];
    rules[idx] = r;
    onChange({ ...cond, rules });
  };

  const deleteRule = (idx: number) => {
    const rules = cond.rules.filter((_, i) => i !== idx);
    onChange({ ...cond, rules });
  };

  const addRule = () => onChange({ ...cond, rules: [...cond.rules, makeRule()] });

  return (
    <div className="mb-3.5">
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-10px font-mono font-bold text-text2 uppercase tracking-widest">
          {label}
        </span>
        {/* AND / OR toggle */}
        <div className="flex gap-0.75 ml-2">
          {(['AND', 'OR'] as const).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => onChange({ ...cond, logic: l })}
              className={pillToggleClass(cond.logic === l)}
            >
              {l}
            </button>
          ))}
        </div>
        {onClear && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="ml-auto px-2 py-0.75 text-9px font-mono rounded cursor-pointer border border-border2 bg-transparent text-text3"
          >
            Remove
          </button>
        )}
      </div>

      {/* Rules */}
      {cond.rules.map((rule, i) => (
        <RuleRow
          key={rule.id}
          rule={rule}
          onChange={(r) => updateRule(i, r)}
          onDelete={() => deleteRule(i)}
        />
      ))}

      <button type="button" onClick={addRule} className={`${ghostBtnClass} mb-2`}>
        + Add Rule
      </button>

      {/* Filters */}
      <div className="flex gap-3 items-center px-2.5 py-1.5 bg-bg3 rounded-sm border border-border">
        <span className="text-10px font-mono text-text3 shrink-0">Filters:</span>
        <label className="flex items-center gap-1.25 text-10px font-mono text-text2 cursor-pointer">
          <span>Min ADX</span>
          <input
            type="number"
            value={cond.filters?.minADX ?? 0}
            min={0}
            max={100}
            step={5}
            onChange={(e) =>
              onChange({ ...cond, filters: { ...cond.filters!, minADX: +e.target.value } })
            }
            className={`${numInputClass} w-[50px]`}
          />
        </label>
        <label className="flex items-center gap-1.25 text-10px font-mono text-text2 cursor-pointer">
          <input
            type="checkbox"
            checked={cond.filters?.sessionOnly ?? false}
            onChange={(e) =>
              onChange({ ...cond, filters: { ...cond.filters!, sessionOnly: e.target.checked } })
            }
          />
          <span>Session only (07–16 UTC)</span>
        </label>
      </div>
    </div>
  );
}

// ── StopEditor ────────────────────────────────────────────────────────────────
function StopEditor({ stop, onChange }: { stop: StopConfig; onChange: (s: StopConfig) => void }) {
  return (
    <div className="mb-3.5">
      <div className={sectionTitleClass}>Stop Loss</div>
      <div className="flex gap-2 flex-wrap mb-2">
        {(
          [
            ['fixed_pct', 'Fixed %'],
            ['atr_multiple', 'ATR ×'],
            ['swing_low', 'Swing'],
            ['bb_band', 'BB Band'],
          ] as const
        ).map(([v, lbl]) => (
          <button
            key={v}
            type="button"
            onClick={() => onChange({ ...stop, type: v })}
            className={optionBtnClass(stop.type === v, 'red')}
          >
            {lbl}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <FieldLabel>
            {stop.type === 'fixed_pct'
              ? 'Distance %'
              : stop.type === 'atr_multiple'
                ? 'ATR Multiple'
                : stop.type === 'swing_low'
                  ? 'Lookback Bars'
                  : 'Band'}
          </FieldLabel>
          <input
            type="number"
            value={stop.value}
            min={0.1}
            step={0.1}
            onChange={(e) => onChange({ ...stop, value: +e.target.value })}
            className={fullInputClass}
          />
        </div>
        <div>
          <FieldLabel>Break-even at (×R)</FieldLabel>
          <input
            type="number"
            value={stop.breakEvenAt}
            min={0}
            step={0.1}
            onChange={(e) => onChange({ ...stop, breakEvenAt: +e.target.value })}
            className={fullInputClass}
          />
        </div>
        <div>
          <FieldLabel>Trail after (×R, 0=off)</FieldLabel>
          <input
            type="number"
            value={stop.trailAfter}
            min={0}
            step={0.1}
            onChange={(e) => onChange({ ...stop, trailAfter: +e.target.value })}
            className={fullInputClass}
          />
        </div>
        <div>
          <FieldLabel>Trail distance</FieldLabel>
          <div className="flex gap-1">
            <select
              value={stop.trailType}
              onChange={(e) =>
                onChange({ ...stop, trailType: e.target.value as 'fixed_pct' | 'atr_multiple' })
              }
              className={`${selectInputClass} flex-1`}
            >
              <option value="fixed_pct">%</option>
              <option value="atr_multiple">ATR×</option>
            </select>
            <input
              type="number"
              value={stop.trailValue}
              min={0.1}
              step={0.1}
              onChange={(e) => onChange({ ...stop, trailValue: +e.target.value })}
              className={`${numInputClass} w-[55px]`}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── TakeProfitEditor ──────────────────────────────────────────────────────────
function TakeProfitEditor({
  tp,
  onChange,
}: {
  tp: TakeProfitConfig;
  onChange: (t: TakeProfitConfig) => void;
}) {
  const totalPct = tp.targets.reduce((a, t) => a + t.sizePercent, 0);
  const balanced = Math.abs(totalPct - 100) < 0.1;

  const updateTarget = (i: number, key: 'rrMultiple' | 'sizePercent', v: number) => {
    const targets = tp.targets.map((t, idx) => (idx === i ? { ...t, [key]: v } : t));
    onChange({ ...tp, targets });
  };

  const addTarget = () => {
    if (tp.targets.length >= 4) return;
    const existing = tp.targets.reduce((a, t) => a + t.sizePercent, 0);
    const newPct = Math.max(0, 100 - existing);
    onChange({ ...tp, targets: [...tp.targets, { rrMultiple: 3, sizePercent: newPct }] });
  };

  const removeTarget = (i: number) => {
    onChange({ ...tp, targets: tp.targets.filter((_, idx) => idx !== i) });
  };

  return (
    <div className="mb-3.5">
      <div className={sectionTitleClass}>Take Profit</div>

      {tp.targets.map((t, i) => (
        <div key={i} className={ruleRowClass}>
          <span className="text-10px font-mono text-text3 w-[30px] shrink-0">TP{i + 1}</span>
          <div className="flex items-center gap-1">
            <span className="text-10px font-mono text-text3">1:</span>
            <input
              type="number"
              value={t.rrMultiple}
              min={0.5}
              step={0.1}
              onChange={(e) => updateTarget(i, 'rrMultiple', +e.target.value)}
              className={`${numInputClass} w-[55px]`}
            />
          </div>
          <div className="flex items-center gap-1">
            <input
              type="number"
              value={t.sizePercent}
              min={1}
              max={100}
              step={5}
              onChange={(e) => updateTarget(i, 'sizePercent', +e.target.value)}
              className={`${numInputClass} w-[55px]`}
            />
            <span className="text-10px font-mono text-text3">%</span>
          </div>
          {tp.targets.length > 1 && (
            <button type="button" onClick={() => removeTarget(i)} className={delBtnClass}>
              ×
            </button>
          )}
        </div>
      ))}

      <div className="flex items-center gap-2.5">
        {tp.targets.length < 4 && (
          <button type="button" onClick={addTarget} className={ghostBtnClass}>
            + Add Target
          </button>
        )}
        <span
          className={`text-10px font-mono ${balanced ? 'text-green' : 'text-red'}`}
        >
          Total: {totalPct}% {balanced ? '✓' : '⚠ must equal 100%'}
        </span>
      </div>
    </div>
  );
}

// ── SizingEditor ──────────────────────────────────────────────────────────────
function SizingEditor({
  sizing,
  onChange,
}: {
  sizing: SizingConfig;
  onChange: (s: SizingConfig) => void;
}) {
  return (
    <div className="mb-3.5">
      <div className={sectionTitleClass}>Position Sizing</div>
      <div className="flex gap-1.5 mb-2.5 flex-wrap">
        {(
          [
            ['fixed_usd', 'Fixed $'],
            ['fixed_pct', 'Fixed %'],
            ['risk_pct', 'Risk %'],
          ] as const
        ).map(([v, lbl]) => (
          <button
            key={v}
            type="button"
            onClick={() => onChange({ ...sizing, method: v })}
            className={optionBtnClass(sizing.method === v, 'accent')}
          >
            {lbl}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {[
          {
            key: 'value' as const,
            label:
              sizing.method === 'fixed_usd'
                ? 'Amount ($)'
                : sizing.method === 'fixed_pct'
                  ? '% of Capital'
                  : 'Risk %',
          },
          { key: 'maxPerTrade' as const, label: 'Max per Trade ($)' },
          { key: 'maxOpen' as const, label: 'Max Open Positions' },
          { key: 'maxDailyLoss' as const, label: 'Daily Loss Limit ($)' },
        ].map(({ key, label }) => (
          <div key={key}>
            <FieldLabel>{label}</FieldLabel>
            <input
              type="number"
              value={sizing[key]}
              min={0}
              step={key === 'value' ? 0.1 : 1}
              onChange={(e) => onChange({ ...sizing, [key]: +e.target.value })}
              className={fullInputClass}
            />
          </div>
        ))}
      </div>
      {sizing.method === 'risk_pct' && (
        <div className="mt-2 text-10px font-mono text-text3 px-2.5 py-1.5 bg-bg3 rounded-sm border border-border leading-normal">
          Risk {sizing.value}% of capital per trade. Position size auto-calculated from SL distance.
        </div>
      )}
    </div>
  );
}

// ── Main StrategyBuilder ──────────────────────────────────────────────────────
export default function StrategyBuilder() {
  const {
    strategies,
    activeStrategyId,
    addStrategy,
    updateStrategy,
    deleteStrategy,
    setActiveStrategy,
    importStrategy,
    strategySignal,
  } = useStore();

  const importFileRef = useRef<HTMLInputElement>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState(false);

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const json = ev.target?.result as string;
      const result = importStrategy(json);
      if (result.ok) {
        setImportSuccess(true);
        setImportError(null);
        setTimeout(() => setImportSuccess(false), 2000);
      } else {
        setImportError(result.error ?? 'Import failed');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const [editId, setEditId] = useState<string | null>(null);
  const [showPresets, setPresets] = useState(false);
  const [section, setSection] = useState<'long' | 'short' | 'exit' | 'stop' | 'tp' | 'sizing'>(
    'long'
  );

  // All strategies = presets + user's
  const allStrategies = [...PRESET_STRATEGIES, ...strategies];
  const editing = allStrategies.find((s) => s.id === editId) ?? null;
  // For presets, we edit a local copy that becomes a new user strategy on save
  const [localEdit, setLocalEdit] = useState<Strategy | null>(null);
  const draft = localEdit ?? editing;

  const startEdit = (s: Strategy) => {
    const isPreset = PRESET_STRATEGIES.some((p) => p.id === s.id);
    if (isPreset) {
      // Fork the preset into a new user strategy
      setLocalEdit({
        ...s,
        id: uid(),
        name: s.name + ' (copy)',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    } else {
      setLocalEdit(null);
      setEditId(s.id);
    }
    setSection('long');
  };

  const saveDraft = () => {
    if (!draft) return;
    if (localEdit) {
      // Save forked preset as new user strategy
      addStrategy(localEdit);
      setLocalEdit(null);
      setEditId(localEdit.id);
    } else {
      updateStrategy(draft.id, { ...draft, updatedAt: Date.now() });
    }
  };

  const cancelEdit = () => {
    setEditId(null);
    setLocalEdit(null);
  };

  const updateDraft = useCallback(
    (patch: Partial<Strategy>) => {
      if (!draft) return;
      const updated = { ...draft, ...patch };
      if (localEdit) {
        setLocalEdit(updated);
        return;
      }
      setEditId(updated.id);
      // Optimistic update while editing
      useStore.setState((s) => ({
        strategies: s.strategies.map((st) => (st.id === updated.id ? updated : st)),
      }));
    },
    [draft, localEdit]
  );

  const sectionBtns: Array<{ key: typeof section; label: string }> = [
    { key: 'long', label: 'Long Entry' },
    { key: 'short', label: 'Short Entry' },
    { key: 'exit', label: 'Exit Rules' },
    { key: 'stop', label: 'Stop Loss' },
    { key: 'tp', label: 'Take Profit' },
    { key: 'sizing', label: 'Sizing' },
  ];

  // ── Strategy card ──────────────────────────────────────────────────────────
  const StratCard = ({ s, isPreset }: { s: Strategy; isPreset: boolean }) => {
    const isActive = s.id === activeStrategyId;
    const signal = isActive ? strategySignal : null;
    return (
      <div
        className={`relative overflow-hidden bg-bg3 rounded-sm px-3 py-2.5 mb-1.5 border ${
          isActive ? 'border-accent' : 'border-border'
        }`}
      >
        {isActive && <div className="absolute top-0 left-0 right-0 h-0.5 bg-accent" />}
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span
                className={`text-11px font-mono font-bold ${
                  isActive ? 'text-accent' : 'text-text'
                }`}
              >
                {s.name}
              </span>
              {isPreset && (
                <span className="text-8px font-mono px-1.25 py-px rounded-sm bg-blue/10 text-blue border border-blue/20">
                  PRESET
                </span>
              )}
              {isActive && (
                <span className="text-8px font-mono px-1.25 py-px rounded-sm bg-green/10 text-accent border border-accent/20">
                  ACTIVE
                </span>
              )}
            </div>
            <div
              className={`text-10px font-mono text-text3 leading-snug ${
                signal ? 'mb-1.5' : ''
              }`}
            >
              {s.description}
            </div>
            {/* Live signal badge */}
            {signal && (
              <div
                className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-sm text-10px font-mono font-semibold ${
                  signal.dir === 'long'
                    ? 'bg-green/10 border border-green/30 text-green'
                    : 'bg-red/10 border border-red/30 text-red'
                }`}
              >
                {signal.dir === 'long' ? '▲ LONG' : '▼ SHORT'} · Score {signal.score}%
                <span className="text-text2 font-normal">@ {fmtPrice(signal.entry)}</span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-1 shrink-0">
            {!isActive && (
              <button
                type="button"
                onClick={() => setActiveStrategy(s.id)}
                className="px-2.5 py-1 text-9px font-mono font-semibold rounded cursor-pointer border border-accent bg-green/10 text-accent"
              >
                Set Active
              </button>
            )}
            <button
              type="button"
              onClick={() => startEdit(s)}
              className="px-2.5 py-1 text-9px font-mono font-semibold rounded cursor-pointer border border-border2 bg-bg4 text-text2"
            >
              {isPreset ? 'Fork & Edit' : 'Edit'}
            </button>
            {!isPreset && (
              <button
                type="button"
                onClick={() => {
                  if (confirm('Delete this strategy?')) deleteStrategy(s.id);
                }}
                className="px-2.5 py-1 text-9px font-mono font-semibold rounded cursor-pointer border border-red/30 bg-red/10 text-red"
              >
                Delete
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ── Editor panel ───────────────────────────────────────────────────────────
  if (draft) {
    return (
      <div>
        {/* Editor header */}
        <div className="flex items-center gap-2.5 mb-3.5">
          <button type="button" onClick={cancelEdit} className={ghostBtnClass}>
            ← Back
          </button>
          <input
            value={draft.name}
            onChange={(e) => updateDraft({ name: e.target.value })}
            className={`${settingsInputClass} flex-1 text-sm font-bold`}
          />
          <button type="button" onClick={saveDraft} className={accentBtnClass}>
            Save
          </button>
        </div>

        {/* Description */}
        <textarea
          value={draft.description}
          onChange={(e) => updateDraft({ description: e.target.value })}
          rows={2}
          placeholder="Strategy description…"
          className={`${settingsInputClass} w-full resize-y mb-3`}
        />

        {/* Section tabs */}
        <div className="flex gap-0.75 flex-wrap mb-3.5">
          {sectionBtns.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setSection(key)}
              className={optionBtnClass(section === key, 'accent')}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Section content */}
        <div className={editorPanelClass}>
          {section === 'long' && (
            <EntryConditionEditor
              label="Long Entry Rules"
              cond={draft.longEntry}
              onChange={(c) => updateDraft({ longEntry: c })}
            />
          )}
          {section === 'short' && (
            <EntryConditionEditor
              label="Short Entry Rules"
              cond={draft.shortEntry}
              onChange={(c) => updateDraft({ shortEntry: c })}
              onClear={() => updateDraft({ shortEntry: null })}
            />
          )}
          {section === 'exit' && (
            <EntryConditionEditor
              label="Indicator Exit Rules (optional)"
              cond={draft.exitRules}
              onChange={(c) => updateDraft({ exitRules: c })}
              onClear={() => updateDraft({ exitRules: null })}
            />
          )}
          {section === 'stop' && (
            <StopEditor stop={draft.stop} onChange={(s) => updateDraft({ stop: s })} />
          )}
          {section === 'tp' && (
            <TakeProfitEditor
              tp={draft.takeProfit}
              onChange={(t) => updateDraft({ takeProfit: t })}
            />
          )}
          {section === 'sizing' && (
            <SizingEditor sizing={draft.sizing} onChange={(s) => updateDraft({ sizing: s })} />
          )}
        </div>

        {/* Bottom actions */}
        <div className="flex gap-2 mt-3">
          <button type="button" onClick={saveDraft} className={`${accentBtnClass} flex-1 py-2`}>
            Save Strategy
          </button>
          {editing && !localEdit && (
            <button
              type="button"
              onClick={() => {
                setActiveStrategy(draft.id);
                saveDraft();
              }}
              className={optionBtnClass(true, 'blue')}
            >
              Save & Set Active
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── Strategy list ──────────────────────────────────────────────────────────
  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-2 mb-3.5 flex-wrap">
        <span className="text-sm font-mono font-bold">My Strategies</span>

        {/* hidden file input */}
        <input
          ref={importFileRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={handleImportFile}
        />

        <button
          type="button"
          onClick={() => importFileRef.current?.click()}
          className={
            importSuccess
              ? 'px-3.5 py-1.5 text-10px font-mono font-semibold rounded-sm cursor-pointer border border-green bg-green/10 text-green transition-all'
              : ghostBtnClass
          }
        >
          {importSuccess ? '✓ Imported' : '⬆ Import JSON'}
        </button>

        {importError && (
          <span className="text-9px font-mono text-red">{importError}</span>
        )}

        <button
          type="button"
          onClick={() => {
            const s = makeStrategy();
            addStrategy(s);
            startEdit(s);
          }}
          className={`${accentBtnClass} ml-auto`}
        >
          + New Strategy
        </button>
      </div>

      {/* Active signal banner */}
      {strategySignal && (
        <div
          className={`px-3.5 py-2.5 rounded-sm mb-3.5 border ${
            strategySignal.dir === 'long'
              ? 'bg-green/10 border-green/30'
              : 'bg-red/10 border-red/30'
          }`}
        >
          <div className="flex items-center gap-2.5 mb-1.5">
            <span
              className={`text-xs font-mono font-bold ${
                strategySignal.dir === 'long' ? 'text-green' : 'text-red'
              }`}
            >
              {strategySignal.dir === 'long' ? '▲ LONG SIGNAL' : '▼ SHORT SIGNAL'}
            </span>
            <span className="text-10px font-mono text-text2">
              Score {strategySignal.score}%
            </span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: 'Entry', val: fmtPrice(strategySignal.entry) },
              { label: 'Stop', val: fmtPrice(strategySignal.stop) },
              ...strategySignal.targets.map((t, i) => ({ label: `TP${i + 1}`, val: fmtPrice(t) })),
            ].map(({ label, val }) => (
              <div
                key={label}
                className="bg-bg3 rounded px-2 py-1.25 border border-border"
              >
                <div className={chartLabelClass}>{label}</div>
                <div className="text-xs font-mono font-bold">{val}</div>
              </div>
            ))}
          </div>
          {strategySignal.reasons.length > 0 && (
            <div className="mt-2 text-9px font-mono text-text3 leading-relaxed">
              {strategySignal.reasons.join(' · ')}
            </div>
          )}
        </div>
      )}

      {/* Preset strategies */}
      <div className="mb-2.5">
        <button
          type="button"
          onClick={() => setPresets((p) => !p)}
          className={`${ghostBtnClass} w-full text-left flex items-center justify-between ${
            showPresets ? 'mb-2' : ''
          }`}
        >
          <span>📚 Built-in Presets ({PRESET_STRATEGIES.length})</span>
          <span>{showPresets ? '▲' : '▼'}</span>
        </button>
        {showPresets && PRESET_STRATEGIES.map((s) => <StratCard key={s.id} s={s} isPreset />)}
      </div>

      {/* User strategies */}
      {strategies.length === 0 ? (
        <div className="text-11px font-mono text-text3 text-center py-7.5 italic">
          No custom strategies yet. Fork a preset or create one from scratch.
        </div>
      ) : (
        strategies.map((s) => <StratCard key={s.id} s={s} isPreset={false} />)
      )}
    </div>
  );
}
