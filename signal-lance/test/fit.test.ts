// R18 checkpoint 1: the fit (kit.ts) replaces load.* / hasRadar / passive / hasEcm without changing the game.
import { describe, it, expect } from 'vitest';
import { TUNE } from '../src/tune.ts';
import { G, makeUnit } from '../src/sim/state.ts';
import { DEFAULT_FIT, fitFromLoad, fitHits, fitRounds, fitShells, fitPool, has, radarOf, gunOf, mortarOf, plateCount, kitOf } from '../src/sim/kit.ts';
import { startHunt, LOAD_A } from './helpers.ts';

describe('parity: the default fit plays like the R17 DEFAULT_LOAD', () => {
  it('same hits, rounds, shells, Energy and plates', () => {
    expect(fitHits(DEFAULT_FIT)).toBe(3 + 1 * 3); // PLAYER_HITS + armour × ARMOUR_HITS
    expect(fitRounds(DEFAULT_FIT)).toBe(20);       // ammo 2 × 10
    expect(fitShells(DEFAULT_FIT)).toBe(0);
    expect(fitPool(DEFAULT_FIT)).toBe(TUNE.ENERGY_BASE);
    expect(plateCount(DEFAULT_FIT)).toBe(1);
  });
  it('same modules: passive, mask, ghost, gun; no radar, no mortar', () => {
    startHunt(1); const m = G.lance[1]; // B carries the default; A adds a mortar
    for (const t of ['PASSIVE', 'MASK', 'GHOST', 'GUN']) expect(has(m, t)).toBe(true);
    expect(has(m, 'RADAR')).toBe(false); expect(has(m, 'MORTAR')).toBe(false);
    expect(has(G.lance[0], 'MORTAR')).toBe(true); expect(G.lance[0].shells).toBe(6);
  });
  it('the rows carry the old TUNE numbers', () => {
    expect(radarOf({ items: kitOf(fitFromLoad({ radar: 1 })) })).toEqual({ range: 18, halfAng: 50, ap: 2, en: 25, emit: 30, sig: 12 });
    startHunt(1); const A = G.lance[0];
    expect(gunOf(A)).toEqual({ rounds: 20, range: 12, hit: 75, snd: 12 });
    expect(mortarOf(A)).toEqual({ shells: 6, ap: 2, snd: 14, min: 4, max: 18, scatter: 0.5, perUnc: 0.6 });
    expect(A.snd.SHOT).toBe(12); expect(A.snd.MORTAR).toBe(14);
  });
  it('the old picker numbers still turn into the same mech', () => {
    const f = fitFromLoad({ ...LOAD_A, armour: 3, cells: 2, radar: 1, ecm: 0 });
    expect(fitHits(f)).toBe(3 + 3 * 3); expect(fitPool(f)).toBe(TUNE.ENERGY_BASE + 2 * 50);
    expect(fitShells(f)).toBe(6);
  });
});

describe('parity: field units from FIELD_TYPES rows', () => {
  it('every variant has the R17 hits, rounds, Energy, radar and passive', () => {
    let i = 0;
    for (const [vk, V] of Object.entries(TUNE.FIELD_VARIANTS) as any) {
      const u = makeUnit(V.TYPE, i++, vk), F = { ...TUNE.FIELD_TYPES[V.TYPE], ...V.STATS };
      expect(u.maxHits).toBeGreaterThanOrEqual(F.BASE_HITS + F.ARMOUR * 3); // PART_MIN can add on top, as before
      expect(u.ammo).toBe(F.AMMO);
      expect(u.enMax).toBe(TUNE.ENERGY_BASE + F.CELLS * 50);
      expect(has(u, 'RADAR')).toBe(V.PULSE > 0);
      expect(has(u, 'PASSIVE')).toBe(!!F.PASSIVE);
      expect(u.snd.SHOT).toBe(V.SOUND.SHOT ?? 12);
    }
  });
  it('a turret or emplacement is a frame with no LEGS', () => {
    for (const t of ['TURRET', 'EMPLACEMENT']) expect(makeUnit(t, 0).fit.mounts.LEGS).toEqual([]);
    expect(makeUnit('PATROL', 0).fit.mounts.LEGS.length).toBeGreaterThan(0);
  });
});
