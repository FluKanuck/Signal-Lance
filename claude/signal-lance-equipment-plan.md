# Signal Lance: Equipment Implementation Plan

**Updated:** 2026-10-05 (planning with Jamie, from the hangar toy on branch `build-toy`)
**What this is:** what `main` has to build so the equipment in `claude/signal-lance-catalogue.md` works in the hunt, following the rules in `claude/signal-lance-construction.md`. It's a **planning list, not a round brief**. Each item has a size (**S** = an afternoon, **M** = a round's main build, **L** = more than one round) and a gate, which follows the roadmap: R15 is likely the suit budget, the campaign stays unbuilt until Gate 1, and content waits for Gate 3.
**Read against:** `main` at `2fe9157` (R14 part 0). The hangar toy's `src/build/` (rows, rules, tests) is the starting point for the foundation.

---

## Where `main` is today
| Area | Today | Problem for a catalogue |
|---|---|---|
| Loadout | `{ armour, radar, passive, ecm, ammo, cells, mortar }`, numeric keys; `TUNE.SLOTS` 10 is the only budget (`state.ts:19`, `screens.ts:17-45`) | Every module is a name the sim checks with `if (load.x)`. No frame, weight, power or hardpoints |
| Module stats | One radar, one gun, one mortar, all global TUNE values (`RADAR_RANGE`, `HIT_BASE`, `MORTAR_*`) | Two radars can't differ |
| Enemy kit | `FIELD_TYPES` rows → `hasRadar`, `passive`, `hasEcm` (`state.ts:54-61`) | Different names from the player's `load.*`; one shape is needed for both sides |
| Signature | `sig()` fixed formula (`sensors.ts:13`); EMIT pool; Sound radius per event kind (`SOUND_RANGE`) | Nothing comes from equipment; only EM + SND exist |
| Parts | R12 SENSORS / WEAPON / LEGS / CORE with hard-coded effects; armour = more hits in the pool | Nothing is *mounted* on a part; no BACK; no rear arc; no armour per location |
| Energy | Pool 100 + cells × 50, flat regen 10 | Output − draw replaces the flat regen |
| Status | `radarOn`, `mask` booleans; ghost is one global object (`G.ghost`) | Toggled systems and per-unit decoys need general state |
| World | Binary tiles (building / street), QUIET/NOISE zones | No light, heat sources, industrial ground, smoke or height |

**Small things found on the way (for the R13/R14 agent, not this plan):** `cmdEcm` / `canGhost` don't check `load.ecm`, only the HUD hides the buttons (`turns.ts:359-366`); `DEFAULT_LOAD` is defined twice (`state.ts:19`, `screens.ts:35`); dead TUNE keys (`TEMPERS`, `VARIANTS`, `ENEMY_BLIND_PULSE`, `PULSE_EVERY`, and the `SIG_*` keys marked unused in R13).

---

## Part A: Foundation (turn equipment into data)
None of this is fun on its own, but every item in Parts B–D sits on it. **Do it once, behind today's behaviour:** step A1 should play exactly like R14 (the runner proves parity, as R6 did for the TS port).

| # | Build | Size | Notes |
|---|---|---|---|
| A1 | **Item table in the sim.** Move `src/build/data.ts` rows into `src/sim/items.ts`; today's 7 modules become rows (Lamp, EM array, mask, ghost, autocannon, light mortar, steel plate, battery) | M | Parity test: the default fit plays like `DEFAULT_LOAD` (runner `--check`, same outcomes on fixed seeds) |
| A2 | **One equipment shape for both sides:** `unit.fit = { frame, chassis, mounts by location, plate, skin }`, and helpers `has(unit, tag)`, `itemsAt(unit, loc)`, `active(unit, id)` | M | Replaces `load.*`, `hasRadar`, `passive`, `hasEcm`. `FIELD_TYPES` rows get a `fit` (turret = a frame with no LEGS) |
| A3 | **Stats from the row, not TUNE.** Radar range/cone/cost, gun to-hit/range/sound, mortar shells/scatter read from the item; TUNE keeps only global rules | M | One function per family: `radarStats(item)`, `weaponStats(item)` |
| A4 | **Locations are parts.** MAST = SENSORS, ARMS = WEAPON, CORE, LEGS, plus a new **BACK** part. Losing a part takes its mounted items offline (replaces the hard-coded `if`s in `combat.ts` / `turns.ts`) | M | R12 already does it for SENSORS; generalise it |
| A5 | **Rear arc.** A shot from outside the target's facing arc rolls BACK in place of ARMS | S | Facing exists (`fx, fy`); needs an arc test in `rollPart` |
| A6 | **Power:** net regen = reactor output − idle draw; pool = base + batteries; can't launch below 0. Use costs stay per item | S | Replaces `ENERGY_REGEN`, `ENERGY_CELL` |
| A7 | **Weight:** load vs rated/max; the overload band adds move AP and servo Sound (`overloadPenalty`, placeholder shape in the toy) | S | Feeds `planMove` and Sound |
| A8 | **Signature from items.** Per channel: always-on emit, per-use emit (on the activation), visibility; skins absorb their location's share. Starts with **EM** (today's EMIT) and **SND** (today's Sound). `sig()` becomes the sum | L | The core change. Sound per activation comes from the item that acted (gun SND 6, mortar 14, legs by mode), not `SOUND_RANGE[kind]` |
| A9 | **Tags and mods** (one per location, matching tags) | S | Rules already in `src/build/rules.ts` |
| A10 | **Hangar = loadout screen.** The toy replaces `MODS`; the fit locks per contract (as `C.loads` does) | M | Phone layout already works |
| A11 | **Runner: build sweeps.** `--fit <code>` and a sweep over templates; report per channel ("first heard at N tiles by SND") | M | Spots dominant and dead builds, which the catalogue needs before it grows |
| A12 | **Debrief per channel:** what found you, at what range, on which channel | S | Construction doc: "the hunt teaches, the debrief explains" |

---

## Part B: The suit-budget cheap test (Gate 1, likely R15)
The construction doc's cheap test: **Wisp, Warden, Bulwark · Std reactor, Cold-burn · Lamp, EM array, mask, autocannon, mortar, steel plate · cold processor**, plus THERMAL, which the agreed rollout pairs with this round.
**Needs:** A1–A10 (A11–A12 strongly wanted), then:

| # | Build | Size | Notes |
|---|---|---|---|
| B1 | **THERMAL (IR) channel.** Heat sources: reactor (always), firing, sprinting. Heat **persists and cools** over turns (unlike Sound). Visibility = frame size | M | First new channel; the "hot core vs cold-burn" choice only means something if IR is read |
| B2 | **Something that reads IR.** At minimum the field reads IR like eyes (LoS, through dark/smoke later); thermal optics as an item | S | Without a reader, IR is just a number |
| B3 | Hangar copy for the 3 frames and 11 rows; INTEL shows what the field listens on (so the build answers the briefing) | S | The test question: does building against the INTEL force a sacrifice? |
| B4 | Runner sweep: does any of the 3 frames dominate? Does the cold-burn ever win? | S | Uses A11 |

---

## Part C: Mechanics by family (Gate 1 depth → Gate 3 content)
Ordered roughly by how much new mechanic each family needs. "Rows only" means that after Part A it's data.

### C1. Channels still to come (agreed order: MAGNETIC → VISUAL → ELECTRIC)
| Build | Size | Needs |
|---|---|---|
| **MAG:** passive mass Visibility (frame + steel plate), magnetometer through walls, short range; coil/rail charging adds emit; **industrial terrain blinds it** | M | A tile or zone type: industrial |
| **VIS:** eyes range scales with target Visibility; muzzle flash, lamps, plumes add emit; **light level** (dark districts, flares, searchlight) | M–L | A light model on the map |
| **EF:** field sensor, very short, through walls; scales with power in use; drops when powered down | S | A "powered down" state (see C5) |
| **Counter ladder:** sensor grade vs jammer grade (blind / half range / burn-through) | M | Every sensor and jammer row has a grade |

### C2. Sensors (mostly rows after A3)
| Build | Size |
|---|---|
| Radar variants (Lamp, Needle, Whisper LPI: "arrays need grade 2+") | Rows + the grade check |
| Passive arrays per channel (acoustic, thermal, field, magnetometer, gradiometer) | One `observe` path per channel |
| **Direction-finder type guess.** Ties straight into R14's signature card | S, after R14 |
| RWR, laser-warning receiver: warn plus a bearing when painted | S |
| Lidar: active VIS fix, exact; seen by laser-warning receivers | S |
| Fire-control radar lock: to-hit bonus while held; the target's RWR screams | S |
| Sensor fusion core: two channels on one contact merge into a tighter fix | M |
| Datalink: shared contacts (the lance already shares `G.pc`, so this becomes a cost and a jammable link) | S |

### C3. EW and countermeasures
| Build | Size | Notes |
|---|---|---|
| Ghost per unit, not a global | S | Cleanup needed before more decoys |
| Barrage jammer (bubble), spot jammer (one target, one turn) | M | Uses the grade ladder |
| **Comms jammer:** units inside can't call the R13 alarm | S | Small hook in `pack.ts` |
| Spoofer: your EM reads as another type | S, after R14 | Signature matching |
| ECCM, burn-through amp | S | Grade +1 |
| **Map clouds:** smoke (blocks VIS + lidar), multispectral smoke, chaff (radar fixes fuzzy) | M | New map object: a cloud with a lifetime |
| Acoustic decoy (moving fake sound contact), heat decoy, flares (IR seekers divert) | M | Shares the ghost code |
| Dazzler (blinds eyes for a turn), degausser (MAG −60% while on) | S |

### C4. Weapons and damage
| Build | Size | Notes |
|---|---|---|
| **Several weapons per suit:** choose which one fires (HUD) | M | Today there's one gun button |
| **Damage types** KIN / EXP / ENG / FIR / SHK; plates resist by type | M | |
| SHK knocks modules offline instead of dealing hits | S | Uses the A4 offline state |
| FIR sets the target's IR emit +3 for 2 turns (marks it for thermal) | S | Needs B1 |
| Energy weapons cost EN and make heat; coil/rail make MAG and EF | Rows | Needs B1, C1 |
| Lobbed family (grenade, heavy mortar, auto-mortar) generalises today's mortar | S | |
| **Guided missiles:** seeker type sets what can be locked (IR / radar-homing / home-on-jam); wire-guided ATGM must stay still and in LoS | L | |
| Melee (adjacent), placed charges and mines (timer, remote, triggers) | M | Mines are map objects with a trigger channel |
| Ammo types (AP, HE, subsonic, tracer, tag dart, EMP, incendiary, caseless) | M | An ammo slot per weapon |

### C5. Armour, stealth, mobility, utility
| Build | Size | Notes |
|---|---|---|
| **Plate per location** (hits on that part, not the pool) + special plates (ceramic shatters on EXP, reactive spends a tile, spall liner, bolt-on shed for 1 AP) | M | Changes R12's `splitHits` |
| **Skins** with wear (Worn = half Absorb) | S here; condition is Gate 2 | Absorb by location already in A8 |
| **Toggled systems:** a general "switched on" state with draw and heat while on (stealth, myomer, degausser, thermal hold); powered-down state | M | Generalises `mask` / `radarOn` |
| **Stealth costs your EW:** jammers and datalinks offline, sensors −1 grade while on | S | Rule already in the toy |
| Movement-scaled absorb (adaptive camo, still-skin best still) | S | Open question 2 in the toy doc |
| Mobility rows: sprint EN −50%, creep +1 tile/AP, stabilisers halve the moved penalty, myomer +1 AP (fail roll), magnetic boots | S each | |
| **Jump pack, grapple, leaper** | L | Needs verticality (Gate 3) |
| Field repair kit (3 AP, restore 1 hit), uplink kit (−1 AP), laser designator (mortar/seekers ignore uncertainty) | S each | |

### C6. Drones (placeholder §9b, decision first)
| Decision | Then |
|---|---|
| **Effects** (one turn of eyes, a timed ghost, static pods): cheap, reuses observe and ghost code | S–M |
| **Units** (they move, can be shot and traced): a new unit kind with its own fit, a control link that can be jammed and traced | L |
The toy has both the Shepherd frame and the hive module. Pods and decoys work as effects either way; spotter and strike drones are where the choice bites.

### C7. The enemy side
| Build | Size | Notes |
|---|---|---|
| `FIELD_TYPES` become fits (rows) | S, after A2 | |
| Bots use the new kit: pulse the right radar, mask when painted, read IR and MAG | M per family | Grows with each family |
| **Enemy suits (the rare elite) from templates:** Jamie's role templates become enemy suits too | M | The hangar's templates double as enemy archetypes |
| The INTEL describes the field's sensors per channel, so the player can build against it | S | This is the suit-budget test's question |

---

## Part D: Campaign hooks (Gate 2, stays unbuilt until Gate 1 passes)
| Build | Notes |
|---|---|
| **Inventory:** items owned by the company, fitted to suits | Today the loadout is free picks |
| **Condition:** Sound / Worn / Failing. It hits reliability (fail rolls) and signature (+SND), never power; restore with parts + time | |
| Markets by maker (standing-gated), broker at a markup, salvage arriving Worn, contract-reward prototypes | |
| Frames as items with history (kills, scars, operator) | |
| **The ship on the same rules:** sections, overload = fuel per jump, ship signature, intercept roll | Rows + a sections view in the hangar |

## Part E: World features the catalogue assumes (mostly Gate 3)
| Feature | Unlocks |
|---|---|
| Light / darkness | VIS, low-light EO, searchlight, flares, tracer |
| Industrial ground | MAG blind spots |
| Fires and vents | Thermal washout |
| Smoke and clouds (map objects with a lifetime) | Smoke, chaff, multispectral |
| Walls and doors that open | Breaching kit, claw, demo, laser mic |
| Height and rooftops | Jump pack, grapple, EO mast, tether drone, extraction winch |

---

## Suggested order
1. **A1–A3 with a parity check:** same game, data-driven. No playtest needed; the runner proves it.
2. **A4–A10 + B (suit-budget round, R15):** the first round where building matters, with THERMAL.
3. **A11–A12** alongside or right after: the runner and debrief explain builds.
4. **C1 channels** one at a time, each earning its place (MAG next), with C2/C3 items that use them.
5. C4–C5 as weapons and armour start to feel thin; C6 once the drone decision is made; C7 grows with each family.
6. D and E only after Gate 1, as the roadmap says.

## Open questions for the design lead
1. Is A1–A3 (parity refactor, no new fun) acceptable as a round on its own, or should it ride inside R15?
2. Does R15 take the whole of A, or the cheap-test subset (no mods, no BACK) to keep it small?
3. Rear arc (A5) changes incoming fire for everyone. Test it with the suit budget, or on its own?
4. Drones: effects or units (C6)?
5. Should the hangar's role templates become the first enemy elite suits (C7)?
