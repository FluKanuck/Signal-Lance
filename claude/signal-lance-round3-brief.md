# Signal Lance: Round 3 brief — "Loud and blind"

Read claude/code-agent-brief.md and claude/playtest-method.md, then follow this round brief.

## QUESTION
Does planning each turn blind, where every radar pulse, shot and dash makes you louder, turn the fight into a real tactical choice instead of a FIRE-mash?

## WHY
Round 2: the INTEL briefing changes the build, but the fun test scored 0 of 4 and combat is "hitting FIRE as fast as I could. No skill or tactics." Jamie puts that down to the controls: firing and manoeuvring at once is awkward on the phone. Simultaneous turns remove the juggling, and a signal meter makes every action a cost.

## CHANGE
Build in two steps. The game must be playable after step 1 on its own. Ship step 1, report, and wait for "played" and a debrief before starting step 2.

### Step 1 — Simultaneous turns (WEGO)
1. The existing real-time sim stays. Wrap it in a turn loop: **PLAN** (sim paused) → **RESOLVE** (sim runs for `TUNE.TURN_SECONDS`, default 4) → back to PLAN.
2. During PLAN the player sets, for this turn:
   - **Move:** tap a destination (or STOP to hold). Show the planned path as a line.
   - **Fire:** a fire order at the selected contact (on/off for this turn). During RESOLVE, the mech fires automatically whenever the existing lock/uncertainty rules allow, up to `TUNE.SHOTS_PER_TURN` (default 2).
   - **EW:** the existing radar pulse / ECM / passive controls, set as orders for this turn rather than pressed live.
3. A large **COMMIT** button (≥ 48px) starts RESOLVE. No input is accepted during RESOLVE apart from a pause for inspection, if that's trivial.
4. The enemy AI picks its orders at the start of RESOLVE using its existing temperament and variant logic. **The player never sees the enemy's orders, path or intent**, only what the sensors show, exactly as now.
5. Show a turn counter and a 4-second resolve bar. The log line records the turn number.

### Step 2 — Signal meter (both mechs, same rules)
6. Each mech has a **signal** value, 0 to `TUNE.SIGNAL_MAX` (default 100). Show the player's as a bar. The enemy's is hidden (DBG overlay only).
7. Signal builds during RESOLVE:
   - radar pulse: `TUNE.SIG_RADAR` (default 30 per pulse)
   - ECM active: `TUNE.SIG_ECM` (default 8 per second)
   - each shot fired: `TUNE.SIG_SHOT` (default 20)
   - moving faster than `TUNE.SIG_MOVE_SPEED_FRAC` (default 0.6) of top speed: `TUNE.SIG_MOVE` (default 4 per second)
8. Signal cools by `TUNE.SIG_DECAY` (default 25) at the start of each PLAN phase.
9. **Signal sharpens the other side's fix.** The observer's contact uncertainty on a mech is scaled by that mech's signal: `uncertainty × lerp(TUNE.SIG_UNC_QUIET, TUNE.SIG_UNC_LOUD, signal / SIGNAL_MAX)`, defaults 1.5 (quiet, fuzzier) and 0.4 (loud, tighter). This applies both ways. Build it on the existing contact/uncertainty and lock rules, so locks (`ENEMY_FIRE_UNC` in `TEMPERS`, and the player's equivalent) still need a tight fix. Loud mechs just get there faster.
10. A mech at signal 0 with passive only should be hard to fix but not invisible. Keep the existing passive rules as the floor.
11. All new values go in `TUNE`, commented. Note any mirror rules you need (e.g. how the enemy AI reads its own signal) in ASSUMPTIONS; the simplest option is that the enemy ignores its own signal this round.

## NOT IN THIS ROUND
- Showing enemy predicted paths or intent (Phantom Brigade style). Hidden intent is the point.
- A multi-segment timeline or queued actions across a turn. One move + one fire order + EW per turn.
- Multiple mechs, a lance, or new enemies, modules or maps.
- Signal-based enemy AI tactics (going quiet on purpose). Enemy keeps its current temperaments.
- Radar warning receiver, INTEL changes, heat as damage or overheating.
- Replays, turn undo, rewind, save systems, menus, art, sound.

## DEBRIEF FOCUS
1. After step 1: is watching the turn resolve the fun ("plan, commit, watch"), or does the fight feel slow or random?
2. After step 2: does Jamie ever hold fire, cut radar or go slow **on purpose** to stay quiet, or does the signal bookkeeping feel like homework? If three signal sources feel like too much, movement heat (`SIG_MOVE`) is the first knob to drop.

## DONE
~10 runs played + fun test run, then save the status report as
claude/signal-lance-round3.md.
