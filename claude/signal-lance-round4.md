# Signal Lance: Round 4 status report — "Spend it wisely"

**Date:** 2026-09-30
**Build:** `signal-lance.html` (1,559 lines)
**Branch:** `claude/signal-lance` (repo `FluKanuck/Prototype`), commits `928a096` (step 1) → `7359022`, `59fce09`, `2f51f49`, `d36abad`, `2abad7f` (step 2), `c34502f`, `6054241`, `b3d7e23`, `4c5f98b`, `f31efa5`, `8ca7f4e` (wrap)
**Live artifact:** https://claude.ai/artifact/NRNixsKxVrcMGNeYp6bB2o

## Purpose
Does taking turns in order, spending a bankable pool of AP and Energy, make planning feel effective instead of like a guess? Round 3 (WEGO) scored 0/5, broke immersion because the bot ignored the 2-shot cap, and was missing "effective planning". Jamie picked I-go-you-go with resource pools.

## Current status
- **Yes, the turn structure works.** Banking AP and saving Energy felt "like a plan" (run 4), which cleared the gate for step 2. Four of the eight runs ended with "it felt fine" as the weakest moment.
- **Signal (step 2):** Jamie went quiet "on purpose", but at first he "couldn't tell what the effect of signal noise actually had". It only became readable after two follow-up changes: Signal now carries to passive sensors, with a noise ring, and creeping got quieter.
- He adapted his build to the INTEL line: he swapped ECM for a second armour plate against a Heavy and won.
- Record: 8 runs, roughly 5 wins and 3 losses. The bot obeyed every cap.
- Fun test: **3/5, pass** (said "one more go" without deciding to; tried a build he hadn't planned; a loss made him want to fix his plan). "Someone else asked to play again" wasn't ticked because nobody else played. The round was wrapped at 8 runs rather than about 10.
- Biggest thing still missing: **"More to plan around."**

## What was built
1. **Step 1, I-go-you-go:** PLAYER TURN → ENEMY TURN. The sim is frozen between actions; a move runs the real-time sim until arrival, and a pulse or shot runs just long enough to resolve.
2. **AP:** 4 per turn, bankable to 8, shown as pips. Costs: shot 1 (max 2 per turn), radar pulse 2, ECM 1 per turn while on.
3. **Energy** (renamed from power): 100 base, +10 per turn. Radar pulse 25, ECM 20 per turn.
4. **Move modes CREEP / NORM / SPRINT:** 1 / 2 / 3 tiles per AP. The preview shows the route with its cost, clipped to what you can afford.
5. **FIRE is manual,** with one-word reasons when blocked (FUZZY, RANGE, LOS, AP, CAP, AMMO, NONE).
6. **The bot uses identical costs and caps.** Temperament maps to spending: Aggressive sprints and spends everything, Patient creeps and banks, Cautious keeps Energy back for radar.
7. **Step 2, Signal (both mechs):** 0–100. A pulse adds 30, ECM adds 15 per turn, and movement adds 0 / 2 / 5 per tile; Signal drops by 25 per turn. A mech's Signal scales the other side's fix uncertainty from ×1.5 (quiet) to ×0.4 (loud).
8. **Debrief additions:** facing (free turn, then a cost), a D&D-style damage read, Signal carrying to passive sensors with a noise ring, 12-tile eyes, a quieter creep, and a DBG marker showing where the bot thinks you are.
9. **Test conveniences Jamie asked for:** a kill is an instant WIN, and the run log clears on each new build.

## Changes (from the TWEAK LOG)
| # | Symptom | Change | Result |
|---|---|---|---|
| step 1 | WEGO felt like guessing; bot ignored the shot cap | I-go-you-go, AP and Energy, move modes, same rules for the bot | Played; turns "like a plan" |
| run 1 | "Lack of change of facing": walked past the enemy, wasted 2 AP turning; a blip a few metres away stayed invisible behind him | Free turn to face; new `EYES_CLOSE` 2 tiles all-round (both mechs) | Helped |
| run 2 | Lost to a Heavy after landing 10/10: "didn't take note it was a heavy… need a damage indicator, not pure hp, D&D style" | Damage read (`DMG_BLOODIED` 0.5, `DMG_BADLY` 0.25); `FREE_TURNS` 1, then `AP_TURN` 1 | Both helped |
| run 3 | Accidental self-tap burns the free turn; no way to cancel | `SELF_TAP_PX` 28 → 16; tap yourself again or MOVE (reads CANCEL) to cancel | Helped |
| run 4 | None ("felt fine"); planning gate passed | Step 2 Signal built | "Couldn't tell" at first |
| step 2b | Parked: sprint "uses 100 energy for only a small amount of extra ground" | `MOVE_ENERGY_PER_TILE.SPRINT` 10 → 4 (Jamie's pick) | Helped |
| run 5 | Couldn't see Signal's effect; expected loud = heard further, longer eyes, status only with LoS | Override: `SIGNAL_EMIT` 0.05, and Signal > 0 counts as emitting; noise ring; `EYES_RANGE` 5 → 12; damage label LoS-only | Eyes and label helped; ring "misleading" |
| run 6 | Ring showed creep heard at ~15 tiles; wants creep "quieter, not silent" | `CREEP_SIG_MULT` 0.5 (creep ~10 tiles vs walk ~22); DBG "bot thinks" marker | Helped; marker useful |
| run 7 | "Felt fine"; DBG blew up HUD text on the phone | Bug fix only (text-size-adjust) | — |

## Parked (not built)
1. **The bot doesn't react to being shot.** "Peek, shoot twice, hide in the same spot" whittled down a Patient Heavy that only charged in the last round or two. This was queued as the next change.
2. **Every legal shot hits.** Targets stand still during shots in I-go-you-go, so accuracy comes only from fix quality. Watch this once fights have more to them.
3. **Spawn bug:** the bot can spawn in a walled-in courtyard (map top middle) and never reach you. Bot test runs stalled at 80 turns a few times.
4. **Passive bearings** only arrive during the bot's turn, while you stand still. This hasn't been noticed in play, but it limits triangulation.
5. Aim the radar pulse in a chosen direction, not just along your facing or at a selected contact.
6. A "you'll stop here" marker for moves that carry over.
7. Carried over: RWR warning, unreliable INTEL, enemy ECM ghosts, mid-hunt temperament tells, loadout balance recheck, and Heat (from the brief's not-in-this-round list).

## Suggested next step
The turn structure and the pools answer the round's question: planning now feels like planning, and the fun test passed for the first time since Round 2. Jamie's missing piece has moved from "effective planning" to **"more to plan around"**. The obvious gaps are a bot that responds to what you do (being shot, hearing you) and the Heat pool the brief held back. I'd make the next round about one of those, not both. My pick is a reactive bot, because it turns Signal and the noise ring into real decisions. Fix the courtyard spawn bug in passing, since it wastes playtests.
