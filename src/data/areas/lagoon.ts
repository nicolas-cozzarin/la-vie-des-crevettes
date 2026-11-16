import type { AreaDef, CoverDef, FoodDef } from './types';

/**
 * Chapter 2. The lagoon: open, bright by day, golden at dusk, glowing at
 * night. The map, the zones and what happens in each are in
 * docs/11-world-catalogue.md. The edges are T47 in docs/09-decisions.md.
 *
 * The sea is to the left. The player comes in from the mangrove's creek on
 * the right and leaves by the pass on the left. One body length here is 124
 * pixels.
 */

/** A clump of seagrass: cover, drawn 2r / 0.8 wide. Clump `a` can carry fuzz. */
function clump(
  id: string,
  image: 'a' | 'b' | 'c',
  x: number,
  y: number,
  r: number,
  rotation = 0,
): CoverDef {
  return { id, kind: 'seagrass', x, y, r, image: `lagoon.seagrass.${image}`, rotation };
}

/** The fuzz painted for clump `a`, laid over it at the same size and turn. */
function fuzz(id: string, of: CoverDef): FoodDef {
  return {
    id,
    kind: 'seagrassFuzz',
    x: of.x,
    y: of.y,
    size: (2 * of.r) / 0.8,
    rotation: of.rotation ?? 0,
  };
}

const meadow: CoverDef[] = [
  // Zone C. Close together, all bent the same way by the water. Gaps of
  // about one to two body lengths between them.
  clump('grass.1', 'a', 2850, 620, 230, 0.1),
  clump('grass.2', 'b', 3420, 560, 210, -0.1),
  clump('grass.3', 'c', 3980, 640, 240, 0.05),
  clump('grass.4', 'a', 4560, 560, 220, -0.05),
  clump('grass.5', 'b', 5140, 640, 230, 0.12),
  clump('grass.6', 'c', 5720, 580, 220, 0),
  clump('grass.7', 'a', 6260, 680, 210, -0.1),
  clump('grass.8', 'c', 3120, 1100, 220, 0.15),
  clump('grass.9', 'a', 3700, 1160, 240, -0.08),
  clump('grass.10', 'b', 4880, 1120, 230, 0.06),
  clump('grass.11', 'a', 5460, 1180, 220, 0.1),
  clump('grass.12', 'c', 6060, 1160, 230, -0.12),
  clump('grass.13', 'b', 2800, 1520, 200, 0),
  clump('grass.14', 'a', 4300, 1500, 210, 0.08),
  clump('grass.15', 'c', 5800, 1560, 200, -0.06),
];

const byId = (id: string): CoverDef => meadow.find((cover) => cover.id === id) as CoverDef;

export const lagoon: AreaDef = {
  id: 'lagoon',
  size: { w: 8000, h: 5000 },
  bodyLengthPx: 124,
  ground: 'ground.sand',
  groundPatches: [
    // Zone A: muddy sand where the creek opens.
    { image: 'mangrove.sandmud', zone: { x: 6800, y: 1500, w: 1600, h: 2300 }, feather: 380 },
  ],
  spawn: { x: 7600, y: 2650, heading: Math.PI },
  light: { dapple: 'light.caustics', dappleStrength: 0.55 },
  dayCycle: true,
  music: 'music.lagoon',
  ambience: 'amb.lagoon',

  walls: [
    // Top: a beach, from one side to the other.
    { image: 'lagoon.shore', side: 'top', from: 0, to: 8000, depth: 280 },
    // Right: the mangrove's edge, open between y 1800 and 3500, where the creek comes in.
    { image: 'mangrove.wall', side: 'right', from: 0, to: 1800, depth: 220 },
    { image: 'mangrove.wall', side: 'right', from: 3500, to: 5000, depth: 220 },
    // Bottom: worn rock under the weed bank and the rock garden, then beach under the shallows.
    { image: 'lagoon.reef', side: 'bottom', from: 0, to: 5200, depth: 240 },
    { image: 'lagoon.shore', side: 'bottom', from: 5200, to: 8000, depth: 260 },
    // Left: rock, open between y 1900 and 3800, the pass.
    { image: 'lagoon.reef', side: 'left', from: 0, to: 1900, depth: 240 },
    { image: 'lagoon.reef', side: 'left', from: 3800, to: 5000, depth: 240 },
  ],

  obstacles: [
    // The ends of the edge strips.
    { shape: 'circle', x: 7880, y: 1790, r: 230, image: 'mangrove.clump' },
    { shape: 'circle', x: 7870, y: 3510, r: 230, image: 'mangrove.clump', rotation: 0.4 },
    { shape: 'circle', x: 5200, y: 4870, r: 170, image: 'rock.c', rotation: 0.2 },
    { shape: 'circle', x: 120, y: 1900, r: 190, image: 'rock.c', rotation: -0.2 },
    { shape: 'circle', x: 120, y: 3800, r: 190, image: 'rock.a', rotation: 0.3 },
    // Zone H, the north-west rocks: boulders with crevices between them.
    { shape: 'circle', x: 420, y: 560, r: 160, image: 'rock.c' },
    { shape: 'circle', x: 820, y: 470, r: 120, image: 'rock.a', rotation: 0.3 },
    { shape: 'circle', x: 700, y: 900, r: 125, image: 'rock.b', rotation: -0.2 },
    { shape: 'circle', x: 1220, y: 650, r: 175, image: 'rock.c', rotation: 0.4 },
    { shape: 'circle', x: 1640, y: 470, r: 115, image: 'rock.b' },
    { shape: 'circle', x: 1600, y: 950, r: 140, image: 'rock.a', rotation: -0.35 },
    { shape: 'circle', x: 2050, y: 720, r: 160, image: 'rock.c', rotation: 0.1 },
    { shape: 'circle', x: 1100, y: 1180, r: 150, image: 'rock.a', rotation: 0.2 },
    { shape: 'circle', x: 480, y: 1330, r: 130, image: 'rock.b', rotation: 0.45 },
    { shape: 'circle', x: 1750, y: 1400, r: 120, image: 'rock.b', rotation: -0.1 },
    // Zone D, the rock garden: rounded rocks with film on them.
    { shape: 'circle', x: 2950, y: 4250, r: 130, image: 'rock.a' },
    { shape: 'circle', x: 2900, y: 4620, r: 100, image: 'rock.b', rotation: 0.3 },
    { shape: 'circle', x: 3350, y: 4500, r: 160, image: 'rock.c', rotation: -0.25 },
    { shape: 'circle', x: 3800, y: 4180, r: 110, image: 'rock.b', rotation: 0.15 },
    { shape: 'circle', x: 4420, y: 4300, r: 140, image: 'rock.a', rotation: -0.4 },
    { shape: 'circle', x: 4750, y: 4580, r: 120, image: 'rock.c', rotation: 0.35 },
    // Zone G, the pass: a few rocks where the sand starts to slope.
    { shape: 'circle', x: 1500, y: 2150, r: 110, image: 'rock.b', rotation: 0.2 },
    { shape: 'circle', x: 2300, y: 3500, r: 130, image: 'rock.a', rotation: -0.3 },
  ],

  cover: [
    ...meadow,
    // Zone D: the overhang, 4 BL across.
    {
      id: 'overhang',
      kind: 'overhang',
      x: 4020,
      y: 4560,
      r: 190,
      image: 'rock.overhang',
      width: 496,
    },
    // Zone H: the gaps between the boulders. The rocks draw them.
    { id: 'crevice.1', kind: 'crevice', x: 640, y: 560, r: 80 },
    { id: 'crevice.2', kind: 'crevice', x: 1020, y: 560, r: 80 },
    { id: 'crevice.3', kind: 'crevice', x: 1420, y: 820, r: 90 },
  ],

  food: [
    // Zone C: fuzz on the older blades of some clumps.
    fuzz('fuzz.1', byId('grass.1')),
    fuzz('fuzz.4', byId('grass.4')),
    fuzz('fuzz.9', byId('grass.9')),
    fuzz('fuzz.11', byId('grass.11')),
    // Zone B, the flat: golden film in patches.
    { id: 'gold.flat.1', kind: 'sandFilm', x: 5400, y: 2700, size: 320 },
    { id: 'gold.flat.2', kind: 'sandFilm', x: 6200, y: 2450, size: 290, rotation: 1.2 },
    { id: 'gold.flat.3', kind: 'sandFilm', x: 6000, y: 3300, size: 300, rotation: 2.4 },
    { id: 'gold.flat.4', kind: 'sandFilm', x: 5000, y: 3250, size: 280, rotation: 0.6 },
    // Zone E, the shoal's ground.
    { id: 'gold.shoal', kind: 'sandFilm', x: 3950, y: 2750, size: 300, rotation: 3.4 },
    // Zone F, the bright shallows.
    { id: 'gold.shallows.1', kind: 'sandFilm', x: 5700, y: 4300, size: 300, rotation: 0.9 },
    { id: 'gold.shallows.2', kind: 'sandFilm', x: 6500, y: 4450, size: 280, rotation: 2.0 },
    { id: 'gold.shallows.3', kind: 'sandFilm', x: 7250, y: 4200, size: 300 },
    // Zone D: film on the sand between the rocks.
    { id: 'film.garden.1', kind: 'algaeFilm', x: 3150, y: 4180, size: 200, rotation: 1.1 },
    { id: 'film.garden.2', kind: 'algaeFilm', x: 4100, y: 4180, size: 190, rotation: 2.6 },
    // Zone A: leaves washed out of the creek.
    { id: 'leaf.apron.1', kind: 'mangroveLeaf', x: 7250, y: 2250, size: 380, rotation: 0.7 },
    { id: 'leaf.apron.2', kind: 'mangroveLeaf', x: 7450, y: 3150, size: 360, rotation: -1.6 },
  ],

  landmarks: [
    // Zone B: sand mounds. Something lives under each and is never seen.
    {
      id: 'mound.1',
      image: 'thing.sandVolcano',
      x: 5150,
      y: 2250,
      width: 80,
      layer: 'ground',
      discovery: 'thing.sandVolcano',
    },
    {
      id: 'mound.2',
      image: 'thing.sandVolcano',
      x: 5950,
      y: 2950,
      width: 72,
      layer: 'ground',
      discovery: 'thing.sandVolcano',
    },
    {
      id: 'mound.3',
      image: 'thing.sandVolcano',
      x: 6550,
      y: 2150,
      width: 76,
      layer: 'ground',
      discovery: 'thing.sandVolcano',
    },
    {
      id: 'mound.4',
      image: 'thing.sandVolcano',
      x: 5550,
      y: 3500,
      width: 80,
      layer: 'ground',
      discovery: 'thing.sandVolcano',
    },
    {
      id: 'mound.5',
      image: 'thing.sandVolcano',
      x: 4950,
      y: 2850,
      width: 70,
      layer: 'ground',
      discovery: 'thing.sandVolcano',
    },
    // Zone D: the mouth of the pistol shrimp's burrow, at the garden's sandy edge.
    { id: 'burrow.pistol', image: 'burrow.mouth', x: 3520, y: 3990, width: 90, layer: 'ground' },
    // Zone H: the sea star, on the sand among the rocks.
    {
      id: 'seaStar',
      image: 'seaStar',
      x: 1380,
      y: 1560,
      width: 186,
      rotation: 0.3,
      layer: 'ground',
      discovery: 'creature.seaStar',
    },
  ],

  creatures: [
    // Zone C: the turtle grazes on a slow loop through the meadow.
    { id: 'turtle', kind: 'turtle', x: 4620, y: 900, heading: Math.PI },
    { id: 'fish.meadow.1', kind: 'smallFish', x: 3500, y: 850, heading: Math.PI, count: 24 },
    { id: 'fish.meadow.2', kind: 'smallFish', x: 5400, y: 1300, heading: 0.2, count: 20 },
    // Zone D.
    { id: 'pistolAndGoby', kind: 'pistolAndGoby', x: 3520, y: 3990, heading: -Math.PI / 2 },
    // Zone G: where the fish comes from at dawn. Not in the water until then.
    { id: 'huntingFish', kind: 'huntingFish', x: 900, y: 2850, heading: 0 },
  ],

  shrimp: [
    // Zone E: the shoal rests here by day. Brise and Écume are met here.
    { id: 'brise', who: 'brise', x: 3700, y: 2450, heading: 0.4 },
    { id: 'ecume', who: 'ecume', x: 4150, y: 3050, heading: -2.2 },
    { id: 'young.1', who: 'young', x: 3500, y: 2950, heading: 1.2 },
    { id: 'young.2', who: 'young', x: 3950, y: 2200, heading: -0.6 },
    { id: 'young.3', who: 'young', x: 4350, y: 2600, heading: 2.8 },
    { id: 'young.4', who: 'young', x: 3600, y: 3350, heading: 0.1 },
  ],

  currents: [
    // The creek's water spreads out over the apron.
    { zone: { x: 7000, y: 1950, w: 1000, h: 1400 }, vx: -8, vy: 0 },
    // Zone G: the current toward the channel begins.
    { zone: { x: 0, y: 1950, w: 2400, h: 1800 }, vx: -12, vy: 0 },
  ],

  zones: [
    { id: 'A', zone: { x: 6900, y: 1800, w: 1100, h: 1700 } },
    { id: 'B', zone: { x: 4700, y: 1800, w: 2200, h: 1900 } },
    { id: 'C', zone: { x: 2500, y: 200, w: 4000, h: 1500 }, discovery: 'place.seagrass' },
    { id: 'D', zone: { x: 2700, y: 3900, w: 2300, h: 1000 } },
    { id: 'E', zone: { x: 3300, y: 1900, w: 1300, h: 1800 } },
    { id: 'F', zone: { x: 5200, y: 3900, w: 2600, h: 1000 } },
    { id: 'G', zone: { x: 0, y: 1900, w: 3200, h: 1900 } },
    { id: 'H', zone: { x: 200, y: 200, w: 2200, h: 1500 } },
    { id: 'I', zone: { x: 200, y: 3900, w: 2400, h: 1000 } },
  ],

  exits: [{ to: 'channel', zone: { x: 0, y: 1900, w: 90, h: 1900 }, needsStep: 's2.molt' }],

  scatter: [
    {
      image: 'pebble',
      zone: { x: 0, y: 0, w: 8000, h: 5000 },
      count: 220,
      seed: 41,
      size: [14, 30],
    },
    {
      image: 'lagoon.litter.a',
      zone: { x: 0, y: 0, w: 8000, h: 5000 },
      count: 160,
      seed: 42,
      size: [40, 96],
    },
    {
      image: 'lagoon.litter.b',
      zone: { x: 0, y: 0, w: 8000, h: 5000 },
      count: 90,
      seed: 43,
      size: [24, 48],
    },
    // Zone E: a few more pebbles where the shoal rests.
    {
      image: 'pebble',
      zone: { x: 3300, y: 1900, w: 1300, h: 1800 },
      count: 60,
      seed: 44,
      size: [14, 34],
    },
    // Zone I, the weed bank: drifted blades, thick.
    {
      image: 'lagoon.litter.a',
      zone: { x: 200, y: 3900, w: 2400, h: 860 },
      count: 200,
      seed: 45,
      size: [50, 120],
    },
    // Zone A: mangrove scraps washed out of the creek.
    {
      image: 'mangrove.litter.a',
      zone: { x: 6900, y: 1800, w: 1100, h: 1700 },
      count: 60,
      seed: 46,
      size: [36, 84],
    },
  ],
};
