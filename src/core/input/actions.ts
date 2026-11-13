/** Everything the player can ask for. Game code asks about actions, never keys. */
export const ACTIONS = [
  'moveUp',
  'moveDown',
  'moveLeft',
  'moveRight',
  'tailFlip',
  'interact',
  'sense',
  'hide',
  'greet',
  'journal',
  'pause',
] as const;

export type Action = (typeof ACTIONS)[number];

export function isAction(value: unknown): value is Action {
  return typeof value === 'string' && (ACTIONS as readonly string[]).includes(value);
}

/** What the game reads each frame. Keyboard is one source; others can follow. */
export interface ActionInput {
  isDown(action: Action): boolean;
  justPressed(action: Action): boolean;
  justReleased(action: Action): boolean;
  /** Movement as a vector, each axis from -1 to 1, normalised on diagonals. */
  axis(): { x: number; y: number };
}
