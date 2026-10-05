# Signal Lance: Round 4 brief — "Spend it wisely"

Read claude/code-agent-brief.md and claude/playtest-method.md, then follow this round brief.

## QUESTION
Does taking turns in order, spending a bankable pool of AP and energy, make planning feel effective instead of like a guess?

## WHY
Round 3 (WEGO) was played once and scored 0/5. The weakest moment was the bot ignoring the 2-shot cap, and the missing piece was "effective planning". In the debrief, Jamie said the turn structure is the main problem and chose I-go-you-go with an action-point pool, with separate resource pools staged in over time.

## CHANGE
Build in two steps. The game must be playable after step 1 on its own. Ship step 1, report, and wait for "played" and a debrief before starting step 2. **Only start step 2 if the step 1 debrief says the turns feel like planning.** Otherwise stop, tune step 1, and report.

### Step 1 — I-go-you-go with AP and Energy
1. **Replace WEGO with alternating turns:** PLAYER TURN → ENEMY TURN → repeat. Remove COMMIT, the resolve bar and `TURN_SECONDS`. Keep the turn counter, and keep the turn count in the log line and the result screen.
2. **AP pool (both mechs, same rules):**
   - Each side gains `TUNE.AP_PER_TURN` (default 4) at the start of its turn.
   - Unspent AP carries over, up to `TUNE.AP_BANK_MAX` (default 8).
   - Show the player's AP as pips. The enemy's AP is hidden (DBG overlay only).
3. **Energy pool (both mechs, same rules):**
   - Rename the existing power cells to **Energy**, with a bar for the player (enemy DBG only).
   - The existing radar and ECM power costs now draw from Energy.
   - Energy regenerates by `TUNE.ENERGY_REGEN` at the start of the owner's turn.
   - Pick defaults so that a full-Energy mech can sprint ~10 tiles or pulse radar ~4 times. Note the mapping from the old power values in ASSUMPTIONS.
   - Enemy Hunter variant: its +2 power cells become the equivalent extra Energy.
4. **Movement modes.** A mode selector (CREEP / NORMAL / SPRINT, buttons ≥ 48px). CREEP builds on the existing creep behaviour.
   - Tiles per AP (`TUNE.MOVE_TILES_PER_AP`): creep 1, normal 2, sprint 3.
   - Energy per tile (`TUNE.MOVE_ENERGY_PER_TILE`): creep 0, normal low, sprint high.
   - Speed while moving: add `TUNE.SPRINT_SPEED`, and keep the existing creep and normal speeds.
   - Tap a destination to see the path with its AP and Energy cost. Tap MOVE to execute.
   - Moves longer than the AP or Energy you have are clipped to what you can afford. The preview shows the clipped endpoint.
5. **Actions on your turn, in any order, as long as you can pay:**
   - **FIRE** at the selected contact: `TUNE.AP_SHOT` (1), max `SHOTS_PER_TURN` (2) per turn. The existing lock rules still apply (`PLAYER_FIRE_UNC`, `PLAYER_FIRE_RANGE`, LOS). FIRE is disabled with a one-word reason when not allowed ("FUZZY", "RANGE", "LOS", "AP").
   - **RADAR pulse:** `TUNE.AP_RADAR` (2) plus its Energy cost.
   - **ECM on:** `TUNE.AP_ECM` (1), paid at the start of each of your turns while it's on, plus its existing Energy drain.
   - **Passive:** free.
   - **END TURN:** a large button.
6. **Time and sensors.**
   - Between actions, the sim is frozen.
   - A move runs the real-time sim for however long it takes at that mode's speed, so sensors and contacts update along the way.
   - Instant actions (shot, pulse) run the sim just long enough to resolve.
7. **The enemy's turn:**
   - It spends AP and Energy under exactly the same costs and caps, including the 2-shot cap.
   - It picks actions with its existing temperament and variant logic, mapped onto these actions.
   - It acts only on its own turn.
   - It plays out at a readable pace (e.g. ~0.4 s pause between actions), and the player sees it only through their sensors, exactly as now. Enemy intent is never shown.
   - Put the simplest mapping from temperament to spending in ASSUMPTIONS (e.g. Aggressive sprints and spends everything; Patient creeps and banks AP; Cautious keeps Energy for radar).
8. **Out of Energy:** you can still creep, fire and use passive. You can't radar, run ECM, or move at normal or sprint speed.

### Step 2 — Signal (both mechs, same rules)
9. Each mech has **Signal**, 0 to `TUNE.SIGNAL_MAX` (100). Show the player's as a bar; the enemy's is DBG only.
10. **What adds Signal** (shots don't: they belong to the future Heat pool):
    - radar pulse: `TUNE.SIG_RADAR` (30)
    - ECM: `TUNE.SIG_ECM` (15 per turn while on)
    - moving: `TUNE.SIG_MOVE_PER_TILE`, with creep 0, normal 2 and sprint 5
11. Signal cools by `TUNE.SIG_DECAY` (25) at the start of the owner's turn.
12. **Signal sharpens the other side's fix.** Contact uncertainty on a mech becomes `uncertainty × lerp(TUNE.SIG_UNC_QUIET, TUNE.SIG_UNC_LOUD, signal / SIGNAL_MAX)`, with defaults 1.5 and 0.4. This applies both ways, on top of the existing contact, uncertainty and lock rules, and existing passive rules stay the floor.
13. The enemy ignores its own Signal this round (it doesn't go quiet on purpose). Note this in ASSUMPTIONS.

## NOT IN THIS ROUND
- **Heat** (from weapons), overheating or heat damage
- Builds or modules that change how the pools generate or dissipate
- A drone, scout or other expendable recon tool
- Showing enemy intent, predicted paths or enemy AP/Energy outside DBG
- Enemy AI that manages its own Signal
- Multiple mechs, a lance, new enemies, modules or maps
- Undo, rewind, replays, saves, menus, art, sound

## DEBRIEF FOCUS
1. **Step 1:** does seeing results turn by turn make plans feel like they matter? Does Jamie bank AP or save Energy **on purpose**, or does it feel like bookkeeping?
2. **Step 2:** does Jamie ever creep, skip radar or drop ECM **to stay quiet**? If it feels like homework, the first knob to drop is movement Signal (`SIG_MOVE_PER_TILE`).

## DONE
~10 runs played + fun test run, then save the status report as
claude/signal-lance-round4.md.
