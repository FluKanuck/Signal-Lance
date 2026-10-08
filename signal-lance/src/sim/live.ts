// R25 "Live toy": live time. One clock runs the hunt and every unit acts at once. PAUSE stops the clock, and every order
// still works while paused. Only the toy page (TUNE.TIME_MODE 'live') runs this file; the main game never calls it, so its
// turns stay byte-identical (runner --check).
//
// How the turn rules map onto the clock:
// - Each unit has its own action slot (m.lact). A move, a RADAR pulse, an UPLINK, a PICK UP and so on run in it, one at a
//   time; a new order replaces the current one (a move hands back the EN for the part it didn't walk).
// - The gun is a second slot (m.aim): aim LIVE_AIM_TIME, fire, then LIVE_FIRE_COOLDOWN. Aiming never stops a move.
// - Your ExoS have no AP: time is the budget. Field units keep their AP inside, refilled every LIVE_ROUND_SEC (the bot
//   brain still thinks in turns: one move per round, patience in rounds), so their actions cost the same time as yours.
// - Per-turn amounts become per-second ones: EN regen, EMIT decay, heat cooling and ECM upkeep, each ÷ LIVE_ROUND_SEC.
// - A SOUND lasts LIVE_ROUND_SEC after the step or shot that made it (it was "until the unit's next turn").
// - G.turn still counts rounds (one every LIVE_ROUND_SEC): RWR, GHOST, LAST SEEN and the after-action list use it.
import { TUNE } from '../tune.ts';
import { T } from './world.ts';
import { G, hooks, livingMechs, isMech, isFriend, setActive, finishHunt, unitById } from './state.ts';
import { rand } from './rng.ts';
import { updateSensors, cx, cy } from './sensors.ts';
import { enemyDecide, bestContact } from './bot.ts';
import { clearSound } from './sound.ts';
import { noteActEnd } from './ids.ts';
import { ageRwr } from './rwr.ts';
import { has, radarOf } from './kit.ts';
import { noteCarry } from './company.ts';
import { pathCost } from './world.ts';
import { allyStep } from './escort.ts';
import { cargoLost, onCargoLost, onAllyLost, onAllyOut, onClear, onAllOut, isType, pickupBlock, doPickup, handoffBlock, doHandoff, isCarrier } from './mission.ts';
import { moveAlong, moveTick, updateShells, addEmit, inExtract, leaveMap, allOut, doShot, shootBlock, fireRange, turnCost, freeTurn,
  uplinkBlock, doUplink, canPay, pay, playerTarget, replan, MODE_SPEED } from './turns.ts';

export const PLAYER_AP = 99; // a live ExoS never runs out of AP: the rules that still ask for AP always pass

export function isLive() { return !!G.live; }

// newHunt calls this last (after startRound), on the toy page only
export function liveBegin() {
  G.live = true; G.paused = TUNE.LIVE_START_PAUSED; G.phase = 'PLAYER'; G.act = null; G.oi = -1; G.roundT = TUNE.LIVE_ROUND_SEC;
  G.liveLog = [];
  for (const m of allUnits()) {
    m.lact = null; m.aim = null; m.cool = 0; m.mcool = 0; m.sndT = 0; m.stillT = 0;
    if (isMech(m)) { m.ap = PLAYER_AP; m.freeTurns = 99; }
    else if (m !== G.ally) { m.rt = rand() * TUNE.LIVE_ENEMY_STAGGER; m.ap = TUNE.AP_PER_TURN; m.apF = 0; m.done = true; }
  }
  if (G.ally) G.ally.rt = 0;
  // auto-pause: what the lance already knows at the drop never pauses the game
  G.apTrack = {}; G.apCue = null; G.apShots = G.shotLog.length; G.apObj = objSnap();
  for (const c of G.pc) if (c.on) G.apTrack[c.id] = { fixedOnce: isFixed(c), goneAt: null };
  setActive(livingMechs()[0] || G.p);
  hooks.sync();
}
function allUnits() { return [...G.lance, ...G.units, ...(G.ally ? [G.ally] : [])]; }
const busy = m => !!m.lact;

// ---- the clock ----
export function liveStep(dt: number) {
  if (G.mode !== 'hunt' || G.paused) return;
  G.time += dt;
  if ((G.roundT -= dt) <= 0) { G.roundT += TUNE.LIVE_ROUND_SEC; newRound(); }
  for (const m of allUnits()) if (!m.dead && !m.out) tickUnit(m, dt);
  for (const m of allUnits()) if (m.lact && m.lact.k === 'MOVE' && !m.dead) { m.movedAt = G.time; moveAlong(m, m.lact.speed, dt, m.lact.arrive); }
  updateSensors(dt);
  for (const m of allUnits()) if (m.lact && m.lact.k === 'MOVE' && !m.dead) moveTick(m.lact);
  for (const m of allUnits()) if (m.aim && !m.dead) stepAim(m, dt);
  updateShells(dt);
  if (endChecks()) return;
  for (const m of allUnits()) if (m.lact && !m.dead) stepLact(m, dt);
  if (endChecks()) return;
  for (const e of G.units) if (!e.dead) enemyThink(e, dt);
  if (G.ally && !G.ally.dead && !G.ally.out) allyThink(dt);
  autoRefire();
  for (const m of G.lance) if (m.en > m.enMax) m.en = m.enMax; // a stopped move's refund never overfills the pool (it refilled while walking)
  if (G.p && (G.p.dead || G.p.out)) { const n = livingMechs().find(m => !m.out); if (n) liveSelect(n); }
  watchForPause();
}

// ---- R25 cp B: auto-pause. The game stops by itself when something needs a decision; each trigger has its own TUNE
// switch (and a button on the toy's start screen). The cue says why. ----
const apWhy: string[] = []; // the reasons found this tick (several at once = one pause)
function wantPause(why: string) { if (!apWhy.includes(why)) apWhy.push(why); }
// a fix good enough to shoot at: not sound or alarm only, held now, inside FIRE's lock size
export function isFixed(c) { return c.on && !c.snd && !c.shr && c.lost <= c.gap && c.unc <= TUNE.PLAYER_FIRE_UNC * T; }
function objSnap() { return { prog: G.up.prog, carrier: G.mission ? G.mission.carrier || '' : '', ally: G.ally ? G.ally.hits : 0 }; }
// The track rule (Jamie): a contact pauses the game once, when it first appears. A loose track that jumps about or
// corrects itself never pauses it again. It pauses again only when it firms up into a fixed track (the first time), or
// when it was off the picture (or lost) for AUTOPAUSE_RELOST seconds and comes back.
function trackRule() {
  const on = new Set<string>();
  for (const c of G.pc) {
    if (!c.on) continue;
    const u = unitById(c.id); if (!u || u.dead || isFriend(u)) continue;
    on.add(c.id);
    let S = G.apTrack[c.id];
    if (!S) { G.apTrack[c.id] = { fixedOnce: isFixed(c), goneAt: null }; wantPause('CONTACT'); continue; }
    if (c.lost > c.gap) { if (S.goneAt === null) S.goneAt = G.time; continue; } // lost (orange): the clock on its absence runs
    if (S.goneAt !== null) { if (G.time - S.goneAt >= TUNE.AUTOPAUSE_RELOST) { wantPause('BACK'); S.fixedOnce = isFixed(c); } S.goneAt = null; }
    if (!S.fixedOnce && isFixed(c)) { S.fixedOnce = true; wantPause('FIXED'); }
  }
  for (const id of Object.keys(G.apTrack)) if (!on.has(id) && G.apTrack[id].goneAt === null) G.apTrack[id].goneAt = G.time;
}
export function watchForPause() { // exported for the tests
  if (G.mode !== 'hunt') { apWhy.length = 0; return; }
  if (TUNE.AUTOPAUSE_CONTACT) trackRule(); else apWhy.splice(0, apWhy.length, ...apWhy.filter(w => w !== 'CONTACT' && w !== 'FIXED' && w !== 'BACK'));
  for (let i = G.apShots; i < G.shotLog.length; i++) { // TAKING FIRE: when the shooting at an ExoS starts (then quiet for AUTOPAUSE_FIRE_GAP)
    const r = G.shotLog[i], m = r && !r.mech ? G.lance.find(x => x.id === r.target) : null;
    if (!m) continue;
    if (TUNE.AUTOPAUSE_FIRE && G.time - (m.firePauseAt ?? -1e9) >= TUNE.AUTOPAUSE_FIRE_GAP) wantPause('FIRE');
    m.firePauseAt = G.time;
  }
  G.apShots = G.shotLog.length;
  const o = objSnap(), w = G.apObj;
  if (TUNE.AUTOPAUSE_OBJECTIVE && w && (o.prog !== w.prog || o.carrier !== w.carrier || o.ally < w.ally)) wantPause('OBJECTIVE');
  G.apObj = o;
  if (!TUNE.AUTOPAUSE_IDLE) for (let i = apWhy.length - 1; i >= 0; i--) if (apWhy[i].startsWith('IDLE')) apWhy.splice(i, 1);
  if (!apWhy.length) return;
  G.paused = true; G.apCue = { why: apWhy.slice(), t: G.time };
  G.liveLog.push({ t: G.time, k: 'AUTOPAUSE', why: apWhy.join('+') });
  G.apN = (G.apN || 0) + 1;
  apWhy.length = 0;
  hooks.sync();
}

// one ROUND of the clock: what used to happen once a turn
function newRound() {
  G.turn++;
  ageRwr();
  if (G.ghost.on && --G.ghost.turns <= 0) G.ghost.on = false;
  for (const m of G.lance) if (!m.dead && !m.out) noteCarry(m); // standing next to a CRITICAL lancemate for a round picks its operator up
}

// per-second upkeep (was once a turn in beginUnit)
function tickUnit(m, dt: number) {
  const k = dt / TUNE.LIVE_ROUND_SEC;
  if (m === G.ally) { if (m.sound > 0 && (m.sndT = (m.sndT || 0) + dt) >= TUNE.LIVE_ROUND_SEC) { clearSound(m); m.sndT = 0; } return; } // the transport has no EN, EMIT or gun
  m.en = Math.min(m.enMax, m.en + (m.regen ?? TUNE.ENERGY_REGEN) * k);
  m.heat = Math.max(0, (m.heat || 0) - TUNE.IR_COOL_PER_TURN * k);
  addEmit(m, -TUNE.SIGNAL_DECAY * k);
  if (!isMech(m) && m !== G.ally) m.emit = Math.max(m.emit, m.comms || 0);
  if (m.mask) {
    if (!has(m, 'MASK') || m.en < TUNE.ECM_EN * k) m.mask = false;
    else { m.en -= TUNE.ECM_EN * k; addEmit(m, TUNE.SIGNAL_ECM * k); }
  }
  if (m.moving) m.sndT = 0; // a walking unit keeps making its sound
  if (m.sound > 0 && (m.sndT += dt) >= TUNE.LIVE_ROUND_SEC) { clearSound(m); m.sndT = 0; }
  if (m.sound > 0 && m.sound !== m.sndWas) m.sndT = 0; // a new, louder sound starts its own round
  m.sndWas = m.sound;
  if (m.cool > 0) m.cool = Math.max(0, m.cool - dt);
  if (m.mcool > 0) m.mcool = Math.max(0, m.mcool - dt);
  if (!m.moving && G.time - (m.movedAt ?? -1e9) >= TUNE.LIVE_MOVED_WINDOW) m.movedT = 0; // "moved" (to-hit) clears after standing still
  m.turnShots = 0; m.mUsed = 0;
  if (isMech(m)) { m.ap = PLAYER_AP; m.freeTurns = 99; }
}

// ---- the action slot ----
// turns.ts startAct sends every action here on the toy page
export function liveStart(a) {
  const m = a.m;
  if (!m) return;
  if (a.k === 'SHOT') return; // the shot itself is instant here (its aim and cooldown live in m.aim / m.cool)
  if (a.k === 'MORTAR') { a.t = Math.max(a.t, TUNE.LIVE_ACT_TIME.MORTAR); m.mcool = TUNE.LIVE_MORTAR_COOLDOWN; }
  if (a.k === 'PULSE') { a.radarT = a.t; a.t = TUNE.LIVE_ACT_TIME.PULSE; }
  a.dur = a.k === 'MOVE' ? 0 : a.t; a.age = 0; m.lact = a; // turns.ts liveFree() already stopped the old one
  if (a.k === 'MOVE' && m === G.p) { G.planT = null; G.planD = null; G.plan = null; }
  hooks.sync();
}
// a timed order that does its job at the end (UPLINK, PICK UP, HAND OFF, ECM on, GHOST)
export function liveChannel(m, k: string, t: number, done: () => void) {
  if (m.lact) cancelLact(m);
  m.lact = { k, m, t, age: 0, dur: t, done };
  hooks.sync();
}
// stop m's current action. A move hands back the EN for the part it didn't walk.
export function cancelLact(m) {
  const a = m.lact; if (!a) return;
  if (a.k === 'MOVE' && a.pl && m.path) {
    const walked = pathCost([...m.path.slice(0, m.pi), { x: m.x, y: m.y }]);
    const en = Math.min(a.pl.en, Math.ceil(walked * a.pl.ept - 1e-6));
    m.en = Math.min(m.enMax, m.en + a.pl.en - en);
  }
  if (a.k === 'PULSE') m.radarOn = false;
  m.path = null; m.moving = false; m.holdFace = false; m.lact = null;
}
function stepLact(m, dt: number) {
  const a = m.lact;
  a.t -= dt; a.age += dt;
  if (a.k === 'PULSE' && a.age >= a.radarT) m.radarOn = false;
  const done = a.k === 'MOVE' ? !m.path || a.age > 120 : a.t <= 0;
  if (!done) return;
  m.lact = null; m.moving = false; m.path = null; m.holdFace = false;
  if (a.k === 'PULSE') m.radarOn = false;
  if (a.done) a.done();
  if (isMech(m) && !m.dead && !m.out && !m.lact && !a.intr) wantPause('IDLE ' + m.id); // its order is done (an interrupted move pauses as a new contact)
  if (m === G.p) { replan(); hooks.sync(); }
  if (!isMech(m) && m !== G.ally) decideNow(m);
  if (isMech(m)) G.liveLog.push({ t: G.time, id: m.id, k: a.k, intr: !!a.intr });
}

// ---- the gun: aim, fire, cool down ----
export function liveAim(m, c) {
  if (!c) return;
  m.aim = { c, id: c.id, t: TUNE.LIVE_AIM_TIME };
  if (isMech(m)) m.hold = c.id; // auto-refire keeps this target
  faceTo(m, cx(c), cy(c));
  hooks.sync();
}
function faceTo(m, x, y) { const dx = x - m.x, dy = y - m.y, d = Math.hypot(dx, dy); if (d > 0 && !m.moving) { m.fx = dx / d; m.fy = dy / d; } }
function stepAim(m, dt: number) {
  const A = m.aim;
  if ((A.t -= dt) > 0) return;
  m.aim = null;
  const list = isMech(m) ? G.pc : m.ec, c = list.find(k => k.on && k.id === A.id);
  const unc = isMech(m) ? TUNE.PLAYER_FIRE_UNC : m.ft.FIRE_UNC;
  if (!c || shootBlock(m, c, unc, fireRange(m)) !== '') { if (isMech(m) && !c) m.hold = ''; return; } // the chance went: no shot
  const fx = m.fx, fy = m.fy;
  doShot(m, c); // a field unit pays the shot's AP from its round's budget
  if (m.moving) { m.fx = fx; m.fy = fy; } // a moving ExoS keeps looking where it walks
  m.cool = TUNE.LIVE_FIRE_COOLDOWN;
}
// a held target: aim again when the gun is free and the shot is allowed
function autoRefire() {
  if (!TUNE.LIVE_AUTO_REFIRE) return;
  for (const m of G.lance) {
    if (m.dead || m.out || !m.hold || m.aim || m.cool > 0) continue;
    const c = G.pc.find(k => k.on && k.id === m.hold);
    if (!c) { m.hold = ''; continue; }
    if (shootBlock(m, c, TUNE.PLAYER_FIRE_UNC, fireRange(m)) === '') liveAim(m, c);
  }
}

// ---- the field: each enemy gets a turn's AP every round and runs its usual brain, one action at a time ----
// R25 cp B: continuous. AP flows in every second (AP_PER_TURN ÷ LIVE_ROUND_SEC, whole points), and the unit decides every
// LIVE_ENEMY_THINK seconds (and as soon as an action ends). Its brain's turn counters (patience, pulse rhythm) advance by
// the share of a turn that passed, so its timing in seconds stays what it was in turns.
function enemyThink(e, dt: number) {
  e.apF += TUNE.AP_PER_TURN * dt / TUNE.LIVE_ROUND_SEC;
  if (e.apF >= 1) { const n = Math.floor(e.apF); e.apF -= n; e.ap = Math.min(TUNE.AP_BANK_MAX, e.ap + n); }
  if ((e.rt -= dt) > 0) return;
  e.rt += TUNE.LIVE_ENEMY_THINK;
  if (busy(e)) return;
  const f = TUNE.LIVE_ENEMY_THINK;
  e.moved = e.pulsed = e.turned = e.packCounted = false;
  e.holdTurns = e.holding ? e.holdTurns + f / TUNE.SEC_PER_TURN : 0; e.holding = false; // patience is in SEC_PER_TURN turns
  if (e.pulseCD > 0) e.pulseCD -= f / TUNE.LIVE_ROUND_SEC; // the pulse rhythm is in the unit's own turns
  e.done = false;
  decideNow(e);
}
function decideNow(e) {
  if (e.done || e.dead || busy(e) || G.mode !== 'hunt') return;
  for (let n = 0; n < 8 && !busy(e) && G.mode === 'hunt'; n++) {
    const c0 = bestContact(e.ec);
    if (c0 && (turnCost(e, cx(c0), cy(c0)) === 0 || e.ap > TUNE.AP_SHOT * TUNE.SHOTS_PER_TURN)) freeTurn(e, cx(c0), cy(c0));
    const a = enemyDecide(e);
    if (!a) { e.done = true; noteActEnd(e); return; }
    a();
  }
}
// the Escort transport walks one leg step each round, as in turns
function allyThink(dt: number) {
  const a = G.ally;
  if ((a.rt -= dt) > 0 || busy(a)) return;
  a.rt = TUNE.LIVE_ROUND_SEC;
  const path = allyStep();
  if (!path) return;
  a.path = path; a.pi = 1;
  a.lact = { k: 'MOVE', m: a, speed: a.hurrying ? TUNE.SPRINT_SPEED : TUNE.PLAYER_SPEED, age: 0, t: 0 };
}

// ---- the end of the hunt (the same checks as turns.ts stepAction) ----
function endChecks() {
  if (G.mode !== 'hunt') return true;
  if (!livingMechs().length) { finishHunt('LOSS'); return true; }
  if (cargoLost()) { onCargoLost(); return true; }
  if (G.ally && G.ally.dead) { onAllyLost(); return true; }
  if (G.ally && !G.ally.out && inExtract(G.ally)) { leaveMap(G.ally); onAllyOut(); if (G.mode !== 'hunt') return true; }
  if (G.kills >= G.units.length && !isType('ESCORT')) { onClear(); return true; }
  if (allOut()) { onAllOut(); return true; }
  return G.mode !== 'hunt';
}

// ---- player orders that are timed on the toy page ----
export function liveSelect(m) {
  if (!m || m.dead || m.out || !G.lance.includes(m)) return;
  setActive(m); G.planT = null; G.planD = null; replan(); hooks.activate(); hooks.sync();
}
export function togglePause() { if (G.mode === 'hunt') { G.paused = !G.paused; if (!G.paused) G.apCue = null; hooks.sync(); } }
export function liveUplink() {
  const m = G.p;
  liveChannel(m, 'UPLINK', TUNE.LIVE_ACT_TIME.UPLINK, () => {
    const keep = G.p; G.p = m; // the uplink rules read the active ExoS
    G.up.used = false;
    if (uplinkBlock() === '') doUplink();
    G.up.used = false; if (G.mode === 'hunt') G.p = keep;
  });
}
export function livePickup() {
  const m = G.p;
  if (isCarrier(m)) liveChannel(m, 'HANDOFF', TUNE.LIVE_ACT_TIME.HANDOFF, () => { if (handoffBlock(m) === '') doHandoff(m); });
  else liveChannel(m, 'PICKUP', TUNE.LIVE_ACT_TIME.PICKUP, () => { if (pickupBlock(m) === '') doPickup(m); });
}
export function liveEcmOn() {
  const m = G.p;
  liveChannel(m, 'ECM', TUNE.LIVE_ACT_TIME.ECM, () => { if (has(m, 'MASK') && canPay(m, 0, TUNE.ECM_EN)) { pay(m, 0, TUNE.ECM_EN); addEmit(m, TUNE.SIGNAL_ECM); m.mask = true; } });
}
// what the active ExoS is doing, for the HUD: "MOVING", "UPLINK 2.1s", "AIM 0.4s", "IDLE"
export function liveDoing(m) {
  const a = m.lact, parts: string[] = [];
  if (a) parts.push(a.k === 'MOVE' ? 'MOVING' : a.k === 'PULSE' ? 'RADAR ' + Math.max(0, a.t).toFixed(1) + 's' : (a.k === 'PICKUP' ? 'PICK UP' : a.k === 'HANDOFF' ? 'HAND OFF' : a.k) + ' ' + Math.max(0, a.t).toFixed(1) + 's');
  if (m.aim) parts.push('AIM ' + Math.max(0, m.aim.t).toFixed(1) + 's');
  else if (m.cool > 0) parts.push('GUN COOLING ' + m.cool.toFixed(1) + 's');
  return parts.length ? parts.join(' · ') : 'IDLE';
}
// 0..1 progress of m's current timed action (the ring on the map), or -1
export function liveProgress(m) {
  const a = m.lact;
  if (a && a.k !== 'MOVE' && a.dur > 0) return Math.min(1, a.age / a.dur);
  if (m.aim) return Math.min(1, 1 - m.aim.t / TUNE.LIVE_AIM_TIME);
  return -1;
}
// seconds for a move plan (the MOVE button)
export function planSecs(pl) { return pl && pl.path ? pl.len / (MODE_SPEED[pl.mode] * (pl.lame || 1)) : 0; }
// R25 cp B: the auto-pause cue as plain words: "PAUSED: NEW CONTACT + A IDLE"
export const AP_WORD: Record<string, string> = { CONTACT: 'NEW CONTACT', FIXED: 'FIXED TRACK', BACK: 'CONTACT BACK', FIRE: 'TAKING FIRE', OBJECTIVE: 'OBJECTIVE' };
export function apWord(w: string) { return w.startsWith('IDLE') ? w.slice(5) + ' IDLE' : AP_WORD[w] || w; }
export function apCueText() { return G.apCue && G.apCue.why.length ? 'PAUSED: ' + G.apCue.why.map(apWord).join(' + ') : 'PAUSED'; }
