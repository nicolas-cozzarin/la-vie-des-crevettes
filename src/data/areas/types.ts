import type { Obstacle } from '../../core/movement/collision';

/** An obstacle and the image drawn for it. */
export type ObstacleDef = Obstacle & { image: string };

/** Small things on the bed that are only looked at. */
export interface ScatterDef {
  image: string;
  zone: { x: number; y: number; w: number; h: number };
  count: number;
  seed: number;
  /** Size range in design pixels. */
  size: [number, number];
}

/** The parts of an area that exist so far. See docs/06-architecture.md. */
export interface AreaDef {
  id: string;
  /** Design pixels. */
  size: { w: number; h: number };
  ground: string;
  spawn: { x: number; y: number; heading?: number };
  obstacles: ObstacleDef[];
  scatter: ScatterDef[];
}
