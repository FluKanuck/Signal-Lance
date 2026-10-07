// Round 19: the pre-drop scan screen. Between the job pick and the drop: one listen dial (SKIP / SHORT / MEDIUM / LONG),
// LISTEN, then what the ship heard on a map of the whole district (roster, zones, drop zones, blips). View only: it sends
// listen() / chooseDrop() and draws G.scan.
// Round 20 (TUNE.SCAN_MODE 'active'): the live scan. A sensor picker, WIDE, START / STOP and a clock; drag the aim ring on the
// map. The view only sends commands (scanCmd) and turns real seconds into ship-minutes; the sim steps (scanStep).
import { TUNE } from '../tune.ts';
import { G } from '../sim/state.ts';
import { W, H, T, solid, clutter, anchors } from '../sim/world.ts';
import { LISTEN, listen, chooseDrop, offeredDrops, zoneKnow, dropPts, scanDone } from '../sim/scan.ts';
import { scanRisk } from '../sim/scan.ts';
import { scanCmd, scanStep, unitIntel, zoneLayer, dropClear, liveSummary, SENSORS } from '../sim/livescan.ts';
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
// R20: the three sensors: their buttons, colours (map tint, ring, band bars) and what each answers
const SNAME: Record<string, string> = { RADAR: 'RADAR', THERMAL: 'THERMAL', EM: 'EM LISTEN' };
const SCOL: Record<string, string> = { RADAR: '#4fd8c0', THERMAL: '#ff8a50', EM: '#c79bff' };
const SRGB: Record<string, string> = { RADAR: '79,216,192', THERMAL: '255,138,80', EM: '199,155,255' };
const SHELP: Record<string, string> = {
  RADAR: '<b>WHERE.</b> Active and fast. Every unit as an unknown ping (silent ones too), zone outlines, rubble, and which drop zones are clear.',
  THERMAL: '<b>WHAT’S ALIVE.</b> Passive, medium. Zone types (noise reads hot, quiet cold); warm units as a heat blob, then their size. Cold units stay hidden.',
  EM: '<b>WHO.</b> Passive and slow. Only things that transmit: first counted, then a bearing fix with the CARD’s best guess that firms up the longer you listen.',
};
const live = () => G.scan && G.scan.mode === 'active';
let pickLvl = 1, onGo: () => void = () => {}, goLabel = 'NEXT', locked = -1;

// Open the scan for the current world (rollEnemy already ran). go = what NEXT does; force = a test-bed scan (dial locked to it).
export function showScan(title: string, go: () => void, label: string, force = -1) {
  onGo = go; goLabel = label; locked = force;
  if (!live() && force >= 0 && G.scan.lvl < 0) listen(force);
  pickLvl = G.scan.lvl >= 0 ? G.scan.lvl : 1;
  $('sHead').textContent = title;
  for (const id of ['load', 'jobs', 'res', 'tb', 'tbres']) $(id).hidden = true;
  $('scan').hidden = false; $('scan').scrollTop = 0;
  ($('scv') as HTMLCanvasElement).style.touchAction = live() ? 'none' : 'manipulation'; // R20: the ring drags
  renderScan();
  requestAnimationFrame(() => requestAnimationFrame(() => { if (!$('scan').hidden) drawMap(); })); // R19 fix: size the map again once the panel's scale has settled
}
export function renderScan() {
  const S = G.scan, act = live();
  $('sDialBox').hidden = act; $('sLive').hidden = !act; $('bRun').hidden = !act;
  if (act) renderLive(); else renderDial();
  const D = offeredDrops(), done = scanDone();
  $('sDrops').innerHTML = done && D.length > 1 ? D.map(d => '<button class="sdz' + (d.i === S.drop ? ' on' : '') + '" data-d="' + d.i + '">' + (d.i + 1) + ' ' + esc(d.name.toUpperCase()) + '</button>').join('') : '';
  $('bScanGo').hidden = !done; $('bScanGo').textContent = goLabel;
  drawMap();
}
function renderDial() {
  const S = G.scan, done = S.lvl >= 0;
  $('sDial').innerHTML = LISTEN.map((n, i) => '<button class="sd' + (i === (done ? S.lvl : pickLvl) ? ' on' : '') + (done && i !== S.lvl ? ' lockd' : '') + '" data-l="' + i + '">' + n + '</button>').join('');
  const L = done ? S.lvl : pickLvl, risk = scanRisk(L);
  $('sWhat').hidden = done; // R19 readability: once you have listened, the space goes to what was heard
  $('sWhat').innerHTML = '<b>' + LISTEN[L] + ':</b> ' + esc(L ? 'Everything below, plus: ' + REVEALS[L] : REVEALS[0]) + (risk ? '<br><span class="warnt"><b>Risk:</b> ' + esc(risk) + '</span>' : '');
  $('bListen').hidden = done;
  $('bListen').textContent = pickLvl ? 'LISTEN: ' + LISTEN[pickLvl] : 'SKIP THE SCAN';
  $('sIntel').innerHTML = done ? heard().map(l => '<div>' + l + '</div>').join('') : '';
}
// R20: the live side panel (rebuilt each tick while the clock runs)
function renderLive() {
  const S = G.scan, max = TUNE.SCAN_TIME_MAX;
  $('sSens').innerHTML = SENSORS.map(s => '<button class="ss s-' + s + (S.sensor === s ? ' on' : '') + '" data-s="' + s + '">' + SNAME[s] + '</button>').join('') +
    '<button class="ss' + (S.wide ? ' on' : '') + '" data-s="WIDE">WIDE</button>';
  const m = S.t.toFixed(2).replace(/\.?0+$/, '') || '0';
  $('sClock').innerHTML = (S.run ? '● ' : '') + 'CLOCK ' + m + ' / ' + max + ' ship-min · ' + SNAME[S.sensor] + (S.wide ? ' wide' : ' on the ring') +
    '<span class="bar"><span style="width:' + Math.min(100, 100 * S.t / max) + '%;background:' + SCOL[S.sensor] + '"></span></span>';
  $('sHelp').innerHTML = SHELP[S.sensor];
  $('sIntel').innerHTML = liveLines().map(l => '<div>' + l + '</div>').join('');
  const b = $('bRun'); b.textContent = S.run ? 'STOP' : S.t >= max - 1e-9 ? 'OUT OF TIME' : S.t > 0 ? 'START AGAIN' : 'START'; b.classList.toggle('run', !!S.run);
  (b as HTMLButtonElement).disabled = !S.run && S.t >= max - 1e-9;
}
// R20: what the ship knows, one line per sensor (plain words, the CARD's names)
function liveLines() {
  const S = G.scan, M = liveSummary(S), L: string[] = [];
  if (!S.t) return ['Pick a sensor, drag the ring onto what matters (or WIDE for all of it), then START. STOP when you have enough. DROP lands with what you know.'];
  const I = G.units.map(u => unitIntel(S, u)).filter(Boolean);
  L.push('<b style="color:' + SCOL.RADAR + '">RADAR:</b> ' + M.pings + ' ping' + (M.pings === 1 ? '' : 's') + ' (type unknown) · zones ' + M.zones + '/' + G.zones.length + ' outlined · drops ' + M.drops + '/' + dropPts().length + ' clear');
  const sz = I.filter(i => i.size), big = sz.filter(i => i.size === 'LARGE').length;
  L.push('<b style="color:' + SCOL.THERMAL + '">THERMAL:</b> ' + M.heat + ' warm' + (sz.length ? ' (' + (big ? big + ' large' : '') + (big && sz.length > big ? ', ' : '') + (sz.length > big ? sz.length - big + ' medium' : '') + ')' : '') + ' · zone types ' + M.typed + '/' + G.zones.length);
  const named = I.filter(i => i.guess).map(i => esc(i.guess) + '? ' + (i.fits.length > 1 ? '1 of ' + i.fits.length : 'sure'));
  L.push('<b style="color:' + SCOL.EM + '">EM:</b> ' + M.heard + ' heard' + (M.fixed ? ' · ' + M.fixed + ' fixed: ' + named.join(', ') : M.heard ? ' (no fix yet: keep listening)' : ''));
  const stale = I.filter(i => i.fix && i.mobile && S.t - i.fix.t >= 2).length;
  if (stale) L.push('<span class="warnt">' + stale + ' moving contact' + (stale > 1 ? 's' : '') + ' last seen 2+ min ago: ' + (stale > 1 ? 'they have' : 'it has') + ' moved since.</span>');
  if (M.drops > 1) L.push('<b>Drop zone:</b> tap a numbered circle on the map or a button below.');
  else L.push('<span style="opacity:.75">Point RADAR at a dim “?” apron on the map edge to clear it as a drop zone.</span>');
  return L;
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
let mapK = 1; // CSS px per tile (pointer → tile)
function drawMap() {
  const cv = $('scv') as HTMLCanvasElement, S = G.scan, dpr = Math.min(2, window.devicePixelRatio || 1), act = live();
  const box = cv.parentElement.getBoundingClientRect(), zm = parseFloat(($('scan').style as any).zoom || '1') || 1, maxH = Math.max(140, (window.innerHeight - 70) / zm); // R19 readability: the map takes the height it can
  const k = Math.max(2, Math.min(box.width / zm / W, maxH / H)); mapK = k; // CSS px per tile
  cv.style.width = W * k + 'px'; cv.style.height = 'auto'; cv.width = Math.round(W * k * dpr * zm); cv.height = Math.round(H * k * dpr * zm); // R19 fix: height follows the width (max-width can never stretch the map)
  const c = cv.getContext('2d'), z = k / T; c.setTransform(dpr * zm * z, 0, 0, dpr * zm * z, 0, 0); // drawn at the panel's scale: sharp
  c.fillStyle = '#2c2d30'; c.fillRect(0, 0, W * T, H * T);
  const rb1 = TUNE.SCAN_BANDS.RADAR[0];
  c.fillStyle = '#4a4033'; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (clutter[y * W + x] && (!act || S.cov.RADAR[y * W + x] >= rb1)) c.fillRect(x * T, y * T, T, T); // R20: rubble once radar has looked
  if (act) { // R20: where the current sensor has looked (brighter = more dwell, full at band 3)
    const cov = S.cov[S.sensor], top = TUNE.SCAN_BANDS[S.sensor][2];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const v = cov[y * W + x]; if (v > 0) { c.fillStyle = 'rgba(' + SRGB[S.sensor] + ',' + (0.06 + 0.22 * Math.min(1, v / top)).toFixed(3) + ')'; c.fillRect(x * T, y * T, T, T); } }
  }
  c.fillStyle = 'rgba(60,200,90,0.3)'; c.fillRect((W - TUNE.EXTRACT_COLS) * T, 0, TUNE.EXTRACT_COLS * T, H * T);
  const zk = zoneKnow();
  G.zones.forEach((zn, zi) => {
    const kz = act ? zoneLayer(S, zi) : zk; if (!kz) return;
    const q = zn.type === 'QUIET';
    c.fillStyle = kz < 2 ? 'rgba(200,200,200,0.14)' : q ? 'rgba(90,150,255,0.3)' : 'rgba(255,200,70,0.2)';
    for (const t of zn.tiles) c.fillRect(t.x * T, t.y * T, T, T);
    if (kz >= 2) { c.fillStyle = q ? '#9cf' : '#fd7'; c.font = 'bold ' + (11 / z) + 'px monospace'; c.fillText(q ? 'QUIET' : 'NOISE', (zn.x - 2) * T, (zn.y + 0.4) * T); }
    else { c.fillStyle = '#bbb'; c.font = 'bold ' + (11 / z) + 'px monospace'; c.fillText('ZONE ?', (zn.x - 2) * T, (zn.y + 0.4) * T); }
  });
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (solid[y * W + x]) { c.fillStyle = solid[y * W + x] === 2 ? '#7a5a3c' : '#6b6d72'; c.fillRect(x * T, y * T, T, T); }
  // the objective
  c.strokeStyle = c.fillStyle = '#fc3'; c.lineWidth = 2 / z;
  if (G.mtype === 'ESCORT') { c.globalAlpha = 0.6; anchors().legs.forEach((_, i) => { const P = legPath(i); c.beginPath(); c.moveTo(P[0].x, P[0].y); for (const p of P) c.lineTo(p.x, p.y); c.stroke(); }); c.globalAlpha = 1; }
  else if (G.mtype !== 'BOUNTY') { c.beginPath(); c.arc(G.up.x, G.up.y, 1.5 * T, 0, 6.2832); c.stroke(); c.font = 'bold ' + (12 / z) + 'px monospace'; c.fillText(G.mtype === 'RETRIEVE' ? 'CARGO' : 'UPLINK', G.up.x + 1.8 * T, G.up.y + 4 / z); }
  // drop zones: the offered ones numbered, the picked one bright. R20: an apron radar hasn't cleared yet is a dim "?"
  const D = offeredDrops();
  if (act) dropPts().forEach((d, i) => { if (dropClear(S, i)) return; const x = (d.x + 0.5) * T, y = (d.y + 0.5) * T;
    c.strokeStyle = 'rgba(150,200,255,0.5)'; c.setLineDash([3 / z, 3 / z]); c.lineWidth = 1.5 / z; c.beginPath(); c.arc(x, y, 9 / z, 0, 6.2832); c.stroke(); c.setLineDash([]);
    c.fillStyle = 'rgba(200,220,255,0.7)'; c.font = 'bold ' + (11 / z) + 'px monospace'; c.textAlign = 'center'; c.fillText('?', x, y + 4 / z); c.textAlign = 'left'; });
  D.forEach(d => {
    const on = d.i === S.drop, x = (d.x + 0.5) * T, y = (d.y + 0.5) * T;
    c.fillStyle = on ? '#9cf' : 'rgba(150,200,255,0.35)'; c.beginPath(); c.arc(x, y, (on ? 11 : 9) / z, 0, 6.2832); c.fill();
    c.fillStyle = on ? '#001' : '#cde'; c.font = 'bold ' + (11 / z) + 'px monospace'; c.textAlign = 'center'; c.fillText(String(d.i + 1), x, y + 4 / z); c.textAlign = 'left';
  });
  const placed: { x0: number; y0: number; x1: number; y1: number }[] = []; // R19 readability: labels that would overlap stack downwards
  const label = (t: string, x: number, y: number, r: number, col: string) => {
    c.font = 'bold ' + (11 / z) + 'px monospace'; const tw = c.measureText(t).width;
    const lx = x + r * 0.75 + tw > W * T ? x - r * 0.75 - tw : x + r * 0.75; // stay on the map
    let ly = Math.max(12 / z, y - r * 0.6); const h = 13 / z;
    for (let g = 0; g < 20; g++) { const hit = placed.find(p => lx < p.x1 && lx + tw > p.x0 && ly - h < p.y1 && ly > p.y0); if (!hit) break; ly = hit.y1 + h; }
    placed.push({ x0: lx, y0: ly - h, x1: lx + tw, y1: ly + 2 / z });
    c.fillStyle = 'rgba(10,12,14,0.7)'; c.fillRect(lx - 2 / z, ly - h + 1 / z, tw + 4 / z, h + 2 / z); c.fillStyle = col; c.fillText(t, lx, ly);
  };
  if (act) { drawContacts(c, z, label); drawAim(c, z); return; }
  // LONG blips: a fuzzy circle and the best guess
  for (const b of S.blips || []) {
    c.strokeStyle = '#f90'; c.fillStyle = 'rgba(255,150,0,0.12)'; c.lineWidth = 2 / z; c.setLineDash([5 / z, 4 / z]);
    c.beginPath(); c.arc(b.x, b.y, b.unc, 0, 6.2832); c.fill(); c.stroke(); c.setLineDash([]);
    c.fillStyle = '#f90'; c.fillRect(b.x - 3 / z, b.y - 3 / z, 6 / z, 6 / z);
    label(b.guess + '? ' + (b.fits.length > 1 ? '1 of ' + b.fits.length : 'sure'), b.x, b.y, b.unc, '#ffd27a');
  }
}
// R20: every unit the ship has a fix on: a fuzz circle in the colour of the sensor that fixed it, what it is so far, and
// three band bars (radar / thermal / EM: how hard each has looked at it). A moving contact seen a while ago is dashed and aged.
function drawContacts(c: CanvasRenderingContext2D, z: number, label: (t: string, x: number, y: number, r: number, col: string) => void) {
  const S = G.scan;
  for (const u of G.units) {
    const I = unitIntel(S, u); if (!I || !I.fix) continue;
    const x = I.fix.x * T, y = I.fix.y * T, r = I.fix.unc * T, col = SCOL[I.fix.by], age = S.t - I.fix.t, stale = I.mobile && age >= 2;
    c.strokeStyle = col; c.fillStyle = 'rgba(' + SRGB[I.fix.by] + ',0.12)'; c.lineWidth = 2 / z; c.setLineDash(stale ? [3 / z, 4 / z] : [6 / z, 3 / z]);
    c.beginPath(); c.arc(x, y, r, 0, 6.2832); c.fill(); c.stroke(); c.setLineDash([]);
    c.fillStyle = col; c.beginPath(); c.moveTo(x, y - 4 / z); c.lineTo(x + 4 / z, y); c.lineTo(x, y + 4 / z); c.lineTo(x - 4 / z, y); c.fill();
    [I.rb, I.tb, I.eb].forEach((b, j) => { // the band bars under the mark
      const bx = x - 7.5 / z + j * 5.5 / z, by = y + 6 / z;
      c.fillStyle = 'rgba(10,12,14,0.8)'; c.fillRect(bx, by, 4.5 / z, 8 / z);
      if (b) { c.fillStyle = SCOL[SENSORS[j]]; c.fillRect(bx, by + 8 / z - (8 / z) * b / 3, 4.5 / z, (8 / z) * b / 3); }
    });
    const what = I.guess ? I.guess + '? ' + (I.fits.length > 1 ? '1 of ' + I.fits.length : 'sure') : I.size ? 'warm ' + I.size.toLowerCase() : I.tb ? 'warm' : '?';
    label(what + (stale ? ' · ' + Math.round(age) + 'm ago' : ''), x, y, r, I.guess ? '#e3ccff' : I.tb ? '#ffc8a8' : '#bfeee5');
  }
}
// R20: the aim mark: a solid ring at the core (full strength), a dashed ring at the edge (zero); nothing over the middle.
// WIDE: a frame round the whole map.
function drawAim(c: CanvasRenderingContext2D, z: number) {
  const S = G.scan, col = SCOL[S.sensor];
  c.strokeStyle = col; c.lineWidth = 2.5 / z;
  if (S.wide) { c.setLineDash([10 / z, 6 / z]); c.strokeRect(2 / z, 2 / z, W * T - 4 / z, H * T - 4 / z); c.setLineDash([]); return; }
  const x = (S.aim.x + 0.5) * T, y = (S.aim.y + 0.5) * T;
  c.beginPath(); c.arc(x, y, TUNE.SCAN_AIM_CORE * T, 0, 6.2832); c.stroke();
  c.lineWidth = 1.5 / z; c.setLineDash([6 / z, 5 / z]); c.beginPath(); c.arc(x, y, TUNE.SCAN_AIM_EDGE * T, 0, 6.2832); c.stroke(); c.setLineDash([]);
  for (let a = 0; a < 4; a++) { const dx = Math.cos(a * 1.5708), dy = Math.sin(a * 1.5708), r0 = TUNE.SCAN_AIM_CORE * T; c.beginPath(); c.moveTo(x + dx * r0, y + dy * r0); c.lineTo(x + dx * (r0 + 10 / z), y + dy * (r0 + 10 / z)); c.stroke(); } // ticks outside the core
}
// ---- the clock: real seconds → ship-minutes → sim steps ----
let raf = 0, lastT = 0, acc = 0;
function loop(now: number) {
  const S = G.scan; raf = 0;
  if (!live() || !S.run || $('scan').hidden) { if (live() && S.run) scanCmd('S'); renderScan(); return; }
  acc += Math.min(0.25, (now - lastT) / 1000) * TUNE.SCAN_TIME_RATE; lastT = now;
  let n = 0; while (acc >= TUNE.SCAN_TICK - 1e-9 && S.run) { scanStep(); acc -= TUNE.SCAN_TICK; n++; }
  if (n) renderScan();
  raf = requestAnimationFrame(loop);
}
function startStop() {
  const S = G.scan; if (!live()) return;
  if (S.run) scanCmd('S'); else { scanCmd('G'); acc = 0; lastT = performance.now(); if (!raf) raf = requestAnimationFrame(loop); }
  renderScan();
}
// ---- the map's pointer: R20 drags the ring (relative, so the thumb never covers what it aims at); a tap picks a drop zone
// (R19 and R20) or, in the live scan, jumps the ring there ----
let down: { x: number; y: number; ax: number; ay: number; drag: boolean } | null = null;
const toTile = (ev: PointerEvent) => { const r = ($('scv') as HTMLCanvasElement).getBoundingClientRect(), k = r.width / W; return { x: (ev.clientX - r.left) / k, y: (ev.clientY - r.top) / k }; };
function pDown(ev: PointerEvent) {
  if (live()) { ($('scv') as HTMLCanvasElement).setPointerCapture(ev.pointerId); down = { x: ev.clientX, y: ev.clientY, ax: G.scan.aim.x, ay: G.scan.aim.y, drag: false }; return; }
  tapDrop(toTile(ev));
}
function pMove(ev: PointerEvent) {
  if (!down || !live()) return;
  const dx = ev.clientX - down.x, dy = ev.clientY - down.y;
  if (!down.drag && Math.hypot(dx, dy) < 8) return;
  down.drag = true; const k = ($('scv') as HTMLCanvasElement).getBoundingClientRect().width / W || mapK;
  if (G.scan.wide) scanCmd('w');
  const before = G.scan.aim.x + ',' + G.scan.aim.y; scanCmd('a', down.ax + dx / k, down.ay + dy / k);
  if (G.scan.aim.x + ',' + G.scan.aim.y !== before) renderScan();
}
function pUp(ev: PointerEvent) {
  if (!down || !live()) return;
  const d = down; down = null; if (d.drag) return;
  const t = toTile(ev); if (tapDrop(t)) return;
  if (G.scan.wide) scanCmd('w');
  scanCmd('a', Math.floor(t.x), Math.floor(t.y)); renderScan();
}
function tapDrop(t: { x: number; y: number }) {
  if (!scanDone()) return false;
  let best = -1, bd = 3; // within 3 tiles
  offeredDrops().forEach(d => { const dd = Math.hypot(d.x + 0.5 - t.x, d.y + 0.5 - t.y); if (dd < bd) { bd = dd; best = d.i; } });
  if (best < 0 || offeredDrops().length < 2) return false;
  chooseDrop(best); renderScan(); return true;
}
$('sDial').addEventListener('click', ev => {
  const b = (ev.target as any).closest('.sd'); if (!b || G.scan.lvl >= 0 || locked >= 0) return;
  pickLvl = +b.dataset.l; renderScan();
});
$('sSens').addEventListener('click', ev => {
  const b = (ev.target as any).closest('.ss'); if (!b || !live()) return;
  const s = b.dataset.s; if (s === 'WIDE') scanCmd(G.scan.wide ? 'w' : 'W'); else scanCmd(s[0]); // R / T / E
  renderScan();
});
$('bRun').addEventListener('click', startStop);
$('bListen').addEventListener('click', () => { if (listen(pickLvl)) renderScan(); });
$('sDrops').addEventListener('click', ev => { const b = (ev.target as any).closest('.sdz'); if (b) { chooseDrop(+b.dataset.d); renderScan(); } });
$('scv').addEventListener('pointerdown', pDown);
$('scv').addEventListener('pointermove', pMove);
$('scv').addEventListener('pointerup', pUp);
$('scv').addEventListener('pointercancel', () => { down = null; });
$('bScanCard').addEventListener('click', () => { if (live() && G.scan.run) scanCmd('S'); $('scan').hidden = true; showCard('scan'); });
$('bScanGo').addEventListener('click', () => { if (scanDone()) { $('scan').hidden = true; onGo(); } });
window.addEventListener('resize', () => { if (!$('scan').hidden) drawMap(); });
