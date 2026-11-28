# 13. Script

Status: draft 0.1, 2026-11-14. Every line of text the player can read, with its key, in English and French. All **proposed**. The thirteen narration lines that were samples in [07-science-and-message.md](07-science-and-message.md) are kept word for word and marked "doc 07".

Journal fact cards are not here. Their texts and sources stay in doc 07, and they are not to be written or changed without the author.

To build: copy a key and its two texts into `src/locales/en.json` and `fr.json`. The content test checks that both files have the same keys and the same `{placeholders}`, and that no text has an exclamation mark.

## Rules for the words

From doc 07 and `CLAUDE.md`. They apply to every line below.

- Short. Plain. Present tense. No exclamation marks.
- Narration: second person, from inside the body. Twelve words at most. One line at a time. Senses and body first. No facts, no numbers, no opinions.
- The narration never says "shrimp". It does not know it is one.
- French says "tu". The player's shrimp is female, and so are the three companions: "elle", "toute petite", "seule".
- Nothing tells the player what to think or do outside the game. No moral words.
- Prompts always show the player's own key through `{key}`.
- Goals are worded as things a shrimp does. French uses the infinitive: "Saluer trois crevettes".

Before release, the author, a French speaker, reads every French line aloud (doc 07).

## Narration

`when` is the event that shows the line. Each line shows once per save unless marked "each time".

There are more lines here than a life has room for, on purpose. Lines are of two weights:

- **Must** lines carry the story or name a mood for the first time. They wait their turn and always show.
- Every other line is dropped if another line showed in the last 20 s. A dropped line gets another chance the next time its event happens.

The must lines: `narr.c0.start`, `narr.c0.land`, `narr.c1.arrive`, `narr.c1.senseHint`, `narr.c1.birdGone`, `narr.c1.meet`, `narr.c1.tight`, `narr.c1.notHere`, `narr.c1.salt`, `narr.c1.closed`, `narr.c2.arrive`, `narr.c2.sand`, `narr.c2.dusk`, `narr.c2.lean`, `narr.c3.start`, `narr.c4.sound`, `narr.c4.after`, `narr.c4.all`, `narr.c5.edge`, `narr.c5.last`, `narr.c5.spawn`, the six `narr.mood.*` lines and `narr.cornered`.

### Chapter 0. Drift

| Key | English | Français | When |
|-----|---------|----------|------|
| `narr.c0.start` | The tide carries you. You are very small. | La marée te porte. Tu es toute petite. | Start. doc 07 |
| `narr.c0.yolk` | You need nothing yet. | Tu n'as encore besoin de rien. | 5 s in |
| `narr.c0.taste` | It is good. | C'est bon. | First mote. doc 07 |
| `narr.c0.change` | Your body is not the same as before. | Ton corps n'est plus le même. | The larva changes shape |
| `narr.c0.others` | You are not the only one drifting. | Tu n'es pas seule à dériver. | First touch of another larva |
| `narr.c0.brown` | The water turns warm and brown. | L'eau devient tiède et brune. | Entering the haze |
| `narr.c0.land` | Something solid, at last. You hold on. | Enfin quelque chose de solide. Tu t'accroches. | Landfall |

### Chapter 1. Mangrove

| Key | English | Français | When |
|-----|---------|----------|------|
| `narr.c1.arrive` | Mud under your legs. You can walk. | De la vase sous tes pattes. Tu peux marcher. | Start |
| `narr.c1.full` | Enough. Your body is quiet. | Assez. Ton corps est tranquille. | `s1.fill` done |
| `narr.c1.senseHint` | The water carries more than you can see. | L'eau porte plus que ce que tu vois. | 5 s after `s1.fill`, with the Sense prompt |
| `narr.c1.sensed` | Now you taste where things are. | Maintenant tu goûtes où sont les choses. | `s1.sense` done |
| `narr.c1.plop` | Only something falling. Your body did not wait to know. | Juste quelque chose qui tombe. Ton corps n'a pas attendu de savoir. | After the first seed pod startle |
| `narr.c1.cover` | Under here, the water is still. | Là-dessous, l'eau est calme. | First time hidden |
| `narr.c1.birdGone` | The shadow is gone. Your legs loosen. | L'ombre est partie. Tes pattes se relâchent. | `s1.bird` done. doc 07 |
| `narr.c1.wary` | It is gone. You keep close to the roots anyway. | Elle est partie. Tu restes quand même près des racines. | 8 s into the first wary time |
| `narr.c1.meet` | Another one, like you. | Une autre, comme toi. | First shrimp within 4 BL. doc 07 |
| `narr.c1.greet` | Her antennae touch yours. You know her now. | Ses antennes touchent les tiennes. Tu la connais, maintenant. | `s1.greet` done |
| `narr.c1.nacre` | You will call her Nacre. | Tu l'appelleras Nacre. | Nacre reaches Familiar |
| `narr.c1.tight` | Your shell has become too small. | Ta carapace est devenue trop petite. | Molt signal. doc 07 |
| `narr.c1.notHere` | Not here. Somewhere covered. | Pas ici. Quelque part à l'abri. | 20 s into premolt, in the open. Each time, at most every 40 s |
| `narr.c1.molt` | You slip out of yourself. | Tu te glisses hors de toi-même. | During the molt |
| `narr.c1.soft` | Everything touches you. You are soft. | Tout te touche. Tu es toute molle. | Soft begins |
| `narr.c1.hard` | You are firm again. And larger. | Tu es ferme à nouveau. Et plus grande. | Hardened |
| `narr.c1.salt` | That way, the water tastes of salt. | Par là, l'eau a un goût de sel. | 10 s after hardened |
| `narr.c1.closed` | Too open, out there. Not yet. | Trop ouvert, là-bas. Pas encore. | At the way out before the molt. Each time, at most every 40 s |

### Chapter 2. Lagoon

| Key | English | Français | When |
|-----|---------|----------|------|
| `narr.c2.arrive` | So much light. Nowhere to be unseen. | Tant de lumière. Nulle part où disparaître. | Start |
| `narr.c2.sand` | The sand is soft enough to enter. | Le sable est assez meuble pour s'y glisser. | 8 s in, with the burrow prompt |
| `narr.c2.burrowed` | Only your eyes are left outside. | Seuls tes yeux dépassent. | First time burrowed |
| `narr.c2.dusk` | The light turns to gold. The others are rising. | La lumière devient dorée. Les autres sortent du sable. | First dusk |
| `narr.c2.graze` | You eat side by side. No one hurries. | Vous mangez côte à côte. Personne ne se presse. | `s2.dusk` done |
| `narr.c2.glow` | The water lights up where you move. | L'eau s'allume là où tu passes. | First glowing plankton |
| `narr.c2.brise` | This one always goes first. Brise. | Celle-ci passe toujours devant. Brise. | Brise reaches Familiar |
| `narr.c2.ecume` | A small one, already gone again. Écume. | Une petite, déjà repartie. Écume. | Écume reaches Familiar |
| `narr.c2.turtle` | Something vast passes over. It wants nothing from you. | Quelque chose d'immense passe au-dessus. Il ne te veut rien. | The turtle's first shadow |
| `narr.c2.door` | Two of them share one door. | Ils sont deux à partager une porte. | Finding the pistol shrimp and goby |
| `narr.c2.call` | She comes when you call. | Elle vient quand tu l'appelles. | `s2.bond` done |
| `narr.c2.alarm` | Nacre has stopped. Something is wrong. | Nacre s'est arrêtée. Quelque chose ne va pas. | Nacre's first early alarm. doc 07 |
| `narr.c2.faces` | It turns to face you. | Il se tourne vers toi. | The fish's first pause |
| `narr.c2.fishGone` | Gone. The sand settles. So do you. | Parti. Le sable retombe. Toi aussi. | `s2.fish` done |
| `narr.c2.herMolt` | {name} is soft now. You stay close. | {name} est toute molle. Tu restes près d'elle. | A companion molts with the player within 3 BL |
| `narr.c2.notAlone` | You are soft, and not alone. | Tu es molle, et pas seule. | The player's molt with a companion close |
| `narr.c2.lean` | The water has begun to lean toward the sea. | L'eau commence à pencher vers le large. | 10 s after `s2.molt` |

### Chapter 3. Channel

| Key | English | Français | When |
|-----|---------|----------|------|
| `narr.c3.start` | The water wants to leave. So do you. | L'eau veut partir. Toi aussi. | Start. doc 07 |
| `narr.c3.food` | Food comes to you on the current. | Le courant t'apporte à manger. | First seaweed |
| `narr.c3.narrows` | The walls come close. The water runs. | Les parois se resserrent. L'eau file. | Entering the narrows |
| `narr.c3.pool` | Here the water rests. So can you. | Ici l'eau se repose. Toi aussi. | `s3.tide` done |
| `narr.c3.bar` | Moonlight on the sand. Beyond it, something wide. | La lune sur le sable. Au-delà, quelque chose de vaste. | Reaching the bar |

### Chapter 4. The shadow

| Key | English | Français | When |
|-----|---------|----------|------|
| `narr.c4.sound` | A sound with no shape. | Un bruit sans forme. | Cue. doc 07 |
| `narr.c4.hull` | The light goes out from above. | La lumière s'éteint par le haut. | The hull shadow covers the player |
| `narr.c4.after` | It has passed. The water is full of dust. | C'est passé. L'eau est pleine de poussière. | `s4.net` done |
| `narr.c4.alone` | You cannot taste the others. | Tu ne sens plus les autres. | 6 s later |
| `narr.c4.all` | They are here. Every one. | Elles sont là. Toutes. | `s4.shoal` done |

### Chapter 5. Open sea

| Key | English | Français | When |
|-----|---------|----------|------|
| `narr.c5.edge` | There is no edge here. | Ici, il n'y a plus de bord. | Entering the blue. doc 07 |
| `narr.c5.last` | One last shell to leave. | Une dernière carapace à quitter. | Molt signal |
| `narr.c5.grown` | You are as large as you will ever be. | Tu es aussi grande que tu le seras jamais. | Hardened |
| `narr.c5.deep` | Down here the water is heavy and still. | Ici, l'eau est lourde et calme. | The deepest point |
| `narr.c5.others` | Others have come. You know why without knowing. | D'autres sont venues. Tu sais pourquoi sans le savoir. | Entering the gathering |
| `narr.c5.spawn` | They rise from you like dust in light. | Ils montent de toi comme une poussière dans la lumière. | Spawning. doc 07 |
| `narr.c5.one` | One of them opens. | L'un d'eux s'ouvre. | The egg hatches |

The next generation begins with `narr.c0.start` again.

### Any chapter

| Key | English | Français | When |
|-----|---------|----------|------|
| `narr.mood.calm` | Nothing asks anything of you. You are calm. | Rien ne te demande rien. Tu es calme. | First calm that lasts 10 s |
| `narr.mood.hungry` | Something in you pulls toward the green. You are hungry. | Quelque chose en toi tire vers le vert. Tu as faim. | First hungry. doc 07 |
| `narr.mood.content` | Your whole body settles. You are content. | Tout ton corps s'apaise. Tu es bien. | First content, after `narr.c0.taste` has shown |
| `narr.mood.curious` | Something you do not know yet. You are curious. | Quelque chose que tu ne connais pas encore. Tu es curieuse. | First curious. Extends the doc 07 line |
| `narr.mood.social` | You are not alone. It feels like warmth. | Tu n'es pas seule. C'est comme une chaleur. | First social |
| `narr.mood.afraid` | Your body pulls tight. You are afraid. | Ton corps se serre. Tu as peur. | First afraid. doc 07 |
| `narr.veryHungry` | Your body asks again. Follow the green. | Ton corps réclame. Suis le vert. | Hunger at 0.9. At most every 90 s |
| `narr.tired` | Your tail has nothing left for now. | Ta queue n'a plus de force pour l'instant. | First time tired |
| `narr.groom` | You draw an antenna through your legs. Clean. | Tu passes une antenne entre tes pattes. Propre. | First grooming |
| `narr.frozen` | You do not move. Not one leg. | Tu ne bouges plus. Pas une patte. | First time frozen during a visit |
| `narr.favourite` | This one. This is the one you like best. | Celle-ci. C'est celle que tu préfères. | First taste of the player's favourite food |
| `narr.current` | The water pushes. You lean into it. | L'eau pousse. Tu t'appuies contre elle. | First current |
| `narr.rain` | The roof of the water fills with small sounds. | Le plafond de l'eau s'emplit de petits bruits. | First rain |
| `narr.tooFast` | You moved too fast. She is afraid of you. | Tu es allée trop vite. Elle a peur de toi. | First time the player startles a stranger |
| `narr.hermit` | It was there. Now there is only a shell. | Il était là. Il ne reste qu'une coquille. | First time a hermit crab pulls in. New |
| `narr.fewer` | Fewer than before. | Moins nombreuses qu'avant. | The first time the regrouped shoal is smaller (D42, T56) |
| `narr.cornered` | Dark. Still. You are all here. | Du noir. Du calme. Tu es entière. | Waking after being cornered. Each time |

`narr.cornered` is the one line that must always show. It tells the player that nothing was lost.

## Prompts

Shown the first three times an action is possible.

| Key | English | Français |
|-----|---------|----------|
| `play.hint.move` | {up} {left} {down} {right} to move | {up} {left} {down} {right} pour te déplacer |
| `play.hint.dart` | {key} for a tail flip | {key} pour un coup de queue |
| `play.hint.pause` | {key} for the menu | {key} pour le menu |
| `prompt.steer` | {up} {down} to steer | {up} {down} pour te diriger |
| `prompt.graze` | Hold {key} to graze | Maintiens {key} pour brouter |
| `prompt.taste` | {key} to taste | {key} pour goûter |
| `prompt.sense` | Hold {key} to sense the water | Maintiens {key} pour sentir l'eau |
| `prompt.hide` | Hold {key} to tuck in | Maintiens {key} pour te cacher |
| `prompt.burrow` | Hold {key} to burrow | Maintiens {key} pour t'enfouir |
| `prompt.greet` | {key} to greet | {key} pour saluer |
| `prompt.call` | Hold {key} to call | Maintiens {key} pour appeler |
| `prompt.examine` | {key} to feel it | {key} pour toucher |
| `prompt.rest` | {key} to rest until dusk | {key} pour te reposer jusqu'au soir |
| `prompt.journal` | {key} for the carnet | {key} pour le carnet |

The first three exist already. Check the existing French against these before changing it.

## Small lines

| Key | English | Français | When |
|-----|---------|----------|------|
| `line.discovery` | New in the carnet: {name} | Nouveau dans le carnet : {name} | A discovery |
| `line.card` | A new page: {name} | Une nouvelle page : {name} | A fact card unlocks |
| `line.progress` | {name} {value}/{target} | {name} {value}/{target} | A challenge moves |
| `line.done` | Done: {name} | Fait : {name} | A challenge is completed |
| `line.achievement` | {name} | {name} | An achievement, with its stamp |
| `line.pinned` | Pinned: {name} | Épinglé : {name} | Pinning |

## Captions

With "Captions for sounds" on.

| Key | English | Français |
|-----|---------|----------|
| `caption.shadow` | [a shadow passes] | [une ombre passe] |
| `caption.step` | [something steps into the water] | [quelque chose entre dans l'eau] |
| `caption.strike` | [a splash, close] | [une éclaboussure, tout près] |
| `caption.rush` | [something fast goes by] | [quelque chose passe très vite] |
| `caption.relief` | [the water settles] | [l'eau se calme] |
| `caption.alarm` | [{name} is alarmed] | [{name} est inquiète] |
| `caption.plop` | [something falls into the water] | [quelque chose tombe dans l'eau] |
| `caption.rain` | [rain on the surface] | [la pluie sur la surface] |
| `caption.crackle` | [a fine crackling, all around] | [un fin crépitement, partout] |
| `caption.engineFar` | [an engine, far off] | [un moteur, au loin] |
| `caption.engineNear` | [the engine, overhead] | [le moteur, juste au-dessus] |
| `caption.longSound` | [a long call, very far away] | [un long appel, très loin] |

## Mood words

With "Name feelings on screen" on.

| Key | English | Français |
|-----|---------|----------|
| `mood.calm` | Calm | Calme |
| `mood.hungry` | Hungry | Affamée |
| `mood.content` | Content | Bien |
| `mood.curious` | Curious | Curieuse |
| `mood.social` | In company | En compagnie |
| `mood.afraid` | Afraid | Effrayée |

## Names

### Places

| Key | English | Français |
|-----|---------|----------|
| `name.place.drift` | The drift | La dérive |
| `name.place.mangrove` | The mangrove | La mangrove |
| `name.place.hollow` | The hollow | Le creux |
| `name.place.lagoon` | The lagoon | La lagune |
| `name.place.seagrass` | The seagrass | L'herbier |
| `name.place.channel` | The channel | Le chenal |
| `name.place.shadow` | The shadow | L'ombre |
| `name.place.openSea` | The open sea | Le large |
| `name.place.deep` | The deep | Le fond |

A place name shows alone for 3 s, in Fraunces 56 px, when the player first enters it.

### Foods

| Key | English | Français |
|-----|---------|----------|
| `name.food.microalgae` | Microalgae | Microalgues |
| `name.food.algaeFilm` | Algae film | Voile d'algues |
| `name.food.mangroveLeaf` | Fallen leaf | Feuille tombée |
| `name.food.seagrassFuzz` | Seagrass fuzz | Duvet d'herbier |
| `name.food.sandFilm` | Golden film | Voile doré |
| `name.food.seaweed` | Drifting seaweed | Algue dérivante |

### Creatures and things

| Key | English | Français |
|-----|---------|----------|
| `name.creature.shrimp` | Another one, like you | Une autre, comme toi |
| `name.creature.fiddlerCrab` | Fiddler crab | Crabe violoniste |
| `name.creature.snail` | Snail | Escargot |
| `name.creature.smallFish` | Small fish | Petits poissons |
| `name.creature.bird` | The shadow with legs | L'ombre à pattes |
| `name.creature.turtle` | Green turtle | Tortue verte |
| `name.creature.pistolAndGoby` | Pistol shrimp and goby | Crevette-pistolet et gobie |
| `name.creature.huntingFish` | The long fish | Le long poisson |
| `name.thing.seedPod` | Mangrove seedling | Plantule de palétuvier |
| `name.thing.sunkenBranch` | Sunken branch | Branche engloutie |
| `name.thing.glowingPlankton` | Glowing plankton | Plancton lumineux |
| `name.thing.crackle` | The crackle | Le crépitement |
| `name.thing.eggs` | The next ones | Les suivantes |
| `name.creature.hermitCrab` | Hermit crab | Bernard-l'ermite |
| `name.creature.barnacles` | Barnacles | Balanes |
| `name.thing.crabPellets` | Mud balls | Boulettes de vase |
| `name.thing.breathingRoots` | Breathing roots | Racines qui respirent |
| `name.drift.copepod` | Glass hopper | Sauteur de verre |
| `name.drift.bell` | Drifting bell | Cloche à la dérive |
| `name.thing.sandVolcano` | Sand mound | Petit volcan de sable |
| `name.thing.shedShell` | A shed shell | Une mue |
| `name.thing.longSound` | A long call | Un long appel |
| `name.creature.seaStar` | Sea star | Étoile de mer |

The bird and the fish are named as the shrimp knows them. The last nine belong to the new things in doc 11. The sea star was added to the lagoon later (doc 11); its name is proposed, for the author to confirm (T90).

### Companions

| Key | English | Français |
|-----|---------|----------|
| `companion.brise.look` | Her left antenna is shorter than the right. | Son antenne gauche est plus courte que la droite. |
| `companion.brise.way` | First out, last under cover. | Première sortie, dernière à l'abri. |
| `companion.brise.more` | She goes in straight lines and does not look back. | Elle va tout droit et ne se retourne pas. |
| `companion.nacre.look` | Her tail fan is almost white. | Son éventail est presque blanc. |
| `companion.nacre.way` | She stops often and listens with her whole body. | Elle s'arrête souvent et écoute de tout son corps. |
| `companion.nacre.more` | She knows before anyone that something is coming. | Elle sait avant tout le monde que quelque chose approche. |
| `companion.ecume.look` | Smaller than the others, and quicker. | Plus petite que les autres, et plus vive. |
| `companion.ecume.way` | She wanders off. She comes back. | Elle s'éloigne. Elle revient. |
| `companion.ecume.more` | Nothing new stays unknown to her for long. | Rien de nouveau ne lui reste longtemps inconnu. |
| `companion.brise.name` | Brise | Brise |
| `companion.nacre.name` | Nacre | Nacre |
| `companion.ecume.name` | Écume | Écume |
| `companion.met` | Met: {place} | Rencontrée : {place} |
| `companion.favourite` | Likes best: {food} | Préfère : {food} |
| `companion.memory.fled` | You fled {threat} together. | Vous avez fui {threat} ensemble. |
| `companion.memory.yourMolt` | She stayed while you were soft. | Elle est restée quand tu étais molle. |
| `companion.memory.herMolt` | You stayed while she was soft. | Tu es restée quand elle était molle. |
| `companion.memory.threat.bird` | the shadow with legs | l'ombre à pattes |
| `bond.stranger` | Stranger | Inconnue |
| `bond.familiar` | Familiar | Familière |
| `bond.companion` | Companion | Compagne |
| `bond.close` | Close | Proche |

In `companion.memory.fled`, `{threat}` takes the creature's name with a lower-case article: "the shadow with legs", "l'ombre à pattes". Keep a second key per creature for that form if the article cannot be made by code: `companion.memory.threat.<kind>`, one per threat as it is built.

## Challenges

`challenge.<id>.name` and `challenge.<id>.what`.

| Id | Name | What | Nom | Quoi |
|----|------|------|-----|------|
| `c0.motes` | Fifteen motes | Eat 15 green motes | Quinze grains | Manger 15 grains verts |
| `c0.larva` | Not the only one | Touch another larva | Pas la seule | Toucher une autre larve |
| `c1.tastes` | Three tastes | Try every food of the mangrove | Trois goûts | Goûter à tout ce qui se mange dans la mangrove |
| `c1.branch` | The sunken branch | Find it, at the far side | La branche engloutie | La trouver, tout au fond |
| `c1.crab` | The waving claw | Watch a fiddler crab wave | La pince qui salue | Regarder un crabe violoniste agiter sa pince |
| `c1.clean` | Out of the shadow | Let the shadow with legs leave without striking | Hors de l'ombre | Laisser repartir l'ombre à pattes sans qu'elle frappe |
| `c1.greet3` | Three greetings | Greet three different shrimp | Trois saluts | Saluer trois crevettes différentes |
| `c1.together` | Side by side | Hide beside another shrimp | Côte à côte | Se cacher à côté d'une autre crevette |
| `c1.gentle` | Slowly | Walk up to a hermit crab without sending it into its shell | Tout doucement | Approcher un bernard-l'ermite sans qu'il rentre dans sa coquille |
| `c2.neighbours` | Two at one door | Find the pistol shrimp and its goby | Deux à la même porte | Trouver la crevette-pistolet et son gobie |
| `c2.glow` | Lit water | Graze under the glowing plankton | L'eau allumée | Brouter sous le plancton lumineux |
| `c2.turtle` | In the turtle's wake | Follow the turtle for a while | Dans le sillage de la tortue | Suivre la tortue un moment |
| `c2.favourites` | What they like | Learn each companion's favourite food | Ce qu'elles aiment | Découvrir la nourriture préférée de chaque compagne |
| `c2.molt` | Staying | Stay with a companion through her molt | Rester | Rester près d'une compagne pendant sa mue |
| `c2.sidestep` | Sidestep | Let a charge go past with a tail flip | Le pas de côté | Laisser passer une charge d'un coup de queue |
| `c2.shell` | An empty shape | Find a shed shell | Une forme vide | Trouver une mue |
| `c3.uncornered` | Clean run | Reach the sea without being cornered | Sans accroc | Atteindre la mer sans être acculée |
| `c3.together` | All four | Keep all three companions close for a minute | Toutes les quatre | Garder les trois compagnes tout près pendant une minute |
| `c3.seaweed` | On the move | Eat drifting seaweed without stopping | Sans s'arrêter | Manger des algues dérivantes sans s'arrêter |
| `c4.edge` | By the edge | Leave the grid by its side | Par le bord | Quitter la grille par le côté |
| `c4.crevice` | In the rock | Wait in a crevice until it has passed | Dans la roche | Attendre dans une fente qu'elle soit passée |
| `c5.deep` | The deepest point | Find it | Le point le plus profond | Le trouver |
| `c5.rest` | Touching | Rest against a close companion | Tout contre | Se reposer contre une compagne proche |

The word "shrimp" appears here. That is allowed: this is the journal speaking, not the narration.

## Achievements

`ach.<id>.name` and `ach.<id>.how`.

| Id | Name | How | Nom | Comment |
|----|------|-----|-----|---------|
| `landfall` | Landfall | Reach the mangrove | Toucher terre | Atteindre la mangrove |
| `newShell` | New shell | Molt for the first time | Nouvelle carapace | Muer pour la première fois |
| `fullGrown` | Full grown | Molt for the third time | Adulte | Muer pour la troisième fois |
| `antenna` | Antenna to antenna | Greet another shrimp | Antenne contre antenne | Saluer une autre crevette |
| `familiar` | Familiar faces | Become familiar with all three companions | Têtes connues | Devenir familière des trois compagnes |
| `shoal` | Shoal | Become close to all three companions | Le banc | Devenir proche des trois compagnes |
| `everyTaste` | Every taste | Taste all six foods | Tous les goûts | Goûter aux six nourritures |
| `nose` | Nose for it | Follow a scent to food ten times | Du flair | Suivre dix fois une odeur jusqu'à la nourriture |
| `quickTail` | Quick tail | Fifty tail flips | Queue vive | Cinquante coups de queue |
| `unseen` | Unseen | Finish a chapter without one chase beginning | Ni vue ni connue | Finir un chapitre sans qu'une poursuite commence |
| `neverCornered` | Never cornered | Reach the open sea without once being cornered | Jamais acculée | Atteindre le large sans jamais être acculée |
| `underGrid` | Under the grid | Come through the shadow | Sous la grille | Traverser l'ombre |
| `nightGrazer` | Night grazer | Eat at night ten times | Brouteuse de nuit | Manger dix fois la nuit |
| `neighbour` | Good neighbour | Find the pistol shrimp and its goby | Bonne voisine | Trouver la crevette-pistolet et son gobie |
| `slowCompany` | Slow company | Follow the turtle | Lente compagnie | Suivre la tortue |
| `openWater` | Open water | Reach the open sea | Pleine eau | Atteindre le large |
| `nextOnes` | The next ones | Spawn | Les suivantes | Pondre |
| `secondTide` | Second tide | Begin a second life | Deuxième marée | Commencer une deuxième vie |
| `fifthTide` | Fifth tide | Begin a fifth life | Cinquième marée | Commencer une cinquième vie |
| `fullCarnet` | Full carnet | Find every discovery | Carnet plein | Trouver toutes les découvertes |
| `allOfIt` | All of it | Complete every challenge | Tout | Réussir tous les défis |
| `cleanAntennae` | Clean antennae | Groom ten times | Antennes propres | Faire dix toilettes |
| `stoneStill` | Stone still | Stay in the open without moving until a hunter leaves | Comme une pierre | Rester à découvert sans bouger jusqu'au départ d'un chasseur |
| `gentle` | Gentle | Walk up to a hermit crab | En douceur | Approcher un bernard-l'ermite |

## The journal

| Key | English | Français |
|-----|---------|----------|
| `journal.title` | The carnet | Le carnet |
| `journal.tab.discoveries` | Discoveries | Découvertes |
| `journal.tab.companions` | Companions | Compagnes |
| `journal.tab.feel` | What shrimp feel | Ce que ressentent les crevettes |
| `journal.tab.challenges` | Challenges | Défis |
| `journal.tab.achievements` | Achievements | Succès |
| `journal.group.foods` | Foods | Nourritures |
| `journal.group.places` | Places | Lieux |
| `journal.group.creatures` | Creatures | Animaux |
| `journal.group.things` | Things | Choses |
| `journal.count` | {found} / {total} | {found} / {total} |
| `journal.where` | Found: {place} | Trouvé : {place} |
| `journal.source` | Source: {source} | Source : {source} |
| `journal.notYet` | Not found yet | Pas encore trouvé |
| `journal.noCompanion` | No one yet | Personne encore |
| `journal.remaining` | {n} more to find | Encore {n} à trouver |
| `journal.best` | Best so far: {value}/{target} | Meilleur essai : {value}/{target} |
| `journal.later` | Later in the life | Plus tard dans la vie |
| `journal.help` | Arrows to move. {pin} to pin. {close} to close. | Flèches pour se déplacer. {pin} pour épingler. {close} pour fermer. |

## Journal cards

The cards of "What shrimp feel" built so far, copied word for word from doc 07 and from doc 18's drafts. `card.<id>.name` is the title and `card.<id>.text` the card. What unlocks each, and its sources, are in doc 12 and `src/data/journal.ts`. A card is shown to players only when all its sources are read (doc 07, "Before release"). With `?debug` all of them unlock, for the author to read (T88).

The titles of the five cards from doc 18 are proposed: doc 18 gives English names only, and the French titles are new, for the author to confirm (T88).

| Key | English | Français |
|-----|---------|----------|
| `card.toLight.name` | To the light | Vers la lumière |
| `card.toLight.text` | A whiteleg shrimp hatches as a nauplius. It lives on its yolk and swims toward light. | La crevette à pattes blanches naît sous forme de nauplius. Elle vit sur ses réserves et nage vers la lumière. |
| `card.shapes.name` | Twelve stages | Douze stades |
| `card.shapes.text` | Before it looks like a shrimp, a larva passes through twelve stages: six as a nauplius, three as a protozoea, three as a mysis. | Avant de ressembler à une crevette, la larve passe par douze stades : six de nauplius, trois de protozoé, trois de mysis. |
| `card.rideTide.name` | Carried in | Portée par la marée |
| `card.rideTide.text` | Young pink shrimp in Florida rose into the water at night when the tide ran toward the coast, and rested near the bottom when it ran back. The tide did the travelling. | En Floride, de jeunes crevettes roses montaient dans l'eau, la nuit, quand la marée portait vers la côte, et se posaient près du fond quand elle repartait. C'est la marée qui faisait le voyage. |
| `card.scent.name` | Scent | L'odorat |
| `card.scent.text` | A shrimp's antennae are covered in sensors that taste the water. They lead it to food in the dark, and in a 2024 study they let males know a female by the taste of her shell. | Les antennes d'une crevette sont couvertes de capteurs qui goûtent l'eau. Elles la guident vers sa nourriture dans le noir, et dans une étude de 2024, elles permettaient aux mâles de reconnaître une femelle au goût de sa carapace. |
| `card.heart.name` | A skipped beat | Un battement manqué |
| `card.heart.text` | When something startles a crayfish, its heart slows for a few beats, then races. Researchers read the heart to know that an animal has noticed something, even when it does not move. | Quand quelque chose surprend une écrevisse, son cœur ralentit le temps de quelques battements, puis s'emballe. Les chercheurs lisent le cœur pour savoir qu'un animal a remarqué quelque chose, même s'il ne bouge pas. |
| `card.fear.name` | Fear | La peur |
| `card.fear.text` | Crabs and hermit crabs learn to avoid a place where something hurt them, and will give up a good shelter to stay away from it. | Les crabes et les bernard-l'ermite apprennent à éviter un endroit où quelque chose leur a fait mal, quitte à abandonner un bon abri. |
| `card.wary.name` | Still wary | Encore inquiète |
| `card.wary.text` | After a bad moment, crayfish keep to dark corners for a while. Given a medicine that eases anxiety in people, they go exploring again. | Après un mauvais moment, les écrevisses restent un temps dans les coins sombres. Avec un médicament qui calme l'anxiété chez l'humain, elles repartent explorer. |
| `card.tailflip.name` | The tail flip | Le coup de queue |
| `card.tailflip.text` | One snap of the tail throws a shrimp backward faster than most hunters can follow. It is tiring, so it is kept for emergencies. | D'un coup de queue, une crevette se projette en arrière plus vite que la plupart des chasseurs. C'est épuisant, alors elle le garde pour les urgences. |
| `card.grooming.name` | Grooming | La toilette |
| `card.grooming.text` | Shrimp clean their antennae often. In a 2008 study, prawns rubbed and groomed one antenna for a long time after an irritant touched it, and far less when given a local anaesthetic. | Les crevettes nettoient souvent leurs antennes. Dans une étude de 2008, des crevettes ont longuement frotté et nettoyé une antenne touchée par un produit irritant, et beaucoup moins sous anesthésique local. |
| `card.molt.name` | A new shell | Une nouvelle carapace |
| `card.molt.text` | To grow, a shrimp leaves its shell behind. The new one is soft for a few hours, and the shrimp hides until it hardens. | Pour grandir, une crevette quitte sa carapace. La nouvelle reste molle quelques heures, et la crevette se cache le temps qu'elle durcisse. |
| `card.balance.name` | A grain of sand | Un grain de sable |
| `card.balance.text` | A shrimp keeps its balance with grains of sand held in a small pocket at the base of its short antennae. They leave with the old shell and are put back after each molt. | Une crevette tient son équilibre grâce à des grains de sable logés dans une petite poche à la base de ses antennules. Ils partent avec l'ancienne carapace et sont remis après chaque mue. |
| `card.seeThrough.name` | See-through | Presque transparente |
| `card.seeThrough.text` | A whiteleg shrimp is nearly transparent. Its tint shifts with the ground beneath it and the water around it. | La crevette à pattes blanches est presque transparente. Sa teinte change selon le fond et l'eau qui l'entoure. |
| `card.journey.name` | The journey | Le voyage |
| `card.journey.text` | Whiteleg shrimp are born in the open ocean. The larvae drift to the coast, grow up in lagoons and mangroves, and return to sea as adults at six or seven months. | Les crevettes à pattes blanches naissent en pleine mer. Les larves dérivent vers la côte, grandissent dans les lagunes et les mangroves, puis regagnent le large, adultes, à six ou sept mois. |
| `card.nextOnes.name` | The next ones | Les suivantes |
| `card.nextOnes.text` | A female releases between 100,000 and 250,000 eggs at a time. They hatch about sixteen hours later. | Une femelle libère entre 100 000 et 250 000 œufs à la fois. Ils éclosent environ seize heures plus tard. |
| `card.feel.name` | Able to feel | Capable de ressentir |
| `card.feel.text` | In 2021, researchers in London reviewed more than 300 studies and found strong evidence that decapods, the group that includes shrimp, crabs and lobsters, can feel. The United Kingdom wrote this into law the next year. | En 2021, des chercheurs londoniens ont passé en revue plus de 300 études et trouvé des preuves solides que les décapodes, le groupe des crevettes, des crabes et des homards, peuvent ressentir. Le Royaume-Uni l'a inscrit dans sa loi l'année suivante. |
| `card.howMany.name` | How many | Combien |
| `card.howMany.text` | According to Rethink Priorities, shrimp are the animals most often killed for food: about 440 billion farmed shrimp each year. | Selon Rethink Priorities, les crevettes sont les animaux les plus tués pour l'alimentation : environ 440 milliards de crevettes d'élevage chaque année. |

## Sources shown

The line under a card, `journal.source`, names its sources. Each is `source.<key>`, with the keys of doc 07 and doc 18. Several are joined with "; ".

| Key | English | Français |
|-----|---------|----------|
| `source.LSE2021` | Birch and others (2021), London School of Economics | Birch et al. (2021), London School of Economics |
| `source.BARR2008` | Barr and others (2008), Animal Behaviour | Barr et al. (2008), Animal Behaviour |
| `source.RP2023` | Waldhorn and Autric (2023), Rethink Priorities | Waldhorn et Autric (2023), Rethink Priorities |
| `source.FAO` | FAO, fact sheet on Penaeus vannamei | FAO, fiche sur Penaeus vannamei |
| `source.UK2022` | Animal Welfare (Sentience) Act 2022, United Kingdom | Animal Welfare (Sentience) Act 2022, Royaume-Uni |
| `source.FOSSAT2014` | Fossat and others (2014), Science | Fossat et al. (2014), Science |
| `source.ELWOOD2009` | Elwood and Appel (2009), Animal Behaviour | Elwood et Appel (2009), Animal Behaviour |
| `source.ARNOTT1998` | Arnott, Neil and Ansell (1998), Journal of Experimental Biology | Arnott, Neil et Ansell (1998), Journal of Experimental Biology |
| `source.MAGEE2013` | Magee and Elwood (2013), Journal of Experimental Biology | Magee et Elwood (2013), Journal of Experimental Biology |
| `source.CHEMO2020` | Eap and others (2020), The Biological Bulletin | Eap et al. (2020), The Biological Bulletin |
| `source.GUTIERREZ2024` | Gutiérrez-Vera and others (2024), Animals | Gutiérrez-Vera et al. (2024), Animals |
| `source.CRIALES2011` | Criales and others (2011), Journal of Crustacean Biology | Criales et al. (2011), Journal of Crustacean Biology |
| `source.SCHAPKER2002` | Schapker and others (2002), Comparative Biochemistry and Physiology | Schapker et al. (2002), Comparative Biochemistry and Physiology |
| `source.KREIDL1893` | Kreidl (1893) | Kreidl (1893) |

## Menus and settings

Keys that exist already (`title.*`, `pause.*`, `controls.*`, `action.*`, `key.*`, `notice.notKept`) are not repeated.

| Key | English | Français |
|-----|---------|----------|
| `title.menu.continue` | Continue | Continuer |
| `title.menu.newLife` | New life | Nouvelle vie |
| `title.menu.settings` | Settings | Réglages |
| `title.menu.about` | About | À propos |
| `title.generation` | Life {n} | Vie {n} |
| `pause.journal` | Carnet | Carnet |
| `pause.settings` | Settings | Réglages |
| `settings.title` | Settings | Réglages |
| `settings.group.language` | Language | Langue |
| `settings.group.controls` | Controls | Commandes |
| `settings.group.sound` | Sound | Son |
| `settings.group.comfort` | Comfort | Confort |
| `settings.group.data` | Data | Données |
| `settings.sense` | Sense | Sentir |
| `settings.hide` | Hide | Se cacher |
| `settings.hold` | Hold | Maintenir |
| `settings.toggle` | Toggle | Bascule |
| `settings.volume.master` | Master volume | Volume général |
| `settings.volume.music` | Music | Musique |
| `settings.volume.ambience` | Ambience | Ambiance |
| `settings.volume.effects` | Effects | Effets |
| `settings.captions` | Captions for sounds | Sous-titres des sons |
| `settings.gentle` | Gentle mode | Mode doux |
| `settings.gentle.help` | Hunters pass by and never chase. | Les chasseurs passent sans jamais poursuivre. |
| `settings.reducedMotion` | Reduced motion | Mouvements réduits |
| `settings.textScale` | Text size | Taille du texte |
| `settings.nameFeelings` | Name feelings on screen | Nommer les émotions à l'écran |
| `settings.on` | On | Oui |
| `settings.off` | Off | Non |
| `settings.startOver` | Start over | Tout recommencer |
| `settings.startOver.confirm` | This erases the life, the carnet and the companions. Press Enter again to start over. | Cela efface la vie, le carnet et les compagnes. Appuie encore sur Entrée pour tout recommencer. |
| `settings.startOver.done` | Started over. | C'est recommencé. |
| `about.title` | About | À propos |
| `about.personal` | La vie des crevettes is a personal project. | La vie des crevettes est un projet personnel. |
| `about.sources` | Sources for the carnet | Sources du carnet |
| `about.credits` | Credits | Crédits |
| `about.counter` | This site counts visits anonymously. No cookies. | Ce site compte les visites de façon anonyme. Aucun cookie. |
| `notice.keyboard` | This game is played with a keyboard. Open it on a computer. | Ce jeu se joue au clavier. Ouvre-le sur un ordinateur. |
| `notice.saved` | Kept. | Gardé. |
| `end.continued` | The rest of the life is being made. Stay here as long as you like. | La suite de la vie est en préparation. Reste ici autant que tu veux. |

`end.continued` stands at the last way out that leads nowhere yet: the creek mouth in release 0.1, the lagoon's pass from release 0.2 until the channel exists (T100), the channel's bar until the shadow's story exists, and the shadow's edge toward the open sea until the open sea exists (T121).

## Counts

| Group | Lines |
|-------|-------|
| Narration | 76, of which 28 must show |
| Prompts | 14 |
| Small lines | 6 |
| Captions | 12 |
| Mood words | 6 |
| Names | 38 |
| Companions and bonds | 21 |
| Challenges | 23, two texts each |
| Achievements | 24, two texts each |
| Journal | 19 |
| Journal cards | 16, two texts each |
| Sources shown | 14 |
| Menus and settings | 40 |

With the 20 s gap, a life of twenty minutes has room for sixty lines at the very most. In practice a player sees the 28 must lines and perhaps fifteen of the others: about one line every thirty seconds, most of them in the first two chapters.
