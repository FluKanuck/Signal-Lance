// Round 13 step 1: Sound vs Emissions. Each test reads like a line from the brief.
import { describe, it, expect, beforeEach } from 'vitest';
import { TUNE } from '../src/tune.ts';
import { G } from '../src/sim/state.ts';
import { T, W, H, canReach, tilesCrossed } from '../src/sim/world.ts';
import { beginUnit, planMove, doMove, shootBlock, mortarBlock, doPulse } from '../src/sim/turns.ts';
import { makeSound, hearSounds, soundRadius } from '../src/sim/sound.ts';
import { emitting, observe } from '../src/sim/sensors.ts';
import { runAct } from '../src/sim/autoplay.ts';
import { startHunt, place } from './helpers.ts';

let A, U; // the lance's first mech and one field unit, everything else switched off
beforeEach(() => {
  startHunt(3, 'Sweep');
  A = G.lance[0]; U = G.units[0];
  G.lance[1].dead = true; for (const u of G.units.slice(1)) u.dead = true;
  for (const c of G.pc) c.on = false; for (const c of U.ec) c.on = false;
});
const contactOn = (list, id) => list.find(c => c.on && c.id === id);
// two reachable tiles about `d` apart along a row (optionally with a wall between them)
function pair(d: number, walled: boolean) {
  for (let y = 0; y < H; y++) for (let x = 0; x + d < W; x++) {
    if (!canReach(x, y) || !canReach(x + d, y)) continue;
    const w = tilesCrossed((x + 0.5) * T, (y + 0.5) * T, (x + d + 0.5) * T, (y + 0.5) * T, 5);
    if (walled ? w > 0 : w === 0) return [x, y, x + d, y];
  }
  throw new Error('no tile pair');
}

describe('Sound is one radius, not a pool', () => {
  it('several events in one activation keep only the loudest', () => {
    makeSound(A, 'NORMAL'); makeSound(A, 'CREEP');
    expect(A.sound).toBe(TUNE.SOUND_RANGE.NORMAL);
    makeSound(A, 'SHOT');
    expect(A.sound).toBe(TUNE.SOUND_RANGE.SHOT);
  });
  it('clears at the start of the unit\'s next activation', () => {
    makeSound(A, 'SPRINT'); beginUnit(A);
    expect(A.sound).toBe(0);
  });
  it('a move makes the sound of its mode', () => {
    A.ap = 4; A.en = 100;
    const pl = planMove(A, A.x + 6 * T, A.y, 'SPRINT');
    expect(pl.snd).toBe(TUNE.SOUND_RANGE.SPRINT);
    doMove(A, pl);
    expect(A.sound).toBe(TUNE.SOUND_RANGE.SPRINT);
  });
});

describe('hearing', () => {
  it('a unit inside the radius gets a SOUND contact; outside it does not', () => {
    const [x0, y0, x1, y1] = pair(4, false);
    place(A, x0, y0); place(U, x1, y1);
    makeSound(A, 'CREEP'); hearSounds(); // 2 tiles: too quiet to reach 4
    expect(contactOn(U.ec, A.id)).toBeUndefined();
    makeSound(A, 'NORMAL'); hearSounds(); // 6 tiles
    const c = contactOn(U.ec, A.id);
    expect(c.snd).toBe(true);
    expect(c.unc).toBeCloseTo(TUNE.SOUND_UNC * T);
  });
  it('sound ignores walls', () => {
    const [x0, y0, x1, y1] = pair(4, true);
    place(A, x0, y0); place(U, x1, y1);
    makeSound(A, 'NORMAL'); hearSounds();
    expect(contactOn(U.ec, A.id)).toBeDefined();
  });
  it('the field\'s sound reaches the lance the same way', () => {
    const [x0, y0, x1, y1] = pair(4, false);
    place(A, x0, y0); place(U, x1, y1);
    makeSound(U, 'SHOT'); hearSounds();
    expect(contactOn(G.pc, U.id).snd).toBe(true);
  });
  it('never loosens a better live fix', () => {
    const [x0, y0, x1, y1] = pair(4, false);
    place(A, x0, y0); place(U, x1, y1);
    const eyes = observe(U.ec, A.id, A.x, A.y, TUNE.UNC_EYES * T, 0, 0, true, true, true, 'EYES');
    makeSound(A, 'SHOT'); hearSounds();
    expect(eyes.snd).toBe(false);
    expect(eyes.unc).toBeCloseTo(TUNE.UNC_EYES * T);
  });
  it('QUIET ground muffles the radius', () => {
    const z = G.zones.find(z => z.type === 'QUIET');
    place(A, z.tiles[0].x, z.tiles[0].y);
    makeSound(A, 'SHOT');
    expect(soundRadius(A)).toBeCloseTo(TUNE.SOUND_RANGE.SHOT * TUNE.ZONE_TYPES.QUIET.SIG_MULT);
  });
});

describe('a sound contact is never enough to shoot', () => {
  it('no gun lock and no aimed lob, even if its circle were tight', () => {
    const [x0, y0, x1, y1] = pair(3, false);
    place(A, x0, y0); place(U, x1, y1);
    makeSound(U, 'SHOT'); hearSounds();
    const c = contactOn(G.pc, U.id);
    c.unc = 0.5 * T; // pretend the circle shrank: the source still rules it out
    A.ap = 8; A.turnShots = 0; A.mUsed = 0; A.load.mortar = 1; A.shells = 4;
    expect(shootBlock(A, c, TUNE.PLAYER_FIRE_UNC, TUNE.PLAYER_FIRE_RANGE)).toBe('FUZZY');
    expect(mortarBlock(A, c)).toBe('FUZZY');
  });
});

describe('Emissions are electronic only', () => {
  it('moving no longer adds Emissions or reaches passive sensors', () => {
    A.ap = 4; A.en = 100; A.emit = 0;
    doMove(A, planMove(A, A.x + 6 * T, A.y, 'SPRINT'));
    expect(A.moving || G.act).toBeTruthy();
    expect(emitting(A)).toBe(false);
    runAct();
    expect(A.emit).toBe(0);
  });
  it('a radar pulse still adds Emissions', () => {
    A.ap = 4; A.en = 100; A.emit = 0;
    doPulse(A, null, null);
    expect(A.emit).toBe(TUNE.SIGNAL_RADAR);
    expect(emitting(A)).toBe(true);
  });
});
