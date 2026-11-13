# 05. Audio direction

Status: draft 0.2, 2026-11-13. Ambient and lo-fi (D25). No AI-generated music (D26). Free licences only (D27).

## The sound in one paragraph

Quiet, warm and slow. Ambient pads, soft piano or guitar, light lo-fi texture. Underwater room tone underneath everything. Small, close sounds for what the shrimp does. Nothing sudden, nothing loud. Silence is allowed.

## Music

- Slow or without a clear beat. 60 to 80 bpm at most. No heavy drums.
- Loops of 2 to 4 minutes that restart without a seam.
- One calm track per area, plus one low, sparse "uneasy" track shared by all areas.

### Music that follows the shrimp

Open-licence tracks usually come as one finished file, not as separate instrument layers. So the music reacts by mixing, not by rearranging:

| Mood | What the music does |
|------|---------------------|
| Calm | Area track at normal level |
| Content | Slight lift in level and brightness |
| Social | A soft second sound joins: a slow chime pattern |
| Curious | A light high shimmer joins |
| Hungry | Level drops a little |
| Afraid | Area track fades down and is filtered dull, as if heard through a wall. The uneasy track fades up. All over 1.5 s |
| Hidden | Everything muffled further |
| After a threat | Uneasy track fades out over 4 s and the area track opens up again |

If a track with separate layers turns up under a suitable licence, use the layers instead.

## Ambience

One bed per area, looping, always on under the music.

| Area | Ambience |
|------|----------|
| Drift | Deep, slow water movement |
| Mangrove | Close water, muffled birds and insects from above the surface, drips |
| Lagoon | Light surf far off, and the crackle of snapping shrimp, which is the real sound of warm shallow seas |
| Channel | Moving water, a low rush |
| The shadow | The channel, plus a diesel throb that grows and fades |
| Open sea | Wide, very low, almost silent |

Rain on the surface and a far-off storm are occasional layers.

## Sound effects

All small and soft.

| Event | Sound |
|-------|-------|
| Walking | Faint, dry ticks on the bed |
| Swimming | A soft flutter |
| Tail flip | A short whoosh with one click |
| Grazing | Tiny crunches |
| First taste, favourite food | One warm note |
| Sense, hold | A soft, glassy wash while held |
| Greeting | Two light taps |
| Hiding under cover | A rustle |
| Burrowing | Sand hiss |
| Molting | A soft crack, then a long breath-like release |
| Discovery, challenge done | A single low bell |
| Achievement | Two low bells |
| Threat cue | A low swell. Not a sting |
| Bird strike | A splash, muffled |
| Fish charge | A fast rush passing |
| Cornered | Sound drops out, then returns slowly |
| Relief | A falling, settling tone |
| Menus | Paper, soft taps |

## Levels

- Music sits about 6 dB under the effects. Ambience sits under the music.
- No sound reaches full scale. Peaks stay below -6 dBFS.
- The threat cue is felt more than heard. There are no jump scares.
- Four volume sliders: master, music, ambience, effects.
- Sound pauses when the browser tab is hidden.

## Captions

With "Captions for sounds" on, sounds that carry meaning show one short line: "[a shadow passes]", "[an engine, far off]", "[Nacre is alarmed]".

## Licences

| Licence | Use it? | Note |
|---------|---------|------|
| CC0, public domain | Yes | Preferred. No conditions |
| CC BY 3.0 or 4.0 | Yes | Credit the author in `CREDITS.md` and on the credits screen |
| CC BY-SA | No | Share-alike terms are unclear for a game that mixes many works |
| CC BY-NC, any NC | No | Conflicts with an open repository |
| Any ND | No | Looping, trimming and filtering are changes |
| "Royalty free" site licences | No | Many forbid sharing the raw file, and a public repository does exactly that |
| AI-generated | No | Decided for music (D26) |

## Where to look

Check the licence on each file's own page on the day of download.

| Source | Licence | Good for |
|--------|---------|----------|
| Freesound | Per file. Filter to CC0 | Water, sand, small natural sounds, ambience |
| OpenGameArt | Per file. Filter to CC0 and CC BY | Ambient and lo-fi loops, effects |
| Kenney | CC0 | Menu and interface sounds |
| Free Music Archive | Per track. Filter to CC BY and CC0 | Ambient and lo-fi music |
| ccMixter | Mostly CC BY | Ambient music |
| Incompetech (Kevin MacLeod) | CC BY 4.0 | Calm instrumental tracks |
| Musopen | Per recording | Public-domain piano recordings, if a Satie or Debussy piece suits an area |

Search words that help: ambient, underwater, lofi, calm, drone, pad, kalimba, felt piano, hydrophone, snapping shrimp.

## Credits process

A sound file is not added to the game until it has a row in `CREDITS.md` with: file name, title, author, source link, licence, and what was changed. The build fails if a file under `public/assets/audio/` has no row. See [06-architecture.md](06-architecture.md).

## Files

- Two encodings of each file so every browser can play it: OGG and M4A.
- Effects: mono. Music and ambience: stereo, about 112 kbps.
- Budget: 12 MB of audio in total, 3 MB for the first release.
- Each area's music and ambience load when the area loads, not at start-up.

## Sounds for the first release

- Music: one Drift track, one Mangrove track, the uneasy track.
- Ambience: Drift, Mangrove.
- Effects: walking, swimming, tail flip, grazing, warm note, sense, greeting, rustle, molt, bell, threat cue, splash, cornered, relief, menu taps.
