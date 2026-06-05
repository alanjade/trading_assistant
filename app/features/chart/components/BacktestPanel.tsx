'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { wrap } from 'comlink';
import { ActionBtn, Card, MetricBox, MetricGrid, PanelHeader, settingsInputClass } from '@/components/ui';
import type {
  BacktestResult,
  BacktestTrade,
  MonthlyStats,
} from '@/lib/backtestTypes';
import { fmtPrice } from '@/lib/indicators';
import { useStore } from '@/lib/store';

interface BacktestWorker {
  runBacktest(args: { candles: Array<unknown>; strategy: unknown; capital: number }): Promise<BacktestResult>;
}

// ── Tiny canvas chart helpers ─────────────────────────────────────────────────
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

// ── Colour palette ─────────────────────────────────────────────────────────────
const C = {
  green: '#00e5a0',
  red: '#ff3d5a',
  amber: '#ffb82e',
  blue: '#4da6ff',
  purple: '#a78bff',
  bg3: '#131820',
  border: 'rgba(255,255,255,0.07)',
  text2: '#6b7591',
  text3: '#3d4460',
};

// ── Metric box ────────────────────────────────────────────────────────────────
// ── Chart: Equity + Drawdown dual-axis ────────────────────────────────────────
function EquityChart({ result }: { result: BacktestResult }) {
  const ref = useCanvas(
    (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = C.bg3;
      ctx.fillRect(0, 0, w, h);

      const eq = result.equity;
      const dd = result.drawdown;
      if (!eq.length) return;

      const pad = { t: 12, b: 16, l: 8, r: 8 };
      const cw = w - pad.l - pad.r;
      const ch = h - pad.t - pad.b;

      const minEq = Math.min(...eq);
      const maxEq = Math.max(...eq);
      const rngEq = maxEq - minEq || 1;
      const maxDD = Math.max(...dd, 1);

      const xOf = (i: number) => pad.l + (i / (eq.length - 1)) * cw;
      const yEq = (v: number) => pad.t + (1 - (v - minEq) / rngEq) * ch;
      const yDD = (v: number) => pad.t + (v / maxDD) * (ch * 0.3);

      // Drawdown fill (inverted, bottom area)
      ctx.fillStyle = 'rgba(255,61,90,0.12)';
      ctx.beginPath();
      ctx.moveTo(xOf(0), h - pad.b);
      for (let i = 0; i < dd.length; i++) ctx.lineTo(xOf(i), h - pad.b - yDD(dd[i]));
      ctx.lineTo(xOf(dd.length - 1), h - pad.b);
      ctx.closePath();
      ctx.fill();

      // Drawdown line
      ctx.strokeStyle = 'rgba(255,61,90,0.5)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      for (let i = 0; i < dd.length; i++) {
        const x = xOf(i),
          y = h - pad.b - yDD(dd[i]);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Equity fill
      const startY = yEq(eq[0]);
      ctx.fillStyle = 'rgba(0,229,160,0.08)';
      ctx.beginPath();
      ctx.moveTo(xOf(0), startY);
      for (let i = 1; i < eq.length; i++) ctx.lineTo(xOf(i), yEq(eq[i]));
      ctx.lineTo(xOf(eq.length - 1), h - pad.b);
      ctx.lineTo(xOf(0), h - pad.b);
      ctx.closePath();
      ctx.fill();

      // Equity line
      ctx.strokeStyle = C.green;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let i = 0; i < eq.length; i++) {
        const x = xOf(i),
          y = yEq(eq[i]);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Trade entry markers
      ctx.fillStyle = C.green;
      for (const t of result.trades) {
        if (t.exitIdx >= eq.length) continue;
        const x = xOf(t.entryIdx);
        const y = yEq(eq[t.entryIdx]);
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, Math.PI * 2);
        ctx.fillStyle = t.pnl > 0 ? C.green : C.red;
        ctx.fill();
      }

      // Labels
      ctx.fillStyle = C.text2;
      ctx.font = '9px JetBrains Mono, monospace';
      ctx.textAlign = 'right';
      ctx.fillText('$' + maxEq.toFixed(0), w - pad.r, pad.t + 10);
      ctx.fillText('$' + minEq.toFixed(0), w - pad.r, h - pad.b);
      ctx.fillStyle = 'rgba(255,61,90,0.7)';
      ctx.textAlign = 'left';
      ctx.fillText('DD ' + result.maxDrawdownPct.toFixed(1) + '%', pad.l + 2, h - pad.b);
    },
    [result]
  );

  return (
    <canvas ref={ref} className="w-full h-35 block rounded-sm" />
  );
}

// ── Monthly bar chart ─────────────────────────────────────────────────────────
function MonthlyChart({ monthly }: { monthly: MonthlyStats[] }) {
  const ref = useCanvas(
    (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = C.bg3;
      ctx.fillRect(0, 0, w, h);
      if (!monthly.length) return;

      const pad = { t: 12, b: 22, l: 6, r: 6 };
      const cw = w - pad.l - pad.r;
      const ch = h - pad.t - pad.b;
      const n = monthly.length;

      const maxAbs = Math.max(...monthly.map((m) => Math.abs(m.pnl)), 1);
      const bw = Math.max(4, cw / n - 2);
      const midY = pad.t + ch / 2;

      // Zero line
      ctx.strokeStyle = C.border;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(pad.l, midY);
      ctx.lineTo(w - pad.r, midY);
      ctx.stroke();

      monthly.forEach((m, i) => {
        const x = pad.l + (i / n) * cw + 1;
        const norm = m.pnl / maxAbs;
        const bh = Math.abs(norm) * (ch / 2 - 2);
        const y = norm >= 0 ? midY - bh : midY;
        ctx.fillStyle = m.pnl >= 0 ? 'rgba(0,229,160,0.6)' : 'rgba(255,61,90,0.6)';
        ctx.fillRect(x, y, bw, bh || 1);

        // Month label
        ctx.fillStyle = C.text3;
        ctx.font = '7px JetBrains Mono, monospace';
        ctx.textAlign = 'center';
        ctx.fillText(m.month.slice(5), x + bw / 2, h - pad.b + 10);
      });
    },
    [monthly]
  );

  return (
    <canvas ref={ref} className="w-full h-25 block rounded-sm" />
  );
}

// ── Win/Loss P&L histogram ────────────────────────────────────────────────────
function PnLHistogram({ trades }: { trades: BacktestTrade[] }) {
  const ref = useCanvas(
    (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = C.bg3;
      ctx.fillRect(0, 0, w, h);
      if (!trades.length) return;

      const pad = { t: 8, b: 16, l: 6, r: 6 };
      const cw = w - pad.l - pad.r;
      const ch = h - pad.t - pad.b;

      // Bin trades into 20 buckets
      const pnls = trades.map((t) => t.pnl);
      const minP = Math.min(...pnls);
      const maxP = Math.max(...pnls);
      const range = maxP - minP || 1;
      const BINS = 20;
      const bins = new Array(BINS).fill(0);
      pnls.forEach((p) => {
        const b = Math.min(BINS - 1, Math.floor(((p - minP) / range) * BINS));
        bins[b]++;
      });

      const maxBin = Math.max(...bins, 1);
      const bw = cw / BINS;
      const zeroBin = Math.floor(((0 - minP) / range) * BINS);

      bins.forEach((cnt, i) => {
        const x = pad.l + i * bw;
        const bh = (cnt / maxBin) * ch;
        ctx.fillStyle = i < zeroBin ? 'rgba(255,61,90,0.6)' : 'rgba(0,229,160,0.6)';
        ctx.fillRect(x + 1, pad.t + ch - bh, bw - 2, bh);
      });

      // Zero line
      const zeroX = pad.l + (zeroBin / BINS) * cw;
      ctx.strokeStyle = C.amber;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(zeroX, pad.t);
      ctx.lineTo(zeroX, h - pad.b);
      ctx.stroke();

      ctx.fillStyle = C.text3;
      ctx.font = '8px JetBrains Mono, monospace';
      ctx.textAlign = 'center';
      ctx.fillText('$' + minP.toFixed(0), pad.l + bw, h - 2);
      ctx.fillText('$' + maxP.toFixed(0), w - pad.r - bw, h - 2);
    },
    [trades]
  );

  return (
    <canvas ref={ref} className="w-full h-20 block rounded-sm" />
  );
}

// ── MAE / MFE scatter ─────────────────────────────────────────────────────────
function MAEMFEScatter({ trades }: { trades: BacktestTrade[] }) {
  const ref = useCanvas(
    (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = C.bg3;
      ctx.fillRect(0, 0, w, h);
      if (!trades.length) return;

      const pad = { t: 6, b: 16, l: 24, r: 6 };
      const cw = w - pad.l - pad.r;
      const ch = h - pad.t - pad.b;

      const maxMFE = Math.max(...trades.map((t) => t.mfe), 0.01);
      const minMAE = Math.min(...trades.map((t) => t.mae), -0.01);

      trades.forEach((t) => {
        const x = pad.l + (t.mfe / maxMFE) * cw;
        const y = pad.t + ch - ((t.mae - minMAE) / (0 - minMAE)) * ch;
        ctx.beginPath();
        ctx.arc(
          Math.max(pad.l, Math.min(w - pad.r, x)),
          Math.max(pad.t, Math.min(h - pad.b, y)),
          3,
          0,
          Math.PI * 2
        );
        ctx.fillStyle = t.pnl > 0 ? 'rgba(0,229,160,0.55)' : 'rgba(255,61,90,0.55)';
        ctx.fill();
      });

      // Axes
      ctx.strokeStyle = C.text3;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(pad.l, pad.t);
      ctx.lineTo(pad.l, h - pad.b);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(pad.l, h - pad.b);
      ctx.lineTo(w - pad.r, h - pad.b);
      ctx.stroke();

      ctx.fillStyle = C.text3;
      ctx.font = '7px JetBrains Mono, monospace';
      ctx.textAlign = 'center';
      ctx.fillText('MFE%', w / 2, h - 2);
      ctx.save();
      ctx.translate(10, h / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText('MAE%', 0, 0);
      ctx.restore();
    },
    [trades]
  );

  return (
    <canvas ref={ref} className="w-full h-22.5 block rounded-sm" />
  );
}

// ── R-distribution bar chart ──────────────────────────────────────────────────
function RDistChart({ trades }: { trades: BacktestTrade[] }) {
  const ref = useCanvas(
    (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = C.bg3;
      ctx.fillRect(0, 0, w, h);
      if (!trades.length) return;

      const pad = { t: 6, b: 14, l: 6, r: 6 };
      const cw = w - pad.l - pad.r;
      const ch = h - pad.t - pad.b;

      const rs = trades.map((t) => t.r);
      const minR = Math.floor(Math.min(...rs, -2));
      const maxR = Math.ceil(Math.max(...rs, 5));
      const range = maxR - minR || 1;
      const BINS = maxR - minR;
      const bins = new Array(BINS).fill(0);
      rs.forEach((r) => {
        const b = Math.min(BINS - 1, Math.floor(((r - minR) / range) * BINS));
        bins[Math.max(0, b)]++;
      });

      const maxBin = Math.max(...bins, 1);
      const bw = cw / BINS;
      const zeroBin = -minR;

      bins.forEach((cnt, i) => {
        const x = pad.l + i * bw;
        const bh = (cnt / maxBin) * ch;
        ctx.fillStyle = i < zeroBin ? 'rgba(255,61,90,0.55)' : 'rgba(0,229,160,0.55)';
        ctx.fillRect(x + 1, pad.t + ch - bh, bw - 2, bh);
      });

      const zeroX = pad.l + (zeroBin / BINS) * cw;
      ctx.strokeStyle = C.amber;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(zeroX, pad.t);
      ctx.lineTo(zeroX, h - pad.b);
      ctx.stroke();

      ctx.fillStyle = C.text3;
      ctx.font = '7px JetBrains Mono, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(minR + 'R', pad.l + bw, h - 2);
      ctx.fillText(maxR + 'R', w - pad.r - bw, h - 2);
    },
    [trades]
  );

  return (
    <canvas ref={ref} className="w-full h-17.5 block rounded-sm" />
  );
}

// ── Export helpers ─────────────────────────────────────────────────────────────
function downloadCSV(result: BacktestResult) {
  const headers = [
    '#',
    'Dir',
    'Entry Time',
    'Exit Time',
    'Entry',
    'Exit',
    'Size',
    'Fees',
    'Funding',
    'PnL',
    'PnL%',
    'R',
    'Exit Reason',
    'MAE%',
    'MFE%',
  ];
  const rows = result.trades.map((t, i) => [
    i + 1,
    t.dir,
    new Date(t.entryTime).toISOString(),
    new Date(t.exitTime).toISOString(),
    t.entryPrice.toFixed(4),
    t.exitPrice.toFixed(4),
    t.size.toFixed(2),
    (t.fees ?? 0).toFixed(4),
    (t.funding ?? 0).toFixed(4),
    t.pnl.toFixed(2),
    t.pnlPct.toFixed(2),
    t.r.toFixed(2),
    t.exitReason,
    t.mae.toFixed(2),
    t.mfe.toFixed(2),
  ]);
  const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
  dl('backtest_trades.csv', 'text/csv', csv);
}

function downloadJSON(result: BacktestResult, strategyName: string) {
  const summary = {
    strategy: strategyName,
    generatedAt: new Date().toISOString(),
    totalTrades: result.totalTrades,
    winRate: (result.winRate * 100).toFixed(2) + '%',
    profitFactor: result.profitFactor.toFixed(3),
    sharpe: result.sharpe.toFixed(3),
    sortino: result.sortino.toFixed(3),
    maxDrawdownPct: result.maxDrawdownPct.toFixed(2) + '%',
    totalPnl: result.totalPnl.toFixed(2),
    totalPnlPct: result.totalPnlPct.toFixed(2) + '%',
    expectancy: result.expectancy.toFixed(2),
    avgWin: result.avgWin.toFixed(2),
    avgLoss: result.avgLoss.toFixed(2),
    avgR: result.avgR.toFixed(3),
    monthly: result.monthly,
    trades: result.trades,
  };
  dl('backtest_summary.json', 'application/json', JSON.stringify(summary, null, 2));
}

function dl(filename: string, type: string, content: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([content], { type }));
  a.download = filename;
  a.click();
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function BacktestPanel() {
  const {
    candles,
    strategies,
    activeStrategyId,
    capital,
    backtestResult,
    setBacktestResult,
    backtestRunning,
    setBacktestRunning,
  } = useStore();

  const workerRef = useRef<Worker | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedStratId, setSelectedStratId] = useState(activeStrategyId ?? '');

  const activeStrat = strategies.find((s) => s.id === selectedStratId) ?? strategies[0];

  const runBacktest = useCallback(() => {
    if (!candles.length || !activeStrat) return;
    setError(null);
    setBacktestRunning(true);
    setBacktestResult(null);

    // Lazy-load worker
    if (workerRef.current) {
      workerRef.current.terminate();
    }
    const worker = new Worker(new URL('@/workers/backtest.worker.ts', import.meta.url), {
      type: 'module',
    });
    const BacktestWorker = wrap<BacktestWorker>(worker);

    BacktestWorker.runBacktest({
      candles,
      strategy: activeStrat,
      capital: parseFloat(String(capital)) || 1000,
    })
      .then((result: BacktestResult) => {
        setBacktestRunning(false);
        setBacktestResult(result);
        worker.terminate();
      })
      .catch((err: Error) => {
        setBacktestRunning(false);
        setError(err.message);
        worker.terminate();
      });
  }, [candles, activeStrat, capital, setBacktestResult, setBacktestRunning]);

  const r = backtestResult;

  const pf = r ? r.profitFactor : null;
  const pfColor = pf === null ? undefined : pf >= 2 ? C.green : pf >= 1.2 ? C.amber : C.red;

  return (
    <Card>
      <PanelHeader
        title="⚙ Backtest"
        actions={
          <div className="flex gap-1.5 items-center">
            {strategies.length > 1 && (
              <select
                value={selectedStratId}
                onChange={(e) => setSelectedStratId(e.target.value)}
                className={settingsInputClass}
              >
                {strategies.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            )}
            <span className="text-9px font-mono text-text3">{candles.length} bars</span>
            <ActionBtn
              variant={backtestRunning ? 'default' : 'green'}
              onClick={runBacktest}
              className={backtestRunning ? 'opacity-60' : undefined}
            >
              {backtestRunning ? '⏳ Running…' : '▶ Run Backtest'}
            </ActionBtn>
          </div>
        }
      />

      {error && (
        <div className="px-2.5 py-2 bg-red-bg border border-red rounded-md text-10px font-mono text-red mb-2.5">
          Error: {error}
        </div>
      )}

      {!r && !backtestRunning && (
        <div className="text-10px font-mono text-text3 text-center py-5">
          Click &quot;Run Backtest&quot; to simulate {activeStrat?.name ?? 'the selected strategy'}{' '}
          on {candles.length} historical candles.
        </div>
      )}

      {backtestRunning && (
        <div className="text-10px font-mono text-text2 text-center py-5">
          Running simulation… (Web Worker)
        </div>
      )}

      {r && (
        <>
          {/* ── Metrics grid ──────────────────────────────────────────────── */}
          <MetricGrid columns={4}>
            <MetricBox
              label="Total P&L"
              value={(r.totalPnl >= 0 ? '+' : '') + '$' + r.totalPnl.toFixed(2)}
              valueColor={r.totalPnl >= 0 ? C.green : C.red}
              good={r.totalPnl > 0}
              danger={r.totalPnl < 0}
            />
            <MetricBox
              label="P&L %"
              value={(r.totalPnlPct >= 0 ? '+' : '') + r.totalPnlPct.toFixed(2) + '%'}
              valueColor={r.totalPnlPct >= 0 ? C.green : C.red}
            />
            <MetricBox
              label="Win Rate"
              value={(r.winRate * 100).toFixed(1) + '%'}
              valueColor={r.winRate >= 0.5 ? C.green : C.red}
              good={r.winRate >= 0.55}
              warn={r.winRate < 0.45}
            />
            <MetricBox
              label="Profit Factor"
              value={r.profitFactor === Infinity ? 'Infinity' : r.profitFactor.toFixed(2)}
              valueColor={pfColor}
              good={(pf ?? 0) >= 1.5}
              warn={(pf ?? 0) >= 1 && (pf ?? 0) < 1.5}
              danger={(pf ?? 0) < 1}
            />
          </MetricGrid>
          <div className="mb-3">
            <MetricGrid columns={4}>
            <MetricBox
              label="Sharpe"
              value={r.sharpe.toFixed(2)}
              valueColor={r.sharpe >= 1.5 ? C.green : r.sharpe >= 0.5 ? C.amber : C.red}
            />
            <MetricBox
              label="Sortino"
              value={r.sortino.toFixed(2)}
              valueColor={r.sortino >= 2 ? C.green : r.sortino >= 1 ? C.amber : C.red}
            />
            <MetricBox
              label="Max DD"
              value={r.maxDrawdownPct.toFixed(1) + '%'}
              valueColor={C.red}
              danger={r.maxDrawdownPct > 20}
              warn={r.maxDrawdownPct > 10}
            />
            <MetricBox
              label="Expectancy"
              value={'$' + r.expectancy.toFixed(2)}
              valueColor={r.expectancy >= 0 ? C.green : C.red}
            />
          </MetricGrid>
          </div>
          <div className="mb-3.5">
            <MetricGrid columns={4}>
            <MetricBox label="Trades" value={String(r.totalTrades)} />
            <MetricBox label="Wins / Loss" value={`${r.wins} / ${r.losses}`} />
            <MetricBox label="Avg Win" value={'$' + r.avgWin.toFixed(2)} valueColor={C.green} />
            <MetricBox label="Avg Loss" value={'$' + r.avgLoss.toFixed(2)} valueColor={C.red} />
          </MetricGrid>
          </div>

          {/* ── Visualisations ─────────────────────────────────────────────── */}
          <div className="mb-3">
            <ChartLabel>Equity Curve + Drawdown · Trade Markers</ChartLabel>
            <EquityChart result={r} />
          </div>

          <div
            className="grid grid-cols-2 gap-2.5 mb-3"
          >
            <div>
              <ChartLabel>Monthly P&amp;L</ChartLabel>
              <MonthlyChart monthly={r.monthly} />
            </div>
            <div>
              <ChartLabel>P&amp;L Distribution (Win/Loss)</ChartLabel>
              <PnLHistogram trades={r.trades} />
            </div>
          </div>

          <div
            className="grid grid-cols-2 gap-2.5 mb-3.5"
          >
            <div>
              <ChartLabel>MAE vs MFE Scatter</ChartLabel>
              <MAEMFEScatter trades={r.trades} />
            </div>
            <div>
              <ChartLabel>R-Multiple Distribution</ChartLabel>
              <RDistChart trades={r.trades} />
            </div>
          </div>

          {/* ── Trade table (last 20) ─────────────────────────────────────── */}
          <details className="mb-2.5">
            <summary className="text-10px font-mono text-text2 cursor-pointer mb-1.5 list-none">
              Trade Log (last 20 of {r.trades.length})
            </summary>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-10px font-mono">
                <thead>
                  <tr className="border-b border-border">
                    {['#', 'Dir', 'Entry', 'Exit', 'P&L', 'R', 'Exit'].map((h) => (
                      <th
                        key={h}
                        className="px-1.5 py-1 text-left text-text3 font-semibold whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {r.trades.slice(-20).map((t, i) => (
                    <tr key={i} className="border-b border-border">
                      <td className="px-1.5 py-1 text-text3">{r.trades.length - 19 + i}</td>
                      <td
                        className={`px-1.5 py-1 font-bold ${
                          t.dir === 'long' ? 'text-green' : 'text-red'
                        }`}
                      >
                        {t.dir === 'long' ? '▲' : '▼'}
                      </td>
                      <td className="px-1.5 py-1">{fmtPrice(t.entryPrice)}</td>
                      <td className="px-1.5 py-1">{fmtPrice(t.exitPrice)}</td>
                      <td
                        className={`px-1.5 py-1 font-bold ${
                          t.pnl >= 0 ? 'text-green' : 'text-red'
                        }`}
                      >
                        {t.pnl >= 0 ? '+' : ''}${t.pnl.toFixed(2)}
                      </td>
                      <td
                        className={`px-1.5 py-1 ${t.r >= 0 ? 'text-green' : 'text-red'}`}
                      >
                        {t.r.toFixed(2)}R
                      </td>
                      <td className="px-1.5 py-1 text-text3">{t.exitReason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>

          {/* ── Export ───────────────────────────────────────────────────── */}
          <div className="flex gap-2">
            <ActionBtn onClick={() => downloadCSV(r)}>⬇ CSV</ActionBtn>
            <ActionBtn onClick={() => downloadJSON(r, activeStrat?.name ?? 'strategy')}>
              ⬇ JSON
            </ActionBtn>
          </div>
        </>
      )}
    </Card>
  );
}

// ── Tiny helper ───────────────────────────────────────────────────────────────
function ChartLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-9px font-mono text-text3 uppercase tracking-wide mb-1">{children}</div>
  );
}
