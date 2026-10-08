// R25 "Live toy": live time (TUNE.TIME_MODE 'live', the toy page only). One clock, every unit acts at once, PAUSE any time,
// actions take time, EN refills each second, the gun aims then cools down.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TUNE } from '../src/tune.ts';
import { G } from '../src/sim/state.ts';
import { T } from '../src/sim/world.ts';
import { step, planMove, doMove, cmdMove, cmdTarget, shootBlock, fireRange, cmdObjective, objectiveBlock, endPlayerTurn } from '../src/sim/turns.ts';
import { PLAYER_AP, liveSelect } from '../src/sim/live.ts';
import { startHunt, playHunt } from './helpers.ts';

const DT = 1 / 30;
const run = (s: number) => { for (let t = 0; t < s; t += DT) step(DT); };
let mode: any;
beforeEach(() => { mode = TUNE.TIME_MODE; TUNE.TIME_MODE = 'live'; });
afterEach(() => { TUNE.TIME_MODE = mode; });

describe('live time', () => {
  it('a live hunt opens paused, and PAUSE stops the clock', () => {
    startHunt(3);
    expect(G.live).toBe(true);
    expect(G.paused).toBe(TUNE.LIVE_START_PAUSED);
    G.paused = true; run(2); expect(G.time).toBe(0);
    endPlayerTurn(); expect(G.paused).toBe(false); // the old END TURN is PLAY / PAUSE
    run(1); expect(G.time).toBeGreaterThan(0.9);
  });
  it('a ROUND passes every LIVE_ROUND_SEC of clock', () => {
    startHunt(3); G.paused = false;
    const t0 = G.turn; run(TUNE.LIVE_ROUND_SEC * 2 + 0.1);
    expect(G.turn - t0).toBe(2);
  });
  it('your ExoS have no AP limit, and EN refills each second', () => {
    startHunt(3); G.paused = false;
    const m = G.p; m.en = 0;
    run(1);
    expect(m.ap).toBe(PLAYER_AP);
    expect(m.en).toBeCloseTo(Math.min(m.enMax, (m.regen ?? TUNE.ENERGY_REGEN) / TUNE.LIVE_ROUND_SEC), 0);
  });
  it('two ExoS move at the same time', () => {
    startHunt(3); G.paused = false;
    const [a, b] = G.lance, a0 = { x: a.x, y: a.y }, b0 = { x: b.x, y: b.y };
    for (const m of [a, b]) { liveSelect(m); cmdTarget(m.x + 6 * T, m.y); cmdMove(); }
    run(0.5);
    expect(Math.hypot(a.x - a0.x, a.y - a0.y)).toBeGreaterThan(0);
    expect(Math.hypot(b.x - b0.x, b.y - b0.y)).toBeGreaterThan(0);
  });
  it('a new move replaces the current one and hands back the EN it did not walk', () => {
    startHunt(3); G.paused = false;
    const m = G.p; m.en = m.enMax;
    G.pmode = 'SPRINT'; cmdTarget(m.x + 10 * T, m.y); const pl = G.plan; cmdMove();
    const paid = pl ? pl.en : 0;
    run(0.2);
    G.pmode = 'CREEP'; cmdTarget(m.x - T, m.y); cmdMove(); // CREEP costs no EN
    expect(paid).toBeGreaterThan(0);
    expect(m.en).toBeGreaterThan(m.enMax - paid); // most of the sprint's EN came back
    expect(m.lact && m.lact.pl.mode).toBe('CREEP');
  });
  it('the field acts on the clock with no END TURN from you', () => {
    startHunt(3); G.paused = false;
    const pos = G.units.filter(u => u.mobile).map(u => u.x + ',' + u.y).join(' ');
    run(TUNE.LIVE_ROUND_SEC * 3);
    expect(G.units.filter(u => u.mobile).map(u => u.x + ',' + u.y).join(' ')).not.toBe(pos);
  });
  it('the gun aims, fires, then cools down (COOL)', () => {
    startHunt(3); G.paused = false;
    const m = G.p, u = G.units.find(x => x.mobile) || G.units[0];
    u.x = m.x + 3 * T; u.y = m.y; // in the open, in front of it
    m.fx = 1; m.fy = 0;
    const c = { on: true, id: u.id, tx: u.x, ty: u.y, unc: 0, lost: 0, gap: 1, snd: false, shr: false };
    G.pc.push(c);
    m.aim = { c, id: u.id, t: TUNE.LIVE_AIM_TIME };
    expect(shootBlock(m, c, TUNE.PLAYER_FIRE_UNC, fireRange(m))).toBe('COOL'); // aiming
    const shots = m.shots;
    run(TUNE.LIVE_AIM_TIME + 0.1);
    if (m.shots > shots) expect(m.cool).toBeGreaterThan(0); // fired (unless its line of sight closed): now cooling
    m.aim = null; m.cool = 1;
    expect(shootBlock(m, c, TUNE.PLAYER_FIRE_UNC, fireRange(m))).toBe('COOL');
  });
  it('UPLINK takes LIVE_ACT_TIME.UPLINK of standing at the uplink', () => {
    startHunt(3); G.paused = false;
    const m = G.p; m.x = G.up.x; m.y = G.up.y;
    for (const u of G.units) u.dead = true; G.kills = 0; // nothing in the way; G.kills < units so the hunt runs on
    for (const u of G.units) { u.dead = false; u.x = u.y = -50 * T; u.mobile = false; }
    expect(objectiveBlock()).toBe('');
    const p0 = G.up.prog; cmdObjective();
    run(TUNE.LIVE_ACT_TIME.UPLINK * 0.5); expect(G.up.prog).toBe(p0);
    run(TUNE.LIVE_ACT_TIME.UPLINK * 0.6); expect(G.up.prog).toBe(p0 + 1);
  });
  it('a whole live hunt plays out to an end or keeps running (no crash, no NaN)', () => {
    for (const seed of [1, 2, 3, 4]) {
      startHunt(seed); G.paused = false;
      run(90);
      for (const m of [...G.lance, ...G.units]) { expect(Number.isFinite(m.x)).toBe(true); expect(Number.isFinite(m.en ?? 0)).toBe(true); }
    }
  });
});

describe('turns stay as they were', () => {
  it('TIME_MODE turns runs no live code', () => {
    TUNE.TIME_MODE = 'turns';
    const r = playHunt(5);
    expect(G.live).toBe(false);
    expect(r.outcome).toBeTruthy();
  });
});

// ---- R25 checkpoint B: it pauses for you ----
import { watchForPause, isFixed } from '../src/sim/live.ts';
import { playOut } from '../src/sim/autoplay.ts';
describe('auto-pause: the track rule (Jamie)', () => {
  const setup = () => {
    startHunt(3); G.paused = false; G.apCue = null;
    for (const c of G.pc) c.on = false; G.apTrack = {};
    const u = G.units[0];
    const c: any = { on: true, id: u.id, tx: u.x, ty: u.y, unc: 6 * T, lost: 0, gap: 1.6, snd: false, shr: false };
    G.pc.push(c);
    return c;
  };
  const paused = () => { const p = G.paused, why = G.apCue ? G.apCue.why.join('+') : ''; G.paused = false; G.apCue = null; return p ? why : ''; };
  it('a new contact pauses once, when it appears', () => {
    const c = setup(); watchForPause();
    expect(paused()).toBe('CONTACT');
    watchForPause(); expect(paused()).toBe('');
  });
  it('a loose track that jumps about never pauses again', () => {
    const c = setup(); watchForPause(); paused();
    for (let i = 0; i < 20; i++) { G.time += 0.2; c.tx += (i % 2 ? 3 : -3) * T; c.unc = (4 + (i % 3)) * T; watchForPause(); expect(paused()).toBe(''); }
  });
  it('it pauses again when it firms up into a fixed track (once)', () => {
    const c = setup(); watchForPause(); paused();
    c.unc = 0.5 * T; expect(isFixed(c)).toBe(true);
    watchForPause(); expect(paused()).toBe('FIXED');
    c.unc = 5 * T; watchForPause(); c.unc = 0.5 * T; watchForPause(); expect(paused()).toBe(''); // loose, then fixed again: no
  });
  it('a sound-only fix is never a fixed track', () => {
    const c = setup(); c.snd = true; c.unc = 0.5 * T; watchForPause(); paused();
    expect(isFixed(c)).toBe(false);
  });
  it('a contact back after AUTOPAUSE_RELOST pauses again; back sooner does not', () => {
    const c = setup(); watchForPause(); paused();
    c.on = false; G.time += 1; watchForPause(); c.on = true; c.lost = 0; G.time += 0.5; watchForPause();
    expect(paused()).toBe('');
    c.on = false; watchForPause(); G.time += TUNE.AUTOPAUSE_RELOST + 0.1; c.on = true; c.lost = 0; watchForPause();
    expect(paused()).toBe('BACK');
  });
  it('switched off, contacts never pause the game', () => {
    const k = TUNE.AUTOPAUSE_CONTACT; TUNE.AUTOPAUSE_CONTACT = false;
    try { setup(); watchForPause(); expect(paused()).toBe(''); } finally { TUNE.AUTOPAUSE_CONTACT = k; }
  });
});
describe('auto-pause: fire, idle, objective', () => {
  it('TAKING FIRE pauses when the shooting starts, not on every shot', () => {
    startHunt(3); G.paused = false; G.apCue = null; const k = TUNE.AUTOPAUSE_CONTACT; TUNE.AUTOPAUSE_CONTACT = false; // shots only
    try {
      const m = G.lance[0], shot = () => G.shotLog.push({ mech: false, target: m.id });
      shot(); watchForPause(); expect(G.paused && G.apCue.why.includes('FIRE')).toBe(true); G.paused = false;
      G.time += 1; shot(); watchForPause(); expect(G.paused).toBe(false);
      G.time += TUNE.AUTOPAUSE_FIRE_GAP + 1; shot(); watchForPause(); expect(G.paused).toBe(true);
    } finally { TUNE.AUTOPAUSE_CONTACT = k; }
  });
  it('an ExoS that finishes its order pauses the game (IDLE)', () => {
    startHunt(3); G.paused = false;
    const m = G.p; cmdTarget(m.x + 2 * T, m.y); cmdMove();
    run(5);
    expect(G.liveLog.some(l => l.k === 'AUTOPAUSE' && l.why.includes('IDLE ' + m.id))).toBe(true);
  });
  it('an UPLINK step pauses the game (OBJECTIVE)', () => {
    startHunt(3); G.paused = false; const k = TUNE.AUTOPAUSE_IDLE; TUNE.AUTOPAUSE_IDLE = false;
    try {
      const m = G.p; m.x = G.up.x; m.y = G.up.y;
      for (const u of G.units) { u.x = u.y = -50 * T; u.mobile = false; }
      cmdObjective(); run(TUNE.LIVE_ACT_TIME.UPLINK + 0.5);
      expect(G.liveLog.some(l => l.k === 'AUTOPAUSE' && l.why.includes('OBJECTIVE'))).toBe(true);
    } finally { TUNE.AUTOPAUSE_IDLE = k; }
  });
});
describe('continuous field + the runner', () => {
  it('a field unit gets AP every second, not once a round', () => {
    startHunt(3); G.paused = false;
    const e = G.units.find(u => u.mobile) || G.units[0]; e.ap = 0; e.apF = 0; e.rt = 99; // no decisions: AP only
    run(TUNE.LIVE_ROUND_SEC / TUNE.AP_PER_TURN * 2 + 0.05);
    expect(e.ap).toBe(2);
  });
  it('the scripted lance plays live hunts to an end', () => {
    let ended = 0;
    for (const seed of [1, 2, 3, 4, 5]) { startHunt(seed); playOut(80); if (G.mode !== 'hunt') ended++; }
    expect(ended).toBeGreaterThanOrEqual(4);
  });
});

// ---- R25 checkpoint C: off the grid ----
import { findPath, freePoint, clearWide, pathCost, loadMap, HIVE, solid, N } from '../src/sim/world.ts';
import { canSee } from '../src/sim/sensors.ts';
import { coverInfo } from '../src/sim/combat.ts';
import { scenarioByName, startScenario, leaveScenario } from '../src/sim/scenarios.ts';
describe('off the grid (FREE_POS)', () => {
  let fp: any;
  beforeEach(() => { fp = TUNE.FREE_POS; TUNE.FREE_POS = true; });
  afterEach(() => { TUNE.FREE_POS = fp; leaveScenario(); loadMap(HIVE); });
  const ctr = (x: number, y: number) => ({ x: (x + 0.5) * T, y: (y + 0.5) * T });
  const tiny = (rows: string[]) => loadMap({ id: 'test', rows, anchors: HIVE.anchors, info: { grid: 'test' } });
  it('a route ends at the exact point tapped, not the tile centre', () => {
    tiny(['..........', '..........', '..........']);
    const p = findPath(ctr(1, 1).x, ctr(1, 1).y, 7.2 * T, 1.8 * T);
    expect(p[p.length - 1].x).toBeCloseTo(7.2 * T, 5); expect(p[p.length - 1].y).toBeCloseTo(1.8 * T, 5);
  });
  it('a point tapped inside a wall gives the nearest point beside it, not the next tile centre', () => {
    tiny(['..........', '.....#....', '..........']);
    const q = freePoint(5.1 * T, 1.5 * T);
    expect(Math.floor(q.x / T) === 5 && Math.floor(q.y / T) === 1).toBe(false); // out of the wall
    expect(Math.hypot(q.x - 5.1 * T, q.y - 1.5 * T)).toBeLessThan(0.9 * T); // close to where you tapped
    expect(Math.abs(q.x - (Math.floor(q.x / T) + 0.5) * T) + Math.abs(q.y - (Math.floor(q.y / T) + 0.5) * T)).toBeGreaterThan(0.05 * T); // not a centre
  });
  it('round a corner, the route takes the tightest clear line (shorter than via tile centres) and stays clear', () => {
    tiny(['..........', '..........', '..........', '....#.....', '....#.....', '....#.....', '..........']);
    const a = ctr(1, 5), b = ctr(8, 5);
    TUNE.FREE_POS = false; const old = findPath(a.x, a.y, b.x, b.y); TUNE.FREE_POS = true;
    const now = findPath(a.x, a.y, b.x, b.y);
    expect(pathCost(now)).toBeLessThanOrEqual(pathCost(old) + 1e-6);
    for (let i = 1; i < now.length; i++) expect(clearWide(now[i - 1], now[i])).toBe(true);
  });
  it('line of sight is from exact points: a step sideways inside the same tile opens a view round a corner', () => {
    tiny(['.......', '...#...', '.......']);
    const o: any = { x: 1.5 * T, y: 1.2 * T, fx: 1, fy: 0 }, m: any = { x: 5.5 * T, y: 1.5 * T };
    const blocked = canSee({ ...o, y: 1.5 * T }, m, 12);
    const peek = canSee({ ...o, y: 0.4 * T }, { ...m, y: 0.4 * T }, 12);
    expect(blocked).toBe(false); expect(peek).toBe(true);
  });
  it('cover is measured from the points: the same wall covers one shooter spot and not another', () => {
    tiny(['.........', '.........', '....#....', '.........', '.........']);
    const t = { x: 5.5 * T, y: 2.5 * T }; // just east of the wall
    expect(coverInfo(1.5 * T, 2.5 * T, t.x, t.y).kind).toBe('WALL'); // shooting along the row: through the wall
    expect(coverInfo(5.5 * T, 0.2 * T, t.x, t.y).kind).toBe(''); // from straight above: open
  });
  it('units never overlap: two ExoS on one spot are pushed apart', () => {
    startHunt(3); G.paused = false;
    const [a, b] = G.lance; b.x = a.x + 0.05 * T; b.y = a.y;
    run(0.2);
    expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan(2 * TUNE.LIVE_UNIT_RADIUS * T - 0.5);
  });
  it('two ExoS sent to the same spot both finish their move (no deadlock)', () => {
    startHunt(3); G.paused = false; const k = TUNE.AUTOPAUSE_IDLE; TUNE.AUTOPAUSE_IDLE = false;
    try {
      const [a, b] = G.lance, x = a.x + 4 * T, y = a.y;
      for (const m of [a, b]) { liveSelect(m); cmdTarget(x, y); cmdMove(); }
      for (let t = 0; t < 10 && (a.lact || b.lact); t += DT) { step(DT); G.paused = false; }
      expect(!a.lact && !b.lact).toBe(true);
    } finally { TUNE.AUTOPAUSE_IDLE = k; }
  });
  it('the same seed rolls the same district on both pages', () => {
    TUNE.FREE_POS = false; TUNE.TIME_MODE = 'turns'; startHunt(7, undefined, 'blocks'); const m0 = Array.from(solid.subarray(0, N)).join('');
    TUNE.FREE_POS = true; TUNE.TIME_MODE = 'live'; startHunt(7, undefined, 'blocks'); const m1 = Array.from(solid.subarray(0, N)).join('');
    expect(m1).toBe(m0);
  });
  it('test-bed scenarios load and run on the toy page', () => {
    for (const n of ['Side street', 'Trip wire', 'Read it cold']) { startScenario(scenarioByName(n)); expect(G.live).toBe(true); G.paused = false; run(3); leaveScenario(); }
  });
});
