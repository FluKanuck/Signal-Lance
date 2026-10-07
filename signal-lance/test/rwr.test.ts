// Round 19 checkpoint 3: the RWR (src/sim/rwr.ts).
import { describe, it, expect, afterEach } from 'vitest';
import { TUNE } from '../src/tune.ts';
import { G } from '../src/sim/state.ts';
import { T } from '../src/sim/world.ts';
import { bandOf, rwrWedge, heardMoving, rwrPaint, ageRwr, guessDist, paintFade } from '../src/sim/rwr.ts';
import { scenarioByName, startScenario, leaveScenario, RWR_FIT } from '../src/sim/scenarios.ts';
import { launchBlock, kitOf } from '../src/sim/kit.ts';
import { endPlayerTurn, step } from '../src/sim/turns.ts';

afterEach(() => leaveScenario());
const deg = (a: number) => a * 180 / Math.PI;
const compass = (a: number) => { let d = deg(a) + 90; while (d > 180) d -= 360; while (d <= -180) d += 360; return d; }; // canvas angle → degrees from north
function setup() { startScenario(scenarioByName('Painted on the move')); return { A: G.lance[0], E: G.units[0] }; }
const aim = (E: any, A: any) => { const d = Math.hypot(A.x - E.x, A.y - E.y); E.fx = (A.x - E.x) / d; E.fy = (A.y - E.y) / d; };

describe('the RWR', () => {
  it('the scenario suit can launch and carries a working RWR', () => { expect(launchBlock(RWR_FIT())).toBe(''); });
  it('band from strength: the nearest band span', () => {
    expect(bandOf(4)).toBe('CLOSE'); expect(bandOf(7)).toBe('CLOSE'); expect(bandOf(8.5)).toBe('MEDIUM'); expect(bandOf(12)).toBe('MEDIUM');
    expect(bandOf(20)).toBe('FAR'); expect(bandOf(40)).toBe('FAR');
  });
  it('a louder radar reads closer', () => {
    const { A, E } = setup(); E.radarOn = true;
    const d0 = guessDist(E, A); E.emit = 100; expect(guessDist(E, A)).toBeLessThan(d0);
  });
  it('fires only when a radar actually covers the suit, and only with the RWR', () => {
    const { A, E } = setup();
    expect(rwrPaint(E, A)).toBe(null);            // radar off
    E.radarOn = true; E.pulseSeq = 1;
    aim(E, A); E.fx = -E.fx; E.fy = -E.fy;        // facing away: not covered
    expect(rwrPaint(E, A)).toBe(null);
    aim(E, A);
    const w = rwrPaint(E, A); expect(w).not.toBe(null);
    expect(w.x).toBe(A.x); expect(w.y).toBe(A.y); expect(w.kind).toBe('SEARCH');
    const truth = Math.atan2(E.y - A.y, E.x - A.x);
    expect(Math.abs(deg(Math.atan2(Math.sin(w.ang - truth), Math.cos(w.ang - truth))))).toBeLessThanOrEqual(TUNE.RWR_BEARING_ERR + 1e-9);
    A.fit.mounts.MAST = A.fit.mounts.MAST.map((id: string) => id === 'rwr' ? null : id); A.items = kitOf(A.fit); A.rwr = []; E.pulseSeq = 2;
    expect(rwrPaint(E, A)).toBe(null);            // no RWR fitted
  });
  it('one warning per pulse (the same pulse refreshes nothing); warnings fade after RWR_LIFE rounds', () => {
    const { A, E } = setup(); E.radarOn = true; E.pulseSeq = 1; aim(E, A);
    const w = rwrPaint(E, A), a0 = w.ang; rwrPaint(E, A); expect(A.rwr.length).toBe(1); expect(w.ang).toBe(a0); expect(A.rwrN).toBe(1);
    G.turn += TUNE.RWR_LIFE - 1; ageRwr(); expect(A.rwr.length).toBe(1);
    G.turn += 1; ageRwr(); expect(A.rwr.length).toBe(0);
  });
  it('heard standing vs heard moving', () => {
    const w: any = { x: 0, y: 0, ang: -Math.PI / 2, band: 'MEDIUM' };
    expect(heardMoving(w, 0.3 * T, 0)).toBe(false); expect(heardMoving(w, 1 * T, 0)).toBe(true);
  });
  it('the worked case: heard due north, walked 4 tiles east, medium 9–15 → centre ≈ −18°, wedge ≈ −34° … −5°', () => {
    const w: any = { x: 0, y: 0, ang: -Math.PI / 2, band: 'MEDIUM' }, W = rwrWedge(w, 4 * T, 0);
    expect(TUNE.RWR_BANDS.MEDIUM).toEqual([9, 15]); expect(TUNE.RWR_BEARING_ERR).toBe(10);
    expect(compass(W.centre)).toBeCloseTo(-18.4, 0);
    expect(compass(W.from)).toBeCloseTo(-34, 0);
    expect(compass(W.to)).toBeCloseTo(-5, 0);
    expect(W.stale).toBe(false);
  });
  it('parallax: close swings and widens more than far; along the line stays tight, across fans out', () => {
    const at = (band: string, x: number, y: number) => { const W = rwrWedge({ x: 0, y: 0, ang: -Math.PI / 2, band } as any, x * T, y * T); return { c: Math.abs(compass(W.centre)), w: deg(W.to - W.from) }; };
    expect(at('CLOSE', 4, 0).c).toBeGreaterThan(at('FAR', 4, 0).c);
    expect(at('CLOSE', 4, 0).w).toBeGreaterThan(at('FAR', 4, 0).w);
    expect(at('MEDIUM', 0, -4).c).toBeLessThan(1);
    expect(at('MEDIUM', 0, -4).w).toBeLessThan(at('MEDIUM', 4, 0).w);
  });
  it('stale once you have walked past the strip near edge', () => {
    const w: any = { x: 0, y: 0, ang: -Math.PI / 2, band: 'CLOSE' };
    expect(rwrWedge(w, 0, -2 * T).stale).toBe(false); expect(rwrWedge(w, 1 * T, -3.5 * T).stale).toBe(true);
  });
  it('fix list 1: every suit has the built-in receiver: painted (which round), nothing more; the module adds the readout', () => {
    const { A, E } = setup(); E.radarOn = true; E.pulseSeq = 1; aim(E, A);
    A.fit.mounts.MAST = A.fit.mounts.MAST.map((id: string) => id === 'rwr' ? null : id); A.items = kitOf(A.fit);
    expect(rwrPaint(E, A)).toBe(null);            // no readout without the module...
    expect(A.paintTurn).toBe(G.turn); expect(A.paintN).toBe(1); expect(paintFade(A)).toBe(1); // ...but it knows it was painted
    expect(A.rwr || []).toEqual([]);
    G.turn += TUNE.RWR_LIFE; ageRwr(); expect(A.paintTurn).toBeUndefined(); expect(paintFade(A)).toBe(0);
    E.fx = -E.fx; E.fy = -E.fy; E.pulseSeq = 2; rwrPaint(E, A); expect(A.paintTurn).toBeUndefined(); // not covered: not painted
  });
  it('in the scenario, waiting a few rounds gets a warning from the emplacement', () => {
    const { A } = setup(); let g = 0;
    while (G.mode === 'hunt' && G.turn <= 3 && g++ < 1e6) { if (G.phase === 'PLAYER' && !G.act) endPlayerTurn(); else step(0.05); }
    expect(A.rwrN || 0).toBeGreaterThan(0);
  });
});
