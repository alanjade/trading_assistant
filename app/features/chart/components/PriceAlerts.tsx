'use client';

import { z } from 'zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  ActionBtn,
  Card,
  FieldLabel,
  PanelHeader,
  pillToggleClass,
  settingsInputClass,
} from '@/components/ui';
import { fmtPrice, fmtSymDisplay } from '@/lib/indicators';
import { playAlertSound, useStore } from '@/lib/store';
import { zodResolver } from '@hookform/resolvers/zod';

const priceAlertSchema = z.object({
  price: z.coerce.number().positive('Enter a positive alert price.'),
  dir: z.enum(['above', 'below']),
  label: z.string().trim().max(80, 'Keep labels under 80 characters.').optional(),
});

type PriceAlertFormInput = z.input<typeof priceAlertSchema>;
type PriceAlertFormOutput = z.output<typeof priceAlertSchema>;

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

  const [notifPerm, setNotifPerm] = useState<NotificationPermission>('default');
  const {
    formState: { errors },
    handleSubmit,
    register,
    reset,
    setValue,
    watch,
  } = useForm<PriceAlertFormInput, unknown, PriceAlertFormOutput>({
    resolver: zodResolver(priceAlertSchema),
    defaultValues: { price: undefined, dir: 'above', label: '' },
    mode: 'onSubmit',
  });
  const newDir = watch('dir');

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

  const handleAdd = (values: PriceAlertFormOutput) => {
    const label = values.label?.trim();
    addPriceAlert({
      sym,
      price: values.price,
      dir: values.dir,
      label: label || `${fmtSymDisplay(sym)} ${values.dir} ${fmtPrice(values.price)}`,
    });
    reset({ price: undefined, dir: values.dir, label: '' });
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

      <form
        className="flex gap-1.5 items-end mb-2.5 flex-wrap"
        onSubmit={handleSubmit(handleAdd)}
        aria-label="Create price alert"
      >
        <div className="flex-1 min-w-[100px]">
          <FieldLabel htmlFor="price-alert-price">Price</FieldLabel>
          <input
            id="price-alert-price"
            type="number"
            placeholder={livePrice > 0 ? fmtPrice(livePrice) : '0.00'}
            aria-invalid={errors.price ? 'true' : 'false'}
            aria-describedby={errors.price ? 'price-alert-price-error' : undefined}
            className={settingsInputClass}
            {...register('price')}
          />
          {errors.price && (
            <p id="price-alert-price-error" className="mt-1 text-9px font-mono text-red">
              {errors.price.message}
            </p>
          )}
        </div>
        <div className="flex gap-1" role="radiogroup" aria-label="Alert direction">
          {(['above', 'below'] as const).map((d) => (
            <button
              key={d}
              type="button"
              role="radio"
              aria-checked={newDir === d}
              onClick={() => setValue('dir', d, { shouldDirty: true })}
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
          <FieldLabel htmlFor="price-alert-label">Label (optional)</FieldLabel>
          <input
            id="price-alert-label"
            placeholder="e.g. Resistance level"
            aria-invalid={errors.label ? 'true' : 'false'}
            aria-describedby={errors.label ? 'price-alert-label-error' : undefined}
            className={settingsInputClass}
            {...register('label')}
          />
          {errors.label && (
            <p id="price-alert-label-error" className="mt-1 text-9px font-mono text-red">
              {errors.label.message}
            </p>
          )}
        </div>
        <ActionBtn variant="green" type="submit">
          + Alert
        </ActionBtn>
      </form>

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
