# Signal Lance: Round 3 status report — "Loud and blind"

**Date:** 2026-09-30
**Build:** `signal-lance.html` (1,245 lines)
**Branch:** `claude/signal-lance` (repo `FluKanuck/Prototype`), commits `fda2c62` (step 1 build) and `3c0ae63` (debrief log)
**Live artifact:** https://claude.ai/artifact/NRNixsKxVrcMGNeYp6bB2o

## Purpose
Does planning each turn blind, where every radar pulse, shot and dash makes you louder, turn the fight into a real tactical choice instead of a FIRE-mash? Round 2 found that combat was "hitting FIRE as fast as I could." Jamie blamed the phone controls, so this round replaced live input with simultaneous turns (step 1) and was going to make every action a cost (step 2, the signal meter).

## Current status
- **Step 1 was built and played once. Step 2 (signal meter) was not built.**
- The weakest moment, in Jamie's words: "Discovering the bot wasn't limited to firing only twice." That's accurate. The 2-shots-per-turn cap only applied to the player. The enemy kept firing on its 0.8 s cooldown, which is about 5 shots in a 4-second turn.
- **Jamie paused the round** and wants to try **standard I-go-you-go turns** instead of WEGO.
- Fun test: **0/5**, scored after one run, so it isn't a full ~10-run score. Nothing ticked. "Someone else asked to play again" didn't fit on the form and is counted as not ticked.
- Biggest thing still missing: **"Effective planning."**

## What was built
1. **Turn loop around the existing real-time sim:** PLAN (sim frozen) → COMMIT → RESOLVE (`TURN_SECONDS` 4) → PLAN. It shows a turn counter and a resolve bar, and the result screen and log line record the turn count.
2. **Orders set in PLAN only:** a move (tap a destination; the planned path is drawn), STOP (hold), CREEP, radar, ECM mask and ghost. Orders stay set from turn to turn until changed.
3. **Fire order:** FIRE switches between ON and OFF for the selected contact, with a dashed yellow line to the target. During RESOLVE the player auto-fires up to `SHOTS_PER_TURN` (2) times, and only when the contact is tracked, uncertainty ≤ `PLAYER_FIRE_UNC` (2 tiles), range ≤ `PLAYER_FIRE_RANGE` (12) and LOS to the estimate is clear. This is a new rule for the player that mirrors the enemy's lock rule.
4. **During RESOLVE**, COMMIT becomes PAUSE/RESUME for inspection. Camera drag still works. Nothing else takes input.
5. **The enemy** runs its existing state machine throughout RESOLVE. Its orders and intent are never shown.

## Changes (from the TWEAK LOG)
| # | Symptom | Change | Result |
|---|---|---|---|
| R3 step 1 | Combat is FIRE-mashing: firing and manoeuvring at once on the phone is awkward | New WEGO turns (`TURN_SECONDS` 4), auto-fire order (`SHOTS_PER_TURN` 2, `PLAYER_FIRE_UNC` 2, `PLAYER_FIRE_RANGE` 12), STOP, PAUSE moved onto COMMIT | Played once. Fun test 0/5. Round paused |
| R3b | The enemy isn't bound by the shots-per-turn cap | No change (round paused) | — |

## Parked (not built)
1. **Step 2, the signal meter** (`SIGNAL_MAX`, `SIG_RADAR`/`ECM`/`SHOT`/`MOVE`, decay, uncertainty scaling). It was never built, so the "loud vs quiet" question is untested.
2. **The enemy should obey the same turn rules as the player**, starting with the shot cap. Also: its orders should be fixed at the start of each turn. It currently re-decides mid-turn, which was a simplifying assumption.
3. A marker on the planned path showing where the mech will be when the turn ends (later list).
4. Whether orders should carry over between turns or reset each turn. Carry-over was chosen to cut taps, but it may weaken the sense of choosing every turn.
5. Carried over from Round 2: RWR warning, unreliable INTEL, enemy ECM ghosts, mid-hunt temperament tells, loadout balance recheck.

## Suggested next step
Jamie wants to try **I-go-you-go**. In that setup the player acts fully, then the enemy acts fully. You can see the result of each move before the next one, which answers "effective planning" more directly than blind simultaneous turns. If the next round is I-go-you-go, the shot and move limits need to apply to both sides from the start, since the first thing that broke immersion here was the rules not being fair. Keep the signal meter parked until the turn structure feels like planning. By the method's rule this is the third flat result for the replay/combat strand, so it's also a fair point to decide whether Signal Lance is still the right toy to keep pushing.
