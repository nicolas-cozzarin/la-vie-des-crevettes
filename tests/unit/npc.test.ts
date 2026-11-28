import { describe, expect, it } from 'vitest';
import {
  chooseBehaviour,
  fleeAt,
  scoreBehaviours,
  type ChoiceView,
} from '../../src/core/npc/behaviours';
import { AlarmNet } from '../../src/core/npc/alarm';
import { NpcMind, type NpcWorld, type SeenShrimp } from '../../src/core/npc/NpcMind';
import { shoalPull } from '../../src/core/npc/shoal';
import { steer } from '../../src/core/npc/steer';
import { seededRandom } from '../../src/core/random';
import { COMPANIONS } from '../../src/data/shrimp';
import { ALARM, CLOSE, GREET, MOTION, NPC, SHOAL, STEER } from '../../src/data/tuning';

const BL = 100;

function view(more: Partial<ChoiceView> = {}): ChoiceView {
  return {
    feelings: { hunger: 0.3, fear: 0, comfort: 0.5, curiosity: 0, company: 0 },
    calm: true,
    wary: false,
    cue: false,
    sinceAlarm: Infinity,
    coverGap: null,
    food: false,
    greetable: false,
    called: false,
    shoalGap: null,
    lagoonDay: false,
    ...more,
  };
}

describe('choosing what to do', () => {
  it('flee thresholds: Nacre 0.38, Écume 0.50, Brise 0.64', () => {
    expect(fleeAt(COMPANIONS.nacre.temperament.boldness, NPC)).toBeCloseTo(0.38);
    expect(fleeAt(COMPANIONS.ecume.temperament.boldness, NPC)).toBeCloseTo(0.5);
    expect(fleeAt(COMPANIONS.brise.temperament.boldness, NPC)).toBeCloseTo(0.64);
  });

  it('the same fear sends Nacre running and leaves Brise where she is', () => {
    const fear = view({ feelings: { ...view().feelings, fear: 0.45 } });
    const nacre = scoreBehaviours(fear, COMPANIONS.nacre.temperament, NPC);
    const brise = scoreBehaviours(fear, COMPANIONS.brise.temperament, NPC);
    expect(chooseBehaviour(nacre, null, NPC.keep)).toBe('flee');
    expect(chooseBehaviour(brise, null, NPC.keep)).not.toBe('flee');
  });

  it('hides with fear of 0.3 and cover within 1.5 BL', () => {
    const near = view({ feelings: { ...view().feelings, fear: 0.32 }, coverGap: 1.2 });
    const scores = scoreBehaviours(near, COMPANIONS.brise.temperament, NPC);
    expect(scores.hide).toBe(1);
    expect(chooseBehaviour(scores, null, NPC.keep)).toBe('hide');
    const far = scoreBehaviours({ ...near, coverGap: 2 }, COMPANIONS.brise.temperament, NPC);
    expect(far.hide).toBe(0);
  });

  it('freezes for 1 s after a neighbour takes fright', () => {
    const just = scoreBehaviours(view({ sinceAlarm: 0.5 }), COMPANIONS.brise.temperament, NPC);
    expect(just.freeze).toBe(0.9);
    const later = scoreBehaviours(view({ sinceAlarm: 1.2 }), COMPANIONS.brise.temperament, NPC);
    expect(later.freeze).toBe(0);
  });

  it('grazes as hungry as it is, and greets by how alone and how sociable it is', () => {
    const scores = scoreBehaviours(
      view({
        food: true,
        greetable: true,
        feelings: { ...view().feelings, hunger: 0.8, company: 0.2 },
      }),
      COMPANIONS.ecume.temperament,
      NPC,
    );
    expect(scores.graze).toBeCloseTo(0.8);
    expect(scores.greet).toBeCloseTo(0.8 * 0.8);
  });

  it('travels while farther than 4 BL from where the shoal makes for (T113)', () => {
    const t = COMPANIONS.ecume.temperament;
    expect(scoreBehaviours(view({ journeyGap: 6 }), t, NPC).travel).toBe(0.85);
    expect(scoreBehaviours(view({ journeyGap: 3 }), t, NPC).travel).toBe(0);
    expect(scoreBehaviours(view({ journeyGap: null }), t, NPC).travel).toBe(0);
    expect(scoreBehaviours(view(), t, NPC).travel).toBe(0);
  });

  it('the behaviour in progress keeps its +0.15', () => {
    const scores = { ...scoreBehaviours(view(), COMPANIONS.nacre.temperament, NPC) };
    scores.rest = scores.wander - 0.1;
    expect(chooseBehaviour(scores, null, NPC.keep)).toBe('wander');
    expect(chooseBehaviour(scores, 'rest', NPC.keep)).toBe('rest');
    scores.rest = scores.wander - 0.2;
    expect(chooseBehaviour(scores, 'rest', NPC.keep)).toBe('wander');
  });
});

describe('alarm', () => {
  it('reaches neighbours within 5 BL after 0.15 to 0.4 s, and no one further', () => {
    const net = new AlarmNet(ALARM, BL, seededRandom(1));
    const shrimp = [
      { id: 'a', x: 0, y: 0 },
      { id: 'b', x: 300, y: 0 },
      { id: 'c', x: 600, y: 0 },
    ];
    expect(net.raise('a', 0, 0, 10, shrimp)).toBe(1);
    expect(net.due(10.14)).toEqual([]);
    const arrived = net.due(10.4);
    expect(arrived.map((alarm) => alarm.to)).toEqual(['b']);
  });

  it('each shrimp feels it at most once every 5 s', () => {
    const net = new AlarmNet(ALARM, BL, seededRandom(2));
    const shrimp = [
      { id: 'a', x: 0, y: 0 },
      { id: 'b', x: 100, y: 0 },
      { id: 'c', x: 0, y: 100 },
    ];
    net.raise('a', 0, 0, 0, shrimp);
    expect(
      net
        .due(1)
        .map((alarm) => alarm.to)
        .sort(),
    ).toEqual(['b', 'c']);
    net.raise('c', 0, 100, 1, shrimp);
    // b felt one a moment ago: this one passes it by. a had none yet.
    expect(net.due(2).map((alarm) => alarm.to)).toEqual(['a']);
    net.raise('a', 0, 0, 7, shrimp);
    expect(
      net
        .due(8)
        .map((alarm) => alarm.to)
        .sort(),
    ).toEqual(['b', 'c']);
  });

  it('a shrimp raises it at most once every 5 s', () => {
    const net = new AlarmNet(ALARM, BL, seededRandom(3));
    const shrimp = [
      { id: 'a', x: 0, y: 0 },
      { id: 'b', x: 100, y: 0 },
    ];
    expect(net.raise('a', 0, 0, 0, shrimp)).toBe(1);
    expect(net.raise('a', 0, 0, 2, shrimp)).toBe(0);
    expect(net.raise('a', 0, 0, 5, shrimp)).toBe(1);
  });
});

describe('steering', () => {
  it('goes straight when the way is clear, and stops on arrival', () => {
    const axis = steer({ x: 0, y: 0 }, { x: 500, y: 0 }, BL, 26, [], null, STEER);
    expect(axis.x).toBeCloseTo(1);
    expect(axis.y).toBeCloseTo(0);
    const there = steer({ x: 0, y: 0 }, { x: 20, y: 0 }, BL, 26, [], null, STEER);
    expect(there).toEqual({ x: 0, y: 0 });
  });

  it('turns aside round a root in the way', () => {
    const root = { shape: 'circle' as const, x: 80, y: 0, r: 40 };
    const axis = steer({ x: 0, y: 0 }, { x: 500, y: 0 }, BL, 26, [root], null, STEER);
    expect(Math.abs(axis.y)).toBeGreaterThan(0.2);
    expect(axis.x).toBeGreaterThan(0);
  });
});

describe('the shoal', () => {
  it('pulls toward the middle when far, and pushes apart when too close', () => {
    const far = shoalPull(
      { id: 'a', x: 0, y: 0, heading: 0 },
      [
        { id: 'b', x: 1000, y: 0, heading: Math.PI / 2 },
        { id: 'c', x: 1000, y: 0, heading: -Math.PI / 2 },
      ],
      BL,
      SHOAL,
    );
    expect(far.x).toBeGreaterThan(0.3);
    const close = shoalPull(
      { id: 'a', x: 0, y: 0, heading: 0 },
      [
        { id: 'b', x: 30, y: 0, heading: Math.PI / 2 },
        { id: 'c', x: 30, y: 0, heading: -Math.PI / 2 },
      ],
      BL,
      SHOAL,
    );
    expect(close.x).toBeLessThan(-0.5);
  });
});

describe('the mind of another shrimp', () => {
  const player: SeenShrimp = {
    id: 'player',
    x: 0,
    y: 0,
    heading: 0,
    mode: 'rest',
    player: true,
    stage: 'stranger',
    busy: false,
  };

  function world(more: Partial<NpcWorld> = {}): NpcWorld {
    return {
      time: 0,
      x: 1000,
      y: 0,
      heading: Math.PI,
      mode: 'rest',
      feelings: { hunger: 0.1, fear: 0, comfort: 0.5, curiosity: 0, company: 0 },
      mood: 'calm',
      wary: false,
      activity: 'free',
      tucked: false,
      covers: [],
      foods: [],
      others: [{ ...player, x: 5000 }],
      cue: false,
      called: false,
      shoal: null,
      lagoonDay: false,
      ...more,
    };
  }

  function mind(temperament = COMPANIONS.nacre.temperament): NpcMind {
    return new NpcMind(
      {
        id: 'nacre',
        temperament,
        bodyLengthPx: BL,
        radiusPx: MOTION.radius * BL,
        home: { x: 1000, y: 0 },
        obstacles: [],
        bounds: null,
        random: seededRandom(7),
        firstChoice: 0,
      },
      {
        npc: NPC,
        steer: STEER,
        shoal: SHOAL,
        greetReach: GREET.reach,
        dartEvery: MOTION.dartTime + MOTION.glideTime,
        close: CLOSE,
      },
    );
  }

  it('flees with a tail flip toward cover and away from the fright', () => {
    const nacre = mind();
    const cover = { x: 1600, y: 0, r: 200 };
    const intent = nacre.step(
      1 / 30,
      world({ feelings: { ...world().feelings, fear: 0.45 }, covers: [cover] }),
    );
    expect(nacre.behaviour).toBe('flee');
    expect(intent.dart).toBe(true);
    expect(intent.axis.x).toBeGreaterThan(0.9);
  });

  it('a Stranger steps away from a player who comes close, and backs off further when rushed', () => {
    const nacre = mind();
    const near = nacre.step(1 / 30, world({ others: [{ ...player, x: 920 }] }));
    expect(near.axis.x).toBeGreaterThan(0);
    const other = mind();
    const rushed = other.step(1 / 30, world({ others: [{ ...player, x: 850, mode: 'swim' }] }));
    expect(rushed.axis.x).toBeGreaterThan(0.9);
  });

  it('a Familiar shrimp lets the player come close', () => {
    const nacre = mind();
    const intent = nacre.step(
      1 / 30,
      world({ others: [{ ...player, x: 920, stage: 'familiar' }] }),
    );
    expect(intent.axis.x).toBeLessThanOrEqual(0);
  });

  it('greets back: it turns to the player and presses Greet', () => {
    const nacre = mind();
    nacre.step(1 / 30, world());
    nacre.greetBack(0.1, 'player');
    const intent = nacre.step(
      1 / 30,
      world({ time: 0.1, others: [{ ...player, x: 900, stage: 'familiar' }] }),
    );
    expect(nacre.behaviour).toBe('greet');
    expect(intent.greet).toBe(true);
    expect(intent.greetWith).toBe('player');
  });

  it('waiting to molt, walks to cover within reach and tucks in, then keeps still', () => {
    const nacre = mind();
    const cover = { x: 1500, y: 0, r: 150 };
    const afraid = { ...world().feelings, fear: 0.9 };
    const walk = (time: number) =>
      nacre.step(1 / 30, world({ time, covers: [cover], molting: 'signal', feelings: afraid }));
    let moved = false;
    for (let time = 0; time < 2; time += 1 / 30) if (walk(time).axis.x > 0.5) moved = true;
    expect(moved).toBe(true);
    expect(nacre.moltInOpen).toBe(false);
    const near = nacre.step(
      1 / 30,
      world({ x: 1400, covers: [cover], molting: 'signal', feelings: afraid }),
    );
    expect(near.hide).toBe(true);
    expect(near.dart).toBe(false);
    const tucked = nacre.step(
      1 / 30,
      world({ x: 1400, covers: [cover], molting: 'soft', activity: 'hiding', tucked: true }),
    );
    expect(tucked).toMatchObject({ hide: true, dart: false, axis: { x: 0, y: 0 } });
  });

  it('with no cover within reach, molts where it stands', () => {
    const nacre = mind();
    const far = { x: 1000 + 12 * BL, y: 0, r: 150 };
    const intent = nacre.step(1 / 30, world({ covers: [far], molting: 'signal' }));
    expect(nacre.moltInOpen).toBe(true);
    expect(intent).toMatchObject({ hide: false, axis: { x: 0, y: 0 } });
  });

  it('at Close, leads to its favourite, waits when the player falls behind, and grazes there', () => {
    const nacre = mind();
    const fuzz = { id: 'fuzz', kind: 'seagrassFuzz' as const, x: 2000, y: 0, r: 100, amount: 1 };
    const close = { ...player, x: 900, stage: 'close' as const };
    let walked = false;
    for (let time = 0; time < 2; time += 1 / 30) {
      const intent = nacre.step(1 / 30, world({ time, leading: fuzz, others: [close] }));
      if (intent.axis.x > 0.5) walked = true;
    }
    expect(walked).toBe(true);
    const waits = nacre.step(1 / 30, world({ time: 2, x: 1500, leading: fuzz, others: [close] }));
    expect(waits.axis).toEqual({ x: 0, y: 0 });
    expect(waits.look).toMatchObject({ x: 900 });
    const there = nacre.step(
      1 / 30,
      world({ time: 3, x: 1850, leading: fuzz, others: [{ ...close, x: 1700 }] }),
    );
    expect(nacre.ledThere).toBe(true);
    expect(nacre.behaviour).toBe('graze');
    expect(there.interact).toBe(true);
    // Far from the shoal, it still eats its fill where it led the player.
    const far = [{ id: 'young.1', x: -3000, y: 0, heading: 0 }];
    const hungry = { ...world().feelings, hunger: 0.5 };
    for (let time = 3.5; time < 6; time += 0.5) {
      nacre.step(1 / 30, world({ time, x: 1850, feelings: hungry, shoal: far, foods: [fuzz] }));
    }
    expect(nacre.behaviour).toBe('graze');
  });

  it('at Close, comes to rest touching a player who keeps still', () => {
    const nacre = mind();
    const beside = { x: 1500, y: 0 };
    const calm = { ...world().feelings, comfort: 0.6 };
    let walked = false;
    for (let time = 0; time < 2; time += 1 / 30) {
      const intent = nacre.step(1 / 30, world({ time, restBeside: beside, feelings: calm }));
      if (nacre.behaviour === 'rest' && intent.axis.x > 0.3) walked = true;
    }
    expect(nacre.behaviour).toBe('rest');
    expect(walked).toBe(true);
    const touching = nacre.step(
      1 / 30,
      world({ time: 2.1, x: 1420, restBeside: beside, feelings: calm }),
    );
    expect(touching.axis).toEqual({ x: 0, y: 0 });
  });

  it('sidesteps when asked, with a tail flip the way it is told', () => {
    const nacre = mind();
    nacre.step(1 / 30, world());
    nacre.sidestep({ x: 0, y: 1 });
    const intent = nacre.step(1 / 30, world({ time: 0.1 }));
    expect(intent).toMatchObject({ dart: true, axis: { x: 0, y: 1 } });
    expect(nacre.step(1 / 30, world({ time: 0.2 })).dart).toBe(false);
  });

  it('travels with the tide toward where the shoal makes for, and stays there once arrived (T113)', () => {
    const nacre = mind();
    const travelling = world({ journey: { x: 200, y: 0 } });
    const intent = nacre.step(1 / 30, travelling);
    expect(nacre.behaviour).toBe('travel');
    // Unpaced, at full strength: it swims.
    expect(intent.axis.x).toBeLessThan(-0.9);
    // Within 4 BL, travel no longer scores; within 2 it has arrived and chooses again.
    nacre.step(1 / 30, { ...travelling, x: 350, time: 0.6 });
    expect(nacre.behaviour).not.toBe('travel');
  });

  it('a fright comes before the journey', () => {
    const nacre = mind();
    nacre.step(
      1 / 30,
      world({
        journey: { x: 200, y: 0 },
        feelings: { ...world().feelings, fear: 0.45 },
        covers: [{ x: 1600, y: 0, r: 200 }],
      }),
    );
    expect(nacre.behaviour).toBe('flee');
  });

  it('comes when called, and stops within 3 BL', () => {
    const nacre = mind();
    const called = world({ called: true, others: [{ ...player, x: 0, stage: 'companion' }] });
    const intent = nacre.step(1 / 30, called);
    expect(nacre.behaviour).toBe('follow');
    expect(intent.axis.x).toBeLessThan(-0.9);
    const close = nacre.step(1 / 30, { ...called, x: 250, time: 0.1 });
    expect(close.axis).toEqual({ x: 0, y: 0 });
  });
});
