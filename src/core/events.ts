/**
 * A small typed event bus. Systems talk to each other through it instead of
 * holding references to one another.
 */
export type Handler<Payload> = (payload: Payload) => void;

export class EventBus<Events extends Record<string, unknown>> {
  private readonly handlers = new Map<keyof Events, Set<Handler<never>>>();

  /** Listen for an event. Returns a function that stops listening. */
  on<K extends keyof Events>(type: K, handler: Handler<Events[K]>): () => void {
    let set = this.handlers.get(type);
    if (!set) {
      set = new Set();
      this.handlers.set(type, set);
    }
    set.add(handler as Handler<never>);
    return () => this.off(type, handler);
  }

  /** Listen for the next occurrence only. */
  once<K extends keyof Events>(type: K, handler: Handler<Events[K]>): () => void {
    const stop = this.on(type, (payload) => {
      stop();
      handler(payload);
    });
    return stop;
  }

  off<K extends keyof Events>(type: K, handler: Handler<Events[K]>): void {
    this.handlers.get(type)?.delete(handler as Handler<never>);
  }

  emit<K extends keyof Events>(type: K, payload: Events[K]): void {
    const set = this.handlers.get(type);
    if (!set) return;
    // Copy first, so a handler may subscribe or unsubscribe while we iterate.
    for (const handler of [...set]) {
      (handler as Handler<Events[K]>)(payload);
    }
  }

  clear(): void {
    this.handlers.clear();
  }
}
