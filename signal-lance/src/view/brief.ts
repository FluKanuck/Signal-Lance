// Tester splash, basics screen and end-of-hunt questions (chore, R11). View only.
// UPDATE TEST + QUESTIONS EVERY ROUND: they tell remote testers what this build is testing. When a round ends, move its
// newThings (condensed) to the top of HISTORY, so a returning tester can page back through everything since they last played.
import { $ } from './hud.ts';
import { TUNE } from '../tune.ts';
import { ENTRIES } from './glossary.ts';
import type { Entry, Screen } from './glossary.ts';

export const TEST = {
  title: 'Round 24 test: Say what it means',
  question: 'With long-press explanations and clear reasons on greyed buttons, can you read the hunt without help?',
  newThings: [
    'NEW (r24-s3): the words on every screen follow one rule: one name per thing, short sentences, and the reason for every limit.',
    'NEW: the company tab for repairs, rounds and shells is now REFIT. The ship module is the EXOS BAY. WHAT IT COST names the ExoS (ExoS B LOST), not its operator.',
    'NEW: ESCORT has a ROUTE bar above the bottom buttons. It has one button for each way at each fork ahead. A ✓ marks the way you set.',
    'NEW: when the transport takes a hit, a line at the top says how many hits it has left. At half or less, the line turns red.',
    'NEW: the scan says which DROP ZONE is picked and how to change it.',
    'NEW: the contract result shows THE BOOKS: credits at the start, hunt pay, spending, the fee and bonus, wages, upkeep and credits now. Each line adds up.',
    'NEW: job cards show the completion bonus (+' + TUNE.CONTRACT_BONUS + ' cr) next to the fee. BAIL CONTRACT says that you lose both, and that hunt pay you earned stays.',
    'NEW: THE BOOKS on the company screen list every way the company can fold.',
    'NEW (r24-s2): on a phone held sideways, the HUD is one line: the ExoS, AP, EN, the objective and any warning. Tap the line to see the full HUD, and tap it again to close it.',
    'NEW: the map keeps your active ExoS, the selected contact and the objective clear of the buttons. Contact labels near the right edge flip to the left.',
    'NEW: map labels no longer print on top of each other. ExoS names, PAINTED and contact labels move apart, on the hunt map and the after-action map.',
    'TEST BED: “Crowded phone”. Three contacts and the uplink sit near the right edge. Find and tap each one.',
    'NEW (r24-s1): long-press anything to see what it is. Hold a finger on a button, a HUD word, a contact, a tag, a mark or the ground. On a computer, right-click it.',
    'The explain card opens at the top left. Any tap closes it. A long-press never fires the button or sets a move.',
    'NEW: a greyed button says why when you tap it. Example: FIRE · NO SIGHT, then “No line of sight. Move until the contact is in view.”',
    'NEW: the greyed button shows its reason in words: NO SIGHT, NO LOCK, OUT OF RANGE, HEARD ONLY, LEG DAMAGED, NEED AP.',
    'NEW: low hits. A hit ExoS with ' + TUNE.WARN_HITS_LEFT + ' CORE hits or fewer left gets a red ring and “! N” on the map. The HUD says “A: 2 CORE hits left”.',
    'NEW: LAST SEEN. A contact that drops off your picture leaves a faded mark with its round, for ' + TUNE.LASTKNOWN_ROUNDS + ' rounds. You can’t target it.',
    'NEW: GAMEPLAY BASICS reads from the glossary, by screen. BACK is at the top too.',
    'One name per thing: ExoS (not mech), NORMAL (not NORM), the part names MAST, ARMS, CORE, BACK and LEGS, ESM (not passive ears), SCAN (the tag that was SHIP).',
    'FIXED: a tap on empty ground or on your own ExoS clears the selected contact. A greyed NORMAL or SPRINT no longer traps a lame ExoS. The objective line says which ExoS its distance is from.',
    'TEST BED: “Read it cold”. One hunt turn with a blocked FIRE, a lame ExoS, one low on hits, an UNKNOWN ESM contact and a LAST SEEN mark.',
  ],
  round: 24,
  howTo: 'Play “Read it cold” and “Crowded phone” first. Long-press everything you don’t know, then tap each greyed button. Then play a contract or two and tap the answers after each hunt. When you finish, tap SEND LOG and send it to Jamie.',
};
const R20_NEW = [
    'NEW (r20-s4): learn why. After every hunt the result screen has THE SCAN: a line per stretch of your scan (which sensors, where each looked: full map or the map area its ring was in, the altitude, the minutes, what came back, the risk it added), then what the drop rolled (the step, how many were awake, painted or not, units that joined). SEND LOG carries the same lines as [SCAN].',
    'NEW (r20-s3): ship ALTITUDE (the ALT row on the scan screen). HIGH: every ring covers more ground, but the sensors are weaker (thermal much weaker), fixes are fuzzier, and it’s quieter on the risk meter. LOW: small rings, but stronger sensors (thermal much stronger), sharper fixes, and louder. MID is the standard scan. Change it any time; a fix keeps the sharpness of the height it was taken at.',
    'NEW (r20-s3): every job card starts with its scan time: SCAN WINDOW N MIN (amber) or NO TIME LIMIT (green).',
    'NEW (r20-s2, your fix list): run several sensors at once. Tap RADAR, THERMAL or EM LISTEN to turn it on; each gets its own ring on the map in its colour. Drag near a ring to move that one; tap the map to jump the outlined (selected) one. Tap a selected sensor again to turn it off.',
    'NEW: FULL MAP (the dashed button next to the sensors) sends the selected sensor over the whole map at a quarter strength; a dashed frame in its colour shows it. Tap RING to aim it again.',
    'NEW: the clock never runs out. START CLOCK, PAUSE to think (nothing happens while paused), RESUME. But time costs: the RISK meter climbs while sensors are on (radar is loud, thermal quiet, EM almost silent) and cools while the clock runs with every sensor off. Each new step may call a unit in; the step you DROP at decides how much of the field is awake (and from step 2 whether the ship is painted: 2 patrols waiting near your drop zone).',
    'NEW: waiting isn’t free either: patrols keep walking, and now and then a new patrol arrives while you are on station.',
    'NEW: some jobs have a DEADLINE (on the job card): the ship has that many ship-minutes on station, then the scan ends and you drop. (Scan screen only for now.)',
    'From r20-s1: RADAR = where (pings everything, even silent units, never names them; outlines zones; opens the north and south drop zones). THERMAL = what’s alive (zone types, warm units and their size; cold turrets hidden). EM LISTEN = who (only transmitters: a count, then a fix with the CARD’s best guess). Three bars on a contact = how hard radar / thermal / EM have looked. Old fixes on moving units go dashed with “4m ago”. Fixes start the hunt as SHIP contacts.',
    'TEST BED: "Loud and fast" (radar has been on the full map a while: the risk meter is just under step 1) and "Where first" (two units here never transmit). "Long listen" and "Quiet drop" still play the old listen dial.',
]; void R20_NEW; // R21: Round 20's build notes (its HISTORY page is the condensed version)
const R19_NEW = [
    'NEW (r19-s1): after you take a job, the ship can LISTEN before you drop. Pick SKIP, SHORT, MEDIUM or LONG, then tap LISTEN. Each step gives you everything below it, plus: SHORT = the field roster (types, variants, how many) and where the zones are; MEDIUM = what each zone is, and a choice of ' + TUNE.DROP_ZONES + ' drop zones (west, north or south edge); LONG = blips for everything that emits.',
    'NEW: a blip is where that unit was when the ship listened (patrols move before you land), with the ship’s best guess from the CARD (“line? 1 of 3” = three variants fit). Silent units, like most turrets, never show up. In the hunt, blips start as stale orange contacts tagged SHIP, with the ship’s notes already on them.',
    'NEW: zones aren’t free any more. Skip the scan and you don’t see them at all. SHORT shows grey outlines (ZONE ?). MEDIUM shows quiet and noise as before.',
    'NEW: hunt 1 is built after its scan: START CONTRACT → pick a job → scan → hangar → LAUNCH. The fits lock from there. Hunts 2 and 3 go job → scan → drop.',
    'NEW (r19-s2): listening has a cost: the ship emits for as long as it listens. SHORT: a chance of an extra enemy unit. MEDIUM: more chance of extras, and a quarter of the field wakes up knowing roughly where you landed (they come looking; the pack is on for that hunt). LONG: up to 3 extras, half the field awake, and a 50% chance the ship is painted: 2 patrols wait near your drop zone. The dial shows the risk before you listen; what you rolled shows on the result screen ("scan LONG: +1 unit, 4 alert, painted").',
    'NEW (r19-s3): the RWR (radar warning receiver), a MAST sensor in the hangar (weight 1, no draw). When an enemy radar sweeps over a suit carrying one, three range rings appear round that suit (close / medium / far, guessed from signal strength: a loud radar reads closer than it is) with a spoke pointing where it came from (±' + TUNE.RWR_BEARING_ERR + '°). The tip shows the type (open arc = search sweep, filled diamond = it has a lock on you) and the CARD’s best guess, “?” when unsure. Warnings fade over ' + TUNE.RWR_LIFE + ' rounds.',
    'NEW: heard standing vs heard moving. While you stand where it was heard, the spoke is solid. Once you move, the spoke freezes faint, a dashed wedge swings round to where the radar must be from where you are now, and the map shows a “heard here” tick with its bearing line. Near warnings swing a lot, far ones barely. Walk past the guess and the wedge goes; the spoke says stale. Tap a spoke or wedge for its tick and details.',
    'NEW (r19-s6): every ExoS has a built-in radar warning: when an enemy radar sweeps over it, a red dashed ring reads PAINTED and the round, fading over ' + TUNE.RWR_LIFE + ' rounds. That is all it tells you: no direction, range or type. The RWR module gives the full readout (rings, spoke, wedge, ID).',
    'FIXED (r19-s4): text on phones. Menus no longer shrink their text to fit the screen (they scroll instead), the game never scales below 85%, and the scan screen gives the map more room, says less once you have listened, and keeps blip labels from piling up.',
    'TEST BED: "Long listen" (forced LONG, the ship always painted), "Quiet drop" (the same job, no scan) and "Painted on the move" (the RWR).',
]; void R19_NEW; // R20: Round 19's build notes (its HISTORY page is the condensed version)
const R18_NEW = [
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
]; void R18_NEW; // R19: Round 18's build notes (its HISTORY page is the condensed version)
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
  { round: 23, title: 'Round 23: Who you’ll anger', lines: [
    'THE CITY (CONTRACTS tab): Corporate, Foundry and Syndicate hold the districts. ▼ SHIP shows where you are. The three jobs are in districts. Fuel = the links you jump. The faction that holds the ship’s district sets the fuel price.',
    'FACTION JOB (×' + TUNE.CITY_FACTION_PAY + '): a rival of the target hires you. The employer likes you more, and the target likes you less. BROKER JOB (×' + TUNE.CITY_BROKER_PAY + '): the job is deniable. Only the target notices.',
    'STANDING: one bar per faction. HATED (≤ ' + TUNE.STANDING_HATED + '): danger +1 step, +' + Math.round(TUNE.STANDING_HATED_ALERT * 100) + '% of their field awake, fuel costs more. LIKED (≥ +' + TUNE.STANDING_LIKED + '): their jobs pay more, a FREE SCAN against their enemies, fuel costs less. Standing fades ' + TUNE.STANDING_DRIFT + ' a contract.',
    'Factions are RIVALS, NEUTRAL or ALLIES with each other. Each city rolls this. Every standing change spills onto the other factions.',
  ] },
  { round: 22, title: 'Round 22: What happened', lines: [
    'After every hunt, the AFTER-ACTION PAGE opens. WHAT HAPPENED lists up to ' + TUNE.AAR_MAX_MOMENTS + ' turning points: who found whom, hits that mattered, how the job swung, and the end.',
    'WHAT IT COST lists people, repairs, pay, salvage and the books. “← T7” = the turning point behind that line. Tap a turning point to see it on the map as it was at that turn. DETAILS keeps the old panels.',
    'HELD THE FIELD (job done): you see the whole story, and your downed ExoS come home (rebuild at half cost). FIELD LOST: the enemy side shows as ??? with a rough direction, and the wrecks stay out there.',
    'The books: every job pays ×' + TUNE.PAY_MULT + '. A completed contract adds a ' + TUNE.CONTRACT_BONUS + ' cr bonus. A new company starts with ' + TUNE.START_FUEL + ' fuel.',
  ] },
  { round: 21, title: 'Round 21: The company', lines: [
    'The game opens on your COMPANY, and it saves the company on this phone. Named operators have one skill each (STEADY AIM, QUIET MOVER, SHARP EARS, SENSOR TECH). They earn XP and level up.',
    'When an ExoS goes down, its operator is CRITICAL. Carry them out, and they are benched for a while. Leave them, and they are KIA, on the MEMORIAL. Recruits come between contracts.',
    'The roster: 3 ExoS, each with its own fit and damage. You keep them from hunt to hunt and from contract to contract. Before every hunt, pick a lance of 1 to 3.',
    'The books: three contract offers (danger, 2 to 4 hunts, a fee on completion, fuel to get there). You pay wages and ship upkeep when a contract ends. The company can be in debt once. After that, it folds.',
    'Repairs and rebuilds use parts (salvaged from kills, or bought). The MARKET sells parts, fuel, items, an ExoS now and then, and recruits. The hangar fits only what you own.',
    'The ship: 7 hardpoints for modules (sensor boosts, quiet drop rig, ExoS bay, repair bay, medbay, salvage hold, fuel tanks, hull armour, berths and more). A painted ship may take a hull hit.',
  ] },
  { round: 20, title: 'Round 20: Eyes from the ship', lines: [
    'The ship’s scan is live: START CLOCK / PAUSE, with no time cap. RADAR = where. It pings everything, even silent units, outlines zones and opens the north and south drop zones.',
    'THERMAL = what’s alive: zone types, warm units and their size. EM LISTEN = who. It hears only transmitters: first a count, then a fix and the CARD’s best guess.',
    'Run any mix of sensors at once. Each sensor has its own ring (drag near a ring to move it), or use FULL MAP. Three bars on a contact show how hard each sensor looked.',
    'ALT HIGH / MID / LOW. HIGH: big, weak, fuzzy rings, and quiet. LOW: small, strong, sharp rings (thermal most), and loud.',
    'The RISK meter climbs while sensors are on and cools with them all off. A new step may add enemy units. The step you drop at wakes part of the field. From step 2, it may paint the ship.',
    'Patrols walk, and new patrols arrive while you wait. Some jobs have a SCAN WINDOW. The job card shows it first.',
    'After the hunt, THE SCAN on the result screen gives one line per stretch of your scan (set-up, minutes, what came back, risk added). It also shows what the drop rolled. SEND LOG sends these as [SCAN] lines.',
  ] },
  { round: 19, title: 'Round 19: Listen before you land', lines: [
    'After you pick a job, the ship can LISTEN: SKIP / SHORT / MEDIUM / LONG. SHORT = the roster and zone outlines. MEDIUM = zone types and a choice of 3 drop zones. LONG = blips for everything that emits, with the CARD’s best guess.',
    'Blips start the hunt as stale SHIP contacts. You only know the zones through the scan.',
    'Listening has costs. At any level: extra enemy units. MEDIUM and up: part of the field is awake, with a rough fix on your drop zone. LONG: maybe a painted ship, with 2 patrols waiting near your drop zone. The dial shows the risk. The result screen shows what happened.',
    'The game builds hunt 1 after its scan. The fits then lock for the contract.',
    'Every ExoS knows when a radar paints it (a red PAINTED ring). The RWR module adds the readout: range rings, a spoke to the radar, search vs lock and a best-guess ID. When you move, a wedge swings to where the radar must be.',
    'Text on phones is bigger. Menus scroll instead of shrinking. The game never scales below 85%.',
  ] },
  { round: 18, title: 'Round 18: Fit for the job', lines: [
    'The HANGAR is the loadout screen. Tap a part of the ExoS, then tap a hardpoint to fit something to it. Start from Scout (Wisp), Line (Warden) or Brawler (Bulwark).',
    'Weight: over the rated load, every move is louder and costs more Energy per tile (CREEP too). Far over it, each move costs +1 AP. Power = reactor output − draw. Batteries add to the pool.',
    'Each location is a part. When you lose a part, its modules go offline. Only shots from behind hit the BACK.',
    'THERMAL: heat comes from the reactor, the frame’s size, firing and sprinting. Turrets carry IR sights. Thermal optics lets you read heat. A sniper turret hits targets up to 20 tiles away.',
    'Contacts carry stacked sense tags (EO, RDR, ESM, IR, ACO, MZL), each with the ExoS that made it. Gold = the tag that holds the fix. ESM sits on the best fit of your bearing lines. A noise zone only widens it. Cover shows as a shield.',
    'INTEL lists what the field listens on. The result screen says what found you first. PLAY SEED replays a hunt. QUIT goes back to the hangar. The game scales to its window.',
  ] },
  { round: 17, title: 'Round 17: Eyes on the street', lines: [
    'Drag from your ExoS to draw your move freehand. The line goes round walls. If you draw through scrap, the move crosses it (on purpose). Cyan = this turn’s AP. Red dashed = past it.',
    'Drag the end handle to extend the line, or drag the middle to redraw from there. Tap-to-move still works.',
    'Aim your eyes as you walk. Tap a point on your line. Then tap where the ExoS should look. Drag the eye marker to move it. You can place up to 3 per move. Turning is free now.',
    'Your eyes work on every step. Anything new stops the move on that tile ("CONTACT — move stopped"). You keep the AP you didn’t spend.',
    'Scrap and rubble are low cover (−15%). Walls are −25%. When you aim at a target in cover, the game outlines the piece that gives the cover.',
  ] },
  { round: 16, title: 'Round 16: Rolled ground', lines: [
    'Every hunt is a new district. The game packs it from irregular city pieces (half blocks, strips, L shapes, hand-drawn blocks) and cuts it at the map edge. The job card gives its size. Bigger districts have a bigger field.',
    'Brown speckled scrap and rubble: slow (2 tiles of movement a tile), loud (+3 sound), low cover. Rusty walls are set pieces and street barricades. You can weave through a chicane, but you cannot see past it.',
    'You start in a cleared staging area. Hover over anything on the map, or hold a finger on it, to see what it is. Cover that you share with your target (you both stand against it) does not count.',
    'ESCORT: up to three routes per fork (NORTH / AHEAD / SOUTH), and ROUTE buttons to set forks ahead. A ring shows where the next move ends. You can give HOLD and HURRY orders. The transport is in the turn strip.',
    'Every ExoS leaves on its own: walk into the green zone and tap EXTRACT. The hunt ends when all your living ExoS are out.',
  ] },
  { round: 15, title: 'Round 15: Pick your fights', lines: [
    'Jobs come in four types, shown at the top of each job card: UPLINK (stand in the ring and tap UPLINK), BOUNTY, RETRIEVE and ESCORT.',
    'BOUNTY: every kill pays that enemy’s bounty (prices on the CARD). Reach the quota to win, then tap EXTRACT when you choose. The field has extra enemies.',
    'RETRIEVE: PICK UP the guarded cargo. This alerts the whole field, and the field hunts the carrier. The carrier cannot SPRINT. HAND OFF to the other ExoS. Carry the cargo out the right edge.',
    'ESCORT: a friendly transport walks from the left edge to the right edge. Keep it alive. At each fork, it waits for you to tap a route on the map.',
  ] },
  { round: 14, title: 'Round 14: Read the signature', lines: [
    'Every enemy is one of 9 variants (3 patrols, 3 turrets, 3 emplacements). The variants fight differently.',
    'Tap a contact to see what your sensors detected (EMIT, pulses, moved or still, steps or a shot heard). The CARD lists the 9 variants, each with one bold TELL. "3 fit" shows how many variants still match.',
    'ID calls a contact. A call on a turret or emplacement freezes its track. A right call before your eyes see the contact adds +10% to hit.',
    'The TEST BED (on the HANGAR screen) has short scenarios. Each one tests one thing.',
  ] },
  { round: 13, title: 'Round 13: Loud gets company', lines: [
    'You make noise in two ways. EMIT (orange) is electronic: radar, ECM and uplink. It grows, fades slowly and carries far.',
    'SOUND (pale ring with ticks) comes from moving and shooting. It has one radius per turn, carries through walls, and is gone at your next turn. A contact that you only hear is a hollow SOUND square. It is never enough to shoot at.',
    'Patrols carry radios (a small, steady EMIT), so passive sensors find them. Turrets stay silent.',
    'Two legs: lose one, and you can only CREEP. Lose both, and you CREEP at half distance.',
    'THE PACK (splash toggle): when one enemy senses you, it alerts others nearby. Patrols leave their posts to hunt you.',
  ] },
  { round: 12, title: 'Round 12: Pick your shot', lines: [
    'Shots roll to hit. FIRE shows your chance, and the yellow ODDS line shows why (range, target moved, cover, a loud target).',
    'A hit strikes a part: CORE, LEGS, ARMS (weapon) or MAST (sensors). The same rules apply to the enemy. Part damage carries through the contract. REPAIR fixes the worst part first.',
  ] },
];
// End-of-hunt questions (tap one answer each; optional). Answers go into the log line, next to the hunt's job type.
export const QUESTIONS = [
  { k: 'cold', q: 'Did you understand the hunt without needing to ask anyone?', a: ['Yes', 'Mostly', 'No', 'Something else'] }, // R24 focus 2
  { k: 'why', q: 'When a button was greyed, did you know why?', a: ['Yes, it said', 'Mostly', 'No', 'Didn’t notice'] }, // A3
  { k: 'press', q: 'The long-press card was…', a: ['Useful', 'Too long', 'Hard to open', 'Didn’t use it'] }, // A2
]

// R24 A4: GAMEPLAY BASICS reads from the glossary. Grouped by screen: a few plain how-to lines, then every glossary term of
// that screen (its name and line). The how-to lines follow the house standard (strict: 20 words or fewer a sentence).
const BASICS: { title: string; screens: Screen[]; how: string[] }[] = [
  { title: 'The city and the company', screens: ['city', 'company'], how: [
    'The game opens on your COMPANY. It saves on this phone.',
    'CONTRACTS shows the city map. Tap a district to see its JOB, then tap TAKE IT.',
    'Before every hunt, pick who drops in each ExoS. Tap the button next to it.',
    'Between contracts, use the tabs: REFIT for repairs, MARKET to buy, SHIP for modules.',
  ] },
  { title: 'The ship’s scan', screens: ['scan'], how: [
    'After you take a job, the ship scans the district before you drop.',
    'Turn sensors on. Drag each ring onto what matters, or use FULL MAP.',
    'Tap START CLOCK. Tap PAUSE to think. Time passes only while the clock runs.',
    'Watch the RISK. When you are ready, pick a DROP ZONE and tap NEXT.',
  ] },
  { title: 'The hangar', screens: ['hangar'], how: [
    'Tap a part of the ExoS, then tap a hardpoint to fit an item you own.',
    'The readout shows LOAD, POWER and what you give off: EMIT, IR and SOUND.',
    'The fits lock when you LAUNCH HUNT 1, until the contract ends.',
  ] },
  { title: 'The hunt', screens: ['hunt'], how: [
    'Everyone acts in the ORDER strip, top right. On your ExoS’s turn, spend its AP.',
    'To move, tap the map or drag from your ExoS. Pick CREEP, NORMAL or SPRINT. Then tap MOVE.',
    'Tap a contact to select it. Then FIRE, ID or RADAR use it.',
    'A greyed button says why on a tap. END TURN passes to the next unit.',
    'On a phone the HUD is one line. Tap it to see all of it.',
  ] },
  { title: 'Contacts', screens: ['contact'], how: [
    'Enemies are hidden. Your sensors fix them as contacts. The tags say which sensor fixed each one.',
    'Gold is the tag that holds the fix now. The letters after a tag name the ExoS that sensed it.',
  ] },
  { title: 'Map marks', screens: ['map'], how: [
    'Long-press any mark, ring, line or patch of ground to see what it is.',
  ] },
  { title: 'The CARD', screens: ['card'], how: [
    'Open the CARD to compare what your sensors noted with each variant. Then tap ID to make your call.',
  ] },
  { title: 'After the hunt', screens: ['after'], how: [
    'The after-action page opens after every hunt. WHAT HAPPENED lists the turning points.',
    'Tap SAVE & NEXT to go on.',
  ] },
];
const BASICS_EXTRA = [ // facts the glossary doesn't hold (house standard, strict)
  ['Camera', 'Drag the map to pan. Z+ and Z− zoom. CTR centres on the active ExoS.'],
  ['Debug', 'DEBUG: REROLL JOBS rolls new jobs for the same hunt. It is for testers, to get the job type they want.'],
];
function basicsHtml() {
  const term = (e: Entry) => '<div class="bst"><b>' + esc(e.name) + '</b>: ' + esc(e.line) + '</div>';
  return '<p><b>Long-press anything to see what it is.</b> On a computer, right-click it. A tap on a greyed button says why it is greyed.</p>' +
    BASICS.map(B => '<h4>' + esc(B.title) + '</h4>' + B.how.map(l => '<p>' + esc(l) + '</p>').join('') +
      ENTRIES.filter(e => B.screens.includes(e.screen)).map(term).join('')).join('') +
    '<h4>More</h4>' + BASICS_EXTRA.map(([h, t]) => '<p><b>' + h + ':</b> ' + esc(t) + '</p>').join('');
}

// Simple legend, drawn with the same colours as the game.
const LEGEND = `<svg viewBox="0 0 300 300" width="300" height="300" style="max-width:100%;font:bold 12px monospace" aria-label="Map legend">
<rect x="0" y="0" width="300" height="300" fill="#2c2d30" rx="6"/>
<circle cx="28" cy="26" r="9" fill="#fff"/><line x1="28" y1="26" x2="44" y2="26" stroke="#fff" stroke-width="3"/><circle cx="28" cy="26" r="15" fill="none" stroke="#9cf" stroke-width="2"/>
<text x="60" y="30" fill="#ddd">Your ExoS (blue ring = its turn)</text>
<circle cx="28" cy="64" r="14" fill="none" stroke="#f33" stroke-width="2"/><rect x="23" y="59" width="10" height="10" fill="#f33"/>
<text x="60" y="68" fill="#ddd">Contact (circle = how unsure)</text>
<circle cx="28" cy="102" r="14" fill="none" stroke="#f90" stroke-width="2"/><rect x="23" y="97" width="10" height="10" fill="#f90"/>
<text x="60" y="106" fill="#ddd">LOST TRACK (last guess)</text>
<line x1="10" y1="146" x2="48" y2="128" stroke="#3dd" stroke-width="2"/>
<text x="60" y="142" fill="#ddd">BEARING (cross two)</text>
<circle cx="28" cy="176" r="15" fill="rgba(255,204,51,.15)" stroke="#fc3" stroke-width="2"/><path d="M28 168 L36 176 L28 184 L20 176 Z" fill="none" stroke="#fc3" stroke-width="2"/>
<text x="60" y="180" fill="#ddd">UPLINK</text>
<circle cx="28" cy="214" r="15" fill="none" stroke="rgba(255,150,50,.6)" stroke-width="2" stroke-dasharray="6 4"/>
<text x="60" y="218" fill="#ddd">EMIT: how far sensors hear you</text>
<circle cx="250" cy="214" r="13" fill="none" stroke="rgba(232,244,255,.7)" stroke-width="2"/><path d="M263 214 h6 M231 214 h6 M250 195 v6 M250 227 v6" stroke="rgba(232,244,255,.7)" stroke-width="2"/>
<text x="198" y="246" fill="#ddd">SOUND ring</text>
<rect x="12" y="236" width="32" height="20" fill="rgba(90,150,255,.24)" stroke="rgba(120,175,255,.7)" stroke-width="2" stroke-dasharray="2 4"/>
<text x="60" y="251" fill="#ddd">QUIET</text>
<rect x="12" y="268" width="32" height="20" fill="rgba(255,200,70,.12)" stroke="rgba(255,200,70,.7)" stroke-width="2" stroke-dasharray="8 4"/>
<path d="M12 288 L32 268 M22 288 L42 268 M32 288 L44 276" stroke="rgba(255,200,70,.35)"/>
<text x="60" y="283" fill="#ddd">NOISE</text>
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
  $('spBody').innerHTML = '<p><b>The game:</b> you run a company of ExoS (A, B and C). Find hidden enemies with your sensors, then win the hunt.</p>' +
    '<p><b>Long-press anything to see what it is.</b> On a computer, right-click it.</p>' +
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
  $('bsText').innerHTML = basicsHtml();
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
