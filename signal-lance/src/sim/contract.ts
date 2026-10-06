// Round 11: the contract. A run is CONTRACT_HUNTS linked hunts. Before each hunt, 2 jobs are rolled
// (different compositions); the player takes one. Per mech, armour damage, gun rounds, mortar shells and
// a destroyed status carry from hunt to hunt. Loadouts are fixed for the whole contract. In memory only.
import { TUNE } from '../tune.ts';
import { T } from './world.ts';
import { G, rollEnemy, newHunt, setActive } from './state.ts';
import { splitHits, syncHits, partsRead } from './combat.ts';
import { huntPay } from './mission.ts';

// Contract-level RNG (mulberry32 on its own state), so job rolls never disturb a hunt's seeded RNG.
function crand(): number {
  const C = G.ct; C.rs = (C.rs + 0x6D2B79F5) >>> 0;
  let t = C.rs;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
function pickWeighted(list) {
  const tot = list.reduce((a, c) => a + (c.weight ?? 1), 0);
  let r = crand() * tot;
  for (const c of list) { r -= c.weight ?? 1; if (r < 0) return c; }
  return list[list.length - 1];
}
// A fresh mech's numbers from its loadout (same as makeMech in state.ts).
function fresh(load) {
  const hits = TUNE.PLAYER_HITS + load.armour * TUNE.ARMOUR_HITS, parts = splitHits('MECH', hits); // R12: per part
  return { hits, maxHits: hits, parts, pmax: { ...parts }, ammo: load.ammo * TUNE.AMMO_PER_SLOT, shells: load.mortar ? TUNE.MORTAR_SHELLS : 0, dead: false };
}
// Damage read for a lance mech, using the same thresholds as the enemy read.
export function dmgWord(c) {
  if (c.dead) return 'LOST';
  const f = c.hits / c.maxHits;
  return f <= TUNE.DMG_BADLY ? 'BADLY DAMAGED' : f <= TUNE.DMG_BLOODIED ? 'BLOODIED' : f < 1 ? 'SCRATCHED' : 'FINE';
}
export function contractActive() { return !!G.ct && G.ct.status === 'ACTIVE'; }

// Start a contract: lock the loadouts ([A, B]), set fresh carry, roll hunt 1's jobs.
// hunts (optional): a shorter contract for quick testing (the loadout screen's 1-hunt toggle). Wins needed scale down with it.
export function newContract(seed: number, loads, hunts = TUNE.CONTRACT_HUNTS) {
  G.ct = {
    seed: seed >>> 0, rs: seed >>> 0, loads: loads.map(l => ({ ...l })),
    hunt: 0, wins: 0, results: [], jobs: [], status: 'ACTIVE', huntSeed: 0,
    hunts, need: Math.min(TUNE.CONTRACT_WINS_NEEDED, hunts), // this contract's length and wins needed
    carry: { A: fresh(loads[0]), B: fresh(loads[1]) },
    credits: 0, earned: 0, spent: 0, buys: [], // R11 s2: payout and refit
    ref: { A: null, B: null },                 // R11 s2: per mech, what it started its last hunt (alive) with; refit cap = REFIT_CAP × this
  };
  rollJobs();
}
// Roll the next hunt's 2 jobs: different compositions (by weight, from the playtest pool if it has 2+ names), own seeds.
export function rollJobs() {
  const C = G.ct; C.hunt++;
  let P = TUNE.FIELD_COMPOSITIONS;
  const pool = P.filter(c => (TUNE.FIELD_PLAYTEST_POOL || []).includes(c.NAME));
  if (pool.length >= 2) P = pool;
  const a = pickWeighted(P), b = pickWeighted(P.filter(c => c !== a)), M = TUNE.MISSION_TYPES;
  C.jobs = [a, b].map(c => ({ comp: c.NAME, seed: (crand() * 4294967296) >>> 0, mission: M[Math.floor(crand() * M.length)] })); // R15: each job rolls its type (the two may differ)
  C.rerolls = 0;
}
// R16 debug (Jamie): roll this hunt's 2 jobs again (same hunt number, contract RNG moves on), to fish for a mission type.
// The count goes in the log line so tester runs that used it can be told apart.
export function rerollJobs() { const C = G.ct; const n = (C.rerolls || 0) + 1; C.hunt--; rollJobs(); C.rerolls = n; }
// Set the world up as job i (uplink, field roll, zones) without starting it: the view reads INTEL from it.
export function previewJob(i: number) { const j = G.ct.jobs[i]; rollEnemy(j.seed, j.comp, j.mission); }
// Take job i: roll its setup, start the hunt with the locked loadouts, apply the carried state before round 1.
export function takeJob(i: number) {
  const C = G.ct, j = C.jobs[i];
  C.taken = i; C.huntSeed = j.seed;
  for (const id of ['A', 'B']) { const c = C.carry[id]; if (!c.dead) C.ref[id] = { hits: c.hits, ammo: c.ammo, shells: c.shells }; } // R11 s2: the start the next refit cap is taken from
  rollEnemy(j.seed, j.comp, j.mission);
  newHunt(C.loads, () => {
    for (const m of G.lance) {
      const c = C.carry[m.id];
      m.parts = { ...c.parts }; syncHits(m); m.ammo = c.ammo; m.shells = c.shells; // R12: damage carries per part
      if (c.dead) { m.dead = true; m.hits = 0; m.x = m.y = -10 * T; } // lost for the contract: off the map, out of the order
    }
    const live = G.lance.find(m => !m.dead); if (live) setActive(live);
  });
}
// Called by finishHunt: record the hunt, carry the lance's state, decide whether the contract goes on.
export function recordHunt() {
  const C = G.ct; if (!C || C.status !== 'ACTIVE' || C.results.length >= C.hunt) return; // once per hunt
  const before = C.carry;
  C.carry = {};
  for (const m of G.lance) C.carry[m.id] = { hits: Math.max(0, m.hits), maxHits: m.maxHits, parts: { ...m.parts }, pmax: { ...m.pmax }, ammo: m.ammo, shells: m.shells, dead: m.dead };
  const kind = G.outcome.split(' ')[0];
  const won = kind === 'WIN';
  if (won) C.wins++;
  const pay = huntPay(kind); // R11 s2; R15: Bounty pays its bounties (kept on a BAIL)
  C.credits += pay; C.earned += pay;
  C.results.push({
    n: C.hunt, job: C.taken + 1, mission: G.mission.type, earned: G.mission.earned, comp: G.comp.NAME, up: G.up.name, outcome: G.outcome, turns: G.turn,
    kills: G.kills, total: G.units.length,
    lost: G.lance.filter(m => m.dead && !before[m.id].dead).map(m => m.id),
    out: G.lance.map(m => m.id + ' ' + dmgWord(C.carry[m.id]) + (m.dead ? '' : ' (' + partsRead(C.carry[m.id]) + ')')), // R12: per-part read
    pay, buys: C.buys.slice(), // what was bought before this hunt
  });
  C.buys = [];
  if (kind === 'LOSS') C.status = 'FAILED';
  else if (C.hunt >= C.hunts) C.status = C.wins >= C.need ? 'COMPLETE' : 'FAILED';
}
// "A BLOODIED, B LOST" from the current carry.
export function lanceText() { return Object.keys(G.ct.carry).map(k => k + ' ' + dmgWord(G.ct.carry[k])).join(', '); }

// ============================ R11 step 2: refit ============================
// Cap per mech: REFIT_CAP × what it started its previous hunt with (rounded down). Never lowers what it already has.
export function refitCap(id) {
  const r = G.ct.ref[id];
  if (!r) return null;
  const k = TUNE.REFIT_CAP;
  return { hits: Math.floor(r.hits * k), ammo: Math.floor(r.ammo * k), shells: Math.floor(r.shells * k) };
}
// '' = allowed, else why not (CR / CAP / LOST / NONE)
export function refitBlock(id, what) {
  const C = G.ct, c = C.carry[id], cap = refitCap(id);
  if (!cap) return 'NONE';
  const cost = { repair: TUNE.COST_REPAIR, rounds: TUNE.COST_ROUNDS, shell: TUNE.COST_SHELL, rebuild: TUNE.COST_REBUILD }[what];
  if (what === 'rebuild') { if (!c.dead) return 'NONE'; }
  else if (c.dead) return 'LOST';
  if (what === 'repair' && c.hits >= cap.hits) return 'CAP';
  if (what === 'rounds' && (!C.loads[id === 'A' ? 0 : 1].ammo || c.ammo >= cap.ammo)) return C.loads[id === 'A' ? 0 : 1].ammo ? 'CAP' : 'NONE';
  if (what === 'shell' && (!C.loads[id === 'A' ? 0 : 1].mortar || c.shells >= cap.shells)) return C.loads[id === 'A' ? 0 : 1].mortar ? 'CAP' : 'NONE';
  if (what === 'rebuild' && cap.hits <= 0) return 'CAP';
  if (C.credits < cost) return 'CR';
  return '';
}
export function refit(id, what) {
  if (refitBlock(id, what) !== '') return false;
  const C = G.ct, c = C.carry[id], cap = refitCap(id);
  const cost = { repair: TUNE.COST_REPAIR, rounds: TUNE.COST_ROUNDS, shell: TUNE.COST_SHELL, rebuild: TUNE.COST_REBUILD }[what];
  if (what === 'repair') repairWorst(c); // R12 step 1: the most damaged part first
  if (what === 'rounds') c.ammo = Math.min(cap.ammo, c.ammo + 10);
  if (what === 'shell') c.shells++;
  if (what === 'rebuild') { c.dead = false; c.parts = splitHits('MECH', cap.hits); syncHits(c); c.ammo = cap.ammo; c.shells = cap.shells; }
  C.credits -= cost; C.spent += cost;
  C.buys.push(id + ' ' + what);
  return true;
}
// "A repair×2, B rounds" from a list of buys
export function buysText(list) {
  const n: Record<string, number> = {};
  for (const b of list) n[b] = (n[b] || 0) + 1;
  return Object.entries(n).map(([k, v]) => k + (v > 1 ? '×' + v : '')).join(', ');
}

// R12 step 1: "repair one hit" goes to the part missing the most hits (destroyed parts count; ties: CORE, LEGS, WEAPON, SENSORS).
function repairWorst(c) {
  let best = '', miss = 0;
  for (const p of ['CORE', 'LEGS', 'WEAPON', 'SENSORS']) { if (c.pmax[p] === undefined) continue; const m = c.pmax[p] - c.parts[p]; if (m > miss) { miss = m; best = p; } }
  if (best) c.parts[best]++;
  syncHits(c);
}
