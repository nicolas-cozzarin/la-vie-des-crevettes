import {
  FOOD_KINDS,
  AREA_IDS,
  LIFE_STAGES,
  type AreaId,
  type FoodKind,
  type LifeStage,
} from '../world/kinds';
import { MOODS, type Mood } from '../feelings/mood';
import { newLife, type Life } from '../progress/life';
import type { KeyValueStore } from './store';

export const SAVE_KEY = 'lvdc.save.v1';

/**
 * The one save slot (doc 06, `SaveV1`; doc 12, "What the save must hold").
 * Written at each chapter start and at each rest under cover (doc 02).
 * Fields added later get defaults in the loader, so `v` stays 1 until a
 * field changes meaning.
 */
export interface SaveV1 {
  v: 1;
  generation: number;
  area: AreaId;
  stage: LifeStage;
  /** Where the shrimp rested, in the area as written, or null for the area's start. */
  at: { x: number; y: number } | null;
  stepsDone: string[];
  bonds: Record<string, number>;
  discoveries: string[];
  challenges: Record<string, number>;
  achievements: string[];
  stats: Record<string, number>;
  playSeconds: number;
  pinned: string | null;
  moodsNamed: Mood[];
  promptsShown: Record<string, number>;
  cardsUnlocked: string[];
  /** Lines already narrated, so none is said twice. */
  narrated: string[];
  placesSeen: AreaId[];
  molts: number;
  hunger: number | null;
  favourite: FoodKind | null;
}

/** Where a life is when it is saved. */
export interface SavePlace {
  area: AreaId;
  stage: LifeStage;
  at: { x: number; y: number } | null;
}

export function saveOf(life: Life, place: SavePlace): SaveV1 {
  const moodsNamed = MOODS.filter((mood) => life.narrated.has(`narr.mood.${mood}`));
  return {
    v: 1,
    generation: life.generation,
    area: place.area,
    stage: place.stage,
    at: place.at ? { x: Math.round(place.at.x), y: Math.round(place.at.y) } : null,
    stepsDone: [...life.stepsDone],
    bonds: { ...life.bonds },
    discoveries: [...life.discoveries],
    challenges: { ...life.challenges },
    achievements: [...life.achievements],
    stats: { ...life.stats },
    playSeconds: Math.round(life.playSeconds),
    pinned: life.pinned,
    moodsNamed,
    promptsShown: { ...life.promptsShown },
    cardsUnlocked: [...life.cards],
    narrated: [...life.narrated],
    placesSeen: [...life.placesSeen],
    molts: life.molts,
    hunger: life.hunger,
    favourite: life.favourite,
  };
}

export function lifeOf(save: SaveV1): Life {
  const life = newLife();
  life.generation = save.generation;
  life.stepsDone = new Set(save.stepsDone);
  life.bonds = { ...save.bonds };
  life.discoveries = new Set(save.discoveries);
  life.challenges = { ...save.challenges };
  life.achievements = new Set(save.achievements);
  life.stats = { ...save.stats };
  life.playSeconds = save.playSeconds;
  life.pinned = save.pinned;
  life.promptsShown = { ...save.promptsShown };
  life.cards = new Set(save.cardsUnlocked);
  life.narrated = new Set([
    ...save.narrated,
    ...save.moodsNamed.map((mood) => `narr.mood.${mood}`),
  ]);
  life.placesSeen = new Set(save.placesSeen);
  life.molts = save.molts;
  life.hunger = save.hunger;
  life.favourite = save.favourite;
  return life;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((one): one is string => typeof one === 'string') : [];
}

function numbers(value: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  if (!isRecord(value)) return out;
  for (const [key, one] of Object.entries(value)) {
    if (typeof one === 'number' && Number.isFinite(one)) out[key] = one;
  }
  return out;
}

function count(value: unknown, fallback: number, min = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(min, value) : fallback;
}

function oneOf<T extends string>(list: readonly T[], value: unknown): T | null {
  return list.find((one) => one === value) ?? null;
}

/**
 * Reads the save, or null when there is none or it cannot be read. Every
 * field that is missing or wrong takes its default, so an older save loads.
 */
export function loadSave(store: KeyValueStore): SaveV1 | null {
  let raw: unknown;
  try {
    raw = JSON.parse(store.getItem(SAVE_KEY) ?? 'null');
  } catch {
    return null;
  }
  if (!isRecord(raw) || raw.v !== 1) return null;
  const area = oneOf(AREA_IDS, raw.area);
  if (!area) return null;
  const at =
    isRecord(raw.at) && typeof raw.at.x === 'number' && typeof raw.at.y === 'number'
      ? { x: raw.at.x, y: raw.at.y }
      : null;
  const hunger = typeof raw.hunger === 'number' ? Math.min(1, Math.max(0, raw.hunger)) : null;
  return {
    v: 1,
    generation: Math.floor(count(raw.generation, 1, 1)),
    area,
    stage: oneOf(LIFE_STAGES, raw.stage) ?? 'larva',
    at,
    stepsDone: strings(raw.stepsDone),
    bonds: numbers(raw.bonds),
    discoveries: strings(raw.discoveries),
    challenges: numbers(raw.challenges),
    achievements: strings(raw.achievements),
    stats: numbers(raw.stats),
    playSeconds: count(raw.playSeconds, 0),
    pinned: typeof raw.pinned === 'string' ? raw.pinned : null,
    moodsNamed: strings(raw.moodsNamed).filter((one): one is Mood => oneOf(MOODS, one) !== null),
    promptsShown: numbers(raw.promptsShown),
    cardsUnlocked: strings(raw.cardsUnlocked),
    narrated: strings(raw.narrated),
    placesSeen: strings(raw.placesSeen).filter(
      (one): one is AreaId => oneOf(AREA_IDS, one) !== null,
    ),
    molts: Math.floor(count(raw.molts, 0)),
    hunger,
    favourite: oneOf(FOOD_KINDS, raw.favourite),
  };
}

/** Writes the save. Returns false if the browser would not keep it. */
export function writeSave(store: KeyValueStore, save: SaveV1): boolean {
  return store.setItem(SAVE_KEY, JSON.stringify(save));
}

export function clearSave(store: KeyValueStore): void {
  store.removeItem(SAVE_KEY);
}
