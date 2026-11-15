import type { AreaDef } from './types';

/**
 * Chapter 1. The mangrove: sheltered, warm, murky. The map, the zones and
 * what happens in each are in docs/11-world-catalogue.md.
 *
 * The sea is to the left. The creek mouth on the left edge is the way in and
 * the way out. One body length here is 110 pixels.
 */
export const mangrove: AreaDef = {
  id: 'mangrove',
  size: { w: 6000, h: 4000 },
  bodyLengthPx: 110,
  ground: 'mangrove.mud',
  groundPatches: [
    // Zone A: paler, sandier mud where the creek opens.
    { image: 'mangrove.sandmud', zone: { x: -300, y: 1250, w: 1150, h: 1500 }, feather: 320 },
  ],
  spawn: { x: 620, y: 2000, heading: 0 },
  light: { dapple: 'light.dapple', dappleStrength: 0.75, murk: 'mangrove.murk' },
  dayCycle: false,
  music: 'music.mangrove',
  ambience: 'amb.mangrove',

  walls: [
    // Top: the mud bank where the crabs live, with roots closing in at both ends.
    { image: 'mangrove.wall', side: 'top', from: 0, to: 400, depth: 230 },
    { image: 'mangrove.bank', side: 'top', from: 400, to: 5000, depth: 380 },
    { image: 'mangrove.wall', side: 'top', from: 5000, to: 6000, depth: 240 },
    { image: 'mangrove.wall', side: 'right', from: 0, to: 4000, depth: 200 },
    { image: 'mangrove.wall', side: 'bottom', from: 0, to: 6000, depth: 260 },
    // Left: open between y 1300 and 2700, the creek mouth.
    { image: 'mangrove.wall', side: 'left', from: 0, to: 1300, depth: 200 },
    { image: 'mangrove.wall', side: 'left', from: 2700, to: 4000, depth: 200 },
  ],

  obstacles: [
    // Zone B, landing roots: a loose group, easy to walk between.
    { shape: 'circle', x: 1010, y: 1260, r: 70, image: 'mangrove.root.a' },
    { shape: 'circle', x: 1150, y: 1560, r: 95, image: 'mangrove.root.b', rotation: 0.4 },
    { shape: 'circle', x: 1650, y: 1500, r: 80, image: 'mangrove.root.c' },
    { shape: 'circle', x: 1900, y: 1090, r: 60, image: 'mangrove.root.a', rotation: 2.1 },
    { shape: 'circle', x: 1280, y: 2080, r: 85, image: 'mangrove.root.b', rotation: 3.3 },
    { shape: 'circle', x: 900, y: 2480, r: 75, image: 'mangrove.root.c', rotation: 1.2 },
    { shape: 'circle', x: 1750, y: 2250, r: 65, image: 'mangrove.root.a', rotation: -1.4 },
    // Zone I, the gutter.
    { shape: 'circle', x: 520, y: 2880, r: 70, image: 'mangrove.root.a', rotation: 0.9 },
    { shape: 'circle', x: 1380, y: 3420, r: 80, image: 'mangrove.root.b', rotation: -0.6 },
    // Zone C, the leaf bed: few roots, so the leaves show.
    { shape: 'circle', x: 2600, y: 3480, r: 70, image: 'mangrove.root.c', rotation: 2.6 },
    { shape: 'circle', x: 3350, y: 3050, r: 60, image: 'mangrove.root.a', rotation: -2.2 },
    // Rim of the clearing, zone D. Nothing stands inside it.
    { shape: 'circle', x: 2760, y: 1230, r: 60, image: 'mangrove.root.a', rotation: 0.3 },
    { shape: 'circle', x: 3980, y: 2440, r: 70, image: 'mangrove.root.c', rotation: 1.9 },
    { shape: 'circle', x: 3900, y: 1180, r: 65, image: 'mangrove.root.b', rotation: -1.1 },
    // Zone F, the shallows under the crab flat.
    { shape: 'circle', x: 1800, y: 760, r: 60, image: 'mangrove.root.a', rotation: -0.5 },
    { shape: 'circle', x: 3550, y: 700, r: 70, image: 'mangrove.root.b', rotation: 2.9 },
    { shape: 'circle', x: 2700, y: 620, r: 55, image: 'mangrove.root.c', rotation: 0.8 },
    // Zone E, near Nacre's leaf.
    { shape: 'circle', x: 4050, y: 2000, r: 60, image: 'mangrove.root.a', rotation: 1.5 },
    // Zone G, deep roots: dense, with narrow passages.
    { shape: 'circle', x: 4620, y: 760, r: 85, image: 'mangrove.root.c', rotation: 0.2 },
    { shape: 'circle', x: 5150, y: 640, r: 70, image: 'mangrove.root.a', rotation: 2.4 },
    { shape: 'circle', x: 5500, y: 800, r: 90, image: 'mangrove.root.b', rotation: -0.9 },
    { shape: 'circle', x: 5580, y: 1250, r: 75, image: 'mangrove.root.a', rotation: 1.1 },
    { shape: 'circle', x: 5480, y: 1720, r: 85, image: 'mangrove.root.c', rotation: -2.8 },
    { shape: 'circle', x: 5080, y: 1900, r: 80, image: 'mangrove.root.b', rotation: 0.7 },
    { shape: 'circle', x: 4640, y: 1780, r: 65, image: 'mangrove.root.a', rotation: -1.7 },
    { shape: 'circle', x: 5300, y: 2280, r: 90, image: 'mangrove.root.b', rotation: 2.2 },
    { shape: 'circle', x: 4900, y: 2700, r: 70, image: 'mangrove.root.c', rotation: -0.3 },
    { shape: 'circle', x: 5600, y: 2620, r: 80, image: 'mangrove.root.a', rotation: 3.0 },
    { shape: 'circle', x: 4480, y: 3250, r: 75, image: 'mangrove.root.b', rotation: 1.6 },
  ],

  // The part of the sunken branch that lies on the mud. The lifted end is cover.
  blocks: [
    { shape: 'circle', x: 4804, y: 3641, r: 26 },
    { shape: 'circle', x: 4867, y: 3602, r: 27 },
    { shape: 'circle', x: 4931, y: 3563, r: 28 },
    { shape: 'circle', x: 4994, y: 3523, r: 29 },
    { shape: 'circle', x: 5058, y: 3484, r: 30 },
    { shape: 'circle', x: 5121, y: 3445, r: 31 },
    { shape: 'circle', x: 5185, y: 3406, r: 32 },
    { shape: 'circle', x: 5249, y: 3367, r: 33 },
    { shape: 'circle', x: 5312, y: 3328, r: 34 },
  ],

  cover: [
    // Zone B.
    { id: 'tangle.landing', kind: 'tangle', x: 1560, y: 1860, r: 290, image: 'mangrove.tangle.a' },
    {
      id: 'tangle.north',
      kind: 'tangle',
      x: 980,
      y: 880,
      r: 270,
      image: 'mangrove.tangle.b',
      rotation: 1.3,
    },
    {
      id: 'tangle.south',
      kind: 'tangle',
      x: 1560,
      y: 2560,
      r: 260,
      image: 'mangrove.tangle.b',
      rotation: -0.7,
    },
    // Round the clearing. No point in it is more than 5 BL from one of these.
    {
      id: 'tangle.clearing.west',
      kind: 'tangle',
      x: 2580,
      y: 1700,
      r: 270,
      image: 'mangrove.tangle.a',
      rotation: 2.0,
    },
    {
      id: 'tangle.clearing.north',
      kind: 'tangle',
      x: 3320,
      y: 1160,
      r: 280,
      image: 'mangrove.tangle.b',
      rotation: 0.5,
    },
    {
      id: 'tangle.clearing.east',
      kind: 'tangle',
      x: 4120,
      y: 1560,
      r: 260,
      image: 'mangrove.tangle.a',
      rotation: -1.2,
    },
    {
      id: 'tangle.clearing.southwest',
      kind: 'tangle',
      x: 3020,
      y: 2640,
      r: 260,
      image: 'mangrove.tangle.b',
      rotation: 2.8,
    },
    {
      id: 'tangle.clearing.southeast',
      kind: 'tangle',
      x: 3740,
      y: 2660,
      r: 270,
      image: 'mangrove.tangle.a',
      rotation: 0.9,
    },
    // Zone E.
    {
      id: 'leaf.nacre',
      kind: 'leaf',
      x: 4420,
      y: 2120,
      r: 190,
      width: 480,
      image: 'mangrove.leaf.floating.a',
      rotation: -0.5,
    },
    {
      id: 'tangle.nacre',
      kind: 'tangle',
      x: 4760,
      y: 2480,
      r: 250,
      image: 'mangrove.tangle.b',
      rotation: -2.1,
    },
    // Zone C.
    {
      id: 'leaf.bed',
      kind: 'leaf',
      x: 1900,
      y: 2960,
      r: 170,
      width: 430,
      image: 'mangrove.leaf.floating.b',
      rotation: 0.8,
    },
    // Zone I: a leaf that rides the gutter's current.
    {
      id: 'leaf.gutter',
      kind: 'leaf',
      x: 1000,
      y: 3120,
      r: 160,
      width: 400,
      image: 'mangrove.leaf.floating.a',
      rotation: 2.6,
      drift: { x: -9, y: -2, within: { x: 300, y: 2700, w: 1400, h: 900 } },
    },
    // Zone G: the hollow, where the molt happens. Its opening faces the clearing.
    {
      id: 'hollow',
      kind: 'hollow',
      x: 5020,
      y: 1300,
      r: 380,
      image: 'mangrove.hollow',
      rotation: Math.PI,
      discovery: 'place.hollow',
    },
    {
      id: 'tangle.deep',
      kind: 'tangle',
      x: 5560,
      y: 2060,
      r: 230,
      image: 'mangrove.tangle.a',
      rotation: 1.7,
    },
    // Zone H: under the lifted end of the sunken branch. The landmark draws it.
    { id: 'branch.lift', kind: 'overhang', x: 5566, y: 3171, r: 190 },
  ],

  food: [
    // Zone B: three patches of film close to where the shrimp arrives.
    { id: 'film.landing.1', kind: 'algaeFilm', x: 1262, y: 1612, size: 210 },
    { id: 'film.landing.2', kind: 'algaeFilm', x: 1716, y: 1602, size: 190, rotation: 1.4 },
    { id: 'film.landing.3', kind: 'algaeFilm', x: 1340, y: 1260, size: 180, rotation: 2.7 },
    { id: 'film.landing.4', kind: 'algaeFilm', x: 1392, y: 2132, size: 200, rotation: 4.0 },
    // Zone A: the third taste (T34, proposed). Golden film on the sandy mud.
    { id: 'gold.creek', kind: 'sandFilm', x: 380, y: 2360, size: 270 },
    // Zone C: fallen leaves.
    { id: 'leaf.1', kind: 'mangroveLeaf', x: 1760, y: 3200, size: 390, rotation: 0.4 },
    { id: 'leaf.2', kind: 'mangroveLeaf', x: 2300, y: 3160, size: 420, rotation: -0.8 },
    { id: 'leaf.3', kind: 'mangroveLeaf', x: 2760, y: 3020, size: 360, rotation: 2.2 },
    { id: 'leaf.4', kind: 'mangroveLeaf', x: 3120, y: 3320, size: 400, rotation: 1.1 },
    { id: 'leaf.5', kind: 'mangroveLeaf', x: 2060, y: 3480, size: 380, rotation: -2.0 },
    // Zone F.
    { id: 'film.flat', kind: 'algaeFilm', x: 2150, y: 720, size: 220, rotation: 0.6 },
    { id: 'film.flat.2', kind: 'algaeFilm', x: 3632, y: 792, size: 190, rotation: 3.1 },
    // Zone E.
    { id: 'film.nacre', kind: 'algaeFilm', x: 4640, y: 2110, size: 200, rotation: 5.0 },
    // Zone G: the richest grazing, in the darkest water.
    { id: 'film.deep.1', kind: 'algaeFilm', x: 5252, y: 712, size: 230, rotation: 1.0 },
    { id: 'film.deep.2', kind: 'algaeFilm', x: 5560, y: 920, size: 240, rotation: 2.0 },
    { id: 'film.deep.3', kind: 'algaeFilm', x: 5180, y: 1990, size: 240, rotation: 3.6 },
    { id: 'film.deep.4', kind: 'algaeFilm', x: 5410, y: 2390, size: 250, rotation: 0.2 },
    { id: 'film.deep.5', kind: 'algaeFilm', x: 4730, y: 1850, size: 210, rotation: 4.4 },
    { id: 'leaf.deep', kind: 'mangroveLeaf', x: 5080, y: 2500, size: 400, rotation: 2.9 },
  ],

  landmarks: [
    {
      id: 'sunkenBranch',
      image: 'thing.sunkenBranch',
      x: 5250,
      y: 3370,
      width: 1300,
      rotation: -0.5,
      layer: 'cover',
      discovery: 'thing.sunkenBranch',
    },
    {
      id: 'pod.standing.1',
      image: 'thing.seedPod.standing',
      x: 2450,
      y: 3380,
      width: 110,
      layer: 'ground',
      discovery: 'thing.seedPod',
    },
    {
      id: 'pod.lying.1',
      image: 'thing.seedPod.lying',
      x: 2920,
      y: 3440,
      width: 330,
      rotation: 0.3,
      layer: 'ground',
      discovery: 'thing.seedPod',
    },
    {
      id: 'pod.lying.2',
      image: 'thing.seedPod.lying',
      x: 1620,
      y: 3040,
      width: 310,
      rotation: -1.1,
      layer: 'ground',
      discovery: 'thing.seedPod',
    },
    {
      id: 'pod.standing.2',
      image: 'thing.seedPod.standing',
      x: 4300,
      y: 2860,
      width: 110,
      layer: 'ground',
      discovery: 'thing.seedPod',
    },
  ],

  creatures: [
    // On the bank, above the waterline. The player watches from the water.
    { id: 'crab.1', kind: 'fiddlerCrab', x: 2000, y: 250, heading: 1.3 },
    { id: 'crab.2', kind: 'fiddlerCrab', x: 2460, y: 200, heading: 1.8 },
    { id: 'crab.3', kind: 'fiddlerCrab', x: 2900, y: 270, heading: 1.5 },
    { id: 'crab.4', kind: 'fiddlerCrab', x: 3340, y: 220, heading: 1.2 },
    { id: 'snail.1', kind: 'snail', x: 2550, y: 3080, heading: 0.4 },
    { id: 'snail.2', kind: 'snail', x: 1960, y: 3300, heading: 2.5 },
    { id: 'snail.3', kind: 'snail', x: 3230, y: 3100, heading: -1.2 },
    { id: 'snail.4', kind: 'snail', x: 1240, y: 1690, heading: 3.6 },
    // Young fish holding among the roots, facing the current.
    { id: 'fish.landing', kind: 'smallFish', x: 1560, y: 1300, heading: Math.PI, count: 14 },
    { id: 'fish.deep', kind: 'smallFish', x: 5250, y: 1620, heading: Math.PI, count: 18 },
    { id: 'fish.gutter', kind: 'smallFish', x: 780, y: 3300, heading: 0.2, count: 12 },
  ],

  shrimp: [
    // Nacre rests at the edge of the leaf, where she can be seen.
    { id: 'nacre', who: 'nacre', x: 4590, y: 2250, heading: 2.4 },
    { id: 'young.1', who: 'young', x: 4200, y: 2540, heading: 0.5 },
    { id: 'young.2', who: 'young', x: 4950, y: 2380, heading: -2.0 },
  ],

  currents: [
    // The creek mouth breathes in.
    { zone: { x: 0, y: 1300, w: 700, h: 1400 }, vx: 10, vy: 0 },
    // The gutter runs toward the creek.
    { zone: { x: 300, y: 2700, w: 1400, h: 900 }, vx: -18, vy: -5 },
  ],

  zones: [
    { id: 'A', zone: { x: 0, y: 1300, w: 700, h: 1400 } },
    { id: 'B', zone: { x: 700, y: 1000, w: 1300, h: 1600 } },
    { id: 'C', zone: { x: 1500, y: 2700, w: 1900, h: 900 } },
    { id: 'D', zone: { x: 2700, y: 1300, w: 1300, h: 1200 } },
    { id: 'E', zone: { x: 3900, y: 1900, w: 1100, h: 900 } },
    { id: 'F', zone: { x: 1700, y: 0, w: 2000, h: 900 } },
    { id: 'G', zone: { x: 4500, y: 500, w: 1400, h: 2400 } },
    { id: 'H', zone: { x: 4700, y: 3000, w: 1200, h: 800 } },
    { id: 'I', zone: { x: 300, y: 2700, w: 1400, h: 900 } },
  ],

  triggers: [
    // Entering the clearing after the Sense step starts the first bird.
    { id: 'bird.first', zone: { x: 2900, y: 1500, w: 900, h: 800 }, once: true },
    // A seed pod drops as the player crosses the leaf bed: the first harmless startle.
    { id: 'pod.drop', zone: { x: 2000, y: 2800, w: 700, h: 500 }, once: true },
  ],

  exits: [{ to: 'lagoon', zone: { x: 0, y: 1300, w: 90, h: 1400 }, needsStep: 's1.molt' }],

  scatter: [
    {
      image: 'mangrove.litter.a',
      zone: { x: 0, y: 0, w: 6000, h: 4000 },
      count: 300,
      seed: 21,
      size: [36, 84],
    },
    {
      image: 'mangrove.litter.b',
      zone: { x: 0, y: 0, w: 6000, h: 4000 },
      count: 220,
      seed: 22,
      size: [40, 96],
    },
    {
      image: 'mangrove.litter.c',
      zone: { x: 0, y: 0, w: 6000, h: 4000 },
      count: 120,
      seed: 23,
      size: [30, 60],
    },
    // The leaf bed is thick with scraps.
    {
      image: 'mangrove.litter.a',
      zone: { x: 1500, y: 2700, w: 1900, h: 900 },
      count: 140,
      seed: 24,
      size: [40, 100],
    },
  ],
};
