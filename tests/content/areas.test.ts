import { describe, expect, it } from 'vitest';
import { imageFit } from '../../src/art/fit';
import { PAINTERS } from '../../src/art/painters';
import { AREA_IDS, FOOD_KINDS } from '../../src/core/world/kinds';
import { lagoon } from '../../src/data/areas/lagoon';
import { mangrove } from '../../src/data/areas/mangrove';
import { AREAS, areaFor, isPlayableArea } from '../../src/data/areas/index';
import { mirrorArea } from '../../src/data/areas/mirror';
import type { AreaDef, WallDef, Zone } from '../../src/data/areas/types';

/**
 * Every file in src/data/areas is tested, including files added later, so
 * there is no list here to keep up to date. A file holds one area, exported
 * under the file's name, and the area's id is that name too. The types, the
 * list of playable areas and the mirror are the only other files there.
 */
const modules = import.meta.glob<Record<string, unknown>>(
  [
    '../../src/data/areas/*.ts',
    '!../../src/data/areas/types.ts',
    '!../../src/data/areas/index.ts',
    '!../../src/data/areas/mirror.ts',
  ],
  { eager: true },
);

function isArea(value: unknown): value is AreaDef {
  return typeof value === 'object' && value !== null && 'size' in value && 'spawn' in value;
}

const areas: Record<string, AreaDef> = {};
for (const module of Object.values(modules)) {
  for (const value of Object.values(module)) if (isArea(value)) areas[value.id] = value;
}

describe('the area files', () => {
  it('are found', () => {
    expect(Object.keys(areas)).toContain('mangrove');
  });

  it.each(Object.entries(modules))('%s holds one area, named like the file', (path, module) => {
    const name = path.split('/').pop()?.replace(/\.ts$/, '');
    const found = Object.entries(module).filter(([, value]) => isArea(value));
    expect(found.length).toBe(1);
    const [exported, area] = found[0] ?? [];
    expect(exported).toBe(name);
    expect((area as AreaDef).id).toBe(name);
  });
});

/** Every image an area asks for, with where it is asked. */
function imagesOf(area: AreaDef): [string, string][] {
  const images: [string, string][] = [['ground', area.ground]];
  for (const patch of area.groundPatches ?? []) images.push(['ground patch', patch.image]);
  for (const obstacle of area.obstacles) images.push(['obstacle', obstacle.image]);
  for (const wall of area.walls ?? []) images.push(['wall', wall.image]);
  for (const scatter of area.scatter) images.push(['scatter', scatter.image]);
  for (const cover of area.cover ?? []) if (cover.image) images.push([cover.id, cover.image]);
  for (const food of area.food ?? []) images.push([food.id, `food.${food.kind}`]);
  for (const landmark of area.landmarks ?? []) images.push([landmark.id, landmark.image]);
  if (area.light?.dapple) images.push(['dapple', area.light.dapple]);
  if (area.light?.murk) images.push(['murk', area.light.murk]);
  return images;
}

function inside(area: AreaDef, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x <= area.size.w && y <= area.size.h;
}

function zoneInside(area: AreaDef, zone: Zone): boolean {
  return inside(area, zone.x, zone.y) && inside(area, zone.x + zone.w, zone.y + zone.h);
}

/** True when the point is inside something that stops the shrimp. */
function blocked(area: AreaDef, x: number, y: number, clear = 0): boolean {
  for (const shape of [...area.obstacles, ...(area.blocks ?? [])]) {
    if (shape.shape === 'circle') {
      if (Math.hypot(x - shape.x, y - shape.y) < shape.r + clear) return true;
    } else if (
      x > shape.x - clear &&
      x < shape.x + shape.w + clear &&
      y > shape.y - clear &&
      y < shape.y + shape.h + clear
    ) {
      return true;
    }
  }
  for (const wall of area.walls ?? []) {
    const along = wall.side === 'top' || wall.side === 'bottom' ? x : y;
    if (along < wall.from || along > wall.to) continue;
    const into =
      wall.side === 'top'
        ? y
        : wall.side === 'bottom'
          ? area.size.h - y
          : wall.side === 'left'
            ? x
            : area.size.w - x;
    if (into < wall.depth + clear) return true;
  }
  return false;
}

/** The two ends of an edge strip, as points halfway into its solid part. */
function wallEnds(area: AreaDef, wall: WallDef): { x: number; y: number; at: number }[] {
  const length = wall.side === 'top' || wall.side === 'bottom' ? area.size.w : area.size.h;
  return [wall.from, wall.to]
    .filter((at) => at > 0 && at < length)
    .map((at) => {
      const into = wall.depth / 2;
      if (wall.side === 'top') return { x: at, y: into, at };
      if (wall.side === 'bottom') return { x: at, y: area.size.h - into, at };
      if (wall.side === 'left') return { x: into, y: at, at };
      return { x: area.size.w - into, y: at, at };
    });
}

/** Each area as written, and turned round as it is when the coast is (D40, doc 19). */
const asPlayed: [string, AreaDef][] = Object.entries(areas).flatMap(([name, area]) => [
  [name, area],
  [`${name}, mirrored`, mirrorArea(area)],
]);

describe.each(asPlayed)('area %s', (_name, area) => {
  const bl = area.bodyLengthPx ?? 110;

  it('asks only for images that have a painter', () => {
    for (const [where, image] of imagesOf(area)) {
      expect(PAINTERS[image], `${where}: ${image}`).toBeDefined();
    }
  });

  it('gives every thing its own id', () => {
    const ids = [
      ...(area.cover ?? []),
      ...(area.food ?? []),
      ...(area.landmarks ?? []),
      ...(area.creatures ?? []),
      ...(area.shrimp ?? []),
      ...(area.triggers ?? []),
    ].map((thing) => thing.id);
    expect(new Set(ids).size).toBe(ids.length);
    const zones = (area.zones ?? []).map((zone) => zone.id);
    expect(new Set(zones).size).toBe(zones.length);
  });

  it('offers only foods from the closed list', () => {
    for (const food of area.food ?? []) expect(FOOD_KINDS, food.id).toContain(food.kind);
  });

  it('keeps every thing inside the area', () => {
    const things = [
      ...area.obstacles.map((thing, index) => ({ ...thing, id: `obstacle ${index}` })),
      ...(area.cover ?? []),
      ...(area.food ?? []),
      ...(area.landmarks ?? []),
      ...(area.creatures ?? []),
      ...(area.shrimp ?? []),
    ];
    for (const thing of things) expect(inside(area, thing.x, thing.y), thing.id).toBe(true);
    for (const zone of area.zones ?? []) expect(zoneInside(area, zone.zone), zone.id).toBe(true);
    for (const trigger of area.triggers ?? []) {
      expect(zoneInside(area, trigger.zone), trigger.id).toBe(true);
    }
    for (const exit of area.exits ?? []) expect(zoneInside(area, exit.zone), exit.to).toBe(true);
  });

  it('starts the player in open water', () => {
    expect(blocked(area, area.spawn.x, area.spawn.y, bl * 0.5)).toBe(false);
  });

  it('puts no shrimp and no food inside something solid', () => {
    for (const shrimp of area.shrimp ?? []) {
      expect(blocked(area, shrimp.x, shrimp.y, bl * 0.25), shrimp.id).toBe(false);
    }
    for (const food of area.food ?? []) expect(blocked(area, food.x, food.y), food.id).toBe(false);
  });

  it('sizes round obstacles and edge strips from the fit table', () => {
    for (const obstacle of area.obstacles) {
      if (obstacle.shape === 'circle') {
        expect(imageFit(obstacle.image).fill, obstacle.image).toBeGreaterThan(0);
      }
    }
    for (const wall of area.walls ?? []) {
      const fit = imageFit(wall.image);
      expect(fit.tile, wall.image).toBe('x');
      expect(fit.solid, wall.image).toBeGreaterThan(0);
      expect(wall.to).toBeGreaterThan(wall.from);
    }
  });

  it('turns pictures with painted light only a little', () => {
    for (const obstacle of area.obstacles) {
      if (!obstacle.image.startsWith('mangrove.root.')) continue;
      expect(Math.abs(obstacle.rotation ?? 0), `${obstacle.x}, ${obstacle.y}`).toBeLessThanOrEqual(
        0.5,
      );
    }
  });

  it('lays litter on the bed, lit like the rest, with no food on or beside it (D43)', () => {
    for (const piece of (area.landmarks ?? []).filter((thing) =>
      thing.image.startsWith('waste.'),
    )) {
      expect(piece.layer, piece.id).toBe('ground');
      expect(Math.abs(piece.rotation ?? 0), piece.id).toBeLessThanOrEqual(0.6);
      for (const food of area.food ?? []) {
        const gap =
          Math.hypot(food.x - piece.x, food.y - piece.y) - piece.width / 2 - food.size / 2;
        expect(gap, `${piece.id} and ${food.id}`).toBeGreaterThanOrEqual(bl);
      }
    }
  });

  it('closes every end of an edge strip that the player can see', () => {
    for (const wall of area.walls ?? []) {
      for (const end of wallEnds(area, wall)) {
        const closed = area.obstacles.some(
          (obstacle) =>
            obstacle.shape === 'circle' &&
            Math.hypot(end.x - obstacle.x, end.y - obstacle.y) < obstacle.r,
        );
        expect(closed, `${wall.side} strip ends at ${end.at} with nothing over it`).toBe(true);
      }
    }
  });

  it('leads only to places that exist', () => {
    for (const exit of area.exits ?? []) expect(AREA_IDS).toContain(exit.to);
  });
});

describe('the playable areas', () => {
  it('are areas with a file', () => {
    for (const [id, area] of Object.entries(AREAS)) {
      expect(areas[id], id).toBe(area);
      expect(isPlayableArea(id)).toBe(true);
    }
    expect(isPlayableArea('toString')).toBe(false);
    expect(isPlayableArea('nowhere')).toBe(false);
  });

  it('are played as written while the coast is not turned round', () => {
    expect(areaFor('mangrove')).toBe(mangrove);
  });
});

describe('the mirror', () => {
  it.each(Object.entries(areas))('turned twice gives %s back', (_name, area) => {
    const twice = mirrorArea(mirrorArea(area));
    const points = (each: AreaDef) => [
      each.spawn,
      ...each.obstacles,
      ...(each.cover ?? []),
      ...(each.food ?? []),
      ...(each.landmarks ?? []),
      ...(each.creatures ?? []),
      ...(each.shrimp ?? []),
    ];
    const before = points(area);
    const after = points(twice);
    expect(after.length).toBe(before.length);
    before.forEach((point, index) => {
      expect(after[index]?.x).toBeCloseTo(point.x);
      expect(after[index]?.y).toBeCloseTo(point.y);
    });
    expect(twice.walls).toEqual(area.walls);
    (area.zones ?? []).forEach((zone, index) => {
      expect(twice.zones?.[index]?.zone.x).toBeCloseTo(zone.zone.x);
    });
  });

  it('puts the left side on the right', () => {
    const turned = mirrorArea(mangrove);
    expect(turned.spawn.x).toBeCloseTo(mangrove.size.w - mangrove.spawn.x);
    expect(turned.spawn.y).toBe(mangrove.spawn.y);
    const sides = (each: AreaDef) => (each.walls ?? []).map((wall) => wall.side);
    expect(sides(turned)).toEqual(
      sides(mangrove).map((side) => (side === 'left' ? 'right' : side === 'right' ? 'left' : side)),
    );
    const exit = (mangrove.exits ?? [])[0];
    const turnedExit = (turned.exits ?? [])[0];
    if (exit && turnedExit) {
      expect(turnedExit.zone.x + turnedExit.zone.w).toBeCloseTo(mangrove.size.w - exit.zone.x);
    }
  });
});

describe('the mangrove', () => {
  const bank = (mangrove.walls ?? []).find((wall) => wall.image === 'mangrove.bank');

  it('keeps the fiddler crabs on the bank, out of the water', () => {
    expect(bank).toBeDefined();
    for (const creature of mangrove.creatures ?? []) {
      if (creature.kind !== 'fiddlerCrab') continue;
      expect(creature.y, creature.id).toBeLessThan((bank as WallDef).depth - 60);
    }
  });

  it('leaves the creek mouth open', () => {
    const exit = (mangrove.exits ?? [])[0];
    expect(exit).toBeDefined();
    if (!exit) return;
    // A way at least six body lengths wide between the two clumps.
    const x = exit.zone.x + exit.zone.w + 200;
    let open = 0;
    for (let y = exit.zone.y; y <= exit.zone.y + exit.zone.h; y += 10) {
      if (!blocked(mangrove, x, y, 30)) open += 10;
    }
    expect(open).toBeGreaterThan(6 * 110);
  });

  it('has cover within five body lengths of every point of the clearing', () => {
    const clearing = (mangrove.zones ?? []).find((zone) => zone.id === 'D');
    expect(clearing).toBeDefined();
    if (!clearing) return;
    const { x, y, w, h } = clearing.zone;
    for (let px = x; px <= x + w; px += 100) {
      for (let py = y; py <= y + h; py += 100) {
        const nearest = Math.min(
          ...(mangrove.cover ?? []).map((cover) =>
            Math.max(0, Math.hypot(px - cover.x, py - cover.y) - cover.r),
          ),
        );
        expect(nearest, `${px}, ${py}`).toBeLessThanOrEqual(5 * 110);
      }
    }
  });
});

/** Open length along a line across the area, in steps of 10 px. */
function openAlong(area: AreaDef, points: { x: number; y: number }[], clear: number): number {
  return points.filter((point) => !blocked(area, point.x, point.y, clear)).length * 10;
}

function zoneOf(area: AreaDef, id: string): Zone {
  const zone = (area.zones ?? []).find((each) => each.id === id);
  expect(zone, `zone ${id}`).toBeDefined();
  return (zone as { zone: Zone }).zone;
}

function inZone(zone: Zone, x: number, y: number): boolean {
  return x >= zone.x && y >= zone.y && x <= zone.x + zone.w && y <= zone.y + zone.h;
}

describe('the lagoon', () => {
  const bl = lagoon.bodyLengthPx ?? 110;
  const column = (x: number, from: number, to: number) =>
    Array.from({ length: Math.floor((to - from) / 10) + 1 }, (_, index) => ({
      x,
      y: from + index * 10,
    }));

  it('puts each creature and companion in the zone doc 11 gives it', () => {
    const where: Record<string, string> = {
      turtle: 'C',
      pistolAndGoby: 'D',
      huntingFish: 'G',
      brise: 'E',
      ecume: 'E',
      nacre: 'A',
      seaStar: 'H',
      'burrow.pistol': 'D',
    };
    const things = [
      ...(lagoon.creatures ?? []),
      ...(lagoon.shrimp ?? []),
      ...(lagoon.landmarks ?? []),
    ];
    for (const [id, zoneId] of Object.entries(where)) {
      const thing = things.find((each) => each.id === id);
      expect(thing, id).toBeDefined();
      if (!thing) continue;
      expect(inZone(zoneOf(lagoon, zoneId), thing.x, thing.y), `${id} in ${zoneId}`).toBe(true);
    }
  });

  it('sends the turtle round the meadow from clump to clump, about 40 BL round (T106)', () => {
    const turtle = (lagoon.creatures ?? []).find((each) => each.kind === 'turtle');
    const route = (turtle?.route ?? []).map((id) =>
      (lagoon.cover ?? []).find((cover) => cover.id === id),
    );
    expect(route.length).toBeGreaterThan(3);
    const meadow = zoneOf(lagoon, 'C');
    let round = 0;
    route.forEach((cover, index) => {
      expect(cover?.kind).toBe('seagrass');
      if (!cover) return;
      expect(inZone(meadow, cover.x, cover.y), cover.id).toBe(true);
      const next = route[(index + 1) % route.length];
      if (next) round += Math.hypot(next.x - cover.x, next.y - cover.y) / bl;
    });
    expect(round).toBeGreaterThan(35);
    expect(round).toBeLessThan(50);
  });

  it('leaves the way in from the mangrove open', () => {
    const open = openAlong(lagoon, column(lagoon.size.w - 300, 1800, 3500), bl * 0.25);
    expect(open).toBeGreaterThan(6 * bl);
  });

  it('leaves the pass to the channel open', () => {
    const exit = (lagoon.exits ?? []).find((each) => each.to === 'channel');
    expect(exit).toBeDefined();
    if (!exit) return;
    const x = exit.zone.x + exit.zone.w + 200;
    const open = openAlong(lagoon, column(x, exit.zone.y, exit.zone.y + exit.zone.h), bl * 0.25);
    expect(open).toBeGreaterThan(6 * bl);
  });

  it('has seagrass within five body lengths of every point of the meadow', () => {
    const { x, y, w, h } = zoneOf(lagoon, 'C');
    const grass = (lagoon.cover ?? []).filter((cover) => cover.kind === 'seagrass');
    expect(grass.length).toBeGreaterThan(0);
    for (let px = x; px <= x + w; px += 100) {
      for (let py = y; py <= y + h; py += 100) {
        const nearest = Math.min(
          ...grass.map((cover) => Math.max(0, Math.hypot(px - cover.x, py - cover.y) - cover.r)),
        );
        expect(nearest, `${px}, ${py}`).toBeLessThanOrEqual(5 * bl);
      }
    }
  });
});

describe('litter (D43)', () => {
  const count = (area: AreaDef): number =>
    (area.landmarks ?? []).filter((thing) => thing.image.startsWith('waste.')).length;

  it('grows toward the farm: rare in the mangrove, more in the lagoon', () => {
    expect(count(mangrove)).toBeGreaterThan(0);
    expect(count(mangrove)).toBeLessThanOrEqual(3);
    expect(count(lagoon)).toBeGreaterThan(count(mangrove));
  });
});
