import { TUNE } from '../tune.ts';
import { has, fitted, offWhy, radarOf, mortarOf, irOf, irRange } from '../sim/kit.ts';
import { fireRange } from '../sim/turns.ts';
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
import { moveModeBlock } from '../sim/reasons.ts';
import { lowHits, hitsLeft } from '../sim/warn.ts';
import { whyShort } from './glossary.ts';
import { cmdMoveMode } from '../sim/turns.ts';
// R24 B6: a tap on the compact HUD opens the full block; the next tap closes it (a long-press explains instead: explain.ts)
document.getElementById('hud')?.addEventListener('pointerup', () => { if (window.innerHeight <= TUNE.HUD_COMPACT_H || V.hudOver) { V.hudOpen = !V.hudOpen; hudT = 0; } });
// R24 A2: a HUD term the player can long-press (its glossary entry)
const g = (id: string, text = id) => '<span data-g="' + id + '">' + text + '</span>';

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
    if (m === G.ally) { h += '<span data-g="T" class="ally' + (i === G.oi ? ' now' : i < G.oi ? ' done' : '') + '">T</span>'; return; } // R16 (Jamie): the transport's turn
    if (!mech && !G.pc.some(c => c.on && c.id === m.id)) return;
    h += '<span data-g="ORDER" class="' + (mech ? 'me' : '') + (i === G.oi ? ' now' : i < G.oi ? ' done' : '') + '">' + (mech ? m.id : '?') + '</span>';
  });
  return h;
}
// R10: the active mech standing in a zone
function zoneHud(p) { const z = zoneOf(p); return !z ? '' : z.type === 'QUIET' ? '  <b style="color:#9cf">' + g('QUIET', 'IN QUIET') + '</b>' : '  <b style="color:#fc6">' + g('NOISE', 'IN NOISE') + '</b>'; }
// R24 A5 (C12): "A: 2 CORE hits left" for every ExoS at or under WARN_HITS_LEFT; a DOWN one says what carrying does
function warnLine() {
  const low = G.lance.filter(m => lowHits(m)).map(m => m.id + ': ' + hitsLeft(m) + ' CORE hit' + (hitsLeft(m) === 1 ? '' : 's') + ' left');
  return low.length ? '<br><b style="color:#ff8a80">' + g('HITS LEFT', '! ' + low.join(' · ')) + '</b>' : '';
}
function otherLine(o, many: boolean) {
  if (o.dead) return o.crit ? (o.carriedBy ? g('CARRIED BY', 'CRITICAL, carried by ' + o.carriedBy) : '<b style="color:#ff8a80">' + g('CRITICAL', 'CRITICAL: end a lancemate’s turn next to ' + o.id + ' to carry its operator out') + '</b>') : g('DOWN', 'destroyed');
  if (o.out) return g('EXTRACTED', 'EXTRACTED');
  return many ? o.hits + '/' + o.maxHits : partsHud(o);
}
// the per-part read with each part and state long-pressable
function partsHud(u) { return partsRead(u).split(' · ').map(t => { const [pt, st] = t.split(' '); return g(pt) + ' ' + g(st); }).join(' · '); }
export function updateHud(dt) {
  hudT -= dt; if (hudT > 0) return; hudT = G.act ? 0.05 : 0.2;
  $('init').innerHTML = initStrip();
  const p = G.p, mine = G.phase === 'PLAYER';
  const others = G.lance.filter(m => m !== p);
  const turn = g('ROUND') + ' ' + G.turn + '  ' + (mine ? '<b>' + g('ExoS') + ' ' + p.id + (p.op ? ' · ' + p.op.name + ' (' + TUNE.OP_SKILL_NAMES[p.op.skill] + ' ' + p.op.lvl + (p.op.lvl >= 2 ? '★' : '') + ')' : '') + '</b>' : '<b>ENEMY…</b>') + (V.faceArm ? '  <b>' + g('TAP WHERE TO FACE') + '</b>' : '') + (V.lookArm !== null ? '  <b style="color:#ff6">TAP WHERE IT SHOULD LOOK</b>' : '') + (V.mortarArm ? '  <b>MORTAR: TAP A CONTACT (AIMED) OR THE MAP (BLIND)</b>' : '') + (mine && TUNE.AP_TURN > 0 ? '  turn: ' + (p.freeTurns > 0 ? 'free' : TUNE.AP_TURN + 'AP') : '') + // r17-s4: turning costs nothing (AP_TURN 0): no cost shown
    (mine ? '  ' + g('shots') + ' ' + p.turnShots + '/' + TUNE.SHOTS_PER_TURN : '') +
    (mine && G.plan && G.plan.drawn ? '  <b style="color:#8fe3ff">DRAWN PATH · ' + g('looks') + ' ' + G.plan.wps.length + '/' + TUNE.FACE_WAYPOINTS_MAX + (V.wpWhy ? ' (' + V.wpWhy + ')' : '') + '</b>' : '') + // R17
    (G.intr && G.intr.id === p.id ? '  <b style="color:#ff8a5c">' + g('MOVE STOPPED', 'MOVE STOPPED: CONTACT (' + G.intr.ap + ' AP kept)') + '</b>' : '');
  const pips = '<span id="ap">' + '●'.repeat(p.ap) + '○'.repeat(Math.max(0, TUNE.AP_BANK_MAX - p.ap)) + '</span>';
  const full = turn + '<br>' + g('AP') + ' ' + pips + '  (+' + TUNE.AP_PER_TURN + '/turn)' +
    '<br>' + g('EN') + ' <span id="pbar"><div id="pfill" style="width:' + Math.round(100 * p.en / p.enMax) + '%"></div></span> ' + Math.round(p.en) + '/' + p.enMax + '  (+' + (p.regen ?? TUNE.ENERGY_REGEN) + '/turn)' +
    '<br>' + g('EMIT') + ' <span id="pbar"><div id="pfill" style="width:' + Math.round(100 * p.emit / TUNE.SIGNAL_MAX) + '%;background:#f93"></div></span> ' + Math.round(p.emit) + '  (−' + TUNE.SIGNAL_DECAY + '/turn)' +
      '  <b style="color:' + (p.sound ? '#e8f4ff' : '#778') + '">' + g('SOUND') + ' ' + (p.sound ? Math.round(soundRadius(p) * 10) / 10 : '–') + '</b>' + // R13: this activation's sound radius

    '<br><b>' + p.id + '</b> ' + partsHud(p) + others.map(o => '  <span style="color:#aab">' + o.id + ' ' + otherLine(o, others.length > 1) + '</span>').join('') + // R21 cp2: every other suit (short when there are several) // R12: per-part read
    warnLine() +
    '<br>' + (has(p, 'GUN') ? '  ' + g('AMMO') + ' ' + p.ammo : '') + (has(p, 'MORTAR') ? '  ' + g('SHELLS') + ' ' + p.shells : '') + '  ' + g('KILLS') + ' ' + G.kills + '/' + G.units.length + '  ' + g('TIME') + ' ' + fmtTime(G.time) + (heardRange(p) > 0 ? '  ' + g('EMIT') + ' heard ~' + Math.round(heardRange(p)) + 't' : '  ' + g('EMIT') + ' silent') + (TUNE.THERMAL_ENABLED ? '  ' + g('IR') + ' ' + Math.round(irOf(p)) + ' (~' + Math.round(irRange(p)) + 't)' : '') + zoneHud(p) + // R18 cp3: heat, and how far a thermal sight sees it
    (has(p, 'MASK') ? '  ' + g('ECM') + ' ' + (p.mask ? 'ON' : 'off') : '') + (has(p, 'GHOST') && G.ghost.on ? '  ' + g('GHOST') + ' ' + G.ghost.turns + ' turns' : '') +
    oddsLine(p) + shotLine('P') + shotLine('E') +
    (G.splash ? '<br><b style="color:' + (G.splash.hit ? '#f63' : '#aaa') + '">SPLASH: ' + (G.splash.hit ? 'hit' : 'miss') + '</b>' : '') +
    goalLine(p) +

    (V.dbg ? '<br>DBG ' + (G.ct ? 'ct ' + G.ct.seed + ' H' + G.ct.hunt + ' · hunt ' : '') + 'seed ' + G.seed + ' · ' + G.comp.NAME + ' · ' + mapText(G.zones.length) + '  ' + G.units.map(u => u.type.slice(0, 4) + '/' + u.variant + (u.dead ? ' X' : ' ' + u.state + (u.pack ? '/' + u.pack + (u.packTgt ? '→' + u.packTgt : '') : '') + ' E' + Math.round(u.emit) + ' snd' + Math.round(soundRadius(u)) + ' heard[' + u.ec.filter(c => c.on && (c.snd || c.shr)).map(c => c.id + (c.snd ? 's' : 'a')).join(',') + ']')).join(' | ') + // R13: EMIT, sound, sound(s)/alarm(a) contacts
      '<br>DBG pack ' + (TUNE.PACK_ENABLED ? 'ON' : 'off') + ' · alarms ' + G.alarmLog.length + (G.alarmLog.length ? ' (last R' + G.alarmLog[G.alarmLog.length - 1].turn + ' ' + G.alarmLog[G.alarmLog.length - 1].from + '→' + G.alarmLog[G.alarmLog.length - 1].to.join(',') + ' on ' + G.alarmLog[G.alarmLog.length - 1].mech + ')' : '') + ' · lance snd ' + G.lance.map(m => m.id + Math.round(soundRadius(m))).join(' ') +
      '<br>DBG zones ' + G.zones.map(z => z.type[0] + ':' + z.name).join(', ') + '  me eff S' + Math.round(effEmit(p)) +
      dbgShot('P') + dbgShot('E') +
      '<br>DBG sig ' + G.units.map(u => u.dead ? '-' : u.type[0] + sig(u).toFixed(1) + ' ' + detStrength(p, u).toFixed(2) + '/' + detStrength(u, p).toFixed(2)).join('  ') + '  (sig me→it/it→me)' : '');
  // R24 B6 (C03): on a short screen (or when the full block runs off the screen) the HUD is one line. A tap opens the full
  // block as a panel in the same slot, and the next tap closes it.
  const el = $('hud'), compact = window.innerHeight <= TUNE.HUD_COMPACT_H || V.hudOver;
  if (compact && !V.hudOpen) { el.innerHTML = compactLine(p, mine); el.className = 'compact'; }
  else {
    el.innerHTML = full + (compact ? '<br><small style="opacity:.7">Tap here to close.</small>' : ''); el.className = compact ? 'open' : '';
    if (!compact && !V.dbg) { // the full block overran the screen edge or reached the left buttons: go compact until the window changes
      const r = el.getBoundingClientRect(), lc = $('lcol').getBoundingClientRect();
      if (r.right > window.innerWidth - 8 || (lc.height && r.bottom > lc.top - 4)) V.hudOver = true;
    }
  }
  measureSafe();
}
// R24 B6: the one-line HUD: the active ExoS, AP and EN, the objective and its distance (from which ExoS), and any warning
function compactLine(p, mine: boolean) {
  const low = G.lance.filter(m => lowHits(m)).map(m => m.id + ' ' + hitsLeft(m)).join(' ');
  const prompt = V.faceArm ? 'TAP WHERE TO FACE' : V.lookArm !== null ? 'TAP WHERE IT SHOULD LOOK' : V.mortarArm ? 'MORTAR: TAP A CONTACT OR THE MAP' : G.intr && G.intr.id === p.id ? 'MOVE STOPPED' : '';
  return '<span class="hl">' + g('ROUND', 'R') + G.turn + ' · ' + (mine ? '<b>' + g('ExoS') + ' ' + p.id + '</b> · ' + g('AP') + ' ' + p.ap + '/' + TUNE.AP_BANK_MAX + ' · ' + g('EN') + ' ' + Math.round(p.en) : '<b>ENEMY…</b>') +
    ' · ' + compactGoal(p) + (low ? ' · <b style="color:#ff8a80">' + g('HITS LEFT', '! ' + low) + '</b>' : '') +
    (prompt ? ' · <b style="color:#ff6">' + (prompt === 'MOVE STOPPED' ? g('MOVE STOPPED') : prompt === 'TAP WHERE TO FACE' ? g('TAP WHERE TO FACE') : prompt) + '</b>' : '') + ' <span class="more">▾</span></span>';
}
function compactGoal(p) {
  if (isType('ESCORT') && G.ally) return g('TRANSPORT') + ' ' + Math.max(0, G.ally.hits) + '/' + G.ally.maxHits + (allyHolding() ? ' <b style="color:#7e9">WAITING</b>' : '');
  if (isType('RETRIEVE')) return G.mission.carrier ? g('CARGO') + ' carried by ' + G.mission.carrier : g('CARGO') + ' ' + Math.round(upDist(p)) + 't from ' + p.id; // fix list 3 (C04)
  if (isType('BOUNTY')) return g('BOUNTY') + ' ' + G.mission.earned + '/' + G.mission.quota + ' cr';
  return g('UPLINK') + ' ' + G.up.prog + '/' + TUNE.UPLINK_TURNS + ' · ' + (uplinkBlock() !== 'RANGE' ? 'IN RANGE' : Math.round(upDist(p)) + 't from ' + p.id);
}
// R24 B7 (C07): the map area no overlay covers (screen px), measured from the real overlay rectangles
function measureSafe() {
  const vw = window.innerWidth, vh = window.innerHeight, pad = TUNE.CAM_SAFE_PAD, R = (id: string) => { const e = $(id); return e && !e.hidden ? e.getBoundingClientRect() : null; };
  const lc = R('lcol'), rc = R('rcol'), br = R('brow'), hu = R('hud'), it = R('init');
  const l = lc && lc.width ? lc.right + pad : pad, r = rc && rc.width ? rc.left - pad : vw - pad;
  const t = Math.max(hu && hu.height && !V.hudOpen ? hu.bottom : 0, it && it.height ? it.bottom : 0) + pad; // the opened HUD panel is a passing look: not counted
  const b = br && br.height ? br.top - pad : vh - pad;
  V.safe = r - l > 80 && b - t > 60 ? { l, t, r, b } : null; // too small to mean anything: centre as before
}
// R15: the mission line. Uplink: progress pips and range. Bounty: earned / quota, the last kill's pop, and the call at quota.
function goalLine(p) {
  if (isType('ESCORT') && G.ally) { // R15 s3
    const a = G.ally, N = anchors().waypoints, L = anchors().legs;
    const where = allyHolding() ? '<b style="color:#7e9">WAITING at ' + N[a.node].name + ': tap a ' + g('ROUTE') + ' on the map</b>' : a.leg >= 0 ? 'heading for ' + N[L[a.leg].to].name : 'moving';
    const lev = anchors().junctions.filter(j => !a.passed.includes(j)).map(j => N[j].name.replace('fork at ', '') + ' ' + (a.levers[j] !== undefined ? L[a.levers[j]].name + ' ✓' : 'not set')).join(', ');
    const ord = (lev ? '  ' + g('ROUTE', 'ROUTES') + ': ' + lev : '') + (a.order ? '  <b style="color:#fc3">' + (a.order === 'HOLD' ? 'HOLDS next round' : 'SPRINTS next move') + '</b>' : '');
    return '<br>' + g('TRANSPORT') + ' <b style="color:#7e9">' + Math.max(0, a.hits) + '/' + a.maxHits + ' hits</b>  ' + where + ord + '  <span style="color:#aab">(the hunt ends when it and your ExoS are out: EXTRACT at the right edge)</span>';
  }
  if (isType('RETRIEVE')) { // R15 s2
    const M = G.mission;
    if (!M.carrier) return '<br>' + g('CARGO') + ' <b style="color:#fc3">at ' + G.up.name + '</b>' + (pickupBlock(p) !== 'RANGE' ? '  <b>IN RANGE: ' + g('PICK UP') + '</b>' : '  ' + Math.round(upDist(p)) + 't from ' + p.id + ' (' + g('PICK UP') + ' at ' + (TUNE.UPLINK_RADIUS + 0.5) + 't)') + '  (a PICK UP alerts the whole field)'; // R24 fix list 3 (C04): from which ExoS
    return '<br>' + g('CARGO') + ' <b style="color:#fc3">carried by ' + M.carrier + '</b>  carry it out at the right edge · no SPRINT while carrying' + (M.handoffs ? ' · hand-offs ' + M.handoffs : '') + '  <b style="color:#f66">THE FIELD HUNTS THE CARRIER</b>';
  }
  if (isType('BOUNTY')) {
    const M = G.mission, met = quotaMet();
    return '<br>' + g('BOUNTY') + ' <b style="color:' + (met ? '#6f6' : '#fc3') + '">' + M.earned + ' / ' + M.quota + ' cr</b>' +
      (met ? '  <b style="color:#6f6">QUOTA MET: extract (right edge) or push for more</b>' : '  extract any time (keeps what you earned)') +
      (G.pop ? '  <b style="color:#fc3">+' + G.pop.b + ' ' + G.pop.v + '</b>' : '');
  }
  return '<br>' + g('UPLINK') + ' <span style="color:#fc3">' + '◆'.repeat(G.up.prog) + '◇'.repeat(Math.max(0, TUNE.UPLINK_TURNS - G.up.prog)) + '</span> ' + G.up.name +
    (uplinkBlock() !== 'RANGE' ? '  <b>IN RANGE</b>' : '  ' + Math.round(upDist(p)) + 't from ' + p.id); // R24 fix list 3 (C04): from which ExoS
}
// R12: the odds breakdown for the shot FIRE would take now (shown whenever FIRE is allowed)
function oddsLine(p) {
  if (G.mode !== 'hunt' || G.phase !== 'PLAYER' || !has(p, 'GUN')) return '';
  const c = playerTarget(); if (shootBlock(p, c, TUNE.PLAYER_FIRE_UNC, fireRange(p)) !== '') return '';
  const h = shotOdds(p, c); return h ? '<br><b style="color:#ff6">' + g('ODDS') + ' ' + h.pct + '%</b>: ' + hitText(h) : '';
}
// R12: last shot by the lance ('P') / the field ('E'): "A → patrol: HIT LEG (62%)" / "turret → B: MISS (40%)"
function who(id) { const u = unitById(id); return !u ? '?' : G.lance.includes(u) ? u.id : u === G.ally ? 'transport' : u.ft.NAME; } // R16 fix: the Escort transport has no field type (crashed the HUD the first time it was shot at)
function shotLine(k) {
  const r = G.lastShot[k]; if (!r || G.turn - r.turn > 1) return '';
  const res = r.hit ? 'HIT ' + (PART_ABBR[r.part] || r.part) : 'MISS';
  return '<br><b style="color:' + (r.hit ? (k === 'P' ? '#6f6' : '#f66') : '#aaa') + '">' + who(r.shooter) + ' → ' + who(r.target) + ': ' + res + ' (' + r.pct + '%)</b>';
}
function dbgShot(k) { const r = G.lastShot[k]; return r ? '<br>DBG last ' + (k === 'P' ? 'lance' : 'field') + ' shot ' + r.shooter + '→' + r.target + ' ' + r.pct + '% = ' + hitText(r) + ' · range ' + r.rangeT.toFixed(1) + 't moved ' + r.movedT.toFixed(1) + 't · ' + (r.roll ? 'rolled HIT' : 'rolled MISS') + (r.hit ? ' ' + r.part : '') : ''; }
// label + small cost/reason line; lockd = can't do it now. R24 A3: why = the reason key ('FIRE.LOS') a tap on the greyed
// button explains (explain.ts); a button greyed only because it isn't your turn says TURN.WAIT.
export function setBtn(id, label, sub, ok, on?, why = '') {
  const b = $(id); b.innerHTML = label + (sub ? '<br><small>' + sub + '</small>' : '');
  b.dataset.label = label; b.dataset.why = ok ? '' : why || 'TURN.WAIT';
  b.classList.toggle('lockd', !ok); b.classList.toggle('on', !!on);
}
export function costWhy(ap, en) { const p = G.p; return p.ap < ap ? 'AP' : p.en < en ? 'EN' : ''; }
// R24 A3: the reason word a greyed button shows, and the key its tap explains
const W = (act: string, code: string) => [whyShort(act, code), act + '.' + code];
export function syncButtons() {
  const p = G.p, free = G.mode === 'hunt' && G.phase === 'PLAYER' && !G.act;
  // R24 fix list 11 (C23): a mode the ExoS can't use (a leg damaged mid-turn, say) drops back to CREEP, so MOVE never sticks
  { const mb = free ? moveModeBlock(p, G.pmode) : ''; if (mb) cmdMoveMode(mb === 'CARGO' ? 'NORMAL' : 'CREEP'); }
  // move modes + MOVE
  for (const [id, m] of [['bCreep', 'CREEP'], ['bNorm', 'NORMAL'], ['bSprint', 'SPRINT']]) {
    const b = moveModeBlock(p, m); // R13: a leg damaged locks NORMAL and SPRINT. R15: the carrier can't sprint
    const [ws, wk] = b ? W('MODE', b) : ['', ''];
    setBtn(id, m, b ? ws : TUNE.MOVE_TILES_PER_AP[m] + 't/AP ' + (TUNE.MOVE_ENERGY_PER_TILE[m] + (p.over ? p.over.en || 0 : 0)) + 'EN · snd ' + (TUNE.SOUND_RANGE[m] + (p.over ? p.over.snd : 0)), free && !b, G.pmode === m, wk); // R13: the sound it makes. R24: NORMAL (was NORM)
  }
  const pl = G.plan;
  if (V.faceArm) setBtn('bMove', 'CANCEL', 'face', free, true);
  else { const mw = !pl ? 'NOPLAN' : pl.path ? '' : pl.why; setBtn('bMove', 'MOVE', !pl ? (TUNE.DRAW_PATH_ENABLED ? 'TAP OR DRAW' : 'TAP MAP') : pl.path ? pl.ap + 'AP ' + pl.en + 'EN' : whyShort('MOVE', pl.why), free && pl && pl.path, false, mw ? 'MOVE.' + mw : ''); } // R17: or draw from your ExoS
  // radar pulse
  const R = radarOf(p); // R18: the radar row's costs
  $('bRadar').hidden = !fitted(p, 'RADAR');
  // R13 test 2: a module's part gone = the button says which (R18: its own location's part)
  let w = R ? costWhy(R.ap, R.en) : offWhy(p, 'RADAR') || 'NONE';
  setBtn('bRadar', 'RADAR', w ? W('RADAR', w)[0] : R.ap + 'AP ' + R.en + 'EN +' + R.emit + 'EMIT', free && !w, false, w ? 'RADAR.' + w : '');
  // ECM + ghost
  $('bEcm').hidden = !fitted(p, 'MASK'); $('bGhost').hidden = !fitted(p, 'GHOST'); // R18: two rows now
  w = offWhy(p, 'MASK') || costWhy(TUNE.AP_ECM, TUNE.ECM_EN);
  if (p.mask) setBtn('bEcm', 'ECM ON', TUNE.AP_ECM + 'AP ' + TUNE.ECM_EN + 'EN/turn', free, true);
  else setBtn('bEcm', 'ECM', w ? W('ECM', w)[0] : TUNE.AP_ECM + 'AP ' + TUNE.ECM_EN + 'EN', free && !w, false, w ? 'ECM.' + w : '');
  w = offWhy(p, 'GHOST') || costWhy(TUNE.AP_ECM, TUNE.GHOST_COST);
  if (G.ghost.on) setBtn('bGhost', 'GHOST', G.ghost.turns + ' turns', false, true, 'GHOST.ON');
  else if (V.ghostArm) setBtn('bGhost', 'TAP MAP', 'to place', free, true);
  else setBtn('bGhost', 'GHOST', w ? W('GHOST', w)[0] : TUNE.AP_ECM + 'AP ' + TUNE.GHOST_COST + 'EN', free && !w, false, w ? 'GHOST.' + w : '');
  // fire
  $('bFire').hidden = !fitted(p, 'GUN');
  w = shootBlock(p, playerTarget(), TUNE.PLAYER_FIRE_UNC, fireRange(p));
  const odds = w ? null : shotOdds(p, playerTarget()); // R12: the hit chance on the button
  setBtn('bFire', odds ? 'FIRE ' + odds.pct + '%' : 'FIRE', w ? W('FIRE', w)[0] : TUNE.AP_SHOT + 'AP', free && !w, false, w ? 'FIRE.' + w : ''); // R24 fix list 1 (C02): the reason in words, and a tap says why
  // R9: mortar (only on an ExoS carrying it)
  const M = mortarOf(p);
  $('bMortar').hidden = !fitted(p, 'MORTAR');
  const wb = mortarBlindBlock(p); w = mortarBlock(p, playerTarget());
  if (V.mortarArm) setBtn('bMortar', 'TAP TARGET', V.mortarWhy ? whyShort('MORTAR', V.mortarWhy) : (w ? 'map = blind' : 'contact or map'), free, true);
  else setBtn('bMortar', 'MORTAR', wb ? W('MORTAR', wb)[0] : (M ? M.ap : 0) + 'AP · ' + p.shells + ' left' + (w ? ' · blind' : ''), free && !wb, false, wb ? 'MORTAR.' + wb : '');
  setBtn('bEnd', 'END TURN', '', free);
  // R14: ID the selected contact (not once eyes have shown what it is)
  const sc = G.sel && G.sel.on ? G.sel : null, idv = sc && G.ids[sc.id] ? G.ids[sc.id].v : '';
  setBtn('bId', 'ID', !sc ? whyShort('ID', 'NONE') : revealed(sc.id) ? 'SEEN' : idv ? idv + '?' : 'UNKNOWN', G.mode === 'hunt' && !!sc && !revealed(sc.id), false, !sc ? 'ID.NONE' : 'ID.SEEN');
  // Round 5: uplink
  $('bUp').hidden = isType('BOUNTY') || isType('ESCORT'); // R15: Bounty and Escort have no objective button (Escort uses route buttons on the map); Retrieve uses it for PICK UP / HAND OFF
  w = G.mode === 'hunt' ? objectiveBlock() : 'RANGE';
  if (isType('RETRIEVE') && isCarrier(p)) setBtn('bUp', 'HAND OFF', w ? W('HANDOFF', w)[0] : TUNE.RETRIEVE_HANDOFF_AP + 'AP', free && !w, false, w ? 'HANDOFF.' + w : '');
  else if (isType('RETRIEVE')) setBtn('bUp', 'PICK UP', w === 'HELD' ? G.mission.carrier + ' HAS IT' : w ? W('PICKUP', w)[0] : TUNE.RETRIEVE_PICKUP_AP + 'AP · LOUD', free && !w, false, w ? 'PICKUP.' + w : '');
  else setBtn('bUp', 'UPLINK', w ? W('UPLINK', w)[0] : TUNE.AP_UPLINK + 'AP +' + TUNE.SIG_UPLINK + 'EMIT', free && !w, false, w ? 'UPLINK.' + w : '');
  // R16: EXTRACT, while the active ExoS stands in the extraction zone
  $('bExtract').hidden = G.mode !== 'hunt' || extractBlock() !== '';
  if (!$('bExtract').hidden) setBtn('bExtract', 'EXTRACT', 'leave the map', free);
  // R16: convoy orders (Escort only). Lit = pending; tap again to cancel.
  const esc = isType('ESCORT') && !!G.ally && !G.ally.dead; $('bHold').hidden = $('bHurry').hidden = !esc;
  if (esc) for (const [id, k, left] of [['bHold', 'HOLD', G.ally.holdsLeft], ['bHurry', 'HURRY', G.ally.hurriesLeft]]) {
    const b = orderBlock(k), on = G.ally.order === k;
    setBtn(id, k, on ? 'NEXT MOVE' : b ? whyShort('ORDER', b) : left + ' left', free && b === '', on, b ? 'ORDER.' + b : '');
  }
  hudT = 0;
}
