// Visual lab: fog of war for the lidar world, three states per tile (Jamie, 2026-10-06):
//   unscanned  → grey massing blocks, no detail
//   live       → lidar on it: the block resolves into a detailed dot scan in true colour
//   revealed   → out of sight again: keeps its detail but drains to grey (it stays revealed)
// Per tile we keep `live` (0..1, how coloured: rises fast when seen, falls slowly when lost) and `reveal` (0..1, how
// resolved: only ever rises). Both run on real time so colour drains while you think, even though sim time is frozen.
// View-only: the sim's rules for who sees what are untouched; we only borrow its LoS (tilesCrossed) and eye ranges.
import { TUNE } from '../tune.ts';
import { W, H, T, tilesCrossed, isSolid } from '../sim/world.ts';
import { G } from '../sim/state.ts';

export const FOG = {
  RESOLVE_S: 0.9,     // seconds for a newly scanned tile to fully resolve from block to dots
  COLOUR_IN_S: 0.35,  // seconds to reach full colour once seen
  COLOUR_OUT_S: 2.5,  // seconds to drain to grey once lost
};

const N = W * H;
export const seen = new Uint8Array(N);           // 1 = an ExoS has eyes on this tile now
export const live = new Float32Array(N);          // 0..1 colour
export const reveal = new Float32Array(N);        // 0..1 resolved (never falls)
export const tex = new Uint8Array(N * 4);         // RGBA for GL: R = live, G = reveal, B = solid (building) tile

// Same eye rule as sensors.canSee (range, facing cone beyond EYES_CLOSE, LoS), applied to a tile centre.
function eyesOn(m: any, tx: number, ty: number) {
  const x = (tx + 0.5) * T, y = (ty + 0.5) * T, dx = x - m.x, dy = y - m.y, d2 = dx * dx + dy * dy, r = TUNE.EYES_RANGE * T;
  if (d2 > r * r) return false;
  const rc = TUNE.EYES_CLOSE * T, cos = Math.cos(TUNE.EYES_HALF_ANG * Math.PI / 180);
  if (d2 > rc * rc && (dx * m.fx + dy * m.fy) / Math.sqrt(d2) < cos) return false;
  const own = isSolid(tx, ty) ? 1 : 0; // the DDA counts the end tile: a wall face is seen if nothing stands in front of it
  return tilesCrossed(m.x, m.y, x, y, own + 1) <= own;
}

let acc = 0;
// dt = real seconds. Sight is recomputed 10×/s; the fades run every frame.
export function updateFog(dt: number, force = false) {
  if ((acc += dt) >= 0.1 || force) {
    acc = 0; const eyes = G.lance.filter(m => !m.dead);
    for (let ty = 0; ty < H; ty++) for (let tx = 0; tx < W; tx++) seen[ty * W + tx] = eyes.some(m => eyesOn(m, tx, ty)) ? 1 : 0;
  }
  const up = dt / FOG.COLOUR_IN_S, down = dt / FOG.COLOUR_OUT_S, res = dt / FOG.RESOLVE_S;
  for (let i = 0; i < N; i++) {
    if (seen[i]) { live[i] = Math.min(1, live[i] + up); reveal[i] = Math.min(1, reveal[i] + res); }
    else live[i] = Math.max(0, live[i] - down);
    if (force) { live[i] = seen[i]; reveal[i] = Math.max(reveal[i], seen[i]); }
    tex[i * 4] = live[i] * 255; tex[i * 4 + 1] = reveal[i] * 255; tex[i * 4 + 2] = isSolid(i % W, (i / W) | 0) ? 255 : 0;
  }
}
export function resetFog() { seen.fill(0); live.fill(0); reveal.fill(0); }
