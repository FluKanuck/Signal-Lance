// Tester splash, basics screen and end-of-hunt questions (chore, R11). View only.
// UPDATE TEST + QUESTIONS EVERY ROUND: they tell remote testers what this build is testing. When a round ends, move its
// newThings (condensed) to the top of HISTORY, so a returning tester can page back through everything since they last played.
import { $ } from './hud.ts';
import { TUNE } from '../tune.ts';

export const TEST = {
  title: 'Round 16 test: Rolled ground',
  question: 'When every hunt rolls a new map, do routes stop feeling solved, so that where you go becomes part of reading the field?',
  newThings: [
    'NEW (r16-s1): every hunt is a new district built from city blocks: plazas, alleys, walled yards, avenues, scrap lots, warrens, towers, depots. The grid changes too, from a short 4×2 to a big 4×4. The job card says how big (e.g. "4×3 district, 48×36"). Bigger districts have a bigger field.',
    'Brown speckled ground is scrap, glass and rubble. Each tile costs ' + TUNE.CLUTTER_TILE_COST + ' tiles of movement, and walking into it adds ' + TUNE.CLUTTER_SOUND + ' to that move’s sound. It counts as low cover. Enemies pay the same, so listen for them crunching.',
    'Rusty outlined shapes are set pieces (wrecks, containers, gantries): walls you can’t see or shoot through. Quiet and noise zones now sit inside the blocks.',
    'NEW (r16-s8): in ESCORT and RETRIEVE, a mech that reaches the right edge just waits there. The hunt ends when the transport (or the cargo) comes out, or when all your mechs are out (you leave without it).',
    'NEW (r16-s7): cover you share does not count. If you stand right up against the same wall, barricade or scrap that covers your target, you lean round it: no cover penalty. Same rule for enemies.',
    'NEW (r16-s7): Escort levers. Route buttons now show at every fork ahead: tap one to set that fork in advance (lit with a ✓; tap again to clear). Reaching a set fork, the transport carries straight on, even mid-move. An unset fork still stops it until you choose.',
    'NEW (r16-s7): a dashed gold ring marks where the transport\'s next move will end ("waits at fork" if a lever isn\'t set). The transport is now in the turn strip (green T).',
    'NEW (r16-s6): you start in a cleared staging area on the most open stretch of the left edge, and the Escort transport starts beside you.',
    'NEW (r16-s6): Escort orders (bottom row, your turn, no AP): HOLD = the transport waits one round, then carries on (' + TUNE.ESCORT_HOLDS + ' per hunt). HURRY = its next move is a sprint, ' + TUNE.ESCORT_SPRINT + ' tiles instead of ' + TUNE.ESCORT_MOVE + ', and louder (' + TUNE.ESCORT_HURRIES + ' per hunt). Tap again to cancel.',
    'NEW (r16-s5): districts are no longer a grid of blocks. They are packed from irregular pieces (half blocks, long strips, L shapes, and the hand-drawn blocks), cut off at the map edge. Streets jog, narrow, close and dead-end; some pieces are small open lots or have courtyards.',
    'NEW (r16-s3): the streets between blocks are no longer a clean grid. Some stretches have rubble across them (slow, loud), some are shut by a barricade, and some have a chicane: walls on alternate lanes you can weave through but can’t see straight past.',
    'NEW (r16-s3): hover the mouse over anything on the map, or hold a finger on it, to see what it is and what it does. A hold never moves or selects.',
    'Escort routes follow the open streets: at each fork, up to three legs, NORTH, AHEAD (straight on) and SOUTH, only where the streets let you through.',
    'MAP button on this screen: NEW DISTRICTS (default) or OLD HIVE (the old map), to compare. Play at least one hunt on the old map.',
    'TEST BED: "Long way round", "Two districts: strip" and "Two districts: square", and "Crunch".',
  ],
  round: 16,
  howTo: 'Play the four new scenarios first, then about 10 hunts in contracts on new districts (and one on the old hive). After each hunt, tap the answers (the first one matters most) and add a note, especially if tap-to-move fought you. When you finish, tap SEND LOG and send it to Jamie.',
};
// Earlier rounds, newest first: what each one added (page back with ‹ on the splash).
export const HISTORY = [
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
  { k: 'map', q: 'This district…', a: ['Changed my plan', "Didn't change it", 'Not sure'] },
  { k: 'clutter', q: 'Scrap and rubble…', a: ['Crossed it on purpose', 'Went round it', 'Never in my way', 'Heard an enemy crunch'] },
  { k: 'move', q: 'Tap-to-move…', a: ['Did what I wanted', 'Took clutter I’d avoid', 'Walked a line I didn’t want', 'Couldn’t look down a street'] },
];

const BASICS = [
  ['Goal', 'Each job has a type (top of the job card). UPLINK: stand in the gold ring and tap UPLINK on 3 turns, or destroy every enemy. BOUNTY: kills pay their bounty (prices on the CARD); reach the quota for a win, then extract at the right edge when you choose. RETRIEVE: PICK UP the cargo (the whole field then hunts the carrier, who can’t sprint), HAND OFF if needed, carry it out the right edge. ESCORT: keep the transport alive from the left edge to the right; at each fork, tap a route on the map (NORTH, AHEAD or SOUTH, where the streets are open). You can set the route at forks ahead of time (lit ✓); an unset fork stops it. HOLD makes it wait a round; HURRY makes it sprint its next move (3 of each per hunt). The gold dashed ring shows where its next move ends; T in the turn strip is its turn. In ESCORT and RETRIEVE a mech at the right edge waits there; the hunt ends when the transport or cargo comes out, or when all your mechs are out. Lose if both mechs are destroyed.'],
  ['Turns', 'Everyone acts in initiative order (strip, top right). On your mech\'s turn you spend AP (the ● pips). END TURN passes to the next unit.'],
  ['Move', 'Tap the map to plot a path. Pick CREEP, NORM or SPRINT, then tap MOVE. Faster covers more ground but is louder.'],
  ['Find', 'Enemies are hidden. A contact is a red square with a circle: the circle is how unsure you are. Passive sensors draw cyan bearing lines; two crossing lines make a fix. RADAR gives a sharp fix but is very loud.'],
  ['Fight', 'Tap a contact to select it. FIRE needs a tight fix, range and line of sight; the button says why if it\'s blocked, or shows your hit chance. Hits strike a part (core, legs, weapon, sensors). Cover (a wall or scrap close to the target) costs −25%, unless you are right up against the same piece of cover yourself. MORTAR fires on a fix with no line of sight, but scatters more on a fuzzy one.'],
  ['Noise', 'Two kinds. EMIT (orange bar, orange dashed ring) is electronic: radar, ECM and uplink add to it, it fades a little each turn, and passive sensors pick it up from far away. SOUND (pale ring with ticks) is moving and shooting: one radius per turn (the loudest thing you did), heard through walls, gone at your next turn.'],
  ['Ground', 'Every hunt is a new district (the job card gives its size), packed from irregular city pieces, so streets jog, narrow and dead-end. Blue dotted areas are quiet ground: you are harder to hear there. Amber hatched areas are noise: fixes on anything inside are blurry. Brown speckled scrap is slow (2 tiles of movement a tile) and loud (+3 sound), but it is low cover. Rusty outlined shapes are walls: set pieces in the blocks, and barricades that shut a street. A chicane (walls on alternate lanes) can be weaved through but not seen past.'],
  ['ID', 'Enemies come in 9 variants. Tap a contact to see what your sensors have picked up about it, open the CARD to compare, then tap ID to call it. A turret or emplacement call freezes its track; a right call before eyes adds +10% to hit.'],
  ['ECM', 'ECM masks you each turn it is on. GHOST places a fake contact for enemies.'],
  ['Camera', 'Drag to pan. Z+ / Z− zoom. CTR recentres.'],
  ['Look', 'Hover the mouse over anything on the map, or hold a finger on it, to see what it is and what it does.'],
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
const PAGES = () => [{ round: TEST.round, title: 'New in this build', lines: TEST.newThings }, ...HISTORY];
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
  const seen = seenGet(), missed = HISTORY.filter(h => seen && h.round > seen).length;
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
