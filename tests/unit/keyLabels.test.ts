import { describe, expect, it } from 'vitest';
import { keyLabel, usLabel } from '../../src/core/input/keyLabels';
import { menuKeyFor } from '../../src/core/input/menuKeys';
import { DEFAULT_BINDINGS, PRESETS } from '../../src/core/input/bindings';

describe('keyLabel', () => {
  it('shows nothing for an empty slot', () => {
    expect(keyLabel(null)).toBe('');
  });

  it('shows arrows as arrows', () => {
    expect(keyLabel('ArrowUp')).toBe('↑');
    expect(keyLabel('ArrowLeft')).toBe('←');
  });

  it('uses the given names for keys without a letter', () => {
    expect(keyLabel('Space', { named: { Space: 'Espace' } })).toBe('Espace');
  });

  it('prefers the keyboard layout: W position prints Z on AZERTY', () => {
    const layout = new Map([['KeyW', 'z']]);
    expect(keyLabel('KeyW', { layout })).toBe('Z');
  });

  it('falls back to a letter seen earlier, then to the US label', () => {
    expect(keyLabel('KeyQ', { observed: { KeyQ: 'a' } })).toBe('A');
    expect(keyLabel('KeyQ', { observed: new Map([['KeyQ', 'a']]) })).toBe('A');
    expect(keyLabel('KeyQ')).toBe('Q');
  });

  it('ignores blank letters', () => {
    expect(keyLabel('KeyQ', { observed: { KeyQ: ' ' } })).toBe('Q');
  });
});

describe('usLabel', () => {
  it('names letters, digits, numpad keys and punctuation', () => {
    expect(usLabel('KeyE')).toBe('E');
    expect(usLabel('Digit4')).toBe('4');
    expect(usLabel('Numpad0')).toBe('Num 0');
    expect(usLabel('Comma')).toBe(',');
  });

  it('returns the code itself when it knows nothing better', () => {
    expect(usLabel('ShiftRight')).toBe('ShiftRight');
  });
});

describe('menuKeyFor', () => {
  it('always understands arrows, Enter, Escape and Backspace', () => {
    const bindings = PRESETS.wasd;
    expect(menuKeyFor('ArrowUp', bindings)).toBe('up');
    expect(menuKeyFor('ArrowRight', bindings)).toBe('right');
    expect(menuKeyFor('Enter', bindings)).toBe('accept');
    expect(menuKeyFor('Escape', bindings)).toBe('back');
    expect(menuKeyFor('Backspace', bindings)).toBe('clear');
    expect(menuKeyFor('Delete', bindings)).toBe('clear');
  });

  it("also understands the player's movement and interact keys", () => {
    expect(menuKeyFor('KeyW', DEFAULT_BINDINGS)).toBe('up');
    expect(menuKeyFor('KeyA', DEFAULT_BINDINGS)).toBe('left');
    expect(menuKeyFor('KeyE', DEFAULT_BINDINGS)).toBe('accept');
  });

  it('ignores every other key', () => {
    expect(menuKeyFor('KeyQ', DEFAULT_BINDINGS)).toBeNull();
    expect(menuKeyFor('KeyW', PRESETS.arrows)).toBeNull();
    expect(menuKeyFor('KeyZ', DEFAULT_BINDINGS)).toBeNull();
  });
});
