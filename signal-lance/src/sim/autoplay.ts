// The scripted player (moved out of scripts/sim.ts so the runner and the tests share it). Not used by the game.
// Walks the active mech to the uplink, uplinks, and fires (gun or mortar) whenever its lock rule allows.
// R15 Bounty: walks to the guarded site like the uplink bot, then at whatever it can still hear. Extracts as soon as
// the quota is met, when a mech is lost, or when nothing is left to chase. It never pushes its luck.
import { TUNE } from '../tune.ts';
import { idTick } from './ids.ts';
import { G } from './state.ts';
import { T, W } from './world.ts';
import { cx, cy } from './sensors.ts';
import { isType, quotaMet, carrier, isCarrier, pickupBlock, handoffTo, handoffBlock } from './mission.ts';
import { legChoices, legPath } from './escort.ts';
import { step, endPlayerTurn, playerTarget, shootBlock, uplinkBlock, upDist, extractBlock, cmdExtract,
         cmdSelect, cmdFire, cmdUplink, cmdObjective, cmdLeg, cmdMoveMode, cmdTarget, cmdMove, mortarBlock, cmdMortar, cmdRadar, canPay, sensorsUp, fireRange } from './turns.ts';
import { radarOf } from './kit.ts';

export const AUTO_DT = 0.05;
export const AUTO = { loud: false, quiet: false }; // R13: --loud = SPRINT every move, pulse radar whenever it can. R14: --quiet = CREEP every move

// run the current action (move / pulse / shot) to completion
export function runAct() { for (let n = 0; G.act && G.mode === 'hunt' && n < 20000; n++) step(AUTO_DT); }

// R15 Bounty: the round the scripted lance first reached the site, per hunt; it hunts from there this many rounds, then leaves
const siteAt = new WeakMap<object, number>(), BOT_HUNT_ROUNDS = 10;
// Where this activation walks to (world coords)
function goal() {
  const p = G.p, out = { x: (W - 1.5) * T, y: p.y };
  if (isType('ESCORT') && (!G.ally || G.ally.out || G.ally.dead)) return out; // R16: the transport is out: follow it
  if (isType('RETRIEVE') && G.mission.cargoOut) return out; // R16: the cargo is out: leave too
  if (isType('ESCORT')) { // R15 s3: shadow the transport a few tiles ahead of it, never into extraction first
    const a = G.ally, w = a && a.walk ? a.walk : null, q = w ? w[Math.min(w.length - 1, 2)] : a;
    return { x: Math.min(q.x, (W - TUNE.EXTRACT_COLS - 5) * T), y: q.y }; // R16: -5, so A*'s nearest-free snap (up to 3 tiles) never lands in extraction
  }
  if (isType('RETRIEVE')) { // R15 s2: to the cargo; then the carrier heads out and the other mech shadows it
    const c = carrier();
    return !c ? G.up : isCarrier(p) ? out : { x: c.x, y: c.y };
  }
  if (!isType('BOUNTY')) return G.up;
  if (quotaMet() || G.lance.some(m => m.dead)) return out; // at quota, or cutting its losses
  if (!siteAt.has(G.mission)) {                            // the guarded site first, fighting what it meets (as the uplink bot)
    if (upDist(p) > 2) return G.up;
    siteAt.set(G.mission, G.turn);
  }
  const c = playerTarget();                                // then whatever it can still hear, for BOT_HUNT_ROUNDS; nothing left = leave
  return c && G.turn - siteAt.get(G.mission) < BOT_HUNT_ROUNDS ? { x: cx(c), y: cy(c) } : out;
}
const far = g => Math.hypot(g.x - G.p.x, g.y - G.p.y) / T > (g === G.up ? TUNE.UPLINK_RADIUS + 0.5 : 1);
// R15 s3: the leg with the fewest known contacts within ESCORT_AMBUSH_RANGE + 1 of its path (ties: the first)
function pickQuietLeg() {
  const near = (i: number) => G.pc.filter(c => c.on && legPath(i).some(p => Math.hypot(p.x - cx(c), p.y - cy(c)) <= (TUNE.ESCORT_AMBUSH_RANGE + 1) * T)).length;
  return legChoices().map(l => ({ i: l.i, n: near(l.i) })).sort((a, b) => a.n - b.n)[0].i;
}
// R15 s2: hand the cargo over when the carrier is at half hits or worse and the other mech next to it is healthier
const frail = m => m.hits / m.maxHits;
function wantHandoff() { const o = handoffTo(G.p); return !!o && handoffBlock(G.p) === '' && frail(G.p) <= 0.5 && frail(o) > frail(G.p); }

let extracted = false; // R16: the last playerTurn extracted its mech (the turn already passed on)
export function playerTurn() {
  let moved = false; extracted = false;
  idTick(); // R14: commit an ID once a contact's traits narrow it to one variant
  if (AUTO.loud && sensorsUp(G.p) && radarOf(G.p) && canPay(G.p, radarOf(G.p).ap, radarOf(G.p).en)) { cmdRadar(); runAct(); } // R13 --loud: pulse every activation it can
  for (let k = 0; k < 12 && G.mode === 'hunt'; k++) {
    const c = playerTarget();
    if (c && G.sel !== c) cmdSelect(c); // select + turn to face it (free once a turn)
    if (mortarBlock(G.p, c) === '') { cmdMortar(); runAct(); continue; } // R9: lob at any contact that qualifies
    if (shootBlock(G.p, c, TUNE.PLAYER_FIRE_UNC, fireRange(G.p)) === '') { cmdFire(); runAct(); continue; }
    if (uplinkBlock() === '') { cmdUplink(); continue; }
    if (extractBlock() === '' && goal().x >= (W - TUNE.EXTRACT_COLS - 1) * T) { cmdExtract(); extracted = true; return; } // R16: in the zone and leaving: EXTRACT (its turn is over)
    if (legChoices().length) { cmdLeg(pickQuietLeg()); }
    if (pickupBlock(G.p) === '' || (isCarrier(G.p) && wantHandoff())) { cmdObjective(); continue; } // R15 s2
    const g = goal();
    if (!moved && far(g)) {
      cmdMoveMode(AUTO.loud ? 'SPRINT' : AUTO.quiet ? 'CREEP' : 'NORMAL'); cmdTarget(g.x, g.y); moved = true;
      if (AUTO.loud && G.plan && !G.plan.path && G.plan.why !== 'LEGS') { cmdMoveMode('NORMAL'); cmdTarget(g.x, g.y); } // can't afford any sprint
      if (G.plan && !G.plan.path && G.plan.why === 'LEGS') { cmdMoveMode('CREEP'); cmdTarget(g.x, g.y); } // R12: legs gone = creep
      if (G.plan && G.plan.path) { const n = G.moveStat.intr.length; cmdMove(); runAct(); if (G.moveStat.intr.length > n) moved = false; continue; } // R17: stopped by something new: react, then it may walk on
    }
    break;
  }
}

// Play the already-started hunt to its end, or until maxTurns rounds (then G.mode is still 'hunt' = a stall).
// onTurn runs after each player activation (the runner's -v line).
export function playOut(maxTurns: number, onTurn?: (turn: number, who: string) => void) {
  let guard = 0;
  while (G.mode === 'hunt' && G.turn <= maxTurns && guard++ < 2e6) {
    if (G.phase === 'PLAYER') {
      const t = G.turn, who = G.p.id;
      playerTurn();
      if (G.mode !== 'hunt') break;
      if (!extracted) endPlayerTurn();
      if (onTurn) onTurn(t, who);
    } else step(AUTO_DT); // the bot's turn runs on its own pacing timer
  }
}
