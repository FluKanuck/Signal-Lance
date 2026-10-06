// Round 14 part 0: the test bed. Hand-placed scenarios that test ONE mechanic in minutes (contracts answer "is it fun?",
// a scenario answers "does it read?"). Data only, written by the agent from the round brief: no editor, no free spawn.
// A scenario plays as one hunt outside any contract, logs as [TESTBED <name>] and never counts toward contract stats.
import { TUNE } from '../tune.ts';
import { T } from './world.ts';
import { setSeed } from './rng.ts';
import { G, newHunt, makeUnit, setActive, DEFAULT_LOAD } from './state.ts';
import { setZones, zoneAtTile } from './zones.ts';
import { syncHits } from './combat.ts';

type Tile = [number, number];
export type Scenario = {
  name: string; round: number;
  tryThis: string;                       // one plain line: what Jamie should do
  seed: number;                          // RETRY replays it exactly
  uplink: Tile;
  lance: { load?: any; tile: Tile; face?: Tile; legsLost?: number; en?: number }[]; // [A, B]; face = a tile to face (default: the uplink)
  field: { type: string; variant?: string; tile: Tile; face?: Tile; state?: string }[];
  zones?: { type: 'QUIET' | 'NOISE'; x: number; y: number; name?: string }[];
  tune?: Record<string, any>;            // TUNE overrides for this scenario only (top-level keys); restored afterwards
  question?: { q: string; a: string[] }; // one tap question when it ends
  mission?: string;                      // R15: the mission type (default UPLINK)
  earned?: number | 'quota';             // R15 Bounty: credits already banked at the start ('quota' = exactly BOUNTY_QUOTA)
};

export const SCENARIOS: Scenario[] = [
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
    });
    setActive(G.lance[0]);
    G.units = s.field.map((f, i) => {
      const u = makeUnit(f.type, i, f.variant), p = ctr(f.tile);
      u.x = u.gx = p.x; u.y = u.gy = p.y; face(u, f.face, up);
      if (f.state) u.state = f.state;
      u.zoned = zoneAtTile(f.tile[0], f.tile[1])?.type || '';
      if (u.hasRadar) u.pulseCD = u.pulseN;
      return u;
    });
    if (s.earned) G.mission.earned = s.earned === 'quota' ? G.mission.quota : s.earned; // R15 Bounty: start part (or all) of the way to the quota
  });
  G.tb = s;
}
// The test bed is over (BACK): forget the scenario and put TUNE back.
export function leaveScenario() { G.tb = null; restoreTune(); }
