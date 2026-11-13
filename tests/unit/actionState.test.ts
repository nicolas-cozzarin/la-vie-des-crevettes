import { describe, expect, it } from 'vitest';
import { ActionState } from '../../src/core/input/ActionState';
import { DEFAULT_BINDINGS, rebind } from '../../src/core/input/bindings';

function fresh(): ActionState {
  return new ActionState(DEFAULT_BINDINGS);
}

describe('ActionState', () => {
  it('reports a key as down while it is held', () => {
    const state = fresh();
    state.keyDown('KeyW');
    state.update();
    expect(state.isDown('moveUp')).toBe(true);
    state.keyUp('KeyW');
    state.update();
    expect(state.isDown('moveUp')).toBe(false);
  });

  it('reports justPressed and justReleased for one frame only', () => {
    const state = fresh();
    state.keyDown('Space');
    state.update();
    expect(state.justPressed('tailFlip')).toBe(true);
    state.update();
    expect(state.justPressed('tailFlip')).toBe(false);
    state.keyUp('Space');
    state.update();
    expect(state.justReleased('tailFlip')).toBe(true);
    state.update();
    expect(state.justReleased('tailFlip')).toBe(false);
  });

  it('does not lose a tap that starts and ends between two frames', () => {
    const state = fresh();
    state.keyDown('Space');
    state.keyUp('Space');
    state.update();
    expect(state.justPressed('tailFlip')).toBe(true);
    expect(state.justReleased('tailFlip')).toBe(true);
    expect(state.isDown('tailFlip')).toBe(false);
  });

  it('ignores key repeat', () => {
    const state = fresh();
    state.keyDown('Space');
    state.update();
    state.keyDown('Space');
    state.update();
    expect(state.justPressed('tailFlip')).toBe(false);
    expect(state.isDown('tailFlip')).toBe(true);
  });

  it('keeps an action down until both of its keys are up', () => {
    const state = fresh();
    state.keyDown('KeyW');
    state.keyDown('ArrowUp');
    state.keyUp('KeyW');
    state.update();
    expect(state.isDown('moveUp')).toBe(true);
    expect(state.justReleased('moveUp')).toBe(false);
    state.keyUp('ArrowUp');
    state.update();
    expect(state.isDown('moveUp')).toBe(false);
  });

  it('gives a movement vector', () => {
    const state = fresh();
    expect(state.axis()).toEqual({ x: 0, y: 0 });
    state.keyDown('KeyD');
    expect(state.axis()).toEqual({ x: 1, y: 0 });
    state.keyDown('KeyW');
    const diagonal = state.axis();
    expect(diagonal.x).toBeCloseTo(Math.SQRT1_2);
    expect(diagonal.y).toBeCloseTo(-Math.SQRT1_2);
    expect(Math.hypot(diagonal.x, diagonal.y)).toBeCloseTo(1);
  });

  it('cancels opposite directions', () => {
    const state = fresh();
    state.keyDown('KeyA');
    state.keyDown('KeyD');
    expect(state.axis()).toEqual({ x: 0, y: 0 });
  });

  it('ignores keys that are not bound', () => {
    const state = fresh();
    expect(state.isBound('KeyZ')).toBe(false);
    state.keyDown('KeyZ');
    state.update();
    expect(state.axis()).toEqual({ x: 0, y: 0 });
  });

  it('follows new bindings', () => {
    const state = fresh();
    const result = rebind(DEFAULT_BINDINGS, 'tailFlip', 0, 'KeyG');
    if (!result.ok) throw new Error('rebind failed');
    state.setBindings(result.bindings);
    state.keyDown('Space');
    state.update();
    expect(state.justPressed('tailFlip')).toBe(false);
    state.keyDown('KeyG');
    state.update();
    expect(state.justPressed('tailFlip')).toBe(true);
  });

  it('lets go of everything when asked, as when the window loses focus', () => {
    const state = fresh();
    state.keyDown('KeyW');
    state.keyDown('ShiftLeft');
    state.update();
    state.releaseAll();
    state.update();
    expect(state.isDown('moveUp')).toBe(false);
    expect(state.isDown('hide')).toBe(false);
    expect(state.justReleased('hide')).toBe(true);
    // The key is still physically down: its release must not confuse anything.
    state.keyUp('KeyW');
    state.update();
    expect(state.isDown('moveUp')).toBe(false);
  });

  it('can drop presses the game has not seen, keeping what is held', () => {
    const state = fresh();
    state.keyDown('Space');
    state.keyDown('KeyD');
    state.clearQueued();
    state.update();
    expect(state.justPressed('tailFlip')).toBe(false);
    expect(state.isDown('moveRight')).toBe(true);
  });

  describe('toggle mode', () => {
    it('starts on one press and stops on the next', () => {
      const state = fresh();
      state.setMode('sense', 'toggle');
      state.keyDown('KeyQ');
      state.keyUp('KeyQ');
      state.update();
      expect(state.isDown('sense')).toBe(true);
      state.keyDown('KeyQ');
      state.keyUp('KeyQ');
      state.update();
      expect(state.isDown('sense')).toBe(false);
      expect(state.justReleased('sense')).toBe(true);
    });

    it('leaves other actions on hold', () => {
      const state = fresh();
      state.setMode('sense', 'toggle');
      state.keyDown('ShiftLeft');
      state.keyUp('ShiftLeft');
      state.update();
      expect(state.isDown('hide')).toBe(false);
    });
  });
});
