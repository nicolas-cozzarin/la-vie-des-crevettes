import type { ThreatKind } from '../../core/gameEvents';
import type { Obstacle } from '../../core/movement/collision';
import type { AreaId, FoodKind } from '../../core/world/kinds';

/**
 * An area as data. Positions and sizes are design pixels, with the origin at
 * the top left. Every place and thing is described in docs/11-world-catalogue.md.
 * How a picture is sized from these numbers is in `src/art/fit.ts`.
 */

export interface Zone {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** An obstacle and the image drawn for it. */
export type ObstacleDef = Obstacle & {
  image: string;
  /**
   * Radians. Light is painted into the pictures, from the upper left, so a
   * picture is turned by half a radian at most. For another direction, use
   * another picture of the same thing.
   */
  rotation?: number;
};

/** Small things on the bed that are only looked at. */
export interface ScatterDef {
  image: string;
  zone: Zone;
  count: number;
  seed: number;
  /** Size range in design pixels. */
  size: [number, number];
}

/** A second ground laid over the first, with soft edges. */
export interface GroundPatchDef {
  image: string;
  zone: Zone;
  /** Width of the soft edge. */
  feather: number;
}

/**
 * A strip of the area's edge. Its image repeats along the edge, with its
 * solid part toward the outside. The strip stops the shrimp to `depth`.
 * A strip is cut square where it ends: an end the player can see needs a
 * round obstacle over it, such as `mangrove.clump`. Strips are drawn under
 * obstacles.
 */
export interface WallDef {
  image: string;
  side: 'top' | 'bottom' | 'left' | 'right';
  /** Where the strip starts and ends along its edge. */
  from: number;
  to: number;
  /** How far the solid part reaches into the area. */
  depth: number;
}

export type CoverKind = 'tangle' | 'leaf' | 'hollow' | 'overhang' | 'seagrass' | 'crevice';

/** Something the shrimp can go under. Drawn above it, and faded while the player is beneath. */
export interface CoverDef {
  id: string;
  kind: CoverKind;
  x: number;
  y: number;
  /** How far from the centre the shrimp is sheltered. */
  r: number;
  /** Left out when a landmark already draws it. */
  image?: string;
  /** Width the image is drawn at. Left out, it follows from `r` and the image's fill. */
  width?: number;
  rotation?: number;
  /** A leaf on the surface that drifts, in pixels per second. It wraps inside `within`. */
  drift?: { x: number; y: number; within: Zone };
  /** The journal entry found by going under it. */
  discovery?: string;
}

/** A patch of food. Hunger, time to eat and regrowth come from the kind (doc 10). */
export interface FoodDef {
  id: string;
  kind: FoodKind;
  x: number;
  y: number;
  /** Width the image is drawn at. */
  size: number;
  rotation?: number;
}

/** A thing with a picture and a place, and perhaps a journal entry. */
export interface LandmarkDef {
  id: string;
  image: string;
  x: number;
  y: number;
  /** Width the image is drawn at. */
  width: number;
  rotation?: number;
  /** Drawn on the bed, or above the shrimp. */
  layer: 'ground' | 'cover';
  discovery?: string;
}

export type CreatureKind =
  'fiddlerCrab' | 'snail' | 'hermitCrab' | 'smallFish' | 'turtle' | 'pistolAndGoby' | 'huntingFish';

export interface CreatureDef {
  id: string;
  kind: CreatureKind;
  x: number;
  y: number;
  heading?: number;
  /** For animals that live in groups. */
  count?: number;
  /** For an animal that goes round: the cover it visits, by id, in order (T106). */
  route?: readonly string[];
}

/** A shed shell lying on the bed, drawn by the shrimp's rig, pale (doc 11, `thing.shedShell`; T108). */
export interface ShedShellDef {
  id: string;
  x: number;
  y: number;
  heading: number;
}

/** Another shrimp. `who` is a companion's name or a seed for an unnamed one. */
export interface ShrimpSpawnDef {
  id: string;
  who: 'brise' | 'nacre' | 'ecume' | 'young';
  x: number;
  y: number;
  heading?: number;
}

/** Moving water. Speeds are design pixels per second. */
export interface CurrentDef {
  zone: Zone;
  vx: number;
  vy: number;
}

/** A named part of the area. Entering one can move the story or the journal. */
export interface NamedZone {
  id: string;
  zone: Zone;
  /** The journal entry found by entering. */
  discovery?: string;
  /** Seconds the shrimp must stay inside before the entry is found, as for a sound (T108). */
  after?: number;
}

export interface TriggerDef {
  id: string;
  zone: Zone;
  once: boolean;
}

export interface ExitDef {
  to: AreaId;
  zone: Zone;
  /** Closed until this story step is done. Open from the start in the free life. */
  needsStep?: string;
}

/** What lies over the picture: light from above, and how far the eye reaches. */
export interface LightDef {
  /** A tile of light patches, laid over the bed with a blend that only lightens. */
  dapple?: string;
  /** How strong the dapple is, from 0 to 1. */
  dappleStrength?: number;
  /**
   * An image centred on the shrimp and drawn at twice the size of the view,
   * so that it still covers the screen when the shrimp is near its edge.
   */
  murk?: string;
}

export interface AreaDef {
  id: AreaId | 'sandFlat';
  size: { w: number; h: number };
  /** Length of the player's shrimp here (T25). Left out, the juvenile's length. */
  bodyLengthPx?: number;
  ground: string;
  groundPatches?: GroundPatchDef[];
  spawn: { x: number; y: number; heading?: number };
  obstacles: ObstacleDef[];
  /** Solid shapes with no picture of their own, such as the parts of a landmark. */
  blocks?: Obstacle[];
  walls?: WallDef[];
  scatter: ScatterDef[];
  cover?: CoverDef[];
  food?: FoodDef[];
  landmarks?: LandmarkDef[];
  creatures?: CreatureDef[];
  shrimp?: ShrimpSpawnDef[];
  currents?: CurrentDef[];
  zones?: NamedZone[];
  /** Shed shells on the bed. Each is found as `thing.shedShell`. */
  shedShells?: ShedShellDef[];
  triggers?: TriggerDef[];
  /** The threats that may come here, by doc 11's "Threat" line. Only those built so far. */
  threats?: ThreatKind[];
  exits?: ExitDef[];
  light?: LightDef;
  /** Day, dusk, night and dawn turn here (doc 02, from chapter 2). */
  dayCycle?: boolean;
  /** The bed is sand the shrimp can dig into, anywhere away from cover (doc 02, from chapter 2). */
  sand?: boolean;
  music?: string;
  ambience?: string;
}
