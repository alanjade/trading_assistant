import type { Candle } from '@/lib/indicators';

export interface MarketDataConfig {
  symbol: string;
  timeframe: string;
}

export interface WebSocketMessage {
  type: 'price' | 'candle' | 'error' | 'connected' | 'disconnected';
  data?: unknown;
  error?: string;
}

export type MarketDataListener = (msg: WebSocketMessage) => void;

export class BinanceWebSocketManager {
  private ws: WebSocket | null = null;
  private url: string;
  private listeners: Set<MarketDataListener> = new Set();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isManuallyClosed = false;

  constructor(baseUrl = 'wss://stream.binance.com:9443') {
    this.url = baseUrl;
  }

  subscribe(listener: MarketDataListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(msg: WebSocketMessage): void {
    this.listeners.forEach((listener) => listener(msg));
  }

  connect(config: MarketDataConfig): void {
    if (this.ws) this.disconnect();

    this.isManuallyClosed = false;
    const stream = this.buildStream(config.symbol, config.timeframe);
    const wsUrl = `${this.url}/ws/${stream}`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        this.notify({ type: 'connected' });
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(data);
        } catch {
          this.notify({ type: 'error', error: 'Failed to parse message' });
        }
      };

      this.ws.onerror = () => {
        this.notify({ type: 'error', error: 'WebSocket error' });
      };

      this.ws.onclose = () => {
        if (!this.isManuallyClosed) {
          this.attemptReconnect(config);
        } else {
          this.notify({ type: 'disconnected' });
        }
      };
    } catch {
      this.notify({ type: 'error', error: 'Connection failed' });
    }
  }

  disconnect(): void {
    this.isManuallyClosed = true;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  private buildStream(symbol: string, timeframe: string): string {
    const streamSymbol = symbol.toLowerCase().replace('usdt', '');
    const interval = this.tfToInterval(timeframe);
    return `${streamSymbol}usdt@kline_${interval}`;
  }

  private tfToInterval(tf: string): string {
    const map: Record<string, string> = {
      '1m': '1m',
      '5m': '5m',
      '15m': '15m',
      '1h': '1h',
      '4h': '4h',
      '1d': '1d',
    };
    return map[tf] || '1h';
  }

  private handleMessage(data: unknown): void {
    // Binance kline message
    if (typeof data === 'object' && data !== null && 'k' in data) {
      const cast = data as { k: unknown };
      const candle = this.parseKline(cast.k);
      // Only emit completed candles or let consumer handle incomplete ones
      const isComplete = (cast.k as { x?: unknown }).x as boolean;
      this.notify({ type: 'candle', data: { ...candle, complete: isComplete } });
    }
  }

  private parseKline(k: unknown): Candle {
    const cast = k as Record<string, unknown>;
    return {
      t: Number(cast.T),
      o: parseFloat(String(cast.o)),
      h: parseFloat(String(cast.h)),
      l: parseFloat(String(cast.l)),
      c: parseFloat(String(cast.c)),
      v: parseFloat(String(cast.v)),
    };
  }

  private attemptReconnect(config: MarketDataConfig): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.notify({ type: 'error', error: 'Max reconnect attempts reached' });
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    setTimeout(() => {
      if (!this.isManuallyClosed) {
        this.connect(config);
      }
    }, Math.min(delay, 30000));
  }
}
