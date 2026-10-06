import { TUNE } from '../tune.ts';
import { G } from '../sim/state.ts';
import { heardRange, sig, detStrength } from '../sim/sensors.ts';
import { uplinkBlock, upDist, shootBlock, playerTarget, mortarBlock, mortarBlindBlock, shotOdds, sensorsUp } from '../sim/turns.ts';
import { partHurt } from '../sim/combat.ts';
import { partsRead, hitText, PART_ABBR } from '../sim/combat.ts';
import { unitById } from '../sim/state.ts';
import { V } from './state.ts';
import { zoneOf, effEmit } from '../sim/zones.ts';
import { soundRadius } from '../sim/sound.ts';
import { revealed } from '../sim/ids.ts';
import { isType, quotaMet, isCarrier, pickupBlock, handoffBlock } from '../sim/mission.ts';
import { objectiveBlock, extractBlock } from '../sim/turns.ts';
import { allyHolding, orderBlock } from '../sim/escort.ts';
import { anchors } from '../sim/world.ts';
import { mapText } from '../sim/blocks.ts';

// ============================ HUD =====================================
export const $ = (id): any => document.getElementById(id);
export function fmtTime(s) { const m = Math.floor(s / 60), r = Math.floor(s % 60); return m + ':' + (r < 10 ? '0' : '') + r; }
let hudT = 0;
export function refreshHud() { hudT = 0; }
// R7 s2: initiative strip. Your mechs as A / B; a field unit as "?" only while you have a contact on it.
// Current activation highlighted; already-acted entries dimmed.
function initStrip() {
  if (G.mode !== 'hunt') return '';
  let h = '';
  G.order.forEach((m, i) => {
    if (m.dead) return;
    const mech = G.lance.includes(m);
    if (m === G.ally) { h += '<span class="ally' + (i === G.oi ? ' now' : i < G.oi ? ' done' : '') + '">T</span>'; return; } // R16 (Jamie): the transport's turn
    if (!mech && !G.pc.some(c => c.on && c.id === m.id)) return;
    h += '<span class="' + (mech ? 'me' : '') + (i === G.oi ? ' now' : i < G.oi ? ' done' : '') + '">' + (mech ? m.id : '?') + '</span>';
  });
  return h;
}
// R10: the active mech standing in a zone
function zoneHud(p) { const z = zoneOf(p); return !z ? '' : z.type === 'QUIET' ? '  <b style="color:#9cf">IN QUIET</b>' : '  <b style="color:#fc6">IN NOISE</b>'; }
export function updateHud(dt) {
  hudT -= dt; if (hudT > 0) return; hudT = G.act ? 0.05 : 0.2;
  $('init').innerHTML = initStrip();
  const p = G.p, mine = G.phase === 'PLAYER';
  const other = G.lance.find(m => m !== p);
  const turn = 'ROUND ' + G.turn + '  ' + (mine ? '<b>MECH ' + p.id + '</b>' : '<b>ENEMY…</b>') + (V.faceArm ? '  <b>TAP WHERE TO FACE</b>' : '') + (V.mortarArm ? '  <b>MORTAR: TAP A CONTACT (AIMED) OR THE MAP (BLIND)</b>' : '') + (mine ? '  turn: ' + (p.freeTurns > 0 ? 'free' : TUNE.AP_TURN + 'AP') : '') +
    (mine ? '  shots ' + p.turnShots + '/' + TUNE.SHOTS_PER_TURN : '') +
    (mine && G.plan && G.plan.drawn ? '  <b style="color:#8fe3ff">DRAWN PATH · looks ' + G.plan.wps.length + '/' + TUNE.FACE_WAYPOINTS_MAX + (V.wpWhy ? ' (' + V.wpWhy + ')' : '') + '</b>' : '') + // R17
    (G.intr && G.intr.id === p.id ? '  <b style="color:#ff8a5c">MOVE STOPPED: CONTACT (' + G.intr.ap + 'AP kept)</b>' : '');
  const pips = '<span id="ap">' + '●'.repeat(p.ap) + '○'.repeat(Math.max(0, TUNE.AP_BANK_MAX - p.ap)) + '</span>';
  $('hud').innerHTML = turn + '<br>AP ' + pips + '  (+' + TUNE.AP_PER_TURN + '/turn)' +
    '<br>EN <span id="pbar"><div id="pfill" style="width:' + Math.round(100 * p.en / p.enMax) + '%"></div></span> ' + Math.round(p.en) + '/' + p.enMax + '  (+' + TUNE.ENERGY_REGEN + '/turn)' +
    '<br>EMIT <span id="pbar"><div id="pfill" style="width:' + Math.round(100 * p.emit / TUNE.SIGNAL_MAX) + '%;background:#f93"></div></span> ' + Math.round(p.emit) + '  (−' + TUNE.SIGNAL_DECAY + '/turn)' +
      '  <b style="color:' + (p.sound ? '#e8f4ff' : '#778') + '">SOUND ' + (p.sound ? Math.round(soundRadius(p) * 10) / 10 : '–') + '</b>' + // R13: this activation's sound radius

    '<br><b>' + p.id + '</b> ' + partsRead(p) + (other ? '  <span style="color:#aab">' + other.id + ' ' + (other.dead ? 'destroyed' : other.out ? 'EXTRACTED' : partsRead(other)) + '</span>' : '') + // R12: per-part read
    '<br>' + (G.load.ammo ? '  AMMO ' + p.ammo : '') + (G.load.mortar ? '  SHELLS ' + p.shells : '') + '  KILLS ' + G.kills + '/' + G.units.length + '  T ' + fmtTime(G.time) + (heardRange(p) > 0 ? '  EMIT heard ~' + Math.round(heardRange(p)) + 't' : '  EMIT silent') + zoneHud(p) +
    (G.load.ecm ? '  ECM ' + (p.mask ? 'ON' : 'off') + (G.ghost.on ? '  GHOST ' + G.ghost.turns + 't' : '') : '') +
    oddsLine(p) + shotLine('P') + shotLine('E') +
    (G.splash ? '<br><b style="color:' + (G.splash.hit ? '#f63' : '#aaa') + '">SPLASH: ' + (G.splash.hit ? 'hit' : 'miss') + '</b>' : '') +
    goalLine(p) +

    (V.dbg ? '<br>DBG ' + (G.ct ? 'ct ' + G.ct.seed + ' H' + G.ct.hunt + ' · hunt ' : '') + 'seed ' + G.seed + ' · ' + G.comp.NAME + ' · ' + mapText(G.zones.length) + '  ' + G.units.map(u => u.type.slice(0, 4) + '/' + u.variant + (u.dead ? ' X' : ' ' + u.state + (u.pack ? '/' + u.pack + (u.packTgt ? '→' + u.packTgt : '') : '') + ' E' + Math.round(u.emit) + ' snd' + Math.round(soundRadius(u)) + ' heard[' + u.ec.filter(c => c.on && (c.snd || c.shr)).map(c => c.id + (c.snd ? 's' : 'a')).join(',') + ']')).join(' | ') + // R13: EMIT, sound, sound(s)/alarm(a) contacts
      '<br>DBG pack ' + (TUNE.PACK_ENABLED ? 'ON' : 'off') + ' · alarms ' + G.alarmLog.length + (G.alarmLog.length ? ' (last R' + G.alarmLog[G.alarmLog.length - 1].turn + ' ' + G.alarmLog[G.alarmLog.length - 1].from + '→' + G.alarmLog[G.alarmLog.length - 1].to.join(',') + ' on ' + G.alarmLog[G.alarmLog.length - 1].mech + ')' : '') + ' · lance snd ' + G.lance.map(m => m.id + Math.round(soundRadius(m))).join(' ') +
      '<br>DBG zones ' + G.zones.map(z => z.type[0] + ':' + z.name).join(', ') + '  me eff S' + Math.round(effEmit(p)) +
      dbgShot('P') + dbgShot('E') +
      '<br>DBG sig ' + G.units.map(u => u.dead ? '-' : u.type[0] + sig(u).toFixed(1) + ' ' + detStrength(p, u).toFixed(2) + '/' + detStrength(u, p).toFixed(2)).join('  ') + '  (sig me→it/it→me)' : '');
}
// R15: the mission line. Uplink: progress pips and range. Bounty: earned / quota, the last kill's pop, and the call at quota.
function goalLine(p) {
  if (isType('ESCORT') && G.ally) { // R15 s3
    const a = G.ally, N = anchors().waypoints, L = anchors().legs;
    const where = allyHolding() ? '<b style="color:#7e9">HOLDING at ' + N[a.node].name + ': tap a route on the map</b>' : a.leg >= 0 ? 'heading for ' + N[L[a.leg].to].name : 'moving';
    const lev = anchors().junctions.filter(j => !a.passed.includes(j)).map(j => N[j].name.replace('fork at ', '') + ' ' + (a.levers[j] !== undefined ? L[a.levers[j]].name : '—')).join(', ');
    const ord = (lev ? '  levers: ' + lev : '') + (a.order ? '  <b style="color:#fc3">' + (a.order === 'HOLD' ? 'HOLDING next round' : 'SPRINTING next move') + '</b>' : '');
    return '<br>TRANSPORT <b style="color:#7e9">' + Math.max(0, a.hits) + '/' + a.maxHits + ' hits</b>  ' + where + ord + '  <span style="color:#aab">(the hunt ends when it and your mechs are out: EXTRACT at the right edge)</span>';
  }
  if (isType('RETRIEVE')) { // R15 s2
    const M = G.mission;
    if (!M.carrier) return '<br>CARGO <b style="color:#fc3">at ' + G.up.name + '</b>' + (pickupBlock(p) !== 'RANGE' ? '  <b>IN RANGE: PICK UP</b>' : '  ' + Math.round(upDist(p)) + 't away') + '  (grabbing it alerts the whole field)';
    return '<br>CARGO <b style="color:#fc3">carried by ' + M.carrier + '</b>  get it out the right edge · no sprint while carrying' + (M.handoffs ? ' · hand-offs ' + M.handoffs : '') + '  <b style="color:#f66">FIELD HUNTING THE CARRIER</b>';
  }
  if (isType('BOUNTY')) {
    const M = G.mission, met = quotaMet();
    return '<br>BOUNTY <b style="color:' + (met ? '#6f6' : '#fc3') + '">' + M.earned + ' / ' + M.quota + ' cr</b>' +
      (met ? '  <b style="color:#6f6">QUOTA MET: extract (right edge) or push for more</b>' : '  extract any time (keeps what you earned)') +
      (G.pop ? '  <b style="color:#fc3">+' + G.pop.b + ' ' + G.pop.v + '</b>' : '');
  }
  return '<br>UPLINK <span style="color:#fc3">' + '◆'.repeat(G.up.prog) + '◇'.repeat(Math.max(0, TUNE.UPLINK_TURNS - G.up.prog)) + '</span> ' + G.up.name +
    (uplinkBlock() !== 'RANGE' ? '  <b>IN RANGE</b>' : '  ' + Math.round(upDist(p)) + 't away');
}
// R12: the odds breakdown for the shot FIRE would take now (shown whenever FIRE is allowed)
function oddsLine(p) {
  if (G.mode !== 'hunt' || G.phase !== 'PLAYER' || !G.load.ammo) return '';
  const c = playerTarget(); if (shootBlock(p, c, TUNE.PLAYER_FIRE_UNC, TUNE.PLAYER_FIRE_RANGE) !== '') return '';
  const h = shotOdds(p, c); return h ? '<br><b style="color:#ff6">ODDS ' + h.pct + '%</b>: ' + hitText(h) : '';
}
// R12: last shot by the lance ('P') / the field ('E'): "A → patrol: HIT LEG (62%)" / "turret → B: MISS (40%)"
function who(id) { const u = unitById(id); return !u ? '?' : G.lance.includes(u) ? u.id : u === G.ally ? 'transport' : u.ft.NAME; } // R16 fix: the Escort transport has no field type (crashed the HUD the first time it was shot at)
function shotLine(k) {
  const r = G.lastShot[k]; if (!r || G.turn - r.turn > 1) return '';
  const res = r.hit ? 'HIT ' + (PART_ABBR[r.part] || r.part) : 'MISS';
  return '<br><b style="color:' + (r.hit ? (k === 'P' ? '#6f6' : '#f66') : '#aaa') + '">' + who(r.shooter) + ' → ' + who(r.target) + ': ' + res + ' (' + r.pct + '%)</b>';
}
function dbgShot(k) { const r = G.lastShot[k]; return r ? '<br>DBG last ' + (k === 'P' ? 'lance' : 'field') + ' shot ' + r.shooter + '→' + r.target + ' ' + r.pct + '% = ' + hitText(r) + ' · range ' + r.rangeT.toFixed(1) + 't moved ' + r.movedT.toFixed(1) + 't · ' + (r.roll ? 'rolled HIT' : 'rolled MISS') + (r.hit ? ' ' + r.part : '') : ''; }
// label + small cost/reason line; lockd = can't do it now
export function setBtn(id, label, sub, ok, on?) {
  const b = $(id); b.innerHTML = label + (sub ? '<br><small>' + sub + '</small>' : '');
  b.classList.toggle('lockd', !ok); b.classList.toggle('on', !!on);
}
export function costWhy(ap, en) { const p = G.p; return p.ap < ap ? 'AP' : p.en < en ? 'EN' : ''; }
export function syncButtons() {
  const p = G.p, free = G.mode === 'hunt' && G.phase === 'PLAYER' && !G.act;
  // move modes + MOVE
  for (const [id, m] of [['bCreep', 'CREEP'], ['bNorm', 'NORMAL'], ['bSprint', 'SPRINT']]) {
    const lab = { CREEP: 'CREEP', NORMAL: 'NORM', SPRINT: 'SPRINT' }[m];
    const lame = m !== 'CREEP' && partHurt(p, 'LEGS'); // R13: a leg gone locks NORM and SPRINT
    const cargo = m === 'SPRINT' && TUNE.RETRIEVE_NO_SPRINT && isCarrier(p); // R15: the carrier can't sprint
    setBtn(id, lab, lame ? 'LEGS' : cargo ? 'CARGO' : TUNE.MOVE_TILES_PER_AP[m] + 't/AP ' + TUNE.MOVE_ENERGY_PER_TILE[m] + 'EN · snd ' + TUNE.SOUND_RANGE[m], free && !lame && !cargo, G.pmode === m); // R13: the sound it makes
  }
  const pl = G.plan;
  if (V.faceArm) setBtn('bMove', 'CANCEL', 'face', free, true);
  else setBtn('bMove', 'MOVE', !pl ? (TUNE.DRAW_PATH_ENABLED ? 'TAP OR DRAW' : 'TAP MAP') : pl.path ? pl.ap + 'AP ' + pl.en + 'EN' : pl.why, free && pl && pl.path); // R17: or draw from your ExoS
  // radar pulse
  $('bRadar').hidden = !G.load.radar;
  const sns = sensorsUp(p) ? '' : 'SNS'; // R13 test 2: sensors gone = no radar, ECM or ghost (the buttons said nothing before)
  let w = sns || costWhy(TUNE.AP_RADAR, TUNE.RADAR_EN);
  setBtn('bRadar', 'RADAR', w || TUNE.AP_RADAR + 'AP ' + TUNE.RADAR_EN + 'EN +' + TUNE.SIGNAL_RADAR + 'EMIT', free && !w);
  // ECM + ghost
  $('bEcm').hidden = $('bGhost').hidden = !G.load.ecm;
  w = sns || costWhy(TUNE.AP_ECM, TUNE.ECM_EN);
  if (p.mask) setBtn('bEcm', 'ECM ON', TUNE.AP_ECM + 'AP ' + TUNE.ECM_EN + 'EN/turn', free, true);
  else setBtn('bEcm', 'ECM', w || TUNE.AP_ECM + 'AP ' + TUNE.ECM_EN + 'EN', free && !w);
  w = sns || costWhy(TUNE.AP_ECM, TUNE.GHOST_COST);
  if (G.ghost.on) setBtn('bGhost', 'GHOST', G.ghost.turns + ' turns', false, true);
  else if (V.ghostArm) setBtn('bGhost', 'TAP MAP', 'to place', free, true);
  else setBtn('bGhost', 'GHOST', w || TUNE.AP_ECM + 'AP ' + TUNE.GHOST_COST + 'EN', free && !w);
  // fire
  $('bFire').hidden = !G.load.ammo;
  w = shootBlock(p, playerTarget(), TUNE.PLAYER_FIRE_UNC, TUNE.PLAYER_FIRE_RANGE);
  const odds = w ? null : shotOdds(p, playerTarget()); // R12: the hit chance on the button
  setBtn('bFire', odds ? 'FIRE ' + odds.pct + '%' : 'FIRE', w || TUNE.AP_SHOT + 'AP', free && !w);
  // R9: mortar (only on a mech carrying it)
  $('bMortar').hidden = !G.load.mortar;
  const wb = mortarBlindBlock(p); w = mortarBlock(p, playerTarget());
  if (V.mortarArm) setBtn('bMortar', 'TAP TARGET', V.mortarWhy || (w ? 'map = blind' : 'contact or map'), free, true);
  else setBtn('bMortar', 'MORTAR', wb || TUNE.AP_MORTAR + 'AP · ' + p.shells + ' left' + (w ? ' · blind' : ''), free && !wb);
  setBtn('bEnd', 'END TURN', '', free);
  // R14: ID the selected contact (not once eyes have shown what it is)
  const sc = G.sel && G.sel.on ? G.sel : null, idv = sc && G.ids[sc.id] ? G.ids[sc.id].v : '';
  setBtn('bId', 'ID', !sc ? 'TAP ONE' : revealed(sc.id) ? 'SEEN' : idv ? idv + '?' : 'UNKNOWN', G.mode === 'hunt' && !!sc && !revealed(sc.id));
  // Round 5: uplink
  $('bUp').hidden = isType('BOUNTY') || isType('ESCORT'); // R15: Bounty and Escort have no objective button (Escort uses route buttons on the map); Retrieve uses it for PICK UP / HAND OFF
  w = G.mode === 'hunt' ? objectiveBlock() : 'RANGE';
  if (isType('RETRIEVE') && isCarrier(p)) setBtn('bUp', 'HAND OFF', w || TUNE.RETRIEVE_HANDOFF_AP + 'AP', free && !w);
  else if (isType('RETRIEVE')) setBtn('bUp', 'PICK UP', w === 'HELD' ? G.mission.carrier + ' HAS IT' : w || TUNE.RETRIEVE_PICKUP_AP + 'AP · LOUD', free && !w);
  else setBtn('bUp', 'UPLINK', w || TUNE.AP_UPLINK + 'AP +' + TUNE.SIG_UPLINK + 'EMIT', free && !w);
  // R16: EXTRACT, while the active mech stands in the extraction zone
  $('bExtract').hidden = G.mode !== 'hunt' || extractBlock() !== '';
  if (!$('bExtract').hidden) setBtn('bExtract', 'EXTRACT', 'leave the map', free);
  // R16: convoy orders (Escort only). Lit = pending; tap again to cancel.
  const esc = isType('ESCORT') && !!G.ally && !G.ally.dead; $('bHold').hidden = $('bHurry').hidden = !esc;
  if (esc) for (const [id, k, left] of [['bHold', 'HOLD', G.ally.holdsLeft], ['bHurry', 'HURRY', G.ally.hurriesLeft]]) {
    const b = orderBlock(k), on = G.ally.order === k;
    setBtn(id, k, on ? 'NEXT MOVE' : b === 'FORK' ? 'AT FORK' : b === 'USED' ? 'NONE LEFT' : left + ' left', free && b === '', on);
  }
  hudT = 0;
}
