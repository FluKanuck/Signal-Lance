# Signal Lance: Game Shape

**Updated:** 2026-10-05 (open threads session: city and travel, economy and factions, operator death settled)
**What this is:** a one-page map of the whole game. It is not a design bible. Each piece names its gate and its cheapest test. The roadmap (`claude/signal-lance-roadmap.md`) sets the order of the rounds.

## Pitch
An ex-military company of exosuit operators lives aboard a flying ship over a grim hive city. You earn your intel, build your suits around it, and drop the lance alone into the dark. Then you live with whatever comes back.

**Pillar (unchanged):** Prepare in depth, deploy under pressure, watch your plan succeed or fall apart, then learn why.

## Three loops
| Loop | What happens | Status |
|---|---|---|
| **Campaign** (the ship) | Travel, take contracts, outfit the ship, keep the company alive | Not built |
| **Contract** | 3 hunts, carry-over, job pick, payout and refit | Built (R11) |
| **Hunt** | The lance alone: sensors, emissions, the fight | Built (R1–R13) |

## Exosuits, not mechs
A lance of exosuits fits a city better than walkers do:
- **Fiction and feel:** operators in suits. The UI rename happens when a round next touches the UI.
- **Scale and space:** doorways, rooftops, alleys, rubble, close quarters. Infantry and vehicles become real threats.
- **The operator matters:** the person inside is the heart of the company.

## The ship
A mobile flying base. You build it up, and it's always moving. **It never appears on the board**: once the lance drops, it's alone. The ship earns its keep in three beats:
- **Between missions:** fuel and range decide which contracts you can reach (logistics).
- **Before the drop:** the SIGINT suite produces your INTEL. Without it, the readout is empty.
- **After the mission:** the repair bay, medbay and salvage hold decide how well you recover. The hold size caps how much salvage you bring home.

**Outfitting:** 3–4 module slots, each feeding one beat, with never room for all of them. That's how the ship gets tailored to a playstyle.
**Cheap test:** 3–4 slots, where what you fit changes how the next contract plays.

## The city and travel
**Setting (Jamie):** one city covering a vast part of the planet. It has many districts, and each is held by a faction.
- **Travel:** a flat node map. Every jump between districts costs fuel.
- **Danger:** each faction sets a baseline danger for the districts it holds; your notoriety with that faction raises it. The map marks danger.
- **Who hires you (both):** factions hire you against their rivals (better pay, but the target knows it was you). Brokers post deniable jobs (less pay, less notoriety).
- **What you can see:** basic info on any contract from any range (faction, job type, pay, danger). The ship's SIGINT range unlocks the detail.
- **What pushes you on:** upkeep and notoriety. Upkeep means easy jobs don't pay enough to keep flying. Notoriety is tracked **per faction**, so the district you keep farming turns on you.
- **High notoriety with a faction brings:** harder fields that start alert, hunter teams (elite suits sent after you), and closed airspace (flying through their districts costs extra fuel or a fight).

**Cheap test:** 6–8 districts, 3 factions, one standing meter each, and upkeep per jump. Does picking the next contract feel like weighing pay against who you'll anger?

## Economy and factions
**Two currencies (Jamie):**
| Currency | Question it answers | Comes from | Spent on |
|---|---|---|---|
| **Credits** | Can I afford it? | Contract pay, selling salvage | Upkeep and wages, parts, modules, ship upgrades, recruits |
| **Fuel** | Can I reach it? | Bought in districts; price set by the controlling faction (cheap with friends, pricey or refused where you're hated) | Every jump; detours around closed airspace |

**Parts are items, not money:** bought with credits, or looted as salvage. They feed repairs and refits.
**Salvage:** automatic, part of the payout after extraction (no lingering in the hunt). The ship's hold caps how much you can carry.

**Faction standing is two-way (one meter per faction):**
- **Hated:** notoriety effects (alert fields, hunter teams, closed airspace, pricey or refused fuel).
- **Liked:** goodwill. Friendly factions supply **bonus intel against their enemies**, on top of what your own SIGINT suite gathers. That links the campaign map to the SIGINT pillar: who you work for shapes what you know.

**Cheap test:** folds into the city map test. Add a fuel price per faction, a hold cap on salvage, and one intel bonus at high standing.

## SIGINT: signature matching
**Core mechanic (Cold Waters style):** read a contact's signature, compare it against a reference manual, and commit to an ID. It's a skill you learn.
- **What it is:** identity, from matching.
- **How far to trust it:** match confidence depends on how clean the signal is and how well you read it.
- **Where it is and what it's doing:** signatures over time (a patrol's drift, an emplacement's pulse rhythm).
- **Risk dial:** a longer listen gives a cleaner match, but the ship emits for longer, so the field may be awake when you land.
- **Used in two places:** pre-drop from the ship, and in-hunt on contacts. You learn it once.
- **Other intel sources:** friendly factions feed intel against their enemies (see Economy and factions).

**Cheap test:** give the 3 existing unit types distinct signatures, add a one-page reference card, and play it in-hunt.

## Emissions and the signature model
- **Now (R13):** two channels. Emissions build up and carry far; Sound lasts one turn and is short-range.
- **Later:** a taxonomy (EM / IR / acoustic, roadmap #19), each read by different sensors.

**Signature model (Jamie):** every item (module, frame, reactor, vehicle, infantry kit, ship part) carries three stats **per emission channel**:
| Stat | Meaning | Who it matters to |
|---|---|---|
| **Emit** | What it puts out by itself (a reactor's heat, a radar's EM, servo noise) | Passive sensors, which listen |
| **Visibility** (cross-section) | How strongly it shows up when something looks for it (a big frame reflects radar; a hot hull glows on thermal) | Active sensors, which ping |
| **Absorb** (shielding) | How much it masks the suit's total in that channel (thermal wrap, sound damping, RAM coating) | Both. It usually costs weight or power |

- A suit's signature in each channel = the sum of everything it carries, reduced by shielding. That adds up to 9+ numbers per item.
- **Players see the roll-up, not the spreadsheet:** one bar per channel per suit, with Emit and Visibility shown separately, and item detail on tap. The detail lives in the data, so the runner can balance it.
- **Ties together:** the active/passive sensor split (passive hears Emit; active pings Visibility), signature matching (each unit's per-channel profile *is* its signature), and the build budgets (shielding is weight; quiet costs power).

**Grow it in steps:** start with R13's two channels and Emit only. Add Visibility when active pings get a real cross-section, then Absorb with the suit-budget round, then the full taxonomy.

## Exosuit building
Three budgets, each traded against the others:
- **Frame:** weight cap and speed.
- **Reactor:** power for sensors, ECM and energy weapons.
- **Signature:** the price of everything you bolt on (Emit, Visibility and Absorb per channel), paid in the hunt.

**Example (Jamie's):** a fast scout wants powerful sensors, so it needs a bigger reactor. Between the reactor and the larger sensors, the frame can't carry a weapon.
The INTEL drives the build: match a turret nest on the scan, and you bring the heavy frame.
**Cheap test:** 3 frames, 2 reactors and about 6 modules, each with weight, power and signature numbers. Does building a suit force a sacrifice you think about? The full catalogue grows only after this passes.

## Variety target (long-term, Gate 3)
**Ambition (Jamie):** BattleTech / MegaMek-level variety across ships, exosuits, infantry and vehicles, with loadout depth like the Path of Exile passive tree.

**How it gets built:** variety comes from **construction rules plus data**, not a hand-made list. MegaMek splits the same way this game does: battles (MegaMek), unit building (MegaMekLab), mercenary company and logistics (MekHQ), with all unit data kept separately in normalized files.
- **Rules:** the frame, reactor and signature budgets, plus slot and hardpoint rules, apply to every unit type (suits, vehicles, infantry, the ship).
- **Data:** every module, frame and unit is a row of numbers, including its per-channel signature stats. New content means new rows, not new code.
- **Balance:** the headless runner sweeps builds to find dominant or useless ones, because a solo dev can't hand-balance hundreds.
- **Interactions:** PoE-style depth comes from modules that change each other, not from the raw count.
- **Phone UI:** a huge catalogue needs filtering, presets and comparison. That's a design problem in its own right.
- **Reference only:** MegaMek is GPL and BattleTech is someone else's IP. Study it, but never copy its data or code into Signal Lance.

**Now:** the suit-budget test round builds modules and frames as data from day one, signature block included, so the catalogue can grow without a rewrite.

## Operators
- **Skills:** one per operator to start (a steady aim, a quiet mover), changing how their suit plays.
- **Fragility:** injury, fatigue and death decide who you can send.
- Story comes from what happens, not from authored backstory.

**Death is a difficulty setting (Jamie), chosen at campaign start:**
| Setting | What happens on a lethal hit |
|---|---|
| **Ironman** | Straight permadeath |
| **Standard** | The operator drops to *critical*. Extract them in time and they live, benched and scarred; fail and they're gone. The medbay sets the bench time |
| **Story** | Never dies; always recovered with lasting injuries and fatigue |

**Tune around Standard.** The economy and recruit flow must survive Ironman losses without making Story trivial.

**Replacing operators (Jamie):** hire in districts (a few recruits each, quality varies), rescue survivors from some contracts or wrecks, and slowly train up ship crew.

**Cheap test:** one named operator per suit, one skill each, Standard rules (critical + extract), and injuries that bench them for a contract. One district offers 2 recruits.

## Gate order
1. **Core loop (the fight):** R13 emissions and pack → signature matching in the hunt → suit budget (frame, reactor, signature; built as data)
2. **Meta loop (a reason to care):** operators (skills, fragility, critical + extract, recruits) → ship slots with pre-drop scan and risk dial → city map: fuel, upkeep, factions, standing and faction intel
3. **Content:** variety target (catalogue across suits, vehicles, infantry and ship, plus a build sweep); full emission taxonomy; interiors, rooftops, verticality; block maps; mission types; more factions and districts; Ironman and Story settings
4. **Production:** Godot (reusing `sim/`); a presentation pass (Blade Runner vibe, lidar-dot fog of war); art, sound, saves

## Still open
- Nothing from the first mapping session. New questions get added here as they come up.
