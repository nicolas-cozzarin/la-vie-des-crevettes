import type { Obstacle } from '../../core/movement/collision';
import type { AreaDef, WallDef, Zone } from './types';

/**
 * The same area with the coast turned round: what was on the left is on the
 * right. Positions, turns and headings are mirrored. Pictures are not, so
 * their light still comes from the upper left. A picture that faces a way is
 * flipped where it is drawn (`faces` in `src/art/fit.ts`). See
 * docs/19-changing-things-safely.md, "Turning the coast round".
 */
export function mirrorArea(area: AreaDef): AreaDef {
  const w = area.size.w;
  const x = (value: number): number => w - value;
  const zone = (z: Zone): Zone => ({ ...z, x: w - z.x - z.w });
  const turn = (rotation: number | undefined): number | undefined =>
    rotation === undefined ? undefined : -rotation;
  const heading = (value: number | undefined): number | undefined =>
    value === undefined ? undefined : Math.PI - value;
  const obstacle = <T extends Obstacle>(o: T): T =>
    o.shape === 'circle' ? { ...o, x: x(o.x) } : { ...o, x: w - o.x - o.w };
  const wall = (strip: WallDef): WallDef => {
    if (strip.side === 'left') return { ...strip, side: 'right' };
    if (strip.side === 'right') return { ...strip, side: 'left' };
    return { ...strip, from: w - strip.to, to: w - strip.from };
  };

  return {
    ...area,
    spawn: { ...area.spawn, x: x(area.spawn.x), heading: heading(area.spawn.heading ?? 0) },
    groundPatches: area.groundPatches?.map((patch) => ({ ...patch, zone: zone(patch.zone) })),
    obstacles: area.obstacles.map((o) => ({ ...obstacle(o), rotation: turn(o.rotation) })),
    blocks: area.blocks?.map(obstacle),
    walls: area.walls?.map(wall),
    scatter: area.scatter.map((scatter) => ({ ...scatter, zone: zone(scatter.zone) })),
    cover: area.cover?.map((cover) => ({
      ...cover,
      x: x(cover.x),
      rotation: turn(cover.rotation),
      drift: cover.drift && {
        x: -cover.drift.x,
        y: cover.drift.y,
        within: zone(cover.drift.within),
      },
    })),
    food: area.food?.map((food) => ({ ...food, x: x(food.x), rotation: turn(food.rotation) })),
    landmarks: area.landmarks?.map((landmark) => ({
      ...landmark,
      x: x(landmark.x),
      rotation: turn(landmark.rotation),
      drift: landmark.drift && {
        x: -landmark.drift.x,
        y: landmark.drift.y,
        within: zone(landmark.drift.within),
      },
    })),
    creatures: area.creatures?.map((creature) => ({
      ...creature,
      x: x(creature.x),
      heading: heading(creature.heading ?? 0),
    })),
    shrimp: area.shrimp?.map((one) => ({
      ...one,
      x: x(one.x),
      heading: heading(one.heading ?? 0),
    })),
    currents: area.currents?.map((current) => ({
      ...current,
      zone: zone(current.zone),
      vx: -current.vx,
    })),
    drifting: area.drifting?.map((one) => ({ ...one, run: zone(one.run) })),
    journey: area.journey?.map((point) => ({ ...point, x: x(point.x) })),
    bed: area.bed && { ...area.bed, zone: zone(area.bed.zone) },
    washes: area.washes?.map((wash) => ({ ...wash, x: x(wash.x) })),
    pond: area.pond && {
      ...area.pond,
      gate: { ...area.pond.gate, x: x(area.pond.gate.x) },
      plume: {
        ...area.pond.plume,
        from: { ...area.pond.plume.from, x: x(area.pond.plume.from.x) },
        to: { ...area.pond.plume.to, x: x(area.pond.plume.to.x) },
      },
    },
    zones: area.zones?.map((named) => ({ ...named, zone: zone(named.zone) })),
    shedShells: area.shedShells?.map((shell) => ({
      ...shell,
      x: x(shell.x),
      heading: Math.PI - shell.heading,
    })),
    triggers: area.triggers?.map((trigger) => ({ ...trigger, zone: zone(trigger.zone) })),
    exits: area.exits?.map((exit) => ({ ...exit, zone: zone(exit.zone) })),
  };
}
