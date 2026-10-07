# Signal Lance: Round 17 brief — "Eyes on the street"

Read claude/code-agent-brief.md and claude/playtest-method.md, then follow this round brief.

**Context:** this is slice row 2c, **Draw your route**, agreed in the R16 scoping chat. R16 rated "best round in a while" (Jamie), so keep everything it built. **There is no fun test this round** (it runs once on the whole slice). The check is "does it read and connect?". It can be built in one go, with tune flags so Jamie can play the parts on their own.

## QUESTION
When you can shape each ExoS's move and aim its eyes as it walks, does moving through a district become part of the hunt rather than just getting from A to B?

## WHY
R16: the packed districts "changed my plan", and streets now jog, narrow and dead-end, but a move is still one tap with facing set by the last step. Jamie's biggest missing piece is drawn routes. His scope: "shape the turn for that ExoS and look as you go to aim sensors down alleys". When something new shows up, the suit stops and keeps its AP.

## CHANGE
Keep everything from Round 16 (packed districts, clutter, the four mission types, Escort controls, EXTRACT per mech, test bed, all R15 systems) unless it's listed here. Rules go in `src/sim/` first, then the view.

### Drawn path (this turn only)
1. **Draw a path:** with an ExoS selected, drag a finger (or mouse) from the suit to draw this turn's path. The sim takes the path as a list of tiles. The view snaps the stroke to tiles and drops any it can't walk (walls, set pieces), joining the gaps with the existing A* so the result is always walkable. Clutter on a drawn path is taken on purpose: no rerouting round it.
2. **Same costs as today:** the drawn path spends AP, Energy and Sound exactly like a tap move in the chosen mode (`MOVE_TILES_PER_AP`, `MOVE_ENERGY_PER_TILE`, `CLUTTER_TILE_COST`, `CLUTTER_SOUND`). If it's longer than this turn's AP can buy, it's cut where the AP runs out. **No multi-turn paths.**
3. **Tap-to-move stays** as the quick option, unchanged. `DRAW_PATH_ENABLED` (true) turns drawing off.
4. **Stop-here marker (parked #20):** while drawing, the path shows where this turn's AP runs out, using a colour change past that point plus an end marker in the same style as the Escort's gold ring. The AP cost shows next to the finger.

### Facing waypoints
5. **Add a facing waypoint:** tap a tile on the drawn path, then drag to aim. The suit turns to that facing when it reaches the tile and **holds it until the next waypoint or the end of the move**. Without waypoints, facing follows the direction of travel as it does today.
6. **Cost:** each waypoint is one change of facing. It uses the existing `FREE_TURNS` (1) first, then `AP_TURN` (1) per extra change, all counted in the path's AP total. Cap at `FACE_WAYPOINTS_MAX` (start 3) per move.
7. **Show it:** draw each waypoint's eyes cone (`EYES_HALF_ANG`, `EYES_RANGE`) faintly on the path, so you can see down which alley it will look.

### Eyes on every step, plus the interrupt
8. **Sight on every tile:** as the suit walks, check eyes (cone + `EYES_CLOSE` + LoS) **on every tile of the path** with the current facing, not just at the end. Do the same for any other passive check that runs on a move, if it doesn't already.
9. **Interrupt:** if a step reveals something new (a contact not tracked before, or LoS on a known contact that wasn't in sight at the start of the move), **the move stops on that tile.** The unspent AP stays with the suit, so you can shoot, back off or draw again. Energy and Sound are charged only for tiles actually walked. Show a clear "CONTACT — move stopped" cue on the suit. `MOVE_INTERRUPT` (true) turns it off.
10. **Player suits only.** Enemies move as they do now.

### Side items
11. **Scrap cover is low cover (parked #62, Jamie R16):** clutter no longer counts as a full wall for cover. A target covered only by clutter gets `HIT_COVER_LOW` (start 15) off the to-hit, instead of `HIT_COVER` (25). Walls and set pieces stay at 25. The odds line reads "low cover −15%". Unit sizes don't exist yet, so note in ASSUMPTIONS that larger units will later get only −5%. Don't build sizes.
12. **Show the cover source (parked #18):** when aiming at a target that's in cover, highlight the wall or clutter piece giving the cover (the `COVER_ITEM_RADIUS` piece), and the shooter's own cover where the shared-cover rule (`COVER_ADJ`) cancels it.
13. **Escort button (parked #59):** move the Escort route button so it never sits under HUD text near the top of the map.

### Every step
14. New values go in `src/tune.ts`, commented. Add log rows to `NOTES.md` and rules to ASSUMPTIONS. The hunt log notes each move as `drawn` or `tap`, plus the number of waypoints, and logs interrupts as `[INTERRUPT <suit> <contact>]`.
15. **Runner:** the scripted lance keeps tap-moving, so the R16 win rates should hold apart from the cover change. Report hit chance into clutter cover vs wall cover. Flag it if overall win rates move by more than 10 points from R16 (it should be only the scrap-cover change).
16. **Test bed scenarios, on packed-district layouts (parked #65):** fixed seeds, not the old block grid.
    - **"Side street":** walk past two alley mouths. A turret waits down one, out of the default cone. Question: "Did you aim down the alley before you passed it?"
    - **"Trip wire":** a patrol steps into view mid-route. Question: "When the move stopped, did you have what you needed to react?"
    - **"Scrap line":** two targets, one behind scrap, one behind a wall. Question: "Did low cover change who you shot first?"
17. **Tester splash** (`src/view/brief.ts`): put what's new in plain words ("drag to draw your move; tap the path to aim your eyes; anything new stops you, AP kept; scrap is low cover"), plus 2–3 tap questions from the debrief focus. **Update GAMEPLAY BASICS every build.** Bump `BUILD` to `r17-s1` and so on.
18. Add a Vitest test per scenario and per new rule: a drawn path through clutter costs the same as a tap move along the same tiles; the path is cut at the AP limit; waypoint costs use `FREE_TURNS` then `AP_TURN`; eyes are checked per step; an interrupt stops the move and refunds unspent AP; clutter-only cover gives `HIT_COVER_LOW`. `npm run sim -- --contracts 20 --check` passes, apart from the inherited flags noted in R16.

## NOT IN THIS ROUND
- Multi-turn routes or auto-walking across turns
- Initiative delay, hold or interrupt (parked #9)
- Enemies interrupting their own moves, going quiet or ambushing (parked #15)
- Unit sizes or size-based cover (only the note in item 11)
- Changing to-hit, pack, sound, mission or map values other than `HIT_COVER_LOW` (changes go through the debrief)
- Suit building, the ship, operators, the campaign map, district themes, art

## DEBRIEF FOCUS
1. **Did you look on purpose?** Did you set a facing waypoint to check an alley or corner, and did it find something or rule something out? Did drawing the path change how you crossed a district compared with tapping?
2. **Interrupts: saved or nagged?** When a move stopped, did it give you a moment to react, or did it feel like a nuisance?

Also ask once (parked #63): **after a big district (4×4, 5×3), did it feel brutal, about right, or too empty?**

## DONE
- Scenarios played, then ~10 hunts with all four mission types rolling, then the "does it read and connect?" check (one tap answer: *moving became part of the hunt / it didn't / not sure*). **No fun test this round.**
- Save the status report as claude/signal-lance-round17.md. Include the scenario tap answers, how often drawn moves and waypoints were used versus tap moves (from the log), how many interrupts there were and Jamie's verdict on them, the big-district answer, and the runner hit chance into clutter vs wall cover.
