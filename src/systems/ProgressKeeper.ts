import type { EventBus } from '../core/events';
import type { GameEvents } from '../core/gameEvents';
import { Progress, type ProgressEvent, type ProgressNews } from '../core/progress/Progress';
import { SmallLines, type SmallLine } from '../core/progress/SmallLines';
import type { Life } from '../core/progress/life';
import type { AreaId } from '../core/world/kinds';
import { CHALLENGES } from '../data/challenges';
import { PROGRESS_DEFS } from '../data/progress';
import { SMALL_LINE } from '../data/tuning';
import { debugState } from '../debug';
import { i18n, t } from '../i18n';

const PLAYER = 'player';

export interface KeeperOptions {
  /** The shrimp has just arrived in this place, rather than coming back to it from a save. */
  arrived: boolean;
  /** With `?debug`, cards still to check unlock too. */
  author: boolean;
  /** Marks something found that has no place to be found at, such as the first other shrimp. */
  find: (id: string) => void;
  /** A small line has come: ring its bells. */
  ring?: (bells: 1 | 2) => void;
}

/** What the small line and the save need to show over play. */
export interface HudLines {
  smallLine(line: SmallLine | null, alpha: number): void;
}

/**
 * Counts what the game does toward challenges, achievements and cards
 * (doc 12), tells the other systems what changed, and queues the small
 * lines at the top right. One for each scene that plays a place.
 */
export class ProgressKeeper {
  readonly progress: Progress;
  private readonly lines = new SmallLines(SMALL_LINE);
  private readonly stops: (() => void)[] = [];
  private lineNow: SmallLine | null = null;
  private readonly ring: ((bells: 1 | 2) => void) | undefined;

  constructor(
    private readonly bus: EventBus<GameEvents>,
    life: Life,
    private readonly area: AreaId,
    private readonly hud: () => HudLines | null,
    options: KeeperOptions,
  ) {
    this.progress = new Progress(PROGRESS_DEFS, life, options.author);
    this.ring = options.ring;
    const on = <K extends keyof GameEvents>(type: K, handler: (event: GameEvents[K]) => void) =>
      this.stops.push(bus.on(type, handler));
    const hear = (event: ProgressEvent) => this.hear(event);

    on('food:eaten', ({ who, kind, full }) => {
      if (who === PLAYER) hear({ kind: 'eaten', food: kind, area, full, night: false });
    });
    on('tailflip', ({ who }) => {
      if (who === PLAYER) hear({ kind: 'tailflip' });
    });
    on('greeting', ({ a, b }) => {
      if (a !== PLAYER && b !== PLAYER) return;
      options.find('creature.shrimp');
      hear({ kind: 'greeting', other: a === PLAYER ? b : a, area });
    });
    on('discovery', ({ id }) => {
      hear({ kind: 'discovery', id, area });
      const name = `name.${id}`;
      if (i18n.has(name)) {
        this.line({
          id: `found.${id}`,
          text: t('line.discovery', { name: t(name) }),
          icon: 'icon.type.find',
          bells: 1,
        });
      }
    });
    on('step:done', ({ id }) => hear({ kind: 'step', id }));
    on('threat:stage', ({ kind, stage }) => {
      hear({ kind: 'threat', threat: kind, stage, area });
      // The shadow with legs is known once it has gone.
      if (kind === 'bird' && stage === 'release') options.find('creature.bird');
    });
    on('threat:escaped', ({ kind, clean, still }) => {
      hear({ kind: 'escaped', threat: kind, clean, still });
    });
    on('cornered', () => hear({ kind: 'cornered', area }));
    on('molt:done', ({ who, molts }) => {
      if (who === PLAYER) hear({ kind: 'molt', molts });
    });
    on('ribbon:followed', () => hear({ kind: 'ribbon' }));
    on('groomed', ({ who }) => {
      if (who === PLAYER) hear({ kind: 'groomed' });
    });
    on('sense:used', () => hear({ kind: 'sense' }));
    on('mood:changed', ({ who, from, to }) => {
      if (who === PLAYER) hear({ kind: 'mood', from, to });
    });
    on('cover:left', ({ who, wary }) => {
      if (who === PLAYER) hear({ kind: 'coverLeft', wary });
    });
    on('bond:changed', ({ with: id, value }) => hear({ kind: 'bond', with: id, value }));

    if (options.arrived) hear({ kind: 'area', area });

    debugState.progress = () => ({
      challenges: { ...life.challenges },
      achievements: [...life.achievements],
      cards: [...life.cards],
      discoveries: [...life.discoveries],
      stats: { ...life.stats },
      pinned: life.pinned,
      line: this.lineNow?.id ?? null,
    });
  }

  /** A count with no event of its own, such as the yolk ending or landfall. */
  count(stat: string): void {
    this.hear({ kind: 'stat', stat });
  }

  /** The player touched something, such as another larva. */
  touched(what: string): void {
    this.hear({ kind: 'touched', what });
  }

  /** A line that is not progress, such as "Kept." when the life is saved. */
  say(id: string, text: string): void {
    this.line({ id, text, icon: null, bells: 1 });
  }

  /** Once a frame: conditions that last, and the small line. */
  update(dt: number, held: Readonly<Record<string, boolean>>): void {
    this.report(this.progress.hold(dt, held));
    const { line, alpha, began } = this.lines.step(dt);
    if (began && line) this.ring?.(line.bells);
    this.lineNow = line;
    this.hud()?.smallLine(line, alpha);
  }

  destroy(): void {
    for (const stop of this.stops) stop();
    this.stops.length = 0;
    debugState.progress = null;
  }

  private hear(event: ProgressEvent): void {
    this.report(this.progress.hear(event));
  }

  private line(line: SmallLine): void {
    this.lines.push(line);
  }

  private report(news: readonly ProgressNews[]): void {
    for (const one of news) {
      if (one.kind === 'progress' || one.kind === 'done') {
        const def = CHALLENGES.find((challenge) => challenge.id === one.id);
        const name = t(`challenge.${one.id}.name`);
        const icon = `icon.type.${def?.type ?? 'find'}`;
        if (one.kind === 'progress') {
          this.bus.emit('challenge:progress', one);
          this.line({
            id: one.id,
            text: t('line.progress', { name, value: one.value, target: one.target }),
            icon,
            bells: 1,
          });
        } else {
          this.bus.emit('challenge:done', { id: one.id });
          this.line({ id: one.id, text: t('line.done', { name }), icon, bells: 1 });
        }
      } else if (one.kind === 'achievement') {
        this.bus.emit('achievement', { id: one.id });
        this.line({
          id: `ach.${one.id}`,
          text: t('line.achievement', { name: t(`ach.${one.id}.name`) }),
          icon: `icon.ach.${one.id}`,
          bells: 2,
        });
      } else {
        this.bus.emit('card:unlocked', { id: one.id });
        this.line({
          id: `card.${one.id}`,
          text: t('line.card', { name: t(`card.${one.id}.name`) }),
          icon: 'icon.tab.feel',
          bells: 1,
        });
      }
    }
  }
}
