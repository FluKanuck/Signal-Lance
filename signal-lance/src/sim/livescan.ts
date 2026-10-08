// Round 20: eyes from the ship. The live scan (TUNE.SCAN_MODE 'active'; the R19 dial is 'dial', see scan.ts).
// Between the job pick and the drop the ship is on station. Its clock runs while you let it (START / PAUSE), with no cap.
// Three sensors, any mix on at once (R20 fix list 1), each with its own aim ring or FULL MAP:
//   RADAR   (active)  WHERE: every unit as an unknown ping, zone outlines, ground clutter, which drop zones are clear. Fast.
//   THERMAL (passive) WHAT'S ALIVE: zone types (NOISE hot, QUIET cold); hot units as a heat blob, then a size class. Medium.
//   EM      (passive) WHO: emitters only: counted (band 1), then a bearing fix with the CARD's best guess that firms up. Slow.
// Every unit, zone and drop zone gathers dwell per sensor = Σ speed × aim strength at its spot × tick. Dwell crosses the
// sensor's SCAN_BANDS to reveal its layer. Patrols walk while the clock runs, so a fix gets older the longer you look away.
// R20 fix list 3 / cp2: one risk meter: sensors that are on add their loudness, none on = it cools. Crossing a step may call a
// unit in; the step you drop at sets who is awake and whether the ship is painted (scan.ts). Waiting isn't free: patrols
// walk, units sometimes arrive, and a job with a deadline (fix list 4) ends the scan when its window closes.
// The view only sends commands (scanCmd); the sim steps the clock (scanStep) in fixed SCAN_TICK steps. A scan replays
// exactly from the job's seed and its command list (replayScan), so PLAY SEED and the tests can rebuild it.
import { TUNE } from '../tune.ts';
import { rollTap } from './rng.ts';
import { shipScan } from './company.ts';
import { W, H, T, canReach } from './world.ts';
import { G, makeUnit } from './state.ts';
import { matchVariants } from './ids.ts';
import { irOf, has } from './kit.ts';
import { zoneAtTile } from './zones.ts';

export const SENSORS = ['RADAR', 'THERMAL', 'EM'] as const;
export type Sensor = typeof SENSORS[number];
// [tick, op, ...args]: 'R' / 'T' / 'E' (1 on, 0 off), 'W' full map (sensor index, 1 / 0), 'a' aim (x, y, sensor index),
// 'G' run the clock, 'S' pause it, 'H' altitude (0 HIGH, 1 MID, 2 LOW: R20 fix list 5)
export type Cmd = [number, string, ...number[]];
export const ALTS = ['HIGH', 'MID', 'LOW'];
export const altOf = (S) => TUNE.SCAN_ALT[S.alt || 'MID'];

// The scan's own RNG: state kept in the scan, so stepping it never moves the hunt's seeded rolls and a replay matches.
function rnd(S) { let t = (S.rs = (S.rs + 0x6D2B79F5) >>> 0); t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); const v = ((t ^ (t >>> 14)) >>> 0) / 4294967296; if (rollTap.fn) rollTap.fn('scan', v); return v; }
const tileOf = (u) => ({ x: Math.floor(u.x / T), y: Math.floor(u.y / T) });

export function emitter(u) { return (u.comms || 0) > 0 || has(u, 'RADAR'); }
export function hot(u) { return irOf(u) >= TUNE.SCAN_HOT_IR; }

// R20 fix list 4: the job's window in ship-minutes (0 = none). Seeded on the job alone, so the job card can say it first.
export function jobDeadline(seed: number, mtype: string) {
  const S = { rs: (seed ^ 0xDEAD1 ^ mtype.length * 977) >>> 0 }, [a, b] = TUNE.SCAN_DEADLINE_MIN;
  return rnd(S) < TUNE.SCAN_DEADLINE_CHANCE ? a + Math.floor(rnd(S) * (b - a + 1)) : 0;
}

// ============================ SETUP ===================================
// The live part of a fresh scan (freshScan, scan.ts). Units, zones and drop zones as they stand when the ship arrives.
export function liveInit(S, drops: { x: number; y: number }[]) {
  const mid = { x: Math.floor(W / 2), y: Math.floor(H / 2) };
  Object.assign(S, { mode: 'active', rs: (S.seed ^ 0x20A5C) >>> 0, tick: 0, t: 0, run: false,
    on: { RADAR: true, THERMAL: false, EM: false }, wide: { RADAR: false, THERMAL: false, EM: false },
    aims: { RADAR: { ...mid }, THERMAL: { ...mid }, EM: { ...mid } }, cmds: [] as Cmd[], u: {}, z: G.zones.map(() => ({ RADAR: 0, THERMAL: 0 })),
    dr: drops.map(() => 0), cov: { RADAR: new Array(W * H).fill(0), THERMAL: new Array(W * H).fill(0), EM: new Array(W * H).fill(0) },
    alt: 'MID', risk: 0, radarRisk: 0, peak: 0, log: [] as any[], cur: null, adds: [] as any[], deadline: jobDeadline(S.seed, S.mtype), over: false });
  for (const u of G.units) track(S, u);
}
// R23: a LIKED faction's intel: sensor s at band 1 on everything it can sense (units, and for RADAR the zones and drop aprons),
// as if the ship had already looked, at no risk. A unit gets the fix that band gives (EM band 1: counted, no fix).
export function liveGift(S, s: Sensor) {
  const b1 = TUNE.SCAN_BANDS[s][0];
  for (const u of G.units) {
    const R = S.u[u.id]; if (!R || !senses(s, u) || u.dead) continue;
    R.d[s] = Math.max(R.d[s], b1);
    const unc = fixUnc(S, u, s) * altOf(S).UNC, p = posOf(S, u);
    if (unc > 0 && (!R.fix || unc < R.fix.unc)) R.fix = { x: p.x, y: p.y, t: 0, unc, by: s };
  }
  if (s !== 'EM') S.z.forEach(z => { z[s] = Math.max(z[s], b1); });
  if (s === 'RADAR') S.dr = S.dr.map((v: number) => Math.max(v, b1));
}
function track(S, u) {
  const t = tileOf(u), a = rnd(S) * 6.2832, f = 0.7 * Math.sqrt(rnd(S)); // the fix's fixed offset (direction, share of its fuzz): no flicker
  S.u[u.id] = { d: { RADAR: 0, THERMAL: 0, EM: 0 }, fix: null, off: { x: Math.cos(a) * f, y: Math.sin(a) * f }, pick: rnd(S),
    walk: u.mobile ? { x: t.x, y: t.y, hx: t.x, hy: t.y, path: [] as { x: number; y: number }[], acc: 0, steps: 0 } : null };
}

// ============================ COMMANDS ================================
// The view's only way in. Recorded with the tick they happen on (replayScan plays them back).
export function scanCmd(op: string, ...args: number[]) {
  const S = G.scan; if (!S || S.mode !== 'active') return;
  if (op === 'a') { args = [Math.max(0, Math.min(W - 1, Math.round(args[0]))), Math.max(0, Math.min(H - 1, Math.round(args[1]))), args[2] | 0]; const A = S.aims[SENSORS[args[2]]]; if (!A || (A.x === args[0] && A.y === args[1])) return; }
  if (op === 'G' && (S.run || S.over)) return;
  if (op === 'H' && S.alt === ALTS[args[0]]) return;
  if (op === 'S' && !S.run) return;
  const last = S.cmds[S.cmds.length - 1];
  if (op === 'a' && last && last[0] === S.tick && last[1] === 'a' && last[4] === args[2]) S.cmds.pop(); // a drag: one aim per tick is enough
  S.cmds.push([S.tick, op, ...args]);
  apply(S, op, args);
}
function apply(S, op: string, a: number[]) {
  if (op === 'R' || op === 'T' || op === 'E') S.on[SENSORS['RTE'.indexOf(op)]] = !!a[0];
  else if (op === 'W') S.wide[SENSORS[a[0]]] = !!a[1];
  else if (op === 'G') { S.run = true; S.stopTick = undefined; } else if (op === 'S') { S.run = false; S.stopTick = S.tick; closeStretch(S); } // R25 fix 5: where it paused
  else if (op === 'a') S.aims[SENSORS[a[2]]] = { x: a[0], y: a[1] };
  else if (op === 'H') S.alt = ALTS[a[0]] || 'MID';
}
// Rebuild the scan from its commands (the job's world must be rolled already: rollEnemy → freshScan).
export function replayScan(cmds: Cmd[]) {
  const S = G.scan; if (!S || S.mode !== 'active') return;
  for (const [k, op, ...a] of cmds) {
    while (S.tick < k && S.run) scanStep();
    if (op === 'S' && !S.run) continue; // the clock stopped itself (a deadline) on this tick
    S.cmds.push([k, op, ...a]); apply(S, op, a);
  }
}
// The command list as one log word ("0G_3a20.9.0_3E1_40S") and back.
export function encodeCmds(cmds: Cmd[]) { return cmds.map(c => c[0] + c[1] + c.slice(2).join('.')).join('_') || '-'; }
export function decodeCmds(s: string): Cmd[] {
  const out: Cmd[] = [];
  for (const w of (s || '').split('_')) { const m = /^(\d+)([RTEWGSaH])((?:\d+)(?:\.\d+)*)?$/.exec(w); if (m) out.push([+m[1], m[2], ...(m[3] ? m[3].split('.').map(Number) : [])]); }
  return out;
}

// ============================ THE CLOCK ===============================
// Sensor s's aim strength at tile (x, y): FULL MAP = flat SCAN_WIDE_STRENGTH; else 1 inside SCAN_AIM_CORE of its ring,
// 0 at SCAN_AIM_EDGE, linear between. Distances from tile centre to the ring's tile centre.
export function aimStrength(S, x: number, y: number, s: Sensor = 'RADAR') {
  if (S.wide[s]) return TUNE.SCAN_WIDE_STRENGTH;
  const A = S.aims[s], d = Math.hypot(x - A.x, y - A.y), c = ringCore(S), e = ringEdge(S);
  return d <= c ? 1 : d >= e ? 0 : 1 - (d - c) / (e - c);
}
// R20 fix list 5: the ring's radii at the ship's altitude (tiles)
export const ringCore = (S) => TUNE.SCAN_AIM_CORE * altOf(S).RING;
export const ringEdge = (S) => TUNE.SCAN_AIM_EDGE * altOf(S).RING;
export function band(_S, sensor: Sensor, dwell: number) { const B = TUNE.SCAN_BANDS[sensor]; let n = 0; while (n < 3 && dwell >= B[n] - 1e-9) n++; return n; }
// Where unit u is right now (a patrol's scan-time walk, else where it stands), in tiles
export function posOf(S, u) { const w = S.u[u.id]?.walk; return w ? { x: w.x, y: w.y } : tileOf(u); }
// What sensor s can sense of unit u at all (its own layer only)
export function senses(s: Sensor, u) { return s === 'RADAR' || (s === 'THERMAL' && hot(u)) || (s === 'EM' && emitter(u)); }
export function sensorsOn(S): Sensor[] { return SENSORS.filter(s => S.on[s]); }
// The risk step for meter value r: SCAN_RISK_STEPS, then one more every SCAN_RISK_MORE (no ceiling)
export function riskStep(r: number) {
  const L = TUNE.SCAN_RISK_STEPS, top = L[L.length - 1]; let k = L.filter(x => r >= x - 1e-9).length;
  if (r >= top) k += Math.floor((r - top) / TUNE.SCAN_RISK_MORE + 1e-9);
  return k;
}
export function riskAt(k: number) { const L = TUNE.SCAN_RISK_STEPS; return k <= 0 ? 0 : k <= L.length ? L[k - 1] : L[L.length - 1] + (k - L.length) * TUNE.SCAN_RISK_MORE; }
export const stepVal = (arr: number[], k: number) => arr[Math.min(k, arr.length - 1)] || 0;

// One SCAN_TICK of ship time: patrols walk, every sensor that is on gathers dwell under its ring, the risk meter moves
// (calling units in on a new step), a unit may arrive, and a deadline may end the scan.
export function scanStep() {
  const S = G.scan; if (!S || S.mode !== 'active' || !S.run) return;
  const dt = TUNE.SCAN_TICK, on = sensorsOn(S);
  openStretch(S); // R20 cp3: the scan log
  S.tick++; S.t = S.tick * dt;
  walkAll(S, dt);
  const AL = altOf(S);
  for (const s of on) gather(S, s, TUNE.SCAN_SPEED[s] * AL.SPEED[s] * shipScan(s).speed * dt); // R21 cp4: RADAR ARRAY / THERMAL POD / EM SUITE
  if (on.length) { for (const s of on) S.risk += TUNE.SCAN_LOUD[s] * AL.LOUD * shipScan(s).loud * dt; if (S.on.RADAR) S.radarRisk += TUNE.SCAN_LOUD.RADAR * AL.LOUD * shipScan('RADAR').loud * dt; }
  else S.risk = Math.max(0, S.risk - TUNE.SCAN_COOL * dt);
  if (TUNE.SCAN_COSTS) while (riskStep(S.risk) > S.peak) { S.peak++; if (rnd(S) < stepVal(TUNE.SCAN_RISK_EXTRA, S.peak)) arrive(S, 'called in', true); }
  if (TUNE.SCAN_COSTS && rnd(S) < TUNE.SCAN_ARRIVE_PER_MIN * dt) arrive(S, 'arrived', false);
  if (S.deadline && S.t >= S.deadline - 1e-9) { S.run = false; S.over = true; S.stopTick = S.tick; S.cmds.push([S.tick, 'S']); closeStretch(S); }
}

// ============================ THE SCAN LOG (R20 cp3) ==================
// One line per stretch: the clock running with the same set-up (the sensors on, where each looks: FULL MAP or the map area its
// ring is in, the altitude). A new stretch starts when that set-up changes (dragging a ring inside one area doesn't); a pause
// ends one; resuming unchanged carries it on. Each records its minutes, what came back and the risk it added.
export function areaName(a: { x: number; y: number }) {
  const c = a.x < W / 3 ? 0 : a.x < 2 * W / 3 ? 1 : 2, r = a.y < H / 3 ? 0 : a.y < 2 * H / 3 ? 1 : 2;
  return [['NW', 'N', 'NE'], ['W', 'centre', 'E'], ['SW', 'S', 'SE']][r][c];
}
function setup(S) {
  const on = sensorsOn(S);
  const what = on.length ? on.map(s => s + (S.wide[s] ? ' full map' : ' on ' + areaName(S.aims[s]))).join(' + ') : 'waiting (no sensor on)';
  return { key: on.map(s => s + (S.wide[s] ? '*' : areaName(S.aims[s]))).join('+') + '@' + S.alt, what: what + ' · alt ' + S.alt };
}
function openStretch(S) {
  const k = setup(S);
  if (S.cur && S.cur.key === k.key) return;
  closeStretch(S);
  const last = S.log[S.log.length - 1];
  if (last && last.key === k.key && Math.abs(last.t1 - S.t) < 1e-9) { S.cur = S.log.pop(); return; } // resumed unchanged: carry on
  S.cur = { ...k, t0: S.t, r0: S.risk, a0: S.adds.length, m0: liveSummary(S) };
}
function closeStretch(S) {
  const c = S.cur; if (!c) return; S.cur = null;
  if (S.t - c.t0 < 1e-9) return;
  S.log.push({ ...c, t1: S.t, r1: S.risk, a1: S.adds.length, m1: liveSummary(S) });
}
// The log as plain lines (result screen, [SCAN] log lines)
export function stretchText(L) {
  const d = (k: string, w: string) => { const n = L.m1[k] - L.m0[k]; return n > 0 ? '+' + n + ' ' + w + (n > 1 && !/s$/.test(w) ? 's' : '') : ''; };
  const got = [d('pings', 'ping'), d('heat', 'heat blob'), d('fixed', 'EM fix'), d('heard', 'emitter'), d('zones', 'zone outline'), d('typed', 'zone type'), d('drops', 'drop zone')].filter(Boolean);
  const dr = L.r1 - L.r0, called = L.a1 - L.a0, m = Math.round((L.t1 - L.t0) * 4) / 4;
  return m + ' min ' + L.what + ': ' + (got.length ? got.join(', ') : 'nothing new') + ' · risk ' + (dr >= 0 ? '+' : '') + dr.toFixed(1) + (called ? ' (' + called + ' unit' + (called > 1 ? 's' : '') + ' joined)' : '');
}
export function scanLog(S) { closeStretch(S); return (S.log || []).map(stretchText); }
function gather(S, s: Sensor, k: number) {
  const cov = S.cov[s];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const a = aimStrength(S, x, y, s); if (a > 0) cov[y * W + x] += k * a; }
  for (const u of G.units) {
    if (!senses(s, u) || u.dead) continue;
    const R = S.u[u.id]; if (!R) continue;
    const p = posOf(S, u), a = aimStrength(S, p.x, p.y, s); if (a <= 0) continue;
    R.d[s] += k * a;
    const unc = fixUnc(S, u, s) * altOf(S).UNC; if (unc <= 0) continue; // this sensor gives no position yet (EM below band 2)
    if (!R.fix || u.mobile || unc <= R.fix.unc + 1e-9) R.fix = { x: p.x, y: p.y, t: S.t, unc, by: s }; // a patrol: the latest look; a static: the best
  }
  if (s !== 'EM') G.zones.forEach((z, i) => { const a = aimStrength(S, z.x, z.y, s); if (a > 0) S.z[i][s] += k * a; });
  if (s === 'RADAR') (G.drops || []).forEach((d, i) => { const a = aimStrength(S, d.x, d.y, s); if (a > 0 && i < S.dr.length) S.dr[i] += k * a; });
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

// ============================ NEW UNITS ===============================
// A unit joins the field during the scan: 'called in' by a new risk step (any variant), or 'arrived' with time (a patrol).
// It lands on a free street tile away from every drop zone. Kept in S.adds, so the field rolled again for the drop (takeJob)
// gets it back (liveLand) with the same id.
function arrive(S, why: string, any: boolean) {
  const keys = Object.keys(TUNE.FIELD_VARIANTS).filter(k => any || TUNE.FIELD_VARIANTS[k].TYPE === 'PATROL');
  const vk = keys[Math.floor(rnd(S) * keys.length)];
  for (let k = 0; k < 200; k++) {
    const x = Math.floor(rnd(S) * W), y = Math.floor(rnd(S) * H);
    if (!okTile(x, y) || taken(S, null, x, y)) continue;
    let n = G.units.length; while (G.units.some(u => u.id === 'U' + n)) n++;
    const a = { n, vk, x, y, t: S.t, why }; S.adds.push(a);
    track(S, spawn(a)); return;
  }
}
function spawn(a) {
  const u = makeUnit(TUNE.FIELD_VARIANTS[a.vk].TYPE, a.n, a.vk);
  u.x = u.gx = (a.x + 0.5) * T; u.y = u.gy = (a.y + 0.5) * T; u.zoned = zoneAtTile(a.x, a.y)?.type || ''; u.extra = true; u.arrived = a.why;
  if (has(u, 'RADAR')) u.pulseCD = u.pulseN;
  const dx = G.up.x - u.x, dy = G.up.y - u.y, d = Math.hypot(dx, dy) || 1; u.fx = dx / d; u.fy = dy / d;
  G.units.push(u); return u;
}

// ============================ PATROLS WALK ============================
// Each patrol walks SCAN_DRIFT_PER_MIN tiles a ship-minute along the streets, to goals within SCAN_DRIFT_LEASH of where it
// started, never onto another unit or near a drop zone. Tiles walked = the rate × the time (while it has somewhere to go).
export function walkAll(S, dt: number) {
  for (const u of G.units) {
    const w = S.u[u.id]?.walk; if (!w) continue;
    w.acc += TUNE.SCAN_DRIFT_PER_MIN * dt;
    while (w.acc >= 1 - 1e-9) {
      if (!w.path.length) w.path = goal(S, w);
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
function goal(S, w) {
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
    drops: (G.drops || []).filter((_, i) => dropClear(S, i)).length, risk: S.risk, step: riskStep(S.risk), peak: S.peak, adds: S.adds.length };
}
// At the drop (applyScan): units the scan added come back (the field was rolled again), the patrols walk SCAN_DROP_DELAY
// more and the field lands where the walk left it; every unit the ship has a fix on becomes a stale SHIP contact.
export function liveLand() {
  const S = G.scan; closeStretch(S);
  for (const a of S.adds) if (!G.units.some(u => u.id === 'U' + a.n)) spawn(a);
  const L = { ...S, u: structuredClone(S.u) }; // walked on a copy: landing twice (RETRY) lands the same
  const dt = TUNE.SCAN_TICK; for (let t = 0; t < TUNE.SCAN_DROP_DELAY - 1e-9; t += dt) walkAll(L, dt);
  for (const u of G.units) { const w = L.u[u.id]?.walk; if (w && !u.dead) { u.x = u.gx = (w.x + 0.5) * T; u.y = u.gy = (w.y + 0.5) * T; } }
  const out: any[] = [];
  for (const u of G.units) { const I = unitIntel(S, u); if (I && I.fix) out.push(I); }
  return out;
}
