import { describe, expect, it } from 'vitest';
import { pickMolter, StayingClose, type MoltCandidate } from '../../src/core/npc/companionMolt';
import { NPC } from '../../src/data/tuning';

const BL = 100;
const player = { x: 0, y: 0 };

function one(more: Partial<MoltCandidate>): MoltCandidate {
  return { id: 'brise', named: true, bond: 0.4, x: 300, y: 0, molts: 0, ...more };
}

describe("a companion's molt", () => {
  it('is someone named the player knows, close by', () => {
    expect(pickMolter([one({})], player, BL, NPC.molt)).toBe('brise');
    expect(pickMolter([one({ named: false, id: 'young.1' })], player, BL, NPC.molt)).toBeNull();
    expect(pickMolter([one({ bond: 0.1 })], player, BL, NPC.molt)).toBeNull();
    expect(pickMolter([one({ x: 9 * BL })], player, BL, NPC.molt)).toBeNull();
  });

  it('goes to the one who has molted least, then the closest bond', () => {
    const shoal = [
      one({ id: 'brise', bond: 0.7, molts: 1 }),
      one({ id: 'nacre', bond: 0.3 }),
      one({ id: 'ecume', bond: 0.5 }),
    ];
    expect(pickMolter(shoal, player, BL, NPC.molt)).toBe('ecume');
    expect(
      pickMolter(
        shoal.map((each) => ({ ...each, molts: 1 })),
        player,
        BL,
        NPC.molt,
      ),
    ).toBe('brise');
  });

  it('counts the player as staying only if never farther than the reach', () => {
    const reach = NPC.molt.stay * BL;
    const stayed = new StayingClose(reach, true);
    for (const distance of [50, 200, 290, 120]) stayed.step(distance);
    expect(stayed.staying).toBe(true);
    const left = new StayingClose(reach, true);
    left.step(100);
    left.step(320);
    left.step(100);
    expect(left.staying).toBe(false);
    expect(new StayingClose(reach, false).staying).toBe(false);
  });
});
