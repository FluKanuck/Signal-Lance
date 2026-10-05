import { TUNE } from '../tune.ts';
import { W, T, isSolid, findPath, tilesCrossed } from './world.ts';
import { G, hooks, finishHunt, unitById, livingMechs, isMech, setActive } from './state.ts';
import { rand } from './rng.ts';
import { updateSensors, cx, cy, killContact, muzzleFlash } from './sensors.ts';
import { bestContact, enemyDecide } from './bot.ts';
import { effEmit, zoneType } from './zones.ts';
import { hitChance, rollPart, damagePart, partGone } from './combat.ts';
import { makeSound, clearSound } from './sound.ts';

// ============================ UPDATE ==================================
export function moveAlong(m, speed, dt) {
  m.moving = false;
  if (!m.path) return;
  let step = speed * T * dt;
  while (step > 0 && m.path) {
    const wp = m.path[m.pi], dx = wp.x - m.x, dy = wp.y - m.y, d = Math.hypot(dx, dy);
    if (d <= step) { m.x = wp.x; m.y = wp.y; step -= d; m.movedT = (m.movedT || 0) + d / T; if (++m.pi >= m.path.length) m.path = null; }
    else { m.x += dx / d * step; m.y += dy / d * step; m.fx = dx / d; m.fy = dy / d; m.movedT = (m.movedT || 0) + step / T; step = 0; } // R12: tiles moved this activation
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
    s.vx = (ax - m.x) / d; s.vy = (ay - m.y) / d; s.owner = m;
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
      for (const m of isMech(s.owner) ? G.units : G.lance) {
        const d = Math.hypot(m.x - s.x, m.y - s.y);
        if (!m.dead && d <= vd) { v = m; vd = d; }
      }
      // R12: a rolled miss damages nothing; a rolled hit (or a shell that lands on someone else) hits a rolled part
      if (s.rec && !s.rec.roll) v = null;
      const hit = !!v;
      if (hit) {
        const part = rollPart(v); damagePart(v, part, TUNE.SHOT_DAMAGE);
        s.owner.landed++; v.took = (v.took || 0) + 1; if (isMech(v)) hooks.playerHit();
        if (s.rec) s.rec.part = part;
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
    killContact(G.pc, u.id); if (G.sel && !G.sel.on) G.sel = null;
  }
  for (const m of G.lance) if (m.hits <= 0 && !m.dead) { // R7 s2: a destroyed mech is out (skipped in the order)
    m.dead = true; m.radarOn = false; m.mask = false; m.path = null; m.moving = false;
    for (const u of G.units) killContact(u.ec, m.id);
  }
}

// R6: advance the sim by dt seconds (was update(); the camera follow moved to the view).
export function step(dt) {
  if (G.mode !== 'hunt') return;
  if (G.splash && (G.splash.t -= dt) <= 0) G.splash = null; // R9: the splash marker fades in real time
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
  m.en = Math.min(m.enMax, m.en + TUNE.ENERGY_REGEN);
  m.turnShots = 0; m.mUsed = 0; m.freeTurns = TUNE.FREE_TURNS; m.movedT = 0; // R12: "target moved" counts this activation's tiles
  const es = G.emitStat[isMech(m) ? 'P' : 'E']; es.n++; es.sum += m.emit; // R13: Emissions at activation start (runner)
  addEmit(m, -TUNE.SIGNAL_DECAY);
  clearSound(m); // R13: last activation's sound is gone
  if (partGone(m, 'SENSORS')) m.mask = false; // R12: no ECM without sensors
  if (m.mask) { if (canPay(m, TUNE.AP_ECM, TUNE.ECM_EN)) { pay(m, TUNE.AP_ECM, TUNE.ECM_EN); addEmit(m, TUNE.SIGNAL_ECM); } else m.mask = false; }
}
// ---- R7 s2: initiative. Each round every living unit rolls INIT_BASE[type] + 0..INIT_ROLL; higher first,
// ties to the player (then list order). Each unit acts on its own activation; END TURN passes it on.
export function initOf(m) { return isMech(m) ? TUNE.INIT_BASE.MECH : TUNE.INIT_BASE[m.type]; }
export function startRound() {
  const all = [...livingMechs(), ...G.units.filter(u => !u.dead)];
  for (const m of all) m.init = initOf(m) + Math.floor(rand() * (TUNE.INIT_ROLL + 1));
  all.forEach((m, i) => { m.ord = i; });
  G.order = all.sort((a, b) => b.init - a.init || (isMech(b) ? 1 : 0) - (isMech(a) ? 1 : 0) || a.ord - b.ord);
  G.oi = -1;
  nextActivation();
}
export function nextActivation() {
  if (G.mode !== 'hunt') return;
  do G.oi++; while (G.oi < G.order.length && G.order[G.oi].dead);
  if (G.oi >= G.order.length) { G.turn++; startRound(); return; }
  const m = G.order[G.oi];
  beginUnit(m);
  if (isMech(m)) {
    G.phase = 'PLAYER'; setActive(m);
    G.up.used = false; // one UPLINK per mech activation
    if (G.ghost.on && G.ghost.owner === m && --G.ghost.turns <= 0) G.ghost.on = false;
    G.planT = null; replan();
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
  if (G.mode !== 'hunt' || G.phase !== 'PLAYER' || G.act) return;
  nextActivation();
}
export function enemyStep() {
  const e = G.units[G.ei];
  if (!e) return;
  const c0 = bestContact(e.ec);
  if (c0 && !e.dead && (turnCost(e, cx(c0), cy(c0)) === 0 || e.ap > TUNE.AP_SHOT * TUNE.SHOTS_PER_TURN)) freeTurn(e, cx(c0), cy(c0)); // turn toward its best contact, same rules as the player
  const a = enemyDecide(e);
  if (!a) { nextActivation(); return; }
  a();
  if (!G.act) G.ewait = TUNE.ENEMY_ACT_PAUSE;
}
export function startAct(a) { a.t = a.t || 0; a.age = 0; G.act = a; hooks.sync(); }
export function shellsFlying() { for (const s of G.shells) if (s.on) return true; return false; }
export function stepAction(dt) {
  const a = G.act, p = G.p;
  G.time += dt; a.t -= dt; a.age += dt;
  if (a.k === 'MOVE') moveAlong(a.m, a.speed, dt);
  updateSensors(dt);
  updateShells(dt);
  if (!livingMechs().length) { G.act = null; finishHunt('LOSS'); return; } // R7 s2: both mechs destroyed
  if (G.kills >= G.units.length) { G.act = null; G.winBy = 'CLEAR'; finishHunt('WIN'); return; } // R7: whole field destroyed
  if (!p.dead && Math.floor(p.x / T) >= W - TUNE.EXTRACT_COLS) { G.act = null; finishHunt('BAIL'); return; } // a mech reaching extraction pulls the lance out
  const done = a.k === 'MOVE' ? !a.m.path || a.age > 30 : a.t <= 0 && !shellsFlying();
  if (!done) return;
  a.m.moving = false; a.m.path = null; if (a.k === 'PULSE') a.m.radarOn = false;
  G.act = null;
  if (G.phase === 'ENEMY') G.ewait = TUNE.ENEMY_ACT_PAUSE;
  else { if (a.m === p && G.planT && !G.planT.cut) G.planT = null; replan(); hooks.sync(); }
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
  if (mode !== 'CREEP' && partGone(m, 'LEGS')) return { full, path: null, len: 0, ap: 0, en: 0, cut: true, why: 'LEGS', mode }; // R12: legs gone = CREEP only
  const tpa = TUNE.MOVE_TILES_PER_AP[mode], ept = TUNE.MOVE_ENERGY_PER_TILE[mode];
  apMax = Math.min(m.ap, apMax === undefined ? m.ap : apMax); enMax = Math.min(m.en, enMax === undefined ? m.en : enMax);
  const fullLen = pathLen(full), apLen = apMax * tpa, enLen = ept > 0 ? enMax / ept : 1e9;
  const len = Math.min(fullLen, apLen, enLen);
  const r: any = { full, path: null, len: 0, ap: 0, en: 0, cut: len < fullLen - 1e-3, why: apLen <= enLen ? 'AP' : 'EN', mode };
  if (len < 0.25) return r;
  r.path = r.cut ? clipPath(full, len) : full; r.len = len;
  r.ap = Math.ceil(len / tpa - 1e-6); r.en = Math.ceil(len * ept - 1e-6);
  r.snd = TUNE.SOUND_RANGE[mode]; // R13: the sound radius this move will make (Emissions no longer rise with moves)
  return r;
}
export function doMove(m, pl) {
  pay(m, pl.ap, pl.en); makeSound(m, pl.mode);
  m.path = pl.path; m.pi = 1; m.creep = pl.mode === 'CREEP';
  startAct({ k: 'MOVE', m, speed: MODE_SPEED[pl.mode] });
}
export function replan() {
  G.plan = G.planT ? planMove(G.p, G.planT.x, G.planT.y, G.pmode) : null;
  if (G.planT) G.planT.cut = !!(G.plan && G.plan.cut);
}
// ---- radar pulse ----
export function doPulse(m, x, y) {
  pay(m, TUNE.AP_RADAR, TUNE.RADAR_EN); addEmit(m, TUNE.SIGNAL_RADAR);
  if (x !== null && x !== undefined) faceTo(m, x, y);
  m.radarOn = true;
  startAct({ k: 'PULSE', m, t: TUNE.RADAR_PULSE_TIME });
}
// ---- shots (same lock rule shape for both mechs) ----
// '' = can shoot; otherwise the one-word reason shown on the FIRE button.
export function shootBlock(m, c, uncMax, range) {
  if (!c || !c.on) return 'NONE';
  if (partGone(m, 'WEAPON')) return 'WPN'; // R12
  if (m.ammo <= 0) return 'AMMO';
  if (m.turnShots >= TUNE.SHOTS_PER_TURN) return 'CAP';
  if (m.ap < TUNE.AP_SHOT) return 'AP';
  const x = cx(c), y = cy(c);
  if (c.snd || c.shr || c.lost > c.gap || c.unc > uncMax * T) return 'FUZZY'; // R13: a sound-only or shared contact never locks
  if (Math.hypot(x - m.x, y - m.y) > range * T) return 'RANGE';
  if (tilesCrossed(m.x, m.y, x, y, 1) !== 0) return 'LOS';
  return '';
}
// R12: the odds for m shooting at contact c (null if nothing behind it)
export function shotOdds(m, c) { const u = c && c.on ? unitById(c.id) : null; return u && !u.dead ? hitChance(m, u, c) : null; }
export function doShot(m, c) {
  pay(m, TUNE.AP_SHOT, 0); m.turnShots++;
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
  if (!m.load.mortar || !c || !c.on) return 'NONE';
  if (m.shells <= 0) return 'SHELLS';
  if (m.mUsed >= TUNE.MORTAR_PER_ACTIVATION) return 'CAP';
  if (m.ap < TUNE.AP_MORTAR) return 'AP';
  if (c.snd || c.unc > TUNE.MORTAR_MAX_UNC * T) return 'FUZZY'; // R13: no aimed lob on a sound-only contact (blind lobs still work)
  const d = Math.hypot(cx(c) - m.x, cy(c) - m.y);
  if (d < TUNE.MORTAR_MIN_RANGE * T) return 'CLOSE';
  if (d > TUNE.MORTAR_MAX_RANGE * T) return 'RANGE';
  return '';
}
// scatter radius (world units) for a shot on contact c: tighter fix = tighter circle
export function mortarScatter(c) { return (TUNE.MORTAR_SCATTER_BASE + c.unc / T * TUNE.MORTAR_SCATTER_PER_UNC) * T; }
// R9 run1: blind lob at a tapped map point. '' = can fire; else the one-word reason.
export function mortarBlindBlock(m, x?, y?) {
  if (!m.load.mortar) return 'NONE';
  if (m.shells <= 0) return 'SHELLS';
  if (m.mUsed >= TUNE.MORTAR_PER_ACTIVATION) return 'CAP';
  if (m.ap < TUNE.AP_MORTAR) return 'AP';
  if (x === undefined) return '';
  const d = Math.hypot(x - m.x, y - m.y);
  if (d < TUNE.MORTAR_MIN_RANGE * T) return 'CLOSE';
  if (d > TUNE.MORTAR_MAX_RANGE * T) return 'RANGE';
  return '';
}
export function doMortar(m, c) { // R10: aimed-lob stats split by whether the target unit stands in NOISE (runner)
  const u = unitById(c.id), noisy = zoneType(u) === 'NOISE', h0 = m.mHits;
  lob(m, cx(c), cy(c), mortarScatter(c), u);
  const k = noisy ? 'mN' : 'mO'; m[k + 'S'] = (m[k + 'S'] || 0) + 1; m[k + 'U'] = (m[k + 'U'] || 0) + c.unc / T; m[k + 'H'] = (m[k + 'H'] || 0) + (m.mHits > h0 ? 1 : 0);
}
export function doMortarBlind(m, x, y) { m.mBlind++; lob(m, x, y, (TUNE.MORTAR_SCATTER_BASE + TUNE.MORTAR_BLIND_UNC * TUNE.MORTAR_SCATTER_PER_UNC) * T, null); }
// one shell: aim point (ax, ay), scatter radius r. target = the unit whose contact was aimed at (gets the flash);
// a blind lob has none, so every field unit the splash hits gets the flash instead.
function lob(m, ax, ay, r, target) {
  pay(m, TUNE.AP_MORTAR, 0); m.mUsed++; m.shells--; m.mShots++;
  makeSound(m, 'MORTAR'); m.fireT = TUNE.SIG_FIRE_TIME; // R13: loud as Sound (no Emissions); fireT is display only now
  const a = rand() * 6.2832, k = Math.sqrt(rand()) * r;
  const ix = ax + Math.cos(a) * k, iy = ay + Math.sin(a) * k, sp = TUNE.MORTAR_SPLASH * T, dmg = TUNE.MORTAR_DMG * TUNE.ARMOUR_HITS;
  let hit = false; const struck = [];
  for (const u of [...G.units, ...G.lance]) {
    if (u.dead || Math.hypot(u.x - ix, u.y - iy) > sp) continue;
    const alive = u.hits > 0;
    damagePart(u, rollPart(u), dmg); u.took = (u.took || 0) + 1; // R12: a splash hit rolls a part (no to-hit roll: scatter does that)
    if (isMech(u)) { m.mFriendly++; hooks.playerHit(); }
    else { hit = true; struck.push(u); if (alive && u.hits <= 0) m.mKills++; }
  }
  if (hit) m.mHits++;
  impactFx(ix, iy, hit);
  G.splash = { x: ix, y: iy, r, sp, hit, t: 2.5 };
  if (target) muzzleFlash(m, target, TUNE.MORTAR_FLASH_UNC); // the targeted unit gets a fuzzy contact on the firer
  else for (const u of struck) if (u.hits > 0) muzzleFlash(m, u, TUNE.MORTAR_FLASH_UNC);
  startAct({ k: 'MORTAR', m, t: 0.4 });
}
export function playerTarget() { return G.sel && G.sel.on ? G.sel : bestContact(G.pc); }
// ---- Round 5: uplink ----
export function upDist(m) { return Math.hypot(G.up.x - m.x, G.up.y - m.y) / T; } // tiles from the point's centre
// '' = can uplink; otherwise the one-word reason shown on the button
export function uplinkBlock() {
  if (upDist(G.p) > TUNE.UPLINK_RADIUS + 0.5) return 'RANGE';
  if (G.up.used) return 'DONE';
  if (G.p.ap < TUNE.AP_UPLINK) return 'AP';
  return '';
}
export function doUplink() {
  const p = G.p, U = G.up;
  pay(p, TUNE.AP_UPLINK, 0); addEmit(p, TUNE.SIG_UPLINK); U.used = true; U.prog++;
  if (U.prog >= TUNE.UPLINK_TURNS) { G.winBy = 'UPLINK'; finishHunt('WIN'); }
}

// ============================ COMMANDS (R6) ===========================
// The view's only way to change rule state. Bodies are the old button / tap handlers.
export function playerFree() { return G.mode === 'hunt' && G.phase === 'PLAYER' && !G.act; }
export function cmdMoveMode(m) { G.pmode = m; }
export function cmdTarget(x, y) { G.planT = { x, y, cut: false }; replan(); } // tapped move destination; MOVE executes it
export function cmdMove() { if (G.plan && G.plan.path) doMove(G.p, G.plan); }
export function cmdUplink() { if (uplinkBlock() === '') doUplink(); }
export function sensorsUp(m) { return !partGone(m, 'SENSORS'); } // R12: radar / ECM / ghost need sensors
export function cmdRadar() {
  if (!G.p.load.radar || !sensorsUp(G.p)) return; // R13: the module is needed (the view only hid the button)
  if (!canPay(G.p, TUNE.AP_RADAR, TUNE.RADAR_EN)) return;
  const c = G.sel && G.sel.on ? G.sel : null; // selected contact: turn to face it first
  doPulse(G.p, c ? cx(c) : null, c ? cy(c) : null);
}
export function cmdEcm() {
  if (G.p.mask) G.p.mask = false;
  else if (sensorsUp(G.p) && canPay(G.p, TUNE.AP_ECM, TUNE.ECM_EN)) { pay(G.p, TUNE.AP_ECM, TUNE.ECM_EN); addEmit(G.p, TUNE.SIGNAL_ECM); G.p.mask = true; }
}
export function canGhost() { return !G.ghost.on && sensorsUp(G.p) && canPay(G.p, TUNE.AP_ECM, TUNE.GHOST_COST); }
export function cmdGhost(x, y) {
  if (canGhost()) { pay(G.p, TUNE.AP_ECM, TUNE.GHOST_COST); G.ghost.on = true; G.ghost.owner = G.p; G.ghost.x = x; G.ghost.y = y; G.ghost.turns = TUNE.GHOST_TURNS; }
  replan();
}
export function cmdFire() {
  const c = playerTarget();
  if (shootBlock(G.p, c, TUNE.PLAYER_FIRE_UNC, TUNE.PLAYER_FIRE_RANGE) === '') { G.sel = c; doShot(G.p, c); }
}
export function cmdMortar() { // R9
  const c = playerTarget();
  if (mortarBlock(G.p, c) === '') { G.sel = c; doMortar(G.p, c); }
}
export function cmdMortarOn(c) { if (mortarBlock(G.p, c) === '') { G.sel = c; doMortar(G.p, c); return true; } return false; } // R9 run1: aimed, from the armed tap
export function cmdMortarAt(x, y) { if (mortarBlindBlock(G.p, x, y) === '') doMortarBlind(G.p, x, y); } // R9 run1
export function cmdFace(x, y) { freeTurn(G.p, x, y); replan(); }
export function cmdSelect(c) { G.sel = c; freeTurn(G.p, cx(c), cy(c)); replan(); } // select + turn to face (if affordable)
