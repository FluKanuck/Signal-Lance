import { TUNE } from '../tune.ts';
import { T, tilesCrossed } from './world.ts';
import { rand } from './rng.ts';
import { G, hooks, unitById, friends } from './state.ts';
import { emitUnc } from './turns.ts';
import { effEmit, noiseUnc, zoneType } from './zones.ts';
import { eyesRange } from './combat.ts';
import { hearSounds } from './sound.ts';
import { has, radarOf, readsIR, irRange } from './kit.ts';
import { raiseAlarm } from './pack.ts';
import { rwrPaint } from './rwr.ts';
import { noteEmit, notePulse, noteMoved, noteFired, reveal, emitBand, frozen, obsOf } from './ids.ts';
import { isMech } from './state.ts';

// ============================ SIGNATURE / DETECTION ===================
// R13: electronic only. Moving and firing no longer reach passive sensors (they make Sound instead, see sound.ts).
// R18 (A8): the standing part comes from the fit (m.emBase: always-on EM + EM visibility); a unit with no fit (the Escort
// transport) keeps the old SIG_STILL + armour × SIG_ARMOUR.
export function sig(m) {
  const base = m.emBase !== undefined ? m.emBase : TUNE.SIG_STILL + m.armour * TUNE.SIG_ARMOUR;
  return (base + (m.radarOn ? radarOf(m)?.sig || 0 : 0) + effEmit(m) * TUNE.SIGNAL_EMIT) * (m.mask ? TUNE.ECM_MASK_MULT : 1);
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
// R18 cp3 (B2): a thermal sight reads heat like eyes (line of sight, facing cone), out to the target's IR range.
export function irSees(o, m) { return readsIR(o) && irRange(m) > 0 && canSee(o, m, irRange(m)); }
// Returns building tiles between o and m if m is in o's radar cone and within
// RADAR_MAX_WALLS, else -1. R18: range and cone from o's radar row.
export function inRadar(o, m) {
  const R = radarOf(o); if (!R) return -1;
  const dx = m.x - o.x, dy = m.y - o.y, d = Math.hypot(dx, dy);
  if (d > R.range * T || (d >= 1 && (dx * o.fx + dy * o.fy) / d < Math.cos(R.halfAng * Math.PI / 180))) return -1;
  const w = tilesCrossed(o.x, o.y, m.x, m.y, TUNE.RADAR_MAX_WALLS + 1);
  return w <= TUNE.RADAR_MAX_WALLS ? w : -1;
}

// ============================ CONTACTS ================================
// A fix on source `id` at (x,y), velocity (vx,vy), best-case uncertainty measU (world units).
// exact (eyes/radar): snaps to the fix. Otherwise (triangulation): blends toward it and
// the circle shrinks toward measU while fixes keep coming.
// src (R13): which sense made this fix: EYES, RADAR, PASSIVE, FLASH, SOUND, GHOST (first-contact stats; c.snd).
export function observe(list, id, x, y, measU, vx, vy, exact, noSignal?, eyes?, src = '', q = 0, who = '') { // R18: q = trust in a passive crossing (0..1); who = the suit letter(s) that made it
  const tgt = unitById(id); // Signal: a loud target is pinned down tighter (not the ghost)
  if (tgt && !noSignal) measU *= emitUnc(tgt);
  // R10 NOISE: any fix on a unit standing in noise, except eyes, is fuzzier (× UNC_MULT, floor UNC_FLOOR) and its
  // centre carries a real error inside that circle (held RADAR_JIT_TIME, so a fix doesn't jump every frame).
  const noiseHits = !eyes && src !== 'ALARM' && (src !== 'RADAR' || TUNE.ZONE_NOISE_AFFECTS_RADAR); // R13 debrief: radar cuts through NOISE
  const noisy = !!tgt && noiseHits && zoneType(tgt) === 'NOISE';
  if (noisy) { // R13: a shared contact already carries the alarmer's noise. R18 fix list 10: trusted crossings shrink NOISE's effect
    // R18 fix list 16 (Jamie: "the position is still off from where it should triangulate to"): NOISE never moves the centre now;
    // it only widens the circle (less the more you trust the crossing), so FIRE stays FUZZY until the fix is good
    const clean = measU; measU = noiseUnc(tgt, measU); measU = measU + (clean - measU) * q;
  }
  let c = null, free = null;
  for (const k of list) { if (k.on && k.id === id) { c = k; break; } if (!k.on && !free) free = k; }
  if (!c) {
    if (!free) return null;
    c = free; c.on = true; c.seen = {}; c.by = {}; c.fresh = true; c.id = id; c.dmg = ''; c.type = ''; c.unc = Math.max(TUNE.UNC_ACQUIRE * T, measU); c.tx = x; c.ty = y;
    const by = list === G.pc ? null : G.units.find(u => u.ec === list); // R18 (A12): who found it, how far away
    G.firstLog.push({ side: list === G.pc ? 'P' : 'E', src, turn: G.turn, tgt: id, by: by ? by.id : '', byType: by ? by.variant : '',
      d: by && tgt ? Math.hypot(by.x - tgt.x, by.y - tgt.y) / T : 0 }); // R13: every new contact and the sense that made it (runner)
  }
  (c.seen || (c.seen = {}))[src] = G.time; // R18: every sense that has fixed it, and when (the stacked tags)
  if (who) { const B = (c.by || (c.by = {}))[src] || (c.by[src] = {}); for (const l of who.split('+')) B[l] = G.time; } // R18 fix list 13: which suit(s)
  // R18 fix list 11 (Jamie: "the noise jumps the signal to a completely new position, despite having a definitive track on a
  // stationary target"): a fix vaguer than the contact's own circle doesn't move it while the two agree (they overlap); it
  // just says "still there". A turret / emplacement you know (seen or ID'd: it can't walk) only moves for a better fix.
  const vaguer = measU > c.unc * 1.5 + 0.25 * T; // clearly worse, not just a slightly wider circle from the same sense
  if (!c.fresh && vaguer && (frozen(id) && list === G.pc || Math.hypot(x - c.tx, y - c.ty) <= c.unc + measU)) {
    // still there: a known static, or a consistent fix from a sense good enough to shoot on, keeps the track live
    if ((list === G.pc && frozen(id)) || (src !== 'SOUND' && src !== 'ALARM' && src !== 'GHOST')) c.lost = Math.min(c.lost, c.gap);
    return c;
  }
  c.fresh = false; c.keep = 0; // R19: a real fix replaces a ship's blip (normal linger from now on)
  c.src = src; c.walls = 0; c.q = q; c.noisy = noisy; // R18 fix list 10: trust, and whether NOISE is still blurring it // R18 fix list 6: which sense holds the latest fix (radarFix adds the walls it went through)
  c.snd = src === 'SOUND'; // R13: true while the latest fix is sound only (never a lock; "SOUND" label)
  c.shr = src === 'ALARM';  // R13 s2: true while the latest fix is a shared alarm contact (never a lock)
  if (exact) { c.unc = measU; c.tx = x; c.ty = y; }
  else { const k = src === 'PASSIVE' ? 1 : TUNE.TRI_BLEND + (1 - TUNE.TRI_BLEND) * q; c.tx += (x - c.tx) * k; c.ty += (y - c.ty) * k; } // R18 fix list 16: a passive fix IS the best fit of every live bearing: sit on it // R18: trusted = pulled right onto it
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
    const hold = list === G.pc && frozen(c.id); // R14: an ID'd static: the track freezes (no growth, no fading)
    if (hold) continue;
    if (!TUNE.UNC_GROW_OWN_TURN || !mine || actor === mine) c.unc += TUNE.UNC_GROW * T * dt;
    if (c.lost - c.gap > TUNE.CONTACT_LINGER + (c.keep || 0)) { c.on = false; if (G.sel === c) G.sel = null; }
  }
}
export function cx(c) { return c.tx; }
export function cy(c) { return c.ty; }

// ============================ PASSIVE BEARINGS ========================
// Bearing = line from observer position (x,y) at angle ang. Fixed pool, ring buffer.
// tri=false: bearing-only (jamming) — drawn/used for direction, never triangulated.
export function addBearing(pool, o, m, list, id, tri) {
  let b = pool[pool.bi = (pool.bi + 1) % pool.length];
  b.on = true; b.x = o.x; b.y = o.y; b.age = 0; b.tri = tri; b.id = id; b.who = isMech(o) ? o.id : ''; // R18: whose ears
  b.ang = Math.atan2(m.y - o.y, m.x - o.x) + (rand() * 2 - 1) * TUNE.BEARING_ERR * Math.PI / 180;
  if (pool === G.pb) bearingDrift(o, id, b.ang); // R14: a bearing that swings from the same spot = it moved
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
    // R18 fix list 10 (Jamie: "I don't understand how anything but that perfect cross over should be the suggested contact"):
    // the fix is the best-fit point of EVERY live bearing on this unit (least squares on their perpendicular distances), not
    // just the widest pair. Trust q = (different listening spots − 1) / (TRI_TRUST_N − 1), × the widest crossing ÷ TRI_TRUST_ANG.
    const live = pool.filter(a => a.on && a.tri && a.id === id), fit = bestFit(live);
    if (fit) { ix = fit.x; iy = fit.y; }
    const spots: { x: number; y: number }[] = [];
    for (const a of live) if (!spots.some(p => Math.hypot(p.x - a.x, p.y - a.y) < T)) spots.push({ x: a.x, y: a.y });
    const ang = Math.asin(Math.min(1, best)) * 180 / Math.PI;
    const q = Math.max(0, Math.min(1, (spots.length - 1) / Math.max(1, TUNE.TRI_TRUST_N - 1))) * Math.min(1, ang / TUNE.TRI_TRUST_ANG);
    const u = Math.max(TUNE.TRI_UNC_MIN * T, dist * Math.tan(TUNE.BEARING_ERR * Math.PI / 180) * 2 / best * Math.sqrt(2 / Math.max(2, spots.length)));
    const who = [...new Set(live.map(a => a.who).filter(Boolean))].sort().join('+');
    observe(list, id, ix, iy, u, 0, 0, false, false, false, 'PASSIVE', q, who);
  }
}
// R18 fix list 10: the point closest to all the bearing lines (least squares; null if they are near parallel)
export function bestFit(lines) {
  let a = 0, b = 0, c = 0, d = 0, e = 0;
  for (const l of lines) {
    const nx = -Math.sin(l.ang), ny = Math.cos(l.ang), k = nx * l.x + ny * l.y; // the line: n · p = k
    a += nx * nx; b += nx * ny; c += ny * ny; d += nx * k; e += ny * k;
  }
  const det = a * c - b * b;
  return Math.abs(det) < 1e-6 ? null : { x: (c * d - b * e) / det, y: (a * e - b * d) / det };
}
// R14: compare with this mech's last bearing on the same unit, taken from (nearly) the same spot
function bearingDrift(o, id, ang) {
  const L = o.lastBear || (o.lastBear = {}), p = L[id];
  if (p && Math.hypot(p.x - o.x, p.y - o.y) < 0.5 * T) {
    const d = Math.abs(Math.atan2(Math.sin(ang - p.ang), Math.cos(ang - p.ang))) * 180 / Math.PI;
    const u = unitById(id); if (u && d > TUNE.TRAIT_DRIFT_DEG) noteMoved(u);
  }
  L[id] = { x: o.x, y: o.y, ang };
}
export function ageBearings(pool, dt) { for (const b of pool) if (b.on && (b.age += dt) > TUNE.BEARING_LIFE) b.on = false; }

// ============================ SENSOR UPDATE (both sides) ==============
// Radar fix on m: exact with clear LOS, fuzzy (with a real, re-rolling error) through walls.
export function radarFix(o, m, list, id, jit, vx, vy, dt) {
  const w = inRadar(o, m);
  const who = isMech(o) ? o.id : '';
  if (w === 0) { const c = observe(list, id, m.x, m.y, TUNE.RADAR_UNC * T, vx, vy, true, false, false, 'RADAR', 0, who); if (c) c.gap = TUNE.RADAR_HOLD; }
  else if (w > 0) {
    if ((jit.t -= dt) <= 0) {
      const a = rand() * 6.2832, r = 0.7 * Math.sqrt(rand());
      jit.x = Math.cos(a) * r; jit.y = Math.sin(a) * r; jit.t = TUNE.RADAR_JIT_TIME;
    }
    const u = (TUNE.RADAR_UNC + w * TUNE.RADAR_WALL_UNC) * T;
    const c = observe(list, id, m.x + jit.x * u, m.y + jit.y * u, u, vx, vy, false, false, false, 'RADAR', 0, who); if (c && c.src === 'RADAR') c.walls = w; // R18: fuzzy through w walls
  }
}
// R7: the player senses every living field unit; every field unit senses the player (+ ghost) on its own.
export function updateSensors(dt) {
  const g = G.ghost, mechs = G.lance.filter(m => !m.dead && !m.out), them = friends().filter(m => !m.dead); // R15 s3: the field also senses the Escort transport
  for (const m of G.lance) {
    m.fireT = Math.max(0, m.fireT - dt);
    m.jamming = m.mask || (g.on && g.owner === m);
    m.tick = !m.dead && !m.out && has(m, 'PASSIVE') && (m.bearT -= dt) <= 0; // R7 s2: each mech's passive suite samples on its own clock
    if (m.tick) m.bearT = TUNE.BEARING_EVERY;
  }
  for (const e of G.units) {
    e.fireT = Math.max(0, e.fireT - dt); e.jamming = e.mask;
    if (e.dead) continue;
    // ---- the lance senses this unit (one shared contact picture) ----
    const v = e.moving ? e.spd * T : 0;
    for (const p of mechs) {
      if (canSee(p, e, eyesRange(p))) { const c = observe(G.pc, e.id, e.x, e.y, TUNE.UNC_EYES * T, e.fx * v, e.fy * v, true, false, true, 'EYES', 0, p.id); if (c) reveal(e, c); } // R7 run1: eyes identify the type; R14: and the variant
      else if (irSees(p, e)) observe(G.pc, e.id, e.x, e.y, TUNE.IR_UNC * T, e.fx * v, e.fy * v, true, true, true, 'THERMAL', 0, p.id); // R18 cp3: a heat blob (no ID)
      // R18 fix list 17 (Jamie: "show … it is not seeing it with thermal"): a thermal sight with the contact in its view that reads
      // no heat is a reading too: it is colder than this range shows (the nearest such look is the tightest bound)
      if (readsIR(p) && !irSees(p, e) && canSee(p, e, TUNE.IR_RANGE)) {
        const c = G.pc.find(c => c.on && c.id === e.id);
        if (c) { const d = Math.hypot(e.x - p.x, e.y - p.y) / T; c.irNone = G.time; const o = obsOf(e.id); o.irNone = o.irNone ? Math.min(o.irNone, d) : d; }
      }
      else if (p.radarOn) radarFix(p, e, G.pc, e.id, e.pjit, e.fx * v, e.fy * v, dt);
      if (p.tick) {
        const s = emitting(e) ? sig(e) : 0;
        if (s > 0 && emitStrength(p, e, s) >= TUNE.DET_THRESH) { addBearing(G.pb, p, e, G.pc, e.id, true); if (!e.radarOn) noteEmit(e, emitBand(e)); } // R14: its EMIT level, as heard
        else if (e.jamming && emitStrength(p, e, jamSig(e)) >= TUNE.DET_THRESH) addBearing(G.pb, p, e, G.pc, e.id, false);
        else if (!emitting(e) && Math.hypot(e.x - p.x, e.y - p.y) <= TUNE.TRAIT_SILENT_RANGE * T && G.pc.some(c => c.on && c.id === e.id)) noteEmit(e, 'none'); // R14: listened close by, heard nothing
      }
    }
    // R14: a radar pulse is heard by the lance's passive at once (the field's rule, radarNew below, now both ways)
    if (e.radarOn && !e.pulseHeard) {
      const ears = mechs.filter(p => has(p, 'PASSIVE'));
      for (const p of ears) addBearing(G.pb, p, e, G.pc, e.id, true);
      if (ears.length) { e.pulseHeard = true; notePulse(e); }
    } else if (!e.radarOn) e.pulseHeard = false;
    // R14: a move seen while you hold a live, real fix on it (eyes, radar or crossed bearings)
    if (e.moving && G.pc.some(c => c.on && c.id === e.id && !c.snd && !c.shr && c.lost <= c.gap)) noteMoved(e);
    // ---- this unit senses each mech (same rules) + ghost ----
    const passive = has(e, 'PASSIVE'), tick = passive && (e.bearT -= dt) <= 0;
    if (tick) e.bearT = TUNE.BEARING_EVERY;
    for (const p of them) {
      const pv = p.moving ? p.spd * T : 0;
      if (canSee(e, p, eyesRange(e))) observe(e.ec, p.id, p.x, p.y, TUNE.UNC_EYES * T, p.fx * pv, p.fy * pv, true, false, true, 'EYES');
      else if (irSees(e, p)) observe(e.ec, p.id, p.x, p.y, TUNE.IR_UNC * T, p.fx * pv, p.fy * pv, true, true, true, 'THERMAL'); // R18 cp3
      else if (e.radarOn) radarFix(e, p, e.ec, p.id, e.ejit, p.fx * pv, p.fy * pv, dt);
      if (e.radarOn) rwrPaint(e, p); // R19 cp3: a radar warning receiver on p hears this pulse cover it
      const radarNew = p.radarOn && !(e.heard && e.heard[p.id]);
      (e.heard || (e.heard = {}))[p.id] = p.radarOn;
      if (passive && (tick || radarNew)) {
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
  if (!target || target.dead || target === G.ally) return; // R15 s3: the transport has no sensors to note a flash with
  const list = G.lance.includes(target) ? G.pc : target.ec, u = uncTiles * T;
  if (list === G.pc) noteFired(shooter); // R14: it fired at you
  const a = rand() * 6.2832, r = 0.7 * Math.sqrt(rand());
  observe(list, shooter.id, shooter.x + Math.cos(a) * r * u, shooter.y + Math.sin(a) * r * u, u, 0, 0, true, true, false, 'FLASH', 0, list === G.pc ? target.id : '');
}
export function killContact(list, id) { for (const c of list) if (c.on && c.id === id) c.on = false; }
