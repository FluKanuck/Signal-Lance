// Shared test setup: start a seeded hunt with the runner's scripted loadouts, and small helpers.
import { G, rollEnemy, newHunt } from '../src/sim/state.ts';
import { TUNE } from '../src/tune.ts';
import { T } from '../src/sim/world.ts';
import { playOut } from '../src/sim/autoplay.ts';

export const LOAD = { armour: 1, radar: 0, passive: 1, ecm: 1, ammo: 2, cells: 0, mortar: 0 };
export const LOAD_A = { ...LOAD, mortar: 1 };

// A fresh hunt from a seed (optionally forcing a composition by NAME). Leaves the first activation started.
// R16: map = 'hive' (default: the rule tests use the fixed map's geometry) or 'blocks' (a rolled district).
export function startHunt(seed = 1, comp?: string, map = 'hive', mission = 'UPLINK') {
  const mode = TUNE.MAP_MODE; TUNE.MAP_MODE = map;
  try { rollEnemy(seed, comp, mission); } finally { TUNE.MAP_MODE = mode; }
  newHunt([{ ...LOAD_A }, { ...LOAD }]);
  return G;
}
// Play the whole hunt with the scripted player; returns a compact fingerprint of how it went.
export function playHunt(seed: number, comp?: string, maxTurns = 80, map = 'hive', mission = 'UPLINK') {
  startHunt(seed, comp, map, mission);
  playOut(maxTurns);
  return { outcome: G.mode === 'hunt' ? 'STALL' : G.outcome, turns: G.turn, kills: G.kills, hits: G.lance.map(m => m.hits).join(',') };
}
// Put a unit on a tile centre.
export function place(u, tx: number, ty: number) { u.x = (tx + 0.5) * T; u.y = (ty + 0.5) * T; }
