import { quitToStart } from './screens.ts';
import { TUNE } from '../tune.ts';
import { W, H, T } from '../sim/world.ts';
import { G } from '../sim/state.ts';
import { cx, cy } from '../sim/sensors.ts';
import { forksAhead } from '../sim/escort.ts';
import { endPlayerTurn, replan, playerFree, cmdLeg, cmdEscortOrder, cmdExtract, cmdMoveMode, cmdTarget, cmdMove, cmdObjective, cmdRadar, cmdEcm, canGhost, cmdGhost, cmdFire, cmdMortarOn, cmdMortarAt, mortarBlindBlock, cmdFace, cmdSelect, cmdDraw, cmdWaypoint, cmdClearWaypoint, waypointNear, along, nearestAlong } from '../sim/turns.ts';
import { V } from './state.ts';
import { cv, vw, vh, resize, routeBtn, markerPos } from './render.ts';
import { $, syncButtons, refreshHud } from './hud.ts';
import { showTip, hideTip, TIP_HOLD_MS } from './tip.ts';

// ============================ INPUT ===================================
export function btn(id, fn) { $(id).addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); fn(); }); }
// action buttons: only on your turn, between actions
export function order(id, fn) { btn(id, () => { if (playerFree()) { fn(); if (!G.act) { replan(); syncButtons(); } } }); }
order('bEnd', () => { V.ghostArm = V.faceArm = V.mortarArm = false; V.lookArm = null; hideWpMenu(); endPlayerTurn(); });
order('bUp', cmdObjective); // R15: UPLINK, or PICK UP / HAND OFF
order('bHold', () => cmdEscortOrder('HOLD'));   // R16: the convoy skips its next move
order('bHurry', () => cmdEscortOrder('HURRY')); // R16: the convoy sprints its next move
order('bExtract', cmdExtract); // R16: this mech leaves the map (the hunt ends once every living mech is out)
order('bMove', () => { if (V.faceArm) { V.faceArm = false; return; } V.lookArm = null; hideWpMenu(); cmdMove(); }); // doubles as CANCEL while face mode is armed
for (const [id, m] of [['bCreep', 'CREEP'], ['bNorm', 'NORMAL'], ['bSprint', 'SPRINT']]) order(id, () => cmdMoveMode(m));
order('bRadar', cmdRadar);
order('bEcm', cmdEcm);
order('bGhost', () => { V.ghostArm = !V.ghostArm && canGhost(); if (V.ghostArm) V.mortarArm = false; });
order('bFire', cmdFire);
order('bMortar', () => { V.mortarWhy = ''; V.mortarArm = !V.mortarArm && mortarBlindBlock(G.p) === ''; if (V.mortarArm) V.ghostArm = V.faceArm = false; }); // R9 run1: arms targeting; tap again cancels
btn('bZin', () => { V.zoomI = 0; });
btn('bZout', () => { V.zoomI = 1; });
btn('bCtr', () => { V.follow = true; });
// R18 (Jamie): back to the start (hangar) screen. Two taps: the first arms it for 3 s ("SURE?"), the second quits.
let quitT: any = 0;
btn('bQuit', () => {
  const b = $('bQuit');
  if (!quitT) { b.textContent = 'SURE?'; b.classList.add('on'); quitT = setTimeout(() => { quitT = 0; b.textContent = 'QUIT'; b.classList.remove('on'); }, 3000); return; }
  clearTimeout(quitT); quitT = 0; b.textContent = 'QUIT'; b.classList.remove('on'); quitToStart();
});
btn('bDbg', () => { V.dbg = !V.dbg; $('bDbg').classList.toggle('on', V.dbg); refreshHud(); });

export const ROUTE_BTN_PX = 30; // R15 Escort: route button radius on screen (60 px across)
export const ptr = { id: -1, sx: 0, sy: 0, lx: 0, ly: 0, pan: false, held: false, holdT: 0 as any, hideT: 0 as any,
  cand: '', mode: '', d: 0, base: [] as { x: number; y: number }[], pts: [] as { x: number; y: number }[], keepTo: Infinity };
// ---- R17 drawn paths, r17-s2 controls (Jamie: free hand, and "hard to accurately grab the point to keep going, it keeps
// doing facing instead"; Door Kickers style). Drag from your ExoS = a new path. Drag the handle at the path's end = carry it
// on. Drag from the middle of the path = redraw from there. r17-s3 (Jamie): tap the path = that point waits for a look
// (✕ shows if it has one); the next tap anywhere drops a look marker there; drag a marker to move it, tap it to pick it
// again. Aiming is never a drag on the path, so it can't be hit by accident.
const drawnPlan = () => (G.planD && G.plan && G.plan.drawn ? G.plan : null);
// What a press here may turn into: 'aim' (LOOK is armed), 'extend' (the end handle), 'new' (your ExoS), 'path' (on the
// path: tap = menu, drag = redraw from there), or '' (an ordinary press: tap, pan or hold).
function pressKind(wx: number, wy: number) {
  if (!TUNE.DRAW_PATH_ENABLED || !playerFree() || V.mortarArm || V.ghostArm || V.faceArm) return '';
  const mk = markerAt(wx, wy); if (mk) { ptr.d = mk.d; return 'marker'; } // r17-s3: a look marker: drag = move it, tap = pick it
  if (V.lookArm !== null && drawnPlan()) return 'aim';
  const z = TUNE.ZOOMS[V.zoomI], pl = drawnPlan();
  if (pl) { const e = pl.full[pl.full.length - 1]; if (Math.hypot(wx - e.x, wy - e.y) <= TUNE.DRAW_END_GRAB_PX / z) { ptr.d = pl.length; return 'extend'; } }
  if (Math.hypot(wx - G.p.x, wy - G.p.y) <= TUNE.DRAW_GRAB_PX / z) return 'new';
  if (pl) { const n = nearestAlong(pl.full, wx, wy); if (n.off * T <= TUNE.WAYPOINT_GRAB_PX / z) { ptr.d = n.d; return 'path'; } }
  return '';
}
function markerAt(wx: number, wy: number) {
  const pl = drawnPlan(); if (!pl || !G.planD) return null;
  const r = TUNE.DRAW_END_GRAB_PX / TUNE.ZOOMS[V.zoomI];
  for (const w of G.planD.wps) { const m = markerPos(w, pl.full); if (m && Math.hypot(wx - m.x, wy - m.y) <= r) return w; }
  return null;
}
// the drawn path up to d tiles along it (its points after the start, ending exactly at d)
function prefixTo(P, d: number) {
  const q = along(P, d); if (!q) return P.slice(1);
  return [...P.slice(1, q.seg), { x: q.x, y: q.y }];
}
function strokeTo(wx: number, wy: number) {
  const all = ptr.base.concat(ptr.pts), l = all.length ? all[all.length - 1] : G.p;
  if (Math.hypot(wx - l.x, wy - l.y) < TUNE.DRAW_SAMPLE * T) return false;
  ptr.pts.push({ x: wx, y: wy }); return true;
}
// LOOK / ✕ menu beside a point on the path
export function showWpMenu(d: number) {
  const pl = drawnPlan(), q = pl && along(pl.full, d); if (!q) return;
  const z = TUNE.ZOOMS[V.zoomI], sx = vw / 2 + (q.x - V.camX) * z, sy = vh / 2 + (q.y - V.camY) * z, M = $('wpMenu');
  V.wpMenu = d; M.hidden = !waypointNear(d); // r17-s3: only ✕ (remove), and only on a point that already looks somewhere
  M.style.left = Math.max(8, Math.min(vw - 150, sx - 60)) + 'px'; M.style.top = Math.max(70, Math.min(vh - 120, sy - 80)) + 'px';
}
export function hideWpMenu() { V.wpMenu = null; $('wpMenu').hidden = true; }
btn('bWpX', () => { if (V.wpMenu !== null) cmdClearWaypoint(V.wpMenu); V.lookArm = null; hideWpMenu(); syncButtons(); });
// r17-s3: pick a point on the path: it waits for the next tap to say where it looks
function armLook(d: number) { V.lookArm = d; V.wpWhy = ''; showWpMenu(d); }
function aimAt(wx: number, wy: number) {
  const pl = drawnPlan(), q = pl && V.lookArm !== null && along(pl.full, V.lookArm); if (!q) return;
  const fx = wx - q.x, fy = wy - q.y;
  if (Math.hypot(fx, fy) > T * 0.4) { V.wpWhy = cmdWaypoint(V.lookArm, fx, fy, wx, wy) ? '' : 'MAX ' + TUNE.FACE_WAYPOINTS_MAX; syncButtons(); }
}
const toWorld = (sx, sy) => { const z = TUNE.ZOOMS[V.zoomI]; return [(sx - vw / 2) / z + V.camX, (sy - vh / 2) / z + V.camY]; };
const tipHere = (sx, sy) => { const [wx, wy] = toWorld(sx, sy); showTip(sx, sy, wx, wy); };
cv.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (ptr.id !== -1) return; // ignore second finger
  ptr.id = e.pointerId; ptr.sx = ptr.lx = e.clientX; ptr.sy = ptr.ly = e.clientY; ptr.pan = false; ptr.held = false;
  hideWpMenu(); // R17: a press off the ✕ menu closes it (the press itself still counts: e.g. the tap that places a look)
  { const [wx, wy] = toWorld(e.clientX, e.clientY); ptr.cand = pressKind(wx, wy); ptr.mode = ''; } // R17
  try { cv.setPointerCapture(e.pointerId); } catch (_) {}
  // R16: a still finger (or button) held TIP_HOLD_MS shows what is under it; that press then never taps or pans
  clearTimeout(ptr.holdT); clearTimeout(ptr.hideT); hideTip();
  ptr.holdT = setTimeout(() => { if (ptr.id !== -1 && !ptr.pan && !ptr.mode) { ptr.held = true; tipHere(ptr.lx, ptr.ly); } }, TIP_HOLD_MS);
});
cv.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse' && ptr.id === -1) hideTip(); });
cv.addEventListener('pointermove', e => {
  if (ptr.id === -1 && e.pointerType === 'mouse') { tipHere(e.clientX, e.clientY); return; } // R16: mouse hover
  if (e.pointerId !== ptr.id) return;
  if (ptr.held) { ptr.lx = e.clientX; ptr.ly = e.clientY; tipHere(e.clientX, e.clientY); return; } // slide the held finger to read other things
  if (!ptr.pan && !ptr.mode && Math.hypot(e.clientX - ptr.sx, e.clientY - ptr.sy) > TUNE.DRAG_PX) {
    clearTimeout(ptr.holdT);
    const pl = drawnPlan();
    if (ptr.cand === 'aim') ptr.mode = 'aim';
    else if (ptr.cand === 'marker') { ptr.mode = 'aim'; V.lookArm = ptr.d; } // r17-s3: drag a look marker to move it
    else if (ptr.cand && playerFree()) { // R17: start drawing: fresh, carrying on from the end, or redrawing from a point
      ptr.mode = 'draw'; ptr.pts = []; V.wpWhy = '';
      ptr.base = ptr.cand === 'new' || !pl ? [] : prefixTo(pl.full, ptr.d);
      ptr.keepTo = ptr.cand === 'new' ? 0 : ptr.d;
    } else { ptr.pan = true; V.follow = false; }
  }
  if (ptr.mode === 'draw') { // R17: the path follows the finger; the cost shows beside it
    const [wx, wy] = toWorld(e.clientX, e.clientY);
    if (strokeTo(wx, wy)) { cmdDraw(ptr.base.concat(ptr.pts), ptr.keepTo); syncButtons(); }
    V.drawPt = { sx: e.clientX, sy: e.clientY }; ptr.lx = e.clientX; ptr.ly = e.clientY; return;
  }
  if (ptr.mode === 'aim') { const [wx, wy] = toWorld(e.clientX, e.clientY); aimAt(wx, wy); ptr.lx = e.clientX; ptr.ly = e.clientY; return; } // R17: LOOK, dragging
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
  if (ptr.mode === 'draw') { // R17: the last bit of the stroke, right to where the finger lifted
    const [wx, wy] = toWorld(e.clientX, e.clientY); ptr.pts.push({ x: wx, y: wy }); cmdDraw(ptr.base.concat(ptr.pts), ptr.keepTo);
  }
  if (ptr.mode) { if (ptr.mode === 'aim') V.lookArm = null; ptr.mode = ''; V.drawPt = null; syncButtons(); return; } // R17: a drawn path / an aim, not a tap
  const tap = !ptr.pan && !ptr.held && e.type === 'pointerup';
  if (tap && ptr.cand === 'aim') { const [wx, wy] = toWorld(e.clientX, e.clientY); aimAt(wx, wy); V.lookArm = null; syncButtons(); return; } // R17: LOOK, tapped
  if (tap && ptr.cand === 'marker') { armLook(ptr.d); syncButtons(); return; } // r17-s3: tap a marker = pick it again (✕ to remove)
  if (tap && (ptr.cand === 'path' || ptr.cand === 'extend')) { armLook(ptr.d); syncButtons(); return; } // r17-s3: tap the path = the next tap says where it looks
  if (ptr.held) { ptr.held = false; ptr.hideT = setTimeout(hideTip, e.pointerType === 'mouse' ? 0 : 1500); return; } // R16: a hold was a look, not a tap
  if (tap) onTap(e.clientX, e.clientY);
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
  for (const f of forksAhead()) for (const l of f.legs) { const b = routeBtn(l.i); if (Math.hypot(wx - b.x, wy - b.y) <= ROUTE_BTN_PX / z) { cmdLeg(l.i); syncButtons(); return; } } // R17: placed clear of the HUD // R16: levers at every fork ahead
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
// R18 fix (Jamie, iPad: the hangar's pick sheet ignored taps): touches inside a .panel or a .sheet keep their default, so iOS still makes the click
export function noTouch(e) { if (!e.target.closest || !e.target.closest('.panel, .sheet')) e.preventDefault(); }
document.addEventListener('touchstart', noTouch, { passive: false });
document.addEventListener('touchmove', noTouch, { passive: false });
document.addEventListener('gesturestart', e => e.preventDefault());
document.addEventListener('dblclick', e => e.preventDefault());
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', () => setTimeout(resize, 200));
