# QA panel: Haiku 5.5 vs Sonnet 5.5 as testers

**Date:** 2026-10-08 · **Batch:** `r23-models-1008` · **Build:** r23-s5 (QA build) · **Full report:** [`signal-lance-qa-r23-models-1008.md`](signal-lance-qa-r23-models-1008.md) · **Page:** https://claude.ai/artifact/XfsAxaBQPLQdrkmqWQQB36

Step 4 of [`signal-lance-qa-harness.md`](signal-lance-qa-harness.md): the same personas, seeds, device and budget, with only the model changed.

## Setup

- **Sessions:** 7 per model (14 in all).
  - 3 personas (fresh recruit, breaker, tactics veteran) × 2 seeds (101, 202): 12 short sessions.
  - 1 long campaign hand (seed 1001) per model.
- **Device:** iPhone landscape.
- **Budget:** 80 actions and 30 screenshots per short session (60 / 20 for the long hand), the same for both models.
- **Judging:**
  - The Opus judge merged all 93 findings into 32 clusters.
  - A second Opus pass scored every finding **blind**: the model, persona and session were stripped and the order shuffled. Each finding got 0–2 for *real*, *actionable* and *insight*.

## Results

| | Haiku 5.5 | Sonnet 5.5 |
|---|---|---|
| Notes per session | **9.9** | 3.4 |
| Real and correctly described (blind, 2) | **46** | 15 |
| Wrong or a tool artifact (blind, 0) | 9 (13%) | **1 (4%)** |
| Avg real / actionable / insight (blind, 0–2) | 1.54 / **1.48** / **0.52** | **1.58** / 1.25 / 0.38 |
| High-insight findings (blind, 2) | **4** | 1 |
| Clusters it reported | **28** of 32 | 13 of 32 |
| Clusters only this model found (major or worse) | **19 (6)** | 4 (2) |
| Avg actions / screenshots used | 47 / **27 of 30** (3 hit the cap) | 47 / 16 |
| Reached a hunt result screen | 1 of 7 | 2 of 7 |

- **Haiku 5.5 does more than expected.** At the same budget it filed three times as many correct findings. Per finding it was as often right as Sonnet (1.54 vs 1.58), and more actionable. It found 19 problems Sonnet never reported, 6 of them major.
- **Haiku's cost is more wrong claims.** 9 of 69 were wrong, and most of those rest on a known tool artifact (it read the screen mid-move and reported "MOVE spent all AP for one tile"; now fixed). It also spends screenshots fast; three sessions ran out.
- **Sonnet is quieter and more precise,** but under-reports. Several of its summaries name problems it never filed as notes; the tester prompt now asks for notes as you go. Its tactics veteran had the best per-finding insight (0.83 over 6 findings).
- **Neither model reached the end of many hunts in 80 actions.** Hunts are long (objectives 20–30 tiles away, three suits each activating separately). Budgets are now 140 / 110 actions.

**Caveats:**
- 7 sessions per model, 2 seeds, one device: a strong signal, not a precise measure.
- The first wave (seed 101: fresh recruit and breaker) ran as general-purpose agents and the rest as the restricted `qa-tester` agent, with the same prompt for both. Six seed-202 / tactics-veteran sessions were re-run after an interrupt.

## Recommendation (applied to the core batch)

| Persona | Model | Why |
|---|---|---|
| Fresh recruit | **Haiku** | Breadth of first-time confusion; Haiku found more and was as accurate |
| Thumb on the bus | **Haiku** | The same kind of surface-level, high-volume findings |
| Breaker | **Haiku** | Already Haiku; the comparison backs it |
| Tactics veteran | Sonnet | Highest insight per finding came from Sonnet here |
| Accessibility | Sonnet | Not tested in this batch; it relies on careful visual reading, so it stays on Sonnet until compared |
| Round designer | Sonnet | Judging the build against the brief needs more reasoning; not tested here |

Haiku testers get 40 screenshots (Sonnet 35) because they use them faster. The judge and the lead stay Opus.

**Run the comparison again** when a new model drops, or for accessibility and round designer once they have a baseline: `node mods/signal-lance-qa/tool/plan.mjs --batch <B> --preset models`.

## Found on the way

The batch found real problems in R23. The full list is in the report; the top five:
1. Quitting a hunt drops you on the company map with credits gone and no explanation (7 of 14 runs). **Fixed** on this branch: a bailed contract now shows its result screen.
2. On iPhone, the hunt HUD text and buttons cover much of the map (6 runs).
3. The pre-hunt scan screen doesn't say what to do (4 runs).
4. Blocked buttons (FIRE LOS / RANGE, ECM SNS, UPLINK RANGE) do nothing and give no reason (6 runs).
5. Key buttons sit below the fold on iPhone (TAKE IT, CONTINUE, CARD's CLOSE, BASICS' BACK) (5 runs).
