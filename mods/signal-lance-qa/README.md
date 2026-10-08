# Signal Lance QA panel (Claude Code mod)

A lead agent runs a panel of tester agents that play the **real build in a browser** (iPhone, iPad and desktop, emulated by Playwright), each in a QA persona. They report what's broken, confusing, missing or awkward. The lead merges the findings into a report and a triage page. A live pane lets you watch the testers play.

The plan and the decisions behind it: [`claude/signal-lance-qa-harness.md`](../../claude/signal-lance-qa-harness.md).

## Install

```
/plugin install signal-lance-qa --marketplace FluKanuck/Signal-Lance
```

Then, once in the repo:

```sh
cd signal-lance && npm ci && npm run build:qa      # the QA build (window.__qa), in dist-qa/
cd ../mods/signal-lance-qa && npm ci                # Playwright for the tool
```

Chromium must be available to Playwright. Cloud sessions have it at `/opt/pw-browsers`; locally, run `npx playwright install chromium` once.

## Use

| You | What happens |
|---|---|
| "run the QA panel" / the `sl-qa` skill | The lead builds, plans a batch, launches testers 3–4 at a time, analyses, and writes `claude/signal-lance-qa-<batch>.md` plus a triage page |
| `/sl-qa-watch [batch]` | The watch pane: one row per tester (persona · model · device · screen · findings · budget), its last thought and action. **follow** a row for its live feed and latest screenshot (the screenshot shows in a terminal). **Pause** stops new testers starting; **Stop batch** ends the batch after the running ones. |

## Pieces

| Path | What it is |
|---|---|
| `signal-lance/src/view/qa.ts` | `window.__qa` in QA builds only. For testers: `view()` (what the player can see) and `fallback.*`. For the harness only: `oracle()`, `checks()`, `log()`, `save()` / `load()`, `events()` |
| `signal-lance/src/sim/invariants.ts` | The rule checks run after every tester action (Vitest-tested) |
| `tool/qa.mjs` + `server.mjs` + `core.mjs` | The tester's controller: `look`, `tap`, `drag`, `scroll`, `type`, `wait`, `fallback`, `note`, `think`, `end`. Writes `qa-runs/<batch>/…` and the live feed |
| `tool/plan.mjs` | Batch grids: `--preset core` (6 personas × 3 devices, short + long relays) and `--preset models` (Haiku vs Sonnet) |
| `tool/launch.mjs` | Starts one session and prints the tester's brief |
| `tool/collect.mjs` → `prompts/judge.md` (an Opus agent) → `tool/report.mjs` | Analysis: compact findings → clusters by root cause → report + page |
| `prompts/tester.md`, `personas/*.md` | How testers play and report, and who they are |
| `skills/sl-qa/SKILL.md`, `agents/qa-tester.md` | The lead's procedure and the tester agent type |
| `hooks/` | The watch pane |
| `scripts/smoke.mjs` | `npm run smoke`: the QA build answers on every device |

`qa-runs/` is not committed. Reports in `claude/` are.

## By hand

```sh
T=mods/signal-lance-qa/tool
node $T/launch.mjs --batch try --session me --persona breaker --model sonnet --device iphone --seed 101
node $T/qa.mjs me look --image
node $T/qa.mjs me tap CONTINUE
node $T/qa.mjs me end "done"
```
