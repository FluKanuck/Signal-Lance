// Round 14 part 1: the CARD (the 9 variants, one line per trait, the tell in bold) and the ID picker for the
// selected contact. View only: the picker sends cmdId; the sim does the rest.
import { TUNE } from '../tune.ts';
import { G } from '../sim/state.ts';
import { cmdId, traitLines, revealed, matchVariants } from '../sim/ids.ts';
import { $, syncButtons, refreshHud } from './hud.ts';

const TYPES = ['PATROL', 'TURRET', 'EMPLACEMENT'];
const esc = (t: string) => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const byType = (t: string) => Object.keys(TUNE.FIELD_VARIANTS).filter(k => TUNE.FIELD_VARIANTS[k].TYPE === t);
// grid order: row = variant slot, column = type (so it reads as three columns)
function grid(cell: (k: string) => string) {
  let h = TYPES.map(t => '<h4>' + t + '</h4>').join('');
  const rows = Math.max(...TYPES.map(t => byType(t).length)); // R18: a type may have 4 (the sniper turret)
  for (let i = 0; i < rows; i++) for (const t of TYPES) { const k = byType(t)[i]; h += k ? cell(k) : '<div></div>'; }
  return h;
}
let back = '';
export function showCard(from = '') {
  back = from;
  $('cardGrid').innerHTML = grid(k => { const V = TUNE.FIELD_VARIANTS[k];
    return '<div class="cv"><b class="n">' + esc(k) + '</b> <span class="t">' + (TUNE.BOUNTY[k] || 0) + ' cr</span><br>' + V.TRAITS.map(esc).join('<br>') + '<br><span class="t">' + esc(V.TELL) + '</span><br><span class="f">' + esc(V.FIGHT) + '</span></div>'; });
  $('card').hidden = false; $('card').scrollTop = 0;
}
function closeCard() { $('card').hidden = true; if (back === 'idp') showPicker(); if (back === 'scan') $('scan').hidden = false; } // R19: back to the scan screen

// ID picker for the selected contact (only before eyes: a seen contact already shows its variant)
export function idTarget() { const c = G.sel; return G.mode === 'hunt' && c && c.on && !revealed(c.id) ? c : null; }
export function showPicker() {
  const c = idTarget(); if (!c) return;
  const L = traitLines(G.obs[c.id]), cur = G.ids[c.id] ? G.ids[c.id].v : '';
  $('idHead').innerHTML = '<b>ID this contact</b>' + (cur ? ' (now: ' + esc(cur) + '?)' : ' (now: UNKNOWN)') + ' · seen so far: ' + (L.length ? esc(L.join(' · ')) : 'nothing yet');
  const fit = TUNE.ID_SHOW_FITS && G.obs[c.id] ? matchVariants(G.obs[c.id]) : null; // R14 debrief 1: grey out what your reads rule out (still tappable)
  if (fit) $('idHead').innerHTML += ' · <b>' + fit.length + ' fit</b>';
  $('idGrid').innerHTML = grid(k => '<button class="idv' + (k === cur ? ' on' : '') + (fit && !fit.includes(k) ? ' out' : '') + '" data-v="' + k + '"><b>' + esc(k) + '</b><small>' + esc(TUNE.FIELD_VARIANTS[k].TELL) + '</small></button>');
  $('idp').hidden = false; $('idp').scrollTop = 0;
}
function pick(v: string) { const c = idTarget(); if (c) cmdId(c.id, v); $('idp').hidden = true; syncButtons(); refreshHud(); }

$('idGrid').addEventListener('click', ev => { const b = (ev.target as any).closest('.idv'); if (b) pick(b.dataset.v); });
$('bIdClear').addEventListener('click', () => pick(''));
$('bIdX').addEventListener('click', () => { $('idp').hidden = true; });
$('bIdCard').addEventListener('click', () => { $('idp').hidden = true; showCard('idp'); });
$('bCardX').addEventListener('click', closeCard);
$('bTBCard').addEventListener('click', () => showCard('tb'));
for (const [id, fn] of [['bCard', () => showCard()], ['bId', showPicker]] as const)
  $(id).addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); fn(); });
