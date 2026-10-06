// Round 15 step 3: ESCORT. An unarmed faction transport (G.ally) walks the route legs from the left edge to the right.
// It holds at each junction until the player picks a leg. The field senses, hunts and fires on it like a lance mech
// (state.ts friends()); the lance's own guns never hit it (a mortar splash does). Its death fails the hunt.
import { TUNE } from '../tune.ts';
import { T, W, anchors, findPath, canReach, mapGen, pathCost, clipPathCost, pathHitsClutter } from './world.ts';
import { G } from './state.ts';
import { initParts } from './combat.ts';
import { pathLen } from './turns.ts';
import { makeSound } from './sound.ts';

const ctr = (n) => ({ x: (n.x + 0.5) * T, y: (n.y + 0.5) * T });
// The legs leaving node k (index into anchors().legs)
export function legsFrom(k: string) { return anchors().legs.map((l, i) => ({ ...l, i })).filter(l => l.from === k); }
// A leg's walk, in world points: A* from node to node through its via tiles (cached per map; the route never changes)
let cache: Record<number, any[]> = {}, cacheGen = -1;
export function legPath(i: number) {
  if (cacheGen !== mapGen) { cache = {}; cacheGen = mapGen; } // R16: a new map, new routes
  if (cache[i]) return cache[i];
  if (anchors().legs[i].pts) return (cache[i] = anchors().legs[i].pts); // R16: a packed district stores each leg's walk
  const L = anchors().legs[i], N = anchors().waypoints, pts = [N[L.from], ...L.via.map(([x, y]) => ({ x, y })), N[L.to]];
  let out = [ctr(pts[0])];
  for (let k = 1; k < pts.length; k++) { const a = ctr(pts[k - 1]), b = ctr(pts[k]), p = findPath(a.x, a.y, b.x, b.y); out = out.concat((p || [a, b]).slice(1)); }
  return (cache[i] = out);
}
// Every tile within ESCORT_AMBUSH_RANGE of any leg: where an Escort job's field is placed ('anywhere' near the legs)
export function nearLegTiles() {
  const R = TUNE.ESCORT_AMBUSH_RANGE, seen = new Set<number>(), out = [];
  anchors().legs.forEach((_, i) => {
    const P = legPath(i);
    for (let k = 1; k < P.length; k++) {
      const a = P[k - 1], b = P[k], d = Math.hypot(b.x - a.x, b.y - a.y);
      for (let s = 0; s <= d; s += T / 2) {
        const cx = Math.floor((a.x + (b.x - a.x) * s / (d || 1)) / T), cy = Math.floor((a.y + (b.y - a.y) * s / (d || 1)) / T);
        for (let y = cy - R; y <= cy + R; y++) for (let x = cx - R; x <= cx + R; x++) {
          const key = y * W + x;
          if (seen.has(key) || Math.hypot(x - cx, y - cy) > R || !canReach(x, y) || x >= W - TUNE.EXTRACT_COLS) continue;
          seen.add(key); out.push({ x, y });
        }
      }
    }
  });
  return out;
}

// The transport, standing on node `at` (default the route's start). Fields mirror a field unit so the shared sensor,
// shell, sound and to-hit code treats it like any unit on the lance's side.
export function makeAlly(at = 'S') {
  const n = ctr(anchors().waypoints[at]);
  const a: any = { id: 'ALLY', type: 'ALLY', x: n.x, y: n.y, fx: 1, fy: 0, path: null, pi: 0, moving: false, spd: 0, creep: false,
    radarOn: false, mask: false, jamming: false, fireT: 0, dead: false, shots: 0, landed: 0, ap: 0, en: 100, enMax: 100, turnShots: 0, freeTurns: 0,
    emit: TUNE.ESCORT_EMIT, comms: TUNE.ESCORT_EMIT, armour: TUNE.ESCORT_ARMOUR, bearT: 0, sound: 0, heardBy: [], sndOff: { x: 0, y: 0 }, movedT: 0,
    node: at, leg: -1, walk: null, done: 0, // node it stands on (or last left), leg index it walks, that leg's points, tiles walked on it
    order: '', holdsLeft: TUNE.ESCORT_HOLDS, hurriesLeft: TUNE.ESCORT_HURRIES, hurrying: false, // R16: the pending order (HOLD / HURRY) and what's left
    levers: {}, passed: [] }; // R16 (Jamie): levers = fork node → the leg set ahead of time; passed = forks it has already left
  initParts(a, 'ALLY', TUNE.ESCORT_HITS);
  a.load = { passive: 0, radar: 0, ecm: 0, ammo: 0, mortar: 0 };
  const L = legsFrom(at); if (L.length === 1) startLeg(a, L[0].i); // a single onward leg: just go
  return a;
}
function startLeg(a, i: number) {
  const L = anchors().legs[i];
  if (legsFrom(L.from).length > 1) { G.mission.legs.push(L.name + '@' + L.from); if (!a.passed.includes(L.from)) a.passed.push(L.from); } // logged as it is taken
  a.leg = i; a.walk = legPath(i); a.done = 0;
}
// Holding at a junction, waiting for the player's pick?
export function allyHolding() { const a = G.ally; return !!a && !a.dead && a.leg < 0 && legsFrom(a.node).length > 1; }
// The legs the player can pick right now ([] unless the ally holds at a junction). The scripted player uses this.
export function legChoices() { return allyHolding() ? legsFrom(G.ally.node) : []; }
// R16 (Jamie: "railway style direction lever"): every fork the transport hasn't left yet, with its legs. Set a lever at
// any of them ahead of time; reaching a set fork it carries straight on (in the same move); an unset fork = it stops and waits.
export function forksAhead() {
  const a = G.ally; if (!a || a.dead || a.out) return [];
  return anchors().junctions.filter(j => !a.passed.includes(j)).map(j => ({ node: j, legs: legsFrom(j), set: a.levers[j] ?? -1 }));
}
// Pick leg i: at the fork it waits at, it sets off on it (on its next activation); at a fork ahead, it sets (or, tapped
// again, clears) the lever.
export function pickLeg(i: number) {
  const a = G.ally; if (!a || a.dead) return false;
  if (legChoices().some(l => l.i === i)) { a.levers[a.node] = i; startLeg(a, i); return true; }
  const f = forksAhead().find(f => f.legs.some(l => l.i === i)); if (!f) return false;
  if (a.levers[f.node] === i) delete a.levers[f.node]; else a.levers[f.node] = i;
  return true;
}
// Where a leg's route button sits on the map (world point): 6 tiles along it, or halfway on a short leg
export function legButton(i: number) {
  const P = legPath(i); let want = Math.min(6 * T, pathLen(P) * T / 2);
  for (let k = 1; k < P.length; k++) {
    const d = Math.hypot(P[k].x - P[k - 1].x, P[k].y - P[k - 1].y);
    if (d >= want) return { x: P[k - 1].x + (P[k].x - P[k - 1].x) * want / d, y: P[k - 1].y + (P[k].y - P[k - 1].y) * want / d };
    want -= d;
  }
  return P[P.length - 1];
}
// The ally's activation: walk ESCORT_MOVE tiles along its leg (a MOVE action), or nothing (holding / arrived).
// Returns the path to walk, or null.
// ---- R16 (Jamie): orders to the convoy, given on your turn (no AP). One pending at a time; the same order again cancels
// it and gives the use back. HOLD: it skips its next move (not while it waits at a fork). HURRY: its next move is a sprint.
export function orderBlock(kind: string) {
  const a = G.ally; if (!a || a.dead) return 'NONE';
  if (a.order === kind) return '';
  if (kind === 'HOLD' && allyHolding()) return 'FORK';
  return (kind === 'HOLD' ? a.holdsLeft : a.hurriesLeft) > 0 ? '' : 'USED';
}
export function giveOrder(kind: string) {
  const a = G.ally; if (orderBlock(kind) !== '') return false;
  const refund = (k: string) => { if (k === 'HOLD') a.holdsLeft++; if (k === 'HURRY') a.hurriesLeft++; };
  if (a.order === kind) { refund(kind); a.order = ''; return true; }
  refund(a.order);
  a.order = kind; if (kind === 'HOLD') a.holdsLeft--; else a.hurriesLeft--;
  return true;
}
// One move of the transport, worked out without changing anything: up to `budget` tiles of movement (clutter-weighted)
// along its walk; at the end of a leg, a single onward leg or a set lever carries it on with what's left; an unset fork
// (or the end of the route) stops it. Returns the path walked and where it ends up (the view's next-move marker uses it too).
export function planAllyMove(a, budget: number) {
  let pts = [{ x: a.x, y: a.y }, ...(a.walk || []).slice(1)], leg = a.leg, node = a.node, path = [{ x: a.x, y: a.y }], walk = null, stop = '';
  const taken: number[] = [];
  while (leg >= 0) {
    const left = pathCost(pts);
    if (budget < left - 1e-3) { // stops partway along this leg: keep the unwalked remainder
      const clip = clipPathCost(pts, budget), end = clip[clip.length - 1], k = clip.length - 1, full = pts[k] && pts[k].x === end.x && pts[k].y === end.y;
      path = path.concat(clip.slice(1)); walk = full ? pts.slice(k) : [end, ...pts.slice(k)]; break;
    }
    path = path.concat(pts.slice(1)); budget -= left;
    node = anchors().legs[leg].to; leg = -1;
    const L = legsFrom(node), next = L.length === 1 ? L[0].i : L.length > 1 && a.levers[node] !== undefined ? a.levers[node] : -1;
    if (next < 0) { stop = L.length > 1 ? 'FORK' : 'END'; break; }
    leg = next; taken.push(next); pts = legPath(next);
    if (budget < 0.05) { walk = pts; break; }
  }
  return { path, leg, node, walk, taken, stop };
}
// The transport's next move as the view previews it: where it will stop (and why), or null (no move).
export function allyNextStop() {
  const a = G.ally; if (!a || a.dead || a.out || a.leg < 0 && !(legsFrom(a.node).length > 1 && a.levers[a.node] !== undefined)) return null;
  if (a.order === 'HOLD') return { x: a.x, y: a.y, why: 'HOLD' };
  const p = planAllyMove(a, a.order === 'HURRY' ? TUNE.ESCORT_SPRINT : TUNE.ESCORT_MOVE), e = p.path[p.path.length - 1];
  return { x: e.x, y: e.y, why: p.stop };
}
export function allyStep() {
  const a = G.ally; if (a) a.hurrying = false;
  if (!a || a.dead || a.out) return null;
  if (a.leg < 0 && legsFrom(a.node).length > 1 && a.levers[a.node] !== undefined) startLeg(a, a.levers[a.node]); // a lever set while it waited
  if (a.leg < 0) return null;
  if (a.order === 'HOLD') { a.order = ''; G.mission.holds = (G.mission.holds || 0) + 1; return null; } // R16: it waits this round
  const hurry = a.order === 'HURRY'; if (hurry) { a.order = ''; a.hurrying = true; G.mission.hurries = (G.mission.hurries || 0) + 1; }
  // walk from where it stands (R16: clutter costs it CLUTTER_TILE_COST a tile, like everyone; set levers carry it through forks)
  const p = planAllyMove(a, hurry ? TUNE.ESCORT_SPRINT : TUNE.ESCORT_MOVE);
  for (const i of p.taken) startLeg(a, i); // logs each fork taken
  a.leg = p.leg; a.node = p.node; a.walk = p.walk;
  if (a.leg >= 0 && !a.walk) a.walk = legPath(a.leg);
  makeSound(a, hurry ? 'SPRINT' : 'NORMAL', pathHitsClutter(p.path) ? TUNE.CLUTTER_SOUND : 0);
  return p.path.length > 1 ? p.path : null;
}
