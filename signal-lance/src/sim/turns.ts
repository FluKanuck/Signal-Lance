import { TUNE } from '../tune.ts';
import { W, T, isSolid, isClutter, canReach, findPath, tilesCrossed, pathCost, clipPathCost, pathHitsClutter, clearWide, segCost, freePoint } from './world.ts';
import { onSuitDown, noteCarry } from './company.ts';
import { G, hooks, finishHunt, unitById, livingMechs, activeMechs, isMech, isFriend, friends, setActive } from './state.ts';
import { allyStep, pickLeg, giveOrder } from './escort.ts';
import { rand } from './rng.ts';
import { updateSensors, cx, cy, killContact, muzzleFlash, canSee } from './sensors.ts';
import { bestContact, enemyDecide } from './bot.ts';
import { effEmit, zoneType } from './zones.ts';
import { hitChance, rollPart, damagePart, partGone, partHurt, eyesRange, fromBehind } from './combat.ts';
import { makeSound, clearSound } from './sound.ts';
import { noteActEnd } from './ids.ts';
import { ageRwr } from './rwr.ts';
import { has, fitted, gunOf, radarOf, mortarOf, offWhy, addHeat } from './kit.ts';
import { aarHitBy, aarKill, aarDown, aarObj } from './aar.ts';
import { liveStart, cancelLact, liveAim, togglePause, liveUplink, livePickup, liveEcmOn, liveStep } from './live.ts';
import { onKill, onAllOut, onClear, onAllyOut, onAllyLost, isType, isCarrier, cargoLost, onCargoLost, pickupBlock, doPickup, handoffBlock, doHandoff } from './mission.ts';

// ============================ UPDATE ==================================
// R17: arrive(i) runs as the mover reaches path point i (a drawn move's facing waypoints); true = stop this frame's step there
// (so the sensors look from exactly that tile, and an interrupt stops it on it). m.holdFace = a waypoint set the
// facing: it holds until the next waypoint or the end of the move (otherwise facing follows the direction of travel).
export function moveAlong(m, speed, dt, arrive?: (i: number) => boolean) {
  m.moving = false;
  if (!m.path) return;
  let step = speed * T * dt / (isClutter(Math.floor(m.x / T), Math.floor(m.y / T)) ? TUNE.CLUTTER_TILE_COST : 1); // R16: wading through clutter is slow to watch too
  while (step > 0 && m.path) {
    const wp = m.path[m.pi], dx = wp.x - m.x, dy = wp.y - m.y, d = Math.hypot(dx, dy);
    if (d <= step) { m.x = wp.x; m.y = wp.y; step -= d; m.movedT = (m.movedT || 0) + d / T; const i = m.pi; if (++m.pi >= m.path.length) m.path = null; if (arrive && arrive(i)) break; }
    else { m.x += dx / d * step; m.y += dy / d * step; if (!m.holdFace) { m.fx = dx / d; m.fy = dy / d; } m.movedT = (m.movedT || 0) + step / T; step = 0; } // R12: tiles moved this activation
    m.moving = true; m.spd = speed;
  }
}

// ============================ WEAPONS =================================
export function fire(m, ax, ay, rec?) { // R12: rec = this shot's to-hit record (rolled at the trigger)
  if (m.ammo <= 0) return false;
  for (const s of G.shells) {
    if (s.on) continue;
    s.rec = rec || null;
    const d = Math.hypot(ax - m.x, ay - m.y) || 1;
    s.on = true; s.x = m.x; s.y = m.y; s.ax = ax; s.ay = ay; s.left = d;
    s.vx = (ax - m.x) / d; s.vy = (ay - m.y) / d; s.owner = m; s.sx = m.x; s.sy = m.y; // R18: where it was fired from (rear arc)
    m.ammo--; m.fireT = TUNE.SIG_FIRE_TIME; m.shots++;
    return true;
  }
  return false;
}
export function impactFx(x, y, hit) {
  for (const f of G.fx) if (!f.on) { f.on = true; f.x = x; f.y = y; f.t = 0.6; f.hit = hit; return; }
}
export function updateShells(dt) {
  const step = TUNE.SHOT_SPEED * T * dt;
  for (const s of G.shells) {
    if (!s.on) continue;
    if (step >= s.left) {
      s.on = false; s.x = s.ax; s.y = s.ay;
      // R7: the shell hits the nearest living unit of the other side within HIT_RADIUS of where it lands
      let v = null, vd = TUNE.HIT_RADIUS * T;
      for (const m of isMech(s.owner) ? G.units : friends()) { // R15 s3: field shells can hit the Escort transport
        const d = Math.hypot(m.x - s.x, m.y - s.y);
        if (!m.dead && d <= vd) { v = m; vd = d; }
      }
      // R12: a rolled miss damages nothing; a rolled hit (or a shell that lands on someone else) hits a rolled part
      if (s.rec && !s.rec.roll) v = null;
      const hit = !!v;
      if (hit) {
        aarHitBy(s.owner, s.sx, s.sy, 'GUN'); // R22: the shooter, from where
        const part = rollPart(v, { x: s.sx, y: s.sy }); damagePart(v, part, TUNE.SHOT_DAMAGE); // R18: from behind = BACK
        aarHitBy(null, 0, 0, '');
        s.owner.landed++; v.took = (v.took || 0) + 1; if (isMech(v)) hooks.playerHit();
        if (s.rec) { s.rec.part = part; s.rec.rear = fromBehind(v, s.sx, s.sy); }
      }
      if (s.rec) s.rec.hit = hit;
      impactFx(s.x, s.y, hit);
      continue;
    }
    s.x += s.vx * step; s.y += s.vy * step; s.left -= step;
    if (isSolid(Math.floor(s.x / T), Math.floor(s.y / T))) { s.on = false; impactFx(s.x, s.y, false); }
  }
  for (const f of G.fx) if (f.on && (f.t -= dt) <= 0) f.on = false;
  for (const u of G.units) if (u.hits <= 0 && !u.dead) { // destroyed: wreck marker replaces its contact
    u.dead = true; u.radarOn = false; u.path = null; u.moving = false; G.kills++;
    aarKill(u); // R22
    onKill(u); // R15: a Bounty kill pays its true variant's bounty, however it died
    killContact(G.pc, u.id); if (G.sel && !G.sel.on) G.sel = null;
  }
  if (G.ally && G.ally.hits <= 0 && !G.ally.dead) { G.ally.dead = true; G.ally.path = null; G.ally.moving = false; for (const u of G.units) killContact(u.ec, G.ally.id); } // R15 s3
  for (const m of G.lance) if (m.hits <= 0 && !m.dead) { // R7 s2: a destroyed mech is out (skipped in the order)
    m.dead = true; m.radarOn = false; m.mask = false; m.path = null; m.moving = false;
    onSuitDown(m); // R21: with an operator aboard, the suit is down and its operator CRITICAL (stays on the board)
    aarDown(m); // R22
    for (const u of G.units) killContact(u.ec, m.id);
  }
}

// R6: advance the sim by dt seconds (was update(); the camera follow moved to the view).
export function step(dt) {
  if (G.mode !== 'hunt') return;
  if (G.live) { liveStep(dt); return; } // R25: the toy page's live clock (live.ts)
  if (G.splash && (G.splash.t -= dt) <= 0) G.splash = null; // R9: the splash marker fades in real time
  if (G.pop && (G.pop.t -= dt) <= 0) G.pop = null; // R15: so does the bounty pop
  if (G.intr && (G.intr.t -= dt) <= 0) G.intr = null; // R17: and the interrupt cue
  if (G.act) stepAction(dt);
  else if (G.phase === 'ENEMY' && (G.ewait -= dt) <= 0) enemyStep();
}

// ============================ TURNS (Round 4 I-go-you-go) =============
// Time is frozen between actions. An action runs the shared real-time sim until it
// resolves: a move until the mech arrives, a pulse for RADAR_PULSE_TIME, a shot until
// the shell lands. Only the acting mech moves; both sides' sensors run.
export const MODE_SPEED = { CREEP: TUNE.CREEP_SPEED, NORMAL: TUNE.PLAYER_SPEED, SPRINT: TUNE.SPRINT_SPEED };
export function canPay(m, ap, en) { return m.ap >= ap && m.en >= en; }
export function addEmit(m, n) { m.emit = Math.max(0, Math.min(TUNE.SIGNAL_MAX, m.emit + n)); }
// multiplier on the uncertainty of anyone's fix on mech m (loud = easier to pin down)
export function emitUnc(m) { const k = effEmit(m) / TUNE.SIGNAL_MAX; // R10: QUIET reads Signal × SIG_MULT
  return TUNE.SIGNAL_UNC_QUIET + (TUNE.SIGNAL_UNC_LOUD - TUNE.SIGNAL_UNC_QUIET) * k; }
export function pay(m, ap, en) { m.ap -= ap; m.en -= en; }
// One mech or field unit starts its own turn / activation: AP, Energy regen, Signal decay, ECM upkeep.
export function beginUnit(m) {
  m.ap = Math.min(TUNE.AP_BANK_MAX, m.ap + TUNE.AP_PER_TURN);
  m.en = Math.min(m.enMax, m.en + (m.regen ?? TUNE.ENERGY_REGEN)); // R18: a suit's reactor output − idle draw; field units the flat ENERGY_REGEN
  m.heat = Math.max(0, (m.heat || 0) - TUNE.IR_COOL_PER_TURN); // R18 cp3: heat cools a little each own turn
  m.turnShots = 0; m.mUsed = 0; m.freeTurns = TUNE.FREE_TURNS; m.movedT = 0; // R12: "target moved" counts this activation's tiles
  if (m !== G.ally) { const es = G.emitStat[isMech(m) ? 'P' : 'E']; es.n++; es.sum += m.emit; } // R13: Emissions at activation start (runner)
  addEmit(m, -TUNE.SIGNAL_DECAY);
  if (!isMech(m)) m.emit = Math.max(m.emit, m.comms || 0); // R13 test 2: comms keep a field unit's EMIT up
  clearSound(m); // R13: last activation's sound is gone
  if (!has(m, 'MASK')) m.mask = false; // R12: no ECM without sensors. R18: without a working mask (its part gone)
  if (m.mask) { if (canPay(m, TUNE.AP_ECM, TUNE.ECM_EN)) { pay(m, TUNE.AP_ECM, TUNE.ECM_EN); addEmit(m, TUNE.SIGNAL_ECM); } else m.mask = false; }
}
// ---- R7 s2: initiative. Each round every living unit rolls INIT_BASE[type] + 0..INIT_ROLL; higher first,
// ties to the player (then list order). Each unit acts on its own activation; END TURN passes it on.
export function initOf(m) { return isMech(m) ? TUNE.INIT_BASE.MECH : m === G.ally ? TUNE.ESCORT_INIT : TUNE.INIT_BASE[m.type]; }
export function startRound() {
  const all = [...activeMechs(), ...(G.ally && !G.ally.dead && !G.ally.out ? [G.ally] : []), ...G.units.filter(u => !u.dead)]; // R15 s3: the transport takes a turn
  for (const m of all) m.init = initOf(m) + Math.floor(rand() * (TUNE.INIT_ROLL + 1));
  all.forEach((m, i) => { m.ord = i; });
  G.order = all.sort((a, b) => b.init - a.init || (isMech(b) ? 1 : 0) - (isMech(a) ? 1 : 0) || a.ord - b.ord);
  G.oi = -1; ageRwr(); // R19 cp3: old radar warnings fade out
  nextActivation();
}
export function nextActivation() {
  if (G.mode !== 'hunt') return;
  do G.oi++; while (G.oi < G.order.length && G.order[G.oi].dead);
  if (G.oi >= G.order.length) { G.turn++; startRound(); return; }
  const m = G.order[G.oi];
  beginUnit(m);
  if (m === G.ally) { // R15 s3: the transport walks its leg (or holds at a junction / waits for nothing)
    G.phase = 'ALLY';
    const path = allyStep();
    if (!path) { nextActivation(); return; }
    m.path = path; m.pi = 1; startAct({ k: 'MOVE', m, speed: m.hurrying ? TUNE.SPRINT_SPEED : TUNE.PLAYER_SPEED }); // R16: HURRY = sprint
    hooks.sync(); return;
  }
  if (isMech(m)) {
    G.phase = 'PLAYER'; setActive(m);
    G.up.used = false; // one UPLINK per mech activation
    if (G.ghost.on && G.ghost.owner === m && --G.ghost.turns <= 0) G.ghost.on = false;
    G.planT = null; G.planD = null; replan(); // R17: a drawn path is this turn only
    hooks.activate();
  } else {
    G.phase = 'ENEMY'; G.ei = G.units.indexOf(m);
    m.moved = m.pulsed = m.turned = m.packCounted = false;
    m.holdTurns = m.holding ? m.holdTurns + 1 : 0; m.holding = false;
    if (m.pulseCD > 0) m.pulseCD--;
    G.ewait = TUNE.ENEMY_ACT_PAUSE;
  }
  hooks.sync();
}
export function actingUnit() { return G.phase === 'ENEMY' ? G.units[G.ei] : null; }
// R7 pacing: true while the acting field unit isn't something the player is tracking right now and no
// shell is in flight (the view then runs the enemy phase faster; nothing to watch).
export function enemyUnseen() {
  const e = actingUnit();
  if (!e || G.mode !== 'hunt' || shellsFlying()) return false;
  for (const c of G.pc) if (c.on && c.id === e.id && c.lost <= c.gap) return false;
  return true;
}
export function endPlayerTurn() {
  if (G.live) { togglePause(); return; } // R25: the toy page's END TURN is PAUSE / PLAY
  if (G.mode !== 'hunt' || G.phase !== 'PLAYER' || G.act) return;
  noteCarry(G.p); // R21: ending a turn next to a CRITICAL lancemate picks its operator up
  nextActivation();
}
export function enemyStep() {
  const e = G.units[G.ei];
  if (!e) return;
  const c0 = bestContact(e.ec);
  if (c0 && !e.dead && (turnCost(e, cx(c0), cy(c0)) === 0 || e.ap > TUNE.AP_SHOT * TUNE.SHOTS_PER_TURN)) freeTurn(e, cx(c0), cy(c0)); // turn toward its best contact, same rules as the player
  const a = enemyDecide(e);
  if (!a) { noteActEnd(e); nextActivation(); return; } // R14: one more watched activation (for "still" / "no pulse")
  a();
  if (!G.act) G.ewait = TUNE.ENEMY_ACT_PAUSE;
}
export function startAct(a) { a.t = a.t || 0; a.age = 0; if (G.live) { liveStart(a); return; } G.act = a; hooks.sync(); } // R25: live = the unit's own action slot
// R25: on the toy page a new action replaces the unit's current one (a move hands back its unwalked EN)
function liveFree(m) { if (G.live && m.lact) cancelLact(m); }
export function shellsFlying() { for (const s of G.shells) if (s.on) return true; return false; }
export function stepAction(dt) {
  const a = G.act, p = G.p;
  G.time += dt; a.t -= dt; a.age += dt;
  if (a.k === 'MOVE') moveAlong(a.m, a.speed, dt, a.arrive);
  updateSensors(dt);
  if (a.k === 'MOVE') moveTick(a);
  updateShells(dt);
  if (!livingMechs().length) { G.act = null; finishHunt('LOSS'); return; } // R7 s2: both mechs destroyed
  if (cargoLost()) { G.act = null; onCargoLost(); return; } // R15 Retrieve: the carrier is destroyed, the cargo with it
  if (G.ally && G.ally.dead) { G.act = null; onAllyLost(); return; } // R15 Escort: the transport is destroyed
  if (G.ally && !G.ally.out && inExtract(G.ally)) { leaveMap(G.ally); onAllyOut(); } // R15 Escort: it made it (R16: it's out; the hunt ends once everyone is)
  if (G.kills >= G.units.length && !isType('ESCORT')) { G.act = null; onClear(); return; } // R7: whole field destroyed (R15: the mission decides what that means)
  if (allOut()) { G.act = null; onAllOut(); return; } // R16: every friendly is extracted (or destroyed)
  const done = a.k === 'MOVE' ? !a.m.path || a.age > 30 : a.t <= 0 && !shellsFlying();
  if (!done) return;
  a.m.moving = false; a.m.path = null; a.m.holdFace = false; if (a.k === 'PULSE') a.m.radarOn = false;
  G.act = null;
  if (G.phase === 'ENEMY') G.ewait = TUNE.ENEMY_ACT_PAUSE;
  else if (G.phase === 'ALLY') nextActivation(); // R15 s3: the transport's one move is its whole turn
  else { if (a.m === p && G.planT && !G.planT.cut && !a.intr) G.planT = null; if (a.m === p) G.planD = null; replan(); hooks.sync(); } // R17: a drawn path is used up
}
// R16 (Jamie: "ExoS should extract individually using a new extract button that pops up when zone is entered, only when all
// friendlies are extracted does the mission end"). Walking into extraction ends nothing: a mech standing in it may EXTRACT
// (no AP; it leaves the map and its turn ends). The transport is out when it walks in. The hunt ends once every living mech
// is out (mission.ts onAllOut decides what that means); an uplink, a cleared field or a destroyed objective still end it at once.
export function inExtract(m) { return Math.floor(m.x / T) >= W - TUNE.EXTRACT_COLS; }
export function leaveMap(m) {
  m.out = true; m.path = null; m.moving = false; m.radarOn = false; m.mask = false; m.x = m.y = -20 * T;
  for (const u of G.units) killContact(u.ec, m.id);
}
export function allOut() { const L = livingMechs(); return L.length > 0 && L.every(m => m.out); }
export function extractBlock(m = G.p) { return !m || m.dead || m.out ? 'NONE' : !inExtract(m) ? 'ZONE' : ''; }
export function cmdExtract() {
  if (!playerFree() || extractBlock() !== '') return;
  const m = G.p;
  if (isCarrier(m)) { G.mission.cargoOut = true; G.mission.result = 'cargo out'; } // R15 Retrieve: the cargo leaves with it
  G.mission.out = (G.mission.out || []).concat(m.id);
  noteCarry(m); // R21: extracting next to a CRITICAL lancemate takes its operator along
  aarObj('OUT', m); // R22
  if (G.live) { m.lact = null; m.aim = null; m.hold = ''; } // R25
  leaveMap(m);
  if (allOut()) { onAllOut(); return; }
  if (G.live) { hooks.sync(); return; } // R25: the clock picks the next ExoS (live.ts)
  nextActivation();
}
export function faceTo(m, x, y) { const dx = x - m.x, dy = y - m.y, d = Math.hypot(dx, dy); if (d > 0) { m.fx = dx / d; m.fy = dy / d; } }
// Change facing (no time): the first FREE_TURNS each turn are free, then AP_TURN each.
// Already facing it (within 10°) costs nothing. Returns false if it couldn't pay.
// Takes one zero-time look afterwards so eyes update at once.
export function turnCost(m, x, y) {
  const dx = x - m.x, dy = y - m.y, d = Math.hypot(dx, dy);
  if (d === 0 || (dx * m.fx + dy * m.fy) / d > 0.985) return 0;
  return m.freeTurns > 0 ? 0 : TUNE.AP_TURN;
}
export function freeTurn(m, x, y) {
  const dx = x - m.x, dy = y - m.y, d = Math.hypot(dx, dy);
  if (d === 0 || (dx * m.fx + dy * m.fy) / d > 0.985) return true;
  if (m.freeTurns > 0) m.freeTurns--; else if (m.ap >= TUNE.AP_TURN) m.ap -= TUNE.AP_TURN; else return false;
  faceTo(m, x, y); updateSensors(0); return true;
}
// ---- moves: path, cost, and clipping to what the mech can afford ----
export function pathLen(path) { let L = 0; for (let i = 1; i < path.length; i++) L += Math.hypot(path[i].x - path[i - 1].x, path[i].y - path[i - 1].y); return L / T; }
export function clipPath(path, maxTiles) {
  const out = [path[0]]; let left = maxTiles * T;
  for (let i = 1; i < path.length && left > 0; i++) {
    const a = path[i - 1], b = path[i], d = Math.hypot(b.x - a.x, b.y - a.y);
    if (d <= left) { out.push(b); left -= d; }
    else { const k = left / d; out.push({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k }); left = 0; }
  }
  return out;
}
// Returns { full, path (clipped, or null if nothing affordable), len, ap, en, cut, why, mode }.
export function planMove(m, x, y, mode, apMax?, enMax?) {
  const full = findPath(m.x, m.y, x, y);
  if (!full || full.length < 2) return null;
  if (mode !== 'CREEP' && partHurt(m, 'LEGS')) return { full, path: null, len: 0, ap: 0, en: 0, cut: true, why: 'LEGS', mode }; // R13: a leg gone = CREEP only
  if (mode === 'SPRINT' && TUNE.RETRIEVE_NO_SPRINT && isCarrier(m)) return { full, path: null, len: 0, ap: 0, en: 0, cut: true, why: 'CARGO', mode }; // R15: the carrier can't sprint
  const lame = partGone(m, 'LEGS') ? TUNE.LEGS_GONE_MULT : 1; // R13: both legs gone = half a creep
  const tpa = TUNE.MOVE_TILES_PER_AP[mode] * lame, ept = TUNE.MOVE_ENERGY_PER_TILE[mode] + (m.over ? m.over.en || 0 : 0); // R18 debrief 1: overload costs Energy per tile, every mode
  apMax = Math.min(m.ap, apMax === undefined ? m.ap : apMax); enMax = Math.min(m.en, enMax === undefined ? m.en : enMax);
  const oAP = m.over ? m.over.ap : 0, oSnd = m.over ? m.over.snd : 0; // R18 (A7): overload: +AP and +Sound on every move
  const fullLen = pathCost(full), apLen = Math.max(0, apMax - oAP) * tpa, enLen = ept > 0 ? enMax / ept : 1e9; // R16: tiles of movement (clutter costs CLUTTER_TILE_COST each)
  const len = Math.min(fullLen, apLen, enLen);
  const r: any = { full, path: null, len: 0, ap: 0, en: 0, cut: len < fullLen - 1e-3, why: apLen <= enLen ? 'AP' : 'EN', mode };
  if (len < 0.25) return r;
  r.path = r.cut ? clipPathCost(full, len) : full; r.len = len;
  r.ap = Math.ceil(len / tpa - 1e-6) + oAP; r.en = Math.ceil(len * ept - 1e-6); r.oAP = oAP;
  r.crunch = pathHitsClutter(r.path); // R16: entering any clutter tile adds CLUTTER_SOUND to this move's Sound (once)
  r.snd = (m.snd || TUNE.SOUND_RANGE)[mode] + oSnd + (r.crunch ? TUNE.CLUTTER_SOUND : 0); r.lame = lame; // R13: the sound radius this move will make (Emissions no longer rise with moves)
  r.tpa = tpa; r.ept = ept; r.wps = []; r.wpAP = 0; r.drawn = false; // R17: what the interrupt refund needs
  return r;
}
// ---- R17: drawn paths ("Eyes on the street"). r17-s2 (Jamie: "need to free hand path the line, not have it snapping"):
// the view sends the finger's stroke as world points; the rules keep the points on walkable street, join any stretch
// that would cut through or graze a wall with A*, then straighten small wobbles. Cost is exactly a tap move's (same
// MOVE_TILES_PER_AP, MOVE_ENERGY_PER_TILE, CLUTTER_TILE_COST, CLUTTER_SOUND). Clutter you draw through is taken on purpose.
const plain = (a, b) => Math.hypot(b.x - a.x, b.y - a.y) / T;
export function drawnPoints(m, pts: { x: number; y: number }[]) {
  if (TUNE.FREE_POS) return drawnFree(m, pts); // R25 cp D: the toy page keeps the line as drawn
  const out = [{ x: m.x, y: m.y }];
  for (const q of pts) {
    if (!canReach(Math.floor(q.x / T), Math.floor(q.y / T))) continue;
    const l = out[out.length - 1];
    if (plain(l, q) < 0.25) continue;
    if (clearWide(l, q)) { out.push({ x: q.x, y: q.y }); continue; }
    const seg = findPath(l.x, l.y, q.x, q.y); // round the corner (A*, smoothed)
    if (!seg) continue;
    for (let k = 1; k < seg.length; k++) out.push(seg[k]);
  }
  return simplify(out);
}
// R25 cp D (free positions): the line as drawn. The stroke is smoothed (PATH_SMOOTH rounds of Chaikin corner-cutting, the
// ends kept), points inside a wall are dropped (the last one moves to the nearest open point), a stretch that would cut
// through or graze a wall bends round it on the tightest clear line (findPath, tightened), then only wobbles smaller than
// PATH_SIMPLIFY go. Never snapped to tiles.
function drawnFree(m, pts: { x: number; y: number }[]) {
  let P = [{ x: m.x, y: m.y }, ...pts];
  for (let k = 0; k < TUNE.PATH_SMOOTH && P.length > 2; k++) {
    const Q = [P[0]];
    for (let i = 0; i < P.length - 1; i++) {
      const a = P[i], b = P[i + 1];
      if (i > 0) Q.push({ x: a.x * 0.75 + b.x * 0.25, y: a.y * 0.75 + b.y * 0.25 });
      if (i < P.length - 2) Q.push({ x: a.x * 0.25 + b.x * 0.75, y: a.y * 0.25 + b.y * 0.75 });
    }
    Q.push(P[P.length - 1]); P = Q;
  }
  const last = P[P.length - 1], end = freePoint(last.x, last.y);
  const out = [{ x: m.x, y: m.y }];
  for (let i = 1; i < P.length; i++) {
    let q = P[i];
    if (i === P.length - 1 && end) q = end;
    else if (!canReach(Math.floor(q.x / T), Math.floor(q.y / T))) continue;
    const l = out[out.length - 1];
    if (plain(l, q) < 0.05) continue;
    if (clearWide(l, q)) { out.push({ x: q.x, y: q.y }); continue; }
    const seg = findPath(l.x, l.y, q.x, q.y);
    if (!seg) continue;
    for (let k = 1; k < seg.length; k++) out.push(seg[k]);
  }
  return simplify(out, TUNE.PATH_SIMPLIFY);
}
// Drop a point when the straight line past it stays within DRAW_SIMPLIFY tiles of every point it skips, is clear of
// walls, and crosses no less clutter (so straightening never cuts round scrap you drew through).
function simplify(P, eps0?: number) {
  if (P.length < 3) return P;
  const eps = eps0 ?? TUNE.DRAW_SIMPLIFY, extra = (a, b) => segCost(a, b) - plain(a, b), out = [P[0]];
  let i = 0;
  while (i < P.length - 1) {
    let j = i + 1, ex = extra(P[i], P[i + 1]);
    for (let k = i + 2; k < P.length; k++) {
      ex += extra(P[k - 1], P[k]);
      const a = P[i], b = P[k], L = plain(a, b) || 1e-9;
      let ok = clearWide(a, b) && extra(a, b) >= ex - 0.05;
      for (let q = i + 1; q < k && ok; q++) ok = Math.abs((b.x - a.x) * (a.y - P[q].y) - (a.x - P[q].x) * (b.y - a.y)) / T / T / L <= eps;
      if (ok) j = k; else break;
    }
    out.push(P[j]); i = j;
  }
  return out;
}
// The point on polyline P that is d tiles (plain distance) along it, and the segment it is on; null past the end.
export function along(P, d: number) {
  for (let i = 1; i < P.length; i++) {
    const L = plain(P[i - 1], P[i]);
    if (d <= L + 1e-6) { const f = L ? Math.min(1, d / L) : 0; return { x: P[i - 1].x + (P[i].x - P[i - 1].x) * f, y: P[i - 1].y + (P[i].y - P[i - 1].y) * f, seg: i }; }
    d -= L;
  }
  return null;
}
// How far along P (tiles) the point nearest (x, y) is, and how far from the line it is (tiles).
export function nearestAlong(P, x: number, y: number) {
  let best = { d: 0, off: 1e9 }, acc = 0;
  for (let i = 1; i < P.length; i++) {
    const a = P[i - 1], b = P[i], L2 = (b.x - a.x) ** 2 + (b.y - a.y) ** 2, L = Math.sqrt(L2) / T;
    const f = L2 ? Math.max(0, Math.min(1, ((x - a.x) * (b.x - a.x) + (y - a.y) * (b.y - a.y)) / L2)) : 0;
    const off = Math.hypot(a.x + (b.x - a.x) * f - x, a.y + (b.y - a.y) * f - y) / T;
    if (off < best.off) best = { d: acc + f * L, off };
    acc += L;
  }
  return best;
}
// Plan a drawn move. wps = facing waypoints [{ d, fx, fy }] (d = tiles along the path). Each costs one change of facing:
// m.freeTurns first, then AP_TURN, all in the move's AP. Capped at FACE_WAYPOINTS_MAX. Too long = cut where the AP (or EN)
// runs out; a waypoint past the cut is dropped (and costs nothing). Same return shape as planMove, plus wps / wpAP / length.
export function planDrawn(m, pts: { x: number; y: number }[], mode, wps: any[] = []) {
  let full = drawnPoints(m, pts);
  if (full.length < 2) return null;
  const length = full.reduce((s, q, i) => i ? s + plain(full[i - 1], q) : 0, 0);
  // each waypoint becomes a vertex of the path at its distance along it
  const W8 = wps.filter(w => w.d > 0.05 && w.d <= length + 1e-6).sort((a, b) => a.d - b.d).slice(0, TUNE.FACE_WAYPOINTS_MAX).map(w => ({ ...w }));
  for (const w of W8) {
    const q = along(full, w.d); if (!q) continue;
    const prev = full[q.seg - 1], next = full[q.seg];
    if (plain(prev, q) < 1e-3) w.i = q.seg - 1; else if (plain(q, next) < 1e-3) w.i = q.seg;
    else { full = [...full.slice(0, q.seg), { x: q.x, y: q.y }, ...full.slice(q.seg)]; w.i = q.seg; }
  }
  const base: any = { full, path: null, len: 0, ap: 0, en: 0, cut: true, mode, drawn: true, length, wps: [], wpAP: 0 };
  if (mode !== 'CREEP' && partHurt(m, 'LEGS')) return { ...base, why: 'LEGS' };
  if (mode === 'SPRINT' && TUNE.RETRIEVE_NO_SPRINT && isCarrier(m)) return { ...base, why: 'CARGO' };
  const lame = partGone(m, 'LEGS') ? TUNE.LEGS_GONE_MULT : 1;
  const tpa = TUNE.MOVE_TILES_PER_AP[mode] * lame, ept = TUNE.MOVE_ENERGY_PER_TILE[mode] + (m.over ? m.over.en || 0 : 0); // R18 debrief 1: overload costs Energy per tile, every mode
  const cum = [0]; for (let i = 1; i < full.length; i++) cum.push(cum[i - 1] + segCost(full[i - 1], full[i]));
  const fullLen = cum[cum.length - 1], free = m.freeTurns || 0, WI = W8.filter(w => w.i > 0);
  const oAP = m.over ? m.over.ap : 0, oSnd = m.over ? m.over.snd : 0; // R18 (A7): overload
  for (let k = WI.length; k >= 0; k--) {
    const wpAP = Math.max(0, k - free) * TUNE.AP_TURN;
    const apLen = Math.max(0, m.ap - wpAP - oAP) * tpa, enLen = ept > 0 ? m.en / ept : 1e9, len = Math.min(fullLen, apLen, enLen);
    if (k > 0 && cum[WI[k - 1].i] > len + 1e-6) continue; // the k-th waypoint is past where this move would stop
    const r: any = { ...base, cut: len < fullLen - 1e-3, why: apLen <= enLen ? 'AP' : 'EN', wps: WI.slice(0, k), wpAP, tpa, ept, lame, cum };
    if (len < 0.25) return r;
    r.path = r.cut ? clipPathCost(full, len) : full; r.len = len;
    r.ap = Math.ceil(len / tpa - 1e-6) + wpAP + oAP; r.en = Math.ceil(len * ept - 1e-6); r.oAP = oAP;
    r.crunch = pathHitsClutter(r.path);
    r.snd = (m.snd || TUNE.SOUND_RANGE)[mode] + oSnd + (r.crunch ? TUNE.CLUTTER_SOUND : 0);
    return r;
  }
  return { ...base, why: 'AP' };
}
export function doMove(m, pl) {
  liveFree(m);
  if (pl.mode === 'SPRINT') addHeat(m, TUNE.IR_SPRINT); // R18 cp3: sprinting runs hot
  pay(m, pl.ap, pl.en); makeSound(m, pl.mode, m.over ? m.over.snd : 0); // R18: + overload. R17: the clutter part of the sound waits until the mover actually steps into clutter
  const nw = (pl.wps || []).length, free0 = m.freeTurns || 0;
  if (nw) m.freeTurns = Math.max(0, free0 - nw);
  if (isMech(m)) { G.moveStat.n++; if (pl.crunch) G.moveStat.c++; if (pl.drawn) { G.moveStat.drawn++; G.moveStat.wp += nw; } else G.moveStat.tap++; } // R16 runner: how often the lance crosses clutter; R17: drawn / tap, waypoints
  m.path = pl.path; m.pi = 1; m.creep = pl.mode === 'CREEP'; m.holdFace = false;
  const a: any = { k: 'MOVE', m, speed: MODE_SPEED[pl.mode] * (pl.lame || 1), pl, drawn: !!pl.drawn, crunch: !!pl.crunch, free0, wpDone: 0,
    tile: Math.floor(m.y / T) * W + Math.floor(m.x / T) };
  if (nw) a.arrive = (i: number) => { // R17: a facing waypoint: turn as it reaches the tile, hold until the next one / the end
    const w = pl.wps.find(w => w.i === i); if (!w) return false;
    const d = Math.hypot(w.fx, w.fy) || 1; m.fx = w.fx / d; m.fy = w.fy / d; m.holdFace = true; a.wpDone++;
    updateSensors(0); return true;
  };
  if (isMech(m) && TUNE.MOVE_INTERRUPT) { // R17: what the suit already had at the start of the move (anything else is new)
    a.known = new Set(G.pc.filter(c => c.on).map(c => c.id));
    if (G.live) for (const id of Object.keys(G.apTrack || {})) a.known.add(id); // R25: the track rule: a contact the lance already had (now flickering, or lost) never stops a move again
  }
  startAct(a);
}
// R17: every frame of a move. On each new tile: the clutter sound (once, the first time it steps into clutter) and a
// zero-time sensor look with the current facing (eyes on every tile of the path). Then, for a player suit, the interrupt.
export function moveTick(a) { // R25: exported for the live clock
  const m = a.m;
  const t = Math.floor(m.y / T) * W + Math.floor(m.x / T);
  if (t !== a.tile) {
    a.tile = t; a.steps = (a.steps || 0) + 1;
    if (a.crunch && isClutter(t % W, (t / W) | 0)) { makeSound(m, a.pl.mode, TUNE.CLUTTER_SOUND + (m.over ? m.over.snd : 0)); a.crunch = false; }
    updateSensors(0);
  }
  if (!a.known || !m.path || G.mode !== 'hunt') return;
  for (const c of G.pc) {
    if (!c.on) continue;
    const u = unitById(c.id);
    if (!u || u.dead || isFriend(u)) continue;
    // R18 fix list 8 (Jamie: "i already knew they were there … they weren't a new contact"): only a contact that wasn't on your
    // picture when the move began stops it (eyes landing on a known one no longer does)
    if (!a.known.has(c.id)) { const eyes = canSee(m, u, eyesRange(m)); interruptMove(a, u, eyes ? 'eyes' : c.snd ? 'sound' : c.shr ? 'alarm' : 'sensors'); return; }
  }
}
// R17: stop the move here. AP / EN are charged only for what was walked (and the waypoints reached); the rest goes back.
export function interruptMove(a, u, why = 'eyes') { // why: what showed it (eyes, sound, sensors, alarm)
  const m = a.m, pl = a.pl;
  const walked = pathCost([...m.path.slice(0, m.pi), { x: m.x, y: m.y }]);
  const usedWp = Math.min(a.wpDone, (pl.wps || []).length), wpAP = Math.max(0, usedWp - a.free0) * TUNE.AP_TURN;
  const ap = Math.min(pl.ap, Math.ceil(walked / pl.tpa - 1e-6) + wpAP + (pl.oAP || 0)), en = Math.min(pl.en, Math.ceil(walked * pl.ept - 1e-6)); // R18: the overload AP is paid once a move starts
  m.ap += pl.ap - ap; m.en += pl.en - en; m.freeTurns = Math.max(0, a.free0 - usedWp);
  m.path = null; m.moving = false; a.intr = true;
  G.intr = { id: m.id, uid: u.id, why, t: TUNE.INTERRUPT_CUE_TIME, ap: pl.ap - ap }; // the view's "CONTACT — move stopped" cue
  G.moveStat.intr.push(m.id + ' ' + u.type + ' ' + why);
}
// " · moves tap 9 drawn 4 wp 3 [INTERRUPT A PATROL eyes]" for this hunt's log line
export function moveText() {
  const s = G.moveStat;
  return ' · moves tap ' + s.tap + ' drawn ' + s.drawn + ' wp ' + s.wp + s.intr.map(t => ' [INTERRUPT ' + t + ']').join('');
}
export function replan() {
  G.plan = G.planD ? planDrawn(G.p, G.planD.pts, G.pmode, G.planD.wps) : G.planT ? planMove(G.p, G.planT.x, G.planT.y, G.pmode) : null;
  if (G.planT) G.planT.cut = !!(G.plan && G.plan.cut);
}
// ---- radar pulse ----
export function doPulse(m, x, y) { // R18: costs and EMIT from its radar row
  const R = radarOf(m);
  liveFree(m);
  pay(m, R.ap, R.en); addEmit(m, R.emit);
  if (x !== null && x !== undefined) faceTo(m, x, y);
  m.radarOn = true; m.pulseSeq = (m.pulseSeq || 0) + 1; // R19: one RWR warning per pulse
  startAct({ k: 'PULSE', m, t: TUNE.RADAR_PULSE_TIME });
}
// ---- shots (same lock rule shape for both mechs) ----
// '' = can shoot; otherwise the one-word reason shown on the FIRE button.
export function shootBlock(m, c, uncMax, range) {
  if (!c || !c.on || !fitted(m, 'GUN')) return 'NONE'; // R18: no gun row fitted
  if (!gunOf(m)) return offWhy(m, 'GUN') || 'ARMS'; // R12. R18: its part is gone (ARMS = WEAPON)
  if (m.ammo <= 0) return 'AMMO';
  if (m.turnShots >= TUNE.SHOTS_PER_TURN) return 'CAP';
  if (G.live && (m.aim || m.cool > 0)) return 'COOL'; // R25: aiming, or the gun cooling down
  if (m.ap < TUNE.AP_SHOT) return 'AP';
  const x = cx(c), y = cy(c);
  if (c.snd) return 'SOUND'; // R13: heard only, never a lock (says so on the button)
  if (c.shr || c.lost > c.gap || c.unc > uncMax * T) return 'FUZZY'; // R13: a shared alarm contact never locks
  if (Math.hypot(x - m.x, y - m.y) > range * T) return 'RANGE';
  if (tilesCrossed(m.x, m.y, x, y, 1) !== 0) return 'LOS';
  return '';
}
// R12: the odds for m shooting at contact c (null if nothing behind it)
export function shotOdds(m, c) { const u = c && c.on ? unitById(c.id) : null; return u && !u.dead ? hitChance(m, u, c) : null; }
// R25: a shot order. Live: aim first (LIVE_AIM_TIME), then fire (live.ts). Turns: fire now.
export function shoot(m, c) { if (G.live) liveAim(m, c); else doShot(m, c); }
export function doShot(m, c) {
  pay(m, TUNE.AP_SHOT, 0); m.turnShots++; addHeat(m, TUNE.IR_FIRE); // R18 cp3: a shot heats the gun
  faceTo(m, cx(c), cy(c));
  // R12: roll to hit at the trigger (seeded). A miss flies wide of the fix centre and damages nothing.
  const h = shotOdds(m, c), tgt = unitById(c.id);
  const rec: any = h ? { ...h, roll: rand() * 100 < h.pct, mech: isMech(m), shooter: m.id, target: tgt ? tgt.id : '', ttype: tgt ? (isMech(tgt) ? 'MECH' : tgt.type) : '', hit: false, part: '', turn: G.turn } : null;
  let ax = cx(c), ay = cy(c);
  if (rec && rec.roll && tgt) { ax = tgt.x; ay = tgt.y; } // a rolled hit lands on the unit itself, so the shown % is the real chance
  else if (rec && !rec.roll) { const a = rand() * 6.2832, d = (TUNE.HIT_RADIUS + 0.4 + rand() * 0.6) * T; ax += Math.cos(a) * d; ay += Math.sin(a) * d; }
  fire(m, ax, ay, rec); makeSound(m, 'SHOT');
  if (rec) { G.shotLog.push(rec); G.lastShot[rec.mech ? 'P' : 'E'] = rec; }
  muzzleFlash(m, unitById(c.id)); // R7: the target sees where the shot came from
  startAct({ k: 'SHOT', m, t: 0.05 });
}
// ---- Round 9: mortar (player mechs with the module). Fires on the target contact's fix centre, no LoS. ----
// '' = can fire; otherwise the one-word reason shown on the MORTAR button.
export function mortarBlock(m, c) {
  const M = mortarOf(m); // R18: the mortar row's AP and ranges
  if (!fitted(m, 'MORTAR') || !c || !c.on) return 'NONE';
  if (!M) return offWhy(m, 'MORTAR'); // R18: its part is gone (BACK)
  if (m.shells <= 0) return 'SHELLS';
  if (m.mUsed >= TUNE.MORTAR_PER_ACTIVATION) return 'CAP';
  if (G.live && m.mcool > 0) return 'COOL'; // R25: the tube cooling down
  if (m.ap < M.ap) return 'AP';
  if (c.snd) return 'SOUND'; // R13: no aimed lob on a sound-only contact (blind lobs still work)
  if (c.unc > TUNE.MORTAR_MAX_UNC * T) return 'FUZZY';
  const d = Math.hypot(cx(c) - m.x, cy(c) - m.y);
  if (d < M.min * T) return 'CLOSE';
  if (d > M.max * T) return 'RANGE';
  return '';
}
// scatter radius (world units) for m's shot on contact c: tighter fix = tighter circle
export function mortarScatter(c, m = G.p) { const M = mortarOf(m); return (M.scatter + c.unc / T * M.perUnc) * T; }
// R9 run1: blind lob at a tapped map point. '' = can fire; else the one-word reason.
export function mortarBlindBlock(m, x?, y?) {
  const M = mortarOf(m);
  if (!fitted(m, 'MORTAR')) return 'NONE';
  if (!M) return offWhy(m, 'MORTAR');
  if (m.shells <= 0) return 'SHELLS';
  if (m.mUsed >= TUNE.MORTAR_PER_ACTIVATION) return 'CAP';
  if (G.live && m.mcool > 0) return 'COOL'; // R25: the tube cooling down
  if (m.ap < M.ap) return 'AP';
  if (x === undefined) return '';
  const d = Math.hypot(x - m.x, y - m.y);
  if (d < M.min * T) return 'CLOSE';
  if (d > M.max * T) return 'RANGE';
  return '';
}
export function doMortar(m, c) { // R10: aimed-lob stats split by whether the target unit stands in NOISE (runner)
  const u = unitById(c.id), noisy = zoneType(u) === 'NOISE', h0 = m.mHits;
  lob(m, cx(c), cy(c), mortarScatter(c, m), u);
  const k = noisy ? 'mN' : 'mO'; m[k + 'S'] = (m[k + 'S'] || 0) + 1; m[k + 'U'] = (m[k + 'U'] || 0) + c.unc / T; m[k + 'H'] = (m[k + 'H'] || 0) + (m.mHits > h0 ? 1 : 0);
}
export function doMortarBlind(m, x, y) { const M = mortarOf(m); m.mBlind++; lob(m, x, y, blindScatter(m, x, y), null); }
// R18 fix list 12: a blind lob's scatter radius (world units) grows with range (a short lob lands closer)
export function blindScatter(m, x, y) { const M = mortarOf(m), d = Math.hypot(x - m.x, y - m.y) / T; return (M.scatter + Math.max(TUNE.MORTAR_BLIND_UNC_MIN, Math.min(TUNE.MORTAR_BLIND_UNC, d * TUNE.MORTAR_BLIND_UNC_PER_TILE)) * M.perUnc) * T; }
// one shell: aim point (ax, ay), scatter radius r. target = the unit whose contact was aimed at (gets the flash);
// a blind lob has none, so every field unit the splash hits gets the flash instead.
function lob(m, ax, ay, r, target) {
  liveFree(m);
  pay(m, mortarOf(m).ap, 0); addHeat(m, TUNE.IR_FIRE); m.mUsed++; m.shells--; m.mShots++;
  makeSound(m, 'MORTAR'); m.fireT = TUNE.SIG_FIRE_TIME; // R13: loud as Sound (no Emissions); fireT is display only now
  const a = rand() * 6.2832, k = Math.sqrt(rand()) * r;
  const ix = ax + Math.cos(a) * k, iy = ay + Math.sin(a) * k, sp = TUNE.MORTAR_SPLASH * T, dmg = TUNE.MORTAR_DMG * TUNE.ARMOUR_HITS;
  let hit = false; const struck = [];
  for (const u of [...G.units, ...friends()]) { // R15 s3: a splash hurts the transport too
    if (u.dead || Math.hypot(u.x - ix, u.y - iy) > sp) continue;
    const alive = u.hits > 0;
    aarHitBy(m, m.x, m.y, 'MORTAR'); damagePart(u, rollPart(u), dmg); aarHitBy(null, 0, 0, ''); u.took = (u.took || 0) + 1; // R12: a splash hit rolls a part (no to-hit roll: scatter does that)
    if (isFriend(u)) { m.mFriendly++; if (isMech(u)) hooks.playerHit(); }
    else { hit = true; struck.push(u); if (alive && u.hits <= 0) m.mKills++; }
  }
  if (hit) m.mHits++;
  impactFx(ix, iy, hit);
  G.splash = { x: ix, y: iy, r, sp, hit, t: 2.5 };
  if (target) muzzleFlash(m, target, TUNE.MORTAR_FLASH_UNC); // the targeted unit gets a fuzzy contact on the firer
  else for (const u of struck) if (u.hits > 0) muzzleFlash(m, u, TUNE.MORTAR_FLASH_UNC);
  startAct({ k: 'MORTAR', m, t: 0.4 });
}
// R18: m's shot range (tiles), from its gun row (0 = no gun)
export function fireRange(m) { return gunOf(m)?.range || 0; }
export function playerTarget() { return G.sel && G.sel.on ? G.sel : bestContact(G.pc); }
// ---- Round 5: uplink ----
export function upDist(m) { return Math.hypot(G.up.x - m.x, G.up.y - m.y) / T; } // tiles from the point's centre
// '' = can uplink; otherwise the one-word reason shown on the button
export function uplinkBlock() {
  if (!isType('UPLINK')) return 'NONE'; // R15: only an uplink job has one
  if (G.live && G.p.lact && G.p.lact.k === 'UPLINK') return 'DONE'; // R25: already uplinking
  if (upDist(G.p) > TUNE.UPLINK_RADIUS + 0.5) return 'RANGE';
  if (G.up.used) return 'DONE';
  if (G.p.ap < TUNE.AP_UPLINK) return 'AP';
  return '';
}
export function doUplink() {
  const p = G.p, U = G.up;
  pay(p, TUNE.AP_UPLINK, 0); addEmit(p, TUNE.SIG_UPLINK); U.used = true; U.prog++;
  if (U.prog < TUNE.UPLINK_TURNS) aarObj('UPLINK', p); // R22: the uplink's first turn (its last ends the hunt)
  if (U.prog >= TUNE.UPLINK_TURNS) { G.winBy = 'UPLINK'; finishHunt('WIN'); }
}

// ============================ COMMANDS (R6) ===========================
// The view's only way to change rule state. Bodies are the old button / tap handlers.
export function playerFree() { return G.mode === 'hunt' && G.phase === 'PLAYER' && !G.act; }
export function cmdMoveMode(m) { G.pmode = m; }
export function cmdTarget(x, y) { G.planD = null; G.planT = { x, y, cut: false }; replan(); } // tapped move destination; MOVE executes it
// R17: a drawn path (the view's stroke, world points). Waypoints further along than keepTo (tiles) are dropped: the view
// passes the redraw point when you drag from the middle of the path (Door Kickers style: the rest is thrown away).
export function cmdDraw(pts: { x: number; y: number }[], keepTo = Infinity) {
  if (!TUNE.DRAW_PATH_ENABLED || !playerFree()) return;
  const wps = G.planD ? G.planD.wps.filter(w => w.d <= keepTo) : [];
  G.planT = null; G.planD = { pts, wps }; replan();
}
// R17: set (or re-aim) the facing waypoint d tiles along the drawn path. false = off the path, or FACE_WAYPOINTS_MAX already set.
const WP_SAME = 0.6; // tiles: a waypoint this close along the path is the same one
export function cmdWaypoint(d: number, fx: number, fy: number, lx?: number, ly?: number) { // r17-s3: lx, ly = the look marker (view only)
  if (!G.planD || !G.plan || !G.plan.drawn || !playerFree() || d <= 0.05 || d > G.plan.length + 1e-6) return false;
  const w = G.planD.wps.find(w => Math.abs(w.d - d) < WP_SAME);
  if (w) { w.fx = fx; w.fy = fy; w.lx = lx; w.ly = ly; }
  else if (G.planD.wps.length >= TUNE.FACE_WAYPOINTS_MAX) return false;
  else G.planD.wps.push({ d, fx, fy, lx, ly });
  replan(); return true;
}
export function waypointNear(d: number) { return G.planD ? G.planD.wps.find(w => Math.abs(w.d - d) < WP_SAME) || null : null; }
export function cmdClearWaypoint(d: number) { if (G.planD) { G.planD.wps = G.planD.wps.filter(w => Math.abs(w.d - d) >= WP_SAME); replan(); } }
export function cmdClearDraw() { G.planD = null; replan(); }
export function cmdMove() { if (G.live) replan(); if (G.plan && G.plan.path) doMove(G.p, G.plan); } // R25: live = plan again from where the ExoS stands now
export function cmdUplink() { if (uplinkBlock() === '') { if (G.live) liveUplink(); else doUplink(); } } // R25: live = a timed order
// R15 s3: pick the route leg at the junction the transport holds at (no AP: it's an order, on your turn)
export function cmdLeg(i: number) { if (playerFree()) { pickLeg(i); hooks.sync(); } } // R16: at the fork it waits at = go; at a fork ahead = set / clear the lever
// R16 (Jamie): order the Escort transport to HOLD (skip its next move) or HURRY (sprint its next move). No AP; limited uses.
export function cmdEscortOrder(kind: string) { if (playerFree() && giveOrder(kind)) hooks.sync(); }
// R15: the objective button. Uplink: UPLINK. Retrieve: PICK UP the cargo, or HAND OFF if the active mech carries it.
export function objectiveBlock() {
  if (isType('RETRIEVE')) return isCarrier(G.p) ? handoffBlock(G.p) : pickupBlock(G.p);
  return uplinkBlock();
}
export function cmdObjective() {
  if (!playerFree() || objectiveBlock() !== '') return;
  if (G.live) { if (G.p.lact && ['UPLINK', 'PICKUP', 'HANDOFF'].includes(G.p.lact.k)) return; if (isType('RETRIEVE')) livePickup(); else liveUplink(); return; } // R25: a timed order (not twice)
  if (isType('RETRIEVE')) { if (isCarrier(G.p)) doHandoff(G.p); else doPickup(G.p); hooks.sync(); return; }
  doUplink();
}
export function sensorsUp(m) { return !partGone(m, 'SENSORS'); } // R12: radar / ECM / ghost need sensors. R18: kept for the eyes; modules ask has() (their own part)
export function cmdRadar() {
  const R = radarOf(G.p);
  if (!R) return; // R13: the module is needed (the view only hid the button). R18: a working radar row (its part not gone)
  if (!canPay(G.p, R.ap, R.en)) return;
  const c = G.sel && G.sel.on ? G.sel : null; // selected contact: turn to face it first
  doPulse(G.p, c ? cx(c) : null, c ? cy(c) : null);
}
export function cmdEcm() {
  if (G.p.mask) G.p.mask = false;
  else if (G.live) { if (has(G.p, 'MASK') && canPay(G.p, 0, TUNE.ECM_EN)) liveEcmOn(); } // R25: switching on takes LIVE_ACT_TIME.ECM
  else if (has(G.p, 'MASK') && canPay(G.p, TUNE.AP_ECM, TUNE.ECM_EN)) { pay(G.p, TUNE.AP_ECM, TUNE.ECM_EN); addEmit(G.p, TUNE.SIGNAL_ECM); G.p.mask = true; }
}
export function canGhost() { return !G.ghost.on && has(G.p, 'GHOST') && canPay(G.p, TUNE.AP_ECM, TUNE.GHOST_COST); }
export function cmdGhost(x, y) {
  if (canGhost()) { pay(G.p, TUNE.AP_ECM, TUNE.GHOST_COST); G.ghost.on = true; G.ghost.owner = G.p; G.ghost.x = x; G.ghost.y = y; G.ghost.turns = TUNE.GHOST_TURNS; }
  replan();
}
export function cmdFire() {
  const c = playerTarget();
  if (shootBlock(G.p, c, TUNE.PLAYER_FIRE_UNC, fireRange(G.p)) === '') { G.sel = c; shoot(G.p, c); }
}
export function cmdMortar() { // R9
  const c = playerTarget();
  if (mortarBlock(G.p, c) === '') { G.sel = c; doMortar(G.p, c); }
}
export function cmdMortarOn(c) { if (mortarBlock(G.p, c) === '') { G.sel = c; doMortar(G.p, c); return true; } return false; } // R9 run1: aimed, from the armed tap
export function cmdMortarAt(x, y) { if (mortarBlindBlock(G.p, x, y) === '') doMortarBlind(G.p, x, y); } // R9 run1
export function cmdFace(x, y) { freeTurn(G.p, x, y); replan(); }
export function cmdSelect(c) { G.sel = c; freeTurn(G.p, cx(c), cy(c)); replan(); } // select + turn to face (if affordable)
// R24 fix list 10 (C19): clear the selection (a tap on empty ground or on your own ExoS). FIRE and ID go back to the best contact.
export function cmdDeselect() { G.sel = null; }
