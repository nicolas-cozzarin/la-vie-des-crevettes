import { describe, expect, it } from 'vitest';
import { curiosityPull, DiscoveryTracker, type Discoverable } from '../../src/core/world/discovery';
import { CURIOSITY } from '../../src/data/tuning';

const BL = 100;
const TUNING = { range: 8, weights: CURIOSITY.weights, find: CURIOSITY.find };
const crab: Discoverable = { id: 'creature.fiddlerCrab', kind: 'creature', x: 0, y: 0 };
const pod: Discoverable = { id: 'thing.seedPod', kind: 'thing', x: 1000, y: 0 };
const hollow: Discoverable = { id: 'place.hollow', kind: 'thing', x: 0, y: 1000, under: 200 };

describe('curiosity pull', () => {
  it('reaches 0.6 at 3.2 BL from a creature with a range of 8', () => {
    expect(curiosityPull(320, 0, [crab], new Set(), TUNING, BL).value).toBeCloseTo(0.6);
  });

  it('is 0 beyond the range and for what is known', () => {
    expect(curiosityPull(900, 0, [crab], new Set(), TUNING, BL).value).toBe(0);
    expect(curiosityPull(100, 0, [crab], new Set([crab.id]), TUNING, BL).value).toBe(0);
  });

  it('names the thing that pulls hardest', () => {
    expect(curiosityPull(700, 0, [crab, pod], new Set(), TUNING, BL).target).toBe(pod);
  });

  it("is pulled by a pinned challenge's target at 0.6, even once it is known", () => {
    const pinned = { thing: crab, weight: CURIOSITY.pinned };
    const pull = curiosityPull(0, 0, [crab], new Set([crab.id]), TUNING, BL, pinned);
    expect(pull.value).toBeCloseTo(0.6);
    expect(pull.target).toBe(crab);
    // Something not yet known still pulls harder.
    expect(curiosityPull(900, 0, [pod], new Set(), TUNING, BL, pinned).target).toBe(pod);
  });
});

describe('the discovery tracker', () => {
  it('finds a creature after 2 s within 2.5 BL', () => {
    const tracker = new DiscoveryTracker(TUNING, BL);
    for (let index = 0; index < 59; index++)
      expect(tracker.step(1 / 30, 200, 0, [crab])).toEqual([]);
    expect(tracker.step(1 / 30, 200, 0, [crab])).toEqual([crab.id]);
    expect(tracker.known.has(crab.id)).toBe(true);
    expect(tracker.step(1 / 30, 200, 0, [crab])).toEqual([]);
  });

  it('starts again when the shrimp moves away', () => {
    const tracker = new DiscoveryTracker(TUNING, BL);
    for (let index = 0; index < 50; index++) tracker.step(1 / 30, 200, 0, [crab]);
    tracker.step(1 / 30, 400, 0, [crab]);
    for (let index = 0; index < 50; index++) tracker.step(1 / 30, 200, 0, [crab]);
    expect(tracker.known.has(crab.id)).toBe(false);
  });

  it('cannot find an animal while it is out of sight, and starts again when it is back', () => {
    const tracker = new DiscoveryTracker(TUNING, BL);
    const goby: Discoverable = { id: 'creature.pistolAndGoby', kind: 'creature', x: 0, y: 0 };
    for (let index = 0; index < 50; index++) tracker.step(1 / 30, 200, 0, [goby]);
    goby.away = true;
    for (let index = 0; index < 90; index++) tracker.step(1 / 30, 200, 0, [goby]);
    expect(tracker.known.has(goby.id)).toBe(false);
    goby.away = false;
    for (let index = 0; index < 50; index++) tracker.step(1 / 30, 200, 0, [goby]);
    expect(tracker.known.has(goby.id)).toBe(false);
    for (let index = 0; index < 10; index++) tracker.step(1 / 30, 200, 0, [goby]);
    expect(tracker.known.has(goby.id)).toBe(true);
  });

  it('finds a thing after 1 s within 1.5 BL', () => {
    const tracker = new DiscoveryTracker(TUNING, BL);
    for (let index = 0; index < 29; index++) tracker.step(1 / 30, 1100, 0, [pod]);
    expect(tracker.step(1 / 30, 1100, 0, [pod])).toEqual([pod.id]);
  });

  it('finds a place under cover at once', () => {
    const tracker = new DiscoveryTracker(TUNING, BL);
    expect(tracker.step(1 / 30, 0, 1150, [hollow])).toEqual([hollow.id]);
  });

  it('keeps what was known before', () => {
    const tracker = new DiscoveryTracker(TUNING, BL, [crab.id]);
    expect(tracker.pull(100, 0, [crab]).value).toBe(0);
    expect(tracker.add(crab.id)).toBe(false);
    expect(tracker.add('place.D')).toBe(true);
  });
});

describe('foods', () => {
  it('a food pulls on curiosity but is found only by tasting', () => {
    const tracker = new DiscoveryTracker(
      {
        range: 8,
        weights: { creature: 1, thing: 1, food: 0.8 },
        find: { creature: { distance: 2.5, seconds: 2 }, thing: { distance: 1.5, seconds: 1 } },
      },
      100,
    );
    const films = [{ id: 'food.algaeFilm', kind: 'food' as const, x: 0, y: 0 }];
    expect(tracker.pull(0, 0, films).value).toBeCloseTo(0.8);
    expect(tracker.step(5, 0, 0, films)).toEqual([]);
    expect(tracker.add('food.algaeFilm')).toBe(true);
    expect(tracker.pull(0, 0, films).value).toBe(0);
  });
});
