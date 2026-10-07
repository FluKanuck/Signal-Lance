// Tester splash, basics screen and end-of-hunt questions (chore, R11). View only.
// UPDATE TEST + QUESTIONS EVERY ROUND: they tell remote testers what this build is testing. When a round ends, move its
// newThings (condensed) to the top of HISTORY, so a returning tester can page back through everything since they last played.
import { $ } from './hud.ts';
import { TUNE } from '../tune.ts';

export const TEST = {
  title: 'Round 18 test: Fit for the job',
  question: 'When you build each ExoS against the job and the INTEL, does it force a sacrifice you think about, and does that sacrifice show up in the hunt?',
  newThings: [
    'NEW (r18-s2): the HANGAR is the loadout screen. Tap a part of the ExoS (mast, arms, core, back, legs) to see its hardpoints, tap one to fit something. Start from Scout (Wisp), Line (Warden, the old suit) or Brawler (Bulwark), or build your own. ExoS A and B each have their own fit; it locks for the contract.',
    'NEW: frames differ in hardpoints, load and how loud they are on EM. Every module and plate has weight. Over the frame’s rated load every move is louder (+1 sound per point over); far over it, every move costs +1 AP too. Over max, or with no reactor, the suit can’t launch.',
    'NEW: power. Your Energy back each turn = the reactor’s output minus what your modules draw (the old flat +10 is gone). Batteries add to the pool. The Cold processor (a mast mod) makes your radar pulse 40% quieter for 2 more draw.',
    'NEW: each location is a part. When it is destroyed, whatever is mounted there goes offline (mast gone = no passive, mask or radar; back gone = no mortar). The BACK is only hit by shots from behind your facing: turn to face what is shooting you.',
    'NEW: the INTEL says what the field listens on (sound, eyes, EM ears, radar), so you can build against it. After the hunt, the result screen says what found each ExoS first, on which channel and from how far.',
    'NEW (r18-s3): THERMAL. Every ExoS gives off heat: its reactor (Hot core 4, Cold-burn 0) plus its size (Wisp 1, Warden 3, Bulwark 5). Firing (+' + TUNE.IR_FIRE + ') and sprinting (+' + TUNE.IR_SPRINT + ') add heat that lingers and cools ' + TUNE.IR_COOL_PER_TURN + ' a turn. Turrets carry thermal sights: they see heat in line of sight, further the hotter you run (the HUD shows IR and how far). Fit Thermal optics on your mast to see heat too.',
    'NEW (Jamie’s ask): a SNIPER turret. Its Long gun hits out to 20 tiles and barely loses accuracy with range, with a very loud crack. It still needs a firm lock: past eye range that means its thermal sight, so a hot suit is the one it can reach. It’s on the CARD (10 variants now).',
    'NEW (r18-s4): weight costs Energy too. Every point over your rated load adds +' + TUNE.OVERLOAD_EN_PER_TILE + ' Energy to every tile you move, creeping included (on top of the louder moves). A heavy suit drains its battery just walking; a Hot core’s extra output can pay for it.',
    'NEW (r18-s10): tags use the standard names: EO (eyes), ESM (passive EM), ACO (sound), MZL (muzzle flash), RDR, IR, each with the suit that made it (EO A, ESM A+B). An amber dashed box = noise still blurring it. A vague fix (a sound) no longer drags a good track away, and a turret you know stays put. Blind lobs land much closer at short range.',
    'NEW (r18-s9): sense tags stack: every sense that has fixed a contact lately gets a cyan tag (VIS = eyes, RDR, EM, IR, SND, FLASH, ALARM); the one holding the fix now is gold, on top.',
    'FIXED (r18-s9): a passive (EM) contact sits on the best fit of all your bearing lines, not one pair. The more spots you listened from and the wider the lines cross, the more it trusts that crossing: a well-crossed contact in a NOISE zone now settles on it instead of jumping about. The tag reads EM·NOISE while the noise is still winning.',
    'FIXED (r18-s8): contacts close together stack their labels; each contact has a tag for the sense holding its fix (EYE, RDR, RDR 2W = radar through 2 walls, EM, IR, SND, FLASH, ALARM; dim = stale). Cover: buildings, set pieces and floor debris are separate pieces, so standing by a building no longer cancels debris cover. A move only stops for a contact that’s new to you. Every log line has the hunt’s seed; PLAY SEED (hangar) replays it: type a seed or paste a log line.',
    'FIXED (r18-s7): the game scales to its window (phone, iPad split screen, iPad full screen) and keeps a gap at the top; the hangar’s selected body part is outlined and named; the pick sheet answers taps on iPad; a NEW BUILD button appears when a newer build is published.',
    'NEW (r18-s5): QUIT, next to CTR: tap it twice to drop the hunt (and its contract) and go back to the hangar.',
    'TEST BED: "Heavy load", "Back door" and "Warm core".',
  ],
  round: 18,
  howTo: 'Play the two new scenarios first, then hunts in contracts with all four job types. Build each ExoS for the job and the INTEL before you start; try different frames. After each hunt, tap the answers and add a note about your build. When you finish, tap SEND LOG and send it to Jamie.',
};
const R17_NEW = [
    'NEW (r17-s2): draw your move freehand: drag from your ExoS and the line follows your finger (it goes round walls by itself; scrap you draw through is crossed on purpose). Cyan is as far as this turn’s AP goes; red dashed is past it. Drag the round handle at the end to carry the line on, or drag from the middle of the line to redraw from there. Then tap MOVE. Tap-to-move still works.',
    'NEW (r17-s2): aim your eyes as you walk. Tap a point on your line, then tap where it should look: an eye marker drops there (drag it to move it; tap it, then ✕ LOOK to remove it). The suit turns at that point and keeps looking that way until the next one or the end of the move; a faint cone shows where. Up to ' + TUNE.FACE_WAYPOINTS_MAX + ' per move. NEW (r17-s4): turning never costs AP any more, here or anywhere.',
    'NEW: your eyes work on every step of a move. If something new shows up (a contact you didn’t have, or your eyes landing on one you were tracking), the move stops on that tile: "CONTACT — move stopped". You keep the AP and energy you didn’t spend, so shoot, back off or draw again.',
    'NEW: scrap and rubble are now low cover: −' + TUNE.HIT_COVER_LOW + '% to hit, not −' + TUNE.HIT_COVER + '%. Walls and set pieces are still full cover. When you aim at a target in cover, the piece giving the cover is outlined (yellow = wall, tan = scrap), and green shows cover you share with it (no penalty).',
    'Escort route buttons no longer sit under the HUD text.',
    'TEST BED: "Side street", "Trip wire" and "Scrap line".',
]; void R17_NEW; // R18: Round 17's build notes (its HISTORY page is the condensed version)
// Earlier rounds, newest first: what each one added (page back with ‹ on the splash).
export const HISTORY = [
  { round: 18, title: 'Round 18: Fit for the job', lines: [
    'The HANGAR is the loadout screen: tap a part of the ExoS, then a hardpoint, to fit it. Start from Scout (Wisp), Line (Warden) or Brawler (Bulwark).',
    'Weight: over rated load every move is louder and costs more Energy per tile (creep too); far over, +1 AP a move. Power = reactor output − draw; batteries add pool.',
    'Each location is a part: losing it takes its modules offline. The BACK is only hit from behind. THERMAL: reactor + size + firing / sprinting heat; turrets carry thermal sights; Thermal optics lets you read heat. A sniper turret hits out to 20 tiles.',
    'Contacts carry stacked sense tags (EO, RDR, ESM, IR, ACO, MZL) with the suit that made each; gold = holding the fix. ESM sits on the best fit of your bearings; noise only widens it. Cover shows as a shield.',
    'INTEL lists what the field listens on; the result screen says what found you first. PLAY SEED replays a hunt; QUIT goes back to the hangar; the game scales to its window.',
  ] },
  { round: 17, title: 'Round 17: Eyes on the street', lines: [
    'Drag from your ExoS to draw your move freehand (it goes round walls; scrap you draw through is crossed on purpose). Cyan = this turn’s AP, red dashed = past it. Drag the end handle to carry on, or drag the middle to redraw from there. Tap-to-move still works.',
    'Aim your eyes as you walk: tap a point on your line, then tap where it should look. Drag the eye marker to move it; up to 3 per move. Turning is free now.',
    'Your eyes work on every step. Anything new stops the move on that tile ("CONTACT — move stopped"), and you keep the AP you didn’t spend.',
    'Scrap and rubble are low cover (−15%, walls −25%). Aiming at a target in cover outlines the piece giving it.',
  ] },
  { round: 16, title: 'Round 16: Rolled ground', lines: [
    'Every hunt is a new district packed from irregular city pieces (half blocks, strips, L shapes, hand-drawn blocks), cut off at the map edge; the job card gives its size. Bigger districts have a bigger field.',
    'Brown speckled scrap and rubble: slow (2 tiles of movement a tile), loud (+3 sound), low cover. Rusty walls are set pieces and street barricades; chicanes can be weaved through but not seen past.',
    'You start in a cleared staging area. Hover or hold a finger on anything on the map to see what it is. Cover you share with your target (both up against it) does not count.',
    'Escort: up to three routes per fork (NORTH / AHEAD / SOUTH), levers to set forks ahead, a ring for where the next move ends, HOLD and HURRY orders, and the transport in the turn strip.',
    'Every mech leaves on its own: walk into the green zone and tap EXTRACT. The hunt ends once all your living mechs are out.',
  ] },
  { round: 15, title: 'Round 15: Pick your fights', lines: [
    'Jobs come in four types, shown on top of each job card: UPLINK (stand in the ring and uplink), BOUNTY, RETRIEVE and ESCORT.',
    'BOUNTY: every kill pays that enemy’s bounty (prices on the CARD). Reach the quota for a win, then extract when you choose. The field has extra enemies.',
    'RETRIEVE: PICK UP the guarded cargo. That alerts the whole field, which hunts the carrier (who can’t sprint). HAND OFF to the other mech, carry it out the right edge.',
    'ESCORT: a friendly transport walks from the left edge to the right. Keep it alive; at each fork it waits for you to tap a route on the map.',
  ] },
  { round: 14, title: 'Round 14: Read the signature', lines: [
    'Every enemy is one of 9 variants (3 patrols, 3 turrets, 3 emplacements). They fight differently.',
    'Tap a contact to see what your sensors picked up (EMIT, pulses, moved or still, steps or a shot heard). The CARD lists the 9 with one bold TELL each; "3 fit" shows how many still match.',
    'ID calls a contact. A turret or emplacement call freezes its track; a right call before eyes adds +10% to hit.',
    'The TEST BED (loadout screen): short scenarios that test one thing each.',
  ] },
  { round: 13, title: 'Round 13: Loud gets company', lines: [
    'Noise is two things. EMIT (orange) is electronic: radar, ECM and uplink. It builds up, fades slowly and carries far.',
    'SOUND (pale ring with ticks) is moving and shooting. One radius per turn, heard through walls, gone at your next turn. A heard-only contact is a hollow SOUND square: never enough to shoot.',
    'Patrols carry radios (a small steady EMIT), so passive sensors find them. Turrets stay silent.',
    'Two legs: lose one and you can only CREEP; lose both and you creep at half distance.',
    'THE PACK (splash toggle): one enemy that senses you alerts others nearby, and patrols leave their posts to hunt you.',
  ] },
  { round: 12, title: 'Round 12: Pick your shot', lines: [
    'Shots roll to hit: FIRE shows your chance and the yellow ODDS line shows why (range, target moved, cover, a loud target).',
    'A hit strikes a part: core, legs, weapon or sensors. Same rules for the enemy. Part damage carries through the contract; REPAIR fixes the worst part first.',
  ] },
];
// End-of-hunt questions (tap one answer each; optional). Answers go into the log line, next to the hunt's job type.
export const QUESTIONS = [
  { k: 'gave', q: 'To fit the build for this job, I gave up…', a: ['Armour', 'A sensor or ECM', 'Power or weight', 'Nothing really'] }, // R18 checkpoint 2: the sacrifice
  { k: 'felt', q: 'Mid-hunt, my build…', a: ['Was too heavy / loud', 'Ran out of power', 'Lost a part I needed', 'Showed up fine', 'Didn’t notice it'] },
  { k: 'link', q: 'My build showed up in the hunt…', a: ['Yes', 'It didn’t', 'Not sure'] },
];

const BASICS = [
  ['Goal', 'Each job has a type (top of the job card). UPLINK: stand in the gold ring and tap UPLINK on 3 turns, or destroy every enemy. BOUNTY: kills pay their bounty (prices on the CARD); reach the quota for a win, then extract at the right edge when you choose. RETRIEVE: PICK UP the cargo (the whole field then hunts the carrier, who can’t sprint), HAND OFF if needed, carry it out the right edge. ESCORT: keep the transport alive from the left edge to the right; at each fork, tap a route on the map (NORTH, AHEAD or SOUTH, where the streets are open). You can set the route at forks ahead of time (lit ✓); an unset fork stops it. HOLD makes it wait a round; HURRY makes it sprint its next move (3 of each per hunt). The gold dashed ring shows where its next move ends; T in the turn strip is its turn. To leave, walk into the green zone on the right and tap EXTRACT, mech by mech; the hunt ends when all your living mechs are out. Lose if both mechs are destroyed.'],
  ['Suit', 'The HANGAR (loadout screen) builds both ExoS. Tap a part of the suit to see its hardpoints (SENSOR, WEAPON, INTERNAL, UTILITY, MOBILITY, OPEN takes anything) and tap one to fit a module. Frames: Wisp (light, quiet on EM, few hardpoints, no back), Warden (the all-rounder), Bulwark (heavy, loud on EM, lots of room). LOAD: every module and plate weighs something; over the rated load every move is louder and every tile costs more Energy (creep too), far over it moves cost +1 AP, over max it can’t launch. POWER: Energy back each turn = reactor output − what your modules draw; batteries add to the pool. Plates add hits to a location. The fit locks for the whole contract.'],
  ['Heat', 'IR (heat) is a third channel. Your steady heat is your reactor (Hot core runs warm, Cold-burn cold) plus your frame’s size; firing and sprinting add heat that cools a little each turn. A thermal sight (turrets carry them; you can fit Thermal optics) sees heat like eyes see you, in line of sight and ahead of its facing, out to about ' + TUNE.IR_TILES_PER_PT + ' tiles per point of heat (max ' + TUNE.IR_RANGE + '). The HUD shows your IR and that range. A heat fix is good enough to shoot at but doesn’t tell you the variant.'],
  ['Parts', 'Each location is a part with its own hits: MAST (sensors), ARMS (weapon), CORE, BACK and LEGS. A destroyed part takes what is mounted on it offline, and the button says which part (SNS, WPN, BCK). The BACK is only hit by shots from behind your facing. CORE gone = the ExoS is destroyed.'],
  ['Turns', 'Everyone acts in initiative order (strip, top right). On your mech\'s turn you spend AP (the ● pips). END TURN passes to the next unit.'],
  ['Move', 'Tap the map to plot a path, or drag from your ExoS to draw one freehand (it goes round walls; scrap you draw through is crossed on purpose). Drag the round end handle to carry it on, or drag from the middle to redraw from there. Pick CREEP, NORM or SPRINT, then tap MOVE. Faster covers more ground but is louder. A drawn path is cyan as far as your AP goes, red dashed past it. No path carries over to the next turn.'],
  ['Look', 'Your eyes see ahead of your facing (and all round up close), on every step of a move. Facing follows the way you walk. On a drawn path, tap a point, then tap where it should look (an eye marker drops there; drag it to move it): the suit turns there and keeps looking that way (up to ' + TUNE.FACE_WAYPOINTS_MAX + ' per move). Turning to face something is free, for you and the enemy. If a step shows something new, the move stops on that tile and you keep the AP you didn’t spend.'],
  ['Find', 'Enemies are hidden. A contact is a red square with a circle: the circle is how unsure you are. The tags by its name are the senses that have fixed it lately, stacked: gold = the one holding the fix now, cyan = the others, with the suit that made it (EO A = A’s eyes, exact; RDR radar, “2W” = through 2 walls so still fuzzy; ESM crossed passive bearings; IR heat; ACO sound only; MZL its muzzle flash, it shot at you; dim = stale). A grey, struck-through IR tag = your thermal optics are looking right at it and see no heat: it runs cold. An amber dashed box round the gold tag = a noise zone is still blurring that fix. A vaguer fix never drags a good one away, and a turret or emplacement you know stays put. Passive sensors draw cyan bearing lines; two crossing lines make a fix. RADAR gives a sharp fix but is very loud.'],
  ['Fight', 'Tap a contact to select it. FIRE needs a tight fix, range and line of sight; the button says why if it\'s blocked, or shows your hit chance. Hits strike a part (core, legs, arms, mast; the back only from behind). Cover close to the target costs −' + TUNE.HIT_COVER + '% for a wall or set piece, −' + TUNE.HIT_COVER_LOW + '% for scrap (low cover), unless you are right up against the same piece of cover yourself. When you aim, the cover piece is outlined and a shield shows by your target (the ODDS line gives the number). MORTAR fires on a fix with no line of sight, but scatters more on a fuzzy one.'],
  ['Noise', 'Two kinds. EMIT (orange bar, orange dashed ring) is electronic: radar, ECM and uplink add to it, it fades a little each turn, and passive sensors pick it up from far away. SOUND (pale ring with ticks) is moving and shooting: one radius per turn (the loudest thing you did), heard through walls, gone at your next turn.'],
  ['Ground', 'Every hunt is a new district (the job card gives its size), packed from irregular city pieces, so streets jog, narrow and dead-end. Blue dotted areas are quiet ground: you are harder to hear there. Amber hatched areas are noise: fixes on anything inside are blurry. Brown speckled scrap is slow (2 tiles of movement a tile) and loud (+3 sound), but it is low cover (−' + TUNE.HIT_COVER_LOW + '% to hit). Rusty outlined shapes are walls: set pieces in the blocks, and barricades that shut a street. A chicane (walls on alternate lanes) can be weaved through but not seen past.'],
  ['ID', 'Enemies come in 10 variants (4 of them turrets, including the sniper: a Long gun that hits out to 20 tiles, but only on a firm lock). Tap a contact to see what your sensors have picked up about it, open the CARD to compare, then tap ID to call it. A turret or emplacement call freezes its track; a right call before eyes adds +10% to hit.'],
  ['ECM', 'ECM masks you each turn it is on. GHOST places a fake contact for enemies.'],
  ['Camera', 'Drag to pan. Z+ / Z− zoom. CTR recentres. QUIT (tap twice) drops the hunt and its contract and goes back to the hangar.'],
  ['Tips', 'Hover the mouse over anything on the map, or hold a finger on it, to see what it is and what it does.'],
  ['Debug', 'DEBUG: REROLL JOBS (job screen) rolls two new jobs for the same hunt, e.g. to get the job type you want to test. The log line notes it.'],
];

// Simple legend, drawn with the same colours as the game.
const LEGEND = `<svg viewBox="0 0 300 300" width="300" height="300" style="max-width:100%;font:bold 12px monospace" aria-label="Map legend">
<rect x="0" y="0" width="300" height="300" fill="#2c2d30" rx="6"/>
<circle cx="28" cy="26" r="9" fill="#fff"/><line x1="28" y1="26" x2="44" y2="26" stroke="#fff" stroke-width="3"/><circle cx="28" cy="26" r="15" fill="none" stroke="#9cf" stroke-width="2"/>
<text x="60" y="30" fill="#ddd">Your mech (blue ring = its turn)</text>
<circle cx="28" cy="64" r="14" fill="none" stroke="#f33" stroke-width="2"/><rect x="23" y="59" width="10" height="10" fill="#f33"/>
<text x="60" y="68" fill="#ddd">Contact (circle = how unsure)</text>
<circle cx="28" cy="102" r="14" fill="none" stroke="#f90" stroke-width="2"/><rect x="23" y="97" width="10" height="10" fill="#f90"/>
<text x="60" y="106" fill="#ddd">Lost contact (last guess)</text>
<line x1="10" y1="146" x2="48" y2="128" stroke="#3dd" stroke-width="2"/>
<text x="60" y="142" fill="#ddd">Bearing line (cross two)</text>
<circle cx="28" cy="176" r="15" fill="rgba(255,204,51,.15)" stroke="#fc3" stroke-width="2"/><path d="M28 168 L36 176 L28 184 L20 176 Z" fill="none" stroke="#fc3" stroke-width="2"/>
<text x="60" y="180" fill="#ddd">Uplink</text>
<circle cx="28" cy="214" r="15" fill="none" stroke="rgba(255,150,50,.6)" stroke-width="2" stroke-dasharray="6 4"/>
<text x="60" y="218" fill="#ddd">EMIT: how far sensors hear you</text>
<circle cx="250" cy="214" r="13" fill="none" stroke="rgba(232,244,255,.7)" stroke-width="2"/><path d="M263 214 h6 M231 214 h6 M250 195 v6 M250 227 v6" stroke="rgba(232,244,255,.7)" stroke-width="2"/>
<text x="198" y="246" fill="#ddd">SOUND ring</text>
<rect x="12" y="236" width="32" height="20" fill="rgba(90,150,255,.24)" stroke="rgba(120,175,255,.7)" stroke-width="2" stroke-dasharray="2 4"/>
<text x="60" y="251" fill="#ddd">Quiet ground</text>
<rect x="12" y="268" width="32" height="20" fill="rgba(255,200,70,.12)" stroke="rgba(255,200,70,.7)" stroke-width="2" stroke-dasharray="8 4"/>
<path d="M12 288 L32 268 M22 288 L42 268 M32 288 L44 276" stroke="rgba(255,200,70,.35)"/>
<text x="60" y="283" fill="#ddd">Noise zone</text>
</svg>`;
// Screen layout sketch.
const LAYOUT = `<svg viewBox="0 0 300 150" width="300" height="150" style="max-width:100%;font:bold 11px monospace" aria-label="Screen layout">
<rect x="1" y="1" width="298" height="148" fill="#1b1c1e" stroke="#666" rx="6"/>
<rect x="8" y="8" width="120" height="44" fill="none" stroke="#9cf" stroke-dasharray="4 3"/><text x="14" y="26" fill="#9cf">AP · Energy</text><text x="14" y="42" fill="#9cf">EMIT · SOUND · parts</text>
<rect x="222" y="8" width="70" height="20" fill="none" stroke="#9cf" stroke-dasharray="4 3"/><text x="228" y="22" fill="#9cf">turn order</text>
<rect x="8" y="96" width="44" height="44" fill="none" stroke="#9cf" stroke-dasharray="4 3"/><text x="13" y="122" fill="#9cf">zoom</text>
<rect x="76" y="118" width="140" height="24" fill="none" stroke="#9cf" stroke-dasharray="4 3"/><text x="82" y="134" fill="#9cf">move · uplink</text>
<rect x="232" y="44" width="60" height="98" fill="none" stroke="#9cf" stroke-dasharray="4 3"/><text x="238" y="80" fill="#9cf">radar</text><text x="238" y="96" fill="#9cf">ecm</text><text x="238" y="112" fill="#9cf">fire</text><text x="238" y="128" fill="#9cf">end turn</text>
<text x="110" y="78" fill="#888">map</text>
</svg>`;

function esc(s) { return String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c])); }
// The splash pages through rounds: this one first, then HISTORY. The last round a tester opened is remembered (this
// device), so a returning tester is told how many rounds they missed and pages back through them with ‹ / › or a swipe.
const PAGES = () => [{ round: TEST.round, title: 'New in this build', lines: TEST.newThings }, ...HISTORY.filter(h => h.round !== TEST.round)]; // the current round's own page isn't repeated
let page = 0;
function seenGet() { try { return Number(localStorage.getItem('signalLance.seenRound')) || 0; } catch (_) { return 0; } }
function seenSet(n: number) { try { localStorage.setItem('signalLance.seenRound', String(n)); } catch (_) {} }
function showPage() {
  const P = PAGES(), pg = P[page];
  $('spPage').innerHTML = '<p><b>' + esc(pg.title) + (page ? '' : ' (Round ' + pg.round + ')') + '</b> <span style="opacity:.7">' + (page + 1) + '/' + P.length + '</span></p><ul>' +
    pg.lines.map(t => '<li>' + esc(t) + '</li>').join('') + '</ul>';
  ($('spPrev') as any).disabled = page >= P.length - 1; ($('spNext') as any).disabled = page <= 0;
}
export function buildBrief(build: string) {
  const seen = seenGet(), missed = HISTORY.filter(h => seen && h.round > seen && h.round !== TEST.round).length;
  $('spTitle').textContent = TEST.title + ' · ' + build;
  $('spBody').innerHTML = '<p><b>The game:</b> you run two mechs, A and B. Find hidden enemies with your sensors, then win the hunt.</p>' +
    '<p><b>This test:</b> ' + esc(TEST.question) + '</p>' +
    (missed ? '<p style="color:#fc3"><b>Welcome back.</b> Last time you played Round ' + seen + '. Tap ‹ (or swipe) for the ' + missed + ' round' + (missed > 1 ? 's' : '') + ' of changes since.</p>' : '') +
    '<div id="spHist"><div class="zrow" style="justify-content:space-between"><button id="spPrev">‹ OLDER</button><button id="spNext">NEWER ›</button></div><div id="spPage"></div></div>' +
    '<p>' + esc(TEST.howTo) + '</p>';
  page = 0; showPage();
  const go = (d: number) => { const n = Math.max(0, Math.min(PAGES().length - 1, page + d)); if (n !== page) { page = n; showPage(); } };
  $('spPrev').addEventListener('click', () => go(1)); $('spNext').addEventListener('click', () => go(-1));
  let sx = -1; // swipe: left = older, right = newer
  $('spHist').addEventListener('pointerdown', e => { sx = e.clientX; });
  $('spHist').addEventListener('pointerup', e => { if (sx >= 0 && Math.abs(e.clientX - sx) > 50) go(e.clientX < sx ? 1 : -1); sx = -1; });
  seenSet(TEST.round);
  $('bsText').innerHTML = BASICS.map(([h, t]) => '<p><b>' + h + ':</b> ' + esc(t) + '</p>').join('');
  $('bsArt').innerHTML = LAYOUT + LEGEND;
}

// End-of-hunt answers (view state; reset each result screen).
const picked: Record<string, string> = {};
export function buildQuestions() {
  $('resQ').innerHTML = QUESTIONS.map(Q => '<div class="qrow"><span>' + esc(Q.q) + '</span>' +
    Q.a.map(a => '<button class="qa" data-k="' + Q.k + '" data-a="' + esc(a) + '">' + esc(a) + '</button>').join('') + '</div>').join('');
  $('resQ').addEventListener('click', ev => {
    const b = (ev.target as any).closest('.qa'); if (!b) return;
    const k = b.dataset.k;
    picked[k] = picked[k] === b.dataset.a ? '' : b.dataset.a;
    for (const o of $('resQ').querySelectorAll('.qa[data-k="' + k + '"]')) o.classList.toggle('on', o.dataset.a === picked[k]);
  });
}
export function resetAnswers() { for (const k of Object.keys(picked)) picked[k] = ''; for (const o of $('resQ').querySelectorAll('.qa')) o.classList.remove('on'); }
// "feel Tense · past A bit" for the log line ('' if nothing picked)
export function answersText() { return QUESTIONS.filter(Q => picked[Q.k]).map(Q => Q.k + ' ' + picked[Q.k]).join(' · '); }
