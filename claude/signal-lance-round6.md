# Signal Lance: Round 6 status report — "New home"

**Date:** 2026-09-30
**Build:** `signal-lance/` project, TypeScript + Vite (about 1,590 lines: sim 800, view 470, plus tune, wiring, page and runner); built file `signal-lance/dist/signal-lance.html`
**Branch:** `claude/signal-lance` (repo `FluKanuck/Prototype`), commits `b261cc2` (step 1 port), `25bb2a2` (step 2 runner), `b2bf39f` (parity confirmed, old file to `legacy/`), `2c13363` (wrap)
**Live artifact:** https://claude.ai/artifact/NRNixsKxVrcMGNeYp6bB2o

## Purpose
Can Signal Lance move into a permanent TypeScript project, with the game rules split cleanly from the drawing, and still play exactly like Round 5 on the same phone link? This builds the long-term home before Round 7 (Scale), and keeps the rules ready to carry over to Godot later.

## Current status
- **Yes.** Jamie's debrief: weakest moment "It felt fine"; nothing played differently from Round 5. Loop speed: "Quick, same as before."
- Parity was also checked by machine. Old and new builds ran side by side under a fake clock (same rolls, scripted taps) and were pixel-identical at every checkpoint: loadout, INTEL, moves and previews, radar, ECM, zoom, DBG overlays and the BAIL result screen. The only difference is the DBG line, which now shows the seed.
- Fun test: **not formally scored.** Jamie wrapped after 1 run: "Nothing has changed since before" (Round 4 was 3/5; Round 5 not re-scored).
- Biggest thing still missing: not asked this round (wrapped early). Round 5's answer, "more variables on the board", still stands, since nothing about play changed.

## What was built
1. **Project:** `signal-lance/` with `package.json`, strict-off `tsconfig.json`, and `vite.config.ts` using `vite-plugin-singlefile`. `npm run build` outputs one self-contained HTML file with no external assets, republished to the same URL.
2. **`src/tune.ts`:** TUNE moved unchanged, every comment kept.
3. **`NOTES.md`:** TWEAK LOG and ASSUMPTIONS moved verbatim, plus R6 rows and a short layout guide.
4. **`src/sim/`** (pure rules; no DOM, canvas, `window`, `localStorage` or `Math.random`): `world.ts` (map, reachability, LoS, A*), `state.ts` (G, newHunt, rollEnemy, hooks), `turns.ts` (turns, AP/Energy/Signal, moves, radar, shots, uplink, `step(dt)` and the player commands), `sensors.ts`, `bot.ts`, `rng.ts` (seeded mulberry32).
5. **`src/view/`:** `render.ts`, `hud.ts`, `input.ts`, `screens.ts` (loadout, result, run log, localStorage with in-memory fallback), and `state.ts` (camera, zoom, DBG and other view-only state). The view sends commands (move, fire, radar, ECM, ghost, uplink, face, end turn) and never changes rule state directly. The sim reports back through three hooks: sync, end and playerHit.
6. **Seed:** a new seed is picked each time the loadout screen opens. It fixes temperament, variant, uplink point, enemy spawn and guard post, and it's shown on the DBG line only.
7. **Headless runner:** `npm run sim -- --games 20` plays whole games in Node from `src/sim/` only (bot vs a scripted player that walks to the uplink, uplinks and fires when it can). `--seed N` replays one seed, `-v` prints each turn. It runs in under half a second and gives the same result every time.
8. **Old file:** the root `signal-lance.html` moved to `legacy/` after the debrief confirmed parity.

### Headless runner, 20 games (seeds 1–20, default loadout)
| Result | Games |
|---|---|
| WIN UPLINK | 9 |
| WIN KILL | 4 |
| LOSS | 7 |
| Stalls over 80 turns | 0 |

Average length: 8.2 turns (finished games). The scripted player is deliberately dumb, so the win rate measures the runner, not balance.

## Changes (from the TWEAK LOG)
| # | Symptom | Change | Result |
|---|---|---|---|
| step 1 | Permanent home needed before Scale | Port to TypeScript + Vite, sim/view split, seeded RNG; no TUNE or gameplay change | Pixel-identical to Round 5 in the side-by-side check |
| step 2 | Prove the split is real | Headless runner `npm run sim`; seed shown in DBG | 20 games, no stalls, deterministic |
| run 1 | "It felt fine"; loop "quick, same as before" | None; old file moved to `legacy/` | Parity confirmed |

## Parked (not built)
1. Bugs ported on purpose (not fixed): the very first hidden hunt at page load runs before any roll (seed 1, uplink at 0,0). It's never seen, because the loadout screen covers it.
2. The side-by-side check never reached a shootout, so fire, hits, WIN and LOSS were only exercised by the headless runner, not compared on screen. Jamie's run showed nothing off.
3. In-hunt rolls (bearing error, radar jitter, patience) only replay exactly if the player's moves match too; a seed fully fixes the setup, not a whole hand-played run.
4. Later ideas: a smarter scripted player in the runner (creep, radar, ECM) to give balance numbers for Round 7; tighter TypeScript types once the code settles.
5. Carried over from Round 5, unchanged: city zones, Signal-hiding areas, IR, unit types, several units a side with initiative, more victory conditions, OSINT dashboard, reactive bot, Heat, RWR, and the rest of the Round 5 list.

## Suggested next step
The new home is ready, and nothing about play changed, so Round 5's diagnosis still holds: "1v1 decides it all" and what's missing is "more variables on the board." Round 7 (Scale) can now start from a clean base. Rules go in `sim/` and can be checked headless before Jamie plays. One cheap win: extend the runner to field two units a side, so stalls and lopsided outcomes show up in seconds rather than in a playtest. Keep the step split proposed in Round 5: two player units against the current bot first, then a second enemy.
