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
| A new place | A new file `src/data/areas/<id>.ts`, exporting one `AreaDef` named like the file. The id in `AREA_IDS` | Doc 11 or 17, an exit from a neighbouring place. Its name in `AREAS` in `src/data/areas/index.ts` once it can be played | `areas.test.ts` finds the new file by itself |
| What a place looks like in the game | Nothing to change: open `?explore=<area>`, and add `&at=x,y` to start at a point of the data file (T57) | | The browser test opens the lagoon this way |
| A picture | Its painter in `src/art/painters/<family>.ts` | Its row in the manifest of doc 14. Its row in `src/art/fit.ts` if it is solid, cover, a tile or an edge strip | `art.test.ts`. The atelier |
| A new picture | A painter in the family's file. `PAINTERS` and the atelier pick it up | A manifest row saying "Built" with its size. A fit row if needed | `art.test.ts` |
| A painter replaced by a painted file | `public/assets/images/<name>.webp` | A row in `CREDITS.md` if someone else made it. The list in `Preload` | `rules.test.ts`: every file under `public/` is credited |
| A food | **Ask first**. Rule 1. `FOOD_KINDS` | A row in doc 09, doc 11, the test's list | `rules.test.ts` holds the six foods |
| A creature, thing or behaviour not in the docs | **Ask first** | Docs 11 and 10, a row in doc 09 | |
| A journal fact | **Ask first**. A source row in doc 07 | The card in doc 07, then doc 13 | `docs.test.ts`: every source key cited is defined |
| A decision | Its row in doc 09, first | The docs in its last column | `docs.test.ts`: every D and T id cited exists |
| A document's name | The file in `docs/` | Every link to it, README's table, CLAUDE.md's table | `docs.test.ts`: links lead somewhere, every doc is listed |
| A rule of the game | `src/core/...`, with its unit test | Doc 10 or 02 | Unit tests |
| A feeling's number: a rate, a gain, a level, a timer | `HUNGER`, `FEAR`, `COMFORT`, `CURIOSITY`, `COMPANY`, `WARY` or `MOOD` in `src/data/tuning.ts` | Doc 10 | `feelings.test.ts`, `mood.test.ts`, `discovery.test.ts` |
| How a mood looks in the body | `MOOD_EXPRESSIONS`, and `withConditions` for a condition, in `src/art/expressions.ts` | Doc 14's table of expressions. Look at `atelier.html?show=moods`, then at the game with `?debug` and F9 | The atelier and the game, by eye |
| How a mood looks on the screen | `MOOD_SCREEN` in `src/data/tuning.ts`. The way it is drawn in `src/systems/MoodPresenter.ts` | Doc 10, "Screen". T62 | The game with `?debug` and F9, by eye |
| What a food gives: hunger, seconds, regrowth | `FOODS` in `src/data/foods.ts`. The food list itself is **Ask first** (rule 1) | Doc 10, "Hunger" | `food.test.ts` |
| How grazing and Sense work: reach, mouth, ribbon range and look | `GRAZE` and `SENSE` in `src/data/tuning.ts`. The rules in `src/core/activity/Activity.ts` and `src/core/scent/ribbons.ts` | Doc 10, "Activities". T67, T68 | `activity.test.ts`, `scent.test.ts`. The game with `?explore=mangrove`, by eye |
| A companion: temperament, favourite food, size, marking | `COMPANIONS` and `UNNAMED` in `src/data/shrimp.ts` | Doc 10, "Other shrimp". Doc 14 for the look | `npc.test.ts` for the flee thresholds |
| How other shrimp choose, move and greet | `NPC`, `STEER`, `ALARM`, `SHOAL` and `GREET` in `src/data/tuning.ts`. The rules in `src/core/npc/` and `src/core/activity/Activity.ts` | Doc 10, "Other shrimp". T71 to T74 | `npc.test.ts`, `activity.test.ts`. The game with `?explore=mangrove&at=4420,2250`, by eye |
| A bond's gains and stages | `BOND` in `src/data/tuning.ts`. The rules in `src/core/bonds/Bonds.ts` | Docs 02 and 10. T73 | `bonds.test.ts` |
| How the crabs, snails, hermit crabs, fish, the turtle, and the pistol shrimp and goby move | `CREATURES` in `src/data/tuning.ts`. The rules in `src/core/creatures/`, the drawing in `src/systems/Creatures.ts`, `src/entities/TurtleView.ts`, `src/entities/BurrowPairView.ts` and `src/art/stills.ts`. The turtle's clumps: `route` on its entry in the area file | Doc 11. T75, T92, T106, T107 | `creatures.test.ts`, `hermit.test.ts`, `turtle.test.ts`, `burrowPair.test.ts`, `areas.test.ts` |
| The pale rim | `CREATURES.rim` in `src/data/tuning.ts`. `src/systems/Rim.ts` | Doc 11, `fx.rim`. T76 | The browser test |
| How a threat comes and goes: the gap, the odds, notice, the bird's numbers, cornered | `THREAT`, `BIRD` and `CORNERED` in `src/data/tuning.ts`. The rules in `src/core/threat/`. Which threats a place has: `threats` in its area file | Doc 10, "Threats". T77 to T81 | `threat.test.ts`. The game with `?explore=mangrove&debug` and F10, by eye |
| How the bird and being cornered look | `src/entities/Bird.ts`, `src/systems/CorneredSequence.ts` | Doc 14 for the pictures. T78, T79 | The browser test. The game with `?debug` and F10, by eye |
| The Drift: its zones, water colours, clouds, copepods, bells, light, haze and landfall | `DRIFT_AREA` in `src/data/drift.ts`. What drifts is written where the larva meets it (T83) | Doc 11, "Chapter 0. Drift" | `drift.test.ts` in `tests/content`, as written and mirrored. The game with `?explore=drift&at=x,y` |
| How the larva and the Drift behave: flow, steering, yolk, shapes, motes, the other larvae, landfall | `DRIFT` in `src/data/tuning.ts`. The rules in `src/core/movement/DriftMotion.ts` and `src/core/drift/` | Doc 10, "The larva". Doc 11. T54, T84 | `drift.test.ts` in `tests/unit`. The browser test |
| When a story step is done, or a line of narration shows | `STORY_STEPS` and `NARRATION_LINES` in `src/data/story.ts`. Timings in `STORY`, `NARRATION` and `PLACE_NAME` in `src/data/tuning.ts`. The moments in `src/systems/StoryTeller.ts` and `DriftTeller.ts` | Docs 12 and 13. T82, T87, T100 | `story.test.ts`, `dayCycle.test.ts`. `docs.test.ts` for the words |
| The day's length, its phases, and how strong dusk and night are | `DAY` in `src/data/tuning.ts`. The rules in `src/core/world/dayCycle.ts`. Which places have one: `dayCycle` in the area's data | Docs 02 and 10, "Day and night". Doc 14 for the strengths. T99 | `dayCycle.test.ts`. `lagoon.spec.ts` |
| What the time of day does to fear, comfort, threats and the golden film | `DAY.effects` in `src/data/tuning.ts`, passed into the feelings as `FEELINGS.day` | Doc 10, "Day and night". T99 | `dayCycle.test.ts` |
| How dusk, night and the glowing plankton look | `src/systems/DayNight.ts`, with `DAY.plankton` | Doc 14, "From data to picture". T99 | The browser test. Look at `?explore=lagoon&time=night` |
| Where a way out leads, and when it opens | `exits` in the area's data, with `needsStep`. `leaveBy` in `PlayScene` | Doc 11. T100 | `lagoon.spec.ts` |
| How burrowing and resting work: dig and coming-out times, when the rest is offered, how fast the day runs | `BURROW` and `REST` in `src/data/tuning.ts`. The rules in `src/core/activity/Activity.ts`; when the rest is offered, `mayRest` in `PlayScene`. Which places have sand: `sand` in the area's data | Doc 10, "Activities" and "Comfort". T101 | `burrow.test.ts`, `lagoon.spec.ts` |
| How the sand over a dug-in shrimp looks | `src/entities/SandLid.ts` | Doc 14, "Burrowed shrimp". T101 | The browser test. Look at `?explore=lagoon&at=5200,2600` and hold Hide |
| How the hunting fish hunts: its circle, the warning, the charge, giving up, the dawn fish | `FISH` in `src/data/tuning.ts`. The rules in `src/core/threat/fish.ts`, its stages in `ThreatDirector`. Where the dawn fish comes from: the `huntingFish` entry in the area's data | Doc 10, "The hunting fish". T102 | `fish.test.ts`, `lagoon.spec.ts` |
| How the hunting fish looks | `src/entities/Hunter.ts`, with the pictures `fish.hunter.body` and `fish.hunter.tail` | Doc 14, "Hunting fish". T102 | The game with `?explore=lagoon&debug` and F10 |
| Who goes missing from the shoal, and when (D42) | `LOSSES` in `src/data/tuning.ts`. The rule in `src/core/npc/losses.ts`. Removing them in `Shoal.remove`, and building a place without them from `missing.<place>` | Doc 10, "Losses". T103 | `losses.test.ts` |
| The molt: its phases, the shell, the growth | `MOLT` in `src/data/tuning.ts`. The rules in `src/core/molt/Molt.ts`, the drawing in `src/systems/Molting.ts` | Doc 10, "Molting". T86 | `molt.test.ts`. The game with `?explore=mangrove&debug` and F8 |
| What a companion does for the player: leading to food, resting touching, the early sidestep | `CLOSE` in `src/data/tuning.ts`. Choices in `src/core/npc/close.ts`; the walking in `NpcMind.lead` and its `rest`; when, in `Shoal.watchClose` | Doc 10, "Toward the player". T105 | `close.test.ts`, `npc.test.ts` |
| When a companion molts, and staying with her | `NPC.molt` in `src/data/tuning.ts`. Who and staying in `src/core/npc/companionMolt.ts`; where she shelters in `NpcMind.molt`; her body in `NpcShrimp`; when, in `Shoal.watchMolts` | Doc 10, "Molting". Doc 12, `c2.molt`. T104 | `companionMolt.test.ts`, `npc.test.ts`, `lagoon.spec.ts`. The game with `?explore=lagoon&time=night&debug` and Shift and F8 |
| The life stage of an area | `STAGE_IN` in `src/data/areas/index.ts` | Doc 11, "Scale". `STAGE_LOOKS` in `src/art/expressions.ts` for how each stage looks | |
| The save format | **Ask first**. `SaveV1`, `saveOf`, `lifeOf` and `loadSave` in `src/core/save/save.ts`. A new field gets a default in `loadSave`; `v` changes only when a field changes meaning | Doc 06's `SaveV1`. T89 | `save.test.ts`. The browser test resumes at the last rest |
| When the life is saved | `SAVE` in `src/data/tuning.ts`, `RestSaver` in `src/core/save/`, `keep` in `PlayScene` | Doc 02. T89 | `save.test.ts`. The browser test |
| A challenge, achievement or card: what it reads, its target, its chapter | `CHALLENGES` in `src/data/challenges.ts`, `ACHIEVEMENTS` in `achievements.ts`, `CARD_SPECS` in `journal.ts`. What the game counts: `count` in `src/core/progress/Progress.ts` and the events `ProgressKeeper` hears | Doc 12's tables, doc 13's texts. A card's facts are **Ask first**. T88, T90 | `progress.test.ts` in `tests/content` against doc 12 and in `tests/unit` for the counting |
| An entry of the Discoveries page, or its picture | `DISCOVERIES` in `src/data/discoveries.ts` | Doc 13's names. T91 | `progress.test.ts` in `tests/content`: every thing an area can make found is listed |
| A pinned challenge's target | `CHALLENGE_TARGETS` in `src/data/challenges.ts` | Doc 12, "Pinning". T91 | `progress.test.ts` in `tests/content`: the target exists in an area |
| How the journal looks and moves | `src/scenes/JournalScene.ts`. What it shows in `src/core/journal/journal.ts` | Doc 12, "The journal". T91 | `journal.test.ts`. The browser test. The game with J, by eye |
| The small line | `SMALL_LINE` in `src/data/tuning.ts`, `SmallLines` in `src/core/progress/`, `smallLine` in `HudScene` | Doc 12, "What shows over play" | `smallLines.test.ts`. The browser test |
| How the music follows the mood: levels, filters, fades | `SOUND.mix` in `src/data/tuning.ts`. The rules in `src/core/audio/mix.ts` | Docs 05 and 10, "Sound". T93 | `sound.test.ts`. The browser test "fear dulls the music and relief brings it back" |
| Which sound answers which moment, and which has a caption | `src/core/audio/cues.ts`, heard by `src/systems/AudioDirector.ts`. A caption's words in doc 13 | Doc 05, "Sound effects" and "Captions". T93 | `sound.test.ts`. `sound.spec.ts` |
| A sound file | `public/assets/audio/<file>.ogg` and `<file>.m4a`, and the name it plays for in `SOUND_FILES` in `src/data/sounds.ts`. Only CC0 or CC BY (doc 05) | A row in `CREDITS.md` for each file, in the same commit | `sounds.test.ts`: both encodings, listed both ways, credited. `rules.test.ts` |
| An area's music and ambience | `AREA_SOUND` in `src/data/sounds.ts` | Doc 05, "Ambience" | `sounds.test.ts` |
| How the browser plays sound: buses, volumes, crossfades | `SOUND.bus` in `src/data/tuning.ts`. `src/platform/SoundOut.ts` | Doc 05, "Levels" | By ear |
| A setting: its row, its values, what Left and Right do | `SETTING_ROWS` and `changeSetting` in `src/core/save/settingsMenu.ts`. Its value and default in `SettingsV1` in `src/core/save/settings.ts`. Its words in doc 13 | Doc 03, "Settings". T95 | `settingsMenu.test.ts`. `finish.spec.ts` |
| How the settings screen looks and where it goes back to | `src/scenes/SettingsScene.ts` | Doc 03. T95 | `finish.spec.ts`. The controls tests in `play.spec.ts` |
| About: what it says and lists | `src/scenes/AboutScene.ts`. The sources from `SOURCES` in `src/data/journal.ts`. The credits from `CREDITS_SHOWN` in `src/data/credits.ts` | Doc 07, "About page". `CREDITS.md`. T96 | `credits.test.ts`: the credits shown are the rows of `CREDITS.md` |
| A font | `public/assets/fonts/`, with its licence text. `src/platform/fonts.ts` and `FONTS` in `src/config.ts` | A row in `CREDITS.md` and in `CREDITS_SHOWN`, in the same commit. Doc 04. T97 | `credits.test.ts`. `rules.test.ts`: every file under `public/` is credited |
| The way the coast runs | See "Turning the coast round" | | |

## What each check catches

| File | Fails when |
|------|------------|
| `tests/content/areas.test.ts` | A place asks for a picture with no painter. Two things share an id. A food is not on the list. A thing stands outside the place, or a shrimp or a food inside rock. The player starts inside something. An edge strip has an open end. An exit leads to a place that does not exist. An area file is not named like its area. Each of these on every area as written and mirrored. The mirror does not give an area back when turned twice. `AREAS` names an area with no file |
| `tests/content/art.test.ts` | A painter has no row in doc 14, or its row does not say "Built", or gives another size. A row says "Built" with no painter. A picture is over 2048 px or has a badly formed name. The atelier misses a painter. `fit.ts` names a picture that does not exist, or has numbers that cannot be right |
| `tests/content/docs.test.ts` | A doc is missing from README or CLAUDE.md. A link leads nowhere. A doc cites a decision that doc 09 does not have, or a source that no source table defines. A text in the game differs from doc 13 |
| `tests/content/locales.test.ts` | The two languages differ in keys or placeholders. A text is empty or has `!` |
| `tests/content/rules.test.ts` | The foods are not the six plant foods. A file names an organisation the author asked to keep out. A file in `public/` is not credited. Pictures or rules use `Math.random`. Code outside `src/platform` touches the keyboard or the storage. An asset path starts with `/`. Code asks for a text key that does not exist. A painter imports the engine |
| `eslint.config.js` | `src/core` imports Phaser, the engine-facing folders, `src/data` or `src/platform` |
| `tests/unit/*` | A rule of the game changed its result |
| `tests/e2e/*` | The game does not start, the shrimp does not move, the atelier does not draw. A root does not stop the shrimp. Hide does not tuck it in under a tangle. Explore mode does not open an area or start at the point given. Hunger does not rise while walking. A creature not yet met does not make the shrimp curious, or is not found by staying near it. F9 does not force each mood with `?debug`, or does anything without it. Sense shows no ribbon to a nearby food. Grazing does not lower hunger or find the food. Greeting another shrimp starts no bond. A snail does not crawl. A tail flip does not burst a school, or it does not regroup. The curious target gets no rim. Entering the clearing brings no bird. F10 calls a bird without `?debug`. A hidden shrimp is chased. A shrimp struck by the bird does not wake tucked in cover. Play does not open the Drift, or the larva does not steer. The larva's hunger rises on its yolk. A mote it touches is not eaten. Pause does not hold the Drift. Landfall does not open the mangrove. The Drift's name and first line do not show. F8 does not bring a molt that ends soft and grown. The journal does not open with its key or from the pause menu, or does not pin a challenge. A place found shows no small line. Closing the tab and coming back does not resume at the last rest. New life does not keep the carnet. The creek mouth after the molt does not lead into the lagoon. F7 does not move the day on with `?debug`. The plankton does not light up at night. Hide on open sand does not dig the shrimp in, or letting go does not bring it out. "Rest until dusk" is not offered when calm and dug in, or dusk does not wake the shrimp. F10 does not bring the fish to the lagoon, or it sees a shrimp dug in, or it never charges a shrimp that swims near it. The first dawn of chapter 2 brings no fish |

The organisation check holds the names as hashes, so that the test does not write them. Its comment says how they are made.

## When a check fails

- Read the message. It names the file and the thing.
- Fix the change, not the check.
- A check changes only when a decision changes. Change doc 09 first, then the check, in the same commit, and say so in the message.
- Never skip, switch off or loosen a test to get a green result.

## Turning the coast round

T24: the coast runs with the sea to the left and the land to the right. The author may turn it later. This is how, so that it is one setting and not a rewrite.

The pictures carry light painted from the upper left. Mirroring a picture would move its light to the upper right, and the whole world would look lit from two sides. So the turn mirrors **positions**, and leaves pictures as they are.

Built in step 3 (doc 15):

- `WORLD.mirror` in `src/data/tuning.ts`: `false` today.
- `mirrorArea(area)` in `src/data/areas/mirror.ts`. It returns a new area, with every `x` turned to `size.w - x`, every zone's `x` to `size.w - x - w`, left and right edge strips swapped, every `rotation` negated, every heading turned to `π - heading`, every current's `vx` negated.
- The game takes each area through `areaFor(id)` in `src/data/areas/index.ts`, which mirrors it when the setting is on. The atelier mirrors each view in `renderScene`, with the shrimp and the bird in it, so its named scenes still look at the same things. The data files are never rewritten.
- A point typed in an address, `?explore=…&at=x,y` in the game or `?view=x,y` in the atelier, is in the data file's numbers, and is mirrored with the rest (`pointFor`).
- A few pictures face a way: the hollow's opening, the sunken branch, the seed pod lying down. `faces: true` in `src/art/fit.ts`. When mirrored they are drawn flipped, and only they take light from the other side. Their manifest rows say which way they face.
- `areas.test.ts` runs every check on each area twice, as written and mirrored.

It was tried on 2026-11-16: with the setting on, the game and the atelier show the same mirrored mangrove.

Then the author turns the coast by changing one word, `false` to `true`, and looks at the atelier's scenes.

## What no check covers yet

| Gap | How to cover it later |
|-----|------------------------|
| Positions quoted in doc 11 against the data files | Make the data file the only home and have doc 11 point to it |
| Numbers quoted in docs 02 and 10 against `tuning.ts` | Step 4 put the feelings' numbers in `tuning.ts`. Doc 10 still quotes them in its own words. Next: give doc 10's tables the names in `tuning.ts`, and have a test compare them |
| How a picture looks | Only eyes, in the atelier |
| How the game feels | Only playing it |
| How the French reads | A French speaker reads it aloud before release (doc 07) |

## One setting the author can make

GitHub can refuse to merge a pull request whose checks failed. On the repository: Settings, Branches, add a rule for `main`, tick "Require status checks to pass before merging", and pick the check named `check`. Then a red pull request cannot publish the game by mistake.
