import { TUNE } from '../tune.ts';
import { partsRead } from '../sim/combat.ts';
import { W, H, T, solid } from '../sim/world.ts';
import { G, unitById } from '../sim/state.ts';
import { bestContact } from '../sim/bot.ts';
import { heardRange, canSee, cx, cy } from '../sim/sensors.ts';
import { upDist, playerTarget, mortarBlock, mortarScatter } from '../sim/turns.ts';
import { V } from './state.ts';
import { zoneAtTile, effSignal, zoneType } from '../sim/zones.ts';

// ============================ RENDER ==================================
export const cv: any = document.getElementById('cv'), ctx = cv.getContext('2d');
export let vw = 0, vh = 0, dpr = 1;
export function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, TUNE.DPR_MAX);
  vw = window.innerWidth; vh = window.innerHeight;
  cv.width = Math.round(vw * dpr); cv.height = Math.round(vh * dpr);
}
export function render() {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = '#111'; ctx.fillRect(0, 0, vw, vh);
  const z = TUNE.ZOOMS[V.zoomI];
  ctx.setTransform(dpr * z, 0, 0, dpr * z, dpr * (vw / 2 - V.camX * z), dpr * (vh / 2 - V.camY * z));
  // ground
  ctx.fillStyle = '#2c2d30'; ctx.fillRect(0, 0, W * T, H * T);
  // extraction zone (green = information)
  ctx.fillStyle = 'rgba(60,200,90,0.25)'; ctx.fillRect((W - TUNE.EXTRACT_COLS) * T, 0, TUNE.EXTRACT_COLS * T, H * T);
  // R10: signal terrain (always known: it's terrain, not intel). QUIET = cool blue, dotted edge;
  // NOISE = amber, diagonal hatching + dashed edge. Faint, under everything else.
  for (const zn of G.zones || []) {
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
  // buildings (only visible tiles)
  const x0 = Math.max(0, Math.floor((V.camX - vw / 2 / z) / T)), x1 = Math.min(W - 1, Math.floor((V.camX + vw / 2 / z) / T));
  const y0 = Math.max(0, Math.floor((V.camY - vh / 2 / z) / T)), y1 = Math.min(H - 1, Math.floor((V.camY + vh / 2 / z) / T));
  ctx.fillStyle = '#6b6d72'; ctx.beginPath();
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (solid[y * W + x]) ctx.rect(x * T, y * T, T, T);
  ctx.fill();
  const p = G.p;
  // Round 5: uplink point (gold): ring = where UPLINK works, diamond = the point, progress label
  {
    const U = G.up, r = (TUNE.UPLINK_RADIUS + 0.5) * T;
    ctx.strokeStyle = ctx.fillStyle = '#fc3'; ctx.lineWidth = 3 / z;
    ctx.globalAlpha = 0.15; ctx.beginPath(); ctx.arc(U.x, U.y, r, 0, 6.2832); ctx.fill(); ctx.globalAlpha = 1;
    ctx.beginPath(); ctx.arc(U.x, U.y, r, 0, 6.2832); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(U.x, U.y - 11); ctx.lineTo(U.x + 11, U.y); ctx.lineTo(U.x, U.y + 11); ctx.lineTo(U.x - 11, U.y); ctx.closePath(); ctx.stroke();
    ctx.font = 'bold ' + (13 / z) + 'px monospace';
    ctx.fillText('UPLINK ' + U.prog + '/' + TUNE.UPLINK_TURNS, U.x - 34 / z, U.y - r - 6 / z);
  }
  // Round 4: move preview (faint = full route, bright = what you can afford, X = where you'll stop)
  if (G.plan && !G.act && G.phase === 'PLAYER') {
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
      ctx.fillText(pl.ap + 'AP ' + pl.en + 'EN +' + pl.sg + 'S' + (pl.cut ? ' cut' : ''), q.x + 10, q.y - 10);
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
    ctx.fillText(e.type + ' ' + e.state + (e.radarOn ? ' RDR' : '') + ' h' + e.hits + ' a' + e.ammo + ' AP' + e.ap + ' EN' + Math.round(e.en) + ' SGN' + Math.round(e.signal) + (zoneType(e) ? ' ' + zoneType(e) + ' eff' + Math.round(effSignal(e)) + (zoneType(e) === 'QUIET' ? ' sig×' + TUNE.ZONE_TYPES.QUIET.SIG_MULT : ' unc×' + TUNE.ZONE_TYPES.NOISE.UNC_MULT + '≥' + TUNE.ZONE_TYPES.NOISE.UNC_FLOOR + 't') : ''), e.x + 14, e.y - 12);
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
    if (e.radarOn) {
      const a0 = Math.atan2(e.fy, e.fx), h = TUNE.RADAR_HALF_ANG * Math.PI / 180;
      ctx.fillStyle = 'rgba(220,0,255,0.08)'; ctx.beginPath(); ctx.moveTo(e.x, e.y);
      ctx.arc(e.x, e.y, TUNE.RADAR_RANGE * T, a0 - h, a0 + h); ctx.closePath(); ctx.fill();
    }
    const er = heardRange(e) * T;
    if (er > 0) { ctx.strokeStyle = 'rgba(220,0,255,0.35)'; ctx.lineWidth = 2 / z; ctx.beginPath(); ctx.arc(e.x, e.y, er, 0, 6.2832); ctx.stroke(); }
  }
  if (V.dbg) { const a0 = Math.atan2(p.fy, p.fx), h = TUNE.EYES_HALF_ANG * Math.PI / 180; // your eyes arc
    ctx.strokeStyle = '#d0f'; ctx.lineWidth = 2 / z; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.arc(p.x, p.y, TUNE.EYES_RANGE * T, a0 - h, a0 + h); ctx.closePath(); ctx.stroke(); }
  // wrecks: destroyed units (red X at the true spot)
  for (const e of G.units) {
    if (!e.dead) continue;
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
  // radar cone (blue)
  for (const m of G.lance) if (m.radarOn) {
    const a0 = Math.atan2(m.fy, m.fx), h = TUNE.RADAR_HALF_ANG * Math.PI / 180;
    ctx.fillStyle = 'rgba(80,160,255,0.13)'; ctx.beginPath(); ctx.moveTo(m.x, m.y);
    ctx.arc(m.x, m.y, TUNE.RADAR_RANGE * T, a0 - h, a0 + h); ctx.closePath(); ctx.fill();
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
  // contacts (red = tracked now, orange = lost/fading)
  for (const c of G.pc) {
    if (!c.on) continue;
    const lost = c.lost > c.gap, a = 1 - Math.max(0, c.lost - c.gap) / TUNE.CONTACT_LINGER, x = cx(c), y = cy(c);
    ctx.globalAlpha = Math.max(0.1, a);
    ctx.strokeStyle = ctx.fillStyle = lost ? '#f90' : '#f33';
    ctx.lineWidth = 2 / z;
    ctx.beginPath(); ctx.arc(x, y, c.unc, 0, 6.2832); ctx.stroke();
    ctx.fillRect(x - 5, y - 5, 10, 10);
    // damage read: updated only while you have a firm live fix; stale = last state seen, grey
    { // R7 run1: type label once your eyes have identified it (kept while the contact lives); damage only while seen
      const u = unitById(c.id), seen = u && !G.lance.includes(u) && !u.dead && G.lance.some(m => !m.dead && canSee(m, u, TUNE.EYES_RANGE));
      let d = '';
      if (seen) d = partsRead(u); // R12: per-part read while seen
      if (c.type) { ctx.fillStyle = '#fff'; ctx.font = 'bold ' + (12 / z) + 'px monospace'; ctx.fillText(c.type, x + 14, y + 4); }
      if (d) { ctx.fillStyle = '#fff'; ctx.font = (11 / z) + 'px monospace'; ctx.fillText(d, x + 14, y + 4 + 13 / z); }
    }
    if (G.sel === c) { ctx.strokeStyle = '#ff0'; ctx.lineWidth = 3 / z; ctx.strokeRect(x - 12, y - 12, 24, 24); }
    ctx.globalAlpha = 1;
  }
  // R9 mortar: scatter preview on the target (orange dashed = where the shell can land, solid when you can fire),
  // and the last splash (splash circle, red = hit something, grey = miss)
  if (G.mode === 'hunt' && G.phase === 'PLAYER' && !G.act && G.load.mortar && p.shells > 0) {
    const c = playerTarget();
    if (c && c.on) {
      const ok = mortarBlock(p, c) === '', r = mortarScatter(c);
      ctx.strokeStyle = '#e85'; ctx.lineWidth = 2 / z; ctx.globalAlpha = ok ? 0.9 : 0.35;
      ctx.setLineDash(ok ? [] : [6 / z, 6 / z]); ctx.beginPath(); ctx.arc(cx(c), cy(c), r, 0, 6.2832); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = '#e85'; ctx.font = 'bold ' + (11 / z) + 'px monospace';
      ctx.fillText('±' + (r / T).toFixed(1) + 't', cx(c) + r + 4 / z, cy(c) - 4 / z); ctx.globalAlpha = 1;
    }
  }
  if (V.mortarArm && !p.dead) { // R9 run1: mortar range band while armed (min and max range rings)
    ctx.strokeStyle = '#e85'; ctx.lineWidth = 2 / z; ctx.globalAlpha = 0.5; ctx.setLineDash([10 / z, 8 / z]);
    for (const R of [TUNE.MORTAR_MIN_RANGE, TUNE.MORTAR_MAX_RANGE]) { ctx.beginPath(); ctx.arc(p.x, p.y, R * T, 0, 6.2832); ctx.stroke(); }
    ctx.setLineDash([]); ctx.globalAlpha = 1;
  }
  if (G.splash) {
    const s = G.splash; ctx.globalAlpha = Math.min(1, s.t);
    ctx.fillStyle = s.hit ? 'rgba(255,90,40,0.35)' : 'rgba(170,170,170,0.3)'; ctx.beginPath(); ctx.arc(s.x, s.y, s.sp, 0, 6.2832); ctx.fill();
    ctx.strokeStyle = s.hit ? '#f63' : '#aaa'; ctx.lineWidth = 2 / z; ctx.beginPath(); ctx.arc(s.x, s.y, s.sp, 0, 6.2832); ctx.stroke();
    ctx.fillStyle = ctx.strokeStyle; ctx.font = 'bold ' + (12 / z) + 'px monospace'; ctx.fillText('SPLASH ' + (s.hit ? 'hit' : 'miss'), s.x + s.sp + 4 / z, s.y + 4);
    ctx.globalAlpha = 1;
  }
  // your mechs (R7 s2): active one highlighted when it's acting; destroyed = grey X; A / B labels
  for (const m of G.lance) {
    ctx.font = 'bold ' + (12 / z) + 'px monospace';
    if (m.dead) {
      ctx.strokeStyle = ctx.fillStyle = '#888'; ctx.lineWidth = 4 / z; ctx.beginPath();
      ctx.moveTo(m.x - 10, m.y - 10); ctx.lineTo(m.x + 10, m.y + 10); ctx.moveTo(m.x + 10, m.y - 10); ctx.lineTo(m.x - 10, m.y + 10); ctx.stroke();
      ctx.fillText(m.id + ' ✕', m.x + 12, m.y - 10); continue;
    }
    const act = m === p && G.phase === 'PLAYER';
    ctx.fillStyle = act ? '#ffffff' : '#a9b0b8'; ctx.beginPath(); ctx.arc(m.x, m.y, 9, 0, 6.2832); ctx.fill();
    ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(m.x, m.y); ctx.lineTo(m.x + m.fx * 16, m.y + m.fy * 16); ctx.stroke();
    if (act) { ctx.strokeStyle = '#9cf'; ctx.lineWidth = 2 / z; ctx.beginPath(); ctx.arc(m.x, m.y, 15, 0, 6.2832); ctx.stroke(); }
    ctx.fillStyle = act ? '#9cf' : '#a9b0b8'; ctx.fillText(m.id, m.x + 12, m.y - 10);
  }
  // took a hit: red screen border
  if (V.hitFlash > 0) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.strokeStyle = 'rgba(255,40,40,' + (V.hitFlash / 0.4) + ')';
    ctx.lineWidth = 16; ctx.strokeRect(0, 0, vw, vh);
  }
  // Round 5: uplink off-screen → gold arrow at the screen edge pointing at it, with distance
  {
    const U = G.up, sx = vw / 2 + (U.x - V.camX) * z, sy = vh / 2 + (U.y - V.camY) * z, m = 24;
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
