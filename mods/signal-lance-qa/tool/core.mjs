// QA panel playtest tool, the core (claude/signal-lance-qa-harness.md, step 2): one browser, one isolated context per
// tester session. Everything a session does lands in qa-runs/<batch>/<session>/ and in qa-runs/<batch>/live.jsonl (the
// watch pane's feed). Testers see view() text and their own screenshots; oracle() and checks() go to files only.
import { chromium, devices } from 'playwright';
import { mkdirSync, writeFileSync, appendFileSync, readFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve, dirname, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
export const ROOT = resolve(here, '../../..');
export const RUNS = resolve(process.env.SLQA_RUNS || resolve(ROOT, 'qa-runs'));
const GAME = pathToFileURL(resolve(ROOT, 'signal-lance/dist-qa/signal-lance.html')).href;

// Devices: screenshots are taken at CSS size, so each stays ≤1280 px on the long edge (≈1.2k tokens at most)
export const DEVICES = {
  iphone: { ...devices['iPhone 15 landscape'] },
  ipad: { ...devices['iPad Pro 11 landscape'] },
  desktop: { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 },
};
// Budgets per session (actions = every command but look/think/status; images = looks with a screenshot)
const BUDGET = { haiku: { actions: 120, images: 40 }, short: { actions: 80, images: 30 }, long: { actions: 60, images: 20 } };
export const budgetFor = (m) => m.actions ? { actions: +m.actions, images: +(m.images || 30) } : m.model === 'haiku' ? BUDGET.haiku : m.length === 'long' ? BUDGET.long : BUDGET.short; // a plan may fix it (the model comparison does)

// The campaign's seeds come from Math.random in the view: seed it before the page loads, so a session repeats
const seedRandom = (seed) => {
  let s = seed >>> 0;
  Math.random = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
};

let browser = null;
const sessions = new Map();
const now = () => new Date().toISOString();
const jl = (f, o) => appendFileSync(f, JSON.stringify(o) + '\n');

export function live(batch, o) { mkdirSync(resolve(RUNS, batch), { recursive: true }); jl(resolve(RUNS, batch, 'live.jsonl'), { t: now(), ...o }); }

class Session {
  constructor(meta) {
    this.m = meta; this.id = meta.session; this.dir = resolve(RUNS, meta.batch, meta.session);
    this.steps = 0; this.actions = 0; this.images = 0; this.lastShot = ''; this.seen = new Set(); this.canvasTaps = 0;
    this.pageErrors = []; this.ended = false; this.budget = budgetFor(meta);
  }
  feed(kind, o = {}) { live(this.m.batch, { session: this.id, kind, step: this.steps, ...o }); }
  async open() {
    mkdirSync(resolve(this.dir, 'shots'), { recursive: true });
    if (!browser) browser = await chromium.launch();
    this.ctx = await browser.newContext({ ...DEVICES[this.m.device] });
    await this.ctx.addInitScript(seedRandom, Number(this.m.seed) >>> 0);
    this.p = await this.ctx.newPage();
    this.p.on('pageerror', e => { this.pageErrors.push(e.message); this.oracleHit(['page error: ' + e.message]); });
    await this.p.goto(GAME);
    await this.p.waitForFunction(() => window.__qa && window.__qa.version === 1, null, { timeout: 15000 });
    if (this.m.load) { // a relay hand: the last hand's save, then reload so the game starts from it
      const snap = JSON.parse(readFileSync(this.m.load, 'utf8'));
      await this.qa('load', [snap]); await this.p.reload();
      await this.p.waitForFunction(() => window.__qa && window.__qa.version === 1, null, { timeout: 15000 });
    }
    writeFileSync(resolve(this.dir, 'meta.json'), JSON.stringify({ ...this.m, started: now(), budget: this.budget }, null, 1));
    this.feed('start', { meta: this.m });
  }
  qa(fn, a) {
    return this.p.evaluate(([f, x]) => { const parts = f.split('.'); let o = window.__qa; for (const k of parts.slice(0, -1)) o = o[k]; return o[parts.at(-1)](...(x || [])); }, [fn, a]);
  }
  oracleHit(list) {
    const fresh = list.filter(v => !this.seen.has(v)); if (!fresh.length) return;
    for (const v of fresh) this.seen.add(v);
    jl(resolve(this.dir, 'oracle.jsonl'), { t: now(), step: this.steps, violations: fresh });
    this.feed('oracle', { violations: fresh });
  }
  async after() { // after every action: settle, then the invariants (harness only)
    await this.p.waitForTimeout(300);
    try { this.oracleHit(await this.qa('checks')); } catch (e) { this.oracleHit(['checks() threw: ' + e.message]); }
  }
  spend(kind) {
    if (this.ended) throw new Error('SESSION ENDED');
    if (kind === 'image' && this.images >= this.budget.images) throw new Error('IMAGE BUDGET SPENT (' + this.budget.images + '): use look without --image, or end');
    if (kind === 'action' && this.actions >= this.budget.actions) throw new Error('BUDGET SPENT (' + this.budget.actions + ' actions): write your last notes and call end');
    if (kind === 'image') this.images++; if (kind === 'action') this.actions++;
    this.steps++;
  }
  left() { return 'budget: actions ' + this.actions + '/' + this.budget.actions + ' · images ' + this.images + '/' + this.budget.images; }

  // ---------- tester commands ----------
  async look({ image = false, zoom = '' } = {}) {
    if (image || zoom) this.spend('image'); else this.steps++;
    const v = await this.qa('view');
    let out = viewText(v);
    if (image || zoom) {
      const f = resolve(this.dir, 'shots', String(this.steps).padStart(3, '0') + (zoom ? '-zoom' : '') + '.png');
      if (zoom) { const [x, y, w, h] = zoom.split(',').map(Number); await this.p.screenshot({ path: f, clip: { x, y, width: w, height: h }, scale: 'device' }); }
      else await this.p.screenshot({ path: f, scale: 'css' });
      this.lastShot = f; out += '\nSCREENSHOT ' + f + '  (open it with the Read tool)';
      this.feed('look', { shot: relative(RUNS, f), screens: v.screens });
    }
    return out + '\n' + this.left();
  }
  async tap(target) {
    this.spend('action');
    const v = await this.qa('view');
    let x, y, what;
    const xy = /^(-?\d+)\s*,\s*(-?\d+)$/.exec(String(target).trim());
    if (xy) { x = +xy[1]; y = +xy[2]; what = x + ',' + y; const hit = v.buttons.find(b => Math.abs(b.x - x) <= b.w / 2 && Math.abs(b.y - y) <= b.h / 2); if (hit) what += ' (on the ' + (hit.text || hit.id) + ' control)'; else this.canvasTaps++; }
    else {
      const t = String(target).trim().toLowerCase();
      const b = v.buttons.find(b => b.id.toLowerCase() === t) || v.buttons.find(b => b.text.toLowerCase() === t) || v.buttons.find(b => b.text.toLowerCase().startsWith(t)) || v.buttons.find(b => b.text.toLowerCase().includes(t));
      if (!b) { this.feed('action', { cmd: 'tap', target, result: 'no such control' }); return 'NO VISIBLE CONTROL matching "' + target + '". (Nothing was tapped.) Controls now: ' + v.buttons.map(b => b.id || b.text).join(' | ') + (v.scrollMore ? '\nMore below in: ' + v.scrollMore.join(', ') + ' (scroll)' : ''); }
      x = b.x; y = b.y; what = (b.id ? '[' + b.id + '] ' : '') + b.text;
    }
    if (DEVICES[this.m.device].hasTouch) await this.p.touchscreen.tap(x, y); else await this.p.mouse.click(x, y);
    await this.after();
    const r = await this.changed(v, 'tapped ' + what);
    this.feed('action', { cmd: 'tap', target: what, result: r.split('\n')[0] });
    return r;
  }
  async drag(points) {
    this.spend('action');
    const v = await this.qa('view');
    const pts = points.map(s => s.split(',').map(Number));
    const touch = DEVICES[this.m.device].hasTouch;
    if (touch) await this.p.evaluate((ps) => { // touch drags as pointer events (the game listens to pointer events on the canvas)
      const cv = document.getElementById('cv'); const ev = (type, [x, y]) => cv.dispatchEvent(new PointerEvent(type, { clientX: x, clientY: y, pointerId: 7, pointerType: 'touch', isPrimary: true, bubbles: true, buttons: type === 'pointerup' ? 0 : 1 }));
      ev('pointerdown', ps[0]); for (let i = 1; i < ps.length; i++) { const [a, b] = [ps[i - 1], ps[i]]; for (let k = 1; k <= 6; k++) ev('pointermove', [a[0] + (b[0] - a[0]) * k / 6, a[1] + (b[1] - a[1]) * k / 6]); } ev('pointerup', ps.at(-1));
    }, pts);
    else { await this.p.mouse.move(...pts[0]); await this.p.mouse.down(); for (const q of pts.slice(1)) await this.p.mouse.move(q[0], q[1], { steps: 6 }); await this.p.mouse.up(); }
    this.canvasTaps++;
    await this.after();
    const r = await this.changed(v, 'dragged ' + points.join(' → '));
    this.feed('action', { cmd: 'drag', target: points.join(' '), result: r.split('\n')[0] });
    return r;
  }
  async scroll(panel, dy = 300) {
    this.spend('action');
    const ok = await this.p.evaluate(([id, d]) => { const el = document.getElementById(id) || document.querySelector('.panel:not([hidden])'); if (!el) return ''; el.scrollBy(0, d); return el.id; }, [panel, Number(dy)]);
    await this.after();
    this.feed('action', { cmd: 'scroll', target: panel + ' ' + dy, result: ok ? 'scrolled ' + ok : 'no panel' });
    return (ok ? 'scrolled ' + ok + ' by ' + dy : 'no such panel open') + '\n' + viewText(await this.qa('view'), true) + '\n' + this.left();
  }
  async type(text, into = '') {
    this.spend('action');
    if (into) await this.p.click('#' + into).catch(() => {});
    await this.p.keyboard.type(String(text)); await this.after();
    this.feed('action', { cmd: 'type', target: into, result: 'typed' });
    return 'typed "' + text + '"' + (into ? ' into ' + into : '') + '\n' + this.left();
  }
  async key(k) { this.spend('action'); await this.p.keyboard.press(k); await this.after(); this.feed('action', { cmd: 'key', target: k }); return 'pressed ' + k + '\n' + viewText(await this.qa('view'), true); }
  async wait(timeout = 30000) {
    this.steps++;
    const t0 = Date.now();
    try { await this.p.waitForFunction(() => { const v = window.__qa.view(); return v.myMove || v.mode !== 'hunt' || v.screens.some(s => s !== 'hunt'); }, null, { timeout, polling: 250 }); }
    catch (_) { await this.after(); this.feed('action', { cmd: 'wait', result: 'timeout' }); return 'still not your move after ' + Math.round(timeout / 1000) + 's\n' + viewText(await this.qa('view'), true); }
    await this.after();
    const v = await this.qa('view');
    this.feed('action', { cmd: 'wait', result: (v.myMove ? 'your move' : v.screens.join(',')) + ' after ' + ((Date.now() - t0) / 1000).toFixed(1) + 's' });
    return (v.myMove ? 'YOUR MOVE' : 'screen changed') + ' (waited ' + ((Date.now() - t0) / 1000).toFixed(1) + 's)\n' + viewText(v) + '\n' + this.left();
  }
  async fallback(action, args, why) {
    if (this.canvasTaps < 2) return 'REFUSED: fallbacks are only for after 2 real taps / drags on the map missed. Try tapping first (' + this.canvasTaps + ' so far).';
    this.spend('action');
    const a = action === 'select' ? [args[0]] : action === 'draw' ? [args.map(s => { const [x, y] = s.split(',').map(Number); return { x, y }; })] : args[0].split(',').map(Number);
    const r = await this.qa('fallback.' + action, a);
    this.canvasTaps = 0; await this.after();
    this.feed('fallback', { action, args, why, ok: r.ok });
    jl(resolve(this.dir, 'findings.jsonl'), await this.stamp({ category: 'ux', severity: 'minor', title: 'Input friction: needed the ' + action + ' fallback', actual: why || '', source: 'fallback' }));
    return (r.ok ? 'done (' + action + ')' : 'refused: ' + r.why) + '\n' + viewText(await this.qa('view'), true) + '\n' + this.left();
  }
  async note(f) {
    this.steps++;
    const rec = await this.stamp({ ...f, source: 'tester' });
    jl(resolve(this.dir, 'findings.jsonl'), rec);
    this.feed('note', { category: f.category, severity: f.severity, title: f.title });
    return 'noted #' + this.countNotes() + ' (' + f.category + '/' + f.severity + ')';
  }
  think(text) { this.steps++; appendFileSync(resolve(this.dir, 'notebook.md'), '- [' + this.steps + '] ' + text + '\n'); this.feed('think', { text }); return 'ok'; }
  countNotes() { const f = resolve(this.dir, 'findings.jsonl'); return existsSync(f) ? readFileSync(f, 'utf8').trim().split('\n').filter(l => l.includes('"source":"tester"')).length : 0; }
  async stamp(f) {
    let o = {}, logTail = [], screens = [];
    try { o = await this.qa('oracle'); logTail = (await this.qa('log')).slice(-15); screens = (await this.qa('view')).screens; } catch (_) {}
    return { t: now(), batch: this.m.batch, session: this.id, persona: this.m.persona, model: this.m.model, device: this.m.device, knowledge: this.m.knowledge,
      build: o.build, step: this.steps, screens, seed: { session: this.m.seed, hunt: o.seed, mtype: o.mtype, comp: o.comp, company: o.company?.code }, shot: this.lastShot ? relative(RUNS, this.lastShot) : '',
      ...f, oracle: o, violations: [...this.seen], logTail };
  }
  async checkpoint(k) {
    const snap = await this.qa('save'); const f = resolve(this.dir, 'save-' + k + '.json');
    writeFileSync(f, JSON.stringify(snap)); this.feed('checkpoint', { k, file: relative(RUNS, f) });
    return f;
  }
  async end(summary, handoff = '') {
    if (this.ended) return 'already ended';
    this.ended = true;
    const save = await this.checkpoint('end');
    const res = { session: this.id, ended: now(), steps: this.steps, actions: this.actions, images: this.images, notes: this.countNotes(), oracle: this.seen.size, pageErrors: this.pageErrors.length, summary, handoff, save };
    writeFileSync(resolve(this.dir, 'result.json'), JSON.stringify(res, null, 1));
    if (handoff) appendFileSync(resolve(this.dir, 'notebook.md'), '\n## HAND-OFF\n' + handoff + '\n');
    this.feed('end', { summary, notes: res.notes, oracle: res.oracle });
    await this.ctx.close(); sessions.delete(this.id);
    return 'session ended · ' + res.notes + ' notes · save ' + save;
  }
  async changed(before, what) { // what the action did, in one line, then the new view
    const v = await this.qa('view');
    const bits = [];
    if (before.screens.join() !== v.screens.join()) bits.push('screen ' + before.screens.join('+') + ' → ' + v.screens.join('+'));
    if (v.mode === 'hunt' && before.mode === 'hunt') {
      if (before.turn !== v.turn) bits.push('turn ' + before.turn + ' → ' + v.turn);
      if (before.active !== v.active) bits.push('active suit ' + before.active + ' → ' + v.active);
      const ap = (x) => x.suits?.find(s => s.active)?.ap; if (ap(before) !== ap(v) && before.active === v.active) bits.push('AP ' + ap(before) + ' → ' + ap(v));
      if ((before.contacts || []).length !== (v.contacts || []).length) bits.push('contacts ' + (before.contacts || []).length + ' → ' + (v.contacts || []).length);
    }
    const bt = new Set(before.buttons.map(b => b.text)), nt = v.buttons.filter(b => !bt.has(b.text)).map(b => b.text);
    if (nt.length) bits.push('new/changed controls: ' + nt.slice(0, 8).join(' | '));
    return what + ': ' + (bits.length ? bits.join('; ') : 'no visible change') + '\n' + viewText(v) + '\n' + this.left();
  }
}

// The tester's text view of the screen (compact; positions are screen px, for tapping)
export function viewText(v, short = false) {
  const L = [];
  const head = ['SCREEN ' + v.screens.join('+'), 'mode ' + v.mode];
  if (v.mode === 'hunt') head.push('turn ' + v.turn, v.myMove ? 'YOUR MOVE' : 'phase ' + v.phase, 'mission ' + v.mission, 'active suit ' + v.active, 'move mode ' + v.moveMode, ...(v.armed?.length ? ['armed: ' + v.armed.join(',')] : []));
  L.push(head.join(' · ') + ' · viewport ' + v.viewport.w + 'x' + v.viewport.h);
  if (v.mode === 'hunt' && !short) {
    if (v.hud) L.push('HUD: ' + v.hud);
    if (v.init) L.push('ORDER: ' + v.init);
    L.push('SUITS: ' + v.suits.map(s => s.id + (s.active ? '*' : '') + (s.dead ? ' DOWN' : s.out ? ' OUT' : ' AP' + s.ap + ' EN' + s.en + '/' + s.enMax + ' hits ' + s.hits + '/' + s.maxHits + ' @' + s.x + ',' + s.y)).join(' | '));
    if (v.contacts.length) L.push('CONTACTS: ' + v.contacts.map(c => c.id + ' "' + c.label + '" @' + c.x + ',' + c.y + ' circle r' + c.r + (c.stale ? ' (old)' : '') + (c.onScreen ? '' : ' (off screen)')).join(' | '));
    if (v.selected) L.push('SELECTED: ' + v.selected);
    if (v.uplink) L.push('UPLINK ' + v.uplink.name + ' ' + v.uplink.prog + '/' + v.uplink.of + ' @' + v.uplink.x + ',' + v.uplink.y);
    L.push('EXTRACTION strip starts at screen x ' + v.extractFromX);
  }
  L.push('CONTROLS: ' + v.buttons.map(b => (b.id ? '[' + b.id + '] ' : '') + (b.text || '(no text)') + (b.on ? '' : ' (off)') + ' @' + b.x + ',' + b.y).join(' | '));
  if (v.scrollMore) L.push('MORE BELOW in: ' + v.scrollMore.join(', ') + ' (scroll <panel>)');
  return L.join('\n');
}

export async function startSession(meta) {
  for (const k of ['batch', 'session', 'persona', 'model', 'device', 'seed']) if (!meta[k]) throw new Error('start needs --' + k);
  if (!DEVICES[meta.device]) throw new Error('device must be ' + Object.keys(DEVICES).join(' | '));
  if (sessions.has(meta.session)) throw new Error('session ' + meta.session + ' is already running');
  const s = new Session(meta); await s.open(); sessions.set(s.id, s);
  return 'session ' + s.id + ' started (' + meta.device + ', seed ' + meta.seed + ', ' + s.left() + ')\n' + viewText(await s.qa('view'));
}
export const getSession = (id) => { const s = sessions.get(id); if (!s) throw new Error('no running session ' + id); return s; };
export const running = () => [...sessions.keys()];
export async function shutdown() { for (const s of sessions.values()) await s.end('(stopped by the harness)').catch(() => {}); if (browser) await browser.close(); browser = null; }

// The lead's view of a batch: counts only, never transcripts
export function progress(batch) {
  const dir = resolve(RUNS, batch); if (!existsSync(dir)) return { batch, sessions: [] };
  const out = { batch, sessions: [], findings: { byCategory: {}, bySeverity: {}, byPersona: {}, byDevice: {} }, oracle: 0, screensSeen: {} };
  for (const id of readdirSync(dir, { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name)) {
    const sd = resolve(dir, id), meta = existsSync(resolve(sd, 'meta.json')) ? JSON.parse(readFileSync(resolve(sd, 'meta.json'), 'utf8')) : {};
    const res = existsSync(resolve(sd, 'result.json')) ? JSON.parse(readFileSync(resolve(sd, 'result.json'), 'utf8')) : null;
    const F = existsSync(resolve(sd, 'findings.jsonl')) ? readFileSync(resolve(sd, 'findings.jsonl'), 'utf8').trim().split('\n').filter(Boolean).map(l => JSON.parse(l)) : [];
    const O = existsSync(resolve(sd, 'oracle.jsonl')) ? readFileSync(resolve(sd, 'oracle.jsonl'), 'utf8').trim().split('\n').filter(Boolean).map(l => JSON.parse(l)) : [];
    for (const f of F) for (const [k, v] of [['byCategory', f.category], ['bySeverity', f.severity], ['byPersona', meta.persona], ['byDevice', meta.device]]) out.findings[k][v] = (out.findings[k][v] || 0) + 1;
    out.oracle += O.reduce((a, o) => a + o.violations.length, 0);
    out.sessions.push({ id, persona: meta.persona, model: meta.model, device: meta.device, length: meta.length, seed: meta.seed, state: res ? 'done' : sessions.has(id) ? 'running' : 'stopped', findings: F.length, actions: res?.actions, summary: res?.summary });
  }
  if (existsSync(resolve(dir, 'live.jsonl'))) for (const l of readFileSync(resolve(dir, 'live.jsonl'), 'utf8').trim().split('\n')) { try { const e = JSON.parse(l); for (const s of e.screens || []) out.screensSeen[s] = (out.screensSeen[s] || 0) + 1; } catch (_) {} }
  return out;
}
