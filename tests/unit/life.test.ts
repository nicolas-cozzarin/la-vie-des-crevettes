import { describe, expect, it } from 'vitest';
import { lifeAfter, newLife } from '../../src/core/progress/life';

/** A life well on its way, with a carnet and counts of its own. */
function lived() {
  const life = newLife();
  life.discoveries.add('place.mangrove');
  life.achievements.add('landfall');
  life.cards.add('journey');
  life.challenges['c1.tastes'] = 2;
  life.stepsDone.add('s1.fill');
  life.narrated.add('narr.c1.arrive');
  life.bonds.nacre = 0.6;
  life.molts = 3;
  life.favourite = 'algaeFilm';
  life.playSeconds = 900;
  life.promptsShown.sense = 2;
  life.stats = {
    tailFlips: 40,
    molts: 3,
    cornered: 2,
    'cornered.mangrove': 1,
    missing: 1,
    'missing.lagoon': 1,
    'released.channel.fish': 2,
    'led.lagoon.brise': 1,
    'best.seaweedSwim': 2,
  };
  return life;
}

describe('the life after (T123)', () => {
  it('keeps the carnet and the counts', () => {
    const next = lifeAfter(lived(), 2);
    expect([...next.discoveries]).toEqual(['place.mangrove']);
    expect([...next.achievements]).toEqual(['landfall']);
    expect([...next.cards]).toEqual(['journey']);
    expect(next.challenges).toEqual({ 'c1.tastes': 2 });
    expect(next.stats.tailFlips).toBe(40);
    expect(next.stats.molts).toBe(3);
    expect(next.stats['best.seaweedSwim']).toBe(2);
    expect(next.playSeconds).toBe(900);
    expect(next.promptsShown).toEqual({ sense: 2 });
  });

  it('begins its own story, its own body and its own bonds', () => {
    const next = lifeAfter(lived(), 2);
    expect(next.stepsDone.size).toBe(0);
    expect(next.narrated.size).toBe(0);
    expect(next.bonds).toEqual({});
    expect(next.molts).toBe(0);
    expect(next.favourite).toBeNull();
  });

  it('leaves behind what the old life counted toward its own story', () => {
    const next = lifeAfter(lived(), 2);
    for (const key of [
      'cornered',
      'cornered.mangrove',
      'missing',
      'missing.lagoon',
      'released.channel.fish',
      'led.lagoon.brise',
    ]) {
      expect(next.stats[key], key).toBeUndefined();
    }
  });

  it('is the next generation, counted for "Second tide", or the same one by default', () => {
    const next = lifeAfter(lived(), 2);
    expect(next.generation).toBe(2);
    expect(next.stats.generation).toBe(2);
    const again = lifeAfter(lived());
    expect(again.generation).toBe(1);
  });

  it('shares nothing with the old life it came from', () => {
    const old = lived();
    const next = lifeAfter(old, 2);
    next.discoveries.add('place.lagoon');
    next.challenges['c1.tastes'] = 3;
    expect(old.discoveries.has('place.lagoon')).toBe(false);
    expect(old.challenges['c1.tastes']).toBe(2);
  });
});
