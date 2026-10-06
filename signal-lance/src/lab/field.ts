// Visual lab: the battlefield (three.js / WebGL). Layers, bottom up:
//  - GRID:    faint reference grid on the ground (survey-lidar style).
//  - BLOCKS:  grey massing boxes for unscanned buildings (one instanced box per solid tile); dissolve as a tile resolves.
//  - SCAN:    the detailed point cloud in TRUE COLOUR: building materials, lit windows, neon blade signs, rooftop
//             billboards, antennas, tanks, cables, street lamps, traffic lights, cars, crates, ground clutter.
//             Dots appear one by one as a tile resolves, flash as they land, drain to grey out of sight.
//  - RINGS:   ground scan rings around each ExoS (a spinning lidar's returns): blind circle underneath, wider spacing
//             with range, and shadows behind anything solid (ring dots only land on tiles the ExoS sees right now).
//  - SPINNERS: a few flying cars crossing overhead (dynamic dots, same fog rules).
// A perspective camera looks straight down, so tall things lean away from the screen centre while the ground plane
// maps to the screen exactly like the 2D game: screen = (world - cam) * zoom + centre (marks.ts lines up with it).
// Post: marks composited in, bloom, one "film" pass, then sRGB output.
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { TUNE } from '../tune.ts';
import { W, H, T, solid } from '../sim/world.ts';
import { look, FX } from './looks.ts';
import { tex as fogData } from './fog.ts';

const FOV = 40;
let renderer: THREE.WebGLRenderer, scene: THREE.Scene, cam: THREE.PerspectiveCamera, composer: EffectComposer;
let mat: THREE.ShaderMaterial, blockMat: THREE.ShaderMaterial, gridMat: THREE.ShaderMaterial, fogTex: THREE.DataTexture, marksTex: THREE.CanvasTexture;
let bloom: UnrealBloomPass, film: ShaderPass, spinPts: THREE.Points;
const rings: THREE.Points[] = [];
let spin: { geo: THREE.BufferGeometry; cars: { x: number; y: number; z: number; vx: number; vy: number; paint: number[] }[] };

// ---- the city: deterministic per map ----------------------------------------------------------------------
let seed = 7;
const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
const pick = <X,>(a: X[]) => a[Math.floor(rnd() * a.length)];
// sRGB hex → linear RGB (the shader works in linear; OutputPass converts back to sRGB, so skipping this washes colours out)
const lin = (v: number) => v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
const hex = (h: string) => { const n = parseInt(h.slice(1), 16); return [lin((n >> 16) / 255), lin(((n >> 8) & 255) / 255), lin((n & 255) / 255)]; };
const MATERIALS = ['#8a8f94', '#a39a8c', '#9a5a42', '#4f8f9a', '#5d6670', '#b8b4aa', '#6e7d5b', '#3d4248']; // concrete, sandstone, brick, teal glass, steel, render, olive, soot
const NEON = ['#ff3fa4', '#3ff0ff', '#ffb000', '#9d6bff', '#ff4b2b', '#4bff7a'];
const PAINT = ['#c8202a', '#1f4fbf', '#e8e8e8', '#f2c200', '#202226', '#2f7d4f'];

// kinds: 0 ground, 1 wall/structure, 2 roof, 3 item, 4 light (steady), 5 neon (flickers), 6 blinker (red, blinks), 7 clutter
type Block = { h: number; col: number[]; neon: number[] | null; neonZ: number; billboard: boolean };
function blocks() {
  const id = new Int32Array(W * H).fill(-1), list: Block[] = [];
  for (let i = 0; i < W * H; i++) {
    if (!solid[i] || id[i] >= 0) continue;
    const h = (1.5 + 4 * rnd()) * T;
    list.push({ h, col: hex(pick(MATERIALS)), neon: rnd() < 0.45 ? hex(pick(NEON)) : null, neonZ: (0.35 + 0.5 * rnd()) * h, billboard: rnd() < 0.3 });
    const st = [i]; id[i] = list.length - 1;
    while (st.length) {
      const j = st.pop()!, x = j % W, y = (j / W) | 0;
      for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]])
        if (nx >= 0 && ny >= 0 && nx < W && ny < H) { const k = ny * W + nx; if (solid[k] && id[k] < 0) { id[k] = id[i]; st.push(k); } }
    }
  }
  return { id, list };
}

function buildScene() {
  seed = 7;
  const P: number[] = [], C: number[] = [], A: number[] = [];
  const add = (x: number, y: number, z: number, col: number[], kind: number, ti: number, j = 0.08) => {
    const v = 1 - j + rnd() * j * 2; P.push(x, -y, z); C.push(col[0] * v, col[1] * v, col[2] * v); A.push(kind, ti, rnd());
  };
  const tileOf = (x: number, y: number) => Math.max(0, Math.min(H - 1, Math.floor(y / T))) * W + Math.max(0, Math.min(W - 1, Math.floor(x / T)));
  const box = (x: number, y: number, z0: number, w: number, d: number, h: number, col: number[], ti: number, kind = 3, step = 3) => { // dot shell of a box
    for (let z = 0; z <= h; z += step) for (let u = 0; u <= w; u += step) { add(x + u, y, z0 + z, col, kind, ti); add(x + u, y + d, z0 + z, col, kind, ti); }
    for (let z = 0; z <= h; z += step) for (let v = step; v < d; v += step) { add(x, y + v, z0 + z, col, kind, ti); add(x + w, y + v, z0 + z, col, kind, ti); }
    for (let u = step; u < w; u += step) for (let v = step; v < d; v += step) add(x + u, y + v, z0 + h, col, kind, ti, 0.15);
  };
  const pole = (x: number, y: number, z0: number, h: number, col: number[], ti: number) => { for (let z = 0; z < h; z += 3) add(x, y, z0 + z, col, 1, ti, 0.05); };
  const { id, list } = blocks(), heights = new Float32Array(W * H);
  const open = (nx: number, ny: number) => nx < 0 || ny < 0 || nx >= W || ny >= H || !solid[ny * W + nx];
  const asphalt = hex('#4a4d52'), kerb = hex('#7a7a76'), paintY = hex('#d8b400'), paintW = hex('#d0d0d0'), crateC = [hex('#b5651d'), hex('#6b7a3a'), hex('#3c5a7a')];
  const steel = hex('#55585e'), lampHead = hex('#ffcf8a'), barrier = [hex('#f2c200'), hex('#202020')], windowC = hex('#ffe3a8'), cableC = hex('#2c2e33');
  const debris = [hex('#6b5a48'), hex('#8a8a84'), hex('#3a3c40'), hex('#d8d4c8'), hex('#7a3a22')], red = hex('#ff2020'), amber = hex('#ffb000'), green = hex('#20ff70');
  const tankC = hex('#6a5444'), puddle = hex('#1c2a3a'), manhole = hex('#5a5c60'), hvac = hex('#7c8288');
  const glow = new Map<number, number[]>(); // street tile → colour of a neon sign over it (puddles pick it up)

  // ---- buildings first (so puddles can pick up sign colours)
  for (let ty = 0; ty < H; ty++) for (let tx = 0; tx < W; tx++) {
    const ti = ty * W + tx, x0 = tx * T, y0 = ty * T;
    if (!solid[ti]) continue;
    const b = list[id[ti]]; heights[ti] = b.h;
    const roofC = b.col.map(v => v * 0.7), edgeC = b.col.map(v => Math.min(1, v * 1.25));
    const faces: [boolean, number, number, number, number, number, number][] = [ // open?, a, b, outward normal
      [open(tx, ty - 1), x0, y0, x0 + T, y0, 0, -1], [open(tx, ty + 1), x0, y0 + T, x0 + T, y0 + T, 0, 1],
      [open(tx - 1, ty), x0, y0, x0, y0 + T, -1, 0], [open(tx + 1, ty), x0 + T, y0, x0 + T, y0 + T, 1, 0],
    ];
    for (const [o, ax, ay, bx, by, nx, ny] of faces) if (o) {
      const nti = tileOf(ax + (bx - ax) / 2 + nx * 4, ay + (by - ay) / 2 + ny * 4); // the street tile this face looks onto
      for (let z = 4; z < b.h; z += 8) {                                         // floors: a scan row every 8 units
        const lit = rnd() < 0.18;
        for (let k = 0; k < 8; k++) if (rnd() < 0.85) {
          const f = (k + 0.5 + (rnd() - 0.5) * 0.3) / 8, w = lit && k > 2 && k < 6;
          add(ax + (bx - ax) * f, ay + (by - ay) * f, z, w ? windowC : b.col, w ? 4 : 1, ti);
        }
      }
      if (b.neon) for (let k = 0; k < 16; k++) { const f = (k + 0.5) / 16; add(ax + (bx - ax) * f, ay + (by - ay) * f, b.neonZ, b.neon, 5, ti, 0.02); }
      for (let k = 0; k < 12; k++) { const f = k / 12; add(ax + (bx - ax) * f, ay + (by - ay) * f, b.h, edgeC, 1, ti); } // roof edge
      for (let k = 0; k < 8; k++) { const f = (k + 0.5) / 8; add(ax + (bx - ax) * f + nx * 2, ay + (by - ay) * f + ny * 2, 0.5, kerb, 0, nti, 0.1); } // kerb
      // neon blade sign: a vertical panel sticking out from the wall over the street, with stacked "glyphs"
      if (rnd() < 0.09 && b.h > 60) {
        const c = hex(pick(NEON)), mx = ax + (bx - ax) * 0.5, my = ay + (by - ay) * 0.5, z0 = 14 + rnd() * (b.h - 60), hgt = 30 + rnd() * 24, out = 12;
        for (let z = 0; z <= hgt; z += 2.5) { add(mx + nx * 2, my + ny * 2, z0 + z, c, 5, nti, 0.02); add(mx + nx * out, my + ny * out, z0 + z, c, 5, nti, 0.02); }
        for (let u = 2; u <= out; u += 2.5) { add(mx + nx * u, my + ny * u, z0, c, 5, nti, 0.02); add(mx + nx * u, my + ny * u, z0 + hgt, c, 5, nti, 0.02); }
        for (let g = 0; g < Math.floor(hgt / 8); g++) for (let gx = 0; gx < 3; gx++) for (let gz = 0; gz < 3; gz++) if (rnd() < 0.5)
          add(mx + nx * (4 + gx * 3), my + ny * (4 + gx * 3), z0 + 3 + g * 8 + gz * 2, c, 5, nti, 0.05);
        glow.set(nti, c);
      }
      // overhead cable across the street to the facing wall (some strung with lights)
      if (rnd() < 0.05) {
        let d = 1; while (d < 5 && open(tx + nx * d, ty + ny * d)) d++;
        if (d < 5 && d > 1) {
          const z1 = 20 + rnd() * Math.max(10, Math.min(60, b.h - 20)), span = (d - 1) * T, lights = rnd() < 0.5;
          const mx = ax + (bx - ax) * (0.2 + rnd() * 0.6), my = ay + (by - ay) * (0.2 + rnd() * 0.6);
          for (let s = 0; s <= span; s += 2) {
            const f = s / span, x = mx + nx * s, y = my + ny * s, z = z1 - Math.sin(f * Math.PI) * 10, bulb = lights && s % 8 < 2;
            add(x, y, z, bulb ? hex(pick(['#ffd28a', '#ff8ad0', '#8af0ff'])) : cableC, bulb ? 4 : 1, tileOf(x, y), 0.05);
          }
        }
      }
    }
    for (let k = 0; k < 7; k++) add(x0 + rnd() * T, y0 + rnd() * T, b.h, roofC, 2, ti, 0.15);
    // roof kit: HVAC box, water tank, antenna with a red blinker, the block's billboard
    const r = rnd();
    if (r < 0.07) box(x0 + 8, y0 + 8, b.h, 12, 12, 8, hvac, ti);
    else if (r < 0.11) { for (let z = 0; z < 16; z += 2.5) for (let a = 0; a < 14; a++) add(x0 + 16 + Math.cos(a / 14 * 6.28) * 7, y0 + 16 + Math.sin(a / 14 * 6.28) * 7, b.h + 6 + z, tankC, 3, ti); pole(x0 + 12, y0 + 12, b.h, 6, steel, ti); }
    else if (r < 0.16) { pole(x0 + 16, y0 + 16, b.h, 50, steel, ti); for (let k = 0; k < 5; k++) add(x0 + 16 + (rnd() - 0.5) * 3, y0 + 16 + (rnd() - 0.5) * 3, b.h + 51, red, 6, ti, 0.02); }
    if (b.billboard && (open(tx, ty - 1) || open(tx, ty + 1)) && rnd() < 0.35) { // billboard on a street-facing roof edge
      b.billboard = false;
      const c1 = hex(pick(NEON)), c2 = hex(pick(NEON)), yy = open(tx, ty - 1) ? y0 + 2 : y0 + T - 2, bw = T * 1.6, bh = 26;
      for (let u = 0; u <= bw; u += 2.2) for (let z = 0; z <= bh; z += 2.2) {
        const f = u / bw, edge = u < 2 || u > bw - 2.2 || z < 2 || z > bh - 2.2, c = edge ? c1 : [0, 1, 2].map(i => c1[i] * (1 - f) + c2[i] * f);
        if (edge || rnd() < 0.55) add(x0 + u - bw * 0.2, yy, b.h + 10 + z, c, 5, ti, 0.04);
      }
      pole(x0 + 4, yy, b.h, 10, steel, ti); pole(x0 + bw - 12, yy, b.h, 10, steel, ti);
    }
  }
  // ---- streets: asphalt, lane paint, clutter, items, infrastructure
  for (let ty = 0; ty < H; ty++) for (let tx = 0; tx < W; tx++) {
    const ti = ty * W + tx, x0 = tx * T, y0 = ty * T;
    if (solid[ti]) continue;
    for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) if (rnd() < 0.5)
      add(x0 + (a + 0.5 + (rnd() - 0.5) * 0.5) * T / 3, y0 + (b + 0.5 + (rnd() - 0.5) * 0.5) * T / 3, 0, asphalt, 0, ti, 0.25);
    const horiz = !open(tx, ty - 1) && !open(tx, ty + 1), vert = !open(tx - 1, ty) && !open(tx + 1, ty);
    const nOpen = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) => open(tx + dx, ty + dy)).length;
    if (horiz && tx % 2 === 0) for (let k = 0; k < 5; k++) add(x0 + 4 + k * 3, y0 + T / 2, 0, paintY, 0, ti, 0.05);
    if (vert && ty % 2 === 0) for (let k = 0; k < 5; k++) add(x0 + T / 2, y0 + 4 + k * 3, 0, paintW, 0, ti, 0.05);
    // clutter: loose debris everywhere, sometimes a rubble heap, a puddle (tinted by neon overhead), a manhole
    for (let k = 0, n = Math.floor(rnd() * 5); k < n; k++) add(x0 + rnd() * T, y0 + rnd() * T, rnd() * 1.5, pick(debris), 7, ti, 0.2);
    const c = rnd();
    if (c < 0.06) { const cx = x0 + 6 + rnd() * 20, cy = y0 + 6 + rnd() * 20; for (let k = 0; k < 26; k++) { const a = rnd() * 6.28, r = rnd() * 7; add(cx + Math.cos(a) * r, cy + Math.sin(a) * r, (7 - r) * 0.7 * rnd(), pick(debris), 7, ti, 0.2); } }
    else if (c < 0.14) {
      const tint = glow.get(ti) || glow.get(ti - 1) || glow.get(ti + 1) || glow.get(ti - W) || glow.get(ti + W);
      const cx = x0 + 8 + rnd() * 16, cy = y0 + 8 + rnd() * 16, rx = 5 + rnd() * 6, ry = 3 + rnd() * 4;
      for (let k = 0; k < 22; k++) { const a = rnd() * 6.28, r = Math.sqrt(rnd()), lit = tint && rnd() < 0.6; add(cx + Math.cos(a) * rx * r, cy + Math.sin(a) * ry * r, 0.2, lit ? tint!.map(v => v * 0.6) : puddle, lit ? 5 : 7, ti, 0.2); }
    } else if (c < 0.17) { for (let a = 0; a < 12; a++) add(x0 + 16 + Math.cos(a / 12 * 6.28) * 5, y0 + 16 + Math.sin(a / 12 * 6.28) * 5, 0.3, manhole, 7, ti, 0.05); }
    // items + infrastructure
    const r = rnd();
    if (r < 0.05) { const hz = rnd() < 0.5; box(x0 + 4, y0 + 9, 0, hz ? 24 : 12, hz ? 12 : 24, 9, hex(pick(PAINT)), ti); }                    // parked car
    else if (r < 0.08) { box(x0 + 6, y0 + 6, 0, 9, 9, 9, pick(crateC), ti); if (rnd() < 0.6) box(x0 + 17, y0 + 12, 0, 9, 9, 9, pick(crateC), ti); } // crates
    else if (r < 0.10) { for (let u = 0; u <= 27; u += 3) for (let z = 0; z <= 6; z += 3) add(x0 + 2 + u, y0 + T / 2, z, barrier[(u / 6 | 0) % 2], 3, ti); } // barrier
    else if (r < 0.16 && nOpen < 4 && (!open(tx, ty - 1) || !open(tx - 1, ty))) {                                             // street lamp by a wall
      pole(x0 + 6, y0 + 6, 0, 60, steel, ti);
      for (let k = 0; k < 10; k++) add(x0 + 6 + (rnd() - 0.5) * 6, y0 + 6 + (rnd() - 0.5) * 6, 60 + rnd() * 3, lampHead, 4, ti, 0.05);
      for (let k = 0; k < 16; k++) { const a = rnd() * 6.28, rr = rnd() * 14; add(x0 + 6 + Math.cos(a) * rr, y0 + 6 + Math.sin(a) * rr, 0.3, lampHead.map(v => v * 0.25), 4, ti, 0.2); } // light pool
    }
    if (nOpen >= 3 && rnd() < 0.35) {                                                                                          // traffic light at a junction
      pole(x0 + 3, y0 + 3, 0, 34, steel, ti); box(x0 + 1, y0 + 1, 34, 4, 4, 10, steel, ti, 1, 2);
      const lc = pick([red, amber, green]); for (let k = 0; k < 4; k++) add(x0 + 3 + (rnd() - 0.5) * 2, y0 + 3 + (rnd() - 0.5) * 2, 40 + rnd() * 2, lc, 4, ti, 0.02);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3));
  g.setAttribute('meta', new THREE.Float32BufferAttribute(A, 3));
  return { geo: g, heights };
}

// ---- spinners: dot models rebuilt every frame (positions + the tile under them, for the fog)
const SPIN_PTS = 70;
function makeSpinners() {
  const cars = [0, 1, 2].map(i => ({ x: rnd() * W * T, y: (4 + i * 8 + rnd() * 3) * T, z: 160 + i * 35, vx: (i % 2 ? -1 : 1) * (70 + rnd() * 50), vy: (rnd() - 0.5) * 20, paint: hex(pick(['#2a2d33', '#3a4a5a', '#5a2a2a'])) }));
  const geo = new THREE.BufferGeometry(), n = cars.length * SPIN_PTS;
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  geo.setAttribute('meta', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  return { geo, cars };
}
const SP_HEAD = hex('#e8f4ff'), SP_TAIL = hex('#ff2030'), SP_UNDER = hex('#3ff0ff');
function updateSpinners(dt: number) {
  const P = spin.geo.attributes.position.array as Float32Array, C = spin.geo.attributes.color.array as Float32Array, A = spin.geo.attributes.meta.array as Float32Array;
  let i = 0;
  for (const c of spin.cars) {
    c.x += c.vx * dt; c.y += c.vy * dt;
    if (c.x > W * T + 200) c.x = -200; if (c.x < -200) c.x = W * T + 200; if (c.y < 0 || c.y > H * T) c.vy = -c.vy;
    const dir = Math.sign(c.vx), ti = Math.max(0, Math.min(H - 1, Math.floor(c.y / T))) * W + Math.max(0, Math.min(W - 1, Math.floor(c.x / T)));
    for (let k = 0; k < SPIN_PTS; k++, i++) {
      let x: number, y: number, z: number, col: number[], kind = 3;
      if (k < 48) { const u = (k % 8) / 7 - 0.5, v = ((k / 8) | 0) / 5 - 0.5; x = u * 22; y = v * 10; z = Math.abs(v) < 0.3 && Math.abs(u) < 0.3 ? 4 : 0; col = c.paint; } // body + cabin
      else if (k < 56) { x = 11; y = ((k - 48) / 7 - 0.5) * 8; z = 1; col = SP_HEAD; kind = 4; }
      else if (k < 62) { x = -11; y = ((k - 56) / 5 - 0.5) * 8; z = 1; col = SP_TAIL; kind = 4; }
      else { const a = (k - 62) / 8 * 6.28; x = Math.cos(a) * 8; y = Math.sin(a) * 4; z = -2; col = SP_UNDER; kind = 5; }
      P[i * 3] = c.x + x * dir; P[i * 3 + 1] = -(c.y + y); P[i * 3 + 2] = c.z + z;
      C[i * 3] = col[0]; C[i * 3 + 1] = col[1]; C[i * 3 + 2] = col[2]; A[i * 3] = kind; A[i * 3 + 1] = ti; A[i * 3 + 2] = 0.01;
    }
  }
  spin.geo.attributes.position.needsUpdate = spin.geo.attributes.color.needsUpdate = spin.geo.attributes.meta.needsUpdate = true;
}

// ---- ring geometry: one polar pattern, drawn once per ExoS (uniform centre). Dead zone under the sensor (radius
// `dead` tiles), rings tight at the centre and opening up with range (gap + k * grow), out to max visual range
// (EYES_RANGE); ~3 units between dots along a ring. Each dot carries a random id so every pass of the spinning head
// can drop / jitter it differently (fresh returns). Rebuilt when the dead / gap / grow knobs change.
function ringGeo(dead: number, gap: number, grow: number) {
  const P: number[] = [], R: number[] = [], I: number[] = [], rmax = TUNE.EYES_RANGE * T;
  for (let k = 0, r = Math.max(2, dead * T); r < rmax; k++, r += Math.max(1, gap + k * grow)) {
    const n = Math.ceil(6.2832 * r / 3);
    for (let i = 0; i < n; i++) { const a = (i + (k % 2) * 0.5) / n * 6.2832; P.push(Math.cos(a) * r, Math.sin(a) * r, 0.6); R.push(r / rmax); I.push(Math.random() * 1000); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('rr', new THREE.Float32BufferAttribute(R, 1));
  g.setAttribute('rid', new THREE.Float32BufferAttribute(I, 1));
  return g;
}
let ringKey = '';

const FOG_GLSL = /* glsl */`
  uniform sampler2D fogTex; uniform vec2 grid; uniform float useFog;
  vec3 fogTile(vec2 t) { return texture2D(fogTex, (t + 0.5) / grid).rgb; } // (live, reveal, solid)
  vec2 fogAt(float ti) { // (live, reveal)
    if (useFog < 0.5) return vec2(1.0);
    return fogTile(vec2(mod(ti, grid.x), floor(ti / grid.x))).rg;
  }`;
const VERT = /* glsl */`
  ${FOG_GLSL}
  attribute vec3 meta;            // kind, tile index, random seed
  attribute vec3 color;
  uniform float size, depth, time, sweep, trueMix, greyDim, heightTint, neon, clutter;
  uniform vec3 cInk, cFog, rampLo, rampMid, rampHi;
  uniform vec4 eyes[4];           // ExoS x, y (world), alive
  varying vec3 vCol; varying float vA;
  float h1(float n) { return fract(sin(n) * 43758.5453); }
  void main() {
    vec3 p = position; p.z *= depth;
    float kind = meta.x;
    vec2 f = fogAt(meta.y); float live = f.x, rev = f.y;
    // resolve: this dot exists once the tile's reveal passes its own threshold; flash white just after it lands
    float th = meta.z * 0.9 + 0.02, on = step(th, rev);
    float flash = on * (1.0 - smoothstep(0.0, 0.18, rev - th)) * step(rev, 0.999);
    // true colour, nudged by the look's ink and by the lidar height ramp (street → rooftops)
    float lum = dot(color, vec3(0.299, 0.587, 0.114));
    vec3 tc = mix(cInk * lum * 2.0, color, trueMix);
    float hz = clamp(position.z / 180.0, 0.0, 1.0);
    vec3 ramp = hz < 0.5 ? mix(rampLo, rampMid, hz * 2.0) : mix(rampMid, rampHi, hz * 2.0 - 1.0);
    bool emissive = kind > 3.5 && kind < 6.5;
    if (!emissive) tc = mix(tc, ramp * (0.4 + lum * 1.2), heightTint);
    vec3 grey = mix(cFog, vec3(lum), 0.7) * greyDim;
    vec3 col = mix(grey, tc, live);
    if (kind > 4.5 && kind < 5.5) col *= step(0.05, h1(floor(time * 11.0) + meta.z * 97.0)) * (0.85 + 0.15 * sin(time * 2.0 + meta.z * 9.0)); // neon stutter
    if (kind > 5.5 && kind < 6.5) col *= 0.15 + 0.85 * step(fract(time * 0.8 + meta.y * 0.137), 0.18);                                   // blinker
    if (emissive) col *= 1.0 + neon * live;                   // glows (bloom picks them up) only while seen
    float s = 0.0;                                            // lidar sweep pulse from each ExoS
    for (int i = 0; i < 4; i++) if (eyes[i].z > 0.5) {
      float d = distance(position.xy, vec2(eyes[i].x, -eyes[i].y)), r = mod(time * 260.0 + float(i) * 190.0, 420.0);
      s = max(s, smoothstep(26.0, 0.0, abs(d - r)) * (1.0 - r / 420.0));
    }
    vCol = col * (0.9 + 0.1 * sin(time * (3.0 + meta.z * 7.0) + meta.z * 40.0)) + tc * s * sweep * live + vec3(flash);
    vA = on * (kind < 0.5 ? 0.7 : kind > 6.5 ? clutter : 1.0);
    gl_PointSize = on * size * (kind < 0.5 || kind > 6.5 ? 0.85 : emissive ? 1.3 : 1.0) * (1.0 + 0.6 * s * sweep + flash);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }`;
const FRAG = /* glsl */`
  varying vec3 vCol; varying float vA;
  void main() { if (vA <= 0.0) discard; vec2 c = gl_PointCoord - 0.5; float d = length(c); if (d > 0.5) discard; gl_FragColor = vec4(vCol, vA * smoothstep(0.5, 0.2, d)); }`;

// Rings follow the spinning head: `behind` = how far round the head has gone since it last swept this dot (0 = just
// now, 1 = about to sweep again). A dot flashes as the head crosses it, then fades to `persist`; each revolution
// re-rolls its dropout and a small radial jitter (hashed on dot id + revolution), so every pass lays down fresh dots.
const RVERT = /* glsl */`
  ${FOG_GLSL}
  attribute float rr;             // ring radius / max range
  attribute float rid;            // random id per dot
  uniform vec2 centre; uniform float size, amt, spinAmt, time, phase, rate, persist, drop, fadePow, gap;
  uniform vec3 cNear, cFar;
  varying vec3 vCol; varying float vA;
  float hh(float n) { return fract(sin(n) * 43758.5453); }
  void main() {
    float a = atan(position.y, position.x);
    float turn = time * rate * 6.2832 + phase - a;                  // head angle relative to this dot
    float rev = floor(turn / 6.2832), behind = fract(turn / 6.2832);
    float keep = step(drop, hh(rid + rev * 17.13));                  // this pass's dropout
    float jit = (hh(rid * 1.37 + rev * 3.1) - 0.5) * gap * 0.4;      // this pass's radial jitter
    vec2 w = centre + normalize(position.xy) * (length(position.xy) + jit); // world (sim coords, y down)
    vec3 ft = fogTile(floor(w / ${T.toFixed(1)}));
    float inMap = step(0.0, w.x) * step(0.0, w.y) * step(w.x, grid.x * ${T.toFixed(1)}) * step(w.y, grid.y * ${T.toFixed(1)});
    float ok = (useFog < 0.5 ? 1.0 : step(0.05, ft.r)) * (1.0 - step(0.5, ft.b)) * inMap * keep; // shadows: tiles seen now, never inside walls
    float hot = 1.0 - smoothstep(0.0, 0.04, behind);                 // just swept: flash
    float life = mix(1.0, persist, smoothstep(0.0, 1.0, behind));     // then settle to persist until the next pass
    vCol = mix(cNear, cFar, rr) * life * amt + vec3(hot * spinAmt);
    vA = ok * pow(1.0 - rr, fadePow) * life * (useFog < 0.5 ? 1.0 : ft.r); // slow fade out to max visual range
    gl_PointSize = ok * size * (1.0 + hot * 0.8);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(w.x, -w.y, position.z, 1.0);
  }`;

// Grey massing blocks: one instanced box per solid tile; dissolve (3-unit noise cells) as the tile resolves
const BVERT = /* glsl */`
  ${FOG_GLSL}
  attribute float tile;
  uniform float depth;
  varying float vRev, vShade; varying vec2 vUv; varying vec3 vW;
  void main() {
    vRev = fogAt(tile).y; vUv = uv;
    vShade = normal.z > 0.5 ? 1.0 : 0.62 + 0.18 * normal.x;   // flat-shaded: top light, sides darker
    vec4 w = instanceMatrix * vec4(position, 1.0); w.z *= depth; vW = w.xyz;
    gl_Position = projectionMatrix * modelViewMatrix * w;
  }`;
const BFRAG = /* glsl */`
  uniform vec3 cBlock, cEdge;
  varying float vRev, vShade; varying vec2 vUv; varying vec3 vW;
  float h(vec3 p) { return fract(sin(dot(floor(p / 3.0), vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
  void main() {
    if (h(vW) < vRev * 1.15) discard;                         // dissolve into the scan
    float e = min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y));
    gl_FragColor = vec4(mix(cEdge, cBlock * vShade, smoothstep(0.0, 0.05, e)), 1.0);
  }`;
// Reference grid: thin lines every 2 tiles, stronger every 8 (anti-aliased with fwidth)
const GVERT = 'varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }';
const GFRAG = /* glsl */`
  uniform vec3 cInk; uniform float amt; varying vec2 vP;
  float line(float s) { vec2 q = vP / s; vec2 g = abs(fract(q - 0.5) - 0.5) / fwidth(q); return 1.0 - min(min(g.x, g.y), 1.0); }
  void main() { float a = max(line(${(T * 2).toFixed(1)}) * 0.35, line(${(T * 8).toFixed(1)})) * amt; if (a < 0.01) discard; gl_FragColor = vec4(cInk, a); }`;

const MARKS = {
  uniforms: { tDiffuse: { value: null }, tMarks: { value: null } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse, tMarks; varying vec2 vUv;
    void main(){ vec4 a = texture2D(tDiffuse, vUv), m = texture2D(tMarks, vUv); gl_FragColor = vec4(a.rgb * (1.0 - m.a) + m.rgb, 1.0); }`,
};
const FILM = {
  uniforms: { tDiffuse: { value: null }, time: { value: 0 }, res: { value: new THREE.Vector2() },
    grain: { value: 0 }, scan: { value: 0 }, vig: { value: 0 }, aberr: { value: 0 }, haze: { value: new THREE.Color() }, hazeAmt: { value: 0 } },
  vertexShader: MARKS.vertexShader,
  fragmentShader: `uniform sampler2D tDiffuse; uniform float time, grain, scan, vig, aberr, hazeAmt; uniform vec2 res; uniform vec3 haze; varying vec2 vUv;
    float rnd(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233)) + time * 61.7) * 43758.5453); }
    void main(){
      vec2 c = vUv - 0.5; vec2 o = c * aberr * 0.004;
      vec3 col = vec3(texture2D(tDiffuse, vUv + o).r, texture2D(tDiffuse, vUv).g, texture2D(tDiffuse, vUv - o).b);
      col = pow(max(col, 0.0), vec3(1.0 / 2.2));   // to display space: grain/haze added in linear would be blown up by the sRGB curve
      col += pow(haze, vec3(1.0 / 2.2)) * hazeAmt * (0.35 + 0.65 * smoothstep(0.9, -0.2, vUv.y)) * 0.5; // dust lit from below, like 2049
      col *= 1.0 - scan * 0.5 * (0.5 + 0.5 * sin(vUv.y * res.y * 1.5708));                // scanlines every ~4 px
      col += (rnd(vUv * res) - 0.5) * grain;                                               // film grain
      col *= 1.0 - vig * smoothstep(0.25, 0.85, length(c * vec2(res.x / res.y, 1.0)) * 0.9);
      gl_FragColor = vec4(pow(max(col, 0.0), vec3(2.2)), 1.0); // back to linear for OutputPass
    }`,
};

export function initField(canvas: HTMLCanvasElement, marks: HTMLCanvasElement) {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  scene = new THREE.Scene();
  cam = new THREE.PerspectiveCamera(FOV, 1, 1, 20000);
  fogTex = new THREE.DataTexture(fogData, W, H, THREE.RGBAFormat, THREE.UnsignedByteType);
  fogTex.magFilter = fogTex.minFilter = THREE.NearestFilter; fogTex.needsUpdate = true;
  const useFog = { value: 1 }, fogU = () => ({ fogTex: { value: fogTex }, grid: { value: new THREE.Vector2(W, H) }, useFog });
  const C = () => ({ value: new THREE.Color() });
  const { geo, heights } = buildScene();
  mat = new THREE.ShaderMaterial({
    vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false,
    uniforms: { ...fogU(), size: { value: 2 }, depth: { value: 0.5 }, time: { value: 0 }, sweep: { value: 0 }, trueMix: { value: 0.85 }, greyDim: { value: 0.6 },
      heightTint: { value: 0 }, neon: { value: 1.6 }, clutter: { value: 1 },
      cInk: C(), cFog: C(), rampLo: C(), rampMid: C(), rampHi: C(), eyes: { value: [0, 1, 2, 3].map(() => new THREE.Vector4()) } },
  });
  // grid
  gridMat = new THREE.ShaderMaterial({ vertexShader: GVERT, fragmentShader: GFRAG, transparent: true, depthWrite: false, uniforms: { cInk: C(), amt: { value: 0 } } });
  const gp = new THREE.Mesh(new THREE.PlaneGeometry(W * T, H * T), gridMat); gp.position.set(W * T / 2, -H * T / 2, 0); gp.renderOrder = 0; scene.add(gp);
  // grey blocks: unit box with its origin at the tile's top-left ground corner, scaled per tile
  const tiles: number[] = []; for (let i = 0; i < W * H; i++) if (solid[i]) tiles.push(i);
  const bg = new THREE.BoxGeometry(1, 1, 1); bg.translate(0.5, -0.5, 0.5);
  const tileAttr = new Float32Array(tiles.length); tiles.forEach((ti, k) => { tileAttr[k] = ti; });
  bg.setAttribute('tile', new THREE.InstancedBufferAttribute(tileAttr, 1));
  blockMat = new THREE.ShaderMaterial({ vertexShader: BVERT, fragmentShader: BFRAG, uniforms: { ...fogU(), depth: mat.uniforms.depth, cBlock: C(), cEdge: C() } });
  const im = new THREE.InstancedMesh(bg, blockMat, tiles.length), M = new THREE.Matrix4();
  tiles.forEach((ti, k) => { M.makeScale(T, T, heights[ti]).setPosition((ti % W) * T, -((ti / W) | 0) * T, 0); im.setMatrixAt(k, M); });
  im.frustumCulled = false; im.renderOrder = 1; scene.add(im);
  const pts = new THREE.Points(geo, mat); pts.frustumCulled = false; pts.renderOrder = 2; scene.add(pts);
  // rings, one per possible ExoS (1–4)
  const rg = ringGeo(look.scanDead, look.scanGap, look.scanGrow); ringKey = [look.scanDead, look.scanGap, look.scanGrow].join();
  for (let i = 0; i < 4; i++) {
    const rm = new THREE.ShaderMaterial({ vertexShader: RVERT, fragmentShader: FRAG, transparent: true, depthWrite: false,
      uniforms: { ...fogU(), centre: { value: new THREE.Vector2() }, size: { value: 1.5 }, amt: { value: 1 }, spinAmt: { value: 0.5 }, time: mat.uniforms.time, phase: { value: i * 2.1 },
        rate: { value: 0.5 }, persist: { value: 0.3 }, drop: { value: 0.2 }, fadePow: { value: 1.5 }, gap: { value: 3 }, cNear: C(), cFar: C() } });
    const r = new THREE.Points(rg, rm); r.frustumCulled = false; r.renderOrder = 2; rings.push(r); scene.add(r);
  }
  // spinners
  spin = makeSpinners();
  spinPts = new THREE.Points(spin.geo, mat); spinPts.frustumCulled = false; spinPts.renderOrder = 3; scene.add(spinPts);
  marksTex = new THREE.CanvasTexture(marks); marksTex.minFilter = THREE.LinearFilter; marksTex.colorSpace = THREE.SRGBColorSpace; marksTex.premultiplyAlpha = true;
  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, cam));
  const marksPass = new ShaderPass(MARKS); marksPass.uniforms.tMarks.value = marksTex; composer.addPass(marksPass);
  bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.5, 0.6, 0.2); composer.addPass(bloom);
  film = new ShaderPass(FILM); composer.addPass(film);    // works in display space internally (see FILM)
  composer.addPass(new OutputPass());                    // last: the only linear → sRGB encode (a pass after it gets encoded twice)
}

export function resizeField(w: number, h: number, dpr: number) {
  renderer.setPixelRatio(dpr); renderer.setSize(w, h, false); composer.setPixelRatio(dpr); composer.setSize(w, h);
  cam.aspect = w / h; cam.updateProjectionMatrix();
  film.uniforms.res.value.set(w * dpr, h * dpr);
}

// camX/camY = world point at screen centre, zoom = screen px per world unit (same meaning as the 2D game)
export function renderField(t: number, dt: number, camX: number, camY: number, zoom: number, vh: number, lance: any[], dpr: number) {
  const L = look, u = mat.uniforms;
  const dist = (vh / 2) / (zoom * Math.tan(FOV * Math.PI / 360)); // ground plane at exactly `zoom` px per unit
  cam.position.set(camX, -camY, dist); cam.lookAt(camX, -camY, 0);
  renderer.setClearColor(L.bg);
  const size = L.dotSize * dpr * Math.max(0.8, zoom * 1.4);
  u.time.value = t; u.size.value = size; u.depth.value = Math.max(0.02, L.depth);
  u.useFog.value = FX.fog ? 1 : 0; u.sweep.value = FX.sweep ? L.sweep : 0; u.trueMix.value = L.trueMix; u.greyDim.value = L.greyDim;
  u.heightTint.value = L.heightTint; u.neon.value = L.neon; u.clutter.value = L.clutter;
  u.cInk.value.set(L.ink); u.cFog.value.set(L.fog); u.rampLo.value.set(L.rampLo); u.rampMid.value.set(L.rampMid); u.rampHi.value.set(L.rampHi);
  blockMat.uniforms.cBlock.value.set(L.block); blockMat.uniforms.cEdge.value.set(L.blockEdge);
  gridMat.uniforms.cInk.value.set(L.ink); gridMat.uniforms.amt.value = FX.grid ? L.grid : 0;
  const key = [L.scanDead, L.scanGap, L.scanGrow].join();
  if (key !== ringKey) { ringKey = key; const g = ringGeo(L.scanDead, L.scanGap, L.scanGrow), old = rings[0].geometry; for (const r of rings) r.geometry = g; old.dispose(); }
  for (let i = 0; i < 4; i++) {
    const m = lance[i], r = rings[i], ru = (r.material as THREE.ShaderMaterial).uniforms;
    u.eyes.value[i].set(m ? m.x : 0, m ? m.y : 0, m && !m.dead ? 1 : 0, 0);
    r.visible = !!m && !m.dead && FX.rings && L.scanAmt > 0;
    if (r.visible) { ru.centre.value.set(m.x, m.y); ru.size.value = size * 0.85; ru.amt.value = L.scanAmt; ru.spinAmt.value = L.scanSpin; ru.cNear.value.set(L.scanNear); ru.cFar.value.set(L.scanFar);
      ru.rate.value = L.scanRate; ru.persist.value = L.scanPersist; ru.drop.value = L.scanDrop; ru.fadePow.value = L.scanFade; ru.gap.value = L.scanGap; }
  }
  spinPts.visible = FX.spinners; if (FX.spinners) updateSpinners(dt);
  fogTex.needsUpdate = true; marksTex.needsUpdate = true;
  bloom.enabled = FX.bloom && L.bloom > 0; bloom.strength = L.bloom;
  const f = film.uniforms;
  f.time.value = t; f.grain.value = FX.grain ? L.grain : 0; f.scan.value = FX.scan ? L.scan : 0; f.vig.value = FX.vignette ? L.vignette : 0;
  f.aberr.value = FX.aberr ? L.aberr : 0; f.haze.value.set(L.haze); f.hazeAmt.value = FX.haze ? L.hazeAmt : 0;
  composer.render();
}
