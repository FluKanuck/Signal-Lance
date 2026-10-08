// Round 14 part 0: the TEST BED screens. List (current round first) → one hunt → tap question → RETRY / BACK.
// A scenario hunt never touches a contract; it logs one [TESTBED <name>] line with the tap answer.
import { G } from '../sim/state.ts';
import { scenarioList, startScenario, leaveScenario, launchJobScenario, autoScenario } from '../sim/scenarios.ts';
import { aarLog, hideAar } from './aar.ts';
import { showScan } from './scan.ts';
import { LISTEN, scanReport } from '../sim/scan.ts';
import { V } from './state.ts';
import { crewLines, cityTestCompany, takeOffer } from '../sim/company.ts';
import { previewJob } from '../sim/contract.ts';
import { offerTitle } from '../sim/city.ts';
import { startThinBooks, leaveThinBooks } from './company.ts';
import { TUNE } from '../tune.ts';
import { $, fmtTime } from './hud.ts';
import { killText, dmgSummary, loadSummary, logLine, showLoadout } from './screens.ts';

const esc = (t: string) => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
let answer = '';

export function showTestBed() {
  $('load').hidden = $('tbres').hidden = true;
  $('tbList').innerHTML = scenarioList().map((s, i) => '<div class="tbrow"><div><b>' + esc(s.name) + '</b> <span style="opacity:.6">R' + s.round + '</span><small>' + esc(s.tryThis) + '</small></div>' +
    '<button class="go tbplay" data-i="' + i + '">PLAY</button></div>').join('');
  $('tb').hidden = false; $('tb').scrollTop = 0;
}
function play(s) {
  $('tb').hidden = $('tbres').hidden = true;
  if (s.books) { G.tb = s; startThinBooks(i => booksPicked(s, i), () => { G.tb = null; showTestBed(); }, s.city ? () => cityTestCompany(s.city) : undefined); return; } // R21 cp3. R23: Hated / Liked
  if (s.job) { startScenario(s, false); showScan('TEST BED · ' + s.name + (s.job.listen >= 0 ? ' · listen forced: ' + LISTEN[s.job.listen] : ' · scan it yourself'), () => { launchJobScenario(); camera(); }, 'DROP', s.job.listen); return; } // R19 (R20: listen -1 = the live scan)
  startScenario(s);
  camera();
  if (s.auto) { tbAsk(s); autoScenario(); } // R22: it plays itself, then the after-action page opens (hooks.end)
}
// R22: the scenario's question on the after-action page
function tbAsk(s) {
  answer = ''; const Q = s.question;
  $('resTbQ').innerHTML = Q ? '<div class="qrow"><span>' + esc(Q.q) + '</span>' + Q.a.map(a => '<button class="qa" data-a="' + esc(a) + '">' + esc(a) + '</button>').join('') + '</div>' : '';
}
function camera() {
  V.follow = true; V.camX = G.p.x; V.camY = G.p.y; V.ghostArm = V.faceArm = V.mortarArm = false; V.hitFlash = 0;
}
// R21 cp3: Thin books: the offer taken, then the question (nothing is played or saved)
let booksPick = '';
function booksPicked(s, i: number) {
  const o = G.co.offers[i]; booksPick = (o.kind ? 'job ' + (i + 1) + ' ' + offerTitle(o) + ' ' : '') + TUNE.DANGER_NAMES[o.tier] + ' ' + o.hunts + ' hunts ' + o.fee + ' cr ' + o.fuel + ' fuel'; answer = '';
  $('co').hidden = true;
  if (s.city) { // R23: the job's first scan (nothing is played), then the question
    G.co.fuel = Math.max(G.co.fuel, o.fuel); takeOffer(i); G.scan = null; previewJob(0);
    showScan('TEST BED · ' + s.name + ' · the first hunt’s scan (nothing is played) · DONE asks the question', () => { $('scan').hidden = true; booksAsk(s); }, 'DONE');
    return;
  }
  booksAsk(s);
}
function booksAsk(s) {
  $('tbTitle').textContent = 'TEST BED · ' + s.name + ' · took ' + booksPick;
  $('tbTxt').innerHTML = s.city ? 'This is where the hunt would start. The city screen and the scan showed what your standing does.' : 'The company had ' + G.co.credits + ' cr (in debt), ' + G.co.fuel + ' fuel. This is where the contract would start.';
  const Q = s.question;
  $('tbQ').innerHTML = '<div class="qrow"><span>' + esc(Q.q) + '</span>' + Q.a.map(a => '<button class="qa" data-a="' + esc(a) + '">' + esc(a) + '</button>').join('') + '</div>';
  $('tbres').hidden = false; $('tbres').scrollTop = 0;
}
// hooks.end while G.tb is set
export function showTbResult() {
  const s = G.tb; answer = '';
  $('tbTitle').textContent = 'TEST BED · ' + s.name + ' · ' + G.outcome;
  $('tbTxt').innerHTML = esc(killText()) + ' — ' + fmtTime(G.time) + ' (' + G.turn + ' turns)<br>' + esc(dmgSummary()) + (crewLines().length ? '<div class="colog">' + crewLines().map(l => '<div>' + esc(l) + '</div>').join('') + '</div>' : '') + /* R21 */ (scanReport().length ? '<div class="scanlog"><b>THE SCAN:</b>' + scanReport().map(l => '<div>' + esc(l) + '</div>').join('') + '</div>' : ''); // R20 cp3
  const Q = s.question;
  $('tbQ').innerHTML = Q ? '<div class="qrow"><span>' + esc(Q.q) + '</span>' + Q.a.map(a => '<button class="qa" data-a="' + esc(a) + '">' + esc(a) + '</button>').join('') + '</div>' : '';
  $('tbres').hidden = false; $('tbres').scrollTop = 0;
}
// "[TESTBED Earshot] WIN UPLINK · kills 1/2 · ... | A: ... | answer"
function logIt() {
  const s = G.tb;
  if (s.books) { logLine('[TESTBED ' + s.name + '] took ' + booksPick + (answer ? ' | q ' + answer : '')); return; } // R21 cp3
  logLine('[TESTBED ' + s.name + '] ' + G.outcome + ' · ' + killText() + ' | ' + fmtTime(G.time) + ' turns ' + G.turn + ' | ' + loadSummary() + ' | ' + dmgSummary() + (crewLines().length ? ' | ' + crewLines().join('; ') : '') + (answer ? ' | q ' + answer : ''));
  for (const l of scanReport()) logLine('[TESTBED ' + s.name + '] [SCAN] ' + l); // R20 cp3
  if (s.auto) for (const l of aarLog()) logLine('[TESTBED ' + s.name + '] ' + l); // R22
}
$('resTbQ').addEventListener('click', ev => {
  const b = (ev.target as any).closest('.qa'); if (!b) return;
  answer = answer === b.dataset.a ? '' : b.dataset.a;
  for (const o of $('resTbQ').querySelectorAll('.qa')) o.classList.toggle('on', o.dataset.a === answer);
});
$('bAarRetry').addEventListener('click', () => { const s = G.tb; if (!s) return; logIt(); $('res').hidden = true; hideAar(); leaveScenario(); play(s); });
$('bAarDone').addEventListener('click', () => { if (!G.tb) return; logIt(); $('res').hidden = true; hideAar(); leaveScenario(); showTestBed(); });
$('bTB').addEventListener('click', showTestBed);
$('bTBBack').addEventListener('click', () => { $('tb').hidden = true; showLoadout(); });
$('tbList').addEventListener('click', ev => { const b = (ev.target as any).closest('.tbplay'); if (b) play(scenarioList()[+b.dataset.i]); });
$('tbQ').addEventListener('click', ev => {
  const b = (ev.target as any).closest('.qa'); if (!b) return;
  answer = answer === b.dataset.a ? '' : b.dataset.a;
  for (const o of $('tbQ').querySelectorAll('.qa')) o.classList.toggle('on', o.dataset.a === answer);
});
$('bTBRetry').addEventListener('click', () => { const s = G.tb; logIt(); if (s.books) { $('tbres').hidden = true; leaveThinBooks(); } play(s); });
$('bTBDone').addEventListener('click', () => { const s = G.tb; logIt(); if (s && s.books) { $('tbres').hidden = true; leaveThinBooks(); return; } leaveScenario(); showTestBed(); });
