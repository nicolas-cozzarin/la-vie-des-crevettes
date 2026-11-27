import type { AreaDef, CoverDef, ObstacleDef, WallDef } from './types';

/**
 * Chapter 3. The channel: deep water between rock walls, at night, the tide
 * running from right to left and carrying everything with it. The map, the
 * zones and what happens in each are in docs/11-world-catalogue.md.
 *
 * The player comes in from the lagoon's pass on the right and leaves over
 * the bar on the left. One body length here is 140 pixels. The walls close
 * in to 1200 pixels at the narrows (zone C).
 */

/** Pixels per second for a current given in body lengths per second (doc 11). */
const BL = 140;
const tide = (blPerSecond: number): number => -blPerSecond * BL;

/** The walls' depth: the usual, and at the narrows. */
const WIDE = 320;
const NARROW = 700;

/** One stretch of wall along the top and the same along the bottom. */
function both(from: number, to: number, depth: number): WallDef[] {
  return (['top', 'bottom'] as const).map((side) => ({
    image: 'channel.wall',
    side,
    from,
    to,
    depth,
  }));
}

function boulder(x: number, y: number, r: number, which: 'a' | 'b', rotation = 0): ObstacleDef {
  return { shape: 'circle', x, y, r, image: `channel.boulder.${which}`, rotation };
}

/** A crevice: a dark slot just wider than a shrimp, its long side along the picture's width. */
function crevice(id: string, x: number, y: number, rotation = 0): CoverDef {
  return { id, kind: 'crevice', x, y, r: 95, image: 'channel.crevice', width: 300, rotation };
}

export const channel: AreaDef = {
  id: 'channel',
  size: { w: 12000, h: 2600 },
  bodyLengthPx: BL,
  ground: 'channel.bed',
  groundPatches: [
    // Zone F: the bar, a shallow bank of paler sand.
    { image: 'lagoon.bed', zone: { x: 500, y: 700, w: 2000, h: 1200 }, feather: 500 },
  ],
  spawn: { x: 11500, y: 1300, heading: Math.PI },
  light: { dapple: 'light.moon', dappleStrength: 0.7, murk: 'channel.murk' },
  threats: ['fish'],
  music: 'music.channel',
  ambience: 'amb.channel',

  walls: [
    ...both(0, 6500, WIDE),
    // Zone C: the narrows.
    ...both(6500, 8500, NARROW),
    ...both(8500, 12000, WIDE),
    // Right: rock either side of the lagoon's pass.
    { image: 'channel.wall', side: 'right', from: 0, to: 950, depth: 240 },
    { image: 'channel.wall', side: 'right', from: 1650, to: 2600, depth: 240 },
  ],

  obstacles: [
    // Where the walls step in and out at the narrows.
    boulder(6500, 420, 290, 'a', 0.2),
    boulder(6500, 2180, 290, 'b', -0.3),
    boulder(8500, 420, 290, 'b', 0.4),
    boulder(8500, 2180, 290, 'a', -0.1),
    // The ends of the rock by the pass.
    boulder(11880, 960, 170, 'a', 0.3),
    boulder(11880, 1640, 170, 'b', -0.2),
    // Zone E, the boulder field: big rocks to weave between, at least two body lengths apart.
    boulder(2700, 850, 240, 'a'),
    boulder(2850, 1850, 260, 'b', 0.3),
    boulder(3350, 1300, 220, 'b', -0.2),
    boulder(3850, 650, 230, 'a', 0.4),
    boulder(3950, 1900, 250, 'a', -0.3),
    boulder(4350, 1250, 200, 'b', 0.1),
    // Zone D, the pool: a few rocks with film on them.
    boulder(5150, 1750, 170, 'b', 0.2),
    boulder(5900, 900, 180, 'a', -0.1),
    // Zone F: one rock on the bar.
    boulder(1500, 1950, 170, 'b', 0.3),
  ],

  cover: [
    // Zone C: crevices in both walls, where the fish cannot follow.
    crevice('crevice.c1', 6900, 760),
    crevice('crevice.c2', 7650, 1840),
    crevice('crevice.c3', 8150, 760),
    // Zone E: crevices between the boulders.
    crevice('crevice.e1', 3030, 1080, 0.5),
    crevice('crevice.e2', 3600, 1830, -0.2),
    crevice('crevice.e3', 4120, 950, -0.6),
  ],

  food: [
    // Zone D: film on the pool's rocks.
    { id: 'film.pool.1', kind: 'algaeFilm', x: 5320, y: 1600, size: 240, rotation: 0.4 },
    { id: 'film.pool.2', kind: 'algaeFilm', x: 5760, y: 1080, size: 260, rotation: -0.3 },
    { id: 'film.pool.3', kind: 'algaeFilm', x: 6200, y: 1500, size: 220, rotation: 1.1 },
  ],

  landmarks: [
    // Sea fans on the walls, growing out into the water (their foot is at the picture's left).
    {
      id: 'fan.1',
      image: 'channel.seaFan',
      x: 1600,
      y: 420,
      width: 260,
      rotation: Math.PI / 2,
      layer: 'ground',
    },
    {
      id: 'fan.2',
      image: 'channel.seaFan',
      x: 3100,
      y: 2180,
      width: 240,
      rotation: -Math.PI / 2,
      layer: 'ground',
    },
    {
      id: 'fan.3',
      image: 'channel.seaFan',
      x: 9700,
      y: 420,
      width: 260,
      rotation: Math.PI / 2,
      layer: 'ground',
    },
    {
      id: 'fan.4',
      image: 'channel.seaFan',
      x: 10400,
      y: 2180,
      width: 240,
      rotation: -Math.PI / 2,
      layer: 'ground',
    },
  ],

  shrimp: [
    // Zone A: the shoal collecting, ready to go with the tide.
    { id: 'nacre', who: 'nacre', x: 11200, y: 1150, heading: Math.PI },
    { id: 'brise', who: 'brise', x: 10950, y: 1450, heading: Math.PI },
    { id: 'ecume', who: 'ecume', x: 11050, y: 1700, heading: 3.0 },
    { id: 'young.1', who: 'young', x: 10800, y: 1000, heading: 3.3 },
    { id: 'young.2', who: 'young', x: 10700, y: 1600, heading: 2.9 },
    { id: 'young.3', who: 'young', x: 11300, y: 1850, heading: 3.1 },
  ],

  // Zone B: clumps of seaweed riding the tide, coming in from the gathering.
  drifting: [
    {
      id: 'seaweed.b',
      kind: 'seaweed',
      run: { x: 8500, y: 500, w: 2300, h: 1600 },
      count: 9,
      size: 280,
    },
  ],

  currents: [
    // The tide, zone by zone (doc 11): slow where it gathers, fast in the narrows.
    { zone: { x: 10500, y: 0, w: 1500, h: 2600 }, vx: tide(0.3), vy: 0 },
    { zone: { x: 8500, y: 0, w: 2000, h: 2600 }, vx: tide(1), vy: 0 },
    { zone: { x: 6500, y: 0, w: 2000, h: 2600 }, vx: tide(2), vy: 0 },
    { zone: { x: 4500, y: 0, w: 2000, h: 2600 }, vx: tide(0.5), vy: 0 },
    { zone: { x: 2500, y: 0, w: 2000, h: 2600 }, vx: tide(1.5), vy: 0 },
    { zone: { x: 0, y: 0, w: 2500, h: 2600 }, vx: tide(1), vy: 0 },
  ],

  zones: [
    { id: 'A', zone: { x: 10500, y: 0, w: 1500, h: 2600 } },
    { id: 'B', zone: { x: 8500, y: 0, w: 2000, h: 2600 } },
    { id: 'C', zone: { x: 6500, y: 0, w: 2000, h: 2600 } },
    { id: 'D', zone: { x: 4500, y: 0, w: 2000, h: 2600 } },
    { id: 'E', zone: { x: 2500, y: 0, w: 2000, h: 2600 } },
    { id: 'F', zone: { x: 500, y: 0, w: 2000, h: 2600 } },
  ],

  // Over the bar to the open bed outside, once the fish has been escaped twice.
  exits: [{ to: 'shadow', zone: { x: 0, y: 0, w: 90, h: 2600 }, needsStep: 's3.fish2' }],

  scatter: [],
};
