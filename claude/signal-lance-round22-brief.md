# Signal Lance: Round 22 brief — "What happened"

Read claude/code-agent-brief.md and claude/playtest-method.md, then follow this round brief.

**Context:** slice row 7, "Learn why" (the pillar's last beat), scoped in the R22 design lead chat (2026-10-07). R21's company reads and connects, but Jamie's overall read was "good bones, thin in play" plus "busy, a lot of screens". This round adds one after-action page that tells the story of the drop and what it cost the company, and it replaces today's result panels rather than adding to them. **Testing this round is headless (Jamie):** run batches in the runner, report the numbers, and tune from there. Jamie plays only if he chooses to. No fun test (slice).

## QUESTION
Does a short after-action list of turning points, with what each one cost the company, tell you why a drop went the way it did and change how you plan the next one?

## WHY
R21: the company "changed my plan", but the screens between drops feel busy and the cause of each gain or loss sits across several panels. The pillar ends with "then learn why", and that beat has never been built.

## CHANGE
Keep everything from R21 unless it's listed here. Put the rules in `src/sim/` first (a new `aar.ts` is the natural home), then the view. New values go in `src/tune.ts`, commented.

### Record the hunt (sim)
1. **An event record.** During a hunt, the sim appends plain events with turn, actors, tiles and cause. Only three kinds are recorded, chosen by Jamie:
   - **Heard and seen:** the first time each enemy detects each suit, and each suit each enemy (by sound, eyes, radar or thermal, with the range and bearing), and alarms or a pack converging.
   - **Hits that mattered:** CRITICALs, wrecked parts, kills, carry-outs and KIA, with the shooter, the target, the range and where the shot came from.
   - **Objective swings:** uplink taken or lost, cargo grabbed or dropped, the escort fork, bounty quota reached, extraction, bail.
   Wrong calls (ID vs truth, scan vs reality) are **not** in this round.
2. **Pick the moments.** From the record, choose up to `AAR_MAX_MOMENTS` 6 turning points, in turn order. Give each kind a weight in TUNE (`AAR_WEIGHT_*`), and make sure a CRITICAL or KIA, the objective result and the first time the lance was detected always make the list. Note the selection rule in ASSUMPTIONS.
3. **Held the field vs not (Jamie's rule).** You learn more when you hold the ground:
   - **Held the field** (the hunt ends with the objective met): every moment is shown in full, the enemy side included ("patrol heard Kestrel sprint, 6 tiles NE").
   - **Lost or bailed:** you get only what your suits saw, heard or took. Enemy-side moments still appear, as **redacted lines** with the details blanked out ("??? — Kestrel heard by something (NE?)", "Rook hit from the east, shooter unseen"). Bearings are rounded to a compass point (`AAR_REDACT_BEARING` 8 points).
   This is a pure function of the record plus the outcome, with Vitest coverage.

### The after-action page (view)
4. **One page replaces today's hunt result panels.** It has two parts:
   - **WHAT HAPPENED:** the moments, one line each in plain words, starting with the turn number.
   - **WHAT IT COST:** company lines (who got hurt, benched, KIA or levelled; parts and repairs; pay; salvage in the hold; ship hull hits; and at the end of a contract, wages, upkeep and the balance). Each line points back to the moment that caused it (`← T7`) where there is one.
   Keep the scan log and the existing `[COMPANY]` lines available behind a small DETAILS toggle. Don't delete them.
5. **Tap a moment to highlight it on the live end-of-hunt map** (Jamie). This is not a rewind or a replay. Pulse the units and tiles involved, and draw a short line from the actor to the target. **Never reveal more than the outcome allows:** if you lost or bailed, highlight only your own units and the rounded bearing, never a hidden enemy's position.
6. **Phone first:** the page fits a landscape phone with no long scroll (cap the lines, keep DETAILS collapsed), buttons ≥ 48px, and the top 56px kept clear.
7. **Log** each moment as `[AAR T<n> <kind> <held|redacted>] <text>` so SEND LOG carries it.

### Runner and tests
8. **Runner:** the `--aar` flag prints the moments for each hunt. Add summary numbers to the `--contracts` and `--company` reports: moments per hunt (average, min, max), the share of each kind, the held-the-field rate, the share of redacted lines when not held, and how often the list has fewer than 3 moments (too thin) or hits the cap (too busy).
9. **Test bed** (fixed seeds): **"Held the field"** and **"Bailed"**, the **same seed and the same events**, ending one way and the other, so the redaction can be compared side by side. Question for both: "Did the list tell you why it went that way?" Keep older scenarios working.
10. **Vitest:** events are recorded for each of the three kinds; the always-in moments survive the cap; the redaction hides enemy identity and position when not held and shows them when held; a COST line links to its moment; the highlight data for a redacted moment contains no hidden enemy position; a hunt with no events still gives a valid page.
11. **Tester splash** (`src/view/brief.ts`): what's new in plain words, plus 2–3 tap questions from the debrief focus. Update GAMEPLAY BASICS (the after-action page, held the field vs lost). Bump `BUILD`.

## NOT IN THIS ROUND
- Wrong calls (ID vs truth, scan vs reality) in the list
- A replay player, rewind, fog-lifted snapshots, a Tacview-style timeline
- Contract-long story pages; changes to the company screen's tabs beyond moving the result panels (#100 stays parked)
- The campaign map, factions, standing, rep-based fees (#46, #47)
- Economy retuning (fees, wages, upkeep) unless the headless numbers make a clear case. If they do, propose it to Jamie first and log it in the TWEAK LOG
- A smarter scripted lance (#42). Note its blind spots in the report, don't fix them
- New enemies, maps, items or modules

## DEBRIEF FOCUS
Testing is **headless by Jamie's call**. The runner numbers stand in for play, and Jamie tunes from them.
1. **Does the list carry the story?** From the runner: moments per hunt, the mix of kinds, how often it's too thin (< 3) or capped, and whether the always-in moments (first detection, CRITICAL / KIA, objective) show up. Include 3–4 sample lists (held and lost) in the report so Jamie can judge whether they read.
2. **Held vs lost, and the company over time:** the held-the-field rate, how much is redacted when not held, and a `--company` batch over several contracts per company: contracts survived, folds, KIA, credits and fuel over time, and whether a LOW contract ever pays its way (R21's open question).

## DONE
- Built and shipped, both scenarios working, and headless batches run: at least `--contracts 20 --aar` and `--company 10 --companies 6` (or larger), with the numbers above.
- Report the numbers to Jamie and propose TUNE changes from them (AAR knobs first). Apply them on his "go", rerun, and log old → new in the TWEAK LOG.
- Then the "does it read and connect?" check if Jamie plays (optional this round). **No fun test.**
- Save the status report as claude/signal-lance-round22.md, including the runner numbers before and after tuning and the sample lists.
