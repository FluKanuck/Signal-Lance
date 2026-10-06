// R18 (A2): one fit shape for both sides. unit.fit = a Build (frame, chassis, mounts by location, plate, skin; see fit.ts),
// plus `rounds` (gun rounds loaded; default = the gun row's). The hunt asks the fit questions through these helpers
// instead of the old load.* / hasRadar / passive / hasEcm flags.
import { TUNE } from '../tune.ts';
import { ITEMS, LOCS, PLATES, byId } from './items.ts';
import type { Item, Loc, RadarStats, GunStats, MortarStats } from './items.ts';
import { emptyBuild, frameOf, itemsIn, mount, whyNot } from './fit.ts';
import type { Build } from './fit.ts';

export type Fit = Build & { rounds?: number };

// ---- questions about a unit's fit ----
// u.items: what it carries, worked out once when the unit is built ([] for no fit, e.g. the Escort transport).
export function kitOf(fit: Fit | null) { return fit ? LOCS.flatMap(loc => itemsIn(fit, loc).map(item => ({ item, loc }))) : []; }
const kit = (u): { item: Item; loc: Loc }[] => (u && u.items) || [];
export function itemsAt(u, loc: Loc): Item[] { return kit(u).filter(k => k.loc === loc).map(k => k.item); }
// Is the item's location working? (Checkpoint 1: always. Checkpoint 2 makes locations parts.)
export function online(_u, _loc: Loc) { return true; }
export function has(u, tag: string) { return kit(u).some(k => k.item.tags.includes(tag) && online(u, k.loc)); }
export function active(u, id: string) { return kit(u).some(k => k.item.id === id && online(u, k.loc)); }
const first = (u, f: (i: Item) => any) => { const k = kit(u).find(k => f(k.item) && online(u, k.loc)); return k ? f(k.item) : null; };
export function radarOf(u): RadarStats | null { return first(u, i => i.radar); }
export function gunOf(u): GunStats | null { return first(u, i => i.gun); }
export function mortarOf(u): MortarStats | null { return first(u, i => i.mortar); }

// ---- numbers a fresh unit starts with ----
export function plateCount(fit: Fit | null) { return fit ? LOCS.filter(l => fit.plate[l]).length : 0; }
export function fitHits(fit: Fit) { return (frameOf(fit).hits || 0) + LOCS.reduce((a, l) => a + (byId(PLATES, fit.plate[l])?.hits || 0), 0); }
export function fitRounds(fit: Fit) { const g = kitOf(fit).find(k => k.item.gun); return g ? fit.rounds ?? g.item.gun.rounds : 0; }
export function fitShells(fit: Fit) { const m = kitOf(fit).find(k => k.item.mortar); return m ? m.item.mortar.shells : 0; }
export function fitPool(fit: Fit) { return TUNE.ENERGY_BASE + kitOf(fit).reduce((a, k) => a + (k.item.pool || 0), 0); }

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

// A field unit's fit from its FIELD_TYPES row (+ variant STATS): FRAME, RADAR, PASSIVE, ARMOUR plates, AMMO rounds, CELLS.
export function fieldFit(F): Fit {
  const rows: [Loc, string][] = [];
  if (F.RADAR) rows.push(['MAST', 'lamp']);
  if (F.PASSIVE) rows.push(['MAST', 'emarray']);
  if (F.AMMO) rows.push(['ARMS', 'autocannon']);
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
