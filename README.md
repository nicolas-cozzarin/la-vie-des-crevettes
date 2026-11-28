# La vie des crevettes

*The Life of Shrimp*

A calm browser game in which you live the life of a whiteleg shrimp: drifting to the coast as a larva, growing up among mangrove roots, finding food and friends, hiding from what hunts you, and returning to the open sea.

A personal project, made to help people see shrimp as animals that feel. The game never preaches. It lets you be one for a while.

**Status:** steps 0 to 10 of the [roadmap](docs/08-roadmap.md) are built, without sound files yet, and most of step 11. Release 0.2, the lagoon, is built: after the first molt the creek mouth leads on into it, and it has day and night. Release 0.3 has begun: after the second molt the lagoon's pass leads into the channel, where the tide carries everything toward the sea, the shoal travels with you, strangers pass, and a fish follows you down twice. In the pool, a farm pond's gate lets its water out, and behind the mesh others like you pass. Hold Hide on open sand there to dig in, and once calm, press E to rest until dusk. A long fish hunts there: it circles, turns to face you, holds still, then charges. Move aside. Nacre comes along, and at night a companion may molt in the seagrass: stay close. A life begins in the drift: a larva carried by the tide from the dark through clouds of green motes into the brown water, where it settles among the roots. Then the mangrove, where the story goes on to the first molt, the lagoon to the second, the channel at night, down with the tide, and the shadow beyond the bar, where the net comes and the shoal is scattered and found again; it stops there, to be continued, at the edge of the open sea. You can move a code-drawn shrimp through the mangrove: walk, swim, dart with a tail flip, and hide under the roots. It grows hungry and grazes algae and fallen leaves, smells its way with scent ribbons, turns its antennae toward animals it has not met, and its mood shows in its body and on the screen. Other young shrimp live there too, each with its own temper: press F to greet one, and bonds grow. Fiddler crabs wave on the bank, snails and hermit crabs crawl, and schools of young fish burst apart at a tail flip. A wading bird visits the clearing: hide or keep still and it leaves; stay in its ring and the picture goes dark, and the shrimp wakes safe in cover. Settings, from the title or the pause menu, change the language, the keys, the four volumes, captions, gentle mode (no chases), reduced motion, text size and naming feelings on screen. About lists the sources and the credits. Add `?explore=lagoon` to the address to walk the lagoon too, `?explore=channel` to go down the channel at night with the tide and the shoal, `?explore=shadow&at=5600,1600` to walk the open bed beyond the bar, where the net comes: get out past its side, or hold Hide in a crevice, `?explore=openSea` to swim off the shelf into the open sea, where there is nothing to walk on, `?explore=drift` to drift, `&time=night` (or `dusk`, `dawn`) to open the lagoon at that time, and `&debug` to move the day on with F7, bring the molt with F8 (Shift and F8 for the nearest companion's), cycle the moods with F9 call the bird, or the fish in the lagoon, with F10, and bring strangers passing through the channel with F4. Press J or Tab for the carnet: what was found, the companions, what shrimp feel, the challenges and the achievements. Enter on a challenge pins it, and Sense then shows the way. The life is kept at each chapter start and each rest in cover, and Continue on the title goes back to it. The sound system is built: the music follows the mood, the bird has its cues, and "Captions for sounds" shows what carries meaning. It plays nothing until the open-licence files are found and credited. On a phone or tablet with no keyboard, the title says the game needs one. The rest of the game is written down in detail in documents 10 to 16, ready to build. Documents 17 and 18 propose a much larger world and more to learn by playing. Document 19 says how to change anything without breaking the rest. The pictures for the first chapter, the mangrove, and part of the lagoon are painted: open `atelier.html` beside the game to see them.

## The documents

| # | Document | Answers |
|---|----------|---------|
| 01 | [Game design](docs/01-game-design.md) | What is this game, and what is it not? |
| 02 | [Mechanics and actions](docs/02-mechanics.md) | What can the player do, and what are the rules and numbers? |
| 03 | [Controls and settings](docs/03-controls.md) | Which keys, how rebinding works, which settings exist |
| 04 | [Art direction](docs/04-art-direction.md) | How it looks, seen from above |
| 05 | [Audio direction](docs/05-audio-direction.md) | How it sounds, and where to find open-licence music and effects |
| 06 | [Tech architecture and deployment](docs/06-architecture.md) | How the code is organised and how it reaches GitHub Pages |
| 07 | [Science and message](docs/07-science-and-message.md) | Which facts, from which sources, in which words |
| 08 | [Roadmap](docs/08-roadmap.md) | What to build, in what order, and how to know a step is done |
| 09 | [Decisions](docs/09-decisions.md) | What is decided, what is proposed, what is still open |
| 10 | [Feelings and states](docs/10-feelings-and-states.md) | The exact rules for hunger, fear, comfort, curiosity and company, for predators, other shrimp and molting |
| 11 | [World catalogue](docs/11-world-catalogue.md) | Every place, thing and creature: where it is, how big, what it looks like, what it does |
| 12 | [Goals and journal](docs/12-goals-and-journal.md) | Story steps, challenges, achievements and their stamps, the journal's pages, what shows on screen |
| 13 | [Script](docs/13-script.md) | Every line of text, in French and English, with its key |
| 14 | [Art production](docs/14-art-production.md) | How pictures are painted by code, the shrimp's postures by mood, the list of every image |
| 15 | [Implementation guide](docs/15-implementation-guide.md) | What exists, the patterns to keep, and the files and tests of each remaining step |
| 16 | [History and reasons](docs/16-history.md) | How the project got here, and why each main choice was made |
| 17 | [The long coast](docs/17-the-long-coast.md) | Proposed: a much larger world to explore after the story |
| 18 | [Learning by playing](docs/18-learning-by-playing.md) | Proposed: how the player learns shrimp biology and behaviour through play, each fact with its source |
| 19 | [Changing things safely](docs/19-changing-things-safely.md) | Where each thing lives, what else follows a change, and the checks that say what broke |
| | [CLAUDE.md](CLAUDE.md) | Standing instructions for Claude Code |
| | [CREDITS.md](CREDITS.md) | Template for crediting every asset |

## The game in ten lines

- You play a whiteleg shrimp, seen from above, in a watercolour world.
- Move with WASD or arrows. Space is a tail flip, the shrimp's jump. E eats, Q senses, Shift hides, F greets. Every key can be changed.
- Your shrimp feels hunger, fear, comfort, curiosity and company. There are no bars. You read it in its body, the music and the light.
- Other shrimp feel the same things. Three of them become companions.
- A bird and a fish hunt you. You nearly always get away. If you do not, you wake in a shelter, shaken.
- No animal is ever eaten in this game.
- One life runs through six short chapters, about twenty minutes.
- After that, the next generation's life is open-ended.
- Optional challenges, achievements and a journal give you things to find.
- French and English. Keyboard. Free, open source, no cookies.

## Running it

Needs Node 22 or newer.

```
npm install
npm run dev        local server with live reload
npm test           unit and content tests
npm run build      type-check and build to dist/
npm run test:e2e   browser test, after a build
npm run lint       lint and format check
npm run check      lint, tests and build together
```

Every push to `main` publishes the game to GitHub Pages at https://nicolas-cozzarin.github.io/la-vie-des-crevettes/.

## Continuing the build

1. Read [09-decisions.md](docs/09-decisions.md) and settle what is open.
2. Open this repository in Claude Code and say: "Read CLAUDE.md, then do the next step of docs/08-roadmap.md."
3. Continue one step per session. Each step ends with checks.
4. At the end of a session, add what was done and learned to [16-history.md](docs/16-history.md).

## Licence

Code: MIT, see [LICENSE](LICENSE). Assets: original, CC0 or CC BY, each listed in `CREDITS.md`.
