# 15. Implementation guide

Status: draft 0.2, 2026-11-15. For whoever builds the remaining steps of [08-roadmap.md](08-roadmap.md). It says what exists, which patterns to keep, and for each step which files to add, what they expose, which tests to write and what usually goes wrong.

The design is settled in docs 01 to 14. This document adds no rules of play. If something here disagrees with those documents, they are right.

## Before a step

1. Read `CLAUDE.md`, then the step in doc 08, then the step's section here, then the documents it names.
2. Work on a branch. Merging to `main` publishes the game.
3. Build the rules in `src/core/` first, with their unit tests. Then the drawing.
4. Run `npm run lint`, `npm test`, `npm run build`, `npm run test:e2e`.
5. Play it in a browser. A headless browser has no graphics card and runs at about 7 frames a second: it shows how things look, not how they feel.
6. Any choice the documents do not cover goes into [09-decisions.md](09-decisions.md) as a new T row with its reason, and into the pull request text.
7. Update the progress line in doc 08 and the status line in the README.

## What exists

After steps 0 to 2 and the art and design work of 2026-11-14 and 15.

| Path | What it is |
|------|------------|
| `src/main.ts` | Game config, scene list, the `window.__lvdc` hook for browser tests |
| `src/app.ts` | Settings, storage and keyboard, shared by all scenes as `app` |
| `src/config.ts` | Design size, colours, fonts, `DEPTH` layers |
| `src/core/events.ts` | `EventBus`, typed. No bus is created yet: step 4 creates the first |
| `src/core/input/` | Actions, bindings, presets, key labels, `ActionState` |
| `src/core/movement/ShrimpMotion.ts` | Walk, swim, dart, glide, tiring, height. Takes `{ x, y, dart }` and a `Mover` |
| `src/core/movement/collision.ts` | `moveCircle` against circles, rectangles and bounds |
| `src/core/movement/angles.ts` | `approach`, `angleDiff`, `rotateToward`, `wrapAngle` |
| `src/core/save/` | Settings with versions. `KeyValueStore` |
| `src/core/i18n/`, `src/i18n.ts`, `src/locales/` | `t('key', params)` |
| `src/core/random.ts` | `seededRandom` |
| `src/data/tuning.ts` | `MOTION`, `FRAME`, `CAMERA`, `SHADOW` |
| `src/core/world/kinds.ts` | `FOOD_KINDS`, the closed list of foods, and `AREA_IDS` |
| `src/core/feelings/mood.ts` | `MOODS` and the `Mood` type. Step 4 adds `pickMood` to this file |
| `src/data/areas/types.ts` | `AreaDef` in full: ground patches, edge strips, obstacles, blocks, cover, food, landmarks, creatures, other shrimp, currents, zones, triggers, exits, light |
| `src/data/areas/mangrove.ts` | The whole of chapter 1 as data. Nothing loads it yet |
| `src/data/areas/sandFlat.ts` | The test area the game runs in today |
| `src/art/painters/` | Every painter, by family. `index.ts` lists them all as `PAINTERS` |
| `src/art/TextureFactory.ts` | `ensureTexture(scene, name)` |
| `src/art/fit.ts` | `imageFit(name)`: which part of a picture is solid, which pictures are tiles, cover or light |
| `src/art/expressions.ts` | `RigExpression`, `RigLook`, `MOOD_EXPRESSIONS`. `ShrimpRig` does not take them yet |
| `src/atelier/`, `atelier.html` | The page that shows the art. `scene.ts` draws an area from its data and is the model for the area loader. `stillShrimp.ts` draws a shrimp at rest from an expression |
| `src/entities/ShrimpRig.ts` | The shrimp drawn from parts |
| `src/scenes/` | Boot, Title, Play, Hud, Pause, Controls |
| `src/platform/` | The only code that touches the browser's keyboard and storage |
| `src/ui/` | Buttons, menu list, text styles |
| `tests/unit/`, `tests/content/`, `tests/e2e/` | Vitest and Playwright. `tests/content/areas.test.ts` checks every area file: images have painters, things are inside the area and not inside each other, strip ends are closed |

## Patterns to keep

**One clock.** `PlayScene.update` cuts a long frame into steps of at most 1/30 s and steps `ShrimpMotion` in a loop. Every rule system added later steps inside that same loop with the same `dt`, in a fixed order: input, threat director, feelings, other shrimp, motion, progress. Drawing happens once per frame, after the loop.

**Rules are plain objects.** A rule class takes its tuning in the constructor, has `step(dt, context)`, holds no reference to Phaser, the DOM or `src/data/`, and can be built in a test with three lines. `ShrimpMotion` is the model.

**The scene gathers, the rules decide.** Things the rules need from the world (is there cover within 1.5 BL, how far is the nearest unknown thing, who is within 4 BL) are worked out by the scene or a system and passed in as a plain `context` object. The rules never query the world themselves.

**Events out, not calls across.** A rule reports what happened by returning it or by emitting on the bus. `Progress`, `Narrator`, `AudioDirector` and the journal listen. They never call each other.

**Body lengths inside, pixels outside.** Tuning is in BL. Area data is in design pixels. Convert once, at the edge, with the shrimp's current `bodyLengthPx`.

**No `Math.random` in `core`.** Pass in a `seededRandom`. Tests must repeat exactly.

**Browser tests wait on state.** Extend `window.__lvdc` with read-only views (`feelings()`, `threat()`, `progress()`), and wait on those with `page.waitForFunction`. Never wait a fixed time.

**Text, keys, images.** `t('key')`, `app.actions`, `ensureTexture(scene, name)`. Nothing else.

## Phaser 4, as found so far

Phaser 4 ships its own guides in `node_modules/phaser/skills/`, one folder per subject, including `v3-to-v4-migration`. Read the one for a feature before using it. The type definitions are in `node_modules/phaser/types/phaser.d.ts`.

| Matter | What is true in 4.2.1 |
|--------|----------------------|
| Frame time | The game sets `fps: { smoothStep: false }`. With smoothing on, a slow machine plays in slow motion (T22) |
| Keyboard | `input: { keyboard: false }`. The game reads keys itself by position, in `src/platform/KeyboardSource.ts` |
| Canvas images | `scene.textures.createCanvas(name, w, h)`, draw on `texture.context`, then `texture.refresh()` |
| Screen effects | The v3 `preFX` and `postFX` are gone. Effects are **filters**: `camera.filters.internal.addBlur()`, `addVignette()`, `addColorMatrix()` and others, on a camera or on any object after `enableFilters()` |
| Masks | `BitmapMask` is gone. Use the `Mask` filter: `object.filters.internal.addMask(maskObject)` |
| Blend modes | WebGL has four: NORMAL, ADD, MULTIPLY, SCREEN. Others need the `Blend` filter |
| Tint | `setTintFill` is gone. Use `setTint(colour).setTintMode(Phaser.TintModes.FILL)` |
| Colour matrix | Methods moved onto a property: `filter.colorMatrix.saturate(...)` |
| Geometry | `Point` is replaced by `Vector2` |
| Still there | `TileSprite`, `Container`, `Layer`, `Graphics`, `Rope`, `RenderTexture`, `ParticleEmitter`, tweens, scenes |

Not yet tried in this project, so check before relying on them: filters on the main camera together with a second scene on top, particles in number, `Rope` for the scent ribbons, sound.

## The game's events

Create `src/core/gameEvents.ts` in step 4 with the list from doc 06, plus what docs 10 and 12 need:

```ts
export type GameEvents = {
  'mood:changed': { who: ShrimpId; from: Mood; to: Mood };
  'condition:changed': { who: ShrimpId; condition: Condition; on: boolean };
  'stimulus': { who: ShrimpId; kind: StimulusKind };
  'food:eaten': { who: ShrimpId; kind: FoodKind; first: boolean; full: boolean; patchId: string };
  'sense:used': { seconds: number };
  'ribbon:followed': { kind: FoodKind; patchId: string };
  'tailflip': { who: ShrimpId };
  'cover:entered': { who: ShrimpId; coverId: string };
  'cover:left': { who: ShrimpId; coverId: string; wary: boolean };
  'groomed': { who: ShrimpId };
  'greeting': { a: ShrimpId; b: ShrimpId };
  'bond:changed': { with: ShrimpId; value: number; stage: BondStage };
  'threat:stage': { kind: ThreatKind; stage: ThreatStage };
  'threat:strike': { kind: ThreatKind; hit: boolean };
  'threat:escaped': { kind: ThreatKind; clean: boolean; still: boolean };
  'cornered': { kind: ThreatKind };
  'molt:phase': { who: ShrimpId; phase: MoltPhase };
  'molt:done': { who: ShrimpId; molts: number };
  'discovery': { id: string };
  'step:done': { id: string };
  'challenge:progress': { id: string; value: number; target: number };
  'challenge:done': { id: string };
  'achievement': { id: string };
  'card:unlocked': { id: string };
  'area:entered': { area: AreaId };
  'zone:entered': { area: AreaId; zone: string };
  'day:phase': { phase: DayPhase };
  'spawned': { generation: number };
};
```

## Step 3. The mangrove as a place

Documents: 11 (the map and the things), 14 (images), 04.

What is already there: every mangrove painter, `src/data/areas/mangrove.ts` with the full layout, the area types in `src/data/areas/types.ts`, `src/art/fit.ts`, and a picture of the result. Open `atelier.html?show=scenes` before writing a line: the game must look like those ten views. `atelier.html?view=x,y` shows any other place.

`src/atelier/scene.ts` draws an area from its data on a plain canvas. `AreaLoader` does the same with Phaser objects. The sizing rules are the table "From data to picture" in doc 14. Read `scene.ts` beside it.

Add:

| File | Job |
|------|-----|
| `src/systems/AreaLoader.ts` | Builds a scene from an `AreaDef`: ground tile and patches, scatter, obstacles, food patches, landmarks, cover, light. Returns handles: `obstacles` for collision, `covers`, `foods`, `zones` |
| `src/core/world/cover.ts` | `nearestCover(x, y, covers, maxDistance)`, `isUnder(x, y, cover)` |
| `src/core/world/zones.ts` | `zoneAt(x, y, zones)`, with enter and leave detection |
| `src/core/activity/Activity.ts` | The activity state machine of doc 10, starting with `free` and `hiding` |
| `src/systems/WaterLight.ts` | The dapple tile sliding slowly, and the murk overlay centred on the shrimp |

Notes:
- `PlayScene.buildWorld` moves into `AreaLoader`. `PlayScene` is given an area id.
- Hiding: while Hide is held and cover is within 1.5 BL, feed `ShrimpMotion` an input that walks it to the nearest point under the cover, then hold it there. Do not teleport.
- Cover fades to 40% over 0.3 s while the player's centre is under it.
- The ground is one `TileSprite` the size of the view, as now. Ground patches such as the sandy mud at the creek mouth are large images with soft edges laid over it at depth 1.
- An edge strip is one `TileSprite` per `WallDef`, `to - from` long and `depth / solid` thick, scaled by `depth / (solid × image height)`, turned so that the top of the image is on the outside. Set its tile offset so that the pattern starts at the edge's own start, not at `from`. For collision, a strip is a rectangle `depth` thick: add it to the obstacles handed to `moveCircle`.
- Draw order inside depth 10: food, ground landmarks, edge strips, obstacles. The root clumps at the creek mouth stand over the ends of the left strips.
- `blocks` are solid shapes with no picture: the part of the sunken branch that lies on the mud. Add them to collision and draw nothing.
- The murk is an image that follows the shrimp, not the world: centred on the shrimp, twice the size of the view, at depth 60. It must still cover the screen when the camera is held at the area's edge and the shrimp is off centre.
- The dapple is a `TileSprite` the size of the view at depth 50 with the SCREEN blend and alpha `dappleStrength`. Slide its tile position slowly.
- Roots are turned by the `rotation` in the data and no further. Their light is painted in.
- The crabs, snails and small fish of the data file are drawn in this step as still images, by the rules in doc 14. They start to move in step 5.
- Remove `sandFlat` from the game once the mangrove loads. Keep the file for the unit tests if they use it.
- Build `WORLD.mirror` and `mirrorArea` as doc 19 says under "Turning the coast round", and pass every area through it in the loader and the atelier. The setting stays `false`. It lets the author turn the coast later without touching the data (T24).

Tests: `nearestCover` picks the nearest and respects the limit. `areas.test.ts` runs on every area as written and mirrored. The activity moves `free` to `hiding` only within range, and a tail flip leaves cover. Zones report enter once. Browser: the shrimp cannot pass through a root, and holding Hide near a tangle ends with `__lvdc.player().activity === 'hiding'`.

Goes wrong: cover drawn below the shrimp. Depth is `DEPTH.cover`, above `bedAnimals`. An edge strip turned the wrong way round, with its dark mass toward the inside: check each of the four sides against the map scene. A bare band at the side of the screen near the area's edge: the murk was sized to the view. Tile seams when the ground tile is scaled by a non-integer. Hundreds of scatter images each with its own tint: fine, but do not give each its own filter.

## Step 4. Feelings

Document: 10, all of it. 14 for the expressions.

| File | Job |
|------|-----|
| `src/core/feelings/FeelingsModel.ts` | The five values, stimuli, the per-step update, conditions |
| `src/core/feelings/mood.ts` | Exists with `MOODS` and `Mood`. Add `pickMood`, with enter and leave levels and the two timers |
| `src/core/feelings/types.ts` | `Feelings`, `Condition`, `StimulusKind`, `FeelingsContext`. `Mood` stays in `mood.ts` |
| `src/core/gameEvents.ts` | The event list above |
| `src/art/expressions.ts` | Exists with the table of doc 14: one `RigExpression` per mood. Add the condition changes |
| `src/systems/MoodPresenter.ts` | Edges, colour and view from the player's mood |
| `src/entities/ShrimpRig.ts` | Takes an expression and a look. Eases every channel. `src/atelier/stillShrimp.ts` already draws each expression held still: the moving rig must pass through those same postures. Compare with `atelier.html?show=moods` |

```ts
export interface FeelingsContext {
  motion: MotionMode;
  activity: Activity;
  sheltered: boolean;
  neighbours: readonly BondStage[];        // every shrimp within 4 BL
  companionWithin2: boolean;               // bond 0.5 or more
  restingAgainstClose: boolean;
  curiosityPull: number;                   // 0 to 1, worked out by the scene
  threat: { stage: ThreatStage; inSight: boolean; within8: boolean; afterMe: boolean } | null;
  dayPhase: DayPhase | null;
}

export class FeelingsModel {
  constructor(tuning: FeelingsTuning, start?: Partial<Feelings>);
  readonly values: Readonly<Feelings>;
  readonly mood: Mood;
  has(condition: Condition): boolean;
  stimulus(kind: StimulusKind, scale?: number): void;
  /** Returns the mood change, if one happened on this step. */
  step(dt: number, context: FeelingsContext): { from: Mood; to: Mood } | null;
}
```

Notes:
- The rig eases each expression channel with its own time: 0.3 s into afraid, 0.6 s otherwise.
- `MoodPresenter` uses filters on the main camera for saturation and view, and the existing vignette image for the edges. Every change takes at least 0.5 s.
- A debug key cycles the forced mood. Only when the address has `?debug`. Never bound through `ActionInput`, since it is not a game action.
- "Name feelings on screen" is a setting that already exists in `SettingsV1`.

Tests: the list at the end of doc 10.

Goes wrong: mood flicker at a threshold. That is what the enter and leave levels and the timers are for. Fear that never falls because a stale threat context is passed in. An afraid look that reads as "dead": keep the tremble and keep the antennae alive at the tips.

## Step 5. Food and scent

Documents: 10 (hunger, food table), 11 (ribbon looks).

| File | Job |
|------|-----|
| `src/data/foods.ts` | Per `FoodKind`: hunger removed, seconds, regrow time, image |
| `src/core/food/FoodPatch.ts` | `amount` from 0 to 1, `graze(dt)`, regrow |
| `src/core/scent/ribbons.ts` | From the player's position and the world: the list of ribbons to show, each with a kind, a target and a strength |
| `src/systems/ScentField.ts` | Draws the ribbons while Sense is held |
| `src/entities/FoodPatchView.ts` | The image, fading with `amount` |

Notes:
- One ribbon per food kind, to its nearest patch that has food. One per shrimp within range. One per danger mark. One per undiscovered thing, at most three, nearest first.
- A ribbon is a curve from the shrimp toward its target, bent a little by the current, cut off at the Sense range. Try `Rope` with the ribbon stroke images. If that fights back, draw with `Graphics`.
- `ribbon:followed`: remember which patches had a ribbon shown in the last 30 s.
- `FoodKind` stays a closed list. The content test compares `foods.ts` against it.

Tests: grazing removes the right amount at the right rate. Regrow after 90 s. Nearest patch per kind. Range limits. No food ribbon to an empty patch.

## Step 6. Other shrimp

Documents: 10 ("Other shrimp"), 02 (bonds).

| File | Job |
|------|-----|
| `src/data/shrimp.ts` | Companions: temperament, favourite food, marking |
| `src/core/npc/behaviours.ts` | The score of each behaviour, and the choice |
| `src/core/npc/steer.ts` | From a target point to an input for `ShrimpMotion`, sliding round obstacles |
| `src/core/bonds/Bonds.ts` | Values, gains with their limits, stages |
| `src/entities/NpcShrimp.ts` | One `ShrimpMotion`, one `FeelingsModel`, one `ShrimpRig`, one behaviour |
| `src/systems/Shoal.ts` | From chapter 2 |

Notes:
- Other shrimp move with the same `ShrimpMotion` as the player, fed by `steer`. They then walk, swim and dart exactly as the player does.
- Stagger decisions: shrimp `i` decides when `(tick + i) % 15 === 0`.
- A shrimp far outside the view steps at a lower rate and is not drawn.

Tests: flee thresholds by temperament. Bond gains and their once-per limits. Stages at 0.25, 0.5, 0.8. A bond never falls. Alarm spreads once per 5 s per receiver.

## Step 7. The bird

Document: 10 ("Threats").

| File | Job |
|------|-----|
| `src/core/threat/ThreatDirector.ts` | Stages, the 60 s gap, ambient odds, notice |
| `src/core/threat/bird.ts` | Where it stands, the ring, the aim, the hit test, when it gives up |
| `src/core/threat/cornered.ts` | Choosing the shelter to wake in |
| `src/entities/Bird.ts` | Shadow, legs, ring, beak, splash |
| `src/systems/CorneredSequence.ts` | The blur, the dark, the return |

Notes:
- The director is told the player's position, movement and cover each step, and tells the scene what to show. It never touches a sprite.
- The blur is a camera filter. With reduced motion it is a plain fade.
- Gentle mode is a flag passed to the director.

Tests: the list in doc 10.

Goes wrong: a strike landing on a player under cover. A second threat starting during the release of the first. The ring aimed at a wall. Being cornered with no shelter within reach of the rule: fall back to the area's spawn point.

## Step 8. A life with a shape

Documents: 11 (Drift), 12 (story steps), 13 (narration), 10 (molt).

| File | Job |
|------|-----|
| `src/core/movement/DriftMotion.ts` | The larva: carried by the flow, steered by the player |
| `src/core/progress/story.ts` | Steps from events. The current prompt |
| `src/core/molt/Molt.ts` | The phases and their lengths |
| `src/systems/Narrator.ts` | One line at a time, the 20 s gap, the two weights of line |
| `src/data/areas/drift.ts` | The drift area |
| `src/scenes/PlayScene.ts` | Area changes, with a fade |

Notes:
- The narrator holds a queue. A must line waits. Any other line is dropped if the gap has not passed.
- A place name shows alone when an area is first entered.
- `end.continued` is shown at the creek mouth after the molt, in release 0.1 only.

## Step 9. Journal, challenges, achievements, saving

Document: 12.

| File | Job |
|------|-----|
| `src/data/challenges.ts`, `achievements.ts`, `journal.ts`, `discoveries.ts` | Ids, targets, groups, text keys, source keys |
| `src/core/progress/Progress.ts` | Counts everything from events. Emits progress, done, achievement, card |
| `src/core/save/save.ts` | `SaveV1`, load with defaults, save at chapter start and at rest |
| `src/scenes/JournalScene.ts` | The notebook |
| `src/ui/SmallLine.ts` | The queued line at the top right |

Notes:
- Content tests: every challenge, achievement and discovery has both texts. Every card has a source key that exists in doc 07's table, mirrored in `journal.ts`. No card whose source is still "to check" is marked as released.
- "Without a break" counters keep a best value.
- New save fields get defaults in the loader. Change `v` only when a field changes meaning.

## Step 10. Sound

Document: 05.

- `src/systems/AudioDirector.ts` listens to `mood:changed`, `condition:changed`, `threat:stage` and the action events.
- No sound file enters the repository without its row in `CREDITS.md`. The content test enforces it.
- Start the search for music early. It is the slowest part.

## Step 11. Finish and publish

Documents: 03 (settings), 07 (About), 06 (counter).

- Settings scene, About scene, the keyboard notice, fonts hosted with the game, the counter.
- Then five people play while someone watches without helping.

## Later releases

Release 0.2 onward reuses everything above. What each adds is in doc 08. The lagoon, channel, shadow and open sea are mapped in doc 11, and their threats are specified in doc 10.

The lagoon's data file is written: `src/data/areas/lagoon.ts`, with nine views of it in the atelier at `?show=lagoonscenes`. Its new drawing rules are in doc 14, "From data to picture": seagrass fuzz, the turtle, the hunting fish, the pistol shrimp and goby, a burrowed shrimp, dusk, night and plankton. The turtle and the hunting fish are drawn at `DEPTH.overCover`, above the seagrass, and their shadows at `DEPTH.midWater` (T48). The channel, shadow and open sea data files are still to be written.

## When stuck

| Problem | Look at |
|---------|---------|
| A Phaser call does not exist or behaves oddly | `node_modules/phaser/skills/`, then the type definitions |
| A rule is not in the documents | Doc 09. If it is not there either, propose a default, write it down, ask the author |
| A fact is needed for a journal text | Doc 07. Never from memory |
| A number feels wrong in play | Change it in `src/data/tuning.ts`, note it in the pull request. Numbers are starting points |
| The picture looks wrong | The atelier page, then doc 14's checks |
