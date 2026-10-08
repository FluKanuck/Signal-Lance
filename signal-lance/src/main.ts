// Signal Lance — wiring: sim hooks → view, and the frame loop.
import { TUNE } from './tune.ts';
import { G, hooks } from './sim/state.ts';
import { step, enemyUnseen, cmdMoveMode } from './sim/turns.ts';
import { partHurt } from './sim/combat.ts';
import { V } from './view/state.ts';
import { vw, vh, resize, render } from './view/render.ts';
import { updateHud, syncButtons } from './view/hud.ts';
import { launch, showStart, showResult } from './view/screens.ts';
import { hideWpMenu } from './view/input.ts';
import { showTbResult } from './view/testbed.ts';
import './view/card.ts';
import './view/explain.ts';
import { stepLk, newLk } from './sim/warn.ts';
import { cx, cy } from './sim/sensors.ts';
import { unitById } from './sim/state.ts';
import { T } from './sim/world.ts';
declare const __QA__: boolean;

hooks.sync = syncButtons;
hooks.end = () => (G.tb && !G.tb.auto ? showTbResult() : showResult()); // R22: an after-action scenario ends on the after-action page // R14: a test-bed hunt has its own end screen
hooks.playerHit = () => { V.hitFlash = 0.4; };
hooks.activate = () => { V.follow = true; V.faceArm = V.ghostArm = V.mortarArm = false; V.lookArm = null; hideWpMenu(); if (G.pmode !== 'CREEP' && partHurt(G.p, 'LEGS')) cmdMoveMode('CREEP'); }; // R13: hurt legs = start in CREEP // R7 s2: camera centres on the mech whose activation it is

// camera follows the player until you drag (was in update())
function follow(dt) {
  if (!V.follow) return;
  const k = Math.min(1, dt * TUNE.CAM_LERP);
  V.camX += (G.p.x - V.camX) * k; V.camY += (G.p.y - V.camY) * k;
}

// ============================ LOOP ====================================
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (vw > vh) { // R7: unseen field units act faster (same steps, just more per frame)
    const n = enemyUnseen() ? TUNE.ENEMY_UNSEEN_SPEED : 1;
    for (let i = 0; i < n; i++) step(dt);
    follow(dt);
  }
  V.hitFlash = Math.max(0, V.hitFlash - dt); // portrait = frozen behind the rotate overlay
  if (G.mode === 'hunt') { // R24 A5 (C15): LAST SEEN marks (a new hunt starts a fresh set)
    if (V.lkHunt !== G.units) { // R24: a test-bed scenario may start with marks
      V.lk = newLk(); V.lkHunt = G.units;
      for (const k of (G.tb && G.tb.lastSeen) || []) { const u = G.units[k.field]; if (u) V.lk.marks.push({ id: u.id, x: (k.tile[0] + 0.5) * T, y: (k.tile[1] + 0.5) * T, turn: G.turn }); }
    }
    stepLk(V.lk, G.pc.map(c => ({ id: c.id, on: !!c.on, x: cx(c), y: cy(c) })), G.turn, id => { const u = unitById(id); return !u || !!u.dead; });
  }
  render();
  updateHud(dt);
  requestAnimationFrame(frame);
}
resize();
launch();
showStart();
requestAnimationFrame(frame);
// QA panel (claude/signal-lance-qa-harness.md): window.__qa for agent playtesters, QA builds only (npm run build:qa)
if (typeof __QA__ !== 'undefined' && __QA__) import('./view/qa.ts').then(m => m.install());
