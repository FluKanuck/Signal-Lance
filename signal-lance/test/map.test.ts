// Round 16: rolled ground. Block districts, clutter, the seam-built escort route, and the R16 scenarios.
import { describe, it, expect, afterEach } from 'vitest';
import { TUNE } from '../src/tune.ts';
import { G, fieldCount } from '../src/sim/state.ts';
import { setSeed } from '../src/sim/rng.ts';
import { T, W, H, MAP, loadMap, HIVE, canReach, isSolid, isClutter, findPath, pathHitsClutter, tilesCrossed, anchors } from '../src/sim/world.ts';
import { rollDistrict, rollSpec, buildDistrict, BLOCKS, mapText, routeOk } from '../src/sim/blocks.ts';
import { planMove, doMove } from '../src/sim/turns.ts';
import { inCover } from '../src/sim/combat.ts';
import { legsFrom, legPath } from '../src/sim/escort.ts';
import { scenarioByName, startScenario, leaveScenario } from '../src/sim/scenarios.ts';
import { startHunt, playHunt } from './helpers.ts';

afterEach(() => { leaveScenario(); loadMap(HIVE); });
const roll = (seed: number, grid?: string) => { setSeed(seed); return rollDistrict(seed, grid); };
const ctr = (x: number, y: number) => ({ x: (x + 0.5) * T, y: (y + 0.5) * T });
// a small hand-made map (the hive's anchors table rides along; these tests never read it)
const tiny = (rows: string[]) => loadMap({ id: 'test', rows, anchors: HIVE.anchors, info: { grid: 'test' } });

describe('districts', () => {
  it('every rolled district is reachable (rerolls rare): uplinks, route nodes and the right edge', () => {
    let rr = 0;
    for (let s = 1; s <= 80; s++) {
      roll(s); if (MAP.info.rerolls) rr++;
      for (const u of anchors().uplinks) expect(canReach(u.x, u.y)).toBe(true);
      for (const n of Object.values(anchors().waypoints) as any[]) expect(canReach(n.x, n.y)).toBe(true);
      expect(routeOk()).toBe(true);
    }
    expect(rr).toBeLessThanOrEqual(4); // 5%
  });
  it('a set piece never cuts a street tile off from the spawn', () => {
    for (let s = 1; s <= 40; s++) {
      const spec = rollSpec(); spec.mods = spec.cells.flatMap((c, i) => BLOCKS.find(b => b.name === c.b).mods.map((_, k) => [i, k] as [number, number])); // every slot spawns
      buildDistrict(spec);
      let open = 0, cut = 0;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (MAP.rows[y][x] === '.' || MAP.rows[y][x] === ',') { open++; if (!canReach(x, y)) cut++; }
      // blocks are drawn without walled pockets, so every street tile stays reachable
      expect(cut).toBe(0); expect(open).toBeGreaterThan(0);
    }
  });
  it('the grid respects MAP_MIN_BLOCKS, and every block is BLOCK_SIZE square with a street ring', () => {
    const g = TUNE.MAP_GRIDS;
    TUNE.MAP_GRIDS = ['2x2', '3x2', '4x2'];
    try { for (let s = 1; s <= 30; s++) { roll(s); expect(MAP.info.grid).toBe('4x2'); } } finally { TUNE.MAP_GRIDS = g; }
    for (const b of BLOCKS) {
      expect(b.rows.length).toBe(TUNE.BLOCK_SIZE);
      for (const r of b.rows) expect(r.length).toBe(TUNE.BLOCK_SIZE);
      const S = TUNE.BLOCK_SIZE - 1;
      for (let k = 0; k <= S; k++) for (const [x, y] of [[k, 0], [k, S], [0, k], [S, k]]) expect(b.rows[y][x]).not.toBe('#');
    }
  });
  it('the same block never sits next to itself (left or above)', () => {
    for (let s = 1; s <= 30; s++) {
      setSeed(s); const sp = rollSpec();
      sp.cells.forEach((c, i) => {
        if (i % sp.cols) expect(c.b).not.toBe(sp.cells[i - 1].b);
        if (i >= sp.cols) expect(c.b).not.toBe(sp.cells[i - sp.cols].b);
      });
    }
  });
  it('the map is per-hunt: size follows the grid, the spawn is the left edge mid-height, the same seed builds the same map', () => {
    roll(7, '4x3'); expect([W, H]).toEqual([48, 36]);
    const rows = MAP.rows.join('');
    startHunt(3, undefined, 'blocks'); expect(G.lance[0].x).toBeLessThan(T); // left edge
    roll(7, '4x3'); expect(MAP.rows.join('')).toBe(rows);
    loadMap(HIVE); expect([W, H]).toEqual([72, 24]);
  });
  it("MAP_MODE 'hive' plays today's map", () => {
    startHunt(1, undefined, 'hive');
    expect(MAP.id).toBe('hive'); expect(W).toBe(72);
    expect(mapText()).toBe('MAP hive');
  });
  it('the log line names the grid, blocks and mods', () => {
    roll(3, '4x3');
    expect(mapText(2)).toMatch(/^MAP 4x3 seed 3 · pieces: [^·]+ · mods: \d+ clutter, \d+ set pieces?, 2 zones · streets: \d+ rubble, \d+ shut, \d+ choked$/);
  });
  it('the field scales with area (never below the composition), zones roll from the block slots', () => {
    const mixed = TUNE.FIELD_COMPOSITIONS[0];
    roll(1, '4x4'); expect(fieldCount(mixed, 'PATROL')).toBe(3); // 2 × 2304/1728 = 2.67
    roll(1, '3x3'); expect(fieldCount(mixed, 'PATROL')).toBe(2); // 1.5 → never below 2
    startHunt(5, 'Mixed', 'blocks');
    const names = anchors().zoneSlots.map(z => z.name);
    for (const z of G.zones) expect(names).toContain(z.name);
  });
  it('block hunts play out for every mission type (no stalls)', () => {
    for (const m of ['UPLINK', 'BOUNTY', 'RETRIEVE', 'ESCORT']) for (const s of [1, 2]) expect(playHunt(s, undefined, 80, 'blocks', m).outcome).not.toBe('STALL');
  });
});

describe('packed districts (R16 debrief 2)', () => {
  it('pieces come from the whole shape library, the left edge is a road, the map is cropped at random offsets', () => {
    const shapes = new Set<string>();
    for (let s = 1; s <= 20; s++) {
      roll(s); expect(MAP.info.layout).toBe('packed');
      for (const k of Object.keys(MAP.info.counts.shapes)) shapes.add(k);
      for (let y = 0; y < H; y++) expect(isSolid(0, y)).toBe(false);
    }
    expect(shapes.size).toBeGreaterThanOrEqual(6);
  });
  it('STREET_KEEP shapes congestion: dropping street sides closes the map up', () => {
    const openShare = () => { let o = 0; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (!isSolid(x, y)) o++; return o / (W * H); };
    const k = TUNE.STREET_KEEP, avg = (v: number) => { TUNE.STREET_KEEP = v; let a = 0; for (let s = 1; s <= 8; s++) { roll(s, '4x3'); a += openShare(); } return a / 8; };
    try { expect(avg(0.2)).toBeLessThan(avg(1)); } finally { TUNE.STREET_KEEP = k; }
  });
  it("MAP_LAYOUT 'grid' still builds the r16-s3 block grid", () => {
    const l = TUNE.MAP_LAYOUT; TUNE.MAP_LAYOUT = 'grid';
    try { roll(4, '4x3'); expect(MAP.info.layout).toBeUndefined(); expect(MAP.info.blocks.length).toBe(12); } finally { TUNE.MAP_LAYOUT = l; }
  });
});

describe('R16 debrief 3: routes, start zones, convoy orders', () => {
  it('no Escort leg loops back west more than ESCORT_BACKTRACK tiles', () => {
    for (let s = 1; s <= 60; s++) {
      roll(s);
      for (const l of anchors().legs) { const P = legPath(anchors().legs.indexOf(l)); let w = 0; for (let i = 1; i < P.length; i++) w += Math.max(0, P[i - 1].x - P[i].x); expect(w / T).toBeLessThanOrEqual(TUNE.ESCORT_BACKTRACK + 1e-6); }
    }
  });
  it('the spawn has a cleared staging apron, and the transport starts on the spawn row', () => {
    for (let s = 1; s <= 20; s++) {
      startHunt(s, undefined, 'blocks', 'ESCORT');
      const sy = Math.floor(G.lance[0].y / T), A = TUNE.SPAWN_APRON;
      for (let y = Math.max(0, sy - (A.H >> 1)); y < Math.min(H, sy + (A.H >> 1) + 1); y++) for (let x = 0; x < A.W; x++) expect(isSolid(x, y)).toBe(false);
      expect(anchors().waypoints.S.y).toBe(sy);
    }
  });
  it('HOLD: the transport skips its next move, then carries on; uses run out; the same order again cancels and refunds', async () => {
    const { giveOrder, orderBlock, allyStep, makeAlly } = await import('../src/sim/escort.ts');
    startHunt(3, undefined, 'blocks', 'ESCORT');
    G.ally = makeAlly('S'); const a = G.ally; // on its first leg, walking
    expect(giveOrder('HOLD')).toBe(true); expect(a.holdsLeft).toBe(TUNE.ESCORT_HOLDS - 1);
    expect(giveOrder('HOLD')).toBe(true); expect(a.order).toBe(''); expect(a.holdsLeft).toBe(TUNE.ESCORT_HOLDS); // cancel = refund
    giveOrder('HOLD'); const x0 = a.x;
    expect(allyStep()).toBeNull(); expect(a.x).toBe(x0); expect(G.mission.holds).toBe(1); // skipped
    expect(allyStep()).not.toBeNull(); // then it moves again
    a.holdsLeft = 0; expect(orderBlock('HOLD')).toBe('USED');
  });
  it('HURRY: the next move is a sprint (ESCORT_SPRINT tiles, SPRINT sound); HOLD is refused while it waits at a fork', async () => {
    const { giveOrder, orderBlock, allyStep, makeAlly } = await import('../src/sim/escort.ts');
    const { pathLen } = await import('../src/sim/turns.ts');
    startHunt(3, undefined, 'blocks', 'ESCORT');
    G.ally = makeAlly('J1'); expect(orderBlock('HOLD')).toBe('FORK');
    G.ally = makeAlly('S'); const a = G.ally; a.sound = 0;
    expect(giveOrder('HURRY')).toBe(true);
    const P = allyStep();
    expect(pathLen(P)).toBeGreaterThan(TUNE.ESCORT_MOVE + 0.5);
    expect(pathLen(P)).toBeLessThanOrEqual(TUNE.ESCORT_SPRINT + 0.01);
    expect(a.sound).toBeGreaterThanOrEqual(TUNE.SOUND_RANGE.SPRINT);
    expect(a.hurrying).toBe(true); expect(G.mission.hurries).toBe(1);
  });
});

describe('clutter', () => {
  const ROWS = [
    '..........',
    '....,,....',
    '....,,....',
    '..........',
  ];
  it('each clutter tile costs CLUTTER_TILE_COST tiles of movement', () => {
    tiny(['....,,....']); startHuntOn();
    const m = G.lance[0]; m.x = ctr(1, 0).x; m.y = ctr(1, 0).y; m.ap = 8; m.en = 100;
    const pl = planMove(m, ctr(8, 0).x, ctr(8, 0).y, 'NORMAL'); // one row: no way round
    expect(pl.len).toBeCloseTo(7 + 2 * (TUNE.CLUTTER_TILE_COST - 1), 1); // 7 tiles, 2 of them clutter
  });
  it('pathing goes round a patch when it can, and through it when going round costs more', () => {
    tiny(ROWS); startHuntOn();
    expect(pathHitsClutter(findPath(ctr(1, 1).x, ctr(1, 1).y, ctr(8, 1).x, ctr(8, 1).y))).toBe(false); // one row up: cheap
    const k = TUNE.CLUTTER_TILE_COST; TUNE.CLUTTER_TILE_COST = 1;
    try { expect(pathHitsClutter(findPath(ctr(1, 1).x, ctr(1, 1).y, ctr(8, 1).x, ctr(8, 1).y))).toBe(true); } finally { TUNE.CLUTTER_TILE_COST = k; } // off: straight through
    tiny(['#########', '....,....', '#########']); startHuntOn();
    expect(pathHitsClutter(findPath(ctr(1, 1).x, ctr(1, 1).y, ctr(7, 1).x, ctr(7, 1).y))).toBe(true); // no way round
  });
  it('a move that enters clutter adds CLUTTER_SOUND once; 0 = off', () => {
    tiny(['....,,....']); startHuntOn();
    const m = G.lance[0]; m.x = ctr(1, 0).x; m.y = ctr(1, 0).y; m.ap = 8; m.en = 100; m.sound = 0;
    const pl = planMove(m, ctr(8, 0).x, ctr(8, 0).y, 'NORMAL');
    expect(pl.snd).toBe(TUNE.SOUND_RANGE.NORMAL + TUNE.CLUTTER_SOUND);
    doMove(m, pl); expect(m.sound).toBe(TUNE.SOUND_RANGE.NORMAL + TUNE.CLUTTER_SOUND);
    const c = TUNE.CLUTTER_SOUND; TUNE.CLUTTER_SOUND = 0;
    try { m.sound = 0; m.x = ctr(1, 0).x; G.act = null; const p2 = planMove(m, ctr(8, 0).x, ctr(8, 0).y, 'NORMAL'); expect(p2.snd).toBe(TUNE.SOUND_RANGE.NORMAL); } finally { TUNE.CLUTTER_SOUND = c; }
  });
  it('clutter is low cover (the cover rule) but never blocks line of sight', () => {
    tiny(['..........', '.....,....', '..........']); startHuntOn();
    const a = ctr(0, 1), b = ctr(6, 1);
    expect(tilesCrossed(a.x, a.y, b.x, b.y, 1)).toBe(0);
    expect(inCover(a.x, a.y, b.x, b.y)).toBe(true);
    tiny(['..........', '..........', '..........']); startHuntOn();
    expect(inCover(a.x, a.y, b.x, b.y)).toBe(false);
  });
});
// a bare hunt (no field) on the hand-made map just loaded: the scenario loader builds the lance, then the map goes back
function startHuntOn() {
  const def = MAP;
  startScenario({ ...scenarioByName('Crunch'), map: undefined, uplink: [0, 0], lance: [{ tile: [0, 0] }, { tile: [0, 0] }], field: [] });
  loadMap(def);
}

describe('street blockers (R16 debrief)', () => {
  it('stretches of street get rubble, barricades and chokes, never in extraction, and every street tile stays reachable', () => {
    let bar = 0, rub = 0, chk = 0;
    for (let s = 1; s <= 40; s++) {
      roll(s); const c = MAP.info.counts; bar += c.BARRICADE; rub += c.RUBBLE; chk += c.CHOKE;
      for (let y = 0; y < H; y++) for (let x = W - TUNE.EXTRACT_COLS; x < W; x++) expect(isSolid(x, y)).toBe(false);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (MAP.rows[y][x] === '.' || MAP.rows[y][x] === ',') expect(canReach(x, y)).toBe(true);
    }
    expect(bar).toBeGreaterThan(0); expect(rub).toBeGreaterThan(0); expect(chk).toBeGreaterThan(0);
  });
  it('SEAM_BLOCK_CHANCE 0 gives the open grid back', () => {
    const k = TUNE.SEAM_BLOCK_CHANCE; TUNE.SEAM_BLOCK_CHANCE = 0;
    try { roll(5); const c = MAP.info.counts; expect(c.RUBBLE + c.BARRICADE + c.CHOKE).toBe(0); } finally { TUNE.SEAM_BLOCK_CHANCE = k; }
  });
});

describe('escort route on block maps', () => {
  it(`ESCORT_FORKS forks, each with two different onward legs, and every route reaches extraction`, () => {
    for (const g of TUNE.MAP_GRIDS) for (const s of [1, 2, 3]) {
      roll(s, g);
      const A = anchors();
      expect(A.junctions.length).toBe(Math.min(TUNE.ESCORT_FORKS, Number(g.split('x')[0]) - 1));
      for (const j of A.junctions) {
        const L = legsFrom(j); expect(L.length).toBeGreaterThanOrEqual(2); expect(L.length).toBeLessThanOrEqual(3);
        for (const l of L) expect(['NORTH', 'AHEAD', 'SOUTH']).toContain(l.name);
        expect(new Set(L.map(l => l.name)).size).toBe(L.length);
        const sig = L.map(l => legPath(l.i).map(p => Math.round(p.x) + ',' + Math.round(p.y)).join()); expect(new Set(sig).size).toBe(L.length); // the legs really differ
      }
      // walk every route: S → ... → X, and X's leg ends in extraction
      const walk = (k: string): boolean => k[0] === 'X' || legsFrom(k).every(l => legPath(l.i).length > 1 && walk(l.to));
      expect(walk('S')).toBe(true);
      for (const k of Object.keys(A.waypoints).filter(k => k[0] === 'X')) expect(A.waypoints[k].x).toBeGreaterThanOrEqual(W - TUNE.EXTRACT_COLS); // every exit is in extraction
      expect(A.waypoints.S.x).toBe(0);
    }
  });
});

describe('R16 scenarios', () => {
  it('Long way round: the short street to the cargo is cluttered, and a clutter-free way round exists', () => {
    startScenario(scenarioByName('Long way round'));
    let any = false; for (let x = 3; x < 30; x++) if (isClutter(x, 11) && isClutter(x, 12)) any = true;
    expect(any).toBe(true); // the seam street is crossed by scrap
    const k = TUNE.CLUTTER_TILE_COST; TUNE.CLUTTER_TILE_COST = 50; // a way round that never touches clutter
    try { expect(pathHitsClutter(findPath(G.lance[0].x, G.lance[0].y, G.up.x, G.up.y))).toBe(false); } finally { TUNE.CLUTTER_TILE_COST = k; }
    const p = G.units[0], band = ctr(20, 11), d = Math.hypot(p.x - band.x, p.y - band.y) / T;
    expect(d).toBeLessThanOrEqual(TUNE.SOUND_RANGE.NORMAL + TUNE.CLUTTER_SOUND); // it hears a crunch...
    expect(Math.hypot(p.x - ctr(19, 12).x, p.y - ctr(19, 12).y) / T).toBeGreaterThan(TUNE.SOUND_RANGE.NORMAL); // ...but not plain steps on the far side of the street
  });
  for (const n of ['Two districts: strip', 'Two districts: square']) it(`${n}: the kiosk hides the turret from the north leg's start, and it sees the leg further on`, () => {
    startScenario(scenarioByName(n));
    const t = G.units[0], N = legsFrom('J1').find(l => l.name === 'NORTH'), P = legPath(N.i);
    expect(G.ally.node).toBe('J1');
    const sees = (q) => Math.hypot(q.x - t.x, q.y - t.y) <= TUNE.EYES_RANGE * T && tilesCrossed(t.x, t.y, q.x, q.y, 1) === 0;
    expect(sees(P[1])).toBe(false); // the corner where the leg turns onto the top street: hidden
    let later = false; const L = P[P.length - 1];
    for (let x = P[1].x; x < L.x; x += T / 2) if (sees({ x, y: P[1].y })) later = true;
    expect(later).toBe(true);
  });
  it('Crunch: one suit; the sentry hears a crunch in the band but not plain steps; it can see the street by the uplink', () => {
    startScenario(scenarioByName('Crunch'));
    expect(G.lance.filter(m => !m.dead).length).toBe(1);
    const t = G.units[0], d = (x: number, y: number) => Math.hypot(t.x - ctr(x, y).x, t.y - ctr(x, y).y) / T;
    expect(isClutter(20, 11)).toBe(true);
    expect(d(21, 11)).toBeLessThanOrEqual(TUNE.SOUND_RANGE.NORMAL + TUNE.CLUTTER_SOUND);
    expect(d(21, 11)).toBeGreaterThan(TUNE.SOUND_RANGE.CREEP + TUNE.CLUTTER_SOUND); // creeping through stays quiet
    expect(d(27, 11)).toBeGreaterThan(TUNE.SOUND_RANGE.NORMAL); // standing on the uplink is out of earshot
    const s = ctr(24, 11); expect(tilesCrossed(t.x, t.y, s.x, s.y, 1)).toBe(0); // the street below is in its view once it turns
  });
});
