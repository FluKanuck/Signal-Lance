// Visual lab: each LOOK is one complete set of style tokens. The battlefield (GL), the map marks (2D) and the HUD (CSS)
// all read from the active look, so switching looks never touches drawing code. The winning look's tokens are what
// a real presentation branch (or an engine port) takes away.

export type Look = {
  name: string; note: string;
  font: string;                 // CSS font-family for marks + HUD
  bg: string;                   // clear colour behind everything
  ink: string;                  // the one UI colour (hairlines, text)
  dim: string;                  // ink at rest / secondary text
  // battlefield
  ground: string; wall: string; roof: string; // lit dot colours per kind
  fog: string;                  // what a dot fades to when nothing sees it
  dotSize: number;              // px at zoom 1
  depth: number;                // building height parallax (0 = flat top-down)
  sweep: number;                // lidar sweep brightness boost (0 = off)
  // information colours (colour only for information)
  hostile: string; lost: string; sound: string; bearing: string; objective: string; friend: string; quiet: string; noise: string;
  // post
  bloom: number; grain: number; scan: number; vignette: number; aberr: number; haze: string; hazeAmt: number;
};

export const LOOKS: Look[] = [
  {
    name: 'MICRO', note: 'Micrographics lavender: hairlines, grain, low bloom',
    font: '"IBM Plex Mono", monospace',
    bg: '#0b0a10', ink: '#b9b2ff', dim: '#5d5880',
    ground: '#6f69a8', wall: '#b9b2ff', roof: '#8d86d6', fog: '#1d1b2a', dotSize: 1.6, depth: 0.55, sweep: 0.6,
    hostile: '#ff5d73', lost: '#ff9f6b', sound: '#e8e4ff', bearing: '#7fe0ff', objective: '#ffd27a', friend: '#ffffff', quiet: '#7aa2ff', noise: '#ffc861',
    bloom: 0.35, grain: 0.05, scan: 0, vignette: 0.45, aberr: 0.6, haze: '#1a1530', hazeAmt: 0.25,
  },
  {
    name: 'PHOSPHOR', note: 'HUD Vectors green: CRT scanlines, stronger glow',
    font: '"Share Tech Mono", monospace',
    bg: '#020805', ink: '#1cf59a', dim: '#0f6b47',
    ground: '#0d8a57', wall: '#1cf59a', roof: '#13c27b', fog: '#06231a', dotSize: 1.8, depth: 0.45, sweep: 0.9,
    hostile: '#ff4d3d', lost: '#ffa040', sound: '#d9fff0', bearing: '#7af7ff', objective: '#f5e663', friend: '#ffffff', quiet: '#5fb7ff', noise: '#f5e663',
    bloom: 0.8, grain: 0.06, scan: 0.35, vignette: 0.6, aberr: 0.4, haze: '#03140c', hazeAmt: 0.2,
  },
  {
    name: '2049', note: 'Blade Runner amber haze: warm dust, heavy bloom, cool info',
    font: '"JetBrains Mono", monospace',
    bg: '#0c0705', ink: '#f2a65a', dim: '#7a4e2a',
    ground: '#8a5530', wall: '#ffb36b', roof: '#c47a3e', fog: '#24140b', dotSize: 1.7, depth: 0.8, sweep: 0.5,
    hostile: '#ff3b2f', lost: '#ff8a3d', sound: '#fff1dc', bearing: '#6fd3ff', objective: '#ffe9a8', friend: '#ffffff', quiet: '#6fa8ff', noise: '#ffd27a',
    bloom: 0.75, grain: 0.07, scan: 0, vignette: 0.7, aberr: 1.0, haze: '#5a2a10', hazeAmt: 0.3,
  },
  {
    name: 'CURRENT', note: 'Today\'s grey look, as a baseline (dots, no post FX)',
    font: 'monospace',
    bg: '#111111', ink: '#d8d8d8', dim: '#777777',
    ground: '#3a3b3f', wall: '#8b8d92', roof: '#6b6d72', fog: '#2c2d30', dotSize: 2.2, depth: 0, sweep: 0,
    hostile: '#ff3333', lost: '#ff9900', sound: '#e8f4ff', bearing: '#33dddd', objective: '#ffcc33', friend: '#ffffff', quiet: '#78afff', noise: '#ffc846',
    bloom: 0, grain: 0, scan: 0, vignette: 0, aberr: 0, haze: '#000000', hazeAmt: 0,
  },
];

export const FX = { bloom: true, grain: true, scan: true, vignette: true, aberr: true, haze: true, fog: true, sweep: true };
export let look: Look = LOOKS[0];
export function setLook(i: number) { look = LOOKS[i]; }
