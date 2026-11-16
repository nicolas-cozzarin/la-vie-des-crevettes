# 19. Changing things safely

Status: draft 0.1, 2026-11-15. Decision D40. How to change one thing in the game without breaking another. For the author, who may want to move the coast, a number or a picture later, and for whoever builds the next step.

## The idea

- Each kind of thing has **one home**. Change it there and nowhere else.
- When something else depends on it, the table below says what, under **Also**.
- A **check** fails, with a message that names the file and the thing, when a change misses one of those.
- `npm run check` runs the checks that take under a minute: lint, the unit and content tests, the build. `npm run test:e2e` plays the game in a browser. A pull request runs all of them.

## How to make a change

1. Find the row in "Where each thing lives".
2. Change the home, then everything under **Also**.
3. Run `npm run check`.
4. Look at it: the atelier for a picture (`npm run dev`, then `atelier.html`), the game for a rule.
5. Commit with one sentence on what changed and why. One change per commit, so that one can be undone alone.
6. Open a pull request. Merge only when its checks are green. Merging to `main` publishes the game.

To undo a change that is already published, open the merged pull request on GitHub and press **Revert**. GitHub makes a new pull request that undoes it.

## Where each thing lives

**Ask first** means the change needs the author's yes before it is made (CLAUDE.md, "Ask before").

| To change | Home | Also | Checked by |
|-----------|------|------|------------|
| A number: a speed, a time, a distance | `src/data/tuning.ts` | The doc that quotes it, often 02 or 10 | Unit tests that use it. Playing |
| A line of text | Its row in doc 13 | The same words in `src/locales/en.json` and `fr.json` | `locales.test.ts`: same keys and placeholders in both languages, no `!`. `docs.test.ts`: every text matches doc 13 word for word |
| A default key | **Ask first**. `src/core/input/bindings.ts` | Doc 03 | `bindings.test.ts` |
| Where a thing stands in a place | `src/data/areas/<place>.ts` | Doc 11 if it quotes the position | `areas.test.ts`. The atelier's scenes |
| A new place | A new file `src/data/areas/<id>.ts`, exporting one `AreaDef` named like the file. The id in `AREA_IDS` | Doc 11 or 17, an exit from a neighbouring place | `areas.test.ts` finds the new file by itself |
| A picture | Its painter in `src/art/painters/<family>.ts` | Its row in the manifest of doc 14. Its row in `src/art/fit.ts` if it is solid, cover, a tile or an edge strip | `art.test.ts`. The atelier |
| A new picture | A painter in the family's file. `PAINTERS` and the atelier pick it up | A manifest row saying "Built" with its size. A fit row if needed | `art.test.ts` |
| A painter replaced by a painted file | `public/assets/images/<name>.webp` | A row in `CREDITS.md` if someone else made it. The list in `Preload` | `rules.test.ts`: every file under `public/` is credited |
| A food | **Ask first**. Rule 1. `FOOD_KINDS` | A row in doc 09, doc 11, the test's list | `rules.test.ts` holds the six foods |
| A creature, thing or behaviour not in the docs | **Ask first** | Docs 11 and 10, a row in doc 09 | |
| A journal fact | **Ask first**. A source row in doc 07 | The card in doc 07, then doc 13 | `docs.test.ts`: every source key cited is defined |
| A decision | Its row in doc 09, first | The docs in its last column | `docs.test.ts`: every D and T id cited exists |
| A document's name | The file in `docs/` | Every link to it, README's table, CLAUDE.md's table | `docs.test.ts`: links lead somewhere, every doc is listed |
| A rule of the game | `src/core/...`, with its unit test | Doc 10 or 02 | Unit tests |
| The save format | **Ask first** | A version number and a way to read the old version | To build in step 9 |
| The way the coast runs | See "Turning the coast round" | | |

## What each check catches

| File | Fails when |
|------|------------|
| `tests/content/areas.test.ts` | A place asks for a picture with no painter. Two things share an id. A food is not on the list. A thing stands outside the place, or a shrimp or a food inside rock. The player starts inside something. An edge strip has an open end. An exit leads to a place that does not exist. An area file is not named like its area |
| `tests/content/art.test.ts` | A painter has no row in doc 14, or its row does not say "Built", or gives another size. A row says "Built" with no painter. A picture is over 2048 px or has a badly formed name. The atelier misses a painter. `fit.ts` names a picture that does not exist, or has numbers that cannot be right |
| `tests/content/docs.test.ts` | A doc is missing from README or CLAUDE.md. A link leads nowhere. A doc cites a decision that doc 09 does not have, or a source that no source table defines. A text in the game differs from doc 13 |
| `tests/content/locales.test.ts` | The two languages differ in keys or placeholders. A text is empty or has `!` |
| `tests/content/rules.test.ts` | The foods are not the six plant foods. A file names an organisation the author asked to keep out. A file in `public/` is not credited. Pictures or rules use `Math.random`. Code outside `src/platform` touches the keyboard or the storage. An asset path starts with `/`. Code asks for a text key that does not exist. A painter imports the engine |
| `eslint.config.js` | `src/core` imports Phaser, the engine-facing folders, `src/data` or `src/platform` |
| `tests/unit/*` | A rule of the game changed its result |
| `tests/e2e/*` | The game does not start, the shrimp does not move, the atelier does not draw |

The organisation check holds the names as hashes, so that the test does not write them. Its comment says how they are made.

## When a check fails

- Read the message. It names the file and the thing.
- Fix the change, not the check.
- A check changes only when a decision changes. Change doc 09 first, then the check, in the same commit, and say so in the message.
- Never skip, switch off or loosen a test to get a green result.

## Turning the coast round

T24: the coast runs with the sea to the left and the land to the right. The author may turn it later. This is how, so that it is one setting and not a rewrite.

The pictures carry light painted from the upper left. Mirroring a picture would move its light to the upper right, and the whole world would look lit from two sides. So the turn mirrors **positions**, and leaves pictures as they are.

What step 3 builds for it (doc 15):

- `WORLD.mirror` in `src/data/tuning.ts`: `false` today.
- `mirrorArea(area)` in `src/data/areas/mirror.ts`. It returns a new area, with every `x` turned to `size.w - x`, every zone's `x` to `size.w - x - w`, left and right edge strips swapped, every `rotation` negated, every heading turned to `π - heading`, every current's `vx` negated.
- The area loader and the atelier pass each area through `mirrorArea` when the setting is on. The data files are never rewritten.
- A few pictures face a way: the hollow's opening, the sunken branch, the seed pod lying down. When mirrored they are drawn flipped, and only they take light from the other side. Their manifest rows say which way they face.
- `areas.test.ts` runs every check on each area twice, as written and mirrored.

Then the author turns the coast by changing one word, `false` to `true`, and looks at the atelier's scenes.

## What no check covers yet

| Gap | How to cover it later |
|-----|------------------------|
| Positions quoted in doc 11 against the data files | Make the data file the only home and have doc 11 point to it |
| Numbers quoted in docs 02 and 10 against `tuning.ts` | When step 4 adds the feelings' numbers, doc 10's tables use the names in `tuning.ts`, and a test compares them |
| How a picture looks | Only eyes, in the atelier |
| How the game feels | Only playing it |
| How the French reads | A French speaker reads it aloud before release (doc 07) |

## One setting the author can make

GitHub can refuse to merge a pull request whose checks failed. On the repository: Settings, Branches, add a rule for `main`, tick "Require status checks to pass before merging", and pick the check named `check`. Then a red pull request cannot publish the game by mistake.
