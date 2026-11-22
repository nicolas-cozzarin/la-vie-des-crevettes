import { NarrationQueue } from '../core/narration/NarrationQueue';
import type { AreaId } from '../core/world/kinds';
import { NARRATION_LINES } from '../data/story';
import { NARRATION, PLACE_NAME } from '../data/tuning';
import { t } from '../i18n';
import type { HudScene } from '../scenes/HudScene';

/**
 * The narration line and the place names on the HUD (doc 12, "What shows
 * over play"). One line at a time, by the rules of `NarrationQueue`. A
 * place's name shows alone: the narration waits until it has gone.
 */
export class Narrator {
  private readonly queue: NarrationQueue;
  private place: { text: string; age: number } | null = null;

  constructor(
    private readonly hud: () => HudScene | null,
    narrated: Set<string>,
    private readonly placesSeen: Set<AreaId>,
  ) {
    this.queue = new NarrationQueue(NARRATION_LINES, NARRATION, (key) => t(key).length, narrated);
  }

  /** A line's moment has come. Returns whether it will show. */
  say(key: string): boolean {
    return this.queue.say(key);
  }

  /** Whether a line is showing or waiting. */
  get busy(): boolean {
    return this.queue.busy || this.place !== null;
  }

  /** The player enters a place: its name shows, alone, the first time. */
  enter(area: AreaId): void {
    if (this.placesSeen.has(area)) return;
    this.placesSeen.add(area);
    this.place = { text: t(`name.place.${area}`), age: 0 };
  }

  update(dt: number): void {
    const hud = this.hud();
    const place = this.place;
    if (place) {
      place.age += dt;
      const { fade, hold } = PLACE_NAME;
      const length = fade + hold + fade;
      const alpha = Math.max(0, Math.min(1, place.age / fade, (length - place.age) / fade));
      hud?.placeName(place.text, alpha);
      if (place.age >= length) {
        this.place = null;
        hud?.placeName(null, 0);
      }
      hud?.narrate(null, 0);
      return;
    }
    this.queue.step(dt);
    const current = this.queue.current;
    hud?.narrate(current ? t(current.key) : null, current?.alpha ?? 0);
  }

  /** Nothing shows any more, as when the scene ends. */
  clear(): void {
    this.hud()?.narrate(null, 0);
    this.hud()?.placeName(null, 0);
  }
}
