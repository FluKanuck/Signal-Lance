// Round 23 checkpoint A: the city. A seeded, connected node map of faction districts; path fuel; faction and broker jobs move
// standing by their deltas; the bands; what HATED and LIKED do (alert share, fuel price, danger, pay, intel); drift; the save.
import { describe, it, expect, afterEach } from 'vitest';
import { TUNE } from '../src/tune.ts';
import { G } from '../src/sim/state.ts';
import { newCompany, validCompany, takeOffer, endContract, fuelCost, rollMarket, cityTestCompany } from '../src/sim/company.ts';
import { takeJob } from '../src/sim/contract.ts';
import { newCity, hops, pathTo, pathFuel, band, settle, drift, dangerOf, fuelPriceAt, feeOf, cityAlertAdd, intelFrom, FACS, cityOffer } from '../src/sim/city.ts';
import { leaveScenario } from '../src/sim/scenarios.ts';

afterEach(() => { G.co = null; G.ct = null; G.crew = null; leaveScenario(); });
const set = (f: string, v: number) => { G.co.city.standing[f] = v; };

describe('the city map (R23 A)', () => {
  it('seeded: the same seed makes the same city', () => {
    expect(JSON.stringify(newCity(7))).toBe(JSON.stringify(newCity(7)));
    expect(JSON.stringify(newCity(7))).not.toBe(JSON.stringify(newCity(8)));
  });
  it('6-8 districts, every one reachable, 2-3 links each, three factions holding 2-3 districts each', () => {
    for (let seed = 1; seed <= 300; seed++) {
      const C = newCity(seed), N = C.districts.length;
      expect(N).toBeGreaterThanOrEqual(TUNE.CITY_DISTRICTS[0]); expect(N).toBeLessThanOrEqual(TUNE.CITY_DISTRICTS[1]);
      for (const d of C.districts) { expect(d.links.length).toBeGreaterThanOrEqual(2); expect(d.links.length).toBeLessThanOrEqual(3); expect(hops(C, 0, d.id)).toBeGreaterThanOrEqual(0); }
      for (const d of C.districts) for (const n of d.links) expect(C.districts[n].links).toContain(d.id); // links go both ways
      for (const f of FACS()) { const k = C.districts.filter(d => d.fac === f).length; expect(k).toBeGreaterThanOrEqual(2); expect(k).toBeLessThanOrEqual(3); }
      expect(C.at).toBeGreaterThanOrEqual(0); expect(C.at).toBeLessThan(N);
    }
  });
  it('path fuel = links jumped × CITY_FUEL_PER_LINK; the path walks real links', () => {
    const C = newCity(11);
    for (const d of C.districts) {
      const P = pathTo(C, C.at, d.id);
      expect(P.length - 1).toBe(hops(C, C.at, d.id));
      expect(pathFuel(C, C.at, d.id)).toBe(hops(C, C.at, d.id) * TUNE.CITY_FUEL_PER_LINK);
      for (let i = 1; i < P.length; i++) expect(C.districts[P[i - 1]].links).toContain(P[i]);
    }
  });
});

describe('offers in districts (R23 A)', () => {
  it('three offers, each away from the ship, against the district holder, fuel = the path, never all one danger', () => {
    for (let seed = 1; seed <= 200; seed++) {
      newCompany(seed); const C = G.co.city;
      expect(G.co.offers.length).toBe(TUNE.CONTRACTS_OFFERED);
      for (const o of G.co.offers) {
        expect(o.d).not.toBe(C.at); expect(o.tgt).toBe(C.districts[o.d].fac);
        expect(o.fuel).toBe(pathFuel(C, C.at, o.d)); expect(o.tier).toBe(dangerOf(o.tgt)); expect(o.fee).toBe(feeOf(o));
        if (o.kind === 'FACTION') { expect(o.emp).not.toBe(o.tgt); expect(FACS()).toContain(o.emp); } else expect(o.emp).toBe('');
      }
      expect(new Set(G.co.offers.map((o: any) => o.tier)).size).toBeGreaterThan(1);
    }
  });
  it('taking an offer jumps the ship there and logs [CITY] lines', () => {
    newCompany(5); const o = G.co.offers[0]; G.co.fuel = 10;
    expect(takeOffer(0)).toBe(true);
    expect(G.co.city.at).toBe(o.d); expect(G.co.fuel).toBe(10 - fuelCost(o));
    expect(G.co.news.filter((n: string) => n.startsWith('[CITY] ')).length).toBeGreaterThanOrEqual(2);
  });
});

describe('standing (R23 A)', () => {
  const fac = { kind: 'FACTION', emp: 'CORP', tgt: 'FOUNDRY' }, brk = { kind: 'BROKER', emp: '', tgt: 'SYND' };
  it('a completed faction job: employer + GAIN, target − LOSS; a broker job: target − BROKER_LOSS, nobody gains', () => {
    newCompany(1); const S = G.co.city.standing;
    settle(fac, 'COMPLETE');
    expect(S.CORP).toBe(TUNE.STANDING_EMPLOYER_GAIN); expect(S.FOUNDRY).toBe(-TUNE.STANDING_TARGET_LOSS); expect(S.SYND).toBe(0);
    newCompany(1); settle(brk, 'COMPLETE');
    expect(G.co.city.standing).toEqual({ CORP: 0, FOUNDRY: 0, SYND: -TUNE.STANDING_BROKER_LOSS });
  });
  it('a failed job moves no standing (only the drift)', () => {
    newCompany(1); set('CORP', 30); settle(fac, 'FAILED');
    expect(G.co.city.standing).toEqual({ CORP: 30 - TUNE.STANDING_DRIFT, FOUNDRY: 0, SYND: 0 });
  });
  it('drift moves every standing toward 0, never past it', () => {
    const C = { standing: { CORP: 12, FOUNDRY: -3, SYND: 0 } } as any;
    drift(C); expect(C.standing).toEqual({ CORP: 12 - TUNE.STANDING_DRIFT, FOUNDRY: 0, SYND: 0 });
  });
  it('clamped to STANDING_MIN..MAX', () => {
    newCompany(1); set('FOUNDRY', TUNE.STANDING_MIN + 1); set('CORP', TUNE.STANDING_MAX); settle(fac, 'COMPLETE');
    expect(G.co.city.standing.FOUNDRY).toBe(TUNE.STANDING_MIN); expect(G.co.city.standing.CORP).toBe(TUNE.STANDING_MAX);
  });
  it('the bands switch at their thresholds', () => {
    expect(band(TUNE.STANDING_HATED)).toBe('HATED'); expect(band(TUNE.STANDING_HATED + 1)).toBe('NEUTRAL');
    expect(band(TUNE.STANDING_LIKED)).toBe('LIKED'); expect(band(TUNE.STANDING_LIKED - 1)).toBe('NEUTRAL');
  });
  it('endContract settles the running offer and logs the change', () => {
    newCompany(3); G.co.fuel = 10; const o = G.co.offers[0]; takeOffer(0); G.co.news = [];
    endContract('COMPLETE');
    expect(G.co.city.last.length).toBeGreaterThan(0);
    expect(G.co.city.standing[o.tgt]).toBe(-(o.kind === 'FACTION' ? TUNE.STANDING_TARGET_LOSS : TUNE.STANDING_BROKER_LOSS));
    expect(G.co.news.some((n: string) => n.startsWith('[CITY] '))).toBe(true);
  });
});

describe('what standing does (R23 A)', () => {
  it('HATED: danger a step up (capped), fuel × HATED_FUEL_MULT in its districts, + HATED_ALERT of its field awake at the drop', () => {
    newCompany(4);
    expect(dangerOf('SYND')).toBe(TUNE.CITY_FACTIONS.SYND.danger);
    set('SYND', TUNE.STANDING_HATED); expect(dangerOf('SYND')).toBe(TUNE.CITY_FACTIONS.SYND.danger + TUNE.STANDING_HATED_DANGER);
    set('CORP', TUNE.STANDING_HATED); expect(dangerOf('CORP')).toBe(TUNE.DANGER_NAMES.length - 1);
    const d = G.co.city.districts.find((x: any) => x.fac === 'SYND');
    expect(fuelPriceAt(d.id)).toBe(Math.round(TUNE.FUEL_PRICE * TUNE.STANDING_HATED_FUEL_MULT));
    G.co.city.at = d.id; rollMarket(); expect(G.co.market.find((l: any) => l.k === 'fuel').price).toBe(Math.round(TUNE.FUEL_PRICE * TUNE.STANDING_HATED_FUEL_MULT));
  });
  it('HATED: a hunt against them drops with that share of the field awake (none at scan step 0 otherwise)', () => {
    const awake = (hate: boolean) => {
      newCompany(21); G.co.fuel = 10; G.scan = null;
      const o = G.co.offers[0]; if (hate) set(o.tgt, TUNE.STANDING_HATED);
      takeOffer(0); takeJob(0);
      return { add: cityAlertAdd(), n: G.scanCost.alert.length, units: G.units.length };
    };
    const a = awake(false), b = awake(true);
    expect(a.add).toBe(0); expect(a.n).toBe(0);
    expect(b.add).toBe(TUNE.STANDING_HATED_ALERT); expect(b.n).toBe(Math.round(TUNE.STANDING_HATED_ALERT * b.units));
  });
  it('LIKED: its own jobs pay × LIKED_PAY; fuel × LIKED_FUEL_MULT; a job against its enemy opens the scan with the intel layer', () => {
    newCompany(6);
    const o = { kind: 'FACTION', emp: 'CORP', tgt: 'FOUNDRY', tier: 1, hunts: 3 };
    const plain = feeOf(o); set('CORP', TUNE.STANDING_LIKED);
    expect(feeOf(o)).toBe(Math.round(TUNE.CONTRACT_FEE[1] * 3 * TUNE.CITY_FACTION_PAY * TUNE.STANDING_LIKED_PAY)); expect(feeOf(o)).toBeGreaterThan(plain);
    expect(feeOf({ ...o, kind: 'BROKER', emp: '' })).toBe(Math.round(TUNE.CONTRACT_FEE[1] * 3 * TUNE.CITY_BROKER_PAY)); // a broker job gets no bonus
    const d = G.co.city.districts.find((x: any) => x.fac === 'CORP');
    expect(fuelPriceAt(d.id)).toBe(Math.round(TUNE.FUEL_PRICE * TUNE.STANDING_LIKED_FUEL_MULT));
    expect(intelFrom({ kind: 'BROKER', tgt: 'SYND' })).toBe('CORP'); // CORP likes you; SYND is its enemy
    expect(intelFrom({ kind: 'BROKER', tgt: 'CORP' })).toBe('');     // no intel against the faction that likes you
  });
  it('LIKED intel: the drop lands with SHIP contacts the plain scan would not have', () => {
    const contacts = (like: boolean) => {
      newCompany(22); G.co.fuel = 10; G.scan = null;
      const i = 0, o = G.co.offers[i];
      if (like) set(FACS().find(f => f !== o.tgt)!, TUNE.STANDING_LIKED);
      takeOffer(i); takeJob(0);
      return { gift: G.scan.gift || '', n: G.pc.filter((c: any) => c.on && c.src === 'SCAN').length };
    };
    const a = contacts(false), b = contacts(true);
    expect(a.gift).toBe(''); expect(a.n).toBe(0);
    expect(b.gift).not.toBe(''); expect(b.n).toBeGreaterThan(0);
  });
});

describe('the save (R23 A)', () => {
  it('the company save round-trips the city and standing', () => {
    newCompany(9); set('CORP', 35); set('SYND', -50); G.co.city.at = G.co.offers[0].d;
    const back = JSON.parse(JSON.stringify({ co: G.co }));
    expect(validCompany(back.co)).toBe(true);
    expect(back.co.city).toEqual(G.co.city);
    expect(validCompany({ ...back.co, city: null })).toBe(false); // an R22 save (no city) offers NEW COMPANY
  });
  it('cityOffer never lands in the ship\'s district', () => {
    newCompany(2); let k = 1; const r = () => ((k = (k * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 100; i++) expect(cityOffer(r, 3).d).not.toBe(G.co.city.at);
  });
});

describe('test bed: Hated / Liked (R23 A)', () => {
  it('Hated: job 1 is against a faction that hates you: danger up, dear fuel where the ship sits, the field wakes', () => {

    cityTestCompany('Hated'); const o = G.co.offers[0], Y = G.co.city;
    expect(G.co.testbed).toBe('Hated'); expect(o.tgt).toBe('FOUNDRY'); expect(Y.districts[o.d].fac).toBe('FOUNDRY');
    expect(o.tier).toBe(Math.min(2, TUNE.CITY_FACTIONS.FOUNDRY.danger + TUNE.STANDING_HATED_DANGER));
    expect(G.co.market.find((l: any) => l.k === 'fuel').price).toBe(Math.round(TUNE.FUEL_PRICE * TUNE.STANDING_HATED_FUEL_MULT));
    expect(G.co.offers.filter((x: any) => x.d === o.d).length).toBe(1);
    takeOffer(0); takeJob(0); expect(G.scanCost.hated).toBe(TUNE.STANDING_HATED_ALERT);
  });
  it('Liked: the same job posted by the faction that likes you: the pay bonus, cheap fuel, their intel on the scan', () => {

    cityTestCompany('Liked'); const o = G.co.offers[0];
    expect(o.emp).toBe('CORP'); expect(o.fee).toBe(Math.round(TUNE.CONTRACT_FEE[o.tier] * 3 * TUNE.CITY_FACTION_PAY * TUNE.STANDING_LIKED_PAY));
    expect(G.co.market.find((l: any) => l.k === 'fuel').price).toBe(Math.round(TUNE.FUEL_PRICE * TUNE.STANDING_LIKED_FUEL_MULT));
    G.scan = null; takeOffer(0); takeJob(0); expect(G.scan.gift).toBe('CORP');
  });
});
