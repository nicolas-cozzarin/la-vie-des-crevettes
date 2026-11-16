/**
 * What the page's address asks for. Only this file reads it.
 *
 * `?explore=<area>` opens one place with no story, to look round it and say
 * what should change. It is a tool for the author, not part of the game, so it
 * has no menu entry and no text of its own.
 */
export function exploreRequest(): string | null {
  if (typeof window === 'undefined') return null;
  return new URLSearchParams(window.location.search).get('explore');
}

/** `&at=x,y`: where to start in explore mode, in design pixels. */
export function exploreStart(): { x: number; y: number } | null {
  if (typeof window === 'undefined') return null;
  const at = new URLSearchParams(window.location.search).get('at');
  const match = at ? /^(\d+),(\d+)$/.exec(at) : null;
  return match ? { x: Number(match[1]), y: Number(match[2]) } : null;
}

/** `?debug`: debug keys for the author, such as cycling the mood. Never in the game's menus. */
export function debugRequested(): boolean {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).has('debug');
}
