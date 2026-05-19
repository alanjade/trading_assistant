import type { Candle } from '@/lib/indicators';

export interface ExchangeConfig {
  name: string;
  wsUrl: string;
  restUrl?: string;
}

export interface ExchangeAdapter {
  name: string;
  connect(symbol: string, timeframe: string, onMessage: (data: unknown) => void): void;
  disconnect(): void;
  candles: Candle[];
}

export class BinanceAdapter implements ExchangeAdapter {
  name = 'Binance';
  candles: Candle[] = [];
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private isClosed = false;

  connect(symbol: string, timeframe: string, onMessage: (data: unknown) => void): void {
    this.isClosed = false;
    const stream = `${symbol.toLowerCase().replace('usdt', '')}usdt@kline_${this.tfToInterval(timeframe)}`;
    const url = `wss://stream.binance.com:9443/ws/${stream}`;

    try {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        onMessage({ type: 'connected' });
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as unknown;
          onMessage(data);
        } catch {
          onMessage({ type: 'error', error: 'Parse error' });
        }
      };

      this.ws.onerror = () => {
        onMessage({ type: 'error', error: 'WebSocket error' });
      };

      this.ws.onclose = () => {
        if (!this.isClosed) {
          this.handleReconnect(symbol, timeframe, onMessage);
        }
      };
    } catch {
      onMessage({ type: 'error', error: 'Connection failed' });
    }
  }

  disconnect(): void {
    this.isClosed = true;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  private handleReconnect(
    symbol: string,
    timeframe: string,
    onMessage: (data: unknown) => void
  ): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      onMessage({ type: 'error', error: 'Max reconnect attempts reached' });
      return;
    }

    this.reconnectAttempts++;
    const delay = 1000 * Math.pow(2, this.reconnectAttempts - 1);

    setTimeout(() => {
      if (!this.isClosed) {
        this.connect(symbol, timeframe, onMessage);
      }
    }, Math.min(delay, 30000));
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
}

export class BybitAdapter implements ExchangeAdapter {
  name = 'Bybit';
  candles: Candle[] = [];
  private ws: WebSocket | null = null;

  connect(symbol: string, timeframe: string, onMessage: (data: unknown) => void): void {
    const pair = symbol.toLowerCase().replace('usdt', '');
    const interval = this.tfToInterval(timeframe);
    const url = `wss://stream.bybit.com/v5/public/spot?symbol=${pair.toUpperCase()}USDT`;

    try {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        this.ws!.send(
          JSON.stringify({
            op: 'subscribe',
            args: [`kline.${interval}.${pair.toUpperCase()}USDT`],
          })
        );
        onMessage({ type: 'connected' });
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as unknown;
          onMessage(data);
        } catch {
          onMessage({ type: 'error', error: 'Parse error' });
        }
      };

      this.ws.onerror = () => {
        onMessage({ type: 'error', error: 'WebSocket error' });
      };

      this.ws.onclose = () => {
        onMessage({ type: 'disconnected' });
      };
    } catch {
      onMessage({ type: 'error', error: 'Connection failed' });
    }
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  private tfToInterval(tf: string): string {
    const map: Record<string, string> = {
      '1m': '1',
      '5m': '5',
      '15m': '15',
      '1h': '60',
      '4h': '240',
      '1d': 'D',
    };
    return map[tf] || '60';
  }
}
