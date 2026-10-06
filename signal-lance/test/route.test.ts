// Round 17: drawn routes ("Eyes on the street"). Drawn paths, facing waypoints, eyes on every step, the move interrupt,
// and scrap as low cover.
import { describe, it, expect, afterEach } from 'vitest';
import { TUNE } from '../src/tune.ts';
import { G } from '../src/sim/state.ts';
import { T, MAP, loadMap, HIVE, tilesCrossed } from '../src/sim/world.ts';
import { canSee } from '../src/sim/sensors.ts';
import { planMove, planDrawn, doMove } from '../src/sim/turns.ts';
import { hitChance, hitText, coverInfo } from '../src/sim/combat.ts';
import { revealed } from '../src/sim/ids.ts';
import { scenarioByName, startScenario, leaveScenario } from '../src/sim/scenarios.ts';
import { runAct } from '../src/sim/autoplay.ts';

afterEach(() => { leaveScenario(); loadMap(HIVE); });
const ctr = (x: number, y: number) => ({ x: (x + 0.5) * T, y: (y + 0.5) * T });
const tiny = (rows: string[]) => loadMap({ id: 'test', rows, anchors: HIVE.anchors, info: { grid: 'test' } });
const row = (y: number, x0: number, x1: number) => { const o: { x: number; y: number }[] = []; for (let x = x0; x <= x1; x++) o.push(ctr(x, y)); return o; }; // a stroke through tile centres
// a hunt on the hand-made map just loaded: lance on `tiles`, an optional field (the scenario loader builds them, then the map goes back)
function huntOn(lance: [number, number][], field: any[] = []) {
  const def = MAP;
  startScenario({ ...scenarioByName('Crunch'), map: undefined, uplink: [0, 0], lance: lance.map(t => ({ tile: t })), field });
  loadMap(def);
  const m = G.lance[0]; m.ap = 8; m.en = 100; m.freeTurns = TUNE.FREE_TURNS; m.sound = 0; m.fx = 1; m.fy = 0;
  return m;
}
// a street (row 4) with an alley going north at column 5; a sentry waits at its top, out of the cone of a suit walking east
const ALLEY = ['#####.##########', '#####.##########', '#####.##########', '#####.##########', '................', '################'];

describe('drawn paths', () => {
  it('a drawn path through clutter costs the same as a tap move along the same tiles', () => {
    tiny(['#########', '...,,....', '#########']);
    const m = huntOn([[1, 1], [0, 1]]);
    const tap = planMove(m, ctr(7, 1).x, ctr(7, 1).y, 'NORMAL'), drawn = planDrawn(m, row(1, 1, 7), 'NORMAL');
    expect(tap.crunch).toBe(true); expect(drawn.crunch).toBe(true);
    for (const k of ['len', 'ap', 'en', 'snd', 'cut']) expect(drawn[k]).toBeCloseTo(tap[k] as number, 5);
    expect(drawn.len).toBeCloseTo(6 + 2 * (TUNE.CLUTTER_TILE_COST - 1), 5); // 6 tiles, 2 of them clutter
  });
  it('clutter on a drawn path is taken on purpose (a tap move goes round it)', () => {
    tiny(['.........', '...,,....', '.........']);
    const m = huntOn([[1, 1], [0, 0]]);
    expect(planMove(m, ctr(7, 1).x, ctr(7, 1).y, 'NORMAL').crunch).toBe(false);
    expect(planDrawn(m, row(1, 1, 7), 'NORMAL').crunch).toBe(true);
  });
  it('a stroke through a wall is joined round it with A*, so the path is always walkable (r17-s2: freehand)', () => {
    tiny(['.........', '...##....', '.........']);
    const m = huntOn([[1, 1], [0, 0]]);
    const pl = planDrawn(m, row(1, 1, 7), 'NORMAL'), F = pl.full;
    for (let i = 1; i < F.length; i++) expect(tilesCrossed(F[i - 1].x, F[i - 1].y, F[i].x, F[i].y, 1)).toBe(0);
    expect(F[F.length - 1]).toEqual(ctr(7, 1));
  });
  it('freehand: the path follows the stroke off the tile centres, and small wobbles are straightened', () => {
    tiny(['..........', '..........', '..........']);
    const m = huntOn([[0, 1], [0, 0]]);
    const wob = [1, 2, 3, 4, 5, 6, 7, 8].map((x, i) => ({ x: (x + 0.5) * T, y: (1.5 + (i % 2 ? 0.1 : -0.1)) * T }));
    const pl = planDrawn(m, wob, 'NORMAL');
    expect(pl.full.length).toBe(2); expect(pl.length).toBeCloseTo(8, 1);
    const bend = planDrawn(m, [ctr(3, 1), { x: 4.5 * T, y: 0.3 * T }, ctr(6, 1)], 'NORMAL'); // a real bend is kept, between tile centres
    expect(bend.full.length).toBe(4); expect(bend.full[2].y).toBeCloseTo(0.3 * T, 5);
  });
  it('straightening never cuts round scrap you drew through', () => {
    tiny(['..........', '....,.....', '..........']);
    const m = huntOn([[0, 0], [0, 2]]);
    const pl = planDrawn(m, [ctr(2, 0), ctr(4, 1), ctr(6, 0), ctr(8, 0)], 'NORMAL');
    expect(pl.crunch).toBe(true);
  });
  it('a path longer than the AP buys is cut where the AP runs out (no multi-turn paths)', () => {
    tiny(['................']);
    const m = huntOn([[0, 0], [0, 0]]); m.ap = 2;
    const pl = planDrawn(m, row(0, 1, 12), 'NORMAL');
    expect(pl.cut).toBe(true); expect(pl.why).toBe('AP');
    expect(pl.len).toBeCloseTo(2 * TUNE.MOVE_TILES_PER_AP.NORMAL, 5); expect(pl.ap).toBe(2);
    expect(pl.length).toBeCloseTo(12, 5); // the whole stroke is kept for the preview (past where the AP runs out)
  });
});

describe('facing waypoints', () => {
  it('cost FREE_TURNS first, then AP_TURN each, all in the move total; capped at FACE_WAYPOINTS_MAX', () => {
    tiny(['................']);
    const m = huntOn([[0, 0], [0, 0]]);
    const wps = [3, 5, 7, 9].map(x => ({ d: x, fx: 0, fy: 1 }));
    const bare = planDrawn(m, row(0, 1, 10), 'NORMAL');
    const one = planDrawn(m, row(0, 1, 10), 'NORMAL', wps.slice(0, 1));
    expect(one.wpAP).toBe(0); expect(one.ap).toBe(bare.ap); // the free turn
    const three = planDrawn(m, row(0, 1, 10), 'NORMAL', wps);
    expect(three.wps.length).toBe(TUNE.FACE_WAYPOINTS_MAX); // the 4th is over the cap
    expect(three.wpAP).toBe((TUNE.FACE_WAYPOINTS_MAX - TUNE.FREE_TURNS) * TUNE.AP_TURN);
    expect(three.ap).toBe(bare.ap + three.wpAP);
    m.freeTurns = 0;
    expect(planDrawn(m, row(0, 1, 10), 'NORMAL', wps.slice(0, 1)).wpAP).toBe(TUNE.AP_TURN);
  });
  it('a waypoint past where the AP runs out is dropped (and costs nothing)', () => {
    tiny(['................']);
    const m = huntOn([[0, 0], [0, 0]]); m.ap = 2; m.freeTurns = 0;
    const pl = planDrawn(m, row(0, 1, 12), 'NORMAL', [{ d: 10, fx: 0, fy: 1 }]);
    expect(pl.wps.length).toBe(0); expect(pl.wpAP).toBe(0); expect(pl.ap).toBe(2);
  });
  it('the suit turns at the waypoint and holds that facing to the end of the move', () => {
    tiny(['................', '................', '################', '..............#.']);
    const m = huntOn([[0, 0], [0, 1]], [{ type: 'TURRET', variant: 'sentry', tile: [12, 3] }]); // walled off (an empty field would end the hunt)
    const pl = planDrawn(m, row(0, 1, 8), 'NORMAL', [{ d: 4, fx: 0, fy: 1 }]);
    doMove(m, pl); runAct();
    expect(Math.floor(m.x / T)).toBe(8);
    expect(m.fx).toBeCloseTo(0, 5); expect(m.fy).toBeCloseTo(1, 5);
  });
});

describe('eyes on every step, and the interrupt', () => {
  const sentry = [{ type: 'TURRET', variant: 'sentry', tile: [5, 0], face: [5, 4] }];
  it('eyes are checked on every tile with the current facing: a waypoint aimed up the alley sees the sentry, walking past does not', () => {
    const it0 = TUNE.MOVE_INTERRUPT; TUNE.MOVE_INTERRUPT = false;
    try {
      tiny(ALLEY); let m = huntOn([[0, 4], [0, 4]], sentry);
      doMove(m, planDrawn(m, row(4, 1, 10), 'NORMAL')); runAct();
      expect(revealed(G.units[0].id)).toBe(false); // facing east the whole way: never looked up the alley
      tiny(ALLEY); m = huntOn([[0, 4], [0, 4]], sentry);
      const pl = planDrawn(m, row(4, 1, 10), 'NORMAL', [{ d: 5, fx: 0, fy: -1 }]);
      doMove(m, pl); expect(G.act.drawn).toBe(true); const a = G.act; runAct();
      expect(revealed(G.units[0].id)).toBe(true); // looked as it passed the mouth
      expect(a.steps).toBe(10); // one sensor look per tile entered
    } finally { TUNE.MOVE_INTERRUPT = it0; }
  });
  it('something new stops the move on that tile; unspent AP and EN are refunded, the log notes it', () => {
    tiny(ALLEY); const m = huntOn([[0, 4], [0, 4]], sentry);
    m.freeTurns = 0; // so the waypoint costs AP_TURN
    const pl = planDrawn(m, row(4, 1, 10), 'NORMAL', [{ d: 5, fx: 0, fy: -1 }]);
    const ap0 = m.ap, en0 = m.en;
    doMove(m, pl); runAct();
    expect(Math.floor(m.x / T)).toBe(5); // stopped at the alley mouth
    expect(G.moveStat.intr).toEqual(['A TURRET eyes']);
    const walked = 5 - 0.5 + 0.5; // tile centre (0.5) to tile centre (5.5)
    expect(m.ap).toBe(ap0 - Math.ceil(walked / TUNE.MOVE_TILES_PER_AP.NORMAL - 1e-6) - TUNE.AP_TURN);
    expect(m.ap).toBeGreaterThan(ap0 - pl.ap);
    expect(m.en).toBe(en0 - Math.ceil(walked * TUNE.MOVE_ENERGY_PER_TILE.NORMAL - 1e-6));
    expect(G.intr && G.intr.id).toBe('A');
  });
  it('a contact already in sight at the start does not stop the move; MOVE_INTERRUPT false never stops it', () => {
    tiny(ALLEY); let m = huntOn([[5, 4], [0, 4]], sentry); m.fx = 0; m.fy = -1; // already looking up the alley
    const pl = planDrawn(m, row(4, 6, 10), 'NORMAL', [{ d: 1, fx: 0, fy: -1 }]);
    doMove(m, pl); runAct();
    expect(G.moveStat.intr.length).toBe(0); expect(Math.floor(m.x / T)).toBe(10);
    const it0 = TUNE.MOVE_INTERRUPT; TUNE.MOVE_INTERRUPT = false;
    try {
      tiny(ALLEY); m = huntOn([[0, 4], [0, 4]], sentry);
      doMove(m, planDrawn(m, row(4, 1, 10), 'NORMAL', [{ d: 5, fx: 0, fy: -1 }])); runAct();
      expect(G.moveStat.intr.length).toBe(0); expect(Math.floor(m.x / T)).toBe(10);
    } finally { TUNE.MOVE_INTERRUPT = it0; }
  });
  it('a tap move is interrupted the same way', () => {
    tiny(ALLEY); const m = huntOn([[0, 4], [0, 4]], [{ type: 'TURRET', variant: 'sentry', tile: [14, 4], face: [0, 4] }]); // just past eyes range, dead ahead
    doMove(m, planMove(m, ctr(10, 4).x, ctr(10, 4).y, 'NORMAL')); runAct();
    expect(G.moveStat.intr.length).toBe(1); expect(Math.floor(m.x / T)).toBeLessThan(4);
  });
});

describe('scrap is low cover (Jamie, parked #62)', () => {
  const odds = (m: any, u: any) => hitChance(m, u, { tx: u.x, ty: u.y });
  it('a target covered only by clutter gets HIT_COVER_LOW; a wall gives HIT_COVER; the odds line says "low cover"', () => {
    tiny(['..........', '.....,....', '..........']);
    const m = huntOn([[0, 1], [0, 0]], [{ type: 'TURRET', variant: 'sentry', tile: [6, 1] }]), u = G.units[0];
    let h = odds(m, u);
    expect(h.cover).toBe(-TUNE.HIT_COVER_LOW); expect(h.coverKind).toBe('LOW');
    expect(hitText(h)).toContain('low cover −' + TUNE.HIT_COVER_LOW);
    expect(coverInfo(m.x, m.y, u.x, u.y).give).toContainEqual([5, 1]); // the piece giving it
    tiny(['..........', '.....#....', '..........']);
    h = odds(m, u);
    expect(h.cover).toBe(-TUNE.HIT_COVER); expect(h.coverKind).toBe('WALL');
    expect(hitText(h)).toContain('· cover −' + TUNE.HIT_COVER);
  });
  it('shared cover reports the cancelled piece (the shooter leans round it)', () => {
    tiny(['..........', '....%.....', '....%.....', '..........']);
    const ci = coverInfo(ctr(3, 1).x, ctr(3, 1).y, ctr(5, 2).x, ctr(5, 2).y);
    expect(ci.kind).toBe(''); expect(ci.cancelled).toContainEqual([4, 1]);
  });
});

describe('R17 scenarios (packed district 1701)', () => {
  const at = (u, x: number, y: number, fx: number, fy: number) => { u.x = ctr(x, 0).x; u.y = ctr(0, y).y; const d = Math.hypot(fx, fy); u.fx = fx / d; u.fy = fy / d; };
  it('Side street: facing along the street the turret is never in sight; aimed north at the alley mouth it is', () => {
    startScenario(scenarioByName('Side street'));
    const [A] = G.lance, u = G.units[0];
    expect(MAP.info.grid).toBe('4x2');
    for (let x = 13; x <= 40; x++) { at(A, x, 13, 1, 0); expect(canSee(A, u, TUNE.EYES_RANGE)).toBe(false); }
    at(A, 24, 13, 0, -1); expect(canSee(A, u, TUNE.EYES_RANGE)).toBe(true);
  });
  it('Trip wire: the tap move to the uplink is stopped by the patrol coming into view, with AP left to react', () => {
    startScenario(scenarioByName('Trip wire'));
    const A = G.p; // whichever ExoS acts first, with its first activation's AP
    const ap0 = A.ap, pl = planMove(A, G.up.x, G.up.y, 'NORMAL');
    doMove(A, pl); runAct();
    expect(G.moveStat.intr.length).toBe(1); expect(G.moveStat.intr[0]).toContain('PATROL');
    expect(A.ap).toBeGreaterThan(ap0 - pl.ap);
  });
  it('Scrap line: from A, one turret is behind scrap (low cover) and the other behind a wall, both in line of sight', () => {
    startScenario(scenarioByName('Scrap line'));
    const A = G.lance[0], [n, s] = G.units;
    for (const u of [n, s]) expect(tilesCrossed(A.x, A.y, u.x, u.y, 1)).toBe(0);
    expect(coverInfo(A.x, A.y, n.x, n.y).kind).toBe('WALL');
    expect(coverInfo(A.x, A.y, s.x, s.y).kind).toBe('LOW');
  });
});
