#!/usr/bin/env node
// QA panel analysis, step A: gather a batch into compact files for the judge (an Opus agent) and the report.
//   node mods/signal-lance-qa/tool/collect.mjs --batch B
// Writes qa-runs/B/analysis/:
//   findings.jsonl  one compact finding per line (id F001…), with the oracle's state for bug claims
//   groups.json     a cheap shortlist: findings that probably share a root cause (same screen + similar words)
//   oracle.json     every distinct invariant violation: how many sessions hit it, whether any tester noticed
//   sessions.json   per session: model, persona, device, actions, images, notes, fallbacks, screens reached, page errors
import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url)), ROOT = resolve(here, '../../..');
const RUNS = resolve(process.env.SLQA_RUNS || resolve(ROOT, 'qa-runs'));
const a = {}; const av = process.argv.slice(2); for (let i = 0; i < av.length; i += 2) a[av[i].replace(/^--/, '')] = av[i + 1];
if (!a.batch) { console.log('collect needs --batch'); process.exit(2); }
const B = resolve(RUNS, a.batch), OUT = resolve(B, 'analysis'); mkdirSync(OUT, { recursive: true });
const lines = (f) => existsSync(f) ? readFileSync(f, 'utf8').split('\n').filter(Boolean).map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean) : [];
const json = (f, d = null) => existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : d;

const live = lines(resolve(B, 'live.jsonl'));
const F = [], sessions = [], oracle = new Map();
let n = 0;
for (const id of readdirSync(B, { withFileTypes: true }).filter(d => d.isDirectory() && d.name !== 'analysis').map(d => d.name).sort()) {
  const sd = resolve(B, id), meta = json(resolve(sd, 'meta.json'), {}), res = json(resolve(sd, 'result.json'));
  const ev = live.filter(e => e.session === id);
  const screens = new Set(); for (const e of ev) { for (const s of e.screens || []) screens.add(s); const m = /screen \S+ → (\S+)/.exec(e.result || ''); if (m) for (const s of m[1].split('+')) screens.add(s); }
  const mine = lines(resolve(sd, 'findings.jsonl'));
  for (const f of mine) {
    const o = f.oracle || {};
    const state = f.category === 'bug' ? { mode: o.mode, turn: o.turn, phase: o.phase, outcome: o.outcome, lance: o.lance?.map(m => ({ id: m.id, ap: m.ap, en: Math.round(m.en ?? 0), hits: m.hits, dead: m.dead, x: m.x, y: m.y })), contacts: o.contacts, company: o.company } : undefined;
    F.push({ id: 'F' + String(++n).padStart(3, '0'), session: id, persona: meta.persona, model: meta.model, device: meta.device, length: meta.length, hand: meta.hand,
      source: f.source, category: f.category, severity: f.severity, title: f.title, did: f.what_i_did, expected: f.expected, actual: f.actual, where: f.where,
      screens: f.screens, step: f.step, seed: f.seed, shot: f.shot, violations: f.violations?.length ? f.violations : undefined, state });
  }
  for (const o of lines(resolve(sd, 'oracle.jsonl'))) for (const v of o.violations) {
    const k = v.replace(/-?\d+(\.\d+)?/g, '#'); // same rule broken with other numbers = one kind
    const r = oracle.get(k) || { kind: k, example: v, sessions: new Set(), noticed: false }; r.sessions.add(id); oracle.set(k, r);
  }
  sessions.push({ id, persona: meta.persona, model: meta.model, device: meta.device, length: meta.length, hand: meta.hand, knowledge: meta.knowledge, seed: meta.seed,
    done: !!res, actions: res?.actions ?? ev.filter(e => e.kind === 'action').length, images: res?.images ?? ev.filter(e => e.kind === 'look' && e.shot).length,
    notes: mine.filter(f => f.source === 'tester').length, fallbacks: ev.filter(e => e.kind === 'fallback').length, thinks: ev.filter(e => e.kind === 'think').length,
    screens: [...screens].sort(), hunts: ev.filter(e => /screen hunt → res|→ res/.test(e.result || '')).length, pageErrors: res?.pageErrors ?? 0, summary: res?.summary || '' });
}
// a tester "noticed" a violation if one of their bug notes was stamped while it was showing
for (const f of F) if (f.source === 'tester' && f.category === 'bug') for (const v of f.violations || []) { const r = oracle.get(v.replace(/-?\d+(\.\d+)?/g, '#')); if (r) r.noticed = true; }

// the shortlist: same first screen and enough shared words, joined (union-find)
const STOP = new Set('the a an of to in on is it and or but i my me for with at when what not no be was are this that from by as can after before into have has had any you your than then there'.split(' '));
const words = (f) => new Set((f.title + ' ' + (f.where || '') + ' ' + (f.actual || '')).toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(w => w.length > 2 && !STOP.has(w)));
const W = F.map(words), par = F.map((_, i) => i), find = (i) => (par[i] === i ? i : (par[i] = find(par[i])));
for (let i = 0; i < F.length; i++) for (let j = i + 1; j < F.length; j++) {
  const A = W[i], C = W[j]; let inter = 0; for (const w of A) if (C.has(w)) inter++;
  const jac = inter / Math.max(1, A.size + C.size - inter), same = (F[i].screens?.[0] || '') === (F[j].screens?.[0] || '');
  if (jac >= 0.34 || (same && jac >= 0.2)) par[find(i)] = find(j);
}
const groups = {}; F.forEach((f, i) => (groups[find(i)] ||= []).push(f.id));
const G = Object.values(groups).sort((x, y) => y.length - x.length);

writeFileSync(resolve(OUT, 'findings.jsonl'), F.map(f => JSON.stringify(f)).join('\n') + '\n');
writeFileSync(resolve(OUT, 'groups.json'), JSON.stringify(G));
writeFileSync(resolve(OUT, 'oracle.json'), JSON.stringify([...oracle.values()].map(r => ({ ...r, sessions: [...r.sessions] })), null, 1));
writeFileSync(resolve(OUT, 'sessions.json'), JSON.stringify(sessions, null, 1));
console.log(`${a.batch}: ${sessions.length} sessions, ${F.length} findings (${F.filter(f => f.source === 'tester').length} tester, ${F.filter(f => f.source === 'fallback').length} fallback), ${G.length} groups (${G.filter(g => g.length > 1).length} with 2+), ${oracle.size} oracle kinds → ${OUT}`);
