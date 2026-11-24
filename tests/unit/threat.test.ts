import { describe, expect, it } from 'vitest';
import { seededRandom } from '../../src/core/random';
import { aimPoint, Legs, standPoint, strikeLands } from '../../src/core/threat/bird';
import { shelterFor } from '../../src/core/threat/cornered';
import {
  ThreatDirector,
  type DirectorStage,
  type ThreatEvent,
  type ThreatPlayer,
} from '../../src/core/threat/ThreatDirector';
import { distanceToCover } from '../../src/core/world/cover';
import { BIRD, CORNERED, THREAT } from '../../src/data/tuning';

const BL = 100;
const DT = 1 / 30;
const COVERS = [
  { x: 1000, y: 1000, r: 150 },
  { x: 3000, y: 1000, r: 150 },
  { x: 1000, y: 3000, r: 150 },
];
const WORLD = {
  covers: COVERS,
  obstacles: [],
  bounds: { x: 0, y: 0, w: 6000, h: 4000 },
  bl: BL,
};

function still(over: Partial<ThreatPlayer> = {}): ThreatPlayer {
  return {
    x: 1000,
    y: 1400,
    vx: 0,
    vy: 0,
    mode: 'rest',
    hidden: false,
    underCover: false,
    darted: false,
    soft: false,
    coverGap: 2.5,
    ...over,
  };
}

function director(seed = 1, gentle = false): ThreatDirector {
  return new ThreatDirector(THREAT, BIRD, WORLD, seededRandom(seed), {
    gentle,
    kinds: ['bird'],
  });
}

/** Steps until the stage is the one wanted, or the time runs out. Returns the events. */
function until(
  threat: ThreatDirector,
  stage: DirectorStage,
  player: (time: number) => ThreatPlayer,
  seconds = 60,
): ThreatEvent[] {
  const events: ThreatEvent[] = [];
  for (let time = 0; time < seconds; time += DT) {
    events.push(...threat.step(DT, player(time)));
    if (threat.stage === stage) return events;
  }
  throw new Error(`Never reached ${stage}; stuck in ${threat.stage}`);
}

/** Notice is full: one step of walking at `spot` starts the chase. */
function chaseNow(threat: ThreatDirector, spot: { x: number; y: number }): void {
  threat.notice = 1;
  threat.step(DT, still({ ...spot, mode: 'walk' }));
  expect(threat.stage).toBe('chase');
}

describe('the threat director', () => {
  it('runs cue, presence, release, idle in order, each within its limits', () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const threat = director(seed);
      threat.request('bird', false, null, true);
      const lengths: { stage: DirectorStage; seconds: number }[] = [];
      let at = 0;
      let time = 0;
      threat.step(DT, still());
      let current = threat.stage;
      expect(current).toBe('cue');
      while (time < 30) {
        time += DT;
        threat.step(DT, still());
        if (threat.stage !== current) {
          lengths.push({ stage: current, seconds: time - at });
          current = threat.stage;
          at = time;
          if (current === 'idle') break;
        }
      }
      expect(lengths.map((one) => one.stage)).toEqual(['cue', 'presence', 'release']);
      const [cue, presence, release] = lengths.map((one) => one.seconds);
      expect(cue).toBeGreaterThanOrEqual(2 - DT);
      expect(cue).toBeLessThanOrEqual(3 + DT);
      expect(presence).toBeGreaterThanOrEqual(5 - DT);
      expect(presence).toBeLessThanOrEqual(10 + DT);
      expect(release).toBeGreaterThanOrEqual(3 - DT);
      expect(release).toBeLessThanOrEqual(4 + DT);
    }
  });

  it('starts no threat within 60 s of the last release, even a scripted one', () => {
    const threat = director(2);
    threat.request('bird', false, null, true);
    threat.step(DT, still());
    until(threat, 'idle', () => still());
    threat.request('bird');
    for (let time = 0; time < 59; time += 0.5) {
      threat.step(0.5, still());
      expect(threat.stage).toBe('idle');
    }
    until(threat, 'cue', () => still(), 2);
  });

  it('starts no ambient threat in the first 60 s, nor while the shrimp is soft', () => {
    const always = new ThreatDirector(THREAT, BIRD, WORLD, () => 0, {
      gentle: false,
      kinds: ['bird'],
    });
    for (let time = 0; time < 59; time += 1) {
      always.step(1, still());
      expect(always.stage).toBe('idle');
    }
    for (let time = 0; time < 300; time += 1) {
      always.step(1, still({ soft: true }));
      expect(always.stage).toBe('idle');
    }
    always.step(1, still());
    expect(always.stage).toBe('cue');
  });

  it('starts no ambient threat far from cover, nor in a place without threats', () => {
    const far = new ThreatDirector(THREAT, BIRD, WORLD, () => 0, {
      gentle: false,
      kinds: ['bird'],
    });
    const none = new ThreatDirector(THREAT, BIRD, WORLD, () => 0, { gentle: false, kinds: [] });
    for (let time = 0; time < 300; time += 1) {
      far.step(1, still({ coverGap: 6 }));
      none.step(1, still());
    }
    expect(far.stage).toBe('idle');
    expect(none.stage).toBe('idle');
  });

  it('starts no more ambient threats than it is allowed, and a scripted one still comes', () => {
    const story = new ThreatDirector(THREAT, BIRD, WORLD, () => 0, {
      gentle: false,
      kinds: ['bird'],
      ambient: 0,
    });
    for (let time = 0; time < 300; time += 1) story.step(1, still());
    expect(story.stage).toBe('idle');
    story.request('bird', true);
    story.step(1, still());
    expect(story.stage).toBe('cue');
    for (let time = 0; time < 30 && story.stage !== 'idle'; time += 1) story.step(1, still());
    story.ambientLeft = 1;
    let visits = 0;
    for (let time = 0; time < 600; time += 1) {
      const before = story.stage;
      story.step(1, still());
      if (before === 'idle' && story.stage === 'cue') visits += 1;
    }
    expect(visits).toBe(1);
    expect(story.ambientLeft).toBe(0);
  });

  it('waits about 150 s on average for an ambient threat once the gap has passed', () => {
    let sum = 0;
    const runs = 300;
    for (let seed = 1; seed <= runs; seed++) {
      const threat = director(seed);
      let time = 0;
      while (threat.stage === 'idle' && time < 5000) {
        time += 1;
        threat.step(1, still());
      }
      sum += time - THREAT.gap;
    }
    const mean = sum / runs;
    expect(mean).toBeGreaterThan(110);
    expect(mean).toBeLessThan(190);
  });

  it('is never two threats at once', () => {
    const threat = director(3);
    threat.request('bird', false, null, true);
    threat.step(DT, still());
    threat.request('bird', false, null, true);
    const stages: DirectorStage[] = [];
    for (let time = 0; time < 20; time += DT) {
      threat.step(DT, still());
      if (stages[stages.length - 1] !== threat.stage) stages.push(threat.stage);
      if (threat.stage === 'idle') break;
    }
    expect(stages).toEqual(['cue', 'presence', 'release', 'idle']);
  });

  it('notices walking, forgets stillness, and cannot notice a hidden shrimp', () => {
    const threat = director(4);
    threat.request('bird', false, null, true);
    until(threat, 'presence', () => still());
    const legs = threat.legs;
    expect(legs).not.toBeNull();
    // Walking 2 BL from its feet.
    const middle = legs?.middle ?? { x: 0, y: 0 };
    const near = { x: middle.x + 2 * BL, y: middle.y };
    for (let step = 0; step < 30; step++) threat.step(DT, still({ ...near, mode: 'walk' }));
    expect(threat.notice).toBeCloseTo(0.35, 1);
    const noticed = threat.notice;
    for (let step = 0; step < 15; step++) threat.step(DT, still(near));
    expect(threat.notice).toBeCloseTo(noticed - 0.15, 2);
    const before = threat.notice;
    for (let step = 0; step < 15; step++) {
      threat.step(DT, still({ ...near, mode: 'swim', hidden: true }));
    }
    expect(threat.notice).toBeLessThan(before);
  });

  it('halves the gains beyond half the range, and for the first bird', () => {
    const near = director(5);
    near.request('bird', false, null, true);
    until(near, 'presence', () => still());
    const m = near.legs?.middle ?? { x: 0, y: 0 };
    for (let step = 0; step < 30; step++) {
      near.step(DT, still({ x: m.x + 4 * BL, y: m.y, mode: 'walk' }));
    }
    expect(near.notice).toBeCloseTo(0.175, 2);
    const first = director(5);
    first.request('bird', true, null, true);
    until(first, 'presence', () => still());
    const f = first.legs?.middle ?? { x: 0, y: 0 };
    for (let step = 0; step < 30; step++) {
      first.step(DT, still({ x: f.x + 2 * BL, y: f.y, mode: 'walk' }));
    }
    expect(first.notice).toBeCloseTo(0.175, 2);
  });

  it('chases when notice reaches 1, and never in gentle mode', () => {
    for (const gentle of [false, true]) {
      const threat = director(6, gentle);
      threat.request('bird', false, null, true);
      until(threat, 'presence', () => still());
      const m = threat.legs?.middle ?? { x: 0, y: 0 };
      const swimming = () => still({ x: m.x + 2 * BL, y: m.y, mode: 'swim' });
      const seen: DirectorStage[] = [];
      for (let time = 0; time < 15; time += DT) {
        threat.step(DT, swimming());
        if (seen[seen.length - 1] !== threat.stage) seen.push(threat.stage);
        if (threat.stage === 'chase' || threat.stage === 'idle') break;
      }
      if (gentle) expect(seen).not.toContain('chase');
      else expect(seen).toContain('chase');
    }
  });

  it('strikes where a still shrimp is, after the long first warning, and corners it', () => {
    const threat = director(7);
    threat.request('bird', false, null, true);
    until(threat, 'presence', () => still());
    const m = threat.legs?.middle ?? { x: 0, y: 0 };
    const spot = { x: m.x + 2 * BL, y: m.y };
    chaseNow(threat, spot);
    const events = until(threat, 'cornered', () => still(spot), 10);
    const ring = events.find((one) => one.type === 'ring');
    expect(ring).toMatchObject({ x: spot.x, y: spot.y, warn: 1.3 });
    expect(events.find((one) => one.type === 'strike')).toMatchObject({ hit: true });
    until(threat, 'release', () => still(spot), 4);
  });

  it('misses a shrimp that walks out of the ring, and gives up after the third strike', () => {
    const threat = director(8);
    threat.request('bird', false, null, true);
    until(threat, 'presence', () => still());
    const m = threat.legs?.middle ?? { x: 0, y: 0 };
    chaseNow(threat, { x: m.x + 2 * BL, y: m.y + BL });
    let side = 1;
    let x = m.x + 2 * BL;
    const events: ThreatEvent[] = [];
    for (let time = 0; time < 12 && threat.stage !== 'release'; time += DT) {
      const step = threat.step(DT, still({ x, y: m.y + side * BL, mode: 'walk', vx: 0, vy: 0 }));
      events.push(...step);
      // Each time a ring shows, step 1 BL aside.
      if (step.some((one) => one.type === 'ring')) {
        side = -side;
        x += 0.1 * BL;
      }
    }
    const strikes = events.filter((one) => one.type === 'strike');
    expect(strikes).toHaveLength(3);
    for (const strike of strikes) expect(strike).toMatchObject({ hit: false });
    expect(threat.stage).toBe('release');
    // A later ring warns for 1 s only.
    const rings = events.filter((one) => one.type === 'ring');
    expect(rings[1]).toMatchObject({ warn: 1 });
  });

  it('never strikes a shrimp under cover, and gives up once it has hidden for 2 s', () => {
    const threat = director(9);
    threat.request('bird', false, null, true);
    until(threat, 'presence', () => still());
    const m = threat.legs?.middle ?? { x: 0, y: 0 };
    const spot = { x: m.x + 2 * BL, y: m.y };
    chaseNow(threat, spot);
    let rings = 0;
    for (let time = 0; time < 2.1; time += DT) {
      const events = threat.step(DT, still({ ...spot, hidden: true, underCover: true }));
      rings += events.filter((one) => one.type === 'ring').length;
    }
    expect(rings).toBe(0);
    expect(threat.stage).toBe('release');
  });

  it('gives up when the shrimp is 8 BL from its feet', () => {
    const threat = director(10);
    threat.request('bird', false, null, true);
    until(threat, 'presence', () => still());
    const m = threat.legs?.middle ?? { x: 0, y: 0 };
    chaseNow(threat, { x: m.x + 2 * BL, y: m.y });
    threat.step(DT, still({ x: m.x + 8.5 * BL, y: m.y }));
    expect(threat.stage).toBe('release');
  });

  it('gives the same threats for the same seed', () => {
    const run = (seed: number) => {
      const threat = director(seed);
      const out: string[] = [];
      for (let time = 0; time < 600; time += 0.5) {
        for (const event of threat.step(0.5, still())) {
          if (event.type === 'stage') out.push(`${time}:${event.stage}`);
        }
      }
      return out;
    };
    expect(run(11)).toEqual(run(11));
    expect(run(11)).not.toEqual(run(12));
  });

  it('lets each shrimp feel the shadow pass close once, and see the bird once', () => {
    const threat = director(13);
    threat.request('bird', false, null, true);
    const felt: string[] = [];
    for (let time = 0; time < 6; time += DT) {
      threat.step(DT, still());
      felt.push(...threat.felt('player', 1000, 1400));
      felt.push(...threat.felt('far', 5000, 3500));
    }
    expect(felt.filter((one) => one === 'shadow')).toHaveLength(1);
    expect(felt.filter((one) => one === 'predatorSeen')).toHaveLength(1);
  });

  it('says the predator is in sight and the chase is after the player', () => {
    const threat = director(14);
    threat.request('bird', false, null, true);
    until(threat, 'presence', () => still());
    expect(threat.view(1000, 1400, true)).toMatchObject({ inSight: true, afterMe: false });
    chaseNow(threat, { x: 1000, y: 1400 });
    expect(threat.view(1000, 1400, true)).toMatchObject({ stage: 'chase', afterMe: true });
    expect(threat.view(1000, 1400, false)?.afterMe).toBe(false);
    expect(threat.view(5900, 3900, true)?.inSight).toBe(false);
  });
});

describe('the wading bird', () => {
  it('stands 4 to 6 BL from the shrimp, at least 2 BL from cover', () => {
    for (let index = 0; index < 12; index++) {
      const angle = (index / 12) * Math.PI * 2;
      const shrimp = { x: 1000, y: 1400 };
      const stand = standPoint(shrimp, angle, WORLD, BIRD);
      const distance = Math.hypot(stand.x - shrimp.x, stand.y - shrimp.y) / BL;
      expect(distance).toBeGreaterThanOrEqual(4 - 1e-9);
      expect(distance).toBeLessThanOrEqual(6 + 1e-9);
      for (const cover of COVERS) {
        expect(distanceToCover(stand.x, stand.y, cover) / BL).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it('strikes home only within 0.7 BL of the ring, and never under cover', () => {
    const ring = { x: 0, y: 0 };
    expect(strikeLands(ring, { x: 69, y: 0 }, false, BL, BIRD)).toBe(true);
    expect(strikeLands(ring, { x: 71, y: 0 }, false, BL, BIRD)).toBe(false);
    expect(strikeLands(ring, { x: 0, y: 0 }, true, BL, BIRD)).toBe(false);
  });

  it('aims the first strike at the shrimp, and later ones 0.25 s ahead', () => {
    const shrimp = { x: 1000, y: 1400 };
    const velocity = { x: 200, y: 0 };
    expect(aimPoint(shrimp, velocity, true, WORLD, BIRD)).toEqual(shrimp);
    expect(aimPoint(shrimp, velocity, false, WORLD, BIRD)).toEqual({ x: 1050, y: 1400 });
  });

  it('does not aim into a root', () => {
    const rooted = {
      ...WORLD,
      obstacles: [{ shape: 'circle' as const, x: 1050, y: 1400, r: 40 }],
    };
    const shrimp = { x: 1000, y: 1400 };
    expect(aimPoint(shrimp, { x: 200, y: 0 }, false, rooted, BIRD)).toEqual(shrimp);
  });

  it('steps one leg 2 BL in 1.2 s, with a ring where it lands', () => {
    const legs = new Legs(BIRD, BL, { x: 0, y: 0 }, 0);
    expect(legs.arrive()).toHaveLength(1);
    let landed = legs.step(1.21);
    expect(landed).toHaveLength(1);
    const before = legs.middle;
    legs.stepToward({ x: 1000, y: 0 });
    expect(legs.moving).toBe(true);
    landed = legs.step(0.6);
    expect(landed).toHaveLength(0);
    landed = legs.step(0.61);
    expect(landed).toHaveLength(1);
    // One foot went 2 BL along, so the middle moved 1 BL.
    expect(legs.middle.x - before.x).toBeCloseTo(BL, 0);
  });
});

describe('cornered', () => {
  it('wakes the shrimp in the nearest shelter 6 BL or more from the predator', () => {
    const shrimp = { x: 1000, y: 1400 };
    const start = { x: 50, y: 50 };
    const away = CORNERED.away * BL;
    // The predator stands by the nearest cover, so the next one is chosen.
    const shelter = shelterFor(shrimp, { x: 1100, y: 1300 }, COVERS, away, 0.5, start);
    expect(shelter.cover).toBe(COVERS[2]);
    expect(distanceToCover(shelter.x, shelter.y, COVERS[2] ?? COVERS[0]!)).toBeLessThan(0);
    // Far from the predator, the nearest one.
    const near = shelterFor(shrimp, { x: 5000, y: 3500 }, COVERS, away, 0.5, start);
    expect(near.cover).toBe(COVERS[0]);
  });

  it('falls back to the place’s start when no shelter is far enough', () => {
    const shelter = shelterFor({ x: 1000, y: 1400 }, { x: 1000, y: 1400 }, COVERS, 10000, 0.5, {
      x: 50,
      y: 60,
    });
    expect(shelter).toEqual({ cover: null, x: 50, y: 60 });
  });
});
