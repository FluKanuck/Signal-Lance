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
import { tex as fogData, scan as scanData, first as firstData } from './fog.ts';

const FOV = 40;
const clearCol = new THREE.Color();
let renderer: THREE.WebGLRenderer, scene: THREE.Scene, cam: THREE.PerspectiveCamera, composer: EffectComposer;
let mat: THREE.ShaderMaterial, blockMat: THREE.ShaderMaterial, gridMat: THREE.ShaderMaterial, fogTex: THREE.DataTexture, marksTex: THREE.CanvasTexture;
let bloom: UnrealBloomPass, film: ShaderPass, spinPts: THREE.Points, scanTex: THREE.DataTexture, firstTex: THREE.DataTexture;
const WALL_ROW = 2.5, WALL_COLS = 12, WALL_COL = T / WALL_COLS; // wall dot grid: the finest a wall can resolve to
const GROUND_STEP = T / 12;                                      // ground dot grid spacing
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

// Every static dot here is a possible lidar return (lid = 1): the shader only shows it if a beam from its tile's
// closest scan would hit it (lidarOK). Nothing "resolves" wholesale: the grey blocks stay, the scan lands on them.
// Roof tops are left out (a street-level lidar can't see them); things standing above a roof (billboards, antennas,
// tanks) are kept, since upward beams can reach them.
function buildScene() {
  seed = 7;
  const P: number[] = [], C: number[] = [], A: number[] = [], LID: number[] = [];
  const add = (x: number, y: number, z: number, col: number[], kind: number, ti: number, j = 0.08, lid = 1) => {
    const v = 1 - j + rnd() * j * 2; P.push(x, -y, z); C.push(col[0] * v, col[1] * v, col[2] * v); A.push(kind, ti, rnd()); LID.push(lid);
  };
  const tileOf = (x: number, y: number) => Math.max(0, Math.min(H - 1, Math.floor(y / T))) * W + Math.max(0, Math.min(W - 1, Math.floor(x / T)));
  const box = (x: number, y: number, z0: number, w: number, d: number, h: number, col: number[], ti: number, kind = 3, step = 2.5) => { // dot shell of a box
    for (let z = 0; z <= h; z += step) for (let u = 0; u <= w; u += step) { add(x + u, y, z0 + z, col, kind, ti); add(x + u, y + d, z0 + z, col, kind, ti); }
    for (let z = 0; z <= h; z += step) for (let v = step; v < d; v += step) { add(x, y + v, z0 + z, col, kind, ti); add(x + w, y + v, z0 + z, col, kind, ti); }
    for (let u = step; u < w; u += step) for (let v = step; v < d; v += step) add(x + u, y + v, z0 + h, col, kind, ti, 0.15);
  };
  const pole = (x: number, y: number, z0: number, h: number, col: number[], ti: number) => { for (let z = 0; z < h; z += 2.5) add(x, y, z0 + z, col, 1, ti, 0.05); };
  const { id, list } = blocks(), heights = new Float32Array(W * H);
  const open = (nx: number, ny: number) => nx < 0 || ny < 0 || nx >= W || ny >= H || !solid[ny * W + nx];
  const asphalt = hex('#4a4d52'), paintY = hex('#d8b400'), paintW = hex('#d0d0d0'), crateC = [hex('#b5651d'), hex('#6b7a3a'), hex('#3c5a7a')];
  const steel = hex('#55585e'), lampHead = hex('#ffcf8a'), barrier = [hex('#f2c200'), hex('#202020')], windowC = hex('#ffe3a8'), cableC = hex('#2c2e33');
  const debris = [hex('#6b5a48'), hex('#8a8a84'), hex('#3a3c40'), hex('#d8d4c8'), hex('#7a3a22')], red = hex('#ff2020'), amber = hex('#ffb000'), green = hex('#20ff70');
  const tankC = hex('#6a5444'), puddleC = hex('#1c2a3a'), manholeC = hex('#5a5c60'), hvac = hex('#7c8288');
  const glow = new Map<number, number[]>(); // street tile → colour of a neon sign over it (puddles pick it up)
  const lamps = new Map<number, [number, number]>(); // street tile → lamp position (its light pool tints the ground grid)
  const OUT = 0.6; // wall dots sit this far in front of the face, so the grey block never hides them

  // ---- buildings first (so puddles can pick up sign colours)
  for (let ty = 0; ty < H; ty++) for (let tx = 0; tx < W; tx++) {
    const ti = ty * W + tx, x0 = tx * T, y0 = ty * T;
    if (!solid[ti]) continue;
    const b = list[id[ti]]; heights[ti] = b.h;
    const faces: [boolean, number, number, number, number, number, number][] = [ // open?, a, b, outward normal
      [open(tx, ty - 1), x0, y0, x0 + T, y0, 0, -1], [open(tx, ty + 1), x0, y0 + T, x0 + T, y0 + T, 0, 1],
      [open(tx - 1, ty), x0, y0, x0, y0 + T, -1, 0], [open(tx + 1, ty), x0 + T, y0, x0 + T, y0 + T, 1, 0],
    ];
    for (const [o, ax, ay, bx, by, nx, ny] of faces) if (o) {
      const nti = tileOf(ax + (bx - ax) / 2 + nx * 4, ay + (by - ay) / 2 + ny * 4); // the street tile this face looks onto
      // the face as a dense dot grid (WALL_ROW × WALL_COL), coloured by what's there: material, lit windows on some
      // 8-unit floors, the block's neon band. The scan picks out the lines.
      const floorsLit: boolean[] = []; for (let fl = 0; fl * 8 < b.h; fl++) floorsLit.push(rnd() < 0.18);
      for (let z = WALL_ROW / 2; z < b.h; z += WALL_ROW) for (let k = 0; k < WALL_COLS; k++) {
        const f = (k + 0.5) / WALL_COLS, zf = z % 8;
        const neon = b.neon && Math.abs(z - b.neonZ) < 3, win = !neon && floorsLit[(z / 8) | 0] && f > 0.3 && f < 0.7 && zf > 2 && zf < 6.5;
        add(ax + (bx - ax) * f + nx * OUT, ay + (by - ay) * f + ny * OUT, z, neon ? b.neon! : win ? windowC : b.col, neon ? 5 : win ? 4 : 1, ti, neon ? 0.02 : 0.08);
      }
      // neon blade sign: a vertical panel sticking out from the wall over the street (dense, so the scan can pick it out)
      if (rnd() < 0.09 && b.h > 60) {
        const c = hex(pick(NEON)), mx = ax + (bx - ax) * 0.5, my = ay + (by - ay) * 0.5, z0 = 14 + rnd() * (b.h - 60), hgt = 30 + rnd() * 24, out = 12;
        for (let u = 2; u <= out; u += 2) for (let z = 0; z <= hgt; z += 2) {
          const frame = u < 3 || u > out - 1.5 || z < 1 || z > hgt - 1.5, glyph = ((u * 7 + (z / 2 | 0) * 13) % 5) < 2;
          if (frame || glyph) add(mx + nx * u, my + ny * u, z0 + z, c, 5, nti, 0.04);
        }
        glow.set(nti, c);
      }
      // overhead cable across the street to the facing wall (some strung with lights)
      if (rnd() < 0.05) {
        let d = 1; while (d < 5 && open(tx + nx * d, ty + ny * d)) d++;
        if (d < 5 && d > 1) {
          const z1 = 20 + rnd() * Math.max(10, Math.min(60, b.h - 20)), span = (d - 1) * T, lights = rnd() < 0.5;
          const mx = ax + (bx - ax) * (0.2 + rnd() * 0.6), my = ay + (by - ay) * (0.2 + rnd() * 0.6);
          for (let s = 0; s <= span; s += 1.5) {
            const f = s / span, x = mx + nx * s, y = my + ny * s, z = z1 - Math.sin(f * Math.PI) * 10, bulb = lights && s % 8 < 2;
            add(x, y, z, bulb ? hex(pick(['#ffd28a', '#ff8ad0', '#8af0ff'])) : cableC, bulb ? 4 : 1, tileOf(x, y), 0.05);
          }
        }
      }
    }
    // above-roof kit (reachable by upward beams): water tank, antenna with a red blinker, the block's billboard
    const r = rnd();
    if (r < 0.04) { /* bare roof */ }
    else if (r < 0.11) { for (let z = 0; z < 16; z += 2) for (let a = 0; a < 22; a++) add(x0 + 16 + Math.cos(a / 22 * 6.28) * 7, y0 + 16 + Math.sin(a / 22 * 6.28) * 7, b.h + 6 + z, tankC, 3, ti); pole(x0 + 12, y0 + 12, b.h, 6, steel, ti); }
    else if (r < 0.16) { pole(x0 + 16, y0 + 16, b.h, 50, steel, ti); for (let k = 0; k < 5; k++) add(x0 + 16 + (rnd() - 0.5) * 3, y0 + 16 + (rnd() - 0.5) * 3, b.h + 51, red, 6, ti, 0.02); }
    if (b.billboard && (open(tx, ty - 1) || open(tx, ty + 1)) && rnd() < 0.35) { // billboard on a street-facing roof edge
      b.billboard = false;
      const c1 = hex(pick(NEON)), c2 = hex(pick(NEON)), yy = open(tx, ty - 1) ? y0 + 2 : y0 + T - 2, bw = T * 1.6, bh = 26;
      for (let u = 0; u <= bw; u += 2) for (let z = 0; z <= bh; z += 2) {
        const f = u / bw, edge = u < 2 || u > bw - 2 || z < 2 || z > bh - 2, c = edge ? c1 : [0, 1, 2].map(i => c1[i] * (1 - f) + c2[i] * f);
        add(x0 + u - bw * 0.2, yy, b.h + 10 + z, c, 5, ti, 0.04);
      }
      pole(x0 + 4, yy, b.h, 10, steel, ti); pole(x0 + bw - 12, yy, b.h, 10, steel, ti);
    }
  }
  // ---- streets: items + infrastructure first (lamps tint the ground), then the ground grid
  const feat = new Map<number, { horiz: boolean; vert: boolean; puddle?: number[]; tint?: number[]; manhole?: boolean }>();
  for (let ty = 0; ty < H; ty++) for (let tx = 0; tx < W; tx++) {
    const ti = ty * W + tx, x0 = tx * T, y0 = ty * T;
    if (solid[ti]) continue;
    const horiz = !open(tx, ty - 1) && !open(tx, ty + 1), vert = !open(tx - 1, ty) && !open(tx + 1, ty);
    const nOpen = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) => open(tx + dx, ty + dy)).length;
    const F: any = { horiz, vert };
    // clutter: loose debris, sometimes a rubble heap; ground features (puddle tinted by neon overhead, manhole) go in F
    for (let k = 0, n = Math.floor(rnd() * 6); k < n; k++) add(x0 + rnd() * T, y0 + rnd() * T, 0.3 + rnd() * 1.5, pick(debris), 7, ti, 0.2);
    const c = rnd();
    if (c < 0.06) { const cx = x0 + 6 + rnd() * 20, cy = y0 + 6 + rnd() * 20; for (let k = 0; k < 40; k++) { const a = rnd() * 6.28, r = rnd() * 7; add(cx + Math.cos(a) * r, cy + Math.sin(a) * r, (7 - r) * 0.7 * rnd(), pick(debris), 7, ti, 0.2); } }
    else if (c < 0.14) { F.puddle = [x0 + 8 + rnd() * 16, y0 + 8 + rnd() * 16, 5 + rnd() * 6, 3 + rnd() * 4]; F.tint = glow.get(ti) || glow.get(ti - 1) || glow.get(ti + 1) || glow.get(ti - W) || glow.get(ti + W); }
    else if (c < 0.17) F.manhole = true;
    feat.set(ti, F);
    const r = rnd();
    if (r < 0.05) { const hz = rnd() < 0.5; box(x0 + 4, y0 + 9, 0, hz ? 24 : 12, hz ? 12 : 24, 9, hex(pick(PAINT)), ti); }                    // parked car
    else if (r < 0.08) { box(x0 + 6, y0 + 6, 0, 9, 9, 9, pick(crateC), ti); if (rnd() < 0.6) box(x0 + 17, y0 + 12, 0, 9, 9, 9, pick(crateC), ti); } // crates
    else if (r < 0.10) { for (let u = 0; u <= 27; u += 2) for (let z = 0; z <= 6; z += 2) add(x0 + 2 + u, y0 + T / 2, z, barrier[(u / 6 | 0) % 2], 3, ti); } // barrier
    else if (r < 0.16 && nOpen < 4 && (!open(tx, ty - 1) || !open(tx - 1, ty))) {                                             // street lamp by a wall
      pole(x0 + 6, y0 + 6, 0, 60, steel, ti);
      for (let k = 0; k < 16; k++) add(x0 + 6 + (rnd() - 0.5) * 6, y0 + 6 + (rnd() - 0.5) * 6, 59 + rnd() * 4, lampHead, 4, ti, 0.05);
      lamps.set(ti, [x0 + 6, y0 + 6]);
    }
    if (nOpen >= 3 && rnd() < 0.35) {                                                                                          // traffic light at a junction
      pole(x0 + 3, y0 + 3, 0, 34, steel, ti); box(x0 + 1, y0 + 1, 34, 4, 4, 10, steel, ti, 1, 2);
      const lc = pick([red, amber, green]); for (let k = 0; k < 6; k++) add(x0 + 3 + (rnd() - 0.5) * 2, y0 + 3 + (rnd() - 0.5) * 2, 39 + rnd() * 3, lc, 4, ti, 0.02);
    }
  }
  // the ground as a fine grid (GROUND_STEP), coloured by what's painted / lying there; the scan picks out its rings
  for (const [ti, F] of feat) {
    const tx = ti % W, ty = (ti / W) | 0, x0 = tx * T, y0 = ty * T, lamp = lamps.get(ti) || lamps.get(ti - 1) || lamps.get(ti - W);
    for (let gy = GROUND_STEP / 2; gy < T; gy += GROUND_STEP) for (let gx = GROUND_STEP / 2; gx < T; gx += GROUND_STEP) {
      const x = x0 + gx, y = y0 + gy;
      let col = asphalt, kind = 0, j = 0.25;
      if (F.horiz && Math.abs(gy - T / 2) < 1.3 && (x % 16) < 9) { col = paintY; j = 0.05; }
      if (F.vert && Math.abs(gx - T / 2) < 1.3 && (y % 16) < 9) { col = paintW; j = 0.05; }
      if (F.manhole) { const d = Math.hypot(gx - 16, gy - 16); if (d > 3.5 && d < 6) col = manholeC; }
      if (F.puddle) { const [px, py, rx, ry] = F.puddle, q = ((x - px) / rx) ** 2 + ((y - py) / ry) ** 2; if (q < 1) { col = F.tint ? F.tint.map((v: number) => v * 0.55) : puddleC; kind = F.tint ? 5 : 0; } }
      if (lamp) { const d = Math.hypot(x - lamp[0], y - lamp[1]); if (d < 16) { const k = (1 - d / 16) * 0.5; col = col.map((v, i) => v * (1 - k) + lampHead[i] * k * 0.6); } }
      add(x, y, 0.2, col, kind, ti, j);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3));
  g.setAttribute('meta', new THREE.Float32BufferAttribute(A, 3));
  g.setAttribute('lid', new THREE.Float32BufferAttribute(LID, 1));
  console.info('[lab] scene dots:', P.length / 3);
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
  geo.setAttribute('lid', new THREE.BufferAttribute(new Float32Array(n), 1));
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
function ringGeo(dead: number, gap: number, grow: number, az: number) {
  const P: number[] = [], R: number[] = [], I: number[] = [], rmax = TUNE.EYES_RANGE * T;
  for (let k = 0, r = Math.max(2, dead * T); r < rmax; k++, r += Math.max(1, gap + k * grow)) {
    const n = Math.ceil(Math.min(6.2832 * r / 2.2, 360 / az)); // fixed azimuth step: dots spread out with range
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
  attribute float lid;            // 1 = wall grid dot: only shows on a lidar beam line (see lidarOK)
  uniform float size, depth, time, sweep, trueMix, greyDim, heightTint, neon, clutter;
  uniform sampler2D scanTex;      // per tile: closest scan x, y, distance, scanned
  uniform sampler2D firstTex;     // per tile: clock when first seen, 1 + ExoS index
  uniform float rate, headAmt;    // lidar head spin (rev/s) and its flare strength
  // Exact 2D line of sight from the scanner to a dot (grid DDA, same as the rings), not testing the dot's own tile
  // (so kit standing on a roof can still be reached by upward beams).
  float losTo(vec2 a, vec2 b) {
    float TT = ${T.toFixed(1)};
    vec2 t = floor(a / TT), e = floor(b / TT), d = b - a, s = sign(d), ad = abs(d);
    vec2 tDelta = vec2(ad.x > 0.0 ? TT / ad.x : 1e9, ad.y > 0.0 ? TT / ad.y : 1e9);
    vec2 tMax = vec2(ad.x > 0.0 ? (s.x > 0.0 ? (t.x + 1.0) * TT - a.x : a.x - t.x * TT) / ad.x : 1e9,
                     ad.y > 0.0 ? (s.y > 0.0 ? (t.y + 1.0) * TT - a.y : a.y - t.y * TT) / ad.y : 1e9);
    float n = abs(e.x - t.x) + abs(e.y - t.y);
    for (int i = 0; i < 28; i++) {
      if (float(i) >= n - 1.0) break;
      if (tMax.x < tMax.y) { tMax.x += tDelta.x; t.x += s.x; } else { tMax.y += tDelta.y; t.y += s.y; }
      if (fogTile(t).b > 0.5) return 0.0;
    }
    return 1.0;
  }
  // The spinning head has to sweep a dot's bearing after its tile came into view before the dot exists.
  // Returns (shown, flare): flare = 1 as the head crosses it, fading over a few degrees, like the ground rings.
  vec2 headGate(vec2 wp, vec2 sc, float ti) {
    vec4 fs = texture2D(firstTex, (vec2(mod(ti, grid.x), floor(ti / grid.x)) + 0.5) / grid);
    if (fs.y < 0.5) return vec2(0.0);
    float az = atan(wp.y - sc.y, wp.x - sc.x);
    float turn = time * rate * 6.2832 + (fs.y - 1.0) * 2.1 - az;           // same head angle as the rings (phase = index * 2.1)
    float since = fract(turn / 6.2832) / max(rate, 0.01);                // seconds since the head last crossed this bearing
    float shown = step(since, time - fs.x) + step(1.0 / max(rate, 0.01), time - fs.x);
    return vec2(min(shown, 1.0), 1.0 - smoothstep(0.0, 0.05 / max(rate, 0.01), since));
  }
  uniform float sH, r0, gap, grow, rmax, dPhi, thM, dTh, ringsOn;
  // Wall dots resolve along the same beams that draw the ground rings. Trace the beam from the sensor (height sH, at
  // the tile's closest scan position) through this dot down to the ground (or mirrored up, above sensor height):
  // if it lands on a ring, the dot is on a scan line. Rings sit at r_k = r0 + gap*k + grow*k(k+1)/2 (ringGeo), so
  // k(r) is the quadratic's root. Columns: a fixed azimuth step dPhi, so dots spread out with distance.
  float lidarOK(vec2 wp, float z, float ti) {
    vec4 sc = texture2D(scanTex, (vec2(mod(ti, grid.x), floor(ti / grid.x)) + 0.5) / grid);
    if (sc.w < 0.5) return 0.0;
    vec2 dv = wp - sc.xy; float d = max(length(dv), 1.0), dz = max(abs(z - sH), 0.01);
    // a wall dot sits just outside its building tile: that side is its face normal; only faces turned toward the scan show
    vec2 lo = wp - vec2(mod(ti, grid.x), floor(ti / grid.x)) * ${T.toFixed(1)};
    vec2 nrm = vec2(lo.x < 0.0 ? -1.0 : lo.x > ${T.toFixed(1)} ? 1.0 : 0.0, lo.y < 0.0 ? -1.0 : lo.y > ${T.toFixed(1)} ? 1.0 : 0.0);
    if (dot(nrm, -dv) < 0.0) return 0.0;
    bool ground = z < 1.0;
    float r = d * sH / dz;                                       // where this beam meets the ground
    if (r < r0) return 0.0;                                      // steeper than the dead zone: the ExoS's own body
    float k, sp;
    float th = atan(dz, d);
    if (th >= thM) {                                             // a ring beam: k from the ring layout (quadratic root)
      float a = grow * 0.5, b = gap + grow * 0.5;
      k = a < 1e-4 ? (r - r0) / gap : (-b + sqrt(b * b + 4.0 * a * (r - r0))) / (2.0 * a);
      float ringGap = max(1.0, gap + grow * (k + 1.0));
      sp = ground ? ringGap : d * sH / (r * r) * ringGap;        // spacing between beam lines: on the ground = the ring gap; on a wall = it projected up the face
    } else {                                                     // toward the horizon: even angular steps
      k = (thM - th) / dTh; sp = d * dTh / max(0.2, cos(th) * cos(th));
    }
    float gr = ground ? ${GROUND_STEP.toFixed(2)} : ${WALL_ROW.toFixed(2)}, gc = ground ? ${GROUND_STEP.toFixed(2)} : ${WALL_COL.toFixed(2)};
    float rowOK = sp < gr * 1.1 ? 1.0 : step(abs(fract(k + 0.5) - 0.5) * sp, gr * 0.55);
    float sp2 = d * dPhi;                                       // spacing between azimuth columns
    float colOK = sp2 < gc * 1.1 ? 1.0 : step(abs(fract(atan(dv.y, dv.x) / dPhi + 0.5) - 0.5) * sp2, gc * 0.55);
    if (rowOK * colOK < 0.5) return 0.0;
    return losTo(sc.xy, wp);                                    // last (dearest): this exact dot must be in sight of the scan position
  }
  uniform vec3 cInk, cFog, rampLo, rampMid, rampHi;
  uniform vec4 eyes[4];           // ExoS x, y (world), alive, active (the sweep pulse runs from the active ExoS only)
  varying vec3 vCol; varying float vA;
  float h1(float n) { return fract(sin(n) * 43758.5453); }
  void main() {
    vec3 p = position; p.z *= depth;
    float kind = meta.x;
    vec2 f = fogAt(meta.y); float live = f.x, rev = f.y;
    // resolve: this dot exists once the tile's reveal passes its own threshold; flash white just after it lands
    float th = meta.z * 0.9 + 0.02, on = step(th, rev), hot = 0.0;
    if (lid > 0.5 && useFog > 0.5) {
      vec2 wp = vec2(position.x, -position.y);
      vec4 sc = texture2D(scanTex, (vec2(mod(meta.y, grid.x), floor(meta.y / grid.x)) + 0.5) / grid);
      vec2 hg = headGate(wp, sc.xy, meta.y);
      on = hg.x > 0.0 ? lidarOK(wp, position.z, meta.y) : 0.0;
      hot = on * hg.y * live * headAmt;
    }
    if (kind < 0.5 && lid > 0.5) on *= 1.0 - ringsOn * smoothstep(0.0, 0.6, live); // ground in sight: the live rings show it; out of sight: the remembered scan
    float flash = lid > 0.5 ? hot : on * (1.0 - smoothstep(0.0, 0.18, rev - th)) * step(rev, 0.999);
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
    for (int i = 0; i < 4; i++) if (eyes[i].z > 0.5 && eyes[i].w > 0.5) {
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
  uniform vec2 centre, facing; uniform float size, amt, spinAmt, time, phase, rate, persist, drop, fadePow, gap, cone, coneCos, closeR;
  uniform vec3 cNear, cFar;
  varying vec3 vCol; varying float vA;
  float hh(float n) { return fract(sin(n) * 43758.5453); }
  // Exact line of sight from this ExoS to one dot: the same grid DDA as sim/world.ts tilesCrossed, stopping at the
  // first building tile (fog texture B channel = solid). 12-tile range needs at most ~17 steps; 28 is the safe cap.
  float los(vec2 a, vec2 b) {
    float TT = ${T.toFixed(1)};
    vec2 t = floor(a / TT), e = floor(b / TT), d = b - a, s = sign(d), ad = abs(d);
    vec2 tDelta = vec2(ad.x > 0.0 ? TT / ad.x : 1e9, ad.y > 0.0 ? TT / ad.y : 1e9);
    vec2 tMax = vec2(ad.x > 0.0 ? (s.x > 0.0 ? (t.x + 1.0) * TT - a.x : a.x - t.x * TT) / ad.x : 1e9,
                     ad.y > 0.0 ? (s.y > 0.0 ? (t.y + 1.0) * TT - a.y : a.y - t.y * TT) / ad.y : 1e9);
    float n = abs(e.x - t.x) + abs(e.y - t.y);
    for (int i = 0; i < 28; i++) {
      if (float(i) >= n) break;
      if (tMax.x < tMax.y) { tMax.x += tDelta.x; t.x += s.x; } else { tMax.y += tDelta.y; t.y += s.y; }
      if (fogTile(t).b > 0.5) return 0.0;
    }
    return 1.0;
  }
  void main() {
    float a = atan(position.y, position.x);
    float turn = time * rate * 6.2832 + phase - a;                  // head angle relative to this dot
    float rev = floor(turn / 6.2832), behind = fract(turn / 6.2832);
    float keep = step(drop, hh(rid + rev * 17.13));                  // this pass's dropout
    float jit = (hh(rid * 1.37 + rev * 3.1) - 0.5) * gap * 0.4;      // this pass's radial jitter
    vec2 w = centre + normalize(position.xy) * (length(position.xy) + jit); // world (sim coords, y down)
    float inMap = step(0.0, w.x) * step(0.0, w.y) * step(w.x, grid.x * ${T.toFixed(1)}) * step(w.y, grid.y * ${T.toFixed(1)});
    vec2 dv = w - centre; float dl = length(dv);
    float inCone = cone < 0.5 || dl < closeR ? 1.0 : step(coneCos, dot(dv / max(dl, 0.001), facing)); // the ExoS's eyes cone (sim rule)
    float ok = inMap * keep * inCone;
    if (ok > 0.0) ok *= los(centre, w);                              // shadows: exact LoS per dot, per ExoS (also kills dots inside walls)
    float hot = 1.0 - smoothstep(0.0, 0.04, behind);                 // just swept: flash
    float life = mix(1.0, persist, smoothstep(0.0, 1.0, behind));     // then settle to persist until the next pass
    vCol = mix(cNear, cFar, rr) * life * amt + vec3(hot * spinAmt);
    vA = ok * pow(1.0 - rr, fadePow) * life;                         // slow fade out to max visual range
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
  uniform vec3 cBlock, cEdge; uniform float fade;
  varying float vRev, vShade; varying vec2 vUv; varying vec3 vW;
  float h(vec3 p) { return fract(sin(dot(floor(p / 3.0), vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
  void main() {
    if (h(vW) < vRev * 1.15 * fade) discard;                  // fade = how much a scanned block dissolves (0 = never)
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
  scanTex = new THREE.DataTexture(scanData, W, H, THREE.RGBAFormat, THREE.FloatType);
  scanTex.magFilter = scanTex.minFilter = THREE.NearestFilter; scanTex.needsUpdate = true;
  firstTex = new THREE.DataTexture(firstData, W, H, THREE.RGBAFormat, THREE.FloatType);
  firstTex.magFilter = firstTex.minFilter = THREE.NearestFilter; firstTex.needsUpdate = true;
  const useFog = { value: 1 }, fogU = () => ({ fogTex: { value: fogTex }, grid: { value: new THREE.Vector2(W, H) }, useFog });
  const C = () => ({ value: new THREE.Color() });
  const { geo, heights } = buildScene();
  mat = new THREE.ShaderMaterial({
    vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false,
    uniforms: { ...fogU(), size: { value: 2 }, depth: { value: 0.5 }, time: { value: 0 }, sweep: { value: 0 }, trueMix: { value: 0.85 }, greyDim: { value: 0.6 },
      heightTint: { value: 0 }, neon: { value: 1.6 }, clutter: { value: 1 },
      scanTex: { value: scanTex }, firstTex: { value: firstTex }, rate: { value: 0.5 }, headAmt: { value: 0.6 }, sH: { value: 24 }, r0: { value: 16 }, gap: { value: 3 }, grow: { value: 0.2 }, rmax: { value: TUNE.EYES_RANGE * T }, dPhi: { value: 0.026 },
      thM: { value: 0.06 }, dTh: { value: 0.01 }, ringsOn: { value: 1 },
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
  blockMat = new THREE.ShaderMaterial({ vertexShader: BVERT, fragmentShader: BFRAG, uniforms: { ...fogU(), depth: mat.uniforms.depth, cBlock: C(), cEdge: C(), fade: { value: 0 } } });
  const im = new THREE.InstancedMesh(bg, blockMat, tiles.length), M = new THREE.Matrix4();
  tiles.forEach((ti, k) => { M.makeScale(T, T, heights[ti]).setPosition((ti % W) * T, -((ti / W) | 0) * T, 0); im.setMatrixAt(k, M); });
  im.frustumCulled = false; im.renderOrder = 1; scene.add(im);
  const pts = new THREE.Points(geo, mat); pts.frustumCulled = false; pts.renderOrder = 2; scene.add(pts);
  // rings, one per possible ExoS (1–4)
  const rg = ringGeo(look.scanDead, look.scanGap, look.scanGrow, look.scanAz); ringKey = [look.scanDead, look.scanGap, look.scanGrow, look.scanAz].join();
  for (let i = 0; i < 4; i++) {
    const rm = new THREE.ShaderMaterial({ vertexShader: RVERT, fragmentShader: FRAG, transparent: true, depthWrite: false,
      uniforms: { ...fogU(), centre: { value: new THREE.Vector2() }, size: { value: 1.5 }, amt: { value: 1 }, spinAmt: { value: 0.5 }, time: mat.uniforms.time, phase: { value: i * 2.1 },
        rate: { value: 0.5 }, persist: { value: 0.3 }, drop: { value: 0.2 }, fadePow: { value: 1.5 }, gap: { value: 3 }, cNear: C(), cFar: C(),
        facing: { value: new THREE.Vector2(1, 0) }, cone: { value: 1 }, coneCos: { value: Math.cos(TUNE.EYES_HALF_ANG * Math.PI / 180) }, closeR: { value: TUNE.EYES_CLOSE * T } } });
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
export function renderField(t: number, dt: number, camX: number, camY: number, zoom: number, vh: number, lance: any[], active: any, dpr: number) {
  const L = look, u = mat.uniforms;
  const dist = (vh / 2) / (zoom * Math.tan(FOV * Math.PI / 360)); // ground plane at exactly `zoom` px per unit
  cam.position.set(camX, -camY, dist); cam.lookAt(camX, -camY, 0);
  // the clear colour gets the sRGB encode twice in this composer chain (measured: #808080 came out 188); pre-decode it once more
  renderer.setClearColor(clearCol.set(L.bg).convertSRGBToLinear());
  const size = L.dotSize * dpr * Math.max(0.8, zoom * 1.4);
  u.time.value = t; u.size.value = size; u.depth.value = Math.max(0.02, L.depth);
  u.useFog.value = FX.fog ? 1 : 0; u.sweep.value = FX.sweep ? L.sweep : 0; u.trueMix.value = L.trueMix; u.greyDim.value = L.greyDim;
  u.heightTint.value = L.heightTint; u.neon.value = L.neon; u.clutter.value = L.clutter;
  u.sH.value = L.scanHeight; u.r0.value = Math.max(2, L.scanDead * T); u.gap.value = L.scanGap; u.grow.value = L.scanGrow; u.dPhi.value = L.scanAz * Math.PI / 180;
  { // the farthest ring's beam angle, and the angular step between the last two rings (horizon beams continue at it)
    const r0 = Math.max(2, L.scanDead * T), rOf = (k: number) => r0 + L.scanGap * k + L.scanGrow * k * (k + 1) / 2, rmax = TUNE.EYES_RANGE * T;
    let k = 0; while (rOf(k + 1) < rmax) k++;
    u.thM.value = Math.atan2(L.scanHeight, rOf(k)); u.dTh.value = Math.max(0.002, Math.atan2(L.scanHeight, rOf(Math.max(0, k - 1))) - u.thM.value);
  }
  u.ringsOn.value = FX.rings && L.scanAmt > 0 ? 1 : 0; blockMat.uniforms.fade.value = L.blockFade;
  scanTex.needsUpdate = true; firstTex.needsUpdate = true;
  u.rate.value = L.scanRate; u.headAmt.value = L.scanSpin;
  u.cInk.value.set(L.ink); u.cFog.value.set(L.fog); u.rampLo.value.set(L.rampLo); u.rampMid.value.set(L.rampMid); u.rampHi.value.set(L.rampHi);
  blockMat.uniforms.cBlock.value.set(L.block); blockMat.uniforms.cEdge.value.set(L.blockEdge);
  gridMat.uniforms.cInk.value.set(L.ink); gridMat.uniforms.amt.value = FX.grid ? L.grid : 0;
  const key = [L.scanDead, L.scanGap, L.scanGrow, L.scanAz].join();
  if (key !== ringKey) { ringKey = key; const g = ringGeo(L.scanDead, L.scanGap, L.scanGrow, L.scanAz), old = rings[0].geometry; for (const r of rings) r.geometry = g; old.dispose(); }
  for (let i = 0; i < 4; i++) {
    const m = lance[i], r = rings[i], ru = (r.material as THREE.ShaderMaterial).uniforms;
    u.eyes.value[i].set(m ? m.x : 0, m ? m.y : 0, m && !m.dead ? 1 : 0, m && m === active ? 1 : 0);
    r.visible = !!m && !m.dead && FX.rings && L.scanAmt > 0;
    if (r.visible) { ru.centre.value.set(m.x, m.y); ru.size.value = size * 0.85; ru.amt.value = L.scanAmt; ru.spinAmt.value = L.scanSpin; ru.cNear.value.set(L.scanNear); ru.cFar.value.set(L.scanFar);
      ru.rate.value = L.scanRate; ru.persist.value = L.scanPersist; ru.drop.value = L.scanDrop; ru.fadePow.value = L.scanFade; ru.gap.value = L.scanGap;
      ru.facing.value.set(m.fx, m.fy); ru.cone.value = L.scanCone; ru.coneCos.value = Math.cos(TUNE.EYES_HALF_ANG * Math.PI / 180); ru.closeR.value = TUNE.EYES_CLOSE * T; }
  }
  spinPts.visible = FX.spinners; if (FX.spinners) updateSpinners(dt);
  fogTex.needsUpdate = true; marksTex.needsUpdate = true;
  bloom.enabled = FX.bloom && L.bloom > 0; bloom.strength = L.bloom;
  const f = film.uniforms;
  f.time.value = t; f.grain.value = FX.grain ? L.grain : 0; f.scan.value = FX.scan ? L.scan : 0; f.vig.value = FX.vignette ? L.vignette : 0;
  f.aberr.value = FX.aberr ? L.aberr : 0; f.haze.value.set(L.haze); f.hazeAmt.value = FX.haze ? L.hazeAmt : 0;
  composer.render();
}
