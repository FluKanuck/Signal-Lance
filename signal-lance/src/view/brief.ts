// Tester splash, basics screen and end-of-hunt questions (chore, R11). View only.
// UPDATE TEST + QUESTIONS EVERY ROUND: they tell remote testers what this build is testing.
import { $ } from './hud.ts';
import { TUNE } from '../tune.ts';

export const TEST = {
  title: 'Round 15 test: Pick your fights (step 3: Escort, all four jobs)',
  question: 'When the job is more than "stand on the uplink", does reading the field change which fights you take, how you take them and when you leave?',
  newThings: [
    'NEW (r15-s3): ESCORT jobs. A friendly transport (green diamond) walks from the left edge to the right along a route (green lines). Enemies can see, hear and shoot it like one of your mechs. If it dies, the hunt fails.',
    'At each fork it stops and waits: tap NORTH or SOUTH on the map (big green buttons) on your turn. Scout ahead and listen before you choose. It walks ' + TUNE.ESCORT_MOVE + ' tiles each round.',
    'Win when it walks out the right edge: pay + a bonus for the hits it has left. Careful: one of your mechs reaching the right edge first still pulls the whole lance out without it.',
    'Jobs now roll all four types: UPLINK, BOUNTY (kills pay, reach the quota, leave when you choose), RETRIEVE (grab the cargo, the field hunts the carrier) and ESCORT. The type and goal are on top of each job card.',
    'TEST BED: "Fork" (listen before you pick) and "Shadow" (time the call on a patrol). The Bounty and Retrieve scenarios are still there.',
  ],
  howTo: 'Play Fork and Shadow first, then about 10 hunts in contracts with all four types rolling. After each hunt, tap the answers (the first one matters most) and add a note. When you finish, tap SEND LOG and send it to Jamie.',
};
// End-of-hunt questions (tap one answer each; optional). Answers go into the log line, next to the hunt's job type.
export const QUESTIONS = [
  { k: 'read', q: 'On this job, reading the field…', a: ['Changed my plan', "Didn't change it", 'Not sure'] },
  { k: 'how', q: 'What it changed most…', a: ['Which fights', 'How I fought', 'When I left', 'Which route', 'Nothing'] },
  { k: 'feel', q: 'This job felt…', a: ['Its own thing', 'Uplink with extra steps', 'Just a brawl'] },
];

const BASICS = [
  ['Goal', 'Each job has a type (top of the job card). UPLINK: stand in the gold ring and tap UPLINK on 3 turns, or destroy every enemy. BOUNTY: kills pay their bounty (prices on the CARD); reach the quota for a win, then extract at the right edge when you choose. RETRIEVE: PICK UP the cargo (the whole field then hunts the carrier, who can’t sprint), HAND OFF if needed, carry it out the right edge. ESCORT: keep the transport alive from the left edge to the right; at each fork, tap a route on the map. Lose if both mechs are destroyed.'],
  ['Turns', 'Everyone acts in initiative order (strip, top right). On your mech\'s turn you spend AP (the ● pips). END TURN passes to the next unit.'],
  ['Move', 'Tap the map to plot a path. Pick CREEP, NORM or SPRINT, then tap MOVE. Faster covers more ground but is louder.'],
  ['Find', 'Enemies are hidden. A contact is a red square with a circle: the circle is how unsure you are. Passive sensors draw cyan bearing lines; two crossing lines make a fix. RADAR gives a sharp fix but is very loud.'],
  ['Fight', 'Tap a contact to select it. FIRE needs a tight fix, range and line of sight; the button says why if it\'s blocked, or shows your hit chance. Hits strike a part (core, legs, weapon, sensors). MORTAR fires on a fix with no line of sight, but scatters more on a fuzzy one.'],
  ['Noise', 'Two kinds. EMIT (orange bar, orange dashed ring) is electronic: radar, ECM and uplink add to it, it fades a little each turn, and passive sensors pick it up from far away. SOUND (pale ring with ticks) is moving and shooting: one radius per turn (the loudest thing you did), heard through walls, gone at your next turn.'],
  ['Ground', 'Blue dotted areas are quiet ground: you are harder to hear there. Amber hatched areas are noise: fixes on anything inside are blurry.'],
  ['ID', 'Enemies come in 9 variants. Tap a contact to see what your sensors have picked up about it, open the CARD to compare, then tap ID to call it. A turret or emplacement call freezes its track; a right call before eyes adds +10% to hit.'],
  ['ECM', 'ECM masks you each turn it is on. GHOST places a fake contact for enemies.'],
  ['Camera', 'Drag to pan. Z+ / Z− zoom. CTR recentres.'],
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
export function buildBrief(build: string) {
  $('spTitle').textContent = TEST.title + ' · ' + build;
  $('spBody').innerHTML = '<p><b>The game:</b> you run two mechs, A and B. Find hidden enemies with your sensors, then win the hunt.</p>' +
    '<p><b>This test:</b> ' + esc(TEST.question) + '</p><p><b>New in this build:</b></p><ul>' + TEST.newThings.map(t => '<li>' + esc(t) + '</li>').join('') + '</ul>' +
    '<p>' + esc(TEST.howTo) + '</p>';
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
