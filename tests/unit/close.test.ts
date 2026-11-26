import { describe, expect, it } from 'vitest';
import { leadTo, sidestepNow } from '../../src/core/npc/close';
import type { FoodSpot } from '../../src/core/food/FoodPatch';
import { CLOSE } from '../../src/data/tuning';

const BL = 100;

function food(more: Partial<FoodSpot>): FoodSpot {
  return { id: 'f', kind: 'seagrassFuzz', x: 1000, y: 0, r: 100, amount: 1, ...more };
}

describe('a companion at Close', () => {
  it('leads to the nearest patch of her favourite that still holds enough', () => {
    const foods = [
      food({ id: 'far', x: 2500 }),
      food({ id: 'other kind', kind: 'sandFilm', x: 300 }),
      food({ id: 'bare', x: 400, amount: 0.2 }),
      food({ id: 'near', x: 1200 }),
    ];
    expect(leadTo({ x: 0, y: 0 }, 'seagrassFuzz', foods, BL, CLOSE.lead)?.id).toBe('near');
    expect(leadTo({ x: 0, y: 0 }, 'mangroveLeaf', foods, BL, CLOSE.lead)).toBeNull();
    expect(
      leadTo({ x: 0, y: 0 }, 'seagrassFuzz', [food({ x: 31 * BL })], BL, CLOSE.lead),
    ).toBeNull();
  });
});

describe('a companion with the player, at a charge', () => {
  // The fish swims to the right along y = 0, its head at x = 0.
  const charge = { head: { x: 0, y: 0 }, heading: 0 };

  it('darts square to the line, on her side, a beat before the head reaches her', () => {
    const above = sidestepNow(charge, { x: 300, y: -50 }, BL, CLOSE.sidestep);
    expect(above?.x).toBeCloseTo(0);
    expect(above?.y).toBeCloseTo(-1);
    const below = sidestepNow(charge, { x: 300, y: 80 }, BL, CLOSE.sidestep);
    expect(below?.y).toBeCloseTo(1);
  });

  it('does nothing while the charge is still far, once it has passed, or when it is not coming at her', () => {
    expect(sidestepNow(charge, { x: 500, y: 0 }, BL, CLOSE.sidestep)).toBeNull();
    expect(sidestepNow(charge, { x: -50, y: 0 }, BL, CLOSE.sidestep)).toBeNull();
    expect(sidestepNow(charge, { x: 200, y: 200 }, BL, CLOSE.sidestep)).toBeNull();
  });
});
