import { saveOf, writeSave, type SavePlace } from '../core/save/save';
import type { KeyValueStore } from '../core/save/store';
import type { Life } from '../core/progress/life';

/** Keeps the life in the one save slot. Returns false if the browser would not keep it. */
export function keepLife(store: KeyValueStore, life: Life, place: SavePlace): boolean {
  return writeSave(store, saveOf(life, place));
}
