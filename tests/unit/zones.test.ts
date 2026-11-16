import { describe, expect, it } from 'vitest';
import { inRect, zoneAt, ZoneTracker } from '../../src/core/world/zones';

const clearing = { id: 'D', zone: { x: 0, y: 0, w: 100, h: 100 } };
const pool = { id: 'pool', zone: { x: 50, y: 50, w: 100, h: 100 } };

describe('zones', () => {
  it('holds points on the top and left edges, not the far ones', () => {
    expect(inRect(0, 0, clearing.zone)).toBe(true);
    expect(inRect(100, 50, clearing.zone)).toBe(false);
  });

  it('finds the first zone that holds a point', () => {
    expect(zoneAt(60, 60, [clearing, pool])?.id).toBe('D');
    expect(zoneAt(120, 120, [clearing, pool])?.id).toBe('pool');
    expect(zoneAt(500, 500, [clearing, pool])).toBeNull();
  });

  it('reports entering a zone once', () => {
    const tracker = new ZoneTracker([clearing, pool]);
    expect(tracker.update(10, 10).entered).toEqual(['D']);
    expect(tracker.update(20, 20).entered).toEqual([]);
    expect(tracker.update(30, 30).entered).toEqual([]);
  });

  it('follows overlapping zones each on its own', () => {
    const tracker = new ZoneTracker([clearing, pool]);
    tracker.update(10, 10);
    expect(tracker.update(60, 60)).toEqual({ entered: ['pool'], left: [] });
    expect(tracker.update(120, 120)).toEqual({ entered: [], left: ['D'] });
    expect([...tracker.current]).toEqual(['pool']);
    expect(tracker.update(500, 500)).toEqual({ entered: [], left: ['pool'] });
  });

  it('reports a zone again after leaving and coming back', () => {
    const tracker = new ZoneTracker([clearing]);
    tracker.update(10, 10);
    tracker.update(500, 10);
    expect(tracker.update(10, 10).entered).toEqual(['D']);
  });
});
