// Round 21: the company. One company carried across contracts. Checkpoint 1: people (named operators with one skill,
// XP and levels, CRITICAL → carried out = benched / left behind = KIA, recruits). Checkpoint 2: the roster (START_SUITS
// suits, each with its own fit and damage that carries between contracts; before each hunt, an operator per suit that drops). The view saves G.co (and the running
// G.ct) to one localStorage slot; everything here is plain JSON so a save round-trips exactly.
// Off (G.co null) = the R11 contract flow, byte-identical: suits have no operator, a lethal hit just destroys the suit.
import { aarCarry } from './aar.ts';
import { TUNE } from '../tune.ts';
import { T } from './world.ts';
import { G } from './state.ts';
import { DEFAULT_FIT, toFit, fitRounds, fitShells, kitOf, launchBlock } from './kit.ts';
import { ITEMS, byId } from './items.ts';
import { fresh, newContract, repairWorst } from './contract.ts';
import { syncHits } from './combat.ts';

export const CO_VERSION = 3; // R21 cp2: suits. cp3: the books; cp4: the ship // bump when the save's shape changes (an old save then offers NEW COMPANY)
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
// A new company: START_SUITS suits (fits[i] if given, else the default fit; undamaged), START_OPS operators, one seated in
// each suit, RECRUITS_OFFERED recruits on offer.
export function newCompany(seed: number, fits: any[] = []) {
  const suits = 'ABCD'.slice(0, TUNE.START_SUITS).split('').map((id, i) => { const fit = structuredClone(toFit(fits[i] || DEFAULT_FIT)); return { id, fit, carry: fresh(fit) }; });
  G.co = { v: CO_VERSION, seed: seed >>> 0, code: coCode(seed), rs: seed >>> 0, nextId: 1, n: 0,
    credits: TUNE.START_CREDITS, fuel: TUNE.START_FUEL, parts: TUNE.START_PARTS, debt: false, folded: '', hullOwed: 0, ledger: null, // cp3
    stores: {} as Record<string, number>, offers: [] as any[], market: [] as any[], ship: { fit: [...TUNE.SHIP_START_MODS], stored: [] as string[] }, // cp3 / cp4
    suits, ops: [] as Op[], recruits: [] as Op[], memorial: [] as any[], crew: Object.fromEntries(suits.map(s => [s.id, ''])), news: [] as string[],
    rec: { contracts: 0, complete: 0, failed: 0, hunts: 0, wins: 0, kia: 0 } };
  for (let i = 0; i < TUNE.START_OPS; i++) G.co.ops.push(makeOp());
  for (const s of suits) for (const k of kitOf(s.fit)) G.co.stores[k.item.id] = (G.co.stores[k.item.id] || 0) + 1; // cp3: the kit on the suits is owned
  autoCrew();
  rollRecruits(); rollOffers(); rollMarket();
  return G.co;
}
// A loaded save is used only if its shape matches this build (no migrations: a mismatch offers NEW COMPANY).
export function validCompany(co: any) {
  return !!co && co.v === CO_VERSION && Array.isArray(co.ops) && Array.isArray(co.recruits) && Array.isArray(co.memorial) && Array.isArray(co.suits) && !!co.ship && Array.isArray(co.offers) && !!co.stores && !!co.crew && !!co.rec && typeof co.rs === 'number';
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

// Who can drop: OK operators, in a suit that isn't destroyed. A suit with an operator in its seat drops; an empty seat stays aboard.
export function canDrop(o: Op | null) { return !!o && o.status === 'OK'; }
export const suitById = (id: string) => G.co.suits.find(s => s.id === id) || null;
// The suit's carry right now: the running contract's while one runs, else the company's
export function suitCarry(id: string) { return G.ct && G.ct.status === 'ACTIVE' && G.ct.carry && G.ct.carry[id] ? G.ct.carry[id] : suitById(id)?.carry; }
export function suitFit(s: string) { const x = suitById(s); return !!x && !suitCarry(s)?.dead && !launchBlock(x.fit); } // cp3: a fit that can't launch can't drop
// Clear seats that can't drop (benched / KIA operator, destroyed suit, an operator seated twice). Never fills a seat.
export function fillCrew() {
  const C = G.co, taken = new Set<string>();
  for (const s of C.suits.map(x => x.id)) if (!(s in C.crew)) C.crew[s] = '';
  for (const s of Object.keys(C.crew)) { const o = opById(C.crew[s]); if (canDrop(o) && suitFit(s) && !taken.has(o.id)) taken.add(o.id); else C.crew[s] = ''; }
}
// Fill every empty seat of a suit that can drop with the first free operator (a new company; the runner)
export function autoCrew() {
  fillCrew(); const C = G.co, taken = new Set(Object.values(C.crew).filter(Boolean));
  for (const s of Object.keys(C.crew)) if (!C.crew[s] && suitFit(s)) { const o = C.ops.find(x => canDrop(x) && !taken.has(x.id)); if (o) { C.crew[s] = o.id; taken.add(o.id); } }
}
// Seat operator id in suit s ('' = the suit stays aboard). A seated operator moves; whoever sat in s swaps into its old seat.
export function seat(id: string, s: string) {
  const C = G.co; if (!(s in C.crew)) return false;
  if (!id) { C.crew[s] = ''; return true; }
  const o = opById(id); if (!canDrop(o) || !suitFit(s)) return false;
  const from = Object.keys(C.crew).find(k => C.crew[k] === id), was = C.crew[s];
  C.crew[s] = id; if (from && from !== s) C.crew[from] = was;
  return true;
}
// The pick before a hunt: suit s's seat steps through stays aboard → each free operator (not seated elsewhere) → stays aboard
export function cycleSeat(s: string) {
  const C = G.co, free = C.ops.filter(o => canDrop(o) && !Object.keys(C.crew).some(k => k !== s && C.crew[k] === o.id)).map(o => o.id);
  const list = ['', ...free], i = list.indexOf(C.crew[s]);
  return seat(list[(i + 1) % list.length], s);
}
export const lanceSize = () => Object.keys(G.co.crew).filter(s => G.co.crew[s] && suitFit(s)).length;
// The hunt's operators, per suit id (newHunt reads G.crew; null = no company, suits have no operator)
export function crewForHunt() { const C = G.co; fillCrew(); const out: any = {}; for (const s of Object.keys(C.crew)) out[s] = opById(C.crew[s]); return out; }

// ============================ THE SHIP (cp4) ==========================
// co.ship.fit: the modules on the hull's hardpoints (ids; SUIT_BAY may repeat); co.ship.stored: bought, not fitted.
export const modCount = (id: string) => G.co ? G.co.ship.fit.filter(m => m === id).length : 0;
export const hasMod = (id: string) => modCount(id) > 0;
// A company contract is running (the ship's modules act on the scan and the drop only then: never in the test bed or PLAY SEED)
export const inCompanyHunt = () => !!G.co && !!G.ct;
const SCAN_MOD = { RADAR: 'RADAR_ARRAY', THERMAL: 'THERMAL_POD', EM: 'EM_SUITE' };
// RADAR ARRAY / THERMAL POD / EM SUITE: that sensor's speed and loudness on the scan (1 / 1 without the module)
export function shipScan(sensor: string) { const on = inCompanyHunt() && hasMod(SCAN_MOD[sensor]); return { speed: on ? TUNE.MOD_SCAN_SPEED : 1, loud: on ? TUNE.MOD_SCAN_LOUD : 1 }; }
// QUIET DROP RIG: × the share of the field that wakes at the drop
export function shipAlertMult() { return inCompanyHunt() && hasMod('QUIET_DROP') ? TUNE.MOD_QUIET_DROP : 1; }
export const suitCap = () => TUNE.SHIP_BAYS_BUILT_IN + modCount('SUIT_BAY');
export const opCap = () => TUNE.OP_CAP + (hasMod('BERTHS') ? TUNE.MOD_BERTHS : 0);
export const holdCap = () => TUNE.HOLD_CAP + (hasMod('SALVAGE_HOLD') ? TUNE.MOD_HOLD : 0);
export const fuelMax = () => TUNE.FUEL_MAX + (hasMod('FUEL_TANKS') ? TUNE.MOD_FUEL : 0);
export const benchFor = () => Math.max(1, TUNE.OP_BENCH - (hasMod('MEDBAY') ? TUNE.MOD_BENCH : 0));
export const partsPerRepair = () => Math.max(1, TUNE.PARTS_PER_REPAIR - (hasMod('REPAIR_BAY') ? TUNE.MOD_REPAIR_PARTS : 0));
export const rebuildParts = () => hasMod('REPAIR_BAY') ? Math.ceil(TUNE.REBUILD_PARTS / 2) : TUNE.REBUILD_PARTS;
export const fuelCost = (o) => hasMod('ENGINES') ? Math.ceil(o.fuel * TUNE.MOD_ENGINES) : o.fuel;
// Buy a module from the ship shop (fitted at once if a hardpoint is free, else stored). '' = ok, else why not.
export function modBuyBlock(id: string) {
  const M = TUNE.SHIP_MODULES[id]; if (!M) return 'NONE';
  if (!M.many && (G.co.ship.fit.includes(id) || G.co.ship.stored.includes(id))) return 'OWNED';
  if (G.co.credits < M.price) return 'CR';
  return '';
}
export function buyMod(id: string) {
  if (modBuyBlock(id)) return false;
  const S = G.co.ship; spend(TUNE.SHIP_MODULES[id].price);
  if (S.fit.length < TUNE.SHIP_HARDPOINTS) S.fit.push(id); else S.stored.push(id);
  G.co.news.push('Bought the ' + TUNE.SHIP_MODULES[id].name + (S.fit.includes(id) ? ', fitted' : ', in storage (no free hardpoint)') + '.');
  return true;
}
// Fit a stored module / take a fitted one off (a SUIT BAY can't come off while its suit is aboard)
export function fitMod(id: string) { const S = G.co.ship, i = S.stored.indexOf(id); if (i < 0 || S.fit.length >= TUNE.SHIP_HARDPOINTS) return false; S.stored.splice(i, 1); S.fit.push(id); return true; }
export function unfitBlock(id: string) { if (!G.co.ship.fit.includes(id)) return 'NONE'; if (id === 'SUIT_BAY' && G.co.suits.length > suitCap() - 1) return 'SUITS'; if (id === 'BERTHS' && G.co.ops.length > TUNE.OP_CAP) return 'OPS'; return ''; }
export function unfitMod(id: string) { if (unfitBlock(id)) return false; const S = G.co.ship; S.fit.splice(S.fit.indexOf(id), 1); S.stored.push(id); return true; }

// ============================ THE BOOKS (cp3) =========================
// Every credit spent: the company's wallet, and the running contract's mirror of it (so pullContract never undoes a spend)
export function spend(n: number) { G.co.credits -= n; if (G.ct && G.ct.status === 'ACTIVE' && G.ct.ids) { G.ct.credits -= n; G.ct.spent += n; } }
function earn(n: number) { G.co.credits += n; if (G.ct && G.ct.status === 'ACTIVE' && G.ct.ids) { G.ct.credits += n; G.ct.earned += n; } }
export const wageOf = (o: Op) => Math.round(TUNE.WAGE_OP * (1 + TUNE.WAGE_LEVEL_MULT * (o.lvl - 1)));
export const wages = () => G.co.ops.reduce((a, o) => a + wageOf(o), 0);
// What the next contract's end will cost: wages, ship upkeep, hull hits owed
export const runningCosts = () => wages() + TUNE.UPKEEP_SHIP + (G.co.hullOwed || 0);
// Contracts on offer: length, danger, fuel to get there, fee on completion. Seeded on the company's RNG.
export function rollOffers() {
  const C = G.co, [h0, h1] = TUNE.CONTRACT_HUNTS_RANGE, [f0, f1] = TUNE.FUEL_PER_JUMP;
  C.offers = [];
  for (let i = 0; i < TUNE.CONTRACTS_OFFERED; i++) {
    const hunts = h0 + Math.floor(corand() * (h1 - h0 + 1)), tier = Math.floor(corand() * TUNE.DANGER_NAMES.length), fuel = f0 + Math.floor(corand() * (f1 - f0 + 1));
    C.offers.push({ seed: (corand() * 4294967296) >>> 0, hunts, tier, fuel, fee: TUNE.CONTRACT_FEE[tier] * hunts });
  }
  // R21 fix list 1 (Jamie: "never 3 of the same"): if every offer rolled one danger, the last takes another
  const O = C.offers, N = TUNE.DANGER_NAMES.length;
  if (O.length > 2 && O.every((o: any) => o.tier === O[0].tier)) {
    const o = O[O.length - 1]; o.tier = (o.tier + 1 + Math.floor(corand() * (N - 1))) % N; o.fee = TUNE.CONTRACT_FEE[o.tier] * o.hunts;
  }
}
export function offerBlock(i: number) { const o = G.co.offers[i]; if (!o) return 'NONE'; if (G.ct && G.ct.status === 'ACTIVE') return 'BUSY'; if (G.co.fuel < fuelCost(o)) return 'FUEL'; if (!lanceSize()) return 'LANCE'; return ''; }
// Take offer i: burn the fuel, start the contract on the company's suits (its danger scales the field, its length sets the wins needed)
export function takeOffer(i: number, hunts?: number) {
  if (offerBlock(i)) return false;
  const C = G.co, o = C.offers[i]; C.fuel -= fuelCost(o);
  const n = hunts || o.hunts;
  startCompanyContract(o.seed, n);
  Object.assign(G.ct, { tier: o.tier, fee: o.fee, fieldMult: TUNE.DANGER_FIELD[o.tier], need: Math.min(n, Math.ceil(n * TUNE.CONTRACT_WIN_SHARE)), offer: { ...o }, armourUsed: false });
  C.news.push('Took a ' + TUNE.DANGER_NAMES[o.tier] + ' danger contract: ' + n + ' hunts, ' + o.fee + ' cr on completion, ' + fuelCost(o) + ' fuel to get there.');
  return true;
}
// The market: parts, fuel, hangar items, now and then an ExoS. Rolled between contracts (seeded).
export function rollMarket() {
  const C = G.co, L: any[] = [{ k: 'parts', qty: TUNE.MARKET_PARTS_QTY, price: TUNE.PART_PRICE }, { k: 'fuel', qty: TUNE.MARKET_FUEL_QTY, price: TUNE.FUEL_PRICE }];
  if (corand() < TUNE.MARKET_SUIT_CHANCE) L.push({ k: 'suit', qty: 1, price: TUNE.COST_SUIT });
  const pool = TUNE.HANGAR_ITEMS.filter(id => byId(ITEMS, id)?.price).slice();
  while (L.length < TUNE.MARKET_STOCK && pool.length) { const id = pool.splice(Math.floor(corand() * pool.length), 1)[0]; L.push({ k: 'item', id, qty: 1 + Math.floor(corand() * 2), price: byId(ITEMS, id).price }); }
  C.market = L;
}
export function buyBlock(i: number) {
  const C = G.co, L = C.market[i]; if (!L || L.qty <= 0) return 'NONE';
  if (L.k === 'parts' && C.parts >= holdCap()) return 'HOLD';
  if (L.k === 'fuel' && C.fuel >= fuelMax()) return 'TANK';
  if (L.k === 'suit' && C.suits.length >= suitCap()) return 'BAY';
  if (C.credits < L.price) return 'CR';
  return '';
}
export function buy(i: number) {
  if (buyBlock(i)) return false;
  const C = G.co, L = C.market[i]; spend(L.price); L.qty--;
  if (L.k === 'parts') C.parts++;
  if (L.k === 'fuel') C.fuel++;
  if (L.k === 'item') C.stores[L.id] = (C.stores[L.id] || 0) + 1;
  if (L.k === 'suit') { const id = 'ABCD'.split('').find(x => !C.suits.some(s => s.id === x)), fit = structuredClone(DEFAULT_FIT); C.suits.push({ id, fit, carry: fresh(fit) }); for (const k of kitOf(fit)) C.stores[k.item.id] = (C.stores[k.item.id] || 0) + 1; C.crew[id] = ''; C.news.push('Bought ExoS ' + id + ' (standard kit).'); }
  return true;
}
export function sellPart() { const C = G.co; if (C.parts <= 0) return false; C.parts--; earn(TUNE.PART_SELL); return true; }
// Hangar items the company owns (stores) less those fitted on its suits: what's free to fit
export function fittedCount(id: string) { return G.co.suits.reduce((a, s) => a + kitOf(s.fit).filter(k => k.item.id === id).length, 0); }
export const freeItem = (id: string) => (G.co.stores[id] || 0) - fittedCount(id);
// The company folds: past its debt limit, or still in debt a contract after taking it. One plain end screen, then NEW COMPANY.
// Between contracts: fold now if the company can't go on (the view checks it on every company screen)
export function checkFold() { const C = G.co; if (!C || C.folded || C.testbed || (G.ct && G.ct.status === 'ACTIVE')) return; const w = stuck(); if (w) fold(w); }
function fold(why: string) { const C = G.co; C.folded = why; C.news.push('THE COMPANY FOLDS: ' + why); }

// R21 cp2: the company can't field a lance (every suit destroyed with no way to rebuild one, no operator to drop or hire), or
// (cp3) no contract it can reach and no way to buy the fuel. cp3: that folds it.
export function stuck() {
  const C = G.co; if (C.folded) return C.folded;
  const rebuild = C.suits.some(s => s.carry.dead && C.parts >= suitCost('rebuild', s.id).parts && C.credits >= suitCost('rebuild', s.id).cr), suits = C.suits.some(s => !s.carry.dead) || rebuild; // a fit that can't launch can be fixed in the hangar: not stuck
  const ops = C.ops.some(canDrop) || C.ops.some(o => o.status === 'BENCH') || (C.recruits.length > 0 && C.credits >= TUNE.COST_HIRE);
  const fuelLine = (C.market || []).find(l => l.k === 'fuel'), canBuy = fuelLine ? Math.min(fuelLine.qty, Math.floor(Math.max(0, C.credits) / fuelLine.price)) : 0;
  const reach = !C.offers || C.offers.some(o => fuelCost(o) <= C.fuel + canBuy);
  return !suits ? 'every ExoS is destroyed and there is no way to rebuild one' : !ops ? 'no operator is left to drop' : !reach ? 'no contract is in reach and there is no fuel to be had' : '';
}

// ============================ SUITS ===================================
// A contract on the company's suits: their fits, their damage, the company's credits.
export function startCompanyContract(seed: number, hunts?: number) {
  const C = G.co;
  newContract(seed, C.suits.map(s => s.fit), hunts, C.suits.map(s => s.id));
  for (const s of C.suits) G.ct.carry[s.id] = structuredClone(s.carry);
  G.ct.credits = C.credits;
  fillCrew();
}
// After a hunt / a refit / a relock: the contract's damage, ammo and credits go back to the company's suits.
export function pullContract() {
  const C = G.co, K = G.ct; if (!C || !K || !K.ids) return;
  for (const s of C.suits) { const i = K.ids.indexOf(s.id); if (i < 0) continue; s.carry = structuredClone(K.carry[s.id]); s.fit = structuredClone(K.loads[i]); }
  C.credits = K.credits;
}
// A new fit on suit i (the hangar): its damage is kept part by part (hits missing stay missing; CORE never drops below 1
// while it stands); rounds and shells stay, up to the new fit's full load.
export function setSuitFit(i: number, fit) {
  const s = G.co.suits[i]; if (!s) return;
  const old = s.carry, nf = structuredClone(toFit(fit)), c = fresh(nf);
  if (old.dead) { c.dead = true; (c as any).recovered = !!(old as any).recovered; for (const p of Object.keys(c.parts)) c.parts[p] = 0; } // R22: a recovered wreck stays recovered
  else for (const p of Object.keys(c.parts)) { const miss = old.pmax[p] !== undefined ? old.pmax[p] - old.parts[p] : 0; c.parts[p] = Math.max(p === 'CORE' ? 1 : 0, c.pmax[p] - miss); }
  syncHits(c); if (c.dead) c.hits = 0;
  c.ammo = Math.min(old.ammo, fitRounds(nf)); c.shells = Math.min(old.shells, fitShells(nf));
  s.fit = nf; s.carry = c;
}
// The refit on the company's own suits (between hunts on the job screen, between contracts on the SUITS tab), up to full.
// cp3: a repair takes parts + credits, a rebuild parts + credits; reloads take credits (cp4 ARMOURY: 1 part instead).
export function suitCost(what: string, id?: string) {
  const arm = hasMod('ARMOURY');
  if (what === 'rebuild' && id && suitNow(id).c?.recovered) return { parts: Math.ceil(rebuildParts() * TUNE.RECOVER_MULT), cr: Math.ceil(TUNE.REBUILD_CR * TUNE.RECOVER_MULT) }; // R22: brought home from a held field
  return { repair: { parts: partsPerRepair(), cr: TUNE.REPAIR_CR }, rounds: arm ? { parts: 1, cr: 0 } : { parts: 0, cr: TUNE.COST_ROUNDS },
    shell: arm ? { parts: 1, cr: 0 } : { parts: 0, cr: TUNE.COST_SHELL }, rebuild: { parts: rebuildParts(), cr: TUNE.REBUILD_CR } }[what];
}
// The suit's carry and fit as they stand now (the running contract's while one runs)
function suitNow(id: string) { const K = G.ct && G.ct.status === 'ACTIVE' && G.ct.ids ? G.ct : null, i = K ? K.ids.indexOf(id) : -1; const s = suitById(id); return { c: i >= 0 ? K.carry[id] : s?.carry, f: i >= 0 ? K.loads[i] : s?.fit }; }
export function suitRefitBlock(id: string, what: string) {
  if (!suitById(id)) return 'NONE';
  const { c, f } = suitNow(id), gun = fitRounds(f) > 0, mortar = fitShells(f) > 0;
  if (what === 'rebuild') { if (!c.dead) return 'NONE'; } else if (c.dead) return 'LOST';
  if (what === 'repair' && c.hits >= c.maxHits) return 'CAP';
  if (what === 'rounds' && (!gun || c.ammo >= fitRounds(f))) return gun ? 'CAP' : 'NONE';
  if (what === 'shell' && (!mortar || c.shells >= fitShells(f))) return mortar ? 'CAP' : 'NONE';
  const k = suitCost(what, id);
  if (G.co.parts < k.parts) return 'PARTS';
  if (G.co.credits < k.cr) return 'CR';
  return '';
}
export function suitRefit(id: string, what: string) {
  if (suitRefitBlock(id, what) !== '') return false;
  const { c, f } = suitNow(id), k = suitCost(what, id);
  if (what === 'repair') repairWorst(c);
  if (what === 'rounds') c.ammo = Math.min(fitRounds(f), c.ammo + 10);
  if (what === 'shell') c.shells++;
  if (what === 'rebuild') { c.dead = false; c.recovered = false; c.parts = { ...c.pmax }; syncHits(c); c.ammo = fitRounds(f); c.shells = fitShells(f); }
  G.co.parts -= k.parts; spend(k.cr);
  if (G.ct && G.ct.status === 'ACTIVE' && G.ct.ids) { G.ct.buys.push(id + ' ' + what); pullContract(); }
  return true;
}

// Hire recruit i (cp3: COST_HIRE credits; the roster caps at opCap()). '' = done, else why not.
export function hireBlock(i: number) { const C = G.co; if (!C.recruits[i]) return 'NONE'; if (C.ops.length >= opCap()) return 'FULL'; if (C.credits < TUNE.COST_HIRE) return 'CR'; return ''; }
export function hire(i: number) {
  if (hireBlock(i)) return false;
  const C = G.co, o = C.recruits.splice(i, 1)[0];
  spend(TUNE.COST_HIRE); C.ops.push(o); C.news.push('Hired ' + o.name + ' (' + skillName(o.skill) + ')' + (TUNE.COST_HIRE ? ' for ' + TUNE.COST_HIRE + ' cr' : '') + '.');
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
  for (const d of G.lance) if (d !== m && d.crit && !d.carriedBy && Math.hypot(d.x - m.x, d.y - m.y) / T <= TUNE.OP_CARRY_RANGE) { d.carriedBy = m.id; G.carryLog = (G.carryLog || []).concat({ who: d.id, by: m.id, turn: G.turn }); aarCarry(m, d); }
}
// How a CRITICAL operator's hunt ended: carried by a lancemate still standing (out or on the map), or the field cleared = SAVED;
// otherwise KIA (cp4: the MEDBAY may still pull them out, rolled once in afterHunt and kept on m.fate). Not critical = OK.
export function fateOf(m): 'OK' | 'SAVED' | 'KIA' {
  if (m.fate) return m.fate;
  if (!m.crit) return 'OK';
  const by = m.carriedBy ? G.lance.find(x => x.id === m.carriedBy) : null;
  if (by && !by.dead) return 'SAVED';
  if (G.units.length && G.kills >= G.units.length) return 'SAVED';
  return 'KIA';
}

// ============================ AFTER THE HUNT ==========================
// Called once per contract hunt (finishHunt). XP and levels for those who came back, bench for the carried, KIA for the left;
// salvage into the hold; a painted ship's hull hit. Writes plain lines to co.news (the result screen and the [COMPANY] log
// show them, then the view clears them).
export function afterHunt() {
  const C = G.co; if (!C || !G.ct) return;
  const won = G.outcome.startsWith('WIN');
  C.rec.hunts++; if (won) C.rec.wins++;
  for (const m of G.lance) {
    const o = m.op ? opById(m.op.id) : null; if (!o) continue;
    let f = fateOf(m);
    if (f === 'KIA' && hasMod('MEDBAY') && corand() < TUNE.MEDBAY_SAVE) { f = 'SAVED'; m.medbay = true; } // cp4
    m.fate = f;
    if (f === 'OK') {
      o.hunts++; o.xp += TUNE.OP_XP_HUNT + (won ? TUNE.OP_XP_WIN : 0);
      const L = levelOf(o.xp);
      if (L > o.lvl) { o.lvl = L; C.news.push(o.name + ' (' + m.id + ') is now ' + skillName(o.skill) + ' ' + L + (L === 2 ? ', a veteran' : '') + ': ' + skillEffect(o.skill, L) + ' (wage now ' + wageOf(o) + ' cr).'); }
      else C.news.push(o.name + ' (' + m.id + ') +' + (TUNE.OP_XP_HUNT + (won ? TUNE.OP_XP_WIN : 0)) + ' XP (' + o.xp + (nextLevelXp(o) ? '/' + nextLevelXp(o) : '') + ').');
    } else if (f === 'SAVED') {
      o.status = 'BENCH'; o.bench = benchFor(); o.hurtIn = C.n;
      C.news.push(o.name + ' (' + m.id + ') went CRITICAL and was ' + (m.medbay ? 'left behind, but the MEDBAY team pulled them out' : m.carriedBy ? 'carried out by ' + m.carriedBy : 'recovered from the cleared field') + ': benched for ' + o.bench + ' contract' + (o.bench > 1 ? 's' : '') + '.');
    } else {
      C.ops = C.ops.filter(x => x !== o); C.rec.kia++;
      C.memorial.unshift({ name: o.name, skill: o.skill, lvl: o.lvl, hunts: o.hunts, when: 'contract ' + (C.n + 1) + ', hunt ' + G.ct.hunt });
      C.memorial = C.memorial.slice(0, TUNE.OP_MEMORIAL);
      C.news.push(o.name + ' (' + m.id + ') went CRITICAL and was left behind: KIA.');
    }
  }
  // cp3: salvage. Every field unit destroyed puts parts in the hold, up to its cap
  const got = G.kills * TUNE.SALVAGE_PER_KILL, room = Math.max(0, holdCap() - C.parts), kept = Math.min(got, room);
  C.parts += kept; G.salvage = kept; // R22: WHAT IT COST
  if (got) C.news.push('Salvage: ' + kept + ' part' + (kept === 1 ? '' : 's') + ' into the hold (' + C.parts + '/' + holdCap() + ')' + (got > kept ? ', ' + (got - kept) + ' left behind: the hold is full' : '') + '.');
  // cp4: a painted ship may take a hull hit (paid when the contract ends); HULL ARMOUR soaks one per contract
  const S = G.scanCost;
  if (S && S.painted && corand() < TUNE.SHIP_HIT_CHANCE) {
    if (hasMod('HULL_ARMOUR') && !G.ct.armourUsed) { G.ct.armourUsed = true; S.hull = 'soaked'; C.news.push('The ship was painted and hit: the HULL ARMOUR soaked it.'); }
    else { C.hullOwed = (C.hullOwed || 0) + TUNE.SHIP_HIT_COST; S.hull = 'hit'; C.news.push('The ship was painted and took a hull hit: ' + TUNE.SHIP_HIT_COST + ' cr to repair when the contract ends.'); }
  } else if (S && S.painted) S.hull = 'missed';
  fillCrew();
}
// The contract is over (complete, failed, or quit): the fee, then wages, upkeep and hull repairs; debt or the fold; the bench
// ticks down (not for those hurt in this one); new recruits, offers and market.
export function endContract(status: string) {
  const C = G.co; if (!C) return;
  C.rec.contracts++; if (status === 'COMPLETE') C.rec.complete++; else C.rec.failed++;
  const fee = status === 'COMPLETE' && G.ct && G.ct.fee ? G.ct.fee : 0;
  if (fee) { C.credits += fee; C.news.push('Contract complete: the fee, ' + fee + ' cr.'); }
  const w = wages(), up = TUNE.UPKEEP_SHIP, hull = C.hullOwed || 0, cost = w + up + hull;
  C.credits -= cost; C.hullOwed = 0;
  C.ledger = { fee, wages: w, upkeep: up, hull, after: C.credits, n: C.n + 1, status };
  C.news.push('Paid ' + cost + ' cr: wages ' + w + ' (' + C.ops.length + ' operators), upkeep ' + up + (hull ? ', hull repairs ' + hull : '') + '. Credits now ' + C.credits + '.');
  if (C.credits < -TUNE.DEBT_LIMIT) fold('debt of ' + -C.credits + ' cr, past the limit of ' + TUNE.DEBT_LIMIT + '.');
  else if (C.credits < 0 && C.debt) fold('still in debt (' + C.credits + ' cr) a contract after going into it.');
  else if (C.credits < 0) { C.debt = true; C.news.push('IN DEBT (' + C.credits + ' cr). Get back above 0 by the end of the next contract, or the company folds.'); }
  else { if (C.debt) C.news.push('Out of debt.'); C.debt = false; }
  for (const o of C.ops) if (o.status === 'BENCH' && o.hurtIn !== C.n && --o.bench <= 0) { o.status = 'OK'; o.bench = 0; C.news.push(o.name + ' is back from the bench.'); }
  C.n++;
  rollRecruits(); rollOffers(); rollMarket();
  fillCrew();
  if (!C.folded) { const why = stuck(); if (why) fold(why); }
}
// "code 3F2A · contract 4 · 4 on the roster (2 vets), 1 benched, 1 KIA · …"
export function companyLine() {
  const C = G.co, suits = C.suits.map(s => s.id + (s.carry.dead ? ' LOST' : s.carry.hits < s.carry.maxHits ? ' ' + s.carry.hits + '/' + s.carry.maxHits : ' ok')).join(' '), vets = C.ops.filter(isVet).length, bench = C.ops.filter(o => o.status === 'BENCH').length;
  return 'code ' + C.code + ' · contract ' + (C.n + 1) + ' · ' + C.ops.length + ' on the roster' + (vets ? ' (' + vets + ' vet' + (vets > 1 ? 's' : '') + ')' : '') + (bench ? ', ' + bench + ' benched' : '') + (C.rec.kia ? ', ' + C.rec.kia + ' KIA' : '') +
    ' · ' + C.ops.map(o => o.name.split(' ')[0] + ' ' + o.skill + o.lvl + (o.status === 'BENCH' ? ' bench' + o.bench : '')).join(', ') + ' · suits ' + suits +
    ' · ' + C.credits + ' cr' + (C.debt ? ' (DEBT)' : '') + ' · fuel ' + C.fuel + '/' + fuelMax() + ' · parts ' + C.parts + '/' + holdCap() + ' · ship ' + (C.ship.fit.join(' ') || 'bare') + (C.folded ? ' · FOLDED' : '');
}
// Per suit with an operator, how its hunt ended: "B Jok Okafor (QUIET MOVER 1): CRITICAL, carried out by A: lives"
export function crewLines() {
  return G.lance.filter(m => m.op).map(m => {
    const f = fateOf(m), o = m.op;
    return m.id + ' ' + o.name + ' (' + skillName(o.skill) + ' ' + o.lvl + '): ' + (f === 'OK' ? (m.out ? 'extracted' : 'came back') : f === 'SAVED' ? 'CRITICAL, ' + (m.medbay ? 'pulled out by the MEDBAY team' : m.carriedBy ? 'carried out by ' + m.carriedBy : 'field cleared') + ': lives' : 'CRITICAL, left behind: KIA');
  });
}
// ============================ TEST BED: Thin books (cp3) ==============
// A company one contract from folding (in debt), fuel for two of three offers: rich and far, safe and poor, mid. Not saved.
export function thinBooksCompany() {
  newCompany(2103);
  const C = G.co;
  C.credits = -120; C.debt = true; C.fuel = 4; C.parts = 3; C.n = 4; C.rec = { contracts: 4, complete: 2, failed: 2, hunts: 11, wins: 6, kia: 1 };
  C.offers = [
    { seed: 210301, hunts: 4, tier: 2, fuel: 4, fee: TUNE.CONTRACT_FEE[2] * 4 },
    { seed: 210302, hunts: 2, tier: 0, fuel: 1, fee: TUNE.CONTRACT_FEE[0] * 2 },
    { seed: 210303, hunts: 3, tier: 1, fuel: 2, fee: TUNE.CONTRACT_FEE[1] * 3 },
  ];
  C.suits[1].carry.parts.LEGS = Math.max(0, C.suits[1].carry.parts.LEGS - 2); syncHits(C.suits[1].carry);
  C.testbed = 'Thin books';
  return C;
}
