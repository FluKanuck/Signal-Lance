// Headless runner (dev tool, not a test suite): plays whole games in Node using only src/sim/,
// R7 s2: two scripted mechs under initiative, against the real field (turret, emplacement, patrols) against a simple scripted player that walks to the uplink, uplinks, and fires
// whenever its lock rule allows. Proves the sim/view split is real, and replays a DBG seed.
//   npm run sim                        R8: seeds 1..10 for EACH composition (50 games), a block per composition
//   npm run sim -- --comp ambush --games 20   one composition only (name, case-insensitive)
//   npm run sim -- --contracts 20      R11: 20 contracts (seeds 1..20), the scripted lance always takes job 1
//   npm run sim -- --seed 123456 -v    replay one seed (its own rolled composition, or --comp to force), one line per turn
//   --loud                             R13: the scripted mechs SPRINT every move and pulse radar every activation they can
//   --set SOUND_RANGE.NORMAL=4         try a tune value for this run (repeatable)
//   --pack                             R13 s2: the pack on (alarm, converge, press the wound)
//   --both                             R13 s2: with --contracts, run normal then --loud and compare (flags if loud isn't riskier)
//   --check                            exit 1 if any FLAG or WARNING was printed (run before shipping)
//   --quiet                            R14: the scripted mechs CREEP every move
//   --scenario earshot [--runs 10]     R14: play a test-bed scenario with the scripted player (seed, seed+1, ...)
//   --mission bounty                   R15: force every hunt's mission type (games and contracts); contracts report a split by type
//   --map hive|blocks                  R16: the old fixed map, or a rolled block district every hunt (default: TUNE.MAP_MODE)
//   --grid 4x3                         R16: force every district's grid (columns × rows); contracts report a split by grid
//   --fit scout[,brawler]              R18: both suits (or A,B) use a hangar template id or a hangar build code
//   --sweep 30                         R18: 30 contracts for each frame × reactor pair (the templates included); win rate per
//                                      frame and per reactor, and what found the lance first, on which channel, from how far
//   --item mortar.mortar.shells=8      R18: try an item row value for this run (row id, then a dotted path; repeatable)
//   --from 61                          start the contract seeds at 61 instead of 1 (extends a batch without repeating seeds)
//   --json                             print one '@@SL {...}' line per contract as it finishes (the Signal Lance mod reads these)
//   --listen 2 [--drop 2|auto]         R19: the ship listens at this level before every hunt (0 SKIP, 1 SHORT, 2 MEDIUM, 3 LONG) and
//                                      lands on drop zone N (1 = west edge; only offered at 2+; auto = nearest the objective). Default: no listen (= SKIP)
//   --scan quiet|fast|mixed|loud|none       R20: the live scan's preset before every hunt (quiet = EM on the objective 8 min; fast = radar
//                                      full map 2 min; mixed = radar wide 2 → thermal on the objective 3 → EM there 5); drop nearest
//   --scansweep 40                     R20: 40 contracts per preset: wins, risk / step / painted / joined at the drop, per mission
//   --pick low                         R22: with --company, take the lowest-danger offer in reach (default: the highest fee)
//   --aar                              R22: print each hunt's after-action moments (the summary prints with --contracts / --company anyway)
//   --company 10 [--companies 5]       R21: 10 contracts back to back on one company (seed --from; --companies: that many companies, seeds from --from up): operators, XP, CRITICAL / KIA, bench, credits, fuel, folds
//   --listensweep 40                   R19: 40 contracts at each listen level (drop auto): win rate per level and per mission, and what
//                                      the listen cost on average (extra units, alert units, painted)
import { TUNE } from '../src/tune.ts';
import { G, rollEnemy, newHunt, unitById } from '../src/sim/state.ts';
import { newContract, takeJob, rollJobs, dmgWord, refit } from '../src/sim/contract.ts';
import { newCompany, hire, hireBlock, companyLine, autoCrew, suitRefit, suitRefitBlock, suitCost, lanceSize, buy, offerBlock, fuelCost, takeOffer, endContract } from '../src/sim/company.ts';
import { playOut as autoPlayOut, AUTO } from '../src/sim/autoplay.ts';
import { upDist } from '../src/sim/turns.ts';
import { idTick, idSummary } from '../src/sim/ids.ts';
import { scenarioByName, startScenario, leaveScenario, SCENARIOS } from '../src/sim/scenarios.ts';
import { MAP } from '../src/sim/world.ts';
import { HANGAR_TEMPLATES, fitStats, fitText, launchBlock } from '../src/sim/kit.ts';
import { fromCode } from '../src/sim/fit.ts';
import { CHANNEL } from '../src/sim/found.ts';
import { ITEMS } from '../src/sim/items.ts';
import { listen, chooseDrop, offeredDrops } from '../src/sim/scan.ts';
import { replayScan, type Cmd } from '../src/sim/livescan.ts';
// R20 cp3: the scripted lance's scan presets (ticks: 4 a ship-minute). The lance still can't read what the scan found (#92),
// so these measure the costs (risk, painted, units joined) and the drop zone, not the intel.
const PRESETS = ['none', 'quiet', 'fast', 'mixed', 'loud'];
function presetCmds(p: string): Cmd[] {
  const ux = Math.floor(G.up.x / 32), uy = Math.floor(G.up.y / 32);
  if (p === 'quiet') return [[0, 'R', 0], [0, 'E', 1], [0, 'a', ux, uy, 2], [0, 'G'], [32, 'S']];           // EM only, on the objective, 8 min
  if (p === 'fast') return [[0, 'W', 0, 1], [0, 'G'], [8, 'S']];                                           // radar on the full map, 2 min
  if (p === 'mixed') return [[0, 'W', 0, 1], [0, 'G'], [8, 'R', 0], [8, 'T', 1], [8, 'a', ux, uy, 1], [20, 'T', 0], [20, 'E', 1], [20, 'a', ux, uy, 2], [40, 'S']]; // radar wide 2 → thermal on the objective 3 → EM there 5
  if (p === 'loud') return [[0, 'W', 0, 1], [0, 'T', 1], [0, 'W', 1, 1], [0, 'E', 1], [0, 'W', 2, 1], [0, 'G'], [40, 'S']]; // all three on the full map, 10 min (beyond the brief's four: shows the cost ladder biting)
  return [];
}
// R19 --drop auto: the scripted lance lands on the offered drop zone nearest the objective (straight line)
const nearestDrop = () => { const D = offeredDrops(), ux = G.up.x / 32, uy = G.up.y / 32; let b = 0; D.forEach((d, i) => { if (Math.hypot(d.x - ux, d.y - uy) < Math.hypot(D[b].x - ux, D[b].y - uy)) b = i; }); return D[b].i; }; // R20: a dropPts index
import { previewJob } from '../src/sim/contract.ts';
import { pickMoments, momentLine, heldField } from '../src/sim/aar.ts';

const argv: string[] = (globalThis as any).process.argv.slice(2);
const arg = (k: string, d: number) => { const i = argv.indexOf(k); return i >= 0 ? Number(argv[i + 1]) : d; };
const GAMES = arg('--games', 10), ONE = arg('--seed', -1), VERBOSE = argv.includes('-v');
const sarg = (k: string) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : ''; };
const MISSION = sarg('--mission').toUpperCase(); // R15
if (MISSION && !TUNE.MISSION_TYPES.includes(MISSION) && MISSION !== 'UPLINK') throw new Error('--mission: unknown type ' + MISSION);
const COMP = sarg('--comp'), CONTRACTS = arg('--contracts', 0), SCEN = sarg('--scenario'), RUNS = arg('--runs', 10);
AUTO.loud = argv.includes('--loud'); AUTO.quiet = argv.includes('--quiet'); // R14: --quiet = CREEP every move
if (argv.includes('--pack')) TUNE.PACK_ENABLED = true; // R13 s2: the pack on (as the splash toggle does)
const BOTH = argv.includes('--both');
const MAPMODE = sarg('--map'), GRID = sarg('--grid'); // R16
if (MAPMODE) { if (!['hive', 'blocks'].includes(MAPMODE)) throw new Error('--map: hive or blocks'); TUNE.MAP_MODE = MAPMODE; }
if (GRID) { if (!/^\d+x\d+$/.test(GRID)) throw new Error('--grid: CxR, e.g. 4x3'); TUNE.MAP_GRIDS = [GRID]; TUNE.MAP_MIN_BLOCKS = 1; }
console.log(`  (map: ${TUNE.MAP_MODE}${GRID ? ' ' + GRID : ''})`); // R13 s2: run --contracts twice, normal then --loud, and compare
// --set KEY=VALUE (repeatable, dotted paths ok): try a tune value without editing tune.ts, e.g. --set SOUND_RANGE.NORMAL=4
argv.forEach((k, i) => {
  if (k !== '--set') return;
  const [path, v] = argv[i + 1].split('='), keys = path.split('.'); let o: any = TUNE;
  for (const key of keys.slice(0, -1)) o = o[key];
  const last = keys[keys.length - 1];
  if (!(last in o)) throw new Error('--set: unknown tune key ' + path);
  o[last] = v === 'true' ? true : v === 'false' ? false : Number(v);
  console.log(`  (--set ${path} = ${o[last]})`);
});
// --item ID.PATH=VALUE (repeatable): try an item row value without editing items.ts, e.g. --item lamp.radar.range=14
argv.forEach((k, i) => {
  if (k !== '--item') return;
  const [path, v] = argv[i + 1].split('='), [id, ...keys] = path.split('.');
  let o: any = ITEMS.find(r => r.id === id); if (!o) throw new Error('--item: unknown item row ' + id);
  const last = keys.pop(); if (!last) throw new Error('--item: give a field, e.g. ' + id + '.wt=3');
  for (const k2 of keys) { o = o[k2]; if (o == null || typeof o !== 'object') throw new Error('--item: no such path ' + path); }
  if (!(last in o)) throw new Error('--item: unknown field ' + path);
  o[last] = typeof o[last] === 'number' ? Number(v) : typeof o[last] === 'boolean' ? v === 'true' : v;
  console.log(`  (--item ${path} = ${o[last]})`);
});
const JSON_OUT = argv.includes('--json'), FROM = arg('--from', 1);
let LISTEN_LVL = arg('--listen', -1); if (LISTEN_LVL >= 0 || argv.includes('--listensweep')) TUNE.SCAN_MODE = 'dial'; const DROP = sarg('--drop') === 'auto' || argv.includes('--listensweep') ? -1 : arg('--drop', 1) - 1; // R19: auto = the offered drop zone nearest the objective (R20: --listen / --listensweep run the R19 dial; the live scan's presets come in cp3)
let SCAN_PRESET = sarg('--scan') || ''; // R20 cp3: none | quiet | fast | mixed (the live scan; drop zone nearest the objective)
if (SCAN_PRESET && !PRESETS.includes(SCAN_PRESET)) throw new Error('unknown --scan ' + SCAN_PRESET + ' (' + PRESETS.join(', ') + ')');
const MAX_TURNS = 80;
// --check: remember every FLAG / WARNING line, exit 1 at the end if there were any
const FLAGS: string[] = [], log0 = console.log;
console.log = (...a: any[]) => { const t = a.join(' '); if (/FLAG:|WARNING:/.test(t)) FLAGS.push(t.trim()); log0(...a); };
// the game's default loadout; R13 --loud swaps ECM for radar (both 2 slots) so it has something to pulse
const loadB0 = () => AUTO.loud ? { armour: 1, radar: 1, passive: 1, ecm: 0, ammo: 2, cells: 0, mortar: 0 } : { armour: 1, radar: 0, passive: 1, ecm: 1, ammo: 2, cells: 0, mortar: 0 };
const loadA0 = () => ({ ...loadB0(), mortar: 1 }); // R9: scripted A carries a mortar (9/10 slots)
// R18 --fit: a template id or a build code per suit; the default stays the R17 scripted lance
const fitArg = (s: string) => { const t = HANGAR_TEMPLATES.find(t => t.id === s); const f = t ? t.fit() : fromCode(s); if (!f) throw new Error('--fit: no template or build code ' + s); const w = launchBlock(f); if (w) throw new Error('--fit ' + s + ': ' + w); return f; };
let FITS: any[] | null = sarg('--fit') ? sarg('--fit').split(',').map(fitArg) : null;
const loadA = () => FITS ? FITS[0] : loadA0();
const loadB = () => FITS ? FITS[FITS.length - 1] : loadB0();
if (FITS) console.log('  (--fit A ' + fitText(FITS[0]) + ' | B ' + fitText(FITS[FITS.length - 1]) + ')');

function playGame(seed: number, comp?: string) {
  rollEnemy(seed, comp, MISSION || 'UPLINK'); newHunt([loadA(), loadB()]); // R7 s2: two scripted mechs, same loadout
  return playOut(seed);
}
// play the already-started hunt to its end (or a stall)
function playOut(seed: number) {
  allOn3 = false;
  autoPlayOut(MAX_TURNS, (t, who) => { if (G.turn <= 3 && !allOn3) allOn3 = everyoneOnLance(); if (VERBOSE) verboseLine(t, who); });
  return summary(seed);
}
// R13 s2: does every living field unit hold a contact (own or shared) on a lance mech right now?
let allOn3 = false;
function everyoneOnLance() {
  const live = G.units.filter((u: any) => !u.dead);
  return live.length > 1 && live.every((u: any) => u.ec.some((c: any) => c.on && G.lance.some((m: any) => m.id === c.id)));
}
function verboseLine(t: number, who: string) {
  console.log(`  R${t} ${who} ${Math.round(upDist(unitById(who)))}t from uplink, hits ${G.lance.map((m: any) => m.id + m.hits).join(' ')} | ` + G.units.map((u: any) => `${u.type[0]}:${u.dead ? 'X' : u.state + (u.pack ? '/' + u.pack : '') + ' h' + u.hits}`).join(' ') + ` | uplink ${G.up.prog}/${TUNE.UPLINK_TURNS}`);
}
function summary(seed: number) {
  const outcome = G.mode === 'hunt' ? 'STALL' : G.outcome;
  const units = G.units.map((u: any) => ({ type: u.type, found: u.found, acted: u.acted, dead: u.dead, shots: u.shots, zoned: u.zoned, ft: u.found ? u.foundTurn : 0, mobile: u.mobile }));
  const mt = G.lance.reduce((a: any, m: any) => ({ s: a.s + m.mShots, h: a.h + m.mHits, k: a.k + m.mKills, f: a.f + m.mFriendly, ns: a.ns + (m.mNS || 0), nh: a.nh + (m.mNH || 0), os: a.os + (m.mOS || 0), oh: a.oh + (m.mOH || 0), nu: a.nu + (m.mNU || 0), ou: a.ou + (m.mOU || 0) }), { s: 0, h: 0, k: 0, f: 0, ns: 0, nh: 0, os: 0, oh: 0, nu: 0, ou: 0 });
  const zones = G.zones.map((z: any) => z.type[0]).join('');
  return { seed, comp: G.comp.NAME, outcome, turns: G.turn, kills: G.kills, up: G.up.name, units, mt, zones };
}

// R22: the after-action page per hunt: how many moments, which kinds, held the field or not, redacted lines, the always-in
const AAR = argv.includes('--aar'); let aarRuns: any[] = [];
function aarNote(label: string) {
  if (G.mode === 'hunt') return; // a stall has no page
  const ev: any[] = G.aar || [], held = heldField(), M = pickMoments(), L = M.map(m => momentLine(m, held));
  const firstE = ev.find(e => e.sub === 'DETECT' && e.side === 'E'), must = ev.filter(e => e.sub === 'END' || e.sub === 'KIA' || e.sub === 'DOWN' || e === firstE);
  const kinds: Record<string, number> = {}; for (const m of M) kinds[m.kind] = (kinds[m.kind] || 0) + 1;
  const subs: Record<string, number> = {}; for (const m of M) subs[m.sub] = (subs[m.sub] || 0) + 1;
  aarRuns.push({ label, outcome: G.outcome, n: L.length, ev: ev.length, kinds, subs, held, red: L.filter(l => l.redacted).length, enemy: M.filter(m => m.side === 'E').length,
    firstE: !!firstE, firstIn: !!firstE && M.some(m => m.n === firstE.n), must: must.length, missing: must.filter(e => !M.some(m => m.n === e.n)).length, lines: L });
  if (AAR) { console.log(`  [AAR] ${label} ${G.outcome} · ${held ? 'held the field' : 'not held'} · ${ev.length} events → ${L.length} moments`); for (const l of L) console.log(`    T${l.turn} ${l.kind} ${l.redacted ? 'redacted' : 'held'}: ${l.text}`); }
}
function aarReport() {
  const R = aarRuns; if (!R.length) return;
  const ns = R.map(r => r.n), avg = (a: number[]) => (a.reduce((x, y) => x + y, 0) / Math.max(1, a.length)).toFixed(1), pc = (a: number, b: number) => b ? Math.round(100 * a / b) + '%' : '-';
  const tot = ns.reduce((a, b) => a + b, 0), K: Record<string, number> = {}, S: Record<string, number> = {};
  for (const r of R) { for (const [k, v] of Object.entries(r.kinds)) K[k] = (K[k] || 0) + (v as number); for (const [k, v] of Object.entries(r.subs)) S[k] = (S[k] || 0) + (v as number); }
  const held = R.filter(r => r.held), lost = R.filter(r => !r.held), lostLines = lost.reduce((a, r) => a + r.n, 0), lostRed = lost.reduce((a, r) => a + r.red, 0);
  console.log(`== AFTER-ACTION (R22): ${R.length} hunts · events per hunt avg ${avg(R.map(r => r.ev))} · moments avg ${avg(ns)} (min ${Math.min(...ns)}, max ${Math.max(...ns)})`);
  console.log('  kinds: ' + ['SEEN', 'HIT', 'OBJ'].map(k => `${k} ${pc(K[k] || 0, tot)}`).join(', ') + ' · by event: ' + Object.entries(S).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(', '));
  console.log(`  held the field ${held.length}/${R.length} (${pc(held.length, R.length)}) · not held: ${lostRed}/${lostLines} lines redacted (${pc(lostRed, lostLines)}) · enemy-side moments ${pc(R.reduce((a, r) => a + r.enemy, 0), tot)} of all`);
  console.log(`  too thin (< 3 moments) ${R.filter(r => r.n < 3).length} (${pc(R.filter(r => r.n < 3).length, R.length)}) · at the cap (${TUNE.AAR_MAX_MOMENTS}) ${R.filter(r => r.n >= TUNE.AAR_MAX_MOMENTS).length} (${pc(R.filter(r => r.n >= TUNE.AAR_MAX_MOMENTS).length, R.length)}) · more events than the cap ${R.filter(r => r.ev > TUNE.AAR_MAX_MOMENTS).length}`);
  console.log(`  always-in: first detection of the lance in ${R.filter(r => r.firstIn).length}/${R.filter(r => r.firstE).length} · the end in ${R.filter(r => r.subs.END).length}/${R.length} · always-in dropped by the cap ${R.reduce((a, r) => a + r.missing, 0)} (in ${R.filter(r => r.missing).length} hunts with more than ${TUNE.AAR_MAX_MOMENTS} always-in)`);
  if (R.some(r => !r.subs.END)) console.log('  WARNING: a hunt with no END moment');
  if (R.some(r => r.missing && r.must <= TUNE.AAR_MAX_MOMENTS)) console.log('  FLAG: an always-in moment was dropped under the cap');
  aarRuns = [];
}

function report(title: string, res: any[]) {
  const by: Record<string, number> = {};
  for (const r of res) by[r.outcome] = (by[r.outcome] || 0) + 1;
  const done = res.filter(r => r.outcome !== 'STALL'), stalls = res.filter(r => r.outcome === 'STALL');
  console.log(`== ${title}: games ${res.length} | ` + Object.entries(by).map(([k, v]) => `${k} ${v}`).join(' | '));
  console.log(`  average rounds ${(done.reduce((a, r) => a + r.turns, 0) / Math.max(1, done.length)).toFixed(1)} (finished games)`);
  console.log(`  average kills ${(res.reduce((a, r) => a + r.kills, 0) / Math.max(1, res.length)).toFixed(2)} / ${res[0].units.length}`);
  const M = res.reduce((a, r) => ({ s: a.s + r.mt.s, h: a.h + r.mt.h, k: a.k + r.mt.k, f: a.f + r.mt.f, ns: a.ns + r.mt.ns, nh: a.nh + r.mt.nh, os: a.os + r.mt.os, oh: a.oh + r.mt.oh, nu: a.nu + r.mt.nu, ou: a.ou + r.mt.ou }), { s: 0, h: 0, k: 0, f: 0, ns: 0, nh: 0, os: 0, oh: 0, nu: 0, ou: 0 });
  console.log(`  mortar: shots ${M.s}, hits ${M.h}, kills ${M.k}, friendly hits ${M.f}` + (!M.s ? '  WARNING: mortar never qualified' : !M.h ? '  WARNING: mortar never hit' : ''));
  // R10: signal terrain. Statics placed in zones; found rate in a zone vs not (by the zone a unit started in);
  // aimed-lob hit rate on targets standing in NOISE vs elsewhere.
  const all = res.flatMap(r => r.units), st = all.filter(u => !u.mobile), pc = (a: number, b: number) => b ? Math.round(100 * a / b) + '%' : '-';
  const zin = all.filter(u => u.zoned), zout = all.filter(u => !u.zoned), sin = st.filter(u => u.zoned), sout = st.filter(u => !u.zoned);
  const zq = res.reduce((a, r) => a + [...r.zones].filter((c: string) => c === 'Q').length, 0), zn = res.reduce((a, r) => a + [...r.zones].filter((c: string) => c === 'N').length, 0);
  console.log(`  zones: avg ${((zq + zn) / res.length).toFixed(1)} per game (Q ${zq}, N ${zn}) | statics in zones ${sin.length}/${st.length} (${pc(sin.length, st.length)}) [quiet ${sin.filter(u => u.zoned === 'QUIET').length}, noise ${sin.filter(u => u.zoned === 'NOISE').length}]`);
  console.log(`  found: in-zone ${zin.filter(u => u.found).length}/${zin.length} (${pc(zin.filter(u => u.found).length, zin.length)}) vs out ${zout.filter(u => u.found).length}/${zout.length} (${pc(zout.filter(u => u.found).length, zout.length)})` +
    ` | statics in ${sin.filter(u => u.found).length}/${sin.length} vs out ${sout.filter(u => u.found).length}/${sout.length}`);
  const avgFT = (a: any[]) => { const f = a.filter(u => u.found); return f.length ? (f.reduce((x, u) => x + u.ft, 0) / f.length).toFixed(1) : '-'; };
  console.log(`  first found (avg round): statics in zone ${avgFT(sin)} [quiet ${avgFT(sin.filter(u => u.zoned === 'QUIET'))}, noise ${avgFT(sin.filter(u => u.zoned === 'NOISE'))}] vs out ${avgFT(sout)}`);
  console.log(`  aimed lobs: on NOISE targets ${M.nh}/${M.ns} hit (${pc(M.nh, M.ns)}, avg fix ±${M.ns ? (M.nu / M.ns).toFixed(1) : '-'}t) vs elsewhere ${M.oh}/${M.os} (${pc(M.oh, M.os)}, ±${M.os ? (M.ou / M.os).toFixed(1) : '-'}t)`);
  if (st.length && !sin.length) console.log('  WARNING: zones never held a static');
  if (zin.length && zout.length && zin.filter(u => u.found).length / zin.length >= zout.filter(u => u.found).length / zout.length) console.log('  FLAG: in-zone units found at least as often as out-of-zone ones');
  console.log(stalls.length ? `  stalls over ${MAX_TURNS} rounds: ` + stalls.map(r => `seed ${r.seed} (@${r.up})`).join(', ') : `  stalls over ${MAX_TURNS} rounds: none`);
  // per field type: in how many games was it found (player ever had a contact), did it act, fire, die
  const types: Record<string, any> = {};
  for (const r of res) for (const u of r.units) {
    const t = types[u.type] || (types[u.type] = { n: 0, found: 0, acted: 0, fired: 0, dead: 0 });
    t.n++; if (u.found) t.found++; if (u.acted) t.acted++; if (u.shots) t.fired++; if (u.dead) t.dead++;
  }
  for (const [k, t] of Object.entries(types)) console.log(`    ${k.padEnd(11)} units ${t.n}: found ${t.found}, acted ${t.acted}, fired ${t.fired}, destroyed ${t.dead}`);
  const never = Object.entries(types).filter(([, t]) => !t.found || !t.acted).map(([k, t]) => k + (!t.found ? ' never found' : '') + (!t.acted ? ' never acted' : ''));
  if (never.length) console.log('  WARNING: ' + never.join(', '));
  if (VERBOSE) for (const r of res) console.log(`    seed ${r.seed}: ${r.outcome} in ${r.turns} rounds, kills ${r.kills} @${r.up}`);
}

// R11 s2: spend greedily between hunts: repairs first, then rebuild, then rounds, then shells.
function greedy() {
  for (const what of ['repair', 'rebuild', 'rounds', 'shell']) for (let k = 0; k < 50; k++) {
    let any = false;
    for (const id of G.ct.ids) if (refit(id, what)) any = true; // R21 cp2: every suit
    if (!any) break;
  }
}
// R11: whole contracts. The scripted lance always takes job 1 (A with mortar, as above).
function contracts(n: number) {
  const res: any[] = [], shots: any[] = [], parts: any[] = [], hunts: any[] = [];
  for (let c = FROM; c < FROM + n; c++) {
    newContract(c, [loadA(), loadB()]); const h0 = hunts.length;
    const entering: any[] = []; let stall = false;
    while (G.ct.status === 'ACTIVE') {
      entering.push({ n: G.ct.hunt, carry: JSON.parse(JSON.stringify(G.ct.carry)) });
      if (MISSION) for (const j of G.ct.jobs) j.mission = MISSION; // R15 --mission
      if (LISTEN_LVL >= 0 && TUNE.SCAN_ENABLED) { G.scan = null; previewJob(0); listen(LISTEN_LVL); chooseDrop(DROP >= 0 ? DROP : nearestDrop()); } // R19 --listen
      else if (SCAN_PRESET && TUNE.SCAN_ENABLED && TUNE.SCAN_MODE === 'active') { G.scan = null; previewJob(0); replayScan(presetCmds(SCAN_PRESET)); chooseDrop(nearestDrop()); } // R20 --scan
      takeJob(0);
      const r = playOut(G.ct.huntSeed);
      aarNote(`C${c} H${G.ct.results.length}`); // R22
      shots.push(...G.shotLog); parts.push(...G.partLog); // R12
      hunts.push(huntStats()); // R13
      if (r.outcome === 'STALL') { stall = true; break; }
      if (VERBOSE) console.log(`  C${c} H${G.ct.hunt} ${r.comp}: ${r.outcome} kills ${r.kills}/${r.units.length} | ` + Object.keys(G.ct.carry).map(k => k + ' ' + dmgWord(G.ct.carry[k])).join(', '));
      if (G.ct.status === 'ACTIVE') { rollJobs(); greedy(); }
    }
    res.push({ c, status: stall ? 'STALL' : G.ct.status, reached: G.ct.hunt, results: G.ct.results, entering, earned: G.ct.earned, spent: G.ct.spent });
    if (JSON_OUT) log0('@@SL ' + JSON.stringify({ c, status: res[res.length - 1].status, earned: G.ct.earned, spent: G.ct.spent,
      hunts: hunts.slice(h0).map((h: any) => ({ outcome: h.outcome, mission: h.mission, turns: h.endTurn, lost: h.lost,
        found: h.found.map((f: any) => f ? { ch: CHANNEL[f.src] || f.src, d: Math.round(f.d * 10) / 10 } : null) })) }));
  }
  const by: Record<string, number> = {};
  for (const r of res) by[r.status] = (by[r.status] || 0) + 1;
  console.log(`== CONTRACTS: ${res.length} | ` + Object.entries(by).map(([k, v]) => `${k} ${v}`).join(' | '));
  const reach: Record<number, number> = {};
  for (const r of res) reach[r.reached] = (reach[r.reached] || 0) + 1;
  console.log('  hunts reached: ' + Object.entries(reach).map(([k, v]) => `H${k} ${v}`).join(', '));
  const outc: Record<string, number> = {};
  for (const r of res) for (const h of r.results) { const k = 'H' + h.n + ' ' + h.outcome; outc[k] = (outc[k] || 0) + 1; }
  const hl = res.flatMap(r => r.results.map((h: any) => h.turns));
  console.log(`  average hunt length: ${(hl.reduce((a: number, b: number) => a + b, 0) / Math.max(1, hl.length)).toFixed(1)} rounds over ${hl.length} hunts`);
  console.log('  hunt results: ' + Object.entries(outc).sort().map(([k, v]) => `${k} ${v}`).join(', '));
  const lost: Record<number, number> = {};
  for (const r of res) for (const h of r.results) if (h.lost.length) lost[h.n] = (lost[h.n] || 0) + h.lost.length;
  console.log('  mechs lost by hunt: ' + [1, 2, 3].map(n => `H${n} ${lost[n] || 0}`).join(', '));
  for (const n of [2, 3]) {
    const e = res.flatMap(r => r.entering.filter((x: any) => x.n === n));
    if (!e.length) { console.log(`  entering H${n}: never reached`); continue; }
    let dmg = 0, mechs = 0, ammo = 0, shells = 0, dead = 0, carried = 0;
    for (const x of e) for (const m of Object.values(x.carry) as any[]) {
      if (m.dead) { dead++; carried++; continue; }
      mechs++; dmg += m.maxHits - m.hits; ammo += m.ammo; shells += m.shells; if (m.hits < m.maxHits) carried++;
    }
    console.log(`  entering H${n} (${e.length} contracts): avg damage ${(dmg / Math.max(1, mechs)).toFixed(1)} hits per living mech, avg rounds ${(ammo / Math.max(1, mechs)).toFixed(1)}, avg shells (A) ${(shells / Math.max(1, e.length)).toFixed(1)}, mechs already lost ${dead}, mechs carrying damage or lost ${carried}/${e.length * 2}`);
  }
  const E = res.reduce((a, r) => a + r.earned, 0), S = res.reduce((a, r) => a + r.spent, 0);
  const rebuilds = res.reduce((a, r) => a + r.results.reduce((b: number, h: any) => b + h.buys.filter((x: string) => x.endsWith('rebuild')).length, 0), 0);
  console.log(`  credits: avg earned ${(E / res.length).toFixed(0)}, avg spent ${(S / res.length).toFixed(0)} per contract; rebuilds ${rebuilds}`);
  const st = res.filter(r => r.status === 'STALL');
  console.log(st.length ? '  stalls over 80 rounds: ' + st.map(r => `contract ${r.c} H${r.reached}`).join(', ') : '  stalls over 80 rounds: none');
  missionReport(res.flatMap(r => r.results), hunts);
  mapReport(hunts);
  hitReport(shots, parts);
  soundReport(hunts);
  idReport(hunts);
  last = { failed: res.filter(r => r.status === 'FAILED').length, complete: res.filter(r => r.status === 'COMPLETE').length, lost: hunts.reduce((a, h) => a + h.lost, 0), n: res.length };
  const h1 = res.filter(r => r.reached === 1).length;
  if (h1 >= res.length * 0.8) console.log('  FLAG: nearly every contract ends in hunt 1 (carry-over barely tested)');
  const anyCarried = res.some(r => r.entering.some((x: any) => x.n > 1 && Object.values(x.carry).some((m: any) => m.dead || m.hits < m.maxHits)));
  if (!anyCarried) console.log('  FLAG: nothing is ever carried (stakes are zero)');
  if (VERBOSE) for (const r of res) console.log(`    contract ${r.c}: ${r.status} ` + r.results.map((h: any) => `H${h.n} ${h.comp} ${h.outcome} ${h.kills}/${h.total} [${h.out.join(', ')}]`).join(' | '));
  foundReport(hunts);
  aarReport(); // R22
  return { res, hunts };
}

// R21: N contracts back to back on one company. The scripted lance takes job 1, repairs greedily (R11 refit), hires every
// recruit it has room for, and never goes back for a CRITICAL suit (it only carries one by chance: #42). Cp3 adds the books.
function companyRun(n: number, seed = FROM) {
  newCompany(seed, [loadA(), loadB()]);
  const per: any[] = [], sizes: Record<number, number> = {}; let crits = 0, carried = 0, hired = 0, played = 0;
  const C = G.co, buyFirst = (k: string, max = 99) => { let got = 0; const i = C.market.findIndex((l: any) => l.k === k); while (i >= 0 && got < max && buy(i)) got++; return got; };
  // repair everything it can afford: buy parts as the repairs need them (rebuild first, then hits, then reloads)
  const repairAll = () => { for (const what of ['rebuild', 'repair', 'rounds', 'shell']) for (let k = 0; k < 60; k++) { let any = false;
    for (const s of C.suits) { if (suitRefit(s.id, what)) { any = true; continue; } if (suitRefitBlock(s.id, what) === 'PARTS' && buyFirst('parts', suitCost(what, s.id).parts - C.parts) && suitRefit(s.id, what)) any = true; }
    if (!any) break; } };
  for (let c = 0; c < n && !C.folded; c++) {
    while (hireBlock(0) === '' && C.ops.length < C.suits.length + 1) { hire(0); hired++; } // keeps one spare operator, no more
    // the highest fee it can reach, buying the fuel it needs first (before any repair spends the credits)
    const short = (o: any) => Math.max(0, fuelCost(o) - C.fuel), fl = C.market.find((l: any) => l.k === 'fuel');
    const pick = C.offers.map((o: any, i: number) => ({ o, i })).filter((x: any) => short(x.o) === 0 || (fl && short(x.o) <= fl.qty && short(x.o) * fl.price <= C.credits)).sort((a: any, b: any) => PICK === 'low' ? a.o.tier - b.o.tier || b.o.fee - a.o.fee : b.o.fee - a.o.fee)[0]; // R22 --pick low: the safest offer in reach
    if (pick) buyFirst('fuel', short(pick.o));
    repairAll(); autoCrew();
    if (!pick || offerBlock(pick.i) || !lanceSize()) { console.log(`  contract ${c + 1}: stranded (${!lanceSize() ? 'no lance' : 'no fuel'}; ${C.credits} cr, ${C.fuel} fuel)`); break; }
    const cr0 = C.credits, tier0 = C.offers[pick.i].tier, hunts0 = C.offers[pick.i].hunts; // R22: what the contract did to the books
    takeOffer(pick.i); played++;
    while (G.ct.status === 'ACTIVE') {
      autoCrew(); if (!lanceSize()) { G.ct.status = 'FAILED'; endContract('FAILED'); break; } // every suit that can drop does
      sizes[lanceSize()] = (sizes[lanceSize()] || 0) + 1;
      takeJob(0); playOut(G.ct.huntSeed); aarNote(`co ${C.code} C${c + 1} H${G.ct.results.length}`); // R22
      for (const m of G.lance) if (m.crit) { crits++; if (m.carriedBy) carried++; }
      if (G.mode === 'hunt') { G.ct.status = 'FAILED'; endContract('FAILED'); break; } // a stall ends the contract
      if (G.ct.status === 'ACTIVE') { rollJobs(); repairAll(); }
    }
    per.push({ c: c + 1, status: G.ct.status, wins: G.ct.wins, hunts: G.ct.results.length, tier: G.ct.tier ?? tier0, cr: C.credits, fuel: C.fuel, delta: C.credits - cr0, len: hunts0 });
    if (VERBOSE) console.log(`  C${c + 1} ${G.ct.status} ${G.ct.wins}/${G.ct.results.length} | ${companyLine()} | ${C.news.join(' ')}`);
    C.news = [];
  }
  const R = C.rec, lv = [1, 2, 3].map(l => C.ops.filter((o: any) => o.lvl === l).length);
  console.log(`== COMPANY ${C.code}: ${played} of ${n} contracts | complete ${R.complete} | failed ${R.failed} | hunts won ${R.wins}/${R.hunts} | ${C.folded ? 'FOLDED: ' + C.folded : 'still going'}`);
  console.log(`  operators: KIA ${R.kia}, CRITICAL ${crits} (carried out ${carried}), hired ${hired} | roster at the end ${C.ops.length}: level 1 ×${lv[0]}, 2 ×${lv[1]}, 3 ×${lv[2]}, benched ${C.ops.filter((o: any) => o.status === 'BENCH').length}`);
  console.log('  lance size per hunt: ' + Object.entries(sizes).map(([k, v]) => `${k} suits ×${v}`).join(', '));
  console.log('  credits / fuel after each contract: ' + per.map(p => `C${p.c} ${p.status[0]}${['L', 'M', 'H'][p.tier] ?? ''} ${p.cr}cr/${p.fuel}f`).join(' · '));
  console.log('  end: ' + companyLine());
  if (C.memorial.length) console.log('  memorial: ' + C.memorial.map((m: any) => `${m.name} (${m.skill}${m.lvl}, ${m.when})`).join(', '));
  console.log('  (the scripted lance never goes back for a CRITICAL suit and buys no ship modules or items: it undervalues the ship and market, #42)');
  if (!MANY) aarReport(); // R22 (several companies: one summary at the end)
  return { folded: !!C.folded, played, complete: R.complete, kia: R.kia, cr: C.credits, per };
}
// R21 cp3: --company N --companies K: K companies of N contracts (seeds FROM..FROM+K-1), the summary per company and in total
let MANY = false; const PICK = sarg('--pick') || 'high'; // R22: --pick low = the company takes the lowest danger it can reach (default: the highest fee)
function companies(n: number, k: number) {
  MANY = true;
  const out: any[] = [];
  for (let i = 0; i < k; i++) out.push(companyRun(n, FROM + i));
  const sum = (key: string) => out.reduce((a, r) => a + r[key], 0);
  // R22 (R21's open question): does a contract pay its way? credits after it ends vs before it was taken (fuel bought before)
  const all = out.flatMap(r => r.per);
  for (const [t, nm] of [[0, 'LOW'], [1, 'MEDIUM'], [2, 'HIGH']] as [number, string][]) {
    const L = all.filter((p: any) => p.tier === t); if (!L.length) { console.log(`  ${nm}: none played`); continue; }
    const pays = L.filter((p: any) => p.delta >= 0);
    console.log(`  ${nm}: ${L.length} played, complete ${L.filter((p: any) => p.status === 'COMPLETE').length}, paid its way ${pays.length} (avg ${Math.round(L.reduce((a: number, p: any) => a + p.delta, 0) / L.length)} cr; complete avg ${Math.round(L.filter((p: any) => p.status === 'COMPLETE').reduce((a: number, p: any) => a + p.delta, 0) / Math.max(1, L.filter((p: any) => p.status === 'COMPLETE').length))} cr) · ` + L.map((p: any) => `${p.len}h ${p.status[0]} ${p.delta >= 0 ? '+' : ''}${p.delta}`).join(', '));
  }
  console.log(`  contracts survived per company: ` + out.map(r => r.per.filter((p: any) => p.status === 'COMPLETE').length + '/' + r.played + (r.folded ? ' fold' : '')).join(' · '));
  aarReport();
  console.log(`== ${k} COMPANIES × ${n} contracts: folded ${out.filter(r => r.folded).length} | contracts played ${sum('played')} (complete ${sum('complete')}) | KIA ${sum('kia')} | avg credits at the end ${Math.round(sum('cr') / k)}`);
}

// R18 (A12): what found each lance suit first, on which channel, from how far
function foundReport(hunts: any[]) {
  const F = hunts.flatMap(h => h.found), got = F.filter(Boolean), ch: Record<string, number[]> = {};
  for (const f of got) (ch[CHANNEL[f.src] || f.src] ||= []).push(f.d);
  const avg = (a: number[]) => (a.reduce((x, y) => x + y, 0) / Math.max(1, a.length)).toFixed(1);
  console.log(`  FOUND (R18) suits found by the field ${got.length}/${F.length} | first heard on: ` + Object.entries(ch).sort((a, b) => b[1].length - a[1].length).map(([k, v]) => `${k} ${v.length} at ${avg(v)} tiles`).join(', '));
  const rear = hunts.reduce((a, h) => a + h.rear, 0), all = hunts.reduce((a, h) => a + h.hitsAll, 0);
  console.log(`  REAR (R18) gun hits from behind ${rear}/${all} (${Math.round(100 * rear / Math.max(1, all))}%)`);
}
// R18 (A11): build sweep. Every frame × reactor pair (from the frame's template, reactor swapped), N contracts each, both suits the same.
function sweep(n: number) {
  const rows: any[] = [];
  for (const t of HANGAR_TEMPLATES) for (const r of ['coldburn', 'hotcore']) {
    const f = t.fit(); f.mounts.CORE = f.mounts.CORE.map((id: string | null) => id === 'coldburn' || id === 'hotcore' ? r : id);
    const why = launchBlock(f); if (why) { log0(`  ${t.role} + ${r}: can't launch (${why})`); continue; }
    FITS = [f]; console.log = () => {}; const out = contracts(n); console.log = (...a: any[]) => { const s = a.join(' '); if (/FLAG:|WARNING:/.test(s)) FLAGS.push(s.trim()); log0(...a); };
    const H = out.res.flatMap((c: any) => c.results), wins = H.filter((h: any) => h.outcome.startsWith('WIN')).length;
    const F = out.hunts.flatMap((h: any) => h.found), got = F.filter(Boolean), ch: Record<string, number[]> = {};
    for (const x of got) (ch[CHANNEL[x.src] || x.src] ||= []).push(x.d);
    const s = fitStats(f), tpl = (t.id === 'line' ? 'coldburn' : 'hotcore') === r;
    rows.push({ frame: f.frame, reactor: r, wins, hunts: H.length, complete: out.res.filter((c: any) => c.status === 'COMPLETE').length, n });
    log0(`  ${(t.role + (tpl ? '*' : '')).padEnd(9)} ${f.frame.padEnd(8)} ${r.padEnd(9)} hunts ${H.length} | win ${wins} (${Math.round(100 * wins / Math.max(1, H.length))}%) | contracts ${rows[rows.length - 1].complete}/${n} | load ${s.load}/${s.rated} regen ${s.regen} EM ${s.emBase.toFixed(1)} | first heard: ` +
      Object.entries(ch).sort((a, b) => b[1].length - a[1].length).map(([k, v]) => `${k} ${v.length} at ${(v.reduce((x, y) => x + y, 0) / v.length).toFixed(1)}t`).join(', '));
  }
  const by = (k: string) => { const g: Record<string, { w: number; h: number }> = {}; for (const r of rows) { const x = g[r[k]] ||= { w: 0, h: 0 }; x.w += r.wins; x.h += r.hunts; } return Object.entries(g).map(([n, x]) => `${n} ${Math.round(100 * x.w / Math.max(1, x.h))}%`).join(', '); };
  log0(`== SWEEP (${n} contracts each, * = the template's own reactor) | win by frame: ${by('frame')} | by reactor: ${by('reactor')}`);
}
// R19 checkpoint 2: the listen sweep. Same contract seeds at every level; the scripted lance lands on the drop zone nearest the objective.
function listenSweep(n: number) {
  const rows: any[] = [], quiet = () => { console.log = () => {}; }, loud = () => { console.log = (...a: any[]) => { const s = a.join(' '); if (/FLAG:|WARNING:/.test(s)) FLAGS.push(s.trim()); log0(...a); }; };
  for (const L of [0, 1, 2, 3]) {
    LISTEN_LVL = L; quiet(); const out = contracts(n); loud();
    const H = out.res.flatMap((c: any) => c.results), wins = H.filter((h: any) => h.outcome.startsWith('WIN')).length;
    const S = out.hunts.map((h: any) => h.scan).filter(Boolean), avg = (f: (c: any) => number) => (S.reduce((a: number, c: any) => a + f(c), 0) / Math.max(1, S.length)).toFixed(2);
    const byM: Record<string, { w: number; h: number }> = {};
    for (const h of H) { const x = byM[h.mission] ||= { w: 0, h: 0 }; x.h++; if (h.outcome.startsWith('WIN')) x.w++; }
    const lost = out.hunts.reduce((a: number, h: any) => a + h.lost, 0);
    rows.push({ L, wins, hunts: H.length, complete: out.res.filter((c: any) => c.status === 'COMPLETE').length });
    log0(`  ${['SKIP  ', 'SHORT ', 'MEDIUM', 'LONG  '][L]} hunts ${H.length} | win ${wins} (${Math.round(100 * wins / Math.max(1, H.length))}%) | contracts ${rows[rows.length - 1].complete}/${n} | mechs lost ${lost} | cost per hunt: extra ${avg(c => c.extra.length)}, alert ${avg(c => c.alert.length)}, painted ${avg(c => c.painted ? 1 : 0)} | ` +
      Object.entries(byM).map(([k, x]) => `${k} ${Math.round(100 * x.w / Math.max(1, x.h))}%`).join(', '));
  }
  const pct = (r: any) => 100 * r.wins / Math.max(1, r.hunts), best = rows.slice().sort((a, b) => pct(b) - pct(a));
  log0(`== LISTEN SWEEP (${n} contracts each, drop auto) | best ${['SKIP', 'SHORT', 'MEDIUM', 'LONG'][best[0].L]} ${Math.round(pct(best[0]))}%, worst ${['SKIP', 'SHORT', 'MEDIUM', 'LONG'][best[3].L]} ${Math.round(pct(best[3]))}%` +
    (pct(best[0]) - pct(best[1]) >= 10 ? ' | NOTE: one level wins clearly (dominance?)' : ''));
}
// R20 cp3: the scan sweep. Same contract seeds for every preset; per preset: hunt wins, the risk and step at the drop, how
// often the ship was painted, units that joined, who was awake, contracts complete, wins per mission type.
function scanSweep(n: number) {
  const quiet = () => { console.log = () => {}; }, loud = () => { console.log = (...a: any[]) => { const s = a.join(' '); if (/FLAG:|WARNING:/.test(s)) FLAGS.push(s.trim()); log0(...a); }; };
  const rows: any[] = [];
  for (const p of PRESETS) {
    SCAN_PRESET = p; quiet(); const out = contracts(n); loud();
    const H = out.res.flatMap((c: any) => c.results), wins = H.filter((h: any) => h.outcome.startsWith('WIN')).length;
    const S = out.hunts.map((h: any) => h.scan).filter((c: any) => c && c.live), N = Math.max(1, S.length), av = (f: (c: any) => number) => (S.reduce((a: number, c: any) => a + f(c), 0) / N);
    const byM: Record<string, { w: number; h: number }> = {};
    for (const h of H) { const x = byM[h.mission] ||= { w: 0, h: 0 }; x.h++; if (h.outcome.startsWith('WIN')) x.w++; }
    const r = { p, wins, hunts: H.length, complete: out.res.filter((c: any) => c.status === 'COMPLETE').length };
    rows.push(r);
    log0(`  ${p.padEnd(5)} hunts ${H.length} | win ${wins} (${Math.round(100 * wins / Math.max(1, H.length))}%) | contracts ${r.complete}/${n} | at the drop: ${av(c => c.t).toFixed(1)} min, risk ${av(c => c.risk).toFixed(1)}, step ${av(c => c.step).toFixed(2)}, painted ${Math.round(100 * av(c => +c.painted))}%, awake ${av(c => c.alert.length).toFixed(1)}, joined ${av(c => c.extra.length + c.arrived.length).toFixed(2)}, window closed ${Math.round(100 * av(c => +!!c.over))}% | wins by job: ` +
      Object.entries(byM).map(([k, x]) => `${k} ${Math.round(100 * x.w / Math.max(1, x.h))}%`).join(', '));
  }
  const pct = (r: any) => 100 * r.wins / Math.max(1, r.hunts), best = rows.slice().sort((a, b) => pct(b) - pct(a));
  log0(`== SCAN SWEEP (${n} contracts each, drop nearest the objective) | best ${best[0].p} ${Math.round(pct(best[0]))}%, worst ${best[best.length - 1].p} ${Math.round(pct(best[best.length - 1]))}% | the scripted lance can't read the intel (#92): this is the costs, not the benefit`);
}
let last = { failed: 0, complete: 0, lost: 0, n: 0 }; // R13: the latest contracts() summary (--both compares two)
// R13: this hunt's sound / emissions numbers (read right after the hunt ends)
function huntStats() {
  const P = G.firstLog.filter((f: any) => f.side === 'P'), E = G.firstLog.filter((f: any) => f.side === 'E');
  const firstOnLance = E.length ? Math.min(...E.map((f: any) => f.turn)) : 0;
  return { P, E, es: JSON.parse(JSON.stringify(G.emitStat)), firstOnLance,
    heardLance: G.lance.reduce((a: number, m: any) => a + (m.heardN || 0), 0), heardField: G.units.reduce((a: number, u: any) => a + (u.heardN || 0), 0),
    loudest: Math.max(0, ...G.lance.map((m: any) => m.loudest || 0)), sprints: G.lance.reduce((a: number, m: any) => a + (m.sprints || 0), 0),
    ids: (idTick(false), idSummary()), // R14: per field unit: read? narrowed? ID'd, right, before eyes
    mission: G.mission.type, mres: G.mission.result, ally: G.ally ? { hits: Math.max(0, G.ally.hits), max: G.ally.maxHits, dead: G.ally.dead, shotAt: G.shotLog.filter((r: any) => r.target === 'ALLY').length, heard: G.ally.heardN || 0 } : null, legs: G.mission.legs.slice(), pickTurn: G.mission.pickTurn || 0, handoffs: G.mission.handoffs, endTurn: G.turn, units: G.units.map((u: any) => ({ v: u.variant, dead: u.dead })), // R15
    scan: G.scanCost ? JSON.parse(JSON.stringify(G.scanCost)) : null, // R19
    found: G.lance.map((m: any) => G.firstLog.find((f: any) => f.side === 'E' && f.tgt === m.id && f.src !== 'GHOST') || null), // R18 (A12)
    rear: G.shotLog.filter((r: any) => r.hit && r.rear).length, hitsAll: G.shotLog.filter((r: any) => r.hit).length,
    grid: MAP.info.grid, rerolls: MAP.info.rerolls || 0, moves: { ...G.moveStat }, outcome: G.mode === 'hunt' ? 'STALL' : G.outcome, // R16
    alarms: G.alarmLog.length, allOn3, lost: G.lance.filter((m: any) => m.dead).length,
    pack: G.units.reduce((a: any, u: any) => { for (const k of ['HUNT', 'SEARCH', 'LEASH']) a[k] += (u.packN && u.packN[k]) || 0; return a; }, { HUNT: 0, SEARCH: 0, LEASH: 0 }) };
}
function soundReport(H: any[]) {
  const pc = (a: number, b: number) => b ? Math.round(100 * a / b) + '%' : '-';
  // R15: the flags below were calibrated on uplink hunts. A Bounty field is bigger and the lance goes looking for fights,
  // so Bounty hunts get an info line and stay out of the flags.
  const BH = H.filter(h => h.mission === 'BOUNTY');
  if (BH.length) { const F = BH.flatMap(h => h.E); console.log(`  SOUND field (Bounty hunts, info): first contacts ${F.length}, by sound ${F.filter((f: any) => f.src === 'SOUND').length} (${pc(F.filter((f: any) => f.src === 'SOUND').length, F.length)})`); }
  if (H.some(h => h.mission === 'UPLINK')) H = H.filter(h => h.mission === 'UPLINK');
  for (const [side, name] of [['P', 'lance'], ['E', 'field']]) {
    const F = H.flatMap(h => h[side]), snd = F.filter((f: any) => f.src === 'SOUND').length;
    const by: Record<string, number> = {}; for (const f of F) by[f.src] = (by[f.src] || 0) + 1;
    const es = H.reduce((a, h) => ({ n: a.n + h.es[side].n, sum: a.sum + h.es[side].sum }), { n: 0, sum: 0 });
    console.log(`  SOUND ${name}: first contacts ${F.length}, by sound ${snd} (${pc(snd, F.length)}) [` + Object.entries(by).sort().map(([k, v]) => `${k} ${v}`).join(', ') + `] | avg EMIT at activation ${(es.sum / Math.max(1, es.n)).toFixed(1)}`);
    if (F.length && !snd) console.log(`  FLAG: sound never made a first contact for the ${name}`);
    if (F.length && snd > F.length / 2) console.log(`  FLAG: sound is more than half of the ${name}'s first contacts (drowning out the sensors)`);
  }
  const avg = (k: string) => (H.reduce((a, h) => a + h[k], 0) / Math.max(1, H.length)).toFixed(1);
  const fol = H.filter(h => h.firstOnLance);
  if (TUNE.PACK_ENABLED) {
    const P = H.reduce((a, h) => ({ HUNT: a.HUNT + h.pack.HUNT, SEARCH: a.SEARCH + h.pack.SEARCH, LEASH: a.LEASH + h.pack.LEASH }), { HUNT: 0, SEARCH: 0, LEASH: 0 });
    const n = P.HUNT + P.SEARCH + P.LEASH, on3 = H.filter(h => h.allOn3).length;
    console.log(`  PACK per hunt: alarms ${(H.reduce((a, h) => a + h.alarms, 0) / Math.max(1, H.length)).toFixed(1)} | patrol activations HUNT ${pc(P.HUNT, n)}, SEARCH ${pc(P.SEARCH, n)}, LEASH ${pc(P.LEASH, n)} | whole field on the lance by round 3: ${on3}/${H.length} hunts (${pc(on3, H.length)})`);
    if (H.length && on3 / H.length >= 0.75) console.log('  FLAG: the whole field is on the lance by round 3 in most hunts (the alarm is too strong)');
  }
  console.log(`  SOUND per hunt: field heard the lance ${avg('heardLance')}×, lance heard the field ${avg('heardField')}×, lance sprints ${avg('sprints')}, loudest ${avg('loudest')} | first contact on the lance, avg round ${(fol.reduce((a, h) => a + h.firstOnLance, 0) / Math.max(1, fol.length)).toFixed(1)}`);
}

// R15: hunts split by mission type (win rate, average pay, rounds), then the Bounty checks.
function missionReport(R: any[], H: any[]) {
  const pc = (a: number, b: number) => b ? Math.round(100 * a / b) + '%' : '-';
  const types = [...new Set(R.map(r => r.mission))];
  for (const t of types) {
    const L = R.filter(r => r.mission === t), w = L.filter(r => r.outcome.startsWith('WIN')).length;
    const by: Record<string, number> = {}; for (const r of L) by[r.outcome] = (by[r.outcome] || 0) + 1;
    console.log(`  MISSION ${t.padEnd(7)} hunts ${L.length} | win ${w} (${pc(w, L.length)}) | avg pay ${(L.reduce((a, r) => a + r.pay, 0) / L.length).toFixed(0)} cr | avg rounds ${(L.reduce((a, r) => a + r.turns, 0) / L.length).toFixed(1)} | ` + Object.entries(by).sort().map(([k, v]) => `${k} ${v}`).join(', '));
  }
  const RH = H.filter(h => h.mission === 'RETRIEVE'); // R15 s2: info only (the brief sets no Retrieve flags)
  if (RH.length) {
    const P = RH.filter(h => h.pickTurn), out = RH.filter(h => h.mres === 'cargo out').length, lost = RH.filter(h => h.mres === 'cargo lost').length;
    console.log(`  RETRIEVE picked up ${P.length}/${RH.length} | carried out ${out}, cargo lost ${lost} | hand-offs ${RH.reduce((a, h) => a + h.handoffs, 0)} | avg rounds pickup → end ${P.length ? (P.reduce((a, h) => a + h.endTurn - h.pickTurn, 0) / P.length).toFixed(1) : '-'}`);
  }
  const EH = H.filter(h => h.mission === 'ESCORT'); // R15 s3: info only
  if (EH.length) {
    const A = EH.map(h => h.ally), shot = A.filter(a => a.shotAt > 0).length, legs: Record<string, number> = {};
    for (const h of EH) for (const l of h.legs) legs[l] = (legs[l] || 0) + 1;
    console.log(`  ESCORT transport shot at in ${shot}/${EH.length} hunts (avg ${(A.reduce((x, a) => x + a.shotAt, 0) / EH.length).toFixed(1)} shots), heard by the field in ${A.filter(a => a.heard).length} | destroyed ${A.filter(a => a.dead).length} | avg hits left ${(A.reduce((x, a) => x + a.hits, 0) / EH.length).toFixed(1)}/${A[0].max} | legs picked: ` + Object.entries(legs).sort().map(([k, v]) => `${k} ${v}`).join(', '));
  }
  const B = R.filter(r => r.mission === 'BOUNTY');
  if (!B.length) return;
  const met = B.filter(r => r.earned >= TUNE.BOUNTY_QUOTA).length;
  console.log(`  BOUNTY quota met ${met}/${B.length} (${pc(met, B.length)}) | avg earned ${(B.reduce((a, r) => a + r.earned, 0) / B.length).toFixed(0)} cr`);
  if (met / B.length < 0.2 || met / B.length > 0.9) console.log(`  FLAG: Bounty quota met in ${pc(met, B.length)} of Bounty hunts (outside 20–90%)`);
  const V: Record<string, { n: number; k: number }> = {};
  for (const h of H.filter(h => h.mission === 'BOUNTY')) for (const u of h.units) { const x = V[u.v] || (V[u.v] = { n: 0, k: 0 }); x.n++; if (u.dead) x.k++; }
  console.log('  BOUNTY killed when present: ' + Object.entries(V).sort().map(([k, x]) => `${k} ${x.k}/${x.n}`).join(', '));
  for (const [k, x] of Object.entries(V)) if (x.n >= 5 && (x.k / x.n > 0.9 || x.k / x.n < 0.05)) console.log(`  FLAG: ${k} killed in ${pc(x.k, x.n)} of the Bounty hunts it appears in (always or never worth it)`);
}

// R16: hunts split by grid size (win rate, average rounds), map rerolls, and how often the lance's moves crossed clutter.
function mapReport(H: any[]) {
  const pc = (a: number, b: number) => b ? Math.round(100 * a / b) + '%' : '-', win = (L: any[]) => L.filter(h => h.outcome.startsWith('WIN')).length;
  const all = win(H) / Math.max(1, H.length);
  const grids = [...new Set(H.map(h => h.grid))].sort();
  for (const g of grids) {
    const L = H.filter(h => h.grid === g), w = win(L);
    console.log(`  MAP ${g.padEnd(5)} hunts ${L.length} | win ${w} (${pc(w, L.length)}) | avg rounds ${(L.reduce((a, h) => a + h.endTurn, 0) / L.length).toFixed(1)}`);
    if (L.length >= 5 && Math.abs(w / L.length - all) > 0.3) console.log(`  FLAG: grid ${g} wins ${pc(w, L.length)}, more than 30 points from the overall ${pc(win(H), H.length)}`);
  }
  if (MAP.id === 'hive' && grids.length === 1 && grids[0] === 'hive') return;
  const rr = H.filter(h => h.rerolls > 0).length, mv = H.reduce((a, h) => a + h.moves.n, 0), mc = H.reduce((a, h) => a + h.moves.c, 0);
  console.log(`  MAP rerolls: ${rr}/${H.length} hunts needed one (${pc(rr, H.length)}) | lance moves into clutter ${mc}/${mv} (${pc(mc, mv)})`);
  const ni = H.reduce((a, h) => a + (h.moves.intr || []).length, 0), ki = H.filter(h => (h.moves.intr || []).length).length;
  console.log(`  MOVE (R17) interrupts ${ni} in ${ki}/${H.length} hunts (${pc(ki, H.length)}), ${(ni / Math.max(1, mv) * 100).toFixed(0)}% of lance moves | tap ${H.reduce((a, h) => a + (h.moves.tap || 0), 0)} drawn ${H.reduce((a, h) => a + (h.moves.drawn || 0), 0)} (the scripted lance only taps)`);
  const why: Record<string, number> = {}; for (const h of H) for (const t of h.moves.intr || []) { const k = t.split(' ').pop(); why[k] = (why[k] || 0) + 1; }
  console.log(`  MOVE (R17) interrupts by what showed it: ${Object.entries(why).map(([k, v]) => k + ' ' + v).join(', ') || 'none'}`);
  if (rr / Math.max(1, H.length) > 0.05) console.log(`  FLAG: unreachable rerolls in ${pc(rr, H.length)} of hunts (over 5%)`);
  if (mv && mc / mv < 0.05) console.log(`  FLAG: clutter crossed in only ${pc(mc, mv)} of lance moves (it's never on the way)`);
  if (mv && mc / mv > 0.6) console.log(`  FLAG: clutter crossed in ${pc(mc, mv)} of lance moves (it's everywhere)`);
}

// R14: reading the signature. Over every field unit the lance ever had a contact on.
function idReport(H: any[]) {
  const U = H.flatMap(h => h.ids).filter((u: any) => u.contacted || u.read), pc = (a: number, b: number) => b ? Math.round(100 * a / b) + '%' : '-';
  const read = U.filter((u: any) => u.read), one = read.filter((u: any) => u.firstN === 1), narrowed = read.filter((u: any) => u.single >= 0);
  const ids = U.filter((u: any) => u.id), right = ids.filter((u: any) => u.right), pre = ids.filter((u: any) => u.beforeEyes);
  const avgR = narrowed.length ? (narrowed.reduce((a: number, u: any) => a + u.single, 0) / narrowed.length).toFixed(1) : '-';
  console.log(`  ID: contacts ${U.length}, with a reading ${read.length} | ID'd before eyes ${pre.length}/${U.length} (${pc(pre.length, U.length)}) | right ${right.length}/${ids.length} (${pc(right.length, ids.length)}), wrong ${ids.length - right.length}`);
  console.log(`  ID: narrowed to one variant ${narrowed.length}/${read.length} (${pc(narrowed.length, read.length)}), from the first reading ${one.length} (${pc(one.length, read.length)}) | avg rounds from first reading to one variant ${avgR}`);
  if (read.length && one.length / read.length > 0.8) console.log('  FLAG: more than 80% of contacts narrow to one variant from the first reading (too easy)');
  if (read.length && narrowed.length / read.length < 0.2) console.log('  FLAG: fewer than 20% of contacts ever narrow to one variant (unreadable)');
}
// R12: to-hit and hit-location summary over every gun shot (both sides)
function hitReport(shots: any[], parts: any[]) {
  const pc = (L: any[]) => L.length ? `${L.filter(r => r.hit).length}/${L.length} (${Math.round(100 * L.filter(r => r.hit).length / L.length)}%)` : 'none';
  const avg = (L: any[]) => L.length ? (L.reduce((a, r) => a + r.pct, 0) / L.length).toFixed(0) + '%' : '-';
  const P = shots.filter(r => r.mech), E = shots.filter(r => !r.mech);
  console.log(`  HIT overall ${pc(shots)}, avg shown ${avg(shots)} | lance ${pc(P)} | field ${pc(E)}`);
  console.log(`  HIT cover ${pc(shots.filter(r => r.cover))} vs open ${pc(shots.filter(r => !r.cover))}`);
  console.log(`  HIT (R17) into clutter (low) cover ${pc(shots.filter(r => r.coverKind === 'LOW'))}, avg shown ${avg(shots.filter(r => r.coverKind === 'LOW'))} | into wall cover ${pc(shots.filter(r => r.coverKind === 'WALL'))}, avg shown ${avg(shots.filter(r => r.coverKind === 'WALL'))}`);
  const statics = (r: any) => r.ttype === 'TURRET' || r.ttype === 'EMPLACEMENT';
  console.log(`  HIT target moved ${pc(shots.filter(r => r.movedT > 0))} vs still ${pc(shots.filter(r => !(r.movedT > 0) && !statics(r)))} vs static ${pc(shots.filter(statics))}`);
  console.log(`  HIT range ≤4 ${pc(shots.filter(r => r.rangeT <= 4))} · 5–8 ${pc(shots.filter(r => r.rangeT > 4 && r.rangeT <= 8))} · 9–12 ${pc(shots.filter(r => r.rangeT > 8))}`);
  console.log(`  HIT sig bonus applied ${shots.filter(r => r.sig > 0).length}/${shots.length}, at clamp min ${shots.filter(r => r.pct <= TUNE.HIT_MIN).length}, max ${shots.filter(r => r.pct >= TUNE.HIT_MAX).length}`);
  const pk: Record<string, number> = {};
  for (const x of parts) { const k = x.kind + ' ' + x.part; pk[k] = (pk[k] || 0) + 1; }
  console.log('  PARTS destroyed: ' + (Object.entries(pk).sort().map(([k, v]) => `${k} ${v}`).join(', ') || 'none'));
  const all = shots.length ? shots.filter(r => r.hit).length / shots.length : 0;
  if (all < 0.4 || all > 0.75) console.log(`  FLAG: overall hit % ${Math.round(all * 100)} outside 40–75`);
  for (const [k, f] of [['cover', (r: any) => r.cover], ['moved', (r: any) => r.moved], ['range', (r: any) => r.range], ['sig', (r: any) => r.sig]] as any) if (!shots.some(f)) console.log(`  FLAG: factor ${k} never applied`);
}

// R14: a test-bed scenario, RUNS times (seed, seed+1, ...). The scripted player as always: walk to the uplink, shoot what locks.
function scenarioRuns(name: string, n: number) {
  const s0 = scenarioByName(name);
  if (!s0) { console.log('unknown scenario "' + name + '". Known: ' + SCENARIOS.map(s => s.name).join(', ')); (globalThis as any).process.exitCode = 1; return; }
  const res: any[] = [];
  for (let i = 0; i < n; i++) {
    startScenario({ ...s0, seed: s0.seed + i });
    allOn3 = false;
    autoPlayOut(MAX_TURNS, (t, who) => { if (VERBOSE) verboseLine(t, who); });
    const h = huntStats();
    res.push({ seed: s0.seed + i, mt: G.lance.reduce((a: number, m: any) => a + m.mShots, 0), mh: G.lance.reduce((a: number, m: any) => a + m.mHits, 0), outcome: G.mode === 'hunt' ? 'STALL' : G.outcome, turns: G.turn, kills: G.kills, n: G.units.length, ...h });
    leaveScenario();
  }
  const by: Record<string, number> = {}; for (const r of res) by[r.outcome] = (by[r.outcome] || 0) + 1;
  const avg = (k: string) => (res.reduce((a, r) => a + r[k], 0) / Math.max(1, res.length)).toFixed(1);
  console.log(`== SCENARIO ${s0.name} (R${s0.round}) x${n}${AUTO.loud ? ' --loud' : AUTO.quiet ? ' --quiet' : ''}: ` + Object.entries(by).map(([k, v]) => `${k} ${v}`).join(' | '));
  console.log(`  avg rounds ${avg('turns')} · kills ${avg('kills')}/${res[0].n} · mechs lost ${avg('lost')} · field heard the lance ${avg('heardLance')}x · alarms ${avg('alarms')} · first contact on the lance R${avg('firstOnLance')} · sprints ${avg('sprints')}`);
  const src: Record<string, number> = {}; // the sense behind each hunt's first field contact on the lance
  for (const r of res) { const f = r.E.slice().sort((a: any, b: any) => a.turn - b.turn)[0]; if (f) src[f.src] = (src[f.src] || 0) + 1; }
  const I = res.flatMap(r => r.ids), idd = I.filter((u: any) => u.id);
  console.log(`  ID: units read ${I.filter((u: any) => u.read).length}/${I.length}, narrowed to one ${I.filter((u: any) => u.single >= 0).length}, ID'd ${idd.length} (right ${idd.filter((u: any) => u.right).length}, before eyes ${idd.filter((u: any) => u.beforeEyes).length}) | mortar ${res.reduce((a, r) => a + r.mt, 0)} shots, ${res.reduce((a, r) => a + r.mh, 0)} hits`);
  console.log('  field found the lance first by: ' + (Object.entries(src).map(([k, v]) => `${k} ${v}`).join(', ') || 'never'));
  if (res.some(r => r.outcome === 'STALL')) console.log('  WARNING: stalls ' + res.filter(r => r.outcome === 'STALL').map(r => 'seed ' + r.seed).join(', '));
  if (VERBOSE) for (const r of res) console.log(`    seed ${r.seed}: ${r.outcome} in ${r.turns} rounds, kills ${r.kills}, lost ${r.lost}, alarms ${r.alarms}`);
}

if (SCEN) {
  scenarioRuns(SCEN, RUNS);
} else if (arg('--company', 0) > 0) {
  if (arg('--companies', 1) > 1) companies(arg('--company', 0), arg('--companies', 1)); else companyRun(arg('--company', 0));
} else if (CONTRACTS > 0 && BOTH) {
  log0('######## NORMAL'); AUTO.loud = false; contracts(CONTRACTS); const a = last;
  log0('######## --loud'); AUTO.loud = true; contracts(CONTRACTS); const b = last;
  console.log(`== NORMAL vs LOUD: failed ${a.failed} vs ${b.failed} | complete ${a.complete} vs ${b.complete} | mechs lost ${a.lost} vs ${b.lost}`);
  if (b.lost < a.lost * 1.15 && b.failed < a.failed + 2) console.log('  FLAG: --loud does not lose noticeably more than normal (getting loud still carries no risk)');
} else if (arg('--scansweep', 0) > 0) {
  scanSweep(arg('--scansweep', 0));
} else if (arg('--listensweep', 0) > 0) {
  listenSweep(arg('--listensweep', 0));
} else if (arg('--sweep', 0) > 0) {
  sweep(arg('--sweep', 0));
} else if (CONTRACTS > 0) {
  contracts(CONTRACTS);
} else if (ONE >= 0) {
  const r = playGame(ONE, COMP || undefined); console.log(JSON.stringify(r)); report(r.comp + ' seed ' + ONE, [r]);
} else {
  const comps = COMP ? [COMP] : TUNE.FIELD_COMPOSITIONS.map((c: any) => c.NAME);
  const seeds = Array.from({ length: GAMES }, (_, i) => i + 1);
  const all: any[] = [];
  for (const c of comps) { const res = seeds.map(s => playGame(s, c)); all.push(...res); report(res[0].comp, res); }
  if (comps.length > 1) {
    const by: Record<string, number> = {};
    for (const r of all) by[r.outcome] = (by[r.outcome] || 0) + 1;
    console.log(`== ALL: games ${all.length} | ` + Object.entries(by).map(([k, v]) => `${k} ${v}`).join(' | '));
  }
}
if (argv.includes('--check')) {
  if (FLAGS.length) { log0(`CHECK FAILED: ${FLAGS.length} flag(s)`); (globalThis as any).process.exitCode = 1; }
  else log0('CHECK OK: no flags');
}
