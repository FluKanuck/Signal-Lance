# Signal Lance: Round 17 status report — "Eyes on the street"

**Date:** 2026-10-06
**Build:** `signal-lance/` TS project (~5,300 lines of src), `dist/signal-lance.html`, BUILD `r17-s5`
**Branch:** `main` (repo `FluKanuck/Signal-Lance`), commits b42cdb8 (s1), 5878843 (s2), 7287477 (s3), fabcd3b (s4), 9be58ab (debrief), 5ec3870 (wrap build), and this report
**Live artifact:** https://claude.ai/artifact/NRNixsKxVrcMGNeYp6bB2o · testers: https://flukanuck.github.io/Signal-Lance/

## Purpose
When you can shape each ExoS's move and aim its eyes as it walks, does moving through a district become part of the hunt rather than just getting from A to B? This was slice row 2c, "Draw your route". Jamie's biggest missing piece after R16 was drawn routes. There was no fun test this round; the check was "does it read and connect?".

## Current status
- **Yes.** Read-and-connect check: **"moving became part of the hunt"**.
- **Debrief:** the last changes (look markers, free facing) **"Helped"**; weakest moment **"It felt fine"**.
- **Interrupts:** Jamie's verdict is **"Saved me"**. In the runner, 23% of the scripted lance's moves stop, in 95% of hunts. By what showed the contact: eyes 513, sensors 137, sound 42.
- **The controls changed three times in-round** on Jamie's feedback (below). They ended up Door Kickers style: a freehand line, an end handle to carry it on, drag from the middle to redraw, and tap the line then tap where to look (a draggable eye marker).
- **Facing is free:** Jamie: "now we are a smaller man sized unit, facings shouldnt cost AP at all". `AP_TURN` 1 → 0, both sides.
- **Big districts (4×4, 5×3):** "About right".
- **Scenario tap answers:** not reported (Jamie gave his feedback live, not through the end-of-hunt taps).
- **Drawn vs tap moves and waypoint counts from play logs:** not available; no logs were pasted. The hunt log records them now (`moves tap N drawn N wp N`, `[INTERRUPT <suit> <type> <why>]`).
- **Fun test:** not run (per the brief: it runs once on the whole slice).
- **Biggest thing still missing:** "whatevers next in the plan". On the roadmap that is **suit building** (slice row 3).

## What was built
1. **Drawn path (this turn only).**
   - Drag from the selected ExoS to draw. From r17-s2 the line is freehand. The rules keep the stroke on walkable street and join any stretch that would cut or graze a wall with A*. Small wobbles are straightened, but never round clutter you drew through.
   - Costs are exactly a tap move's: clutter-weighted length, `MOVE_TILES_PER_AP`, `MOVE_ENERGY_PER_TILE`, `CLUTTER_SOUND`.
   - The path is cut where the AP runs out: cyan up to there, red dashed past it. The stop ring was removed at Jamie's request.
   - The AP cost shows beside the finger while drawing.
   - No multi-turn paths. Tap-to-move is unchanged. `DRAW_PATH_ENABLED`.
2. **Controls (r17-s2 / s3).**
   - The end handle carries the path on; dragging from the middle redraws from that point.
   - Tap the line, then tap where to look: an eye marker drops there. Drag the marker to re-aim; tap it, then "✕ LOOK", to remove it.
3. **Facing waypoints.** The suit turns on reaching the point and holds that facing to the next one or the end of the move. A faint eyes cone shows where. Up to `FACE_WAYPOINTS_MAX` 3 per move; free since r17-s4.
4. **Eyes on every step and the interrupt.**
   - A zero-time sensor look on every tile entered and at each waypoint (the real-time sensors were already running during moves).
   - A player move stops on the spot when it shows a new contact, or eyes on a known one that wasn't in sight at the start of the move.
   - Unspent AP and EN are refunded. The cue reads "CONTACT — move stopped · N AP kept".
   - Tap and drawn moves alike, player suits only. `MOVE_INTERRUPT`.
5. **The clutter sound now lands on the first step into scrap**, so a move stopped short of it stays quiet.
6. **Scrap is low cover:** `HIT_COVER_LOW` 15 (walls and set pieces stay `HIT_COVER` 25). The odds line reads "low cover −15". Sizes are not built; the −5% for larger units is noted in ASSUMPTIONS.
7. **Cover source shown** (parked #18): when FIRE is allowed, the cover piece is outlined (yellow wall, tan scrap), and a shared, cancelled piece is green.
8. **Escort route buttons** (parked #59) slide along their leg to a spot clear of the HUD and turn strip.
9. **Test bed on a packed district** (parked #65, seed 1701, 4×2): Side street, Trip wire, Scrap line. `Scenario.packed`.
10. **Tests: 158 → 182.** New rules: drawn = tap cost through clutter, cut at the AP limit, waypoint cost and cap, eyes per step, the interrupt refund, low cover, freehand joining and straightening. Plus a check for each scenario.

**Runner, final build (60 contracts, scripted lance, tap moves only):**

| Split | Hunts | Win |
|---|---|---|
| All | 148 | 49% (R16 37%) |
| Escort / Uplink / Retrieve / Bounty | 38 / 44 / 34 / 32 | 45% / 59% / 53% / 34% |
| Grid 3×3 / 4×2 / 4×3 / 4×4 / 5×2 / 5×3 / 6×2 | 17 / 20 / 21 / 22 / 24 / 25 / 19 | 47% / 70% / 62% / 41% / 58% / 24% / 42% |

- **Hit chance:** into clutter (low) cover 40% (avg shown 42%), into wall cover 34% (avg shown 32%), open 56%; overall 52%.
- **Flag: wins moved more than 10 points from R16.** Toggling the changes off in s1 showed why:
  - interrupts off: 40%
  - cover back to 25 as well: 39%
  - so low cover is worth about 1 point and the interrupt about 9: the bot stops on new contacts and shoots.
- **5×3** went from 0% to 24%.
- `--check`: only the inherited R13 sound-share flag remains.

## Changes (from the TWEAK LOG)
| # | Symptom | Change | Result |
|---|---|---|---|
| 1 | "need to free hand path the line, not have it snapping … hard to accurately grab the point to keep going, it keeps doing facing instead"; "get rid of the stop circle" | Spec override: freehand path (`DRAW_SAMPLE` 0.35, `DRAW_SIMPLIFY` 0.25); end handle (`DRAW_END_GRAB_PX` 34); drag mid-path = redraw from there; tap line → LOOK menu; stop ring removed | Led to #2 |
| 2 | "i have to tap look and then click my look direction, instead … just be able to tap somewhere, that leaves a look marker, i can then click and drag that mark" | LOOK button removed: tap the line, tap where to look; draggable eye marker; ✕ LOOK to remove | Helped |
| 3 | "facings shouldnt cost AP at all" (man-sized units) | `AP_TURN` 1 → 0, both sides | Helped (runner unchanged, 49%) |

## Parked (not built)
1. **Should a tap move be interrupted too?** It is now, following Jamie's "when something new shows up, the suit stops". That is most of the runner's +12 points. Jamie found the stops "saved me"; no change asked for.
2. **Interrupt tuning knobs if it ever nags:** ignore sound-only contacts (42 of 692 in the runner), or eyes only.
3. **Look-menu polish:** "✕ LOOK" doesn't follow the map when you pan. A hold on your ExoS opens the tooltip instead of starting a draw.
4. **`FREE_TURNS` and `FACE_WAYPOINTS_MAX`** mean little now that turning is free; the cap of 3 could go.
5. **The scripted lance never draws paths or sets looks**, so the runner can't see their value.
6. Earlier parks still open: scrap cover by unit size (−5% for larger units, needs sizes); push-your-luck at Bounty quota; refit after seeing the job type; the R13 sound-share flag.
7. "Later" ideas: a "wait here" waypoint (DK's go codes), and a tap move carrying on by itself after a stop.

## Suggested next step
Drawn routes did their job: Jamie says moving became part of the hunt. The interrupt "saved me", and the controls settled into Door Kickers style after three quick in-round passes. Jamie's closing answer was "whatever's next in the plan", which is **suit building** (slice row 3, `signal-lance-construction.md`). Open it with its scoping chat. Free facing (man-sized units) and the size-based low cover note may feed into frame sizes there. Big districts now read "about right", so no map change is needed.
