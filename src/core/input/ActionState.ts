import { ACTIONS, type Action, type ActionInput } from './actions';
import type { Bindings } from './bindings';

export type ActionMode = 'hold' | 'toggle';

/**
 * Turns key presses into actions. It knows nothing about the browser: an
 * adapter feeds it `keyDown` and `keyUp`, and the game calls `update` once
 * per frame before reading.
 */
export class ActionState implements ActionInput {
  private bindings: Bindings;
  private readonly modes = new Map<Action, ActionMode>();
  private readonly downCodes = new Set<string>();
  /** What the game sees as held, after hold or toggle is applied. */
  private readonly active = new Set<Action>();
  private readonly queuedPressed = new Set<Action>();
  private readonly queuedReleased = new Set<Action>();
  private framePressed = new Set<Action>();
  private frameReleased = new Set<Action>();

  constructor(bindings: Bindings) {
    this.bindings = bindings;
  }

  setBindings(bindings: Bindings): void {
    this.bindings = bindings;
    this.reset();
  }

  /** In toggle mode one press starts the action and the next one stops it. */
  setMode(action: Action, mode: ActionMode): void {
    this.modes.set(action, mode);
    this.setActive(action, false);
  }

  /** Is this key bound to anything? The adapter uses it to decide what to swallow. */
  isBound(code: string): boolean {
    return this.actionsFor(code).length > 0;
  }

  keyDown(code: string): void {
    if (this.downCodes.has(code)) return; // key repeat
    const actions = this.actionsFor(code);
    const wasHeld = actions.map((action) => this.isPhysicallyDown(action));
    this.downCodes.add(code);
    actions.forEach((action, index) => {
      if (wasHeld[index]) return;
      if (this.modes.get(action) === 'toggle') {
        this.setActive(action, !this.active.has(action));
      } else {
        this.setActive(action, true);
      }
    });
  }

  keyUp(code: string): void {
    if (!this.downCodes.delete(code)) return;
    for (const action of this.actionsFor(code)) {
      if (this.modes.get(action) === 'toggle') continue;
      if (!this.isPhysicallyDown(action)) this.setActive(action, false);
    }
  }

  /** Let go of everything, for instance when the window loses focus. */
  releaseAll(): void {
    this.downCodes.clear();
    for (const action of ACTIONS) this.setActive(action, false);
  }

  /** Forget everything, including presses not yet seen by the game. */
  reset(): void {
    this.downCodes.clear();
    this.active.clear();
    this.queuedPressed.clear();
    this.queuedReleased.clear();
    this.framePressed = new Set();
    this.frameReleased = new Set();
  }

  /**
   * Drop presses and releases the game has not seen yet, and keep what is held.
   * Used when play starts or resumes, so a key pressed in a menu does nothing.
   */
  clearQueued(): void {
    this.queuedPressed.clear();
    this.queuedReleased.clear();
    this.framePressed = new Set();
    this.frameReleased = new Set();
  }

  /** Call once per frame, before reading. */
  update(): void {
    this.framePressed = new Set(this.queuedPressed);
    this.frameReleased = new Set(this.queuedReleased);
    this.queuedPressed.clear();
    this.queuedReleased.clear();
  }

  isDown(action: Action): boolean {
    return this.active.has(action);
  }

  justPressed(action: Action): boolean {
    return this.framePressed.has(action);
  }

  justReleased(action: Action): boolean {
    return this.frameReleased.has(action);
  }

  axis(): { x: number; y: number } {
    const x = (this.isDown('moveRight') ? 1 : 0) - (this.isDown('moveLeft') ? 1 : 0);
    const y = (this.isDown('moveDown') ? 1 : 0) - (this.isDown('moveUp') ? 1 : 0);
    if (x !== 0 && y !== 0) return { x: x * Math.SQRT1_2, y: y * Math.SQRT1_2 };
    return { x, y };
  }

  private setActive(action: Action, on: boolean): void {
    if (on === this.active.has(action)) return;
    if (on) {
      this.active.add(action);
      this.queuedPressed.add(action);
    } else {
      this.active.delete(action);
      this.queuedReleased.add(action);
    }
  }

  private isPhysicallyDown(action: Action): boolean {
    const [first, second] = this.bindings[action];
    return (
      (first !== null && this.downCodes.has(first)) ||
      (second !== null && this.downCodes.has(second))
    );
  }

  private actionsFor(code: string): Action[] {
    return ACTIONS.filter((action) => {
      const pair = this.bindings[action];
      return pair[0] === code || pair[1] === code;
    });
  }
}
