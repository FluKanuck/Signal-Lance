# Signal Lance: Round 22 status report — "What happened"

**Date:** 2026-10-07
**Build:** `signal-lance/` TS project (~9,000 lines of src), `dist/signal-lance.html`, BUILD `r22-s5`
**Branch:** `main` (repo `FluKanuck/Signal-Lance`), commits 2808001 (s1), 4fd89e9 (s2), 676aa59 (s3), 5ad486f (s4), 2cc78b3 (s5 + wrap), plus this report
**Live artifact:** https://claude.ai/artifact/NRNixsKxVrcMGNeYp6bB2o · testers: https://flukanuck.github.io/Signal-Lance/

## Purpose
Does a short after-action list of turning points, with what each one cost the company, tell you why a drop went the way it did and change how you plan the next one? Slice row 7 ("Learn why"), the pillar's last beat. Testing was headless by Jamie's call: runner batches stood in for play, and Jamie tuned from the numbers. No fun test (slice).

## Current status
- **Read-and-connect check: "Yes, it changed my plan".**
- Jamie looked at both test-bed scenarios. One fix came out of it ("at this point in the replay the patrol should be alive"), shipped in r22-s3. "looks good" after it.
- Three headless tuning rounds: the after-action knobs first, then the economy, from the R21 open question and Jamie's own ideas (recover suits when you hold the field; higher pay and a completion bonus).
- **Biggest thing still missing:** "City map and factions (placeholder) and a better runner bot."
- Fun test: not run (per the brief).
- The project docs tool wasn't connected this session. The brief and docs were read from the repo's `claude/` folder, and this report is saved there.

## What was built
1. **The event record (`sim/aar.ts`, r22-s1).** Three kinds, as Jamie chose them:
   - SEEN: first detections both ways (sense, range, bearing), alarms, a pack closing in.
   - HIT: parts wrecked, kills, a suit down (CRITICAL), carry-outs, KIA, each with the shooter, range and side.
   - OBJ: uplink started, cargo grabbed / handed / lost, route picked, quota, a suit out, the end.
   Wrong calls are not recorded. Recording changes no outcome: the company runs were identical before and after.
2. **The moments.** Up to `AAR_MAX_MOMENTS` 6, in turn order, picked by weight (`AAR_WEIGHT_*`). The end, every suit down or KIA, and the field's first detection of the lance are always in.
3. **Held the field vs not.** A WIN shows every moment in full. Lost or bailed, the enemy side is redacted: `??? — A heard walking by something (NE?)`, `B's ARMS wrecked, hit from the NE, shooter unseen`. Bearings are rounded to 8 points, and a field unit is named only as the lance knew it.
4. **The after-action page** replaces the result panels:
   - It sits on the right half, with the live map on the left.
   - WHAT HAPPENED lists the moments; WHAT IT COST lists the company lines, each linked `← T4` to the moment behind it.
   - Tap a moment: it pulses on the map. r22-s3 draws the units as they were at that turn ("T1 · patrol (line)"), hides that unit's later wreck, and zooms out to fit. Not held, no field unit is drawn, only your own suit and a dashed bearing wedge.
   - DETAILS keeps the old panels.
   - SEND LOG carries the moments as `[AAR T<n> <kind> <held|redacted>]` lines.
5. **Runner:**
   - `--aar` prints each hunt's moments.
   - An AFTER-ACTION summary prints with `--contracts` and `--company`.
   - Company batches report pay-their-way per danger level and contracts survived per company.
   - NEW `--pick low` makes the company take the safest offer.
6. **Test bed:** "Held the field" and "Bailed". Seed 2204, played by the scripted lance: Jok goes down, Mara carries them, the uplink lands. Bailed ends the same hunt as a BAIL, so both have the same events (Vitest checks this).
7. **Vitest:** 12 after-action tests, covering the three kinds, the always-in moments, redaction of text and highlight, cost links, an empty hunt, the scenarios, the KIA merge, and recovery. 389 tests in all.
8. **Economy (Jamie's calls from the headless numbers):**
   - Held the field recovers downed suits at half rebuild cost.
   - START_FUEL 8.
   - PAY_MULT 1.25.
   - CONTRACT_BONUS 100.

## Runner numbers

**After-action page** (`--contracts 20`)

| | before tuning (r22-s1) | after (r22-s2) |
|---|---|---|
| events per hunt | 21.3 | 21.3 |
| moments (avg / min) | 6.0 / 5 | 6.0 / 5 |
| lists at the cap | 98% | 98% |
| too thin (< 3) | 0 | 0 |
| SEEN / HIT / OBJ | 22 / 46 / 32% | 24 / 52 / 24% |
| route picks shown | 21 | 0 |
| held the field | 46% | 46% |
| lines redacted when not held | 52% | 54% |
| always-in dropped (company runs) | 6 | 0 |

At 60 contracts (r22-s2): 147 hunts, cap 97%, thin 0, kills 24% of lines, detections 25%, held 52%, 57% redacted when not held.

**The company over time** (`--company 10 --companies 20`, highest-fee bot)

| build | folded | played (complete) | KIA | end cr | folds: suits / fuel / ops / debt |
|---|---|---|---|---|---|
| r22-s3 (R21 economy) | 16 | 62 (27) | 92 | −8 | 8 / 7 / 0 / 1 |
| r22-s4 (recovery, fuel 8) | 16 | 84 (37) | 118 | −65 | 8 / 6 / 1 / 1 |
| r22-s5 (pay ×1.25, bonus 100) | 10 | 123 (58) | 170 | +478 | 4 / 4 / 1 / 1 |

Safest-offer bot (`--pick low`):
- r22-s3: 17 folds, 59 played (37 complete), −50 cr.
- r22-s5: 12 folds, 129 played (87 complete), +331 cr. 9 of the 12 folds are fuel.

**R21's open question (does a LOW pay its way?):** yes, when it completes. On the R21 economy, 46 LOWs were played, 32 completed, and a completed LOW averaged +145 cr (paper estimate: about break-even). The economy was tuned after this answer.

**Sample lists (r22-s1/s2)**
- Held, uplink: patrol saw A's muzzle flash, 9 tiles SE → patrol wrecked B's LEGS, 5 tiles S (from behind) → A destroyed the patrol with the mortar → A started the uplink → WIN.
- Held, escort (after the route weight): relay saw A's muzzle flash → A mortared the relay twice, then a patrol → the transport made it out.
- Bailed: `??? — B heard walking by something (NE?)` → `??? — A seen by something (NE?)` → `B's ARMS wrecked, hit from the NE, shooter unseen` → A destroyed a patrol to the NE → BAIL.
- Lost, wiped: `??? — A heard walking by something (E?)` → `A's LEGS wrecked, hit from the E, shooter unseen` → `A destroyed, hit from the E` → `B's BACK wrecked, hit from the W (from behind)` → `B destroyed …` → LOSS.
- Company KIA (merged): `B Ruth went down: CRITICAL, shot by patrol (line), 1 tile NE; left behind: KIA`.

## Changes (from the TWEAK LOG)
| # | Symptom | Change | Result |
|---|---|---|---|
| H1 | Escort lists: 2 of 6 lines were route-pick filler; wipes showed "went down" and "KIA" twice per suit (6 always-in dropped) | `AAR_WEIGHT_ROUTE` 2 (was OBJ 5); KIA folded into its suit's went-down line (r22-s2) | Route lines 21 → 0, HIT 46 → 52%, always-in dropped 6 → 0 |
| F1 | Jamie (test bed): "at this point in the replay the patrol should be alive" | A tapped moment draws units as they were at that turn, hides their later wreck, zooms to fit (r22-s3) | "looks good" |
| H2 | Jamie: "Fuel strands too often" (7 of 16 folds); mid-tuning: "retrieve the suit from the field if we hold the field, cheaper to repair" | NEW `RECOVER_HELD` + `RECOVER_MULT` 0.5 (rebuild 4 parts + 50 cr when held, full when lost); `START_FUEL` 6 → 8 (r22-s4). Tried and reverted: fuel price 20, fuel per jump max 3, fuel on credit, a guaranteed 1-fuel offer | Played 62 → 84, complete 27 → 37; folds unchanged (16); strands 7 → 6 |
| H3 | Jamie: "try increased payouts per mission as well as a completion bonus" | NEW `PAY_MULT` 1 → 1.25 (every hunt's pay, bounties included), `CONTRACT_BONUS` 0 → 100 (r22-s5) | Folds 16 → 10, played 84 → 123, end credits −65 → +478. ×1.5 + 150 was rejected as too rich (1,100 cr banked) |

Side effects:
- `--contracts 20 --check` had been failing on main before the round (sound FLAG). It passes from r22-s5.
- `test/map.test.ts`'s district test got a 20 s timeout (5.4 s on this machine).

## Parked (not built)
1. **City map and factions** (Jamie's biggest missing; #46, #47, with rep-based fees and faction bonuses).
2. **A better runner bot (#42):** never goes back for a CRITICAL, never buys modules or items, always drops every suit. Every company number above measures the bot.
3. **Fuel for safe play:** with the r22-s5 economy, 9 of 12 safest-offer folds are fuel. Next levers: fuel price, the tank, or fuel per jump.
4. **The list is nearly always full** (97–99% at 6). Raise the cap or trim more filler, if play shows it missing things.
5. From the brief: wrong calls (ID vs truth, scan vs reality), a replay or rewind, contract-long story pages, #100 (company tabs).
6. Later ideas: `--pick` mixes; a runner flag where the bot carries CRITICAL operators.

## Suggested next step
The pillar's last beat is in and connects: "Yes, it changed my plan". Holding the field now pays twice: you learn the whole story and you bring the suits home. With rows 5–7 working, the slice's open row is 8: the city map, factions and standing. Jamie names it as the biggest gap, alongside a smarter runner bot. A small bot round (carry CRITICALs, buy repairs and modules sensibly) before or alongside the map would make the headless economy numbers trustworthy for the faction and fee tuning that row 8 will need.
