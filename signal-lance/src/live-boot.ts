// R25 "Live toy": the toy page's first import. It runs before any other module, so every module reads the live settings
// when it loads. Storage: every key gets a "live:" prefix, so the toy's company, saves and log never touch the main game's.
import { TUNE } from './tune.ts';

TUNE.TIME_MODE = 'live';
TUNE.FREE_POS = true; // R25 cp C: free positions
document.body.classList.add('live');
try {
  const S = Storage.prototype, P = 'live:';
  const get = S.getItem, set = S.setItem, rem = S.removeItem;
  S.getItem = function (k: string) { return get.call(this, P + k); };
  S.setItem = function (k: string, v: string) { return set.call(this, P + k, v); };
  S.removeItem = function (k: string) { return rem.call(this, P + k); };
} catch (_) { /* storage blocked: the game falls back to memory */ }
