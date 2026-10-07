// R18 checkpoint 2: the suit budget. Parts take their modules offline, the rear arc, power, weight, signature, mods.
import { describe, it, expect, afterEach } from 'vitest';
import { TUNE } from '../src/tune.ts';
import { G } from '../src/sim/state.ts';
import { T } from '../src/sim/world.ts';
import { damagePart, rollPart, fromBehind } from '../src/sim/combat.ts';
import { shootBlock, mortarBlock, planMove, fireRange, beginUnit, doMove } from '../src/sim/turns.ts';
import { observe } from '../src/sim/sensors.ts';
import { setSeed } from '../src/sim/rng.ts';
import { has, fitStats, launchBlock, makeFit, radarOf, HANGAR_TEMPLATES, DEFAULT_FIT, hangarWhy, kitOf } from '../src/sim/kit.ts';
import { overloadPenalty, whyNot, emptyBuild } from '../src/sim/fit.ts';
import { ITEMS, byId } from '../src/sim/items.ts';
import { scenarioByName, startScenario, leaveScenario } from '../src/sim/scenarios.ts';
import { startHunt } from './helpers.ts';

afterEach(() => leaveScenario());
const tpl = (id: string) => HANGAR_TEMPLATES.find(t => t.id === id).fit();

describe('A4: locations are parts', () => {
  it('losing a part takes what is mounted there offline, and only that', () => {
    startHunt(1); const A = G.lance[0]; // the scripted A: default + a mortar on the BACK
    expect(has(A, 'PASSIVE')).toBe(true); expect(has(A, 'MASK')).toBe(true);
    damagePart(A, 'SENSORS', A.parts.SENSORS);
    expect(has(A, 'PASSIVE')).toBe(false); expect(has(A, 'MASK')).toBe(false); // both on the MAST
    expect(has(A, 'GHOST')).toBe(true); expect(has(A, 'GUN')).toBe(true);     // CORE, ARMS
    const c = observe(G.pc, G.units[0].id, A.x + 3 * T, A.y, 0.3 * T, 0, 0, true, true);
    A.ap = 8; A.turnShots = 0; A.mUsed = 0;
    damagePart(A, 'BACK', A.parts.BACK); expect(mortarBlock(A, c)).toBe('BCK');
    damagePart(A, 'WEAPON', A.parts.WEAPON); expect(shootBlock(A, c, TUNE.PLAYER_FIRE_UNC, 12)).toBe('WPN');
  });
  it('every suit has a BACK part with a hit of its own, on top of the R17 pool', () => {
    startHunt(1); const B = G.lance[1];
    expect(B.parts.BACK).toBe(1); expect(B.parts.CORE).toBe(3);
  });
});

describe('A5: the rear arc', () => {
  it('a shot from behind rolls BACK in place of WEAPON; from the front never BACK', () => {
    startHunt(1); const A = G.lance[0]; A.fx = 1; A.fy = 0;
    const behind = { x: A.x - 5 * T, y: A.y }, front = { x: A.x + 5 * T, y: A.y };
    expect(fromBehind(A, behind.x, behind.y)).toBe(true); expect(fromBehind(A, front.x, front.y)).toBe(false);
    setSeed(7); const R = new Set(), F = new Set();
    for (let i = 0; i < 400; i++) { R.add(rollPart(A, behind)); F.add(rollPart(A, front)); }
    expect(R.has('BACK')).toBe(true); expect(R.has('WEAPON')).toBe(false);
    expect(F.has('BACK')).toBe(false); expect(F.has('WEAPON')).toBe(true);
  });
});

describe('A6: power', () => {
  it('regen = reactor output − idle draw; pool = base + batteries', () => {
    const s = fitStats(DEFAULT_FIT); // Cold-burn 15 − (EM array 1 + mask 2 + ghost 0)
    expect(s.regen).toBe(12); expect(s.pool).toBe(TUNE.ENERGY_BASE);
    const sc = fitStats(tpl('scout')); expect(sc.regen).toBe(20 - (2 + 1 + 2)); expect(sc.pool).toBe(TUNE.ENERGY_BASE + 50);
  });
  it('a suit draws its regen at the start of its turn', () => {
    startHunt(1); const A = G.lance[0]; A.en = 0; A.regen = 7; G.order = [A]; // any number: the fit's
    A.ap = 0; beginUnit(A); expect(A.en).toBe(7);
  });
  it('a fit with no reactor, or drawing more than its output, cannot launch', () => {
    expect(launchBlock(emptyBuild('warden'))).toMatch(/reactor/i);
    const hungry = makeFit('wisp', [['CORE', 'battery'], ['CORE', 'battery'], ['MAST', 'lamp'], ['MAST', 'mask']]);
    expect(launchBlock(hungry)).not.toBe('');
    for (const t of HANGAR_TEMPLATES) expect(launchBlock(t.fit())).toBe('');
  });
});

describe('A7: weight', () => {
  it('overload adds Sound first, then AP past OVERLOAD_AP_FRAC of the band', () => {
    expect(overloadPenalty(14, 14, 18)).toEqual({ moveAP: 0, servoSnd: 0, moveEN: 0 });
    expect(overloadPenalty(15, 14, 18)).toEqual({ moveAP: 0, servoSnd: TUNE.OVERLOAD_SND_PER_PT, moveEN: TUNE.OVERLOAD_EN_PER_TILE });
    expect(overloadPenalty(17, 14, 18)).toEqual({ moveAP: 1, servoSnd: 3 * TUNE.OVERLOAD_SND_PER_PT, moveEN: 3 * TUNE.OVERLOAD_EN_PER_TILE });
  });
  it('an overloaded suit\'s moves are louder and cost the extra AP', () => {
    startScenario(scenarioByName('Heavy load'));
    const A = G.lance[0]; expect(A.over).toEqual({ ap: 0, snd: 2, en: 2 * TUNE.OVERLOAD_EN_PER_TILE });
    A.ap = 4; const pl = planMove(A, A.x + 6 * T, A.y, 'NORMAL');
    expect(pl.snd).toBe(TUNE.SOUND_RANGE.NORMAL + 2);
    expect(pl.en).toBe(Math.ceil(pl.len * (TUNE.MOVE_ENERGY_PER_TILE.NORMAL + A.over.en) - 1e-6)); // R18 debrief 1: every tile costs more
    A.en = 100; const pc = planMove(A, A.x + 4 * T, A.y, 'CREEP'); expect(pc.en).toBeGreaterThan(0); // even creeping
    A.over = { ap: 1, snd: 3, en: 0 }; const p2 = planMove(A, A.x + 30 * T, A.y, 'NORMAL');
    expect(p2.ap).toBe(4); expect(p2.len).toBeLessThanOrEqual(3 * TUNE.MOVE_TILES_PER_AP.NORMAL + 1e-6);
  });
});

describe('A8: signature from items', () => {
  it('the standing EM is the frame and always-on items, × SIG_EM_PER_PT (Warden = the R17 default 1.5)', () => {
    expect(fitStats(DEFAULT_FIT).emBase).toBeCloseTo(1.5);
    expect(fitStats(tpl('scout')).emBase).toBeCloseTo(0.5);
    expect(fitStats(tpl('brawler')).emBase).toBeCloseTo(2.0);
  });
  it('plates no longer add EM (they add hits and weight)', () => {
    const a = makeFit('warden', [['CORE', 'coldburn']]), b = makeFit('warden', [['CORE', 'coldburn']], ['CORE', 'ARMS', 'LEGS']);
    expect(fitStats(b).emBase).toBe(fitStats(a).emBase); expect(fitStats(b).load).toBe(fitStats(a).load + 6);
  });
});

describe('A9: mods', () => {
  it('one mod per location; the Cold processor makes a radar pulse in its location quieter for +2 draw', () => {
    let b = makeFit('wisp', [['CORE', 'hotcore'], ['MAST', 'lamp'], ['MAST', 'm_cold']]);
    expect(whyNot(b, 'MAST', 2, byId(ITEMS, 'm_cold'))).toBe('one mod per location');
    const plain = makeFit('wisp', [['CORE', 'hotcore'], ['MAST', 'lamp']]);
    const u = { fit: b, items: kitOf(b) }, v = { fit: plain, items: kitOf(plain) };
    expect(radarOf(u).emit).toBeCloseTo(radarOf(v).emit * 0.6); expect(radarOf(u).sig).toBeCloseTo(radarOf(v).sig * 0.6);
    expect(fitStats(plain).regen - fitStats(b).regen).toBe(2);
  });
  it('the hangar allows one of each module row (batteries excepted)', () => {
    const b = DEFAULT_FIT;
    expect(hangarWhy(b, 'autocannon')).toBe('one per suit'); expect(hangarWhy(b, 'battery')).toBe(''); expect(hangarWhy(b, 'lamp')).toBe('');
    expect(hangarWhy(b, 'hotcore')).toBe('one reactor per suit'); expect(hangarWhy(b, 'hotcore', 'coldburn')).toBe(''); // swapping the reactor is fine
  });
});

describe('R18 scenarios', () => {
  it('Heavy load: the turret hears an overloaded walk past the alley, not a plain one', () => {
    startScenario(scenarioByName('Heavy load'));
    const A = G.lance[0], u = G.units[0], d = Math.abs(u.y - 13.5 * T) / T; // nearest the street gets to it
    expect(d).toBeGreaterThan(TUNE.SOUND_RANGE.NORMAL); expect(d).toBeLessThanOrEqual(TUNE.SOUND_RANGE.NORMAL + A.over.snd);
    expect(d).toBeGreaterThan(TUNE.SOUND_RANGE.CREEP + A.over.snd);
    expect(G.lance[1].dead).toBe(true);
  });
  it('Back door: the patrol is behind A\'s front arc, and A carries the mortar on its BACK', () => {
    startScenario(scenarioByName('Back door'));
    const A = G.lance[0], e = G.units[0];
    expect(fromBehind(A, e.x, e.y)).toBe(true); expect(has(A, 'MORTAR')).toBe(true);
    expect(A.items.find(k => k.item.id === 'mortar').loc).toBe('BACK');
    expect(fireRange(A)).toBe(12);
  });
});

describe('A12: what found each suit first', () => {
  it('one line per suit, naming the channel, the range and who', async () => {
    const { playHunt } = await import('./helpers.ts'); const { foundLines } = await import('../src/sim/found.ts');
    playHunt(3, 'Mixed');
    const L = foundLines(); expect(L.length).toBe(2);
    for (const l of L) expect(l).toMatch(/^[AB]: (first found on .+ at \d+ tiles by a .+ \(round \d+\)|never found)$/);
  });
});

describe('B1/B2: THERMAL', () => {
  it('heat persists and cools: a shot and a sprint add heat that drops IR_COOL_PER_TURN each own turn', async () => {
    const { addHeat, irOf } = await import('../src/sim/kit.ts');
    startHunt(1); const A = G.lance[0], base = irOf(A);
    addHeat(A, TUNE.IR_FIRE); addHeat(A, TUNE.IR_SPRINT); expect(irOf(A)).toBe(base + TUNE.IR_FIRE + TUNE.IR_SPRINT);
    beginUnit(A); expect(irOf(A)).toBe(base + TUNE.IR_FIRE + TUNE.IR_SPRINT - TUNE.IR_COOL_PER_TURN);
    for (let i = 0; i < 10; i++) beginUnit(A);
    expect(irOf(A)).toBe(base); // never below the steady part
  });
  it('steady IR = the reactor\'s IR emit + the frame\'s size', () => {
    expect(fitStats(DEFAULT_FIT).irBase).toBe(0 + 3);                // Cold-burn Warden
    expect(fitStats(tpl('scout')).irBase).toBe(4 + 1);               // Hot core Wisp
    expect(fitStats(tpl('brawler')).irBase).toBe(4 + 5);             // Hot core Bulwark
  });
  it('Warm core: the turret\'s thermal sight finds the Hot core Warden past eye range; a Cold-burn one it doesn\'t', async () => {
    const { updateSensors } = await import('../src/sim/sensors.ts');
    startScenario(scenarioByName('Warm core'));
    const A = G.lance[0], u = G.units[0], d = Math.hypot(u.x - A.x, u.y - A.y) / T;
    expect(d).toBeGreaterThan(TUNE.EYES_RANGE); expect(has(u, 'THERMAL')).toBe(true);
    updateSensors(0); const c = u.ec.find((c: any) => c.on && c.id === A.id);
    expect(c).toBeTruthy(); expect(G.firstLog.find((f: any) => f.tgt === A.id).src).toBe('THERMAL');
    A.irBase = fitStats(DEFAULT_FIT).irBase; for (const k of u.ec) k.on = false; updateSensors(0);
    expect(u.ec.some((c: any) => c.on && c.id === A.id)).toBe(false);
  });
  it('THERMAL_ENABLED false: nobody reads heat', async () => {
    const { updateSensors } = await import('../src/sim/sensors.ts');
    startScenario(scenarioByName('Warm core')); const was = TUNE.THERMAL_ENABLED; TUNE.THERMAL_ENABLED = false;
    try { updateSensors(0); expect(G.units[0].ec.some((c: any) => c.on)).toBe(false); } finally { TUNE.THERMAL_ENABLED = was; }
  });
});

describe('R18 (Jamie): the sniper turret', () => {
  it('carries a Long gun: range 20, and loses 1% a tile past HIT_RANGE_FREE instead of HIT_RANGE_PER_TILE', async () => {
    const { makeUnit } = await import('../src/sim/state.ts'); const { hitChance } = await import('../src/sim/combat.ts');
    startHunt(1); const s = makeUnit('TURRET', 90, 'sniper'), g = makeUnit('TURRET', 91, 'sentry'), A = G.lance[0];
    expect(fireRange(s)).toBe(20); expect(fireRange(g)).toBe(12); expect(has(s, 'THERMAL')).toBe(true);
    for (const u of [s, g]) { u.x = A.x - 16 * T; u.y = A.y; }
    const c = { tx: A.x, ty: A.y };
    expect(hitChance(s, A, c).range).toBe(-12); expect(hitChance(g, A, c).range).toBe(-TUNE.HIT_RANGE_PER_TILE * 12);
  });
});

describe('R18 fix list', () => {
  it('7: a cover piece joins tiles of one kind only (a set piece never joins the building beside it)', async () => {
    const { coverPiece } = await import('../src/sim/combat.ts'); const { coverKindAt, W, H } = await import('../src/sim/world.ts');
    const { rollEnemy, newHunt } = await import('../src/sim/state.ts');
    let checked = 0;
    for (const seed of [835900613, 1701, 7, 42]) {
      rollEnemy(seed, 'Mixed', 'BOUNTY'); newHunt([{}, {}]);
      for (let y = 0; y < H && checked < 30; y++) for (let x = 0; x < W && checked < 30; x++) {
        const k = coverKindAt(x, y); if (!k) continue;
        const near = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => { const j = coverKindAt(x + dx, y + dy); return j && j !== k; });
        if (!near) continue;
        for (const [px, py] of coverPiece(x, y)) expect(coverKindAt(px, py)).toBe(k);
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(0);
  });
  it('8: a move is not stopped by eyes landing on a contact you already had', async () => {
    const { runAct } = await import('../src/sim/autoplay.ts'); const { observe } = await import('../src/sim/sensors.ts');
    startScenario(scenarioByName('Trip wire'));
    const A = G.p, u = G.units[0];
    observe(G.pc, u.id, u.x, u.y, 2 * T, 0, 0, true, true, false, 'PASSIVE'); // already on the picture before the move
    doMove(A, planMove(A, G.up.x, G.up.y, 'NORMAL')); runAct();
    expect(G.moveStat.intr.length).toBe(0);
  });
  it('6: each fix records the sense that made it; radar through walls records how many', async () => {
    const { observe, radarFix } = await import('../src/sim/sensors.ts');
    startScenario(scenarioByName('Warm core'));
    const A = G.lance[0], u = G.units[0];
    expect(observe(G.pc, u.id, u.x, u.y, T, 0, 0, true, false, true, 'EYES').src).toBe('EYES');
    A.items.push({ item: byId(ITEMS, 'lamp'), loc: 'MAST' }); A.fx = 1; A.fy = 0;
    radarFix(A, u, G.pc, u.id, { x: 0, y: 0, t: 0 }, 0, 0, 0);
    const c = G.pc.find((c: any) => c.on && c.id === u.id); expect(c.src).toBe('RADAR'); expect(c.walls).toBe(0); // clear street
  });
});
