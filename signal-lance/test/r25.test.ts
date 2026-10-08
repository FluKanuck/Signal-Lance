// Round 25: "Lock the rules" (part A). The rule bugs from the R24 QA re-check, fixed before the Godot port copies the rules.
import { describe, it, expect, afterEach } from 'vitest';
import { TUNE } from '../src/tune.ts';
import { G } from '../src/sim/state.ts';
import { T, MAP, loadMap, HIVE } from '../src/sim/world.ts';
import { planMove, planDrawn, doMove, tileTaken, cmdSelect, fixKind, shotWord } from '../src/sim/turns.ts';
import { shotResult } from '../src/view/shots.ts';
import { rollEnemy, hooks } from '../src/sim/state.ts';
import { scanCmd, scanStep } from '../src/sim/livescan.ts';
import { checkInvariants } from '../src/sim/invariants.ts';
import { fresh } from '../src/sim/contract.ts';
import { DEFAULT_FIT, fitHits } from '../src/sim/kit.ts';
import { splitHits } from '../src/sim/combat.ts';
import { scenarioByName, startScenario, leaveScenario } from '../src/sim/scenarios.ts';
import { runAct, playOut } from '../src/sim/autoplay.ts';
import { startHunt } from './helpers.ts';

afterEach(() => { leaveScenario(); G.scan = null; loadMap(HIVE); });
const ctr = (x: number, y: number) => ({ x: (x + 0.5) * T, y: (y + 0.5) * T });
const tiny = (rows: string[]) => loadMap({ id: 'test', rows, anchors: HIVE.anchors, info: { grid: 'test' } });
function huntOn(lance: [number, number][], field: any[] = []) {
  const def = MAP;
  startScenario({ ...scenarioByName('Crunch'), map: undefined, uplink: [0, 0], lance: lance.map(t => ({ tile: t })), field });
  loadMap(def);
  const m = G.lance[0]; m.ap = 8; m.en = 100; m.freeTurns = TUNE.FREE_TURNS; m.sound = 0; m.fx = 1; m.fy = 0;
  return m;
}

describe('R25 fix 1: REFIT hits = hunt hits', () => {
  it('a fresh ExoS counts its hits as the sum of its parts (PART_MIN legs included), as the hunt does', () => {
    const c = fresh(DEFAULT_FIT), parts = splitHits('MECH', fitHits(DEFAULT_FIT));
    const sum = Object.values(parts).reduce((a, b) => a + b, 0);
    expect(c.maxHits).toBe(sum);
    expect(c.hits).toBe(sum);
    startHunt(1);
    expect(G.lance[0].maxHits).toBe(sum); // the hunt's own count for the same fit
  });
});

describe('R25 fix 2: a move says why it ends away from where you pointed (C06)', () => {
  it('ends where you pointed: no reason', () => {
    tiny(['##########', '..........', '##########']);
    const m = huntOn([[1, 1], [0, 1]]);
    expect(planMove(m, ctr(4, 1).x, ctr(4, 1).y, 'NORMAL').short).toBe('');
  });
  it('out of AP: AP, and the ExoS ends on the plan’s end', () => {
    tiny(['####################', '....................', '####################']);
    const m = huntOn([[1, 1], [0, 1]], [{ type: 'TURRET', variant: 'sentry', tile: [19, 1], face: [19, 0] }]); m.ap = 2; // a far enemy, so the hunt doesn't end as a clear
    const pl = planMove(m, ctr(18, 1).x, ctr(18, 1).y, 'NORMAL');
    expect(pl.short).toBe('AP');
    doMove(m, pl); runAct();
    const end = pl.path[pl.path.length - 1];
    expect(Math.hypot(m.x - end.x, m.y - end.y)).toBeLessThan(1);
    expect(G.mstop && G.mstop.why).toBe('AP');
  });
  it('clutter eats the AP: CLUTTER', () => {
    tiny(['####################', '..,,,,,,,,,,,,,,,,..', '####################']);
    const m = huntOn([[1, 1], [0, 1]]); m.ap = 3;
    expect(planMove(m, ctr(18, 1).x, ctr(18, 1).y, 'NORMAL').short).toBe('CLUTTER');
  });
  it('a spot in a wall: WALL', () => {
    tiny(['##########', '..........', '##########', '##########', '##########']);
    const m = huntOn([[1, 1], [0, 1]]);
    const pl = planMove(m, ctr(6, 4).x, ctr(6, 4).y, 'NORMAL');
    if (pl && pl.path) expect(pl.short).toBe('WALL'); else expect(pl).toBeFalsy(); // no route at all = no plan (MOVE says TAP OR DRAW)
  });
  it('round the walls: ROUTE', () => {
    tiny(['..........', '#########.', '..........']);
    const m = huntOn([[0, 2], [1, 2]]);
    const pl = planMove(m, ctr(0, 0).x, ctr(0, 0).y, 'SPRINT');
    expect(pl.cut).toBe(false);
    expect(pl.short).toBe('ROUTE');
  });
  it('a drawn path cut by AP says AP too', () => {
    tiny(['####################', '....................', '####################']);
    const m = huntOn([[1, 1], [0, 1]]); m.ap = 1;
    const pts = []; for (let x = 2; x <= 18; x++) pts.push(ctr(x, 1));
    expect(planDrawn(m, pts, 'NORMAL').short).toBe('AP');
  });
});

describe('R25 fix 3: two units never rest on one tile (C48)', () => {
  it('a move aimed at a lancemate’s tile ends just before it, and says why', () => {
    tiny(['####################', '....................', '####################']);
    const m = huntOn([[1, 1], [6, 1]], [{ type: 'TURRET', variant: 'sentry', tile: [19, 1], face: [19, 0] }]);
    const other = G.lance[1], pl = planMove(m, other.x, other.y, 'NORMAL');
    expect(pl.path).toBeTruthy();
    expect(pl.short).toBe('UNIT');
    doMove(m, pl); runAct();
    expect(tileTaken(m, m.x, m.y)).toBe(null);
    expect(checkInvariants().filter(v => v.startsWith('tile'))).toEqual([]);
  });
  it('the invariant names two units on one tile', () => {
    startHunt(1);
    const [a, b] = G.lance; b.x = a.x; b.y = a.y;
    expect(checkInvariants().some(v => v.includes('stand on one tile'))).toBe(true);
  });
  it('seeded block hunts played out by the scripted lance never rest two units on one tile', () => {
    for (let seed = 1; seed <= 6; seed++) {
      startHunt(seed, undefined, 'blocks');
      for (let t = 2; t <= 40 && G.mode === 'hunt'; t++) { playOut(t); if (G.mode === 'hunt' && !G.act) expect(checkInvariants().filter(v => v.startsWith('tile')), 'seed ' + seed + ' turn ' + G.turn).toEqual([]); }
    }
  });
});

describe('R25 fix 4: the contact’s fix reads the same everywhere (C20)', () => {
  it('fixKind follows the contact: SOUND, LINK, FUZZY, TIGHT', () => {
    const c: any = { on: true, snd: true, shr: false, lost: 0, gap: 1, unc: 0.1 * T };
    expect(fixKind(c)).toBe('SOUND');
    c.snd = false; c.shr = true; expect(fixKind(c)).toBe('LINK');
    c.shr = false; c.unc = (TUNE.PLAYER_FIRE_UNC + 1) * T; expect(fixKind(c)).toBe('FUZZY');
    c.unc = 0.3 * T; expect(fixKind(c)).toBe('TIGHT');
  });
  it('a select that turns the ExoS onto a heard contact gets eyes on it, and says so', () => {
    tiny(['##########', '..........', '##########']);
    const m = huntOn([[2, 1], [0, 1]], [{ type: 'TURRET', variant: 'sentry', tile: [6, 1], face: [9, 1] }]);
    m.fx = -1; m.fy = 0; m.freeTurns = 1; // looking away from it
    const u = G.units[0]; for (const k of G.pc) k.on = false;
    const c = G.pc[0]; Object.assign(c, { on: true, id: u.id, snd: true, shr: false, src: 'SOUND', lost: 0, gap: 1, unc: 2 * T, minU: 2 * T, tx: u.x, ty: u.y, vx: 0, vy: 0, seen: {}, by: {}, fresh: false });
    expect(fixKind(c)).toBe('SOUND');
    G.fixNote = null;
    cmdSelect(c);
    expect(fixKind(c)).toBe('TIGHT'); // eyes on it now: FIRE may aim at it
    expect(G.fixNote).toMatchObject({ id: u.id, from: 'SOUND', to: 'TIGHT' });
  });
});

describe('R25 fix 5: a paused scan clock never moves (C18)', () => {
  it('pause, drag a ring, toggle a sensor, step: the clock and the risk stay put', () => {
    const m = TUNE.MAP_MODE; TUNE.MAP_MODE = 'blocks'; G.scan = null;
    try { rollEnemy(3003, undefined, 'UPLINK'); } finally { TUNE.MAP_MODE = m; }
    const S = G.scan; expect(S && S.mode).toBe('active');
    scanCmd('R', 1); scanCmd('G'); for (let i = 0; i < 4; i++) scanStep(); scanCmd('S');
    const tick = S.tick, risk = S.risk;
    scanCmd('a', 5, 5, 0); scanCmd('a', 9, 7, 0); scanCmd('T', 1); scanCmd('W', 0, 1);
    for (let i = 0; i < 20; i++) scanStep();
    expect(S.tick).toBe(tick);
    expect(S.risk).toBe(risk);
    expect(checkInvariants().filter(v => v.startsWith('scan'))).toEqual([]);
    S.tick++; // the invariant catches a clock that moved anyway
    expect(checkInvariants().some(v => v.startsWith('scan'))).toBe(true);
  });
});

describe('R25 fix list 6–8: shot results say what happened (C08, C43, C51)', () => {
  it('every finished shot has one word, and a kill or down matches the victim', () => {
    let n = 0;
    for (let seed = 1; seed <= 8; seed++) {
      startHunt(seed, undefined, 'blocks'); playOut(80);
      for (const r of G.shotLog) {
        if (!r.done) continue; n++;
        const w = shotWord(r);
        expect(['HIT', 'MISS', 'KILL', 'DOWN', 'WALL']).toContain(w);
        if (r.hit) expect(r.victim).toBeTruthy();
        if (w === 'KILL') expect(r.mech).toBe(true);
        if (!r.roll) expect(r.hit).toBe(false); // a rolled miss never damages
      }
    }
    expect(n).toBeGreaterThan(20);
  });
  it('each ExoS turn gets every enemy shot since the last one, none lost and none twice', () => {
    const keep = hooks.activate; let total = 0;
    try {
      for (let seed = 1; seed <= 6; seed++) {
        startHunt(seed, undefined, 'blocks');
        const seen = new Set<any>(); let lastN = G.fireRep ? G.fireRep.n : 0;
        hooks.activate = () => { const F = G.fireRep; if (F && F.n !== lastN) { for (const r of F.list) { expect(seen.has(r)).toBe(false); expect(r.mech).toBe(false); seen.add(r); total++; } lastN = F.n; } };
        playOut(80);
        for (const r of G.shotLog.filter(r => !r.mech)) if (!G.eShots.includes(r)) expect(seen.has(r), 'seed ' + seed).toBe(true); // shown at an ExoS turn, or waiting for the next one
      }
    } finally { hooks.activate = keep; }
    expect(total).toBeGreaterThan(5); // the scripted hunts do draw enemy fire
  });
  it('the words: a hit names the part and the chance as a hit chance', () => {
    const r: any = { done: true, hit: true, part: 'WEAPON', pct: 77, victim: 'x', kill: false };
    expect(shotWord(r)).toBe('HIT');
    expect(shotResult(r)).toBe('HIT ARMS · had 77% to hit');
    expect(shotResult({ done: true, hit: false, pct: 77 })).toBe('MISS · had 77% to hit');
    expect(shotResult({ done: true, hit: false, wall: true, pct: 40 })).toBe('MISS · WALL · had 40% to hit');
    expect(shotResult({ done: false })).toBe('');
  });
});
