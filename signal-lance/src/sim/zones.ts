// Round 10: signal terrain. Rolled QUIET / NOISE zones. A zone changes how a unit standing in it is
// SEEN (never its own sensors), on both sides, under identical rules.
import { TUNE } from '../tune.ts';
import { W, H, N, T, canReach, MAP, anchors } from './world.ts';
import { rand } from './rng.ts';
import { G } from './state.ts';
import { dropPts } from './scan.ts';

// G.zones: [{ x, y (tile centre), name, type 'QUIET'|'NOISE', tiles: [{x,y}] }]; G.zmap[tile] = zone index + 1 (0 = none)
export let zmap = new Uint8Array(N);
function resetZmap() { if (zmap.length < N) zmap = new Uint8Array(N); zmap.fill(0); } // R16: maps change size

export function zoneTiles(cxT, cyT) {
  const R = TUNE.ZONE_RADIUS, out = [];
  for (let y = cyT - R; y <= cyT + R; y++) for (let x = cxT - R; x <= cxT + R; x++) {
    if (Math.hypot(x - cxT, y - cyT) > R || !canReach(x, y) || x >= W - TUNE.EXTRACT_COLS) continue;
    if (dropPts().some(d => Math.hypot(x - d.x, y - d.y) <= TUNE.ZONE_SPAWN_CLEAR)) continue; // R19: clear of every drop zone
    out.push({ x, y });
  }
  return out;
}
function overlaps(a, b) { const s = new Set(a.map(t => t.y * W + t.x)); return b.some(t => s.has(t.y * W + t.x)); }

// Called from rollEnemy, after the uplink and composition are rolled (seeded).
// R16: on a block map the candidates are the zone slots that spawned this hunt, and the counts scale with the map's area.
export function areaScale() { return W * H / TUNE.FIELD_BASE_AREA; }
export function rollZones() {
  resetZmap();
  const blocks = MAP.id !== 'hive', src = blocks ? anchors().zoneSlots : TUNE.ZONE_CANDIDATES;
  const cands = src.map(c => ({ ...c, tiles: zoneTiles(c.x, c.y) })).filter(c => c.tiles.length);
  for (let i = cands.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [cands[i], cands[j]] = [cands[j], cands[i]]; }
  const ux = G.up.x / T - 0.5, uy = G.up.y / T - 0.5;
  const k = blocks && TUNE.ZONE_SCALE_BY_AREA ? Math.max(1, areaScale()) : 1;
  const nMin = Math.round(TUNE.ZONE_COUNT_MIN * k), nMax = Math.round(TUNE.ZONE_COUNT_MAX * k);
  const n = nMin + Math.floor(rand() * (nMax - nMin + 1));
  const picked = [];
  // first: one near the uplink (guaranteed when a candidate qualifies)
  const near = cands.find(c => Math.hypot(c.x - ux, c.y - uy) <= TUNE.ZONE_UPLINK_NEAR);
  if (near) picked.push(near);
  for (const c of cands) { if (picked.length >= n) break; if (!picked.includes(c) && !picked.some(p => overlaps(p.tiles, c.tiles))) picked.push(c); }
  // types: at least one QUIET and one NOISE, the rest random
  const types = picked.map(() => (rand() < 0.5 ? 'QUIET' : 'NOISE'));
  if (picked.length >= 2) {
    const a = Math.floor(rand() * picked.length), b = (a + 1 + Math.floor(rand() * (picked.length - 1))) % picked.length;
    types[a] = 'QUIET'; types[b] = 'NOISE';
  }
  G.zones = picked.map((c, i) => ({ x: c.x, y: c.y, name: c.name, type: types[i], tiles: c.tiles }));
  G.zones.forEach((z, i) => { for (const t of z.tiles) zmap[t.y * W + t.x] = i + 1; });
}
// R14 test bed: hand-placed zones instead of the roll. list = [{ type 'QUIET'|'NOISE', x, y (centre tile), name? }].
export function setZones(list) {
  resetZmap();
  G.zones = list.map(z => ({ x: z.x, y: z.y, name: z.name || z.type.toLowerCase(), type: z.type, tiles: zoneTiles(z.x, z.y) }));
  G.zones.forEach((z, i) => { for (const t of z.tiles) zmap[t.y * W + t.x] = i + 1; });
}
// The zone a world point (or unit) is in, or null.
export function zoneAtTile(tx, ty) { if (tx < 0 || ty < 0 || tx >= W || ty >= H) return null; const k = zmap[ty * W + tx]; return k ? G.zones[k - 1] : null; }
export function zoneOf(m) { return m ? zoneAtTile(Math.floor(m.x / T), Math.floor(m.y / T)) : null; }
export function zoneType(m) { const z = zoneOf(m); return z ? z.type : ''; }
// QUIET: the Signal others read off this unit (its own bar keeps the true value).
export function effEmit(m) { return (m.emit || 0) * (zoneType(m) === 'QUIET' ? TUNE.ZONE_TYPES.QUIET.SIG_MULT : 1); }
// NOISE: uncertainty of any non-eyes fix on this unit (world units in → world units out).
export function noiseUnc(m, u) { const Z = TUNE.ZONE_TYPES.NOISE; return zoneType(m) === 'NOISE' ? Math.max(u * Z.UNC_MULT, Z.UNC_FLOOR * T) : u; }
