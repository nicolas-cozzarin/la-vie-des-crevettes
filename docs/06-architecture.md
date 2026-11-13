# 06. Tech architecture and deployment

Status: draft 0.2, 2026-11-13. Stack confirmed by the author (D30). Built by the author with Claude Code (D29). Static site on GitHub Pages.

## Stack

| Part | Choice | Version checked 2026-11-13 |
|------|--------|----------------------------|
| Game framework | Phaser | 4.2.1, released July 2026 |
| Language | TypeScript, strict mode | current |
| Build tool | Vite | 8 |
| Unit tests | Vitest | current |
| Browser test | Playwright | current |
| Lint and format | ESLint, Prettier | current |
| Packages | npm on Node LTS | |
| Hosting | GitHub Pages, deployed by GitHub Actions | |

Pin exact versions in `package.json` on the day the project is created.

**Phaser 4 is new.** It came out in 2026. Most tutorials, and most of what an AI assistant remembers, describe Phaser 3. The two are close but not identical. When something does not work, read the Phaser 4 documentation and the type definitions in `node_modules/phaser`, not memory.

Why Phaser: scenes, keyboard input, audio, asset loading, cameras, tweens and particles are all included, it builds to plain static files, and it is the best-documented 2D web framework. Godot's web export was considered and set aside: larger download, and work happens in an editor, which suits Claude Code less well.

## Principles

1. **Rules without the engine.** Everything that decides what happens (feelings, bonds, threats, challenges, saves, bindings) lives in `src/core/` and never imports Phaser. It is covered by unit tests.
2. **Data, not code, for content.** Tuning numbers, areas, foods, journal cards, challenges and achievements are data files in `src/data/`.
3. **No text in code.** Every string shown to the player comes from a locale file through `t('key')`.
4. **No keys in code.** Game code asks `ActionInput` about actions. See [03-controls.md](03-controls.md).
5. **Images by name.** Every image is requested by a name. If no file exists for the name, a code-drawn one is generated at start-up. See [04-art-direction.md](04-art-direction.md).
6. **One event bus.** Systems talk through typed events, not by reaching into each other.
7. **Static only.** No server, no accounts, no database.

## Folders

```
la-vie-des-crevettes/
├─ index.html
├─ package.json
├─ vite.config.ts
├─ tsconfig.json
├─ README.md
├─ CLAUDE.md                  instructions for Claude Code
├─ CREDITS.md                 every third-party asset
├─ LICENSE                    MIT, for code
├─ docs/                      these documents
├─ public/
│  └─ assets/
│     ├─ audio/
│     ├─ images/
│     └─ fonts/
├─ src/
│  ├─ main.ts                 game config and scene list
│  ├─ app.ts                  settings, storage and keyboard, shared by every scene
│  ├─ core/                   no Phaser imports
│  │  ├─ feelings/            FeelingsModel, mood rules
│  │  ├─ bonds/
│  │  ├─ threat/              ThreatDirector state machine
│  │  ├─ progress/            story steps, challenges, achievements, journal
│  │  ├─ input/               ActionInput, bindings, presets
│  │  ├─ movement/            ShrimpMotion, collision with circles and rectangles
│  │  ├─ save/                save and settings, with versions
│  │  ├─ i18n/
│  │  └─ events.ts            the typed event bus
│  ├─ data/
│  │  ├─ tuning.ts
│  │  ├─ foods.ts
│  │  ├─ shrimp.ts            companions and temperaments
│  │  ├─ areas/               one file per area
│  │  ├─ journal.ts
│  │  ├─ challenges.ts
│  │  └─ achievements.ts
│  ├─ locales/                fr.json, en.json
│  ├─ scenes/                 Boot, Preload, Title, Play, Hud, Pause, Settings, Journal, About
│  ├─ entities/               ShrimpRig, PlayerShrimp, NpcShrimp, Bird, HuntingFish, Net, FoodPatch, Cover
│  ├─ systems/                AreaLoader, MoodPresenter, AudioDirector, ScentField, DayNight, Shoal, Narrator, Counter
│  ├─ art/                    TextureFactory: code-drawn images
│  ├─ platform/               the browser: keyboard events, storage, keyboard layout
│  └─ ui/                     prompts, panels, rebind dialog
├─ tests/
│  ├─ unit/
│  ├─ content/                checks on data, locales and credits
│  └─ e2e/
└─ .github/workflows/         ci.yml, deploy.yml
```

## Scenes

```
Boot -> Preload -> Title -> Play (with Hud on top)
                     |        |
                   About    Pause -> Settings
                              |
                            Journal
```

`Play` is one scene for every area. It is given an area name, loads that area's data and runs it. Moving to the next chapter restarts `Play` with the next area. The free life uses the same scene with story steps switched off.

## Systems

| System | Job |
|--------|-----|
| `FeelingsModel` (core) | Holds the five values, applies stimuli, updates over time, reports mood |
| `ThreatDirector` (core) | Decides when a threat starts and steps it through cue, presence, chase, release |
| `Progress` (core) | Tracks story steps, challenges, achievements and journal unlocks from events |
| `ActionInput` (core) | Turns key events into actions. Holds bindings |
| `AreaLoader` | Builds an area from its data file: ground, obstacles, cover, food, spawn points, triggers |
| `ShrimpRig` | Draws and animates a shrimp from parts. Takes a mood and a movement state |
| `MoodPresenter` | Applies the player's mood to the screen: darkened edges, colour, view width |
| `AudioDirector` | Mixes music, ambience and effects from mood and events |
| `ScentField` | Works out and draws scent ribbons while Sense is held |
| `Narrator` | Shows one line of narration at a time, with a minimum gap |
| `DayNight` | Runs the light cycle from chapter 2 |
| `Shoal` | Keeps the group loosely together |
| `Counter` | Sends anonymous counts. See below |

## Events

```ts
type GameEvents = {
  'mood:changed':      { who: ShrimpId; from: Mood; to: Mood };
  'food:eaten':        { who: ShrimpId; kind: FoodKind; first: boolean };
  'sense:used':        {};
  'tailflip':          { who: ShrimpId };
  'cover:entered':     { who: ShrimpId; coverId: string };
  'greeting':          { a: ShrimpId; b: ShrimpId };
  'bond:changed':      { with: ShrimpId; value: number; stage: BondStage };
  'threat:stage':      { kind: ThreatKind; stage: 'cue' | 'presence' | 'chase' | 'release' };
  'threat:escaped':    { kind: ThreatKind; clean: boolean };
  'cornered':          { kind: ThreatKind };
  'molt:done':         { who: ShrimpId; stage: LifeStage };
  'discovery':         { id: string };
  'step:done':         { id: string };
  'challenge:progress':{ id: string; value: number; target: number };
  'challenge:done':    { id: string };
  'achievement':       { id: string };
  'area:entered':      { area: AreaId };
  'spawned':           { generation: number };
};
```

## Core types

```ts
export interface Feelings {
  hunger: number; fear: number; comfort: number; curiosity: number; company: number; // each 0 to 1
}
export type Mood = 'calm' | 'hungry' | 'content' | 'curious' | 'social' | 'afraid';
export type LifeStage = 'larva' | 'juvenile' | 'subadult' | 'adult';

/** Closed list. There is no animal food and no way to add one without changing this type. */
export type FoodKind = 'microalgae' | 'algaeFilm' | 'mangroveLeaf' | 'seagrassFuzz' | 'sandFilm' | 'seaweed';

export interface SaveV1 {
  v: 1;
  generation: number;
  area: AreaId;
  stage: LifeStage;
  stepsDone: string[];
  bonds: Record<string, number>;
  discoveries: string[];
  challenges: Record<string, number>;   // progress per challenge
  achievements: string[];
  stats: Record<string, number>;        // tail flips, times cornered, and so on
  playSeconds: number;
}

export interface SettingsV1 {
  v: 1;
  lang: 'fr' | 'en';
  bindings: Bindings;
  senseMode: 'hold' | 'toggle';
  hideMode: 'hold' | 'toggle';
  volume: { master: number; music: number; ambience: number; effects: number };
  captions: boolean;
  gentleMode: boolean;
  reducedMotion: boolean;
  textScale: 1 | 1.25 | 1.5;
  nameFeelings: boolean;
  keyLabels: Record<string, string>;     // letters seen for each key position, for labels
}
```

Saves and settings are stored in the browser under `lvdc.save.v1` and `lvdc.settings.v1`. Loading checks the version and upgrades older data. If browser storage is unavailable, the game still runs and says progress will not be kept.

## Areas as data

Each area is one data file. The first version places things by hand-written coordinates and seeded scatter inside zones. A map editor can be adopted later if hand placement becomes slow.

```ts
export const mangrove: AreaDef = {
  id: 'mangrove',
  size: { w: 6000, h: 4000 },           // design pixels
  ground: 'mangrove.mud',
  murk: 0.6,
  dayCycle: false,
  music: 'music.mangrove',
  ambience: 'amb.mangrove',
  spawn: { x: 600, y: 3400 },
  obstacles: [ { shape: 'circle', x: 1400, y: 3000, r: 180, image: 'mangrove.root.large' } ],
  cover:     [ { id: 'tangle-1', x: 1700, y: 2800, r: 220, image: 'mangrove.tangle.a' } ],
  food:      [ { kind: 'algaeFilm', zone: { x: 1000, y: 2600, w: 1200, h: 800 }, count: 6, seed: 11 } ],
  creatures: [ { kind: 'fiddlerCrab', x: 2400, y: 1200 } ],
  shrimp:    [ { id: 'nacre', x: 2000, y: 2500 } ],
  triggers:  [ { id: 'first-bird', zone: { x: 2600, y: 2000, w: 600, h: 600 }, once: true } ],
  exits:     [ { to: 'lagoon', zone: { x: 5800, y: 0, w: 200, h: 4000 }, needsSteps: true } ],
};
```

## Movement and collision

Movement and collision are worked out in `src/core/movement/`, without the engine, so they are covered by unit tests (T20). `ShrimpMotion` turns the held direction and the tail flip key into a position, a heading and a height. The shrimp is a circle. Obstacles are still circles and rectangles, and the shrimp slides along them. Cover, food, triggers and exits are overlap zones. Height off the bed is visual only: a shadow offset, with no effect on collision.

The game uses the true time between frames. A long frame is played as several short steps, so the shrimp covers the same ground whatever the frame rate (T22).

## Drawing

- Each layer in [04-art-direction.md](04-art-direction.md) is a Phaser layer with a fixed depth.
- Shadows are separate images under their owners, offset by height.
- Cover fades to about 40% opacity while the player is under it.
- Mood effects are full-screen images and tints over the top, driven by `MoodPresenter`.
- Design size 1920 x 1080, scaled to fit, centred.

## Text and languages

- `src/locales/fr.json` and `en.json`, flat keys such as `journal.card.tailflip.body`.
- A content test fails if a key exists in one language and not the other.
- French addresses the player as "tu".
- Language comes from the browser on first run and can be changed in settings.

## Counting players (D32)

The author wants to know how many people play. Proposed tool: GoatCounter, an open-source counter that uses no cookies and stores no personal data.

- Loaded only in the published build, and only if a site code is set in the build settings.
- Counts: a visit, `start` (Play pressed), `area-<name>` (each area reached), `spawned`, `generation-2`.
- Nothing about the player or their choices is sent.
- The About page says: "This site counts visits anonymously. No cookies."
- If the script fails to load or is blocked, the game is unaffected.

Check GoatCounter's current terms and event API when setting it up.

## Budgets

| What | Limit |
|------|-------|
| Download before the title screen | 1.5 MB compressed |
| Download before play starts | 4 MB |
| Whole game | 40 MB |
| Frame rate | 60 fps on a five-year-old laptop |
| Moving things on screen | 150 |

Each area loads its own images and sound when entered.

## Browsers

Current desktop Chrome, Firefox, Safari and Edge. A device without a keyboard gets the notice described in [03-controls.md](03-controls.md).

## Tests

| Kind | Tool | Covers |
|------|------|--------|
| Unit | Vitest | Everything in `src/core/`: mood rules, bond gains, threat stages and spacing, challenge counting, rebinding and conflicts, save upgrades |
| Content | Vitest | Same keys in both languages. Every journal card has a source. Every file in `public/assets/` has a row in `CREDITS.md`. Every challenge and achievement has text. Food kinds match the closed list |
| Browser | Playwright | The page loads with no console errors, Play starts the game, holding a movement key moves the shrimp, the settings screen rebinds a key and keeps it after reload |

## Commands

| Command | Does |
|---------|------|
| `npm run dev` | Local server with live reload |
| `npm run build` | Type-check and build to `dist/` |
| `npm run preview` | Serve the built game locally |
| `npm test` | Unit and content tests |
| `npm run test:e2e` | Browser test |
| `npm run lint` | ESLint and Prettier check |

## Deploying to GitHub Pages

One-time setup:

1. The public repository is `nicolas-cozzarin/la-vie-des-crevettes`. The game will be at `https://nicolas-cozzarin.github.io/la-vie-des-crevettes/`.
2. In the repository: Settings, Pages, Source: **GitHub Actions**.
3. Set the base path in `vite.config.ts` to the repository name:

```ts
import { defineConfig } from 'vite';

export default defineConfig({
  base: '/la-vie-des-crevettes/',
});
```

4. Add the workflow below.

**Asset paths.** Because the game lives under `/la-vie-des-crevettes/`, no path may start with a bare `/`. Set the Phaser loader's base to `import.meta.env.BASE_URL` once in `Preload` and use relative paths everywhere else. This is the most common reason a game works locally and shows a blank page on GitHub Pages.

`.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: lts/*
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm test
      - run: npm run build
      - uses: actions/configure-pages@v6
      - uses: actions/upload-pages-artifact@v5
        with:
          path: ./dist
      - id: deployment
        uses: actions/deploy-pages@v5
```

The action versions are the ones in Vite's own deployment guide on 2026-11-13 (`vite.dev/guide/static-deploy`). That guide pins each action to a commit. Copy the pinned lines from it when creating the file.

`.github/workflows/ci.yml` runs lint, tests, build and the browser test on every pull request.

Every push to `main` publishes the game. Work on branches and merge when a step is done.

## Left out on purpose

A server, accounts, cloud saves, touch controls, gamepad, offline install. Touch and gamepad are on the roadmap. The rest is not planned.
