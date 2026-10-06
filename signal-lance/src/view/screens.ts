import { TUNE } from '../tune.ts';
import { G, newHunt, enterLoadout } from '../sim/state.ts';
import { newContract, previewJob, takeJob, rollJobs, rerollJobs, dmgWord, lanceText, contractActive, refit, refitBlock, refitCap, buysText } from '../sim/contract.ts';
import { V } from './state.ts';
import { $, fmtTime } from './hud.ts';
import { partsRead, shotsText } from '../sim/combat.ts';
import { moveText } from '../sim/turns.ts';
import { soundText } from '../sim/sound.ts';
import { idText } from '../sim/ids.ts';
import { setPack } from '../sim/pack.ts';
import { buildBrief, buildQuestions, resetAnswers, answersText } from './brief.ts';
import { MISSION_INFO, missionText, isType, escortBonus } from '../sim/mission.ts';
import { anchors, MAP, W, H } from '../sim/world.ts';
import { mapText } from '../sim/blocks.ts';
import { fieldCount } from '../sim/state.ts';

// bump on every publish: a new build clears the run log
export const BUILD = 'r17-s5';  // R17 wrap: Round 17 on the splash round history. s4: facing is free (AP_TURN 0). s3: tap the path, then tap where to look (a draggable look marker). s2: freehand drawn paths, end handle / redraw from a point, LOOK menu for facing (s1: drawn paths, waypoints, interrupt, low cover)
declare const __BUILT__: string;
// Version tag shown on screen: build label + build time (Vancouver). Changes on every build.
export const VERSION = BUILD + ' · ' + (typeof __BUILT__ === 'string' ? __BUILT__ : 'dev');
// ============================ LOADOUT / RESULT / RUN LOG ==============
export const MODS = [
  { k: 'armour',  name: 'Armour plate',  slots: 2, max: 5,  desc: '+3 hits · +1 signature' },
  { k: 'radar',   name: 'Active radar',  slots: 2, max: 1,  desc: 'pulse ' + TUNE.AP_RADAR + ' AP + ' + TUNE.RADAR_EN + ' EN · cone, sees through 4 walls · +' + TUNE.SIGNAL_RADAR + ' EMIT' },
  { k: 'passive', name: 'Passive suite', slots: 2, max: 1,  desc: 'bearing lines · cross two for a fix' },
  { k: 'ecm',     name: 'ECM pod',       slots: 2, max: 1,  desc: 'mask (' + TUNE.AP_ECM + ' AP + ' + TUNE.ECM_EN + ' EN a turn) or ghost · jams' },
  { k: 'ammo',    name: 'Autocannon',    slots: 1, max: 10, desc: '10 rounds per slot · a shot is heard ' + TUNE.SOUND_RANGE.SHOT + ' tiles away' },
  { k: 'cells',   name: 'Energy cell',   slots: 1, max: 10, desc: '+' + TUNE.ENERGY_CELL + ' Energy' },
  { k: 'mortar',  name: 'Mortar',        slots: 1, max: 1,  desc: TUNE.MORTAR_SHELLS + ' shells · ' + TUNE.AP_MORTAR + ' AP · fires on a fix, no LoS · heard ' + TUNE.SOUND_RANGE.MORTAR + ' tiles away' }, // R9
];
// localStorage wrapped: falls back to memory if unavailable
export const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (_) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) {} },
};
let LOG = store.get('signalLance.log', []);
if (!Array.isArray(LOG) || store.get('signalLance.build', '') !== BUILD) { LOG = []; store.set('signalLance.ctN', 0); store.set('signalLance.log', LOG); store.set('signalLance.compBag', []); store.set('signalLance.build', BUILD); } // R10: a new build also starts a fresh shuffled set
// R6: the loadout being edited lives here (view); LAUNCH hands copies to the sim.
// R7 s2: one loadout per mech. A is the old saved loadout; B starts as a copy of A.
const DEF = { armour: 1, radar: 0, passive: 1, ecm: 1, ammo: 2, cells: 0, mortar: 0 };
function readLoad(key) {
  const l = store.get(key, null); if (!l) return null;
  const out = { ...DEF };
  for (const m of MODS) if (typeof l[m.k] === 'number') out[m.k] = Math.max(0, Math.min(m.max, l[m.k] | 0));
  return slotsUsed(out) > TUNE.SLOTS ? { ...DEF } : out;
}
const loads = [readLoad('signalLance.load') || { ...DEF }, null];
loads[1] = readLoad('signalLance.loadB') || { ...loads[0] };
let cur = 0, load = loads[0]; // the mech being edited (0 = A, 1 = B)
const LOAD_KEYS = ['signalLance.load', 'signalLance.loadB'];
export function currentLoads() { return [{ ...loads[0] }, { ...loads[1] }]; }
function pickMech(i) { cur = i; load = loads[i]; renderLoadout(); }
// R7 briefing: accurate, rough composition of the field. The turret is only "reported".
// R8 shuffled set (Jamie): every composition once per cycle, random order. Bag kept in localStorage so a
// reload carries on the same cycle. FIELD_SHUFFLE 0 = no bag (the sim's seeded weighted roll).
function nextComp() {
  if (!TUNE.FIELD_SHUFFLE) return undefined;
  let names = TUNE.FIELD_COMPOSITIONS.map(c => c.NAME);
  const pool = (TUNE.FIELD_PLAYTEST_POOL || []).filter(n => names.includes(n)); // R9 playtest setting
  if (pool.length) names = pool;
  let bag = store.get('signalLance.compBag', []);
  if (!Array.isArray(bag)) bag = [];
  bag = bag.filter(n => names.includes(n));
  if (!bag.length) {
    bag = names.slice();
    for (let i = bag.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [bag[i], bag[j]] = [bag[j], bag[i]]; }
  }
  const pick = bag.shift();
  store.set('signalLance.compBag', bag);
  return pick;
}
export function intelText() {
  const parts = [];
  const C = G.comp;
  for (const k of Object.keys(TUNE.FIELD_TYPES)) {
    const n = fieldCount(C, k), F = TUNE.FIELD_TYPES[k]; // R16: scaled with the district's size
    if (!n || k === 'TURRET') continue;
    parts.push(n + ' ' + (n > 1 ? F.PLURAL : F.NAME));
  }
  const t = fieldCount(C, 'TURRET');
  const tur = t ? 'reports of ' + (t > 1 ? t + ' hidden ' + TUNE.FIELD_TYPES.TURRET.PLURAL : 'a hidden ' + TUNE.FIELD_TYPES.TURRET.NAME) : '';
  // R15: the mission type and its goal come first, so you know the job before you take it
  const M = MISSION_INFO[G.mtype], bounty = G.mtype === 'BOUNTY';
  const job = M.name + ': ' + M.goal + (bounty ? ' Quota ' + TUNE.BOUNTY_QUOTA + ' cr. Bigger field: ' + TUNE.BOUNTY_FIELD_EXTRA + ' more units on top of the INTEL.' : '');
  const site = bounty ? (C.staticPlacement === 'uplink' && (C.TURRET || C.EMPLACEMENT) ? ' Dug in around ' + G.up.name + '.' : '')
    : G.mtype === 'ESCORT' ? ' Waiting along the route. Forks at ' + anchors().junctions.map(k => anchors().waypoints[k].name).join(' and ') + '.' // R15 s3
    : (G.mtype === 'RETRIEVE' ? ' Cargo at ' : ' Uplink at ') + G.up.name + '.';
  const dist = MAP.id === 'hive' ? 'The old hive map. ' : MAP.info.grid.replace('x', '×') + ' district, ' + W + '×' + H + '. '; // R16: a bigger map is something you prep for
  return job + '\nINTEL: ' + dist + C.NAME + '. ' + cap([...parts, tur].filter(Boolean).join(', ')) + '.' + site + zoneIntel(); // R8: names the composition
}
// R10: " Quiet ground: rail cut (NW). Noise: sump (S), SE apron."
function zoneIntel() {
  let s = '';
  for (const k of ['QUIET', 'NOISE']) { const zs = G.zones.filter(z => z.type === k); if (zs.length) s += ' ' + TUNE.ZONE_TYPES[k].NAME + ': ' + zs.map(z => z.name).join(', ') + '.'; }
  return s;
}
// R10: "zones Q1 N2 · 2/2 statics zoned"
export function zoneText() {
  const q = G.zones.filter(z => z.type === 'QUIET').length, n = G.zones.length - q;
  const st = G.units.filter(u => !u.mobile), zd = st.filter(u => u.zoned).length;
  return ' · zones Q' + q + ' N' + n + (st.length ? ' · ' + zd + '/' + st.length + ' statics zoned' : '');
}
export function enemySummary() { return 'field ' + G.units.map(u => u.type[0] + (u.dead ? 'x' : '')).join(''); }
function cap(t) { return t.charAt(0).toUpperCase() + t.slice(1); }
export function killText() { return 'kills ' + G.kills + '/' + G.units.length + (missionText() ? ' · ' + missionText() : '') + zoneText() + mortarText() + shotsText() + soundText() + moveText() + idText(); } // R14: IDs n (right, wrong, before eyes) // R13: loudest, sprints, heard (+ alarms) // R12: shots/hits, parts lost
// R9: "· mortar 3/5 hits, 2 kills (A)" — shells that hit the field / shells fired, kills, who carried it
export function mortarText() {
  const ms = G.lance.filter(m => m.load.mortar);
  if (!ms.length) return ' · mortar none';
  let s = 0, h = 0, k = 0, f = 0, b = 0; for (const m of ms) { s += m.mShots; h += m.mHits; k += m.mKills; f += m.mFriendly; b += m.mBlind; }
  return ' · mortar ' + h + '/' + s + ' hits, ' + k + ' kills' + (b ? ', ' + b + ' blind' : '') + (f ? ', ' + f + ' on own' : '') + ' (' + (ms.length > 1 ? 'both' : ms[0].id) + ')';
}
export function slotsUsed(L = load) { let s = 0; for (const m of MODS) s += L[m.k] * m.slots; return s; }
function oneLoad(L) {
  return 'Arm' + L.armour + (L.radar ? ' Rdr' : '') + (L.passive ? ' Pas' : '') + (L.ecm ? ' ECM' : '') +
    ' Ammo' + L.ammo * TUNE.AMMO_PER_SLOT + ' Cell' + L.cells + (L.mortar ? ' Mtr' : '') + ' (' + slotsUsed(L) + '/' + TUNE.SLOTS + ')';
}
// both mechs' loadouts, as launched
export function loadSummary() { return G.lance.map(m => m.id + ': ' + oneLoad(m.load)).join(' / '); }
export function buildLoadout() {
  const box = $('mods');
  for (const m of MODS) {
    const row = document.createElement('div'); row.className = 'mrow';
    row.innerHTML = '<button class="pm" data-k="' + m.k + '" data-d="-1">−</button>' +
      '<div class="mname"><b>' + m.name + '</b> <span id="n_' + m.k + '"></span><small>' + m.slots + ' slot' + (m.slots > 1 ? 's' : '') + ' · ' + m.desc + '</small></div>' +
      '<button class="pm" data-k="' + m.k + '" data-d="1">+</button>';
    box.appendChild(row);
  }
  box.addEventListener('click', ev => {
    const b = (ev.target as any).closest('.pm'); if (!b) return;
    const m = MODS.find(x => x.k === b.dataset.k), d = +b.dataset.d, n = load[m.k] + d;
    if (n < 0 || n > m.max || (d > 0 && slotsUsed() + m.slots > TUNE.SLOTS)) return;
    load[m.k] = n; store.set(LOAD_KEYS[cur], load); renderLoadout();
  });
  $('bLA').addEventListener('click', () => pickMech(0));
  $('bLB').addEventListener('click', () => pickMech(1));
}
export function renderLoadout() {
  for (const m of MODS) $('n_' + m.k).textContent = m.k === 'ammo' ? '×' + load.ammo + ' (' + load.ammo * TUNE.AMMO_PER_SLOT + ' rds)' : '×' + load[m.k];
  const u = slotsUsed();
  $('bLA').classList.toggle('on', cur === 0); $('bLB').classList.toggle('on', cur === 1);
  $('slots').textContent = 'MECH ' + 'AB'[cur] + '  SLOTS ' + u + ' / ' + TUNE.SLOTS + '  (' + (TUNE.SLOTS - u) + ' free)';
  $('logv').textContent = LOG.length ? LOG.slice(-5).join('\n') : 'No runs logged yet.';
  $('logta').hidden = true;
}
function showIntel() {
  $('intel').textContent = 'CONTRACT: ' + ctHunts() + (ctHunts() > 1 ? ' hunts, win ' + Math.min(TUNE.CONTRACT_WINS_NEEDED, ctHunts()) : ' hunt (quick test)') + '. Loadouts lock for the whole contract. Damage, rounds, shells and lost mechs carry over. Jobs are briefed after you start.';
}
export function showLoadout() {
  enterLoadout((Math.random() * 4294967296) >>> 0); // R11: sets loadout mode; the jobs are rolled once the contract starts
  $('res').hidden = $('jobs').hidden = $('cres').hidden = true; $('load').hidden = false;
  showIntel();
  renderLoadout();
}
// Result screen (hooks.end: the sim has already set G.mode = 'result' and G.outcome).
export function showResult() {
  const outcome = G.outcome.split(' ')[0];
  const M = G.mission, bounty = isType('BOUNTY'); // R15
  const why = bounty ? { WIN: 'Bounty quota met: ' + M.earned + ' / ' + M.quota + ' cr.', LOSS: 'You were destroyed.', BAIL: 'Extracted under quota. Kept ' + M.earned + ' cr, no win.' }[outcome]
    : { WIN: G.winBy === 'UPLINK' ? 'Uplink complete at ' + G.up.name + '.' : G.winBy === 'RETRIEVE' ? 'Cargo carried out by ' + G.mission.carrier + '.' : G.winBy === 'ESCORT' ? 'The transport made it out with ' + G.ally.hits + '/' + G.ally.maxHits + ' hits (bonus ' + escortBonus() + ' cr).' : 'Field cleared.', LOSS: 'You were destroyed.', BAIL: 'You extracted without the job done.',
        FAIL: isType('ESCORT') ? 'The transport was destroyed. The hunt failed.' : 'The carrier (' + G.mission.carrier + ') was destroyed. The cargo is lost; the hunt failed.' }[outcome];
  $('resTxt').textContent = ctTag() + G.outcome + ' · ' + G.comp.NAME + ' · ' + killText() + ' — ' + fmtTime(G.time) + ' (' + G.turn + ' turns)';
  $('resWhy').innerHTML = why + '<br>' + (missionText() || 'Uplink ' + G.up.prog + '/' + TUNE.UPLINK_TURNS + ' at ' + G.up.name) + '<br>' + dmgSummary() + '<br>Field: ' + fieldSummary() + '<br>Loadout: ' + loadSummary() + (G.ct ? '<br><b>Lance: ' + lanceText() + '</b> · contract wins ' + G.ct.wins + '/' + G.ct.need + (G.ct.status !== 'ACTIVE' ? ' · CONTRACT ' + G.ct.status : '') : '');
  $('note').value = ''; resetAnswers();
  $('res').hidden = false; $('res').scrollTop = 0;
}
export function dmgSummary() {
  let fs = 0, fl = 0; for (const u of G.units) { fs += u.shots; fl += u.landed; }
  return G.lance.map(m => m.id + ' ' + m.landed + '/' + m.shots + ' hit, ' + (m.dead ? 'destroyed' : partsRead(m))).join('; ') + // R12: parts
         '; Field ' + fl + '/' + fs + ' hit';
}
// per unit: type, destroyed or hits left, and how often it fired
export function fieldSummary() {
  return G.units.map(u => u.ft.NAME + (u.zoned ? ' [' + u.zoned.toLowerCase() + ']' : '') + ' ' + (u.dead ? 'destroyed' : '(' + partsRead(u) + ')') + (u.shots ? ' fired ' + u.shots : '')).join(', ');
}
export function pad2(n) { return (n < 10 ? '0' : '') + n; }
export function saveAndNext() {
  const d = new Date();
  const stamp = d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()) + ' ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes());
  const note = $('note').value.replace(/[\r\n|]+/g, ' ').replace(/\s+/g, ' ').trim();
  const ans = answersText();
  LOG.push(stamp + ' | ' + testerTag() + loadSummary() + ' | vs ' + enemySummary() + ' | ' + ctTag() + G.outcome + ' · ' + G.comp.NAME + ' · ' + mapText(G.zones.length) + ' · ' + killText() + (G.ct ? ' · ' + lanceText() + huntCr() : '') + (isType('UPLINK') ? ' uplink ' + G.up.prog + '/' + TUNE.UPLINK_TURNS + ' @' + G.up.name : '') + ' | ' + fmtTime(G.time) + ' turns ' + G.turn + ' | ' + dmgSummary() + ' | ' + (ans ? ans + ' | ' : '') + note);
  if (G.ct && G.ct.status !== 'ACTIVE') LOG.push(stamp + ' | ' + testerTag() + contractLine());
  store.set('signalLance.log', LOG);
  $('note').blur();
  if (contractActive()) { rollJobs(); showJobs(); } else if (G.ct) showContractResult(); else showLoadout();
}
// ============================ R11: CONTRACT SCREENS ====================
let ctN = store.get('signalLance.ctN', 0) | 0; // contract number for the log (C3)
// " · +140 cr (bought A repair×2)" for this hunt's log line
function huntCr() { const r = G.ct.results[G.ct.results.length - 1]; return r ? ' · +' + r.pay + ' cr' + (r.buys.length ? ' (bought ' + buysText(r.buys) + ')' : '') : ''; }
function testerTag() { const t = store.get('signalLance.tester', ''); return (t ? '[' + t + '] ' : '') + (TUNE.PACK_ENABLED ? '[PACK] ' : '') + (TUNE.MAP_MODE === 'hive' ? '[HIVE] ' : ''); } // R13: pack runs are tagged (R16: so are old-map runs)
function ctTag() { return G.ct ? 'C' + ctN + ' H' + G.ct.hunt + '/' + G.ct.hunts + (G.ct.rerolls ? ' [DBG jobs rerolled ×' + G.ct.rerolls + ']' : '') + ' · ' : ''; }
// "C3 COMPLETE 2/3 · lost B in H2"
function contractLine() {
  const C = G.ct, lost = C.results.flatMap(r => r.lost.map(id => id + ' in H' + r.n));
  return 'C' + ctN + ' ' + C.status + ' ' + C.wins + '/' + C.results.length + (lost.length ? ' · lost ' + lost.join(', ') : ' · no mechs lost') + ' · ' + C.results.map(r => r.mission + ' ' + r.comp).join(' > ') + ' · cr earned ' + C.earned + ' spent ' + C.spent;
}
function startContract() {
  ctN++; store.set('signalLance.ctN', ctN);
  newContract((Math.random() * 4294967296) >>> 0, currentLoads(), ctHunts());
  showJobs();
}
function mechLine(id) {
  const c = G.ct.carry[id], L = G.ct.loads[id === 'A' ? 0 : 1];
  if (c.dead) return '<b class="lost">' + id + '  LOST</b>';
  return '<b>' + id + '  ' + dmgWord(c) + '</b> · ' + partsRead(c) + (L.ammo ? ' · ' + c.ammo + ' rds' : '') + (L.mortar ? ' · ' + c.shells + ' shells' : '');
}
// R11 s2: refit buttons for one mech (hidden before hunt 1: nothing to cap from, no credits)
const RF = [['repair', 'REPAIR WORST', TUNE.COST_REPAIR], ['rounds', '+10 RDS', TUNE.COST_ROUNDS], ['shell', '+1 SHELL', TUNE.COST_SHELL], ['rebuild', 'REBUILD', TUNE.COST_REBUILD]];
function refitRow(id) {
  const cap = refitCap(id); if (!cap) return '';
  const why = { CR: 'need cr', CAP: 'at max', LOST: '', NONE: '' };
  let h = '';
  for (const [k, name, cost] of RF) {
    const b = refitBlock(id, k); if (b === 'NONE' || b === 'LOST') continue;
    h += '<button class="rf' + (b ? ' lockd' : '') + '" data-id="' + id + '" data-k="' + k + '">' + name + '<br><small>' + cost + ' cr' + (b ? ' · ' + why[b] : '') + '</small></button>';
  }
  const capTxt = G.ct.carry[id].dead ? 'rebuilds to ' + cap.hits + ' hits' : 'max ' + cap.hits + ' hits' + (G.ct.loads[id === 'A' ? 0 : 1].ammo ? ' · ' + cap.ammo + ' rds' : '') + (G.ct.loads[id === 'A' ? 0 : 1].mortar ? ' · ' + cap.shells + ' shells' : '');
  return '<div class="rfrow">' + h + '<small class="cap">' + capTxt + '</small></div>';
}
function renderLance() {
  const C = G.ct;
  $('jhead').textContent = 'HUNT ' + C.hunt + '/' + C.hunts + ' · wins ' + C.wins + ' (need ' + C.need + ') · ' + C.credits + ' cr';
  $('jlance').innerHTML = ['A', 'B'].map(id => '<div>' + mechLine(id) + refitRow(id) + '</div>').join('') +
    (C.hunt > 1 ? '<small class="cap">Refit caps at ' + Math.round(TUNE.REFIT_CAP * 100) + '% of what each mech started its last hunt with.</small>' : '');
}
export function showJobs() {
  const C = G.ct;
  $('load').hidden = $('res').hidden = $('cres').hidden = true;
  renderLance();
  const esc = (t: string) => t.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  for (let i = 0; i < 2; i++) { previewJob(i); const [job, intel] = intelText().split('\n'); $('j' + i).innerHTML = '<b style="color:#fc3">' + esc(job) + '</b><br>' + esc(intel); } // R15: the job type on top
  $('jobs').hidden = false; $('jobs').scrollTop = 0;
}
function pickJob(i) {
  $('jobs').hidden = true;
  takeJob(i);
  V.follow = true; V.camX = G.p.x; V.camY = G.p.y; V.ghostArm = V.faceArm = V.mortarArm = false; V.hitFlash = 0;
}
function showContractResult() {
  const C = G.ct;
  $('res').hidden = $('jobs').hidden = true;
  $('cTitle').textContent = 'CONTRACT ' + C.status;
  $('cSub').textContent = 'C' + ctN + ' · won ' + C.wins + ' of ' + C.results.length + ' hunts (need ' + C.need + ')' + (C.results.length < C.hunts ? ' · lance destroyed in hunt ' + C.results.length : '') + ' · credits earned ' + C.earned + ', spent ' + C.spent;
  $('cHunts').innerHTML = C.results.map(r => '<div class="hunt"><b>Hunt ' + r.n + ' · job ' + r.job + ' · ' + r.mission + '</b>' + r.comp + ' @ ' + r.up + '<br><b>' + r.outcome + '</b> · kills ' + r.kills + '/' + r.total +
    '<br>Mechs lost: ' + (r.lost.length ? r.lost.join(', ') : 'none') + '<br>Carried out: ' + r.out.join(', ') + '<br>Paid ' + r.pay + ' cr' + (r.buys.length ? '<br>Bought before: ' + buysText(r.buys) : '') + '</div>').join('');
  $('cres').hidden = false; $('cres').scrollTop = 0;
}
// R14: one extra log line (the test bed's), stamped and tagged like a hunt's.
export function logLine(text: string) { const d = new Date(); LOG.push(d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()) + ' ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes()) + ' | ' + testerTag() + text); store.set('signalLance.log', LOG); }
// Header so a pasted log says who sent it and which build.
function logText() { return 'Signal Lance ' + VERSION + ' · tester: ' + (store.get('signalLance.tester', '') || '?') + '\n' + (LOG.join('\n') || '(empty log)'); }
// SEND LOG (chore): the phone's share sheet (text, email…); falls back to COPY LOG.
function sendLog() {
  const text = logText(), nav: any = navigator;
  if (nav.share) nav.share({ title: 'Signal Lance log', text }).catch(e => { if (e && e.name !== 'AbortError') copyLog(); });
  else copyLog();
}
export function copyLog() {
  const text = logText();
  const fallback = () => { const ta = $('logta'); ta.hidden = false; ta.value = text; ta.focus(); ta.select(); $('bCopy').textContent = 'SELECTED – COPY IT'; };
  try {
    navigator.clipboard.writeText(text).then(() => { $('bCopy').textContent = 'COPIED ' + LOG.length + ' LINES'; }, fallback);
  } catch (_) { fallback(); }
  setTimeout(() => { $('bCopy').textContent = 'COPY LOG'; }, 2500);
}
// Start a hunt with the current loadout, and reset the view (camera on the player, nothing armed).
export function launch() {
  newHunt(currentLoads());
  V.follow = true; V.camX = G.p.x; V.camY = G.p.y; V.ghostArm = V.faceArm = false; V.hitFlash = 0;
  $('res').hidden = true;
}
$('bLaunch').addEventListener('click', () => { $('load').hidden = true; store.set(LOAD_KEYS[0], loads[0]); store.set(LOAD_KEYS[1], loads[1]); startContract(); }); // R11: locks loadouts, opens the job pick
$('bJ0').addEventListener('click', () => pickJob(0));
$('jlance').addEventListener('click', ev => { const b = (ev.target as any).closest('.rf'); if (!b) return; if (refit(b.dataset.id, b.dataset.k)) renderLance(); }); // R11 s2
$('bJ1').addEventListener('click', () => pickJob(1));
$('bReroll').addEventListener('click', () => { rerollJobs(); showJobs(); }); // R16 debug: fish for a mission type
$('bNewC').addEventListener('click', () => { G.ct = null; showLoadout(); });
$('bSave').addEventListener('click', saveAndNext);
$('note').addEventListener('keydown', e => { if (e.key === 'Enter') saveAndNext(); });
$('bCopy').addEventListener('click', copyLog);
$('bSend').addEventListener('click', sendLog);
$('bSend2').addEventListener('click', sendLog);
// Tester splash (every page load) and basics screen
let basicsFrom = 'splash';
$('tester').value = store.get('signalLance.tester', '');
// Quick test: a 1-hunt contract instead of the full CONTRACT_HUNTS (remembered; the log shows it as H1/1)
function ctHunts() { return store.get('signalLance.quick', false) ? 1 : TUNE.CONTRACT_HUNTS; }
function showQuick() { $('bQuick').textContent = 'LENGTH: ' + (ctHunts() === 1 ? '1 HUNT (QUICK)' : ctHunts() + ' HUNTS'); $('bQuick').classList.toggle('on', ctHunts() === 1); }
showQuick();
$('bQuick').addEventListener('click', () => { store.set('signalLance.quick', ctHunts() !== 1); showQuick(); showIntel(); });
// R13 s2: the pack toggle (remembered; tags the log). OFF first: play Sound vs Emissions on its own, then turn it on.
function showPack() { $('bPack').textContent = 'THE PACK: ' + (TUNE.PACK_ENABLED ? 'ON' : 'OFF'); $('bPack').classList.toggle('on', TUNE.PACK_ENABLED); }
setPack(!!store.get('signalLance.pack', false)); showPack();
$('bPack').addEventListener('click', () => { setPack(!TUNE.PACK_ENABLED); store.set('signalLance.pack', TUNE.PACK_ENABLED); showPack(); });
// R16: the map toggle (remembered; tags the log). NEW DISTRICTS by default; OLD HIVE is the R15 map, for comparison.
function showMap() { $('bMap').textContent = 'MAP: ' + (TUNE.MAP_MODE === 'hive' ? 'OLD HIVE' : 'NEW DISTRICTS'); $('bMap').classList.toggle('on', TUNE.MAP_MODE !== 'hive'); }
TUNE.MAP_MODE = store.get('signalLance.map', 'blocks') === 'hive' ? 'hive' : 'blocks'; showMap();
$('bMap').addEventListener('click', () => { TUNE.MAP_MODE = TUNE.MAP_MODE === 'hive' ? 'blocks' : 'hive'; store.set('signalLance.map', TUNE.MAP_MODE); showMap(); });
$('tester').addEventListener('change', () => store.set('signalLance.tester', $('tester').value.trim()));
$('bCont').addEventListener('click', () => { store.set('signalLance.tester', $('tester').value.trim()); $('tester').blur(); $('splash').hidden = true; });
$('bBasics').addEventListener('click', () => { basicsFrom = 'splash'; $('splash').hidden = true; $('basics').hidden = false; $('basics').scrollTop = 0; });
$('bHelp').addEventListener('click', () => { basicsFrom = 'load'; $('basics').hidden = false; $('basics').scrollTop = 0; });
$('bBack').addEventListener('click', () => { $('basics').hidden = true; if (basicsFrom === 'splash') $('splash').hidden = false; });
buildBrief(BUILD);
buildQuestions();
buildLoadout();
$('ver').textContent = $('lver').textContent = VERSION;
