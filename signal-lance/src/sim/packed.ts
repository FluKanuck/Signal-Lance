// R16 debrief 2 (Jamie: "still feels too much like a grid … irregular shape library of tiles … randomly placed to fit in
// the map footprint", and "shapes can extend past the map edge, they are just cut off by the map boundary").
// A packed district: the footprint is laid out in half-block CELLs (BLOCK_SIZE / 2 tiles). Pieces from a shape library
// (1×1, 1×2, 1×3, L3, L4, 2×2 = a hand-drawn block, 2×3) are packed into a cell grid one cell bigger than the map on every
// side, at a random offset, then cropped to the map, so seams never line up with each other or with the map edges.
// Each side of a piece keeps its street with STREET_KEEP; a dropped side runs the buildings to the edge (streets narrow
// or close where pieces meet). Pieces other than 2×2 get generated interiors. Then street blockers on narrow stretches,
// set pieces (each checked not to cut anything off), and an Escort route of genuinely different paths.
import { TUNE } from '../tune.ts';
import { rand } from './rng.ts';
import { loadMap, canReach, findPath, setPenalty, T, MAP } from './world.ts';
import { BLOCKS, placedRows, tf, tfRect, cellName } from './blocks.ts';

type Cell = [number, number];
type Shape = { name: string; cells: Cell[] };
const BASE: Record<string, Cell[]> = {
  '1x1': [[0, 0]],
  '1x2': [[0, 0], [1, 0]],
  '1x3': [[0, 0], [1, 0], [2, 0]],
  'L3': [[0, 0], [0, 1], [1, 1]],
  'L4': [[0, 0], [0, 1], [0, 2], [1, 2]],
  '2x2': [[0, 0], [1, 0], [0, 1], [1, 1]],
  '2x3': [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1]],
};
// every rotation and mirror of each base shape, normalised (min x, y = 0), duplicates dropped
const VARIANTS: Record<string, Cell[][]> = {};
for (const [name, base] of Object.entries(BASE)) {
  const seen = new Set<string>(), out: Cell[][] = [];
  for (let m = 0; m < 2; m++) for (let r = 0; r < 4; r++) {
    let c: Cell[] = base.map(([x, y]) => [m ? -x : x, y] as Cell);
    for (let k = 0; k < r; k++) c = c.map(([x, y]) => [-y, x] as Cell);
    const mx = Math.min(...c.map(p => p[0])), my = Math.min(...c.map(p => p[1]));
    c = c.map(([x, y]) => [x - mx, y - my] as Cell).sort((a, b) => a[1] - b[1] || a[0] - b[0]);
    const key = c.join(';'); if (!seen.has(key)) { seen.add(key); out.push(c); }
  }
  VARIANTS[name] = out;
}
const DIRS: Record<string, Cell> = { N: [0, -1], E: [1, 0], S: [0, 1], W: [-1, 0] };

// why the last build failed (runner / tests): 'spots' | 'exit' | 'escort'
export const fails: Record<string, number> = {};
function fail(why: string) { fails[why] = (fails[why] || 0) + 1; return false; }
// escort: the hunt is an Escort job, so the district must have a convoy route (other jobs don't reroll for it)
export function rollPacked(seed: number, grid?: string, escort = true) {
  let k = 0;
  for (; k < TUNE.MAP_REROLL_MAX; k++) if (buildPacked(seed, grid, escort)) break;
  return k;
}

function buildPacked(seed: number, grid?: string, escort = true): boolean {
  const Gs = TUNE.MAP_GRIDS.filter(g => { const [c, r] = g.split('x').map(Number); return c * r >= TUNE.MAP_MIN_BLOCKS; });
  const g = grid || Gs[Math.floor(rand() * Gs.length)] || '6x2';
  const [cols, rows] = g.split('x').map(Number), S = TUNE.BLOCK_SIZE, C = S >> 1, W = cols * S, H = rows * S;
  const GC = cols * 2 + 2, GR = rows * 2 + 2, offX = TUNE.MAP_EDGE_CROP ? Math.floor(rand() * C) : C, offY = TUNE.MAP_EDGE_CROP ? Math.floor(rand() * C) : C;
  // packing-grid tile (px, py) ↔ map tile (px - offX, py - offY)
  const occ: number[][] = Array.from({ length: GR }, () => Array(GC).fill(-1));
  const pieces: { name: string; cells: Cell[] }[] = [];
  const W8 = TUNE.SHAPE_WEIGHTS, names = Object.keys(W8);
  for (let cy = 0; cy < GR; cy++) for (let cx = 0; cx < GC; cx++) {
    if (occ[cy][cx] >= 0) continue;
    // shapes in a weighted random order (without replacement), each shape's variants in random order; the first that
    // fits with its first cell (row-major) on this cell wins. 1×1 always fits.
    const bag = names.slice(), order: string[] = [];
    while (bag.length) { const tot = bag.reduce((a, n) => a + W8[n], 0); let r = rand() * tot, i = 0; for (; i < bag.length - 1; i++) { r -= W8[bag[i]]; if (r < 0) break; } order.push(bag.splice(i, 1)[0]); }
    let placed = false;
    for (const name of order) {
      const vs = VARIANTS[name].slice(); for (let i = vs.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [vs[i], vs[j]] = [vs[j], vs[i]]; }
      for (const v of vs) {
        const [ax, ay] = v[0], cells = v.map(([x, y]) => [cx + x - ax, cy + y - ay] as Cell);
        if (cells.every(([x, y]) => x >= 0 && y >= 0 && x < GC && y < GR && occ[y][x] < 0)) {
          cells.forEach(([x, y]) => { occ[y][x] = pieces.length; }); pieces.push({ name, cells }); placed = true; break;
        }
      }
      if (placed) break;
    }
  }
  // ---- draw the pieces on the packing grid ----
  const PW = GC * C, PH = GR * C, gr: string[][] = Array.from({ length: PH }, () => Array(PW).fill('.'));
  const spots = [], zoneSlots = [], sets = [], blocks: string[] = [], counts: any = { clutter: 0, piece: 0, zone: 0, RUBBLE: 0, BARRICADE: 0, CHOKE: 0, shapes: {} };
  const toMap = (px: number, py: number) => ({ x: px - offX, y: py - offY });
  const label = (px: number, py: number) => { const m = toMap(px, py); return cellName(Math.max(0, Math.min(cols - 1, Math.floor(m.x / S))), Math.max(0, Math.min(rows - 1, Math.floor(m.y / S)))); };
  const mod = () => rand() < TUNE.MOD_SPAWN_CHANCE;
  pieces.forEach((pc, idx) => {
    counts.shapes[pc.name] = (counts.shapes[pc.name] || 0) + 1;
    const mine = (px: number, py: number) => px >= 0 && py >= 0 && px < PW && py < PH && occ[Math.floor(py / C)][Math.floor(px / C)] === idx;
    const keep: Record<string, boolean> = {}; for (const d of Object.keys(DIRS)) keep[d] = rand() < TUNE.STREET_KEEP;
    const tiles: Cell[] = []; for (const [cx, cy] of pc.cells) for (let y = 0; y < C; y++) for (let x = 0; x < C; x++) tiles.push([cx * C + x, cy * C + y]);
    const edges = (px: number, py: number) => Object.keys(DIRS).filter(d => !mine(px + DIRS[d][0], py + DIRS[d][1]));
    const x0 = Math.min(...pc.cells.map(c => c[0])) * C, y0 = Math.min(...pc.cells.map(c => c[1])) * C;
    if (pc.name === '2x2') { // a hand-drawn block, placed as before; a dropped side pushes its building fronts to the edge
      const b = BLOCKS[Math.floor(rand() * BLOCKS.length)], rot = Math.floor(rand() * 4), mir = rand() < 0.5, pr = placedRows(b, rot, mir);
      blocks.push(b.name);
      for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) gr[y0 + y][x0 + x] = pr[y][x];
      for (const [px, py] of tiles) for (const d of edges(px, py)) if (!keep[d]) { const [dx, dy] = DIRS[d]; if (gr[py - dy][px - dx] === '#') gr[py][px] = '#'; }
      for (const s of b.spots) { const p = tf(s.x, s.y, rot, mir); spots.push({ x: x0 + p.x, y: y0 + p.y, name: s.name }); }
      for (const s of b.mods) {
        if (!mod()) continue;
        const rc = tfRect(s, rot, mir); rc.x += x0; rc.y += y0;
        if (s.kind === 'clutter') { for (let y = rc.y; y < rc.y + rc.h; y++) for (let x = rc.x; x < rc.x + rc.w; x++) if (gr[y][x] === '.') gr[y][x] = ','; counts.clutter++; }
        if (s.kind === 'zone') zoneSlots.push({ x: rc.x, y: rc.y, name: s.name });
        if (s.kind === 'piece') sets.push(rc);
      }
      return;
    }
    // generated interior: building mass inside a street ring; dropped sides run the building to the edge
    for (const [px, py] of tiles) { const e = edges(px, py); gr[py][px] = !e.length ? '#' : e.some(d => keep[d]) ? '.' : '#'; }
    if (pc.name === '1x1' && rand() < TUNE.LOT_CHANCE) { // a small open lot: room to breathe (and a spot)
      for (const [px, py] of tiles) gr[py][px] = '.';
      if (mod()) { const cx = x0 + 1 + Math.floor(rand() * (C - 3)), cy = y0 + 1 + Math.floor(rand() * (C - 3)); for (let y = cy; y < cy + 2; y++) for (let x = cx; x < cx + 2; x++) gr[y][x] = ','; counts.clutter++; }
      spots.push({ x: x0 + (C >> 1), y: y0 + (C >> 1), name: 'lot' }); zoneSlots.push({ x: x0 + (C >> 1), y: y0 + (C >> 1), name: 'lot' });
      return;
    }
    // a courtyard in a bigger piece: one inner cell opened up, joined to the street by an alley (with a spot and a zone slot)
    if (pc.cells.length >= 3 && rand() < TUNE.YARD_CHANCE) {
      const [cx, cy] = pc.cells[Math.floor(rand() * pc.cells.length)], yx = cx * C, yy = cy * C;
      for (let y = 1; y < C - 1; y++) for (let x = 1; x < C - 1; x++) if (mine(yx + x, yy + y)) gr[yy + y][yx + x] = '.';
      const d = Object.keys(DIRS)[Math.floor(rand() * 4)], [dx, dy] = DIRS[d]; // alley out of the yard, straight to the piece's edge
      for (let t = 0, px = yx + (C >> 1), py = yy + (C >> 1); t < 3 * C && mine(px, py); t++, px += dx, py += dy) gr[py][px] = '.';
      spots.push({ x: yx + (C >> 1), y: yy + (C >> 1), name: 'yard' }); zoneSlots.push({ x: yx + (C >> 1), y: yy + (C >> 1), name: 'yard' });
      if (mod()) sets.push({ x: yx + 1, y: yy + 1, w: 2, h: 1 });
    }
    // alleys: 0..ALLEY_MAX one-tile cuts straight across the piece
    const na = Math.floor(rand() * (TUNE.ALLEY_MAX + 1));
    for (let a = 0; a < na; a++) {
      const horiz = rand() < 0.5;
      const pick = pc.cells[Math.floor(rand() * pc.cells.length)], line = (horiz ? pick[1] : pick[0]) * C + 1 + Math.floor(rand() * (C - 2));
      const run: Cell[] = [];
      for (const [px, py] of tiles) if ((horiz ? py : px) === line) run.push([px, py]);
      for (const [px, py] of run) gr[py][px] = '.';
      if (run.length > 4 && mod()) { const k = 1 + Math.floor(rand() * (run.length - 3)); for (let i = k; i < k + 2; i++) gr[run[i][1]][run[i][0]] = ','; counts.clutter++; }
    }
  });
  // ---- crop to the map; the left edge stays a road (the way in) ----
  const mp: string[][] = [];
  for (let y = 0; y < H; y++) { const row = gr[y + offY].slice(offX, offX + W); row[0] = '.'; mp.push(row); }
  const inMap = (p) => p.x >= 0 && p.y >= 0 && p.x < W && p.y < H;
  const shift = (p) => ({ ...p, ...toMap(p.x, p.y) });
  const paint = (rc, ch, from) => { for (let y = rc.y; y < rc.y + rc.h; y++) for (let x = rc.x; x < rc.x + rc.w; x++) if (y >= 0 && x >= 0 && y < H && x < W && from.includes(mp[y][x])) mp[y][x] = ch; };
  const open = (x, y) => x >= 0 && y >= 0 && x < W && y < H && mp[y][x] !== '#' && mp[y][x] !== '%';
  const reachN = () => { const seen = new Uint8Array(W * H); const q = [(H >> 1) * W]; seen[q[0]] = 1; let n = 0; while (q.length) { const i = q.pop(), x = i % W, y = (i / W) | 0; n++; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (open(nx, ny) && !seen[ny * W + nx]) { seen[ny * W + nx] = 1; q.push(ny * W + nx); } } } return { n, seen }; };
  const bars = []; // street walls placed (barricades, chicane halves): softened to rubble if the Escort can't find two ways
  const wall = (rc) => { // a wall goes in only if no open tile loses its way out (and never on the left-edge road)
    if (rc.x < 1) return false;
    const before = reachN().n, keepG = mp.map(r => r.slice()); let lost = 0;
    for (let y = rc.y; y < rc.y + rc.h; y++) for (let x = rc.x; x < rc.x + rc.w; x++) if (open(x, y)) lost++;
    paint(rc, '%', '.,');
    if (reachN().n < before - lost) { for (let y = 0; y < H; y++) mp[y] = keepG[y]; return false; }
    return true;
  };
  // street blockers on narrow stretches: a tile whose street runs one way for 6+ tiles and is at most 3 wide across
  const K = TUNE.SEAM_BLOCK_KINDS, tot = Object.values(K).reduce((a: number, b: number) => a + b, 0) as number;
  const nb = Math.round(TUNE.SEAM_BLOCK_CHANCE * 4 * W * H / (S * S));
  const run = (x, y, dx, dy) => { let n = 0; for (let k = 1; k < 13 && open(x + dx * k, y + dy * k) && x + dx * k < W - TUNE.EXTRACT_COLS; k++) n++; return n; };
  for (let b = 0, tries = 0; b < nb && tries < nb * 40; tries++) {
    const x = 2 + Math.floor(rand() * (W - TUNE.EXTRACT_COLS - 6)), y = Math.floor(rand() * H);
    if (mp[y][x] !== '.') continue;
    const hl = run(x, y, -1, 0), hr = run(x, y, 1, 0), vu = run(x, y, 0, -1), vd = run(x, y, 0, 1);
    const along = hl + hr + 1 >= 6 && vu + vd + 1 <= 3 ? 'h' : vu + vd + 1 >= 6 && hl + hr + 1 <= 3 ? 'v' : '';
    if (!along) continue;
    let r = rand() * tot, kind = 'RUBBLE'; for (const k of Object.keys(K)) { r -= K[k]; if (r < 0) { kind = k; break; } }
    const lanes = along === 'h' ? Array.from({ length: vu + vd + 1 }, (_, i) => y - vu + i) : Array.from({ length: hl + hr + 1 }, (_, i) => x - hl + i);
    if (kind === 'CHOKE' && lanes.length < 2) kind = 'RUBBLE';
    const rect = (a, len, ln) => along === 'h' ? { x: a, y: Math.min(...ln), w: len, h: ln.length } : { x: Math.min(...ln), y: a, w: ln.length, h: len };
    const a = along === 'h' ? x : y;
    if (kind === 'RUBBLE') { paint(rect(a, 2 + Math.floor(rand() * 2), lanes), ',', '.'); counts.RUBBLE++; b++; continue; }
    if (kind === 'BARRICADE') { const rc = rect(a, 1 + Math.floor(rand() * 2), lanes); if (wall(rc)) { bars.push(rc); counts.BARRICADE++; b++; } continue; }
    const f = rand() < 0.5 ? 0 : lanes.length - 1; // chicane: one lane, then the other, a tile further on
    const c1 = rect(a, 2, [lanes[f]]), c2 = rect(a + 3, 2, [lanes[lanes.length - 1 - f]]);
    if (wall(c1)) { bars.push(c1); if (wall(c2)) bars.push(c2); counts.CHOKE++; b++; }
  }
  for (const rc of sets) { const m = shift(rc); if (wall(m)) counts.piece++; }
  // enclosed pockets (where pieces closed in on each other) become building
  // the right edge walled off from the streets: cut a street through to it, along the row nearest mid-height that needs least
  { const seen = reachN().seen; let ex = false; for (let y = 0; y < H && !ex; y++) for (let x = W - TUNE.EXTRACT_COLS; x < W && !ex; x++) ex = !!seen[y * W + x];
    if (!ex) { let by = H >> 1, bc = 1e9; for (let y = 0; y < H; y++) { let x = W - TUNE.EXTRACT_COLS - 1, c = 0; while (x > 0 && !seen[y * W + x]) { x--; c++; } if (c + Math.abs(y - (H >> 1)) * 0.5 < bc) { bc = c + Math.abs(y - (H >> 1)) * 0.5; by = y; } }
      for (let x = W - TUNE.EXTRACT_COLS - 1; x > 0 && !seen[by * W + x]; x--) mp[by][x] = '.'; } }
  const fillPockets = () => { const R = reachN().seen; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (open(x, y) && !R[y * W + x] && x < W - TUNE.EXTRACT_COLS) mp[y][x] = '#'; };
  fillPockets();
  // R16 (Jamie: "im going to have to take multiple rounds just to get out of this cramped area"): spawn on the left-edge row
  // with the most street within SPAWN_LOOK steps, and clear a staging apron there
  let sy = H >> 1, best = -1e9;
  for (let y = 2; y < H - 2; y++) {
    const dist = new Int16Array(W * H).fill(-1), q = [y * W]; dist[q[0]] = 0; let n = 0;
    for (let h = 0; h < q.length; h++) { const i = q[h], x = i % W, yy = (i / W) | 0; n++; if (dist[i] >= TUNE.SPAWN_LOOK) continue;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = yy + dy; if (open(nx, ny) && dist[ny * W + nx] < 0) { dist[ny * W + nx] = dist[i] + 1; q.push(ny * W + nx); } } }
    const score = n - Math.abs(y - (H >> 1)) * 0.5; if (score > best) { best = score; sy = y; }
  }
  const AW = TUNE.SPAWN_APRON.W, AH = TUNE.SPAWN_APRON.H;
  for (let y = Math.max(0, sy - (AH >> 1)); y < Math.min(H, sy + (AH >> 1) + 1); y++) for (let x = 0; x < AW; x++) mp[y][x] = '.';
  const named = (p) => ({ x: p.x, y: p.y, name: p.name + ' ' + cellName(Math.min(cols - 1, Math.floor(p.x / S)), Math.min(rows - 1, Math.floor(p.y / S))) });
  const ups = spots.map(shift).filter(inMap).filter(p => open(p.x, p.y)).map(named);
  // too few objective spots (a district of small pieces): add street crossings far from the spawn
  for (let t = 0; ups.length < 3 && t < 400; t++) {
    const x = Math.floor(W * (0.3 + 0.6 * rand())), y = 1 + Math.floor(rand() * (H - 2));
    if (x < W - TUNE.EXTRACT_COLS && open(x, y) && [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) => open(x + dx, y + dy)).length >= 3 && !ups.some(u => Math.hypot(u.x - x, u.y - y) < 8)) ups.push(named({ x, y, name: 'crossing' }));
  }
  const zs = zoneSlots.map(shift).filter(inMap).map(p => ({ ...named(p), name: p.name + ' (' + named(p).name.split(' ').pop() + ')' }));
  counts.zone = zs.length;
  const anchors: any = { uplinks: ups, cargo: [], zoneSlots: zs, waypoints: {}, legs: [], junctions: [], escortSite: '' };
  loadMap({ id: 'blocks', rows: mp.map(r => r.join('')), anchors, info: { grid: g, w: W, h: H, layout: 'packed', blocks, counts, seed, rerolls: 0 }, spawn: { x: 0, y: sy } });
  if (ups.filter(u => canReach(u.x, u.y)).length < 2) return fail('spots');
  let out = false; for (let y = 0; y < H && !out; y++) out = canReach(W - 1, y);
  if (!out) return fail('exit');
  if (escortPaths(anchors, W, H, sy) || !escort) return true;
  // no two ways somewhere: soften street walls to rubble, last placed first, until the Escort finds them
  for (const rc of bars.reverse()) {
    paint(rc, ',', '%'); fillPockets(); counts.softened = (counts.softened || 0) + 1;
    loadMap({ id: 'blocks', rows: mp.map(r => r.join('')), anchors, info: MAP.info, spawn: { x: 0, y: sy } });
    if (escortPaths(anchors, W, H, sy) || !escort) return true;
  }
  return fail('escort');
}

// ---- the Escort route on any layout ----
// Forks sit on reachable street tiles about evenly across the map (a junction near mid-height if one is close). From
// each fork, up to three legs go to the next fork (or out the right edge): the shortest path, then the shortest path
// that keeps off the first (A* with a penalty on and next to it), then one off both. A leg that mostly repeats an
// earlier one is dropped; every fork needs 2. Legs are named by where they run: NORTH / AHEAD / SOUTH (2 legs: NORTH,
// SOUTH). Each leg stores its walk, so the transport follows exactly that path.
function escortPaths(A, W: number, H: number, sy: number): boolean { // sy: the spawn row (the transport starts beside the lance)
  const n = Math.max(1, TUNE.ESCORT_FORKS), at = (x, y) => ({ x: (x + 0.5) * T, y: (y + 0.5) * T });
  const junction = (x, y) => [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) => canReach(x + dx, y + dy)).length >= 3;
  const near = (tx: number, ty: number) => {
    let best = null, bd = 1e9;
    for (let y = 1; y < H - 1; y++) for (let x = 2; x < W - TUNE.EXTRACT_COLS - 2; x++) {
      if (!canReach(x, y)) continue;
      const d = Math.hypot(x - tx, (y - ty) * 0.7) - (junction(x, y) ? 3 : 0);
      if (d < bd) { bd = d; best = { x, y }; }
    }
    return best;
  };
  const tilesOf = (P) => { const out: number[] = []; for (let i = 1; i < P.length; i++) { const a = P[i - 1], b = P[i], d = Math.hypot(b.x - a.x, b.y - a.y) / T, m = Math.max(1, Math.ceil(d * 2)); for (let k = 0; k <= m; k++) { const f = k / m; out.push(Math.floor((a.y + (b.y - a.y) * f) / T) * W + Math.floor((a.x + (b.x - a.x) * f) / T)); } } return out; };
  // up to 3 different walks from tile `from` to tile `to`: each next one with the earlier ones (and their neighbours)
  // penalised, pushing harder (×1, ×3, ×8) until it finds a way that mostly differs. Shared stretches within
  // ESCORT_SHARED tiles of either end don't count (every leg has to leave the fork and arrive at the same place).
  // R16 (Jamie: routes "progress and then back track"): a leg may travel at most ESCORT_BACKTRACK tiles west in all, and be
  // at most ESCORT_DETOUR × the shortest leg's length; anything loopier is dropped.
  const plen = (P) => { let L = 0; for (let i = 1; i < P.length; i++) L += Math.hypot(P[i].x - P[i - 1].x, P[i].y - P[i - 1].y); return L / T; };
  const west = (P) => { let w = 0; for (let i = 1; i < P.length; i++) w += Math.max(0, P[i - 1].x - P[i].x); return w / T; };
  const legsBetween = (from, targets) => {
    const pen = new Float32Array(W * H), found: { P: any[]; t: Set<number> }[] = [], R = TUNE.ESCORT_SHARED;
    let base = 1e9;
    for (const mult of [0, 1, 3, 8]) for (const to of targets) {
      if (found.length >= 3) break;
      if (mult && !found.length) break;
      const mid = (i: number) => { const x = i % W, y = (i / W) | 0; return Math.hypot(x - from.x, y - from.y) > R && Math.hypot(x - to.x, y - to.y) > R; };
      setPenalty(mult ? pen.map(v => v * mult) : null);
      const a = at(from.x, from.y), b = at(to.x, to.y), P = findPath(a.x, a.y, b.x, b.y);
      setPenalty(null);
      if (!P) continue;
      const L = plen(P); if (!mult) base = Math.min(base, L);
      if (west(P) > TUNE.ESCORT_BACKTRACK || L > TUNE.ESCORT_DETOUR * base) continue;
      const all = tilesOf(P), m = all.filter(mid), t = new Set(m.length >= 4 ? m : all); // a short leg is compared whole
      if (found.some(f => { let sh = 0; for (const i of t) if (f.t.has(i)) sh++; return sh > 0.5 * t.size; })) continue;
      found.push({ P, t });
      for (const i of all) { const x = i % W, y = (i / W) | 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const nx = x + dx, ny = y + dy; if (nx >= 0 && ny >= 0 && nx < W && ny < H) pen[ny * W + nx] = TUNE.ESCORT_LEG_SPREAD; } }
    }
    return found;
  };
  for (let attempt = 0; attempt < 12; attempt++) { // fork spots: evenly across, at a seeded height; other heights if a fork has no choice
    const jit = attempt < 4 ? 0 : (rand() - 0.5) * W / (n + 1) * 0.6; // later tries also slide the forks along
    const forks = []; for (let k = 0; k < n; k++) forks.push(near(Math.round((k + 1) * W / (n + 1) + jit), Math.round(H * (0.2 + 0.6 * rand()))));
    if (forks.some(f => !f)) return false;
    const wp: any = {}, legs = [];
    wp.S = { x: 0, y: sy, name: 'west edge' };
    forks.forEach((f, k) => { wp['J' + (k + 1)] = { ...f, name: 'fork at ' + cellName(Math.floor(f.x / TUNE.BLOCK_SIZE), Math.floor(f.y / TUNE.BLOCK_SIZE)) }; });
    const p0 = findPath(at(0, sy).x, at(0, sy).y, at(forks[0].x, forks[0].y).x, at(forks[0].x, forks[0].y).y);
    if (!p0 || west(p0) > TUNE.ESCORT_BACKTRACK) continue; // the first fork must be reachable without looping back
    legs.push({ from: 'S', to: 'J1', via: [], pts: p0 });
    let ok = true;
    for (let k = 0; k < n && ok; k++) {
      const from = forks[k], last = k + 1 === n; // the last fork's legs may leave by different stretches of the right edge
      const exits = [from.y, Math.round(H * 0.2), Math.round(H * 0.8)].map(y => ({ x: W - 1, y: Math.max(0, Math.min(H - 1, y)) }));
      const found = legsBetween(from, last ? exits : [forks[k + 1]]);
      if (found.length < 2) { ok = false; break; }
      const my = (P) => P.reduce((s, p) => s + p.y, 0) / P.length, sorted = found.slice().sort((p, q) => my(p.P) - my(q.P));
      const names = sorted.length === 3 ? ['NORTH', 'AHEAD', 'SOUTH'] : ['NORTH', 'SOUTH'];
      sorted.forEach((f, i) => {
        let toK = 'J' + (k + 2);
        if (last) { toK = names[i] === 'AHEAD' ? 'X' : 'X' + names[i][0]; const e = f.P[f.P.length - 1]; wp[toK] = { x: Math.floor(e.x / T), y: Math.floor(e.y / T), name: 'east edge' }; } // exits X (AHEAD), XN, XS
        legs.push({ from: 'J' + (k + 1), to: toK, via: [], name: names[i], pts: f.P });
      });
    }
    if (!ok) continue;
    A.waypoints = wp; A.legs = legs; A.junctions = forks.map((_, k) => 'J' + (k + 1)); A.escortSite = 'J' + n;
    return true;
  }
  return false;
}
