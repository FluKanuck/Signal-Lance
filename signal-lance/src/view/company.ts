// Round 21: the company screen (between contracts) and the one save slot. View only: the rules are sim/company.ts.
// Tabs, one short panel at a time: ROSTER (who drives which suit), SUITS (damage, refit; cp2), RECRUITS, MEMORIAL. The contract flow (jobs, scan, hangar,
// hunt) runs as before once START CONTRACT is tapped.
import { TUNE } from '../tune.ts';
import { G } from '../sim/state.ts';
import { newCompany, validCompany, fillCrew, seat, hire, hireBlock, skillName, skillEffect, isVet, nextLevelXp, canDrop, companyLine, coCode, stuck, setSuitFit, suitRefit, suitRefitBlock, SUIT_COST, suitFit, opById } from '../sim/company.ts';
import { dmgWord } from '../sim/contract.ts';
import { partsRead } from '../sim/combat.ts';
import { frameOf } from '../sim/fit.ts';
import { fitRounds, fitShells } from '../sim/kit.ts';
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
// R21 cp2: the hangar edits the company's suits (a new fit keeps the suit's damage); without a company, its own two fits
export function bindHangar() { useSuits(G.co ? G.co.suits : null, (i, f) => { setSuitFit(i, f); saveCompany(); }); renderHangar(); }
// Save after every hunt and every company action. A running contract is saved with it (a reload goes back to its job pick).
export function saveCompany() { if (G.co) slotSet({ co: G.co, ct: G.ct && G.ct.status === 'ACTIVE' ? G.ct : null }); }
export function companyMode() { return TUNE.COMPANY_MODE && (!!G.co || bad); } // a bad save still opens the company screen (to offer NEW COMPANY)

let tab = 'ROSTER', wipeArm = false;
let onStart: () => void = () => {}, onResume: () => void = () => {}, onTools: () => void = () => {};
export function companyActions(start: () => void, resume: () => void, tools: () => void) { onStart = start; onResume = resume; onTools = tools; }

export function showCompany() {
  for (const id of ['load', 'res', 'jobs', 'cres', 'tb', 'tbres', 'scan']) { const e = document.getElementById(id); if (e) e.hidden = true; }
  wipeArm = false; renderCompany();
  $('co').hidden = false; $('co').scrollTop = 0;
}
export function renderCompany() {
  $('bCoNew').textContent = wipeArm ? 'TAP AGAIN: WIPE IT' : 'NEW COMPANY';
  $('bCoNew').classList.toggle('on', wipeArm);
  if (bad || !G.co) {
    $('coHead').textContent = 'THE COMPANY';
    $('coTabs').innerHTML = ''; $('coBody').innerHTML = '<div class="opc">The saved company is from an older build and can’t be loaded. Tap NEW COMPANY to start again.</div>';
    $('bCoGo').hidden = $('bCoTools').hidden = true; return;
  }
  const C = G.co, R = C.rec, active = !!G.ct && G.ct.status === 'ACTIVE';
  $('coHead').innerHTML = 'THE COMPANY · <span style="opacity:.7">code ' + esc(C.code) + '</span> · contract ' + (C.n + 1) + ' · <b style="color:#fc3">' + C.credits + ' cr</b> · record ' + R.complete + ' done / ' + R.failed + ' failed · ' + R.wins + '/' + R.hunts + ' hunts won' + (R.kia ? ' · <span class="badt">' + R.kia + ' KIA</span>' : '');
  $('coTabs').innerHTML = ['ROSTER', 'SUITS', 'RECRUITS', 'MEMORIAL'].map(t => '<button class="cotab' + (t === tab ? ' on' : '') + '" data-t="' + t + '">' + t + (t === 'RECRUITS' ? ' (' + C.recruits.length + ')' : t === 'MEMORIAL' && C.memorial.length ? ' (' + C.memorial.length + ')' : '') + '</button>').join('');
  if (!active && stuck()) { $('coBody').innerHTML = '<div class="opc"><b class="badt">The company can’t field a lance.</b><span>Every suit is destroyed and there aren’t the credits to rebuild one (' + TUNE.COST_REBUILD + ' cr), or no operator is left. Debt and folding arrive with the books (next checkpoint). Tap NEW COMPANY to start again.</span><span>Record: ' + R.complete + ' contracts done, ' + R.failed + ' failed, ' + R.wins + '/' + R.hunts + ' hunts won, ' + R.kia + ' KIA.</span></div>'; $('bCoGo').hidden = false; $('bCoGo').textContent = 'NO LANCE'; $('bCoGo').classList.add('lockd'); $('bCoTools').hidden = false; return; }
  $('coBody').innerHTML = tab === 'ROSTER' ? roster() : tab === 'SUITS' ? suits() : tab === 'RECRUITS' ? recruits() : memorial();
  const ready = C.ops.some(canDrop) && C.suits.some(s => suitFit(s.id)); // cp2: who drops is picked before each hunt
  $('bCoGo').hidden = false; $('bCoTools').hidden = active; // a running contract stays in the company flow
  $('bCoGo').textContent = active ? 'RESUME CONTRACT (HUNT ' + G.ct.hunt + '/' + G.ct.hunts + ')' : ready ? 'START CONTRACT' : 'NO ONE CAN DROP';
  $('bCoGo').classList.toggle('lockd', !active && !ready);
}
function seatOf(id: string) { return Object.keys(G.co.crew).find(k => G.co.crew[k] === id) || ''; }
function opCard(o, buttons: string) {
  const nx = nextLevelXp(o), pct = nx ? Math.min(100, Math.round(100 * o.xp / nx)) : 100, s = seatOf(o.id);
  const status = o.status === 'BENCH' ? '<span class="warnt">BENCHED · ' + o.bench + ' contract' + (o.bench > 1 ? 's' : '') + ' to go</span>' : s ? '<span class="okt">DRIVES ' + s + '</span>' : 'reserve';
  return '<div class="opc' + (isVet(o) ? ' vet' : '') + (o.status === 'BENCH' ? ' bench' : '') + '"><b>' + esc(o.name) + (isVet(o) ? ' ★' : '') + '</b>' +
    '<span>' + skillName(o.skill) + ' ' + o.lvl + ' · ' + skillEffect(o.skill, o.lvl) + '</span>' +
    '<span>XP <span class="xp"><span style="width:' + pct + '%"></span></span> ' + o.xp + (nx ? '/' + nx : ' (top level)') + ' · ' + o.hunts + ' hunt' + (o.hunts === 1 ? '' : 's') + '</span>' +
    '<span>' + status + '</span>' + buttons + '</div>';
}
function roster() {
  const C = G.co, active = !!G.ct && G.ct.status === 'ACTIVE';
  const seats = Object.keys(C.crew);
  return C.ops.map(o => opCard(o, active || !canDrop(o) ? '' : '<div class="zrow">' + seats.map(s => '<button class="coseat' + (C.crew[s] === o.id ? ' on' : '') + (suitFit(s) ? '' : ' lockd') + '" data-o="' + (C.crew[s] === o.id ? '' : o.id) + '" data-s="' + s + '">' + s + '</button>').join('') + '</div>')).join('') + // cp2: tap a lit suit again to take them out of it
    '<div class="opc help"><small>' + C.ops.length + '/' + TUNE.OP_CAP + ' on the roster. The letter buttons put an operator in that suit (tap it again: stays aboard); you can change it before every hunt. A suit that goes down drops its operator CRITICAL: end a lancemate’s turn next to it to carry them, then get out. Carried out = benched ' + TUNE.OP_BENCH + ' contracts; left behind = KIA. Each hunt you come back from: +' + TUNE.OP_XP_HUNT + ' XP (+' + TUNE.OP_XP_WIN + ' on a win); level 2 at ' + TUNE.OP_LEVELS[0] + ', 3 at ' + TUNE.OP_LEVELS[1] + '.' + (active ? ' Seats are set for this contract.' : '') + '</small></div>';
}
// R21 cp2: each suit, its damage, who drives it, and the refit (company credits) between contracts
function suits() {
  const C = G.co, active = !!G.ct && G.ct.status === 'ACTIVE', K = SUIT_COST(), why = { CR: 'need cr', CAP: 'full' };
  const RF: [string, string][] = [['repair', 'REPAIR'], ['rounds', '+10 RDS'], ['shell', '+1 SHELL'], ['rebuild', 'REBUILD']];
  return C.suits.map(s => {
    const c = s.carry, o = opById(C.crew[s.id]);
    const btns = active ? '' : RF.map(([k, n]) => { const b = suitRefitBlock(s.id, k); return b === 'NONE' || b === 'LOST' || b === 'CAP' ? '' : '<button class="corf' + (b ? ' lockd' : '') + '" data-s="' + s.id + '" data-k="' + k + '">' + n + '<br><small>' + K[k] + ' cr' + (b ? ' · ' + why[b] : '') + '</small></button>'; }).join('');
    return '<div class="opc' + (c.dead ? ' bench' : '') + '"><b>ExoS ' + s.id + ' · ' + frameOf(s.fit).name + '</b>' +
      '<span class="' + (c.dead ? 'badt' : c.hits < c.maxHits ? 'warnt' : 'okt') + '">' + (c.dead ? 'DESTROYED: can’t drop until rebuilt' : dmgWord(c) + ' · ' + c.hits + '/' + c.maxHits + ' hits') + '</span>' +
      (c.dead ? '' : '<span>' + partsRead(c) + '</span>') +
      '<span>' + (fitRounds(s.fit) ? c.ammo + '/' + fitRounds(s.fit) + ' rds' : 'no gun') + (fitShells(s.fit) ? ' · ' + c.shells + '/' + fitShells(s.fit) + ' shells' : '') + ' · ' + (o ? 'driver ' + esc(o.name) : 'no driver') + '</span>' +
      (btns ? '<div class="zrow">' + btns + '</div>' : '') + '</div>';
  }).join('') + '<div class="opc help"><small>Damage, rounds and shells carry from hunt to hunt and contract to contract. Repairs and reloads are paid from the company’s credits (contract pay goes there). HANGAR · TOOLS changes a suit’s fit; its damage stays.' + (active ? ' Refit between hunts on the job screen.' : '') + '</small></div>';
}
function recruits() {
  const C = G.co, active = !!G.ct && G.ct.status === 'ACTIVE';
  if (!C.recruits.length) return '<div class="opc">No recruits left this time. New ones arrive after each contract.</div>';
  return C.recruits.map((o, i) => { const b = hireBlock(i); return opCard(o, active ? '' : '<div class="zrow"><button class="cohire' + (b ? ' lockd' : '') + '" data-i="' + i + '">' + (b === 'FULL' ? 'ROSTER FULL' : 'HIRE · ' + (TUNE.COST_HIRE ? TUNE.COST_HIRE + ' cr' : 'free')) + '</button></div>'); }).join('') +
    '<div class="opc help"><small>Recruits start at level 1. Unhired ones move on after the next contract.</small></div>';
}
function memorial() {
  const M = G.co.memorial;
  if (!M.length) return '<div class="opc">No one lost yet.</div>';
  return M.map(m => '<div class="opc"><b class="badt">' + esc(m.name) + '</b><span>' + skillName(m.skill) + ' ' + m.lvl + ' · ' + m.hunts + ' hunt' + (m.hunts === 1 ? '' : 's') + '</span><span>KIA, ' + esc(m.when) + '</span></div>').join('');
}
$('coTabs').addEventListener('click', ev => { const b = (ev.target as any).closest('.cotab'); if (b) { tab = b.dataset.t; wipeArm = false; renderCompany(); } });
$('coBody').addEventListener('click', ev => {
  const t = ev.target as any, s = t.closest('.coseat'), h = t.closest('.cohire'), r = t.closest('.corf');
  if (r && suitRefit(r.dataset.s, r.dataset.k)) { saveCompany(); renderCompany(); }
  if (s && seat(s.dataset.o, s.dataset.s)) { saveCompany(); renderCompany(); }
  if (h && hire(+h.dataset.i)) { saveCompany(); renderCompany(); }
});
$('bCoGo').addEventListener('click', () => { if (!G.co) return; if (G.ct && G.ct.status === 'ACTIVE') { $('co').hidden = true; onResume(); return; } if ($('bCoGo').classList.contains('lockd')) return; $('co').hidden = true; onStart(); });
$('bCoTools').addEventListener('click', () => { $('co').hidden = true; bindHangar(); onTools(); });
$('bCoNew').addEventListener('click', () => { if (!wipeArm) { wipeArm = true; renderCompany(); return; } wipeArm = false; tab = 'ROSTER'; startNew(); renderCompany(); });
// "[COMPANY] code 3F2A · contract 2 · ..." plus this hunt's news, for the log; the news is cleared once shown
export function companyLogLines(): string[] { if (!G.co) return []; const L = G.co.news.map(n => '[COMPANY] ' + n); L.push('[COMPANY] ' + companyLine()); return L; }
export { coCode };
