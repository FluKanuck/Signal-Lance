// Round 13 step 2: the pack. Alarm (field units share what they sense about the lance), converge (patrols drop the
// uplink leash and close in), press the wound (patrols go for the most damaged mech). All behind TUNE.PACK_ENABLED.
import { TUNE } from '../tune.ts';
import { T } from './world.ts';
import { G, unitById, isMech } from './state.ts';
import { observe } from './sensors.ts';
import { effEmit } from './zones.ts';
import { partGone } from './combat.ts';

// A field unit's OWN senses (a shared ALARM contact never raises a further alarm: no relay).
const OWN = ['EYES', 'RADAR', 'PASSIVE', 'SOUND', 'FLASH'];

export function alarmRadius(mech) { return TUNE.ALARM_RADIUS_BASE + TUNE.ALARM_RADIUS_EMIT * effEmit(mech) / TUNE.SIGNAL_MAX; }

// Called by observe() after a field unit gains or refreshes contact c on something. If it's a lance mech and the
// fix came from the unit's own senses, every other living field unit within alarmRadius gets a shared contact:
// the same estimate, ALARM_UNC_ADD tiles fuzzier. A better live fix of their own is never loosened.
export function raiseAlarm(list, c, src: string) {
  if (!TUNE.PACK_ENABLED || list === G.pc || !OWN.includes(src)) return;
  const mech = unitById(c.id), from = G.units.find(u => u.ec === list);
  if (!mech || !isMech(mech) || !from || from.dead) return;
  const r = alarmRadius(mech) * T, u = c.unc + TUNE.ALARM_UNC_ADD * T, to = [];
  for (const o of G.units) {
    if (o === from || o.dead || Math.hypot(o.x - from.x, o.y - from.y) > r) continue;
    const have = o.ec.find(k => k.on && k.id === c.id);
    if (have && !have.shr && have.lost <= have.gap && have.unc <= u) continue;
    observe(o.ec, c.id, c.tx, c.ty, u, c.vx, c.vy, true, true, false, 'ALARM');
    to.push(o.id);
  }
  // count one alarm per (alarming unit, mech) per round, and keep it for the DBG lines
  if (to.length && (from.alarmT || (from.alarmT = {}))[mech.id] !== G.turn) {
    from.alarmT[mech.id] = G.turn;
    mech.alarms = (mech.alarms || 0) + 1;
    G.alarmLog.push({ from: from.id, to, mech: mech.id, turn: G.turn, t: G.time });
  }
}

// BADLY damaged or worse (the same threshold as the damage words), or legs gone.
export function wounded(m) { return m.hits / m.maxHits <= TUNE.DMG_BADLY || partGone(m, 'LEGS'); }

// How hurt a mech is, for picking a target: more parts destroyed is worse, then fewer CORE hits left.
export function hurt(m) { return { lost: (m.partsLost || []).filter(p => p !== 'CORE').length, core: m.parts.CORE }; }

// Which lance mech patrol e goes after. `cands` = its live contacts on lance mechs (own or shared), each
// { c (the contact), m (the mech behind it), d (tiles from e to the contact's estimate) }. Return one of them.
export function pickPackTarget(e, cands) {
  // TODO(Jamie): press the wound. Brief: the most damaged mech (most parts destroyed, then fewest CORE
  // hits left; ties go to the nearest). hurt(m) gives { lost, core }.
  return cands[0];
}

// The view's switch (tester splash toggle). Takes effect from the next hunt's decisions on.
export function setPack(on: boolean) { TUNE.PACK_ENABLED = !!on; }
