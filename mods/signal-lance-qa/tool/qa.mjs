#!/usr/bin/env node
// QA panel playtest tool, the CLI testers call through Bash. Starts the daemon on first use.
//   node qa.mjs <session> look [--image] [--zoom x,y,w,h]   the screen as text (+ a screenshot path to Read)
//   node qa.mjs <session> tap <button id | label | x,y>
//   node qa.mjs <session> hold <button id | label | x,y>         long-press (right-click on desktop): opens the explain card
//   node qa.mjs <session> drag x,y x,y [x,y ...]            draw a path / pan the map
//   node qa.mjs <session> scroll <panel> [dy]               scroll a menu panel (dy px, negative = up)
//   node qa.mjs <session> type <text> [--into id]
//   node qa.mjs <session> key <Key>
//   node qa.mjs <session> wait [seconds]                    until it's your move or the screen changes
//   node qa.mjs <session> fallback target|face|ghost|mortarAt x,y --why "..."   (only after 2 missed map taps)
//   node qa.mjs <session> fallback select <contactId> --why "..." | fallback draw x,y x,y ... --why "..."
//   node qa.mjs <session> note --cat <bug|ux|confusing|missing|visual|balance-feel> --sev <blocker|major|minor|polish>
//                              --title "..." --did "..." --expected "..." --actual "..." [--where "..."]
//   node qa.mjs <session> think "..."                        your running notebook (the watch pane shows it)
//   node qa.mjs <session> status | end "<summary>" [--handoff "..."]
// Harness only:
//   node qa.mjs <session> start --batch B --persona P --model M --device iphone|ipad|desktop --seed N [--length short|long]
//                               [--knowledge blind|returning|briefed] [--hand K] [--load save.json]
//   node qa.mjs <session> checkpoint [k] | oracle            node qa.mjs - progress --batch B | ping | shutdown
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, openSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.SLQA_PORT || 4377);
const RUNS = resolve(process.env.SLQA_RUNS || resolve(here, '../../../qa-runs'));
const [session, cmd, ...rest] = process.argv.slice(2);
if (!session || !cmd) { console.log('usage: node qa.mjs <session> <command> ...  (see the top of this file)'); process.exit(2); }

const flags = {}, pos = [];
for (let i = 0; i < rest.length; i++) { if (rest[i].startsWith('--')) { const k = rest[i].slice(2), v = rest[i + 1]; if (v === undefined || v.startsWith('--')) flags[k] = true; else { flags[k] = v; i++; } } else pos.push(rest[i]); }
const NOTE = { cat: 'category', sev: 'severity', did: 'what_i_did' };
const args = cmd === 'tap' || cmd === 'hold' ? { target: pos.join(' ') } : cmd === 'drag' ? { points: pos } : cmd === 'scroll' ? { panel: pos[0], dy: pos[1] || 300 }
  : cmd === 'type' ? { text: pos.join(' '), into: flags.into || '' } : cmd === 'key' ? { key: pos[0] } : cmd === 'wait' ? { timeout: 1000 * Number(pos[0] || 30) }
  : cmd === 'fallback' ? { action: pos[0], args: pos.slice(1), why: flags.why || '' } : cmd === 'think' ? { text: pos.join(' ') }
  : cmd === 'end' ? { summary: pos.join(' '), handoff: flags.handoff || '' } : cmd === 'checkpoint' ? { k: pos[0] }
  : cmd === 'note' ? Object.fromEntries(Object.entries(flags).map(([k, v]) => [NOTE[k] || k, v]))
  : cmd === 'look' ? { image: !!flags.image, zoom: flags.zoom || '' } : { ...flags };
if (cmd === 'note') {
  const C = ['bug', 'ux', 'confusing', 'missing', 'visual', 'balance-feel'], S = ['blocker', 'major', 'minor', 'polish'];
  if (!C.includes(args.category) || !S.includes(args.severity) || !args.title) { console.log('note needs --cat ' + C.join('|') + ' --sev ' + S.join('|') + ' --title "..." (+ --did --expected --actual)'); process.exit(2); }
}

const post = (body) => fetch('http://127.0.0.1:' + PORT, { method: 'POST', body: JSON.stringify(body) }).then(async r => ({ ok: r.ok, text: await r.text() }));
async function ensure() {
  try { await post({ cmd: 'ping' }); return; } catch (_) {}
  mkdirSync(RUNS, { recursive: true });
  const log = openSync(resolve(RUNS, 'server.log'), 'a');
  spawn(process.execPath, [resolve(here, 'server.mjs')], { detached: true, stdio: ['ignore', log, log], env: { ...process.env, SLQA_RUNS: RUNS } }).unref();
  for (let i = 0; i < 50; i++) { await new Promise(r => setTimeout(r, 200)); try { await post({ cmd: 'ping' }); return; } catch (_) {} }
  throw new Error('the QA server did not start (see ' + resolve(RUNS, 'server.log') + ')');
}
if (cmd === 'start' && !existsSync(resolve(here, '../../../signal-lance/dist-qa/signal-lance.html'))) { console.log('No QA build: cd signal-lance && npm run build:qa'); process.exit(1); }
await ensure();
const r = await post({ cmd, session: session === '-' ? '' : session, args });
console.log(r.text);
process.exit(r.ok ? 0 : 1);
