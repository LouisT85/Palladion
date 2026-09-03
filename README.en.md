# 🏛️ PALLADION - Chronicles of the Trojan War

[🇫🇷 Français](README.md) | 🇬🇧 English

> The *Palladion*: Athena's statue, fallen from the sky - as long as it stands in the city,
> Troy cannot fall. A divine talisman the town's survival depends on: exactly the wager of
> this game, where your standing with the gods decides how well you weather an assault.

**A village-management game set during the Trojan War.** Build, defend, honour the gods - and
watch your village **genuinely change appearance** with every upgrade, every season, every
breach. Then publish your city as a hundred-and-twenty-character code, and let a friend come
break his teeth on it.

**100% front-end** (React + TypeScript + SVG), local saves, deployable as a static site.
Not one image, not one sound downloaded: **everything is drawn and synthesised by the code**.

| From a hamlet…                                     | …to a city of legend                                          |
| --------------------------------------------------- | ------------------------------------------------------------- |
| ![Village in its first spring](docs/village-debut.jpg) | ![Complete city, eleven domains at level 4](docs/village-max.jpg) |

## ✨ What makes PALLADION different

### 🏺 The duel: raid another player's village, with no server

The game has **no server and no accounts**. Multiplayer therefore takes the shape of **mail**:
three codes that travel as text, in a message, an email, whatever you like.

You **seal your defence card** - about a hundred characters, `PALL-D1-AQBOGE…` - and hand it
over. It publishes a **target**: your walls and their current structure, your towers, the
Redoubt, the inner works, your garrison, **your entire defence plan**, your heroes, your
chief's temperament. It contains none of your stores, none of your building works, none of
your inhabitants - reading it gives no way to take over your reign.

Your friend pastes that code on his machine, **sees your city before committing**, assembles
his column, picks which wall sections he comes through, and fights **against your plan**. He
sends you back a report; **your own client replays the assault** from the seed it carries and
compares. "The simulation confirms" → it applies. Otherwise → refused, with its reason.

The anti-cheat is therefore **reproducibility**, not a signature. The same report presented
twice is refused; a single changed character is refused; a report matching no card you ever
issued is refused. And the loot is capped, computed on the card you **issued**: publishing is
never signing a blank cheque.

It is also the first time the **defence plan** you set in peacetime faces an actual person.

### 🐴 "The Fall" - a campaign in five acts

The campaign follows the Iliad - the thousand ships, Achilles' wrath, beneath the walls, the
river, the horse - but from a vantage point the epic never takes: **you are not Troy**. You
hold a village of the Troad on the armies' road, and the great war crushes you by accident.

Each act **imposes an inherited situation** rather than a fresh start: the buildings standing,
the garrison, the season, the sky, your standing with the gods - down to a wall section already
down in Act IV, which therefore opens mid-siege. Objectives don't ask for totals but for **a
way of holding**: "three assaults without a single section giving way", "an assault without
losing a man", "the fourth tower before the night of the sack". Each can be lost, and you retry
the act, not the campaign. Some heroes impose themselves without ransom because the story brings
them: Hector in Act III, Achilles in IV, Aeneas and Cassandra in the ashes of V. And each act
has **its own ground**: the sand of Sigeum, the mud of ten years of camp, the dust of the siege,
the Scamander in flood, the ash of Ilion.

![The prologue of Act I](docs/campagne.jpg)

### ⚡ Zeus takes you by the hand

Your first game doesn't open on a wall of help text: the lord of Olympus comes down and teaches
the lesson himself, in fifteen steps. Each time, the whole screen goes dark **except the thing
you must touch** - and clicking "next" isn't enough: the steps that matter demand the gesture.
Build the farm, put a farmhand in it, raise the wall, open the temple. You can neither get lost
nor skim.

![Zeus's lesson](docs/tutoriel.jpg)

### 🧱 Buildings that evolve **visually**

Every building is drawn **in SVG by code**, in textured volumes (tiles, stone, thatch, furrows),
with a distinct look per level. The ramparts go from a stake palisade → to a dry-stone wall → to
a crenellated rampart → to the high walls "built by Poseidon", with artwork specific to each
level **on both faces of the wall**: masonry and arrow slits outside, buttresses, exposed
tie-beam ends and stairs inside. The same holds for the ten other domains. Damage shows and
**stays**: cracks, collapsed sections, torn gates - but after an assault, felled buildings
**raise themselves** over five seconds back to the level they had. And the village **lives**:
villagers strolling, an ox cart, goats, sheep, smoke and braziers.

### 🌱 Four seasons and a sky that changes everything

Four game days per season. **Spring** brings up the wheat, **summer** hardens the ground and
opens the sea, **autumn** fills the granaries, **winter closes the sea** - the port runs at a
third, overseas strongholds out of reach, unless Poseidon has granted you his grace. Over that,
weather that turns: **rain** slackens bowstrings, **fog** cuts tower range, **storm** makes the
lightning heavier, **snow** slows the columns. None of it is merely a number: the foliage turns
then falls, snowdrifts settle in.

![Winter over the Troad](docs/saisons.jpg)

### ⚔️ Assaults played out before your eyes, and orders to give

Armed bands attack regularly, and your scouts announce **the composition of the wave, the
promised reward, and sometimes the name of the champion leading it** - one of the eight heroes
of the Trojan cycle, precisely the ones you can recruit, with his manoeuvre announced in advance
and its countdown. The wave then splits across **several fronts**: each wall section has its own
structure points and **can give way alone**.

And you don't just watch: you command. Three **line stances** (hold, shield wall, charge), two
**ways of shooting** (flat, arcing), a **wall section assignable per unit type** and **per hero
by name**. All of it is set **in peacetime** in a permanent defence plan that every battle adopts
at its opening. **Morale** matters: below a threshold, men break one by one rather than melting
away to the last - and a hero still standing lowers that threshold sharply.

Once the wall is breached, there is still something to fight with: five **inner works** attested
in Bronze Age citadels (acropolis wall, gate bastion, the galleries of Tiryns, postern, cistern
cut into the rock) and **the Redoubt** - a scorpion platform, silent while the wall holds, which
opens fire at the breach on whatever has *come in*.

![An assault on three fronts](docs/bataille.jpg)

### 👷 Every inhabitant has a name, a trade, an age - and a family

A villager is born a farmhand, woodcutter, stonecutter, smith, priest or docker. **At his own
trade he gives fully; elsewhere, 55%.** Nobody takes a post on their own: it's your decision
every time a building is finished, and a workshop left empty plants a red sign on the map.

One game day is worth **two years of life**. Inhabitants age (a child helps without replacing
anyone and cannot bear arms; an elder gives less and eventually dies), **make households**
between different houses, and a child born in a household **learns one of its parents' trades**.
Marrying your smith is giving yourself smiths; letting him die unmarried is losing the forge
with him.

The same trade-off applies to the army: **a soldier is one villager fewer** - he leaves the
workshop, stops producing, and eats double.

### 👑 A chief who ages, dies, and is replaced

You are no longer an abstraction. Your chief has a name, a house, an age, and **two traits out
of twelve** that change the game - builder, man of war, son of the soil, impious, beloved of the
people, hard hand, raider, prodigal… None is a gift: each gives on one side and takes on the
other.

He ages on the same clock as his subjects, and he dies. The throne then falls **vacant** - it
enthrones nobody in your stead. You choose an heir among the adults of the village's houses,
each with his own traits, shown before you choose. And crowning someone **removes him from the
village**: you lose an arm, and his trade with him. That's the trade-off.

The founder has no traits at all: he is the flat baseline, and temperament enters the dynasty at
the first succession.

### 🛡️ Eight heroes - fed, and lost

They aren't bought: they come when the city is worthy of them. Hector wants level-3 ramparts and
Zeus in favour; Odysseus a port and Athena's trust; Achilles blood already spilt. Each brings a
**permanent passive** and an **ability** to invoke in battle, gains levels by fighting - and
**eats every minute**. Three unanswered upkeep reminders and he takes to the road again.

They are real inhabitants: you see them **walking the village square**, each in his own colours
and under his own name, and they **come down to fight** in the front rank. A hero brought down
in the melee isn't struck from the roster - he's wounded, and his ability stays unavailable while
he recovers. Only his own story arc can kill him.

Above all, each goes through a **branching arc** whose branches don't all replay: Achilles can
die under Paris's arrow, or survive uselessly; Hector can go out to meet his fate, or obey and
never grow again. **Heroes must be able to die** - that's what makes their presence tense rather
than comfortable.

| The heroic household              | A choice with no way back              |
| ------------------------------------- | ------------------------------------- |
| ![Heroes panel](docs/heros.png) | ![Hector's arc](docs/heros-arc.png) |

### 🗺️ Raid, rescue… or besiege

Eight strongholds of the Troad, each with its **painted setting** and its **works to bring down**
- the chief's tent, the warehouse, the keep, the guardhouse - one of which is a **heart** whose
fall decides the raid. Three ways to march on them:

- **Raid** - high loot, but Zeus Xenios dislikes it, the threat rises, and the village
  **remembers**: its garrison will be fuller on your next visit.
- **Rescue** - when a besieged village calls for help, you have a few minutes to decide. No
  loot, a real chance of losing men for nothing - but the gods' favour and an **alliance**:
  regular tribute, and reinforcements who climb your ramparts and fall before your own men,
  recognisable by their olive-green tunics.
- **Besiege** - not a battle, a **duration**. You post men before the place; they stay, they eat
  your grain every day, they wear down. You cut the water, burn the harvests, mine the wall. The
  place weakens day after day and eventually **offers its surrender** - which you accept, or
  not. And the men posted there are not defending your village: an assault taken meanwhile is
  felt all the way to the camp.

![The assault on the city of Lesbos](docs/expedition.jpg)

### ⚡ The Olympians, allies and judges - and it shows

- **Zeus** - lightning falls on the attackers; his law of hospitality (*xenia*) punishes whoever
  shuts his door on a suppliant.
- **Poseidon** - knits your rampart stones back together, including sections already down.
- **Athena** - aegis in battle; if she trusts you (standing ≥ 25), **she whispers the hidden
  outcome of dilemmas**.
- **Ares** - fury in combat, faster recruits; capricious and vindictive.

**Fervour** (−100 to +100) doesn't only change numbers: it changes the **staging**. Zeus's chosen
sees a purple bolt split the sky; Athena's, an aegis with a Gorgon's head; Ares's, a bloody aura
and crows. And an **offended** god produces a **pale, aborted** visual - the bolt doesn't even
reach the ground. The punishment is seen before it is counted.

Four levers, and they aren't equal. A **sacrifice** (50 measures of grain) buys standing.
Standing is **spent** in a tree of **twelve permanent graces**, taken in order and never taken
back. **Oracles** sell a true answer at rising prices - they never lie and never charge for
nothing. And the **hecatomb** commits an entire season: a hundred beasts, once per season, and
you choose which of the four rites - the king's truce, the bulls cast into the sea, the goddess's
peplos, the blood on the altar. The question isn't "do I sacrifice" but **what season do I decide
to have**.

A slighted god, meanwhile, sends calamities of his own, at a pace that tightens with the offence
- lightning and broken oaths, earthquake and a closed sea, skill withdrawn from the craftsmen,
panic breathed into the ranks. Always repairable in the same beat by a sacrifice.

![The pantheon](docs/pantheon.png)

### 🏺 Moral dilemmas with consequences

Forty-one dilemmas with **multiple outcomes**, drawn when they open: refugees begging for asylum
(sincere… or infiltrated raiders), Zeus disguised as a beggar, a wooden horse abandoned at your
gates (*"I fear the Greeks, even bearing gifts!"*), Hector's envoy demanding spears… Some
outcomes are **deferred**: traitors strike after dark. Athena's whisper reads the outcome
**already drawn**: it structurally cannot lie.

![A dilemma](docs/evenement.png)

### 💰 A living market, convoys, and a fleet

The port is no longer a vending machine. Commodity **prices** drift towards what the world
imposes - drought burns the fields and grain rises, winter closes the sea and makes everything
dearer, an assault taken has the whole coast calling for stone - **slowly and with no dice
rolls**: watching for a good price is a decision, and you can tell yourself "I'll sell at the
next reading" and be right.

Selling at the quay is safe and mediocre. Loading a **caravan** for a stronghold is the full
price plus distance, against time and a risk **computed on what that village thinks of you** -
risk and gain frozen at departure, because recomputing them on return would be unfair. Routes
close for three named reasons.

And the port **builds hulls**: the penteconter that fights, the freighter that carries. A galley
**escorts** a convoy and drops its risk; holds let you **force the strait** in winter and bring
back extra loot. The port's level caps the fleet, and the sea **takes** hulls on every return:
this is not a one-off purchase.

### 📜 Discoveries, wonders, scouts

**Twenty-three Bronze Age discoveries** with their prerequisites - the ploughshare, twisted rope,
the potter's wheel, Linear B, water supply - and **only one research at a time**: launching the
plough means giving up the forge bellows for three minutes. The effects are modest and permanent;
ten well-chosen discoveries say which city you meant to build.

And **six wonders**, of which **only one will be built per game**: it's the choice that defines a
reign, and it cannot be taken back.

**Espionage** is the paid, risky way to learn more without Odysseus or Cassandra: you send a
villager - one arm fewer while he's out - or you pay a tradesman. The report is true; if there's
nothing to see, you aren't charged.

### 🤝 A Troad that remembers

Each stronghold keeps its own **standing** (−100 to +100), and the region is small: what you do
to one, the other seven learn. A **gift** buys back a grudge. A **pact** can be bought from
someone who already likes you. A **marriage** costs an inhabitant forever but seals an alliance
nothing undoes, at double tribute. An ordinary alliance breaks if standing falls back - and a
hostile village swells the threat hanging over you.

### 🌾 The fever, and the lazaret

Plague isn't a dilemma but a **cycle**. It comes in through an identifiable door - a convoy back
from the Troad, the charnel left before the wall after an assault, a raid's loot, the crowding of
a village too populous for its houses - spreads according to conditions you can influence, kills
**named** inhabitants (so trades, so bloodlines), and ends.

Against it, the **lazaret**: beds you open at the temple, because the priests are the healers. A
bed saves a man **and** removes a carrier. A feverish man left standing gives only a third at his
post and infects his neighbours every day: the illness costs before it kills. Three medical
discoveries slow it down.

### 🏝️ Founding a colony

A second home overseas, which is **not** a second playable village - that would double the game.
It's managed by rare, heavy trade-offs: what it devotes itself to, what it ships, how you defend
it when it's threatened and you cannot be there.

Founding costs dearly and permanently: four to eight inhabitants who leave **for good with their
trades** - the panel names what the village loses -, a ship held for as long as the colony lives,
and soldiers left behind. Four coasts, four vocations, and a colony you neglect eventually stops
being yours.

### 🏅 Feats, prestige and the end of a reign

Fifty-four feats in five categories - "hold an assault on three fronts without losing a man",
"chosen of all four Olympians", "cross a winter without emptying the granary", "breach the walls
of a city held by another player". They feed a **prestige score** broken down line by line. When
you judge the reign complete, **abdicate**: the score freezes and the bards give you a title,
from "Tinpot king" to "Equal of the gods".

And the prestige of a completed reign converts into an **inheritance** for the next: walls
standing, a discovery acquired, a hero already known who comes at a word. Difficulty rises to
match, and **the Troad remembers** - a raider's reign starts again surrounded by enemies.

![Feats and prestige](docs/hauts-faits.png)

### 🎖️ Fifty-five missions as a through-line

Always an objective on screen, always a reward at the end: from the first day's provisions to the
Palladion itself. Each claim funds the next step: no dead time.

And they aren't a list sitting beside the game: **every mission has a button that opens the screen
where it's played**, the top bar carries the full thread act by act, and a claimed reward leaves a
line in the journal like a battle does. Three missions open at a time, **never beyond the current
act**.

| The tracker, always on screen              | The full thread, five acts                     |
| ------------------------------------------- | ---------------------------------------------- |
| ![Mission tracker](docs/missions.jpg) | ![The full through-line](docs/missions-fil.png) |

### 📈 The annals of the reign

A numeric reading every thirty seconds: granaries, garrison, threat, mood, favour, ramparts,
prestige. Four graphs drawn in SVG like the rest of the game, with each series' **slope per
minute** - that's what answers "is this going up?". The annals cross the acts, where the journal
starts over with each chapter.

### 🎭 The village's mood

Feasts, victories and full granaries **elate** the village (higher output). Famine, defeats and
cruel choices make it **sullen**. Below 25: **mutiny** - open the granaries, promise (and keep
your word!), or put it down in blood. At 0, your soldiers desert.

### 🎵 A fully synthesised soundtrack

Not one byte of downloaded audio: everything is made on the fly in **Web Audio**. In the village,
a shepherd's flute plays a **major pentatonic** (no semitones: it is musically impossible to sound
ominous) over a drone that never stops. **One note every two and a half seconds, no more**: what
makes music tiring is neither its mode nor its volume but its number of attacks, and this one has
twenty-four a minute where the previous version had a hundred and sixty. War horns rise on the
alert, the siege drum takes over when the column reaches the walls, and the bard's song salutes
victory.

### 🌙 Time goes on without you - and you drive the camera

A real-time day/night cycle. Tab closed, the village lives on: production, construction, growth…
and night assaults, resolved automatically. On your return, a report tells you everything.
**Sims**-style, the **×1 ×2 ×4 ×8** buttons (keys 1-4) speed everything up, with an automatic
return to ×1 during battles. And the map is yours to handle: **wheel** to zoom where the cursor
points, **drag** to pan, **double-click** to hand control back to the automatic camera.

The top bar reads in **two rows**: what the village *has*, then what is *happening* to it. Each
token opens a **numeric tooltip** on hover that says what it's for, what it's worth and what
moves it. And every menu closes three ways: its **cross**, the **Esc** key, or a click outside.

## 🎮 Game systems, in one table

| Area | What it holds |
| --- | --- |
| **Resources** | wood, stone, grain, bronze, divine favour, a **named** population |
| **Buildings** | **11** domains × 4 levels, SVG art specific to each level; the Agora governs the others' maximum level, 2 concurrent works |
| **Defence** | 4 rampart levels, up to 4 archer towers, **5 inner works**, **the Redoubt** that shoots back at the breach, per-section structure and independent breaches |
| **Army** | **7 units** (spearman, archer, hoplite, slinger, peltast, ram, chariot), 3 stances, 2 ways of shooting, assignable sections, troop morale |
| **Defence plan** | stance, shooting and wall section for each unit **and each hero**, set in peacetime, adopted by every battle |
| **Heroes** | **8**, passive + ability, levels 1→5, upkeep, a **lethal** story arc, visible on the map and in the front rank |
| **Enemy champions** | the same eight names turned against you, manoeuvre announced with its countdown |
| **Living village** | trades at birth, ages (2 years per day), households, births, trade inheritance, age pyramid |
| **Dynasty** | a named chief, **12 traits**, death of old age, an heir chosen among the bloodlines, an interregnum that costs |
| **Gods** | 4 Olympians, fervour across 7 tiers, **12 permanent graces** (three per Olympian), **5 paid oracles**, wrath graded over 4 tiers, **12 relics**, **4 hecatomb rites** |
| **Offence** | **8 strongholds** to raid, rescue **or besiege**, enemy works to bring down, stars, garrisons that reinforce |
| **Economy** | drifting prices with no dice, caravans with risk frozen at departure, **2 ship types**, escort, forced crossing |
| **Progress** | **23 discoveries** with prerequisites, one research at a time, **6 wonders** of which one per game |
| **Diplomacy** | per-village standing, gifts, pacts, irreversible marriages, tributes, betrayals |
| **Health** | **4 fever strains**, lazaret, 3 medical discoveries, named deaths |
| **Colonies** | 4 coasts, 4 vocations, 3 trials, colonists who leave for good |
| **Multiplayer** | asynchronous, **serverless**: defence card, raid report, verification by replay, honour and 5 ranks, revenge |
| **Content** | **41 dilemmas**, **55 missions** across 5 gated acts, **54 feats**, a campaign in 5 acts |
| **Modes** | sandbox, **"The Fall" campaign**, **endless siege**, **weekly challenge** on a shared seed, plus **New Game +** |
| **Time** | 4 seasons × 6 weathers, day/night cycle, ×1→×8 speeds, offline resolution up to 8 h |
| **Tests** | **1,525** Vitest tests and **7** end-to-end Playwright journeys |
| **Saves** | `localStorage`, 3 slots, text export/import - no server, no account |

## 🛠️ Stack

- [Vite](https://vitejs.dev) + [React 18](https://react.dev) + TypeScript (strict)
- [zustand](https://github.com/pmndrs/zustand) + immer for game state (4 Hz tick)
- 100% **code-drawn SVG** rendering - zero external assets, zero graphics dependency
- 100% **Web Audio synthesised** sound - zero samples
- No backend: playable as a static site, saves stay local

The art direction (light from the north-west, shadows cast to the south-east, no black outlines,
deterministic randomness) is documented in [`docs/STYLE-ART.md`](docs/STYLE-ART.md). The roadmap
and known debt live in [`docs/ROADMAP.md`](docs/ROADMAP.md). Both are written in French.

## 🚀 Development

```bash
npm install
npm run dev       # http://localhost:5173
npm run dev:test  # 🧪 test mode: unlimited resources, instant builds and recruits,
                  #    an "Attack" button to trigger an assault on demand
npm run build     # production into dist/ (shell, art and story in three chunks)
npm run preview   # test the build
npm test          # 1,525 Vitest tests on the game rules
```

The seven end-to-end journeys are in Playwright **Python** - the technology already present in
the repo rather than one more dependency:

```bash
npm run dev:test -- --port 5199 --strictPort   # in one terminal
python3 scripts/e2e.py                         # in another
```

### 📸 Regenerating the README screenshots

The images in this file are **reproducible**: each one sets a precise game state (season,
buildings, heroes, open panel…) before photographing the screen.

```bash
npm run dev -- --port 5199 --strictPort   # in one terminal
npm run captures                          # in another
```

The script looks for an **already installed** browser before downloading one: the machine's Chrome
or Edge first, then the Python Playwright chromium used by the e2e journeys. It fails if any
JavaScript error occurs while capturing: it doubles as the project's smoke test.

## 🗺️ What's left

Details live in [`docs/ROADMAP.md`](docs/ROADMAP.md). In short:

- **Accessibility** - nothing has been done, and the game is now rich enough for that to hurt:
  colour-blind palette, text size, `prefers-reduced-motion`, keyboard focus
- **Overall balance** - some twenty systems have piled up in a short time and their multipliers
  compound: this needs a test bench that plays a thousand minutes without a screen
- **Touch and mobile** - the map is already suited to it, the HUD and panels are not
- **English localisation** of the interface itself (the text structure is already centralised)

---

*A personal project - written with love for Greek mythology.* 🏺
