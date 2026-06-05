import type { Candle } from './indicators';

export type IndicatorPluginValue = number | null | Record<string, number | null>;

export interface IndicatorPluginContext {
  candles: Candle[];
  closes: number[];
}

export interface IndicatorPlugin<TConfig extends Record<string, unknown> = Record<string, unknown>> {
  id: string;
  label: string;
  defaultConfig: TConfig;
  calculate(context: IndicatorPluginContext, config: TConfig): IndicatorPluginValue[];
}

export interface RegisteredIndicatorPlugin<TConfig extends Record<string, unknown> = Record<string, unknown>> {
  plugin: IndicatorPlugin<TConfig>;
  enabled: boolean;
  config: TConfig;
}

export interface IndicatorPluginRunResult {
  id: string;
  label: string;
  values: IndicatorPluginValue[];
}

export class IndicatorPluginEngine {
  private readonly plugins = new Map<string, RegisteredIndicatorPlugin>();

  register<TConfig extends Record<string, unknown>>(plugin: IndicatorPlugin<TConfig>, config?: Partial<TConfig>): void {
    if (this.plugins.has(plugin.id)) {
      throw new Error(`Indicator plugin already registered: ${plugin.id}`);
    }

    this.plugins.set(plugin.id, {
      plugin,
      enabled: true,
      config: { ...plugin.defaultConfig, ...config },
    });
  }

  unregister(id: string): void {
    this.plugins.delete(id);
  }

  setEnabled(id: string, enabled: boolean): void {
    const registered = this.requirePlugin(id);
    registered.enabled = enabled;
  }

  configure<TConfig extends Record<string, unknown>>(id: string, config: Partial<TConfig>): void {
    const registered = this.requirePlugin(id);
    registered.config = { ...registered.config, ...config };
  }

  list(): RegisteredIndicatorPlugin[] {
    return [...this.plugins.values()];
  }

  run(candles: Candle[]): IndicatorPluginRunResult[] {
    const context = {
      candles,
      closes: candles.map((candle) => candle.c),
    };

    return this.list()
      .filter((registered) => registered.enabled)
      .map((registered) => ({
        id: registered.plugin.id,
        label: registered.plugin.label,
        values: registered.plugin.calculate(context, registered.config),
      }));
  }

  private requirePlugin(id: string): RegisteredIndicatorPlugin {
    const registered = this.plugins.get(id);
    if (!registered) {
      throw new Error(`Indicator plugin is not registered: ${id}`);
    }
    return registered;
  }
}

export function createSmaPlugin(): IndicatorPlugin<{ period: number }> {
  return {
    id: 'sma',
    label: 'Simple Moving Average',
    defaultConfig: { period: 20 },
    calculate: ({ closes }, { period }) =>
      closes.map((_value, index) => {
        if (index < period - 1) return null;
        const window = closes.slice(index - period + 1, index + 1);
        return window.reduce((sum, value) => sum + value, 0) / period;
      }),
  };
}

export function createPluginEngine(plugins: IndicatorPlugin[] = [createSmaPlugin()]): IndicatorPluginEngine {
  const engine = new IndicatorPluginEngine();
  plugins.forEach((plugin) => engine.register(plugin));
  return engine;
}
