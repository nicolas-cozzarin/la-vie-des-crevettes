# 08. Roadmap

Status: draft 0.3, 2026-11-14. The author wants the game playable as soon as possible (D5), so it ships in stages. The first public link carries two chapters and every core system. Later releases add chapters.

Time figures are guesses for one person working with Claude Code. Treat them as rough.

## Releases

| Release | Contains | Guess |
|---------|----------|-------|
| **0.1 Mangrove** | Drift and Mangrove. Movement, feelings, food, sense, cover, other shrimp, bonds, the bird, molt, narration, journal, challenges, achievements, rebinding, French and English, counter | 2 to 3 weeks |
| **0.2 Lagoon** | Day and night, burrowing, the shoal, companions in full, turtle, pistol shrimp and goby, the hunting fish | 1 to 2 weeks |
| **0.3 To the sea** | Channel, The shadow, Open sea, spawning. The pond's wall in the channel and the journal page "Among humans" (D39) | 1 to 2 weeks |
| **1.0 Free life** | Generations, every challenge and achievement, sound and art pass, facts checked | 1 to 2 weeks |
| **1.1 Another life** | The pond life after the story: the tank, the bag, the pond, the draining (D39, doc 18) | 1 to 2 weeks |
| Later | Painted art, touch controls, gamepad, more languages | |

## Release 0.1, step by step

Progress on 2026-11-22: steps 0 to 2 are merged and published. The author played them and passed the gate at the end of step 2. The design is written down in depth in docs 10 to 16. Step 3, the area loader, is built: the mangrove and the lagoon load in the game, the shrimp hides under cover, and `?explore=<area>` opens any area for the author to walk (T57). Step 3 is merged. Step 4, the feelings, is built: hunger, fear, comfort, curiosity and company in `core`, the six moods in the body and on the screen, and F9 with `?debug` to force each mood (T60 to T65). Step 4 is merged. Step 5, food and scent, is built: grazing, regrowth, the first taste, and Sense with its ribbons (T66 to T70). Step 5 is merged. On 2026-11-22, step 6, other shrimp, is built: Nacre and two young shrimp live in the mangrove, Brise, Écume and four young in the lagoon, each with a temperament, feelings and a mind of its own. Greeting, calling, bonds and the alarm work. The crabs, snails and fish move, and the curious target gets its pale rim (T71 to T76). Step 6 is merged. Also on 2026-11-22, step 7, the bird, is built: the threat director in `core`, the wading bird's shadow, feet, ripples and strike ring, being cornered and waking in cover, and F10 with `?debug` to call a bird (T77 to T81). Also on 2026-11-22, step 8, a life with a shape, is built: the Drift from the dark to landfall, the narration and place names, the story steps of chapters 0 and 1, the molt, and "to be continued" at the creek mouth (T82 to T87). Title's Play starts in the Drift, and `?explore=drift` opens it. Step 9 is next.

Before a step, read [15-implementation-guide.md](15-implementation-guide.md): it lists, for each step below, the documents to read, the files to add, what they expose, the tests to write and what usually goes wrong.

| Step | Read |
|------|------|
| 3 The mangrove | 11, 14, 04 |
| 4 Feelings | 10, 14 (expressions) |
| 5 Food and scent | 10 (hunger, curiosity), 11 (foods, ribbons) |
| 6 Other shrimp | 10 (other shrimp), 12 (companion page), 13 (companion lines) |
| 7 The bird | 10 (threats) |
| 8 A life with a shape | 12 (story steps), 13, 11 (Drift) |
| 9 Journal, challenges, achievements | 12, 13 |
| 10 Sound | 05, 10 (sound per mood) |
| 11 Finish | 03, 13 (menus), 07 |

Commit and push at the end of every part of a step, not only at the end of the step. A step's work was once lost when a session ended before a push (doc 16).

Each step is one working session with Claude Code. Start a session with: "Read CLAUDE.md, then do step N of docs/08-roadmap.md." A step is finished when its checks pass and it is merged to `main`, which publishes it.

### Step 0. Project and pipeline
Create the Vite, TypeScript and Phaser 4 project with the folder layout in doc 06. Add lint, tests, both workflows. Show a blank blue scene with the title.

Checks: `npm run build` passes. The published address shows the scene. No console errors.

### Step 1. Input and rebinding
`ActionInput`, default bindings, storage, the Controls screen with rebinding, swap on conflict, reset and presets (doc 03).

Checks: unit tests for binding rules. In the browser, rebind Tail flip to another key, reload, and it is kept. Escape always opens pause.

### Step 2. The shrimp moves
`ShrimpRig` drawn by code, seen from above. Walk, swim, dart, tiring. Camera follows. An empty sandy area with a few rocks (`src/data/areas/sandFlat.ts`, a test area that the mangrove replaces in step 3).

Checks: turning is smooth. The dart travels tail first. The shadow separates when swimming.

**Gate: is it pleasant to move around for two minutes with nothing to do?** If not, tune here before anything else. Everything depends on this.

### Step 3. The mangrove as a place
`AreaLoader`, the mangrove data file, code-drawn mud, roots, leaves. Obstacles, cover that turns translucent, Hide. Murk and caustics.

Checks: the shrimp cannot pass through roots. Holding Hide under a tangle tucks it in.

### Step 4. Feelings
`FeelingsModel` and mood rules in `core`, with unit tests. `MoodPresenter` for the screen. Mood postures in the rig. A debug key that forces each mood.

Checks: unit tests for every mood rule. Each of the six moods looks different at a glance with sound off.

### Step 5. Food and scent
Food patches, grazing, regrowth, first-taste reaction. `ScentField` and the four ribbon kinds.

Checks: hunger rises and grazing lowers it. Holding Sense shows a ribbon that leads to food.

### Step 6. Other shrimp
`NpcShrimp` with the same feelings model, temperaments, behaviours. Greeting. Bonds and their stages. Nacre and two unnamed juveniles in the mangrove.

Checks: unit tests for bond gains and stages. A shy shrimp backs off at first and greets back once Familiar.

### Step 7. The bird
`ThreatDirector` in `core` with unit tests for stages and spacing. The wading bird: shadow, legs, ripple ring, strike. Cornered rule. Gentle mode.

Checks: a first-time player escapes about four times in five. Being struck at wakes the shrimp in cover with nothing lost. No threat within 60 s of the last.

### Step 8. A life with a shape
Drift chapter. Story steps for chapters 0 and 1. Molt. `Narrator`. Locale files in French and English. The move from Drift to Mangrove, and a "to be continued" ending at the lagoon's edge.

Checks: the two chapters play start to finish in both languages. The content test finds no missing keys.

### Step 9. Journal, challenges, achievements, saving
`Progress` in `core` with unit tests. The journal's five pages. Challenge lines on screen. Pinning. Save and load.

Checks: closing the tab mid-chapter and returning resumes at the last rest. Every chapter 0 and 1 challenge can be completed.

### Step 10. Sound
`AudioDirector`. Find and credit the tracks and effects listed for the first release in doc 05. Captions.

Checks: every sound file has a credits row and the content test passes. Fear dulls the music and relief brings it back.

### Step 11. Finish and publish
Title screen, pause, settings, About, credits, keyboard notice for touch devices, counter. Then playtest.

Checks: the browser test passes. Five people who have not seen the game play it while you watch without helping. Fix what stopped them. Announce the link.

## Release 0.2 Lagoon

- Lagoon area: sand, seagrass, rocks. Day and night with glowing plankton.
- Burrowing. "Rest until dusk".
- The shoal, and Brise and Écume joining Nacre. Favourite foods. Companion molts.
- Turtle. Pistol shrimp and goby.
- The hunting fish: circle, face, charge. The sidestep.
- Chapter 2 story steps, challenges, journal entries, music and ambience.

## Release 0.3 To the sea

- Channel area with current. The fish that follows.
- The shadow: hull, engine, net grid, crevices.
- Open sea area. Third molt. Spawning scene.
- Chapters 3 to 5 story steps, challenges, journal entries, sound.
- The pond's wall, gate, plume and the crowd behind the mesh in zone D of the channel (D39, doc 18, level 3).
- The journal page "Among humans", with the cards the author has said yes to.
- Losses in the shoal after the fish and the net (D42, doc 10).

## Release 1.0 Free life

- Generations: restart as the next shrimp with every area open.
- Exits between areas in both directions. Molts by time and feeding.
- Remaining achievements.
- Every "to check" in doc 07 confirmed or removed.
- Sound levels, loading times and frame rate against the budgets in doc 06.

## Release 1.1 Another life

- A second entry on the title screen once the story is finished, with its one line.
- The tank, the bag, the pond over four days and nights, the draining, the cut to white (doc 18, level 4).
- The conditions `crowded` and `cold`. Thin water everywhere before dawn.
- Its four places in the journal and its cards.
- Its own playtest: fewer than one player in ten stops before the end.

## Later

- Painted art replacing the code-drawn images.
- Touch controls and gamepad.
- More languages.
- A page for teachers, if schools take an interest.

## Playtests

After 0.1 and after each release, with three to five new people each time.

Watch for:
- Where they stop or look lost.
- Whether they notice the mood changes without being told.
- Whether they open the journal on their own.
- Whether the chases feel fair.

Ask afterwards, in this order:
1. What is a shrimp like?
2. What did your shrimp feel? When?
3. Was there anything you did not understand?
4. Did anything feel like a lesson?

## Risks

| Risk | What to do |
|------|------------|
| Moving the shrimp is not pleasant | The gate at step 2. Do not build on top of movement that feels wrong |
| Moods are not clear without bars | Step 4 check with sound off. Add the "name feelings" setting early |
| Phaser 4 habits from Phaser 3 examples | Read the v4 docs and types. Keep engine code thin |
| Code-drawn art looks cheap | Paper grain, soft edges and a tight palette carry a lot. Painted art comes later |
| Open-licence music does not fit | Start the search at step 2, not step 10 |
| Facts not checked in time | Cards marked "to check" stay out of a release until confirmed |
| Chases upset some players | Gentle mode from the first release |
| Scope grows | Each release must be playable and public before the next starts |
