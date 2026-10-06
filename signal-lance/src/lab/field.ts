// Visual lab: the battlefield as a lidar point cloud (three.js / WebGL). Streets = sparse ground dots, buildings =
// dot-stacked walls + roof, each building block its own height. A perspective camera looks straight down, so building
// tops lean away from the screen centre (parallax) while the ground plane maps to the screen exactly like the 2D game:
// screen = (world - cam) * zoom + centre. That keeps the 2D marks layer (marks.ts) lined up with the dots.
// Post: marks composited in, then bloom, then one "film" pass (haze, chromatic fringe, grain, scanlines, vignette).
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { W, H, T, solid } from '../sim/world.ts';
import { look, FX } from './looks.ts';
import { level } from './fog.ts';

const FOV = 40;
let renderer: THREE.WebGLRenderer, scene: THREE.Scene, cam: THREE.PerspectiveCamera, composer: EffectComposer;
let pts: THREE.Points, mat: THREE.ShaderMaterial, fogTex: THREE.DataTexture, marksTex: THREE.CanvasTexture;
let bloom: UnrealBloomPass, marksPass: ShaderPass, film: ShaderPass;

// ---- point cloud --------------------------------------------------------------------------------------------
const hash = (n: number) => { n = Math.sin(n * 127.1 + 311.7) * 43758.5453; return n - Math.floor(n); };
// Building height per connected block (flood fill), 1.5..5.5 tiles, stable per map
function blockHeights() {
  const h = new Float32Array(W * H), seen = new Uint8Array(W * H);
  let b = 0;
  for (let i = 0; i < W * H; i++) {
    if (!solid[i] || seen[i]) continue;
    const ht = (1.5 + 4 * hash(++b)) * T, st = [i]; seen[i] = 1;
    while (st.length) {
      const j = st.pop()!, x = j % W, y = (j / W) | 0; h[j] = ht;
      for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]])
        if (nx >= 0 && ny >= 0 && nx < W && ny < H) { const k = ny * W + nx; if (solid[k] && !seen[k]) { seen[k] = 1; st.push(k); } }
    }
  }
  return h;
}
function buildCloud() {
  const P: number[] = [], A: number[] = []; // xyz, (kind, tileIndex, seed)
  const add = (x: number, y: number, z: number, kind: number, ti: number) => { P.push(x, -y, z); A.push(kind, ti, Math.random()); };
  const hts = blockHeights();
  for (let ty = 0; ty < H; ty++) for (let tx = 0; tx < W; tx++) {
    const ti = ty * W + tx, x0 = tx * T, y0 = ty * T;
    if (!solid[ti]) { // ground: a jittered 4x4 grid per tile, some dropped (lidar returns are patchy)
      for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) if (Math.random() < 0.45)
        add(x0 + (a + 0.5 + (Math.random() - 0.5) * 0.5) * T / 3, y0 + (b + 0.5 + (Math.random() - 0.5) * 0.5) * T / 3, 0, 0, ti);
      continue;
    }
    const ht = hts[ti], open = (nx: number, ny: number) => nx < 0 || ny < 0 || nx >= W || ny >= H || !solid[ny * W + nx];
    // walls: only faces that border a street; horizontal scan rows every 4 units of height
    const faces: [boolean, number, number, number, number][] = [
      [open(tx, ty - 1), x0, y0, x0 + T, y0], [open(tx, ty + 1), x0, y0 + T, x0 + T, y0 + T],
      [open(tx - 1, ty), x0, y0, x0, y0 + T], [open(tx + 1, ty), x0 + T, y0, x0 + T, y0 + T],
    ];
    for (const [o, ax, ay, bx, by] of faces) if (o)
      for (let z = 4; z < ht; z += 12) for (let k = 0; k < 6; k++) if (Math.random() < 0.85) { const f = (k + 0.5 + (Math.random() - 0.5) * 0.3) / 6; add(ax + (bx - ax) * f, ay + (by - ay) * f, z, 1, ti); }
    // roof: sparse, plus a bright edge outline
    for (let k = 0; k < 6; k++) add(x0 + Math.random() * T, y0 + Math.random() * T, ht, 2, ti);
    for (const [o, ax, ay, bx, by] of faces) if (o) for (let k = 0; k < 10; k++) { const f = k / 10; add(ax + (bx - ax) * f, ay + (by - ay) * f, ht, 1, ti); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  g.setAttribute('meta', new THREE.Float32BufferAttribute(A, 3));
  return g;
}

const VERT = /* glsl */`
  attribute vec3 meta;            // kind (0 ground, 1 wall, 2 roof), tile index, random seed
  uniform sampler2D fogTex; uniform vec2 grid; uniform float size, depth, time, useFog, sweep;
  uniform vec3 cGround, cWall, cRoof, cFog;
  uniform vec4 eyes[4];           // ExoS x, y (world), alive, active
  varying vec3 vCol; varying float vA;
  void main() {
    vec3 p = position; p.z *= depth;
    float ti = meta.y; vec2 tc = vec2(mod(ti, grid.x) + 0.5, floor(ti / grid.x) + 0.5) / grid;
    float lit = useFog > 0.5 ? texture2D(fogTex, tc).r : 1.0;
    vec3 base = meta.x < 0.5 ? cGround : meta.x < 1.5 ? cWall : cRoof;
    // lidar sweep: a ring expanding from each ExoS, brightening dots it passes (only where it can see)
    float s = 0.0;
    for (int i = 0; i < 4; i++) if (eyes[i].z > 0.5) {
      float d = distance(position.xy, vec2(eyes[i].x, -eyes[i].y));
      float r = mod(time * 260.0 + float(i) * 190.0, 420.0);
      s = max(s, smoothstep(26.0, 0.0, abs(d - r)) * (1.0 - r / 420.0));
    }
    float flick = 0.85 + 0.15 * sin(time * (3.0 + meta.z * 7.0) + meta.z * 40.0);
    vCol = mix(cFog, base, lit) * flick + base * s * sweep * lit;
    vA = mix(0.3, 1.0, lit) * (meta.x < 0.5 ? 0.6 : 1.0);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = size * (meta.x < 0.5 ? 0.85 : 1.0) * (1.0 + 0.6 * s * sweep);
    gl_Position = projectionMatrix * mv;
  }`;
const FRAG = /* glsl */`
  varying vec3 vCol; varying float vA;
  void main() { vec2 c = gl_PointCoord - 0.5; float d = length(c); if (d > 0.5) discard; gl_FragColor = vec4(vCol, vA * smoothstep(0.5, 0.2, d)); }`;

// marks layer over the dots (before bloom, so information glows too), and the film pass after it
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
      col += haze * hazeAmt * (0.35 + 0.65 * smoothstep(0.9, -0.2, vUv.y)) * 0.5;      // dust lit from below, like 2049
      col *= 1.0 - scan * 0.5 * (0.5 + 0.5 * sin(vUv.y * res.y * 1.5708));                // scanlines every ~4 px
      col += (rnd(vUv * res) - 0.5) * grain;                                               // film grain
      col *= 1.0 - vig * smoothstep(0.25, 0.85, length(c * vec2(res.x / res.y, 1.0)) * 0.9);
      gl_FragColor = vec4(col, 1.0);
    }`,
};

export function initField(canvas: HTMLCanvasElement, marks: HTMLCanvasElement) {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  scene = new THREE.Scene();
  cam = new THREE.PerspectiveCamera(FOV, 1, 1, 20000); cam.up.set(0, 1, 0);
  fogTex = new THREE.DataTexture(level, W, H, THREE.RedFormat, THREE.UnsignedByteType);
  fogTex.magFilter = fogTex.minFilter = THREE.LinearFilter; fogTex.needsUpdate = true;
  mat = new THREE.ShaderMaterial({
    vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { fogTex: { value: fogTex }, grid: { value: new THREE.Vector2(W, H) }, size: { value: 2 }, depth: { value: 0.5 }, time: { value: 0 },
      useFog: { value: 1 }, sweep: { value: 0 }, cGround: { value: new THREE.Color() }, cWall: { value: new THREE.Color() }, cRoof: { value: new THREE.Color() },
      cFog: { value: new THREE.Color() }, eyes: { value: [0, 1, 2, 3].map(() => new THREE.Vector4()) } },
  });
  pts = new THREE.Points(buildCloud(), mat); pts.frustumCulled = false; scene.add(pts);
  marksTex = new THREE.CanvasTexture(marks); marksTex.minFilter = THREE.LinearFilter; marksTex.colorSpace = THREE.SRGBColorSpace; marksTex.premultiplyAlpha = true;
  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, cam));
  marksPass = new ShaderPass(MARKS); marksPass.uniforms.tMarks.value = marksTex; composer.addPass(marksPass);
  bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.5, 0.6, 0.15); composer.addPass(bloom);
  film = new ShaderPass(FILM); composer.addPass(film);
  composer.addPass(new OutputPass());
}

export function resizeField(w: number, h: number, dpr: number) {
  renderer.setPixelRatio(dpr); renderer.setSize(w, h, false); composer.setPixelRatio(dpr); composer.setSize(w, h);
  cam.aspect = w / h; cam.updateProjectionMatrix();
  film.uniforms.res.value.set(w * dpr, h * dpr);
}

// camX/camY = world point at screen centre, zoom = screen px per world unit (same meaning as the 2D game)
export function renderField(t: number, camX: number, camY: number, zoom: number, vh: number, lance: any[], dpr: number) {
  const L = look, u = mat.uniforms;
  const dist = (vh / 2) / (zoom * Math.tan(FOV * Math.PI / 360)); // ground plane at exactly `zoom` px per unit
  cam.position.set(camX, -camY, dist); cam.lookAt(camX, -camY, 0);
  renderer.setClearColor(L.bg);
  u.time.value = t; u.size.value = L.dotSize * dpr * Math.max(0.8, zoom * 1.4); u.depth.value = L.depth;
  u.useFog.value = FX.fog ? 1 : 0; u.sweep.value = FX.sweep ? L.sweep : 0;
  u.cGround.value.set(L.ground); u.cWall.value.set(L.wall); u.cRoof.value.set(L.roof); u.cFog.value.set(L.fog);
  for (let i = 0; i < 4; i++) { const m = lance[i]; u.eyes.value[i].set(m ? m.x : 0, m ? m.y : 0, m && !m.dead ? 1 : 0, 0); }
  fogTex.needsUpdate = true; marksTex.needsUpdate = true;
  bloom.enabled = FX.bloom && L.bloom > 0; bloom.strength = L.bloom;
  const f = film.uniforms;
  f.time.value = t; f.grain.value = FX.grain ? L.grain : 0; f.scan.value = FX.scan ? L.scan : 0; f.vig.value = FX.vignette ? L.vignette : 0;
  f.aberr.value = FX.aberr ? L.aberr : 0; f.haze.value.set(L.haze); f.hazeAmt.value = FX.haze ? L.hazeAmt : 0;
  composer.render();
}
