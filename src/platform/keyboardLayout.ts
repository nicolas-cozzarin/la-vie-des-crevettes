interface KeyboardLayoutApi {
  getLayoutMap?: () => Promise<{ entries(): Iterable<[string, string]> }>;
}

/**
 * The letter printed on each key of the player's keyboard, where the browser
 * can tell us. Chrome and Edge can. Firefox and Safari cannot, and get null.
 */
export async function readLayoutMap(): Promise<ReadonlyMap<string, string> | null> {
  const keyboard = (navigator as Navigator & { keyboard?: KeyboardLayoutApi }).keyboard;
  if (!keyboard?.getLayoutMap) return null;
  try {
    const layout = await keyboard.getLayoutMap();
    return new Map(layout.entries());
  } catch {
    return null;
  }
}
