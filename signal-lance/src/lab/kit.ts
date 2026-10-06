// Visual lab: the micrographics component kit, shared by the in-hunt HUD (hud.ts) and the menu screens (ui.ts).
// Everything here returns HTML/SVG strings or decorates an element, and reads its colours from the look's CSS vars,
// so a look switch restyles every screen. UIK holds the kit's own tunable numbers; they're live knobs in the lab's
// TUNE panel and come back in COPY SETTINGS.
//
// Frames follow the HUD Vectors sheet: one outline shape (chamfered corners, a stepped top and/or bottom edge) drawn
// in any of its treatments: hairline, accent (solid wedges hugging the edge), double (an inset second line on part of
// the run), solid, plus the small marks (three dots, pip, //// hatch, "ooo ⬭" slot, registration ticks). Shapes are
// rebuilt at the element's real pixel size on every resize, so cuts stay 45° and lines stay one pixel.

const SVGNS = 'http://www.w3.org/2000/svg';

export const UIK = {
  cut: 1,        // chamfer + step depth multiplier (0 = square corners, 2 = deep cuts)
  round: 0,      // corner rounding in px (0 = SHARP sheet, 6+ = ROUNDED sheet)
  stroke: 1,     // hairline weight in px
  accW: 4,       // accent wedge thickness in px
  gap: 4,        // gap between the outline and the double line
  fillA: 0.62,   // panel fill opacity (the look's bg colour)
  scrim: 0.6,    // how much the menus dim the live field behind them
  glow: 0.35,    // soft glow on primary/active elements
  drawOn: 1,     // 1 = frames trace themselves in and headings decode when a screen opens
};
export const UIK_KNOBS: Record<string, [number, number, number]> = {
  cut: [0, 2.5, 0.05], round: [0, 14, 0.5], stroke: [0.5, 2.5, 0.25], accW: [1, 10, 0.5], gap: [2, 10, 0.5],
  fillA: [0, 1, 0.02], scrim: [0, 1, 0.05], glow: [0, 1.5, 0.05], drawOn: [0, 1, 1],
};
export const UIK_TIPS: Record<string, string> = {
  cut: 'How deep the 45° corner cuts and edge steps are on every frame and button. 0 = plain boxes.',
  round: 'Rounds every corner of every frame (the HUD Vectors ROUNDED sheet). 0 = the SHARP sheet.',
  stroke: 'Hairline weight for frames, rules and glyphs, in screen pixels.',
  accW: 'Thickness of the solid accent wedges that hug a frame’s edge.',
  gap: 'Space between a frame’s outline and its inner double line.',
  fillA: 'How solid the panel backgrounds are (the look’s bg colour). Low = the field shows through.',
  scrim: 'How much the menu screens dim the live field behind them.',
  glow: 'Soft glow on the primary button, active tabs and filled meters.',
  drawOn: 'On: frames trace themselves in and headings decode when a screen opens. Off: everything is just there.',
};

// ---- shape engine
type Pt = [number, number];
export type Anchor = 'tl' | 'tr' | 'br' | 'bl' | 'ts' | 'bs';
export type Run = [Anchor, number, Anchor, number]; // from anchor + px to anchor + px, clockwise along the outline
export type Frame = {
  cut: [number, number, number, number];        // tl, tr, br, bl chamfer depths (px)
  top?: { at: number; d: number; up: 'l' | 'r' }; // top edge steps by d at x (fraction ≤ 1, else px); 'up' = the higher side
  bot?: { at: number; d: number; up: 'l' | 'r' }; // same for the bottom edge ('up' = the side that's shorter)
  solid?: boolean;  // filled with ink (primary button, active tab)
  acc?: Run[];      // accent wedges
  dbl?: Run[];      // inner second line
  dots?: boolean | 'br' | 'bl' | 'tr';
  pip?: boolean; hatch?: number; slot?: boolean; ticks?: boolean;
  tab?: boolean;    // shorthand: an accent along the top-right cut
};
type Poly = { P: Pt[]; cum: number[]; total: number; N: Pt[]; U: Pt[] };
function mkPoly(P: Pt[]): Poly {
  const n = P.length, cum: number[] = [], N: Pt[] = [], U: Pt[] = []; let s = 0;
  for (let i = 0; i < n; i++) {
    const [x0, y0] = P[i], [x1, y1] = P[(i + 1) % n], l = Math.hypot(x1 - x0, y1 - y0) || 1e-6;
    cum.push(s); s += l; U.push([(x1 - x0) / l, (y1 - y0) / l]); N.push([-(y1 - y0) / l, (x1 - x0) / l]); // inward normal (clockwise, y down)
  }
  return { P, cum, total: s, N, U };
}
// the outline, clockwise from the top-left cut, with each anchor's perimeter position (the midpoint of its cut / step)
function outline(w: number, h: number, f: Frame) {
  const k = UIK.cut, [a, b, c, e] = f.cut.map(v => v * k), T = f.top, B = f.bot;
  const td = T ? T.d * k : 0, bd = B ? B.d * k : 0;
  const yTL = T && T.up === 'r' ? td : 0, yTR = T && T.up === 'l' ? td : 0;
  const yBR = B && B.up === 'r' ? h - bd : h, yBL = B && B.up === 'l' ? h - bd : h;
  const P: Pt[] = [], A: Record<string, number> = {}; let len = 0;
  const push = (x: number, y: number) => { const q = P[P.length - 1]; if (q && Math.abs(q[0] - x) < 0.01 && Math.abs(q[1] - y) < 0.01) return 0; const l = q ? Math.hypot(x - q[0], y - q[1]) : 0; len += l; P.push([x, y]); return l; };
  const mark = (nm: string, l: number) => { A[nm] = len - l / 2; };
  push(0, yTL + a); mark('tl', push(a, yTL));
  if (T) { const x = T.at <= 1 ? T.at * w : T.at; push(x, T.up === 'r' ? td : 0); mark('ts', push(x + td, T.up === 'r' ? 0 : td)); }
  push(w - b, yTR); mark('tr', push(w, yTR + b));
  push(w, yBR - c); mark('br', push(w - c, yBR));
  if (B) { const x = B.at <= 1 ? B.at * w : B.at; push(x + bd, B.up === 'r' ? h - bd : h); mark('bs', push(x, B.up === 'r' ? h : h - bd)); }
  push(e, yBL); mark('bl', push(0, yBL - e));
  if (P.length > 1 && Math.abs(P[0][0] - P[P.length - 1][0]) < 0.01 && Math.abs(P[0][1] - P[P.length - 1][1]) < 0.01) P.pop();
  return { poly: mkPoly(P), A, yTL, yTR, yBL, yBR };
}
function inset(o: Poly, t: number): Poly {
  const n = o.P.length;
  return mkPoly(o.P.map((v, i) => {
    const n1 = o.N[(i - 1 + n) % n], n2 = o.N[i], d = 1 + n1[0] * n2[0] + n1[1] * n2[1], m = d < 0.2 ? t : t / d;
    return [v[0] + (n1[0] + n2[0]) * m, v[1] + (n1[1] + n2[1]) * m] as Pt;
  }));
}
const wrap = (o: Poly, s: number) => ((s % o.total) + o.total) % o.total;
function at(o: Poly, s: number) { s = wrap(o, s); let i = o.cum.length - 1; while (i > 0 && o.cum[i] > s) i--; const f = s - o.cum[i]; return { p: [o.P[i][0] + o.U[i][0] * f, o.P[i][1] + o.U[i][1] * f] as Pt, i }; }
// the open run of the outline between perimeter positions s0 → s1 (clockwise), with the interior vertex indices
function slice(o: Poly, s0: number, s1: number) {
  s0 = wrap(o, s0); let L = wrap(o, s1) - s0; if (L <= 0) L += o.total;
  const a = at(o, s0), b = at(o, s0 + L), pts: Pt[] = [a.p], idx: number[] = [];
  const n = o.P.length; for (let j = 1; j <= n; j++) { const vi = (a.i + j) % n, d = wrap(o, o.cum[vi] - s0); if (d > 0.01 && d < L - 0.01) { pts.push(o.P[vi]); idx.push(vi); } }
  pts.push(b.p); return { pts, idx, i0: a.i, i1: b.i };
}
// a path through points, corners rounded by r (closed or open)
function path(P: Pt[], closed: boolean, r: number) {
  const f = (p: Pt) => p[0].toFixed(1) + ',' + p[1].toFixed(1);
  if (r <= 0 || P.length < 3) return 'M' + P.map(f).join(' L') + (closed ? ' Z' : '');
  const n = P.length, out: string[] = [];
  for (let i = 0; i < n; i++) {
    const v = P[i];
    if (!closed && (i === 0 || i === n - 1)) { out.push((i ? 'L' : 'M') + f(v)); continue; }
    const p = P[(i - 1 + n) % n], q = P[(i + 1) % n], l1 = Math.hypot(v[0] - p[0], v[1] - p[1]), l2 = Math.hypot(q[0] - v[0], q[1] - v[1]);
    const rr = Math.min(r, l1 / 2, l2 / 2), A: Pt = [v[0] + (p[0] - v[0]) * rr / l1, v[1] + (p[1] - v[1]) * rr / l1], B: Pt = [v[0] + (q[0] - v[0]) * rr / l2, v[1] + (q[1] - v[1]) * rr / l2];
    out.push((out.length ? 'L' : 'M') + f(A) + ' Q' + f(v) + ' ' + f(B));
  }
  return out.join(' ') + (closed ? ' Z' : '');
}
const pos = (A: Record<string, number>, o: Poly, an: Anchor, off: number) => (A[an] ?? (an[0] === 't' ? A.tl : A.bl) ?? 0) + off;

const frames = new Map<HTMLElement, Frame>();
export function drawFrame(el: HTMLElement) {
  const f = frames.get(el); if (!f) return;
  const w = el.offsetWidth, h = el.offsetHeight; if (!w || !h) return;
  let svg = el.querySelector(':scope > svg.frame') as SVGSVGElement;
  if (!svg) { svg = document.createElementNS(SVGNS, 'svg') as any; svg.classList.add('frame'); el.prepend(svg); }
  svg.setAttribute('viewBox', `-0.5 -0.5 ${w} ${h}`); svg.setAttribute('width', String(w)); svg.setAttribute('height', String(h));
  const W = w - 1, H = h - 1, { poly: o, A, yTL, yBL } = outline(W, H, f), R = UIK.round, d = path(o.P, true, R);
  el.classList.toggle('is-solid', !!f.solid);
  let s = `<path class="fill${f.solid ? ' sol' : ''}" d="${d}"/><path class="line draw" pathLength="1" d="${d}"/>`;
  const accs = [...(f.acc || [])]; if (f.tab) accs.push(['tr', -34, 'tr', 6]);
  if (accs.length) {
    const t = UIK.accW, inn = inset(o, t);
    for (const [a0, o0, a1, o1] of accs) {
      const sl = slice(o, pos(A, o, a0, o0), pos(A, o, a1, o1)); if (sl.pts.length < 2) continue;
      const u0 = o.U[sl.i0], n0 = o.N[sl.i0], u1 = o.U[sl.i1], n1 = o.N[sl.i1], P0 = sl.pts[0], P1 = sl.pts[sl.pts.length - 1];
      const inner: Pt[] = [[P0[0] + (n0[0] + u0[0]) * t, P0[1] + (n0[1] + u0[1]) * t], ...sl.idx.map(i => inn.P[i]), [P1[0] + (n1[0] - u1[0]) * t, P1[1] + (n1[1] - u1[1]) * t]];
      s += `<path class="acc" d="${path([...sl.pts, ...inner.reverse()], true, Math.min(R, t))}"/>`;
    }
  }
  if (f.dbl) {
    const inn = inset(o, UIK.gap), r = inn.total / o.total;
    for (const [a0, o0, a1, o1] of f.dbl) s += `<path class="line dbl draw" pathLength="1" d="${path(slice(inn, pos(A, o, a0, o0) * r, pos(A, o, a1, o1) * r).pts, false, Math.max(0, R - UIK.gap / 2))}"/>`;
  }
  const k = UIK.cut, dx = f.cut[0] * k + 9;
  if (f.dots) {
    const [x0, y0] = f.dots === 'br' ? [W - f.cut[2] * k - 30, H - 7] : f.dots === 'bl' ? [f.cut[3] * k + 10, yBL - 7] : f.dots === 'tr' ? [W - f.cut[1] * k - 30, 7] : [dx, yTL + 7];
    for (let i = 0; i < 3; i++) s += `<circle class="line" cx="${x0 + i * 6}" cy="${y0}" r="1.9"/>`;
  }
  if (f.slot) { const x0 = f.cut[3] * k + 12, y0 = yBL - 8; for (let i = 0; i < 3; i++) s += `<circle class="line" cx="${x0 + i * 6}" cy="${y0}" r="1.9"/>`; s += `<path class="line" d="M${x0 + 20},${y0} Q${x0 + 20},${y0 - 2} ${x0 + 34},${y0 - 2} L${x0 + 46},${y0 - 1} L${x0 + 46},${y0 + 1} L${x0 + 34},${y0 + 2} Q${x0 + 20},${y0 + 2} ${x0 + 20},${y0}"/>`; }
  if (f.pip) s += `<circle class="solid" cx="${W - f.cut[2] * k * 0.5 - 7}" cy="${H - 7}" r="1.7"/>`;
  if (f.hatch) for (let i = 0; i < f.hatch; i++) { const x = dx + 2 + i * 7, y = yTL; s += `<path class="solid" d="M${x + 4},${y + 3} L${x + 8},${y + 3} L${x + 4},${y + 9} L${x},${y + 9} Z"/>`; }
  if (f.ticks) s += `<path class="line" d="M-7,-2 L-7,-12 M-12,-7 L-2,-7 M${W + 7},${H + 2} L${W + 7},${H + 12} M${W + 2},${H + 7} L${W + 12},${H + 7}"/>`;
  svg.innerHTML = s;
}
const ro = new ResizeObserver(es => { for (const e of es) drawFrame(e.target as HTMLElement); });
export function frame(el: HTMLElement, f: Frame) { frames.set(el, f); ro.observe(el); drawFrame(el); }
export function redrawFrames() { for (const el of [...frames.keys()]) if (el.isConnected) drawFrame(el); else { frames.delete(el); ro.unobserve(el); } }

// Named shapes from the HUD Vectors sheet (the ones the screens use). An element opts in with data-frame="name";
// data-acc / data-dbl add treatments by name so the same shape can be dressed four ways.
export const SHAPES: Record<string, Frame> = {
  sweep:   { cut: [14, 0, 10, 0], top: { at: 0.28, d: 18, up: 'r' }, bot: { at: 0.42, d: 18, up: 'r' } },   // the big S-panel
  dossier: { cut: [0, 14, 0, 14], top: { at: 0.55, d: 10, up: 'l' } },                                     // tab rises on the left
  plate:   { cut: [12, 0, 12, 0] },
  wing:    { cut: [0, 18, 0, 0], bot: { at: 0.3, d: 10, up: 'l' } },
  bar:     { cut: [0, 0, 8, 0], top: { at: 0.6, d: 6, up: 'l' } },                                          // long header strip
  badge:   { cut: [8, 8, 8, 8] },
  panel:   { cut: [0, 14, 0, 0] },
  side:    { cut: [12, 0, 0, 12] },
  btn:     { cut: [8, 0, 8, 0] },
  tab:     { cut: [7, 7, 0, 0] },
  key:     { cut: [0, 10, 0, 10] },
  chip:    { cut: [4, 4, 4, 4] },
};
// treatments: accent / double runs per shape name (fall back to a generic corner treatment)
const ACC: Record<string, Run[]> = {
  sweep:   [['ts', 10, 'tr', 10], ['bs', 8, 'bl', 10]],
  dossier: [['tl', 0, 'ts', -6], ['br', 0, 'br', 40]],
  plate:   [['tr', -40, 'tr', 14], ['bl', -40, 'bl', 14]],
  wing:    [['tr', -28, 'tr', 18], ['bs', 6, 'bl', 14]],
  bar:     [['ts', 6, 'tr', 4]],
};
const DBL: Record<string, Run[]> = {
  sweep:   [['tl', 0, 'br', 0]],
  dossier: [['ts', 0, 'br', -6]],
  plate:   [['tl', 0, 'tr', 0]],
  wing:    [['tl', 6, 'br', -6]],
  bar:     [['bs', 0, 'tl', 0]],
};
export function shape(name: string, opts: Partial<Frame> & { treat?: string } = {}): Frame {
  const b = SHAPES[name] || SHAPES.panel, t = opts.treat || '';
  const f: Frame = { ...b, ...opts };
  if (t.includes('acc')) f.acc = ACC[name] || [['tr', -30, 'tr', 10], ['bl', -30, 'bl', 10]];
  if (t.includes('dbl')) f.dbl = DBL[name] || [['tl', 0, 'br', 0]];
  if (t.includes('solid')) f.solid = true;
  return f;
}
// frame every element under root that carries data-frame="shape" (+ data-treat, data-marks="dots pip hatch slot ticks")
export function frameAll(root: ParentNode) {
  for (const el of root.querySelectorAll<HTMLElement>('[data-frame]')) {
    const m = (el.dataset.marks || '').split(' '), o: any = { treat: el.dataset.treat || '' };
    if (m.includes('dots')) o.dots = true; if (m.includes('dotsbr')) o.dots = 'br'; if (m.includes('dotstr')) o.dots = 'tr'; if (m.includes('dotsbl')) o.dots = 'bl';
    if (m.includes('pip')) o.pip = true; if (m.includes('slot')) o.slot = true; if (m.includes('ticks')) o.ticks = true; if (m.includes('tab')) o.tab = true;
    const hm = m.find(x => x.startsWith('hatch')); if (hm) o.hatch = +hm.slice(5) || 4;
    frame(el, shape(el.dataset.frame!, o));
  }
}

// ---- readouts
export const pad = (n: number, w = 2) => String(Math.max(0, Math.floor(n))).padStart(w, '0');
export function dots(n: number, max: number, cls = '') { let s = ''; for (let i = 0; i < max; i++) s += `<i class="d${i < n ? ' on' : ''} ${cls}"></i>`; return `<span class="dots">${s}</span>`; }
export function seg(v: number, max: number, n = 12) { const k = Math.round(n * Math.max(0, v) / max); let s = ''; for (let i = 0; i < n; i++) s += `<i class="${i < k ? 'on' : ''}"></i>`; return `<span class="seg">${s}</span>`; }
// slot cells: one cell per slot; a filled cell carries its module's pattern class
export function cells(owned: string[], max: number) { let s = ''; for (let i = 0; i < max; i++) s += `<i class="${owned[i] ? 'on p-' + owned[i] : ''}"></i>`; return `<span class="cells">${s}</span>`; }
const rnd = (seed: number) => { let r = (seed * 9301 + 49297) % 233280; return () => (r = (r * 9301 + 49297) % 233280) / 233280; };
// dot-matrix block: a w×h grid lit by a seeded pattern (the micrographics "data" texture)
export function matrix(w: number, h: number, seed = 1, fill = 0.5) { const r = rnd(seed); let s = ''; for (let i = 0; i < w * h; i++) s += `<i${r() < fill ? ' class="on"' : ''}></i>`; return `<span class="mx" style="grid-template-columns:repeat(${w},var(--mx,4px))">${s}</span>`; }
// equaliser columns (dot stacks), the "▮▮▯" level texture
export function eq(n: number, seed = 2, hmax = 6) { const r = rnd(seed); let s = ''; for (let i = 0; i < n; i++) { const k = 1 + Math.floor(r() * hmax); let c = ''; for (let j = 0; j < hmax; j++) c += `<i${j < k ? ' class="on"' : ''}></i>`; s += `<span>${c}</span>`; } return `<span class="eq">${s}</span>`; }
export function bars(seed = 3, n = 28) { const r = rnd(seed); let s = ''; for (let i = 0; i < n; i++) s += `<i style="width:${1 + Math.floor(r() * 3)}px;margin-right:${1 + Math.floor(r() * 2)}px"></i>`; return `<span class="bars">${s}</span>`; }
// clock-face dial: a circle with one pointer at angle a (deg); filled = the solid-square variant from the components sheet
export function dial(a: number, size = 22, filled = false, spin = 0) {
  const r = size / 2 - 1, c = size / 2;
  return `<svg class="g dial${filled ? ' f' : ''}" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${filled ? `<rect class="bg" x="0" y="0" width="${size}" height="${size}"/>` : ''}<circle cx="${c}" cy="${c}" r="${r - (filled ? 2 : 0)}"/><path class="hand${spin ? ' spin' : ''}" style="transform:rotate(${a}deg);${spin ? `animation-duration:${spin}s` : ''}" d="M${c},${c} L${c},${c - r + 4}"/></svg>`;
}
// ring gauge: an arc from 0 to v/max, tick marks round the outside, a value in the middle
export function gauge(v: number, max: number, label: string, sub = '', size = 76) {
  const c = size / 2, r = c - 10, f = Math.max(0, Math.min(1, v / max)), a = f * Math.PI * 2 - Math.PI / 2;
  const ex = c + Math.cos(a) * r, ey = c + Math.sin(a) * r;
  let t = ''; for (let i = 0; i < 36; i++) { const q = i / 36 * Math.PI * 2, l = i % 9 ? 2 : 5; t += `M${(c + Math.cos(q) * (r + 4)).toFixed(1)},${(c + Math.sin(q) * (r + 4)).toFixed(1)} L${(c + Math.cos(q) * (r + 4 + l)).toFixed(1)},${(c + Math.sin(q) * (r + 4 + l)).toFixed(1)} `; }
  const arc = f >= 0.999 ? `<circle class="on" cx="${c}" cy="${c}" r="${r}"/>` : f > 0 ? `<path class="on" d="M${c},${c - r} A${r},${r} 0 ${f > 0.5 ? 1 : 0} 1 ${ex.toFixed(1)},${ey.toFixed(1)}"/>` : '';
  return `<span class="gauge"><svg class="g" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><circle class="tr" cx="${c}" cy="${c}" r="${r}"/>${arc}<path d="${t}"/><circle class="s" cx="${ex.toFixed(1)}" cy="${ey.toFixed(1)}" r="2.2"/></svg><b>${label}</b>${sub ? `<small>${sub}</small>` : ''}</span>`;
}

// ---- glyphs: small line symbols in the components-library style, drawn on a 24-unit grid
const G24: Record<string, string> = {
  star:    'M12,2 L12,22 M2,12 L22,12 M5,5 L19,19 M19,5 L5,19',
  spark:   'M12,2 Q12,12 22,12 Q12,12 12,22 Q12,12 2,12 Q12,12 12,2 Z',
  cross:   'M12,3 L12,21 M3,12 L21,12',
  xbox:    'M3,3 L21,3 L21,21 L3,21 Z M3,3 L21,21 M21,3 L3,21',
  target:  'M12,1 L12,7 M12,17 L12,23 M1,12 L7,12 M17,12 L23,12',
  diamond: 'M12,2 L22,12 L12,22 L2,12 Z M12,8 L16,12 L12,16 L8,12 Z',
  chevron: 'M4,6 L12,12 L4,18 M12,6 L20,12 L12,18',
  hex:     'M12,2 L21,7 L21,17 L12,22 L3,17 L3,7 Z M12,2 L12,22 M3,7 L21,17 M21,7 L3,17',
  node:    'M12,12 L12,3 M12,12 L20,17 M12,12 L4,17',
  wave:    'M2,12 L5,12 L7,6 L10,18 L13,4 L16,20 L18,12 L22,12',
  ear:     'M7,9 Q7,3 13,3 Q19,3 19,9 Q19,13 15,15 Q13,16 13,19 Q13,22 10,21 M10,9 Q10,6 13,6 Q16,6 16,9',
  bolt:    'M14,2 L5,14 L11,14 L9,22 L19,9 L13,9 Z',
  shield:  'M12,2 L20,5 L20,12 Q20,19 12,22 Q4,19 4,12 L4,5 Z',
  cell:    'M6,5 L18,5 L18,21 L6,21 Z M10,2 L14,2 L14,5 M9,10 L15,10 M9,14 L15,14',
  shell:   'M12,2 Q17,6 17,12 L17,20 L7,20 L7,12 Q7,6 12,2 Z M7,16 L17,16',
  radar:   'M12,12 L20,4 M4,20 A11,11 0 0 1 4,4 M8,16 A6,6 0 0 1 8,8',
  link:    'M4,12 L9,12 M15,12 L20,12 M9,7 L15,7 L15,17 L9,17 Z',
  crate:   'M3,7 L12,3 L21,7 L21,17 L12,21 L3,17 Z M3,7 L12,11 L21,7 M12,11 L12,21',
  coin:    'M12,6 L12,18 M9,9 Q9,7 12,7 Q15,7 15,9 Q15,11 12,12 Q9,13 9,15 Q9,17 12,17 Q15,17 15,15',
  gun:     'M2,10 L16,10 L16,14 L2,14 Z M16,11 L22,11 M16,13 L22,13 M6,14 L6,19 L10,19 L10,14',
  arrow:   'M3,12 L20,12 M14,6 L20,12 L14,18',
  exit:    'M4,4 L14,4 L14,20 L4,20 Z M10,12 L22,12 M18,8 L22,12 L18,16',
  clock:   'M12,12 L12,6 M12,12 L16,14',
  back:    'M20,6 L12,12 L20,18 M12,6 L4,12 L12,18',
};
const EXTRA: Record<string, string> = {
  target: '<circle cx="12" cy="12" r="6"/><circle class="s" cx="12" cy="12" r="1.2"/>',
  node: '<circle class="s" cx="12" cy="3" r="1.8"/><circle class="s" cx="20" cy="17" r="1.8"/><circle class="s" cx="4" cy="17" r="1.8"/><circle cx="12" cy="12" r="2.4"/>',
  coin: '<circle cx="12" cy="12" r="10"/>',
  clock: '<circle cx="12" cy="12" r="10"/>',
};
export const GLYPHS = Object.keys(G24);
export function glyph(name: string, size = 18, cls = '') { return `<svg class="g gl ${cls}" width="${size}" height="${size}" viewBox="0 0 24 24"><path d="${G24[name] || G24.cross}"/>${EXTRA[name] || ''}</svg>`; }
export const ringed = (t: string, cls = '') => `<span class="lt ${cls}">${t}</span>`;
export const bracket = (t: string, cls = '') => `<span class="brk ${cls}"><i>[</i>${t}<i>]</i></span>`;

// ---- motion: frames trace in (stroke-dashoffset on pathLength=1), headings decode from noise into their text
export function playIn(root: HTMLElement) {
  root.classList.remove('drawing');
  if (!UIK.drawOn) return;
  void root.offsetWidth; root.classList.add('drawing');
  const pool = '#%&/\\<>=+*0123456789ABCDEFΛΣΔ', els = [...root.querySelectorAll<HTMLElement>('[data-decode]')];
  els.forEach((el, j) => {
    const txt = el.dataset.decode || el.textContent || ''; el.dataset.decode = txt;
    // time-based (not frame-counted) so a busy field behind the menus can't slow it down
    const t0 = performance.now() + j * 90, dur = 450 + Math.min(500, txt.length * 25);
    const tick = (now: number) => {
      const f = (now - t0) / dur; let s = '';
      for (let i = 0; i < txt.length; i++) s += txt[i] === ' ' || i < f * txt.length * 1.25 - 2 ? txt[i] : pool[(Math.random() * pool.length) | 0];
      el.textContent = f < 0 ? '' : s; if (f < 1) requestAnimationFrame(tick); else el.textContent = txt;
    };
    requestAnimationFrame(tick);
  });
}
