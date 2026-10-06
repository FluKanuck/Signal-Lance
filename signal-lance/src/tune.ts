// Every tuning value. Moved verbatim from signal-lance.html (Round 5).
// ============================ TUNE ====================================
export const TUNE = {
  TILE: 32,             // world units per map tile
  PLAYER_SPEED: 2.2,    // NORMAL move speed (both mechs), tiles per second
  CREEP_SPEED: 0.9,     // CREEP move speed (both mechs), tiles per second
  PLAYER_HITS: 3,       // base hits before destruction
  ZOOMS: [1.0, 0.55],   // the two zoom levels (screen px per world unit)
  DRAG_PX: 12,          // finger travel (px) before a touch counts as a pan
  EXTRACT_COLS: 3,      // rightmost map columns that count as extraction
  CAM_LERP: 6,          // camera follow stiffness (higher = snappier)
  DPR_MAX: 2,           // cap on devicePixelRatio (performance)
  SMOOTH_PAD: 0.3,      // path smoothing clearance, in tiles
  SLOTS: 10,            // loadout slots on the mech
  // --- signature (arbitrary units) ---
  SIG_STILL: 0.5,       // standing still
  SIG_MOVE: 2.0,        // UNUSED from R13 (movement is Sound now, not a passive emission). Was: added while moving
  SIG_CREEP: 0.4,       // UNUSED from R13. Was: added instead of SIG_MOVE while creeping
  CREEP_SIG_MULT: 0.5,  // UNUSED from R13. Was: whole signature × this while creeping (R4 run6: creep = quieter, not silent)
  SIG_FIRE: 6.0,        // UNUSED from R13 (the gun's firing spike is Sound now). Was: added briefly after each shot
  SIG_FIRE_TIME: 1.0,   // seconds the firing spike lasts
  SIG_RADAR: 12.0,      // added while radar is on
  SIG_ARMOUR: 1.0,      // added per armour plate
  // --- detection ---
  DET_FALLOFF: 6,       // tiles; strength = sig / (1 + (dist/FALLOFF)^2)
  DET_WALL: 0.8,        // strength multiplier per building tile in between
  DET_THRESH: 0.25,     // strength needed to detect
  EYES_RANGE: 12,       // tiles; base "eyes" see anything in LOS this close... (was 5; R4 run5)
  EYES_HALF_ANG: 70,    // ...within this many degrees of facing (facing = last move direction)
  EYES_CLOSE: 2,        // tiles; inside this, eyes see all round (any facing), LOS still needed
  FREE_TURNS: 1,        // free changes of facing per turn (each mech)...
  AP_TURN: 1,           // ...then this many AP per extra change of facing
  DMG_BLOODIED: 0.5,    // enemy label BLOODIED at or below this fraction of its max hits
  DMG_BADLY: 0.25,      // enemy label BADLY DAMAGED at or below this fraction
  // --- contacts ---
  UNC_ACQUIRE: 2.5,     // tiles; uncertainty radius on first detection
  UNC_EYES: 0.25,       // tiles; best uncertainty eyes can reach
  UNC_SHRINK: 1.2,      // tiles/sec shrink while continuously tracked
  UNC_GROW: 1.2,        // tiles/sec growth while track is lost (≈ enemy top speed)
  DR_TIME: 0,           // seconds a lost contact's centre keeps drifting along its last seen velocity (R8 run2: was 4; turns aren't simultaneous)
  UNC_GROW_OWN_TURN: 1, // R8 run2: 1 = a lost contact's circle only grows while that unit is acting (its activation); 0 = grows all the time
  CONTACT_LINGER: 12,   // seconds a lost contact lingers (fading) before vanishing
  TAP_CONTACT_PX: 28,   // min screen radius for tapping a contact
  SELF_TAP_PX: 16,      // screen radius for tapping your own mech (arms / cancels a face change)
  TRACK_GAP: 1.6,       // seconds without a new fix before a triangulated contact counts as lost
  // --- radar ---
  RADAR_RANGE: 18,      // tiles
  RADAR_HALF_ANG: 50,   // degrees, half-width of the forward cone
  RADAR_UNC: 0.3,       // tiles, uncertainty of a clear-LOS radar fix
  RADAR_MAX_WALLS: 4,   // building tiles radar can see through
  RADAR_WALL_UNC: 0.6,  // tiles of extra uncertainty per building tile in the way
  RADAR_JIT_TIME: 2,    // seconds between re-rolls of the through-wall position error
  // --- passive suite ---
  BEARING_EVERY: 1.0,   // seconds between bearings on a detected emitter
  BEARING_LIFE: 6,      // seconds a bearing line lasts (R8 run1: was 15; old lines crossed into bad fixes)
  BEARING_ERR: 3,       // degrees, max random error per bearing
  TRI_MIN_BASE: 3,      // tiles between the two positions the bearings were taken from
  TRI_MIN_ANG: 15,      // degrees; min crossing angle to triangulate
  TRI_UNC_MIN: 0.8,     // tiles, best possible triangulated uncertainty
  TRI_BLEND: 0.5,       // how far each new triangulated fix pulls the contact (0..1)
  // --- ECM ---
  ECM_MASK_MULT: 0.25,  // signature multiplier while masking
  SIG_JAM: 5,           // jamming emission (bearing only) while masking or a ghost is up
  GHOST_COST: 25,       // Energy to place a ghost (plus AP_ECM)
  GHOST_TURNS: 3,       // your turns a ghost lasts (was GHOST_TIME 25 s)
  // --- weapons (both sides) ---
  AMMO_PER_SLOT: 10,    // rounds per autocannon slot
  SHOT_SPEED: 25,       // tiles/sec shell speed
  HIT_RADIUS: 0.6,      // tiles; target must be this close to the aim point when the shell lands
  SHOT_DAMAGE: 1,       // hits removed per shell
  ARMOUR_HITS: 3,       // hits added per armour plate
  GHOST_UNC: 2.5,       // tiles; how certain a ghost looks to the enemy
  // --- enemy ---
  ENEMY_SPAWN_MIN: 35,  // tiles; min spawn distance from the player
  ENEMY_FIRE_RANGE: 12, // tiles
  ENEMY_BLIND_PULSE: 8, // seconds (÷ SEC_PER_TURN = turns) between radar pulses for an enemy with no passive suite
  ENEMY_INVEST_DIST: 10,// tiles along a bare bearing that it goes to check
  ENEMY_ACT_PAUSE: 0.4, // real seconds between the enemy's actions on its turn (readability)
  SEC_PER_TURN: 2,      // converts old per-second enemy timers (patience, timed pulses) into turns
  // --- shots (both sides) ---
  SHOTS_PER_TURN: 2,    // max shots per turn, each mech
  PLAYER_FIRE_UNC: 2,   // tiles; the player can only shoot contacts at least this certain
  PLAYER_FIRE_RANGE: 12,// tiles; player max shot range (= ENEMY_FIRE_RANGE)
  // --- Round 4: I-go-you-go, action points + Energy (both mechs, same rules) ---
  AP_PER_TURN: 4,       // AP gained at the start of your own turn
  AP_BANK_MAX: 8,       // unspent AP carries over, up to this
  AP_SHOT: 1,           // AP per shot
  AP_RADAR: 2,          // AP per radar pulse
  AP_ECM: 1,            // AP to switch ECM on, and again at the start of each of your turns while on (also the ghost)
  ENERGY_BASE: 100,     // base Energy pool (was POWER_BASE)
  ENERGY_CELL: 50,      // extra Energy per energy cell (was POWER_CELL)
  ENERGY_REGEN: 10,     // Energy regained at the start of your own turn
  RADAR_EN: 25,         // Energy per radar pulse (≈4 pulses from full)
  ECM_EN: 20,           // Energy per turn while ECM is on (paid with AP_ECM at turn start)
  MOVE_TILES_PER_AP: { CREEP: 1, NORMAL: 2, SPRINT: 3 },   // tiles bought by 1 AP
  MOVE_ENERGY_PER_TILE: { CREEP: 0, NORMAL: 1, SPRINT: 4 },  // Energy per tile (sprint was 10; 4-AP sprint = 12 tiles, 48 EN)
  SPRINT_SPEED: 3.4,    // tiles/sec while sprinting (creep = CREEP_SPEED, normal = PLAYER_SPEED)
  RADAR_PULSE_TIME: 0.6,// seconds of sim a radar pulse runs, radar on
  RADAR_HOLD: 1.6,      // seconds of sim a clear-LOS radar fix stays "tracked" (was 0.1)
  // --- Round 4 step 2: Signal (both mechs, same rules). Brief's SIG_* names → SIGNAL_* (SIG_RADAR is taken) ---
  // R13: this pool is now EMISSIONS ("EMIT" on screen; unit.emit in code), electronic sources only (radar, ECM,
  // uplink). The SIGNAL_* names are kept so the TWEAK LOG history still matches.
  SIGNAL_MAX: 100,      // Signal range 0..MAX
  SIGNAL_RADAR: 30,     // Signal added per radar pulse
  SIGNAL_ECM: 15,       // Signal added per turn while ECM is on (incl. the turn you switch it on)
  SIGNAL_MOVE_PER_TILE: { CREEP: 0, NORMAL: 0, SPRINT: 0 }, // UNUSED from R13 (all 0: movement is Sound now). Was CREEP 0, NORMAL 2, SPRINT 5 per tile
  SIGNAL_DECAY: 25,     // Signal lost at the start of the owner's turn
  SIGNAL_UNC_QUIET: 1.5,// others' fix uncertainty on you × this at Signal 0...
  SIGNAL_UNC_LOUD: 0.4, // ...× this at SIGNAL_MAX (linear in between)
  SIGNAL_EMIT: 0.05,    // emission added per Signal point: Signal carries to passive sensors, even standing still
  // --- Round 13 step 1: Sound. Separate from Emissions: it never accumulates. Each unit has ONE sound radius, the
  // loudest event of its current activation, cleared at the start of its next activation. Ignores walls. ---
  SOUND_RANGE: {        // tiles; the radius each event is heard at (any unit of the other side inside gets a sound contact)
    CREEP: 2,           // a creeping move
    NORMAL: 4,          // a normal move (R13 runner: 6 → 4, sound was 70% of the field's first contacts)
    SPRINT: 7,          // a sprint: louder than walking, but doesn't carry as far as a gunshot (R13 runner: 9 → 7)
    SHOT: 12,           // a gun shot
    MORTAR: 14,         // a mortar launch
  },
  SOUND_UNC: 5,         // tiles; uncertainty of a sound contact (never enough for a gun lock or an aimed lob on its own)
  // --- Round 13 step 2: the pack (alarm, converge, press the wound). Off unless the tester splash / runner --pack turns it on ---
  PACK_ENABLED: false,  // master switch for everything below (the view sets it from the splash toggle)
  ALARM_RADIUS_BASE: 8, // tiles; a field unit that senses a lance mech alerts every other field unit within this...
  ALARM_RADIUS_EMIT: 8, // ...+ this × the mech's effective Emissions / SIGNAL_MAX (a loud mech pulls in units from further)
  ALARM_UNC_ADD: 2,     // tiles; a shared contact = the alarming unit's estimate, this much fuzzier (never a lock)
  PACK_SEARCH_ACTIVATIONS: 2, // a patrol whose contact faded searches its last estimate for this many of its activations
  PACK_SPRINT_ON_WOUNDED: true, // a patrol SPRINTs (if it has the Energy) toward a target that is BADLY or worse, or has no LEGS
  // --- Round 5: uplink objective (player only uses UPLINK; the bot knows where it is) ---
  // R15: the uplink candidates moved to the per-map anchors table (MAP_ANCHORS in sim/world.ts)
  UPLINK_MIN_DIST: 10,  // tiles; the rolled point is at least this far from the player's spawn
  UPLINK_RADIUS: 1,     // tiles; UPLINK works within this of the point (ring = this + 0.5)
  AP_UPLINK: 2,         // AP per UPLINK (max once per turn)
  SIG_UPLINK: 25,       // Signal added per UPLINK (loud: the bot's fix on you tightens)
  UPLINK_TURNS: 3,      // completed UPLINKs to win (progress persists if you leave)
  GUARD_RADIUS: 6,      // tiles; PATIENT guard post within this of the point
  // --- Round 7 step 1: the field (replaces the single duel bot; TEMPERS / VARIANTS below are unused for now) ---
  // R8: one composition is rolled per run (seeded, by weight) from this pool, using only FIELD_TYPES below.
  // NAME is shown in INTEL / result / log / DBG. Counts per type. staticPlacement: where turrets and
  // emplacements go: 'uplink' = within GUARD_RADIUS of the uplink (LOS to it where possible), 'anywhere' =
  // any reachable tile (R5 flood fill). Patrols always go anywhere reachable. weight: relative roll chance.
  FIELD_COMPOSITIONS: [
    { NAME: 'Mixed',       TURRET: 1, EMPLACEMENT: 1, PATROL: 2, staticPlacement: 'uplink',   weight: 1 }, // the R7 field
    { NAME: 'Turret nest', TURRET: 3, EMPLACEMENT: 1, PATROL: 0, staticPlacement: 'uplink',   weight: 1 }, // dug in at the uplink; nothing roams
    { NAME: 'Sweep',       TURRET: 0, EMPLACEMENT: 0, PATROL: 4, staticPlacement: 'uplink',   weight: 1 }, // all mobile (placement flag unused)
    { NAME: 'Fortified',   TURRET: 1, EMPLACEMENT: 2, PATROL: 1, staticPlacement: 'uplink',   weight: 1 }, // two radars pulsing over the uplink
    { NAME: 'Ambush',      TURRET: 2, EMPLACEMENT: 0, PATROL: 2, staticPlacement: 'anywhere', weight: 1 }, // hidden turrets could be on your route
  ],
  FIELD_PLAYTEST_POOL: [], // R11: full pool so the job pick has variety (was R10: Ambush, Turret nest; R9: Turret nest, Ambush, Fortified). PLAYTEST SETTING: non-empty = the shuffled set draws only these names; [] = the full pool
  // --- Round 11: the contract. A run is a contract of linked hunts; damage, rounds, shells and lost mechs carry over ---
  CONTRACT_HUNTS: 3,       // hunts per contract (each picked from 2 briefed jobs)
  CONTRACT_WINS_NEEDED: 2, // hunt wins (UPLINK or CLEAR) needed for CONTRACT COMPLETE; a LOSS fails the contract at once
  // --- Round 11 step 2: payout and refit between hunts (credits reset each contract) ---
  PAY_WIN: 100,          // credits for a hunt won (UPLINK or CLEAR)
  PAY_KILL: 20,          // credits per field unit destroyed (a BAIL pays nothing at all)
  COST_REPAIR: 40,       // credits per armour hit repaired (R11 debrief: 15 → 40, spending "too little to matter")
  COST_ROUNDS: 25,       // credits per +10 gun rounds (R11 debrief: 10 → 25)
  COST_SHELL: 30,        // credits per +1 mortar shell (R11 debrief: 15 → 30)
  COST_REBUILD: 200,     // credits to rebuild a lost mech (comes back at the refit cap, not full)
  REFIT_CAP: 0.8,        // Jamie: repairs / rearm / rebuild never go above this × what the mech started its previous hunt with (rounded down), so the lance never fully recovers
  // --- Round 15: mission types. Each briefed job rolls one (seeded, evenly). The INTEL names it before you take the job ---
  MISSION_TYPES: ['UPLINK', 'BOUNTY', 'RETRIEVE', 'ESCORT'], // types a job can roll (R15: one type per step)
  // Step 1, BOUNTY: every kill pays its TRUE variant's bounty (credits), however it died (blind lob, gun, eyes on; no ID needed).
  // Set from each variant's FIGHT line: tougher, better armed or harder to find = more.
  BOUNTY: {
    scout: 25,   // core 1, 10 rds: light, but pushes in
    line: 35,    // core 1, 20 rds: the plain patrol
    heavy: 80,   // core 3, 30 rds: armoured, patient, tight lock
    sentry: 35,  // core 1, firm lock only
    hush: 45,    // core 1, firm lock; you barely hear it fire (hard to find)
    gun: 90,     // core 4, 30 rds, fires on looser locks: the most dangerous thing on the field
    search: 60,  // core 4, 20 rds
    fire: 50,    // core 1, but fires on a 3-tile fix
    relay: 55,   // core 4, 10 rds
  },
  BOUNTY_QUOTA: 120,      // credits; reaching it makes the hunt a WIN (≈2–3 mid kills). Anything above it is kept as a bonus. Build: brief's 150 → 120 (runner: the scripted lance met 150 in only 13–25% of Bounty hunts)
  BOUNTY_FIELD_EXTRA: 2,  // extra field units in a Bounty hunt (variant rolled from all 9, placed 'anywhere'), so you can't take everything
  // Step 2, RETRIEVE: cargo on a guarded tile. PICK UP is loud: the whole field is alarmed and hunts the carrier (pack logic, on
  // for this job once the cargo moves, whatever PACK_ENABLED says). Carrier destroyed = cargo lost = the hunt fails.
  RETRIEVE_PICKUP_AP: 2,     // AP to PICK UP the cargo (standing within UPLINK_RADIUS + 0.5 of it, like UPLINK)
  RETRIEVE_NO_SPRINT: true,  // the carrier can't SPRINT
  RETRIEVE_HANDOFF_AP: 1,    // AP for the carrier to HAND OFF the cargo to the other mech...
  RETRIEVE_HANDOFF_RANGE: 1.5, // ...standing within this many tiles
  // Step 3, ESCORT: an unarmed faction transport walks the route legs (MAP_ANCHORS waypoints / legs) from the left edge to
  // the right. It holds at each junction until you tap a leg. The field senses and fires on it like a lance mech.
  ESCORT_HITS: 5,          // its hit pool (one part: CORE). Destroyed = the hunt fails. Build: 8 → 5 (runner: 8 won 93%, 5 → 68%, like Uplink)
  ESCORT_MOVE: 8,          // tiles it walks per round (its own activation), at NORM speed and NORM sound
  ESCORT_EMIT: 10,         // its radio: the EMIT floor, like a patrol's comms
  ESCORT_ARMOUR: 1,        // armour plates for its signature (SIG_ARMOUR each), like a patrol
  ESCORT_INIT: 4,          // its initiative base (as a patrol)
  ESCORT_BONUS: 60,        // credits on a win × the ally's hits left / its max (on top of PAY_WIN + kills)
  ESCORT_AMBUSH_RANGE: 4,  // tiles; in an Escort job every field unit is placed within this of a route leg ('anywhere' near the legs)
  // --- Round 16: rolled ground. Every hunt builds a new district from hand-drawn blocks (sim/blocks.ts) ---
  MAP_MODE: 'blocks',      // 'blocks' = a new district every hunt; 'hive' = the old fixed map (MAP_SRC), as the control (splash toggle)
  BLOCK_SIZE: 12,          // tiles per block side (blocks are square, with a 1-tile street ring)
  MAP_GRIDS: ['6x2', '5x2', '4x2', '4x3', '3x3', '5x3', '4x4'], // columns × rows; each hunt rolls one evenly (seeded)
  MAP_MIN_BLOCKS: 8,       // a grid with fewer blocks than this is never rolled
  MAP_ROTATE: true,        // blocks may be placed rotated (0/90/180/270) and mirrored (seeded)
  MAP_REROLL_MAX: 20,      // tries (seed, seed+1, ...) before giving up on a district where the mission's tiles aren't all reachable
  FIELD_SCALE_BY_AREA: true, // a bigger district gets a bigger field: each type's count × map area / FIELD_BASE_AREA, rounded, never below the composition's own
  FIELD_BASE_AREA: 1728,   // tiles; the hive map's area (72 × 24)
  ZONE_SCALE_BY_AREA: true,// zone counts (ZONE_COUNT_MIN / MAX) scale the same way on block maps
  MOD_SPAWN_CHANCE: 0.5,   // each block's modifier slot (sound zone, set piece, ground clutter) spawns with this chance per hunt
  CLUTTER_TILE_COST: 2,    // tiles of movement each clutter tile costs to cross (1 = off). Same for everyone; pathing goes round it if it can
  CLUTTER_SOUND: 3,        // tiles added to a move's Sound if it enters any clutter tile (once per move; 0 = off)
  ESCORT_FORKS: 2,         // forks on a block map's escort route (each with two onward legs round different blocks)
  FIELD_SHUFFLE: 1,   // R8 (Jamie): 1 = shuffled set: every composition once per cycle, random order (view keeps the bag); 0 = seeded weighted roll
  // Per type. ARMOUR plates (signature as SIG_ARMOUR; hits = BASE_HITS + ARMOUR × ARMOUR_HITS), AMMO rounds,
  // CELLS energy cells (+ENERGY_CELL each), MOBILE 0 = never moves, RADAR/PASSIVE 0|1,
  // FIRE_UNC tiles (fires only at contacts at least this certain), NAME / PLURAL for INTEL and the result screen.
  // PATROL also takes the brain values the old bot used (copied from CAUTIOUS; see ROUND 7 ASSUMPTIONS):
  // PATIENCE_MIN/MAX s, CONFIDENT tiles, HOLD_DIST tiles, LEASH tiles (= GUARD_RADIUS × 1.5).
  FIELD_TYPES: {
    TURRET:      { NAME: 'turret',      PLURAL: 'turrets',      ARMOUR: 1, BASE_HITS: 0, AMMO: 20, CELLS: 0, MOBILE: 0, RADAR: 0, PASSIVE: 1, FIRE_UNC: 1.2 }, // hidden: silent until it fires; firm lock only (= PATIENT)
    EMPLACEMENT: { NAME: 'emplacement', PLURAL: 'emplacements', ARMOUR: 2, BASE_HITS: 0, AMMO: 20, CELLS: 1, MOBILE: 0, RADAR: 1, PASSIVE: 0, FIRE_UNC: 2 },   // pulses radar on a timer, so it's findable
    PATROL:      { NAME: 'patrol',      PLURAL: 'patrols',      ARMOUR: 1, BASE_HITS: 0, AMMO: 20, CELLS: 0, MOBILE: 1, RADAR: 0, PASSIVE: 1, FIRE_UNC: 2,
                   PATIENCE_MIN: 3, PATIENCE_MAX: 6, CONFIDENT: 2, HOLD_DIST: 8, LEASH: 9 },
  },
  // R13 test 2 (Jamie): field units carry comms, a steady electronic emission, so passive can find them. Emissions never
  // drop below this (EMIT floor, per type). Turrets stay silent (hiding is their job); emplacements already pulse radar.
  COMMS_EMIT: { PATROL: 10, TURRET: 0, EMPLACEMENT: 0 }, // R14: UNUSED, each variant's COMMS replaces it
  EMPL_PULSE_TURNS: 2,  // the emplacement pulses radar every this many of its own turns (R14: the default; variants set PULSE)
  // --- Round 14: read the signature. 3 variants per field type, built only from knobs that already exist. ---
  // Each field slot rolls one (seeded, evenly). STATS override FIELD_TYPES (hit pool = BASE_HITS + ARMOUR × ARMOUR_HITS, split
  // across parts with PART_MIN; the CARD shows CORE, which is what kills it),
  // COMMS = the EMIT floor (replaces COMMS_EMIT for that unit), PULSE = radar every N of its own turns (0 = no radar),
  // SOUND overrides SOUND_RANGE for its own moves and shot. TRAITS / TELL are the CARD's lines (TELL in bold).
  VARIANTS_ENABLED: true, // false = every unit is its type's DEFAULT variant (the R13 field)
  FIELD_VARIANT_DEFAULT: { PATROL: 'line', TURRET: 'sentry', EMPLACEMENT: 'search' },
  FIELD_VARIANTS: {
    // PATROL: all move, all carry a small radio (EMIT low). Told apart by how loud they walk.
    scout:  { TYPE: 'PATROL', COMMS: 10, PULSE: 0, SOUND: { CREEP: 1, NORMAL: 2, SPRINT: 3 },   // light and pushy: 10 rds, short patience, shoots on looser locks
              STATS: { AMMO: 10, FIRE_UNC: 2.5, PATIENCE_MIN: 1, PATIENCE_MAX: 3, HOLD_DIST: 6, LEASH: 12 },
              TRAITS: ['EMIT low · moves', 'shot 12'], TELL: 'soft steps (≤3)', FIGHT: 'core 1 · 10 rds · pushes in, looser lock' },
    line:   { TYPE: 'PATROL', COMMS: 10, PULSE: 0, SOUND: {},                                       // the R13 patrol
              STATS: {},
              TRAITS: ['EMIT low · moves', 'shot 12'], TELL: 'steps at 4–5', FIGHT: 'core 1 · 20 rds' },
    heavy:  { TYPE: 'PATROL', COMMS: 10, PULSE: 0, SOUND: { CREEP: 3, NORMAL: 6, SPRINT: 9 },   // armoured: core 3, 30 rds, wants a tight lock, patient
              STATS: { ARMOUR: 2, AMMO: 30, FIRE_UNC: 1.5, PATIENCE_MIN: 4, PATIENCE_MAX: 8 },
              TRAITS: ['EMIT low · moves', 'shot 12'], TELL: 'loud steps (6+)', FIGHT: 'core 3 · 30 rds · patient, tight lock' },
    // TURRET: never move, no radar. Two are radio-silent; told apart by the shot.
    sentry: { TYPE: 'TURRET', COMMS: 0, PULSE: 0, SOUND: {},                                       // the R13 turret: firm lock only
              STATS: {},
              TRAITS: ['EMIT none · still'], TELL: 'loud shot (12)', FIGHT: 'core 1 · firm lock only' },
    hush:   { TYPE: 'TURRET', COMMS: 0, PULSE: 0, SOUND: { SHOT: 5 },                              // suppressed: you barely hear it fire
              STATS: {},
              TRAITS: ['EMIT none · still'], TELL: 'muffled shot (≤6)', FIGHT: 'core 1 · firm lock only' },
    gun:    { TYPE: 'TURRET', COMMS: 10, PULSE: 0, SOUND: {},                                      // fire-director link: core 4, 30 rds, fires on looser locks
              STATS: { ARMOUR: 2, AMMO: 30, FIRE_UNC: 2 },
              TRAITS: ['still · no pulse', 'shot 12'], TELL: 'steady low EMIT', FIGHT: 'core 4 · 30 rds · looser lock' },
    // EMPLACEMENT: never move, pulse radar (EMIT spikes high after a pulse). Told apart by the pulse rhythm.
    search: { TYPE: 'EMPLACEMENT', COMMS: 0, PULSE: 2, SOUND: {},                                  // the R13 emplacement
              STATS: {},
              TRAITS: ['EMIT low→high · still', 'shot 12'], TELL: 'pulses every 2nd round', FIGHT: 'core 4 · 20 rds' },
    fire:   { TYPE: 'EMPLACEMENT', COMMS: 0, PULSE: 1, SOUND: {},                                  // fire-control: core 1 but locks fast (fires on a 3-tile fix), big battery
              STATS: { ARMOUR: 1, FIRE_UNC: 3, CELLS: 4 },
              TRAITS: ['EMIT high · still', 'shot 12'], TELL: 'pulses every round', FIGHT: 'core 1 · fires on a 3-tile fix' },
    relay:  { TYPE: 'EMPLACEMENT', COMMS: 10, PULSE: 3, SOUND: {},                                 // relay: 10 rds, radio between pulses
              STATS: { AMMO: 10 },
              TRAITS: ['EMIT low→high · still', 'shot 12'], TELL: 'pulses every 3rd round', FIGHT: 'core 4 · 10 rds' },
  },
  // Observed-trait bands (what the lance writes down about a contact; see sim/ids.ts)
  TRAIT_EMIT_HIGH: 20,   // effective EMIT at or above this reads "high", above 0 "low", silent "none"
  TRAIT_SILENT_RANGE: 10,// tiles; a passive mech this close to a contact that emits nothing writes down "EMIT none"
  TRAIT_DRIFT_DEG: 8,    // degrees; a mech's new bearing on a unit swinging more than this from its last one (same spot) = "moved"
  TRAIT_STILL_ACTS: 3,   // its activations watched (you held a contact on it) without a seen move before it reads "still"
  TRAIT_SOFT_MAX: 3,     // a heard step radius up to this = "soft"...
  TRAIT_STEP_MAX: 5,     // ...up to this = "steps", above = "loud". A heard shot up to SHOT_MUFFLED_MAX = "muffled", else "loud"
  SHOT_MUFFLED_MAX: 6,
  ID_SHOW_FITS: true,    // R14 debrief 1 (Jamie: "didn't feel intuitive enough to bother opening the ID menus"): label shows "N fit", picker greys out ruled-out variants. Was false
  HIT_ID_BONUS: 10,      // % to hit for a gun shot at a contact you ID'd correctly BEFORE eyes (a wrong ID adds nothing)
  ID_STATIC_HOLD: true,  // an ID'd TURRET / EMPLACEMENT contact never grows or fades (the track "freezes"); a wrong call freezes it too
  EMPL_SWEEP_DEG: 100,  // degrees the emplacement's radar turns between pulses when it has no contact (sweeps all round)
  ENEMY_UNSEEN_SPEED: 5, // view pacing: the enemy phase runs this many times faster while the acting unit isn't a live contact of yours
  FLASH_UNC: 2,
  // --- Round 7 step 2: the lance, in initiative order ---
  INIT_BASE: { MECH: 5, TURRET: 6, PATROL: 4, EMPLACEMENT: 3 }, // initiative = base + a seeded 0..INIT_ROLL each round; higher acts first, ties to the player
  INIT_ROLL: 3,        // top of the random part of the initiative roll (whole numbers 0..this)         // tiles; muzzle flash: a unit that's shot at gets a contact on the shooter this uncertain
  // --- Round 9: MORTAR loadout module (player mechs only): indirect fire on a fix, no LoS needed ---
  MORTAR_SHELLS: 6,         // shells carried by a mech with the module (separate from gun rounds)
  AP_MORTAR: 2,             // AP per mortar shot (no Energy cost)
  MORTAR_PER_ACTIVATION: 1, // max mortar shots per activation
  MORTAR_MAX_UNC: 4,        // tiles; the target contact must be at least this certain ("FUZZY" otherwise)
  MORTAR_MIN_RANGE: 4,      // tiles; closer than this to the fix centre = "CLOSE"
  MORTAR_MAX_RANGE: 18,     // tiles; further than this = "RANGE"
  MORTAR_SCATTER_BASE: 0.5, // tiles; scatter radius = BASE + contact uncertainty (tiles) × PER_UNC...
  MORTAR_SCATTER_PER_UNC: 0.6, // ...impact lands at a seeded random point inside that circle around the fix centre
  MORTAR_SPLASH: 1,         // tiles; every unit (yours too) within this of the impact is damaged
  MORTAR_DMG: 1,            // armour plates of damage per splash (× ARMOUR_HITS = hits)
  SIG_MORTAR: 30,           // UNUSED from R13 (a mortar launch is Sound now: SOUND_RANGE.MORTAR). Was: Signal added to the firing mech per shot
  MORTAR_BLIND_UNC: 6,      // R9 run1: tiles; a blind lob (tapped map spot, no fix) scatters as if the fix were this fuzzy (≈4.1-tile circle)
  MORTAR_FLASH_UNC: 4,      // tiles; the targeted unit's flash contact on the firer (fuzzier than a gun's FLASH_UNC)
  // --- Round 10: signal terrain. Rolled zones change how a unit STANDING IN ONE is seen (both sides, same rules) ---
  // QUIET.SIG_MULT (brief: ZONE_QUIET_SIG_MULT): others read a unit's Signal × this (fix lerp, SIGNAL_EMIT, noise ring).
  // NOISE.UNC_MULT / UNC_FLOOR (brief: ZONE_NOISE_UNC_MULT / _FLOOR): any non-eyes fix on a unit inside × this, at
  // least FLOOR tiles. Eyes (EYES_CLOSE / EYES_RANGE with LoS) are unaffected.
  ZONE_TYPES: {
    QUIET: { NAME: 'Quiet ground', SIG_MULT: 0.4 },          // rubble, dead ground: hides Signal
    NOISE: { NAME: 'Noise', UNC_MULT: 2.0, UNC_FLOOR: 3 },  // substation hum, machinery: scrambles fixes
  },
  ZONE_CANDIDATES: [    // hand-picked zone centres on open, reachable floor {x, y} + the name INTEL uses
    { x: 19, y: 3,  name: 'rail cut (NW)' },
    { x: 34, y: 7,  name: 'north arcade (N)' },
    { x: 44, y: 3,  name: 'pump yard (N)' },
    { x: 58, y: 3,  name: 'NE yard' },
    { x: 66, y: 8,  name: 'east stacks (E)' },
    { x: 24, y: 11, name: 'west court (W)' },
    { x: 11, y: 19, name: 'SW yard' },
    { x: 28, y: 22, name: 'south mill (S)' },
    { x: 44, y: 19, name: 'sump (S)' },
    { x: 64, y: 22, name: 'SE apron' },
  ],
  ZONE_NOISE_AFFECTS_RADAR: false, // R13 debrief (Jamie: radar fix 'where it obviously isn't', circle too big): NOISE no longer blurs
                        // radar fixes (passive, sound, flash still blurred). Was effectively true (R10)
  ZONE_RADIUS: 3,       // tiles; a zone = every reachable floor tile within this of its centre
  ZONE_COUNT_MIN: 2,    // zones rolled per run (at least one QUIET and one NOISE)...
  ZONE_COUNT_MAX: 4,    // ...up to this many, never overlapping
  ZONE_UPLINK_NEAR: 8,  // tiles; at least one rolled zone has its centre this close to the uplink
  ZONE_SPAWN_CLEAR: 4,  // tiles; no zone tile this close to the player spawn
  ZONE_STATIC_PREF: 0.7,// chance a turret / emplacement is placed on a zone tile (when one meets its placement rules)
  // --- Round 12 step 1: to-hit roll + hit locations (both sides, same rules) ---
  // The lock rule (PLAYER_FIRE_UNC / FIELD_TYPES.FIRE_UNC, range, LOS, AP, cap, ammo) still gates FIRE; an allowed shot
  // then rolls to hit (seeded). Chance in %: HIT_BASE + Signal bonus − range − target moved − cover, clamped HIT_MIN..HIT_MAX.
  HIT_BASE: 75,           // % before modifiers
  HIT_MIN: 10,            // % floor
  HIT_MAX: 95,            // % ceiling
  HIT_SIG_MAX: 15,        // + this × target's EFFECTIVE Signal / SIGNAL_MAX (after QUIET): loud targets are easier to hit
  HIT_RANGE_FREE: 4,      // tiles of range with no penalty...
  HIT_RANGE_PER_TILE: 3,  // ...then − this % per tile beyond it
  HIT_MOVED_PER_TILE: 4,  // − this % per tile the target moved in its LAST activation (statics always 0)...
  HIT_MOVED_MAX: 24,      // ...up to this much
  HIT_COVER: 25,          // − this % if the target is in cover:
  COVER_GRAZE: 0.3,       // ...the shot line passes closer than this (tiles) to a wall tile (last 0.5 tile ignored). R12 run: 0.5 → 0.3
  COVER_RANGE: 1.0,       // ...that is within this many tiles of the target. R12 run: 1.5 → 1.0 (walls beside a turret counted)
  // Hit locations. Parts per unit kind; a hit picks one by PART_WEIGHTS (renormalised over the unit's parts).
  // Each unit's hit pool (base hits + armour plates × ARMOUR_HITS) is split across its parts by PART_SHARE
  // (largest remainder, every part at least 1 hit; see ROUND 12 ASSUMPTIONS). A hit on a destroyed part spills to CORE.
  // CORE gone = unit destroyed. SENSORS gone = no radar / ECM / ghost, eyes × PART_SENSORS_EYES_MULT (passive still works).
  // WEAPON gone = the gun can't FIRE ("WPN"; mortar unaffected). LEGS gone = CREEP only ("LEGS").
  PARTS: {
    MECH:        ['SENSORS', 'WEAPON', 'LEGS', 'CORE'],
    PATROL:      ['SENSORS', 'WEAPON', 'LEGS', 'CORE'],
    TURRET:      ['SENSORS', 'WEAPON', 'CORE'],     // static: no legs
    EMPLACEMENT: ['SENSORS', 'WEAPON', 'CORE'],     // static: no legs
    ALLY:        ['CORE'],                          // R15 Escort: the transport is one hit pool
  },
  PART_WEIGHTS: { CORE: 40, LEGS: 25, WEAPON: 20, SENSORS: 15 }, // chance a hit lands on each part
  PART_SHARE:   { CORE: 0.5, LEGS: 0.2, WEAPON: 0.15, SENSORS: 0.15 }, // how the hit pool is split (mech, 6 hits → CORE 3, LEGS 1, WEAPON 1, SENSORS 1)
  PART_SENSORS_EYES_MULT: 0.5, // eyes range × this once SENSORS are gone
  PART_MIN: { LEGS: 2 },       // R13 test 2 (Jamie): at least this many hits on a part (added on top of the pool): two legs
  LEGS_GONE_MULT: 0.5,         // R13 test 2: one leg gone = CREEP only; both gone = CREEP at this × distance per AP and speed
  // --- Round 2: enemy temperament, rolled each run (one picked at random) ---
  // PATIENCE_MIN/MAX: s it holds within HOLD_DIST with no shot before pushing in (re-rolled each stand-off)
  // CONFIDENT: tiles; contact uncertainty at which it pulses/commits to a charge (bigger = charges earlier/vaguer)
  // FIRE_UNC: tiles; fires only at contacts at least this certain (bigger = shoots on weaker locks)
  // HOLD_DIST: tiles; how close it closes on its estimate before holding
  // CREEP: 1 = creeps (CREEP_SPEED, SIG_CREEP) while investigating/searching
  // PULSE_EVERY: s between radar pulses while patrolling/investigating (0 = only when confident)
  // LEASH: tiles; R5 — only chases what it thinks is within this of the uplink, else goes back (PATIENT: to its post); AGGRESSIVE/CAUTIOUS patrol within it
  TEMPERS: {
    AGGRESSIVE: { PATIENCE_MIN: 0.5, PATIENCE_MAX: 2,  CONFIDENT: 4.5, FIRE_UNC: 3,   HOLD_DIST: 4, CREEP: 0, PULSE_EVERY: 0, LEASH: 12 },
    PATIENT:    { PATIENCE_MIN: 4,   PATIENCE_MAX: 10, CONFIDENT: 3,   FIRE_UNC: 1.2, HOLD_DIST: 4, CREEP: 1, PULSE_EVERY: 0, LEASH: 6 },
    CAUTIOUS:   { PATIENCE_MIN: 3,   PATIENCE_MAX: 6,  CONFIDENT: 2,   FIRE_UNC: 2,   HOLD_DIST: 8, CREEP: 0, PULSE_EVERY: 6, LEASH: 9 },
  },
  // --- Round 2: enemy loadout variant, rolled each run (player's modules; STANDARD = the old fixed enemy) ---
  // ARMOUR plates, RADAR/PASSIVE/ECM 0|1, AMMO rounds, CELLS energy cells (+ENERGY_CELL each)
  VARIANTS: {
    STANDARD: { ARMOUR: 1, RADAR: 1, PASSIVE: 1, ECM: 0, AMMO: 20, CELLS: 0 },
    ECM:      { ARMOUR: 1, RADAR: 0, PASSIVE: 1, ECM: 1, AMMO: 20, CELLS: 0 },
    HEAVY:    { ARMOUR: 3, RADAR: 1, PASSIVE: 0, ECM: 0, AMMO: 20, CELLS: 0 },
    HUNTER:   { ARMOUR: 1, RADAR: 1, PASSIVE: 1, ECM: 0, AMMO: 10, CELLS: 2 },
  },
};
