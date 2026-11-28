import { describe, expect, it } from 'vitest';
import { Crowd, type CrowdTuning } from '../../src/core/pond/crowd';
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
