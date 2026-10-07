// Round 14 part 0: the TEST BED screens. List (current round first) → one hunt → tap question → RETRY / BACK.
// A scenario hunt never touches a contract; it logs one [TESTBED <name>] line with the tap answer.
import { G } from '../sim/state.ts';
import { scenarioList, startScenario, leaveScenario, launchJobScenario } from '../sim/scenarios.ts';
import { showScan } from './scan.ts';
import { LISTEN } from '../sim/scan.ts';
import { V } from './state.ts';
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
  if (s.job) { startScenario(s, false); showScan('TEST BED · ' + s.name + (s.job.listen >= 0 ? ' · listen forced: ' + LISTEN[s.job.listen] : ' · scan it yourself'), () => { launchJobScenario(); camera(); }, 'DROP', s.job.listen); return; } // R19 (R20: listen -1 = the live scan)
  startScenario(s);
  camera();
}
function camera() {
  V.follow = true; V.camX = G.p.x; V.camY = G.p.y; V.ghostArm = V.faceArm = V.mortarArm = false; V.hitFlash = 0;
}
// hooks.end while G.tb is set
export function showTbResult() {
  const s = G.tb; answer = '';
  $('tbTitle').textContent = 'TEST BED · ' + s.name + ' · ' + G.outcome;
  $('tbTxt').innerHTML = esc(killText()) + ' — ' + fmtTime(G.time) + ' (' + G.turn + ' turns)<br>' + esc(dmgSummary());
  const Q = s.question;
  $('tbQ').innerHTML = Q ? '<div class="qrow"><span>' + esc(Q.q) + '</span>' + Q.a.map(a => '<button class="qa" data-a="' + esc(a) + '">' + esc(a) + '</button>').join('') + '</div>' : '';
  $('tbres').hidden = false; $('tbres').scrollTop = 0;
}
// "[TESTBED Earshot] WIN UPLINK · kills 1/2 · ... | A: ... | answer"
function logIt() {
  const s = G.tb;
  logLine('[TESTBED ' + s.name + '] ' + G.outcome + ' · ' + killText() + ' | ' + fmtTime(G.time) + ' turns ' + G.turn + ' | ' + loadSummary() + ' | ' + dmgSummary() + (answer ? ' | q ' + answer : ''));
}
$('bTB').addEventListener('click', showTestBed);
$('bTBBack').addEventListener('click', () => { $('tb').hidden = true; showLoadout(); });
$('tbList').addEventListener('click', ev => { const b = (ev.target as any).closest('.tbplay'); if (b) play(scenarioList()[+b.dataset.i]); });
$('tbQ').addEventListener('click', ev => {
  const b = (ev.target as any).closest('.qa'); if (!b) return;
  answer = answer === b.dataset.a ? '' : b.dataset.a;
  for (const o of $('tbQ').querySelectorAll('.qa')) o.classList.toggle('on', o.dataset.a === answer);
});
$('bTBRetry').addEventListener('click', () => { const s = G.tb; logIt(); play(s); });
$('bTBDone').addEventListener('click', () => { logIt(); leaveScenario(); showTestBed(); });
