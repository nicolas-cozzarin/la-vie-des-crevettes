# 02. Mechanics and actions

Status: draft 0.2, 2026-11-13. Top-down view. All numbers are starting points for playtests and live in one file, `src/data/tuning.ts`.

Unit: **BL** means one body length of the player shrimp at its current life stage.

## Actions

| Action | Default key | What it does | Real basis |
|--------|-------------|--------------|------------|
| Move | Arrows or WASD | Walk, then swim, in any of 8 directions | Walking legs and swimmerets |
| Tail flip | Space | Fast dart. The shrimp's jump | The escape reflex of shrimp, lobsters and crayfish |
| Eat / interact | E | Graze a food patch, examine something | Feeding |
| Sense | Q (hold) | Stop and sweep the antennae. Scent trails become visible | Chemical sensing with antennae and antennules |
| Hide | Shift (hold) | Tuck under nearby cover, or burrow into sand | Sheltering and burrowing |
| Greet | F | Touch antennae with a nearby shrimp. Hold to call companions | Antennal contact |
| Journal | J | Open the carnet | |
| Pause | Esc | Pause and settings | |

Grooming is not a button. A calm, idle shrimp grooms itself, and comfort rises while it does.

## Movement

The world is a flat plane seen from above. The shrimp turns to face the direction held, then moves.

States: Drift (larva only), Walk, Swim, Dart, Hidden, Molting.

| Parameter | Value |
|-----------|-------|
| Turn rate | 540 degrees per second |
| Walk speed | 1.5 BL/s |
| Swim speed | 2.5 BL/s |
| Walk to swim | after 0.8 s of continuous movement |
| Coast to rest | 0.6 s |
| Dart distance | 3 BL in 0.25 s, then a glide of 0.6 BL in 0.35 s |
| Dart cooldown | 0.8 s |
| Darts before tiring | 3 in a row, then a 4 s recovery with darts half as long |
| Darts in a row | Less than 2.5 s apart |

Notes:
- **Walk.** Slow and exact. Used near food, shelter and other shrimp. Legs show at the sides.
- **Swim.** Starts by itself when the player keeps moving. The shrimp lifts slightly off the bed, its shadow separates, and the swimmerets flutter along its sides. Letting go settles it back down.
- **Dart.** Real tail flips throw the animal backward. The dart goes in the held direction and the shrimp is drawn travelling tail first. With no direction held it goes straight back from where it faces. The shadow drops away for a moment, which reads as a jump.
- **Tiring.** Tail flips cost real shrimp energy. Three in a row escape anything in the game.
- **Current.** Some areas push the shrimp. In the channel the tide helps travel seaward.
- **Larva.** In chapter 0 the player only steers a drifting body.

## Sense

Hold Q. The shrimp stops, the view dims slightly and scent ribbons appear on the water, drifting with the current.

| Ribbon | Shape | Colour | Meaning |
|--------|-------|--------|---------|
| Food | Smooth, wide | Green | Leads to the nearest patch of each food |
| Shrimp | Dotted | Amber | Leads to other shrimp. Brighter for companions |
| Danger | Jagged | Violet | Where a predator passed in the last 30 s |
| Unknown | Thin spiral | White | Something not yet in the journal, or an open challenge |

Shape and colour both carry the meaning, so the cue works without colour vision.

Range is 8 BL as a juvenile and 14 BL as an adult. Mangrove water is murky and sight is short there, so sensing matters most in chapter 1.

## Food

Every food is algae or plant matter. This is enforced in code: the food type is a closed list with no animal entries.

| Food | Where | Notes |
|------|-------|-------|
| Microalgae motes | Drift | Larva only |
| Algae film | Roots, rocks | The staple |
| Fallen mangrove leaf | Mangrove floor | Soft, slow to eat, very filling |
| Seagrass fuzz | Seagrass blades | Algae growing on the leaves |
| Golden sand film | Lagoon sand | Best at dusk |
| Drifting seaweed | Channel, open sea | Eaten on the move |

Eating: stand at a patch and hold E. About 4 s clears it. Hunger falls by 0.25 and comfort rises. The patch regrows in 90 s.

Enjoyment: the first taste of each food brings a short wiggle, a warm note and a journal entry. Each shrimp, companions included, has one favourite food that always brings the wiggle.

Hunger never kills and never slows the shrimp. At high hunger the posture droops, food ribbons show without pressing Sense, and the narration gives a hint.

## Hide and shelter

Cover: root tangles, rock overhangs, large leaves, seagrass clumps, and bare sand from chapter 2 on (burrowing, with eyes and antennae left showing).

Hold Shift within 1.5 BL of cover, or anywhere on sand. While hidden:
- Fear falls four times faster.
- Predators lose track after 2 s.
- The cover above turns translucent so the player still sees the shrimp. Sound is muffled.
- After 5 s of calm the player can choose "Rest until dusk" where the chapter has a day cycle.

## Feelings model

Five values from 0 to 1, updated every frame, for the player and for every other shrimp.

| Feeling | Rises with | Falls with |
|---------|------------|------------|
| Hunger | Time: 0 to 1 in about 4 min of activity | Eating |
| Fear | Shadow +0.3, predator in sight +0.5, chase holds it at 0.8 or more, companion alarm +0.2, loud noise +0.2 | Time: 0.05/s in the open, 0.2/s hidden, 0.1/s beside a bonded companion |
| Comfort | Fed, sheltered, in company, grooming | Hunger and fear |
| Curiosity | Being near something not yet discovered | Discovering it |
| Company | Other shrimp within 4 BL, more for bonded ones | Time alone, slowly |

**Mood** is the feeling that currently leads, picked in this order:

1. Afraid, if fear is above 0.5.
2. Hungry, if hunger is above 0.7.
3. Content, while eating and for 5 s after.
4. Curious, if curiosity is above 0.6.
5. Social, if company is above 0.6.
6. Calm.

### Making each mood clear

No bars. Each mood changes four things at once, so it cannot be missed.

| Mood | Body, seen from above | Movement | Sound | Screen |
|------|----------------------|----------|-------|--------|
| Calm | Antennae sweep slowly, tail fan half open | Smooth | Base music | Neutral |
| Hungry | Short antennae flick fast, body slightly curled | Smooth | Music thins out | Food ribbons faintly visible |
| Content | Front legs pass food to the mouth, tail fan sways | Still | A melody joins | Light warms |
| Curious | Antennae point at the target, body stretches toward it | Slow approach | A light high layer | Target glows softly |
| Social | Antennae reach toward others | Matches their pace | A second voice in the music | |
| Afraid | Antennae pinned back, body flat, tail fan shut | Short jerky bursts | Music drops to a low drone, sound muffled | Edges darken, view narrows |

Also:
- The first time each mood occurs, one line of narration names it. "Your body pulls tight. You are afraid."
- A change of mood takes at least 0.5 s, so the player always sees it happen.
- Body colour follows the ground the shrimp is on, as in life. Mood colour belongs to the screen, not the body.

No feeling causes failure. Feelings change how the world looks and sounds, not whether the player may continue.

## Molting

Happens at fixed story points, three times in a life.

1. **Signal.** The narration says the shell feels tight. The shrimp fidgets.
2. **Shelter.** The player finds cover and holds Hide.
3. **Molt.** The shrimp slips backward out of its old shell.
4. **Soft.** For 30 s it moves at half speed and fear rises twice as fast. Bonded companions come close and stay.
5. **Hardened.** The shrimp is larger. BL increases, so speed and sense range grow with it.

The old shell drifts away. Nothing eats it.

## Day and night

From chapter 2. One full cycle lasts 4 minutes.

| Phase | Light | Life |
|-------|-------|------|
| Day | Bright, clear | Shoal burrowed or under cover. Predators more likely |
| Dusk | Gold | Shoal comes out. Best grazing |
| Night | Indigo, glowing plankton | Calm |
| Dawn | Pale | A predator pass is likely |

## Predators and chases

One system, the threat director, decides when something frightening happens. It keeps chases fair and spaced.

Stages:

1. **Cue**, 2 to 3 s. A shadow, a low note, companions freeze. No danger yet.
2. **Presence**, 5 to 10 s. The predator searches. Cover or stillness ends it here.
3. **Chase**, at most 12 s. The predator comes for the player. Ends when the player reaches cover or gets 8 BL clear.
4. **Release.** It leaves. Music returns. The shrimp gives a small shake.

| Predator | Chapters | How it hunts, seen from above | How to get away |
|----------|----------|-------------------------------|-----------------|
| Wading bird | 1, free life | A wide shadow, then two legs standing in the water. A ring of ripples marks where the beak will strike, 1 s before it does | Leave the ring, or be under cover |
| Hunting fish | 2, 3, free life | A dark shape circling. It turns to face the player, pauses, then charges in a straight line | Dart sideways as it charges, then reach cover or burrow |
| Net | 4 | A hull shadow and engine throb, then a wide grid of shadow sweeping along the bed | Dart out past its edge, or press into a rock crevice until it passes |

Rules:
- The player should escape about four times out of five without having played before.
- **Cornered.** If a strike or charge lands: blur, an automatic dart, and the player wakes in the nearest shelter with fear at 0.9. Nothing is lost.
- At least 60 s between threats. Never two at once. Never during the soft phase of a molt.
- No predator and no net ever catches any animal on screen. Companions always get away.
- Gentle mode: stages 1 and 2 only.

Startles with no danger: a sudden current, a seed pod dropping into the water, a rain squall on the surface.

## Other shrimp

Each one has the same feelings model as the player and does one thing at a time: Wander, Graze, Rest, Groom, Greet, Follow, Flee, Hide, Molt. It picks whatever best answers its strongest feeling.

Temperament is three numbers per shrimp:

| Trait | Effect |
|-------|--------|
| Boldness | How much fear it takes to flee |
| Sociability | How far away it notices and approaches others |
| Activity | How long it rests between tasks |

From chapter 2 the shoal keeps loosely together: each shrimp steers toward the group, away from crowding and along the group's heading.

## Bonds

One value from 0 to 1 per companion. It never goes down.

| Event | Gain |
|-------|------|
| Greeting, at most once per 30 s | +0.05 |
| Grazing within 3 BL for 10 s | +0.03 |
| Sharing cover | +0.08 |
| Fleeing a threat and both reaching safety | +0.10 |
| Staying beside them during their molt | +0.15 |

| Stage | From | What changes |
|-------|------|--------------|
| Stranger | 0 | Keeps its distance |
| Familiar | 0.25 | Greets back. No longer startled by you |
| Companion | 0.5 | Follows when called. Its alarm warns you a moment early |
| Close | 0.8 | Stays through your molts. Leads you to its favourite food. Rests touching |

## Story steps

Needed to move the life forward. Shown one at a time as a line of narration, never as a list.

| Chapter | Steps |
|---------|-------|
| 0 Drift | Eat 5 motes. Reach the brown water. |
| 1 Mangrove | Eat your fill. Use Sense. Get away from the bird. Greet a shrimp. Molt. |
| 2 Lagoon | Burrow through a day. Graze with the shoal at dusk. Bring one bond to Companion. Get away from the fish. Molt. |
| 3 Channel | Follow the tide with the shoal. Get away from the fish twice. |
| 4 The shadow | Get out from under the net. Find the shoal again. |
| 5 Open sea | Molt. Swim down into the blue. Spawn. |

## Challenges

Optional. Listed in the journal by chapter. When one advances, a small line shows at the edge of the screen for 4 s ("Three tastes 2/3") and fades. The player can pin one challenge so its ribbon shows when sensing.

| Chapter | Challenge | Type |
|---------|-----------|------|
| 0 | Eat 15 motes | Taste |
| 0 | Touch another larva | Meet |
| 1 | Three tastes: try every mangrove food | Taste |
| 1 | Find the sunken branch at the far side | Reach |
| 1 | Watch a fiddler crab wave for 5 s | Watch |
| 1 | Out of the shadow: get away from the bird without being struck at | Escape |
| 1 | Greet 3 different shrimp | Meet |
| 1 | Hide beside another shrimp | Meet |
| 2 | Find the pistol shrimp and its goby | Find |
| 2 | Graze under the glowing plankton | Taste |
| 2 | Follow the turtle for 20 s | Watch |
| 2 | Learn each companion's favourite food | Meet |
| 2 | Stay with a companion through its molt | Meet |
| 2 | Sidestep a charge with a tail flip | Escape |
| 3 | Reach the sea without being cornered | Escape |
| 3 | Keep all three companions within 6 BL for a minute | Meet |
| 3 | Eat drifting seaweed without stopping | Taste |
| 4 | Leave the net by its edge | Escape |
| 4 | Wait it out in a crevice | Escape |
| 5 | Find the deepest point | Reach |
| 5 | Rest touching a Close companion | Meet |

## Achievements

Across the whole game. Kept on a page of their own.

| Achievement | Earned by |
|-------------|-----------|
| Landfall | Finishing Drift |
| New shell | First molt |
| Full grown | Third molt |
| Antenna to antenna | First greeting |
| Familiar faces | All three companions at Familiar |
| Shoal | All three companions at Close |
| Every taste | Eating all six foods |
| Nose for it | Following a food ribbon to its patch 10 times |
| Quick tail | 50 tail flips |
| Unseen | A whole chapter with no chase begun |
| Never cornered | Reaching the open sea without once being cornered |
| Under the grid | Finishing The shadow |
| Night grazer | Eating at night 10 times |
| Good neighbour | Finding the pistol shrimp and goby |
| Slow company | Following the turtle |
| Open water | Reaching the open sea |
| The next ones | Spawning |
| Second tide | Starting generation 2 |
| Fifth tide | Starting generation 5 |
| Full carnet | Every discovery found |
| All of it | Every challenge done |

## Journal unlocks

| Entry | Unlocks when |
|-------|--------------|
| A food | First taste |
| A place | First entry to the area |
| A creature | First seen within 6 BL for 2 s |
| A companion page | Bond reaches Familiar. More text at each stage |
| A "What shrimp feel" card | The event listed for that card in [07-science-and-message.md](07-science-and-message.md) |

A new entry shows as one short line at the edge of the screen and a low bell. The journal never opens by itself.

## Free life

After the first spawning the player continues as the next generation.

- Every area is open from the start. Passages at area edges lead to the next one.
- No story steps. Molts happen with time and feeding.
- Predators, day and night, the shoal and the net all continue.
- Bonds, journal, challenges and achievements carry over. Companions of the new generation keep the same names and markings.
- Reaching the open sea and spawning starts another generation.

## Saving

One save slot in the browser. Saves at each chapter start and each rest under cover. Settings save on change. "Start over" is in the pause menu and asks for confirmation.
