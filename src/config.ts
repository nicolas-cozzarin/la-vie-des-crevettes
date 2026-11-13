/** Design size. The canvas is scaled to fit the window. See docs/04-art-direction.md. */
export const GAME_WIDTH = 1920;
export const GAME_HEIGHT = 1080;

/** Colours used outside any one area: menus, panels and the water at the edge of view. */
export const COLORS = {
  deepTeal: '#0B2A3A',
  paper: '#F6F1E4',
  paleGreen: '#BFE6D8',
  ink: '#2A2A2A',
  inkSoft: '#66625A',
} as const;

/** The same colours as numbers, for shapes. */
export const TINTS = {
  deepTeal: 0x0b2a3a,
  paper: 0xf6f1e4,
  paleGreen: 0xbfe6d8,
  ink: 0x2a2a2a,
  warm: 0xf2d58a,
  water: 0x6cc5c1,
} as const;

/** Stand-in until Fraunces and Atkinson Hyperlegible are added to the repository. */
export const FONTS = {
  title: 'Georgia, "Times New Roman", serif',
  text: 'system-ui, "Segoe UI", Helvetica, Arial, sans-serif',
} as const;

/** The layers of the picture, from the bed up. See docs/04-art-direction.md. */
export const DEPTH = {
  bed: 0,
  groundObjects: 10,
  bedAnimals: 20,
  midWater: 30,
  cover: 40,
  surfaceLight: 50,
  mood: 60,
  interface: 100,
} as const;
