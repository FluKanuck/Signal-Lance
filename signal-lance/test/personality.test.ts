// Round 23 checkpoint B: runner personalities. Each contract pick follows its rule on a fixed offer set; the scripted lance's
// carry weight sends it back for a CRITICAL lancemate; the defaults are the R22 bot.
import { describe, it, expect, afterEach } from 'vitest';
import { TUNE } from '../src/tune.ts';
import { G } from '../src/sim/state.ts';
import { pickOffer, nextPatron, personality, seedRoll } from '../src/sim/personality.ts';
import { BOT, playOut } from '../src/sim/autoplay.ts';
import { scenarioByName, startScenario, leaveScenario } from '../src/sim/scenarios.ts';

afterEach(() => { Object.assign(BOT, { move: 'NORMAL', carry: false, bailLost: 1, push: 0, leaveCarried: false }); leaveScenario(); });
// a fixed offer set: rich HIGH faction job for CORP vs SYND; MEDIUM broker vs FOUNDRY; LOW faction job for FOUNDRY vs SYND; LOW broker vs CORP
const O = [
  { tier: 2, kind: 'FACTION', emp: 'CORP', tgt: 'SYND', fee: 600 },
  { tier: 1, kind: 'BROKER', emp: '', tgt: 'FOUNDRY', fee: 250 },
  { tier: 0, kind: 'FACTION', emp: 'FOUNDRY', tgt: 'SYND', fee: 200 },
  { tier: 0, kind: 'BROKER', emp: '', tgt: 'CORP', fee: 150 },
].map((o, i) => ({ o, i }));

describe('contract picks (R23 B)', () => {
  it('mercenary: the top fee', () => { expect(pickOffer('fee', O)!.i).toBe(0); });
  it('cautious: the lowest danger, a broker job first (--pick low is the same rule)', () => {
    expect(pickOffer('cautious', O)!.i).toBe(3); expect(pickOffer('low', O)!.i).toBe(3);
    expect(pickOffer('cautious', O.filter(x => x.i !== 3))!.i).toBe(2);
  });
  it('aggressive: the highest danger, a faction job first', () => {
    expect(pickOffer('aggressive', O)!.i).toBe(0);
    expect(pickOffer('aggressive', O.filter(x => x.i !== 0))!.i).toBe(1);
  });
  it('loyal: no patron = the top faction job; then its patron\'s jobs; else a job that doesn\'t hit the patron', () => {
    expect(pickOffer('loyal', O, '')!.i).toBe(0);
    expect(pickOffer('loyal', O, 'FOUNDRY')!.i).toBe(2);         // a job for the Foundry, over the richer ones
    expect(pickOffer('loyal', O, 'SYND')!.i).toBe(1);            // nothing for the Syndicate: the richest that doesn't hit it
    expect(pickOffer('loyal', [O[0], O[2]], 'SYND')!.i).toBe(0); // every job hits it: the top fee
    expect(nextPatron('', O[1].o)).toBe(''); expect(nextPatron('', O[0].o)).toBe('CORP'); expect(nextPatron('CORP', O[2].o)).toBe('CORP');
  });
  it('nothing in reach = no pick; every personality has a rule and weights', () => {
    expect(pickOffer('fee', [])).toBeNull();
    for (const k of ['cautious', 'aggressive', 'loyal', 'mercenary']) { const P = personality(k); expect(P.pick).toBeTruthy(); expect(['CREEP', 'NORMAL', 'SPRINT']).toContain(P.move); }
    expect(TUNE.BOT_PERSONALITY.cautious.carry).toBe(1);
  });
  it('seedRoll is deterministic and spread', () => {
    expect(seedRoll(5, 23)).toBe(seedRoll(5, 23));
    const v = Array.from({ length: 400 }, (_, i) => seedRoll(i * 7919, 23)); const lo = v.filter(x => x < 0.5).length;
    expect(lo).toBeGreaterThan(150); expect(lo).toBeLessThan(250);
  });
});

describe('the scripted lance goes back (R23 B, #101)', () => {
  it('Carry them out: with the carry weight on it picks up the CRITICAL operator; the R22 bot never does', () => {
    const run = (carry: boolean) => { let n = 0; for (let r = 0; r < 6; r++) { BOT.carry = carry; const s = scenarioByName('Carry them out')!; startScenario({ ...s, seed: s.seed + r }); playOut(80); if (G.lance.some((m: any) => m.crit && m.carriedBy)) n++; leaveScenario(); } return n; };
    expect(run(false)).toBe(0);
    expect(run(true)).toBeGreaterThanOrEqual(4);
  });
});
