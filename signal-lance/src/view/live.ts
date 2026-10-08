// R25 "Live toy": view parts only the toy page uses. The space bar is PLAY / PAUSE, and a tap on a letter in the ORDER
// strip gives that ExoS the orders.
import { G } from '../sim/state.ts';
import { TUNE } from '../tune.ts';
import { togglePause, liveSelect, apCueText, setAuto, autoOn } from '../sim/live.ts';
import { fitted } from '../sim/kit.ts';
import { $, syncButtons } from './hud.ts';
import { V } from './state.ts';
import { hideWpMenu, ptr } from './input.ts';
import { vw, vh, cv } from './render.ts';
import { camZ } from './state.ts';
import { W, H, T } from '../sim/world.ts';
import { cmdForward } from '../sim/turns.ts';

window.addEventListener('keydown', e => {
  if (e.code !== 'Space' || G.mode !== 'hunt' || (e.target as any)?.closest?.('input, textarea')) return;
  e.preventDefault(); togglePause(); syncButtons();
});
$('init').addEventListener('pointerup', (e: any) => {
  const el = e.target.closest && e.target.closest('[data-m]'); if (!el) return;
  const m = G.lance.find(x => x.id === el.dataset.m); if (m) { liveSelect(m); syncButtons(); }
});

// R25 cp B: the auto-pause switches (start screen), kept on this device
const SW: [string, string][] = [['AUTOPAUSE_CONTACT', 'CONTACT'], ['AUTOPAUSE_FIRE', 'FIRE'], ['AUTOPAUSE_IDLE', 'IDLE'], ['AUTOPAUSE_OBJECTIVE', 'OBJECTIVE']];
function swLoad() { try { const v = JSON.parse(localStorage.getItem('signalLance.autopause') || 'null'); if (v) for (const [k] of SW) if (typeof v[k] === 'boolean') (TUNE as any)[k] = v[k]; } catch (_) {} }
function swSave() { try { localStorage.setItem('signalLance.autopause', JSON.stringify(Object.fromEntries(SW.map(([k]) => [k, (TUNE as any)[k]])))); } catch (_) {} }
function swShow() {
  const row = document.getElementById('apRow'); if (!row) return;
  row.innerHTML = SW.map(([k, n]) => '<button data-k="' + k + '" class="' + ((TUNE as any)[k] ? 'on' : '') + '">PAUSE ON ' + n + ': ' + ((TUNE as any)[k] ? 'ON' : 'OFF') + '</button>').join('');
}
swLoad(); swShow();
document.getElementById('apRow')?.addEventListener('click', (e: any) => {
  const b = e.target.closest && e.target.closest('button[data-k]'); if (!b) return;
  (TUNE as any)[b.dataset.k] = !(TUNE as any)[b.dataset.k]; swSave(); swShow();
});
// the banner over the map: why the game paused (it goes when you press PLAY)
setInterval(() => {
  const el = document.getElementById('apBanner'); if (!el) return;
  const show = G.mode === 'hunt' && G.paused && !!G.apCue;
  el.hidden = !show;
  if (show) el.textContent = apCueText() + ' · tap PLAY';
}, 150);

// R25 fix 3: FORWARD on a route point: from there the ExoS looks where it walks
$('bWpF')?.addEventListener('pointerdown', (e: any) => { e.preventDefault(); e.stopPropagation(); });
$('bWpF')?.addEventListener('pointerup', (e: any) => { e.preventDefault(); e.stopPropagation(); if (V.wpMenu !== null) cmdForward(V.wpMenu); V.lookArm = null; hideWpMenu(); syncButtons(); });

// R25 fix 4 (Jamie: "Pinch zoom is needed to zoom in to allow better drawing"): two fingers on the map zoom round their
// midpoint. A second finger takes over: the first finger's pan, draw or hold is dropped.
const touches = new Map<number, { x: number; y: number }>();
let pinch: null | { d0: number; z0: number } = null;
cv.addEventListener('pointerdown', (e: PointerEvent) => {
  touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (touches.size === 2) {
    const [a, b] = [...touches.values()];
    pinch = { d0: Math.hypot(a.x - b.x, a.y - b.y) || 1, z0: V.pinch };
    ptr.id = -1; ptr.mode = ''; ptr.pan = false; clearTimeout(ptr.holdT); V.stroke = null; V.drawPt = null; V.follow = false; // the other handler lets go
  }
});
cv.addEventListener('pointermove', (e: PointerEvent) => {
  if (!touches.has(e.pointerId)) return;
  touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (!pinch || touches.size < 2) return;
  const [a, b] = [...touches.values()], mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
  const z1 = camZ(), wx = (mx - vw / 2) / z1 + V.camX, wy = (my - vh / 2) / z1 + V.camY; // the world point under the fingers
  V.pinch = Math.max(TUNE.PINCH_MIN, Math.min(TUNE.PINCH_MAX, pinch.z0 * Math.hypot(a.x - b.x, a.y - b.y) / pinch.d0));
  const z2 = camZ();
  V.camX = Math.max(0, Math.min(W * T, wx - (mx - vw / 2) / z2)); V.camY = Math.max(0, Math.min(H * T, wy - (my - vh / 2) / z2));
});
const lift = (e: PointerEvent) => { touches.delete(e.pointerId); if (touches.size < 2) pinch = null; if (!touches.size) ptr.id = -1; };
cv.addEventListener('pointerup', lift); cv.addEventListener('pointercancel', lift);

// R25 fix 7: AUTO FIRE. The button opens a small menu for the active ExoS: one switch per weapon it carries.
const WEAPONS: ['GUN' | 'MORTAR', string][] = [['GUN', 'GUN'], ['MORTAR', 'MORTAR']];
function autoMenu() {
  const M = $('autoMenu'); if (!M || M.hidden) return;
  const p = G.p, ws = WEAPONS.filter(([k]) => fitted(p, k));
  M.innerHTML = '<div>AUTO FIRE · ExoS ' + p.id + '</div>' + (ws.length ? ws.map(([k, n]) => '<button data-w="' + k + '" class="' + (p.auto && p.auto[k] ? 'on' : '') + '">' + n + ': ' + (p.auto && p.auto[k] ? 'ON' : 'OFF') + '</button>').join('') : '<div>No weapon fitted.</div>') + '<button data-w="CLOSE">CLOSE</button>';
}
$('bAuto')?.addEventListener('pointerdown', (e: any) => { e.preventDefault(); e.stopPropagation(); });
$('bAuto')?.addEventListener('pointerup', (e: any) => { e.preventDefault(); e.stopPropagation(); if (G.mode !== 'hunt') return; $('autoMenu').hidden = !$('autoMenu').hidden; autoMenu(); });
$('autoMenu')?.addEventListener('pointerdown', (e: any) => { e.preventDefault(); e.stopPropagation(); });
$('autoMenu')?.addEventListener('pointerup', (e: any) => {
  e.preventDefault(); e.stopPropagation();
  const b = e.target.closest && e.target.closest('button[data-w]'); if (!b) return;
  if (b.dataset.w === 'CLOSE') { $('autoMenu').hidden = true; return; }
  const w = b.dataset.w; setAuto(G.p, w, !(G.p.auto && G.p.auto[w])); autoMenu(); syncButtons();
});
let autoFor = '';
setInterval(() => { // the button says what the active ExoS fires by itself; the menu follows the active ExoS
  const b = $('bAuto'); if (!b || !G.p) return;
  const on = G.mode === 'hunt' && autoOn(G.p), w = on ? WEAPONS.filter(([k]) => G.p.auto[k]).map(([, n]) => n).join('+') : 'OFF';
  b.innerHTML = 'AUTO FIRE<br><small>' + w + '</small>'; b.classList.toggle('on', on); b.dataset.label = 'AUTO FIRE';
  if (G.mode !== 'hunt') $('autoMenu').hidden = true;
  if (autoFor !== G.p.id) { autoFor = G.p.id; autoMenu(); }
}, 150);
