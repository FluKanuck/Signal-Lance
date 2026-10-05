import { TUNE } from '../tune.ts';
import { W, H, T } from '../sim/world.ts';
import { G } from '../sim/state.ts';
import { cx, cy } from '../sim/sensors.ts';
import { endPlayerTurn, replan, playerFree, cmdMoveMode, cmdTarget, cmdMove, cmdUplink, cmdRadar, cmdEcm, canGhost, cmdGhost, cmdFire, cmdMortarOn, cmdMortarAt, mortarBlindBlock, cmdFace, cmdSelect } from '../sim/turns.ts';
import { V } from './state.ts';
import { cv, vw, vh, resize } from './render.ts';
import { $, syncButtons, refreshHud } from './hud.ts';

// ============================ INPUT ===================================
export function btn(id, fn) { $(id).addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); fn(); }); }
// action buttons: only on your turn, between actions
export function order(id, fn) { btn(id, () => { if (playerFree()) { fn(); if (!G.act) { replan(); syncButtons(); } } }); }
order('bEnd', () => { V.ghostArm = V.faceArm = V.mortarArm = false; endPlayerTurn(); });
order('bUp', cmdUplink);
order('bMove', () => { if (V.faceArm) { V.faceArm = false; return; } cmdMove(); }); // doubles as CANCEL while face mode is armed
for (const [id, m] of [['bCreep', 'CREEP'], ['bNorm', 'NORMAL'], ['bSprint', 'SPRINT']]) order(id, () => cmdMoveMode(m));
order('bRadar', cmdRadar);
order('bEcm', cmdEcm);
order('bGhost', () => { V.ghostArm = !V.ghostArm && canGhost(); if (V.ghostArm) V.mortarArm = false; });
order('bFire', cmdFire);
order('bMortar', () => { V.mortarWhy = ''; V.mortarArm = !V.mortarArm && mortarBlindBlock(G.p) === ''; if (V.mortarArm) V.ghostArm = V.faceArm = false; }); // R9 run1: arms targeting; tap again cancels
btn('bZin', () => { V.zoomI = 0; });
btn('bZout', () => { V.zoomI = 1; });
btn('bCtr', () => { V.follow = true; });
btn('bDbg', () => { V.dbg = !V.dbg; $('bDbg').classList.toggle('on', V.dbg); refreshHud(); });

export const ptr = { id: -1, sx: 0, sy: 0, lx: 0, ly: 0, pan: false };
cv.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (ptr.id !== -1) return; // ignore second finger
  ptr.id = e.pointerId; ptr.sx = ptr.lx = e.clientX; ptr.sy = ptr.ly = e.clientY; ptr.pan = false;
  try { cv.setPointerCapture(e.pointerId); } catch (_) {}
});
cv.addEventListener('pointermove', e => {
  if (e.pointerId !== ptr.id) return;
  if (!ptr.pan && Math.hypot(e.clientX - ptr.sx, e.clientY - ptr.sy) > TUNE.DRAG_PX) { ptr.pan = true; V.follow = false; }
  if (ptr.pan) {
    const z = TUNE.ZOOMS[V.zoomI];
    V.camX = Math.max(0, Math.min(W * T, V.camX - (e.clientX - ptr.lx) / z));
    V.camY = Math.max(0, Math.min(H * T, V.camY - (e.clientY - ptr.ly) / z));
  }
  ptr.lx = e.clientX; ptr.ly = e.clientY;
});
export function ptrEnd(e) {
  if (e.pointerId !== ptr.id) return;
  ptr.id = -1;
  if (!ptr.pan && e.type === 'pointerup') onTap(e.clientX, e.clientY);
}
cv.addEventListener('pointerup', ptrEnd);
cv.addEventListener('pointercancel', ptrEnd);

export function onTap(sx, sy) {
  if (!playerFree()) return;
  const z = TUNE.ZOOMS[V.zoomI];
  const wx = (sx - vw / 2) / z + V.camX, wy = (sy - vh / 2) / z + V.camY;
  const onSelf = Math.hypot(wx - G.p.x, wy - G.p.y) <= TUNE.SELF_TAP_PX / z;
  // R9 run1: armed mortar: tap a contact = aimed lob on its fix (if it qualifies), anywhere else = blind lob there
  if (V.mortarArm) {
    for (const c of G.pc) {
      if (!c.on) continue;
      const r = Math.max(TUNE.TAP_CONTACT_PX / z, Math.min(c.unc, 40 / z));
      if (Math.hypot(wx - cx(c), wy - cy(c)) <= r && cmdMortarOn(c)) { V.mortarArm = false; syncButtons(); return; }
    }
    const w = mortarBlindBlock(G.p, wx, wy);
    if (w) { V.mortarWhy = w; syncButtons(); return; } // stays armed; the button shows why (CLOSE / RANGE)
    V.mortarArm = false; V.mortarWhy = ''; cmdMortarAt(wx, wy); syncButtons(); return;
  }
  // armed face change: tapping yourself again cancels, anywhere else sets the facing
  if (V.faceArm) { V.faceArm = false; if (!onSelf) cmdFace(wx, wy); syncButtons(); return; }
  // tap your own mech = arm a face change
  if (onSelf) { V.faceArm = true; V.ghostArm = V.mortarArm = false; syncButtons(); return; }
  // armed ghost: this tap places the decoy
  if (V.ghostArm) {
    V.ghostArm = false;
    cmdGhost(wx, wy);
    syncButtons(); return;
  }
  // tap on a contact = select it
  for (const c of G.pc) {
    if (!c.on) continue;
    const r = Math.max(TUNE.TAP_CONTACT_PX / z, Math.min(c.unc, 40 / z));
    if (Math.hypot(wx - cx(c), wy - cy(c)) <= r) { cmdSelect(c); syncButtons(); return; } // select + turn to face (if affordable)
  }
  // anywhere else = set a move destination; MOVE executes it
  cmdTarget(wx, wy); syncButtons();
}

// Block page scroll / pinch / double-tap zoom (but let text fields work).
// (menus/panels are exempt so their buttons, text field and scrolling work)
export function noTouch(e) { if (!e.target.closest || !e.target.closest('.panel')) e.preventDefault(); }
document.addEventListener('touchstart', noTouch, { passive: false });
document.addEventListener('touchmove', noTouch, { passive: false });
document.addEventListener('gesturestart', e => e.preventDefault());
document.addEventListener('dblclick', e => e.preventDefault());
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', () => setTimeout(resize, 200));
