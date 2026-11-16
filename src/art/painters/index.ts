import type { Painter } from '../paint';
import { channelPainters } from './channel';
import { creaturePainters } from './creatures';
import { driftPainters } from './drift';
import { effectPainters } from './effects';
import { lagoonPainters } from './lagoon';
import { lagoonAnimalPainters } from './lagoonAnimals';
import { mangrovePainters } from './mangrove';
import { shrimpPainters } from './shrimp';
import { worldPainters } from './world';

/** Every painter, by image name. See docs/14-art-production.md. */
export const PAINTERS: Readonly<Record<string, Painter>> = {
  ...shrimpPainters,
  ...worldPainters,
  ...driftPainters,
  ...mangrovePainters,
  ...lagoonPainters,
  ...creaturePainters,
  ...lagoonAnimalPainters,
  ...channelPainters,
  ...effectPainters,
};

/** Painters by family, for the atelier. `ground` is the colour shown behind them. */
export interface PainterGroup {
  id: string;
  title: string;
  ground: string;
  names: string[];
}

export const PAINTER_GROUPS: PainterGroup[] = [
  { id: 'shrimp', title: 'Shrimp parts', ground: '#5C4630', names: Object.keys(shrimpPainters) },
  { id: 'world', title: 'Shared', ground: '#E3D5AD', names: Object.keys(worldPainters) },
  { id: 'drift', title: 'Drift', ground: '#12394A', names: Object.keys(driftPainters) },
  { id: 'mangrove', title: 'Mangrove', ground: '#5C4630', names: Object.keys(mangrovePainters) },
  { id: 'lagoon', title: 'Lagoon', ground: '#E3D5AD', names: Object.keys(lagoonPainters) },
  { id: 'creatures', title: 'Creatures', ground: '#5C4630', names: Object.keys(creaturePainters) },
  {
    id: 'lagoonAnimals',
    title: 'Lagoon animals',
    ground: '#E3D5AD',
    names: Object.keys(lagoonAnimalPainters),
  },
  { id: 'channel', title: 'Channel', ground: '#33434A', names: Object.keys(channelPainters) },
  { id: 'effects', title: 'Effects', ground: '#3F4E52', names: Object.keys(effectPainters) },
];
