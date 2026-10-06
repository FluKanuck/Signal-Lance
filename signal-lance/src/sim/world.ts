import { TUNE } from '../tune.ts';
import { rand } from './rng.ts';

// ============================ MAP =====================================
// '#' building, '.' street, 'P' player spawn. Right 3 cols = extraction.
export const MAP_SRC = [
  "........................................................................",
  "..#####..######.#####...#######..####..########..#####..######..###.....",
  "..#####..######.#####...#######..####..########..#####..######..###.....",
  "..#####..######.........##...##..####..##....##..#####..........###.....",
  "..........#####.#####...##...##........##....##.........######..###.....",
  "..#####..######.#####...#######..####..###..###..#####..######..........",
  "..#####..######.#####...#######..####..###..###..#####..######..###.....",
  "..........................................................#.............",
  "..###..........##....................##..............##.................",
  "..###..#########..#####..######..#######..####..########..#####..###....",
  "..###..#########..#####..######..#######..####..########..#####..###....",
  "..........######..#.........###..###..........................##..###....",
  "P.........######..#.#####...###..###..###.####..########..###.##.........",
  "..###..........#..#.#####........###..###.####..##....##..###.##..###....",
  "..###..#########....#####..#########..###.......##....##..###.....###....",
  "..###..#########..#......................####...########......##..###....",
  "..........................###...##......................#####..........",
  "..#####..####..####..###..###...##..######..#####..####.#####..####.....",
  "..#####..####..####..###..###...##..######..#####..####........####.....",
  "..#####..........##..###.........#..##..........#..####.#####..####.....",
  "..#####..####..####..###..########..##..######..#.......#####...........",
  "..#####..####..####.......########..##..######..#####..####....####.....",
  "..........####...........................................####...........",
  "........................................................................",
];
// R15: mission anchors, per map (data only: mission code reads them through anchors(), never hard-codes tiles).
// Block maps (parked #33) will each bring their own entry. Today there is one map.
export const MAP_ANCHORS = {
  hive: {
    uplinks: [            // hand-picked open street tiles {x, y} + the name INTEL uses; none in walled pockets (was TUNE.UPLINK_CANDIDATES)
      { x: 15, y: 3,  name: 'NW lane' },
      { x: 43, y: 4,  name: 'north yard' },
      { x: 27, y: 13, name: 'west plaza' },
      { x: 45, y: 14, name: 'centre crossing' },
      { x: 61, y: 19, name: 'SE alley' },
      { x: 38, y: 22, name: 'south street' },
    ],
    cargo: [],            // R15 step 2 (Retrieve): cargo tiles (empty = reuse the uplink candidates)
    // R15 step 3 (Escort): the ally's route. Nodes are open tiles; a leg runs from one node to the next through its
    // `via` tiles (A* between them). A node with 2 onward legs is a junction: the ally holds there until you pick one.
    waypoints: {
      S:  { x: 0,  y: 11, name: 'west edge' },
      J1: { x: 8,  y: 11, name: 'west fork' },
      A:  { x: 32, y: 7,  name: 'north street' },
      B:  { x: 24, y: 16, name: 'south street' },
      J2: { x: 40, y: 11, name: 'centre fork' },
      C:  { x: 62, y: 7,  name: 'north yards' },
      D:  { x: 55, y: 22, name: 'south road' },
      X:  { x: 70, y: 12, name: 'east edge' },
    },
    legs: [
      { from: 'S',  to: 'J1', via: [] },
      { from: 'J1', to: 'A',  via: [[8, 7]],            name: 'NORTH' },
      { from: 'J1', to: 'B',  via: [[6, 13], [6, 16]],  name: 'SOUTH' },
      { from: 'A',  to: 'J2', via: [[40, 7]] },
      { from: 'B',  to: 'J2', via: [[36, 15]] },
      { from: 'J2', to: 'C',  via: [[52, 11], [56, 7]], name: 'NORTH' },
      { from: 'J2', to: 'D',  via: [[46, 16], [46, 22]], name: 'SOUTH' },
      { from: 'C',  to: 'X',  via: [] },
      { from: 'D',  to: 'X',  via: [] },
    ],
    junctions: ['J1', 'J2'], // for INTEL and the runner (derivable: nodes with 2 onward legs)
    escortSite: 'J2',        // the field's leash point in an Escort job (G.up)
  },
};
export const MAP_ID = 'hive'; // the map MAP_SRC draws
export function anchors() { return MAP_ANCHORS[MAP_ID]; }
export const W = 72, H = MAP_SRC.length, N = W * H, T = TUNE.TILE;
export const solid = new Uint8Array(N);
export let spawnX = 1, spawnY = 12;
for (let y = 0; y < H; y++) {
  const row = MAP_SRC[y].padEnd(W, '.').slice(0, W);
  for (let x = 0; x < W; x++) {
    const c = row[x];
    if (c === '#' && x < W - TUNE.EXTRACT_COLS) solid[y * W + x] = 1;
    if (c === 'P') { spawnX = x; spawnY = y; }
  }
}
export function isSolid(tx, ty) { return tx < 0 || ty < 0 || tx >= W || ty >= H || solid[ty * W + tx] === 1; }
// Round 5: street tiles reachable from the player's spawn (4-way flood fill). Walled pockets stay 0.
export const reach = new Uint8Array(N);
{
  const q = [spawnY * W + spawnX], DX4 = [1, -1, 0, 0], DY4 = [0, 0, 1, -1]; reach[q[0]] = 1;
  while (q.length) {
    const i = q.pop(), x = i % W, y = (i / W) | 0;
    for (let d = 0; d < 4; d++) {
      const nx = x + DX4[d], ny = y + DY4[d], n = ny * W + nx;
      if (!isSolid(nx, ny) && !reach[n]) { reach[n] = 1; q.push(n); }
    }
  }
}
export function canReach(tx, ty) { return !isSolid(tx, ty) && reach[ty * W + tx] === 1; }
// random reachable street tile (outside extraction) within r tiles of (cxT, cyT); r = 0 → anywhere
export function randomReachable(cxT, cyT, r) {
  for (let i = 0; i < 4000; i++) {
    const x = r ? Math.round(cxT + (rand() * 2 - 1) * r) : Math.floor(rand() * W);
    const y = r ? Math.round(cyT + (rand() * 2 - 1) * r) : Math.floor(rand() * H);
    if (canReach(x, y) && x < W - TUNE.EXTRACT_COLS && (!r || Math.hypot(x - cxT, y - cyT) <= r)) return { x, y };
  }
  return { x: spawnX, y: spawnY };
}

// ============================ LOS (grid DDA) ===========================
// Counts solid tiles crossed between two world points (0 = clear LOS).
export function tilesCrossed(x0, y0, x1, y1, maxCount) {
  let tx = Math.floor(x0 / T), ty = Math.floor(y0 / T);
  const ex = Math.floor(x1 / T), ey = Math.floor(y1 / T);
  const dx = x1 - x0, dy = y1 - y0;
  const sx = dx > 0 ? 1 : -1, sy = dy > 0 ? 1 : -1;
  const adx = Math.abs(dx), ady = Math.abs(dy);
  const tdx = adx > 0 ? T / adx : 1e9, tdy = ady > 0 ? T / ady : 1e9;
  let tmx = adx > 0 ? (sx > 0 ? (tx + 1) * T - x0 : x0 - tx * T) / adx : 1e9;
  let tmy = ady > 0 ? (sy > 0 ? (ty + 1) * T - y0 : y0 - ty * T) / ady : 1e9;
  let n = Math.abs(ex - tx) + Math.abs(ey - ty), count = 0;
  while (n-- > 0) {
    if (tmx < tmy) { tmx += tdx; tx += sx; } else { tmy += tdy; ty += sy; }
    if (isSolid(tx, ty) && ++count >= maxCount) return count;
  }
  return count;
}

// ============================ PATHING (A*) =============================
export const gS = new Float32Array(N), from = new Int32Array(N), stamp = new Int32Array(N), closed = new Int32Array(N);
export const HEAPCAP = N * 8, heap = new Int32Array(HEAPCAP), heapF = new Float32Array(HEAPCAP);
let hn = 0, searchId = 0;
export function hpush(i, f) {
  if (hn >= HEAPCAP) return;
  let k = hn++;
  while (k > 0) { const p = (k - 1) >> 1; if (heapF[p] <= f) break; heap[k] = heap[p]; heapF[k] = heapF[p]; k = p; }
  heap[k] = i; heapF[k] = f;
}
export function hpop() {
  const top = heap[0], li = heap[--hn], lf = heapF[hn];
  let k = 0;
  for (;;) {
    let c = 2 * k + 1; if (c >= hn) break;
    if (c + 1 < hn && heapF[c + 1] < heapF[c]) c++;
    if (heapF[c] >= lf) break;
    heap[k] = heap[c]; heapF[k] = heapF[c]; k = c;
  }
  heap[k] = li; heapF[k] = lf;
  return top;
}
export const DX = [1, -1, 0, 0, 1, 1, -1, -1], DY = [0, 0, 1, -1, 1, -1, 1, -1];
export const DC = [1, 1, 1, 1, 1.4142, 1.4142, 1.4142, 1.4142];
export function heur(ax, ay, bx, by) { const dx = Math.abs(ax - bx), dy = Math.abs(ay - by); return dx + dy - 0.5858 * Math.min(dx, dy); }
export function nearestFree(tx, ty) {
  if (!isSolid(tx, ty)) return ty * W + tx;
  for (let r = 1; r <= 3; r++)
    for (let oy = -r; oy <= r; oy++) for (let ox = -r; ox <= r; ox++)
      if (!isSolid(tx + ox, ty + oy)) return (ty + oy) * W + tx + ox;
  return -1;
}
// Returns array of world points from (wx0,wy0) to tile target, or null.
export function findPath(wx0, wy0, wx1, wy1) {
  const s = nearestFree(Math.floor(wx0 / T), Math.floor(wy0 / T));
  const t = nearestFree(Math.floor(wx1 / T), Math.floor(wy1 / T));
  if (s < 0 || t < 0) return null;
  const tx = t % W, ty = (t / W) | 0;
  searchId++; hn = 0;
  stamp[s] = searchId; gS[s] = 0; from[s] = -1;
  hpush(s, 0);
  while (hn > 0) {
    const c = hpop();
    if (c === t) break;
    if (closed[c] === searchId) continue;
    closed[c] = searchId;
    const cx = c % W, cy = (c / W) | 0;
    for (let d = 0; d < 8; d++) {
      const nx = cx + DX[d], ny = cy + DY[d];
      if (isSolid(nx, ny)) continue;
      if (d >= 4 && (isSolid(nx, cy) || isSolid(cx, ny))) continue;
      const n = ny * W + nx, g = gS[c] + DC[d];
      if (stamp[n] !== searchId || g < gS[n]) { stamp[n] = searchId; gS[n] = g; from[n] = c; hpush(n, g + heur(nx, ny, tx, ty)); }
    }
  }
  if (stamp[t] !== searchId) return null;
  const pts = [];
  for (let c = t; c !== -1; c = from[c]) pts.push({ x: (c % W + 0.5) * T, y: (((c / W) | 0) + 0.5) * T });
  pts.reverse();
  pts[0] = { x: wx0, y: wy0 };
  if (t === ty * W + tx && !isSolid(Math.floor(wx1 / T), Math.floor(wy1 / T))) pts[pts.length - 1] = { x: wx1, y: wy1 };
  return smooth(pts);
}
export function clearWide(a, b) {
  const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 1;
  const px = -dy / L * TUNE.SMOOTH_PAD * T, py = dx / L * TUNE.SMOOTH_PAD * T;
  return tilesCrossed(a.x, a.y, b.x, b.y, 1) === 0 &&
         tilesCrossed(a.x + px, a.y + py, b.x + px, b.y + py, 1) === 0 &&
         tilesCrossed(a.x - px, a.y - py, b.x - px, b.y - py, 1) === 0;
}
export function smooth(pts) {
  const out = [pts[0]];
  let i = 0;
  while (i < pts.length - 1) {
    let j = pts.length - 1;
    while (j > i + 1 && !clearWide(pts[i], pts[j])) j--;
    out.push(pts[j]); i = j;
  }
  return out;
}
