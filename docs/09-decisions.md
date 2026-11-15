# 09. Decisions

Status: 2026-11-15. One row per decision. Change a decision here first, then in the document it affects. The reasons behind the main decisions are in [16-history.md](16-history.md).

- **Decided**: the author chose it.
- **Proposed**: Claude's default. Stands until the author says otherwise.
- **Open**: needs the author.

## Design decisions

| # | Topic | Decision | Status | Docs |
|---|-------|----------|--------|------|
| D1 | Audience | General public, teens and adults | Decided | 01 |
| D2 | Aim | Players see shrimp differently and learn a few things. No pledge, no appeal | Decided | 01, 07 |
| D3 | Message | Play never preaches. Little written text. Facts sit in an optional journal. No closing card | Decided | 01, 07 |
| D4 | Fishing | One short chapter: an engine and a net shadow that the player escapes. Nothing more is shown or explained | Decided | 01, 02 |
| D5 | Ownership and timing | The author's personal project, tied to no organisation. None is named anywhere, the About page included. Wanted as soon as possible, so it ships in stages | Decided | 01, 07, 08 |
| D5a | About page | Sources, credits and the visit-count note. Nothing else | Decided | 01, 07 |
| D6 | Species | Whiteleg shrimp | Decided | 01 |
| D7 | Realism | Only behaviours real shrimp show, simplified. One exception: they are never shown eating animals | Decided | 01, 02 |
| D8 | Admitting simplifications | No journal card for this. The game also never claims shrimp eat only plants | Decided | 07 |
| D9 | Predators | They appear and chase. The player gets away most of the time. Nobody is caught on screen | Decided | 02 |
| D10 | Cornered | The player wakes in the nearest shelter, shaken, with nothing lost | Decided | 02 |
| D11 | Ending | Reaching the open sea as an adult, then free play continues | Decided | 01 |
| D11a | Form of free play | The player continues as the next generation, with every area open | Proposed | 01, 02 |
| D12 | Reproduction | Shown gently: spawning and drifting larvae | Decided | 01 |
| D13 | Other shrimp | Recognisable individuals with their own temperaments | Decided | 01, 02 |
| D13a | Do they speak in text? | Recommended no: narration describes them, their bodies do the rest | Open | 01 |
| D14 | Other species | A few: pistol shrimp and goby, green turtle, background life | Decided | 01 |
| D15 | Shape | One life in chapters, then an endless sandbox | Decided | 01 |
| D16 | View | Top-down, straight from above | Decided | 01, 04 |
| D17 | Feelings | Body language, colour, music and screen mood. No bars. Must be clear | Decided | 02 |
| D18 | Goals | A journal of discoveries and friends, plus challenges and an achievements page | Decided | 01, 02 |
| D19 | Words | Sparse second-person narration | Decided | 07 |
| D20 | Devices | Keyboard only | Decided | 03 |
| D21 | Default keys | WASD or arrows, Space, E, Q, Shift, F, J, Esc. All rebindable | Decided | 03 |
| D22 | Art style | Watercolour and gouache, anatomically correct | Decided | 04 |
| D23 | Shrimp face | Realistic. Emotion by posture and antennae | Decided | 04 |
| D24 | Who makes the art | Code-drawn shrimp and open-licence assets for the first version. The author will send more information | Decided | 04 |
| D25 | Music | Ambient and lo-fi | Decided | 05 |
| D26 | AI-generated music | No | Decided | 05 |
| D26a | AI-generated images | Avoid | Proposed | 04 |
| D27 | Asset licences | Free licences only: CC0 and CC BY | Decided | 04, 05 |
| D27a | Code licence | MIT | Proposed | 06 |
| D28 | Languages | French and English | Decided | 06, 07 |
| D29 | Who builds | The author, with Claude Code, from these documents | Decided | 08 |
| D30 | Engine | Phaser with TypeScript and Vite | Decided | 06 |
| D31 | Repository | Public, on the author's personal GitHub account: `nicolas-cozzarin/la-vie-des-crevettes` | Decided | 06 |
| D31a | Web address | `https://nicolas-cozzarin.github.io/la-vie-des-crevettes/` once deployed | Decided | 06 |
| D32 | Counting players | Yes | Decided | 06 |
| D32a | How | GoatCounter: no cookies, no personal data | Proposed | 06 |
| D33 | Title | La vie des crevettes. In English, The Life of Shrimp | Decided | 01 |
| D34 | New creatures and things | Hermit crab, barnacles, mud balls, breathing roots, a glass hopper and a drifting bell in Drift, sand mound, shed shell, a long call at sea. Optional: sea star, sea fan. Listed in doc 11. None is eaten or harmed | Open | 11 |
| D35 | Man-made things | None besides the hull and the net | Proposed | 11 |
| D36 | New goals | Two challenges (walk up to a hermit crab, find a shed shell) and three achievements (Clean antennae, Stone still, Gentle) | Open | 12 |

## Smaller choices made while drafting

All proposed. Say so if any is wrong.

| # | Choice | Why |
|---|--------|-----|
| T1 | Six chapters: Drift, Mangrove, Lagoon, Channel, The shadow, Open sea | Follows the real life cycle. The shadow is the short net chapter from D4 |
| T2 | Three named companions: Brise, Nacre, Écume | Few enough to recognise. French sea words |
| T3 | The player's shrimp is female and unnamed | Fits the French word and the spawning ending |
| T4 | Swimming starts by itself after 0.8 s of movement | One less key. Walking stays exact near food and friends |
| T5 | Sense shows scent as ribbons | Lets the player perceive the way a shrimp does |
| T6 | Grooming happens by itself when idle | Real, calming, and no extra key |
| T7 | Bonds never go down | Cozy. No punishment for wandering |
| T8 | Hunger never kills or slows | No fail state |
| T9 | Gentle mode setting with no chases | For players who want none |
| T10 | "Name feelings on screen" setting | A fallback if moods are not clear enough for someone |
| T11 | Keys stored by physical position | WASD works on French AZERTY keyboards without setup |
| T12 | French narration uses "tu" | Close and informal |
| T13 | A notice instead of the game on devices with no keyboard | Follows D20 |
| T14 | Areas described in data files with hand-placed coordinates | Fast to start. A map editor can come later |
| T15 | No physics beyond simple circles and rectangles | Enough for a flat top-down plane |
| T16 | Fonts: Fraunces and Atkinson Hyperlegible | Open licence, legible, cover French |
| T17 | One optional journal card with the number farmed each year | Information, not appeal. The author to keep or cut |
| T18 | Releases in four stages, the first with two chapters | Something public early (D5) |
| T19 | The view is enlarged 1.4 times, so the juvenile is about 155 px long at 1080p instead of 110 | At 110 px the antennae and posture, which carry the feelings (D17), were too small to read |
| T20 | Movement and collision are worked out in `src/core/movement/`, not by Phaser's Arcade physics | Same circles and rectangles (T15), but covered by unit tests and free of the engine |
| T21 | Darts count as "in a row" when less than 2.5 s apart | Needed to say when the shrimp tires |
| T22 | The game uses the true time between frames and cuts long frames into short steps | Phaser's smoothing played the game in slow motion on slow machines |
| T23 | The letter-keys preset is named by the letters on the player's own keyboard: WASD, or ZQSD on a French one | Bindings are by key position (T11), so the name should match what is printed |
| T24 | The five places lie along one coast, sea to the left and land to the right. The larva drifts in from left to right and the grown shrimp travels back from right to left | True to the coast where whiteleg shrimp live. The return retraces the drift. One map serves the free life |
| T25 | The shrimp grows 12% at each molt (110, 124, 140, 158 px) and the view eases out (1.4, 1.3, 1.2, 1.1), so it stays about the same size on screen. Each area is drawn at the scale of the shrimp that lives there | Doc 04 asks for growth to show as the world getting smaller |
| T26 | The mood "content" ranks above "hungry" | A hungry shrimp must show pleasure from its first bite |
| T27 | A "wary" state follows every fright: 20 s, 40 s after being cornered, 10 s after a harmless startle | Calm does not return at once in a real animal (doc 07). It also gives the "Still wary" card its moment |
| T28 | During a predator's visit a hidden number, notice, rises with the player's movement. Hiding, keeping still or getting far away each end the visit without a chase | Three honest ways through, all of them things shrimp do. Doc 02 already said "cover or stillness ends it here" |
| T29 | A creature is discovered within 2.5 BL for 2 s, not within 6 BL | At 6 BL it is at the edge of the view and the player has not looked at it |
| T30 | While a predator is present, fear cannot fall below 0.5, even in hiding | Relief should come when it leaves, not before |
| T31 | Spawning has no button. The player arrives among the others and is still | It should happen to the shrimp, not be a task |
| T32 | A bond is shown in the journal as four small stamps and lines of text, never as a bar | Rule 7 is about feelings, but a bar here would read as one |
| T33 | Narration lines have two weights. "Must" lines wait their turn. Others are dropped if a line showed in the last 20 s | Keeps narration sparse (D19) without losing the story |
| T34 | The third taste in the mangrove is a patch of golden film on the sandy mud of the creek mouth | Doc 02 asks for three mangrove foods and lists two. Or the challenge becomes "Both tastes" |
| T35 | The player's shrimp has a favourite food, chosen at random for each life | Individuals differ. The next generation is not the same shrimp |
| T36 | A tail flip within 1.5 BL of a stranger startles it | The player learns that they can frighten someone too |
| T37 | In the free life a molt comes after 12 meals | Doc 02 says "with time and feeding" and gives no number |
| T38 | The bird is drawn as a snowy egret (black legs, yellow feet) and the fish as a snook. Both to check for this coast | A real animal to draw from |
| T39 | The place "The shadow" has a journal entry with a drawing and a name, and no text | D4: nothing is explained |
| T40 | After the net has passed, a cloud of stirred silt hangs for 20 s. Nothing else is left behind, and every companion is found again | D4 and the hard rule that the net takes no one |
| T41 | A page, `atelier.html`, shows every picture without starting the game. It is published beside the game and not linked from it | The author can look at the art on the live site. A painter can be checked without playing |
| T42 | The first 10 s of Drift have no feeding, and the larva changes shape twice on the way | The youngest larvae live on their yolk (FAO). The art direction already asks for two looks |
| T43 | A mangrove root is painted as a thick limb that comes down and ends in the mud, with fine roots at its end. There are six pictures of it, and the area data turns a picture by half a radian at most | As a round foot it read as a stone. Light is painted into each picture, so turning one far would put its light on the wrong side |
| T44 | The mud bank runs along the whole top of the mangrove. A clump of roots, `mangrove.clump`, stands at each side of the creek mouth | An edge strip is cut square where it ends. The bank's ends are now outside the area, and the clumps cover the two ends that can be seen |
| T45 | The murk is centred on the shrimp and drawn at twice the size of the view. It is clear to 3 BL and thick by 8.5 BL | At the size of the view it left a bare band whenever the shrimp was not at the centre of the screen |
| T46 | In the mangrove data: the sunken branch is 12 BL long and its zone is 4700, 3000, 1200, 800. Nacre rests at the edge of her leaf. The landing tangle is at (1560, 1860) | Found while composing the scenes: the branch did not fit its zone, the leaf hid Nacre, and the tangle covered the first algae |

## Still needed from the author

Each has a default that stands until the author says otherwise.

From 2026-11-13:

1. D13a: should companions speak in text? Default: no.
2. D11a: continue as the next generation, or stay the same shrimp? Default: the next generation.
3. D24: the art information the author meant to send.
4. D27a: confirm the MIT licence for code, and the name to put on it.
5. T17: keep or cut the "How many" card. Default: keep, as an optional card.

From 2026-11-14:

6. T24: is the coast the right way round, with the sea on the left and the life's journey running from right to left?
7. D34: which of the new creatures and things come in? Default: all except the sea star and the sea fan. The long call at sea is the least sure.
8. D35: nothing man-made besides the hull and the net? Default: nothing.
9. D36: the two new challenges and three new achievements? Default: yes, if the hermit crab and the shed shell come in.
10. D14: pistol shrimp sharing a burrow with a goby is best known from other seas. It is to be checked for this coast. Keep it whatever the answer, or replace it if it does not occur here? Default: keep.
11. T34: a third taste at the creek mouth, or rename the challenge "Both tastes"? Default: the third taste.
12. T27: is 40 s of wariness after being cornered too long for a calm game?
13. T35, T36: a favourite food chosen for each life, and strangers that the player's tail flip can startle? Default: yes to both.
14. T38: the snowy egret and the snook as the animals to draw from?
15. T40: after the net, a cloud of silt and nothing more?
16. Who reads the French aloud before release (doc 07)?
17. Doc 13: the narration names each companion once ("You will call her Nacre."). Is that the right way to give names?
