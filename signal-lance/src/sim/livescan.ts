// Round 20: eyes from the ship. The live scan (TUNE.SCAN_MODE 'active'; the R19 dial is 'dial', see scan.ts).
// Between the job pick and the drop the ship scans with ONE sensor at a time, aimed with a mark on the map:
//   RADAR   (active)  WHERE: every unit as an unknown ping, zone outlines, ground clutter, which drop zones are clear. Fast.
//   THERMAL (passive) WHAT'S ALIVE: zone types (NOISE hot, QUIET cold); hot units as a heat blob, then a size class. Medium.
//   EM      (passive) WHO: emitters only: counted (band 1), then a bearing fix with the CARD's best guess that firms up. Slow.
// Every unit, zone and drop zone gathers dwell per sensor = Σ speed × aim strength at its spot × tick. Dwell crosses the
// sensor's SCAN_BANDS to reveal its layer. Patrols walk while the clock runs, so a fix gets older the longer you look away.
// The view only sends commands (scanCmd); the sim steps the clock (scanStep) in fixed SCAN_TICK steps. A scan replays
// exactly from the job's seed and its command list (replayScan), so PLAY SEED and the tests can rebuild it.
import { TUNE } from '../tune.ts';
import { W, H, T, canReach } from './world.ts';
import { G } from './state.ts';
import { matchVariants } from './ids.ts';
import { irOf, has } from './kit.ts';

export const SENSORS = ['RADAR', 'THERMAL', 'EM'] as const;
export type Sensor = typeof SENSORS[number];
export type Cmd = [number, string, number?, number?]; // [tick, op, a, b]: op 'R' / 'T' / 'E' sensor, 'W' wide on / 'w' off, 'G' start, 'S' stop, 'a' aim at tile (a, b)

// The scan's own RNG: state kept in the scan, so stepping it never moves the hunt's seeded rolls and a replay matches.
function rnd(S) { let t = (S.rs = (S.rs + 0x6D2B79F5) >>> 0); t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
const tileOf = (u) => ({ x: Math.floor(u.x / T), y: Math.floor(u.y / T) });

export function emitter(u) { return (u.comms || 0) > 0 || has(u, 'RADAR'); }
export function hot(u) { return irOf(u) >= TUNE.SCAN_HOT_IR; }

// ============================ SETUP ===================================
// The live part of a fresh scan (freshScan, scan.ts). Units, zones and drop zones as they stand when the ship arrives.
export function liveInit(S, drops: { x: number; y: number }[]) {
  Object.assign(S, { mode: 'active', rs: (S.seed ^ 0x20A5C) >>> 0, tick: 0, t: 0, run: false, sensor: 'RADAR', wide: false,
    aim: { x: Math.floor(W / 2), y: Math.floor(H / 2) }, cmds: [] as Cmd[], u: {}, z: G.zones.map(() => ({ RADAR: 0, THERMAL: 0 })),
    dr: drops.map(() => 0), cov: { RADAR: new Array(W * H).fill(0), THERMAL: new Array(W * H).fill(0), EM: new Array(W * H).fill(0) } });
  for (const u of G.units) {
    const t = tileOf(u), a = rnd(S) * 6.2832, f = 0.7 * Math.sqrt(rnd(S)); // the fix's fixed offset (direction, share of its fuzz): no flicker
    S.u[u.id] = { d: { RADAR: 0, THERMAL: 0, EM: 0 }, fix: null, off: { x: Math.cos(a) * f, y: Math.sin(a) * f }, pick: rnd(S),
      walk: u.mobile ? { x: t.x, y: t.y, hx: t.x, hy: t.y, path: [] as { x: number; y: number }[], acc: 0, steps: 0 } : null };
  }
}

// ============================ COMMANDS ================================
// The view's only way in. Recorded with the tick they happen on (replayScan plays them back).
export function scanCmd(op: string, a?: number, b?: number) {
  const S = G.scan; if (!S || S.mode !== 'active') return;
  if (op === 'a') { a = Math.max(0, Math.min(W - 1, Math.round(a))); b = Math.max(0, Math.min(H - 1, Math.round(b))); if (S.aim.x === a && S.aim.y === b) return; }
  if (op === 'G' && (S.run || S.t >= TUNE.SCAN_TIME_MAX - 1e-9)) return;
  if (op === 'S' && !S.run) return;
  const last = S.cmds[S.cmds.length - 1];
  if (op === 'a' && last && last[0] === S.tick && last[1] === 'a') S.cmds.pop(); // a drag: one aim per tick is enough
  S.cmds.push(b !== undefined ? [S.tick, op, a, b] : [S.tick, op]);
  apply(S, op, a, b);
}
function apply(S, op: string, a?: number, b?: number) {
  if (op === 'R') S.sensor = 'RADAR'; else if (op === 'T') S.sensor = 'THERMAL'; else if (op === 'E') S.sensor = 'EM';
  else if (op === 'W') S.wide = true; else if (op === 'w') S.wide = false;
  else if (op === 'G') S.run = true; else if (op === 'S') S.run = false;
  else if (op === 'a') S.aim = { x: a, y: b };
}
// Rebuild the scan from its commands (the job's world must be rolled already: rollEnemy → freshScan).
export function replayScan(cmds: Cmd[]) {
  const S = G.scan; if (!S || S.mode !== 'active') return;
  for (const [k, op, a, b] of cmds) {
    while (S.tick < k && S.run) scanStep();
    S.cmds.push(b !== undefined ? [k, op, a, b] : [k, op]); apply(S, op, a, b);
  }
  while (S.run) scanStep();
}
// The command list as one log word ("0R_3a20.9_3G_40S") and back.
export function encodeCmds(cmds: Cmd[]) { return cmds.map(c => c[0] + c[1] + (c[2] !== undefined ? c[2] + '.' + c[3] : '')).join('_') || '-'; }
export function decodeCmds(s: string): Cmd[] {
  const out: Cmd[] = [];
  for (const w of (s || '').split('_')) { const m = /^(\d+)([RTEWwGSa])(?:(\d+)\.(\d+))?$/.exec(w); if (m) out.push(m[3] !== undefined ? [+m[1], m[2], +m[3], +m[4]] : [+m[1], m[2]]); }
  return out;
}

// ============================ THE CLOCK ===============================
// Aim strength at tile (x, y): WIDE = flat SCAN_WIDE_STRENGTH; else 1 inside SCAN_AIM_CORE of the mark, 0 at SCAN_AIM_EDGE,
// linear between. Distances from tile centre to the mark's tile centre.
export function aimStrength(S, x: number, y: number) {
  if (S.wide) return TUNE.SCAN_WIDE_STRENGTH;
  const d = Math.hypot(x - S.aim.x, y - S.aim.y), c = TUNE.SCAN_AIM_CORE, e = TUNE.SCAN_AIM_EDGE;
  return d <= c ? 1 : d >= e ? 0 : 1 - (d - c) / (e - c);
}
export function band(S, sensor: Sensor, dwell: number) { const B = TUNE.SCAN_BANDS[sensor]; let n = 0; while (n < 3 && dwell >= B[n] - 1e-9) n++; return n; }
// Where unit u is right now (a patrol's scan-time walk, else where it stands), in tiles
export function posOf(S, u) { const w = S.u[u.id]?.walk; return w ? { x: w.x, y: w.y } : tileOf(u); }
// What sensor s can sense of unit u at all (its own layer only)
export function senses(s: Sensor, u) { return s === 'RADAR' || (s === 'THERMAL' && hot(u)) || (s === 'EM' && emitter(u)); }

// One SCAN_TICK of ship time: patrols walk, then the running sensor gathers dwell under the aim. Stops itself at SCAN_TIME_MAX.
export function scanStep() {
  const S = G.scan; if (!S || S.mode !== 'active' || !S.run) return;
  const dt = TUNE.SCAN_TICK, s = S.sensor as Sensor, k = TUNE.SCAN_SPEED[s] * dt;
  S.tick++; S.t = S.tick * dt;
  walkAll(S, dt);
  const cov = S.cov[s];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const a = aimStrength(S, x, y); if (a > 0) cov[y * W + x] += k * a; }
  for (const u of G.units) {
    if (!senses(s, u)) continue;
    const R = S.u[u.id]; if (!R) continue;
    const p = posOf(S, u), a = aimStrength(S, p.x, p.y); if (a <= 0) continue;
    R.d[s] += k * a;
    const unc = fixUnc(S, u, s); if (unc <= 0) continue; // this sensor gives no position yet (EM below band 2)
    if (!R.fix || u.mobile || unc <= R.fix.unc + 1e-9) R.fix = { x: p.x, y: p.y, t: S.t, unc, by: s }; // a patrol: the latest look; a static: the best
  }
  G.zones.forEach((z, i) => { const a = aimStrength(S, z.x, z.y); if (a > 0 && s !== 'EM') S.z[i][s] += k * a; });
  if (s === 'RADAR') (G.drops || []).forEach((d, i) => { const a = aimStrength(S, d.x, d.y); if (a > 0 && i < S.dr.length) S.dr[i] += k * a; });
  if (S.t >= TUNE.SCAN_TIME_MAX - 1e-9) { S.run = false; S.cmds.push([S.tick, 'S']); }
}
// Tiles of fuzz on a position from sensor s at its current band (0 = no position)
function fixUnc(S, u, s: Sensor) {
  const R = S.u[u.id], b = band(S, s, R.d[s]);
  if (!b) return 0;
  if (s === 'RADAR') return TUNE.SCAN_PING_UNC[b - 1];
  if (s === 'THERMAL') return TUNE.SCAN_HEAT_UNC[b - 1];
  if (b < 2) return 0; // EM band 1: counted, no fix
  const B = TUNE.SCAN_BANDS.EM, f = Math.max(0, Math.min(1, (R.d.EM - B[1]) / (B[2] - B[1])));
  return TUNE.SCAN_BLIP_UNC + (TUNE.SCAN_BLIP_FLOOR - TUNE.SCAN_BLIP_UNC) * f; // shrinks from band 2 to band 3
}

// ============================ PATROLS WALK ============================
// Each patrol walks SCAN_DRIFT_PER_MIN tiles a ship-minute along the streets, to goals within SCAN_DRIFT_LEASH of where it
// started, never onto another unit or near a drop zone. Tiles walked = the rate × the time (while it has somewhere to go).
export function walkAll(S, dt: number) {
  for (const u of G.units) {
    const w = S.u[u.id]?.walk; if (!w) continue;
    w.acc += TUNE.SCAN_DRIFT_PER_MIN * dt;
    while (w.acc >= 1 - 1e-9) {
      if (!w.path.length) w.path = goal(S, u, w);
      const n = w.path.shift(); if (!n) { w.acc = 0; break; }
      if (taken(S, u, n.x, n.y)) { w.path = []; w.acc = 0; break; } // someone is there: wait, pick another goal next step
      w.x = n.x; w.y = n.y; w.acc -= 1; w.steps++;
    }
  }
}
function taken(S, me, x: number, y: number) { return G.units.some(o => o !== me && !o.dead && (p => p.x === x && p.y === y)(posOf(S, o))); }
function okTile(x: number, y: number) {
  return canReach(x, y) && x < W - TUNE.EXTRACT_COLS && (G.drops || []).every(d => Math.hypot(x - d.x, y - d.y) >= TUNE.UPLINK_MIN_DIST);
}
// a seeded goal within the leash and the 4-way street path to it (empty if none found)
function goal(S, u, w) {
  const L = TUNE.SCAN_DRIFT_LEASH;
  for (let k = 0; k < 30; k++) {
    const x = Math.round(w.hx + (rnd(S) * 2 - 1) * L), y = Math.round(w.hy + (rnd(S) * 2 - 1) * L);
    if ((x === w.x && y === w.y) || Math.hypot(x - w.hx, y - w.hy) > L || !okTile(x, y)) continue;
    const p = bfs(w.x, w.y, x, y); if (p.length) return p;
  }
  return [];
}
function bfs(x0: number, y0: number, x1: number, y1: number) {
  const prev = new Int32Array(W * H).fill(-1), q = [y0 * W + x0]; prev[q[0]] = q[0];
  for (let h = 0; h < q.length; h++) {
    const i = q[h]; if (i === y1 * W + x1) break;
    const x = i % W, y = (i / W) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy, j = ny * W + nx; if (nx >= 0 && ny >= 0 && nx < W && ny < H && prev[j] < 0 && okTile(nx, ny)) { prev[j] = i; q.push(j); } }
  }
  const end = y1 * W + x1; if (prev[end] < 0) return [];
  const out: { x: number; y: number }[] = []; for (let i = end; i !== y0 * W + x0; i = prev[i]) out.push({ x: i % W, y: (i / W) | 0 });
  return out.reverse();
}

// ============================ WHAT THE SHIP KNOWS =====================
// Per unit: its bands per sensor (0 where that sensor can't sense it), and what they add up to.
export function unitIntel(S, u) {
  const R = S.u[u.id]; if (!R) return null;
  const rb = band(S, 'RADAR', R.d.RADAR), tb = hot(u) ? band(S, 'THERMAL', R.d.THERMAL) : 0, eb = emitter(u) ? band(S, 'EM', R.d.EM) : 0;
  const fix = R.fix ? { x: R.fix.x + 0.5 + R.off.x * R.fix.unc, y: R.fix.y + 0.5 + R.off.y * R.fix.unc, unc: R.fix.unc, t: R.fix.t, by: R.fix.by } : null;
  const obs = eb >= 2 ? emObs(u, eb) : null, fits = obs ? matchVariants(obs) : [];
  const guess = fits.length ? fits[Math.floor(R.pick * fits.length)] : '';
  const size = tb >= 2 ? (irOf(u) >= TUNE.SCAN_IR_LARGE ? 'LARGE' : 'MEDIUM') : '';
  return { id: u.id, rb, tb, eb, fix, obs, fits, guess, size, mobile: !!u.mobile };
}
// What EM LISTEN heard of an emitter, in the hunt's trait words (ids.ts): band 2 its radio / radar and whether it moves;
// band 3 also a radar's pulse rhythm and a static's stillness.
function emObs(u, eb: number) {
  const o: any = { emit: [] as string[], pulses: [] as number[], moved: false, acts: 0, step: 0, shot: 0, fired: false, first: 1 };
  if ((u.comms || 0) > 0) o.emit.push('low');
  if (has(u, 'RADAR')) { o.emit.push('high'); if (eb >= 3) o.pulses = [-2 * u.pulseN, -u.pulseN]; }
  if (u.mobile) o.moved = true; else if (eb >= 3) o.acts = TUNE.SCAN_STILL_ACTS;
  return o;
}
// Zone i: 0 nothing, 1 outline (RADAR band 1+), 2 its type too (THERMAL band 1+)
export function zoneLayer(S, i: number) { const z = S.z[i]; if (!z) return 0; return band(S, 'THERMAL', z.THERMAL) ? 2 : band(S, 'RADAR', z.RADAR) ? 1 : 0; }
// Drop zone i is offered once RADAR has looked at its apron (band 1); the west edge (0) always is
export function dropClear(S, i: number) { return i === 0 || band(S, 'RADAR', S.dr[i] || 0) >= 1; }
// The scan in a few numbers (the side panel, the log, the runner)
export function liveSummary(S) {
  const I = G.units.map(u => unitIntel(S, u)).filter(Boolean);
  return { t: S.t, pings: I.filter(i => i.rb).length, heat: I.filter(i => i.tb).length, heard: I.filter(i => i.eb).length,
    fixed: I.filter(i => i.eb >= 2).length, zones: G.zones.filter((_, i) => zoneLayer(S, i) >= 1).length, typed: G.zones.filter((_, i) => zoneLayer(S, i) >= 2).length,
    drops: (G.drops || []).filter((_, i) => dropClear(S, i)).length };
}
// At the drop (applyScan): the patrols walk SCAN_DROP_DELAY more and the field lands where the walk left it; every unit the
// ship has a fix on becomes a stale SHIP contact, with what EM heard as its notes.
export function liveLand() {
  const S = G.scan, L = { ...S, u: structuredClone(S.u) }; // walked on a copy: landing twice (RETRY) lands the same
  const dt = TUNE.SCAN_TICK; for (let t = 0; t < TUNE.SCAN_DROP_DELAY - 1e-9; t += dt) walkAll(L, dt);
  for (const u of G.units) { const w = L.u[u.id]?.walk; if (w && !u.dead) { u.x = u.gx = (w.x + 0.5) * T; u.y = u.gy = (w.y + 0.5) * T; } }
  const out: any[] = [];
  for (const u of G.units) { const I = unitIntel(S, u); if (I && I.fix) out.push(I); }
  return out;
}
