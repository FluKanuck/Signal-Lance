# Signal Lance: Round 10 status report — "Read the ground"

**Date:** 2026-10-02
**Build:** `signal-lance/` project, TypeScript + Vite (about 1,930 lines: sim 1,050, view 630, plus tune and wiring); built file `signal-lance/dist/signal-lance.html`, version tag `r10-s1`
**Branch:** `claude/signal-lance` (repo `FluKanuck/Prototype`), commits `98182d7` (step 1), `50d775b` (runs 1–2 log), `ce82974` (wrap)
**Live artifact:** https://claude.ai/artifact/NRNixsKxVrcMGNeYp6bB2o (also on GitHub Pages: https://flukanuck.github.io/Prototype/)

## Purpose
Do rolled zones that hide or scramble Signal, with enemy statics dug into them, make Jamie read the map fresh each run and change his route, scouting and who fires what? Round 9 stopped because he'd "seen the new thing", and a static nest was "too easy… stand off and pummel".

## Current status
- **The ground changed the plan, and the stand-off problem went away.**
  - Before first contact, Jamie "hid a mech" in quiet ground on purpose.
  - Against a Turret nest with statics in noise, the fight was "tense, had to close in". In that run A carried the mortar but never fired it, and he won by uplink. The R9 "stand off and pummel" did not come back.
- **Weakest moment (runs 1–2): "It felt fine."** No tuning change was made all round.
- **After 5–6 more runs it "started to feel samey"**, and what was the same was **"nothing at stake"**: each run plays fine, but nothing carries over, so how a run goes doesn't matter. This is outside the round's scope, so no change was made.
- **Record:** about 7–8 runs.
  - Run 1: Ambush, WIN CLEAR 4/4, zones Q1 N2, 2/2 statics zoned, mortar 1/3 hits.
  - Run 2: Turret nest, WIN UPLINK 3/3, kills 2/4, zones Q1 N3, 2/4 statics zoned, B destroyed.
  - Later runs weren't copied from the log.
- **Loadout:**
  - A: passive, ECM, mortar.
  - B: radar, passive, ECM.
  - This is the R9 split, unchanged across both logged fields.
- **Fun test: 2/5** ("one more go" without deciding to; a loss made me want to fix my plan). This is the best score since R4 (3/5), and the first scored over more than 3 runs since then.
- **Biggest thing still missing:** "Not sure. It needs a discussion."

## What was built
1. **Two zone types,** same rules for both sides. A zone changes only how the unit standing in it is *seen*.
   - **QUIET:** others read the unit's Signal × 0.4. This covers fix tightness, carry to passive sensors and the noise ring.
   - **NOISE:** any non-eyes fix on the unit is × 2 uncertain, at least 3 tiles, with a real centre error. Eyes are unaffected.
2. **Roll:** 2–4 non-overlapping zones per run from 10 hand-picked centres (radius 3).
   - At least one QUIET and one NOISE.
   - At least one zone within 8 tiles of the uplink.
   - None within 4 tiles of the spawn.
3. **Statics dig in:** turrets and emplacements take a zone tile 70% of the time when one is legal. Ambush turrets prefer QUIET ground and face the player's spawn. Patrols and the field brain are unchanged.
4. **Visible terrain:**
   - Blue dotted QUIET and amber hatched NOISE, each named on the map.
   - IN QUIET / IN NOISE on the HUD.
   - Zones named in INTEL ("Quiet ground: … Noise: …").
5. **Reporting:**
   - Result screen and log add `zones Q1 N2 · 2/2 statics zoned`.
   - Field list tags zoned units.
   - DBG shows zone list, effective Signal and multipliers per unit.
6. **Playtest pool** set to Ambush and Turret nest. The shuffled set resets when the build tag changes (roadmap #31 fix).
7. **Runner:** reports statics in zones, found rate and first-found round by zone, and aimed-lob hits on NOISE targets vs elsewhere.

### Headless runner, 50 games (10 per composition, A with mortar)
| Composition | Results | Avg kills | Statics in zones | First found (round): in zone vs out |
|---|---|---|---|---|
| Mixed | UPLINK 5, LOSS 4, CLEAR 1 | 2.1/4 | 14/20 | 6.1 (noise 8.0) vs 6.5 |
| Turret nest | UPLINK 6, LOSS 4 | 1.6/4 | 28/40 | 6.1 (noise 8.7) vs 6.8 |
| Sweep | LOSS 5, CLEAR 3, UPLINK 2 | 2.1/4 | — | — |
| Fortified | LOSS 5, UPLINK 5 | 1.5/4 | 21/30 | 6.1 (noise 7.9) vs 6.9 |
| Ambush | UPLINK 10 | 2.0/4 | 14/20 (all quiet) | 3.8 vs 6.5 |

- **Totals:** UPLINK 28, LOSS 18, CLEAR 4. No stalls.
- **Statics in NOISE are found about 1.5–2 rounds later.**
- **The script never lobbed at a noisy target without eyes.** All 9 of those lobs were on eyes fixes of about ±0.3 tiles. Noise vs stand-off was tested only by Jamie.
- **Ambush turrets are found more often than in R9** (7/20, up from 2/20), because they sit in quiet ground facing the spawn.
- **Flag:** QUIET does nothing for a turret, because turrets never carry Signal. Their only tell is muzzle flash, which NOISE does fuzz.

## Changes (from the TWEAK LOG)
| # | Symptom | Change | Result |
|---|---|---|---|
| step 1 | R9 "seen the new thing"; static nest "stand off and pummel" | Rolled QUIET/NOISE zones (`ZONE_*`), statics prefer zones, Ambush turrets in quiet facing the spawn, pool → Ambush + Turret nest, bag resets per build | Played; ground changed the plan; nest "tense, had to close in" |
| runs 1–2 | "It felt fine" | None | — |
| runs 3–8 | "Started to feel samey": "nothing at stake" | None (out of round scope) | — |

## Parked (not built)
1. Parked during the round: #33, presentation in the vibe of the new Blade Runner films (darker than cyberpunk, more rain, more gritty).
2. Build notes:
   - QUIET gives turrets nothing to hide. If turrets should benefit from quiet ground, it would need a new rule, such as dampening their firing spike.
   - The script still finds things mostly by walking into them. A smarter runner (#29) is needed before its zone numbers say much.
3. Run logs for runs 3–8 weren't copied. The artifact and Pages copies keep separate logs (#31).
4. Carried over, unchanged: mortar balance (#5), now lower priority since noise fixed the stand-off in play; SIGINT depth (R11); enemy tiers (R12); the rest of the roadmap list.

## Suggested next step
Terrain did its job inside a run. It shaped the plan before contact, and it ended "stand off and pummel" without touching the mortar. The fun test rose to 2/5 over the longest sample since R4. But the stop reason has now moved from "seen the new thing" to **"nothing at stake"**. That's the roadmap's own trigger: R10 wrapped on a reason Gate 1 depth can't fix, so it's the moment to weigh **bringing the R13 contract (linked hunts, persistent damage) forward**, ahead of R11 SIGINT and R12 tiers. Jamie's closing line was "Not sure. It needs a discussion", so open the design lead chat with that discussion rather than a pre-picked answer.
