// QA panel step 1: the rule invariants the harness checks after every tester action. They must stay quiet through
// normal play (a false alarm becomes a false bug in the QA report) and speak up when the state is broken.
import { describe, it, expect, afterEach } from 'vitest';
import { G } from '../src/sim/state.ts';
import { newCompany } from '../src/sim/company.ts';
import { playOut } from '../src/sim/autoplay.ts';
import { checkInvariants } from '../src/sim/invariants.ts';
import { startHunt } from './helpers.ts';

afterEach(() => { G.co = null; });

describe('QA invariants', () => {
  it('stay quiet through scripted hunts (both maps, every turn)', () => {
    for (const map of ['hive', 'blocks']) for (let seed = 1; seed <= 6; seed++) {
      startHunt(seed, undefined, map);
      const seen: string[] = [];
      playOut(60, () => { for (const v of checkInvariants()) seen.push(map + ' seed ' + seed + ' T' + G.turn + ': ' + v); });
      seen.push(...checkInvariants());
      expect(seen).toEqual([]);
    }
  });
  it('stay quiet on a new company', () => {
    newCompany(4242);
    expect(checkInvariants()).toEqual([]);
  });
  it('catch broken state', () => {
    startHunt(3);
    const m = G.lance[0];
    m.ap = -1; m.en = NaN; G.units[0].x = -500;
    const v = checkInvariants();
    expect(v.some(s => s.includes('suit ' + m.id) && s.includes('AP'))).toBe(true);
    expect(v.some(s => s.includes('energy'))).toBe(true);
    expect(v.some(s => s.includes('off the map'))).toBe(true);
    newCompany(1); G.co.fuel = -2;
    expect(checkInvariants().some(s => s.includes('fuel below zero'))).toBe(true);
  });
});
