// View-only state: camera, zoom, debug overlay, armed tap modes, hit flash. Never read by sim/.
import { TUNE } from '../tune.ts';
export const V = {
  zoomI: 0, camX: 0, camY: 0, follow: true, // camera follows the player until you drag; CTR re-attaches it
  dbg: false,
  faceArm: false, ghostArm: false, mortarArm: false, mortarWhy: '',          // armed tap modes (tap own mech → face; GHOST → place)
  hitFlash: 0,                              // red screen border after taking a hit
  drawPt: null as null | { sx: number; sy: number }, // R17: the finger while drawing a path (the AP cost shows next to it)
  wpWhy: '',                                // R17: why the last waypoint wasn't set (MAX)
  wpMenu: null as null | number,            // r17-s2: the LOOK / ✕ menu is open for the path point this far along (tiles)
  lookArm: null as null | number,           // r17-s2: LOOK chosen: the next tap (or drag) aims the point this far along
  rwrSel: '' as string,                     // R19 cp3: the RWR warning tapped (its emitter id)
  uiS: 1,                                   // R18 fix (Jamie, iPad split screen): UI scale for this window (1 = the phone the game was laid out on)
};
// R18 fix: the map's zoom (screen px per world unit) scales with the window too, so a big screen shows the same district bigger
export const camZ = () => TUNE.ZOOMS[V.zoomI] * V.uiS;
