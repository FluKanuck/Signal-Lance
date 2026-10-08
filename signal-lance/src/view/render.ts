import { whyShort } from './glossary.ts';
import { shotResult } from './shots.ts';
import { shotWord } from '../sim/turns.ts';
const flash: { rec: any; until: number } = { rec: null, until: 0 }; // R25: the shot-result flash
import { drawAarHl } from './aar.ts';
import { TUNE } from '../tune.ts';
import { has, radarOf, mortarOf } from '../sim/kit.ts';
import { fireRange } from '../sim/turns.ts';
import { partsRead, coverInfo } from '../sim/combat.ts';
import { lowHits, hitsLeft } from '../sim/warn.ts';
import { resetLabels, labelSpot } from './layout.ts';
import { W, H, T, solid, clutter } from '../sim/world.ts';
import { G, unitById } from '../sim/state.ts';
import { bestContact } from '../sim/bot.ts';
import { heardRange, canSee, cx, cy } from '../sim/sensors.ts';
import { upDist, playerTarget, mortarBlock, mortarScatter, shootBlock, shotOdds, along } from '../sim/turns.ts';
import { V, camZ } from './state.ts';
import { zoneAtTile, effEmit, zoneType } from '../sim/zones.ts';
import { soundRadius } from '../sim/sound.ts';
import { traitLines, frozen, matchVariants, hasReading } from '../sim/ids.ts';
import { isType, carrier } from '../sim/mission.ts';
import { legButton, legPath, forksAhead, allyNextStop } from '../sim/escort.ts';
import { anchors } from '../sim/world.ts';
import { zoneKnow, zoneKnowOf } from '../sim/scan.ts';
import { BANDS, heardMoving, rwrWedge, rwrFade, rwrGuess, paintFade } from '../sim/rwr.ts';
import { active } from '../sim/kit.ts';
import { pathLen } from '../sim/turns.ts';

// R17 (parked #59): where a route button sits: along its leg, at the first spot (6 tiles in, then every 2) that isn't under
// the HUD text or the turn strip on screen. Input and tooltips read the same spot.
export function routeBtn(i: number) {
  const P = legPath(i), z = camZ(), r = 30, L = pathLen(P) * T;
  const rects = ['hud', 'init'].map(id => document.getElementById(id)).filter(Boolean).map(el => el.getBoundingClientRect()).filter(b => b.width > 0);
  const clear = (q) => { const sx = vw / 2 + (q.x - V.camX) * z, sy = vh / 2 + (q.y - V.camY) * z; return rects.every(b => sx < b.left - r || sx > b.right + r || sy < b.top - r || sy > b.bottom + r); };
  for (let want = Math.min(6 * T, L / 2); want <= L; want += 2 * T) { const q = alongPath(P, want); if (clear(q)) return q; }
  return legButton(i);
}
function alongPath(P, want) {
  for (let k = 1; k < P.length; k++) {
    const d = Math.hypot(P[k].x - P[k - 1].x, P[k].y - P[k - 1].y);
    if (d >= want) return { x: P[k - 1].x + (P[k].x - P[k - 1].x) * want / d, y: P[k - 1].y + (P[k].y - P[k - 1].y) * want / d };
    want -= d;
  }
  return P[P.length - 1];
}
// r17-s3: where a waypoint's look marker sits: where you tapped, or 3 tiles along its facing
export function markerPos(w, P) {
  if (w.lx !== undefined) return { x: w.lx, y: w.ly };
  const q = along(P, w.d), d = Math.hypot(w.fx, w.fy) || 1; return q ? { x: q.x + w.fx / d * 3 * T, y: q.y + w.fy / d * 3 * T } : null;
}
// R17: a faint eyes cone (EYES_HALF_ANG, EYES_RANGE) from (x, y) along (fx, fy)
function eyesCone(x, y, fx, fy, alpha) {
  const a0 = Math.atan2(fy, fx), h = TUNE.EYES_HALF_ANG * Math.PI / 180;
  ctx.fillStyle = 'rgba(150,220,255,' + alpha + ')'; ctx.beginPath(); ctx.moveTo(x, y); ctx.arc(x, y, TUNE.EYES_RANGE * T, a0 - h, a0 + h); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(150,220,255,' + Math.min(1, alpha * 3) + ')'; ctx.lineWidth = 1.5; ctx.stroke();
}

// R13: a sound ring (pale, solid, with short ticks so it reads as "waves", not the dashed orange EMIT ring)
function soundRing(x, y, r, z, alpha, label?) {
  ctx.strokeStyle = 'rgba(232,244,255,' + alpha + ')'; ctx.lineWidth = 2 / z;
  ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832); ctx.stroke();
  ctx.beginPath(); for (let k = 0; k < 16; k++) { const a = k * 0.3927, c = Math.cos(a), s = Math.sin(a); ctx.moveTo(x + c * (r - 5 / z), y + s * (r - 5 / z)); ctx.lineTo(x + c * (r + 5 / z), y + s * (r + 5 / z)); } ctx.stroke();
  if (label) { ctx.fillStyle = 'rgba(232,244,255,' + Math.min(1, alpha + 0.3) + ')'; ctx.font = 'bold ' + (11 / z) + 'px monospace'; ctx.fillText(label, x + r * 0.71 + 4 / z, y - r * 0.71 - 4 / z); }
}

// R18 fix list 6 (Jamie: "a graphic beside the track saying what sensor is responsible for its current fix"): the sense behind
// the latest fix, as a short coloured tag. RDR through walls says how many ("RDR 2W": fuzzy, shrinks only while tracked).
// Jamie (r18-s9): "change eye to vis. Also have the types stack, all in cyan, and the one that's winning is highlighted gold":
// one tag per sense that fixed it within TAG_KEEP s, stacked; gold = the sense behind the current fix, cyan = the rest.
// R18 fix list 13 (Jamie: "Let's go to the industry standard"): EO electro-optical, ESM electronic support measures, ACO acoustic,
// MZL muzzle flash, LINK a shared (datalink) track. The suit letters after it = which of your suits made that fix lately.
const TAGS = { EYES: 'EO', RADAR: 'RDR', PASSIVE: 'ESM', THERMAL: 'IR', SOUND: 'ACO', FLASH: 'MZL', ALARM: 'LINK', GHOST: 'GHOST', SCAN: 'SCAN' }; // R19: the pre-drop scan's blip (R24: SCAN, was SHIP: SHIP is the ship)
const TAG_ORDER = ['EYES', 'RADAR', 'THERMAL', 'PASSIVE', 'FLASH', 'SOUND', 'ALARM', 'GHOST', 'SCAN'];
export function sensorTags(c): { t: string; win: boolean; noise: boolean; none?: boolean }[] {
  const seen = c.seen || {}, out = [];
  for (const s of TAG_ORDER) {
    const win = s === c.src;
    if (!win && !(seen[s] !== undefined && G.time - seen[s] <= TUNE.TAG_KEEP)) continue;
    const B = (c.by || {})[s] || {}, who = Object.keys(B).filter(l => G.time - B[l] <= TUNE.TAG_KEEP).sort().join('+');
    out.push({ t: TAGS[s] + (who ? ' ' + who : '') + (win && s === 'RADAR' && c.walls ? ' ' + c.walls + 'W' : ''), win, noise: win && c.noisy && (c.q || 0) < 0.5 }); // noise = amber dashed outline, not a word
  }
  out.sort((a, b) => (b.win ? 1 : 0) - (a.win ? 1 : 0)); // the winning sense on top
  if (c.irNone !== undefined && G.time - c.irNone <= TUNE.TAG_KEEP && !out.some(g => g.t.startsWith('IR'))) out.push({ t: 'IR', win: false, noise: false, none: true }); // R18 fix list 17: looked, no heat
  return out;
}
// R18 fix list 5: lay the labels out top to bottom; one that would overlap a label already placed moves down past it, and a
// moved label gets a thin line back to its contact.
function drawLabels(labels, z) {
  const pad = 3 / z; // R24 (C25): the frame's shared label space (suit names and PAINTED claim theirs first)
  labels.sort((a, b) => a.y - b.y || a.x - b.x);
  for (const L of labels) {
    ctx.font = 'bold ' + (10 / z) + 'px monospace';
    const tw = Math.max(0, ...L.tags.map(g => ctx.measureText(g.t).width)) + 6 / z, th = 14 / z; // the tag column
    let w = 0, h = 0; for (const l of L.lines) { ctx.font = l.font; w = Math.max(w, ctx.measureText(l.t).width); h += l.h; }
    h = Math.max(h, L.tags.length * th);
    const wTot = tw + 4 / z + w, zc = camZ(), edge = V.safe ? V.camX + (V.safe.r - vw / 2) / zc : Infinity; // R24 B7 (C07): a label that would run under the right-hand buttons flips to the left of its contact
    const x0 = Math.max(L.x - 14 / z - wTot, Math.min(L.x + 14 / z, edge - wTot)); // slide left only as far as it needs
    const y0 = labelSpot(x0, L.y + 4 - 11 / z, wTot, h, pad);
    ctx.globalAlpha = L.a;
    if (y0 > L.y + 4 - 11 / z + 1e-6) { ctx.strokeStyle = '#e8f4ff'; ctx.lineWidth = 1 / z; ctx.beginPath(); ctx.moveTo(L.x + 6, L.y); ctx.lineTo(x0 - 2 / z, y0 + 6 / z); ctx.stroke(); }
    ctx.globalAlpha = L.a * (L.old ? 0.55 : 1); // a stale track's tags dim
    ctx.font = 'bold ' + (10 / z) + 'px monospace'; ctx.lineWidth = 1.5 / z;
    L.tags.forEach((g, i) => {
      const ty = y0 + 1 / z + i * th, col = g.win ? '#fc3' : g.none ? '#6a7684' : '#3dd'; // none = grey, struck through
      if (g.win) { ctx.fillStyle = 'rgba(255,204,51,0.22)'; ctx.fillRect(x0, ty, tw, 12 / z); }
      ctx.strokeStyle = ctx.fillStyle = col; ctx.strokeRect(x0, ty, tw, 12 / z); ctx.fillText(g.t, x0 + 3 / z, ty + 9.5 / z);
      if (g.none) { ctx.beginPath(); ctx.moveTo(x0, ty + 12 / z); ctx.lineTo(x0 + tw, ty); ctx.stroke(); }
      if (g.noise) { ctx.strokeStyle = '#e0a040'; ctx.setLineDash([3 / z, 2 / z]); ctx.strokeRect(x0 - 2 / z, ty - 2 / z, tw + 4 / z, 16 / z); ctx.setLineDash([]); } // R18: NOISE still blurring this fix
    });
    ctx.globalAlpha = L.a;
    let ly = y0 + 11 / z;
    for (const l of L.lines) { ctx.fillStyle = l.col; ctx.font = l.font; ctx.fillText(l.t, x0 + tw + 4 / z, ly); ly += l.h; }
  }
  ctx.globalAlpha = 1;
}
// R18 fix list 14: a small shield (cover) centred at (x, y), half-height s (world units)
function shield(x: number, y: number, s: number, col: string) {
  ctx.beginPath(); ctx.moveTo(x - s * 0.8, y - s); ctx.lineTo(x + s * 0.8, y - s); ctx.lineTo(x + s * 0.8, y - s * 0.1);
  ctx.quadraticCurveTo(x + s * 0.75, y + s * 0.7, x, y + s); ctx.quadraticCurveTo(x - s * 0.75, y + s * 0.7, x - s * 0.8, y - s * 0.1); ctx.closePath();
  ctx.fillStyle = 'rgba(20,20,10,0.85)'; ctx.fill(); ctx.strokeStyle = col; ctx.lineWidth = s * 0.28; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x, y - s * 0.6); ctx.lineTo(x, y + s * 0.55); ctx.stroke();
}
// R19: a zone the scan placed but couldn't name (SHORT): a grey dashed outline and "ZONE ?"
function zoneOutline(zn, z: number) {
  ctx.fillStyle = 'rgba(200,200,200,0.08)'; ctx.beginPath(); for (const t of zn.tiles) ctx.rect(t.x * T, t.y * T, T, T); ctx.fill();
  ctx.strokeStyle = 'rgba(200,200,200,0.55)'; ctx.lineWidth = 2 / z; ctx.setLineDash([6 / z, 5 / z]); ctx.beginPath();
  for (const t of zn.tiles) {
    const x = t.x * T, y = t.y * T, me = (a: number, b: number) => zoneAtTile(a, b) === zn;
    if (!me(t.x, t.y - 1)) { ctx.moveTo(x, y); ctx.lineTo(x + T, y); }
    if (!me(t.x, t.y + 1)) { ctx.moveTo(x, y + T); ctx.lineTo(x + T, y + T); }
    if (!me(t.x - 1, t.y)) { ctx.moveTo(x, y); ctx.lineTo(x, y + T); }
    if (!me(t.x + 1, t.y)) { ctx.moveTo(x + T, y); ctx.lineTo(x + T, y + T); }
  }
  ctx.stroke(); ctx.setLineDash([]);
  ctx.fillStyle = 'rgba(220,220,220,0.75)'; ctx.font = 'bold ' + (11 / z) + 'px monospace'; ctx.fillText('ZONE ?', (zn.x - 1.5) * T, (zn.y + 0.5) * T + 4 / z);
}
// ============================ R19 cp3: THE RWR SCOPE ============================
// Around the selected ExoS: three range rings (close / medium / far, a fixed size on screen: a guess from signal strength, not a
// map distance). Heard standing = a sharp spoke to its band's ring. Heard moving = a faint frozen spoke as received, a dashed
// re-aimed wedge over the guessed emitter strip, an arc between; and on the map a "heard here" tick with its world-fixed
// bearing line. Tap a spoke or wedge: its tick lights up and an ID line shows.
const RWR_R = 70; // screen px of the far ring
const rwrCol = (w) => w.kind === 'LOCK' ? '255,70,70' : '255,177,74';
// where each warning's tip sits now (world coords): the spoke's tip, or the wedge's centre on its ring
export function rwrTips(p, z: number) {
  if (!p || p.dead || !p.rwr || !active(p, 'rwr')) return [];
  const R = RWR_R * V.uiS / z;
  return p.rwr.map(w => {
    const r = R * (BANDS.indexOf(w.band) + 1) / 3, mv = heardMoving(w, p.x, p.y), W = mv ? rwrWedge(w, p.x, p.y) : null;
    const a = mv && !W.stale ? W.centre : w.ang;
    return { w, r, mv, W, a, x: p.x + Math.cos(a) * r, y: p.y + Math.sin(a) * r };
  });
}
// R19 fix list 1: the built-in RWR on every suit: a red dashed ring and "PAINTED · round N" (no bearing), fading
function drawPainted(z: number) {
  if (!TUNE.RWR_ENABLED || !TUNE.RWR_BASELINE) return;
  for (const m of G.lance) {
    const a = m.dead || m.out ? 0 : paintFade(m); if (!a) continue;
    const r = 24 + 3 * Math.sin(performance.now() / 160);
    ctx.strokeStyle = 'rgba(255,70,70,' + 0.9 * a + ')'; ctx.lineWidth = 3 / z; ctx.setLineDash([5 / z, 4 / z]);
    ctx.beginPath(); ctx.arc(m.x, m.y, r, 0, 6.2832); ctx.stroke(); ctx.setLineDash([]);
    const zl = z / V.uiS; ctx.font = 'bold ' + (11 / zl) + 'px monospace'; ctx.fillStyle = 'rgba(255,110,110,' + a + ')'; ctx.textAlign = 'center';
    const S = suitLab.get(m.id); ctx.fillText('PAINTED · round ' + m.paintTurn, m.x, S && S.paint !== undefined ? S.paint + 11 / zl : m.y + r + 14 / zl); ctx.textAlign = 'left'; // R24 (C25)
  }
}
function drawRwr(p, z: number) {
  if (!p || p.dead || !active(p, 'rwr') || !TUNE.RWR_ENABLED) return;
  const R = RWR_R * V.uiS / z, tips = rwrTips(p, z);
  ctx.strokeStyle = 'rgba(255,177,74,0.28)'; ctx.lineWidth = 1.5 / z; // the rings
  for (let k = 1; k <= 3; k++) { ctx.beginPath(); ctx.arc(p.x, p.y, R * k / 3, 0, 6.2832); ctx.stroke(); }
  for (const t of tips) {
    const w = t.w, al = rwrFade(w), col = rwrCol(w), sel = V.rwrSel === w.id;
    // on the map: the "heard here" tick and its world-fixed bearing line (moving, or picked)
    if (t.mv || sel) {
      const [near, far] = TUNE.RWR_BANDS[w.band], ux = Math.cos(w.ang), uy = Math.sin(w.ang);
      ctx.strokeStyle = 'rgba(' + col + ',' + (sel ? 0.9 : 0.4) * al + ')'; ctx.lineWidth = (sel ? 3 : 2) / z; ctx.setLineDash([6 / z, 5 / z]);
      ctx.beginPath(); ctx.moveTo(w.x, w.y); ctx.lineTo(w.x + ux * far * T, w.y + uy * far * T); ctx.stroke(); ctx.setLineDash([]);
      ctx.lineWidth = (sel ? 7 : 5) / z; ctx.strokeStyle = 'rgba(' + col + ',' + 0.35 * al + ')'; // the guessed strip
      ctx.beginPath(); ctx.moveTo(w.x + ux * near * T, w.y + uy * near * T); ctx.lineTo(w.x + ux * far * T, w.y + uy * far * T); ctx.stroke();
      const k = (sel ? 10 : 7) / z; ctx.strokeStyle = sel ? '#fff' : 'rgba(' + col + ',' + al + ')'; ctx.lineWidth = (sel ? 3 : 2) / z; // the tick: across the bearing
      ctx.beginPath(); ctx.moveTo(w.x - uy * k, w.y + ux * k); ctx.lineTo(w.x + uy * k, w.y - ux * k); ctx.stroke();
    }
    // on the scope
    ctx.strokeStyle = 'rgba(' + col + ',' + (t.mv ? 0.35 : 1) * al + ')'; ctx.lineWidth = (t.mv ? 1.5 : 3) / z; // the spoke (frozen when moving)
    ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + Math.cos(w.ang) * t.r, p.y + Math.sin(w.ang) * t.r); ctx.stroke();
    if (t.mv && !t.W.stale) {
      ctx.strokeStyle = 'rgba(' + col + ',' + 0.9 * al + ')'; ctx.fillStyle = 'rgba(' + col + ',' + 0.12 * al + ')'; ctx.lineWidth = 2 / z; ctx.setLineDash([5 / z, 4 / z]);
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.arc(p.x, p.y, t.r, t.W.from, t.W.to); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.setLineDash([]);
      const d = Math.atan2(Math.sin(t.W.centre - w.ang), Math.cos(t.W.centre - w.ang)); // the arc: frozen spoke → wedge centre
      ctx.lineWidth = 1.5 / z; ctx.beginPath(); ctx.arc(p.x, p.y, t.r, w.ang, w.ang + d, d < 0); ctx.stroke();
    }
    // the tip: the warning type (open sweep arc = SEARCH, filled diamond = LOCK) and the best-guess ID
    const s = 6 / z; ctx.fillStyle = ctx.strokeStyle = 'rgba(' + col + ',' + al + ')'; ctx.lineWidth = 2 / z;
    if (w.kind === 'LOCK') { ctx.beginPath(); ctx.moveTo(t.x, t.y - s); ctx.lineTo(t.x + s, t.y); ctx.lineTo(t.x, t.y + s); ctx.lineTo(t.x - s, t.y); ctx.closePath(); ctx.fill(); }
    else { ctx.beginPath(); ctx.arc(t.x, t.y, s, t.a - 1.2, t.a + 1.2); ctx.stroke(); ctx.beginPath(); ctx.arc(t.x, t.y, 1.5 / z, 0, 6.2832); ctx.fill(); }
    if (sel) { ctx.strokeStyle = '#fff'; ctx.beginPath(); ctx.arc(t.x, t.y, 11 / z, 0, 6.2832); ctx.stroke(); }
    const zl = z / V.uiS; ctx.font = 'bold ' + (11 / zl) + 'px monospace'; ctx.fillStyle = 'rgba(' + col + ',' + al + ')';
    const lab = rwrGuess(w.id) + (t.mv && t.W.stale ? ' · stale' : '');
    ctx.fillText(lab, t.x + 9 / z, t.y - 6 / z);
    if (sel) { ctx.font = (11 / zl) + 'px monospace'; ctx.fillText(w.kind + ' · ' + w.band.toLowerCase() + ' ' + TUNE.RWR_BANDS[w.band].join('–') + 't · ' + (t.mv ? 'heard moving' : 'heard here') + ' · round ' + w.turn, t.x + 9 / z, t.y + 8 / z); }
  }
}
// R14: the contact's name on the map
export function contactLabel(c) {
  const o = G.obs[c.id], d = G.ids[c.id], u = unitById(c.id);
  const name = o && o.var && u ? u.type + ' ' + o.var : d ? d.v + '?' : c.snd ? '' : 'UNKNOWN';
  const fits = TUNE.ID_SHOW_FITS && !(o && o.var) && hasReading(o) ? ' · ' + matchVariants(o).length + ' fit' : ''; // R14 debrief 1
  return (c.snd ? (name ? name + ' · SOUND' : 'SOUND') : name) + fits;
}
// ============================ RENDER ==================================
export const cv: any = document.getElementById('cv'), ctx = cv.getContext('2d');
export let vw = 0, vh = 0, dpr = 1;
export function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, TUNE.DPR_MAX);
  vw = window.innerWidth; vh = window.innerHeight;
  cv.width = Math.round(vw * dpr); cv.height = Math.round(vh * dpr);
  // R18 fix (Jamie: iPad split screen, "autoscale correctly"): the in-hunt controls scale with the window (phone landscape = 1;
  // an iPad Pro full screen ≈ 1.6; never below UI_MIN), and every open panel is fitted to the window height.
  V.hudOver = false; // R24 B6: re-check the full HUD block against the new window
  V.uiS = Math.max(TUNE.UI_MIN, Math.min(TUNE.UI_MAX, vh / TUNE.UI_REF_H, vw / TUNE.UI_REF_W));
  document.documentElement.style.setProperty('--s', String(V.uiS));
  const top = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--top')) || 0;
  const rc = document.getElementById('rcol'); if (rc) rc.style.maxHeight = Math.max(200, (vh - top - 16) / V.uiS) + 'px'; // wraps into a 2nd column when short
  fitPanels();
}
// Fit each open panel: as big as the window scale allows, shrunk until its content fits the height (it scrolls below UI_MIN).
export function fitPanels() {
  for (const el of Array.from(document.querySelectorAll('.panel, #hsbox')) as HTMLElement[]) {
    if (el.hidden || (el.id === 'hsbox' && document.getElementById('hsheet').hidden)) continue;
    (el.style as any).zoom = '1';
    const need = el.id === 'hsbox' ? el.scrollHeight / 0.8 : contentHeight(el); // the sheet may take 80% of the height
    (el.style as any).zoom = String(Math.max(Math.min(V.uiS, TUNE.UI_PANEL_MIN), Math.min(V.uiS, need > 0 ? window.innerHeight / need : V.uiS))); // R19: never below UI_PANEL_MIN; it scrolls instead
  }
}
function contentHeight(el: HTMLElement) { // the panel's own height at zoom 1 if nothing were cut: its children plus padding
  const cs = getComputedStyle(el), kids = Array.from(el.children) as HTMLElement[];
  if (cs.flexDirection === 'row') return Math.max(...kids.map(k => k.scrollHeight)) + parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
  return el.scrollHeight;
}
// Re-fit whenever a panel opens or closes (any screen), without touching every place that shows one
new MutationObserver(() => fitPanels()).observe(document.body, { subtree: true, attributes: true, attributeFilter: ['hidden'] });
// R24 (C25): the suits' labels claim their spots before the contacts' labels are laid out, so nothing prints on top
const suitLab = new Map<string, { top: number; fs: number; top2?: number; paint?: number }>();
const suitName = (m) => m.id + (m.op ? ' ' + m.op.name.split(' ')[0] + (m.op.lvl >= 2 ? '★' : '') : '');
const carryText = (m) => 'carrying ' + G.lance.filter(d => d.carriedBy === m.id).map(d => d.id).join(' ');
const critText = (m) => m.id + ' ' + (m.op ? m.op.name.split(' ')[0] + ' ' : '') + (m.carriedBy ? 'CARRIED BY ' + m.carriedBy : 'CRITICAL');
function reserveSuitLabels(z: number) {
  suitLab.clear(); const fs = 12 / z, pad = 2 / z;
  for (const m of G.lance) {
    if (m.dead && !m.crit) continue;
    ctx.font = 'bold ' + fs + 'px monospace';
    if (m.dead) { // CRITICAL: a line above the carry ring, a hint below it (both centred)
      const R = TUNE.OP_CARRY_RANGE * T, w = ctx.measureText(critText(m)).width;
      const top = labelSpot(m.x - w / 2, m.y - R - 6 / z - fs, w, fs * 1.2, pad);
      let top2: number | undefined;
      if (!m.carriedBy) { ctx.font = (10 / z) + 'px monospace'; const w2 = ctx.measureText('end a lancemate’s turn in the ring to carry them').width; top2 = labelSpot(m.x - w2 / 2, m.y + R + 2 / z, w2, 12 / z, pad); }
      suitLab.set(m.id, { top, fs, top2 }); continue;
    }
    const carry = G.lance.some(d => d.carriedBy === m.id), w = Math.max(ctx.measureText(suitName(m)).width, carry ? ctx.measureText(carryText(m)).width : 0);
    const top = labelSpot(m.x + 12, m.y - 10 - fs, w, fs * 1.2 + (carry ? 14 / z : 0), pad);
    const S: any = { top, fs };
    if (G.mode === 'hunt' && !m.out && paintFade(m) > 0) { // PAINTED · round N, centred under the suit
      const zl = z / V.uiS; ctx.font = 'bold ' + (11 / zl) + 'px monospace'; const t = 'PAINTED · round ' + m.paintTurn, pw = ctx.measureText(t).width;
      S.paint = labelSpot(m.x - pw / 2, m.y + 27 + 3 / zl, pw, 13 / zl, pad);
    }
    suitLab.set(m.id, S);
  }
}
export function render() {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = '#111'; ctx.fillRect(0, 0, vw, vh);
  const z = camZ();
  resetLabels(); // R24 (C25)
  ctx.setTransform(dpr * z, 0, 0, dpr * z, dpr * (vw / 2 - V.camX * z), dpr * (vh / 2 - V.camY * z));
  // ground
  ctx.fillStyle = '#2c2d30'; ctx.fillRect(0, 0, W * T, H * T);
  const x0 = Math.max(0, Math.floor((V.camX - vw / 2 / z) / T)), x1 = Math.min(W - 1, Math.floor((V.camX + vw / 2 / z) / T));
  const y0 = Math.max(0, Math.floor((V.camY - vh / 2 / z) / T)), y1 = Math.min(H - 1, Math.floor((V.camY + vh / 2 / z) / T));
  // R16: ground clutter (scrap, glass, rubble): a brown tile with a few seeded specks. Slow and loud to cross, low cover.
  ctx.fillStyle = '#4a4033'; ctx.beginPath();
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (clutter[y * W + x]) ctx.rect(x * T, y * T, T, T);
  ctx.fill();
  ctx.fillStyle = '#7d6c52'; ctx.beginPath();
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (clutter[y * W + x])
    for (let k = 0; k < 4; k++) { const h = (x * 73 + y * 151 + k * 37) % 97; ctx.rect(x * T + (h % 9) * 3 + 2, y * T + ((h * 7) % 9) * 3 + 2, 4, 3); }
  ctx.fill();
  // extraction zone (green = information)
  ctx.fillStyle = 'rgba(60,200,90,0.25)'; ctx.fillRect((W - TUNE.EXTRACT_COLS) * T, 0, TUNE.EXTRACT_COLS * T, H * T);
  // R10: signal terrain (always known: it's terrain, not intel). QUIET = cool blue, dotted edge;
  // NOISE = amber, diagonal hatching + dashed edge. Faint, under everything else.
  const zk = zoneKnow(); // R19: what the scan told you: 0 nothing, 1 grey outlines (type unknown), 2 the zones as before
  for (const zn of zk ? G.zones || [] : []) {
    const k = zoneKnowOf(zn); if (!k) continue; // R20: the live scan learns zone by zone
    if (k < 2) { zoneOutline(zn, z); continue; }
    const q = zn.type === 'QUIET';
    ctx.fillStyle = q ? 'rgba(90,150,255,0.24)' : 'rgba(255,200,70,0.12)';
    ctx.beginPath(); for (const t of zn.tiles) ctx.rect(t.x * T, t.y * T, T, T); ctx.fill();
    ctx.lineWidth = 1.5 / z;
    if (!q) { // hatching: one diagonal per tile lines up into continuous stripes
      ctx.strokeStyle = 'rgba(255,200,70,0.22)'; ctx.beginPath();
      for (const t of zn.tiles) { ctx.moveTo(t.x * T, t.y * T + T); ctx.lineTo(t.x * T + T, t.y * T); }
      ctx.stroke();
    }
    ctx.strokeStyle = q ? 'rgba(120,175,255,0.7)' : 'rgba(255,200,70,0.7)'; ctx.lineWidth = 2 / z;
    ctx.setLineDash(q ? [2 / z, 5 / z] : [9 / z, 5 / z]); ctx.beginPath();
    for (const t of zn.tiles) { // edges where the neighbour isn't this zone
      const x = t.x * T, y = t.y * T, me = k => zoneAtTile(k[0], k[1]) === zn;
      if (!me([t.x, t.y - 1])) { ctx.moveTo(x, y); ctx.lineTo(x + T, y); }
      if (!me([t.x, t.y + 1])) { ctx.moveTo(x, y + T); ctx.lineTo(x + T, y + T); }
      if (!me([t.x - 1, t.y])) { ctx.moveTo(x, y); ctx.lineTo(x, y + T); }
      if (!me([t.x + 1, t.y])) { ctx.moveTo(x + T, y); ctx.lineTo(x + T, y + T); }
    }
    ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = q ? 'rgba(150,195,255,0.75)' : 'rgba(255,210,100,0.75)'; ctx.font = 'bold ' + (11 / z) + 'px monospace';
    ctx.fillText((q ? 'QUIET ' : 'NOISE ') + zn.name.replace(/ \(.*\)/, ''), (zn.x - 2.5) * T, (zn.y + 0.5) * T + 4 / z);
    if (V.dbg) { ctx.fillStyle = '#d0f'; ctx.fillText('DBG ' + zn.type + ' ' + zn.tiles.length + 't', (zn.x - 2.5) * T, (zn.y + 1.5) * T); }
  }
  // buildings (only visible tiles); R16: set pieces (gantries, containers, wrecks) in rust, outlined: walls you can't see past
  ctx.fillStyle = '#6b6d72'; ctx.beginPath();
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (solid[y * W + x] === 1) ctx.rect(x * T, y * T, T, T);
  ctx.fill();
  ctx.fillStyle = '#7a5a3c'; ctx.strokeStyle = '#a07a50'; ctx.lineWidth = 2 / z; ctx.beginPath();
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (solid[y * W + x] === 2) ctx.rect(x * T + 1, y * T + 1, T - 2, T - 2);
  ctx.fill(); ctx.stroke();
  const p = G.p;
  // Round 5: uplink point (gold): ring = where UPLINK works, diamond = the point, progress label (R15: uplink jobs only)
  if (isType('UPLINK')) {
    const U = G.up, r = (TUNE.UPLINK_RADIUS + 0.5) * T;
    ctx.strokeStyle = ctx.fillStyle = '#fc3'; ctx.lineWidth = 3 / z;
    ctx.globalAlpha = 0.15; ctx.beginPath(); ctx.arc(U.x, U.y, r, 0, 6.2832); ctx.fill(); ctx.globalAlpha = 1;
    ctx.beginPath(); ctx.arc(U.x, U.y, r, 0, 6.2832); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(U.x, U.y - 11); ctx.lineTo(U.x + 11, U.y); ctx.lineTo(U.x, U.y + 11); ctx.lineTo(U.x - 11, U.y); ctx.closePath(); ctx.stroke();
    ctx.font = 'bold ' + (13 / z) + 'px monospace';
    ctx.fillText('UPLINK ' + U.prog + '/' + TUNE.UPLINK_TURNS, U.x - 34 / z, U.y - r - 6 / z);
  }
  // R15 Retrieve: the cargo crate on its tile (gold square + pickup ring), or a gold box around the carrier
  if (isType('RETRIEVE')) {
    const c = carrier(), r = (TUNE.UPLINK_RADIUS + 0.5) * T;
    ctx.strokeStyle = ctx.fillStyle = '#fc3'; ctx.lineWidth = 3 / z;
    if (!c) {
      const U = G.up;
      ctx.globalAlpha = 0.15; ctx.beginPath(); ctx.arc(U.x, U.y, r, 0, 6.2832); ctx.fill(); ctx.globalAlpha = 1;
      ctx.beginPath(); ctx.arc(U.x, U.y, r, 0, 6.2832); ctx.stroke();
      ctx.fillRect(U.x - 8, U.y - 8, 16, 16);
      ctx.font = 'bold ' + (13 / z) + 'px monospace'; ctx.fillText('CARGO', U.x - 22 / z, U.y - r - 6 / z);
    } else if (!c.dead) ctx.strokeRect(c.x - 14, c.y - 14, 28, 28);
  }
  // R15 Escort: every route leg as a faint line (the leg being walked brighter), the transport, and the route buttons at a fork
  if (isType('ESCORT') && G.ally) {
    const a = G.ally;
    anchors().legs.forEach((_, i) => {
      const P = legPath(i), on = i === a.leg;
      ctx.strokeStyle = on ? 'rgba(120,230,160,0.7)' : 'rgba(120,230,160,0.22)'; ctx.lineWidth = (on ? 4 : 3) / z; ctx.setLineDash(on ? [] : [10 / z, 8 / z]);
      ctx.beginPath(); ctx.moveTo(P[0].x, P[0].y); for (let k = 1; k < P.length; k++) ctx.lineTo(P[k].x, P[k].y); ctx.stroke(); ctx.setLineDash([]);
    });
    ctx.font = 'bold ' + (12 / z) + 'px monospace';
    if (a.dead) { ctx.strokeStyle = ctx.fillStyle = '#888'; ctx.lineWidth = 4 / z; ctx.beginPath(); ctx.moveTo(a.x - 10, a.y - 10); ctx.lineTo(a.x + 10, a.y + 10); ctx.moveTo(a.x + 10, a.y - 10); ctx.lineTo(a.x - 10, a.y + 10); ctx.stroke(); ctx.fillText('TRANSPORT ✕', a.x + 12, a.y - 10); }
    else {
      ctx.fillStyle = '#7e9'; ctx.beginPath(); ctx.moveTo(a.x, a.y - 12); ctx.lineTo(a.x + 12, a.y); ctx.lineTo(a.x, a.y + 12); ctx.lineTo(a.x - 12, a.y); ctx.closePath(); ctx.fill();
      ctx.fillText('TRANSPORT ' + a.hits + '/' + a.maxHits, a.x + 14, a.y - 12);
    }
    // R16 (Jamie): the next move's end: a ring where it will stop (HOLD = on the spot)
    const nx = allyNextStop();
    if (nx) {
      ctx.strokeStyle = '#fc3'; ctx.lineWidth = 3 / z; ctx.setLineDash([6 / z, 4 / z]); ctx.beginPath(); ctx.arc(nx.x, nx.y, 14 / z + 6, 0, 6.2832); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = '#fc3'; ctx.font = 'bold ' + (11 / z) + 'px monospace';
      ctx.fillText(nx.why === 'HOLD' ? 'HOLDS' : nx.why === 'FORK' ? 'NEXT MOVE · waits at fork' : nx.why === 'END' ? 'NEXT MOVE · out' : 'NEXT MOVE', nx.x + 16 / z + 6, nx.y + 4 / z);
    }
    // R16 (Jamie: railway levers): a route button on every fork ahead. Lit = the lever is set (it will carry on that way)
    for (const f of forksAhead()) for (const l of f.legs) {
      const b = routeBtn(l.i), r = 30 / z, set = f.set === l.i, waiting = a.leg < 0 && a.node === f.node; // R17: clear of the HUD
      ctx.fillStyle = set ? 'rgba(120,230,160,0.9)' : 'rgba(30,60,40,0.85)'; ctx.strokeStyle = waiting && f.set < 0 ? '#fc3' : '#7e9'; ctx.lineWidth = 3 / z;
      ctx.beginPath(); ctx.arc(b.x, b.y, r, 0, 6.2832); ctx.fill(); ctx.stroke();
      ctx.fillStyle = set ? '#062' : '#bfe'; ctx.font = 'bold ' + (12 / z) + 'px monospace'; ctx.textAlign = 'center'; ctx.fillText((set ? '✓ ' : '') + (l.name || 'ROUTE'), b.x, b.y + 4 / z); ctx.textAlign = 'left';
    }
  }
  // R15 Bounty: the price of a kill pops over the wreck for a moment
  if (G.pop) {
    ctx.globalAlpha = Math.min(1, G.pop.t); ctx.fillStyle = '#fc3'; ctx.font = 'bold ' + (15 / z) + 'px monospace';
    ctx.fillText('+' + G.pop.b + ' cr ' + G.pop.v, G.pop.x - 30 / z, G.pop.y - 18 / z - (2.5 - G.pop.t) * 12 / z); ctx.globalAlpha = 1;
  }
  // R17: a drawn path: cyan up to where this turn's AP runs out, then red dashed past it (r17-s2, Jamie: no stop circle).
  // A hollow handle at the end (drag it to carry on). Each facing waypoint: a diamond, a tick along its facing, and a faint
  // eyes cone (where it will look as it walks). The point LOOK is aiming pulses.
  if (G.plan && G.plan.drawn && !G.act && G.phase === 'PLAYER') {
    const pl = G.plan, F = pl.full, P = pl.path;
    if (pl.cut || !P) {
      ctx.strokeStyle = 'rgba(255,110,80,0.75)'; ctx.lineWidth = 3 / z; ctx.setLineDash([7 / z, 6 / z]); ctx.beginPath(); ctx.moveTo(F[0].x, F[0].y);
      for (let i = 1; i < F.length; i++) ctx.lineTo(F[i].x, F[i].y);
      ctx.stroke(); ctx.setLineDash([]);
    }
    for (const w of pl.wps) { const q = F[w.i]; eyesCone(q.x, q.y, w.fx, w.fy, 0.1); }
    if (P) {
      ctx.strokeStyle = '#8fe3ff'; ctx.lineWidth = 3.5 / z; ctx.beginPath(); ctx.moveTo(P[0].x, P[0].y);
      for (let i = 1; i < P.length; i++) ctx.lineTo(P[i].x, P[i].y);
      ctx.stroke();
      const q = P[P.length - 1];
      const sr = pl.snd * (zoneAtTile(Math.floor(q.x / T), Math.floor(q.y / T))?.type === 'QUIET' ? TUNE.ZONE_TYPES.QUIET.SIG_MULT : 1);
      soundRing(q.x, q.y, sr * T, z, 0.22);
      ctx.fillStyle = pl.cut ? '#ff8a5c' : '#8fe3ff'; ctx.font = 'bold ' + (12 / z) + 'px monospace';
      ctx.fillText(pl.ap + 'AP ' + pl.en + 'EN snd ' + Math.round(sr * 10) / 10 + (pl.wps.length ? ' · ' + pl.wps.length + ' look' + (pl.wps.length > 1 ? 's' : '') : ''), q.x + 10, q.y - 10);
    } else { ctx.fillStyle = '#ff8a5c'; ctx.font = 'bold ' + (12 / z) + 'px monospace'; ctx.fillText('NO MOVE · ' + pl.why, F[0].x + 14, F[0].y - 14); }
    const e = F[F.length - 1]; // the end handle
    ctx.strokeStyle = 'rgba(143,227,255,0.85)'; ctx.lineWidth = 2.5 / z; ctx.beginPath(); ctx.arc(e.x, e.y, 13 / z, 0, 6.2832); ctx.stroke();
    ctx.fillStyle = 'rgba(143,227,255,0.25)'; ctx.fill();
    const kept = new Set(pl.wps.map(w => Math.round(w.d * 100)));
    for (const w of (G.planD ? G.planD.wps : [])) {
      const q = along(F, w.d); if (!q) continue;
      const on = kept.has(Math.round(w.d * 100)), d = Math.hypot(w.fx, w.fy) || 1;
      ctx.strokeStyle = ctx.fillStyle = on ? '#8fe3ff' : '#888'; ctx.lineWidth = 3 / z;
      ctx.beginPath(); ctx.moveTo(q.x, q.y - 9); ctx.lineTo(q.x + 9, q.y); ctx.lineTo(q.x, q.y + 9); ctx.lineTo(q.x - 9, q.y); ctx.closePath(); ctx.fill();
      const mk = markerPos(w, F); // r17-s3: the look marker (an eye): drag it to move where this point looks
      if (mk) {
        ctx.lineWidth = 1.5 / z; ctx.setLineDash([4 / z, 4 / z]); ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(mk.x, mk.y); ctx.stroke(); ctx.setLineDash([]);
        ctx.lineWidth = 2.5 / z; ctx.fillStyle = 'rgba(20,40,60,0.85)';
        ctx.beginPath(); ctx.ellipse(mk.x, mk.y, 14 / z, 8 / z, 0, 0, 6.2832); ctx.fill(); ctx.stroke();
        ctx.fillStyle = on ? '#8fe3ff' : '#888'; ctx.beginPath(); ctx.arc(mk.x, mk.y, 4 / z, 0, 6.2832); ctx.fill();
      }
      if (!on) { ctx.font = 'bold ' + (11 / z) + 'px monospace'; ctx.fillText('past the AP', q.x + 12, q.y - 8); }
    }
    const la = V.lookArm !== null ? along(F, V.lookArm) : V.wpMenu !== null ? along(F, V.wpMenu) : null;
    if (la) { ctx.strokeStyle = '#ff6'; ctx.lineWidth = 3 / z; ctx.beginPath(); ctx.arc(la.x, la.y, (12 + 4 * Math.sin(performance.now() / 150)) / z, 0, 6.2832); ctx.stroke(); }
  }
  // Round 4: move preview (faint = full route, bright = what you can afford, X = where you'll stop)
  if (G.plan && !G.plan.drawn && !G.act && G.phase === 'PLAYER') {
    const pl = G.plan;
    ctx.lineWidth = 2 / z;
    if (pl.cut) {
      ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.setLineDash([6 / z, 6 / z]); ctx.beginPath(); ctx.moveTo(p.x, p.y);
      for (let i = 1; i < pl.full.length; i++) ctx.lineTo(pl.full[i].x, pl.full[i].y);
      ctx.stroke(); ctx.setLineDash([]);
    }
    if (pl.path) {
      ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.beginPath(); ctx.moveTo(p.x, p.y);
      for (let i = 1; i < pl.path.length; i++) ctx.lineTo(pl.path[i].x, pl.path[i].y);
      ctx.stroke();
      const q = pl.path[pl.path.length - 1];
      ctx.beginPath(); ctx.moveTo(q.x - 7, q.y - 7); ctx.lineTo(q.x + 7, q.y + 7); ctx.moveTo(q.x + 7, q.y - 7); ctx.lineTo(q.x - 7, q.y + 7); ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.font = 'bold ' + (13 / z) + 'px monospace';
      // R13: the sound this move will make, as a faint ring at the destination (QUIET ground there muffles it)
      const sr = pl.snd * (zoneAtTile(Math.floor(q.x / T), Math.floor(q.y / T))?.type === 'QUIET' ? TUNE.ZONE_TYPES.QUIET.SIG_MULT : 1);
      soundRing(q.x, q.y, sr * T, z, 0.22);
      ctx.fillStyle = '#fff'; ctx.font = 'bold ' + (13 / z) + 'px monospace';
      ctx.fillText(pl.ap + 'AP ' + pl.en + 'EN snd ' + Math.round(sr * 10) / 10 + (pl.cut ? ' cut' : ''), q.x + 10, q.y - 10);
    }
  }
  // path
  if (p.path) {
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 2 / z; ctx.beginPath(); ctx.moveTo(p.x, p.y);
    for (let i = p.pi; i < p.path.length; i++) ctx.lineTo(p.path[i].x, p.path[i].y);
    ctx.stroke();
    const e = p.path[p.path.length - 1];
    ctx.beginPath(); ctx.moveTo(e.x - 6, e.y - 6); ctx.lineTo(e.x + 6, e.y + 6); ctx.moveTo(e.x + 6, e.y - 6); ctx.lineTo(e.x - 6, e.y + 6); ctx.stroke();
  }
  // debug: every field unit's true position, type, state, eyes, goal, its picture of you (magenta)
  if (V.dbg) for (const e of G.units) {
    if (e.dead) continue;
    ctx.strokeStyle = ctx.fillStyle = '#d0f'; ctx.lineWidth = 2 / z; ctx.strokeRect(e.x - 10, e.y - 10, 20, 20);
    { const a0 = Math.atan2(e.fy, e.fx), h = TUNE.EYES_HALF_ANG * Math.PI / 180; // eyes arc
      ctx.globalAlpha = 0.5; ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.arc(e.x, e.y, TUNE.EYES_RANGE * T, a0 - h, a0 + h); ctx.closePath(); ctx.stroke(); ctx.globalAlpha = 1; }
    ctx.font = (12 / z) + 'px monospace';
    ctx.fillText(e.type + ' ' + e.variant + ' ' + e.state + (e.radarOn ? ' RDR' : '') + ' h' + e.hits + ' a' + e.ammo + ' AP' + e.ap + ' EN' + Math.round(e.en) + ' EMIT' + Math.round(e.emit) + ' snd' + Math.round(soundRadius(e)) + (e.pack ? ' ' + e.pack + (e.packTgt ? '→' + e.packTgt : '') : '') + (zoneType(e) ? ' ' + zoneType(e) + ' eff' + Math.round(effEmit(e)) + (zoneType(e) === 'QUIET' ? ' sig×' + TUNE.ZONE_TYPES.QUIET.SIG_MULT : ' unc×' + TUNE.ZONE_TYPES.NOISE.UNC_MULT + '≥' + TUNE.ZONE_TYPES.NOISE.UNC_FLOOR + 't') : ''), e.x + 14, e.y - 12);
    ctx.globalAlpha = 0.3;
    for (const b of e.eb) if (b.on) { ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(b.x + Math.cos(b.ang) * 40 * T, b.y + Math.sin(b.ang) * 40 * T); ctx.stroke(); }
    ctx.globalAlpha = 1;
    // where this unit thinks you are: its best contact (solid = tracked, dashed = stale)
    const bc = bestContact(e.ec);
    if (bc) {
      const tr = bc.lost <= bc.gap;
      ctx.lineWidth = 2 / z; ctx.setLineDash(tr ? [] : [6 / z, 5 / z]);
      ctx.beginPath(); ctx.arc(bc.tx, bc.ty, Math.max(bc.unc, 6), 0, 6.2832); ctx.stroke(); ctx.setLineDash([]);
      ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.lineTo(bc.tx, bc.ty); ctx.globalAlpha = 0.25; ctx.stroke(); ctx.globalAlpha = 1;
      ctx.fillText(e.type[0] + ' THINKS ' + (bc.id === 'G' ? 'GHOST' : bc.id) + (tr ? '' : ' (stale)') + ' ±' + (bc.unc / T).toFixed(1) + 't', bc.tx + 10, bc.ty + 14 + 12 * G.units.indexOf(e) / z);
    }
    // its goal (patrol point / hunt target), with distance from the uplink
    if (e.goalX >= 0) {
      ctx.lineWidth = 2 / z; ctx.setLineDash([4 / z, 6 / z]);
      ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.lineTo(e.goalX, e.goalY); ctx.stroke(); ctx.setLineDash([]);
      ctx.strokeRect(e.goalX - 6, e.goalY - 6, 12, 12);
      ctx.fillText(e.goalK + ' goal ' + (Math.hypot(e.goalX - G.up.x, e.goalY - G.up.y) / T).toFixed(0) + 't from uplink', e.goalX + 10, e.goalY - 8);
    }
    if (e.radarOn && radarOf(e)) { // R18: cone from its radar row
      const R = radarOf(e), a0 = Math.atan2(e.fy, e.fx), h = R.halfAng * Math.PI / 180;
      ctx.fillStyle = 'rgba(220,0,255,0.08)'; ctx.beginPath(); ctx.moveTo(e.x, e.y);
      ctx.arc(e.x, e.y, R.range * T, a0 - h, a0 + h); ctx.closePath(); ctx.fill();
    }
    const er = heardRange(e) * T;
    if (er > 0) { ctx.strokeStyle = 'rgba(220,0,255,0.35)'; ctx.lineWidth = 2 / z; ctx.beginPath(); ctx.arc(e.x, e.y, er, 0, 6.2832); ctx.stroke(); }
  }
  if (V.dbg) { const a0 = Math.atan2(p.fy, p.fx), h = TUNE.EYES_HALF_ANG * Math.PI / 180; // your eyes arc
    ctx.strokeStyle = '#d0f'; ctx.lineWidth = 2 / z; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.arc(p.x, p.y, TUNE.EYES_RANGE * T, a0 - h, a0 + h); ctx.closePath(); ctx.stroke(); }
  // wrecks: destroyed units (red X at the true spot)
  for (const e of G.units) {
    if (!e.dead) continue;
    if (V.aarHl && V.aarHl.hl.foe.some(f => f.id === e.id)) continue; // R22 fix: the after-action page shows it as it was at that turn
    ctx.strokeStyle = '#f33'; ctx.lineWidth = 4 / z; ctx.beginPath();
    ctx.moveTo(e.x - 12, e.y - 12); ctx.lineTo(e.x + 12, e.y + 12); ctx.moveTo(e.x + 12, e.y - 12); ctx.lineTo(e.x - 12, e.y + 12); ctx.stroke();
    ctx.fillStyle = '#f66'; ctx.font = 'bold ' + (12 / z) + 'px monospace'; ctx.fillText(e.type + ' ✕', e.x + 14, e.y + 4); // R7 run1: named wreck
  }
  // shells in flight + impacts (red ring = hit, grey = miss)
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 3 / z;
  for (const s of G.shells) if (s.on) { ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x - s.vx * 12, s.y - s.vy * 12); ctx.stroke(); }
  for (const f of G.fx) {
    if (!f.on) continue;
    ctx.strokeStyle = f.hit ? '#f33' : '#aaa'; ctx.globalAlpha = f.t / 0.6;
    ctx.beginPath(); ctx.arc(f.x, f.y, (f.hit ? 16 : 8) * (1.6 - f.t), 0, 6.2832); ctx.stroke();
  }
  ctx.globalAlpha = 1;
  // noise ring (orange): how far a passive suite could hear you in open ground right now
  for (const m of G.lance) if (m !== p && !m.dead) { const r = heardRange(m) * T; if (r > 0) { ctx.strokeStyle = 'rgba(255,150,50,0.2)'; ctx.lineWidth = 2 / z; ctx.setLineDash([8 / z, 6 / z]); ctx.beginPath(); ctx.arc(m.x, m.y, r, 0, 6.2832); ctx.stroke(); ctx.setLineDash([]); } }
  const hr = p.dead ? 0 : heardRange(p) * T;
  if (hr > 0) { ctx.strokeStyle = 'rgba(255,150,50,0.45)'; ctx.lineWidth = 2 / z; ctx.setLineDash([8 / z, 6 / z]); ctx.beginPath(); ctx.arc(p.x, p.y, hr, 0, 6.2832); ctx.stroke(); ctx.setLineDash([]); }
  // R13: sound ring (this activation's sound; gone when it clears at the mech's next activation)
  for (const m of G.lance) if (!m.dead && m.sound > 0) soundRing(m.x, m.y, soundRadius(m) * T, z, m === p ? 0.55 : 0.3, m.id + ' SOUND ' + Math.round(soundRadius(m) * 10) / 10);
  // R13 s2 DBG: this round's alarms, a line from the alarming unit to each unit it alerted
  if (V.dbg) for (const a of G.alarmLog) {
    if (a.turn !== G.turn) continue;
    const f = unitById(a.from); if (!f) continue;
    ctx.strokeStyle = 'rgba(255,60,200,0.7)'; ctx.lineWidth = 2 / z; ctx.setLineDash([3 / z, 4 / z]);
    for (const id of a.to) { const t = unitById(id); if (t) { ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.lineTo(t.x, t.y); ctx.stroke(); } }
    ctx.setLineDash([]);
  }
  // radar cone (blue)
  for (const m of G.lance) if (m.radarOn && radarOf(m)) {
    const R = radarOf(m), a0 = Math.atan2(m.fy, m.fx), h = R.halfAng * Math.PI / 180;
    ctx.fillStyle = 'rgba(80,160,255,0.13)'; ctx.beginPath(); ctx.moveTo(m.x, m.y);
    ctx.arc(m.x, m.y, R.range * T, a0 - h, a0 + h); ctx.closePath(); ctx.fill();
  }
  // bearing lines (cyan)
  ctx.lineWidth = 2 / z; ctx.strokeStyle = '#3dd';
  for (const b of G.pb) {
    if (!b.on) continue;
    ctx.globalAlpha = 0.8 * (1 - b.age / TUNE.BEARING_LIFE);
    ctx.setLineDash(b.tri ? [] : [10 / z, 8 / z]); // dashed = jamming, bearing only
    ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(b.x + Math.cos(b.ang) * 80 * T, b.y + Math.sin(b.ang) * 80 * T); ctx.stroke();
  }
  ctx.setLineDash([]); ctx.globalAlpha = 1;
  // ghost decoy (purple)
  if (G.ghost.on) {
    const g = G.ghost; ctx.strokeStyle = '#b6f'; ctx.lineWidth = 2 / z; ctx.beginPath();
    ctx.moveTo(g.x, g.y - 10); ctx.lineTo(g.x + 10, g.y); ctx.lineTo(g.x, g.y + 10); ctx.lineTo(g.x - 10, g.y); ctx.closePath(); ctx.stroke();
  }
  // R24 A5 (C15): LAST SEEN marks: a faded dashed square where a contact dropped off the picture, with its round
  for (const k of V.lk.marks) {
    const a = 0.55 * (1 - (G.turn - k.turn) / (TUNE.LASTKNOWN_ROUNDS + 1));
    ctx.globalAlpha = a; ctx.strokeStyle = ctx.fillStyle = '#c9a070'; ctx.lineWidth = 1.5 / z; ctx.setLineDash([3 / z, 3 / z]);
    ctx.strokeRect(k.x - 7, k.y - 7, 14, 14); ctx.setLineDash([]);
    ctx.font = (10 / z) + 'px monospace'; ctx.fillText('last seen R' + k.turn, k.x + 10, k.y + 4 / z); ctx.globalAlpha = 1;
  }
  // contacts (red = tracked now, orange = lost/fading). R18 fix list 5: labels are collected here and laid out afterwards, so
  // contacts close together stack their labels instead of printing on top of each other.
  const labels: { c: any; x: number; y: number; a: number; lines: { t: string; col: string; font: string; h: number }[]; tags: { t: string; win: boolean; noise: boolean; none?: boolean }[]; old: boolean }[] = [];
  for (const c of G.pc) {
    if (!c.on) continue;
    const lost = c.lost > c.gap, a = 1 - Math.max(0, c.lost - c.gap) / (TUNE.CONTACT_LINGER + (c.keep || 0)), x = cx(c), y = cy(c); // R19: a ship's blip fades over its longer linger
    ctx.globalAlpha = Math.max(frozen(c.id) ? 0.55 : 0.1, a); // R14: a frozen (ID'd static) track stays readable
    ctx.strokeStyle = ctx.fillStyle = lost ? '#f90' : '#f33';
    ctx.lineWidth = 2 / z;
    ctx.beginPath(); ctx.arc(x, y, c.unc, 0, 6.2832); ctx.stroke();
    if (c.snd) { ctx.strokeRect(x - 5, y - 5, 10, 10); } else ctx.fillRect(x - 5, y - 5, 10, 10); // R13: hollow = heard only
    // damage read: updated only while you have a firm live fix; stale = last state seen, grey
    { // R7 run1: type label once your eyes have identified it (kept while the contact lives); damage only while seen
      const u = unitById(c.id), seen = u && !G.lance.includes(u) && !u.dead && G.lance.some(m => !m.dead && canSee(m, u, TUNE.EYES_RANGE));
      let d = '';
      if (seen) { d = partsRead(u); if (!/(scratched|bloodied|badly|gone)/.test(d)) d = 'no damage'; } // R12: per-part read while seen. R24 B8: an all-ok read is one short word
      const lab = contactLabel(c); // R14: UNKNOWN / SOUND / "scout?" (your call) / "PATROL scout" (eyes)
      const conf = !!(G.obs[c.id] && G.obs[c.id].var);
      const zl = z / V.uiS; // R18: label text scales with the window
      const L = [{ t: lab, col: conf ? '#fff' : G.ids[c.id] ? '#ffd27a' : '#e8f4ff', font: 'bold ' + (12 / zl) + 'px monospace', h: 13 / zl }];
      if (d) L.push({ t: d, col: '#fff', font: (11 / zl) + 'px monospace', h: 13 / zl });
      if (G.sel === c && !conf) { // R14: the selected contact's observed traits, one line each
        const TL = traitLines(G.obs[c.id]); if (!TL.length) TL.push('no traits yet');
        if (V.dbg && u) TL.push('DBG true: ' + u.variant);
        for (const t of TL) L.push({ t, col: '#cfe6ff', font: (11 / zl) + 'px monospace', h: 12 / zl });
      }
      labels.push({ c, x, y, a: ctx.globalAlpha, lines: L, tags: sensorTags(c), old: c.lost > c.gap });
    }
    if (G.sel === c) { ctx.strokeStyle = '#ff0'; ctx.lineWidth = 3 / z; ctx.strokeRect(x - 12, y - 12, 24, 24); }
    ctx.globalAlpha = 1;
  }
  reserveSuitLabels(z); // R24 (C25): suit names, CRITICAL and PAINTED claim their space first; contact labels move round them
  drawLabels(labels, z / V.uiS); // R18: labels scale with the window like the rest of the UI
  // R9 mortar: scatter preview on the target (orange dashed = where the shell can land, solid when you can fire),
  // and the last splash (splash circle, red = hit something, grey = miss)
  if (G.mode === 'hunt' && G.phase === 'PLAYER' && !G.act && has(p, 'MORTAR') && p.shells > 0) {
    const c = playerTarget();
    if (c && c.on) {
      const ok = mortarBlock(p, c) === '', r = mortarScatter(c, p);
      ctx.strokeStyle = '#e85'; ctx.lineWidth = 2 / z; ctx.globalAlpha = ok ? 0.9 : 0.35;
      ctx.setLineDash(ok ? [] : [6 / z, 6 / z]); ctx.beginPath(); ctx.arc(cx(c), cy(c), r, 0, 6.2832); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = '#e85'; ctx.font = 'bold ' + (11 / z) + 'px monospace';
      ctx.fillText('±' + (r / T).toFixed(1) + 't', cx(c) + r + 4 / z, cy(c) - 4 / z); ctx.globalAlpha = 1;
    }
  }
  if (V.mortarArm && !p.dead && mortarOf(p)) { // R9 run1: mortar range band while armed (min and max range rings)
    ctx.strokeStyle = '#e85'; ctx.lineWidth = 2 / z; ctx.globalAlpha = 0.5; ctx.setLineDash([10 / z, 8 / z]);
    for (const R of [mortarOf(p).min, mortarOf(p).max]) { ctx.beginPath(); ctx.arc(p.x, p.y, R * T, 0, 6.2832); ctx.stroke(); }
    ctx.setLineDash([]); ctx.globalAlpha = 1;
  }
  if (G.splash) {
    const s = G.splash; ctx.globalAlpha = Math.min(1, s.t);
    ctx.fillStyle = s.hit ? 'rgba(255,90,40,0.35)' : 'rgba(170,170,170,0.3)'; ctx.beginPath(); ctx.arc(s.x, s.y, s.sp, 0, 6.2832); ctx.fill();
    ctx.strokeStyle = s.hit ? '#f63' : '#aaa'; ctx.lineWidth = 2 / z; ctx.beginPath(); ctx.arc(s.x, s.y, s.sp, 0, 6.2832); ctx.stroke();
    ctx.fillStyle = ctx.strokeStyle; ctx.font = 'bold ' + (12 / z) + 'px monospace'; ctx.fillText('SPLASH ' + (s.hit ? 'hit' : 'miss'), s.x + s.sp + 4 / z, s.y + 4);
    ctx.globalAlpha = 1;
  }
  // R17 (parked #18): aiming at a target in cover: outline the piece of cover that counts (yellow = wall −HIT_COVER, tan =
  // scrap, low cover −HIT_COVER_LOW) and, green, your own cover where the shared-cover rule cancels it (you lean round it)
  if (G.mode === 'hunt' && G.phase === 'PLAYER' && !G.act && has(p, 'GUN')) {
    const c = playerTarget(), u = c && c.on ? unitById(c.id) : null;
    if (u && !u.dead && shootBlock(p, c, TUNE.PLAYER_FIRE_UNC, fireRange(p)) === '' && shotOdds(p, c)) {
      const ci = coverInfo(p.x, p.y, u.x, u.y);
      const box = (L, col) => {
        if (!L.length) return;
        ctx.strokeStyle = col; ctx.lineWidth = 3 / z; ctx.beginPath(); for (const [x, y] of L) ctx.rect(x * T + 2, y * T + 2, T - 4, T - 4); ctx.stroke();
      };
      box(ci.give, ci.kind === 'LOW' ? '#d9b27a' : '#ff6');
      box(ci.cancelled, '#6f6');
      // R18 fix list 14 (Jamie: "a little symbol to show it has cover, but not its amount"): a shield left of the target (the
      // tactics-game convention, XCOM's). One shape for wall or scrap; the ODDS line keeps the number.
      if (ci.kind) shield(cx(c) - 18 * V.uiS / z, cy(c), 7 * V.uiS / z, '#ff6');
    }
  }
  // R17: the interrupt cue over the suit that stopped
  if (G.intr) {
    const m = G.lance.find(x => x.id === G.intr.id);
    if (m && !m.dead && !m.out) {
      ctx.globalAlpha = Math.min(1, G.intr.t); ctx.strokeStyle = '#f63'; ctx.lineWidth = 3 / z;
      ctx.beginPath(); ctx.arc(m.x, m.y, 22 + (TUNE.INTERRUPT_CUE_TIME - G.intr.t) * 8, 0, 6.2832); ctx.stroke();
      ctx.fillStyle = '#ff8a5c'; ctx.font = 'bold ' + (14 / z) + 'px monospace'; ctx.textAlign = 'center';
      ctx.fillText('CONTACT — move stopped', m.x, m.y - 26 / z - 10);
      ctx.font = 'bold ' + (11 / z) + 'px monospace'; ctx.fillText(G.intr.ap + 'AP kept · ' + G.intr.why, m.x, m.y - 12 / z - 10); ctx.textAlign = 'left'; ctx.globalAlpha = 1;
    }
  }
  // R25 fix list 6 (C08): the result of your last shot, on the map where it was sent, for SHOT_FLASH_MS (HUD open or not)
  const sr = G.lastShot.P;
  if (sr && sr.done && sr !== flash.rec) { flash.rec = sr; flash.until = performance.now() + TUNE.SHOT_FLASH_MS; }
  if (flash.rec && flash.rec === sr && performance.now() < flash.until) {
    const left = (flash.until - performance.now()) / TUNE.SHOT_FLASH_MS, w = shotWord(sr);
    ctx.globalAlpha = Math.min(1, left * 3); ctx.textAlign = 'center';
    ctx.font = 'bold ' + (16 / z) + 'px monospace'; ctx.lineWidth = 4 / z; ctx.strokeStyle = '#000';
    const head = shotResult(sr).split(' · had ')[0], sub = 'had ' + sr.pct + '% to hit';
    ctx.strokeText(head, sr.ax, sr.ay - 18 / z); ctx.fillStyle = w === 'KILL' ? '#ffd166' : w === 'HIT' ? '#6f6' : '#ccc'; ctx.fillText(head, sr.ax, sr.ay - 18 / z);
    ctx.font = 'bold ' + (11 / z) + 'px monospace'; ctx.strokeText(sub, sr.ax, sr.ay - 5 / z); ctx.fillText(sub, sr.ax, sr.ay - 5 / z);
    ctx.textAlign = 'left'; ctx.globalAlpha = 1;
  }
  // R25 fix 2 (C06): why a move ended away from where you pointed
  if (G.mstop && !G.intr) {
    const m = G.lance.find(x => x.id === G.mstop.id);
    if (m && !m.dead && !m.out) {
      ctx.globalAlpha = Math.min(1, G.mstop.t); ctx.fillStyle = '#ffcc66'; ctx.font = 'bold ' + (13 / z) + 'px monospace'; ctx.textAlign = 'center';
      ctx.fillText('MOVE ENDS: ' + whyShort('STOP', G.mstop.why), m.x, m.y - 26 / z - 10); ctx.textAlign = 'left'; ctx.globalAlpha = 1;
    }
  }
  // your mechs (R7 s2): active one highlighted when it's acting; destroyed = grey X; A / B labels
  for (const m of G.lance) {
    ctx.font = 'bold ' + (12 / z) + 'px monospace';
    if (m.dead) {
      ctx.strokeStyle = ctx.fillStyle = '#888'; ctx.lineWidth = 4 / z; ctx.beginPath();
      ctx.moveTo(m.x - 10, m.y - 10); ctx.lineTo(m.x + 10, m.y + 10); ctx.moveTo(m.x + 10, m.y - 10); ctx.lineTo(m.x - 10, m.y + 10); ctx.stroke();
      if (m.crit) { // R21: the suit is down, its operator CRITICAL: a pulsing ring until a lancemate ends a turn beside it
        const carried = !!m.carriedBy, a = carried ? 0.9 : 0.55 + 0.45 * Math.sin(performance.now() / 250);
        ctx.strokeStyle = ctx.fillStyle = carried ? 'rgba(112,192,128,' + a + ')' : 'rgba(255,90,90,' + a + ')'; ctx.lineWidth = 3 / z;
        ctx.beginPath(); ctx.arc(m.x, m.y, TUNE.OP_CARRY_RANGE * T, 0, 6.2832); ctx.stroke();
        const R = TUNE.OP_CARRY_RANGE * T; ctx.textAlign = 'center'; // above / below the ring, clear of the lancemate's label
        const S = suitLab.get(m.id);
        ctx.fillText(critText(m), m.x, S ? S.top + S.fs : m.y - R - 6 / z);
        if (!carried) { ctx.font = (10 / z) + 'px monospace'; ctx.fillText('end a lancemate’s turn in the ring to carry them', m.x, S ? S.top2 + 10 / z : m.y + R + 12 / z); }
        ctx.textAlign = 'left'; continue;
      }
      ctx.fillText(m.id + ' ✕', m.x + 12, m.y - 10); continue;
    }
    const act = m === p && G.phase === 'PLAYER';
    ctx.fillStyle = act ? '#ffffff' : '#a9b0b8'; ctx.beginPath(); ctx.arc(m.x, m.y, 9, 0, 6.2832); ctx.fill();
    ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(m.x, m.y); ctx.lineTo(m.x + m.fx * 16, m.y + m.fy * 16); ctx.stroke();
    if (act) { ctx.strokeStyle = '#9cf'; ctx.lineWidth = 2 / z; ctx.beginPath(); ctx.arc(m.x, m.y, 15, 0, 6.2832); ctx.stroke(); }
    const S = suitLab.get(m.id), by = S ? S.top + S.fs : m.y - 10; // R24 (C25): the spot reserved for it
    if (S && by > m.y - 10 + 1e-6) { ctx.strokeStyle = '#a9b0b8'; ctx.lineWidth = 1 / z; ctx.beginPath(); ctx.moveTo(m.x + 6, m.y - 4); ctx.lineTo(m.x + 11, by - S.fs * 0.4); ctx.stroke(); }
    ctx.fillStyle = act ? '#9cf' : '#a9b0b8'; ctx.fillText(suitName(m), m.x + 12, by); // R21: the operator (★ = veteran)
    if (G.lance.some(d => d.carriedBy === m.id)) { ctx.fillStyle = '#70c080'; ctx.fillText(carryText(m), m.x + 12, by + 14 / z); }
    if (lowHits(m)) { // R24 A5 (C12): the low-hits mark: a pulsing red ring and "! N" (CORE hits left)
      const a = 0.6 + 0.4 * Math.sin(performance.now() / 200);
      ctx.strokeStyle = 'rgba(255,80,80,' + a + ')'; ctx.lineWidth = 2.5 / z; ctx.beginPath(); ctx.arc(m.x, m.y, 12, 0, 6.2832); ctx.stroke();
      ctx.fillStyle = 'rgba(255,110,110,' + a + ')'; ctx.fillText('! ' + hitsLeft(m), m.x - 14 - ctx.measureText('! ' + hitsLeft(m)).width, by);
    }
  }
  drawAarHl(ctx, z); // R22: the tapped after-action moment
  if (G.mode === 'hunt') { drawPainted(z); drawRwr(G.p, z); } // R19 cp3; fix list 1: the built-in warning on every suit
  // took a hit: red screen border
  if (V.hitFlash > 0) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.strokeStyle = 'rgba(255,40,40,' + (V.hitFlash / 0.4) + ')';
    ctx.lineWidth = 16; ctx.strokeRect(0, 0, vw, vh);
  }
  // R17: while drawing, the cost beside the finger (STOP = this turn's AP runs out before the end of the stroke)
  if (V.drawPt && G.plan && G.plan.drawn) {
    const pl = G.plan, t = pl.path ? pl.ap + 'AP ' + pl.en + 'EN' + (pl.cut ? ' · STOP' : '') : 'NO MOVE · ' + pl.why;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.font = 'bold 15px monospace';
    const tw = ctx.measureText(t).width, x = Math.min(vw - tw - 8, V.drawPt.sx + 28), y = Math.max(76, V.drawPt.sy - 34);
    ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.fillRect(x - 6, y - 16, tw + 12, 22);
    ctx.fillStyle = pl.cut || !pl.path ? '#ff8a5c' : '#8fe3ff'; ctx.fillText(t, x, y);
  }
  // Round 5: uplink off-screen → gold arrow at the screen edge pointing at it, with distance (R15: uplink, and Retrieve's cargo until picked up)
  if (isType('UPLINK') || (isType('RETRIEVE') && !G.mission.carrier) || (isType('ESCORT') && G.ally && !G.ally.dead)) {
    const U = isType('ESCORT') ? G.ally : G.up, sx = vw / 2 + (U.x - V.camX) * z, sy = vh / 2 + (U.y - V.camY) * z, m = 24; // R15 Escort: the arrow points at the transport
    if (sx < 0 || sx > vw || sy < 0 || sy > vh) {
      const ax = Math.max(m, Math.min(vw - 100, sx)) /* keep clear of the right button column */, ay = Math.max(70, Math.min(vh - m, sy)), a = Math.atan2(sy - ay, sx - ax);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.fillStyle = '#fc3';
      ctx.beginPath(); ctx.moveTo(ax + Math.cos(a) * 14, ay + Math.sin(a) * 14);
      ctx.lineTo(ax + Math.cos(a + 2.5) * 10, ay + Math.sin(a + 2.5) * 10); ctx.lineTo(ax + Math.cos(a - 2.5) * 10, ay + Math.sin(a - 2.5) * 10); ctx.closePath(); ctx.fill();
      ctx.font = 'bold 11px monospace'; ctx.textAlign = ax > vw / 2 ? 'right' : 'left';
      ctx.fillText(Math.round(upDist(G.p)) + 't', ax + (ax > vw / 2 ? -14 : 14), ay + 4); ctx.textAlign = 'left';
    }
  }
}
