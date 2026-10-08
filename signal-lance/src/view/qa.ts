// QA panel step 1 (claude/signal-lance-qa-harness.md): window.__qa, in QA builds only (npm run build:qa / dev:qa).
// The normal build never includes this file (main.ts imports it behind __QA__).
//   tester side:  view() = only what the player can see; fallback.* = a canvas action a tap would do (counted + logged)
//   harness side: oracle() = the hidden truth; checks() = rule + screen invariants; log(); save() / load(); events()
import { TUNE } from '../tune.ts';
import { G, hooks, unitById } from '../sim/state.ts';
import { W, T } from '../sim/world.ts';
import { cx, cy } from '../sim/sensors.ts';
import { seed as rngSeed } from '../sim/rng.ts';
import { isType } from '../sim/mission.ts';
import { playerFree, cmdTarget, cmdSelect, cmdFace, cmdGhost, cmdMortarAt, cmdDraw } from '../sim/turns.ts';
import { checkInvariants } from '../sim/invariants.ts';
import { V, camZ } from './state.ts';
import { vw, vh, contactLabel } from './render.ts';
import { syncButtons } from './hud.ts';
import { BUILD, VERSION, logLine } from './screens.ts';

const PREFIX = 'signalLance.';
const ev = { activations: 0, ends: 0, syncs: 0, hits: 0, fallbacks: 0 };
const r1 = (n: number) => Math.round(n * 10) / 10;
const toScreen = (wx: number, wy: number) => { const z = camZ(); return { x: Math.round(vw / 2 + (wx - V.camX) * z), y: Math.round(vh / 2 + (wy - V.camY) * z) }; };
const toWorld = (sx: number, sy: number) => { const z = camZ(); return { x: (sx - vw / 2) / z + V.camX, y: (sy - vh / 2) / z + V.camY }; };
const onScreen = (p: { x: number; y: number }) => p.x >= 0 && p.y >= 0 && p.x <= vw && p.y <= vh;
const shown = (el: Element | null) => !!el && (el as HTMLElement).getClientRects().length > 0 && !(el as HTMLElement).closest('[hidden]');
const txt = (el: Element | null, n = 400) => (el ? (el as HTMLElement).innerText || '' : '').replace(/\s+/g, ' ').trim().slice(0, n);

// The open screens, by panel id (a hunt with no panel open = 'hunt'). Overlays (CARD, ID, sheet, rotate) count as screens too.
function screens(): string[] {
  const s = Array.from(document.querySelectorAll('.panel, .sheet, #rot')).filter(shown).map(e => e.id);
  if (!s.length && G.mode === 'hunt') s.push('hunt');
  return s;
}
// Every visible, tappable control: id (or ''), its text, enabled, its centre on screen. Covered ones (under a panel, or
// scrolled out of their panel) are left out: a player can't tap them either. Delegated taps are found by their classes.
const TAPPABLE = 'button, input, .cotab, .cyd, .aarm, .aarc.ref, .hhit, .idv, .qa, .rf, .sa, .sd, .sdz, .seatb, .ss, .tbplay';
function buttons() {
  const out: any[] = [];
  for (const b of Array.from(document.querySelectorAll(TAPPABLE))) {
    if (!shown(b) || (b.parentElement && b.parentElement.closest(TAPPABLE))) continue; // the outer control only
    const r = (b as HTMLElement).getBoundingClientRect();
    if (r.width < 1 || r.height < 1 || r.bottom < 0 || r.right < 0 || r.top > vh || r.left > vw) continue;
    const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    if (!top || !(b === top || b.contains(top))) continue;
    const d = (b as HTMLElement).dataset, key = Object.keys(d).map(k => k + '=' + d[k]).join(' ');
    out.push({ id: b.id || '', text: txt(b, 40) || (b as HTMLInputElement).placeholder || (b as any).textContent?.trim().slice(0, 40) || '', ...(key ? { data: key } : {}), on: !(b as HTMLButtonElement).disabled,
      x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2), w: Math.round(r.width), h: Math.round(r.height) });
  }
  return out;
}

// Only what the player can see: no hidden units, no true positions of contacts (their drawn fix and circle instead)
export function view() {
  const hunt = G.mode === 'hunt', open = screens(), z = camZ();
  const v: any = { build: BUILD, screens: open, mode: G.mode, myMove: hunt && playerFree() && open.length === 1 && open[0] === 'hunt',
    viewport: { w: vw, h: vh }, buttons: buttons() };
  const more = Array.from(document.querySelectorAll('.panel, #hsbox')).filter(e => shown(e) && e.scrollHeight > e.clientHeight + 4 && e.scrollTop + e.clientHeight < e.scrollHeight - 4).map(e => e.id);
  if (more.length) v.scrollMore = more; // panels with more below (scroll to see it)
  if (hunt) {
    Object.assign(v, { phase: G.phase, turn: G.turn, mission: G.mtype, moveMode: G.pmode, active: G.p ? G.p.id : '',
      hud: txt(document.getElementById('hud'), 600), init: txt(document.getElementById('init'), 200) });
    v.suits = G.lance.map(m => ({ id: m.id, active: m === G.p, dead: !!m.dead, out: !!m.out, ap: m.ap, en: Math.round(m.en), enMax: m.enMax,
      hits: m.hits, maxHits: m.maxHits, ...toScreen(m.x, m.y) }));
    v.contacts = G.pc.filter(c => c.on).map(c => { const p = toScreen(cx(c), cy(c)); return { id: c.id, label: contactLabel(c), ...p, r: Math.round(c.unc * z), stale: c.lost > 0, onScreen: onScreen(p) }; });
    if (G.sel && G.sel.on) v.selected = G.sel.id;
    if (isType('UPLINK')) v.uplink = { name: G.up.name, prog: G.up.prog, of: TUNE.UPLINK_TURNS, ...toScreen(G.up.x, G.up.y) };
    v.extractFromX = toScreen((W - TUNE.EXTRACT_COLS) * T, 0).x; // the green strip starts here (screen x)
    v.armed = ['faceArm', 'ghostArm', 'mortarArm'].filter(k => V[k]);
  }
  return v;
}

// The hidden truth, for the harness only (never shown to a tester)
export function oracle() {
  const u = (m: any) => m && ({ id: m.id, type: m.type || 'MECH', variant: m.variant || '', x: r1(m.x / T), y: r1(m.y / T), hits: m.hits, maxHits: m.maxHits,
    parts: m.parts, dead: !!m.dead, out: !!m.out, state: m.state || '', ap: m.ap, en: m.en, found: m.found });
  const o: any = { build: BUILD, version: VERSION, mode: G.mode, rngSeed, seed: G.seed, mtype: G.mtype, comp: G.comp ? G.comp.NAME : '', turn: G.turn, phase: G.phase, outcome: G.outcome };
  if (G.mode === 'hunt') { o.lance = G.lance.map(u); o.field = G.units.map(u); o.ally = u(G.ally); o.contacts = G.pc.filter(c => c.on).map(c => ({ id: c.id, fix: [r1(c.tx / T), r1(c.ty / T)], unc: r1(c.unc / T), truth: (() => { const t = unitById(c.id); return t ? [r1(t.x / T), r1(t.y / T)] : null; })() })); }
  if (G.ct) o.contract = { status: G.ct.status, hunt: G.ct.hunt, of: G.ct.hunts, cr: G.ct.cr };
  if (G.co) { const C = G.co; o.company = { code: C.code, credits: C.credits, fuel: C.fuel, parts: C.parts, debt: C.debt, folded: C.folded, ops: C.ops.length, rec: C.rec, standing: C.city ? C.city.standing : null }; }
  return o;
}

// Rule invariants + what the screen shows against the state
export function checks(): string[] {
  const out = checkInvariants();
  const main = screens().filter(s => !['card', 'idp', 'hsheet', 'rot', 'hunt'].includes(s));
  if (main.length > 1) out.push('screen: ' + main.length + ' panels open at once (' + main.join(', ') + ')');
  if (G.mode === 'hunt' && G.p && main.length === 0) {
    const pips = document.getElementById('ap');
    if (pips && !G.p.dead) { const n = (pips.textContent.match(/●/g) || []).length; if (n !== Math.min(G.p.ap, TUNE.AP_BANK_MAX)) out.push('hud: shows ' + n + ' AP pips, suit ' + G.p.id + ' has ' + G.p.ap); }
  }
  const body = document.body.innerText;
  for (const w of ['NaN', 'undefined', '[object Object]']) if (body.includes(w)) out.push('screen: "' + w + '" is showing (' + snippet(body, w) + ')');
  return out;
}
const snippet = (s: string, w: string) => { const i = s.indexOf(w); return s.slice(Math.max(0, i - 30), i + w.length + 30).replace(/\s+/g, ' '); };

// Every signalLance.* localStorage key (relay checkpoints, repeatable campaign starts). load() needs a reload after.
export function save(): Record<string, string> {
  const s: Record<string, string> = {};
  try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith(PREFIX)) s[k] = localStorage.getItem(k); } } catch (_) {}
  return s;
}
export function load(snap: Record<string, string>) {
  try {
    for (const k of Object.keys(localStorage)) if (k.startsWith(PREFIX)) localStorage.removeItem(k);
    for (const [k, v] of Object.entries(snap || {})) if (k.startsWith(PREFIX)) localStorage.setItem(k, v);
  } catch (_) { return false; }
  return true;
}
export function log(): string[] { try { const l = JSON.parse(localStorage.getItem(PREFIX + 'log') || '[]'); return Array.isArray(l) ? l : []; } catch (_) { return []; } }
export function events() { const e = { ...ev }; for (const k of Object.keys(ev)) ev[k] = 0; return e; }

// Fallbacks: the canvas action a tap would do, by intent, for a tester whose taps missed twice. Each is counted and
// logged ([QA] FALLBACK) so the report can count input friction. Screen coordinates in, like a tap.
function fb(name: string, ok: boolean, why = '') {
  ev.fallbacks++; logLine('[QA] FALLBACK ' + name + (ok ? '' : ' REFUSED ' + why)); if (ok) syncButtons();
  return ok ? { ok } : { ok, why };
}
const free = () => playerFree();
export const fallback = {
  target(sx: number, sy: number) { if (!free()) return fb('target', false, 'not your move'); const w = toWorld(sx, sy); cmdTarget(w.x, w.y); return fb('target', true); },
  draw(pts: { x: number; y: number }[]) { if (!free()) return fb('draw', false, 'not your move'); cmdDraw(pts.map(p => toWorld(p.x, p.y))); return fb('draw', true); },
  select(id: string) { const c = G.pc.find(c => c.on && c.id === id); if (!free() || !c) return fb('select', false, c ? 'not your move' : 'no such contact'); cmdSelect(c); return fb('select', true); },
  face(sx: number, sy: number) { if (!free()) return fb('face', false, 'not your move'); const w = toWorld(sx, sy); V.faceArm = false; cmdFace(w.x, w.y); return fb('face', true); },
  ghost(sx: number, sy: number) { if (!free()) return fb('ghost', false, 'not your move'); const w = toWorld(sx, sy); V.ghostArm = false; cmdGhost(w.x, w.y); return fb('ghost', true); },
  mortarAt(sx: number, sy: number) { if (!free()) return fb('mortarAt', false, 'not your move'); const w = toWorld(sx, sy); V.mortarArm = false; cmdMortarAt(w.x, w.y); return fb('mortarAt', true); },
};

export function install() {
  // count what happened between harness polls (wrapping the hooks main.ts set, so the game behaves the same)
  const wrap = (k: string, n: string) => { const f = hooks[k]; hooks[k] = (...a: any[]) => { ev[n]++; return f(...a); }; };
  wrap('activate', 'activations'); wrap('end', 'ends'); wrap('sync', 'syncs'); wrap('playerHit', 'hits');
  (window as any).__qa = { version: 1, build: BUILD, view, oracle, checks, log, save, load, events, fallback };
}
