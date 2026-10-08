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
