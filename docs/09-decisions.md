# 09. Decisions

Status: 2026-11-13. One row per decision. Change a decision here first, then in the document it affects.

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

## Still needed from the author

1. D13a: should companions speak in text?
2. D11a: continue as the next generation, or stay the same shrimp?
3. D24: the art information.
4. D27a: confirm the MIT licence for code, and the name to put on it.
5. T17: keep or cut the "How many" card.
