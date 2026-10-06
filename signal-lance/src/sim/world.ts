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
// R16: the map is per-hunt state. loadMap() swaps it in: size (W, H, N), walls, clutter, spawn, reachability and the
// anchors table. Every reader imports these as live bindings, so they always see the current map. 'hive' = MAP_SRC above.
// Tile chars: '#' building, '%' set piece (a wall, drawn apart), ',' ground clutter (R16), anything else street.
export type MapDef = { id: string; rows: string[]; anchors: any; info?: any; spawn?: { x: number; y: number } };
export let MAP: any = null;           // the loaded map: { id, rows, anchors, info } (info: grid, blocks, mods, seed, rerolls)
export let W = 0, H = 0, N = 0;
export const T = TUNE.TILE;
export let solid = new Uint8Array(0);   // 1 = building, 2 = set piece (both block movement and LoS)
export let clutter = new Uint8Array(0); // R16: 1 = ground clutter (slow, loud, low cover; never blocks)
export let reach = new Uint8Array(0);   // Round 5: street tiles reachable from the player's spawn (4-way flood fill)
export let spawnX = 1, spawnY = 12;
export let mapGen = 0;                  // bumps on every loadMap (caches keyed on the map check it)
export function anchors() { return MAP.anchors; }
// R16 (map building only): extra A* cost per tile, so a second Escort leg is pushed off the first one. null = none.
export let penalty: Float32Array | null = null;
export function setPenalty(p: Float32Array | null) { penalty = p; }
export function loadMap(def: MapDef) {
  MAP = def; mapGen++;
  W = def.rows[0].length; H = def.rows.length; N = W * H;
  if (solid.length < N) { solid = new Uint8Array(N); clutter = new Uint8Array(N); reach = new Uint8Array(N); allocPath(N); }
  solid.fill(0); clutter.fill(0); reach.fill(0);
  let px = -1, py = -1;
  for (let y = 0; y < H; y++) {
    const row = def.rows[y].padEnd(W, '.').slice(0, W);
    for (let x = 0; x < W; x++) {
      const c = row[x], ex = x >= W - TUNE.EXTRACT_COLS; // extraction is always open street
      if (c === '#' && !ex) solid[y * W + x] = 1;
      if (c === '%' && !ex) solid[y * W + x] = 2;
      if (c === ',' && !ex) clutter[y * W + x] = 1;
      if (c === 'P') { px = x; py = y; }
    }
  }
  // spawn: the map's P, else the left edge, mid-height (nearest open tile)
  if (px < 0 && def.spawn) { px = def.spawn.x; py = def.spawn.y; } // R16: a packed district picks its own
  if (px < 0) { px = 0; py = H >> 1; for (let d = 0; d < H && isSolid(px, py); d++) { py = (H >> 1) + (d % 2 ? -1 : 1) * ((d + 1) >> 1); } }
  spawnX = px; spawnY = py;
  const q = [spawnY * W + spawnX], DX4 = [1, -1, 0, 0], DY4 = [0, 0, 1, -1]; reach[q[0]] = 1;
  while (q.length) {
    const i = q.pop(), x = i % W, y = (i / W) | 0;
    for (let d = 0; d < 4; d++) {
      const nx = x + DX4[d], ny = y + DY4[d], n = ny * W + nx;
      if (!isSolid(nx, ny) && !reach[n]) { reach[n] = 1; q.push(n); }
    }
  }
}
export const HIVE: MapDef = { id: 'hive', rows: MAP_SRC, anchors: MAP_ANCHORS.hive, info: { grid: 'hive' } };
export function isSolid(tx, ty) { return tx < 0 || ty < 0 || tx >= W || ty >= H || solid[ty * W + tx] !== 0; }
export function isClutter(tx, ty) { return tx >= 0 && ty >= 0 && tx < W && ty < H && clutter[ty * W + tx] === 1; }
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
let gS = new Float32Array(0), from = new Int32Array(0), stamp = new Int32Array(0), closed = new Int32Array(0);
let HEAPCAP = 0, heap = new Int32Array(0), heapF = new Float32Array(0);
let hn = 0, searchId = 0;
function allocPath(n: number) { // R16: sized to the biggest map loaded so far
  gS = new Float32Array(n); from = new Int32Array(n); stamp = new Int32Array(n); closed = new Int32Array(n); searchId = 0;
  HEAPCAP = n * 8; heap = new Int32Array(HEAPCAP); heapF = new Float32Array(HEAPCAP);
}
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
// R17: raw = the A* tile centres only (no smoothing, first / last not moved to the exact points): joins a drawn path's gaps.
export function findPath(wx0, wy0, wx1, wy1, raw = false) {
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
      const n = ny * W + nx, g = gS[c] + DC[d] * (clutter[n] ? TUNE.CLUTTER_TILE_COST : 1) + (penalty ? penalty[n] : 0); // R16: clutter costs more to enter; penalty: map building only
      if (stamp[n] !== searchId || g < gS[n]) { stamp[n] = searchId; gS[n] = g; from[n] = c; hpush(n, g + heur(nx, ny, tx, ty)); }
    }
  }
  if (stamp[t] !== searchId) return null;
  const pts = [];
  for (let c = t; c !== -1; c = from[c]) pts.push({ x: (c % W + 0.5) * T, y: (((c / W) | 0) + 0.5) * T });
  pts.reverse();
  if (raw) return pts;
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
// R16: a shortcut must also cost no more (clutter-weighted) than the A* steps it replaces, so smoothing never cuts
// across a clutter patch the search went round.
export function smooth(pts) {
  const out = [pts[0]], cum = [0];
  for (let k = 1; k < pts.length; k++) cum.push(cum[k - 1] + segCost(pts[k - 1], pts[k]));
  let i = 0;
  while (i < pts.length - 1) {
    let j = pts.length - 1;
    while (j > i + 1 && !(clearWide(pts[i], pts[j]) && segCost(pts[i], pts[j]) <= cum[j] - cum[i] + 0.05)) j--;
    out.push(pts[j]); i = j;
  }
  return out;
}
// ============================ R16: CLUTTER COST ========================
// Movement cost of a straight segment, in tiles: distance, with every stretch inside a clutter tile × CLUTTER_TILE_COST.
// Sampled every 1/8 tile (each sample's distance takes the cost of the tile it lands in).
const SAMPLE = 0.125;
export function segCost(a, b) {
  const d = Math.hypot(b.x - a.x, b.y - a.y) / T; if (d === 0) return 0;
  const k = TUNE.CLUTTER_TILE_COST; if (k === 1) return d;
  const n = Math.ceil(d / SAMPLE), ds = d / n; let c = 0;
  for (let i = 1; i <= n; i++) { const f = (i - 0.5) / n; c += ds * (isClutter(Math.floor((a.x + (b.x - a.x) * f) / T), Math.floor((a.y + (b.y - a.y) * f) / T)) ? k : 1); }
  return c;
}
export function pathCost(path) { let c = 0; for (let i = 1; i < path.length; i++) c += segCost(path[i - 1], path[i]); return c; }
// Does a path enter any clutter tile (its first point's tile excluded)?
export function pathHitsClutter(path) {
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1], b = path[i], d = Math.hypot(b.x - a.x, b.y - a.y) / T, n = Math.max(1, Math.ceil(d / SAMPLE));
    for (let k = 1; k <= n; k++) { const f = k / n; if (isClutter(Math.floor((a.x + (b.x - a.x) * f) / T), Math.floor((a.y + (b.y - a.y) * f) / T))) return true; }
  }
  return false;
}
// The first part of a path that costs at most `budget` tiles of movement (clutter-weighted), as world points.
export function clipPathCost(path, budget) {
  const out = [path[0]]; let left = budget;
  for (let i = 1; i < path.length && left > 1e-9; i++) {
    const a = path[i - 1], b = path[i], c = segCost(a, b);
    if (c <= left) { out.push(b); left -= c; continue; }
    const d = Math.hypot(b.x - a.x, b.y - a.y) / T, n = Math.ceil(d / SAMPLE), ds = d / n, k = TUNE.CLUTTER_TILE_COST; let f = 0;
    for (let s = 1; s <= n; s++) {
      const fm = (s - 0.5) / n, w = ds * (isClutter(Math.floor((a.x + (b.x - a.x) * fm) / T), Math.floor((a.y + (b.y - a.y) * fm) / T)) ? k : 1);
      if (w > left) { f += (left / w) / n; left = 0; break; }
      left -= w; f = s / n;
    }
    out.push({ x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f }); left = 0;
  }
  return out;
}

loadMap(HIVE); // the module starts on the hive map; rollEnemy / the test bed load the hunt's own
