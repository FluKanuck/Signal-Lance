// Round 21: the company. Checkpoint 1: operators (skills, XP and levels, CRITICAL → carried = benched / left = KIA, recruits),
// the save round-trip, and that a contract runs inside a company (and byte-identically without one).
import { describe, it, expect, afterEach } from 'vitest';
import { TUNE } from '../src/tune.ts';
import { G } from '../src/sim/state.ts';
import { T } from '../src/sim/world.ts';
import { startCompanyContract, pullContract, setSuitFit, suitRefit, suitRefitBlock, cycleSeat, autoCrew, lanceSize, suitById, newCompany, validCompany, afterHunt, endContract, fateOf, noteCarry, onSuitDown, hire, hireBlock, seat, fillCrew, levelOf, skillVal, lanceTech, crewForHunt } from '../src/sim/company.ts';
import { newContract, takeJob, rollJobs } from '../src/sim/contract.ts';
import { G as G2, newHunt, rollEnemy } from '../src/sim/state.ts';
import { HANGAR_TEMPLATES, DEFAULT_FIT } from '../src/sim/kit.ts';
import { scenarioByName, startScenario, leaveScenario } from '../src/sim/scenarios.ts';
import { playOut } from '../src/sim/autoplay.ts';
import { hitChance } from '../src/sim/combat.ts';
import { makeSound, hearSounds } from '../src/sim/sound.ts';
import { noteActEnd, obsOf } from '../src/sim/ids.ts';
import { endPlayerTurn, updateShells } from '../src/sim/turns.ts';
import { startHunt, LOAD, LOAD_A } from './helpers.ts';

afterEach(() => { G.co = null; G.ct = null; G.crew = null; leaveScenario(); });
const op = (skill: string, lvl = 1, extra = {}) => ({ id: 'X' + skill + lvl, name: 'Test ' + skill, skill, xp: 0, lvl, status: 'OK', bench: 0, hunts: 0, hurtIn: -1, ...extra });
// A finished hunt the company reads: lance mechs (with ops), outcome, field, hunt number
function fakeHunt(lance: any[], outcome = 'WIN UPLINK', units = [{}], kills = 0) {
  G.lance = lance; G.outcome = outcome; G.units = units; G.kills = kills; G.ct = { hunt: 1 };
}

describe('the company (R21 cp1)', () => {
  it('a new company: START_OPS operators, two seated, recruits on offer, a code', () => {
    const C = newCompany(12345);
    expect(C.ops.length).toBe(TUNE.START_OPS);
    expect(C.recruits.length).toBe(TUNE.RECRUITS_OFFERED);
    expect(C.crew.A && C.crew.B && C.crew.A !== C.crew.B).toBeTruthy();
    expect(new Set([...C.ops, ...C.recruits].map(o => o.name)).size).toBe(C.ops.length + C.recruits.length); // no two share a name
    for (const o of C.ops) expect(TUNE.OP_SKILLS).toContain(o.skill);
    expect(C.code).toBe((12345).toString(36).toUpperCase());
  });
  it('the same seed makes the same company', () => {
    const a = JSON.stringify(newCompany(77)), b = JSON.stringify(newCompany(77));
    expect(a).toBe(b);
  });
  it('round-trips through save / load identically (after a played contract)', () => {
    newCompany(9);
    newContract(3, [{ ...LOAD_A }, { ...LOAD }], 2);
    while (G.ct.status === 'ACTIVE') { takeJob(0); playOut(80); if (G.ct.status === 'ACTIVE') rollJobs(); }
    const saved = JSON.stringify({ co: G.co, ct: G.ct }), back = JSON.parse(saved);
    expect(validCompany(back.co)).toBe(true);
    expect(back.co).toEqual(G.co);
    expect(JSON.stringify(back)).toBe(saved);
    expect(validCompany({ ...back.co, v: 0 })).toBe(false); // a shape mismatch offers NEW COMPANY
  });
  it('XP per hunt survived (+ a win), levels at OP_LEVELS', () => {
    newCompany(1); const o = G.co.ops[0];
    fakeHunt([{ id: 'A', op: o }], 'WIN UPLINK'); afterHunt();
    expect(o.xp).toBe(TUNE.OP_XP_HUNT + TUNE.OP_XP_WIN); expect(o.hunts).toBe(1);
    fakeHunt([{ id: 'A', op: o }], 'BAIL'); afterHunt();
    expect(o.xp).toBe(2 * TUNE.OP_XP_HUNT + TUNE.OP_XP_WIN);
    expect(o.lvl).toBe(levelOf(o.xp));
    expect(levelOf(TUNE.OP_LEVELS[0] - 1)).toBe(1); expect(levelOf(TUNE.OP_LEVELS[0])).toBe(2); expect(levelOf(TUNE.OP_LEVELS[1])).toBe(3);
    expect(G.co.news.some(n => /veteran/.test(n))).toBe(o.lvl >= 2);
  });
  it('CRITICAL and carried by a standing lancemate = benched OP_BENCH contracts; left behind = KIA (memorial)', () => {
    newCompany(2); const [a, b] = G.co.ops;
    const A: any = { id: 'A', op: a, x: 0, y: 0, dead: false }, B: any = { id: 'B', op: b, x: T, y: 0, dead: false };
    G.lance = [A, B]; onSuitDown(B); B.dead = true;
    expect(B.crit).toBe(true);
    noteCarry(A); expect(B.carriedBy).toBe('A');
    fakeHunt([A, B], 'BAIL'); expect(fateOf(B)).toBe('SAVED'); afterHunt();
    expect(b.status).toBe('BENCH'); expect(b.bench).toBe(TUNE.OP_BENCH);
    // left behind: nobody carries it, field not cleared
    newCompany(3); const [c, d] = G.co.ops;
    const C2: any = { id: 'A', op: c, x: 0, y: 0, dead: false }, D: any = { id: 'B', op: d, x: 5 * T, y: 0, dead: false };
    G.lance = [C2, D]; onSuitDown(D); D.dead = true; noteCarry(C2);
    expect(D.carriedBy).toBe(''); // 5 tiles is too far
    fakeHunt([C2, D], 'BAIL'); expect(fateOf(D)).toBe('KIA'); afterHunt();
    expect(G.co.ops.includes(d)).toBe(false); expect(G.co.memorial[0].name).toBe(d.name); expect(G.co.rec.kia).toBe(1);
  });
  it('a carrier that goes down drops who it carried; a cleared field recovers everyone', () => {
    newCompany(4); const [a, b] = G.co.ops;
    const A: any = { id: 'A', op: a, x: 0, y: 0, dead: false }, B: any = { id: 'B', op: b, x: T, y: 0, dead: false };
    G.lance = [A, B]; onSuitDown(B); B.dead = true; noteCarry(A);
    onSuitDown(A); A.dead = true;
    expect(B.carriedBy).toBe('');
    fakeHunt([A, B], 'LOSS', [{}], 0); expect(fateOf(B)).toBe('KIA');
    fakeHunt([A, B], 'WIN CLEAR', [{}], 1); expect(fateOf(B)).toBe('SAVED'); expect(fateOf(A)).toBe('SAVED');
  });
  it('the bench counts down once per contract, not in the contract it was earned', () => {
    newCompany(5); const o = G.co.ops[0];
    o.status = 'BENCH'; o.bench = 2; o.hurtIn = G.co.n;
    endContract('COMPLETE'); expect(o.bench).toBe(2);
    endContract('FAILED'); expect(o.bench).toBe(1);
    endContract('COMPLETE'); expect(o.bench).toBe(0); expect(o.status).toBe('OK');
    expect(G.co.rec.contracts).toBe(3);
  });
  it('a benched operator gives up its seat (cp2: the seat stays empty until you pick someone)', () => {
    newCompany(6); const A = G.co.crew.A;
    G.co.ops.find(o => o.id === A).status = 'BENCH';
    fillCrew();
    expect(G.co.crew.A).toBe('');
    expect(seat(A, 'B')).toBe(false); // can't seat a benched operator
  });
  it('recruits: hire up to OP_CAP; new recruits after each contract', () => {
    newCompany(7);
    expect(hireBlock(0)).toBe(G.co.ops.length >= TUNE.OP_CAP ? 'FULL' : '');
    G.co.ops.pop();
    const r = G.co.recruits[0];
    expect(hire(0)).toBe(true); expect(G.co.ops.includes(r)).toBe(true);
    const before = G.co.recruits.map(o => o.name).join();
    endContract('COMPLETE');
    expect(G.co.recruits.length).toBe(TUNE.RECRUITS_OFFERED); expect(G.co.recruits.map(o => o.name).join()).not.toBe(before);
  });
});

describe('operator skills: one hook each (R21 cp1)', () => {
  it('STEADY AIM adds SKILL_AIM to the shooter’s hit chance', () => {
    startHunt(1);
    const A = G.lance[0], u = G.units[0], c = { tx: u.x, ty: u.y };
    const base = hitChance(A, u, c).pct;
    A.op = op('AIM', 1);
    const h = hitChance(A, u, c);
    expect(h.aim).toBe(TUNE.SKILL_AIM[0]);
    expect(h.pct).toBe(Math.min(TUNE.HIT_MAX, Math.max(base, h.pct))); expect(h.pct).toBeGreaterThanOrEqual(base);
    A.op = op('AIM', 3); expect(hitChance(A, u, c).aim).toBe(TUNE.SKILL_AIM[2]);
  });
  it('QUIET MOVER muffles moves, not shots', () => {
    startHunt(1);
    const A = G.lance[0];
    A.sound = 0; makeSound(A, 'NORMAL'); const plain = A.sound;
    A.op = op('QUIET', 1); A.sound = 0; makeSound(A, 'NORMAL');
    expect(A.sound).toBeCloseTo(plain * TUNE.SKILL_QUIET[0]);
    A.sound = 0; makeSound(A, 'SHOT'); const shot = A.sound; A.op = null; A.sound = 0; makeSound(A, 'SHOT');
    expect(shot).toBe(A.sound);
  });
  it('SHARP EARS hears a sound from further away', () => {
    startHunt(1);
    const A = G.lance[0], u = G.units[0];
    for (const c of G.pc) c.on = false;
    u.sound = 4; u.sndOff = { x: 0, y: 0 }; u.heardBy = [];
    u.x = A.x + 4.8 * T; u.y = A.y; G.lance[1].x = G.lance[1].y = -99 * T;
    hearSounds(); expect(G.pc.some(c => c.on && c.id === u.id)).toBe(false);
    A.op = op('EARS', 1); hearSounds(); expect(G.pc.some(c => c.on && c.id === u.id)).toBe(true);
  });
  it('SENSOR TECH counts watched rounds for more, while its suit is on the map', () => {
    startHunt(1);
    const u = G.units[0];
    G.pc[0].on = true; G.pc[0].id = u.id;
    noteActEnd(u); expect(obsOf(u.id).acts).toBe(1);
    G.lance[1].op = op('TECH', 1); expect(lanceTech()).toBe(TUNE.SKILL_TECH[0]);
    noteActEnd(u); expect(obsOf(u.id).acts).toBe(1 + TUNE.SKILL_TECH[0]);
    G.lance[1].dead = true; expect(lanceTech()).toBe(1);
  });
  it('a suit with no operator has no skill', () => { startHunt(1); expect(skillVal(G.lance[0], 'AIM')).toBeNull(); });
});

describe('in the hunt (R21 cp1)', () => {
  it('without a company, suits have no operator and a lethal hit just destroys (the R11 flow)', () => {
    newContract(1, [{ ...LOAD_A }, { ...LOAD }], 1); takeJob(0);
    expect(G.lance.every(m => m.op === null)).toBe(true);
  });
  it('inside a company, the seated operators drive the suits; a contract plays to its end', () => {
    newCompany(11);
    newContract(5, [{ ...LOAD_A }, { ...LOAD }], 3);
    const seats = { ...G.co.crew };
    takeJob(0);
    expect(G.lance.map(m => m.op.id)).toEqual([seats.A, seats.B]);
    let guard = 0;
    while (G.ct.status === 'ACTIVE' && guard++ < 5) { playOut(80); if (G.ct.status === 'ACTIVE') { rollJobs(); takeJob(0); } }
    expect(G.ct.status).not.toBe('ACTIVE');
    expect(G.co.rec.contracts).toBe(1); expect(G.co.n).toBe(1);
    expect(G.co.rec.hunts).toBe(G.ct.results.length);
  });
  it('a lethal hit leaves the suit CRITICAL on the board', () => {
    newCompany(12); newContract(5, [{ ...LOAD_A }, { ...LOAD }], 1); takeJob(0);
    const B = G.lance[1], x = B.x, y = B.y;
    B.parts.CORE = 0; B.hits = 0;
    updateShells(0.01); // the next sim step marks it
    expect(B.dead).toBe(true); expect(B.crit).toBe(true);
    expect(B.x).toBe(x); expect(B.y).toBe(y);
  });
  it('a crewForHunt with every operator benched leaves the seats empty', () => {
    newCompany(13); for (const o of G.co.ops) o.status = 'BENCH';
    const c = crewForHunt(); expect(c.A).toBeNull(); expect(c.B).toBeNull();
  });
});

describe('test bed: Carry them out (R21 cp1)', () => {
  it('B starts CRITICAL two tiles behind A, both with operators', () => {
    startScenario(scenarioByName('Carry them out'));
    const [A, B] = G.lance;
    expect(B.crit && B.dead).toBe(true); expect(A.dead).toBe(false);
    expect(A.op.name).toBe('Mara Voss'); expect(B.op.skill).toBe('QUIET');
    expect(Math.round(Math.hypot(A.x - B.x, A.y - B.y) / T)).toBe(2);
    expect(G.p).toBe(A);
  });
  it('A steps next to B and ends its turn: B is carried; extracting with it = lives', () => {
    startScenario(scenarioByName('Carry them out'));
    const [A, B] = G.lance;
    A.x = B.x + T; A.y = B.y;
    endPlayerTurn();
    expect(B.carriedBy).toBe('A');
    expect(fateOf(B)).toBe('SAVED');
  });
  it('left where it is, B is KIA when the hunt ends', () => {
    startScenario(scenarioByName('Carry them out'));
    expect(fateOf(G.lance[1])).toBe('KIA');
  });
});

describe('the roster (R21 cp2)', () => {
  it('a new company: START_SUITS suits, one operator seated in each, the rest in reserve', () => {
    newCompany(21);
    expect(G.co.suits.map(x => x.id)).toEqual('ABCD'.slice(0, TUNE.START_SUITS).split(''));
    expect(lanceSize()).toBe(Math.min(TUNE.START_SUITS, TUNE.START_OPS));
    expect(new Set(Object.values(G.co.crew)).size).toBe(TUNE.START_SUITS);
  });
  it('only suits with an operator drop; the lance can be 1 to 3', () => {
    newCompany(22); startCompanyContract(7, 3);
    takeJob(0); expect(G.lance.map(m => m.id)).toEqual(['A', 'B', 'C']);
    expect(new Set(G.lance.map(m => Math.floor(m.x / T) + ',' + Math.floor(m.y / T))).size).toBe(3); // three tiles
    rollJobs(); // the next hunt's jobs (the same contract)
    seat('', 'B'); seat('', 'C'); takeJob(0);
    expect(G.lance.map(m => m.id)).toEqual(['A']);
    expect(G.order.filter(u => G.lance.includes(u)).length).toBe(1);
  });
  it('cycling a seat steps through stays aboard and the free operators', () => {
    newCompany(23); const reserve = G.co.ops.find(o => !Object.values(G.co.crew).includes(o.id));
    const seen = new Set<string>(); for (let i = 0; i < 5; i++) { cycleSeat('C'); seen.add(G.co.crew.C); }
    expect(seen.has('')).toBe(true); expect(seen.has(reserve.id)).toBe(true);
    expect(Object.values(G.co.crew).filter(Boolean).length).toBe(new Set(Object.values(G.co.crew).filter(Boolean)).size); // never seated twice
  });
  for (const n of [1, 2, 3, 4]) it(`a lance of ${n} plays a hunt to its end`, () => {
    const mm = TUNE.MAP_MODE; TUNE.MAP_MODE = 'blocks'; try { rollEnemy(40 + n, undefined, 'UPLINK'); } finally { TUNE.MAP_MODE = mm; }
    newHunt(Array.from({ length: n }, () => structuredClone(DEFAULT_FIT)));
    expect(G2.lance.length).toBe(n);
    expect(G2.order.filter(u => G2.lance.includes(u)).length).toBe(n);
    playOut(80);
    expect(G2.mode).toBe('result');
  });
  it('damage carries between contracts on the company’s suits', () => {
    newCompany(24); startCompanyContract(9, 1);
    takeJob(0); G.lance[0].parts.LEGS -= 1; playOut(80);
    const A = suitById('A');
    expect(A.carry).toEqual(G.ct.carry.A);
    startCompanyContract(10, 1);
    expect(G.ct.carry.A).toEqual(A.carry);
  });
  it('a destroyed suit can’t drop until it is rebuilt (from the company’s credits)', () => {
    newCompany(25); const A = suitById('A');
    A.carry.dead = true; A.carry.hits = 0; fillCrew();
    expect(G.co.crew.A).toBe(''); expect(seat(G.co.ops[3].id, 'A')).toBe(false);
    expect(suitRefitBlock('A', 'rebuild')).toBe('CR');
    G.co.credits = TUNE.COST_REBUILD; expect(suitRefit('A', 'rebuild')).toBe(true);
    expect(A.carry.dead).toBe(false); expect(A.carry.hits).toBe(A.carry.maxHits); expect(G.co.credits).toBe(0);
    expect(seat(G.co.ops[3].id, 'A')).toBe(true);
  });
  it('a new fit keeps the damage part by part', () => {
    newCompany(26); const A = suitById('A');
    A.carry.parts.LEGS -= 1; A.carry.hits -= 1;
    setSuitFit(0, HANGAR_TEMPLATES.find(t => t.id === 'scout').fit());
    expect(A.carry.pmax.LEGS - A.carry.parts.LEGS).toBe(1);
  });
  it('a contract’s pay lands in the company’s credits', () => {
    newCompany(27); startCompanyContract(11, 1); takeJob(0); playOut(80);
    expect(G.co.credits).toBe(G.ct.credits);
    expect(G.co.credits).toBe(G.ct.earned - G.ct.spent);
  });
});
