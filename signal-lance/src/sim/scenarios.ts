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
};

export const SCENARIOS: Scenario[] = [
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
  const loads = s.lance.map(l => ({ ...DEFAULT_LOAD, ...(l.load || {}) }));
  newHunt(loads, () => {
    G.lance.forEach((m, i) => {
      const L = s.lance[i], p = ctr(L.tile); m.x = p.x; m.y = p.y; face(m, L.face, up);
      if (L.legsLost) { m.parts.LEGS = Math.max(0, m.parts.LEGS - L.legsLost); if (!m.parts.LEGS) m.partsLost.push('LEGS'); syncHits(m); }
      if (L.en !== undefined) m.en = L.en;
    });
    setActive(G.lance[0]);
    G.units = s.field.map((f, i) => {
      const u = makeUnit(f.type, i), p = ctr(f.tile);
      u.x = u.gx = p.x; u.y = u.gy = p.y; face(u, f.face, up);
      if (f.state) u.state = f.state;
      u.zoned = zoneAtTile(f.tile[0], f.tile[1])?.type || '';
      if (u.hasRadar) u.pulseCD = TUNE.EMPL_PULSE_TURNS;
      return u;
    });
  });
  G.tb = s;
}
// The test bed is over (BACK): forget the scenario and put TUNE back.
export function leaveScenario() { G.tb = null; restoreTune(); }
