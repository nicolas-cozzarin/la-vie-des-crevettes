import type { AreaDef } from './types';

/**
 * A patch of sand with a few rocks. It is not part of the story: it exists to
 * get the shrimp's movement right before anything else is built on it.
 */
export const sandFlat: AreaDef = {
  id: 'sandFlat',
  size: { w: 3600, h: 2400 },
  ground: 'ground.sand',
  spawn: { x: 1800, y: 1250, heading: -Math.PI / 2 },
  obstacles: [
    { shape: 'circle', x: 1380, y: 980, r: 120, image: 'rock.a' },
    { shape: 'circle', x: 1560, y: 860, r: 70, image: 'rock.b' },
    { shape: 'circle', x: 2320, y: 1120, r: 150, image: 'rock.c' },
    { shape: 'circle', x: 2520, y: 1290, r: 85, image: 'rock.a' },
    { shape: 'circle', x: 1900, y: 1680, r: 95, image: 'rock.b' },
    { shape: 'circle', x: 860, y: 1520, r: 170, image: 'rock.c' },
    { shape: 'circle', x: 1060, y: 1700, r: 60, image: 'rock.b' },
    { shape: 'circle', x: 2880, y: 620, r: 130, image: 'rock.a' },
    { shape: 'circle', x: 620, y: 520, r: 100, image: 'rock.c' },
    { shape: 'circle', x: 3020, y: 1820, r: 110, image: 'rock.b' },
    { shape: 'circle', x: 1750, y: 420, r: 80, image: 'rock.a' },
    { shape: 'rect', x: 1980, y: 700, w: 420, h: 110, image: 'rock.slab' },
    { shape: 'rect', x: 1280, y: 1960, w: 120, h: 300, image: 'rock.slab' },
  ],
  scatter: [
    {
      image: 'pebble',
      zone: { x: 0, y: 0, w: 3600, h: 2400 },
      count: 160,
      seed: 7,
      size: [10, 30],
    },
  ],
};
