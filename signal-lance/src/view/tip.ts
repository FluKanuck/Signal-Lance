// R16 debrief (Jamie): every map item says what it is and what it does. Mouse: hover. Touch: hold a finger still for
// LONGPRESS_MS (a hold never moves, selects or pans). R24 A2: a touch hold (or a right-click) opens the explain card: the
// tip's lines plus the glossary lines of the terms on it. View only: reads sim state, changes nothing.
import { TUNE } from '../tune.ts';
import { fireRange } from '../sim/turns.ts';
import { G } from '../sim/state.ts';
import { T, W, H, MAP, isSolid, isClutter, canReach, solid } from '../sim/world.ts';
import { cx, cy } from '../sim/sensors.ts';
import { zoneAtTile } from '../sim/zones.ts';
import { zoneKnowOf } from '../sim/scan.ts';
import { partsRead } from '../sim/combat.ts';
import { isType, carrier } from '../sim/mission.ts';
import { forksAhead, allyNextStop } from '../sim/escort.ts';
import { contactLabel, routeBtn, sensorTags } from './render.ts';
import { soundRadius } from '../sim/sound.ts';
import { heardRange } from '../sim/sensors.ts';
import { lowHits, hitsLeft } from '../sim/warn.ts';
import { gloss } from './glossary.ts';
import { showExplainText } from './explain.ts';
import { V, camZ } from './state.ts';
import { $ } from './hud.ts';

const near = (wx, wy, x, y, r) => Math.hypot(wx - x, wy - y) <= r;
const tiles = (u) => (u / T).toFixed(1);

// What is at world point (wx, wy)? [title, effect lines, glossary ids], or null. Things first, then the ground under them.
let gids: string[] = []; // the glossary terms the last tipAt touched (the explain card adds their lines)
export function tipAt(wx: number, wy: number): [string, string[]] | null {
  gids = [];
  const z = camZ(), R = 18 / z;
  for (const f of forksAhead()) for (const l of f.legs) { const b = routeBtn(l.i); if (near(wx, wy, b.x, b.y, 30 / z)) { gids = ['ROUTE', 'FORK']; return ['ROUTE ' + l.name + (f.set === l.i ? ' ✓ (set)' : ''), [
    G.ally.leg < 0 && G.ally.node === f.node ? 'The transport waits here. Tap this ROUTE and it goes this way.' : 'A ROUTE at a fork ahead. Tap it to set it, and tap it again to clear it. At a set fork, the transport goes on without a stop. At an unset fork, it waits for you.',
    'It walks ' + TUNE.ESCORT_MOVE + ' tiles a round (' + TUNE.ESCORT_SPRINT + ' on a HURRY).']]; } }
  const nx = allyNextStop(); if (nx && near(wx, wy, nx.x, nx.y, R)) { gids = ['NEXT']; return ['NEXT MOVE', [nx.why === 'HOLD' ? 'The transport holds this round (HOLD order).' : nx.why === 'FORK' ? 'The transport will stop at this fork. No ROUTE is set.' : 'The transport’s next move ends here.']]; }
  for (const m of G.lance) if (near(wx, wy, m.x, m.y, R) && (!m.dead || m.crit)) {
    if (m.dead) { gids = ['DOWN', 'CRITICAL']; return ['ExoS ' + m.id + (m.carriedBy ? ' · CARRIED BY ' + m.carriedBy : ' · DOWN'), [m.carriedBy ? 'A lancemate carries its operator. EXTRACT the carrier to bring them home.' : 'Its operator is CRITICAL. End a lancemate’s turn next to it to carry them out.']]; }
    gids = ['ExoS', ...(lowHits(m) ? ['HITS LEFT'] : []), ...(G.p === m && soundRadius(m) > 0 ? ['SOUND'] : []), ...(m.paintTurn !== undefined ? ['PAINTED'] : [])];
    return ['ExoS ' + m.id, [partsRead(m), 'Hits ' + Math.max(0, m.hits) + '/' + m.maxHits + ' in all. CORE hits left ' + hitsLeft(m) + (lowHits(m) ? ' (low)' : '') + '. At 0 CORE it goes DOWN.', 'AP ' + m.ap + ' · EN ' + Math.round(m.en) + ' · EMIT ' + Math.round(m.emit) + ' · AMMO ' + m.ammo, 'Tap it on its turn to turn it and face somewhere.']];
  }
  const a = G.ally;
  if (a && near(wx, wy, a.x, a.y, R)) return a.dead ? ['Transport (destroyed)', ['The escort failed.']] : ['Transport', [a.hits + '/' + a.maxHits + ' hits. Unarmed. The enemy can see, hear and shoot it like your ExoS.', 'Win: it walks out the right edge. Lose it and the hunt fails.', 'Orders (your turn, no AP): HOLD skips its next move (' + a.holdsLeft + ' left). HURRY makes its next move a SPRINT: ' + TUNE.ESCORT_SPRINT + ' tiles, louder (' + a.hurriesLeft + ' left).' + (a.order ? ' Pending: ' + a.order + '.' : '')]];
  for (const c of G.pc) {
    if (!c.on || !near(wx, wy, cx(c), cy(c), Math.max(R, Math.min(c.unc, 40 / z)))) continue;
    const lost = c.lost > c.gap;
    const tg = sensorTags(c).map(g => g.t.split(' ')[0]).map(t => t === 'GHOST' ? '' : t).filter(Boolean);
    gids = ['contact', ...(contactLabel(c).includes('UNKNOWN') ? ['UNKNOWN'] : []), ...(contactLabel(c).includes(' fit') ? ['fit'] : []), ...(G.sel === c ? ['SELECTED'] : []), ...(lost ? ['LOST TRACK'] : []), ...tg, 'FIX'];
    return ['Contact: ' + contactLabel(c), [
      c.snd ? 'Heard only (a SOUND). Something is roughly here. A SOUND fix is never enough to FIRE at.' : c.shr ? 'A LINK track, shared by your lance. It is never a lock.' : 'A fix from your sensors.',
      'The circle shows how unsure the fix is: ±' + tiles(c.unc) + ' tiles' + (lost ? '. LOST TRACK: it grows while that unit acts' : '') + '.',
      'FIRE needs ±' + TUNE.PLAYER_FIRE_UNC + ' or better, range ' + (fireRange(G.p) || '—') + ' and line of sight. Tap the contact to select it.']];
  }
  for (const u of G.units) if (u.dead && near(wx, wy, u.x, u.y, R)) return ['Wreck: ' + u.type.toLowerCase() + ' ' + u.variant, ['Destroyed.']];
  if (G.ghost.on && near(wx, wy, G.ghost.x, G.ghost.y, R)) { gids = ['GHOST']; return ['GHOST (your fake contact)', ['Enemies see a fake contact here for ' + G.ghost.turns + ' more of its owner’s turns.']]; }
  for (const k of V.lk.marks) if (near(wx, wy, k.x, k.y, R)) { gids = ['LAST SEEN']; return ['LAST SEEN · round ' + k.turn, ['A contact dropped off your picture here. It may have moved. You can’t target this mark.']]; } // R24 A5 (C15)
  { const p = G.p; if (p && !p.dead && G.mode === 'hunt') { // R24 A2: the rings round the active ExoS
    const d = Math.hypot(wx - p.x, wy - p.y), band = 14 / z, sr = soundRadius(p) * T, er = heardRange(p) * T;
    if (sr > 0 && Math.abs(d - sr) <= band) { gids = ['SOUND']; return ['SOUND ring (' + (Math.round(soundRadius(p) * 10) / 10) + ' tiles)', ['Enemies inside this ring heard your last move or shot this turn.']]; }
    if (er > 0 && Math.abs(d - er) <= band) { gids = ['EMIT']; return ['EMIT ring (~' + Math.round(heardRange(p)) + ' tiles)', ['Enemy ESM inside this ring can hear your EMIT now.']]; }
  } }
  for (const b of G.pb) { // R24 A2: bearing lines
    if (!b.on) continue;
    const dx = Math.cos(b.ang), dy = Math.sin(b.ang), t = (wx - b.x) * dx + (wy - b.y) * dy;
    if (t > 0 && Math.abs((wx - b.x) * dy - (wy - b.y) * dx) <= 10 / z) { gids = ['BEARING']; return ['BEARING', [b.tri ? 'Your ESM heard an EMIT this way. Cross it with a line from another place to fix the contact.' : 'A jammed bearing: a direction only.']]; }
  }
  const U = G.up, ring = (TUNE.UPLINK_RADIUS + 0.5) * T;
  if (isType('UPLINK') && near(wx, wy, U.x, U.y, ring)) { gids = ['UPLINK']; return ['UPLINK: ' + U.name, ['Done ' + U.prog + '/' + TUNE.UPLINK_TURNS + '.']]; }
  if (isType('RETRIEVE') && !carrier() && near(wx, wy, U.x, U.y, ring)) { gids = ['CARGO', 'PICK UP']; return ['CARGO: ' + U.name, ['The ring shows the PICK UP range.']]; }
  return groundAt(Math.floor(wx / T), Math.floor(wy / T));
}
function groundAt(tx: number, ty: number): [string, string[]] | null {
  if (tx < 0 || ty < 0 || tx >= W || ty >= H) return null;
  const out: string[] = [], zn0 = zoneAtTile(tx, ty), zn = zn0 && zoneKnowOf(zn0) >= 2 ? zn0 : null; // R19: only zones the scan named (R20: zone by zone)
  if (zn && zn.type === 'QUIET') { gids.push('QUIET'); out.push('QUIET (' + zn.name + '): anything here gives off ' + Math.round(TUNE.ZONE_TYPES.QUIET.SIG_MULT * 100) + '% of its EMIT and SOUND.'); }
  if (zn && zn.type === 'NOISE') { gids.push('NOISE'); out.push('NOISE (' + zn.name + '): fixes on anything here are blurred (×' + TUNE.ZONE_TYPES.NOISE.UNC_MULT + ', at least ±' + TUNE.ZONE_TYPES.NOISE.UNC_FLOOR + '). Eyes and RADAR still work.'); }
  if (zn0 && zoneKnowOf(zn0) === 1) gids.push('ZONE ?');
  const ext = tx >= W - TUNE.EXTRACT_COLS;
  if (ext) { gids.push('EXTRACTION', 'EXTRACT'); return ['EXTRACTION', ['Stand in here and tap EXTRACT. That ExoS leaves the map, and its turn ends. The hunt ends when all your ExoS that can act are out.', isType('ESCORT') ? 'It is a WIN if the transport walked out first.' : isType('RETRIEVE') ? 'It is a WIN if the carrier extracted with the cargo.' : isType('BOUNTY') ? 'It is a WIN at or over the quota.' : '', ...out]]; }
  if (isSolid(tx, ty)) {
    const piece = solid[ty * W + tx] === 2;
    return [piece ? 'Wreck / barricade' : 'Building', [piece ? 'A set piece or street blocker (fallen gantry, containers, a collapsed front).' : 'A city block.', 'Blocks movement, sight and shots. Radar sees through up to ' + TUNE.RADAR_MAX_WALLS + ' wall tiles.', 'Cover: −' + TUNE.HIT_COVER + '% to hit a unit just behind it, unless the shooter is up against the same piece.']];
  }
  if (isClutter(tx, ty)) { gids.push('scrap', 'COVER'); return ['Scrap and rubble', ['Slow: each tile costs ' + TUNE.CLUTTER_TILE_COST + ' tiles of movement (same for enemies).', 'Loud: a move into it adds ' + TUNE.CLUTTER_SOUND + ' to that move\'s sound.', 'Low cover: shots at a unit in or just behind it get −' + TUNE.HIT_COVER_LOW + '% (not if the shooter is up against the same patch).', ...out]]; }
  if (!canReach(tx, ty)) return ['Closed yard', ['No way in from the streets.']];
  return out.length ? [zn.type === 'QUIET' ? 'QUIET' : 'NOISE', out] : (MAP.id === 'hive' ? null : ['Street', ['Open ground: no cover, clear sightlines. Tap to plan a move here.']]);
}

// ---- R24 A2: the explain card for a touch hold or a right-click on the map ----
export function explainAt(wx: number, wy: number) {
  const t = tipAt(wx, wy); if (!t) return;
  const seen = new Set<string>(), add: string[] = [];
  for (const id of gids) { const e = gloss(id); if (e && !seen.has(e.id)) { seen.add(e.id); add.push(e.name + ': ' + e.line); } }
  showExplainText(t[0], [...t[1], ...add], 'map.' + (gids[0] || t[0].split(/[ :·(]/)[0]));
}
// ---- showing it ----
let shown = false;
export function showTip(sx: number, sy: number, wx: number, wy: number) {
  const t = tipAt(wx, wy), el = $('tip');
  if (!t) { hideTip(); return; }
  el.innerHTML = '<b>' + esc(t[0]) + '</b>' + t[1].filter(Boolean).map(l => '<br>' + esc(l)).join('');
  el.hidden = false; shown = true;
  const w = el.offsetWidth, h = el.offsetHeight, vw = window.innerWidth, vh = window.innerHeight;
  el.style.left = Math.max(4, Math.min(vw - w - 4, sx + 14)) + 'px';
  el.style.top = Math.max(4, Math.min(vh - h - 4, sy - h - 14 < 4 ? sy + 18 : sy - h - 14)) + 'px';
}
export function hideTip() { if (shown) { $('tip').hidden = true; shown = false; } }
function esc(s) { return String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c])); }
