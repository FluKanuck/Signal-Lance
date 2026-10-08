// R25 fix list 6–8 (C08, C43, C51): a shot's result in words, read by the map flash and the HUD alike (one record, one text).
// "HIT CORE · had 77% to hit", "MISS · had 56% to hit", "KILL · had 81% to hit", "DOWN", "MISS · WALL".
import { PART_ABBR } from '../sim/combat.ts';
import { shotWord } from '../sim/turns.ts';
import { G, unitById } from '../sim/state.ts';

export function shotResult(r) {
  const w = shotWord(r); if (!w) return '';
  const head = w === 'HIT' ? 'HIT ' + (PART_ABBR[r.part] || r.part) : w === 'WALL' ? 'MISS · WALL' : w;
  return head + ' · had ' + r.pct + '% to hit';
}
// who: an ExoS letter, 'transport', or the field type's name
export function who(id) { const u = unitById(id); return !u ? '?' : G.lance.includes(u) ? u.id : u === G.ally ? 'transport' : u.ft.NAME; }
// "patrol → B: HIT CORE · had 56% to hit" (a stray hit on someone else names them: "→ A (aimed at B)")
export function shotLineText(r) {
  const res = shotResult(r); if (!res) return '';
  const stray = r.hit && r.victim && r.victim !== r.target;
  return who(r.shooter) + ' → ' + (stray ? who(r.victim) + ' (aimed at ' + who(r.target) + ')' : who(r.target)) + ': ' + res;
}
