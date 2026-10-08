// R24 checkpoint A: long-press anything. A still finger (or mouse button) held LONGPRESS_MS on a button, a HUD term, a
// job-card term or a stat opens the explain card: the glossary's name and line. Right-click does the same on desktop. The
// map (contacts, marks, ground) goes through input.ts → tip.ts, which calls showExplain too. A long-press never fires the
// button, starts a drag or sets a move. Any tap closes the card (a tap on the map only closes it). Each card logs
// "[ASK] <id>", so the QA panel and Jamie can see what people needed explained. View only: it changes no rule state.
import { TUNE } from '../tune.ts';
import { gloss, byLabel, whyEntry } from './glossary.ts';
import type { Entry } from './glossary.ts';

const $ = (id: string): any => document.getElementById(id);
const esc = (s: any) => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
let askLog: (line: string) => void = () => {};
export function onAsk(fn: (line: string) => void) { askLog = fn; } // screens.ts wires the run log
let shown = false, lastAsk = '', lastAskT = 0;

// Show the card. lines = [title, ...body]; id = what the [ASK] line names.
export function showExplainText(title: string, body: string[], id: string) {
  const el = $('explain'); if (!el) return;
  el.innerHTML = '<b>' + esc(title) + '</b>' + body.filter(Boolean).map(l => '<br>' + esc(l)).join('') + '<br><small class="exq">Tap anywhere to close.</small>';
  el.hidden = false; shown = true;
  const t = Date.now(); if (id !== lastAsk || t - lastAskT > 1500) askLog('[ASK] ' + id); lastAsk = id; lastAskT = t;
}
export function showEntry(e: Entry, extra: string[] = []) { showExplainText(e.name, [e.line, ...extra], e.id); }
// A greyed control's reason: what blocks it, and what would unblock it (A3). key = 'FIRE.LOS'.
export function showWhy(key: string) {
  const [act, code] = key.split('.'), w = whyEntry(act, code);
  if (w) showExplainText(w.name, [w.line], w.id);
}
export function hideExplain() { if (shown) { $('explain').hidden = true; shown = false; } }
export const explainShown = () => shown;

// What an element explains: its data-g term, its data-why reason, or its label read as a glossary name.
function entryOf(t: Element | null): { e?: Entry; why?: string } | null {
  if (!t || !(t as any).closest) return null;
  const g = t.closest('[data-g]') as HTMLElement | null;
  if (g) { const e = gloss(g.dataset.g); if (e) return { e, why: g.dataset.why }; }
  const b = t.closest('button') as HTMLElement | null;
  if (!b) return null;
  const label = b.dataset.label || (b.childNodes[0] ? b.childNodes[0].textContent : b.textContent) || '';
  const e = byLabel(label);
  return e || b.dataset.why ? { e: e || undefined, why: b.dataset.why } : null;
}
function explainEl(t: Element | null) {
  const r = entryOf(t); if (!r) return false;
  const w = r.why ? whyEntry(...(r.why.split('.') as [string, string])) : null;
  if (r.e) showEntry(r.e, w ? [w.name + '. ' + w.line] : []);
  else if (w) showExplainText(w.name, [w.line], w.id);
  return true;
}

// ---- the press: capture phase, so it runs before the buttons' own handlers ----
const press = { id: -1, x: 0, y: 0, t: null as Element | null, timer: 0 as any, fired: false };
let swallowUntil = 0; // the click a browser sends after a swallowed press (if it sends one)
const swallow = () => { swallowUntil = Date.now() + 600; };
const inCanvas = (t: any) => t && t.id === 'cv'; // the map has its own hold (input.ts)
window.addEventListener('pointerdown', e => {
  if (shown) { // any tap closes the card. On the map it only closes it. On a control it closes it and the control still acts.
    hideExplain();
    if (inCanvas(e.target) || !(e.target as any).closest || !(e.target as any).closest('button, [data-g]')) { e.stopPropagation(); e.preventDefault(); press.id = -2; swallow(); return; }
  }
  if (e.button === 2 || inCanvas(e.target)) return;
  clearTimeout(press.timer);
  press.id = e.pointerId; press.x = e.clientX; press.y = e.clientY; press.t = e.target as Element; press.fired = false;
  if (!entryOf(press.t)) { press.id = -1; return; }
  press.timer = setTimeout(() => { if (press.id !== -1 && explainEl(press.t)) press.fired = true; }, TUNE.LONGPRESS_MS);
}, true);
window.addEventListener('pointermove', e => {
  if (e.pointerId === press.id && !press.fired && Math.hypot(e.clientX - press.x, e.clientY - press.y) > TUNE.DRAG_PX) { clearTimeout(press.timer); press.id = -1; }
}, true);
function up(e: PointerEvent) {
  if (press.id === -2) { press.id = -1; e.stopPropagation(); e.preventDefault(); return; } // the tap that closed the card
  if (e.pointerId !== press.id) return;
  clearTimeout(press.timer); press.id = -1;
  if (press.fired) { e.stopPropagation(); e.preventDefault(); swallow(); } // a long-press never fires the control
}
window.addEventListener('pointerup', up, true);
window.addEventListener('pointercancel', e => { if (e.pointerId === press.id) { clearTimeout(press.timer); press.id = -1; } }, true);
window.addEventListener('click', e => { if (Date.now() < swallowUntil) { swallowUntil = 0; e.stopPropagation(); e.preventDefault(); } }, true);
// desktop: right-click = long-press (the map's right-click is in input.ts)
window.addEventListener('contextmenu', e => { e.preventDefault(); if (inCanvas(e.target)) return; hideExplain(); explainEl(e.target as Element); }, true);
