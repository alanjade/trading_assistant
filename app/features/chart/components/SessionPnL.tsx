'use client';

import { useState } from 'react';
import {
  ActionBtn,
  Card,
  MetricBox,
  MetricGrid,
  PanelHeader,
  settingsInputClass,
} from '@/components/ui';
import {
  buildSessionTradeFromDraft,
  calculateSessionStats,
  calculateTradeReturnPct,
  createSessionTradeDraft,
  parseSessionNumber,
} from '@/features/session/services/sessionPnLService';
import type { SessionTradeDraft } from '@/features/session/services/sessionPnLService';
import { fmtPrice, fmtSymDisplay } from '@/lib/indicators';
import { useStore } from '@/lib/store';

function smBtnClass(_borderColor: string) {
  return `px-2 py-0.5 text-10px font-mono font-semibold rounded-sm cursor-pointer border bg-transparent text-text2 transition-all`;
}

export default function SessionPnL() {
  const {
    sessionTrades,
    addSessionTrade,
    clearSessionTrades,
    sessionPnL,
    maxDailyLossUsd,
    setMaxDailyLossUsd,
    dailyLossBannerDismissed,
    setDailyLossBannerDismissed,
    sym,
    livePrice,
    entryPrice,
    sizeUsd,
    currentDir,
  } = useStore();

  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState<SessionTradeDraft>(
    createSessionTradeDraft({ sym, currentDir, entryPrice, sizeUsd, livePrice })
  );

  const { dailyLossHit, dailyLossWarn, pnlColor, lossUsedPct, wins, losses } =
    calculateSessionStats(sessionTrades, sessionPnL, maxDailyLossUsd);

  const handleAdd = () => {
    const trade = buildSessionTradeFromDraft(draft, sym);
    if (!trade) return;

    addSessionTrade(trade);
    setShowForm(false);
    setDraft(
      createSessionTradeDraft({
        sym,
        currentDir,
        entryPrice: String(livePrice),
        sizeUsd: String(trade.size),
        livePrice,
      })
    );
  };

  return (
    <>
      {dailyLossHit && !dailyLossBannerDismissed && (
        <div className="sticky top-0 z-[500] px-4 py-2.5 bg-red/20 border border-red flex items-center gap-3 animate-[flashRed_1s_ease_infinite]">
          <span className="text-lg">🛑</span>
          <span className="flex-1 text-xs font-mono font-bold text-red">
            DAILY LOSS LIMIT HIT — ${(-sessionPnL).toFixed(2)} lost · limit ${maxDailyLossUsd}
          </span>
          <span className="text-11px font-mono text-text2">Stop trading for today.</span>
          <button
            type="button"
            onClick={() => setDailyLossBannerDismissed(true)}
            className="bg-transparent border-0 cursor-pointer text-text3 text-base"
            aria-label="Dismiss banner"
          >
            ×
          </button>
        </div>
      )}

      <Card style={{ marginBottom: 10 }}>
        <PanelHeader
          title="📊 Session P&L"
          actions={
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => setShowForm((f) => !f)}
                className={smBtnClass(showForm ? 'var(--accent)' : 'var(--border2)')}
                style={{
                  borderColor: showForm ? 'var(--accent)' : 'var(--border2)',
                  color: showForm ? 'var(--accent)' : undefined,
                }}
              >
                {showForm ? '✕ Cancel' : '+ Add Trade'}
              </button>
              {sessionTrades.length > 0 && (
                <button
                  type="button"
                  onClick={clearSessionTrades}
                  className={smBtnClass('var(--red)')}
                  style={{ borderColor: 'var(--red)', color: 'var(--red)' }}
                >
                  Clear
                </button>
              )}
            </div>
          }
        />

        <MetricGrid columns={4}>
          <MetricBox
            label="Net P&L"
            value={(sessionPnL >= 0 ? '+' : '') + '$' + sessionPnL.toFixed(2)}
            valueColor={pnlColor}
          />
          <MetricBox label="Trades" value={String(sessionTrades.length)} valueColor="var(--text)" />
          <MetricBox label="Wins" value={String(wins)} valueColor="var(--green)" />
          <MetricBox label="Losses" value={String(losses)} valueColor="var(--red)" />
        </MetricGrid>

        <div className="mb-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-10px font-mono text-text2 shrink-0">Max Daily Loss $</span>
            <input
              type="number"
              value={maxDailyLossUsd || ''}
              placeholder="0 = off"
              min={0}
              step={10}
              onChange={(e) => {
                setMaxDailyLossUsd(parseSessionNumber(e.target.value));
                setDailyLossBannerDismissed(false);
              }}
              className={`${settingsInputClass} w-[90px]`}
            />
            {maxDailyLossUsd > 0 && (
              <span
                className={`text-10px font-mono ml-auto ${
                  dailyLossHit ? 'text-red' : dailyLossWarn ? 'text-amber' : 'text-text3'
                }`}
              >
                {lossUsedPct.toFixed(0)}% used
              </span>
            )}
          </div>
          {maxDailyLossUsd > 0 && (
            <div className="h-[5px] rounded-sm bg-bg3 border border-border overflow-hidden">
              <div
                className="h-full rounded-sm transition-[width,background] duration-400"
                style={{
                  width: `${lossUsedPct}%`,
                  background: dailyLossHit
                    ? 'var(--red)'
                    : dailyLossWarn
                      ? 'var(--amber)'
                      : 'var(--green)',
                }}
              />
            </div>
          )}
        </div>

        {showForm && (
          <div className="bg-bg3 border border-border rounded-sm px-3 py-2.5 mb-2.5">
            <div className="grid grid-cols-2 gap-1.5 mb-1.5">
              {[
                { label: 'Entry', key: 'entry', val: draft.entry },
                { label: 'Exit', key: 'exit', val: draft.exit },
                { label: 'Size $', key: 'size', val: draft.size },
                { label: 'Symbol', key: 'sym', val: draft.sym, text: true },
              ].map((f) => (
                <div key={f.key}>
                  <div className="text-9px font-mono text-text3 uppercase tracking-wide mb-0.5">
                    {f.label}
                  </div>
                  <input
                    type={f.text ? 'text' : 'number'}
                    value={String(f.val ?? '')}
                    step={0.01}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        [f.key]: f.text ? e.target.value : e.target.value,
                      }))
                    }
                    className={`${settingsInputClass} w-full bg-bg4`}
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-1.5 mb-1.5">
              {(['long', 'short'] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDraft((x) => ({ ...x, dir: d }))}
                  className={`flex-1 px-2.5 py-1 text-10px font-mono font-bold cursor-pointer rounded-sm border ${
                    draft.dir === d
                      ? d === 'long'
                        ? 'border-green bg-green-bg text-green'
                        : 'border-red bg-red-bg text-red'
                      : 'border-border2 bg-transparent text-text2'
                  }`}
                >
                  {d === 'long' ? '▲ Long' : '▼ Short'}
                </button>
              ))}
            </div>
            <input
              type="text"
              placeholder="Notes (optional)"
              value={draft.note ?? ''}
              onChange={(e) => setDraft((d) => ({ ...d, note: e.target.value }))}
              className={`${settingsInputClass} w-full bg-bg4 mb-2`}
            />
            <ActionBtn variant="green" onClick={handleAdd} style={{ width: '100%' }}>
              Add Trade
            </ActionBtn>
          </div>
        )}

        {sessionTrades.length === 0 ? (
          <p className="text-10px font-mono text-text3 text-center py-3">
            No trades yet — click &quot;+ Add Trade&quot; to log one
          </p>
        ) : (
          <div className="flex flex-col gap-1">
            {[...sessionTrades].reverse().map((t) => {
              const bull = t.pnl >= 0;
              const pct = calculateTradeReturnPct(t);
              return (
                <div
                  key={t.id}
                  className={`grid grid-cols-[50px_64px_1fr_1fr_72px] gap-1.5 items-center px-2.5 py-1.5 rounded-sm border ${
                    bull
                      ? 'bg-green-bg border-green/15'
                      : 'bg-red-bg border-red/15'
                  }`}
                >
                  <span
                    className={`text-9px font-mono font-bold ${bull ? 'text-green' : 'text-red'}`}
                  >
                    {t.dir === 'long' ? '▲ L' : '▼ S'}
                  </span>
                  <span className="text-9px font-mono text-text2">{fmtSymDisplay(t.sym)}</span>
                  <span className="text-10px font-mono text-text2">
                    {fmtPrice(t.entry)} → {fmtPrice(t.exit)}
                  </span>
                  <span className="text-9px font-mono text-text3">
                    ${t.size.toFixed(0)} · {pct >= 0 ? '+' : ''}
                    {pct.toFixed(2)}%
                  </span>
                  <span
                    className={`text-xs font-mono font-bold text-right ${
                      bull ? 'text-green' : 'text-red'
                    }`}
                  >
                    {bull ? '+' : ''}
                    {t.pnl.toFixed(2)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </>
  );
}
