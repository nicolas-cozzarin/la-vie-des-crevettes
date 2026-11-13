# 08. Roadmap

Status: draft 0.2, 2026-11-13. The author wants the game playable as soon as possible (D5), so it ships in stages. The first public link carries two chapters and every core system. Later releases add chapters.

Time figures are guesses for one person working with Claude Code. Treat them as rough.

## Releases

| Release | Contains | Guess |
|---------|----------|-------|
| **0.1 Mangrove** | Drift and Mangrove. Movement, feelings, food, sense, cover, other shrimp, bonds, the bird, molt, narration, journal, challenges, achievements, rebinding, French and English, counter | 2 to 3 weeks |
| **0.2 Lagoon** | Day and night, burrowing, the shoal, companions in full, turtle, pistol shrimp and goby, the hunting fish | 1 to 2 weeks |
| **0.3 To the sea** | Channel, The shadow, Open sea, spawning | 1 to 2 weeks |
| **1.0 Free life** | Generations, every challenge and achievement, sound and art pass, facts checked | 1 to 2 weeks |
| Later | Painted art, touch controls, gamepad, more languages | |

## Release 0.1, step by step

Each step is one working session with Claude Code. Start a session with: "Read CLAUDE.md, then do step N of docs/08-roadmap.md." A step is finished when its checks pass and it is merged to `main`, which publishes it.

### Step 0. Project and pipeline
Create the Vite, TypeScript and Phaser 4 project with the folder layout in doc 06. Add lint, tests, both workflows. Show a blank blue scene with the title.

Checks: `npm run build` passes. The published address shows the scene. No console errors.

### Step 1. Input and rebinding
`ActionInput`, default bindings, storage, the Controls screen with rebinding, swap on conflict, reset and presets (doc 03).

Checks: unit tests for binding rules. In the browser, rebind Tail flip to another key, reload, and it is kept. Escape always opens pause.

### Step 2. The shrimp moves
`ShrimpRig` drawn by code, seen from above. Walk, swim, dart, tiring. Camera follows. An empty sandy area with a few rocks.

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

## Release 1.0 Free life

- Generations: restart as the next shrimp with every area open.
- Exits between areas in both directions. Molts by time and feeding.
- Remaining achievements.
- Every "to check" in doc 07 confirmed or removed.
- Sound levels, loading times and frame rate against the budgets in doc 06.

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
