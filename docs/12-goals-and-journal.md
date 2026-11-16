# 12. Goals, journal and what shows on screen

Status: draft 0.1, 2026-11-14. Details decisions D17, D18 and D19. Lists in [02-mechanics.md](02-mechanics.md) stay as the overview. This document gives each goal an id, an exact condition and a look, and lays out the journal and the few things that appear over play. Entries marked **new** wait for the author.

Names and texts in both languages are in [13-script.md](13-script.md). Conditions are checked by `Progress` in `src/core/progress/`, from events only.

## Three kinds of goal

| Kind | How many | Needed to go on? | Where the player sees it |
|------|----------|------------------|--------------------------|
| Story step | 19 | Yes | One line of narration at a time. Never a list |
| Challenge | 21, plus 2 new | No | The journal, by chapter. A small line when one moves forward |
| Achievement | 21, plus 3 new | No | The journal's last page. A small line and two bells when earned |

Rules for all three:
- Worded as something a shrimp does, never as a task. "Eat your fill", not "Collect 3 food".
- No timers that can run out. No way to fail one for good. Anything missed can be done in the free life.
- Nothing is ever taken away.
- Being cornered never blocks a story step.

## Story steps

A step is done the moment its condition is true, even if an earlier step is still open. The narration prompts the first step that is not done.

| Id | Step | Done when | Then |
|----|------|-----------|------|
| `s0.motes` | Eat 5 motes | 5 `food:eaten` of microalgae | |
| `s0.brown` | Reach the brown water | The larva enters zone D | Landfall. Chapter 1 |
| `s1.fill` | Eat your fill | Hunger falls to 0.15 or below | The Sense prompt |
| `s1.sense` | Use Sense | Sense held for 1.5 s | The clearing's trigger is armed |
| `s1.bird` | Get away from the bird | The first bird visit reaches release, however it went | |
| `s1.greet` | Greet a shrimp | Any `greeting` | 60 s later, the molt signal |
| `s1.molt` | Molt | `molt:done` | The creek mouth opens |
| `s2.burrow` | Burrow through a day | Hidden or burrowed when dusk begins, or "Rest until dusk" chosen | |
| `s2.dusk` | Graze with the shoal at dusk | One full graze at dusk with 2 shoal members within 4 BL | |
| `s2.bond` | Bring one bond to Companion | Any bond reaches 0.5 | |
| `s2.fish` | Get away from the fish | The dawn fish visit reaches release | The molt signal |
| `s2.molt` | Molt | `molt:done` | The pass opens |
| `s3.tide` | Follow the tide with the shoal | The player reaches the pool, zone D | |
| `s3.fish2` | Get away from the fish twice | Two fish visits reach release in the channel | The bar opens |
| `s4.net` | Get out from under the net | The net reaches release, however it went | The shoal is scattered |
| `s4.shoal` | Find the shoal again | Within 4 BL of three shoal members at once | The way to the sea opens |
| `s5.molt` | Molt | `molt:done`, under the ledge | Full grown |
| `s5.blue` | Swim down into the blue | The player enters zone B | |
| `s5.spawn` | Spawn | In the gathering, no input for 3 s | The spawning scene. The next generation |

Spawning has no button. The player arrives among the others and is still, and it happens.

## Challenges

Progress is a number toward a target. The line on screen reads "Three tastes 2/3".

| Id | Chapter | Challenge | Type | Counted how | Target |
|----|---------|-----------|------|-------------|--------|
| `c0.motes` | 0 | Eat 15 motes | Taste | `food:eaten` of microalgae | 15 |
| `c0.larva` | 0 | Touch another larva | Meet | Contact with a `drift.larva` | 1 |
| `c1.tastes` | 1 | Three tastes | Taste | Different foods first tasted in the mangrove | 3 |
| `c1.branch` | 1 | Find the sunken branch | Reach | Discovery of `thing.sunkenBranch` | 1 |
| `c1.crab` | 1 | Watch a fiddler crab wave | Watch | Seconds within 3 BL of a waving crab, without a break | 5 |
| `c1.clean` | 1 | Out of the shadow | Escape | A bird visit that ends with no strike made | 1 |
| `c1.greet3` | 1 | Greet 3 different shrimp | Meet | Different shrimp greeted | 3 |
| `c1.together` | 1 | Hide beside another shrimp | Meet | Seconds hidden with another hidden shrimp within 1.5 BL | 2 |
| `c1.gentle` | 1 | **New.** Walk up to a hermit crab | Meet | Reaching 1 BL from one that has not pulled in | 1 |
| `c2.neighbours` | 2 | Find the pistol shrimp and its goby | Find | Discovery of `creature.pistolAndGoby` | 1 |
| `c2.glow` | 2 | Graze under the glowing plankton | Taste | A full graze at night inside plankton | 1 |
| `c2.turtle` | 2 | Follow the turtle | Watch | Seconds within 4 BL of the turtle, without a break | 20 |
| `c2.favourites` | 2 | Learn each companion's favourite food | Meet | Companions seen eating their favourite from within 4 BL | 3 |
| `c2.molt` | 2 | Stay with a companion through its molt | Meet | Within 3 BL for the whole of a companion's molt and soft time | 1 |
| `c2.sidestep` | 2 | Sidestep a charge | Escape | A charge that misses within 1.5 BL during or just after a tail flip | 1 |
| `c2.shell` | 2 | **New.** Find a shed shell | Find | Discovery of `thing.shedShell` | 1 |
| `c3.uncornered` | 3 | Reach the sea without being cornered | Escape | Reaching the bar with no `cornered` in the channel | 1 |
| `c3.together` | 3 | Keep all three companions close | Meet | Seconds with all three within 6 BL, without a break | 60 |
| `c3.seaweed` | 3 | Eat drifting seaweed without stopping | Taste | Seaweed eaten in one unbroken swim | 3 |
| `c4.edge` | 4 | Leave the net by its edge | Escape | The grid passes while the player is beyond its side edge, having been under it | 1 |
| `c4.crevice` | 4 | Wait it out in a crevice | Escape | The grid passes over the player hidden in a crevice | 1 |
| `c5.deep` | 5 | Find the deepest point | Reach | Discovery of `place.deep` | 1 |
| `c5.rest` | 5 | Rest touching a Close companion | Meet | Seconds at rest within 0.6 BL of a Close companion | 5 |

Notes:
- "Without a break" counters go back to 0 when the condition stops being true. The best run is what the journal shows.
- `c1.tastes` needs three foods and doc 02 lists two for the mangrove. The third is a patch of golden film on the sandy mud of the creek mouth, the first hint of the lagoon. If the author prefers, the challenge becomes "Both tastes" with a target of 2.
- `c4.edge` and `c4.crevice` cannot both be done in one pass of the net. The second waits for the free life, where the net returns.
- A challenge shows in the journal from the moment its chapter is reached. Before that its line is hidden.

### Pinning

In the journal, Enter on a challenge pins it. One at a time. While it is pinned, Sense shows a white ribbon toward its target, if it has a place, and the target pulls on curiosity with a weight of 0.6 (doc 10).

## Achievements

Each has a stamp: a round ink drawing 160 px across, described here. Style in "Icons" below.

| Id | Achievement | Earned by | Stamp |
|----|-------------|-----------|-------|
| `landfall` | Landfall | Finishing Drift | A tiny comma under one arch of root |
| `newShell` | New shell | First molt | A small shrimp walking away from its own empty outline |
| `fullGrown` | Full grown | Third molt | Three outlines in a row, each larger |
| `antenna` | Antenna to antenna | First greeting | Two pairs of antennae crossing at the tips |
| `familiar` | Familiar faces | All three companions at Familiar | Three tail fans side by side: one beside a short antenna, one pale, one small |
| `shoal` | Shoal | All three at Close | Four shrimp in a loose ring, heads inward |
| `everyTaste` | Every taste | Eating all six foods | Six small marks in a circle, one for each food |
| `nose` | Nose for it | Following a food ribbon to its patch 10 times | A ribbon curling in to a dot |
| `quickTail` | Quick tail | 50 tail flips | A tail fan spread wide with three short lines behind it |
| `unseen` | Unseen | A whole chapter that has a predator, with no chase begun | A leaf with two antennae showing from under it |
| `neverCornered` | Never cornered | Reaching the open sea with `stats.cornered` at 0 | A ring of ripples, and the shrimp outside it |
| `underGrid` | Under the grid | Finishing The shadow | A square of grid with one line bent open |
| `nightGrazer` | Night grazer | Eating at night 10 times | A thin moon over a patch of dots |
| `neighbour` | Good neighbour | Finding the pistol shrimp and goby | A burrow mouth with two heads in it |
| `slowCompany` | Slow company | Completing "Follow the turtle" | A turtle shell from above |
| `openWater` | Open water | Reaching the open sea | Three long wave lines and nothing else |
| `nextOnes` | The next ones | Spawning | A cloud of dots rising |
| `secondTide` | Second tide | Starting generation 2 | Two wave lines |
| `fifthTide` | Fifth tide | Starting generation 5 | Five wave lines |
| `fullCarnet` | Full carnet | Every discovery found | An open notebook |
| `allOfIt` | All of it | Every challenge done | A full circle of small stamps |
| `cleanAntennae` | **New.** Clean antennae | The shrimp grooms 10 times | One antenna drawn through two front legs |
| `stoneStill` | **New.** Stone still | A predator's visit ends while the player is in the open and has not moved | A shrimp flat on the bed under a wide shadow |
| `gentle` | **New.** Gentle | Completing "Walk up to a hermit crab" | A shell with legs out, and two antennae reaching toward it |

The three new ones reward calm, stillness and care, which are otherwise only rewarded by the feel of the game.

A name is always visible in the journal. How to earn it is shown only once the chapter it belongs to has been reached, so the list does not give the story away.

Being "followed" for `nose`: Sense showed a food ribbon to a patch, and the player grazed that patch within 30 s.

## What the save must hold

`SaveV1` in doc 06 already has `stepsDone`, `challenges`, `achievements`, `discoveries`, `bonds` and `stats`. The `stats` keys needed:

| Key | Counts |
|-----|--------|
| `tailFlips` | Tail flips |
| `cornered` | Times cornered, this generation |
| `corneredInChannel` | Times cornered in the channel, this visit |
| `ribbonsFollowed` | See `nose` |
| `nightMeals` | Full grazes at night |
| `grooms` | Completed grooming bouts |
| `chases.<area>` | Chases begun in an area, this visit |
| `mealsSinceMolt` | For molts in the free life |
| `tasted.<food>` | 1 once tasted |
| `greeted.<id>` | 1 once greeted |
| `favourites.<id>` | 1 once seen |
| `playerFavourite` | Index of the player's favourite food, set per generation |

Also needed, new in the save: `pinned: string | null`, `moodsNamed: Mood[]`, `promptsShown: Record<Action, number>`, `cardsUnlocked: string[]`. Adding fields with defaults does not need a new save version. See [15-implementation-guide.md](15-implementation-guide.md).

## The journal

"Le carnet". Opened with the Journal key or from the pause menu. Play pauses behind it. It never opens by itself.

### Look

An open field notebook on the dimmed game. Off-white paper `#F6F1E4`, ink `#2A2A2A`, pencil lines, small watercolour washes. Fraunces for titles, Atkinson Hyperlegible for text. Nothing smaller than 20 px.

```
 design 1920 x 1080                         notebook: x 210 to 1710, y 90 to 990
 +-----------------------------------------------------------------------------+
 |        +----------------------------+ +----------------------------+ [1]    |
 |        |  LEFT PAGE                 | |  RIGHT PAGE                | [2]    |
 |        |  page title        3 / 28  | |                            | [3]    |
 |        |                            | |   large drawing            | [4]    |
 |        |  a list or a grid          | |                            | [5]    |
 |        |  of entries                | |   name                     |        |
 |        |                            | |   one or two sentences     |        |
 |        |                            | |   source, small            |        |
 |        +----------------------------+ +----------------------------+        |
 |                 arrows to move    Enter to pin    Esc to close              |
 +-----------------------------------------------------------------------------+
   [1] to [5]: page tabs down the right edge, each with a drawn icon
```

| Part | Position and size |
|------|-------------------|
| Left page | x 240 to 940, y 120 to 960 |
| Right page | x 980 to 1680, y 120 to 960 |
| Spine | A soft shadow at x 960 |
| Tabs | 5, each 70 by 120, at x 1690, from y 150 down |
| Help line | y 1020, centred, 22 px, at 70% |
| Page title | Fraunces 44 px |
| Entry name | Fraunces 34 px |
| Body text | Atkinson 26 px, line height 38 |
| Source line | Atkinson 20 px, at 70% |

### Keys

The journal uses menu actions only (`src/core/input/menuKeys.ts`), so it follows the player's bindings.

| Key | Does |
|-----|------|
| Left, Right | Previous page, next page |
| Up, Down | Move through the entries of the left page |
| Enter or Interact | Pin a challenge. Elsewhere, nothing |
| Journal or Escape | Close |

The mouse can click tabs and entries. It is never required.

### Pages

| # | Page | Left page | Right page |
|---|------|-----------|------------|
| 1 | Discoveries | A grid of small drawings, 4 across, grouped: foods, places, creatures, things. A count: "9 / 28" | The chosen entry: its drawing, large, with a wash. Its name. A note if one exists. Where it was found |
| 2 | Companions | Three small portraits from above, each with its marking | The chosen companion: see below |
| 3 | What shrimp feel | The titles of the cards, in the order they were unlocked | The chosen card: title, one or two sentences, source |
| 4 | Challenges | By chapter. Each line: a type icon, the name, "2/3". A pin mark on the pinned one | The chosen challenge: its sentence, and where it stands |
| 5 | Achievements | A grid of stamps, 5 across | The chosen stamp, large. Its name. How it is earned, if that can be shown yet |

Entry states:

| State | Discoveries | Cards | Challenges | Achievements |
|-------|-------------|-------|------------|--------------|
| Not yet | A faint pencil outline. No name | Not listed. The count shows how many remain | Hidden until its chapter | A faint pencil circle. Name shown |
| Found | The drawing, inked and washed. Name | Listed | Listed, with progress | |
| New since last opened | A small dot beside it | A small dot | | A small dot |
| Done | | | The line is inked through with one pencil stroke | Inked and washed |

### The companion page

No bar shows the bond (rule 7 is about feelings, but a bar here would read as one).

- Four small stamps in a row: Stranger, Familiar, Companion, Close. Those reached are inked. The rest are pencil.
- Lines of text that appear as the bond grows:

| Appears at | Line |
|------------|------|
| Familiar | How it looks, and one line on how it behaves |
| Familiar | Where it was met |
| When seen | Its favourite food |
| Companion | One more line on its temperament |
| Close | One memory, taken from play: the first threat fled together, or the molt shared |

## What shows over play

Almost nothing. Design positions:

```
 +-----------------------------------------------------------------------------+
 | [mood word]                  [caption]                         [small line] |
 |  x 60, y 70                  x 960, y 70                       right x 1860 |
 |                                                                 y 70        |
 |                                                                             |
 |                              (the game)                                     |
 |                                                                             |
 |                         narration   x 960, y 900                            |
 |                         prompt      x 960, y 990                            |
 +-----------------------------------------------------------------------------+
```

| Line | When | Look | Timing |
|------|------|------|--------|
| Narration | Story moments, first moods | Fraunces 36 px, paper colour, soft dark shadow, no plate | In 0.6 s. Holds 4 s plus 0.06 s per letter, or until its spoken line ends plus 1 s if that is longer (D47). Out 0.8 s. At least 20 s between lines, except a first-mood line, which may come at once |
| Prompt | An action is possible, first three times | Atkinson 30 px on a paper pill, as built | Stays while possible. In and out 0.5 s |
| Small line | A discovery, a challenge moving, an achievement | A paper tag with a 48 px icon and Atkinson 26 px | 4 s. One at a time, queued. A low bell, two for an achievement |
| Caption | "Captions for sounds" is on | Atkinson 26 px in square brackets, at 85% | As long as the sound, at least 2 s |
| Mood word | "Name feelings on screen" is on | Atkinson 28 px | 3 s at each change of mood |

Nothing else: no map, no meters, no counters, no markers over anything's head.

## Journal cards and what unlocks them

From doc 07, with ids for the code.

| Id | Card | Unlocks on |
|----|------|------------|
| `card.scent` | Scent | First use of Sense |
| `card.tailflip` | The tail flip | Third tail flip |
| `card.fear` | Fear | The first time the afraid mood ends |
| `card.wary` | Still wary | Leaving cover while wary after a chase |
| `card.grooming` | Grooming | The first completed grooming bout |
| `card.molt` | A new shell | First molt |
| `card.seeThrough` | See-through | Standing on three kinds of ground |
| `card.journey` | The journey | Reaching the open sea |
| `card.nextOnes` | The next ones | Spawning |
| `card.feel` | Able to feel | Finishing chapter 2 |
| `card.howMany` | How many | Spawning. Optional, the author to keep or cut (T17) |

The page "Among humans" and its cards come with D39. They are listed, with what unlocks each, in doc 18 under "Level 2". The page sits after "What shrimp feel", and does not exist until its first card unlocks. The pond life adds its four places to Discoveries (doc 11).

## Icons

One hand for all of them: a dark pencil-ink line of even weight, slightly wobbly, with one flat watercolour wash that does not quite fill the line. Drawn by code like everything else (doc 14).

| Set | Count | Size | Notes |
|-----|-------|------|-------|
| Achievement stamps | 24 | 160 px | Round. A double ring like a rubber stamp. Wash colour by group: life green-grey, company amber, taste green, escape violet-grey, curiosity blue |
| Challenge types | 6 | 48 px | Taste: a round patch with a bite out. Reach: a small arrow to a dot. Watch: two antennae pointing one way. Escape: a tail fan with a motion line. Meet: two antennae touching. Find: a spiral |
| Journal tabs | 5 | 56 px | Discoveries: a leaf. Companions: three small shrimp. What shrimp feel: an antenna tip with ripples. Challenges: a spiral. Achievements: a stamp ring |
| Bond stages | 4 | 64 px | Two shrimp, further apart to closer. At Close they touch |
| Small-line icons | 3 | 48 px | Discovery: a spiral. Challenge: its type icon. Achievement: a stamp ring |

No icon shows a face, a heart, a star, a trophy or a medal. They are field-notebook marks.
