# Signal Lance: Round 19 status report — "Listen before you land"

**Date:** 2026-10-07
**Build:** `signal-lance/` TS project (~7,080 lines of src), `dist/signal-lance.html`, BUILD `r19-s7`
**Branch:** `main` (repo `FluKanuck/Signal-Lance`), commits 43d3a4c (s1), de00954 (s2), bd606ec (s3), 45082e8 (s4), d15d57c (s5), 263efe0 (s6), eaabe4f (wrap), plus 07a64d1, 0b9b441, 5fb3336 (fix list, debrief notes) and this report
**Live artifact:** https://claude.ai/artifact/NRNixsKxVrcMGNeYp6bB2o · testers: https://flukanuck.github.io/Signal-Lance/
**In-round fix list:** `claude/signal-lance-r19-revision-list.md` (2 items, both fixed)

## Purpose
Does choosing how long the ship listens (more intel vs a more awake, better-reinforced field) change your plan before turn 1, and does that plan hold up in the hunt? Slice row 4, **Pre-drop intel (ship)**, with the RWR (#74) rolled in. There was no fun test this round; the check was "does it read and connect?".

## Current status
- **Checkpoint reached: 3 of 3** (reveal ladder, cost ladder, RWR), plus a phone readability pass and 2 fix-list items.
- **Read-and-connect check: "Not sure"** (the scan changed my plan / it didn't / not sure).
- **Weakest moment (debrief 1): picking a listen level.** Jamie: "i think id like it a start stop timer, and even an area selection, you an try and focus your scan time on a single area rhather than the whole map, to get more info about a specific item area, or field of intel, so you spend time scanning, and that runs up into bands like what we have now for all the returns. you can even slect what types of scan to use, less intrusive scans use less 'time' more passive ones use less. like thermal vs radar, these return different fields of information and intel onto the map." Confirmed symptom: four fixed steps feel like a menu pick; he wants to spend scan time actively. **His call: no change this round; the design lead takes it.**
- **RWR, heard while moving: "Yes, the wedge showed me."**
- **Levels picked and why:** not reported per hunt. His screenshots show SHORT and LONG on the dial. The end-of-hunt tap answers ("I picked that listen level because…") are in his log if he sends it.
- **Scenario tap answers:** not reported (Painted on the move answered through the debrief question above).
- **Hunts played:** not counted; Jamie called the wrap after his second "played" (debrief 2 was not run).
- **Fun test:** not run (per the brief).
- **Biggest thing still missing: "The active scan"** (the start / stop, area, sensor-type scan above).
- **The runner's LONG drop, investigated at Jamie's request:** the ship being painted is the main cost (see below); Jamie's read: the scripted lance pays all of LONG's costs and gets none of its benefits.

## What was built
1. **Checkpoint 1, the reveal ladder (r19-s1):** a scan screen between the job pick and the drop, with a listen dial: SKIP / SHORT (roster with variants and counts, zone outlines) / MEDIUM (zone types, 3 drop zones: west edge plus north and south aprons) / LONG (blips for every unit that **emits**, with the CARD's best guess and how many variants fit; silent units give nothing). The field is placed before the scan, far from every drop zone; patrols drift up to 4 tiles before the drop; blips become stale SHIP contacts with the ship's notes. Zones are now scan knowledge (SKIP shows none). **Jamie's call: hunt 1 builds after its scan**, then the fits lock. Log lines carry `listen X drop N`; PLAY SEED replays them. Scan off = byte-identical R18 runner.
2. **Checkpoint 2, the cost ladder (r19-s2):** extra units (25 / 35 / 50% per step), the field wakes from MEDIUM (a 25 / 50% share holds a 5-tile fix on the drop zone; the pack is on for that hunt), LONG may paint the ship (50%: 2 alert patrols 6–10 tiles from the drop). The dial says the risk; the result screen and log say what was rolled. Runner `--listensweep`.
3. **Checkpoint 3, the RWR (r19-s3):** `rwr` fittable (MAST). A radar sweep that covers the suit gives a warning: bearing ±10°, close / medium / far band from signal strength, SEARCH or LOCK, best-guess ID. Scope rings round the selected suit. Heard standing = solid spoke; heard moving (**Jamie: heard on a tile you have since left**; radar only pulses on its own turn) = frozen spoke + re-aimed wedge over the guessed strip + a "heard here" tick and bearing line; stale once walked past. Matches the brief's worked case (centre −18°, wedge −34° … −5°).
4. **Readability pass (r19-s4, Jamie's ask, out of scope):** menus stop shrinking at 0.92 and scroll; UI floor 0.7 → 0.85; scan map gets the room. Body text at 844×390: hangar 10.8 → 12 px, scan after LONG 9.1 → 13 px.
5. **Fix list (r19-s5, s6):** the scan map no longer stretches on desktop; **every suit has a built-in RWR** (Jamie): a red "PAINTED · round N" ring, no bearing; the module adds the readout.
6. **Test bed:** Long listen (forced LONG, always painted), Quiet drop (same job, no scan), Painted on the move (RWR). **Tests 243 → 280.**

**Runner, listen sweep (60 contracts per level, the scripted lance lands on the drop zone nearest the objective):**

| Listen | Hunt wins | Contracts complete | Cost per hunt |
|---|---|---|---|
| SKIP | 54% | 15 | none |
| SHORT | 50% | 10 | +0.22 units |
| MEDIUM | 54% | 15 | +0.58 units, 1.4 alert |
| LONG | 41% | 6 | +1.1 units, 3.6 alert, painted 44% |

**Why LONG drops (ablation, same seeds):** LONG with all costs 42%, no paint 52%, no extras 43%, no alert 37% (noise), no costs 58% (= MEDIUM with no costs, so the blips cost nothing). Paired on 150 hunt seeds, painted vs not: wins 66% → 40%, mechs lost 0.55 → 1.19, lance hit in round 1–2 in 121 vs 57 hunts. The ambush lands only ~32% of the hits; the rest come from the pack it wakes. The scripted lance can't read the roster or blips, so the sweep shows LONG's costs fully and its benefits barely.

**Values at the end:** `SCAN_BLIP_UNC` 3, `SCAN_DRIFT` 4, `DROP_ZONES` 3; `SCAN_ALERT_SHARE` [0, 0, 0.25, 0.5], `SCAN_ALERT_UNC` 5, `SCAN_EXTRA_CHANCE` [0, 0.25, 0.35, 0.5], `SCAN_PAINT_CHANCE` 0.5, `SCAN_AMBUSH` 2, `SCAN_AMBUSH_DIST` [6, 10]; `RWR_BEARING_ERR` 10, `RWR_BANDS` 3–6 / 9–15 / 15–25, `RWR_REF_SIG` 16, `RWR_LIFE` 3, `RWR_BASELINE` on; `UI_MIN` 0.85, `UI_PANEL_MIN` 0.92. `--check`: only the inherited R13 sound flag and a 20-contract grid outlier (as R18).

## Changes (from the TWEAK LOG)
| # | Symptom | Change | Result |
|---|---|---|---|
| 1 | Build chat: where the hangar goes; what "heard moving" means | Hangar after hunt 1's scan, then lock; heard moving = heard on a tile since left | Decisions |
| 2 | "At iPhone scale this is very hard to read" | Panels scroll below 0.92; UI floor 0.85; scan layout | Shipped r19-s4; not rated |
| 3 | "ugly stretch on desktop on the sigint map" | Map height follows width, re-sized once scale settles | Fixed r19-s5 |
| 4 | "All mechs have a baseline RWR, that shows only they been hit with radar" | Built-in PAINTED ring; module keeps the readout | Fixed r19-s6; not rated |
| 5 | Debrief 1: picking a listen level feels like a menu pick | No change; active scan to the design lead (Jamie's call) | Decision |

## Parked (not built)
1. **#88 (Jamie):** pay out local sources for added info.
2. **The active scan (Jamie, debrief 1):** start / stop scan timer, focus on an area, choose the sensor (less intrusive = less time; thermal vs radar return different intel), returns running up into bands.
3. HUD on the smallest phones: the A/B parts line runs under the turn strip; in-hunt button sub-labels ~9.5 px at 85%.
4. Camera framing on north / south drops (the suit lands at the screen edge under the HUD).
5. The scripted lance can't use scan intel (roster, blips, painted risk), so the runner undervalues listening (folds into #42 / #83).
6. Only emplacements carry radar, so the RWR is silent against some fields; field radar fits are content.
7. Earlier: #84 scan finds opportunities, #85 mission clock, #86 notoriety, #87 company layer.

## Suggested next step
All three checkpoints read: the RWR wedge "showed me", and the costs bite (the painted ship is the big one). But the scan's core choice didn't land: the closing check was "not sure", and Jamie's weakest moment and biggest missing piece are the same thing: **an active scan** (spend time, aim it at an area or a kind of intel, pick the sensor) instead of a four-step dial. The design lead should decide whether to rework pre-drop intel along those lines now (it is the slice row just built) or move to the company layer as planned (#87, "ownership and progression") and return to the scan later. Either way, the runner can't judge listening until the scripted lance reads intel. If the scan is reworked, the cost ladder and RWR carry over as they are.
