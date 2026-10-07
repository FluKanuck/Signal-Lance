# Signal Lance: Round 16 status report — "Rolled ground"

**Date:** 2026-10-06
**Build:** `signal-lance/` TS project (~4,900 lines of src), `dist/signal-lance.html`, BUILD `r16-s9`
**Branch:** `main` (repo `FluKanuck/Signal-Lance`), commits 9a3b53e (s1), 3020b44 (s2 fix), 9d59ff9 (s3), 9ee0683 + bc4b39d (brief rule: BASICS every build), 65e4118 (s4), 3f0a8e7 (s5), 298efd7 (s6), 8afe407 (s7), 9c9511b (s8), e3f8258 (s9), 95b71c7 (debrief), 1a5756b (wrap build), and this report
**Live artifact:** https://claude.ai/artifact/NRNixsKxVrcMGNeYp6bB2o · testers: https://flukanuck.github.io/Signal-Lance/

## Purpose
When every hunt rolls a new map, do routes stop feeling solved, so that where you go becomes part of reading the field? This was the whole-loop slice's row 2b (block maps). It was pulled forward because R15's Retrieve showed "really only one sensible route". There was no fun test; the check was "does it read and connect?".

## Current status
- **Yes.** Read-and-connect check: **"the map changed my plan"**. The final debrief rated the latest changes **"Helped"**; weakest moment: **"It felt fine"**. Jamie's r16-s6 log adds: map "Changed my plan", clutter "Went round it", tap-to-move "Did what I wanted".
- The brief's map (12×12 blocks on a grid) didn't hold up. Jamie: "it still feels too much like a grid". It went through four forms in-round:
  - s1: block grid
  - s3: street blockers on the seams
  - s5: packed irregular pieces, cropped at the map edge
  - s6: open start zones

  The packed districts are what read as a city.
- **Clutter verdict:** it is a real choice: Jamie went round it. In the runner it sits on 22% of the scripted lance's moves (target band 5–60%). Jamie wants its cover lighter next round (below).
- **Tap-to-move notes for R17:** one log answer, "Did what I wanted". No other notes this round. Jamie's closing line asks for drawn routes (below).
- **Scenario tap answers:** not reported. Jamie played contracts, not the four R16 scenarios.
- **Old-hive comparison:** not played by Jamie. Runner comparison is below.
- **Fun test:** not run (per the brief: it runs once on the whole slice).
- **Biggest thing still missing:** "Drawn routes" (R17, "Draw your route").

## What was built
1. **The map is per-hunt state** (`world.ts` loadMap). Size, walls, clutter, spawn, reachability and anchors follow the hunt. `MAP_MODE` 'blocks' / 'hive' is on a splash toggle. The runner has `--map` and `--grid`, with a per-grid split and the brief's flags. The log line names the map. INTEL says "4×3 district, 48×36". The field and zone counts scale with area.
2. **Block grid (s1)**: 8 hand-drawn 12×12 blocks with spots and mod slots (zone, set piece, clutter), rotation and mirroring, and an Escort route on the seams. It was redrawn denser after the first draw was too open (30% walls vs the hive's 42%).
3. **Clutter**:
   - Movement cost `CLUTTER_TILE_COST` 2 and A*-weighted, for everyone; smoothing never cuts across it.
   - `CLUTTER_SOUND` +3 to a move that enters it.
   - Low cover (counts as a wall for the cover rule).
4. **Street blockers (s3)**: rubble across a street, barricades that shut it, and chicanes you can weave through but not see past. These are rolled per stretch of street (`SEAM_BLOCK_CHANCE` 0.35), and walls never cut anything off.
5. **Packed districts (s5, the default `MAP_LAYOUT`)**:
   - Half-block cells; shapes 1×1, 1×2, 1×3, L3, L4, 2×3, plus 2×2 = a hand-drawn block. They are packed at a random offset and cropped at the map edge.
   - `STREET_KEEP` 0.6 per piece side: dropped sides close or narrow streets.
   - Generated interiors (alleys, courtyards, open lots).
   - A left-edge road in, and a guaranteed way out to the right edge.
6. **Start zones (s6)**: spawn on the most open left-edge row, with a cleared 4×9 apron. The transport starts beside the lance.
7. **Escort, reworked**:
   - 2–3 genuinely different legs per fork (NORTH / AHEAD / SOUTH). No leg loops back more than 4 tiles west (300 seeds checked). Only Escort districts need a route.
   - HOLD (skip a move) and HURRY (sprint 12 tiles) orders, 3 each per hunt.
   - Railway levers: set any fork ahead. A set fork lets the transport carry straight on mid-move; an unset fork stops it.
   - A gold ring shows where the next move ends.
   - The transport appears in the turn strip.
8. **Extraction (s9)**: each mech EXTRACTs on its own (button in the zone, no AP). The hunt ends once every living mech is out. Escort wins if the transport walked out, Retrieve if the carrier extracted with the cargo, Bounty at quota.
9. **Shared cover (s7)**: if the shooter is up against the same piece of cover as its target, the cover doesn't count. Both sides.
10. **Tester tools**:
    - Map tooltips: hover, or hold a finger 0.45 s.
    - The splash pages back through round history (R12–R16) and welcomes a returning tester with how many rounds they missed.
    - DEBUG: REROLL JOBS on the job screen.
    - GAMEPLAY BASICS is now updated every build (written into `code-agent-brief.md`).
11. **Bug fixed (s2)**: the HUD crashed the game loop the first time the field shot the Escort transport, an R15 bug ("enemy turn, nothing happening").
12. **Scenarios**: Long way round, Two districts: strip, Two districts: square, Crunch (fixed block-grid layouts). Tests went from 116 to 158.

**Runner, final build (60 contracts, scripted lance):**

| Split | Hunts | Win |
|---|---|---|
| All, packed districts | 124 | 37% |
| All, hive (same rules) | 148 | 55% |
| Escort / Uplink / Retrieve / Bounty (districts) | 31 / 39 / 30 / 24 | 42% / 46% / 27% / 29% |
| Escort / Uplink / Retrieve / Bounty (hive) | 40 / 47 / 34 / 27 | 70% / 70% / 41% / 26% |
| Grid 3×3 / 4×2 / 4×3 / 4×4 / 5×2 / 5×3 / 6×2 | 15 / 17 / 20 / 18 / 23 / 18 / 13 | 60% / 59% / 40% / 17% / 39% / 0% / 54% |

Other runner numbers:
- 1% of hunts needed a map reroll.
- Hit chance 57% (29% into cover, 62% in the open).
- Average hunt 11.5 rounds.
- On the packed districts, the longest straight open run averages 14.8 tiles (grid layout 23.7, hive 27.6), and 54% of tiles are wall (hive 42%).

`--check` fails on three flags:
- **5×3 wins 0%.** Big grids are much harder: the field scales up with area, and the lance now has to walk out after the objective.
- **Hush turret never killed in Bounty.** Inherited and sample-dependent.
- **The R13 sound share.** Inherited.

## Changes (from the TWEAK LOG)
| # | Symptom | Change | Result |
|---|---|---|---|
| 1 | Build: first blocks too open (30% walls; scripted wins 34% vs hive 57%) | Blocks redrawn denser (36–38% walls) | Wins back to ~50% |
| 2 | Build: clutter on only 4–5% of lance moves | Edge clutter slots that span the whole street | 7–9%, then 22% after the later layouts |
| 3 | "Enemy turn, nothing happening" | HUD crash fixed (transport shot) | Fixed; checked by browser fuzz |
| 4 | "They can't always have a full path grid … no reason to not allow me to take the centre road" | Street blockers; Escort AHEAD leg; tooltips; round history | Helped, but "still feels too much like a grid" |
| 5 | "Still feels too much like a grid … irregular shape library … cut off by the map boundary" | Packed districts (`MAP_LAYOUT` 'packed') | Helped (final debrief) |
| 6 | Spawned boxed in; "pause the convoy … 3 times … sprint for 1 turn"; legs "progress and then back track" | Start apron + spawn row pick; HOLD / HURRY; backtrack / detour limits | Helped |
| 7 | "Icon … how far transport will move"; "transport to show in initiative"; "railway style direction lever" | Next-move ring, T in the strip, fork levers | Helped |
| 8 | 51% / 55% on an emplacement next to a barricade "felt really low and annoying" | Shared cover doesn't count (`COVER_ADJ` 0.75, `COVER_ITEM_RADIUS` 3) | Helped |
| 9 | "Entered extract before the transport, it counted as bailed" | s8: Escort / Retrieve mechs wait in the zone; then s9: EXTRACT per mech, the hunt ends when all are out | Helped |

## Parked (not built)
1. **Scrap cover by size (Jamie, for next round):** scrap / rubble gives −15% to hit for small units, instead of counting as a wall (−25%). Larger units, once sizes exist, get only −5%. This needs a cover value per size class, shown as "low cover" in the odds line.
2. **Drawn routes, facing waypoints, movement interrupt.** This is R17, and Jamie's biggest missing piece.
3. **Big districts are brutal for the scripted lance** (4×4 17%, 5×3 0%). The knobs are `FIELD_SCALE_BY_AREA`, `STREET_KEEP` (more open streets) and grid weights. Worth one debrief question once Jamie has played some big maps.
4. **The scripted lance doesn't use the new tools**: no levers, HOLD/HURRY or reading the clutter trade-off, and it almost always picks NORTH. The runner understates how the Escort reads.
5. **The four R16 scenarios run on the old block-grid layout** (fixed specs). Jamie didn't play them; they may want packed-layout versions.
6. Earlier parks still open: push-your-luck at Bounty quota; refitting the loadout after seeing the job type; the R13 sound-share flag decision.
7. District themes, faction block sets and art; interactive set pieces; verticality (all still parked from the brief).

## Suggested next step
The map now does its job: Jamie read each district and changed his plan, and the convoy has real controls. His biggest missing piece is drawn routes, R17 as planned ("Draw your route"). That fits naturally now that streets jog, narrow and dead-end and tap-to-move has more to fight. Fold the scrap-cover change (15% / 5%) into R17 or the next slice row. After that, the slice still needs the "bigger loop" Jamie named in R15 (campaign, operators, the ship), and the fun test runs once the slice connects. One balance question to carry: the big districts (4×4, 5×3) are much harder in the runner, partly because the field scales with area and partly because the lance must now walk out after the objective.
