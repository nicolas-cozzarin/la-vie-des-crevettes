/** Design size. The canvas is scaled to fit the window. See docs/04-art-direction.md. */
export const GAME_WIDTH = 1920;
export const GAME_HEIGHT = 1080;

/** Colours used before any area is loaded. */
export const COLORS = {
  deepTeal: '#0B2A3A',
  paper: '#F6F1E4',
  paleGreen: '#BFE6D8',
} as const;

/** Stand-in until Fraunces and Atkinson Hyperlegible are added to the repository. */
export const FONTS = {
  title: 'Georgia, "Times New Roman", serif',
  text: 'system-ui, "Segoe UI", Helvetica, Arial, sans-serif',
} as const;
