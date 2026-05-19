'use client';

import { useEffect, useState } from 'react';
import {
  ActionBtn,
  Card,
  FieldLabel,
  PanelHeader,
  pillToggleClass,
  TextInput,
} from '@/components/ui';
import { fmtPrice, fmtSymDisplay } from '@/lib/indicators';
import { playAlertSound, useStore } from '@/lib/store';

export default function PriceAlerts() {
  const {
    priceAlerts,
    addPriceAlert,
    removePriceAlert,
    soundEnabled,
    setSoundEnabled,
    notifEnabled,
    setNotifEnabled,
    sym,
    livePrice,
  } = useStore();

  const [newPrice, setNewPrice] = useState('');
  const [newDir, setNewDir] = useState<'above' | 'below'>('above');
  const [newLabel, setNewLabel] = useState('');
  const [notifPerm, setNotifPerm] = useState<NotificationPermission>('default');

  useEffect(() => {
    if (typeof Notification !== 'undefined') {
      setNotifPerm(Notification.permission);
    }
  }, []);

  const requestNotifPerm = async () => {
    if (typeof Notification === 'undefined') return;
    const perm = await Notification.requestPermission();
    setNotifPerm(perm);
    if (perm === 'granted') {
      setSoundEnabled(true);
      setNotifEnabled(true);
    }
  };

  const handleAdd = () => {
    const price = parseFloat(newPrice);
    if (!price || price <= 0) return;
    addPriceAlert({
      sym,
      price,
      dir: newDir,
      label: newLabel || `${fmtSymDisplay(sym)} ${newDir} ${fmtPrice(price)}`,
    });
    setNewPrice('');
    setNewLabel('');
  };

  const testSound = () => playAlertSound('alert');

  const pending = priceAlerts.filter((a) => !a.triggered);
  const triggered = priceAlerts.filter((a) => a.triggered);

  return (
    <Card>
      <PanelHeader
        title="🔔 Price Alerts"
        actions={
          <div className="flex gap-1.5 items-center">
            <button
              type="button"
              onClick={() => {
                setSoundEnabled(!soundEnabled);
                if (!soundEnabled) testSound();
              }}
              title="Toggle alert sound"
              className={pillToggleClass(soundEnabled)}
            >
              {soundEnabled ? '🔊 Sound' : '🔇 Muted'}
            </button>

            {notifPerm === 'granted' ? (
              <button
                type="button"
                onClick={() => setNotifEnabled(!notifEnabled)}
                className={pillToggleClass(notifEnabled)}
                title="Toggle browser notifications"
              >
                {notifEnabled ? '🔔 Notifs' : '🔕 Notifs'}
              </button>
            ) : notifPerm === 'denied' ? (
              <span className="text-9px font-mono text-red px-2 py-0.5 border border-border rounded-full">
                Notifs blocked
              </span>
            ) : (
              <button type="button" onClick={requestNotifPerm} className={pillToggleClass(false)}>
                Enable Notifs
              </button>
            )}
          </div>
        }
      />

      <div className="flex gap-1.5 items-end mb-2.5 flex-wrap">
        <div className="flex-1 min-w-[100px]">
          <FieldLabel>Price</FieldLabel>
          <TextInput
            type="number"
            value={newPrice}
            placeholder={livePrice > 0 ? fmtPrice(livePrice) : '0.00'}
            onChange={setNewPrice}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAdd();
            }}
          />
        </div>
        <div className="flex gap-1">
          {(['above', 'below'] as const).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setNewDir(d)}
              className={`px-2.5 py-1.5 text-10px font-mono font-semibold rounded-sm cursor-pointer border transition-all ${
                newDir === d
                  ? d === 'above'
                    ? 'border-green bg-green-bg text-green'
                    : 'border-red bg-red-bg text-red'
                  : 'border-border2 bg-bg3 text-text2'
              }`}
            >
              {d === 'above' ? '▲' : '▼'} {d}
            </button>
          ))}
        </div>
        <div className="flex-[2] min-w-[100px]">
          <FieldLabel>Label (optional)</FieldLabel>
          <TextInput value={newLabel} placeholder="e.g. Resistance level" onChange={setNewLabel} />
        </div>
        <ActionBtn variant="green" onClick={handleAdd}>
          + Alert
        </ActionBtn>
      </div>

      {livePrice > 0 && (
        <p className="text-9px font-mono text-text3 mb-2.5">
          {fmtSymDisplay(sym)} live:{' '}
          <span className="text-text2 font-bold">{fmtPrice(livePrice)}</span>
        </p>
      )}

      {pending.length === 0 && triggered.length === 0 ? (
        <p className="text-10px font-mono text-text3 text-center py-2.5">
          No alerts set. Enter a price above to create one.
        </p>
      ) : (
        <>
          {pending.length > 0 && (
            <div className="mb-2">
              <div className="text-9px font-mono text-text3 uppercase tracking-wide mb-1">
                Pending ({pending.length})
              </div>
              {pending.map((a) => {
                const dist = livePrice > 0 ? ((a.price - livePrice) / livePrice) * 100 : null;
                return (
                  <div
                    key={a.id}
                    className="flex items-center gap-2 px-2.5 py-2 mb-1 bg-bg3 rounded-sm border border-border"
                  >
                    <span className="text-[13px] shrink-0">{a.dir === 'above' ? '▲' : '▼'}</span>
                    <div className="flex-1">
                      <div
                        className={`text-xs font-mono font-bold ${
                          a.dir === 'above' ? 'text-green' : 'text-red'
                        }`}
                      >
                        {fmtPrice(a.price)}
                      </div>
                      <p className="text-9px font-mono text-text2">
                        {a.label} · {fmtSymDisplay(a.sym)}
                        {dist !== null && (
                          <span className="ml-1.5 text-text3">
                            {dist >= 0 ? '+' : ''}
                            {dist.toFixed(2)}% away
                          </span>
                        )}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removePriceAlert(a.id)}
                      className="bg-transparent border-0 cursor-pointer text-text3 text-sm px-1"
                      aria-label="Remove alert"
                    >
                      ×
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {triggered.length > 0 && (
            <div>
              <div className="text-9px font-mono text-text3 uppercase tracking-wide mb-1">
                Triggered ({triggered.length})
              </div>
              {triggered.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center gap-2 px-2.5 py-1.5 mb-1 opacity-60 bg-bg3 rounded-sm border border-border"
                >
                  <span className="text-[13px] shrink-0">✓</span>
                  <p className="flex-1 text-11px font-mono text-text3 line-through">
                    {a.label} · {fmtPrice(a.price)}
                  </p>
                  <button
                    type="button"
                    onClick={() => removePriceAlert(a.id)}
                    className="bg-transparent border-0 cursor-pointer text-text3 text-sm px-1"
                    aria-label="Remove alert"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </Card>
  );
}
