// R25 "Live toy": view parts only the toy page uses. The space bar is PLAY / PAUSE, and a tap on a letter in the ORDER
// strip gives that ExoS the orders.
import { G } from '../sim/state.ts';
import { togglePause, liveSelect } from '../sim/live.ts';
import { $, syncButtons } from './hud.ts';

window.addEventListener('keydown', e => {
  if (e.code !== 'Space' || G.mode !== 'hunt' || (e.target as any)?.closest?.('input, textarea')) return;
  e.preventDefault(); togglePause(); syncButtons();
});
$('init').addEventListener('pointerup', (e: any) => {
  const el = e.target.closest && e.target.closest('[data-m]'); if (!el) return;
  const m = G.lance.find(x => x.id === el.dataset.m); if (m) { liveSelect(m); syncButtons(); }
});
