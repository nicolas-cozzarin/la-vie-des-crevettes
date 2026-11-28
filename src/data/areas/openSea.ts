import { waste } from '../waste';
import type { AreaDef } from './types';

/**
 * Chapter 5. The open sea: the last of the shelf on the right, and beyond it
 * the blue, deepening toward the left. No bed lies under most of it: the
 * shrimp only swims there, and its shadow fades out (T122). The map and what
 * happens here are in docs/11-world-catalogue.md.
 *
 * The player comes in from the shadow on the right. One body length here is
 * 158 pixels: the shrimp is an adult, 17 cm long.
 */

const BL = 158;
/** The shrimp is 17 cm long here (doc 11, "Scale"). */
const PX_PER_CM = BL / 17;

/** Where the litter drifts overhead, slowly, wrapping round. */
const SURFACE = { x: 2400, y: 300, w: 3200, h: 5400 };

export const openSea: AreaDef = {
  id: 'openSea',
  size: { w: 6000, h: 6000 },
  bodyLengthPx: BL,
  ground: 'sea.blue',
  // The deep: darkest toward the deepest point, fading into the blue (doc 04).
  washes: [{ image: 'sea.deep', x: 1200, y: 3000, width: 8400 }],
  // The bed lies under the shelf only, its last sand fading into the blue; beyond it is open water.
  bed: {
    zone: { x: 5050, y: 0, w: 950, h: 6000 },
    fade: 650,
    image: 'channel.bed',
    water: '#0A2E6E',
  },
  spawn: { x: 5700, y: 2300, heading: Math.PI },
  // Deep, quiet water; the eye reaches a little way. Marine snow sinks through it.
  light: { murk: 'channel.murk' },
  snow: true,

  obstacles: [],
  // The last rock of the shelf, its underside the shelter for the third molt.
  cover: [
    { id: 'ledge', kind: 'overhang', x: 5420, y: 3150, r: 150, image: 'sea.ledge', width: 640 },
  ],

  // Three pieces floating overhead, drifting slowly (doc 11, "Litter"; T53).
  landmarks: [
    {
      ...waste('waste.1', 'bag', 3900, 1400, PX_PER_CM, 0.3),
      layer: 'surface',
      drift: { x: -4, y: 2, within: SURFACE },
    },
    {
      ...waste('waste.2', 'foam', 3300, 3700, PX_PER_CM, -0.2),
      layer: 'surface',
      drift: { x: -3, y: -2, within: SURFACE },
    },
    {
      ...waste('waste.3', 'bottle', 4300, 4600, PX_PER_CM, 0.5),
      layer: 'surface',
      drift: { x: -5, y: 1, within: SURFACE },
    },
  ],

  zones: [
    { id: 'A', zone: { x: 4700, y: 0, w: 1300, h: 6000 } },
    { id: 'B', zone: { x: 2200, y: 0, w: 2500, h: 6000 } },
    { id: 'C', zone: { x: 0, y: 0, w: 2200, h: 6000 } },
    { id: 'D', zone: { x: 2400, y: 2350, w: 1600, h: 1400 } },
    // The deepest point, at (1200, 3000): found by going there (doc 12, `c5.deep`).
    {
      id: 'deepest',
      zone: { x: 1040, y: 2840, w: 320, h: 320 },
      discovery: 'place.deep',
    },
  ],

  scatter: [],
};
