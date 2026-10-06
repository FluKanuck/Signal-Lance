// Visual lab entry: runs a real test-bed scenario through the real sim, driven by a small real-time bot (so moves,
// shots and sound rings animate), and draws it with the lab renderer. Nothing here changes game rules.
import { TUNE } from '../tune.ts';
import { G } from '../sim/state.ts';
import { W, T } from '../sim/world.ts';
import { scenarioList, startScenario, leaveScenario } from '../sim/scenarios.ts';
import { step, endPlayerTurn, playerTarget, shootBlock, uplinkBlock, mortarBlock, cmdSelect, cmdFire, cmdMortar, cmdUplink, cmdObjective, cmdMoveMode, cmdTarget, cmdMove } from '../sim/turns.ts';
import { isType, carrier, isCarrier, pickupBlock } from '../sim/mission.ts';
import { idTick } from '../sim/ids.ts';
import { LOOKS, FX, KNOBS, FONTS, TIPS, look, setLook } from './looks.ts';
import { updateFog, resetFog, FOG } from './fog.ts';
import { initField, resizeField, renderField, resetScanDots } from './field.ts';
import { drawMarks } from './marks.ts';
import { initHud, applyLookCss, updateHud, buildTape } from './hud.ts';

const $ = (id: string) => document.getElementById(id)!;
const gl = $('gl') as HTMLCanvasElement, marks = document.createElement('canvas');
const S = { run: true, sim: true, speed: 1, // run = everything moves (full freeze when off); sim = units/turns move (effects carry on when off)
   zoom: 0.9, camX: 0, camY: 0, follow: true, scen: 0, endT: 0, lookI: 0 };
let vw = 0, vh = 0, dpr = 1;

// ---- real-time bot: one action at a time, so the sim animates between them (autoplay.ts runs them all instantly)
let actP: any = null, actTurn = -1, acts = 0, moved = false;
function goal() {
  const out = { x: (W - 1.5) * T, y: G.p.y };
  if (isType('RETRIEVE')) { const c = carrier(); return !c ? G.up : isCarrier(G.p) ? out : { x: c.x, y: c.y }; }
  if (isType('BOUNTY')) { const c = playerTarget(); return G.mission.earned >= G.mission.quota ? out : c && c.on ? { x: c.tx, y: c.ty } : G.up; }
  return G.up;
}
function botAct() {
  if (G.p !== actP || G.turn !== actTurn) { actP = G.p; actTurn = G.turn; acts = 0; moved = false; idTick(); }
  if (++acts > 8) { endPlayerTurn(); return; }
  const c = playerTarget();
  if (c && G.sel !== c) cmdSelect(c);
  if (mortarBlock(G.p, c) === '') return cmdMortar();
  if (shootBlock(G.p, c, TUNE.PLAYER_FIRE_UNC, TUNE.PLAYER_FIRE_RANGE) === '') return cmdFire();
  if (uplinkBlock() === '') return cmdUplink();
  if (pickupBlock(G.p) === '') return cmdObjective();
  const g = goal();
  if (!moved && Math.hypot(g.x - G.p.x, g.y - G.p.y) > T * 1.2) {
    moved = true; cmdMoveMode('NORMAL'); cmdTarget(g.x, g.y);
    if (G.plan && G.plan.path) return cmdMove();
  }
  endPlayerTurn();
}

function start(i: number) {
  if (G.tb) leaveScenario();
  S.scen = i; const s = scenarioList()[i]; startScenario(s);
  resetFog(); resetScanDots(); updateFog(0, true); S.follow = true; S.camX = G.p.x; S.camY = G.p.y; S.endT = 0;
  $('lScen').textContent = s.name + ' · R' + s.round;
  $('lTry').textContent = s.tryThis;
}

function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, 2); vw = innerWidth; vh = innerHeight;
  resizeField(vw, vh, dpr);
}

let last = performance.now(), clock = 0;
function frame(now: number) {
  // paused = a full freeze (sim, rings, sweep, flicker, spinners, fog fades); drawing carries on so pan/zoom/TUNE still show
  const dt = S.run ? Math.min(0.05, (now - last) / 1000) : 0; last = now; clock += dt;
  if (S.run && S.sim && G.mode === 'hunt') {
    for (let k = 0; k < S.speed; k++) { if (G.phase === 'PLAYER' && !G.act) botAct(); step(dt); }
  } else if (S.run && S.sim && G.mode !== 'hunt' && (S.endT += dt) > 3) start(S.scen); // hunt over: replay it
  updateFog(dt);
  if (S.follow && G.p) { const k = Math.min(1, dt * 3); S.camX += (G.p.x - S.camX) * k; S.camY += (G.p.y - S.camY) * k; }
  drawMarks(marks, vw, vh, dpr, S.camX, S.camY, S.zoom);
  renderField(clock, dt, S.camX, S.camY, S.zoom, vh, G.lance, G.p, dpr);
  updateHud(dt);
  requestAnimationFrame(frame);
}

// ---- input: drag = pan (stops following), wheel / pinch = zoom, double-tap = follow again
const ptrs = new Map<number, { x: number; y: number }>(); let pinch0 = 0, zoom0 = 1;
gl.addEventListener('pointerdown', e => { gl.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch0 = Math.hypot(a.x - b.x, a.y - b.y); zoom0 = S.zoom; } });
gl.addEventListener('pointermove', e => {
  const q = ptrs.get(e.pointerId); if (!q) return;
  if (ptrs.size === 1) { S.follow = false; S.camX -= (e.clientX - q.x) / S.zoom; S.camY -= (e.clientY - q.y) / S.zoom; }
  q.x = e.clientX; q.y = e.clientY;
  if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; S.zoom = Math.max(0.3, Math.min(3, zoom0 * Math.hypot(a.x - b.x, a.y - b.y) / pinch0)); }
});
const up = (e: PointerEvent) => ptrs.delete(e.pointerId);
gl.addEventListener('pointerup', up); gl.addEventListener('pointercancel', up);
gl.addEventListener('dblclick', () => { S.follow = true; });
gl.addEventListener('wheel', e => { e.preventDefault(); S.zoom = Math.max(0.3, Math.min(3, S.zoom * Math.exp(-e.deltaY * 0.0015))); }, { passive: false });

// ---- lab panel
function lookTo(i: number) {
  S.lookI = (i + LOOKS.length) % LOOKS.length; setLook(S.lookI); applyLookCss();
  $('lLook').textContent = look.name; $('lNote').textContent = look.note;
  for (const b of document.querySelectorAll<HTMLElement>('#lLooks button')) b.classList.toggle('on', +b.dataset.i! === S.lookI);
  buildTune();
}

// ---- TUNE: a live knob for every number, colour and font in the look (+ the fog timings). COPY gives JSON to paste
// back to Claude (or into looks.ts); PASTE applies JSON copied earlier. RESET puts the look back to its shipped values.
const SHIPPED = LOOKS.map(L => ({ ...L })), FOG0 = { ...FOG };
const FOGK: Record<string, [number, number, number]> = { RESOLVE_S: [0.1, 4, 0.05], COLOUR_IN_S: [0.05, 3, 0.05], COLOUR_OUT_S: [0.1, 10, 0.1] };
const tipAttr = (k: string) => (TIPS[k] || '').replace(/"/g, '&quot;');
function slider(obj: any, k: string, [mn, mx, st]: [number, number, number], group: string) {
  return `<label class="kn"><span class="nm" data-tip="${k}" title="${tipAttr(k)}">${k}</span><input type="range" min="${mn}" max="${mx}" step="${st}" value="${obj[k]}" data-g="${group}" data-k="${k}"><b>${obj[k]}</b></label>`;
}
function buildTune() {
  const L: any = look, fi = FONTS.findIndex(f => f.font === L.font && f.display === L.display);
  let h = `<div class="tip" id="tTip">Tap a name to see what it does.</div><label class="kn"><span class="nm" data-tip="font" title="${tipAttr('font')}">font</span><select id="tFont">${FONTS.map((f, i) => `<option value="${i}"${i === fi ? ' selected' : ''}>${f.name}</option>`).join('')}${fi < 0 ? '<option selected>(custom)</option>' : ''}</select></label>`;
  h += `<div class="why" id="tWhy">${fi >= 0 ? FONTS[fi].why : ''}</div>`;
  h += Object.keys(L).filter(k => KNOBS[k]).map(k => slider(L, k, KNOBS[k], 'look')).join('');
  h += '<div class="cols">' + Object.keys(L).filter(k => typeof L[k] === 'string' && L[k][0] === '#').map(k => `<label class="kc"><input type="color" value="${L[k]}" data-g="look" data-k="${k}"><span class="nm" data-tip="${k}" title="${tipAttr(k)}">${k}</span></label>`).join('') + '</div>';
  h += '<div class="sub">fog timings (seconds)</div>' + Object.keys(FOGK).map(k => slider(FOG, k, FOGK[k], 'fog')).join('');
  $('lTune').innerHTML = h;
  ($('tFont') as HTMLSelectElement).addEventListener('change', e => {
    const f = FONTS[+(e.target as HTMLSelectElement).value]; if (!f) return;
    L.font = f.font; L.display = f.display; applyLookCss(); $('tWhy').textContent = f.why;
  });
}
// tap a knob's name: show what it does in the tip line (and don't let the <label> open the picker / move the slider)
$('lTune').addEventListener('click', e => {
  const n = (e.target as HTMLElement).closest('.nm') as HTMLElement | null; if (!n) return;
  e.preventDefault();
  for (const o of $('lTune').querySelectorAll('.nm.sel')) o.classList.remove('sel');
  n.classList.add('sel'); $('tTip').innerHTML = '<b>' + n.dataset.tip + '</b> — ' + (TIPS[n.dataset.tip!] || '');
});
$('lTune').addEventListener('input', e => {
  const i = e.target as HTMLInputElement; if (!i.dataset.k) return;
  const obj: any = i.dataset.g === 'fog' ? FOG : look;
  obj[i.dataset.k] = i.type === 'range' ? +i.value : i.value;
  if (i.type === 'range') (i.nextElementSibling as HTMLElement).textContent = i.value;
  applyLookCss();
});
function settingsJson() { return JSON.stringify({ look: { ...look }, fog: { ...FOG } }, null, 1); }
$('lCopy').addEventListener('click', async () => {
  const j = settingsJson(), ta = $('lJson') as HTMLTextAreaElement; ta.value = j; ta.hidden = false; ta.select();
  try { await navigator.clipboard.writeText(j); $('lCopy').textContent = 'COPIED ✓'; } catch { $('lCopy').textContent = 'SELECT + COPY ↓'; }
  setTimeout(() => { $('lCopy').textContent = 'COPY SETTINGS'; }, 2000);
});
$('lPaste').addEventListener('click', () => {
  const ta = $('lJson') as HTMLTextAreaElement;
  if (ta.hidden || !ta.value.trim()) { ta.hidden = false; ta.value = ''; ta.placeholder = 'paste settings JSON here, then PASTE / APPLY again'; ta.focus(); return; }
  try {
    const j = JSON.parse(ta.value), lk = j.look || j, idx = LOOKS.findIndex(L => L.name === lk.name);
    if (idx >= 0) { Object.assign(LOOKS[idx], lk); lookTo(idx); } else { Object.assign(look, lk); lookTo(S.lookI); }
    if (j.fog) Object.assign(FOG, j.fog);
    buildTune(); $('lPaste').textContent = 'APPLIED ✓';
  } catch { $('lPaste').textContent = 'BAD JSON ✗'; }
  setTimeout(() => { $('lPaste').textContent = 'PASTE / APPLY'; }, 2000);
});
$('lReset').addEventListener('click', () => { Object.assign(LOOKS[S.lookI], SHIPPED[S.lookI]); Object.assign(FOG, FOG0); lookTo(S.lookI); });
$('lLooks').innerHTML = LOOKS.map((L, i) => `<button data-i="${i}">${L.name}</button>`).join('');
$('lLooks').addEventListener('click', e => { const b = (e.target as HTMLElement).closest('button'); if (b) lookTo(+b.dataset.i!); });
$('lFx').innerHTML = Object.keys(FX).map(k => `<label><input type="checkbox" data-k="${k}" checked> ${k}</label>`).join('');
$('lFx').addEventListener('change', e => { const i = e.target as HTMLInputElement; (FX as any)[i.dataset.k!] = i.checked; });
const sel = $('lPick') as HTMLSelectElement;
sel.innerHTML = scenarioList().map((s, i) => `<option value="${i}">R${s.round} · ${s.name}</option>`).join('');
sel.addEventListener('change', () => start(+sel.value));
function toggleSim() { S.sim = !S.sim; $('lSim').textContent = S.sim ? 'SIM ❚❚' : 'SIM ▶'; $('lSim').classList.toggle('on', !S.sim); }
$('lSim').addEventListener('click', toggleSim);
function togglePause() { S.run = !S.run; $('lRun').textContent = S.run ? 'PAUSE' : 'PLAY'; $('lPause').textContent = S.run ? '❚❚' : '▶'; $('lPause').classList.toggle('on', !S.run); }
$('lRun').addEventListener('click', togglePause);
$('lPause').addEventListener('click', togglePause);
$('lSpeed').addEventListener('click', () => { S.speed = S.speed === 1 ? 3 : S.speed === 3 ? 8 : 1; $('lSpeed').textContent = '×' + S.speed; });
$('lRestart').addEventListener('click', () => start(S.scen));
$('lFollow').addEventListener('click', () => { S.follow = true; });
$('lHide').addEventListener('click', () => document.body.classList.toggle('chrome-off'));
$('lHud').addEventListener('click', () => document.body.classList.toggle('hud-off'));
addEventListener('keydown', e => { if (e.key === 'ArrowRight') lookTo(S.lookI + 1); if (e.key === 'ArrowLeft') lookTo(S.lookI - 1); if (e.key === ' ') { e.preventDefault(); togglePause(); } if (e.key === 'h') $('lHide').click(); if (e.key === 's') toggleSim(); });

initField(gl, marks);
(window as any).__lab = { LOOKS, FX, S };
initHud(); buildTape();
addEventListener('resize', resize); resize();
lookTo(0);
start(0);
requestAnimationFrame(frame);
