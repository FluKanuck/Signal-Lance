// Round 22: the after-action page (replaces the hunt result panels). Right side: WHAT HAPPENED (the turning points) and WHAT IT
// COST (company lines pointing back to them); the live end-of-hunt map stays visible on the left. Tap a moment to pulse it on
// the map (not a replay). The old panels sit behind DETAILS. Rules and words come from sim/aar.ts.
import { G } from '../sim/state.ts';
import { TUNE } from '../tune.ts';
import { T } from '../sim/world.ts';
import { aarLines, pickMoments, costLines, heldField, aarLogLines, type MomentLine, type CostLine } from '../sim/aar.ts';
import { V, camZ } from './state.ts';
import { $ } from './hud.ts';

const esc = (t: string) => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
let lines: MomentLine[] = [], costs: CostLine[] = [];

// Build the page for the hunt that just ended. Returns the moments (the log uses them).
export function showAar(head: string) {
  lines = aarLines(); costs = costLines(pickMoments());
  const held = heldField();
  $('resTxt').innerHTML = esc(head) + ' <span class="aartag ' + (held ? 'held' : 'lost') + '">' + (held ? 'HELD THE FIELD: the full story' : 'FIELD LOST: their side is blanked out') + '</span>';
  $('aarList').innerHTML = lines.map((l, i) => '<button class="aarm k-' + l.kind + (l.redacted ? ' red' : '') + '" data-i="' + i + '"><b>T' + l.turn + '</b> ' + esc(l.text) + '</button>').join('') || '<div class="aarnone">Nothing to report.</div>';
  $('aarCostList').innerHTML = costs.map(c => '<div class="aarc' + (c.ref !== null ? ' ref" data-t="' + c.ref : '') + '">' + esc(c.text) + (c.ref !== null ? ' <b>← T' + c.ref + '</b>' : '') + '</div>').join('') || '<div class="aarnone">Nothing this time.</div>';
  $('resWhy').hidden = true; $('bDet').textContent = 'DETAILS ▸';
  V.aarHl = null; V.hitFlash = 0;
  document.body.classList.add('aaron');
  // the map: the lance's last spot (or the objective), in the clear part of the screen left of the page
  const m = G.lance.find(x => !x.out && !(x.x < 0)) || null;
  look(m ? m.x : G.up.x, m ? m.y : G.up.y);
  return lines;
}
export function hideAar() { document.body.classList.remove('aaron'); V.aarHl = null; }
export function aarLog() { return aarLogLines(lines); }
// Centre (x, y) in the part of the map the page doesn't cover
function look(x: number, y: number) {
  const pw = ($('res') as HTMLElement).getBoundingClientRect().width || 0, z = camZ();
  V.follow = false; V.camX = x + pw / 2 / z; V.camY = y;
}
function pick(i: number) {
  const l = lines[i]; if (!l) return;
  const same = V.aarHl && V.aarHl.i === i;
  V.aarHl = same ? null : { i, hl: l.hl, t0: performance.now(), turn: l.turn };
  for (const b of Array.from(document.querySelectorAll('.aarm')) as HTMLElement[]) b.classList.toggle('on', !same && +b.dataset.i === i);
  if (same) return;
  const P = [...l.hl.own, ...l.hl.foe, ...(l.hl.spot ? [l.hl.spot] : [])];
  if (!P.length) return;
  // zoom out if the moment doesn't fit the clear strip left of the page (plus a margin for the labels)
  const pw = ($('res') as HTMLElement).getBoundingClientRect().width || 0, wx = Math.max(...P.map(p => p.x)) - Math.min(...P.map(p => p.x)) + 4 * T, wy = Math.max(...P.map(p => p.y)) - Math.min(...P.map(p => p.y)) + 4 * T;
  if (wx * camZ() > window.innerWidth - pw || wy * camZ() > window.innerHeight) V.zoomI = TUNE.ZOOMS.length - 1;
  look(P.reduce((a, p) => a + p.x, 0) / P.length, P.reduce((a, p) => a + p.y, 0) / P.length);
}
$('aarList').addEventListener('click', ev => { const b = (ev.target as any).closest('.aarm'); if (b) pick(+b.dataset.i); });
$('aarCostList').addEventListener('click', ev => { const c = (ev.target as any).closest('.aarc.ref'); if (!c) return; const i = lines.findIndex(l => l.turn === +c.dataset.t); if (i >= 0) pick(i); });
$('bDet').addEventListener('click', () => { const h = !$('resWhy').hidden; $('resWhy').hidden = h; $('bDet').textContent = h ? 'DETAILS ▸' : 'DETAILS ▾'; });

// Drawn by render.ts (world transform on): pulse what the tapped moment involves. Never more than the outcome allows:
// sim/aar.ts highlight() leaves out every field unit's position when the field was lost.
export function drawAarHl(ctx: CanvasRenderingContext2D, z: number) {
  const H = V.aarHl; if (!H || G.mode !== 'result') return;
  const hl = H.hl, t = (performance.now() - H.t0) / 1000, a = 0.55 + 0.45 * Math.sin(t * 5), r = (0.7 + 0.15 * Math.sin(t * 5)) * T;
  ctx.save(); ctx.lineWidth = 3 / z;
  if (hl.line) { ctx.strokeStyle = 'rgba(255,255,255,' + (0.5 + a * 0.4) + ')'; ctx.setLineDash([8 / z, 6 / z]); ctx.beginPath(); ctx.moveTo(hl.line[0], hl.line[1]); ctx.lineTo(hl.line[2], hl.line[3]); ctx.stroke(); ctx.setLineDash([]); }
  if (hl.bearing) { // the rounded bearing from your suit: a dashed wedge with a "?"
    const b = hl.bearing, L = 7 * T, w = 0.2;
    ctx.fillStyle = 'rgba(255,170,60,' + 0.12 * (1 + a) + ')'; ctx.strokeStyle = 'rgba(255,170,60,' + a + ')'; ctx.setLineDash([6 / z, 5 / z]);
    ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.arc(b.x, b.y, L, b.ang - w, b.ang + w); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(255,190,90,' + a + ')'; ctx.font = 'bold ' + (18 / z) + 'px monospace'; ctx.textAlign = 'center';
    ctx.fillText('?', b.x + Math.cos(b.ang) * (L + 12 / z), b.y + Math.sin(b.ang) * (L + 12 / z) + 6 / z); ctx.textAlign = 'left';
  }
  const ring = (p: { x: number; y: number }, col: string) => { ctx.strokeStyle = col.replace('A', String(a)); ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, 6.2832); ctx.stroke(); };
  // the unit as it was at that turn: cover what the end-of-hunt map shows on that spot (a wreck, nothing), draw it, name it
  const asThen = (p: { x: number; y: number; name?: string }, foe: boolean) => {
    ctx.fillStyle = 'rgba(17,17,17,0.9)'; ctx.beginPath(); ctx.arc(p.x, p.y, 0.55 * T, 0, 6.2832); ctx.fill();
    ctx.fillStyle = foe ? '#ff5a5a' : '#8cdcff';
    if (foe) ctx.fillRect(p.x - 7, p.y - 7, 14, 14); else { ctx.beginPath(); ctx.arc(p.x, p.y, 8, 0, 6.2832); ctx.fill(); }
    ring(p, foe ? 'rgba(255,90,90,A)' : 'rgba(140,220,255,A)');
    const t = 'T' + H.turn + ' · ' + (p.name || ''), fs = 12 / z;
    ctx.font = 'bold ' + fs + 'px monospace'; ctx.textAlign = 'center';
    const w = ctx.measureText(t).width, y = p.y - r - 6 / z;
    ctx.fillStyle = 'rgba(0,0,0,0.75)'; ctx.fillRect(p.x - w / 2 - 4 / z, y - fs, w + 8 / z, fs + 4 / z);
    ctx.fillStyle = foe ? '#ff9a9a' : '#bfe9ff'; ctx.fillText(t, p.x, y); ctx.textAlign = 'left';
  };
  for (const p of hl.own) asThen(p, false);
  for (const p of hl.foe) asThen(p, true);
  if (hl.spot) ring(hl.spot, 'rgba(255,204,51,A)');
  ctx.restore();
}
