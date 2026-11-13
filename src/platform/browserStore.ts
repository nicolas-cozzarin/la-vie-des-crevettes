import { MemoryStore, type KeyValueStore } from '../core/save/store';

export interface OpenedStore {
  store: KeyValueStore;
  /** False when the browser will not keep anything after the page closes. */
  persistent: boolean;
}

/**
 * The browser's storage, or a stand-in that lasts for the visit when storage
 * is switched off or full. The game runs either way.
 */
export function openBrowserStore(): OpenedStore {
  try {
    const storage = window.localStorage;
    const probe = 'lvdc.probe';
    storage.setItem(probe, '1');
    storage.removeItem(probe);

    const store: KeyValueStore = {
      getItem(key) {
        try {
          return storage.getItem(key);
        } catch {
          return null;
        }
      },
      setItem(key, value) {
        try {
          storage.setItem(key, value);
          return true;
        } catch {
          return false;
        }
      },
      removeItem(key) {
        try {
          storage.removeItem(key);
        } catch {
          // Nothing to do: the value was not there to begin with.
        }
      },
    };
    return { store, persistent: true };
  } catch {
    return { store: new MemoryStore(), persistent: false };
  }
}
