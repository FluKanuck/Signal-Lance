# Signal Lance: Round 10 brief — "Read the ground"

Read claude/code-agent-brief.md and claude/playtest-method.md, then follow this round brief.

## QUESTION
Do rolled zones that hide or scramble Signal, with enemy statics dug into them, make Jamie read the map fresh each run and change his route, scouting and who fires what?

## WHY
Round 9: the mortar landed ("a good dimension") and the A/B split moved for the first time, but the fun test was 0/5 over 2 runs, the fourth low score in a row. Jamie's reason for stopping: he'd "seen the new thing". Each build brings one surprise, and the runs themselves don't. A static nest was also "too easy… stand off and pummel" once fixed. His missing piece: "map variety / signal terrain". Terrain that changes every run puts the novelty inside the run, and fixes the stand-off problem through the map rather than by nerfing the mortar.

## CHANGE
One step. Keep everything from Round 9 (two-mech lance, initiative, AP, Energy, move modes, Signal, noise ring, damage read, type ID on sight, muzzle flash, uplink, composition roll, shuffled set, MORTAR and blind lob, R8 hunt fixes) unless listed here. Rules go in `src/sim/` first, then the view. The map's walls and tiles do not change.

1. **Two zone types** in `TUNE.ZONE_TYPES`, each commented. A zone affects **units standing in it** (the observed unit), on both sides, under identical rules:
   - **QUIET** (rubble, dead ground): a unit inside counts its Signal × `ZONE_QUIET_SIG_MULT` (default 0.4) wherever Signal is read by others. That covers the fix-uncertainty lerp (`SIG_UNC_QUIET` → `SIG_UNC_LOUD`), Signal carrying to passive sensors (`SIGNAL_EMIT`) and the noise ring's radius. Its own Signal bar still shows the true value.
   - **NOISE** (substation hum, machinery): any contact on a unit inside has its uncertainty × `ZONE_NOISE_UNC_MULT` (default 2.0), with a floor of `ZONE_NOISE_UNC_FLOOR` (default 3 tiles). Eyes (`EYES_CLOSE`, `EYES_RANGE` with LoS) are unaffected, so walking in close still identifies and fixes a unit.
   - A zone does not change the sensors of a unit standing in it (only how it is seen). Note this in ASSUMPTIONS.
2. **Zone shape and roll.**
   - Hand-pick `TUNE.ZONE_CANDIDATES`: 8–10 centre points on open floor, spread across the map, each with a compass name (e.g. "NE yard"). None in the walled pockets excluded by the R5 flood fill.
   - A zone is every reachable floor tile within `ZONE_RADIUS` (default 3) tiles of its centre.
   - Each run rolls `ZONE_COUNT_MIN`–`ZONE_COUNT_MAX` (default 2–4) non-overlapping candidates from the seeded RNG, with at least one QUIET and one NOISE.
   - At least one rolled zone must have its centre within `ZONE_UPLINK_NEAR` (default 8) tiles of the uplink. No zone may cover a tile within `ZONE_SPAWN_CLEAR` (default 4) tiles of the player spawn.
3. **Statics use the zones.**
   - When placing a static unit (turret, emplacement), pick a zone tile with probability `ZONE_STATIC_PREF` (default 0.7) if any zone tile meets the composition's existing placement rules (`staticPlacement` "uplink" = within `GUARD_RADIUS` of the uplink; "anywhere" = any reachable tile). Otherwise place as now. Existing rules still hold: nothing within `UPLINK_MIN_DIST` of the player spawn, no stacking.
   - **Ambush only:** its turrets prefer QUIET zones, and face toward the player spawn instead of toward the uplink.
   - Patrols, the field AI and its brain are unchanged. Nothing seeks or avoids zones on purpose.
4. **Visible terrain.** The player always knows where zones are (they're terrain, not intel). Draw each zone as a subtle tinted area with a distinct edge pattern per type, readable at phone zoom and not hiding contacts, rings or the scatter circle. When a player mech stands in a zone, the HUD shows "IN QUIET" or "IN NOISE".
5. **INTEL** names the zones after the composition and uplink, e.g. "INTEL: Turret nest… Uplink at west plaza. Quiet ground: rail cut (N). Noise: substation (E), yard (SW)."
6. **Playtest pool.** Set `FIELD_PLAYTEST_POOL` to `["Ambush", "Turret nest"]`. Ambush has never been played, and Turret nest is the stand-off test. Also reset the stored shuffled set whenever the build's version tag changes, so a new build starts a fresh cycle (rough edge #31, fixed only because it blocks the playtest).
7. **Reporting.**
   - Result screen and log line add the zones and how many field units started in one, e.g. `WIN CLEAR · Ambush · kills 4/4 · zones Q1 N2 · 2/2 statics zoned · mortar 2/4 hits`.
   - DBG overlay: zone outlines with type, each unit's effective Signal and its zone multipliers.
8. **Headless runner.** Run 10 games per composition (50 total, full pool, mortar on A as in R9). Report, per composition: wins by type, average kills, stalls over 80 rounds, % of statics placed in zones, found rate for units in a zone vs not, and mortar hit rate on targets in NOISE vs elsewhere. Report this **before** Jamie plays. Flag any composition where zones never hold a static, or where in-zone units are found as often as out-of-zone ones (the zones aren't doing anything).
9. All new values go in `src/tune.ts`, commented. Log an R10 row in `NOTES.md`, and note zone rules and placement choices in ASSUMPTIONS.

## NOT IN THIS ROUND
- Height, verticality, new LoS blockers, wall or map layout changes
- Zones that change movement cost, damage, or the observer's own sensors
- Field AI that moves into, out of, or around zones on purpose; reactive or communicating field units
- Mortar balance changes (proximity splash, base scatter, `MORTAR_*` knobs). Terrain is the test; leave the mortar alone so we can tell what worked
- A richer SIGINT display or type ID from signal (R11)
- Smarter fixes (impossible spots, stale cross-referencing)
- New modules, a deployable jammer or decoy, drones, new unit types, an elite mech
- Other R7/R8 rough edges, the smarter runner script
- Persistence, contracts, campaign, menus, saves, art, sound

## DEBRIEF FOCUS
1. **Did the ground change the plan before the first contact?** After reading the INTEL and the map, did Jamie pick a different route, hide a mech in quiet ground, or change who carries radar or the mortar, run to run?
2. **Did a nest in noise stop the stand-off?** Did it push him to close in for eyes or gamble a fuzzy lob, and did that feel tense or just frustrating? If it's frustrating, the first knobs are `ZONE_NOISE_UNC_FLOOR` and `ZONE_QUIET_SIG_MULT`.

Also ask once at the end: **after the last run, was there still something about the ground you hadn't figured out?** (The R9 stop reason was "seen the new thing".)

## DONE
~10 runs played + fun test run, then save the status report as
claude/signal-lance-round10.md. Include the 50-game runner summary.
