# Signal Lance: Round 23 status report — "Who you'll anger"

**Date:** 2026-10-07
**Build:** `signal-lance/` TS project (~9,700 lines of src), `dist/signal-lance.html`, BUILD `r23-s5`
**Branch:** `main` (repo `FluKanuck/Signal-Lance`), commits ba08276 (s1), 2684046 (s2), 53a261e (s3), 08dd7bd (s4), 4e530de (s5 + wrap), plus this report
**Live artifact:** https://claude.ai/artifact/NRNixsKxVrcMGNeYp6bB2o · testers: https://flukanuck.github.io/Signal-Lance/

## Purpose
On a city map of faction districts, does picking the next contract become a trade between pay and who you'll anger, so that different ways of picking (top pay, loyal, deniable, cautious, aggressive) end up in clearly different places? This was slice row 8, the last component. Testing was headless by Jamie's call: runner batches stood in for play. No fun test (slice).

## Current status
- **The choice is real.** Over 20 companies × 10 contracts, the four runner personalities end in clearly different places, and no style wins on every measure:
  - Cautious survives longest with the fewest KIA, but stays poor.
  - Mercenary ends richest but completes only 41%.
  - Loyal gets free intel on 60% of its jobs and pays with 42% of them on hated ground.
  - Aggressive folds most.
- **Standing behaves after tuning.** Before tuning it barely bit: only 2–6 of 20 companies ended hated by anyone, because a −25 hit faded in five contracts. After Jamie's faction relations and the stickier standing, 7–12 of 20 companies end hated by someone, and 15–42% of jobs land on hated ground. No spiral: nobody is hated by everyone.
- **What hated ground costs** is mostly danger (a step up, toward HIGH), not the waking field. Softening the field (tuning 3) made no difference and was reverted.
- Closing check: not formally scored. The brief's DONE asked for no tap check (headless round, no fun test).
- **Biggest thing still missing:** "Smarter bot tactics".
- The project docs tool wasn't connected this session. The brief and docs were read from the repo's `claude/` folder, and this report is saved there.

## What was built
1. **The city (`sim/city.ts`, r23-s1).**
   - One seeded node map per company: 6–8 districts, 2–3 links each.
   - Three placeholder factions, each holding 2–3 districts, with a base danger: Corporate HIGH, Foundry MEDIUM, Syndicate LOW.
   - Fuel to a job = links jumped (1 a link). Jobs are never in the ship's own district, so a job costs 1–4 fuel, as before.
   - The holder of the ship's district sets the market's fuel price.
2. **Jobs in districts.** Each job sits in the target's district.
   - FACTION job: fee ×1.2; on completion the employer gets +20 and the target −25.
   - BROKER job: fee ×0.8; only the target moves (−10).
   - Offers are still never all one danger.
3. **Standing.**
   - One meter per faction, −100..+100, with HATED / NEUTRAL / LIKED bands.
   - It drifts toward 0 every contract and moves only on a completed job.
   - HATED: danger +1 step, +25% of the field awake at the drop (on top of the scan's share), fuel ×1.5 in their districts.
   - LIKED: their own jobs pay ×1.25; jobs against their enemies open the scan with radar band 1 on the whole map, free and with no risk; fuel ×0.75.
4. **The city screen** replaces the offers list on one landscape screen:
   - standing bars on top, the map on the left (tap a district), the job on the right
   - "Complete it" lists every faction the job moves
   - the faction relations line under the map
   - the scan screen says when a hated faction wakes more of the field, or a liked one has shared intel
5. **Logs and save.**
   - WHAT IT COST gets standing lines at a contract's end ("Foundry −25 → −25: you hit them ← T6").
   - `[CITY]` log lines: jumps, the job picked, standing changes, fuel bought.
   - The company save carries the city (CO_VERSION 5).
6. **Test bed:** "Hated" and "Liked". It's the same job against the Foundry, first while the Foundry hates you, then posted by a Corporate side that likes you. TAKE IT opens that job's first scan (nothing is played).
7. **Runner personalities (`sim/personality.ts`, r23-s2).** Each keeps one set of weights across the hunt and the campaign:
   - Cautious: creeps, scans 2 minutes of radar on the full map, always goes back for a CRITICAL operator and heads home once carrying one; takes the lowest danger, prefers broker jobs, keeps 3 fuel spare.
   - Aggressive: sprints, hunts 10 more rounds past a Bounty quota; takes the highest danger and faction jobs.
   - Loyal: works for the faction behind its first faction job; otherwise takes a job that doesn't hit that faction.
   - Mercenary: the top fee every time.
   - Every style buys repairs and parts between contracts. Every style can go back for a CRITICAL operator (#101): cautious always, the others on a 50% roll per hunt.
8. **Runner:** `--personality cautious|aggressive|loyal|mercenary|all`.
   - `all` runs the same seeds once per style and prints them side by side: folds and why, played / complete, KIA, credits and fuel over time, end standing, jobs on hated ground, liked intel, top fee turned down. Plus one sample company history each.
   - `--pick low` = cautious's pick. No `--personality` = the R22 bot exactly.
9. **Vitest:** 28 new tests (city 21, personalities 7), 417 in all.

## Runner numbers
`--company 10 --companies 20 --personality all`, seeds 1–20. Columns: cautious / aggressive / loyal / mercenary.

| measure | r23-s2 (before tuning) | r23-s4 (after tuning) |
|---|---|---|
| folded | 11 / 13 / 11 / 16 | 11 / 14 / 13 / 14 |
| played (complete) | 123 (69) / 109 (50) / 138 (76) / 100 (39) | 118 (64) / 83 (34) / 114 (48) / 97 (40) |
| KIA | 94 / 121 / 143 / 134 | 90 / 112 / 142 / 134 |
| avg end credits | 255 / 517 / 650 / 321 | 181 / 461 / 446 / 562 |
| LOW / MED / HIGH played | 64-59-0 / 1-34-74 / 27-42-69 / 8-31-61 | 49-69-0 / 0-20-63 / 12-25-77 / 6-27-64 |
| hated by someone at the end (of 20) | 4 / 2 / 6 / 2 | 11 / 7 / 12 / 9 |
| liked by someone at the end (of 20) | 2 / 0 / 3 / 0 | 8 / 7 / 11 / 6 |
| jobs on hated ground | 7 / 8 / 8 / 5% | 19 / 41 / 42 / 24% |
| jobs with liked intel | 1 / 0 / 12 / 0% | 25 / 49 / 60 / 32% |
| top fee turned down | 93 / 9 / 38 / 0% | 92 / 11 / 18 / 0% |

Checkpoint A sanity batch (highest-fee bot, `--company 10 --companies 20`):
- r22-s5: 10 folded, 123 played (58 complete), 170 KIA, 478 cr.
- r23-s1: 14 folded, 102 played (42 complete), 132 KIA, 325 cr. Corporate's HIGH jobs ×1.2 top the fee list, so the fee bot takes more HIGH: 64 of 102 contracts.

Carrying CRITICAL operators out:
- In "Carry them out" the hook works: 9 of 10 carried, against 0 of 10 for the R22 bot.
- In company runs most CRITICALs come in wipes, with nobody left to carry: cautious carried out 53 of 150, mercenary 32 of 172; the R22 bot 31 of 174.

**Sample histories** (seed 1, r23-s4; Corporate & Foundry ALLIES, both RIVALS of the Syndicate)
- **Loyal** (patron Syndicate):
  - C1 for Syndicate vs Corporate (HIGH, 384 cr) COMPLETE: Corporate −35, Foundry −22, Syndicate +33.
  - C2 for Syndicate vs Foundry (Syndicate intel) COMPLETE: Corporate −55, Foundry −55, Syndicate +64. 1,304 cr.
  - C3–C5 for Syndicate on hated Corporate and Foundry ground (720–960 cr, with intel): all FAILED, 7 KIA. Folds at C5 (every ExoS lost).
- **Aggressive** (r23-s3):
  - It works for whoever posts HIGH jobs, so Corporate slides −9 → −26 → −46 over C3–C8 while the Syndicate climbs to +35.
  - C9: a HIGH job on hated Corporate ground with Syndicate intel, FAILED (−360 cr).
  - C10 completes. Ends at 1,136 cr with Corporate −57 HATED.
- **Cautious:**
  - C1 passes on 384 cr for a MEDIUM broker job: FAILED.
  - C2 LOW for Foundry vs Syndicate, COMPLETE: Syndicate −35 HATED, and Corporate +23 (the Foundry's ally).
  - C3 passes on 720 cr for a MEDIUM broker job: FAILED with 4 KIA. Folds at C3.

## Changes (from the TWEAK LOG)
| # | Symptom | Change | Result |
|---|---|---|---|
| H1 | Standing barely bites: hated by anyone at the end 2–6 of 20, 5–8% of jobs on hated ground; a −25 hit fades in 5 contracts | `STANDING_DRIFT` 5 → 2, `STANDING_HATED` −40 → −30, `STANDING_LIKED` 40 → 30 (proposed). Jamie added: NEW `CITY_RELATIONS` (each faction pair rolls RIVALS 0.5 / NEUTRAL 0.3 / ALLIES 0.2 per city) and `STANDING_SPILL` 0.5 ("becoming friendly with one faction means their enemies dislike you as well") (r23-s3) | Hated at the end 2–6 → 6–12, hated ground 5–8 → 15–30%, liked intel 0–12 → 20–48%. Loyal fell hardest (folds 11 → 14, end cr 650 → 195) |
| H2 | Loyal's patron rarely posts work; the employer was random, so allies hired you against each other | A faction job is posted by a rival of the target if it has one, else by a faction that isn't its ally; nobody = a broker job. No TUNE change (r23-s4) | Loyal end cr 195 → 446, folds 14 → 13; Mercenary end cr 309 → 562; Loyal / Aggressive ~40% of jobs on hated ground |
| H3 | ~40% of Loyal / Aggressive jobs on hated ground | Tried `STANDING_HATED_ALERT` 0.25 → 0.15 | No help (Aggressive end cr 461 → 234, folds 14 → 15). Jamie: "Revert to 0.25". Reverted (r23-s5) |

Side effect: the plain runner (no `--personality`) is unchanged by checkpoint B (same numbers as r23-s1).

## Parked (not built)
1. **Smarter bot tactics (#42),** Jamie's biggest missing piece:
   - The scripted lance still can't use scan intel. It ignores SHIP contacts, so liked intel is worth nothing in the numbers.
   - It never buys modules or items.
   - It drops every suit, every hunt.
2. **What hated ground really costs** is its danger step: with ~40% of jobs there, HIGH fields fold companies. Candidate levers: `STANDING_HATED_DANGER`, `CITY_FACTION_PAY`, or a mixed cautious/greedy pick.
3. **From the brief:**
   - hunter teams, closed airspace and intercept rolls (the full notoriety set)
   - faction-themed fields and district themes (#60)
   - recruits and markets by district
   - a moving front
   - #86 (a painted ship raises heat) and #84 (side objectives found on the scan)
   - the LLM QA panel (#106)
4. **The `/sl-balance` mod** reads per-contract lines only; companies and personalities aren't wired into it (not a small change).
5. **Later:**
   - the map can draw a crossing link (about 1 city in 150)
   - first-name clashes in the status line ("Bram AIM1, Bram EARS1")
   - relations could also steer which faction holds which districts
   - a style that mixes rules (fee unless HATED ground)

## Suggested next step
Row 8 is in and the trade is real: who you'll anger now has a price you can read off the relations line, and the runner personalities end in different places. All eight slice components are built. Two things limit how far the headless numbers can be trusted:
- The scripted lance can't use intel, so liked intel never shows in the numbers.
- Its tactics are thin, so HIGH danger dominates every result.

Jamie names smarter bot tactics as the biggest gap. A bot round (#42: read SHIP contacts, use the scan, buy modules sensibly) would make the economy and faction numbers trustworthy. After that, the LLM QA panel (#106), then the whole-slice fun test with the tester pool.
