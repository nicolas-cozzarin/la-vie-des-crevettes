import { waste } from '../waste';
import type { AreaDef, CoverDef, ObstacleDef } from './types';

/**
 * Chapter 4. The shadow: the open bed just outside the bar, where the
 * channel's water spreads out. The channel's colours, drained. Five rock
 * outcrops, each with one crevice, are the only shelter. The map and what
 * happens here are in docs/11-world-catalogue.md; the net in doc 10.
 *
 * The player comes in over the bar on the right and goes on to the open sea
 * on the left. One body length here is 140 pixels, as in the channel.
 */

const BL = 140;
/** The shrimp is 12 cm long here (doc 11, "Scale"). */
const PX_PER_CM = BL / 12;

/**
 * A rock outcrop about 4 BL across (doc 11, `shadow.outcrop`): two rocks with
 * a crevice between them, and a smaller rock closing one end of it. `turn`
 * turns the crevice, a little, since its light is painted in.
 */
function outcrop(
  id: string,
  x: number,
  y: number,
  turn: number,
): { obstacles: ObstacleDef[]; cover: CoverDef } {
  const along = { x: Math.cos(turn), y: Math.sin(turn) };
  const across = { x: -along.y, y: along.x };
  const at = (a: number, b: number) => ({
    x: Math.round(x + along.x * a + across.x * b),
    y: Math.round(y + along.y * a + across.y * b),
  });
  const rock = (a: number, b: number, r: number, which: 'a' | 'b', rotation: number) => ({
    shape: 'circle' as const,
    ...at(a, b),
    r,
    image: `channel.boulder.${which}`,
    rotation,
  });
  return {
    obstacles: [
      rock(10, -190, 125, 'a', turn),
      rock(-20, 185, 120, 'b', -turn),
      rock(-250, 20, 80, 'b', turn * 0.5),
    ],
    cover: {
      id,
      kind: 'crevice',
      x,
      y,
      r: 95,
      image: 'channel.crevice',
      width: 300,
      rotation: turn,
    },
  };
}

/**
 * The outcrops, in two rows either side of the way through, none more than
 * 7 BL of open bed from the next.
 */
const OUTCROPS = [
  outcrop('crevice.1', 1550, 2100, 0.3),
  outcrop('crevice.2', 2625, 1100, -0.4),
  outcrop('crevice.3', 3700, 2100, 0.2),
  outcrop('crevice.4', 4775, 1100, 0.5),
  outcrop('crevice.5', 5850, 2100, -0.3),
];

export const shadow: AreaDef = {
  id: 'shadow',
  size: { w: 7000, h: 3200 },
  bodyLengthPx: BL,
  ground: 'channel.bed',
  groundPatches: [
    // On the right, the foot of the bar the player comes over: paler sand.
    { image: 'lagoon.bed', zone: { x: 5900, y: 500, w: 1100, h: 2200 }, feather: 500 },
  ],
  spawn: { x: 6750, y: 1600, heading: Math.PI },
  // The channel's moonlight and murk, with the colour drained out of the water (doc 04).
  light: { dapple: 'light.moon', dappleStrength: 0.55, murk: 'channel.murk', drain: 0.6 },

  obstacles: OUTCROPS.flatMap((one) => one.obstacles),
  cover: OUTCROPS.map((one) => one.cover),

  food: [
    // A little film on the rocks' lee, nothing more: the bed is bare.
    { id: 'film.1', kind: 'algaeFilm', x: 2330, y: 1330, size: 200, rotation: 0.6 },
    { id: 'film.2', kind: 'algaeFilm', x: 3980, y: 1880, size: 220, rotation: -0.4 },
    { id: 'film.3', kind: 'algaeFilm', x: 5080, y: 1330, size: 200, rotation: 1.2 },
  ],

  // Litter caught along the bottom where the net passes (doc 11, "Litter").
  landmarks: [
    waste('waste.1', 'rope', 3150, 1520, PX_PER_CM, 0.3),
    waste('waste.2', 'bottle', 4350, 1560, PX_PER_CM, -0.4),
    waste('waste.3', 'bag', 1950, 1650, PX_PER_CM, 0.2),
    waste('waste.4', 'foam', 5250, 1650, PX_PER_CM),
  ],

  shrimp: [
    // The shoal comes over the bar with the player.
    { id: 'nacre', who: 'nacre', x: 6450, y: 1450, heading: Math.PI },
    { id: 'brise', who: 'brise', x: 6350, y: 1700, heading: Math.PI },
    { id: 'ecume', who: 'ecume', x: 6550, y: 1850, heading: 3.0 },
    { id: 'young.1', who: 'young', x: 6250, y: 1350, heading: 3.3 },
    { id: 'young.2', who: 'young', x: 6150, y: 1650, heading: 2.9 },
    { id: 'young.3', who: 'young', x: 6600, y: 1250, heading: 3.1 },
  ],

  // The shoal's way on, between the rows of rock, toward the open sea (T113).
  journey: [
    { x: 6750, y: 1600 },
    { x: 600, y: 1600 },
  ],

  // The net comes once, a little way in from the bar (doc 10, "The net"; T120).
  threats: ['net'],
  triggers: [{ id: 'net', zone: { x: 4600, y: 0, w: 1300, h: 3200 }, once: true }],

  zones: [
    // Where the shoal is found again, after the net.
    { id: 'after', zone: { x: 0, y: 0, w: 1500, h: 3200 } },
  ],

  // To the open sea, once the shoal is found again.
  exits: [{ to: 'openSea', zone: { x: 0, y: 0, w: 90, h: 3200 }, needsStep: 's4.shoal' }],

  scatter: [],
};
