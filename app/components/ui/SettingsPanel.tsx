'use client';

import { useRef, useState } from 'react';
import {
  ActionBtn,
  Card,
  SectionTitle,
  SegmentBtn,
  SettingsGroup,
  SettingsRow,
  ToggleSwitch,
  settingsInputClass,
} from '@/components/ui';
import { toast } from '@/components/ui/Toast';
import { useStore } from '@/lib/store';

const fileBtnClass =
  'inline-block px-3.5 py-1.5 text-11px font-mono font-semibold rounded-sm cursor-pointer border border-border2 bg-bg3 text-text2 transition-colors hover:text-text';

function NumRow({
  label,
  value,
  onChange,
  min,
  max,
  step,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <SettingsRow label={label}>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step ?? 1}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className={`${settingsInputClass} w-20 text-right`}
      />
    </SettingsRow>
  );
}

export default function SettingsPanel() {
  const store = useStore();
  const {
    theme,
    setSettings,
    defaultSym,
    defaultTf,
    defaultLeverage,
    defaultFeeType,
    defaultCapital,
    defaultRR,
    soundEnabled,
    setSoundEnabled,
    notifEnabled,
    setNotifEnabled,
    resetPaperAccount,
    exportTradesCsv,
    importTradesCsv,
    trades,
  } = store;

  const csvRef = useRef<HTMLInputElement>(null);
  const jsonRef = useRef<HTMLInputElement>(null);
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [confirmReset, setConfirmReset] = useState(false);

  const handleExportState = () => {
    const state = useStore.getState();
    const exportable = {
      trades: state.trades,
      strategies: state.strategies,
      activeStrategyId: state.activeStrategyId,
      chartDrawings: state.chartDrawings,
      priceAlerts: state.priceAlerts,
      paperAccount: { ...state.paperAccount, openPositions: [] },
      settings: {
        theme: state.theme,
        defaultSym: state.defaultSym,
        defaultTf: state.defaultTf,
        defaultLeverage: state.defaultLeverage,
        defaultFeeType: state.defaultFeeType,
        defaultCapital: state.defaultCapital,
        defaultRR: state.defaultRR,
        activeIndicators: state.activeIndicators,
        indicatorParams: state.indicatorParams,
        atrTrailMult: state.atrTrailMult,
        soundEnabled: state.soundEnabled,
        notifEnabled: state.notifEnabled,
        maxDailyLossUsd: state.maxDailyLossUsd,
        rrRatio: state.rrRatio,
        leverage: state.leverage,
        feeType: state.feeType,
        capital: state.capital,
        margin: state.margin,
        goalPct: state.goalPct,
      },
    };
    const blob = new Blob([JSON.stringify(exportable, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `tradeassist_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    toast.success('App state exported');
  };

  const handleImportState = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        const s = data.settings ?? {};

        useStore.getState().setSettings({
          theme: s.theme,
          defaultSym: s.defaultSym,
          defaultTf: s.defaultTf,
          defaultLeverage: s.defaultLeverage,
          defaultFeeType: s.defaultFeeType,
          defaultCapital: s.defaultCapital,
          defaultRR: s.defaultRR,
          activeIndicators: s.activeIndicators,
          indicatorParams: s.indicatorParams,
          atrTrailMult: s.atrTrailMult,
          soundEnabled: s.soundEnabled,
          notifEnabled: s.notifEnabled,
        });

        if (typeof s.maxDailyLossUsd === 'number') {
          useStore.getState().setMaxDailyLossUsd(s.maxDailyLossUsd);
        }

        if (data.trades) useStore.setState({ trades: data.trades });
        if (data.strategies)
          useStore.setState({
            strategies: data.strategies,
            activeStrategyId: data.activeStrategyId ?? null,
          });
        if (data.chartDrawings) useStore.setState({ chartDrawings: data.chartDrawings });
        if (data.priceAlerts) useStore.setState({ priceAlerts: data.priceAlerts });
        if (data.paperAccount) useStore.setState({ paperAccount: data.paperAccount });

        toast.success('App state imported');
      } catch {
        toast.error('Invalid backup file');
      }
      e.target.value = '';
    };
    reader.readAsText(file);
  };

  const handleImportCsv = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const csv = ev.target?.result as string;
      const { count, errors } = await importTradesCsv(csv, importMode);
      toast.success(`Imported ${count} trades${errors ? ` (${errors} skipped)` : ''}`);
      e.target.value = '';
    };
    reader.readAsText(file);
  };

  const resetOnboarding = () => {
    localStorage.removeItem('onboarding_done');
    window.location.reload();
  };

  const handleResetAll = () => {
    if (!confirmReset) {
      setConfirmReset(true);
      return;
    }
    localStorage.clear();
    window.location.reload();
  };

  const TIMEFRAMES = ['1m', '5m', '15m', '1h', '4h', '1d'];

  return (
    <Card>
      <SectionTitle>⚙ Settings</SectionTitle>

      <SettingsGroup title="Appearance">
        <SettingsRow label="Theme">
          <div className="flex gap-1">
            {(['dark', 'light'] as const).map((t) => (
              <SegmentBtn
                key={t}
                active={theme === t}
                onClick={() => setSettings({ theme: t })}
              >
                {t === 'dark' ? '🌙 Dark' : '☀ Light'}
              </SegmentBtn>
            ))}
          </div>
        </SettingsRow>
      </SettingsGroup>

      <SettingsGroup title="Defaults">
        <SettingsRow label="Default Symbol">
          <input
            value={defaultSym}
            onChange={(e) => setSettings({ defaultSym: e.target.value.toUpperCase() })}
            className={`${settingsInputClass} w-27.5`}
          />
        </SettingsRow>

        <SettingsRow label="Default Timeframe">
          <div className="flex gap-0.5">
            {TIMEFRAMES.map((t) => (
              <SegmentBtn
                key={t}
                active={defaultTf === t}
                onClick={() => setSettings({ defaultTf: t })}
                className="px-2 py-0.5"
              >
                {t}
              </SegmentBtn>
            ))}
          </div>
        </SettingsRow>

        <NumRow
          label="Default Leverage"
          value={defaultLeverage}
          onChange={(v) => setSettings({ defaultLeverage: v })}
          min={1}
          max={125}
        />
        <NumRow
          label="Default Capital ($)"
          value={defaultCapital}
          onChange={(v) => setSettings({ defaultCapital: v })}
          min={1}
          step={10}
        />
        <NumRow
          label="Default R:R Ratio"
          value={defaultRR}
          onChange={(v) => setSettings({ defaultRR: v })}
          min={0.5}
          max={10}
          step={0.5}
        />

        <SettingsRow label="Default Fee Type">
          <div className="flex gap-1">
            {(['maker', 'taker'] as const).map((f) => (
              <SegmentBtn
                key={f}
                variant="amber"
                active={defaultFeeType === f}
                onClick={() => setSettings({ defaultFeeType: f })}
              >
                {f}
              </SegmentBtn>
            ))}
          </div>
        </SettingsRow>
      </SettingsGroup>

      <SettingsGroup title="Alerts & Sound">
        <SettingsRow label="Alert Sounds">
          <ToggleSwitch on={soundEnabled} onToggle={() => setSoundEnabled(!soundEnabled)} />
        </SettingsRow>
        <SettingsRow label="Browser Notifications">
          <ToggleSwitch
            on={notifEnabled}
            onToggle={() => {
              if (!notifEnabled && Notification.permission !== 'granted') {
                Notification.requestPermission().then((p) => {
                  if (p === 'granted') setNotifEnabled(true);
                });
              } else {
                setNotifEnabled(!notifEnabled);
              }
            }}
          />
        </SettingsRow>
      </SettingsGroup>

      <SettingsGroup title="Paper Trading">
        <SettingsRow label="Reset Paper Account">
          <ActionBtn
            variant="red"
            onClick={() => {
              resetPaperAccount(10000);
              toast.info('Paper account reset');
            }}
          >
            Reset to $10,000
          </ActionBtn>
        </SettingsRow>
      </SettingsGroup>

      <SettingsGroup title="Data">
        <SettingsRow label="App State Backup">
          <div className="flex gap-1.5">
            <ActionBtn variant="green" onClick={handleExportState}>
              ⬇ Export JSON
            </ActionBtn>
            <label className="cursor-pointer">
              <input
                ref={jsonRef}
                type="file"
                accept=".json"
                onChange={handleImportState}
                className="hidden"
              />
              <span onClick={() => jsonRef.current?.click()} className={fileBtnClass}>
                ⬆ Import JSON
              </span>
            </label>
          </div>
        </SettingsRow>

        <SettingsRow label="Trade Journal CSV">
          <div className="flex gap-1.5 flex-wrap items-center">
            <ActionBtn
              onClick={() => {
                const csv = exportTradesCsv();
                const a = document.createElement('a');
                a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
                a.download = 'trades.csv';
                a.click();
                toast.success('Trades exported');
              }}
            >
              ⬇ Export CSV
            </ActionBtn>
            <div className="flex gap-0.5">
              {(['merge', 'replace'] as const).map((m) => (
                <SegmentBtn
                  key={m}
                  variant="blue"
                  active={importMode === m}
                  onClick={() => setImportMode(m)}
                  className="px-2 py-0.5 text-9px rounded"
                >
                  {m}
                </SegmentBtn>
              ))}
            </div>
            <label className="cursor-pointer">
              <input
                ref={csvRef}
                type="file"
                accept=".csv"
                onChange={handleImportCsv}
                className="hidden"
              />
              <span onClick={() => csvRef.current?.click()} className={fileBtnClass}>
                ⬆ Import CSV
              </span>
            </label>
          </div>
        </SettingsRow>

        <SettingsRow label={`Journal (${trades.length} trades)`}>
          <span className="text-11px font-mono text-text3">
            {trades.filter((t) => t.outcome === 'win').length}W /{' '}
            {trades.filter((t) => t.outcome === 'loss').length}L
          </span>
        </SettingsRow>
      </SettingsGroup>

      <SettingsGroup title="Danger Zone" className="mb-1">
        <SettingsRow label="Onboarding">
          <ActionBtn onClick={resetOnboarding}>↺ Show Onboarding Again</ActionBtn>
        </SettingsRow>
        <SettingsRow label="Reset All Data">
          <ActionBtn variant="red" onClick={handleResetAll}>
            {confirmReset ? '⚠ Click again to confirm' : '✕ Wipe All Data'}
          </ActionBtn>
        </SettingsRow>
        {confirmReset && (
          <p className="text-10px font-mono text-red mt-1.5">
            This will clear all trades, strategies, settings, and chart drawings. Export a backup
            first.
          </p>
        )}
      </SettingsGroup>
    </Card>
  );
}
