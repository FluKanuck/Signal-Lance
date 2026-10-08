// View-only state: camera, zoom, debug overlay, armed tap modes, hit flash. Never read by sim/.
import { TUNE } from '../tune.ts';
import { newLk } from '../sim/warn.ts';
import type { LkState } from '../sim/warn.ts';
export const V = {
  zoomI: 0, pinch: 1, camX: 0, camY: 0, follow: true, // camera follows the player until you drag; CTR re-attaches it
  dbg: false,
  faceArm: false, ghostArm: false, mortarArm: false, mortarWhy: '',          // armed tap modes (tap own mech → face; GHOST → place)
  hitFlash: 0,                              // red screen border after taking a hit
  stroke: null as null | { x: number; y: number }[], // R25 cp D: the raw finger stroke while drawing (toy page), drawn under the finger at once
  drawPt: null as null | { sx: number; sy: number }, // R17: the finger while drawing a path (the AP cost shows next to it)
  wpWhy: '',                                // R17: why the last waypoint wasn't set (MAX)
  wpMenu: null as null | number,            // r17-s2: the LOOK / ✕ menu is open for the path point this far along (tiles)
  lookArm: null as null | number,           // r17-s2: LOOK chosen: the next tap (or drag) aims the point this far along
  rwrSel: '' as string,                     // R19 cp3: the RWR warning tapped (its emitter id)
  aarHl: null as null | { i: number; hl: any; t0: number; turn: number }, // R22: the after-action moment tapped (pulsed on the map)
  lk: newLk() as LkState, lkHunt: null as any,  // R24 A5 (C15): the LAST SEEN marks (sim/warn.ts steps them) and the hunt they belong to
  hudOpen: false, hudOver: false,          // R24 B6: the compact HUD's full block is open; the full block overran the screen (go compact)
  safe: null as null | { l: number; t: number; r: number; b: number }, // R24 B7: the map area no overlay covers (screen px)
  uiS: 1,                                   // R18 fix (Jamie, iPad split screen): UI scale for this window (1 = the phone the game was laid out on)
};
// R18 fix: the map's zoom (screen px per world unit) scales with the window too, so a big screen shows the same district bigger
export const camZ = () => TUNE.ZOOMS[V.zoomI] * V.uiS * V.pinch; // R25 fix 4: × the pinch (toy page; always 1 on the main game)
