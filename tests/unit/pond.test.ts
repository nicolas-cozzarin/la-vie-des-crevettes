import { describe, expect, it } from 'vitest';
import { Crowd, type CrowdTuning } from '../../src/core/pond/crowd';
import { GateMoment, type GateMomentTuning } from '../../src/core/pond/moment';
import { inPlume, type Plume } from '../../src/core/pond/plume';
import { seededRandom } from '../../src/core/random';

/** The farm pond seen from the channel (D39; doc 18, "Level 3"). */

describe('the plume of pond water', () => {
  const plume: Plume = { from: { x: 0, y: 0 }, to: { x: 1000, y: 0 }, width: 200 };

  it('holds the band from the gate to its far end, as wide as it is', () => {
    expect(inPlume(plume, 500, 0)).toBe(true);
    expect(inPlume(plume, 500, 99)).toBe(true);
    expect(inPlume(plume, 500, -99)).toBe(true);
    expect(inPlume(plume, 500, 101)).toBe(false);
  });

  it('has round ends', () => {
    expect(inPlume(plume, -90, 0)).toBe(true);
    expect(inPlume(plume, 1090, 0)).toBe(true);
    expect(inPlume(plume, -90, 90)).toBe(false);
    expect(inPlume(plume, 1110, 0)).toBe(false);
  });

  it('may lie at any slant', () => {
    const bent: Plume = { from: { x: 0, y: 0 }, to: { x: -600, y: 800 }, width: 100 };
    expect(inPlume(bent, -300, 400)).toBe(true);
    expect(inPlume(bent, -300, 300)).toBe(false);
  });
});

describe('the crowd behind the mesh', () => {
  const tuning: CrowdTuning = { speed: [40, 60], come: 100, near: 300 };
  const band = { left: -400, right: 400, top: -200, bottom: -50 };
  const mesh = { x: 0, y: -30 };
  const far = { x: 0, y: 2000 };
  const make = () => new Crowd(band, mesh, 12, tuning, seededRandom(7));

  it('is close together along the wall, inside its band', () => {
    const crowd = make();
    expect(crowd.shapes).toHaveLength(12);
    for (const shape of crowd.shapes) {
      expect(shape.x).toBeGreaterThanOrEqual(band.left);
      expect(shape.x).toBeLessThanOrEqual(band.right);
      expect(shape.y).toBeGreaterThanOrEqual(band.top);
      expect(shape.y).toBeLessThanOrEqual(band.bottom);
    }
  });

  it('moves along the wall, and round again, while nobody comes', () => {
    const crowd = make();
    const first = crowd.shapes.map((shape) => shape.x);
    crowd.step(1, far);
    crowd.shapes.forEach((shape, index) => {
      const moved = shape.x - (first[index] ?? 0);
      // Forward at its own pace, or past the end and round to the start.
      const ok = (moved >= 40 && moved <= 60) || moved < -700;
      expect(ok, `moved ${moved}`).toBe(true);
    });
    for (let step = 0; step < 200; step++) crowd.step(0.1, far);
    for (const shape of crowd.shapes) {
      expect(shape.x).toBeGreaterThanOrEqual(band.left);
      expect(shape.x).toBeLessThanOrEqual(band.right);
      expect(shape.atMesh).toBe(false);
    }
    expect(crowd.atMesh).toBeNull();
  });

  it('sends the nearest one to the mesh when the player comes, and it stays there facing out', () => {
    const crowd = make();
    const player = { x: 50, y: 150 };
    const nearest = Math.min(...crowd.shapes.map((shape) => Math.abs(shape.x - mesh.x)));
    crowd.step(0.01, player);
    const one = crowd.atMesh;
    expect(one).not.toBeNull();
    expect(Math.abs((one?.x ?? 0) - mesh.x)).toBeCloseTo(nearest, 0);
    for (let step = 0; step < 100; step++) crowd.step(0.1, player);
    expect(one?.x).toBeCloseTo(mesh.x, 5);
    expect(one?.y).toBeCloseTo(mesh.y, 5);
    expect(one?.heading).toBeCloseTo(Math.atan2(player.y - mesh.y, player.x - mesh.x), 5);
    // Only one comes. When the player has gone it is still there.
    expect(crowd.shapes.filter((shape) => shape.atMesh)).toHaveLength(1);
    for (let step = 0; step < 100; step++) crowd.step(0.1, far);
    expect(one?.x).toBeCloseTo(mesh.x, 5);
    expect(one?.y).toBeCloseTo(mesh.y, 5);
  });

  it('waits for the player to come within reach of the mesh', () => {
    const crowd = make();
    crowd.step(0.1, { x: 0, y: mesh.y + 301 });
    expect(crowd.atMesh).toBeNull();
    crowd.step(0.1, { x: 0, y: mesh.y + 299 });
    expect(crowd.atMesh).not.toBeNull();
  });
});

describe('the shoal passing the gate', () => {
  // A gate at the top, its water leaning down and to the left: the tide runs right to left.
  const plume: Plume = { from: { x: 5000, y: 400 }, to: { x: 4000, y: 900 }, width: 400 };
  const gate = { x: 5000, y: 340 };
  const tuning: GateMomentTuning = {
    start: 300,
    reach: 2000,
    atMesh: { out: 100, aside: 150 },
    short: 200,
    pull: 6,
  };
  const outside = { x: 7000, y: 1500 };
  const inWater = { x: 5000, y: 500 };
  const run = (moment: GateMoment, seconds: number, player: { x: number; y: number }) => {
    for (let time = 0; time < seconds; time += 0.1) moment.step(0.1, player);
  };

  it('waits for the player to taste the pond water', () => {
    const moment = new GateMoment(plume, gate, tuning);
    run(moment, 10, outside);
    expect(moment.stage).toBe('before');
    expect(moment.goalFor('brise', outside)).toBeNull();
    moment.step(0.1, inWater);
    expect(moment.stage).toBe('at');
  });

  it('begins too for a player who comes up to the gate beside its water', () => {
    const moment = new GateMoment(plume, gate, tuning);
    const beside = { x: 5280, y: 380 };
    expect(inPlume(plume, beside.x, beside.y)).toBe(false);
    moment.step(0.1, beside);
    expect(moment.stage).toBe('at');
  });

  it('sends Brise to the mesh, upstream of its middle, and stops Nacre short of the water', () => {
    const moment = new GateMoment(plume, gate, tuning);
    moment.step(0.1, inWater);
    const brise = moment.goalFor('brise', { x: 6000, y: 1200 });
    expect(brise).toEqual({ x: 5150, y: 440 });
    const nacre = moment.goalFor('nacre', { x: 6000, y: 1200 });
    expect(nacre).not.toBeNull();
    if (!nacre) return;
    expect(inPlume(plume, nacre.x, nacre.y)).toBe(false);
    expect(nacre.y).toBeGreaterThan(plume.from.y);
    expect(moment.goalFor('ecume', { x: 6000, y: 1200 })).toBeNull();
    // Too far from the gate, a companion keeps to the shoal's way.
    expect(moment.goalFor('brise', { x: 9000, y: 1200 })).toBeNull();
  });

  it('lasts while the player stays in the water, then the tide pulls, once', () => {
    const moment = new GateMoment(plume, gate, tuning);
    run(moment, 30, inWater);
    expect(moment.stage).toBe('at');
    run(moment, 5, outside);
    expect(moment.stage).toBe('at');
    run(moment, 1.2, outside);
    expect(moment.stage).toBe('after');
    expect(moment.goalFor('brise', { x: 6000, y: 1200 })).toBeNull();
    run(moment, 5, inWater);
    expect(moment.stage).toBe('after');
  });

  it('after the greeting through the mesh, the tide pulls even if the player stays', () => {
    const moment = new GateMoment(plume, gate, tuning);
    moment.step(0.1, inWater);
    moment.greetedAtMesh();
    run(moment, 5, inWater);
    expect(moment.stage).toBe('at');
    run(moment, 1.2, inWater);
    expect(moment.stage).toBe('after');
  });

  it('turns round with the coast: Brise still waits upstream of the mesh', () => {
    const turned: Plume = { from: { x: 7000, y: 400 }, to: { x: 8000, y: 900 }, width: 400 };
    const moment = new GateMoment(turned, { x: 7000, y: 340 }, tuning);
    moment.step(0.1, { x: 7000, y: 500 });
    expect(moment.goalFor('brise', { x: 6000, y: 1200 })?.x).toBe(6850);
    const nacre = moment.goalFor('nacre', { x: 6000, y: 1200 });
    expect(nacre && inPlume(turned, nacre.x, nacre.y)).toBe(false);
  });
});
