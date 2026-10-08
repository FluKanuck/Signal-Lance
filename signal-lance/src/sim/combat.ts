// Round 12 step 1: to-hit roll and hit locations. Both sides, same rules.
import { TUNE } from '../tune.ts';
import { T, isSolid, isClutter, coverKindAt } from './world.ts';
import { rand } from './rng.ts';
import { G } from './state.ts';
import { effEmit } from './zones.ts';
import { idBonus } from './ids.ts';
import { gunOf, radarOf, has } from './kit.ts';
import { skillVal } from './company.ts';
import { aarPart, aarTouch } from './aar.ts';

// ============================ PARTS ===================================
// u.kind: 'MECH' or a FIELD_TYPES key. u.parts / u.pmax: hits left / at full, per part. u.hits stays the
// total (0 once CORE is gone), so every existing hits check (death, damage read, refit cap) keeps working.
export function partList(kind: string): string[] { return TUNE.PARTS[kind] || TUNE.PARTS.MECH; }
// Split a hit pool across a kind's parts by PART_SHARE: every part gets at least 1, the rest by largest remainder.
export function splitHits(kind: string, total: number) {
  const L = partList(kind), sh = L.map(p => TUNE.PART_SHARE[p] || 0), tot = sh.reduce((a, b) => a + b, 0) || 1;
  const raw = sh.map(s => s / tot * total), out: Record<string, number> = {};
  L.forEach((p, i) => { out[p] = Math.max(1, Math.floor(raw[i])); });
  const extra = L.reduce((a, p) => a + Math.max(0, (TUNE.PART_MIN[p] || 0) - out[p]), 0); // R13: PART_MIN adds hits on top
  L.forEach(p => { out[p] = Math.max(out[p], TUNE.PART_MIN[p] || 0); });
  total += extra;
  let left = total - L.reduce((a, p) => a + out[p], 0);
  const order = L.map((p, i) => ({ p, r: raw[i] - Math.floor(raw[i]) })).sort((a, b) => b.r - a.r);
  for (let k = 0; left > 0; k++, left--) out[order[k % order.length].p]++;
  return out;
}
export function initParts(u, kind: string, total: number) {
  u.kind = kind; u.parts = splitHits(kind, total); u.pmax = { ...u.parts }; u.partsLost = [];
  syncHits(u);
}
export function syncHits(u) {
  let s = 0, m = 0; for (const p of Object.keys(u.pmax)) { s += Math.max(0, u.parts[p]); m += u.pmax[p]; }
  u.maxHits = m; u.hits = u.parts.CORE > 0 ? s : 0;
}
export function hasPart(u, p) { return !!(u.parts && u.parts[p] !== undefined); }
export function partGone(u, p) { return hasPart(u, p) && u.parts[p] <= 0; }
export function partHurt(u, p) { return hasPart(u, p) && u.parts[p] < u.pmax[p]; } // R13: lost at least one hit (one leg)
// Pick a part for a hit by PART_WEIGHTS (only the unit's own parts).
// R18 (A5): from = where the shot came from; outside the target's front arc it rolls BACK in place of WEAPON.
export function rollPart(u, from?: { x: number; y: number }) {
  const rear = !!from && fromBehind(u, from.x, from.y) && hasPart(u, 'BACK');
  const w = (p: string) => rear ? (p === 'BACK' ? TUNE.PART_WEIGHTS.WEAPON : p === 'WEAPON' ? 0 : TUNE.PART_WEIGHTS[p]) : TUNE.PART_WEIGHTS[p] || 0;
  const L = partList(u.kind), tot = L.reduce((a, p) => a + w(p), 0);
  let r = rand() * tot;
  for (const p of L) { r -= w(p); if (r < 0) return p; }
  return 'CORE';
}
// R18 (A5): is (x, y) outside u's front arc (FRONT_ARC_HALF either side of its facing)?
export function fromBehind(u, x: number, y: number) {
  if (!TUNE.REAR_ARC) return false;
  const dx = x - u.x, dy = y - u.y, d = Math.hypot(dx, dy);
  return d > 0 && (dx * u.fx + dy * u.fy) / d < Math.cos(TUNE.FRONT_ARC_HALF * Math.PI / 180);
}
// n hits on part p. Hits on a destroyed part spill to CORE. Logs parts destroyed (runner / result).
export function damagePart(u, p: string, n: number) {
  aarTouch(u); // R22: who hit it last
  for (let k = 0; k < n && u.parts.CORE > 0; k++) {
    const q = u.parts[p] > 0 ? p : 'CORE';
    u.parts[q]--;
    if (u.parts[q] === 0) { aarPart(u, q); u.partsLost.push(q); G.partLog.push({ kind: u.kind, part: q }); if (!radarOf(u)) u.radarOn = false; if (!has(u, 'MASK')) u.mask = false; } // R18: whatever was mounted there goes offline
  }
  syncHits(u);
}
// Eyes range for a unit: halved once its SENSORS are gone.
export function eyesRange(o) { return TUNE.EYES_RANGE * (partGone(o, 'SENSORS') ? TUNE.PART_SENSORS_EYES_MULT : 1); }

// Per-part damage read, the existing words: ok / scratched / bloodied / badly / gone.
export const PART_ABBR = { CORE: 'CORE', LEGS: 'LEGS', WEAPON: 'ARMS', SENSORS: 'MAST', BACK: 'BACK' }; // R24: one name per part = the hangar's location name (was COR / LEG / WPN / SNS / BCK)
export function partWord(u, p) {
  const f = u.parts[p] / u.pmax[p];
  return f <= 0 ? 'gone' : f <= TUNE.DMG_BADLY ? 'badly' : f <= TUNE.DMG_BLOODIED ? 'bloodied' : f < 1 ? 'scratched' : 'ok';
}
// "COR ok · LEG badly · WPN ok · SNS gone" (works on a unit or on a carry record with parts / pmax)
export function partsRead(u) {
  if (!u.parts) return '';
  return ['CORE', 'LEGS', 'WEAPON', 'SENSORS', 'BACK'].filter(p => u.parts[p] !== undefined).map(p => PART_ABBR[p] + ' ' + partWord(u, p)).join(' · ');
}

// ============================ TO-HIT ==================================
// Distance (tiles) from point (px,py) to the tile square at (ix,iy).
function dRect(px, py, ix, iy) { const dx = Math.max(ix - px, 0, px - (ix + 1)), dy = Math.max(iy - py, 0, py - (iy + 1)); return Math.hypot(dx, dy); }
// Cover: the shot line from (sx,sy) to the target passes closer than COVER_GRAZE to a wall (or R16 clutter) tile that is within
// COVER_RANGE of the target. The last 0.5 tile of the line (the target's own tile) is ignored, so a wall
// just behind the target doesn't count. World coords in.
// R17: which kind: 'WALL' (a building or set piece grazed: HIT_COVER) beats 'LOW' (only ground clutter grazed: HIT_COVER_LOW).
export function inCover(sx, sy, tx, ty) { return coverInfo(sx, sy, tx, ty).kind !== ''; }
export function coverKind(sx, sy, tx, ty) { return coverInfo(sx, sy, tx, ty).kind; }
// R17 (parked #18): the cover and where it comes from. give = the piece of cover that counts (the grazed tile's piece, the
// wall one if any), cancelled = pieces the shooter shares with the target (the R16 lean-out rule), each as [ix, iy] tiles.
export function coverInfo(sx, sy, tx, ty): { kind: '' | 'WALL' | 'LOW'; give: number[][]; cancelled: number[][] } {
  const out = { kind: '' as '' | 'WALL' | 'LOW', give: [], cancelled: [] };
  const ax = sx / T, ay = sy / T, bx = tx / T, by = ty / T, len = Math.hypot(bx - ax, by - ay);
  if (len < 1) return out;
  const R = TUNE.COVER_RANGE, walls = [];
  for (let iy = Math.floor(by - R - 1); iy <= Math.floor(by + R + 1); iy++) for (let ix = Math.floor(bx - R - 1); ix <= Math.floor(bx + R + 1); ix++)
    if ((isSolid(ix, iy) || isClutter(ix, iy)) && dRect(bx, by, ix, iy) <= R) walls.push([ix, iy]); // R16: clutter is low cover
  if (!walls.length) return out;
  const t0 = Math.max(0, 1 - (R + TUNE.COVER_GRAZE + 1) / len), t1 = 1 - 0.5 / len, st = 0.05 / len;
  const shared = new Map<number, boolean>(); // per grazed tile: is the shooter up against the same piece of cover?
  let low: number[] = null, wall: number[] = null, gone: number[] = null;
  for (let t = t0; t <= t1 && !wall; t += st) {
    const px = ax + (bx - ax) * t, py = ay + (by - ay) * t;
    for (const [ix, iy] of walls) {
      if (dRect(px, py, ix, iy) >= TUNE.COVER_GRAZE - 1e-6) continue;
      const k = iy * 100000 + ix;
      if (!shared.has(k)) shared.set(k, sameCover(ax, ay, ix, iy));
      if (shared.get(k)) { if (!gone) gone = [ix, iy]; continue; }
      if (isSolid(ix, iy)) { wall = [ix, iy]; break; }
      if (!low) low = [ix, iy];
    }
  }
  const src = wall || low;
  if (src) { out.kind = wall ? 'WALL' : 'LOW'; out.give = coverPiece(src[0], src[1]); }
  if (gone) out.cancelled = coverPiece(gone[0], gone[1]);
  return out;
}
// The piece of cover a tile belongs to: it and every wall / clutter tile joined to it within COVER_ITEM_RADIUS (as sameCover walks it).
// R18 fix list 7 (Jamie: "the grey and brown parts of the terrain are not shared cover"): only tiles of the same kind join a piece.
export function coverPiece(ix: number, iy: number) {
  const R = TUNE.COVER_ITEM_RADIUS, k = coverKindAt(ix, iy), cov = (x, y) => coverKindAt(x, y) === k, seen = new Set<number>([iy * 100000 + ix]), q = [[ix, iy]], out = [[ix, iy]];
  while (q.length) {
    const [x, y] = q.pop();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy, k = ny * 100000 + nx;
      if (seen.has(k) || Math.max(Math.abs(nx - ix), Math.abs(ny - iy)) > R || !cov(nx, ny)) continue;
      seen.add(k); q.push([nx, ny]); out.push([nx, ny]);
    }
  }
  return out;
}
// R16 (Jamie: "if the target is sharing the same cover item as the ExoS the cover doesnt apply … two people on either side
// of the same fence … I couldn't just lean out to shoot"): the cover piece = the grazed tile and every wall / clutter tile
// joined to it within COVER_ITEM_RADIUS; if the shooter (tile coords ax, ay) is within COVER_ADJ of any of it, it gives no cover.
function sameCover(ax: number, ay: number, ix: number, iy: number) { // R18: same kind of cover only
  const R = TUNE.COVER_ITEM_RADIUS, k = coverKindAt(ix, iy), cov = (x, y) => coverKindAt(x, y) === k, seen = new Set<number>([iy * 100000 + ix]), q = [[ix, iy]];
  while (q.length) {
    const [x, y] = q.pop();
    if (dRect(ax, ay, x, y) <= TUNE.COVER_ADJ) return true;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy, k = ny * 100000 + nx;
      if (seen.has(k) || Math.max(Math.abs(nx - ix), Math.abs(ny - iy)) > R || !cov(nx, ny)) continue;
      seen.add(k); q.push([nx, ny]);
    }
  }
  return false;
}
// Hit chance (%) for shooter on target unit, aimed at contact c's fix centre. Returns the parts of the sum too.
export function hitChance(sh, tgt, c) {
  const rangeT = Math.hypot(c.tx - sh.x, c.ty - sh.y) / T;
  const sig = TUNE.HIT_SIG_MAX * effEmit(tgt) / TUNE.SIGNAL_MAX;
  const range = -(gunOf(sh)?.falloff ?? TUNE.HIT_RANGE_PER_TILE) * Math.max(0, rangeT - TUNE.HIT_RANGE_FREE); // R18: a long gun loses less
  const moved = -Math.min(TUNE.HIT_MOVED_MAX, TUNE.HIT_MOVED_PER_TILE * (tgt.movedT || 0));
  const ck = coverKind(sh.x, sh.y, tgt.x, tgt.y), cover = ck === 'WALL' ? -TUNE.HIT_COVER : ck === 'LOW' ? -TUNE.HIT_COVER_LOW : 0; // R17: scrap is low cover
  const id = G.lance.includes(sh) ? idBonus(tgt) : 0; // R14: a right call before eyes (the lance only)
  const base = gunOf(sh)?.hit ?? 0; // R18: the shooter's gun row
  const aim = skillVal(sh, 'AIM') ?? 0; // R21: STEADY AIM (the operator's skill at its level)
  const raw = base + sig + range + moved + cover + id + aim;
  const pct = Math.round(Math.max(TUNE.HIT_MIN, Math.min(TUNE.HIT_MAX, raw)));
  return { pct, base, sig: Math.round(sig), range: Math.round(range), moved: Math.round(moved), cover, coverKind: ck, id, aim, rangeT, movedT: tgt.movedT || 0 };
}
// "base 75 · sig +6 · range −12 · moved −8 · cover −25" (only the terms that apply, base always; R17: "low cover −15" for scrap)
export function hitText(h) {
  const f = (k, v) => v ? ' · ' + k + ' ' + (v > 0 ? '+' : '−') + Math.abs(v) : '';
  return 'base ' + h.base + f('sig', h.sig) + f('range', h.range) + f('moved', h.moved) + f(h.coverKind === 'LOW' ? 'low cover' : 'cover', h.cover) + f('ID', h.id || 0) + f('aim', h.aim || 0);
}

// ============================ REPORTING ===============================
// " · shots 9 hit 5 (56%) · A LEG gone, B SNS gone" for this hunt's log line (lance gun shots only; CORE gone = destroyed, shown elsewhere)
export function shotsText() {
  const L = G.shotLog.filter(r => r.mech), h = L.filter(r => r.hit).length;
  const lost = G.lance.flatMap(m => (m.partsLost || []).filter(p => p !== 'CORE').map(p => m.id + ' ' + PART_ABBR[p] + ' gone'));
  return ' · shots ' + L.length + ' hit ' + h + (L.length ? ' (' + Math.round(100 * h / L.length) + '%)' : '') + (lost.length ? ' · ' + lost.join(', ') : '');
}
