# Signal Lance: Round 7 brief — "Lance vs the field"

Read claude/code-agent-brief.md and claude/playtest-method.md, then follow this round brief.

## QUESTION
Does hunting a mixed field of weak hidden, static and roaming contacts (step 1), then doing it with a two-mech lance that acts in rolled initiative order (step 2), give the player more to plan around than the 1v1 duel?

## WHY
Round 5 found "1v1 decides it all"; Round 6 built the clean home and changed nothing. Jamie scored the current build 0/5 because there isn't "enough variety of content or variables" to judge. He also reframed the game: the player is the travelling mech lance; most enemies are weaker units (turrets, infantry, vehicles) that are stationary, roaming or hidden, found with SIGINT and scanning. Enemy mechs are the rare elite.

## CHANGE
Build in two steps. The game must be playable after step 1 on its own. Ship step 1, report, and wait for "played" and a debrief before starting step 2. Keep everything from Round 6 (I-go-you-go, AP, Energy, move modes, Signal, noise ring, damage read, uplink) unless listed here. Rules go in `src/sim/` first, then the view.

### Step 1 — The field (one player mech)
1. **Replace the single duel bot with a field of light units**, defined in `TUNE.FIELD` (composition) and `TUNE.FIELD_TYPES` (stats, each commented). Fixed composition this round, rolled positions:
   - **1 × Hidden turret:** static. Armour 1. Passive sensors only, never emits (Signal stays 0) until it fires. Fires only on a firm lock (reuse the Patient value of `ENEMY_FIRE_UNC` from `TEMPERS`).
   - **1 × Emplacement:** static. Armour 2. Pulses radar every `TUNE.EMPL_PULSE_TURNS` (default 2) of its turns, adding Signal on the existing rules, so it's findable. Fires on a lock.
   - **2 × Patrol:** mobile at NORM speed. Armour 1. Passive sensors. Roams waypoints near the uplink using the existing patrol logic (Cautious-style, within `GUARD_RADIUS` × 1.5). Investigates and charges on contacts using the existing bot brain.
   - Ammo, AP and Energy per type go in `FIELD_TYPES`. Every unit obeys the existing AP (`AP_PER_TURN`, `AP_BANK_MAX`), shot cap (`SHOTS_PER_TURN`, `AP_SHOT`) and Energy rules. Static units simply never move.
2. **Muzzle flash:** when any unit fires, its target gets a bearing contact on the shooter, with uncertainty `TUNE.FLASH_UNC` (default 2 tiles). This is how a hidden turret gives itself away. It applies both ways.
3. **No shared info between field units this round.** Each acts on its own sensors only. Note it in ASSUMPTIONS.
4. **Spawns (seeded, reachable tiles only, using the R5 flood fill):** the turret and emplacement go within `GUARD_RADIUS` of the uplink, with LOS to it where possible. Patrols go anywhere reachable. Nothing spawns within `UPLINK_MIN_DIST` of the player.
5. **Remove the per-run temperament/variant roll for this round.** Each field type has fixed behaviour. Keep `TEMPERS` and `VARIANTS` in `tune.ts` untouched (unused) for the future elite mech.
6. **Multiple contacts:** each field unit produces its own contact. Tap a contact to select it for FIRE. The damage read stays per unit and LoS-only. Destroyed units leave a wreck marker.
7. **INTEL line** gives an accurate, rough composition: e.g. "INTEL: 2 patrols, 1 emplacement, reports of a hidden turret. Uplink at west plaza."
8. **Enemy phase:** field units act one after another at a readable pace (~0.4 s between actions), seen only through the player's sensors.
9. **Win and loss:** WIN UPLINK (as now) or **WIN CLEAR** (all field units destroyed). LOSS as now. The result screen and log show the win type and kills (e.g. "WIN UPLINK · kills 2/4").
10. **DBG overlay:** every field unit, its type, its goal line and its Signal.
11. **Headless runner:** extend `npm run sim` to play the field vs the scripted player. Print wins by type, average kills, average turns, and stalls over 80 turns. Run 20 games and put the summary in your step report **before** Jamie plays. If any field unit is never found or never acts, say so.

### Step 2 — The lance, in initiative order
12. **Second player mech.** The loadout screen gets an A / B toggle, and each mech is configured separately (B starts as a copy of A). Both spawn together (adjacent reachable tiles).
13. **Initiative replaces side turns.** At the start of each round, every living unit (both mechs and every field unit) rolls initiative: `TUNE.INIT_BASE[type]` + a seeded random integer from 0 to `TUNE.INIT_ROLL` (default 3). Defaults: mech 5, turret 6, patrol 4, emplacement 3. Higher goes first, and ties go to the player.
14. **Activations:** each unit acts on its own activation. It gains `AP_PER_TURN` at its activation start (banking to `AP_BANK_MAX` as now), and its Energy regen and Signal decay happen then too. On a player mech's activation, that mech is highlighted and the camera centres on it. END TURN passes to the next unit in the order.
15. **Initiative strip:** below the top 56px, show the round's order. Your mechs appear as A / B. A field unit appears as "?" only if the player currently has a contact on it, and untracked units are not shown at all. Note this in ASSUMPTIONS.
16. **Uplink:** either mech can UPLINK. Progress is shared.
17. **Loss:** both mechs destroyed. A destroyed mech is skipped in the order.
18. **Runner:** fields two scripted player mechs under initiative. Re-run 20 games and report before Jamie plays.
19. All new values go in `src/tune.ts`, commented. Log R7 rows in `NOTES.md`.

## NOT IN THIS ROUND
- An elite enemy mech in the field, or temperament/variant rolls for field units
- Infantry or vehicle unit types beyond the three field roles above
- Drones, scouts or other recon tools
- Field units sharing contacts, comms or calling for help
- Delay, hold or interrupt actions in the initiative order, or modules that change initiative
- A rolled field composition
- Reactive bot behaviour beyond the existing brain, Heat, RWR, new maps or zones
- Persistence, damage carried between runs, menus, saves, art, sound

## DEBRIEF FOCUS
1. **Step 1:** does Jamie plan around specific contacts (which to find first, which to avoid, which to kill, or whether to just sneak the uplink), and does the hidden turret create an "oh, there it is" moment rather than feeling unfair?
2. **Step 2:** do the two mechs take different jobs (for example, one quiet scout and one loud shooter), and does the rolled initiative order create tension or just feel random?

## DONE
~10 runs played + fun test run, then save the status report as
claude/signal-lance-round7.md. Include both 20-game runner summaries.
