import { describe, expect, it } from 'vitest';
import { Drifters, type Bell, type Copepod } from '../../src/core/drift/drifters';
import { Larvae, Motes, moteClouds, type Mote } from '../../src/core/drift/plankton';
import { FeelingsModel } from '../../src/core/feelings/FeelingsModel';
import { QUIET_CONTEXT } from '../../src/core/feelings/types';
import { DriftMotion } from '../../src/core/movement/DriftMotion';
import { seededRandom } from '../../src/core/random';
import { DRIFT, FEELINGS, MOOD } from '../../src/data/tuning';

const DT = 1 / 30;
const H = 1800;
const FLOW = DRIFT.motion.flow;

function steps(seconds: number, each: () => void): void {
  for (let time = 0; time < seconds - 1e-9; time += DT) each();
}

describe('the larva in the Drift', () => {
  it('is carried by the flow when the player does nothing', () => {
    const larva = new DriftMotion(DRIFT.motion, 700, 900, H);
    steps(10, () => larva.step(DT, { x: 0, y: 0 }, 'mid'));
    expect(larva.x).toBeCloseTo(700 + FLOW * 10, -1);
    expect(larva.y).toBeCloseTo(900, 5);
  });

  it('steers up and down, and never leaves the water', () => {
    const larva = new DriftMotion(DRIFT.motion, 700, 900, H);
    steps(2, () => larva.step(DT, { x: 0, y: -1 }, 'mid'));
    expect(larva.y).toBeLessThan(900 - 100);
    steps(30, () => larva.step(DT, { x: 0, y: -1 }, 'mid'));
    expect(larva.y).toBe(DRIFT.motion.margin);
    steps(40, () => larva.step(DT, { x: 0, y: 1 }, 'mid'));
    expect(larva.y).toBe(H - DRIFT.motion.margin);
  });

  it('leans with the flow or against it, but never swims against it', () => {
    const with_ = new DriftMotion(DRIFT.motion, 0, 900, H);
    const against = new DriftMotion(DRIFT.motion, 0, 900, H);
    steps(10, () => {
      with_.step(DT, { x: 1, y: 0 }, 'late');
      against.step(DT, { x: -1, y: 0 }, 'late');
    });
    expect(with_.x).toBeGreaterThan(FLOW * 10 + 200);
    expect(against.x).toBeLessThan(FLOW * 10 - 200);
    expect(against.x).toBeGreaterThan(0);
  });

  it('pushes in jerks at first and swims steadily at the end', () => {
    const speeds = (shape: 'early' | 'late') => {
      const larva = new DriftMotion(DRIFT.motion, 0, 900, H);
      const seen: number[] = [];
      steps(4, () => {
        larva.step(DT, { x: 0, y: 1 }, shape);
        seen.push(larva.vy);
      });
      const late = seen.slice(60);
      return Math.max(...late) - Math.min(...late);
    };
    expect(speeds('early')).toBeGreaterThan(3 * speeds('late'));
  });

  it('tilts no more than its limit, and faces the way the water runs', () => {
    const larva = new DriftMotion(DRIFT.motion, 700, 900, H);
    steps(2, () => larva.step(DT, { x: 0, y: 1 }, 'mid'));
    expect(larva.heading).toBeGreaterThan(0);
    expect(larva.heading).toBeLessThanOrEqual(DRIFT.motion.tilt + 1e-9);
    const turned = new DriftMotion(DRIFT.motion, 8300, 900, H, -1);
    steps(10, () => turned.step(DT, { x: 0, y: 0 }, 'mid'));
    expect(turned.x).toBeCloseTo(8300 - FLOW * 10, -1);
    expect(Math.cos(turned.heading)).toBeLessThan(-0.99);
  });

  it('stops when nothing carries it any more, as at landfall', () => {
    const larva = new DriftMotion(DRIFT.motion, 8600, 900, H);
    steps(3, () => larva.step(DT, { x: 0, y: 0 }, 'late', 0));
    const x = larva.x;
    steps(2, () => larva.step(DT, { x: 0, y: 0 }, 'late', 0));
    expect(larva.x - x).toBeLessThan(1);
  });
});

describe('motes', () => {
  const field = { zone: { x: 2000, y: 0, w: 3000, h: H }, clouds: 12 };

  it('come in clouds of 6 to 12, each in its own stretch of the zone', () => {
    const motes = moteClouds([field], DRIFT.motes, seededRandom(4));
    expect(motes.length).toBeGreaterThanOrEqual(12 * 6);
    expect(motes.length).toBeLessThanOrEqual(12 * 12);
    for (const mote of motes) {
      expect(mote.x).toBeGreaterThan(field.zone.x - DRIFT.motes.spread);
      expect(mote.x).toBeLessThan(field.zone.x + field.zone.w + DRIFT.motes.spread);
      expect(mote.size).toBeGreaterThanOrEqual(DRIFT.motes.size[0]);
      expect(mote.size).toBeLessThanOrEqual(DRIFT.motes.size[1]);
    }
    expect(new Set(motes.map((mote) => mote.id)).size).toBe(motes.length);
  });

  it('are the same for the same seed', () => {
    const a = moteClouds([field], DRIFT.motes, seededRandom(9));
    const b = moteClouds([field], DRIFT.motes, seededRandom(9));
    expect(a).toEqual(b);
  });

  it('drift slower than the larva, so it overtakes them', () => {
    const mote: Mote = { id: 0, x: 100, y: 900, size: 20, look: 'a', turn: 0, phase: 0 };
    const motes = new Motes([mote], DRIFT.motes, FLOW);
    steps(10, () => motes.step(DT));
    expect(mote.x).toBeCloseTo(100 + FLOW * DRIFT.motes.drift * 10, 0);
    expect(Math.abs(mote.y - 900)).toBeLessThan(DRIFT.motes.wobble * 10);
  });

  it('are eaten when the mouth touches them, and not before', () => {
    const near: Mote = { id: 0, x: 100, y: 100, size: 20, look: 'a', turn: 0, phase: 0 };
    const far: Mote = { id: 1, x: 300, y: 100, size: 20, look: 'b', turn: 0, phase: 0 };
    const motes = new Motes([near, far], DRIFT.motes, FLOW);
    expect(motes.eat(125, 100, 6)).toEqual([]);
    expect(motes.eat(115, 100, 6)).toEqual([near]);
    expect(motes.motes).toEqual([far]);
    expect(motes.nearest(0, 100)?.mote).toBe(far);
  });
});

/** The player crossing the Drift at the speed of the flow, with the view on it. */
function cross(seed: number) {
  const random = seededRandom(seed);
  const start = { x: 700, y: 900 };
  const bl = DRIFT.length.mid;
  const larvae = new Larvae(
    {
      ...DRIFT.larvae,
      keep: [DRIFT.larvae.keep[0] * bl, DRIFT.larvae.keep[1] * bl],
      apart: DRIFT.larvae.apart * bl,
    },
    start,
    { start: 1500, haze: 7000, end: 8600 },
    H,
    FLOW,
    random,
  );
  const player = { ...start };
  const view = { x: 0, y: 0, w: 1372, h: 772 };
  const missing: { id: string; seen: boolean }[] = [];
  let atHaze = 0;
  while (player.x < 8600) {
    player.x += FLOW * DT;
    view.x = player.x - view.w / 2 + 200;
    view.y = player.y - view.h / 2;
    const before = new Map(larvae.larvae.map((larva) => [larva.id, { ...larva }]));
    for (const id of larvae.step(DT, player, view)) {
      const was = before.get(id);
      const seen =
        was !== undefined &&
        was.x > view.x &&
        was.x < view.x + view.w &&
        was.y > view.y &&
        was.y < view.y + view.h;
      missing.push({ id, seen });
    }
    if (atHaze === 0 && player.x >= 7000) atHaze = larvae.larvae.length;
  }
  const near = larvae.larvae.filter(
    (larva) => larva.settler && Math.hypot(larva.x - player.x, larva.y - player.y) < 8 * bl,
  );
  return { larvae, missing, atHaze, near: near.length };
}

describe('the other larvae (T54)', () => {
  it('thin out one at a time, and never where the player can see', () => {
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
      const { missing } = cross(seed);
      expect(missing.length).toBeGreaterThan(0);
      expect(missing.filter((one) => one.seen)).toEqual([]);
    }
  });

  it('about a third reach the haze, and two or three settle with the player', () => {
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
      const { atHaze, near } = cross(seed);
      expect(atHaze).toBeGreaterThanOrEqual(Math.round(DRIFT.larvae.count / 3));
      expect(atHaze).toBeLessThanOrEqual(Math.round(DRIFT.larvae.count / 3) + 3);
      expect(near).toBeGreaterThanOrEqual(2);
      expect(near).toBeLessThanOrEqual(3);
    }
  });

  it('are touched within reach', () => {
    const { larvae } = cross(3);
    const one = larvae.larvae[0];
    expect(one).toBeDefined();
    if (!one) return;
    expect(larvae.touching(one.x + 10, one.y, 20)).toContain(one);
    expect(larvae.touching(one.x + 100, one.y, 20)).not.toContain(one);
  });
});

describe('copepods and bells', () => {
  const copepod = (): Copepod => ({ id: 'c', x: 500, y: 900, heading: 0, wait: 1, hop: null });
  const bell = (): Bell => ({ id: 'b', x: 1000, y: 900, size: 160, phase: 0 });

  it('a copepod hangs still, then hops a short way, quickly', () => {
    const one = copepod();
    const drifters = new Drifters([one], [], DRIFT, 0, H, () => 0.5);
    steps(0.9, () => drifters.step(DT));
    expect(one.hop).toBeNull();
    expect(one.x).toBe(500);
    steps(0.2, () => drifters.step(DT));
    expect(one.hop).not.toBeNull();
    steps(DRIFT.copepod.hopTime + 0.05, () => drifters.step(DT));
    expect(one.hop).toBeNull();
    expect(Math.hypot(one.x - 500, one.y - 900)).toBeCloseTo(DRIFT.copepod.hop, 0);
    // Then it waits 2 to 4 s before the next.
    const x = one.x;
    steps(1.9, () => drifters.step(DT));
    expect(one.x).toBe(x);
  });

  it('a bell opens and closes slowly as it drifts', () => {
    const one = bell();
    const drifters = new Drifters([], [one], DRIFT, FLOW, H, () => 0.5);
    const widths: number[] = [];
    steps(DRIFT.bell.breathe, () => {
      drifters.step(DT);
      widths.push(drifters.width(one));
    });
    expect(Math.max(...widths) - Math.min(...widths)).toBeGreaterThan(160 * DRIFT.bell.open * 0.9);
    expect(one.x).toBeCloseTo(1000 + FLOW * DRIFT.bell.drift * DRIFT.bell.breathe, -1);
  });

  it('the larva slides round a bell and never through it', () => {
    const one = bell();
    const drifters = new Drifters([], [one], DRIFT, FLOW, H, () => 0.5);
    const inside = drifters.slideAround(1000 - 20, 905, 10);
    const distance = Math.hypot(inside.x - one.x, inside.y - one.y);
    expect(distance).toBeGreaterThanOrEqual(drifters.width(one) * 0.45 + 10 - 1e-6);
    expect(drifters.slideAround(500, 900, 10)).toEqual({ x: 500, y: 900 });
  });
});

describe('the yolk', () => {
  it('holds hunger while the larva lives on it', () => {
    const feelings = new FeelingsModel(FEELINGS, MOOD, { hunger: 0.65 });
    const drifting = { ...QUIET_CONTEXT, activity: 'drifting' as const };
    feelings.setYolk(true);
    steps(10, () => feelings.step(DT, drifting));
    expect(feelings.values.hunger).toBeCloseTo(0.65, 5);
    feelings.setYolk(false);
    steps(6, () => feelings.step(DT, drifting));
    expect(feelings.values.hunger).toBeGreaterThan(0.69);
  });
});
