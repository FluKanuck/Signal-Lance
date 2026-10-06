import { TUNE } from '../tune.ts';
import { T, isSolid, randomReachable } from './world.ts';
import { rand } from './rng.ts';
import { G, unitById, isFriend, friends } from './state.ts';
import { killContact, cx, cy } from './sensors.ts';
import { partGone } from './combat.ts';
import { canPay, doMove, doPulse, doShot, freeTurn, planMove, shootBlock } from './turns.ts';
import { pickPackTarget, wounded, packOn } from './pack.ts';

// ============================ FIELD AI ================================
// Same sensors as the player. Each field unit decides on its own sensors only (no shared info, R7).
export function bestContact(list) {
  let b = null, bs = 0;
  for (const c of list) {
    if (!c.on) continue;
    const s = c.unc + (c.lost > c.gap ? 1e6 : 0);
    if (!b || s < bs) { b = c; bs = s; }
  }
  return b;
}
export function freshBearing(pool, maxAge) {
  let b = null;
  for (const k of pool) if (k.on && k.age <= maxAge && (!b || k.age < b.age)) b = k;
  return b;
}
export function enemyInvestigateTarget(e, c) {
  if (c) { e.tgtX = cx(c); e.tgtY = cy(c); return true; }
  const b = freshBearing(e.eb, 5);
  if (!b) return false;
  for (let d = TUNE.ENEMY_INVEST_DIST; d >= 3; d -= 3) {
    const x = b.x + Math.cos(b.ang) * d * T, y = b.y + Math.sin(b.ang) * d * T;
    if (!isSolid(Math.floor(x / T), Math.floor(y / T))) { e.tgtX = x; e.tgtY = y; return true; }
  }
  e.tgtX = b.x + Math.cos(b.ang) * 3 * T; e.tgtY = b.y + Math.sin(b.ang) * 3 * T;
  return true;
}
// R5: is the thing a patrol is hunting (its contact, or where a bare bearing points) beyond its LEASH of the uplink?
export function offLeash(e, c) {
  let x, y;
  if (c) { x = cx(c); y = cy(c); } else { enemyInvestigateTarget(e, null); x = e.tgtX; y = e.tgtY; }
  return Math.hypot(x - G.up.x, y - G.up.y) > e.ft.LEASH * T;
}
// Next patrol point: a reachable tile within LEASH of the uplink.
export function pickPatrol(e) {
  const U = G.up, t = randomReachable(Math.floor(U.x / T), Math.floor(U.y / T), e.ft.LEASH);
  e.ptx = (t.x + 0.5) * T; e.pty = (t.y + 0.5) * T;
}
// The acting unit picks ONE action at a time, paying the same AP / Energy costs and caps as the
// player. Returns a function that performs it, or null (= its activation is over).
export function enemyDecide(e) {
  const F = e.ft;
  if (e.dead || !friends().some(m => !m.dead)) return null; // R16: nothing of the lance's left in the district
  const c = bestContact(e.ec), tracked = c && c.lost <= c.gap;
  const cd = c ? Math.hypot(cx(c) - e.x, cy(c) - e.y) : 1e9;
  // R13 s2: with the pack on, a patrol picks its target among the lance mechs it knows about (own or shared contacts)
  const pk = packOn() && e.mobile ? packTarget(e) : null; // R15: packOn() = PACK_ENABLED, or a Retrieve after the flip
  // 1. shoot whenever its lock rule allows (2-shot cap and AP included); the pack's target first, if it can
  if (pk && shootBlock(e, pk.c, F.FIRE_UNC, TUNE.ENEMY_FIRE_RANGE) === '') { e.state = 'FIRE'; e.acted = true; return () => doShot(e, pk.c); }
  if (c && shootBlock(e, c, F.FIRE_UNC, TUNE.ENEMY_FIRE_RANGE) === '') { e.state = 'FIRE'; e.acted = true; return () => doShot(e, c); }
  const b = c ? null : freshBearing(e.eb, 5);
  if (!e.mobile) return staticDecide(e, c, b);
  if (e.moved) return null;
  if (packOn()) { const a = packDecide(e, pk); if (a !== undefined) return a; } // undefined = LEASH: the old brain below
  // ---- PATROL (mobile): the old bot brain with CAUTIOUS-style values from FIELD_TYPES ----
  let tx, ty;
  if ((c || b) && offLeash(e, c)) {
    // only chases what it thinks is within its LEASH of the uplink; otherwise goes back to the point and waits
    tx = G.up.x; ty = G.up.y; e.state = 'RETURN';
    if (Math.hypot(tx - e.x, ty - e.y) < 1.5 * T) { e.holding = true; e.goalX = tx; e.goalY = ty; e.goalK = 'RETURN'; return null; }
  } else if (c) {
    if (!tracked && cd < 1.2 * T) { killContact(e.ec, c.id); e.state = 'SEARCH'; return enemyDecide(e); } // stale estimate, nothing here
    if (tracked && cd <= F.HOLD_DIST * T) {
      if (e.holdTurns === 0) e.patienceTurns = Math.ceil((F.PATIENCE_MIN + rand() * (F.PATIENCE_MAX - F.PATIENCE_MIN)) / TUNE.SEC_PER_TURN);
      if (e.holdTurns < e.patienceTurns) { e.holding = true; e.state = 'HOLD'; return null; } // hold, bank AP
    }
    tx = cx(c); ty = cy(c); e.state = tracked && c.unc <= F.CONFIDENT * T ? 'CHARGE' : 'INVESTIGATE';
  } else if (b) {
    enemyInvestigateTarget(e, null); tx = e.tgtX; ty = e.tgtY; e.state = 'INVESTIGATE';
  } else {
    if (e.ptx < 0 || Math.hypot(e.ptx - e.x, e.pty - e.y) < T) pickPatrol(e);
    tx = e.ptx; ty = e.pty; e.state = 'PATROL';
  }
  e.goalX = tx; e.goalY = ty; e.goalK = e.state;
  let apB = e.ap;
  if (c && cd <= (TUNE.ENEMY_FIRE_RANGE + 6) * T) apB -= Math.min(e.ap, TUNE.AP_SHOT * TUNE.SHOTS_PER_TURN); // keep AP for shots when near
  e.moved = true;
  let pl = planMove(e, tx, ty, 'NORMAL', apB, e.en);
  if (!pl || !pl.path) pl = planMove(e, tx, ty, 'CREEP', apB, e.en);
  if (!pl || !pl.path) return enemyDecide(e); // nothing affordable: see if anything else is left
  e.acted = true;
  return () => doMove(e, pl);
}
// ============================ R13 s2: THE PACK =========================
// The lance mech this patrol goes after: its live contacts on mechs (own or shared), picked by pickPackTarget.
function packTarget(e) {
  const cands = [];
  for (const c of e.ec) {
    const m = c.on ? unitById(c.id) : null;
    if (m && isFriend(m) && !m.dead) cands.push({ c, m, d: Math.hypot(cx(c) - e.x, cy(c) - e.y) / T });
  }
  return cands.length ? pickPackTarget(e, cands) : null;
}
// A patrol's move with the pack on. HUNT: no leash, close in on the target's estimate (SPRINT if it is wounded).
// SEARCH: the contact faded, go to its last estimate for PACK_SEARCH_ACTIVATIONS activations. Returns the action,
// null (activation over), or undefined (LEASH: no target and no search left; the old brain decides).
function packDecide(e, pk) {
  const F = e.ft;
  let tx, ty, mode = 'NORMAL';
  if (pk) {
    const c = pk.c, tracked = c.lost <= c.gap, cd = pk.d * T, hurt = wounded(pk.m);
    e.pack = 'HUNT'; e.packX = cx(c); e.packY = cy(c); e.searchLeft = TUNE.PACK_SEARCH_ACTIVATIONS; e.packTgt = pk.m.id;
    if (!tracked && cd < 1.2 * T) { killContact(e.ec, c.id); e.state = 'SEARCH'; return enemyDecide(e); } // stale estimate, nothing here
    if (tracked && !hurt && cd <= F.HOLD_DIST * T) { // a healthy target close by: the usual patience, then push
      if (e.holdTurns === 0) e.patienceTurns = Math.ceil((F.PATIENCE_MIN + rand() * (F.PATIENCE_MAX - F.PATIENCE_MIN)) / TUNE.SEC_PER_TURN);
      if (e.holdTurns < e.patienceTurns) { e.holding = true; e.state = 'HOLD'; countPack(e); return null; }
    }
    tx = cx(c); ty = cy(c); e.state = 'HUNT';
    if (hurt && TUNE.PACK_SPRINT_ON_WOUNDED) mode = 'SPRINT';
  } else if (e.searchLeft > 0) {
    e.pack = 'SEARCH'; e.state = 'SEARCH'; e.packTgt = '';
    if (Math.hypot(e.packX - e.x, e.packY - e.y) < 1.5 * T) { e.searchLeft = 0; return enemyDecide(e); } // nothing at the estimate
    e.searchLeft--; tx = e.packX; ty = e.packY;
  } else { e.pack = 'LEASH'; e.packTgt = ''; countPack(e); return undefined; }
  countPack(e);
  e.goalX = tx; e.goalY = ty; e.goalK = e.state;
  let apB = e.ap;
  if (pk && pk.d <= TUNE.ENEMY_FIRE_RANGE + 6) apB -= Math.min(e.ap, TUNE.AP_SHOT * TUNE.SHOTS_PER_TURN); // keep AP for shots when near
  e.moved = true;
  let pl = mode === 'SPRINT' ? planMove(e, tx, ty, 'SPRINT', apB, e.en) : null;
  if (!pl || !pl.path) pl = planMove(e, tx, ty, 'NORMAL', apB, e.en);
  if (!pl || !pl.path) pl = planMove(e, tx, ty, 'CREEP', apB, e.en);
  if (!pl || !pl.path) return enemyDecide(e);
  e.acted = true;
  return () => doMove(e, pl);
}
// runner: how many activations each patrol spends in each pack mode (counted once per activation)
function countPack(e) { if (e.packCounted) return; e.packCounted = true; (e.packN || (e.packN = { HUNT: 0, SEARCH: 0, LEASH: 0 }))[e.pack]++; }

// Static units (turret, emplacement) never move. They turn toward what they sense (free turn first,
// same rule as the player), and the emplacement pulses radar every EMPL_PULSE_TURNS of its turns.
function staticDecide(e, c, b) {
  e.goalX = e.goalY = -1; e.goalK = '';
  if (e.hasRadar && !partGone(e, 'SENSORS') && !e.pulsed && e.pulseCD <= 0 && canPay(e, TUNE.AP_RADAR, TUNE.RADAR_EN)) {
    e.pulsed = true; e.pulseCD = e.pulseN; e.state = 'PULSE'; e.acted = true;
    let x, y;
    if (c) { x = cx(c); y = cy(c); }
    else { const a = Math.atan2(e.fy, e.fx) + TUNE.EMPL_SWEEP_DEG * Math.PI / 180; x = e.x + Math.cos(a) * T; y = e.y + Math.sin(a) * T; } // sweep
    return () => doPulse(e, x, y);
  }
  // face what it senses (a contact, else the freshest bearing); eyes then do the rest
  if (!e.turned) {
    e.turned = true;
    if (c) { e.state = 'TRACK'; freeTurn(e, cx(c), cy(c)); return enemyDecide(e); }
    if (b) { e.state = 'LISTEN'; freeTurn(e, b.x + Math.cos(b.ang) * 6 * T, b.y + Math.sin(b.ang) * 6 * T); return enemyDecide(e); }
  }
  if (!c && !b) e.state = 'WATCH';
  e.holding = true;
  return null;
}
