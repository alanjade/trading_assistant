import type { RiskCheckResult, RiskOrderDraft } from './riskManagementService';

export type ExecutionMode = 'paper' | 'sandbox' | 'live';
export type ExecutionOrderType = 'market' | 'limit';
export type ExecutionOrderStatus = 'accepted' | 'rejected' | 'filled' | 'cancelled';

export interface ExecutionOrderRequest extends RiskOrderDraft {
  type: ExecutionOrderType;
  clientOrderId?: string;
  limitPrice?: number;
}

export interface ExecutionOrderResult {
  id: string;
  exchange: string;
  mode: ExecutionMode;
  status: ExecutionOrderStatus;
  symbol: string;
  filledNotional: number;
  avgFillPrice: number | null;
  message?: string;
}

export interface BrokerExchangeAdapter {
  id: string;
  label: string;
  supportsLive: boolean;
  placeOrder(order: ExecutionOrderRequest, mode: ExecutionMode): Promise<ExecutionOrderResult>;
  cancelOrder(orderId: string, mode: ExecutionMode): Promise<ExecutionOrderResult>;
}

export interface ExecutionContext {
  mode: ExecutionMode;
  adapter: BrokerExchangeAdapter;
  risk: RiskCheckResult;
  allowLiveTrading?: boolean;
}

export async function executeOrder(
  order: ExecutionOrderRequest,
  context: ExecutionContext
): Promise<ExecutionOrderResult> {
  if (!context.risk.approved) {
    return rejected(order, context, context.risk.errors.join(' '));
  }

  if (context.mode === 'live') {
    if (!context.allowLiveTrading) {
      return rejected(order, context, 'Live trading is disabled by execution guard.');
    }
    if (!context.adapter.supportsLive) {
      return rejected(order, context, `${context.adapter.label} adapter does not support live trading.`);
    }
  }

  return context.adapter.placeOrder(order, context.mode);
}

export class PaperBrokerAdapter implements BrokerExchangeAdapter {
  id = 'paper';
  label = 'Paper Broker';
  supportsLive = false;

  async placeOrder(order: ExecutionOrderRequest, mode: ExecutionMode): Promise<ExecutionOrderResult> {
    const fillPrice = order.type === 'limit' ? order.limitPrice ?? order.entryPrice : order.entryPrice;

    return {
      id: order.clientOrderId ?? `paper-${Date.now().toString(36)}`,
      exchange: this.id,
      mode,
      status: 'filled',
      symbol: order.symbol,
      filledNotional: order.notional,
      avgFillPrice: fillPrice,
      message: 'Paper order filled locally.',
    };
  }

  async cancelOrder(orderId: string, mode: ExecutionMode): Promise<ExecutionOrderResult> {
    return {
      id: orderId,
      exchange: this.id,
      mode,
      status: 'cancelled',
      symbol: '',
      filledNotional: 0,
      avgFillPrice: null,
      message: 'Paper order cancelled locally.',
    };
  }
}

export class GuardedExchangeAdapter implements BrokerExchangeAdapter {
  supportsLive = true;

  constructor(
    public id: string,
    public label: string,
    private readonly endpoint: string
  ) {}

  async placeOrder(order: ExecutionOrderRequest, mode: ExecutionMode): Promise<ExecutionOrderResult> {
    if (mode !== 'sandbox') {
      return {
        id: order.clientOrderId ?? `${this.id}-${Date.now().toString(36)}`,
        exchange: this.id,
        mode,
        status: 'accepted',
        symbol: order.symbol,
        filledNotional: 0,
        avgFillPrice: null,
        message: 'Live adapter contract accepted the order; server-side signing is required to submit.',
      };
    }

    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode, order }),
    });

    if (!response.ok) {
      return {
        id: order.clientOrderId ?? `${this.id}-${Date.now().toString(36)}`,
        exchange: this.id,
        mode,
        status: 'rejected',
        symbol: order.symbol,
        filledNotional: 0,
        avgFillPrice: null,
        message: `Exchange endpoint rejected order: HTTP ${response.status}`,
      };
    }

    return (await response.json()) as ExecutionOrderResult;
  }

  async cancelOrder(orderId: string, mode: ExecutionMode): Promise<ExecutionOrderResult> {
    return {
      id: orderId,
      exchange: this.id,
      mode,
      status: 'accepted',
      symbol: '',
      filledNotional: 0,
      avgFillPrice: null,
      message: 'Cancel request accepted by adapter contract.',
    };
  }
}

function rejected(
  order: ExecutionOrderRequest,
  context: ExecutionContext,
  message: string
): ExecutionOrderResult {
  return {
    id: order.clientOrderId ?? `rejected-${Date.now().toString(36)}`,
    exchange: context.adapter.id,
    mode: context.mode,
    status: 'rejected',
    symbol: order.symbol,
    filledNotional: 0,
    avgFillPrice: null,
    message,
  };
}
