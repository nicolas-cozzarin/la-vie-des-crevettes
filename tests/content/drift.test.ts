import { describe, expect, it } from 'vitest';
import { PAINTERS } from '../../src/art/painters';
import { inRect } from '../../src/core/world/zones';
import { DRIFT_AREA, mirrorDrift, type DriftDef } from '../../src/data/drift';
import { STORY_STEPS } from '../../src/data/story';
import { DRIFT } from '../../src/data/tuning';

/** The Drift as written and turned round: every check runs on both (T24). */
const both: [string, DriftDef][] = [
  ['as written', DRIFT_AREA],
  ['mirrored', mirrorDrift(DRIFT_AREA)],
];

describe('the Drift', () => {
  it('asks only for pictures that have a painter', () => {
    const names = [
      'larva.early',
      'larva.mid',
      'larva.late',
      'food.microalgae.a',
      'food.microalgae.b',
      'food.microalgae.c',
      'drift.copepod',
      'drift.bell',
      'drift.shaft',
      'drift.rootShadow',
      'fx.speck',
    ];
    for (const name of names) expect(PAINTERS[name], name).toBeDefined();
  });

  it('gives itself back when turned round twice', () => {
    expect(mirrorDrift(mirrorDrift(DRIFT_AREA))).toEqual(DRIFT_AREA);
  });

  it('names the zone its story step asks for', () => {
    const zones = new Set(DRIFT_AREA.zones.map((zone) => zone.id));
    for (const step of STORY_STEPS) {
      if (step.when.kind === 'zone' && step.when.area === 'drift') {
        expect(zones.has(step.when.zone as DriftDef['zones'][number]['id'])).toBe(true);
      }
    }
  });

  for (const [name, drift] of both) {
    describe(name, () => {
      const { w, h } = drift.size;
      const inside = (x: number, y: number) => x >= 0 && x <= w && y >= 0 && y <= h;

      it('has five zones, A to E, side by side across the whole width', () => {
        expect(drift.zones.map((zone) => zone.id)).toEqual(['A', 'B', 'C', 'D', 'E']);
        const spans = drift.zones
          .map((zone) => [zone.zone.x, zone.zone.x + zone.zone.w])
          .sort((a, b) => (a[0] ?? 0) - (b[0] ?? 0));
        expect(spans[0]?.[0]).toBe(0);
        expect(spans[spans.length - 1]?.[1]).toBe(w);
        for (let index = 1; index < spans.length; index++) {
          expect(spans[index]?.[0]).toBe(spans[index - 1]?.[1]);
        }
        for (const zone of drift.zones) expect(zone.zone.h).toBe(h);
      });

      it('starts the larva in the dark, and lands it at the start of zone E', () => {
        const a = drift.zones.find((zone) => zone.id === 'A')?.zone;
        const e = drift.zones.find((zone) => zone.id === 'E')?.zone;
        expect(a && inRect(drift.start.x, drift.start.y, a)).toBe(true);
        expect(e).toBeDefined();
        if (!e) return;
        expect([e.x, e.x + e.w]).toContain(drift.landfall);
      });

      it('takes about two minutes to cross, with about ten seconds of the dark', () => {
        const along = (x: number) => (drift.direction > 0 ? x : w - x);
        const flow = DRIFT.motion.flow;
        const crossing = (along(drift.landfall) - along(drift.start.x)) / flow;
        expect(crossing).toBeGreaterThan(90);
        expect(crossing).toBeLessThan(150);
        const b = drift.zones.find((zone) => zone.id === 'B')?.zone;
        if (!b) throw new Error('No zone B');
        const dark = Math.min(Math.abs(b.x - drift.start.x), Math.abs(b.x + b.w - drift.start.x));
        expect(dark / flow).toBeGreaterThanOrEqual(DRIFT.yolk);
      });

      it('keeps everything in the water', () => {
        for (const one of [...drift.copepods, ...drift.bells, ...drift.rootShadows]) {
          expect(inside(one.x, one.y)).toBe(true);
        }
        for (const shaft of drift.shafts) expect(inside(shaft.x, 0)).toBe(true);
        for (const field of drift.clouds) {
          expect(inside(field.zone.x, field.zone.y)).toBe(true);
          expect(inside(field.zone.x + field.zone.w, field.zone.y + field.zone.h)).toBe(true);
        }
        for (const stop of drift.water) expect(inside(stop.x, 0)).toBe(true);
      });

      it('lists the colours of the water from left to right', () => {
        const xs = drift.water.map((stop) => stop.x);
        expect(xs).toEqual([...xs].sort((a, b) => a - b));
        for (const stop of drift.water) expect(stop.color).toMatch(/^#[0-9A-F]{6}$/i);
      });

      it('has no motes in the dark, where the larva lives on its yolk', () => {
        const a = drift.zones.find((zone) => zone.id === 'A')?.zone;
        if (!a) throw new Error('No zone A');
        for (const field of drift.clouds) {
          const overlap = field.zone.x < a.x + a.w && field.zone.x + field.zone.w > a.x;
          expect(overlap).toBe(false);
        }
      });
    });
  }
});
