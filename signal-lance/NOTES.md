# Signal Lance: notes

The permanent home of the TWEAK LOG and ASSUMPTIONS (moved verbatim from the top of the old
`signal-lance.html` in Round 6). Newest rows go at the end of each block.

## Layout

- `src/tune.ts`: every tuning value, each commented.
- `src/sim/`: pure game rules. `world.ts` (map, reachability, LoS, A*), `state.ts` (G, newHunt,
  rollEnemy, hooks), `turns.ts` (turns, AP/Energy/Signal, moves, radar, shots, uplink, step(dt),
  player commands), `sensors.ts` (signature, detection, contacts, bearings), `bot.ts` (temperaments,
  variants, the enemy's turn), `rng.ts` (seeded RNG), `contract.ts` (R11: contracts, jobs, carry-over).
- `src/view/`: `render.ts` (canvas), `hud.ts` (HUD and buttons), `input.ts` (touch/mouse),
  `screens.ts` (loadout, result, run log, localStorage), `state.ts` (camera and other view-only state),
  `brief.ts` (tester splash, basics, end-of-hunt questions: update TEST + QUESTIONS every round).
- R14: `src/sim/scenarios.ts` (the test bed), `src/sim/ids.ts` (observed traits, matcher, IDs), `src/view/testbed.ts`,
  `src/view/card.ts` (CARD and ID picker).
- R16: `src/sim/blocks.ts` (the block library, district roll / build, the seam-built escort route, mapText). The map
  itself is per-hunt state in `world.ts` (loadMap).
- R15: `src/sim/mission.ts` (mission types: the hunt's goal, Bounty pay, Retrieve cargo, extract / clear rules), `src/sim/escort.ts`
  (the Escort transport and its route). Map anchors (uplinks, cargo, escort route): `MAP_ANCHORS` in `world.ts`.
- R13: `src/sim/sound.ts` (Sound), `src/sim/pack.ts` (alarm, pack target), `src/sim/autoplay.ts` (the scripted
  player, shared by the runner and the tests). `test/` holds the Vitest tests (`npm test`).
- `src/main.ts`: wiring and the frame loop.
- `npm run build` → `dist/signal-lance.html` (one self-contained file; republish it to the artifact).

## ASSUMPTIONS

```text
   SIGNAL LANCE — prototype toy. Round 5: "Get the job done" (rolled uplink objective), built on Round 4 (I-go-you-go, AP, Energy, Signal).
   ASSUMPTIONS
   - World units = CSS px at zoom 1; one tile = TUNE.TILE units.
   - Map edges count as solid. 8-way A* with no corner cutting, then
     straight-line smoothing where the path is clear.
   - Extraction = the rightmost TUNE.EXTRACT_COLS columns.
   - Camera follows the player until you drag; CTR re-attaches it.
   - Step 1 has no enemy yet, so reaching extraction = BAIL; AGAIN restarts.
   - Holding the phone in portrait freezes the hunt (overlay covers it).
   - Buttons react on pointerdown (not click) so touch preventDefault
     can't swallow them.
   - Detection (sig ÷ distance, × wall attenuation, vs threshold) is one
     shared function. Eyes ignore it: eyes = within EYES_RANGE with clear LOS.
     Detection feeds passive bearings (step 3) and the enemy (step 4); in
     step 2 its live values are only shown by the DBG toggle.
   - Eyes and radar give exact fixes. Triangulated fixes carry the real
     bearing error, so the blip really is off by about the circle size.
   - Lost contacts dead-reckon: centre drifts along last seen velocity for
     DR_TIME, radius grows at UNC_GROW.
   - Step 3 has no loadout screen yet: every module is fitted (G.load) so
     all buttons can be tested. Step 5 replaces this with the loadout.
   - Power regenerates slowly (POWER_REGEN) while radar and ECM mask are off;
     power at 0 switches both off.
   - Passive suite samples a bearing every BEARING_EVERY s on any enemy that
     is emitting (moving / firing / radar / jamming) AND passes detection.
     Standing still = silent to passive. Each bearing has random angular error.
   - Triangulation: a new bearing is crossed with the live bearing giving the
     widest angle (taken ≥ TRI_MIN_BASE tiles away, angle ≥ TRI_MIN_ANG).
     Uncertainty ≈ range × bearing error ÷ sin(angle). Repeated fixes blend
     and shrink the circle; stale ones go orange and dead-reckon as before.
   - Radar sees through up to RADAR_MAX_WALLS building tiles (user override
     of the spec). Clear LOS = exact fix; each wall tile adds RADAR_WALL_UNC
     to the uncertainty and the blip is offset by a real error that re-rolls
     every RADAR_JIT_TIME s.
   - ECM mask multiplies your signature by ECM_MASK_MULT. Mask or an active
     ghost sets you "jamming" (emission SIG_JAM, bearing-only for the enemy,
     used from step 4). Ghost is a one-off power cost and lasts GHOST_TIME;
     only one ghost at a time. It does nothing until the enemy exists (step 4).
   - Eyes see only within EYES_HALF_ANG of facing (both mechs). Facing =
     last movement direction; the enemy also turns to face a contact while
     pulsing radar or firing from a standstill.
   - Enemy needs ENEMY_REACT s of continuous tracked lock before shooting.
   - Hits: base PLAYER_HITS + ARMOUR_HITS per plate (enemy: 3 + 3 = 6).
   - Shells fly to the aimed point and stop at the first building tile. A hit
     = victim within HIT_RADIUS of the aim point when the shell lands.
   - FIRE with nothing selected auto-selects your best contact.
   - Enemy states: PATROL → INVESTIGATE (any contact or fresh bearing; a bare
     bearing sends it ENEMY_INVEST_DIST tiles down the line) → PULSE radar
     when a tracked contact is within ENEMY_CONFIDENT → CHARGE (radar stays
     on, fires at its estimate when certain, in range and in LOS) → SEARCH the
     last known spot → PATROL.
   - Enemy gets a bearing on you immediately when you switch radar on, and
     every BEARING_EVERY s while it stays on. Your jamming gives it bearing-only
     lines (never triangulated).
   - Ghost: injected straight into the enemy's contacts with GHOST_UNC while
     active. Enemy radar is fooled by it; only its eyes (EYES_RANGE + LOS)
     expose it, which ends the ghost.
   - Loadout: radar, passive and ECM are 0/1 each; armour up to 5 plates;
     ammo and cells up to 10 slots. Slot costs from the spec table. The last
     loadout and the log live in localStorage (memory if blocked).
   - Result → SAVE & NEXT always logs a line (note may be empty) and returns
     to the loadout. Log format: date time | loadout | outcome | time |
     damage summary | note (damage field added at user request).
   - Copy log uses the clipboard; if that's refused, the log is shown in a
     selected text box to copy by hand.
   ROUND 2 ASSUMPTIONS
   - Temperament and variant are rolled (uniformly, independently) each time
     the loadout screen opens, so the INTEL line is what you'll face on LAUNCH.
     INTEL is always accurate this round.
   - Temperament knobs (TUNE.TEMPERS): patience range, CONFIDENT (contact
     certainty at which it commits to pulse → charge; bigger = charges on vaguer,
     longer-range contacts), FIRE_UNC (lock needed to fire), HOLD_DIST (how close
     it closes before holding; was a hard-coded 4 tiles), CREEP (creeps with the
     player's creep speed/signature while investigating or searching),
     PULSE_EVERY (radar pulse on a timer while patrolling/investigating; 0 = only
     when confident).
   - Variant (TUNE.VARIANTS) uses the player's modules: armour plates, radar,
     passive, ECM, rounds, power cells. "Extra radar power" = extra power cells,
     so its radar stays on longer in a charge.
   - ECM variant: mask on whenever it isn't patrolling (power permitting). Its
     mask cuts its signature exactly like yours, and its jamming gives your
     passive bearing-only lines (dashed, never triangulated) — mirrors the rule
     the enemy already had for your jamming. It has no ghost.
   - No-passive (HEAVY) enemy gets no bearings at all (incl. hearing your radar),
     so it pulses radar every ENEMY_BLIND_PULSE s while patrolling/investigating
     to have any way to find you.
   - An enemy with no radar (ECM variant) skips PULSE and charges as soon as
     it is confident.
   - A pulse that finds nothing sends it back to PATROL (was always INVESTIGATE,
     which only differed when no contact existed at all).
   - Log format is now: date time | loadout | vs TEMPERAMENT VARIANT | outcome |
     time | damage summary | note.
   ROUND 3 ASSUMPTIONS (WEGO turns — superseded by Round 4; kept for history)
   - Turn loop wraps the unchanged real-time sim: PLAN (sim frozen, G.time stops)
     → COMMIT → RESOLVE (sim runs TUNE.TURN_SECONDS) → PLAN. Turn 1 starts in PLAN.
   - Orders are sticky: move destination, CREEP, FIRE order, radar and ECM mask
     carry into the next turn until you change them. A move that doesn't finish in
     one turn keeps going next turn. STOP clears the move (hold position).
   - Radar / ECM / GHOST / CREEP / FIRE / STOP and map taps only work in PLAN.
     Toggling radar or ECM in PLAN is the order (time is frozen, so it takes
     effect when the turn resolves). A ghost is placed in PLAN and goes live then.
   - During RESOLVE the only input is the COMMIT button, which becomes PAUSE /
     RESUME for inspection. Dragging the camera still works (not an order).
   - Player auto-fire rule (mirror of the enemy's lock rule; the player had none
     before): fires at the selected contact's estimate when it is tracked (not
     lost), uncertainty ≤ PLAYER_FIRE_UNC, within PLAYER_FIRE_RANGE, clear LOS to
     the estimate, weapon cooled; at most SHOTS_PER_TURN shots per turn. No
     reaction delay for the player. Fire order on with nothing selected auto-selects
     the best contact (as the old FIRE did); if the selection vanishes mid-turn it
     re-picks the best contact.
   - Enemy "orders": its existing state machine keeps running through RESOLVE
     (same temperament/variant logic, same sensors). It never sees your planned
     orders, only its sensors, as before. Simplest option; it can still re-path
     inside a turn while you can't.
   - Enemy orders, path and intent are never drawn (DBG overlay excepted, as before).
   - Log line and result screen gain the turn count ("turns N").
   ROUND 4 ASSUMPTIONS (step 1: I-go-you-go with AP and Energy)
   - Turn order: PLAYER TURN → ENEMY TURN → next turn. The player goes first. TURN n
     counts full rounds. COMMIT, the resolve bar, PAUSE, STOP, the fire order and
     TURN_SECONDS are gone.
   - Start of each side's own turn: +AP_PER_TURN (bank capped at AP_BANK_MAX),
     +ENERGY_REGEN, then ECM upkeep (AP_ECM + ECM_EN) if ECM is on; can't pay = ECM off.
     Both mechs start the hunt with 0 AP, so turn 1 = 4 AP.
   - Old power → Energy mapping. Pool: POWER_BASE 100 → ENERGY_BASE 100, POWER_CELL 50
     → ENERGY_CELL 50 (Hunter's +2 cells = +100 Energy). Radar: 8/s drain → RADAR_EN 25
     per pulse (4 pulses from full). ECM mask: 5/s over a ~4 s turn → ECM_EN 20 per turn.
     Regen: 1.5/s (≈6 per 4 s turn, only with radar/ECM off) → ENERGY_REGEN 10 per turn,
     always. Sprint 10 EN/tile (≈10 tiles from full), normal 1/tile, creep 0.
   - Radar is now a pulse, not a toggle: RADAR_PULSE_TIME of sim with radar on, cone on
     your facing. If a contact is selected, you turn to face it first (free), like the
     enemy already did. A clear-LOS radar fix stays "tracked" for RADAR_HOLD s of sim
     (was 0.1 s), so a pulse can be followed by two shots.
   - GHOST (not in the brief's action list, kept): costs AP_ECM + GHOST_COST, lasts
     GHOST_TURNS of your turns (was GHOST_TIME seconds).
   - Moves: cost = ceil(path tiles ÷ MOVE_TILES_PER_AP) AP and ceil(tiles ×
     MOVE_ENERGY_PER_TILE) EN. A move you can't afford is cut to what you can; the
     preview shows the cut point. If a move was cut, the destination stays set, so
     next turn MOVE carries on toward it.
   - Sprint uses the normal movement signature (SIG_MOVE); Signal comes in step 2.
   - FIRE is manual: 1 tap = 1 shot at the selected contact (or your best contact).
     Lock rule unchanged (tracked, ≤ PLAYER_FIRE_UNC, ≤ PLAYER_FIRE_RANGE, LOS).
     Disabled reasons: AMMO, CAP (2 shots used), AP, FUZZY, RANGE, LOS, NONE.
     SHOT_COOLDOWN is dropped (time is frozen between actions anyway).
   - Time: frozen between actions. MOVE runs the real-time sim until the mech arrives
     (the other mech stands still, but both sides' sensors run). PULSE runs
     RADAR_PULSE_TIME; a shot runs until the shell lands. Contacts, bearings and the
     firing spike only age while the sim runs.
   - Enemy uses exactly the same costs, caps, lock needs and move modes (and the
     player's move speeds; ENEMY_SPEED / INVEST / CHARGE are gone). ENEMY_REACT is
     dropped for both sides: the turn itself is the reaction delay.
   - Enemy turn, one action at a time with ENEMY_ACT_PAUSE between: shoot if its lock
     rule allows (temperament FIRE_UNC); ECM variant masks while hunting, drops it on
     patrol; one radar pulse per turn at a contact in range it can't shoot yet (or the
     timed pulse); then one move toward its contact / bearing line / patrol point.
     Reaching a stale estimate with nothing there drops that contact.
   - Temperament → spending (simplest mapping):
     AGGRESSIVE sprints while hunting and spends all its AP (keeps 2 for shots when
     near). PATIENT creeps while investigating and moves at most 2 AP a turn, banking
     the rest. CAUTIOUS moves at normal speed and never spends the Energy it needs
     for one radar pulse. Within HOLD_DIST of a tracked contact it holds (banks AP)
     for its patience, then pushes.
   - Free turn (run1 debrief): tapping a contact selects it AND turns you to face it;
     tapping your own mech then anywhere turns you to face that spot. 0 AP, no sim time,
     but it takes one zero-time sensor look so your eyes update at once. The enemy gets
     the same: before each of its actions it turns free toward its best contact.
   - Run2 debrief: facing is 1 free change per turn (FREE_TURNS), then AP_TURN each.
     Already facing within ~10° is free. Turning as part of a move, shot or pulse stays
     free (the mech turns as it acts). If you can't pay, tapping a contact just selects
     it. The enemy only pays AP to turn if it still has more than its 2 shots' worth.
   - Run3: face mode (tap own mech, radius SELF_TAP_PX) can be cancelled by tapping the
     mech again or by MOVE, which reads CANCEL while armed. Nothing is paid until you turn.
   - Damage read: the enemy contact shows LOOKS FINE / BLOODIED / BADLY DAMAGED
     (fraction of its own max hits) while your fix is live and within PLAYER_FIRE_UNC;
     when stale it keeps the last state seen, in grey. Ghost contacts never get one.
   - Step 2 Signal: brief's SIG_* knobs are named SIGNAL_* (SIG_RADAR already means the
     radar detection signature). Signal is added when the action is paid: pulse +30,
     ECM +15 on switch-on and at each turn-start upkeep, move +tiles × per-tile rate.
     Decay (−25) happens at the start of the owner's turn, before ECM upkeep. Shots add none.
   - Signal scaling is applied to the measured uncertainty of every new fix on that mech
     (eyes, radar, triangulation) inside observe(); growth of a lost contact is unchanged
     and detection itself (who gets a bearing) is unchanged. Ghost fixes are not scaled.
   - The enemy ignores its own Signal this round (never goes quiet on purpose).
   - Run5 (spec override, Jamie "go"): Signal also carries — it adds SIGNAL_EMIT × Signal
     to the passive emission, and a mech with Signal > 0 counts as emitting even standing
     still. Orange dashed noise ring = open-ground range at which passive hears you now
     (walls shrink it); HUD "HEARD ~N t". Enemy's ring in DBG only.
   - Run6: creeping multiplies the whole signature by CREEP_SIG_MULT (both mechs). DBG also
     marks the bot's best contact: magenta X + circle + "BOT THINKS YOU/GHOST ±Nt"
     (dashed = stale).
   - Run5: eyes see EYES_RANGE 12 tiles (was 5) in the facing cone; the damage label shows
     only while your eyes actually see the enemy (no grey memory any more).
   - Jamie's test asks (run4): the run log clears when BUILD changes (bumped each publish);
     killing the enemy ends the hunt as WIN at once (no run to the extraction zone).
     Extracting without a kill is still BAIL.
   - Old per-second enemy timers become turns via SEC_PER_TURN (2): patience, the
     Cautious pulse timer (6 s → 3 turns), the blind (HEAVY) pulse (8 s → 4 turns).
   ROUND 5 ASSUMPTIONS (rolled uplink objective)
   - The uplink point is rolled with the enemy (each time the loadout screen opens), from
     UPLINK_CANDIDATES at least UPLINK_MIN_DIST tiles from the player's spawn, and named
     in the INTEL line. It is always drawn (gold ring); when it is off-screen, a gold
     arrow at the screen edge points to it with its distance.
   - "Within UPLINK_RADIUS tiles" = within (UPLINK_RADIUS + 0.5) tiles of the point's
     centre (the ring), so standing anywhere on the tile or next to it counts.
   - UPLINK is instant (no sim time): pay AP_UPLINK, add SIG_UPLINK Signal, +1 pip. Once
     per turn. Progress persists if you leave and come back. The last pip = WIN (UPLINK).
     Button reasons: RANGE (not in the ring), DONE (already used this turn), AP.
   - Reachability: a flood fill from the player's spawn marks every reachable street tile.
     The enemy spawn, its patrol points and its guard post must be reachable (fixes the
     walled-in courtyard at the top middle, and a second walled pocket right of centre).
     The brief's "not within UPLINK_MIN_DIST of the player" is already covered by
     ENEMY_SPAWN_MIN (35 tiles); the spawn uses the larger of the two.
   - Bot and the uplink (simplest mapping):
     PATIENT guards: a guard post is picked at hunt start, a reachable street tile within
     GUARD_RADIUS of the point, next to a building (≥ 2 solid neighbours) and with clear
     LOS to the point. It goes there at full AP (its 2-AP cap only applies when hunting),
     then holds, facing the point. It leaves only for a firm contact (tracked, fix within
     its CONFIDENT); shots, ECM and pulses still happen from the post. With no firm contact
     it walks back.
     AGGRESSIVE: its first patrol leg is the uplink point; after that, random as before.
     CAUTIOUS: every patrol point is a random reachable tile within its LEASH of the point
     (was GUARD_RADIUS × 1.5 = 9; same value).
   - DBG adds the bot's goal: dashed magenta line to its current guard / patrol / hunt
     target, labelled with that target's distance from the uplink.
   - Result screen and log outcome read "WIN UPLINK" or "WIN KILL".
   - Run1 leash: a bare bearing's "position" = the point ENEMY_INVEST_DIST down the line (the same
     spot it would investigate). The leash is measured from the bot's estimate, not your true spot.
   ROUND 6 ASSUMPTIONS (straight port, "New home")
   - Same page shape as before: the source signal-lance.html is a fragment (title, style, markup,
     no doctype/head), so the artifact viewer wraps it exactly as it wrapped the old file.
   - src/sim/ is pure rules (no DOM, canvas, window, localStorage, Math.random). The view talks to it
     through commands (cmdMove, cmdRadar, cmdFire, cmdUplink, endPlayerTurn, ...) and reads G.
     The sim tells the view things through three hooks: sync (buttons), end (result screen),
     playerHit (red border). Camera, zoom, DBG, the armed face/ghost tap modes and the hit flash
     moved out of G into the view's V. The loadout being edited lives in the view; LAUNCH passes
     a copy to newHunt(load).
   - Seeded RNG (mulberry32, sim/rng.ts). The view picks a new seed each time the loadout screen
     opens; rollEnemy(seed) reseeds, so one seed fixes temperament, variant, uplink, enemy spawn and
     guard post. In-hunt rolls (bearing error, radar jitter, patience) continue the same stream, so
     they replay exactly only if the player's actions do too. The seed shows on the DBG line.
   - The very first newHunt at page load (hidden behind the loadout screen) runs on seed 1 with the
     uplink at 0,0, as before (ported, not fixed).
   - syncButtons no longer writes p.jamming (updateSensors already sets it before every use).
   - BUILD (clears the run log when it changes) moved to view/screens.ts ('r6-s1', 'r6-s2', ...).
   - Headless runner (scripts/sim.ts, Node type stripping, no extra tools): fixed step 0.05 s, the
     game's default loadout, seeds 1..N. Its scripted player is deliberately dumb (NORMAL walk to the
     uplink, select + face its best contact, fire whenever the lock rule allows, uplink when in range).
     A seed replays the same setup as in the browser; in-hunt rolls only match if the moves do.
   ROUND 7 ASSUMPTIONS ("Lance vs the field", step 1: the field)
   - The duel bot is gone: G.e / G.ec / G.eb → G.units[], each unit with its own contacts (ec), bearings
     (eb) and radar jitter. Composition TUNE.FIELD (1 turret, 1 emplacement, 2 patrols), stats in
     TUNE.FIELD_TYPES. No temperament / variant roll; TEMPERS and VARIANTS stay in tune.ts, unused.
   - Hits for a field unit = BASE_HITS (0) + ARMOUR × ARMOUR_HITS: turret 3, emplacement 6, patrols 3 each
     (15 in all vs the default 20 rounds). "Armour 1/2" read as plates, like the player's.
   - No shared info between field units: each acts on its own sensors only.
   - Patrol brain = the old bot brain with the CAUTIOUS values copied into FIELD_TYPES.PATROL (fire 2 t,
     confident 2 t, hold 8 t, patience 3–6 s, leash 9 = GUARD_RADIUS × 1.5). Patrols have no radar, so
     CAUTIOUS's timed pulse doesn't apply. Patrols move NORM (CREEP if NORM can't be afforded).
   - Static units (turret, emplacement) never move. They face the uplink at spawn, use their free turn
     to face their best contact or, failing that, their freshest bearing (a static passive can't
     triangulate, so turning to look is how it follows a bearing). Then eyes do the rest.
   - Turret: passive only, fires on FIRE_UNC 1.2 (= PATIENT). It never pulses or moves, so it only
     emits while firing (SIG_FIRE for SIG_FIRE_TIME); Signal stays 0.
   - Emplacement: radar, no passive suite, 1 energy cell, fires on FIRE_UNC 2 (= the player's lock).
     Pulses every EMPL_PULSE_TURNS (2) of its turns: at its best contact, else it sweeps (turns
     EMPL_SWEEP_DEG 100° per pulse). Signal from pulses (30, −25/turn) keeps it audible to passive.
   - Muzzle flash: the unit a shot is aimed at (the contact's owner; nothing for a ghost) gets an
     exact contact on the shooter, FLASH_UNC 2 t, centred on a real random error inside that circle
     (not scaled by Signal). It goes stale like any eyes fix, so it shows WHERE, not a firing lock.
   - Shells hit the nearest living unit of the other side within HIT_RADIUS of where they land.
   - Player bearings are tagged per unit and only cross with bearings on the same unit (no false fixes).
     Bearing pool 16 → 32.
   - Spawns: turret + emplacement on guard tiles (within GUARD_RADIUS of the uplink, next to a
     building with LOS to it if possible); patrols anywhere reachable; all ≥ UPLINK_MIN_DIST from the
     player, outside extraction, one per tile. ENEMY_SPAWN_MIN is no longer used.
   - Enemy phase: living units act in list order (turret, emplacement, patrols), one action at a time,
     ENEMY_ACT_PAUSE apart. Each unit's AP / Energy / Signal tick at the start of its own activation.
   - Pacing (view only): while the acting unit is not a live contact of yours and no shell is in
     flight, the enemy phase runs ENEMY_UNSEEN_SPEED (5) sim steps per frame. Nothing to watch, so
     no reason to wait 6–8 s for unseen patrols to walk.
   - Contacts are not labelled by type (you only know "a contact"); INTEL gives the composition.
   - WIN UPLINK or WIN CLEAR (all 4 destroyed). A kill no longer ends the hunt. Extraction = BAIL.
     Result screen and log: "WIN UPLINK · kills 2/4", plus a per-unit field line. BUILD r7-s1.
   - Runner: same dumb scripted player (walks NORM to the uplink, fires whenever it can). Prints wins
     by type, average kills, stalls, and per type: found / acted / fired / destroyed.
   ROUND 7 ASSUMPTIONS (step 2: the lance, in initiative order)
   - Two mechs, A and B (G.lance). G.p = the mech whose activation it is (or was last); every player
     command acts on it. G.load = G.p.load. Each mech has its own AP, Energy, Signal, ammo, hits, passive clock.
   - Loadout: MECH A / MECH B toggle beside SLOTS. A is the old saved loadout (signalLance.load); B is saved
     as signalLance.loadB and starts as a copy of A. B spawns on the nearest reachable tile next to A.
   - One shared contact picture for the lance (G.pc / G.pb): either mech's eyes, radar or bearings feed it,
     and bearings from A and B on the same unit cross into fixes. Contacts and FIRE target are shared.
   - Field units track each mech separately (contact ids A / B); muzzle flash on a mech goes to the lance picture.
   - Initiative each round: INIT_BASE[type] + seeded 0..INIT_ROLL (mech 5, turret 6, patrol 4, emplacement 3).
     Higher first; ties go to the player's mechs, then a fixed list order (A before B, field in spawn order).
     Rolled once per round over living units; the dead are skipped. A round = everyone's activation; ROUND n in HUD.
   - Each activation: +AP_PER_TURN (bank to AP_BANK_MAX), Energy regen, Signal decay, ECM upkeep, then act.
     END TURN passes to the next in order. One UPLINK per mech activation, so both mechs can uplink in a round.
   - Ghost: still one at a time; it counts down on its owner's activations and jams for its owner only.
   - Initiative strip (top right, under the 56px bar): A / B always; a field unit appears as "?" only while you
     have a contact on it; untracked units not shown. Current activation highlighted, already-acted dimmed.
   - Camera centres on a mech when its activation starts (and the face / ghost tap modes are cleared).
   - LOSS when both mechs are destroyed (grey X, "A ✕"). A mech reaching extraction still ends the hunt (BAIL).
   - Runner: two scripted mechs (same dumb script, same default loadout) under initiative.
   ROUND 8 ASSUMPTIONS ("Different field, different plan")
   - TUNE.FIELD is replaced by TUNE.FIELD_COMPOSITIONS (5 named entries). FIELD_TYPES stats unchanged.
   - Roll order (one seed fixes everything): uplink point, then composition (by weight), then positions in
     newHunt. The composition is rolled in rollEnemy so INTEL on the loadout screen can name it.
   - Runner --comp forces a composition but still draws the roll's random number, so positions for a seed
     match the unforced run of that seed.
   - Unit counts: built per FIELD_TYPES key from the composition's counts (missing key = 0). Kill count and
     WIN CLEAR already used G.units.length, so they follow the rolled total.
   - staticPlacement 'anywhere': turrets/emplacements use the same picker as patrols (reachable via the R5
     flood fill, outside extraction, >= UPLINK_MIN_DIST from spawn, no two on one tile). They still face the
     uplink at spawn (simplest; unchanged static brain).
   - 'uplink' placement: unchanged guardTile. With 4 statics in GUARD_RADIUS 6 there is room; if every tile
     were taken it would fall back to any reachable tile in radius as before.
   - Sweep has no statics, so its placement flag does nothing.
   - INTEL format: "INTEL: <name>. <non-turret counts>, reports of <n> hidden turret(s). Uplink at <place>."
   - BUILD tag r8-s1.
   - Shuffled set (R8 override, Jamie): the view keeps a bag of composition names in localStorage
     ('signalLance.compBag'), shuffled with Math.random, and passes the next name to the sim as `force`.
     Each loadout screen shown takes one; a reload continues the cycle. FIELD_SHUFFLE 0 restores the
     sim's seeded weighted roll. The runner is unaffected (it still forces per composition). BUILD r8-s1b.
   - R8 run2 (UNC_GROW_OWN_TURN): applies to every contact list (yours and the field's), keyed on the unit the
     contact is on (G.order[G.oi] is the acting unit). The ghost contact has no unit, so it grows as before.
     Lost-contact linger (CONTACT_LINGER) still counts all sim time, so old contacts still fade out.
   ROUND 9 ASSUMPTIONS ("Fire on the fix")
   - MORTAR is a loadout module (key `mortar`, 1 slot, max 1), player mechs only. Old saved loadouts load with mortar 0.
   - MORTAR_DMG is in armour plates, as the brief words it: 1 = ARMOUR_HITS (3) hits. One splash kills a turret or a
     patrol (3 hits) and takes half an emplacement (6). If that feels like a must-have, this is the first knob after
     MORTAR_MAX_UNC / SIG_MORTAR.
   - Target = the FIRE target (selected contact, else the best one). Range is mech → fix centre. A fading (lost)
     contact still qualifies if its circle is within MORTAR_MAX_UNC: lobbing on a remembered fix is the point.
   - Impact is instant (no flight time); the sim then runs 0.4 s. Facing doesn't change (no LoS needed).
   - Splash hits every living unit within MORTAR_SPLASH of the impact, your own mechs included (counted as "on own").
     A "hit" = a shell that damaged at least one field unit. A mortar kill = a unit taken to 0 by the splash.
   - Loud: +SIG_MORTAR Signal, and the same 1 s firing spike as a gun shot (SIG_FIRE), so passives can hear it.
     Only the targeted unit gets the flash contact (MORTAR_FLASH_UNC); field units otherwise use their existing brain.
   - SPLASH: hit / miss shows on the map and in the HUD for ~2.5 s; the run log line and result screen carry the
     totals ("mortar 3/5 hits, 2 kills (A)"). Type ID still needs eyes.
   - FIELD_PLAYTEST_POOL only filters the view's shuffled set; the sim's seeded roll (FIELD_SHUFFLE 0) and the runner
     ignore it. Old bags in localStorage are filtered to the pool on load.
   - MORTAR button sits beside FIRE in one row of the right column, so the column doesn't get taller. BUILD r9-s1.
   - Runner: scripted A carries a mortar (9/10 slots) and lobs at any contact that qualifies, before trying FIRE.
   - R9 run1 override (Jamie: manual targeting): MORTAR now arms a targeting tap (TAP TARGET; tap MORTAR again to
     cancel). Tap a contact = aimed lob on its fix if it qualifies; any other tap = blind lob at that point, scatter as if
     the fix were MORTAR_BLIND_UNC (6) tiles fuzzy (≈4.1-tile circle). Blind lobs keep the AP, shell, cap, range and
     Signal rules; an out-of-range tap keeps it armed and shows CLOSE / RANGE. A blind lob has no target, so every
     field unit the splash damages (and survives) gets the flash contact. Aimed lobs now take two taps (MORTAR, then the
     contact). Min/max range rings show while armed. Log adds "n blind". BUILD r9-s1b.
   ROUND 10 ASSUMPTIONS ("Read the ground")
   - Zones live in src/sim/zones.ts. The brief's ZONE_QUIET_SIG_MULT / ZONE_NOISE_UNC_MULT / ZONE_NOISE_UNC_FLOOR are
     TUNE.ZONE_TYPES.QUIET.SIG_MULT / NOISE.UNC_MULT / NOISE.UNC_FLOOR (same defaults 0.4 / 2.0 / 3 tiles).
   - A zone is judged by the tile the unit stands on right now (mobile units carry it in and out). It changes only how
     that unit is SEEN, never its own sensors. Same rules for mechs and field units.
   - QUIET: effSignal = Signal × 0.4 wherever others read Signal: the fix-uncertainty lerp (signalUnc), SIGNAL_EMIT in
     sig(), "still carrying Signal" in emitting(), and so the noise ring. The HUD Signal bar keeps the true value; the
     ring shrinks, which is the visible effect. Turrets never gain Signal (only firing spikes), so QUIET does nothing
     for a turret: its one tell is muzzle flash, which NOISE does fuzz.
   - NOISE: every non-eyes observe() on a unit inside (radar, triangulation, muzzle flash) gets uncertainty × 2, at least
     3 tiles, and its centre moves to a real error inside 0.7 × that circle, held for RADAR_JIT_TIME (so a radar fix
     doesn't jump every frame). Eyes stay exact. A contact first fixed by eyes keeps its tight circle after eyes are lost
     (it only grows on that unit's activation, as R8).
   - Roll (seeded, in rollEnemy after uplink + composition, so INTEL can name zones on the loadout screen; this shifts
     field positions for a given seed vs R9): count 2–4; candidates shuffled; the first candidate within ZONE_UPLINK_NEAR
     of the uplink goes in first (every uplink candidate has one); then non-overlapping (no shared tile) candidates until
     the count. Types random, then one random zone forced QUIET and another forced NOISE. Zone tiles = reachable floor
     within ZONE_RADIUS, outside extraction and outside ZONE_SPAWN_CLEAR of the spawn. 10 hand-picked centres.
   - Static placement: one seeded roll per static (ZONE_STATIC_PREF 0.7). "uplink": among the legal guard tiles, zone
     tiles with cover + LOS first, then any zone tile, else as R9. "anywhere": a random legal zone tile, else as R8.
     Ambush turrets pick QUIET tiles first (any zone tile if none is legal) and face the player's spawn. Patrols and the
     field brain are unchanged; nothing seeks or avoids zones.
   - Drawing: QUIET = cool blue tint, dotted edge; NOISE = faint amber with diagonal hatching, dashed edge; name label at
     the centre. Drawn under buildings, contacts, rings and the scatter circle. HUD shows IN QUIET / IN NOISE.
   - A new build tag resets the stored shuffled set (signalLance.compBag), along with the run log. BUILD r10-s1.
   - Runner: zone stats per composition (statics in zones, found rate and first-found round by start zone, aimed-lob
     hit rate and average fix on NOISE targets vs elsewhere).
   ROUND 11 (the contract) — step 1:
   - A run is a contract of CONTRACT_HUNTS (3) hunts. Rules live in sim/contract.ts; G.ct holds it. In memory only: a
     reload starts over. Not a save system.
   - Loadouts lock at START CONTRACT (the old LAUNCH) and can't change until the contract ends. The loadout screen no
     longer shows an INTEL line; jobs are briefed on the job-pick screen.
   - Job roll: the contract has its own seeded RNG (mulberry32 on its own state, seeded from the view's contract seed), so
     it never disturbs a hunt's RNG. Per hunt: job 1's composition is picked by weight, job 2's by weight from the rest
     (always different); each job gets its own hunt seed. A job's uplink, field and zones come from rollEnemy(seed, comp),
     so the INTEL shown is exactly the hunt you get. FIELD_PLAYTEST_POOL is honoured only if it names 2+ compositions;
     it is now [] (full pool). The shuffled set (FIELD_SHUFFLE / compBag) is not used for job rolls; nextComp() is left
     in screens.ts unused.
   - Carry-over, per mech: hits left (maxHits unchanged, so the damage read continues), gun rounds, mortar shells, and
     destroyed. Applied by newHunt's new prep callback after the lance is built and before round 1 initiative. A lost mech
     is set dead with 0 hits and parked off the map (-10, -10 tiles), so it is out of the order, sensors and bot targeting.
     If A is lost, B is the active mech. AP, Energy, Signal, ECM, contacts, facing and position reset each hunt as before.
   - Mortar stats (shots/hits/kills) and shot counts are per hunt, as before.
   - Outcomes: WIN UPLINK / WIN CLEAR count as wins. BAIL is a forfeit (no win) and the contract goes on. LOSS (all
     remaining mechs destroyed) fails the contract at once. After the last hunt: COMPLETE if wins >= CONTRACT_WINS_NEEDED
     (2), else FAILED. recordHunt runs once per hunt from finishHunt.
   - Own damage read on the job pick / result / log: LOST, BADLY DAMAGED (<= DMG_BADLY), BLOODIED (<= DMG_BLOODIED),
     SCRATCHED (any damage), FINE (none). Same thresholds as the enemy read; SCRATCHED added so a 1-hit loss shows.
   - Log: each hunt line gains "C<n> H<h>/3 · " before the outcome and the lance's state after the kills; a contract line
     ("C3 COMPLETE 2/3 · lost B in H2 · Sweep > Mixed > Ambush") follows the last hunt. Contract number kept in
     localStorage (signalLance.ctN), reset with the log on a new build. DBG line shows the contract seed and hunt seed.
   - Runner --contracts N: contract seeds 1..N, the scripted lance always takes job 1 (A with mortar, as R9/R10).
   CHORE (R11, Jamie): tester splash for remote playtesters. View only, no sim or TUNE change.
   - src/view/brief.ts holds TEST (round title, question, what's new, how to report) and QUESTIONS (end-of-hunt
     tap answers). UPDATE BOTH EVERY ROUND. Splash shows on every page load: CONTINUE or GAMEPLAY BASICS (controls,
     mechanics, a layout sketch and a map legend drawn in game colours). BASICS also on the loadout screen.
   - Tester name (optional, localStorage signalLance.tester) prefixes log lines as [name]. Answers go in the log
     line before the note ("feel Tense · past A bit · job Random").
   - SEND LOG uses the phone's share sheet (navigator.share) with a header line (build + tester); falls back to COPY
     LOG. No send-to-repo: that would need a GitHub token inside the page, readable by anyone with the link.
   - Also fixed: step 1's contract prefix and lance state weren't in the hunt log line (string mismatch). BUILD r11-s1b.
   ROUND 11 step 2 (payout + refit):
   - Pay per hunt, after it ends: BAIL 0; else PAY_WIN (100) if won + PAY_KILL (20) × kills (a LOSS pays its kills, but
     the contract is over). Credits reset each contract; shown on the job pick, result and contract screens.
   - Refit (job-pick screen, hunts 2 and 3 only): REPAIR +1 hit (15), +10 RDS (10), +1 SHELL (15), REBUILD a lost mech
     (200). Jamie's override of the brief: nothing goes above REFIT_CAP (0.8) × what that mech started its previous hunt
     with, rounded down (6 hits → 4, 20 rds → 16, 6 shells → 4). Never lowers what it already has. "Previous hunt" = the
     last hunt it started alive; a rebuilt mech comes back AT the cap (not full, against the brief's "full armour"), so
     rebuilding is never a full reset either. The cap ratchets down each hunt the mech refits up to it.
   - Rebuild needs cap hits > 0. Rounds/shells buttons only show for mechs carrying a gun / mortar.
   - Log: hunt line gets "+N cr" and "(bought A repair×2, A rounds)" for buys made before that hunt; the contract line gets
     credits earned / spent. Runner spends greedily (repairs, rebuild, rounds, shells). BUILD r11-s2 (resets the run log).
   - Tester splash: TEST and QUESTIONS updated (new: what you were playing for; how spending felt).
   ROUND 12 step 1 (to-hit roll + hit locations), sim in src/sim/combat.ts:
   - The roll happens at the trigger (doShot), from the seeded RNG. A rolled HIT flies to the unit's real position (so the
     shown % is the true chance, even if the fix centre is a bit off); a rolled MISS flies wide (HIT_RADIUS + 0.4–1.0
     tiles off the fix) and damages nothing. Shots at a contact with no unit behind it (the ghost) don't roll.
   - Range for the % = shooter to the contact's fix centre (what the shooter believes). Signal = target's effective Signal
     (after QUIET), same value the HUD shows.
   - "Moved" = tiles actually walked in the unit's last activation (movedT, reset when its next activation starts).
     Statics never move, so always 0.
   - Cover geometry: walls = solid tiles within COVER_RANGE (1.5) of the target. Sample the shot line from the shooter
     towards the target; cover if any sample passes closer than COVER_GRAZE (0.5) to one of those wall tiles. The last 0.5
     tile of the line (the target's own tile) is ignored so a wall right behind the target doesn't count.
   - Part split: hit pool × PART_SHARE, every part at least 1, remainder by largest fraction; totals match R11 exactly
     (mech 3+3=6 → COR 3 LEG 1 WPN 1 SNS 1; turret 3 → COR 1 WPN 1 SNS 1; emplacement 6 → COR 4 WPN 1 SNS 1). With 1 hit
     per non-core part, any hit on legs/weapon/sensors destroys that part. u.hits stays the total (0 once CORE is gone).
   - A part already gone spills its hit to CORE. Mortar splash (MORTAR_DMG × ARMOUR_HITS = 3 hits) rolls one part and
     takes all 3 there, spilling to CORE.
   - SENSORS gone: radar/ECM/ghost blocked (radar and mask switch off at once), eyes range × 0.5. Passive unaffected.
     LEGS gone: NORMAL/SPRINT plan returns why "LEGS" (MOVE button shows it). WEAPON gone: FIRE blocked "WPN".
   - The odds breakdown shows as a yellow ODDS line in the HUD whenever FIRE is allowed, instead of behind a tap on the
     %: always visible, nothing to discover, no new tap target. The last shot by each side shows in the HUD
     ("A → patrol: HIT LEG (62%)" / "turret → B: MISS (40%)") for one round.
   - Enemy part read: shown under its type label while a lance mech has eyes on it. The lance's read is in the HUD.
   - Refit (step 1 only): REPAIR fixes the part missing the most hits (destroyed counts; ties go CORE, LEGS, WEAPON,
     SENSORS), still under REFIT_CAP on total hits. REBUILD splits the capped hit pool across parts the same way.
   - Runner: scripted mechs fall back to CREEP when legs are gone (without it they stood still and stalled).
   R13 (Loud gets company) ASSUMPTIONS
   - Emissions = the old Signal pool (unit.emit, "EMIT"); TUNE keeps the SIGNAL_* names so the tweak history matches.
   - Passive sensors hear electronic emissions only (Jamie, 2026-10-05): sig() drops SIG_MOVE / SIG_CREEP / SIG_FIRE /
     CREEP_SIG_MULT, and emitting() is radar on or EMIT > 0. Footsteps and gunfire are Sound.
   - Sound timing: one radius per unit, the loudest event of its current activation (never a sum), cleared at the start
     of that unit's next activation, so everyone else gets exactly one round to hear it. A move's sound is set at its
     start, by its mode.
   - Sound ignores walls. Hearing is continuous while the sound lasts: a listener inside the radius keeps a contact at
     the sounder's true position + one offset rolled when the sound grows (held, so it doesn't jitter), SOUND_UNC wide.
   - A sound contact never loosens a better live fix (eyes / radar / tighter cross-fix). It is flagged c.snd and can
     never lock a gun or an aimed lob, even if its circle shrank (explicit, not just via SOUND_UNC > the lock limits).
   - QUIET multiplies the sounder's radius by ZONE_TYPES.QUIET.SIG_MULT where it stands now; the move preview uses the
     destination's zone. NOISE fuzzes sound contacts on a unit inside, as for any non-eyes fix.
   - Contacts record the sense that made them (src); every new contact goes in G.firstLog for the runner.
   - cmdRadar now needs the radar module in the sim (before, only the view hid the button).
   - Pack: a field unit's OWN fix on a mech (EYES, RADAR, PASSIVE, SOUND, FLASH) alerts other field units within
     ALARM_RADIUS of the alarming unit. No relay: shared (ALARM) contacts never raise alarms. Shared contacts never lock
     (c.shr), never loosen a better own fix, and don't get NOISE applied twice.
   - Alarms counted once per (alarming unit, mech) per round (log line, runner).
   - Pack target pick: pickPackTarget() (most parts destroyed, then fewest CORE hits, ties nearest). A patrol also
     shoots its pack target first when it can lock it, else its best contact as before.
   - HUNT keeps the usual HOLD patience for a healthy target in HOLD_DIST; a wounded target (BADLY or LEGS gone) gets no
     patience. SEARCH ends early when the patrol reaches the estimate.
   - The pack is a splash toggle (localStorage signalLance.pack), OFF by default; pack runs are tagged [PACK] in the log.
   R14 (Read the signature) ASSUMPTIONS
   - Test bed: scenarios are data in src/sim/scenarios.ts. startScenario() sets the seed, uplink, hand zones (setZones)
     and an empty composition, then newHunt(loads, prep): prep places the lance and REBUILDS the field from the scenario
     (makeUnit per entry), replacing any rolled placement. RETRY = same seed = same hunt.
   - Scenario `tune` overrides are top-level TUNE keys only, saved before and restored on BACK (or the next scenario),
     so the splash's pack toggle comes back as it was. A test-bed hunt sets G.ct = null (never in a contract, no pay,
     no carry-over) and logs one [TESTBED <name>] line on RETRY or BACK, with the tap answer.
   - "legsLost: 1" = one of the two legs gone (CREEP only); a patrol's `state` is only its starting label, the brain
     takes over at its first activation (no new behaviours: LEASH patrols still wander within LEASH of the uplink).
   - Earshot: uplink west plaza (27,13), lance ~10.4 tiles off at (17,16); patrols (21,8) and (24,20), 8–9 tiles from
     the start, buildings in between. Runner, 20 seeds: --quiet found R2.1 (by EYES), NORM R1.1 (EYES), --loud R1.0
     (by SOUND every time). The uplink is in their leash, so eyes find you there in the end either way.
   - Runner: --scenario <name> [--runs N] (seeds seed..seed+N-1), and --quiet (CREEP every move) to compare with --loud.
   - VARIANT TABLE (TUNE.FIELD_VARIANTS; CORE = what kills it, after PART_MIN):
       PATROL  scout  EMIT low (comms 10), steps NORM 2 / SPRINT 3 · core 1, 10 rds, FIRE_UNC 2.5, patience 1–3, HOLD 6
                      TELL soft steps (≤3)
               line   EMIT low, steps 4 / 7 (= SOUND_RANGE) · the R13 patrol                           TELL steps at 4–5
               heavy  EMIT low, steps 6 / 9 · core 3, 30 rds, FIRE_UNC 1.5, patience 4–8               TELL loud steps (6+)
       TURRET  sentry EMIT none, shot 12 · the R13 turret                                              TELL loud shot (12)
               hush   EMIT none, shot 5 · same fight as sentry                                         TELL muffled shot (≤6)
               gun    EMIT low (comms 10), shot 12 · core 4, 30 rds, FIRE_UNC 2                        TELL steady low EMIT
       EMPL.   search pulse every 2, EMIT afterglow · the R13 emplacement                             TELL pulses every 2nd round
               fire   pulse every round · core 1, FIRE_UNC 3 (locks fast), 4 cells for the radar       TELL pulses every round
               relay  pulse every 3 + comms 10 between · core 4, 10 rds                                TELL pulses every 3rd round
     Shared readings: EMIT low = 3 patrols + gun (+ pulsers' afterglow); none = sentry + hush; high = pulsers only.
     Each type has one axis (patrols: step sound, turrets: EMIT / shot, emplacements: pulse rhythm), the bold TELL.
     The scout keeps the patrol's armour plate: without it its radio couldn't be heard past ~6 tiles behind walls.
     "fire" = the brief's fire-control (short key for the CARD). VARIANTS_ENABLED false = every unit its type default.
   - TRAIT BANDS (sim/ids.ts; G.obs per unit id, so a trait survives a contact fading and coming back):
       EMIT: written on a lance passive tick that detects it (none / low <TRAIT_EMIT_HIGH 20 / high, effective EMIT,
         not while its radar is on); "none" = a passive mech within TRAIT_SILENT_RANGE 10 of a held contact hears nothing.
       Pulse: a field radar pulse is now heard by every lance mech with passive at once (the rule the field already
         had both ways: radarNew), and gives a bearing. Interval = the smallest gap between pulse rounds.
       Moved: a move seen through a live real fix, a step heard, or a mech's bearing on it swinging > TRAIT_DRIFT_DEG 8°
         from the same spot. Still: TRAIT_STILL_ACTS 3 of its activations ended while you held a contact or a live
         bearing on it, no move seen (a holding patrol can look still: a real look-alike).
       Steps / shot: the loudest heard radius (as heard: QUIET shrinks it), banded soft ≤3 / steps ≤5 / loud;
         shot muffled ≤6 / loud. The matcher compares a patrol's heard band with its NORMAL gait (a sprinting line patrol
         reads loud, like a heavy).
       Matcher rules = the CARD: EMIT bands seen ⊆ the variant's; any pulse rules out non-pulsers; a known gap must equal
         PULSE; a pulser watched more than PULSE activations with no pulse heard is ruled out; moved rules out statics,
         still rules out patrols; heard step / shot band must match.
   - IDs: G.ids[id] = { v, pre, miscall }. Re-ID free until eyes; after eyes the variant shows (kept in G.obs) and the
     call is locked. "before eyes" in the log = committed before ANY eyes-on contact this hunt.
   - Wrong-ID track rule: frozen = the contact's ID (eyes or call) is a TURRET / EMPLACEMENT: no growth at all (also on
     its own activation, where UNC_GROW_OWN_TURN made it grow) and no fading (ID_STATIC_HOLD), so the mark stays for a
     lob. A patrol called static freezes on a spot it has left; that is the whole cost, no penalty.
   - Aim: +HIT_ID_BONUS only for a call that was right when made before eyes (not for an eyes reveal, not a flipped
     miscall), lance gun shots only (mortar unchanged). Shown as "ID +10" in the odds.
   - Runner: the scripted player commits an ID once matchVariants() gives exactly one, on a contact it holds.
   - R14 scenarios: Look-alikes (scout at 8 tiles, not ~12: a patrol radio isn't heard 12 tiles through walls; gun at
     11.7), Quiet gun (gun turret watching row 22 to the uplink: its tell needs bearings, so creep first), Twin pulse
     (search + relay at ~12, A carries a mortar). Pack off in all three.
   R15 (Pick your fights) ASSUMPTIONS, step 1 (BOUNTY)
   - Mission state lives in src/sim/mission.ts: one G.mission per hunt { type, earned, quota, kills, result, endTurn }.
     The uplink keeps its own code paths (G.up, doUplink); the mission only decides what a kill pays, what extracting and
     clearing the field mean, and what the hunt pays the contract. G.mtype is set by rollEnemy (3rd arg, draws no random
     numbers); newHunt builds G.mission from it. A non-contract hunt (launch, runner games) is UPLINK unless forced.
   - Job type: rolled in rollJobs from the contract RNG, one crand() per job after its seed, evenly from MISSION_TYPES.
     This shifts every later contract roll vs R14 (same seeds, different contracts).
   - "INTEL shows the type before the refit and loadout": loadouts lock for the whole contract (R11), so the type shows on
     the job card, above the INTEL and next to the refit. The loadout can't react to it yet.
   - Map anchors: MAP_ANCHORS in sim/world.ts (one entry, 'hive' = MAP_SRC). TUNE.UPLINK_CANDIDATES moved there as
     `uplinks`; cargo / waypoints / junctions are empty until steps 2 and 3.
   - Bounty field: the composition as rolled, plus BOUNTY_FIELD_EXTRA units. Each extra rolls a variant from all 9 (seeded,
     evenly) and is placed 'anywhere' (mobile: any legal tile; static: the R10 zone-preferring 'anywhere' picker), facing the
     site. Statics in the composition still guard the rolled uplink point ("the site"), and patrols still leash to it.
     The uplink ring, arrow and UPLINK button are hidden; uplinkBlock() = 'NONE'. INTEL for a Bounty job says
     "Dug in around <site>" when the composition has statics at the site.
   - A kill pays TUNE.BOUNTY[true variant] the moment the unit is destroyed (turns.ts updateShells), however it died (gun,
     aimed or blind lob, own splash). IDs don't matter. Shown as a "+80 cr heavy" pop over the wreck (2.5 s) and in the HUD.
   - Extract (a lance mech reaches the extraction columns, as before): earned >= quota → WIN BOUNTY; else BAIL (not a win,
     not a loss). Pay = bounties earned either way, replacing PAY_WIN + PAY_KILL. LOSS (both mechs destroyed) stays a LOSS
     and pays its bounties too (the contract fails anyway).
   - Field cleared in a Bounty job: same quota rule as extracting (WIN BOUNTY at quota, else BAIL). Simplest: there is
     nothing left to earn, so the hunt ends.
   - Scenario data gains `mission` and `earned` (a number, or 'quota' = exactly BOUNTY_QUOTA). Price list overrides
     BOUNTY_QUOTA to 50 so both routes (heavy 80, or 2 scouts 25+25) reach it. The scenario's `uplink` tile is the
     field's leash point; Bounty draws no ring.
   - Scripted player (runner/tests), Bounty: walks to the site like the uplink bot, fighting what it meets; from there,
     chases its best contact for 10 rounds; extracts at quota, when a mech is lost, or when nothing is left. Never pushes.
   - Runner: --mission <TYPE> forces every hunt's type; contracts print MISSION lines (win rate, average pay, rounds per
     type), BOUNTY quota-met and per-variant kill rates, and the brief's two flags (quota met <20% / >90%; a variant killed
     in >90% / <5% of the Bounty hunts it appears in, min 5 appearances). The R13 sound-share flag now counts UPLINK hunts
     only (it was calibrated on them); Bounty hunts get an info line.
   - BUILD r15-s1. A new build clears the run log, as before.
   R15 step 2 (RETRIEVE) ASSUMPTIONS
   - The cargo sits on the rolled site (G.up), taken from anchors().cargo, or the uplink tiles while that list is empty.
     Statics guard it with the composition's placement, as for the uplink. PICK UP works within UPLINK_RADIUS + 0.5 of it
     (the same ring as UPLINK); it shares the UPLINK button's slot (PICK UP / HAND OFF), one objective button per job type.
   - The flip (doPickup): every living field unit gets an ALARM contact on the carrier (UNC_ACQUIRE + ALARM_UNC_ADD tiles,
     never a lock on its own) and packOn() becomes true for the rest of the hunt: patrols drop the leash, alarms spread
     (R13 raiseAlarm), and pickPackTarget picks the carrier first whenever they know where it is. Statics only turn and
     fire, as always. After the first alarm there is no beacon: contacts fade and get re-found like any other.
     PACK_ENABLED itself is untouched (the splash toggle and the [PACK] log tag still mean the R13 switch).
   - Carrying: planMove refuses SPRINT for the carrier (why 'CARGO'; the SPRINT button shows CARGO). HAND OFF: the carrier
     passes it to the other living mech within RETRIEVE_HANDOFF_RANGE (1.5 tiles) for RETRIEVE_HANDOFF_AP. No re-pickup:
     the cargo is never dropped on the ground.
   - Carrier destroyed: checked every sim step after the LOSS check. Outcome FAIL (hunt failed, pays 0, not a win; the
     contract goes on unless both mechs are gone, which is a LOSS first).
   - Win: the carrier reaches extraction (WIN RETRIEVE, PAY_WIN + kills × PAY_KILL, as uplink). Any other mech reaching
     extraction still pulls the lance out (BAIL), as before. Clearing the whole field is still WIN CLEAR (as uplink).
   - Scripted player: to the cargo (fighting what it meets), PICK UP, carrier walks out, the other mech follows the carrier;
     hands off when the carrier is at half hits or worse and the mech beside it is healthier. Runner: a RETRIEVE info line
     (picked up, carried out, cargo lost, hand-offs, rounds from pickup to the end). The brief sets no Retrieve flags.
   - BUILD r15-s2.
   R15 step 3 (ESCORT) ASSUMPTIONS
   - Route data lives in MAP_ANCHORS.hive: `waypoints` (named nodes S, J1, A, B, J2, C, D, X), `legs` ({from, to, via
     tiles, name}), `junctions` (J1, J2: 2 onward legs each) and `escortSite` (J2: the field's leash point, G.up). A leg
     walks A* from node to node through its via tiles (sim/escort.ts legPath, cached). NORTH / SOUTH at both forks.
   - The transport (G.ally, sim/escort.ts): unarmed, no sensors, one part (TUNE.PARTS.ALLY = CORE, ESCORT_HITS),
     ESCORT_ARMOUR plates for its signature, comms EMIT ESCORT_EMIT (like a patrol), NORMAL move sound. It joins the
     initiative order (ESCORT_INIT + the usual roll) and its activation is one MOVE action of up to ESCORT_MOVE tiles at
     PLAYER_SPEED along its leg. Holding at a junction (no leg picked) = its activation passes.
   - "The field can detect and fire on it like any lance unit": state.ts friends() = lance + ally. The field's sensing loop,
     field shells, sound, the pack's targets (isFriend) and alarms all use it. isMech still means "a mech you control"
     (initiative ties, HUD, LOSS). The lance's guns never hit it (shells hit the other side only); a mortar splash does.
     A muzzle flash on it does nothing (it has no sensors). The lance gets no contact on it: you always see it.
   - Leg pick: cmdLeg(i) on your turn (no AP), only while it holds at a junction. View: a 60 px round button per leg,
     6 tiles along it, drawn on the map; tapping it comes before contact selection.
   - Placement: every field unit in an Escort job goes on a legal tile within ESCORT_AMBUSH_RANGE of any leg ('anywhere'
     near the legs, statics and patrols alike). Statics face the site (J2); patrols leash to it as usual.
   - End: transport destroyed = FAIL (hunt failed, pays 0, contract goes on). Transport reaches extraction = WIN ESCORT,
     pay PAY_WIN + round(ESCORT_BONUS × hits left / max) + kills × PAY_KILL. A mech reaching extraction first still pulls
     the lance out (BAIL), as before (the HUD says so). Clearing the field does NOT end an Escort (only walking out wins).
   - ESCORT_HITS 5 (brief named no value; 8 let the scripted lance win 93%, 5 → 68%, close to Uplink).
   - Scenario data gains `ally` (the node the transport starts on; a junction = holding). Fork: gun turret on the north
     street at (15,7), behind 5 walls from the fork, its steady comms audible there (strength ≈ 0.35 vs 0.25 needed).
   - Scripted player: both mechs shadow the transport 2 path points ahead (never into extraction); at a fork it picks the
     leg with the fewest known contacts near it (ties: NORTH). Runner ESCORT info line: shot at, heard, destroyed, hits
     left, legs picked.
   - End-of-hunt questions now ask the round's "read and connect" check per hunt (read: changed my plan / didn't / not
     sure), logged next to the job type. BUILD r15-s3.
   R16 (Rolled ground) ASSUMPTIONS
   - The map is per-hunt state (sim/world.ts loadMap): W, H, N, walls, clutter, spawn, reach and the anchors table are
     `export let` live bindings, so every reader (sim, runner, view, camera) sees the current map. Path buffers are sized
     to the biggest map loaded so far. MAP_MODE 'hive' loads MAP_SRC (no random draws: hive hunts replay R15 exactly);
     'blocks' rolls a district in rollEnemy right after setSeed, before the site / composition / zones (so a seed's
     other rolls differ from hive). The splash MAP button sets MAP_MODE (remembered; '[HIVE]' tags the log).
   - Blocks (sim/blocks.ts): 8 hand-drawn 12×12 blocks (plaza, alleys, yard, avenue, lot, warren, towers, depot), each with
     a full 1-tile street ring. Spots = uplink AND cargo tiles (cargo reuses them; no separate cargo spots), named
     "<spot> <cell>" with cells A1, B2... (column letter, row number). Rotation (0–270) and mirroring are on (MAP_ROTATE).
   - Grid: even seeded pick from MAP_GRIDS with ≥ MAP_MIN_BLOCKS blocks. Blocks: even pick, never the same as the left or
     upper neighbour. Extraction = the rightmost EXTRACT_COLS columns of the last block column, forced open (as hive).
     Spawn = left edge, mid-height (nearest open tile).
   - Each modifier slot has ONE kind, chosen by hand per block (so pieces fit), and rolls MOD_SPAWN_CHANCE. Clutter =
     a rect painted on street tiles only. A clutter slot touching a block edge spills one tile over into the next
     block's ring, so it spans the whole seam street ("rubble across the street"). Set piece = a rect drawn '%' (a wall,
     drawn rust): kept only if no street tile loses its way to the spawn. Zone slot = a centre for rollZones.
   - Reachability: after building, every spot, every route node and the right edge must be reachable, else reroll (fresh
     draws, up to MAP_REROLL_MAX). The blocks have no walled pockets, so 0 rerolls in 300+ runner hunts.
   - Block density: the first draw was 30% walls (hive 42%) with 30% of nearby tiles in sight (hive 19%), and the scripted
     lance lost far more. Redrawn denser (36–38% walls, ~22% in sight); the plaza and the lot stay the open ones.
   - Zones: on block maps rollZones draws from the zone slots that spawned (not ZONE_CANDIDATES), with ZONE_COUNT_MIN/MAX
     × area / FIELD_BASE_AREA (ZONE_SCALE_BY_AREA), rounded. The near-uplink rule is unchanged.
   - Field scale: per type, max(count, round(count × area / 1728)); INTEL shows the scaled counts. Bounty extras unscaled.
     4×3 = the hive's area (no change); 4×4 ×1.33, 5×3 ×1.25; smaller grids never drop below the composition.
   - Clutter cost is per distance: a straight stretch inside a clutter tile costs CLUTTER_TILE_COST × its length (sampled
     every 1/8 tile), which is ≈ COST per tile crossed. planMove's length, AP, Energy and clipping all use it; A* weights
     entering a clutter tile × COST; path smoothing only shortcuts when the shortcut costs no more. Units also walk
     slower on screen in clutter (speed ÷ COST). The "target moved" to-hit term still counts real tiles.
   - Clutter Sound: if a move's (clipped) path enters any clutter tile, its sound radius = the mode's radius (the unit's
     own, for variants) + CLUTTER_SOUND, once. The Escort transport pays both too. A crunching scout can read "loud
     steps" on the ID card: that's the real sound.
   - Clutter cover: clutter tiles count as walls for inCover only. Standing ON clutter also counts as cover (your own
     tile is within COVER_RANGE). LoS, radar walls and shells ignore clutter.
   - Escort on blocks: seam lines are the rows y = 0, 12, 24, …, H−1 and columns x = 0, 12, …, W−1 (always street).
     Forks J1..Jn (n = min(ESCORT_FORKS, cols−1)) sit on column lines spread evenly, each on a seeded interior seam row.
     From each fork: NORTH runs the seam row one block up, SOUTH one block down, both rejoining at the next fork, the last
     pair running out the right edge. S = left edge on J1's row; escortSite = the last fork. Node names "fork at C2".
   - INTEL: "<C>×<R> district, <W>×<H>." before the composition ("The old hive map." on hive). Log line and DBG carry
     mapText ("MAP 4x3 seed 1234 · blocks: … · mods: 3 clutter, 1 set piece, 2 zones"; zones = the ones rolled in).
   - Test bed: Scenario gains `map` (a fixed DistrictSpec: no roll, no rotation) and lance `lost` (one suit). Specs can
     carry `paint` (hand-placed tiles, test bed only): Crunch's clutter band across the street. Old scenarios load hive.
     "Two districts" is two entries (strip 6×2, square 3×3) rather than one rerun with --grid.
   - Tests: rule tests (helpers.startHunt) default to the hive map, since they place units by its geometry. The R13
     "turrets stay silent" test now picks a radio-silent turret (seeds roll gun turrets differently now).
   - Scripted lance (bot only): the Escort shadow goal stays 5 columns short of extraction (was 2), because A*'s
     nearest-free snap could land it in extraction on a block map (a BAIL). BUILD r16-s1.
   R16 debrief changes (r16-s3) ASSUMPTIONS
   - Street blockers: a "stretch" = one block-length of seam street between two crossings (crossing tiles never get one),
     on interior seams (2 lanes) and the top, bottom and left map edges (1 lane); never in extraction. Each rolls
     SEAM_BLOCK_CHANCE in rollSpec (so a seed still fixes the whole map). RUBBLE 2-3 long across all lanes (clutter: always
     goes in). BARRICADE 1-2 long across all lanes (wall). CHOKE = a chicane, 2 tiles of wall on one lane then 2 on the
     other lane one tile further on (weave through, no straight sightline); on a one-lane edge street it becomes RUBBLE.
     Walls (barricades, chicanes, set pieces) go in only if no street tile loses its way to the spawn. Walls drawn rust.
   - A district whose Escort route fails (a fork left with fewer than 2 open legs, or the start row shut) is rescued by
     turning its barricades to rubble one at a time (last rolled first) before any reroll: 23% of districts needed a
     reroll before this rescue, 0% after.
   - Escort route on the network: fork columns as before; for each fork row (rolled first, then every other combination)
     a leg NORTH / AHEAD / SOUTH exists if every stretch on its way is open: down its own column to the leg's row, along
     that row to the next fork's column, then along that column to the next fork. The last fork's legs exit on their own
     row (end nodes X = AHEAD, XN, XS). Legs walk A* through their corner points, so rubble on a leg is walked through
     (or round, if a cheap way exists).
   - The choke as briefed (one lane) left long views down the streets 100% clear; the chicane takes them to ~80% (scratch
     measure: points 9-24 tiles apart on the same street). Values as agreed (0.35; 0.4 / 0.3 / 0.3).
   - Tooltips (view/tip.ts, Jamie): mouse hover shows at once; touch = hold a still finger TIP_HOLD_MS (450 ms). A hold
     never taps, selects or pans; sliding the held finger reads other things; the tip hides 1.5 s after the finger lifts.
     Priority: route button, your mechs, transport, contacts, wrecks, ghost, uplink / cargo ring, then the ground (zone,
     extraction, wall, clutter, closed yard, street). Set pieces and street walls share one label ("Wreck / barricade").
   - Round history (Jamie): the splash's "new in this build" pages back through earlier rounds (‹ OLDER / NEWER ›, or a
     swipe) from HISTORY in brief.ts (R15 → R12, condensed from each round's tester text). The last round opened on this
     device is remembered (localStorage signalLance.seenRound); a returning tester gets "Welcome back, last time you played
     Round N: tap ‹ for the M rounds since". First-time testers (nothing stored) see no welcome line.
   - Bug fix (r16-s2): the HUD's last-shot line crashed the frame loop the first time the field shot the Escort transport.
   R16 debrief 2 (r16-s5) ASSUMPTIONS: packed districts (sim/packed.ts)
   - Cells are half a block (6 tiles). The packing grid is the map + one cell on every side, offset by a seeded 0-5 tiles
     (MAP_EDGE_CROP), so pieces run off the map edge and are cut there. Scan order row-major; at each empty cell, shapes
     in a weighted random order (SHAPE_WEIGHTS), each shape's rotations / mirrors in random order; the first that fits
     with its first cell there is placed (1x1 always fits). Library: 1x1, 1x2, 1x3, L3, L4, 2x2, 2x3 (in cells).
   - 2x2 pieces are the 8 hand-drawn blocks (rotation / mirror, spots, mod slots as before). Others are generated: a
     building mass inside a 1-tile street ring; LOT_CHANCE turns a 1x1 into an open lot (spot + zone slot, maybe scrap);
     YARD_CHANCE gives a 3+ cell piece a courtyard (one cell opened up, an alley out, spot + zone slot, maybe a set
     piece); 0..ALLEY_MAX one-tile alleys cut straight across (maybe with scrap).
   - Each piece rolls STREET_KEEP per side (N/E/S/W): a dropped side runs its building to the edge (a hand-drawn block:
     ring tiles become building where the tile inside is building). Where both neighbours drop, the street closes.
   - The left map edge is always a road (the way in; walls never go on it). If the right edge is walled off, a street is
     cut through to it. Open pockets the streets can't reach become building. Fewer than 3 objective spots: street
     crossings at least 8 apart, in the right 70% of the map, are added ("crossing").
   - Street blockers: about SEAM_BLOCK_CHANCE x 4 per block-area, each on a random street tile whose street runs 6+ tiles
     one way and is at most 3 wide across (rubble / barricade / chicane across that width, as before).
   - Escort: forks on reachable tiles about evenly across (a junction preferred), at a seeded height. Legs between forks
     (or out the right edge): the shortest path, then shortest with a penalty (ESCORT_LEG_SPREAD, x1 / x3 / x8) on and
     next to earlier legs; a leg sharing more than half of its middle (ESCORT_SHARED tiles at each end excluded) with an
     earlier one is dropped. 2-3 legs named NORTH / (AHEAD) / SOUTH by average height. Each leg stores its walk (legPath
     returns it). No 2 legs: other fork heights (8 tries), then street walls softened to rubble one at a time, then reroll
     (3% of districts over 300 seeds).
   - MAP_LAYOUT 'grid' keeps the r16-s3 block grid (and the test bed's fixed districts still use it).
   - Measure (12 seeds, from random street tiles): longest straight open run 14.8 tiles (grid 23.7, hive 27.6); walls 54%
     (grid 36%, hive 42%); far tiles (9-12) in sight 8% (grid 10%, hive 7%).
   R16 debrief 3 (r16-s6) ASSUMPTIONS
   - Start zone (Jamie: spawning boxed in = rounds of boring travel): the spawn is the left-edge row (2..H-3) with the most
     street within SPAWN_LOOK steps, minus 0.5 per row off mid-height; a SPAWN_APRON (4 deep × 9 tall) is cleared there.
     The Escort transport starts on that row (S). The old grid layout keeps its mid-height spawn.
   - Convoy orders (Jamie): HOLD and HURRY, on your turn, no AP, one pending at a time; the same order again cancels and
     refunds; giving the other swaps (refunding the first). HOLD: its next activation does nothing (not allowed while it
     already waits at a fork). HURRY: its next move covers ESCORT_SPRINT (12) tiles at SPRINT speed with SPRINT sound.
     Jamie said "3 times" for the pause; HURRY got 3 as well (ESCORT_HURRIES). Buttons sit in the bottom row (Escort only).
   - Escort legs (Jamie: routes "progress and then back track"): a leg may travel at most ESCORT_BACKTRACK (4) tiles west in
     all and be at most ESCORT_DETOUR (1.8) × the shortest leg between the same places; the start leg too. The last fork's
     legs aim at three stretches of the right edge (its own row, 20% and 80% of the height). Forks get 12 tries (later
     ones also slide sideways) before walls are softened. Only Escort jobs need a route: other jobs never reroll for it,
     so a seed's district depends on the job type (job card and hunt roll the same type). Escort districts reroll ~5%.
   R16 debrief 4 (r16-s7) ASSUMPTIONS
   - Railway levers (Jamie): every fork the transport hasn't left shows its route buttons. Tap = set that fork's lever
     (lit ✓), tap again = clear. At the fork it waits at, a tap sends it (as before). A move now runs through: at a leg's
     end, a single onward leg or a set lever carries it on with the movement it has left; an unset fork or the route's end
     stops it. One shared planner (planAllyMove) drives both the move and the preview. Legs are logged as they are taken.
   - Next-move marker: a dashed gold ring where the next move ends ("waits at fork" / "out" / HOLD on the spot), worked out
     with the same planner (clutter cost, HURRY, levers). Not shown while it waits at an unset fork.
   - Initiative strip: the transport shows as a green T in its slot (always: you never need a contact on it).
   - Shared cover (Jamie: "if the target is sharing the same cover item as the ExoS the cover doesnt apply"): for each
     grazed cover tile, the piece = it plus every wall / clutter tile joined to it (4-way) within COVER_ITEM_RADIUS (3).
     If the shooter is within COVER_ADJ (0.75 tiles: next to it, diagonals included) of any tile of that piece, that tile
     gives no cover. Both sides. This replaced the point-blank idea (not built).
```

## TWEAK LOG

```text
   <step/run> | symptom | change (old → new) | result
   step1 | felt fine | none | -
   step2 | eyes gave a slow-shrinking fuzzy fix; lost-contact circle just grew in place |
           eyes = instant exact fix; lost contact dead-reckons along last seen velocity
           (new DR_TIME 4s), UNC_GROW 0.8 → 1.2 (= enemy speed) | helped
   step3 | radar felt pointless: pure LOS = just long-range eyes |
           radar penetrates buildings (overrides spec "buildings block radar"):
           new RADAR_MAX_WALLS 0 → 4 tiles, RADAR_WALL_UNC 0.6 tiles/wall tile | helped
   step4 | can't get the drop on the enemy: it sees all-round and fires instantly |
           eyes forward-only for both mechs: new EYES_HALF_ANG 180 → 70 deg;
           enemy must hold a lock before firing: new ENEMY_REACT 0 → 1.2 s | helped
   step4b | enemy believed the ghost over good info on the real me |
           GHOST_UNC 1.0 → 2.5 (real fixes now outrank it; enemy no longer fires at it) | helped
   step4c | no quiet way to break contact and reposition for an ambush |
           NEW CREEP toggle (user override of spec): CREEP_SPEED 0.9 t/s,
           SIG_CREEP 0.4 instead of SIG_MOVE 2.0 while creeping | helped
   step5 | corner stand-offs: enemy held 4 tiles off forever with no shot |
           patience: holds a random ENEMY_PATIENCE_MIN..MAX (new, 1–6 s, re-rolled
           each stand-off; was infinite) then pushes onto its estimate | helped
   step5b | lost despite feeling ahead; no idea of the score | result screen + log
           line show shots hit/fired, damage taken, hits left for both (no live
           HUD readout, by choice) | helped
   step5c | run felt good, but "done for now" at the result screen (core question) | no change | -
   round2 | "done for now": nothing varies between runs, so the loadout feels solved
           (passive mandatory, ECM rarely earns its 2 slots) | NEW per-run enemy
           temperament (TEMPERS: AGGRESSIVE / PATIENT / CAUTIOUS) + loadout variant
           (VARIANTS: STANDARD / ECM / HEAVY / HUNTER), briefed as an INTEL line
           above LAUNCH, shown on result, log and DBG. ENEMY_PATIENCE_MIN/MAX,
           ENEMY_CONFIDENT, ENEMY_FIRE_UNC moved into TEMPERS; ENEMY_ARMOUR,
           ENEMY_AMMO moved into VARIANTS; new ENEMY_BLIND_PULSE 8 s | helped
           (briefing changed the build; pull to the next briefing "mild, then flat")
   round2b | hunts differ, but once combat is joined it's just hitting FIRE as fast as
           possible, no skill or tactics; root cause (user): the controls, hard to fire
           and manoeuvre at the same time | no change (SHOT_SPEED 25 → 10 proposed,
           declined: not the cause) | -
   round3 step1 | combat is FIRE-mashing: can't fire and manoeuvre at once on the phone |
           NEW simultaneous turns (WEGO): PLAN → COMMIT → RESOLVE TURN_SECONDS 4 s,
           FIRE becomes a per-turn auto-fire order (SHOTS_PER_TURN 2, PLAYER_FIRE_UNC 2,
           PLAYER_FIRE_RANGE 12), new STOP; PAUSE moved onto COMMIT during RESOLVE |
           played once; weakest moment: "discovering the bot wasn't limited to firing
           only twice" (true: enemy fires on its 0.8 s cooldown, ~5 shots per turn).
           Fun test 0/5. Missing: "effective planning". Round paused by the player,
           who wants to try standard I-go-you-go instead; step 2 (signal) not built
   round3b | enemy not bound by SHOTS_PER_TURN | no change (round paused) | -
   round4 step1 | WEGO felt like guessing ("effective planning" missing); bot ignored the
           2-shot cap | NEW I-go-you-go: AP (AP_PER_TURN 4, AP_BANK_MAX 8, AP_SHOT 1,
           AP_RADAR 2, AP_ECM 1), power → Energy (ENERGY_REGEN 10/turn, RADAR_EN 25,
           ECM_EN 20/turn), CREEP / NORM / SPRINT moves (tiles/AP 1/2/3, EN/tile 0/1/10,
           SPRINT_SPEED 3.4), radar = pulse; both mechs on the same rules incl. the
           2-shot cap | played (WIN vs CAUTIOUS ECM, 15 turns)
   round4 run1 | "lack of change of facing": walked past the enemy, wasted 2 AP stepping
           forward and back to face it; enemy a few metres away stayed a sensor blip until
           I turned | free turn to face (tap a contact, or tap own mech then a spot; 0 AP,
           both mechs) + NEW EYES_CLOSE 0 → 2 tiles all-round sight (both mechs) | helped
           (wants 1 free turn per turn, then AP)
   round4 run2 | LOSS vs AGGRESSIVE HEAVY, 10/10 hits landed: "didn't take note it was a
           heavy... seeing a damage indicator is needed, not pure hp, D&D style" | NEW damage
           read on the enemy contact (DMG_BLOODIED 0.5, DMG_BADLY 0.25) + facing: NEW
           FREE_TURNS 1, then AP_TURN 1 (was unlimited free) | both helped
   round4 run3 | LOSS vs CAUTIOUS STANDARD by one hit, "felt fine"; accidental self-tap arms
           face mode and burns the free turn, no way to cancel | self-tap 28 → NEW
           SELF_TAP_PX 16; tap self again or MOVE (reads CANCEL) cancels face mode | helped
   round4 step2 | step 1 cleared (turns feel like planning) | NEW Signal 0..SIGNAL_MAX 100:
           +SIGNAL_RADAR 30 / pulse, +SIGNAL_ECM 15 / turn, +move per tile 0/2/5, −SIGNAL_DECAY
           25 / turn; others' fix uncertainty × lerp(SIGNAL_UNC_QUIET 1.5, SIGNAL_UNC_LOUD 0.4).
           Also (test asks): log clears on a new BUILD; a kill = instant WIN | -
   round4 step2b | parked sprint note: "sprinting is a waste, 100 energy for a small amount of
           extra ground" | spec override (Jamie chose): MOVE_ENERGY_PER_TILE.SPRINT 10 → 4 | helped
   round4 run5 | WIN vs PATIENT HEAVY; went quiet on purpose but "couldn't tell what the
           effect of signal noise actually had"; expects higher Signal = heard further, eyes
           see much further, status only with LoS; peek-shoot-hide vs a passive Heavy was a
           slog | Signal counted "couldn't tell" | spec override: NEW SIGNAL_EMIT 0.05 +
           Signal>0 = emitting + noise ring; EYES_RANGE 5 → 12; damage label LoS-only | -
   round4 run6 | WIN; noise ring "misleading: even when I crept, with 0 signal, I still had a
           huge circle" (ring was true: creep heard ~15 t vs walk ~22 t); wants creep "quieter,
           not silent" | eyes 12 + LoS label: helped; ring: n/a (expectation mismatch) |
           NEW CREEP_SIG_MULT 0.5 (creep ~10 t with 1 armour); DBG "bot thinks" marker | helped
           (marker "useful")
   round4 run7 | weakest moment "felt fine" | no change | -
   round4 END | wrapped after 8 runs. Fun test 3/5 PASS (one more go; unplanned build; loss →
           fix plan; nobody else played). Missing: "more to plan around" | - | -
   BUGFIX (run7): DBG made the HUD text huge on the phone (iOS text autosizing on the long
           DBG line) → text-size-adjust 100%, HUD nowrap, DBG split over two lines.
   round5 step1 | R4 fights "samey": the opening is solved (same route to the middle, wait
           for a blip, ambush) | NEW rolled uplink objective: UPLINK_CANDIDATES (6),
           UPLINK_MIN_DIST 10, UPLINK_RADIUS 1, AP_UPLINK 2, SIG_UPLINK 25, UPLINK_TURNS 3;
           bot guards (PATIENT) / heads first to (AGGRESSIVE) / patrols near (CAUTIOUS) it,
           GUARD_RADIUS 6; spawn + patrol reachability fix (walled courtyard) | played
   round5 run1 | WIN KILL vs AGGRESSIVE HUNTER, uplink 0/3: "the bot ran straight past the obj and
           engaged me" → objective felt irrelevant (it comes to you, same fight as R4) | spec
           override (Jamie "go"): NEW AGGR_LEASH 12 — AGGRESSIVE only chases a contact / bearing
           whose estimate is within 12 t of the uplink, else goes back to the point (RETURN) and
           waits; its patrols after the first leg stay within the leash too | -
   round5 run1b | Jamie: leash OK, "but should vary based on bot behaviour type" | AGGR_LEASH → per
           temperament TEMPERS.LEASH: AGGRESSIVE 12, CAUTIOUS 9 (= its old patrol radius
           GUARD_RADIUS × 1.5), PATIENT 6 (= GUARD_RADIUS; returns to its post). All three now
           break off chases beyond their leash | helped ("the bot stayed tethered")
   round5 run2 | leash worked, "but at this scale of units on the field it was ultimately just a who
           gets killed first rather than fight for the objective" → "1v1 decides it all" | no change
           (UPLINK_TURNS 3 → 2 proposed; Jamie: tuning won't help until more features are in) | -
   round5 END | wrapped after 2 runs. Fun test not re-scored: "no change from last time" (R4 was 3/5).
           Missing: "more variables on the board" | - | -
   PARKED (Jamie, R5 start): city map with distinct zones; areas that hide Signal and LoS
           blockers; IR emitters + modules; unit types (infantry, tanks); several enemies and
           friendlies at once with initiative order; more victory conditions; an OSINT
           dashboard for the campaign map and contracts.
   QUEUED (run5): enemy reacts to being shot (stop peek-shoot-hide farming).
   round4 run4 | WIN vs AGGRESSIVE HEAVY (swapped ECM for a 2nd armour plate after the INTEL);
           banking AP / saving Energy felt "like a plan"; weakest moment "felt fine" |
           no change — step 1 gate passed, step 2 (Signal) cleared to build | -
   PARKED (Jamie, R4 run3): sprinting is a waste — ~100 Energy for only a little extra
           ground (SPRINT 3 t/AP at 10 EN/t vs NORM 2 t/AP at 1 EN/t). → done in step2 (below).
   PARKED: controls — firing while manoeuvring is awkward on the phone layout
           (tap-to-move + FIRE button); the likely reason combat feels like button-mashing.
   PARKED: loadout balance — briefing now changes the build (Round 2); recheck
           whether passive still feels mandatory once combat has tactics.
   PARKED (Round 2 later list): RWR warning; unreliable/partial INTEL; enemy ECM
           ghosts; mid-hunt temperament tells; weighted / no-repeat rolls.
   PARKED: RWR — (a) warning when enemy radar paints you, (b) enemy's last known
           position of you. Try (a) first if the creep+ghost ambush still feels blind.
   round6 step1 | permanent home: one-file toy → TypeScript + Vite project (signal-lance/), rules split
           from drawing (src/sim/ vs src/view/), seeded RNG; zero gameplay changes, every TUNE value
           unchanged | parity checked: old vs new builds pixel-identical under a fake clock over 2
           scripted hunts (only the DBG line differs: it now shows the seed) | -
   round6 step2 | prove the split is real | NEW headless runner: npm run sim -- --games 20 (bot vs a
           scripted player that walks to the uplink, uplinks, fires when it can; seeds 1..N;
           --seed S replays one DBG seed, -v per turn). 20 games: WIN UPLINK 9, WIN KILL 4, LOSS 7,
           average 8.2 turns, no stalls over 80 turns; deterministic run to run | -
   round6 run1 | weakest moment "felt fine"; parity: no difference from R5; loop speed "quick, same as
           before" | no change — parity confirmed, old root signal-lance.html moved to legacy/ | -
   round6 END | wrapped after 1 run. Fun test skipped by Jamie: "Nothing has changed since before"
           (R4 was 3/5). Port parity and loop speed confirmed | - | -
   chore pages | "No grey bar": npm run build now also copies the build to /docs/index.html (repo root) for
           GitHub Pages (branch claude/signal-lance, folder /docs); docs/manifest.webmanifest (fullscreen,
           landscape) + home-screen meta tags; --top strip drops to 0 only when NOT inside the Claude viewer
           (artifact keeps its 56px). Live: https://flukanuck.github.io/Prototype/ (capital P, case-sensitive). No gameplay/TUNE change | - | -
   round7 step1 | R5/R6 "1v1 decides it all", 0/5 for lack of "variety of content or variables" | NEW field
           replaces the duel bot: FIELD (1 turret, 1 emplacement, 2 patrols), FIELD_TYPES, EMPL_PULSE_TURNS 2,
           EMPL_SWEEP_DEG 100, FLASH_UNC 2 (muzzle flash, both ways), ENEMY_UNSEEN_SPEED 5; WIN CLEAR; kills on
           result/log. Runner 20 games: LOSS 19, WIN UPLINK 1, avg 6.4 turns, avg kills 0.35/4, no stalls;
           every type found and acted (turret found 14/20, fired 14/20) | -
   round7 run1 | WIN UPLINK kills 3/4: "had no idea what each contact I was shooting actually was" → kills felt
           anonymous | NEW type ID on sight: your eyes (same LoS rule as the damage read) label the contact with its
           type, kept while the contact lives; label "PATROL · BLOODIED"; wrecks always named ("TURRET ✕"), identified or not. Passive, radar
           and muzzle flash never identify. No TUNE change. BUILD r7-s1b | helped
   round7 run2 | weakest moment "felt fine"; played the field as "fought what came" (no targeting plan, no
           sneak; turret not a standout moment) | no change. Step 1 debrief done → step 2 (lance + initiative) cleared | -
   round7 step2 | step 1 "fought what came"; brief step 2 | NEW second mech (A / B loadouts) + initiative:
           INIT_BASE {MECH 5, TURRET 6, PATROL 4, EMPLACEMENT 3}, INIT_ROLL 3, ties to the player; initiative strip;
           LOSS = both mechs down. BUILD r7-s2. Runner 20 games (2 scripted mechs): LOSS 17, WIN UPLINK 2,
           WIN CLEAR 1, avg 7.9 rounds, avg kills 1.30/4, no stalls; every type found and acted | -
   round7 run3 | WIN CLEAR 4/4 (B destroyed); A radar+passive+ECM, B 2 armour + 40 rds. Weakest moment "felt fine".
           Roles: "used A to locate, and then used B to push in with A behind it". Initiative: "tense, in a good way" |
           no change | -
   round7 END | wrapped after 3 runs (2 on step 1, 1 on step 2). Fun test 1/5 (one more go). Missing: "variety in
           both map and field, followed by a reason to care" | - | -
   PARKED (Jamie, R7 run1): SIGINT: identify a unit's type from its signal type alone (no eyes needed).
   chore version | Jamie: needs to know the GitHub page isn't a stale cached copy | version tag "<BUILD> · MM-DD HH:MM"
           (build time, Vancouver; vite define __BUILT__) bottom-left next to DBG and under SLOTS on the loadout
           screen. View only; no gameplay/TUNE change | -
   round8 step1 | R7 "the lance clicked, runs blur"; missing "variety in both map and field" | NEW composition pool:
           FIELD → FIELD_COMPOSITIONS (Mixed 1T/1E/2P uplink, Turret nest 3T/1E uplink, Sweep 4P, Fortified 1T/2E/1P
           uplink, Ambush 2T/2P anywhere), equal weights, rolled per run; staticPlacement flag; INTEL, result, log
           and DBG name it. Runner --comp, 10 games × 5 comps: Mixed L8/U2, Turret nest L9/U1, Sweep L4/U4/C2,
           Fortified L7/U3, Ambush U10; no stalls. FLAG: Ambush turrets found 2/20, acted 2/20 (placed off the
           scripted route, they mostly never see anyone). BUILD r8-s1 | -
   round8 override | Jamie, before playing: "need a way to make sure I can play each type" (the equal-weight roll
           can repeat). Brief said no no-repeat logic; Jamie asked, picked "shuffled set" over a fixed order (fixed
           would make INTEL predictable) | NEW FIELD_SHUFFLE 1: every composition once per 5 runs, random order;
           bag kept view-side. BUILD r8-s1b | -
   round8 run1 | WIN CLEAR · Mixed · 4/4 (A Rdr+Pas+ECM, B 2 armour + 40 rds). Weakest: reading the contacts —
           "a mixture of them all, the logic doesnt make sense, and then the old lines make it confusing" (fixes in
           impossible spots, stale lines, seen statics shifting) | BEARING_LIFE 15 → 6 s (lines fade sooner and stop
           feeding fixes sooner). BUILD r8-s1c | helped ("much better!")
   round8 run2 | WIN UPLINK · Sweep · 2/4. Same A/B loadouts as run 1; INTEL: "didn't need to change". Weakest:
           "better, now that the game isnt simultaneous though, i dont think we need the projected movement of enemies,
           atleast not the contact dot, and the projections circle should only increase on that enemies turn" |
           DR_TIME 4 → 0 (no drift); NEW UNC_GROW_OWN_TURN 1 (a lost contact's circle grows only during that unit's
           activation). Also covers parked #32 (seen statics shifting). BUILD r8-s1d | helped
   round8 run3 | Mixed or Sweep (log line not given; the shuffled set should have given a third field, so picks were
           likely used up by page loads, or by the artifact and the Pages copy keeping separate bags). Weakest: "it felt
           fine" | no change | -
   round8 END | wrapped after 3 runs (Mixed, Sweep, Mixed-or-Sweep). Fun test 0/5 ticked, but "Fun." Missing / closing:
           "no new real mechanics or content to make me want to do extra rounds". A/B split unchanged across fields:
           "didn't need to change" | - | -
   round9 step1 | R8 "fun, but no new real mechanics or content"; one A/B split beat every field | NEW MORTAR module
           (MORTAR_SHELLS 6, AP_MORTAR 2, MORTAR_PER_ACTIVATION 1, MORTAR_MAX_UNC 4, MORTAR_MIN/MAX_RANGE 4/18,
           MORTAR_SCATTER_BASE 0.5 + 0.6/tile unc, MORTAR_SPLASH 1, MORTAR_DMG 1 plate, SIG_MORTAR 30, MORTAR_FLASH_UNC 4);
           FIELD_PLAYTEST_POOL [Turret nest, Ambush, Fortified]. Runner 50 games (A with mortar): L22 U21 C7, no stalls;
           mortar hit 75/112 shots, 65 kills, 11 friendly hits. Ambush turrets still found 2/20 by the script. BUILD r9-s1 | -
   round9 run1 | WIN UPLINK · Fortified · 2/4, mortar 4/5 hits, 2 kills (A); B destroyed. Weakest: "mostly fine… the lob on
           a weak signal notably missed and that was good… definitely added a good dimension" but wants "a manual targeting
           option… with no fix… bad accuracy, more just a shot in the dark to try and flush or get a lucky hit" | Override:
           blind lob on a tapped spot; NEW MORTAR_BLIND_UNC 6 (scatter ≈4.1 t). BUILD r9-s1b | helped
   round9 run2 | WIN CLEAR · Turret nest · 4/4, mortar 3/4 hits, 3 kills (A, no blind lobs); A Pas+ECM+Mtr, B Rdr+Pas+ECM.
           Weakest: "too easy… against pure stationary nest as soon as you get a fixed signal you can just stand off and
           pummel", but "a future balance consideration rather than… a mechanic" | no change (Jamie's call) | -
   PARKED (Jamie, R9 run2): mortar splash damage scales with how close the impact is; even a firm fix keeps some inherent
           mortar inaccuracy (bigger base scatter). Balance of mortar vs static fields is for later.
   round9 END | wrapped after 2 runs (Fortified, Turret nest). Fun test 0/5 ("same answer as last build round"). Loadout split
           moved (B took radar, A quiet mortar). Missing / closing: "map variety / signal terrain" | - | -
   round10 step1 | R9 0/5 over 2 runs, stopped because he'd "seen the new thing"; static nest "too easy… stand off and
           pummel"; missing "map variety / signal terrain" | NEW rolled zones: ZONE_TYPES QUIET (SIG_MULT 0.4) / NOISE
           (UNC_MULT 2.0, UNC_FLOOR 3), 10 ZONE_CANDIDATES, ZONE_RADIUS 3, ZONE_COUNT 2–4, ZONE_UPLINK_NEAR 8,
           ZONE_SPAWN_CLEAR 4, ZONE_STATIC_PREF 0.7; Ambush turrets in QUIET facing the spawn; FIELD_PLAYTEST_POOL
           [Turret nest, Ambush, Fortified] → [Ambush, Turret nest]; bag resets per build. BUILD r10-s1 | -
   round10 run1 | WIN CLEAR · Ambush · 4/4, zones Q1 N2, 2/2 statics zoned, mortar 1/3 hits (A). A Pas+ECM+Mtr, B Rdr+Pas+ECM |
           (debriefed with run 2) | - | -
   round10 run2 | WIN UPLINK · Turret nest · 2/4, zones Q1 N3, 2/4 statics zoned, mortar 0 fired (A); B destroyed. Weakest: "it felt
           fine". Ground changed the plan before contact: "yes, hid a mech" in quiet ground. Nest: "tense, had to close in"
           (no stand-off-and-pummel this time) | no change | -
   round10 runs3-8 | ~5-6 more runs, log not copied. "Started to feel samey": what was the same = "nothing at stake" (each run fine,
           nothing carries over) | no change (out of round scope) | -
   round10 END | wrapped after ~7-8 runs. Fun test 2/5 ("one more go"; a loss made me want to fix my plan). Hid a mech in quiet
           ground on purpose; nest in noise "tense, had to close in". Missing / closing: "Not sure. It needs a discussion" | - | -
   round11 step1 | R10 runs went "samey" on "nothing at stake"; design lead debrief narrowed it to "no bigger picture" | NEW
           contract: CONTRACT_HUNTS 3, CONTRACT_WINS_NEEDED 2; 2 rolled jobs per hunt (different compositions), carry-over of
           hits / rounds / shells / lost mechs, loadouts locked per contract, job-pick and contract result screens;
           FIELD_PLAYTEST_POOL [Ambush, Turret nest] → []. BUILD r11-s1 | -
   chore r11 | Jamie: testers need the round's objective and basics without him explaining | NEW tester splash +
           basics screen (src/view/brief.ts), 3 end-of-hunt tap questions into the log, tester name, SEND LOG (share
           sheet); fix: contract prefix + lance state now in hunt log lines. BUILD r11-s1b | -
   chore r11 fix | tester Big Joe (iPhone 17, landscape): "Can't read fully what each slot ability does" (module descriptions
           were one line, cut off with "…") | loadout descriptions wrap onto 2 lines, 11px. BUILD tag kept at r11-s1b so testers'
           logs aren't wiped (build time in the version tag still changes) | -
   round11 contract1 | Jamie, C1 COMPLETE 3/3 (Mixed > Sweep > Fortified), lost A in H3. H1 "Flat", H2 "Fine", H3 "Tense":
           "Felt more stress due to low starting health. Definitely played slower and more careful". Weakest: hunt 1 flat,
           because "nothing to lose yet". Job pick "felt fine" | step 2 (brief gate met: carry-over changed H3) | -
   round11 step2 | hunt 1 flat: fresh lance, nothing to lose yet | NEW payout + refit: PAY_WIN 100, PAY_KILL 20, COST_REPAIR
           15, COST_ROUNDS 10, COST_SHELL 15, COST_REBUILD 200; Jamie's tweak: NEW REFIT_CAP 0.8 (never refit above 80% of
           the previous hunt's start; always a handicap). BUILD r11-s2 | -
   round11 contract2 | Jamie (log not sent). Payout + refit rated "helped" (hunt 1 now counts). Weakest: "it felt fine". Spending
           felt "too little to matter": a ~140 cr hunt bought every allowed refit with change left | COST_REPAIR 15 → 40,
           COST_ROUNDS 10 → 25, COST_SHELL 15 → 30 (pay, cap, rebuild unchanged). Round wrapped right after; untested |
           not rated
   round11 END | wrapped after 2 contracts (6 hunts). Fun test 1/5 ("one more go"). Hunts mattered "a bit" more than R10.
           Missing / closing: "More tactical depth" | - | -
   round12 step1 | R11 fun test 1/5, missing "more tactical depth": every legal shot hits, "a hit is just a hit" | NEW
           to-hit roll (HIT_BASE 75, HIT_MIN/MAX 10/95, HIT_SIG_MAX 15, HIT_RANGE_FREE 4, HIT_RANGE_PER_TILE 3,
           HIT_MOVED_PER_TILE 4, HIT_MOVED_MAX 24, HIT_COVER 25, COVER_GRAZE 0.5, COVER_RANGE 1.5) and hit locations
           (PARTS, PART_WEIGHTS 40/25/20/15, PART_SHARE .5/.2/.15/.15, PART_SENSORS_EYES_MULT 0.5), per-part carry-over.
           Runner 20 contracts: hit 48% overall, cover 28% vs open 59%, hunts 9.3 rounds (R11 7.7), no stalls. BUILD r12-s1 | -
   round12 contract (C2) | Jamie, C2 COMPLETE 3/3 (Turret nest > Sweep > Turret nest), lost B in H2 (Sweep: lance 2/6 hits,
           field 10/18). Weakest: "didn't know why the % was what it was": "Stationary turret. In the open, hadn't moved 48%
           chance. Didn't make sense to me." Cause: statics sit against walls, so walls beside them counted as cover (runner:
           26/73 shots at statics in cover) | COVER_RANGE 1.5 → 1.0, COVER_GRAZE 0.5 → 0.3 (runner: statics in cover 4/58,
           overall hit 48% → 59%). Round wrapped right after; untested | not rated
   round12 END | wrapped after 1 contract (3 hunts), step 2 not started. AI parked (see report): hurt mech in a dead end,
           3 patrols alive, none followed; a shot patrol kept walking (its WPN had just been destroyed) | - | -
   round13 build | R12: "enemies felt dumb", "no risk in having high signal", sprint noise stacks and lingers | NEW
           Signal split: Emissions (electronic only; SIGNAL_MOVE_PER_TILE all 0, SIG_MORTAR / SIG_MOVE / SIG_CREEP /
           SIG_FIRE / CREEP_SIG_MULT unused) + Sound (SOUND_RANGE CREEP 2, NORMAL 6, SPRINT 9, SHOT 12, MORTAR 14;
           SOUND_UNC 5). Pack behind PACK_ENABLED (ALARM_RADIUS_BASE 8, ALARM_RADIUS_EMIT 8, ALARM_UNC_ADD 2,
           PACK_SEARCH_ACTIVATIONS 2, PACK_SPRINT_ON_WOUNDED true). Runner (20 contracts, pack off): field first contacts
           by sound 70% (FLAG > 50%). BUILD r13-s1 | -
   round13 build | runner flag: sound was 70% of the field's first contacts (passive no longer hears moves) | Jamie:
           SOUND_RANGE.NORMAL 6 → 4, SPRINT 9 → 7. pickPackTarget = the brief's rule (parts lost, core, nearest) | -
   round13 test 2 | C1 COMPLETE 3/3. Jamie: no bearing lines on patrols (no emissions under electronic-only); couldn't
           shoot a heard patrol (button said FUZZY, label said PATROL); RADAR did nothing with SNS gone (button looked
           ready; ECM, GHOST too); with LEG gone couldn't move (NORM selected, MOVE said LEGS) | NEW COMMS_EMIT
           { PATROL 10, TURRET 0, EMPLACEMENT 0 } (EMIT floor); PART_MIN { LEGS 2 }, one leg = CREEP only, both =
           CREEP × LEGS_GONE_MULT 0.5 (spec override, Jamie); auto-CREEP on activation; RADAR/ECM/GHOST show SNS; FIRE/MORTAR
           show SOUND; heard contacts hollow + "· SOUND". Runner: lance passive first contacts 30 → 71; field sound share
           50.1% (flag, by 1). BUILD r13-s2 | -
   round13 test 2 rating | comms / SOUND labels / SNS buttons / two legs: "helped, but if they're small radios, that'll
           need tweaking as to detection range down the road" | - | helped
   round13 debrief 1 | quick contract, pack on, WIN. Weakest: "fixes I couldn't trust": radar gave a 7.5-tile circle
           centred outside its own cone (walls 2.7t × quiet target 1.39 × NOISE 2, recentred up to 0.7 r) | ZONE_NOISE_
           AFFECTS_RADAR (effectively true) → false: NOISE no longer blurs radar fixes; same fix ≈ 3.75t, centre within
           ≈ 2.6t. Session wrapped right after; untested | not rated
   round14 part 0 | R13 "did being loud cost you anything?" took contracts to answer | NEW test bed (scenarios.ts,
           TEST BED button, [TESTBED] log line, runner --scenario/--runs/--quiet). Scenarios Earshot, Wounded (pack on).
           BUILD r14-s0 | -
   round14 part 1 | R13: channels readable "at a glance" but reading them decided nothing | NEW 9 variants
           (FIELD_VARIANTS, VARIANTS_ENABLED), observed traits (TRAIT_EMIT_HIGH 20, TRAIT_SILENT_RANGE 10,
           TRAIT_DRIFT_DEG 8, TRAIT_STILL_ACTS 3, TRAIT_SOFT_MAX 3, TRAIT_STEP_MAX 5, SHOT_MUFFLED_MAX 6), CARD, ID
           (HIT_ID_BONUS 10, ID_STATIC_HOLD true); lance hears field radar pulses at once. Scenarios Look-alikes,
           Quiet gun, Twin pulse. Runner (20 contracts): ID'd before eyes 27%, right 100%, narrowed 46%, from first
           reading 4%, 2.0 rounds to one variant; check OK. BUILD r14-s1 | -
   round14 debrief 1 | quick contract, Mixed, WIN CLEAR, IDs 1 (right, before eyes). Weakest: "reading contacts felt
           pointless": "killed them before I knew", "they walked into eyes"; and "didn't feel intuitive enough to bother
           opening the sub menu UIs to make the ID … more a refinement/scale/presentation issue" | NEW ID_SHOW_FITS
           false → true: contact label "N fit", picker greys out ruled-out variants (still tappable). Jamie: patrol step
           tells stay close-range for a baseline ExoS (acoustic sensors will extend them later); not changed. BUILD r14-s2 | -
   round14 debrief 1 rating | ID_SHOW_FITS: "Helped to a degree. But still felt I could have just as easily not bothered
           with it and got on fine." | - | helped (partly)
   round14 debrief 2 | weakest: "An ID changed nothing". Jamie: "irregardless of the enemy type, if around an uplink, I'm
           going to have to fight it … the information just doesn't give us anything other than position for a ranged
           lob." Confirmed: "Yes… AND.. but I just can't quite figure out what the and is." | no change: structural
           (objective forces the fight), not a TUNE knob. Round wrapped | -
   round15 step 1 | R14: "irregardless of the enemy type, if around an uplink, I'm going to have to fight it"; the "and"
           = "pick my fights and choose how to fight it" | NEW mission types (MISSION_TYPES ['UPLINK','BOUNTY']), BOUNTY
           per variant (scout 25, line 35, heavy 80, sentry 35, hush 45, gun 90, search 60, fire 50, relay 55),
           BOUNTY_FIELD_EXTRA 2, BOUNTY_QUOTA brief 150 → 120 at build (runner: the scripted lance met 150 in only 13–25%
           of Bounty hunts; 120 → ~30–40%). Scenarios Price list, One more?. Runner (20 contracts): Bounty win 18%,
           Uplink 64%; flags: sound share 58% (uplink hunts; 50% uplink-only, inherited R13 knife-edge), gun killed 0/12.
           BUILD r15-s1 | -
   round15 step 1 debrief | "It felt fine". Bounty prices "changed when I left"; leaving at quota "just felt like a good time
           to do so" (calm, not a gamble). Test bed: "useful". | no change | -
   round15 step 2 | check-in: build Retrieve as briefed | NEW RETRIEVE (MISSION_TYPES + 'RETRIEVE', RETRIEVE_PICKUP_AP 2,
           RETRIEVE_NO_SPRINT true, RETRIEVE_HANDOFF_AP 1, RETRIEVE_HANDOFF_RANGE 1.5), packOn() after the flip, carrier
           first in pickPackTarget. Scenarios Grab and go, Hot potato. Runner (20 contracts, forced Retrieve): win 41%,
           picked up 38/46, cargo lost 10, pickup → end 3.7 rounds. Mixed check: same 2 known flags (sound share, gun 0%).
           BUILD r15-s2 | -
   round15 step 2 debrief | "felt good, enemy aimed for the mech with the cargo"; weakest: "It felt fine". Reading the guards:
           "really only one sensible route, and the guards there were unavoidable, but if I had the chance, I would have
           changed route" | no change (map, not a knob). Counts as the Step 3 check-in: build Escort as briefed | -
   round15 step 3 | Escort as briefed | NEW ESCORT (MISSION_TYPES + 'ESCORT', ESCORT_HITS 5 (build: 8 → 5, runner 93% →
           68% wins), ESCORT_MOVE 8, ESCORT_EMIT 10, ESCORT_ARMOUR 1, ESCORT_INIT 4, ESCORT_BONUS 60, ESCORT_AMBUSH_RANGE 4,
           PARTS.ALLY), route graph in MAP_ANCHORS, friends() / isFriend() for the field's targets. Scenarios Fork, Shadow.
           Runner (20 contracts, forced Escort): win 68%, transport shot at in 85% of hunts, destroyed 18/60. Mixed check:
           sound-share flag only. BUILD r15-s3 | -
   round15 step 3 debrief | weakest: "It felt fine". Fork call decided by "a mix of all scan results, as well as gut feeling,
           looking forward to the final route, trying to keep options open". Escort vs Uplink: "its own thing" | no change | -
   round16 | build as briefed | NEW block districts (MAP_MODE 'blocks', BLOCK_SIZE 12, MAP_GRIDS, MAP_MIN_BLOCKS 8, MAP_ROTATE,
           MAP_REROLL_MAX 20, FIELD_SCALE_BY_AREA, FIELD_BASE_AREA 1728, ZONE_SCALE_BY_AREA, MOD_SPAWN_CHANCE 0.5), clutter
           (CLUTTER_TILE_COST 2, CLUTTER_SOUND 3), ESCORT_FORKS 2. Scenarios Long way round, Two districts (strip / square),
           Crunch. Build: blocks redrawn denser (first draw 30% walls: blocks won 34% vs hive 57%) and edge clutter slots
           that span the seam street (clutter on 4–5% of lance moves → 7–9%). Runner, 60 contracts: blocks win 50% of hunts
           (hive 58%): Escort 71% (85), Uplink 54% (77), Retrieve 30% (42), Bounty 33% (24); grids 26–67%, no grid flag;
           0 rerolls. --check: sound-share flag gone on blocks (46%); Bounty "sentry killed 0%" fires (hive 3/9). BUILD r16-s1 | -
   round16 bug | "enemy turn, nothing happening" (Escort, transport holding at a fork) | the HUD's last-shot line read the
           transport's field type (it has none) the first time the field shot it, which killed the frame loop. An R15 bug,
           hit more often now that the transport is shot more on block maps. Fixed (who() names it "transport"). Checked
           with 160 random-input hunts in the browser (blocks + hive) running the real HUD and renderer: no errors. BUILD r16-s2 | -
   round16 debrief 1 | Jamie: "for the blocks, they cant always have a full path grid system … no reason to not allow me to
           take the centre road all the way … some sort of system to add randomised blockers, debris, buildings etc along grids
           to deny access and provide LoS blockers down long stretches" | NEW SEAM_BLOCK_CHANCE 0.35, SEAM_BLOCK_KINDS RUBBLE 0.4 /
           BARRICADE 0.3 / CHOKE (chicane) 0.3; Escort forks offer NORTH / AHEAD / SOUTH where the streets are open (2-3 legs).
           Also (Jamie): map tooltips (hover / hold) and round history on the splash. Runner 60 contracts: wins 48% (was 50%),
           Escort 53%, Uplink 51%, Retrieve 45%, Bounty 41%; clutter on 17% of lance moves (was 7-9%); 0 rerolls. BUILD r16-s3 | -
   round16 debug | Jamie: "add a debug contract reroll button so we can make sure we get the mission type we want" | job
           screen DEBUG: REROLL JOBS: rolls the hunt's 2 jobs again (same hunt number; the contract RNG moves on). The hunt's log
           line carries "[DBG jobs rerolled ×N]". BUILD r16-s4 | -
   round16 debrief 2 | Jamie: "still feels too much like a grid … irregular shape library of tiles, like 0.5 wide, 2 wide,
           1.5 wide, L shape tiles … randomly placed to fit in the map footprint"; "shapes can extend past the map edge, they
           are just cut off by the map boundary" | NEW MAP_LAYOUT 'packed' (default; 'grid' = s3), MAP_EDGE_CROP, SHAPE_WEIGHTS,
           STREET_KEEP 0.6, LOT_CHANCE 0.3, YARD_CHANCE 0.4, ALLEY_MAX 2, ESCORT_LEG_SPREAD 6, ESCORT_SHARED 5. Runner 60
           contracts: wins 47%; Escort 55%, Uplink 65%, Retrieve 25%, Bounty 29%; hunts longer (Escort 14.4 rounds); clutter on
           25% of lance moves; rerolls 3%. Flags: 6x2 82% (11 hunts), sound share (inherited). BUILD r16-s5 | -
   round16 debrief 3 | Jamie: spawned boxed in ("im going to have to take multiple rounds just to get out of this cramped
           area"); "an order to pause the convoy … say 3 times … increase speed … a sprint for 1 turn"; routes "progress and then
           back track" | NEW SPAWN_APRON 4×9, SPAWN_LOOK 12; ESCORT_HOLDS 3, ESCORT_HURRIES 3, ESCORT_SPRINT 12; ESCORT_BACKTRACK
           4, ESCORT_DETOUR 1.8. No leg now travels more than 4 tiles west (300 seeds). Runner 60 contracts: wins 41% (was 47%);
           big grids hardest (4x4 forced, 40 contracts: 36%); rerolls 1%. Flags: hush 0% (Bounty), 4x4 10% (20 hunts; 36% when
           forced), sound share (inherited). BUILD r16-s6 | -
   round16 debrief 4 | Jamie: "1. icon along route to show how far transport will move in its next move. 2. transport to show
           in initiative, 3. railway style direction lever"; 51% / 55% on an emplacement next to a barricade "felt really low and
           annoying" … "if the target is sharing the same cover item as the ExoS the cover doesnt apply" | NEW forks-ahead levers,
           next-move marker, T in the strip; COVER_ADJ 0.75, COVER_ITEM_RADIUS 3. Runner 60 contracts: hit 57% (cover 29%, open
           62%), wins ~40%; Escort forced (30): 60%. BUILD r16-s7 | -
```
