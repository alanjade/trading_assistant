'use client';

import { useState } from 'react';
import { ActionBtn } from '@/components/ui';
import { resetOnboarding } from '@/components/ui/Onboarding';
import { useTheme } from '@/components/ui/ThemeToggle';
import { toast } from '@/components/ui/Toast';
import { downloadStateJSON, openImportFilePicker, type ParseResult } from '@/lib/stateIO';
import { useStore } from '@/lib/store';
import {
  pullStateFromCloud,
  pushStateToCloud,
  signInWithEmail,
  signOut,
  SUPABASE_ENABLED,
} from '@/lib/supabase';

const inp =
  'px-2.5 py-1.5 text-11px font-mono bg-bg3 text-text border border-border2 rounded-sm outline-none w-[110px]';
const inpWide = `${inp} w-[200px]`;
const inpNarrow = `${inp} w-[90px]`;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-7">
      <div className="text-10px font-mono font-bold text-text3 uppercase tracking-widest mb-3 pb-1.5 border-b border-border">
        {title}
      </div>
      {children}
    </div>
  );
}

function Row({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2.5 mb-2.5">
      <div className="flex-1">
        <div className="text-11px font-mono text-text font-medium">{label}</div>
        {hint && <div className="text-9px font-mono text-text3 mt-0.5">{hint}</div>}
      </div>
      {children}
    </div>
  );
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className={`relative w-9 h-5 rounded-full shrink-0 cursor-pointer transition-all border ${
        on ? 'bg-accent border-accent' : 'bg-bg4 border-border2'
      }`}
    >
      <span
        className={`absolute top-[3px] w-3 h-3 rounded-full transition-[left] duration-200 ${
          on ? 'left-[17px] bg-black' : 'left-[3px] bg-text3'
        }`}
      />
    </button>
  );
}

export default function SettingsPage() {
  const store = useStore();
  const { theme, toggle: toggleTheme } = useTheme();

  const [cloudEmail, setCloudEmail] = useState('');
  const [cloudUser, setCloudUser] = useState<string | null>(null);
  const [cloudStatus, setCloudStatus] = useState('');
  const [cloudLoading, setCloudLoading] = useState(false);
  const [importMsg, setImportMsg] = useState('');

  const handleCloudSignIn = async () => {
    setCloudLoading(true);
    const res = await signInWithEmail(cloudEmail);
    setCloudLoading(false);
    if (res.ok) {
      setCloudStatus(`Magic link sent to ${cloudEmail}. Check your inbox.`);
    } else {
      setCloudStatus(`Error: ${res.error}`);
    }
  };

  const handleCloudSignOut = async () => {
    await signOut();
    setCloudUser(null);
    setCloudStatus('Signed out.');
  };

  const handleCloudPush = async () => {
    setCloudLoading(true);
    const res = await pushStateToCloud(useStore.getState() as unknown as Record<string, unknown>);
    setCloudLoading(false);
    setCloudStatus(res.ok ? '✓ State pushed to cloud.' : `Error: ${res.error}`);
    if (res.ok) toast.success('State synced to cloud');
  };

  const handleCloudPull = async () => {
    setCloudLoading(true);
    const res = await pullStateFromCloud();
    setCloudLoading(false);
    if (!res.ok || !res.data) {
      setCloudStatus(`Error: ${res.error}`);
      return;
    }
    const state = res.data.state;
    if (state) {
      useStore.setState(state as Partial<ReturnType<typeof useStore.getState>>);
      setCloudStatus(`✓ Pulled state from ${res.data.exportedAt ?? 'cloud'}`);
      toast.success('State pulled from cloud');
    }
  };

  const handleExport = () => {
    downloadStateJSON(useStore.getState() as unknown as Record<string, unknown>);
    toast.success('State exported as JSON');
  };

  const handleImport = () => {
    openImportFilePicker((result: ParseResult) => {
      if (!result.ok) {
        setImportMsg(`✗ ${result.error}`);
        toast.error(`Import failed: ${result.error}`);
        return;
      }
      if (result.data) {
        useStore.setState(result.data as Partial<ReturnType<typeof useStore.getState>>);
        setImportMsg(
          `✓ Imported ${result.keysFound} setting groups from ${result.exportedAt ?? 'file'}`
        );
        toast.success('Settings imported successfully');
      }
      setTimeout(() => setImportMsg(''), 6000);
    });
  };

  const handleResetAll = () => {
    if (
      !confirm(
        'Reset ALL app data? This clears your trades journal, strategies, drawings, paper account, and settings. This cannot be undone.'
      )
    )
      return;
    localStorage.clear();
    indexedDB.deleteDatabase('tradeassist');
    toast.warn('All data cleared — reloading…');
    setTimeout(() => window.location.reload(), 1000);
  };

  const handleResetOnboarding = () => {
    resetOnboarding();
    toast.info('Onboarding tour reset — it will show on next page load');
  };

  const handleResetIndicators = () => {
    store.resetIndicatorParams();
    toast.success('Indicator params reset to defaults');
  };

  const TIMEFRAMES = ['1m', '5m', '15m', '1h', '4h', '1d'];

  return (
    <div className="max-w-[620px] mx-auto py-1 pb-10">
      <Section title="Appearance">
        <Row label="Theme" hint="Toggle between dark and light mode">
          <ActionBtn onClick={toggleTheme} className="flex items-center gap-1.5">
            {theme === 'dark' ? '☀ Switch to Light' : '☾ Switch to Dark'}
          </ActionBtn>
        </Row>
      </Section>

      <Section title="Default Values">
        <Row label="Default Symbol" hint="Symbol loaded on startup">
          <input
            className={inp}
            value={store.defaultSym}
            onChange={(e) => store.setSettings({ defaultSym: e.target.value.toUpperCase() })}
          />
        </Row>
        <Row label="Default Timeframe">
          <select
            className={inpNarrow}
            value={store.defaultTf}
            onChange={(e) => store.setSettings({ defaultTf: e.target.value })}
          >
            {TIMEFRAMES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </Row>
        <Row label="Default Capital ($)">
          <input
            type="number"
            min={1}
            className={inp}
            value={store.defaultCapital}
            onChange={(e) => store.setSettings({ defaultCapital: +e.target.value || 200 })}
          />
        </Row>
        <Row label="Default Leverage">
          <input
            type="number"
            min={1}
            max={125}
            className={inp}
            value={store.defaultLeverage}
            onChange={(e) => store.setSettings({ defaultLeverage: +e.target.value || 10 })}
          />
        </Row>
        <Row label="Default R:R Ratio">
          <input
            type="number"
            min={0.5}
            max={20}
            step={0.1}
            className={inp}
            value={store.defaultRR}
            onChange={(e) => store.setSettings({ defaultRR: +e.target.value || 2 })}
          />
        </Row>
        <Row label="Default Fee Type">
          <select
            className={inpNarrow}
            value={store.defaultFeeType}
            onChange={(e) =>
              store.setSettings({ defaultFeeType: e.target.value as 'maker' | 'taker' })
            }
          >
            <option value="maker">Maker (0.02%)</option>
            <option value="taker">Taker (0.05%)</option>
          </select>
        </Row>
      </Section>

      <Section title="Alerts & Notifications">
        <Row label="Alert sounds" hint="Plays beep on price alerts and EMA crossovers">
          <Toggle
            on={store.soundEnabled}
            onChange={(v) => {
              store.setSoundEnabled(v);
              toast.info(`Sound ${v ? 'enabled' : 'disabled'}`);
            }}
          />
        </Row>
        <Row label="Browser notifications" hint="Shows OS notification when price alert fires">
          <Toggle
            on={store.notifEnabled}
            onChange={async (v) => {
              if (
                v &&
                typeof Notification !== 'undefined' &&
                Notification.permission !== 'granted'
              ) {
                const perm = await Notification.requestPermission();
                if (perm !== 'granted') {
                  toast.warn('Notification permission denied by browser');
                  return;
                }
              }
              store.setNotifEnabled(v);
              toast.info(`Notifications ${v ? 'enabled' : 'disabled'}`);
            }}
          />
        </Row>
      </Section>

      <Section title="Data — Import & Export">
        <p className="text-10px font-mono text-text3 mb-3 leading-relaxed">
          Export your entire state (journal, strategies, settings, drawings, paper account) as a
          single JSON file. Import restores all of it on any device.
        </p>
        <div className="flex gap-2 flex-wrap mb-2">
          <ActionBtn variant="green" onClick={handleExport}>
            ⬇ Export state.json
          </ActionBtn>
          <ActionBtn onClick={handleImport}>⬆ Import state.json</ActionBtn>
        </div>
        {importMsg && (
          <p
            className={`text-10px font-mono mt-1.5 ${
              importMsg.startsWith('✓') ? 'text-green' : 'text-red'
            }`}
          >
            {importMsg}
          </p>
        )}
      </Section>

      {SUPABASE_ENABLED ? (
        <Section title="Cloud Sync (Supabase)">
          {!cloudUser ? (
            <div>
              <p className="text-10px font-mono text-text3 mb-2.5">
                Sign in with your email to sync state across devices.
              </p>
              <div className="flex gap-1.5 mb-2">
                <input
                  type="email"
                  placeholder="your@email.com"
                  value={cloudEmail}
                  onChange={(e) => setCloudEmail(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCloudSignIn();
                  }}
                  className={inpWide}
                />
                <ActionBtn
                  variant="green"
                  onClick={handleCloudSignIn}
                  disabled={cloudLoading || !cloudEmail}
                >
                  {cloudLoading ? 'Sending…' : 'Send Magic Link'}
                </ActionBtn>
              </div>
              {cloudStatus && (
                <p className="text-10px font-mono text-text2">{cloudStatus}</p>
              )}
            </div>
          ) : (
            <div>
              <p className="text-10px font-mono text-text2 mb-2.5">
                Signed in as <strong>{cloudUser}</strong>
              </p>
              <div className="flex gap-1.5 flex-wrap">
                <ActionBtn variant="green" onClick={handleCloudPush} disabled={cloudLoading}>
                  ☁ Push to Cloud
                </ActionBtn>
                <ActionBtn onClick={handleCloudPull} disabled={cloudLoading}>
                  ☁ Pull from Cloud
                </ActionBtn>
                <ActionBtn variant="red" onClick={handleCloudSignOut}>
                  Sign Out
                </ActionBtn>
              </div>
              {cloudStatus && (
                <p className="text-10px font-mono text-text2 mt-1.5">{cloudStatus}</p>
              )}
            </div>
          )}
        </Section>
      ) : (
        <Section title="Cloud Sync (Supabase — not configured)">
          <p className="text-10px font-mono text-text3 leading-relaxed">
            To enable cloud sync:
            <br />
            1. Create a project at{' '}
            <a
              href="https://supabase.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue"
            >
              supabase.com
            </a>
            <br />
            2. Add <code className="text-amber">NEXT_PUBLIC_SUPABASE_URL</code> and{' '}
            <code className="text-amber">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to .env.local
            <br />
            3. Run: <code className="text-accent">npm install @supabase/supabase-js</code>
            <br />
            See <code>app/lib/supabase.ts</code> for the SQL schema.
          </p>
        </Section>
      )}

      <Section title="Indicator Defaults">
        <Row label="Reset indicator params" hint="Restores all periods and multipliers to defaults">
          <ActionBtn onClick={handleResetIndicators}>Reset Params</ActionBtn>
        </Row>
      </Section>

      <Section title="Danger Zone">
        <Row label="Reset onboarding tour" hint="Tour will show again on next page load">
          <ActionBtn onClick={handleResetOnboarding}>Reset Tour</ActionBtn>
        </Row>
        <Row
          label="Reset ALL data"
          hint="Clears journal, strategies, drawings, settings, paper account. Cannot be undone."
        >
          <ActionBtn variant="red" onClick={handleResetAll}>
            ⚠ Reset Everything
          </ActionBtn>
        </Row>
      </Section>

      <p className="text-9px font-mono text-text3 text-center">
        TradeAssist · All data stored locally in your browser · No telemetry
      </p>
    </div>
  );
}
