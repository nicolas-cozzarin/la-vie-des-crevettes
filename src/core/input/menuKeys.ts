import type { Action } from './actions';
import { findBinding, type Bindings } from './bindings';

/** What a key means inside a menu. */
export type MenuKey = 'up' | 'down' | 'left' | 'right' | 'accept' | 'back' | 'clear';

/** These always work in menus, whatever the player has bound. */
const FIXED: Readonly<Record<string, MenuKey>> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  Enter: 'accept',
  NumpadEnter: 'accept',
  Space: 'accept',
  Escape: 'back',
  Backspace: 'clear',
  Delete: 'clear',
};

/** The player's own movement and interact keys also work in menus. */
const FROM_ACTION: Partial<Record<Action, MenuKey>> = {
  moveUp: 'up',
  moveDown: 'down',
  moveLeft: 'left',
  moveRight: 'right',
  interact: 'accept',
};

/** What a key always means in menus, whatever is bound. */
export function fixedMenuKey(code: string): MenuKey | null {
  return FIXED[code] ?? null;
}

export function menuKeyFor(code: string, bindings: Bindings): MenuKey | null {
  const fixed = FIXED[code];
  if (fixed) return fixed;
  const bound = findBinding(bindings, code);
  return bound ? (FROM_ACTION[bound.action] ?? null) : null;
}
