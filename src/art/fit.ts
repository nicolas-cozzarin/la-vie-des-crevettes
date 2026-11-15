/**
 * How the solid part of an image sits inside the image. The game and the
 * atelier use this to size and layer a picture from the thing it stands for.
 */
export interface ImageFit {
  /**
   * Round things. The share of the image's half-width that is solid: an
   * obstacle of radius r is drawn 2r / fill wide, so that the soft skirt
   * around it falls outside the part that stops the shrimp.
   */
  fill?: number;
  /** Boxes. Clear space around the solid part, in image pixels. */
  margin?: number;
  /** The image repeats in both directions, or sideways only. */
  tile?: 'both' | 'x';
  /** Edge strips. The share of the image's height, from the top, that is solid. */
  solid?: number;
  /** Drawn above the shrimp, and faded while the player is beneath it. */
  cover?: boolean;
  /** Laid over the picture with a blend that only lightens. */
  light?: boolean;
}

const FIT: Readonly<Record<string, ImageFit>> = {
  'ground.sand': { tile: 'both' },
  'fx.grain': { tile: 'both' },
  'rock.a': { fill: 0.84 },
  'rock.b': { fill: 0.84 },
  'rock.c': { fill: 0.84 },
  'rock.slab': { margin: 12 },
  'mangrove.mud': { tile: 'both' },
  'mangrove.sandmud': { tile: 'both' },
  'mangrove.root.a': { fill: 0.46 },
  'mangrove.root.b': { fill: 0.46 },
  'mangrove.root.c': { fill: 0.46 },
  'mangrove.root.d': { fill: 0.46 },
  'mangrove.root.e': { fill: 0.46 },
  'mangrove.root.f': { fill: 0.46 },
  'mangrove.clump': { fill: 0.62 },
  'mangrove.wall': { tile: 'x', solid: 0.56 },
  'mangrove.bank': { tile: 'x', solid: 0.6 },
  'mangrove.tangle.a': { fill: 0.9, cover: true },
  'mangrove.tangle.b': { fill: 0.9, cover: true },
  'mangrove.hollow': { fill: 0.9, cover: true },
  'mangrove.leaf.floating.a': { cover: true },
  'mangrove.leaf.floating.b': { cover: true },
  'thing.seedPod.standing': { fill: 0.5 },
  'lagoon.seagrass.a': { fill: 0.8, cover: true },
  'lagoon.seagrass.b': { fill: 0.8, cover: true },
  'lagoon.seagrass.c': { fill: 0.8, cover: true },
  'rock.overhang': { margin: 40, cover: true },
  'lagoon.reef': { tile: 'x', solid: 0.5 },
  'lagoon.shore': { tile: 'x', solid: 0.56 },
  'light.dapple': { tile: 'both', light: true },
  'light.caustics': { tile: 'both', light: true },
  'drift.shaft': { light: true },
};

export function imageFit(name: string): ImageFit {
  return FIT[name] ?? {};
}
