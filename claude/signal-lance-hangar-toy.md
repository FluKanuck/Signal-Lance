# Signal Lance: Hangar Toy

**Updated:** 2026-10-05 (built with Jamie on branch `build-toy`, alongside R13 on `main`)
**What this is:** a standalone suit fitter for the construction rulebook (`claude/signal-lance-construction.md`) and the catalogue (`claude/signal-lance-catalogue.md`). There's no hunt in it. The question it answers: **is fitting a suit fun on its own, and do the trade-offs read at a glance?** Jamie's verdict on v1: "exactly where someone can spend a lot of time building their ultimate ExoSuit."
**Where:** `signal-lance/build-toy.html` + `src/build/` (`data.ts` rows, `rules.ts` pure rules, `templates.ts` role starts, `ui.ts` page), tests in `test/build.test.ts`. `npm run build:toy` → `dist/build-toy.html` → artifact https://claude.ai/artifact/V2XsJZdZXhibSDCoMwLxJN. It doesn't touch `src/sim` or `src/view`.

## What's in it
| Area | Status |
|---|---|
| Frames | All 10 from the catalogue + **Shepherd** (placeholder drone carrier); steel / alloy / composite |
| Modules | ~70 rows: reactors, storage, sensors, EW, weapons, utility, mobility, melee and demo, stealth systems, drones (placeholder), 7 mods |
| Armour | 7 plates, 10 skins, one of each per location |
| Rules | Typed + OPEN hardpoints; 2-hardpoint modules; one mod per location; mods touch matching tags in their own location; load vs rated/max with an overload band; output − draw = net regen; batteries add pool; six channels with always-on / per-use / visibility; skins absorb their own location's share; loudest location per channel; stealth on/off |
| Templates | Scout, Line, Brawler, Fire support, EW, Infiltrator, Breacher, Stealth, Drone carrier. Tests check that each one fits, launches and stays within rated load |
| Sharing | Copy and paste build codes; one-step undo after picking a role, frame or strip |

## Guesses the toy made (not decided; change freely)
| Guess | Where |
|---|---|
| Weights and draws for most modules, plates and skins (the catalogue gives few) | `data.ts` |
| Chassis: alloy MAG −1 and rated +1; composite MAG −2 and rated +2 | `CHASSIS` in `data.ts` |
| "One step quieter" (baffles, foam) = −40% SND | `m_baffles`, `s_foam` |
| Frame base Visibility is split evenly over the locations that have hardpoints, so a skin hides its location's share | `totals()` |
| Per-use emit = modules with a use cost, plus everything on the legs | `perUse()` |
| Twin cells take 2 I slots; the compact core's "½ slot" is ignored | `twincells`, no compact core row |
| Still-skin is I ×2 (the catalogue says I + O) | `stillskin` |
| **Overload penalty (placeholder):** +1 SND per move for each point over rated; +1 AP per move once more than halfway to max. Sound comes before AP, so "a little heavy" means louder and "very heavy" means slower too | `overloadPenalty()` |

## Open questions
1. **Overload shape.** Is the placeholder above right? With R13's NORMAL move Sound at 4, 1 point over rated is already +25% noise.
2. **Skins and movement.** Adaptive camo is "−60% still, −20% moving", and still-skin is best standing still. The toy shows one number. Should the bars show a "moving" view, or should the hangar show the best case and let the hunt teach the rest?
3. **Per-use for active systems.** Myomer boost counts as per use (it's on the legs) but really runs "while active". Do we need a third kind of emit, "while switched on", alongside always-on and per-use? Stealth systems already behave that way through the toggle.
4. **Reactor size cap.** Frames have one in the catalogue, but the toy doesn't enforce it, so a Ferret can take a Hot core if it has the I slot. Enforce it, or let the I slot count be the cap?
5. **Offline modules still weigh.** With stealth on, jammers and datalinks go offline but you still carry them. That's correct, and it makes "cloak + jammer" a real trade. Keep it?
6. **Drones (placeholder §9b):**
   - Are drones **units in the sim** (they move and can be shot) or **effects** (one turn of eyes, a ghost)? Units are richer but cost a lot of sim work.
   - Does the control link make the suit **traceable** (an EM bearing back to the operator), and does a lost link reveal the drone's last position, like the datalink?
   - Do drones take **hit locations**, or does any hit kill them?
   - Should the carrier be a **frame** (Shepherd), a **module** (Drone hive on any BACK), or both? The toy has both for now.
   - Does a drone count against the hold or salvage when lost? Can you recover it?
   - The ship already has decoy pods and a recon drone bay (§12). Do suit drones and ship drones share rows?
7. **Templates as content.** Should templates be per maker (a Foundry Brawler, a Corporate Scout) once makers gate stock? Then a template would also be a shopping list.

## Not built yet
- Ship hulls and modules (§12): same rules, so mostly new rows plus a sections view.
- Item condition (Sound / Worn / Failing) and maker accents.
- Ammo types, countermeasures beyond smoke and chaff, the counter ladder (grades).
- Getting a toy build into the real loadout and hunt (the "does the build show up in play" question).
