import { TUNE } from '../tune.ts';
import { W, H, T } from '../sim/world.ts';
import { G } from '../sim/state.ts';
import { cx, cy } from '../sim/sensors.ts';
import { forksAhead } from '../sim/escort.ts';
import { endPlayerTurn, replan, playerFree, cmdLeg, cmdEscortOrder, cmdExtract, cmdMoveMode, cmdTarget, cmdMove, cmdObjective, cmdRadar, cmdEcm, canGhost, cmdGhost, cmdFire, cmdMortarOn, cmdMortarAt, mortarBlindBlock, cmdFace, cmdSelect, cmdDraw, cmdWaypoint, cmdClearWaypoint } from '../sim/turns.ts';
import { V } from './state.ts';
import { cv, vw, vh, resize, routeBtn } from './render.ts';
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
order('bExtract', cmdExtract); // R16: this mech leaves the map (the hunt ends once every living mech is out)
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
export const ptr = { id: -1, sx: 0, sy: 0, lx: 0, ly: 0, pan: false, held: false, holdT: 0 as any, hideT: 0 as any,
  cand: '', mode: '', tiles: [] as number[][], wp: null as null | number[] }; // R17: a press that may become a drawn path ('draw') or a waypoint aim ('wp')
// R17: what a press here may turn into once it drags: drawing a path (it starts on your ExoS) or aiming a waypoint (it starts
// on a tile of this turn's drawn path). '' = an ordinary press (tap, pan or hold).
function pressKind(wx: number, wy: number) {
  if (!TUNE.DRAW_PATH_ENABLED || !playerFree() || V.mortarArm || V.ghostArm || V.faceArm) return '';
  const z = TUNE.ZOOMS[V.zoomI];
  if (Math.hypot(wx - G.p.x, wy - G.p.y) <= TUNE.DRAW_GRAB_PX / z) return 'draw';
  if (pathTileAt(wx, wy)) return 'wp';
  return '';
}
// R17: the drawn path's tile nearest (wx, wy) within WAYPOINT_GRAB_PX (not the start tile), or null
function pathTileAt(wx: number, wy: number) {
  const pl = G.planD && G.plan && G.plan.tiles ? G.plan : null; if (!pl) return null;
  const r = TUNE.WAYPOINT_GRAB_PX / TUNE.ZOOMS[V.zoomI]; let best = null, bd = r;
  for (let k = 1; k < pl.tiles.length; k++) { const t = pl.tiles[k], d = Math.hypot(wx - (t[0] + 0.5) * T, wy - (t[1] + 0.5) * T); if (d <= bd) { bd = d; best = t; } }
  return best;
}
// R17: the stroke so far → tiles. Each finger sample is joined to the last one in quarter-tile steps, so a fast swipe
// doesn't skip tiles (the rules drop walls and join any gap that is left with A*).
function strokeTo(wx: number, wy: number) {
  const L = ptr.tiles, last = L[L.length - 1], tx = Math.floor(wx / T), ty = Math.floor(wy / T);
  if (last && last[0] === tx && last[1] === ty) return false;
  const fx = last ? (last[0] + 0.5) * T : G.p.x, fy = last ? (last[1] + 0.5) * T : G.p.y, n = Math.max(1, Math.ceil(Math.hypot(wx - fx, wy - fy) / (T / 4)));
  for (let k = 1; k <= n; k++) {
    const x = Math.floor((fx + (wx - fx) * k / n) / T), y = Math.floor((fy + (wy - fy) * k / n) / T), l = L[L.length - 1];
    if (!l || l[0] !== x || l[1] !== y) L.push([x, y]);
  }
  return true;
}
const toWorld = (sx, sy) => { const z = TUNE.ZOOMS[V.zoomI]; return [(sx - vw / 2) / z + V.camX, (sy - vh / 2) / z + V.camY]; };
const tipHere = (sx, sy) => { const [wx, wy] = toWorld(sx, sy); showTip(sx, sy, wx, wy); };
cv.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (ptr.id !== -1) return; // ignore second finger
  ptr.id = e.pointerId; ptr.sx = ptr.lx = e.clientX; ptr.sy = ptr.ly = e.clientY; ptr.pan = false; ptr.held = false;
  { const [wx, wy] = toWorld(e.clientX, e.clientY); ptr.cand = pressKind(wx, wy); ptr.mode = ''; ptr.wp = ptr.cand === 'wp' ? pathTileAt(wx, wy) : null; } // R17
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
  if (!ptr.pan && !ptr.mode && Math.hypot(e.clientX - ptr.sx, e.clientY - ptr.sy) > TUNE.DRAG_PX) {
    clearTimeout(ptr.holdT);
    if (ptr.cand && playerFree()) { ptr.mode = ptr.cand; ptr.tiles = []; V.wpWhy = ''; } // R17: drag from your ExoS = draw; from the path = aim
    else { ptr.pan = true; V.follow = false; }
  }
  if (ptr.mode === 'draw') { // R17: the path follows the finger; the cost shows beside it
    const [wx, wy] = toWorld(e.clientX, e.clientY);
    if (strokeTo(wx, wy)) { cmdDraw(ptr.tiles.slice()); syncButtons(); }
    V.drawPt = { sx: e.clientX, sy: e.clientY }; ptr.lx = e.clientX; ptr.ly = e.clientY; return;
  }
  if (ptr.mode === 'wp' && ptr.wp) { // R17: aim the waypoint's eyes at the finger
    const [wx, wy] = toWorld(e.clientX, e.clientY), fx = wx - (ptr.wp[0] + 0.5) * T, fy = wy - (ptr.wp[1] + 0.5) * T;
    if (Math.hypot(fx, fy) > T * 0.4) { V.wpWhy = cmdWaypoint(ptr.wp[0], ptr.wp[1], fx, fy) ? '' : 'MAX ' + TUNE.FACE_WAYPOINTS_MAX; syncButtons(); }
    ptr.lx = e.clientX; ptr.ly = e.clientY; return;
  }
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
  if (ptr.mode) { ptr.mode = ''; V.drawPt = null; syncButtons(); return; } // R17: a drawn path / an aimed waypoint, not a tap
  if (ptr.cand === 'wp' && ptr.wp && !ptr.pan && !ptr.held && e.type === 'pointerup' && G.planD && G.planD.wps.some(w => w.tx === ptr.wp[0] && w.ty === ptr.wp[1])) {
    cmdClearWaypoint(ptr.wp[0], ptr.wp[1]); syncButtons(); return; // R17: tap a waypoint (no drag) = remove it
  }
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
export function noTouch(e) { if (!e.target.closest || !e.target.closest('.panel')) e.preventDefault(); }
document.addEventListener('touchstart', noTouch, { passive: false });
document.addEventListener('touchmove', noTouch, { passive: false });
document.addEventListener('gesturestart', e => e.preventDefault());
document.addEventListener('dblclick', e => e.preventDefault());
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', () => setTimeout(resize, 200));
