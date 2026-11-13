/**
 * The shrimp's body parts as images. Proportions are those of a whiteleg
 * shrimp seen from above, in body lengths (BL). The rig in
 * `src/entities/ShrimpRig.ts` places these parts. A painted file with the same
 * name and the same origin can replace any of them.
 */

/** Pixels per body length in the part images. Higher than on screen, to stay crisp. */
export const PART_PX_PER_BL = 360;
/** Clear space around each part, for its soft edge. */
export const PART_MARGIN_PX = 10;

export interface PartDef {
  /** Image name. */
  name: string;
  /** Length along the body axis, in BL. */
  length: number;
  /** Widest half-width, in BL. */
  halfWidth: number;
  /** Half-width along the part, from its rear end (0) to its front end (`length`). */
  profile: readonly (readonly [number, number])[];
  /** Where the part attaches, measured from its rear end, in BL. */
  origin: number;
}

/** Body measurements the rig needs, in BL. Rostrum tip to tail fan tip is about 1. */
export const SHRIMP = {
  /** From the carapace's rear edge to its front edge. */
  carapace: 0.31,
  /** Six abdominal segments, front to back. */
  segmentLengths: [0.082, 0.08, 0.078, 0.076, 0.07, 0.064],
  segmentHalfWidths: [0.07, 0.068, 0.065, 0.06, 0.053, 0.045],
} as const;

export const PARTS = {
  /** Carapace with the rostrum. Attached at the rear, where the abdomen begins. */
  carapace: {
    name: 'shrimp.carapace',
    length: 0.425,
    halfWidth: 0.076,
    profile: [
      [0, 0.04],
      [0.012, 0.06],
      [0.05, 0.072],
      [0.11, 0.076],
      [0.19, 0.072],
      [0.26, 0.061],
      [0.31, 0.046],
      [0.332, 0.032],
      [0.342, 0.012],
      [0.37, 0.007],
      [0.425, 0],
    ],
    origin: 0.025,
  },
  /** One abdominal segment. The rig scales it for each of the six. */
  segment: {
    name: 'shrimp.segment',
    length: 0.1,
    halfWidth: 0.075,
    profile: [
      [0, 0.022],
      [0.006, 0.046],
      [0.018, 0.064],
      [0.04, 0.072],
      [0.1, 0.075],
    ],
    origin: 0.1,
  },
  /** The pointed middle of the tail fan. */
  telson: {
    name: 'shrimp.telson',
    length: 0.1,
    halfWidth: 0.024,
    profile: [
      [0, 0],
      [0.03, 0.01],
      [0.07, 0.019],
      [0.1, 0.024],
    ],
    origin: 0.1,
  },
  /** One blade of the tail fan. There are two on each side. */
  uropod: {
    name: 'shrimp.uropod',
    length: 0.14,
    halfWidth: 0.032,
    profile: [
      [0, 0.008],
      [0.012, 0.021],
      [0.045, 0.032],
      [0.085, 0.03],
      [0.122, 0.019],
      [0.14, 0.011],
    ],
    origin: 0.14,
  },
  /** Antennal scale: a flat blade beside each eye. Attached at its base. */
  scale: {
    name: 'shrimp.scale',
    length: 0.12,
    halfWidth: 0.02,
    profile: [
      [0, 0.012],
      [0.03, 0.02],
      [0.08, 0.017],
      [0.12, 0],
    ],
    origin: 0,
  },
} as const satisfies Record<string, PartDef>;

/** A stalked eye. Attached at the base of the stalk, which points right. */
export const EYE = {
  name: 'shrimp.eye',
  stalk: 0.04,
  radius: 0.025,
  sizePx: Math.round((0.04 + 0.025 * 2) * PART_PX_PER_BL) + PART_MARGIN_PX * 2,
} as const;

export function partSize(part: PartDef): { width: number; height: number } {
  return {
    width: Math.round(part.length * PART_PX_PER_BL) + PART_MARGIN_PX * 2,
    height: Math.round(part.halfWidth * 2 * PART_PX_PER_BL) + PART_MARGIN_PX * 2,
  };
}

/** Where the part attaches, as a share of the image's width. */
export function partOriginX(part: PartDef): number {
  return (PART_MARGIN_PX + part.origin * PART_PX_PER_BL) / partSize(part).width;
}

export function eyeOriginX(): number {
  return PART_MARGIN_PX / EYE.sizePx;
}
