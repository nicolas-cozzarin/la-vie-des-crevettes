import { describe, expect, it } from 'vitest';
import { ACTIONS } from '../../src/core/input/actions';
import {
  DEFAULT_BINDINGS,
  PRESETS,
  PRESET_IDS,
  bindingsEqual,
  clearSlot,
  findBinding,
  isBindable,
  isLocked,
  rebind,
  sanitizeBindings,
  type Bindings,
} from '../../src/core/input/bindings';

function allKeys(bindings: Bindings): string[] {
  return ACTIONS.flatMap((action) => bindings[action]).filter((code) => code !== null);
}

describe('default bindings', () => {
  it('match the table in docs/03-controls.md', () => {
    expect(DEFAULT_BINDINGS).toEqual({
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
    });
  });

  it('use no key twice', () => {
    const keys = allKeys(DEFAULT_BINDINGS);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe('presets', () => {
  it.each(PRESET_IDS)('%s gives every action a key and uses no key twice', (id) => {
    const preset = PRESETS[id];
    for (const action of ACTIONS) {
      expect(
        preset[action].some((code) => code !== null),
        action,
      ).toBe(true);
    }
    const keys = allKeys(preset);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it.each(PRESET_IDS)('%s keeps Escape on pause and survives a round trip', (id) => {
    expect(PRESETS[id].pause[0]).toBe('Escape');
    expect(bindingsEqual(sanitizeBindings(PRESETS[id]), PRESETS[id])).toBe(true);
  });
});

describe('isBindable', () => {
  it('refuses keys the browser owns', () => {
    for (const code of ['F1', 'F5', 'F12', 'MetaLeft', 'OSRight', 'ControlLeft', 'AltRight', '']) {
      expect(isBindable(code), code).toBe(false);
    }
  });

  it('refuses Escape, which always opens the pause menu', () => {
    expect(isBindable('Escape')).toBe(false);
  });

  it('accepts ordinary keys', () => {
    for (const code of ['KeyG', 'Space', 'ShiftRight', 'Digit1', 'Numpad0', 'Comma']) {
      expect(isBindable(code), code).toBe(true);
    }
  });
});

describe('rebind', () => {
  it('gives a free key to a slot', () => {
    const result = rebind(DEFAULT_BINDINGS, 'tailFlip', 0, 'KeyG');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.bindings.tailFlip).toEqual(['KeyG', null]);
    expect(result.displaced).toBeUndefined();
    expect(findBinding(result.bindings, 'Space')).toBeNull();
  });

  it('does not change the bindings it was given', () => {
    rebind(DEFAULT_BINDINGS, 'tailFlip', 0, 'KeyG');
    expect(DEFAULT_BINDINGS.tailFlip).toEqual(['Space', null]);
  });

  it('swaps when the key belongs to another action', () => {
    const result = rebind(DEFAULT_BINDINGS, 'tailFlip', 0, 'KeyE');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.bindings.tailFlip).toEqual(['KeyE', null]);
    expect(result.bindings.interact).toEqual(['Space', 'Enter']);
    expect(result.displaced).toEqual({ action: 'interact', slot: 0, now: 'Space' });
  });

  it('leaves the other slot empty when this slot had no key to give back', () => {
    const result = rebind(DEFAULT_BINDINGS, 'tailFlip', 1, 'KeyE');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.bindings.tailFlip).toEqual(['Space', 'KeyE']);
    expect(result.bindings.interact).toEqual([null, 'Enter']);
    expect(result.displaced).toEqual({ action: 'interact', slot: 0, now: null });
  });

  it('refuses a swap that would leave another action with no key', () => {
    const result = rebind(DEFAULT_BINDINGS, 'tailFlip', 1, 'KeyQ');
    expect(result).toEqual({ ok: false, reason: 'wouldUnbind', action: 'sense' });
  });

  it('swaps the two slots of one action', () => {
    const result = rebind(DEFAULT_BINDINGS, 'interact', 0, 'Enter');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.bindings.interact).toEqual(['Enter', 'KeyE']);
  });

  it('refuses reserved keys', () => {
    expect(rebind(DEFAULT_BINDINGS, 'tailFlip', 0, 'F5')).toEqual({
      ok: false,
      reason: 'reserved',
    });
    expect(rebind(DEFAULT_BINDINGS, 'tailFlip', 0, 'Escape')).toEqual({
      ok: false,
      reason: 'reserved',
    });
  });

  it('never changes the Escape slot of pause', () => {
    expect(isLocked('pause', 0)).toBe(true);
    expect(rebind(DEFAULT_BINDINGS, 'pause', 0, 'KeyG')).toEqual({ ok: false, reason: 'locked' });
  });

  it('is a no-op when the slot already has the key', () => {
    const result = rebind(DEFAULT_BINDINGS, 'tailFlip', 0, 'Space');
    expect(result).toEqual({ ok: true, bindings: DEFAULT_BINDINGS });
  });

  it('never leaves a key on two actions', () => {
    let bindings = DEFAULT_BINDINGS;
    const presses: [(typeof ACTIONS)[number], 0 | 1, string][] = [
      ['tailFlip', 0, 'KeyE'],
      ['greet', 1, 'Space'],
      ['hide', 0, 'KeyW'],
      ['moveUp', 1, 'KeyC'],
      ['journal', 0, 'ArrowUp'],
    ];
    for (const [action, slot, code] of presses) {
      const result = rebind(bindings, action, slot, code);
      if (result.ok) bindings = result.bindings;
    }
    const keys = allKeys(bindings);
    expect(new Set(keys).size).toBe(keys.length);
    for (const action of ACTIONS) {
      expect(
        bindings[action].some((code) => code !== null),
        action,
      ).toBe(true);
    }
  });
});

describe('clearSlot', () => {
  it('empties a slot when the action has another key', () => {
    const result = clearSlot(DEFAULT_BINDINGS, 'interact', 1);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.bindings.interact).toEqual(['KeyE', null]);
  });

  it('refuses to clear the last key of an action', () => {
    expect(clearSlot(DEFAULT_BINDINGS, 'tailFlip', 0)).toEqual({ ok: false, reason: 'lastKey' });
  });

  it('refuses to clear Escape from pause', () => {
    expect(clearSlot(DEFAULT_BINDINGS, 'pause', 0)).toEqual({ ok: false, reason: 'locked' });
  });

  it('does nothing to a slot that is already empty', () => {
    expect(clearSlot(DEFAULT_BINDINGS, 'tailFlip', 1)).toEqual({
      ok: true,
      bindings: DEFAULT_BINDINGS,
    });
  });
});

describe('sanitizeBindings', () => {
  it('returns the defaults for anything that is not bindings', () => {
    for (const raw of [null, undefined, 42, 'x', []]) {
      expect(bindingsEqual(sanitizeBindings(raw), DEFAULT_BINDINGS)).toBe(true);
    }
  });

  it('keeps valid stored keys', () => {
    const stored = { ...DEFAULT_BINDINGS, tailFlip: ['KeyG', null] };
    expect(sanitizeBindings(stored).tailFlip).toEqual(['KeyG', null]);
  });

  it('puts Escape back on pause whatever was stored', () => {
    const stored = { ...DEFAULT_BINDINGS, pause: ['KeyX', 'KeyP'] };
    expect(sanitizeBindings(stored).pause).toEqual(['Escape', 'KeyP']);
  });

  it('drops reserved keys and keys used twice', () => {
    const stored = {
      ...DEFAULT_BINDINGS,
      tailFlip: ['F5', 'KeyE'],
      greet: ['KeyE', 'KeyF'],
    };
    const clean = sanitizeBindings(stored);
    const keys = allKeys(clean);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys).not.toContain('F5');
    for (const action of ACTIONS) {
      expect(
        clean[action].some((code) => code !== null),
        action,
      ).toBe(true);
    }
  });

  it('gives an action its default back when nothing valid was stored for it', () => {
    const stored = { ...DEFAULT_BINDINGS, sense: [null, null] };
    expect(sanitizeBindings(stored).sense).toEqual(['KeyQ', null]);
  });
});
