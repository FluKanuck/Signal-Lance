// The scripted player (moved out of scripts/sim.ts so the runner and the tests share it). Not used by the game.
// Walks the active mech to the uplink, uplinks, and fires (gun or mortar) whenever its lock rule allows.
import { TUNE } from '../tune.ts';
import { G } from './state.ts';
import { step, endPlayerTurn, playerTarget, shootBlock, uplinkBlock, upDist,
         cmdSelect, cmdFire, cmdUplink, cmdMoveMode, cmdTarget, cmdMove, mortarBlock, cmdMortar, cmdRadar, canPay, sensorsUp } from './turns.ts';

export const AUTO_DT = 0.05;
export const AUTO = { loud: false }; // R13: --loud = SPRINT every move, pulse radar whenever it can

// run the current action (move / pulse / shot) to completion
export function runAct() { for (let n = 0; G.act && G.mode === 'hunt' && n < 20000; n++) step(AUTO_DT); }

export function playerTurn() {
  let moved = false;
  if (AUTO.loud && sensorsUp(G.p) && canPay(G.p, TUNE.AP_RADAR, TUNE.RADAR_EN)) { cmdRadar(); runAct(); } // R13 --loud: pulse every activation it can
  for (let k = 0; k < 12 && G.mode === 'hunt'; k++) {
    const c = playerTarget();
    if (c && G.sel !== c) cmdSelect(c); // select + turn to face it (free once a turn)
    if (mortarBlock(G.p, c) === '') { cmdMortar(); runAct(); continue; } // R9: lob at any contact that qualifies
    if (shootBlock(G.p, c, TUNE.PLAYER_FIRE_UNC, TUNE.PLAYER_FIRE_RANGE) === '') { cmdFire(); runAct(); continue; }
    if (uplinkBlock() === '') { cmdUplink(); continue; }
    if (!moved && upDist(G.p) > TUNE.UPLINK_RADIUS + 0.5) {
      cmdMoveMode(AUTO.loud ? 'SPRINT' : 'NORMAL'); cmdTarget(G.up.x, G.up.y); moved = true;
      if (AUTO.loud && G.plan && !G.plan.path && G.plan.why !== 'LEGS') { cmdMoveMode('NORMAL'); cmdTarget(G.up.x, G.up.y); } // can't afford any sprint
      if (G.plan && !G.plan.path && G.plan.why === 'LEGS') { cmdMoveMode('CREEP'); cmdTarget(G.up.x, G.up.y); } // R12: legs gone = creep
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
