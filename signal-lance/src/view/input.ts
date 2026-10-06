import { TUNE } from '../tune.ts';
import { W, H, T } from '../sim/world.ts';
import { G } from '../sim/state.ts';
import { cx, cy } from '../sim/sensors.ts';
import { legChoices, legButton } from '../sim/escort.ts';
import { endPlayerTurn, replan, playerFree, cmdLeg, cmdEscortOrder, cmdMoveMode, cmdTarget, cmdMove, cmdObjective, cmdRadar, cmdEcm, canGhost, cmdGhost, cmdFire, cmdMortarOn, cmdMortarAt, mortarBlindBlock, cmdFace, cmdSelect } from '../sim/turns.ts';
import { V } from './state.ts';
import { cv, vw, vh, resize } from './render.ts';
import { $, syncButtons, refreshHud } from './hud.ts';
import { showTip, hideTip, TIP_HOLD_MS } from './tip.ts';

// ============================ INPUT ===================================
export function btn(id, fn) { $(id).addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); fn(); }); }
// action buttons: only on your turn, between actions
export function order(id, fn) { btn(id, () => { if (playerFree()) { fn(); if (!G.act) { replan(); syncButtons(); } } }); }
order('bEnd', () => { V.ghostArm = V.faceArm = V.mortarArm = false; endPlayerTurn(); });
order('bUp', cmdObjective); // R15: UPLINK, or PICK UP / HAND OFF
order('bHold', () => cmdEscortOrder('HOLD'));   // R16: the convoy skips its next move
order('bHurry', () => cmdEscortOrder('HURRY')); // R16: the convoy sprints its next move
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

export const ROUTE_BTN_PX = 30; // R15 Escort: route button radius on screen (60 px across)
export const ptr = { id: -1, sx: 0, sy: 0, lx: 0, ly: 0, pan: false, held: false, holdT: 0 as any, hideT: 0 as any };
const toWorld = (sx, sy) => { const z = TUNE.ZOOMS[V.zoomI]; return [(sx - vw / 2) / z + V.camX, (sy - vh / 2) / z + V.camY]; };
const tipHere = (sx, sy) => { const [wx, wy] = toWorld(sx, sy); showTip(sx, sy, wx, wy); };
cv.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (ptr.id !== -1) return; // ignore second finger
  ptr.id = e.pointerId; ptr.sx = ptr.lx = e.clientX; ptr.sy = ptr.ly = e.clientY; ptr.pan = false; ptr.held = false;
  try { cv.setPointerCapture(e.pointerId); } catch (_) {}
  // R16: a still finger (or button) held TIP_HOLD_MS shows what is under it; that press then never taps or pans
  clearTimeout(ptr.holdT); clearTimeout(ptr.hideT); hideTip();
  ptr.holdT = setTimeout(() => { if (ptr.id !== -1 && !ptr.pan) { ptr.held = true; tipHere(ptr.lx, ptr.ly); } }, TIP_HOLD_MS);
});
cv.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse' && ptr.id === -1) hideTip(); });
cv.addEventListener('pointermove', e => {
  if (ptr.id === -1 && e.pointerType === 'mouse') { tipHere(e.clientX, e.clientY); return; } // R16: mouse hover
  if (e.pointerId !== ptr.id) return;
  if (ptr.held) { ptr.lx = e.clientX; ptr.ly = e.clientY; tipHere(e.clientX, e.clientY); return; } // slide the held finger to read other things
  if (!ptr.pan && Math.hypot(e.clientX - ptr.sx, e.clientY - ptr.sy) > TUNE.DRAG_PX) { ptr.pan = true; V.follow = false; clearTimeout(ptr.holdT); }
  if (ptr.pan) {
    const z = TUNE.ZOOMS[V.zoomI];
    V.camX = Math.max(0, Math.min(W * T, V.camX - (e.clientX - ptr.lx) / z));
    V.camY = Math.max(0, Math.min(H * T, V.camY - (e.clientY - ptr.ly) / z));
  }
  ptr.lx = e.clientX; ptr.ly = e.clientY;
});
export function ptrEnd(e) {
  if (e.pointerId !== ptr.id) return;
  ptr.id = -1; clearTimeout(ptr.holdT);
  if (ptr.held) { ptr.held = false; ptr.hideT = setTimeout(hideTip, e.pointerType === 'mouse' ? 0 : 1500); return; } // R16: a hold was a look, not a tap
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
  // R15 Escort: a route button (shown while the transport holds at a fork) picks that leg
  for (const l of legChoices()) { const b = legButton(l.i); if (Math.hypot(wx - b.x, wy - b.y) <= ROUTE_BTN_PX / z) { cmdLeg(l.i); syncButtons(); return; } }
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
