// Visual lab, UI mode, part 2: the R19–R21 screens in the micrographics language.
//   SIGINT   the live pre-drop scan (R20), running on the REAL sim: rollEnemy + freshScan, the view sends scanCmd, the clock
//            steps scanStep. Same rules as the game; only the drawing is new.
//   CITY     the campaign map (concept: game shape "The city and travel"; nothing in the sim yet). Mock districts, factions,
//            standing, fuel per jump, SIGINT range.
//   COMPANY  the R21 company screen (books, roster, suits, market, ship, memorial) on a REAL company (newCompany), kept apart
//            from the field: it is swapped into G.co only while its rules run.
//   HANGAR   the R18 hangar (Jamie's ExoS wireframe, locations, hardpoints) on that company's suits, through the real fit rules.
// Nothing here is saved. SIGINT re-rolls the world, so the field behind is held while it is open and restarts on the way out.
import { TUNE } from '../tune.ts';
import { G, rollEnemy } from '../sim/state.ts';
import { W, H, T, solid, clutter, anchors } from '../sim/world.ts';
import { freshScan, offeredDrops, chooseDrop, dropPts, scanDone } from '../sim/scan.ts';
import { scanCmd, scanStep, unitIntel, zoneLayer, dropClear, liveSummary, SENSORS, sensorsOn, riskStep, riskAt, stepVal, ALTS, ringCore, ringEdge } from '../sim/livescan.ts';
import { legPath } from '../sim/escort.ts';
import { MISSION_INFO } from '../sim/mission.ts';
import { newCompany, skillName, skillEffect, isVet, nextLevelXp, wageOf, runningCosts, fuelCost, offerBlock, opById, canDrop, seat, suitFit, suitCost, suitRefitBlock, suitRefit,
  holdCap, fuelMax, opCap, suitCap, buyBlock, buy, sellPart, hireBlock, hire, freeItem, modBuyBlock, buyMod, fitMod, unfitBlock, unfitMod, modCount, setSuitFit } from '../sim/company.ts';
import { dmgWord } from '../sim/contract.ts';
import { partsRead, splitHits, PART_ABBR } from '../sim/combat.ts';
import { FRAMES, ITEMS, LOCS, PLATES, byId } from '../sim/items.ts';
import type { HP, Item, Loc } from '../sim/items.ts';
import { frameOf, isCont, itemsIn, mount, unmount, whyNot } from '../sim/fit.ts';
import { fitStats, fitHits, fitRounds, fitShells, launchBlock, hangarWhy, LOC_PART } from '../sim/kit.ts';
import { EXOS_VIEWBOX, EXOS_LINES, EXOS_PANELS } from '../view/exos.ts';
import { look } from './looks.ts';
import { UIK, frameAll, glyph, dots, seg, matrix, gauge, ringed, pad } from './kit.ts';
import { fx, btn, cap, currentScreen, rerender } from './ui.ts';

const $ = (id: string) => document.getElementById(id);
const esc = (t: string) => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
let holdWorld: (on: boolean) => void = () => {};
export function setWorldHold(f: (on: boolean) => void) { holdWorld = f; }

// ---------------------------------------------------------------- colour helpers (canvas)
const probe = document.createElement('canvas').getContext('2d')!;
function rgb(c: string): [number, number, number] {
  probe.fillStyle = '#000'; probe.fillStyle = c; const s = probe.fillStyle as string;
  if (s[0] === '#') return [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)];
  const m = s.match(/[\d.]+/g) || ['0', '0', '0']; return [+m[0], +m[1], +m[2]];
}
const rgba = (c: string, a = 1) => { const [r, g, b] = rgb(c); return `rgba(${r},${g},${b},${a})`; };
function mix(a: string, b: string, t: number) { const A = rgb(a), B = rgb(b); return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(',')})`; }
// the game's sensor colours (scan.ts), pulled toward the look's ink by UIK.sensTrue (1 = the game's colours, 0 = all ink)
const SC: Record<string, string> = { RADAR: '#4fd8c0', THERMAL: '#ff8a50', EM: '#c79bff' };
const scol = (s: string) => mix(look.ink, SC[s], UIK.sensTrue);
const SNAME: Record<string, string> = { RADAR: 'RADAR', THERMAL: 'THERMAL', EM: 'EM LISTEN' };
const SGLYPH: Record<string, string> = { RADAR: 'radar', THERMAL: 'spark', EM: 'wave' };
const SHELP: Record<string, string> = {
  RADAR: 'WHERE. Active, fast, loud. Every unit as an unknown ping (silent ones too), zone outlines, rubble, which drop zones are clear.',
  THERMAL: 'WHAT’S ALIVE. Passive, medium. Zone types (noise hot, quiet cold); warm units as a heat blob, then their size.',
  EM: 'WHO. Passive, slow. Only what transmits: counted, then a bearing fix with the CARD’s best guess, firmer the longer you listen.',
};
const ALT_HELP: Record<string, string> = { HIGH: 'Wide rings, weaker sensors, fuzzier fixes. Quieter.', MID: 'The standard scan.', LOW: 'Small rings, stronger sensors, sharper fixes. Louder.' };

// ================================================================ SIGINT
const MISSIONS = ['UPLINK', 'RETRIEVE', 'BOUNTY', 'ESCORT'];
const SG = { n: 0, sel: 'RADAR', raf: 0, last: 0, acc: 0, k: 8, ready: false, down: null as null | { x: number; y: number; ax: number; ay: number; s: string; drag: boolean } };
const live = () => !!G.scan && G.scan.mode === 'active';
function sigRoll() {
  holdWorld(true);
  const seed = 4107 + SG.n * 7919, mt = MISSIONS[SG.n % MISSIONS.length];
  G.scan = null; rollEnemy(seed, undefined, mt); freshScan(seed, mt);
  SG.sel = 'RADAR'; SG.ready = true;
}
export function sigint() {
  if (!SG.ready || !live()) sigRoll();
  const S = G.scan, M = (MISSION_INFO as any)[G.mtype] || { name: G.mtype };
  return `<div class="scr sig">
  ${fx('bar', `<div class="row" style="padding:10px 16px 8px 46px;justify-content:space-between"><b class="h3" data-decode>SIGINT // LIVE SCAN</b><span class="row data"><span>JOB ${pad(SG.n + 1)} // ${esc(M.name || G.mtype).toUpperCase()} // SEED ${S.seed}</span><span>${W}×${H} TILES</span><span class="jp">信号情報</span></span></div>`, { treat: 'acc', marks: 'hatch4 pip' })}
  <div class="sigw">
    ${fx('dossier', `<div class="sigmap" id="sgMapBox"><canvas id="sgCv"></canvas></div><div class="sigleg data">${['RADAR', 'THERMAL', 'EM'].map(s => `<span><i style="background:${scol(s)}"></i>${SNAME[s]}</span>`).join('')}<span><i class="q"></i>QUIET</span><span><i class="n"></i>NOISE</span><span>DRAG A RING // TAP = MOVE THE SELECTED RING // TAP A NUMBER = DROP ZONE</span></div>`, { cls: 'sgbox', treat: 'dbl', marks: 'dots pip ticks' })}
    <div class="sigside">
      ${fx('wing', `<div class="box" id="sgClock"></div>`, { treat: 'acc' })}
      ${fx('panel', `<div class="box"><div id="sgSens"></div></div>`, { marks: 'dots pip' })}
      ${fx('panel', `<div class="box" id="sgRisk"></div>`, { marks: 'dots' })}
      ${fx('side', `<div class="box" id="sgIntel"></div>`)}
      <div id="sgGo"></div>
    </div>
  </div></div>`;
}
export function sigintOpened() {
  sigPanels(true);
  cancelAnimationFrame(SG.raf); SG.last = performance.now(); SG.acc = 0; SG.raf = requestAnimationFrame(sigLoop);
  const cv = $('sgCv') as HTMLCanvasElement;
  cv.addEventListener('pointerdown', pDown); cv.addEventListener('pointermove', pMove); cv.addEventListener('pointerup', pUp); cv.addEventListener('pointercancel', () => { SG.down = null; });
}
function sigPanels(all = false) {
  const S = G.scan; if (!S || !$('sgClock')) return;
  const m = (x: number) => (Math.round(x * 4) / 4).toFixed(2), on = sensorsOn(S);
  const state = S.run ? (on.length ? 'SCANNING' : 'COOLING') : S.over ? 'WINDOW CLOSED' : S.t ? 'PAUSED' : 'ON STATION';
  $('sgClock')!.innerHTML = `${cap('SHIP CLOCK // SHIP-MIN', 'no')}
    <div class="row" style="justify-content:space-between;align-items:flex-end"><div class="sgt"><b>${m(S.t)}</b><small>T+ MIN</small></div><span class="pill${S.run ? ' solid' : ''}${S.over ? ' foe' : ''}">${S.run ? '● ' : ''}${state}</span></div>
    ${S.deadline ? `<div class="row data" style="justify-content:space-between"><span class="${S.deadline - S.t <= 3 ? 'foe' : 'obj'}">DEADLINE ${S.deadline} // ${m(Math.max(0, S.deadline - S.t))} LEFT</span>${seg(S.t, S.deadline, 20)}</div>` : '<div class="data">NO DEADLINE ON THIS JOB // TIME ONLY PASSES WHILE THE CLOCK RUNS</div>'}`;
  const k = riskStep(S.risk), lo = riskAt(k), nx = riskAt(k + 1), pc = (x: number) => Math.round(x * 100) + '%';
  const awake = stepVal(TUNE.SCAN_RISK_ALERT, k), paint = stepVal(TUNE.SCAN_RISK_PAINT, k), extra = k + 1 > S.peak ? stepVal(TUNE.SCAN_RISK_EXTRA, k + 1) : 0;
  $('sgRisk')!.innerHTML = `${cap('RISK // WHAT THE FIELD HEARS')}
    <div class="row" style="gap:14px">${gauge(S.risk - lo, Math.max(1e-6, nx - lo), String(k), 'STEP', 64)}<div style="flex:1;display:grid;gap:4px">
      <div class="row"><span class="dim" style="font-size:9px">METER</span><b class="${k ? 'foe' : ''}">${S.risk.toFixed(1)}</b>${dots(k, TUNE.SCAN_RISK_STEPS.length + 1, 'sm')}</div>
      <div class="data">DROP NOW: <span class="${k ? 'foe' : ''}">${k ? pc(awake) + ' AWAKE' + (paint ? ' // ' + pc(paint) + ' PAINTED' : '') : 'NOBODY STIRS'}</span></div>
      <div class="data">STEP ${k + 1} AT ${nx}: ${extra ? pc(extra) + ' A UNIT IS CALLED IN // ' : ''}${pc(stepVal(TUNE.SCAN_RISK_ALERT, k + 1))} AWAKE</div></div></div>
    <div class="data">RADAR IS LOUD // ALL SENSORS OFF AND THE METER COOLS</div>`;
  $('sgIntel')!.innerHTML = cap('WHAT THE SHIP KNOWS') + intelLines().map(l => `<div class="sgl">${l}</div>`).join('');
  if (!all) return;
  $('sgSens')!.innerHTML = `${cap('SENSORS // ANY MIX AT ONCE')}
    <div class="sgsens">${SENSORS.map(s => { const st = S.on[s] ? (S.wide[s] ? 'FULL MAP' : 'RING') : 'OFF';
      return `<button class="sgs${S.on[s] ? ' on' : ''}${S.on[s] && s === SG.sel ? ' sel' : ''}" data-sg="sens:${s}" style="--sc:${scol(s)}">${glyph(SGLYPH[s], 16)}<span><b>${SNAME[s]}</b><small>${st}</small></span><i></i></button>`; }).join('')}</div>
    <div class="row" style="justify-content:space-between;margin-top:8px"><div class="segsel" data-sg="alt">${ALTS.map(a => `<button class="${S.alt === a ? 'on' : ''}" data-a="${ALTS.indexOf(a)}">ALT ${a}</button>`).join('')}</div>
      ${btn(S.on[SG.sel] && S.wide[SG.sel] ? 'RING' : 'FULL MAP', { cls: 'sm' + (S.on[SG.sel] ? '' : ' lock'), act: 'sg:wide', sub: SNAME[SG.sel] })}</div>
    <div class="data" style="margin-top:6px;text-transform:none;letter-spacing:.04em"><b style="color:${scol(SG.sel)}">${SNAME[SG.sel]}</b> ${SHELP[SG.sel]}<br><span class="dim">ALT ${S.alt}: ${ALT_HELP[S.alt]}</span></div>`;
  const D = offeredDrops(), done = scanDone();
  $('sgGo')!.innerHTML = `<div class="row" style="justify-content:space-between">
    <div class="row">${done && D.length > 1 ? D.map(d => `<button class="sgdz${d.i === S.drop ? ' on' : ''}" data-sg="drop:${d.i}" title="${esc(d.name || '')}">${ringed(String(d.i + 1), d.i === S.drop ? 'on' : '')}<small>${esc((d.name || '').toUpperCase())}</small></button>`).join('') : `<span class="data">${done ? 'ONE DROP ZONE CLEAR // RADAR THE ? APRONS FOR MORE' : 'DROP ZONES ONCE THE CLOCK STOPS'}</span>`}</div>
    <div class="row">${btn('NEW JOB', { cls: 'sm', act: 'sg:new', icon: 'back' })}${btn(S.run ? 'PAUSE' : S.over ? 'CLOSED' : S.t ? 'RESUME' : 'START CLOCK', { solid: !S.run && !S.over, act: 'sg:run', cls: S.over && !S.run ? 'lock' : '', icon: 'clock' })}${btn('TO THE HANGAR', { solid: done && !S.run, go: 'HANGAR', cls: done ? '' : 'lock', sub: 'THEN DROP' })}</div></div>`;
  for (const id of ['sgSens', 'sgGo']) frameAll($(id)!);
}
function intelLines() {
  const S = G.scan, M = liveSummary(S), L: string[] = [], c = (s: string) => `<span class="brk" style="color:${scol(s)}"><i>[</i>${s === 'EM' ? 'EM' : s}<i>]</i></span>`;
  if (!S.t) return ['<span class="dim">TURN SENSORS ON, DRAG EACH RING ONTO WHAT MATTERS (OR FULL MAP), THEN START THE CLOCK. PAUSE TO THINK. DROP LANDS WITH WHAT YOU KNOW.</span>'];
  const I = G.units.map(u => unitIntel(S, u)).filter(Boolean) as any[];
  L.push(`${c('RADAR')} ${M.pings} PING${M.pings === 1 ? '' : 'S'} // ZONES ${M.zones}/${G.zones.length} // DROPS ${M.drops}/${dropPts().length} CLEAR`);
  const sz = I.filter(i => i.size), big = sz.filter(i => i.size === 'LARGE').length;
  L.push(`${c('THERMAL')} ${M.heat} WARM${sz.length ? ' (' + [big ? big + ' LARGE' : '', sz.length > big ? sz.length - big + ' MEDIUM' : ''].filter(Boolean).join(', ') + ')' : ''} // ZONE TYPES ${M.typed}/${G.zones.length}`);
  const named = I.filter((i: any) => i.guess).map(i => esc(i.guess).toUpperCase() + '? ' + (i.fits.length > 1 ? '1 OF ' + i.fits.length : 'SURE'));
  L.push(`${c('EM')} ${M.heard} HEARD${M.fixed ? ' // ' + M.fixed + ' FIXED: ' + named.join(', ') : M.heard ? ' // NO FIX YET' : ''}`);
  if (S.adds.length) L.push(`<span class="foe">[!] THE FIELD HAS GROWN: ${S.adds.length} MORE</span>`);
  const stale = I.filter(i => i.fix && i.mobile && S.t - i.fix.t >= 2).length;
  if (stale) L.push(`<span class="obj">${stale} MOVING CONTACT${stale > 1 ? 'S' : ''} LAST SEEN 2+ MIN AGO</span>`);
  return L;
}
// the clock: real seconds → ship-minutes → sim steps (scan.ts's loop), plus the map's own animation every frame
function sigLoop(now: number) {
  if (currentScreen() !== 'SIGINT' || !$('sgCv')) { SG.raf = 0; return; }
  const S = G.scan, dt = Math.min(0.25, (now - SG.last) / 1000); SG.last = now;
  if (S && live() && S.run) {
    SG.acc += dt * TUNE.SCAN_TIME_RATE; let n = 0;
    while (SG.acc >= TUNE.SCAN_TICK - 1e-9 && S.run) { scanStep(); SG.acc -= TUNE.SCAN_TICK; n++; }
    if (n) sigPanels(!S.run); // the window can close on a step
  }
  drawSig(now / 1000);
  SG.raf = requestAnimationFrame(sigLoop);
}
export function sigAct(act: string, el: HTMLElement, t: HTMLElement) {
  const S = G.scan; if (!S) return;
  if (act === 'sg:run') { if (S.run) scanCmd('S'); else if (!S.over) { scanCmd('G'); SG.acc = 0; } }
  else if (act === 'sg:wide') { if (S.on[SG.sel]) scanCmd('W', SENSORS.indexOf(SG.sel as any), S.wide[SG.sel] ? 0 : 1); }
  else if (act === 'sg:new') { SG.n++; sigRoll(); rerender(); return; }
  else if (act.startsWith('sens:')) { const s = act.slice(5); if (!S.on[s]) { scanCmd(s[0], 1); SG.sel = s; } else if (SG.sel !== s) SG.sel = s; else { scanCmd(s[0], 0); SG.sel = sensorsOn(S)[0] || s; } }
  else if (act.startsWith('drop:')) chooseDrop(+act.slice(5));
  else if (act === 'alt') { const b = t.closest('button') as HTMLElement; if (b) scanCmd('H', +b.dataset.a!); }
  sigPanels(true);
}
// ---- the map
function sizeMap() {
  const cv = $('sgCv') as HTMLCanvasElement, box = $('sgMapBox')!, dpr = Math.min(2, devicePixelRatio || 1);
  const bw = box.clientWidth, maxH = Math.max(220, innerHeight - 190), k = Math.max(3, Math.min(bw / W, maxH / H));
  if (SG.k !== k || cv.width !== Math.round(W * k * dpr)) { SG.k = k; cv.style.width = W * k + 'px'; cv.style.height = H * k + 'px'; cv.width = Math.round(W * k * dpr); cv.height = Math.round(H * k * dpr); }
  const c = cv.getContext('2d')!; c.setTransform(dpr, 0, 0, dpr, 0, 0); return c;
}
function drawSig(time: number) {
  const S = G.scan; if (!S || !$('sgCv')) return;
  const c = sizeMap(), k = SG.k, ink = look.ink, dim = look.dim, F = look.font;
  c.clearRect(0, 0, W * k, H * k);
  c.fillStyle = rgba(look.bg, 0.55); c.fillRect(0, 0, W * k, H * k);
  // reference dots every 2 tiles
  c.fillStyle = rgba(ink, 0.18); for (let y = 0; y <= H; y += 2) for (let x = 0; x <= W; x += 2) c.fillRect(x * k - 0.5, y * k - 0.5, 1, 1);
  // coverage: a halftone screen per sensor (dot size = dwell, full at band 3); each sensor's dots sit a little apart
  sensorsOn(S).forEach((sn, j) => {
    const cov = S.cov[sn], top = TUNE.SCAN_BANDS[sn][2], col = rgba(scol(sn), 0.6), ox = (j - 1) * k * 0.22;
    c.fillStyle = col;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const v = cov[y * W + x]; if (v <= 0) continue; const r = k * (0.1 + 0.26 * Math.min(1, v / top)); c.beginPath(); c.arc((x + 0.5) * k + ox, (y + 0.5) * k + ox * 0.6, r, 0, 6.2832); c.fill(); }
  });
  // rubble, once radar has looked
  const rb1 = TUNE.SCAN_BANDS.RADAR[0]; c.strokeStyle = rgba(dim, 0.7); c.lineWidth = 1;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (clutter[y * W + x] && S.cov.RADAR[y * W + x] >= rb1) { const cx = (x + 0.5) * k, cy = (y + 0.5) * k, r = k * 0.18; c.beginPath(); c.moveTo(cx - r, cy - r); c.lineTo(cx + r, cy + r); c.moveTo(cx + r, cy - r); c.lineTo(cx - r, cy + r); c.stroke(); }
  // the exit band
  const ex = (W - TUNE.EXTRACT_COLS) * k, fr = look.friend || ink;
  c.fillStyle = rgba(fr, 0.06); c.fillRect(ex, 0, W * k - ex, H * k);
  c.strokeStyle = rgba(fr, 0.8); c.setLineDash([2, 4]); c.beginPath(); c.moveTo(ex, 0); c.lineTo(ex, H * k); c.stroke(); c.setLineDash([]);
  c.save(); c.translate(ex + 9, H * k / 2); c.rotate(Math.PI / 2); c.fillStyle = rgba(fr, 0.9); c.font = `600 8px ${F}`; c.textAlign = 'center'; c.fillText('EXFIL // EAST EDGE', 0, 0); c.restore();
  // zones: tile outlines (dashed and grey until thermal says what they are), hatch = quiet, dots = noise
  G.zones.forEach((zn, zi) => {
    const kz = zoneLayer(S, zi); if (!kz) return;
    const q = zn.type === 'QUIET', col = kz < 2 ? dim : q ? ink : look.objective, set = new Set(zn.tiles.map(t => t.x + ',' + t.y));
    if (kz >= 2) for (const t of zn.tiles) { c.fillStyle = rgba(col, 0.35);
      if (q) { c.save(); c.beginPath(); c.rect(t.x * k, t.y * k, k, k); c.clip(); c.strokeStyle = rgba(col, 0.4); c.beginPath(); for (let d = -k; d < k * 2; d += 4) { c.moveTo(t.x * k + d, t.y * k); c.lineTo(t.x * k + d + k, t.y * k + k); } c.stroke(); c.restore(); }
      else { c.beginPath(); c.arc((t.x + 0.5) * k, (t.y + 0.5) * k, Math.max(0.8, k * 0.09), 0, 6.2832); c.fill(); } }
    c.strokeStyle = rgba(col, kz < 2 ? 0.7 : 0.9); c.setLineDash(kz < 2 ? [1, 3] : [4, 2]); c.beginPath();
    for (const t of zn.tiles) { const x = t.x * k, y = t.y * k;
      if (!set.has(t.x + ',' + (t.y - 1))) { c.moveTo(x, y); c.lineTo(x + k, y); } if (!set.has(t.x + ',' + (t.y + 1))) { c.moveTo(x, y + k); c.lineTo(x + k, y + k); }
      if (!set.has((t.x - 1) + ',' + t.y)) { c.moveTo(x, y); c.lineTo(x, y + k); } if (!set.has((t.x + 1) + ',' + t.y)) { c.moveTo(x + k, y); c.lineTo(x + k, y + k); } }
    c.stroke(); c.setLineDash([]);
    c.fillStyle = rgba(col, 0.95); c.font = `600 8px ${F}`; c.fillText(kz < 2 ? 'ZONE ?' : (q ? 'QUIET' : 'NOISE') + ' // ' + String(zn.name || '').toUpperCase(), (zn.x - 2) * k, (zn.y - 0.6) * k);
  });
  // buildings: blueprint massing (a light fill, the outline only where a block meets the street), plus a dot screen (UIK.mapDot)
  const B = (x: number, y: number) => x >= 0 && y >= 0 && x < W && y < H && !!solid[y * W + x];
  c.fillStyle = rgba(dim, 0.16); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (solid[y * W + x]) c.fillRect(x * k, y * k, k, k);
  if (UIK.mapDot > 0) { c.fillStyle = rgba(ink, 0.5 * UIK.mapDot); const s = Math.max(1, k * 0.14); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (solid[y * W + x]) { c.fillRect(x * k + k * 0.25 - s / 2, y * k + k * 0.25 - s / 2, s, s); c.fillRect(x * k + k * 0.75 - s / 2, y * k + k * 0.75 - s / 2, s, s); } }
  c.strokeStyle = rgba(ink, 0.55); c.lineWidth = 1; c.beginPath();
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { if (!solid[y * W + x]) continue; const X = x * k, Y = y * k;
    if (!B(x, y - 1)) { c.moveTo(X, Y); c.lineTo(X + k, Y); } if (!B(x, y + 1)) { c.moveTo(X, Y + k); c.lineTo(X + k, Y + k); }
    if (!B(x - 1, y)) { c.moveTo(X, Y); c.lineTo(X, Y + k); } if (!B(x + 1, y)) { c.moveTo(X + k, Y); c.lineTo(X + k, Y + k); } }
  c.stroke();
  // the objective
  const ob = look.objective, z = k / T; c.strokeStyle = c.fillStyle = ob; c.lineWidth = 1.2;
  if (G.mtype === 'ESCORT') { c.setLineDash([4, 3]); anchors().legs.forEach((_: any, i: number) => { const P = legPath(i); c.beginPath(); P.forEach((p: any, j: number) => j ? c.lineTo(p.x * z, p.y * z) : c.moveTo(p.x * z, p.y * z)); c.stroke(); }); c.setLineDash([]); }
  else if (G.mtype !== 'BOUNTY') { const x = G.up.x * z, y = G.up.y * z, r = 1.5 * k;
    c.beginPath(); c.arc(x, y, r, 0, 6.2832); c.stroke(); c.setLineDash([1, 3]); c.beginPath(); c.arc(x, y, r * 1.35, time * 0.6, time * 0.6 + 6.2832); c.stroke(); c.setLineDash([]);
    c.beginPath(); c.moveTo(x, y - 4); c.lineTo(x + 4, y); c.lineTo(x, y + 4); c.lineTo(x - 4, y); c.fill();
    c.font = `600 9px ${F}`; c.fillText(G.mtype === 'RETRIEVE' ? 'CARGO' : 'UPLINK', x + r + 5, y + 3); }
  // drop zones: offered = numbered rings (the picked one solid with spinning brackets); an apron radar hasn't cleared = a dim ?
  dropPts().forEach((d, i) => { if (dropClear(S, i)) return; const x = (d.x + 0.5) * k, y = (d.y + 0.5) * k;
    c.strokeStyle = rgba(fr, 0.5); c.setLineDash([2, 3]); c.beginPath(); c.arc(x, y, 8, 0, 6.2832); c.stroke(); c.setLineDash([]);
    c.fillStyle = rgba(fr, 0.7); c.font = `600 9px ${F}`; c.textAlign = 'center'; c.fillText('?', x, y + 3); c.textAlign = 'left'; });
  offeredDrops().forEach(d => { const on = d.i === S.drop, x = (d.x + 0.5) * k, y = (d.y + 0.5) * k;
    c.strokeStyle = fr; c.fillStyle = on ? fr : rgba(look.bg, 0.8); c.beginPath(); c.arc(x, y, 8, 0, 6.2832); c.fill(); c.stroke();
    if (on) { c.save(); c.translate(x, y); c.rotate(time * 1.2); for (let a = 0; a < 4; a++) { c.rotate(Math.PI / 2); c.beginPath(); c.moveTo(12, -4); c.lineTo(14, -4); c.lineTo(14, 4); c.lineTo(12, 4); c.stroke(); } c.restore(); }
    c.fillStyle = on ? look.bg : fr; c.font = `600 9px ${look.display}`; c.textAlign = 'center'; c.fillText(String(d.i + 1), x, y + 3); c.textAlign = 'left'; });
  // contacts: every unit the ship has a fix on
  const placed: number[][] = [];
  const label = (t: string, x: number, y: number, r: number, col: string) => {
    c.font = `600 8px ${F}`; const tw = c.measureText(t).width, h = 11, lx = x + r * 0.75 + tw + 8 > W * k ? x - r * 0.75 - tw - 8 : x + r * 0.75 + 4; let ly = Math.max(h, y - r * 0.6);
    for (let g = 0; g < 20; g++) { const hit = placed.find(p => lx < p[2] && lx + tw > p[0] && ly - h < p[3] && ly > p[1]); if (!hit) break; ly = hit[3] + h; }
    placed.push([lx, ly - h, lx + tw, ly + 2]);
    c.fillStyle = rgba(look.bg, 0.85); c.fillRect(lx - 3, ly - h + 2, tw + 6, h); c.fillStyle = col; c.fillRect(lx - 3, ly - h + 2, 1, h); c.fillText(t, lx, ly - 1);
  };
  for (const u of G.units) {
    const I: any = unitIntel(S, u); if (!I || !I.fix) continue;
    const x = I.fix.x * k, y = I.fix.y * k, r = Math.max(5, I.fix.unc * k), col = scol(I.fix.by), age = S.t - I.fix.t, stale = I.mobile && age >= 2;
    c.strokeStyle = col; c.fillStyle = rgba(col, 0.1); c.setLineDash(stale ? [1, 3] : [4, 2]); c.beginPath(); c.arc(x, y, r, 0, 6.2832); c.fill(); c.stroke(); c.setLineDash([]);
    c.fillStyle = col; c.beginPath(); c.moveTo(x, y - 3.5); c.lineTo(x + 3.5, y); c.lineTo(x, y + 3.5); c.lineTo(x - 3.5, y); c.fill();
    [I.rb, I.tb, I.eb].forEach((b: number, j: number) => { const bx = x - 7 + j * 5, by = y + 6; c.strokeStyle = rgba(dim, 0.8); c.strokeRect(bx + 0.5, by + 0.5, 3, 8); if (b) { c.fillStyle = scol(SENSORS[j]); c.fillRect(bx + 0.5, by + 8.5 - 8 * b / 3, 3, 8 * b / 3); } });
    const what = I.guess ? I.guess + '? ' + (I.fits.length > 1 ? '1 OF ' + I.fits.length : 'SURE') : I.size ? 'WARM ' + I.size : I.tb ? 'WARM' : 'PING';
    label(what.toUpperCase() + (stale ? ' // ' + Math.round(age) + 'M AGO' : ''), x, y, r, col);
  }
  // the aim rings: core solid, edge dashed, ticks, the name on the ring; radar sweeps, thermal + EM breathe while the clock runs
  sensorsOn(S).forEach((sn, j) => {
    const col = scol(sn), me = sn === SG.sel; c.globalAlpha = me ? 1 : 0.65; c.strokeStyle = col; c.lineWidth = me ? 1.6 : 1;
    if (S.wide[sn]) { const p = 3 + j * 5, L = 16; c.beginPath(); for (const [cx, cy, sx, sy] of [[p, p, 1, 1], [W * k - p, p, -1, 1], [W * k - p, H * k - p, -1, -1], [p, H * k - p, 1, -1]]) { c.moveTo(cx + sx * L, cy); c.lineTo(cx, cy); c.lineTo(cx, cy + sy * L); } c.stroke();
      c.setLineDash([8, 6]); c.strokeRect(p, p, W * k - 2 * p, H * k - 2 * p); c.setLineDash([]); c.fillStyle = col; c.font = `600 8px ${F}`; c.fillText(SNAME[sn] + ' // FULL MAP', p + 6, p + 12 + j * 2); c.globalAlpha = 1; return; }
    const A = S.aims[sn], x = (A.x + 0.5) * k, y = (A.y + 0.5) * k, r0 = ringCore(S) * k, r1 = ringEdge(S) * k;
    c.beginPath(); c.arc(x, y, r0, 0, 6.2832); c.stroke();
    c.lineWidth = 1; c.setLineDash([5, 4]); c.beginPath(); c.arc(x, y, r1, 0, 6.2832); c.stroke(); c.setLineDash([]);
    for (let a = 0; a < 24; a++) { const an = a / 24 * 6.2832, l = a % 6 ? 3 : 8; c.beginPath(); c.moveTo(x + Math.cos(an) * r0, y + Math.sin(an) * r0); c.lineTo(x + Math.cos(an) * (r0 + l), y + Math.sin(an) * (r0 + l)); c.stroke(); }
    if (S.run) {
      if (sn === 'RADAR') { const a0 = time * 2.4; const g = c.createRadialGradient(x, y, 0, x, y, r0); g.addColorStop(0, rgba(col, 0)); g.addColorStop(1, rgba(col, 0.28));
        c.fillStyle = g; c.beginPath(); c.moveTo(x, y); c.arc(x, y, r0, a0 - 0.6, a0); c.closePath(); c.fill(); c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a0) * r0, y + Math.sin(a0) * r0); c.stroke(); }
      else { const ph = (time * (sn === 'EM' ? 0.35 : 0.6) + j * 0.3) % 1; c.globalAlpha = (me ? 1 : 0.65) * (1 - ph); c.beginPath(); c.arc(x, y, r0 * ph, 0, 6.2832); c.stroke(); c.globalAlpha = me ? 1 : 0.65; }
    }
    const ang = -2.4 + j * 0.9; c.fillStyle = col; c.font = `600 8px ${F}`; c.textAlign = 'center'; c.fillText(SNAME[sn], x + Math.cos(ang) * (r0 + 14), y + Math.sin(ang) * (r0 + 14) + 3); c.textAlign = 'left';
    c.beginPath(); c.moveTo(x - 4, y); c.lineTo(x + 4, y); c.moveTo(x, y - 4); c.lineTo(x, y + 4); c.stroke(); c.globalAlpha = 1;
  });
  // frame ticks along the map edge (every 4 tiles, numbered every 8)
  c.strokeStyle = rgba(dim, 0.8); c.fillStyle = rgba(dim, 0.9); c.font = `7px ${F}`; c.beginPath();
  for (let x = 0; x <= W; x += 4) { c.moveTo(x * k, 0); c.lineTo(x * k, x % 8 ? 3 : 6); if (!(x % 8) && x) c.fillText(pad(x), x * k + 2, 12); }
  for (let y = 0; y <= H; y += 4) { c.moveTo(0, y * k); c.lineTo(y % 8 ? 3 : 6, y * k); if (!(y % 8) && y) c.fillText(pad(y), 8, y * k + 3); }
  c.stroke();
}
// pointer: drag the nearest ring (relative, so the thumb never covers what it aims at); a tap picks a drop zone or moves the selected ring
const toTile = (ev: PointerEvent) => { const r = ($('sgCv') as HTMLCanvasElement).getBoundingClientRect(), k = r.width / W; return { x: (ev.clientX - r.left) / k, y: (ev.clientY - r.top) / k }; };
function pDown(ev: PointerEvent) {
  const S = G.scan; if (!live()) return; ($('sgCv') as HTMLCanvasElement).setPointerCapture(ev.pointerId);
  const t = toTile(ev), rings = sensorsOn(S).filter(sn => !S.wide[sn]), dist = (sn: string) => Math.hypot(S.aims[sn].x + 0.5 - t.x, S.aims[sn].y + 0.5 - t.y);
  let s = S.on[SG.sel] && !S.wide[SG.sel] ? SG.sel : rings[0] || SG.sel, bd = (rings as string[]).includes(s) ? dist(s) : 1e9;
  for (const sn of rings) if (dist(sn) < bd - 0.5) { bd = dist(sn); s = sn; }
  SG.down = { x: ev.clientX, y: ev.clientY, ax: S.aims[s].x, ay: S.aims[s].y, s, drag: false };
}
function pMove(ev: PointerEvent) {
  const d = SG.down, S = G.scan; if (!d || !live()) return;
  const dx = ev.clientX - d.x, dy = ev.clientY - d.y; if (!d.drag && Math.hypot(dx, dy) < 8) return;
  if (!d.drag) { d.drag = true; SG.sel = d.s; if (!S.on[SG.sel]) scanCmd(SG.sel[0], 1); sigPanels(true); }
  const k = ($('sgCv') as HTMLCanvasElement).getBoundingClientRect().width / W; scanCmd('a', d.ax + dx / k, d.ay + dy / k, SENSORS.indexOf(SG.sel as any));
}
function pUp(ev: PointerEvent) {
  const d = SG.down, S = G.scan; SG.down = null; if (!d || d.drag || !live()) return;
  const t = toTile(ev);
  if (scanDone()) { let best = -1, bd = 3; offeredDrops().forEach(o => { const dd = Math.hypot(o.x + 0.5 - t.x, o.y + 0.5 - t.y); if (dd < bd) { bd = dd; best = o.i; } }); if (best >= 0) { chooseDrop(best); sigPanels(true); return; } }
  if (!S.on[SG.sel]) scanCmd(SG.sel[0], 1);
  if (S.wide[SG.sel]) scanCmd('W', SENSORS.indexOf(SG.sel as any), 0);
  scanCmd('a', Math.floor(t.x), Math.floor(t.y), SENSORS.indexOf(SG.sel as any)); sigPanels(true);
}

// ================================================================ the lab's company (real rules, never saved)
let LC: any = null;
function co<R>(f: () => R): R { const was = G.co; if (!LC) { newCompany(0x51A9, []); LC = G.co; ageCompany(LC); } G.co = LC; try { return f(); } finally { G.co = was; } }
function ageCompany(C: any) { // a few contracts in, so every panel has something on it
  C.n = 3; C.credits = 412; C.fuel = Math.min(C.fuel, 7); C.rec = { contracts: 3, complete: 2, failed: 1, hunts: 8, wins: 5, kia: 1 };
  C.ops[0].xp = 5; C.ops[0].lvl = 2; C.ops[0].hunts = 6; C.ops[1].xp = 4; C.ops[1].hunts = 3;
  if (C.ops[3]) { C.ops[3].status = 'BENCH'; C.ops[3].bench = 1; }
  C.memorial.push({ name: 'Ines “Lantern” Okafor', skill: 'EARS', lvl: 2, hunts: 5, when: 'contract 2, hunt 3 (Freight Yard 9)' });
  C.ledger = { n: 3, status: 'COMPLETE', fee: 360, wages: 150, upkeep: 60, hull: 0, after: 412 };
}

// ================================================================ COMPANY
const CTABS = ['BOOKS', 'ROSTER', 'SUITS', 'MARKET', 'SHIP', 'MEMORIAL'];
let ctab = 'BOOKS';
const costTxt = (q: { parts: number; cr: number }) => [q.parts ? q.parts + ' PART' + (q.parts > 1 ? 'S' : '') : '', q.cr ? q.cr + ' CR' : ''].filter(Boolean).join(' + ') || 'FREE';
export function company() {
  return co(() => {
    const C = G.co;
    const head = fx('sweep', `<div class="row" style="justify-content:space-between;align-items:flex-end;gap:18px">
      <div><div class="data">THE COMPANY // CODE ${esc(C.code)} // CONTRACT ${C.n + 1} // <span class="jp">会社</span></div><div class="h2" data-decode>LANCE COMMAND</div></div>
      <div class="costats">
        <div><small>CREDITS</small><b class="${C.credits < 0 ? 'foe' : 'obj'}">${C.credits}<i>CR</i></b>${C.debt ? '<span class="pill foe">DEBT</span>' : ''}</div>
        <div><small>FUEL ${C.fuel}/${fuelMax()}</small>${seg(C.fuel, fuelMax(), Math.min(16, fuelMax()))}</div>
        <div><small>PARTS ${C.parts}/${holdCap()}</small>${seg(C.parts, holdCap(), 16)}</div>
        <div><small>RECORD</small><span class="data">${C.rec.wins}/${C.rec.hunts} HUNTS // ${C.rec.complete}/${C.rec.contracts} CONTRACTS${C.rec.kia ? ' // <span class="foe">' + C.rec.kia + ' KIA</span>' : ''}</span></div>
      </div></div>`, { cls: 'stamp cohead', treat: 'acc', marks: 'dotsbr ticks' });
    const tabs = `<div class="tabs cotabs">${CTABS.map(t => btn(t + (t === 'MEMORIAL' && C.memorial.length ? ' ' + C.memorial.length : ''), { shape: 'tab', solid: t === ctab, cls: 'sm', act: 'co:tab:' + t })).join('')}</div>`;
    const body = ({ BOOKS: books, ROSTER: rosterTab, SUITS: suitsTab, MARKET: market, SHIP: shipTab, MEMORIAL: memorial } as any)[ctab]();
    return `<div class="scr co">${head}${tabs}<div class="cobody">${body}</div></div>`;
  });
}
function books() {
  const C = G.co, L = C.ledger;
  const offers = C.offers.map((o: any, i: number) => { const b = offerBlock(i), need = Math.min(o.hunts, Math.ceil(o.hunts * TUNE.CONTRACT_WIN_SHARE)), f = fuelCost(o);
    return fx('dossier', `<div class="row" style="justify-content:space-between"><span class="data">OFFER ${pad(i + 1)} // FIELD ×${TUNE.DANGER_FIELD[o.tier]}</span><span class="threat">${[0, 1, 2].map(k => `<i class="${k <= o.tier ? 'on' : ''}"></i>`).join('')}</span></div>
      <b class="h2" data-decode>${TUNE.DANGER_NAMES[o.tier]}</b><div class="data">DANGER // ${o.hunts} HUNTS // WIN ${need}</div>
      <div class="chainm">${Array.from({ length: o.hunts }, (_, k) => `<i class="${k < need ? 'w' : ''}">H${k + 1}</i>`).join('')}</div>
      <div class="kv"><span>FEE</span><span class="obj">${o.fee} CR ON COMPLETION</span><span>FUEL</span><span class="${b === 'FUEL' ? 'foe' : ''}">${f} TO GET THERE (HAVE ${C.fuel})</span></div>
      <div class="row" style="justify-content:flex-end">${btn(b === 'FUEL' ? 'NO FUEL' : 'TAKE IT', { solid: !b, cls: b ? 'lock' : '', go: b ? '' : 'CITY', sub: b ? '' : 'PLOT THE JUMP' })}</div>`,
      { cls: 'offer', treat: i === 0 ? 'acc' : 'dbl', marks: 'dots pip' }); }).join('');
  const w = C.ops.map((o: any) => `<div>${esc(o.name.split(' ')[0]).toUpperCase()}${isVet(o) ? ' ★' : ''}<b>${wageOf(o)} CR</b></div>`).join('');
  const ledger = fx('plate', `<div class="box">${cap('THE BOOKS // DUE WHEN THIS CONTRACT ENDS')}<div class="ledger">${w}<div>SHIP UPKEEP<b>${TUNE.UPKEEP_SHIP} CR</b></div>${C.hullOwed ? `<div>HULL REPAIRS<b>${C.hullOwed} CR</b></div>` : ''}<div class="t">RUNNING COSTS<b class="foe">−${runningCosts()} CR</b></div></div>
    <div class="data" style="margin-top:8px">BELOW 0 YOU TAKE DEBT ONCE (DOWN TO −${TUNE.DEBT_LIMIT}). STILL IN DEBT A CONTRACT LATER, OR DEEPER, AND THE COMPANY FOLDS.</div>
    ${L ? `<div class="rule"></div><div class="data">LAST: CONTRACT ${L.n} ${L.status} // FEE ${L.fee} // WAGES −${L.wages} // UPKEEP −${L.upkeep}${L.hull ? ' // HULL −' + L.hull : ''} → ${L.after} CR</div>` : ''}</div>`, { treat: 'dbl', marks: 'dots pip' });
  return `<div class="cogrid3">${offers}</div>${ledger}`;
}
const SK_G: Record<string, string> = { AIM: 'target', QUIET: 'ear', EARS: 'wave', TECH: 'radar' };
function opCard(o: any, buttons: string, tag = '') {
  const C = G.co, nx = nextLevelXp(o), s = Object.keys(C.crew).find(k => C.crew[k] === o.id) || '', bench = o.status === 'BENCH';
  const st = tag || (bench ? `<span class="pill obj">BENCHED // ${o.bench}</span>` : s ? `<span class="pill solid">DRIVES ${s}</span>` : '<span class="pill">RESERVE</span>');
  return fx('side', `<div class="opc2"><div class="opid">${matrix(5, 6, o.name.length * 7 + o.xp, 0.55)}<div><b class="h3">${esc(o.name).toUpperCase()}${isVet(o) ? ' <span class="obj">★</span>' : ''}</b><div class="row" style="gap:6px">${st}<span class="data">${o.hunts} HUNT${o.hunts === 1 ? '' : 'S'} // WAGE ${wageOf(o)} CR</span></div></div></div>
    <div class="row" style="gap:10px">${glyph(SK_G[o.skill] || 'star', 18)}<div><b style="font-size:11px">${skillName(o.skill)}</b> ${dots(o.lvl, 3, 'sm')}<div class="data" style="text-transform:none">${esc(skillEffect(o.skill, o.lvl))}</div></div></div>
    <div class="row"><span class="dim" style="font-size:9px">XP</span>${seg(o.xp, nx || o.xp || 1, 16)}<span class="data">${o.xp}${nx ? '/' + nx : ' TOP'}</span></div>${buttons}</div>`, { cls: 'opw' + (bench ? ' bench' : '') });
}
function rosterTab() {
  const C = G.co, seats = Object.keys(C.crew);
  return `<div class="cogrid3">${C.ops.map((o: any) => opCard(o, canDrop(o) ? `<div class="row seats"><span class="data">SEAT</span>${seats.map(s => `<button class="seatb${C.crew[s] === o.id ? ' on' : ''}${suitFit(s) ? '' : ' lock'}" data-act="co:seat:${C.crew[s] === o.id ? '' : o.id}:${s}">${ringed(s, C.crew[s] === o.id ? 'on' : '')}</button>`).join('')}</div>` : '')).join('')}</div>
    <div class="data">${C.ops.length}/${opCap()} ON THE ROSTER // A SUIT THAT GOES DOWN DROPS ITS OPERATOR CRITICAL: CARRY THEM OUT OR THEY ARE LOST // +${TUNE.OP_XP_HUNT} XP A HUNT (+${TUNE.OP_XP_WIN} ON A WIN) // LEVEL 2 AT ${TUNE.OP_LEVELS[0]}, 3 AT ${TUNE.OP_LEVELS[1]}</div>`;
}
function suitsTab() {
  const C = G.co, RF: [string, string][] = [['repair', 'REPAIR'], ['rounds', '+10 RDS'], ['shell', '+1 SHELL'], ['rebuild', 'REBUILD']];
  return `<div class="cogrid3">${C.suits.map((s: any) => { const c = s.carry, o = opById(C.crew[s.id]);
    const rf = RF.map(([k, n]) => { const b = suitRefitBlock(s.id, k); return b === 'NONE' || b === 'LOST' || b === 'CAP' ? '' : btn(n, { cls: 'sm' + (b ? ' lock' : ''), act: 'co:refit:' + s.id + ':' + k, sub: costTxt(suitCost(k)) }); }).join('');
    return fx('dossier', `<div class="row" style="justify-content:space-between">${ringed(s.id, c.dead ? 'foe' : 'on')}<span class="data">${frameOf(s.fit).name.toUpperCase()} // ${frameOf(s.fit).cls || ''}</span></div>
      <div class="row" style="gap:14px">${gauge(c.dead ? 0 : c.hits, c.maxHits, c.dead ? '—' : String(c.hits), 'HITS', 64)}<div style="display:grid;gap:3px">
        <b class="h3 ${c.dead ? 'foe' : c.hits < c.maxHits ? 'obj' : ''}">${c.dead ? 'DESTROYED' : dmgWord(c).toUpperCase()}</b>
        <span class="data">${c.dead ? 'CAN’T DROP UNTIL REBUILT' : esc(partsRead(c)).toUpperCase()}</span>
        <span class="data">${fitRounds(s.fit) ? c.ammo + '/' + fitRounds(s.fit) + ' RDS' : 'NO GUN'}${fitShells(s.fit) ? ' // ' + c.shells + '/' + fitShells(s.fit) + ' SHELLS' : ''}</span>
        <span class="data">${o ? 'DRIVER ' + esc(o.name).toUpperCase() : 'NO DRIVER'}</span></div></div>
      <div class="row">${rf}</div><div class="row" style="justify-content:flex-end">${btn('HANGAR', { cls: 'sm', act: 'co:hangar:' + s.id, icon: 'shield' })}</div>`, { treat: 'dbl', marks: 'dots' }); }).join('')}</div>
    <div class="data">${C.suits.length}/${suitCap()} EXOS (THE SHIP’S BAYS) // DAMAGE, ROUNDS AND SHELLS CARRY FROM HUNT TO HUNT // A REPAIR TAKES ${costTxt(suitCost('repair'))}</div>`;
}
function market() {
  const C = G.co, why: any = { CR: 'NEED CR', HOLD: 'HOLD FULL', TANK: 'TANK FULL', BAY: 'NO FREE BAY', NONE: 'SOLD OUT' };
  const name = (L: any) => L.k === 'parts' ? 'PARTS' : L.k === 'fuel' ? 'FUEL' : L.k === 'suit' ? 'EXOS // WARDEN' : byId(ITEMS, L.id)!.name.toUpperCase();
  const gl = (L: any) => L.k === 'parts' ? 'hex' : L.k === 'fuel' ? 'bolt' : L.k === 'suit' ? 'shield' : 'node';
  const note = (L: any) => L.k === 'parts' ? 'REPAIRS + REBUILDS // HOLD ' + C.parts + '/' + holdCap() : L.k === 'fuel' ? 'TO REACH CONTRACTS // TANK ' + C.fuel + '/' + fuelMax() : L.k === 'suit' ? 'NEEDS A FREE BAY (' + C.suits.length + '/' + suitCap() + ')' : esc(byId(ITEMS, L.id)!.effect).toUpperCase() + ' // ' + (C.stores[L.id] || 0) + ' OWNED, ' + freeItem(L.id) + ' SPARE';
  const rows = C.market.map((L: any, i: number) => { const b = buyBlock(i);
    return fx('plate', `<span class="mkg">${glyph(gl(L), 20)}</span><div><b style="font:600 12px var(--display);letter-spacing:.12em">${name(L)}</b><div class="data">${note(L)}</div></div><div class="mkp"><b class="obj">${L.price} CR</b><small>${L.qty} LEFT</small></div>
      <div class="row">${btn(b ? why[b] || 'CAN’T' : 'BUY', { cls: 'sm' + (b ? ' lock' : ''), act: 'co:buy:' + i, solid: !b })}${L.k === 'parts' ? btn('SELL 1', { cls: 'sm' + (C.parts ? '' : ' lock'), act: 'co:sell', sub: '+' + TUNE.PART_SELL + ' CR' }) : ''}</div>`, { cls: 'mkrow' }); }).join('');
  const rec = C.recruits.map((o: any, i: number) => { const b = hireBlock(i); return opCard(o, `<div class="row" style="justify-content:flex-end">${btn(b === 'FULL' ? 'ROSTER FULL' : b === 'CR' ? 'NEED CR' : 'HIRE', { cls: 'sm' + (b ? ' lock' : ''), solid: !b, act: 'co:hire:' + i, sub: TUNE.COST_HIRE + ' CR' })}</div>`, '<span class="pill obj">RECRUIT</span>'); }).join('');
  return `${cap('STOCK // NEW AFTER EVERY CONTRACT')}<div class="mklist">${rows}</div>${cap('RECRUITS')}<div class="cogrid3">${rec}</div>`;
}
// the ship: a side profile with its hardpoints; each fitted module rides a leader line out to its label, patterned by beat
const BEAT: Record<string, [string, string]> = { 'Before the drop': ['SCAN', 'p-radar'], Drop: ['DROP', 'p-armour'], 'After the mission': ['AFTER', 'p-passive'], 'Between missions': ['TRAVEL', 'p-ammo'], Crew: ['CREW', 'p-cells'] };
const HPX: [number, number, number, number][] = [[150, 128, 70, 30], [270, 104, 250, 30], [400, 100, 430, 30], [520, 112, 610, 30], [210, 196, 120, 262], [370, 204, 360, 262], [520, 190, 610, 262]];
function shipSvg() {
  const S = G.co.ship, M = TUNE.SHIP_MODULES as any;
  const hull = `<path d="M40,150 L110,112 L230,96 L420,88 L560,98 L660,128 L690,150 L660,172 L560,200 L420,214 L230,206 L110,190 Z"/>
    <path d="M110,112 L110,190 M230,96 L230,206 M560,98 L560,200" style="stroke-dasharray:2 4"/><path d="M300,214 L320,236 L460,236 L480,214"/><path d="M330,236 L330,246 M450,236 L450,246"/>
    <path d="M60,150 L16,150 M690,150 L716,150" style="opacity:.5"/><circle cx="640" cy="150" r="10"/><circle cx="640" cy="150" r="4"/>
    <path d="M420,88 L440,64 L520,64 L540,96" /><path d="M150,140 L200,140 M150,160 L200,160" style="opacity:.6"/>`;
  const hp = HPX.slice(0, TUNE.SHIP_HARDPOINTS).map(([x, y, lx, ly], i) => { const id = S.fit[i], m = id ? M[id] : null, top = ly < 150, b = m ? BEAT[m.section] || ['', ''] : ['', ''];
    return `<g class="shp${m ? ' on' : ''}"><path d="M${x},${y} L${lx + 40},${top ? ly + 14 : ly - 14} L${lx},${top ? ly + 14 : ly - 14}"/><rect x="${x - 6}" y="${y - 6}" width="12" height="12" class="${b[1]}"/>
      <text x="${lx}" y="${top ? ly + 8 : ly - 4}">${pad(i + 1)} // ${m ? m.name : 'EMPTY'}</text><text class="v" x="${lx}" y="${top ? ly - 2 : ly + 6}">${m ? b[0] : 'HARDPOINT'}</text></g>`; }).join('');
  let grid = ''; for (let x = 0; x <= 740; x += 20) grid += `M${x},0 L${x},290 `;
  return `<svg class="shipsvg" viewBox="-10 0 760 290" preserveAspectRatio="xMidYMid meet"><path class="grid" d="${grid}"/><g class="hull">${hull}</g>${hp}<line class="scanl" x1="-10" x2="750" y1="0" y2="0"/></svg>`;
}
function shipTab() {
  const C = G.co, S = C.ship, M = TUNE.SHIP_MODULES as any, why: any = { CR: 'NEED CR', OWNED: 'OWNED', SUITS: 'A SUIT IS IN IT', OPS: 'ROSTER TOO BIG' };
  const fitted = S.fit.map((id: string) => { const b = unfitBlock(id); return btn(M[id].name, { cls: 'sm' + (b ? ' lock' : ''), act: 'co:unfit:' + id, sub: b ? why[b] : 'TAKE OFF' }); }).join('');
  const stored = S.stored.map((id: string) => btn(M[id].name, { cls: 'sm' + (S.fit.length >= TUNE.SHIP_HARDPOINTS ? ' lock' : ''), act: 'co:fit:' + id, sub: 'FIT IT' })).join('');
  const secs = [...new Set(Object.values(M).map((m: any) => m.section))] as string[];
  const shop = secs.map(sec => `<div class="shsec">${cap((BEAT[sec] || [sec])[0] + ' // ' + sec.toUpperCase())}${Object.keys(M).filter(id => M[id].section === sec).map(id => { const b = modBuyBlock(id);
    return `<div class="shrow"><span class="sw ${(BEAT[sec] || ['', ''])[1]}"></span><div><b>${M[id].name}${modCount(id) ? ` <span class="obj">×${modCount(id)}</span>` : ''}</b><div class="data" style="text-transform:none">${esc(M[id].does)}</div></div>${btn(b ? why[b] : M[id].price + ' CR', { cls: 'sm' + (b ? ' lock' : ''), act: 'co:bmod:' + id })}</div>`; }).join('')}</div>`).join('');
  return `${fx('panel', `<div class="box"><div class="row" style="justify-content:space-between">${cap('THE SHIP // ' + S.fit.length + '/' + TUNE.SHIP_HARDPOINTS + ' HARDPOINTS // CARRIES ' + suitCap() + ' EXOS', 'no')}<span class="data">${Object.values(BEAT).map(([n, p]) => `<span class="sw ${p}"></span>${n}`).join(' ')}</span></div>${shipSvg()}
    <div class="row">${fitted}</div>${stored ? `<div class="row"><span class="data">IN STORAGE</span>${stored}</div>` : ''}</div>`, { cls: 'shipbay', treat: 'dbl', marks: 'dots pip ticks' })}
    <div class="shop">${shop}</div>`;
}
function memorial() {
  const M = G.co.memorial;
  if (!M.length) return fx('panel', '<div class="box data">NO ONE LOST YET.</div>');
  return `<div class="cogrid3">${M.map((m: any) => fx('badge', `<div class="box mem"><div class="data">KIA // ${esc(m.when).toUpperCase()}</div><b class="h3">${esc(m.name).toUpperCase()}</b><div class="data">${skillName(m.skill)} ${m.lvl} // ${m.hunts} HUNTS</div>${matrix(18, 2, m.name.length, 0.5)}</div>`, { treat: 'dbl', marks: 'dotsbr' })).join('')}</div>`;
}
export function coAct(act: string): boolean {
  const p = act.split(':'); if (p[0] !== 'co') return false;
  if (p[1] === 'tab') { ctab = p[2]; rerender(true); return true; }
  if (p[1] === 'hangar') { HG.cur = Math.max(0, LC.suits.findIndex((s: any) => s.id === p[2])); return false; }
  co(() => {
    if (p[1] === 'seat') seat(p[2], p[3]);
    else if (p[1] === 'refit') suitRefit(p[2], p[3]);
    else if (p[1] === 'buy') buy(+p[2]);
    else if (p[1] === 'sell') sellPart();
    else if (p[1] === 'hire') hire(+p[2]);
    else if (p[1] === 'bmod') buyMod(p[2]);
    else if (p[1] === 'fit') fitMod(p[2]);
    else if (p[1] === 'unfit') unfitMod(p[2]);
  });
  rerender(false); return true;
}

// ================================================================ HANGAR
const HG = { cur: 0, sel: 'CORE' as Loc, pick: -1, tip: '' };
const SLOT_WORD: Record<HP, string> = { S: 'SENSOR', W: 'WEAPON', I: 'INTERNAL', U: 'UTILITY', M: 'MOBILITY', O: 'OPEN' };
// callouts: where each location sits on the wireframe, and which side its label goes
const CALL: Record<Loc, [number, number, 'l' | 'r', number]> = { MAST: [421, 150, 'l', 150], ARMS: [300, 400, 'l', 400], CORE: [512, 330, 'r', 290], BACK: [595, 180, 'r', 130], LEGS: [600, 760, 'r', 700] }; // labels sit above their line, so each line comes in from below
const HIT: Record<Loc, string> = {
  MAST: '<rect x="392" y="92" width="58" height="140"/>', ARMS: '<rect x="245" y="222" width="152" height="345"/><rect x="630" y="222" width="150" height="345"/>',
  LEGS: '<rect x="355" y="472" width="130" height="470"/><rect x="540" y="472" width="130" height="470"/>', CORE: '<rect x="395" y="205" width="238" height="250"/><rect x="450" y="452" width="125" height="90"/>',
  BACK: '<rect x="556" y="125" width="80" height="90"/>',
};
function suitSvg(f: any) {
  const filled = (l: Loc) => itemsIn(f, l).length > 0 || !!f.plate[l], cls = (l: Loc) => 'hp' + (l === HG.sel ? ' sel' : filled(l) ? ' fit' : '');
  const [vx, vy, vw, vh] = EXOS_VIEWBOX.split(' ').map(Number), X0 = vx - 230, X1 = vx + vw + 230;
  const co = LOCS.map(l => { const [ax, ay, s, ly] = CALL[l], tx = s === 'l' ? X0 + 10 : X1 - 10, ex = s === 'l' ? X0 + 200 : X1 - 200, an = s === 'l' ? 'start' : 'end', it = itemsIn(f, l), pl = byId(PLATES, f.plate[l]);
    const v = it.length ? it.map(i => i.name.toUpperCase()).join(' + ') : '— EMPTY';
    return `<g class="hco${l === HG.sel ? ' sel' : filled(l) ? ' on' : ''}" data-loc="${l}"><path d="M${ax},${ay} L${ex},${ly} L${tx},${ly}"/><circle cx="${ax}" cy="${ay}" r="5"/><text x="${tx}" y="${ly - 32}" text-anchor="${an}">${l} // ${LOC_PART[l]}${pl ? ' // +' + pl.hits + ' PLATE' : ''}</text><text class="v" x="${tx}" y="${ly - 9}" text-anchor="${an}">${esc(v.length > 34 ? v.slice(0, 33) + '…' : v)}</text></g>`; }).join('');
  let grid = ''; for (let x = X0; x <= X1; x += 40) grid += `M${x},${vy} L${x},${vy + vh} `;
  return `<svg class="exos" viewBox="${X0} ${vy - 10} ${X1 - X0} ${vh + 20}" preserveAspectRatio="xMidYMid meet"><path class="grid" d="${grid}"/>
    <g class="hline">${EXOS_LINES.map(d => `<path d="${d}"/>`).join('')}</g>${EXOS_PANELS.map(([l, d]) => `<path class="${cls(l as Loc)}" d="${d}"/>`).join('')}
    <g class="${cls('BACK')}"><rect x="566" y="150" width="58" height="58" rx="8"/></g><g class="hselbox">${HIT[HG.sel]}</g>${co}
    ${LOCS.map(l => `<g class="hhit" data-act="hg:loc:${l}">${HIT[l]}</g>`).join('')}<line class="scanl" x1="${X0}" x2="${X1}" y1="${vy}" y2="${vy}"/></svg>`;
}
export function hangar() {
  return co(() => {
    const C = G.co, s = C.suits[HG.cur] || C.suits[0], f = s.fit, fr = frameOf(f), St = fitStats(f), w = launchBlock(f);
    const tabs = C.suits.map((x: any, i: number) => btn(ringed(x.id, i === HG.cur ? 'on' : '') + ' EXOS-' + x.id, { shape: 'tab', solid: i === HG.cur, act: 'hg:suit:' + i, cls: 'sm', sub: frameOf(x.fit).name.toUpperCase() + (launchBlock(x.fit) ? ' ✕' : '') })).join('');
    const frames = TUNE.HANGAR_FRAMES.map((id: string) => `<button class="${id === f.frame ? 'on' : ''}" disabled title="frames change in the game's hangar">${byId(FRAMES, id)!.name}</button>`).join('');
    const slots = fr.slots[HG.sel], row = f.mounts[HG.sel], pl = byId(PLATES, f.plate[HG.sel]);
    const hps = !slots.length ? `<span class="data">NO HARDPOINTS ON A ${fr.name.toUpperCase()}</span>` : slots.map((sl: HP, i: number) => { const id = row[i];
      if (isCont(id)) return `<button class="hps cont" data-act="hg:hp:${+id.slice(1)}"><small>${SLOT_WORD[sl]}</small><b>⤶ ${esc(byId(ITEMS, row[+id.slice(1)])?.name || '')}</b></button>`;
      const it = byId(ITEMS, id); return `<button class="hps${it ? ' full' : ''}${HG.pick === i ? ' sel' : ''}" data-act="hg:hp:${i}"><small>${pad(i + 1)} // ${SLOT_WORD[sl]}</small><b>${it ? esc(it.name).toUpperCase() : '— EMPTY'}</b></button>`; }).join('');
    const parts = splitHits('MECH', fitHits(f)) as any, all = LOCS.flatMap(l => itemsIn(f, l)), radar = all.find(i => i.radar)?.radar, gun = all.find(i => i.gun);
    const mv = (m: string) => TUNE.SOUND_RANGE[m] + St.over.snd;
    const meter = (n: string, v: number, max: number, val: string, sub: string, cls = '') => `<div class="hm ${cls}"><span>${n}</span>${seg(v, max, 18)}<b>${val}</b><small>${sub}</small></div>`;
    return `<div class="scr hg">
    ${fx('dossier', `<div class="row" style="justify-content:space-between"><div class="tabs">${tabs}</div><span class="data">BAY 0${HG.cur + 1} // <span class="jp">格納庫</span></span></div>${suitSvg(f)}
      <div class="row data" style="justify-content:space-between"><span>TAP A LOCATION // ITS PART GOES OFFLINE IF DESTROYED</span><span>${esc(fr.name).toUpperCase()} // RATED ${fr.rated} // MAX ${fr.max}</span></div>`, { cls: 'hgbay', treat: 'dbl', marks: 'dots pip ticks' })}
    <div style="display:grid;gap:12px;align-content:start">
      ${fx('bar', `<div class="row" style="padding:12px 16px 10px 46px;justify-content:space-between"><b class="h3" data-decode>HANGAR // EXOS-${s.id}</b><span class="data">${esc(fr.role || '').toUpperCase()}</span></div>`, { treat: 'acc', marks: 'hatch4' })}
      <div class="row"><span class="dim" style="font-size:9px">FRAME</span><div class="segsel">${frames}</div></div>
      ${fx('plate', `<div class="box">${cap(HG.sel + ' // PART ' + LOC_PART[HG.sel] + (HG.sel === 'BACK' ? ' // ONLY HIT FROM BEHIND' : ''))}<div class="hpsw">${hps}</div>
        <div class="row" style="margin-top:8px">${btn(pl ? 'PLATE +' + pl.hits : 'NO PLATE', { cls: 'sm', act: 'hg:plate', sub: pl ? 'WT ' + pl.wt + ' // TAP: OFF' : 'TAP: ' + (byId(PLATES, TUNE.HANGAR_PLATES[0])?.name || '').toUpperCase() })}</div>
        ${HG.pick >= 0 ? pickList(f, slots[HG.pick], row[HG.pick]) : ''}</div>`, { treat: 'acc', marks: 'dots pip' })}
      ${fx('wing', `<div class="box hms">
        ${meter('LOAD', St.load, St.max, St.load + '/' + St.rated, 'MAX ' + St.max, St.load > St.max ? 'bad' : St.load > St.rated ? 'warn' : '')}
        ${meter('POWER', Math.max(0, St.regen + 4), 10, (St.regen >= 0 ? '+' : '') + St.regen + '/T', 'POOL ' + St.pool, St.regen < 0 ? 'bad' : '')}
        ${meter('EM', St.emBase, 3, St.emBase.toFixed(1), radar ? 'PULSE ' + radar.ap + ' AP ' + radar.en + ' EN' : 'NO RADAR')}
        ${TUNE.THERMAL_ENABLED ? meter('IR', (St as any).irBase || 0, 10, String((St as any).irBase || 0), 'THERMAL SIGNATURE') : ''}
        ${meter('ACO', mv('NORMAL'), 14, mv('CREEP') + '/' + mv('NORMAL') + '/' + mv('SPRINT'), gun ? 'SHOT ' + gun.gun!.snd + ' TILES' : 'NO GUN')}
        <div class="row data" style="gap:12px">${Object.keys(parts).map(p => `<span>${PART_ABBR[p]} ${dots(Math.min(parts[p], 6), Math.min(parts[p], 6), 'sm')} ${parts[p]}</span>`).join('')}${gun ? `<span>${fitRounds(f)} RDS</span>` : ''}</div>
        <div class="${w ? 'foe' : 'fr'}" style="font:600 11px var(--display);letter-spacing:.14em">${w ? '✕ ' + esc(w).toUpperCase() : '✓ LAUNCHES'}</div>${HG.tip ? `<div class="data obj">${esc(HG.tip).toUpperCase()}</div>` : ''}</div>`, { treat: 'acc' })}
      <div class="row" style="justify-content:flex-end">${btn('SIGINT', { go: 'SIGINT', icon: 'back' })}${btn('LAUNCH', { solid: !w, cls: w ? 'lock' : '', act: 'take', sub: 'DROP THE LANCE' })}</div>
    </div></div>`;
  });
}
function pickList(f: any, slot: HP, curId: string | null) {
  const rows: string[] = [];
  if (curId && !isCont(curId)) rows.push(`<button class="hopt" data-act="hg:pick:"><b>REMOVE ${esc(byId(ITEMS, curId)!.name).toUpperCase()}</b></button>`);
  for (const id of TUNE.HANGAR_ITEMS as string[]) {
    const it = byId(ITEMS, id) as Item; if (!it || (slot !== 'O' && !it.hp.includes(slot))) continue;
    const spare = freeItem(id), why = whyNot(f, HG.sel, HG.pick, it) || hangarWhy(f, id, curId) || (id !== curId && spare <= 0 ? 'none spare: buy one at the MARKET' : '');
    const meta = [spare + ' SPARE', 'WT ' + it.wt, it.out ? 'OUT ' + it.out : '', it.draw ? 'DRAW ' + it.draw : '', it.use || ''].filter(Boolean).join(' // ');
    rows.push(`<button class="hopt${why ? ' no' : ''}" data-act="${why ? '' : 'hg:pick:' + id}"><b>${esc(it.name).toUpperCase()}${id === curId ? ' (FITTED)' : ''}</b><small>${esc(meta).toUpperCase()}</small><small class="dsc">${esc(it.effect + (it.trade && it.trade !== '—' ? ' · ' + it.trade : ''))}</small>${why ? `<small class="foe">${esc(why)}</small>` : ''}</button>`);
  }
  return `<div class="hpick">${cap(SLOT_WORD[slot] + ' HARDPOINT // PICK ONE')}${rows.join('') || '<div class="data">NOTHING IN THIS ROUND’S SET FITS HERE YET</div>'}</div>`;
}
export function hgAct(act: string): boolean {
  const p = act.split(':'); if (p[0] !== 'hg') return false;
  co(() => {
    const C = G.co, s = C.suits[HG.cur], f = s.fit;
    if (p[1] === 'suit') { HG.cur = +p[2]; HG.pick = -1; HG.tip = ''; }
    else if (p[1] === 'loc') { HG.sel = p[2] as Loc; HG.pick = -1; }
    else if (p[1] === 'hp') HG.pick = HG.pick === +p[2] ? -1 : +p[2];
    else if (p[1] === 'pick') { const id = p[2], nf = id ? mount(f, HG.sel, HG.pick, byId(ITEMS, id) as Item) : unmount(f, HG.sel, HG.pick); if (nf) setSuitFit(HG.cur, nf); HG.pick = -1; }
    else if (p[1] === 'plate') { const nf = structuredClone(f); nf.plate[HG.sel] = nf.plate[HG.sel] ? null : TUNE.HANGAR_PLATES[0]; setSuitFit(HG.cur, nf); }
  });
  rerender(false); return true;
}

// ================================================================ CITY (campaign map concept)
// Placeholder city: 8 districts, 3 factions, one standing meter each, fuel per jump, a SIGINT range in jumps.
type Fac = { id: string; name: string; jp: string; pat: string; standing: number; fuel: number };
const FACS: Fac[] = [
  { id: 'KES', name: 'KESSLER COMBINE', jp: 'ケスラー', pat: 'hatch', standing: 2, fuel: 6 },
  { id: 'ARC', name: 'ARCOLOGY WARD', jp: 'アーコロジー', pat: 'dots', standing: -1, fuel: 9 },
  { id: 'VEY', name: 'VEY SYNDICATE', jp: 'ヴェイ', pat: 'solid', standing: -4, fuel: 14 },
];
type Dist = { id: string; name: string; x: number; y: number; fac: string; base: number; links: string[]; job?: { type: string; pay: number; hunts: number; by: string; vs: string; field: string } };
const DISTS: Dist[] = [
  { id: 'PH4', name: 'PUMPHOUSE 4', x: 170, y: 330, fac: 'KES', base: 1, links: ['FY9', 'KS', 'SUMP'] },
  { id: 'FY9', name: 'FREIGHT YARD 9', x: 330, y: 170, fac: 'KES', base: 1, links: ['PH4', 'GR7', 'SPIRE'], job: { type: 'RETRIEVE', pay: 240, hunts: 3, by: 'KES', vs: 'ARC', field: 'AMBUSH // 2 PATROLS, 1 TURRET' } },
  { id: 'KS', name: 'KESSLER SPRAWL', x: 320, y: 470, fac: 'KES', base: 2, links: ['PH4', 'GR7', 'SUMP'] },
  { id: 'GR7', name: 'GRID 7', x: 500, y: 330, fac: 'ARC', base: 2, links: ['FY9', 'KS', 'SPIRE', 'S9'], job: { type: 'UPLINK', pay: 180, hunts: 2, by: 'BROKER', vs: 'ARC', field: 'FORTIFIED // 2 EMPLACEMENTS' } },
  { id: 'SPIRE', name: 'ARC SPIRE', x: 640, y: 150, fac: 'ARC', base: 3, links: ['FY9', 'GR7', 'NEON'] },
  { id: 'S9', name: 'SECTOR 9', x: 680, y: 420, fac: 'ARC', base: 2, links: ['GR7', 'NEON', 'DOCKS'], job: { type: 'BOUNTY', pay: 320, hunts: 3, by: 'KES', vs: 'VEY', field: 'SWEEP // HEAVY + 3 PATROLS' } },
  { id: 'NEON', name: 'NEON STACKS', x: 840, y: 250, fac: 'VEY', base: 3, links: ['SPIRE', 'S9', 'DOCKS'], job: { type: 'ESCORT', pay: 420, hunts: 4, by: 'ARC', vs: 'VEY', field: 'CONVOY // HUNTER TEAM LIKELY' } },
  { id: 'DOCKS', name: 'ACID DOCKS', x: 860, y: 500, fac: 'VEY', base: 2, links: ['S9', 'NEON'] },
  { id: 'SUMP', name: 'THE SUMP', x: 120, y: 520, fac: 'KES', base: 1, links: ['PH4', 'KS'] },
];
const CY = { at: 'PH4', sel: 'GR7', fuel: 7, fuelMax: 12, credits: 412, moving: 0, log: [] as string[] };
const fac = (id: string) => FACS.find(f => f.id === id)!;
const dist = (id: string) => DISTS.find(d => d.id === id)!;
const closed = (d: Dist) => fac(d.fac).standing <= -3; // hated: closed airspace (a jump in costs extra fuel)
const jumpCost = (d: Dist) => 1 + (closed(d) ? 2 : 0);
// fuel-cheapest path from the ship (Dijkstra over 9 nodes)
function route(to: string) {
  const D: Record<string, number> = {}, P: Record<string, string> = {}, Q = new Set(DISTS.map(d => d.id));
  DISTS.forEach(d => D[d.id] = 1e9); D[CY.at] = 0;
  while (Q.size) { let u = ''; for (const q of Q) if (!u || D[q] < D[u]) u = q; Q.delete(u); for (const v of dist(u).links) { const c = D[u] + jumpCost(dist(v)); if (c < D[v]) { D[v] = c; P[v] = u; } } }
  const path = [to]; while (path[0] !== CY.at && P[path[0]]) path.unshift(P[path[0]]);
  return { cost: D[to], path, hops: path.length - 1 };
}
// SIGINT range, in jumps: the base reach plus one for each scan module fitted on the lab company's ship (COMPANY · SHIP)
function sigRange() { const fit: string[] = LC ? LC.ship.fit : TUNE.SHIP_START_MODS; return 1 + fit.filter(m => m === 'RADAR_ARRAY' || m === 'EM_SUITE').length; }
// What the ship can read about a contract in district d. FULL = the field and who hires; BASIC = faction, job type, pay, danger.
// Design call (game shape: "basic info from any range; the ship's SIGINT range unlocks the detail" + "friendly factions supply
// bonus intel against their enemies"). This is a first guess: in range, or the hiring faction likes you enough to brief you.
export function intelOf(hops: number, d: Dist): 'FULL' | 'BASIC' {
  if (hops <= sigRange()) return 'FULL';
  const by = d.job && d.job.by !== 'BROKER' ? fac(d.job.by) : null;
  if (by && by.standing >= 2) return 'FULL';
  return 'BASIC';
}
const danger = (d: Dist) => Math.min(5, d.base + Math.max(0, -fac(d.fac).standing - 1));
function cityMap() {
  const R = route(CY.sel), onPath = new Set(R.path.slice(1).map((v, i) => [R.path[i], v].sort().join('-')));
  let city = ''; let s = 7; const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280;
  for (let i = 0; i < 900; i++) { const d = DISTS[i % DISTS.length], a = rnd() * 6.283, r = Math.sqrt(rnd()) * 120; city += `<circle cx="${(d.x + Math.cos(a) * r).toFixed(0)}" cy="${(d.y + Math.sin(a) * r * 0.75).toFixed(0)}" r="${(0.6 + rnd()).toFixed(1)}" style="opacity:${(0.15 + rnd() * 0.4).toFixed(2)}"/>`; }
  const terr = DISTS.map(d => `<circle class="terr t-${fac(d.fac).pat}" cx="${d.x}" cy="${d.y}" r="78"/>`).join('');
  const seen = new Set<string>(), links = DISTS.flatMap(d => d.links.map(l => { const key = [d.id, l].sort().join('-'); if (seen.has(key)) return ''; seen.add(key); const e = dist(l), mx = (d.x + e.x) / 2, my = (d.y + e.y) / 2, hot = onPath.has(key), c = closed(d) || closed(e);
    return `<path class="lnk${hot ? ' hot' : ''}${c ? ' shut' : ''}" d="M${d.x},${d.y} L${e.x},${e.y}"/>${hot ? `<text class="lc" x="${mx}" y="${my - 6}">${jumpCost(closed(e) ? e : d)} FUEL</text>` : ''}`; })).join('');
  const nodes = DISTS.map(d => { const F = fac(d.fac), r = route(d.id), here = d.id === CY.at, reach = r.cost <= CY.fuel, insig = r.hops <= sigRange();
    return `<g class="nd${here ? ' here' : ''}${d.id === CY.sel ? ' sel' : ''}${reach ? '' : ' far'}${closed(d) ? ' shut' : ''}" data-act="cy:sel:${d.id}" transform="translate(${d.x},${d.y})">
      <circle class="hit" r="34"/>${insig ? '<path class="sigb" d="M-24,-16 L-24,-24 L-16,-24 M16,-24 L24,-24 L24,-16 M24,16 L24,24 L16,24 M-16,24 L-24,24 L-24,16"/>' : ''}
      <path class="hx" d="M-12,-7 L0,-14 L12,-7 L12,7 L0,14 L-12,7 Z"/>${d.job ? `<path class="jb" d="M0,-6 L6,0 L0,6 L-6,0 Z"/>` : '<circle class="dt" r="2"/>'}
      <text class="nm" y="30">${d.name}</text><text class="sb" y="41">${F.id} // DNG ${danger(d)}${closed(d) ? ' // CLOSED' : ''}</text></g>`; }).join('');
  const sh = dist(CY.at);
  return `<svg class="citysvg" viewBox="0 40 1000 560" preserveAspectRatio="xMidYMid meet"><defs>
    <pattern id="ph" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0,0 L0,7"/></pattern>
    <pattern id="pd" width="6" height="6" patternUnits="userSpaceOnUse"><circle cx="3" cy="3" r="1"/></pattern></defs>
    <g class="cdots">${city}</g>${terr}${links}${nodes}
    <g class="ship" transform="translate(${sh.x},${sh.y - 54})"><path d="M-10,0 L10,0 L14,4 L-14,4 Z M-4,4 L0,14 L4,4"/><circle class="rr" r="18"/><text y="-10">LANCE SHIP</text></g>
    <line class="scanl" x1="0" x2="1000" y1="40" y2="40"/></svg>`;
}
export function city() {
  const d = dist(CY.sel), F = fac(d.fac), R = route(d.id), here = d.id === CY.at, can = !here && R.cost <= CY.fuel, I = intelOf(R.hops, d);
  const st = (f: Fac) => `<div class="stand"><span>${f.name}</span><div class="sm2">${Array.from({ length: 10 }, (_, i) => { const v = i - 5 + (i >= 5 ? 1 : 0); return `<i class="${(v < 0 && f.standing <= v) || (v > 0 && f.standing >= v) ? (v < 0 ? 'neg' : 'pos') : ''}"></i>`; }).join('')}</div><b class="${f.standing < 0 ? 'foe' : 'fr'}">${f.standing > 0 ? '+' : ''}${f.standing}</b><small>${f.standing <= -3 ? 'HATED // AIRSPACE CLOSED' : f.standing < 0 ? 'WARY' : f.standing >= 2 ? 'LIKED // INTEL ON THEIR ENEMIES' : 'NEUTRAL'} // FUEL ${f.fuel} CR</small></div>`;
  const J = d.job, red = (t: string) => I === 'FULL' ? t : `<span class="redact">${'█'.repeat(Math.max(6, Math.min(18, t.length)))}</span>`;
  const job = J ? fx('dossier', `<div class="row" style="justify-content:space-between"><span class="data">CONTRACT // ${J.by === 'BROKER' ? 'BROKER (DENIABLE)' : fac(J.by).name}</span><span class="pill${I === 'FULL' ? ' solid' : ''}">${I === 'FULL' ? 'SIGINT: FULL' : 'BASIC ONLY'}</span></div>
      <b class="h2" data-decode>${J.type}</b>
      <div class="kv"><span>PAY</span><span class="obj">~${J.pay} CR // ${J.hunts} HUNTS</span><span>DANGER</span><span class="threat">${[0, 1, 2, 3, 4].map(k => `<i class="${k < danger(d) ? 'on' : ''}"></i>`).join('')}</span><span>TARGET</span><span>${red(fac(J.vs).name)}</span><span>FIELD</span><span>${red(J.field)}</span><span>NOTORIETY</span><span>${red(J.by === 'BROKER' ? 'LOW: THEY WON’T KNOW IT WAS YOU' : '+1 WITH ' + fac(J.vs).name)}</span></div>
      ${I === 'BASIC' ? `<div class="data">OUT OF SIGINT RANGE (${R.hops} JUMPS, REACH ${sigRange()}). JUMP CLOSER, FIT A SCAN MODULE (COMPANY // SHIP), OR WORK FOR SOMEONE WHO LIKES YOU.</div>` : ''}`, { cls: 'cyjob', treat: 'acc', marks: 'dots pip' }) : fx('panel', '<div class="box data">NO CONTRACTS POSTED HERE.</div>');
  return `<div class="scr cy">
  ${fx('bar', `<div class="row" style="padding:10px 16px 8px 46px;justify-content:space-between"><b class="h3" data-decode>THE CITY // CAMPAIGN MAP // CONCEPT</b><span class="row data"><span>FUEL ${CY.fuel}/${CY.fuelMax}</span>${seg(CY.fuel, CY.fuelMax, 12)}<span>SIGINT REACH ${sigRange()} JUMP${sigRange() > 1 ? 'S' : ''}</span><span class="jp">都市図</span></span></div>`, { treat: 'acc', marks: 'hatch4 pip' })}
  <div class="cyw">
    ${fx('dossier', `<div class="cymap">${cityMap()}</div><div class="sigleg data"><span><i class="lp t-hatch"></i>KESSLER</span><span><i class="lp t-dots"></i>ARCOLOGY</span><span><i class="lp t-solid"></i>VEY</span><span>◇ CONTRACT</span><span>[ ] IN SIGINT RANGE</span><span>DIM = OUT OF FUEL</span><span>RED LINK = CLOSED AIRSPACE (+2 FUEL)</span></div>`, { cls: 'sgbox', treat: 'dbl', marks: 'dots pip ticks' })}
    <div class="sigside">
      ${fx('wing', `<div class="box"><div class="data">DISTRICT // ${F.name} // <span class="jp">${F.jp}</span></div><b class="h2" data-decode>${d.name}</b>
        <div class="row data" style="gap:12px"><span>DANGER ${danger(d)}/5</span><span>BASE ${d.base} + NOTORIETY ${danger(d) - d.base}</span><span>FUEL HERE ${F.fuel} CR</span></div>
        <div class="row" style="justify-content:space-between;margin-top:6px"><span class="data">${here ? 'THE SHIP IS HERE' : 'ROUTE ' + R.path.map(p => dist(p).name.split(' ')[0]).join(' › ') + ' // ' + R.cost + ' FUEL'}</span>
        ${here ? '' : btn(can ? 'JUMP' : 'NO FUEL', { solid: can, cls: 'sm' + (can ? '' : ' lock'), act: 'cy:jump', sub: R.cost + ' FUEL' })}</div></div>`, { treat: 'acc' })}
      ${job}
      ${fx('panel', `<div class="box">${cap('STANDING // ONE METER PER FACTION')}${FACS.map(st).join('')}<div class="data">HIGH NOTORIETY: FIELDS START ALERT, HUNTER TEAMS, CLOSED AIRSPACE, PRICEY OR REFUSED FUEL.</div></div>`, { marks: 'dots' })}
      ${CY.log.length ? fx('side', `<div class="box">${cap('FLIGHT LOG')}${CY.log.slice(-4).map(l => `<div class="data">${l}</div>`).join('')}</div>`) : ''}
      <div class="row" style="justify-content:flex-end">${btn('COMPANY', { go: 'COMPANY', icon: 'back' })}${btn('TO THE JOB', { solid: !!J && here, cls: J && here ? '' : 'lock', go: 'SIGINT', sub: J && here ? 'SCAN IT' : 'JUMP THERE FIRST' })}</div>
    </div></div></div>`;
}
export function cyAct(act: string): boolean {
  const p = act.split(':'); if (p[0] !== 'cy') return false;
  if (p[1] === 'sel') CY.sel = p[2];
  else if (p[1] === 'jump') { const R = route(CY.sel); if (R.cost <= CY.fuel && CY.sel !== CY.at) { CY.fuel -= R.cost; CY.log.push(`T+${pad(CY.log.length * 3 + 2)}H // ${dist(CY.at).name} › ${dist(CY.sel).name} // −${R.cost} FUEL${R.path.some(x => closed(dist(x))) ? ' // CLOSED AIRSPACE' : ''}`); CY.at = CY.sel; } }
  rerender(false); return true;
}
