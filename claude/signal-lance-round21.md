# Signal Lance: Round 21 status report — "The company"

**Date:** 2026-10-07
**Build:** `signal-lance/` TS project, `dist/signal-lance.html`, BUILD `r21-s5`
**Branch:** `main` (repo `FluKanuck/Signal-Lance`), commits 3c77e64 (s1), 35bc37c (s2), 3f26943 (s3 + s4 together), the wrap build (s5), plus 93cacc2 (parked idea), 1ad6680 (fix list), 298afbc (debrief notes) and this report
**Testers:** https://flukanuck.github.io/Signal-Lance/
**In-round fix list:** `claude/signal-lance-r21-revision-list.md` (1 item, fixed in the wrap build)

## Purpose
Does owning a company (people who can be hurt and grow, a roster to choose from, money and fuel that run out, a ship you fit) make you care what comes back from a drop, and plan the next contract around it? Slice rows 5 (Operators) and 6 (After the drop), with part of row 8 (contracts on offer, fuel, the ship) pulled forward, with no map. No fun test; the check was "does it read and connect?".

## Current status
- **Checkpoint reached: 4 of 4.** Checkpoints 3 and 4 were built together at Jamie's request ("do both checkpoints now, I'll do a thorough test afterwards").
- **Read-and-connect check: "Changed my plan".**
- **Carry them out:** "Yes, went back" (it was worth going back for the CRITICAL operator).
- **Thin books:** played. Jamie expected to play the contract after the pick; the scenario only tests the pick, and the splash line ("Pick one.") doesn't say so. No pick reason reported.
- **The books bite (focus 2):** first company contract was a MEDIUM (no LOW was on offer). A suit was lost. Jamie: "the bill definitely took a squeeze, especially with having a suit loss". Taps: **"Tight but fair"**; next move **"Rebuild now"** (8 parts + 100 cr). No tuning change.
- **Caring what comes back (focus 1):** answered through the checks above: he went back for the CRITICAL and rebuilt the lost suit straight away.
- **Contracts played:** fewer than the brief's 3 on one company. Jamie: "im happy as is right now for this round". His end-of-round company (roster, levels, ship fit, credits / fuel) wasn't reported; it is in his SEND LOG ([COMPANY] lines, company code) if he sends it.
- **Jamie's own pre-test check:** whether a LOW contract covers upkeep. On paper, with 4 level-1 operators (wages 120 + upkeep 60 = 180 per contract), a LOW pays 120 / 180 / 240 for 2 / 3 / 4 hunts, so only a 4-hunt LOW with a short jump and no damage comes out ahead. He didn't get to test it (no LOW on offer).
- **Fun test:** not run (per the brief).

## What was built
1. **People (cp1, r21-s1):** named operators with one skill (STEADY AIM, QUIET MOVER, SHARP EARS, SENSOR TECH), XP and levels, CRITICAL + carry out (benched) or KIA (memorial), recruits; the company screen and one save slot; test bed "Carry them out".
2. **Roster (cp2, r21-s2):** 3 ExoS with their own fits and damage carried between contracts; lance of 1–3 picked before each hunt; company credits; SUITS tab refits.
3. **Books (cp3, r21-s4):** credits and fuel; three contract offers (danger scales the field, 2–4 hunts, fee on completion, fuel to reach); wages and upkeep when a contract ends; debt once, then the fold (stranded also folds); parts for repairs and rebuilds, salvaged into a capped hold; a seeded market; the hangar fits only owned items; test bed "Thin books".
4. **Ship (cp4, r21-s4):** 7 hardpoints, 13 modules each with one hook; a painted ship takes hull hits (HULL ARMOUR soaks one).
5. **Wrap (r21-s5):** fix list 1. Jamie: "i dont think it needs to be always one of each, but neer 3 of the same". If all three offers roll the same danger, the last one rerolls to a different danger (vitest over 300 seeds). Round 21 on the splash HISTORY.

**Runner, `--company 10 --companies 6` (r21-s5; the scripted lance drops every suit, never carries anyone out, buys no modules or items, #42):** all 6 companies fold (4 by every ExoS lost, 2 stranded with no fuel); 18 contracts played, 7 complete; 32 KIA; average 76 cr at the end. Completed contracts leave 370–970 cr. At r21-s4 (before the offer fix): 6 fold, 19 played, 9 complete, 31 KIA. The runner judges the bot more than the economy: Jamie's own read was "tight but fair".

**Company values at the end:** `START_CREDITS` 300, `START_FUEL` 6, `START_PARTS` 6, `START_OPS` 4, `START_SUITS` 3, `OP_CAP` 4, `CONTRACTS_OFFERED` 3 (never all one danger), `CONTRACT_HUNTS_RANGE` [2, 4], `CONTRACT_WIN_SHARE` 0.6, `DANGER_FIELD` [0.75, 1, 1.35], `CONTRACT_FEE` [60, 100, 160] per hunt, `FUEL_PER_JUMP` [1, 4], `FUEL_PRICE` 30, `WAGE_OP` 30, `WAGE_LEVEL_MULT` 0.5, `UPKEEP_SHIP` 60, `DEBT_LIMIT` 300, `PARTS_PER_REPAIR` 2, `REPAIR_CR` 10, `REBUILD_PARTS` 8, `REBUILD_CR` 100, `PART_PRICE` 15, `HOLD_CAP` 16, `SALVAGE_PER_KILL` 2, `COST_HIRE` 60, `SHIP_HIT_CHANCE` 0.5, `SHIP_HIT_COST` 80; operators `OP_XP_HUNT` 1, `OP_XP_WIN` 1, `OP_LEVELS` [3, 7], `OP_BENCH` 2, `OP_CARRY_RANGE` 1.5, `RECRUITS_OFFERED` 2.

## Changes (debriefs and fix list)
| # | Symptom | Change |
|---|---|---|
| FL1 | "i only have a medium and 2 high" (wanted a LOW to check upkeep) | Offers never all one danger (not "one of each", by Jamie's call). Built in r21-s5 |
| D1 | The bill after a MEDIUM with a suit lost: "Tight but fair" | No change |

## Parked (not built)
1. **#47 + Jamie (R21 test):** "as you gain rep, you can charge more, and friendly factions will pay more out in bonuses as well", added to faction standing.
2. **Thin books wording:** the scenario only tests the pick; the splash and card could say "no hunt is played" (offered, not logged).
3. From the brief: fatigue, scars, item condition, refit time, altitude gear, the map, factions.
4. **The scripted lance (#42 / #92):** still drops every suit, never carries, never buys, so the `--company` numbers measure the bot more than the books.

## Suggested next step
The company reads and connects: "changed my plan", he went back for the CRITICAL, and the books are "tight but fair" with a lost suit forcing an immediate rebuild. Rows 5 and 6 can be called done for the slice. Two things haven't been tested yet: whether a LOW ever pays its way (on paper it rarely does, and Jamie's rep-based fees idea (#47) is his own answer to that), and how a company plays over several contracts (veterans' wages, modules bought or not). The next obvious step is the rest of row 8: the city map, factions and standing, which would carry the rep and bonus idea.
