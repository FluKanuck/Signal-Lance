# Signal Lance: Round 20 status report — "Eyes from the ship"

**Date:** 2026-10-07
**Build:** `signal-lance/` TS project (~8,020 lines of src), `dist/signal-lance.html`, BUILD `r20-s5`
**Branch:** `main` (repo `FluKanuck/Signal-Lance`), commits b959072 (s1), 736c27d (s2), 11ffe77 (s3), 240fa5b (s4), 6c900d0 (wrap), plus 2a3137d, ebd540e, 0312c9b, c84852f (fix list), 9f1e6da (debrief notes) and this report
**Live artifact:** https://claude.ai/artifact/NRNixsKxVrcMGNeYp6bB2o · testers: https://flukanuck.github.io/Signal-Lance/
**In-round fix list:** `claude/signal-lance-r20-revision-list.md` (5 items, all fixed)

## Purpose
Does spending scan time actively (picking a sensor, aiming, deciding when to stop) feel like preparing a plan rather than picking from a menu, and does that plan change with the job? Slice row 4, **Pre-drop intel (ship)**, second pass after R19's dial read "not sure". No fun test this round; the check was "does it read and connect?".

## Current status
- **Checkpoint reached: 3 of 3**, plus 5 fix-list items from Jamie (two of them beyond the brief, by his call) and one debrief change.
- **Read-and-connect check: "Yes"** (the scan changed my plan). R19 was "Not sure".
- **Risk meter: "A real trade-off"** (he stopped or switched sensors because of it).
- **Weakest moments:** debrief 1, the deadline wasn't visible when picking a job ("scan time felt limited, need it to be more obvious when picking a job about time available for scanning" → "Missed it on the job card"); fixed and rated **"helped"**. Debriefs 2 and 3: **"It felt fine"**.
- **Job shapes the scan (focus 2): "A little"**. Jamie didn't report which sensors and orders he used per job. The [SCAN] lines in his log will show them if he sends it.
- **Hunts played:** about 10 on r20-s2 to s4, some of the four job types (not all).
- **Scenario tap answers:** not reported (Where first, Loud and fast).
- **Fun test:** not run (per the brief).
- **Biggest thing still missing:** "the company layer, owning and upgrading the ship, or whatever is on the roadmap next".

## What was built
1. **Checkpoint 1, the live scan (r20-s1):** a scan clock in ship-minutes with START / STOP; three sensors: RADAR (where: pings every unit including silent ones, never IDs; zone outlines, rubble, drop zones), THERMAL (what's alive: zone types, warm units then their size; cold turrets hidden), EM LISTEN (who: emitters only, counted, then a fix with the CARD's guess firming up); a draggable aim ring (full inside the core, linear to zero at the edge) or WIDE. Dwell per sensor per unit / zone / drop zone crosses three bands; contacts carry three band bars; the map tints where each sensor has looked. Patrols walk with the clock, so old fixes go dashed with their age; fixes start the hunt as stale SHIP contacts. Drop zones open once radar has looked. A scan replays exactly from the job seed and its command list (log line, PLAY SEED). The R19 dial stays behind `SCAN_MODE 'dial'` (byte-identical runner).
2. **Fix list 1–4 + checkpoint 2 (r20-s2):** several sensors at once, each with its own ring (Jamie's call over the brief's NOT IN list); a plain FULL MAP button; **no clock cap** (START CLOCK / PAUSE) and a **risk meter** instead: sensors add their loudness, all off cools it, each new step may call a unit in, the drop step sets who is awake and (step 2+) the painted chance; radar-fitted units wake first; patrols walk and new patrols arrive over time; **deadlines on the scan screen only** (the in-hunt mission clock stays parked #85). Test bed: Loud and fast.
3. **Debrief 1 + fix list 5 (r20-s3):** the job card's top line shows SCAN WINDOW N MIN or NO TIME LIMIT; **ship altitude** HIGH / MID / LOW (ring size, sensor strength with thermal most affected, fix sharpness, loudness).
4. **Checkpoint 3 (r20-s4):** THE SCAN on the result screen and test-bed result: a line per stretch (set-up, minutes, what came back, risk added, units joined), then what the drop rolled; `[SCAN]` log lines. Runner `--scan none|quiet|fast|mixed|loud` and `--scansweep N`.
5. **Test bed:** Where first (seed 2025, two silent turrets), Loud and fast (meter just under step 1); Long listen and Quiet drop still run the R19 dial. **Tests 280 → 309.**

**Runner, scan sweep (60 contracts per preset; drop zone nearest the objective; the scripted lance can't read the intel, #92):**

| Preset | Hunt wins | Contracts complete | At the drop |
|---|---|---|---|
| none | 52% | 17 | 0 min, risk 0 |
| quiet (EM on the objective, 8 min) | 45% | 9 | risk 0.4, window closed 7% |
| fast (radar full map, 2 min) | 57% | 21 | risk 2.0 |
| mixed (radar 2 → thermal 3 → EM 5 on the objective) | 47% | 14 | risk 2.8, window closed 17% |
| loud (all three full map, 10 min; added) | 28% | 2 | risk 12.2, step 3, painted 49%, 5.7 awake, 1.65 joined |

None of the brief's four presets reaches step 1; the long ones lose to time (walking patrols, arrivals, deadlines). Jamie still felt the meter as a real trade-off, likely because he runs several sensors and LOW altitude (×1.6 loudness).

**Scan values at the end:** `SCAN_MODE` active, `SCAN_TIME_RATE` 1, `SCAN_TICK` 0.25, `SCAN_SPEED` radar 3 / thermal 1.5 / EM 0.75, `SCAN_BANDS` [1, 3, 6], `SCAN_AIM_CORE` 4, `SCAN_AIM_EDGE` 10, `SCAN_WIDE_STRENGTH` 0.25, `SCAN_DRIFT_PER_MIN` 0.5, `SCAN_DRIFT_LEASH` 8, `SCAN_DROP_DELAY` 2, `SCAN_PING_UNC` [3, 2, 1], `SCAN_HEAT_UNC` [3, 2, 1.5], `SCAN_HOT_IR` 4, `SCAN_IR_LARGE` 6, `SCAN_BLIP_FLOOR` 1; `SCAN_ALT` HIGH ring 1.6 / speed 0.7, 0.4, 0.8 / unc 1.5 / loud 0.6, LOW ring 0.6 / speed 1.4, 1.8, 1.2 / unc 0.7 / loud 1.6; `SCAN_COSTS` on, `SCAN_LOUD` 1 / 0.2 / 0.05, `SCAN_COOL` 0.5, `SCAN_RISK_STEPS` [3, 6, 10] then every 5, `SCAN_RISK_EXTRA` [0, 0.35, 0.5, 0.5], `SCAN_RISK_ALERT` [0, 0.25, 0.5, 0.75], `SCAN_RISK_PAINT` [0, 0, 0.25, 0.5], `SCAN_ARRIVE_PER_MIN` 0.02, `SCAN_DEADLINE_CHANCE` 0.5, `SCAN_DEADLINE_MIN` [8, 16]. `--check`: only the inherited R13 sound flag.

## Changes (from the TWEAK LOG)
| # | Symptom | Change | Result |
|---|---|---|---|
| 1 | Fix list: "pick certain types, aim independently, and run at the same time" | Sensors at once, a ring each | Shipped r20-s2 |
| 2 | Fix list: "cant see where to scan full map instead of circle" | FULL MAP button | Shipped r20-s2 |
| 3 | Fix list: "the clock time, should be infinite … a cool down" | No cap; risk meter with cooling; arrivals over time (as cp2) | "A real trade-off" |
| 4 | Fix list: "some missions may have a time restraint" (scan screen only) | Seeded job deadlines | Shipped r20-s2 |
| 5 | Fix list: "a ship height function … do a high mid low alts" | ALT HIGH / MID / LOW | Shipped r20-s3; not rated |
| 6 | Debrief 1: missed the deadline on the job card | SCAN WINDOW / NO TIME LIMIT tag first on the card | Helped |
| 7 | Debriefs 2, 3: "It felt fine" | No change | - |

## Parked (not built)
1. **The in-hunt mission clock (#85):** deadlines exist on the scan screen only (Jamie: "we can implement the in mission time later").
2. **Ship modules / slots that change the scan, enemy counter-fits, units that hide when detected (#94)**; altitude now sits next to this.
3. **Scan grid / pattern types (#95).**
4. **A terminal-playable build (Claude Code mod):** discussed, Jamie skipped it.
5. **The scripted lance reads intel (#42 / #92):** the sweep still shows costs, not benefits.
6. Small: overlapping rings on one spot show only their stacked names; the side panel scrolls on small phones; the panel tells the player outright when units are called in or arrive (more than the ship would really know).
7. Earlier: #84 scan finds opportunities, #86 notoriety, #88 paying local sources, #90 smallest-phone HUD, #91 north / south drop framing, #93 field radar fits.

## Suggested next step
Pre-drop intel now reads and connects: the live scan answered "Yes" where the dial was "not sure", and the risk meter is a real trade-off. Row 4 can be called done for the slice. Jamie's biggest missing piece is the **company layer** (#87: owning and upgrading the ship), which is next on the roadmap anyway. Ship altitude and parked #94 (ship modules changing the scan) give that layer an obvious first upgrade path: what you fit to the ship changes how it scans. If the design lead wants one more pass on the scan first, the runner needs the scripted lance to read intel (#92) before preset numbers can judge it.
