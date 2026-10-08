---
name: "signal-lance-build-round"
description: "Run a Signal Lance coding round: read the latest round brief, build it with our playtest method, debrief, run the agent QA panel on the final build, then save the round report (with the QA results) to the project for the design lead."
---

# Signal Lance — Build Round

You are the coding agent for Signal Lance, a phone-first game built round by round. You build ONE round from the design lead's brief, playtest it with Jamie using our debrief method, and finish by saving a status report the design lead will read.

## 1. Load the context (silently, before saying anything)

Use the Projects tool:

1. `project_info` to list the project docs.
2. `project_read` these, in order:
   - `claude/code-agent-brief.md` (how we work: repo, artifact, file conventions, working rules). It is the authority on where things live; if anything below disagrees with it, follow it.
   - `claude/playtest-method.md` (the debrief protocol; follow it exactly)
3. Find the round to build: the highest `<N>` among `claude/signal-lance-round<N>-brief.md`.
   - If `claude/signal-lance-round<N>.md` (the report) already exists for that N, that round is finished. Tell Jamie in one line and ask whether to rebuild it or wait for the design lead's next brief.
   - If there is no brief file at all, ask Jamie to paste the round brief.
4. `project_read` the brief, and the previous round's report (`claude/signal-lance-round<N-1>.md`) for context.

Then set up the code:

- Attach the repo `FluKanuck/Signal-Lance` with push access, clone it, and work on branch `main` (commit straight to `main`). Up to build `r12-s1` the game lived in `FluKanuck/Prototype` on branch `claude/signal-lance`; older reports' commit hashes refer to that repo. Don't use it.
- The repo's `claude/` folder also holds the docs. If it has a newer brief or report than the project, the repo copy wins; tell Jamie in one line.
- Check `git log` for the round's progress: a brief built in checkpoints may already be partly shipped (version tags like `r18-s2` in commit messages and `BUILD` in `src/view/screens.ts`). Pick up from the next unshipped step.
- Read `signal-lance/NOTES.md` (TWEAK LOG and ASSUMPTIONS), `signal-lance/src/tune.ts`, and the parts of `src/sim/` and `src/view/` the brief touches.
- Read the live artifact at https://claude.ai/artifact/NRNixsKxVrcMGNeYp6bB2o with the Artifact tool's read action, so you can republish to that same URL.

## 2. Confirm, then build

- Confirm briefly: which round (and checkpoint), the one question it tests, and what you'll change. Then start building without waiting.
- Build what the brief says. Everything in the brief's NOT IN THIS ROUND list stays out. Small related fixes are fine; mention them. Tempting ideas go in a short "later" list in your reply.
- Rules and Vitest tests in `src/sim/` first, then the view, then the runner report. New tuning values go in `src/tune.ts`, each commented. Add TWEAK LOG lines; resolve anything ambiguous with the simplest option and note it in ASSUMPTIONS.
- Every build: update the tester splash and GAMEPLAY BASICS in `src/view/brief.ts`, and bump `BUILD`.
- **Clear words (Jamie, 2026-10-08):** every line a player reads follows the house writing standard, `.claude/skills/signal-lance-writing/SKILL.md` in the repo (80% of the way to ASD-STE100). It means one name per thing, sentences of 20 words or fewer, active voice, simple tenses and no semicolons. A greyed or blocked control says why. A new or renamed term goes into the game's glossary in the same commit, with its long-press line. Flavour text keeps its voice but uses the glossary's names. Run the vendored linter (`.claude/skills/asd-ste100/scripts/ste-lint.py`) on changed text before you ship.
- The game must be playable at every commit.

## 3. Ship each step

1. `npm run check`, `npm test`, and `npm run sim -- --contracts 20 --check` all pass.
2. `npm run build` (updates `dist/signal-lance.html` and `docs/index.html` for GitHub Pages), commit both, and push to `main`.
3. Republish `dist/signal-lance.html` to the SAME artifact URL (pass it as `url`). Testers play at https://flukanuck.github.io/Signal-Lance/.
4. Report short and scannable: what works, how to test it on a phone, what's rough, the runner numbers. Then stop and wait.

- "next" means build the next step or checkpoint.
- "played" means run a debrief.

## 4. Debrief (every time Jamie says "played")

Follow `claude/playtest-method.md` exactly. In short:

- If a change was made last debrief, first ask: helped / made it worse / couldn't tell. Record it in the TWEAK LOG. Revert "worse" before anything else.
- Ask ONE multiple-choice question at a time (use AskUserQuestion), max 3 per debrief. Options describe feelings or symptoms, never solutions, plus "Something else" and "It felt fine".
- Start broad ("What was the weakest moment of that run?"), then narrow. Shape the questions around the brief's DEBRIEF FOCUS.
- Reflect his own words back as a one-sentence symptom and confirm.
- Propose ONE change (two only if tightly linked): plain words, TUNE old → new, what to notice next run. Apply only on "go", then ship as in step 3.

## 5. End the round

The round ends when Jamie has played what the brief's DONE section asks, or when he says to wrap up.

1. **Closing check.** Use whatever the brief's DONE section asks for. During the whole-loop slice that is usually the "does it read and connect?" tap answer, with **no fun test**. If the brief does ask for the fun test, ask it with AskUserQuestion, multiSelect, one checkbox per item:
   - Said "one more go" without deciding to
   - Tried a build or approach I hadn't planned
   - A loss made me want to fix my plan rather than quit
   - Had an "oh, that's how it works" moment
   - Someone else asked to play again
   Three or more ticks is a pass. If he wrapped early, note that it wasn't formally scored.
2. **One closing question:** "In one line, what's the biggest thing still missing?" Use his words in the report.
3. Move the round's `TEST.newThings`, condensed, to the top of `HISTORY` in `src/view/brief.ts`, and ship that as the round's last build.
4. **Run the QA panel** on the round's final build, before writing the report. It runs only in Claude Code with the `signal-lance-qa` plugin, through its `sl-qa` skill.
   - **If `sl-qa` is available:** follow it with `--preset core` and the batch name `r<N>-core-<MMDD>`. Tell Jamie he can watch with `/sl-qa-watch`.
   - **If it isn't** (for example in a claude.ai chat): tell Jamie in one line to run "run the QA panel" in a Claude Code session on the repo, and write the report without it. The design lead can read the QA report later.
   - **When it ends,** you have `claude/signal-lance-qa-<batch>.md` (committed) and a triage page link. Also save the QA report to the project with `project_write`, at the same path, so the design lead can read it. Don't fix the findings in this round: the design lead triages them with Jamie.
5. **Write the report.** Save it with `project_write` to `claude/signal-lance-round<N>.md` (`present_to_user: true`), and also commit it to the repo's `claude/` folder so both stay in sync. Include everything the brief's DONE section lists. Use this shape and keep it short and factual, in the same plain style (short sentences, active voice, one name per thing):

```
# Signal Lance: Round <N> status report — "<short name>"

**Date:** <YYYY-MM-DD>
**Build:** `signal-lance/` TS project (~<lines> lines of src), `dist/signal-lance.html`, BUILD `<rN-sX>`
**Branch:** `main` (repo `FluKanuck/Signal-Lance`), commits <hashes>
**Live artifact:** https://claude.ai/artifact/NRNixsKxVrcMGNeYp6bB2o · testers: https://flukanuck.github.io/Signal-Lance/

## Purpose
<the round's one question, and why>

## Current status
- <the answer, in Jamie's words where possible>
- Closing check: <read-and-connect answer, or fun test n/5 (which ticked), or "not formally scored">
- Biggest thing still missing: <his closing line>

## What was built
<numbered list>

## Changes (from the TWEAK LOG)
| # | Symptom | Change | Result |
|---|---|---|---|

## Parked (not built)
<numbered list, including the "later" ideas>

## QA panel
<if it ran: batch name, sessions, clusters; the top 5 clusters (title, severity, reach); oracle-only bugs; device-only issues; links to claude/signal-lance-qa-<batch>.md and the triage page. If it didn't run: "not run".>

## Suggested next step
<one short paragraph for the design lead>
```

6. Close with one line: the report is saved (with the QA results, if they ran), and his next move is to start a design lead chat (the `signal-lance-design-lead` skill). It triages the QA findings with him.