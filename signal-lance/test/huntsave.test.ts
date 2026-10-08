// SAVE & QUIT: a hunt saved part-way and put back plays out exactly as the uninterrupted hunt does.
import { describe, it, expect, afterEach } from 'vitest';
import { G } from '../src/sim/state.ts';
import { playOut } from '../src/sim/autoplay.ts';
import { snapshotHunt, restoreHunt, encode, decode, huntSaveBlock } from '../src/sim/huntsave.ts';
import { newCompany, startCompanyContract } from '../src/sim/company.ts';
import { takeJob } from '../src/sim/contract.ts';
import { startHunt } from './helpers.ts';

afterEach(() => { G.co = null; G.ct = null; });
const finger = () => JSON.stringify({ mode: G.mode, outcome: G.outcome, turn: G.turn, time: Math.round(G.time * 1000), kills: G.kills,
  lance: G.lance.map(m => [m.id, m.hits, m.ap, Math.round(m.en * 100), Math.round(m.x), Math.round(m.y), !!m.dead, !!m.out]),
  units: G.units.map(u => [u.id, u.hits, Math.round(u.x), Math.round(u.y), !!u.dead, u.state]), shots: G.shotLog.length });

describe('hunt save (SAVE & QUIT)', () => {
  it('encode/decode keeps shared references, array extras, typed arrays and odd numbers', () => {
    const a: any = [1, 2]; a.bi = 3; const shared = { k: 1 };
    const back = decode(JSON.parse(JSON.stringify(encode({ a, x: shared, y: shared, t: new Float32Array([1.5]), n: NaN, u: undefined, s: new Set([shared]) }))));
    expect(back.x).toBe(back.y); expect(back.a.bi).toBe(3); expect(back.t[0]).toBe(1.5); expect(Number.isNaN(back.n)).toBe(true);
    expect('u' in back && back.u === undefined).toBe(true); expect([...back.s][0]).toBe(back.x);
  });
  for (const [map, seed, cut] of [['hive', 3, 4], ['blocks', 5, 3], ['blocks', 9, 6]] as const) {
    it(`a ${map} hunt (seed ${seed}) saved at turn ${cut} and restored plays out the same`, () => {
      startHunt(seed, undefined, map);
      playOut(cut);                                     // stops wherever turn ${cut} ends (often mid enemy phase: the strict case)
      expect(G.mode).toBe('hunt');                      // saved mid-hunt
      const save = JSON.stringify(snapshotHunt());      // as stored
      playOut(60); const straight = finger();
      startHunt(seed + 100, undefined, map === 'hive' ? 'blocks' : 'hive'); // scramble everything first
      restoreHunt(JSON.parse(save));
      expect(G.turn).toBeGreaterThan(0);
      playOut(60);
      expect(finger()).toBe(straight);
    });
  }
  it('a company contract hunt (operators shared with the company) saved and restored plays out the same, books included', () => {
    newCompany(31); startCompanyContract(12, 2); takeJob(0);
    playOut(3); expect(G.mode).toBe('hunt');
    const save = JSON.stringify(snapshotHunt());
    playOut(80); const straight = finger() + JSON.stringify([G.ct.results, G.co.credits, G.co.ops.map(o => [o.name, o.xp, o.status])]);
    newCompany(99); startCompanyContract(1, 1); takeJob(0); playOut(2);   // a different company and hunt in between
    restoreHunt(JSON.parse(save));
    expect(G.lance.every(m => !m.op || G.co.ops.includes(m.op))).toBe(true); // the crew are the company's own operators again
    playOut(80);
    expect(finger() + JSON.stringify([G.ct.results, G.co.credits, G.co.ops.map(o => [o.name, o.xp, o.status])])).toBe(straight);
  });
  it('saving twice in a row gives the same save (nothing lost on the way through)', () => {
    startHunt(7, undefined, 'blocks'); playOut(2);
    const a = JSON.stringify(snapshotHunt()); restoreHunt(JSON.parse(a));
    expect(JSON.stringify(snapshotHunt())).toBe(a);
  });
  it('is offered only on your own move in a company contract hunt', () => {
    startHunt(3);
    expect(huntSaveBlock()).toBe('NO CONTRACT');
    newCompany(11); G.ct = { status: 'ACTIVE', hunt: 1 };
    G.phase = 'PLAYER'; G.act = null; expect(huntSaveBlock()).toBe('');
    G.phase = 'ENEMY'; expect(huntSaveBlock()).toBe('WAIT');
  });
});
