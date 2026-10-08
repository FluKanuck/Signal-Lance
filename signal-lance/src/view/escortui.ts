// R24 fix list 12 + 13 (QA C14, C21): the Escort's route and its transport, said in words as well as on the map.
//   12: a ROUTE bar: one button per way at every fork ahead. The set way is lit. A tap sets it (again: clears it) and says so.
//   13: a warning when the transport takes a hit, and a stronger one when it is down to half its hits or less.
// View only: the bar sends the same command as the map's route buttons (cmdLeg).
import { G } from '../sim/state.ts';
import { isType } from '../sim/mission.ts';
import { forksAhead, allyHolding } from '../sim/escort.ts';
import { anchors } from '../sim/world.ts';
import { cmdLeg, playerFree } from '../sim/turns.ts';
import { $ } from './hud.ts';

let sig = '', lastHits = -1, lastAlly: any = null, warnT = 0;
const bar = () => $('routeBar'), warn = () => $('allyWarn');

function say(text: string, bad: boolean, secs = 3) {
  const w = warn(); if (!w) return;
  w.textContent = text; w.classList.toggle('bad', bad); w.hidden = false; warnT = secs;
}

function render() {
  const b = bar(); if (!b) return;
  const on = G.mode === 'hunt' && isType('ESCORT') && !!G.ally && !G.ally.dead && !G.ally.out;
  const forks = on ? forksAhead().filter(f => f.legs.length) : []; // a fork where routes only join has nothing to pick
  const N = anchors().waypoints, free = playerFree();
  const s = JSON.stringify([on, free, allyHolding(), forks.map(f => [f.node, f.set, f.legs.map(l => l.i)])]);
  if (s === sig) return; sig = s;
  if (!on || !forks.length) { b.hidden = true; b.innerHTML = ''; return; }
  b.innerHTML = forks.map(f => {
    const name = (N[f.node]?.name || f.node).replace('fork at ', '').toUpperCase(), wait = allyHolding() && G.ally.node === f.node;
    return '<span class="rf' + (wait ? ' wait' : '') + '"><b>' + (wait ? 'WAITING AT ' : 'ROUTE AT ') + name + ':</b> ' +
      f.legs.map(l => '<button class="rleg' + (f.set === l.i ? ' on' : '') + '" data-l="' + l.i + '"' + (free ? '' : ' disabled') + '>' + (f.set === l.i ? '✓ ' : '') + (anchors().legs[l.i].name || 'GO') + '</button>').join('') + '</span>';
  }).join('');
  b.hidden = false;
}

export function escortTick(dt: number) {
  render();
  // 13: the transport's hits, watched from frame to frame (a new hunt resets the watch)
  const a = G.mode === 'hunt' && isType('ESCORT') ? G.ally : null;
  if (a !== lastAlly) { lastAlly = a; lastHits = a ? a.hits : -1; }
  if (a && a.hits < lastHits) {
    const left = Math.max(0, a.hits), half = left <= a.maxHits / 2;
    if (left <= 0) say('TRANSPORT DESTROYED. The hunt fails.', true, 4);
    else if (half) say('TRANSPORT HIT: ' + left + ' of ' + a.maxHits + ' hits left. At 0 it is destroyed and the hunt fails. Get it out of the line of fire.', true, 5);
    else say('TRANSPORT HIT: ' + left + ' of ' + a.maxHits + ' hits left.', false, 3);
    lastHits = a.hits;
  }
  if (warnT > 0 && (warnT -= dt) <= 0) { const w = warn(); if (w) w.hidden = true; }
}

// one listener for the whole bar (buttons act on release, like the rest of the hunt controls)
document.getElementById('routeBar')?.addEventListener('pointerup', e => {
  const t = (e.target as HTMLElement).closest('.rleg') as HTMLElement | null; if (!t || (t as HTMLButtonElement).disabled) return;
  e.preventDefault(); e.stopPropagation();
  const i = +t.dataset.l, f = forksAhead().find(f => f.legs.some(l => l.i === i)), was = f ? f.set : -1;
  cmdLeg(i);
  const now = forksAhead().find(x => x.node === f?.node), name = anchors().legs[i].name || 'GO';
  const fork = (anchors().waypoints[f?.node]?.name || '').replace('fork at ', '').toUpperCase();
  if (!now) say('The transport goes ' + name + '.', false); // it was waiting there: it sets off
  else say(was === i ? 'Route at ' + fork + ' cleared. It will wait there.' : 'Route at ' + fork + ' set: ' + name + '.', false);
  sig = ''; render();
});
document.getElementById('routeBar')?.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); });
