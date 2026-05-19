type Listener<T> = (payload: T) => void;

export type StreamEventMap = {
  'chart:fullscreen': void;
  'chart:openIndicators': void;
};

class EventBus<Events extends Record<string, unknown>> {
  private listeners = new Map<keyof Events, Set<Listener<Events[keyof Events]>>>();

  on<K extends keyof Events>(event: K, listener: Listener<Events[K]>) {
    const listeners = (this.listeners.get(event) ?? new Set()) as Set<Listener<Events[K]>>;
    listeners.add(listener as Listener<Events[keyof Events]>);
    this.listeners.set(event, listeners as Set<Listener<Events[keyof Events]>>);
  }

  off<K extends keyof Events>(event: K, listener: Listener<Events[K]>) {
    const listeners = this.listeners.get(event);
    if (!listeners) return;
    listeners.delete(listener as Listener<Events[keyof Events]>);
    if (listeners.size === 0) this.listeners.delete(event);
  }

  emit<K extends keyof Events>(event: K, payload?: Events[K]) {
    const listeners = this.listeners.get(event) as Set<Listener<Events[K]>> | undefined;
    if (!listeners) return;
    listeners.forEach((listener) => listener(payload as Events[K]));
  }

  clear() {
    this.listeners.clear();
  }
}

export const eventBus = new EventBus<StreamEventMap>();
