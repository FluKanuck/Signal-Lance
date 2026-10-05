import { TUNE } from '../tune.ts';
import { G } from '../sim/state.ts';
import { heardRange, sig, detStrength } from '../sim/sensors.ts';
import { uplinkBlock, upDist, shootBlock, playerTarget, mortarBlock, mortarBlindBlock, shotOdds } from '../sim/turns.ts';
import { partsRead, hitText, PART_ABBR } from '../sim/combat.ts';
import { unitById } from '../sim/state.ts';
import { V } from './state.ts';
import { zoneOf, effSignal } from '../sim/zones.ts';

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
    (mine ? '  shots ' + p.turnShots + '/' + TUNE.SHOTS_PER_TURN : '');
  const pips = '<span id="ap">' + '●'.repeat(p.ap) + '○'.repeat(Math.max(0, TUNE.AP_BANK_MAX - p.ap)) + '</span>';
  $('hud').innerHTML = turn + '<br>AP ' + pips + '  (+' + TUNE.AP_PER_TURN + '/turn)' +
    '<br>EN <span id="pbar"><div id="pfill" style="width:' + Math.round(100 * p.en / p.enMax) + '%"></div></span> ' + Math.round(p.en) + '/' + p.enMax + '  (+' + TUNE.ENERGY_REGEN + '/turn)' +
    '<br>SIGNAL <span id="pbar"><div id="pfill" style="width:' + Math.round(100 * p.signal / TUNE.SIGNAL_MAX) + '%;background:#f93"></div></span> ' + Math.round(p.signal) + '  (−' + TUNE.SIGNAL_DECAY + '/turn)' +
    '<br><b>' + p.id + '</b> ' + partsRead(p) + (other ? '  <span style="color:#aab">' + other.id + ' ' + (other.dead ? 'destroyed' : partsRead(other)) + '</span>' : '') + // R12: per-part read
    '<br>' + (G.load.ammo ? '  AMMO ' + p.ammo : '') + (G.load.mortar ? '  SHELLS ' + p.shells : '') + '  KILLS ' + G.kills + '/' + G.units.length + '  T ' + fmtTime(G.time) + (heardRange(p) > 0 ? '  HEARD ~' + Math.round(heardRange(p)) + 't' : '  SILENT') + zoneHud(p) +
    (G.load.ecm ? '  ECM ' + (p.mask ? 'ON' : 'off') + (G.ghost.on ? '  GHOST ' + G.ghost.turns + 't' : '') : '') +
    oddsLine(p) + shotLine('P') + shotLine('E') +
    (G.splash ? '<br><b style="color:' + (G.splash.hit ? '#f63' : '#aaa') + '">SPLASH: ' + (G.splash.hit ? 'hit' : 'miss') + '</b>' : '') +
    '<br>UPLINK <span style="color:#fc3">' + '◆'.repeat(G.up.prog) + '◇'.repeat(Math.max(0, TUNE.UPLINK_TURNS - G.up.prog)) + '</span> ' + G.up.name +
      (uplinkBlock() !== 'RANGE' ? '  <b>IN RANGE</b>' : '  ' + Math.round(upDist(p)) + 't away') +

    (V.dbg ? '<br>DBG ' + (G.ct ? 'ct ' + G.ct.seed + ' H' + G.ct.hunt + ' · hunt ' : '') + 'seed ' + G.seed + ' · ' + G.comp.NAME + '  ' + G.units.map(u => u.type.slice(0, 4) + (u.dead ? ' X' : ' ' + u.state + ' S' + Math.round(u.signal))).join(' | ') +
      '<br>DBG zones ' + G.zones.map(z => z.type[0] + ':' + z.name).join(', ') + '  me eff S' + Math.round(effSignal(p)) +
      dbgShot('P') + dbgShot('E') +
      '<br>DBG sig ' + G.units.map(u => u.dead ? '-' : u.type[0] + sig(u).toFixed(1) + ' ' + detStrength(p, u).toFixed(2) + '/' + detStrength(u, p).toFixed(2)).join('  ') + '  (sig me→it/it→me)' : '');
}
// R12: the odds breakdown for the shot FIRE would take now (shown whenever FIRE is allowed)
function oddsLine(p) {
  if (G.mode !== 'hunt' || G.phase !== 'PLAYER' || !G.load.ammo) return '';
  const c = playerTarget(); if (shootBlock(p, c, TUNE.PLAYER_FIRE_UNC, TUNE.PLAYER_FIRE_RANGE) !== '') return '';
  const h = shotOdds(p, c); return h ? '<br><b style="color:#ff6">ODDS ' + h.pct + '%</b>: ' + hitText(h) : '';
}
// R12: last shot by the lance ('P') / the field ('E'): "A → patrol: HIT LEG (62%)" / "turret → B: MISS (40%)"
function who(id) { const u = unitById(id); return !u ? '?' : G.lance.includes(u) ? u.id : u.ft.NAME; }
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
    setBtn(id, lab, TUNE.MOVE_TILES_PER_AP[m] + 't/AP ' + TUNE.MOVE_ENERGY_PER_TILE[m] + 'EN/t', free, G.pmode === m);
  }
  const pl = G.plan;
  if (V.faceArm) setBtn('bMove', 'CANCEL', 'face', free, true);
  else setBtn('bMove', 'MOVE', !pl ? 'TAP MAP' : pl.path ? pl.ap + 'AP ' + pl.en + 'EN' : pl.why, free && pl && pl.path);
  // radar pulse
  $('bRadar').hidden = !G.load.radar;
  let w = costWhy(TUNE.AP_RADAR, TUNE.RADAR_EN);
  setBtn('bRadar', 'RADAR', w || TUNE.AP_RADAR + 'AP ' + TUNE.RADAR_EN + 'EN +' + TUNE.SIGNAL_RADAR + 'S', free && !w);
  // ECM + ghost
  $('bEcm').hidden = $('bGhost').hidden = !G.load.ecm;
  w = costWhy(TUNE.AP_ECM, TUNE.ECM_EN);
  if (p.mask) setBtn('bEcm', 'ECM ON', TUNE.AP_ECM + 'AP ' + TUNE.ECM_EN + 'EN/turn', free, true);
  else setBtn('bEcm', 'ECM', w || TUNE.AP_ECM + 'AP ' + TUNE.ECM_EN + 'EN', free && !w);
  w = costWhy(TUNE.AP_ECM, TUNE.GHOST_COST);
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
  // Round 5: uplink
  w = G.mode === 'hunt' ? uplinkBlock() : 'RANGE';
  setBtn('bUp', 'UPLINK', w || TUNE.AP_UPLINK + 'AP +' + TUNE.SIG_UPLINK + 'S', free && !w);
  hudT = 0;
}
