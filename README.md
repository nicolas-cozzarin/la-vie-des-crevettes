# La vie des crevettes

*The Life of Shrimp*

A calm browser game in which you live the life of a whiteleg shrimp: drifting to the coast as a larva, growing up among mangrove roots, finding food and friends, hiding from what hunts you, and returning to the open sea.

A personal project, made to help people see shrimp as animals that feel. The game never preaches. It lets you be one for a while.

**Status:** steps 0 to 2 of the [roadmap](docs/08-roadmap.md) are built. You can move a code-drawn shrimp around a patch of sand: walk, swim, dart with a tail flip. Every key can be changed in Controls. The rest of the game is written down in detail in documents 10 to 16, ready to build: food, feelings, other shrimp and the story come next. Documents 17 and 18 propose a much larger world and more to learn by playing. Document 19 says how to change anything without breaking the rest. The pictures for the first chapter, the mangrove, and part of the lagoon are painted: open `atelier.html` beside the game to see them.

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
