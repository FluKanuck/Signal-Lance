// Round 14 part 1: read the signature. Variants, observed traits, the matcher, and what an ID does.
import { describe, it, expect, afterEach } from 'vitest';
import { TUNE } from '../src/tune.ts';
import { has, gunOf, radarOf, mortarOf } from '../src/sim/kit.ts';
import { ITEMS, byId } from '../src/sim/items.ts';
import { fireRange } from '../src/sim/turns.ts';
import { G, makeUnit, rollEnemy, newHunt } from '../src/sim/state.ts';
import { T } from '../src/sim/world.ts';
import { step, endPlayerTurn } from '../src/sim/turns.ts';
import { ageContacts, observe } from '../src/sim/sensors.ts';
import { hitChance } from '../src/sim/combat.ts';
import { matchVariants, variantBands, obsOf, cmdId, reveal, idText, idBonus, frozen } from '../src/sim/ids.ts';
import { scenarioByName, startScenario, leaveScenario } from '../src/sim/scenarios.ts';
import { startHunt, LOAD } from './helpers.ts';

const V = TUNE.FIELD_VARIANTS, KEYS = Object.keys(V);
afterEach(() => { leaveScenario(); TUNE.VARIANTS_ENABLED = true; });
const obs = (o: any) => ({ emit: [], pulses: [], moved: false, acts: 0, step: 0, shot: 0, fired: false, first: 1, ...o });

describe('the variant set', () => {
  it('10 variants (R18: + the sniper turret), 3 per field type and 4 turrets, each with traits, a tell and a fight line', () => {
    expect(KEYS.length).toBe(10);
    for (const t of Object.keys(TUNE.FIELD_TYPES)) expect(KEYS.filter(k => V[k].TYPE === t).length).toBe(t === 'TURRET' ? 4 : 3);
    for (const k of KEYS) { expect(V[k].TRAITS.length).toBeGreaterThan(0); expect(V[k].TELL).toBeTruthy(); expect(V[k].FIGHT).toBeTruthy(); }
  });
  it('every variant shares its EMIT reading with another variant, so one reading never settles it', () => {
    for (const k of KEYS) {
      const b = variantBands(k).emit;
      expect(KEYS.some(o => o !== k && variantBands(o).emit.some(x => b.includes(x)))).toBe(true);
    }
  });
  it('variants differ in a fight (core hits, rounds or lock)', () => {
    const sig = (k: string) => { const u = makeUnit(V[k].TYPE, 0, k); return [u.parts.CORE, u.ammo, u.ft.FIRE_UNC, u.ft.PATIENCE_MIN].join(); };
    for (const t of Object.keys(TUNE.FIELD_TYPES)) { const ks = KEYS.filter(k => V[k].TYPE === t); expect(new Set(ks.map(sig)).size).toBeGreaterThan(1); }
  });
  it('each field slot rolls a variant of its own type, seeded', () => {
    const roll = () => { startHunt(5, 'Mixed'); return G.units.map((u: any) => u.type + ':' + u.variant); };
    const a = roll(); expect(roll()).toEqual(a);
    for (const u of G.units) expect(V[u.variant].TYPE).toBe(u.type);
  });
  it('VARIANTS_ENABLED false = every unit is its type default, same placements', () => {
    rollEnemy(9, 'Mixed'); newHunt([{ ...LOAD }, { ...LOAD }]); const pos = G.units.map((u: any) => u.x + ',' + u.y);
    TUNE.VARIANTS_ENABLED = false;
    rollEnemy(9, 'Mixed'); newHunt([{ ...LOAD }, { ...LOAD }]);
    expect(G.units.map((u: any) => u.x + ',' + u.y)).toEqual(pos);
    for (const u of G.units) expect(u.variant).toBe(TUNE.FIELD_VARIANT_DEFAULT[u.type]);
  });
});

describe('the matcher (the CARD rules)', () => {
  it('nothing observed = anything', () => expect(matchVariants(obs({})).length).toBe(KEYS.length));
  it('steady low EMIT that stays still = the gun turret', () => {
    expect(matchVariants(obs({ emit: ['low'], acts: 3 })).sort()).toEqual(['gun', 'relay']); // a relay pulses every 3rd: not yet ruled out
    expect(matchVariants(obs({ emit: ['low'], acts: 4 }))).toEqual(['gun']);
  });
  it('low EMIT that moved = a patrol (steps decide which)', () => {
    expect(matchVariants(obs({ emit: ['low'], moved: true }))).toEqual(['scout', 'line', 'heavy']);
    expect(matchVariants(obs({ emit: ['low'], moved: true, step: 6 }))).toEqual(['heavy']);
    expect(matchVariants(obs({ moved: true, step: 2 }))).toEqual(['scout']);
  });
  it('the pulse rhythm separates emplacements', () => {
    expect(matchVariants(obs({ pulses: [2, 4] }))).toEqual(['search']);
    expect(matchVariants(obs({ pulses: [3, 4] }))).toEqual(['fire']);
    expect(matchVariants(obs({ pulses: [3, 6] }))).toEqual(['relay']);
    expect(matchVariants(obs({ pulses: [3] })).sort()).toEqual(['fire', 'relay', 'search']);
  });
  it('a muffled shot from a silent spot = hush', () => expect(matchVariants(obs({ emit: ['none'], shot: 5 }))).toEqual(['hush']));
});

describe('what an ID does', () => {
  function setup() {
    startHunt(3, 'Mixed');
    const P = G.units.find((u: any) => u.type === 'PATROL'), A = G.lance[0];
    const c = observe(G.pc, P.id, P.x, P.y, 1 * T, 0, 0, true, true, false, 'PASSIVE');
    return { P, A, c };
  }
  it('a wrong static call on a patrol freezes its track: no growth while it acts, no fading', () => {
    const { P, c } = setup(); c.lost = 1; c.gap = 0;
    G.order = [P]; G.oi = 0; // it is acting
    const u0 = c.unc; ageContacts(G.pc, 1); expect(c.unc).toBeGreaterThan(u0); // UNKNOWN: grows
    cmdId(P.id, 'gun'); expect(frozen(P.id)).toBe(true);
    const u1 = c.unc; ageContacts(G.pc, 1); expect(c.unc).toBe(u1);
    ageContacts(G.pc, TUNE.CONTACT_LINGER + 5); expect(c.on).toBe(true);
  });
  it('a mobile call keeps growing as now', () => {
    const { P, c } = setup(); c.lost = 1; c.gap = 0; G.order = [P]; G.oi = 0;
    cmdId(P.id, 'line'); const u = c.unc; ageContacts(G.pc, 1); expect(c.unc).toBeGreaterThan(u);
  });
  it('a right call before eyes adds HIT_ID_BONUS to the lance’s shot; a wrong one adds nothing', () => {
    const { P, A, c } = setup();
    const base = hitChance(A, P, c).pct;
    cmdId(P.id, P.variant); expect(idBonus(P)).toBe(TUNE.HIT_ID_BONUS);
    expect(hitChance(A, P, c).id).toBe(TUNE.HIT_ID_BONUS);
    expect(hitChance(A, P, c).pct).toBe(Math.min(TUNE.HIT_MAX, base + TUNE.HIT_ID_BONUS));
    cmdId(P.id, P.variant === 'line' ? 'heavy' : 'line'); expect(hitChance(A, P, c).id).toBe(0);
  });
  it('the field never gets the bonus', () => {
    const { P, A, c } = setup(); cmdId(P.id, P.variant);
    expect(hitChance(P, A, c).id).toBe(0);
  });
  it('eyes reveal the truth: a wrong call flips and counts as a miscall; no more re-ID after', () => {
    const { P, c } = setup();
    const wrong = P.variant === 'line' ? 'scout' : 'line';
    cmdId(P.id, wrong); reveal(P, c);
    expect(G.ids[P.id].miscall).toBe(true);
    expect(G.obs[P.id].var).toBe(P.variant);
    cmdId(P.id, P.variant); expect(G.ids[P.id].v).toBe(wrong); // locked once seen
    expect(idText()).toMatch(/IDs 1 \(0 right, 1 wrong, 1 before eyes\)/);
  });
});

// The R14 scenarios read the way the brief says when you wait (a lance that just ends its turns).
function wait(rounds: number) { let g = 0; while (G.mode === 'hunt' && G.turn <= rounds && g++ < 1e6) { if (G.phase === 'PLAYER' && !G.act) endPlayerTurn(); else step(0.05); } }
describe('R14 scenarios', () => {
  it('Look-alikes: a scout patrol and a gun turret, both reading EMIT low; waiting separates them', () => {
    startScenario(scenarioByName('Look-alikes'));
    const [S, Gn] = G.units;
    expect([S.variant, Gn.variant]).toEqual(['scout', 'gun']);
    expect(variantBands('scout').emit).toEqual(variantBands('gun').emit);
    wait(6);
    expect(matchVariants(obsOf(Gn.id))).toEqual(['gun']);
    expect(matchVariants(obsOf(S.id)).every(k => V[k].TYPE === 'PATROL')).toBe(true);
  });
  it('Quiet gun: a gun turret watching the street to the uplink', () => {
    startScenario(scenarioByName('Quiet gun'));
    expect(G.units.map((u: any) => u.variant)).toEqual(['gun']);
    const u = G.units[0]; expect(Math.hypot(u.x - G.up.x, u.y - G.up.y) / T).toBeLessThan(TUNE.EYES_RANGE);
  });
  it('Twin pulse: waiting reads each emplacement from its pulse rhythm (so an ID can freeze it for a lob)', () => {
    startScenario(scenarioByName('Twin pulse'));
    wait(7);
    for (const u of G.units) expect(matchVariants(obsOf(u.id))).toEqual([u.variant]);
    expect(has(G.lance[0], 'MORTAR')).toBe(true);
  });
});
