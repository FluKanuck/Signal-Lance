# Signal Lance: Round 12 brief — "Pick your shot"

Read claude/code-agent-brief.md and claude/playtest-method.md, then follow this round brief.

## QUESTION
Do shots that roll to hit (from the target's Signal, range, how far it last moved and cover) and strike specific parts make each shot a choice of what to aim at and whether to take it?

## WHY
Round 11: the contract frame holds, but the fun test was 1/5 and Jamie's missing piece is "more tactical depth". In the design lead chat he described fights as: the same solve every time, enemies as props, and damage that's all-or-nothing ("a hit is just a hit"). Today every legal shot hits (parked #15). A to-hit roll plus hit locations gives every shot a risk and a target, and part damage carried through the contract gives the lance scars.

## CHANGE
Build in two steps. The game must be playable after step 1 on its own. Ship step 1, report, and wait for "played" and a debrief before starting step 2. **Only start step 2 if the step 1 debrief says the to-hit roll reads as fair and shots feel like choices.** If it feels random or unfair, stop, tune step 1, and report.

Keep everything from Round 11 (contract, carry-over, job pick, payout and refit with `REFIT_CAP`, two-mech lance, initiative, AP, Energy, move modes, Signal, noise ring, type ID on sight, muzzle flash, uplink, composition roll, MORTAR and blind lob, QUIET/NOISE zones, R8 hunt fixes, tester splash) unless listed here. Rules go in `src/sim/` first, then the view. Both sides use identical rules.

### Step 1 — To-hit roll and hit locations
1. **The lock rule stays the gate.** FIRE is still allowed only under the existing rules (`PLAYER_FIRE_UNC`, `PLAYER_FIRE_RANGE`, LOS, AP, cap, ammo; enemy `ENEMY_FIRE_UNC` from `TEMPERS`). Once allowed, the shot now **rolls to hit** from the seeded RNG.
2. **Hit chance** (percent), clamped to `HIT_MIN`–`HIT_MAX` (defaults 10–95):
   `HIT_BASE` (75)
   **+ Signal:** `HIT_SIG_MAX` (15) × target's *effective* Signal / `SIGNAL_MAX`. Effective means after zone multipliers (QUIET's `ZONE_QUIET_SIG_MULT`), the same value others read now. Loud targets are easier to hit.
   **− Range:** `HIT_RANGE_PER_TILE` (3) per tile beyond `HIT_RANGE_FREE` (4).
   **− Target moved:** `HIT_MOVED_PER_TILE` (4) per tile the target moved during its **last activation**, up to `HIT_MOVED_MAX` (24). Statics are always 0. Track tiles moved per unit in sim state; reset at the start of that unit's next activation.
   **− Cover:** `HIT_COVER` (25) if the target is in cover. Cover = the shot line from shooter to target passes within `COVER_GRAZE` (0.5) tiles of a wall tile that is within `COVER_RANGE` (1.5) tiles of the target. Simplest geometry that works; note it in ASSUMPTIONS.
3. **Show the odds before firing.** When a contact is selected and FIRE is allowed, the FIRE button shows the hit % (e.g. "FIRE 62%"). Tapping the % (or a small ⓘ) shows the breakdown in one short line: "base 75 · sig +6 · range −12 · moved −8 · cover −25". The enemy's own odds show in DBG only.
4. **Misses.** A miss still spends the AP, the shot, the ammo, adds the firing spike and gives the target the muzzle-flash contact, as now. The log and HUD say "MISS (62%)".
5. **Hit locations.** Every unit has parts in `TUNE.PARTS` (per unit type, each commented):
   - **Mechs and patrols:** SENSORS, WEAPON, LEGS, CORE
   - **Turret and emplacement:** SENSORS, WEAPON, CORE (no legs)
   - A hit picks a part by weight `PART_WEIGHTS` (defaults CORE 40, LEGS 25, WEAPON 20, SENSORS 15; renormalised for units without legs).
   - **Durability is unchanged in total:** split each unit's existing hit pool (base hits plus armour plates) across its parts by `PART_SHARE`, rounding so the total matches today's. Note the rounding in ASSUMPTIONS.
   - A hit on a part that's already destroyed spills to CORE.
6. **Part destroyed = effect** (both sides):
   - **SENSORS:** radar, ECM and ghost disabled; `EYES_RANGE` × `PART_SENSORS_EYES_MULT` (0.5). Passive keeps working.
   - **WEAPON:** the gun can't FIRE (blocked reason "WPN"). The mortar module is unaffected.
   - **LEGS:** CREEP only (blocked reason on NORM/SPRINT: "LEGS").
   - **CORE:** unit destroyed, as now.
7. **Mortar.** No to-hit roll (scatter already does that). A splash hit rolls a part by `PART_WEIGHTS`.
8. **Damage read.** Replaces the single read with a per-part read, using the existing words (SCRATCHED / BLOODIED / BADLY / gone). Player mechs always; enemy units LoS-only, as now. Keep it compact on a phone: one short line per unit, e.g. "COR ok · LEG badly · WPN ok · SNS gone".
9. **Contract carry-over.** Damage carries **per part**. A part destroyed in a hunt stays destroyed until repaired. The job-pick lance state shows the per-part read. For step 1 only, the existing refit "repair one hit" fixes the most damaged part first (destroyed parts count), still under `REFIT_CAP`. Note it in ASSUMPTIONS.
10. **Enemy brain.** Fires when its lock rules allow, as now, with no hit % threshold. It doesn't pick parts. A unit that has lost a part obeys the same effect rules.
11. **Reporting.**
    - Log line adds shots and hits for the lance, e.g. `· shots 9 hit 5 (56%)`, and parts lost, e.g. `· A LEG gone`.
    - Result screen lists each unit's parts at the end.
    - DBG shows the full hit breakdown for the last shot either side fired.
12. **Headless runner.** Run 20 contracts. Report before Jamie plays: overall hit %, hit % split by in cover vs not, target moved vs static, and range band (≤4, 5–8, 9–12); part destructions by part and unit type; contracts complete vs failed; average hunt length in rounds vs R11; stalls over 80 rounds. **Flag** if hit % sits outside roughly 40–75% overall, if any factor never applies, or if hunts got much longer (misses can stall fights).

### Step 2 — Aimed shots and part repair
13. **Aim.** With a contact selected and its type identified (type ID on sight), Jamie can tap a part on the target's read to aim at it. An aimed shot hits that part on a hit, at `HIT_AIMED` (−20) to the chance. The FIRE button shows the aimed odds ("FIRE LEG 42%"). Unaimed shots roll a location as in step 1. Unidentified contacts can't be aimed at (reason "ID").
14. **The enemy doesn't aim** this round. Note it in ASSUMPTIONS.
15. **Part repair on refit.** Replace "repair one hit" with per-part repair: pick the part, `COST_REPAIR` per hit as now, still under `REFIT_CAP`. Repairing a destroyed part back to 1 hit costs `COST_PART_RESTORE` (default 60) on top.
16. **Reporting:** the log adds aimed shots and their hits, e.g. `· aimed 4 hit 2`.
17. **Runner:** the scripted mechs aim at WEAPON on identified targets when the aimed chance ≥ 40%, otherwise fire unaimed. Re-run 20 contracts and report before Jamie plays.

18. All new values go in `src/tune.ts`, commented. Log R12 rows in `NOTES.md`; note cover geometry, part split and the refit rules in ASSUMPTIONS.
19. Update `src/view/brief.ts` (tester splash): what's new in plain words, how the hit % works, and end-of-hunt tap questions shaped by the debrief focus below. Bump `BUILD`.

## NOT IN THIS ROUND
- **New mission types or objectives** (R13 candidate)
- New maps, map mirroring or rotation, new zones or LoS blockers (map variety is a separate chore if Jamie wants it)
- Enemies that react, reposition, flank, call for help, or aim at parts; enemy tiers or an elite mech
- Crits, ammo explosions, knockdowns, heat, morale or suppression
- Salvage, buying parts or modules, changing loadouts between hunts
- Changes to mortar scatter, mortar damage or any `MORTAR_*` value
- Pilots, saves, menus beyond the existing screens, art, sound

## DEBRIEF FOCUS
1. **Step 1:** did Jamie ever hold fire, reposition for a better % (closer, out of their cover, wait for them to stop moving), or fire anyway on purpose? Does the % read as fair, or do misses feel like bad luck? If misses dominate the complaints, the first knobs are `HIT_BASE` and `HIT_COVER`.
2. **Step 2:** did he aim for a part on purpose (legs on a patrol, weapon on a turret, sensors on an emplacement) and did a broken part change a fight, his own or theirs? Did losing a part on his own mech change how he played the next hunt?

Also ask once at the end: **did a fight play out differently from the usual find, fix, shoot?**

## DONE
~4–5 contracts (about 12–15 hunts) + fun test run, then save the status report as
claude/signal-lance-round12.md. Include both runner summaries.
