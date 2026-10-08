// R24 checkpoint B: pure layout helpers (no DOM, so Vitest can check them).
// 1. labelSpot: map labels claim a rectangle each frame; one that would overlap a label already placed moves down past it
//    (C25: suit names, SOUND, contact tags and PAINTED stack instead of printing on top of each other).
// 2. safeCam: the camera point that keeps the things that matter inside the part of the screen no overlay covers (C07).

export type Rect = { x0: number; y0: number; x1: number; y1: number };
let placed: Rect[] = [];
export function resetLabels() { placed = []; }
// Claim w × h with its top-left at (x0, y0) (world units). Returns the top it got (moved down past any overlap).
export function labelSpot(x0: number, y0: number, w: number, h: number, pad = 0) {
  for (let guard = 0; guard < 40; guard++) {
    const hit = placed.find(p => x0 < p.x1 + pad && x0 + w > p.x0 - pad && y0 < p.y1 + pad && y0 + h > p.y0 - pad);
    if (!hit) break; y0 = hit.y1 + pad;
  }
  placed.push({ x0, y0, x1: x0 + w, y1: y0 + h });
  return y0;
}

// The uncovered screen area: the screen minus the overlay strips (screen px). l = right edge of the left column,
// r = left edge of the right column, t = bottom of the HUD line and the ORDER strip, b = top of the bottom bar.
export type Safe = { l: number; t: number; r: number; b: number };
// The world point to put at the screen centre (camX, camY) so pts[0] (the active ExoS) sits inside the safe rect, and as
// many of the rest as fit with it (in order: the selected contact, then the objective). z = screen px per world unit.
export function safeCam(pts: { x: number; y: number }[], safe: Safe, vw: number, vh: number, z: number) {
  const cxS = (safe.l + safe.r) / 2, cyS = (safe.t + safe.b) / 2, wS = Math.max(1, safe.r - safe.l), hS = Math.max(1, safe.b - safe.t);
  let x0 = pts[0].x, x1 = pts[0].x, y0 = pts[0].y, y1 = pts[0].y;
  for (const p of pts.slice(1)) { // add each one only if the box still fits the safe rect (with a margin)
    const nx0 = Math.min(x0, p.x), nx1 = Math.max(x1, p.x), ny0 = Math.min(y0, p.y), ny1 = Math.max(y1, p.y);
    if ((nx1 - nx0) * z <= wS * 0.85 && (ny1 - ny0) * z <= hS * 0.85) { x0 = nx0; x1 = nx1; y0 = ny0; y1 = ny1; }
  }
  const mx = (x0 + x1) / 2, my = (y0 + y1) / 2; // put the box's centre on the safe rect's centre
  return { x: mx - (cxS - vw / 2) / z, y: my - (cyS - vh / 2) / z };
}
// Where world point p lands on screen for camera (camX, camY)
export function toScreen(p: { x: number; y: number }, camX: number, camY: number, vw: number, vh: number, z: number) {
  return { x: vw / 2 + (p.x - camX) * z, y: vh / 2 + (p.y - camY) * z };
}
