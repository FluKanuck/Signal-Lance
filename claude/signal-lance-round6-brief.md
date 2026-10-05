# Signal Lance: Round 6 brief — "New home"

Read claude/code-agent-brief.md and claude/playtest-method.md, then follow this round brief.

## QUESTION
Can Signal Lance move into a permanent TypeScript project, with the game rules cleanly split from the drawing, and still play exactly like Round 5 on the same phone link?

## WHY
Round 5 showed the 1v1 duel is the ceiling, and the next step (Scale: more units per side) is the biggest yet. Jamie says this is the first project that feels like the basis of a real game. He wants to invest in it properly and avoid a costly port later, and plans an eventual move to Godot (around Gate 2). This round builds the permanent home and changes nothing about how the game plays.

## CHANGE
A straight port. **Zero gameplay changes:** same map, bot, temperaments, variants, pools, Signal, uplink, UI and every TUNE value. If the old file has a bug, port the bug and add it to the "later" list. Build in two steps. The game must be playable on the same artifact URL after each one.

### Step 1: Project and build
1. In repo `FluKanuck/Prototype`, branch `claude/signal-lance`, create the project in a `signal-lance/` folder: `package.json`, `tsconfig.json` (strict mode is fine, but don't spend time fighting types; `any` is acceptable during the port), and `vite.config.ts` using `vite-plugin-singlefile`.
2. Move the existing game code into `src/` as TypeScript, split along the file's existing section comments. At this step it's fine if rules and drawing are still mixed.
3. `TUNE` moves to `src/tune.ts` unchanged, with every comment kept.
4. The TWEAK LOG and ASSUMPTIONS blocks move verbatim to `signal-lance/NOTES.md`, which becomes their permanent home. Add an R6 row.
5. `npm run build` outputs one self-contained HTML file with no external assets. Commit the built file as `signal-lance/dist/signal-lance.html`, and republish it to https://claude.ai/artifact/NRNixsKxVrcMGNeYp6bB2o.
6. Leave the old root `signal-lance.html` untouched as a reference until the debrief confirms parity. After that, move it to `legacy/`.
7. Parity pass before reporting. Check that each of these still works on a phone-width landscape viewport: INTEL line, loadout screen, AP pips, Energy bar, CREEP/NORM/SPRINT previews and clipping, facing (free turn, then cost), FIRE with its blocked reasons, radar pulse, ECM, Signal bar and noise ring, damage read, UPLINK and its pips, WIN UPLINK / WIN KILL / loss screens, DBG overlay, COPY LOG, and the localStorage fallback.

### Step 2: Split rules from drawing
8. Arrange `src/` into:
   - `src/sim/`: pure game rules. This covers state, turn order, AP, Energy, Signal, movement and pathing, LoS, sensors and contacts, firing and damage, uplink, win checks, bot temperament and variant brains, and the map data. It has no DOM, canvas, `window` or `localStorage`, and no direct `Math.random`: randomness comes from a small seeded RNG passed in. Moves that run the real-time sim advance through `sim.step(dt)`.
   - `src/view/`: canvas rendering, HUD, touch and mouse input, camera, result screen and DBG overlay. The view reads sim state and sends commands (move, fire, radar, ECM, uplink, end turn). It never changes rule state directly.
   - `src/tune.ts` and `src/main.ts`: the wiring.
9. **Headless runner:** `npm run sim -- --games 20` runs complete games in Node using only `src/sim/`, with the bot against a simple scripted player (it walks to the uplink and fires when it can). It prints wins by type, average turns and any stalls over 80 turns. This is a dev tool that proves the split is real. It is not a test suite.
10. Show the run's seed in the DBG overlay only, so a strange run can be replayed in the runner.
11. Repeat the parity pass from item 7, rebuild, commit, and republish to the same URL.

## NOT IN THIS ROUND
- Any gameplay, balance or TUNE change, including bugs and the parked items (reactive bot, Heat, and so on)
- More units per side (that's Round 7)
- Godot, ECS, React or any other framework or library beyond Vite and its singlefile plugin
- CI, test suites, linters or formatter setup, git hooks
- Asset pipelines, sprites, art, sound, particles
- Saves, menus, settings, design documents
- Performance work beyond keeping the current steady frame rate

## DEBRIEF FOCUS
1. **Parity:** does anything play, look or feel different from Round 5? This covers touch targets, text size, frame rate, the timing of the bot's turn and the log.
2. **Loop speed:** is the edit → build → republish → phone loop still quick enough that Jamie would happily keep iterating on it?

## DONE
~5–10 runs played + fun test run (it should roughly match Round 5, about 3/5), then save the status report as
claude/signal-lance-round6.md. Include the headless runner's summary for 20 games in the report.
