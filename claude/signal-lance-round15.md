# Signal Lance: Round 15 status report — "Pick your fights"

**Date:** 2026-10-06
**Build:** `signal-lance/` TS project (~3,770 lines of src), `dist/signal-lance.html`, BUILD `r15-s3`
**Branch:** `main` (repo `FluKanuck/Signal-Lance`), commits 140f072 (step 1: Bounty), 6b455ef (step 2: Retrieve), 46b4ccd (step 3: Escort), 2a7c2dd (stray scratch file removed), 2e67795 (step 3 debrief), and the wrap commit
**Live artifact:** https://claude.ai/artifact/NRNixsKxVrcMGNeYp6bB2o · testers: https://flukanuck.github.io/Signal-Lance/ (serving r15-s3)

## Purpose
When the mission is more than "stand on the uplink", does reading the field change which fights you take, how you take them and when you leave? R14 showed the read was legible but decided nothing, because every uplink had to be fought whatever guarded it. Jamie named the missing "and" as "pick my fights and choose how to fight it". This round is the first component of the whole-loop slice: Missions. There was no fun test.

## Current status
- **Yes for the three new types, unsure for Uplink.** Per-type "read and connect": Uplink *not sure*; Bounty, Retrieve and Escort *the read changed my plan*.
- **Bounty:** "It felt fine". The prices "changed when I left". Leaving at quota "just felt like a good time to do so", so it was calm, not a gamble. The greed choice at quota isn't biting yet.
- **Retrieve:** "felt good, enemy aimed for the mech with the cargo". Weakest: "It felt fine". Reading the guards: "really only one sensible route, and the guards there were unavoidable, but if I had the chance, I would have changed route". The single fixed map limits the "how" and the "route" choices.
- **Escort:** "It felt fine", and "its own thing" next to Uplink. The fork call came from "a mix of all scan results, as well as gut feeling, looking forward to the final route, trying to keep options open". This is the clearest "read → plan" result so far.
- **Test bed:** "useful" (asked after Step 1; open since R14, now answered).
- Scenario tap answers: not reported (no log sent this round).
- Fun test: not run this round, per the brief; it runs once on the whole slice.
- Biggest thing still missing: "Bigger loop" (campaign, operators, the ship: a reason the jobs connect).

## What was built
1. **Shared:**
   - **Mission state:** one `G.mission` per hunt, in `src/sim/mission.ts`. The uplink keeps its own code paths.
   - **Job types:** each briefed job rolls a type (seeded, evenly) from `MISSION_TYPES`, and the job card shows the type and goal in gold above the INTEL.
   - **Map anchors:** `MAP_ANCHORS` in `world.ts` holds uplinks, cargo and the escort route graph (waypoints, legs, junctions), ready for block maps.
   - **Runner:** `--mission <TYPE>`, with the contract report split by type.
   - **End-of-hunt questions:** these now carry the per-type "read and connect" check.
2. **Bounty (step 1):**
   - Each of the 9 variants has a price, from scout 25 to gun turret 90.
   - A kill pays its true variant's price, ID or not.
   - Reaching `BOUNTY_QUOTA` makes the hunt a win, and anything above it is a bonus. Extracting under quota is no win, no loss, and you keep the pay.
   - The field gets +2 units. The HUD shows earned / quota, and each kill pops its price.
   - Scenarios: Price list, One more?.
3. **Retrieve (step 2):**
   - The cargo sits on the guarded site. PICK UP (2 AP) alerts the whole field and turns the pack logic on for that hunt, aimed at the carrier first.
   - The carrier can't sprint. HAND OFF (1 AP) passes the cargo to an adjacent mech.
   - Carrier destroyed = FAIL (hunt failed, contract goes on). Carrier out the right edge = WIN.
   - Scenarios: Grab and go, Hot potato.
4. **Escort (step 3):**
   - An unarmed transport (5 hits, a patrol's radio EMIT and walking sound) takes a turn in the initiative order and walks route legs 8 tiles a round.
   - It holds at each of 2 forks until you tap NORTH or SOUTH on the map.
   - The field senses, hunts and shoots it through `friends()`. The field is placed near the legs.
   - Transport destroyed = FAIL. Transport out = WIN, plus a bonus for its remaining hits. Clearing the field doesn't end an Escort.
   - Scenarios: Fork, Shadow.
5. Tests went from 69 to 116.

**Runner (scripted lance; 20 contracts each, `--mission` forced):**

| Type | Hunts | Win | Avg pay | Avg rounds | Notes |
|---|---|---|---|---|---|
| Uplink (mixed run) | 13 | 62% | 95 cr | 8.8 | — |
| Bounty | 35 | 23% | 91 cr | 10.7 | quota met 31%; gun turret killed 0–20% when present |
| Retrieve | 46 | 41% | 67 cr | 10.9 | picked up 38, cargo lost 10, pickup → end 3.7 rounds |
| Escort | 60 | 68% | 125 cr | 11.0 | transport shot at in 85% of hunts, destroyed 18; picks almost always NORTH |

`--check` fails on one flag: the R13 sound share (uplink hunts at 50–58%). It sits on the line even in uplink-only play and is inherited, not caused by this round. Jamie chose "ship, flags noted" at Step 1. The brief's per-variant flag ("gun never killed") fired at Step 1 and comes and goes with the sample.

## Changes (from the TWEAK LOG)
| # | Symptom | Change | Result |
|---|---|---|---|
| 1 | Build: the scripted lance met a quota of 150 in only 13–25% of Bounty hunts | `BOUNTY_QUOTA` 150 → 120 | Not rated (Bounty "felt fine") |
| 2 | Build: the escort transport at 8 hits let the scripted lance win 93% | `ESCORT_HITS` 8 → 5 (68%) | Not rated (Escort "felt fine") |
| 3 | Step 1 debrief: leaving at quota was "just a good time", not a gamble | No change (one run; worth watching) | — |
| 4 | Step 2 debrief: "only one sensible route … I would have changed route" | No change (it's the map, not a knob); taken as the Step 3 check-in answer | — |
| 5 | Step 3 debrief: Escort "its own thing"; fork read from scans, gut and the route ahead | No change | — |

## Parked (not built)
1. **Block maps (parked #33):** Retrieve showed one sensible route on the fixed map. This is the brief's Step 3 check-in question, answered "yes, routes feel solved" for Retrieve. The anchors table is ready for them.
2. **Making push-your-luck bite at quota:** for example, bounties above quota pay more, or the field stiffens over time. Only one data point so far.
3. **Choosing or refitting the loadout after seeing the job type.** Loadouts still lock before jobs are briefed.
4. **A smarter scripted lance:** one that reads Escort legs (it almost always picks NORTH) and pushes past quota, so the runner can measure the read and the greed choice.
5. **The extraction rule:** a mech reaching the edge before the carrier or transport pulls the lance out. The HUD warns about it in Escort; maybe it should only count when the objective is also out.
6. The inherited R13 sound-share flag needs a decision: raise its threshold, or revisit sound.
7. Small view issue: an Escort route button can sit under the HUD text near the top of the map.

## Suggested next step
Missions read and connect: the three new types all got "the read changed my plan", and Escort and Bounty each have their own decision point (the fork, the exit). Two signals point at what to build next. The fixed single map caps route choice ("I would have changed route"). And Jamie's biggest missing piece is the **bigger loop**: a reason the jobs connect, through campaign, operators and the ship. The design lead should weigh the next slice component against those two. A thin campaign-map or operators pass answers "bigger loop". Block maps are a cheap structural follow-on that serves Retrieve and Escort, and the anchors table is ready for them. The Uplink "not sure" suggests Uplink is now the plain baseline job, which is fine for a slice.
