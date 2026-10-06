// The scripted player (moved out of scripts/sim.ts so the runner and the tests share it). Not used by the game.
// Walks the active mech to the uplink, uplinks, and fires (gun or mortar) whenever its lock rule allows.
// R15 Bounty: walks to the guarded site like the uplink bot, then at whatever it can still hear. Extracts as soon as
// the quota is met, when a mech is lost, or when nothing is left to chase. It never pushes its luck.
import { TUNE } from '../tune.ts';
import { idTick } from './ids.ts';
import { G } from './state.ts';
import { T, W } from './world.ts';
import { cx, cy } from './sensors.ts';
import { isType, quotaMet } from './mission.ts';
import { step, endPlayerTurn, playerTarget, shootBlock, uplinkBlock, upDist,
         cmdSelect, cmdFire, cmdUplink, cmdMoveMode, cmdTarget, cmdMove, mortarBlock, cmdMortar, cmdRadar, canPay, sensorsUp } from './turns.ts';

export const AUTO_DT = 0.05;
export const AUTO = { loud: false, quiet: false }; // R13: --loud = SPRINT every move, pulse radar whenever it can. R14: --quiet = CREEP every move

// run the current action (move / pulse / shot) to completion
export function runAct() { for (let n = 0; G.act && G.mode === 'hunt' && n < 20000; n++) step(AUTO_DT); }

// R15 Bounty: the round the scripted lance first reached the site, per hunt; it hunts from there this many rounds, then leaves
const siteAt = new WeakMap<object, number>(), BOT_HUNT_ROUNDS = 10;
// Where this activation walks to (world coords)
function goal() {
  const p = G.p, out = { x: (W - 1.5) * T, y: p.y };
  if (!isType('BOUNTY')) return G.up;
  if (quotaMet() || G.lance.some(m => m.dead)) return out; // at quota, or cutting its losses
  if (!siteAt.has(G.mission)) {                            // the guarded site first, fighting what it meets (as the uplink bot)
    if (upDist(p) > 2) return G.up;
    siteAt.set(G.mission, G.turn);
  }
  const c = playerTarget();                                // then whatever it can still hear, for BOT_HUNT_ROUNDS; nothing left = leave
  return c && G.turn - siteAt.get(G.mission) < BOT_HUNT_ROUNDS ? { x: cx(c), y: cy(c) } : out;
}
const far = g => Math.hypot(g.x - G.p.x, g.y - G.p.y) / T > (isType('BOUNTY') ? 1 : TUNE.UPLINK_RADIUS + 0.5);

export function playerTurn() {
  let moved = false;
  idTick(); // R14: commit an ID once a contact's traits narrow it to one variant
  if (AUTO.loud && sensorsUp(G.p) && canPay(G.p, TUNE.AP_RADAR, TUNE.RADAR_EN)) { cmdRadar(); runAct(); } // R13 --loud: pulse every activation it can
  for (let k = 0; k < 12 && G.mode === 'hunt'; k++) {
    const c = playerTarget();
    if (c && G.sel !== c) cmdSelect(c); // select + turn to face it (free once a turn)
    if (mortarBlock(G.p, c) === '') { cmdMortar(); runAct(); continue; } // R9: lob at any contact that qualifies
    if (shootBlock(G.p, c, TUNE.PLAYER_FIRE_UNC, TUNE.PLAYER_FIRE_RANGE) === '') { cmdFire(); runAct(); continue; }
    if (uplinkBlock() === '') { cmdUplink(); continue; }
    const g = goal();
    if (!moved && far(g)) {
      cmdMoveMode(AUTO.loud ? 'SPRINT' : AUTO.quiet ? 'CREEP' : 'NORMAL'); cmdTarget(g.x, g.y); moved = true;
      if (AUTO.loud && G.plan && !G.plan.path && G.plan.why !== 'LEGS') { cmdMoveMode('NORMAL'); cmdTarget(g.x, g.y); } // can't afford any sprint
      if (G.plan && !G.plan.path && G.plan.why === 'LEGS') { cmdMoveMode('CREEP'); cmdTarget(g.x, g.y); } // R12: legs gone = creep
      if (G.plan && G.plan.path) { cmdMove(); runAct(); continue; }
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
      endPlayerTurn();
      if (onTurn) onTurn(t, who);
    } else step(AUTO_DT); // the bot's turn runs on its own pacing timer
  }
}
