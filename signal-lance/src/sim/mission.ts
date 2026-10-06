// Round 15: mission types. One `G.mission` object per hunt: its type, goal progress and result. The uplink keeps its own
// code paths (G.up, doUplink); every other type plugs in here: what a kill pays, what extracting or clearing the field
// means, and what the hunt pays the contract.
import { TUNE } from '../tune.ts';
import { G, finishHunt } from './state.ts';

// Name and one-line goal, shown in the INTEL before you take the job (and in the HUD / result).
export const MISSION_INFO = {
  UPLINK: { name: 'UPLINK', goal: 'Stand in the gold ring and UPLINK on ' + TUNE.UPLINK_TURNS + ' turns, or clear the field.' },
  BOUNTY: { name: 'BOUNTY', goal: 'Every kill pays its bounty. Reach the quota, then extract when you choose.' },
};

// Called by newHunt (type set by rollEnemy). Fresh goal progress.
export function newMission(type = 'UPLINK') {
  G.mission = { type, earned: 0, quota: type === 'BOUNTY' ? TUNE.BOUNTY_QUOTA : 0, kills: [], result: '', endTurn: 0 };
}
export function isType(t: string) { return !!G.mission && G.mission.type === t; }
// What a unit's death pays (its TRUE variant, not what you called it)
export function bountyOf(u) { return TUNE.BOUNTY[u.variant] || 0; }

// A field unit was just destroyed (turns.ts updateShells). Bounty: bank its price and pop it on screen.
export function onKill(u) {
  if (!isType('BOUNTY')) return;
  const b = bountyOf(u);
  G.mission.earned += b;
  G.mission.kills.push({ v: u.variant, b, turn: G.turn });
  G.pop = { x: u.x, y: u.y, b, v: u.variant, t: 2.5 }; // the view shows "+80 heavy" for a moment
}
export function quotaMet() { return isType('BOUNTY') && G.mission.earned >= G.mission.quota; }

// A lance mech reached extraction. Uplink: BAIL (as before). Bounty: WIN at or over quota, else BAIL with the bounties kept.
export function onExtract() {
  G.mission.endTurn = G.turn; G.mission.result = 'extracted';
  if (quotaMet()) { G.winBy = 'BOUNTY'; finishHunt('WIN'); }
  else finishHunt('BAIL');
}
// The whole field is destroyed. Uplink: WIN CLEAR. Bounty: same quota rule as extracting (nothing left to take).
export function onClear() {
  G.mission.endTurn = G.turn; G.mission.result = 'cleared';
  if (isType('BOUNTY')) { if (quotaMet()) { G.winBy = 'BOUNTY'; finishHunt('WIN'); } else finishHunt('BAIL'); return; }
  G.winBy = 'CLEAR'; finishHunt('WIN');
}

// Credits this hunt pays the contract. kind = WIN / BAIL / LOSS.
export function huntPay(kind: string) {
  if (isType('BOUNTY')) return G.mission.earned; // bounties replace PAY_WIN + PAY_KILL, and are kept on a BAIL
  return kind === 'BAIL' ? 0 : (kind === 'WIN' ? TUNE.PAY_WIN : 0) + G.kills * TUNE.PAY_KILL; // R11 s2
}

// Log / result text: "BOUNTY 180/150 · kills: heavy 80, scout 25 · extracted round 9" ('' for uplink)
export function missionText() {
  const M = G.mission; if (!M || M.type !== 'BOUNTY') return '';
  return 'BOUNTY ' + M.earned + '/' + M.quota + ' · kills: ' + (M.kills.map(k => k.v + ' ' + k.b).join(', ') || 'none') +
    (M.result ? ' · ' + M.result + ' round ' + M.endTurn : '');
}
