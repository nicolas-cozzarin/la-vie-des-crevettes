import { MOOD_EXPRESSIONS, type RigLook } from '../art/expressions';
import { MOODS, type Mood } from '../core/feelings/mood';
import { mangrove } from '../data/areas/mangrove';
import { paintImage } from './images';
import { renderScene, type SceneView } from './scene';
import { drawStillShrimp, type StillShrimp } from './stillShrimp';

/** What the game shows at once, in design pixels: 1920 by 1080 enlarged 1.4 times. */
const VIEW_W = 1920 / 1.4;
const VIEW_H = 1080 / 1.4;

export interface NamedScene {
  id: string;
  title: string;
  note: string;
  view: SceneView;
}

function around(cx: number, cy: number): Pick<SceneView, 'x' | 'y' | 'w' | 'h' | 'scale'> {
  return { x: cx - VIEW_W / 2, y: cy - VIEW_H / 2, w: VIEW_W, h: VIEW_H, scale: 1.4 };
}

function still(
  mood: Mood,
  x: number,
  y: number,
  heading: number,
  more: Partial<StillShrimp> = {},
): StillShrimp {
  return { x, y, heading, expression: MOOD_EXPRESSIONS[mood], ...more };
}

const NACRE: Partial<RigLook> = { fanPale: 0.8 };
const YOUNG: Partial<RigLook> = { bodyLengthPx: 98 };

const nacre = still('calm', 4590, 2250, 2.4, { look: NACRE, sweep: -0.5 });
const young1 = still('calm', 4200, 2540, 0.5, { look: YOUNG, curve: 0.05 });
const young2 = still('calm', 4950, 2380, -2.0, { look: YOUNG });

/** Views of the mangrove, each the size of the game's screen. */
export const MANGROVE_SCENES: NamedScene[] = [
  {
    id: 'arrival',
    title: 'Arriving at the creek mouth',
    note: 'Zone A. Paler, sandier mud, and the first roots ahead. The shrimp is calm: antennae sweeping, tail fan half open.',
    view: {
      area: mangrove,
      ...around(800, 2000),
      shrimp: [still('calm', 620, 2000, 0)],
      murkAt: { x: 620, y: 2000 },
    },
  },
  {
    id: 'grazing',
    title: 'Grazing among the landing roots',
    note: 'Zone B. A film of algae at the foot of a root. The shrimp is content: antennae loose and wide, tail fan swaying.',
    view: {
      area: mangrove,
      ...around(1400, 1700),
      shrimp: [still('content', 1196, 1706, -0.88)],
      murkAt: { x: 1196, y: 1706 },
    },
  },
  {
    id: 'hiding',
    title: 'Hidden under a root tangle',
    note: 'The tangle fades to 40% while the player is beneath it. The shrimp is afraid: flat to the mud, antennae laid back, fan shut, legs drawn in.',
    view: {
      area: mangrove,
      ...around(1560, 1830),
      shrimp: [still('afraid', 1575, 1850, 0.5)],
      faded: ['tangle.landing'],
      murkAt: { x: 1575, y: 1850 },
    },
  },
  {
    id: 'bird',
    title: 'The clearing, and the bird',
    note: 'Zone D. The bird is never seen whole: a shadow on the water, two feet on the mud, and a ring of ripples where the beak will strike. Cover is all round the rim.',
    view: {
      area: mangrove,
      ...around(3360, 1880),
      shrimp: [still('afraid', 3180, 2010, 2.5, { curve: -0.04 })],
      bird: { x: 3560, y: 1700, heading: 2.5, strikeAt: { x: 3200, y: 2000 } },
      murkAt: { x: 3180, y: 2010 },
    },
  },
  {
    id: 'nacre',
    title: 'Meeting Nacre',
    note: 'Zone E. Nacre has an almost white tail fan. The player is social: antennae reaching toward her. Two young shrimp are near.',
    view: {
      area: mangrove,
      ...around(4480, 2330),
      shrimp: [
        nacre,
        young1,
        young2,
        still('social', 4390, 2420, -0.7, { target: { x: 4530, y: 2290 } }),
      ],
      murkAt: { x: 4390, y: 2420 },
    },
  },
  {
    id: 'crabs',
    title: 'Watching the fiddler crabs',
    note: 'Zone F. The crabs are on the bank, above the waterline, each beside its burrow. The player is curious: antennae pointed straight at one, body leaning in.',
    view: {
      area: mangrove,
      ...around(2450, 380),
      shrimp: [still('curious', 2440, 520, -1.5, { target: { x: 2460, y: 200 } })],
      murkAt: { x: 2440, y: 520 },
    },
  },
  {
    id: 'leafbed',
    title: 'The leaf bed',
    note: 'Zone C. Fallen leaves to eat, seed pods, snails, and a green leaf floating overhead with its shadow on the mud.',
    view: {
      area: mangrove,
      ...around(2300, 3180),
      shrimp: [still('hungry', 2160, 3020, 0.75)],
      murkAt: { x: 2160, y: 3020 },
    },
  },
  {
    id: 'hollow',
    title: 'Inside the hollow',
    note: 'Zone G. The molt shelter: a ring of thick roots with one opening. Shown faded, with the shrimp inside.',
    view: {
      area: mangrove,
      ...around(5020, 1300),
      shrimp: [still('calm', 5040, 1310, 3.0, { curve: 0.03 })],
      faded: ['hollow'],
      murkAt: { x: 5040, y: 1310 },
    },
  },
  {
    id: 'branch',
    title: 'The sunken branch',
    note: 'Zone H, the far corner. One end is sunk in the mud. The other is lifted, and the shrimp can go under it.',
    view: {
      area: mangrove,
      ...around(5250, 3330),
      shrimp: [still('curious', 5120, 3200, 0.9, { target: { x: 5260, y: 3360 } })],
      murkAt: { x: 5120, y: 3200 },
    },
  },
  {
    id: 'map',
    title: 'The whole mangrove',
    note: 'All of chapter 1, with its zones. About 55 by 36 body lengths. The game never shows this view.',
    view: {
      area: mangrove,
      x: 0,
      y: 0,
      w: 6000,
      h: 4000,
      scale: 0.3,
      shrimp: [nacre, young1, young2, still('calm', 620, 2000, 0)],
      showZones: true,
    },
  },
];

export function sceneCanvas(scene: NamedScene): HTMLCanvasElement {
  return renderScene(scene.view);
}

function mudCard(
  width: number,
  height: number,
  zoom: number,
): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  const pattern = ctx.createPattern(paintImage('mangrove.mud'), 'repeat') as CanvasPattern;
  pattern.setTransform(new DOMMatrix().scale(zoom / 1.4));
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, width, height);
  ctx.scale(zoom, zoom);
  return [canvas, ctx];
}

/** One picture of the shrimp for each mood, twice the size it has in the game. */
export function moodCanvas(mood: Mood): HTMLCanvasElement {
  const zoom = 2.8;
  const [canvas, ctx] = mudCard(640, 420, zoom);
  const w = 640 / zoom;
  const h = 420 / zoom;
  const x = w * 0.5;
  const y = h * 0.55;
  const target = { x: w * 0.93, y: h * 0.22 };
  if (mood === 'curious') {
    const pod = paintImage('thing.seedPod.standing');
    ctx.drawImage(pod, target.x - 22, target.y - 22, 44, 44);
  }
  if (mood === 'social') {
    drawStillShrimp(ctx, {
      x: target.x + 34,
      y: target.y - 26,
      heading: 2.5,
      expression: MOOD_EXPRESSIONS.social,
      look: NACRE,
      target: { x: x + 30, y: y - 20 },
    });
  }
  if (mood === 'content') {
    const film = paintImage('food.algaeFilm');
    ctx.drawImage(film, x + 8, y - 62, 96, 96);
  }
  drawStillShrimp(ctx, {
    x,
    y,
    heading: -0.42,
    expression: MOOD_EXPRESSIONS[mood],
    target: mood === 'curious' || mood === 'social' ? target : undefined,
    curve: mood === 'hungry' ? 0.03 : mood === 'content' ? -0.02 : 0,
  });
  return canvas;
}

export const MOOD_NOTES: Record<Mood, string> = {
  calm: 'Antennae sweep slowly. Tail fan half open.',
  hungry: 'Antennae short and quick. Body drawn in a little. Fan narrower.',
  content: 'Antennae loose and wide. Fan open and swaying.',
  curious: 'Antennae pointed at the thing. Body stretched toward it.',
  social: 'Antennae reach toward the other shrimp.',
  afraid: 'Antennae laid back. Flat to the mud. Fan shut. Legs in.',
};

export const MOOD_LIST = MOODS;

interface Companion {
  name: string;
  note: string;
  look: Partial<RigLook>;
}

const COMPANIONS: Companion[] = [
  { name: 'The player', note: 'No marking. The view follows it.', look: {} },
  {
    name: 'Brise',
    note: 'Left antenna a third shorter. A little larger.',
    look: { leftAntennaFactor: 0.67, bodyLengthPx: 115 },
  },
  { name: 'Nacre', note: 'Tail fan almost white.', look: NACRE },
  { name: 'Écume', note: 'Smaller.', look: { bodyLengthPx: 94 } },
];

export function companionCanvases(): { canvas: HTMLCanvasElement; name: string; note: string }[] {
  return COMPANIONS.map((companion) => {
    const zoom = 2.2;
    const [canvas, ctx] = mudCard(480, 330, zoom);
    drawStillShrimp(ctx, {
      x: 480 / zoom / 2 - 6,
      y: 330 / zoom / 2 + 8,
      heading: -0.42,
      expression: MOOD_EXPRESSIONS.calm,
      look: companion.look,
    });
    return { canvas, name: companion.name, note: companion.note };
  });
}
