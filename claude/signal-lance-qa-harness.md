# Signal Lance QA panel: plan

**Status:** plan agreed 2026-10-08. Step 1 (the `__qa` hook) is in progress. Decision 8 (models) waits on step 4. Branch `claude/charming-franklin-tmygre`.

A Claude Code mod in which one lead agent runs a panel of tester agents. The testers play the built game in a real browser, each in a QA persona. They report what's missing, what's confusing, what UI/UX could be better and what's broken. The lead runs many short and long sessions, merges duplicate findings, and writes a report the design lead can read.

The QA panel complements the headless runner (`npm run sim`), which answers the numbers questions (win rates, economy curves). The panel answers what the runner can't: whether things read clearly, whether something is missing, whether controls feel right, and whether the screen matches the rules.

## Decisions (2026-10-08, Jamie)

| # | Question | Choice |
|---|---|---|
| 1 | Where it runs | **Claude Code plugin** in `mods/` on the subscription. The lead and testers are subagents. The core (game hook + playtest tool) is kept separate so a standalone Agent SDK CLI can reuse it later. |
| 2 | How testers drive the game | **Our own small tool built on Playwright**. Not the stock Playwright MCP, and not computer use. |
| 3 | What testers can see | **Only what the player can see**, through `__qa.view()`. **The harness also reads the hidden state from v1** through `__qa.oracle()` / `__qa.checks()`, which testers never get. |
| 4 | How testers act | **Real taps first.** After 2 failed tries, a tester may use a hook fallback command. Every fallback is logged as an input-friction finding. |
| 5 | What testers know | **About 60% blind** (no docs), **25% returning** (given a primer from earlier batches), **15% briefed** (given the round brief). |
| 6 | Session length | **Split**: short single-mission sessions and long campaign (company / city) runs, done as relays. |
| 7 | Seeds | **A fixed core set plus a few random ones** per batch. Every seed is recorded. |
| 8 | Models | **Provisional:** **Haiku** for broad "click everything" bug hunts, **Sonnet** for the persona testers, **Opus** for the lead, merging duplicate findings and the report. Haiku 5.5 and Sonnet 5.5 are new, so step 4 (the model comparison) decides the tester split from evidence. Haiku 5.5 may be able to do more of the persona work. |
| 9 | Personas | **Six fixed core personas, plus one per batch made by the lead** to fill a coverage gap. |
| 10 | Output | **Markdown report** in `claude/` plus an **interactive web page** (filters, screenshot gallery, triage). |
| 11 | When it runs | **On demand** (`/sl-qa`) first, then a step of the build round once it has proved useful. |
| 12 | Screen sizes | **An even split** of iPhone landscape, iPad and desktop. |

## What the research says (summary)

- **Each run finds only part of the bugs.** In the GBQA benchmark (2026), the best model found about 48% of known bugs. Many varied short runs beat a few long ones, and the result is a pile of strong leads, not a complete audit.
- **Vision models handle static frames better than motion.** They're good at obvious glitches, layout, clipping and readability. They're weak at subtle regressions and temporal glitches like animation feel. Aim testers at what a screenshot or a short sequence shows.
- **A compact state summary beats raw pixels** (TITAN, 2025). That is the job of `__qa.view()`; screenshots are kept for visual judgement.
- **Screenshot cost.** About ⌈W/28⌉ × ⌈H/28⌉ tokens, so 1280×720 ≈ 1.2k. Resize before sending, because images that are too large are rejected rather than shrunk.
- **Merging duplicates.** Pull out the key fields (screen, element, symptom), shortlist likely duplicates cheaply, then have a strong model decide whether two findings share a root cause. Comparing every pair is too expensive.
- **The canvas is invisible to the page reader.** The DOM menus can be read as text; the battlefield needs screenshots or the hook.

## Architecture

```
/sl-qa  ──► LEAD (Opus subagent)  plans the batch grid, watches the progress table, re-plans gaps, never plays
               │  spawns, 3–5 at a time
               ▼
            TESTER (Haiku | Sonnet subagent, one persona × seed × device × length)
               │  its only tools: the playtest tool's actions
               ▼
            PLAYTEST TOOL (Node + Playwright, one isolated browser context per tester)
               │  page.evaluate
               ▼
            GAME, QA build (dist-qa/signal-lance.html) with window.__qa
               ├─ view()      what the player can see      → tester
               ├─ fallback.*  input fallbacks (logged)     → tester, after 2 failed taps
               ├─ oracle()    hidden truth                 → harness only
               └─ checks()    rule and HUD invariants      → harness only, after every action

FILES (the memory; nothing big lives in any context)
  qa-runs/<batch>/plan.json                the grid
  qa-runs/<batch>/<session>/findings.jsonl one finding per line, auto-stamped
  qa-runs/<batch>/<session>/shots/*.png    every screenshot taken
  qa-runs/<batch>/<session>/notebook.md    the tester's running notes (relay hand-off)
  qa-runs/<batch>/<session>/oracle.jsonl   checks() violations + state at each finding
  qa-runs/<batch>/<session>/save-<k>.json  localStorage snapshot at relay checkpoint k
  qa-runs/<batch>/progress.json            what the lead reads
  qa-runs/<batch>/clusters.json            merged findings
  claude/signal-lance-qa-r<N>.md           the report
```

### 1. The `__qa` hook (step 1)

- **Test builds only.** It's included only in builds made with `npm run build:qa` (Vite `--mode qa`, which sets `__QA__`) and goes to `dist-qa/`. In the normal build `__QA__` is `false`, the import is dropped, and `docs/` never contains it.
- **Rules split.** The pure invariant checks live in `src/sim/invariants.ts`, which has no DOM and is Vitest-tested. Everything that touches the DOM lives in `src/view/qa.ts`.

| Call | Who | Returns |
|---|---|---|
| `view()` | tester | `screen` (open panels), `mode`, `phase`, `turn`, `myMove`, the active suit's AP / EN / parts, own suits and current contacts with **screen** positions (only what is drawn), objective and extraction on screen, visible buttons (`id`, text, enabled, centre), HUD text |
| `fallback.target(sx,sy)` / `.select(contactId)` / `.face(sx,sy)` / `.ghost(sx,sy)` / `.mortarAt(sx,sy)` | tester | does the canvas action a tap would do, counts it, and logs a `[QA] FALLBACK` line |
| `oracle()` | harness | the hidden state: every field unit (type, variant, position, hits, state, dead), seed / mission / composition, contract and company books, RNG seed |
| `checks()` | harness | rule invariants (`invariants.ts`) plus DOM checks (HUD AP pips = the suit's AP, at most one main panel open, no NaN on screen) → a list of violation strings |
| `log()` | harness | the run log (`signalLance.log`) |
| `save()` / `load(snap)` | harness | snapshot and restore of every `signalLance.*` localStorage key (relay checkpoints, repeatable campaign starts) |
| `events()` | harness | a counter of activations, hunt ends, syncs and fallbacks since the last call (waiting and pacing) |

**Seeding the campaign:** contract and company seeds come from `Math.random` in the view. The tool replaces `Math.random` with a seeded generator through Playwright's `addInitScript` before the page loads, so a campaign run is repeatable from its batch seed. No change to the game is needed.

### 2. The playtest tool (step 2)

A small stdio MCP server in `mods/signal-lance-qa/` built on `playwright` (Node). It runs one browser per tester and a fresh context per session.
- **Devices:** iPhone 15 landscape (touch), iPad Pro 11 landscape (touch), desktop 1440×900 (mouse).
- Tester tools (deliberately few):
  - `look(detail?)`: a screenshot downscaled to ≤1280 px on the long edge, plus a compact `view()`. Text-only `look({image:false})` is cheap.
  - `tap(target)`, where target is a button id or label like `"DROP"`, or `{x,y}` screen coordinates.
  - `drag(path)`: draw a path or move the camera.
  - `type(text)`
  - `wait_for_my_turn(timeout)`: polls `view().myMove`, returns early on a hunt end or an open panel.
  - `fallback(action, args)`: refused until 2 failed tries are recorded for that intent.
  - `note({category, severity, title, what_i_did, expected, actual, where})`
    - category: `bug | ux | confusing | missing | visual | balance-feel`
    - severity: `blocker | major | minor | polish`
  - `notebook(append)`
  - `end(summary)`
- **Stamped automatically on every note:** batch / session / persona / device / build / seed / step number, the last screenshot path, the last 15 log lines, `oracle()` state and any `checks()` violations at that moment.
- **Run by the harness after every action:** `checks()`. A new violation is written as a `source: oracle` finding without the tester being told (keeping its clarity judgement honest).
- **Budgets per session** (enforced in the tool; past the cap the tool returns "end now"):

| | Max actions | Max screenshots |
|---|---|---|
| Haiku | 120 | 40 |
| Sonnet short | 80 | 30 |
| Sonnet long | 60 per relay hand | 20 per relay hand |

### 3. Testers

- **Persona cards** are in `mods/signal-lance-qa/personas/*.md`, one page each: who they are, what they notice, what they ignore, how they play, and a "say it like this" example finding.

| Persona | Model | Knowledge | Leans toward |
|---|---|---|---|
| Fresh recruit (has never played) | Sonnet | blind | onboarding, jargon, "what do I do now", missing feedback |
| Tactics veteran (XCOM, Battletech) | Sonnet | returning | depth, information you can't get, decisions that don't matter, AI that does dumb things |
| Thumb on the bus (impatient phone player) | Sonnet | blind | tap targets, too many taps, text size, slow flows, one-handed use |
| Breaker (tries everything) | Haiku | blind | bugs: spam taps, back out mid-flow, odd orders, rotate, resize |
| Accessibility reviewer | Sonnet | blind | contrast, colour-only meaning, text size, time pressure, motion |
| Round designer | Sonnet | briefed | "the brief says X, the build does Y", the round's question, the tester splash |
| Lead-made persona (one per batch) | Sonnet | any | a gap the coverage table shows |

- **Blind** testers get only the game, plus the gameplay basics screen if they find it. **Returning** testers get a primer: the top confusions from the last report, already answered, so they get past onboarding fast. **Briefed** testers get the round brief and `brief.ts` TEST.
- **The tester prompt** (shared, under the persona card):
  - play like the persona
  - think aloud in the notebook, not in chat
  - `note` every finding the moment you see it
  - one issue per note
  - say what you did and what you expected
  - real taps first
  - end with a summary of 150 words or less

### 4. Long sessions as relays

A long session is a company / city campaign played across several hands:
1. Hand 1 starts a company from the batch seed and plays until the first contract ends, or until its budget runs out.
2. At a checkpoint (the end of a hunt or contract), the tool saves `save()` and the tester finishes its notebook entry: where it is, what it's trying, what's bugged it so far, open questions.
3. Hand k+1 is a fresh subagent with the same persona. It gets `load(save)`, the notebook, and the instruction "carry on, and notice what changes over time". No transcript is carried over.
4. Long-run questions are asked across the relay: "did contract 3 feel different from contract 1?", "is money / fuel / standing making sense?".

About 3 hands per long session to start.

### 5. The lead and the batch

- **Grid:** persona × device × length × seed. First batch: 6 core personas × 3 devices = 18 sessions, 9 short and 9 long (relays), on 3 fixed mission seeds plus 3 fixed campaign seeds plus 1 random of each.
- 3–5 testers run at a time. The lead only reads `progress.json`: sessions done, findings per category / severity / persona / device, coverage gaps (screens never opened, buttons never tapped, mission types never played).
- After each wave the lead may add the batch's extra persona, or re-run a seed on another device to confirm a device-only finding.
- **Fixed seeds live in** `mods/signal-lance-qa/seeds.json` and change only on purpose, so builds stay comparable.

### 6. Analysis and the report

1. **Normalise.** A Haiku pass rewrites each finding to fixed fields: screen, element, symptom, category, severity.
2. **Shortlist.** Group by screen and element, plus word similarity on the symptom.
3. **Judge.** An Opus pass per group decides "same root cause?" → clusters, each with a count of sessions, personas and devices.
4. **Verify.** For clusters marked `bug`, check against the oracle stamps. If the stamps contradict the claim, it's marked `unconfirmed (oracle disagrees)`. If an oracle violation backs it, it's `confirmed`.
5. **Report.** `claude/signal-lance-qa-r<N>.md`:
   - header (build, batch, sessions, cost proxy)
   - top 10 by reach × severity
   - by category (missing / UX / confusing / bugs / visual)
   - device-only issues
   - oracle-only bugs (nobody noticed them)
   - what changed since the last QA batch (fixed seeds)
   - repro lines ready for PLAY SEED
6. **Web page.** The same data with filters, screenshots inline and a triage state per cluster.

## Context management (summary)

- **Tester:** screenshots only on `look`, and downscaled. Text-only looks for routine checks. Findings go to files the moment they're noted. Budgets cap the session. Relays reset context at checkpoints, and the notebook carries what matters.
- **Lead:** never sees transcripts or screenshots, only `progress.json` and the summaries of 150 words or less.
- **Analysis:** works in batches over JSONL files, one group per call.

## Build steps

1. **The `__qa` hook.** `invariants.ts` + test, `view/qa.ts`, `build:qa` / `dev:qa`, `dist-qa/` ignored. Done when `npm run check`, `npm test` and `npm run build:qa` pass, the normal build has no `__qa`, and a scripted Playwright smoke test can read `view()` and `checks()` through a hunt.
2. **The playtest tool.** An MCP server + device profiles + budgets + stamping + seeded `Math.random`. Done when one scripted session plays a hunt on each device and writes a finding.
3. **One tester.** Persona cards + tester prompt. One Sonnet fresh-recruit session, start to finish, and its findings read by hand.
4. **Model comparison (Haiku 5.5 vs Sonnet 5.5).** Same personas, seeds and devices, with only the model changed. 3 personas (fresh recruit, breaker, tactics veteran) × 2 seeds × 2 models = 12 short sessions, plus 1 relay hand each on one campaign seed.
   - **Measured per session:** the number of findings; valid findings (an Opus judge reviews them blind to the model, against screenshots and oracle stamps); false claims (the oracle disagrees); unique valid findings (found only by that model); severity mix; how far it got (screens reached, hunts finished); actions / screenshots / turns used; and how often it used the fallback.
   - **Measured over the whole run:** the share of `checks()` violations it ran into that it also noticed.
   - **Report:** `claude/signal-lance-qa-models.md` with a recommended tester split per persona. Decision 8 is updated from it. Re-run when a new model drops.
5. **Relays.** Checkpoint, save and hand-off. One 3-hand campaign run.
6. **The lead + `/sl-qa`.** Grid, waves, progress table, one extra persona, plugin wiring next to the existing `signal-lance` mod.
7. **Analysis + report + web page.** The first full 18-session batch.
8. **(Later)** a step in `signal-lance-build-round`; a standalone Agent SDK CLI for unattended runs.

## Open items

- **Cost proxy:** the plugin path has no per-tester dollar figure. Record actions, screenshots and turns per session instead.
- Whether one Claude Code session can comfortably hold 18 subagent sessions plus analysis inside usage limits. We find out in step 6.
- Playwright needs to be added as a dev dependency of the mod (not the game). This is outside the code brief's allowed tooling list, so it's noted here as approved by this plan.
