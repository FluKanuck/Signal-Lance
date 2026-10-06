// Round 16: rolled ground. A district is a grid of hand-drawn BLOCK_SIZE blocks (this library), rolled per hunt from the
// hunt's seed: grid size, which block goes where, rotation / mirroring, and which modifier slots spawn. Every block keeps
// a 1-tile street ring, so any arrangement joins up. Each block carries its own anchors (uplink / cargo spots and modifier
// slots) in block-local tiles; buildDistrict merges them into one anchors table (MAP_ANCHORS shape) and generates the
// Escort route from the street seams between blocks.
import { TUNE } from '../tune.ts';
import { rand } from './rng.ts';
import { loadMap, canReach, findPath, isSolid, T, MAP } from './world.ts';
import { rollPacked } from './packed.ts';

// '#' building, '.' street, ',' ground clutter that is always there (the lot). Slots: zone = a QUIET / NOISE centre,
// piece = a set piece rect (a wall: fallen gantry, container stack, dead vehicle), clutter = a scrap / glass / rubble patch.
type Slot = { kind: 'zone' | 'piece' | 'clutter'; x: number; y: number; w?: number; h?: number; name: string };
export type Block = { name: string; rows: string[]; spots: { x: number; y: number; name: string }[]; mods: Slot[] };

export const BLOCKS: Block[] = [
  { name: 'plaza', rows: [
    '............',
    '.###....###.',
    '.###....###.',
    '.###.##.###.',
    '............',
    '.#........#.',
    '.#........#.',
    '............',
    '.###.##.###.',
    '.###....###.',
    '.###....###.',
    '............'],
    spots: [{ x: 6, y: 6, name: 'plaza' }],
    mods: [{ kind: 'zone', x: 6, y: 5, name: 'plaza' }, { kind: 'piece', x: 5, y: 1, w: 2, h: 2, name: 'kiosk' },
           { kind: 'clutter', x: 3, y: 5, w: 3, h: 2, name: 'glass' }, { kind: 'clutter', x: 0, y: 5, w: 1, h: 2, name: 'rubble' }] },
  { name: 'alleys', rows: [
    '............',
    '.###.##.###.',
    '.###.##.###.',
    '.###.##.###.',
    '............',
    '.##.####.##.',
    '.##.####.##.',
    '............',
    '.###.##.###.',
    '.###.##.###.',
    '.###.##.###.',
    '............'],
    spots: [{ x: 4, y: 7, name: 'alley mouth' }],
    mods: [{ kind: 'clutter', x: 4, y: 1, w: 1, h: 3, name: 'scrap' }, { kind: 'clutter', x: 7, y: 8, w: 1, h: 3, name: 'scrap' },
           { kind: 'zone', x: 6, y: 4, name: 'alleys' }] },
  { name: 'yard', rows: [
    '............',
    '.##########.',
    '.#........#.',
    '.#.##.....#.',
    '.#.##..##.#.',
    '.#.....##.#.',
    '.#........#.',
    '.#..##....#.',
    '.#..##....#.',
    '.####..####.',
    '............',
    '............'],
    spots: [{ x: 5, y: 5, name: 'yard' }, { x: 6, y: 10, name: 'yard gate' }],
    mods: [{ kind: 'piece', x: 6, y: 6, w: 2, h: 2, name: 'container stack' }, { kind: 'clutter', x: 2, y: 5, w: 3, h: 2, name: 'rubble' },
           { kind: 'zone', x: 5, y: 5, name: 'yard' }, { kind: 'clutter', x: 8, y: 10, w: 2, h: 2, name: 'scrap' }] },
  { name: 'avenue', rows: [
    '............',
    '.##########.',
    '.##########.',
    '.##########.',
    '.####.#####.',
    '............',
    '............',
    '.###.##.###.',
    '.###.##.###.',
    '.###.##.###.',
    '.###.##.###.',
    '............'],
    spots: [{ x: 8, y: 6, name: 'avenue' }],
    mods: [{ kind: 'piece', x: 4, y: 5, w: 2, h: 1, name: 'dead vehicle' }, { kind: 'clutter', x: 1, y: 5, w: 2, h: 2, name: 'glass' },
           { kind: 'zone', x: 9, y: 5, name: 'avenue' }] },
  { name: 'lot', rows: [
    '............',
    '.#####......',
    '.#####..,,..',
    '.#####.,,,,.',
    '.......,,,..',
    '............',
    '..,,...###..',
    '.,,,,..####.',
    '..,,...####.',
    '.......####.',
    '.##....####.',
    '............'],
    spots: [{ x: 9, y: 4, name: 'scrap lot' }],
    mods: [{ kind: 'piece', x: 3, y: 5, w: 2, h: 2, name: 'container' }, { kind: 'clutter', x: 4, y: 8, w: 3, h: 3, name: 'scrap' },
           { kind: 'zone', x: 9, y: 3, name: 'scrap lot' }] },
  { name: 'warren', rows: [
    '............',
    '.##.##.###..',
    '.##.##.###..',
    '....##......',
    '.##....##.#.',
    '.##.##.##.#.',
    '....##......',
    '.###...###..',
    '.###.#.###..',
    '.....#......',
    '.##.....###.',
    '............'],
    spots: [{ x: 6, y: 6, name: 'warren' }],
    mods: [{ kind: 'clutter', x: 3, y: 3, w: 4, h: 1, name: 'rubble' }, { kind: 'clutter', x: 6, y: 9, w: 3, h: 1, name: 'rubble' },
           { kind: 'zone', x: 6, y: 5, name: 'warren' }, { kind: 'clutter', x: 0, y: 6, w: 1, h: 2, name: 'rubble' }] },
  { name: 'towers', rows: [
    '............',
    '.#####.####.',
    '.#####.####.',
    '.#####.####.',
    '.#####.####.',
    '.#####.####.',
    '............',
    '.####.#####.',
    '.####.#####.',
    '.####.#####.',
    '.####.#####.',
    '............'],
    spots: [{ x: 3, y: 6, name: 'tower gap' }],
    mods: [{ kind: 'clutter', x: 6, y: 2, w: 1, h: 3, name: 'glass' }, { kind: 'clutter', x: 5, y: 7, w: 1, h: 3, name: 'glass' },
           { kind: 'zone', x: 6, y: 6, name: 'towers' }] },
  { name: 'depot', rows: [
    '............',
    '.########...',
    '.########.#.',
    '.##.......#.',
    '.##.......#.',
    '.##.####....',
    '.##.####....',
    '.##.....###.',
    '.##.....###.',
    '.##.###.###.',
    '............',
    '............'],
    spots: [{ x: 5, y: 8, name: 'loading bay' }],
    mods: [{ kind: 'piece', x: 4, y: 3, w: 3, h: 1, name: 'gantry' }, { kind: 'clutter', x: 9, y: 3, w: 2, h: 3, name: 'scrap' },
           { kind: 'zone', x: 6, y: 7, name: 'depot' }, { kind: 'clutter', x: 11, y: 4, w: 1, h: 3, name: 'scrap' }] },
];
export function blockByName(n: string) { const b = BLOCKS.find(b => b.name === n); if (!b) throw new Error('no block ' + n); return b; }

// ---- placing one block: rotation (quarter turns clockwise) then mirror (left-right) ----
export function tf(x: number, y: number, rot: number, mir: boolean) {
  const S = TUNE.BLOCK_SIZE;
  for (let k = 0; k < rot; k++) { const nx = S - 1 - y; y = x; x = nx; }
  return mir ? { x: S - 1 - x, y } : { x, y };
}
export function tfRect(s: Slot, rot: number, mir: boolean) {
  const a = tf(s.x, s.y, rot, mir), b = tf(s.x + (s.w || 1) - 1, s.y + (s.h || 1) - 1, rot, mir);
  return { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(a.x - b.x) + 1, h: Math.abs(a.y - b.y) + 1 };
}
export function placedRows(b: Block, rot: number, mir: boolean) {
  const S = TUNE.BLOCK_SIZE, out = Array.from({ length: S }, () => Array(S).fill('.'));
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) { const p = tf(x, y, rot, mir); out[p.y][p.x] = b.rows[y][x]; }
  return out;
}

// A district spec: everything rolled, so the test bed can hand one over fixed. cells[r][c] = { b: block name, rot, mir };
// mods = the slots that spawned, as [cell index (row-major), slot index]; forks = the Escort fork rows (seam index per fork).
// paint (test bed only): hand-placed tiles laid over the finished district, e.g. a clutter band across a street.
// seams (R16 debrief): street blockers rolled per stretch of street between two crossings (none in the test bed's fixed specs).
type Rect = { x: number; y: number; w: number; h: number; ch: string; kind?: string; part?: number };
export type DistrictSpec = { cols: number; rows: number; cells: { b: string; rot: number; mir: boolean }[]; mods: [number, number][]; forks?: number[]; seed?: number;
  paint?: Rect[]; seams?: Rect[] };
const colName = (c: number) => String.fromCharCode(65 + c); // A, B, C... (columns), rows 1, 2, 3...
export const cellName = (c: number, r: number) => colName(c) + (r + 1);

// Roll a spec from the shared RNG (call after setSeed): an even grid pick, blocks (never the same as the left or upper
// neighbour), rotation / mirroring, and each modifier slot at MOD_SPAWN_CHANCE.
export function rollSpec(grid?: string): DistrictSpec {
  const G = TUNE.MAP_GRIDS.filter(g => { const [c, r] = g.split('x').map(Number); return c * r >= TUNE.MAP_MIN_BLOCKS; });
  const g = grid || G[Math.floor(rand() * G.length)] || '6x2';
  const [cols, rows] = g.split('x').map(Number), cells = [], mods: [number, number][] = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const left = c > 0 ? cells[r * cols + c - 1].b : '', up = r > 0 ? cells[(r - 1) * cols + c].b : '';
    const ok = BLOCKS.filter(b => b.name !== left && b.name !== up);
    const b = ok[Math.floor(rand() * ok.length)].name;
    const rot = TUNE.MAP_ROTATE ? Math.floor(rand() * 4) : 0, mir = TUNE.MAP_ROTATE ? rand() < 0.5 : false;
    cells.push({ b, rot, mir });
  }
  cells.forEach((cell, i) => blockByName(cell.b).mods.forEach((_, k) => { if (rand() < TUNE.MOD_SPAWN_CHANCE) mods.push([i, k]); }));
  const forks = []; for (let k = 0; k < TUNE.ESCORT_FORKS; k++) forks.push(1 + Math.floor(rand() * (rows - 1)));
  return { cols, rows, cells, mods, forks, seams: rollSeams(cols, rows) };
}
// R16 debrief (Jamie: the streets were a full open grid with long clear sightlines). Every stretch of street between two
// crossings (seam lines between blocks, plus the top, bottom and left map edges; never the extraction) rolls a blocker at
// SEAM_BLOCK_CHANCE, kind by SEAM_BLOCK_KINDS: RUBBLE = clutter across the whole street (2-3 long), BARRICADE = a wall across
// the whole street (1-2 long: the street is shut), CHOKE = a chicane: 2 tiles of wall over one lane, then 2 over the other
// lane one tile further on, so you can weave through but nothing sees straight down the street (on a one-lane edge street
// it's rubble instead). Walls go in only if they cut no street off (buildDistrict checks).
export const lanesRow = (j: number, rows: number) => { const S = TUNE.BLOCK_SIZE; return j === 0 ? [0] : j === rows ? [rows * S - 1] : [j * S - 1, j * S]; };
export const lanesCol = (i: number, cols: number) => { const S = TUNE.BLOCK_SIZE; return i === 0 ? [0] : i === cols ? [cols * S - 1] : [i * S - 1, i * S]; };
function rollSeams(cols: number, rows: number): Rect[] {
  const S = TUNE.BLOCK_SIZE, out: Rect[] = [], K = TUNE.SEAM_BLOCK_KINDS, tot = Object.values(K).reduce((a: number, b: number) => a + b, 0) as number;
  const one = (horiz: boolean, lanes: number[], lo: number, hi: number) => {
    if (rand() >= TUNE.SEAM_BLOCK_CHANCE) return;
    let r = rand() * tot, kind = 'RUBBLE'; for (const k of Object.keys(K)) { r -= K[k]; if (r < 0) { kind = k; break; } }
    if (kind === 'CHOKE' && lanes.length < 2) kind = 'RUBBLE';
    const len = kind === 'RUBBLE' ? 2 + Math.floor(rand() * 2) : kind === 'BARRICADE' ? 1 + Math.floor(rand() * 2) : 5;
    const at = lo + Math.floor(rand() * Math.max(1, hi - lo + 2 - len)), ch = kind === 'RUBBLE' ? ',' : '%';
    const put = (a: number, l: number, ln: number[], part = 0) =>
      out.push(horiz ? { x: a, y: Math.min(...ln), w: l, h: ln.length, ch, kind, part } : { x: Math.min(...ln), y: a, w: ln.length, h: l, ch, kind, part });
    if (kind === 'CHOKE') { const f = rand() < 0.5 ? 0 : 1; put(at, 2, [lanes[f]]); put(at + 3, 2, [lanes[1 - f]], 1); } // part 1 = the chicane's second half
    else put(at, len, lanes);
  };
  const xMax = cols * S - 1 - TUNE.EXTRACT_COLS;
  for (let j = 0; j <= rows; j++) for (let i = 0; i < cols; i++) one(true, lanesRow(j, rows), i * S + 1, Math.min((i + 1) * S - 2, xMax));
  for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) one(false, lanesCol(i, cols), j * S + 1, (j + 1) * S - 2);
  return out;
}

// Build a spec into rows + anchors and load it. Returns false if the mission's tiles aren't all reachable (reroll).
export function buildDistrict(spec: DistrictSpec): boolean {
  const S = TUNE.BLOCK_SIZE, Wd = spec.cols * S, Hd = spec.rows * S;
  const grid = Array.from({ length: Hd }, () => Array(Wd).fill('.'));
  const uplinks = [], zoneSlots = [], pieces = [], counts = { clutter: 0, piece: 0, zone: 0, RUBBLE: 0, BARRICADE: 0, CHOKE: 0 };
  spec.cells.forEach((cell, i) => {
    const c = i % spec.cols, r = Math.floor(i / spec.cols), ox = c * S, oy = r * S, b = blockByName(cell.b);
    const pr = placedRows(b, cell.rot, cell.mir);
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) grid[oy + y][ox + x] = pr[y][x];
    for (const s of b.spots) { const p = tf(s.x, s.y, cell.rot, cell.mir); uplinks.push({ x: ox + p.x, y: oy + p.y, name: s.name + ' ' + cellName(c, r) }); }
  });
  // modifiers that spawned: clutter paints street tiles ','; a set piece is kept only if no street tile loses its way out
  const paint = (rc, ch, from) => { for (let y = rc.y; y < rc.y + rc.h; y++) for (let x = rc.x; x < rc.x + rc.w; x++) if (from.includes(grid[y][x])) grid[y][x] = ch; };
  for (const [i, k] of spec.mods) {
    const cell = spec.cells[i], c = i % spec.cols, r = Math.floor(i / spec.cols), s = blockByName(cell.b).mods[k];
    const rc = tfRect(s, cell.rot, cell.mir); rc.x += c * S; rc.y += r * S;
    if (s.kind === 'clutter') { // a patch on the block's edge spills one tile over into the next block's street ring: rubble across the whole street
      if (rc.x % S === 0 && rc.x > 0) { rc.x--; rc.w++; } if ((rc.x + rc.w) % S === 0 && rc.x + rc.w < Wd) rc.w++;
      if (rc.y % S === 0 && rc.y > 0) { rc.y--; rc.h++; } if ((rc.y + rc.h) % S === 0 && rc.y + rc.h < Hd) rc.h++;
      paint(rc, ',', '.'); counts.clutter++;
    }
    if (s.kind === 'zone') { zoneSlots.push({ x: rc.x, y: rc.y, name: s.name + ' (' + cellName(c, r) + ')' }); counts.zone++; }
    if (s.kind === 'piece') pieces.push({ rc, name: s.name });
  }
  // a wall (set piece, barricade, choke) goes in only if no street tile loses its way out
  const wall = (rc) => {
    const before = openReach(grid), keep = grid.map(row => row.slice());
    paint(rc, '%', '.,');
    if (openReach(grid) < before - countIn(keep, rc)) { for (let y = 0; y < Hd; y++) grid[y] = keep[y]; return false; }
    return true;
  };
  for (const b of spec.seams || []) { if (b.ch === ',') { paint(b, ',', '.'); counts.RUBBLE++; } else if (wall(b) && !b.part) counts[b.kind]++; }
  for (const p of pieces) if (wall(p.rc)) counts.piece++;
  for (const p of spec.paint || []) { paint(p, p.ch, '.,#%'); if (p.ch === ',') counts.clutter++; }
  const rows = grid.map(r => r.join('')), names = spec.cells.map(c => c.b);
  const anchors: any = { uplinks: uplinks.filter(u => rows[u.y][u.x] !== '#' && rows[u.y][u.x] !== '%'), cargo: [], zoneSlots, waypoints: {}, legs: [], junctions: [], escortSite: '' };
  loadMap({ id: 'blocks', rows, anchors, info: { grid: spec.cols + 'x' + spec.rows, w: Wd, h: Hd, blocks: names, counts, seed: spec.seed ?? 0, rerolls: 0 } });
  if (!escortRoute(spec, anchors)) return false;
  // the mission's tiles: every uplink / cargo spot, every route node, and the right edge
  if (!anchors.uplinks.length || anchors.uplinks.some(u => !canReach(u.x, u.y))) return false;
  if (Object.values(anchors.waypoints).some((n: any) => !canReach(n.x, n.y))) return false;
  let out = false; for (let y = 0; y < Hd && !out; y++) out = canReach(Wd - 1, y);
  return out;
}
// open tiles reachable from the left edge, mid-height (the spawn) on a char grid (4-way)
function openReach(g: string[][]) {
  const H = g.length, W = g[0].length, seen = new Uint8Array(W * H), open = (x, y) => x >= 0 && y >= 0 && x < W && y < H && g[y][x] !== '#' && g[y][x] !== '%';
  let sy = H >> 1; if (!open(0, sy)) return 0;
  const q = [sy * W]; seen[q[0]] = 1; let n = 0;
  while (q.length) { const i = q.pop(), x = i % W, y = (i / W) | 0; n++; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (open(nx, ny) && !seen[ny * W + nx]) { seen[ny * W + nx] = 1; q.push(ny * W + nx); } } }
  return n;
}
function countIn(g: string[][], rc) { let n = 0; for (let y = rc.y; y < rc.y + rc.h; y++) for (let x = rc.x; x < rc.x + rc.w; x++) if (g[y][x] !== '#' && g[y][x] !== '%') n++; return n; }

// ---- the Escort route, on the street network as it is (R16 debrief) ----
// Seam lines run between blocks and along the map edges: row lines j = 0..rows (y = 0, S, 2S, ..., H-1) and column lines
// i = 0..cols (x = 0, S, ..., W-1). A stretch between two crossings is open unless blockers shut it (a 4-way walk along its
// lanes). Fork k sits on column line a_k (spread evenly) and a seam row r_k. From each fork up to three legs go on:
// NORTH (one row line up), AHEAD (its own row line), SOUTH (one row line down): along that row to the next fork's column,
// then along that column to the next fork (the last forks run out the right edge on their own row). A leg is offered only
// if every stretch it uses is open; every fork needs at least 2. Fork rows are searched from the rolled ones; none = reroll.
function escortRoute(spec: DistrictSpec, A): boolean {
  const S = TUNE.BLOCK_SIZE, C = spec.cols, R = spec.rows, Wd = C * S, Hd = R * S;
  const rowY = (j: number) => Math.min(Hd - 1, j * S), colX = (i: number) => Math.min(Wd - 1, i * S);
  // is the stretch open? horizontal: on row line j between column lines k, k+1; vertical: on column line i between rows k, k+1
  const stretch = (horiz: boolean, line: number, k: number) => {
    const lanes = horiz ? lanesRow(line, R) : lanesCol(line, C), a = horiz ? colX(k) : rowY(k), b = horiz ? colX(k + 1) : rowY(k + 1);
    const at = (t: number, l: number) => horiz ? [t, l] : [l, t], seen = new Set<string>(), q: number[][] = [];
    for (const l of lanes) { const [x, y] = at(a, l); if (!isSolid(x, y)) { q.push([a, l]); seen.add(a + ',' + l); } }
    while (q.length) {
      const [t, l] = q.pop(); if (t === b) return true;
      for (const [dt, dl] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nt = t + dt, nl = l + dl; if (nt < a || nt > b || !lanes.includes(nl) || seen.has(nt + ',' + nl)) continue;
        const [x, y] = at(nt, nl); if (isSolid(x, y)) continue; seen.add(nt + ',' + nl); q.push([nt, nl]);
      }
    }
    return false;
  };
  const alongRow = (j: number, i0: number, i1: number) => { for (let k = i0; k < i1; k++) if (!stretch(true, j, k)) return false; return true; };
  const alongCol = (i: number, j0: number, j1: number) => { for (let k = Math.min(j0, j1); k < Math.max(j0, j1); k++) if (!stretch(false, i, k)) return false; return true; };
  const n = Math.max(1, Math.min(TUNE.ESCORT_FORKS, C - 1));
  const cols: number[] = [];
  for (let k = 0; k < n; k++) cols.push(Math.max(cols.length ? cols[k - 1] + 1 : 1, Math.min(C - 1 - (n - 1 - k), Math.round((k + 1) * C / (n + 1)))));
  // the legs from fork k (on row r) toward the next fork's column (on row rNext), or out the right edge (rNext = -1)
  const legsAt = (k: number, r: number, rNext: number) => {
    const t = k + 1 < n ? cols[k + 1] : C, out = [];
    for (const [q, name] of [[r - 1, 'NORTH'], [r, 'AHEAD'], [r + 1, 'SOUTH']] as [number, string][]) {
      if (q < 0 || q > R) continue;
      if (!alongCol(cols[k], r, q) || !alongRow(q, cols[k], t) || (rNext >= 0 && !alongCol(t, q, rNext))) continue;
      out.push({ q, name });
    }
    return out;
  };
  // fork rows: the rolled ones first, then every other combination (n <= 2 forks: at most 9 tries on a 4-row grid)
  const pref = (k: number) => Math.max(1, Math.min(R - 1, (spec.forks || [])[k] ?? Math.ceil(R / 2)));
  const rowsFor = (k: number) => { const all = []; for (let r = 1; r < R; r++) all.push(r); return [pref(k), ...all.filter(r => r !== pref(k))]; };
  let pick: number[] = null;
  const tryRows = (k: number, acc: number[]) => {
    if (pick) return;
    if (k === n) {
      if (!alongRow(acc[0], 0, cols[0])) return;
      for (let f = 0; f < n; f++) if (legsAt(f, acc[f], f + 1 < n ? acc[f + 1] : -1).length < 2) return;
      pick = acc.slice(); return;
    }
    for (const r of rowsFor(k)) tryRows(k + 1, [...acc, r]);
  };
  tryRows(0, []);
  if (!pick) return false;
  const wp: any = {}, legs = [];
  wp.S = { x: 0, y: rowY(pick[0]), name: 'west edge' };
  for (let k = 0; k < n; k++) wp['J' + (k + 1)] = { x: colX(cols[k]), y: rowY(pick[k]), name: 'fork at ' + cellName(cols[k], pick[k]) };
  legs.push({ from: 'S', to: 'J1', via: [] });
  for (let k = 0; k < n; k++) {
    const J = wp['J' + (k + 1)], last = k + 1 === n;
    for (const L of legsAt(k, pick[k], last ? -1 : pick[k + 1])) {
      let to = 'J' + (k + 2);
      if (last) { to = L.name === 'AHEAD' ? 'X' : 'X' + L.name[0]; wp[to] = { x: Wd - 1, y: rowY(L.q), name: 'east edge' }; }
      legs.push({ from: 'J' + (k + 1), to, via: [[J.x, rowY(L.q)], [last ? Wd - 1 : colX(cols[k + 1]), rowY(L.q)]], name: L.name });
    }
  }
  A.waypoints = wp; A.legs = legs; A.junctions = cols.map((_, k) => 'J' + (k + 1)); A.escortSite = 'J' + n;
  return true;
}

// A district that failed (usually: barricades left a fork with fewer than 2 open legs) is first rescued by clearing its
// barricades to rubble one at a time (last rolled first), so the street keeps a blocker; only if that fails is it rerolled.
function relax(spec: DistrictSpec) {
  const bars = (spec.seams || []).filter(b => b.kind === 'BARRICADE').reverse();
  for (const b of bars) { b.kind = 'RUBBLE'; b.ch = ','; if (buildDistrict(spec)) return true; }
  return false;
}
// Roll and load this hunt's district from the shared RNG (rollEnemy calls it right after setSeed). A district whose
// mission tiles can't all be reached is rerolled (fresh draws), up to MAP_REROLL_MAX times; the count is logged.
export function rollDistrict(seed: number, grid?: string, escort = true) {
  if (TUNE.MAP_LAYOUT === 'packed') { const k = rollPacked(seed, grid, escort); MAP.info.rerolls = k; return null; } // R16 debrief 2
  let spec: DistrictSpec, k = 0;
  for (; k < TUNE.MAP_REROLL_MAX; k++) { spec = rollSpec(grid); spec.seed = seed; if (buildDistrict(spec) || relax(spec)) break; }
  MAP.info.rerolls = k;
  return spec;
}
// "MAP 4x3 seed 1234 · blocks: plaza, alleys, … · mods: 3 clutter, 1 set piece, 2 zones" (zones = the ones rolled in)
export function mapText(zones?: number) {
  const I = MAP.info; if (MAP.id === 'hive') return 'MAP hive';
  const parts = I.layout === 'packed' ? ' · pieces: ' + Object.entries(I.counts.shapes).map(([k, v]) => k + '×' + v).join(', ') + (I.blocks.length ? ' (blocks: ' + I.blocks.join(', ') + ')' : '') : ' · blocks: ' + I.blocks.join(', ');
  return 'MAP ' + I.grid + ' seed ' + I.seed + parts + ' · mods: ' + I.counts.clutter + ' clutter, ' + I.counts.piece + ' set piece' + (I.counts.piece === 1 ? '' : 's') + ', ' + (zones ?? I.counts.zone) + ' zone' + ((zones ?? I.counts.zone) === 1 ? '' : 's') + ' · streets: ' + I.counts.RUBBLE + ' rubble, ' + I.counts.BARRICADE + ' shut, ' + I.counts.CHOKE + ' choked' + (I.rerolls ? ' · rerolls ' + I.rerolls : '');
}
// for tests / DBG: a leg's walk exists between every pair of route nodes
export function routeOk() { return MAP.anchors.legs.every(l => { const a = MAP.anchors.waypoints[l.from], b = MAP.anchors.waypoints[l.to]; return !!findPath((a.x + 0.5) * T, (a.y + 0.5) * T, (b.x + 0.5) * T, (b.y + 0.5) * T); }); }
