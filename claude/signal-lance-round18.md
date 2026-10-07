# Signal Lance: Round 18 status report — "Fit for the job"

**Date:** 2026-10-06
**Build:** `signal-lance/` TS project (~6,750 lines of src), `dist/signal-lance.html`, BUILD `r18-s13`
**Branch:** `main` (repo `FluKanuck/Signal-Lance`), commits 2e913c6 (step 0 merge), 1ca1929 (s1), 4b5fb0f (s2), 2660e96 (s3), bd77aeb (s4), 18ef36e (s5), 7b015b3 (s6), 5764658 (s7), 15ee1cd (s8), 93f6a3c + 64d5d90 (s9), e850c06 (s10), 282d2af (s11), b81b729 (s12), 689c439 (wrap), and this report
**Live artifact:** https://claude.ai/artifact/NRNixsKxVrcMGNeYp6bB2o · testers: https://flukanuck.github.io/Signal-Lance/ · visual lab: https://flukanuck.github.io/Signal-Lance/lab/
**In-round fix list:** `claude/signal-lance-r18-revision-list.md` (17 items, all fixed, cropped screenshots in `claude/fixlist/`)

## Purpose
When you build each ExoS against the job and the INTEL, does it force a sacrifice you think about, and does that sacrifice show up in the hunt? This was slice row 3, **Suit building**: the hangar toy brought into the hunt, the equipment plan's Part A + B. There was no fun test this round; the check was "does it read and connect?".

## Current status
- **Read and connect: "My build showed up"** (in the hunt).
- **Checkpoint reached: 3 of 3** (parity, suit budget, THERMAL), plus 17 fix-list items from Jamie's iPad play.
- **Debrief change** (weight costs Energy per tile, creep included): **"Helped"**.
- **Heavy load scenario:** "just not a telling test of the system": being heard by the turret had no consequence before he was past. The scenario stays; the lesson went into the weight rule (energy) instead.
- **Other scenario tap answers:** not reported (play went to contracts and the PLAY SEED replay of one Bounty hunt, seed 835900613).
- **An "oh, that's how it works" moment** (on why the sentry never showed ESM): "never made that round trip in my head, that what signals are putting off nothing is just as important as what it is putting off".
- **Fun test:** not run (per the brief: once on the whole slice).
- **Biggest thing still missing:** **"A sense of ownership and progression."** He asked what's next on the slice: Pre-drop intel (ship) is next in the build order; operators, after-the-drop and the campaign map are where ownership and progression live.

## What was built
1. **Step 0:** `build-toy` merged; its rows and rules moved into `src/sim/items.ts` and `src/sim/fit.ts` (the toy re-exports them; `npm run build:toy` unchanged).
2. **Checkpoint 1, parity (r18-s1):** one fit shape for both sides (`unit.fit`, `has()` / `active()` / `itemsAt()`), stats from the row (radar, gun, mortar). **Parity: runner output byte-identical to R17** on every mode tried (60 contracts 49%, games, `--loud`, `--pack`, a scenario).
3. **Checkpoint 2, suit budget (r18-s2):**
   - Locations are parts (new BACK); a lost part takes its modules offline. Rear arc: a shot from behind rolls BACK (28% of gun hits in the runner).
   - Power = reactor output − idle draw; batteries add pool. Weight: rated / max, overload adds Sound (+1 a point), Energy per tile (+0.5 a point, from the debrief) and +1 AP past half the band.
   - EM signature from the fit (frame + always-on items); Cold processor mod. The field keeps its R17 signature (moving it broke the R14 ID scenarios; its fits are for later).
   - **The hangar** replaces the slot picker, on **Jamie's ExoS wireframe** (tap a body part, then a hardpoint). Cheap-test set only; Scout (Wisp), Line (Warden), Brawler (Bulwark). Rules: one reactor, one of each module (batteries excepted).
   - Runner `--fit` and `--sweep`; the result screen says what found each suit first, on which channel, at what range; INTEL says what the field listens on.
4. **Checkpoint 3, THERMAL (r18-s3):** heat = reactor + frame size + firing / sprinting heat that cools 2 a turn; turrets carry thermal sights; Thermal optics fittable; `THERMAL_ENABLED` + splash toggle. **Jamie's ask: a sniper turret** (Long gun: range 20, 1% a tile falloff, firm lock only).
5. **Fix list from play (r18-s4 … s12):**
   - Weight costs Energy (debrief); QUIT back to the hangar; iPad touch fixes (pick sheet, NEW BUILD button).
   - The game scales to its window (iPad split screen / full screen), top buffer, NEW BUILD reload prompt for cached pages.
   - Contacts: labels stack; **sense tags** (EO, RDR, ESM, IR, ACO, MZL, LINK) stacked, gold = holding the fix, with the suit letter (EO A, ESM A+B); a struck IR tag when thermal looks and sees no heat.
   - Fixes: ESM sits on the best fit of all bearings, trust from listening spots and crossing angle; NOISE only widens the circle; a vaguer fix never drags a good track; known statics stay put.
   - Cover pieces join one kind only (building / set piece / debris); a shield marks cover (no label); a move stops only for a contact new to you; blind lob scatter scales with range.
   - **PLAY SEED** replays any hunt from a seed or a log line; every log line carries its seed.
6. **Tests: 199 → 243.** Scenarios Heavy load, Back door, Warm core.

**Runner, final build (r18-s13, 60 contracts, the R17 scripted lance):**

| | Hunts | Win |
|---|---|---|
| All | 147 | 54% (R17 49%) |
| Escort / Uplink / Retrieve / Bounty | 36 / 43 / 34 / 34 | 61% / 65% / 50% / 35% |

**Sweep (40 contracts each, both suits the same fit):**

| Fit | Cold-burn | Hot core |
|---|---|---|
| Scout (Wisp) | 21% | 21% |
| Line (Warden) | 39% | 40% |
| Brawler (Bulwark) | 75% | 75% |

- By reactor: Cold-burn 51%, Hot core 51%. **The reactor still never decides a hunt for the scripted lance.** Hot cores are found first on IR more often (up to 7 of 118 hunts, at 12–16 tiles), but only static turrets read heat, and they can't chase.
- **Heavy kit dominates** (Bulwark 75%). A Warden carrying the same plates and mortar won ~81% (s2): plates and the mortar carry it, not the frame.
- What finds the lance first: muzzle flash 32%, eyes 32%, sound 31% (at ~5 tiles), radar 5%.
- `--check`: only the inherited R13 sound-share flag.

**Values at the end:** `OVERLOAD_SND_PER_PT` 1, `OVERLOAD_EN_PER_TILE` 0.5, `OVERLOAD_AP_FRAC` 0.5, `SIG_EM_PER_PT` 0.5; `IR_FIRE` 3, `IR_SPRINT` 2, `IR_COOL_PER_TURN` 2, `IR_TILES_PER_PT` 2.5, `IR_RANGE` 20, `IR_UNC` 1; `TRI_TRUST_N` 4, `TRI_TRUST_ANG` 60; `MORTAR_BLIND_UNC_PER_TILE` 0.25 (min 1.5, max 6); frame base hits 3 each.

**Fits Jamie used:** Brawler (A) + Scout (B); a plated Warden with Thermal optics, Lamp, Hot core, battery and mortar; a Wisp with EM array or Lamp, Thermal optics, mask, Hot core, battery; a full-plate Bulwark (Heavy load).

## Changes (from the TWEAK LOG)
| # | Symptom | Change | Result |
|---|---|---|---|
| 1 | "for the autocannon stats, use what we have now" | Item rows keep today's hunt values (balancing system later) | Decision |
| 2 | "didn't really notice the weight… It should carry not only sound, but also… more energy cost to move, even creep" | `OVERLOAD_EN_PER_TILE` 0 → 0.5 | **Helped** |
| 3 | "Add a sniper turret variant that can hit further" | sniper variant (Long gun, range 20, falloff 1) | Built; not rated |
| 4–20 | Fix list items 1–17 (UI, iPad, tracks, cover, interrupt, replay, tags) | See `signal-lance-r18-revision-list.md` | All fixed, tested by Jamie in play as they shipped |

## Parked (not built)
1. **#73 (Jamie):** a trigram: one bar per channel showing your suit's emission and its ability to sense that channel.
2. **A cold (thermally shielded) variant**, so "no heat" can narrow the CARD (fix item 17 shows the reading; the variant is content).
3. **Equipment balancing system** for all item stats (Jamie: "down the road").
4. **Heavy kit dominance** (plates + mortar): the energy cost is the first lever; plate weight or mortar access are others.
5. **Reactor choice that matters:** patrols (or one variant) reading IR, or thermal contacts that alarm the pack.
6. **Field fits:** the field still uses the R17 standing signature and flat regen.
7. Hidden rows: skins, other frames, alloy / composite; LEGS hardpoints are empty in the cheap set; one gun per suit.
8. Frame size → move sound (a Bulwark walks as quietly as a Wisp).
9. Heavy load scenario: rework so being heard costs something (a hunting patrol, a longer exposure).
10. The scripted lance never fits for the job, draws paths, or uses thermal, so the runner undervalues builds.
11. Earlier parks still open: look-menu polish, `FREE_TURNS` / `FACE_WAYPOINTS_MAX`, the R13 sound-share flag.

## Suggested next step
Suit building reads and connects ("my build showed up"), and the in-round fix list turned a lot of iPad play into clearer tracks and cover. Two balance threads are open for a later tuning pass, not a new round: heavy kit dominates, and the reactor choice doesn't bite yet. Jamie's biggest missing piece is now **"a sense of ownership and progression"**. The build order puts **Pre-drop intel (ship)** next. Operators, after-the-drop and the campaign map are where ownership lives, so the design lead's scoping chat should decide whether to pull one of those forward or keep the order. Jamie's split-screen iPad + fix-list + PLAY SEED routine worked well; keep it. **Jamie, after the wrap: "For the next session I think we should roll the RWR receiver in"** (parked #74): the catalogue's radar warning receiver (warns when painted, with a bearing) as an S-hardpoint item in the hangar.
