import Phaser from 'phaser';
import { app } from '../app';
import { ensureTexture } from '../art/TextureFactory';
import { COLORS, FONTS, GAME_HEIGHT, GAME_WIDTH, TINTS } from '../config';
import type { MenuKey } from '../core/input/menuKeys';
import {
  JOURNAL_PAGES,
  challengeLines,
  chaptersReached,
  companionLines,
  companionMet,
  moveCursor,
  pinChallenge,
  stageOf,
  unlockedMarks,
  whereFrom,
  type ChallengeLine,
  type CompanionLine,
  type JournalCursor,
  type JournalPage,
} from '../core/journal/journal';
import { Progress } from '../core/progress/Progress';
import type { Life } from '../core/progress/life';
import { AREA_IDS, type AreaId } from '../core/world/kinds';
import { ACHIEVEMENTS } from '../data/achievements';
import { CHALLENGES, CHAPTERS } from '../data/challenges';
import { DISCOVERIES, DISCOVERY_GROUPS, type DiscoveryEntry } from '../data/discoveries';
import { CARDS } from '../data/journal';
import { PROGRESS_DEFS } from '../data/progress';
import { COMPANIONS, type CompanionId } from '../data/shrimp';
import { debugState } from '../debug';
import { t } from '../i18n';
import { onMenuKey } from '../ui/menuKeys';
import { textStyle } from '../ui/text';

/** What a game scene lends the journal while it is open. */
export interface JournalHost {
  journalLife(): { life: Life; area: AreaId; unreleased: boolean };
}

export interface JournalData {
  /** The paused game: the Drift or Play. */
  game: 'Drift' | 'Play';
  /** Opened from the pause menu, it goes back there. */
  from: 'game' | 'pause';
}

/** Design positions (doc 12, "Look"). */
const BOOK = { left: 210, top: 90, right: 1710, bottom: 990 };
const LEFT = { left: 240, right: 940, top: 120, bottom: 960 };
const RIGHT = { left: 980, right: 1680, top: 120, bottom: 960 };
const INNER = 30;
const TAB = { x: 1690, top: 150, w: 70, h: 120, gap: 10, icon: 56 };
const HELP_Y = 1020;
const LIST_TOP = 230;
const LIST_BOTTOM = 930;
const RIGHT_X = (RIGHT.left + RIGHT.right) / 2;
const TEXT_WIDTH = RIGHT.right - RIGHT.left - 2 * INNER - 40;

const PAPER_SHADE = 0xe8dfc8;
const WASH = 0xd9e4dc;
const NEW_DOT = 0xd9a441;
const PENCIL = 0x2a2a2a;

const COMPANION_IDS = Object.keys(COMPANIONS) as CompanionId[];
const STAGES = ['stranger', 'familiar', 'companion', 'close'] as const;
const CHALLENGE_TYPE = new Map(CHALLENGES.map((one) => [one.id, one.type]));

/** One row of a list or grid on the left page, before it is drawn. */
interface Row {
  height: number;
  /** A group heading, or the entries across this row. */
  heading?: string;
  entries?: number[];
}

/**
 * "Le carnet" (doc 12, "The journal"): an open field notebook on the dimmed
 * game, five pages with tabs down the right edge. Play pauses behind it.
 * Menu keys only, so it follows the player's bindings.
 */
export class JournalScene extends Phaser.Scene {
  private game_: JournalData['game'] = 'Play';
  private from: JournalData['from'] = 'game';
  private life!: Life;
  private area: AreaId = 'mangrove';
  private unreleased = false;
  private progress!: Progress;
  private cursor: JournalCursor = { page: 'discoveries', index: 0 };
  /** The first row shown on each page, for pages longer than the paper. */
  private scroll: Record<JournalPage, number> = {
    discoveries: 0,
    companions: 0,
    feel: 0,
    challenges: 0,
    achievements: 0,
  };
  /** What was there when the journal was last opened. */
  private seen = new Set<string>();
  private drawn: Phaser.GameObjects.GameObject[] = [];
  private title: Phaser.GameObjects.Text | null = null;
  private leaving = false;

  constructor() {
    super('Journal');
  }

  init(data: JournalData): void {
    this.game_ = data.game;
    this.from = data.from;
    this.leaving = false;
  }

  create(): void {
    const host = this.scene.get(this.game_) as unknown as JournalHost;
    const lent = host.journalLife();
    this.life = lent.life;
    this.area = lent.area;
    this.unreleased = lent.unreleased;
    this.progress = new Progress(PROGRESS_DEFS, this.life, this.unreleased);
    this.seen = new Set(this.life.journalSeen);
    this.cursor = { page: 'discoveries', index: 0 };
    this.drawn = [];

    const veil = this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, TINTS.deepTeal, 0.6)
      .setAlpha(0);
    // Nothing changes brightness faster than half a second.
    this.tweens.add({ targets: veil, alpha: 1, duration: 500 });
    // The hints over play would show under the help line.
    this.scene.setVisible(false, 'Hud');
    this.drawBook();
    this.add
      .text(
        GAME_WIDTH / 2,
        HELP_Y,
        t('journal.help', { pin: app.keyName('Enter'), close: app.keyName('Escape') }),
        textStyle(22, COLORS.paper),
      )
      .setOrigin(0.5)
      .setAlpha(0.7);
    this.render();

    onMenuKey(this, (key) => this.handle(key));
    debugState.journal = () => ({
      page: this.cursor.page,
      index: this.cursor.index,
      entries: this.entryIds(this.cursor.page),
      pinned: this.life.pinned,
      fresh: this.entryIds(this.cursor.page).filter((id) => this.isNew(this.cursor.page, id)),
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      debugState.journal = null;
    });
  }

  override update(): void {
    // The Journal key, or the player's own pause key, closes it too.
    if (app.actions.justPressed('journal') || app.actions.justPressed('pause')) this.close();
  }

  private handle(key: MenuKey): void {
    if (key === 'back') {
      this.close();
      return;
    }
    if (key === 'accept') {
      this.accept();
      return;
    }
    const next = moveCursor(this.cursor, key, this.counts());
    if (next.page === this.cursor.page && next.index === this.cursor.index) return;
    this.cursor = next;
    this.render();
  }

  /** Enter pins the chosen challenge. Elsewhere it does nothing (doc 12, "Keys"). */
  private accept(): void {
    if (this.cursor.page !== 'challenges') return;
    const line = this.challengeLines()[this.cursor.index];
    if (!line) return;
    this.life.pinned = pinChallenge(this.life.pinned, line);
    this.render();
  }

  private close(): void {
    if (this.leaving) return;
    this.leaving = true;
    this.life.journalSeen = new Set(unlockedMarks(this.life));
    this.scene.setVisible(true, 'Hud');
    // Keys pressed in the journal must not act inside the game.
    app.actions.clearQueued();
    if (this.from === 'pause') {
      this.scene.start('Pause');
      return;
    }
    this.scene.resume(this.game_);
    this.scene.stop();
  }

  // What each page holds.

  private counts(): Record<JournalPage, number> {
    return {
      discoveries: DISCOVERIES.length,
      companions: this.companions().length,
      feel: this.cards().length,
      challenges: this.challengeLines().length,
      achievements: ACHIEVEMENTS.length,
    };
  }

  private entryIds(page: JournalPage): string[] {
    switch (page) {
      case 'discoveries':
        return DISCOVERIES.map((one) => one.id);
      case 'companions':
        return this.companions();
      case 'feel':
        return this.cards();
      case 'challenges':
        return this.challengeLines().map((line) => line.id);
      case 'achievements':
        return ACHIEVEMENTS.map((one) => one.id);
    }
  }

  /** The companions in the order of doc 11. Only those met have a name. */
  private companions(): string[] {
    return COMPANION_IDS.filter((id) => companionMet(id, this.life));
  }

  /** The cards in the order they were unlocked. */
  private cards(): string[] {
    return [...this.life.cards].filter((id) => CARDS.some((card) => card.id === id));
  }

  private challengeLines(): ChallengeLine[] {
    return challengeLines(
      PROGRESS_DEFS,
      this.progress,
      chaptersReached(PROGRESS_DEFS, this.life),
      this.life.pinned,
    );
  }

  private isNew(page: JournalPage, id: string): boolean {
    const mark =
      page === 'discoveries'
        ? `d:${id}`
        : page === 'feel'
          ? `c:${id}`
          : page === 'achievements'
            ? `a:${id}`
            : null;
    if (!mark) return false;
    const unlocked =
      page === 'discoveries'
        ? this.life.discoveries.has(id)
        : page === 'feel'
          ? this.life.cards.has(id)
          : this.life.achievements.has(id);
    return unlocked && !this.seen.has(mark);
  }

  // Drawing.

  private drawBook(): void {
    const book = this.add.graphics();
    book.fillStyle(0x000000, 0.25);
    book.fillRoundedRect(
      BOOK.left + 8,
      BOOK.top + 12,
      BOOK.right - BOOK.left,
      BOOK.bottom - BOOK.top,
      18,
    );
    book.fillStyle(TINTS.paper, 1);
    book.fillRoundedRect(BOOK.left, BOOK.top, BOOK.right - BOOK.left, BOOK.bottom - BOOK.top, 18);
    // The spine: a soft shadow down the middle.
    for (let step = 0; step < 12; step++) {
      const alpha = 0.012 * (12 - step);
      book.fillStyle(0x6b5a3a, alpha);
      book.fillRect(960 - step * 2, BOOK.top, 2, BOOK.bottom - BOOK.top);
      book.fillRect(960 + step * 2, BOOK.top, 2, BOOK.bottom - BOOK.top);
    }
    // A faint pencil frame round each page.
    book.lineStyle(1.5, PENCIL, 0.12);
    book.strokeRect(LEFT.left, LEFT.top, LEFT.right - LEFT.left, LEFT.bottom - LEFT.top);
    book.strokeRect(RIGHT.left, RIGHT.top, RIGHT.right - RIGHT.left, RIGHT.bottom - RIGHT.top);
  }

  private keep<T extends Phaser.GameObjects.GameObject>(object: T): T {
    this.drawn.push(object);
    return object;
  }

  private render(): void {
    for (const object of this.drawn) object.destroy();
    this.drawn = [];
    this.drawTabs();
    switch (this.cursor.page) {
      case 'discoveries':
        this.drawDiscoveries();
        break;
      case 'companions':
        this.drawCompanions();
        break;
      case 'feel':
        this.drawCards();
        break;
      case 'challenges':
        this.drawChallenges();
        break;
      case 'achievements':
        this.drawAchievements();
        break;
    }
  }

  private drawTabs(): void {
    JOURNAL_PAGES.forEach((page, index) => {
      const y = TAB.top + index * (TAB.h + TAB.gap);
      const chosen = page === this.cursor.page;
      const tab = this.keep(this.add.graphics());
      tab.fillStyle(chosen ? TINTS.paper : PAPER_SHADE, 1);
      // The chosen tab joins the page it opens.
      const from = chosen ? TAB.x - 24 : TAB.x;
      tab.fillRoundedRect(from, y, TAB.x + TAB.w - from, TAB.h, { tl: 0, tr: 14, br: 14, bl: 0 });
      tab.lineStyle(1.5, PENCIL, chosen ? 0.3 : 0.18);
      tab.strokeRoundedRect(TAB.x, y, TAB.w, TAB.h, { tl: 0, tr: 14, br: 14, bl: 0 });
      const icon = this.keep(
        this.add
          .image(TAB.x + TAB.w / 2, y + TAB.h / 2, ensureTexture(this, `icon.tab.${page}`))
          .setDisplaySize(TAB.icon, TAB.icon)
          .setAlpha(chosen ? 1 : 0.55),
      );
      icon.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
        this.cursor = { page, index: 0 };
        this.render();
      });
    });
    this.title = this.keep(
      this.add.text(
        LEFT.left + INNER,
        LEFT.top + 24,
        t(`journal.tab.${this.cursor.page}`),
        textStyle(44, COLORS.ink, FONTS.title),
      ),
    );
  }

  /** The count at the top right of the left page. */
  /** The count at the top right of the left page, or under a title too long to share its line. */
  private count(text: string): void {
    const count = this.keep(
      this.add
        .text(LEFT.right - INNER, LEFT.top + 50, text, textStyle(26, COLORS.ink))
        .setOrigin(1, 0.5)
        .setAlpha(0.7),
    );
    const titleEnd = (this.title?.x ?? 0) + (this.title?.width ?? 0);
    if (titleEnd + 24 > count.x - count.width) count.setY(LEFT.top + 98);
  }

  /**
   * Lays rows down the left page from the first one shown, moving it so the
   * chosen entry is on the paper. Returns the y of each row drawn.
   */
  private layRows(rows: readonly Row[], chosen: number): { row: Row; y: number }[] {
    const room = LIST_BOTTOM - LIST_TOP;
    const rowOf = rows.findIndex((row) => row.entries?.includes(chosen));
    let first = Math.min(this.scroll[this.cursor.page], Math.max(0, rowOf));
    // Keep a heading with the first row under it.
    if (first > 0 && rows[first - 1]?.heading !== undefined && rowOf === first) first -= 1;
    const fits = (from: number) => {
      let height = 0;
      for (let index = from; index <= rowOf; index++) height += rows[index]?.height ?? 0;
      return height <= room;
    };
    while (rowOf >= 0 && !fits(first)) first++;
    this.scroll[this.cursor.page] = first;
    const laid: { row: Row; y: number }[] = [];
    let y = LIST_TOP;
    for (let index = first; index < rows.length; index++) {
      const row = rows[index] as Row;
      if (y + row.height > LIST_BOTTOM + 1) break;
      laid.push({ row, y });
      y += row.height;
    }
    return laid;
  }

  /** A soft wash behind the chosen entry, as if pencilled round. */
  private ring(x: number, y: number, w: number, h: number): void {
    const ring = this.keep(this.add.graphics());
    ring.fillStyle(WASH, 0.6);
    ring.fillRoundedRect(x, y, w, h, 12);
    ring.lineStyle(2, PENCIL, 0.55);
    ring.strokeRoundedRect(x, y, w, h, 12);
  }

  private dot(x: number, y: number): void {
    this.keep(this.add.circle(x, y, 7, NEW_DOT, 1));
  }

  /** A picture fitted into a box, faint when not found yet. */
  private picture(name: string | null, x: number, y: number, box: number, found: boolean): void {
    const image = this.keep(this.add.image(x, y, ensureTexture(this, name ?? 'icon.type.find')));
    const scale = Math.min(box / image.width, box / image.height);
    image.setScale(scale);
    if (!found) image.setTint(PENCIL).setAlpha(0.12);
  }

  private chooseOnClick(object: Phaser.GameObjects.GameObject, index: number, then?: () => void) {
    (object as Phaser.GameObjects.Zone)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        if (this.cursor.index === index && then) then();
        this.cursor = { page: this.cursor.page, index };
        this.render();
      });
  }

  /** Text on the right page, wrapped to its width. Returns the y under it. */
  private write(
    text: string,
    y: number,
    size: number,
    alpha = 1,
    font: string = FONTS.text,
  ): number {
    const style = {
      ...textStyle(size, COLORS.ink, font),
      align: 'center',
      wordWrap: { width: TEXT_WIDTH, useAdvancedWrap: true },
      lineSpacing: size === 26 ? 12 : 6,
    };
    const shown = this.keep(
      this.add.text(RIGHT_X, y, text, style).setOrigin(0.5, 0).setAlpha(alpha),
    );
    return y + shown.height;
  }

  private drawDiscoveries(): void {
    const found = DISCOVERIES.filter((one) => this.life.discoveries.has(one.id)).length;
    this.count(t('journal.count', { found, total: DISCOVERIES.length }));
    const rows: Row[] = [];
    for (const group of DISCOVERY_GROUPS) {
      rows.push({ height: 52, heading: t(`journal.group.${group}`) });
      const ids = DISCOVERIES.map((one, index) => ({ one, index })).filter(
        (entry) => entry.one.group === group,
      );
      for (let at = 0; at < ids.length; at += 4) {
        rows.push({ height: 130, entries: ids.slice(at, at + 4).map((entry) => entry.index) });
      }
    }
    const cell = (LEFT.right - LEFT.left - 2 * INNER) / 4;
    for (const { row, y } of this.layRows(rows, this.cursor.index)) {
      if (row.heading !== undefined) {
        this.keep(
          this.add
            .text(LEFT.left + INNER, y + 30, row.heading, textStyle(24, COLORS.ink))
            .setOrigin(0, 0.5)
            .setAlpha(0.7),
        );
        continue;
      }
      (row.entries ?? []).forEach((index, column) => {
        const entry = DISCOVERIES[index] as DiscoveryEntry;
        const x = LEFT.left + INNER + cell * column + cell / 2;
        const middle = y + 62;
        if (index === this.cursor.index) this.ring(x - cell / 2 + 6, y + 6, cell - 12, 116);
        this.picture(entry.image, x, middle, 92, this.life.discoveries.has(entry.id));
        if (this.isNew('discoveries', entry.id)) this.dot(x + cell / 2 - 20, y + 20);
        this.chooseOnClick(this.keep(this.add.zone(x, middle, cell, 124)), index);
      });
    }
    const chosen = DISCOVERIES[this.cursor.index];
    if (!chosen) return;
    const known = this.life.discoveries.has(chosen.id);
    const wash = this.keep(this.add.graphics());
    if (known) {
      wash.fillStyle(WASH, 0.55);
      wash.fillCircle(RIGHT_X + 10, 420, 200);
    }
    this.picture(chosen.image, RIGHT_X, 410, 360, known);
    if (!known) {
      this.write(t('journal.notYet'), 680, 26, 0.7);
      return;
    }
    const y = this.write(t(`name.${chosen.id}`), 660, 34, 1, FONTS.title);
    const where =
      chosen.group === 'places' ? null : whereFrom(this.life, 'foundIn', chosen.id, AREA_IDS);
    if (where) this.write(t('journal.where', { place: t(`name.place.${where}`) }), y + 24, 26);
  }

  private drawCompanions(): void {
    const met = this.companions();
    this.count(t('journal.count', { found: met.length, total: COMPANION_IDS.length }));
    if (met.length === 0) {
      this.write(t('journal.noCompanion'), 500, 26, 0.7);
      return;
    }
    met.forEach((id, index) => {
      const y = LIST_TOP + 20 + index * 200;
      if (index === this.cursor.index)
        this.ring(LEFT.left + INNER, y, LEFT.right - LEFT.left - 2 * INNER, 180);
      this.picture(`icon.companion.${id}`, LEFT.left + 130, y + 90, 150, true);
      this.keep(
        this.add
          .text(
            LEFT.left + 240,
            y + 90,
            t(`companion.${id}.name`),
            textStyle(34, COLORS.ink, FONTS.title),
          )
          .setOrigin(0, 0.5),
      );
      const zone = this.add.zone((LEFT.left + LEFT.right) / 2, y + 90, LEFT.right - LEFT.left, 180);
      this.chooseOnClick(this.keep(zone), index);
    });
    const id = met[this.cursor.index] as CompanionId | undefined;
    if (!id) return;
    this.picture(`icon.companion.${id}`, RIGHT_X, 290, 230, true);
    this.write(t(`companion.${id}.name`), 420, 34, 1, FONTS.title);
    // Four stamps: those reached inked, the rest in pencil. No bar (doc 12).
    const stage = STAGES.indexOf(stageOf(this.life.bonds[id] ?? 0, PROGRESS_DEFS.bondStages));
    STAGES.forEach((name, index) => {
      const x = RIGHT_X + (index - 1.5) * 130;
      const stamp = this.keep(this.add.image(x, 540, ensureTexture(this, `icon.bond.${name}`)));
      stamp.setDisplaySize(80, 80);
      if (index > stage) stamp.setTint(PENCIL).setAlpha(0.25);
      this.keep(
        this.add
          .text(x, 600, t(`bond.${name}`), textStyle(20, COLORS.ink))
          .setOrigin(0.5, 0)
          .setAlpha(index > stage ? 0.45 : 0.85),
      );
    });
    let y = 660;
    for (const line of companionLines(id, this.life, PROGRESS_DEFS.bondStages, AREA_IDS)) {
      y = this.write(this.companionText(id, line), y, 26) + 10;
    }
  }

  private companionText(id: CompanionId, line: CompanionLine): string {
    switch (line.line) {
      case 'look':
      case 'way':
      case 'more':
        return t(`companion.${id}.${line.line}`);
      case 'met':
        return t('companion.met', { place: t(`name.place.${line.area}`) });
      case 'favourite':
        return t('companion.favourite', { food: t(`name.food.${COMPANIONS[id].favourite}`) });
      case 'fled':
        return t('companion.memory.fled', { threat: t(`companion.memory.threat.${line.threat}`) });
      case 'yourMolt':
      case 'herMolt':
        return t(`companion.memory.${line.line}`);
    }
  }

  private drawCards(): void {
    const cards = this.cards();
    const total = CARDS.filter((card) => card.released || this.unreleased).length;
    const remaining = Math.max(0, total - cards.length);
    if (remaining > 0) this.count(t('journal.remaining', { n: remaining }));
    const rows: Row[] = cards.map((_, index) => ({ height: 64, entries: [index] }));
    for (const { row, y } of this.layRows(rows, this.cursor.index)) {
      const index = row.entries?.[0] ?? 0;
      const id = cards[index] as string;
      if (index === this.cursor.index)
        this.ring(LEFT.left + INNER, y + 4, LEFT.right - LEFT.left - 2 * INNER, 56);
      this.keep(
        this.add
          .text(LEFT.left + INNER + 24, y + 32, t(`card.${id}.name`), textStyle(28, COLORS.ink))
          .setOrigin(0, 0.5),
      );
      if (this.isNew('feel', id)) this.dot(LEFT.right - INNER - 20, y + 32);
      const zone = this.add.zone((LEFT.left + LEFT.right) / 2, y + 32, LEFT.right - LEFT.left, 60);
      this.chooseOnClick(this.keep(zone), index);
    }
    const id = cards[this.cursor.index];
    const card = CARDS.find((one) => one.id === id);
    if (!id || !card) return;
    let y = this.write(t(`card.${id}.name`), RIGHT.top + 80, 34, 1, FONTS.title);
    y = this.write(t(`card.${id}.text`), y + 36, 26);
    const source = card.sources.map((key) => t(`source.${key}`)).join('; ');
    this.write(t('journal.source', { source }), y + 36, 20, 0.7);
  }

  private drawChallenges(): void {
    const lines = this.challengeLines();
    this.count(
      t('journal.count', { found: lines.filter((line) => line.done).length, total: lines.length }),
    );
    const rows: Row[] = [];
    let chapter = -1;
    lines.forEach((line, index) => {
      if (line.chapter !== chapter) {
        chapter = line.chapter;
        const area = CHAPTERS.find((one) => one.chapter === chapter)?.area ?? 'drift';
        rows.push({ height: 52, heading: t(`name.place.${area}`) });
      }
      rows.push({ height: 60, entries: [index] });
    });
    const width = LEFT.right - LEFT.left - 2 * INNER;
    for (const { row, y } of this.layRows(rows, this.cursor.index)) {
      if (row.heading !== undefined) {
        this.keep(
          this.add
            .text(LEFT.left + INNER, y + 30, row.heading, textStyle(24, COLORS.ink))
            .setOrigin(0, 0.5)
            .setAlpha(0.7),
        );
        continue;
      }
      const index = row.entries?.[0] ?? 0;
      const line = lines[index] as ChallengeLine;
      const middle = y + 30;
      if (index === this.cursor.index) this.ring(LEFT.left + INNER, y + 3, width, 54);
      const type = CHALLENGE_TYPE.get(line.id) ?? 'find';
      this.keep(
        this.add
          .image(LEFT.left + INNER + 30, middle, ensureTexture(this, `icon.type.${type}`))
          .setDisplaySize(40, 40),
      );
      const name = this.keep(
        this.add
          .text(
            LEFT.left + INNER + 64,
            middle,
            t(`challenge.${line.id}.name`),
            textStyle(26, COLORS.ink),
          )
          .setOrigin(0, 0.5),
      );
      this.keep(
        this.add
          .text(
            LEFT.right - INNER - 16,
            middle,
            `${line.value}/${line.target}`,
            textStyle(24, COLORS.ink),
          )
          .setOrigin(1, 0.5)
          .setAlpha(0.75),
      );
      if (line.pinned) this.pin(LEFT.right - INNER - 100, middle);
      // Done: inked through with one pencil stroke.
      if (line.done) {
        const stroke = this.keep(this.add.graphics());
        stroke.lineStyle(2.5, PENCIL, 0.7);
        stroke.lineBetween(name.x - 4, middle + 2, name.x + name.width + 6, middle - 1);
      }
      const zone = this.add.zone((LEFT.left + LEFT.right) / 2, middle, width, 56);
      this.chooseOnClick(this.keep(zone), index, () => this.accept());
    }
    const line = lines[this.cursor.index];
    if (!line) return;
    let y = this.write(t(`challenge.${line.id}.name`), RIGHT.top + 120, 34, 1, FONTS.title);
    y = this.write(t(`challenge.${line.id}.what`), y + 30, 26);
    const where = line.best
      ? t('journal.best', { value: line.value, target: line.target })
      : `${line.value}/${line.target}`;
    y = this.write(where, y + 30, 26, 0.8);
    if (line.pinned) {
      this.pin(RIGHT_X, y + 50);
      this.write(t('line.pinned', { name: t(`challenge.${line.id}.name`) }), y + 80, 22, 0.75);
    }
  }

  /** A small pin mark: a round head and its point, in pencil. */
  private pin(x: number, y: number): void {
    const pin = this.keep(this.add.graphics());
    pin.fillStyle(NEW_DOT, 0.9);
    pin.fillCircle(x, y - 6, 8);
    pin.lineStyle(2.5, PENCIL, 0.8);
    pin.strokeCircle(x, y - 6, 8);
    pin.lineBetween(x, y + 2, x - 4, y + 16);
  }

  private drawAchievements(): void {
    const earned = ACHIEVEMENTS.filter((one) => this.life.achievements.has(one.id)).length;
    this.count(t('journal.count', { found: earned, total: ACHIEVEMENTS.length }));
    const columns = 5;
    const cell = (LEFT.right - LEFT.left - 2 * INNER) / columns;
    const rows: Row[] = [];
    for (let at = 0; at < ACHIEVEMENTS.length; at += columns) {
      rows.push({
        height: 140,
        entries: ACHIEVEMENTS.slice(at, at + columns).map((_, offset) => at + offset),
      });
    }
    for (const { row, y } of this.layRows(rows, this.cursor.index)) {
      (row.entries ?? []).forEach((index, column) => {
        const def = ACHIEVEMENTS[index];
        if (!def) return;
        const x = LEFT.left + INNER + cell * column + cell / 2;
        const middle = y + 70;
        if (index === this.cursor.index) this.ring(x - cell / 2 + 4, y + 6, cell - 8, 128);
        this.stamp(def.id, x, middle, 104);
        if (this.isNew('achievements', def.id)) this.dot(x + cell / 2 - 16, y + 20);
        this.chooseOnClick(this.keep(this.add.zone(x, middle, cell, 132)), index);
      });
    }
    const def = ACHIEVEMENTS[this.cursor.index];
    if (!def) return;
    this.stamp(def.id, RIGHT_X, 360, 300);
    const y = this.write(t(`ach.${def.id}.name`), 560, 34, 1, FONTS.title);
    const shown =
      chaptersReached(PROGRESS_DEFS, this.life).has(def.chapter) ||
      this.life.achievements.has(def.id);
    this.write(shown ? t(`ach.${def.id}.how`) : t('journal.later'), y + 30, 26, 0.85);
  }

  /** A stamp, inked and washed when earned; a faint pencil circle when not. */
  private stamp(id: string, x: number, y: number, size: number): void {
    if (this.life.achievements.has(id)) {
      this.keep(
        this.add.image(x, y, ensureTexture(this, `icon.ach.${id}`)).setDisplaySize(size, size),
      );
      return;
    }
    const circle = this.keep(this.add.graphics());
    circle.lineStyle(2, PENCIL, 0.25);
    circle.strokeCircle(x, y, size * 0.46);
  }
}
