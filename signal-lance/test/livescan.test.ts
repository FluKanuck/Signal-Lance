// Round 20: eyes from the ship. The live scan (src/sim/livescan.ts): the clock, three sensors, the aim mark, bands, the walk.
import { describe, it, expect, afterEach } from 'vitest';
import { TUNE } from '../src/tune.ts';
import { G, rollEnemy, newHunt } from '../src/sim/state.ts';
import { T, W, H, loadMap, HIVE } from '../src/sim/world.ts';
import { offeredDrops, chooseDrop, zoneKnowOf, scanDone } from '../src/sim/scan.ts';
import { scanCmd, scanStep, replayScan, encodeCmds, decodeCmds, aimStrength, band, unitIntel, posOf, emitter, hot, zoneLayer, dropClear } from '../src/sim/livescan.ts';
import { leaveScenario } from '../src/sim/scenarios.ts';
import { LOAD, LOAD_A } from './helpers.ts';

afterEach(() => { leaveScenario(); G.scan = null; G.drops = null; loadMap(HIVE); });
function job(seed: number, comp?: string, mission = 'UPLINK') {
  const m = TUNE.MAP_MODE; TUNE.MAP_MODE = 'blocks'; G.scan = null;
  try { rollEnemy(seed, comp, mission); } finally { TUNE.MAP_MODE = m; }
  return G.scan;
}
// run the clock for n ship-minutes (START … STOP)
function run(min: number) { scanCmd('G'); for (let i = 0; i < Math.round(min / TUNE.SCAN_TICK); i++) scanStep(); scanCmd('S'); }
const snap = () => JSON.stringify({ u: G.scan.u, z: G.scan.z, dr: G.scan.dr, t: G.scan.t, aim: G.scan.aim, cov: G.scan.cov });

describe('the live scan', () => {
  it('is the default; the dial is behind SCAN_MODE', () => {
    expect(job(1).mode).toBe('active');
    TUNE.SCAN_MODE = 'dial';
    try { expect(job(1).mode).toBeUndefined(); } finally { TUNE.SCAN_MODE = 'active'; }
  });
  it('replays identically from the seed and its commands', () => {
    for (const s of [3, 17, 41]) {
      job(s, 'Mixed');
      scanCmd('a', 10, 8); run(3); scanCmd('T'); scanCmd('a', 30, 12); scanCmd('G');
      for (let i = 0; i < 9; i++) { scanStep(); scanCmd('a', 30 + i, 12); } // a drag while it runs
      scanCmd('S'); scanCmd('E'); scanCmd('W'); run(5);
      const a = snap(), cmds = G.scan.cmds.slice(), word = encodeCmds(cmds);
      expect(decodeCmds(word)).toEqual(cmds);
      job(s, 'Mixed'); replayScan(decodeCmds(word));
      expect(snap()).toBe(a);
    }
  });
  it('the clock stops itself at SCAN_TIME_MAX', () => {
    job(5); scanCmd('G'); for (let i = 0; i < 1000; i++) scanStep();
    expect(G.scan.run).toBe(false); expect(G.scan.t).toBeCloseTo(TUNE.SCAN_TIME_MAX);
    expect(scanDone()).toBe(true); scanCmd('G'); expect(G.scan.run).toBe(false); // no more time
  });
});

describe('the aim mark', () => {
  it('full strength inside the core, zero at the edge, linear between; WIDE is flat', () => {
    const S = job(7); S.aim = { x: 20, y: 10 }; const c = TUNE.SCAN_AIM_CORE, e = TUNE.SCAN_AIM_EDGE;
    expect(aimStrength(S, 20, 10)).toBe(1); expect(aimStrength(S, 20 + c, 10)).toBe(1);
    expect(aimStrength(S, 20 + e, 10)).toBe(0); expect(aimStrength(S, 20 + e + 3, 10)).toBe(0);
    expect(aimStrength(S, 20 + (c + e) / 2, 10)).toBeCloseTo(0.5);
    expect(aimStrength(S, 20 + c + (e - c) * 0.25, 10)).toBeCloseTo(0.75);
    S.wide = true; expect(aimStrength(S, 0, 0)).toBe(TUNE.SCAN_WIDE_STRENGTH); expect(aimStrength(S, 20, 10)).toBe(TUNE.SCAN_WIDE_STRENGTH);
  });
  it('dwell only grows inside the footprint (or everywhere with WIDE)', () => {
    for (const s of [2, 9, 23]) {
      job(s); scanCmd('a', 4, 4); run(4);
      for (const u of G.units) {
        const p = posOf(G.scan, u), far = Math.hypot(p.x - 4, p.y - 4) >= TUNE.SCAN_AIM_EDGE + TUNE.SCAN_DRIFT_PER_MIN * 4 + 1; // it may have walked in
        if (far) expect(G.scan.u[u.id].d.RADAR).toBe(0);
      }
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (Math.hypot(x - 4, y - 4) >= TUNE.SCAN_AIM_EDGE) expect(G.scan.cov.RADAR[y * W + x]).toBe(0);
      job(s); scanCmd('W'); run(2);
      for (const u of G.units) expect(G.scan.u[u.id].d.RADAR).toBeCloseTo(TUNE.SCAN_SPEED.RADAR * TUNE.SCAN_WIDE_STRENGTH * 2);
    }
  });
});

describe('each sensor reveals only its own layer', () => {
  it('radar pings everything but never IDs; EM never sees silent units; thermal never sees cold ones', () => {
    let silent = 0, cold = 0;
    for (const s of [2025, 2002, 1909, 31, 32, 33]) {
      job(s, s >= 2000 ? 'Ambush' : 'Mixed');
      for (const sen of ['R', 'T', 'E']) { scanCmd(sen); scanCmd('W'); run(6); } // every sensor, wide, a while each
      scanCmd('w');
      for (const u of G.units) { const p = posOf(G.scan, u); scanCmd('a', p.x, p.y); scanCmd('E'); run(1); }
      for (const u of G.units) {
        const I = unitIntel(G.scan, u);
        expect(I.rb).toBeGreaterThan(0); // radar: every unit
        if (!emitter(u)) { silent++; expect(I.eb).toBe(0); expect(G.scan.u[u.id].d.EM).toBe(0); expect(I.guess).toBe(''); }
        if (!hot(u)) { cold++; expect(I.tb).toBe(0); expect(G.scan.u[u.id].d.THERMAL).toBe(0); }
        if (I.guess) expect(I.eb).toBeGreaterThanOrEqual(2); // only EM names a unit
      }
    }
    expect(silent).toBeGreaterThan(0); expect(cold).toBeGreaterThan(0);
  });
  it('radar alone: pings with a fix and no name; EM band 1 counts without a fix; band 3 tightens to the floor', () => {
    job(2025, 'Ambush'); scanCmd('W'); run(4);
    for (const u of G.units) { const I = unitIntel(G.scan, u); expect(I.fix).not.toBeNull(); expect(I.fix.by).toBe('RADAR'); expect(I.guess).toBe(''); expect(I.fits).toEqual([]); }
    job(2025, 'Ambush'); const e = G.units.find(emitter), p = posOf(G.scan, e);
    scanCmd('E'); scanCmd('a', p.x, p.y);
    scanCmd('G'); while (band(G.scan, 'EM', G.scan.u[e.id].d.EM) < 1) scanStep(); scanCmd('S');
    expect(unitIntel(G.scan, e).fix).toBeNull();
    run(TUNE.SCAN_BANDS.EM[2] / TUNE.SCAN_SPEED.EM + 1);
    const I = unitIntel(G.scan, e); expect(I.eb).toBe(3); expect(I.fix.unc).toBeCloseTo(TUNE.SCAN_BLIP_FLOOR); expect(I.guess).not.toBe('');
  });
  it('zones: radar shows the outline, thermal the type', () => {
    job(11); const S = G.scan, z = G.zones[0];
    expect(zoneKnowOf(z)).toBe(0);
    scanCmd('a', z.x, z.y); run(1); expect(zoneLayer(S, 0)).toBe(1); expect(zoneKnowOf(z)).toBe(1);
    scanCmd('T'); run(1); expect(zoneKnowOf(z)).toBe(2);
  });
});

describe('patrols walk with the clock', () => {
  it('tiles walked = SCAN_DRIFT_PER_MIN × time, and a longer scan walks further', () => {
    const steps = (min: number) => { job(71, 'Sweep'); scanCmd('W'); run(min); return G.units.filter(u => u.mobile).map(u => G.scan.u[u.id].walk.steps); };
    const a = steps(4), b = steps(16);
    a.forEach((n, i) => { expect(n).toBeLessThanOrEqual(Math.floor(TUNE.SCAN_DRIFT_PER_MIN * 4 + 1e-6)); expect(b[i]).toBeGreaterThanOrEqual(n); });
    expect(b.reduce((x, y) => x + y, 0)).toBeGreaterThan(a.reduce((x, y) => x + y, 0));
    expect(Math.max(...b)).toBe(Math.floor(TUNE.SCAN_DRIFT_PER_MIN * 16 + 1e-6));
    for (const u of G.units) if (u.mobile) { const w = G.scan.u[u.id].walk; expect(Math.hypot(w.x - w.hx, w.y - w.hy)).toBeLessThanOrEqual(TUNE.SCAN_DRIFT_LEASH + 1e-6); }
    for (const u of G.units) if (!u.mobile) expect(G.scan.u[u.id].walk).toBeNull();
  });
  it('the field lands where the walk left it (plus SCAN_DROP_DELAY); fixes become stale SHIP contacts', () => {
    job(72, 'Mixed'); scanCmd('W'); run(6); scanCmd('w'); scanCmd('E');
    const e = G.units.find(emitter), p = posOf(G.scan, e); scanCmd('a', p.x, p.y); run(9); // EM on one emitter: band 3
    newHunt([{ ...LOAD_A }, { ...LOAD }]);
    const C = G.pc.filter(c => c.on && c.src === 'SCAN');
    expect(C.length).toBe(G.units.length); // radar wide 6 min pings every unit
    for (const c of C) expect(c.type).toBe('');
    expect(G.obs[e.id]).toBeTruthy(); // what EM heard carries as its notes
    for (const u of G.units) if (!emitter(u)) expect(G.obs[u.id]).toBeUndefined();
    expect(G.scanCost.live).toBe(true);
  });
  it('landing twice (RETRY) lands the same', () => {
    job(73, 'Sweep'); scanCmd('W'); run(5);
    newHunt([{ ...LOAD_A }, { ...LOAD }]); const a = G.units.map(u => u.x + ',' + u.y).join(' ');
    job(73, 'Sweep'); replayScan(decodeCmds('0W_0G_20S')); newHunt([{ ...LOAD_A }, { ...LOAD }]);
    expect(G.units.map(u => u.x + ',' + u.y).join(' ')).toBe(a);
  });
});

describe('drop zones', () => {
  it('need RADAR band 1 on their apron; the west edge is always offered', () => {
    for (const s of [4, 8, 15]) {
      job(s); const D = G.drops;
      expect(offeredDrops().map(d => d.i)).toEqual([0]);
      chooseDrop(1); expect(G.scan.drop).toBe(0);
      scanCmd('T'); scanCmd('a', D[1].x, D[1].y); run(3); expect(dropClear(G.scan, 1)).toBe(false); // thermal doesn't clear an apron
      scanCmd('R'); run(1); expect(offeredDrops().map(d => d.i)).toContain(1);
      chooseDrop(1); expect(G.scan.drop).toBe(1);
      newHunt([{ ...LOAD_A }, { ...LOAD }]);
      expect(Math.floor(G.lance[0].x / T)).toBe(D[1].x);
    }
  });
});
