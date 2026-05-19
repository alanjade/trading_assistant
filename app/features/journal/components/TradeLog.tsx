'use client';

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActionBtn,
  Card,
  MetricBox,
  MetricGrid,
  PanelHeader,
  chartLabelClass,
  delBtnClass,
  fieldBlockClass,
  fullInputClass,
  ghostBtnClass,
  optionBtnClass,
  pgBtnClass,
  pillToggleClass,
  selectInputClass,
  settingsInputClass,
} from '@/components/ui';
import { fmtPrice, fmtSymDisplay } from '@/lib/indicators';
import { useStore } from '@/lib/store';
import type { TradeJournalEntry } from '@/lib/store';

// ── Constants ─────────────────────────────────────────────────────────────────
const PAGE_SIZE = 20;

const OUTCOME_BADGE: Record<string, string> = {
  win: 'text-green bg-green-bg',
  loss: 'text-red bg-red-bg',
  be: 'text-amber bg-amber/10',
  open: 'text-blue bg-blue/10',
};

const filterSelectClass = `${selectInputClass} w-auto py-1 px-1.75 text-10px`;
const filterInputClass = `${settingsInputClass} py-1 px-1.75 text-10px`;

const PRESET_TAGS = [
  'trend-follow',
  'mean-revert',
  'breakout',
  'scalp',
  'swing',
  'fomo',
  'revenge',
  'oversize',
  'patient',
  'clean-setup',
];

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function pnlTextClass(v: number) {
  return v >= 0 ? 'text-green' : 'text-red';
}

// ── Tiny canvas chart hook ────────────────────────────────────────────────────
function useCanvas(
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
  deps: unknown[]
) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const dpr = window.devicePixelRatio || 1;
    const w = c.clientWidth,
      h = c.clientHeight;
    c.width = w * dpr;
    c.height = h * dpr;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    draw(ctx, w, h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return ref;
}

// ── Equity curve ──────────────────────────────────────────────────────────────
function EquityCurve({ trades }: { trades: TradeJournalEntry[] }) {
  const sorted = [...trades].sort((a, b) => a.date.localeCompare(b.date));
  const equity = sorted.reduce<number[]>(
    (acc, t) => {
      acc.push((acc[acc.length - 1] ?? 0) + (t.pnl || 0));
      return acc;
    },
    [0]
  );

  const ref = useCanvas(
    (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = 'var(--bg3)';
      ctx.fillRect(0, 0, w, h);
      if (equity.length < 2) {
        ctx.fillStyle = 'var(--text3)';
        ctx.font = '10px var(--mono)';
        ctx.textAlign = 'center';
        ctx.fillText('No data', w / 2, h / 2);
        return;
      }

      const pad = { t: 12, b: 16, l: 8, r: 8 };
      const cw = w - pad.l - pad.r,
        ch = h - pad.t - pad.b;
      const minE = Math.min(...equity),
        maxE = Math.max(...equity);
      const rng = maxE - minE || 1;
      const xOf = (i: number) => pad.l + (i / (equity.length - 1)) * cw;
      const yOf = (v: number) => pad.t + (1 - (v - minE) / rng) * ch;

      const z = yOf(0);
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 0.5;
      ctx.setLineDash([2, 3]);
      ctx.beginPath();
      ctx.moveTo(pad.l, z);
      ctx.lineTo(w - pad.r, z);
      ctx.stroke();
      ctx.setLineDash([]);

      const finalColor =
        equity[equity.length - 1] >= 0 ? 'rgba(0,229,160,0.08)' : 'rgba(255,61,90,0.08)';
      ctx.fillStyle = finalColor;
      ctx.beginPath();
      ctx.moveTo(xOf(0), yOf(0));
      equity.forEach((v, i) => ctx.lineTo(xOf(i), yOf(v)));
      ctx.lineTo(xOf(equity.length - 1), yOf(0));
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = equity[equity.length - 1] >= 0 ? 'var(--green)' : 'var(--red)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      equity.forEach((v, i) => (i === 0 ? ctx.moveTo(xOf(i), yOf(v)) : ctx.lineTo(xOf(i), yOf(v))));
      ctx.stroke();

      ctx.fillStyle = 'var(--text3)';
      ctx.font = '9px var(--mono)';
      ctx.textAlign = 'right';
      ctx.fillText('$' + maxE.toFixed(0), w - pad.r, pad.t + 10);
      ctx.fillText('$' + minE.toFixed(0), w - pad.r, h - pad.b);
    },
    [equity.join(',')]
  );

  return <canvas ref={ref} className="w-full h-[100px] block rounded-sm" />;
}

// ── Win rate by symbol bar chart ──────────────────────────────────────────────
function WinBySymbol({ trades }: { trades: TradeJournalEntry[] }) {
  const bySymbol: Record<string, { wins: number; total: number }> = {};
  for (const t of trades) {
    if (!bySymbol[t.symbol]) bySymbol[t.symbol] = { wins: 0, total: 0 };
    bySymbol[t.symbol].total++;
    if (t.outcome === 'win') bySymbol[t.symbol].wins++;
  }
  const entries = Object.entries(bySymbol)
    .map(([sym, v]) => ({
      sym: sym.replace('USDT', ''),
      wr: v.total > 0 ? v.wins / v.total : 0,
      total: v.total,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  const ref = useCanvas(
    (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = 'var(--bg3)';
      ctx.fillRect(0, 0, w, h);
      if (!entries.length) return;
      const pad = { t: 6, b: 18, l: 6, r: 6 };
      const cw = w - pad.l - pad.r,
        ch = h - pad.t - pad.b;
      const bw = cw / entries.length - 2;
      entries.forEach(({ sym, wr }, i) => {
        const bh = wr * ch;
        const x = pad.l + i * (bw + 2);
        ctx.fillStyle = wr >= 0.5 ? 'rgba(0,229,160,0.6)' : 'rgba(255,61,90,0.6)';
        ctx.fillRect(x, pad.t + ch - bh, bw, bh);
        ctx.strokeStyle = 'rgba(255,184,46,0.3)';
        ctx.lineWidth = 0.5;
        ctx.setLineDash([2, 2]);
        ctx.beginPath();
        ctx.moveTo(pad.l, pad.t + ch * 0.5);
        ctx.lineTo(w - pad.r, pad.t + ch * 0.5);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = 'var(--text3)';
        ctx.font = '7px var(--mono)';
        ctx.textAlign = 'center';
        ctx.fillText(sym, x + bw / 2, h - 4);
      });
    },
    [entries.map((e) => e.sym + e.wr).join(',')]
  );

  return <canvas ref={ref} className="w-full h-[90px] block rounded-sm" />;
}

// ── Win rate by hour of day ───────────────────────────────────────────────────
function WinByHour({ trades }: { trades: TradeJournalEntry[] }) {
  const byHour: Record<number, { wins: number; total: number }> = {};
  for (let i = 0; i < 24; i++) byHour[i] = { wins: 0, total: 0 };
  for (const t of trades) {
    const h = 12;
    byHour[h].total++;
    if (t.outcome === 'win') byHour[h].wins++;
  }
  const byDay: Record<number, { wins: number; total: number }> = {};
  for (let i = 0; i < 7; i++) byDay[i] = { wins: 0, total: 0 };
  for (const t of trades) {
    const d = new Date(t.date + 'T00:00:00').getDay();
    byDay[d].total++;
    if (t.outcome === 'win') byDay[d].wins++;
  }

  const ref = useCanvas(
    (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = 'var(--bg3)';
      ctx.fillRect(0, 0, w, h);
      const pad = { t: 6, b: 18, l: 6, r: 6 };
      const cw = w - pad.l - pad.r,
        ch = h - pad.t - pad.b;
      const bw = cw / 7 - 2;
      for (let i = 0; i < 7; i++) {
        const { wins, total } = byDay[i];
        const wr = total > 0 ? wins / total : 0;
        const bh = wr * ch;
        const x = pad.l + i * (bw + 2);
        ctx.fillStyle =
          total === 0
            ? 'rgba(255,255,255,0.05)'
            : wr >= 0.5
              ? 'rgba(0,229,160,0.6)'
              : 'rgba(255,61,90,0.6)';
        ctx.fillRect(x, pad.t + ch - bh, bw, Math.max(bh, 1));
        ctx.fillStyle = 'var(--text3)';
        ctx.font = '7px var(--mono)';
        ctx.textAlign = 'center';
        ctx.fillText(DAYS[i], x + bw / 2, h - 4);
        if (total > 0) {
          ctx.fillStyle = 'var(--text2)';
          ctx.fillText(Math.round(wr * 100) + '%', x + bw / 2, pad.t + ch - bh - 2);
        }
      }
      ctx.strokeStyle = 'rgba(255,184,46,0.3)';
      ctx.lineWidth = 0.5;
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.moveTo(pad.l, pad.t + ch * 0.5);
      ctx.lineTo(w - pad.r, pad.t + ch * 0.5);
      ctx.stroke();
      ctx.setLineDash([]);
    },
    [JSON.stringify(byDay)]
  );

  return <canvas ref={ref} className="w-full h-[90px] block rounded-sm" />;
}

// ── P&L by day of week ────────────────────────────────────────────────────────
function PnLByDay({ trades }: { trades: TradeJournalEntry[] }) {
  const byDay: number[] = [0, 0, 0, 0, 0, 0, 0];
  for (const t of trades) {
    const d = new Date(t.date + 'T00:00:00').getDay();
    byDay[d] += t.pnl || 0;
  }

  const ref = useCanvas(
    (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = 'var(--bg3)';
      ctx.fillRect(0, 0, w, h);
      const pad = { t: 10, b: 18, l: 6, r: 6 };
      const cw = w - pad.l - pad.r,
        ch = h - pad.t - pad.b;
      const maxAbs = Math.max(...byDay.map(Math.abs), 0.01);
      const midY = pad.t + ch / 2;
      const bw = cw / 7 - 2;
      ctx.strokeStyle = 'rgba(255,255,255,0.07)';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(pad.l, midY);
      ctx.lineTo(w - pad.r, midY);
      ctx.stroke();
      for (let i = 0; i < 7; i++) {
        const v = byDay[i];
        const bh = (Math.abs(v) / maxAbs) * (ch / 2 - 2);
        const x = pad.l + i * (bw + 2);
        const y = v >= 0 ? midY - bh : midY;
        ctx.fillStyle = v >= 0 ? 'rgba(0,229,160,0.6)' : 'rgba(255,61,90,0.6)';
        ctx.fillRect(x, y, bw, Math.max(bh, 1));
        ctx.fillStyle = 'var(--text3)';
        ctx.font = '7px var(--mono)';
        ctx.textAlign = 'center';
        ctx.fillText(DAYS[i], x + bw / 2, h - 4);
      }
    },
    [byDay.join(',')]
  );

  return <canvas ref={ref} className="w-full h-[80px] block rounded-sm" />;
}

// ── Avg RR achieved vs planned ────────────────────────────────────────────────
function RRChart({ trades }: { trades: TradeJournalEntry[] }) {
  const pts = trades
    .filter((t) => t.entry > 0 && t.stop > 0 && t.target > 0 && t.pnl !== 0)
    .map((t) => {
      const risk = Math.abs(t.entry - t.stop);
      const planned = risk > 0 ? Math.abs(t.target - t.entry) / risk : 0;
      const riskUsd = t.entry * Math.abs(1 - t.stop / t.entry);
      const achR = riskUsd > 0 ? t.pnl / riskUsd : 0;
      return {
        planned: Math.min(planned, 10),
        achieved: Math.max(-5, Math.min(achR, 10)),
        win: t.outcome === 'win',
      };
    });

  const ref = useCanvas(
    (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = 'var(--bg3)';
      ctx.fillRect(0, 0, w, h);
      if (!pts.length) {
        ctx.fillStyle = 'var(--text3)';
        ctx.font = '9px var(--mono)';
        ctx.textAlign = 'center';
        ctx.fillText('No data', w / 2, h / 2);
        return;
      }

      const pad = { t: 8, b: 16, l: 20, r: 8 };
      const cw = w - pad.l - pad.r,
        ch = h - pad.t - pad.b;
      const maxX = 6,
        maxY = 6,
        minY = -3;
      const xOf = (v: number) => pad.l + (v / maxX) * cw;
      const yOf = (v: number) => pad.t + (1 - (v - minY) / (maxY - minY)) * ch;

      ctx.strokeStyle = 'rgba(255,255,255,0.07)';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(pad.l, yOf(0));
      ctx.lineTo(w - pad.r, yOf(0));
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,184,46,0.2)';
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.moveTo(xOf(0), yOf(0));
      ctx.lineTo(xOf(maxX), yOf(maxX));
      ctx.stroke();
      ctx.setLineDash([]);

      for (const { planned, achieved, win } of pts) {
        ctx.beginPath();
        ctx.arc(xOf(planned), yOf(achieved), 3, 0, Math.PI * 2);
        ctx.fillStyle = win ? 'rgba(0,229,160,0.55)' : 'rgba(255,61,90,0.55)';
        ctx.fill();
      }
      ctx.fillStyle = 'var(--text3)';
      ctx.font = '7px var(--mono)';
      ctx.textAlign = 'center';
      ctx.fillText('Planned R', w / 2, h - 3);
      ctx.save();
      ctx.translate(8, h / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText('Achieved R', 0, 0);
      ctx.restore();
    },
    [pts.map((p) => p.planned + p.achieved).join(',')]
  );

  return <canvas ref={ref} className="w-full h-[100px] block rounded-sm" />;
}

// ── Tag selector ──────────────────────────────────────────────────────────────
const TagSelector = memo(function TagSelector({ tags, onChange }: { tags: string[]; onChange: (t: string[]) => void }) {
  const [custom, setCustom] = useState('');
  const toggle = useCallback(
    (tag: string) =>
      onChange(tags.includes(tag) ? tags.filter((t) => t !== tag) : [...tags, tag]),
    [onChange, tags]
  );
  const addCustom = useCallback(() => {
    const t = custom.trim().toLowerCase().replace(/\s+/g, '-');
    if (t && !tags.includes(t)) {
      onChange([...tags, t]);
    }
    setCustom('');
  }, [custom, onChange, tags]);

  return (
    <div>
      <div className="flex flex-wrap gap-1 mb-1.25">
        {PRESET_TAGS.map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={() => toggle(tag)}
            className={`text-9px font-mono px-1.75 py-0.5 rounded-full cursor-pointer border transition-all ${pillToggleClass(tags.includes(tag))}`}
          >
            {tag}
          </button>
        ))}
      </div>
      {tags
        .filter((t) => !PRESET_TAGS.includes(t))
        .map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={() => toggle(tag)}
            className={`text-9px font-mono px-1.75 py-0.5 rounded-full cursor-pointer border mr-1 ${optionBtnClass(true)}`}
          >
            {tag} ×
          </button>
        ))}
      <div className="flex gap-1.25 mt-1.25">
        <input
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addCustom();
            }
          }}
          placeholder="Custom tag…"
          className={`${fullInputClass} flex-1 text-10px py-1 px-1.75`}
        />
        <button type="button" onClick={addCustom} className={ghostBtnClass}>
          +
        </button>
      </div>
    </div>
  );
});

export function CsvImportButton() {
  const { importTradesCsv } = useStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<'merge' | 'replace'>('merge');
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setStatus(null);
    try {
      const text = await file.text();
      const result = await importTradesCsv(text, mode);
      setStatus(
        `✓ Imported ${result.count} trades${result.errors ? ` (${result.errors} skipped)` : ''}`
      );
    } catch (err) {
      setStatus(`✗ ${String(err)}`);
    }
    setLoading(false);
    e.target.value = '';
  };

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {(['merge', 'replace'] as const).map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => setMode(m)}
          className={`text-9px font-mono px-2 py-0.5 rounded-md cursor-pointer border transition-all ${pillToggleClass(mode === m)}`}
        >
          {m}
        </button>
      ))}

      <input
        ref={fileRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={handleFile}
      />
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={loading}
        className={`${ghostBtnClass} text-10px font-semibold px-2.5 py-1 disabled:opacity-60`}
      >
        {loading ? '…' : '⬆ Import CSV'}
      </button>

      {status && (
        <span
          className={`text-9px font-mono ${status.startsWith('✓') ? 'text-green' : 'text-red'}`}
        >
          {status}
        </span>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main TradeLog component
// ─────────────────────────────────────────────────────────────────────────────
export default function TradeLog() {
  const {
    trades,
    addTrade,
    updateTrade,
    deleteTrade,
    sym,
    livePrice,
    entryPrice,
    stopPrice,
    suggestion,
    currentDir,
    hydrateTradesFromIdb,
    exportTradesCsv,
    importTradesCsv,
  } = useStore();

  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<TradeJournalEntry>>({});
  const [showForm, setShowForm] = useState(false);
  const [showCharts, setShowCharts] = useState(false);
  const [page, setPage] = useState(0);
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [importMsg, setImportMsg] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const [fOutcome, setFOutcome] = useState('');
  const [fSymbol, setFSymbol] = useState('');
  const [fDateFrom, setFDateFrom] = useState('');
  const [fDateTo, setFDateTo] = useState('');
  const [fTag, setFTag] = useState('');
  const [fDir, setFDir] = useState('');

  const blankTrade = useCallback(
    (): Partial<Omit<TradeJournalEntry, 'id'>> => ({
      symbol: sym,
      dir: currentDir,
      outcome: 'open',
      entry: parseFloat(entryPrice) || livePrice,
      stop: parseFloat(stopPrice) || 0,
      target: suggestion?.target || 0,
      pnl: 0,
      notes: '',
      tags: [],
      screenshotUrl: '',
      date: new Date().toISOString().slice(0, 10),
    }),
    [sym, currentDir, entryPrice, livePrice, stopPrice, suggestion]
  );
  const [newTrade, setNewTrade] = useState<Partial<Omit<TradeJournalEntry, 'id'>>>(blankTrade);

  useEffect(() => {
    hydrateTradesFromIdb?.();
  }, [hydrateTradesFromIdb]);

  const filtered = useMemo(
    () =>
      trades.filter((t) => {
        if (fOutcome && t.outcome !== fOutcome) return false;
        if (fSymbol && !t.symbol.toLowerCase().includes(fSymbol.toLowerCase())) return false;
        if (fDir && t.dir !== fDir) return false;
        if (fDateFrom && t.date < fDateFrom) return false;
        if (fDateTo && t.date > fDateTo) return false;
        if (fTag && !(t.tags ?? []).includes(fTag)) return false;
        return true;
      }),
    [trades, fOutcome, fSymbol, fDir, fDateFrom, fDateTo, fTag]
  );

  const sorted = useMemo(
    () => [...filtered].sort((a, b) => b.date.localeCompare(a.date)),
    [filtered]
  );

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  const paginated = useMemo(
    () => sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE),
    [sorted, page]
  );

  useEffect(() => setPage(0), [fOutcome, fSymbol, fDir, fDateFrom, fDateTo, fTag]);

  const stats = useMemo(
    () => ({
      total: filtered.length,
      wins: filtered.filter((t) => t.outcome === 'win').length,
      losses: filtered.filter((t) => t.outcome === 'loss').length,
      pnl: filtered.reduce((a, t) => a + (t.pnl || 0), 0),
    }),
    [filtered]
  );
  const wr = stats.total > 0 ? ((stats.wins / stats.total) * 100).toFixed(0) : '—';

  const allTags = useMemo(
    () => [...new Set(trades.flatMap((t) => t.tags ?? []))].sort(),
    [trades]
  );

  const handleAdd = () => {
    if (!newTrade.entry) return;
    addTrade({
      date: newTrade.date ?? new Date().toISOString().slice(0, 10),
      symbol: newTrade.symbol ?? sym,
      dir: newTrade.dir ?? 'long',
      entry: newTrade.entry ?? 0,
      stop: newTrade.stop ?? 0,
      target: newTrade.target ?? 0,
      outcome: newTrade.outcome ?? 'open',
      pnl: newTrade.pnl ?? 0,
      notes: newTrade.notes ?? '',
      tags: newTrade.tags ?? [],
      screenshotUrl: newTrade.screenshotUrl ?? '',
    });
    setShowForm(false);
  };

  const handleExportCSV = () => {
    const csv = exportTradesCsv?.() ?? '';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `journal_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const csv = ev.target?.result as string;
      try {
        const result = await importTradesCsv?.(csv, importMode);
        setImportMsg(
          `✓ Imported ${result?.count ?? 0} trades${result?.errors ? `, ${result.errors} errors` : ''}`
        );
      } catch (err) {
        setImportMsg(`✗ ${String(err)}`);
      }
      setTimeout(() => setImportMsg(''), 4000);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div>
      <div className="mb-3">
        <MetricGrid columns={4}>
          <MetricBox label="Total" value={stats.total} />
          <MetricBox label="Win Rate" value={wr + (wr !== '—' ? '%' : '')} valueColor="var(--green)" />
          <MetricBox label="W / L" value={`${stats.wins} / ${stats.losses}`} valueColor="var(--text2)" />
          <MetricBox
            label="Net P&L"
            value={(stats.pnl >= 0 ? '+' : '') + '$' + stats.pnl.toFixed(2)}
            valueColor={stats.pnl >= 0 ? 'var(--green)' : 'var(--red)'}
          />
        </MetricGrid>
      </div>

      <div className="flex gap-1.5 flex-wrap items-center mb-2.5">
        <ActionBtn
          variant="green"
          onClick={() => {
            setNewTrade(blankTrade());
            setShowForm((f) => !f);
          }}
        >
          {showForm ? '✕ Cancel' : '+ Log Trade'}
        </ActionBtn>
        <ActionBtn onClick={() => setShowCharts((c) => !c)}>
          {showCharts ? '✕ Charts' : '📈 Charts'}
        </ActionBtn>
        <ActionBtn onClick={handleExportCSV}>⬇ CSV</ActionBtn>

        <div className="flex gap-1 items-center">
          <select
            value={importMode}
            onChange={(e) => setImportMode(e.target.value as 'merge' | 'replace')}
            className={`${selectInputClass} w-[90px] py-1 px-1.5 text-10px`}
          >
            <option value="merge">Merge</option>
            <option value="replace">Replace</option>
          </select>
          <ActionBtn onClick={() => fileRef.current?.click()}>⬆ Import</ActionBtn>
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleImportFile}
          />
        </div>
        {importMsg && (
          <span
            className={`text-10px font-mono ${importMsg.startsWith('✓') ? 'text-green' : 'text-red'}`}
          >
            {importMsg}
          </span>
        )}
      </div>

      <div className="flex gap-1.5 flex-wrap mb-2.5">
        {[
          {
            label: 'Outcome',
            state: fOutcome,
            set: setFOutcome,
            opts: ['', 'win', 'loss', 'be', 'open'],
          },
          { label: 'Dir', state: fDir, set: setFDir, opts: ['', 'long', 'short'] },
        ].map(({ label, state, set, opts }) => (
          <select
            key={label}
            value={state}
            onChange={(e) => set(e.target.value)}
            className={filterSelectClass}
          >
            {opts.map((o) => (
              <option key={o} value={o}>
                {o || label + ': All'}
              </option>
            ))}
          </select>
        ))}
        <input
          value={fSymbol}
          onChange={(e) => setFSymbol(e.target.value)}
          placeholder="Symbol…"
          className={`${filterInputClass} w-[110px]`}
        />
        <input
          type="date"
          value={fDateFrom}
          onChange={(e) => setFDateFrom(e.target.value)}
          className={`${filterInputClass} w-auto`}
        />
        <input
          type="date"
          value={fDateTo}
          onChange={(e) => setFDateTo(e.target.value)}
          className={`${filterInputClass} w-auto`}
        />
        {allTags.length > 0 && (
          <select value={fTag} onChange={(e) => setFTag(e.target.value)} className={filterSelectClass}>
            <option value="">Tag: All</option>
            {allTags.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        )}
        {(fOutcome || fSymbol || fDir || fDateFrom || fDateTo || fTag) && (
          <button
            type="button"
            onClick={() => {
              setFOutcome('');
              setFSymbol('');
              setFDir('');
              setFDateFrom('');
              setFDateTo('');
              setFTag('');
            }}
            className={delBtnClass}
          >
            ✕ Clear
          </button>
        )}
      </div>

      {showForm && (
        <Card className="mb-3">
          <PanelHeader title="📝 Log New Trade" />
          <div className="grid grid-cols-2 gap-2 mb-2">
            {[
              { label: 'Date', type: 'date', key: 'date', val: newTrade.date },
              { label: 'Symbol', type: 'text', key: 'symbol', val: newTrade.symbol },
              { label: 'Entry', type: 'number', key: 'entry', val: newTrade.entry || '' },
              { label: 'Stop', type: 'number', key: 'stop', val: newTrade.stop || '' },
              { label: 'Target', type: 'number', key: 'target', val: newTrade.target || '' },
              { label: 'P&L ($)', type: 'number', key: 'pnl', val: newTrade.pnl || '' },
            ].map(({ label, type, key, val }) => (
              <div key={key}>
                <label className={fieldBlockClass}>{label}</label>
                <input
                  type={type}
                  step={type === 'number' ? '0.01' : undefined}
                  value={String(val ?? '')}
                  onChange={(e) =>
                    setNewTrade((p) => ({
                      ...p,
                      [key]: type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value,
                    }))
                  }
                  className={fullInputClass}
                />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div>
              <label className={fieldBlockClass}>Direction</label>
              <select
                value={newTrade.dir}
                onChange={(e) =>
                  setNewTrade((p) => ({ ...p, dir: e.target.value as 'long' | 'short' }))
                }
                className={fullInputClass}
              >
                <option value="long">Long</option>
                <option value="short">Short</option>
              </select>
            </div>
            <div>
              <label className={fieldBlockClass}>Outcome</label>
              <select
                value={newTrade.outcome}
                onChange={(e) =>
                  setNewTrade((p) => ({
                    ...p,
                    outcome: e.target.value as 'win' | 'loss' | 'be' | 'open',
                  }))
                }
                className={fullInputClass}
              >
                <option value="open">Open</option>
                <option value="win">Win</option>
                <option value="loss">Loss</option>
                <option value="be">Break-even</option>
              </select>
            </div>
          </div>
          <div className="mb-2">
            <label className={fieldBlockClass}>Notes</label>
            <textarea
              value={newTrade.notes}
              onChange={(e) => setNewTrade((p) => ({ ...p, notes: e.target.value }))}
              rows={2}
              className={`${fullInputClass} resize-y`}
            />
          </div>
          <div className="mb-2">
            <label className={fieldBlockClass}>Screenshot URL (optional)</label>
            <input
              value={newTrade.screenshotUrl ?? ''}
              onChange={(e) => setNewTrade((p) => ({ ...p, screenshotUrl: e.target.value }))}
              placeholder="https://…"
              className={fullInputClass}
            />
          </div>
          <div className="mb-2.5">
            <label className={fieldBlockClass}>Tags</label>
            <TagSelector
              tags={newTrade.tags ?? []}
              onChange={(tags) => setNewTrade((p) => ({ ...p, tags }))}
            />
          </div>
          <div className="flex gap-2">
            <ActionBtn variant="green" onClick={handleAdd}>
              Save Trade
            </ActionBtn>
            <ActionBtn onClick={() => setShowForm(false)}>Cancel</ActionBtn>
          </div>
        </Card>
      )}

      {showCharts && filtered.length > 0 && (
        <Card className="mb-3">
          <PanelHeader title="📈 Journal Charts" />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className={chartLabelClass}>Equity Curve</div>
              <EquityCurve trades={filtered} />
            </div>
            <div>
              <div className={chartLabelClass}>Win Rate by Symbol</div>
              <WinBySymbol trades={filtered} />
            </div>
            <div>
              <div className={chartLabelClass}>Win Rate by Day of Week</div>
              <WinByHour trades={filtered} />
            </div>
            <div>
              <div className={chartLabelClass}>P&L by Day of Week</div>
              <PnLByDay trades={filtered} />
            </div>
            <div className="col-span-full">
              <div className={chartLabelClass}>Achieved R vs Planned R</div>
              <RRChart trades={filtered} />
            </div>
          </div>
        </Card>
      )}

      {!filtered.length ? (
        <div className="text-11px font-mono text-text3 text-center py-10 italic">
          {trades.length === 0 ? 'No trades logged yet.' : 'No trades match the current filters.'}
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-1.5">
            {paginated.map((trade) => {
              const outcomeBadge =
                OUTCOME_BADGE[trade.outcome] ?? OUTCOME_BADGE.open;
              const isEdit = editing === trade.id;
              return (
                <div
                  key={trade.id}
                  className="bg-bg2 border border-border rounded-sm px-3 py-2.5"
                >
                  {isEdit ? (
                    <div>
                      <div className="grid grid-cols-2 gap-1.5 mb-1.5">
                        <div>
                          <label className={fieldBlockClass}>Outcome</label>
                          <select
                            value={draft.outcome ?? trade.outcome}
                            onChange={(e) =>
                              setDraft((p) => ({
                                ...p,
                                outcome: e.target.value as 'win' | 'loss' | 'be' | 'open',
                              }))
                            }
                            className={fullInputClass}
                          >
                            <option value="open">Open</option>
                            <option value="win">Win</option>
                            <option value="loss">Loss</option>
                            <option value="be">Break-even</option>
                          </select>
                        </div>
                        <div>
                          <label className={fieldBlockClass}>P&L ($)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={draft.pnl ?? trade.pnl}
                            onChange={(e) =>
                              setDraft((p) => ({ ...p, pnl: parseFloat(e.target.value) || 0 }))
                            }
                            className={fullInputClass}
                          />
                        </div>
                      </div>
                      <textarea
                        value={draft.notes ?? trade.notes}
                        onChange={(e) => setDraft((p) => ({ ...p, notes: e.target.value }))}
                        rows={2}
                        className={`${fullInputClass} mb-1.5 resize-y`}
                      />
                      <div className="mb-1.5">
                        <label className={fieldBlockClass}>Screenshot URL</label>
                        <input
                          value={draft.screenshotUrl ?? trade.screenshotUrl ?? ''}
                          onChange={(e) =>
                            setDraft((p) => ({ ...p, screenshotUrl: e.target.value }))
                          }
                          placeholder="https://…"
                          className={fullInputClass}
                        />
                      </div>
                      <div className="mb-1.5">
                        <label className={fieldBlockClass}>Tags</label>
                        <TagSelector
                          tags={draft.tags ?? trade.tags ?? []}
                          onChange={(tags) => setDraft((p) => ({ ...p, tags }))}
                        />
                      </div>
                      <div className="flex gap-1.5">
                        <ActionBtn
                          variant="green"
                          onClick={() => {
                            updateTrade(trade.id, draft);
                            setEditing(null);
                            setDraft({});
                          }}
                        >
                          Save
                        </ActionBtn>
                        <ActionBtn
                          onClick={() => {
                            setEditing(null);
                            setDraft({});
                          }}
                        >
                          Cancel
                        </ActionBtn>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-9px font-mono text-text3">{trade.date}</span>
                        <span className="text-10px font-mono font-semibold">
                          {fmtSymDisplay(trade.symbol)}
                        </span>
                        <span
                          className={`text-9px font-mono font-bold px-1.5 py-0.25 rounded ${
                            trade.dir === 'long'
                              ? 'text-green bg-green-bg'
                              : 'text-red bg-red-bg'
                          }`}
                        >
                          {trade.dir === 'long' ? '▲ L' : '▼ S'}
                        </span>
                        <span className="text-10px font-mono text-text2">
                          @ {fmtPrice(trade.entry)}
                        </span>
                        <span
                          className={`text-10px font-mono font-bold px-1.75 py-0.25 rounded ${outcomeBadge}`}
                        >
                          {trade.outcome.toUpperCase()}
                        </span>
                        <span
                          className={`text-10px font-mono font-bold ml-auto ${pnlTextClass(trade.pnl || 0)}`}
                        >
                          {(trade.pnl || 0) >= 0 ? '+' : ''}${(trade.pnl || 0).toFixed(2)}
                        </span>
                      </div>
                      {(trade.tags ?? []).length > 0 && (
                        <div className="flex gap-1 flex-wrap mt-1">
                          {(trade.tags ?? []).map((tag) => (
                            <span
                              key={tag}
                              className="text-8px font-mono px-1.5 py-0.25 rounded-lg bg-green/8 text-accent border border-green/20"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                      {trade.notes && (
                        <div className="text-9px font-mono text-text3 mt-0.75">
                          {trade.notes}
                        </div>
                      )}
                      {trade.screenshotUrl && (
                        <a
                          href={trade.screenshotUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-9px font-mono text-blue mt-0.75 inline-block"
                        >
                          📷 Screenshot ↗
                        </a>
                      )}
                      <div className="flex gap-1 mt-1.25">
                        <button
                          type="button"
                          onClick={() => {
                            setEditing(trade.id);
                            setDraft({});
                          }}
                          className={`${ghostBtnClass} text-10px py-0.5 px-1.75`}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteTrade(trade.id)}
                          className={`${delBtnClass} text-10px py-0.5 px-1.75`}
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-1.5 mt-3">
              <button
                type="button"
                onClick={() => setPage(0)}
                disabled={page === 0}
                className={pgBtnClass(page === 0)}
              >
                «
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className={pgBtnClass(page === 0)}
              >
                ‹
              </button>
              <span className="text-10px font-mono text-text2">
                {page + 1} / {totalPages} ({filtered.length} trades)
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page === totalPages - 1}
                className={pgBtnClass(page === totalPages - 1)}
              >
                ›
              </button>
              <button
                type="button"
                onClick={() => setPage(totalPages - 1)}
                disabled={page === totalPages - 1}
                className={pgBtnClass(page === totalPages - 1)}
              >
                »
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
