// Server component UI helpers (pure presentational)

import React from 'react';

// ── Card ──────────────────────────────────────────────────
export function Card({
  children,
  className = '',
  style,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={style}
      className={`w-full min-w-0 bg-bg2 border border-border rounded p-3.5 mb-2.5 relative overflow-hidden ${className}`}
    >
      {children}
    </div>
  );
}

// ── AccentCard (with top gradient stripe) ─────────────────
export function AccentCard({
  children,
  colors,
  style,
}: {
  children: React.ReactNode;
  colors?: string;
  style?: React.CSSProperties;
}) {
  return (
    <Card style={style}>
      <div
        className="absolute top-0 left-0 right-0 h-0.5"
        style={{
          background: colors ?? 'linear-gradient(90deg, var(--green), var(--blue), var(--purple))',
        }}
      />
      {children}
    </Card>
  );
}

// ── MetricGrid ────────────────────────────────────────────
export function MetricGrid({
  children,
  columns = 2,
  style,
}: {
  children: React.ReactNode;
  columns?: number | string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: typeof columns === 'number' ? `repeat(${columns},1fr)` : columns,
        gap: 7,
        marginBottom: 10,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// Fix 1: removed duplicate className properties (rounded-sm, flex-1) that
// conflicted with the inline style — inline style wins, so className was dead weight.
export function MetricBox({
  label,
  value,
  sub,
  valueColor,
  danger,
  warn,
  good,
  style,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  valueColor?: string;
  danger?: boolean;
  warn?: boolean;
  good?: boolean;
  style?: React.CSSProperties;
}) {
  const border = danger
    ? 'rgba(255,61,90,0.3)'
    : warn
      ? 'rgba(255,184,46,0.25)'
      : good
        ? 'rgba(0,229,160,0.25)'
        : 'var(--border)';
  const bg = danger
    ? 'rgba(255,61,90,0.05)'
    : warn
      ? 'rgba(255,184,46,0.04)'
      : good
        ? 'rgba(0,229,160,0.04)'
        : 'var(--bg3)';
  return (
    <div
      style={{
        background: bg,
        borderRadius: 'var(--radius-sm)',
        padding: '10px 12px',
        border: `1px solid ${border}`,
        flex: 1,
        minWidth: 0,
        ...style,
      }}
    >
      <div className="text-9px font-mono text-text3 uppercase tracking-widest mb-1">{label}</div>
      <div className="text-sm font-mono font-bold leading-tight" style={{ color: valueColor }}>
        {value}
      </div>
      {sub && <div className="text-10px font-mono text-text2 mt-0.5">{sub}</div>}
    </div>
  );
}

// ── PanelHeader ───────────────────────────────────────────
// Fix 2: tracking-widest → tracking-wide; widest is only for 9–10px uppercase labels.
export function PanelHeader({
  title,
  actions,
  style,
}: {
  title: React.ReactNode;
  actions?: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div style={style} className="flex items-center justify-between mb-3 flex-wrap gap-1.5">
      <span className="text-sm font-mono font-semibold tracking-wide">{title}</span>
      {actions}
    </div>
  );
}

export function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-9px font-mono text-text3 uppercase tracking-widest mb-0.5">{children}</div>
  );
}

export function TextInput({
  value,
  onChange,
  type = 'text',
  placeholder,
  onKeyDown,
  style,
}: {
  value: string | number;
  onChange: (v: string) => void;
  type?: 'text' | 'number';
  placeholder?: string;
  onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>;
  style?: React.CSSProperties;
}) {
  return (
    <input
      type={type}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={onKeyDown}
      style={style}
      className="w-full px-2 py-1.5 text-sm font-mono bg-bg3 text-text border border-border2 rounded-sm outline-none"
    />
  );
}

export function Badge({
  children,
  color,
  bg,
  border,
  className = '',
}: {
  children: React.ReactNode;
  color?: string;
  bg?: string;
  border?: string;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center text-9px font-mono font-bold px-2 py-0.5 rounded-full tracking-wider ${className}`}
      style={{
        color: color ?? 'var(--text2)',
        background: bg ?? 'var(--bg3)',
        border: `1px solid ${border ?? 'var(--border)'}`,
      }}
    >
      {children}
    </span>
  );
}

export function ProgressBar({
  value,
  color,
  className = '',
}: {
  value: number;
  color: string;
  className?: string;
}) {
  return (
    <div
      className={`h-[5px] flex-1 min-w-0 overflow-hidden rounded-[3px] border border-[var(--border)] bg-[var(--bg3)] ${className}`}
    >
      <div
        className="h-full rounded-[3px] transition-[width,background] duration-300"
        style={{ width: `${value}%`, background: color }}
      />
    </div>
  );
}

export function ColorText({
  children,
  color,
  className = '',
}: {
  children: React.ReactNode;
  color: string;
  className?: string;
}) {
  return (
    <span className={className} style={{ color }}>
      {children}
    </span>
  );
}

// ── PillGroup ─────────────────────────────────────────────
export function PillGroup({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div style={style} className="flex gap-0.5 bg-bg2 border border-border rounded-full p-0.5">
      {children}
    </div>
  );
}

// Fix 3: flattened the three-way ternary into an explicit priority order so
// symActive+active can never be shadowed by the active-only branch.
export function PillBtn({
  children,
  active,
  symActive,
  onClick,
  style,
}: {
  children: React.ReactNode;
  active?: boolean;
  symActive?: boolean;
  onClick?: () => void;
  style?: React.CSSProperties;
}) {
  const cls =
    symActive && active
      ? 'bg-accent text-black border-accent'
      : active
        ? 'bg-bg4 text-text border-border2'
        : 'text-text2 border-transparent bg-transparent';

  return (
    <button
      onClick={onClick}
      style={style}
      className={`font-mono text-xs font-semibold px-2.5 py-1 rounded-full cursor-pointer border transition-all tracking-wider whitespace-nowrap ${cls}`}
    >
      {children}
    </button>
  );
}

export function NumInput({
  value,
  onChange,
  placeholder,
  step,
  min,
  max,
  style,
}: {
  value: string | number;
  onChange: (v: string) => void;
  placeholder?: string;
  step?: number | string;
  min?: number;
  max?: number;
  style?: React.CSSProperties;
}) {
  return (
    <input
      type="number"
      value={value}
      placeholder={placeholder}
      step={step}
      min={min}
      max={max}
      onChange={(e) => onChange(e.target.value)}
      style={{
        flex: 1,
        padding: '7px 10px',
        fontSize: 12,
        fontFamily: 'var(--mono)',
        background: 'var(--bg3)',
        color: 'var(--text)',
        border: '1px solid var(--border2)',
        borderRadius: 'var(--radius-sm)',
        outline: 'none',
        ...style,
      }}
    />
  );
}

// Fix 4: w-22 is not a valid Tailwind class (scale jumps w-20 → w-24).
// Replaced with an explicit inline width to preserve label column alignment.
export function InputRow({
  label,
  children,
  style,
}: {
  label: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div style={style} className="flex items-center gap-2 mb-2">
      <span className="font-mono text-text2 flex-shrink-0" style={{ fontSize: 11, width: 80 }}>
        {label}
      </span>
      {children}
    </div>
  );
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-11px font-mono font-semibold text-text2 tracking-widest uppercase mb-2.5">
      {children}
    </div>
  );
}

// Fix 5: added disabled prop — previously ActionBtn had no disabled support,
// leaving buttons fully styled and clickable even when inert. cursor is now
// controlled via style (not className) so it can be toggled conditionally.
export function ActionBtn({
  children,
  onClick,
  variant = 'default',
  style,
  className = '',
  disabled = false,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'default' | 'green' | 'red' | 'amber';
  style?: React.CSSProperties;
  className?: string;
  disabled?: boolean;
}) {
  const colorMap = {
    default: { color: 'var(--text2)', border: 'var(--border2)', bg: 'var(--bg3)' },
    green: { color: 'var(--green)', border: 'var(--green)', bg: 'var(--green-bg)' },
    red: { color: 'var(--red)', border: 'var(--red)', bg: 'var(--red-bg)' },
    amber: { color: 'var(--amber)', border: 'var(--amber)', bg: 'rgba(255,184,46,0.08)' },
  }[variant];

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        border: `1px solid ${colorMap.border}`,
        background: colorMap.bg,
        color: colorMap.color,
        opacity: disabled ? 0.45 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
        ...style,
      }}
      className={`px-3.5 py-1.5 text-11px font-mono font-semibold rounded-sm tracking-wider transition-all ${className}`}
    >
      {children}
    </button>
  );
}

// ── Settings / segmented controls ─────────────────────────
export const settingsInputClass =
  'px-2 py-1 text-11px font-mono bg-bg3 text-text border border-border2 rounded-sm outline-none';

export const miniInputClass =
  'w-full px-1.5 py-1 text-11px font-mono bg-bg4 text-text border border-border2 rounded-sm outline-none';

export function pillToggleClass(active: boolean) {
  return `px-2 py-0.5 text-10px font-mono font-semibold rounded-full cursor-pointer border transition-all ${
    active
      ? 'border-accent bg-green-bg text-accent'
      : 'border-border2 bg-bg3 text-text2'
  }`;
}

export const selectInputClass = `${settingsInputClass} cursor-pointer`;
export const numInputClass = `${settingsInputClass} w-[72px]`;
export const fullInputClass = `${settingsInputClass} w-full`;
export const sectionTitleClass =
  'text-10px font-mono font-bold text-text2 uppercase tracking-widest mb-2';
export const chartLabelClass = 'text-9px font-mono text-text3 uppercase tracking-widest mb-1';
export const fieldBlockClass = 'text-9px font-mono text-text3 uppercase block mb-0.75';
export const ruleRowClass =
  'flex items-center gap-1.5 flex-wrap px-2.5 py-1.75 bg-bg3 border border-border rounded-sm mb-1.25';
export const ghostBtnClass =
  'px-3 py-1.5 text-10px font-mono font-semibold rounded-sm cursor-pointer border border-border2 bg-bg3 text-text2 transition-all';
export const delBtnClass =
  'px-2 py-1 text-11px rounded-sm cursor-pointer border border-red/30 bg-red/10 text-red shrink-0';
export const accentBtnClass =
  'px-3 py-1.5 text-10px font-mono font-bold rounded-sm cursor-pointer border border-accent bg-green/10 text-accent';
export const editorPanelClass = 'bg-bg2 border border-border rounded p-3.5';

export type OptionAccent = 'accent' | 'red' | 'blue';

export function optionBtnClass(active: boolean, accent: OptionAccent = 'accent') {
  const on = {
    accent: 'border-accent bg-green/10 text-accent',
    red: 'border-red bg-red/10 text-red',
    blue: 'border-blue bg-blue/10 text-blue',
  }[accent];
  const off = 'border-border2 bg-bg3 text-text2';
  return `px-3 py-1.25 text-10px font-mono font-semibold rounded-sm cursor-pointer border transition-all ${
    active ? on : off
  }`;
}

export function pgBtnClass(disabled: boolean) {
  return `px-2.5 py-1 text-xs font-mono rounded-sm border border-border2 bg-bg3 ${
    disabled ? 'text-text3 opacity-40 cursor-default' : 'text-text2 cursor-pointer'
  }`;
}

export function SettingsGroup({
  title,
  children,
  className = '',
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`mb-5 ${className}`}>
      <div className="text-10px font-mono font-bold text-text3 uppercase tracking-widest mb-2">
        {title}
      </div>
      {children}
    </div>
  );
}

export function SettingsRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-border">
      <span className="text-xs font-mono text-text2">{label}</span>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  );
}

export function ToggleSwitch({
  on,
  onToggle,
  label,
  size = 'md',
}: {
  on: boolean;
  onToggle: () => void;
  label?: string;
  size?: 'sm' | 'md';
}) {
  const dims = size === 'sm' ? 'w-9 h-5' : 'w-10 h-[22px]';
  const knob = size === 'sm' ? 'w-3 h-3 top-[3px]' : 'w-4 h-4 top-[3px]';
  const onLeft = size === 'sm' ? 'left-[17px]' : 'left-[21px]';

  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      title={label}
      onClick={onToggle}
      className={`relative ${dims} rounded-full shrink-0 cursor-pointer border-0 transition-colors ${
        on ? 'bg-green' : 'bg-bg4'
      }`}
    >
      <span
        className={`absolute ${knob} rounded-full bg-white transition-[left] duration-200 ${
          on ? onLeft : 'left-[3px]'
        }`}
      />
    </button>
  );
}

type SegmentVariant = 'accent' | 'amber' | 'blue' | 'default';

export function SegmentBtn({
  active,
  onClick,
  children,
  variant = 'accent',
  className = '',
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  variant?: SegmentVariant;
  className?: string;
}) {
  const variantClass: Record<SegmentVariant, { on: string; off: string }> = {
    accent: {
      on: 'border-accent bg-green-bg text-accent',
      off: 'border-border2 bg-transparent text-text2',
    },
    amber: {
      on: 'border-amber bg-amber/10 text-amber',
      off: 'border-border2 bg-transparent text-text2',
    },
    blue: {
      on: 'border-blue bg-blue/10 text-blue',
      off: 'border-border2 bg-transparent text-text3',
    },
    default: {
      on: 'border-border2 bg-bg3 text-text',
      off: 'border-border2 bg-transparent text-text2',
    },
  };
  const v = variantClass[variant];

  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-2.5 py-1 text-10px font-mono font-semibold rounded-sm cursor-pointer border transition-all ${
        active ? v.on : v.off
      } ${className}`}
    >
      {children}
    </button>
  );
}

export function PillBtnSm({
  active,
  accent,
  onClick,
  children,
  className = '',
}: {
  active: boolean;
  accent?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-2.5 py-1 text-10px font-mono font-semibold rounded-2xl cursor-pointer tracking-wide border transition-all ${
        active
          ? accent
            ? 'border-accent bg-green-bg text-accent'
            : 'border-border2 bg-bg3 text-text'
          : 'border-border2 bg-transparent text-text2'
      } ${className}`}
    >
      {children}
    </button>
  );
}

export function DirBtns({
  dir,
  onChange,
}: {
  dir: 'long' | 'short';
  onChange: (d: 'long' | 'short') => void;
}) {
  const btnStyle = (active: boolean, type: 'long' | 'short'): React.CSSProperties => ({
    border: `1px solid ${active ? (type === 'long' ? 'var(--green)' : 'var(--red)') : 'var(--border2)'}`,
    background: active ? (type === 'long' ? 'var(--green-bg)' : 'var(--red-bg)') : 'var(--bg3)',
    color: active ? (type === 'long' ? 'var(--green)' : 'var(--red)') : 'var(--text2)',
  });
  return (
    <div className="flex gap-1">
      <button
        style={btnStyle(dir === 'long', 'long')}
        onClick={() => onChange('long')}
        className="flex-1 px-3.5 py-1.5 text-11px font-mono font-semibold rounded-sm cursor-pointer tracking-wider transition-all"
      >
        ▲ Long
      </button>
      <button
        style={btnStyle(dir === 'short', 'short')}
        onClick={() => onChange('short')}
        className="flex-1 px-3.5 py-1.5 text-11px font-mono font-semibold rounded-sm cursor-pointer tracking-wider transition-all"
      >
        ▼ Short
      </button>
    </div>
  );
}
