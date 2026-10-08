#!/usr/bin/env node
// QA panel: start one tester session and print the brief to hand the tester agent (the lead's one call per tester).
//   node mods/signal-lance-qa/tool/launch.mjs --batch B --session S --persona fresh-recruit --model sonnet
//        --device iphone|ipad|desktop --seed N [--length short|long] [--knowledge blind|returning|briefed]
//        [--hand K --prev <previous hand's session id>]   or: --batch B --plan <session id> [--quiet 1] (the rest from plan.json) [--actions N --images N  (fixed budget; default by model / length)]
// Prints the brief on stdout. Exit 1 (and a reason) if the batch is STOPped or PAUSEd, or the start failed.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url)), ROOT = resolve(here, '../../..');
const RUNS = resolve(process.env.SLQA_RUNS || resolve(ROOT, 'qa-runs'));
const a = {}; const av = process.argv.slice(2); for (let i = 0; i < av.length; i += 2) a[av[i].replace(/^--/, '')] = av[i + 1];
if (a.plan) { // --batch B --plan <session id>: everything else from qa-runs/B/plan.json
  const P = JSON.parse(readFileSync(resolve(RUNS, a.batch, 'plan.json'), 'utf8')).sessions.find(s => s.session === a.plan);
  if (!P) { console.log('no session ' + a.plan + ' in the plan'); process.exit(2); }
  for (const [k, v] of Object.entries(P)) if (v !== undefined && k !== 'chain') a[k] ??= String(v);
}
a.length ||= 'short'; a.knowledge ||= 'blind';
for (const k of ['batch', 'session', 'persona', 'model', 'device', 'seed']) if (!a[k]) { console.log('launch needs --' + k); process.exit(2); }
const flag = (n) => { const f = resolve(RUNS, a.batch, n); return existsSync(f) && readFileSync(f, 'utf8').trim() !== ''; };
if (flag('STOP')) { console.log('STOPPED: the batch was stopped from the watch pane. Start no more testers.'); process.exit(1); }
if (flag('PAUSE')) { console.log('PAUSED: the batch is paused from the watch pane. Wait, then try again.'); process.exit(1); }
const persona = resolve(here, '../personas', a.persona + '.md');
if (!existsSync(persona)) { console.log('no persona card ' + persona); process.exit(2); }
mkdirSync(resolve(RUNS, a.batch), { recursive: true }); writeFileSync(resolve(RUNS, 'CURRENT'), a.batch);

// a later hand of a long run starts from the previous hand's end save
const prevDir = a.prev ? resolve(RUNS, a.batch, a.prev) : '';
const load = prevDir ? resolve(prevDir, 'save-end.json') : '';
if (a.prev && !existsSync(load)) { console.log('previous hand ' + a.prev + ' has no save-end.json'); process.exit(1); }
const qa = resolve(here, 'qa.mjs'), rel = (p) => relative(ROOT, p);
const args = [qa, a.session, 'start', '--batch', a.batch, '--persona', a.persona, '--model', a.model, '--device', a.device, '--seed', String(a.seed), '--length', a.length, '--knowledge', a.knowledge, ...(a.hand ? ['--hand', a.hand] : []), ...(a.actions ? ['--actions', a.actions, '--images', a.images || '30'] : []), ...(load ? ['--load', load] : [])];
let started;
try { started = execFileSync(process.execPath, args, { encoding: 'utf8', cwd: ROOT }); } catch (e) { console.log('start failed: ' + (e.stdout || e.message)); process.exit(1); }

const briefs = readdirSync(resolve(ROOT, 'claude')).map(f => /^signal-lance-round(\d+)-brief\.md$/.exec(f)).filter(Boolean).map(m => +m[1]);
const latest = briefs.length ? 'claude/signal-lance-round' + Math.max(...briefs) + '-brief.md' : '';
const primer = existsSync(resolve(RUNS, 'primer.md')) ? rel(resolve(RUNS, 'primer.md')) : '';
const know = {
  blind: 'You have never played Signal Lance. Learn it only from what the game shows you.',
  returning: 'You have played Signal Lance before. Before playing, open GAMEPLAY BASICS (a button on the start splash) and read it' + (primer ? ', and read ' + primer + ' (what earlier testers found confusing, with answers)' : '') + '. Don\'t report first-timer confusion unless it\'s severe; look deeper.',
  briefed: 'You are briefed: read ' + (latest || 'the latest round brief in claude/') + ' first (the round this build is for), and the tester splash\'s TEST page in the game.',
}[a.knowledge];
const play = a.length === 'short'
  ? 'A SHORT session: from the start screen, get into one hunt (take a contract from the company screen, as a player would), play it to the end (win, bail or lose), read the result and after-action screens, then `end`. If the hunt is going nowhere after ~15 turns, bail or quit and say so. Look at the screens around it on the way.'
  : 'A LONG session, hand ' + (a.hand || 1) + ': play the company campaign (contracts, suits, crew, the market, the city map, hunts). ' +
    (a.prev ? 'You continue a campaign another tester with your persona started: first read their notebook at ' + rel(resolve(prevDir, 'notebook.md')) + ' (especially HAND-OFF), then carry on from where the game is now. Watch what changes over time. ' : '') +
    'Stop at a checkpoint: when a contract ends (complete or failed), or when your budget has 10 actions left. Then `end` with your summary AND `--handoff "..."`: where you are, what you were trying, money/fuel/crew state, open questions, what has bugged you so far (one short paragraph).';
const brief = [
  `You are a QA playtester. Session id: ${a.session}. Device: ${a.device} (${a.device === 'desktop' ? 'mouse' : 'touch'}).`,
  `Read these two files first, then play: ${rel(resolve(here, '../prompts/tester.md'))} (how to play and report) and ${rel(persona)} (who you are).`,
  know,
  play,
  'Your session is already started; the game is open on its start screen. Begin with: node mods/signal-lance-qa/tool/qa.mjs ' + a.session + ' look --image',
  'Work from the repo root (/home/user/Signal-Lance or wherever this repo is). Your final message: your ≤150-word summary only.',
].join('\n\n');
writeFileSync(resolve(RUNS, a.batch, a.session, 'brief.md'), brief + '\n');
console.log(a.quiet ? 'brief: ' + rel(resolve(RUNS, a.batch, a.session, 'brief.md')) + ' · model ' + a.model : brief);
console.error(started.split('\n')[0]);
