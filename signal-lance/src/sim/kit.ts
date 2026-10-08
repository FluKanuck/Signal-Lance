// R18 (A2): one fit shape for both sides. unit.fit = a Build (frame, chassis, mounts by location, plate, skin; see fit.ts),
// plus `rounds` (gun rounds loaded; default = the gun row's). The hunt asks the fit questions through these helpers
// instead of the old load.* / hasRadar / passive / hasEcm flags.
import { TUNE } from '../tune.ts';
import { ITEMS, LOCS, PLATES, byId } from './items.ts';
import type { Item, Loc, RadarStats, GunStats, MortarStats } from './items.ts';
import { emptyBuild, frameOf, itemsIn, modIn, mount, totals, whyNot } from './fit.ts';
import type { Build } from './fit.ts';

export type Fit = Build & { rounds?: number };

// ---- questions about a unit's fit ----
// u.items: what it carries, worked out once when the unit is built ([] for no fit, e.g. the Escort transport).
export function kitOf(fit: Fit | null) { return fit ? LOCS.flatMap(loc => itemsIn(fit, loc).map(item => ({ item, loc }))) : []; }
const kit = (u): { item: Item; loc: Loc }[] => (u && u.items) || [];
export function itemsAt(u, loc: Loc): Item[] { return kit(u).filter(k => k.loc === loc).map(k => k.item); }
// R18 (A4): locations are parts. Each location is one hit-location part; losing the part takes what is mounted there offline.
export const LOC_PART: Record<Loc, string> = { MAST: 'SENSORS', ARMS: 'WEAPON', CORE: 'CORE', BACK: 'BACK', LEGS: 'LEGS' };
export const PART_LOC: Record<string, Loc> = { SENSORS: 'MAST', WEAPON: 'ARMS', CORE: 'CORE', BACK: 'BACK', LEGS: 'LEGS' };
// Is the location working? (its part still has hits; a unit without that part, e.g. a turret's LEGS, counts as working)
export function online(u, loc: Loc) { const p = LOC_PART[loc]; return !(u && u.parts && u.parts[p] !== undefined && u.parts[p] <= 0); }
export function has(u, tag: string) { return kit(u).some(k => k.item.tags.includes(tag) && online(u, k.loc)); }
export function fitted(u, tag: string) { return kit(u).some(k => k.item.tags.includes(tag)); } // carried, working or not
// "MAST" when everything carrying the tag sits on a part that's gone (the button's one-word reason), '' otherwise
export function offWhy(u, tag: string) { const k = kit(u).find(k => k.item.tags.includes(tag)); return k && !has(u, tag) ? PART_SHORT[LOC_PART[k.loc]] : ''; }
const PART_SHORT = { SENSORS: 'MAST', WEAPON: 'ARMS', CORE: 'CORE', BACK: 'BACK', LEGS: 'LEGS' }; // R24: the part's one name (the hangar's location name)
export function active(u, id: string) { return kit(u).some(k => k.item.id === id && online(u, k.loc)); }
const first = (u, f: (i: Item) => any) => { const k = kit(u).find(k => f(k.item) && online(u, k.loc)); return k ? f(k.item) : null; };
// R18 (A9): a mod in the same location changes the radar's per-use EM (Cold processor: SENSOR EM × 0.6)
export function radarOf(u): RadarStats | null {
  const k = kit(u).find(k => k.item.radar && online(u, k.loc)); if (!k) return null;
  const mod = u.fit ? modIn(u.fit, k.loc)?.mod : null;
  const x = mod && (mod.tag === 'any' || k.item.tags.includes(mod.tag)) ? mod.emitMult?.EM ?? 1 : 1;
  return x === 1 ? k.item.radar : { ...k.item.radar, emit: k.item.radar.emit * x, sig: k.item.radar.sig * x };
}
export function gunOf(u): GunStats | null { return first(u, i => i.gun); }
export function mortarOf(u): MortarStats | null { return first(u, i => i.mortar); }

// ---- R18 checkpoint 3: THERMAL. A unit's IR = its steady heat + the heat it has built up (u.heat; cools each own turn). ----
export function irOf(u) { return (u.irBase || 0) + (u.heat || 0); }
export function irRange(u) { return Math.min(TUNE.IR_RANGE, TUNE.IR_TILES_PER_PT * irOf(u)); } // tiles a thermal sight sees it at
export function readsIR(u) { return TUNE.THERMAL_ENABLED && has(u, 'THERMAL'); }
export function addHeat(u, n: number) { u.heat = (u.heat || 0) + n; }

// ---- numbers a fresh unit starts with ----
export function plateCount(fit: Fit | null) { return fit ? LOCS.filter(l => fit.plate[l]).length : 0; }
export function fitHits(fit: Fit) { return (frameOf(fit).hits || 0) + LOCS.reduce((a, l) => a + (byId(PLATES, fit.plate[l])?.hits || 0), 0); }
export function fitRounds(fit: Fit) { const g = kitOf(fit).find(k => k.item.gun); return g ? fit.rounds ?? g.item.gun.rounds : 0; }
export function fitShells(fit: Fit) { const m = kitOf(fit).find(k => k.item.mortar); return m ? m.item.mortar.shells : 0; }
export function fitPool(fit: Fit) { return TUNE.ENERGY_BASE + kitOf(fit).reduce((a, k) => a + (k.item.pool || 0), 0); }

// R18 (A6 power, A7 weight, A8 signature): what a fit means in the hunt, worked out once when the unit is built.
// regen = reactor output − idle draw (per own turn); pool = base + batteries; over = the overload penalty per move;
// emBase = the standing EM signature (always-on emit + visibility, × SIG_EM_PER_PT; skins absorb their location's share).
export function fitStats(fit: Fit) {
  const t = totals(fit), em = t.sig.EM;
  return { regen: t.net, pool: t.pool, load: t.load, rated: t.rated, max: t.max, over: { ap: t.penalty.moveAP, snd: t.penalty.servoSnd, en: t.penalty.moveEN },
    emBase: (em.e - em.u + em.v) * TUNE.SIG_EM_PER_PT, problems: t.problems, totals: t,
    irBase: t.sig.IR.e - t.sig.IR.u + t.sig.IR.v + frameOf(fit).vis.VIS * TUNE.IR_SIZE_PER_VIS }; // R18 cp3: steady heat (reactor + size)
}
// Why this fit can't launch ('' = it can): no reactor, draw over output, or over its hard max load
export function launchBlock(fit: Fit) { const p = totals(fit).problems; return p.length ? p[0] : ''; }

// A unit's Sound radii (tiles) per event: moves from SOUND_RANGE, the shot and the launch from its gun / mortar row
// (0 without one), then a field variant's own SOUND on top.
export function soundsOf(u, own = {}) { return { ...TUNE.SOUND_RANGE, SHOT: gunOf(u)?.snd || 0, MORTAR: mortarOf(u)?.snd || 0, ...own }; }

// ---- building fits ----
// Put item `id` in the first free hardpoint of `loc` that takes it (typed before OPEN). null = no room.
export function place(b: Build, loc: Loc, id: string): Build | null {
  const item = byId(ITEMS, id); if (!item) throw new Error('no item ' + id);
  const free = frameOf(b).slots[loc].map((s, i) => ({ s, i })).filter(x => b.mounts[loc][x.i] === null && !whyNot(b, loc, x.i, item));
  const pick = free.find(x => x.s !== 'O') ?? free[0];
  return pick ? mount(b, loc, pick.i, item) : null;
}
// Place each [loc, id] in turn (one that doesn't fit is skipped), then plates on the listed locations.
export function makeFit(frame: string, rows: [Loc, string][], plates: Loc[] = [], rounds?: number): Fit {
  let b: Fit = emptyBuild(frame, 'steel');
  for (const [loc, id] of rows) b = place(b, loc, id) || b;
  for (const l of plates) b.plate[l] = 'p_steel';
  if (rounds !== undefined) b.rounds = rounds;
  return b;
}
const PLATE_ORDER: Loc[] = ['CORE', 'ARMS', 'LEGS', 'MAST', 'BACK']; // where plate 1, 2, ... go

// The R17 default loadout as a fit (armour 1, passive, ECM, autocannon 20 rounds): a Warden on a Cold-burn.
// The old loadout picker's numbers, as a fit (checkpoint 1 only: the hangar replaces the picker).
// Sensors go on the MAST first and spill into the CORE's OPEN hardpoint; anything with no room left is dropped.
export function fitFromLoad(L): Fit {
  const S: string[] = [...(L.radar ? ['lamp'] : []), ...(L.passive ? ['emarray'] : []), ...(L.ecm ? ['mask', 'ghost'] : [])];
  const rows: [Loc, string][] = [['CORE', 'coldburn']];
  for (const id of S) rows.push(['MAST', id]);
  if (L.ammo) rows.push(['ARMS', 'autocannon']);
  if (L.mortar) rows.push(['BACK', 'mortar']);
  for (let i = 0; i < (L.cells || 0); i++) rows.push(['CORE', 'battery'], ['BACK', 'battery']);
  let b: Fit = emptyBuild('warden', 'steel');
  for (const [loc, id] of rows) b = place(b, loc, id) || (loc === 'MAST' ? place(b, 'CORE', id) : null) || b;
  // a battery is tried in CORE then BACK; keep only as many as the load asked for
  let n = 0; for (const l of ['CORE', 'BACK'] as Loc[]) b.mounts[l] = b.mounts[l].map(id => id === 'battery' && n++ >= (L.cells || 0) ? null : id);
  for (let i = 0; i < Math.min(L.armour || 0, PLATE_ORDER.length); i++) b.plate[PLATE_ORDER[i]] = 'p_steel';
  if (L.ammo) b.rounds = L.ammo * 10;
  return b;
}
export const LOAD_DEFAULTS = { armour: 1, radar: 0, passive: 1, ecm: 1, ammo: 2, cells: 0, mortar: 0 }; // the R17 DEFAULT_LOAD
export const DEFAULT_FIT: Fit = fitFromLoad(LOAD_DEFAULTS);
// A fit as is, or old load numbers ({ armour, radar, ... }, the runner's and tests' shorthand) made into one.
export function toFit(l): Fit { return l && l.frame ? l : fitFromLoad({ ...LOAD_DEFAULTS, ...(l || {}) }); }

// ---- R18 (A10): the in-game hangar's starting fits, cheap-test set only. Line = the R17 default. ----
export const HANGAR_TEMPLATES: { id: string; role: string; blurb: string; fit: () => Fit }[] = [
  { id: 'scout', role: 'Scout', blurb: 'Wisp. Light and quiet on EM; Lamp radar to find things first. Few hits, no BACK: no mortar.',
    fit: () => makeFit('wisp', [['MAST', 'lamp'], ['MAST', 'emarray'], ['MAST', 'mask'], ['ARMS', 'autocannon'], ['CORE', 'hotcore'], ['CORE', 'battery']]) },
  { id: 'line', role: 'Line', blurb: 'Warden. The R17 ExoS: passive, mask and ghost, autocannon, a plate on the core.',
    fit: () => structuredClone(DEFAULT_FIT) },
  { id: 'brawler', role: 'Brawler', blurb: 'Bulwark. Plated arms, core and legs, a mortar on the back. Loud on EM, slow to kill.',
    fit: () => makeFit('bulwark', [['MAST', 'emarray'], ['ARMS', 'autocannon'], ['CORE', 'hotcore'], ['CORE', 'battery'], ['BACK', 'mortar']], ['ARMS', 'CORE', 'LEGS']) },
];
// Hangar-only rule while a suit carries one gun and one mortar (several weapons per suit is a later round): at most one of
// each module row, except batteries. '' = fine, else why not.
// One reactor per suit too (toy open question 4: the frame's INTERNAL hardpoints are the size cap).
export function hangarWhy(b: Fit, id: string, replacing: string | null = null) {
  if (id === replacing) return '';
  const all = LOCS.flatMap(l => itemsIn(b, l)), it = byId(ITEMS, id), rep = byId(ITEMS, replacing);
  if (it?.tags.includes('REACTOR') && !rep?.tags.includes('REACTOR') && all.some(i => i.tags.includes('REACTOR'))) return 'one reactor per ExoS';
  if (id === 'battery') return '';
  return all.some(i => i.id === id) ? 'one per ExoS' : '';
}

// A field unit's fit from its FIELD_TYPES row (+ variant STATS): FRAME, RADAR, PASSIVE, ARMOUR plates, AMMO rounds, CELLS.
export function fieldFit(F): Fit {
  const rows: [Loc, string][] = [];
  if (F.RADAR) rows.push(['MAST', 'lamp']);
  if (F.PASSIVE) rows.push(['MAST', 'emarray']);
  if (F.AMMO) rows.push(['ARMS', F.GUN || 'autocannon']); // R18: a variant may carry another gun row (sniper: longgun)
  if (F.THERMAL) rows.push(['MAST', 'thermal']); // R18 cp3
  for (let i = 0; i < (F.CELLS || 0); i++) rows.push(['CORE', 'battery']);
  return makeFit(F.FRAME, rows, PLATE_ORDER.slice(0, F.ARMOUR || 0), F.AMMO || 0);
}

// "Warden: emarray mask | autocannon | coldburn ghost · plate CORE" (log line / result screen)
export function fitText(fit: Fit | null) {
  if (!fit) return 'none';
  const loc = LOCS.map(l => itemsIn(fit, l).map(i => i.id).join(' ')).filter(Boolean).join(' | ');
  const pl = LOCS.filter(l => fit.plate[l]);
  return frameOf(fit).name + ': ' + loc + (pl.length ? ' · plate ' + pl.join(' ') : '') + (fit.rounds !== undefined && fitRounds(fit) ? ' · ' + fitRounds(fit) + ' rds' : '');
}
