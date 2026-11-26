import { describe, expect, it } from 'vitest';
import { pickMissing, type LossCandidate } from '../../src/core/npc/losses';
import { seededRandom } from '../../src/core/random';
import { LOSSES } from '../../src/data/tuning';

const BL = 100;
const PLAYER = { x: 0, y: 0 };

function shoal(over: Partial<LossCandidate>[] = []): LossCandidate[] {
  const base: LossCandidate[] = [
    { id: 'brise', named: true, x: 3000, y: 0, inView: false },
    { id: 'ecume', named: true, x: 3000, y: 100, inView: false },
    { id: 'young.1', named: false, x: 3000, y: 200, inView: false },
    { id: 'young.2', named: false, x: 3000, y: 300, inView: false },
    { id: 'young.3', named: false, x: 3000, y: 400, inView: false },
    { id: 'young.4', named: false, x: 3000, y: 500, inView: false },
  ];
  return base.map((one, index) => ({ ...one, ...(over[index] ?? {}) }));
}

describe('losses from the shoal (doc 10, "Losses", D42)', () => {
  it('never takes a named shrimp', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const picked = pickMissing('net', shoal(), PLAYER, BL, seededRandom(seed), LOSSES);
      expect(picked).not.toContain('brise');
      expect(picked).not.toContain('ecume');
    }
  });

  it('never takes one in view or within 10 BL of the player', () => {
    const seen = shoal([{}, {}, { inView: true }, { x: 500 }, { inView: true }, { x: 900, y: 0 }]);
    for (let seed = 1; seed <= 200; seed++) {
      expect(pickMissing('net', seen, PLAYER, BL, seededRandom(seed), LOSSES)).toEqual([]);
    }
  });

  it('keeps at least two unnamed shrimp', () => {
    const three = shoal().slice(0, 5);
    for (let seed = 1; seed <= 200; seed++) {
      expect(
        pickMissing('net', three, PLAYER, BL, seededRandom(seed), LOSSES).length,
      ).toBeLessThanOrEqual(1);
    }
    const two = shoal().slice(0, 4);
    for (let seed = 1; seed <= 200; seed++) {
      expect(pickMissing('net', two, PLAYER, BL, seededRandom(seed), LOSSES)).toEqual([]);
    }
  });

  it('takes one about one time in two after the fish, one in three after the bird, and always after the net', () => {
    const rate = (kind: 'bird' | 'fish' | 'net') => {
      let taken = 0;
      for (let seed = 1; seed <= 2000; seed++) {
        if (pickMissing(kind, shoal(), PLAYER, BL, seededRandom(seed), LOSSES).length > 0) taken++;
      }
      return taken / 2000;
    };
    expect(rate('fish')).toBeGreaterThan(0.44);
    expect(rate('fish')).toBeLessThan(0.56);
    expect(rate('bird')).toBeGreaterThan(0.28);
    expect(rate('bird')).toBeLessThan(0.39);
    expect(rate('net')).toBe(1);
  });

  it('draws the same with the same seed, so a run replays', () => {
    const a = pickMissing('fish', shoal(), PLAYER, BL, seededRandom(42), LOSSES);
    const b = pickMissing('fish', shoal(), PLAYER, BL, seededRandom(42), LOSSES);
    expect(a).toEqual(b);
  });
});
