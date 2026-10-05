# Code Agent Brief — How We Work on Signal Lance

**Every coding agent reads this first, then the round brief it was given.** It explains how we build, playtest and iterate. The detailed debrief protocol lives in `claude/playtest-method.md`; follow it exactly.

## What you're building

Signal Lance started as a prototype toy and, from Round 6, lives in a **permanent project**. The method hasn't changed: each round tests one design question, and speed of iteration still beats polish. The round brief tells you the one change to make; your job is to make exactly that, playable on a phone, fast.

"Permanent" means the code is organised to last, not that it's gold-plated. Keep it small and readable. Don't build framework, abstraction or infrastructure the round doesn't need.

## Where things live

- **Repo:** `FluKanuck/Signal-Lance`, branch `main`. Attach it and commit straight to `main`. (Up to build `r12-s1` the project lived in `FluKanuck/Prototype` on branch `claude/signal-lance`; the round reports' commit hashes refer to that repo.)
- **Testers (GitHub Pages):** https://flukanuck.github.io/Signal-Lance/, served from `main`, folder `/docs`. `npm run build` updates `docs/index.html`; commit it with every build.
- **Project (Round 6 onward):** `signal-lance/`, a TypeScript + Vite project.
  - `src/sim/`: pure game rules. No DOM, canvas, `window`, `localStorage` or direct `Math.random` (use the seeded RNG).
  - `src/view/`: rendering, HUD, input, camera and the DBG overlay. The view reads sim state and sends commands; it never changes rule state directly.
  - `src/tune.ts`: every tuning value.
  - `NOTES.md`: the TWEAK LOG and ASSUMPTIONS.
  - `dist/signal-lance.html`: the built, self-contained file. Commit it.
- **Before Round 6:** the game was the single file `signal-lance.html` at the repo root (kept as a reference, later in `legacy/`).
- **Live artifact:** https://claude.ai/artifact/NRNixsKxVrcMGNeYp6bB2o. Read it first, then **republish the built file to this same URL** every time, so Jamie's phone link keeps working.
- **Project files:** `claude/playtest-method.md` (method), `claude/signal-lance-round*.md` (status reports and briefs), `claude/signal-lance-roadmap.md` (direction, owned by the design lead).
- **Future:** a move to Godot is planned around Gate 2 (Jamie has Godot MCP Pro). The `sim/` / `view/` split exists so the rules can be carried over. Don't start that move unless a round brief says so.

## Conventions

- **The build output is one self-contained HTML file** (`vite-plugin-singlefile`), with no external assets or CDN calls at runtime.
- **Allowed tooling:** TypeScript, Vite, `vite-plugin-singlefile`, and the headless runner (`npm run sim`). Anything else needs the round brief to allow it.
- **All tuning values go in `src/tune.ts`**, each one commented. New values go there too.
- **`NOTES.md` holds:**
  - `TWEAK LOG`: `<round/run> | symptom | change (old → new) | result`
  - `ASSUMPTIONS`: anything ambiguous, resolved with the simplest option
- **Rules go in `sim/`, drawing and input go in `view/`.** If a change needs both, put the rule in `sim/` first, then show it in `view/`.
- **Phone first:** landscape, touch, buttons ≥ 48px, top 56px kept clear for the app's viewer bar, no page scroll or zoom, steady frame rate, and mouse still works on desktop.
- **Storage:** localStorage (view side only), wrapped in try/catch with an in-memory fallback. Keep the COPY LOG and SEND LOG buttons working.
- **Test bed (from R14):** each round brief names 2–3 scenarios in `src/sim/scenarios.ts` (hand-placed units, zones, damage and TUNE overrides, a `tryThis` line and one tap question). Write them, add a Vitest check for each, and keep older rounds' scenarios working. They're reached from the TEST BED button, log as `[TESTBED <name>]`, and never count toward contract stats. No editor or free-spawn sandbox.
- **Tester splash (from R11):** every round, update `src/view/brief.ts` before shipping: `TEST` (round title, the round's question, what's new in plain words, how to report) and `QUESTIONS` (2–3 tap-answer end-of-hunt questions shaped by the brief's debrief focus). Update the basics text if a control or mechanic changed. Keep all of it short and plain. Bump `BUILD` in `screens.ts`.

## Working rules (loosened 2026-10-05)

These started as hard rules, set up early (with Jamie's ADHD in mind) to stop heavy investment before the game was proven fun. The game is in a good place now, so they are **defaults, not gospel**. Adapt them when it helps, and say so.

- **Build what the round brief says.** Small, related fixes and cleanups are fine. Mention them in the report.
- **Tests are welcome.** Vitest unit tests on `src/sim/` (`npm test`) and pass/fail checks in the runner (`npm run sim -- --check`). Add tests for every new rule. Still not wanted without asking: CI, linters/formatters, git hooks, extra frameworks.
- **Still needs the design lead / Jamie:** new content (modules, maps, enemies), saves, campaign/progression, art and sound. Tempting ideas go in a "later" list.
- **Steps:** a round can be built in one go. Use tune flags (e.g. `PACK_ENABLED`) to let Jamie play parts on their own, instead of waiting for a debrief between build steps.
- **Design questions mid-build:** ask if the answer really changes the build (use the question tool). Otherwise pick the simplest option and note it in ASSUMPTIONS.
- **Spec overrides** from a debrief still need Jamie's "go". Log them in the TWEAK LOG.

## The workflow

1. **Read** this brief, `claude/playtest-method.md`, the round brief, the artifact, and `NOTES.md` (or the old file's top comment blocks before Round 6).
2. **Confirm briefly** what you understood and what you'll change. Then build.
3. **Build** rules + tests in `sim/` first, then the view, then the runner report. Keep the game playable at every commit.
4. **Before shipping:** `npm run check`, `npm test`, `npm run sim -- --contracts 20 --check` all pass.
5. **Ship:** `npm run build`, commit and push to `main`, then republish `dist/signal-lance.html` to the same URL.
6. **Report:** short and scannable. What works, how to test it on a phone, what's rough, the runner numbers.
7. **"played"** means run a debrief.

## The debrief (summary; full rules in the method file)

- **No suggestions first.** Ask ONE multiple-choice question at a time, max 3 per debrief. Use the question tool if available.
- **Options describe feelings or symptoms, never solutions,** plus "Something else" and "It felt fine."
- **Broad, then narrow.** First question: "What was the weakest moment of that run?"
- **Reflect his own words back** as a one-sentence symptom and confirm.
- **Propose ONE change** (two only if tightly linked): plain words, TUNE old → new, what to notice next run. Apply on **"go"**.
- **Open the next debrief** by rating the last change: helped / made it worse / couldn't tell. Revert "worse" first.
- **Use the round brief's debrief focus** to shape the questions.
- **Tester logs:** if Jamie pastes logs from other testers, read their tagged lines (`[name]`, tap answers, notes) as extra evidence alongside his own debrief, and note them in the report.

## Ending a round

A round ends when Jamie has played the runs the brief asks for and run the fun test, or when he calls it. Then write a status report and save it to the project as `claude/signal-lance-round<N>.md`, using this shape:

- Header: date, build (project, rough line count), branch and commits, artifact URL
- **Purpose:** the round's question
- **Current status:** the answer, in Jamie's words where possible
- **What was built**
- **Changes:** table of symptom → change → result, from the TWEAK LOG
- **Parked:** ideas not built
- **Suggested next step**

Keep it short and factual. The design lead reads it to decide what comes next.
