// R25 golden logs (port phase 0, claude/signal-lance-godot-port.md): the answer key the Godot port is checked against.
// For each fixed seed the scripted player plays a hunt, a contract or a company run; we record every RNG roll of every
// stream in order, the event log (after-action events and gun shots) and the end state. Same seed → same file, always.
//   npm run sim -- --golden golden          write them all to signal-lance/golden/
//   test/golden.test.ts                     rebuilds them and compares (a rule change shows up as a diff)
// Rolls are exact (uint32 = roll × 2^32). Positions are tiles rounded to 3 places: Math.sin / hypot can differ in the
// last bit between engines, so the port compares floats with a tolerance and everything else exactly.
import { TUNE } from '../src/tune.ts';
import { rollTap } from '../src/sim/rng.ts';
import { G, rollEnemy, newHunt } from '../src/sim/state.ts';
import { T } from '../src/sim/world.ts';
import { DEFAULT_FIT } from '../src/sim/kit.ts';
import { playOut } from '../src/sim/autoplay.ts';
import { newContract, takeJob, rollJobs } from '../src/sim/contract.ts';
import { newCompany, autoCrew, lanceSize, offerBlock, takeOffer, hireBlock, hire, endContract } from '../src/sim/company.ts';

export const GOLDEN_V = 1;
export const SEEDS = {
  hunt: Array.from({ length: 20 }, (_, i) => i + 1),
  contract: Array.from({ length: 20 }, (_, i) => i + 1),
  company: [1, 2, 3, 4, 5, 101, 202, 303, 1001, 2002, 3003], // 1–5, then the QA panel's seeds
};
const MAX_TURNS = 80, CO_CONTRACTS = 3;
const STREAM = { hunt: 'h', contract: 'c', company: 'k', scan: 's' } as Record<string, string>;

const r3 = (v: number) => Number.isFinite(v) ? Math.round(v * 1000) / 1000 : null;
const tile = (v: number) => r3(v / T);

// ---- the recorder ----
function recorder() {
  const R = { order: '', hunt: [] as number[], contract: [] as number[], company: [] as number[], scan: [] as number[] };
  rollTap.fn = (s, v) => { R.order += STREAM[s] || '?'; (R as any)[s].push(Math.round(v * 4294967296)); };
  return R;
}
// runs of one letter: 'hhhhss' → 'h4s2' (the order of the streams, short)
function rle(s: string) { let out = '', i = 0; while (i < s.length) { let j = i; while (j < s.length && s[j] === s[i]) j++; out += s[i] + (j - i); i = j; } return out; }

// ---- what a finished hunt looks like ----
function unitState(u: any) {
  if (!u) return null;
  return { id: u.id, type: u.type || 'MECH', variant: u.variant || '', x: tile(u.x), y: tile(u.y), hits: u.hits, maxHits: u.maxHits, parts: u.parts || null,
    dead: !!u.dead, out: !!u.out, ap: u.ap ?? null, en: u.en === undefined ? null : r3(u.en), ammo: u.ammo ?? null, shells: u.shells ?? null };
}
function huntRecord() {
  return {
    seed: G.seed, mission: G.mtype, comp: G.comp ? G.comp.NAME : '', outcome: G.mode === 'hunt' ? 'STALL' : G.outcome, turns: G.turn, kills: G.kills,
    events: G.aar.map((e: any) => ({ n: e.n, turn: e.turn, kind: e.kind, sub: e.sub, side: e.side, a: e.a, b: e.b, how: e.how, what: e.what, rear: e.rear, known: e.known,
      at: [tile(e.ax), tile(e.ay)], to: [tile(e.bx), tile(e.by)] })),
    shots: G.shotLog.map((r: any) => ({ turn: r.turn, shooter: r.shooter, target: r.target, pct: r.pct, roll: !!r.roll, hit: !!r.hit, part: r.part || '', victim: r.victim || '', kill: !!r.kill, wall: !!r.wall })),
    lance: G.lance.map(unitState), field: G.units.map(unitState), ally: unitState(G.ally),
  };
}
const contractEnd = () => ({ status: G.ct.status, wins: G.ct.wins, hunts: G.ct.results.length, earned: G.ct.earned, spent: G.ct.spent, carry: G.ct.carry });

// ---- the three kinds of run ----
function huntRun(seed: number) {
  rollEnemy(seed); newHunt([DEFAULT_FIT, DEFAULT_FIT]); playOut(MAX_TURNS);
  return { hunts: [huntRecord()] };
}
function contractRun(seed: number) {
  newContract(seed, [DEFAULT_FIT, DEFAULT_FIT]);
  const hunts: any[] = [];
  for (let n = 0; n < 10 && G.ct.status === 'ACTIVE'; n++) {
    takeJob(0); playOut(MAX_TURNS); hunts.push(huntRecord());
    if (G.mode === 'hunt') break; // a stall
    if (G.ct.status === 'ACTIVE') rollJobs();
  }
  return { hunts, end: contractEnd() };
}
function companyRun(seed: number) {
  newCompany(seed, [DEFAULT_FIT, DEFAULT_FIT]);
  const C = G.co, contracts: any[] = [];
  for (let k = 0; k < CO_CONTRACTS && !C.folded; k++) {
    while (hireBlock(0) === '' && C.ops.length < C.suits.length) hire(0);
    autoCrew();
    if (offerBlock(0) !== '') break;
    takeOffer(0);
    const hunts: any[] = [];
    for (let n = 0; n < 10 && G.ct.status === 'ACTIVE'; n++) {
      autoCrew(); if (!lanceSize()) { G.ct.status = 'FAILED'; endContract('FAILED'); break; }
      takeJob(0); playOut(MAX_TURNS); hunts.push(huntRecord());
      if (G.mode === 'hunt') { G.ct.status = 'FAILED'; endContract('FAILED'); break; }
      if (G.ct.status === 'ACTIVE') rollJobs();
    }
    contracts.push({ hunts, end: { status: G.ct.status, wins: G.ct.wins, hunts: G.ct.results.length } });
  }
  return { contracts, end: { code: C.code, credits: C.credits, fuel: C.fuel, parts: C.parts, folded: C.folded || '', rec: C.rec,
    ops: C.ops.map((o: any) => ({ name: o.name, skill: o.skill, lvl: o.lvl, xp: o.xp, status: o.status })),
    suits: C.suits.map((s: any) => ({ id: s.id, carry: s.carry })), standing: C.city ? C.city.standing : null } };
}

// One golden record. Resets the shared state it touches first, so the order runs are made in never matters.
export function golden(kind: 'hunt' | 'contract' | 'company', seed: number) {
  G.co = null; G.ct = null; G.crew = null; G.scan = null;
  const R = recorder();
  let body: any;
  try { body = kind === 'hunt' ? huntRun(seed) : kind === 'contract' ? contractRun(seed) : companyRun(seed); }
  finally { rollTap.fn = null; }
  G.co = null; G.ct = null; G.crew = null; G.scan = null;
  return { v: GOLDEN_V, kind, seed, map: TUNE.MAP_MODE, rolls: { count: R.order.length, order: rle(R.order), hunt: R.hunt, contract: R.contract, company: R.company, scan: R.scan }, ...body };
}
export const fileName = (kind: string, seed: number) => kind + '-' + String(seed).padStart(4, '0') + '.json';
export function* allRuns() { for (const k of ['hunt', 'contract', 'company'] as const) for (const s of SEEDS[k]) yield [k, s] as const; }

// Stable JSON: keys sorted, two-space indent, number arrays on one line (the roll lists stay readable and diffable).
export function stable(v: any, ind = ''): string {
  if (v === null || typeof v !== 'object') return JSON.stringify(v ?? null);
  if (Array.isArray(v)) {
    if (!v.length) return '[]';
    if (v.every(x => typeof x === 'number' || x === null)) return '[' + v.map(x => JSON.stringify(x)).join(',') + ']';
    const n = ind + '  '; return '[\n' + v.map(x => n + stable(x, n)).join(',\n') + '\n' + ind + ']';
  }
  const keys = Object.keys(v).filter(k => v[k] !== undefined).sort(); if (!keys.length) return '{}';
  const n = ind + '  '; return '{\n' + keys.map(k => n + JSON.stringify(k) + ': ' + stable(v[k], n)).join(',\n') + '\n' + ind + '}';
}
