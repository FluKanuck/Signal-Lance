// Round 20: eyes from the ship. The live scan (src/sim/livescan.ts): the clock, three sensors (any mix at once), aim rings,
// bands, the walk, the risk meter and its costs, arrivals, deadlines.
import { describe, it, expect, afterEach } from 'vitest';
import { TUNE } from '../src/tune.ts';
import { G, rollEnemy, newHunt } from '../src/sim/state.ts';
import { T, W, H, loadMap, HIVE } from '../src/sim/world.ts';
import { offeredDrops, chooseDrop, zoneKnowOf, scanDone, scanText } from '../src/sim/scan.ts';
import { scanCmd, scanStep, replayScan, encodeCmds, decodeCmds, aimStrength, band, unitIntel, posOf, emitter, hot, zoneLayer, dropClear,
  riskStep, riskAt, jobDeadline, SENSORS } from '../src/sim/livescan.ts';
import { leaveScenario } from '../src/sim/scenarios.ts';
import { LOAD, LOAD_A } from './helpers.ts';

afterEach(() => { leaveScenario(); G.scan = null; G.drops = null; loadMap(HIVE); });
// a job's world with the live scan; tune = overrides for this job (kept until the test ends: restore() in finally)
let saved: Record<string, any> = {};
function job(seed: number, comp?: string, mission = 'UPLINK', tune: Record<string, any> = {}) {
  for (const k of Object.keys(tune)) { if (!(k in saved)) saved[k] = TUNE[k]; TUNE[k] = tune[k]; }
  const m = TUNE.MAP_MODE; TUNE.MAP_MODE = 'blocks'; G.scan = null;
  try { rollEnemy(seed, comp, mission); } finally { TUNE.MAP_MODE = m; }
  return G.scan;
}
afterEach(() => { Object.assign(TUNE, saved); saved = {}; });
const QUIET = { SCAN_COSTS: false, SCAN_DEADLINE_CHANCE: 0 }; // the reveal rules on their own
// only these sensors on
function only(...s: string[]) { for (const n of SENSORS) scanCmd(n[0], s.includes(n) ? 1 : 0); }
const aim = (s: string, x: number, y: number) => scanCmd('a', x, y, SENSORS.indexOf(s as any));
const wide = (s: string, on = 1) => scanCmd('W', SENSORS.indexOf(s as any), on);
// run the clock for n ship-minutes, then pause it
function run(min: number) { scanCmd('G'); for (let i = 0; i < Math.round(min / TUNE.SCAN_TICK) && G.scan.run; i++) scanStep(); scanCmd('S'); }
const snap = () => JSON.stringify({ u: G.scan.u, z: G.scan.z, dr: G.scan.dr, t: G.scan.t, aims: G.scan.aims, cov: G.scan.cov, risk: G.scan.risk, adds: G.scan.adds });

describe('the live scan', () => {
  it('is the default; the dial is behind SCAN_MODE', () => {
    expect(job(1).mode).toBe('active');
    TUNE.SCAN_MODE = 'dial';
    try { expect(job(1).mode).toBeUndefined(); } finally { TUNE.SCAN_MODE = 'active'; }
  });
  it('replays identically from the seed and its commands (sensors at once, rings, costs on)', () => {
    for (const s of [3, 17, 41]) {
      job(s, 'Mixed', 'UPLINK', { SCAN_DEADLINE_CHANCE: 0 });
      aim('RADAR', 10, 8); run(3); scanCmd('T', 1); aim('THERMAL', 30, 12); scanCmd('G');
      for (let i = 0; i < 9; i++) { scanStep(); aim('THERMAL', 30 + i, 12); } // a drag while it runs
      scanCmd('S'); scanCmd('E', 1); wide('EM'); run(5); only(); run(6); // wait: it cools
      const a = snap(), cmds = G.scan.cmds.slice(), word = encodeCmds(cmds);
      expect(decodeCmds(word)).toEqual(cmds);
      job(s, 'Mixed'); replayScan(decodeCmds(word));
      expect(snap()).toBe(a);
    }
  });
  it('the clock has no cap', () => {
    job(5, undefined, 'UPLINK', QUIET); run(60);
    expect(G.scan.t).toBeCloseTo(60); expect(scanDone()).toBe(true);
  });
});

describe('the aim rings', () => {
  it('full strength inside the core, zero at the edge, linear between; FULL MAP is flat', () => {
    const S = job(7); S.aims.RADAR = { x: 20, y: 10 }; const c = TUNE.SCAN_AIM_CORE, e = TUNE.SCAN_AIM_EDGE;
    expect(aimStrength(S, 20, 10)).toBe(1); expect(aimStrength(S, 20 + c, 10)).toBe(1);
    expect(aimStrength(S, 20 + e, 10)).toBe(0); expect(aimStrength(S, 20 + e + 3, 10)).toBe(0);
    expect(aimStrength(S, 20 + (c + e) / 2, 10)).toBeCloseTo(0.5);
    expect(aimStrength(S, 20 + c + (e - c) * 0.25, 10)).toBeCloseTo(0.75);
    S.wide.RADAR = true; expect(aimStrength(S, 0, 0)).toBe(TUNE.SCAN_WIDE_STRENGTH); expect(aimStrength(S, 20, 10)).toBe(TUNE.SCAN_WIDE_STRENGTH);
    expect(aimStrength(S, 0, 0, 'EM')).toBe(0); // each sensor has its own ring
  });
  it('dwell only grows inside the footprint (or everywhere with FULL MAP)', () => {
    for (const s of [2, 9, 23]) {
      job(s, undefined, 'UPLINK', QUIET); aim('RADAR', 4, 4); run(4);
      for (const u of G.units) {
        const p = posOf(G.scan, u), far = Math.hypot(p.x - 4, p.y - 4) >= TUNE.SCAN_AIM_EDGE + TUNE.SCAN_DRIFT_PER_MIN * 4 + 1; // it may have walked in
        if (far) expect(G.scan.u[u.id].d.RADAR).toBe(0);
      }
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (Math.hypot(x - 4, y - 4) >= TUNE.SCAN_AIM_EDGE) expect(G.scan.cov.RADAR[y * W + x]).toBe(0);
      job(s, undefined, 'UPLINK', QUIET); wide('RADAR'); run(2);
      for (const u of G.units) expect(G.scan.u[u.id].d.RADAR).toBeCloseTo(TUNE.SCAN_SPEED.RADAR * TUNE.SCAN_WIDE_STRENGTH * 2);
    }
  });
  it('sensors run at the same time, each under its own ring', () => {
    job(2025, 'Ambush', 'UPLINK', QUIET);
    const [ua, ub] = G.units.filter(emitter), a = posOf(G.scan, ua), b = posOf(G.scan, ub);
    only('RADAR', 'EM'); aim('RADAR', a.x, a.y); aim('EM', b.x, b.y); run(1);
    expect(G.scan.u[ua.id].d.RADAR).toBeGreaterThan(0); expect(G.scan.u[ub.id].d.EM).toBeGreaterThan(0);
    expect(G.scan.cov.RADAR.some((v: number) => v > 0)).toBe(true); expect(G.scan.cov.EM.some((v: number) => v > 0)).toBe(true);
    expect(G.scan.cov.THERMAL.every((v: number) => v === 0)).toBe(true); // off = nothing
  });
});

describe('each sensor reveals only its own layer', () => {
  it('radar pings everything but never IDs; EM never sees silent units; thermal never sees cold ones', () => {
    let silent = 0, cold = 0;
    for (const s of [2025, 2002, 1909, 31, 32, 33]) {
      job(s, s >= 2000 ? 'Ambush' : 'Mixed', 'UPLINK', QUIET);
      only('RADAR', 'THERMAL', 'EM'); for (const n of SENSORS) wide(n); run(6); // every sensor, full map, at once
      for (const n of SENSORS) wide(n, 0); only('EM');
      for (const u of G.units) { const p = posOf(G.scan, u); aim('EM', p.x, p.y); run(1); }
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
    job(2025, 'Ambush', 'UPLINK', QUIET); wide('RADAR'); run(4);
    for (const u of G.units) { const I = unitIntel(G.scan, u); expect(I.fix).not.toBeNull(); expect(I.fix.by).toBe('RADAR'); expect(I.guess).toBe(''); expect(I.fits).toEqual([]); }
    job(2025, 'Ambush', 'UPLINK', QUIET); const e = G.units.find(emitter), p = posOf(G.scan, e);
    only('EM'); aim('EM', p.x, p.y);
    scanCmd('G'); while (band(G.scan, 'EM', G.scan.u[e.id].d.EM) < 1) scanStep(); scanCmd('S');
    expect(unitIntel(G.scan, e).fix).toBeNull();
    run(TUNE.SCAN_BANDS.EM[2] / TUNE.SCAN_SPEED.EM + 1);
    const I = unitIntel(G.scan, e); expect(I.eb).toBe(3); expect(I.fix.unc).toBeCloseTo(TUNE.SCAN_BLIP_FLOOR); expect(I.guess).not.toBe('');
  });
  it('zones: radar shows the outline, thermal the type', () => {
    job(11, undefined, 'UPLINK', QUIET); const S = G.scan, z = G.zones[0];
    expect(zoneKnowOf(z)).toBe(0);
    aim('RADAR', z.x, z.y); run(1); expect(zoneLayer(S, 0)).toBe(1); expect(zoneKnowOf(z)).toBe(1);
    only('THERMAL'); aim('THERMAL', z.x, z.y); run(1); expect(zoneKnowOf(z)).toBe(2);
  });
});

describe('patrols walk with the clock', () => {
  it('tiles walked = SCAN_DRIFT_PER_MIN × time, and a longer scan walks further', () => {
    const steps = (min: number) => { job(71, 'Sweep', 'UPLINK', QUIET); wide('RADAR'); run(min); return G.units.filter(u => u.mobile).map(u => G.scan.u[u.id].walk.steps); };
    const a = steps(4), b = steps(16);
    a.forEach((n, i) => { expect(n).toBeLessThanOrEqual(Math.floor(TUNE.SCAN_DRIFT_PER_MIN * 4 + 1e-6)); expect(b[i]).toBeGreaterThanOrEqual(n); });
    expect(b.reduce((x, y) => x + y, 0)).toBeGreaterThan(a.reduce((x, y) => x + y, 0));
    expect(Math.max(...b)).toBe(Math.floor(TUNE.SCAN_DRIFT_PER_MIN * 16 + 1e-6));
    for (const u of G.units) if (u.mobile) { const w = G.scan.u[u.id].walk; expect(Math.hypot(w.x - w.hx, w.y - w.hy)).toBeLessThanOrEqual(TUNE.SCAN_DRIFT_LEASH + 1e-6); }
    for (const u of G.units) if (!u.mobile) expect(G.scan.u[u.id].walk).toBeNull();
  });
  it('the field lands where the walk left it; fixes become stale SHIP contacts', () => {
    job(72, 'Mixed', 'UPLINK', QUIET); wide('RADAR'); run(6); only('EM');
    const e = G.units.find(emitter), p = posOf(G.scan, e); aim('EM', p.x, p.y); run(9); // EM on one emitter: band 3
    newHunt([{ ...LOAD_A }, { ...LOAD }]);
    const C = G.pc.filter(c => c.on && c.src === 'SCAN');
    expect(C.length).toBe(G.units.length); // radar full map 6 min pings every unit
    for (const c of C) expect(c.type).toBe('');
    expect(G.obs[e.id]).toBeTruthy(); // what EM heard carries as its notes
    for (const u of G.units) if (!emitter(u)) expect(G.obs[u.id]).toBeUndefined();
    expect(G.scanCost.live).toBe(true);
  });
  it('landing twice (RETRY) lands the same', () => {
    job(73, 'Sweep', 'UPLINK', QUIET); wide('RADAR'); run(5);
    newHunt([{ ...LOAD_A }, { ...LOAD }]); const a = G.units.map(u => u.x + ',' + u.y).join(' ');
    job(73, 'Sweep'); replayScan(decodeCmds('0W0.1_0G_20S')); newHunt([{ ...LOAD_A }, { ...LOAD }]);
    expect(G.units.map(u => u.x + ',' + u.y).join(' ')).toBe(a);
  });
});

describe('the risk meter (R20 cp2 + fix list 3)', () => {
  it('grows by loudness × time for every sensor on, and cools with none on', () => {
    job(81, 'Mixed', 'UPLINK', { SCAN_DEADLINE_CHANCE: 0, SCAN_RISK_EXTRA: [0], SCAN_ARRIVE_PER_MIN: 0 });
    run(2); expect(G.scan.risk).toBeCloseTo(2 * TUNE.SCAN_LOUD.RADAR);
    only('THERMAL', 'EM'); run(4); expect(G.scan.risk).toBeCloseTo(2 * TUNE.SCAN_LOUD.RADAR + 4 * (TUNE.SCAN_LOUD.THERMAL + TUNE.SCAN_LOUD.EM));
    const r = G.scan.risk; only(); run(2); expect(G.scan.risk).toBeCloseTo(Math.max(0, r - 2 * TUNE.SCAN_COOL));
    run(60); expect(G.scan.risk).toBe(0);
  });
  it('steps at SCAN_RISK_STEPS, then every SCAN_RISK_MORE with no ceiling', () => {
    const L = TUNE.SCAN_RISK_STEPS, top = L[L.length - 1];
    expect(riskStep(0)).toBe(0); expect(riskStep(L[0] - 0.01)).toBe(0); expect(riskStep(L[0])).toBe(1); expect(riskStep(top)).toBe(L.length);
    expect(riskStep(top + TUNE.SCAN_RISK_MORE * 7)).toBe(L.length + 7);
    for (let k = 0; k < 12; k++) expect(riskStep(riskAt(k))).toBe(k);
  });
  it('a new step calls a unit in (once per step, not again after cooling); it lands with the field and can be scanned', () => {
    job(82, 'Mixed', 'UPLINK', { SCAN_DEADLINE_CHANCE: 0, SCAN_RISK_EXTRA: [0, 1, 1, 1], SCAN_ARRIVE_PER_MIN: 0 });
    const n0 = G.units.length; wide('RADAR');
    run(TUNE.SCAN_RISK_STEPS[1] / TUNE.SCAN_LOUD.RADAR + 0.1); expect(G.scan.adds.length).toBe(2); expect(G.units.length).toBe(n0 + 2);
    only(); run(30); scanCmd('R', 1); run(TUNE.SCAN_RISK_STEPS[1] / TUNE.SCAN_LOUD.RADAR + 0.1); expect(G.scan.adds.length).toBe(2); // the same steps again: nobody new
    run(30); expect(G.scan.adds.length).toBeGreaterThan(2); // new steps beyond: more come
    const ids = G.scan.adds.map((a: any) => 'U' + a.n);
    const m = TUNE.MAP_MODE; TUNE.MAP_MODE = 'blocks'; try { rollEnemy(82, 'Mixed', 'UPLINK'); } finally { TUNE.MAP_MODE = m; }
    expect(G.units.length).toBe(n0); expect(G.scan.adds.length).toBe(ids.length); // the same job rolled again for the drop (takeJob) keeps its scan...
    newHunt([{ ...LOAD_A }, { ...LOAD }]);
    for (const id of ids) expect(G.units.some(u => u.id === id && u.extra)).toBe(true); // ...gets them back
  });
  it('the step you drop at sets the alert share and the paint chance; radar units wake first', () => {
    for (const s of [91, 92, 93]) {
      job(s, 'Fortified', 'UPLINK', { SCAN_DEADLINE_CHANCE: 0, SCAN_RISK_EXTRA: [0], SCAN_ARRIVE_PER_MIN: 0, SCAN_RISK_PAINT: [0, 0, 1], SCAN_RISK_ALERT: [0, 0.5, 0.5] });
      run(TUNE.SCAN_RISK_STEPS[1] / TUNE.SCAN_LOUD.RADAR + 0.1); // step 2: painted for sure, half awake
      newHunt([{ ...LOAD_A }, { ...LOAD }]);
      const C = G.scanCost; expect(C.step).toBe(2); expect(C.painted).toBe(true); expect(C.ambush.length).toBe(TUNE.SCAN_AMBUSH);
      expect(C.alert.length).toBe(Math.max(C.ambush.length, Math.round(0.5 * G.units.length)));
      const woke = C.alert.map((id: string) => G.units.find(u => u.id === id)).filter((u: any) => !u.ambush), radar = G.units.filter((u: any) => !u.ambush && u.items.some((i: any) => i.item.tags.includes('RADAR')));
      if (radar.length && woke.length) expect(woke.slice(0, Math.min(radar.length, woke.length)).every((u: any) => radar.includes(u))).toBe(true);
      expect(scanText()).toMatch(/risk \d+\.\d step 2: .* painted \(ambush 2\)/);
    }
    job(94, 'Fortified', 'UPLINK', { SCAN_DEADLINE_CHANCE: 0, SCAN_RISK_PAINT: [0, 0, 1], SCAN_ARRIVE_PER_MIN: 0, SCAN_RISK_EXTRA: [0] });
    run(TUNE.SCAN_RISK_STEPS[1] / TUNE.SCAN_LOUD.RADAR + 0.1); only(); run(30); // cooled to 0 before the drop
    newHunt([{ ...LOAD_A }, { ...LOAD }]); expect(G.scanCost.step).toBe(0); expect(G.scanCost.painted).toBe(false); expect(G.scanCost.alert).toEqual([]);
  });
  it('waiting isn\'t free: units arrive with time (SCAN_ARRIVE_PER_MIN)', () => {
    job(95, 'Mixed', 'UPLINK', { SCAN_DEADLINE_CHANCE: 0, SCAN_ARRIVE_PER_MIN: 1, SCAN_RISK_EXTRA: [0] }); only(); run(5);
    expect(G.scan.adds.length).toBeGreaterThan(0); expect(G.scan.adds.every((a: any) => a.why === 'arrived' && TUNE.FIELD_VARIANTS[a.vk].TYPE === 'PATROL')).toBe(true);
    job(95, 'Mixed', 'UPLINK', { SCAN_ARRIVE_PER_MIN: 0 }); only(); run(5); expect(G.scan.adds.length).toBe(0);
  });
});

describe('deadlines (R20 fix list 4: scan screen only)', () => {
  it('some jobs have a window, seeded on the job; the clock stops at it and no more scanning', () => {
    let some = 0, none = 0;
    for (let s = 1; s <= 60; s++) {
      const d = jobDeadline(s, 'UPLINK'); expect(jobDeadline(s, 'UPLINK')).toBe(d);
      if (d) { some++; expect(d).toBeGreaterThanOrEqual(TUNE.SCAN_DEADLINE_MIN[0]); expect(d).toBeLessThanOrEqual(TUNE.SCAN_DEADLINE_MIN[1]); } else none++;
    }
    expect(some).toBeGreaterThan(10); expect(none).toBeGreaterThan(10);
    let s = 1; while (!jobDeadline(s, 'UPLINK')) s++;
    job(s, undefined, 'UPLINK', { SCAN_COSTS: false }); const D = G.scan.deadline; expect(D).toBe(jobDeadline(s, 'UPLINK'));
    scanCmd('G'); for (let i = 0; i < 1000 && G.scan.run; i++) scanStep();
    expect(G.scan.t).toBeCloseTo(D); expect(G.scan.over).toBe(true); expect(scanDone()).toBe(true);
    scanCmd('G'); expect(G.scan.run).toBe(false);
    const cmds = G.scan.cmds.slice(); job(s, undefined, 'UPLINK'); replayScan(cmds); expect(G.scan.t).toBeCloseTo(D);
  });
});

describe('drop zones', () => {
  it('need RADAR band 1 on their apron; the west edge is always offered', () => {
    for (const s of [4, 8, 15]) {
      job(s, undefined, 'UPLINK', QUIET); const D = G.drops; only();
      expect(offeredDrops().map(d => d.i)).toEqual([0]);
      chooseDrop(1); expect(G.scan.drop).toBe(0);
      only('THERMAL'); aim('THERMAL', D[1].x, D[1].y); run(3); expect(dropClear(G.scan, 1)).toBe(false); // thermal doesn't clear an apron
      only('RADAR'); aim('RADAR', D[1].x, D[1].y); run(1); expect(offeredDrops().map(d => d.i)).toContain(1);
      chooseDrop(1); expect(G.scan.drop).toBe(1);
      newHunt([{ ...LOAD_A }, { ...LOAD }]);
      expect(Math.floor(G.lance[0].x / T)).toBe(D[1].x);
    }
  });
});

describe('test bed (R20)', () => {
  it('Loud and fast opens with radar on the full map and the meter just under step 1', async () => {
    const { scenarioByName, startScenario } = await import('../src/sim/scenarios.ts');
    startScenario(scenarioByName('Loud and fast'), false);
    expect(G.scan.mode).toBe('active'); expect(G.scan.wide.RADAR).toBe(true); expect(G.scan.run).toBe(false);
    expect(G.scan.risk).toBeCloseTo(2.75); expect(riskStep(G.scan.risk)).toBe(0);
    expect(riskStep(G.scan.risk + TUNE.SCAN_LOUD.RADAR * 0.5)).toBe(1); // half a minute more radar: step 1
  });
});
