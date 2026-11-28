import { waste } from '../waste';
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
/** The shrimp is 12 cm long here (doc 11, "Scale"). */
const PX_PER_CM = BL / 12;
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
    { image: 'channel.wall', side: 'top', from: 0, to: 4500, depth: WIDE },
    // Zone D: along the pool's top edge, the bank of a farm pond (D39).
    { image: 'pond.wall', side: 'top', from: 4500, to: 6500, depth: WIDE },
    { image: 'channel.wall', side: 'bottom', from: 0, to: 6500, depth: WIDE },
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
    // Where the rock gives way to the pond's bank.
    boulder(4500, 330, 260, 'a', -0.4),
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

  // The pond's gate stands out from its bank a little (D39).
  blocks: [{ shape: 'rect', x: 5390, y: 0, w: 420, h: 360 }],

  // Through the gate's mesh, the pond: its water comes out into the pool and
  // the tide bends it downstream (doc 18, "Level 3").
  pond: {
    gate: { x: 5600, y: 340, width: 420 },
    plume: { from: { x: 5600, y: 420 }, to: { x: 4350, y: 960 }, width: 420 },
    crowd: 14,
  },

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
    // Litter along both sides, half of it within 10 BL of the pond's gate (D43).
    waste('waste.1', 'pipe', 5080, 540, PX_PER_CM, 0.35),
    waste('waste.2', 'sack', 4600, 2050, PX_PER_CM, 0.3),
    waste('waste.3', 'bottle', 6050, 470, PX_PER_CM, -0.5),
    waste('waste.4', 'bag', 4800, 1400, PX_PER_CM, -0.3),
    waste('waste.5', 'bottle', 6600, 1150, PX_PER_CM, 0.2),
    waste('waste.6', 'foam', 5200, 1250, PX_PER_CM),
    waste('waste.7', 'bottle', 4650, 640, PX_PER_CM, -0.3),
    waste('waste.8', 'bag', 6280, 920, PX_PER_CM, 0.4),
    waste('waste.9', 'bottle', 5500, 720, PX_PER_CM, 0.1),
    waste('waste.10', 'foam', 6180, 640, PX_PER_CM, 0.5),
    waste('waste.11', 'bottle', 9200, 520, PX_PER_CM, 0.3),
    waste('waste.12', 'bag', 9900, 2080, PX_PER_CM, -0.4),
    waste('waste.13', 'foam', 8900, 2120, PX_PER_CM, 0.2),
    waste('waste.14', 'bottle', 7400, 830, PX_PER_CM, -0.2),
    waste('waste.15', 'sack', 7050, 1640, PX_PER_CM, 0.15),
    waste('waste.16', 'bag', 3300, 520, PX_PER_CM, 0.3),
    waste('waste.17', 'bottle', 3500, 2150, PX_PER_CM, -0.4),
    waste('waste.18', 'sandal', 1900, 600, PX_PER_CM, 0.4),
    waste('waste.19', 'bag', 1000, 2120, PX_PER_CM, -0.2),
    waste('waste.20', 'foam', 2300, 2150, PX_PER_CM, 0.1),
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

  // The shoal's way to the sea: down the middle, through the narrows and the
  // pool, round the boulders, over the bar (T113).
  journey: [
    { x: 11500, y: 1300 },
    { x: 4800, y: 1450 },
    { x: 4150, y: 1600 },
    { x: 3100, y: 1600 },
    { x: 2300, y: 1300 },
    { x: 600, y: 1300 },
  ],
  // Other shoals on their way to the sea pass through, strangers (doc 11; T114).
  travellers: true,

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

  // The fish follows the shoal down: the first time in the narrows, the second
  // among the boulders (doc 11). A `fish.` trigger calls it from upstream.
  triggers: [
    { id: 'fish.first', zone: { x: 6500, y: 0, w: 2000, h: 2600 }, once: true },
    { id: 'fish.second', zone: { x: 2500, y: 0, w: 2000, h: 2600 }, once: true },
  ],

  // Over the bar to the open bed outside, once the fish has been escaped twice.
  exits: [{ to: 'shadow', zone: { x: 0, y: 0, w: 90, h: 2600 }, needsStep: 's3.fish2' }],

  scatter: [],
};
