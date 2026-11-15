# 11. World catalogue

Status: draft 0.2, 2026-11-15. Every place, object, food and creature in the game: where it is, how big it is, what it looks like from above, what it does. Entries marked **new** are proposals that are not in docs 01 to 09 and wait for the author (see [09-decisions.md](09-decisions.md)). Everything else details what those documents already decided.

Read with [04-art-direction.md](04-art-direction.md) for the style, [14-art-production.md](14-art-production.md) for image names and sizes in pixels, and [10-feelings-and-states.md](10-feelings-and-states.md) for how creatures behave when afraid.

No text in this document is a journal text. Notes about animals here are for whoever draws and builds. Journal texts live in doc 07 and need a source.

## Reading this document

- **Coordinates** are design pixels. The origin is the top left of an area. x grows to the right, y grows downward.
- **BL** is one body length of the player's shrimp in that area. Sizes are given in BL and in pixels.
- **Ids** are written `like.this`. A thing's id is also the start of its image names.
- **Kinds**: ground, obstacle (solid), cover (the shrimp can go under it), food, creature, effect, landmark.

## The coast

The five places lie side by side along one coast. The sea is to the left and the land to the right, as on a map of the eastern Pacific shore where whiteleg shrimp live.

```
   sea                                                              land
   +------------+----------+----------------+----------------+------------+
   |  Open sea  |  Shadow  |    Channel     |     Lagoon     |  Mangrove  |
   |     5      |    4     |       3        |       2        |     1      |
   +------------+----------+----------------+----------------+------------+
     ---- chapter 0: the larva drifts in, left to right, over all of it ---->
     <--- chapters 1 to 5: the growing shrimp travels back, right to left ---
```

The larva's drift and the adult's return are the same line, travelled in opposite directions. In the free life the player walks this coast freely through exits on the left and right edges of each area.

### Scale

The shrimp stays about the same size on screen all its life. The world is drawn smaller around it as it grows. Each area is drawn at the scale of the shrimp that lives there.

| Area | Shrimp there | Its real length | Its length in px | Pixels per real cm | A 12 cm mangrove leaf would be |
|------|--------------|-----------------|------------------|--------------------|--------------------------------|
| Drift | Larva | under 1 cm | 44 to 70 | not to scale | |
| Mangrove | Juvenile | 3 cm | 110 | 37 | 4 BL: a roof |
| Lagoon | Sub-adult | 8 cm | 124 | 15.5 | 1.5 BL |
| Channel, Shadow | Sub-adult | 12 cm | 140 | 11.7 | 1 BL |
| Open sea | Adult | 17 cm | 158 | 9.3 | 0.7 BL: a scrap |

The view shows about 12 by 7 BL in every area.

## Things found everywhere

### The player's shrimp, the companions, the shoal

Look and rig: doc 04 and doc 14. Told apart from above by:

| Who | Marking | Size | Moves |
|-----|---------|------|-------|
| The player | None. The view follows it | 1 BL | As steered |
| Brise | Left antenna a third shorter, with a blunt tip | 1.05 BL | Long straight lines. Leads |
| Nacre | Tail fan almost white. Slightly paler body | 1 BL | Stops often. Antennae high |
| Écume | Smaller. A darker gut line | 0.85 BL | Quick loops away and back |
| Shoal members | Small differences in tint and antenna length, seeded | 0.9 to 1.05 BL | Each by its own temperament |

### Effects used in every area

| Id | What it is | Look |
|----|------------|------|
| `shadow.soft` | The shadow under anything | A soft dark oval. Further from its owner and softer the higher the owner is |
| `fx.speck` | Specks drifting in the water | Pale dots, 2 to 5 px, in three layers. They show which way the water moves |
| `fx.ripple` | A ring on the surface | One or two thin pale circles that widen and fade in 1.2 s |
| `fx.vignette` | Darker water at the edge of view | Already built |
| `fx.grain` | Paper grain | Already built |
| `scent.food`, `scent.shrimp`, `scent.danger`, `scent.unknown` | Scent ribbons, seen with Sense | See "Scent ribbons" |
| `fx.rim` | The soft pale rim around a curiosity target | A blurred outline, 6 px, at 35% |

### Scent ribbons

Each is a watercolour stroke 0.15 BL wide that runs from the shrimp toward its source, drifts with the water and fades at both ends. Shape carries the meaning as much as colour.

| Ribbon | Shape | Colour | Movement |
|--------|-------|--------|----------|
| Food | One smooth, wide band with soft edges | Green `#7BC47F` | Flows slowly toward the source |
| Shrimp | A line of round dots, evenly spaced | Amber `#E8B04A`. Brighter and larger dots for companions | The dots pulse in turn |
| Danger | A jagged line with sharp corners | Violet `#8E6BBF` | Still. It marks a place, not a direction |
| Unknown | A thin line that coils in loose spirals | White `#F4F1E6` | The coils turn slowly |

## Chapter 0. Drift

**Mood:** vast, weightless. **Size:** 9000 by 1800. **Light:** starts almost black, opens to pale green, ends in brown haze. **Threats:** none.

The water carries the larva from left to right at about 75 px per second. The player steers up and down and can lean with or against the flow. Crossing takes about two minutes.

```
x:   0        1500              5000           7000        8600  9000
     +---------+-----------------+--------------+-----------+----+
     |   A     |        B        |      C       |     D     | E  |
     | the dark|    the green    |  the shafts  | the haze  |land|
     +---------+-----------------+--------------+-----------+----+
       no food   motes in clouds   light from     brown water  roots
       10 s      other larvae      above, bells   leaf shadows above
```

| Zone | What is there | What happens |
|------|---------------|--------------|
| A. The dark | Black-teal water, a few pale specks | "The tide carries you. You are very small." The larva cannot eat yet. Light rises |
| B. The green | Clouds of microalgae motes. Other larvae. Copepods | First hunger. First taste. Story step: eat 5 motes |
| C. The shafts | Soft bars of light from above. Drifting bells. More motes | The larva changes shape. Challenges: 15 motes, touch another larva |
| D. The haze | The water turns tea-brown. Long soft shadows cross: leaves, then roots | Story step: reach the brown water |
| E. Landfall | Dark root shapes all around | The larva settles. The view sinks to the mud. Chapter 1 begins |

| Id | Kind | Size | Look from above | Does |
|----|------|------|-----------------|------|
| `larva.early` | The player, first 10 s | 44 px | A pale pear-shaped speck with three pairs of feathery limbs and one dark eye spot | Jerks forward with each beat of its limbs |
| `larva.mid` | The player, zones B and C | 56 px | A translucent comma: a long thin body, a forked tail, two dark eye spots, feathery limbs along the front | Swims in small pulses |
| `larva.late` | The player, zones D and E | 70 px | A miniature shrimp: glassy, with short antennae and a tiny tail fan | Swims steadily |
| `food.microalgae` | Food | 14 to 36 px | Glowing green: single beads, short chains of beads, small discs. `#9BE564` with a soft halo | Drifts in clouds of 6 to 12. Brightens when the larva is within 1.5 BL. Eaten on touch with a soft chime |
| `drift.larva` | Creature | 40 to 70 px | Other larvae of the same kind, at the same stage as the player | Drift, pulse, sometimes bump gently. Touching one is the first meeting |
| `drift.copepod` | Creature, **new** | 30 px | A clear teardrop with two long feelers held out sideways and one red-brown eye spot | Hangs still, then hops a short way. Cannot be eaten or harmed |
| `drift.bell` | Creature, **new** | 120 to 200 px | A glassy bell seen from above: a pale ring with a faint cross inside | Opens and closes slowly as it drifts. Harmless here. The larva slides around it |
| `drift.shaft` | Effect | 300 by 1800 | A slanted bar of paler water | Sways slowly |
| `drift.haze` | Effect | Full height | Brown `#8A6B3F` rising from the right edge | Thickens as the larva travels |
| `drift.rootShadow` | Effect | 200 to 600 px | Long dark soft bars | Slide across from right to left as the larva passes under them |

## Chapter 1. Mangrove

**Mood:** sheltered, warm, murky. **Size:** 6000 by 4000, about 55 by 36 BL. **Light:** dappled, from gaps in the leaves above. **Murk:** things fade into brown beyond 8 BL. **Day cycle:** none. **Threat:** the wading bird.

The creek mouth on the left is both the way in and the way out. Deeper to the right the roots close in and the water darkens.

```
       0     500   1000  1500  2000  2500  3000  3500  4000  4500  5000  5500  6000
     0 +-----------------------------------------------------------------------+
       |  mud bank, out of the water, along the whole top: crab burrows        |
   500 |####        . . . .   F  crab flat   . . . .        ##    G           #|
       |###    r        a          c  c  c         r    T     r   a   r   r   #|
  1000 |##        T          r                  T                r     T      #|
       |@   B landing roots       +---------------+        r   H the hollow   #|
  1500 |      r    a    r         |  D            |    T        r    a    r   #|
       |> A                T      |  the clearing |                   r       #|
  2000 |> creek   S        a      |     (bird)    |   L  N                 r  #|
       |> mouth      r            |               |      E Nacre's      a     #|
  2500 |      r         T         +---------------+   j    leaf    j  r    T  #|
       |@         ~ ~ ~        l    s    T      T          T       r          #|
  3000 |##   ~ ~ ~ ~    L    C leaf bed    l         l                  X X X #|
       |###  I gutter ~       l   p   s     l   p            T     X X X X X  #|
  3500 |#####   ~ ~ ~    ####                 ####       ####    H sunken     #|
       |#######################################################    branch  ###|
  4000 +-----------------------------------------------------------------------+

  #  wall of roots     r  root foot      T  root tangle (cover)   L  floating leaf (cover)
  a  algae film        l  fallen leaf    p  seed pod               s  snail
  c  fiddler crab      N  Nacre          j  young shrimp           S  the player arrives
  >  way out           ~  gentle current X  sunken branch          @  root clump
```

| Zone | Rectangle (x, y, w, h) | What is there | What happens |
|------|------------------------|---------------|--------------|
| A. Creek mouth | 0, 1300, 700, 1400 | Paler sandy mud. Brighter water. A slow inward current | The player arrives at (620, 2000). The way out, closed until the molt |
| B. Landing roots | 700, 1000, 1300, 1600 | A loose group of root feet. Three algae film patches. One tangle | Walk, then graze. Story step: eat your fill. First use of Sense |
| C. Leaf bed | 1500, 2700, 1900, 900 | Fallen leaves, seed pods, snails | Second and third foods. A seed pod drops: the first harmless startle |
| D. The clearing | 2700, 1300, 1300, 1200 | Open mud, dappled light, tangles all round the rim | The bird. No point in it is more than 5 BL from cover |
| E. Nacre's leaf | 3900, 1900, 1100, 900 | A large floating leaf, a tangle, two young shrimp | First meeting. Story step: greet a shrimp |
| F. Crab flat | 1700, 0, 2000, 900 | The mud bank above the waterline and the shallows below it | Fiddler crabs wave on the bank. The player watches from the water |
| G. Deep roots | 4500, 500, 1400, 2400 | Dense root feet, narrow passages, the richest algae, the darkest murk | The hollow at (5000, 1300): the molt shelter |
| H. Sunken branch | 4700, 3000, 1200, 800 | A fallen branch across the mud | The far corner. Challenge: find it |
| I. Gutter | 300, 2700, 1400, 900 | A slightly deeper run with a gentle current and leaves drifting on the surface | The first feel of moving water |

Beats, in order: arrive at A, walk and graze in B, sense, wander to C or D. Entering D after the Sense step starts the bird. Meet Nacre at E. The shell feels tight once the greeting is done and 60 s have passed. Shelter anywhere (the hollow is the natural place) and molt. Then the water at the creek mouth "tastes of salt" and the way out opens.

### Mangrove things

| Id | Kind | Size | Look from above | Does |
|----|------|------|-----------------|------|
| `mangrove.mud` | Ground | Repeating tile | Warm brown mud `#5C4630`. Soft darker and lighter patches. Fine silt streaks, small pits, scraps of leaf | Still |
| `mangrove.sandmud` | Ground, creek mouth | Repeating tile | Paler, greyer, grainier. Blends into the mud | Still |
| `mangrove.root.a` to `.f` | Obstacle | 1 to 1.7 BL across | A prop root where it enters the mud: a thick dark limb `#3B2A1E` that comes down from the tree and ends, rounded, in the mud. Fine roots spread from the end. A skirt of green-brown algae and a ring of scoured mud lie round it. The limb fades as it rises toward the tree, out of sight above the water. Six pictures, one for each way the limb can come down | Solid at the rounded end. The shrimp slides round it |
| `mangrove.root.barnacled` | Obstacle | 1 to 1.5 BL | A root foot with clusters of small pale grey rings: barnacles | Solid. The barnacles are the discovery `creature.barnacles`, **new** |
| `mangrove.wall` | Obstacle, area edge | Strips | A row of root limbs standing in the mud in front of a dark mass of roots with no gaps | Solid. The left, right and bottom edges |
| `mangrove.bank` | Obstacle, area edge | A strip along the whole top | The mud bank, out of the water: paler and drier than the bed, with fine cracks. The waterline runs along its foot as a pale broken line | Solid. The fiddler crabs live on it |
| `mangrove.clump` | Obstacle | 4 BL across | The roots of one tree: a dozen limbs come down all round and stand in a ring, with shade between them | Solid. One stands at each side of the creek mouth, at (120, 1240) and (130, 2770), and closes the end of the edge there |
| `mangrove.tangle.a`, `.b` | Cover | 5 to 7 BL across | Arching roots crossing each other, seen from above as dark bands with gaps of mud between. Drawn above the shrimp | The shrimp can go under. Fades to 40% while the player is beneath |
| `mangrove.hollow` | Cover | 8 BL across | A ring of thick roots roofed over, with one opening. Darker inside | The molt shelter. A place: discovery `place.hollow` |
| `mangrove.leaf.floating.a`, `.b` | Cover | 3.5 to 4.5 BL long | A green leaf on the surface `#6E8B3D`: pointed oval, pale midrib, glossy. Its shadow lies on the mud below, offset | The shrimp can shelter in its shadow. In the gutter it drifts slowly |
| `food.mangroveLeaf` | Food | 3 to 4 BL long | A brown fallen leaf on the bed, soft, with pale decay spots and lace-like eaten edges | 8 s to eat a share. Very filling. Grows new film in 90 s |
| `food.algaeFilm` | Food | 1.5 to 2.5 BL across | An uneven green-brown film on a root skirt or on the mud, thicker in the middle, with tiny bubbles | 4 s to clear. Fades as it is grazed. Back in 90 s |
| `mangrove.litter` | Scatter | 0.3 to 1 BL | Leaf scraps, twigs, bits of bark | Still |
| `thing.seedPod` | Landmark, startle | Standing: 0.5 BL circle. Lying: 3 BL long | A mangrove seedling: a long green-brown pencil, thicker at one end. Standing ones are seen end on, with a long thin shadow | One drops from above with a plop and a ring, and stands in the mud |
| `thing.sunkenBranch` | Landmark, obstacle and cover | 12 BL long | A grey-brown branch with stubs of side branches, lying across the mud, half sunk at one end, lifted at the other. Algae on top, dark beneath | Solid where it lies on the mud. Cover where it is lifted |
| `thing.breathingRoots` | Obstacle field, **new** | Each 0.25 BL. A field 8 by 6 BL | Dozens of dark pegs standing out of the mud, each with a tiny shadow | Solid. A slalom between zones D and G. Discovery |
| `light.dapple` | Effect | Repeating tile | Warm patches `#F2D58A`, soft-edged, like light through leaves | Slides and breathes slowly |
| `mangrove.murk` | Effect | Screen | Brown fog that thickens with distance from the shrimp: clear to 3 BL, thick by 8.5 BL | Centred on the shrimp and drawn at twice the size of the view, so it covers the screen when the shrimp is near its edge |

### Mangrove creatures

**Fiddler crab** `creature.fiddlerCrab`. 1.4 BL across with the claw.
- Look: a squarish body, wider than long, mud-coloured with a paler back. Two eyes on tall thin stalks, seen as two dots in front. Four walking legs each side. One claw is huge, pale cream with an orange-tan tip, as long as the body is wide. The other is tiny.
- Where: on the mud bank in zone F, each beside its burrow, a dark hole with small balls of mud scattered round it.
- Does: lifts the big claw up and out, then down, about once every 2 s, in bouts of four or five. Between bouts it picks at the mud with the small claw and walks sideways.
- Toward the player: none. It is above the waterline. A threat cue sends every crab down its burrow at once. They come back out one by one after 8 s of calm.
- Watching one wave for 5 s from within 3 BL completes a challenge.

**Mud balls** `thing.crabPellets`, **new**. A scatter of tiny balls of mud around each burrow: what the crab leaves behind as it feeds. A discovery by going near.

**Snail** `creature.snail`. 0.8 BL long.
- Look: a long narrow cone of a shell, dark grey-brown with paler ridges winding round it, tip trailing behind. Two short feelers in front. A faint smooth trail behind it in the mud.
- Where: zone C and the root skirts.
- Does: crawls at 0.05 BL per second. Stops and pulls in its feelers if the player rushes past.

**Hermit crab** `creature.hermitCrab`, **new**. 0.9 BL long.
- Look: the same kind of shell as the snail, but with jointed legs and two small claws showing in front, and moving faster.
- Does: walks in short jerky runs. If the player swims or darts within 1.5 BL it vanishes into the shell, which rocks and lies still. After 4 s of calm, legs, then eyes, come back out. If the player walks up slowly it carries on.
- Why it is proposed: one journal card already rests on a study of hermit crabs (ELWOOD2009). Meeting one in the mud gives that card something to point at, and it shows another animal being afraid.

**Barnacles** `creature.barnacles`, **new**. Part of some root feet. Small pale rings that open and sweep the water with a tiny feathered hand when the player is still, and shut when anything moves fast nearby.

**Young fish** `creature.smallFish`. 0.7 BL each, in groups of 12 to 20.
- Look: slim silver-olive spindles with a pale stripe, in mid-water, their shadows on the mud below.
- Does: holds among the roots, all facing into the current. Bursts apart at a threat cue or a tail flip, and regroups.

**Young shrimp** `shrimp.npc`. Two unnamed juveniles in zone E, and Nacre. Nacre rests at (4590, 2250), at the edge of the floating leaf and not beneath it: a leaf on the surface is not see-through, and she must be seen.

**Wading bird** `creature.bird`. Never seen whole.

| Part | Size | Look |
|------|------|------|
| `bird.shadow` | 9 BL across | A soft dark shape: a body and a folded wing, with a narrower head and neck that moves on its own. Edges very blurred |
| `bird.leg` | Leg 0.35 BL thick. Foot 3 BL across | A thin black leg seen end on, as a small dark circle. Around it on the mud, the foot: three long toes forward and one back, yellow |
| `bird.ring` | 2 BL across | The strike ring: two thin circles of pale ripples that tighten |
| `bird.beak` | 1.3 BL | The tip of a dark dagger-shaped beak, seen for a fifth of a second in the middle of a splash |
| `bird.splash` | 2.5 BL | A burst of pale ripples and a few bright droplets |

The toes alone are almost three times the length of the shrimp. The proposed bird is a snowy egret, which has black legs and yellow feet (to check that it lives along this coast).

## Chapter 2. Lagoon

**Mood:** open, bright by day, golden at dusk, still and glowing at night. **Size:** 8000 by 5000, about 64 by 40 BL. **Day cycle:** yes. **Threat:** the hunting fish.

The player comes in from the mangrove on the right and leaves for the channel on the left.

```
       0    1000   2000   3000   4000   5000   6000   7000   8000
     0 +---------------------------------------------------------+
       | H north-west rocks  |   C  seagrass meadow        |     |
  1000 |  o  o   crevices    |  ///  ///   turtle  ///  /// |     |
       |    o       o        |    ///  ///  ///  ///        |     |
  2000 |---------------------+------------+----------------+  A  |
       |> G the pass         | E the      |  B the flat     creek <
  3000 |> deeper, cooler     | shoal's    |  open sand      apron <
       |   current begins    | ground     |  gold film, mounds    |
  4000 |---------------------+------------+------+----------+-----|
       | I weed bank         | D rock garden     | F bright shallows|
  5000 |  shed shells        |  o O o  burrow    |  plankton at night|
       +---------------------------------------------------------+
   ///  seagrass     o O  rocks     >  way out to the channel     <  way in from the mangrove
```

| Zone | Rectangle (x, y, w, h) | What is there | What happens |
|------|------------------------|---------------|--------------|
| A. Creek apron | 6900, 1800, 1100, 1700 | Muddy sand, a few mangrove leaves washed out | Arrival, in full daylight. "Too bright." |
| B. The flat | 4700, 1800, 2200, 1900 | Bare rippled sand. Golden film in patches. Small sand mounds | Learn to burrow. Story step: burrow through a day |
| C. Seagrass meadow | 2500, 200, 4000, 1500 | Clumps of seagrass, close together. Fuzz on the older blades. Small fish | The turtle grazes on a slow loop. Cover from the fish |
| D. Rock garden | 2700, 3900, 2300, 1000 | Rounded rocks with algae film. One overhang. The burrow of the pistol shrimp and goby at its sandy edge | Challenge: find them |
| E. The shoal's ground | 3300, 1900, 1300, 1800 | Sand with a few pebbles | The shoal rests here burrowed by day and spreads out at dusk. Brise and Écume are met here |
| F. Bright shallows | 5200, 3900, 2600, 1000 | Very shallow, strong moving light by day | Glowing plankton is thickest here at night. Challenge: graze under it |
| G. The pass | 0, 1900, 3200, 1900 | The sand slopes down and the water cools in colour. A current starts toward the left | The fish comes from here at dawn. The way out, open after the molt |
| H. North-west rocks | 200, 200, 2200, 1500 | Boulders with crevices between | A quiet corner. A good place for the molt |
| I. Weed bank | 200, 3900, 2400, 1000 | Drifted seagrass blades and seaweed | Shed shells gather here |

Beats: arrive by day, burrow, rest until dusk. At dusk the shoal comes out: graze with it. Night: plankton, turtle, the burrow, bonds. Dawn: the fish. Then the molt, with a companion staying close. Then the pull of the tide.

### Lagoon things

| Id | Kind | Size | Look from above | Does |
|----|------|------|-----------------|------|
| `ground.sand` | Ground | Tile | Already built. Pale sand with ripple marks | Still |
| `lagoon.seagrass.a`, `.b`, `.c` | Cover and decor | Clump 3 to 5 BL across | Thin ribbon blades `#2F7D5B`, each 1.5 to 2.5 BL long, all bent the same way by the water, fanning from a patch of darker sand. Paler tips | Sways together in slow waves. Dense clumps are cover |
| `food.seagrassFuzz` | Food | Overlay on a clump | Soft tan-green fuzz along some blades | 3 s to clear |
| `food.sandFilm` | Food | 2 to 3 BL across | A thin golden-brown sheen on the sand `#C9A24B`, uneven, with pin-sized bright bubbles | 4 s. Glows a little at dusk, when it is worth more |
| `rock.a`, `.b`, `.c`, `rock.slab` | Obstacle | 1 to 3 BL | Already built | Solid |
| `rock.overhang` | Cover | 4 BL | A flat rock with a dark gap along one side, its shadow thrown wide | Shelter |
| `thing.sandVolcano` | Landmark, **new** | 0.6 BL | A small cone of sand with a hole at the top | Now and then a puff of sand comes out. Something lives below. It is never seen |
| `thing.shedShell` | Landmark, **new** | 1 BL | The empty shell of a shrimp: the whole outline, glassy and pale, slightly crumpled, split behind the head | Rocks in the current and drifts a little |
| `thing.glowingPlankton` | Effect, discovery | Points | Blue-white points `#7DF9FF` in the water at night, faint until disturbed | Brighten in the wake of anything that moves, for 1.5 s |
| `thing.crackle` | Sound, discovery | | No image. A steady fine crackle in the lagoon's ambience | Discovered by staying 3 s in zone D, where it is loudest |
| `light.caustics` | Effect | Tile | A net of bright curved lines | Drifts and warps. Strong by day, gone at night |
| `light.dusk`, `light.night` | Effect | Screen | Gold `#F0B27A`, then indigo `#1B2350` | Day cycle |

### Lagoon creatures

**Green turtle** `creature.turtle`. Shell 6 BL long. With flippers out, 8 BL across.
- Look: a broad oval shell, dark olive-grey with paler streaks spreading across each plate. Five plates down the middle, four down each side, a rim of small ones. Two long front flippers and two short rear ones, darker, edged pale. A blunt head with large plates.
- Where: zone C, on a loop of about 40 BL.
- Does: glides at 0.6 BL per second, flippers in slow strokes. Stops at a clump, lowers its head and crops the blades for 6 s, moves on.
- Shadow: as large as a root tangle, 0.5 BL offset. The first time it crosses the player it is a harmless startle.
- Toward the player: none. It cannot be disturbed. Shrimp may graze the film beside it.
- Following within 4 BL for 20 s completes a challenge.

**Pistol shrimp and goby** `creature.pistolAndGoby`. Burrow mouth 0.4 BL. Goby 0.75 BL. Shrimp 0.5 BL.
- Look: a hole in the sand ringed with shell bits and small pebbles. The goby lies in the mouth, head out: pale sand-coloured, with dark dashes, eyes high on the head. Behind it the pistol shrimp: stout, olive-tan with darker bands, one claw much larger than the other.
- Does: the shrimp pushes a small load of sand out of the burrow like a bulldozer, dumps it, backs in. One of its antennae rests on the goby's tail the whole time. The goby watches.
- Toward the player: a slow walk to within 2.5 BL is accepted. Swimming or darting within 4 BL makes the goby flick its tail and both vanish. They return after 6 s of calm. A threat cue sends them in at once.
- A discovery, a challenge and an achievement.

**Small schooling fish** `creature.smallFish`. As in the mangrove, in schools of 20 to 30, silver, over the meadow and the flat.

**Hunting fish** `creature.huntingFish`. 4.5 BL long.
- Look: from above, a long narrow spindle, dark olive-grey on the back, a pointed head, two side fins held out a little, a forked tail. A thin dark line runs the length of each side. In mid-water, with its shadow on the sand half a BL away.
- Does: see doc 10. Its tail beats slowly on patrol, fast in the pause before a charge.
- Proposed species for the drawing: a snook (to check which kind lives on this coast).

**Sea star** `creature.seaStar`, **new, optional**. 1.5 BL. A fat five-armed star, tan with a net of raised orange-brown knobs, on the sand in zone H. Moves too slowly to see. Still, for now, in the "maybe" pile.

## Chapter 3. Channel

**Mood:** moving, cool, moonlit. **Size:** 12000 by 2600, about 86 by 19 BL. **Time:** night. **Threat:** the hunting fish, twice.

The tide runs from right to left and carries everything with it. Swimming with it adds its speed.

```
x:  0      500        2500         4500        6500         8500       10500   12000
    +-------+-----------+------------+-----------+------------+-----------+-------+
    |>      |  F        |  E         |  D        |  C         |  B        |  A   <|
    |> sea  |  the bar  |  boulder   |  the pool |  the       |  first    | the  <|
    |>      |           |  field     |           |  narrows   |  run      | gathering
    +-------+-----------+------------+-----------+------------+-----------+-------+
  current:     1.0          1.5          0.5          2.0          1.0        0.3   BL per second
```

| Zone | x from, to | What is there | What happens |
|------|-----------|---------------|--------------|
| A. The gathering | 10500 to 12000 | Rippled sand. The shoal collecting | "The water wants to leave. So do you." Story step: follow the tide with the shoal |
| B. First run | 8500 to 10500 | Sand with long ripple marks. Clumps of seaweed riding the current | Challenge: eat seaweed without stopping |
| C. The narrows | 6500 to 8500 | Rock walls close in to 1200 px. Fast water. Crevices in both walls | The fish, first time |
| D. The pool | 4500 to 6500 | Wide, slow. Rocks with algae film. Other shoals passing | A rest. Regroup. Challenge: keep all three companions close for a minute |
| E. Boulder field | 2500 to 4500 | Large boulders to weave between. Crevices | The fish, second time |
| F. The bar | 500 to 2500 | A shallow sand bar. Bands of moonlight sliding across it | The way out |

| Id | Kind | Size | Look from above | Does |
|----|------|------|-----------------|------|
| `channel.bed` | Ground | Tile | Grey-blue sand and gravel `#2B3A55` to `#454C59`, with long ripple marks all running the same way | Still |
| `channel.wall` | Obstacle | Strips | Dark rock faces, layered, with algae at the foot | Solid |
| `channel.boulder.a`, `.b` | Obstacle | 3 to 6 BL | Big rounded rocks, slate-coloured, moonlit on one side | Solid |
| `channel.crevice` | Cover | 2 BL long | A dark slot between rocks, just wider than a shrimp | Shelter. The fish cannot follow |
| `food.seaweed` | Food | 2 BL | A loose clump of olive-brown fronds with small round floats | Rides the current. Eaten on touch while moving |
| `light.moon` | Effect | Tile | Pale blue-white bands `#C9D6E8`, long and soft | Slide across the bed |
| `fx.streak` | Effect | | Specks drawn out into short lines | Shows how fast the water runs |
| `shrimp.traveller` | Creature | 1 BL | Other shrimp, strangers, in small groups | Pass through, all heading left |
| `channel.seaFan` | Decor, **new, optional** | 2 BL | A flat branching fan, rust-red, growing from the rock walls | Sways. Still in the "maybe" pile |

## Chapter 4. The shadow

**Mood:** the channel's colours, drained. **Size:** 7000 by 3200, about 50 by 23 BL. **Threat:** the net. Detail in doc 10.

Open bed just outside the bar. Five rock outcrops with crevices, none more than 7 BL from the next. The player enters from the right.

```
x:  0        1500        3000        4500        6000    7000
    +---------+-----------+-----------+-----------+-------+
    |>              o            o                        <|
    |>   after          path of the grid ->         trigger<|
    |>         o              o              o            <|
    +---------+-----------+-----------+-----------+-------+
    o  rock outcrop with a crevice
```

| Id | Kind | Size | Look | Does |
|----|------|------|------|------|
| `shadow.hull` | Effect | 30 by 8 BL | One long dark shape, pointed at one end, edges soft | Crosses in 6 s |
| `shadow.grid` | Effect | Band of 14 by 6 BL | A grid of dark blurred lines, cells of 0.5 BL, at half strength `#0E1420`. The band's edges are a little ragged | Sweeps along the bed at 2.2 BL per second |
| `fx.silt` | Effect | Clouds of 3 to 6 BL | Pale grey-brown soft puffs | Hang for 20 s after the grid has passed, then thin |
| `shadow.outcrop` | Obstacle with cover | 4 BL | A cluster of rocks with one dark crevice | The only shelter |

Nothing here has a journal text. The place has an entry with a drawing and a name and no words.

## Chapter 5. Open sea

**Mood:** deep, quiet. **Size:** 6000 by 6000. **Threats:** none.

The bed is visible only along the right edge and fades into blue. Beyond it the shrimp swims in open water: it does not walk, and its shadow fades out.

```
       0        1500       3000       4500      6000
     0 +---------+----------+----------+---------+
       |                                         |
  1500 |    C the deep        B the blue    A    <
       |      (darkest)                    shelf <
  3000 |    x deepest     D the gathering   edge <
       |      point                              |
  4500 |                                         |
       +---------+----------+----------+---------+
```

| Zone | What is there | What happens |
|------|---------------|--------------|
| A. Shelf edge | The last sand, fading. One rock ledge | The third molt, under the ledge. Full grown |
| B. The blue | Nothing but blue and slow specks | "There is no edge here." |
| C. The deep | The darkest water. Specks sinking | Challenge: find the deepest point, at (1200, 3000) |
| D. The gathering | Other adults, loosely together | Spawning |

| Id | Kind | Look | Does |
|----|------|------|------|
| `sea.blue` | Ground | A smooth wash from `#0A2E6E` at the shelf to `#061A40` in the deep. No bed | Still |
| `fx.snow` | Effect | Pale specks `#DCE9FF` in three layers, the far ones small and dim | Sink slowly. They give the feeling of depth |
| `sea.ledge` | Cover | The last rock, with a shadowed underside | The molt shelter |
| `shrimp.adult` | Creature | Other adults, strangers and companions | Gather, drift, part |
| `thing.eggs` | Effect, discovery | A cloud of thousands of pale points | Rises from the player and spreads, like dust in light |
| `thing.longSound` | Sound, discovery, **new, optional** | No image. A long low call, far away | Once, in the deep. Never explained |

Spawning: the eggs rise. The view follows one point of light as it drifts. It becomes `larva.early`. The drift begins again, with the generation count one higher.

## Every discovery

The Discoveries page of the journal holds these. An entry appears as an outline until found. "Note" says whether a journal text exists in doc 07.

| Id | Name | Found by | Where | Note |
|----|------|----------|-------|------|
| `food.microalgae` | Microalgae | First taste | Drift | Needs a text |
| `food.algaeFilm` | Algae film | First taste | Mangrove, lagoon, channel | Needs a text |
| `food.mangroveLeaf` | Fallen leaf | First taste | Mangrove | Needs a text |
| `food.seagrassFuzz` | Seagrass fuzz | First taste | Lagoon | Needs a text |
| `food.sandFilm` | Golden film | First taste | Lagoon | Needs a text |
| `food.seaweed` | Drifting seaweed | First taste | Channel, open sea | Needs a text |
| `place.drift` | The drift | Starting | Drift | Card 8 covers it |
| `place.mangrove` | The mangrove | Arriving | Mangrove | Draft in doc 07 |
| `place.hollow` | The hollow | Entering it | Mangrove | Name only |
| `place.lagoon` | The lagoon | Arriving | Lagoon | Needs a text |
| `place.seagrass` | The seagrass | Entering the meadow | Lagoon | Draft in doc 07 |
| `place.channel` | The channel | Arriving | Channel | Needs a text |
| `place.shadow` | The shadow | Arriving | Shadow | A drawing and a name. No text, by decision D4 |
| `place.openSea` | The open sea | Arriving | Open sea | Card 8 covers it |
| `place.deep` | The deep | Reaching the deepest point | Open sea | Name only |
| `creature.shrimp` | Another one, like you | First meeting | Mangrove | Name only |
| `creature.fiddlerCrab` | Fiddler crab | Near for 2 s | Mangrove | Draft in doc 07 |
| `creature.snail` | Snail | Near for 2 s | Mangrove | Needs a text |
| `creature.smallFish` | Small fish | Near for 2 s | Mangrove, lagoon | Needs a text |
| `creature.bird` | The shadow with legs | Getting away from it | Mangrove | Name only |
| `creature.turtle` | Green turtle | Near for 2 s | Lagoon | Draft in doc 07 |
| `creature.pistolAndGoby` | Pistol shrimp and goby | Near for 2 s | Lagoon | Draft in doc 07 |
| `creature.huntingFish` | The long fish | Getting away from it | Lagoon, channel | Name only |
| `thing.seedPod` | Seed pod | Near, or when one drops | Mangrove | Needs a text |
| `thing.sunkenBranch` | Sunken branch | Reaching it | Mangrove | Name only |
| `thing.glowingPlankton` | Glowing plankton | In it for 3 s at night | Lagoon | Draft in doc 07 |
| `thing.crackle` | The crackle | In zone D for 3 s | Lagoon | Draft in doc 07 |
| `thing.eggs` | The next ones | Spawning | Open sea | Card 9 covers it |

Twenty-eight entries from what is already decided. The **new** ones below would bring it to thirty-seven.

## New things proposed

None of these is in the game until the author says so. Each is a real thing on this kind of coast, to be checked, and none is eaten or harmed.

| Id | Name | Where | Why it earns a place |
|----|------|-------|----------------------|
| `creature.hermitCrab` | Hermit crab | Mangrove | Shows fear in another animal. Ties to the journal card that cites hermit crabs |
| `creature.barnacles` | Barnacles | Mangrove roots | Relatives of shrimp that live fixed in place. Open when all is calm, shut when it is not |
| `thing.crabPellets` | Mud balls | Mangrove bank | A small mystery beside the crabs |
| `thing.breathingRoots` | Breathing roots | Mangrove | A different root to move through. A slalom |
| `drift.copepod` | A glass hopper | Drift | The larva is not alone out there |
| `drift.bell` | A drifting bell | Drift | Scale and wonder in the first minute |
| `thing.sandVolcano` | Sand mound | Lagoon | Something lives under the sand and is never seen |
| `thing.shedShell` | A shed shell | Lagoon | The player has molted by then and knows what it is |
| `thing.longSound` | A long sound | Open sea | The size of the sea, in one sound |
| `creature.seaStar`, `channel.seaFan` | Sea star, sea fan | Lagoon, channel | Optional decoration. Lowest priority |

Things considered and left out: rays and crabs that would in life eat shrimp, since they would have to be shown as harmless; anything man-made other than the hull and the net, since litter would bring a second message into a game that has one.

## Sizes at a glance

For whoever lays out an area. All in BL of that area.

| Thing | Size |
|-------|------|
| Player's collision circle | 0.26 radius |
| Root foot | 0.7 to 1.5 across |
| Root tangle | 5 to 7 across |
| Floating leaf | 3.5 to 4.5 long |
| Food patch | 1.5 to 4 across |
| Fiddler crab | 1.4 |
| Snail, hermit crab | 0.8 to 0.9 |
| Bird's foot | 3 across |
| Bird's shadow | 9 across |
| Seagrass clump | 3 to 5 across |
| Turtle | 6 long, 8 across with flippers |
| Hunting fish | 4.5 long |
| Goby | 0.75 |
| Hull shadow | 30 by 8 |
| Net grid band | 14 by 6, cells of 0.5 |
| Gap between pieces of cover in a threat area | at most 5 in the mangrove, 7 elsewhere |
| Narrowest passage the player must use | 1.2 |
