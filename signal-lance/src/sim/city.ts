// Round 23: the city. One seeded node map per company: CITY_DISTRICTS districts, each linked to 2-3 neighbours, held by three
// placeholder factions (2-3 districts each). The ship sits in one district; reaching a contract costs CITY_FUEL_PER_LINK per
// link on the shortest path. Contracts live in districts: a FACTION job (an employer against a rival, paid × CITY_FACTION_PAY,
// moves both standings) or a BROKER job (deniable, × CITY_BROKER_PAY, only the target's standing drops). Standing per faction,
// STANDING_MIN..MAX, three bands (HATED / NEUTRAL / LIKED), drifting back toward 0 every contract.
// What standing does reuses rules already built: HATED = more of its field awake at the drop (the R20 alert share), dearer fuel
// in its districts, its jobs a danger step up. LIKED = its own jobs pay more, jobs against its enemies open the scan with a
// layer filled in (STANDING_LIKED_INTEL), cheaper fuel in its districts.
// Everything here is plain JSON on G.co.city, so the company save carries it. The map has its own RNG (from the company seed);
// the offers roll on the company's RNG (company.ts passes it in), so city rolls never move a hunt's.
import { TUNE } from '../tune.ts';
import { G } from './state.ts';

export type Fac = string; // a key of TUNE.CITY_FACTIONS
export type District = { id: number; name: string; fac: Fac; x: number; y: number; links: number[] };
export type City = { districts: District[]; at: number; standing: Record<Fac, number>; rel: Record<string, string> }; // rel: 'A|B' (sorted) → RIVALS / NEUTRAL / ALLIES

const NAMES = ['Dockside', 'Spires', 'Ash Market', 'Neon Mile', 'Old Rail', 'Canal Ward', 'The Stacks', 'Glasshouse', 'Kiln Street', 'Low Bridge', 'Tallow End', 'Sump Gate'];
export const FACS = (): Fac[] => Object.keys(TUNE.CITY_FACTIONS);
export const facName = (f: Fac) => TUNE.CITY_FACTIONS[f]?.name || f;
export function cityOn() { return TUNE.CITY_ENABLED && !!G.co && !!G.co.city; }

function rng(seed: number) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// ============================ THE MAP =================================
// N districts on a jittered 4 × 2 grid (x 0..1, y 0..1). Links: a nearest-first spanning tree (no node past 3 links), then
// every node with 1 link gets one more to its nearest free neighbour. Factions hold contiguous bands west → east.
export function newCity(seed: number): City {
  const r = rng((seed ^ 0xC17E) >>> 0), [n0, n1] = TUNE.CITY_DISTRICTS, N = n0 + Math.floor(r() * (n1 - n0 + 1));
  const cells = Array.from({ length: 8 }, (_, i) => i);
  for (let i = cells.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [cells[i], cells[j]] = [cells[j], cells[i]]; }
  const names = NAMES.slice();
  const D: District[] = cells.slice(0, N).sort((a, b) => (a % 4) - (b % 4) || a - b).map((c, id) => ({ id, name: names.splice(Math.floor(r() * names.length), 1)[0],
    fac: '', x: ((c % 4) + 0.2 + r() * 0.6) / 4, y: ((c >> 2) + 0.2 + r() * 0.6) / 2, links: [] as number[] }));
  const dist = (a: District, b: District) => Math.hypot(a.x - b.x, (a.y - b.y) * 0.6);
  const link = (a: District, b: District) => { a.links.push(b.id); b.links.push(a.id); };
  const inT = new Set([0]);
  while (inT.size < N) {
    let best: [District, District] | null = null, bd = 1e9;
    for (const i of inT) { const a = D[i]; if (a.links.length >= 3) continue; for (const b of D) if (!inT.has(b.id)) { const d = dist(a, b); if (d < bd) { bd = d; best = [a, b]; } } }
    if (!best) break; link(best[0], best[1]); inT.add(best[1].id);
  }
  // a new link that crosses an existing one is only taken when nothing else is free
  const cross = (a: District, b: District) => D.some(p => p.links.some(qi => { const q = D[qi]; if (p.id > q.id || [a.id, b.id].includes(p.id) || [a.id, b.id].includes(q.id)) return false;
    const o = (u: District, v: District, w: District) => Math.sign((v.x - u.x) * (w.y - u.y) - (v.y - u.y) * (w.x - u.x));
    return o(a, b, p) !== o(a, b, q) && o(p, q, a) !== o(p, q, b); }));
  for (const a of D) if (a.links.length < 2) {
    const c = D.filter(b => b !== a && !a.links.includes(b.id) && b.links.length < 3).sort((p, q) => (+cross(a, p) - +cross(a, q)) || dist(a, p) - dist(a, q))[0];
    if (c) link(a, c);
  }
  // factions: N split as evenly as possible (2-3 each), in a seeded order, west to east
  const F = FACS(), order = F.slice();
  for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
  const counts = order.map((_, i) => Math.floor(N / F.length) + (i < N % F.length ? 1 : 0));
  let k = 0; order.forEach((f, i) => { for (let c = 0; c < counts[i]; c++) D[k++].fac = f; });
  const at = Math.floor(r() * N);
  // R23 tuning 1 (Jamie): how the factions stand with each other, one roll per pair (after the map, so the map is unchanged)
  const R = TUNE.CITY_RELATIONS, kinds = Object.keys(R), tot = kinds.reduce((a, k) => a + R[k].w, 0), rel: Record<string, string> = {};
  for (let i = 0; i < F.length; i++) for (let j = i + 1; j < F.length; j++) { let x = r() * tot, k = kinds[kinds.length - 1]; for (const c of kinds) { x -= R[c].w; if (x < 0) { k = c; break; } } rel[relKey(F[i], F[j])] = k; }
  return { districts: D, at, standing: Object.fromEntries(F.map(f => [f, 0])), rel };
}
// R23 tuning 1: faction relations. relOf = RIVALS / NEUTRAL / ALLIES; relVal = −1 / 0 / +1
export const relKey = (a: Fac, b: Fac) => [a, b].sort().join('|');
export function relOf(a: Fac, b: Fac, C: City = G.co?.city) { return a === b || !C || !C.rel ? 'NEUTRAL' : C.rel[relKey(a, b)] || 'NEUTRAL'; }
export const relVal = (a: Fac, b: Fac, C?: City) => TUNE.CITY_RELATIONS[relOf(a, b, C)]?.v ?? 0;
// Links on the shortest path a → b (BFS; -1 = unreachable)
export function hops(C: City, a: number, b: number) {
  if (a === b) return 0;
  const seen = new Map([[a, 0]]), q = [a];
  for (let h = 0; h < q.length; h++) for (const n of C.districts[q[h]].links) if (!seen.has(n)) { seen.set(n, seen.get(q[h])! + 1); if (n === b) return seen.get(n)!; q.push(n); }
  return -1;
}
// The district ids on that path, a first
export function pathTo(C: City, a: number, b: number) {
  const prev = new Map<number, number>([[a, -1]]), q = [a];
  for (let h = 0; h < q.length && !prev.has(b); h++) for (const n of C.districts[q[h]].links) if (!prev.has(n)) { prev.set(n, q[h]); q.push(n); }
  const out: number[] = []; for (let x = b; x !== -1 && x !== undefined; x = prev.get(x)!) out.unshift(x);
  return out;
}
export const pathFuel = (C: City, a: number, b: number) => hops(C, a, b) * TUNE.CITY_FUEL_PER_LINK;

// ============================ STANDING ================================
export function band(v: number): 'HATED' | 'NEUTRAL' | 'LIKED' { return v <= TUNE.STANDING_HATED ? 'HATED' : v >= TUNE.STANDING_LIKED ? 'LIKED' : 'NEUTRAL'; }
export const bandOf = (f: Fac) => cityOn() ? band(G.co.city.standing[f] ?? 0) : 'NEUTRAL';
export const hated = (f: Fac) => bandOf(f) === 'HATED';
export const liked = (f: Fac) => bandOf(f) === 'LIKED';
const clampS = (v: number) => Math.max(TUNE.STANDING_MIN, Math.min(TUNE.STANDING_MAX, v));
// Every contract's end: each standing moves STANDING_DRIFT back toward 0 (never past it)
export function drift(C: City) { for (const f of Object.keys(C.standing)) { const v = C.standing[f]; C.standing[f] = v > 0 ? Math.max(0, v - TUNE.STANDING_DRIFT) : Math.min(0, v + TUNE.STANDING_DRIFT); } }
// A completed contract's standing changes: [faction, delta] pairs (applied by settle)
export function deltasOf(o): [Fac, number][] {
  if (!o || !o.kind) return [];
  return o.kind === 'FACTION' ? [[o.emp, TUNE.STANDING_EMPLOYER_GAIN], [o.tgt, -TUNE.STANDING_TARGET_LOSS]] : [[o.tgt, -TUNE.STANDING_BROKER_LOSS]];
}
// R23 tuning 1: a job's whole effect: its deltas, plus each delta's spill onto the other factions (× STANDING_SPILL × their
// relation: hit a faction and its allies dislike you, its rivals like you; work for one and its rivals dislike you).
// [faction, total change, direct share] for every faction it moves (rounded).
export function effectsOf(o, C?: City): [Fac, number, number][] {
  const D = deltasOf(o); if (!D.length) return [];
  const tot: Record<string, number> = {}, dir: Record<string, number> = {};
  for (const [f, d] of D) { tot[f] = (tot[f] || 0) + d; dir[f] = (dir[f] || 0) + d; for (const g of FACS()) if (g !== f) tot[g] = (tot[g] || 0) + d * TUNE.STANDING_SPILL * relVal(f, g, C); }
  return FACS().filter(f => Math.round(tot[f] || 0) !== 0).map(f => [f, Math.round(tot[f]), dir[f] || 0]);
}
// The contract is over: drift, then (on COMPLETE) its deltas. Returns plain lines for the [CITY] log and WHAT IT COST.
export function settle(o, status: string): string[] {
  const C = G.co.city, before = { ...C.standing }, out: string[] = [];
  drift(C);
  const E = status === 'COMPLETE' ? effectsOf(o, C) : [];
  for (const [f, d] of E) C.standing[f] = clampS(C.standing[f] + d);
  for (const f of Object.keys(C.standing)) {
    const a = before[f], b = C.standing[f]; if (a === b) continue;
    const mv = E.find(x => x[0] === f);
    const why = !mv ? ': it fades' : mv[2] > 0 ? ': you worked for them' : mv[2] < 0 ? (o.kind === 'BROKER' ? ': you hit them (broker job)' : ': you hit them') : ': ' + spillWhy(f, o);
    out.push(facName(f) + ' ' + (b > a ? '+' : '') + (b - a) + ' → ' + b + ' (' + band(b) + ')' + why + (band(a) !== band(b) ? ' · now ' + band(b) : ''));
  }
  return out;
}

// Why faction f moved on a job it wasn't in: "Foundry's rivals: you worked for them" style
function spillWhy(f: Fac, o) {
  const L: string[] = [];
  if (o.kind === 'FACTION' && relVal(f, o.emp)) L.push((relVal(f, o.emp) < 0 ? 'you worked for their rival ' : 'you worked for their ally ') + facName(o.emp));
  if (relVal(f, o.tgt)) L.push((relVal(f, o.tgt) < 0 ? 'you hit their rival ' : 'you hit their ally ') + facName(o.tgt));
  return L.join(', ') || 'word got round';
}
// "Corporate and Foundry: RIVALS · ..." for the city screen and the runner
export function relLine(C: City = G.co.city) { const F = FACS(), L: string[] = []; for (let i = 0; i < F.length; i++) for (let j = i + 1; j < F.length; j++) L.push(facName(F[i]) + ' & ' + facName(F[j]) + ': ' + relOf(F[i], F[j], C)); return L.join(' · '); }
// ============================ WHAT STANDING DOES ======================
// Danger step of a job against faction f: its base, + STANDING_HATED_DANGER when it hates you (capped at HIGH)
export function dangerOf(f: Fac) { const N = TUNE.DANGER_NAMES.length; return Math.min(N - 1, (TUNE.CITY_FACTIONS[f]?.danger ?? 1) + (hated(f) ? TUNE.STANDING_HATED_DANGER : 0)); }
// Fuel price in district d: FUEL_PRICE × the holder's band multiplier
export function fuelPriceAt(d: number) {
  const f = G.co.city.districts[d].fac, k = hated(f) ? TUNE.STANDING_HATED_FUEL_MULT : liked(f) ? TUNE.STANDING_LIKED_FUEL_MULT : 1;
  return Math.round(TUNE.FUEL_PRICE * k);
}
// A job's fee: the danger's fee per hunt × hunts × the kind's multiplier (× STANDING_LIKED_PAY for a LIKED employer's own job)
export function feeOf(o) {
  const base = TUNE.CONTRACT_FEE[o.tier] * o.hunts;
  if (!o.kind) return base;
  return Math.round(base * (o.kind === 'FACTION' ? TUNE.CITY_FACTION_PAY * (liked(o.emp) ? TUNE.STANDING_LIKED_PAY : 1) : TUNE.CITY_BROKER_PAY));
}
// The running company contract's offer (null outside one)
export const runningOffer = () => G.co && G.ct && G.ct.status === 'ACTIVE' && G.ct.offer && G.ct.offer.kind ? G.ct.offer : null;
// Hunts of a job against a HATED faction: + STANDING_HATED_ALERT of the field awake at the drop
export function cityAlertAdd() { const o = runningOffer(); return o && hated(o.tgt) ? TUNE.STANDING_HATED_ALERT : 0; }
// A job against the enemy of a LIKED faction: the faction that hands over intel ('' none). The employer first, if it is liked.
export function intelFrom(o = runningOffer()): Fac {
  if (!o || !TUNE.STANDING_LIKED_INTEL) return '';
  if (o.kind === 'FACTION' && liked(o.emp)) return o.emp;
  return FACS().find(f => f !== o.tgt && liked(f)) || '';
}

// ============================ OFFERS ==================================
// Three offers, each in a district away from the ship, against the faction that holds it. r = the company's RNG.
export function cityOffer(r: () => number, hunts: number, avoid = -1) {
  const C: City = G.co.city, away = C.districts.filter(d => d.id !== C.at && d.id !== avoid);
  const d = away[Math.floor(r() * away.length)], tgt = d.fac;
  const kind = r() < TUNE.CITY_BROKER_CHANCE ? 'BROKER' : 'FACTION', others = FACS().filter(f => f !== tgt);
  const emp = kind === 'FACTION' ? others[Math.floor(r() * others.length)] : '';
  const o: any = { seed: (r() * 4294967296) >>> 0, hunts, d: d.id, kind, emp, tgt, tier: dangerOf(tgt), fuel: pathFuel(C, C.at, d.id) };
  o.fee = feeOf(o);
  return o;
}
export function rollCityOffers(r: () => number) {
  const [h0, h1] = TUNE.CONTRACT_HUNTS_RANGE, O: any[] = [];
  for (let i = 0; i < TUNE.CONTRACTS_OFFERED; i++) O.push(cityOffer(r, h0 + Math.floor(r() * (h1 - h0 + 1))));
  // R21 fix list 1 (never all one danger): the last moves to a district whose holder gives another danger
  if (O.length > 2 && O.every(o => o.tier === O[0].tier)) {
    const C: City = G.co.city, alt = C.districts.filter(d => d.id !== C.at && dangerOf(d.fac) !== O[0].tier);
    if (alt.length) {
      const d = alt[Math.floor(r() * alt.length)], o = O[O.length - 1], others = FACS().filter(f => f !== d.fac);
      Object.assign(o, { d: d.id, tgt: d.fac, tier: dangerOf(d.fac), fuel: pathFuel(C, C.at, d.id) });
      if (o.kind === 'FACTION' && o.emp === d.fac) o.emp = others[Math.floor(r() * others.length)];
      o.fee = feeOf(o);
    }
  }
  return O;
}
// "FACTION job: Corporate vs Foundry" / "BROKER job vs Foundry"
export function offerTitle(o) { return o.kind === 'FACTION' ? facName(o.emp) + ' vs ' + facName(o.tgt) : 'Broker job vs ' + facName(o.tgt); }
// Take offer o: the ship jumps there. Returns the [CITY] lines.
export function jump(o): string[] {
  const C: City = G.co.city, P = pathTo(C, C.at, o.d);
  C.at = o.d;
  return ['Jumped ' + P.map(i => C.districts[i].name).join(' → ') + ': ' + (P.length - 1) + ' link' + (P.length === 2 ? '' : 's') + ', ' + o.fuel + ' fuel',
    'Took ' + (o.kind === 'FACTION' ? 'a FACTION job for ' + facName(o.emp) + ' against ' + facName(o.tgt) : 'a BROKER job against ' + facName(o.tgt)) + ' in ' + C.districts[o.d].name + ' (' + TUNE.DANGER_NAMES[o.tier] + ', ' + o.fee + ' cr)' +
      (hated(o.tgt) ? '; ' + facName(o.tgt) + ' HATES you: +' + Math.round(TUNE.STANDING_HATED_ALERT * 100) + '% of the field awake' : '') + (intelFrom(o) ? '; ' + facName(intelFrom(o)) + ' shares intel' : '')];
}
// "CORP −15 HATED" style line for the [COMPANY] status
export function standingLine() { const C: City = G.co.city; return FACS().map(f => TUNE.CITY_FACTIONS[f].short + ' ' + (C.standing[f] > 0 ? '+' : '') + C.standing[f] + (band(C.standing[f]) !== 'NEUTRAL' ? ' ' + band(C.standing[f]) : '')).join(', ') + ' · at ' + C.districts[C.at].name; }
