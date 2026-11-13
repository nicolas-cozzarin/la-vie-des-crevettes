# 04. Art direction

Status: draft 0.2, 2026-11-13. Top-down view (D16). Style and face confirmed by the author (D22, D23). First version uses a code-drawn shrimp and open-licence assets (D24). The author will send more art information.

## The look

A watercolour and gouache illustration seen from straight above, as if looking down through clear or tea-coloured water onto the bed. Soft edges, visible paper grain, few colours per area, slow movement. The animals are drawn as they are. Nothing is cute by exaggeration.

## Layers, from the bed up

1. **Bed.** Mud, sand, leaf litter, algae film.
2. **Ground objects.** Roots, rocks, seagrass, food patches.
3. **Bed animals.** Shrimp, crabs, snails. Each casts a small soft shadow.
4. **Mid-water.** Fish, the turtle, drifting leaves. Their shadows fall on the bed, offset from the body.
5. **Cover.** Root tangles, overhangs and floating leaves that the shrimp can go under. Cover turns translucent above the player.
6. **Surface light.** Moving caustics, ripples, and shadows of things above the water: the bird, the hull, the net.
7. **Screen mood.** Darkened edges and colour shifts that follow the shrimp's feelings.

Depth is told by shadow offset and by blur. The higher a thing is, the further its shadow sits from it and the softer its edge.

## The shrimp

A whiteleg shrimp, anatomically correct, seen from above.

What must be there:
- A pointed rostrum between two stalked eyes.
- One pair of long antennae, longer than the body, and one pair of short forked antennules.
- Two flat antennal scales beside the eyes.
- The carapace, about a third of the body length.
- Six abdominal segments, tapering.
- The tail fan: a central telson with two blades on each side.
- Five pairs of walking legs, glimpsed at the sides when walking.
- Five pairs of swimmerets under the abdomen, seen as a flutter along the sides when swimming.

Colour:
- Translucent, between grey-white and pale blue-grey. The gut shows as a faint dark thread along the back.
- Legs whitish. Tail fan edges slightly darker. Check details against photos of living animals before final art.
- Body tone shifts toward the ground it stands on, as real whiteleg shrimp do.

**Alive, not cooked.** The pink, curled shrimp is a cooked one. This shrimp is never pink or orange, and never curled into a C except for a moment during a tail flip.

No human features. No eyebrows, mouth shapes, eyelids or enlarged eyes. Emotion is carried by posture, antennae, tail fan and movement (D23). The table of mood postures is in [02-mechanics.md](02-mechanics.md).

### Life stages

| Stage | Chapter | Look |
|-------|---------|------|
| Larva | 0 | A tiny translucent comma with feathery limbs and two dark eye spots. By the end of the chapter, a miniature shrimp |
| Juvenile | 1 | Full shrimp shape, slightly large eyes and short antennae for its size, as in real juveniles |
| Sub-adult | 2 to 4 | Longer antennae, fuller tail fan |
| Adult | 5 | Largest, steady, antennae trailing far behind when it swims |

Growth is shown by the world getting smaller around the shrimp. A fallen leaf is a roof in chapter 1 and a snack-sized scrap in chapter 5.

### Rig

The shrimp is built from parts and animated by code, not from drawn frames:
- A chain of body segments that bends when turning and curls when darting.
- Antennae as soft ropes that trail, sweep, point or pin back.
- Legs on a walking cycle tied to speed.
- Swimmerets as a wave along the abdomen.
- A tail fan that opens and closes.

One rig serves the player, every companion and every stage, with different sizes, tints and markings. In the first version the parts are drawn by code. Painted parts can replace them later with no change to the animation.

### Companions

Same species, told apart at a glance from above:

| Name | Marking | Movement signature |
|------|---------|-------------------|
| Brise | Left antenna a third shorter | Leads, moves in long straight lines |
| Nacre | Pale, almost white tail fan | Stops often, antennae up |
| Écume | Smaller body | Quick, loops away and back |

## Other animals, from above

| Animal | Read as |
|--------|---------|
| Wading bird | Never seen whole. A wide wing shadow, two thin legs with ripple rings, a quick beak splash |
| Hunting fish | A long dark spindle in mid-water with its shadow beneath. Tail beats speed up before a charge |
| Green turtle | A large oval shell and four slow flippers. Shadow as big as a root clump |
| Pistol shrimp and goby | A small burrow mouth in the sand, the goby's head at the entrance, the shrimp shovelling behind it |
| Fiddler crab | Square body, one oversized claw raised and lowered |
| Net | Not an object. A hull shadow, then a moving grid of shadow, slightly blurred |

## Areas and palettes

Starting values, to tune on screen.

| Area | Mood | Main colours |
|------|------|--------------|
| Drift | Vast, weightless | Deep teal `#0B2A3A`, pale green `#BFE6D8`, motes `#9BE564` |
| Mangrove | Sheltered, warm, murky | Tea water `#8A6B3F`, mud `#5C4630`, roots `#3B2A1E`, leaf green `#6E8B3D`, light `#F2D58A` |
| Lagoon, day | Open, bright | Sand `#E8D9B0`, water `#6CC5C1`, seagrass `#2F7D5B` |
| Lagoon, dusk | Golden | `#F0B27A` over the day colours |
| Lagoon, night | Still, glowing | Indigo `#1B2350`, plankton glow `#7DF9FF` |
| Channel | Moving, cool | Slate `#2B3A55`, moonlight `#C9D6E8`, rock `#454C59` |
| The shadow | The channel, drained of colour | Grid shadow `#0E1420` at half strength |
| Open sea | Deep, quiet | Ultramarine `#0A2E6E` to `#061A40`, particles `#DCE9FF` |

## Water and light

- Caustics: a slow moving light pattern on the bed, strongest in the lagoon by day.
- Murk: in the mangrove, things fade into brown beyond about 8 BL.
- Particles: drifting specks that show the current's direction.
- Scent ribbons (Sense): thin watercolour strokes that drift and fade, each kind with its own shape.
- Glowing plankton at night: points that brighten when the shrimp moves through them.

## Interface

- Almost none during play. Prompts and narration sit low on the screen in a single line.
- Menus and the journal look like a field notebook: off-white paper `#F6F1E4`, ink `#2A2A2A`, pencil-like line drawings.
- Fonts, both under the SIL Open Font License and both covering French accents: **Fraunces** for titles, **Atkinson Hyperlegible** for text. Host the files with the game.
- Text is never smaller than 20 px at 1080p.

## First version, and how it grows

| Step | Shrimp | World |
|------|--------|-------|
| First release | Drawn by code from simple shapes with soft edges and a paper-grain overlay | Code-drawn roots, leaves, sand speckle and seagrass, over CC0 sand, mud and paper textures |
| Later | Painted parts dropped into the same rig | Painted grounds and objects replacing the generated ones, key by key |

Every image is loaded by a name such as `shrimp.tailfan` or `mangrove.root.large`. Replacing a generated image with a painted file of the same name needs no code change.

## Where to find open-licence art

Check the licence on each file's own page on the day of download, and add a row to `CREDITS.md`.

| Source | Licence | Good for |
|--------|---------|----------|
| ambientCG, Poly Haven | CC0 | Sand, mud, rock and paper textures |
| Kenney | CC0 | Interface shapes, particles |
| OpenGameArt | Mixed. Filter to CC0 and CC BY | Plants, rocks, water effects |
| Wikimedia Commons, iNaturalist | Mixed, per photo | Reference photos of whiteleg shrimp, mangroves and seagrass. Reference only unless the licence allows reuse |

## Comfort rules

- Nothing flashes. Any change in brightness takes at least half a second.
- No red warning overlays. Fear darkens and narrows the view. It does not alarm the player.
- Camera sway stays under 4 px and is off with reduced motion.
- Every cue that uses colour also uses shape or sound.

## Sizes and formats

- Design size 1920 x 1080, scaled to fit the window with bars if needed.
- The juvenile shrimp is 110 design px long and the view is enlarged 1.4 times, so it is about 155 px long on screen at 1080p (T19). The view then shows about 12 by 7 body lengths.
- Painted files: WebP for grounds, PNG for parts that need clean transparency. No single image wider than 2048 px.

## Images for the first release

- Shrimp parts: carapace, six segments, tail fan, eyes, antennae, antennules, legs, swimmerets, soft shadow. Larva body.
- Mangrove: mud ground, three roots, two root tangles (cover), fallen leaves, floating leaves (cover), algae film patch, seed pod, sunken branch.
- Animals: fiddler crab, snail, bird shadow, bird legs, ripple ring, splash.
- Effects: caustics, murk, particles, four scent ribbon strokes, edge darkening.
- Interface: paper panel, key-cap frame, journal icons, title lettering.
