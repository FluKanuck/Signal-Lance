# Signal Lance: Round 25 brief — "Live toy"

Read claude/code-agent-brief.md and claude/playtest-method.md, then follow this round brief.

## QUESTION
Does live time with auto-pause, on free movement, make the hunt flow without losing the feeling of a plan?

## WHY
- R24 made the hunt readable. The top QA cluster is now pacing: "hunts are long walks" (11 sessions), with rounds where nothing happens.
- The long-term vision has always been real time with active pause. R17 already moved the controls to Door Kickers style, and the interrupt "saved me".
- Jamie names Iron Mirage (aeoriii.itch.io/ironmirage) as the feel he wants. He likes four things about it: the tension of watching orders play out, the flow, the mood, and how it makes you read the field. Slower live time also leaves room for deeper sensor work later.
- History to respect: R2 real time became FIRE-mashing on the phone. R3 WEGO "felt like guessing" (0/5). R4 I-go-you-go turns felt "like a plan" (3/5). Live mode must keep the plan and never ask for fast fingers.

## CHANGE
This is a **separate toy page**. The main game stays as it is.

### 0. The toy page (applies to every checkpoint)
1. Build the toy as its own self-contained file, `dist/signal-lance-live.html`. It gets its own Vite config, following `vite.toy.config.ts` (the building toy). Publish it on Pages under `docs/live/` and as a new artifact. Do not republish it to the main artifact URL.
2. The main game page, its saves, its BUILD tag and its splash do not change.
3. Live-only rules go in new files (for example `src/sim/live.ts`, `src/sim/freepos.ts`, `src/view/live/`). Shared sim code changes only where it must, behind `TUNE.TIME_MODE` (`'turns'` default, `'live'` on the toy page) and `TUNE.FREE_POS` (`false` default).
4. **Parity proof:** at every checkpoint, `npm run sim -- --contracts 20 --check` in turns mode stays byte-identical to r24-s4. Same rule as R18.
5. The toy has its own save slot and its own company. It never reads or writes the main game's storage keys.
6. Same seeds on both pages. PLAY SEED works on both, so Jamie can play one hunt both ways.
7. The toy's splash says **LIVE TOY** with the round question, and links back to the main game. BASICS on the toy page covers live time, pause, auto-pause and free movement.
8. Scope: the hunt is live. Scan, refit, books and city screens stay as they are on the toy page.

### Checkpoint A — Live time (playable stop)
1. One continuous clock runs the hunt. Tap PAUSE (a large button and the space bar) to stop or start it at any time. While paused, every order works: drawn routes, looks, FIRE, radar, ECM, UPLINK, PICK UP.
2. **Actions take time. AP goes away on the toy page.**
   - Moving runs at the move mode's speed (`CREEP_SPEED`, `PLAYER_SPEED`, `SPRINT_SPEED`). Energy per tile (`MOVE_ENERGY_PER_TILE`) is unchanged.
   - Each action that cost AP gets a duration, during which that ExoS does nothing else. New knobs: `LIVE_ACT_TIME` (seconds per action: UPLINK, PICK UP, HAND OFF, ECM switch-on, a radar pulse). Start from `AP × SEC_PER_TURN ÷ AP_PER_TURN` and note it in ASSUMPTIONS.
   - Energy refills every second: `ENERGY_REGEN ÷ SEC_PER_TURN` per second, or the reactor's regen at the same rate. Upkeep that was per turn (ECM `ECM_EN`) becomes per second at the same rate.
3. Orders queue per ExoS. A new order replaces the current one, unless it is a look.
4. On the HUD, a thin progress ring on each ExoS shows its current action. The turn counter becomes a clock (mm:ss).
5. The after-action list (Learn why) uses clock times (`← 01:42`) instead of turn numbers on the toy page.
6. At this checkpoint the enemy may still act in short timed bursts. Checkpoint B makes it continuous.

### Checkpoint B — It pauses for you (playable stop)
1. **Enemies act all the time,** with the same brains, pack and temperaments. Their decisions run on a timer (`LIVE_ENEMY_THINK`, seconds), not once a turn. Their actions take time on the same rules as yours.
2. **Firing:** an aim time (`LIVE_AIM_TIME`), then the shot, then a cooldown (`LIVE_FIRE_COOLDOWN`). The to-hit roll is unchanged. "Moved" counts if the shooter moved within the last `LIVE_MOVED_WINDOW` seconds. You give FIRE orders while paused or live. An ExoS can hold a target and fire again by itself when its cooldown ends (`LIVE_AUTO_REFIRE`, default on). That makes the phone never ask for fast taps.
3. **Auto-pause.** The game pauses by itself on four triggers, each with its own on/off in TUNE and on the toy's settings screen:
   - `AUTOPAUSE_CONTACT`: a new contact. The same events as today's `MOVE_INTERRUPT`.
   - `AUTOPAUSE_FIRE`: one of your ExoS is shot at, hit or not.
   - `AUTOPAUSE_IDLE`: an ExoS reaches the end of its route or finishes its order.
   - `AUTOPAUSE_OBJECTIVE`: cargo is grabbed or dropped, the uplink is gained or lost, or the transport takes a hit.
4. **The track rule (Jamie):** a loose track jumps around, so it must not pause the game again and again.
   - A contact pauses the game **once**, when it first appears.
   - A loose track that moves or corrects itself never pauses it again.
   - It pauses again only if it **firms up into a fixed track**, or if it was lost for `AUTOPAUSE_RELOST` seconds and then comes back.
   - A Vitest check covers each case.
5. Each auto-pause shows a short cue saying why it stopped, in the house words (for example "PAUSED: NEW CONTACT"). The cue reads its text from the glossary.
6. The runner gets a live mode (`--live`), with a scripted lance that gives orders at each auto-pause. Report contract and hunt numbers for live against turns on the same seeds.

### Checkpoint C — Off the grid (playable stop)
1. With `FREE_POS` on, ExoS and enemies have a free position (x, y as real numbers). Tiles stay as the map's terrain and zones only.
2. Line of sight, cover, sensors, sound and range all work from exact points, not tile centres. Cover comes from the wall between the shooter and the target, as now, measured from the points.
3. Pathing gives a smooth route around walls (for example tile A* plus string-pulling, or any simple method). It must not hug the corner of each tile.
4. Units cannot overlap (`LIVE_UNIT_RADIUS`).
5. Every interrupt and auto-pause stops a unit where it is, not at the next tile.
6. The test bed scenarios load with free positions on the toy page.

### Checkpoint D — The path tool (playable stop)
1. A drawn line is kept as drawn: smoothed (`PATH_SMOOTH`), never snapped to tiles. The ExoS walks that line continuously. If the line crosses a wall, the route bends around the wall at the nearest point and shows the bend before you commit.
2. Touch tracking: the line follows the finger with no lag. The start of a drag works from anywhere on the ExoS. A short drag is not read as a tap.
3. The end handle and the look markers work at free positions. A look marker can sit anywhere on the line, not only on tile steps.
4. The route preview shows where the move will stop if Energy runs out (this also closes QA C01 / parked #111 on the toy page).
5. Mouse still works on desktop.

### Words
New terms need a glossary entry and a long-press line in the house standard (`.claude/skills/signal-lance-writing/SKILL.md`): PAUSE, auto-pause and each of its four reasons, aim time, cooldown, fixed track and loose track (check that the glossary already uses these names), and LIVE TOY. Run the linter on all changed text.

## NOT IN THIS ROUND
- Live SIGINT from the ship that runs on into the hunt (the hot drop). It waits on this round.
- Tuning sensors on the go (gain, band, focus).
- Speed controls past pause (no 2× or slow motion).
- Balance passes past what makes live mode playable. Log rough edges in "later".
- Live scan, refit, books or city screens.
- Merging the toy into the main game. That is a later decision.
- Free positions on the main game page.

## DEBRIEF FOCUS
1. Pacing: did the long walks go away? Did you ever feel rushed or reach for fast taps on the phone (the R2 problem)?
2. Plan: which page felt more like "watch my plan play out", the live toy or the main game? At C and D: did free movement change how you used cover and angles?

## FIX LIST
None this round. The R24 QA report (`claude/signal-lance-qa-r24-core-1008.md`) is not yet triaged. It stays for the design lead, and its fixes go to the main game, not the toy.

## TEST BED
Write 3 scenarios that load on the toy page:
- **"Hold your fire"**: one ExoS, two loose tracks that jump about, one that firms up. Tap question: "Did the game stop when it mattered, and not more?"
- **"Long street"**: an empty district with one turret at the far end. Tap question: "Did the walk drag?"
- **"Round the corner"** (C/D): a wall with a gap, a contact behind it. Tap question: "Could you draw the line you wanted?"

## DONE
- Checkpoints A to D each shipped as a playable toy page, with the turns-mode runner check byte-identical at each one.
- Jamie plays the same seeds on both pages (~10 hunts in total across both), then runs the fun test on the live toy.
- QA panel on the final toy build (sl-qa, core preset, toy URL), to compare with r24-core-1008.
- Save the status report as `claude/signal-lance-round25.md`.

If C or D runs long, stop at B and report: A and B already answer "live or turns?".
