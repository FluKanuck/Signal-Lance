// QA panel step 1 done-check (claude/signal-lance-qa-harness.md): drive the QA build through a seeded hunt on each
// device with real taps, reading window.__qa after every action. Exit 1 on a page error, a checks() violation, or a
// hook that doesn't answer. Needs: cd signal-lance && npm run build:qa;  then here: npm ci && npm run smoke
//   node scripts/smoke.mjs [--seed 12345] [--turns 6] [--out <dir>] [--device iphone|ipad|desktop]
import { chromium, devices } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const SEED = arg('seed', '12345'), TURNS = +arg('turns', 6), OUT = resolve(arg('out', resolve(here, '../.smoke')));
const GAME = pathToFileURL(resolve(here, '../../../signal-lance/dist-qa/signal-lance.html')).href;
export const DEVICES = {
  iphone: { ...devices['iPhone 15 landscape'] },
  ipad: { ...devices['iPad Pro 11 landscape'] },
  desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
};
// The campaign's seeds come from Math.random in the view: seed it (mulberry32) before the page loads, so runs repeat
export const seedRandom = (seed) => {
  let s = seed >>> 0;
  Math.random = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
};

const fails = [];
async function run(name) {
  const dir = resolve(OUT, name); mkdirSync(dir, { recursive: true });
  const browser = await chromium.launch();
  const ctx = await browser.newContext(DEVICES[name]);
  await ctx.addInitScript(seedRandom, +SEED);
  const p = await ctx.newPage();
  const fail = (s) => { fails.push(name + ': ' + s); console.log('  FAIL ' + s); };
  p.on('pageerror', e => fail('page error: ' + e.message));
  const qa = (fn, a) => p.evaluate(([f, x]) => { const parts = f.split('.'); let o = window.__qa; for (const k of parts.slice(0, -1)) o = o[k]; return o[parts.at(-1)](...(x || [])); }, [fn, a]);
  const check = async (when) => { for (const v of await qa('checks')) fail(when + ': ' + v); };
  const scrolled = new Set();
  const tap = async (id) => {
    let b = (await qa('view')).buttons.find(b => b.id === id);
    if (!b) { // below the fold: scroll its panel like a player would, and note it (a tester would report it)
      await p.evaluate((i) => document.getElementById(i)?.scrollIntoView({ block: 'center' }), id); await p.waitForTimeout(150);
      b = (await qa('view')).buttons.find(b => b.id === id); if (b) scrolled.add(id);
    }
    if (!b) return fail('no visible button ' + id); await tapXY(b.x, b.y); await p.waitForTimeout(250); await check('after ' + id); };
  async function tapXY(x, y) { if (DEVICES[name].hasTouch) await p.touchscreen.tap(x, y); else await p.mouse.click(x, y); await p.waitForTimeout(250); }
  const waitMyMove = async () => { await p.waitForFunction(() => { const v = window.__qa.view(); return v.myMove || v.mode !== 'hunt'; }, null, { timeout: 30000 }); return qa('view'); };

  await p.goto(GAME);
  await p.waitForFunction(() => window.__qa && window.__qa.version === 1, null, { timeout: 10000 });
  await tap('bCont'); await tap('bCoTools');
  await p.fill('#seedIn', SEED); await tap('bSeed'); await tap('bScanGo');
  let v = await waitMyMove();
  if (v.mode !== 'hunt') fail('no hunt after DROP (screens ' + v.screens + ')');
  const start = await qa('oracle');
  console.log(`  ${name} ${v.viewport.w}x${v.viewport.h}: hunt seed ${start.seed} ${start.mtype} vs ${start.comp}, ${v.suits.length} suits, ${v.buttons.length} controls`);
  await p.screenshot({ path: resolve(dir, 'hunt-start.png') });

  let moves = 0, fb = 0;
  for (let t = 0; t < TURNS && v.mode === 'hunt'; t++) {
    const me = v.suits.find(s => s.active);
    // real taps: a destination a little ahead (east, toward the extraction strip), then MOVE
    await tapXY(Math.min(v.viewport.w - 80, me.x + 90), me.y); await check('after ground tap');
    let after = await qa('view');
    if (/TAP OR DRAW/.test(after.buttons.find(b => b.id === 'bMove')?.text || '')) { // the tap didn't set a destination: use the fallback once
      const r = await qa('fallback.target', [me.x + 60, me.y + 30]); fb++; if (!r.ok) console.log('  fallback refused: ' + r.why);
    }
    await tap('bMove'); moves++;
    v = await waitMyMove(); if (v.mode !== 'hunt') break;
    if (v.myMove) { await tap('bEnd'); v = await waitMyMove(); }
  }
  if (v.mode === 'hunt' && v.myMove) { const me = v.suits.find(s => s.active), r = await qa('fallback.target', [me.x + 40, me.y]); fb++; if (!r.ok) fail('fallback.target refused on my move: ' + r.why); await check('after fallback'); }
  const ev = await qa('events'), log = await qa('log'), snap = await qa('save');
  await p.screenshot({ path: resolve(dir, 'hunt-end.png') });
  if (!Object.keys(snap).length) fail('save() returned no keys');
  if (!(await qa('load', [snap]))) fail('load() refused its own snapshot');
  if (fb && !log.some(l => l.includes('[QA] FALLBACK'))) fail('fallback not logged');
  const end = await qa('oracle');
  writeFileSync(resolve(dir, 'oracle.json'), JSON.stringify(end, null, 1));
  writeFileSync(resolve(dir, 'view.json'), JSON.stringify(await qa('view'), null, 1));
  console.log(`  ${name}: ${moves} moves, ${fb} fallbacks, turn ${end.turn}, mode ${end.mode}${end.outcome ? ' ' + end.outcome : ''}, events ${JSON.stringify(ev)}, ${log.length} log lines, save ${Object.keys(snap).length} keys${scrolled.size ? ', had to scroll to: ' + [...scrolled].join(' ') : ''}`);
  await browser.close();
}

const only = arg('device', '');
for (const d of Object.keys(DEVICES)) if (!only || only === d) { console.log('device ' + d); await run(d); }
console.log(fails.length ? fails.length + ' FAIL(S)\n' + fails.join('\n') : 'smoke OK');
process.exit(fails.length ? 1 : 0);
