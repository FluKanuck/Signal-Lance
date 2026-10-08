// Round 23 cp B: runner personalities. How the scripted company picks its next contract (the campaign half; the hunt half is
// autoplay.ts's BOT weights). Used by the runner and the tests only, never by the game. Weights in TUNE.BOT_PERSONALITY.
//   fee        (Mercenary) the top fee in reach, every time
//   cautious   the lowest danger; a broker job before a faction job; then the fee
//   aggressive the highest danger; a faction job before a broker job; then the fee
//   loyal      sticks to one faction: its patron is the employer of the first faction job it takes. A job FOR the patron
//              first (top fee); else any job that doesn't hit the patron; else the top fee. No patron yet: a faction job first.
import { TUNE } from '../tune.ts';

export type Pick = { o: any; i: number };
export function personality(name: string) { return TUNE.BOT_PERSONALITY[name] || TUNE.BOT_PERSONALITY.mercenary; }

// cands = the offers in reach (with their index). patron = the loyal company's faction ('' none yet). Returns one or null.
export function pickOffer(rule: string, cands: Pick[], patron = ''): Pick | null {
  if (!cands.length) return null;
  const L = cands.slice(), fee = (a: Pick, b: Pick) => b.o.fee - a.o.fee, brk = (p: Pick) => p.o.kind === 'BROKER' ? 0 : 1;
  if (rule === 'cautious' || rule === 'low') return L.sort((a, b) => a.o.tier - b.o.tier || brk(a) - brk(b) || fee(a, b))[0];
  if (rule === 'aggressive') return L.sort((a, b) => b.o.tier - a.o.tier || brk(b) - brk(a) || fee(a, b))[0];
  if (rule === 'loyal') {
    if (!patron) return L.filter(p => p.o.kind === 'FACTION').sort(fee)[0] || L.sort(fee)[0];
    return L.filter(p => p.o.kind === 'FACTION' && p.o.emp === patron).sort(fee)[0] || L.filter(p => p.o.tgt !== patron).sort(fee)[0] || L.sort(fee)[0];
  }
  return L.sort(fee)[0]; // fee (Mercenary)
}
// The loyal company's patron after taking o ('' stays '' until it takes a faction job)
export function nextPatron(patron: string, o: any) { return patron || (o && o.kind === 'FACTION' ? o.emp : ''); }
// Deterministic "chance" from a seed (so a weight never moves the hunt's own RNG): 0..1
export function seedRoll(seed: number, salt: number) { let t = (seed ^ Math.imul(salt + 1, 0x9E3779B1)) >>> 0; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
