import type { BondStage } from '../feelings/types';
import type { ThreatKind } from '../gameEvents';
import type { MenuKey } from '../input/menuKeys';
import type { Progress, ProgressDefs, ProgressRecord } from '../progress/Progress';
import type { AreaId } from '../world/kinds';

/**
 * What the journal shows, read from a life's record (doc 12, "The
 * journal"). Nothing here knows about the engine: the scene draws what
 * these functions return.
 */

export const JOURNAL_PAGES = [
  'discoveries',
  'companions',
  'feel',
  'challenges',
  'achievements',
] as const;
export type JournalPage = (typeof JOURNAL_PAGES)[number];

/** Where the journal is: a page and the entry chosen on it. */
export interface JournalCursor {
  page: JournalPage;
  index: number;
}

/**
 * Left and Right turn the page, Up and Down move through its entries
 * (doc 12, "Keys"). Both wrap round. `counts` is how many entries each
 * page has now.
 */
export function moveCursor(
  cursor: JournalCursor,
  key: MenuKey,
  counts: Readonly<Record<JournalPage, number>>,
): JournalCursor {
  const pages = JOURNAL_PAGES.length;
  const at = JOURNAL_PAGES.indexOf(cursor.page);
  if (key === 'left' || key === 'right') {
    const page = JOURNAL_PAGES[(at + (key === 'left' ? pages - 1 : 1)) % pages] ?? 'discoveries';
    return { page, index: 0 };
  }
  const count = counts[cursor.page];
  if (count <= 0) return { page: cursor.page, index: 0 };
  if (key === 'up') return { page: cursor.page, index: (cursor.index + count - 1) % count };
  if (key === 'down') return { page: cursor.page, index: (cursor.index + 1) % count };
  return cursor;
}

/** The chapters whose place the life has reached. */
export function chaptersReached(defs: ProgressDefs, record: ProgressRecord): Set<number> {
  const reached = new Set<number>();
  for (const chapter of defs.chapters) {
    if ((record.stats[`reached.${chapter.area}`] ?? 0) > 0) reached.add(chapter.chapter);
  }
  return reached;
}

/** The place where something was found or someone met, if the record kept it. */
export function whereFrom(
  record: ProgressRecord,
  prefix: 'foundIn' | 'metIn',
  id: string,
  areas: readonly AreaId[],
): AreaId | null {
  return areas.find((area) => (record.stats[`${prefix}.${area}.${id}`] ?? 0) > 0) ?? null;
}

/** One line of the Challenges page. */
export interface ChallengeLine {
  id: string;
  chapter: number;
  value: number;
  target: number;
  done: boolean;
  /** Read from the best run without a break: shown as "Best so far". */
  best: boolean;
  pinned: boolean;
}

/** The challenges shown: those of the chapters reached, by chapter (doc 12, "Challenges"). */
export function challengeLines(
  defs: ProgressDefs,
  progress: Progress,
  reached: ReadonlySet<number>,
  pinned: string | null,
): ChallengeLine[] {
  return defs.challenges
    .filter((def) => reached.has(def.chapter))
    .map((def) => ({
      id: def.id,
      chapter: def.chapter,
      value: progress.value(def.id),
      target: def.target,
      done: progress.isDone(def.id),
      best: 'held' in def.count && def.count.unbroken === true,
      pinned: def.id === pinned,
    }));
}

/**
 * Enter on a challenge pins it, and on the pinned one lets it go. One at a
 * time. A challenge done has nothing left to lead to.
 */
export function pinChallenge(pinned: string | null, line: ChallengeLine): string | null {
  if (line.done) return pinned;
  return pinned === line.id ? null : line.id;
}

/** The marks the journal keeps for "new since last opened": one per entry found. */
export function unlockedMarks(record: ProgressRecord): string[] {
  return [
    ...[...record.discoveries].map((id) => `d:${id}`),
    ...[...record.cards].map((id) => `c:${id}`),
    ...[...record.achievements].map((id) => `a:${id}`),
  ];
}

/** Each line on a companion's page, from the first to the last that can show. */
export type CompanionLine =
  | { line: 'look' | 'way' | 'more' }
  | { line: 'met'; area: AreaId }
  | { line: 'favourite' }
  | { line: 'fled'; threat: ThreatKind }
  | { line: 'yourMolt' | 'herMolt' };

const THREATS: readonly ThreatKind[] = ['bird', 'fish', 'net'];

/** The bond stage a value has reached. */
export function stageOf(value: number, stages: ProgressDefs['bondStages']): BondStage {
  if (value >= stages.close) return 'close';
  if (value >= stages.companion) return 'companion';
  if (value >= stages.familiar) return 'familiar';
  return 'stranger';
}

/**
 * The lines that have appeared as the bond grew (doc 12, "The companion
 * page"). The memory at Close is the first threat fled together, else the
 * molt one of them stayed through.
 */
export function companionLines(
  id: string,
  record: ProgressRecord,
  stages: ProgressDefs['bondStages'],
  areas: readonly AreaId[],
): CompanionLine[] {
  const stage = stageOf(record.bonds[id] ?? 0, stages);
  const at = (['stranger', 'familiar', 'companion', 'close'] as const).indexOf(stage);
  const stat = (name: string) => (record.stats[name] ?? 0) > 0;
  const lines: CompanionLine[] = [];
  if (at >= 1) {
    lines.push({ line: 'look' }, { line: 'way' });
    const area = whereFrom(record, 'metIn', id, areas);
    if (area) lines.push({ line: 'met', area });
  }
  if (stat(`favourites.${id}`)) lines.push({ line: 'favourite' });
  if (at >= 2) lines.push({ line: 'more' });
  if (at >= 3) {
    const threat = THREATS.find((kind) => stat(`fledWith.${id}.${kind}`));
    if (threat) lines.push({ line: 'fled', threat });
    else if (stat(`softWith.${id}`)) lines.push({ line: 'yourMolt' });
    else if (stat(`stayedWith.${id}`)) lines.push({ line: 'herMolt' });
  }
  return lines;
}

/** A companion is on the page once greeted, or once a bond has begun. */
export function companionMet(id: string, record: ProgressRecord): boolean {
  return (record.stats[`greeted.${id}`] ?? 0) > 0 || (record.bonds[id] ?? 0) > 0;
}
