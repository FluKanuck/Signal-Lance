// R24 (A5): two warnings the game knew and didn't show. Pure reads of the hunt: no rule changes.
import { TUNE } from '../tune.ts';

// ---- low hits (C12) ----
// An ExoS goes DOWN when its CORE runs out (a hit on a part that is gone spills to the CORE), so "hits left" = CORE hits left.
export function hitsLeft(m) { return m && m.parts && m.parts.CORE !== undefined ? Math.max(0, m.parts.CORE) : Math.max(0, m ? m.hits : 0); }
// true = show the warning mark (token, SUITS row, HUD line)
// An ExoS that has taken no hit yet never warns (a fresh scout has 1 CORE hit: a warning from the drop would only be noise).
export const hurt = (m) => !!m && !!m.parts && !!m.pmax && Object.keys(m.pmax).some(k => m.parts[k] < m.pmax[k]);
export function lowHits(m) { return !!m && !m.dead && !m.out && hurt(m) && hitsLeft(m) <= TUNE.WARN_HITS_LEFT; }

// ---- last-known contacts (C15) ----
// A contact that drops off the picture (not because its unit was destroyed) leaves a mark where it was last fixed. The
// mark stays for LASTKNOWN_ROUNDS rounds (made in round n: shown in rounds n .. n + LASTKNOWN_ROUNDS − 1), or until the
// contact comes back. It can't be targeted: it is not a contact. The view keeps the state (V); this only steps it.
export type LastKnown = { id: string; x: number; y: number; turn: number };
export type LkState = { seen: Record<string, { x: number; y: number }>; marks: LastKnown[] };
export const newLk = (): LkState => ({ seen: {}, marks: [] });
// contacts: [{ id, on, x, y }] (x, y = the fix centre); dead(id) = its unit is destroyed (no mark for a kill)
export function stepLk(S: LkState, contacts: { id: string; on: boolean; x: number; y: number }[], turn: number, dead: (id: string) => boolean) {
  const on = new Set<string>();
  for (const c of contacts) if (c.on) { on.add(c.id); S.seen[c.id] = { x: c.x, y: c.y }; }
  S.marks = S.marks.filter(m => !on.has(m.id)); // back on the picture: the mark goes
  for (const id of Object.keys(S.seen)) {
    if (on.has(id)) continue;
    const p = S.seen[id]; delete S.seen[id];
    if (!dead(id)) S.marks.push({ id, x: p.x, y: p.y, turn });
  }
  S.marks = S.marks.filter(m => turn - m.turn < TUNE.LASTKNOWN_ROUNDS);
  return S;
}
