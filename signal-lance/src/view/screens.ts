import { TUNE } from '../tune.ts';
import { showAar, hideAar, aarLog } from './aar.ts';
import { G, newHunt, enterLoadout, rollEnemy } from '../sim/state.ts';
import { newContract, previewJob, takeJob, rollJobs, rerollJobs, dmgWord, lanceText, contractActive, refit, refitBlock, refitCap, buysText } from '../sim/contract.ts';
import { V } from './state.ts';
import { $, fmtTime } from './hud.ts';
import { partsRead, shotsText } from '../sim/combat.ts';
import { moveText } from '../sim/turns.ts';
import { soundText } from '../sim/sound.ts';
import { idText } from '../sim/ids.ts';
import { setPack } from '../sim/pack.ts';
import { leaveScenario } from '../sim/scenarios.ts';
import { buildBrief, buildQuestions, resetAnswers, answersText } from './brief.ts';
import { MISSION_INFO, missionText, isType, escortBonus } from '../sim/mission.ts';
import { anchors, MAP, W, H } from '../sim/world.ts';
import { mapText } from '../sim/blocks.ts';
import { fieldCount } from '../sim/state.ts';
import { fitText, has } from '../sim/kit.ts';
import { buildHangar, renderHangar, currentFits, hangarBlock } from './hangar.ts';
import { foundLines, foundText } from '../sim/found.ts';
import { fitHasGun, fitHasMortar } from '../sim/contract.ts';
import { frameOf } from '../sim/fit.ts';
import { relockLoads, fitsOpen } from '../sim/contract.ts';
import { LISTEN, listen, chooseDrop, zoneKnow, zoneKnowOf, offeredDrops, scanText, dropPts, scanReport } from '../sim/scan.ts';
import { replayScan, encodeCmds, decodeCmds, jobDeadline } from '../sim/livescan.ts';
import { showScan } from './scan.ts';
import { rwrText } from '../sim/rwr.ts';
import { crewLines, endContract, fillCrew, opShort, canDrop, opById, pullContract, cycleSeat, lanceSize, suitFit, takeOffer, suitRefit, suitRefitBlock, suitCost } from '../sim/company.ts';
import { loadCompany, saveCompany, showCompany, companyMode, companyActions, companyLogLines, bindHangar, costTxt } from './company.ts';

// bump on every publish: a new build clears the run log
export const BUILD = 'r23-s1';  // r23-s1: R23 checkpoint A: the city (a seeded map of 6-8 faction districts, path fuel, faction and broker jobs in districts, standing per faction with HATED / LIKED bands and drift; hated = danger up, more of the field awake, dear fuel; liked = pay bonus, free scan intel, cheap fuel); the city screen; [CITY] log lines; Hated + Liked. r22-s5: R22 headless tuning 3 (Jamie): PAY_MULT 1.25 on every hunt's pay, CONTRACT_BONUS 100 on completion; R22 wrap: Round 22 on the splash round history. r22-s4: R22 headless tuning 2 (Jamie): held the field recovers downed suits (rebuild × RECOVER_MULT 0.5), START_FUEL 6 → 8. r22-s3: R22 fix: a tapped after-action moment shows the units as they were at that turn (no wreck), named, zoomed out to fit. r22-s2: R22 headless tuning 1: Escort route picks rank below the fights (AAR_WEIGHT_ROUTE 2); a KIA folds into its suit's went-down line. r22-s1: R22 what happened: the after-action page (WHAT HAPPENED: up to 6 turning points from the hunt's record of first detections, hits that mattered and objective swings; WHAT IT COST with ← T links; tap to pulse on the map; held the field vs redacted; DETAILS keeps the old panels; [AAR] log lines); Held the field + Bailed; runner --aar. r21-s5: R21 wrap: fix list 1 (the offers are never all one danger); Round 21 on the splash round history. r21-s4: R21 checkpoints 3 + 4 (built together, Jamie): the books (credits, fuel, three contract offers, wages + upkeep, debt then the fold, parts + salvage, the market, the hangar fits only owned items) and the ship (7 hardpoints, 13 modules, a painted ship's hull hits); Thin books. r21-s2: R21 checkpoint 2: the roster: 3 suits with their own fits and damage carried between contracts, the lance picked before every hunt (1-3 suits, an operator each), company credits, the SUITS tab. r21-s1: R21 checkpoint 1: the company (people): named operators with one skill (STEADY AIM, QUIET MOVER, SHARP EARS, SENSOR TECH), XP and levels, CRITICAL + carry them out (benched) or KIA (memorial), recruits; the company screen and one save slot; Carry them out. r20-s5: R20 wrap: Round 20 on the splash round history. r20-s4: R20 checkpoint 3: the scan log (a line per stretch, then the drop) on the result screen and as [SCAN] log lines; runner --scan presets and --scansweep. r20-s3: R20 fix list 5: ship altitude HIGH / MID / LOW (ring size, sensor strength, fuzz, loudness); R20 debrief 1: the job card's top line says SCAN WINDOW N MIN or NO TIME LIMIT. r20-s2: R20 fix list 1-4 + checkpoint 2: sensors at once with their own rings, FULL MAP, no clock cap (PAUSE), the risk meter (steps call units in; the drop step wakes the field / paints the ship; cools with sensors off), arrivals over time, job deadlines on the scan screen. r20-s1: R20 checkpoint 1: the live scan (START / STOP clock, RADAR / THERMAL / EM, a draggable aim ring, bands per unit and zone, patrols walk, drop zones need radar), Where first. r19-s7: R19 wrap: Round 19 on the splash round history. r19-s6: R19 fix list 1: every suit has a built-in RWR (PAINTED, the round, no bearing); the module adds the readout. r19-s5: R19 fix list 2: the scan map never stretches (height follows width, redrawn once the panel scale settles, drawn sharp). r19-s4: readability pass (Jamie: iPhone text too small): menus stop shrinking at 0.92 and scroll, UI floor 0.85, bigger scan map, shorter scan text, stacked blip labels. r19-s3: R19 checkpoint 3: the RWR (scope rings, spokes, heard-moving wedge), Painted on the move scenario. r19-s2: R19 checkpoint 2: the cost ladder (extra units, the field wakes, the ship painted → ambush), runner --listensweep. r19-s1: R19 checkpoint 1: the pre-drop scan (listen dial, roster, zones, drop zones, blips), hunt 1 builds after its scan. r18-s13: R18 wrap: Round 18 on the splash round history. r18-s12: R18 fix list 17: a thermal look with no heat marks the contact (struck IR tag, 'no heat at N' trait). r18-s11: R18 fix list 14-16: cover shield, NEW BUILD works on iPad, NOISE never moves a passive centre. r18-s10: R18 fix list 11-13: vague fixes keep good tracks, blind lob scales with range, EO/ESM/ACO/MZL tags + suit letters. r18-s9: R18 fix list 10: passive fixes = best fit of every bearing, weighted by trust; trusted crossings beat NOISE. r18-s8: R18 fix list 5-9: stacked contact labels, sensor tags, cover pieces by kind, interrupt only on new contacts, PLAY SEED + seed in the log. r18-s7: R18 fix list 1-4: clear hangar highlight, autoscale to the window (iPad split screen), top buffer, sheet acts on touch; new-build check; quit-Escort crash. r18-s6: R18 fix: the hangar's pick sheet takes taps on iPad (touch default kept inside .sheet); empty hardpoints say why. r18-s5: QUIT button back to the hangar. r18-s4: R18 debrief 1: overload costs Energy per tile, every mode (OVERLOAD_EN_PER_TILE 0.5). r18-s3: R18 checkpoint 3: THERMAL (heat from reactor, size, firing, sprinting; turrets' thermal sights; Thermal optics). r18-s2: R18 checkpoint 2: the hangar (Jamie's wireframe), parts take modules offline, rear arc, power, weight, signature from items, the Cold processor, INTEL listens on, what found you. r18-s1: R18 checkpoint 1: same game, new insides (item rows, one fit for both sides, stats from the row). r17-s5: R17 wrap: Round 17 on the splash round history. s4: facing is free (AP_TURN 0). s3: tap the path, then tap where to look (a draggable look marker). s2: freehand drawn paths, end handle / redraw from a point, LOOK menu for facing (s1: drawn paths, waypoints, interrupt, low cover)
declare const __BUILT__: string;
declare const __MARK__: string;
// R18 fix (Jamie's iPad kept an old build): fetch the published page fresh; if its build stamp differs, offer a reload.
function checkNewBuild() {
  if (typeof __MARK__ !== 'string') return;
  const url = location.href.split('#')[0];
  try {
    fetch(url + (url.includes('?') ? '&' : '?') + 'v=' + Date.now(), { cache: 'no-store' }).then(r => r.ok ? r.text() : '').then(t => {
      const m = new RegExp('SL' + 'BUILD@[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2}').exec(t || ''); // split so this line never matches itself
      if (!m || m[0] === __MARK__) return;
      $('bNew').hidden = false;
    }).catch(() => {});
  } catch (_) {}
}
// Version tag shown on screen: build label + build time (Vancouver). Changes on every build.
export const VERSION = BUILD + ' · ' + (typeof __BUILT__ === 'string' ? __BUILT__ : 'dev');
// ============================ LOADOUT / RESULT / RUN LOG ==============
// localStorage wrapped: falls back to memory if unavailable
export const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (_) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) {} },
};
let LOG = store.get('signalLance.log', []);
if (!Array.isArray(LOG) || store.get('signalLance.build', '') !== BUILD) { LOG = []; store.set('signalLance.ctN', 0); store.set('signalLance.log', LOG); store.set('signalLance.compBag', []); store.set('signalLance.build', BUILD); } // R10: a new build also starts a fresh shuffled set
// R18 (A10): the hangar (view/hangar.ts) replaced the slot picker. LAUNCH hands copies of the two fits to the sim.
export function currentLoads() { return currentFits(); }
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
  return job + '\nINTEL: ' + dist + C.NAME + '. ' + cap([...parts, tur].filter(Boolean).join(', ')) + '.' + site + zoneIntel() + listenIntel(C); // R8: names the composition
}
// R18 (C7): what the field listens on, per channel, so the build can answer the briefing
export function listenIntel(C) {
  const n = k => fieldCount(C, k), ears = n('PATROL') + n('TURRET'), radar = n('EMPLACEMENT'), all = ears + radar;
  if (!all) return '';
  const L = ['SND: all ' + all + ' hear steps and shots (through walls)', 'eyes: all, ' + TUNE.EYES_RANGE + ' tiles in line of sight'];
  if (ears) L.push('EM: ' + ears + ' with passive ears (' + [n('PATROL') && 'patrols', n('TURRET') && 'turrets'].filter(Boolean).join(', ') + ')');
  if (radar) L.push('EM: ' + radar + ' radar (emplacements pulse; a pulse finds you through walls)');
  const hot = Object.keys(TUNE.FIELD_TYPES).filter(k => TUNE.FIELD_TYPES[k].THERMAL).reduce((a, k) => a + n(k), 0); // R18 cp3
  if (TUNE.THERMAL_ENABLED && hot) L.push('IR: ' + hot + ' with thermal sights (' + Object.keys(TUNE.FIELD_TYPES).filter(k => TUNE.FIELD_TYPES[k].THERMAL && n(k)).map(k => TUNE.FIELD_TYPES[k].PLURAL).join(', ') + '; see heat in line of sight, past eye range when you run hot)');
  return ' Listens on: ' + L.join(' · ') + '.';
}
// R10: " Quiet ground: rail cut (NW). Noise: sump (S), SE apron."
function zoneIntel() {
  let s = '';
  if (G.scan && G.scan.mode === 'active') { // R20: zone by zone
    const out = G.zones.filter(z => zoneKnowOf(z) === 1).length;
    for (const k of ['QUIET', 'NOISE']) { const zs = G.zones.filter(z => z.type === k && zoneKnowOf(z) >= 2); if (zs.length) s += ' ' + TUNE.ZONE_TYPES[k].NAME + ': ' + zs.map(z => z.name).join(', ') + '.'; }
    return s + (out ? ' Zones: ' + out + ' more seen, type unknown.' : '');
  }
  if (zoneKnow() < 2) return zoneKnow() ? ' Zones: ' + G.zones.length + ' heard, type unknown.' : ''; // R19: the scan tells you the zones
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
export function killText() { return 'kills ' + G.kills + '/' + G.units.length + scanText() + rwrText() + (missionText() ? ' · ' + missionText() : '') + zoneText() + mortarText() + shotsText() + soundText() + moveText() + idText() + foundText(); } // R18: what found each suit first // R14: IDs n (right, wrong, before eyes) // R13: loudest, sprints, heard (+ alarms) // R12: shots/hits, parts lost
// R9: "· mortar 3/5 hits, 2 kills (A)" — shells that hit the field / shells fired, kills, who carried it
export function mortarText() {
  const ms = G.lance.filter(m => has(m, 'MORTAR'));
  if (!ms.length) return ' · mortar none';
  let s = 0, h = 0, k = 0, f = 0, b = 0; for (const m of ms) { s += m.mShots; h += m.mHits; k += m.mKills; f += m.mFriendly; b += m.mBlind; }
  return ' · mortar ' + h + '/' + s + ' hits, ' + k + ' kills' + (b ? ', ' + b + ' blind' : '') + (f ? ', ' + f + ' on own' : '') + ' (' + (ms.length > 1 ? 'both' : ms[0].id) + ')';
}
// both mechs' fits, as launched (R18: the fit, item by item)
export function loadSummary() { return G.lance.map(m => m.id + ': ' + fitText(m.fit)).join(' / '); }
export function renderLoadout() {
  renderHangar();
  $('logv').textContent = LOG.length ? LOG.slice(-5).join('\n') : 'No runs logged yet.';
  $('logta').hidden = true;
}
function showIntel() {
  $('intel').textContent = 'CONTRACT: ' + ctHunts() + (ctHunts() > 1 ? ' hunts, win ' + Math.min(TUNE.CONTRACT_WINS_NEEDED, ctHunts()) : ' hunt (quick test)') + '. Loadouts lock for the whole contract. Damage, rounds, shells and lost mechs carry over. Jobs are briefed after you start.';
}
export function showLoadout() {
  G.replay = 0; G.scan = null; preMode(false); // R19 // R18: a replayed hunt is over once you're back in the hangar
  enterLoadout((Math.random() * 4294967296) >>> 0); // R11: sets loadout mode; the jobs are rolled once the contract starts
  $('res').hidden = $('jobs').hidden = $('cres').hidden = true; $('load').hidden = false;
  showIntel();
  $('bLaunch').textContent = companyMode() ? 'BACK TO THE COMPANY' : 'START CONTRACT'; // R21: in company mode contracts start from the company screen
  renderLoadout();
}
// R21: the first screen: the company (company mode) or the hangar
export function showStart() { if (companyMode()) { showLoadout(); $('load').hidden = true; showCompany(); } else showLoadout(); }
// Result screen (hooks.end: the sim has already set G.mode = 'result' and G.outcome).
export function showResult() {
  const outcome = G.outcome.split(' ')[0];
  const M = G.mission, bounty = isType('BOUNTY'); // R15
  const why = bounty ? { WIN: 'Bounty quota met: ' + M.earned + ' / ' + M.quota + ' cr.', LOSS: 'You were destroyed.', BAIL: 'Extracted under quota. Kept ' + M.earned + ' cr, no win.' }[outcome]
    : { WIN: G.winBy === 'UPLINK' ? 'Uplink complete at ' + G.up.name + '.' : G.winBy === 'RETRIEVE' ? 'Cargo carried out by ' + G.mission.carrier + '.' : G.winBy === 'ESCORT' ? 'The transport made it out with ' + G.ally.hits + '/' + G.ally.maxHits + ' hits (bonus ' + escortBonus() + ' cr).' : 'Field cleared.', LOSS: 'You were destroyed.', BAIL: 'You extracted without the job done.',
        FAIL: isType('ESCORT') ? 'The transport was destroyed. The hunt failed.' : 'The carrier (' + G.mission.carrier + ') was destroyed. The cargo is lost; the hunt failed.' }[outcome];
  // R22: the after-action page (sim/aar.ts) on top; the old panels below behind DETAILS (kept, not deleted)
  $('resWhy').innerHTML = '<div>' + escH(ctTag() + G.outcome + ' · ' + G.comp.NAME + ' · ' + killText() + ' — ' + fmtTime(G.time) + ' (' + G.turn + ' turns)') + '</div>' + why + '<br><b>' + foundLines().join('<br>') + '</b><br>' + (missionText() || 'Uplink ' + G.up.prog + '/' + TUNE.UPLINK_TURNS + ' at ' + G.up.name) + '<br>' + dmgSummary() + '<br>Field: ' + fieldSummary() + '<br>Loadout: ' + loadSummary() + (G.ct ? '<br><b>Lance: ' + lanceText() + '</b> · contract wins ' + G.ct.wins + '/' + G.ct.need + (G.ct.status !== 'ACTIVE' ? ' · CONTRACT ' + G.ct.status : '') : '');
  if (G.co && G.ct) { const L = [...crewLines(), ...G.co.news]; if (L.length) $('resWhy').innerHTML += '<div class="colog"><b>THE COMPANY:</b>' + L.map(l => '<div>' + escH(l) + '</div>').join('') + '</div>'; saveCompany(); } // R21: who came back, who levelled, who was left
  const SR = scanReport(); if (SR.length) $('resWhy').innerHTML += '<div class="scanlog"><b>THE SCAN (learn why):</b>' + SR.map(l => '<div>' + escH(l) + '</div>').join('') + '</div>'; // R20 cp3
  const tb = !!G.tb; // R22: a test-bed after-action scenario uses this page with its own question and RETRY / BACK
  $('resQ').hidden = tb; $('resTbQ').hidden = !tb; $('resGo').hidden = tb; $('resTb').hidden = !tb;
  $('note').value = ''; resetAnswers();
  $('res').hidden = false; $('res').scrollTop = 0;
  showAar((tb ? 'TEST BED · ' + G.tb.name + ' · ' : ctTag()) + G.outcome + ' · ' + (MISSION_INFO[G.mtype]?.name || G.mtype) + ' · ' + G.turn + ' turns');
}
export function dmgSummary() {
  let fs = 0, fl = 0; for (const u of G.units) { fs += u.shots; fl += u.landed; }
  return G.lance.filter(m => !m.noOp).map(m => m.id + ' ' + m.landed + '/' + m.shots + ' hit, ' + (m.dead ? (m.crit ? 'CRITICAL' + (m.carriedBy ? ' (carried by ' + m.carriedBy + ')' : '') : 'destroyed') : partsRead(m))).join('; ') + // R21: CRITICAL // R12: parts
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
  LOG.push(stamp + ' | ' + testerTag() + loadSummary() + ' | vs ' + enemySummary() + ' | ' + ctTag() + G.outcome + ' · ' + G.comp.NAME + ' · ' + seedText() + ' · ' + mapText(G.zones.length) + ' · ' + killText() + (G.ct ? ' · ' + lanceText() + huntCr() : '') + (isType('UPLINK') ? ' uplink ' + G.up.prog + '/' + TUNE.UPLINK_TURNS + ' @' + G.up.name : '') + ' | ' + fmtTime(G.time) + ' turns ' + G.turn + ' | ' + dmgSummary() + ' | ' + (ans ? ans + ' | ' : '') + note);
  for (const l of aarLog()) LOG.push(stamp + ' | ' + testerTag() + l); // R22: the after-action moments
  for (const l of scanReport()) LOG.push(stamp + ' | ' + testerTag() + '[SCAN] ' + l); // R20 cp3: the scan log, a line per stretch, then the drop
  if (G.ct && G.ct.status !== 'ACTIVE') LOG.push(stamp + ' | ' + testerTag() + contractLine());
  if (G.co && G.ct) { for (const l of [...crewLines().map(c => '[COMPANY] ' + c), ...companyLogLines()]) LOG.push(stamp + ' | ' + testerTag() + l); G.co.news = []; } // R21
  store.set('signalLance.log', LOG);
  $('note').blur(); hideAar();
  if (contractActive()) { rollJobs(); saveCompany(); showJobs(); } else if (G.ct) { saveCompany(); showContractResult(); } else showStart();
}
// ============================ R11: CONTRACT SCREENS ====================
let ctN = store.get('signalLance.ctN', 0) | 0; // contract number for the log (C3)
// " · +140 cr (bought A repair×2)" for this hunt's log line
function huntCr() { const r = G.ct.results[G.ct.results.length - 1]; return r ? ' · +' + r.pay + ' cr' + (r.buys.length ? ' (bought ' + buysText(r.buys) + ')' : '') : ''; }
function tagsOnly() { return (TUNE.PACK_ENABLED ? '[PACK] ' : '') + (TUNE.MAP_MODE === 'hive' ? '[HIVE] ' : '') + (TUNE.THERMAL_ENABLED ? '' : '[NO-IR] '); }
function testerTag() { const t = store.get('signalLance.tester', ''); if (G.replay && G.mode !== 'loadout') return (t ? '[' + t + '] ' : '') + '[REPLAY] ' + tagsOnly(); return (t ? '[' + t + '] ' : '') + (TUNE.PACK_ENABLED ? '[PACK] ' : '') + (TUNE.MAP_MODE === 'hive' ? '[HIVE] ' : '') + (TUNE.THERMAL_ENABLED ? '' : '[NO-IR] '); } // R18 cp3: runs with THERMAL off are tagged // R13: pack runs are tagged (R16: so are old-map runs)
function ctTag() { return G.ct ? 'C' + ctN + ' H' + G.ct.hunt + '/' + G.ct.hunts + (G.ct.rerolls ? ' [DBG jobs rerolled ×' + G.ct.rerolls + ']' : '') + ' · ' : ''; }
// "C3 COMPLETE 2/3 · lost B in H2"
function contractLine() {
  const C = G.ct, lost = C.results.flatMap(r => r.lost.map(id => id + ' in H' + r.n));
  return 'C' + ctN + ' ' + C.status + ' ' + C.wins + '/' + C.results.length + (lost.length ? ' · lost ' + lost.join(', ') : ' · no mechs lost') + ' · ' + C.results.map(r => r.mission + ' ' + r.comp).join(' > ') + ' · cr earned ' + C.earned + ' spent ' + C.spent;
}
// R21 cp3: in company mode, i = the offer taken (its seed, length, danger; the 1-hunt quick test still shortens it)
function startContract(i = -1) {
  G.replay = 0;
  if (G.co) { if (!takeOffer(i, ctHunts() === 1 ? 1 : undefined)) return; ctN++; store.set('signalLance.ctN', ctN); saveCompany(); logLine('[COMPANY] ' + G.co.news.splice(0).join(' ') + ' · ' + companyLogLines().pop()); } // on the company's suits, their damage, its credits
  else { ctN++; store.set('signalLance.ctN', ctN); newContract((Math.random() * 4294967296) >>> 0, currentLoads(), ctHunts()); }
  showJobs();
}
// R21: back into a saved contract (after a reload): its next hunt's jobs
function resumeContract() { const C = G.ct; if (C.results.length >= C.hunt) rollJobs(); saveCompany(); showJobs(); }
function mechLine(id) {
  const c = G.ct.carry[id], L = G.ct.loads[G.ct.ids.indexOf(id)];
  const op = G.co ? opById(G.co.crew[id]) : null; // R21 cp2: who drives it, picked here before every hunt (tap to change)
  const opTxt = G.co && !c.dead ? ' <button class="seatb' + (op ? ' on' : '') + '" data-s="' + id + '">' + (op ? 'DROPS · ' + escH(opShort(op)) : 'STAYS ABOARD') + ' ▸</button>' : '';
  if (c.dead) return '<b class="lost">' + id + '  LOST</b>' + (G.co ? ' <small>(rebuild it to drop it)</small>' : '');
  return opTxt + '<b>' + id + '  ' + dmgWord(c) + '</b> · ' + frameOf(L).name + ' · ' + partsRead(c) + (fitHasGun(L) ? ' · ' + c.ammo + ' rds' : '') + (fitHasMortar(L) ? ' · ' + c.shells + ' shells' : '');
}
// R11 s2: refit buttons for one mech (hidden before hunt 1: nothing to cap from, no credits)
const RF = [['repair', 'REPAIR WORST', TUNE.COST_REPAIR], ['rounds', '+10 RDS', TUNE.COST_ROUNDS], ['shell', '+1 SHELL', TUNE.COST_SHELL], ['rebuild', 'REBUILD', TUNE.COST_REBUILD]];
function refitRow(id) {
  if (G.co) { // R21 cp3: parts + credits, from the company (only what there is to do)
    const why = { CR: 'need cr', PARTS: 'need parts' };
    const h = [['repair', 'REPAIR'], ['rounds', '+10 RDS'], ['shell', '+1 SHELL'], ['rebuild', 'REBUILD']].map(([k, n]) => { const b = suitRefitBlock(id, k); return b === 'NONE' || b === 'LOST' || b === 'CAP' ? '' : '<button class="rf' + (b ? ' lockd' : '') + '" data-id="' + id + '" data-k="' + k + '">' + n + '<br><small>' + costTxt(suitCost(k, id)) + (b ? ' · ' + why[b] : '') + '</small></button>'; }).join('');
    return h ? '<div class="rfrow">' + h + '</div>' : '';
  }
  const cap = refitCap(id); if (!cap) return '';
  const why = { CR: 'need cr', CAP: 'at max', LOST: '', NONE: '' };
  let h = '';
  for (const [k, name, cost] of RF) {
    const b = refitBlock(id, k); if (b === 'NONE' || b === 'LOST' || (G.co && b === 'CAP')) continue; // R21 cp2: nothing to do = no button
    h += '<button class="rf' + (b ? ' lockd' : '') + '" data-id="' + id + '" data-k="' + k + '">' + name + '<br><small>' + cost + ' cr' + (b ? ' · ' + why[b] : '') + '</small></button>';
  }
  const capTxt = G.ct.carry[id].dead ? 'rebuilds to ' + cap.hits + ' hits' : 'max ' + cap.hits + ' hits' + (fitHasGun(G.ct.loads[G.ct.ids.indexOf(id)]) ? ' · ' + cap.ammo + ' rds' : '') + (fitHasMortar(G.ct.loads[G.ct.ids.indexOf(id)]) ? ' · ' + cap.shells + ' shells' : '');
  if (G.co) return h ? '<div class="rfrow">' + h + '</div>' : '';
  return '<div class="rfrow">' + h + '<small class="cap">' + capTxt + '</small></div>';
}
function renderLance() {
  const C = G.ct;
  const n = G.co ? lanceSize() : 0;
  $('jhead').innerHTML = 'HUNT ' + C.hunt + '/' + C.hunts + ' · wins ' + C.wins + ' (need ' + C.need + ') · ' + C.credits + ' cr' + (G.co ? ' · ' + G.co.parts + ' parts' + (C.tier !== undefined ? ' · ' + TUNE.DANGER_NAMES[C.tier] + ' danger, fee ' + C.fee : '') : '') + (G.co ? ' · <span class="' + (n ? 'okt' : 'badt') + '">LANCE: ' + (n ? n + ' suit' + (n > 1 ? 's' : '') + ' drop' + (n > 1 ? '' : 's') : 'pick who drops') + '</span>' : '');
  $('jlance').innerHTML = C.ids.map(id => '<div>' + mechLine(id) + refitRow(id) + '</div>').join('') +
    (G.co ? '<small class="cap">Tap a suit’s button to pick its operator, or leave it aboard. Repairs take the company’s parts and credits.</small>' : C.hunt > 1 ? '<small class="cap">Refit caps at ' + Math.round(TUNE.REFIT_CAP * 100) + '% of what each mech started its last hunt with.</small>' : '');
  for (const i of [0, 1]) $('bJ' + i).classList.toggle('lockd', !!G.co && !n); // R21 cp2: no one picked = no drop
}
export function showJobs() {
  const C = G.ct;
  if (G.co) { fillCrew(); if (!G.co.ops.some(canDrop) || !C.ids.some(id => suitFit(id))) { C.status = 'FAILED'; endContract('FAILED'); saveCompany(); logLine('[COMPANY] contract failed: no operator left who can drop · ' + companyLogLines().pop()); showContractResult(); return; } } // R21: nobody left to drive a suit
  $('load').hidden = $('res').hidden = $('cres').hidden = true;
  renderLance();
  const esc = (t: string) => t.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  for (let i = 0; i < 2; i++) { previewJob(i); const [job, intel] = intelText().split('\n'); const dl = TUNE.SCAN_ENABLED && TUNE.SCAN_MODE === 'active' ? jobDeadline(G.ct.jobs[i].seed, G.ct.jobs[i].mission) : 0; const tag = TUNE.SCAN_ENABLED && TUNE.SCAN_MODE === 'active' ? (dl ? '<span class="jtag dl">SCAN WINDOW ' + dl + ' MIN</span>' : '<span class="jtag free">NO TIME LIMIT</span>') : ''; // R20 debrief 1 (Jamie missed the deadline on the card): first thing on the top line
    $('j' + i).innerHTML = tag + '<b style="color:#fc3">' + esc(job) + '</b><br>' + esc(intel); } // R20 fix list 4 // R15: the job type on top
  $('jobs').hidden = false; $('jobs').scrollTop = 0;
}
// R19: take job i → the pre-drop scan (with the scan on) → the hangar before hunt 1 (Jamie: build after hunt 1's scan, then the
// fits lock) → the drop. Hunts 2+ go straight from the scan to the drop.
let scanJob = 0;
function pickJob(i) {
  if (G.co && !lanceSize()) return; // R21 cp2: pick who drops first
  $('jobs').hidden = true;
  if (!TUNE.SCAN_ENABLED) { goJob(i); return; }
  scanJob = i; G.scan = null; previewJob(i);
  openScan();
}
function openScan() {
  showScan('HUNT ' + G.ct.hunt + ' · ' + MISSION_INFO[G.mtype].name + ' · ' + (MAP.info.grid || '').replace('x', '×') + ' district', () => (fitsOpen() ? showPreHangar() : goJob(scanJob)), fitsOpen() ? 'TO THE HANGAR' : 'DROP');
}
function goJob(i) {
  $('jobs').hidden = true; preMode(false); $('load').hidden = true;
  takeJob(i);
  V.follow = true; V.camX = G.p.x; V.camY = G.p.y; V.ghostArm = V.faceArm = V.mortarArm = false; V.hitFlash = 0;
}
// R19: the hangar as the last step before hunt 1: the fits are still open; LAUNCH locks them for the contract
function preMode(on: boolean) { $('lpre').hidden = !on; $('lnorm').hidden = on; }
function showPreHangar() {
  preMode(true);
  const [job, intel] = intelText().split('\n'), S = G.scan, D = dropPts()[S.drop] || dropPts()[0];
  $('pintel').innerHTML = '<b style="color:#fc3">' + escH(job) + '</b><br>' + escH(intel) + '<br><b>Scan: ' + (S.mode === 'active' ? Math.round(S.t * 4) / 4 + ' min' : LISTEN[S.lvl]) + ' · drop: ' + escH(D.name || 'west edge') + '</b><br>Build your ExoS for what you heard. The fits lock when you launch.';
  $('load').hidden = false; renderHangar();
}
const escH = (t: string) => String(t).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
$('bPreGo').addEventListener('click', () => { const w = hangarBlock(); if (w) { $('pintel').innerHTML += '<br><span class="badt">Can’t launch: ' + escH(w) + '.</span>'; return; } relockLoads(currentLoads()); goJob(scanJob); });
$('bPreBack').addEventListener('click', () => { $('load').hidden = true; preMode(false); openScan(); });
function showContractResult() {
  const C = G.ct;
  $('res').hidden = $('jobs').hidden = true;
  $('cTitle').textContent = 'CONTRACT ' + C.status;
  $('cSub').textContent = 'C' + ctN + ' · won ' + C.wins + ' of ' + C.results.length + ' hunts (need ' + C.need + ')' + (C.results.length < C.hunts ? ' · lance destroyed in hunt ' + C.results.length : '') + ' · credits earned ' + C.earned + ', spent ' + C.spent;
  $('cHunts').innerHTML = C.results.map(r => '<div class="hunt"><b>Hunt ' + r.n + ' · job ' + r.job + ' · ' + r.mission + '</b>' + r.comp + ' @ ' + r.up + '<br><b>' + r.outcome + '</b> · kills ' + r.kills + '/' + r.total +
    '<br>Mechs lost: ' + (r.lost.length ? r.lost.join(', ') : 'none') + '<br>Carried out: ' + r.out.join(', ') + '<br>Paid ' + r.pay + ' cr' + (r.buys.length ? '<br>Bought before: ' + buysText(r.buys) : '') + '</div>').join('');
  $('bNewC').textContent = companyMode() ? 'TO THE COMPANY' : 'NEW CONTRACT'; // R21
  const L = G.co && G.co.ledger; if (L) $('cSub').textContent += ' · fee ' + L.fee + ', wages −' + L.wages + ', upkeep −' + L.upkeep + (L.hull ? ', hull −' + L.hull : '') + ' → company ' + L.after + ' cr' + (G.co.folded ? ' · THE COMPANY FOLDED' : G.co.debt ? ' · IN DEBT' : ''); // R21 cp3
  $('cres').hidden = false; $('cres').scrollTop = 0;
}
// R18 (Jamie: "we need a button in game to get back to start screen"): QUIT drops the hunt (and its contract, or the
// test-bed scenario) and goes back to the hangar. A contract hunt quit part-way is logged as QUIT, never as a result.
export function quitToStart() {
  hideAar(); // R22
  if (G.tb) { leaveScenario(); G.tb = null; }
  else if (G.mode === 'hunt') logLine(ctTag() + 'QUIT · ' + (G.comp ? G.comp.NAME : '') + ' · ' + seedText() + ' · round ' + G.turn + ' · ' + loadSummary());
  if (G.co && G.ct && G.ct.status === 'ACTIVE') { pullContract(); endContract('QUIT'); logLine('[COMPANY] contract quit (bailed): ' + G.co.news.join(' ') + ' · ' + companyLogLines().pop()); G.co.news = []; G.ct = null; saveCompany(); } // R21: quitting bails the contract: nobody is hurt, but wages and upkeep are paid
  G.ct = null; G.act = null;
  for (const id of ['res', 'jobs', 'cres', 'tb', 'tbres', 'card', 'idp', 'hsheet', 'scan', 'co']) { const e = document.getElementById(id); if (e) e.hidden = true; }
  showStart();
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
// R18 fix list 9 (Jamie: "a way for after, me load a specific seed so i can test that exact same situation against the fix"):
// every log line carries "seed N <MISSION>"; PLAY SEED takes a seed or a pasted log line and starts that same hunt (same
// district, field, placements, job type) with the current fits, outside any contract. The RNG is seeded, so the same moves
// replay the same hunt. The line's [PACK] / [NO-IR] / [HIVE] tags set those toggles for the replay.
export function seedText() { if (G.scan && G.scan.mode === 'active') return 'seed ' + G.seed + ' ' + G.mtype + ' scan ' + encodeCmds(G.scan.cmds) + ' drop ' + (G.scan.drop + 1); // R20: the live scan's commands replay it
  return 'seed ' + G.seed + ' ' + G.mtype + (G.scan && G.scan.lvl >= 0 ? ' listen ' + LISTEN[G.scan.lvl] + ' drop ' + (G.scan.drop + 1) : ''); } // R19: the scan's choices replay too
export function parseSeed(text: string) {
  const t = text.trim(), m = /seed (\d+)/.exec(t) || /^(\d+)$/.exec(t) || /\b(\d{6,})\b/.exec(t);
  if (!m) return null;
  const low = t.toLowerCase(), has = (w: string) => new RegExp('(^|[^a-z])' + w.toLowerCase() + '([^a-z]|$)').test(low); // a whole word, any case
  const comp = TUNE.FIELD_COMPOSITIONS.map(c => c.NAME).find(n => has(n)); // none named = the seed's own roll
  const mission = [...TUNE.MISSION_TYPES, 'UPLINK'].find(k => has(k)) || 'UPLINK';
  const up = t.toUpperCase(), tags = /\[(PACK|NO-IR|HIVE)\]/.test(up);
  const li = /LISTEN (SKIP|SHORT|MEDIUM|LONG)/.exec(up), dr = /DROP (\d)/.exec(up); // R19
  return { seed: Number(m[1]) >>> 0, comp, mission, pack: up.includes('[PACK]'), noIr: up.includes('[NO-IR]'), hive: up.includes('[HIVE]'), line: /\|/.test(t) || tags,
    listen: li ? LISTEN.indexOf(li[1]) : -1, drop: dr ? Number(dr[1]) - 1 : 0, cmds: (/ scan (\d+[RTEWwGSa][0-9A-Za-z._]*|-)(?= |$)/.exec(t) || [])[1] || '' }; // R20 (not the result's " · scan 12 min")
}
function playSeed() {
  const P = parseSeed(($('seedIn') as HTMLInputElement).value);
  if (!P) { $('intel').textContent = 'PLAY SEED: type a seed number, or paste a log line with "seed N" in it.'; return; }
  const w = hangarBlock(); if (w) { $('intel').textContent = 'Can’t launch: ' + w + '.'; return; }
  if (P.line) { setPack(P.pack); TUNE.THERMAL_ENABLED = !P.noIr; TUNE.MAP_MODE = P.hive ? 'hive' : 'blocks'; showPack(); showHeat(); showMap(); }
  G.ct = null; G.replay = P.seed; G.scan = null;
  rollEnemy(P.seed, P.comp, P.mission);
  $('load').hidden = true;
  if (G.scan && G.scan.mode === 'active' && P.cmds) { replayScan(decodeCmds(P.cmds)); chooseDrop(P.drop); } // R20: a log line replays its live scan
  else if (G.scan && G.scan.mode !== 'active' && P.listen >= 0) { listen(P.listen); chooseDrop(P.drop); } // R19: a log line replays its scan choices
  else if (G.scan) { showScan('PLAY SEED ' + P.seed + ' · ' + P.mission, () => launch(), 'DROP'); return; } // a bare seed: listen again
  launch();
}
export function launch() {
  G.crew = null; // R21: a seed replay or the backdrop hunt has no operators
  newHunt(currentLoads());
  V.follow = true; V.camX = G.p.x; V.camY = G.p.y; V.ghostArm = V.faceArm = false; V.hitFlash = 0;
  $('res').hidden = true;
}
$('bSeed').addEventListener('click', playSeed);
$('seedIn').addEventListener('keydown', e => { if (e.key === 'Enter') playSeed(); });
$('bLaunch').addEventListener('click', () => { if (companyMode()) { $('load').hidden = true; showCompany(); return; } const w = hangarBlock(); if (w) { $('intel').textContent = 'Can’t launch: ' + w + '.'; return; } $('load').hidden = true; startContract(); }); // R11: locks the fits, opens the job pick. R18: only fits that launch
$('bJ0').addEventListener('click', () => pickJob(0));
$('jlance').addEventListener('click', ev => {
  const s = (ev.target as any).closest('.seatb'); if (s) { cycleSeat(s.dataset.s); saveCompany(); renderLance(); return; } // R21 cp2
  const b = (ev.target as any).closest('.rf'); if (!b) return;
  if (G.co) { if (suitRefit(b.dataset.id, b.dataset.k)) { saveCompany(); renderLance(); } return; } // R21 cp3: parts + credits
  if (refit(b.dataset.id, b.dataset.k)) renderLance(); }); // R11 s2
$('bJ1').addEventListener('click', () => pickJob(1));
$('bReroll').addEventListener('click', () => { rerollJobs(); showJobs(); }); // R16 debug: fish for a mission type
$('bNewC').addEventListener('click', () => { G.ct = null; if (companyMode()) { saveCompany(); showCompany('CONTRACTS'); } else showLoadout(); });
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
// R18 cp3: the THERMAL toggle (remembered; tags the log). ON by default; OFF plays checkpoint 2 on its own (no heat is read).
function showHeat() { $('bHeat').textContent = 'THERMAL: ' + (TUNE.THERMAL_ENABLED ? 'ON' : 'OFF'); $('bHeat').classList.toggle('on', TUNE.THERMAL_ENABLED); }
TUNE.THERMAL_ENABLED = store.get('signalLance.thermal', true) !== false; showHeat();
$('bHeat').addEventListener('click', () => { TUNE.THERMAL_ENABLED = !TUNE.THERMAL_ENABLED; store.set('signalLance.thermal', TUNE.THERMAL_ENABLED); showHeat(); renderHangar(); });
// R16: the map toggle (remembered; tags the log). NEW DISTRICTS by default; OLD HIVE is the R15 map, for comparison.
function showMap() { $('bMap').textContent = 'MAP: ' + (TUNE.MAP_MODE === 'hive' ? 'OLD HIVE' : 'NEW DISTRICTS'); $('bMap').classList.toggle('on', TUNE.MAP_MODE !== 'hive'); }
TUNE.MAP_MODE = store.get('signalLance.map', 'blocks') === 'hive' ? 'hive' : 'blocks'; showMap();
$('bMap').addEventListener('click', () => { TUNE.MAP_MODE = TUNE.MAP_MODE === 'hive' ? 'blocks' : 'hive'; store.set('signalLance.map', TUNE.MAP_MODE); showMap(); });
// R21: the company toggle (remembered). ON: contracts run inside the saved company. OFF: the R11 contract flow.
function showCoMode() { $('bCoMode').textContent = 'COMPANY: ' + (TUNE.COMPANY_MODE ? 'ON' : 'OFF'); $('bCoMode').classList.toggle('on', TUNE.COMPANY_MODE); }
TUNE.COMPANY_MODE = store.get('signalLance.companyMode', true) !== false; showCoMode();
$('bCoMode').addEventListener('click', () => { TUNE.COMPANY_MODE = !TUNE.COMPANY_MODE; store.set('signalLance.companyMode', TUNE.COMPANY_MODE); showCoMode(); G.ct = null; if (TUNE.COMPANY_MODE) loadCompany(); else G.co = null; bindHangar(); showStart(); });
if (TUNE.COMPANY_MODE) loadCompany();
companyActions(startContract, resumeContract, () => { showLoadout(); });
$('tester').addEventListener('change', () => store.set('signalLance.tester', $('tester').value.trim()));
$('bCont').addEventListener('click', () => { store.set('signalLance.tester', $('tester').value.trim()); $('tester').blur(); $('splash').hidden = true; });
$('bBasics').addEventListener('click', () => { basicsFrom = 'splash'; $('splash').hidden = true; $('basics').hidden = false; $('basics').scrollTop = 0; });
$('bHelp').addEventListener('click', () => { basicsFrom = 'load'; $('basics').hidden = false; $('basics').scrollTop = 0; });
$('bBack').addEventListener('click', () => { $('basics').hidden = true; if (basicsFrom === 'splash') $('splash').hidden = false; });
buildBrief(BUILD);
buildQuestions();
buildHangar();
checkNewBuild(); setInterval(checkNewBuild, 5 * 60 * 1000);
$('bNew').addEventListener('pointerdown', e => { e.preventDefault(); // R18 fix list 15: the touch itself (iOS never sends click outside a panel)
  const u = location.href.split('#')[0].replace(/[?&]v=\d+/, ''); location.replace(u + (u.includes('?') ? '&' : '?') + 'v=' + Date.now() + location.hash); });
$('ver').textContent = $('lver').textContent = VERSION;
