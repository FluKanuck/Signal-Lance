# Signal Lance: Round 25 fix list

**Started:** 2026-10-08 from Jamie's play of the live toy (build r25-live-d2, iPhone). Built alongside the round, on the toy page only. The main game does not change.

## Fix list (Jamie's play)
| # | Item | Jamie's words | Repro | Status |
|---|---|---|---|---|
| 1 | A nudge at a choke point cancels a drawn route | "All three units had a full path drawn. When they moved through the choke point, one nudged the other and it cancelled the path drawn." | Three ExoS, each with a route through the same one-tile gap, then PLAY | built r25-live-d3: a blocked walker waits its turn (gives up only within LIVE_STUCK_NEAR 2 tiles of its end, or after LIVE_STUCK_GIVEUP 12 s); the one behind yields; two squeezing into one gap: A before B before C · re-check in play |
| 2 | No limit on looks along a route | "we need no limits on facing commands" | Draw a route and set a 4th look | built r25-live-d3: FACE_WAYPOINTS_MAX 99 on the toy; the HUD drops "/3" · re-check in play |
| 3 | A FORWARD marker on a route | "a UI marker we can tap along a route to cancel the facing and have view return forward" | Set a look early on a route; the ExoS keeps looking that way to the end | built r25-live-d3: tap the route → FORWARD (green FWD chevron); from there the ExoS looks where it walks · re-check in play |
| 4 | Pinch zoom | "Pinch zoom is needed to zoom in to allow better drawing" | Phone: two fingers on the map | built r25-live-d3: two-finger pinch round the midpoint (PINCH_MIN 0.45 – PINCH_MAX 3 × the zoom); Z+ / Z− clear it · re-check on the phone |
| 5 | A drawn route round a corner is jagged | "when your path crosses a corner, it always does a really jagged approximation of the path around the obstacle rather than smoothly flowing around it" | Phone: draw a curve that clips a building corner | built r25-live-d3: the stroke is resampled (PATH_STEP 0.25), pushed PATH_CLEAR 0.3 off walls, only real wall crossings joined by A*, then PATH_RELAX 8 rounds of smoothing; test: max bend < 40° on a corner-clipping arc · re-check on the phone |
