import { describe, expect, it } from 'vitest';
import { seededRandom } from '../../src/core/random';
import { angleDiff } from '../../src/core/movement/angles';
import { HuntingFish, type FishEvent, type FishPrey } from '../../src/core/threat/fish';
import {
  ThreatDirector,
  type DirectorStage,
  type ThreatEvent,
  type ThreatPlayer,
} from '../../src/core/threat/ThreatDirector';
import { isUnder } from '../../src/core/world/cover';
import { BIRD, FISH, THREAT } from '../../src/data/tuning';

const BL = 100;
const DT = 1 / 60;
const BOUNDS = { x: 0, y: 0, w: 8000, h: 5000 };
const COVERS = [{ x: 6000, y: 2500, r: 200 }];
const WORLD = { covers: COVERS, obstacles: [], bounds: BOUNDS, bl: BL };
const SHOAL = { x: 3000, y: 2500 };

function player(over: Partial<ThreatPlayer> = {}): ThreatPlayer {
  return {
    x: 3000,
    y: 2500,
    vx: 0,
    vy: 0,
    mode: 'rest',
    hidden: false,
    underCover: false,
    darted: false,
    soft: false,
    coverGap: 0,
    shoal: SHOAL,
    ...over,
  };
}

function director(seed = 1, gentle = false): ThreatDirector {
  return new ThreatDirector(
    THREAT,
    BIRD,
    WORLD,
    seededRandom(seed),
    { gentle, kinds: ['fish'] },
    FISH,
  );
}

function until(
  threat: ThreatDirector,
  stage: DirectorStage,
  who: (time: number) => ThreatPlayer,
  seconds = 60,
): ThreatEvent[] {
  const events: ThreatEvent[] = [];
  for (let time = 0; time < seconds; time += DT) {
    events.push(...threat.step(DT, who(time)));
    if (threat.stage === stage) return events;
  }
  throw new Error(`Never reached ${stage}; stuck in ${threat.stage}`);
}

/** A fish already in its chase, facing a shrimp at (3000, 2500) from 6 BL to the west. */
function hunting(): HuntingFish {
  const fish = new HuntingFish(FISH, BL, SHOAL, Math.PI, 1);
  fish.x = 2400;
  fish.y = 2500;
  fish.heading = 0;
  fish.hunt();
  return fish;
}

function prey(over: Partial<FishPrey> = {}): FishPrey {
  return { x: 3000, y: 2500, safe: false, sinceFlip: Infinity, ...over };
}

describe('the hunting fish (doc 10, "The hunting fish")', () => {
  it('comes in during the cue and circles 5 BL out from the middle of the shoal, at 2 BL a second', () => {
    const threat = director();
    threat.request('fish', false, Math.PI, true);
    threat.step(DT, player());
    expect(threat.stage).toBe('cue');
    const start = threat.fish;
    expect(start).not.toBeNull();
    expect(Math.hypot((start?.x ?? 0) - SHOAL.x, (start?.y ?? 0) - SHOAL.y)).toBeCloseTo(
      11 * BL,
      -1,
    );
    until(threat, 'presence', () => player());
    // Circling: after a few seconds it stays about 5 BL out.
    const out: number[] = [];
    for (let time = 0; time < 5; time += DT) {
      threat.step(DT, player());
      if (time > 3 && threat.fish)
        out.push(Math.hypot(threat.fish.x - SHOAL.x, threat.fish.y - SHOAL.y));
    }
    for (const one of out) {
      expect(one / BL).toBeGreaterThan(4);
      expect(one / BL).toBeLessThan(6.5);
    }
    expect(threat.fish?.speed).toBeCloseTo(FISH.patrol.speed, 0);
  });

  it('does not see a shrimp that is still or burrowed, and passes on', () => {
    for (const hidden of [false, true]) {
      const threat = director(3);
      threat.request('fish', false, null, true);
      threat.step(DT, player({ hidden }));
      const events = until(threat, 'idle', () => player({ hidden }), 40);
      expect(events.some((one) => one.type === 'stage' && one.stage === 'chase')).toBe(false);
      expect(events.some((one) => one.type === 'escaped' && one.still)).toBe(true);
    }
  });

  it('a shrimp swimming close is noticed, and the chase begins; in gentle mode it never does', () => {
    const swimming = (time: number) =>
      player({ mode: 'swim', x: 3000 + 50 * Math.sin(time), vx: 50 });
    const threat = director(4);
    threat.request('fish', false, null, true);
    threat.step(DT, swimming(0));
    until(threat, 'chase', swimming);
    expect(threat.fish?.phase).toBe('face');
    const gentle = director(4, true);
    gentle.request('fish', false, null, true);
    gentle.step(DT, swimming(0));
    const events = until(gentle, 'idle', swimming, 40);
    expect(events.some((one) => one.type === 'stage' && one.stage === 'chase')).toBe(false);
  });

  it('turns to face for 0.6 s, holds dead straight for 0.5 s, then charges at 9 BL a second', () => {
    const fish = hunting();
    fish.heading = Math.PI / 2;
    const events: FishEvent[] = [];
    let time = 0;
    while (fish.phase === 'face') {
      events.push(...fish.chase(DT, prey(), COVERS, BOUNDS));
      time += DT;
    }
    expect(time).toBeCloseTo(FISH.face, 1);
    expect(events.some((one) => one.type === 'faced')).toBe(true);
    const aim = Math.atan2(2500 - fish.y, 3000 - fish.x);
    expect(Math.abs(angleDiff(fish.heading, aim))).toBeLessThan(0.05);
    const heading = fish.heading;
    time = 0;
    while (fish.phase === 'pause') {
      fish.chase(DT, prey(), COVERS, BOUNDS);
      time += DT;
      if (fish.phase === 'pause') expect(fish.heading).toBe(heading);
    }
    expect(time).toBeCloseTo(FISH.pause, 1);
    expect(fish.phase).toBe('charge');
    expect(fish.speed).toBe(FISH.charge.speed);
    expect(fish.charges).toBe(1);
  });

  it('lands on a shrimp that stays on the line, and misses one that moved a body length aside', () => {
    const stay = hunting();
    const stayed: FishEvent[] = [];
    for (let time = 0; time < 3 && stayed.length === 0; time += DT) {
      stayed.push(...stay.chase(DT, prey(), COVERS, BOUNDS).filter((e) => e.type === 'passed'));
    }
    expect(stayed[0]).toMatchObject({ type: 'passed', hit: true });

    const aside = hunting();
    const moved: FishEvent[] = [];
    for (let time = 0; time < 3 && moved.length === 0; time += DT) {
      // It moves aside once the charge has begun: the line was set by then.
      const where = aside.phase === 'charge' ? prey({ y: 2500 + BL }) : prey();
      moved.push(...aside.chase(DT, where, COVERS, BOUNDS).filter((e) => e.type === 'passed'));
    }
    expect(moved[0]).toMatchObject({ type: 'passed', hit: false, near: true, sidestep: false });
  });

  it('swimming straight away along its line does not work: it is nearly four times faster', () => {
    const fish = hunting();
    let x = 3000;
    const passed: FishEvent[] = [];
    for (let time = 0; time < 4 && passed.length === 0; time += DT) {
      if (fish.phase === 'charge') x += 2.4 * BL * DT;
      passed.push(
        ...fish.chase(DT, prey({ x }), COVERS, BOUNDS).filter((e) => e.type === 'passed'),
      );
    }
    expect(passed[0]).toMatchObject({ hit: true });
  });

  it('a sideways tail flip clears the line and counts as a sidestep', () => {
    const fish = hunting();
    let y = 2500;
    let flipAt: number | null = null;
    let time = 0;
    const passed: FishEvent[] = [];
    for (; time < 4 && passed.length === 0; time += DT) {
      if (fish.phase === 'charge' && flipAt === null) flipAt = time;
      // The flip throws it 1.2 BL aside in a quarter of a second.
      if (flipAt !== null && time - flipAt < 0.25) y += (1.2 * BL * DT) / 0.25;
      const sinceFlip = flipAt === null ? Infinity : time - flipAt;
      passed.push(
        ...fish
          .chase(DT, prey({ y, sinceFlip }), COVERS, BOUNDS)
          .filter((e) => e.type === 'passed'),
      );
    }
    expect(passed[0]).toMatchObject({ hit: false, sidestep: true });
  });

  it('never lands on a shrimp in cover, and cannot charge into cover', () => {
    const fish = hunting();
    const passed: FishEvent[] = [];
    for (let time = 0; time < 3 && passed.length === 0; time += DT) {
      passed.push(
        ...fish.chase(DT, prey({ safe: true }), COVERS, BOUNDS).filter((e) => e.type === 'passed'),
      );
    }
    expect(passed[0]).toMatchObject({ hit: false });

    const covered = new HuntingFish(FISH, BL, SHOAL, Math.PI, 1);
    covered.x = 5300;
    covered.y = 2500;
    covered.heading = 0;
    covered.hunt();
    for (let time = 0; time < 3; time += DT) {
      covered.chase(DT, prey({ x: 6000, safe: true }), COVERS, BOUNDS);
      // It swims over the seagrass, but its charge stops at the edge.
      const head = covered.head;
      if (covered.phase === 'charge') {
        expect(COVERS.some((cover) => isUnder(head.x, head.y, cover))).toBe(false);
      }
    }
  });

  it('after a charge it overshoots and turns back in 1.6 s, then faces again', () => {
    const fish = hunting();
    const events: FishEvent[] = [];
    for (let time = 0; time < 5 && !events.some((e) => e.type === 'recovered'); time += DT) {
      events.push(...fish.chase(DT, prey({ y: 2500 + 2 * BL }), COVERS, BOUNDS));
    }
    expect(events.some((e) => e.type === 'recovered')).toBe(true);
    expect(fish.phase).toBe('face');
  });

  it('gives up after three charges, or once the shrimp has hidden for 2 s', () => {
    // Under the seagrass's spread, not tucked in: it charges, and cannot land.
    const dodging = () => player({ mode: 'swim', underCover: true });
    const threat = director(5);
    threat.request('fish', false, null, true);
    threat.notice = 1;
    threat.step(DT, dodging());
    until(threat, 'chase', dodging);
    const events = until(threat, 'release', dodging, 20);
    expect(threat.fish?.phase).toBe('leave');
    const strikes = events.filter((one) => one.type === 'strike');
    expect(strikes.length).toBe(FISH.charges);
    expect(strikes.every((one) => one.type === 'strike' && !one.hit)).toBe(true);

    const hiding = director(6);
    hiding.request('fish', false, null, true);
    hiding.step(DT, player({ mode: 'swim' }));
    until(hiding, 'presence', () => player({ mode: 'swim' }));
    hiding.notice = 1;
    hiding.step(DT, player({ mode: 'swim' }));
    expect(hiding.stage).toBe('chase');
    let time = 0;
    while (hiding.stage === 'chase' && time < 5) {
      hiding.step(DT, player({ hidden: true }));
      time += DT;
    }
    expect(hiding.stage).toBe('release');
    expect(time).toBeLessThan(FISH.giveUp.hidden + 1.2);
  });

  it('a charge that lands corners the shrimp, and the fish leaves', () => {
    const threat = director(7);
    threat.request('fish', false, null, true);
    threat.step(DT, player({ mode: 'walk' }));
    until(threat, 'presence', () => player({ mode: 'walk' }));
    threat.notice = 1;
    const events = until(threat, 'cornered', () => player({ mode: 'walk' }), 10);
    expect(events.some((one) => one.type === 'strike' && one.hit)).toBe(true);
    expect(threat.fish?.phase).toBe('leave');
    until(threat, 'idle', () => player({ hidden: true }), 20);
    expect(threat.fish).toBeNull();
  });

  it('seen within 8 BL it is in sight; its first pause is told', () => {
    const threat = director(8);
    threat.request('fish', false, null, true);
    threat.step(DT, player({ mode: 'swim' }));
    until(threat, 'presence', () => player({ mode: 'swim' }));
    expect(threat.view(3000, 2500, true)?.inSight).toBe(true);
    expect(threat.view(3000 + 20 * BL, 2500, false)?.inSight).toBe(false);
    threat.notice = 1;
    const events = until(threat, 'cornered', () => player({ mode: 'walk' }), 10);
    expect(events.some((one) => one.type === 'faced')).toBe(true);
  });
});

describe('the hunting fish keeps room to charge', () => {
  it('too close to the shrimp, it swims away before it turns to face it', () => {
    const fish = new HuntingFish(FISH, BL, SHOAL, Math.PI, 1);
    fish.x = 2900;
    fish.y = 2500;
    fish.heading = 0;
    fish.hunt();
    const events: FishEvent[] = [];
    for (let time = 0; time < 6 && !events.some((e) => e.type === 'faced'); time += DT) {
      events.push(...fish.chase(DT, prey(), COVERS, BOUNDS));
    }
    const faced = events.find((e) => e.type === 'faced');
    expect(faced).toBeDefined();
    expect(Math.hypot(fish.x - 3000, fish.y - 2500) / BL).toBeGreaterThanOrEqual(FISH.room - 0.2);
  });

  it('just at the edge of its room, it still finishes turning and charges, whichever way it was swimming', () => {
    // Turning to face brought it back inside its room, and it began again, forever (CI, T102).
    for (let way = 0; way < 16; way++) {
      for (let side = 0; side < 8; side++) {
        const angle = (side / 8) * Math.PI * 2;
        const fish = new HuntingFish(FISH, BL, SHOAL, Math.PI, 1);
        fish.x = 3000 + Math.cos(angle) * FISH.room * BL;
        fish.y = 2500 + Math.sin(angle) * FISH.room * BL;
        fish.heading = (way / 16) * Math.PI * 2;
        fish.speed = FISH.patrol.speed;
        fish.hunt();
        let charged = false;
        for (let time = 0; time < 8 && !charged; time += DT) {
          charged = fish.chase(DT, prey(), COVERS, BOUNDS).some((e) => e.type === 'charge');
        }
        expect(charged, `heading ${way}/16, from ${side}/8`).toBe(true);
      }
    }
  });
});
