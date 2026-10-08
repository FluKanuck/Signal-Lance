#!/usr/bin/env node
// QA panel: plan a batch's grid (persona × device × length × seed × model) and write qa-runs/<batch>/plan.json.
//   node mods/signal-lance-qa/tool/plan.mjs --batch B --preset core|models [--hands 2] [--random 1]
//   core:   the 6 core personas × 3 devices (even split), half short / half long (relays), fixed seeds + `--random` random
//   models: Haiku vs Sonnet, everything else fixed: 3 personas × 2 short seeds × 2 models on iPhone, + 1 long hand each
// Prints the plan as one line per session. The lead launches them in this order, a few at a time.
import { readFileSync, writeFileSync, mkdirSync, appendFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url)), ROOT = resolve(here, '../../..');
const RUNS = resolve(process.env.SLQA_RUNS || resolve(ROOT, 'qa-runs'));
const a = {}; const av = process.argv.slice(2); for (let i = 0; i < av.length; i += 2) a[av[i].replace(/^--/, '')] = av[i + 1];
if (!a.batch || !a.preset) { console.log('plan needs --batch and --preset core|models'); process.exit(2); }
const SEEDS = JSON.parse(readFileSync(resolve(here, '../seeds.json'), 'utf8'));
const HANDS = Number(a.hands || 2), RANDOM = Number(a.random ?? 2); // one random short + one random long by default
// The core personas: model and knowledge per decision 5 + 8 (blind ~60%, returning ~25%, briefed ~15%; Haiku for the breaker)
export const CORE = [
  { persona: 'fresh-recruit', model: 'sonnet', knowledge: 'blind' },
  { persona: 'thumb-on-the-bus', model: 'sonnet', knowledge: 'blind' },
  { persona: 'breaker', model: 'haiku', knowledge: 'blind' },
  { persona: 'accessibility', model: 'sonnet', knowledge: 'blind' },
  { persona: 'tactics-veteran', model: 'sonnet', knowledge: 'returning' },
  { persona: 'round-designer', model: 'sonnet', knowledge: 'briefed' },
];
const DEV = ['iphone', 'ipad', 'desktop'];
const tag = { iphone: 'ip', ipad: 'pad', desktop: 'dt' };
const rnd = () => 100000 + Math.floor(Math.random() * 900000);

const S = [];
const add = (o) => {
  const id = [o.persona.split('-').map(w => w[0]).join(''), o.model[0], tag[o.device], o.length[0] + o.seed].join('-');
  if (o.length === 'long') for (let h = 1; h <= HANDS; h++) S.push({ ...o, session: id + '-h' + h, hand: h, prev: h > 1 ? id + '-h' + (h - 1) : undefined, chain: id });
  else S.push({ ...o, session: id });
};
if (a.preset === 'core') {
  let r = RANDOM;
  CORE.forEach((p, i) => DEV.forEach((device, d) => {
    const length = (i + d) % 2 ? 'long' : 'short';
    const pool = SEEDS[length]; let seed = pool[i % pool.length]; // by persona: one persona plays one seed on every device (device-only findings stand out)
    if (r > 0 && i === CORE.length - 1 && d >= 1) { seed = rnd(); r--; } // the random ones: the last persona's later rows
    add({ ...p, device, length, seed });
  }));
} else if (a.preset === 'models') {
  for (const persona of ['fresh-recruit', 'breaker', 'tactics-veteran']) for (const seed of SEEDS.short.slice(0, 2)) for (const model of ['haiku', 'sonnet'])
    add({ persona, model, knowledge: persona === 'tactics-veteran' ? 'returning' : 'blind', device: 'iphone', length: 'short', seed, actions: 80, images: 30 }); // the same budget for both models
  for (const model of ['haiku', 'sonnet']) S.push({ persona: 'fresh-recruit', model, knowledge: 'blind', device: 'iphone', length: 'long', seed: SEEDS.long[0], hand: 1, actions: 60, images: 20, session: 'fr-' + model[0] + '-ip-l' + SEEDS.long[0] + '-h1', chain: 'fr-' + model[0] + '-ip-l' + SEEDS.long[0] });
} else { console.log('unknown preset ' + a.preset); process.exit(2); }

mkdirSync(resolve(RUNS, a.batch), { recursive: true });
writeFileSync(resolve(RUNS, a.batch, 'plan.json'), JSON.stringify({ batch: a.batch, preset: a.preset, hands: HANDS, created: new Date().toISOString(), sessions: S }, null, 1));
writeFileSync(resolve(RUNS, 'CURRENT'), a.batch);
appendFileSync(resolve(RUNS, a.batch, 'live.jsonl'), JSON.stringify({ t: new Date().toISOString(), kind: 'plan', sessions: S.length }) + '\n');
for (const s of S) console.log([s.session, s.persona, s.model, s.device, s.length, 'seed ' + s.seed, s.knowledge, s.hand ? 'hand ' + s.hand + (s.prev ? ' after ' + s.prev : '') : '', s.actions ? 'budget ' + s.actions + '/' + s.images : ''].filter(Boolean).join(' · '));
console.log(S.length + ' sessions → ' + resolve(RUNS, a.batch, 'plan.json'));
