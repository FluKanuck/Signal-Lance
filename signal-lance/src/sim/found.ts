// R18 (A12): debrief per channel. What found each of your ExoS first, on which channel, from how far, in which round.
// Read from G.firstLog (every new contact; sensors.ts observe). The hunt teaches, the debrief explains.
import { G } from './state.ts';

// The sense that made a contact → the channel the player builds against
export const CHANNEL: Record<string, string> = { SOUND: 'ACO', PASSIVE: 'ESM', RADAR: 'RDR', EYES: 'EO', FLASH: 'MZL', ALARM: 'LINK', THERMAL: 'IR' }; // R18 fix list 13: the tag names
export function firstFound(id: string) { return G.firstLog.find(f => f.side === 'E' && f.tgt === id && f.src !== 'GHOST') || null; }
// "A: first found on SND at 7 tiles by a hush (round 2)" (or "never found"), one per lance suit
export function foundLines(): string[] {
  return G.lance.map(m => {
    const f = firstFound(m.id);
    return m.id + ': ' + (f ? 'first found on ' + (CHANNEL[f.src] || f.src) + ' at ' + Math.round(f.d) + ' tiles by a ' + (f.byType || 'field unit') + ' (round ' + f.turn + ')' : 'never found');
  });
}
// " · found A SND 7t, B never" for the log line
export function foundText() { return ' · found ' + G.lance.map(m => { const f = firstFound(m.id); return m.id + ' ' + (f ? (CHANNEL[f.src] || f.src).split(' ')[0] + ' ' + Math.round(f.d) + 't' : 'never'); }).join(', '); }
