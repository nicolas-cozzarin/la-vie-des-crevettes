import { MOOD_EXPRESSIONS, type RigLook } from '../art/expressions';
import { MOODS, type Mood } from '../core/feelings/mood';
import { seededRandom } from '../core/random';
import { lagoon } from '../data/areas/lagoon';
import { mangrove } from '../data/areas/mangrove';
import type { AreaDef } from '../data/areas/types';
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

/**
 * In the lagoon the shrimp is older and the world is drawn smaller around it:
 * one body length is 124 pixels. The companions keep their differences.
 */
const L_PLAYER: Partial<RigLook> = { bodyLengthPx: 124 };
const L_BRISE: Partial<RigLook> = { bodyLengthPx: 130, leftAntennaFactor: 0.67 };
const L_ECUME: Partial<RigLook> = { bodyLengthPx: 106 };
const L_YOUNG: Partial<RigLook> = { bodyLengthPx: 110 };

/** The shoal on its ground, zone E, as the data file places it. */
function shoal(mood: Mood): StillShrimp[] {
  return (lagoon.shrimp ?? []).map((one, index) =>
    still(mood, one.x, one.y, one.heading ?? 0, {
      look: one.who === 'brise' ? L_BRISE : one.who === 'ecume' ? L_ECUME : L_YOUNG,
      sweep: index % 2 === 0 ? 0.4 : -0.3,
    }),
  );
}

/** Views of the lagoon, each the size of the game's screen. */
export const LAGOON_SCENES: NamedScene[] = [
  {
    id: 'lagoon-arrival',
    title: 'Out of the creek',
    note: 'Zone A, in full daylight. Muddy sand where the creek opens, two leaves washed out of the mangrove, and the bright net of caustics over everything.',
    view: {
      area: lagoon,
      ...around(7310, 2600),
      shrimp: [still('calm', 7480, 2640, Math.PI, { look: L_PLAYER })],
      murkAt: { x: 7480, y: 2640 },
    },
  },
  {
    id: 'lagoon-flat',
    title: 'Dug in on the flat',
    note: 'Zone B. Bare rippled sand, golden film and two sand mounds. The player has dug in for the day: only the eyes and antennae show.',
    view: {
      area: lagoon,
      ...around(5480, 2860),
      shrimp: [still('calm', 5560, 2980, 2.6, { look: L_PLAYER })],
      burrowed: [0],
      murkAt: { x: 5560, y: 2980 },
    },
  },
  {
    id: 'lagoon-meadow',
    title: 'The turtle in the meadow',
    note: 'Zone C. Clumps of seagrass, some with fuzz on the older blades. The turtle glides between them and stops at a clump to crop it. Its shadow is as large as a root tangle.',
    view: {
      area: lagoon,
      ...around(4400, 900),
      shrimp: [still('curious', 4150, 1240, -1.2, { look: L_PLAYER, target: { x: 4400, y: 900 } })],
      murkAt: { x: 4150, y: 1240 },
    },
  },
  {
    id: 'lagoon-shoal',
    title: 'The shoal at dusk',
    note: 'Zone E. At dusk the shoal comes out of the sand to graze. Brise has the shorter left antenna. Écume is smaller. The player is social: antennae reaching toward Brise.',
    view: {
      area: lagoon,
      ...around(3920, 2760),
      shrimp: [
        ...shoal('content'),
        still('social', 3880, 2620, -2.0, { look: L_PLAYER, target: { x: 3700, y: 2450 } }),
      ],
      time: 'dusk',
      murkAt: { x: 3880, y: 2620 },
    },
  },
  {
    id: 'lagoon-burrow',
    title: 'The goby and the pistol shrimp',
    note: "Zone D. The goby lies in the mouth of the burrow, head out. The pistol shrimp pushes a load of sand out, one antenna on the goby's tail. A slow walk to 2.5 BL is accepted.",
    view: {
      area: lagoon,
      ...around(3600, 4120),
      shrimp: [
        still('curious', 3520, 4300, -Math.PI / 2, {
          look: L_PLAYER,
          target: { x: 3520, y: 3990 },
        }),
      ],
      murkAt: { x: 3520, y: 4300 },
    },
  },
  {
    id: 'lagoon-night',
    title: 'Plankton in the shallows at night',
    note: 'Zone F. Faint points of light everywhere, thickest here. They brighten in the wake of the shrimp for a second and a half. No caustics at night.',
    view: {
      area: lagoon,
      ...around(6420, 4340),
      shrimp: [still('content', 6440, 4420, Math.PI + 0.3, { look: L_PLAYER })],
      time: 'night',
      wake: [
        { x: 6560, y: 4450 },
        { x: 6690, y: 4470 },
        { x: 6820, y: 4460 },
        { x: 6950, y: 4430 },
      ],
      murkAt: { x: 6440, y: 4420 },
    },
  },
  {
    id: 'lagoon-pass',
    title: 'The hunting fish in the pass',
    note: 'Zone G. The fish comes up the pass at dawn: a long dark spindle in mid-water, its shadow on the sand. The player is afraid and has dug in, which makes it give up after 2 s.',
    view: {
      area: lagoon,
      ...around(1260, 2850),
      shrimp: [still('afraid', 1700, 2760, 2.8, { look: L_PLAYER })],
      burrowed: [0],
      murkAt: { x: 1700, y: 2760 },
    },
  },
  {
    id: 'lagoon-rocks',
    title: 'The north-west rocks',
    note: 'Zone H. Boulders with crevices between them, a quiet corner for the molt. The player rests in a crevice. A sea star lies on the sand, moving too slowly to see.',
    view: {
      area: lagoon,
      ...around(1060, 800),
      shrimp: [still('calm', 1020, 590, 1.9, { look: L_PLAYER, curve: 0.04 })],
      murkAt: { x: 1020, y: 590 },
    },
  },
  {
    id: 'lagoon-map',
    title: 'The whole lagoon',
    note: 'All of chapter 2, with its zones. About 64 by 40 body lengths. The creek comes in on the right, the pass leaves on the left.',
    view: {
      area: lagoon,
      x: 0,
      y: 0,
      w: 8000,
      h: 5000,
      scale: 0.15,
      shrimp: [...shoal('calm'), still('calm', 7600, 2650, Math.PI, { look: L_PLAYER })],
      showZones: true,
    },
  },
];

export function sceneCanvas(scene: NamedScene): HTMLCanvasElement {
  return renderScene(scene.view);
}

/**
 * One screen of an area centred as near (cx, cy) as the game's camera could
 * be: the view never leaves the area. For looking anywhere, with
 * atelier.html?view=x,y, and &area=lagoon for the lagoon.
 */
export function lookAt(cx: number, cy: number, area: AreaDef = mangrove): HTMLCanvasElement {
  const x = Math.min(Math.max(cx - VIEW_W / 2, 0), area.size.w - VIEW_W);
  const y = Math.min(Math.max(cy - VIEW_H / 2, 0), area.size.h - VIEW_H);
  return renderScene({
    area,
    x,
    y,
    w: VIEW_W,
    h: VIEW_H,
    scale: 1.4,
    murkAt: { x: cx, y: cy },
  });
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
  const zoom = 2.2;
  const [canvas, ctx] = mudCard(640, 420, zoom);
  const w = 640 / zoom;
  const h = 420 / zoom;
  const x = w * 0.4;
  const y = h * 0.62;
  const target = { x: w * 0.84, y: h * 0.24 };
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
    const zoom = 1.7;
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

interface DriftView {
  id: string;
  title: string;
  note: string;
  /** Water colour at the left and at the right of the view. */
  water: [string, string];
  larva: 'larva.early' | 'larva.mid' | 'larva.late';
  /** Length of the larva in design pixels. */
  length: number;
  motes: number;
  others: number;
  shafts: number;
  shadows: number;
}

const DRIFT_VIEWS: DriftView[] = [
  {
    id: 'dark',
    title: 'The dark',
    note: 'The first ten seconds. Almost black water, a few specks, and the larva in its first shape. It cannot eat yet.',
    water: ['#04121A', '#0B2A3A'],
    larva: 'larva.early',
    length: 44,
    motes: 0,
    others: 0,
    shafts: 0,
    shadows: 0,
  },
  {
    id: 'green',
    title: 'The green',
    note: 'Clouds of floating algae, and other larvae. The second shape: a see-through comma.',
    water: ['#0B2A3A', '#1E5A5C'],
    larva: 'larva.mid',
    length: 56,
    motes: 5,
    others: 4,
    shafts: 0,
    shadows: 0,
  },
  {
    id: 'shafts',
    title: 'The shafts',
    note: 'Light comes down from above in slanted bars.',
    water: ['#1E5A5C', '#3C8478'],
    larva: 'larva.mid',
    length: 56,
    motes: 4,
    others: 2,
    shafts: 4,
    shadows: 0,
  },
  {
    id: 'haze',
    title: 'The haze',
    note: 'The water turns the colour of tea, and the shadows of roots cross overhead. The third shape: a shrimp in small.',
    water: ['#4C7466', '#7A6440'],
    larva: 'larva.late',
    length: 70,
    motes: 2,
    others: 1,
    shafts: 0,
    shadows: 3,
  },
];

/** Views of the Drift, composed by hand. The game reads it from `src/data/drift.ts`. */
export function driftCanvases(): {
  canvas: HTMLCanvasElement;
  id: string;
  title: string;
  note: string;
}[] {
  return DRIFT_VIEWS.map((view, order) => {
    const random = seededRandom(900 + order);
    const canvas = document.createElement('canvas');
    canvas.width = 1920;
    canvas.height = 1080;
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
    const water = ctx.createLinearGradient(0, 0, canvas.width, 0);
    water.addColorStop(0, view.water[0]);
    water.addColorStop(1, view.water[1]);
    ctx.fillStyle = water;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.scale(1.4, 1.4);
    const w = VIEW_W;
    const h = VIEW_H;
    const centred = (name: string, x: number, y: number, width: number, turn = 0, alpha = 1) => {
      const image = paintImage(name);
      const height = (width * image.height) / image.width;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(x, y);
      ctx.rotate(turn);
      ctx.drawImage(image, -width / 2, -height / 2, width, height);
      ctx.restore();
    };

    // Shadows of roots far above.
    for (let index = 0; index < view.shadows; index++) {
      centred(
        'drift.rootShadow',
        w * (0.2 + 0.3 * index),
        h * (0.3 + random() * 0.4),
        620,
        1.2 + random() * 0.5,
      );
    }
    // Specks, in three sizes, show the water.
    for (let index = 0; index < 150; index++) {
      const size = [3, 5, 8][index % 3] as number;
      centred('fx.speck', random() * w, random() * h, size, 0, 0.25 + random() * 0.4);
    }
    // Clouds of floating algae.
    for (let cloud = 0; cloud < view.motes; cloud++) {
      const cx = w * (0.15 + random() * 0.75);
      const cy = h * (0.15 + random() * 0.7);
      const count = 6 + Math.floor(random() * 7);
      for (let index = 0; index < count; index++) {
        const name = `food.microalgae.${'abc'[Math.floor(random() * 3)]}`;
        const angle = random() * Math.PI * 2;
        const distance = Math.sqrt(random()) * 110;
        centred(
          name,
          cx + Math.cos(angle) * distance,
          cy + Math.sin(angle) * distance * 0.7,
          26 + random() * 30,
          random() * Math.PI * 2,
        );
      }
    }
    // Other larvae, at the same stage.
    for (let index = 0; index < view.others; index++) {
      centred(
        view.larva,
        w * (0.1 + random() * 0.8),
        h * (0.12 + random() * 0.76),
        view.length * 2 * (0.85 + random() * 0.2),
        (random() - 0.5) * 1.2,
        0.85,
      );
    }
    // The player's larva. The water carries it to the right.
    centred(view.larva, w * 0.4, h * 0.52, view.length * 2, -0.12);
    // Light from above.
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    for (let index = 0; index < view.shafts; index++) {
      const image = paintImage('drift.shaft');
      ctx.drawImage(
        image,
        w * (0.08 + 0.24 * index) + random() * 60,
        -40,
        240 + random() * 80,
        h + 80,
      );
    }
    ctx.restore();

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(paintImage('fx.vignette'), 0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.globalAlpha = 0.07;
    ctx.fillStyle = ctx.createPattern(paintImage('fx.grain'), 'repeat') as CanvasPattern;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
    return { canvas, id: view.id, title: view.title, note: view.note };
  });
}
