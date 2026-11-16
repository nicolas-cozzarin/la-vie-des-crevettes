# 16. History and reasons

Status: 2026-11-14. How the project got to where it is, and why the main choices were made. [09-decisions.md](09-decisions.md) says what is decided. This document keeps the reasons and the story, so that someone who joins later, person or assistant, does not reopen settled questions or repeat a mistake.

Add to it at the end of each working session: the date, what was done, what was learned. Keep it short.

## What the author asked for

The starting brief, 2026-11-13, in substance:

- A calm, cozy game for the web, easy to publish on GitHub Pages, with a chill look and open-licence chill music and sounds.
- You live the life of a shrimp: look for food, make links with other shrimp, explore, be afraid, enjoy things.
- The aim is that people who play come away with a good image of shrimp and a sense that they can feel.
- No shrimp and no animal product is ever consumed in the game. The author is vegan.
- A nicely illustrated world that is also fairly realistic.
- Easy to play. Space to jump. Keys that can be changed in settings.
- Design and planning first, written down in files, then building from those files.
- Many questions, so the author can challenge each choice and own it.

Everything since follows from these lines.

## Timeline

| Date | What happened |
|------|---------------|
| 2026-11-13 | Thirty-three questions were put to the author, each with a default. The author answered most of them in one message |
| 2026-11-13 | The view was confirmed as top-down, straight from above |
| 2026-11-13 | First set of documents: README, CLAUDE.md, CREDITS.md and docs 01 to 09 |
| 2026-11-13 | The first draft credited an organisation on the About page. The author corrected this: the game is a personal project, tied to no organisation, and names none anywhere. Every mention was removed and the rule was written into `CLAUDE.md` |
| 2026-11-13 | The author created the public repository. The documents were merged (pull request 1) |
| 2026-11-13 | Step 0: project, tests, workflows, a title screen in two languages. Merged and published (pull request 2) |
| 2026-11-13 | Steps 1 and 2: controls with rebinding, and a shrimp that walks, swims and darts on a patch of sand. Merged and published (pull request 3) |
| 2026-11-13 | Step 3 was begun: mangrove data, painters and a loader. The working session ended before any of it was pushed, and that work was lost |
| 2026-11-14 | The author played the published build and found that it works well |
| 2026-11-14 | The author asked for the design to be written down in far more depth, and for the art to be made before the remaining rules, so that later sessions can build from the documents and the pictures alone. Docs 10 to 16 and the first large set of painters come from that |
| 2026-11-14 | Docs 10 to 16 were merged (pull request 4). Seventeen questions were put to the author, each with a default |
| 2026-11-15 | The art for chapter 1: the atelier page, the shared painting tools, every mangrove picture, the fiddler crab, the snail, the small fish, the bird's parts, the effects, the mangrove's data file with the full area types, and ten composed scenes of the mangrove. The scenes showed what the sheets had not: root feet that read as stones, a murk that left a bare band, edge strips cut square at their ends, a leaf that hid Nacre, a snail under the grazing shrimp's mouth. Each was corrected (T43 to T46) |
| 2026-11-15 | The art was merged (pull request 5), though one browser check still expected ten scenes after four Drift scenes were added. The author answered nine questions, asked for a world as large as possible to explore after the story, for as much shrimp biology, behaviour and suffering as possible to be learned through play, true to the science and fun, and for guardrails so that things can be changed later without breaking others. Docs 17 (the long coast), 18 (learning by playing) and 19 (changing things safely) were written. Thirty references were looked up and thirteen read. The lagoon's plants, rocks, edges and light were painted. Content tests now tie the art list, the documents, the script and the hard rules to the code. The licence is MIT |
| 2026-11-16 | The guardrails were merged (pull request 6). The lagoon's animals and every accepted thing of D34 were painted. The lagoon's data file was written from doc 11, with its edges as T47, and nine composed scenes of it, by day, at dusk and at night. The scenes showed that a turtle drawn under the seagrass seems to swim beneath the blades, that fuzz drawn under its clump is hidden, that front flippers held straight out read as oars, and that a burrowed shrimp with its legs out reads as a spider. The fixes are T48 and the rules in doc 14 |
| 2026-11-16 | The lagoon was merged (pull request 7). The author chose level 4 of D39: the journal page "Among humans", the pond seen from the channel, and after the story a second life on a farm. The author then set the tone for the whole game (D41): realistic, calm to play but not a calm life, neither idyllic in the wild nor on a farm, not gore, never so hard that people stop. And chose that unnamed shrimp of the shoal can go missing off-screen (D42), which changed rule 2. The FAO sheet and a 2023 welfare review were read for the farm: stocking, bags, night oxygen, draining at low tide, iced water. The pond life was written out in doc 18 |
| 2026-11-16 | The tone of D41 was applied to the lagoon's art. Its water is green-grey and never quite clear (`lagoon.murk`). Its bed is dull and silty, with drifts of dead blades and shell grit (`lagoon.bed`). The caustics are soft and broken, half the seagrass is old and browning, the stones carry silt and turf, the turtle's shell is worn, and the beach has wrack and dirty foam. Learned: the murk goes under the time of day, or the night shows a pale green veil. |
| 2026-11-16 | The author chose to show human litter, growing toward the farm (D43). Seven pieces were painted (bottle, bag, rope, sandal, foam, sack, pipe) and placed at true size: two in the mangrove, eight in the lagoon. A test keeps food away from them and keeps them rarer in the mangrove than in the lagoon. Learned: at the mangrove's scale a 30 cm bag is 14 BL across, so the small pieces suit it best. |
| 2026-11-16 | The author asked to check the science online and to think about what wild animals live through. Sources were read again: the 2020 feeding study (the short antennae find food, the legs and mouthparts govern how much is eaten), the shore crab shelter study, two whiteleg shrimp studies on day and night (burial by day, swimming in the dark), a press release on the crayfish anxiety study, and a survey of shrimp viruses in wild animals near farms in Mexico. Doc 18 gained "A wild life is not an easy one" and T54, larvae that thin out in the Drift. Learned: one key of doc 07 named a paper by a title it does not have. Several pages refuse automated reading (publishers, ResearchGate), so a press release or an abstract is often all that can be read, and the docs now say which |
| 2026-11-16 | The author answered 24 questions in one message. New decisions: hunters of the long coast (D44, and later they may catch lives), three algae foods (D45), the sting if it is a fact (D46), spoken narration in both languages (D47), a lined pond for the pond life (T50), larvae that thin out in the Drift (T54), Écume's new mark (T55). Rule 2 now names the larvae and the sting. The FAO sheet was read again for intensive farms, which usually stand away from the tide, so the lined pond's place by the channel is marked to check. A 2024 study shows whiteleg males knowing a female by touch, which gives card 1 a sourced second half. Learned: a numbered list with defaults gets every question answered in one reply |
| 2026-11-16 | Step 3: the area loader. The mangrove and the lagoon load in the game as the atelier draws them: ground, patches, edge strips, roots, things, still animals, cover that fades, dapple and murk. The shrimp hides under a tangle by holding Hide. The author asked to walk the map while the story is built, so `?explore=<area>&at=x,y` opens any area (T57). The coast's mirror was built and tried both ways. The author answered six more questions: pellets in the pond life (still asked how), the author records the voice later with no AI voice (D47), the lives the hunters may later catch are other shrimp, not the player (D44). Learned: a headless browser can drop parts of pictures under Phaser's shader for many textures, so a hard edge in a screenshot is not always in the game; and hiding from 1.5 BL away takes over a second at walking pace, not the 0.6 s doc 10 asked (T58) |
| 2026-11-16 | Step 4: feelings. The five feelings, the conditions and the mood are rules in `core` with 44 unit tests, from the list at the end of doc 10. The rig takes each mood's expression and the conditions on top, and the screen shows the mood with colour, edges, zoom and a lean of the view. Curiosity pulls toward creatures and things not yet found, and finding one lifts comfort. F9 with `?debug` forces each mood (T63). Learned: a vignette drawn smaller than the screen shows its border as a hard line, so fear's edges are the full vignette twice; a headless browser runs the game at about 4 frames a second, so a screenshot can be seconds late and a fading word looks gone; and the antennae were 1.25 BL for every stage, where doc 14 asks 1.0 for the juvenile (T61) |
| 2026-11-16 | Step 5: food and scent. Food patches are rules in `core`: a graze takes hunger away a little on every step, so letting go early gives part of the meal, and an empty patch grows back in 90 s. Holding Interact by a patch walks the mouth onto it and eats; the mood turns content, and the first bite of a food finds it for the journal with a wiggle of the abdomen. Holding Sense stops the shrimp, dims the view and shows the ribbons: green to the nearest patch of each food, white to the nearest unknown things. A hungry shrimp sees faint green ribbons without Sense. Learned: Phaser 4's `Rope` bends the painted stroke pictures along a curve well; a ribbon only a few pixels long shows as a knot, so a source right by the shrimp gets none (T67) |

## Why the main choices were made

Each line gives the reason behind a decision in doc 09.

**Whiteleg shrimp (D6).** It is the species most people have eaten, so the empathy lands on the right animal. Its real life is a journey from open sea to mangrove and back, which hands the game its chapters.

**Top-down view (D16).** The first proposal was a side view. The author asked for a view "from behind, like top down". Of the options, straight top-down won because one drawing of the shrimp can turn freely in every direction, which suits a shrimp drawn by code, and because a bird, a hull and a net all read naturally as shadows crossing the bed.

**No closing card, almost no text (D3).** The first proposal had one closing card. The author removed it: play should carry the message, and facts should wait in an optional journal for those who want them.

**One short chapter about fishing (D4).** The first proposal left fishing out of play. The author wanted a brief presence: an engine, a net's shadow, an escape, and nothing explained.

**No card admitting that real shrimp eat animals (D8).** The first proposal had one honest line in the journal. The author did not want it. The balancing rule is that the game never claims shrimp eat only plants. It shows plant foods and is silent on the rest.

**Predators that chase, a player who usually gets away (D9, D10).** The author wanted real chases, because fear and escape show that shrimp are afraid and act on it, and wanted the player to get away "often", not always. Being cornered costs nothing: the player wakes in shelter, shaken.

**Challenges and an achievements page (D18).** Added by the author, so that players have things to do and a place to see what they have done. They are worded as things a shrimp does.

**The life continues after the open sea (D11).** The author wanted to keep exploring after the ending. Adult whiteleg shrimp stay at sea, so the proposal is to continue as the next generation with every area open (D11a, still proposed).

**Companions without speech (D13a, still open).** The author was unsure. The recommendation is no text speech: it would turn them into cartoon people and work against "only behaviours real shrimp show".

**Drawn by code (D24), no AI-generated music (D26), free licences only (D27).** The author's choices. Drawing by code keeps every picture original, small to download and easy to change, and a painted file can replace any of them later with no change to the game.

**Phaser, TypeScript, Vite (D30).** Builds to plain static files, includes everything a 2D game needs, and is worked on as text, which suits building with an assistant.

**A personal project (D5).** No organisation is named in the game, the code, the documents or the commit messages. The author's reading on shrimp welfare informs the journal's facts, which are cited to the studies themselves.

## Choices made while building

| Choice | Why |
|--------|-----|
| The view is enlarged 1.4 times (T19) | At 110 px the antennae and posture could not be read, and they carry the feelings |
| Movement and collision live in `src/core/`, not in the engine's physics (T20) | They can be unit-tested and do not depend on the engine |
| The game uses the true time between frames (T22) | The engine's smoothing played the game in slow motion on slow machines |
| Keys are stored by position, and named by the letters on the player's own keyboard (T11, T23) | WASD works on a French keyboard with no setup |
| The shrimp is built from parts and moved by code | One rig serves every shrimp and every stage, and reacts to speed and turning with no drawn frames |

## What was decided on 2026-11-14

All proposed, for the author to confirm. Listed in doc 09 as T24 onward.

- The five places lie along one coast, sea to the left and land to the right. The larva drifts in one way and the adult goes back the other.
- The shrimp stays about the same size on screen. The world is drawn smaller as it grows.
- The mood "content" ranks above "hungry", so that eating feels good at once.
- A "wary" state follows every fright.
- A predator notices movement. Hiding, keeping still or getting far away each end a visit without a chase.
- A discovery needs the player to come close, not merely to have the thing on screen.
- Spawning has no button.
- The bond with a companion is shown as four small stamps and lines of text, never as a bar.
- Narration lines have two weights, so the 20 s gap is kept without losing the story.

## Things that cost time

- **Work that was not pushed.** A whole step was lost when a session ended. Commit and push at the end of every part of a step, not only at the end of the step.
- **The engine's frame smoothing.** It hid behind "the game feels slow on this machine".
- **Judging feel in a headless browser.** It runs at about 7 frames a second. Screenshots show the look. Only a person playing can judge the feel.
- **Phaser 3 habits.** Phaser 4 changed effects, masks and tint. Its own guides are in `node_modules/phaser/skills/`.
- **Judging a picture alone.** A root foot looked right on its sheet and read as a stone in the scene. Compose the scene early, from the real data, and look at that.
- **Painted light and turning.** A picture with light painted in cannot be turned far. Paint several and turn each a little.
- **A session cut short twice.** Once by its end and once by a usage limit. Both times the work that had been pushed was safe.
- **A wrong credit.** The organisation mentioned in the first draft had to be removed from twelve files. The rule is now at the top of `CLAUDE.md`.
- **A failing check merged.** A pull request was merged with one red check, so `main` carried a wrong test until the next one. Doc 19 says how to make GitHub refuse such a merge.
- **Facts from memory.** Two design ideas were the wrong way round until the papers were read: shallow water is poorest in oxygen at dawn, not at midday, and mangrove loss figures had been swapped. Read the source before writing the rule.
- **A document that drifts from the code.** The art list in doc 14 still said "to paint" for pictures already built. A test now reads it.

## What is still open

See the end of doc 09. D39 was answered on 2026-11-16 (level 4), with D41 on tone and D42 on losses. What the design now waits on is the author's yes to the pond life's shape and text (T49 to T52) and to the new journal cards.
