// Every tuning value. Moved verbatim from signal-lance.html (Round 5).
// ============================ TUNE ====================================
export const TUNE = {
  TILE: 32,             // world units per map tile
  PLAYER_SPEED: 2.2,    // NORMAL move speed (both mechs), tiles per second
  CREEP_SPEED: 0.9,     // CREEP move speed (both mechs), tiles per second
  PLAYER_HITS: 3,       // base hits before destruction
  ZOOMS: [1.0, 0.55],   // the two zoom levels (screen px per world unit)
  UI_REF_W: 844,        // R18 fix (iPad split screen): the window the layout was made for (phone landscape, CSS px); UI scale = window ÷ this...
  UI_REF_H: 390,
  UI_MIN: 0.85,         // ...never smaller than this (R19 readability pass, Jamie: "at iPhone scale this is very hard to read": 0.7 → 0.85)...
  UI_PANEL_MIN: 0.92,   // R19 readability pass: a menu panel shrinks to fit the screen height only down to this, then scrolls (was UI_MIN 0.7: 9 px text)
  UI_MAX: 1.6,          // ...nor bigger than this (iPad Pro full screen)
  DRAG_PX: 12,          // finger travel (px) before a touch counts as a pan
  EXTRACT_COLS: 3,      // rightmost map columns that count as extraction
  CAM_LERP: 6,          // camera follow stiffness (higher = snappier)
  DPR_MAX: 2,           // cap on devicePixelRatio (performance)
  SMOOTH_PAD: 0.3,      // path smoothing clearance, in tiles
  SLOTS: 10,            // loadout slots on the mech (R18: the old picker only, until the hangar replaces it)
  // --- signature (arbitrary units) ---
  SIG_STILL: 0.5,       // standing still
  SIG_MOVE: 2.0,        // UNUSED from R13 (movement is Sound now, not a passive emission). Was: added while moving
  SIG_CREEP: 0.4,       // UNUSED from R13. Was: added instead of SIG_MOVE while creeping
  CREEP_SIG_MULT: 0.5,  // UNUSED from R13. Was: whole signature × this while creeping (R4 run6: creep = quieter, not silent)
  SIG_FIRE: 6.0,        // UNUSED from R13 (the gun's firing spike is Sound now). Was: added briefly after each shot
  SIG_FIRE_TIME: 1.0,   // seconds the firing spike lasts
  // SIG_RADAR (12, added while radar is on): R18 moved to the radar's row (src/sim/items.ts, radar.sig)
  SIG_ARMOUR: 1.0,      // added per armour plate. R18: only for a unit with no fit (the Escort transport); a fit's EM comes from SIG_EM_PER_PT
  // --- detection ---
  DET_FALLOFF: 6,       // tiles; strength = sig / (1 + (dist/FALLOFF)^2)
  DET_WALL: 0.8,        // strength multiplier per building tile in between
  DET_THRESH: 0.25,     // strength needed to detect
  EYES_RANGE: 12,       // tiles; base "eyes" see anything in LOS this close... (was 5; R4 run5)
  EYES_HALF_ANG: 70,    // ...within this many degrees of facing (facing = last move direction)
  EYES_CLOSE: 2,        // tiles; inside this, eyes see all round (any facing), LOS still needed
  FREE_TURNS: 1,        // free changes of facing per turn (each mech)...
  AP_TURN: 0,           // ...then this many AP per extra change of facing. r17-s4 (Jamie: "now we are a smaller man sized unit, facings shouldnt cost AP at all"): 1 → 0, both sides
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
  // RADAR_RANGE (18 tiles), RADAR_HALF_ANG (50°): R18 moved to the radar's row (src/sim/items.ts, radar.range / halfAng)
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
  TRI_BLEND: 0.5,       // how far each new triangulated fix pulls the contact (0..1). R18 fix list 10: the floor; with trust the pull rises to 1
  TRI_TRUST_N: 4,       // R18 fix list 10 (Jamie: "that many EM signals … should trump the noise … a weighting"): bearings taken from this many
                        // different spots (1+ tile apart) on one unit = full trust in their best-fit crossing...
  TAG_KEEP: 6,          // R18 (Jamie: stack the sense tags): seconds of sim time a sense's tag stays on a contact after its last fix
  TRI_TRUST_ANG: 60,    // ...and only once the widest pair crosses at this many degrees or more (narrower = less trust).
                        // Trust pulls the contact onto the crossing and scales NOISE's error and floor down (0 trust = as before)
  // --- ECM ---
  ECM_MASK_MULT: 0.25,  // signature multiplier while masking
  SIG_JAM: 5,           // jamming emission (bearing only) while masking or a ghost is up
  GHOST_COST: 25,       // Energy to place a ghost (plus AP_ECM)
  GHOST_TURNS: 3,       // your turns a ghost lasts (was GHOST_TIME 25 s)
  // --- weapons (both sides) ---
  // AMMO_PER_SLOT (10): R18 gone with the slot picker; the gun's row sets rounds loaded (src/sim/items.ts, gun.rounds)
  SHOT_SPEED: 25,       // tiles/sec shell speed
  HIT_RADIUS: 0.6,      // tiles; target must be this close to the aim point when the shell lands
  SHOT_DAMAGE: 1,       // hits removed per shell
  ARMOUR_HITS: 3,       // hits added per armour plate
  GHOST_UNC: 2.5,       // tiles; how certain a ghost looks to the enemy
  // --- enemy ---
  ENEMY_SPAWN_MIN: 35,  // tiles; min spawn distance from the player
  // ENEMY_FIRE_RANGE (12 tiles): R18 moved to the gun's row (gun.range)
  ENEMY_BLIND_PULSE: 8, // seconds (÷ SEC_PER_TURN = turns) between radar pulses for an enemy with no passive suite
  ENEMY_INVEST_DIST: 10,// tiles along a bare bearing that it goes to check
  ENEMY_ACT_PAUSE: 0.4, // real seconds between the enemy's actions on its turn (readability)
  SEC_PER_TURN: 2,      // converts old per-second enemy timers (patience, timed pulses) into turns
  // --- shots (both sides) ---
  SHOTS_PER_TURN: 2,    // max shots per turn, each mech
  PLAYER_FIRE_UNC: 2,   // tiles; the player can only shoot contacts at least this certain
  // PLAYER_FIRE_RANGE (12 tiles): R18 moved to the gun's row (gun.range, both sides)
  // --- Round 4: I-go-you-go, action points + Energy (both mechs, same rules) ---
  AP_PER_TURN: 4,       // AP gained at the start of your own turn
  AP_BANK_MAX: 8,       // unspent AP carries over, up to this
  AP_SHOT: 1,           // AP per shot
  // AP_RADAR (2): R18 moved to the radar's row (radar.ap)
  AP_ECM: 1,            // AP to switch ECM on, and again at the start of each of your turns while on (also the ghost)
  ENERGY_BASE: 100,     // base Energy pool (was POWER_BASE)
  // ENERGY_CELL (50): R18 a battery row's pool (src/sim/items.ts)
  ENERGY_REGEN: 10,     // Energy regained at the start of your own turn. R18: field units only (no reactor rows yet); a suit's regen = its reactor output − idle draw
  // RADAR_EN (25): R18 moved to the radar's row (radar.en)
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
  // SIGNAL_RADAR (30, EMIT added per pulse): R18 moved to the radar's row (radar.emit)
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
    // SHOT (12) and MORTAR (14): R18 moved to the gun's / mortar's row (gun.snd, mortar.snd). A variant's SOUND.SHOT still overrides
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
  PAY_MULT: 1.25,        // R22 headless 3 (Jamie: go): 1 → 1.25. every hunt's pay (win, kills, bounties, the escort bonus) × this
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
    sniper: 70,  // R18: core 1, 12 rds, but hits from 20 tiles
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
  ESCORT_HOLDS: 3,         // R16 (Jamie): HOLD orders per Escort hunt: the transport skips its next move (one round), then carries on
  ESCORT_HURRIES: 3,       // R16 (Jamie): HURRY orders per Escort hunt: its next move is a sprint (ESCORT_SPRINT tiles, SPRINT speed and sound)
  ESCORT_SPRINT: 12,       // tiles the transport covers on a HURRY move (ESCORT_MOVE is the normal walk)
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
  // --- R17: drawn routes ("Eyes on the street") ---
  DRAW_PATH_ENABLED: true, // drag from your selected ExoS to draw this turn's path (false = tap-to-move only)
  FACE_WAYPOINTS_MAX: 3,   // facing waypoints per drawn move (tap the path, drag to aim). Each is one change of facing: FREE_TURNS first, then AP_TURN
  MOVE_INTERRUPT: true,    // a player move stops on the tile where it reveals something new (new contact, or eyes on a known one); unspent AP / EN kept
  DRAW_GRAB_PX: 26,        // screen radius around your ExoS that starts a drawn path (a tap there still arms a face change)
  DRAW_END_GRAB_PX: 34,    // r17-s2: screen radius of the handle at the drawn path's end: drag it to carry the path on
  WAYPOINT_GRAB_PX: 22,    // screen distance from the drawn path that counts as on it: tap = LOOK / ✕ menu, drag = redraw from there
  DRAW_SIMPLIFY: 0.25,     // r17-s2: tiles; a freehand stroke's wobbles smaller than this are straightened (never round clutter you drew through)
  DRAW_SAMPLE: 0.35,       // r17-s2: tiles between the stroke points the view keeps
  INTERRUPT_CUE_TIME: 2.5, // seconds the "CONTACT — move stopped" cue stays on the suit
  ESCORT_FORKS: 2,         // forks on a block map's escort route (each with 2-3 onward legs: NORTH / AHEAD / SOUTH, open streets only)
  // R16 debrief 2 (Jamie: "still feels too much like a grid"): packed districts of irregular shapes (sim/packed.ts)
  MAP_LAYOUT: 'packed',    // 'packed' = shapes packed on half-block cells, cropped at the map edge; 'grid' = the r16-s3 block grid
  MAP_EDGE_CROP: true,     // the packing is offset by a random part of a cell and cut off at the map edge (false = seams line up with the edges)
  SHAPE_WEIGHTS: { '1x1': 2, '1x2': 3, '1x3': 2, 'L3': 3, 'L4': 2, '2x2': 3, '2x3': 1 }, // pick weights (in half-block cells); 2x2 = a hand-drawn block
  SPAWN_APRON: { W: 4, H: 9 }, // R16 (Jamie: spawning boxed in = boring rounds): a cleared staging area at the spawn, tiles deep × tall
  SPAWN_LOOK: 12,          // the spawn row is the left-edge row with the most street tiles within this many steps (mid-height breaks ties)
  STREET_KEEP: 0.6,        // chance each side of a piece keeps its street ring (else its buildings run to the edge: narrow or closed streets)
  LOT_CHANCE: 0.3,         // a 1x1 piece is an open lot (with a spot) instead of a building
  YARD_CHANCE: 0.4,        // a piece of 3+ cells gets a courtyard (a spot), joined to the street by an alley
  ALLEY_MAX: 2,            // up to this many one-tile alleys cut straight across a generated piece
  ESCORT_SHARED: 5,        // tiles; Escort legs may share this much at each end (leaving the fork, arriving) without counting as the same way
  ESCORT_LEG_SPREAD: 6,
  ESCORT_BACKTRACK: 4,     // tiles; an Escort leg may travel at most this far west in all (no loops back)
  ESCORT_DETOUR: 1.8,      // an Escort leg may be at most this × the shortest leg between the same places    // extra A* cost per tile on and next to an earlier Escort leg, so the next leg finds a different way
  SEAM_BLOCK_CHANCE: 0.35, // R16 debrief: each stretch of street between two crossings gets a blocker with this chance (0 = the open grid)
  SEAM_BLOCK_KINDS: { RUBBLE: 0.4, BARRICADE: 0.3, CHOKE: 0.3 }, // weights: scrap across the street / a wall that shuts it / a wall over one lane
  FIELD_SHUFFLE: 1,   // R8 (Jamie): 1 = shuffled set: every composition once per cycle, random order (view keeps the bag); 0 = seeded weighted roll
  // R18 checkpoint 3: THERMAL 1 = it carries a thermal sight (turrets: they wait and watch); IR = its steady heat on top of its
  // frame's size (emplacements run generators, patrols engines; turrets sit cold).
  // R18: FRAME = its frame in src/sim/items.ts; the unit's fit is built from FRAME + the numbers below (kit.ts fieldFit).
  // Per type. ARMOUR plates (signature as SIG_ARMOUR; hits = BASE_HITS + ARMOUR × ARMOUR_HITS), AMMO rounds,
  // CELLS energy cells (+ENERGY_CELL each), MOBILE 0 = never moves, RADAR/PASSIVE 0|1,
  // FIRE_UNC tiles (fires only at contacts at least this certain), NAME / PLURAL for INTEL and the result screen.
  // PATROL also takes the brain values the old bot used (copied from CAUTIOUS; see ROUND 7 ASSUMPTIONS):
  // PATIENCE_MIN/MAX s, CONFIDENT tiles, HOLD_DIST tiles, LEASH tiles (= GUARD_RADIUS × 1.5).
  FIELD_TYPES: {
    TURRET:      { FRAME: 'f_turret', THERMAL: 1, IR: 0, NAME: 'turret',      PLURAL: 'turrets',      ARMOUR: 1, BASE_HITS: 0, AMMO: 20, CELLS: 0, MOBILE: 0, RADAR: 0, PASSIVE: 1, FIRE_UNC: 1.2 }, // hidden: silent until it fires; firm lock only (= PATIENT)
    EMPLACEMENT: { FRAME: 'f_empl', THERMAL: 0, IR: 4, NAME: 'emplacement', PLURAL: 'emplacements', ARMOUR: 2, BASE_HITS: 0, AMMO: 20, CELLS: 1, MOBILE: 0, RADAR: 1, PASSIVE: 0, FIRE_UNC: 2 },   // pulses radar on a timer, so it's findable
    PATROL:      { FRAME: 'f_patrol', THERMAL: 0, IR: 2, NAME: 'patrol',      PLURAL: 'patrols',      ARMOUR: 1, BASE_HITS: 0, AMMO: 20, CELLS: 0, MOBILE: 1, RADAR: 0, PASSIVE: 1, FIRE_UNC: 2,
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
    // R18 (Jamie: "Add a sniper turret variant that can hit further"): a Long gun (src/sim/items.ts): range 20, loses only
    // 1% a tile past HIT_RANGE_FREE, a loud crack. Firm lock only, so beyond eye range it needs its thermal sight (a hot suit).
    sniper: { TYPE: 'TURRET', COMMS: 0, PULSE: 0, SOUND: {},
              STATS: { GUN: 'longgun', AMMO: 12, FIRE_UNC: 1.2 },
              TRAITS: ['EMIT none · still', 'shot 16'], TELL: 'very loud shot, from far off', FIGHT: 'core 1 · 12 rds · hits out to 20 tiles' },
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
  // MORTAR_SHELLS (6), AP_MORTAR (2): R18 moved to the mortar's row (mortar.shells / ap)
  MORTAR_PER_ACTIVATION: 1, // max mortar shots per activation
  MORTAR_MAX_UNC: 4,        // tiles; the target contact must be at least this certain ("FUZZY" otherwise)
  // MORTAR_MIN_RANGE (4), MORTAR_MAX_RANGE (18), MORTAR_SCATTER_BASE (0.5), MORTAR_SCATTER_PER_UNC (0.6): R18 moved to the mortar's
  // row (mortar.min / max / scatter / perUnc). Scatter radius = scatter + contact uncertainty (tiles) × perUnc; the impact lands at a
  // seeded random point inside that circle around the fix centre
  MORTAR_SPLASH: 1,         // tiles; every unit (yours too) within this of the impact is damaged
  MORTAR_DMG: 1,            // armour plates of damage per splash (× ARMOUR_HITS = hits)
  SIG_MORTAR: 30,           // UNUSED from R13 (a mortar launch is Sound now: SOUND_RANGE.MORTAR). Was: Signal added to the firing mech per shot
  MORTAR_BLIND_UNC: 6,      // R9 run1: tiles; a blind lob (tapped map spot, no fix) scatters as if the fix were this fuzzy (≈4.1-tile circle). R18: the most it can be (long range)
  MORTAR_BLIND_UNC_PER_TILE: 0.25, // R18 fix list 12 (Jamie: "Blind lob is too inaccurate … needs to be less punishing"): the pretend fuzz = this × the range
  MORTAR_BLIND_UNC_MIN: 1.5,       // (tiles), never below this, never above MORTAR_BLIND_UNC. 7 tiles ≈ a 1.6-tile circle (was 4.1), 18 tiles ≈ 3.2
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
  // HIT_BASE (75 %, before modifiers): R18 moved to the gun's row (gun.hit)
  HIT_MIN: 10,            // % floor
  HIT_MAX: 95,            // % ceiling
  HIT_SIG_MAX: 15,        // + this × target's EFFECTIVE Signal / SIGNAL_MAX (after QUIET): loud targets are easier to hit
  HIT_RANGE_FREE: 4,      // tiles of range with no penalty...
  HIT_RANGE_PER_TILE: 3,  // ...then − this % per tile beyond it
  HIT_MOVED_PER_TILE: 4,  // − this % per tile the target moved in its LAST activation (statics always 0)...
  HIT_MOVED_MAX: 24,      // ...up to this much
  HIT_COVER: 25,          // − this % if the target is in cover:
  HIT_COVER_LOW: 15,      // R17 (Jamie, parked #62): − this % instead when only ground clutter (scrap / rubble) covers it ("low cover"); walls and set pieces stay HIT_COVER
  COVER_GRAZE: 0.3,       // ...the shot line passes closer than this (tiles) to a wall tile (last 0.5 tile ignored). R12 run: 0.5 → 0.3
  COVER_ADJ: 0.75,        // R16 (Jamie): tiles; a shooter this close to the same piece of cover as its target ignores that cover (lean out and shoot)...
  COVER_ITEM_RADIUS: 3,   // ...a 'piece' = the grazed wall / clutter tile and everything joined to it within this many tiles
  COVER_RANGE: 1.0,       // ...that is within this many tiles of the target. R12 run: 1.5 → 1.0 (walls beside a turret counted)
  // Hit locations. Parts per unit kind; a hit picks one by PART_WEIGHTS (renormalised over the unit's parts).
  // Each unit's hit pool (base hits + armour plates × ARMOUR_HITS) is split across its parts by PART_SHARE
  // (largest remainder, every part at least 1 hit; see ROUND 12 ASSUMPTIONS). A hit on a destroyed part spills to CORE.
  // CORE gone = unit destroyed. SENSORS gone = no radar / ECM / ghost, eyes × PART_SENSORS_EYES_MULT (passive still works).
  // WEAPON gone = the gun can't FIRE ("WPN"; mortar unaffected). LEGS gone = CREEP only ("LEGS").
  PARTS: {
    // R18 (A4): each part is a location of the fit (SENSORS = MAST, WEAPON = ARMS, CORE, LEGS, BACK). BACK is new: only a shot
    // from behind can hit it (REAR_ARC), and it takes the BACK's modules offline when it goes
    MECH:        ['SENSORS', 'WEAPON', 'LEGS', 'CORE', 'BACK'],
    PATROL:      ['SENSORS', 'WEAPON', 'LEGS', 'CORE', 'BACK'],
    TURRET:      ['SENSORS', 'WEAPON', 'CORE', 'BACK'],     // static: no legs
    EMPLACEMENT: ['SENSORS', 'WEAPON', 'CORE', 'BACK'],     // static: no legs
    ALLY:        ['CORE'],                          // R15 Escort: the transport is one hit pool
  },
  PART_WEIGHTS: { CORE: 40, LEGS: 25, WEAPON: 20, SENSORS: 15, BACK: 0 }, // chance a hit lands on each part. R18: BACK only from behind (it takes WEAPON's weight then)
  PART_SHARE:   { CORE: 0.5, LEGS: 0.2, WEAPON: 0.15, SENSORS: 0.15, BACK: 0 }, // R18: BACK takes no share; it gets its 1 hit on top of the pool (every part has at least 1)
   // how the hit pool is split (mech, 6 hits → CORE 3, LEGS 1, WEAPON 1, SENSORS 1)
  PART_SENSORS_EYES_MULT: 0.5, // eyes range × this once SENSORS are gone
  // --- Round 18: fit for the job (suit building). Rows in src/sim/items.ts, rules in src/sim/fit.ts + kit.ts ---
  REAR_ARC: true,          // A5: a gun shot from outside the target's front arc rolls BACK in place of WEAPON (ARMS). Both sides
  FRONT_ARC_HALF: 90,      // degrees either side of the target's facing that count as its front (90 = the front half)
  OVERLOAD_SND_PER_PT: 1,  // A7: + this Sound (tiles) on every move per load point over the frame's rated load (toy placeholder)
  OVERLOAD_EN_PER_TILE: 0.5, // R18 debrief 1 (Jamie: weight "should carry not only sound, but also … more energy cost to move, even creep"): + this Energy per tile moved, per load point over rated, every mode (was 0)
  OVERLOAD_AP_FRAC: 0.5,   // A7: past this fraction of the way from rated to max load, every move costs +1 AP (toy placeholder)
  SIG_EM_PER_PT: 0.5,      // A8: standing EM signature per point of the fit's always-on EM emit + EM visibility (Warden 3 → 1.5 = the R17 default)
  HANGAR_FRAMES: ['wisp', 'warden', 'bulwark'], // A10: the cheap-test set, the only things the in-game hangar offers (build-toy.html keeps them all)
  HANGAR_ITEMS: ['coldburn', 'hotcore', 'lamp', 'emarray', 'mask', 'ghost', 'autocannon', 'mortar', 'battery', 'm_cold', 'thermal', 'rwr'], // thermal optics only with THERMAL_ENABLED. R19 cp3: + the RWR
  HANGAR_PLATES: ['p_steel'],
  // --- R18 checkpoint 3: THERMAL (IR). Heat = a steady part (reactor IR emit + frame size) + heat that builds and cools ---
  THERMAL_ENABLED: true,   // B1/B2 master switch: false = no heat is read by anyone and thermal optics leaves the hangar (checkpoint 2 on its own)
  IR_FIRE: 3,              // heat added per gun shot or mortar lob (both sides)
  IR_SPRINT: 2,            // heat added per sprint move
  IR_COOL_PER_TURN: 2,     // heat lost at the start of each of the unit's own turns (heat persists, unlike Sound)
  IR_TILES_PER_PT: 2.5,    // a thermal sight sees a target in line of sight (and its facing cone, like eyes) out to this × the target's IR...
  IR_RANGE: 20,            // ...but never further than this (tiles)
  IR_UNC: 1.0,             // tiles; uncertainty of a thermal fix (a heat blob: good enough to shoot at, but it doesn't show the variant)
  IR_SIZE_PER_VIS: 1,      // a suit's steady IR from its size: × the frame's VIS visibility (Wisp 1, Warden 3, Bulwark 5)
  // --- Round 19: listen before you land. The ship's pre-drop scan (src/sim/scan.ts): one listen dial, 0 SKIP / 1 SHORT /
  // 2 MEDIUM / 3 LONG. Each step reveals everything below it plus: SHORT the field roster (types, variants, counts) and zone
  // outlines; MEDIUM zone types and a choice of drop zones; LONG contact blips (emitters only: a silent unit gives the ship nothing) ---
  SCAN_ENABLED: true,      // false = the R18 flow (no scan screen, one spawn, zones always drawn, the hangar before the contract)
  SCAN_BLIP_UNC: 3,        // tiles; a LONG blip's fuzz (its circle; the centre is off the true spot by up to 0.7 × this)
  SCAN_BLIP_KEEP: 30,      // seconds of sim time a blip lingers in the hunt as a stale contact, on top of CONTACT_LINGER
  SCAN_DRIFT: 4,           // tiles; between the scan and the drop each patrol walks to a random reachable tile this close (blips go stale)
  SCAN_STILL_ACTS: 4,      // a LONG listen watches each emitter this many of its rounds (a static reads "still"; outlasts a 3-round pulse)
  DROP_ZONES: 3,           // drop zones offered at MEDIUM+ (west edge = the default spawn, then north and south edges; at most 3)
  // R19 checkpoint 2: the cost ladder. The longer the ship listens, the more it emits. Per listen step [SKIP, SHORT, MEDIUM, LONG];
  // rolled at the drop (seeded), never shown before you land. Starting guesses, tuned in the debrief.
  SCAN_ALERT_SHARE: [0, 0, 0.25, 0.5], // share of the field (rounded) that starts ALERT: a shared fix on your drop zone (the pack's
                           // alarm / converge logic on for this hunt, whatever PACK_ENABLED says); alert statics face the drop (dug in)
  SCAN_ALERT_UNC: 5,       // tiles; how fuzzy an alert unit's fix on your drop zone is (never a lock)
  SCAN_EXTRA_CHANCE: [0, 0.25, 0.35, 0.5], // each step up to the listen level rolls this chance of one extra starting unit (variant
                           // from all 10, placed like the field: far from your drop). LONG = up to 3 extra
  SCAN_PAINT_CHANCE: 0.5,  // at LONG, the chance the field reads where you'll land (the ship is painted)...
  SCAN_AMBUSH: 2,          // ...and then this many patrols wait toward your drop zone, alert...
  SCAN_AMBUSH_DIST: [6, 10], // ...this many tiles from where you land (min, max: outside the apron)
  DROP_X: { N: 0.35, S: 0.55 },
  // --- Round 20: eyes from the ship. The live scan (src/sim/livescan.ts): a clock you START / STOP, one sensor at a time,
  // an aim mark you drag; every unit, zone and drop zone gathers dwell per sensor and its bands reveal that sensor's layer.
  SCAN_MODE: 'active',     // 'active' = the R20 live scan; 'dial' = the R19 listen dial (SKIP / SHORT / MEDIUM / LONG)
  SCAN_TIME_RATE: 1,       // ship-minutes per real second while the scan runs
  // (R20 fix list 3, Jamie: "the clock time, should be infinite": no cap; time costs risk instead, see SCAN_LOUD)
  SCAN_TICK: 0.25,         // ship-minutes per sim step (the view sends commands; the sim steps; a seed + commands replay exactly)
  SCAN_SPEED: { RADAR: 3, THERMAL: 1.5, EM: 0.75 }, // dwell per ship-minute at full aim strength (radar fast, thermal medium, EM slow)
  SCAN_BANDS: { RADAR: [1, 3, 6], THERMAL: [1, 3, 6], EM: [1, 3, 6] }, // dwell needed for bands 1 / 2 / 3 of each sensor's layer
  SCAN_AIM_CORE: 4,        // tiles; full strength inside this radius of the aim mark...
  SCAN_AIM_EDGE: 10,       // ...fading linearly to zero at this radius
  SCAN_WIDE_STRENGTH: 0.25, // FULL MAP: that sensor covers the whole map at this flat strength (no ring)
  SCAN_DRIFT_PER_MIN: 0.5, // tiles a patrol walks per ship-minute while the ship scans (replaces SCAN_DRIFT in 'active')
  SCAN_DRIFT_LEASH: 8,     // tiles; a patrol's scan-time walk stays this close to where it started
  SCAN_DROP_DELAY: 2,      // ship-minutes between STOP and landing: patrols keep walking (even a last-second look is a little stale)
  SCAN_PING_UNC: [3, 2, 1], // tiles; a RADAR ping's fuzz at bands 1 / 2 / 3
  SCAN_HEAT_UNC: [3, 2, 1.5], // tiles; a THERMAL heat blob's fuzz at bands 1 / 2 / 3
  SCAN_HOT_IR: 4,          // THERMAL sees a unit whose IR is at least this (patrol 5, emplacement 7; turrets 3 stay cold)
  SCAN_IR_LARGE: 6,        // a heat blob at THERMAL band 2+ reads LARGE at this IR or more, else MEDIUM
  SCAN_BLIP_FLOOR: 1,      // tiles; an EM blip's fuzz shrinks from SCAN_BLIP_UNC (band 2) to this (band 3)
  // R20 fix list 5 (Jamie: "a ship height function … do a high mid low alts"): the ship's altitude changes every sensor.
  // RING scales both ring radii, SPEED multiplies dwell per sensor (full map too), UNC multiplies the fuzz of new fixes,
  // LOUD multiplies risk. HIGH sees wide but weak and fuzzy, and quietly; LOW sees a small spot hard and sharp, loudly
  // (thermal reads best low). MID = r20-s2.
  SCAN_ALT: {
    HIGH: { RING: 1.6, SPEED: { RADAR: 0.7, THERMAL: 0.4, EM: 0.8 }, UNC: 1.5, LOUD: 0.6 },
    MID:  { RING: 1,   SPEED: { RADAR: 1,   THERMAL: 1,   EM: 1 },   UNC: 1,   LOUD: 1 },
    LOW:  { RING: 0.6, SPEED: { RADAR: 1.4, THERMAL: 1.8, EM: 1.2 }, UNC: 0.7, LOUD: 1.6 },
  } as Record<string, { RING: number; SPEED: Record<string, number>; UNC: number; LOUD: number }>,
  SCAN_COSTS: true,        // R20 cp2: the risk meter's costs (false = scanning is free, as r20-s1)
  // R20 fix list 3 (with checkpoint 2): one risk meter. While the clock runs, every sensor that is on adds its loudness; with no
  // sensor on the meter cools. Crossing a step (upwards, the first time) may call in a unit; the step you DROP at sets the alert
  // share and the painted chance. Time also lets the field change: patrols walk, and now and then a unit arrives.
  SCAN_LOUD: { RADAR: 1, THERMAL: 0.2, EM: 0.05 }, // risk per ship-minute while that sensor is on (radar loud, thermal low, EM near zero)
  SCAN_COOL: 0.5,          // risk lost per ship-minute while the clock runs with every sensor off (waiting)
  SCAN_RISK_STEPS: [3, 6, 10], // risk at which steps 1, 2, 3 start...
  SCAN_RISK_MORE: 5,       // ...and past the last one, another step every this much risk (no ceiling: the threats keep coming)
  SCAN_RISK_EXTRA: [0, 0.35, 0.5, 0.5], // chance a unit is called in when the meter first reaches step k (the last value past the list)
  SCAN_RISK_ALERT: [0, 0.25, 0.5, 0.75], // share of the field awake at the drop, by the step you drop at (the dial's SCAN_ALERT_SHARE)
  SCAN_RISK_PAINT: [0, 0, 0.25, 0.5], // chance the ship is painted at the drop, by step (then SCAN_AMBUSH patrols wait near the drop zone)
  SCAN_ARRIVE_PER_MIN: 0.02, // chance per ship-minute on station that a new patrol arrives anyway (waiting isn't free)
  // R20 fix list 4 (Jamie: "some missions may have a time restraint"): some jobs give the ship a window; at the deadline the
  // scan ends and you drop. Scan screen only for now (the in-hunt mission clock is parked #85).
  SCAN_DEADLINE_CHANCE: 0.5, // share of jobs with a window (seeded per job)
  SCAN_DEADLINE_MIN: [8, 16], // ship-minutes of window (min, max)
  // R19 checkpoint 3: the RWR (src/sim/rwr.ts). A catalogue row ('rwr', S hardpoint, wt 1, draw 0), now in the hangar.
  RWR_ENABLED: true,       // false = no warnings (the row still fits but does nothing)
  RWR_BASELINE: true,      // R19 fix list 1 (Jamie: "All mechs have a baseline RWR, that shows only they been hit with radar"): every suit knows it was painted
                           // (which round; no bearing, band, type or ID). The 'rwr' module adds the full readout
  RWR_BEARING_ERR: 10,     // degrees, max random error on a warning's bearing (passive ESM is BEARING_ERR 3)
  RWR_BANDS: { CLOSE: [3, 6], MEDIUM: [9, 15], FAR: [15, 25] }, // tiles each range ring stands for; the band is a guess from strength
  RWR_REF_SIG: 16,         // the radar the RWR assumes it hears (≈ an emplacement mid-pulse): a louder one reads closer, walls read further
  RWR_LIFE: 3,             // rounds a warning lasts (fading) unless the same radar paints you again // where along the edge each extra apron is wanted (fraction of the width); the most open spot near it wins
  PART_MIN: { LEGS: 2 },       // R13 test 2 (Jamie): at least this many hits on a part (added on top of the pool): two legs
  LEGS_GONE_MULT: 0.5,         // R13 test 2: one leg gone = CREEP only; both gone = CREEP at this × distance per AP and speed
  // --- Round 21: the company (see sim/company.ts). Placeholder numbers to show the shape, not balanced ---
  COMPANY_MODE: true,          // R21: contracts run inside one saved company (operators, roster, books, ship). false = the R11 contract flow (runner default, old scenarios)
  START_SUITS: 3,               // R21 cp2: suits a new company starts with (each its own fit; a 4th has to be bought, cp3, and needs a bay, cp4)
  START_OPS: 4,                // R21 cp1: operators a new company starts with
  OP_CAP: 4,                   // R21 cp1: most operators on the roster (cp4: OPERATOR BERTHS +2)
  OP_SKILLS: ['AIM', 'QUIET', 'EARS', 'TECH'], // R21 cp1: one skill per operator, rolled from this list
  OP_SKILL_NAMES: { AIM: 'STEADY AIM', QUIET: 'QUIET MOVER', EARS: 'SHARP EARS', TECH: 'SENSOR TECH' },
  SKILL_AIM: [10, 15, 20],     // R21: STEADY AIM, + to-hit per level (1, 2, 3)
  SKILL_QUIET: [0.7, 0.6, 0.5], // R21: QUIET MOVER, × the suit's move sound (creep, walk, sprint; not shots) per level
  SKILL_EARS: [1.3, 1.45, 1.6], // R21: SHARP EARS, × how far this suit hears sounds per level
  SKILL_TECH: [1.5, 2, 2.5],   // R21: SENSOR TECH, × how fast watched rounds count toward an ID trait ("still", "no pulse") per level, while it's on the map
  OP_XP_HUNT: 1,               // R21: XP for each hunt an operator comes back from without going CRITICAL
  OP_XP_WIN: 1,                // R21: + this when that hunt was a win
  OP_LEVELS: [3, 7],           // R21: XP for level 2, then level 3 (the skill steps up; level 2+ = veteran)
  OP_BENCH: 2,                 // R21: contracts an operator sits out after being carried out CRITICAL
  OP_CARRY_RANGE: 1.5,         // R21: tiles; a lancemate that ends its turn this close to a CRITICAL suit carries its operator (adjacent, diagonals included)
  OP_MEMORIAL: 8,              // R21: KIA names kept on the memorial list
  RECRUITS_OFFERED: 2,         // R21: recruits on offer between contracts (level 1, random skill)
  COST_HIRE: 60,               // R21: credits to hire a recruit (cp1-2: free; cp3: the books)
  // --- R21 cp3: the books (credits, fuel, contracts on offer, wages, parts, the market). Placeholder numbers ---
  START_CREDITS: 300,          // R21 cp3: a new company's credits
  START_FUEL: 8,               // R21 cp3: a new company's fuel (jumps' worth). R22 headless (Jamie: go): 6 → 8 (companies last longer with recovery)
  FUEL_MAX: 10,                // R21 cp3: fuel the ship holds (cp4 FUEL TANKS + MOD_FUEL)
  START_PARTS: 6,              // R21 cp3: parts in the hold at the start
  CONTRACTS_OFFERED: 3,        // R21 cp3: contracts on offer between contracts
  CONTRACT_HUNTS_RANGE: [2, 4], // R21 cp3: a contract's length in hunts (inclusive)
  FUEL_PER_JUMP: [1, 4],       // R21 cp3: fuel to reach an offered contract (inclusive range)
  DANGER_NAMES: ['LOW', 'MEDIUM', 'HIGH'], // R21 cp3: an offer's danger, in words
  DANGER_FIELD: [0.75, 1, 1.35], // R21 cp3: × the field's unit counts per danger (rounded, at least 1 of each type it fields)
  CONTRACT_BONUS: 100,         // R22 headless 3 (Jamie: go): 0 → 100. a flat bonus on CONTRACT COMPLETE, on top of the fee
  CONTRACT_FEE: [60, 100, 160], // R21 cp3: fee per hunt of the contract, paid on CONTRACT COMPLETE, per danger
  CONTRACT_WIN_SHARE: 0.6,     // R21 cp3: hunt wins needed = ceil(hunts × this) (2 of 2, 2 of 3, 3 of 4)
  WAGE_OP: 30,                 // R21 cp3: credits per operator on the roster (benched too), paid when a contract ends
  WAGE_LEVEL_MULT: 0.5,        // R21 cp3: wage × (1 + this × (level − 1)): veterans cost more
  UPKEEP_SHIP: 60,             // R21 cp3: ship upkeep, paid when a contract ends
  DEBT_LIMIT: 300,             // R21 cp3: how far below 0 the company may go once; deeper, or still in debt a contract later = it folds
  PARTS_PER_REPAIR: 2,         // R21 cp3: parts per hit repaired (company mode; cp4 REPAIR BAY −MOD_REPAIR_PARTS)
  REPAIR_CR: 10,               // R21 cp3: credits per hit repaired, on top of the parts
  REBUILD_PARTS: 8,            // R21 cp3: parts to rebuild a destroyed suit (REPAIR BAY halves it)
  RECOVER_HELD: true,          // R22 (Jamie: "retrieve the suit from the field if we hold the field, cheaper to repair"): a suit downed in a hunt that held the field comes home recovered
  RECOVER_MULT: 0.5,           // R22: a recovered suit's rebuild costs this share of the parts and credits (rounded up)
  REBUILD_CR: 100,             // R21 cp3: credits to rebuild a destroyed suit
  HOLD_CAP: 16,                // R21 cp3: parts the hold carries (salvage and bought); cp4 SALVAGE HOLD + MOD_HOLD
  SALVAGE_PER_KILL: 2,         // R21 cp3: parts salvaged per field unit destroyed (into the hold, up to HOLD_CAP)
  PART_PRICE: 15,              // R21 cp3: market price per part
  PART_SELL: 8,                // R21 cp3: what the market pays per spare part (salvage)
  FUEL_PRICE: 30,              // R21 cp3: market price per fuel
  MARKET_STOCK: 6,             // R21 cp3: market lines (parts, fuel, then hangar items, and now and then an ExoS)
  MARKET_PARTS_QTY: 12,        // R21 cp3: parts on sale per market
  MARKET_FUEL_QTY: 8,          // R21 cp3: fuel on sale per market
  MARKET_SUIT_CHANCE: 0.35,    // R21 cp3: chance an ExoS (standard kit) is for sale
  COST_SUIT: 450,              // R21 cp3: an ExoS on the market (it comes with the standard kit; needs a free suit bay)
  // --- R21 cp4: the ship. One Courier-style hull ---
  SHIP_HARDPOINTS: 7,          // R21 cp4: module hardpoints (one module each)
  SHIP_BAYS_BUILT_IN: 2,       // R21 cp4: suits the hull carries with no SUIT BAY (each SUIT BAY carries one more)
  SHIP_START_MODS: ['SUIT_BAY'], // R21 cp4: fitted at the start, so the 3 starting suits fit
  MOD_SCAN_SPEED: 1.4,         // R21 cp4: RADAR ARRAY / THERMAL POD / EM SUITE: that sensor's SCAN_SPEED ×
  MOD_SCAN_LOUD: 0.6,          // R21 cp4: ...and its SCAN_LOUD ×
  MOD_QUIET_DROP: 0.5,         // R21 cp4: QUIET DROP RIG: the alert share at the drop ×
  MOD_REPAIR_PARTS: 1,         // R21 cp4: REPAIR BAY: parts per repair − this (and rebuilds take half the parts)
  MOD_BENCH: 1,                // R21 cp4: MEDBAY: bench − this (never below 1)
  MEDBAY_SAVE: 0.35,           // R21 cp4: MEDBAY: chance a CRITICAL operator left behind is pulled out by the ship anyway
  MOD_HOLD: 12,                // R21 cp4: SALVAGE HOLD: HOLD_CAP + this
  MOD_FUEL: 6,                 // R21 cp4: FUEL TANKS: FUEL_MAX + this
  MOD_ENGINES: 0.75,           // R21 cp4: EFFICIENT ENGINES: fuel per jump × (rounded up)
  MOD_BERTHS: 2,               // R21 cp4: OPERATOR BERTHS: OP_CAP + this
  SHIP_HIT_CHANCE: 0.5,        // R21 cp4: a painted ship takes a hull hit on this chance (HULL ARMOUR soaks one per contract)
  SHIP_HIT_COST: 80,           // R21 cp4: credits per hull hit, paid when the contract ends
  SHIP_MODULES: {              // R21 cp4: the ship shop (fixed list). Each is one hook into an existing rule. many = can fit more than one
    RADAR_ARRAY:  { name: 'RADAR ARRAY', section: 'Before the drop', price: 180, does: 'Scan: RADAR builds ×1.4 faster and is ×0.6 as loud' },
    THERMAL_POD:  { name: 'THERMAL POD', section: 'Before the drop', price: 160, does: 'Scan: THERMAL builds ×1.4 faster and is ×0.6 as loud' },
    EM_SUITE:     { name: 'EM SUITE', section: 'Before the drop', price: 160, does: 'Scan: EM LISTEN builds ×1.4 faster and is ×0.6 as loud' },
    QUIET_DROP:   { name: 'QUIET DROP RIG', section: 'Drop', price: 200, does: 'Half as much of the field wakes at the drop' },
    SUIT_BAY:     { name: 'EXOS BAY', section: 'Drop', price: 150, does: 'Carries one more ExoS (the hull carries 2)', many: true },
    REPAIR_BAY:   { name: 'REPAIR BAY', section: 'After the mission', price: 220, does: 'A repair takes one part fewer. A rebuild takes half the parts' },
    MEDBAY:       { name: 'MEDBAY', section: 'After the mission', price: 200, does: 'A BENCHED operator sits out 1 contract fewer. A CRITICAL operator left behind has a 35% chance to come back alive' },
    SALVAGE_HOLD: { name: 'SALVAGE HOLD', section: 'After the mission', price: 120, does: 'The hold carries 12 more parts' },
    ARMOURY:      { name: 'ARMOURY', section: 'After the mission', price: 140, does: 'Reloads (+10 rounds, +1 shell) cost 1 part instead of credits' },
    FUEL_TANKS:   { name: 'FUEL TANKS', section: 'Between missions', price: 120, does: 'Holds 6 more fuel' },
    ENGINES:      { name: 'EFFICIENT ENGINES', section: 'Between missions', price: 200, does: 'Fuel per jump ×0.75 (rounded up)' },
    HULL_ARMOUR:  { name: 'HULL ARMOUR', section: 'Between missions', price: 150, does: 'Soaks one hull hit per contract when the ship is painted' },
    BERTHS:       { name: 'OPERATOR BERTHS', section: 'Crew', price: 130, does: 'Room for 2 more operators' },
  },
  // --- Round 23: the city (sim/city.ts). A seeded node map of faction districts; contracts live in districts; standing per faction ---
  CITY_ENABLED: true,          // R23: the city map, factions and standing. false = the R22 offers (FUEL_PER_JUMP range, no factions)
  CITY_DISTRICTS: [6, 8],      // R23: districts per city (inclusive); each links to 2-3 neighbours
  CITY_FACTIONS: {             // R23: placeholder factions. danger = the base danger step (0 LOW .. 2 HIGH) of jobs against them
    CORP:    { name: 'Corporate', short: 'CORP', danger: 2, colour: '#6fc3ff' },
    FOUNDRY: { name: 'Foundry', short: 'FNDY', danger: 1, colour: '#ffb347' },
    SYND:    { name: 'Syndicate', short: 'SYND', danger: 0, colour: '#d08cff' },
  },
  CITY_FUEL_PER_LINK: 1,       // R23: fuel per link jumped on the way to a contract (offers are never in the ship's own district: 1+ links)
  CITY_BROKER_CHANCE: 0.34,    // R23: chance an offer is a broker job (deniable) instead of a faction job
  CITY_FACTION_PAY: 1.2,       // R23: a faction job's fee × this (someone wants their rival hit, and pays for it)
  CITY_BROKER_PAY: 0.8,        // R23: a broker job's fee × this (deniable: nobody gains, the target hurts less)
  STANDING_MIN: -100,          // R23: standing floor, per faction
  STANDING_MAX: 100,           // R23: standing ceiling
  STANDING_HATED: -30,         // R23: at or below this: HATED. Tuning 1 (Jamie: go): -40 → -30
  STANDING_LIKED: 30,          // R23: at or above this: LIKED (between: NEUTRAL). Tuning 1 (Jamie: go): 40 → 30
  STANDING_EMPLOYER_GAIN: 20,  // R23: a completed faction job: the employer's standing + this
  STANDING_TARGET_LOSS: 25,    // R23: a completed faction job: the target's standing − this
  STANDING_BROKER_LOSS: 10,    // R23: a completed broker job: the target's standing − this (nobody gains)
  STANDING_DRIFT: 2,           // R23: every contract's end, each faction's standing moves this much back toward 0 (a grudge fades). Tuning 1 (Jamie: go): 5 → 2
  CITY_RELATIONS: { RIVALS: { v: -1, w: 0.5 }, NEUTRAL: { v: 0, w: 0.3 }, ALLIES: { v: 1, w: 0.2 } }, // R23 tuning 1 (Jamie): each faction pair rolls one of these per city (w = weight)
  STANDING_SPILL: 0.5,         // R23 tuning 1 (Jamie: "becoming friendly with one faction means their enemies dislike you"): a standing change on one faction moves each other faction by change × this × their relation (rivals −1, allies +1)
  STANDING_HATED_ALERT: 0.25,  // R23: a job against a faction that hates you: + this share of its field awake at the drop (on top of the scan's). Tuning 3 tried 0.15: no help, reverted (Jamie)
  STANDING_HATED_FUEL_MULT: 1.5, // R23: fuel bought in a HATED faction's district costs FUEL_PRICE × this
  STANDING_HATED_DANGER: 1,    // R23: a HATED faction's jobs are this many danger steps higher (capped at HIGH)
  STANDING_LIKED_PAY: 1.25,    // R23 (#47): a LIKED faction's own jobs pay their fee × this
  STANDING_LIKED_INTEL: 'RADAR', // R23: a job against a LIKED faction's enemy: the scan opens with this layer at band 1 everywhere ('RADAR' pings, zone outlines and drop zones; 'EM' the emitter count; '' none)
  STANDING_LIKED_FUEL_MULT: 0.75, // R23: fuel bought in a LIKED faction's district costs FUEL_PRICE × this
  // --- Round 23 cp B: runner personalities (sim/personality.ts; the runner and the scripted lance only, never the game) ---
  // Each keeps its weights across both layers. Hunt: move (CREEP / NORMAL / SPRINT), scan (a runner scan preset: none / fast /
  // mixed), carry (chance per hunt it goes back for a CRITICAL lancemate), bailLost (Bounty: suits down before it cuts its
  // losses), push (Bounty: rounds it keeps hunting past the quota). Campaign: pick (its contract rule), reserve (fuel it keeps
  // after the jump, bought if it can).
  BOT_PERSONALITY: {
    cautious:   { move: 'CREEP',  scan: 'fast', carry: 1,   bailLost: 1, push: 0,  pick: 'cautious',   reserve: 3 },
    aggressive: { move: 'SPRINT', scan: 'none', carry: 0.5, bailLost: 3, push: 10, pick: 'aggressive', reserve: 0 },
    loyal:      { move: 'NORMAL', scan: 'none', carry: 0.5, bailLost: 1, push: 0,  pick: 'loyal',      reserve: 1 },
    mercenary:  { move: 'NORMAL', scan: 'none', carry: 0.5, bailLost: 1, push: 0,  pick: 'fee',        reserve: 0 },
  } as Record<string, { move: string; scan: string; carry: number; bailLost: number; push: number; pick: string; reserve: number }>,
  // --- Round 22: the after-action page (sim/aar.ts). The hunt records three kinds of events; the page shows the turning points ---
  AAR_MAX_MOMENTS: 6,          // R22: the most turning points WHAT HAPPENED lists (in turn order)
  AAR_WEIGHT_SEEN: 2,          // R22: a first detection (enemy on a suit or the lance on an enemy) as a turning point
  AAR_WEIGHT_ALARM: 3,         // R22: the field passing word (an alarm, a pack closing in)
  AAR_WEIGHT_PART: 3,          // R22: a part wrecked (legs, arms, mast, back) on either side
  AAR_WEIGHT_KILL: 4,          // R22: a field unit destroyed
  AAR_WEIGHT_DOWN: 6,          // R22: a suit down (its operator CRITICAL) or destroyed
  AAR_WEIGHT_CARRY: 5,         // R22: a CRITICAL operator picked up
  AAR_WEIGHT_KIA: 8,           // R22: an operator left behind (KIA)
  AAR_WEIGHT_OBJ: 5,           // R22: an objective swing (uplink started, cargo grabbed / dropped, a route picked, quota reached, a suit out)
  AAR_WEIGHT_ROUTE: 2,         // R22 tuning (Jamie: go): an Escort route picked (was AAR_WEIGHT_OBJ 5: two forks crowded out the fights)
  AAR_WEIGHT_OUT: 1,           // R22: a suit extracting (the hunt's end says how it ended; this is filler)
  AAR_ENEMY_FIRST: 1,          // R22: added to an enemy-side event's weight (the field's side is what you can't see during the hunt)
  AAR_REDACT_BEARING: 8,       // R22: compass points a redacted bearing is rounded to (8 = N, NE, E ...)
  AAR_COST_MAX: 7,             // R22: the most lines WHAT IT COST lists
  // --- Round 24: say what it means (display knobs only: no rule reads these) ---
  LONGPRESS_MS: 450,           // R24 A2: a still finger (or button) held this long opens the explain card; the press then does nothing else
  WARN_HITS_LEFT: 2,           // R24 A5 (C12): an ExoS with this many CORE hits left or fewer shows the low-hits mark and HUD line
  LASTKNOWN_ROUNDS: 3,         // R24 A5 (C15): rounds a "last seen" mark stays where a contact dropped off the picture
  HUD_COMPACT_H: 430,          // R24 B6 (C03): window height (CSS px) at or below which the HUD shrinks to one line (iPhone landscape); tap it for the full block
  CAM_SAFE_PAD: 10,            // R24 B7 (C07): px kept between the uncovered map area and the overlays round it
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
