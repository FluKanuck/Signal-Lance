// Round 15 step 1: mission types and BOUNTY. Each test reads like a line from the brief.
import { describe, it, expect, afterEach } from 'vitest';
import { TUNE } from '../src/tune.ts';
import { G, rollEnemy, newHunt } from '../src/sim/state.ts';
import { T, W, anchors, canReach as canReachTile } from '../src/sim/world.ts';
import { newContract, takeJob } from '../src/sim/contract.ts';
import { updateShells, uplinkBlock, step } from '../src/sim/turns.ts';
import { damagePart } from '../src/sim/combat.ts';
import { onExtract, onClear, bountyOf, quotaMet } from '../src/sim/mission.ts';
import { scenarioByName, startScenario, leaveScenario } from '../src/sim/scenarios.ts';
import { LOAD, LOAD_A } from './helpers.ts';

afterEach(() => leaveScenario());
const hunt = (mission: string, seed = 7, comp = 'Mixed') => { rollEnemy(seed, comp, mission); newHunt([{ ...LOAD_A }, { ...LOAD }]); };
const kill = (u) => { damagePart(u, 'CORE', 99); updateShells(0); };
const compTotal = (name: string) => { const C = TUNE.FIELD_COMPOSITIONS.find(c => c.NAME === name); return Object.keys(TUNE.FIELD_TYPES).reduce((a, k) => a + (C[k] || 0), 0); };
// a contract whose first job is forced to this type, taken
function contractHunt(mission: string, seed = 11) {
  newContract(seed, [{ ...LOAD_A }, { ...LOAD }]);
  G.ct.jobs[0].mission = mission;
  takeJob(0);
}

describe('mission types', () => {
  it('each briefed job rolls a type from MISSION_TYPES (seeded), and the two jobs may differ', () => {
    const seen = new Set<string>(); let differ = false;
    for (let s = 1; s <= 30; s++) {
      newContract(s, [LOAD_A, LOAD]);
      for (const j of G.ct.jobs) { expect(TUNE.MISSION_TYPES).toContain(j.mission); seen.add(j.mission); }
      if (G.ct.jobs[0].mission !== G.ct.jobs[1].mission) differ = true;
    }
    expect([...seen].sort()).toEqual([...TUNE.MISSION_TYPES].sort());
    expect(differ).toBe(true);
    newContract(5, [LOAD_A, LOAD]); const a = JSON.stringify(G.ct.jobs);
    newContract(5, [LOAD_A, LOAD]); expect(JSON.stringify(G.ct.jobs)).toBe(a);
  });
  it('the hunt carries one mission object of the job\'s type', () => {
    contractHunt('BOUNTY');
    expect(G.mission.type).toBe('BOUNTY'); expect(G.mission.earned).toBe(0); expect(G.mission.quota).toBe(TUNE.BOUNTY_QUOTA);
    contractHunt('UPLINK');
    expect(G.mission.type).toBe('UPLINK');
  });
  it('uplink candidates come from the per-map anchors table', () => {
    for (let s = 1; s <= 10; s++) { rollEnemy(s); expect(anchors().uplinks.some(u => (u.x + 0.5) * T === G.up.x && (u.y + 0.5) * T === G.up.y)).toBe(true); }
  });
});

describe('BOUNTY', () => {
  it('every variant has a bounty, and dangerous ones pay more than a scout', () => {
    for (const k of Object.keys(TUNE.FIELD_VARIANTS)) { expect(TUNE.BOUNTY[k]).toBeGreaterThanOrEqual(20); expect(TUNE.BOUNTY[k]).toBeLessThanOrEqual(90); }
    expect(TUNE.BOUNTY.heavy).toBeGreaterThan(2 * TUNE.BOUNTY.scout);
    expect(TUNE.BOUNTY.gun).toBeGreaterThan(2 * TUNE.BOUNTY.scout);
  });
  it('the field outnumbers the quota: BOUNTY_FIELD_EXTRA more units than the composition (uplink: none)', () => {
    hunt('UPLINK'); expect(G.units.length).toBe(compTotal('Mixed'));
    hunt('BOUNTY'); expect(G.units.length).toBe(compTotal('Mixed') + TUNE.BOUNTY_FIELD_EXTRA);
    for (const u of G.units.filter(u => u.extra)) expect(Math.floor(u.x / T)).toBeLessThan(W - TUNE.EXTRACT_COLS);
  });
  it('a kill pays its TRUE variant\'s bounty, even if you called it something else', () => {
    hunt('BOUNTY');
    const u = G.units[0], wrong = Object.keys(TUNE.FIELD_VARIANTS).find(k => k !== u.variant);
    G.ids[u.id] = { v: wrong, turn: 1, pre: true, miscall: false, seen: false };
    kill(u);
    expect(G.mission.earned).toBe(TUNE.BOUNTY[u.variant]);
    expect(G.mission.kills).toEqual([{ v: u.variant, b: bountyOf(u), turn: G.turn }]);
    expect(G.pop.b).toBe(TUNE.BOUNTY[u.variant]);
  });
  it('an uplink kill banks no bounty', () => {
    hunt('UPLINK'); kill(G.units[0]); expect(G.mission.earned).toBe(0);
  });
  it('no UPLINK in a Bounty job', () => {
    hunt('BOUNTY'); G.p.x = G.up.x; G.p.y = G.up.y; G.p.ap = 8;
    expect(uplinkBlock()).toBe('NONE');
  });
  it('extract at or over quota = WIN; pay = bounties earned (replaces PAY_WIN + PAY_KILL)', () => {
    contractHunt('BOUNTY');
    G.mission.earned = TUNE.BOUNTY_QUOTA + 35; G.kills = 3;
    expect(quotaMet()).toBe(true);
    onExtract();
    expect(G.outcome).toBe('WIN BOUNTY');
    const r = G.ct.results[0];
    expect(r.pay).toBe(TUNE.BOUNTY_QUOTA + 35); expect(r.mission).toBe('BOUNTY'); expect(G.ct.wins).toBe(1);
  });
  it('extract under quota = not a win and not a loss: the contract goes on, bounties kept', () => {
    contractHunt('BOUNTY');
    G.mission.earned = TUNE.BOUNTY_QUOTA - 10;
    onExtract();
    expect(G.outcome).toBe('BAIL');
    expect(G.ct.results[0].pay).toBe(TUNE.BOUNTY_QUOTA - 10);
    expect(G.ct.wins).toBe(0); expect(G.ct.status).toBe('ACTIVE');
    expect(G.ct.credits).toBe(TUNE.BOUNTY_QUOTA - 10);
  });
  it('clearing the field follows the same quota rule (under quota = BAIL)', () => {
    contractHunt('BOUNTY'); G.mission.earned = 20; onClear(); expect(G.outcome).toBe('BAIL');
    contractHunt('BOUNTY'); G.mission.earned = TUNE.BOUNTY_QUOTA; onClear(); expect(G.outcome).toBe('WIN BOUNTY');
  });
  it('uplink pay is unchanged: PAY_WIN + kills × PAY_KILL, and a BAIL pays nothing', () => {
    contractHunt('UPLINK'); G.kills = 2; onClear();
    expect(G.outcome).toBe('WIN CLEAR'); expect(G.ct.results[0].pay).toBe(TUNE.PAY_WIN + 2 * TUNE.PAY_KILL);
    contractHunt('UPLINK'); G.kills = 2; onExtract();
    expect(G.outcome).toBe('BAIL'); expect(G.ct.results[0].pay).toBe(0);
  });
});

describe('R15 scenarios', () => {
  it('Price list: a heavy patrol (high bounty) and two scouts (low) on opposite sides; both routes reach the quota', () => {
    startScenario(scenarioByName('Price list'));
    expect(G.mission.type).toBe('BOUNTY');
    const heavy = G.units.filter(u => u.variant === 'heavy'), scouts = G.units.filter(u => u.variant === 'scout');
    expect(heavy.length).toBe(1); expect(scouts.length).toBe(2);
    expect(TUNE.BOUNTY.heavy).toBeGreaterThanOrEqual(G.mission.quota);
    expect(2 * TUNE.BOUNTY.scout).toBeGreaterThanOrEqual(G.mission.quota);
    const A = G.lance[0];
    expect(heavy[0].y).toBeLessThan(A.y); for (const s of scouts) expect(s.y).toBeGreaterThan(A.y); // north vs south
  });
  it('One more?: the lance starts at quota, near extraction, with a high-bounty emplacement in mortar reach', () => {
    startScenario(scenarioByName('One more?'));
    expect(G.mission.earned).toBe(G.mission.quota); expect(quotaMet()).toBe(true);
    const A = G.lance[0], e = G.units[0];
    expect(W - TUNE.EXTRACT_COLS - A.x / T).toBeLessThan(6);
    expect(e.type).toBe('EMPLACEMENT'); expect(TUNE.BOUNTY[e.variant]).toBeGreaterThanOrEqual(50);
    const d = Math.hypot(e.x - A.x, e.y - A.y) / T;
    expect(d).toBeGreaterThan(TUNE.MORTAR_MIN_RANGE); expect(d).toBeLessThan(TUNE.MORTAR_MAX_RANGE);
  });
});

// ---- R15 step 2: RETRIEVE ----
import { planMove, cmdObjective, objectiveBlock } from '../src/sim/turns.ts';
import { pickupBlock, doPickup, handoffBlock, doHandoff, carrier, cargoLost, onCargoLost, huntPay } from '../src/sim/mission.ts';
import { packOn } from '../src/sim/pack.ts';
import { enemyDecide } from '../src/sim/bot.ts';
import { setActive } from '../src/sim/state.ts';

const onCargo = (m) => { m.x = G.up.x; m.y = G.up.y; m.ap = 8; };
describe('RETRIEVE', () => {
  it('the cargo sits on the rolled site; a suit on its tile spends RETRIEVE_PICKUP_AP to take it', () => {
    hunt('RETRIEVE', 3, 'Mixed');
    const A = G.lance[0];
    expect(pickupBlock(A)).toBe('RANGE');
    onCargo(A); A.ap = TUNE.RETRIEVE_PICKUP_AP - 1; expect(pickupBlock(A)).toBe('AP');
    A.ap = 8; expect(pickupBlock(A)).toBe('');
    doPickup(A);
    expect(carrier()).toBe(A); expect(A.ap).toBe(8 - TUNE.RETRIEVE_PICKUP_AP);
    expect(pickupBlock(G.lance[1])).toBe('HELD');
  });
  it('the flip: every living field unit gets a contact on the carrier and the pack logic turns on (PACK_ENABLED off)', () => {
    hunt('RETRIEVE', 3, 'Mixed'); expect(TUNE.PACK_ENABLED).toBe(false);
    const A = G.lance[0]; onCargo(A);
    for (const u of G.units) for (const c of u.ec) c.on = false;
    expect(packOn()).toBe(false);
    doPickup(A);
    expect(packOn()).toBe(true);
    for (const u of G.units) expect(u.ec.some(c => c.on && c.id === A.id)).toBe(true);
  });
  it('a patrol hunting after the flip goes after the carrier, not the more wounded mech', () => {
    hunt('RETRIEVE', 3, 'Sweep');
    const [A, B] = G.lance; onCargo(A);
    damagePart(B, 'LEGS', 99); damagePart(B, 'WEAPON', 99); // B is the juicier target by the R13 rule
    doPickup(A);
    const p = G.units[0]; p.ap = 8;
    for (const c of p.ec) c.on = false;
    p.ec[0].on = true; Object.assign(p.ec[0], { id: B.id, tx: B.x, ty: B.y, unc: 2 * T, lost: 0, gap: 1 });
    p.ec[1].on = true; Object.assign(p.ec[1], { id: A.id, tx: A.x, ty: A.y, unc: 2 * T, lost: 0, gap: 1 });
    enemyDecide(p);
    expect(p.packTgt).toBe(A.id);
  });
  it('the carrier can\'t SPRINT', () => {
    hunt('RETRIEVE', 3, 'Mixed');
    const A = G.lance[0]; onCargo(A); doPickup(A);
    const pl = planMove(A, A.x + 4 * T, A.y, 'SPRINT');
    expect(pl.path).toBeNull(); expect(pl.why).toBe('CARGO');
    expect(planMove(G.lance[1], G.lance[1].x + 4 * T, G.lance[1].y, 'SPRINT')?.why).not.toBe('CARGO');
  });
  it('HAND OFF to an adjacent suit costs RETRIEVE_HANDOFF_AP', () => {
    hunt('RETRIEVE', 3, 'Mixed');
    const [A, B] = G.lance; onCargo(A); doPickup(A);
    B.x = A.x + 5 * T; B.y = A.y; expect(handoffBlock(A)).toBe('RANGE');
    B.x = A.x + T; const ap = A.ap; expect(handoffBlock(A)).toBe('');
    doHandoff(A);
    expect(carrier()).toBe(B); expect(A.ap).toBe(ap - TUNE.RETRIEVE_HANDOFF_AP); expect(G.mission.handoffs).toBe(1);
  });
  it('the objective button picks up, then hands off', () => {
    hunt('RETRIEVE', 3, 'Mixed');
    G.phase = 'PLAYER'; G.act = null; G.mode = 'hunt';
    const [A, B] = G.lance; setActive(A); onCargo(A); B.x = A.x + T; B.y = A.y;
    expect(objectiveBlock()).toBe(''); cmdObjective(); expect(carrier()).toBe(A);
    cmdObjective(); expect(carrier()).toBe(B);
  });
  it('carrier destroyed = cargo lost, the hunt fails (not a contract LOSS); it pays nothing', () => {
    contractHunt('RETRIEVE');
    const A = G.lance[0]; onCargo(A); doPickup(A);
    damagePart(A, 'CORE', 99); updateShells(0);
    expect(cargoLost()).toBe(true);
    onCargoLost();
    expect(G.outcome).toBe('FAIL'); expect(G.ct.status).toBe('ACTIVE'); expect(G.ct.wins).toBe(0);
    expect(G.ct.results[0].pay).toBe(0);
  });
  it('win: the carrier reaches extraction; pay PAY_WIN + kills. Another mech extracting first = BAIL', () => {
    contractHunt('RETRIEVE');
    const [A, B] = G.lance; onCargo(A); doPickup(A); G.kills = 1;
    onExtract(A);
    expect(G.outcome).toBe('WIN RETRIEVE'); expect(G.ct.results[0].pay).toBe(TUNE.PAY_WIN + TUNE.PAY_KILL);
    contractHunt('RETRIEVE');
    onCargo(G.lance[0]); doPickup(G.lance[0]); onExtract(G.lance[1]);
    expect(G.outcome).toBe('BAIL');
    expect(huntPay('BAIL')).toBe(0);
  });
});

describe('R15 step 2 scenarios', () => {
  it('Grab and go: a light guard (one turret) at the cargo, the lance a few tiles off', () => {
    startScenario(scenarioByName('Grab and go'));
    expect(G.mission.type).toBe('RETRIEVE');
    const statics = G.units.filter(u => !u.mobile);
    expect(statics.length).toBe(1); expect(statics[0].variant).toBe('sentry');
    expect(pickupBlock(G.lance[0])).toBe('RANGE');
  });
  it('Hot potato: the lance starts on the cargo inside heavy guards (gun turret, heavy patrol, emplacement)', () => {
    startScenario(scenarioByName('Hot potato'));
    expect(pickupBlock(G.lance[0])).not.toBe('RANGE');
    expect(G.units.map(u => u.variant).sort()).toEqual(['gun', 'heavy', 'search']);
  });
});

// ---- R15 step 3: ESCORT ----
import { makeAlly, legsFrom, legChoices, pickLeg, allyHolding, legPath, nearLegTiles } from '../src/sim/escort.ts';
import { friends } from '../src/sim/state.ts';
import { observe } from '../src/sim/sensors.ts';
import { cmdLeg, nextActivation } from '../src/sim/turns.ts';
import { onAllyLost, onAllyOut, escortBonus } from '../src/sim/mission.ts';
import { playOut } from '../src/sim/autoplay.ts';

describe('ESCORT', () => {
  it('the route comes from the anchors table: every junction has 2 or 3 onward legs, every leg walks', () => {
    const X = anchors();
    for (const j of X.junctions) { expect(legsFrom(j).length).toBeGreaterThanOrEqual(2); expect(legsFrom(j).length).toBeLessThanOrEqual(3); } // R16: NORTH / AHEAD / SOUTH on block maps
    X.legs.forEach((_, i) => { const P = legPath(i); expect(P.length).toBeGreaterThan(1); });
    for (const k of Object.keys(X.waypoints)) { const n = X.waypoints[k]; expect(canReachTile(n.x, n.y)).toBe(true); }
  });
  it('an Escort hunt has the transport on the start node; other jobs have none', () => {
    hunt('ESCORT'); expect(G.ally).not.toBeNull(); expect(G.ally.node).toBe('S'); expect(friends()).toContain(G.ally);
    expect(G.ally.maxHits).toBe(TUNE.ESCORT_HITS);
    hunt('UPLINK'); expect(G.ally).toBeNull();
  });
  it('the field is placed near the route legs', () => {
    hunt('ESCORT', 9, 'Mixed');
    const near = new Set(nearLegTiles().map(t => t.y * W + t.x));
    for (const u of G.units) expect(near.has(Math.floor(u.y / T) * W + Math.floor(u.x / T))).toBe(true);
  });
  it('at a junction it holds until you pick a leg, then walks up to ESCORT_MOVE tiles a round along it', () => {
    hunt('ESCORT');
    G.ally = makeAlly('J1');
    expect(allyHolding()).toBe(true);
    expect(legChoices().length).toBeGreaterThanOrEqual(2);
    const x0 = G.ally.x, y0 = G.ally.y, north = legChoices()[0];
    expect(pickLeg(north.i)).toBe(true);
    expect(allyHolding()).toBe(false); expect(G.mission.legs).toEqual([north.name + '@J1']);
    // run its activation: put it next in the order
    G.order = [G.ally]; G.oi = -1; G.act = null; nextActivation();
    for (let n = 0; n < 2000 && G.act; n++) step(0.05);
    const moved = G.ally.movedT; // tiles walked this activation (the leg turns a corner)
    expect(Math.hypot(G.ally.x - x0, G.ally.y - y0)).toBeGreaterThan(0);
    expect(moved).toBeGreaterThan(TUNE.ESCORT_MOVE * 0.6); expect(moved).toBeLessThanOrEqual(TUNE.ESCORT_MOVE + 0.01);
  });
  it('the field senses it and can target it like a lance mech', () => {
    hunt('ESCORT', 9, 'Sweep');
    const a = G.ally, p = G.units[0];
    for (const c of p.ec) c.on = false;
    observe(p.ec, a.id, a.x, a.y, T, 0, 0, true, false, true, 'EYES');
    p.x = a.x + 3 * T; p.y = a.y; p.ap = 8;
    const act = enemyDecide(p);
    expect(act).toBeTruthy();
    expect(['FIRE', 'CHARGE', 'INVESTIGATE', 'HOLD', 'HUNT']).toContain(p.state);
  });
  it('a field shell hits it; its death fails the hunt (not a contract LOSS)', () => {
    contractHunt('ESCORT');
    damagePart(G.ally, 'CORE', 99); updateShells(0);
    expect(G.ally.dead).toBe(true);
    onAllyLost();
    expect(G.outcome).toBe('FAIL'); expect(G.ct.status).toBe('ACTIVE'); expect(G.ct.results[0].pay).toBe(0);
  });
  it('win: the transport walks out; pay PAY_WIN + ESCORT_BONUS × hits left + kills', () => {
    contractHunt('ESCORT');
    damagePart(G.ally, 'CORE', 2); G.kills = 1;
    const bonus = Math.round(TUNE.ESCORT_BONUS * G.ally.hits / G.ally.maxHits);
    expect(escortBonus()).toBe(bonus);
    onAllyOut();
    expect(G.outcome).toBe('WIN ESCORT');
    expect(G.ct.results[0].pay).toBe(TUNE.PAY_WIN + bonus + TUNE.PAY_KILL);
  });
  it('clearing the field does not end an Escort: the scripted lance still walks it out', () => {
    startScenario(scenarioByName('Fork')); playOut(80);
    expect(G.outcome).toBe('WIN ESCORT');
  });
});

describe('R15 step 3 scenarios', () => {
  it('Fork: the transport holds at the west fork; the gun turret sits on one route, the other is clean', () => {
    startScenario(scenarioByName('Fork'));
    expect(allyHolding()).toBe(true); expect(G.ally.node).toBe('J1');
    const g = G.units[0]; expect(g.variant).toBe('gun');
    const segD = (p, q) => { const dx = q.x - p.x, dy = q.y - p.y, k = Math.max(0, Math.min(1, ((g.x - p.x) * dx + (g.y - p.y) * dy) / (dx * dx + dy * dy || 1))); return Math.hypot(p.x + dx * k - g.x, p.y + dy * k - g.y); };
    const on = (i: number) => { const P = legPath(i); return P.slice(1).some((q, k) => segD(P[k], q) <= 2 * T); };
    const [a, b] = legChoices(); expect(on(a.i) !== on(b.i)).toBe(true);
  });
  it('Shadow: the transport holds at the centre fork, one patrol between the two routes', () => {
    startScenario(scenarioByName('Shadow'));
    expect(G.ally.node).toBe('J2'); expect(allyHolding()).toBe(true);
    expect(G.units.length).toBe(1); expect(G.units[0].type).toBe('PATROL');
  });
  it('cmdLeg only works on your turn', () => {
    startScenario(scenarioByName('Shadow'));
    G.phase = 'ENEMY'; cmdLeg(legChoices()[0].i); expect(allyHolding()).toBe(true);
  });
});
