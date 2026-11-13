import { describe, expect, it } from 'vitest';
import { moveCircle, resolveCircle, type Obstacle } from '../../src/core/movement/collision';

const rock: Obstacle = { shape: 'circle', x: 100, y: 100, r: 50 };
const slab: Obstacle = { shape: 'rect', x: 200, y: 200, w: 100, h: 40 };

describe('resolveCircle', () => {
  it('leaves a circle alone when it touches nothing', () => {
    expect(resolveCircle(300, 100, 10, [rock, slab])).toEqual({ x: 300, y: 100 });
  });

  it('pushes a circle out of a round rock along the line between centres', () => {
    const point = resolveCircle(140, 100, 10, [rock]);
    expect(point.x).toBeCloseTo(160);
    expect(point.y).toBeCloseTo(100);
  });

  it('copes with a circle exactly on the centre of a rock', () => {
    const point = resolveCircle(100, 100, 10, [rock]);
    expect(Math.hypot(point.x - 100, point.y - 100)).toBeCloseTo(60);
  });

  it('pushes a circle off the side of a rectangle', () => {
    const point = resolveCircle(250, 195, 10, [slab]);
    expect(point.x).toBeCloseTo(250);
    expect(point.y).toBeCloseTo(190);
  });

  it('pushes a circle off the corner of a rectangle', () => {
    const point = resolveCircle(197, 197, 10, [slab]);
    expect(Math.hypot(point.x - 200, point.y - 200)).toBeCloseTo(10);
    expect(point.x).toBeLessThan(200);
    expect(point.y).toBeLessThan(200);
  });

  it('gets a circle out when its centre is inside a rectangle', () => {
    const point = resolveCircle(250, 205, 10, [slab]);
    expect(point).toEqual({ x: 250, y: 190 });
  });

  it('keeps a circle inside the bounds', () => {
    const bounds = { x: 0, y: 0, w: 500, h: 400 };
    expect(resolveCircle(-20, 390, 10, [], bounds)).toEqual({ x: 10, y: 390 });
    expect(resolveCircle(495, 600, 10, [], bounds)).toEqual({ x: 490, y: 390 });
  });
});

describe('moveCircle', () => {
  it('moves freely in open water', () => {
    expect(moveCircle(0, 0, 30, 40, 10, [])).toEqual({ x: 30, y: 40 });
  });

  it('stops at a rock met head on', () => {
    const point = moveCircle(0, 100, 200, 0, 10, [rock]);
    expect(point.x).toBeLessThanOrEqual(40.001);
    expect(Math.hypot(point.x - 100, point.y - 100)).toBeGreaterThanOrEqual(59.999);
  });

  it('slides round a rock met off centre', () => {
    const point = moveCircle(0, 70, 300, 0, 10, [rock]);
    expect(point.x).toBeGreaterThan(100);
    expect(Math.hypot(point.x - 100, point.y - 100)).toBeGreaterThanOrEqual(59.999);
  });

  it('does not jump through a thin slab in one long step', () => {
    const thin: Obstacle = { shape: 'rect', x: 100, y: -200, w: 6, h: 400 };
    const point = moveCircle(0, 0, 400, 0, 10, [thin]);
    expect(point.x).toBeLessThanOrEqual(90.001);
  });

  it('slides along a wall', () => {
    const wall: Obstacle = { shape: 'rect', x: 0, y: 50, w: 400, h: 20 };
    const point = moveCircle(20, 30, 100, 100, 10, [wall]);
    expect(point.y).toBeCloseTo(40);
    expect(point.x).toBeCloseTo(120);
  });
});
