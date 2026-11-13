# CLAUDE.md

Instructions for Claude Code working in this repository.

## What this is

**La vie des crevettes** (The Life of Shrimp): a calm top-down browser game in which the player lives the life of a whiteleg shrimp. A personal project, made to help people see shrimp as animals that feel. Static site on GitHub Pages. Phaser 4, TypeScript, Vite.

It is not affiliated with any organisation. Do not add an organisation's name, logo, colours or links anywhere in the game, the code, the docs or commit messages.

## Read first

| For | Read |
|-----|------|
| What the game is | `docs/01-game-design.md` |
| Rules and numbers | `docs/02-mechanics.md` |
| Keys, rebinding, settings | `docs/03-controls.md` |
| Look | `docs/04-art-direction.md` |
| Sound | `docs/05-audio-direction.md` |
| Code structure, deployment | `docs/06-architecture.md` |
| Facts, journal texts, narration, wording | `docs/07-science-and-message.md` |
| What to build next | `docs/08-roadmap.md` |
| What is decided | `docs/09-decisions.md` |

If code and docs disagree, stop and ask which is right. If a decision in `docs/09-decisions.md` must change, change it there first.

## Rules that never bend

1. **No animal is eaten.** No shrimp, no other animal and no animal product is consumed by any character, in play, images, text or sound. `FoodKind` is a closed list of algae and plants. Do not add to it.
2. **No death or injury on screen.** Predators and the net never catch anyone. Companions always escape.
3. **No preaching.** No text tells the player what to think or do. No moral words. Facts appear only in the journal, worded by the rules in doc 07.
4. **No unsourced facts.** A journal card needs a source key from doc 07. Do not write new facts from memory. Propose them with a source, marked "to check".
5. **Never say shrimp eat only plants.** The game shows plant foods and is silent on the rest.
6. **Assets are original, CC0 or CC BY.** Each third-party file gets a row in `CREDITS.md` in the same commit. No AI-generated music.
7. **No bars or meters for feelings.**
8. **The shrimp has no human features and is never pink or curled like a cooked one.**

## Code rules

- `src/core/` never imports Phaser. Game rules go there, with unit tests.
- Numbers go in `src/data/tuning.ts`. Content goes in `src/data/`. `src/core/` takes them as arguments and never imports `src/data/`.
- No player-facing string in code. Use `t('key')` and add the key to both `fr.json` and `en.json`.
- No key codes in game code. Use `ActionInput`, reached as `app.actions`. Only `src/platform/` touches the browser's keyboard and storage.
- Request images by name. If there is no file for a name, `TextureFactory` draws one.
- No asset path starts with `/`. The game is served from a sub-path.
- This is Phaser 4. Do not rely on Phaser 3 examples. Check the types in `node_modules/phaser` and the v4 docs.
- TypeScript strict. No `any` without a comment saying why.
- Keep engine-facing code thin. Put decisions in `core`, drawing in `entities` and `systems`.

## Commands

```
npm run dev        local server
npm run build      type-check and build
npm run preview    serve the build
npm test           unit and content tests
npm run test:e2e   browser test
npm run lint       lint and format check
```

## Done means

- The step's checks in `docs/08-roadmap.md` pass.
- `npm run lint`, `npm test` and `npm run build` pass.
- New rules have unit tests. New text exists in both languages. New assets are credited.
- Played in the browser, not only compiled.
- Work is on a branch. Merging to `main` publishes the game.

## Ask before

- Adding a dependency.
- Adding any creature, food or behaviour not in the docs.
- Writing or changing journal facts.
- Changing default keys, the save format, or anything under "Rules that never bend".

## Writing style for game text

Short. Plain. Present tense. No exclamation marks. French addresses the player as "tu". See the narration rules and samples in doc 07.
