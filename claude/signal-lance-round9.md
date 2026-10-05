# Signal Lance: Round 9 status report — "Fire on the fix"

**Date:** 2026-10-02
**Build:** `signal-lance/` project, TypeScript + Vite (about 1,850 lines); built file `signal-lance/dist/signal-lance.html`, version tag `r9-s1b`
**Branch:** `claude/signal-lance` (repo `FluKanuck/Prototype`), commits `8b2c9d1` (step 1), `cf44fc1` (run 1 change), `f43e70f` (run 2 log), plus the wrap commit
**Live artifact:** https://claude.ai/artifact/NRNixsKxVrcMGNeYp6bB2o (also on GitHub Pages: https://flukanuck.github.io/Prototype/)

## Purpose
Does a mortar module that fires on a fix, with no line of sight needed, make finding things the plan and change who carries what? Round 8 scored 0/5: "Fun. But no new real mechanics or content." A new verb that pays off the hunt and costs a slot was the test.

## Current status
- **The mortar landed as a new dimension.** Run 1: "The lob on a weak signal notably missed and that was good. It definitely added a good dimension." The hunt fed the payoff: a fuzzy fix missed, a firm fix hit.
- **The loadout split changed for the first time since R7.** Run 1: A mortar + passive + ECM, B passive + ECM. Run 2: A became the quiet mortar carrier (passive, ECM, mortar, 30 rounds) and **B took the radar**. In R8 the same A-scout / B-push split won every field.
- **Too easy against a static field.** Run 2 (Turret nest): "as soon as you get a fixed signal you can just stand off and pummel." Jamie calls this "a future balance consideration rather than… a mechanic", and asked for no change.
- Record: 2 runs, 2 wins. Fortified: WIN UPLINK, kills 2/4, mortar 4/5 hits and 2 kills, B destroyed. Turret nest: WIN CLEAR, kills 4/4, mortar 3/4 hits and 3 kills, no mech lost. Ambush was never played.
- Fun test: **0/5** ("same answer as last build round", i.e. R8). Only 2 runs, so this isn't a full ~10-run score.
- Biggest thing still missing: **map variety / signal terrain.**

## What was built
1. **MORTAR loadout module** (player mechs only): 1 slot, 6 shells. Firing costs 2 AP, at most once per activation, with a range of 4–18 tiles and no Energy cost.
2. **Aimed lob** on a contact's fix centre, allowed only when the fix uncertainty is ≤ 4 tiles. It needs no LoS, and a fading contact still qualifies if its circle is tight enough.
   - Scatter radius = 0.5 + 0.6 × uncertainty in tiles. An orange circle previews it on the target.
   - Blocked reasons: FUZZY / CLOSE / RANGE / AP / CAP / SHELLS / NONE.
3. **Splash:** every unit within 1 tile takes `MORTAR_DMG` 1 armour plate (3 hits), your own mechs included. One hit kills a turret or patrol and halves an emplacement.
4. **Loud:** +30 Signal and the gun's firing spike. The targeted unit gets a fuzzy flash contact on the firer (4 tiles).
5. **Feedback:** a splash marker plus "SPLASH: hit/miss" in the HUD. The result screen and log show shells, hits, kills, blind lobs, hits on your own mechs, and who carried the mortar.
6. **Blind lob** (run 1 override, Jamie): MORTAR arms a target tap. Tap a contact for an aimed lob, or tap the map for a blind lob that scatters as if the fix were 6 tiles fuzzy (about 4.1 tiles). Any field unit a blind splash hits gets the flash contact. Range rings show while armed.
7. **`FIELD_PLAYTEST_POOL`** (Turret nest, Ambush, Fortified) limits the shuffled set to those fields. An empty list restores the full pool.
8. **Runner:** scripted A carries a mortar and lobs at any contact that qualifies.

### Headless runner, 50 games (10 per composition; A with mortar)
| Composition | Results | Avg kills | Mortar shots / hits / kills / own hits |
|---|---|---|---|
| Mixed | LOSS 6, UPLINK 3, CLEAR 1 | 1.9/4 | 30 / 15 / 13 / 3 |
| Turret nest | LOSS 6, UPLINK 2, CLEAR 2 | 1.8/4 | 15 / 14 / 12 / 1 |
| Sweep | UPLINK 4, CLEAR 4, LOSS 2 | 3.2/4 | 34 / 20 / 22 / 4 |
| Fortified | LOSS 8, UPLINK 2 | 1.6/4 | 19 / 17 / 9 / 1 |
| Ambush | UPLINK 10 | 1.7/4 | 14 / 9 / 9 / 2 |

- Total: LOSS 22, UPLINK 21, CLEAR 7, with no stalls (R8 was LOSS 26, UPLINK 20, CLEAR 4).
- The mortar qualified and hit in every composition.
- **Flag:** Ambush turrets were still found in only 2 of 20 placements by the script, the same as in R8.
- The script is dumb, so these numbers check that nothing is broken; they don't measure balance.

## Changes (from the TWEAK LOG)
| # | Symptom | Change | Result |
|---|---|---|---|
| step 1 | R8: "no new real mechanics"; one split beat every field | MORTAR module (`MORTAR_*`, `AP_MORTAR`, `SIG_MORTAR` 30) + `FIELD_PLAYTEST_POOL` | Played |
| run 1 (Fortified, WIN UPLINK) | "Mostly fine… lob on a weak signal missed, that was good"; wants "manual targeting… no fix… bad accuracy… a shot in the dark to flush or get a lucky hit" | Override: blind lob on a tapped spot, new `MORTAR_BLIND_UNC` 6 | Helped |
| run 2 (Turret nest, WIN CLEAR) | "Too easy… stand off and pummel" a static nest once fixed | None (Jamie: future balance) | — |

## Parked (not built)
1. **Jamie (run 2):**
   - Splash damage that scales with how close the impact lands.
   - Some built-in mortar inaccuracy even on a firm fix (bigger base scatter).
2. Mortar vs static fields is too easy (Turret nest). This is a balance question for later. The first knobs are `MORTAR_DMG` (1 plate = 3 hits), `MORTAR_SCATTER_BASE`, `SIG_MORTAR` and `MORTAR_MAX_UNC`.
3. Aimed lobs now take two taps (MORTAR, then the contact). This is a consequence of the blind-lob override.
4. Ambush was never played. Its turrets sit off the script's route, so they're still rarely found.
5. Carried over, still out of scope:
   - Enemy indirect fire.
   - Shell flight time, smoke and flares.
   - Field units reacting to shelling or calling for help.
   - Signal terrain and SIGINT.
   - The R7/R8 rough edges, including the shuffled set being used up by page loads and kept separately on the artifact and on Pages.

## Suggested next step
The mortar did what R8 couldn't: the split moved (B took the radar, A became the quiet mortar), and a bad fix produced a readable miss. The fun test is still 0/5, though over only 2 runs, and the pull to play more is still missing. Jamie's closing line points straight at the next roadmap item, **R10 Signal terrain**: zones that hide or confuse Signal, so fixes are harder to earn and the "stand off and pummel" trick stops working on open ground. That also tackles the static-nest problem through the map, not by nerfing the mortar. Keep the mortar balance ideas (proximity damage, base inaccuracy) parked until terrain is in, and ask for a real ~10-run fun test next round.
