# Signal Lance: Round 8 status report — "Different field, different plan"

**Date:** 2026-10-02
**Build:** `signal-lance/` project, TypeScript + Vite (about 1,740 lines: sim 900, view 530, plus tune, wiring and runner); built file `signal-lance/dist/signal-lance.html`, version tag `r8-s1d`
**Branch:** `claude/signal-lance` (repo `FluKanuck/Prototype`), commits `5b91d13` (step 1), `4e4ec75` (shuffled set), `bfb9b2f` (run 1 change), `eec8582` (run 2 change), `dda4478` (run 3 log), `d89bd03` (wrap)
**Live artifact:** https://claude.ai/artifact/NRNixsKxVrcMGNeYp6bB2o (also on GitHub Pages: https://flukanuck.github.io/Prototype/)

## Purpose
Does rolling which units make up the field each run make Jamie plan a different A/B split from the INTEL, instead of repeating last run's? Round 7 found "the lance clicked, runs blur", and Jamie's missing piece was "variety in both map and field, followed by a reason to care".

## Current status
- **The field roll alone did not change the plan.** Jamie used the same split in every run: A had radar, passive and ECM; B had 2 armour and 40 rounds. Asked whether the INTEL changed his plan: "didn't need to change". The scout/push split from R7 worked against Mixed and Sweep without changes.
- **Coverage is thin.** There were 3 runs: Mixed, Sweep, then Mixed or Sweep again. Turret nest, Fortified and Ambush were never played, and these are the fields most likely to break the default split. Run 3's field came up again because each page load uses a pick from the shuffled set, and the artifact and the Pages copy each keep their own set.
- **The contact picture got much clearer.** The two debrief changes were both rated "helped" ("much better!"). These came from the hunt, not from the field.
- **Fun test:** 0/5 ticked. Jamie: "No real change. Fun. But no new real mechanics or content to make me want to do extra rounds." He wrapped after 3 of the ~10 runs.
- **Biggest thing still missing:** "no new real mechanics or content to make me want to do extra rounds".

## What was built
1. **Composition pool.** `TUNE.FIELD` was replaced by `FIELD_COMPOSITIONS`: Mixed (1 turret, 1 emplacement, 2 patrols), Turret nest (3 turrets, 1 emplacement), Sweep (4 patrols), Fortified (1 turret, 2 emplacements, 1 patrol) and Ambush (2 turrets, 2 patrols). Each uses only the existing unit types, with unchanged stats. One composition is rolled per run from the seeded RNG, weighted by `weight` (all 1).
2. **`staticPlacement` flag.** With "uplink", static units go near the uplink, as in R7. With "anywhere" (Ambush only), static units can go on any reachable tile.
3. **The composition is named** in INTEL (e.g. "INTEL: Turret nest. 1 emplacement, reports of 3 hidden turrets. Uplink at …"), on the result screen, in the log line and on the DBG line. Kills and WIN CLEAR use the rolled unit total.
4. **Runner `--comp <name>`.** By default the runner plays 10 games per composition and prints a block for each.
5. **Shuffled set** (spec override, at Jamie's request: "need a way to make sure I can play each type"). Every composition comes up once per 5 runs, in random order. The view side keeps the set in localStorage, and `FIELD_SHUFFLE: 0` restores the plain roll. Jamie picked this over a fixed order so the INTEL stays unpredictable.

### Headless runner, 50 games (10 per composition, two scripted mechs), at step 1
| Composition | Results | Avg kills | Avg rounds | Stalls |
|---|---|---|---|---|
| Mixed | LOSS 8, UPLINK 2 | 1.6/4 | 8.0 | 0 |
| Turret nest | LOSS 9, UPLINK 1 | 0.5/4 | 7.6 | 0 |
| Sweep | LOSS 4, UPLINK 4, CLEAR 2 | 2.1/4 | 8.1 | 0 |
| Fortified | LOSS 7, UPLINK 3 | 1.1/4 | 7.8 | 0 |
| Ambush | UPLINK 10 | 1.5/4 | 8.5 | 0 |

- **Flag:** Ambush turrets were found in only 2 of 20 placements and acted in only 2. Turrets placed "anywhere" sit off the scripted player's walk to the uplink and face the uplink, so for the script Ambush plays like 2 patrols. Turret nest is the hardest field for the script.
- In every other composition, every unit type was found and acted.
- After both debrief changes, the 50 games came out at LOSS 26, UPLINK 20, CLEAR 4, with no stalls. As before, the script measures broken setups, not balance.

## Changes (from the TWEAK LOG)
| # | Symptom | Change | Result |
|---|---|---|---|
| step 1 | (brief) | Composition pool, placement flag, named in INTEL, result, log and DBG; runner `--comp` | Played |
| override | "Need a way to make sure I can play each type" | `FIELD_SHUFFLE 1`: shuffled set, each composition once per cycle | Works per page; see the coverage note above |
| run 1 (Mixed, WIN CLEAR 4/4) | Reading the contacts: "a mixture of them all, the logic doesnt make sense, and then the old lines make it confusing" | `BEARING_LIFE` 15 → 6 s | Helped ("much better!") |
| run 2 (Sweep, WIN UPLINK 2/4) | "now that the game isnt simultaneous… i dont think we need the projected movement of enemies, atleast not the contact dot, and the projections circle should only increase on that enemies turn" | `DR_TIME` 4 → 0; new `UNC_GROW_OWN_TURN 1` (a lost contact's circle grows only during that unit's activation, for all contact lists) | Helped |
| run 3 (Mixed or Sweep) | "It felt fine" | None | — |

## Parked (not built)
1. Parked to the roadmap during this round (#26–#32):
   - Indirect weapons
   - Movement interrupted on a new signal or line of sight
   - Fast travel when there are no enemies
   - END TURN auto-moves along a plotted path
   - Faster signal-line fade (largely covered by the run 1 change)
   - Smarter fixes: no fix in impossible spots, no cross-referencing old data
   - Seen statics staying put (covered by the run 2 change)
   - Delay turn action (added to roadmap #7)
2. Later ideas from the build:
   - Ambush turrets placed on or facing likely player routes, rather than facing the uplink
   - A no-repeat roll across cycles
3. **Rough edges:**
   - The shuffled set is used up by page loads, and the artifact and the Pages copy keep separate sets.
   - The same field can come up twice in a row where one cycle ends and the next begins.

## Suggested next step
The field roll gave Jamie variety but not decisions. One scout/push split beat every field he saw, and he only met the two mildest ones, so the round's question is still partly open. Before reading this as a no, it's worth checking cheaply whether Turret nest and Ambush force a different split, for example by making the next few runs land on them. Jamie's own verdict, though, points past tuning: it was "fun", but there are "no new real mechanics or content" to pull him into more rounds. This is the third low fun-test score in a row (R6 0/5, R7 1/5, R8 0/5), each over few runs. The next round should add something the player can decide or do differently, not more rolled versions of the same units. Two options already on the roadmap fit this:
- **R9 Signal terrain:** zones that change routes and scouting.
- **Indirect weapons** (Jamie's park this round): a new way to act on a fix without line of sight.

Either one also deepens the hunt, which these debriefs keep coming back to: both changes this round, rated "helped", were hunt fixes, not field fixes.
