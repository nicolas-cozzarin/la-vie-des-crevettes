import { describe, expect, it } from 'vitest';
import { Crab } from '../../src/core/creatures/crab';
import { School } from '../../src/core/creatures/school';
import { Snail } from '../../src/core/creatures/snail';
import { seededRandom } from '../../src/core/random';
import { CREATURES } from '../../src/data/tuning';

const BL = 100;
const DT = 1 / 30;

describe('fiddler crab', () => {
  it('waves its claw in bouts of four or five, about once every 2 s', () => {
    const crab = new Crab(CREATURES.crab, seededRandom(4));
    let raised = false;
    const waves: number[] = [];
    for (let step = 0; step < 30 * 60; step++) {
      const pose = crab.step(DT);
      if (pose.claw > 0.9 && !raised) waves.push(step * DT);
      raised = pose.claw > 0.9 ? true : pose.claw < 0.1 ? false : raised;
    }
    // Split into bouts where the gap is longer than a wave.
    const bouts: number[][] = [];
    for (const time of waves) {
      const bout = bouts[bouts.length - 1];
      const last = bout?.[bout.length - 1];
      if (bout && last !== undefined && time - last < 2.5) bout.push(time);
      else bouts.push([time]);
    }
    expect(bouts.length).toBeGreaterThanOrEqual(4);
    for (const bout of bouts.slice(0, -1)) {
      expect(bout.length).toBeGreaterThanOrEqual(4);
      expect(bout.length).toBeLessThanOrEqual(5);
      for (let index = 1; index < bout.length; index++) {
        expect((bout[index] as number) - (bout[index - 1] as number)).toBeCloseTo(2, 0);
      }
    }
  });

  it('goes down its burrow at a cue and comes out after 8 to 12 s of calm', () => {
    const crab = new Crab(CREATURES.crab, seededRandom(5));
    crab.step(DT);
    crab.hide();
    let pose = crab.step(0.3);
    expect(pose.down).toBe(1);
    for (let time = 0; time < 7.5; time += DT) pose = crab.step(DT);
    expect(crab.inBurrow).toBe(true);
    for (let time = 0; time < 6; time += DT) pose = crab.step(DT);
    expect(crab.inBurrow).toBe(false);
    expect(pose.down).toBeLessThan(1);
  });

  it('steps sideways no further than 0.35 BL', () => {
    const crab = new Crab(CREATURES.crab, seededRandom(6));
    for (let step = 0; step < 30 * 40; step++) {
      expect(Math.abs(crab.step(DT).side)).toBeLessThanOrEqual(CREATURES.crab.side + 1e-9);
    }
  });
});

describe('snail', () => {
  it('crawls at 0.05 BL per second', () => {
    const snail = new Snail(CREATURES.snail, { x: 0, y: 0, heading: 0 }, BL, seededRandom(1));
    const start = { x: snail.x, y: snail.y };
    for (let step = 0; step < 300; step++) snail.step(DT, null);
    const travelled = Math.hypot(snail.x - start.x, snail.y - start.y) / BL;
    expect(travelled).toBeGreaterThan(0.4);
    expect(travelled).toBeLessThanOrEqual(0.5 + 1e-6);
  });

  it('stops and pulls in its feelers when a shrimp rushes past, and goes on after 4 s', () => {
    const snail = new Snail(CREATURES.snail, { x: 0, y: 0, heading: 0 }, BL, seededRandom(2));
    snail.step(DT, { x: 100, y: 0, fast: true });
    expect(snail.withdrawn).toBe(true);
    for (let step = 0; step < 30; step++) snail.step(DT, null);
    expect(snail.feelers).toBe(0);
    const still = { x: snail.x, y: snail.y };
    for (let step = 0; step < 90; step++) snail.step(DT, null);
    expect(snail.x).toBe(still.x);
    for (let step = 0; step < 90; step++) snail.step(DT, null);
    expect(snail.withdrawn).toBe(false);
    expect(snail.feelers).toBeGreaterThan(0.8);
  });

  it('a shrimp walking past does not disturb it', () => {
    const snail = new Snail(CREATURES.snail, { x: 0, y: 0, heading: 0 }, BL, seededRandom(3));
    snail.step(DT, { x: 50, y: 0, fast: false });
    expect(snail.withdrawn).toBe(false);
  });

  it('stays near where it lives', () => {
    const snail = new Snail(CREATURES.snail, { x: 0, y: 0, heading: 0 }, BL, seededRandom(4));
    for (let step = 0; step < 30 * 600; step++) snail.step(DT, null);
    expect(Math.hypot(snail.x, snail.y) / BL).toBeLessThan(CREATURES.snail.home + 0.5);
  });
});

describe('school of young fish', () => {
  it('holds facing into the current', () => {
    const school = new School(CREATURES.fish, 0, 0, Math.PI, 14, BL, seededRandom(1));
    for (let step = 0; step < 60; step++) school.step(DT);
    for (const fish of school.fish) expect(Math.cos(fish.heading)).toBeLessThan(-0.9);
  });

  it('bursts apart at a tail flip close by, and regroups within about 4 s', () => {
    const school = new School(CREATURES.fish, 0, 0, Math.PI, 14, BL, seededRandom(2));
    expect(school.startle(900, 0)).toBe(false);
    expect(school.startle(200, 0)).toBe(true);
    for (let step = 0; step < 15; step++) school.step(DT);
    expect(school.scattered).toBeGreaterThan(0.5);
    for (let step = 0; step < 120; step++) school.step(DT);
    expect(school.scattered).toBeLessThan(0.25);
  });
});
