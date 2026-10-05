// Building toy: the construction rulebook (claude/signal-lance-construction.md) as pure functions.
// No DOM here, so the tests (test/build.test.ts) and later the runner can sweep builds.
import { CHASSIS, CHS, FRAMES, ITEMS, LOCS, PLATES, SKINS, byId } from './data.ts';
import type { Ch, Chassis, Frame, HP, Item, Loc } from './data.ts';

export const POOL_BASE = 100; // TUNE.ENERGY_BASE
/** The second hardpoint of a 2-hardpoint module holds `^<index of its first hardpoint>`. */
export const isCont = (id: string | null): id is string => !!id && id.startsWith('^');

export interface Build {
  frame: string; chassis: Chassis;
  mounts: Record<Loc, (string | null)[]>;   // item id per hardpoint (or a ^ marker, see isCont)
  plate: Record<Loc, string | null>;
  skin: Record<Loc, string | null>;
}

const perLoc = <T>(f: (l: Loc) => T) => Object.fromEntries(LOCS.map(l => [l, f(l)])) as Record<Loc, T>;

export function emptyBuild(frameId: string, chassis?: Chassis): Build {
  const f = byId(FRAMES, frameId) ?? FRAMES[0];
  return {
    frame: f.id, chassis: chassis && f.chassis.includes(chassis) ? chassis : f.chassis[0],
    mounts: perLoc(l => f.slots[l].map(() => null)),
    plate: perLoc(() => null), skin: perLoc(() => null),
  };
}

export const frameOf = (b: Build): Frame => byId(FRAMES, b.frame) ?? FRAMES[0];
export const itemsIn = (b: Build, l: Loc): Item[] =>
  b.mounts[l].filter((id): id is string => !!id && !isCont(id)).map(id => byId(ITEMS, id)).filter((x): x is Item => !!x);
export const modIn = (b: Build, l: Loc): Item | undefined => itemsIn(b, l).find(i => i.mod);

const slotTakes = (slot: HP, item: Item) => slot === 'O' || item.hp.includes(slot);

/** Why `item` can't go into hardpoint `idx` of `loc` (null = it fits). Ignores whatever is already in that slot. */
export function whyNot(b: Build, loc: Loc, idx: number, item: Item): string | null {
  const base = unmount(b, loc, idx);
  const slots = frameOf(base).slots[loc];
  if (!slotTakes(slots[idx], item)) return `needs ${item.hp.join('/')} or O`;
  if (item.mod && modIn(base, loc)) return 'one mod per location';
  if (item.size === 2 && freeTwin(base, loc, idx, item) < 0) return 'needs 2 hardpoints here';
  return null;
}

const freeTwin = (b: Build, loc: Loc, idx: number, item: Item) =>
  frameOf(b).slots[loc].findIndex((s, j) => j !== idx && slotTakes(s, item) && b.mounts[loc][j] === null);

/** Returns a new Build with `item` in loc[idx] (replacing what was there). Assumes whyNot() was null. */
export function mount(b: Build, loc: Loc, idx: number, item: Item): Build {
  const nb = unmount(b, loc, idx);
  if (item.size === 2) nb.mounts[loc][freeTwin(nb, loc, idx, item)] = `^${idx}`;
  nb.mounts[loc][idx] = item.id;
  return nb;
}

/** Returns a new Build with loc[idx] empty (both halves, if it held a 2-hardpoint module). */
export function unmount(b: Build, loc: Loc, idx: number): Build {
  const nb: Build = structuredClone(b);
  const row = nb.mounts[loc];
  const head = isCont(row[idx]) ? Number(row[idx]!.slice(1)) : idx;
  row[head] = null;
  row.forEach((id, j) => { if (id === `^${head}`) row[j] = null; });
  return nb;
}

// ── Overload band ────────────────────────────────────────────────────────────────────────────
/**
 * Between rated and max load, the suit pays for the extra weight in the hunt:
 * extra AP per move and extra servo Sound (construction doc, "Weight" row). Over max can't launch.
 * TODO(Jamie): the shape of this penalty is a design call — see the chat.
 */
export function overloadPenalty(load: number, rated: number, max: number): { moveAP: number; servoSnd: number } {
  void load; void rated; void max;
  return { moveAP: 0, servoSnd: 0 };
}

// ── Totals ───────────────────────────────────────────────────────────────────────────────────
export interface ChTotal { e: number; v: number; loudest: Loc | null }
export interface Totals {
  load: number; rated: number; max: number; penalty: { moveAP: number; servoSnd: number };
  output: number; draw: number; net: number; pool: number;
  sig: Record<Ch, ChTotal>;
  locSig: Record<Loc, Record<Ch, { e: number; v: number }>>;
  hits: Record<Loc, number>;
  problems: string[]; notes: string[];
}

export function totals(b: Build): Totals {
  const f = frameOf(b);
  const ch = CHASSIS[b.chassis];
  const problems: string[] = [];
  const notes: string[] = [];
  let load = 0, output = 0, draw = 0, pool = POOL_BASE, ratedAdd = ch.rated;
  const zero = () => Object.fromEntries(CHS.map(c => [c, { e: 0, v: 0 }])) as Record<Ch, { e: number; v: number }>;
  const locSig = perLoc(zero);
  const hits = perLoc(() => 0);
  const used = LOCS.filter(l => f.slots[l].length > 0);

  // Frame base Visibility is spread over the frame's locations, so a skin on one location hides its share.
  const baseVis: Partial<Record<Ch, number>> = { VIS: f.vis.VIS, EM: f.vis.EM, MAG: Math.max(0, f.vis.MAG + ch.mag) };

  for (const l of LOCS) {
    const s = locSig[l];
    for (const c of CHS) s[c].v += (baseVis[c] ?? 0) / used.length * (used.includes(l) ? 1 : 0);
    const mod = modIn(b, l)?.mod;
    for (const it of itemsIn(b, l)) {
      load += it.wt;
      output += it.out ?? 0;
      pool += it.pool ?? 0;
      const hit = !!mod && !it.mod && (mod.tag === 'any' || it.tags.includes(mod.tag));
      draw += it.draw * (hit && mod.drawMult ? mod.drawMult : 1);
      for (const c of CHS) {
        const sg = it.sig[c];
        if (!sg) continue;
        s[c].e += (sg.e ?? 0) * (hit ? mod.emitMult?.[c] ?? 1 : 1);
        s[c].v += sg.v ?? 0;
      }
    }
    if (mod) {
      draw += mod.drawAdd ?? 0;
      ratedAdd += mod.ratedAdd ?? 0;
      const any = itemsIn(b, l).some(it => !it.mod && (mod.tag === 'any' || it.tags.includes(mod.tag)));
      if (!any) notes.push(`${l}: ${modIn(b, l)!.name} has no ${mod.tag} module to work on`);
    }
    const plate = byId(PLATES, b.plate[l]);
    if (plate) {
      load += plate.wt; hits[l] += plate.hits;
      for (const c of CHS) { s[c].e += plate.sig[c]?.e ?? 0; s[c].v += plate.sig[c]?.v ?? 0; }
    }
    const skin = byId(SKINS, b.skin[l]);
    if (skin) {
      load += skin.wt; draw += skin.draw;
      for (const c of CHS) {
        s[c].e += skin.sig[c]?.e ?? 0; s[c].v += skin.sig[c]?.v ?? 0;
        s[c].e *= 1 - (skin.abs[c]?.e ?? 0);
        s[c].v *= 1 - (skin.abs[c]?.v ?? 0);
      }
    }
  }

  const sig = Object.fromEntries(CHS.map(c => {
    let e = 0, v = 0, loudest: Loc | null = null, top = 0;
    for (const l of LOCS) {
      const x = locSig[l][c];
      e += x.e; v += x.v;
      if (x.e + x.v > top) { top = x.e + x.v; loudest = l; }
    }
    return [c, { e, v, loudest }];
  })) as Record<Ch, ChTotal>;

  const rated = f.rated + ratedAdd, max = f.max + ch.rated;
  if (output === 0) problems.push('No reactor in CORE');
  if (output - draw < 0) problems.push(`Draw ${fmt(draw)} > output ${output}: won’t fit`);
  if (load > max) problems.push(`Load ${load} over hard max ${max}`);
  if (load > rated && load <= max) notes.push(`Overload band: ${load - rated} over rated`);

  return {
    load, rated, max, penalty: load > rated ? overloadPenalty(load, rated, max) : { moveAP: 0, servoSnd: 0 },
    output, draw, net: output - draw, pool, sig, locSig, hits, problems, notes,
  };
}

export const fmt = (n: number) => (Math.round(n * 10) / 10).toString();
