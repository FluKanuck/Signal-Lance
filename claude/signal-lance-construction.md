# Signal Lance: Construction and Progression

**Updated:** 2026-10-05 (construction and catalogue deep dive with Jamie, during R13 build)
**What this is:** the rulebook every buildable thing obeys (exosuits, the ship, later vehicles), and how gear and the ship progress over a campaign. It's a map: every number below is a **placeholder** set relative to today's TUNE, there to show shape rather than balance. The full catalogue is Gate 3 content; only the cheap test at the bottom is a Gate 1 candidate. `claude/signal-lance-game-shape.md` points here.

## The rulebook (decided)
| Layer | Rule | Why |
|---|---|---|
| **Space** | Modules mount on **locations, which are the R12 hit parts**. Losing a part loses everything mounted on it | One placement decision has three consequences: space, damage, synergy |
| **Hardpoints** | Each location has **typed** hardpoints set by the frame, plus 1–2 **OPEN** ones that take anything | Frames keep a role; the open slots carry the build's personality |
| **Weight** | Frame has a **rated load** and a **hard max**. Over rated (the overload band): extra move AP and servo Sound | "Can I squeeze the gun on?" becomes a sacrifice you weigh, not a wall |
| **Power** | Reactor **output** − every module's idle **draw** = **net regen** per turn (can't fit below 0). Batteries set the **pool**. Modules also have a **use** cost | One rule gives a hangar budget *and* the in-hunt tempo; extends today's Energy |
| **Signature** | **Six channels: VISUAL, ACOUSTIC, THERMAL, EM, ELECTRIC, MAGNETIC** (catalogue §1). Every item has Emit / Visibility / Absorb per channel; the suit's total is the sum, reduced by Absorb. Sensors and jammers have grades 1–3 (the counter ladder). Hangar shows **raw bars only** | The hunt teaches. The *debrief* explains ("first heard at 6 tiles: SOUND, sprinting") |
| **Interactions** | Modules carry **tags**. **Mods** change matching modules **in the same location** (PoE support gems in linked sockets) | Depth from combinations, not raw count. A mast hit can break a whole combo |
| **Same rules for the ship** | Sections instead of body parts; weight overload costs **fuel per jump**; ship signature = listen risk and visibility over hostile districts | One rulebook, one codebase, one thing for the runner to sweep |

### Hardpoint types
| Code | Type | Takes |
|---|---|---|
| **S** | Sensor | Radar, passive arrays, optics, ECM |
| **W** | Weapon | Direct-fire weapons |
| **I** | Internal | Reactor, batteries, processors, ammo |
| **U** | Utility | Mortar, launchers, drones, kits, ammo |
| **M** | Mobility | Servos, dampers, jump packs |
| **O** | Open | Anything, including mods |
| **H** | Hangar (ship only) | One suit bay each |

Mods take a hardpoint of the type they modify, or an O.

### Suit locations (built on the R12 parts)
| Location | R12 part today | Usual hardpoints | Lose it and… |
|---|---|---|---|
| **MAST** | SENSORS | S | Everything on the mast goes: radar, arrays, ECM. Eyes × `PART_SENSORS_EYES_MULT` as now |
| **ARMS** | WEAPON | W | Weapons are gone (R12 "disarmed") |
| **CORE** | CORE | I | The suit is destroyed (as now) |
| **BACK** | new, see open questions | U | Launchers and kits are gone |
| **LEGS** | LEGS | M | Mobility modules are gone, so the suit is slow and loud |

**Armour is two layers per location:** a **plate** (protection: hits, resists damage types) and a **skin** (signature: absorbs one or more channels). Heavy plate on the arms and a RAM skin on the mast is a real build. Skins wear fast, so they are a logistics sink.

## The item row (every module, frame, reactor and hull)
```
id, name, family, maker (faction accent | broker), hardpoint type, hardpoints used (1, sometimes 2),
weight, draw, use { AP, EN },
tags [SENSOR, EM, ACOUSTIC, KINETIC, ENERGY, MOBILITY, ARMOUR, MOD ...],
sig { EMIT: {emit, vis, abs}, SOUND: {emit, vis, abs}, IR: {...later} },
effect { family-specific fields },
condition { WORN: {...}, FAILING: {...} },
price, parts to restore
```
New content means new rows, never new code (game-shape "variety target").

## Catalogue
The full catalogue (frames, power and heat, sensors per channel, EW, stealth systems, weapons and ammo, mobility, utility, plates and skins, mods, ship hulls and modules, makers) lives in `claude/signal-lance-catalogue.md`.

## Progression (decided)
- **Wide, with sidegrades.** You unlock *answers to more questions*, not bigger numbers. Every family has variants that are each best at one thing (the radar family above). Difficulty rises through factions, notoriety and hunter teams, not enemy stat inflation.
- **Sources:** faction markets (stock gated by standing, with the faction's accent) · broker market (generic, anywhere, at a markup) · salvage from what you kill (arrives Worn, capped by the hold; want their dampers? hunt their units) · contract rewards (prototypes and exclusives instead of credits). **No reverse-engineering.**
- **Items with condition:** **Sound / Worn / Failing**. Condition hits reliability and signature (a worn servo rattles: +SOUND; a fail roll on sprint), **never raw power**, so sidegrades stay honest. Restore with parts plus time; the repair bay speeds it up. "The radar failed because I didn't fix it" is a lesson the debrief can name.
- **Suits are frame items.** A named suit is one frame with history: kills, scars, its operator.
- **The ship:** one ship for the whole campaign, **refitted section by section** (credits plus dock time in a friendly district), with an occasional **trade up to a bigger hull class**, moving the modules across.

## Size targets
| Stage | Suit | Ship |
|---|---|---|
| Cheap test (Gate 1) | 3 frames, 2 reactors, ~6 modules, 1 mod | — |
| v1 catalogue (Gate 3) | ~6 frames, 4 reactors, ~30 modules, ~6 mods | 3 hulls, ~15 modules |
| Variety target | Hundreds of rows, swept by the runner for dominant and dead builds | Same |

## Cheap test, sharpened (suit budget, Gate 1 core loop)
Replaces the game-shape version. **Wisp, Warden and Bulwark** frames with location hardpoints (one O each); **Std reactor and Cold-burn**; radar (Lamp), EM array, mask, autocannon, mortar, plate, plus **one mod** (cold processor). Overload band on; output − draw sets regen; raw signature bars; losing a part loses its modules (R12 already does this for SENSORS). Built as data rows from day one.
**Question:** does building a suit against the INTEL force a sacrifice you think about, and does it show up in the hunt?

## Open questions
1. **BACK:** a new hit part, or sheltered under CORE (protected, but only U)? Lean: sheltered under CORE. Safe but narrow is a nice trade.
2. **Mod stacking:** one mod per location, or the strongest same-tag effect only?
3. **Two-hardpoint modules:** only a few (AT launcher, long-baseline array)?
4. **Frame acquisition:** faction-made only, or also from the broker?
5. **Closed airspace:** abstract (fuel or a roll) or an actual fight?
6. **Channel rollout (decided, Jamie agreed):** six channels for the catalogue. In the sim, one channel at a time, each earning its place in play before the next: R13 has EMIT + SOUND; add THERMAL with the suit-budget round (reactor heat), then MAGNETIC (frame mass), then VISUAL Visibility, then ELECTRIC.
7. **Faction accents:** the names and feels above are a proposal.
