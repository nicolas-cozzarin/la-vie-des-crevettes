import { describe, expect, it } from 'vitest';
import { seededRandom } from '../../src/core/random';
import { Net, type NetEvent } from '../../src/core/threat/net';
import {
  ThreatDirector,
  type ThreatEvent,
  type ThreatPlayer,
} from '../../src/core/threat/ThreatDirector';
import { BIRD, FISH, NET, THREAT } from '../../src/data/tuning';

/** The net (doc 10, "The net"; T120). */

const BL = 140;
const DT = 1 / 30;
const BOUNDS = { w: 7000, h: 3200 };

/** A net going toward larger x, its lane through the player at (4000, 1600). */
function net(way: 1 | -1 = 1): Net {
  return new Net(NET, BL, way, 1600, { x: 4000, y: 1600 }, BOUNDS);
}

/** Steps a net with the player where `at` says, until `seconds` pass. Returns the events. */
function run(
  one: Net,
  seconds: number,
  at: (time: number) => { x: number; y: number; inCrevice?: boolean },
  catching = true,
): NetEvent[] {
  const events: NetEvent[] = [];
  const start = one.time;
  while (one.time - start < seconds - 1e-9) {
    const spot = at(one.time - start);
    events.push(...one.step(DT, { inCrevice: false, ...spot }, catching));
  }
  return events;
}

describe('the net', () => {
  it('keeps its lane on the player, with room past both side edges', () => {
    expect(Net.laneFor(NET, BL, 1600, 3200)).toBe(1600);
    const reach = (NET.grid.across / 2 + NET.room) * BL;
    expect(Net.laneFor(NET, BL, 200, 3200)).toBe(reach);
    expect(Net.laneFor(NET, BL, 3100, 3200)).toBe(3200 - reach);
  });

  it('sends the hull across the view in 6 s, from out of sight to out of sight', () => {
    const one = net();
    const half = (NET.hull.long * BL) / 2;
    // Its bow comes in 6 BL before the player, just out of view.
    expect(one.hull.x + half).toBeCloseTo(4000 - NET.enter * BL, 5);
    run(one, NET.hull.cross, () => ({ x: 4000, y: 1600 }));
    // Its stern has gone 6 BL past the player.
    expect(one.hull.x - half).toBeCloseTo(4000 + NET.enter * BL, 0);
  });

  it('brings the grid 3 s after the hull, 6 BL before the player, 14 BL across and 6 deep, at 2.2 BL/s', () => {
    const one = net();
    const away = { x: 4000, y: 100 };
    run(one, NET.grid.follow - 0.05, () => away);
    expect(one.band).toBeNull();
    run(one, 0.1, () => away);
    const band = one.band;
    expect(band?.w).toBeCloseTo(NET.grid.deep * BL, 5);
    expect(band?.h).toBeCloseTo(NET.grid.across * BL, 5);
    const front = one.front ?? 0;
    expect(front).toBeGreaterThan(4000 - NET.enter * BL - 1);
    expect(front).toBeLessThan(4000 - NET.enter * BL + 20);
    run(one, 1, () => away);
    expect((one.front ?? 0) - front).toBeCloseTo(NET.grid.speed * BL, 0);
  });

  it('catches up a still shrimp under it for 2.5 s', () => {
    const one = net();
    const events = run(one, 12, () => ({ x: 4000, y: 1600 }));
    const caught = events.findIndex((event) => event.type === 'caught');
    expect(caught).toBeGreaterThanOrEqual(0);
    expect(one.wasUnder).toBe(true);
  });

  it('never catches a shrimp in a crevice: it passes over, and that is the way out', () => {
    const one = net();
    const events = run(one, 20, () => ({ x: 4000, y: 1600, inCrevice: true }));
    expect(events.some((event) => event.type === 'caught' || event.type === 'held')).toBe(false);
    expect(events.some((event) => event.type === 'gone')).toBe(true);
    expect(one.outcome).toEqual({ edge: false, crevice: true });
  });

  it('forgets the time under it once the shrimp is out', () => {
    const one = net();
    run(one, NET.grid.follow + DT, () => ({ x: 4000, y: 100 }));
    // Under it for 2 s, out for a moment, then under it for 2 s again.
    const front = one.front ?? 0;
    const under = (seconds: number) =>
      run(one, seconds, () => ({ x: (one.front ?? front) - 2 * BL, y: 1600 }));
    expect(under(2).some((event) => event.type === 'caught')).toBe(false);
    run(one, 0.2, () => ({ x: one.front ?? 0, y: 100 }));
    expect(under(2).some((event) => event.type === 'caught')).toBe(false);
    expect(under(0.7).some((event) => event.type === 'caught')).toBe(true);
  });

  it('cannot be swum out of the back: its back edge carries the shrimp along', () => {
    const one = net();
    run(one, NET.grid.follow + DT, () => ({ x: 4000, y: 100 }));
    let x = (one.front ?? 0) - BL;
    const events: NetEvent[] = [];
    for (let step = 0; step < 60; step++) {
      // Swimming hard the way the net comes from.
      x -= 2.5 * BL * DT;
      for (const event of one.step(DT, { x, y: 1600, inCrevice: false }, true)) {
        events.push(event);
        if (event.type === 'held') x = event.x;
      }
    }
    expect(events.some((event) => event.type === 'held')).toBe(true);
    expect(x).toBeGreaterThanOrEqual((one.back ?? 0) - 1e-6);
    expect(one.isUnder(x, 1600)).toBe(true);
  });

  it('lets the shrimp out past a side edge: that is the edge', () => {
    const one = net();
    run(one, NET.grid.follow + DT, () => ({ x: 4000, y: 100 }));
    let y = 1600;
    const x = (one.front ?? 0) - BL;
    const events = run(one, 6, () => {
      y += 4 * BL * DT;
      return { x, y };
    });
    expect(events.some((event) => event.type === 'caught')).toBe(false);
    run(one, 12, () => ({ x, y }));
    expect(one.gone).toBe(true);
    expect(one.outcome).toEqual({ edge: true, crevice: false });
  });

  it('only puts things off by running ahead of it', () => {
    const one = net();
    run(one, NET.grid.follow + DT, () => ({ x: 4000, y: 100 }));
    // Into it, then out ahead, faster than it goes.
    let x = (one.front ?? 0) - 0.5 * BL;
    run(one, 2, () => {
      x += 2.5 * BL * DT;
      return { x, y: 1600 };
    });
    expect(one.wayOut).toBe('front');
    expect(one.outcome).toEqual({ edge: false, crevice: false });
  });

  it('has gone once its back edge is 6 BL past the player, or past the end of the place', () => {
    const one = net();
    const events = run(one, 30, () => ({ x: 4000, y: 100 }));
    const gone = events.filter((event) => event.type === 'gone');
    expect(gone).toHaveLength(1);
    expect((one.back ?? 0) - 4000).toBeGreaterThanOrEqual(NET.past * BL - 1);
    const atEnd = net();
    run(atEnd, 60, () => ({ x: 9000, y: 100 }));
    expect(atEnd.gone).toBe(true);
    expect(atEnd.back ?? 0).toBeGreaterThanOrEqual(BOUNDS.w);
  });

  it('goes the other way when the coast is turned round', () => {
    const one = net(-1);
    expect(one.hull.heading).toBe(Math.PI);
    run(one, NET.grid.follow + 1, () => ({ x: 4000, y: 100 }));
    expect(one.front ?? 0).toBeGreaterThan(4000);
    expect(one.back ?? 0).toBeGreaterThan(one.front ?? 0);
  });

  it('holds nobody and catches nobody in gentle mode', () => {
    const one = net();
    const events = run(one, 20, () => ({ x: 4000, y: 1600 }), false);
    expect(events.some((event) => event.type === 'caught' || event.type === 'held')).toBe(false);
    expect(one.gone).toBe(true);
  });

  it('sends a shrimp out across its lane', () => {
    const one = net();
    const from = one.fleeFrom(4200, 1300);
    expect(from).toEqual({ x: 4200, y: 1600 });
  });
});

const WORLD = {
  covers: [{ x: 4000, y: 2400, r: 95 }],
  obstacles: [],
  bounds: { x: 0, y: 0, ...BOUNDS },
  bl: BL,
};

function director(gentle = false): ThreatDirector {
  return new ThreatDirector(
    THREAT,
    BIRD,
    WORLD,
    seededRandom(3),
    { gentle, kinds: ['net'] },
    FISH,
    NET,
  );
}

function player(over: Partial<ThreatPlayer> = {}): ThreatPlayer {
  return {
    x: 4000,
    y: 1600,
    vx: 0,
    vy: 0,
    mode: 'rest',
    hidden: false,
    underCover: false,
    darted: false,
    soft: false,
    coverGap: 2,
    ...over,
  };
}

/** Steps the director for `seconds`, the player where `at` says. */
function play(
  threat: ThreatDirector,
  seconds: number,
  at: (time: number) => ThreatPlayer = () => player(),
): ThreatEvent[] {
  const events: ThreatEvent[] = [];
  for (let time = 0; time < seconds; time += DT) events.push(...threat.step(DT, at(time)));
  return events;
}

describe('the threat director and the net', () => {
  it('never brings the net by itself', () => {
    const threat = director();
    play(threat, 600, () => player({ y: 100 }));
    expect(threat.stage).toBe('idle');
  });

  it('throbs for 4 s, crosses, sweeps, and leaves; the way out is told', () => {
    const threat = director();
    // From the left, toward the player: it goes toward larger x.
    threat.request('net', false, Math.PI);
    const events = play(threat, 0.1);
    expect(threat.stage).toBe('cue');
    expect(threat.net).toBeNull();
    events.push(...play(threat, NET.cue));
    expect(threat.stage).toBe('presence');
    expect(threat.net?.way).toBe(1);
    // Away to the side, it passes.
    events.push(...play(threat, 60, () => player({ y: 100 })));
    expect(threat.stage).toBe('idle');
    const stages = events.flatMap((event) => (event.type === 'stage' ? [event.stage] : []));
    expect(stages).toEqual(['cue', 'presence', 'release', 'idle']);
    expect(events).toContainEqual({ type: 'netPassed', edge: false, crevice: false });
    expect(events.some((event) => event.type === 'escaped' && event.kind === 'net')).toBe(true);
  });

  it('corners a shrimp caught up, and lets the grid go on before it is over', () => {
    const threat = director();
    threat.request('net', false, Math.PI);
    const events = play(threat, NET.cue + NET.grid.follow + 8);
    expect(threat.stage === 'cornered' || threat.stage === 'release').toBe(true);
    expect(events.some((event) => event.type === 'stage' && event.stage === 'cornered')).toBe(true);
    expect(events.some((event) => event.type === 'netPassed')).toBe(false);
    // Woken in a crevice away from it; the grid still has to go by.
    const rest = play(threat, 60, () => player({ x: 4000, y: 2400, inCrevice: true }));
    expect(threat.stage).toBe('idle');
    expect(rest.some((event) => event.type === 'stage' && event.stage === 'idle')).toBe(true);
  });

  it('never corners anyone in gentle mode', () => {
    const threat = director(true);
    threat.request('net', false, Math.PI);
    const events = play(threat, 60);
    expect(events.some((event) => event.type === 'stage' && event.stage === 'cornered')).toBe(
      false,
    );
    expect(threat.stage).toBe('idle');
  });

  it('is heard by each shrimp once at its cue, and its hull is felt crossing close by', () => {
    const threat = director();
    threat.request('net', false, Math.PI);
    play(threat, 0.1);
    expect(threat.felt('nacre', 4000, 1600)).toEqual(['engine']);
    expect(threat.felt('nacre', 4000, 1600)).toEqual([]);
    expect(threat.ongoing(4000, 1600, 1)).toEqual([{ kind: 'engine', amount: NET.engineGrow }]);
    play(threat, NET.cue);
    let shadow = false;
    for (let time = 0; time < NET.hull.cross && !shadow; time += DT) {
      threat.step(DT, player({ y: 100 }));
      shadow = threat.felt('nacre', 4000, 1600).includes('shadow');
    }
    expect(shadow).toBe(true);
  });

  it('weighs on a shrimp under its grid for as long as it is there, and sends it out across', () => {
    const threat = director();
    threat.request('net', false, Math.PI);
    play(threat, NET.cue + NET.grid.follow + 0.2, () => player({ y: 100 }));
    const band = threat.net?.band;
    expect(band).not.toBeNull();
    if (!band) return;
    const lane = threat.net?.lane ?? 0;
    const inside = { x: band.x + band.w / 2, y: lane + 300 };
    expect(threat.ongoing(inside.x, inside.y, 0.5)).toEqual([{ kind: 'netGrid', amount: 0.5 }]);
    expect(threat.ongoing(inside.x, 100, 0.5)).toEqual([]);
    expect(threat.fleeFrom(inside.x, inside.y)).toEqual({ x: inside.x, y: lane });
  });
});
