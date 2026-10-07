// Round 21: the company screen (between contracts) and the one save slot. View only: the rules are sim/company.ts.
// Tabs, one short panel at a time: CONTRACTS (the books and the offers; cp3), ROSTER (operators, who drives which suit),
// SUITS (damage, refit; cp2), MARKET (parts, fuel, items, an ExoS, recruits; cp3), SHIP (hardpoints and modules; cp4),
// MEMORIAL. The contract flow (jobs, scan, hangar, hunt) runs as before once an offer is taken.
import { TUNE } from '../tune.ts';
import { G } from '../sim/state.ts';
import { newCompany, validCompany, fillCrew, seat, hire, hireBlock, skillName, skillEffect, isVet, nextLevelXp, canDrop, companyLine, coCode, setSuitFit, suitRefit, suitRefitBlock, suitCost, suitFit, opById,
  freeItem, offerBlock, fuelCost, runningCosts, wages, wageOf, holdCap, fuelMax, opCap, suitCap, buy, buyBlock, sellPart, modBuyBlock, buyMod, fitMod, unfitMod, unfitBlock, modCount, thinBooksCompany, checkFold } from '../sim/company.ts';
import { dmgWord } from '../sim/contract.ts';
import { partsRead } from '../sim/combat.ts';
import { frameOf } from '../sim/fit.ts';
import { fitRounds, fitShells } from '../sim/kit.ts';
import { ITEMS, byId } from '../sim/items.ts';
import { $ } from './hud.ts';
import { useSuits, ownFits, renderHangar } from './hangar.ts';

const SLOT = 'signalLance.company';
const esc = (t: string) => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
// storage wrapped like screens.ts (try/catch; memory fallback)
let mem: any = null;
function slotGet() { try { const v = localStorage.getItem(SLOT); return v ? JSON.parse(v) : mem; } catch (_) { return mem; } }
function slotSet(v) { mem = v; try { localStorage.setItem(SLOT, JSON.stringify(v)); } catch (_) {} }

let bad = false; // the saved company didn't match this build's shape: only NEW COMPANY is offered
// Load the saved company (and a contract that was running), or start one. Called once at boot.
export function loadCompany() {
  const s = slotGet();
  if (!s) { startNew(); return; }
  if (!validCompany(s.co)) { bad = true; G.co = null; return; }
  G.co = s.co; G.ct = s.ct && s.ct.status === 'ACTIVE' ? s.ct : null;
  fillCrew(); bindHangar();
}
function startNew() { bad = false; G.ct = null; newCompany((Math.random() * 4294967296) >>> 0, ownFits()); saveCompany(); bindHangar(); } // R21 cp2: A and B start from your saved hangar fits
// R21 cp2: the hangar edits the company's suits (a new fit keeps the suit's damage); cp3: only items spare in the stores fit.
// Without a company, its own two fits.
export function bindHangar() { useSuits(G.co ? G.co.suits : null, (i, f) => { setSuitFit(i, f); saveCompany(); }, id => freeItem(id)); renderHangar(); }
// Save after every hunt and every company action. A running contract is saved with it (a reload goes back to its job pick).
// The Thin books test company is never saved.
export function saveCompany() { if (G.co && !G.co.testbed) slotSet({ co: G.co, ct: G.ct && G.ct.status === 'ACTIVE' ? G.ct : null }); }
export function companyMode() { return TUNE.COMPANY_MODE && (!!G.co || bad); } // a bad save still opens the company screen (to offer NEW COMPANY)

let tab = 'CONTRACTS', wipeArm = false;
let onStart: (i: number) => void = () => {}, onResume: () => void = () => {}, onTools: () => void = () => {};
export function companyActions(start: (i: number) => void, resume: () => void, tools: () => void) { onStart = start; onResume = resume; onTools = tools; }

export function showCompany(t?: string) {
  for (const id of ['load', 'res', 'jobs', 'cres', 'tb', 'tbres', 'scan']) { const e = document.getElementById(id); if (e) e.hidden = true; }
  if (t) tab = t;
  wipeArm = false; renderCompany();
  $('co').hidden = false; $('co').scrollTop = 0;
}
const active = () => !!G.ct && G.ct.status === 'ACTIVE';
export function renderCompany() {
  $('bCoNew').textContent = wipeArm ? 'TAP AGAIN: WIPE IT' : 'NEW COMPANY';
  $('bCoNew').classList.toggle('on', wipeArm);
  const tb = G.co && G.co.testbed;
  $('bCoNew').hidden = !!tb; $('bCoTools').textContent = tb ? 'LEAVE THE TEST' : 'HANGAR · TOOLS';
  if (bad || !G.co) {
    $('coHead').textContent = 'THE COMPANY';
    $('coTabs').innerHTML = ''; $('coBody').innerHTML = '<div class="opc">The saved company is from an older build and can’t be loaded. Tap NEW COMPANY to start again.</div>';
    $('bCoGo').hidden = $('bCoTools').hidden = true; return;
  }
  checkFold(); // cp3: stranded between contracts = the company folds
  const C = G.co, R = C.rec;
  $('coHead').innerHTML = (tb ? '<span class="warnt">TEST BED · ' + esc(tb) + '</span> · ' : 'THE COMPANY · <span style="opacity:.7">code ' + esc(C.code) + '</span> · ') + 'contract ' + (C.n + 1) +
    ' · <b style="color:' + (C.credits < 0 ? '#ff8a80' : '#fc3') + '">' + C.credits + ' cr' + (C.debt ? ' DEBT' : '') + '</b> · fuel ' + C.fuel + '/' + fuelMax() + ' · parts ' + C.parts + '/' + holdCap() + (R.kia ? ' · <span class="badt">' + R.kia + ' KIA</span>' : '');
  if (C.folded) { // cp3: the end
    $('coTabs').innerHTML = '';
    $('coBody').innerHTML = '<div class="opc"><b class="badt" style="font-size:16px">THE COMPANY FOLDED</b><span>' + esc(C.folded) + '</span><span>Record: ' + R.contracts + ' contracts (' + R.complete + ' done, ' + R.failed + ' failed), ' + R.wins + '/' + R.hunts + ' hunts won, ' + R.kia + ' KIA.</span>' +
      '<span>At the end: ' + C.ops.length + ' operators (' + esc(C.ops.map(o => o.name + ' ' + o.skill + o.lvl).join(', ')) + '), ExoS ' + C.suits.map(s => s.id + (s.carry.dead ? ' lost' : '')).join(', ') + ', ship: ' + esc(C.ship.fit.map(m => TUNE.SHIP_MODULES[m].name).join(', ')) + '.</span>' +
      (C.memorial.length ? '<span>Lost: ' + esc(C.memorial.map(m => m.name).join(', ')) + '.</span>' : '') + '<span>Tap NEW COMPANY to start again.</span></div>';
    $('bCoGo').hidden = true; $('bCoTools').hidden = false; return;
  }
  const tabs = ['CONTRACTS', 'ROSTER', 'SUITS', 'MARKET', 'SHIP', 'MEMORIAL'];
  $('coTabs').innerHTML = tabs.map(t => '<button class="cotab' + (t === tab ? ' on' : '') + '" data-t="' + t + '">' + t + (t === 'MEMORIAL' && C.memorial.length ? ' (' + C.memorial.length + ')' : '') + '</button>').join('');
  $('coBody').innerHTML = { CONTRACTS: contracts, ROSTER: roster, SUITS: suits, MARKET: market, SHIP: ship, MEMORIAL: memorial }[tab]();
  $('bCoGo').hidden = !active(); $('bCoTools').hidden = active() && !tb; // a running contract stays in the company flow
  $('bCoGo').textContent = active() ? 'RESUME CONTRACT (HUNT ' + G.ct.hunt + '/' + G.ct.hunts + ')' : '';
}
// ---- CONTRACTS (cp3): the offers, then the books ----
function contracts() {
  const C = G.co, L = C.ledger;
  const books = '<div class="opc help"><b>THE BOOKS</b><span>When a contract ends you pay wages ' + wages() + ' cr (' + esc(C.ops.map(o => o.name.split(' ')[0] + ' ' + wageOf(o)).join(', ')) + '), ship upkeep ' + TUNE.UPKEEP_SHIP + (C.hullOwed ? ', hull repairs ' + C.hullOwed : '') + ': <b>' + runningCosts() + ' cr</b>.' +
    (C.debt ? ' <span class="badt">IN DEBT: be above 0 after the next contract, or the company folds.</span>' : ' Below 0 you take debt once (down to −' + TUNE.DEBT_LIMIT + '); still in debt a contract later, or deeper, and the company folds.') + '</span>' +
    (L ? '<span>Last contract (' + L.n + ', ' + L.status + '): fee ' + L.fee + ', wages −' + L.wages + ', upkeep −' + L.upkeep + (L.hull ? ', hull −' + L.hull : '') + ' → ' + L.after + ' cr.</span>' : '') + '</div>';
  if (active()) return '<div class="opc">A contract is running: RESUME it below.</div>' + books;
  const why = { FUEL: 'not enough fuel', BUSY: 'a contract is running' };
  return C.offers.map((o, i) => { const b = offerBlock(i), need = Math.min(o.hunts, Math.ceil(o.hunts * TUNE.CONTRACT_WIN_SHARE));
    return '<div class="opc"><b>' + TUNE.DANGER_NAMES[o.tier] + ' DANGER · ' + o.hunts + ' hunts</b><span>Pays <b style="color:#fc3">' + o.fee + ' cr</b> on completion (win ' + need + ' of ' + o.hunts + '), plus each hunt’s pay.</span>' +
      '<span>Field ×' + TUNE.DANGER_FIELD[o.tier] + ' · <span class="' + (b === 'FUEL' ? 'badt' : '') + '">' + fuelCost(o) + ' fuel to get there</span> (you have ' + C.fuel + ')</span>' +
      '<div class="zrow"><button class="cotake' + (b ? ' lockd' : '') + '" data-i="' + i + '">' + (b ? why[b] || 'can’t' : 'TAKE IT') + '</button></div></div>'; }).join('') + books;
}
// ---- ROSTER ----
function seatOf(id: string) { return Object.keys(G.co.crew).find(k => G.co.crew[k] === id) || ''; }
function opCard(o, buttons: string, extra = '') {
  const nx = nextLevelXp(o), pct = nx ? Math.min(100, Math.round(100 * o.xp / nx)) : 100, s = seatOf(o.id);
  const status = o.status === 'BENCH' ? '<span class="warnt">BENCHED · ' + o.bench + ' contract' + (o.bench > 1 ? 's' : '') + ' to go</span>' : s ? '<span class="okt">DRIVES ' + s + '</span>' : extra ? '' : 'reserve';
  return '<div class="opc' + (isVet(o) ? ' vet' : '') + (o.status === 'BENCH' ? ' bench' : '') + '"><b>' + esc(o.name) + (isVet(o) ? ' ★' : '') + '</b>' +
    '<span>' + skillName(o.skill) + ' ' + o.lvl + ' · ' + skillEffect(o.skill, o.lvl) + '</span>' +
    '<span>XP <span class="xp"><span style="width:' + pct + '%"></span></span> ' + o.xp + (nx ? '/' + nx : ' (top level)') + ' · ' + o.hunts + ' hunt' + (o.hunts === 1 ? '' : 's') + ' · wage ' + wageOf(o) + ' cr</span>' +
    (status ? '<span>' + status + '</span>' : '') + extra + buttons + '</div>';
}
function roster() {
  const C = G.co, seats = Object.keys(C.crew);
  return C.ops.map(o => opCard(o, active() || !canDrop(o) ? '' : '<div class="zrow">' + seats.map(s => '<button class="coseat' + (C.crew[s] === o.id ? ' on' : '') + (suitFit(s) ? '' : ' lockd') + '" data-o="' + (C.crew[s] === o.id ? '' : o.id) + '" data-s="' + s + '">' + s + '</button>').join('') + '</div>')).join('') + // cp2: tap a lit suit again to take them out of it
    '<div class="opc help"><small>' + C.ops.length + '/' + opCap() + ' on the roster (hire at the MARKET). The letter buttons put an operator in that suit (tap it again: stays aboard); you can change it before every hunt. A suit that goes down drops its operator CRITICAL: end a lancemate’s turn next to it to carry them, then get out. Carried out = benched; left behind = KIA. Each hunt you come back from: +' + TUNE.OP_XP_HUNT + ' XP (+' + TUNE.OP_XP_WIN + ' on a win); level 2 at ' + TUNE.OP_LEVELS[0] + ', 3 at ' + TUNE.OP_LEVELS[1] + '. Veterans cost more wages.</small></div>';
}
// ---- SUITS (cp2; cp3: parts) ----
export const costTxt = (q: { parts: number; cr: number }) => [q.parts ? q.parts + ' part' + (q.parts > 1 ? 's' : '') : '', q.cr ? q.cr + ' cr' : ''].filter(Boolean).join(' + ') || 'free';
function suits() {
  const C = G.co, why = { CR: 'need cr', PARTS: 'need parts' };
  const RF: [string, string][] = [['repair', 'REPAIR'], ['rounds', '+10 RDS'], ['shell', '+1 SHELL'], ['rebuild', 'REBUILD']];
  return C.suits.map(s => {
    const c = s.carry, o = opById(C.crew[s.id]);
    const btns = active() ? '' : RF.map(([k, n]) => { const b = suitRefitBlock(s.id, k); return b === 'NONE' || b === 'LOST' || b === 'CAP' ? '' : '<button class="corf' + (b ? ' lockd' : '') + '" data-s="' + s.id + '" data-k="' + k + '">' + n + '<br><small>' + costTxt(suitCost(k)) + (b ? ' · ' + why[b] : '') + '</small></button>'; }).join('');
    return '<div class="opc' + (c.dead ? ' bench' : '') + '"><b>ExoS ' + s.id + ' · ' + frameOf(s.fit).name + '</b>' +
      '<span class="' + (c.dead ? 'badt' : c.hits < c.maxHits ? 'warnt' : 'okt') + '">' + (c.dead ? 'DESTROYED: can’t drop until rebuilt' : dmgWord(c) + ' · ' + c.hits + '/' + c.maxHits + ' hits') + '</span>' +
      (c.dead ? '' : '<span>' + partsRead(c) + '</span>') +
      '<span>' + (fitRounds(s.fit) ? c.ammo + '/' + fitRounds(s.fit) + ' rds' : 'no gun') + (fitShells(s.fit) ? ' · ' + c.shells + '/' + fitShells(s.fit) + ' shells' : '') + ' · ' + (o ? 'driver ' + esc(o.name) : 'no driver') + '</span>' +
      (btns ? '<div class="zrow">' + btns + '</div>' : '') + '</div>';
  }).join('') + '<div class="opc help"><small>' + C.suits.length + '/' + suitCap() + ' ExoS (the ship’s bays). Damage, rounds and shells carry from hunt to hunt and contract to contract. A repair (1 hit) takes ' + costTxt(suitCost('repair')) + '; parts come from salvage (every kill) and the MARKET. HANGAR · TOOLS changes a suit’s fit with items from the stores; its damage stays.' + (active() ? ' Refit between hunts on the job screen.' : '') + '</small></div>';
}
// ---- MARKET (cp3): parts, fuel, items for the stores, now and then an ExoS; recruits; sell spare parts ----
function market() {
  const C = G.co, why = { CR: 'need cr', HOLD: 'hold full', TANK: 'tank full', BAY: 'no free bay' };
  const name = (L) => L.k === 'parts' ? 'PARTS' : L.k === 'fuel' ? 'FUEL' : L.k === 'suit' ? 'EXOS (Warden, standard kit)' : esc(byId(ITEMS, L.id).name);
  const note = (L) => L.k === 'parts' ? 'repairs and rebuilds · hold ' + C.parts + '/' + holdCap() : L.k === 'fuel' ? 'to reach contracts · tank ' + C.fuel + '/' + fuelMax() : L.k === 'suit' ? 'needs a free bay (' + C.suits.length + '/' + suitCap() + ')' : esc(byId(ITEMS, L.id).effect) + ' · ' + (C.stores[L.id] || 0) + ' owned, ' + freeItem(L.id) + ' spare';
  const lines = active() ? '<div class="opc">The market is open between contracts.</div>' : C.market.map((L, i) => { const b = buyBlock(i);
    return '<div class="opc"><b>' + name(L) + '</b><span>' + note(L) + '</span><span>' + L.price + ' cr · ' + L.qty + ' left</span><div class="zrow"><button class="cobuy' + (b ? ' lockd' : '') + '" data-i="' + i + '">' + (b === 'NONE' ? 'SOLD OUT' : b ? why[b] : 'BUY') + '</button>' +
      (L.k === 'parts' ? '<button class="cosell' + (C.parts ? '' : ' lockd') + '">SELL 1<br><small>+' + TUNE.PART_SELL + ' cr</small></button>' : '') + '</div></div>'; }).join('');
  const rec = active() ? '' : C.recruits.map((o, i) => { const b = hireBlock(i); return opCard(o, '<div class="zrow"><button class="cohire' + (b ? ' lockd' : '') + '" data-i="' + i + '">' + (b === 'FULL' ? 'ROSTER FULL' : b === 'CR' ? 'need cr' : 'HIRE · ' + TUNE.COST_HIRE + ' cr') + '</button></div>', '<span class="warnt">RECRUIT</span>'); }).join('');
  return lines + rec + '<div class="opc help"><small>New stock and recruits after every contract. Items you buy go into the stores; the hangar fits only what is spare there.</small></div>';
}
// ---- SHIP (cp4): hardpoints, fitted modules, the shop ----
function ship() {
  const C = G.co, S = C.ship, M = TUNE.SHIP_MODULES, why = { CR: 'need cr', OWNED: 'owned', SUITS: 'a suit is in it', OPS: 'roster too big' };
  const fitted = S.fit.map(id => { const b = active() ? 'BUSY' : unfitBlock(id); return '<button class="counfit' + (b ? ' lockd' : '') + '" data-m="' + id + '">' + M[id].name + '<br><small>' + (b === 'BUSY' ? 'fitted' : b ? why[b] : 'take off') + '</small></button>'; }).join('') +
    Array.from({ length: TUNE.SHIP_HARDPOINTS - S.fit.length }, () => '<button class="lockd">— empty —</button>').join('');
  const stored = S.stored.map(id => '<button class="cofit' + (S.fit.length >= TUNE.SHIP_HARDPOINTS || active() ? ' lockd' : '') + '" data-m="' + id + '">' + M[id].name + '<br><small>fit it</small></button>').join('');
  const shop = active() ? '' : Object.keys(M).map(id => { const b = modBuyBlock(id);
    return '<div class="opc"><b>' + M[id].name + (modCount(id) ? ' <span class="okt">×' + modCount(id) + ' fitted</span>' : '') + '</b><small>' + M[id].section + '</small><span>' + esc(M[id].does) + '</span><div class="zrow"><button class="cobmod' + (b ? ' lockd' : '') + '" data-m="' + id + '">' + (b ? why[b] : 'BUY · ' + M[id].price + ' cr') + '</button></div></div>'; }).join('');
  return '<div class="opc help" style="opacity:1"><b>THE SHIP · ' + S.fit.length + '/' + TUNE.SHIP_HARDPOINTS + ' hardpoints · carries ' + suitCap() + ' ExoS</b><div class="hslots">' + fitted + '</div>' + (stored ? '<span>In storage:</span><div class="hslots">' + stored + '</div>' : '') +
    (active() ? '<small>Modules are bought and fitted between contracts.</small>' : '') + '</div>' + shop;
}
function memorial() {
  const M = G.co.memorial;
  if (!M.length) return '<div class="opc">No one lost yet.</div>';
  return M.map(m => '<div class="opc"><b class="badt">' + esc(m.name) + '</b><span>' + skillName(m.skill) + ' ' + m.lvl + ' · ' + m.hunts + ' hunt' + (m.hunts === 1 ? '' : 's') + '</span><span>KIA, ' + esc(m.when) + '</span></div>').join('');
}
$('coTabs').addEventListener('click', ev => { const b = (ev.target as any).closest('.cotab'); if (b) { tab = b.dataset.t; wipeArm = false; renderCompany(); $('co').scrollTop = 0; } });
$('coBody').addEventListener('click', ev => {
  const t = ev.target as any, k = (sel: string) => t.closest(sel);
  if (k('.lockd')) return;
  let did = false;
  if (k('.coseat')) did = seat(k('.coseat').dataset.o, k('.coseat').dataset.s);
  else if (k('.cohire')) did = hire(+k('.cohire').dataset.i);
  else if (k('.corf')) did = suitRefit(k('.corf').dataset.s, k('.corf').dataset.k);
  else if (k('.cobuy')) did = buy(+k('.cobuy').dataset.i);
  else if (k('.cosell')) did = sellPart();
  else if (k('.cobmod')) did = buyMod(k('.cobmod').dataset.m);
  else if (k('.cofit')) did = fitMod(k('.cofit').dataset.m);
  else if (k('.counfit')) did = unfitMod(k('.counfit').dataset.m);
  else if (k('.cotake')) { const i = +k('.cotake').dataset.i; if (offerBlock(i)) return; if (inThinBooks()) { thinBooksPick(i); return; } $('co').hidden = true; onStart(i); return; }
  if (did) { saveCompany(); bindHangar(); renderCompany(); }
});
$('bCoGo').addEventListener('click', () => { if (G.co && active()) { $('co').hidden = true; onResume(); } });
$('bCoTools').addEventListener('click', () => { if (inThinBooks()) { leaveThinBooks(); return; } $('co').hidden = true; bindHangar(); onTools(); });
$('bCoNew').addEventListener('click', () => { if (!wipeArm) { wipeArm = true; renderCompany(); return; } wipeArm = false; tab = 'CONTRACTS'; startNew(); renderCompany(); });
// "[COMPANY] code 3F2A · contract 2 · ..." plus this hunt's news, for the log; the news is cleared once shown
export function companyLogLines(): string[] { if (!G.co) return []; const L = G.co.news.map(n => '[COMPANY] ' + n); L.push('[COMPANY] ' + companyLine()); return L; }
export { coCode };

// ============================ TEST BED: Thin books (cp3) ==============
// The real company (and any running contract) is set aside, a test company one contract from folding takes its place on the
// CONTRACTS tab; TAKE IT asks the scenario's question instead of starting the contract. Nothing is saved.
let stash: any = null, onPicked: (i: number) => void = () => {}, onLeave: () => void = () => {};
export function startThinBooks(picked: (i: number) => void, leave: () => void) {
  if (!stash) stash = { co: G.co, ct: G.ct };
  onPicked = picked; onLeave = leave;
  G.ct = null; thinBooksCompany(); bindHangar();
  showCompany('CONTRACTS');
}
export function inThinBooks() { return !!(G.co && G.co.testbed); }
export function leaveThinBooks() { if (stash) { G.co = stash.co; G.ct = stash.ct; stash = null; } bindHangar(); $('co').hidden = true; onLeave(); }
export function thinBooksPick(i: number) { onPicked(i); }
