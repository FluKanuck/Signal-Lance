// Round 14 part 0: the test bed. Every scenario loads with its hand placements; each round's scenarios get their own checks.
import { describe, it, expect, afterEach } from 'vitest';
import { TUNE } from '../src/tune.ts';
import { G } from '../src/sim/state.ts';
import { T, canReach, tilesCrossed } from '../src/sim/world.ts';
import { SCENARIOS, scenarioByName, startScenario, leaveScenario, scenarioList } from '../src/sim/scenarios.ts';
import { playOut } from '../src/sim/autoplay.ts';
import { partHurt, partGone } from '../src/sim/combat.ts';

afterEach(() => leaveScenario());
const tile = (u) => [Math.floor(u.x / T), Math.floor(u.y / T)];
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y) / T;

describe('every scenario', () => {
  for (const s of SCENARIOS.filter(s => s.job)) it(`${s.name}: a rolled job through the forced scan, outside any contract`, () => { // R19
    startScenario(s);
    expect(G.tb).toBe(s); expect(G.ct).toBeNull();
    expect(G.scan.lvl).toBe(s.job.listen);
    expect(G.units.length).toBeGreaterThan(0);
    for (const m of G.lance) expect(canReach(Math.floor(m.x / T), Math.floor(m.y / T))).toBe(true);
  });
  for (const s of SCENARIOS.filter(s => !s.job)) it(`${s.name}: loads its placements, on reachable tiles, outside any contract`, () => {
    startScenario(s);
    expect(G.tb).toBe(s);
    expect(G.ct).toBeNull();
    expect(G.lance.filter((m, i) => !s.lance[i].lost).map(tile)).toEqual(s.lance.filter(l => !l.lost).map(l => l.tile)); // R16: a lost mech is off the map
    expect(G.units.map(tile)).toEqual(s.field.map(f => f.tile));
    expect(G.units.map(u => u.type)).toEqual(s.field.map(f => f.type));
    for (const t of [...s.lance.map(l => l.tile), ...s.field.map(f => f.tile), s.uplink]) expect(canReach(t[0], t[1])).toBe(true);
    expect(s.tryThis.length).toBeGreaterThan(10);
  });
  for (const s of SCENARIOS) it(`${s.name}: plays to an end with the scripted player (no stall)`, () => {
    startScenario(s); playOut(80);
    expect(G.mode).toBe('result');
  });
  it('the same seed plays the same hunt (RETRY)', () => {
    const s = SCENARIOS[0], run = () => { startScenario(s); playOut(80); const r = G.outcome + G.turn + G.kills; leaveScenario(); return r; };
    expect(run()).toBe(run());
  });
  it('scenario TUNE overrides are restored on leaving', () => {
    const before = TUNE.PACK_ENABLED;
    startScenario(scenarioByName('Earshot'));
    expect(TUNE.PACK_ENABLED).toBe(true);
    leaveScenario();
    expect(TUNE.PACK_ENABLED).toBe(before);
  });
  it('the list puts the newest round first', () => {
    const r = scenarioList().map(s => s.round);
    expect(r).toEqual(r.slice().sort((a, b) => b - a));
  });
});

describe('R13 scenarios', () => {
  it('Earshot: two patrols just outside SPRINT sound and inside 12 tiles, walled off from the start; uplink ~10 away', () => {
    startScenario(scenarioByName('Earshot'));
    const A = G.lance[0];
    expect(dist(A, G.up)).toBeGreaterThan(9); expect(dist(A, G.up)).toBeLessThan(12);
    for (const u of G.units) {
      expect(dist(A, u)).toBeGreaterThan(TUNE.SOUND_RANGE.SPRINT);
      expect(dist(A, u)).toBeLessThanOrEqual(12);
      expect(tilesCrossed(A.x, A.y, u.x, u.y, 1)).toBe(1); // a building in between
    }
  });
  it('Wounded: A has one leg gone (CREEP only), B is healthy, three patrols around them', () => {
    startScenario(scenarioByName('Wounded'));
    const [A, B] = G.lance;
    expect(partHurt(A, 'LEGS')).toBe(true); expect(partGone(A, 'LEGS')).toBe(false);
    expect(partHurt(B, 'LEGS')).toBe(false);
    expect(G.units.filter(u => u.type === 'PATROL').length).toBe(3);
  });
});
