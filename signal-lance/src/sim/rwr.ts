// Round 19 checkpoint 3: the RWR (radar warning receiver). An S-hardpoint row ('rwr'). When an enemy radar's pulse covers a suit
// that carries a working RWR, the suit gets a warning: where it stood (P0), the bearing as received (θ, ± RWR_BEARING_ERR), a
// range band guessed from signal strength (close / medium / far: a loud radar reads closer than it is, walls read further), and
// the kind: SEARCH (a sweep) or LOCK (the emitter is holding a tight fix on you). Heard standing = you are still on P0: a sharp
// spoke. Heard moving = you have left P0: the spoke freezes as received, and a re-aimed wedge from where you are now (P1) covers
// the guessed emitter strip (the bearing line from the band's near edge to its far edge, from P0) widened by the bearing error.
// That is plain parallax: close bands swing fast, far ones barely move. Walked past the strip's near edge = stale (spoke only).
import { TUNE } from '../tune.ts';
import { T } from './world.ts';
import { G } from './state.ts';
import { rand } from './rng.ts';
import { active } from './kit.ts';
import { inRadar, sig, emitStrength } from './sensors.ts';
import { idOf, matchVariants } from './ids.ts';

export type Warning = { id: string; x: number; y: number; ang: number; band: string; kind: 'SEARCH' | 'LOCK'; turn: number; seq: number };
export const BANDS = ['CLOSE', 'MEDIUM', 'FAR'];

// Called by updateSensors for every field unit e with its radar on, and every lance suit p it could cover.
export function rwrPaint(e, p) {
  if (!TUNE.RWR_ENABLED || p.dead || p.out || inRadar(e, p) < 0) return null;
  if (TUNE.RWR_BASELINE && p.paintTurn !== G.turn) { p.paintTurn = G.turn; p.paintN = (p.paintN || 0) + 1; } // the built-in receiver: painted, nothing more
  if (!active(p, 'rwr')) return null; // the module's readout from here on
  const L: Warning[] = p.rwr || (p.rwr = []), seq = e.pulseSeq || 0;
  let w = L.find(k => k.id === e.id);
  const c = e.ec.find(k => k.on && k.id === p.id), lock = !!c && c.lost <= c.gap && c.unc <= (e.ft.FIRE_UNC || 0) * T;
  if (w && w.seq === seq) { if (lock) w.kind = 'LOCK'; return w; } // the same pulse, still sweeping over you (a lock can firm up)
  if (!w) { w = { id: e.id } as Warning; L.push(w); }
  Object.assign(w, { x: p.x, y: p.y, ang: Math.atan2(e.y - p.y, e.x - p.x) + (rand() * 2 - 1) * TUNE.RWR_BEARING_ERR * Math.PI / 180,
    band: bandOf(guessDist(e, p)), kind: lock ? 'LOCK' : 'SEARCH', turn: G.turn, seq });
  p.rwrN = (p.rwrN || 0) + 1;
  return w;
}
// Distance (tiles) the RWR believes from the strength it received, as if every radar were the reference radar (RWR_REF_SIG)
export function guessDist(e, p) {
  const s = emitStrength(p, e, sig(e)), k = TUNE.RWR_REF_SIG / Math.max(1e-6, s);
  return k > 1 ? TUNE.DET_FALLOFF * Math.sqrt(k - 1) : 0;
}
// The band whose span is nearest to d (inside a span = that band; between two = the nearer edge)
export function bandOf(d: number) {
  let best = 'FAR', bd = 1e9;
  for (const b of BANDS) { const [a, z] = TUNE.RWR_BANDS[b], x = d < a ? a - d : d > z ? d - z : 0; if (x < bd) { bd = x; best = b; } }
  return best;
}
// Age the warnings at the start of each round: gone after RWR_LIFE rounds (a repaint refreshes one)
export function ageRwr() { for (const m of G.lance) { if (m.rwr) m.rwr = m.rwr.filter((w: Warning) => G.turn - w.turn < TUNE.RWR_LIFE); if (m.paintTurn !== undefined && G.turn - m.paintTurn >= TUNE.RWR_LIFE) m.paintTurn = undefined; } }
// R19 fix list 1: the built-in warning's strength (1 = painted this round, fading over RWR_LIFE rounds; 0 = nothing)
export function paintFade(m) { return m.paintTurn === undefined ? 0 : Math.max(0, 1 - (G.turn - m.paintTurn) / TUNE.RWR_LIFE); }
export function rwrFade(w: Warning) { return Math.max(0.15, 1 - (G.turn - w.turn) / TUNE.RWR_LIFE); }
// Moved off where it was heard? (a hair of drift doesn't count)
export function heardMoving(w: Warning, x: number, y: number) { return Math.hypot(x - w.x, y - w.y) > 0.5 * T; }
// The re-aimed wedge from (x, y): angles (radians, canvas atan2) of the strip's near and far ends, widened by ± the bearing error;
// centre = the strip's middle. stale = you are past the strip's near edge along the bearing (the guess is behind you).
export function rwrWedge(w: Warning, x: number, y: number) {
  const [near, far] = TUNE.RWR_BANDS[w.band], ux = Math.cos(w.ang), uy = Math.sin(w.ang), e = TUNE.RWR_BEARING_ERR * Math.PI / 180;
  const at = (r: number) => Math.atan2(w.y + uy * r * T - y, w.x + ux * r * T - x);
  const c = at((near + far) / 2), d = (a: number) => Math.atan2(Math.sin(a - c), Math.cos(a - c)); // relative to the centre
  const a0 = d(at(near)), a1 = d(at(far));
  const stale = ((x - w.x) * ux + (y - w.y) * uy) / T >= near;
  return { centre: c, from: c + Math.min(a0, a1) - e, to: c + Math.max(a0, a1) + e, stale, near, far };
}
// The CARD's best guess for the emitter: eyes or your ID, else the one variant your reads leave, else '?'
export function rwrGuess(id: string) {
  const v = idOf(id); if (v) return v + (G.obs[id] && G.obs[id].var ? '' : '?');
  const o = G.obs[id], m = o ? matchVariants(o) : []; return m.length === 1 ? m[0] + '?' : '?';
}
// " · RWR 3" for the log line ('' with no RWR fitted)
export function rwrText() { const L = G.lance.filter(m => active(m, 'rwr')), n = G.lance.reduce((a, m) => a + (m.paintN || 0), 0); return (n ? ' · painted ' + n : '') + (L.length ? ' · RWR ' + L.reduce((a, m) => a + (m.rwrN || 0), 0) : ''); } // R19 fix list 1: rounds painted (built-in), module warnings
