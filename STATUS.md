# Signal Lance: prototype status report

**Date:** 2026-09-30
**Build:** `signal-lance.html` (one self-contained file, about 1,070 lines, vanilla JS + canvas)
**Branch:** `claude/signal-lance` (repo `FluKanuck/Prototype`)
**Live artifact:** https://claude.ai/artifact/NRNixsKxVrcMGNeYp6bB2o (private until shared)

## Purpose

This is a throwaway phone prototype built to answer one question: **does planning a loadout, then watching it succeed or fail on a short hunt, make the player want to go again?**

## Current status

- All 5 build steps are complete. The full loop works on the owner's phone (landscape, touch): loadout → hunt → result → note → log → loadout. Restarting takes a few seconds.
- The hunt itself now "felt good" (latest debrief). There were no open complaints about sensors, the enemy AI, ambushes or readability.
- **Core question, latest answer: "Done for now."** The player didn't feel pulled to go again. The hunt works, but the loop doesn't yet create a strong desire to replay. This is the main open problem.

## What was built (the 5 steps)

1. **Map, movement and controls.** The map is a hand-made hive-city tile grid, 72×24 tiles (about 3 screens wide). Movement is tap-to-move with 8-way grid A* plus path smoothing. Drag pans the camera, and CTR re-centres it. There are two zoom levels and a pause (orders still work while paused). The extraction zone is the rightmost 3 columns. A "Rotate your phone" overlay shows in portrait.
2. **Signature and detection.** Signature is still + moving + firing spike + radar + armour, times the ECM mask multiplier. Detection strength is signature ÷ (1 + (distance/falloff)²) × wall attenuation per building tile, compared against a threshold. Contacts are fuzzy blips with uncertainty circles; lost contacts go orange and fade. The mech's base "eyes" see within a short range with line of sight.
3. **Sensors and ECM.**
   - Radar: a forward cone that drains power fast and adds a very loud signature.
   - Passive suite: bearing lines to emitting targets. Two lines crossing gives a triangulated fix, with uncertainty from range × bearing error ÷ sin(angle).
   - ECM mask: cuts your signature to a quarter and drains power.
   - ECM ghost: places a decoy contact for the enemy.
   - Using either ECM mode gives the enemy a bearing-only "jamming" line toward you.
4. **The enemy.** It uses the same sensor rules as the player. Its fixed loadout is 1 armour, radar, passive suite and 20 rounds.
   - State machine: PATROL → INVESTIGATE → PULSE radar → CHARGE + FIRE → SEARCH last known position → PATROL.
   - Weapons (both sides): an autocannon whose shells fly to the aim point and stop at buildings. A hit requires the target to be within 0.6 tiles of the aim point when the shell lands, so accuracy comes from sensor quality.
   - Outcomes: WIN = kill + extract, LOSS = destroyed, BAIL = extract without the kill.
   - A DBG toggle shows the true enemy position, its state, its lines and circles, and both eyes arcs.
5. **Loadout, result and log.**
   - Loadout: 10 slots with big −/+ buttons. Radar, passive and ECM are one each; armour goes up to 5 plates, ammo and cells up to 10.
   - Result screen: outcome, reason, damage summary, loadout and a note field.
   - Log line: `date | loadout | outcome | time | damage summary | note`, with COPY LOG (falls back to a selectable text box). The log and the last loadout are kept in localStorage, falling back to memory.

## Changes from the initial spec (user-approved overrides and tuning)

Every change came out of a playtest debrief and is recorded in the TWEAK LOG at the top of the file. All were rated **"helped"** at the following debrief.

| # | Symptom | Change |
|---|---|---|
| 1 | Eyes gave a slow, fuzzy fix; a lost contact just grew where it was last seen | Eyes give an instant exact fix. Lost contacts dead-reckon along their last seen velocity (`DR_TIME` 4 s). `UNC_GROW` 0.8 → 1.2 |
| 2 | Radar felt pointless, like long-range eyes | **Spec override:** buildings no longer fully block radar. It sees through up to 4 building tiles (`RADAR_MAX_WALLS`), adding +0.6 tiles of uncertainty per tile (`RADAR_WALL_UNC`), with a real position error |
| 3 | Couldn't get the drop on the enemy, which saw all-round and fired instantly | Eyes are forward-only for both mechs (`EYES_HALF_ANG` 70°). The enemy must hold a lock for 1.2 s before firing (`ENEMY_REACT`) |
| 4 | The enemy believed the ghost over good information on the real player | `GHOST_UNC` 1.0 → 2.5. Real fixes now outrank the decoy, and the enemy no longer fires at ghosts |
| 5 | No quiet way to break contact and reposition | **New feature (override):** a CREEP toggle. Speed 0.9 tiles/s; moving adds 0.4 to your signature instead of 2.0 |
| 6 | Corner stand-offs: the enemy held off forever with no shot | Enemy patience: it holds for a random 1–6 s, re-rolled each stand-off, then pushes onto its estimate (`ENEMY_PATIENCE_MIN`/`MAX`) |
| 7 | Lost despite feeling ahead, with no idea of the score | Result screen and log line show shots hit/fired, damage taken and hits left for both sides. The user chose no live HUD readout |

Other changes from the spec:
- `DET_WALL` went from 0.6 to 0.8 before the first playtest, because thick buildings blocked almost all passive bearings.
- The layout keeps the top 56px (`--top`) clear, because the Claude app's artifact viewer covers that strip. The hunt buttons are anchored to the bottom.
- A mutual kill counts as a LOSS (player destroyed). This follows the spec's rule but can feel harsh.

## Parked (not built; candidates for the next round)

1. **Loadout balance.** Passive feels mandatory, and ECM rarely earns its 2 slots. Planning the loadout feels close to solved. This is the most likely cause of the "done for now" answer.
2. **Per-spawn enemy temperament** (aggressive / defensive / patient), built on the patience range, charge distance and fire thresholds. It would make hunts vary between runs so a fixed plan stops working.
3. **RWR (radar warning receiver).**
   - (a) A warning when enemy radar paints you. This is small and realistic, so try it first.
   - (b) Showing the enemy's last known position of you. This is a big boost to player information, so test it carefully.
4. **Passive bearings drawn as narrow cones** whose width shows the bearing error, instead of lines. A display-only change.

## Suggested next step

Focus on the core question. The hunt works; the pull to go again doesn't. Test parked item 1 (loadout balance) or item 2 (enemy temperament) first, since each targets replay motivation directly. Keep one change per playtest, as before.

## Working method used

- Build in steps, and debrief after each playtest. Each debrief is at most 3 multiple-choice questions describing symptoms, followed by one proposed change with old → new values. Apply it after "go".
- All tuning values live in the `TUNE` object at the top of the script. The TWEAK LOG and ASSUMPTIONS comment blocks sit at the top of the file.
