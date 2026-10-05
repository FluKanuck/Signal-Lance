# Signal Lance: Round 5 brief — "Get the job done"

Read claude/code-agent-brief.md and claude/playtest-method.md, then follow this round brief.

## QUESTION
Does a rolled objective you have to reach and work loudly turn the opening from a fixed routine into a new plan each run?

## WHY
Round 4 passed the fun test (3/5 over 8 runs), but fights felt samey because the opening is solved. Jamie walks the same route to the middle, waits for a blip, then gets the drop on the bot. The bot has a job (find you) and the player doesn't, so waiting is always right. The missing piece is "more to plan around."

## CHANGE
One step. Keep everything from Round 4 (I-go-you-go, AP, Energy, move modes, Signal, noise ring, damage read) unchanged unless listed here.

1. **Uplink point, rolled each run.**
   - Hand-pick `TUNE.UPLINK_CANDIDATES`: 5–6 open-floor tile positions spread across the map. None in the top-middle courtyard, and every one reachable by both mechs.
   - Each run rolls one, at least `TUNE.UPLINK_MIN_DIST` (default 10) tiles from the player's spawn.
   - Draw it on the map as a clear marker the player can always see.
2. **INTEL line** adds the point, e.g. "INTEL: … Uplink at NE yard." A compass word or grid ref is fine.
3. **UPLINK action** (player only this round):
   - Available only when the player is within `TUNE.UPLINK_RADIUS` (default 1) tile of the point.
   - Costs `TUNE.AP_UPLINK` (default 2) AP, max once per turn.
   - Adds `TUNE.SIG_UPLINK` (default 25) Signal on the existing Signal rules, so it's loud and the bot's fix on you tightens.
   - Show progress as pips: `TUNE.UPLINK_TURNS` (default 3) completed uplinks win the run.
   - Progress persists if you leave and come back (simplest; note in ASSUMPTIONS).
   - When blocked, the button shows a one-word reason ("RANGE", "AP", "DONE").
4. **Win conditions:** uplink complete = WIN ("UPLINK"), and bot killed = WIN ("KILL"), as now. Show which one on the result screen and in the log line.
5. **The bot knows the uplink point.** Map each temperament to it with the simplest logic, and note it in ASSUMPTIONS:
   - **Patient:** guards. It moves to a covered spot within `TUNE.GUARD_RADIUS` (default 6) tiles of the point and waits there. It leaves only for a firm contact.
   - **Aggressive:** hunts you as now, but its first patrol leg heads toward the point.
   - **Cautious:** its patrol waypoints are picked within `TUNE.GUARD_RADIUS` × 1.5 of the point.
   - The bot does not use UPLINK and gets no new actions. It still obeys every AP, Energy and shot cap.
6. **Fix the courtyard spawn bug in passing:** the bot must never spawn walled in (top-middle courtyard). Also make sure it can't spawn within `UPLINK_MIN_DIST` of the player.
7. **DBG overlay:** show the bot's current guard/patrol target relative to the uplink.
8. New values go in `TUNE`, commented. Log the change in the TWEAK LOG as R5.

## NOT IN THIS ROUND
- Multiple objective types (exfil, destroy, escort), or more than one objective per run
- A turn limit, timer or bot counter-objective
- The bot using UPLINK, or the bot managing its own Signal on purpose
- A reactive bot (responding to being shot or heard beyond existing rules). That's parked as the next candidate
- The Heat pool, a drone/recon tool, new modules, maps or enemies
- Mission select, rewards, persistence, menus, saves, art, sound

## DEBRIEF FOCUS
1. **Does the opening change run to run?** Does Jamie take different routes or approaches depending on where the uplink rolls, or does he find a new fixed routine (e.g. always kill first)?
2. **Does UPLINK feel like a gamble or a chore?** Standing still and getting loud should feel tense ("am I being heard?"). If it feels like homework, the first knobs are `UPLINK_TURNS` (3 → 2) and `SIG_UPLINK`.

## DONE
~10 runs played + fun test run, then save the status report as
claude/signal-lance-round5.md.
