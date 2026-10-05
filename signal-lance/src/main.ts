// Signal Lance — wiring: sim hooks → view, and the frame loop.
import { TUNE } from './tune.ts';
import { G, hooks } from './sim/state.ts';
import { step, enemyUnseen, cmdMoveMode } from './sim/turns.ts';
import { partHurt } from './sim/combat.ts';
import { V } from './view/state.ts';
import { vw, vh, resize, render } from './view/render.ts';
import { updateHud, syncButtons } from './view/hud.ts';
import { launch, showLoadout, showResult } from './view/screens.ts';
import './view/input.ts';

hooks.sync = syncButtons;
hooks.end = showResult;
hooks.playerHit = () => { V.hitFlash = 0.4; };
hooks.activate = () => { V.follow = true; V.faceArm = V.ghostArm = V.mortarArm = false; if (G.pmode !== 'CREEP' && partHurt(G.p, 'LEGS')) cmdMoveMode('CREEP'); }; // R13: hurt legs = start in CREEP // R7 s2: camera centres on the mech whose activation it is

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
  render();
  updateHud(dt);
  requestAnimationFrame(frame);
}
resize();
launch();
showLoadout();
requestAnimationFrame(frame);
