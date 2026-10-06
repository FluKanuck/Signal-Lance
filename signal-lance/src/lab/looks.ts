// Visual lab: each LOOK is one complete set of style tokens. The battlefield (GL), the map marks (2D) and the HUD (CSS)
// all read from the active look, so switching looks never touches drawing code. The winning look's tokens are what
// a real presentation branch (or an engine port) takes away. Every number, colour and font here is a live knob in the
// lab's TUNE panel (KNOBS below sets the slider ranges); COPY there gives back JSON in this shape to paste into this file.

export type Look = {
  name: string; note: string;
  font: string;                 // body type: readouts, labels (CSS font-family)
  display: string;              // display type: big labels, headers
  bg: string;                   // clear colour behind everything
  ink: string;                  // the one UI colour (hairlines, text)
  dim: string;                  // ink at rest / secondary text
  // battlefield
  fog: string;                  // tint of revealed-but-unseen dots (drained to grey)
  dotSize: number;              // px at zoom 1
  depth: number;                // building height (0 = flat top-down)
  sweep: number;                // lidar sweep pulse brightness (0 = off)
  trueMix: number;              // live scan: 1 = pure true colour, 0 = the look's ink only
  greyDim: number;              // revealed-but-unseen: brightness of the drained grey
  block: string; blockEdge: string; // unscanned grey massing blocks + their edge line
  blockFade: number;            // how much a grey block dissolves once scanned (0 = never: the scan lands on the block)
  heightTint: number;           // how much the height ramp (survey-lidar style) overrides true colour
  rampLo: string; rampMid: string; rampHi: string; // height ramp: street level → mid → rooftops
  scanAmt: number;              // ground scan rings around each ExoS (0 = off)
  scanNear: string; scanFar: string; // ring colour near → far
  scanSpin: number;             // brightness of the flash where the spinning head is laying new dots
  scanDead: number;             // dead zone under the sensor, radius in tiles (0.5 = one tile across)
  scanGap: number;              // ring spacing at the centre (world units; a tile is 32)
  scanGrow: number;             // extra spacing added per ring outward (rings open up with range)
  scanFade: number;             // fade curve to max visual range (1 = linear, higher = fades sooner)
  scanRate: number;             // head spin, revolutions per second
  scanPersist: number;          // how lit a dot stays after the head has passed (0 = only the fresh sweep shows)
  scanDrop: number;             // share of dots missing on each pass (re-rolled every revolution)
  scanHeight: number;           // lidar sensor height on the ExoS (world units; a tile is 32): sets where wall lines fall
  scanAz: number;               // horizontal (azimuth) step in degrees: column spacing on walls and dot spacing on far rings
  scanLife: number;             // seconds a ground scan dot lasts where it landed before it has faded out
  scanTrue: number;             // how much the ground's true colour (paint, puddles, lamp light) shows in the scan dots
  scanCone: number;             // 1 = rings only inside the ExoS's eyes cone (the sim's sight rule), 0 = full 360°
  grid: number;                 // reference grid on the ground (0 = off)
  neon: number;                 // glow multiplier for neon, windows, lamps
  clutter: number;              // ground clutter opacity (debris, litter, puddles)
  // information colours (colour only for information)
  hostile: string; lost: string; sound: string; bearing: string; objective: string; friend: string; quiet: string; noise: string;
  // post
  bloom: number; grain: number; scan: number; vignette: number; aberr: number; haze: string; hazeAmt: number;
};

// slider ranges for the TUNE panel: [min, max, step]
export const KNOBS: Record<string, [number, number, number]> = {
  dotSize: [0.5, 5, 0.1], blockFade: [0, 1, 0.05], depth: [0, 1.5, 0.05], sweep: [0, 2, 0.05], trueMix: [0, 1, 0.05], greyDim: [0, 1.5, 0.05],
  heightTint: [0, 1, 0.05], scanAmt: [0, 1.5, 0.05], scanSpin: [0, 1, 0.05],
  scanDead: [0, 3, 0.05], scanGap: [1, 12, 0.1], scanGrow: [0, 1.5, 0.01], scanFade: [0.3, 4, 0.05], scanRate: [0.05, 3, 0.05], scanPersist: [0, 1, 0.05], scanDrop: [0, 0.9, 0.05], scanCone: [0, 1, 1], scanLife: [0.5, 30, 0.5], scanTrue: [0, 1, 0.05], scanHeight: [4, 80, 1], scanAz: [0.2, 6, 0.1], grid: [0, 1, 0.02], neon: [0, 4, 0.1], clutter: [0, 1.5, 0.05],
  bloom: [0, 3, 0.05], grain: [0, 0.3, 0.005], scan: [0, 1, 0.05], vignette: [0, 1.5, 0.05], aberr: [0, 4, 0.1], hazeAmt: [0, 1.5, 0.05],
};

// Type pairs (all Google Fonts). Deliberately not the faces that read as "AI-made UI" (Inter, Space Grotesk,
// JetBrains Mono, IBM Plex Mono, DM Mono, Geist). Each has a reason to be here.
export const FONTS: { name: string; font: string; display: string; why: string }[] = [
  { name: 'B612', font: '"B612 Mono", monospace', display: '"B612", sans-serif', why: 'Airbus cockpit type: built to be read under stress' },
  { name: 'FRAGMENT', font: '"Fragment Mono", monospace', display: '"Michroma", sans-serif', why: 'Helvetica-mono (closest to Micrographics) + wide Microgramma-style display' },
  { name: 'DOTO', font: '"Azeret Mono", monospace', display: '"Doto", monospace', why: 'Dot-matrix display numerals that match the lidar dots' },
  { name: 'CHAKRA', font: '"Chakra Petch", sans-serif', display: '"Chakra Petch", sans-serif', why: 'Chamfered letterforms, same cut as the HUD frames' },
  { name: 'MARTIAN', font: '"Martian Mono", monospace', display: '"Martian Mono", monospace', why: 'Wide, engineered, distinctive' },
  { name: 'CHIVO', font: '"Chivo Mono", monospace', display: '"Saira Condensed", sans-serif', why: 'Grotesque mono + condensed signage display (most Blade Runner)' },
  { name: 'SHARE', font: '"Share Tech Mono", monospace', display: '"Share Tech Mono", monospace', why: 'Square terminal mono (first lab pass, PHOSPHOR)' },
];

export const LOOKS: Look[] = [
  {
    // Jamie's tuned values (2026-10-06, pasted from the lab's COPY SETTINGS)
    name: 'MICRO', note: 'Micrographics lavender: hairlines, grain, low bloom',
    font: FONTS[3].font, display: FONTS[3].display, // Chakra Petch
    bg: '#0b0a10', ink: '#b9b2ff', dim: '#5d5880',
    fog: '#1d1b2a', dotSize: 0.8, depth: 1.1, sweep: 0.3, trueMix: 0.95, greyDim: 0.2, block: '#24222c', blockEdge: '#383547', blockFade: 0,
    heightTint: 0.3, rampLo: '#2a6cff', rampMid: '#2fe0b0', rampHi: '#ffd23f', scanAmt: 1.3, scanNear: '#b9b2ff', scanFar: '#4a6cff', scanSpin: 0.1,
    scanDead: 0.55, scanGap: 2.7, scanGrow: 0.22, scanFade: 1.45, scanRate: 0.9, scanPersist: 0.25, scanDrop: 0.45, scanCone: 1, scanLife: 18.5, scanTrue: 0.75, scanHeight: 20, scanAz: 0.2,
    grid: 0, neon: 1.6, clutter: 1,
    hostile: '#ff5d73', lost: '#ff9f6b', sound: '#e8e4ff', bearing: '#7fe0ff', objective: '#ffd27a', friend: '#4bdd68', quiet: '#7aa2ff', noise: '#ffc861',
    bloom: 0.35, grain: 0.055, scan: 0.2, vignette: 0.3, aberr: 1.3, haze: '#1a1530', hazeAmt: 0.15,
  },
  {
    name: 'PHOSPHOR', note: 'HUD Vectors green: CRT scanlines, stronger glow',
    font: FONTS[3].font, display: FONTS[3].display,
    bg: '#020805', ink: '#1cf59a', dim: '#0f6b47',
    fog: '#06231a', dotSize: 1.8, depth: 0.45, sweep: 0.8, trueMix: 0.6, greyDim: 0.55, block: '#16201c', blockEdge: '#22382e', blockFade: 0,
    heightTint: 0.2, rampLo: '#0d8a57', rampMid: '#1cf59a', rampHi: '#e8ff7a', scanAmt: 0.8, scanNear: '#1cf59a', scanFar: '#0a6b44', scanSpin: 0.8,
    scanDead: 0.5, scanGap: 3, scanGrow: 0.22, scanFade: 1.2, scanRate: 0.6, scanPersist: 0.35, scanDrop: 0.2, scanCone: 1, scanLife: 8, scanTrue: 0.5, scanHeight: 24, scanAz: 1.5,
    grid: 0.15, neon: 1.4, clutter: 0.7,
    hostile: '#ff4d3d', lost: '#ffa040', sound: '#d9fff0', bearing: '#7af7ff', objective: '#f5e663', friend: '#ffffff', quiet: '#5fb7ff', noise: '#f5e663',
    bloom: 0.8, grain: 0.04, scan: 0.35, vignette: 0.6, aberr: 0.4, haze: '#03140c', hazeAmt: 0.2,
  },
  {
    name: '2049', note: 'Blade Runner amber haze: warm dust, heavy bloom, cool info',
    font: FONTS[5].font, display: FONTS[5].display,
    bg: '#0c0705', ink: '#f2a65a', dim: '#7a4e2a',
    fog: '#24140b', dotSize: 1.7, depth: 0.8, sweep: 0.4, trueMix: 0.75, greyDim: 0.55, block: '#2a221d', blockEdge: '#40342c', blockFade: 0,
    heightTint: 0.1, rampLo: '#5a2a10', rampMid: '#f2a65a', rampHi: '#fff1dc', scanAmt: 0.6, scanNear: '#ffb36b', scanFar: '#7a3a18', scanSpin: 0.5,
    scanDead: 0.5, scanGap: 3.5, scanGrow: 0.25, scanFade: 1.6, scanRate: 0.35, scanPersist: 0.25, scanDrop: 0.3, scanCone: 1, scanLife: 8, scanTrue: 0.5, scanHeight: 24, scanAz: 1.5,
    grid: 0.08, neon: 2.2, clutter: 0.9,
    hostile: '#ff3b2f', lost: '#ff8a3d', sound: '#fff1dc', bearing: '#6fd3ff', objective: '#ffe9a8', friend: '#ffffff', quiet: '#6fa8ff', noise: '#ffd27a',
    bloom: 0.75, grain: 0.05, scan: 0, vignette: 0.7, aberr: 1.0, haze: '#5a2a10', hazeAmt: 0.3,
  },
  {
    name: 'LIDAR', note: 'Survey lidar (Jamie\'s reference photo): height ramp, rings, shadows, grid',
    font: FONTS[0].font, display: FONTS[0].display,
    bg: '#000000', ink: '#7fd8ff', dim: '#3a6a80',
    fog: '#0a1420', dotSize: 1.6, depth: 0.7, sweep: 0.3, trueMix: 0.5, greyDim: 0.5, block: '#141a20', blockEdge: '#232c36', blockFade: 0,
    heightTint: 0.9, rampLo: '#1a6cff', rampMid: '#2fe0a0', rampHi: '#ffb020', scanAmt: 1.0, scanNear: '#5fd8ff', scanFar: '#1a4cff', scanSpin: 0.4,
    scanDead: 0.5, scanGap: 2.6, scanGrow: 0.2, scanFade: 1.1, scanRate: 0.5, scanPersist: 0.45, scanDrop: 0.15, scanCone: 1, scanLife: 8, scanTrue: 0.5, scanHeight: 24, scanAz: 1.5,
    grid: 0.3, neon: 1.2, clutter: 0.9,
    hostile: '#ff3b5c', lost: '#ff9f40', sound: '#e8f8ff', bearing: '#ffffff', objective: '#ffe066', friend: '#ffffff', quiet: '#8ab4ff', noise: '#ffd27a',
    bloom: 0.35, grain: 0.02, scan: 0, vignette: 0.3, aberr: 0.2, haze: '#000000', hazeAmt: 0,
  },
  {
    name: 'CURRENT', note: 'Today\'s grey look, as a baseline (dots, no post FX)',
    font: 'monospace', display: 'monospace',
    bg: '#111111', ink: '#d8d8d8', dim: '#777777',
    fog: '#2c2d30', dotSize: 2.2, depth: 0, sweep: 0, trueMix: 1, greyDim: 0.6, block: '#3a3b3e', blockEdge: '#55575c', blockFade: 0,
    heightTint: 0, rampLo: '#333333', rampMid: '#777777', rampHi: '#bbbbbb', scanAmt: 0, scanNear: '#d8d8d8', scanFar: '#555555', scanSpin: 0,
    scanDead: 0.5, scanGap: 3, scanGrow: 0.22, scanFade: 1.5, scanRate: 0.5, scanPersist: 0.3, scanDrop: 0.2, scanCone: 1, scanLife: 8, scanTrue: 0.5, scanHeight: 24, scanAz: 1.5,
    grid: 0, neon: 1, clutter: 0.5,
    hostile: '#ff3333', lost: '#ff9900', sound: '#e8f4ff', bearing: '#33dddd', objective: '#ffcc33', friend: '#ffffff', quiet: '#78afff', noise: '#ffc846',
    bloom: 0, grain: 0, scan: 0, vignette: 0, aberr: 0, haze: '#000000', hazeAmt: 0,
  },
];

// What each TUNE knob does, in plain words (hover = tooltip on desktop; tap the name on a phone)
export const TIPS: Record<string, string> = {
  font: 'Type pair: the body font for readouts and labels, plus the display font for big labels and buttons.',
  // colours
  bg: 'Background colour behind everything (the sky / empty space).',
  ink: 'The one UI colour: HUD hairlines and text, map marks, the grid. Also tints the scan when trueMix is below 1.',
  dim: 'Secondary text and resting UI elements.',
  fog: 'Tint of revealed areas once out of sight (what the colour drains to).',
  block: 'Colour of the grey massing blocks (buildings not scanned yet).',
  blockEdge: 'Edge line on the grey massing blocks.',
  blockFade: 'How much a grey block dissolves once scanned. 0 = never: it stays as a grey mass and the scan dots land on it.',
  rampLo: 'Height ramp, street level (only shows with heightTint above 0).',
  rampMid: 'Height ramp, mid height.',
  rampHi: 'Height ramp, rooftops.',
  scanNear: 'Scan ring colour close to the ExoS.',
  scanFar: 'Scan ring colour at max range.',
  hostile: 'Enemy contacts: rings, brackets, labels, target readout.',
  lost: 'Contacts you have lost track of (fading).',
  sound: 'Sound rings (how far this activation was heard).',
  bearing: 'Bearing lines and the radar cone.',
  objective: 'Uplink / cargo / bounty markers.',
  friend: 'Your ExoS markers, the exfil edge, shell streaks.',
  quiet: 'QUIET signal-terrain outlines.',
  noise: 'NOISE signal-terrain outlines and the heard-range ring.',
  haze: 'Colour of the atmospheric dust haze.',
  // battlefield
  dotSize: 'Size of every scan dot.',
  depth: 'How tall buildings are drawn (0 = flat top-down map; higher = taller, more lean).',
  sweep: 'The pulse ring that expands out from the active ExoS and brightens the dots it passes.',
  trueMix: 'Live scans: 1 = real-world colours, 0 = everything tinted in the look\'s ink colour.',
  greyDim: 'Brightness of revealed areas once out of sight (the drained grey).',
  heightTint: 'Colours scanned objects by height (street → rooftops) like survey lidar, over their true colour. 0 = off.',
  neon: 'Glow strength of neon signs, billboards, lit windows, lamps and traffic lights.',
  clutter: 'Visibility of ground clutter: debris, rubble, puddles, manholes.',
  grid: 'Visibility of the reference grid on the ground.',
  // scan rings
  scanAmt: 'Overall brightness of the ground scan rings (0 = off).',
  scanSpin: 'Brightness of the flash where the spinning head is laying down new dots.',
  scanDead: 'Dead zone under the ExoS, radius in tiles (0.5 = one tile across).',
  scanGap: 'Spacing between rings at the centre (a tile is 32). Also sets the wall scan lines, which are the rings continued up the walls.',
  scanGrow: 'How much the ring spacing opens up per ring going outward.',
  scanFade: 'How the rings fade toward max visual range: 1 = even fade; higher = gone sooner.',
  scanRate: 'Spin speed of the lidar head, in turns per second.',
  scanPersist: 'How lit a dot settles to after its first flash (over one head turn), before it fades out over scanLife.',
  scanDrop: 'Share of ring dots missing on each pass of the head (rolled fresh every pass).',
  scanHeight: 'Height of the lidar sensor on the ExoS (a tile is 32). Wall scan lines are the ground rings continued up the wall from this height.',
  scanAz: 'Horizontal step of the lidar in degrees. Bigger = fewer columns on far walls and sparser far rings; close walls stay sharp.',
  scanLife: 'Seconds a ground scan dot stays where it landed while it fades out. New dots keep being laid from wherever the ExoS is.',
  scanTrue: 'How much the ground\'s true colour (lane paint, puddles, lamp light) shows in the scan dots. 0 = ring colour only.',
  scanCone: '1 = rings only inside the ExoS\'s eyes cone (the sim\'s sight rule); 0 = full 360°.',
  // post
  bloom: 'Glow around bright things (neon, lights, flashes).',
  grain: 'Film grain over the whole picture.',
  scan: 'CRT scanlines over the whole picture.',
  vignette: 'Darkening toward the screen edges.',
  aberr: 'Colour fringing toward the screen edges (chromatic aberration).',
  hazeAmt: 'Strength of the dust haze (lit from below, like 2049).',
  // fog timings
  RESOLVE_S: 'Seconds for a newly scanned tile to resolve from grey block into detailed dots.',
  COLOUR_IN_S: 'Seconds for a seen tile to reach full colour.',
  COLOUR_OUT_S: 'Seconds for a tile to drain to grey once out of sight.',
};

export const FX = { bloom: true, grain: true, scan: true, vignette: true, aberr: true, haze: true, fog: true, sweep: true, rings: true, grid: false, spinners: true }; // grid off by default (Jamie)
export let look: Look = LOOKS[0];
export function setLook(i: number) { look = LOOKS[i]; }
