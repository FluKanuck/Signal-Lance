# Signal Lance: Round 25 brief — "Lock the rules" (part A)

Read claude/code-agent-brief.md and claude/playtest-method.md, then follow this round brief. Also read claude/signal-lance-godot-port.md: this round prepares the port.

## QUESTION
Are the rules correct and do they say what happened, so the Godot port can copy them seed for seed?

## WHY
- Jamie picked Godot 4 + GDScript (2026-10-08). The port copies the rules exactly, checked against golden logs from the TS runner.
- A rule bug that is still in the game when we write the logs goes into Godot too.
- The R24 QA re-check found rule bugs (MOVE ends short, two ExoS on one tile, a stale contact tag, the scan clock moving while paused, REFIT vs hunt hits) and one rule-feedback gap: FIRE never says what happened.
- The slice fun test is out with testers now. Part A is the work that does not need their answers.

## CHANGE
1. **Fix list 1–5: rule bugs.** See `claude/signal-lance-r25-fix-list.md`.
   - Fix each rule in `sim/` first, with a Vitest check for each.
   - Add an invariant to `sim/invariants.ts` where one fits: no two units on one tile, a paused scan clock never moves, and REFIT hits equal hunt hits.
   - Note each fix in the TWEAK LOG with the runner numbers before and after.
2. **Shot results say what happened** (fix list 6–8). Rules stay the same. This is display only.
   - After each player FIRE, show a result line on the map near the target for `SHOT_FLASH_MS` (NEW, 2500). Show it whether the HUD is one line or open. It reads `HIT CORE`, `MISS`, or `KILL`, with `had 77% to hit` after it.
   - After the enemy phase, list **every** enemy shot of the phase, not only the last one. Each line gives the shooter, the target, HIT or MISS, and the part hit. Use the existing HUD block, and tap to close it.
   - The map callouts and the HUD read the same shot record, so they always agree.
   - New words go into `src/view/glossary.ts` with a long-press line: the result line, KILL, and "had N% to hit". Run the STE linter on changed text.
3. **Golden logs (port phase 0).**
   - Add `npm run sim -- --golden <dir>`.
   - For each fixed seed, it writes JSON: the seed, every RNG roll in order (value and the stream: hunt, contract or company), the event log, and the end state.
   - Seeds: 20 hunt seeds, 20 contract seeds, 5 company runs, and the QA panel seeds (101, 202, 303, 1001, 2002, 3003).
   - Write them to `signal-lance/golden/`, and add a Vitest check that rebuilds them and compares.
   - Generate and commit them **last**, after fixes 1–5. Part B will change them again. That is expected.
   - Keep the JSON stable and readable: sorted keys, and no timestamps or build ids.
4. **BUILD and splash.** Bump `BUILD`. TEST: "R25: the rules are locked for the move to a new engine. FIRE now says what happened." QUESTIONS: (a) "After you fired, did you know what happened?" (b) "Did an ExoS stop where you did not expect?" BASICS: add the shot result line.

## NOT IN THIS ROUND
- **Pacing / long walks (C03).** It is part B, after the tester feedback.
- **The design calls:** an ExoS DOWN in one phase (C14), losing the lance folds the company (C19), the transport hit by a shooter you cannot see (C13), and enemy health (C15). These are part B too.
- **The map, labels, camera and HUD layout** (C02, C09, C12, C22, C24, C25, C35 …). Godot rebuilds the view, so do not polish it in TS.
- **Any Godot code.** Port phase 1 starts after the slice fun test passes.
- **New content or rule changes** beyond the fix list.

## DEBRIEF FOCUS
1. After FIRE and after the enemy phase, does Jamie know what happened without opening the HUD?
2. Did any move end somewhere he did not expect, and did the game say why?

## FIX LIST
claude/signal-lance-r25-fix-list.md: build it alongside the change. Items 1–5 are rule bugs, and 6–8 are the shot results.

## DONE
- A few hunts played on Jamie's phone. The full fun test is the slice test that is already out with testers.
- The runner check passes: `npm run sim -- --contracts 20 --check`. Report the numbers before and after the bug fixes.
- The golden logs are committed, and their Vitest check passes.
- The QA panel ran on the final build (sl-qa, core preset). Re-check the fix list clusters.
- Save the status report as claude/signal-lance-round25.md.
