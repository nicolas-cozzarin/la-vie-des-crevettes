import { describe, expect, it } from 'vitest';
import { angleDiff, rotateToward, wrapAngle } from '../../src/core/movement/angles';
import { moveCircle, type Obstacle } from '../../src/core/movement/collision';
import { ShrimpMotion, type MotionInput } from '../../src/core/movement/ShrimpMotion';
import { MOTION } from '../../src/data/tuning';

const FRAME = 1 / 60;
const BL = MOTION.bodyLengthPx;
const NONE: MotionInput = { x: 0, y: 0, dart: false };
const RIGHT: MotionInput = { x: 1, y: 0, dart: false };
const DOWN: MotionInput = { x: 0, y: 1, dart: false };

function fresh(heading = 0): ShrimpMotion {
  return new ShrimpMotion(MOTION, { x: 0, y: 0, heading });
}

/** Step for a while with the same input. A dart is asked for on the first frame only. */
function run(motion: ShrimpMotion, seconds: number, input: MotionInput = NONE): void {
  const frames = Math.round(seconds / FRAME);
  for (let frame = 0; frame < frames; frame++) {
    motion.step(FRAME, frame === 0 ? input : { ...input, dart: false });
  }
}

describe('angles', () => {
  it('wraps into -PI to PI', () => {
    expect(wrapAngle(Math.PI * 3)).toBeCloseTo(Math.PI);
    expect(wrapAngle(-Math.PI * 1.5)).toBeCloseTo(Math.PI / 2);
  });

  it('finds the short way round', () => {
    expect(angleDiff(-3, 3)).toBeCloseTo(Math.PI * 2 - 6);
    expect(rotateToward(3, -3, 0.1)).toBeCloseTo(3.1);
    expect(rotateToward(0, 0.05, 0.1)).toBeCloseTo(0.05);
  });
});

describe('walking and swimming', () => {
  it('rests until a direction is held', () => {
    const motion = fresh();
    run(motion, 1);
    expect(motion.mode).toBe('rest');
    expect(motion.x).toBe(0);
    expect(motion.height).toBe(0);
  });

  it('walks at about 1.5 body lengths per second', () => {
    const motion = fresh();
    run(motion, 0.5, RIGHT);
    expect(motion.mode).toBe('walk');
    expect(motion.speed / BL).toBeCloseTo(MOTION.walkSpeed, 2);
    expect(motion.height).toBe(0);
  });

  it('breaks into a swim after 0.8 s of continuous movement', () => {
    const motion = fresh();
    run(motion, 0.75, RIGHT);
    expect(motion.mode).toBe('walk');
    run(motion, 0.8, RIGHT);
    expect(motion.mode).toBe('swim');
    expect(motion.speed / BL).toBeCloseTo(MOTION.swimSpeed, 2);
  });

  it('lifts off the bed when swimming and settles when the keys are let go', () => {
    const motion = fresh();
    run(motion, 2.5, RIGHT);
    expect(motion.height).toBeGreaterThan(0.95);
    run(motion, 2);
    expect(motion.mode).toBe('rest');
    expect(motion.height).toBeLessThan(0.02);
  });

  it('coasts to rest in about 0.6 s', () => {
    const motion = fresh();
    run(motion, 2.5, RIGHT);
    const stoppedAt = motion.x;
    run(motion, 0.5);
    expect(motion.speed).toBeGreaterThan(0);
    expect(motion.x).toBeGreaterThan(stoppedAt);
    run(motion, 0.15);
    expect(motion.speed).toBe(0);
  });

  it('keeps swimming through a quick change of keys', () => {
    const motion = fresh();
    run(motion, 1.5, RIGHT);
    run(motion, 0.1);
    run(motion, 0.1, DOWN);
    expect(motion.mode).toBe('swim');
  });

  it('goes back to walking after a real stop', () => {
    const motion = fresh();
    run(motion, 1.5, RIGHT);
    run(motion, 1);
    run(motion, 0.3, RIGHT);
    expect(motion.mode).toBe('walk');
  });

  it('moves at the same speed on a diagonal', () => {
    const motion = fresh(Math.PI / 4);
    run(motion, 0.5, { x: Math.SQRT1_2, y: Math.SQRT1_2, dart: false });
    expect(Math.hypot(motion.vx, motion.vy) / BL).toBeCloseTo(MOTION.walkSpeed, 2);
  });
});

describe('turning', () => {
  it('turns at no more than 540 degrees per second', () => {
    const motion = fresh();
    let fastest = 0;
    for (let frame = 0; frame < 30; frame++) {
      motion.step(FRAME, DOWN);
      fastest = Math.max(fastest, Math.abs(motion.turnSpeed));
    }
    expect(fastest).toBeLessThanOrEqual(MOTION.turnRate + 1e-6);
    expect(motion.heading).toBeCloseTo(Math.PI / 2);
  });

  it('turns smoothly: the heading never jumps between frames', () => {
    const motion = fresh();
    let previous = motion.heading;
    for (let frame = 0; frame < 60; frame++) {
      motion.step(FRAME, { x: -1, y: 0, dart: false });
      const change = Math.abs(angleDiff(motion.heading, previous));
      expect(change).toBeLessThanOrEqual(MOTION.turnRate * FRAME + 1e-6);
      previous = motion.heading;
    }
    expect(Math.abs(motion.heading)).toBeCloseTo(Math.PI);
  });

  it('barely moves until it faces the way it is asked to go', () => {
    const motion = fresh();
    run(motion, 0.1, { x: -1, y: 0, dart: false });
    expect(Math.hypot(motion.x, motion.y)).toBeLessThan(0.05 * BL);
  });
});

describe('tail flip', () => {
  it('covers 3 body lengths in 0.25 s, then glides a little further', () => {
    const motion = fresh();
    run(motion, MOTION.dartTime, { ...RIGHT, dart: true });
    expect(motion.x / BL).toBeCloseTo(MOTION.dartDistance, 1);
    run(motion, MOTION.glideTime + FRAME, RIGHT);
    expect(motion.x / BL).toBeGreaterThan(MOTION.dartDistance + MOTION.glideDistance - 0.05);
  });

  it('travels tail first: the head points away from the direction of travel', () => {
    const motion = fresh();
    run(motion, 0.15, { ...RIGHT, dart: true });
    expect(motion.mode).toBe('dart');
    expect(motion.vx).toBeGreaterThan(0);
    expect(Math.abs(angleDiff(motion.heading, Math.PI))).toBeLessThan(0.01);
  });

  it('goes straight back when no direction is held', () => {
    const motion = fresh(0);
    run(motion, MOTION.dartTime, { ...NONE, dart: true });
    expect(motion.x / BL).toBeCloseTo(-MOTION.dartDistance, 1);
    expect(motion.y).toBeCloseTo(0);
    expect(motion.heading).toBeCloseTo(0);
  });

  it('lifts the shrimp off the bed for a moment', () => {
    const motion = fresh();
    run(motion, 0.2, { ...NONE, dart: true });
    expect(motion.height).toBeGreaterThan(1);
    run(motion, 2);
    expect(motion.height).toBe(0);
  });

  it('reports the frame a dart begins', () => {
    const motion = fresh();
    expect(motion.step(FRAME, { ...NONE, dart: true }).darted).toBe(true);
    expect(motion.step(FRAME, { ...NONE, dart: true }).darted).toBe(false);
  });

  it('cannot be repeated within the cooldown', () => {
    const motion = fresh();
    run(motion, 0.7, { ...NONE, dart: true });
    expect(motion.step(FRAME, { ...NONE, dart: true }).darted).toBe(false);
    run(motion, 0.15);
    expect(motion.step(FRAME, { ...NONE, dart: true }).darted).toBe(true);
  });

  it('turns back to face the held direction after the dart', () => {
    const motion = fresh();
    run(motion, 1.2, { ...RIGHT, dart: true });
    expect(motion.heading).toBeCloseTo(0);
    expect(motion.vx).toBeGreaterThan(0);
  });

  it('tires after three in a row: the next darts are shorter for 4 s', () => {
    const motion = fresh();
    for (let dart = 0; dart < 3; dart++) {
      expect(motion.tired).toBe(false);
      run(motion, 0.9, { ...NONE, dart: true });
    }
    expect(motion.tired).toBe(true);

    const before = motion.x;
    run(motion, 0.9, { ...NONE, dart: true });
    const short = Math.abs(motion.x - before) / BL;
    expect(short).toBeCloseTo(
      (MOTION.dartDistance + MOTION.glideDistance) * MOTION.tiredDartFactor,
      1,
    );

    run(motion, MOTION.recoveryTime);
    expect(motion.tired).toBe(false);
    const rested = motion.x;
    run(motion, 0.9, { ...NONE, dart: true });
    expect(Math.abs(motion.x - rested) / BL).toBeCloseTo(
      MOTION.dartDistance + MOTION.glideDistance,
      1,
    );
  });

  it('does not tire when darts are spaced out', () => {
    const motion = fresh();
    for (let dart = 0; dart < 5; dart++) {
      run(motion, MOTION.dartRowWindow + 1, { ...NONE, dart: true });
      expect(motion.tired).toBe(false);
    }
  });
});

describe('with obstacles', () => {
  it('does not pass through a rock, even in a dart', () => {
    const rock: Obstacle = { shape: 'circle', x: 200, y: 0, r: 60 };
    const motion = fresh();
    const mover = (x: number, y: number, dx: number, dy: number) =>
      moveCircle(x, y, dx, dy, motion.radiusPx, [rock]);
    motion.step(FRAME, { ...RIGHT, dart: true }, mover);
    for (let frame = 0; frame < 120; frame++) {
      motion.step(FRAME, RIGHT, mover);
      const gap = Math.hypot(motion.x - rock.x, motion.y - rock.y);
      expect(gap).toBeGreaterThanOrEqual(rock.r + motion.radiusPx - 0.001);
    }
  });

  it('survives a very long frame without leaping', () => {
    const motion = fresh();
    motion.step(5, RIGHT);
    expect(motion.x).toBeLessThan(BL);
  });
});
