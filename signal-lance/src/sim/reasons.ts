// R24 (A3): every reason code a blocked control can carry. The sim decides the reason, the view words it: each code here
// has a glossary entry `why.<ACTION>.<CODE>` in src/view/glossary.ts (a Vitest check holds them in step). Codes are what the
// block functions return ('' = allowed). Keep this list in step when a block function gains a code.
import { TUNE } from '../tune.ts';
import { partHurt } from './combat.ts';
import { isCarrier } from './mission.ts';

// The parts as the block functions name them (kit.ts offWhy: the location whose part is gone)
export const PART_CODES = ['MAST', 'ARMS', 'CORE', 'BACK', 'LEGS'] as const;

export const REASONS: Record<string, readonly string[]> = {
  FIRE: ['NONE', ...PART_CODES, 'AMMO', 'CAP', 'COOL', 'AP', 'SOUND', 'FUZZY', 'RANGE', 'LOS'],            // turns.ts shootBlock (R25 COOL: live toy only)
  MORTAR: ['NONE', ...PART_CODES, 'SHELLS', 'CAP', 'COOL', 'AP', 'SOUND', 'FUZZY', 'CLOSE', 'RANGE'], // mortarBlock + mortarBlindBlock (offWhy can name any part)
  RADAR: ['NONE', 'AP', 'EN', ...PART_CODES],                                                // hud.ts: radarOf / offWhy / costWhy
  ECM: ['AP', 'EN', ...PART_CODES],
  GHOST: ['AP', 'EN', 'ON', ...PART_CODES],
  UPLINK: ['NONE', 'RANGE', 'DONE', 'AP'],                                                    // uplinkBlock
  PICKUP: ['NONE', 'HELD', 'RANGE', 'AP'],                                                    // mission.ts pickupBlock
  HANDOFF: ['NONE', 'RANGE', 'AP'],                                                           // mission.ts handoffBlock
  MOVE: ['LEGS', 'CARGO', 'AP', 'EN', 'NOPLAN'],                                              // the plan's why (turns.ts planMove), NOPLAN = no move set yet
  MODE: ['LEGS', 'CARGO'],                                                                    // moveModeBlock (CREEP / NORMAL / SPRINT)
  ID: ['NONE', 'SEEN'],                                                                       // hud.ts: no contact selected, or eyes already showed it
  ORDER: ['NONE', 'FORK', 'USED'],                                                            // escort.ts orderBlock (HOLD / HURRY)
  EXTRACT: ['NONE', 'ZONE'],                                                                  // turns.ts extractBlock
  TURN: ['WAIT'],                                                                             // not your turn, or an action is still running
};

// R24 fix list 11 (C23): can m pick this move mode? '' = yes; LEGS = a leg is damaged (CREEP only); CARGO = the carrier
// can't sprint. The view checks it before it sends cmdMoveMode, so a greyed NORMAL / SPRINT never sets the mode.
export function moveModeBlock(m, mode: string) {
  if (mode !== 'CREEP' && partHurt(m, 'LEGS')) return 'LEGS';
  if (mode === 'SPRINT' && TUNE.RETRIEVE_NO_SPRINT && isCarrier(m)) return 'CARGO';
  return '';
}
