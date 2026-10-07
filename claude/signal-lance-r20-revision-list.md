# Signal Lance: Round 20 fix list

**Started:** 2026-10-07 at build `r20-s1`. Same routine as R18–R19: Jamie adds items while playing; nothing is built until he says to fix them; then they ship in one build and he tests them together.
**Logging:** Jamie sends one line (and a screenshot if there is one). Screenshots are cropped to the game window (the repo is public) and saved as `claude/fixlist/r20-NN-k.png`; the row keeps his words.

## Fix list (Jamie)
| # | Item (Jamie's words) | Shots | Status |
|---|---|---|---|
| 1 | Several sensors at once. Jamie: "be able to pick certain types, aim independently, and run at the same time". So: toggle any mix of RADAR / THERMAL / EM on, each with its own aim ring, all gathering while the clock runs. Note: the R20 brief lists "running two sensors at once" under NOT IN THIS ROUND; Jamie's call overrides it | - | to fix |
| 2 | Full-map scan not findable. Jamie: "cant see where to scan full map instead of circle" (the WIDE button doesn't read as "the whole map") | - | to fix |
| 3 | No time cap; time costs instead. Jamie: "the clock time, should be infinite, it just keeps adding threats/generating heat/notoriety whatever as it climbs, so maybe we need a cool down, that can lower with no scanning as time goes on also, so you can play that game, but with the risk that some things may change as time goes on". So: no SCAN_TIME_MAX; scanning raises a risk meter that keeps climbing (more threats); while stopped it cools down, but waiting isn't free: the field changes as time passes (patrols move, maybe new units). This reshapes checkpoint 2 (the risk meter) | - | to fix |
