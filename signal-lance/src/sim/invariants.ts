// QA panel (claude/signal-lance-qa-harness.md): rule invariants the harness checks after every tester action.
// Pure: reads G only. Each violation is one short line naming the unit and the broken rule; [] = all good.
// Keep these conservative: a false alarm here becomes a false bug in the QA report.
import { TUNE } from '../tune.ts';
import { G } from './state.ts';
import { W, H, T } from './world.ts';

const bad = (v: any) => typeof v !== 'number' || !Number.isFinite(v);

export function checkInvariants(): string[] {
  const out: string[] = [];
  const say = (s: string) => { if (!out.includes(s)) out.push(s); };
  if (G.mode === 'hunt') {
    if (!G.p || !G.lance.includes(G.p)) say('hunt: no active suit (G.p is not in the lance)');
    if (G.turn < 1 || bad(G.turn)) say('hunt: turn is ' + G.turn);
    for (const m of G.lance) unitChecks(m, 'suit ' + m.id, say, true);
    for (const u of G.units) unitChecks(u, 'field ' + u.id, say, false);
    if (G.ally) unitChecks(G.ally, 'ally ' + G.ally.id, say, false);
    for (const c of G.pc) if (c.on && (bad(c.tx) || bad(c.ty) || bad(c.unc) || c.unc < 0)) say('contact ' + c.id + ': position or circle is not a number');
  }
  if (G.co) {
    const C = G.co;
    for (const k of ['credits', 'fuel', 'parts']) if (bad(C[k])) say('company: ' + k + ' is ' + C[k]);
    if (C.fuel < 0) say('company: fuel below zero (' + C.fuel + ')');
    if (C.parts < 0) say('company: parts below zero (' + C.parts + ')');
    if (!C.folded && C.credits < -TUNE.DEBT_LIMIT) say('company: credits ' + C.credits + ' past the debt limit but not folded');
    for (const [id, n] of Object.entries(C.stores || {})) if (bad(n) || (n as number) < 0) say('company: store ' + id + ' count is ' + n);
  }
  return out;
}

function unitChecks(u: any, name: string, say: (s: string) => void, suit: boolean) {
  if (u.out) return; // extracted: off the map
  if (bad(u.x) || bad(u.y)) { say(name + ': position is not a number'); return; }
  if (u.x < 0 || u.y < 0 || u.x > W * T || u.y > H * T) say(name + ': off the map at ' + Math.round(u.x) + ',' + Math.round(u.y));
  if (bad(u.hits) || u.hits < 0) say(name + ': hits is ' + u.hits);
  else if (u.maxHits && u.hits > u.maxHits) say(name + ': hits ' + u.hits + ' above max ' + u.maxHits);
  if (u.parts) for (const [p, v] of Object.entries(u.parts)) if (bad(v)) say(name + ': part ' + p + ' is ' + v);
  if (!suit || u.dead) return;
  if (bad(u.ap) || u.ap < 0 || u.ap > TUNE.AP_BANK_MAX) say(name + ': AP is ' + u.ap + ' (0-' + TUNE.AP_BANK_MAX + ')');
  if (bad(u.en) || u.en < -1e-6 || u.en > u.enMax + 1e-6) say(name + ': energy ' + u.en + ' outside 0-' + u.enMax);
}
