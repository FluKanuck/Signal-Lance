// Visual lab: fog of war for the lidar world. Per tile: is it seen right now (any living ExoS has eyes on it), and
// how long since it was last seen. fogLevel() turns that into how lit the tile's dots are (0 = fog colour, 1 = full).
// View-only: the sim's rules for who sees what are untouched; we only borrow its LoS (tilesCrossed) and eye ranges.
import { TUNE } from '../tune.ts';
import { W, H, T, tilesCrossed, isSolid } from '../sim/world.ts';
import { G } from '../sim/state.ts';

export const live = new Uint8Array(W * H);        // 1 = an ExoS sees this tile now
export const lastSeen = new Float32Array(W * H).fill(-1); // G.time it was last seen (-1 = never)
export const level = new Uint8Array(W * H);       // 0..255, uploaded to the GL fog texture

// Same eye rule as sensors.canSee (range, facing cone beyond EYES_CLOSE, LoS), applied to a tile centre.
function eyesOn(m: any, tx: number, ty: number) {
  const x = (tx + 0.5) * T, y = (ty + 0.5) * T, dx = x - m.x, dy = y - m.y, d2 = dx * dx + dy * dy, r = TUNE.EYES_RANGE * T;
  if (d2 > r * r) return false;
  const rc = TUNE.EYES_CLOSE * T, cos = Math.cos(TUNE.EYES_HALF_ANG * Math.PI / 180);
  if (d2 > rc * rc && (dx * m.fx + dy * m.fy) / Math.sqrt(d2) < cos) return false;
  const own = isSolid(tx, ty) ? 1 : 0; // the DDA counts the end tile: a wall face is seen if nothing stands in front of it
  return tilesCrossed(m.x, m.y, x, y, own + 1) <= own;
}

/**
 * How lit a tile's dots are, 0..1. This is a design call, not a technical one:
 *  - seenNow: an ExoS has eyes on it this instant.
 *  - age:     seconds since it was last seen (Infinity = never seen this hunt).
 *  - isWall:  building tile (walls are what give the city its shape in the dark).
 * The map itself is always known in the sim (terrain isn't intel), so "never seen" doesn't have to mean invisible.
 */
export function fogLevel(seenNow: boolean, age: number, isWall: boolean): number {
  // TODO(Jamie): decide what "unseen" and "remembered" look like. Placeholder: seen = full, everything else = dim.
  return seenNow ? 1 : isWall ? 0.25 : 0.15;
}

let acc = 0;
export function updateFog(dt: number, solid: Uint8Array, force = false) {
  acc += dt; if (!force && acc < 0.1) return; acc = 0;
  const eyes = G.lance.filter(m => !m.dead);
  for (let ty = 0; ty < H; ty++) for (let tx = 0; tx < W; tx++) {
    const i = ty * W + tx;
    live[i] = eyes.some(m => eyesOn(m, tx, ty)) ? 1 : 0;
    if (live[i]) lastSeen[i] = G.time;
    const age = lastSeen[i] < 0 ? Infinity : G.time - lastSeen[i];
    level[i] = Math.round(255 * Math.max(0, Math.min(1, fogLevel(!!live[i], age, solid[i] === 1))));
  }
}
export function resetFog() { lastSeen.fill(-1); live.fill(0); }
