// Round 15: mission types. One `G.mission` object per hunt: its type, goal progress and result. The uplink keeps its own
// code paths (G.up, doUplink); every other type plugs in here: what a kill pays, what extracting or clearing the field
// means, and what the hunt pays the contract.
import { TUNE } from '../tune.ts';
import { T } from './world.ts';
import { G, finishHunt, unitById } from './state.ts';
import { observe } from './sensors.ts';
import { aarObj } from './aar.ts';

// Name and one-line goal, shown in the INTEL before you take the job (and in the HUD / result).
export const MISSION_INFO = {
  UPLINK: { name: 'UPLINK', goal: 'Stand in the gold ring and UPLINK on ' + TUNE.UPLINK_TURNS + ' turns, or clear the field.' },
  BOUNTY: { name: 'BOUNTY', goal: 'Every kill pays its bounty. Reach the quota, then extract when you choose.' },
  ESCORT: { name: 'ESCORT', goal: 'Get the transport from the left edge out the right. It stops at each fork until you tap a route. Scout ahead.' },
  RETRIEVE: { name: 'RETRIEVE', goal: 'PICK UP the guarded cargo and carry it out the right edge. Grabbing it alerts the whole field.' },
};

// Called by newHunt (type set by rollEnemy). Fresh goal progress. Retrieve: the cargo sits on the rolled site (G.up).
export function newMission(type = 'UPLINK') {
  G.mission = { type, earned: 0, quota: type === 'BOUNTY' ? TUNE.BOUNTY_QUOTA : 0, kills: [], result: '', endTurn: 0,
    carrier: '', flipped: false, pickups: 0, handoffs: 0, legs: [] }; // R15 s3: legs = the routes picked ('NORTH@J1') // R15 s2: who holds the cargo ('' = on its tile), has the field flipped
}
export function isType(t: string) { return !!G.mission && G.mission.type === t; }
// What a unit's death pays (its TRUE variant, not what you called it)
export function bountyOf(u) { return TUNE.BOUNTY[u.variant] || 0; }

// A field unit was just destroyed (turns.ts updateShells). Bounty: bank its price and pop it on screen.
export function onKill(u) {
  if (!isType('BOUNTY')) return;
  const b = bountyOf(u);
  const was = quotaMet();
  G.mission.earned += b;
  if (!was && quotaMet()) aarObj('QUOTA', null, G.mission.earned + '/' + G.mission.quota + ' cr'); // R22
  G.mission.kills.push({ v: u.variant, b, turn: G.turn });
  G.pop = { x: u.x, y: u.y, b, v: u.variant, t: 2.5 }; // the view shows "+80 heavy" for a moment
}
export function quotaMet() { return isType('BOUNTY') && G.mission.earned >= G.mission.quota; }

// ---- R15 step 2: Retrieve ----
export function carrier() { return isType('RETRIEVE') && G.mission.carrier ? unitById(G.mission.carrier) : null; }
export function isCarrier(m) { return !!m && isType('RETRIEVE') && G.mission.carrier === m.id; }
// '' = mech m can PICK UP now; else why not (NONE / HELD / RANGE / AP)
export function pickupBlock(m) {
  if (!isType('RETRIEVE')) return 'NONE';
  if (G.mission.carrier) return 'HELD';
  if (Math.hypot(G.up.x - m.x, G.up.y - m.y) / T > TUNE.UPLINK_RADIUS + 0.5) return 'RANGE';
  if (m.ap < TUNE.RETRIEVE_PICKUP_AP) return 'AP';
  return '';
}
// The flip: loud. Every living field unit gets an alarm contact on the carrier and the pack logic switches on (pack.ts).
export function doPickup(m) {
  m.ap -= TUNE.RETRIEVE_PICKUP_AP;
  const M = G.mission; M.carrier = m.id; M.flipped = true; M.pickups++; M.pickTurn = M.pickTurn || G.turn;
  aarObj('PICKUP', m); // R22
  const unc = (TUNE.UNC_ACQUIRE + TUNE.ALARM_UNC_ADD) * T;
  for (const u of G.units) if (!u.dead) observe(u.ec, m.id, m.x, m.y, unc, 0, 0, true, true, false, 'ALARM');
  G.alarmLog.push({ from: 'CARGO', to: G.units.filter(u => !u.dead).map(u => u.id), mech: m.id, turn: G.turn, t: G.time });
}
// The other living mech within RETRIEVE_HANDOFF_RANGE of the carrier m, or null
export function handoffTo(m) {
  if (!isCarrier(m)) return null;
  return G.lance.find(o => o !== m && !o.dead && Math.hypot(o.x - m.x, o.y - m.y) / T <= TUNE.RETRIEVE_HANDOFF_RANGE) || null;
}
export function handoffBlock(m) {
  if (!isCarrier(m)) return 'NONE';
  if (!handoffTo(m)) return 'RANGE';
  if (m.ap < TUNE.RETRIEVE_HANDOFF_AP) return 'AP';
  return '';
}
export function doHandoff(m) { const o = handoffTo(m); m.ap -= TUNE.RETRIEVE_HANDOFF_AP; G.mission.carrier = o.id; G.mission.handoffs++; aarObj('HANDOFF', m, o.id); } // R22
// Called each sim step: the carrier destroyed = the cargo is lost and the hunt fails (a contract LOSS only if the lance is wiped)
export function cargoLost() { const c = carrier(); return !!c && c.dead; }
export function onCargoLost() { aarObj('CARGO_LOST', carrier()); G.mission.endTurn = G.turn; G.mission.result = 'cargo lost'; finishHunt('FAIL'); }

// ---- R15 step 3: Escort ----
export function onAllyLost() { G.mission.endTurn = G.turn; G.mission.result = 'transport lost'; finishHunt('FAIL'); }
export function onAllyOut() { G.mission.allyOut = true; G.mission.result = 'transport out'; } // R16: the hunt ends once the lance is out too
export function escortBonus() { const a = G.ally; return a ? Math.round(TUNE.ESCORT_BONUS * Math.max(0, a.hits) / a.maxHits) : 0; }

// R16: every living mech has extracted. Bounty: WIN at or over quota, else BAIL with the bounties kept. Retrieve: WIN if the
// carrier took the cargo out. Escort: WIN if the transport is out, else BAIL (the lance left it). Uplink: BAIL.
export function onAllOut() {
  const M = G.mission; M.endTurn = G.turn;
  if (quotaMet()) { G.winBy = 'BOUNTY'; finishHunt('WIN'); }
  else if (isType('RETRIEVE') && M.cargoOut) { M.result = 'cargo out'; G.winBy = 'RETRIEVE'; finishHunt('WIN'); }
  else if (isType('ESCORT') && M.allyOut) { M.result = 'transport out'; G.winBy = 'ESCORT'; finishHunt('WIN'); }
  else { M.result = isType('ESCORT') ? 'left the transport' : 'extracted'; finishHunt('BAIL'); }
}
// The whole field is destroyed. Uplink / Retrieve: WIN CLEAR. Escort: never called (turns.ts skips it: only the transport walking out wins). Bounty: same quota rule as extracting (nothing left to take).
export function onClear() {
  G.mission.endTurn = G.turn; G.mission.result = 'cleared';
  if (isType('BOUNTY')) { if (quotaMet()) { G.winBy = 'BOUNTY'; finishHunt('WIN'); } else finishHunt('BAIL'); return; }
  G.winBy = 'CLEAR'; finishHunt('WIN');
}

// Credits this hunt pays the contract. kind = WIN / BAIL / FAIL / LOSS.
export function huntPay(kind: string) { return Math.round(basePay(kind) * TUNE.PAY_MULT); } // R22: every mission's pay × PAY_MULT
function basePay(kind: string) {
  if (isType('BOUNTY')) return G.mission.earned; // bounties replace PAY_WIN + PAY_KILL, and are kept on a BAIL
  if (isType('ESCORT') && kind === 'WIN' && G.winBy === 'ESCORT') return TUNE.PAY_WIN + escortBonus() + G.kills * TUNE.PAY_KILL; // + the bonus for the ally's hits left
  return kind === 'BAIL' || kind === 'FAIL' ? 0 : (kind === 'WIN' ? TUNE.PAY_WIN : 0) + G.kills * TUNE.PAY_KILL; // R11 s2 (Retrieve as uplink)
}

// Log / result text ('' for uplink):
// "BOUNTY 180/150 · kills: heavy 80, scout 25 · extracted round 9" / "RETRIEVE carried by B · pickups 1 · hand-offs 1 · cargo out round 12"
export function missionText() {
  const M = G.mission; if (!M) return '';
  const end = M.result ? ' · ' + M.result + ' round ' + M.endTurn : '';
  if (M.type === 'BOUNTY') return 'BOUNTY ' + M.earned + '/' + M.quota + ' · kills: ' + (M.kills.map(k => k.v + ' ' + k.b).join(', ') || 'none') + end;
  if (M.type === 'ESCORT') return 'ESCORT transport ' + (G.ally ? (G.ally.dead ? 'destroyed' : G.ally.hits + '/' + G.ally.maxHits + ' hits') : '?') + ' · routes ' + (M.legs.join(', ') || 'none picked') + ' · holds ' + (M.holds || 0) + ', hurries ' + (M.hurries || 0) + end;
  if (M.type === 'RETRIEVE') return 'RETRIEVE ' + (M.carrier ? 'carried by ' + M.carrier : 'cargo untouched') + ' · pickups ' + M.pickups + ' · hand-offs ' + M.handoffs + end;
  return '';
}
