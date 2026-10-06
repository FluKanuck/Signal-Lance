// R16 debrief (Jamie): every map item says what it is and what it does. Mouse: hover. Touch: hold a finger still for
// TIP_HOLD_MS (a hold never moves, selects or pans). View only: reads sim state, changes nothing.
import { TUNE } from '../tune.ts';
import { G } from '../sim/state.ts';
import { T, W, H, MAP, isSolid, isClutter, canReach, solid } from '../sim/world.ts';
import { cx, cy } from '../sim/sensors.ts';
import { zoneAtTile } from '../sim/zones.ts';
import { partsRead } from '../sim/combat.ts';
import { isType, carrier } from '../sim/mission.ts';
import { legChoices, legButton } from '../sim/escort.ts';
import { contactLabel } from './render.ts';
import { V } from './state.ts';
import { $ } from './hud.ts';

export const TIP_HOLD_MS = 450; // touch: how long a still finger waits before the tip shows
const near = (wx, wy, x, y, r) => Math.hypot(wx - x, wy - y) <= r;
const tiles = (u) => (u / T).toFixed(1);

// What is at world point (wx, wy)? [title, effect lines], or null. Things first, then the ground under them.
export function tipAt(wx: number, wy: number): [string, string[]] | null {
  const z = TUNE.ZOOMS[V.zoomI], R = 18 / z;
  for (const l of legChoices()) { const b = legButton(l.i); if (near(wx, wy, b.x, b.y, 30 / z)) return [l.name + ' route', ['Tap to send the transport this way. It walks ' + TUNE.ESCORT_MOVE + ' tiles a round and stops at the next fork.']]; }
  for (const m of G.lance) if (!m.dead && near(wx, wy, m.x, m.y, R)) return ['Your mech ' + m.id, [partsRead(m), 'AP ' + m.ap + ' · EN ' + Math.round(m.en) + ' · EMIT ' + Math.round(m.emit) + ' · ammo ' + m.ammo, 'Tap it on its turn to turn and face somewhere.']];
  const a = G.ally;
  if (a && near(wx, wy, a.x, a.y, R)) return a.dead ? ['Transport (destroyed)', ['The escort failed.']] : ['Transport', [a.hits + '/' + a.maxHits + ' hits. Unarmed. The field can see, hear and shoot it like your mechs.', 'Win: it walks out the right edge. Lose it and the hunt fails.']];
  for (const c of G.pc) {
    if (!c.on || !near(wx, wy, cx(c), cy(c), Math.max(R, Math.min(c.unc, 40 / z)))) continue;
    const lost = c.lost > c.gap;
    return ['Contact: ' + contactLabel(c), [
      c.snd ? 'Heard only (a sound): something is roughly here. Never enough to shoot at.' : c.shr ? 'Shared alarm contact. Never a lock.' : 'A fix from your sensors.',
      'Circle = how unsure you are: ±' + tiles(c.unc) + ' tiles' + (lost ? ' (lost track: it grows while that unit acts)' : '') + '.',
      'FIRE needs ±' + TUNE.PLAYER_FIRE_UNC + ' or better, range ' + TUNE.PLAYER_FIRE_RANGE + ' and line of sight. Tap it to select.']];
  }
  for (const u of G.units) if (u.dead && near(wx, wy, u.x, u.y, R)) return ['Wreck: ' + u.type.toLowerCase() + ' ' + u.variant, ['Destroyed.']];
  if (G.ghost.on && near(wx, wy, G.ghost.x, G.ghost.y, R)) return ['Ghost (your decoy)', ['Enemies see a fake contact here for ' + G.ghost.turns + ' more of its owner\'s turns.']];
  const U = G.up, ring = (TUNE.UPLINK_RADIUS + 0.5) * T;
  if (isType('UPLINK') && near(wx, wy, U.x, U.y, ring)) return ['Uplink: ' + U.name, ['Stand in the ring and tap UPLINK (' + TUNE.AP_UPLINK + ' AP, loud: +' + TUNE.SIG_UPLINK + ' EMIT). ' + TUNE.UPLINK_TURNS + ' uplinks win. Done ' + U.prog + '/' + TUNE.UPLINK_TURNS + '.']];
  if (isType('RETRIEVE') && !carrier() && near(wx, wy, U.x, U.y, ring)) return ['Cargo: ' + U.name, ['Stand on it and PICK UP (' + TUNE.RETRIEVE_PICKUP_AP + ' AP). The whole field is alerted and hunts the carrier, who can\'t sprint. Carry it out the right edge.']];
  return groundAt(Math.floor(wx / T), Math.floor(wy / T));
}
function groundAt(tx: number, ty: number): [string, string[]] | null {
  if (tx < 0 || ty < 0 || tx >= W || ty >= H) return null;
  const out: string[] = [], zn = zoneAtTile(tx, ty);
  if (zn && zn.type === 'QUIET') out.push('QUIET ground (' + zn.name + '): anything standing here is read at ' + Math.round(TUNE.ZONE_TYPES.QUIET.SIG_MULT * 100) + '% of its EMIT and sound.');
  if (zn && zn.type === 'NOISE') out.push('NOISE zone (' + zn.name + '): radio fixes on anything here are blurred (×' + TUNE.ZONE_TYPES.NOISE.UNC_MULT + ', at least ±' + TUNE.ZONE_TYPES.NOISE.UNC_FLOOR + '). Eyes and radar still work.');
  const ext = tx >= W - TUNE.EXTRACT_COLS;
  if (ext) return ['Extraction', ['A mech that walks in here pulls the whole lance out (and the hunt ends).', ...out]];
  if (isSolid(tx, ty)) {
    const piece = solid[ty * W + tx] === 2;
    return [piece ? 'Wreck / barricade' : 'Building', [piece ? 'A set piece or street blocker (fallen gantry, containers, a collapsed front).' : 'A city block.', 'Blocks movement, sight and shots. Radar sees through up to ' + TUNE.RADAR_MAX_WALLS + ' wall tiles.']];
  }
  if (isClutter(tx, ty)) return ['Scrap and rubble', ['Slow: each tile costs ' + TUNE.CLUTTER_TILE_COST + ' tiles of movement (same for enemies).', 'Loud: a move into it adds ' + TUNE.CLUTTER_SOUND + ' to that move\'s sound.', 'Low cover: shots at a unit in or just behind it get −' + TUNE.HIT_COVER + '%.', ...out]];
  if (!canReach(tx, ty)) return ['Closed yard', ['No way in from the streets.']];
  return out.length ? [zn.type === 'QUIET' ? 'Quiet ground' : 'Noise zone', out] : (MAP.id === 'hive' ? null : ['Street', ['Open ground: no cover, clear sightlines. Tap to plan a move here.']]);
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
