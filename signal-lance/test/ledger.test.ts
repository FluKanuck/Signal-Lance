// R24 fix list 7, 8, 9 (C20, C06, C16): the contract's books add up on every ending, and keep the end's news.
import { describe, it, expect, afterEach } from 'vitest';
import { G } from '../src/sim/state.ts';
import { newCompany, startCompanyContract, endContract, pullContract } from '../src/sim/company.ts';
import { takeJob, rollJobs } from '../src/sim/contract.ts';
import { playOut } from '../src/sim/autoplay.ts';

afterEach(() => { G.co = null; G.ct = null; });
const sums = (L: any) => L.start + L.earned - L.spent + L.fee - L.wages - L.upkeep - (L.hull || 0);

describe('contract books (R24)', () => {
  for (const seed of [3, 8, 21]) it(`a played-out contract's lines sum to the credits after (seed ${seed})`, () => {
    newCompany(seed); startCompanyContract(seed * 7, 2);
    for (let k = 0; k < 4 && G.ct.status === 'ACTIVE'; k++) { if (k) rollJobs(); takeJob(0); playOut(80); }
    const L = G.co.ledger;
    expect(G.ct.status).not.toBe('ACTIVE');
    expect(sums(L)).toBe(L.after);
    expect(L.after).toBe(G.co.credits);
    expect(Array.isArray(L.news)).toBe(true);
    if (G.co.folded) expect(L.news.some((n: string) => n.includes(G.co.folded))).toBe(true); // the fold reason reaches the screen
  });
  it('a bailed contract sums too, pays no fee, and keeps its news', () => {
    newCompany(5); startCompanyContract(40, 3); takeJob(0); playOut(2);
    pullContract(); endContract('QUIT');
    const L = G.co.ledger;
    expect(L.fee).toBe(0); expect(sums(L)).toBe(L.after); expect(L.news.length).toBeGreaterThan(0);
  });
});
