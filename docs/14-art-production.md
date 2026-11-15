# 14. Art production

Status: draft 0.2, 2026-11-15. How the pictures are made, named, sized and checked, and which exist. [04-art-direction.md](04-art-direction.md) says what the game should look like. [11-world-catalogue.md](11-world-catalogue.md) says what each thing looks like. This document is for whoever paints one, in code or by hand.

## How art is made in this project

Decision D24: the first version is drawn by code. Decision D26a, proposed: no AI-generated images. So a picture here is a **painter**: a small function that draws on a 2D canvas once, when the image is first needed.

```
ensureTexture(scene, 'mangrove.root.a')
        |
        +-- a file with that name was loaded?  -> use it
        +-- otherwise: find the painter, make a canvas, paint, keep it under that name
```

| File | Holds |
|------|-------|
| `src/art/TextureFactory.ts` | `ensureTexture`, for the game |
| `src/art/painters/index.ts` | `PAINTERS`: every painter by image name. `PAINTER_GROUPS`: the same, by family |
| `src/art/painters/*.ts` | One file per family: `shrimp`, `world`, `drift`, `mangrove`, `creatures`, `effects`. `lagoon` and `icons` to come |
| `src/art/paint.ts` | Shared helpers: colours, washes, `blob`, `speckle`, `patches`, `glow`, `softFill`, `band` for a root or a branch, `traceLeaf`, `wrapped` for tiles, `onLayer` for a part that must fade |
| `src/art/fit.ts` | `imageFit(name)`: how the solid part of a picture sits inside the picture. See "From data to picture" |
| `src/art/expressions.ts` | `RigExpression`, `RigLook`, and `MOOD_EXPRESSIONS`, the table below as code |
| `src/art/shrimpParts.ts` | The shrimp's proportions and part sizes |
| `src/entities/ShrimpRig.ts` | Puts the shrimp's parts together and moves them |
| `atelier.html`, `src/atelier/` | A page that shows every image. See "The atelier" |

Painters never import Phaser. They take a canvas context, a width and a height. That is why they can be shown on a plain web page and why a painted file can replace any of them.

A painter uses `seededRandom(n)` from `src/core/random.ts`, never `Math.random`, so the same picture comes out every time.

## The hand

Everything should look made by one person with one box of paints. The recipe that the shrimp, the sand and the rocks already follow:

1. **A wash, not a fill.** The base is a gradient between two or three close tones, never one flat colour.
2. **Light from the upper left.** Shadows fall down and to the right (`SHADOW.directionX 0.6`, `directionY 0.8` in tuning). Shapes are a little lighter up-left and darker down-right.
3. **A soft edge.** Fill the shape with `shadowBlur` 4 to 8 in a darker tone of itself. This stands in for the bleed of watercolour.
4. **Uneven inside.** Clip to the shape, then lay 10 to 20 faint round patches, lighter and darker, as on wet paper.
5. **Pigment.** A scatter of fine dots with `speckle`, dark and light.
6. **A thin line.** The outline is 1.2 to 2 px, in a darker tone of the fill at 40 to 55%. Never black. Never a hard vector edge.
7. **Wobble.** Outlines are built from points with a little random offset (`blob`, `tracePath`), so nothing is a perfect circle.
8. **Few colours.** Three or four per object, taken from the area's palette.
9. **Paper.** The grain overlay `fx.grain` at 7% lies over the whole picture, so painters do not add their own.

What to avoid: pure black, pure white, saturated primaries, outlines of even weight, perfect symmetry except in the shrimp's body, gradients that look like plastic, drop shadows baked into the image.

### The shrimp, always

- Translucent grey-white to pale blue-grey. The colours are at the top of `src/art/painters/shrimp.ts`.
- Never pink, orange or red. Never curled into a C, except for an instant in a tail flip.
- No eyebrows, mouth, eyelids, pupils, highlights in the eyes or enlarged eyes.
- Other small crustaceans in the game follow the same rule: living colours, real proportions.

## Conventions

| Matter | Rule |
|--------|------|
| Names | `area.thing.variant`: `mangrove.root.a`. Foods: `food.kind`. Animals in parts: `crab.claw`. Effects: `fx.name`. Light: `light.name`. Scent: `scent.kind`. Interface: `ui.name`. Icons: `icon.set.id` |
| Direction | Anything with a front points right, along +x, like the shrimp's parts. The game rotates it |
| Origin | Centre, unless the manifest says otherwise. Parts that swing have their origin at the joint |
| Margin | Leave 8 to 12 px clear on every side for the soft edge |
| Size | Paint at about the size it shows on a 1080p screen: design pixels times 1.4. Creatures and the shrimp at up to twice that |
| Limit | No image wider or taller than 2048 px |
| Tiles | Ground and light tiles are 1024 by 1024 and repeat in both directions. Draw anything near an edge again on the far side (`wrapped` in `paint.ts`) |
| Edge strips | 1024 by 420, repeating sideways, with the solid part at the top of the image and open bed below. The game turns the strip to face into the area |
| Turning | Light is painted in, from the upper left. So the area data turns a picture by half a radian at most. For another direction, paint another picture of the same thing: the six roots are the model. Cover made of many crossing parts may be turned freely |
| Fit | A picture that stands for something solid has a row in `src/art/fit.ts`, so the game knows which part of the picture stops the shrimp |
| Shadows | Not in the image. The game puts `shadow.soft` under things. Only a thin contact shade at the foot of an object is painted in |
| Cover | Painted to be faded: it must still read at 40% opacity |
| States | One image per thing. The game fades, tints or scales it. A second image only when the shape changes |
| Tint | Paint in the object's true colours. The area's water colour, the time of day and the mood are laid over the whole screen by the game |

## Layers

From the bed up. The numbers are `DEPTH` in `src/config.ts`.

| Depth | Layer | Holds |
|-------|-------|-------|
| 0 | Bed | Ground tiles, ground patches, scatter |
| 10 | Ground objects | In this order: food patches, landmarks, burrows, then edge strips, then obstacles. An obstacle may stand over the end of an edge strip |
| 20 | Bed animals | Shrimp, crabs, snails. Their shadows just beneath them |
| 30 | Mid-water | Fish, the turtle, drifting things. Their shadows on the bed, offset |
| 40 | Cover | Tangles, floating leaves, overhangs, seagrass tips |
| 50 | Surface light | Dapple, caustics, moon bands, ripples, the bird's shadow, the hull and the grid |
| 60 | Mood | Murk, edge darkening, tints. The bird's feet and shadow lie under the murk |
| 100 | Interface | Narration, prompts, small lines |

Height is told two ways: the shadow sits further from its owner, and the owner is drawn 5% larger for each unit of height.

## Palettes

Area colours are in doc 04. Colours added since, with where they are used:

| Colour | Hex | Used for |
|--------|-----|----------|
| Food ribbon | `#7BC47F` | `scent.food` |
| Shrimp ribbon | `#E8B04A` | `scent.shrimp` |
| Danger ribbon | `#8E6BBF` | `scent.danger` |
| Unknown ribbon | `#F4F1E6` | `scent.unknown` |
| Golden film | `#C9A24B` | `food.sandFilm` |
| Egret foot | `#D9B13B` | `bird.foot` |
| Barnacle | `#B9B4A6` | Barnacles |
| Stamp washes | green-grey `#8FA58A`, amber `#D9A441`, green `#7BA65A`, violet-grey `#8C84A8`, blue `#6F95B8` | Achievement stamps, by group |

## The shrimp rig

One rig draws the player, every companion and every stage.

### Parts

| Image | What | Origin |
|-------|------|--------|
| `shrimp.carapace` | Head and carapace with the rostrum | Rear edge, where the abdomen begins |
| `shrimp.segment` | One abdominal segment, scaled six times | Front edge |
| `shrimp.telson` | Middle of the tail fan | Front |
| `shrimp.uropod` | One blade of the tail fan, used four times | Front |
| `shrimp.scale` | The flat blade beside each eye | Base |
| `shrimp.eye` | A stalked eye | Base of the stalk |
| Lines | Antennae, antennules, legs, swimmerets | Drawn each frame by the rig |

Proportions are in `SHRIMP` and `PARTS` in `src/art/shrimpParts.ts`, in body lengths.

### What the rig takes

Today: a pose (position, heading, motion mode, speed, height). To come: an **expression** and a **look**.

```ts
/** How the body holds itself. The rig eases toward these numbers. */
export interface RigExpression {
  antennaAngle: number;     // radians from straight ahead, at the base
  antennaCurl: number;      // radians added at each link toward the tip
  antennaSweep: number;     // radians, size of the slow sweep
  antennaSweepRate: number; // radians per second
  antennaStiff: number;     // 0 loose and trailing, 1 held rigid
  aim: number;              // 0 to 1: how far the antennae turn toward the target point
  antennuleRate: number;    // radians per second of the flick
  antennuleFlick: number;   // radians, size of the flick
  fan: number | null;       // tail fan spread, 0 shut to 1 wide. null: movement decides
  fanSway: number;          // radians, side to side
  tuck: number;             // 0 to 1: abdomen drawn in, body up to 8% shorter
  flat: number;             // 0 to 1: pressed to the bed, shadow tight, legs in
  lean: number;             // BL: the carapace leans toward the target point
  tremble: number;          // px, a fine fast shake
  legReach: number;         // multiplier on how far the legs reach
  rock: number;             // radians, a slow rocking of the body
}

/** What does not change from moment to moment. */
export interface RigLook {
  bodyLengthPx: number;
  antennaLength: number;        // BL. Juvenile 1.0, sub-adult 1.25, adult 1.5
  leftAntennaFactor: number;    // 1, or 0.67 for Brise
  fanPale: number;              // 0, or 0.8 for Nacre: how far the tail fan is washed toward white
  gutAlpha: number;             // darker for Écume
  eyeScale: number;             // 1.15 for a juvenile, else 1
  alpha: number;                // 1, or 0.85 while soft
}
```

The code is in `src/art/expressions.ts`. A tint that follows the ground (T36) is not in `RigLook` yet: add `groundTint` when step 7 builds it.

### Expressions by mood

| Channel | Calm | Hungry | Content | Curious | Social | Afraid |
|---------|------|--------|---------|---------|--------|--------|
| `antennaAngle` | 0.50 | 0.34 | 0.62 | 0.12 | 0.30 | 2.55 |
| `antennaCurl` | 0.115 | 0.10 | 0.14 | 0.02 | 0.06 | 0.03 |
| `antennaSweep` | 0.14 | 0.10 | 0.08 | 0.03 | 0.06 | 0 |
| `antennaSweepRate` | 0.8 | 3.2 | 0.5 | 1.0 | 1.6 | 0 |
| `antennaStiff` | 0.3 | 0.5 | 0.15 | 0.8 | 0.6 | 1.0 |
| `aim` | 0 | 0 | 0 | 1 | 0.8 | 0 |
| `antennuleRate` | 5.2 | 16 | 3.5 | 9 | 7 | 0 |
| `antennuleFlick` | 0.05 | 0.09 | 0.04 | 0.06 | 0.06 | 0 |
| `fan` | null | 0.33 | 0.5 | 0.5 | 0.5 | 0 |
| `fanSway` | 0 | 0 | 0.18 | 0 | 0.06 | 0 |
| `tuck` | 0 | 0.5 | 0 | 0 | 0 | 0.2 |
| `flat` | 0 | 0 | 0 | 0 | 0 | 1 |
| `lean` | 0 | 0 | 0 | 0.05 | 0.02 | 0 |
| `tremble` | 0 | 0 | 0 | 0 | 0 | 0.7 |
| `legReach` | 1 | 1 | 1 | 1.05 | 1 | 0.6 |
| `rock` | 0 | 0 | 0.03 | 0 | 0 | 0 |

The calm column is what the rig does today with its fixed numbers. The atelier's sheet "The six moods" draws all six, held still, from this table. An afraid `antennaAngle` of 2.55 lays the antennae back along the body.

The target point is the curiosity target when curious, the nearest shrimp when social, the nearest food when very hungry.

### Conditions change the expression

Applied after the mood's values.

| Condition | Change |
|-----------|--------|
| wary | `antennaAngle` + 0.10, `antennaStiff` + 0.2, `antennaSweepRate` times 1.5 |
| frozen | Every rate to 0. `flat` 1. `tremble` 0 |
| tired | `fan` 0.1. Swimmeret beat halved |
| soft | `alpha` 0.85. Every rate times 0.6. `antennaAngle` + 0.15, `antennaCurl` + 0.04 |
| veryHungry | `aim` 0.5 toward the nearest food |
| inCurrent | Antennae, legs and fan lean 0.44 radians downstream |
| startled | For 0.35 s: the whole rig drawn 0.15 BL back along the heading, `antennaAngle` 2.2, then back |

### Small animations the rig owns

| Animation | Length | What moves |
|-----------|--------|-----------|
| Groom | 2.5 s per antenna | One antenna bends in until its middle passes between the front legs, which close on it and slide along it. Then the other |
| Graze | Loop of 0.5 s | The two front leg pairs reach down and in, one after the other. The head dips 0.02 BL |
| Greet | 0.9 s | Both antennae swing forward and tap the other's twice |
| Call | Loop of 1.2 s | Antennae wave in wide arcs, out of time with each other |
| First-taste wiggle | 0.8 s | The abdomen waves side to side twice. The tail fan flares |
| Premolt scratch | 0.6 s, every 3 to 5 s | A rear leg reaches up over the carapace and rubs |
| Shake | 0.5 s | After a threat leaves: one quick shiver down the body, head to tail |
| Molt | 6 s | The body arches. A second, pale copy of every part stays behind while the shrimp backs out of it |

The pale copy left by a molt is the same rig drawn once more at 35% opacity with no gut line. It is also the image of `thing.shedShell`.

### Life stages

| Stage | Length px | Antennae | Eyes | Other |
|-------|-----------|----------|------|-------|
| Larva | 44 to 70 | Not the rig. Three single images | | |
| Juvenile | 110 | 1.0 BL | 1.15 times | |
| Sub-adult | 124, then 140 | 1.25 BL | 1 | Fuller tail fan: uropods 1.05 times |
| Adult | 158 | 1.5 BL | 1 | Uropods 1.1 times. Antennae trail far behind when swimming |

## Animals made of parts

Simple rigs, each a few images moved by code. No drawn frames.

| Animal | Parts | Moves |
|--------|-------|-------|
| Fiddler crab | `crab.body` with legs and small claw, `crab.claw`, `crab.burrow` beside it | The claw swings out and back at its joint, `CRAB_CLAW_JOINT` in `painters/creatures.ts`. The body shuffles sideways |
| Snail | `snail.shell`, two feeler lines | The feelers shorten when alarmed |
| Hermit crab | `snail.shell`, `hermit.legs` | The legs slide in under the shell |
| Barnacle | `barnacle`, a feathered line | The line sweeps out and in |
| Small fish | `fish.small` | Whole image, with a slight side-to-side turn |
| Hunting fish | `fish.hunter.body`, `fish.hunter.tail` | The tail swings at its joint, slow or fast |
| Turtle | `turtle.shell`, `turtle.head`, `turtle.flipper.front` twice, `turtle.flipper.rear` twice | Flippers swing at the shoulder. The head turns and dips |
| Goby | `goby` | Tail flick |
| Pistol shrimp | `pistol.body`, `pistol.claw` | Slides out of the burrow pushing sand, slides back |
| Wading bird | `bird.shadow.body`, `bird.shadow.head`, `bird.foot` twice, `bird.beak`, `bird.splash` | See doc 10. The neck's shadow turns about `BIRD_NECK_START` in `painters/creatures.ts` |

## The manifest

Every image name the game will ask for. **Status**: built, or to paint. **Added** marks things the author accepted on 2026-11-15 (D34). Sizes are in pixels of the image.

This table is the checklist for the art. Update it in the same commit as a painter.

### Shared

| Name | Size | Status |
|------|------|--------|
| `shrimp.carapace`, `shrimp.segment`, `shrimp.telson`, `shrimp.uropod`, `shrimp.scale`, `shrimp.eye` | from `shrimpParts.ts` | Built |
| `shadow.soft` | 128 | Built |
| `fx.vignette` | 480 by 270 | Built |
| `fx.grain` | 256, tile | Built |
| `ground.sand` | 1024, tile | Built |
| `rock.a`, `rock.b`, `rock.c` | 256 | Built |
| `rock.slab` | 420 by 130 | Built |
| `pebble` | 48 | Built |
| `fx.speck` | 16 | Built |
| `fx.ripple` | 256 | Built |
| `fx.rim` | made in the game from the target's own image | |
| `scent.food`, `scent.danger`, `scent.unknown` | 512 by 64 | Built. Each has its own shape as well as its own colour: a smooth wave, a zigzag, a line of loops |
| `scent.dot` | 48 | Built |

### Drift

| Name | Size | Status |
|------|------|--------|
| `larva.early`, `larva.mid`, `larva.late` | 200 by 120 | Built. Each faces right. The body is about half the image long, so a larva is drawn twice as wide as its length |
| `food.microalgae.a`, `.b`, `.c` | 64 | Built: a bead, a chain of beads, a disc |
| `drift.copepod` | 96 | To paint. New |
| `drift.bell` | 256 | To paint. New |
| `drift.shaft` | 300 by 900 | Built. Laid on with the SCREEN blend |
| `drift.rootShadow` | 640 by 200 | Built |

### Mangrove

| Name | Size | Status |
|------|------|--------|
| `mangrove.mud` | 1024, tile | Built |
| `mangrove.sandmud` | 1024, tile | Built |
| `mangrove.root.a` to `.f` | 320 | Built. Six limbs, each coming down a different way |
| `mangrove.root.barnacled` | 320 | To paint. New |
| `mangrove.clump` | 640 | Built |
| `mangrove.wall` | 1024 by 420, repeats sideways | Built |
| `mangrove.bank` | 1024 by 420, repeats sideways | Built |
| `mangrove.tangle.a`, `.b` | 900 | Built |
| `mangrove.hollow` | 1100 | Built. The opening faces right |
| `mangrove.leaf.floating.a`, `.b` | 560 by 320 | Built |
| `mangrove.litter.a`, `.b`, `.c` | 128 | Built. `.c`, the bark, is the weakest and could be painted again |
| `food.mangroveLeaf` | 520 by 300 | Built |
| `food.algaeFilm` | 320 | Built |
| `thing.seedPod.standing` | 96 | Built |
| `thing.seedPod.lying` | 420 by 96 | Built |
| `thing.sunkenBranch` | 1800 by 520 | Built. The left end is sunk, the right end is lifted |
| `thing.breathingRoot` | 64 | To paint. New |
| `light.dapple` | 1024, tile | Built |
| `mangrove.murk` | 512 by 288 | Built. Drawn at twice the size of the view |
| `crab.body` | 220 by 190 | Built |
| `crab.claw` | 170 by 90 | Built. Joint at (16, 45) |
| `crab.burrow` | 128 | Built |
| `thing.crabPellets` | 160 | To paint. New |
| `snail.shell` | 160 by 90 | Built |
| `hermit.legs` | 130 by 110 | To paint. New |
| `barnacle` | 48 | To paint. New |
| `fish.small` | 110 by 44 | Built |
| `bird.shadow.body` | 1024 by 720 | Built |
| `bird.shadow.head` | 470 by 220 | Built |
| `bird.foot` | 440 | Built |
| `bird.beak` | 200 by 70 | Built |
| `bird.splash` | 320 | Built |

### Lagoon

| Name | Size | Status |
|------|------|--------|
| `lagoon.seagrass.a`, `.b`, `.c` | 600 | To paint |
| `food.seagrassFuzz` | 600 | To paint |
| `food.sandFilm` | 380 | Built |
| `rock.overhang` | 560 by 400 | To paint |
| `thing.sandVolcano` | 110 | To paint. New |
| `fx.glow` | 32 | To paint |
| `light.caustics` | 1024, tile | To paint |
| `turtle.shell` | 860 by 720 | To paint |
| `turtle.head` | 220 by 180 | To paint |
| `turtle.flipper.front` | 480 by 210 | To paint |
| `turtle.flipper.rear` | 250 by 170 | To paint |
| `fish.hunter.body` | 600 by 170 | To paint |
| `fish.hunter.tail` | 170 by 170 | To paint |
| `goby` | 130 by 60 | To paint |
| `pistol.body` | 100 by 60 | To paint |
| `pistol.claw` | 70 by 44 | To paint |
| `burrow.mouth` | 140 | To paint |

### Channel, shadow, open sea

| Name | Size | Status |
|------|------|--------|
| `channel.bed` | 1024, tile | To paint |
| `channel.wall` | 1024 by 420, repeats sideways | To paint |
| `channel.boulder.a`, `.b` | 640 | To paint |
| `channel.crevice` | 340 by 150 | To paint |
| `food.seaweed` | 320 | To paint |
| `light.moon` | 1024, tile | To paint |
| `shadow.hull` | 1024 by 280, shown four times larger | To paint |
| `shadow.grid` | 512, tile | To paint |
| `fx.silt` | 256 | To paint |
| `sea.ledge` | 760 by 420 | To paint |
| `fx.egg` | 16 | To paint |

### Interface and icons

| Name | Size | Status |
|------|------|--------|
| `ui.paper` | 1024, tile | To paint |
| `ui.keycap` | 96 | To paint |
| `icon.tab.discoveries`, `.companions`, `.feel`, `.challenges`, `.achievements` | 64 | To paint |
| `icon.type.taste`, `.reach`, `.watch`, `.escape`, `.meet`, `.find` | 64 | To paint |
| `icon.bond.stranger`, `.familiar`, `.companion`, `.close` | 80 | To paint |
| `icon.ach.<id>`, 24 of them | 192 | To paint |

## The atelier

A page that shows the art without starting the game. It is how the author looks at pictures and how a painter is checked.

- Address: `atelier.html`, beside the game. Locally, `npm run dev` then `/la-vie-des-crevettes/atelier.html`.
- It imports painters directly and never starts Phaser.
- It is not linked from the game and holds no text for players.

| Section | Address | Shows |
|---------|---------|-------|
| Drift scenes | `?show=driftscenes` | Four views of chapter 0, composed by hand because the Drift has no data file yet: the dark, the green, the shafts, the haze. Each shows the larva in the shape it has there |
| Mangrove scenes | `?show=scenes` | Ten views drawn from `src/data/areas/mangrove.ts`, each the size of the game's screen: arriving, grazing, hidden under a tangle, the bird, meeting Nacre, the crabs, the leaf bed, the hollow, the sunken branch, and a map of the whole area with its zones |
| The six moods | `?show=moods` | The shrimp held still in each posture of the table above |
| Telling shrimp apart | `?show=companions` | The player, Brise, Nacre and Écume side by side |
| Sheets | `?show=shrimp`, `world`, `drift`, `mangrove`, `creatures`, `effects` | Every painter of a family on the ground colour of its area, with its name and size. Tiles are shown repeated. Cover is shown a second time at 40% |
| Any place | `?view=x,y` | One screen of the mangrove centred as near that point as the game's camera could be |

The scenes are pictures of how an area should look. They are not the game: nothing moves. But `src/atelier/scene.ts` draws an area from its data by the rules of the next section, and the game's area loader must follow the same rules, so that the game looks like the scenes.

`src/atelier/stillShrimp.ts` draws a shrimp at rest from a `RigExpression` and a `RigLook`. It copies the attachment numbers of `ShrimpRig`. If one changes, change the other.

## From data to picture

How the numbers in an area file become pictures on the screen. The reference is `src/atelier/scene.ts`.

| Thing | Rule |
|-------|------|
| Ground | The tile at 1 / 1.4 of its image size, repeated |
| Ground patch | The same, kept inside an oval that fills the patch's zone and fades over `feather` at its rim |
| Scatter | For each item, six numbers from `seededRandom(seed)` in this order: x, y, size, squash, turn, one spare. Squash is 0.7 to 1 |
| Food | The image `food.<kind>`, `size` wide, centred |
| Landmark | Its image, `width` wide, centred, on the bed or above the shrimp by `layer` |
| Round obstacle | Its image, `2r / fill` wide, centred, with `fill` from `fit.ts`. The soft skirt falls outside the solid circle. `shadow.soft` 2.5 r wide lies under it, 0.2 r right and 0.26 r down |
| Edge strip | Scale = `depth / (solid × image height)`. The tile repeats along the edge from the edge's start, clipped to `from` and `to`, with the top of the image on the outside. An end inside the area is cut square and needs an obstacle over it |
| Cover | Its image, `width` wide if given, else `2r / fill`. At 40% while the player is under it. A leaf throws `shadow.soft` on the bed, offset 0.3 BL right and 0.4 BL down |
| Fiddler crab | `crab.body` 1.1 BL high, turned to its heading. `crab.burrow` 0.62 BL wide, 0.75 BL to its left. `crab.claw` pinned at `CRAB_CLAW_JOINT` |
| Snail | `snail.shell` 0.8 BL wide, with two feeler lines in front |
| Small fish | `count` images 0.7 BL wide within an oval 5 BL long and 3 BL across, all turned to the heading within 0.15 radians. Each shadow lies 0.2 BL right and 0.27 BL down |
| Dapple | The tile at 1 / 1.4, laid over the bed, the things and the cover with the SCREEN blend, at `dappleStrength` |
| Bird | Two `bird.foot` 3.6 BL wide, 2.6 BL apart, each with `fx.ripple`. `bird.shadow.body` 9 BL wide. `bird.shadow.head` 4.25 BL wide, pinned 2.2 BL ahead of the body and turned toward the strike point. `fx.ripple` 2 BL wide at the strike point |
| Murk | The image centred on the shrimp, at twice the size of the view |
| Over everything | `fx.vignette` stretched to the screen, then `fx.grain` at 7% |

## Replacing a painter with a painted file

1. Paint the picture at the size in the manifest, facing right, with the same origin.
2. Save it as `public/assets/images/<name>.webp`, or `.png` if it needs a clean transparent edge.
3. Add the name to the list of files loaded in `Preload`.
4. If someone else made it, add a row to `CREDITS.md` in the same commit. The content test fails without it.
5. Leave the painter in place. It is the fallback, and the atelier still shows it.

No other code changes.

## Checks before a picture is done

- Seen in the atelier on its area's ground, at the size it will have in the game.
- Seen at 40% opacity if it is cover.
- Reads without colour: turn the screenshot grey and look again.
- Light from the upper left. No shadow painted in.
- Seen in a scene, beside the things it will stand among. A picture that reads well alone can read as something else there: the first root feet read as stones.
- For any crustacean: no pink, no orange body, no curl, no face.
- The manifest row is updated.
- `npm run lint` and `npm run build` pass.
