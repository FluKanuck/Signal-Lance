// Round 15 step 3: ESCORT. An unarmed faction transport (G.ally) walks the route legs from the left edge to the right.
// It holds at each junction until the player picks a leg. The field senses, hunts and fires on it like a lance mech
// (state.ts friends()); the lance's own guns never hit it (a mortar splash does). Its death fails the hunt.
import { TUNE } from '../tune.ts';
import { T, W, anchors, findPath, canReach } from './world.ts';
import { G } from './state.ts';
import { initParts } from './combat.ts';
import { clipPath, pathLen } from './turns.ts';
import { makeSound } from './sound.ts';

const ctr = (n) => ({ x: (n.x + 0.5) * T, y: (n.y + 0.5) * T });
// The legs leaving node k (index into anchors().legs)
export function legsFrom(k: string) { return anchors().legs.map((l, i) => ({ ...l, i })).filter(l => l.from === k); }
// A leg's walk, in world points: A* from node to node through its via tiles (cached per map; the route never changes)
const cache: Record<number, any[]> = {};
export function legPath(i: number) {
  if (cache[i]) return cache[i];
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
    node: at, leg: -1, walk: null, done: 0 }; // node it stands on (or last left), leg index it walks, that leg's points, tiles walked on it
  initParts(a, 'ALLY', TUNE.ESCORT_HITS);
  a.load = { passive: 0, radar: 0, ecm: 0, ammo: 0, mortar: 0 };
  const L = legsFrom(at); if (L.length === 1) startLeg(a, L[0].i); // a single onward leg: just go
  return a;
}
function startLeg(a, i: number) { a.leg = i; a.walk = legPath(i); a.done = 0; }
// Holding at a junction, waiting for the player's pick?
export function allyHolding() { const a = G.ally; return !!a && !a.dead && a.leg < 0 && legsFrom(a.node).length > 1; }
// The legs the player can pick right now ([] unless the ally holds at a junction)
export function legChoices() { return allyHolding() ? legsFrom(G.ally.node) : []; }
export function pickLeg(i: number) {
  if (!legChoices().some(l => l.i === i)) return false;
  startLeg(G.ally, i); G.mission.legs.push(anchors().legs[i].name + '@' + G.ally.node); return true;
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
export function allyStep() {
  const a = G.ally; if (!a || a.dead || a.leg < 0) return null;
  const rest = a.walk, left = pathLen(rest);
  const n = Math.min(TUNE.ESCORT_MOVE, left);
  // walk from where it stands along what's left of the leg
  const pts = [{ x: a.x, y: a.y }, ...rest.slice(1)], path = clipPath(pts, n);
  if (n >= left - 1e-3) { // reaches the leg's end node this activation
    const to = anchors().legs[a.leg].to; a.node = to; a.leg = -1; a.walk = null;
    const L = legsFrom(to); if (L.length === 1) { startLeg(a, L[0].i); a.walk = legPath(L[0].i); }
  } else {
    // keep the unwalked remainder: the clip's end point + every later point
    const end = path[path.length - 1]; let k = 1, acc = 0;
    for (; k < pts.length; k++) { const d = Math.hypot(pts[k].x - pts[k - 1].x, pts[k].y - pts[k - 1].y); if (acc + d >= n * T - 1e-6) break; acc += d; }
    a.walk = [end, ...pts.slice(k)];
  }
  makeSound(a, 'NORMAL');
  return path.length > 1 ? path : null;
}
