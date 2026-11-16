import { imageFit } from '../art/fit';
import { PAINTERS, PAINTER_GROUPS, type PainterGroup } from '../art/painters';
import { paintImage } from './images';
import {
  LAGOON_SCENES,
  MANGROVE_SCENES,
  MOOD_LIST,
  MOOD_NOTES,
  companionCanvases,
  driftCanvases,
  lookAt,
  moodCanvas,
  sceneCanvas,
  type NamedScene,
} from './scenes';
import { lagoon } from '../data/areas/lagoon';
import { mangrove } from '../data/areas/mangrove';

/**
 * The atelier: a page that shows the art without starting the game.
 * It imports painters directly and never loads Phaser. See docs/14-art-production.md.
 *
 * Address: atelier.html. Add ?show=<id> to see one section alone, or
 * ?view=x,y to see one screen of the mangrove at that place.
 */
const main = document.getElementById('main') as HTMLElement;
const nav = document.getElementById('nav') as HTMLElement;
const only = new URLSearchParams(location.search).get('show');

/** The largest side of a picture on a sheet, in CSS pixels. */
const CARD = 300;

function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  text?: string,
  className?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}

function figure(canvas: HTMLCanvasElement, name: string, detail: string): HTMLElement {
  const wrap = element('figure');
  wrap.dataset.name = name;
  wrap.append(canvas);
  const caption = element('figcaption');
  caption.append(element('b', name), ` · ${detail}`);
  wrap.append(caption);
  return wrap;
}

/** One picture on its ground, at up to CARD pixels. A cover is shown again at 40%. */
function card(name: string, ground: string, alpha = 1): HTMLElement {
  const painter = PAINTERS[name];
  if (!painter) throw new Error(`No painter for "${name}"`);
  const fit = imageFit(name);
  const image = paintImage(name);
  const repeats = fit.tile === 'both' ? 2 : 1;
  const across = fit.tile ? 2 : 1;
  const fullWidth = painter.width * across;
  const fullHeight = painter.height * repeats;
  const scale = Math.min(1, (fit.tile ? CARD * 1.6 : CARD) / Math.max(fullWidth, fullHeight));

  const canvas = element('canvas');
  const ratio = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.round(fullWidth * scale * ratio);
  canvas.height = Math.round(fullHeight * scale * ratio);
  canvas.style.width = `${Math.round(fullWidth * scale)}px`;
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  ctx.fillStyle = ground;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.scale(scale * ratio, scale * ratio);
  ctx.globalAlpha = alpha;
  if (fit.light) ctx.globalCompositeOperation = 'screen';
  for (let x = 0; x < across; x++) {
    for (let y = 0; y < repeats; y++) {
      ctx.drawImage(image, x * painter.width, y * painter.height);
    }
  }

  const notes = [`${painter.width} × ${painter.height}`];
  if (fit.tile)
    notes.push(fit.tile === 'both' ? 'tile, shown 2 × 2' : 'repeats sideways, shown twice');
  if (alpha < 1) notes.push('at 40%, as when the shrimp is beneath');
  return figure(canvas, name, notes.join(' · '));
}

function sheet(group: PainterGroup): HTMLElement {
  const wrap = element('div', undefined, 'sheet');
  for (const name of group.names) {
    wrap.append(card(name, group.ground));
    if (imageFit(name).cover) wrap.append(card(name, group.ground, 0.4));
  }
  return wrap;
}

interface Section {
  id: string;
  title: string;
  note?: string;
  build: () => HTMLElement;
}

function shown(canvas: HTMLCanvasElement, cssWidth: number): HTMLCanvasElement {
  canvas.style.width = `${cssWidth}px`;
  return canvas;
}

function scenes(list: NamedScene[]): HTMLElement {
  const wrap = element('div');
  for (const scene of list) {
    const block = element('div', undefined, 'scene');
    block.dataset.scene = scene.id;
    block.append(element('h3', scene.title), element('p', scene.note, 'note'));
    block.append(shown(sceneCanvas(scene), scene.id.endsWith('map') ? 1200 : 1280));
    wrap.append(block);
  }
  return wrap;
}

function drift(): HTMLElement {
  const wrap = element('div');
  for (const view of driftCanvases()) {
    const block = element('div', undefined, 'scene');
    block.dataset.scene = `drift-${view.id}`;
    block.append(element('h3', view.title), element('p', view.note, 'note'));
    block.append(shown(view.canvas, 1280));
    wrap.append(block);
  }
  return wrap;
}

function moods(): HTMLElement {
  const wrap = element('div', undefined, 'sheet');
  for (const mood of MOOD_LIST) {
    wrap.append(figure(shown(moodCanvas(mood), 400), mood, MOOD_NOTES[mood]));
  }
  return wrap;
}

function companions(): HTMLElement {
  const wrap = element('div', undefined, 'sheet');
  for (const { canvas, name, note } of companionCanvases()) {
    wrap.append(figure(shown(canvas, 300), name, note));
  }
  return wrap;
}

const sections: Section[] = [
  {
    id: 'scenes',
    title: 'Mangrove scenes',
    note: 'Each picture is one screen of the game, drawn from the mangrove data file. Nothing moves here.',
    build: () => scenes(MANGROVE_SCENES),
  },
  {
    id: 'lagoonscenes',
    title: 'Lagoon scenes',
    note: 'Chapter 2, drawn from the lagoon data file. Day, dusk and night. Nothing moves here.',
    build: () => scenes(LAGOON_SCENES),
  },
  {
    id: 'driftscenes',
    title: 'Drift scenes',
    note: 'Chapter 0. The larva is carried from the open sea to the mangrove, and changes shape twice on the way.',
    build: drift,
  },
  {
    id: 'moods',
    title: 'The six moods',
    note: 'No bars and no faces: the body says it. These are the postures in docs/14-art-production.md, held still.',
    build: moods,
  },
  {
    id: 'companions',
    title: 'Telling shrimp apart',
    note: 'Same species, one small difference each.',
    build: companions,
  },
  ...PAINTER_GROUPS.filter((group) => group.names.length > 0).map((group) => ({
    id: group.id,
    title: `Sheet: ${group.title}`,
    build: () => sheet(group),
  })),
];

for (const section of sections) {
  const link = element('a', section.title);
  link.href = `?show=${section.id}`;
  if (only === section.id) link.className = 'here';
  nav.append(link);
}
const all = element('a', 'Everything');
all.href = location.pathname;
if (!only) all.className = 'here';
nav.prepend(all);

// ?view=x,y shows one screen of the mangrove at that place, and nothing else.
// Add &area=lagoon for the lagoon.
const place = new URLSearchParams(location.search).get('view');
if (place) {
  const [x = 0, y = 0] = place.split(',').map(Number);
  const inLagoon = new URLSearchParams(location.search).get('area') === 'lagoon';
  const block = element('div', undefined, 'scene');
  block.dataset.scene = 'view';
  block.append(
    element('h3', `The ${inLagoon ? 'lagoon' : 'mangrove'} at ${x}, ${y}`),
    shown(lookAt(x, y, inLagoon ? lagoon : mangrove), 1280),
  );
  main.append(block);
}

for (const section of sections) {
  if (place) break;
  if (only && only !== section.id) continue;
  const heading = element('h2', section.title);
  heading.id = section.id;
  main.append(heading);
  if (section.note) main.append(element('p', section.note, 'note'));
  main.append(section.build());
}

// For browser checks: the page is ready when this is set.
document.body.dataset.ready = 'true';
