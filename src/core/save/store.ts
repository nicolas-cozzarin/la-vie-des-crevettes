/** Where saves and settings are kept. The browser's storage is one of these. */
export interface KeyValueStore {
  getItem(key: string): string | null;
  /** Returns false if the value could not be stored. */
  setItem(key: string, value: string): boolean;
  removeItem(key: string): void;
}

/** Keeps values for the length of a visit only. Also used in tests. */
export class MemoryStore implements KeyValueStore {
  private readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): boolean {
    this.values.set(key, value);
    return true;
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }
}
