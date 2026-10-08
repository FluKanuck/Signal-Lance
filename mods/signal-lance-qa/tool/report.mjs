#!/usr/bin/env node
// QA panel analysis, step C: clusters.json (from the judge) + the collected files → the report and the triage page.
//   node mods/signal-lance-qa/tool/report.mjs --batch B [--title "R23 core batch"]
// Writes claude/signal-lance-qa-<B>.md and qa-runs/<B>/analysis/page.html (self-contained; publish it as an artifact:
// it declares the db capability for triage state, one doc per cluster in the "triage" collection).
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const here = dirname(fileURLToPath(import.meta.url)), ROOT = resolve(here, '../../..');
const RUNS = resolve(process.env.SLQA_RUNS || resolve(ROOT, 'qa-runs'));
const a = {}; const av = process.argv.slice(2); for (let i = 0; i < av.length; i += 2) a[av[i].replace(/^--/, '')] = av[i + 1];
if (!a.batch) { console.log('report needs --batch'); process.exit(2); }
const A = resolve(RUNS, a.batch, 'analysis');
const json = (f, d) => existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : d;
const F = readFileSync(resolve(A, 'findings.jsonl'), 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));
const C = json(resolve(A, 'clusters.json'), null); if (!C) { console.log('no clusters.json yet: run the judge first'); process.exit(1); }
const S = json(resolve(A, 'sessions.json'), []), O = json(resolve(A, 'oracle.json'), []), SC = json(resolve(A, 'scores.json'), null); // scores: the blind quality pass (model comparison)
const byId = Object.fromEntries(F.map(f => [f.id, f]));
const W = { blocker: 8, major: 4, minor: 2, polish: 1 }, SEV = ['blocker', 'major', 'minor', 'polish'];
const DEVN = { iphone: 'iPhone', ipad: 'iPad', desktop: 'desktop' };
const uniq = (x) => [...new Set(x.filter(Boolean))];

// reach: distinct sessions (a long run's hands count once, by chain), personas, devices, models
const chainOf = (sid) => sid.replace(/-h\d+$/, '');
const multiDev = uniq(S.map(s => s.device)).length > 1; // device-only means something only when the batch covered more than one device
for (const c of C) {
  const fs = (c.findings || []).map(id => byId[id]).filter(Boolean);
  c.sessions = uniq(fs.map(f => chainOf(f.session))); c.personas = uniq(fs.map(f => f.persona)); c.devices = uniq(fs.map(f => f.device)); c.models = uniq(fs.map(f => f.model));
  if (c.oracle_only) { const o = O.find(o => o.example && (c.title.includes(o.example) || (c.summary || '').includes(o.example))); if (o) { c.sessions = uniq(o.sessions.map(chainOf)); c.oracle = o; } }
  c.reach = Math.max(1, c.sessions.length); c.score = (W[c.severity] || 1) * c.reach * (c.noise ? 0.1 : 1);
  c.deviceOnly = multiDev && !c.noise && c.sessions.length >= 2 && c.devices.length === 1 ? c.devices[0] : '';
  c.quotes = fs.slice(0, 6).map(f => ({ id: f.id, who: f.persona + ' · ' + f.model + ' · ' + DEVN[f.device], title: f.title, actual: f.actual, sev: f.severity, shot: f.shot }));
}
C.sort((x, y) => y.score - x.score || SEV.indexOf(x.severity) - SEV.indexOf(y.severity));
const real = C.filter(c => !c.noise);
const nTester = F.filter(f => f.source === 'tester').length;
const build = F.find(f => f.state)?.build || F[0]?.seed && '' || '';
const title = a.title || ('QA batch ' + a.batch);
const date = new Date().toISOString().slice(0, 10);
const models = uniq(S.map(s => s.model));

// ---------- model stats (for the Haiku vs Sonnet comparison; the judge's verdicts count a finding as valid unless noise) ----------
const noiseIds = new Set(C.filter(c => c.noise).flatMap(c => c.findings || []));
const disagree = new Set(C.filter(c => c.evidence === 'oracle-disagrees').flatMap(c => c.findings || []));
const mstat = models.map(m => {
  const ss = S.filter(s => s.model === m), fs = F.filter(f => f.model === m && f.source === 'tester');
  const valid = fs.filter(f => !noiseIds.has(f.id) && !disagree.has(f.id));
  const clusters = real.filter(c => (c.findings || []).some(id => byId[id]?.model === m));
  const only = clusters.filter(c => (c.findings || []).every(id => byId[id]?.model === m));
  const sc = SC ? fs.map(f => SC[f.id]).filter(Boolean) : [], avg = (k) => sc.length ? (sc.reduce((x, y) => x + y[k], 0) / sc.length).toFixed(2) : '–';
  const blind = SC ? { real2: sc.filter(x => x.real === 2).length, wrong: sc.filter(x => x.real === 0).length, avgReal: avg('real'), avgAct: avg('actionable'), avgInsight: avg('insight'), insight2: sc.filter(x => x.insight === 2).length } : null;
  return { model: m, sessions: ss.length, ...(blind ? { blind } : {}), notes: fs.length, valid: valid.length, noise: fs.filter(f => noiseIds.has(f.id)).length, disagree: fs.filter(f => disagree.has(f.id)).length,
    clusters: clusters.length, unique: only.length, uniqueMajor: only.filter(c => c.severity === 'blocker' || c.severity === 'major').length,
    perSession: ss.length ? (fs.length / ss.length).toFixed(1) : '0', actions: ss.length ? Math.round(ss.reduce((x, s) => x + (s.actions || 0), 0) / ss.length) : 0,
    images: ss.length ? Math.round(ss.reduce((x, s) => x + (s.images || 0), 0) / ss.length) : 0, fallbacks: ss.reduce((x, s) => x + (s.fallbacks || 0), 0),
    screens: ss.length ? (ss.reduce((x, s) => x + s.screens.length, 0) / ss.length).toFixed(1) : '0', hunts: ss.reduce((x, s) => x + (s.hunts || 0), 0), done: ss.filter(s => s.done).length };
});

// ---------- markdown ----------
const md = [];
const reachTxt = (c) => c.reach + ' session' + (c.reach > 1 ? 's' : '') + (c.personas.length ? ' · ' + c.personas.length + ' persona' + (c.personas.length > 1 ? 's' : '') : '') + (c.devices.length ? ' · ' + c.devices.map(d => DEVN[d]).join('/') : '');
md.push('# ' + title, '', `**Date:** ${date} · **Batch:** \`${a.batch}\` · **Sessions:** ${S.length} (${uniq(S.map(s => chainOf(s.id))).length} runs) · **Findings:** ${nTester} from testers, ${F.length - nTester} input fallbacks · **Clusters:** ${real.length}, plus noise · **Oracle violations:** ${O.length} kinds`, '');
md.push('The QA panel ran agent testers in personas on the real build (`npm run build:qa`), on ' + uniq(S.map(s => DEVN[s.device])).join(', ') + '. The judge merged findings by root cause. Each cluster below counts the distinct runs that reported it. The **page** has filters, tester quotes, screenshots and triage. Plan: `claude/signal-lance-qa-harness.md`.', '');
md.push('## Top 10 (severity × reach)', '', '| # | Cluster | Cat | Sev | Reach | Evidence |', '|---|---|---|---|---|---|');
real.slice(0, 10).forEach((c, i) => md.push(`| ${i + 1} | **${c.title}** | ${c.category} | ${c.severity} | ${reachTxt(c)} | ${c.evidence || ''} |`));
md.push('');
for (const cat of ['bug', 'missing', 'confusing', 'ux', 'visual', 'balance-feel']) {
  const cs = real.filter(c => c.category === cat); if (!cs.length) continue;
  md.push('## ' + { bug: 'Bugs', missing: 'Missing', confusing: 'Confusing', ux: 'UI / UX', visual: 'Visual', 'balance-feel': 'How it felt' }[cat] + ' (' + cs.length + ')', '');
  for (const c of cs) {
    md.push(`### ${c.id} · ${c.title} — ${c.severity}`, '', `${c.summary || ''}`, '', `*Reach:* ${reachTxt(c)}${c.deviceOnly ? ' · **only on ' + DEVN[c.deviceOnly] + '**' : ''}${c.evidence && c.evidence !== 'n/a' ? ' · *evidence:* ' + c.evidence + (c.evidence_note ? ' (' + c.evidence_note + ')' : '') : ''}`);
    if (c.repro) md.push('', '*Repro:* ' + c.repro);
    if (c.suggestion) md.push('', '*Suggestion:* ' + c.suggestion);
    md.push('', '*Findings:* ' + ((c.findings || []).join(', ') || '(oracle only)'), '');
  }
}
const devOnly = real.filter(c => c.deviceOnly);
md.push('## Device-only issues', '', devOnly.length ? devOnly.map(c => `- **${DEVN[c.deviceOnly]}:** ${c.title} (${c.id}, ${c.reach} runs)`).join('\n') : 'None reported by two or more runs on one device only.', '');
const oo = real.filter(c => c.oracle_only);
md.push('## Oracle-only bugs (no tester noticed)', '', oo.length ? oo.map(c => `- ${c.title} (${c.id})`).join('\n') : 'None.', '');
if (models.length > 1) {
  md.push('## Models', '', '| Model | Sessions | Notes / session | Valid | Noise | Oracle disagrees | Clusters hit | Only this model (major+) | Avg actions | Avg images | Fallbacks | Screens / session | Hunts finished |', '|---|---|---|---|---|---|---|---|---|---|---|---|---|');
  for (const m of mstat) md.push(`| ${m.model} | ${m.sessions} | ${m.perSession} | ${m.valid} | ${m.noise} | ${m.disagree} | ${m.clusters} | ${m.unique} (${m.uniqueMajor}) | ${m.actions} | ${m.images} | ${m.fallbacks} | ${m.screens} | ${m.hunts} |`);
  md.push('');
  if (SC) {
    md.push('Blind quality pass (an Opus judge scored every finding without knowing the model; 0–2 each):', '', '| Model | Real & correct (2) | Wrong / artifact (0) | Avg real | Avg actionable | Avg insight | High-insight (2) |', '|---|---|---|---|---|---|---|');
    for (const m of mstat) if (m.blind) md.push(`| ${m.model} | ${m.blind.real2} | ${m.blind.wrong} | ${m.blind.avgReal} | ${m.blind.avgAct} | ${m.blind.avgInsight} | ${m.blind.insight2} |`);
    md.push('');
  }
}
const noise = C.filter(c => c.noise);
if (noise.length) md.push('## Noise / tool limits', '', noise.map(c => `- ${c.title}: ${(c.findings || []).length} findings`).join('\n'), '');
md.push('## Sessions', '', '| Session | Persona | Model | Device | Length | Seed | Actions | Notes | Screens | Summary |', '|---|---|---|---|---|---|---|---|---|---|');
for (const s of S) md.push(`| ${s.id} | ${s.persona} | ${s.model} | ${DEVN[s.device] || s.device} | ${s.length}${s.hand ? ' h' + s.hand : ''} | ${s.seed} | ${s.actions} | ${s.notes} | ${s.screens.length} | ${(s.summary || '').replace(/\|/g, '/').replace(/\n/g, ' ').slice(0, 220)} |`);
md.push('', '*Repro:* every finding stamps the session seed (the tool seeds the company and offers with it) and the hunt seed. Paste `seed N <MISSION>` into PLAY SEED to replay a hunt.', '');
const mdPath = resolve(ROOT, 'claude', 'signal-lance-qa-' + a.batch + '.md');
writeFileSync(mdPath, md.join('\n'));

// ---------- screenshots → small JPEG data URIs (one per cluster, plus quotes'), via Chromium ----------
const shotList = uniq(real.flatMap(c => c.quotes.map(q => q.shot)).filter(s => s && existsSync(resolve(RUNS, s)))).slice(0, 120);
const shots = {};
if (shotList.length) {
  const b = await chromium.launch(), p = await b.newPage();
  for (const s of shotList) {
    const png = readFileSync(resolve(RUNS, s)).toString('base64');
    shots[s] = await p.evaluate(async (src) => { const img = new Image(); img.src = src; await img.decode(); const w = Math.min(720, img.width), h = Math.round(img.height * w / img.width); const c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d').drawImage(img, 0, 0, w, h); return c.toDataURL('image/jpeg', 0.72); }, 'data:image/png;base64,' + png);
  }
  await b.close();
}
for (const c of real) for (const q of c.quotes) q.img = q.shot && shots[q.shot] ? q.shot : '';

// ---------- the page ----------
for (const m of mstat) if (m.blind) Object.assign(m, { blindReal2: m.blind.real2, blindWrong: m.blind.wrong, avgInsight: m.blind.avgInsight });
const data = { title, batch: a.batch, date, sessions: S.map(s => ({ id: s.id, persona: s.persona, model: s.model, device: s.device, length: s.length, hand: s.hand, seed: s.seed, actions: s.actions, notes: s.notes, screens: s.screens.length, summary: s.summary })),
  clusters: real.map(c => ({ id: c.id, title: c.title, category: c.category, severity: c.severity, summary: c.summary, repro: c.repro, evidence: c.evidence, evidence_note: c.evidence_note, suggestion: c.suggestion, reach: c.reach, personas: c.personas, devices: c.devices, models: c.models, deviceOnly: c.deviceOnly, oracleOnly: !!c.oracle_only, quotes: c.quotes, n: (c.findings || []).length })),
  noise: noise.map(c => ({ title: c.title, n: (c.findings || []).length })), devices: uniq(S.map(s => DEVN[s.device])), models: models.length > 1 ? mstat : [], counts: { findings: nTester, fallbacks: F.length - nTester, oracle: O.length } };
const tpl = readFileSync(resolve(here, 'page.html'), 'utf8');
const html = tpl.replace('/*__DATA__*/null', JSON.stringify(data).replace(/</g, '\\u003c')).replace('/*__SHOTS__*/null', JSON.stringify(shots)).replace(/__TITLE__/g, title.replace(/[<&]/g, ''));
writeFileSync(resolve(A, 'page.html'), html);
console.log(`report: ${mdPath}\npage: ${resolve(A, 'page.html')} (${Math.round(html.length / 1024)} KB, ${Object.keys(shots).length} screenshots)\n${real.length} clusters · top: ${real.slice(0, 3).map(c => c.title).join(' | ')}`);
