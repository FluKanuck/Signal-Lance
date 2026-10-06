# Signal Lance: Round 14 status report — "Read the signature"

**Date:** 2026-10-05
**Build:** `signal-lance/` TS project (~3,240 lines of src), `dist/signal-lance.html`, BUILD `r14-s2`
**Branch:** `main` (repo `FluKanuck/Signal-Lance`), commits 2fe9157 (part 0: test bed), 2322193 (part 1: variants, traits, CARD, ID), c40d501 (debrief 1: `ID_SHOW_FITS`), 253653f and 8c9e95c (roadmap: park #51, lance-size note), and the wrap commit
**Live artifact:** https://claude.ai/artifact/NRNixsKxVrcMGNeYp6bB2o · testers: https://flukanuck.github.io/Signal-Lance/ (deployed, serving r14-s2)

## Purpose
Does matching a contact's traits against a 9-entry card and committing an ID make identification a skill Jamie uses before he has eyes on, because a right call sharpens the track and the aim? R13 showed the channels were readable but that reading them decided nothing. R14 also added a test bed, so a mechanic can be checked in minutes.

## Current status
- **The system works; the mission makes it optional.** Jamie: "irregardless of the enemy type, if around an uplink, I'm going to have to fight it … the information just doesn't give us anything other than position for a ranged lob." Asked to confirm: "Yes… AND.. but I just can't quite figure out what the and is."
- **Eyes win the race.** Debrief 1: reading felt pointless because contacts "walked into eyes" before their traits filled in, and making an ID "didn't feel intuitive enough to bother opening the sub menu UIs … more a refinement/scale/presentation issue".
- **ID friction fix helped partly:** the "N fit" count "helped to a degree. But still felt I could have just as easily not bothered with it and got on fine."
- Tap answers (C2, quick contract, Mixed, WIN CLEAR): id "Guessed", call "Didn't matter", card "A quick read". IDs 1 (1 right, before eyes). The mortar did the work: 4/4 hits, 3 kills.
- **Positive signal:** "oh, that's how it works", with "I'm starting to see the variety of mechanics starting to mesh."
- Fun test: 1/5 ("oh, that's how it works"). **Not formally scored**: Jamie wrapped after about 2 quick contracts, with no other testers this round.
- Biggest thing still missing: "Can't decide."
- **R13 close-out:** not answered. No "Earshot" result was reported, so "did being loud cost you something you could point at?" is still open. The runner says yes: creeping is found in round 2.1 on average, by eyes; sprinting in round 1.0, by sound, every time.
- **Test bed:** built and checked in the browser. No scenario log lines or tap answers came back, so "is it useful?" is unanswered.

## What was built
1. **Test bed (part 0):**
   - Scenarios are data in `src/sim/scenarios.ts` and load through `newHunt(loads, prep)`.
   - A TEST BED screen on the loadout page: scenarios newest round first, each with a tap question, RETRY (same seed) and BACK. Each run logs a `[TESTBED <name>]` line. Test-bed hunts sit outside contracts, and their TUNE overrides are restored afterwards.
   - Runner: `--scenario <name> --runs N`, plus `--quiet` (CREEP every move) to compare against `--loud`.
   - Scenarios: Earshot, Wounded (R13, pack on); Look-alikes, Quiet gun, Twin pulse (R14).
2. **Variants (part 1):** 9 in `TUNE.FIELD_VARIANTS`, 3 per type, built only from existing knobs. Each slot rolls one (seeded, evenly); `VARIANTS_ENABLED` false gives the R13 field. Each type splits on one axis:

   | Type | Variants | Split by |
   |---|---|---|
   | Patrol | scout, line, heavy | step sound |
   | Turret | sentry, hush, gun | EMIT or the sound of the shot |
   | Emplacement | search, fire, relay | pulse rhythm (every 2 / 1 / 3) |
3. **Observed traits (`src/sim/ids.ts`):**
   - What's recorded: EMIT band, pulse interval, moved/still, loudest step heard, shot heard.
   - Moves can now be noticed from a bearing that swings more than 8° from the same spot.
   - A field radar pulse is now heard at once by passive. The field already had this rule; it now works both ways.
   - A matcher uses the card's rules, and DBG shows the true variant.
4. **CARD and ID:**
   - Tapping a contact shows its traits under the label. The CARD screen lists the 9 variants with their tells, and the ID picker lets you call one. A call reads `name?` until eyes confirm it.
   - An ID'd static's track freezes: no growth, no fade.
   - A right call made before eyes adds +10% to hit.
   - Eyes reveal the truth and log a miscall.
   - Log line: `IDs n (right, wrong, before eyes)`.
5. **Runner ID report and flags.** Tests went from 36 to 69.
6. **Tester splash, basics and questions** updated for R14.

**Runner (20 contracts, pack off):**

| Measure | Value |
|---|---|
| Contacts ID'd before eyes | 27% |
| Scripted IDs right | 100% |
| Contacts that narrow to one variant | 46% |
| Narrowed from the first reading | 4% |
| Rounds from first reading to one variant | 2.0 |

Neither flag fires (>80% too easy, <20% unreadable), and `--check` is OK. The R13 sound-share flag cleared, at 48%.

## Changes (from the TWEAK LOG)
| # | Symptom | Change | Result |
|---|---|---|---|
| 1 | Scout's radio inaudible past ~6 tiles behind walls (build) | Scout keeps the patrol's armour plate (sig 2.0); Look-alikes scout at 8 tiles, not ~12 | Not rated |
| 2 | "Reading contacts felt pointless"; eyes first; "didn't feel intuitive enough to bother opening the sub menu UIs" | `ID_SHOW_FITS` false → true: label "N fit", picker greys out ruled-out variants | Helped (partly) |
| 3 | "An ID changed nothing": the objective forces the fight whatever the enemy is | No change: structural, not a TUNE knob | — |

**Jamie's decision:** patrol step tells stay close-range for a baseline ExoS. Acoustic sensors will extend them later.

## Parked (not built)
1. **#51 (Jamie):** decoys and masking, to disguise what you are, to hide or lure the enemy.
2. **Roadmap note (Jamie):** missions will deploy 1–4 ExoS ("ExoS", pronounced Ex-Oss, is his placeholder term for the exosuits).
3. A "heard nothing close by" reading, so a scout can be told apart at range.
4. Picker hints went partway in change #2 (greying). A full "only what fits" picker would be a giveaway.
5. Unrated on the human side: the frozen track's lob payoff (Twin pulse) and the miscall cost (Quiet gun).

## Suggested next step
R14's question has a clear answer: the read works and is legible, but nothing in the current mission asks for it. Every uplink must be fought for whatever guards it, so information only buys a lob position. Jamie felt there's an "and" he couldn't name, and "can't decide" what's most missing. The next design-lead chat should start there before choosing R15.

Candidate angles the brief kept out of this round:
- Objectives that can be met without fighting what you've read (bypass, choice of uplinks).
- Fields where some contacts are worth avoiding.
- A contract that pays for knowledge.

Weigh these against the planned suit-budget R15, since building against the INTEL has the same dependency: it only matters if what you learn changes what you do. The R13 loud-cost question and "is the test bed useful?" are both still open.
