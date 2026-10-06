// Round 14 part 1: read the signature. The lance writes down what its sensors actually picked up about each field
// unit (G.obs, keyed by unit id = contact id), the player commits an ID from the 9-variant CARD (G.ids), and a right
// call before eyes sharpens the track (statics) and the aim (+HIT_ID_BONUS). The field never IDs you.
import { TUNE } from '../tune.ts';
import { G, unitById } from './state.ts';
import { effEmit } from './zones.ts';
import { ITEMS, byId } from './items.ts';

// ============================ OBSERVED TRAITS ==========================
// emit: bands seen ('none' | 'low' | 'high'), pulses: rounds a radar pulse was heard, moved: a move was seen or heard,
// acts: its activations that ended while you held a contact on it, step / shot: the loudest heard (tiles), fired.
export function obsOf(id: string) {
  return G.obs[id] || (G.obs[id] = { emit: [] as string[], pulses: [] as number[], moved: false, acts: 0, step: 0, shot: 0, fired: false, first: 0 });
}
function touch(o) { if (!o.first) o.first = G.turn; }
export function emitBand(e) { const v = effEmit(e); return v <= 0 ? 'none' : v >= TUNE.TRAIT_EMIT_HIGH ? 'high' : 'low'; }
export function noteEmit(e, band: string) { const o = obsOf(e.id); touch(o); if (!o.emit.includes(band)) o.emit.push(band); }
export function notePulse(e) { const o = obsOf(e.id); touch(o); if (o.pulses[o.pulses.length - 1] !== G.turn) o.pulses.push(G.turn); }
export function noteMoved(e) { const o = obsOf(e.id); touch(o); o.moved = true; }
export function noteFired(e) { const o = obsOf(e.id); touch(o); o.fired = true; }
// the lance heard e's sound this round: radius r (tiles, as heard), made by a step or a shot
export function noteSound(e, r: number) {
  const o = obsOf(e.id); touch(o);
  if (e.sndKind === 'SHOT') { o.fired = true; o.shot = Math.max(o.shot, r); }
  else if (e.sndKind !== 'MORTAR') { o.moved = true; o.step = Math.max(o.step, r); }
}
// e's activation is over: one more watched activation if the lance holds a contact or a live bearing on it
export function noteActEnd(e) { if (G.pc.some(c => c.on && c.id === e.id) || G.pb.some(b => b.on && b.id === e.id)) obsOf(e.id).acts++; } // a contact or a live bearing on it

// Derived readings (the contact panel shows these, the matcher uses them)
export function pulseGap(o) { let g = 0; for (let i = 1; i < o.pulses.length; i++) { const d = o.pulses[i] - o.pulses[i - 1]; if (d > 0 && (!g || d < g)) g = d; } return g; }
export function isStill(o) { return !o.moved && o.acts >= TUNE.TRAIT_STILL_ACTS; }
export function stepBand(r: number) { return r <= 0 ? '' : r <= TUNE.TRAIT_SOFT_MAX ? 'soft' : r <= TUNE.TRAIT_STEP_MAX ? 'steps' : 'loud'; }
export function shotBand(r: number) { return r <= 0 ? '' : r <= TUNE.SHOT_MUFFLED_MAX ? 'muffled' : 'loud'; }
// one line per trait, plain words ("EMIT low", "pulses every 2", "moved", "steps 4", "fired, shot 12")
export function traitLines(o) {
  if (!o) return [];
  const L = [];
  if (o.emit.length) L.push('EMIT ' + ['none', 'low', 'high'].filter(b => o.emit.includes(b)).join('/'));
  const g = pulseGap(o);
  if (o.pulses.length) L.push(g ? 'pulses every ' + g : 'pulsed (once so far)');
  else if (o.emit.some(b => b !== 'none')) L.push('steady (no pulse heard)');
  if (o.moved) L.push('moved'); else if (isStill(o)) L.push('still (' + o.acts + ' rounds)');
  if (o.step) L.push('steps heard at ' + Math.round(o.step * 10) / 10 + ' (' + stepBand(o.step) + ')');
  if (o.shot) L.push('shot heard at ' + Math.round(o.shot * 10) / 10 + ' (' + shotBand(o.shot) + ')');
  else if (o.fired) L.push('fired');
  return L;
}

// ============================ MATCHER =================================
// Every variant still consistent with what was observed. Only the plain rules on the CARD; no hidden maths.
export function variantBands(v) {
  const V = TUNE.FIELD_VARIANTS[v];
  return {
    emit: V.PULSE ? ['low', 'high'] : [V.COMMS > 0 ? 'low' : 'none'], // a pulser's afterglow fades (and QUIET pulls it down) to low
    mobile: V.TYPE === 'PATROL',
    step: stepBand({ ...TUNE.SOUND_RANGE, ...V.SOUND }.NORMAL),
    shot: shotBand({ SHOT: byId(ITEMS, 'autocannon').gun.snd, ...V.SOUND }.SHOT), // R18: every field gun is an autocannon row
  };
}
export function consistent(o, v: string) {
  const V = TUNE.FIELD_VARIANTS[v], B = variantBands(v);
  if (o.emit.some(b => !B.emit.includes(b))) return false;
  if (o.pulses.length && !V.PULSE) return false;
  const g = pulseGap(o); if (g && g !== V.PULSE) return false;
  if (V.PULSE && !o.pulses.length && o.acts > V.PULSE) return false; // watched long enough to have heard it pulse
  if (o.moved && !B.mobile) return false;
  if (isStill(o) && B.mobile) return false;
  if (o.step && stepBand(o.step) !== B.step) return false;
  if (o.shot && shotBand(o.shot) !== B.shot) return false;
  return true;
}
export function matchVariants(o) { return Object.keys(TUNE.FIELD_VARIANTS).filter(v => consistent(o, v)); }
export function hasReading(o) { return !!o && (o.emit.length || o.pulses.length || o.moved || o.step || o.shot || isStill(o)); }

// ============================ IDs =====================================
// G.ids[id] = { v (variant key), turn, pre (committed before ANY eyes-on this hunt), miscall (eyes showed it was wrong) }
export function revealed(id: string) { return !!(G.obs[id] && G.obs[id].var); }
export function cmdId(id: string, v: string) {
  if (revealed(id)) return;
  if (!v) { delete G.ids[id]; return; }
  G.ids[id] = { v, turn: G.turn, pre: !G.eyesAny, miscall: false, seen: false };
  const s = G.idStat[id]; if (s && !s.idTurn) s.idTurn = G.turn;
}
// eyes on unit e (contact c): the true variant shows (kept in G.obs, so it survives the contact fading); a wrong call flips and counts as a miscall
export function reveal(e, c) {
  G.eyesAny = true; obsOf(e.id).var = e.variant; if (c) c.type = e.type;
  const d = G.ids[e.id];
  if (d && !d.seen) { d.seen = true; if (d.v !== e.variant) d.miscall = true; }
  const s = G.idStat[e.id]; if (s && !s.eyesTurn) s.eyesTurn = G.turn;
}
// the variant the lance is going by for this contact ('' = UNKNOWN): eyes first, then the committed call
export function idOf(id: string) { const o = G.obs[id]; if (o && o.var) return o.var; return G.ids[id] ? G.ids[id].v : ''; }
export function idType(id: string) { const v = idOf(id); return v ? TUNE.FIELD_VARIANTS[v].TYPE : ''; }
// Track by type: a TURRET / EMPLACEMENT call (right or wrong) freezes the track
export function frozen(id: string) { const t = idType(id); return TUNE.ID_STATIC_HOLD && !!t && t !== 'PATROL'; }
// Aim: a right call made before eyes (not a reveal, not a flipped miscall)
export function idBonus(tgt) { const d = G.ids[tgt.id]; return d && !d.miscall && d.v === tgt.variant ? TUNE.HIT_ID_BONUS : 0; }

// " · IDs 3 (2 right, 1 wrong, 1 before eyes)" for the hunt's log line ('' if none)
export function idText() {
  const L = Object.keys(G.ids).map(id => ({ d: G.ids[id], u: unitById(id) })).filter(x => x.u);
  if (!L.length) return ' · IDs 0';
  const right = L.filter(x => !x.d.miscall && x.d.v === x.u.variant).length;
  return ' · IDs ' + L.length + ' (' + right + ' right, ' + (L.length - right) + ' wrong, ' + L.filter(x => x.d.pre).length + ' before eyes)';
}

// ============================ RUNNER =================================
// Called at each scripted player activation: track how fast each contact narrows, and commit an ID once it narrows
// to a single variant (the scripted player's rule). G.idStat[id] = { first (round of first reading), firstN (matches
// then), single (round it first narrowed to one), idTurn, eyesTurn }.
export function idTick(commit = true) {
  for (const u of G.units) {
    const o = G.obs[u.id];
    if (u.dead || !hasReading(o)) continue;
    const s = G.idStat[u.id] || (G.idStat[u.id] = { first: 0, firstN: 0, single: 0, idTurn: 0, eyesTurn: 0 });
    const m = matchVariants(o);
    if (!s.first) { s.first = G.turn; s.firstN = m.length; }
    if (m.length === 1 && !s.single) s.single = G.turn;
    if (commit && m.length === 1 && !G.ids[u.id] && !revealed(u.id) && G.pc.some(c => c.on && c.id === u.id)) cmdId(u.id, m[0]);
  }
}
// hunt summary for the runner (read right after the hunt ends)
export function idSummary() {
  return G.units.map(u => {
    const s = G.idStat[u.id] || {}, d = G.ids[u.id];
    return { contacted: !!u.found, read: !!s.first, firstN: s.firstN || 0, single: s.single ? s.single - s.first : -1,
      id: !!d, right: !!d && !d.miscall && d.v === u.variant, beforeEyes: !!d && (!s.eyesTurn || d.turn <= s.eyesTurn) };
  });
}
