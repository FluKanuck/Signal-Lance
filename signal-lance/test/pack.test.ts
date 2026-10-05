// Round 13 step 2: the pack. Alarm, converge, press the wound. Each test reads like a line from the brief.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TUNE } from '../src/tune.ts';
import { G } from '../src/sim/state.ts';
import { T, W, H, canReach } from '../src/sim/world.ts';
import { shootBlock } from '../src/sim/turns.ts';
import { observe } from '../src/sim/sensors.ts';
import { enemyDecide } from '../src/sim/bot.ts';
import { damagePart } from '../src/sim/combat.ts';
import { alarmRadius, pickPackTarget } from '../src/sim/pack.ts';
import { startHunt, place } from './helpers.ts';

let A, B, U; // lance mechs A, B; field units U[0..3] (Sweep = 4 patrols)
beforeEach(() => {
  TUNE.PACK_ENABLED = true;
  startHunt(3, 'Sweep');
  [A, B] = G.lance; U = G.units;
  for (const u of U) for (const c of u.ec) c.on = false;
});
afterEach(() => { TUNE.PACK_ENABLED = false; });
const has = (u, id) => u.ec.find(c => c.on && c.id === id);
// reachable tiles along one row, `gap` tiles apart
function row(n: number, gap: number): [number, number][] {
  for (let y = 0; y < H; y++) for (let x = 0; x + gap * (n - 1) < W - 3; x++) {
    const xs = Array.from({ length: n }, (_, i) => x + i * gap);
    if (xs.every(t => canReach(t, y))) return xs.map(t => [t, y] as [number, number]);
  }
  throw new Error('no row');
}
const see = (u, m) => observe(u.ec, m.id, m.x, m.y, TUNE.UNC_EYES * T, 0, 0, true, false, true, 'EYES');

describe('alarm', () => {
  it('is off unless PACK_ENABLED', () => {
    TUNE.PACK_ENABLED = false;
    const p = row(2, 3); place(U[0], ...p[0]); place(U[1], ...p[1]);
    see(U[0], A);
    expect(has(U[1], A.id)).toBeUndefined();
  });
  it('a unit that senses a mech alerts others within the radius, with a fuzzier shared copy', () => {
    const p = row(3, 6); place(U[0], ...p[0]); place(U[1], ...p[1]); place(U[2], ...p[2]); // 6 and 12 tiles away
    U[3].dead = true; A.emit = 0;
    const own = see(U[0], A);
    const shared = has(U[1], A.id);
    expect(shared.shr).toBe(true);
    expect(shared.unc).toBeCloseTo(own.unc + TUNE.ALARM_UNC_ADD * T);
    expect(has(U[2], A.id)).toBeUndefined(); // 12 > ALARM_RADIUS_BASE 8
    expect(A.alarms).toBe(1);
  });
  it('a loud mech pulls in units from further away', () => {
    A.emit = 0; const quiet = alarmRadius(A);
    A.emit = TUNE.SIGNAL_MAX;
    expect(alarmRadius(A)).toBeCloseTo(quiet + TUNE.ALARM_RADIUS_EMIT);
  });
  it('does not relay: a shared contact never raises a further alarm', () => {
    const p = row(3, 6); place(U[0], ...p[0]); place(U[1], ...p[1]); place(U[2], ...p[2]);
    U[3].dead = true; A.emit = 0;
    see(U[0], A); // U1 is alerted; U2 is 6 from U1 but 12 from U0
    expect(has(U[2], A.id)).toBeUndefined();
  });
  it('a shared contact never qualifies for a lock', () => {
    const p = row(2, 3); place(U[0], ...p[0]); place(U[1], ...p[1]);
    see(U[0], A);
    const c = has(U[1], A.id); c.unc = 0.1 * T;
    U[1].ap = 8; U[1].turnShots = 0;
    expect(shootBlock(U[1], c, 99, 99)).toBe('FUZZY');
  });
});

describe('converge', () => {
  it('a patrol with a shared contact drops its leash and hunts', () => {
    const p = row(2, 5); place(U[0], ...p[0]); place(U[1], ...p[1]);
    for (const u of U.slice(2)) u.dead = true;
    place(A, p[1][0] + 12, p[1][1]); // far from U1, likely off the uplink leash too
    see(U[0], A);
    const u = U[1]; u.ap = 4; u.en = 100; u.moved = false; u.packCounted = false; u.holdTurns = 0;
    const act = enemyDecide(u);
    expect(u.pack).toBe('HUNT');
    expect(act).toBeTypeOf('function');
  });
  it('a wounded target is chased at a SPRINT', () => {
    const p = row(2, 5); place(U[0], ...p[0]); place(U[1], ...p[1]);
    for (const u of U.slice(2)) u.dead = true;
    place(A, p[1][0] + 12, p[1][1]);
    damagePart(A, 'LEGS', A.parts.LEGS);
    see(U[0], A);
    const u = U[1]; u.ap = 4; u.en = 100; u.moved = false;
    enemyDecide(u)();
    expect(u.sound).toBe(u.snd.SPRINT); // R14: its variant's sprint radius
  });
});

describe('press the wound (pickPackTarget)', () => {
  const c = (m, d) => ({ c: {}, m, d });
  it('picks the mech with more parts destroyed', () => {
    damagePart(B, 'SENSORS', B.parts.SENSORS);
    expect(pickPackTarget(U[0], [c(A, 2), c(B, 9)]).m).toBe(B);
  });
  it('then the one with fewer CORE hits left', () => {
    damagePart(A, 'CORE', 1);
    expect(pickPackTarget(U[0], [c(B, 2), c(A, 9)]).m).toBe(A);
  });
  it('ties go to the nearest', () => {
    expect(pickPackTarget(U[0], [c(A, 9), c(B, 2)]).m).toBe(B);
  });
});
