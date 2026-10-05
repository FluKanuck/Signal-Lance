# Signal Lance: Round 11 status report — "The contract"

**Date:** 2026-10-04
**Build:** `signal-lance/` TS project (~2,270 lines of src), `dist/signal-lance.html`, BUILD `r11-s2`
**Branch:** `claude/signal-lance` (repo `FluKanuck/Prototype`), commits f47eb82 (step 1), 15e3ac1 (tester splash), 3b716bd (tester fix), 69da048 (step 2), 9eb9624 (refit costs), 3428291 (wrap)
**Live artifact:** https://claude.ai/artifact/NRNixsKxVrcMGNeYp6bB2o · testers: https://flukanuck.github.io/Prototype/

## Purpose
Does a 3-hunt contract, where damage, ammo, shells and lost mechs carry over and Jamie picks 1 of 2 briefed jobs each time, make each hunt feel like it matters? R10 runs went "samey" on "nothing at stake" / "no bigger picture".

## Current status
- **Carry-over works, but late.** Contract 1 (Mixed > Sweep > Fortified, COMPLETE 3/3, lost A in H3): H1 "Flat", H2 "Fine", H3 "Tense". H3 note: "Felt more stress due to low starting health. Definitely played slower and more careful." Tap answers: H1/H2 "past hunts changed play: No", H3 "Yes".
- **Hunt 1 was flat** because there was "nothing to lose yet". Step 2 (payout + refit) was built to fix that, and was rated **"helped"** after contract 2. Weakest moment then: "it felt fine".
- **Spending felt "too little to matter"**: a ~140 cr hunt bought every allowed refit. Costs were raised (below) at wrap; **untested**.
- **Job pick "felt fine".** Log answers: "Random" twice, "Suits my lance" once (H3, damaged lance).
- Hunts mattered **"a bit"** more than an R10 run.
- Fun test: **1/5** ("one more go"). 2 contracts (6 hunts), short of the ~4–5 the brief asked for.
- **Biggest thing still missing: "More tactical depth".**
- Tester Big Joe (iPhone 17): loadout module text was cut off. Fixed. No tester gameplay logs received yet.

## What was built
1. **Contract** (`sim/contract.ts`): `CONTRACT_HUNTS` 3, win `CONTRACT_WINS_NEEDED` 2; LOSS fails at once; BAIL is a forfeit. Loadouts lock at START CONTRACT. In memory only.
2. **Carry-over** per mech: hits, gun rounds, mortar shells, destroyed (stays lost). AP/Energy/Signal/ECM/position reset.
3. **Job pick** before every hunt: 2 jobs with different compositions, own seeds, own contract RNG; full INTEL plus lance state (damage read incl. new SCRATCHED, rounds, shells, LOST). `FIELD_PLAYTEST_POOL` → [] (full pool).
4. **Contract result screen**: all hunts side by side; log lines tagged `C1 H2/3 · … · A BLOODIED, B LOST · +140 cr`; contract summary line; DBG shows contract + hunt seed.
5. **Step 2, payout + refit**: `PAY_WIN` 100, `PAY_KILL` 20, BAIL 0. Refit on the job pick (hunts 2–3): repair, +10 rounds, +1 shell, rebuild (200). **Jamie's override:** `REFIT_CAP` 0.8, so nothing refits above 80% of what the mech started its previous hunt with; a rebuilt mech also returns at the cap. The lance never fully recovers.
6. **Tester chore**: splash with the round's question and what's new (CONTINUE / GAMEPLAY BASICS with layout sketch and legend), tester name, 4 end-of-hunt tap questions into the log, SEND LOG via share sheet. `src/view/brief.ts` must be updated every round (now in the code agent brief).
7. **Runner** `--contracts N`, greedy spender.

**Runner, 20 contracts each (scripted lance always takes job 1; crude player, read as "works", not balance):**
| Build | Complete / failed | Hunts reached H1/H2/H3 | Credits earned / spent (avg) | Rebuilds | Stalls |
|---|---|---|---|---|---|
| Step 1 | 1 / 19 | 8 / 4 / 8 | – | – | none |
| Step 2 (costs 15/10/15) | 3 / 17 | 8 / 5 / 7 | 185 / 68 | 4 | none |
| Wrap (costs 40/25/30) | 2 / 18 | – | 182 / 89 | 2 | none |
Entering H2: 16/24 mechs damaged or lost; entering H3: 12/14. Carry-over is always in play.

## Changes (from the TWEAK LOG)
| # | Symptom | Change | Result |
|---|---|---|---|
| 1 | Hunt 1 flat: "nothing to lose yet" | Step 2 payout + refit; Jamie's `REFIT_CAP` 0.8 | Helped |
| 2 | Spending "too little to matter" | `COST_REPAIR` 15→40, `COST_ROUNDS` 10→25, `COST_SHELL` 15→30 | Untested (wrapped) |
| chore | Testers need context without Jamie | Splash, basics, tap questions, SEND LOG | Working |
| fix | Module text cut off on iPhone | Descriptions wrap | Fixed |

## Parked (not built)
Parked to the roadmap this round: #37 location-based damage (BattleTech-style parts, salvage, aimed shots); #38 multi-path contracts (side missions weaken the final objective, bounties); #39 pre-mission SIGINT scans + recon sniper team for HUMINT; #40 ex-military company, FRAGO-style op brief; #14 + intel can be wrong or out of date; #41 lidar-dot presentation with grey fog of war; #42 collateral damage lowers HUMINT reliability; #43 rubble from damaged buildings.
Build "later" notes: a rebuild (200) is hard to reach before H3; the cap ratchets down each hunt (6 → 4 → 3 hits); reloading drops the contract; BAIL is only a forfeit.

## Suggested next step
The contract added stakes, but late: hunt 3 was tense, hunt 1 flat until payout. The fun test only reached 1/5, and Jamie's own answer for what's missing has moved from stakes to **"More tactical depth"**. That points back at the hunt itself, not more meta. Keep the contract, cap and new costs as the frame, and confirm the costs in one or two contracts. Then pick a Gate 1 depth slice for R12, ahead of pilots. The strongest parked candidates are the pre-mission SIGINT/HUMINT layer (#39 with #14: buying intel that can be wrong), location-based damage (#37) or enemy tiers (#3). Ask Jamie what "tactical depth" means to him before choosing.
