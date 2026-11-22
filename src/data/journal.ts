import type { CardDef, Condition } from '../core/progress/Progress';

/**
 * How far each source has been read, from the tables of doc 07 and doc 18.
 * `read`: the text or its abstract was read. `secondHand`: read about in
 * another text. `title`: only the reference is confirmed. `memory`: neither.
 * A card is released only when all its sources are `read` (doc 07, "Before
 * release"). The citation shown under a card is `source.<key>` (doc 13).
 */
export type Standing = 'read' | 'secondHand' | 'title' | 'memory';

export const SOURCES: Readonly<Record<string, Standing>> = {
  LSE2021: 'read',
  BARR2008: 'title',
  RP2023: 'read',
  FAO: 'read',
  UK2022: 'read',
  FOSSAT2014: 'secondHand',
  ELWOOD2009: 'title',
  ARNOTT1998: 'title',
  MAGEE2013: 'read',
  CHEMO2020: 'read',
  GUTIERREZ2024: 'read',
  CRIALES2011: 'read',
  SCHAPKER2002: 'read',
  KREIDL1893: 'memory',
};

interface CardSpec {
  id: string;
  when: Condition;
  sources: readonly string[];
  /** A line of the card is marked "to check" in doc 07 or doc 18. */
  toCheck?: true;
}

/**
 * The cards of "What shrimp feel" built so far: the eleven of doc 07 and
 * five of doc 18 that chapters 0 and 1 can unlock. Each card's title and
 * text are `card.<id>.name` and `card.<id>.text` (doc 13). Some read stats
 * that later steps send.
 */
const CARD_SPECS: readonly CardSpec[] = [
  { id: 'toLight', when: { count: { stat: 'yolkEnded' }, atLeast: 1 }, sources: ['FAO'] },
  { id: 'shapes', when: { count: { stat: 'shapeChanges' }, atLeast: 2 }, sources: ['FAO'] },
  {
    id: 'rideTide',
    when: { count: { stat: 'landfalls' }, atLeast: 1 },
    sources: ['CRIALES2011'],
  },
  {
    id: 'scent',
    when: { count: { stat: 'senses' }, atLeast: 1 },
    sources: ['CHEMO2020', 'GUTIERREZ2024'],
  },
  { id: 'heart', when: { count: { stat: 'frights' }, atLeast: 1 }, sources: ['SCHAPKER2002'] },
  {
    id: 'fear',
    when: { count: { stat: 'frightsEased' }, atLeast: 1 },
    sources: ['LSE2021', 'ELWOOD2009', 'MAGEE2013'],
  },
  { id: 'wary', when: { count: { stat: 'waryLeft' }, atLeast: 1 }, sources: ['FOSSAT2014'] },
  {
    id: 'tailflip',
    when: { count: { stat: 'tailFlips' }, atLeast: 3 },
    sources: ['ARNOTT1998'],
    toCheck: true,
  },
  { id: 'grooming', when: { count: { stat: 'grooms' }, atLeast: 1 }, sources: ['BARR2008'] },
  { id: 'molt', when: { count: { stat: 'molts' }, atLeast: 1 }, sources: [], toCheck: true },
  {
    id: 'balance',
    when: { count: { stat: 'afterMolt' }, atLeast: 1 },
    sources: ['KREIDL1893'],
    toCheck: true,
  },
  {
    id: 'seeThrough',
    when: { count: { distinct: 'ground.' }, atLeast: 3 },
    sources: ['FAO'],
  },
  { id: 'journey', when: { count: { stat: 'reached.openSea' }, atLeast: 1 }, sources: ['FAO'] },
  { id: 'nextOnes', when: { count: { stat: 'spawned' }, atLeast: 1 }, sources: ['FAO'] },
  {
    id: 'feel',
    when: { count: { step: 's2.molt' }, atLeast: 1 },
    sources: ['LSE2021', 'UK2022'],
  },
  { id: 'howMany', when: { count: { stat: 'spawned' }, atLeast: 1 }, sources: ['RP2023'] },
];

export interface Card extends CardDef {
  sources: readonly string[];
}

export const CARDS: readonly Card[] = CARD_SPECS.map((spec) => ({
  id: spec.id,
  when: spec.when,
  sources: spec.sources,
  released:
    spec.toCheck !== true &&
    spec.sources.length > 0 &&
    spec.sources.every((key) => SOURCES[key] === 'read'),
}));
