# Signal Lance: Round 16 brief — "Rolled ground"

Read claude/code-agent-brief.md and claude/playtest-method.md, then follow this round brief.

**Context:** this is the second component of the **whole-loop slice** (see "The slice" in `claude/signal-lance-roadmap.md`): row 2b, **block maps**, pulled in ahead of suit building because R15's Retrieve hit its trigger ("only one sensible route… I would have changed route"). **There is no fun test this round.** The check is "does it read and connect?". It can be built in one go, using tune flags (`MAP_MODE`, `CLUTTER_*`) so Jamie can compare the old map and play the parts on their own.

## QUESTION
When every hunt rolls a new map, do routes stop feeling solved, so that where you go becomes part of reading the field?

## WHY
R15: missions now make the read change the plan (3/3 new types), but the single fixed 72×24 map caps the "how" and the route. Retrieve had "really only one sensible route". Jamie (R16 scoping): random grid sizes, "lots of variations… some real variety", with blocks that carry modifiers that may or may not spawn.

## CHANGE
Keep everything from Round 15 (all four mission types, variants, card and ID, test bed, Sound/Emissions, pack, contracts) unless it's listed here. Rules go in `src/sim/` first, then the view.

### The map becomes per-hunt
1. **Map size is per-hunt state.** `W`, `H` and `N` in `sim/world.ts` are module constants today. Make them part of the hunt's map (seeded by the hunt), and have every reader (sim, runner, view, camera, minimap or DBG) use the current map's size. The extraction is still the rightmost `EXTRACT_COLS` columns, and the player still spawns on the left edge, mid-height (nearest open tile). The camera has to pan in both directions on tall maps.
2. **`MAP_MODE`** in TUNE: `'blocks'` (default) or `'hive'`. `'hive'` plays today's `MAP_SRC` with its hand-placed anchors, as the control.

### Blocks
3. **Block library:** about 8 hand-drawn blocks, each `BLOCK_SIZE` (12) square, in a new `src/sim/blocks.ts`. Make them distinct: an open plaza, tight alleys, a walled yard with one gate, a long avenue, a cluttered lot, a dense warren, and so on. Draw them in the same `#` / `.` text style as `MAP_SRC`.
4. **Blocks always join:** every block keeps a 1-tile open street ring on its border, or at least an open street at the middle of each edge, so any arrangement connects. After assembling, check that every open tile the mission needs can be reached from the spawn (`canReach`). If it fails, reroll with the next seed.
5. **Each block carries its own anchors**, in block-local coordinates and merged into the hunt's anchors table (`MAP_ANCHORS` shape, so `anchors()` keeps working): uplink/cargo spots (with a name, e.g. "yard gate"), and **modifier slots** (below).
6. **Rotation and mirroring** (if cheap): a block may be placed rotated or mirrored, seeded. This multiplies the variety. Skip it if it gets fiddly, and note that in ASSUMPTIONS.

### The grid
7. **Random grid size:** each hunt rolls a grid from `MAP_GRIDS` (start: `['6x2', '5x2', '4x2', '4x3', '3x3', '5x3', '4x4']`, columns × rows), seeded and even. It's rejected if it has fewer than `MAP_MIN_BLOCKS` (start 8). Blocks are drawn from the library with repeats allowed, but never the same block twice in a row (horizontally or vertically).
8. **The field scales with size:** a bigger map with the same field feels empty. `FIELD_SCALE_BY_AREA` (true) scales the composition's unit count by map area ÷ 1,728 (today's area), rounded, and never below the composition's own count. Note what it does to the runner win rates.
9. **INTEL shows the grid** (e.g. "4×3 district, 48×36") on the job card, so a bigger map is something you prep for.

### Modifiers (may or may not spawn)
Each block has a few modifier slots. Each slot rolls `MOD_SPAWN_CHANCE` (start 0.5) per hunt. There are three kinds, and **all of them reuse existing rules except clutter's one new effect**:

10. **Sound zone:** the slot is a centre for the existing QUIET/NOISE zones (`ZONE_TYPES`, `ZONE_RADIUS`). On block maps, zones roll from these slots instead of `ZONE_CANDIDATES`. Keep `ZONE_COUNT_MIN`/`MAX` and `ZONE_UPLINK_NEAR`, scaled by area if needed.
11. **Set piece:** a small solid object (2×2 to 3×4, e.g. a fallen gantry, container stack or dead vehicle) drawn as wall: it blocks movement and line of sight. It's placed only if reachability (item 4) still holds.
12. **Ground clutter:** a patch of clutter tiles (scrap, glass, rubble), drawn as its own tile, e.g. `,`. It doesn't block line of sight, but:
    - **Low cover:** clutter counts as a wall for the existing cover rule (`COVER_GRAZE`, `COVER_RANGE`).
    - **NEW, slow:** each clutter tile entered costs `CLUTTER_TILE_COST` tiles of movement (start 2; 1 = off).
    - **NEW, noisy:** a move that enters any clutter tile adds `CLUTTER_SOUND` (start 3) to that move's Sound, once per move (0 = off). Enemies hear it like any other Sound.
    - Enemies pay the same costs (it's the same rule for everyone). Pathfinding (player tap-to-move and enemy A*) should treat clutter as costlier, so units avoid it when there's a reasonable way round.

### Missions on block maps
13. **Uplink / Retrieve:** pick the site from the merged block anchors, keeping the R15 rules (guards via `staticPlacement: 'uplink'`; cargo reuses the uplink spots when a block has no cargo spot).
14. **Escort:** generate the route graph from the block seams, not hand-placed waypoints. The start is a left-edge street, the end the right edge, and nodes sit at street crossings between blocks. Keep **2 forks** (`ESCORT_FORKS`, start 2), each with two onward legs that genuinely differ (different block rows, or a different side of a set piece). On grids with only one row, the fork can split around a block. The rest of R15 Escort is unchanged. Put the simplest working generator in ASSUMPTIONS.
15. **Bounty:** unchanged, apart from the scaled field.

### Every step
16. All new values go in `src/tune.ts`, commented. Add log rows to `NOTES.md`, and the rules to ASSUMPTIONS. The hunt log line names the map: `MAP 4x3 seed 1234 · blocks: plaza, alleys, … · mods: 3 clutter, 1 set piece, 2 zones`.
17. **Runner:** `--map hive|blocks` and `--grid <CxR>`. The contract report splits by grid size (win rate, average rounds) alongside the R15 per-type split. Flags: unreachable rerolls above 5% of hunts; any grid size with a win rate over 30 points away from the overall rate; clutter crossed in fewer than 5% of player moves (it's never on the way) or more than 60% (it's everywhere).
18. **Test bed scenarios** (fixed block layouts, no roll):
    - **"Long way round":** a Retrieve with a clean but long route, and a short route through clutter past a listening patrol. Question: "Did the clutter change your route?"
    - **"Two districts":** the same Escort fork on two different grids (rerun with `--grid`), one leg past a set piece that hides a turret. Question: "Did the map shape change your leg call?"
    - **"Crunch":** one suit, one sentry in earshot, a clutter lot between you and the objective. Question: "Did crossing the clutter feel like a real cost?"
19. **Tester splash** (`src/view/brief.ts`): what's new in plain words ("every hunt is a new district; scrap and rubble are slow and loud"), plus 2–3 tap questions from the debrief focus. Bump `BUILD` to `r16-s1` (and so on).
20. A Vitest test per scenario and per new rule: assembly is always reachable; the grid respects `MAP_MIN_BLOCKS`; clutter cost and Sound; escort graph always has `ESCORT_FORKS` forks and reaches extraction. `npm run sim -- --contracts 20 --check` passes, with the inherited R13 sound-share flag still noted (unchanged).

## NOT IN THIS ROUND
- **Drawn routes, facing waypoints and movement interrupt.** That's R17, "Draw your route". Tap-to-move stays exactly as it is.
- District themes or tone, faction block sets, building assets, matching art (parked)
- Interactive or destructible set pieces (fuel tanks, cranes), rubble from damaged buildings
- Verticality, interiors, rooftops
- New mission types, enemy types or enemy behaviours, apart from units paying clutter costs and pathing around it
- Suit building, the ship, operators, the campaign map
- Changing to-hit, ID, pack, mission or sound values other than the new `CLUTTER_*` knobs (changes go through the debrief)

## DEBRIEF FOCUS
1. **Did the map change the plan?** In Retrieve and Escort especially: did you take a different route or leg because of this hunt's layout? Does any map still feel "solved"? Does grid size (small square vs long strip vs big 4×4) change how a hunt plays?
2. **Is clutter a real choice?** "Quiet long way vs crunch through fast". Did you ever choose to cross it? Did hearing an enemy crunch through tell you anything?

Also note, as evidence for R17: **did tap-to-move fight you** (taking clutter you'd have avoided, walking a line you didn't want, no way to look down an alley as you passed)?

## DONE
- Scenarios played, then ~10 hunts on block maps with all four mission types rolling, then the "does it read and connect?" check (one tap answer: *the map changed my plan / it didn't / not sure*). Play at least one hunt on `MAP_MODE: 'hive'` for comparison. **No fun test this round.**
- Save the status report as claude/signal-lance-round16.md. Include the runner split by grid size and type, the scenario tap answers, the clutter verdict, and Jamie's notes on tap-to-move for R17.
