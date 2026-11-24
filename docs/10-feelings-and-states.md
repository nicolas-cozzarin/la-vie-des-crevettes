# 10. Feelings and states

Status: draft 0.1, 2026-11-14. Everything here is **proposed** unless a decision number says otherwise. Numbers are starting points for playtests and belong in `src/data/tuning.ts`.

[02-mechanics.md](02-mechanics.md) gives the overview. This document gives the exact rules: what each feeling is, what moves it, how it shows, what the body can be doing, and how every fright plays out second by second. Where the two differ, this document is right and doc 02 gets corrected.

It is written so that `FeelingsModel`, `ThreatDirector` and the other rule code in `src/core/` can be built and unit-tested without further design.

Unit: **BL** is one body length of the shrimp at its current size.

## Words

| Word | Meaning | Example |
|------|---------|---------|
| Feeling | One of five numbers from 0 to 1 | fear = 0.62 |
| Mood | The feeling that leads right now. One of six | afraid |
| Condition | A yes or no fact about the shrimp that changes rules or posture | wary, soft, tired |
| Activity | What the body is busy with | grazing, hiding, greeting |
| Stimulus | Something that happens to the shrimp and moves a feeling | a shadow passes |
| Motion mode | How it is moving. Already built in `ShrimpMotion` | rest, walk, swim, dart, glide |

Feelings are the inside. Moods, conditions and activities are what the player sees.

## What it rests on

Rule D7: only behaviours real shrimp show, simplified. Each behaviour below names its basis. Keys refer to the source table in [07-science-and-message.md](07-science-and-message.md). Nothing in this table is a journal text.

| Behaviour in the game | Basis | Standing on 2026-11-14 |
|-----------------------|-------|------------------------|
| Tail flip as escape, backward, with the tail fan and the antennal scales spread | ARNOTT1998, in the brown shrimp *Crangon crangon* | Citation and abstract read |
| Tiring after several tail flips | Common in crustacean escape studies | To check a reference |
| Freezing when something large passes | LSE2021 | Shown in several decapods. To check for shrimp |
| Hiding, and leaving a shelter only when the cost of staying is high | ELWOOD2009, hermit crabs | Citation and abstract read |
| Staying wary after a fright, keeping near cover | FOSSAT2014, crayfish | Read at second hand on 2026-11-16: the state lasted about an hour. The paper is still to read |
| Avoiding the place where the fright happened | LSE2021 | To check which study |
| Finding food by scent, with the antennules flicking faster when food is near | CHEMO2020, whiteleg shrimp | Read 2026-11-16: the short antennae lead the search for food. Faster flicking near food is not in what was read |
| Grooming the antennae | BARR2008, the prawn *Palaemon elegans* | Reference confirmed |
| Burrowing in sand by day, active at night | SANTOS2013 and PONTES2006, two studies of whiteleg shrimp | Read 2026-11-16, abstracts: burial mostly by day, more moving and swimming in the dark |
| Molting in shelter, soft and slow afterwards | Crustacean biology | Established. To check a reference |
| Larvae that do not eat at first | FAO: "Nauplii do not feed, but live on their yolk reserves" | Read |
| Body tint follows the ground | FAO | Read |
| Gathering in groups | To check a reference for whiteleg shrimp | To check |
| Fear easing beside a companion | None for shrimp | Design choice |
| One favourite food per individual | None for shrimp | Design choice |
| Alarm spreading through a group | Common in group-living animals | Design choice until checked |

If a "to check" does not hold, the behaviour stays in the game only if it is harmless to the truth of the animal, and no journal card may rest on it.

## The five feelings

All five run for the player and for every other shrimp, every step of the game clock. Each is clamped to 0 to 1.

"Moves toward a target with time T" means: `value += (target - value) * (1 - exp(-dt / T))`. This is `approach(dt, T)` in `src/core/movement/angles.ts`.

### Hunger

Rises with time and effort. Falls only by eating.

| What | Value |
|------|-------|
| Rise while walking | 1/240 per second: empty to full in 4 minutes |
| Factor at rest | 0.5 |
| Factor while hidden, burrowed or resting | 0.3 |
| Factor while swimming | 1.2 |
| Each tail flip | +0.006 |
| Larva in Drift | 1/120 per second |
| After a molt hardens | +0.2 |

Eating lowers hunger steadily for as long as the graze lasts, so letting go early gives part of the meal.

| Food | Hunger removed | Time to eat | Notes |
|------|----------------|-------------|-------|
| Microalgae mote | 0.08 | on touch | Larva only |
| Algae film | 0.25 | 4 s | The staple |
| Fallen mangrove leaf | 0.45 | 8 s | Slow, very filling |
| Seagrass fuzz | 0.20 | 3 s | |
| Golden sand film | 0.25, or 0.35 at dusk | 4 s | |
| Drifting seaweed | 0.15 | on touch, while moving | No stop needed |

Levels:

| Hunger | Name | What changes |
|--------|------|--------------|
| below 0.15 | Full | Grazing stops by itself. The graze prompt is not shown. A food not yet tasted can still be tried for 1 s |
| 0.5 and up | Peckish | Antennules flick faster. No mood change |
| 0.7 and up | Hungry | Mood can become hungry. Food ribbons within 5 BL show faintly without Sense |
| 0.9 and up | Very hungry | The antennae lean toward the nearest food. A narration hint, at most once every 90 s |

Hunger never slows the shrimp and never ends anything (T8).

Starting values: Drift 0.65. Mangrove 0.62, so the first hunger comes about 20 s after the player starts walking. Later chapters carry the value over.

### Fear

Rises in jumps when something happens. Falls with time, faster in safety.

Gains. Each is multiplied by the shrimp's **sensitivity**, and one stimulus never adds more than 0.6.

| Stimulus | Gain | Notes |
|----------|------|-------|
| A large shadow crosses within 3 BL | +0.30 | Bird wing, hull, turtle the first time |
| A predator comes into sight | +0.50 | Once per visit |
| A strike or charge misses nearby | +0.10 | |
| A companion or neighbour takes fright within 5 BL | +0.20 | At most once every 5 s |
| A sudden harmless event: seed pod, squall, gust of current | +0.15 to +0.25 | See "Startles" |
| A loud low sound: the engine | +0.20, then +0.05 per second while it grows | |
| Being under the net's grid | +0.15 per second | |
| Cornered | set to 0.90 | |

Sensitivity is 1, times 2 while soft after a molt, times 1.5 while wary. For other shrimp it is also multiplied by `1.3 - 0.6 * boldness`.

Holds:
- While a predator is in the **chase** stage and after this shrimp, fear cannot be below 0.8.
- While a predator is in sight during **presence** or **chase** and the shrimp is not hidden, fear does not fall.
- While a predator is present within 8 BL, fear cannot be below 0.5, hidden or not. Relief comes when it leaves, not before.

Fall, per second. Only the largest applies.

| Situation | Fall per second |
|-----------|-----------------|
| In the open | 0.05 |
| Within 2 BL of a companion whose bond is 0.5 or more | 0.10 |
| Resting against a Close companion | 0.15 |
| Hidden or burrowed | 0.20 |
| Hidden while a predator is still present | 0.10 |

After being cornered, fear stays at 0.9 for 3 s before it starts to fall.

### Comfort

Not driven by events. It follows a target made from the other feelings and the situation.

```
target = 0.35
       + 0.25 * (1 - hunger)
       + 0.15 * sheltered        // 1 if hidden, burrowed or within 1.5 BL of cover
       + 0.15 * company
       + 0.10 * settled          // 1 while grooming or resting
       - 0.60 * fear
```

Comfort moves toward the target with a time of 8 s when rising and 2 s when falling. Fright empties it fast. Ease returns slowly.

What comfort does:
- Above 0.5, a calm idle shrimp starts to groom after 4 s.
- Above 0.6, hidden and calm for 5 s, the player may choose "Rest until dusk".
- It sets how wide the tail fan sways when content and how bright the music sits.
- A discovery adds 0.1 at once.

### Curiosity

Pulled by the nearest thing the shrimp has not yet come to know.

```
for each undiscovered thing within range R:
    pull = weight * (1 - distance / R)
target = the largest pull, or 0 if fear is 0.5 or more
```

R is the Sense range: 8 BL for a juvenile, 11 for a sub-adult, 14 for an adult. Curiosity moves toward the target with a time of 1 s when rising and 3 s when falling. The thing with the largest pull is the **curiosity target**.

| Thing | Weight |
|-------|--------|
| A creature or a landmark not in the journal | 1.0 |
| A food not yet tasted | 0.8 |
| The target of a pinned challenge | 0.6 |

Curiosity reaches 0.6 at 3.2 BL from a creature when R is 8. That is where the mood changes and the antennae point.

Discovery, which empties the pull of that thing for good:

| Kind | Discovered when |
|------|-----------------|
| Creature | Within 2.5 BL for 2 s, on screen |
| Object or landmark | Within 1.5 BL for 1 s, or Interact within 1.5 BL |
| Food | First taste |
| Place | Entering it |
| Something in the water or the air: glowing plankton, rain, the crackle | Being in it for 3 s |

This replaces "within 6 BL for 2 s" in doc 02. At 6 BL the creature is at the edge of the view and the player has not looked at it yet. The chain is now: a white ribbon when sensing from 8 BL, the curious mood from 3.2 BL, the discovery at 2.5 BL.

### Company

```
target = min(1, sum of weights of every shrimp within 4 BL)
```

| Other shrimp | Weight |
|--------------|--------|
| Stranger | 0.30 |
| Familiar, or a shoal member greeted once | 0.45 |
| Companion | 0.70 |
| Close | 1.00 |

Company moves toward the target with a time of 2 s when rising and 20 s when falling. Being alone costs nothing except the share of comfort that company gives.

## Conditions

| Condition | True when | Effect |
|-----------|-----------|--------|
| `tired` | After 3 tail flips in a row, for 4 s. Already in `ShrimpMotion` | Darts half as long. Tail fan droops |
| `peckish` | hunger at 0.5 or more | Antennules flick faster |
| `veryHungry` | hunger at 0.9 or more | Antennae lean to food |
| `sheltered` | Hidden, burrowed or within 1.5 BL of cover | Comfort target up |
| `hidden` | Tucked under cover | Fear falls fast. Predators lose track after 2 s |
| `burrowed` | Dug into sand, from chapter 2 | As hidden |
| `frozen` | No movement input for 1 s while fear is 0.3 or more | Body flat and still. Harder for a predator to notice |
| `startled` | For 0.35 s after any fear gain of 0.15 or more | A flinch. See below |
| `wary` | After a fright has passed. See below | Sensitivity times 1.5. Alert posture. No grooming |
| `premolt` | From the molt signal until the molt begins | Fidgeting. Scratching at the shell |
| `soft` | For 30 s after a molt | Half speed. Sensitivity times 2. Paler. No threat may start |
| `inCurrent` | Standing in a current zone | Antennae and tail fan trail downstream |

### Wary

After a bad moment the shrimp is not calm again at once. This is the game's version of what was observed in crayfish (FOSSAT2014, read at second hand).

- Starts when the afraid mood ends.
- Lasts 20 s. After being cornered, 40 s. After a harmless startle, 10 s.
- Sensitivity is times 1.5, so the next fright bites harder.
- The mood can be anything, but the body keeps an alert look: antennae held higher and wider, short pauses when walking, no grooming.
- Other shrimp that are wary stay within 3 BL of cover.
- The uneasy music stays in at low level and fades over the wary time.
- Ends early after 10 s of rest in cover. A greeting with a bonded companion takes 10 s off.
- Leaving cover while wary after a chase unlocks the journal card "Still wary".

### Startle

A flinch, 0.35 s. The body jerks 0.15 BL back and the antennae snap back, then both return. It is drawn by the rig only. The shrimp's real position and the player's control are not touched.

### Danger memory

Where a predator struck, charged or stood, a mark stays on the bed for 60 s. Other shrimp will not walk within 3 BL of it. For the player the mark is the violet danger ribbon seen with Sense. The ribbon is the player's own memory of the place.

## Mood

The mood is the leading feeling. Checked in this order. The first that is true wins.

| # | Mood | Becomes true when | Stops being true when |
|---|------|-------------------|-----------------------|
| 1 | Afraid | fear at 0.5 or more | fear below 0.4 |
| 2 | Content | grazing, during a first-taste wiggle, and for 5 s after a graze ends | the 5 s run out |
| 3 | Hungry | hunger at 0.7 or more | hunger below 0.55 |
| 4 | Curious | curiosity at 0.6 or more | curiosity below 0.45 |
| 5 | Social | company at 0.6 or more | company below 0.45 |
| 6 | Calm | nothing above is true | |

Content now ranks above hungry. In doc 02 it ranked below, which meant a hungry shrimp showed no pleasure in its first bites. Eating must feel good at once.

Timing:
- A change to afraid happens at once.
- Any other change needs the new mood to stay true for 0.4 s, and the old mood to have lasted 1.5 s.
- The body takes 0.3 s to change when becoming afraid and 0.6 s otherwise. The screen and the music always take at least 0.5 s (comfort rules, doc 04).
- The first time each mood occurs in a save, the narration names it once. With "Name feelings on screen" on, the word shows at every change.

## How each mood shows

Four channels at once: body, movement, sound, screen. A player with sound off, or who cannot tell colours apart, still gets two.

### Body

The rig takes an **expression**: a set of numbers that it blends toward. The full list of channels and their values is in [14-art-production.md](14-art-production.md). In words:

| Mood | Antennae | Antennules | Tail fan | Body | Legs |
|------|----------|------------|----------|------|------|
| Calm | Out at a relaxed angle, slow sweep, out of time with each other | Slow flick | Half open, still | Straight | Normal stance |
| Hungry | Lower and more forward, short quick sweeps | Fast flick | A third open | Slightly drawn in, head a little down | Front pair reaching and tapping the bed |
| Content | Loose, drooping a little | Slow | Half open, swaying side to side | Slight rocking | Front pairs pass food to the mouth |
| Curious | Both pointing at the target, almost straight | Medium, pointing at the target | Half open | Stretched toward the target, carapace leaning | Front pair lifted |
| Social | Reaching toward the nearest shrimp, tips trembling | Medium | Half open, small flicks | Turned toward the other | Normal |
| Afraid | Pinned back along the body, stiff | Still | Shut | Pressed flat, a fine tremble | Drawn in close |

Conditions add to the mood's look:

| Condition | Adds |
|-----------|------|
| wary | Antennae 20% higher and wider than the mood asks. A pause of 0.4 s every few steps |
| frozen | Everything stops, antennules too. The shadow hugs the body |
| tired | Tail fan droops shut. Swimmerets beat slowly |
| premolt | A scratch at the carapace with a back leg every 3 to 5 s. Small shudders |
| soft | Body 15% more see-through and paler. Movements slower. Antennae held low |
| inCurrent | Antennae, legs and fan lean 25 degrees downstream |
| grooming | One antenna is drawn down through the front legs, 2.5 s, then the other |

Body colour never shows mood. It follows the ground (doc 04).

### Movement

| Mood | Player's shrimp | Other shrimp |
|------|-----------------|--------------|
| Calm, content, social | As the player steers | Smooth, unhurried |
| Hungry | As steered | Walks straight to food |
| Curious | As steered | Approaches in short advances with pauses |
| Afraid | As steered. Walking gains a small stutter in the rig only | Short bursts, then stillness |

The player's control is never changed by a mood. Only two things change real speed: `soft` (half) and a current.

### Sound

Mixing rules are in [05-audio-direction.md](05-audio-direction.md). Added here:

| State | Sound |
|-------|-------|
| wary | Uneasy track at 15% under the area track, fading out over the wary time |
| frozen | The shrimp's own sounds stop. Ambience comes forward |
| startled | A short soft thump, like a held breath |
| soft | Own sounds lower and duller |

### Screen

Driven by `MoodPresenter`. All changes take at least 0.5 s. Nothing flashes.

| Mood | Edges | Colour | View | Other |
|------|-------|--------|------|-------|
| Calm | Area default | None | Normal | |
| Hungry | Default | Slightly less saturated, 10% | Normal | Food ribbons within 5 BL at 30% strength |
| Content | Lighter | Warm tint `#F2D58A` at 8% | Normal | |
| Curious | Default | None | Eases 5% toward the target | The target gets a soft pale rim |
| Social | Default | None | Normal | Other shrimp very slightly brighter |
| Afraid | Dark, reaching 35% into the picture | 25% less saturated, cooler | Zooms in 8%. Off with reduced motion | Sway is stopped |

With `wary`, the afraid edges stay at a third of their strength and fade over the wary time.

## Activities

One at a time. An activity sits on top of the motion mode.

| Activity | Starts when | The body | Input still taken | Ends when |
|----------|-------------|----------|-------------------|-----------|
| `free` | By default | Follows the motion mode | Everything | |
| `sensing` | Sense is held, or toggled on | Coasts to rest within 0.3 s. Antennae sweep wide and slow. View dims slightly. Ribbons appear over 0.4 s | Turning in place, tail flip, pause, journal | Sense released. A tail flip also ends it |
| `grazing` | Interact is held within 0.6 BL of a food patch | Steps to the patch edge in 0.3 s. Head down, front legs picking | Release, any movement, tail flip | Released, moved, patch cleared, full, or fear reaches 0.5 |
| `examining` | Interact is pressed within 1.5 BL of an undiscovered object | Antennae touch it for 1 s | Movement cancels | 1 s passes: discovery |
| `hiding` | Hide is held within 1.5 BL of cover | Walks under it by itself and tucks in (about 1 to 1.6 s, T58). The cover fades to 40% | Release, tail flip | Hide released, or a tail flip, which throws it out of cover |
| `burrowing` | Hide is held on sand, from chapter 2, not near cover | Digs in over 1.2 s. Eyes and antennae stay out | Release | Hide released: out in 0.5 s |
| `greeting` | Greet is pressed within 2 BL of another shrimp | Turns to face it. Antennae reach and tap twice, 0.9 s | Nothing for 0.9 s | Done. Bond gain if allowed |
| `calling` | Greet is held 0.6 s with no shrimp within 2 BL | Antennae wave in wide arcs | Release | Released. Companions within 14 BL start to come |
| `resting` | "Rest until dusk" is chosen | Tucked, still | Any key wakes it | Dusk, or a key |
| `molting` | The molt begins | The molt sequence | None for 6 s | The soft phase begins |
| `cornered` | A strike or charge lands | The cornered sequence | None | Wakes in shelter |
| `drifting` | Larva, chapter 0 | Carried by the water | Steering | The chapter ends |

Rules:
- A tail flip is always available except while molting, cornered or resting. Fear must never lock the player's escape.
- If fear reaches 0.5 during `sensing`, `grazing`, `examining`, `greeting` or `calling`, the activity ends at once.
- `hiding` and `burrowing` both set the `hidden` or `burrowed` condition after the body has finished tucking in.
- With Sense or Hide set to toggle, a second press ends it, and so does a tail flip.

Prompts: a prompt for an activity appears only when it can start, and only the first three times (doc 03).

## Threats

One system, the `ThreatDirector`, owns every frightening event. Nothing else may start one.

### Stages

```
idle -> cue -> presence -> release -> idle
                  |
                  +-> chase -> release
                         |
                         +-> cornered -> release
```

| Stage | Length | What is true |
|-------|--------|--------------|
| `idle` | At least 60 s after the last release | Nothing |
| `cue` | 2 to 3 s. The net: 4 s | Signs only. Nothing can hurt. Other shrimp freeze |
| `presence` | 5 to 10 s | The predator is there and searching. It notices movement |
| `chase` | At most 12 s | It comes for the player |
| `cornered` | About 4 s | See "Cornered" |
| `release` | 3 to 4 s | It leaves. Relief |

Never two threats at once. Never during `soft`. Never in Drift or in the open sea. In gentle mode there is no `chase`: `presence` always ends in `release`.

### When a threat starts

- **Scripted.** The first bird in chapter 1, the dawn fish in chapter 2, the fish in the channel and the net are started by area triggers.
- **Ambient.** In the mangrove, lagoon and channel, once the 60 s gap has passed, the director rolls every 10 s. The chance is set so the average wait is about 150 s. In the lagoon the chance doubles by day and at dawn and halves at night.
- In the story, the mangrove has at most one ambient bird after the scripted one.

### Being noticed

During `presence` the predator holds a hidden number, **notice**, from 0 to 1. At 1 the chase begins.

| The player is | Notice changes by |
|---------------|-------------------|
| Hidden or burrowed | -1.0 per second, and cannot rise |
| Still in the open | -0.3 per second |
| Walking within range | +0.35 per second |
| Swimming within range | +0.6 per second |
| Tail flipping within range | +0.5 at once |
| Beyond range, or beyond sight in murk | 0 |

Range is 6 BL for the bird and 7 BL for the fish. Beyond half the range, gains are halved.

So there are three honest ways through a visit: hide, keep still, or get far away. All three are things shrimp do.

The first scripted bird halves every gain. It is the lesson.

### The wading bird

Mangrove. Seen from above it is never whole: a shadow, two legs, a beak.

| Part | Numbers |
|------|---------|
| Shadow | 9 BL across. Soft. Slides in at 3 BL per second |
| Legs | Two. Each step moves one leg 2 BL and takes 1.2 s. Each landing sends out a ripple ring |
| Where it stands | 4 to 6 BL from the player, in the open, never within 2 BL of cover |
| Reach | It can strike up to 5 BL from its legs. Further than that, it steps closer first |
| Strike ring | Radius 1.0 BL. Appears 1.0 s before the strike. The first one ever: 1.3 s |
| Aim | The first strike of a chase aims at where the player is. Later ones aim 0.25 s ahead along the player's path |
| Hit | The player's centre is within 0.7 BL of the ring's centre at the strike, and not under cover |
| Strikes | At most 3 per chase, 2.0 s apart |
| Gives up | The player is hidden for 2 s, or 8 BL from the legs, or after the third strike, or after 12 s |

How it plays:

1. **Cue.** A low swell in the sound. The shadow slides across the bed. Other shrimp freeze. Fear +0.3 as it passes.
2. **Presence.** One leg comes down, then the other, each with a ring of ripples. A narrower shadow, the head, drifts over the bed toward whatever moves.
3. **Chase.** The head shadow steadies over the player. A ring of ripples appears and tightens for 1 s. The beak enters at its centre with a muffled splash and is gone. If the player has left the ring, it is a miss.
4. **Release.** The legs lift, one ring each. The shadow slides away. A falling, settling tone. The shrimp gives a small shake.

Walking out of the ring takes 0.7 s. A tail flip clears it at once. Standing still inside it is the only way to be caught.

"Out of the shadow" (challenge) means the visit ended with no strike made.

### The hunting fish

Lagoon and channel. A long dark spindle in mid-water, 4.5 BL, with its shadow on the bed beneath it.

| Part | Numbers |
|------|---------|
| Patrol | Circles at 2 BL per second, 5 BL out from the middle of the shoal |
| Face | Turns to point at the player. 0.6 s. Tail beats speed up |
| Pause | 0.5 s, dead straight. This is the warning |
| Charge | A straight line through where the player was when the pause ended. 9 BL per second, up to 10 BL |
| Hit | The player's centre is within 0.7 BL of the line as the head passes, and not hidden |
| Recover | Overshoots, turns in a wide slow arc. 1.6 s |
| Charges | At most 3 per chase |
| Gives up | The player is hidden or burrowed for 2 s, or 8 BL away after a recovery, or after the third charge, or after 12 s |
| Cannot enter | Cover, root tangles, seagrass clumps, crevices |

How it plays:

1. **Cue.** A low swell. The small schooling fish scatter. The shoal freezes. A long shadow enters at the edge of the view.
2. **Presence.** It circles. Shrimp that are burrowed, hidden or still are not seen.
3. **Chase.** Face, pause, charge. Swimming straight away along its line does not work: it is nearly four times faster. Moving sideways does. A sideways tail flip clears the line with room to spare. A companion that is with the player sidesteps a beat earlier, which shows the move.
4. **Release.** It circles once, wider, and leaves the view.

In the channel the same fish follows the travelling shoal. Cover is scarcer there and the current helps anything that swims with it.

"Sidestep a charge" (challenge) means a charge passed within 1.5 BL of the player during or just after a tail flip, and missed.

### The net

Chapter 4 only. It is never drawn as an object. It is a sound and two shadows.

| Part | Numbers |
|------|---------|
| Engine | A low throb. Fades in over 4 s. Loudest as the hull passes |
| Hull shadow | 30 BL long, 8 BL wide. Crosses the view in 6 s |
| Grid | A band of grid shadow 14 BL across and 6 BL deep. It follows the hull by 3 s and sweeps the bed at 2.2 BL per second |
| Mesh | Cells of 0.5 BL, slightly blurred |
| Under the grid | Fear +0.15 per second. The screen darkens |
| Caught up | Under the grid for 2.5 s without a break and not in a crevice: cornered |
| Ways out | Past either side edge. Or into a rock crevice, held with Hide, until it has gone |

How it plays:

1. **Cue.** The throb. The specks in the water start to tremble. Companions stop.
2. **Hull.** The long shadow crosses. Fear +0.3.
3. **Grid.** It comes on. Everyone scatters. The grid is slower than a swimming shrimp along its path, so the player has time, but running ahead of it only delays things. The way out is to the side, or down into rock.
4. **Release.** The throb fades. A cloud of stirred silt hangs for 20 s. Nothing else is left behind. The shoal is scattered: finding it again is the next story step. When it is found, it may be one or two smaller ("Losses", below).

No animal is inside the grid when it leaves. Nothing is explained (D4).

### Cornered

The same for every threat. No contact is ever drawn.

| Time | What happens |
|------|--------------|
| 0.00 s | The instant before contact. The picture blurs and darkens over 0.25 s. With reduced motion: a plain fade |
| 0.25 s | The shrimp darts away by itself, one tail flip (T79), already half lost in the blur |
| 0.60 s | Dark. Sound drops out |
| 1.80 s | The picture returns over 1.5 s. The shrimp is tucked in the nearest shelter that the predator is not within 6 BL of. Sound returns slowly |
| 3.30 s | Control returns. Fear is 0.9 and holds for 3 s. `wary` will last 40 s |

Nothing is lost: no progress, no bond, no food. The save counts it in `stats.cornered`.

### Startles with no danger

They use the cue stage only and can happen at any time outside a threat. At most one every 45 s.

| Startle | Where | Fear |
|---------|-------|------|
| A seed pod drops into the water: a plop, one ring, the pod standing in the mud | Mangrove | +0.20 |
| A gust of current: the specks all jump one way | Channel, mangrove gutter | +0.15 |
| A rain squall: the surface fills with small rings, the light dims | Mangrove, lagoon | +0.15 |
| The turtle's shadow, the first time only | Lagoon | +0.25 |
| A school of small fish bursts past | Lagoon, channel | +0.15 |

### Fairness

The target is that a person who has never played gets away about four times in five. The numbers that set this, in the order to tune them:

1. The warning times: 1.0 s ring, 0.5 s pause.
2. The hit sizes: 0.7 BL.
3. The notice gains.
4. Distance to the nearest cover when a threat may start: never more than 5 BL in the mangrove.

## Other shrimp

Each runs the same five feelings, with its own temperament, and does one thing at a time.

### Temperament

| Shrimp | Boldness | Sociability | Activity | Favourite food |
|--------|----------|-------------|----------|----------------|
| Brise | 0.85 | 0.60 | 0.80 | Fallen mangrove leaf |
| Nacre | 0.20 | 0.50 | 0.40 | Seagrass fuzz |
| Écume | 0.50 | 0.80 | 0.90 | Golden sand film |
| Unnamed | 0.3 to 0.7, seeded | 0.3 to 0.7 | 0.3 to 0.7 | Seeded |
| The player's shrimp | | | | Seeded per generation from the four bed foods |

### Choosing what to do

Every 0.5 s, not all on the same frame, each shrimp scores every behaviour and takes the highest. The behaviour it is already doing gets +0.15, so it does not dither.

| Behaviour | Score | What it does | Ends when |
|-----------|-------|--------------|-----------|
| Flee | 1 if fear is at or above `0.3 + 0.4 * boldness`, else 0 | Tail flips away from the danger toward the nearest cover, up to 3, then swims | It reaches cover |
| Hide | 1 if fear is 0.3 or more and cover is within 1.5 BL | Tucks in | Fear below 0.15 for `3 * (1.5 - boldness)` s |
| Freeze | 0.9 during a cue, or for 1 s after a neighbour's alarm | Stops. Afraid posture | The cue ends |
| Graze | hunger | Walks to the nearest food and eats | Patch cleared, or hunger below 0.2 |
| Greet | `(1 - company) * sociability`, if another shrimp is within `3 + 5 * sociability` BL, at most once per 30 s | Approaches, touches antennae | Done |
| Follow | 0.9 if called by a bonded player. From chapter 2: `0.5 * distance to the shoal's middle / 6 BL` | Keeps 1.5 to 3 BL from its target | 20 s after a call, or back with the shoal |
| Groom | `0.5 * comfort`, if calm and not wary | Grooms | 3 to 6 s |
| Rest | `0.6 * comfort * (1 - activity)`, plus 0.4 by day in the lagoon | Stays put. By day in the lagoon, burrows or sits under cover | A timer set by activity |
| Wander | `0.3 + 0.3 * activity` | Walks to a point within 6 BL, inside its home zone | It arrives |
| Molt | Scripted | The molt sequence | |

Flee thresholds that follow from this: Nacre 0.38, Écume 0.50, Brise 0.64. Nacre runs at a shadow. Brise waits until the predator shows.

### Alarm

When a shrimp becomes afraid, or flees, every shrimp within 5 BL receives the "neighbour takes fright" stimulus after a delay of 0.15 to 0.4 s. The fright moves through the group as a wave. Each shrimp can receive it at most once every 5 s.

Nacre notices a cue 1 s before anyone else. Once Nacre is a Companion, the player gets that second too: the alarm stimulus, the caption "[Nacre is alarmed]" and, the first time, the narration line.

### Toward the player

| Bond stage | Behaviour toward the player |
|------------|-----------------------------|
| Stranger | Keeps 1.2 BL away (T72). Backs off if approached fast. Does not greet back |
| Familiar | Greets back. No longer startled by the player's tail flips |
| Companion | Comes when called. Its alarm reaches the player early. Grazes nearby by choice |
| Close | Stays within 3 BL through the player's molt. Leads the player to its favourite food once per chapter. Rests touching |

A tail flip within 1.5 BL of a Stranger gives it the harmless-startle stimulus. This is how the player learns that they, too, can frighten someone.

### The shoal

From chapter 2. Each shrimp steers by three pulls: toward the middle of the group beyond 4 BL, away from any shrimp closer than 0.8 BL, and along the group's average heading. The pulls shape Wander and Follow. They never override Flee, Hide or Freeze.

### Losses (D42)

In life, many young shrimp are taken. The game lets the shoal grow smaller, and never shows how.

| Rule | Value |
|------|-------|
| Who can go missing | Only unnamed shrimp: `who: 'young'` and strangers. Never Brise, Nacre or Écume |
| When | At the moment a threat reaches its release stage: the bird leaves, the fish gives up, the net has passed |
| Which one | Chosen among the unnamed shrimp that are outside the view and more than 10 BL from the player at that moment. Never one the player can see. If there is none, nobody goes missing |
| How many | The bird: one, one time in three. The fish: one, one time in two. The net: one or two, always at least one while four or more unnamed shrimp remain |
| Floor | The shoal keeps at least two unnamed shrimp. Below that, nobody more goes missing |
| What is seen | Nothing. The shrimp is removed while out of view. No sound, no trace, no body. The player finds out only by counting when the shoal is together again |
| New members | At the start of chapters 3 and 5, zero to two strangers join the shoal, as shoals mix in life |
| The save | `stats.missing` counts them. Nothing else changes |
| Narration | Once, the first time the regrouped shoal is smaller, a "may" line: `narr.fewer`, "Fewer than before." / "Moins nombreuses qu'avant." (T56) |

Tests: a named companion is never removed. A shrimp in view is never removed. The floor of two holds. The draws use the game's seeded random so a run can be replayed.

## Molting

Three times in a life, at story points. In the free life, when enough has been eaten: 12 meals since the last molt.

| Phase | Length | What happens |
|-------|--------|--------------|
| Signal | Until the player shelters | `premolt`. Narration: the shell is too small. The body fidgets and scratches |
| Shelter | 2 s of Hide in any cover | The molt begins. No threat may start from here until `soft` ends |
| Molt | 6 s, no input | The body arches. The old shell splits behind the carapace. The shrimp backs out of it. The empty shell stays, pale and whole |
| Soft | 30 s | Half speed. Sensitivity times 2. Paler and more see-through. Companions at Close come within 3 BL and stay |
| Hardened | 3 s | The body takes on its colour. It grows by 12%. The view eases out. Hunger +0.2 |

The empty shell drifts off over the next minute. Nothing eats it. Finding another shrimp's shed shell is a discovery (doc 11).

Growth by molt count, proposed:

| Molts | Stage | Length in design px | View enlargement |
|-------|-------|---------------------|------------------|
| 0 | Juvenile | 110 | 1.40 |
| 1 | Sub-adult | 124 | 1.30 |
| 2 | Sub-adult | 140 | 1.20 |
| 3 | Adult | 158 | 1.10 |

The shrimp stays about the same size on screen. The world gets smaller around it, as the art direction asks.

## Day and night

From chapter 2. The cycle is in doc 02. Its effect on feelings:

| Phase | Effect |
|-------|--------|
| Day | In the open, fear falls at half speed and the comfort target is 0.1 lower. Burrowed or under cover counts as sheltered as usual |
| Dusk | Comfort target +0.05. Golden sand film is worth more |
| Night | No change. Ambient threats are half as likely |
| Dawn | The scripted fish pass in the story. Ambient threats twice as likely |

## The larva

In Drift the model is smaller. Hunger and curiosity run. Company runs with other larvae. There is no fear, no predator and no startle. The first 10 s have no feeding at all: the youngest larvae live on their yolk (FAO).

## A scene, second by second

The first bird, chapter 1. The player walks into the clearing.

| Time | World | The shrimp | Player sees and hears |
|------|-------|------------|-----------------------|
| 0.0 | Trigger `first-bird`. Stage: cue | Calm | A low swell begins |
| 0.5 | The shadow enters from the north-east | | A wide soft shadow sliding over the mud |
| 1.5 | The shadow crosses the player | Fear 0 to 0.30. Startle flinch | Other shrimp freeze. Edges begin to darken |
| 2.5 | Stage: presence. First leg lands 5 BL away | Predator in sight: fear 0.80. Mood: afraid | A leg, a ring of ripples. Music drops to the drone. Narration: "Your body pulls tight. You are afraid." |
| 3.7 | Second leg lands | | A second ring |
| 2.5 to 10.5 | The head shadow searches. Gains are halved | If the player tucks under a tangle: `hidden`, notice falls, fear eases to 0.5 and holds there | The tangle turns see-through. Sound muffles. The edges ease a little |
| 10.5 | Presence ends unnoticed. Stage: release | Fear falls at 0.2 per second | The legs lift. The shadow slides off. A settling tone |
| 11.0 | | Fear below 0.4. Mood leaves afraid. `wary` for 20 s | Edges ease. Narration: "The shadow is gone. Your legs loosen." Card "Fear" unlocks |
| 14.5 on | Stage: idle. No threat for 60 s | Wary. Antennae high | The uneasy track thins away |

If the player runs about in the open instead, notice reaches 1 at about 6 s, the ring appears with its long first warning of 1.3 s, and nearly everyone walks out of it.

## Tests to write

For `src/core/feelings/` and `src/core/threat/`. Each line is one test.

Feelings:
- Hunger goes from 0 to 1 in 240 s of walking, 200 s of swimming, 480 s at rest.
- A full algae graze removes 0.25. Half a graze removes half.
- Grazing stops at 0.15. A new food can still be tasted when full.
- A shadow adds 0.3 fear. While soft it adds 0.6. While wary it adds 0.45.
- One stimulus never adds more than 0.6.
- Fear falls 0.05 per second in the open, 0.2 hidden, 0.1 beside a companion, and only the largest applies.
- Fear does not fall while a predator is in sight and the shrimp is not hidden.
- Fear cannot drop below 0.8 during a chase.
- Fear cannot drop below 0.5 while a predator is present within 8 BL, even hidden.
- Comfort rises with a time of 8 s and falls with 2 s.
- Curiosity is 0 when fear is 0.5 or more.
- Curiosity reaches 0.6 at 3.2 BL from a creature with a range of 8.
- Company with two strangers reaches 0.6. With one Close companion it reaches 1.
- Company falls with a time of 20 s when alone.

Mood:
- Afraid at 0.5, not left until below 0.4.
- Content outranks hungry while grazing and for 5 s after.
- Hungry at 0.7, not left until below 0.55.
- A non-afraid change needs 0.4 s of the new mood and 1.5 s of the old.
- Afraid is immediate, whatever the old mood's age.
- `mood:changed` fires once per change, with from and to.

Conditions:
- Wary starts when afraid ends, lasts 20 s, 40 s after cornered, 10 s after a harmless startle.
- Wary ends early after 10 s resting in cover.
- Frozen needs fear of 0.3 and 1 s without input.

Threat director:
- Stages run in order and each lasts within its limits.
- No threat starts within 60 s of the last release.
- No threat starts while the player is soft.
- Never two threats at once.
- Notice rises when walking, falls when still, cannot rise when hidden.
- The chase begins when notice reaches 1.
- Gentle mode never reaches chase.
- A bird strike hits only if the player is within 0.7 BL of the ring centre and not under cover.
- The first strike aims at the player, later ones 0.25 s ahead.
- A fish charge hits only within 0.7 BL of its line.
- Under the grid for 2.5 s gives cornered. A crevice prevents it. Leaving the grid resets the count.
- Cornered sets fear to 0.9, holds it 3 s, and places the shrimp in the nearest shelter that is 6 BL or more from the predator.
- The same seed gives the same sequence of threats.

Other shrimp:
- Flee thresholds: Nacre 0.38, Écume 0.50, Brise 0.64.
- An alarm reaches neighbours within 5 BL, once per 5 s each.
- The behaviour in progress keeps its +0.15.

## Tuning names

One object per group in `src/data/tuning.ts`, passed into `core` as arguments.

| Object | Holds |
|--------|-------|
| `HUNGER` | Rates, factors, levels, start values |
| `FOOD` | Per food: hunger removed, seconds, regrow time |
| `FEAR` | Gains per stimulus, falls, holds, sensitivity factors, cap |
| `COMFORT` | The target's weights and both times |
| `CURIOSITY` | Weights, times, discovery distances and times |
| `COMPANY` | Weights by bond stage, radius, times |
| `MOOD` | Enter and leave levels, the two timers, blend times |
| `WARY` | The three lengths, the factor, the early endings |
| `THREAT` | Stage lengths, the gap, ambient odds, notice gains |
| `BIRD`, `FISH`, `NET` | The tables above |
| `CORNERED` | The sequence times |
| `NPC` | Decision interval, the +0.15, behaviour scores, alarm radius and delay |
| `MOLT` | Phase lengths, growth table, meals per molt in the free life |

## Open questions

Listed with the others in [09-decisions.md](09-decisions.md).

1. Does the player's shrimp get a favourite food chosen at random for each life?
2. After the net passes, is a hanging cloud of silt the only trace?
3. Should a tail flip beside a stranger startle it?
4. Is 40 s of wariness after being cornered too long for a calm game?
