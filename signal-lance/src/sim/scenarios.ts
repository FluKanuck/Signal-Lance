// Round 14 part 0: the test bed. Hand-placed scenarios that test ONE mechanic in minutes (contracts answer "is it fun?",
// a scenario answers "does it read?"). Data only, written by the agent from the round brief: no editor, no free spawn.
// A scenario plays as one hunt outside any contract, logs as [TESTBED <name>] and never counts toward contract stats.
import { TUNE } from '../tune.ts';
import { T, loadMap, HIVE } from './world.ts';
import { buildDistrict, type DistrictSpec } from './blocks.ts';
import { rollPacked } from './packed.ts';
import { setSeed } from './rng.ts';
import { G, newHunt, makeUnit, setActive, DEFAULT_LOAD } from './state.ts';
import { setZones, zoneAtTile } from './zones.ts';
import { syncHits } from './combat.ts';
import { makeAlly } from './escort.ts';

type Tile = [number, number];
export type Scenario = {
  name: string; round: number;
  tryThis: string;                       // one plain line: what Jamie should do
  seed: number;                          // RETRY replays it exactly
  uplink: Tile;
  lance: { load?: any; tile: Tile; face?: Tile; legsLost?: number; en?: number; lost?: boolean }[]; // [A, B]; face = a tile to face (default: the uplink); R16: lost = out before it starts (one suit)
  field: { type: string; variant?: string; tile: Tile; face?: Tile; state?: string }[];
  zones?: { type: 'QUIET' | 'NOISE'; x: number; y: number; name?: string }[];
  tune?: Record<string, any>;            // TUNE overrides for this scenario only (top-level keys); restored afterwards
  question?: { q: string; a: string[] }; // one tap question when it ends
  mission?: string;                      // R15: the mission type (default UPLINK)
  ally?: string;                         // R15 Escort: the route node the transport starts on (default the start; a fork = holding)
  earned?: number | 'quota';             // R15 Bounty: credits already banked at the start ('quota' = exactly BOUNTY_QUOTA)
  map?: DistrictSpec;                    // R16: a fixed block district (no roll); none = the hive map
  packed?: { seed: number; grid: string }; // R17 (parked #65): a packed district rolled from this seed and grid (the same map every time)
};

// R16 test-bed districts (fixed: no roll, no rotation). cells are row-major block names.
const district = (cols: number, rows: number, cells: string[], mods: [number, number][], forks: number[], paint?: any[]) =>
  ({ cols, rows, cells: cells.map(b => ({ b, rot: 0, mir: false })), mods, forks, paint });

// R17: all three on one packed 4×2 district (seed 1701). Its long east-west street is row 13; alleys leave it north at
// column 24 and south at columns 18 and 36.
const D1701 = { seed: 1701, grid: '4x2' };
export const SCENARIOS: Scenario[] = [
  // ---- Round 17 (eyes on the street). Pack off. ----
  {
    name: 'Side street', round: 17, seed: 1701, mission: 'UPLINK', packed: D1701,
    tryThis: 'Walk the long street east to the uplink. You pass two alley mouths: one to the south, one to the north. A turret waits down one of them, out of your eyes while you face along the street. Drag from your ExoS to draw the move, then tap the path and drag to aim your eyes down an alley as you pass it.',
    uplink: [41, 13],
    lance: [{ tile: [13, 13], face: [41, 13] }, { tile: [12, 12], face: [41, 13] }],
    field: [{ type: 'TURRET', variant: 'sentry', tile: [24, 4], face: [24, 13] }],
    question: { q: 'Did you aim down the alley before you passed it?', a: ['Yes, and it found the turret', 'Yes, but the other alley', 'No, walked straight past', 'It shot me first'] },
  },
  {
    name: 'Trip wire', round: 17, seed: 1702, mission: 'UPLINK', packed: D1701,
    tryThis: 'Go north up the alley, then east along the street to the uplink. A patrol stands in the street round the corner. When it comes into view your move stops on that tile and you keep the AP you didn’t spend. Shoot, back off or draw again.',
    uplink: [41, 13],
    lance: [{ tile: [18, 17], face: [18, 13] }, { tile: [18, 18], face: [18, 13] }],
    field: [{ type: 'PATROL', variant: 'line', tile: [29, 13], face: [18, 13], state: 'PATROL' }],
    question: { q: 'When the move stopped, did you have what you needed to react?', a: ['Yes, enough AP to act', 'Yes, but no good option', 'No, it stopped too late', 'It never stopped'] },
  },
  {
    name: 'Scrap line', round: 17, seed: 1703, mission: 'UPLINK', packed: D1701,
    tryThis: 'Two turrets have eyes on you: one up the alley to the north behind a wall corner, one to the south behind scrap. Scrap is low cover (−' + TUNE.HIT_COVER_LOW + '%), a wall is full cover (−' + TUNE.HIT_COVER + '%). Select each one and read the odds line before you pick who to shoot first.',
    uplink: [41, 13],
    lance: [{ tile: [25, 15], face: [24, 9] }, { tile: [25, 16], face: [24, 22] }],
    field: [
      { type: 'TURRET', variant: 'gun', tile: [24, 9], face: [25, 15] },
      { type: 'TURRET', variant: 'gun', tile: [24, 22], face: [25, 16] },
    ],
    question: { q: 'Did low cover change who you shot first?', a: ['Yes, shot the scrap one first', 'No, shot the wall one first', 'No, shot the closer one', 'Didn’t notice the cover'] },
  },
  // ---- Round 16 (rolled ground). Pack off. ----
  {
    name: 'Long way round', round: 16, seed: 1601, mission: 'RETRIEVE',
    tryThis: 'Cargo up the street to the east. The short way crunches through scrap at the yard gate, and a patrol listens in the yard. The long way (through the plaza, or the top street) is clean. Pick a way, PICK UP, carry it out the right edge.',
    map: district(4, 2, ['towers', 'yard', 'alleys', 'depot', 'warren', 'plaza', 'towers', 'lot'], [[1, 3]], [1, 1]),
    uplink: [30, 11], // the cargo tile
    lance: [{ tile: [2, 12], face: [30, 12], load: { mortar: 1 } }, { tile: [2, 11], face: [30, 11] }],
    field: [{ type: 'PATROL', variant: 'line', tile: [19, 6], state: 'PATROL' }],
    question: { q: 'Did the clutter change your route?', a: ['Yes, went the long way', 'Yes, crunched through on purpose', 'No, didn’t notice it', 'No, not worth going round'] },
  },
  {
    name: 'Two districts: strip', round: 16, seed: 1611, mission: 'ESCORT', ally: 'J1',
    tryThis: 'A long 6×2 district. The transport waits at the west fork. NORTH runs the top street past a kiosk that blocks the view; SOUTH runs the bottom street. Read the map, then tap a route. Then try Two districts: square.',
    map: district(6, 2, ['towers', 'alleys', 'plaza', 'warren', 'alleys', 'depot', 'lot', 'towers', 'yard', 'avenue', 'warren', 'towers'], [[2, 1]], [1, 1]),
    uplink: [24, 12],
    lance: [{ tile: [23, 11], load: { mortar: 1 } }, { tile: [22, 12] }],
    field: [{ type: 'TURRET', variant: 'sentry', tile: [31, 2], face: [31, 0] }],
    question: { q: 'Did the map shape change your leg call?', a: ['Yes, avoided the blind corner', 'Yes, went to clear it first', 'No, picked on gut', 'Didn’t notice it'] },
  },
  {
    name: 'Two districts: square', round: 16, seed: 1612, mission: 'ESCORT', ally: 'J1',
    tryThis: 'The same fork on a square 3×3 district: NORTH runs the top street past the kiosk, SOUTH runs the seam street through the middle of the map. Read the map, then tap a route.',
    map: district(3, 3, ['towers', 'plaza', 'alleys', 'warren', 'yard', 'depot', 'alleys', 'towers', 'lot'], [[1, 1]], [1, 1]),
    uplink: [12, 12],
    lance: [{ tile: [11, 11], load: { mortar: 1 } }, { tile: [10, 12] }],
    field: [{ type: 'TURRET', variant: 'sentry', tile: [19, 2], face: [19, 0] }],
    question: { q: 'Did the map shape change your leg call?', a: ['Yes, avoided the blind corner', 'Yes, went to clear it first', 'No, picked on gut', 'Didn’t notice it'] },
  },
  {
    name: 'Crunch', round: 16, seed: 1621, mission: 'UPLINK',
    tryThis: 'One suit. Scrap lies across the street between you and the uplink. A sentry in the lot to the north faces away, but it is in earshot of the scrap. Crunch through fast, creep through, or go round to the south.',
    map: district(3, 2, ['alleys', 'lot', 'depot', 'plaza', 'towers', 'warren'], [[1, 1]], [1], [{ x: 19, y: 11, w: 3, h: 2, ch: ',' }]),
    uplink: [27, 11],
    lance: [{ tile: [10, 12], face: [27, 11], load: { mortar: 1 } }, { tile: [9, 12], lost: true }],
    field: [{ type: 'TURRET', variant: 'sentry', tile: [24, 5], face: [24, 0] }],
    question: { q: 'Did crossing the clutter feel like a real cost?', a: ['Yes, it heard me and turned', 'Yes, too slow', 'No, went round', 'No, it cost nothing'] },
  },
  // ---- Round 15 step 3 (Escort). Pack off. ----
  {
    name: 'Fork', round: 15, seed: 1521, mission: 'ESCORT', ally: 'J1',
    tryThis: 'The transport waits at the west fork. One route is clean; on the other, a gun turret sits behind the blocks, and its steady radio carries to the fork. Listen first, then tap a route.',
    uplink: [8, 11],
    lance: [{ tile: [7, 12], load: { mortar: 1 } }, { tile: [9, 12] }],
    field: [{ type: 'TURRET', variant: 'gun', tile: [15, 7], face: [8, 7] }],
    question: { q: 'Did what you heard decide the route?', a: ['Yes, avoided it', 'Yes, went to kill it', 'No, guessed', 'Heard nothing'] },
  },
  {
    name: 'Shadow', round: 15, seed: 1522, mission: 'ESCORT', ally: 'J2',
    tryThis: 'The transport waits at the centre fork. A patrol drifts between the north and south routes. Track it, and send the transport down whichever route it has just left.',
    uplink: [40, 11],
    lance: [{ tile: [39, 11], load: { mortar: 1 } }, { tile: [38, 11] }],
    field: [{ type: 'PATROL', variant: 'line', tile: [44, 14], state: 'PATROL' }],
    question: { q: 'Did you time the call on the patrol?', a: ['Yes, it worked', 'Yes, it caught us anyway', 'No, just picked one'] },
  },
  // ---- Round 15 step 2 (Retrieve). Pack off until the cargo moves (then it's on for the hunt). ----
  {
    name: 'Grab and go', round: 15, seed: 1511, mission: 'RETRIEVE',
    tryThis: 'Cargo in the west plaza, guarded by one turret. A patrol walks the blocks to the east. Scout the guard, then PICK UP and watch what the field does. Carry it out the right edge.',
    uplink: [27, 13], // the cargo tile
    lance: [{ tile: [20, 16], load: { mortar: 1 } }, { tile: [19, 16] }],
    field: [
      { type: 'TURRET', variant: 'sentry', tile: [31, 13], face: [27, 13] },
      { type: 'PATROL', variant: 'line', tile: [36, 11], state: 'PATROL' },
    ],
    question: { q: 'When you grabbed it, the field…', a: ['Turned on me, felt fair', 'Turned on me, felt unfair', 'Barely reacted', 'Never grabbed it'] },
  },
  {
    name: 'Hot potato', round: 15, seed: 1512, mission: 'RETRIEVE',
    tryThis: 'You start on the cargo at the centre crossing, inside a heavy guard: a gun turret, a heavy patrol and an emplacement. Grab it and run. When the carrier gets hurt, HAND OFF to the other mech.',
    uplink: [45, 14],
    lance: [{ tile: [44, 14], load: { mortar: 1 } }, { tile: [45, 15] }],
    field: [
      { type: 'TURRET', variant: 'gun', tile: [50, 11], face: [45, 14] },
      { type: 'PATROL', variant: 'heavy', tile: [41, 16], state: 'PATROL' },
      { type: 'EMPLACEMENT', variant: 'search', tile: [50, 16], face: [45, 14] },
    ],
    question: { q: 'Did you hand off?', a: ['Yes, it saved the cargo', 'Yes, didn’t help', 'No, didn’t need to', 'No, never thought to'] },
  },
  // ---- Round 15 step 1 (Bounty). Pack off. ----
  {
    name: 'Price list', round: 15, seed: 1501, mission: 'BOUNTY',
    tryThis: 'Bounty, quota 50 here. North: a heavy patrol (80 cr). South: two scouts (25 each). Either route makes the quota. Listen, pick one, then extract.',
    uplink: [37, 11], // the field's leash point (no uplink in a Bounty job)
    lance: [{ tile: [36, 16], load: { mortar: 1 } }, { tile: [35, 16] }],
    field: [
      { type: 'PATROL', variant: 'heavy', tile: [38, 7], state: 'PATROL' },
      { type: 'PATROL', variant: 'scout', tile: [29, 22], state: 'PATROL' },
      { type: 'PATROL', variant: 'scout', tile: [44, 22], state: 'PATROL' },
    ],
    tune: { BOUNTY_QUOTA: 50 },
    question: { q: 'Did the bounty change who you went after?', a: ['Yes, went for the big one', 'Yes, took the cheap safe ones', 'No, fought what came'] },
  },
  {
    name: 'One more?', round: 15, seed: 1502, mission: 'BOUNTY',
    tryThis: 'Bounty: you are already at quota, 5 tiles from extraction. Behind the blocks to the west, an emplacement pulses: 60 cr more. Extract now, or push?',
    uplink: [56, 13],
    lance: [{ tile: [64, 16], face: [56, 13], load: { mortar: 1 } }, { tile: [65, 16], face: [56, 13] }],
    field: [{ type: 'EMPLACEMENT', variant: 'search', tile: [56, 13], face: [64, 16] }],
    earned: 'quota',
    question: { q: 'Extract or push? Did it feel like a real choice?', a: ['Pushed, worth it', 'Pushed, regretted it', 'Extracted, easy call', 'Extracted, but tempted'] },
  },
  // ---- Round 14 (read the signature). Pack off. ----
  {
    name: 'Look-alikes', round: 14, seed: 1401,
    tryThis: 'Two contacts behind the blocks to the north, both with a small radio (EMIT low). One is a scout patrol, one a gun turret. Wait a round for the tell, ID both from the CARD, then go.',
    uplink: [45, 14],
    lance: [{ tile: [36, 16], face: [36, 5] }, { tile: [35, 16], face: [36, 5] }],
    field: [
      { type: 'PATROL', variant: 'scout', tile: [36, 8], state: 'PATROL' },
      { type: 'TURRET', variant: 'gun', tile: [42, 6] },
    ],
    question: { q: 'Before you saw them, did you…', a: ['Wait for the tell', 'Guess', 'Ignore the card'] },
  },
  {
    name: 'Quiet gun', round: 14, seed: 1402,
    tryThis: 'Something guards the street to the uplink. Before you cross, creep and listen: cross its bearings and watch it a few rounds. ID it, then pick how to cross.',
    uplink: [38, 22],
    lance: [{ tile: [20, 16] }, { tile: [19, 16] }],
    field: [{ type: 'TURRET', variant: 'gun', tile: [30, 22], face: [22, 22] }],
    question: { q: 'Did a right or wrong ID change what you did next?', a: ['Yes, right call helped', 'Yes, wrong call cost me', 'No'] },
  },
  {
    name: 'Twin pulse', round: 14, seed: 1403,
    tryThis: 'Two emplacements pulse radar behind the blocks. Cross their bearings, ID them from the pulse rhythm, then MORTAR the frozen track before you ever see them (A has the mortar).',
    uplink: [61, 19],
    lance: [{ tile: [48, 22], load: { mortar: 1 } }, { tile: [47, 22] }],
    field: [
      { type: 'EMPLACEMENT', variant: 'search', tile: [46, 10] },
      { type: 'EMPLACEMENT', variant: 'relay', tile: [52, 11] },
    ],
    question: { q: 'Did the ID let you lob before eyes?', a: ['Yes, it hit', 'Yes, it missed', 'No, couldn’t line it up', 'Didn’t try'] },
  },
  // ---- Round 13 (the pack). Both with PACK_ENABLED. ----
  {
    name: 'Earshot', round: 13, seed: 1301,
    tryThis: 'Two patrols are just out of earshot behind the block. Sprint to the uplink. Then RETRY and creep.',
    uplink: [27, 13],
    lance: [{ tile: [17, 16] }, { tile: [16, 16] }],
    field: [ // both just outside SPRINT sound (7) of the start, inside 12, with buildings between them and the route
      { type: 'PATROL', tile: [21, 8], state: 'LEASH' },
      { type: 'PATROL', tile: [24, 20], state: 'LEASH' },
    ],
    tune: { PACK_ENABLED: true },
    question: { q: 'Did being loud cost you something you could point at?', a: ['Yes, they came', 'A little', 'No', 'Didn’t sprint'] },
  },
  {
    name: 'Wounded', round: 13, seed: 1302,
    tryThis: 'A has lost a leg (CREEP only). Three patrols are around you. Get both mechs out alive, or uplink.',
    uplink: [27, 13],
    lance: [{ tile: [12, 7], legsLost: 1 }, { tile: [11, 7] }],
    field: [
      { type: 'PATROL', tile: [24, 7], state: 'PATROL' },
      { type: 'PATROL', tile: [8, 16], state: 'PATROL' },
      { type: 'PATROL', tile: [16, 0], state: 'PATROL' },
    ],
    tune: { PACK_ENABLED: true },
    question: { q: 'Did the hurt mech feel hunted?', a: ['Hunted, fair (heard them coming)', 'Dogpiled', 'Not really'] },
  },
];

// Current round first, then older rounds (newest first). Stable inside a round.
export function scenarioList() { return SCENARIOS.slice().sort((a, b) => b.round - a.round); }
export function scenarioByName(name: string) { return SCENARIOS.find(s => s.name.toLowerCase() === name.toLowerCase()) || null; }

// TUNE overrides: applied before the hunt, restored when the scenario is left (or the next one starts).
let saved: Record<string, any> | null = null;
function applyTune(t?: Record<string, any>) {
  restoreTune();
  saved = {};
  for (const k of Object.keys(t || {})) { if (!(k in TUNE)) throw new Error('scenario tune: unknown key ' + k); saved[k] = TUNE[k]; TUNE[k] = t[k]; }
}
export function restoreTune() { if (saved) for (const k of Object.keys(saved)) TUNE[k] = saved[k]; saved = null; }

const ctr = (t: Tile) => ({ x: (t[0] + 0.5) * T, y: (t[1] + 0.5) * T });
function face(u, t: Tile | undefined, dflt) { const p = t ? ctr(t) : dflt, dx = p.x - u.x, dy = p.y - u.y, d = Math.hypot(dx, dy); if (d > 0) { u.fx = dx / d; u.fy = dy / d; } }

// Start scenario s as one hunt. Same seed = same hunt (RETRY). Leaves G.tb = the scenario (the view and the log read it).
export function startScenario(s: Scenario) {
  applyTune(s.tune);
  G.ct = null; // never inside a contract
  setSeed(s.seed); G.seed = s.seed;
  if (s.packed) { setSeed(s.packed.seed); rollPacked(s.packed.seed, s.packed.grid, s.mission === 'ESCORT'); setSeed(s.seed); } // R17: same seed, same district
  else if (s.map) { if (!buildDistrict(s.map)) throw new Error('scenario ' + s.name + ': district not reachable'); } else loadMap(HIVE); // R16
  const U = G.up, up = ctr(s.uplink); U.x = up.x; U.y = up.y; U.name = 'test point';
  G.comp = { NAME: 'Test bed', staticPlacement: 'uplink' }; // no type counts: newHunt builds no field, prep below places it
  setZones(s.zones || []);
  G.mtype = s.mission || 'UPLINK'; // R15
  const loads = s.lance.map(l => ({ ...DEFAULT_LOAD, ...(l.load || {}) }));
  newHunt(loads, () => {
    G.lance.forEach((m, i) => {
      const L = s.lance[i], p = ctr(L.tile); m.x = p.x; m.y = p.y; face(m, L.face, up);
      if (L.legsLost) { m.parts.LEGS = Math.max(0, m.parts.LEGS - L.legsLost); if (!m.parts.LEGS) m.partsLost.push('LEGS'); syncHits(m); }
      if (L.en !== undefined) m.en = L.en;
      if (L.lost) { m.dead = true; m.hits = 0; m.x = m.y = -10 * T; } // R16: off the map, out of the order (as a contract's lost mech)
    });
    setActive(G.lance.find(m => !m.dead));
    G.units = s.field.map((f, i) => {
      const u = makeUnit(f.type, i, f.variant), p = ctr(f.tile);
      u.x = u.gx = p.x; u.y = u.gy = p.y; face(u, f.face, up);
      if (f.state) u.state = f.state;
      u.zoned = zoneAtTile(f.tile[0], f.tile[1])?.type || '';
      if (u.hasRadar) u.pulseCD = u.pulseN;
      return u;
    });
    if (s.ally) G.ally = makeAlly(s.ally); // R15 Escort
    if (s.earned) G.mission.earned = s.earned === 'quota' ? G.mission.quota : s.earned; // R15 Bounty: start part (or all) of the way to the quota
  });
  G.tb = s;
}
// The test bed is over (BACK): forget the scenario and put TUNE back.
export function leaveScenario() { G.tb = null; restoreTune(); }
