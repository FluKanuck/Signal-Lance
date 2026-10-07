import { TUNE } from '../tune.ts';
import { W, H, T, spawnX, spawnY, canReach, isSolid, DX, DY, tilesCrossed, anchors, loadMap, HIVE, setSpawn } from './world.ts';
import { addDropZones, dropPts, freshScan, applyScan } from './scan.ts';
import { rollDistrict } from './blocks.ts';
import { rand, setSeed } from './rng.ts';
import { startRound } from './turns.ts';
import { rollZones, zoneAtTile, areaScale } from './zones.ts';
import { recordHunt } from './contract.ts';
import { initParts } from './combat.ts';
import { newMission } from './mission.ts';
import { makeAlly, nearLegTiles } from './escort.ts';
import { FRAMES, byId } from './items.ts';
import { DEFAULT_FIT, toFit, fitStats, fieldFit, fitHits, fitPool, fitRounds, fitShells, has, kitOf, plateCount, soundsOf } from './kit.ts';

// Hooks the view sets so the sim can tell it things. Headless (runner) they stay no-ops.
export const hooks = {
  sync: () => {},                 // player-visible state changed (buttons need a refresh)
  end: () => {},                  // the hunt just ended (G.outcome is set)
  playerHit: () => {},            // one of the player's mechs took a hit
  activate: () => {},             // R7 s2: a player mech's activation just started (G.p = that mech)
};
// Bearing pool. R7: each bearing is tagged with the emitter it points at (id), so bearings on
// different units never cross into a false fix.
export function makeBearingPool(n) { const a: any = []; for (let i = 0; i < n; i++) a.push({ on: false, x: 0, y: 0, ang: 0, age: 0, tri: true, id: '' }); a.bi = 0; return a; }
export function makeContacts(n) { const a = []; for (let i = 0; i < n; i++) a.push({ on: false, id: '', type: '', tx: 0, ty: 0, vx: 0, vy: 0, unc: 0, minU: 0, lost: 0, gap: 0 }); return a; }
// ============================ STATE ===================================
export const G: any = {
  mode: 'hunt', paused: false, time: 0,
  p: null,          // R7 s2: the active (or last active) lance mech; player commands act on it
  lance: [],        // R7 s2: the player's two mechs, A and B
  order: [], oi: 0, // R7 s2: this round's initiative order (mechs + field units) and whose activation it is
  units: [],         // R7: the field (turret, emplacement, patrols), built by newHunt from G.comp
  comp: null,        // R8: this run's rolled composition (an entry of TUNE.FIELD_COMPOSITIONS)
  ei: 0,             // R7: index of the field unit acting in the enemy phase
  kills: 0,          // R7: field units destroyed this hunt
  outcome: '',
  shells: [], fx: [],
  pb: makeBearingPool(32), bearT: 0, // player's bearing lines (tagged per unit)
  ghost: { on: false, x: 0, y: 0, turns: 0, owner: null }, // one ghost at a time; ticks down on its owner's activations
  pc: makeContacts(8), // player's contact list (fixed pool; one per field unit)
  sel: null,         // selected contact
  phase: 'PLAYER', turn: 1, act: null, ewait: 0, // Round 4: whose turn, the running action, enemy pacing
  pmode: 'NORMAL', planT: null, planD: null, plan: null, intr: null, // Round 4: move mode, tapped destination, its costed preview. R17: planD = this turn's drawn path { tiles, wps }; intr = the interrupt cue
  up: { x: 0, y: 0, name: '', prog: 0, used: false }, winBy: '',   // Round 5: this run's uplink point (world coords), progress, used this turn; WIN reason
  zones: [],        // R10: this run's rolled signal terrain (see zones.ts)
  ct: null,         // R11: the running contract (see contract.ts)
  emitStat: { P: { n: 0, sum: 0 }, E: { n: 0, sum: 0 } }, // R13: Emissions sampled at each activation start, per side (runner)
  alarmLog: [], // R13 s2: every alarm { from, to: [ids], mech, turn, t } (log line, DBG lines, runner)
  firstLog: [], // R13: every new contact { side 'P'|'E', src (the sense), turn } (runner)
  shotLog: [], partLog: [], lastShot: { P: null, E: null }, // R12: every gun shot (runner/log), parts destroyed, last shot per side (DBG)
  seed: 1, // R6: this run's RNG seed (shown in DBG for replay in the runner)
  obs: {}, ids: {}, idStat: {}, eyesAny: false, // R14: per field unit id: what the lance observed, its committed ID, runner stats
  tb: null, // R14: the test-bed scenario being played (null = a normal hunt)
  mtype: 'UPLINK', mission: null, pop: null, ally: null, // R15 s3: ally = the Escort transport (null otherwise)
  moveStat: { n: 0, c: 0, tap: 0, drawn: 0, wp: 0, intr: [] }, // R16: lance moves this hunt, and how many entered clutter (runner). R17: tap / drawn moves, waypoints, interrupts
  // R15: the rolled mission type, this hunt's mission (see mission.ts), the last bounty pop (view)
};
for (let i = 0; i < 8; i++) G.fx.push({ on: false, x: 0, y: 0, t: 0, hit: false });
for (let i = 0; i < 32; i++) G.shells.push({ on: false, x: 0, y: 0, ax: 0, ay: 0, vx: 0, vy: 0, left: 0, owner: null });

// A field unit of the given type (stats from TUNE.FIELD_TYPES), not yet placed.
// R14: variant = a FIELD_VARIANTS key of this type (default: the type's FIELD_VARIANT_DEFAULT).
export function makeUnit(type: string, i: number, variant?: string) {
  const vk = variant || TUNE.FIELD_VARIANT_DEFAULT[type], V = TUNE.FIELD_VARIANTS[vk];
  if (!V || V.TYPE !== type) throw new Error('variant ' + vk + ' is not a ' + type);
  const F = { ...TUNE.FIELD_TYPES[type], ...V.STATS, RADAR: V.PULSE > 0 ? 1 : 0 };
  const fit = fieldFit(F); // R18: its kit as a fit, like a suit's
  const u: any = {
    id: 'U' + i, type, ft: F, x: 0, y: 0, fx: 1, fy: 0, path: null, pi: 0, moving: false, spd: 0, creep: false,
    fit, items: kitOf(fit), armour: plateCount(fit), hits: 0, maxHits: 0, ammo: fitRounds(fit), en: 0, enMax: 0, ap: 0, turnShots: 0, freeTurns: 0, emit: 0,
    radarOn: false, mask: false, jamming: false, fireT: 0, dead: false, shots: 0, landed: 0,
    sound: 0, heardBy: [], sndOff: { x: 0, y: 0 }, // R13: this activation's sound radius (see sound.ts)
    mobile: F.MOBILE, // R18: radar / passive / ECM are has(u, 'RADAR' | 'PASSIVE' | 'MASK') now
    state: F.MOBILE ? 'PATROL' : 'WATCH', pulseCD: 0, tgtX: 0, tgtY: 0, ptx: -1, pty: -1, gx: 0, gy: 0,
    moved: false, pulsed: false, holding: false, holdTurns: 0, patienceTurns: 0, goalX: -1, goalY: -1, goalK: '',
    ec: makeContacts(4), eb: makeBearingPool(16), ejit: { x: 0, y: 0, t: 0 }, pjit: { x: 0, y: 0, t: 0 }, bearT: 0, heardRadar: false,
    found: false, acted: false, // runner stats: the player ever had a contact on it / it ever fired, moved or pulsed
  };
  initParts(u, type, F.BASE_HITS + fitHits(fit)); // R12: hit pool split across parts. R18: frame + plates from the fit
  u.enMax = u.en = fitPool(fit); // R18: base + batteries
  u.irBase = byId(FRAMES, F.FRAME).vis.VIS * TUNE.IR_SIZE_PER_VIS + (F.IR || 0); u.heat = 0; // R18 cp3: its size + generator / engine heat
  // R18: the field keeps the R17 standing signature (SIG_STILL + plates × SIG_ARMOUR) and flat ENERGY_REGEN until its fits are designed
  u.variant = vk; u.comms = V.COMMS; u.pulseN = V.PULSE || TUNE.EMPL_PULSE_TURNS; // R14: its variant's EMIT floor and pulse rhythm
  u.snd = soundsOf(u, V.SOUND);    // R14: its own move / shot sound radii. R18: the shot's from its gun row
  u.emit = u.comms; // R13 test 2: comms (passive can hear it from the start)
  return u;
}
export function unitById(id) { for (const m of G.lance) if (m.id === id) return m; for (const u of G.units) if (u.id === id) return u; if (G.ally && G.ally.id === id) return G.ally; return null; }
// R15 s3: the lance's side as the field sees it: both mechs plus the Escort transport (isMech stays "a mech you control")
export function friends() { return (G.ally ? [...G.lance, G.ally] : G.lance).filter(m => !m.out); } // R16: extracted units are off the map
export function isFriend(m) { return G.lance.includes(m) || (!!G.ally && m === G.ally); }
export function livingMechs() { return G.lance.filter(m => !m.dead); }
// R16: mechs still in the district (alive and not extracted): they take turns
export function activeMechs() { return G.lance.filter(m => !m.dead && !m.out); }
export function isMech(m) { return G.lance.includes(m); }
export function setActive(m) { G.p = m; }
// R18: fit = the mech's fit (kit.ts). Hits, rounds, shells and Energy come from its rows.
function makeMech(id: string, fit) {
  const m: any = { id, fit: structuredClone(fit), x: 0, y: 0, fx: 1, fy: 0, path: null, pi: 0, moving: false, spd: 0, creep: false,
    radarOn: false, mask: false, jamming: false, fireT: 0, dead: false, shots: 0, landed: 0, ap: 0, turnShots: 0, freeTurns: 0, emit: 0, bearT: 0,
    sound: 0, heardBy: [], sndOff: { x: 0, y: 0 } }; // R13: this activation's sound radius (see sound.ts)
  m.items = kitOf(m.fit); m.armour = plateCount(m.fit); initParts(m, 'MECH', fitHits(m.fit)); // R12: parts. R18: frame hits + plates
  m.ammo = fitRounds(m.fit); m.snd = soundsOf(m);
  const S = fitStats(m.fit); m.regen = S.regen; m.over = S.over; m.emBase = S.emBase; m.irBase = S.irBase; m.heat = 0; // R18: power, weight, signature (EM, IR) from the fit
  // R9 mortar: shells left, shots this activation, and stats (shots, hits on the field, kills, friendly hits)
  m.shells = fitShells(m.fit); m.mUsed = 0; m.mShots = 0; m.mHits = 0; m.mKills = 0; m.mFriendly = 0; m.mBlind = 0;
  m.enMax = m.en = S.pool;
  return m;
}
export function livingUnits() { return G.units.filter(u => !u.dead); }
// R16: how many of a type the composition fields on this map: × map area / FIELD_BASE_AREA (FIELD_SCALE_BY_AREA), rounded,
// never below the composition's own count. INTEL shows the same numbers.
export function fieldCount(C, type: string) {
  const n = C[type] || 0;
  return TUNE.FIELD_SCALE_BY_AREA ? Math.max(n, Math.round(n * areaScale())) : n;
}

// R7 spawns. Turret and emplacement: reachable tiles within GUARD_RADIUS of the uplink, preferring a
// tile next to a building with clear LOS to the point. Patrols: anywhere reachable. Nothing within
// UPLINK_MIN_DIST of the player, never in extraction, never two on one tile.
function tileFree(x, y, taken) { return !taken.some(t => t.x === x && t.y === y); }
function farFromPlayer(x, y) { return dropPts().every(d => Math.hypot(x - d.x, y - d.y) >= TUNE.UPLINK_MIN_DIST); } // R19: from every drop zone (the scan shows the field before you pick one)
// B spawns on the nearest reachable tile next to A (8 neighbours, then a ring further out).
function nextTo(x, y) {
  for (let r = 1; r <= 3; r++) for (let oy = -r; oy <= r; oy++) for (let ox = -r; ox <= r; ox++)
    if ((ox || oy) && canReach(x + ox, y + oy) && x + ox < W - TUNE.EXTRACT_COLS) return { x: x + ox, y: y + oy };
  return { x, y };
}
function guardTile(taken) {
  const U = G.up, ux = Math.floor(U.x / T), uy = Math.floor(U.y / T), R = TUNE.GUARD_RADIUS, good = [], ok = [];
  for (let y = uy - R; y <= uy + R; y++) for (let x = ux - R; x <= ux + R; x++) {
    const d = Math.hypot(x - ux, y - uy);
    if (d > R || d < 2 || !canReach(x, y) || x >= W - TUNE.EXTRACT_COLS || !farFromPlayer(x, y) || !tileFree(x, y, taken)) continue;
    ok.push({ x, y });
    let n = 0; for (let k = 0; k < 8; k++) if (isSolid(x + DX[k], y + DY[k])) n++;
    if (n >= 2 && tilesCrossed((x + 0.5) * T, (y + 0.5) * T, U.x, U.y, 1) === 0) good.push({ x, y });
  }
  // R10: with ZONE_STATIC_PREF, take a zone tile among the legal ones (still preferring cover + LOS)
  const useZone = rand() < TUNE.ZONE_STATIC_PREF, inZ = t => !!zoneAtTile(t.x, t.y);
  const zg = good.filter(inZ), zo = ok.filter(inZ);
  const list = useZone && zg.length ? zg : useZone && zo.length ? zo : good.length ? good : ok.length ? ok : [{ x: ux, y: uy }];
  return list[Math.floor(rand() * list.length)];
}
// R15 s3: a legal tile near the route legs (seeded); statics then face the nearest leg point they can (they face the site)
function legTile(list, taken) {
  const ok = list.filter(t => farFromPlayer(t.x, t.y) && tileFree(t.x, t.y, taken));
  return ok.length ? ok[Math.floor(rand() * ok.length)] : anyTile(taken);
}
function anyTile(taken, zonePref?: string) {
  let x = 0, y = 0;
  // R10: static 'anywhere' placement takes a zone tile with ZONE_STATIC_PREF (Ambush turrets: QUIET first)
  if (zonePref !== undefined) {
    const useZone = rand() < TUNE.ZONE_STATIC_PREF;
    const legal = t => canReach(t.x, t.y) && t.x < W - TUNE.EXTRACT_COLS && farFromPlayer(t.x, t.y) && tileFree(t.x, t.y, taken);
    const all = G.zones.flatMap(z => z.tiles.filter(legal).map(t => ({ ...t, type: z.type })));
    const pref = zonePref ? all.filter(t => t.type === zonePref) : [];
    const list = pref.length ? pref : all;
    if (useZone && list.length) { const t = list[Math.floor(rand() * list.length)]; return { x: t.x, y: t.y }; }
  }
  for (let i = 0; i < 5000; i++) {
    x = Math.floor(rand() * W); y = Math.floor(rand() * H);
    if (canReach(x, y) && x < W - TUNE.EXTRACT_COLS && farFromPlayer(x, y) && tileFree(x, y, taken)) break;
  }
  return { x, y };
}

// R14: a variant for one field slot. Always draws one number, so VARIANTS_ENABLED doesn't move the placements.
export function rollVariant(type: string) {
  const keys = Object.keys(TUNE.FIELD_VARIANTS).filter(k => TUNE.FIELD_VARIANTS[k].TYPE === type), r = rand();
  return TUNE.VARIANTS_ENABLED ? keys[Math.floor(r * keys.length)] : TUNE.FIELD_VARIANT_DEFAULT[type];
}
// R7: build and place the field (seeded: same seed, same positions). R19: its own step, so rollEnemy can run it before the
// scan (the field must exist for the ship to hear it); newHunt runs it only when nothing placed it yet.
export function placeField() {
  const U = G.up;
  G.units = []; G.kills = 0; G.ei = 0;
  const taken = [];
  const legT = G.mtype === 'ESCORT' ? nearLegTiles() : null; // R15 s3: an Escort field waits near the route legs
  let i = 0;
  const C = G.comp || TUNE.FIELD_COMPOSITIONS[0];
  for (const type of Object.keys(TUNE.FIELD_TYPES)) for (let n = 0; n < fieldCount(C, type); n++) { // R16: scaled by map area
    const u = makeUnit(type, i++, rollVariant(type)); // R14: each slot rolls a variant (seeded, evenly)
    const ambush = C.NAME === 'Ambush' && type === 'TURRET'; // R10: Ambush turrets prefer QUIET ground and watch your spawn
    const t = legT ? legTile(legT, taken) : u.mobile ? anyTile(taken) : C.staticPlacement === 'anywhere' ? anyTile(taken, ambush ? 'QUIET' : '') : guardTile(taken); // R8: placement flag
    taken.push(t);
    u.x = u.gx = (t.x + 0.5) * T; u.y = u.gy = (t.y + 0.5) * T;
    u.zoned = zoneAtTile(t.x, t.y)?.type || ''; // R10: the zone it started in (reporting / runner)
    if (!u.mobile) { // static: watches the uplink (R10 Ambush turrets: the player's spawn)
      const fx = ambush ? (spawnX + 0.5) * T : U.x, fy = ambush ? (spawnY + 0.5) * T : U.y;
      const dx = fx - u.x, dy = fy - u.y, d = Math.hypot(dx, dy) || 1; u.fx = dx / d; u.fy = dy / d;
    }
    if (has(u, 'RADAR')) u.pulseCD = u.pulseN;
    G.units.push(u);
  }
  // R15 Bounty: the field outnumbers the quota. Extra units, variant rolled from all 9 (seeded, evenly), placed 'anywhere'.
  if (G.mtype === 'BOUNTY') for (let n = 0; n < TUNE.BOUNTY_FIELD_EXTRA; n++) {
    const keys = Object.keys(TUNE.FIELD_VARIANTS), vk = keys[Math.floor(rand() * keys.length)], type = TUNE.FIELD_VARIANTS[vk].TYPE;
    const u = makeUnit(type, i++, vk), t = anyTile(taken, u.mobile ? undefined : '');
    taken.push(t);
    u.x = u.gx = (t.x + 0.5) * T; u.y = u.gy = (t.y + 0.5) * T;
    u.zoned = zoneAtTile(t.x, t.y)?.type || ''; u.extra = true;
    if (!u.mobile) { const dx = U.x - u.x, dy = U.y - u.y, d = Math.hypot(dx, dy) || 1; u.fx = dx / d; u.fy = dy / d; }
    if (has(u, 'RADAR')) u.pulseCD = u.pulseN;
    G.units.push(u);
  }
}
// R19: a free tile for an added unit (extra units, the ambush): reachable, out of extraction, off every other unit
export function freeTile(x: number, y: number) { return canReach(x, y) && x < W - TUNE.EXTRACT_COLS && !G.units.some(u => Math.floor(u.x / T) === x && Math.floor(u.y / T) === y); }
export { anyTile };
// R7 s2: loads = [A's loadout, B's loadout] (one loadout = both mechs the same). R18: each is a fit (kit.ts).
// R11: prep (optional) runs after the lance and field are built, before round 1 (the contract's carry-over).
export function newHunt(loads?, prep?: () => void) {
  if (loads && !Array.isArray(loads)) loads = [loads, loads];
  if (!loads) loads = G.lance.length ? G.lance.map(m => m.fit) : [DEFAULT_FIT, DEFAULT_FIT];
  loads = loads.map(toFit); // R18: old load numbers still work (runner, tests)
  const D = G.scan && G.drops && G.drops[G.scan.drop]; // R19: land on the drop zone the scan picked (MEDIUM+)
  if (D && (D.x !== spawnX || D.y !== spawnY)) setSpawn(D.x, D.y);
  const A = makeMech('A', loads[0]), B = makeMech('B', loads[1]), b = nextTo(spawnX, spawnY);
  A.x = (spawnX + 0.5) * T; A.y = (spawnY + 0.5) * T;
  B.x = (b.x + 0.5) * T; B.y = (b.y + 0.5) * T;
  G.lance = [A, B]; setActive(A);
  G.ghost.on = false; G.ghost.owner = null;
  for (const bb of G.pb) bb.on = false;
  // R7: build and place the field (seeded: same seed, same positions)
  const U = G.up; U.prog = 0; U.used = false; G.winBy = '';
  G.ally = null;
  if (!G.fieldReady) placeField(); // R19: with the scan on, rollEnemy placed it already (the scan shows it before you land)
  G.fieldReady = false; G.kills = 0; G.ei = 0; G.scanCost = null; // R19: set by applyScan
  newMission(G.mtype); G.pop = null; // R15
  if (G.mtype === 'ESCORT') G.ally = makeAlly(); // R15 s3: the transport starts on the route's first node
  for (const c of G.pc) c.on = false;
  for (const s of G.shells) s.on = false;
  for (const f of G.fx) f.on = false;
  G.sel = null; G.splash = null; // R9: last mortar splash (view shows it briefly)
  G.act = null; G.turn = 1; G.planT = null; G.planD = null; G.plan = null; G.intr = null;
  G.time = 0;
  G.obs = {}; G.ids = {}; G.idStat = {}; G.eyesAny = false; // R14: observed traits, committed IDs, runner stats (see ids.ts)
  G.moveStat = { n: 0, c: 0, tap: 0, drawn: 0, wp: 0, intr: [] }; // R16; R17
  G.shotLog = []; G.partLog = []; G.firstLog = []; G.alarmLog = []; G.emitStat = { P: { n: 0, sum: 0 }, E: { n: 0, sum: 0 } }; G.lastShot = { P: null, E: null };
  G.mode = 'hunt';
  if (G.scan) applyScan(); // R19: what the ship heard (stale blips, notes), the patrols' drift and the listen's costs
  if (prep) prep();
  startRound();
}

// Roll this run's uplink point. R6: reseeds the RNG first, so one seed fixes the whole setup
// (this roll, then the field's positions in newHunt). R7: no temperament / variant roll any more.
// R8: then rolls the field composition (by weight); `force` = a composition NAME (runner --comp) skips the pick
// but still draws the random number, so a forced run's positions match an unforced one with the same seed.
// R15: mtype = the job's mission type (newHunt builds G.mission from it). It draws no random numbers.
export function rollEnemy(seed: number, force?: string, mtype = 'UPLINK') {
  setSeed(seed); G.seed = seed; G.mtype = mtype;
  if (TUNE.MAP_MODE === 'blocks') rollDistrict(seed, undefined, mtype === 'ESCORT'); else loadMap(HIVE); // R16: only an Escort needs a convoy route // R16: the hunt's district first (same seed, same map)
  addDropZones(); // R19: the drop zones (G.drops; the west edge spawn only, with the scan off)
  const X = anchors(), site = X.waypoints[X.escortSite];
  const A = mtype === 'ESCORT' ? [site] : mtype === 'RETRIEVE' && X.cargo.length ? X.cargo : X.uplinks; // R15 s3: Escort's site = the centre fork // R15: from the per-map anchors table (cargo reuses the uplink tiles while its list is empty)
  let c = A.filter(u => canReach(u.x, u.y) && dropPts().every(d => Math.hypot(u.x - d.x, u.y - d.y) >= TUNE.UPLINK_MIN_DIST)); // R19: far from every drop zone
  if (!c.length) c = A;
  const u = c[Math.floor(rand() * c.length)];
  G.up.x = (u.x + 0.5) * T; G.up.y = (u.y + 0.5) * T; G.up.name = u.name;
  const P = TUNE.FIELD_COMPOSITIONS, tot = P.reduce((a, c) => a + (c.weight ?? 1), 0);
  let r = rand() * tot, pick = P[P.length - 1];
  for (const c of P) { r -= c.weight ?? 1; if (r < 0) { pick = c; break; } }
  if (force) pick = P.find(c => c.NAME.toLowerCase() === force.toLowerCase()) || pick;
  G.comp = pick;
  rollZones(); // R10: then the signal terrain (named in INTEL, so it's rolled before the loadout)
  G.fieldReady = false;
  if (TUNE.SCAN_ENABLED) { placeField(); G.fieldReady = true; freshScan(seed, mtype); } // R19: the field is out there before the ship listens
  else G.scan = null;
}
// Loadout screen open: back to 'loadout' and roll the next setup.
export function enterLoadout(seed: number, force?: string) { G.mode = 'loadout'; G.ally = null; rollEnemy(seed, force); } // R18 fix: an Escort transport from a quit hunt pointed at the old map's route legs // R8: force = the view's shuffled-set pick
// End of the hunt (the result screen is the view's hooks.end).
export function finishHunt(outcome: string) {
  G.mode = 'result'; G.outcome = outcome;
  if (outcome === 'WIN') G.outcome = 'WIN ' + (G.winBy || 'CLEAR'); // R7: WIN UPLINK / WIN CLEAR
  recordHunt(); // R11: carry-over and contract progress (no-op outside a contract)
  hooks.end();
}
