// Rules that held before Round 13 and should keep holding. If one of these breaks, a change leaked.
import { describe, it, expect } from 'vitest';
import { TUNE } from '../src/tune.ts';
import { G } from '../src/sim/state.ts';
import { rand, setSeed } from '../src/sim/rng.ts';
import { planMove, shootBlock, beginUnit } from '../src/sim/turns.ts';
import { hitChance, damagePart, partGone } from '../src/sim/combat.ts';
import { observe } from '../src/sim/sensors.ts';
import { T } from '../src/sim/world.ts';
import { startHunt, playHunt } from './helpers.ts';

describe('determinism', () => {
  it('the RNG replays from a seed', () => {
    setSeed(42); const a = [rand(), rand(), rand()];
    setSeed(42); expect([rand(), rand(), rand()]).toEqual(a);
  });
  it('one seed plays the same hunt twice', () => {
    for (const seed of [1, 7, 13]) expect(playHunt(seed)).toEqual(playHunt(seed));
  });
  it('every composition finishes inside 80 rounds (no stalls)', () => {
    for (const c of TUNE.FIELD_COMPOSITIONS) for (const seed of [1, 2, 3]) expect(playHunt(seed, c.NAME).outcome).not.toBe('STALL');
  });
});

describe('turns: AP and Energy', () => {
  it('a unit gains AP_PER_TURN and Energy regen at the start of its activation, capped', () => {
    startHunt(1); const m = G.lance[0];
    m.ap = 0; m.en = 0; beginUnit(m);
    expect(m.ap).toBe(TUNE.AP_PER_TURN);
    expect(m.en).toBe(TUNE.ENERGY_REGEN);
    m.ap = TUNE.AP_BANK_MAX; beginUnit(m);
    expect(m.ap).toBe(TUNE.AP_BANK_MAX);
  });
});

describe('moves', () => {
  it('each mode buys MOVE_TILES_PER_AP tiles per AP', () => {
    startHunt(1); const m = G.lance[0]; m.ap = 1; m.en = 100;
    for (const mode of ['CREEP', 'NORMAL', 'SPRINT']) {
      const pl = planMove(m, m.x + 20 * T, m.y, mode);
      expect(pl.path).not.toBeNull();
      expect(pl.len).toBeLessThanOrEqual(TUNE.MOVE_TILES_PER_AP[mode] + 1e-6);
      expect(pl.ap).toBe(1);
    }
  });
  it('a mech has two legs', () => {
    startHunt(1);
    expect(G.lance[0].parts.LEGS).toBe(TUNE.PART_MIN.LEGS);
  });
  it('one leg gone = CREEP only (R13 test 2)', () => {
    startHunt(1); const m = G.lance[0]; m.ap = 4; m.en = 100;
    damagePart(m, 'LEGS', 1);
    expect(partGone(m, 'LEGS')).toBe(false);
    expect(planMove(m, m.x + 8 * T, m.y, 'NORMAL').why).toBe('LEGS');
    const pl = planMove(m, m.x + 8 * T, m.y, 'CREEP');
    expect(pl.len).toBeCloseTo(m.ap * TUNE.MOVE_TILES_PER_AP.CREEP, 0);
  });
  it('both legs gone = CREEP at LEGS_GONE_MULT the distance', () => {
    startHunt(1); const m = G.lance[0]; m.ap = 4; m.en = 100;
    damagePart(m, 'LEGS', m.parts.LEGS);
    expect(partGone(m, 'LEGS')).toBe(true);
    const pl = planMove(m, m.x + 20 * T, m.y, 'CREEP');
    expect(pl.path).not.toBeNull();
    expect(pl.len).toBeLessThanOrEqual(m.ap * TUNE.MOVE_TILES_PER_AP.CREEP * TUNE.LEGS_GONE_MULT + 1e-6);
  });
});

describe('shots', () => {
  it('the lock rule gives a one-word reason', () => {
    startHunt(1); const m = G.lance[0], e = G.units[0];
    expect(shootBlock(m, null, TUNE.PLAYER_FIRE_UNC, TUNE.PLAYER_FIRE_RANGE)).toBe('NONE');
    m.ap = 4; m.turnShots = 0;
    const c = observe(G.pc, e.id, m.x + 3 * T, m.y, 5 * T, 0, 0, true, true);
    expect(shootBlock(m, c, TUNE.PLAYER_FIRE_UNC, TUNE.PLAYER_FIRE_RANGE)).toBe('FUZZY');
    damagePart(m, 'WEAPON', m.parts.WEAPON);
    expect(shootBlock(m, c, TUNE.PLAYER_FIRE_UNC, TUNE.PLAYER_FIRE_RANGE)).toBe('WPN');
  });
  it('hit chance stays inside HIT_MIN..HIT_MAX', () => {
    startHunt(1); const m = G.lance[0], e = G.units[0];
    const near = hitChance(m, e, { tx: m.x + T, ty: m.y });
    const far = hitChance(m, e, { tx: m.x + 60 * T, ty: m.y });
    for (const h of [near, far]) { expect(h.pct).toBeGreaterThanOrEqual(TUNE.HIT_MIN); expect(h.pct).toBeLessThanOrEqual(TUNE.HIT_MAX); }
    expect(far.pct).toBeLessThan(near.pct);
  });
});
