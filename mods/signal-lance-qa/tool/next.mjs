#!/usr/bin/env node
// QA panel: what the lead can launch next. Planned sessions not started yet whose previous hand (if any) has ended.
//   node mods/signal-lance-qa/tool/next.mjs --batch B      → one id per line, then a count line
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const here = dirname(fileURLToPath(import.meta.url)), RUNS = resolve(process.env.SLQA_RUNS || resolve(here, '../../../qa-runs'));
const i = process.argv.indexOf('--batch'), B = process.argv[i + 1];
const plan = JSON.parse(readFileSync(resolve(RUNS, B, 'plan.json'), 'utf8')).sessions;
const started = (id) => existsSync(resolve(RUNS, B, id, 'meta.json')), ended = (id) => existsSync(resolve(RUNS, B, id, 'result.json'));
const ready = plan.filter(s => !started(s.session) && (!s.prev || ended(s.prev)));
const running = plan.filter(s => started(s.session) && !ended(s.session)).map(s => s.session);
for (const s of ready) console.log(s.session + ' · ' + s.model);
console.log(`${ready.length} ready · ${running.length} running · ${plan.filter(s => ended(s.session)).length}/${plan.length} done · waiting on a hand: ${plan.filter(s => !started(s.session) && s.prev && !ended(s.prev)).length}`);
