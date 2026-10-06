// Visual lab: the in-hunt HUD in the micrographics language. Chamfered hairline frames (SVG, redrawn to the panel's
// real pixel size so the 45° cuts never stretch), the "three dots" corner mark, dot-matrix meters, circled letters for
// initiative, and data strings ("TGT: C-01 // BRG 214° // ±2.1T"). Buttons are look-only in the lab (tap = toggle state).
import { TUNE } from '../tune.ts';
import { G } from '../sim/state.ts';
import { PART_ABBR } from '../sim/combat.ts';
import { cx, cy } from '../sim/sensors.ts';
import { playerTarget } from '../sim/turns.ts';
import { T } from '../sim/world.ts';
import { look } from './looks.ts';
import { contactLabel } from './label.ts';
import { frame, dots, seg, pad } from './kit.ts';

const $ = (id: string) => document.getElementById(id)!;
export function initHud() {
  frame($('hStat'), { cut: [0, 14, 0, 0], dots: true, pip: true });
  frame($('hInit'), { cut: [10, 0, 0, 10] });
  frame($('hTgt'), { cut: [0, 0, 12, 0], tab: true, pip: true });
  for (const b of document.querySelectorAll<HTMLElement>('#hBtns button')) frame(b, { cut: [8, 0, 8, 0] });
  frame($('hEnd'), { cut: [0, 12, 0, 12], dots: true });
  $('hBtns').addEventListener('click', ev => { const b = (ev.target as HTMLElement).closest('button'); if (b) b.classList.toggle('on'); });
}

export function applyLookCss() {
  const r = document.documentElement.style, L = look;
  r.setProperty('--bg', L.bg); r.setProperty('--ink', L.ink); r.setProperty('--dim', L.dim); r.setProperty('--font', L.font); r.setProperty('--display', L.display);
  r.setProperty('--hostile', L.hostile); r.setProperty('--objective', L.objective); r.setProperty('--friend', L.friend);
  document.body.dataset.look = L.name;
}

let t = 0;
export function updateHud(dt: number) {
  if ((t -= dt) > 0) return; t = 0.15;
  const p = G.p; if (!p) return;
  const mt = G.mission ? G.mission.type : G.mtype;
  $('hStat').querySelector('.body')!.innerHTML =
    `<div class="row hd"><b>SIGNAL LANCE</b><span class="pill">${G.phase === 'PLAYER' ? 'LIVE' : 'HOLD'}</span><span class="dim">// HUNT ${pad(G.seed % 10000, 4)}</span></div>` +
    `<div class="row"><span class="dim">MISSION:</span> ${mt} <span class="dim">// TURN</span> ${pad(G.turn)} <span class="dim">// T+</span>${pad(G.time / 60)}:${pad(G.time % 60)}</div>` +
    `<div class="rule"></div>` +
    `<div class="row big">EXOS-${p.id} <span class="pill solid">${G.phase === 'PLAYER' ? 'ACTIVE' : 'STANDBY'}</span></div>` +
    `<div class="row"><span class="k">AP</span>${dots(p.ap, TUNE.AP_PER_TURN)}<span class="k">EN</span>${seg(p.en, p.enMax)}<span class="dim">${pad(p.en, 3)}</span></div>` +
    `<div class="row parts">${Object.keys(p.pmax).map(k => `<span class="part${p.parts[k] <= 0 ? ' gone' : p.parts[k] < p.pmax[k] ? ' hurt' : ''}">${PART_ABBR[k]} ${dots(p.parts[k], p.pmax[k], 'sm')}</span>`).join('')}</div>` +
    `<div class="row dim">ARMS: ${p.ammo} RDS${p.shells ? ' // MORTAR ' + p.shells : ''} // ${p.radarOn ? 'RADAR: ON' : 'RADAR: DARK'} // ${p.jamming ? 'ECM: ON' : 'ECM: STBY'}</div>`;
  // initiative: circled letters, filled = now, faded = done; field units only while you have a contact
  let s = ''; G.order.forEach((m: any, i: number) => {
    if (m.dead) return; const mech = G.lance.includes(m);
    if (!mech && !G.pc.some((c: any) => c.on && c.id === m.id)) return;
    s += `<span class="lt${mech ? ' me' : ' foe'}${i === G.oi ? ' now' : i < G.oi ? ' done' : ''}">${mech ? m.id : '?'}</span>`;
  });
  $('hInit').querySelector('.body')!.innerHTML = `<div class="cap">INIT // ORDER</div><div class="lts">${s}</div>`;
  // target block: the contact the active ExoS would act on
  const c = playerTarget();
  $('hTgt').querySelector('.body')!.innerHTML = c && c.on
    ? `<div class="cap">TGT // ${c.lost > c.gap ? 'LOST' : 'TRACK'}</div><div class="row big foe">${(contactLabel(c) || 'UNKNOWN').toUpperCase()}</div>` +
      `<div class="row"><span class="dim">BRG</span> ${pad(((Math.atan2(cy(c) - p.y, cx(c) - p.x) * 180 / Math.PI + 450) % 360), 3)}° <span class="dim">// RNG</span> ${(Math.hypot(cx(c) - p.x, cy(c) - p.y) / T).toFixed(1)}T <span class="dim">// ±</span>${(c.unc / T).toFixed(1)}T</div>` +
      `<div class="row dim">${c.snd ? 'SRC: ACOUSTIC' : 'SRC: SIGNAL'} // CONF ${G.obs[c.id] && G.obs[c.id].var ? 'HIGH' : G.ids[c.id] ? 'CALLED' : 'NONE'}</div>`
    : `<div class="cap">TGT // NONE</div><div class="row dim">NO CONTACT // LISTENING…</div><div class="row dim">PASSIVE ${p.load.passive ? 'ONLINE' : 'OFFLINE'}</div>`;
  // compass tape: active ExoS facing
  const hd = (Math.atan2(p.fy, p.fx) * 180 / Math.PI + 450) % 360;
  ($('hTape').querySelector('.strip') as HTMLElement).style.transform = `translateX(${-hd * 2}px)`;
  $('hHdg').textContent = 'HDG ' + pad(hd, 3) + '°';
}

export function buildTape() { // compass tape: ticks every 5°, labels every 30°, drawn 3 times round for wrap
  let s = ''; for (let d = -360; d < 720; d += 5) { const lab = d % 30 === 0 ? `<b>${['N', '030', '060', 'E', '120', '150', 'S', '210', '240', 'W', '300', '330'][((d % 360) + 360) % 360 / 30]}</b>` : ''; s += `<i class="${d % 30 === 0 ? 'mj' : ''}" style="left:${d * 2}px">${lab}</i>`; }
  $('hTape').querySelector('.strip')!.innerHTML = s;
}
