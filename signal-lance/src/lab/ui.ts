// Visual lab, UI mode: the micrographics language carried from the HUD into the menus. A component sheet (KIT) plus
// working mock-ups of the game's real screens (title, loadout, jobs board, debrief, contract) and the ID DIAL concept
// (identify a contact from a right-click / long-press radial instead of the separate CARD screen). Screens are drawn
// over the live field, dimmed. Data is mock but shaped like the real thing (TUNE's modules, variants, bounties).
// Nothing here changes game rules; nothing here is wired to the sim.
import './ui.css';
import { TUNE } from '../tune.ts';
import { MISSION_INFO } from '../sim/mission.ts';
import { look } from './looks.ts';
import { UIK, frameAll, redrawFrames, playIn, glyph, GLYPHS, dots, seg, cells, matrix, eq, bars, dial, gauge, ringed, bracket, pad } from './kit.ts';

const $ = (id: string) => document.getElementById(id)!;
export const SCREENS = ['TITLE', 'LOADOUT', 'JOBS', 'ID DIAL', 'DEBRIEF', 'CONTRACT', 'KIT'];
const JP: Record<string, string> = { TITLE: 'シグナル・ランス', LOADOUT: '装備', JOBS: '契約掲示板', 'ID DIAL': '識別', DEBRIEF: '報告', CONTRACT: '契約', KIT: '部品' };
let cur = 'TITLE', onLeave = () => {};

export function applyUiCss() {
  const r = document.documentElement.style;
  r.setProperty('--stroke', UIK.stroke + 'px'); r.setProperty('--fillA', String(UIK.fillA));
  r.setProperty('--glow', String(UIK.glow)); r.setProperty('--scrim', String(UIK.scrim));
  redrawFrames();
}

// ---------------------------------------------------------------- shared bits
const fx = (shape: string, inner: string, o: { treat?: string; marks?: string; cls?: string; attrs?: string; tag?: string } = {}) =>
  `<${o.tag || 'div'} class="fx ${o.cls || ''}" data-frame="${shape}"${o.treat ? ` data-treat="${o.treat}"` : ''}${o.marks ? ` data-marks="${o.marks}"` : ''} ${o.attrs || ''}><div class="in">${inner}</div></${o.tag || 'div'}>`;
const btn = (label: string, o: { sub?: string; go?: string; act?: string; solid?: boolean; cls?: string; shape?: string; marks?: string; icon?: string } = {}) =>
  fx(o.shape || (o.solid ? 'key' : 'btn'), `<span>${o.icon ? glyph(o.icon, 14) : ''}<span>${label}${o.sub ? `<small>${o.sub}</small>` : ''}</span></span>`,
    { tag: 'button', cls: 'ub ' + (o.cls || ''), treat: o.solid ? 'solid' : '', marks: o.marks || (o.solid ? 'dots' : ''), attrs: (o.go ? `data-go="${o.go}" ` : '') + (o.act ? `data-act="${o.act}"` : '') }).replace('<div class="in">', '').replace(/<\/div><\/button>$/, '</button>');
const cap = (t: string, cls = '') => `<div class="cap ${cls}">${t}</div>`;
const sec = (n: string, title: string, data: string) => `<div class="sec"><span class="dim">${n} //</span><b data-decode>${title}</b><span class="data">${data}</span>${matrix(10, 2, n.charCodeAt(1), 0.45)}</div>`;

// ---------------------------------------------------------------- KIT
function kit() {
  const SH = ['sweep', 'dossier', 'wing', 'plate', 'bar', 'badge'], TR = [['solid', 'SOLID'], ['', 'LINE'], ['acc', 'ACCENT'], ['dbl', 'DOUBLE']];
  const MK: Record<string, string> = { solid: '', '': 'pip', acc: 'dots pip', dbl: 'dotsbr slot' };
  const shapes = SH.map(s => TR.map(([t, n]) => fx(s, `<span class="lbl">${s.toUpperCase()} // ${n}</span>`, { treat: t, marks: MK[t] + (s === 'bar' && t === 'acc' ? ' hatch4' : ''), cls: s === 'sweep' || s === 'dossier' ? 'tall' : '' })).join('')).join('');
  const dl = [0, 45, 90, 135, 180, 225, 270, 315];
  return `<div class="scr kit">
  <section>${sec('01', 'FRAMES', 'HUD VECTOR SHAPES // FOUR TREATMENTS EACH // REBUILT AT REAL PIXEL SIZE, CUTS STAY 45°')}<div class="shapes">${shapes}</div></section>
  <section>${sec('02', 'CONTROLS', 'BUTTONS // STEPPERS // TOGGLES // SEGMENTED // TABS // MENU ROWS')}
  <div class="grid">
    ${fx('panel', `${cap('BUTTON // STATES')}<div class="row">${btn('LAUNCH', { solid: true, sub: 'CONTRACT' })}${btn('LOADOUT', { sub: 'A + B' })}</div><div class="row">${btn('MORTAR', { sub: 'NO SHELLS', cls: 'lock' })}${btn('ABORT', { sub: 'HUNT', cls: 'danger' })}</div>`, { cls: 'spec', marks: 'dots pip' })}
    ${fx('panel', `${cap('STEPPER // SLOT COST')}<div class="row"><div class="stepper">${btn('−', { cls: 'sm' })}<output>×2</output>${btn('+', { cls: 'sm' })}</div><span class="data">ARMOUR PLATE<br>2 SLOTS // +3 HITS</span></div>${cap('TOGGLE')}<div class="row"><span class="toggle on" data-act="tog"><span class="tr"></span>THE PACK</span><span class="toggle" data-act="tog"><span class="tr"></span>QUICK</span></div>`, { cls: 'spec', marks: 'dots' })}
    ${fx('panel', `${cap('SEGMENTED // TABS')}<div class="segsel" data-act="seg"><button class="on">1 HUNT</button><button>3 HUNTS</button><button>5 HUNTS</button></div><div class="tabs">${btn(ringed('A') + ' EXOS-A', { shape: 'tab', solid: true, cls: 'sm' })}${btn(ringed('B') + ' EXOS-B', { shape: 'tab', cls: 'sm' })}</div>`, { cls: 'spec', marks: 'pip' })}
    ${fx('panel', `${cap('MENU ROW // HOVER = CHEVRON')}${menuItem('03', 'LOADOUT', 'A 10/10 · B 9/10', true)}${menuItem('04', 'FIELD ID', '9 VARIANTS')}`, { cls: 'spec', marks: 'dots' })}
  </div></section>
  <section>${sec('03', 'READOUTS', 'DOT METERS // SEGMENTS // SLOT CELLS // GAUGES // DIALS // DATA TEXTURE')}
  <div class="grid">
    ${fx('panel', `${cap('METERS')}<div class="row"><span class="dim">AP</span>${dots(2, 3)}<span class="dim">EN</span>${seg(140, 200)}<span class="dim">140</span></div><div class="row"><span class="dim">COR</span>${dots(2, 3, 'sm')}<span class="dim">LEG</span>${dots(2, 2, 'sm')}<span class="dim">WPN</span>${dots(0, 1, 'sm')}</div>${cap('SLOT CELLS // PATTERN = MODULE')}${cells(['armour', 'armour', 'radar', 'radar', 'ammo', 'ammo', 'cells', 'mortar', 'ecm', ''], 10)}`, { cls: 'spec', marks: 'dots pip' })}
    ${fx('panel', `${cap('RING GAUGES')}<div class="row" style="justify-content:space-around">${gauge(12, 21, '12', 'HITS')}${gauge(200, 300, '200', 'EN')}${gauge(3, 4, '3/4', 'KILLS')}</div>`, { cls: 'spec', marks: 'pip' })}
    ${fx('panel', `${cap('DIALS // COMPONENTS ROW')}<div class="dials">${dl.map(a => dial(a, 22, true)).join('')}</div><div class="dials">${dl.map(a => dial(a, 22)).join('')}</div><div class="dials">${dial(0, 22, false, 2)}${dial(90, 22, false, 5)}${dial(200, 22, true, 9)}<span class="data">SPIN // LIVE</span></div>`, { cls: 'spec', marks: 'dots' })}
    ${fx('panel', `${cap('DATA TEXTURE')}<div class="row">${matrix(12, 5, 7, 0.55)}${eq(9, 4)}</div><div class="row">${bars(5, 34)}<span class="data">0x4E71 // 2049</span></div><div class="data">SYNCING — ID: 11-2A — PACKET LOSS: 0.3% // MODULE A<br>OUTPUT: DIGITAL // [INDEX] 00030741</div>`, { cls: 'spec', marks: 'pip' })}
    ${fx('panel', `${cap('LEDGER')}<div class="ledger"><div>BASE PAY<b>100 CR</b></div><div>BOUNTY // HEAVY<b>80 CR</b></div><div>REPAIRS<b>−40 CR</b></div><div class="t">NET<b>140 CR</b></div></div>`, { cls: 'spec', marks: 'dots' })}
    ${fx('panel', `${cap('TAGS + PILLS')}<div class="row">${bracket('FUSION')}${bracket('UPLINK', 'obj')}${bracket('HOSTILE', 'foe')}</div><div class="row"><span class="pill">LIVE</span><span class="pill solid">ACTIVE</span><span class="pill foe">LOST</span><span class="pill obj">3/3</span></div><div class="row">${ringed('A', 'on')}${ringed('B')}${ringed('?', 'foe')}${ringed('1')}${ringed('2')}</div>`, { cls: 'spec', marks: 'pip' })}
  </div></section>
  <section>${sec('04', 'GLYPHS', 'COMPONENTS-LIBRARY LINE SYMBOLS // 24-UNIT GRID // ONE STROKE WEIGHT')}
  <div class="glyphs">${GLYPHS.map(g => `<div>${glyph(g, 24)}${g}</div>`).join('')}</div></section>
  <section>${sec('05', 'ALERTS', 'TOASTS // CONFIRM // PROGRESS')}
  <div class="grid">
    ${fx('wing', `${glyph('target', 20)}<div><b class="h3">CONTACT ACQUIRED</b><div class="data">C-03 // BRG 214° // ±2.1T</div></div>`, { cls: 'toast', treat: 'acc' })}
    ${fx('wing', `${glyph('xbox', 20)}<div><b class="h3">[!] CONTACT LOST</b><div class="data">C-01 // LAST SEEN T07</div></div>`, { cls: 'toast bad', treat: 'acc' })}
    ${fx('sweep', `<div class="box" style="padding:22px 20px 18px">${cap('CONFIRM // [SYSTM-RST]', 'no')}<div class="h3" style="margin:6px 0 4px">ABORT HUNT?</div><div class="data">BOTH EXOS EXTRACT NOW. THE HUNT COUNTS AS A LOSS.</div><div class="row" style="margin-top:12px">${btn('ABORT', { cls: 'danger sm' })}${btn('STAY', { solid: true, cls: 'sm' })}</div></div>`, { treat: 'dbl', marks: 'dots ticks' })}
    ${fx('panel', `${cap('[PROCESSING]')}<div class="prog run">${Array.from({ length: 16 }, (_, i) => `<i style="--i:${i}"></i>`).join('')}</div><div class="row"><span class="spinring">${Array.from({ length: 10 }, (_, i) => `<i style="transform:rotate(${i * 36}deg);animation-delay:${-1.2 + i * 0.12}s"></i>`).join('')}</span><span class="data">UPLINK 2/3<br>HOLD THE RING</span></div>`, { cls: 'spec', marks: 'dots pip' })}
  </div></section>
  <section>${sec('06', 'TYPE', 'DISPLAY + BODY FROM THE LOOK // KATAKANA IN DOT-MATRIX GOTHIC')}
  ${fx('plate', `<div class="box type"><div class="big">SIGNAL LANCE</div><div class="mid">EXOS-A // ACTIVE <span class="jp">シグナル・ランス</span></div><p class="body">Find hidden enemies with your sensors, then win the hunt. Every reading has a cost: radar lights you up, a gunshot is heard twelve tiles away.</p><div class="data">0123456789 // ±2.1T // 214° // T+14:22</div></div>`, { treat: 'acc', marks: 'dots pip' })}</section>
  </div>`;
}
const menuItem = (ix: string, nm: string, vl: string, hot = false, go = '', solid = false) =>
  fx('key', `<span class="ix">${ix}</span><span class="mn">${nm}</span><span class="vl">${vl} <span class="chev">${glyph('chevron', 12)}</span></span>`, { tag: 'button', cls: 'mi' + (hot ? ' hot' : ''), treat: solid ? 'solid' : '', marks: solid ? 'dots' : '', attrs: go ? `data-go="${go}"` : '' }).replace('<div class="in">', '').replace(/<\/div><\/button>$/, '</button>');

// ---------------------------------------------------------------- TITLE
const S = { hunts: 3, pack: false, loads: [{ armour: 2, radar: 1, passive: 0, ecm: 0, ammo: 3, cells: 1, mortar: 0 }, { armour: 1, radar: 0, passive: 1, ecm: 1, ammo: 2, cells: 1, mortar: 1 }] as any[], mech: 0, job: 0 };
function emblem() {
  let t = '', d = '';
  for (let i = 0; i < 120; i++) { const a = i / 120 * Math.PI * 2, l = i % 10 ? 3 : 9; t += `M${(Math.cos(a) * 92).toFixed(1)},${(Math.sin(a) * 92).toFixed(1)} L${(Math.cos(a) * (92 - l)).toFixed(1)},${(Math.sin(a) * (92 - l)).toFixed(1)} `; }
  for (let r = 18; r < 78; r += 10) for (let i = 0; i < r * 1.4; i++) { const a = i / (r * 1.4) * Math.PI * 2; d += `<circle cx="${(Math.cos(a) * r).toFixed(1)}" cy="${(Math.sin(a) * r).toFixed(1)}" r=".55" style="fill:var(--ink);stroke:none;opacity:${(1 - r / 90).toFixed(2)}"/>`; }
  let sw = ''; for (let i = 0; i < 14; i++) { const a = -i * 2.2 * Math.PI / 180; sw += `<path d="M0,0 L${(Math.cos(a) * 80).toFixed(1)},${(Math.sin(a) * 80).toFixed(1)}" style="opacity:${(0.7 - i * 0.05).toFixed(2)}"/>`; }
  return `<div class="emblem"><svg viewBox="-100 -100 200 200"><g class="r1"><path d="${t}" style="opacity:.6"/></g><g class="r2"><circle r="84" style="stroke-dasharray:1 5;opacity:.7"/><circle r="99" style="stroke-dasharray:30 8 2 8;opacity:.35"/></g>${d}<circle r="6" style="opacity:.8"/><g class="sw">${sw}</g>${['N', 'E', 'S', 'W'].map((c, i) => `<text x="${[0, 70, 0, -70][i]}" y="${[-66, 2, 72, 2][i]}" style="fill:var(--dim);font:6px var(--font);text-anchor:middle">${c}</text>`).join('')}</svg></div>`;
}
const BOOT = ['EXOS LANCE FIRMWARE r16-s1 ........ <b>OK</b>', 'LIDAR HEAD // 0.2° AZ // 0.9 REV/S .. <b>OK</b>', 'PASSIVE SUITE // BEARING ARRAY .... <b>OK</b>', 'ECM POD // MASK + GHOST ........... <b>STBY</b>', 'CONTRACT BOARD // 2 JOBS POSTED ... <b>LIVE</b>', 'NET // PACKET LOSS 0.3% // 15MS ... <b>OK</b>'];
function title() {
  const L = S.loads, used = (l: any) => MODS.reduce((s, m) => s + l[m.k] * m.slots, 0);
  return `<div class="scr title">
  <div class="mark rise">${emblem()}
    <div class="row data">${bracket('EXOS')} LANCE COMMAND // BUILD r16-s1-LAB // ${bars(9, 22)}</div>
    <div class="wm"><span data-decode>SIGNAL</span><span>LANCE</span></div>
    <div class="sub"><span class="jp h3">シグナル・ランス</span>${fx('chip', '<span class="data" style="padding:3px 10px;display:block;color:var(--ink)">SENSOR WARFARE // TWO EXOS // ONE LANCE</span>')}</div>
    <div class="rule"></div>
    <div class="row" style="gap:18px;align-items:flex-start"><div class="bootlog" id="boot"></div>${matrix(8, 8, 3, 0.5)}</div>
  </div>
  <div class="menu">
    ${cap('MAIN // 01–07')}
    ${menuItem('01', 'NEW CONTRACT', S.hunts + ' HUNTS · WIN ' + Math.min(2, S.hunts), false, 'LOADOUT', true)}
    ${menuItem('02', 'LOADOUT', 'A ' + used(L[0]) + '/10 · B ' + used(L[1]) + '/10', false, 'LOADOUT')}
    ${menuItem('03', 'JOBS BOARD', '2 POSTED', false, 'JOBS')}
    ${menuItem('04', 'FIELD ID', '9 VARIANTS', false, 'ID DIAL')}
    <div class="row" style="padding:8px 4px;gap:18px"><span class="dim" style="font-size:9px">LENGTH</span><div class="segsel" data-act="hunts">${[1, 3, 5].map(n => `<button class="${n === S.hunts ? 'on' : ''}" data-n="${n}">${n} HUNT${n > 1 ? 'S' : ''}</button>`).join('')}</div><span class="toggle${S.pack ? ' on' : ''}" data-act="pack"><span class="tr"></span>THE PACK</span></div>
    ${menuItem('05', 'LAST DEBRIEF', 'HUNT WON', false, 'DEBRIEF')}
    ${menuItem('06', 'CONTRACT LOG', 'C04 COMPLETE', false, 'CONTRACT')}
    ${menuItem('07', 'COMPONENT KIT', 'LAB', false, 'KIT')}
    <div class="data" style="margin-top:8px;display:flex;justify-content:space-between"><span>TESTER: — // CONTRACTS RUN 004</span><span class="jp">オンライン</span></div>
  </div></div>`;
}
function bootLog() {
  const el = document.getElementById('boot'); if (!el) return; let i = 0; el.innerHTML = '';
  const add = () => { if (cur !== 'TITLE' || !el.isConnected || i >= BOOT.length) return; el.innerHTML += '<div>' + BOOT[i++] + '</div>'; setTimeout(add, 260 + Math.random() * 300); };
  setTimeout(add, UIK.drawOn ? 500 : 0);
}

// ---------------------------------------------------------------- LOADOUT
const MODS = [
  { k: 'armour', name: 'ARMOUR PLATE', slots: 2, max: 5, g: 'shield', desc: '+' + TUNE.ARMOUR_HITS + ' hits · +1 signature' },
  { k: 'radar', name: 'ACTIVE RADAR', slots: 2, max: 1, g: 'radar', desc: 'pulse ' + TUNE.AP_RADAR + ' AP + ' + TUNE.RADAR_EN + ' EN · cone, sees through 4 walls' },
  { k: 'passive', name: 'PASSIVE SUITE', slots: 2, max: 1, g: 'ear', desc: 'bearing lines · cross two for a fix' },
  { k: 'ecm', name: 'ECM POD', slots: 2, max: 1, g: 'wave', desc: 'mask or ghost · jams' },
  { k: 'ammo', name: 'AUTOCANNON', slots: 1, max: 10, g: 'gun', desc: TUNE.AMMO_PER_SLOT + ' rounds per slot · heard ' + TUNE.SOUND_RANGE.SHOT + ' tiles away' },
  { k: 'cells', name: 'ENERGY CELL', slots: 1, max: 10, g: 'cell', desc: '+' + TUNE.ENERGY_CELL + ' energy' },
  { k: 'mortar', name: 'MORTAR', slots: 1, max: 1, g: 'shell', desc: TUNE.MORTAR_SHELLS + ' shells · fires on a fix, no LoS' },
];
const usedSlots = (l: any) => MODS.reduce((s, m) => s + l[m.k] * m.slots, 0);
function mech(l: any) {
  const on = (k: string) => l[k] > 0 ? ' on' : '';
  const CO: [string, number, number, 'l' | 'r', number, string][] = [ // module, anchor x, y, side, label y, value
    ['passive', 184, 20, 'l', 28, l.passive ? 'BEARING ARRAY' : '— EMPTY'], ['ecm', 100, 110, 'l', 104, l.ecm ? 'MASK // GHOST' : '— EMPTY'],
    ['armour', 166, 150, 'l', 176, l.armour ? '×' + l.armour + ' // +' + l.armour * TUNE.ARMOUR_HITS + ' HITS' : '— EMPTY'], ['cells', 180, 246, 'l', 252, l.cells ? '×' + l.cells + ' // +' + l.cells * TUNE.ENERGY_CELL + ' EN' : '— EMPTY'],
    ['radar', 270, 44, 'r', 40, l.radar ? 'PULSE // CONE' : '— EMPTY'], ['mortar', 318, 66, 'r', 96, l.mortar ? TUNE.MORTAR_SHELLS + ' SHELLS' : '— EMPTY'],
    ['ammo', 322, 280, 'r', 300, l.ammo ? '×' + l.ammo + ' // ' + l.ammo * TUNE.AMMO_PER_SLOT + ' RDS' : '— EMPTY'],
  ];
  const co = CO.map(([k, ax, ay, s, ly, v]) => {
    const m = MODS.find(x => x.k === k)!, ex = s === 'l' ? 76 : 364, tx = s === 'l' ? 12 : 428, an = s === 'l' ? 'start' : 'end';
    return `<g class="co${on(k)}"><path d="M${ax},${ay} L${ex},${ly} L${tx},${ly}"/><circle cx="${ax}" cy="${ay}" r="2.2"/><text x="${tx}" y="${ly - 5}" text-anchor="${an}">${m.name}</text><text class="v" x="${tx}" y="${ly + 11}" text-anchor="${an}">${v}</text></g>`;
  }).join('');
  let grid = ''; for (let x = 20; x <= 420; x += 20) grid += `M${x},0 L${x},470 `; for (let y = 10; y <= 470; y += 20) grid += `M20,${y} L420,${y} `;
  return `<svg class="mech" viewBox="0 0 440 470" preserveAspectRatio="xMidYMid meet">
  <path class="grid" d="${grid}" style="stroke-dasharray:1 3"/>
  <g class="body">
    <path d="M200,52 L240,52 L248,66 L240,82 L200,82 L192,66 Z M204,64 L236,64 M206,70 L234,70 M212,82 L212,94 M228,82 L228,94"/>
    <path d="M170,94 L270,94 L290,126 L280,196 L254,214 L186,214 L160,196 L150,126 Z"/><circle cx="220" cy="150" r="14"/><circle cx="220" cy="150" r="5"/>
    <path d="M186,214 L196,232 L244,232 L254,214 M196,232 L244,232 L250,250 L190,250 Z"/>
    <path d="M128,100 L158,96 L162,118 L130,122 Z M312,100 L282,96 L278,118 L310,122 Z"/>
    <path d="M146,110 L128,122 L118,176 L136,180 L150,130 M118,180 L112,236 L132,240 L136,180 M112,240 L114,256 L130,256 L132,240"/>
    <path d="M294,110 L312,122 L322,176 L304,180 L290,130 M322,180 L328,236 L308,240 L304,180"/>
    <path d="M194,252 L176,262 L170,330 L194,334 L206,262 M170,334 L164,410 L192,414 L194,334 M156,414 L200,414 L206,428 L150,428 Z"/>
    <path d="M246,252 L264,262 L270,330 L246,334 L234,262 M270,334 L276,410 L248,414 L246,334 M240,414 L284,414 L290,428 L234,428 Z"/>
    <path d="M150,440 L290,440 M220,436 L220,444" style="opacity:.5"/>
  </g>
  <g class="mod${on('armour')}"><path d="M176,104 L264,104 L278,128 L270,186 L250,202 L190,202 L170,186 L162,128 Z M166,140 L274,140 M168,168 L272,168 M174,284 L196,284 M172,300 L194,300 M244,284 L266,284 M246,300 L268,300"/></g>
  <g class="mod${on('radar')}"><path d="M246,46 Q262,30 274,48 M244,58 L258,42 M258,44 L262,56"/><circle cx="262" cy="40" r="2"/></g>
  <g class="mod${on('passive')}"><path d="M200,54 L184,20 M178,26 L190,16 M176,34 L192,24"/><circle cx="184" cy="20" r="2"/></g>
  <g class="mod${on('ecm')}"><path d="M100,92 L128,92 L132,100 L132,128 L104,128 L100,120 Z M106,104 L126,104 M106,112 L126,112 M106,120 L126,120"/></g>
  <g class="mod${on('mortar')}"><path d="M296,98 L308,60 L324,66 L314,102 Z M304,72 L320,78"/><circle cx="316" cy="62" r="5"/></g>
  <g class="mod${on('ammo')}"><path d="M310,240 L310,312 M318,240 L318,312 M306,312 L322,312 M306,292 L322,292 M326,196 L346,196 L346,226 L326,226 Z M330,204 L342,204 M330,212 L342,212"/></g>
  <g class="mod${on('cells')}"><path d="M178,236 L192,236 L192,258 L178,258 Z M248,236 L262,236 L262,258 L248,258 Z M181,244 L189,244 M251,244 L259,244"/></g>
  ${co}
  <line class="scanl" x1="20" x2="420" y1="0" y2="0"/>
  </svg>`;
}
function loadout() {
  const l = S.loads[S.mech], u = usedSlots(l), owned: string[] = [];
  for (const m of MODS) for (let i = 0; i < l[m.k] * m.slots; i++) owned.push(m.k);
  const hits = 6 + l.armour * TUNE.ARMOUR_HITS, en = TUNE.ENERGY_BASE + l.cells * TUNE.ENERGY_CELL, rds = l.ammo * TUNE.AMMO_PER_SLOT;
  const tabs = ['A', 'B'].map((id, i) => btn(ringed(id, i === S.mech ? '' : '') + ' EXOS-' + id, { shape: 'tab', solid: i === S.mech, act: 'mech' + i, cls: 'sm', sub: usedSlots(S.loads[i]) + '/10 SLOTS' })).join('');
  return `<div class="scr lo">
  ${fx('panel', `<div class="row" style="justify-content:space-between"><div class="tabs">${tabs}</div><span class="data">BAY 02 // <span class="jp">装備</span></span></div>
    ${mech(l)}
    <div><div class="row" style="justify-content:space-between">${cap('SLOTS // ' + u + ' / ' + TUNE.SLOTS + (u < TUNE.SLOTS ? ' // ' + (TUNE.SLOTS - u) + ' FREE' : ' // FULL'), 'no')}<span class="data">PATTERN = MODULE</span></div>${cells(owned, TUNE.SLOTS)}</div>`, { cls: 'bay', marks: 'dots pip ticks', treat: 'dbl' })}
  <div style="display:grid;gap:14px;align-content:start">
    ${fx('bar', `<div class="row" style="padding:12px 16px 10px 46px;justify-content:space-between"><b class="h3" data-decode>LOADOUT // EXOS-${'AB'[S.mech]}</b><span class="data">LOCKS FOR THE WHOLE CONTRACT</span></div>`, { treat: 'acc', marks: 'hatch4' })}
    <div class="mods">${MODS.map(m => fx('plate', `<span class="sw p-${m.k}"></span><div><span class="mn">${m.name}</span><span class="sl">${'<i></i>'.repeat(m.slots)}</span><div class="ds">${m.desc}</div></div><div class="stepper">${btn('−', { cls: 'sm', act: 'dec:' + m.k })}<output>×${l[m.k]}</output>${btn('+', { cls: 'sm' + (l[m.k] >= m.max || u + m.slots > TUNE.SLOTS ? ' lock' : ''), act: 'inc:' + m.k })}</div>`, { cls: 'mod-r' + (l[m.k] ? '' : ' zero') })).join('')}</div>
    ${fx('wing', `<div class="stats" style="padding:16px 10px 12px">${gauge(hits, 21, String(hits), 'HIT POOL')}${gauge(en, 400, String(en), 'ENERGY')}${gauge(rds, 60, String(rds), 'ROUNDS')}${gauge(l.armour + l.radar * 2 + l.ecm, 8, '+' + (l.armour + l.radar * 2 + l.ecm), 'SIGNATURE')}</div>`, { treat: 'acc' })}
    <div class="row" style="justify-content:flex-end">${btn('BACK', { go: 'TITLE', icon: 'back' })}${btn('POST TO BOARD', { solid: true, go: 'JOBS', sub: 'START CONTRACT' })}</div>
  </div></div>`;
}

// ---------------------------------------------------------------- JOBS
const comp = (n: string) => (TUNE.FIELD_COMPOSITIONS as any[]).find(c => c.NAME === n) || TUNE.FIELD_COMPOSITIONS[0];
const JOBS = [
  { type: 'UPLINK', comp: 'Fortified', site: 'PUMPHOUSE 4', quiet: 'RAIL CUT (NW)', noise: 'SUMP (S)', pay: 180, threat: 3, obj: [190, 70], zq: [30, 18, 70, 40], zn: [150, 110, 90, 30], seed: 4 },
  { type: 'RETRIEVE', comp: 'Ambush', site: 'FREIGHT YARD 9', quiet: 'CANAL (N)', noise: 'SE APRON', pay: 240, threat: 4, obj: [215, 42], zq: [90, 10, 90, 26], zn: [200, 96, 76, 44], seed: 11 },
];
function jobMap(j: any, i: number) {
  let g = ''; for (let x = 6; x < 300; x += 12) for (let y = 6; y < 150; y += 12) g += `<circle class="grd" cx="${x}" cy="${y}" r=".7"/>`;
  const c = comp(j.comp), n = (c.TURRET || 0) + (c.EMPLACEMENT || 0) + (c.PATROL || 0);
  let r = j.seed * 9301, th = '';
  for (let k = 0; k < n; k++) { r = (r * 9301 + 49297) % 233280; const a = r / 233280 * 6.28, d = 18 + (r % 40); th += `<g transform="translate(${(j.obj[0] + Math.cos(a) * d).toFixed(0)},${(j.obj[1] + Math.sin(a) * d * 0.7).toFixed(0)})"><circle r="5" style="fill:none;stroke:var(--hostile)"/><text y="2.5" style="fill:var(--hostile);font:600 7px var(--font);text-anchor:middle">?</text></g>`; }
  const [ox, oy] = j.obj, hz = `hz${i}`;
  return `<svg viewBox="0 0 300 150" preserveAspectRatio="none"><defs><pattern id="${hz}q" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0,0 L0,5" style="stroke:var(--ink);opacity:.35"/></pattern><pattern id="${hz}n" width="4" height="4" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r=".8" style="fill:var(--objective);opacity:.5"/></pattern></defs>
  ${g}<rect class="z" x="${j.zq[0]}" y="${j.zq[1]}" width="${j.zq[2]}" height="${j.zq[3]}" style="fill:url(#${hz}q);stroke:var(--ink);stroke-dasharray:1 3"/><text x="${j.zq[0] + 3}" y="${j.zq[1] - 3}" style="fill:var(--ink);font:6px var(--font)">QUIET</text>
  <rect class="z" x="${j.zn[0]}" y="${j.zn[1]}" width="${j.zn[2]}" height="${j.zn[3]}" style="fill:url(#${hz}n);stroke:var(--objective);stroke-dasharray:5 3"/><text x="${j.zn[0] + 3}" y="${j.zn[1] - 3}" style="fill:var(--objective);font:6px var(--font)">NOISE</text>
  <path d="M286,0 L286,150" style="stroke:var(--friend);stroke-dasharray:2 4"/><text x="290" y="78" style="fill:var(--friend);font:6px var(--font);writing-mode:vertical-rl">EXFIL</text>
  <circle cx="${ox}" cy="${oy}" r="14" style="fill:none;stroke:var(--objective)"/><circle cx="${ox}" cy="${oy}" r="19" style="fill:none;stroke:var(--objective);stroke-dasharray:1 3;opacity:.6"/><path d="M${ox},${oy - 5} L${ox + 5},${oy} L${ox},${oy + 5} L${ox - 5},${oy} Z" style="fill:var(--objective)"/>
  ${th}<g style="fill:var(--friend)"><path d="M14,64 L24,68 L14,72 Z"/><path d="M14,84 L24,88 L14,92 Z"/></g><text x="28" y="70" style="fill:var(--friend);font:600 6px var(--font)">A</text><text x="28" y="90" style="fill:var(--friend);font:600 6px var(--font)">B</text></svg>`;
}
function jobs() {
  const job = (j: any, i: number) => {
    const c = comp(j.comp), M = (MISSION_INFO as any)[j.type];
    const field = ['PATROL', 'TURRET', 'EMPLACEMENT'].filter(k => c[k]).map(k => c[k] + ' ' + (c[k] > 1 ? TUNE.FIELD_TYPES[k].PLURAL : TUNE.FIELD_TYPES[k].NAME)).join(' // ');
    return fx('dossier', `<div class="ty">${glyph(j.type === 'UPLINK' ? 'link' : 'crate', 30, 'obj')}<div><div class="data">JOB ${pad(i + 1)} // ${j.site}</div><b data-decode>${j.type}</b></div></div>
      <div style="font-size:11px;text-transform:none;letter-spacing:.02em">${M.goal}</div>
      ${fx('chip', `<div class="map">${jobMap(j, i)}</div>`, { attrs: 'style="padding:6px"' })}
      <div class="kv"><span>INTEL</span><span>${c.NAME.toUpperCase()} // ${field.toUpperCase()}</span><span>SITE</span><span>${j.site}</span><span>QUIET</span><span>${j.quiet}</span><span>NOISE</span><span>${j.noise}</span></div>
      <div class="row" style="justify-content:space-between"><span class="threat"><span class="dim" style="font-size:9px;margin-right:4px">THREAT</span>${Array.from({ length: 5 }, (_, k) => `<i class="${k < j.threat ? 'on' : ''}"></i>`).join('')}</span><span class="h3 obj">~${j.pay} CR</span></div>
      <div class="row" style="justify-content:flex-end">${btn(S.job === i ? 'TAKE JOB' : 'SELECT', { solid: S.job === i, act: S.job === i ? 'take' : 'job' + i, sub: S.job === i ? 'DROP IN' : '' })}</div>`,
      { cls: 'job' + (S.job === i ? ' pick' : ''), treat: S.job === i ? 'acc' : 'dbl', marks: 'dots pip', attrs: `data-act="job${i}"` });
  };
  const mline = (id: string, parts: [string, number, number][], extra: string, refit: string) => fx('side', `<div class="row" style="justify-content:space-between"><span class="row">${ringed(id, 'on')}<b class="h3">EXOS-${id}</b><span class="pill">${parts.some(p => p[1] < p[2]) ? 'DAMAGED' : 'READY'}</span></span><span class="data">${extra}</span></div>
    <div class="parts">${parts.map(([k, v, m]) => `<span class="part${v <= 0 ? ' gone' : v < m ? ' hurt' : ''}">${k} ${dots(v, m, 'sm')}</span>`).join('')}</div><div class="row">${refit}</div>`, { cls: 'mline' });
  return `<div class="scr" style="display:grid;gap:18px">
  ${fx('bar', `<div class="row" style="padding:12px 18px 10px 50px;justify-content:space-between"><b class="h3" data-decode>CONTRACT 04 // HUNT 2 / 3</b><span class="row data"><span>WINS 1 (NEED 2)</span><span class="obj">340 CR</span><span class="jp">契約掲示板</span></span></div>`, { treat: 'acc', marks: 'hatch4 pip' })}
  <div class="jobs">${JOBS.map(job).join('')}</div>
  ${cap('LANCE // REFIT CAPS AT 80% OF LAST HUNT')}
  <div class="lance">${mline('A', [['COR', 3, 3], ['LEG', 2, 2], ['WPN', 0, 1], ['SNS', 1, 1]], '20 RDS', btn('REPAIR WORST', { cls: 'sm', sub: TUNE.COST_REPAIR + ' CR' }) + btn('+10 RDS', { cls: 'sm', sub: TUNE.COST_ROUNDS + ' CR' }))}
    ${mline('B', [['COR', 2, 3], ['LEG', 2, 2], ['WPN', 1, 1], ['SNS', 1, 1]], '10 RDS // 1 SHELL', btn('REPAIR WORST', { cls: 'sm', sub: TUNE.COST_REPAIR + ' CR' }) + btn('+1 SHELL', { cls: 'sm lock', sub: 'AT MAX' }))}</div>
  </div>`;
}

// ---------------------------------------------------------------- DEBRIEF
function debrief() {
  const ev: [string, string, string][] = [['T02', '', 'A // PASSIVE BEARING ON C-01'], ['T03', 'h', 'C-02 RADAR PULSE // EMPLACEMENT?'], ['T05', '', 'B // ID C-01 AS HEAVY (CORRECT)'], ['T06', 'k', 'C-01 PATROL·HEAVY // KIA (A, 4 RDS)'], ['T08', 'u', 'UPLINK 1/3 // PUMPHOUSE 4'], ['T09', 'h', 'B HIT // WPN GONE'], ['T10', 'k', 'C-02 EMPLACEMENT·FIRE // KIA (MORTAR)'], ['T11', 'u', 'UPLINK 3/3 // HUNT WON']];
  const q = (t: string, a: string[], on: number) => `<div class="q"><span>${t}</span><div class="segsel" data-act="seg">${a.map((x, i) => `<button class="${i === on ? 'on' : ''}">${x}</button>`).join('')}</div></div>`;
  return `<div class="scr deb">
  <div style="display:grid;gap:16px;align-content:start">
    ${fx('sweep', `<div class="data">HUNT 2 / 3 // UPLINK // PUMPHOUSE 4 // <span class="jp">報告</span></div><div class="h1" data-decode>HUNT WON</div><div class="row data"><span class="pill solid">UPLINK 3/3</span><span>T+14:22 // 11 TURNS // BOTH EXOS EXTRACTED</span></div>`, { cls: 'stamp won', treat: 'acc', marks: 'dotsbr ticks' })}
    ${fx('wing', `<div class="stats" style="padding:16px 8px 12px">${gauge(3, 4, '3/4', 'KILLS')}${gauge(7, 11, '7/11', 'HITS')}${gauge(2, 3, '2/3', 'IDS RIGHT')}${gauge(9, 12, '9', 'LOUDEST')}${gauge(1, 1, '1/1', 'MORTAR')}</div>`, { treat: 'acc' })}
    ${fx('panel', `<div class="box">${cap('EVENT LOG // TURN BY TURN')}<div class="tl">${ev.map(([t, c, s]) => `<div class="${c}"><span class="dim">${t}</span><span>${s}</span></div>`).join('')}</div></div>`, { marks: 'dots pip' })}
  </div>
  <div style="display:grid;gap:16px;align-content:start">
    ${fx('dossier', `<div class="box" style="padding-top:22px">${cap('PAY // CREDITS')}<div class="ledger"><div>JOB PAY // UPLINK<b>100 CR</b></div><div>BOUNTY // HEAVY<b>${TUNE.BOUNTY.heavy} CR</b></div><div>BOUNTY // FIRE<b>${TUNE.BOUNTY.fire} CR</b></div><div>AMMO SPENT<b>−4 RDS</b></div><div class="t">NET<b class="obj">${100 + TUNE.BOUNTY.heavy + TUNE.BOUNTY.fire} CR</b></div></div></div>`, { treat: 'dbl', marks: 'dotsbr' })}
    ${fx('side', `<div class="box">${cap('LANCE')}<div class="row"><b class="h3">${ringed('A', 'on')} EXOS-A</b><span class="parts"><span class="part">COR ${dots(3, 3, 'sm')}</span><span class="part">LEG ${dots(2, 2, 'sm')}</span></span></div><div class="row" style="margin-top:6px"><b class="h3">${ringed('B', 'on')} EXOS-B</b><span class="parts"><span class="part hurt">COR ${dots(2, 3, 'sm')}</span><span class="part gone">WPN ${dots(0, 1, 'sm')}</span></span></div></div>`)}
    ${fx('panel', `<div class="box qs">${cap('TESTER // THREE TAPS')}${q('Before the fight, you…', ['READ THE FIELD', 'WENT STRAIGHT IN', 'N/A'], 0)}${q('The ID tells were…', ['CLEAR', 'GUESSWORK', 'IGNORED'], 1)}${q('You left the hunt…', ['ON MY TERMS', 'FORCED', 'TOO LATE'], -1)}</div>`, { marks: 'dots' })}
    <div class="row" style="justify-content:flex-end">${btn('CONTRACT', { go: 'CONTRACT' })}${btn('NEXT HUNT', { solid: true, go: 'JOBS', sub: 'HUNT 3 / 3' })}</div>
  </div></div>`;
}

// ---------------------------------------------------------------- CONTRACT
function contract() {
  const H = [['H1', 'w', 'BOUNTY', 'SWEEP @ GRID 7', 'WON // 140 CR'], ['H2', 'w', 'UPLINK', 'FORTIFIED @ PUMPHOUSE 4', 'WON // 230 CR'], ['H3', 'l', 'RETRIEVE', 'AMBUSH @ FREIGHT YARD 9', 'LOST // B DOWN'], ['$', 'w', 'PAID', 'CONTRACT 04', '2 / 3 WINS']];
  return `<div class="scr" style="display:grid;gap:20px">
  ${fx('sweep', `<div class="data">CONTRACT 04 // 3 HUNTS // NEED 2 WINS // <span class="jp">契約</span></div><div class="h1" data-decode>CONTRACT COMPLETE</div><div class="row data"><span class="pill solid">2 / 3 WINS</span><span>EARNED 370 CR // SPENT 105 CR // ONE EXOS LOST (B, H3)</span></div>`, { cls: 'stamp won', treat: 'acc', marks: 'dotsbr ticks' })}
  ${fx('plate', `<div class="box">${cap('HUNT CHAIN')}<div class="chain">${H.map(([n, c, t, s, r]) => `<div class="n"><div class="orb ${c}">${n === '$' ? glyph('coin', 22) : `<b>${n}</b>`}</div><b>${t}</b><span class="data">${s}<br>${r}</span></div>`).join('')}</div></div>`, { treat: 'dbl', marks: 'dots pip' })}
  <div class="lance">
    ${fx('dossier', `<div class="box" style="padding-top:22px">${cap('LEDGER')}<div class="ledger"><div>H1 // BOUNTY<b>140 CR</b></div><div>H2 // UPLINK<b>230 CR</b></div><div>REFIT // REPAIRS ×2<b>−80 CR</b></div><div>REFIT // +10 RDS<b>−25 CR</b></div><div class="t">BANKED<b class="obj">265 CR</b></div></div></div>`, { marks: 'dotsbr' })}
    ${fx('panel', `<div class="box">${cap('RECORD')}<div class="kv"><span>KILLS</span><span>7 / 11</span><span>IDS</span><span>5 RIGHT // 1 WRONG // 2 BEFORE EYES</span><span>MORTAR</span><span>3 / 5 HITS // 2 KILLS</span><span>LOUDEST</span><span>SPRINT 7 (A, H3)</span></div><div class="rule"></div><div class="row">${matrix(18, 3, 21, 0.5)}<span class="data">LOG SAVED // C04</span></div></div>`, { marks: 'dots pip' })}
  </div>
  <div class="row" style="justify-content:flex-end">${btn('COPY LOG', { icon: 'link' })}${btn('NEW CONTRACT', { solid: true, go: 'TITLE' })}</div>
  </div>`;
}

// ---------------------------------------------------------------- ID DIAL (concept)
// Right-click (desktop) or hold (phone) a contact: a radial opens round it. Inner ring = field type, outer = the nine
// variants (bounty under each). Beside it a live signal readout: what the lance has actually heard/seen from this
// contact, animated, with the hovered variant's expected signature ghosted over it and a fit score. Placeholder data.
const TYPES = ['PATROL', 'TURRET', 'EMPLACEMENT'];
const VK = TYPES.flatMap(t => Object.keys(TUNE.FIELD_VARIANTS).filter(k => TUNE.FIELD_VARIANTS[k].TYPE === t));
type Ct = { id: string; x: number; y: number; truth: string; known: string[]; turns: number; snd: boolean; id_: string };
const CTS: Ct[] = [
  { id: 'C-01', x: 0.3, y: 0.42, truth: 'heavy', known: ['emit', 'moves', 'steps'], turns: 4, snd: false, id_: '' },
  { id: 'C-02', x: 0.56, y: 0.58, truth: 'fire', known: ['emit', 'moves', 'pulse'], turns: 5, snd: false, id_: '' },
  { id: 'C-03', x: 0.72, y: 0.3, truth: 'hush', known: ['shot'], turns: 2, snd: true, id_: '' },
];
const D = { layout: 'fan', fits: true, open: null as Ct | null, hover: '', raf: 0, t0: 0 };
function sig(k: string) { // a variant's expected signature, from TUNE
  const V = TUNE.FIELD_VARIANTS[k], SR = TUNE.SOUND_RANGE, snd = { ...SR, ...V.SOUND };
  return { emit: V.PULSE === 1 ? 'high' : V.PULSE ? 'low→high' : V.COMMS ? 'low' : 'none', comms: V.COMMS, pulse: V.PULSE, moves: V.TYPE === 'PATROL', steps: snd.NORMAL, shot: snd.SHOT };
}
function fit(c: Ct, k: string) {
  const o = sig(c.truth), e = sig(k), bad: string[] = [];
  for (const f of c.known) {
    if (f === 'emit' && (o.comms > 0) !== (e.comms > 0) && !(o.pulse && e.pulse)) bad.push('EMIT');
    if (f === 'moves' && o.moves !== e.moves) bad.push('MOVES');
    if (f === 'steps' && e.moves && Math.abs(o.steps - e.steps) > 1) bad.push('STEPS');
    if (f === 'steps' && !e.moves) bad.push('STEPS');
    if (f === 'pulse' && o.pulse !== e.pulse) bad.push('PULSE');
    if (f === 'shot' && Math.abs(o.shot - e.shot) > 2) bad.push('SHOT');
  }
  return { bad, score: c.known.length ? Math.round(100 * (c.known.length - bad.length) / c.known.length) : 0 };
}
function wedge(r1: number, r2: number, a0: number, a1: number) {
  const p = (r: number, a: number) => (Math.cos(a) * r).toFixed(1) + ',' + (Math.sin(a) * r).toFixed(1), big = a1 - a0 > Math.PI ? 1 : 0;
  return `M${p(r1, a0)} A${r1},${r1} 0 ${big} 1 ${p(r1, a1)} L${p(r2, a1)} A${r2},${r2} 0 ${big} 0 ${p(r2, a0)} Z`;
}
// The dial has no centre of its own: it fans out of the contact's in-game TRK mark (brackets + square), which stays
// visible in the middle. Inner arcs = field type, wedges = the nine variants. FAN labels run along the radius
// (reading outward) so a name sits inside its long thin wedge instead of widening it.
function radial(c: Ct) {
  const fan = D.layout === 'fan', A0 = fan ? -Math.PI / 2 : -Math.PI / 2 - Math.PI / 9, span = fan ? Math.PI : Math.PI * 2, n = VK.length, step = span / n, gap = fan ? 0.018 : 0.025;
  const r1 = 34, r2 = fan ? 128 : 108, rt = 27, P = (r: number, a: number) => [(Math.cos(a) * r).toFixed(1), (Math.sin(a) * r).toFixed(1)];
  let s = '';
  TYPES.forEach((t, i) => { const a = A0 + i * 3 * step + gap, b = A0 + (i + 1) * 3 * step - gap, m = (a + b) / 2, tf = VK.slice(i * 3, i * 3 + 3).some(k => !fit(c, k).bad.length);
    const [ax, ay] = P(rt, a), [bx, by] = P(rt, b), [lx, ly] = P(r2 + (fan ? 24 : 22), m);
    s += `<path class="tsec${D.fits && !tf ? ' dim' : ''}" d="M${ax},${ay} A${rt},${rt} 0 0 1 ${bx},${by}"/><text class="d" x="${lx}" y="${ly}">${t}</text>`; });
  VK.forEach((k, i) => {
    const a = A0 + i * step + gap, b = A0 + (i + 1) * step - gap, m = (a + b) / 2, F = fit(c, k), pick = c.id_ === k, deg = (m * 180 / Math.PI).toFixed(1);
    const out = D.fits && F.bad.length ? ' style="opacity:.4"' : '', bty = ((TUNE.BOUNTY as any)[k] || 0) + ' CR';
    s += `<path class="wedge${pick ? ' pick' : ''}${D.fits && F.bad.length ? ' dim' : ''}${D.fits && !F.bad.length ? ' fit' : ''}${D.hover === k ? ' hot' : ''}" data-v="${k}" d="${wedge(r1, r2, a, b)}"/>`;
    if (fan) { const [nx, ny] = P(r1 + 38, m), [bx, by] = P(r2 - 15, m);
      s += `<text class="${pick ? 'pk' : ''}" x="${nx}" y="${ny}" transform="rotate(${deg} ${nx} ${ny})"${out}>${k}</text><text class="d${pick ? ' pk' : ''}" x="${bx}" y="${by}" transform="rotate(${deg} ${bx} ${by})">${bty}</text>`;
    } else { const [x, y] = P((r1 + r2) / 2 + 4, m);
      s += `<text class="${pick ? 'pk' : ''}" x="${x}" y="${(+y - 5).toFixed(1)}"${out}>${k}</text><text class="d${pick ? ' pk' : ''}" x="${x}" y="${(+y + 7).toFixed(1)}">${bty}</text>`; }
  });
  let tk = ''; const R3 = r2 + 6; for (let i = 0; i <= (fan ? 36 : 72); i++) { const a = A0 + i / (fan ? 36 : 72) * span, l = i % (fan ? 4 : 8) ? 2 : 5; tk += `M${(Math.cos(a) * R3).toFixed(1)},${(Math.sin(a) * R3).toFixed(1)} L${(Math.cos(a) * (R3 + l)).toFixed(1)},${(Math.sin(a) * (R3 + l)).toFixed(1)} `; }
  s += `<path class="tk" d="${tk}"/>`;
  const R = r2 + 40;
  return `<svg class="rad${fan ? ' fan' : ''}" width="${R * 2}" height="${R * 2}" viewBox="${-R} ${-R} ${R * 2} ${R * 2}" style="left:${-R}px;top:${-R}px">${s}</svg>`;
}
function readout(c: Ct) {
  const k = D.hover || c.id_, F = k ? fit(c, k) : null, o = sig(c.truth);
  const tr = (key: string, name: string, val: string, id: string) => `<div class="tr" style="${c.known.includes(key) ? '' : 'opacity:.35'}"><div class="k"><b>${name}</b>${c.known.includes(key) ? val : 'NO READ'}</div><canvas id="${id}"></canvas></div>`;
  return fx('dossier', `${cap('SIG READ // ' + c.id + ' // ' + c.turns + ' TURNS', 'no')}
    ${tr('emit', 'EMIT', o.emit.toUpperCase(), 'cvEmit')}
    ${tr('steps', c.snd ? 'SHOT' : 'SOUND', c.snd ? 'SHOT ' + (c.known.includes('shot') ? '≤' + (o.shot + 1) : '?') : (o.moves ? 'STEPS ' + o.steps : 'STILL'), 'cvSnd')}
    ${tr('pulse', 'PULSE', o.pulse ? 'EVERY ' + (o.pulse === 1 ? 'ROUND' : o.pulse + ' RNDS') : 'NONE', 'cvPulse')}
    <div class="rule" style="margin:2px 0"></div>
    <div class="match"><span class="mt ${F && F.bad.length ? 'foe' : 'obj'}">${F ? F.score + '%' : '--'}</span><div><div class="h3">${k ? k.toUpperCase() + ' // ' + TUNE.FIELD_VARIANTS[k].TYPE : 'HOVER A VARIANT'}</div><div class="data">${F ? (F.bad.length ? 'RULED OUT // ' + F.bad.join(' + ') : 'FITS EVERY READING // TELL: ' + TUNE.FIELD_VARIANTS[k].TELL.toUpperCase()) : 'GHOST = WHAT IT WOULD LOOK LIKE'}</div></div>${seg(F ? F.score : 0, 100, 10)}</div>`,
    { cls: 'readout open', treat: 'acc', marks: 'pip', attrs: 'id="rdo"' });
}
function idDial() {
  return `<div class="scr idc"><div class="bar">${fx('bar', `<div class="row" style="padding:10px 16px 8px 46px;gap:14px"><b class="h3" data-decode>FIELD ID // CONCEPT</b><span class="data">RIGHT-CLICK OR HOLD A CONTACT // NO CARD SCREEN // <span class="jp">識別</span></span></div>`, { treat: 'acc', marks: 'hatch4' })}
    <div class="segsel" data-act="layout"><button class="${D.layout === 'ring' ? 'on' : ''}" data-l="ring">RING</button><button class="${D.layout === 'fan' ? 'on' : ''}" data-l="fan">FAN</button></div>
    <span class="toggle${D.fits ? ' on' : ''}" data-act="fits"><span class="tr"></span>DIM WHAT'S RULED OUT</span></div>
  <div class="stage" id="stage">${CTS.map((c, i) => `<div class="ct" data-ct="${i}" style="left:${c.x * 100}%;top:${c.y * 100}%"><svg width="30" height="30"><circle class="ring" cx="15" cy="15" r="9" fill="none" stroke="currentColor"/><path d="M7,3 L3,3 L3,7 M23,3 L27,3 L27,7 M27,23 L27,27 L23,27 M3,23 L3,27 L7,27" fill="none" stroke="currentColor"/>${c.snd ? '<rect x="12" y="12" width="6" height="6" fill="none" stroke="currentColor"/>' : '<rect x="12" y="12" width="6" height="6" fill="currentColor"/>'}</svg><div class="lbl">${c.id} // ${c.id_ ? c.id_.toUpperCase() + '?' : c.snd ? 'SOUND' : 'UNKNOWN'}<br><span class="dim">TRK // ±${(1.2 + i * 0.7).toFixed(1)}T</span></div></div>`).join('')}
  <div class="dialw" id="dialw"></div><div id="rdoW"></div><div class="hint">RIGHT-CLICK / HOLD = ID DIAL // HOVER = GHOST SIGNATURE // CLICK = CALL IT // ESC = CLOSE</div></div></div>`;
}
function openDial(i: number) {
  const st = document.getElementById('stage'); if (!st) return;
  const c = CTS[i], w = st.clientWidth, h = st.clientHeight, x = c.x * w, y = c.y * h, dw = $('dialw');
  D.open = c; D.hover = ''; D.t0 = performance.now(); markOpen(i);
  dw.style.left = x + 'px'; dw.style.top = y + 'px'; dw.innerHTML = radial(c); dw.classList.remove('open'); void dw.offsetWidth; dw.classList.add('open');
  placeReadout(x, y, w, h);
  cancelAnimationFrame(D.raf); D.raf = requestAnimationFrame(drawScopes);
}
function placeReadout(x: number, y: number, w: number, h: number) {
  const c = D.open!, rw = $('rdoW'); rw.innerHTML = readout(c); frameAll(rw);
  const narrow = w < 700, el = $('rdo'), R = ((D.layout === 'fan' ? 128 : 108) + 46) * (narrow ? 0.85 : 1), ew = el.offsetWidth, eh = el.offsetHeight;
  let lx = x + R, ly = Math.max(0, Math.min(h - eh, y - eh / 2));
  if (lx + ew > w) lx = x - R - ew;
  if (lx < 0 || narrow) { lx = Math.max(0, Math.min(w - ew, x - ew / 2)); ly = y - R - eh >= 0 ? y - R - eh : Math.min(h - eh, y + R); } // phone: docked above the dial
  el.style.left = lx + 'px'; el.style.top = ly + 'px';
}
function markOpen(i: number) { document.querySelectorAll<HTMLElement>('.idc .ct').forEach(e => e.classList.toggle('open', +e.dataset.ct! === i)); }
function closeDial() { markOpen(-1); D.open = null; cancelAnimationFrame(D.raf); const d = document.getElementById('dialw'); if (d) d.innerHTML = ''; const r = document.getElementById('rdoW'); if (r) r.innerHTML = ''; }
function refreshDial() { if (!D.open) return; const st = $('stage'), c = D.open; $('dialw').innerHTML = radial(c); placeReadout(c.x * st.clientWidth, c.y * st.clientHeight, st.clientWidth, st.clientHeight); }
// the scopes: observed trace (ink) scrolling, the hovered variant's expected trace ghosted (dashed, objective colour)
function drawScopes(now: number) {
  const c = D.open; if (!c || cur !== 'ID DIAL') return;
  const t = (now - D.t0) / 1000, reveal = Math.min(1, t / 0.8), ROUND = 1.4, o = sig(c.truth), g = D.hover ? sig(D.hover) : null;
  const sc = (id: string, f: (cx: CanvasRenderingContext2D, w: number, h: number) => void) => {
    const cv = document.getElementById(id) as HTMLCanvasElement; if (!cv) return; const r = Math.min(2, devicePixelRatio || 1), w = cv.clientWidth, h = cv.clientHeight;
    if (cv.width !== w * r) { cv.width = w * r; cv.height = h * r; } const x = cv.getContext('2d')!; x.setTransform(r, 0, 0, r, 0, 0); x.clearRect(0, 0, w, h);
    x.strokeStyle = look.dim; x.globalAlpha = 0.35; x.setLineDash([1, 3]); x.beginPath(); for (let k = 1; k < 4; k++) { x.moveTo(0, h * k / 4); x.lineTo(w, h * k / 4); } x.stroke(); x.setLineDash([]); x.globalAlpha = 1;
    x.save(); x.beginPath(); x.rect(0, 0, w * reveal, h); x.clip(); f(x, w, h); x.restore();
    x.fillStyle = look.ink; x.fillRect(w * reveal - 1, 0, reveal < 1 ? 1 : 0, h);
  };
  const emitAt = (s: any, tt: number, noise: number) => { const ph = (tt / ROUND) % (s.pulse || 1e9), spike = s.pulse ? Math.exp(-ph * 2.2) * 40 : 0; return (s.comms ? 10 : 0) + spike + (noise ? Math.sin(tt * 17) * 1.5 + Math.sin(tt * 41) * 1 : 0); };
  const trace = (x: CanvasRenderingContext2D, w: number, h: number, fn: (tt: number) => number, col: string, dash: number[]) => { x.strokeStyle = col; x.lineWidth = 1.2; x.setLineDash(dash); x.beginPath(); for (let px = 0; px <= w; px += 2) { const v = fn(t - (w - px) / 60); const y = h - 4 - v / 52 * (h - 8); px ? x.lineTo(px, y) : x.moveTo(px, y); } x.stroke(); x.setLineDash([]); };
  sc('cvEmit', (x, w, h) => { if (g) trace(x, w, h, tt => emitAt(g, tt + 0.3, 0), look.objective, [4, 3]); if (c.known.includes('emit')) trace(x, w, h, tt => emitAt(o, tt, 1), look.ink, []); });
  sc('cvSnd', (x, w, h) => {
    const ev = (s: any, tt0: number, col: string, ghost: boolean) => { const per = s.moves ? 0.55 : 2.6, val = s.moves ? s.steps : s.shot; x.strokeStyle = col; x.fillStyle = col; x.setLineDash(ghost ? [2, 2] : []);
      for (let k = Math.floor((tt0 - w / 60) / per); k <= tt0 / per; k++) { const px = w - (tt0 - k * per) * 60, v = val + (ghost ? 0 : ((k * 7919) % 3) - 1), y = h - 3 - v / 14 * (h - 6); x.beginPath(); x.moveTo(px, h - 3); x.lineTo(px, y); x.stroke(); if (!ghost) x.fillRect(px - 1.5, y - 1.5, 3, 3); } x.setLineDash([]); };
    if (g) { x.globalAlpha = 0.8; ev(g, t + 0.2, look.objective, true); x.globalAlpha = 1; }
    if (c.known.includes('steps') || c.known.includes('shot')) ev(o, t, c.snd ? look.hostile : look.ink, false);
  });
  sc('cvPulse', (x, w, h) => {
    const n = Math.floor(w / 18), now_ = Math.floor(t / ROUND) + c.turns * 3;
    for (let k = 0; k < n; k++) { const r = now_ - (n - 1 - k), cx = 9 + k * 18; x.strokeStyle = look.dim; x.beginPath(); x.arc(cx, h / 2, 4, 0, 6.283); x.stroke();
      if (c.known.includes('pulse') && o.pulse && r >= 0 && r % o.pulse === 0) { x.fillStyle = look.ink; x.beginPath(); x.arc(cx, h / 2, 4, 0, 6.283); x.fill(); }
      if (g && g.pulse && r % g.pulse === 0) { x.strokeStyle = look.objective; x.beginPath(); x.arc(cx, h / 2, 7, 0, 6.283); x.stroke(); }
      x.fillStyle = look.dim; x.font = '7px ' + look.font; if (k % 3 === 0) x.fillText('R' + pad(Math.max(0, r)), cx - 7, h - 2); }
  });
  D.raf = requestAnimationFrame(drawScopes);
}
function wireDial(root: HTMLElement) {
  let hold = 0;
  root.addEventListener('contextmenu', e => { const ct = (e.target as HTMLElement).closest('.ct') as HTMLElement; if (ct) { e.preventDefault(); openDial(+ct.dataset.ct!); } });
  root.addEventListener('pointerdown', e => { const ct = (e.target as HTMLElement).closest('.ct') as HTMLElement; if (ct && e.pointerType !== 'mouse') hold = window.setTimeout(() => openDial(+ct.dataset.ct!), 420); });
  const stop = () => clearTimeout(hold); root.addEventListener('pointerup', stop); root.addEventListener('pointercancel', stop);
  root.addEventListener('pointerover', e => { const w = (e.target as Element).closest?.('.wedge') as SVGElement; if (w && D.open && D.hover !== w.dataset.v) { D.hover = w.dataset.v!; refreshDial(); } });
  root.addEventListener('click', e => {
    const w = (e.target as Element).closest('.wedge') as SVGElement;
    if (w && D.open) { const c = D.open; c.id_ = c.id_ === w.dataset.v ? '' : w.dataset.v!; D.hover = ''; refreshDial(); setTimeout(() => { closeDial(); render(false); }, 380); return; }
    if ((e.target as Element).closest('.rad, #rdo')) return;
    if ((e.target as Element).closest('.stage') && !(e.target as Element).closest('.ct')) closeDial();
  });
}

// ---------------------------------------------------------------- shell: chrome, nav, events
const RENDER: Record<string, () => string> = { KIT: kit, TITLE: title, LOADOUT: loadout, JOBS: jobs, 'ID DIAL': idDial, DEBRIEF: debrief, CONTRACT: contract };
function render(anim = true) {
  const el = $('uiScreen'); el.innerHTML = RENDER[cur]();
  frameAll(el); if (anim) { playIn(el); el.scrollTop = 0; }
  $('uiCrumb').textContent = 'SIGNAL LANCE // ' + cur; $('uiJp').textContent = JP[cur] || '';
  if (cur === 'TITLE' && anim) bootLog();
  if (cur === 'ID DIAL' && anim) setTimeout(() => { if (cur === 'ID DIAL' && !D.open) openDial(1); }, UIK.drawOn ? 700 : 50);
  for (const b of document.querySelectorAll<HTMLElement>('#lScreens button')) b.classList.toggle('on', b.dataset.s === cur);
}
export function showScreen(name: string) { closeDial(); cur = name; render(true); }
export function currentScreen() { return cur; }
export function initUi(leave: () => void) {
  onLeave = leave;
  const tick = 'CONTRACT BOARD // 2 JOBS POSTED ◆ SECTOR 9 GRID BLACKOUT 02:00–04:00 ◆ ACID RAIN 80% ◆ CURFEW 01:00 KESSLER SPRAWL ◆ LANCE INSURANCE PREMIUM +4% ◆ オンライン ◆ FREIGHT YARD 9 // CARGO MANIFEST SEALED ◆ PUMPHOUSE 4 // UPLINK BEACON LIVE ◆ ';
  $('ui').innerHTML = `<div class="scrim"></div><i class="reg a"></i><i class="reg b"></i><i class="reg c"></i><i class="reg d"></i>
  <div id="uiTop"><span class="crumb" id="uiCrumb"></span><span class="jp dim" id="uiJp"></span><span class="sp"></span><span class="meta data" id="uiClock"></span>${matrix(6, 2, 5, 0.5)}</div>
  <div id="uiScreen"></div><div id="uiTicker"><div>${tick.repeat(4)}</div></div>`;
  setInterval(() => { const d = new Date(), c = document.getElementById('uiClock'); if (c) c.textContent = 'T ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds()) + ' // NET LOSS 0.3% // LAT 15MS'; }, 1000);
  const sc = $('uiScreen');
  sc.addEventListener('click', e => {
    const t = e.target as HTMLElement, go = t.closest('[data-go]') as HTMLElement;
    if (go) { showScreen(go.dataset.go!); return; }
    const a = t.closest('[data-act]') as HTMLElement; if (!a) return; const act = a.dataset.act!;
    if (act === 'tog') a.classList.toggle('on');
    if (act === 'pack') { S.pack = !S.pack; a.classList.toggle('on', S.pack); }
    if (act === 'seg' || act === 'hunts' || act === 'layout') { const b = t.closest('button'); if (!b) return; for (const o of a.querySelectorAll('button')) o.classList.toggle('on', o === b);
      if (act === 'hunts') { S.hunts = +b.dataset.n!; render(false); }
      if (act === 'layout') { D.layout = b.dataset.l!; if (D.open) { const i = CTS.indexOf(D.open); openDial(i); } } }
    if (act === 'fits') { D.fits = !D.fits; a.classList.toggle('on', D.fits); refreshDial(); }
    if (act.startsWith('mech')) { S.mech = +act.slice(4); render(false); }
    if (act.startsWith('inc:') || act.startsWith('dec:')) { const k = act.slice(4), m = MODS.find(x => x.k === k)!, l = S.loads[S.mech], d = act[0] === 'i' ? 1 : -1, n = l[k] + d;
      if (n >= 0 && n <= m.max && (d < 0 || usedSlots(l) + m.slots <= TUNE.SLOTS)) { l[k] = n; render(false); } }
    if (act.startsWith('job')) { S.job = +act.slice(3); render(false); }
    if (act === 'take') onLeave();
  });
  wireDial(sc);
  addEventListener('keydown', e => { if (e.key === 'Escape') closeDial(); });
  addEventListener('resize', () => { if (D.open) refreshDial(); });
  applyUiCss(); render(true);
}
