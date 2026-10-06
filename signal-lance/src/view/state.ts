// View-only state: camera, zoom, debug overlay, armed tap modes, hit flash. Never read by sim/.
export const V = {
  zoomI: 0, camX: 0, camY: 0, follow: true, // camera follows the player until you drag; CTR re-attaches it
  dbg: false,
  faceArm: false, ghostArm: false, mortarArm: false, mortarWhy: '',          // armed tap modes (tap own mech → face; GHOST → place)
  hitFlash: 0,                              // red screen border after taking a hit
  drawPt: null as null | { sx: number; sy: number }, // R17: the finger while drawing a path (the AP cost shows next to it)
  wpWhy: '',                                // R17: why the last waypoint wasn't set (MAX)
};
