// Visual lab: the information layer (2D canvas, screen space), drawn in the active look's "micrographics" language:
// hairlines, tick rings, corner brackets, small mono caps, labels like "C-02 // PATROL? // ±2.1t". Drawn in screen px
// (not world units) so line weights and text stay crisp at any zoom. GL composites this over the dots before bloom.
import { TUNE } from '../tune.ts';
import { W, H, T } from '../sim/world.ts';
import { G } from '../sim/state.ts';
import { heardRange, cx, cy } from '../sim/sensors.ts';
import { soundRadius } from '../sim/sound.ts';
import { isType, carrier } from '../sim/mission.ts';
import { ITEMS, byId } from '../sim/items.ts';
import { contactLabel } from './label.ts';
const RADAR_ROW = byId(ITEMS, 'lamp')!.radar!; // R18 moved RADAR_RANGE / RADAR_HALF_ANG onto the radar's row
import { look } from './looks.ts';

let ctx: CanvasRenderingContext2D, z = 1, ox = 0, oy = 0, k = 1; // k = dpr
const S = (x: number, y: number) => [x * z + ox, y * z + oy]; // world → screen px
const R = (r: number) => r * z;

function alpha(hex: string, a: number) { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; }
function text(s: string, x: number, y: number, col: string, size = 10, bold = false) {
  ctx.font = (bold ? '600 ' : '400 ') + size + 'px ' + look.font; ctx.fillStyle = col; ctx.fillText(s.toUpperCase(), x, y);
}
function ring(x: number, y: number, r: number, col: string, ticks = 0, dash: number[] = [], w = 1) {
  ctx.strokeStyle = col; ctx.lineWidth = w; ctx.setLineDash(dash); ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832); ctx.stroke(); ctx.setLineDash([]);
  if (ticks) { ctx.beginPath(); for (let i = 0; i < ticks; i++) { const a = i / ticks * 6.2832, c = Math.cos(a), s = Math.sin(a), l = i % (ticks / 4) === 0 ? 7 : 3; ctx.moveTo(x + c * r, y + s * r); ctx.lineTo(x + c * (r - l), y + s * (r - l)); } ctx.stroke(); }
}
function brackets(x: number, y: number, h: number, col: string, w = 1) { // four corner brackets around a point
  const l = h * 0.45; ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath();
  for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { ctx.moveTo(x + sx * h, y + sy * (h - l)); ctx.lineTo(x + sx * h, y + sy * h); ctx.lineTo(x + sx * (h - l), y + sy * h); }
  ctx.stroke();
}
function leader(x: number, y: number, lines: string[], col: string, dimCol: string) { // a label hung off a short elbow line
  const ex = x + 16, ey = y - 16; ctx.strokeStyle = col; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x + 6, y - 6); ctx.lineTo(ex, ey); ctx.lineTo(ex + 10, ey); ctx.stroke();
  lines.forEach((s, i) => text(s, ex + 13, ey + 3 + i * 11, i ? dimCol : col, i ? 9 : 10, !i));
}

export function drawMarks(c: HTMLCanvasElement, vw: number, vh: number, dpr: number, camX: number, camY: number, zoom: number) {
  ctx = c.getContext('2d')!; k = dpr; z = zoom; ox = vw / 2 - camX * z; oy = vh / 2 - camY * z;
  if (c.width !== Math.round(vw * k) || c.height !== Math.round(vh * k)) { c.width = Math.round(vw * k); c.height = Math.round(vh * k); }
  ctx.setTransform(k, 0, 0, k, 0, 0); ctx.clearRect(0, 0, vw, vh);
  ctx.textBaseline = 'alphabetic'; ctx.lineCap = 'butt';
  const L = look, p = G.p;

  // map frame: hairline border with tile ticks every 4 tiles, the extraction edge as a dashed line + "EXFIL" marks
  { const [x0, y0] = S(0, 0), [x1, y1] = S(W * T, H * T);
    ctx.strokeStyle = alpha(L.ink, 0.35); ctx.lineWidth = 1; ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);
    ctx.beginPath(); for (let t = 0; t <= W; t += 4) { const [x] = S(t * T, 0); ctx.moveTo(x, y0); ctx.lineTo(x, y0 - (t % 16 ? 4 : 9)); ctx.moveTo(x, y1); ctx.lineTo(x, y1 + (t % 16 ? 4 : 9)); } ctx.stroke();
    for (let t = 0; t <= W; t += 16) text(String(t).padStart(3, '0'), S(t * T, 0)[0] + 3, y0 - 6, L.dim, 9);
    const [ex] = S((W - TUNE.EXTRACT_COLS) * T, 0);
    ctx.strokeStyle = alpha(L.friend, 0.5); ctx.setLineDash([2, 5]); ctx.beginPath(); ctx.moveTo(ex, y0); ctx.lineTo(ex, y1); ctx.stroke(); ctx.setLineDash([]);
    for (let t = 2; t < H; t += 6) { const [, y] = S(0, t * T); text('EXFIL ▸', ex + 6, y, alpha(L.friend, 0.55), 9); }
  }
  // signal terrain: hairline outline + label, no fill (the dots underneath carry the space)
  for (const zn of G.zones || []) {
    const q = zn.type === 'QUIET', col = q ? L.quiet : L.noise, ids = new Set(zn.tiles.map(t => t.y * W + t.x));
    ctx.strokeStyle = alpha(col, 0.6); ctx.lineWidth = 1; ctx.setLineDash(q ? [1, 3] : [6, 3]); ctx.beginPath();
    for (const t of zn.tiles) {
      const [x, y] = S(t.x * T, t.y * T), s = R(T);
      if (!ids.has((t.y - 1) * W + t.x)) { ctx.moveTo(x, y); ctx.lineTo(x + s, y); }
      if (!ids.has((t.y + 1) * W + t.x)) { ctx.moveTo(x, y + s); ctx.lineTo(x + s, y + s); }
      if (t.x === 0 || !ids.has(t.y * W + t.x - 1)) { ctx.moveTo(x, y); ctx.lineTo(x, y + s); }
      if (!ids.has(t.y * W + t.x + 1)) { ctx.moveTo(x + s, y); ctx.lineTo(x + s, y + s); }
    }
    ctx.stroke(); ctx.setLineDash([]);
    const [lx, ly] = S((zn.x - 2.5) * T, (zn.y + 0.5) * T);
    text((q ? 'QUIET' : 'NOISE') + ' // ' + zn.name.replace(/ \(.*\)/, ''), lx, ly, alpha(col, 0.85), 9, true);
  }
  // objective: tick ring + diamond, boxed tag
  const objective = (x: number, y: number, tag: string, sub: string) => {
    const [sx, sy] = S(x, y), r = R((TUNE.UPLINK_RADIUS + 0.5) * T);
    ring(sx, sy, r, L.objective, 24); ring(sx, sy, r + 5, alpha(L.objective, 0.3), 0, [1, 4]);
    ctx.beginPath(); ctx.moveTo(sx, sy - 6); ctx.lineTo(sx + 6, sy); ctx.lineTo(sx, sy + 6); ctx.lineTo(sx - 6, sy); ctx.closePath(); ctx.stroke();
    ctx.font = '600 10px ' + L.font; const w = ctx.measureText(tag).width + 10;
    ctx.fillStyle = L.objective; ctx.fillRect(sx + r + 8, sy - r - 14, w, 13); text(tag, sx + r + 13, sy - r - 4, L.bg, 10, true);
    text(sub, sx + r + 8, sy - r + 9, alpha(L.objective, 0.7), 9);
  };
  if (isType('UPLINK')) objective(G.up.x, G.up.y, 'UPLINK', 'PROG ' + G.up.prog + '/' + TUNE.UPLINK_TURNS + ' // ' + (G.up.name || ''));
  if (isType('RETRIEVE')) { const cr = carrier(); if (!cr) objective(G.up.x, G.up.y, 'CARGO', 'STATE: GROUNDED'); else if (!cr.dead) { const [sx, sy] = S(cr.x, cr.y); brackets(sx, sy, 16, L.objective); text('CARGO // CARRIED', sx + 20, sy + 22, L.objective, 9, true); } }
  if (isType('BOUNTY')) { const [sx, sy] = S(G.up.x, G.up.y); ring(sx, sy, R(3 * T), alpha(L.objective, 0.35), 36, [1, 5]); text('BOUNTY ZONE // ' + G.mission.earned + '/' + G.mission.quota + ' CR', sx - 40, sy - R(3 * T) - 6, L.objective, 9, true); }

  // move preview / path
  const path = (pts: any[], from: any, col: string, dash: number[]) => {
    ctx.strokeStyle = col; ctx.lineWidth = 1; ctx.setLineDash(dash); ctx.beginPath(); ctx.moveTo(...S(from.x, from.y) as [number, number]);
    for (const q of pts) ctx.lineTo(...S(q.x, q.y) as [number, number]); ctx.stroke(); ctx.setLineDash([]);
    const [ex, ey] = S(pts[pts.length - 1].x, pts[pts.length - 1].y); ctx.beginPath(); ctx.moveTo(ex - 5, ey - 5); ctx.lineTo(ex + 5, ey + 5); ctx.moveTo(ex + 5, ey - 5); ctx.lineTo(ex - 5, ey + 5); ctx.stroke();
  };
  if (p && p.path && p.path.length > p.pi) path(p.path.slice(p.pi), p, alpha(L.ink, 0.7), [4, 4]);

  // wrecks
  for (const e of G.units) if (e.dead) { const [x, y] = S(e.x, e.y); ctx.strokeStyle = L.dim; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x - 7, y - 7); ctx.lineTo(x + 7, y + 7); ctx.moveTo(x + 7, y - 7); ctx.lineTo(x - 7, y + 7); ctx.stroke(); text(e.type + ' // KIA', x + 10, y + 3, L.dim, 9); }
  // heard range (how far a passive suite hears you now) and this activation's sound rings
  for (const m of G.lance) if (!m.dead) {
    const [x, y] = S(m.x, m.y), hr = heardRange(m) * T;
    if (hr > 0) ring(x, y, R(hr), alpha(L.noise, m === p ? 0.45 : 0.2), 0, [6, 4]);
    if (m.sound > 0) { const r = R(soundRadius(m) * T); ring(x, y, r, alpha(L.sound, m === p ? 0.6 : 0.3), 48); text(m.id + ' SND ' + (Math.round(soundRadius(m) * 10) / 10), x + r * 0.71 + 4, y - r * 0.71 - 4, alpha(L.sound, 0.7), 9); }
  }
  // radar cone: two hairline edges + a range arc with ticks
  for (const m of G.lance) if (m.radarOn) {
    const [x, y] = S(m.x, m.y), a0 = Math.atan2(m.fy, m.fx), h = RADAR_ROW.halfAng * Math.PI / 180, r = R(RADAR_ROW.range * T);
    ctx.strokeStyle = alpha(L.bearing, 0.6); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, y); ctx.arc(x, y, r, a0 - h, a0 + h); ctx.closePath(); ctx.stroke();
    ctx.fillStyle = alpha(L.bearing, 0.06); ctx.fill();
  }
  // bearing lines: fading hairline with distance ticks every 2 tiles
  for (const b of G.pb) if (b.on) {
    const a = 0.8 * (1 - b.age / TUNE.BEARING_LIFE), [x, y] = S(b.x, b.y), c = Math.cos(b.ang), s = Math.sin(b.ang), len = R(60 * T);
    ctx.strokeStyle = alpha(L.bearing, a); ctx.lineWidth = 1; ctx.setLineDash(b.tri ? [] : [8, 6]);
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + c * len, y + s * len); ctx.stroke(); ctx.setLineDash([]);
    ctx.beginPath(); for (let d = 2; d < 60; d += 2) { const q = R(d * T); ctx.moveTo(x + c * q - s * 3, y + s * q + c * 3); ctx.lineTo(x + c * q + s * 3, y + s * q - c * 3); } ctx.stroke();
  }
  // shells + impacts
  ctx.strokeStyle = L.friend; ctx.lineWidth = 1.5;
  for (const s of G.shells) if (s.on) { const [x, y] = S(s.x, s.y), [x2, y2] = S(s.x - s.vx * 12, s.y - s.vy * 12); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x2, y2); ctx.stroke(); }
  for (const f of G.fx) if (f.on) { const [x, y] = S(f.x, f.y); ring(x, y, R((f.hit ? 16 : 8) * (1.6 - f.t)), alpha(f.hit ? L.hostile : L.dim, f.t / 0.6), 12); }
  if (G.splash) { const s = G.splash, [x, y] = S(s.x, s.y); ring(x, y, R(s.sp), alpha(s.hit ? L.hostile : L.dim, Math.min(1, s.t)), 16); text('SPLASH // ' + (s.hit ? 'HIT' : 'MISS'), x + R(s.sp) + 4, y, s.hit ? L.hostile : L.dim, 9, true); }

  // contacts: dashed uncertainty ring with ticks, corner brackets, filled = seen/tracked, hollow = heard only
  let ci = 0;
  for (const c of G.pc) {
    if (!c.on) continue; ci++;
    const lost = c.lost > c.gap, a = Math.max(0.15, 1 - Math.max(0, c.lost - c.gap) / TUNE.CONTACT_LINGER);
    const col = alpha(lost ? L.lost : L.hostile, a), [x, y] = S(cx(c), cy(c));
    ring(x, y, Math.max(8, R(c.unc)), col, 16, [3, 3]);
    brackets(x, y, 9, col, 1.5);
    if (c.snd) { ctx.strokeStyle = col; ctx.strokeRect(x - 2.5, y - 2.5, 5, 5); } else { ctx.fillStyle = col; ctx.fillRect(x - 2.5, y - 2.5, 5, 5); }
    leader(x + 6, y - 6, ['C-' + String(ci).padStart(2, '0') + ' // ' + (contactLabel(c) || 'UNKNOWN'), (lost ? 'LOST // ' : 'TRK // ') + '±' + (c.unc / T).toFixed(1) + 'T'], col, alpha(lost ? L.lost : L.hostile, a * 0.7));
  }
  // the lance: facing chevron, eyes arc, circled id
  for (const m of G.lance) {
    const [x, y] = S(m.x, m.y);
    if (m.dead) { ctx.strokeStyle = L.dim; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x - 7, y - 7); ctx.lineTo(x + 7, y + 7); ctx.moveTo(x + 7, y - 7); ctx.lineTo(x - 7, y + 7); ctx.stroke(); text('EXOS-' + m.id + ' // LOST', x + 10, y - 8, L.dim, 9); continue; }
    const act = m === p, col = act ? L.friend : alpha(L.friend, 0.6), a0 = Math.atan2(m.fy, m.fx);
    const eh = TUNE.EYES_HALF_ANG * Math.PI / 180, er = R(TUNE.EYES_RANGE * T);
    ctx.strokeStyle = alpha(L.ink, act ? 0.3 : 0.15); ctx.lineWidth = 1; ctx.setLineDash([1, 4]);
    ctx.beginPath(); ctx.arc(x, y, er, a0 - eh, a0 + eh); ctx.stroke(); ctx.setLineDash([]);
    ctx.save(); ctx.translate(x, y); ctx.rotate(a0); ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(9, 0); ctx.lineTo(-6, -6); ctx.lineTo(-3, 0); ctx.lineTo(-6, 6); ctx.closePath(); ctx.fill(); ctx.restore();
    ring(x, y, 13, col, act ? 8 : 0, [], 1);
    ctx.strokeStyle = col; ctx.beginPath(); ctx.arc(x + 20, y - 18, 7, 0, 6.2832); ctx.stroke(); text(m.id, x + 17, y - 14.5, col, 9, true);
    if (act) text('EXOS-' + m.id + ' // ACTIVE', x + 30, y - 15, alpha(L.friend, 0.8), 9);
  }
  if (G.mode !== 'hunt' && G.outcome) { ctx.textAlign = 'center'; text('HUNT END // ' + G.outcome, vw / 2, vh / 2, L.ink, 18, true); ctx.textAlign = 'left'; }
}
