// Round 19: listen before you land. Between the job pick and the drop, the ship listens to the district. One dial,
// G.scan.lvl: 0 SKIP / 1 SHORT / 2 MEDIUM / 3 LONG. Each step reveals everything below it plus:
//   SHORT  the field roster (types, variants, counts) and the zones' outlines (type unknown)
//   MEDIUM the zone types, and a choice of drop zones (G.drops: the west edge spawn, then aprons on the north / south edge)
//   LONG   contact blips: every unit that EMITS (comms or radar) as a fuzzy circle with what the ship heard (its G.obs notes,
//          matched against the CARD); a silent unit gives the ship nothing (the roster still counts it)
// The field is placed before the scan (rollEnemy), far from every drop zone. At the drop (newHunt → applyScan) the patrols
// drift, the blips become stale contacts and the notes carry into the hunt.
import { TUNE } from '../tune.ts';
import { W, H, T, MAP, spawnX, spawnY, mapGen, loadMap, canReach } from './world.ts';
import { G, freeTile } from './state.ts';
import { matchVariants } from './ids.ts';
import { rand } from './rng.ts';
import { has } from './kit.ts';

export const LISTEN = ['SKIP', 'SHORT', 'MEDIUM', 'LONG'];

// The scan's own RNG (mulberry32 on a seed of its own), so listening never moves the hunt's seeded rolls.
function rng(seed: number) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// ============================ DROP ZONES ==============================
// Every drop zone's spawn tile (the west edge first). Only for the map they were made on: anything that loads another map
// (the test bed) falls back to the plain spawn.
export function dropPts(): { x: number; y: number; name?: string; edge?: string }[] {
  return G.drops && G.drops.length && G.dropsGen === mapGen ? G.drops : [{ x: spawnX, y: spawnY }];
}
// Called by rollEnemy right after the district. With the scan on (block maps), clears a staging apron on the north and south
// edges (SPAWN_APRON turned to lie along the edge), each where the street is most open near DROP_X, joined to the streets.
export function addDropZones() {
  G.drops = [{ x: spawnX, y: spawnY, name: 'west edge', edge: 'W' }]; G.dropsGen = mapGen;
  if (!TUNE.SCAN_ENABLED || MAP.id === 'hive' || TUNE.DROP_ZONES < 2) return;
  const rows: string[][] = MAP.rows.map((r: string) => r.padEnd(W, '.').slice(0, W).split(''));
  const AL = TUNE.SPAWN_APRON.H, AD = TUNE.SPAWN_APRON.W; // along the edge, deep into the map
  const open = (x: number, y: number) => x >= 0 && y >= 0 && x < W && y < H && rows[y][x] !== '#' && rows[y][x] !== '%';
  for (const edge of ['N', 'S'].slice(0, Math.min(2, TUNE.DROP_ZONES - 1))) {
    const y0 = edge === 'N' ? 0 : H - AD;
    let best = -1, bs = -1e9;
    for (let x0 = AD + 2; x0 + AL <= W - TUNE.EXTRACT_COLS - 4; x0++) {
      const inA = (x: number, y: number) => x >= x0 && x < x0 + AL && y >= y0 && y < y0 + AD;
      let joins = false; // it must touch a street the lance can already reach
      for (let y = y0; y < y0 + AD && !joins; y++) for (let x = x0; x < x0 + AL && !joins; x++)
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (!inA(x + dx, y + dy) && canReach(x + dx, y + dy)) { joins = true; break; }
      if (!joins) continue;
      // how much street opens up within SPAWN_LOOK steps of the apron (the apron counts as open)
      const dist = new Int16Array(W * H).fill(-1), q: number[] = [];
      for (let y = y0; y < y0 + AD; y++) for (let x = x0; x < x0 + AL; x++) { dist[y * W + x] = 0; q.push(y * W + x); }
      for (let h = 0; h < q.length; h++) {
        const i = q[h], x = i % W, y = (i / W) | 0; if (dist[i] >= TUNE.SPAWN_LOOK) continue;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if ((open(nx, ny) || inA(nx, ny)) && nx >= 0 && ny >= 0 && nx < W && ny < H && dist[ny * W + nx] < 0) { dist[ny * W + nx] = dist[i] + 1; q.push(ny * W + nx); } }
      }
      const score = q.length - Math.abs(x0 + AL / 2 - W * TUNE.DROP_X[edge]) * 0.5;
      if (score > bs) { bs = score; best = x0; }
    }
    if (best < 0) continue;
    for (let y = y0; y < y0 + AD; y++) for (let x = best; x < best + AL; x++) rows[y][x] = '.';
    G.drops.push({ x: best + (AL >> 1), y: edge === 'N' ? 0 : H - 1, name: edge === 'N' ? 'north edge' : 'south edge', edge });
  }
  loadMap({ ...MAP, rows: rows.map(r => r.join('')), spawn: { x: spawnX, y: spawnY } }); // same streets, aprons cleared; the spawn stays west
  G.dropsGen = mapGen;
}
// The drop zones the player may pick: MEDIUM+ offers DROP_ZONES of them, below that only the default (west edge).
export function offeredDrops() { const D = dropPts(); return G.scan && G.scan.lvl >= 2 ? D.slice(0, Math.max(1, TUNE.DROP_ZONES)) : D.slice(0, 1); }
export function chooseDrop(i: number) { if (G.scan && i >= 0 && i < offeredDrops().length) G.scan.drop = i; }

// ============================ THE LISTEN ==============================
// A fresh scan for this job (rollEnemy). The same job rolled again (previewed, then taken) keeps what was chosen.
export function freshScan(seed: number, mtype: string) {
  if (G.scan && G.scan.seed === seed && G.scan.mtype === mtype) return;
  G.scan = { seed, mtype, lvl: -1, drop: 0, roster: [], blips: [] };
}
export function emitter(u) { return (u.comms || 0) > 0 || has(u, 'RADAR'); }
// The ship listens at level lvl (once per job). Returns false if it already listened.
export function listen(lvl: number) {
  const S = G.scan; if (!S || S.lvl >= 0) return false;
  S.lvl = Math.max(0, Math.min(3, lvl | 0)); S.drop = 0;
  S.roster = S.lvl >= 1 ? roster() : [];
  const r = rng(S.seed ^ 0x5CA9);
  S.blips = S.lvl >= 3 ? G.units.filter(emitter).map(u => blip(u, r)) : [];
  return true;
}
// What the roster says: per type and variant, how many (in FIELD_TYPES order)
export function roster() {
  const out: { type: string; variant: string; n: number }[] = [];
  for (const type of Object.keys(TUNE.FIELD_TYPES)) for (const u of G.units) {
    if (u.type !== type) continue;
    const e = out.find(x => x.type === type && x.variant === u.variant);
    if (e) e.n++; else out.push({ type, variant: u.variant, n: 1 });
  }
  return out;
}
// One LONG blip: what the ship heard of unit u, in the hunt's own trait words (see ids.ts). Comms = EMIT low; a radar = EMIT high
// and its pulse rhythm (a long listen hears several); a patrol's bearing swings (moved); a static is watched SCAN_STILL_ACTS rounds.
function blip(u, r: () => number) {
  const o: any = { emit: [] as string[], pulses: [] as number[], moved: false, acts: 0, step: 0, shot: 0, fired: false, first: 1 };
  if ((u.comms || 0) > 0) o.emit.push('low'); // its radio (QUIET ground only turns it down, never off)
  if (has(u, 'RADAR')) { o.emit.push('high'); o.pulses = [-2 * u.pulseN, -u.pulseN]; } // heard before the drop (turns before round 1)
  if (u.mobile) o.moved = true; else o.acts = TUNE.SCAN_STILL_ACTS;
  const fits = matchVariants(o), guess = fits.length ? fits[Math.floor(r() * fits.length)] : '';
  const a = r() * 6.2832, d = 0.7 * Math.sqrt(r()) * TUNE.SCAN_BLIP_UNC * T;
  return { id: u.id, x: u.x + Math.cos(a) * d, y: u.y + Math.sin(a) * d, unc: TUNE.SCAN_BLIP_UNC * T, obs: o, fits, guess, conf: fits.length ? 1 / fits.length : 0, mobile: !!u.mobile };
}

// ============================ THE DROP ================================
// newHunt, after the field is placed and the hunt's state reset: patrols drift, the blips become stale contacts, the notes carry.
export function applyScan() {
  const S = G.scan;
  for (const u of G.units) if (u.mobile && !u.dead) drift(u); // every listen level: the same field lands, whatever you heard
  for (const b of S.blips || []) {
    const u = G.units.find(x => x.id === b.id); if (!u || u.dead) continue;
    G.obs[b.id] = structuredClone(b.obs);
    const c = G.pc.find(k => !k.on); if (!c) continue;
    Object.assign(c, { on: true, id: b.id, type: '', tx: b.x, ty: b.y, vx: 0, vy: 0, unc: b.unc, minU: b.unc, gap: TUNE.TRACK_GAP, lost: TUNE.TRACK_GAP + 0.01,
      fresh: false, seen: { SCAN: G.time }, by: {}, src: 'SCAN', snd: false, shr: false, dmg: '', walls: 0, q: 0, noisy: false, keep: TUNE.SCAN_BLIP_KEEP });
  }
}
// A patrol walks somewhere within SCAN_DRIFT tiles while the ship listens (never into the lance's drop zone)
function drift(u) {
  const x0 = Math.floor(u.x / T), y0 = Math.floor(u.y / T), R = TUNE.SCAN_DRIFT;
  for (let k = 0; k < 40; k++) {
    const x = Math.round(x0 + (rand() * 2 - 1) * R), y = Math.round(y0 + (rand() * 2 - 1) * R);
    if (Math.hypot(x - x0, y - y0) > R || !freeTile(x, y) || Math.hypot(x - spawnX, y - spawnY) < TUNE.UPLINK_MIN_DIST) continue;
    u.x = u.gx = (x + 0.5) * T; u.y = u.gy = (y + 0.5) * T; return;
  }
}
// What listening at lvl risks, in plain words for the dial ('' = nothing). Checkpoint 2 fills in the costs.
export function scanRisk(lvl: number) { void lvl; return ''; }
// What the lance knows of the zones: 0 nothing, 1 outlines, 2 outlines and types. With the scan off, everything (the R18 map).
export function zoneKnow() { if (!G.scan || (G.tb && !G.tb.job)) return 2; return Math.min(2, Math.max(0, G.scan.lvl)); } // no scan (scan off, or a hand-placed test bed) = the R18 map
