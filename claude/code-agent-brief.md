# Code Agent Brief — How We Work on Signal Lance

**Every coding agent reads this first, then the round brief it was given.** It explains how we build, playtest and iterate. The detailed debrief protocol lives in `claude/playtest-method.md`; follow it exactly.

## What you're building

Signal Lance started as a prototype toy and, from Round 6, lives in a **permanent project**. The method hasn't changed: each round tests one design question, and speed of iteration still beats polish. The round brief tells you the one change to make; your job is to make exactly that, playable on a phone, fast.

"Permanent" means the code is organised to last, not that it's gold-plated. Keep it small and readable. Don't build framework, abstraction or infrastructure the round doesn't need.

## Where things live

- **Repo:** `FluKanuck/Prototype`, branch `claude/signal-lance`. Attach it, check out the branch, and commit there.
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
- **Tester splash (from R11):** every round, update `src/view/brief.ts` before shipping: `TEST` (round title, the round's question, what's new in plain words, how to report) and `QUESTIONS` (2–3 tap-answer end-of-hunt questions shaped by the brief's debrief focus). Update the basics text if a control or mechanic changed. Keep all of it short and plain. Bump `BUILD` in `screens.ts`.

## Hard rules

- **Build only what the round brief says.** Nothing else changes.
- **Forbidden until the design lead says otherwise:** CI, test suites, linters or formatter setup, git hooks, extra frameworks or libraries, save systems, menus (beyond the tester splash, basics, job-pick and result screens), settings, art, sound, particles, data catalogues, design documents, new modules, maps, enemies, progression or campaign.
- **Tempting ideas** go in a short "later" list in your reply, never in the code.
- **Don't ask design questions mid-build.** Pick the simplest option, note it in ASSUMPTIONS, and keep going.
- **Spec overrides** are allowed only when a debrief earns them and Jamie says "go." Log them clearly in the TWEAK LOG.

## The workflow

1. **Read** this brief, `claude/playtest-method.md`, the round brief, the artifact, and `NOTES.md` (or the old file's top comment blocks before Round 6).
2. **Confirm in 3 lines max** what you understood and what you'll change. Then build without waiting.
3. **Build in steps** if the change is big. The game must be playable after every step.
4. **Ship each step:** `npm run build`, commit and push to `claude/signal-lance`, then republish `dist/signal-lance.html` to the same URL.
5. **Report in 3 lines max:** what works, how to test it on a phone, what's rough. Then stop and wait.
6. **"next"** means build the next step. **"played"** means run a debrief.

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
