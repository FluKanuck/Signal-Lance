// Building toy: the hangar page. Tap a hardpoint (or a plate/skin row), pick what fits, watch the bars.
// The build lives in the URL hash (so a build can be sent as a link) and in localStorage.
import { CHASSIS, CHS, FRAMES, ITEMS, LOCS, PLATES, SKINS, byId } from './data.ts';
import type { Ch, HP, Item, Loc, Sig } from './data.ts';
import { emptyBuild, fmt, frameOf, isCont, mount, totals, unmount, whyNot } from './rules.ts';
import { TEMPLATES, buildTemplate } from './templates.ts';
import type { Build } from './rules.ts';

declare const __BUILT__: string;
const KEY = 'sl-build-toy';
const $ = (id: string) => document.getElementById(id)!;
const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

let b: Build = load();
/** What an empty hardpoint says; the item's name replaces it once something is mounted. */
const SLOT_WORD: Record<HP, string> = { S: 'SENSOR', W: 'WEAPON', I: 'INTERNAL', U: 'UTILITY', M: 'MOBILITY', O: 'OPEN' };

/** A build code is the build as base64 JSON: copy it out, paste it back in (also used in the URL hash locally). */
const toCode = (x: Build) => btoa(encodeURIComponent(JSON.stringify(x)));
function fromCode(code: string): Build | null {
  let got: Build;
  try { got = JSON.parse(decodeURIComponent(atob(code.trim()))) as Build; } catch { return null; }
  if (!got || !byId(FRAMES, got.frame)) return null;
  const fresh = emptyBuild(got.frame, got.chassis);
  // Keep only what still matches the frame's hardpoints (rows may have changed since the code was made).
  for (const l of LOCS) {
    if (got.mounts?.[l]?.length === fresh.mounts[l].length) fresh.mounts[l] = got.mounts[l];
    fresh.plate[l] = got.plate?.[l] ?? null; fresh.skin[l] = got.skin?.[l] ?? null;
  }
  return fresh;
}

function load(): Build {
  let saved: string | null = null;
  try { saved = localStorage.getItem(KEY); } catch { /* storage blocked */ }
  return (location.hash.length > 1 && fromCode(location.hash.slice(1))) || (saved && fromCode(saved)) || emptyBuild('warden');
}

function save() {
  const code = toCode(b);
  try { localStorage.setItem(KEY, code); } catch { /* storage blocked */ }
  try { history.replaceState(null, '', '#' + code); } catch { /* sandboxed viewer */ }
}

function set(nb: Build) { b = nb; tip = ''; save(); render(); }

// Picking a role, a frame or "strip suit" throws the current build away, so keep one step of undo.
let undo: Build | null = null;
let tip = '';
const hasStuff = (x: Build) => Object.values(x.mounts).some(r => r.some(Boolean)) ||
  Object.values(x.plate).some(Boolean) || Object.values(x.skin).some(Boolean);
function replace(nb: Build, note = '') { undo = hasStuff(b) ? b : null; set(nb); tip = note; render(); }

// ── Rendering ──────────────────────────────────────────────────────────────────────────────
const sigText = (sig: Sig) => CHS.filter(c => sig[c]?.e || sig[c]?.v)
  .map(c => `${c}${sig[c]!.e ? ' e' + sig[c]!.e : ''}${sig[c]!.v ? ' v' + sig[c]!.v : ''}`).join(', ');

function render() {
  const f = frameOf(b);
  const t = totals(b);

  $('roles').innerHTML = '<span class="dim">start from:</span>' + TEMPLATES.map(t =>
    `<button class="chip" data-tpl="${t.id}">${esc(t.role)}</button>`).join('') +
    (undo ? '<button class="chip" id="undo">undo</button>' : '');
  $('tip').textContent = tip;
  $('frames').innerHTML = FRAMES.map(x =>
    `<button class="chip${x.id === f.id ? ' on' : ''}" data-frame="${x.id}">${x.name}</button>`).join('');
  $('chassis').innerHTML = (['steel', 'alloy', 'composite'] as const).map(c =>
    `<button class="chip${c === b.chassis ? ' on' : ''}" data-chassis="${c}" ${f.chassis.includes(c) ? '' : 'disabled'}>${c}</button>`).join('');
  $('role').textContent = `${f.cls} · rated ${f.rated} / max ${f.max} · ${f.role} · ${b.chassis}: ${CHASSIS[b.chassis].note}`;

  $('suit').innerHTML = LOCS.map(l => {
    const slots = f.slots[l];
    const row = b.mounts[l];
    const hp = slots.length === 0 ? '<span class="dim">no hardpoints</span>' : slots.map((s, i) => {
      const id = row[i];
      if (isCont(id)) return `<button class="slot cont" data-loc="${l}" data-idx="${i}">⤶ ${esc(byId(ITEMS, row[+id.slice(1)])?.name ?? '')}</button>`;
      const it = byId(ITEMS, id);
      return `<button class="slot${it ? ' full' : ''}${it?.mod ? ' mod' : ''}" data-loc="${l}" data-idx="${i}">${it ? esc(it.name) : `<b>${SLOT_WORD[s]}</b>`}</button>`;
    }).join('');
    const plate = byId(PLATES, b.plate[l]), skin = byId(SKINS, b.skin[l]);
    const loud = CHS.filter(c => t.sig[c].loudest === l && t.sig[c].e + t.sig[c].v > 0);
    return `<div class="loc"><div class="lhead">${l}${l === 'BACK' ? ' <span class="dim">(rear arc)</span>' : ''}` +
      `${loud.length ? ` <span class="loud">loudest: ${loud.join(' ')}</span>` : ''}</div>` +
      `<div class="slots">${hp}</div>` +
      `<div class="armour"><button class="slot arm${plate ? ' full' : ''}" data-loc="${l}" data-layer="plate">plate ${plate ? esc(plate.name) + ' +' + plate.hits : '—'}</button>` +
      `<button class="slot arm${skin ? ' full' : ''}" data-loc="${l}" data-layer="skin">skin ${skin ? esc(skin.name) : '—'}</button></div></div>`;
  }).join('');

  // Readouts
  const over = t.load > t.rated;
  const loadPct = (n: number) => Math.min(100, n / t.max * 100);
  const ratedMark = loadPct(t.rated);
  const unset = !t.penalty.moveAP && !t.penalty.servoSnd;
  const pen = !over ? 'within rated load' : unset ? 'overload band: penalty not designed yet'
    : `overload: +${fmt(t.penalty.moveAP)} AP/move, +${fmt(t.penalty.servoSnd)} servo SND`;
  const scale = Math.max(16, ...CHS.map(c => t.sig[c].e + t.sig[c].v));
  $('read').innerHTML =
    `<div class="rrow"><span class="lbl">LOAD</span><div class="bar"><div class="fill${t.load > t.max ? ' bad' : over ? ' warn' : ''}" style="width:${loadPct(t.load)}%"></div>` +
    `<div class="mark" style="left:${ratedMark}%"></div></div><span class="num">${t.load} / ${t.rated} <span class="dim">(max ${t.max})</span></span></div>` +
    `<div class="sub${over ? ' warnt' : ' dim'}">${pen}</div>` +
    `<div class="rrow"><span class="lbl">POWER</span><span class="num wide">out ${t.output} − draw ${fmt(t.draw)} = <b class="${t.net < 0 ? 'badt' : ''}">${t.net >= 0 ? '+' : ''}${fmt(t.net)}</b>/turn · pool ${t.pool}</span></div>` +
    `<div class="sub dim">today: +10/turn from 100</div>` +
    CHS.map(c => {
      const s = t.sig[c];
      return `<div class="rrow"><span class="lbl">${c}</span><div class="bar">` +
        `<div class="fill emit" style="width:${(s.e - s.u) / scale * 100}%"></div><div class="fill use" style="width:${s.u / scale * 100}%"></div>` +
        `<div class="fill vis" style="width:${s.v / scale * 100}%"></div></div>` +
        `<span class="num">on ${fmt(s.e - s.u)} · use ${fmt(s.u)} · v ${fmt(s.v)}</span></div>`;
    }).join('') +
    `<div class="legend"><span class="sw emit"></span>always on <span class="sw use"></span>per use <span class="sw vis"></span>visibility <span class="dim">(per use = one of each shot, pulse, move, summed)</span></div>` +
    t.problems.map(p => `<div class="badt">✕ ${esc(p)}</div>`).join('') +
    t.notes.map(n => `<div class="warnt">· ${esc(n)}</div>`).join('') +
    (t.problems.length ? '' : `<div class="ok">✓ launches</div>`);
}

// ── The picker sheet ───────────────────────────────────────────────────────────────────────
type Pick = { loc: Loc; idx?: number; layer?: 'plate' | 'skin' };
let pick: Pick | null = null;

function delta(nb: Build) {
  const t0 = totals(b), t1 = totals(nb);
  const d = (a: number, z: number) => { const x = Math.round((z - a) * 10) / 10; return x === 0 ? '' : (x > 0 ? '+' : '') + x; };
  const parts = [
    d(t0.load, t1.load) && `load ${d(t0.load, t1.load)}`,
    d(t0.net, t1.net) && `regen ${d(t0.net, t1.net)}`,
    d(t0.pool, t1.pool) && `pool ${d(t0.pool, t1.pool)}`,
    ...CHS.map(c => { const x = d(t0.sig[c].e + t0.sig[c].v, t1.sig[c].e + t1.sig[c].v); return x && `${c} ${x}`; }),
  ].filter(Boolean);
  // Red only for what this choice newly breaks (a suit with no reactor yet shouldn't paint every row red).
  const key = (p: string) => p.replace(/[\d.]+/g, '#');
  const had = new Set(t0.problems.map(key));
  const added = t1.problems.filter(p => !had.has(key(p)));
  return `<span class="dim">${parts.join(' · ') || 'no change'}</span>` +
    (added.length ? `<br><span class="badt">✕ ${esc(added.join('; '))}</span>` : '');
}

function openSheet(p: Pick) {
  pick = p;
  const rows: string[] = [];
  const opt = (key: string, title: string, meta: string, body: string, nb: Build | null, why: string | null) =>
    rows.push(`<button class="opt"${why ? ' disabled' : ''} data-pick="${key}"><div><b>${esc(title)}</b> <span class="dim">${esc(meta)}</span></div>` +
      `<div class="small">${body}</div><div class="small">${why ? `<span class="badt">${esc(why)}</span>` : nb ? delta(nb) : ''}</div></button>`);

  if (p.layer) {
    const cur = b[p.layer][p.loc];
    const list = p.layer === 'plate' ? PLATES : SKINS;
    $('stitle').textContent = `${p.loc} · ${p.layer}`;
    if (cur) opt('', `Remove ${(list as { id: string; name: string }[]).find(r => r.id === cur)!.name}`, '', '', { ...b, [p.layer]: { ...b[p.layer], [p.loc]: null } }, null);
    for (const r of list) {
      const nb = { ...b, [p.layer]: { ...b[p.layer], [p.loc]: r.id } } as Build;
      const meta = 'hits' in r ? `+${r.hits} hits · wt ${r.wt}` : `wt ${r.wt}${r.draw ? ' · draw ' + r.draw : ''}`;
      const abs = 'abs' in r ? CHS.filter(c => r.abs[c]).map(c => `${c} −${Math.round(((r.abs[c]!.e ?? r.abs[c]!.v)!) * 100)}%${r.abs[c]!.e === undefined ? ' (vis)' : ''}`).join(', ') : '';
      opt(r.id, r.name + (r.id === cur ? ' (fitted)' : ''), meta, esc([abs, sigText(r.sig), r.note].filter(Boolean).join(' · ')), nb, null);
    }
  } else {
    const slot = frameOf(b).slots[p.loc][p.idx!];
    const curId = b.mounts[p.loc][p.idx!];
    $('stitle').textContent = `${p.loc} · ${SLOT_WORD[slot].toLowerCase()} hardpoint${slot === 'O' ? ' (takes anything)' : ''}`;
    if (curId) opt('', 'Remove', '', '', unmount(b, p.loc, p.idx!), null);
    const fits = ITEMS.filter(it => slot === 'O' || it.hp.includes(slot));
    for (const it of fits) {
      const why = whyNot(b, p.loc, p.idx!, it);
      const meta = [`wt ${it.wt}`, it.out ? `out ${it.out}` : '', it.draw ? `draw ${it.draw}` : '', it.pool ? `pool +${it.pool}` : '',
        it.size === 2 ? '2 hardpoints' : '', it.use ?? ''].filter(Boolean).join(' · ');
      const body = esc([it.family, it.effect, it.trade !== '—' ? 'trade: ' + it.trade : '', sigText(it.sig)].filter(Boolean).join(' · '));
      opt(it.id, it.name + (it.id === curId ? ' (fitted)' : ''), meta, body, why ? null : mount(b, p.loc, p.idx!, it), why);
    }
  }
  $('opts').innerHTML = rows.join('');
  $('sheet').classList.add('show');
  $('opts').scrollTop = 0;
}

function choose(key: string) {
  const p = pick!;
  if (p.layer) set({ ...b, [p.layer]: { ...b[p.layer], [p.loc]: key || null } } as Build);
  else if (!key) set(unmount(b, p.loc, p.idx!));
  else set(mount(b, p.loc, p.idx!, byId(ITEMS, key) as Item));
  closeSheet();
}

function closeSheet() { pick = null; $('sheet').classList.remove('show'); }

// ── Wiring ─────────────────────────────────────────────────────────────────────────────────
document.addEventListener('click', e => {
  const el = (e.target as HTMLElement).closest('button') as HTMLButtonElement | null;
  if (!el || el.disabled) return;
  const d = el.dataset;
  if (d.tpl) { const t = TEMPLATES.find(x => x.id === d.tpl)!; replace(buildTemplate(t), `${t.role}: ${t.blurb}`); }
  else if (el.id === 'undo') { const u = undo!; undo = null; set(u); }
  else if (d.frame) replace(emptyBuild(d.frame, b.chassis));
  else if (d.chassis) set({ ...b, chassis: d.chassis as Build['chassis'] });
  else if (d.layer) openSheet({ loc: d.loc as Loc, layer: d.layer as 'plate' | 'skin' });
  else if (d.idx !== undefined) {
    const loc = d.loc as Loc, raw = b.mounts[loc][+d.idx];
    openSheet({ loc, idx: isCont(raw) ? +raw.slice(1) : +d.idx });
  }
  else if (d.pick !== undefined) choose(d.pick);
  else if (el.id === 'sclose') closeSheet();
  else if (el.id === 'reset') replace(emptyBuild(b.frame, b.chassis));
  else if (el.id === 'share') {
    const done = (t: string) => { el.textContent = t; setTimeout(() => el.textContent = 'copy code', 1200); };
    const box = $('code') as HTMLInputElement;
    box.value = toCode(b);
    navigator.clipboard?.writeText(box.value).then(() => done('copied'), () => { box.select(); done('select + copy'); })
      ?? (box.select(), done('select + copy'));
  }
});
$('code').addEventListener('input', e => {
  const box = e.target as HTMLInputElement;
  const got = fromCode(box.value);
  if (got) { set(got); box.value = ''; box.placeholder = 'loaded'; }
  else if (box.value) box.placeholder = 'not a build code';
});
$('sheet').addEventListener('click', e => { if (e.target === $('sheet')) closeSheet(); });
$('stamp').textContent = __BUILT__;
// Sanity: every channel key in the data is a known channel (cheap guard while rows are hand-typed).
void (CHS satisfies Ch[]);
render();
save();
