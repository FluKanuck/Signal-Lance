# Signal Lance: Round 20 brief — "Eyes from the ship"

Read claude/code-agent-brief.md and claude/playtest-method.md, then follow this round brief.

**Context:** slice row 4, **Pre-drop intel (ship)**, second pass, agreed in the R20 design lead chat (2026-10-07). R19's dial read "not sure" and was the weakest moment ("a menu pick"). Jamie picked the **full active scan** over a thin one or moving on to the company layer. Like R18–R19, it's built in **three checkpoints, each playable and shippable on its own**; if the round stalls, stop at the last one that works. **No fun test** (it runs once on the whole slice). The check is "does it read and connect?".

## QUESTION
Does spending scan time actively (picking a sensor, dragging the aim mark, deciding when to stop) feel like preparing a plan rather than picking from a menu, and does that plan change with the job?

## WHY
R19: "good bones, flat choice". RWR "the wedge showed me", and the costs bite (painted ship: wins 66% → 40%), but four fixed steps felt like a menu pick. Jamie: "a start stop timer, and even an area selection… select what types of scan to use… thermal vs radar, these return different fields of information".

## CHANGE
Keep everything from R19 (scan screen position, drop zones, hunt 1 builds after its scan, stale SHIP contacts, PLAY SEED, the RWR and built-in PAINTED ring, the test bed) unless it's listed here. Rules in `src/sim/` first, then the view. The listen dial goes; keep it behind a flag (`SCAN_MODE` `'active'` | `'dial'`) so R19 stays replayable and the runner can compare.

### Checkpoint 1: the live scan (Jamie plays)
1. **The scan clock.** On the scan screen: START / STOP and a clock in ship-minutes (`SCAN_TIME_RATE` ship-min per real second, start 1; `SCAN_TIME_MAX` cap, start 20). Returns fill in live while it runs. STOP then DROP (or START again). Time is the sim's: the view only sends start / stop / aim / sensor commands; the sim advances in fixed ticks (`SCAN_TICK`, e.g. 0.25 ship-min) so a run replays from the seed and the commands.
2. **Three sensors, one at a time.** A sensor picker (switchable while stopped or running). Each answers one question:
   - **RADAR (active) = WHERE.** Zone outlines, ground clutter, which drop zones are clear; every unit as an **unknown ping** (silent units too, no type). Fast.
   - **THERMAL (passive, the ship flies low) = WHAT'S ALIVE.** Zone types (NOISE / industry reads hot, QUIET cold); hot units as **size class + rough position** (uses the R18 THERMAL signature; cold units stay hidden). Medium speed.
   - **EM LISTEN (passive SIGINT) = WHO.** Emitters only: roster counts, CARD best-guess ID with confidence that firms up with time, bearing fixes that tighten into blips (fuzz shrinks from `SCAN_BLIP_UNC` toward a floor). Slow.
3. **The aim mark.** A draggable circle on the scan map (drag while running is fine). It is an aim point, not a resizable box: **full strength inside a core radius, fading linearly to zero at the edge** (`SCAN_AIM_CORE`, `SCAN_AIM_EDGE` in tiles, per sensor if it reads better). A **WIDE** toggle covers the whole map at a low flat strength (`SCAN_WIDE_STRENGTH`, start 0.25).
4. **Bands per target.** Each unit and each zone gathers **dwell per sensor** = Σ (sensor speed × aim strength at its position × tick). Dwell crosses thresholds (`SCAN_BANDS` per sensor, three steps, reusing R19's SHORT / MEDIUM / LONG idea) to reveal its layer for that sensor. Show the band as a fill on the target / zone, so you can see where you've looked hard and where you've barely looked. Speeds per sensor in TUNE (`SCAN_SPEED`: radar fast, thermal medium, EM slow).
5. **Patrols drift with time.** Mobile units keep moving during the scan (reuse `SCAN_DRIFT`, now scaled by clock time: `SCAN_DRIFT_PER_MIN`), so a long scan gives older positions; reveals carry into the hunt as stale SHIP contacts as in R19.
6. **Drop zones** need radar on that apron (band 1+) to be offered; otherwise you get today's default spawn. Ship as `r20-s1` (costs off: `SCAN_COSTS` false).

### Checkpoint 2: the risk meter (Jamie plays)
7. **One risk meter** fills while the scan runs: Σ (sensor loudness × tick). Loudness in TUNE (`SCAN_LOUD`: radar high, thermal low, EM near zero). The meter replaces the dial steps as the input to R19's cost ladder: re-key `SCAN_ALERT_SHARE`, `SCAN_EXTRA_CHANCE` and `SCAN_PAINT_CHANCE` to risk thresholds (`SCAN_RISK_STEPS`). `SCAN_AMBUSH`, `SCAN_AMBUSH_DIST` and `SCAN_ALERT_UNC` stay as they are. Radar-fitted field units notice radar early (their alert share counts first; simplest option, note in ASSUMPTIONS).
8. The scan screen shows the meter and plainly what the next threshold risks. The outcome is still rolled at the drop and shown on the result screen and in the log, as in R19. Ship as `r20-s2`.

### Checkpoint 3: learn why + runner (Jamie plays)
9. **Scan log on the result screen:** a short line per stretch: sensor, aim area (a named block or "wide"), minutes, what came back, risk added; then what the drop rolled. Also in the log as `[SCAN]` lines.
10. **Runner presets** for the scripted lance: `--scan quiet` (EM only, aim at the objective), `--scan fast` (radar wide, short), `--scan mixed` (radar short → thermal → EM on the objective), `--scan none`; a sweep reporting hunt wins, risk, painted % per preset. The scripted lance still can't use the intel (#92); note that in the report. Ship as `r20-s3`.

### Every step
11. New values in `src/tune.ts`, commented; TWEAK LOG and ASSUMPTIONS in `NOTES.md`.
12. Test bed scenarios (packed layout, fixed seeds):
    - **"Where first"** (cp 1): a mixed field with two silent units. Question: "Which sensor told you the most for this job?"
    - **"Loud and fast"** (cp 2): radar wide with the meter close to a threshold. Question: "Did you stop before the risk, or push?"
    - Keep **Long listen**, **Quiet drop** and **Painted on the move** working (Long listen runs in `SCAN_MODE` `'dial'`).
13. Vitest per new rule: scan replays identically from seed + commands; aim falloff (core full, edge zero, linear between); dwell only grows inside the aim footprint (or WIDE); each sensor reveals only its own layer (radar never IDs, EM never sees silent units, thermal never sees cold units); drift scales with clock time; risk meter grows by loudness × time and hits the cost ladder at its thresholds; drop zones need radar band 1.
14. **Tester splash** (`src/view/brief.ts`): what's new per checkpoint in plain words; 2–3 tap questions from the debrief focus. **Update GAMEPLAY BASICS every build** (the three sensors in one line each, the aim mark, bands, the risk meter). Bump `BUILD`.
15. Phone first: the scan map gets the room (R19 readability pass carries over); START / STOP and the sensor picker ≥ 48px; the aim mark draggable with a thumb without hiding what it's over (offset or ring only).

## NOT IN THIS ROUND
- Ship detection modules / slots that change how well a scan goes; enemy fits compared against them; units that hide, move or disguise when detected (parked #94, with #51 decoys, #30 ship slots)
- Different scan grid / pattern types (parked #95)
- Running two sensors at once
- Paying local sources (#88), opportunities found by the scan (#84), the mission clock (#85), notoriety (#86)
- A smarter scripted lance that reads intel (#42 / #92)
- Field radar fits (#93), HUD fixes for the smallest phones (#90), north / south drop framing (#91), unless trivially in reach
- Changing to-hit, map, mission or item balance values (changes go through the debrief)

## DEBRIEF FOCUS
1. **Active, not a menu:** did spending the time (sensor, aim, when to stop) feel like preparing, and what made you stop?
2. **Job shapes the scan:** did you use a different sensor or order on different jobs (Bounty vs Retrieve vs Escort), and did what you found change your drop zone or build?

## DONE
- Checkpoints 1–3 shipped and scenarios played, then ~10 hunts across all four mission types, then the "does it read and connect?" check (one tap answer: *the scan changed my plan / it didn't / not sure*). **No fun test this round.**
- Save the status report as claude/signal-lance-round20.md. Include: which checkpoint was reached, the runner sweep per preset, which sensors / orders Jamie used per job and why, scenario tap answers, and the scan values at the end.
