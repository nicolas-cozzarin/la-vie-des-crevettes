/**
 * Whether the device seems to have no keyboard: a touch screen and no mouse.
 * The game is played with a keyboard; such a device gets a notice instead
 * of the menu (doc 03, "On a phone or tablet").
 */
export function touchOnly(): boolean {
  return window.matchMedia?.('(hover: none) and (pointer: coarse)').matches ?? false;
}
