# Signal Lance: Round 18 brief — "Fit for the job"

Read claude/code-agent-brief.md and claude/playtest-method.md, then follow this round brief.

**Context:** slice row 3, **Suit building**, agreed in the R18 scoping chat. Jamie chose the equipment plan's **full Part A + Part B** (`claude/signal-lance-equipment-plan.md` on branch `build-toy`), with only the cheap-test item set fittable. This is bigger than a normal round (2–3 weekends), so it's built in **three checkpoints, each playable and shippable on its own**. If the round stalls, we stop at the last checkpoint that works. **No fun test** (it runs once on the whole slice). The check is "does it read and connect?".

## QUESTION
When you build each ExoS against the job and the INTEL, does it force a sacrifice you think about, and does that sacrifice show up in the hunt?

## WHY
R17: moving became part of the hunt; Jamie's next want is "whatever's next in the plan" = suit building. The hangar toy (`build-toy`) proved fitting is fun on its own ("exactly where someone can spend a lot of time building their ultimate ExoSuit"), but nothing connects a build to the hunt yet. Main still runs on `DEFAULT_LOAD` / `load.*` and `TUNE.SLOTS`.

## CHANGE
Keep everything from R17 (drawn routes, look markers, interrupt, free facing, packed districts, the four missions, test bed) unless it's listed here. Rules in `src/sim/` first, then the view.

### Step 0: bring the toy in
1. **Merge `build-toy` into `main`** (it merges cleanly; it was cut at R13). It lives in the worktree `Q:/Signal Lance-build-toy`. Bring over `src/build/` (rows, rules, templates, UI), `test/build.test.ts`, `claude/signal-lance-hangar-toy.md` and `claude/signal-lance-equipment-plan.md`. Keep `npm run build:toy` working.
2. Read the equipment plan's Part A and B tables and the hangar toy doc; they're the detailed spec. The plan was written against R14 (`2fe9157`), so re-check its file/line references against today's main.

### Checkpoint 1: parity (no playtest; the runner proves it)
3. **A1 item table in the sim:** move the rows into `src/sim/items.ts`. Today's kit becomes rows: Lamp, EM array, mask, ghost, autocannon, light mortar, steel plate, battery.
4. **A2 one fit shape for both sides:** `unit.fit = { frame, chassis, mounts by location, plate, skin }` with `has(unit, tag)`, `itemsAt(unit, loc)`, `active(unit, id)`. Replaces `load.*`, `hasRadar`, `passive`, `hasEcm`. `FIELD_TYPES` rows get a `fit` (turret = a frame with no LEGS). Remove the duplicate `DEFAULT_LOAD`.
5. **A3 stats from the row:** radar range/cone/cost, gun to-hit/range/sound and mortar shells/scatter read from the item; TUNE keeps the global rules.
6. **Parity gate:** a default fit that matches `DEFAULT_LOAD` plays like R17: `npm run sim -- --contracts 60 --check` on fixed seeds gives the R17 win rate (49%) within noise. Report the numbers. Ship as `r18-s1`, with a one-line splash note ("same game, new insides").

### Checkpoint 2: the suit budget (Jamie plays)
7. **A4 locations are parts:** MAST = SENSORS, ARMS = WEAPON, CORE, LEGS, plus a new **BACK**. Losing a part takes its mounted items offline (generalise R12's hard-coded effects).
8. **A5 rear arc:** a shot from outside the target's facing arc rolls BACK in place of ARMS. Facing is free since R17 (`AP_TURN` 0), so watch for it in the runner. Both sides.
9. **A6 power:** net regen = reactor output − idle draw; pool = base + batteries; can't launch a fit below 0 regen. Use costs stay per item. Replaces `ENERGY_REGEN` / `ENERGY_CELL`.
10. **A7 weight:** load vs rated / max with the toy's placeholder overload (`overloadPenalty`: +1 SND per move per point over rated; +1 AP per move past halfway to max). Values in TUNE (`OVERLOAD_SND_PER_PT`, `OVERLOAD_AP_FRAC`), to be tuned in the debrief.
11. **A8 signature from items:** EM and SND only at this checkpoint. Always-on emit, per-use emit on the activation, visibility; skins absorb their location's share. `sig()` becomes the sum; Sound per activation comes from the item that acted (gun 6, mortar 14, legs by move mode) instead of `SOUND_RANGE[kind]`. Re-check the runner after this; it's the riskiest change.
12. **A9 tags and mods** (one per location, matching tags), from `src/build/rules.ts`.
13. **A10 hangar = loadout screen:** the toy UI replaces the `MODS` / `SLOTS` picker at contract start. The fit locks per contract, as `C.loads` does today. Refit between hunts keeps its current rules, now applied to the fit. Raw signature bars only (the hunt teaches, the debrief explains).
14. **The cheap-test set is the only thing fittable:**
    - Frames: **Wisp, Warden, Bulwark** (steel only)
    - Reactors: **Cold-burn** (15, quiet, heavy) and **Hot core** (20, IR 4). The toy has no "Std reactor" row; these two make the THERMAL trade bite
    - Modules: Lamp, EM array, mask, ghost, autocannon, light mortar, battery, **thermal optics** (live at checkpoint 3), **cold processor** (the one mod)
    - Plate: steel. No skins yet (rows exist; Jamie can unlock later through a debrief)
    - Hide every other toy row in the in-game hangar. `build-toy.html` keeps the full catalogue.
15. **Templates:** offer 2–3 starting fits built only from the cheap set (e.g. Scout = Wisp, Line = Warden, Brawler = Bulwark), so a hunt is one tap away.
16. **A11 runner build sweeps:** `--fit <code>` and a sweep over the starting templates and frame × reactor pairs. Report win rate per frame and per reactor, and "first heard at N tiles by <channel>".
17. **A12 debrief per channel:** the end-of-hunt screen says what found each ExoS first, at what range, on which channel.
18. **C7 (small): INTEL lists what the field listens on, per channel**, so the build can answer the briefing. Ship as `r18-s2`.

### Checkpoint 3: THERMAL (Jamie plays)
19. **B1 THERMAL (IR) channel:** heat from the reactor (always), firing and sprinting. Heat **persists and cools** over turns (unlike Sound). Visibility from frame size. New TUNE values: `IR_COOL_PER_TURN`, `IR_FIRE`, `IR_SPRINT`, `IR_RANGE`, each commented.
20. **B2 something reads IR:** some field units read IR like eyes (LoS needed). Thermal optics lets the player do the same. Add it to the INTEL list.
21. `THERMAL_ENABLED` (true) turns the channel off so checkpoint 2 can be played on its own. Ship as `r18-s3`.

### Every step
22. New values in `src/tune.ts`, commented; TWEAK LOG and ASSUMPTIONS in `NOTES.md` (record every toy "guess" you keep). Toy open question 4 (reactor size cap): simplest option is that the I-slot count is the cap; note it.
23. Test bed scenarios (packed layout, fixed seeds):
    - **"Heavy load":** a Bulwark at the overload band crossing a street a turret listens on. Question: "Did the extra weight change how you moved?"
    - **"Back door":** an enemy flanks your mortar suit. Question: "Did you turn to protect your BACK?"
    - **"Warm core"** (checkpoint 3): a Hot core Warden against a thermal-sighted turret. Question: "Did the heat find you before the noise did?"
24. Vitest per new rule and scenario: the parity fit matches `DEFAULT_LOAD` stats; losing a part takes its items offline; a rear-arc shot rolls BACK; regen = output − draw and a negative fit can't launch; overload adds SND then AP; signature sums items and skins absorb; one mod per location; IR persists and cools.
25. **Tester splash** (`src/view/brief.ts`): what's new per checkpoint in plain words, 2–3 tap questions from the debrief focus. **Update GAMEPLAY BASICS every build** (frames, weight, power, BACK, heat). Bump `BUILD` `r18-s1` and so on.

## NOT IN THIS ROUND
- Any toy row outside the cheap set in the hunt (skins, drones, other frames, other weapons, stealth systems)
- MAGNETIC, VISUAL, ELECTRIC channels; the sensor/jammer grade ladder
- Several weapons per suit with a weapon picker; damage types; ammo types
- Item condition, inventory, prices, markets, makers
- **Building on the ship, refit time, or mission parameters changing while you refit** (parked by Jamie this session; Gate 2 ship/campaign)
- Changing to-hit, pack, map or mission values (changes go through the debrief)
- Operators, the campaign map, art

## DEBRIEF FOCUS
1. **The sacrifice:** did you give something up to fit the build to the job and the INTEL, and did you feel that choice mid-hunt (too heavy, out of power, heard, seen hot)?
2. **Dominance:** does any frame or reactor always win? Cross-check with the runner sweep.

Also ask once at checkpoint 1: did anything feel different from R17 (it shouldn't)?

## DONE
- Checkpoint 1 parity numbers reported. Checkpoints 2 and 3: scenarios played, then ~10 hunts with all four mission types, then the "does it read and connect?" check (one tap answer: *my build showed up in the hunt / it didn't / not sure*). **No fun test this round.**
- Save the status report as claude/signal-lance-round18.md. Include: which checkpoint was reached, the parity numbers, the runner sweep per frame and reactor, which fits Jamie used, the scenario tap answers, and the overload / IR values at the end.
