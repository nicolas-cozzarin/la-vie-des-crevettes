/**
 * Every entry of the journal's Discoveries page, by group, in the order
 * shown (doc 12, "Pages"; doc 13, "Names"). The name is `name.<id>`. The
 * picture is a painter's name, drawn small in the grid and large on the
 * right page; null draws a pencil spiral until the entry has its own.
 */
export type DiscoveryGroup = 'foods' | 'places' | 'creatures' | 'things';

export interface DiscoveryEntry {
  id: string;
  group: DiscoveryGroup;
  image: string | null;
}

export const DISCOVERY_GROUPS: readonly DiscoveryGroup[] = [
  'foods',
  'places',
  'creatures',
  'things',
];

export const DISCOVERIES: readonly DiscoveryEntry[] = [
  { id: 'food.microalgae', group: 'foods', image: 'food.microalgae.b' },
  { id: 'food.algaeFilm', group: 'foods', image: 'food.algaeFilm' },
  { id: 'food.mangroveLeaf', group: 'foods', image: 'food.mangroveLeaf' },
  { id: 'food.sandFilm', group: 'foods', image: 'food.sandFilm' },
  { id: 'food.seagrassFuzz', group: 'foods', image: 'food.seagrassFuzz' },
  { id: 'food.seaweed', group: 'foods', image: 'food.seaweed' },
  { id: 'place.drift', group: 'places', image: 'drift.shaft' },
  { id: 'place.mangrove', group: 'places', image: 'mangrove.tangle.a' },
  { id: 'place.hollow', group: 'places', image: 'mangrove.hollow' },
  { id: 'place.lagoon', group: 'places', image: 'lagoon.seagrass.a' },
  { id: 'place.seagrass', group: 'places', image: 'lagoon.seagrass.b' },
  { id: 'place.channel', group: 'places', image: 'channel.boulder.a' },
  { id: 'place.shadow', group: 'places', image: 'shadow.hull' },
  { id: 'place.openSea', group: 'places', image: null },
  { id: 'place.deep', group: 'places', image: null },
  { id: 'creature.shrimp', group: 'creatures', image: 'larva.late' },
  { id: 'drift.copepod', group: 'creatures', image: 'drift.copepod' },
  { id: 'drift.bell', group: 'creatures', image: 'drift.bell' },
  { id: 'creature.fiddlerCrab', group: 'creatures', image: 'crab.body' },
  { id: 'creature.snail', group: 'creatures', image: 'snail.shell' },
  { id: 'creature.smallFish', group: 'creatures', image: 'fish.small' },
  { id: 'creature.bird', group: 'creatures', image: 'bird.shadow.body' },
  { id: 'creature.hermitCrab', group: 'creatures', image: 'hermit.legs' },
  { id: 'creature.barnacles', group: 'creatures', image: 'barnacle' },
  { id: 'creature.turtle', group: 'creatures', image: 'turtle.shell' },
  { id: 'creature.pistolAndGoby', group: 'creatures', image: 'pistol.body' },
  { id: 'creature.huntingFish', group: 'creatures', image: 'fish.hunter.body' },
  { id: 'creature.seaStar', group: 'creatures', image: 'seaStar' },
  { id: 'thing.seedPod', group: 'things', image: 'thing.seedPod.lying' },
  { id: 'thing.sunkenBranch', group: 'things', image: 'thing.sunkenBranch' },
  { id: 'thing.crabPellets', group: 'things', image: 'thing.crabPellets' },
  { id: 'thing.breathingRoots', group: 'things', image: 'thing.breathingRoot' },
  { id: 'thing.sandVolcano', group: 'things', image: 'thing.sandVolcano' },
  { id: 'thing.shedShell', group: 'things', image: null },
  { id: 'thing.glowingPlankton', group: 'things', image: null },
  { id: 'thing.crackle', group: 'things', image: null },
  { id: 'thing.longSound', group: 'things', image: null },
  { id: 'thing.eggs', group: 'things', image: null },
];

export const DISCOVERY_IDS: readonly string[] = DISCOVERIES.map((entry) => entry.id);
