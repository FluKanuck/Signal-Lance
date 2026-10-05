# Signal Lance: Round 13 brief — "Loud gets company"

Read claude/code-agent-brief.md and claude/playtest-method.md, then follow this round brief.

## QUESTION
When noise only lasts the turn it's made and emissions carry far, and a field that hears either one raises the alarm and closes in (pressing hardest on a wounded mech), does getting loud become a real risk Jamie manages on purpose?

## WHY
Round 12: to-hit and parts made fights richer ("played out differently" 3/3), but the fun test was 1/5 and Jamie's verdict was "fights felt richer, enemies felt dumb". In the design lead chat he said the field "let me off the hook" (nobody finished a cornered, hurt mech), "don't seem to actually hunt me", and "there is no risk right now in having high signal". He also said Signal is built wrong: sprint noise stacks up and lingers like a radar pulse. Noise and electronic emissions need to be separate things. Readable signal comes first, then an enemy that reacts to it.

## CHANGE
Build in two steps. **(Updated 2026-10-05, Jamie: both steps are built together, with step 2 behind `TUNE.PACK_ENABLED`, default false.)** Jamie plays step 1 first. The pack gets switched on once he can tell Sound and Emissions apart and makes moves knowing what they cost. If he can't, tune step 1 before flipping the flag.

Keep everything from Round 12 step 1 (contract, carry-over, job pick, payout and refit with `REFIT_CAP` and the R11 wrap costs, two-mech lance, initiative, AP, Energy, move modes, type ID on sight, muzzle flash, uplink, composition roll, MORTAR and blind lob, QUIET/NOISE zones, to-hit roll with the R12 cover tune, hit locations and per-part carry-over, tester splash) unless listed here. Rules go in `src/sim/` first, then the view. Both sides use identical rules.

### Step 1 — Split Signal into Emissions and Sound
1. **Emissions** is today's Signal pool, renamed (code and UI: "EMIT"). It keeps everything it does now: 0 to `SIGNAL_MAX`, builds, cools by `SIG_DECAY` at the start of the owner's activation, tightens the other side's fix (`SIG_UNC_QUIET` → `SIG_UNC_LOUD`), carries to passive sensors (`SIGNAL_EMIT`), and feeds the to-hit bonus (`HIT_SIG_MAX`). Its sources become electronic only:
   - radar pulse `SIG_RADAR` (30), ECM `SIG_ECM` (15 per turn), uplink `SIG_UPLINK` (25). Unchanged.
   - Movement no longer adds Emissions: set `SIG_MOVE_PER_TILE` to 0 for all modes and mark it and `CREEP_SIG_MULT` unused in `tune.ts` (keep them, commented).
   - The gun's firing spike and `SIG_MORTAR` no longer add Emissions. They move to Sound.
2. **Sound** is a new, separate thing. It **does not accumulate**. Each unit has one sound value: the **loudest** sound event it made during its current activation (not a sum). It **clears at the start of that unit's next activation**, so every other unit gets exactly one round to hear it. Note this in ASSUMPTIONS.
3. **Sound is a radius in tiles**, in `TUNE.SOUND_RANGE` (each commented):
   - CREEP move 2, NORM move 6, SPRINT move 9 (sprinting is louder than walking but doesn't travel as far as a gunshot)
   - gun shot 12, mortar launch 14
   - A move's sound is set when the move starts, by its mode. Several moves or shots in one activation still give just the loudest.
4. **Hearing.** Any unit within a sounding unit's radius gets a **sound contact** on it: position = true position + a seeded offset, uncertainty `SOUND_UNC` (default 5 tiles). Sound ignores walls (no LoS needed); note it in ASSUMPTIONS.
   - A sound contact never qualifies for a gun lock (`PLAYER_FIRE_UNC`) or an aimed lob (`MORTAR_MAX_UNC` 4) on its own. It tells you *something is over there*, nothing more. Blind lobs are still allowed, as now.
   - Sound contacts follow the existing contact rules (`BEARING_LIFE`, `UNC_GROW_OWN_TURN`, per-unit tagging), and can be tightened by eyes, emissions or a cross-fix as now.
5. **Zones.**
   - QUIET multiplies a unit's sound radius by `ZONE_QUIET_SIG_MULT` (0.4), as well as its Emissions as now.
   - NOISE applies its existing multipliers (`ZONE_NOISE_UNC_MULT`, `ZONE_NOISE_UNC_FLOOR`) to sound contacts on a unit standing inside, the same as any other non-eyes fix.
6. **Display (player):**
   - Two readouts on the HUD: the **EMIT** bar (as today's Signal bar) and a **SOUND** readout showing this activation's radius in tiles (e.g. "SOUND 9").
   - Two rings on the map around each player mech, visually distinct: the existing emission ring, and a **sound ring** at the current sound radius that disappears when sound clears.
   - The move preview shows the sound radius the move will make, as a faint ring at the destination for the selected mode. That way Jamie can see what a SPRINT costs before tapping MOVE.
   - Enemy sound is shown only through the player's sound contacts. Label a pure sound contact "SOUND" until it's typed by eyes.
7. **Field units** make sound on the same rules (a patrol's NORM move is 6 tiles; a turret's shot is 12). The field brain is otherwise unchanged in step 1.
8. **DBG:** each unit's Emissions, current sound radius, and the sound contacts it holds.
9. **Reporting:** the log line adds the lance's loudest sound per hunt and how many sound contacts the field got on it, e.g. `· sprints 4 · heard 6×`.
10. **Runner:** run 20 contracts. Report, per side, how many sound contacts were made, their share of all first contacts, and Emissions averages. Report this before Jamie plays. **Flag** it if sound contacts never happen, or if they're more than half of all first contacts (sound is drowning out the sensors).

### Step 2 — The pack (alarm, converge, press the wound)
11. **Alarm.** When a field unit gains or refreshes a contact on a player mech from its **own** senses (eyes, emissions, sound or muzzle flash), it raises an alarm. Every other field unit within `ALARM_RADIUS` tiles gets a **shared contact** on that mech.
    - `ALARM_RADIUS` = `ALARM_RADIUS_BASE` (8) + `ALARM_RADIUS_EMIT` (8) × the mech's effective Emissions / `SIGNAL_MAX`. A loud mech pulls in units from further away.
    - The shared contact copies the original's estimate, with uncertainty + `ALARM_UNC_ADD` (2 tiles).
    - **No relay:** a shared contact never raises a further alarm. Only a unit's own senses do. Note this in ASSUMPTIONS.
    - A shared contact never qualifies for a firing lock. The unit still needs its own fix to shoot.
12. **Converge (patrols).** A patrol holding any contact on a player mech (own or shared) **drops its uplink leash** (`TEMPERS.LEASH` no longer applies) and moves toward the contact's estimate.
    - While the contact lives, it keeps closing in. When the contact fades, it searches the last estimate for `PACK_SEARCH_ACTIVATIONS` (default 2) of its activations, then returns to its normal leashed patrol.
    - It still obeys every AP, Energy, shot-cap and part rule (LEGS gone = CREEP only).
13. **Press the wound.** When a patrol knows about more than one player mech, it targets the **most damaged** one (most parts destroyed, then fewest CORE hits left; ties go to the nearest).
    - If its target is BADLY or worse, or has LEGS destroyed, the patrol SPRINTs toward it when it has the Energy (`PACK_SPRINT_ON_WOUNDED` true). Otherwise it moves at NORM.
    - Sprinting makes the patrol loud (step 1 rules), so a pack closing in can be heard coming. That's intended.
14. **Statics** raise and receive alarms. On a shared contact they turn to face it, as they do for bearings now. They never move.
15. **No intent shown.** The player gets no alarm indicator. They learn about it only through their own sensors (sound contacts on sprinting patrols, new contacts appearing). DBG shows alarm events as lines from the alarming unit to each unit it alerted, plus each patrol's current target and mode (LEASH / HUNT / SEARCH).
16. **Reporting:** the log line adds alarms raised on the lance, e.g. `· alarms 3`.
17. **Runner:** add `--loud`, which makes the scripted mechs SPRINT every move and pulse radar every activation they can. Run 20 contracts normal and 20 with `--loud`. Before Jamie plays, report for each: contracts complete vs failed, mechs lost, rounds until first contact on the lance, alarms per hunt, and patrol time spent in HUNT vs LEASH. **Flag** it if `--loud` doesn't lose noticeably more than normal (getting loud still carries no risk), or if every hunt turns into all four units on the lance by round 3 (the alarm is too strong).

18. All new values go in `src/tune.ts`, commented. Log R13 rows in `NOTES.md`; note the sound timing, walls, no-relay and target-pick rules in ASSUMPTIONS.
19. Update `src/view/brief.ts` (tester splash) per step: what's new in plain words (EMIT vs SOUND, and in step 2 that the field now comes for you), and end-of-hunt tap questions shaped by the debrief focus below. Bump `BUILD`.

## NOT IN THIS ROUND
- A full emission taxonomy (EM / IR / EF / acoustic), sensors or weapons that read different emissions differently, Heat, or IR modules. **Parked:** this round proves two channels, nothing more
- Enemies that take cover, retreat, flank, suppress, aim at parts or use zones on purpose
- Alarm relays, comms jamming, radio or a "call for help" action; RWR or any alarm warning for the player
- Enemy AI managing its own Emissions or Sound on purpose (going quiet, ambushing)
- R12 step 2 (aimed shots, per-part repair), more hits on legs/weapon, a cover-wall marker
- Any change to the to-hit formula or `HIT_*` / `COVER_*` values, mortar values, or contract or refit costs
- New unit types, an elite mech, compositions, maps, block maps, mission types
- Pilots, saves, menus beyond the existing screens, art, sound effects

## DEBRIEF FOCUS
1. **Step 1:** can Jamie tell Sound from Emissions at a glance? Did he ever CREEP instead of SPRINT, or hold a shot, because of the sound ring, and did hearing a "SOUND" contact help him find something? If the two channels feel like homework, the first knob is `SOUND_RANGE` (shrink the move values).
2. **Step 2:** did Jamie go quiet **because** he feared the pack, and did a hurt mech feel hunted rather than ignored? Does it feel fair (he could hear them coming) or like a dogpile? If it's a dogpile, the first knobs are `ALARM_RADIUS_BASE` and `PACK_SPRINT_ON_WOUNDED`.

Also ask once, early: **does the hit % make sense now?** (The R12 cover tune is still untested.) And once at the end: **did being loud ever cost you something you could point at?**

## DONE
~4–5 contracts (about 12–15 hunts) + fun test run, then save the status report as
claude/signal-lance-round13.md. Include the step 1 runner summary and both step 2 runner summaries (normal and `--loud`).
