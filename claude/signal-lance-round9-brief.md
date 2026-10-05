# Signal Lance: Round 9 brief — "Fire on the fix"

Read claude/code-agent-brief.md and claude/playtest-method.md, then follow this round brief.

## QUESTION
Does a mortar module that fires on a fix, with no line of sight needed, make finding things the plan and change who carries what?

## WHY
Round 8: the rolled field gave variety but not decisions. One A-scout / B-push split beat every field Jamie met, and the fun test scored 0/5: "Fun. But no new real mechanics or content to make me want to do extra rounds." Both changes rated "helped" were hunt fixes. A mortar is a new verb that turns a good fix into a payoff, and it costs a slot, so the INTEL has a reason to change the loadout.

## CHANGE
One step. Keep everything from Round 8 (two-mech lance, initiative, AP, Energy, move modes, Signal, noise ring, damage read, type ID on sight, muzzle flash, uplink, composition roll, shuffled set, the R8 hunt fixes) unless listed here. Rules go in `src/sim/` first, then the view. **This brief explicitly allows one new module: MORTAR.** No others.

1. **MORTAR loadout module (player mechs only).**
   - Takes one loadout slot, exactly like the existing modules (radar, ECM, armour, etc.). Either mech, both, or neither can carry it. B still starts as a copy of A.
   - Carries `TUNE.MORTAR_SHELLS` (default 6) shells, separate from gun rounds.
2. **MORTAR action** (a new button, ≥ 48px, shown only on a mech that carries the module):
   - Target: the selected contact's estimated position (the centre of its fix). **No LoS needed.**
   - Cost: `TUNE.AP_MORTAR` (default 2). Max `TUNE.MORTAR_PER_ACTIVATION` (default 1) per activation. No Energy cost.
   - Allowed only when the contact's uncertainty ≤ `TUNE.MORTAR_MAX_UNC` (default 4 tiles) and range is between `TUNE.MORTAR_MIN_RANGE` (default 4) and `TUNE.MORTAR_MAX_RANGE` (default 18) tiles. A bare bearing with no fix doesn't qualify.
   - Blocked reasons, one word, as FIRE does now: "FUZZY", "CLOSE", "RANGE", "AP", "CAP", "SHELLS", "NONE".
3. **Scatter, from fix quality.**
   - Impact point = fix centre + a seeded random offset inside a circle of radius `TUNE.MORTAR_SCATTER_BASE` (default 0.5) + contact uncertainty × `TUNE.MORTAR_SCATTER_PER_UNC` (default 0.6) tiles.
   - Before firing, show the scatter circle on the map so Jamie can see what a tighter fix buys him.
4. **Splash.** Every unit within `TUNE.MORTAR_SPLASH` (default 1 tile) of the impact takes `TUNE.MORTAR_DMG` (default 1) armour, on the existing damage rules. **This includes your own mechs** (simplest and consistent; note it in ASSUMPTIONS). Kills leave wrecks as now.
5. **Feedback.** It's an instant action: the sim runs just long enough to resolve. Show a brief impact marker. The log line says "SPLASH: hit" or "SPLASH: miss". Type ID still needs eyes (no free identification from a hit).
6. **It's loud.**
   - The firing mech gains `TUNE.SIG_MORTAR` (default 30) Signal on the existing rules.
   - The unit whose contact was targeted gets a muzzle-flash contact on the firer, using the existing flash rule but with uncertainty `TUNE.MORTAR_FLASH_UNC` (default 4 tiles), since a shell's launch point is harder to place than a gun's.
7. **Field units do not get indirect fire** and don't react to it beyond the existing brain and flash rule.
8. **Meet the nasty fields.** R8's three runs only met Mixed and Sweep. Add `TUNE.FIELD_PLAYTEST_POOL` (default `["Turret nest", "Ambush", "Fortified"]`). When it's non-empty, the shuffled set draws only from these compositions. An empty list restores the full pool. Comment it as a playtest setting.
9. **Reporting.** The result screen and log line add mortar shells used, hits and mortar kills (e.g. `WIN CLEAR · Turret nest · kills 4/4 · mortar 3/5 hits, 2 kills`). Show who carried the mortar (A, B, both or none).
10. **Headless runner.** The scripted mech A carries a mortar and fires it at any contact that qualifies. Run 10 games per composition (50 total) and report before Jamie plays: wins by type, average kills, stalls, and mortar shots / hits / kills / friendly hits per composition. Flag any composition where the mortar never qualifies or never hits.
11. All new values go in `src/tune.ts`, commented. Log an R9 row in `NOTES.md`.

## NOT IN THIS ROUND
- Enemy indirect fire (e.g. an emplacement that shells you). Parked as the obvious mirror
- Shell flight time, delayed impact, smoke, flares or other shell types
- Other new modules, or changes to existing module costs and slots
- Signal terrain, map zones, SIGINT type ID, drones or recon tools
- New unit types, an elite mech, composition or unit-stat changes
- Field units reacting to shelling, sharing contacts or calling for help
- Initiative changes, fixes for R7/R8 rough edges (unless one blocks play)
- Persistence, campaign, menus, saves, art, sound

## DEBRIEF FOCUS
1. **Did the hunt become the plan?** Did Jamie spend a turn tightening a contact (radar, second mech's bearing, moving for a cross-fix) before lobbing, or just fire and hope?
2. **Did it change the loadout?** Who carried the mortar, and did that change with the INTEL, or did one mortar build beat every field? If the mortar feels like a must-have or a never-take, the first knobs are `MORTAR_MAX_UNC` and `SIG_MORTAR`.

## DONE
~10 runs played + fun test run, then save the status report as
claude/signal-lance-round9.md. Include the 50-game runner summary.
