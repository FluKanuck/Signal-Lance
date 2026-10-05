import { TUNE } from '../tune.ts';
import { T, tilesCrossed } from './world.ts';
import { rand } from './rng.ts';
import { G, hooks, unitById } from './state.ts';
import { emitUnc } from './turns.ts';
import { effEmit, noiseUnc, zoneType } from './zones.ts';
import { eyesRange } from './combat.ts';
import { hearSounds } from './sound.ts';
import { raiseAlarm } from './pack.ts';

// ============================ SIGNATURE / DETECTION ===================
// R13: electronic only. Moving and firing no longer reach passive sensors (they make Sound instead, see sound.ts).
export function sig(m) {
  return (TUNE.SIG_STILL + (m.radarOn ? TUNE.SIG_RADAR : 0) + m.armour * TUNE.SIG_ARMOUR + effEmit(m) * TUNE.SIGNAL_EMIT) * (m.mask ? TUNE.ECM_MASK_MULT : 1);
}
// Passive sensors hear a unit pulsing radar or still carrying Emissions (R13: not moving or firing any more).
export function emitting(m) { return m.radarOn || effEmit(m) > 0; } // R10: QUIET reads Emissions × SIG_MULT
// Open-ground range (tiles) at which passive hears m right now, standing still (0 = silent).
export function heardRange(m) { const s = emitting(m) ? sig(m) : 0; return s > TUNE.DET_THRESH ? TUNE.DET_FALLOFF * Math.sqrt(s / TUNE.DET_THRESH - 1) : 0; }
export function jamSig(m) { return m.jamming ? TUNE.SIG_JAM : 0; }
// Strength at which observer o picks up an emission of size s from m.
export function emitStrength(o, m, s) {
  const d = Math.hypot(m.x - o.x, m.y - o.y) / T / TUNE.DET_FALLOFF;
  return s * Math.pow(TUNE.DET_WALL, tilesCrossed(o.x, o.y, m.x, m.y, 30)) / (1 + d * d);
}
export function detStrength(o, m) { return emitStrength(o, m, sig(m)); }
export const EYES_COS = Math.cos(TUNE.EYES_HALF_ANG * Math.PI / 180);
export function canSee(o, m, rangeTiles) {
  const dx = m.x - o.x, dy = m.y - o.y, r = rangeTiles * T, d2 = dx * dx + dy * dy;
  if (d2 > r * r) return false;
  const rc = TUNE.EYES_CLOSE * T;
  if (d2 > rc * rc && (dx * o.fx + dy * o.fy) / Math.sqrt(d2) < EYES_COS) return false;
  return tilesCrossed(o.x, o.y, m.x, m.y, 1) === 0;
}
export const RADAR_COS = Math.cos(TUNE.RADAR_HALF_ANG * Math.PI / 180);
// Returns building tiles between o and m if m is in o's radar cone and within
// RADAR_MAX_WALLS, else -1.
export function inRadar(o, m) {
  const dx = m.x - o.x, dy = m.y - o.y, d = Math.hypot(dx, dy);
  if (d > TUNE.RADAR_RANGE * T || (d >= 1 && (dx * o.fx + dy * o.fy) / d < RADAR_COS)) return -1;
  const w = tilesCrossed(o.x, o.y, m.x, m.y, TUNE.RADAR_MAX_WALLS + 1);
  return w <= TUNE.RADAR_MAX_WALLS ? w : -1;
}

// ============================ CONTACTS ================================
// A fix on source `id` at (x,y), velocity (vx,vy), best-case uncertainty measU (world units).
// exact (eyes/radar): snaps to the fix. Otherwise (triangulation): blends toward it and
// the circle shrinks toward measU while fixes keep coming.
// src (R13): which sense made this fix: EYES, RADAR, PASSIVE, FLASH, SOUND, GHOST (first-contact stats; c.snd).
export function observe(list, id, x, y, measU, vx, vy, exact, noSignal?, eyes?, src = '') {
  const tgt = unitById(id); // Signal: a loud target is pinned down tighter (not the ghost)
  if (tgt && !noSignal) measU *= emitUnc(tgt);
  // R10 NOISE: any fix on a unit standing in noise, except eyes, is fuzzier (× UNC_MULT, floor UNC_FLOOR) and its
  // centre carries a real error inside that circle (held RADAR_JIT_TIME, so a fix doesn't jump every frame).
  const noiseHits = !eyes && src !== 'ALARM' && (src !== 'RADAR' || TUNE.ZONE_NOISE_AFFECTS_RADAR); // R13 debrief: radar cuts through NOISE
  if (tgt && noiseHits && zoneType(tgt) === 'NOISE') { // R13: a shared contact already carries the alarmer's noise
    measU = noiseUnc(tgt, measU);
    const j = tgt.njit || (tgt.njit = { x: 0, y: 0, at: -1e9 });
    if (G.time - j.at >= TUNE.RADAR_JIT_TIME || j.at > G.time) { const a = rand() * 6.2832, r = 0.7 * Math.sqrt(rand()); j.x = Math.cos(a) * r; j.y = Math.sin(a) * r; j.at = G.time; }
    x = tgt.x + j.x * measU; y = tgt.y + j.y * measU;
  }
  let c = null, free = null;
  for (const k of list) { if (k.on && k.id === id) { c = k; break; } if (!k.on && !free) free = k; }
  if (!c) {
    if (!free) return null;
    c = free; c.on = true; c.id = id; c.dmg = ''; c.type = ''; c.unc = Math.max(TUNE.UNC_ACQUIRE * T, measU); c.tx = x; c.ty = y;
    G.firstLog.push({ side: list === G.pc ? 'P' : 'E', src, turn: G.turn }); // R13: every new contact and the sense that made it (runner)
  }
  c.snd = src === 'SOUND'; // R13: true while the latest fix is sound only (never a lock; "SOUND" label)
  c.shr = src === 'ALARM';  // R13 s2: true while the latest fix is a shared alarm contact (never a lock)
  if (exact) { c.unc = measU; c.tx = x; c.ty = y; }
  else { c.tx += (x - c.tx) * TUNE.TRI_BLEND; c.ty += (y - c.ty) * TUNE.TRI_BLEND; }
  c.vx = vx; c.vy = vy; c.minU = measU; c.lost = 0; c.gap = exact ? 0.1 : TUNE.TRACK_GAP;
  raiseAlarm(list, c, src); // R13 s2: no-op unless the pack is on and this is a field unit's own fix on a mech
  return c;
}
export function ageContacts(list, dt) {
  for (const c of list) {
    if (!c.on) continue;
    c.lost += dt;
    if (c.lost <= c.gap) { c.unc = Math.max(c.minU, c.unc - TUNE.UNC_SHRINK * T * dt); continue; }
    if (c.lost - c.gap < TUNE.DR_TIME) { c.tx += c.vx * dt; c.ty += c.vy * dt; }
    // R8 run2: grow only while the tracked unit is the one acting (it can only move on its own activation).
    // Contacts with no unit behind them (the ghost) grow as before. Linger still counts real time.
    const actor = G.order[G.oi], mine = unitById(c.id);
    if (!TUNE.UNC_GROW_OWN_TURN || !mine || actor === mine) c.unc += TUNE.UNC_GROW * T * dt;
    if (c.lost - c.gap > TUNE.CONTACT_LINGER) { c.on = false; if (G.sel === c) G.sel = null; }
  }
}
export function cx(c) { return c.tx; }
export function cy(c) { return c.ty; }

// ============================ PASSIVE BEARINGS ========================
// Bearing = line from observer position (x,y) at angle ang. Fixed pool, ring buffer.
// tri=false: bearing-only (jamming) — drawn/used for direction, never triangulated.
export function addBearing(pool, o, m, list, id, tri) {
  let b = pool[pool.bi = (pool.bi + 1) % pool.length];
  b.on = true; b.x = o.x; b.y = o.y; b.age = 0; b.tri = tri; b.id = id;
  b.ang = Math.atan2(m.y - o.y, m.x - o.x) + (rand() * 2 - 1) * TUNE.BEARING_ERR * Math.PI / 180;
  if (!tri) return;
  // triangulate against the best other live bearing
  const minA = TUNE.TRI_MIN_ANG * Math.PI / 180, dbx = Math.cos(b.ang), dby = Math.sin(b.ang);
  let best = 0, ix = 0, iy = 0, dist = 0;
  for (const a of pool) {
    if (!a.on || a === b || !a.tri || a.id !== id || Math.hypot(a.x - b.x, a.y - b.y) < TUNE.TRI_MIN_BASE * T) continue;
    const dax = Math.cos(a.ang), day = Math.sin(a.ang), cr = dax * dby - day * dbx, s = Math.abs(cr);
    if (s < Math.sin(minA) || s <= best) continue;
    const t1 = ((b.x - a.x) * dby - (b.y - a.y) * dbx) / cr, t2 = ((b.x - a.x) * day - (b.y - a.y) * dax) / cr;
    if (t1 <= 0 || t2 <= 0) continue;
    best = s; ix = a.x + dax * t1; iy = a.y + day * t1; dist = t2;
  }
  if (best > 0) {
    const u = Math.max(TUNE.TRI_UNC_MIN * T, dist * Math.tan(TUNE.BEARING_ERR * Math.PI / 180) * 2 / best);
    observe(list, id, ix, iy, u, 0, 0, false, false, false, 'PASSIVE');
  }
}
export function ageBearings(pool, dt) { for (const b of pool) if (b.on && (b.age += dt) > TUNE.BEARING_LIFE) b.on = false; }

// ============================ SENSOR UPDATE (both sides) ==============
// Radar fix on m: exact with clear LOS, fuzzy (with a real, re-rolling error) through walls.
export function radarFix(o, m, list, id, jit, vx, vy, dt) {
  const w = inRadar(o, m);
  if (w === 0) { const c = observe(list, id, m.x, m.y, TUNE.RADAR_UNC * T, vx, vy, true, false, false, 'RADAR'); if (c) c.gap = TUNE.RADAR_HOLD; }
  else if (w > 0) {
    if ((jit.t -= dt) <= 0) {
      const a = rand() * 6.2832, r = 0.7 * Math.sqrt(rand());
      jit.x = Math.cos(a) * r; jit.y = Math.sin(a) * r; jit.t = TUNE.RADAR_JIT_TIME;
    }
    const u = (TUNE.RADAR_UNC + w * TUNE.RADAR_WALL_UNC) * T;
    observe(list, id, m.x + jit.x * u, m.y + jit.y * u, u, vx, vy, false, false, false, 'RADAR');
  }
}
// R7: the player senses every living field unit; every field unit senses the player (+ ghost) on its own.
export function updateSensors(dt) {
  const g = G.ghost, mechs = G.lance.filter(m => !m.dead);
  for (const m of G.lance) {
    m.fireT = Math.max(0, m.fireT - dt);
    m.jamming = m.mask || (g.on && g.owner === m);
    m.tick = !m.dead && m.load.passive && (m.bearT -= dt) <= 0; // R7 s2: each mech's passive suite samples on its own clock
    if (m.tick) m.bearT = TUNE.BEARING_EVERY;
  }
  for (const e of G.units) {
    e.fireT = Math.max(0, e.fireT - dt); e.jamming = e.mask;
    if (e.dead) continue;
    // ---- the lance senses this unit (one shared contact picture) ----
    const v = e.moving ? e.spd * T : 0;
    for (const p of mechs) {
      if (canSee(p, e, eyesRange(p))) { const c = observe(G.pc, e.id, e.x, e.y, TUNE.UNC_EYES * T, e.fx * v, e.fy * v, true, false, true, 'EYES'); if (c) c.type = e.type; } // R7 run1: eyes identify the type
      else if (p.radarOn) radarFix(p, e, G.pc, e.id, e.pjit, e.fx * v, e.fy * v, dt);
      if (p.tick) {
        const s = emitting(e) ? sig(e) : 0;
        if (s > 0 && emitStrength(p, e, s) >= TUNE.DET_THRESH) addBearing(G.pb, p, e, G.pc, e.id, true);
        else if (e.jamming && emitStrength(p, e, jamSig(e)) >= TUNE.DET_THRESH) addBearing(G.pb, p, e, G.pc, e.id, false);
      }
    }
    // ---- this unit senses each mech (same rules) + ghost ----
    const tick = e.passive && (e.bearT -= dt) <= 0;
    if (tick) e.bearT = TUNE.BEARING_EVERY;
    for (const p of mechs) {
      const pv = p.moving ? p.spd * T : 0;
      if (canSee(e, p, eyesRange(e))) observe(e.ec, p.id, p.x, p.y, TUNE.UNC_EYES * T, p.fx * pv, p.fy * pv, true, false, true, 'EYES');
      else if (e.radarOn) radarFix(e, p, e.ec, p.id, e.ejit, p.fx * pv, p.fy * pv, dt);
      const radarNew = p.radarOn && !(e.heard && e.heard[p.id]);
      (e.heard || (e.heard = {}))[p.id] = p.radarOn;
      if (e.passive && (tick || radarNew)) {
        const s = emitting(p) ? sig(p) : 0;
        if (p.radarOn || (s > 0 && emitStrength(e, p, s) >= TUNE.DET_THRESH)) addBearing(e.eb, e, p, e.ec, p.id, true);
        else if (p.jamming && emitStrength(e, p, TUNE.SIG_JAM) >= TUNE.DET_THRESH) addBearing(e.eb, e, p, e.ec, p.id, false);
      }
    }
    if (g.on) {
      // radar is fooled by the ghost; only a unit's own eyes expose it
      if (canSee(e, g, eyesRange(e))) { g.on = false; for (const u of G.units) killContact(u.ec, 'G'); hooks.sync(); }
      else observe(e.ec, 'G', g.x, g.y, TUNE.GHOST_UNC * T, 0, 0, false, false, false, 'GHOST');
    }
    ageBearings(e.eb, dt); ageContacts(e.ec, dt);
  }
  hearSounds(); // R13: sound contacts, both sides
  ageBearings(G.pb, dt); ageContacts(G.pc, dt);
  for (const c of G.pc) if (c.on) { const u = unitById(c.id); if (u) { if (!u.found) u.foundTurn = G.turn; u.found = true; } } // R10: first round found (runner)
}
// R7 muzzle flash: whoever is shot at gets a contact on the shooter, FLASH_UNC tiles uncertain,
// centred on a real (random) error inside that circle. Works both ways.
export function muzzleFlash(shooter, target, uncTiles = TUNE.FLASH_UNC) { // R9: mortar passes MORTAR_FLASH_UNC
  if (!target || target.dead) return;
  const list = G.lance.includes(target) ? G.pc : target.ec, u = uncTiles * T;
  const a = rand() * 6.2832, r = 0.7 * Math.sqrt(rand());
  observe(list, shooter.id, shooter.x + Math.cos(a) * r * u, shooter.y + Math.sin(a) * r * u, u, 0, 0, true, true, false, 'FLASH');
}
export function killContact(list, id) { for (const c of list) if (c.on && c.id === id) c.on = false; }
