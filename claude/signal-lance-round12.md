# Signal Lance: Round 12 status report — "Pick your shot"

**Date:** 2026-10-04
**Build:** `signal-lance/` TS project (~2,460 lines of src), `dist/signal-lance.html`, BUILD `r12-s1`
**Branch:** `claude/signal-lance` (repo `FluKanuck/Prototype`), commits 1afcc73 (step 1), 17a2d79 (cover tune)
**Live artifact:** https://claude.ai/artifact/NRNixsKxVrcMGNeYp6bB2o · testers: https://flukanuck.github.io/Prototype/

## Purpose
Do to-hit rolls (from the target's Signal, range, how far it last moved, and cover) plus hits on specific parts make each shot a choice of what to aim at and whether to take it? R11's fun test was 1/5, and Jamie's missing piece was "more tactical depth": "a hit is just a hit."

## Current status
- **Step 1 only.** Jamie wrapped after 1 contract (3 hunts), so step 2 (aimed shots, per-part repair) was never started. The brief's gate (odds read as fair, shots feel like choices) only got a partial answer.
- **The % was hard to trust.** Weakest moment: "didn't know why the % was what it was". In his words: "Stationary turret. In the open, hadn't moved 48% chance. Didn't make sense to me." The cause was the cover rule: turrets and emplacements sit against buildings, so walls beside them counted as cover. Tuned at wrap; **untested**.
- **Tap answers by hunt:**
  - Odds: H1 "Didn't notice", H2 "Too swingy", H3 "Fair".
  - Held fire or moved for better odds: H1 and H3 "Once or twice", H2 "No, fired anyway".
- **Parts landed.** Broken parts "Changed the fight" in H2 and H3. In H2 (Sweep), A lost its sensors and weapon, and B lost sensors, legs and weapon before it was destroyed. A started H3 with no weapon and no sensors.
- **Fights felt different.** "Did a fight play out differently from find, fix, shoot?" got **Yes** on all 3 hunts.
- **Hit rates:** the lance hit 2/3, then 2/6, then 1/1. The field hit 10 of 18 in H2.
- **The contract:** C2 COMPLETE 3/3 (Turret nest > Sweep > Turret nest). B was lost in H2 and rebuilt for H3. Credits: 380 earned, 240 spent.
- **Fun test: 1/5** ("A loss made me want to fix my plan").
- **Biggest thing still missing:** "Not sure yet". His unprompted note at wrap: "AI needs a serious pass as well."

## What was built
1. **To-hit roll** (`sim/combat.ts`, both sides, seeded):
   - The lock rule still decides whether FIRE is allowed. Once it is, the shot rolls against HIT_BASE 75, plus up to 15 for the target's effective Signal.
   - Penalties: −3 per tile of range beyond 4; −4 per tile the target moved in its last activation (up to −24); −25 for cover.
   - The chance is clamped between 10% and 95%.
   - A rolled hit lands on the unit itself, so the shown % is the real chance. A miss flies wide but still costs the AP and the round and still shows the muzzle flash.
2. **Odds on screen:** "FIRE 62%" on the button, a yellow ODDS breakdown line whenever FIRE is allowed, and the last shot by each side in the HUD ("patrol → A: HIT WPN (88%)"). DBG shows the full breakdown.
3. **Hit locations:** core, legs, weapon and sensors (statics have no legs).
   - A hit picks a part by weight: core 40, legs 25, weapon 20, sensors 15. The existing hit pool is split across the parts, so totals are unchanged. A mech has 3 core hits and 1 hit on each other part, so any hit on legs, weapon or sensors breaks that part.
   - Losing sensors means no radar, ECM or ghost, and half eyes range. Losing the weapon blocks the gun ("WPN"). Losing legs leaves CREEP only ("LEGS"). Losing the core destroys the unit.
   - A mortar splash rolls a part.
4. **Per-part damage read:** for the lance in the HUD; for enemies under their label while seen; also on the result and job-pick screens.
5. **Contract carry-over per part.** Refit REPAIR fixes the worst part first, still under REFIT_CAP.
6. **Log line:** adds `shots N hit N (N%)` and parts lost. The tester splash and its 4 end-of-hunt questions were rewritten for the round.
7. **Runner:** hit and part report. The scripted mech now creeps when its legs are gone; on the first run it stood still, causing 13 false stalls.

**Runner, 20 contracts (scripted lance, read as "works", not balance):**
| Build | Hit overall | Cover vs open | Moved / still / static target | Range ≤4 / 5–8 / 9–12 | Complete / failed | Hunt length | Stalls |
|---|---|---|---|---|---|---|---|
| R11 baseline | – | – | – | – | 2 / 18 | 7.7 rounds | none |
| Step 1 | 48% | 28% / 59% | 39% / 71% / 64% | 57% / 47% / 23% | 7 / 13 | 9.3 rounds | none |
| Cover tune | 59% | 25% / 63% | 53% / 75% / 76% | 66% / 58% / 37% | 4 / 16 | 9.0 rounds | none |

**Parts destroyed (step 1 runner):**
- Lance mechs: core 35, legs 29, weapon 25, sensors 19.
- Patrols: core 61, weapon 16, legs 15, sensors 7.
- Turrets and emplacements mostly lost their core.

Every factor in the % applied. No flags.

## Changes (from the TWEAK LOG)
| # | Symptom | Change | Result |
|---|---|---|---|
| 1 | A stationary turret in the open showed 48%; walls beside statics counted as cover (runner: 26/73 shots at statics) | `COVER_RANGE` 1.5 → 1.0, `COVER_GRAZE` 0.5 → 0.3 (runner: 4/58 shots at statics in cover) | Untested (wrapped) |

## Parked (not built)
1. **Enemy AI pass (Jamie: "needs a serious pass").** Out of scope this round (no reacting or repositioning enemies). His two cases:
   - His mech was hurt and backed into a dead end by the uplink with 3 patrols alive. They all saw it, and none followed up to finish it.
   - A patrol in the road was shot and just kept walking, "completely oblivious". The log shows that same hit destroyed its weapon (`B → patrol: HIT WPN (60%)`), so it *couldn't* return fire. But it showed no other reaction either: it didn't take cover, back off or call for help.
2. **Step 2, not started:** aimed shots (`HIT_AIMED` −20; legs on a patrol, weapon on a turret) and per-part repair at refit (`COST_PART_RESTORE` 60).
3. **Build "later" ideas:**
   - Tap-to-show odds breakdown (currently always on).
   - Give legs and weapon 2 hits, so a single hit doesn't always break them.
   - Show which wall is giving cover on the map.
   - A unit that loses its weapon could get a visible "disarmed" state.

## Suggested next step
The roll and parts are in, and they show promise. Jamie said parts "changed the fight", and every hunt "played out differently from find, fix, shoot". But the % wasn't trusted on its first contract, and the cover fix hasn't been played. The fun test stayed at 1/5, and Jamie's own unprompted complaint has moved to the enemy: it doesn't press an advantage or react to being hit. A short R13 could:
1. Confirm the cover tune in one contract.
2. Then pick between step 2 (aimed shots) and a minimal enemy-reaction pass: follow up on a damaged or cornered mech, and respond when shot.

The AI complaint is the louder signal. Jamie's "not sure yet" on what's missing suggests talking it through before choosing.
