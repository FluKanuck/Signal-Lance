// R18 (A10): the hangar is the loadout screen. Two suits (A, B), each a fit from the cheap-test set (TUNE.HANGAR_*).
// Tap a location on the ExoS (Jamie's wireframe) to see its hardpoints, tap a hardpoint to pick what goes there.
// Raw numbers only: the hunt teaches, the debrief explains. Fits are saved per suit as build codes (view-side storage).
import { TUNE } from '../tune.ts';
import { FRAMES, ITEMS, LOCS, PLATES, byId } from '../sim/items.ts';
import type { HP, Item, Loc } from '../sim/items.ts';
import { emptyBuild, frameOf, isCont, itemsIn, mount, unmount, whyNot, toCode, fromCode } from '../sim/fit.ts';
import { HANGAR_TEMPLATES, DEFAULT_FIT, fitStats, fitHits, fitRounds, launchBlock, hangarWhy, place, LOC_PART } from '../sim/kit.ts';
import type { Fit } from '../sim/kit.ts';
import { splitHits, PART_ABBR } from '../sim/combat.ts';
import { EXOS_VIEWBOX, EXOS_LINES, EXOS_PANELS } from './exos.ts';
import { $ } from './hud.ts';

const KEYS = ['signalLance.fitA', 'signalLance.fitB'];
const SLOT_WORD: Record<HP, string> = { S: 'SENSOR', W: 'WEAPON', I: 'INTERNAL', U: 'UTILITY', M: 'MOBILITY', O: 'OPEN' };
const LOC_NAME: Record<Loc, string> = { MAST: 'MAST', ARMS: 'ARMS', CORE: 'CORE', BACK: 'BACK', LEGS: 'LEGS' };
const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const offer = () => TUNE.HANGAR_ITEMS.filter(id => id !== 'thermal' || TUNE.THERMAL_ENABLED); // R18 cp3: thermal optics only with THERMAL on
const okItem = (id: string | null) => !id || isCont(id) || offer().includes(id);

// Only cheap-set rows survive a saved code (rows may have changed, or a code may come from the toy's full catalogue)
function cheap(f: Fit | null): Fit | null {
  if (!f || !TUNE.HANGAR_FRAMES.includes(f.frame)) return null;
  for (const l of LOCS) { f.mounts[l] = f.mounts[l].map(id => okItem(id) ? id : null); f.plate[l] = TUNE.HANGAR_PLATES.includes(f.plate[l]) ? f.plate[l] : null; f.skin[l] = null; }
  for (const l of LOCS) f.mounts[l] = f.mounts[l].map((id, j, row) => isCont(id) && !row[+id.slice(1)] ? null : id);
  return f;
}
function read(i: number): Fit { try { const c = localStorage.getItem(KEYS[i]); const f = c ? cheap(fromCode(c)) : null; if (f) return f; } catch (_) {} return structuredClone(DEFAULT_FIT); }
function save() { try { localStorage.setItem(KEYS[cur], toCode(fits[cur])); } catch (_) {} }

const fits: Fit[] = [read(0), read(1)];
let cur = 0, sel: Loc = 'MAST', tip = '';
export function currentFits(): Fit[] { return fits.map(f => structuredClone(f)); }
// '' = both suits can launch, else the first reason ("A: no reactor in CORE")
export function hangarBlock() { for (let i = 0; i < 2; i++) { const w = launchBlock(fits[i]); if (w) return 'AB'[i] + ': ' + w; } return ''; }
function set(f: Fit) { fits[cur] = f; tip = ''; save(); render(); }

// ---- the suit picture ----
// BACK sits behind the right shoulder (it can't be seen from the front)
const BACK_SHAPE = '<rect x="566" y="150" width="58" height="58" rx="8" class="hback"/><text x="595" y="140" class="hbtxt">BACK</text>';
const HIT: Record<Loc, string> = { // tap areas in the drawing's coordinates
  MAST: '<rect x="392" y="92" width="58" height="140"/>',
  ARMS: '<rect x="245" y="222" width="152" height="345"/><rect x="630" y="222" width="150" height="345"/>',
  LEGS: '<rect x="355" y="472" width="130" height="470"/><rect x="540" y="472" width="130" height="470"/>',
  CORE: '<rect x="395" y="205" width="238" height="250"/><rect x="450" y="452" width="125" height="90"/>',
  BACK: '<rect x="556" y="125" width="80" height="90"/>',
};
function suitSvg() {
  const f = fits[cur], filled = (l: Loc) => itemsIn(f, l).length > 0 || !!f.plate[l];
  const cls = (l: Loc) => 'hp' + (l === sel ? ' sel' : filled(l) ? ' fit' : '');
  return '<svg viewBox="' + EXOS_VIEWBOX + '" id="hsvg" role="img" aria-label="ExoS: tap a location">' +
    '<g class="hline">' + EXOS_LINES.map(d => '<path d="' + d + '"/>').join('') + '</g>' +
    EXOS_PANELS.map(([l, d]) => '<path class="' + cls(l as Loc) + '" d="' + d + '"/>').join('') +
    '<g class="' + cls('BACK') + '">' + BACK_SHAPE + '</g>' +
    LOCS.map(l => '<g class="hhit" data-loc="' + l + '">' + HIT[l] + '</g>').join('') + '</svg>';
}

// ---- readouts (the hunt's own numbers) ----
function bar(v: number, max: number, cls = '') { return '<span class="hbar"><span class="' + cls + '" style="width:' + Math.min(100, 100 * v / max) + '%"></span></span>'; }
function heardAt(s: number) { return s > TUNE.DET_THRESH ? TUNE.DET_FALLOFF * Math.sqrt(s / TUNE.DET_THRESH - 1) : 0; }
function readout() {
  const f = fits[cur], S = fitStats(f), over = S.load > S.rated;
  const parts = splitHits('MECH', fitHits(f)), radar = itemsAll(f).find(i => i.radar)?.radar, gun = itemsAll(f).find(i => i.gun), mortar = itemsAll(f).find(i => i.mortar);
  const mv = (m: string) => TUNE.SOUND_RANGE[m] + S.over.snd;
  const lines = [
    '<div><b>LOAD</b> ' + bar(S.load, S.max, S.load > S.max ? 'bad' : over ? 'warn' : '') + ' ' + S.load + ' / ' + S.rated + ' <small>(max ' + S.max + ')</small>' +
      (over ? '<br><small class="warnt">overload ' + (S.load - S.rated) + ': +' + S.over.snd + ' sound per move' + (S.over.ap ? ', +' + S.over.ap + ' AP per move' : '') + '</small>' : ''),
    '<div><b>POWER</b> ' + (S.regen >= 0 ? '+' : '') + S.regen + '/turn <small>(out ' + S.totals.output + ' − draw ' + S.totals.draw + ')</small> · pool ' + S.pool + '</div>',
    '<div><b>EM</b> ' + bar(S.emBase, 3, 'em') + ' ' + S.emBase.toFixed(1) + ' <small>passive hears you ~' + Math.round(heardAt(S.emBase)) + 't once you emit</small>' +
      (radar ? '<br><small>radar pulse: +' + Math.round(radarEmit(f)) + ' EMIT, ' + radar.ap + ' AP ' + radar.en + ' EN</small>' : '') + '</div>',
    (TUNE.THERMAL_ENABLED ? '<div><b>IR</b> ' + bar(S.irBase, 10, 'ir') + ' ' + S.irBase + ' <small>thermal sights see you ~' + Math.round(Math.min(TUNE.IR_RANGE, TUNE.IR_TILES_PER_PT * S.irBase)) + 't in line of sight; +' + TUNE.IR_FIRE + ' a shot, +' + TUNE.IR_SPRINT + ' a sprint, cools ' + TUNE.IR_COOL_PER_TURN + '/turn</small></div>' : '') +
    '<div><b>SND</b> ' + bar(mv('NORMAL'), 14, 'snd') + ' move ' + mv('CREEP') + '/' + mv('NORMAL') + '/' + mv('SPRINT') + (gun ? ' · shot ' + gun.gun.snd : '') + (mortar ? ' · lob ' + mortar.mortar.snd : '') + ' <small>tiles</small></div>',
    '<div><b>HITS</b> ' + Object.keys(parts).map(p => PART_ABBR[p] + ' ' + parts[p]).join(' · ') + (gun ? ' · ' + fitRounds(f) + ' rds' : '') + '</div>',
  ];
  const w = launchBlock(f);
  return lines.join('') + (w ? '<div class="badt">✕ ' + esc(w) + '</div>' : '<div class="okt">✓ launches</div>');
}
const itemsAll = (f: Fit) => LOCS.flatMap(l => itemsIn(f, l));
function radarEmit(f: Fit) { const k = LOCS.find(l => itemsIn(f, l).some(i => i.radar)); const mod = k ? itemsIn(f, k).find(i => i.mod)?.mod : null; const r = itemsAll(f).find(i => i.radar).radar; return r.emit * (mod && mod.tag === 'SENSOR' ? mod.emitMult?.EM ?? 1 : 1); }

// ---- the selected location ----
function locPanel() {
  const f = fits[cur], fr = frameOf(f), slots = fr.slots[sel], row = f.mounts[sel], pl = byId(PLATES, f.plate[sel]);
  const hps = !slots.length ? '<small>no hardpoints on a ' + fr.name + '</small>' : slots.map((s, i) => {
    const id = row[i];
    if (isCont(id)) return '<button class="hslot cont" data-idx="' + i + '">⤶ ' + esc(byId(ITEMS, row[+id.slice(1)])?.name || '') + '</button>';
    const it = byId(ITEMS, id);
    return '<button class="hslot' + (it ? ' full' : '') + '" data-idx="' + i + '">' + (it ? esc(it.name) : '<small>' + SLOT_WORD[s] + '</small>') + '</button>';
  }).join('');
  const P = byId(PLATES, TUNE.HANGAR_PLATES[0]);
  return '<div class="hlhead">' + LOC_NAME[sel] + ' <small>part ' + LOC_PART[sel] + (sel === 'BACK' ? ' · only hit from behind' : '') + ' · its modules go offline if it is destroyed</small></div>' +
    '<div class="hslots">' + hps + '</div>' +
    '<button class="hslot plate' + (pl ? ' full' : '') + '" data-plate="1">plate: ' + (pl ? pl.name + ' +' + pl.hits + ' hits, wt ' + pl.wt : 'none <small>(tap: ' + P.name + ' +' + P.hits + ' hits, wt ' + P.wt + ')</small>') + '</button>';
}

function render() {
  const f = fits[cur], fr = frameOf(f);
  $('hsuits').innerHTML = ['A', 'B'].map((n, i) => '<button class="' + (i === cur ? 'on' : '') + '" data-suit="' + i + '">ExoS ' + n + '<br><small>' + frameOf(fits[i]).name + (launchBlock(fits[i]) ? ' ✕' : '') + '</small></button>').join('') +
    '<button data-copy="1">' + 'AB'[cur] + ' → ' + 'BA'[cur] + '<br><small>copy fit</small></button>';
  $('htpl').innerHTML = '<small>start from</small>' + HANGAR_TEMPLATES.map(t => '<button data-tpl="' + t.id + '">' + t.role + '</button>').join('') +
    '<small>frame</small>' + TUNE.HANGAR_FRAMES.map(id => '<button class="' + (id === f.frame ? 'on' : '') + '" data-frame="' + id + '">' + byId(FRAMES, id).name + '</button>').join('');
  $('hframe').innerHTML = '<b>' + fr.name + '</b> ' + fr.cls + ' · rated ' + fr.rated + ' / max ' + fr.max + ' · ' + esc(fr.role) + (tip ? '<br><span class="warnt">' + esc(tip) + '</span>' : '');
  $('hsuit').innerHTML = suitSvg();
  $('hloc').innerHTML = locPanel();
  $('hread').innerHTML = readout();
  $('bLaunch').classList.toggle('lockd', !!hangarBlock());
}
export function renderHangar() { render(); }

// ---- the picker sheet ----
let pickIdx = -1;
function delta(nb: Fit) {
  const a = fitStats(fits[cur]), b = fitStats(nb), d = (x: number, y: number) => { const v = Math.round((y - x) * 10) / 10; return v ? (v > 0 ? '+' : '') + v : ''; };
  const p = [d(a.load, b.load) && 'load ' + d(a.load, b.load), d(a.regen, b.regen) && 'power ' + d(a.regen, b.regen) + '/turn', d(a.pool, b.pool) && 'pool ' + d(a.pool, b.pool), d(a.emBase, b.emBase) && 'EM ' + d(a.emBase, b.emBase)].filter(Boolean);
  const w = launchBlock(nb);
  return (p.join(' · ') || 'no change') + (w && !launchBlock(fits[cur]) ? ' · <span class="badt">✕ ' + esc(w) + '</span>' : '');
}
function openPick(idx: number) {
  const f = fits[cur], slot = frameOf(f).slots[sel][idx], curId = f.mounts[sel][idx];
  pickIdx = idx;
  $('hstitle').textContent = sel + ' · ' + SLOT_WORD[slot].toLowerCase() + ' hardpoint' + (slot === 'O' ? ' (takes anything)' : '');
  const rows: string[] = [];
  if (curId) rows.push('<button class="hopt" data-pick="">Remove ' + esc(byId(ITEMS, curId).name) + '<br><small>' + delta(unmount(f, sel, idx)) + '</small></button>');
  for (const id of offer()) {
    const it = byId(ITEMS, id) as Item;
    if (slot !== 'O' && !it.hp.includes(slot)) continue;
    const why = whyNot(f, sel, idx, it) || hangarWhy(f, id, curId);
    const meta = ['wt ' + it.wt, it.out ? 'output ' + it.out : '', it.draw ? 'draw ' + it.draw : '', it.pool ? 'pool +' + it.pool : '', it.use || ''].filter(Boolean).join(' · ');
    rows.push('<button class="hopt"' + (why ? ' disabled' : '') + ' data-pick="' + id + '"><b>' + esc(it.name) + (id === curId ? ' (fitted)' : '') + '</b> <small>' + esc(meta) + '</small><br><small>' + esc(it.effect + (it.trade !== '—' ? ' · ' + it.trade : '')) + '</small><br><small>' +
      (why ? '<span class="badt">' + esc(why) + '</span>' : delta(mount(f, sel, idx, it))) + '</small></button>');
  }
  $('hopts').innerHTML = rows.join('');
  $('hsheet').hidden = false; $('hopts').scrollTop = 0;
}
function closePick() { $('hsheet').hidden = true; pickIdx = -1; }

// Changing frame keeps whatever still fits (same location), and the plates
function reframe(id: string) {
  const old = fits[cur]; let b: Fit = emptyBuild(id, 'steel');
  for (const l of LOCS) { for (const it of itemsIn(old, l)) b = place(b, l, it.id) || b; b.plate[l] = old.plate[l]; }
  const lost = LOCS.flatMap(l => itemsIn(old, l)).length - LOCS.flatMap(l => itemsIn(b, l)).length;
  if (old.rounds !== undefined) b.rounds = old.rounds;
  set(b); if (lost) { tip = lost + ' module' + (lost > 1 ? 's' : '') + ' didn’t fit the ' + frameOf(b).name + ' and came off'; render(); }
}

export function buildHangar() {
  $('hangar').addEventListener('click', ev => {
    const t = ev.target as Element, b = t.closest('button') as HTMLButtonElement, g = t.closest('.hhit') as HTMLElement;
    if (g) { sel = g.dataset.loc as Loc; render(); return; }
    if (!b || b.disabled) return;
    const d = b.dataset;
    if (d.suit) { cur = +d.suit; render(); }
    else if (d.copy) { fits[1 - cur] = structuredClone(fits[cur]); const c = cur; cur = 1 - c; save(); cur = c; tip = 'copied to ' + 'AB'[1 - cur]; render(); }
    else if (d.tpl) { const T = HANGAR_TEMPLATES.find(x => x.id === d.tpl); set(T.fit()); tip = T.role + ': ' + T.blurb; render(); }
    else if (d.frame) reframe(d.frame);
    else if (d.plate) { const f = structuredClone(fits[cur]); f.plate[sel] = f.plate[sel] ? null : TUNE.HANGAR_PLATES[0]; set(f); }
    else if (d.idx !== undefined) { const raw = fits[cur].mounts[sel][+d.idx]; openPick(isCont(raw) ? +raw.slice(1) : +d.idx); }
  });
  $('hsheet').addEventListener('click', ev => {
    const b = (ev.target as Element).closest('button') as HTMLButtonElement;
    if (ev.target === $('hsheet') || (b && b.id === 'hsclose')) { closePick(); return; }
    if (!b || b.disabled || b.dataset.pick === undefined) return;
    const f = fits[cur], id = b.dataset.pick;
    set(id ? mount(f, sel, pickIdx, byId(ITEMS, id) as Item) : unmount(f, sel, pickIdx));
    closePick();
  });
  render();
}
