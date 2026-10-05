# Signal Lance: Round 8 brief — "Different field, different plan"

Read claude/code-agent-brief.md and claude/playtest-method.md, then follow this round brief.

## QUESTION
Does rolling which units make up the field each run make Jamie plan a different A/B split from the INTEL, instead of repeating last run's?

## WHY
Round 7: the two-mech lance and initiative clicked (scout/push roles, initiative "tense, in a good way"), but every run had the same four units on the same map, so the split gets solved once and repeats. Jamie's overall read: "the lance clicked, runs blur." His missing piece: "variety in both map and field, followed by a reason to care." Variety in the field comes first; it uses only existing unit types.

## CHANGE
One step. Keep everything from Round 7 (two-mech lance, initiative, AP, Energy, move modes, Signal, noise ring, damage read, type ID on sight, muzzle flash, uplink, WIN UPLINK / WIN CLEAR) unless listed here. Rules go in `src/sim/` first, then the view.

1. **Composition pool.** Replace the fixed `TUNE.FIELD` with `TUNE.FIELD_COMPOSITIONS`: a list of named compositions built only from the three existing `FIELD_TYPES` (turret, emplacement, patrol). Unit stats in `FIELD_TYPES` stay unchanged. Starting pool (each commented in `tune.ts`):

   | Name | Turrets | Emplacements | Patrols | Static units placed |
   |---|---|---|---|---|
   | Mixed (today's field) | 1 | 1 | 2 | near uplink |
   | Turret nest | 3 | 1 | 0 | near uplink |
   | Sweep | 0 | 0 | 4 | — |
   | Fortified | 1 | 2 | 1 | near uplink |
   | Ambush | 2 | 0 | 2 | anywhere reachable |

2. **Placement flag.** Each composition has `staticPlacement: "uplink" | "anywhere"`.
   - `"uplink"`: as now (within `GUARD_RADIUS` of the uplink, LOS to it where possible).
   - `"anywhere"`: any reachable tile, using the R5 flood fill.
   - Existing rules still apply: nothing within `UPLINK_MIN_DIST` of the player spawn, and static units of one composition don't stack on the same tile.
3. **Roll.** One composition is rolled per run from the seeded RNG, with equal weights (`weight` field per composition, default 1). No no-repeat logic this round. Positions stay seeded as now.
4. **INTEL** stays accurate and names the composition, e.g. "INTEL: Turret nest. 1 emplacement, reports of 3 hidden turrets. Uplink at west plaza." It is shown before the loadout is locked, as now, so the A/B loadouts can respond to it.
5. **Reporting.** The composition name appears on the result screen, in the log line (e.g. `WIN CLEAR · Turret nest · kills 4/4`) and on the DBG line next to the seed.
6. **Kill count and WIN CLEAR** use the rolled unit total (it can differ from 4 if the pool changes later).
7. **Headless runner.** Add `--comp <name>` to force a composition. Run 10 games per composition (50 total) with the two-mech scripted player, and print per composition: wins by type, average kills, average rounds, stalls over 80 rounds, and per unit type: found / acted / fired / destroyed. Put the summary in your step report **before** Jamie plays. Flag any composition where a unit is never found or never acts, or where results look far off the others. The script is dumb, so this checks for broken setups, not balance.
8. All new values go in `src/tune.ts`, commented. Log an R8 row in `NOTES.md`, and note in ASSUMPTIONS how "anywhere" placement and unit counts were handled.

## NOT IN THIS ROUND
- New unit types (infantry, vehicles), an elite enemy mech, or per-composition stat changes
- A random budget generator for the field (hand-picked compositions only)
- Weighted tuning, no-repeat or "unreliable INTEL" rolls
- Map zones, Signal-hiding areas, new LoS blockers or a new map
- SIGINT type ID, drones or recon tools
- Field units sharing contacts or calling for help; reactive bot behaviour
- Initiative changes (delay, hold, interrupt)
- Fixing the R7 rough edges, unless one blocks play
- Persistence, damage carried between runs, campaign, menus, saves, art, sound

## DEBRIEF FOCUS
1. **Did the briefing change the plan?** After reading INTEL, did Jamie change A's or B's loadout, or the roles they took, or did one split work against every composition?
2. **Did any composition feel unwinnable or unfair** (e.g. Turret nest at the uplink, Ambush on the route)? If one dominates the complaints, tune that composition's counts before touching unit stats.

## DONE
~10 runs played + fun test run, then save the status report as
claude/signal-lance-round8.md. Include the 50-game runner summary.
