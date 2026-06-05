'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  ActionBtn,
  Card,
  MetricBox,
  MetricGrid,
  PanelHeader,
  StatusPill,
  pillToggleClass,
  settingsInputClass,
} from '@/components/ui';
import { fmtPrice, fmtSymDisplay } from '@/lib/indicators';
import {
  calcRMultiple,
  openPaperPosition,
  STATUS_LABEL,
  type PaperPosition,
} from '@/lib/paperTrading';
import { useStore } from '@/lib/store';
import { PRESET_STRATEGIES } from '@/lib/strategy';
import { STATUS_BADGE_CLASS, STATUS_PILL_CLASS } from '@/lib/uiConstants';

function pnlTextClass(v: number) {
  return v > 0 ? 'text-green' : v < 0 ? 'text-red' : 'text-text2';
}


function PriceCell({
  label,
  val,
  valueClass = 'text-text',
}: {
  label: string;
  val: string;
  valueClass?: string;
}) {
  return (
    <div className="bg-bg2 rounded px-2 py-1">
      <div className="text-9px font-mono text-text3 uppercase mb-0.5">{label}</div>
      <div className={`text-11px font-mono font-bold ${valueClass}`}>{val}</div>
    </div>
  );
}

export default function PaperTradingPanel() {
  const {
    paperAccount,
    openPaperPos,
    closePaperPos,
    tickPaperPositions,
    strategySignal,
    activeStrategyId,
    strategies,
    livePrice,
    sym,
    atrVals,
    addTrade,
    backtestResult,
  } = useStore();

  const [showClosed, setShowClosed] = useState(false);
  const [autoOpen, setAutoOpen] = useState(false);
  const [editNote, setEditNote] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');

  const allStrats = [...PRESET_STRATEGIES, ...strategies];
  const activeStrat = allStrats.find((s) => s.id === activeStrategyId) ?? null;
  const lastAtr = atrVals.length ? (atrVals[atrVals.length - 1] ?? null) : null;

  useEffect(() => {
    if (!livePrice || !paperAccount.openPositions.length) return;
    tickPaperPositions(livePrice, lastAtr);
  }, [livePrice, lastAtr, tickPaperPositions, paperAccount.openPositions.length]);

  useEffect(() => {
    if (!autoOpen || !strategySignal || !activeStrat) return;
    const alreadyOpen = paperAccount.openPositions.some(
      (p) => p.strategyId === activeStrategyId && p.dir === strategySignal.dir
    );
    if (alreadyOpen) return;
    const pos = openPaperPosition(strategySignal, activeStrat, sym, paperAccount.balance);
    openPaperPos(pos);
  }, [
    strategySignal,
    autoOpen,
    activeStrat,
    activeStrategyId,
    sym,
    paperAccount.balance,
    paperAccount.openPositions,
    openPaperPos,
  ]);

  const handleManualOpen = useCallback(() => {
    if (!strategySignal || !activeStrat) return;
    const pos = openPaperPosition(strategySignal, activeStrat, sym, paperAccount.balance);
    openPaperPos(pos);
  }, [strategySignal, activeStrat, sym, paperAccount.balance, openPaperPos]);

  const handleManualClose = useCallback(
    (id: string) => {
      const pos = paperAccount.openPositions.find((p) => p.id === id);
      if (!pos || !livePrice) return;
      closePaperPos(id, livePrice, 'closed_manual');
      const r = calcRMultiple({ ...pos, realised: pos.realised });
      const units = pos.size / pos.entryPrice;
      const finalPnl =
        pos.dir === 'long'
          ? (livePrice - pos.entryPrice) * units
          : (pos.entryPrice - livePrice) * units;
      addTrade({
        date: new Date().toISOString().slice(0, 10),
        symbol: pos.sym,
        dir: pos.dir,
        entry: pos.entryPrice,
        stop: pos.initialStop,
        target: pos.tpLevels[0]?.price ?? livePrice,
        outcome: finalPnl > 0 ? 'win' : finalPnl < 0 ? 'loss' : 'be',
        pnl: finalPnl,
        notes: `[Paper] ${pos.strategyName} · ${r.toFixed(2)}R · ${pos.notes}`,
        tags: [],
        screenshotUrl: '',
      });
    },
    [paperAccount.openPositions, livePrice, closePaperPos, addTrade]
  );

  const acc = paperAccount;
  const winR =
    acc.winCount + acc.lossCount > 0
      ? ((acc.winCount / (acc.winCount + acc.lossCount)) * 100).toFixed(0) + '%'
      : '—';
  const balPositive = acc.totalPnl >= 0;
  const balColor = balPositive ? 'var(--green)' : 'var(--red)';

  const posRow = (pos: PaperPosition, isOpen: boolean) => {
    const isLong = pos.dir === 'long';
    const units = pos.size / pos.entryPrice;
    const livePnl =
      isOpen && livePrice
        ? (isLong ? livePrice - pos.entryPrice : pos.entryPrice - livePrice) * units
        : pos.realised;
    const rMult = isOpen
      ? (() => {
          const rd = Math.abs(pos.entryPrice - pos.initialStop);
          return rd > 0 ? livePnl / (rd * units) : 0;
        })()
      : calcRMultiple(pos);
    const badgeClass = STATUS_BADGE_CLASS[pos.status as keyof typeof STATUS_BADGE_CLASS] ?? STATUS_BADGE_CLASS.closed_manual;

    return (
      <div
        key={pos.id}
        className="bg-bg3 border border-border rounded-sm px-3 py-2.5 mb-1.5"
      >
        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
          <span
            className={`text-10px font-mono font-bold ${isLong ? 'text-green' : 'text-red'}`}
          >
            {isLong ? '▲' : '▼'} {fmtSymDisplay(pos.sym)}
          </span>
          <StatusPill tone={pos.status === 'open' ? 'blue' : pos.status.startsWith('closed_') ? 'green' : 'neutral'} className={badgeClass}>
            {STATUS_LABEL[pos.status]}
          </StatusPill>
          <span className="text-9px font-mono text-text3 ml-auto">{pos.strategyName}</span>
        </div>

        <div className="grid grid-cols-4 gap-1.25 mb-1.5">
          <PriceCell label="Entry" val={fmtPrice(pos.entryPrice)} valueClass="text-blue" />
          <PriceCell label="Stop" val={fmtPrice(pos.stopPrice)} valueClass="text-red" />
          <PriceCell
            label="Live"
            val={isOpen && livePrice ? fmtPrice(livePrice) : '—'}
          />
          <PriceCell
            label={isOpen ? 'Unrealised' : 'P&L'}
            val={(livePnl >= 0 ? '+' : '') + '$' + livePnl.toFixed(2)}
            valueClass={pnlTextClass(livePnl)}
          />
        </div>

        <div className="flex gap-1 mb-1.5 flex-wrap">
          {pos.tpLevels.map((tp, i) => (
            <div
              key={i}
              className={`${STATUS_PILL_CLASS} py-0.5 rounded-md border ${
                tp.hit
                  ? 'border-green bg-green/10 text-green'
                  : 'border-border2 text-text3'
              }`}
            >
              TP{i + 1} {fmtPrice(tp.price)} {tp.sizePercent}%
              {tp.hit && tp.pnl != null && (
                <span className="ml-1 text-green">+${tp.pnl.toFixed(2)}</span>
              )}
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="text-9px font-mono text-text3">
            Size ${pos.size.toFixed(0)} · {rMult >= 0 ? '+' : ''}
            {rMult.toFixed(2)}R
          </span>
          {pos.trailActive && pos.trailPrice && (
            <span className="text-9px font-mono text-amber">
              Trail {fmtPrice(pos.trailPrice)}
            </span>
          )}
          {pos.breakEvenDone && (
            <span className="text-9px font-mono text-amber">BE ✓</span>
          )}
          <span className="text-9px font-mono text-text3 ml-auto">
            {new Date(pos.openedAt).toLocaleTimeString()}
          </span>
        </div>

        {editNote === pos.id ? (
          <div className="mt-1.5 flex gap-1.5">
            <input
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Add note…"
              className={`flex-1 py-1 text-10px ${settingsInputClass}`}
            />
            <ActionBtn
              variant="green"
              onClick={() => {
                useStore.getState().updatePaperNote(pos.id, noteText);
                setEditNote(null);
              }}
            >
              Save
            </ActionBtn>
            <ActionBtn onClick={() => setEditNote(null)}>Cancel</ActionBtn>
          </div>
        ) : (
          <div className="mt-1 flex gap-1.5 items-center">
            {pos.notes && (
              <span className="text-9px font-mono text-text3 italic">{pos.notes}</span>
            )}
            {isOpen && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setEditNote(pos.id);
                    setNoteText(pos.notes);
                  }}
                  className={`text-9px font-mono px-1.75 py-0.5 rounded cursor-pointer border border-border2 bg-transparent text-text3 ${
                    pos.notes ? 'ml-1' : ''
                  }`}
                >
                  {pos.notes ? 'Edit note' : '+ Note'}
                </button>
                <button
                  type="button"
                  onClick={() => handleManualClose(pos.id)}
                  className="text-9px font-mono px-2 py-0.5 rounded cursor-pointer border border-red/35 bg-red/10 text-red ml-auto"
                >
                  Close
                </button>
              </>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <Card>
      <PanelHeader
        title="🤖 Paper Trading"
        actions={
          <div className="flex gap-1.5 items-center">
            <button
              type="button"
              onClick={() => setAutoOpen((a) => !a)}
              className={`${pillToggleClass(autoOpen)} font-bold`}
            >
              {autoOpen ? '● Auto-Open ON' : '○ Auto-Open'}
            </button>
            <ActionBtn variant={strategySignal ? 'green' : 'default'} onClick={handleManualOpen}>
              + Open Position
            </ActionBtn>
          </div>
        }
      />

      <MetricGrid columns={4}>
        <MetricBox label="Balance" value={'$' + acc.balance.toFixed(2)} valueColor={balColor} />
        <MetricBox
          label="Total P&L"
          value={(acc.totalPnl >= 0 ? '+' : '') + '$' + acc.totalPnl.toFixed(2)}
          valueColor={balColor}
          good={balPositive}
          danger={!balPositive && acc.totalPnl < 0}
        />
        <MetricBox
          label="Win Rate"
          value={winR}
          good={acc.winCount > acc.lossCount}
        />
        <MetricBox label="Trades" value={String(acc.winCount + acc.lossCount)} />
      </MetricGrid>

      <div className="flex gap-1.5 items-center mb-3">
        <span className="text-10px font-mono text-text3">Starting balance</span>
        <input
          type="number"
          defaultValue={acc.startBalance}
          onBlur={(e) =>
            useStore.getState().resetPaperAccount(parseFloat(e.target.value) || 10000)
          }
          className={`w-22.5 ${settingsInputClass}`}
        />
        <button
          type="button"
          onClick={() => useStore.getState().resetPaperAccount(acc.startBalance)}
          className="px-2.5 py-1 text-10px font-mono rounded-sm cursor-pointer border border-red/30 bg-red/10 text-red"
        >
          Reset
        </button>
      </div>

      {strategySignal && (
        <div
          className={`px-3 py-2 mb-2.5 rounded-sm border text-10px font-mono ${
            strategySignal.dir === 'long'
              ? 'bg-green/6 border-green/25'
              : 'bg-red/6 border-red/25'
          }`}
        >
          <span
            className={`font-bold ${strategySignal.dir === 'long' ? 'text-green' : 'text-red'}`}
          >
            {strategySignal.dir === 'long' ? '▲ LONG' : '▼ SHORT'} signal
          </span>
          <span className="text-text2 ml-2.5">
            Entry {fmtPrice(strategySignal.entry)} · SL {fmtPrice(strategySignal.stop)} · Size $
            {strategySignal.size.toFixed(0)}
          </span>
        </div>
      )}

      <div className="text-10px font-mono font-bold text-text2 uppercase tracking-widest mb-1.5">
        Open ({acc.openPositions.length})
      </div>
      {acc.openPositions.length === 0 ? (
        <div className="text-10px font-mono text-text3 text-center py-3 mb-2">
          No open positions.{' '}
          {strategySignal
            ? 'Click "+ Open Position" to paper trade the current signal.'
            : 'Waiting for strategy signal…'}
        </div>
      ) : (
        <div className="mb-2.5">{acc.openPositions.map((p) => posRow(p, true))}</div>
      )}

      {acc.closedPositions.length > 0 && (
        <>
          <button
            type="button"
            onClick={() => setShowClosed((s) => !s)}
            className={`w-full px-3 py-1.5 text-10px font-mono font-semibold rounded-sm cursor-pointer border border-border2 bg-bg3 text-text2 flex justify-between ${showClosed ? 'mb-2' : ''}`}
          >
            <span>Closed ({acc.closedPositions.length})</span>
            <span>{showClosed ? '▲' : '▼'}</span>
          </button>
          {showClosed &&
            acc.closedPositions
              .slice()
              .reverse()
              .map((p) => posRow(p, false))}
        </>
      )}

      {backtestResult && (
        <div className="mt-2.5 px-3 py-2.5 bg-bg3 rounded-sm border border-border">
          <div className="text-10px font-mono font-bold text-text2 uppercase tracking-widest mb-2">
            vs Backtest
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {[
              {
                label: 'Win Rate',
                paper: winR,
                bt: (backtestResult.winRate * 100).toFixed(0) + '%',
              },
              {
                label: 'Avg P&L',
                paper:
                  acc.winCount + acc.lossCount > 0
                    ? '$' + (acc.totalPnl / (acc.winCount + acc.lossCount)).toFixed(2)
                    : '—',
                bt: '$' + backtestResult.expectancy.toFixed(2),
              },
              {
                label: 'Total P&L',
                paper: '$' + acc.totalPnl.toFixed(2),
                bt: '$' + backtestResult.totalPnl.toFixed(2),
              },
            ].map(({ label, paper, bt }) => (
              <div key={label} className="bg-bg2 rounded px-2 py-1.5">
                <div className="text-9px font-mono text-text3 uppercase mb-1">{label}</div>
                <div className="flex justify-between">
                  <span className="text-10px font-mono text-blue">📄 {paper}</span>
                  <span className="text-10px font-mono text-purple">⚙ {bt}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
