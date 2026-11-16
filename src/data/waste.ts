import type { LandmarkDef } from './areas/types';

/**
 * Litter left by people on the wild coast (D43). It lies on the bed as decor:
 * never cover, never solid, no food on it, never mentioned. Where it lies is
 * in docs/11-world-catalogue.md, "Litter".
 */
export type WasteKind = 'bottle' | 'bag' | 'rope' | 'sandal' | 'foam' | 'sack' | 'pipe';

/**
 * The real width, in centimetres, that each piece's whole image stands for,
 * margin included. A bottle is 20 cm long, a sandal 25, a folded sack 70.
 */
export const WASTE_IMAGE_CM: Readonly<Record<WasteKind, number>> = {
  bottle: 23.5,
  bag: 41,
  rope: 64,
  sandal: 30,
  foam: 14,
  sack: 86,
  pipe: 60,
};

/**
 * A piece of litter at its true size for the area: `pxPerCm` is the area's
 * body length in pixels over the shrimp's real length there (doc 11, "Scale").
 */
export function waste(
  id: string,
  kind: WasteKind,
  x: number,
  y: number,
  pxPerCm: number,
  rotation = 0,
): LandmarkDef {
  return {
    id,
    image: `waste.${kind}`,
    x,
    y,
    width: Math.round(WASTE_IMAGE_CM[kind] * pxPerCm),
    rotation,
    layer: 'ground',
  };
}
