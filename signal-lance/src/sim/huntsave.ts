// SAVE & QUIT (Jamie, 2026-10-08: "distinguish quitting because you have to stop playing from bailing out"): the whole
// hunt as plain JSON, and putting it back exactly, so a resumed hunt carries on from the same turn and rolls the same
// dice. Pure: the view stores the string (localStorage) and calls these.
//
// G is an object graph (G.p is one of G.lance, G.order holds suits and field units, G.sel is one of G.pc, the crew are
// the company's operators...), so it is encoded with ids: the first time an object is met it gets an id, later
// meetings are references. Objects that belong to static data (TUNE, the item and frame catalogues, the block
// library, mission info) are saved by name, so the restored hunt points at the same rows the game uses.
import { TUNE } from '../tune.ts';
import { G } from './state.ts';
import * as ITEMS from './items.ts';
import * as KIT from './kit.ts';
import { BLOCKS } from './blocks.ts';
import { MISSION_INFO } from './mission.ts';
import { N, mapState, setMapState } from './world.ts';
import { zmap, setZmap } from './zones.ts';
import { rngState, setRngState } from './rng.ts';
import { aarKeys, setAarKeys } from './aar.ts';

export const HUNT_SAVE_V = 1;

// ---------- the static registry: object → name, name → object ----------
let toName: Map<object, string> | null = null, toObj: Map<string, object> = new Map();
function registry() {
  if (toName) return toName;
  toName = new Map(); toObj = new Map();
  const roots: Record<string, any> = { TUNE, BLOCKS, MISSION_INFO, ...Object.fromEntries(Object.entries(ITEMS).map(([k, v]) => ['ITEMS.' + k, v])), ...Object.fromEntries(Object.entries(KIT).map(([k, v]) => ['KIT.' + k, v])) };
  const walk = (v: any, path: string) => {
    if (!v || typeof v !== 'object' || toName.has(v) || ArrayBuffer.isView(v)) return;
    toName.set(v, path); toObj.set(path, v);
    for (const k of Object.keys(v)) walk(v[k], path + '/' + k);
  };
  for (const [k, v] of Object.entries(roots)) walk(v, k);
  return toName;
}

// ---------- encode / decode ----------
export function encode(root: any): any {
  const names = registry(), ids = new Map<object, number>();
  const enc = (v: any): any => {
    if (v === undefined) return { $u: 1 };
    if (v === null || typeof v === 'boolean' || typeof v === 'string') return v;
    if (typeof v === 'number') return Number.isFinite(v) ? v : { $n: String(v) };
    if (typeof v === 'function') throw new Error('huntsave: a function in the hunt state');
    if (typeof v !== 'object') throw new Error('huntsave: cannot save a ' + typeof v);
    const nm = names.get(v); if (nm) return { $s: nm };
    const seen = ids.get(v); if (seen !== undefined) return { $r: seen };
    const id = ids.size; ids.set(v, id);
    if (ArrayBuffer.isView(v)) return { $t: v.constructor.name, id, d: Array.from(v as any) };
    if (v instanceof Set) return { $set: id, d: [...v].map(enc) };
    if (v instanceof Map) return { $map: id, d: [...v].map(([k, x]) => [enc(k), enc(x)]) };
    if (Array.isArray(v)) {
      const out: any = { $a: id, d: v.map(enc) }, extra = Object.keys(v).filter(k => !/^\d+$/.test(k)); // e.g. a bearing pool's .bi
      if (extra.length) out.x = Object.fromEntries(extra.map(k => [k, enc(v[k])]));
      return out;
    }
    if (Object.getPrototypeOf(v) !== Object.prototype && Object.getPrototypeOf(v) !== null) throw new Error('huntsave: a class instance in the hunt state (' + v.constructor?.name + ')');
    return { $o: id, d: Object.fromEntries(Object.keys(v).map(k => [k, enc(v[k])])) };
  };
  return enc(root);
}
export function decode(root: any): any {
  registry();
  const byId: any[] = [];
  const TA: Record<string, any> = { Uint8Array, Int8Array, Uint16Array, Int16Array, Uint32Array, Int32Array, Float32Array, Float64Array };
  const dec = (v: any): any => {
    if (v === null || typeof v !== 'object') return v;
    if ('$u' in v) return undefined;
    if ('$n' in v) return Number(v.$n);
    if ('$s' in v) { const o = toObj.get(v.$s); if (!o) throw new Error('huntsave: unknown static ' + v.$s); return o; }
    if ('$r' in v) return byId[v.$r];
    if ('$t' in v) return (byId[v.id] = TA[v.$t].from(v.d));
    if ('$set' in v) { const s = new Set(); byId[v.$set] = s; for (const x of v.d) s.add(dec(x)); return s; }
    if ('$map' in v) { const m = new Map(); byId[v.$map] = m; for (const [k, x] of v.d) m.set(dec(k), dec(x)); return m; }
    if ('$a' in v) { const a: any = []; byId[v.$a] = a; for (const x of v.d) a.push(dec(x)); if (v.x) for (const k of Object.keys(v.x)) a[k] = dec(v.x[k]); return a; }
    if ('$o' in v) { const o: any = {}; byId[v.$o] = o; for (const k of Object.keys(v.d)) o[k] = dec(v.d[k]); return o; }
    throw new Error('huntsave: unreadable value');
  };
  return dec(root);
}

// ---------- the hunt ----------
// Only on the player's own move (no action running), in a company contract hunt: what SAVE & QUIT offers.
export function huntSaveBlock(): string {
  if (G.mode !== 'hunt') return 'NOT IN A HUNT';
  if (G.tb || (G.co && G.co.testbed)) return 'TEST BED';
  if (!G.co || !G.ct || G.ct.status !== 'ACTIVE') return 'NO CONTRACT';
  if (G.phase !== 'PLAYER' || G.act) return 'WAIT';
  return '';
}
export function snapshotHunt() {
  return { v: HUNT_SAVE_V, code: G.co ? G.co.code : '', n: G.co ? G.co.n : -1, hunt: G.ct ? G.ct.hunt : -1, turn: G.turn,
    G: encode(G), map: mapState(), zmap: Array.from(zmap.subarray(0, N)), rng: rngState(), aar: aarKeys() };
}
export function restoreHunt(snap: any) {
  if (!snap || snap.v !== HUNT_SAVE_V) throw new Error('huntsave: not a hunt save (or an older version)');
  setMapState(snap.map); setZmap(snap.zmap);
  const g = decode(snap.G);
  for (const k of Object.keys(G)) delete G[k]; // G is imported everywhere: refill it in place
  Object.assign(G, g);
  setRngState(snap.rng); setAarKeys(snap.aar);
}
