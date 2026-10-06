// Visual lab: fog of war for the lidar world, three states per tile (Jamie, 2026-10-06):
//   unscanned  → grey massing blocks, no detail
//   live       → lidar on it: the block resolves into a detailed dot scan in true colour
//   revealed   → out of sight again: keeps its detail but drains to grey (it stays revealed)
// Per tile we keep `live` (0..1, how coloured: rises fast when seen, falls slowly when lost) and `reveal` (0..1, how
// resolved: only ever rises). Both run on real time so colour drains while you think, even though sim time is frozen.
// Per tile we also keep the CLOSEST scan: where the scanning ExoS stood and how far away it was. Wall dots resolve
// along the lidar beam lines from that position, so walking up to a building sharpens it, and the best scan stays.
// View-only: the sim's rules for who sees what are untouched; we only borrow its LoS (tilesCrossed) and eye ranges.
import { TUNE } from '../tune.ts';
import { W, H, T, tilesCrossed, isSolid } from '../sim/world.ts';
import { G } from '../sim/state.ts';

export const FOG = { // timings tuned by Jamie (2026-10-06)
  RESOLVE_S: 2.25,    // seconds for a newly scanned tile to fully resolve from block to dots
  COLOUR_IN_S: 0.8,   // seconds to reach full colour once seen
  COLOUR_OUT_S: 4.9,  // seconds to drain to grey once lost
};

const N = W * H;
export const seen = new Uint8Array(N);           // 1 = an ExoS has eyes on this tile now
export const live = new Float32Array(N);          // 0..1 colour
export const reveal = new Float32Array(N);        // 0..1 resolved (never falls)
export const tex = new Uint8Array(N * 4);         // RGBA for GL: R = live, G = reveal, B = solid (building) tile
export const scan = new Float32Array(N * 4);      // RGBA float for GL: closest scan of this tile: x, y (world), distance, 1 = scanned
export const first = new Float32Array(N * 4);     // RGBA float for GL: lab clock when first seen, 1 + index (in G.lance) of the ExoS that saw it
export let fogClock = 0;                          // same clock as the lab's render time (both advance by the same dt)

// Same eye rule as sensors.canSee (range, facing cone beyond EYES_CLOSE, clear LoS), applied to one world point.
function eyesAt(m: any, x: number, y: number) {
  const dx = x - m.x, dy = y - m.y, d2 = dx * dx + dy * dy, r = TUNE.EYES_RANGE * T;
  if (d2 > r * r) return -1;
  const rc = TUNE.EYES_CLOSE * T, cos = Math.cos(TUNE.EYES_HALF_ANG * Math.PI / 180);
  if (d2 > rc * rc && (dx * m.fx + dy * m.fy) / Math.sqrt(d2) < cos) return -1;
  return tilesCrossed(m.x, m.y, x, y, 1) === 0 ? Math.sqrt(d2) : -1;
}
// Street tile: its centre. Building tile: what a lidar actually sees is its faces, so test 3 points along each
// street-facing face, 2 units out (a face seen at a glancing angle still counts). Returns the closest seen distance.
const FACES = [[0, -1], [0, 1], [-1, 0], [1, 0]];
function eyesOn(m: any, tx: number, ty: number) {
  if (!isSolid(tx, ty)) return eyesAt(m, (tx + 0.5) * T, (ty + 0.5) * T);
  let best = -1;
  for (const [nx, ny] of FACES) {
    if (isSolid(tx + nx, ty + ny)) continue;
    for (const f of [0.15, 0.5, 0.85]) {
      const x = (tx + 0.5 + nx * 0.5) * T + nx * 2 + (ny ? (f - 0.5) * T : 0), y = (ty + 0.5 + ny * 0.5) * T + ny * 2 + (nx ? (f - 0.5) * T : 0);
      const d = eyesAt(m, x, y); if (d >= 0 && (best < 0 || d < best)) best = d;
    }
  }
  return best;
}

let acc = 0;
// dt = real seconds. Sight is recomputed 10×/s; the fades run every frame.
export function updateFog(dt: number, force = false) {
  fogClock += dt;
  if ((acc += dt) >= 0.1 || force) {
    acc = 0; const eyes = G.lance.filter((m: any) => !m.dead);
    for (let ty = 0; ty < H; ty++) for (let tx = 0; tx < W; tx++) {
      const i = ty * W + tx; seen[i] = 0;
      for (const m of eyes) {
        const d = eyesOn(m, tx, ty); if (d < 0) continue;
        seen[i] = 1;
        if (!first[i * 4 + 1]) { first[i * 4] = fogClock; first[i * 4 + 1] = 1 + G.lance.indexOf(m); }
        if (!scan[i * 4 + 3] || d < scan[i * 4 + 2]) { scan[i * 4] = m.x; scan[i * 4 + 1] = m.y; scan[i * 4 + 2] = d; scan[i * 4 + 3] = 1; }
      }
    }
  }
  const up = dt / FOG.COLOUR_IN_S, down = dt / FOG.COLOUR_OUT_S, res = dt / FOG.RESOLVE_S;
  for (let i = 0; i < N; i++) {
    if (seen[i]) { live[i] = Math.min(1, live[i] + up); reveal[i] = Math.min(1, reveal[i] + res); }
    else live[i] = Math.max(0, live[i] - down);
    if (force) { live[i] = seen[i]; reveal[i] = Math.max(reveal[i], seen[i]); }
    tex[i * 4] = live[i] * 255; tex[i * 4 + 1] = reveal[i] * 255; tex[i * 4 + 2] = isSolid(i % W, (i / W) | 0) ? 255 : 0;
  }
}
export function resetFog() { seen.fill(0); live.fill(0); reveal.fill(0); scan.fill(0); first.fill(0); }
