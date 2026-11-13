import { describe, expect, it, vi } from 'vitest';
import { EventBus } from '../../src/core/events';

type TestEvents = {
  ping: { n: number };
  done: Record<string, never>;
};

describe('EventBus', () => {
  it('delivers a payload to every listener of that event', () => {
    const bus = new EventBus<TestEvents>();
    const a = vi.fn();
    const b = vi.fn();
    const other = vi.fn();
    bus.on('ping', a);
    bus.on('ping', b);
    bus.on('done', other);

    bus.emit('ping', { n: 3 });

    expect(a).toHaveBeenCalledWith({ n: 3 });
    expect(b).toHaveBeenCalledWith({ n: 3 });
    expect(other).not.toHaveBeenCalled();
  });

  it('stops delivering after the returned function is called', () => {
    const bus = new EventBus<TestEvents>();
    const handler = vi.fn();
    const stop = bus.on('ping', handler);

    stop();
    bus.emit('ping', { n: 1 });

    expect(handler).not.toHaveBeenCalled();
  });

  it('stops delivering after off', () => {
    const bus = new EventBus<TestEvents>();
    const handler = vi.fn();
    bus.on('ping', handler);

    bus.off('ping', handler);
    bus.emit('ping', { n: 1 });

    expect(handler).not.toHaveBeenCalled();
  });

  it('once fires a single time', () => {
    const bus = new EventBus<TestEvents>();
    const handler = vi.fn();
    bus.once('ping', handler);

    bus.emit('ping', { n: 1 });
    bus.emit('ping', { n: 2 });

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith({ n: 1 });
  });

  it('lets a handler unsubscribe another during an emit without skipping anyone', () => {
    const bus = new EventBus<TestEvents>();
    const second = vi.fn();
    bus.on('ping', () => bus.off('ping', second));
    bus.on('ping', second);

    bus.emit('ping', { n: 1 });
    bus.emit('ping', { n: 2 });

    // It was already queued for the first emit, and is gone for the second.
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('emitting with no listeners does nothing', () => {
    const bus = new EventBus<TestEvents>();
    expect(() => bus.emit('ping', { n: 1 })).not.toThrow();
  });

  it('clear removes every listener', () => {
    const bus = new EventBus<TestEvents>();
    const handler = vi.fn();
    bus.on('ping', handler);

    bus.clear();
    bus.emit('ping', { n: 1 });

    expect(handler).not.toHaveBeenCalled();
  });
});
