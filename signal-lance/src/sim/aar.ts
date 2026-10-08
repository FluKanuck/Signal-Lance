// Round 22: the after-action record ("then learn why"). During a hunt the sim appends plain events of three kinds (Jamie):
//   SEEN: first detections both ways (by eyes, sound, radar, thermal, emissions, a muzzle flash), alarms, a pack closing in
//   HIT:  parts wrecked, kills, suits down (CRITICAL), carry-outs, KIA, with the shooter, the range and where the shot came from
//   OBJ:  uplink started, cargo grabbed / handed / lost, a route picked, the bounty quota, a suit out, and the hunt's end
// After the hunt, pickMoments() chooses up to AAR_MAX_MOMENTS turning points, and momentLine() writes each one in plain
// words. Held the field (the hunt ended with the objective met) shows every moment in full; lost or bailed, the field's side
// is redacted: no enemy identity, range or position, only a rounded bearing from your own suit. Wrong calls are not here.
import { TUNE } from '../tune.ts';
import { T } from './world.ts';
import { G, unitById, isMech } from './state.ts';
import { partsPerRepair, fateOf, suitCost } from './company.ts';

export type AarEv = {
  n: number; turn: number;
  kind: 'SEEN' | 'HIT' | 'OBJ';
  sub: string;      // SEEN: DETECT ALARM PACK · HIT: PART KILL DOWN CARRY KIA · OBJ: UPLINK PICKUP HANDOFF CARGO_LOST ROUTE QUOTA OUT END
  side: 'P' | 'E';  // whose act it was: P = the lance (or the job), E = the field
  a: string; b: string;           // actor id, target id ('' = none)
  ax: number; ay: number; bx: number; by: number; // where they stood at the time (world units; NaN = none)
  aName: string; bName: string;   // the truth, as names at the time (a suit: "A Mara"; a field unit: "patrol (heavy)")
  how: string;      // DETECT: the sense (EYES RADAR PASSIVE THERMAL SOUND FLASH); a hit: GUN or MORTAR
  what: string;     // SOUND: what made it (SPRINT NORMAL CREEP SHOT MORTAR); PART: the part; OBJ: details
  rear: boolean;    // a hit from behind the target's facing
  known: boolean;   // the lance had eyes on the field unit involved (its type was known to you at the time)
  kia?: boolean;    // DOWN: its operator was left behind (the KIA folded into this line, R22 tuning)
};
export type Moment = AarEv & { w: number; must: boolean };
export type Hl = { own: { x: number; y: number; name?: string }[]; foe: { x: number; y: number; name?: string; id?: string }[]; line: number[] | null; bearing: { x: number; y: number; ang: number } | null; spot: { x: number; y: number } | null };
export type MomentLine = { turn: number; kind: string; sub: string; held: boolean; redacted: boolean; text: string; hl: Hl };

// ============================ RECORDING ===============================
const keys = new Set<string>(); // first-time keys this hunt (one first detection per pair, one alarm per unit and suit)
export function aarKeys() { return [...keys]; } // SAVE & QUIT
export function setAarKeys(k: string[]) { keys.clear(); for (const x of k || []) keys.add(x); }
export function aarReset() { G.aar = []; keys.clear(); G.hitBy = null; G.salvage = undefined; }
// Called once the lance stands on the map (newHunt, after the contract's carry-over): hits at the start, for WHAT IT COST
export function aarSnap() { for (const m of G.lance) { m.hits0 = m.dead ? 0 : m.hits; m.lvl0 = m.op ? m.op.lvl : 0; } }
function once(k: string) { if (keys.has(k)) return false; keys.add(k); return true; }

// A suit's name: its letter and its operator's first name ("B Jok"); the transport; or a field unit "patrol (heavy)"
export function nameOf(u): string {
  if (!u) return '';
  if (G.ally && u === G.ally) return 'the transport';
  if (isMech(u)) return u.id + (u.op ? ' ' + u.op.name.split(' ')[0] : '');
  return (u.ft?.NAME || String(u.type).toLowerCase()) + (u.variant ? ' (' + u.variant + ')' : '');
}
// The lance had eyes on field unit u (its type and variant were known to you)
function eyesOn(u) { return !!u && !isMech(u) && (G.pc || []).some(c => c.id === u.id && c.seen && c.seen.EYES !== undefined); }

function push(e: Partial<AarEv> & { kind: AarEv['kind']; sub: string; side: 'P' | 'E' }, A?, B?) {
  if (!G.aar) G.aar = [];
  const ev: AarEv = {
    n: G.aar.length, turn: G.turn || 1, a: A ? A.id : '', b: B ? B.id : '',
    ax: A ? A.x : NaN, ay: A ? A.y : NaN, bx: B ? B.x : NaN, by: B ? B.y : NaN,
    aName: nameOf(A), bName: nameOf(B), how: '', what: '', rear: false,
    known: eyesOn(A) || eyesOn(B), ...e,
  } as AarEv;
  G.aar.push(ev);
  return ev;
}

// sensors.ts observe(): a new contact. side P = the lance on field unit tgt (who = the suit letters that made it);
// side E = field unit by on suit / transport tgt. Only the first per pair, own senses only (no alarms, ghosts or ship blips).
const SENSES = ['EYES', 'RADAR', 'PASSIVE', 'THERMAL', 'SOUND', 'FLASH'];
export function aarSeen(side: 'P' | 'E', by, tgt, src: string, who = '') {
  if (!tgt || !SENSES.includes(src)) return;
  if (side === 'P') {
    const m = unitById((who || '').split('+')[0]) || G.lance.find(x => !x.dead && !x.out);
    if (!m || !once('P>' + tgt.id)) return;
    push({ kind: 'SEEN', sub: 'DETECT', side: 'P', how: src, what: src === 'SOUND' ? tgt.sndKind || '' : '', known: src === 'EYES' }, m, tgt);
  } else {
    if (!by || !once('E' + by.id + '>' + tgt.id)) return;
    push({ kind: 'SEEN', sub: 'DETECT', side: 'E', how: src, what: src === 'SOUND' ? tgt.sndKind || '' : '' }, by, tgt);
  }
}
// pack.ts raiseAlarm(): field unit from passed word about mech to n others (the first time per unit and suit)
export function aarAlarm(from, mech, n: number) { if (from && mech && once('A' + from.id + '>' + mech.id)) push({ kind: 'SEEN', sub: 'ALARM', side: 'E', what: String(n) }, from, mech); }
// bot.ts packDecide(): patrol e drops its leash and closes in on mech (the first time per unit and suit)
export function aarPack(e, mech) { if (e && mech && once('K' + e.id + '>' + mech.id)) push({ kind: 'SEEN', sub: 'PACK', side: 'E' }, e, mech); }

// turns.ts: who is hitting right now (a shell landing, a mortar splash). damagePart reads it; null = no shooter known.
export function aarHitBy(owner, x: number, y: number, how: string) { G.hitBy = owner ? { id: owner.id, x, y, how } : null; }
// combat.ts damagePart(): part p of u just went to 0 (CORE is a kill / a suit down, recorded below)
export function aarPart(u, p: string) {
  const H = G.hitBy; if (H) u.lastHit = { ...H, turn: G.turn };
  if (p === 'CORE') return;
  const A = H ? unitById(H.id) : null;
  push({ kind: 'HIT', sub: 'PART', side: sideOf(A, u), how: H ? H.how : '', what: p, rear: rearOf(u, H) }, A ? { id: A.id, x: H.x, y: H.y } as any : null, u)
    .aName = A ? nameOf(A) : '';
}
// a non-lethal hit still says who hit it last (for the kill / the suit down)
export function aarTouch(u) { if (G.hitBy) u.lastHit = { ...G.hitBy, turn: G.turn }; }
// whose act a hit was: the shooter's side; no shooter known = the side that took it is the other one
function sideOf(A, u): 'P' | 'E' { return A ? (isMech(A) ? 'P' : 'E') : (isMech(u) || (G.ally && u === G.ally) ? 'E' : 'P'); }
function rearOf(u, H) { if (!H || !TUNE.REAR_ARC) return false; const dx = H.x - u.x, dy = H.y - u.y, d = Math.hypot(dx, dy); return d > 0 && (dx * u.fx + dy * u.fy) / d < Math.cos(TUNE.FRONT_ARC_HALF * Math.PI / 180); }
function hitEv(sub: string, u) {
  const H = u.lastHit, A = H ? unitById(H.id) : null;
  const e = push({ kind: 'HIT', sub, side: sideOf(A, u), how: H ? H.how : '', rear: rearOf(u, H) }, A ? { id: A.id, x: H.x, y: H.y } as any : null, u);
  e.aName = A ? nameOf(A) : '';
  return e;
}
// turns.ts updateShells(): a field unit destroyed / a suit down (CRITICAL with an operator aboard, destroyed without one)
export function aarKill(u) { hitEv('KILL', u); }
export function aarDown(m) { const e = hitEv('DOWN', m); e.what = m.crit ? 'CRITICAL' : 'DESTROYED'; }
// company.ts noteCarry(): m picked up the CRITICAL operator of suit d
export function aarCarry(m, d) { push({ kind: 'HIT', sub: 'CARRY', side: 'P', what: d.op ? d.op.name.split(' ')[0] : '' }, m, d); }
// objective swings (mission.ts, turns.ts, escort.ts)
export function aarObj(sub: string, m?, what = '') {
  if (sub === 'UPLINK' && !once('UPLINK')) return; // the uplink's first turn only (its end is the hunt's end)
  if (sub === 'QUOTA' && !once('QUOTA')) return;
  push({ kind: 'OBJ', sub, side: 'P', what }, m || null, null);
}
// state.ts finishHunt(): the end, then the KIA (fates are final once the company has had its say)
export function aarEnd() {
  const o = G.outcome || '', k = o.split(' ')[0], M = G.mission || {};
  const what = k === 'WIN' ? (G.winBy === 'UPLINK' ? 'uplink complete at ' + G.up.name : G.winBy === 'BOUNTY' ? 'bounty quota met: ' + M.earned + '/' + M.quota + ' cr'
    : G.winBy === 'RETRIEVE' ? 'cargo carried out' : G.winBy === 'ESCORT' ? 'the transport made it out' : 'the field cleared')
    : k === 'BAIL' ? (M.type === 'BOUNTY' ? 'extracted under quota (' + M.earned + '/' + M.quota + ' cr)' : M.type === 'ESCORT' ? 'left the transport' : 'extracted without the job done')
    : k === 'FAIL' ? (M.result || 'the job failed') : k === 'LOSS' ? 'the lance was wiped out' : o.toLowerCase();
  if (!once('END')) return;
  push({ kind: 'OBJ', sub: 'END', side: 'P', what: o + ': ' + what }, null, null);
  for (const m of G.lance) if (m.op && m.crit && fateOf(m) === 'KIA') {
    const d = G.aar.find((e: AarEv) => e.sub === 'DOWN' && e.b === m.id); // R22 tuning (Jamie: go): one line per suit, "went down … left behind: KIA"
    if (d) { d.kia = true; continue; }
    push({ kind: 'HIT', sub: 'KIA', side: 'P', what: m.op ? m.op.name.split(' ')[0] : '' }, null, m);
  }
}

// ============================ THE MOMENTS =============================
// Held the field = the hunt ended with the objective met (Jamie: "you learn more when you hold the ground")
export function heldField(outcome = G.outcome || '') { return String(outcome).startsWith('WIN'); }
export function weightOf(e: AarEv) {
  const W = { DETECT: TUNE.AAR_WEIGHT_SEEN, ALARM: TUNE.AAR_WEIGHT_ALARM, PACK: TUNE.AAR_WEIGHT_ALARM, PART: TUNE.AAR_WEIGHT_PART, KILL: TUNE.AAR_WEIGHT_KILL,
    DOWN: e.kia ? TUNE.AAR_WEIGHT_KIA : TUNE.AAR_WEIGHT_DOWN, ROUTE: TUNE.AAR_WEIGHT_ROUTE, CARRY: TUNE.AAR_WEIGHT_CARRY, KIA: TUNE.AAR_WEIGHT_KIA, OUT: TUNE.AAR_WEIGHT_OUT }[e.sub] ?? TUNE.AAR_WEIGHT_OBJ;
  return W + (e.side === 'E' ? TUNE.AAR_ENEMY_FIRST : 0);
}
// Always in: the end, every KIA and suit down (CRITICAL), and the first time the field found the lance.
export function pickMoments(ev: AarEv[] = G.aar || [], max = TUNE.AAR_MAX_MOMENTS): Moment[] {
  const firstFound = ev.find(e => e.sub === 'DETECT' && e.side === 'E');
  const must = (e: AarEv) => e.sub === 'END' || e.sub === 'KIA' || e.sub === 'DOWN' || e === firstFound;
  const rank = (e: AarEv) => e.sub === 'END' ? 0 : e.sub === 'KIA' || e.kia ? 1 : e === firstFound ? 2 : 3; // if the always-in alone pass the cap
  const all: Moment[] = ev.map(e => ({ ...e, w: weightOf(e), must: must(e) }));
  const keep = all.filter(m => m.must).sort((a, b) => rank(a) - rank(b) || a.n - b.n).slice(0, max);
  const rest = all.filter(m => !m.must).sort((a, b) => b.w - a.w || a.n - b.n);
  for (const m of rest) { if (keep.length >= max) break; keep.push(m); }
  return keep.sort((a, b) => a.turn - b.turn || a.n - b.n);
}

// ============================ THE WORDS ===============================
const C8 = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'], C16 = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
// The compass point from (fx, fy) toward (tx, ty), rounded to AAR_REDACT_BEARING points (north = up the map)
export function compass(fx: number, fy: number, tx: number, ty: number, pts = TUNE.AAR_REDACT_BEARING) {
  const deg = (Math.atan2(tx - fx, -(ty - fy)) * 180 / Math.PI + 360) % 360, n = pts >= 16 ? 16 : pts >= 8 ? 8 : 4, i = Math.round(deg / (360 / n)) % n;
  return n === 16 ? C16[i] : n === 8 ? C8[i] : C8[i * 2];
}
// The rounded bearing's angle (radians, canvas: 0 = east, clockwise), for the highlight
export function compassAng(fx: number, fy: number, tx: number, ty: number, pts = TUNE.AAR_REDACT_BEARING) {
  const n = pts >= 16 ? 16 : pts >= 8 ? 8 : 4, deg = (Math.atan2(tx - fx, -(ty - fy)) * 180 / Math.PI + 360) % 360, r = Math.round(deg / (360 / n)) % n * (360 / n);
  return (r - 90) * Math.PI / 180;
}
const tiles = (e: AarEv) => { const n = Math.round(Math.hypot(e.ax - e.bx, e.ay - e.by) / T); return n + (n === 1 ? ' tile' : ' tiles'); };
const has = (v: number) => !Number.isNaN(v);
const SOUND_WORD = { SPRINT: 'sprinting', NORMAL: 'walking', CREEP: 'creeping', SHOT: 'firing', MORTAR: 'firing the mortar' };
// "heard B Jok sprinting" (active, held) / "B Jok heard sprinting" (passive, redacted)
function senseActive(e: AarEv, who: string) {
  const s = SOUND_WORD[e.what];
  return { EYES: 'saw ' + who, THERMAL: 'saw the heat of ' + who, RADAR: 'painted ' + who + ' on radar', PASSIVE: 'picked up ' + who + '’s emissions',
    SOUND: 'heard ' + who + (s ? ' ' + s : ''), FLASH: 'saw ' + who + '’s muzzle flash' }[e.how] || 'found ' + who;
}
function sensePassive(e: AarEv, who: string) {
  const s = SOUND_WORD[e.what];
  return { EYES: who + ' seen', THERMAL: who + '’s heat seen', RADAR: who + ' painted', PASSIVE: who + '’s emissions picked up',
    SOUND: who + ' heard' + (s ? ' ' + s : ''), FLASH: who + '’s muzzle flash seen' }[e.how] || who + ' found';
}
// What the lance knew a field unit as, by the sense that found it (no eyes = no type)
function asKnown(e: AarEv, held: boolean, name: string) {
  if (held || e.known) return an(name);
  return e.sub === 'DETECT' ? ({ THERMAL: 'a heat source', RADAR: 'a contact', PASSIVE: 'an emitter', SOUND: 'something', FLASH: 'a muzzle flash' }[e.how] || 'a contact') : 'a contact';
}
const an = (w: string) => (/^[aeiou]/i.test(w) ? 'an ' : 'a ') + w;
// The lance found something: "A heard something to the SW" / held: "A heard a patrol (heavy), 9 tiles SW"
const FOUND = { EYES: 'saw', THERMAL: 'saw the heat of', RADAR: 'painted', PASSIVE: 'picked up', SOUND: 'heard', FLASH: 'saw the muzzle flash of' };
const PART = { LEGS: 'LEGS', WEAPON: 'ARMS', SENSORS: 'MAST', BACK: 'BACK' };
const partName = (p: string) => PART[p] || p;
const weapon = (e: AarEv) => e.how === 'MORTAR' ? ' with the mortar' : '';

// One moment as a line (without the turn) and its highlight. held = the hunt held the field.
// Redacted = an enemy-side moment when not held: no identity, range or position, a rounded bearing from your own suit.
export function momentLine(e: AarEv, held = heldField()): MomentLine {
  const redacted = !held && e.side === 'E';
  const dirFoe = has(e.ax) && has(e.bx) ? compass(e.bx, e.by, e.ax, e.ay) : ''; // where the field unit was, seen from your suit
  const dirP = has(e.ax) && has(e.bx) ? compass(e.ax, e.ay, e.bx, e.by) : '';   // where the target was, seen from your suit
  const away = (dir: string) => held ? ', ' + tiles(e) + ' ' + dir : dir ? ' to the ' + dir : '';
  let text = '';
  const A = e.aName, B = e.bName;
  if (e.sub === 'DETECT') {
    if (e.side === 'E') text = redacted ? '??? — ' + sensePassive(e, B) + ' by something' + (dirFoe ? ' (' + dirFoe + '?)' : '') : A + ' ' + senseActive(e, B) + ', ' + tiles(e) + ' ' + dirFoe;
    else text = A + ' ' + (held || e.known ? FOUND[e.how] || 'found' : e.how === 'THERMAL' ? 'saw' : e.how === 'FLASH' ? 'saw' : FOUND[e.how] || 'found') + ' ' + asKnown(e, held, B) + (e.how === 'RADAR' ? ' on radar' : e.how === 'PASSIVE' && !held && !e.known ? '' : '') + away(dirP);
  } else if (e.sub === 'ALARM') text = redacted ? '??? — word about ' + B + ' passed through the field' + (dirFoe ? ' (' + dirFoe + '?)' : '') : A + ' passed word about ' + B + ' to ' + e.what + ' other' + (e.what === '1' ? '' : 's');
  else if (e.sub === 'PACK') text = redacted ? '??? — something closed in on ' + B + (dirFoe ? ' (' + dirFoe + '?)' : '') : A + ' left its post to hunt ' + B + ', ' + tiles(e) + ' ' + dirFoe;
  else if (e.sub === 'PART') {
    const from = e.rear ? ' (from behind)' : '';
    if (e.side === 'E') text = redacted ? B + '’s ' + partName(e.what) + ' wrecked' + (dirFoe ? ', hit from the ' + dirFoe : '') + from + ', shooter unseen' : A + ' wrecked ' + B + '’s ' + partName(e.what) + weapon(e) + ', ' + tiles(e) + ' ' + dirFoe + from;
    else text = (A || 'a hit') + ' wrecked the ' + partName(e.what) + ' of ' + asKnown(e, held, B) + weapon(e) + (A ? away(dirP) : '') + from;
  } else if (e.sub === 'KILL') text = (A || 'the lance') + ' destroyed ' + asKnown(e, held, B) + weapon(e) + (A ? away(dirP) : '');
  else if (e.sub === 'DOWN') {
    const what = e.what === 'CRITICAL' ? ' went down: CRITICAL' : ' destroyed';
    if (e.side === 'E') text = redacted ? B + what + (dirFoe ? ', hit from the ' + dirFoe : '') + (e.rear ? ' (from behind)' : '') + ', shooter unseen' : B + what + (A ? ', shot by ' + A + ', ' + tiles(e) + ' ' + dirFoe + (e.rear ? ' (from behind)' : '') + weapon(e) : '');
    else text = B + what + (A && A !== B ? ' (' + A + '’s' + (e.how === 'MORTAR' ? ' mortar' : ' fire') + ')' : '');
    if (e.kia) text += '; left behind: KIA';
  } else if (e.sub === 'CARRY') text = A + ' picked up ' + (e.what || 'the operator') + ' (' + e.b + ')';
  else if (e.sub === 'KIA') text = (e.what || B) + ' (' + e.b + ') left behind: KIA';
  else if (e.sub === 'UPLINK') text = A + ' started the uplink';
  else if (e.sub === 'PICKUP') text = A + ' grabbed the cargo: the whole field turned on them';
  else if (e.sub === 'HANDOFF') text = A + ' handed the cargo to ' + e.what;
  else if (e.sub === 'CARGO_LOST') text = 'the cargo went down with ' + A;
  else if (e.sub === 'ROUTE') text = 'route ' + e.what + ' picked for the transport';
  else if (e.sub === 'QUOTA') text = 'bounty quota reached (' + e.what + ')';
  else if (e.sub === 'OUT') text = A + ' extracted';
  else if (e.sub === 'END') text = e.what;
  else text = e.sub.toLowerCase();
  return { turn: e.turn, kind: e.kind, sub: e.sub, held, redacted, text, hl: highlight(e, held) };
}
// What to pulse on the map. Never more than the outcome allows: not held, no field unit's position at all (your own suits,
// the job's own point, and for an enemy-side moment the rounded bearing from your suit).
export function highlight(e: AarEv, held = heldField()): Hl {
  const own: Hl['own'] = [], foe: Hl['foe'] = [];
  const ownA = e.a && !!G.lance.find(m => m.id === e.a), ownB = e.b && !!G.lance.find(m => m.id === e.b);
  // R22 fix (Jamie: "at this point in the replay the patrol should be alive"): each point carries its name, so the view can draw
  // the unit as it was at that turn over whatever the end-of-hunt map shows there (a wreck)
  if (has(e.ax) && ownA) own.push({ x: e.ax, y: e.ay, name: e.aName });
  if (has(e.bx) && ownB) own.push({ x: e.bx, y: e.by, name: e.bName });
  if (held) { if (has(e.ax) && e.a && !ownA) foe.push({ x: e.ax, y: e.ay, name: e.aName, id: e.a }); if (has(e.bx) && e.b && !ownB) foe.push({ x: e.bx, y: e.by, name: e.bName, id: e.b }); }
  const line = held && has(e.ax) && has(e.bx) ? [e.ax, e.ay, e.bx, e.by] : null;
  const bearing = !held && e.side === 'E' && has(e.ax) && has(e.bx) ? { x: e.bx, y: e.by, ang: compassAng(e.bx, e.by, e.ax, e.ay) } : null;
  const spot = e.kind === 'OBJ' && (e.sub === 'UPLINK' || e.sub === 'PICKUP' || (e.sub === 'END' && G.mission && G.mission.type === 'UPLINK')) ? { x: G.up.x, y: G.up.y } : null;
  return { own, foe, line, bearing, spot };
}
// The page's WHAT HAPPENED: the moments as lines, "T7 ..." first
export function aarLines(ev: AarEv[] = G.aar || [], outcome = G.outcome) {
  const held = heldField(outcome);
  return pickMoments(ev).map(m => momentLine(m, held));
}
// "[AAR T7 HIT held] A Mara destroyed a patrol (line), 6 tiles E" (SEND LOG)
export function aarLogLines(L = aarLines()) { return L.map(l => '[AAR T' + l.turn + ' ' + l.kind + ' ' + (l.redacted ? 'redacted' : 'held') + '] ' + l.text); }

// ============================ WHAT IT COST ============================
export type CostLine = { text: string; ref: number | null }; // ref = the shown moment's turn it points back to (← T7)
// Company lines after the hunt (G after finishHunt): people, suits, pay, salvage, the hull, the contract's books.
// shown = the moments on the page (a line only points back to one of them).
export function costLines(shown: { turn: number; sub: string; a?: string; b?: string; what?: string }[]): CostLine[] {
  const out: CostLine[] = [], ref = (f: (m) => boolean) => { const m = shown.find(f); return m ? m.turn : null; };
  const ct = G.ct, co = ct ? G.co : null; // a test-bed hunt is outside the company
  for (const m of G.lance) {
    const nm = nameOf(m), f = m.op ? fateOf(m) : '';
    if (m.op && f === 'KIA') out.push({ text: m.op.name + ' (' + m.id + ') KIA' + (co ? ': on the memorial' : ''), ref: ref(x => (x.sub === 'KIA' || x.sub === 'DOWN') && x.b === m.id) });
    else if (m.op && f === 'SAVED') out.push({ text: m.op.name + ' (' + m.id + ') CRITICAL, lives: benched ' + (co ? benchOf(m) : TUNE.OP_BENCH) + ' contract' + (benchOf(m) === 1 ? '' : 's'), ref: ref(x => (x.sub === 'DOWN' || x.sub === 'CARRY') && x.b === m.id) });
    const lost = Math.max(0, (m.hits0 ?? m.maxHits) - Math.max(0, m.hits));
    const rb = co ? suitCost('rebuild', m.id) : null, rec = !!(ct && ct.carry && ct.carry[m.id] && ct.carry[m.id].recovered);
    if (m.dead && !(m.hits0 === 0)) out.push({ text: nm + (rec ? ' recovered from the field: rebuild ' : ' LOST' + (co && TUNE.RECOVER_HELD ? ' (field lost, wreck left)' : '') + ': rebuild ') + (rb ? rb.parts + ' parts + ' + rb.cr + ' cr' : TUNE.COST_REBUILD + ' cr'), ref: ref(x => x.sub === 'DOWN' && x.b === m.id) });
    else if (lost > 0) {
      const wrecked = (m.partsLost || []).filter(p => p !== 'CORE').map(partName);
      out.push({ text: nm + ': ' + lost + ' hit' + (lost > 1 ? 's' : '') + ' to repair' + (wrecked.length ? ' (' + wrecked.join(', ') + ' wrecked)' : '') + (co ? ', ' + lost * partsPerRepair() + ' parts + ' + lost * TUNE.REPAIR_CR + ' cr' : ''),
        ref: ref(x => x.sub === 'PART' && x.b === m.id) });
    }
  }
  const lv = G.lance.filter(m => m.op && fateOf(m) === 'OK' && m.op.lvl > (m.lvl0 || m.op.lvl)).map(m => m.op.name.split(' ')[0] + ' to level ' + m.op.lvl);
  if (lv.length) out.push({ text: 'Level up: ' + lv.join(', '), ref: null });
  const r = ct && ct.results && ct.results[ct.results.length - 1];
  if (r && r.pay) out.push({ text: '+' + r.pay + ' cr hunt pay' + (G.kills ? ' (' + G.kills + ' kill' + (G.kills > 1 ? 's' : '') + ')' : ''), ref: ref(x => x.sub === 'END') });
  else if (r) out.push({ text: 'No hunt pay', ref: ref(x => x.sub === 'END') });
  if (co && G.kills && G.salvage !== undefined) out.push({ text: '+' + G.salvage + ' parts salvage (hold ' + co.parts + ')' + (G.salvage < G.kills * TUNE.SALVAGE_PER_KILL ? ', the rest left: hold full' : ''), ref: ref(x => x.sub === 'KILL') });
  const S = G.scanCost;
  if (S && S.hull === 'hit') out.push({ text: 'Ship painted and hit: −' + TUNE.SHIP_HIT_COST + ' cr at contract end', ref: null });
  else if (S && S.hull === 'soaked') out.push({ text: 'Ship painted and hit: the HULL ARMOUR soaked it', ref: null });
  const L = co && co.ledger;
  if (L && ct && ct.status !== 'ACTIVE' && L.n === co.n) out.push({ text: 'Contract ' + L.status + ': ' + (L.fee ? 'fee +' + L.fee + ', ' : '') + 'wages −' + L.wages + ', upkeep −' + L.upkeep + (L.hull ? ', hull −' + L.hull : '') + ' → ' + L.after + ' cr' + (co.folded ? ' · FOLDED' : co.debt ? ' · IN DEBT' : ''), ref: null });
  else if (co) out.push({ text: 'Company: ' + co.credits + ' cr, ' + co.parts + ' parts, ' + co.fuel + ' fuel', ref: null });
  // R23: the contract's standing changes (who you angered), after the books: "Foundry −25 → −25 (NEUTRAL): you hit them ← T6"
  const city = co && co.city && L && ct && ct.status !== 'ACTIVE' && L.n === co.n ? (co.city.last || []) : [];
  const hitRef = ref(x => x.sub === 'UPLINK' || x.sub === 'PICKUP' || x.sub === 'QUOTA' || x.sub === 'KILL') ?? ref(x => x.sub === 'END');
  return out.slice(0, TUNE.AAR_COST_MAX).concat(city.map((t: string) => ({ text: t, ref: /you hit them/.test(t) ? hitRef : null })));
}
function benchOf(m) { const o = G.co && G.co.ops.find(x => x.id === m.op.id); return o ? o.bench : TUNE.OP_BENCH; }
