# 03. Controls and settings

Status: draft 0.2, 2026-11-13. Keyboard only for the first version (D20). Default keys confirmed by the author (D21).

## Default bindings

Each action has two keyboard slots.

| Action id | Slot 1 | Slot 2 |
|-----------|--------|--------|
| `moveUp` | W | Arrow up |
| `moveDown` | S | Arrow down |
| `moveLeft` | A | Arrow left |
| `moveRight` | D | Arrow right |
| `tailFlip` | Space | |
| `interact` | E | Enter |
| `sense` | Q | |
| `hide` | Left Shift | C |
| `greet` | F | |
| `journal` | J | Tab |
| `pause` | Escape | P |

## Physical keys, not letters

Bindings are stored by physical key position (`KeyboardEvent.code`), not by the letter printed on the key. On a French AZERTY keyboard the default movement keys are therefore Z Q S D without any setup, and the sense key sits where A is printed.

The settings screen and all prompts show the letter printed on the player's own keyboard. Use `navigator.keyboard.getLayoutMap()` where the browser has it. Elsewhere, show the letter recorded when the key was last pressed, and fall back to the US label.

## Rebinding

Location: Pause > Settings > Controls. Also reachable from the title screen.

The screen lists every action with its two slots.

1. Select a slot with the arrow keys and press Enter, or click it.
2. The slot shows "Press a key".
3. The next key pressed is stored. Escape cancels. Backspace or Delete clears the slot.
4. If the key is already used by another action, the two swap, and a line says so: "E was Eat. Eat is now unbound in slot 1."
5. Changes save at once.

Rules:
- Every action must keep at least one key. Clearing the last one is refused with a short message.
- Escape always opens the pause menu, whatever else is bound, so nobody can lock themselves out.
- Keys the browser owns cannot be bound: F1 to F12, the Windows or Command key, and any combination with Ctrl, Alt or Command.
- "Reset to defaults" restores the table above after a confirmation.
- Presets: "WASD", "Arrows", "One hand, left side", "One hand, right side".

## Hold or toggle

Sense and Hide are held by default. Each can be switched to toggle (press once to start, again to stop) in settings.

## Prompts

Prompts in the game always show the player's current binding. They never hard-code a key. Example: "Hold [E] to graze", where E is replaced by whatever is bound.

A prompt for an action appears the first three times the action is possible, then stops.

## Keyboard behaviour in the page

- The game takes keyboard focus after the player clicks "Play". The same click unlocks audio, which browsers block until a first interaction.
- While the game has focus, bound keys do not scroll or tab the page.
- If the tab loses focus, the game pauses and all held keys are released.
- Menus work with arrows, Enter and Escape. The mouse also works in menus but is never required.

## On a phone or tablet

The first version does not have touch controls. A device with no keyboard sees the title art and one line: "This game is played with a keyboard. Open it on a computer." Touch and gamepad support are on the roadmap, and the input code is written so they can be added without touching the game logic.

## Settings

| Group | Setting | Values | Default |
|-------|---------|--------|---------|
| Language | Language | Français, English | From the browser |
| Controls | Bindings | As above | As above |
| Controls | Sense | Hold, Toggle | Hold |
| Controls | Hide | Hold, Toggle | Hold |
| Sound | Master, Music, Ambience, Effects | 0 to 100 | 80, 70, 80, 80 |
| Sound | Captions for sounds | On, Off | Off |
| Comfort | Gentle mode (no chases) | On, Off | Off |
| Comfort | Reduced motion | On, Off | From the browser |
| Comfort | Text size | 100%, 125%, 150% | 100% |
| Comfort | Name feelings on screen | On, Off | Off |
| Data | Start over | Button | |

Notes:
- **Captions for sounds** show a short line for sounds that carry meaning: "[a shadow passes]", "[an engine, far off]".
- **Reduced motion** removes camera sway, the narrowing view when afraid and the blur when cornered. Darkened edges stay.
- **Name feelings on screen** shows the mood as one word in a corner whenever it changes. For players who want the feelings spelled out.

## Input code contract

Game code asks about actions and never about keys.

```ts
export type Action =
  | 'moveUp' | 'moveDown' | 'moveLeft' | 'moveRight'
  | 'tailFlip' | 'interact' | 'sense' | 'hide' | 'greet'
  | 'journal' | 'pause';

export interface ActionInput {
  isDown(action: Action): boolean;
  justPressed(action: Action): boolean;
  justReleased(action: Action): boolean;
  /** Movement as a vector, each axis from -1 to 1, normalised on diagonals. */
  axis(): { x: number; y: number };
}

export type Bindings = Record<Action, [string | null, string | null]>; // KeyboardEvent.code values
```

Keyboard is one source feeding `ActionInput`. Gamepad and touch can later be added as further sources behind the same interface.
