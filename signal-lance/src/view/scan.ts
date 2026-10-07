// Round 19: the pre-drop scan screen. Between the job pick and the drop: one listen dial (SKIP / SHORT / MEDIUM / LONG),
// LISTEN, then what the ship heard on a map of the whole district (roster, zones, drop zones, blips). View only: it sends
// listen() / chooseDrop() and draws G.scan.
import { TUNE } from '../tune.ts';
import { G } from '../sim/state.ts';
import { W, H, T, solid, clutter, anchors } from '../sim/world.ts';
import { LISTEN, listen, chooseDrop, offeredDrops, zoneKnow } from '../sim/scan.ts';
import { scanRisk } from '../sim/scan.ts';
import { legPath } from '../sim/escort.ts';
import { $ } from './hud.ts';
import { showCard } from './card.ts';

const esc = (t: string) => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
// what each step adds (cumulative: a step reveals everything below it too)
export const REVEALS = [
  'Drop now on the west edge. You know the job and the district, nothing more.',
  'The field roster (types, variants, how many) and where the zones are (not what they are).',
  'What each zone is (quiet or noise), and a choice of ' + TUNE.DROP_ZONES + ' drop zones.',
  'Blips: where every emitting unit was, and what it sounded like (a best guess from the CARD). Silent units stay hidden.',
];
let pickLvl = 1, onGo: () => void = () => {}, goLabel = 'NEXT', locked = -1;

// Open the scan for the current world (rollEnemy already ran). go = what NEXT does; force = a test-bed scan (dial locked to it).
export function showScan(title: string, go: () => void, label: string, force = -1) {
  onGo = go; goLabel = label; locked = force;
  if (force >= 0 && G.scan.lvl < 0) listen(force);
  pickLvl = G.scan.lvl >= 0 ? G.scan.lvl : 1;
  $('sHead').textContent = title;
  for (const id of ['load', 'jobs', 'res', 'tb', 'tbres']) $(id).hidden = true;
  $('scan').hidden = false; $('scan').scrollTop = 0;
  renderScan();
  requestAnimationFrame(() => requestAnimationFrame(() => { if (!$('scan').hidden) drawMap(); })); // R19 fix: size the map again once the panel's scale has settled
}
export function renderScan() {
  const S = G.scan, done = S.lvl >= 0;
  $('sDial').innerHTML = LISTEN.map((n, i) => '<button class="sd' + (i === (done ? S.lvl : pickLvl) ? ' on' : '') + (done && i !== S.lvl ? ' lockd' : '') + '" data-l="' + i + '">' + n + '</button>').join('');
  const L = done ? S.lvl : pickLvl, risk = scanRisk(L);
  $('sWhat').hidden = done; // R19 readability: once you have listened, the space goes to what was heard
  $('sWhat').innerHTML = '<b>' + LISTEN[L] + ':</b> ' + esc(L ? 'Everything below, plus: ' + REVEALS[L] : REVEALS[0]) + (risk ? '<br><span class="warnt"><b>Risk:</b> ' + esc(risk) + '</span>' : '');
  $('bListen').hidden = done;
  $('bListen').textContent = pickLvl ? 'LISTEN: ' + LISTEN[pickLvl] : 'SKIP THE SCAN';
  $('sIntel').innerHTML = done ? heard().map(l => '<div>' + l + '</div>').join('') : '';
  const D = offeredDrops();
  $('sDrops').innerHTML = done && D.length > 1 ? D.map((d, i) => '<button class="sdz' + (i === S.drop ? ' on' : '') + '" data-d="' + i + '">' + (i + 1) + ' ' + esc(d.name.toUpperCase()) + '</button>').join('') : '';
  $('bScanGo').hidden = !done; $('bScanGo').textContent = goLabel;
  drawMap();
}
// What the ship heard, one line each (plain words, the CARD's names)
function heard() {
  const S = G.scan, L: string[] = [];
  if (S.lvl === 0) L.push('No scan. Zones unknown. You drop on the west edge.');
  if (S.lvl >= 1) {
    const by: Record<string, string[]> = {};
    for (const r of S.roster) (by[r.type] ||= []).push(r.variant + (r.n > 1 ? ' ×' + r.n : ''));
    const n = S.roster.reduce((a, r) => a + r.n, 0);
    L.push('<b>Roster (' + n + '):</b> ' + Object.keys(by).map(t => TUNE.FIELD_TYPES[t].PLURAL + ' ' + esc(by[t].join(', '))).join(' · '));
  }
  if (S.lvl === 1) L.push('<b>Zones:</b> ' + G.zones.length + ' heard (grey outlines; quiet or noise unknown).');
  if (S.lvl >= 2) for (const k of ['QUIET', 'NOISE']) { const zs = G.zones.filter(z => z.type === k); if (zs.length) L.push('<b>' + TUNE.ZONE_TYPES[k].NAME + ':</b> ' + esc(zs.map(z => z.name).join(', '))); }
  if (S.lvl >= 3) {
    const silent = S.roster.reduce((a, r) => a + r.n, 0) - S.blips.length;
    L.push('<b>Blips:</b> ' + S.blips.length + ' emitters (patrols will have moved)' + (silent > 0 ? '; ' + silent + ' silent, not shown' : '') + '.');
  }
  if (S.lvl >= 2) L.push('<b>Drop zone:</b> tap 1–' + offeredDrops().length + ' on the map or below.');
  return L;
}
// ---- the map: the whole district, fitted to the canvas ----
function drawMap() {
  const cv = $('scv') as HTMLCanvasElement, S = G.scan, dpr = Math.min(2, window.devicePixelRatio || 1);
  const box = cv.parentElement.getBoundingClientRect(), zm = parseFloat(($('scan').style as any).zoom || '1') || 1, maxH = Math.max(140, (window.innerHeight - 70) / zm); // R19 readability: the map takes the height it can
  const k = Math.max(2, Math.min(box.width / zm / W, maxH / H)); // CSS px per tile
  cv.style.width = W * k + 'px'; cv.style.height = 'auto'; cv.width = Math.round(W * k * dpr * zm); cv.height = Math.round(H * k * dpr * zm); // R19 fix: height follows the width (max-width can never stretch the map)
  const c = cv.getContext('2d'), z = k / T; c.setTransform(dpr * zm * z, 0, 0, dpr * zm * z, 0, 0); // drawn at the panel's scale: sharp
  c.fillStyle = '#2c2d30'; c.fillRect(0, 0, W * T, H * T);
  c.fillStyle = '#4a4033'; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (clutter[y * W + x]) c.fillRect(x * T, y * T, T, T);
  c.fillStyle = 'rgba(60,200,90,0.3)'; c.fillRect((W - TUNE.EXTRACT_COLS) * T, 0, TUNE.EXTRACT_COLS * T, H * T);
  const zk = zoneKnow();
  for (const zn of zk ? G.zones : []) {
    const q = zn.type === 'QUIET';
    c.fillStyle = zk < 2 ? 'rgba(200,200,200,0.14)' : q ? 'rgba(90,150,255,0.3)' : 'rgba(255,200,70,0.2)';
    for (const t of zn.tiles) c.fillRect(t.x * T, t.y * T, T, T);
    if (zk >= 2) { c.fillStyle = q ? '#9cf' : '#fd7'; c.font = 'bold ' + (11 / z) + 'px monospace'; c.fillText(q ? 'QUIET' : 'NOISE', (zn.x - 2) * T, (zn.y + 0.4) * T); }
    else { c.fillStyle = '#bbb'; c.font = 'bold ' + (11 / z) + 'px monospace'; c.fillText('ZONE ?', (zn.x - 2) * T, (zn.y + 0.4) * T); }
  }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (solid[y * W + x]) { c.fillStyle = solid[y * W + x] === 2 ? '#7a5a3c' : '#6b6d72'; c.fillRect(x * T, y * T, T, T); }
  // the objective
  c.strokeStyle = c.fillStyle = '#fc3'; c.lineWidth = 2 / z;
  if (G.mtype === 'ESCORT') { c.globalAlpha = 0.6; anchors().legs.forEach((_, i) => { const P = legPath(i); c.beginPath(); c.moveTo(P[0].x, P[0].y); for (const p of P) c.lineTo(p.x, p.y); c.stroke(); }); c.globalAlpha = 1; }
  else if (G.mtype !== 'BOUNTY') { c.beginPath(); c.arc(G.up.x, G.up.y, 1.5 * T, 0, 6.2832); c.stroke(); c.font = 'bold ' + (12 / z) + 'px monospace'; c.fillText(G.mtype === 'RETRIEVE' ? 'CARGO' : 'UPLINK', G.up.x + 1.8 * T, G.up.y + 4 / z); }
  // drop zones: the offered ones numbered, the picked one bright
  const D = offeredDrops();
  D.forEach((d, i) => {
    const on = i === S.drop, x = (d.x + 0.5) * T, y = (d.y + 0.5) * T;
    c.fillStyle = on ? '#9cf' : 'rgba(150,200,255,0.35)'; c.beginPath(); c.arc(x, y, (on ? 11 : 9) / z, 0, 6.2832); c.fill();
    c.fillStyle = on ? '#001' : '#cde'; c.font = 'bold ' + (11 / z) + 'px monospace'; c.textAlign = 'center'; c.fillText(String(i + 1), x, y + 4 / z); c.textAlign = 'left';
  });
  // LONG blips: a fuzzy circle and the best guess
  const placed: { x0: number; y0: number; x1: number; y1: number }[] = []; // R19 readability: labels that would overlap stack downwards
  for (const b of S.blips || []) {
    c.strokeStyle = '#f90'; c.fillStyle = 'rgba(255,150,0,0.12)'; c.lineWidth = 2 / z; c.setLineDash([5 / z, 4 / z]);
    c.beginPath(); c.arc(b.x, b.y, b.unc, 0, 6.2832); c.fill(); c.stroke(); c.setLineDash([]);
    c.fillStyle = '#f90'; c.fillRect(b.x - 3 / z, b.y - 3 / z, 6 / z, 6 / z);
    c.fillStyle = '#ffd27a'; c.font = 'bold ' + (11 / z) + 'px monospace';
    const t = b.guess + '? ' + (b.fits.length > 1 ? '1 of ' + b.fits.length : 'sure'), tw = c.measureText(t).width;
    const lx = b.x + b.unc * 0.75 + tw > W * T ? b.x - b.unc * 0.75 - tw : b.x + b.unc * 0.75; // stay on the map
    let ly = Math.max(12 / z, b.y - b.unc * 0.6); const h = 13 / z;
    for (let g = 0; g < 20; g++) { const hit = placed.find(p => lx < p.x1 && lx + tw > p.x0 && ly - h < p.y1 && ly > p.y0); if (!hit) break; ly = hit.y1 + h; }
    placed.push({ x0: lx, y0: ly - h, x1: lx + tw, y1: ly + 2 / z });
    c.fillStyle = 'rgba(10,12,14,0.7)'; c.fillRect(lx - 2 / z, ly - h + 1 / z, tw + 4 / z, h + 2 / z); c.fillStyle = '#ffd27a';
    c.fillText(t, lx, ly);
  }
}
function tapMap(ev: PointerEvent) {
  const S = G.scan; if (S.lvl < 2) return;
  const cv = $('scv') as HTMLCanvasElement, r = cv.getBoundingClientRect(), k = r.width / W;
  const tx = (ev.clientX - r.left) / k, ty = (ev.clientY - r.top) / k;
  let best = -1, bd = 4; // within 4 tiles
  offeredDrops().forEach((d, i) => { const dd = Math.hypot(d.x + 0.5 - tx, d.y + 0.5 - ty); if (dd < bd) { bd = dd; best = i; } });
  if (best >= 0) { chooseDrop(best); renderScan(); }
}
$('sDial').addEventListener('click', ev => {
  const b = (ev.target as any).closest('.sd'); if (!b || G.scan.lvl >= 0 || locked >= 0) return;
  pickLvl = +b.dataset.l; renderScan();
});
$('bListen').addEventListener('click', () => { if (listen(pickLvl)) renderScan(); });
$('sDrops').addEventListener('click', ev => { const b = (ev.target as any).closest('.sdz'); if (b) { chooseDrop(+b.dataset.d); renderScan(); } });
$('scv').addEventListener('pointerdown', tapMap);
$('bScanCard').addEventListener('click', () => { $('scan').hidden = true; showCard('scan'); });
$('bScanGo').addEventListener('click', () => { if (G.scan.lvl >= 0) { $('scan').hidden = true; onGo(); } });
window.addEventListener('resize', () => { if (!$('scan').hidden) drawMap(); });
