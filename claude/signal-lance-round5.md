# Signal Lance: Round 5 status report — "Get the job done"

**Date:** 2026-09-30
**Build:** `signal-lance.html` (1,752 lines)
**Branch:** `claude/signal-lance` (repo `FluKanuck/Prototype`), commits `4494af7` (build), `f0f37db` (parked idea), `3c485b4`, `332cff0` (leash), `96b818d` (wrap)
**Live artifact:** https://claude.ai/artifact/NRNixsKxVrcMGNeYp6bB2o

## Purpose
Does a rolled objective you have to reach and work loudly turn the opening from a fixed routine into a new plan each run? Round 4's fights felt "samey" because the opening was solved: walk to the middle, wait for a blip, ambush.

## Current status
- **The objective works mechanically, but it doesn't change the fight.** Once the bot was leashed to the uplink, "the bot stayed tethered, but at this scale of units on the field it was ultimately just a who gets killed first rather than fight for the objective." Jamie's diagnosis: **1v1 decides it all**.
- Run 1 (before the leash): an Aggressive bot "ran straight past the obj and engaged me". The objective felt irrelevant, and he won by kill at uplink 0/3.
- Jamie wrapped after 2 runs: "Until we have more features in game I don't think tuning will help." He turned down an in-scope tweak (UPLINK_TURNS 3 → 2) for that reason.
- Fun test: **not formally re-scored.** Jamie: "no change from last time" (Round 4 was 3/5) and "this addition isn't really functional till more variables are on the board."
- Biggest thing still missing: **"more variables on the board."**
- Debrief focus answers: (1) the route did change toward the rolled point, but the fight around it was the same duel. (2) UPLINK was never really tested as a gamble, because the duel settled things first.

## What was built
1. **Rolled uplink point:** 6 hand-picked open-street candidates, at least 10 tiles from spawn, named in the INTEL line ("Uplink at west plaza").
2. **Map marker:** a gold ring showing where UPLINK works (1.5 tiles), a diamond with a progress label, and a gold edge arrow with the distance when it's off-screen. The HUD shows ◆◇◇ pips, the point's name, and the distance or IN RANGE.
3. **UPLINK action:** 2 AP, +25 Signal, once per turn. Progress persists. 3 completed = WIN UPLINK. Blocked reasons: RANGE / DONE / AP.
4. **Win types:** the result screen and log read WIN UPLINK or WIN KILL, and the log adds uplink progress and the point's name.
5. **Bot knows the point:** Patient guards a covered post (LOS to the point) and leaves only for a firm contact. Aggressive's first leg is the point. Cautious patrols near it.
6. **Spawn/patrol bug fixed:** a flood fill from the player's spawn gives reachable tiles only. The walled courtyard (top middle) and a second walled pocket right of centre are excluded for spawns, patrols and guard posts. 18 simulated bot games showed no stalls.
7. **DBG:** a dashed magenta line to the bot's goal, labelled with its distance from the uplink.

## Changes (from the TWEAK LOG)
| # | Symptom | Change | Result |
|---|---|---|---|
| step 1 | Round 4 fights "samey": the opening was solved | Rolled uplink objective + bot relationship by temperament + reachability fix | Played |
| run 1 | "The bot ran straight past the obj and engaged me": the objective felt irrelevant | Spec override: new `AGGR_LEASH` 12. Aggressive only chases within 12 tiles of the uplink, otherwise returns there | (superseded same run) |
| run 1b | Jamie: the leash is OK "but should vary based on bot behaviour type" | `AGGR_LEASH` → per-temperament `TEMPERS.LEASH`: Aggressive 12, Cautious 9, Patient 6 (returns to its post) | Helped: "the bot stayed tethered" |
| run 2 | "Just a who gets killed first": 1v1 decides it all | None. `UPLINK_TURNS` 3 → 2 proposed and declined: tuning won't help until more features are in | — |

## Parked (not built)
From Jamie this round (for the design lead to place):
1. City map with distinct zones.
2. Areas that hide Signal, and LoS blockers.
3. IR emitters and modules.
4. Unit types: infantry, tanks.
5. Several enemies and friendlies at once, with initiative order.
6. More victory conditions.
7. OSINT dashboard for the campaign map and contracts.

Build notes and carry-overs:
8. The Patient bot now drops chases at 6 tiles and may feel too passive. It hasn't been tested in play.
9. A Patient bot that spawns far away may reach its post late, which would make UPLINK a free win. Not seen in play.
10. The leash judges a bare bearing by the point it would investigate, so the bot can chase slightly past its leash.
11. Carried over from Round 4: reactive bot (being shot / hearing you), Heat pool, every legal shot hits, passive bearings only on the bot's turn, aimed radar pulse, "you'll stop here" marker, RWR, unreliable INTEL, enemy ECM ghosts, temperament tells, weighted rolls.

## Suggested next step
The replay-pull problem has moved again. The opening now changes run to run, but the fight at the objective is still a 1v1 shot trade. Jamie is clear that more tuning of this toy won't help, and what's missing is "more variables on the board." The cheapest test of that is probably **more than one unit a side** (for example, 2 player mechs vs 2 bots, or a lance vs one bot plus a static turret), using the existing I-go-you-go/AP rules with simple initiative. That fits the north star (plan, deploy, watch it succeed or fall apart) and the hive-city lance-sim direction. It's a bigger step than any round so far, though, so it may need splitting: step 1 is two player units against the current bot; step 2 adds a second enemy. The other parked items (zones, Signal-hiding areas, unit types) are content and belong behind it. The Replay pull strand has now had four rounds, so it's worth a clear reframe or move-on call.
