// Round 21: the company. One company carried across contracts. Checkpoint 1: people (named operators with one skill,
// XP and levels, CRITICAL → carried out = benched / left behind = KIA, recruits). The view saves G.co (and the running
// G.ct) to one localStorage slot; everything here is plain JSON so a save round-trips exactly.
// Off (G.co null) = the R11 contract flow, byte-identical: suits have no operator, a lethal hit just destroys the suit.
import { TUNE } from '../tune.ts';
import { T } from './world.ts';
import { G } from './state.ts';

export const CO_VERSION = 1; // bump when the save's shape changes (an old save then offers NEW COMPANY)
export type Op = {
  id: string; name: string; skill: string; xp: number; lvl: number;
  status: 'OK' | 'BENCH'; bench: number; // BENCH: contracts left to sit out
  hunts: number; hurtIn: number;         // hunts survived; the contract (co.n) it was last hurt in (-1 never)
};

// Seeded name lists (the company's own RNG picks from them; no two operators on the roster share a name)
const FIRST = ['Mara', 'Jok', 'Vel', 'Ines', 'Rafe', 'Tamsin', 'Oko', 'Bram', 'Sela', 'Dov', 'Kit', 'Nadia', 'Hollis', 'Pell', 'Yara', 'Corin', 'Ash', 'Teo', 'Lio', 'Wren', 'Mags', 'Ezra', 'Fen', 'Ruth'];
const LAST = ['Voss', 'Okafor', 'Hale', 'Kirov', 'Sato', 'Brandt', 'Achebe', 'Lund', 'Marsh', 'Quill', 'Ferro', 'Dane', 'Ibarra', 'Novak', 'Reyes', 'Thorne', 'Ueda', 'Wolfe', 'Castell', 'Mbeki'];

// Company RNG (mulberry32 on co.rs), so company rolls never disturb a hunt's or a contract's RNG.
function corand(): number {
  const C = G.co; C.rs = (C.rs + 0x6D2B79F5) >>> 0;
  let t = C.rs;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const pick = <X>(a: X[]): X => a[Math.floor(corand() * a.length)];

export function companyOn() { return !!G.co; }
// The company code: its seed, written short (in every [COMPANY] log line, so a company can be rebuilt from its start)
export function coCode(seed: number) { return (seed >>> 0).toString(36).toUpperCase(); }

function makeOp(): Op {
  const C = G.co, used = new Set([...C.ops, ...C.recruits].map(o => o.name));
  let name = '';
  for (let i = 0; i < 50 && (!name || used.has(name)); i++) name = pick(FIRST) + ' ' + pick(LAST);
  return { id: 'O' + C.nextId++, name, skill: pick(TUNE.OP_SKILLS), xp: 0, lvl: 1, status: 'OK', bench: 0, hunts: 0, hurtIn: -1 };
}
// A new company: START_OPS operators, the first two seated in A and B, RECRUITS_OFFERED recruits on offer.
export function newCompany(seed: number) {
  G.co = { v: CO_VERSION, seed: seed >>> 0, code: coCode(seed), rs: seed >>> 0, nextId: 1, n: 0,
    ops: [] as Op[], recruits: [] as Op[], memorial: [] as any[], crew: { A: '', B: '' }, news: [] as string[],
    rec: { contracts: 0, complete: 0, failed: 0, hunts: 0, wins: 0, kia: 0 } };
  for (let i = 0; i < TUNE.START_OPS; i++) G.co.ops.push(makeOp());
  G.co.crew = { A: G.co.ops[0]?.id || '', B: G.co.ops[1]?.id || '' };
  rollRecruits();
  return G.co;
}
// A loaded save is used only if its shape matches this build (no migrations: a mismatch offers NEW COMPANY).
export function validCompany(co: any) {
  return !!co && co.v === CO_VERSION && Array.isArray(co.ops) && Array.isArray(co.recruits) && Array.isArray(co.memorial) && !!co.crew && !!co.rec && typeof co.rs === 'number';
}
export function rollRecruits() { const C = G.co; C.recruits = []; for (let i = 0; i < TUNE.RECRUITS_OFFERED; i++) C.recruits.push(makeOp()); }

// ============================ OPERATORS ===============================
export const opById = (id: string): Op | null => (G.co && G.co.ops.find(o => o.id === id)) || null;
export const skillName = (k: string) => TUNE.OP_SKILL_NAMES[k] || k;
export const isVet = (o) => !!o && o.lvl >= 2;
export function levelOf(xp: number) { return 1 + TUNE.OP_LEVELS.filter(n => xp >= n).length; }
export function nextLevelXp(o: Op) { return TUNE.OP_LEVELS[o.lvl - 1] ?? null; } // null = top level
// The skill's value at the operator's level: AIM adds to-hit, the others multiply
export function skillAt(k: string, lvl: number) { const L = TUNE['SKILL_' + k]; return L ? L[Math.min(L.length, Math.max(1, lvl)) - 1] : 0; }
// " +10 to hit" / " move sound ×0.7" …: what the skill does at that level, in words
export function skillEffect(k: string, lvl: number) {
  const v = skillAt(k, lvl);
  return k === 'AIM' ? '+' + v + ' to hit' : k === 'QUIET' ? 'move sound ×' + v : k === 'EARS' ? 'hears ×' + v + ' further' : 'IDs firm up ×' + v + ' faster';
}
// m's skill value if its operator has skill k (null otherwise). The one hook each skill has in an existing rule.
export function skillVal(m, k: string): number | null { return m && m.op && m.op.skill === k ? skillAt(k, m.op.lvl) : null; }
// SENSOR TECH works for the whole lance (it reads the shared picture) while its suit is on the map: the best one counts
export function lanceTech() { let k = 1; for (const m of G.lance) if (!m.dead && !m.out) k = Math.max(k, skillVal(m, 'TECH') ?? 1); return k; }
export function opShort(o) { return o ? o.name.split(' ')[0] + ' ' + o.skill + ' ' + o.lvl + (isVet(o) ? '★' : '') : ''; }

// Who can drop: OK operators. Seats keep their operator while it can drop; an empty seat takes the first free OK operator.
export function canDrop(o: Op | null) { return !!o && o.status === 'OK'; }
export function fillCrew() {
  const C = G.co, seats = Object.keys(C.crew), taken = new Set<string>();
  for (const s of seats) { const o = opById(C.crew[s]); if (canDrop(o) && !taken.has(o.id)) taken.add(o.id); else C.crew[s] = ''; }
  for (const s of seats) if (!C.crew[s]) { const o = C.ops.find(x => canDrop(x) && !taken.has(x.id)); if (o) { C.crew[s] = o.id; taken.add(o.id); } }
}
// Seat operator id in seat s (a seated operator moves; whoever sat there swaps into its old seat)
export function seat(id: string, s: string) {
  const C = G.co, o = opById(id); if (!canDrop(o) || !(s in C.crew)) return false;
  const from = Object.keys(C.crew).find(k => C.crew[k] === id), was = C.crew[s];
  C.crew[s] = id; if (from && from !== s) C.crew[from] = was;
  return true;
}
// The hunt's operators, per suit id (newHunt reads G.crew; null = no company, suits have no operator)
export function crewForHunt() { const C = G.co; fillCrew(); const out: any = {}; for (const s of Object.keys(C.crew)) out[s] = opById(C.crew[s]); return out; }

// Hire recruit i (free until cp3; the roster caps at OP_CAP). '' = done, else why not.
export function hireBlock(i: number) { const C = G.co; if (!C.recruits[i]) return 'NONE'; if (C.ops.length >= TUNE.OP_CAP) return 'FULL'; return ''; }
export function hire(i: number) {
  if (hireBlock(i)) return false;
  const C = G.co, o = C.recruits.splice(i, 1)[0];
  C.ops.push(o); C.news.push('Hired ' + o.name + ' (' + skillName(o.skill) + ').');
  fillCrew();
  return true;
}

// ============================ IN THE HUNT =============================
// A lethal hit on a suit with an operator drops it CRITICAL: the suit is down and stays on the board.
export function onSuitDown(m) {
  if (!m.op) return;
  m.crit = true; m.carriedBy = '';
  for (const d of G.lance) if (d.carriedBy === m.id) d.carriedBy = ''; // whoever it was carrying is down with it
}
// End of m's turn (or m extracting): it picks up every CRITICAL lancemate within OP_CARRY_RANGE.
export function noteCarry(m) {
  if (!m || m.dead) return;
  for (const d of G.lance) if (d !== m && d.crit && !d.carriedBy && Math.hypot(d.x - m.x, d.y - m.y) / T <= TUNE.OP_CARRY_RANGE) { d.carriedBy = m.id; G.carryLog = (G.carryLog || []).concat({ who: d.id, by: m.id, turn: G.turn }); }
}
// How a CRITICAL operator's hunt ended: carried by a lancemate still standing (out or on the map), or the field cleared = SAVED;
// otherwise KIA. Not critical = OK.
export function fateOf(m): 'OK' | 'SAVED' | 'KIA' {
  if (!m.crit) return 'OK';
  const by = m.carriedBy ? G.lance.find(x => x.id === m.carriedBy) : null;
  if (by && !by.dead) return 'SAVED';
  if (G.units.length && G.kills >= G.units.length) return 'SAVED';
  return 'KIA';
}

// ============================ AFTER THE HUNT ==========================
// Called once per contract hunt (finishHunt). XP and levels for those who came back, bench for the carried, KIA for the left.
// Writes plain lines to co.news (the result screen and the [COMPANY] log show them, then the view clears them).
export function afterHunt() {
  const C = G.co; if (!C || !G.ct) return;
  const won = G.outcome.startsWith('WIN');
  C.rec.hunts++; if (won) C.rec.wins++;
  for (const m of G.lance) {
    const o = m.op ? opById(m.op.id) : null; if (!o) continue;
    const f = fateOf(m);
    if (f === 'OK') {
      o.hunts++; o.xp += TUNE.OP_XP_HUNT + (won ? TUNE.OP_XP_WIN : 0);
      const L = levelOf(o.xp);
      if (L > o.lvl) { o.lvl = L; C.news.push(o.name + ' (' + m.id + ') is now ' + skillName(o.skill) + ' ' + L + (L === 2 ? ', a veteran' : '') + ': ' + skillEffect(o.skill, L) + '.'); }
      else C.news.push(o.name + ' (' + m.id + ') +' + (TUNE.OP_XP_HUNT + (won ? TUNE.OP_XP_WIN : 0)) + ' XP (' + o.xp + (nextLevelXp(o) ? '/' + nextLevelXp(o) : '') + ').');
    } else if (f === 'SAVED') {
      o.status = 'BENCH'; o.bench = TUNE.OP_BENCH; o.hurtIn = C.n;
      C.news.push(o.name + ' (' + m.id + ') went CRITICAL and was ' + (m.carriedBy ? 'carried out by ' + m.carriedBy : 'recovered from the cleared field') + ': benched for ' + o.bench + ' contracts.');
    } else {
      C.ops = C.ops.filter(x => x !== o); C.rec.kia++;
      C.memorial.unshift({ name: o.name, skill: o.skill, lvl: o.lvl, hunts: o.hunts, when: 'contract ' + (C.n + 1) + ', hunt ' + G.ct.hunt });
      C.memorial = C.memorial.slice(0, TUNE.OP_MEMORIAL);
      C.news.push(o.name + ' (' + m.id + ') went CRITICAL and was left behind: KIA.');
    }
  }
  fillCrew();
}
// The contract is over (complete, failed, or quit): count it, tick the bench down (not for those hurt in this one), new recruits.
export function endContract(status: string) {
  const C = G.co; if (!C) return;
  C.rec.contracts++; if (status === 'COMPLETE') C.rec.complete++; else C.rec.failed++;
  for (const o of C.ops) if (o.status === 'BENCH' && o.hurtIn !== C.n && --o.bench <= 0) { o.status = 'OK'; o.bench = 0; C.news.push(o.name + ' is back from the bench.'); }
  C.n++;
  rollRecruits();
  fillCrew();
}
// "code 3F2A · contract 4 · 4 on the roster (2 vets), 1 benched, 1 KIA"
export function companyLine() {
  const C = G.co, vets = C.ops.filter(isVet).length, bench = C.ops.filter(o => o.status === 'BENCH').length;
  return 'code ' + C.code + ' · contract ' + (C.n + 1) + ' · ' + C.ops.length + ' on the roster' + (vets ? ' (' + vets + ' vet' + (vets > 1 ? 's' : '') + ')' : '') + (bench ? ', ' + bench + ' benched' : '') + (C.rec.kia ? ', ' + C.rec.kia + ' KIA' : '') +
    ' · ' + C.ops.map(o => o.name.split(' ')[0] + ' ' + o.skill + o.lvl + (o.status === 'BENCH' ? ' bench' + o.bench : '')).join(', ');
}
// Per suit with an operator, how its hunt ended: "B Jok Okafor (QUIET MOVER 1): CRITICAL, carried out by A: lives"
export function crewLines() {
  return G.lance.filter(m => m.op).map(m => {
    const f = fateOf(m), o = m.op;
    return m.id + ' ' + o.name + ' (' + skillName(o.skill) + ' ' + o.lvl + '): ' + (f === 'OK' ? (m.out ? 'extracted' : 'came back') : f === 'SAVED' ? 'CRITICAL, ' + (m.carriedBy ? 'carried out by ' + m.carriedBy : 'field cleared') + ': lives' : 'CRITICAL, left behind: KIA');
  });
}
