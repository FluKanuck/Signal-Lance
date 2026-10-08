// Round 21 checkpoints 3 and 4: the books (credits, fuel, offers, wages, debt and the fold, parts and salvage, the market) and
// the ship (hardpoints, 13 modules each with one hook, a painted ship's hull hits).
import { describe, it, expect, afterEach } from 'vitest';
import { TUNE } from '../src/tune.ts';
import { G } from '../src/sim/state.ts';
import { T } from '../src/sim/world.ts';
import { newCompany, suitById, takeOffer, wages, wageOf, offerBlock, fuelCost, buy, buyBlock, holdCap, fuelMax, suitCap, opCap, buyMod, modBuyBlock, unfitBlock, fitMod,
  shipScan, shipAlertMult, freeItem, stuck, checkFold, endContract, thinBooksCompany, partsPerRepair, rebuildParts, benchFor, hasMod, suitCost, suitRefit, afterHunt, onSuitDown } from '../src/sim/company.ts';
import { takeJob, previewJob } from '../src/sim/contract.ts';
import { leaveScenario } from '../src/sim/scenarios.ts';
import { feeOf } from '../src/sim/city.ts';

afterEach(() => { G.co = null; G.ct = null; G.crew = null; leaveScenario(); });

describe('the books (R21 cp3)', () => {
  it('a new company: credits, fuel, parts, offers and a market; the kit on its suits is in the stores', () => {
    newCompany(31);
    expect(G.co.credits).toBe(TUNE.START_CREDITS); expect(G.co.fuel).toBe(TUNE.START_FUEL); expect(G.co.parts).toBe(TUNE.START_PARTS);
    expect(G.co.offers.length).toBe(TUNE.CONTRACTS_OFFERED); expect(G.co.market.length).toBeGreaterThanOrEqual(4);
    for (const o of G.co.offers) { expect(o.hunts).toBeGreaterThanOrEqual(TUNE.CONTRACT_HUNTS_RANGE[0]); expect(o.hunts).toBeLessThanOrEqual(TUNE.CONTRACT_HUNTS_RANGE[1]); expect(o.fee).toBe(feeOf(o)); } // R23: the city's kind multipliers
    expect(freeItem('autocannon')).toBe(0); expect(G.co.stores.autocannon).toBeGreaterThanOrEqual(3);
  });
  it('fix list 1: the offers are never all one danger', () => {
    for (let seed = 1; seed <= 300; seed++) {
      newCompany(seed); const t = G.co.offers.map((o: any) => o.tier);
      expect(new Set(t).size).toBeGreaterThan(1);
      for (const o of G.co.offers) expect(o.fee).toBe(feeOf(o));
    }
  });
  it('can’t take a contract without the fuel; taking one burns it and sets length, wins needed and danger', () => {
    newCompany(32); const o = G.co.offers[0];
    G.co.fuel = fuelCost(o) - 1; expect(offerBlock(0)).toBe('FUEL'); expect(takeOffer(0)).toBe(false);
    G.co.fuel = fuelCost(o); expect(takeOffer(0)).toBe(true);
    expect(G.co.fuel).toBe(0); expect(G.ct.hunts).toBe(o.hunts); expect(G.ct.need).toBe(Math.ceil(o.hunts * TUNE.CONTRACT_WIN_SHARE));
    expect(G.ct.fieldMult).toBe(TUNE.DANGER_FIELD[o.tier]);
  });
  it('danger scales the field', () => {
    newCompany(33); takeOffer(0, 1); G.ct.jobs[0].comp = 'Sweep';
    G.ct.fieldMult = 1; previewJob(0); const n1 = G.units.length;
    G.ct.fieldMult = TUNE.DANGER_FIELD[2]; previewJob(0); expect(G.units.length).toBeGreaterThan(n1);
    G.ct.fieldMult = TUNE.DANGER_FIELD[0]; previewJob(0); expect(G.units.length).toBeLessThan(n1);
  });
  it('wages (more for veterans) and upkeep are charged when a contract ends', () => {
    newCompany(34); G.co.ops[0].lvl = 3;
    expect(wageOf(G.co.ops[0])).toBe(Math.round(TUNE.WAGE_OP * (1 + 2 * TUNE.WAGE_LEVEL_MULT)));
    const c0 = G.co.credits, w = wages(); G.ct = null; endContract('FAILED');
    expect(G.co.credits).toBe(c0 - w - TUNE.UPKEEP_SHIP);
  });
  it('debt once, then the fold', () => {
    newCompany(35); G.ct = null;
    G.co.credits = wages() + TUNE.UPKEEP_SHIP - 50; endContract('FAILED');
    expect(G.co.credits).toBe(-50); expect(G.co.debt).toBe(true); expect(G.co.folded).toBe('');
    endContract('FAILED'); expect(G.co.folded).not.toBe('');
    newCompany(36); G.ct = null; G.co.credits = -TUNE.DEBT_LIMIT; endContract('FAILED'); expect(G.co.folded).toMatch(/limit/);
  });
  it('salvage goes into the hold, capped', () => {
    newCompany(37); takeOffer(0, 1); takeJob(0);
    G.co.parts = holdCap() - 1; G.kills = 3; G.outcome = 'WIN CLEAR'; afterHunt();
    expect(G.co.parts).toBe(holdCap());
    expect(G.co.news.some(n => /hold is full/.test(n))).toBe(true);
  });
  it('repairs take parts and credits', () => {
    newCompany(38); const A = suitById('A'); A.carry.parts.LEGS -= 1; A.carry.hits -= 1;
    const p0 = G.co.parts, c0 = G.co.credits; expect(suitRefit('A', 'repair')).toBe(true);
    expect(G.co.parts).toBe(p0 - TUNE.PARTS_PER_REPAIR); expect(G.co.credits).toBe(c0 - TUNE.REPAIR_CR);
  });
  it('the market: parts into the hold (capped), fuel into the tank (capped), items into the stores', () => {
    newCompany(39); G.co.credits = 5000;
    const iP = G.co.market.findIndex(l => l.k === 'parts'), iF = G.co.market.findIndex(l => l.k === 'fuel'), iI = G.co.market.findIndex(l => l.k === 'item');
    G.co.parts = holdCap(); expect(buyBlock(iP)).toBe('HOLD');
    G.co.parts = 0; expect(buy(iP)).toBe(true); expect(G.co.parts).toBe(1);
    G.co.fuel = fuelMax(); expect(buyBlock(iF)).toBe('TANK');
    const id = G.co.market[iI].id, f0 = freeItem(id); expect(buy(iI)).toBe(true); expect(freeItem(id)).toBe(f0 + 1);
  });
  it('a 4th ExoS needs a free bay (cp4: a second SUIT BAY)', () => {
    newCompany(40); G.co.credits = 5000;
    G.co.market.push({ k: 'suit', qty: 1, price: TUNE.COST_SUIT }); const i = G.co.market.length - 1;
    expect(suitCap()).toBe(3); expect(buyBlock(i)).toBe('BAY');
    expect(buyMod('SUIT_BAY')).toBe(true); expect(suitCap()).toBe(4);
    expect(buy(i)).toBe(true); expect(G.co.suits.map(s => s.id)).toEqual(['A', 'B', 'C', 'D']);
    expect(unfitBlock('SUIT_BAY')).toBe('SUITS');
  });
  it('a company that can’t reach any contract folds', () => {
    newCompany(41); G.ct = null; G.co.fuel = 0; G.co.credits = 0;
    expect(stuck()).toMatch(/fuel/); checkFold(); expect(G.co.folded).toMatch(/fuel/);
  });
  it('Thin books: in debt, three offers (rich and far, safe and poor, mid), never saved', () => {
    thinBooksCompany();
    expect(G.co.debt).toBe(true); expect(G.co.credits).toBeLessThan(0); expect(G.co.testbed).toBe('Thin books');
    const [rich, safe, mid] = G.co.offers;
    expect(rich.fee).toBeGreaterThan(mid.fee); expect(mid.fee).toBeGreaterThan(safe.fee);
    expect(rich.fuel).toBeGreaterThan(safe.fuel);
    G.ct = null; for (let i = 0; i < 3; i++) expect(offerBlock(i)).toBe('');
  });
});

describe('the ship (R21 cp4)', () => {
  it('7 hardpoints; a new company starts with a SUIT BAY (3 suits); one of each module, SUIT BAYs many', () => {
    newCompany(50); G.co.credits = 99999;
    expect(G.co.ship.fit).toEqual(['SUIT_BAY']);
    for (const id of Object.keys(TUNE.SHIP_MODULES)) if (id !== 'SUIT_BAY') expect(buyMod(id)).toBe(true);
    expect(Object.keys(TUNE.SHIP_MODULES).length).toBe(13);
    expect(G.co.ship.fit.length).toBe(TUNE.SHIP_HARDPOINTS); expect(G.co.ship.stored.length).toBe(13 - TUNE.SHIP_HARDPOINTS);
    expect(modBuyBlock('MEDBAY')).toBe('OWNED'); expect(modBuyBlock('SUIT_BAY')).toBe('');
    expect(fitMod(G.co.ship.stored[0])).toBe(false); // no free hardpoint
  });
  // each module changes its own hook and nothing else
  const hooks = () => ({ scanR: shipScan('RADAR').speed, scanRL: shipScan('RADAR').loud, scanT: shipScan('THERMAL').speed, scanE: shipScan('EM').speed, alert: shipAlertMult(), bays: suitCap(),
    parts: partsPerRepair(), rebuild: rebuildParts(), bench: benchFor(), hold: holdCap(), fuel: fuelMax(), jump: fuelCost({ fuel: 4 }), ops: opCap(), arm: suitCost('rounds').parts, hull: hasMod('HULL_ARMOUR') });
  const OWN = { RADAR_ARRAY: ['scanR', 'scanRL'], THERMAL_POD: ['scanT'], EM_SUITE: ['scanE'], QUIET_DROP: ['alert'], SUIT_BAY: ['bays'], REPAIR_BAY: ['parts', 'rebuild'], MEDBAY: ['bench'],
    SALVAGE_HOLD: ['hold'], ARMOURY: ['arm'], FUEL_TANKS: ['fuel'], ENGINES: ['jump'], HULL_ARMOUR: ['hull'], BERTHS: ['ops'] };
  for (const id of Object.keys(OWN)) it(`${id} changes only its own hook`, () => {
    newCompany(51); G.co.ship.fit = []; G.ct = { status: 'ACTIVE' }; // a company hunt (the scan hooks act only then)
    const a = hooks(); G.co.ship.fit = [id]; const b = hooks();
    for (const k of Object.keys(a)) if (OWN[id].includes(k)) expect(b[k], k).not.toEqual(a[k]); else expect(b[k], k).toEqual(a[k]);
  });
  it('the scan modules act only in a company contract (never the test bed or PLAY SEED)', () => {
    newCompany(52); G.co.ship.fit = ['RADAR_ARRAY']; G.ct = null;
    expect(shipScan('RADAR').speed).toBe(1);
  });
  it('a painted ship rolls a hull hit; HULL ARMOUR soaks one per contract', () => {
    let hit = 0, soak = 0;
    for (let seed = 60; seed < 90; seed++) {
      G.ct = null; newCompany(seed); G.co.ship.fit = ['SUIT_BAY', 'HULL_ARMOUR']; G.co.fuel = 9; expect(takeOffer(0, 2)).toBe(true); takeJob(0);
      G.scanCost = { painted: true }; G.outcome = 'BAIL'; G.kills = 0; afterHunt();
      const first = G.scanCost.hull;
      if (first !== 'soaked') { expect(first).toBe('missed'); continue; }
      soak++;
      G.scanCost = { painted: true }; afterHunt();
      if (G.scanCost.hull === 'hit') { hit++; expect(G.co.hullOwed).toBe(TUNE.SHIP_HIT_COST); }
    }
    expect(soak).toBeGreaterThan(0); expect(hit).toBeGreaterThan(0);
  });
  it('hull hits are paid when the contract ends', () => {
    newCompany(61); G.ct = null; G.co.hullOwed = TUNE.SHIP_HIT_COST; const c0 = G.co.credits, w = wages();
    endContract('FAILED'); expect(G.co.credits).toBe(c0 - w - TUNE.UPKEEP_SHIP - TUNE.SHIP_HIT_COST); expect(G.co.hullOwed).toBe(0);
  });
  it('MEDBAY may pull a CRITICAL operator left behind out (seeded), and shortens the bench', () => {
    let saved = 0;
    for (let seed = 70; seed < 100; seed++) {
      newCompany(seed); G.co.ship.fit = ['MEDBAY']; const [a, b] = G.co.ops;
      const A: any = { id: 'A', op: a, x: 0, y: 0, dead: false }, B: any = { id: 'B', op: b, x: 9 * T, y: 0, dead: false };
      G.lance = [A, B]; onSuitDown(B); B.dead = true;
      G.outcome = 'BAIL'; G.units = [{}]; G.kills = 0; G.ct = { hunt: 1 }; afterHunt();
      if (b.status === 'BENCH') { saved++; expect(b.bench).toBe(TUNE.OP_BENCH - TUNE.MOD_BENCH); }
    }
    expect(saved).toBeGreaterThan(0); expect(saved).toBeLessThan(30);
  });
});
