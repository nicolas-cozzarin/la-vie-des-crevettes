# 17. The long coast

Status: proposal 0.1, 2026-11-15. Written for decisions D37 and D34: the author wants the world as large as possible, with as many creatures and things as possible, so that there is a great deal to explore and find after the story. The shape below is proposed. Every animal and plant is believed to live on this coast and is **to check** before it is drawn.

This document gives the frame in full and each new place in outline. Before a place is built it gets a section in [11-world-catalogue.md](11-world-catalogue.md) with its zones, coordinates and sizes, as the mangrove has.

## What "large" means here

A shrimp swims 2.5 body lengths a second. The mangrove is 55 body lengths wide: 22 seconds from side to side. The five places of the story, end to end, take about two minutes to cross.

Size alone is cheap: a wide empty sea is large. What makes a world feel large is that there is always another place that is not like this one, with things in it that were not in the last. So the proposal is:

- **Twenty more places**, each a different kind of coast, each with finds of its own, and each two to four times as wide as a place of the story.
- **A clock** that changes every place with the tide, the moon and the season, so that one place is several.
- **Hunters that each sense differently**, so that a new place asks for a new way of being careful.
- **A different landing for each generation**, so that every life starts somewhere else.
- **No ceiling.** A place is one data file and one line in a table. The map can go on growing for as long as someone wants to add to it.

| | The story | With the long coast |
|--|-----------|---------------------|
| Places | 5, and the Drift | 25, and the Drift |
| Width of one place | 50 to 86 BL | 100 to 190 BL |
| Ground to cover | 1 | About 26 times as much |
| Time to swim from the land to the deep | About 2 minutes | About 5 minutes on a new stretch |
| Time to swim through every place without stopping | About 2 minutes | About 20 minutes |
| Things to find for the journal | 39 | About 200 |
| Kinds of hunter | 3: bird, fish, net | 11 |
| Time to see most of it | 25 minutes | Several evenings |

## The map

Five stretches of coast lie one above the other, north at the top. Each has five bands from the land on the right to the deep on the left, as the story's coast has (T24). The story is the middle stretch.

```
            deep          shelf          pass           lagoon          shore
           (left)                                                      (right)
          +-------------+--------------+--------------+---------------+--------------+
 cold     |               the cold current: too cold to go further                    |
          +-------------+--------------+--------------+---------------+--------------+
 Dry      | island wall | eel plain    | weed forest  | pink bed      | salt creek   |
 coast    |             |              |              |               |              |
          +-------------+--------------+--------------+---------------+--------------+
 River    | mud plain   | the plume    | river bar    | mudflats      | river mouth  |
 coast    |             |              |              |               |              |
          +-------------+--------------+--------------+---------------+--------------+
 Home     | open sea    | the shadow   | channel      | lagoon        | mangrove     |
 (story)  |             |              |              |               |              |
          +-------------+--------------+--------------+---------------+--------------+
 Rocky    | blue edge   | boulders     | reef         | the cove      | tide pools   |
 coast    |             |              |              |               |              |
          +-------------+--------------+--------------+---------------+--------------+
 Lagoon   | sand slope  | sand waves   | the inlet    | long lagoon   | old forest   |
 coast    |             |              |              |               |              |
          +-------------+--------------+--------------+---------------+--------------+
 cold     |               the cold current: too cold to go further                    |
          +-------------+--------------+--------------+---------------+--------------+
```

- Every place has a way out on each side that touches another place. Left and right follow the life of a shrimp: land to sea. Up and down follow the coast.
- **The edges of the world are true ones.** Whiteleg shrimp live where the water stays above about 20 °C all year (FAO). North and south of the map the water turns cold and green. The shrimp slows, its antennae fold back, and the narration says once: "Too cold. Your kind goes no further." There is no wall. To the left of every deep place the blue goes on, and swimming out into it as an adult leads to the gathering and the spawning.
- No map shows during play (doc 12). The journal has one: see "The journal's map".

### Where each life begins

The first life is the story. Generation 2 lands in the home mangrove with every place open, as doc 02 says. From generation 3 the larva is carried to a different shore each time: first each stretch not yet landed on, then any, drawn from the generation number. Larvae really are scattered along a coast by currents, and settle in whichever nursery they reach.

A new page in the journal, "Lives", keeps one line for each generation: where it landed, in which season, what it liked best, how far it travelled. It is the family record of the player's line of shrimp.

## The clock

One clock runs for the whole coast in the free life. It is a pure function of the seconds played in the free life, so it needs no state beyond that number.

| Cycle | Length | Phases | Basis |
|-------|--------|--------|-------|
| Day | 4 minutes, as in doc 02 | Day, dusk, night, dawn | In the game |
| Tide | 2 minutes: two tides a day | Rising, high, falling, low | Coasts of this ocean have two tides a day. To check |
| Moon | 8 days: 32 minutes | New, waxing, full, waning | |
| Season | 2 moons: 64 minutes | Dry season, rains | This coast has a dry season and a rainy one. To check for where each thing lives |

What each one does:

| When | Shore and lagoon | Pass | Shelf and deep |
|------|------------------|------|----------------|
| Low tide | Flats lie bare and cannot be crossed. Pools are cut off. Shorebirds and paws work the edges | Water runs out to sea | |
| High tide | Everything is under water. The richest film is on ground that was bare an hour before | Water runs in | |
| Full moon | Bright nights: hunters see as far by night as at dusk. Plankton glows faintly | Tides run a third faster | The gathering to spawn is larger |
| New moon | Black nights. Plankton glows strongly. The shrimp's own wake shows | Tides run a third faster | |
| Dry season | The long lagoon's inlet closes behind a bar of sand. Still water, more thin water at dawn. The weed forest is at its thickest | | Whale sharks at the plume |
| Rains | Rings of rain on the surface. The river's brown water spreads. Rafts of floating plants. The inlet breaks open | Logs and leaves come through | The long call is heard |

One mechanism serves all of it. Any thing in an area's data can carry a `when`, and is there only while the clock matches:

```ts
interface When {
  phase?: DayPhase[];
  tide?: ('rising' | 'high' | 'falling' | 'low')[];
  moon?: ('new' | 'waxing' | 'full' | 'waning')[];
  season?: ('dry' | 'rains')[];
}
```

It can be put on a creature, a piece of cover, a landmark, a current, a patch of thin water, a way out, or a zone that turns to bare ground. The story's places do not use it, so the story does not change.

## Hunters, and how each one senses

In the story the player learns two hunters. The long coast has eleven, and the point of them is that **the right thing to do depends on how the hunter finds you**. A real animal lives by telling them apart, and so will the player.

All of them run on the `ThreatDirector` of doc 10, with the same stages and the same promise: nobody is ever caught, on screen or off it. Gentle mode removes every chase. A hunter is one row in a data table: what raises its notice, what ends its visit.

| Hunter | Where | It finds prey by | What it looks like from below | What works | What does not |
|--------|-------|------------------|-------------------------------|------------|---------------|
| Wading bird | Mangrove, river mouth | Sight, from above. Movement | Feet, a shadow, a ring | Hide. Keep still | Swimming |
| Hunting fish | Lagoon, channel, weed forest | Sight, in the water. It follows | The fish and its shadow | Cover. Sidestep the charge | Open water |
| The net | The shadow, mud plain | Nothing. It sweeps | A hull, a grid | Its edge. A crevice | Outrunning it |
| Ray | Pink bed, eel plain, sand waves | The faint electricity of a buried body | A wide diamond gliding low, with a long tail | Leave the sand and swim off before it arrives | Burrowing. Keeping still |
| Octopus | Tide pools, reef, boulders | Touch. An arm feels into holes | One arm, then several, pouring out of a crack. The body changes colour | Open water. Keep 3 BL from its den | Hiding in a crevice |
| Swimming crab | River mouth, mudflats, long lagoon | Ambush. It lies half buried and lunges sideways | Two claws open on the mud, two eyes on stalks | A tail flip, which goes backward. Walk round it | Walking past its front |
| Mantis shrimp | Mud plain, sand waves | Sight, the sharpest of all. Ambush from a burrow | Two eyes that turn separately at the mouth of a hole | Keep 3 BL from the hole. Its strike is a thump that misses | Curiosity |
| Spoonbill | Mudflats, long lagoon, by day | Touch. It swings its open bill from side to side | A flat spoon sweeping in arcs through the shallows | Step between the arcs. Go deeper | Hiding in the film where it sweeps |
| Skimmer | Long lagoon, river bar, at dusk | Touch. It flies with its lower bill cutting the surface | A thin line drawn fast across the surface | Stay on the bed | Swimming high |
| Fishing bat | Long lagoon, old forest, at night | Sound, then touch. It rakes the surface with its feet | Short quick lines on the surface, and a high ticking | Stay on the bed | Swimming high |
| Paws | Old forest, mangrove, at low tide | Touch. A raccoon feels under the roots without looking | Two soft hands patting through the mud beneath a root tangle | Open water | Hiding under roots |

The bird and the paws hunt the same roots and ask for opposite answers. That is the lesson of the whole table, and it is never written anywhere.

Doc 11 left the ray and the crab out because a hunter shown as harmless would be a lie. Here they are what they are. That each of these animals lives on this coast and takes shrimp is to check.

## The places

Sizes are in pixels at the scale of the shrimp that lives there (T25). "Finds" are entries for the journal.

### Dry coast

Desert behind the shore. Clear water, strong light, hard colours. No river.

| Place | Band | Size | What it is | Finds |
|-------|------|------|-----------|-------|
| Salt creek | Shore | 14000 by 9000 | A tidal creek between flats of white salt crust. Low mangrove with fields of breathing roots. Very clear, very salty. At low tide only a thread of water is left | The salt crust. A maze of breathing roots. A fiddler colony of hundreds. Upside-down jellyfish pulsing on the bed. Mangrove oysters that shut as the shrimp nears. Tree crabs that drop from the roots with a plop |
| Pink bed | Lagoon | 18000 by 12000 | The bed is covered in pink and violet knobbly stones, each as big as the shrimp: living red algae that roll free. Countless gaps to go into | The pink stones. Scallops that clap away when startled. Sand dollars, half buried. A cushion star. Brittle star arms waving from under stones. A ray |
| Weed forest | Pass | 18000 by 10000 | Tall brown weed rising from rock toward the surface. Its canopy throws moving shade over everything. Thick in the dry season, gone in the rains, when only the holdfasts are left | The canopy. A seahorse holding a stem. A sea hare, and its purple cloud if startled. Floats that pop loose and rise. The bare forest in the rains |
| Eel plain | Shelf | 20000 by 12000 | Open sand with a colony of garden eels: hundreds of thin bodies swaying out of holes, sinking as the shrimp comes and rising behind it | The eel field. Sand dollar beds. A ray's feeding pits. A moon snail's collar of sand |
| Island wall | Deep | 14000 by 12000 | A rock wall beside an island, dropping into blue. Sea fans on the wall | Sea lions' turning shadows. Rays that leap, and the slap when they land. A whale shark passing above, in season. Sea fans |

### River coast

A big river meets the sea. Brown water, grey mud, driftwood. Everything here moves with the tide and the rains.

| Place | Band | Size | What it is | Finds |
|-------|------|------|-----------|-------|
| River mouth | Shore | 16000 by 10000 | Mud banks and drowned logs under tea-brown fresh water. Rafts of floating plants come down in the rains and are roofs to hide under | Sweet water. A crocodile's shadow, which silences everything and takes no notice of a shrimp. Four-eyed fish at the surface, which scatter before a bird comes. A log full of borings. A floating raft |
| Mudflats | Lagoon | 24000 by 14000 | The widest place on the map, and at low tide the smallest: most of it lies bare, with channels and pools between. At high tide a plain of rich film | Bird footprints pressed in the mud. A flock of small shorebirds. The spoonbill. A pool cut off by the tide. Worm casts. The mounds of ghost shrimp |
| River bar | Pass | 18000 by 8000 | Where river and tide fight. Bands of light race across the bed under the waves. The fastest water on the map, one way and then the other | The line where brown water meets blue. A drifting coconut. Rolling logs in the rains. Dolphins, as clicks and quick shadows |
| The plume | Shelf | 18000 by 12000 | The river's water lies on top of the sea's. Things gather along its edge: foam above, drifting weed, jellyfish, schools of small fish | Round jellyfish that drift, with room to shelter under their bells. The foam line. A whale shark in the dry season |
| Mud plain | Deep | 20000 by 14000 | Soft mud in dim green water: where grown whiteleg shrimp live. Many adults of three kinds of shrimp. The net works here | Blue shrimp and brown shrimp, cousins that do not answer a greeting the same way. Sea pens that light up when brushed. The trail of a heart urchin. A mantis shrimp's hole |

### Rocky coast

Headlands and small bays. Surf, clear water, rock everywhere.

| Place | Band | Size | What it is | Finds |
|-------|------|------|-----------|-------|
| Tide pools | Shore | 12000 by 8000 | One water at high tide. At low tide, a chain of pools joined by narrow spillways. Each pool is a small world | Sea anemones that fold shut when brushed. Urchins in holes they have worn in the rock. A chiton. Hermit crabs trying on shells. A blowhole that booms at high tide. An octopus's den, ringed with empty shells |
| The cove | Lagoon | 16000 by 10000 | A sandy bay with boulders. Surf along its top edge | The hollow where a turtle sleeps. Sand crabs that bury themselves backward in the surf and raise feathery antennae. Pelicans striking the water above, a harmless fright. In the rains, a turtle crossing to the beach at night |
| Reef | Pass | 18000 by 10000 | Rock and heads of coral. The most colour on the map | A small fish that farms a lawn of algae and bumps every visitor off it, the shrimp included. Urchins whose long spines are a shelter. The antennae of a spiny lobster sticking out of a hole, and its rasping sound. Sea fans |
| Boulders | Shelf | 18000 by 12000 | House-sized rocks with caves between. Dark in the caves by day | A cave. A sea cucumber and the trail of sand it leaves. A parrotfish asleep at night in a bubble of its own making |
| Blue edge | Deep | 14000 by 12000 | The shelf ends at a canyon. Cold green water wells up from it | The cold coming up from below. Specks rising instead of sinking. The long call, nearer here |

### Lagoon coast

A long bar of sand with shallow lagoons behind it. Warm, still, green.

| Place | Band | Size | What it is | Finds |
|-------|------|------|-----------|-------|
| Old forest | Shore | 16000 by 10000 | Tall, old mangrove on a bank of dark peat riddled with crab holes | The peat bank. Oysters on the roots. Paws, at low tide. A fallen tree, the largest shelter on the map |
| Long lagoon | Lagoon | 24000 by 12000 | Very wide and very shallow. Meadows of thin seagrass, drifting mats of algae. In the dry season its inlet is shut and nothing moves | Mullet that graze the same film and leap. Jellyfish in spring. The fishing bat. Thin water under the mats at dawn. The first rain |
| The inlet | Pass | 12000 by 7000 | The lagoon's one door to the sea. Shut by a bar of sand in the dry season, torn open by the rains | The closed bar. The day it breaks, when everything in the lagoon leaves at once |
| Sand waves | Shelf | 20000 by 12000 | Dunes of sand under water, in long rows | Sand dollar beds. A ray. A swimming crab's eyes. Trails of snails |
| Sand slope | Deep | 14000 by 12000 | A long slope of sand going down into blue | A field of sea pens. The gathering, larger at full moon |

The pond wall of doc 18 (D39) also stands along the back of the old forest, where the trees end in a straight line.

## New creatures and things, in one list

For whoever draws them. Each is one or more pictures in doc 14's manifest when its place is built. None is eaten or harmed. "Reacts" means it answers the player, which is what makes a find worth going back to.

### Neighbours that take no notice

| Thing | Look from above | Does |
|-------|-----------------|------|
| Crocodile | A long dark shadow with a ridged back, 40 BL | Passes slowly. Fish scatter, crabs go down their holes. It never notices a shrimp |
| Whale shark | A vast shadow dotted with pale spots, at the surface | Passes once. Small fish travel under it |
| Leaping rays | Dark diamonds crossing fast overhead, then rings and a slap | In groups, at dusk |
| Sea lions | Long shadows that twist and roll | Play at the surface. Gone in a moment |
| Dolphins | Quick curved shadows and a run of clicks | Pass through the bar on the tide |
| Pelican | A burst of bubbles from the surface, a great bill, gone | A harmless fright. The shrimp gets used to it (doc 18, `habit`) |
| Turtle, asleep | The turtle of the lagoon, still, in a hollow of its own shape | Does not wake |
| Four-eyed fish | Small shadows at the surface, each with two bright dots | Scatter two seconds before a bird's cue: an early warning for a shrimp that watches them |
| Mullet | A school of thick-bodied grey fish on the bed | Graze the film in a line, leaving a clean track. Leap |
| Seahorse | A small curled shape gripping a stem by its tail | Sways with the weed. Turns away slowly |
| Parrotfish, asleep | A fish inside a clear bubble, at night | Does not wake |
| Farmer fish | A small dark fish over a bright green lawn on the rock | Bumps the shrimp off its lawn, 1 BL, with no harm. It can be outwaited when it chases someone else |

### Things that react

| Thing | Look from above | Reacts |
|-------|-----------------|--------|
| Garden eels | Thin pale bodies swaying out of the sand, hundreds | Sink within 4 BL of the shrimp, rise again behind it, like wind through grass |
| Scallops | Fan shells lying open, with a row of tiny blue eyes | A tail flip nearby sends them clapping away in zigzags |
| Sea anemone | A flower of soft tentacles on rock | Folds shut when brushed. With the sting of doc 18, it stings |
| Sea hare | A fat brown slug with two ear-like flaps | Grazes. A tail flip beside it brings a purple cloud |
| Barnacles, oysters | As in doc 11 | Open when all is calm, shut when it is not |
| Hermit crabs | As in doc 11, in many shells | Two will try each other's shells if left alone |
| Sand crabs | Small grey barrels in the wash of the surf | Bury themselves backward as each wave pulls back, antennae up |
| Sea pens | Pale feathers standing in the mud | Light up blue-green when brushed, then fade |
| Tree crab | A small dark crab on a root above the water | Drops in with a plop, and climbs back out |
| Sea cucumber | A thick knobbly sausage, slow | Leaves a string of sand behind it |
| Urchins | Black balls of long spines, or purple ones sunk in holes | The long spines turn toward the shrimp. Among them it is sheltered from fish |
| Upside-down jellyfish | A frilled disc lying on the bed, pulsing | Pulses faster when the water moves |
| Drifting jellyfish | A round pale bell, 4 BL | Drifts. A shrimp under the bell is hidden from above: a roof that moves |
| Floating raft, coconut, log | A dark shape on the surface with its shadow below | Drifts. Shelter from the bird |

### Relatives

Shrimp are one branch of a large family, and the long coast is where the player meets the rest of it. A group of their own on the Discoveries page.

| Relative | What it shows |
|----------|---------------|
| Blue shrimp, brown shrimp | Other kinds of shrimp share the same water and are not the same animal. One is out by day, one buries deeper |
| Snapping shrimp | The crackle, and close up a single loud snap |
| Ghost shrimp | Never seen. Its mounds puff sand |
| Mantis shrimp | Not a shrimp at all |
| Hermit crab, fiddler crab, tree crab, swimming crab, sand crab | Five ways of being a crab |
| Spiny lobster | Antennae longer than its body, and a voice |
| Barnacles | A relative that glued itself down head first and catches food with its legs |

### Traces

Things left behind, which tell the player who was here. Each is a find, and each teaches the player to read the bed.

Bird footprints in mud. A ray's feeding pits. A moon snail's collar of sand. Worm casts. A turtle's hollow. A ring of empty shells round an octopus's den. The clean track of grazing mullet. A shed shell (D34). Crab pellets (D34). The line of foam where two waters meet. The salt crust.

### Weather and sound

Rain on the surface: rings everywhere, and a patter. Thunder: one flash, one roll, a fright. Swell in the pass: the water pushes forward and back. Cloud shadows. The evening chorus of fish, a hum that rises at dusk in the river mouth. The blowhole. The lobster's rasp. The slap of a ray. The long call (D34).

## More to eat

`FoodKind` is a closed list and each addition needs the author's yes (doc 09). Three are proposed for the long coast. All are algae.

| Food | Where | Look |
|------|-------|------|
| Sea lettuce | Tide pools, river bar | Thin bright green sheets, ruffled |
| Turf | Reef, boulders | A short dense lawn on rock. The farmer fish's lawn is the best of it |
| Log film | River mouth, the plume | A brown-green coat on drifting wood |

With them, "Every taste" would ask for nine foods.

## How a large place is filled

The mangrove holds about 250 hand-placed things in 6000 by 4000 pixels. A place ten times that size cannot be placed by hand, and should not be drawn by chance either. So a place is made of two layers:

- **Landmarks, by hand.** The things a place is known by: the octopus's den, the turtle's hollow, the fallen tree, each find. Placed with exact coordinates, as now.
- **Fields, by rule.** "Roots over this zone, this thick, never closer than this." A field is expanded into ordinary obstacles, cover, food or scatter when the area loads, from a seed, so it is the same for every player and every visit.

```ts
interface FieldDef {
  kind: 'obstacle' | 'cover' | 'food' | 'creature';
  zone: Zone;
  images: string[]; // or a food kind, or a creature kind
  count: number;
  seed: number;
  size: [number, number];
  /** The least distance between two of them, and from any landmark. */
  gap: number;
}
```

The expansion lives in `src/core/world/` and is tested: the same seed gives the same place, nothing lands inside something solid, every passage the player needs stays at least 1.2 BL wide, and cover is never more than 7 BL away. The area test of doc 19 runs on the expanded place, so a field cannot break a rule that a hand-placed thing could not.

## The journal's map

A new page, "The coast". The left page is the map above as twenty-five small watercolours in a grid. A place not yet visited is bare paper with a pencil outline. A visited one is painted, with a count beneath it: "7 / 11". The right page shows the chosen place larger, with its finds as small drawings, pencil or inked.

There is no marker for where the shrimp is and no route. It is a record, not a guide.

## Goals for the long coast

Drafts. Names and texts would go into doc 13, conditions into doc 12.

| Kind | Goal | Done when |
|------|------|-----------|
| Challenge | Ride one tide from the mudflats to the plume | Three places crossed without walking |
| Challenge | Cross the mudflats on a falling tide | Reaching the far side before low water |
| Challenge | Sit out a low tide in a pool | Staying in one cut-off pool from falling to rising |
| Challenge | Hide under a drifting bell | 5 s under a jellyfish while a bird is present |
| Challenge | Walk through the eel field without one sinking | Crossing at a walk, slowly enough |
| Challenge | Graze the farmer's lawn | One full graze on its turf |
| Challenge | Watch two hermit crabs trade shells | Within 3 BL for the whole trade |
| Challenge | See the forest gone and grown back | Visiting the weed forest in both seasons |
| Challenge | Be there when the inlet breaks | In the inlet at the first rain |
| Challenge | Hear the evening chorus | In the river mouth at dusk |
| Challenge | Meet a cousin | A greeting offered to a blue or a brown shrimp |
| Challenge | Find where the turtle sleeps | The hollow |
| Achievement | Every hunter read | Each of the eleven met and left without a chase |
| Achievement | Whole coast | Every place visited |
| Achievement | Both ends | Reaching the cold in the north and in the south |
| Achievement | Four tides | One place seen at high, low, rising and falling water |
| Achievement | Dark moon | A graze under the plankton at new moon |
| Achievement | Two seasons | One life that sees the rains come |
| Achievement | Landed everywhere | A generation begun on each of the five shores |
| Achievement | The family | Every relative found |

## What keeps it true and calm

- No animal is eaten on screen, by anyone. Hunters hunt and never catch.
- An animal that would eat a shrimp is a hunter or a shadow. It is never a friend.
- Nothing man-made except the pond wall (D39).
- A threat still needs 60 s of quiet before the next. More kinds of hunter do not mean more frights an hour.
- Every place has cover within 7 BL of any point, as doc 11 asks.
- Nothing in the long coast is needed to finish anything in the story.

## What it takes to build

| Piece | Where | Size of the work |
|-------|-------|------------------|
| The coast table: stretches, bands, places, neighbours | `src/data/coast.ts` | Small. Tests in doc 19 keep it whole |
| Each place loaded only when entered | A dynamic import per area file | Small. Keeps the first load short |
| The clock | `src/core/world/clock.ts`, pure, tested | Small |
| `when` on things in area data | `src/data/areas/types.ts`, the area loader | Small |
| Fields | `src/core/world/fields.ts`, pure, tested | Medium |
| Bare ground at low tide | A zone that becomes solid | Small |
| The hunters table | `src/data/hunters.ts`, and one rule per way of sensing in `ThreatDirector` | Medium: eight new rules |
| Things made near the view only | The area loader | Medium. Needed from the first large place |
| Landing by generation, the "Lives" page, the map page | `src/core/progress/`, the journal | Small each |
| Each place | One data file, its pictures, its section in doc 11, its sounds | Large. About one working session a place for data and pictures |

Proposed order, after release 1.0. Each is a release that can be played:

1. **1.1 The clock and the home coast.** Tide, moon and season in the five places that exist. No new place.
2. **1.2 Rocky coast.** Tide pools first: the smallest place, with the most that reacts.
3. **1.3 River coast.** The mudflats and the bar are where the tide matters most.
4. **1.4 Dry coast.**
5. **1.5 Lagoon coast.**

## Open questions

1. Is this the right shape: named, hand-made places on a map that grows, and not a world drawn by chance? Default: yes. A world drawn by chance is larger and emptier.
2. The eight new hunters. Default: yes, all of them (see doc 09, question 3).
3. The three new foods. Default: not added until the author says so.
4. Should the clock also run in the story's places once the story is over? Default: yes.
5. Names. "Dry coast", "River coast", "Rocky coast" and "Lagoon coast" are working names, and so are the places'.
