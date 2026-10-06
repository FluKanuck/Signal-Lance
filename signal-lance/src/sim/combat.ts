// Round 12 step 1: to-hit roll and hit locations. Both sides, same rules.
import { TUNE } from '../tune.ts';
import { T, isSolid, isClutter } from './world.ts';
import { rand } from './rng.ts';
import { G } from './state.ts';
import { effEmit } from './zones.ts';
import { idBonus } from './ids.ts';

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
export function rollPart(u) {
  const L = partList(u.kind), tot = L.reduce((a, p) => a + TUNE.PART_WEIGHTS[p], 0);
  let r = rand() * tot;
  for (const p of L) { r -= TUNE.PART_WEIGHTS[p]; if (r < 0) return p; }
  return 'CORE';
}
// n hits on part p. Hits on a destroyed part spill to CORE. Logs parts destroyed (runner / result).
export function damagePart(u, p: string, n: number) {
  for (let k = 0; k < n && u.parts.CORE > 0; k++) {
    const q = u.parts[p] > 0 ? p : 'CORE';
    u.parts[q]--;
    if (u.parts[q] === 0) { u.partsLost.push(q); G.partLog.push({ kind: u.kind, part: q }); if (q === 'SENSORS') { u.radarOn = false; u.mask = false; } }
  }
  syncHits(u);
}
// Eyes range for a unit: halved once its SENSORS are gone.
export function eyesRange(o) { return TUNE.EYES_RANGE * (partGone(o, 'SENSORS') ? TUNE.PART_SENSORS_EYES_MULT : 1); }

// Per-part damage read, the existing words: ok / scratched / bloodied / badly / gone.
export const PART_ABBR = { CORE: 'COR', LEGS: 'LEG', WEAPON: 'WPN', SENSORS: 'SNS' };
export function partWord(u, p) {
  const f = u.parts[p] / u.pmax[p];
  return f <= 0 ? 'gone' : f <= TUNE.DMG_BADLY ? 'badly' : f <= TUNE.DMG_BLOODIED ? 'bloodied' : f < 1 ? 'scratched' : 'ok';
}
// "COR ok · LEG badly · WPN ok · SNS gone" (works on a unit or on a carry record with parts / pmax)
export function partsRead(u) {
  if (!u.parts) return '';
  return ['CORE', 'LEGS', 'WEAPON', 'SENSORS'].filter(p => u.parts[p] !== undefined).map(p => PART_ABBR[p] + ' ' + partWord(u, p)).join(' · ');
}

// ============================ TO-HIT ==================================
// Distance (tiles) from point (px,py) to the tile square at (ix,iy).
function dRect(px, py, ix, iy) { const dx = Math.max(ix - px, 0, px - (ix + 1)), dy = Math.max(iy - py, 0, py - (iy + 1)); return Math.hypot(dx, dy); }
// Cover: the shot line from (sx,sy) to the target passes closer than COVER_GRAZE to a wall (or R16 clutter) tile that is within
// COVER_RANGE of the target. The last 0.5 tile of the line (the target's own tile) is ignored, so a wall
// just behind the target doesn't count. World coords in.
export function inCover(sx, sy, tx, ty) {
  const ax = sx / T, ay = sy / T, bx = tx / T, by = ty / T, len = Math.hypot(bx - ax, by - ay);
  if (len < 1) return false;
  const R = TUNE.COVER_RANGE, walls = [];
  for (let iy = Math.floor(by - R - 1); iy <= Math.floor(by + R + 1); iy++) for (let ix = Math.floor(bx - R - 1); ix <= Math.floor(bx + R + 1); ix++)
    if ((isSolid(ix, iy) || isClutter(ix, iy)) && dRect(bx, by, ix, iy) <= R) walls.push([ix, iy]); // R16: clutter is low cover
  if (!walls.length) return false;
  const t0 = Math.max(0, 1 - (R + TUNE.COVER_GRAZE + 1) / len), t1 = 1 - 0.5 / len, st = 0.05 / len;
  for (let t = t0; t <= t1; t += st) {
    const px = ax + (bx - ax) * t, py = ay + (by - ay) * t;
    for (const [ix, iy] of walls) if (dRect(px, py, ix, iy) < TUNE.COVER_GRAZE - 1e-6) return true;
  }
  return false;
}
// Hit chance (%) for shooter on target unit, aimed at contact c's fix centre. Returns the parts of the sum too.
export function hitChance(sh, tgt, c) {
  const rangeT = Math.hypot(c.tx - sh.x, c.ty - sh.y) / T;
  const sig = TUNE.HIT_SIG_MAX * effEmit(tgt) / TUNE.SIGNAL_MAX;
  const range = -TUNE.HIT_RANGE_PER_TILE * Math.max(0, rangeT - TUNE.HIT_RANGE_FREE);
  const moved = -Math.min(TUNE.HIT_MOVED_MAX, TUNE.HIT_MOVED_PER_TILE * (tgt.movedT || 0));
  const cover = inCover(sh.x, sh.y, tgt.x, tgt.y) ? -TUNE.HIT_COVER : 0;
  const id = G.lance.includes(sh) ? idBonus(tgt) : 0; // R14: a right call before eyes (the lance only)
  const raw = TUNE.HIT_BASE + sig + range + moved + cover + id;
  const pct = Math.round(Math.max(TUNE.HIT_MIN, Math.min(TUNE.HIT_MAX, raw)));
  return { pct, base: TUNE.HIT_BASE, sig: Math.round(sig), range: Math.round(range), moved: Math.round(moved), cover, id, rangeT, movedT: tgt.movedT || 0 };
}
// "base 75 · sig +6 · range −12 · moved −8 · cover −25" (only the terms that apply, base always)
export function hitText(h) {
  const f = (k, v) => v ? ' · ' + k + ' ' + (v > 0 ? '+' : '−') + Math.abs(v) : '';
  return 'base ' + h.base + f('sig', h.sig) + f('range', h.range) + f('moved', h.moved) + f('cover', h.cover) + f('ID', h.id || 0);
}

// ============================ REPORTING ===============================
// " · shots 9 hit 5 (56%) · A LEG gone, B SNS gone" for this hunt's log line (lance gun shots only; CORE gone = destroyed, shown elsewhere)
export function shotsText() {
  const L = G.shotLog.filter(r => r.mech), h = L.filter(r => r.hit).length;
  const lost = G.lance.flatMap(m => (m.partsLost || []).filter(p => p !== 'CORE').map(p => m.id + ' ' + PART_ABBR[p] + ' gone'));
  return ' · shots ' + L.length + ' hit ' + h + (L.length ? ' (' + Math.round(100 * h / L.length) + '%)' : '') + (lost.length ? ' · ' + lost.join(', ') : '');
}
