// Round 19: listen before you land. The pre-drop scan (src/sim/scan.ts): the reveal ladder, drop zones, the drop.
import { describe, it, expect, afterEach } from 'vitest';
import { TUNE } from '../src/tune.ts';
import { G, rollEnemy, newHunt } from '../src/sim/state.ts';
import { T, H, loadMap, HIVE, canReach, spawnX, spawnY } from '../src/sim/world.ts';
import { listen, chooseDrop, offeredDrops, dropPts, zoneKnow, emitter, roster } from '../src/sim/scan.ts';
import { matchVariants } from '../src/sim/ids.ts';
import { newContract, previewJob, takeJob, relockLoads, fitsOpen } from '../src/sim/contract.ts';
import { leaveScenario } from '../src/sim/scenarios.ts';
import { LOAD, LOAD_A } from './helpers.ts';

afterEach(() => { leaveScenario(); G.scan = null; G.drops = null; loadMap(HIVE); });
// a job's world with the scan on (packed district)
function job(seed: number, mission = 'UPLINK', comp?: string, keep = false) {
  const m = TUNE.MAP_MODE; TUNE.MAP_MODE = 'blocks'; if (!keep) G.scan = null; // keep = the same job rolled again (preview, then take)
  try { rollEnemy(seed, comp, mission); } finally { TUNE.MAP_MODE = m; }
  return G.scan;
}
const tile = (u: any) => ({ x: Math.floor(u.x / T), y: Math.floor(u.y / T) });

describe('drop zones', () => {
  it('a packed district gets the west spawn plus north and south aprons, each reachable, cleared and on its edge', () => {
    for (let s = 1; s <= 40; s++) {
      job(s); const D = dropPts();
      expect(D.length).toBe(TUNE.DROP_ZONES);
      expect(D[0].edge).toBe('W');
      for (const d of D.slice(1)) {
        expect(canReach(d.x, d.y)).toBe(true);
        expect(d.edge === 'N' ? d.y : H - 1 - d.y).toBe(0);
        for (let x = d.x - 3; x <= d.x + 3; x++) expect(canReach(x, d.y)).toBe(true); // the apron is open street
      }
    }
  });
  it('the field and the objective start far from every drop zone', () => {
    for (let s = 1; s <= 30; s++) {
      job(s); const D = dropPts();
      for (const u of G.units) for (const d of D) expect(Math.hypot(tile(u).x - d.x, tile(u).y - d.y)).toBeGreaterThanOrEqual(TUNE.UPLINK_MIN_DIST);
    }
  });
  it('with the scan off there is one spawn and no apron (the R18 map)', () => {
    TUNE.SCAN_ENABLED = false;
    try { job(7); expect(dropPts().length).toBe(1); expect(G.scan).toBe(null); } finally { TUNE.SCAN_ENABLED = true; }
  });
  it('below MEDIUM only the west edge is offered; at MEDIUM+ choosing a drop zone moves the spawn', () => {
    job(11); listen(1); chooseDrop(1); expect(G.scan.drop).toBe(0); expect(offeredDrops().length).toBe(1);
    job(12); listen(2); expect(offeredDrops().length).toBe(TUNE.DROP_ZONES);
    const d = offeredDrops()[1]; chooseDrop(1);
    newHunt([{ ...LOAD_A }, { ...LOAD }]);
    expect(spawnX).toBe(d.x); expect(spawnY).toBe(d.y);
    expect(tile(G.lance[0])).toEqual({ x: d.x, y: d.y });
  });
});

describe('the reveal ladder', () => {
  it('each listen step reveals its layer and no more', () => {
    for (const lvl of [0, 1, 2, 3]) {
      job(21); listen(lvl);
      const S = G.scan;
      expect(S.roster.length > 0).toBe(lvl >= 1);         // SHORT: the roster
      expect(zoneKnow()).toBe(Math.min(2, lvl));          // SHORT outlines, MEDIUM types
      expect(offeredDrops().length > 1).toBe(lvl >= 2);   // MEDIUM: drop zones
      expect(S.blips.length > 0).toBe(lvl >= 3);          // LONG: blips
    }
  });
  it('listening twice does nothing; the same job rolled again keeps it; a new job starts unlistened', () => {
    job(22); expect(listen(1)).toBe(true); expect(listen(3)).toBe(false); expect(G.scan.lvl).toBe(1);
    job(22, 'UPLINK', undefined, true); expect(G.scan.lvl).toBe(1);
    job(23, 'UPLINK', undefined, true); expect(G.scan.lvl).toBe(-1);
  });
  it('the roster counts every unit by type and variant', () => {
    job(24); listen(1);
    expect(G.scan.roster.reduce((a: number, r: any) => a + r.n, 0)).toBe(G.units.length);
    for (const r of roster()) expect(TUNE.FIELD_VARIANTS[r.variant].TYPE).toBe(r.type);
  });
  it('LONG: one blip per emitting unit, none for silent ones; each within its fuzz, matched like a hunt reading', () => {
    let blips = 0, silent = 0;
    for (let s = 31; s <= 50; s++) {
      job(s); listen(3);
      const ids = G.scan.blips.map((b: any) => b.id);
      for (const u of G.units) { expect(ids.includes(u.id)).toBe(emitter(u)); if (!emitter(u)) silent++; }
      for (const b of G.scan.blips) {
        const u = G.units.find((x: any) => x.id === b.id);
        expect(Math.hypot(b.x - u.x, b.y - u.y)).toBeLessThanOrEqual(0.7 * TUNE.SCAN_BLIP_UNC * T + 1e-6);
        expect(b.fits).toEqual(matchVariants(b.obs));
        expect(b.fits).toContain(u.variant);              // the truth always fits; the best guess may not be it
        expect(b.fits).toContain(b.guess);
        expect(b.conf).toBeCloseTo(1 / b.fits.length);
        blips++;
      }
    }
    expect(blips).toBeGreaterThan(20); expect(silent).toBeGreaterThan(0);
  });
  it('a radar emplacement is pinned by its pulse rhythm; a patrol could be any of the three', () => {
    let empl = 0, patrol = 0;
    for (let s = 51; s <= 80; s++) {
      job(s, 'UPLINK', 'Fortified'); listen(3);
      for (const b of G.scan.blips) {
        const u = G.units.find((x: any) => x.id === b.id);
        if (u.type === 'EMPLACEMENT') { expect(b.fits).toEqual([u.variant]); empl++; }
        if (u.type === 'PATROL') { expect(b.fits.length).toBe(3); patrol++; }
      }
    }
    expect(empl).toBeGreaterThan(5); expect(patrol).toBeGreaterThan(5);
  });
  it('the listen never moves the hunt: same seed, same field at every level (before any costs)', () => {
    const at = (lvl: number) => { job(61); listen(lvl); newHunt([{ ...LOAD_A }, { ...LOAD }]); return G.units.map((u: any) => u.variant + '@' + u.x + ',' + u.y).join(' '); };
    const a = at(0); expect(at(1)).toBe(a); expect(at(3)).toBe(a);
  });
});

describe('the drop', () => {
  it('LONG blips become stale contacts with the ship’s notes; the patrols have drifted from their blips', () => {
    job(71, 'UPLINK', 'Sweep'); listen(3);
    const B = structuredClone(G.scan.blips), before = new Map<string, any>(G.units.map((u: any) => [u.id, { x: u.x, y: u.y }]));
    newHunt([{ ...LOAD_A }, { ...LOAD }]);
    for (const b of B) {
      const c = G.pc.find((k: any) => k.on && k.id === b.id);
      if (!c) continue; // G.pc has 8 slots
      expect(c.lost).toBeGreaterThan(c.gap); // stale
      expect(c.src).toBe('SCAN');
      expect(G.obs[b.id].emit).toEqual(b.obs.emit);
    }
    let moved = 0;
    for (const u of G.units) if (u.mobile) { const p = before.get(u.id); if (Math.hypot(u.x - p.x, u.y - p.y) > 0) moved++; expect(Math.hypot(u.x - p.x, u.y - p.y) / T).toBeLessThanOrEqual(TUNE.SCAN_DRIFT + 1e-6); }
    expect(moved).toBeGreaterThan(0);
  });
  it('a skipped scan carries nothing in', () => {
    job(72); listen(0); newHunt([{ ...LOAD_A }, { ...LOAD }]);
    expect(G.pc.some((c: any) => c.on && c.src === 'SCAN')).toBe(false);
    expect(Object.keys(G.obs).length).toBe(0);
  });
  it('a blip lingers SCAN_BLIP_KEEP longer than a plain lost contact', async () => {
    const { ageContacts } = await import('../src/sim/sensors.ts');
    job(73); listen(3); newHunt([{ ...LOAD_A }, { ...LOAD }]);
    const c = G.pc.find((k: any) => k.on && k.src === 'SCAN'); expect(c).toBeTruthy();
    ageContacts(G.pc, TUNE.CONTACT_LINGER + 1); expect(c.on).toBe(true);
    ageContacts(G.pc, TUNE.SCAN_BLIP_KEEP); expect(c.on).toBe(false);
  });
});

describe('build after hunt 1’s scan', () => {
  it('the fits can change until hunt 1 is played, then they lock', () => {
    const m = TUNE.MAP_MODE; TUNE.MAP_MODE = 'blocks';
    try {
      newContract(9, [LOAD_A, LOAD]);
      expect(fitsOpen()).toBe(true);
      previewJob(0); listen(2); chooseDrop(2);
      expect(relockLoads(['scout', 'brawler'].map(id => require_fit(id)))).toBe(true);
      takeJob(0);
      expect(G.lance[0].fit.frame).toBe('wisp');
      G.outcome = 'WIN UPLINK';
      const { recordHunt } = require_contract(); recordHunt();
      expect(fitsOpen()).toBe(false);
      expect(relockLoads([LOAD, LOAD])).toBe(false);
    } finally { TUNE.MAP_MODE = m; }
  });
});
import { HANGAR_TEMPLATES } from '../src/sim/kit.ts';
import * as CT from '../src/sim/contract.ts';
function require_fit(id: string) { return HANGAR_TEMPLATES.find(t => t.id === id).fit(); }
function require_contract() { return CT; }
