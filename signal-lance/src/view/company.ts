// Round 21: the company screen (between contracts) and the one save slot. View only: the rules are sim/company.ts.
// Tabs, one short panel at a time: ROSTER (who drives A / B), RECRUITS, MEMORIAL. The contract flow (jobs, scan, hangar,
// hunt) runs as before once START CONTRACT is tapped.
import { TUNE } from '../tune.ts';
import { G } from '../sim/state.ts';
import { newCompany, validCompany, fillCrew, seat, hire, hireBlock, skillName, skillEffect, isVet, nextLevelXp, canDrop, companyLine, coCode } from '../sim/company.ts';
import { $ } from './hud.ts';

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
  fillCrew();
}
function startNew() { bad = false; G.ct = null; newCompany((Math.random() * 4294967296) >>> 0); saveCompany(); }
// Save after every hunt and every company action. A running contract is saved with it (a reload goes back to its job pick).
export function saveCompany() { if (G.co) slotSet({ co: G.co, ct: G.ct && G.ct.status === 'ACTIVE' ? G.ct : null }); }
export function companyMode() { return TUNE.COMPANY_MODE && !!G.co; }

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
  $('coHead').innerHTML = 'THE COMPANY · <span style="opacity:.7">code ' + esc(C.code) + '</span> · contract ' + (C.n + 1) + ' · record ' + R.complete + ' done / ' + R.failed + ' failed · ' + R.wins + '/' + R.hunts + ' hunts won' + (R.kia ? ' · <span class="badt">' + R.kia + ' KIA</span>' : '');
  $('coTabs').innerHTML = ['ROSTER', 'RECRUITS', 'MEMORIAL'].map(t => '<button class="cotab' + (t === tab ? ' on' : '') + '" data-t="' + t + '">' + t + (t === 'RECRUITS' ? ' (' + C.recruits.length + ')' : t === 'MEMORIAL' && C.memorial.length ? ' (' + C.memorial.length + ')' : '') + '</button>').join('');
  $('coBody').innerHTML = tab === 'ROSTER' ? roster() : tab === 'RECRUITS' ? recruits() : memorial();
  const ready = Object.values(C.crew).some(Boolean);
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
  return C.ops.map(o => opCard(o, active || !canDrop(o) ? '' : '<div class="zrow">' + seats.map(s => '<button class="coseat' + (C.crew[s] === o.id ? ' on' : '') + '" data-o="' + o.id + '" data-s="' + s + '">DRIVE ' + s + '</button>').join('') + '</div>')).join('') +
    '<div class="opc help"><small>' + C.ops.length + '/' + TUNE.OP_CAP + ' on the roster. A suit that goes down drops its operator CRITICAL: end a lancemate’s turn next to it to carry them, then get out. Carried out = benched ' + TUNE.OP_BENCH + ' contracts; left behind = KIA. Each hunt you come back from: +' + TUNE.OP_XP_HUNT + ' XP (+' + TUNE.OP_XP_WIN + ' on a win); level 2 at ' + TUNE.OP_LEVELS[0] + ', 3 at ' + TUNE.OP_LEVELS[1] + '.' + (active ? ' Seats are set for this contract.' : '') + '</small></div>';
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
  const t = ev.target as any, s = t.closest('.coseat'), h = t.closest('.cohire');
  if (s && seat(s.dataset.o, s.dataset.s)) { saveCompany(); renderCompany(); }
  if (h && hire(+h.dataset.i)) { saveCompany(); renderCompany(); }
});
$('bCoGo').addEventListener('click', () => { if (!G.co) return; if (G.ct && G.ct.status === 'ACTIVE') { $('co').hidden = true; onResume(); return; } if (!Object.values(G.co.crew).some(Boolean)) return; $('co').hidden = true; onStart(); });
$('bCoTools').addEventListener('click', () => { $('co').hidden = true; onTools(); });
$('bCoNew').addEventListener('click', () => { if (!wipeArm) { wipeArm = true; renderCompany(); return; } wipeArm = false; tab = 'ROSTER'; startNew(); renderCompany(); });
// "[COMPANY] code 3F2A · contract 2 · ..." plus this hunt's news, for the log; the news is cleared once shown
export function companyLogLines(): string[] { if (!G.co) return []; const L = G.co.news.map(n => '[COMPANY] ' + n); L.push('[COMPANY] ' + companyLine()); return L; }
export { coCode };
