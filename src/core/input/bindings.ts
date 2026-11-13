import { ACTIONS, type Action } from './actions';

/**
 * Key bindings. Keys are stored by physical position (`KeyboardEvent.code`),
 * so the default movement keys sit in the same place on every keyboard layout.
 * See docs/03-controls.md.
 */
export type Slot = 0 | 1;
export type BindingPair = readonly [string | null, string | null];
export type Bindings = Readonly<Record<Action, BindingPair>>;

export const DEFAULT_BINDINGS: Bindings = {
  moveUp: ['KeyW', 'ArrowUp'],
  moveDown: ['KeyS', 'ArrowDown'],
  moveLeft: ['KeyA', 'ArrowLeft'],
  moveRight: ['KeyD', 'ArrowRight'],
  tailFlip: ['Space', null],
  interact: ['KeyE', 'Enter'],
  sense: ['KeyQ', null],
  hide: ['ShiftLeft', 'KeyC'],
  greet: ['KeyF', null],
  journal: ['KeyJ', 'Tab'],
  pause: ['Escape', 'KeyP'],
};

export const PRESET_IDS = ['wasd', 'arrows', 'leftHand', 'rightHand'] as const;
export type PresetId = (typeof PRESET_IDS)[number];

export const PRESETS: Readonly<Record<PresetId, Bindings>> = {
  /** Movement on the letter keys only. The arrows are left free. */
  wasd: {
    ...DEFAULT_BINDINGS,
    moveUp: ['KeyW', null],
    moveDown: ['KeyS', null],
    moveLeft: ['KeyA', null],
    moveRight: ['KeyD', null],
  },
  /** Movement on the arrows only. The letter keys are left free. */
  arrows: {
    ...DEFAULT_BINDINGS,
    moveUp: ['ArrowUp', null],
    moveDown: ['ArrowDown', null],
    moveLeft: ['ArrowLeft', null],
    moveRight: ['ArrowRight', null],
  },
  /** Everything within reach of the left hand. */
  leftHand: {
    moveUp: ['KeyW', null],
    moveDown: ['KeyS', null],
    moveLeft: ['KeyA', null],
    moveRight: ['KeyD', null],
    tailFlip: ['Space', null],
    interact: ['KeyE', null],
    sense: ['KeyQ', null],
    hide: ['ShiftLeft', 'KeyC'],
    greet: ['KeyF', null],
    journal: ['Tab', 'KeyR'],
    pause: ['Escape', 'Backquote'],
  },
  /** Everything within reach of the right hand, around the arrow keys. */
  rightHand: {
    moveUp: ['ArrowUp', null],
    moveDown: ['ArrowDown', null],
    moveLeft: ['ArrowLeft', null],
    moveRight: ['ArrowRight', null],
    tailFlip: ['ShiftRight', 'Numpad0'],
    interact: ['Enter', null],
    sense: ['Slash', null],
    hide: ['Period', null],
    greet: ['Comma', null],
    journal: ['Quote', null],
    pause: ['Escape', 'Backslash'],
  },
};

/** Escape always opens the pause menu, so that slot can never be changed. */
export function isLocked(action: Action, slot: Slot): boolean {
  return action === 'pause' && slot === 0;
}

const RESERVED = new Set([
  '',
  'Unidentified',
  'Escape',
  'MetaLeft',
  'MetaRight',
  'OSLeft',
  'OSRight',
  'ContextMenu',
  // Held with a letter these trigger browser shortcuts, such as closing the tab.
  'ControlLeft',
  'ControlRight',
  'AltLeft',
  'AltRight',
]);

/** Can this key be given to an action? Keys the browser owns cannot. */
export function isBindable(code: string): boolean {
  if (RESERVED.has(code)) return false;
  if (/^F\d{1,2}$/.test(code)) return false;
  return true;
}

export interface BindingRef {
  action: Action;
  slot: Slot;
}

/** Which action and slot use this key, if any. */
export function findBinding(bindings: Bindings, code: string): BindingRef | null {
  for (const action of ACTIONS) {
    const pair = bindings[action];
    if (pair[0] === code) return { action, slot: 0 };
    if (pair[1] === code) return { action, slot: 1 };
  }
  return null;
}

function withSlot(bindings: Bindings, action: Action, slot: Slot, code: string | null): Bindings {
  const pair = bindings[action];
  const next: BindingPair = slot === 0 ? [code, pair[1]] : [pair[0], code];
  return { ...bindings, [action]: next };
}

function keyCount(pair: BindingPair): number {
  return (pair[0] === null ? 0 : 1) + (pair[1] === null ? 0 : 1);
}

export type RebindResult =
  | {
      ok: true;
      bindings: Bindings;
      /** Set when the key was taken from another slot, which got `now` in exchange. */
      displaced?: BindingRef & { now: string | null };
    }
  | {
      ok: false;
      /**
       * reserved: the browser owns this key.
       * locked: this slot cannot be changed.
       * wouldUnbind: taking the key would leave `action` with no key at all.
       */
      reason: 'reserved' | 'locked' | 'wouldUnbind';
      action?: Action;
    };

/**
 * Give `code` to a slot. If another slot already uses it, the two swap.
 * Nothing is changed when the result is not ok.
 */
export function rebind(bindings: Bindings, action: Action, slot: Slot, code: string): RebindResult {
  if (isLocked(action, slot)) return { ok: false, reason: 'locked' };
  if (!isBindable(code)) return { ok: false, reason: 'reserved' };

  const previous = bindings[action][slot];
  if (previous === code) return { ok: true, bindings };

  const holder = findBinding(bindings, code);
  if (!holder) return { ok: true, bindings: withSlot(bindings, action, slot, code) };

  if (isLocked(holder.action, holder.slot)) return { ok: false, reason: 'locked' };

  // Swap: the other slot receives what this slot held.
  if (previous === null && holder.action !== action && keyCount(bindings[holder.action]) === 1) {
    return { ok: false, reason: 'wouldUnbind', action: holder.action };
  }
  let next = withSlot(bindings, holder.action, holder.slot, previous);
  next = withSlot(next, action, slot, code);
  return { ok: true, bindings: next, displaced: { ...holder, now: previous } };
}

export type ClearResult =
  { ok: true; bindings: Bindings } | { ok: false; reason: 'locked' | 'lastKey' };

/** Empty a slot. Every action must keep at least one key. */
export function clearSlot(bindings: Bindings, action: Action, slot: Slot): ClearResult {
  if (isLocked(action, slot)) return { ok: false, reason: 'locked' };
  const pair = bindings[action];
  if (pair[slot] === null) return { ok: true, bindings };
  if (keyCount(pair) === 1) return { ok: false, reason: 'lastKey' };
  return { ok: true, bindings: withSlot(bindings, action, slot, null) };
}

/**
 * Turn anything loaded from storage into valid bindings. Whatever is missing,
 * malformed, reserved or used twice falls back to the default for that slot,
 * or to empty if the default key is already taken.
 */
export function sanitizeBindings(raw: unknown): Bindings {
  const source = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;
  const used = new Set<string>(['Escape']);
  const result = {} as Record<Action, [string | null, string | null]>;

  const accept = (code: unknown): string | null => {
    if (typeof code !== 'string' || !isBindable(code) || used.has(code)) return null;
    used.add(code);
    return code;
  };

  // First pass: keep every stored key that is valid and not a duplicate.
  const incomplete: Action[] = [];
  for (const action of ACTIONS) {
    const stored = source[action];
    if (!Array.isArray(stored)) {
      result[action] = [isLocked(action, 0) ? 'Escape' : null, null];
      incomplete.push(action);
      continue;
    }
    const pair: [string | null, string | null] = [
      isLocked(action, 0) ? 'Escape' : accept(stored[0]),
      isLocked(action, 1) ? null : accept(stored[1]),
    ];
    result[action] = pair;
    if (pair[0] === null && pair[1] === null) incomplete.push(action);
  }

  // Second pass: an action with nothing stored, or left with no key, gets its
  // defaults back where they are still free.
  for (const action of incomplete) {
    const pair = result[action];
    const fallback = DEFAULT_BINDINGS[action];
    if (pair[0] === null) pair[0] = accept(fallback[0]);
    if (pair[1] === null) pair[1] = accept(fallback[1]);
  }

  return result;
}

export function bindingsEqual(a: Bindings, b: Bindings): boolean {
  return ACTIONS.every((action) => a[action][0] === b[action][0] && a[action][1] === b[action][1]);
}
