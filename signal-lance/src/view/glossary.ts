// R24 checkpoint A: the game's glossary. One entry per term, contact tag, map mark, stat, part state and blocked reason.
// name = the exact on-screen label (one name per thing). line = one or two plain sentences, 25 words or fewer, no
// semicolons (house standard: .claude/skills/signal-lance-writing/SKILL.md, strict mode). Long-press, GAMEPLAY BASICS and
// the greyed-button reasons all read from here. A new or renamed term goes in here in the same commit.
import { TUNE } from '../tune.ts';
import { REASONS, PART_CODES } from '../sim/reasons.ts';

export type Screen = 'hunt' | 'map' | 'contact' | 'scan' | 'city' | 'company' | 'hangar' | 'card' | 'after' | 'why';
export type Entry = { id: string; name: string; line: string; screen: Screen; see?: string[] };

const pc = (x: number) => Math.round(x * 100) + '%';
const MV = (m: string) => TUNE.MOVE_TILES_PER_AP[m] + ' tile' + (TUNE.MOVE_TILES_PER_AP[m] > 1 ? 's' : '') + ' per AP, ' +
  (TUNE.MOVE_ENERGY_PER_TILE[m] ? TUNE.MOVE_ENERGY_PER_TILE[m] + ' EN a tile' : 'no EN') + ', SOUND ' + TUNE.SOUND_RANGE[m];

// ---- the terms, grouped by the screen they live on (GAMEPLAY BASICS shows them in this order) ----
const TERMS: Entry[] = [
  // the hunt: HUD and buttons
  { id: 'ExoS', name: 'ExoS', screen: 'hunt', line: 'Your walking war machine. You drop 1 to 3 of them on a hunt, each with an operator. A, B and C name them.' },
  { id: 'ROUND', name: 'ROUND', screen: 'hunt', line: 'One pass of the ORDER strip. Every ExoS, every enemy and the transport take one turn in each round.' },
  { id: 'ORDER', name: 'ORDER', screen: 'hunt', line: 'The turn order for this round. Letters are your ExoS. A ? is an enemy you have a contact on. T is the transport.' },
  { id: 'AP', name: 'AP', screen: 'hunt', line: 'Action points. Moves, shots and most actions cost AP. You get +' + TUNE.AP_PER_TURN + ' each turn and keep up to ' + TUNE.AP_BANK_MAX + '.' },
  { id: 'EN', name: 'EN', screen: 'hunt', line: 'Energy. Fast moves, RADAR, ECM and GHOST use it. Your reactor gives some back at the start of each turn.' },
  { id: 'EMIT', name: 'EMIT', screen: 'hunt', line: 'Your electronic noise. RADAR, ECM and UPLINK add to it. Enemy ESM hears it from far away. It falls ' + TUNE.SIGNAL_DECAY + ' each turn.' },
  { id: 'SOUND', name: 'SOUND', screen: 'hunt', line: 'The noise of your moves and shots this turn, drawn as a pale ring. Enemies inside it hear you, through walls. It clears next turn.' },
  { id: 'IR', name: 'IR', screen: 'hunt', line: 'Heat. Your IR is how hot you are. Firing and SPRINT add heat. An IR tag means a heat sensor fixed that contact.' },
  { id: 'ECM', name: 'ECM', screen: 'hunt', line: 'ECM hides your EMIT to ' + pc(TUNE.ECM_MASK_MULT) + ' while it is on. It costs ' + TUNE.AP_ECM + ' AP and ' + TUNE.ECM_EN + ' EN each turn. Tap again to stop it.' },
  { id: 'GHOST', name: 'GHOST', screen: 'hunt', line: 'A fake contact for the enemy. Tap GHOST, then tap the map. It lasts ' + TUNE.GHOST_TURNS + ' of your turns. Enemies hunt it like an ExoS.' },
  { id: 'RADAR', name: 'RADAR', screen: 'hunt', line: 'An active sensor. It finds units, even silent ones, through up to ' + TUNE.RADAR_MAX_WALLS + ' walls. It is loud: it adds a lot of EMIT.' },
  { id: 'CREEP', name: 'CREEP', screen: 'hunt', line: 'The quietest move: ' + MV('CREEP') + '. An ExoS with a damaged leg can only CREEP.' },
  { id: 'NORMAL', name: 'NORMAL', screen: 'hunt', line: 'A walk: ' + MV('NORMAL') + '.' },
  { id: 'SPRINT', name: 'SPRINT', screen: 'hunt', line: 'The fastest move: ' + MV('SPRINT') + '. It also adds heat (IR). The cargo carrier cannot SPRINT.' },
  { id: 'MOVE', name: 'MOVE', screen: 'hunt', line: 'MOVE walks the path you set. To set one, tap the map or drag from your ExoS. The cost shows on the button.' },
  { id: 'looks', name: 'looks', screen: 'hunt', line: 'Look points on a drawn path. Tap the path, then tap where the ExoS should look. You can set ' + TUNE.FACE_WAYPOINTS_MAX + ' per move.' },
  { id: 'MOVE STOPPED', name: 'MOVE STOPPED', screen: 'hunt', line: 'Your ExoS sensed a new contact, so the move stopped there. You keep the AP and EN for the part you did not walk.' },
  { id: 'TAP WHERE TO FACE', name: 'TAP WHERE TO FACE', screen: 'hunt', line: 'You tapped your own ExoS. Tap the map to turn it that way. Tap the ExoS again to cancel. Turning is free.' },
  { id: 'shots', name: 'shots', screen: 'hunt', line: 'Shots this ExoS fired this turn. Each ExoS can fire ' + TUNE.SHOTS_PER_TURN + ' times a turn.' },
  { id: 'ODDS', name: 'ODDS', screen: 'hunt', line: 'The chance that FIRE hits the selected contact now. Range, cover, your movement and a right ID change it.' },
  { id: 'AMMO', name: 'AMMO', screen: 'hunt', line: 'Gun rounds left in this ExoS. Buy more between hunts on the REFIT tab (+10 RDS).' },
  { id: 'SHELLS', name: 'SHELLS', screen: 'hunt', line: 'Mortar shells left in this ExoS. Buy more between hunts on the REFIT tab (+1 SHELL).' },
  { id: 'KILLS', name: 'KILLS', screen: 'hunt', line: 'Enemy units destroyed in this hunt, out of the whole field.' },
  { id: 'TIME', name: 'TIME', screen: 'hunt', line: 'Hunt time in minutes and seconds.' },
  { id: 'T', name: 'T', screen: 'hunt', line: 'The transport’s place in the ORDER strip.' },
  { id: 'FIRE', name: 'FIRE', screen: 'hunt', line: 'FIRE shoots the selected contact, or the best one. It needs a fix of ±' + TUNE.PLAYER_FIRE_UNC + ' tiles or better, range and line of sight.' },
  { id: 'MORTAR', name: 'MORTAR', screen: 'hunt', line: 'MORTAR lobs a shell over walls. Tap MORTAR, then tap a contact (aimed) or the map (blind). It is loud.' },
  { id: 'ID', name: 'ID', screen: 'hunt', line: 'Your call on which variant the selected contact is. A right call before you see it adds +' + TUNE.HIT_ID_BONUS + '% to hit. Compare with the CARD.' },
  { id: 'CARD', name: 'CARD', screen: 'hunt', line: 'The enemy reference. It lists every variant, what each one gives off, and the tell that sets it apart.' },
  { id: 'END TURN', name: 'END TURN', screen: 'hunt', line: 'Ends this ExoS’s turn. The next unit in the ORDER strip acts. Unspent AP carries over, up to ' + TUNE.AP_BANK_MAX + '.' },
  { id: 'UPLINK', name: 'UPLINK', screen: 'hunt', line: 'Stand in the gold ring and tap UPLINK, once a turn. ' + TUNE.UPLINK_TURNS + ' UPLINKs win. Each costs ' + TUNE.AP_UPLINK + ' AP and adds ' + TUNE.SIG_UPLINK + ' EMIT.' },
  { id: 'CARGO', name: 'CARGO', screen: 'hunt', line: 'Pick up the cargo and carry it out at the right edge. After the PICK UP, every enemy knows where the carrier is.' },
  { id: 'PICK UP', name: 'PICK UP', screen: 'hunt', line: 'Picks up the cargo. Stand within ' + (TUNE.UPLINK_RADIUS + 0.5) + ' tiles of its centre. It costs ' + TUNE.RETRIEVE_PICKUP_AP + ' AP.' },
  { id: 'HAND OFF', name: 'HAND OFF', screen: 'hunt', line: 'Gives the cargo to a lancemate within ' + TUNE.RETRIEVE_HANDOFF_RANGE + ' tiles. It costs ' + TUNE.RETRIEVE_HANDOFF_AP + ' AP.' },
  { id: 'BOUNTY', name: 'BOUNTY', screen: 'hunt', line: 'Each kill pays that enemy’s price from the CARD. Reach the quota to win, then EXTRACT when you choose.' },
  { id: 'EXTRACT', name: 'EXTRACT', screen: 'hunt', line: 'Takes this ExoS off the map. Stand in the green zone at the right edge first. It costs no AP.' },
  { id: 'TRANSPORT', name: 'TRANSPORT', screen: 'hunt', line: 'The unarmed vehicle you escort. It must walk out at the right edge. If the enemy destroys it, the hunt fails.' },
  { id: 'HOLD', name: 'HOLD', screen: 'hunt', line: 'An order to the transport: skip its next move. It costs no AP. Tap HOLD again to cancel.' },
  { id: 'HURRY', name: 'HURRY', screen: 'hunt', line: 'An order to the transport: SPRINT its next move, ' + TUNE.ESCORT_SPRINT + ' tiles, louder. It costs no AP. Tap HURRY again to cancel.' },
  { id: 'ROUTE', name: 'ROUTE', screen: 'hunt', line: 'The transport’s way at a fork. Pick it in the ROUTE bar above the bottom buttons, or on the map. A ✓ marks it.' },
  { id: 'TRANSPORT HIT', name: 'TRANSPORT HIT', screen: 'hunt', line: 'The enemy hit the transport. The line says how many hits it has left. At 0 it is destroyed and the hunt fails.' },
  { id: 'Z+', name: 'Z+', screen: 'hunt', line: 'Zooms the map in. Z− zooms out.' },
  { id: 'Z−', name: 'Z−', screen: 'hunt', line: 'Zooms the map out. Z+ zooms in.' },
  { id: 'CTR', name: 'CTR', screen: 'hunt', line: 'Centres the map on the active ExoS. The map follows it again until you drag.' },
  { id: 'QUIT', name: 'QUIT', screen: 'hunt', line: 'Stops the hunt. In a contract you then pick SAVE & QUIT or BAIL CONTRACT.' },
  { id: 'SAVE & QUIT', name: 'SAVE & QUIT', screen: 'hunt', line: 'Saves this exact turn and goes to the company screen. RESUME puts you back on this turn.' },
  { id: 'BAIL CONTRACT', name: 'BAIL CONTRACT', screen: 'hunt', line: 'Gives up the contract. You lose the fee and the completion bonus. You still pay wages and upkeep. The menu shows the cost first.' },
  { id: 'DBG', name: 'DBG', screen: 'hunt', line: 'Debug lines for testers. It shows the truth about the field, so leave it off when you play.' },
  { id: 'HITS LEFT', name: 'HITS LEFT', screen: 'hunt', line: 'CORE hits left on this ExoS. At 0 it goes DOWN. A hit on a part that is gone goes to the CORE.' },
  { id: 'DOWN', name: 'DOWN', screen: 'hunt', line: 'The ExoS lost its CORE and can’t act for the rest of the hunt. Its operator is CRITICAL.' },
  { id: 'CRITICAL', name: 'CRITICAL', screen: 'hunt', line: 'The operator of a DOWN ExoS. End a lancemate’s turn next to it to carry them. Left behind, they are KIA.' },
  { id: 'CARRIED BY', name: 'CARRIED BY', screen: 'hunt', line: 'A lancemate carries this CRITICAL operator. Get the carrier out with EXTRACT. The operator then sits out ' + TUNE.OP_BENCH + ' contracts.' },
  { id: 'EXTRACTED', name: 'EXTRACTED', screen: 'hunt', line: 'This ExoS left the map. The hunt ends when all your ExoS that can still act are out.' },
  // parts and part states
  { id: 'CORE', name: 'CORE', screen: 'hunt', line: 'The body. When the CORE runs out, the ExoS is DOWN and an enemy is destroyed. On the CARD, “core 3” is its CORE hits.' },
  { id: 'LEGS', name: 'LEGS', screen: 'hunt', line: 'Any damage to the LEGS means CREEP only. With the LEGS gone, CREEP covers half the distance.' },
  { id: 'ARMS', name: 'ARMS', screen: 'hunt', line: 'The weapon part. When the ARMS are gone, the gun on them stops working.' },
  { id: 'MAST', name: 'MAST', screen: 'hunt', line: 'The sensor part. When the MAST is gone, its sensors stop and your eyes see half as far.' },
  { id: 'BACK', name: 'BACK', screen: 'hunt', line: 'The rear part, with the mortar and utility kit. Only shots from behind your facing hit it.' },
  { id: 'ok', name: 'ok', screen: 'hunt', line: 'Part state: no damage.' },
  { id: 'scratched', name: 'scratched', screen: 'hunt', line: 'Part state: it lost a little. It still works.' },
  { id: 'bloodied', name: 'bloodied', screen: 'hunt', line: 'Part state: half its hits or fewer are left. It still works.' },
  { id: 'badly', name: 'badly', screen: 'hunt', line: 'Part state: a quarter of its hits or fewer are left. It still works.' },
  { id: 'gone', name: 'gone', screen: 'hunt', line: 'Part state: destroyed for the rest of the hunt. What is on it stops. REPAIR WORST between hunts brings it back.' },
  // contacts: labels and tags
  { id: 'contact', name: 'contact', screen: 'contact', line: 'A red square with a circle: an enemy your sensors fixed. The circle shows how unsure the fix is. Tap it to select it.' },
  { id: 'FIX', name: '±', screen: 'contact', line: 'How unsure the fix is, in tiles (±2.5t). FIRE needs ±' + TUNE.PLAYER_FIRE_UNC + ' or better. More sensors and eyes make it smaller.' },
  { id: 'UNKNOWN', name: 'UNKNOWN', screen: 'contact', line: 'You don’t know this contact’s variant yet. Use ID to make a call, or get eyes on it.' },
  { id: 'fit', name: 'fit', screen: 'contact', line: '“7 fit” means 7 variants on the CARD match what your sensors noted. Fewer fit means you are closer to an ID.' },
  { id: 'SELECTED', name: 'SELECTED', screen: 'contact', line: 'The yellow box: the contact FIRE, ID and RADAR use. Tap empty ground or your own ExoS to clear it.' },
  { id: 'EO', name: 'EO', screen: 'contact', line: 'Eyes fixed it: exact, in line of sight. EO A means ExoS A saw it.' },
  { id: 'RDR', name: 'RDR', screen: 'contact', line: 'RADAR fixed it. 2W means through 2 walls, so the fix is still fuzzy.' },
  { id: 'ESM', name: 'ESM', screen: 'contact', line: 'Your passive sensor heard its EMIT. Bearings from two or more places cross to make the fix.' },
  { id: 'ACO', name: 'ACO', screen: 'contact', line: 'Heard only: its SOUND. A sound fix is never tight enough to FIRE at.' },
  { id: 'MZL', name: 'MZL', screen: 'contact', line: 'Muzzle flash: it fired at you, so you have a rough fix on where it fired from.' },
  { id: 'LINK', name: 'LINK', screen: 'contact', line: 'A track shared by your lance. It is never a lock on its own.' },
  { id: 'SCAN', name: 'SCAN', screen: 'contact', line: 'The ship’s scan before the drop. A SCAN tag means the scan saw the unit there, so it may have moved.' },
  { id: 'LOST TRACK', name: 'LOST TRACK', screen: 'contact', line: 'An orange contact: no sensor holds it now. The circle grows while that unit acts, then the contact drops off.' },
  { id: 'LAST SEEN', name: 'LAST SEEN', screen: 'contact', line: 'A faded mark where a contact dropped off your picture, with its round. It stays ' + TUNE.LASTKNOWN_ROUNDS + ' rounds. You can’t target it.' },
  // map marks
  { id: 'BEARING', name: 'BEARING', screen: 'map', line: 'A teal line from your ExoS toward an EMIT it heard. Where two lines cross, the contact is.' },
  { id: 'PAINTED', name: 'PAINTED', screen: 'map', line: 'An enemy RADAR swept this ExoS in that round. The red ring alone gives no direction. The RWR module adds one.' },
  { id: 'RWR', name: 'RWR', screen: 'map', line: 'Radar warning receiver. Rings show how close the radar is. The spoke points at it. The label is the CARD’s best guess.' },
  { id: 'COVER', name: 'COVER', screen: 'map', line: 'A wall near the target: −' + TUNE.HIT_COVER + '% to hit. Scrap: −' + TUNE.HIT_COVER_LOW + '%. It doesn’t count if the shooter is against the same piece.' },
  { id: 'QUIET', name: 'QUIET', screen: 'map', line: 'Blue dotted ground. Anything here gives off ' + pc(TUNE.ZONE_TYPES.QUIET.SIG_MULT) + ' of its EMIT and SOUND. IN QUIET means your ExoS stands in it.' },
  { id: 'NOISE', name: 'NOISE', screen: 'map', line: 'An amber hatched zone. Fixes on anything inside are blurred. Eyes and RADAR still work. IN NOISE means your ExoS stands in it.' },
  { id: 'ZONE ?', name: 'ZONE ?', screen: 'map', line: 'The ship’s scan found a zone here, but not its type. THERMAL tells QUIET from NOISE.' },
  { id: 'EXTRACTION', name: 'EXTRACTION', screen: 'map', line: 'The green zone at the right edge. Stand in it and tap EXTRACT.' },
  { id: 'SPLASH', name: 'SPLASH', screen: 'map', line: 'Where the last mortar shell landed, and whether it hit.' },
  { id: 'scrap', name: 'scrap', screen: 'map', line: 'Brown speckled ground. Each tile costs ' + TUNE.CLUTTER_TILE_COST + ' tiles of movement, adds ' + TUNE.CLUTTER_SOUND + ' SOUND, and gives low cover.' },
  { id: 'NEXT', name: 'NEXT MOVE', screen: 'map', line: 'Where the transport’s next move ends.' },
  // the ship's scan
  { id: 'THERMAL', name: 'THERMAL', screen: 'scan', line: 'The ship’s heat sensor. It finds warm units and their size, and tells QUIET from NOISE. Cold turrets stay hidden.' },
  { id: 'EM LISTEN', name: 'EM LISTEN', screen: 'scan', line: 'The ship’s ESM. It hears only units that transmit: first a count, then a fix with the CARD’s best guess.' },
  { id: 'FULL MAP', name: 'FULL MAP', screen: 'scan', line: 'Puts the selected sensor over the whole map at a quarter strength. RING aims it again.' },
  { id: 'RING', name: 'RING', screen: 'scan', line: 'Aims the selected sensor at its ring. Drag near a ring to move it.' },
  { id: 'ALT', name: 'ALT', screen: 'scan', line: 'Ship altitude. HIGH: big, weak, fuzzy rings, and quiet. LOW: small, strong, sharp rings, and loud. MID is standard.' },
  { id: 'CLOCK', name: 'CLOCK', screen: 'scan', line: 'Ship-minutes on station. Time passes only while the clock runs. PAUSE to think.' },
  { id: 'RISK', name: 'RISK', screen: 'scan', line: 'How much the field noticed your scan. It climbs while sensors are on and cools with all of them off.' },
  { id: 'STEP', name: 'STEP', screen: 'scan', line: 'RISK in steps. A new step may call in an enemy unit. The step at the drop wakes part of the field.' },
  { id: 'SCAN WINDOW', name: 'SCAN WINDOW', screen: 'scan', line: 'The ship-minutes this job allows for the scan. When it closes, you drop.' },
  { id: 'NO TIME LIMIT', name: 'NO TIME LIMIT', screen: 'scan', line: 'This job has no SCAN WINDOW. Scan for as long as the RISK allows.' },
  { id: 'DROP ZONE', name: 'DROP ZONE', screen: 'scan', line: 'Where your ExoS land. RADAR clears the north and south ones. Tap a numbered one to pick it.' },
  { id: 'ping', name: 'ping', screen: 'scan', line: 'A unit RADAR found. A ping gives where, never what.' },
  // the city and the company
  { id: 'JOB', name: 'JOB', screen: 'city', line: 'A job on the city map. Take it and it becomes your CONTRACT: 2 to 4 hunts for one fee.' },
  { id: 'CONTRACT', name: 'CONTRACT', screen: 'city', line: 'The job you took. Win its hunts to complete it and get the fee. Each hunt pays a little too.' },
  { id: 'FACTION JOB', name: 'FACTION JOB', screen: 'city', line: 'A faction pays ×' + TUNE.CITY_FACTION_PAY + ' to hit a rival. Complete it: the employer likes you more, the target likes you less.' },
  { id: 'BROKER JOB', name: 'BROKER JOB', screen: 'city', line: 'A deniable job: ×' + TUNE.CITY_BROKER_PAY + ' pay. No faction hires you openly. The target still likes you less, and its friends notice.' },
  { id: 'STANDING', name: 'STANDING', screen: 'city', line: 'How much a faction likes you. Only a completed job moves it. Every contract it fades ' + TUNE.STANDING_DRIFT + ' toward 0.' },
  { id: 'HATED', name: 'HATED', screen: 'city', line: 'STANDING ' + TUNE.STANDING_HATED + ' or lower. Their jobs are more dangerous, more of their field is awake, and their fuel costs more.' },
  { id: 'NEUTRAL', name: 'NEUTRAL', screen: 'city', line: 'STANDING between HATED and LIKED. Nothing extra happens.' },
  { id: 'LIKED', name: 'LIKED', screen: 'city', line: 'STANDING +' + TUNE.STANDING_LIKED + ' or higher. Their jobs pay ×' + TUNE.STANDING_LIKED_PAY + ', jobs on their enemies come with a FREE SCAN, and their fuel is cheap.' },
  { id: 'FREE SCAN', name: 'FREE SCAN', screen: 'city', line: 'A LIKED faction’s gift: the scan opens with RADAR band 1 on the whole map, at no RISK.' },
  { id: 'RIVALS', name: 'RIVALS', screen: 'city', line: 'Two factions that dislike each other. Work for one, and the other likes you less.' },
  { id: 'ALLIES', name: 'ALLIES', screen: 'city', line: 'Two factions that stand together. Hit one, and the other likes you less too.' },
  { id: 'DANGER', name: 'DANGER', screen: 'city', line: 'LOW, MEDIUM or HIGH: how big and how tough the field is.' },
  { id: 'FUEL', name: 'FUEL', screen: 'city', line: 'The ship jumps on fuel: ' + TUNE.CITY_FUEL_PER_LINK + ' a link on the city map. Buy it at the MARKET. With no fuel you can’t reach a job.' },
  { id: 'INTEL', name: 'INTEL', screen: 'city', line: 'The job card’s listing: the district, the field, the zones and what the field listens on.' },
  { id: 'Listens on', name: 'Listens on', screen: 'city', line: 'What the enemy senses with: SOUND (steps and shots), eyes, ESM (your EMIT), RADAR and IR sights (your heat).' },
  { id: 'FORK', name: 'FORK', screen: 'city', line: 'An escort route splits here. Pick a ROUTE, or the transport stops and waits.' },
  { id: 'DROPS', name: 'DROPS', screen: 'company', line: 'This operator drops in this ExoS on the next hunt. Tap to change who drives it.' },
  { id: 'STAYS ABOARD', name: 'STAYS ABOARD', screen: 'company', line: 'This ExoS stays on the ship this hunt. Tap to give it an operator.' },
  { id: 'BENCHED', name: 'BENCHED', screen: 'company', line: 'An operator who was carried out CRITICAL. They sit out ' + TUNE.OP_BENCH + ' contracts.' },
  { id: 'KIA', name: 'KIA', screen: 'company', line: 'Killed in action: an operator left behind CRITICAL. Their name goes on the MEMORIAL.' },
  { id: 'XP', name: 'XP', screen: 'company', line: 'Experience. Operators earn it for each hunt they come back from. At level 2 (★) and 3, their skill gets stronger.' },
  { id: 'STEADY AIM', name: 'STEADY AIM', screen: 'company', line: 'Operator skill: +' + TUNE.SKILL_AIM[0] + '% to hit, more at higher levels.' },
  { id: 'QUIET MOVER', name: 'QUIET MOVER', screen: 'company', line: 'Operator skill: quieter moves (SOUND ×' + TUNE.SKILL_QUIET[0] + '), more at higher levels. Shots are as loud as before.' },
  { id: 'SHARP EARS', name: 'SHARP EARS', screen: 'company', line: 'Operator skill: this ExoS hears SOUND ×' + TUNE.SKILL_EARS[0] + ' further, more at higher levels.' },
  { id: 'SENSOR TECH', name: 'SENSOR TECH', screen: 'company', line: 'Operator skill: fixes on contacts get tight faster.' },
  { id: 'cr', name: 'cr', screen: 'company', line: 'Credits: the company’s money. Hunt pay and fees come in. Wages, upkeep and repairs go out.' },
  { id: 'PARTS', name: 'PARTS', screen: 'company', line: 'Spare parts for REPAIR WORST and REBUILD. Kills give salvage parts. The MARKET sells them.' },
  { id: 'WAGES', name: 'WAGES', screen: 'company', line: 'Paid to every operator on the roster when a contract ends, benched ones too.' },
  { id: 'UPKEEP', name: 'UPKEEP', screen: 'company', line: 'The ship’s running cost, paid when a contract ends.' },
  { id: 'DEBT', name: 'DEBT', screen: 'company', line: 'Credits below 0. The company can be in debt for one contract, down to −' + TUNE.DEBT_LIMIT + '. Deeper, or still in debt next time, it folds.' },
  { id: 'FOLDED', name: 'FOLDED', screen: 'company', line: 'The company is finished. Debt can do it. So can losing every ExoS with no way to rebuild one.' },
  { id: 'REPAIR WORST', name: 'REPAIR WORST', screen: 'company', line: 'Repairs 1 hit on this ExoS’s worst part. It costs parts and credits.' },
  { id: 'REBUILD', name: 'REBUILD', screen: 'company', line: 'Builds a destroyed ExoS again. After a hunt where you held the field, it costs half.' },
  { id: '+10 RDS', name: '+10 RDS', screen: 'company', line: 'Buys 10 gun rounds for this ExoS.' },
  { id: '+1 SHELL', name: '+1 SHELL', screen: 'company', line: 'Buys 1 mortar shell for this ExoS.' },
  { id: 'MEMORIAL', name: 'MEMORIAL', screen: 'company', line: 'The names of operators killed in action (KIA).' },
  { id: 'REFIT', name: 'REFIT', screen: 'company', line: 'The company tab for your ExoS: damage, repairs, rounds and shells.' },
  { id: 'ROSTER', name: 'ROSTER', screen: 'company', line: 'The company tab for your operators. The letter buttons put an operator in that ExoS.' },
  { id: 'MARKET', name: 'MARKET', screen: 'company', line: 'Buy parts, fuel, items and recruits. Now and then it sells an ExoS.' },
  { id: 'SHIP', name: 'SHIP', screen: 'company', line: 'Seven hardpoints for ship modules. Each module changes one rule, for example a quieter drop or a faster scan.' },
  // the hangar
  { id: 'HANGAR', name: 'HANGAR', screen: 'hangar', line: 'Where you fit each ExoS. Tap a part, then tap a hardpoint to fit an item you own.' },
  { id: 'LOAD', name: 'LOAD', screen: 'hangar', line: 'Weight carried. Over the rated load, every move is louder and costs more EN. Far over it, moves cost +1 AP.' },
  { id: 'POWER', name: 'POWER', screen: 'hangar', line: 'EN back each turn: the reactor’s output minus what your items draw. The pool is the most EN you can hold.' },
  { id: 'HITS', name: 'HITS', screen: 'hangar', line: 'How many hits each part takes before it is gone.' },
  { id: 'hardpoint', name: 'hardpoint', screen: 'hangar', line: 'A slot on a part for one item: SENSOR, WEAPON, INTERNAL, UTILITY or MOBILITY. OPEN takes anything.' },
  { id: 'LAUNCH', name: 'LAUNCH HUNT', screen: 'hangar', line: 'Drops the lance with these fits. The fits then lock for the contract.' },
  // the CARD
  { id: 'card.emit', name: 'EMIT none / low / high', screen: 'card', line: 'How much a variant transmits. None is radio-silent. Low→high means quiet, then a spike after each RADAR pulse.' },
  { id: 'LOCK', name: 'lock', screen: 'card', line: 'How sure an enemy must be before it fires. A tight or firm lock needs a sharp fix. A looser lock fires sooner.' },
  { id: 'shot', name: 'shot', screen: 'card', line: '“shot 12” is how far away you hear that variant fire, in tiles. A muffled shot is hard to hear.' },
  { id: 'steps', name: 'steps', screen: 'card', line: 'How loud a patrol walks: soft (3 or less), steps (4–5) or loud (6 or more). It is the patrol’s tell.' },
  { id: 'pulses', name: 'pulses', screen: 'card', line: 'How often an emplacement pulses its RADAR. The rhythm tells the variants apart.' },
  { id: 'rds', name: 'rds', screen: 'card', line: 'Rounds of ammunition.' },
  // after the hunt
  { id: 'TURNING POINT', name: 'TURNING POINT', screen: 'after', line: 'A moment that changed the hunt. T7 means turn 7. Tap one to see the map as it was then.' },
  { id: 'WHAT IT COST', name: 'WHAT IT COST', screen: 'after', line: 'People, repairs, pay, salvage and the books for this hunt. ← T7 points to the turning point behind a line.' },
  { id: 'HELD THE FIELD', name: 'HELD THE FIELD', screen: 'after', line: 'You did the job. You see the whole story, and your DOWN ExoS come home. A REBUILD costs half.' },
  { id: 'FIELD LOST', name: 'FIELD LOST', screen: 'after', line: 'You didn’t hold the field. Enemy TURNING POINTS show as ??? with a rough direction. The wrecks stay out there.' },
  { id: 'THE BOOKS', name: 'THE BOOKS', screen: 'after', line: 'The company’s money at a contract’s end: fee, bonus, wages, upkeep and repairs, then the credits left.' },
];

// R25 "Live toy": on the toy page (TIME_MODE 'live') some terms mean something else, and some are new.
const LIVE_LINES: Record<string, string> = {
  ROUND: 'Every ' + TUNE.LIVE_ROUND_SEC + ' s of the clock is one ROUND. RWR warnings, the GHOST and LAST SEEN marks count in ROUNDS.',
  ORDER: 'Your ExoS, by letter. The bright one takes your orders. Tap a letter to pick that ExoS. Everyone acts at the same time.',
  AP: 'Not used on this page. Time is the cost: each action takes some seconds.',
  EN: 'Energy. Fast moves, RADAR, ECM and GHOST use it. Your reactor gives some back every second.',
  EMIT: 'Your electronic noise. RADAR, ECM and UPLINK add to it. Enemy ESM hears it from far away. It falls every second.',
  SOUND: 'The noise of your moves and shots, drawn as a pale ring. Enemies inside it hear you, through walls. It lasts ' + TUNE.LIVE_ROUND_SEC + ' s.',
  ECM: 'ECM hides your EMIT to ' + pc(TUNE.ECM_MASK_MULT) + ' while it is on. It takes ' + TUNE.LIVE_ACT_TIME.ECM + ' s to start and uses EN every second. Tap again to stop it.',
  GHOST: 'A fake contact for the enemy. Tap GHOST, then tap the map. It lasts ' + TUNE.GHOST_TURNS + ' ROUNDS. Enemies hunt it like an ExoS.',
};
const LIVE_TERMS: Entry[] = [
  { id: 'PAUSE', name: 'PAUSE', screen: 'hunt', line: 'Stops the clock. Every order still works while paused. Tap PLAY to start the clock again. The space bar does both.' },
  { id: 'PLAY', name: 'PLAY', screen: 'hunt', line: 'Starts the clock. Everyone acts at the same time until you PAUSE.' },
  { id: 'TIME', name: 'TIME', screen: 'hunt', line: 'The hunt clock, in minutes and seconds.' },
  { id: 'IDLE', name: 'IDLE', screen: 'hunt', line: 'This ExoS has no order. It stands, looks and listens.' },
  { id: 'AIM', name: 'AIM', screen: 'hunt', line: 'The gun aims for ' + TUNE.LIVE_AIM_TIME + ' s before each shot. The ExoS can walk while it aims.' },
  { id: 'GUN COOLING', name: 'GUN COOLING', screen: 'hunt', line: 'After a shot the gun cools for ' + TUNE.LIVE_FIRE_COOLDOWN + ' s. Then it aims again by itself at the same target, if it can shoot.' },
  { id: 'LIVE TOY', name: 'LIVE TOY', screen: 'hunt', line: 'A test page for live time. It has its own company and its own save. The main game does not change.' },
  { id: 'AUTO-PAUSE', name: 'AUTO-PAUSE', screen: 'hunt', line: 'The game pauses by itself when something needs a decision. The yellow line says why. Switch each reason on or off on the start screen.' },
  { id: 'AP.CONTACT', name: 'PAUSED: NEW CONTACT', screen: 'hunt', line: 'A new contact came onto your picture. A loose track that jumps about never pauses the game again.' },
  { id: 'AP.FIXED', name: 'PAUSED: FIXED TRACK', screen: 'hunt', line: 'A loose track became a FIXED TRACK. You can now FIRE at it. This pauses once for each contact.' },
  { id: 'AP.BACK', name: 'PAUSED: CONTACT BACK', screen: 'hunt', line: 'A contact came back after ' + TUNE.AUTOPAUSE_RELOST + ' s or more off your picture.' },
  { id: 'AP.FIRE', name: 'PAUSED: TAKING FIRE', screen: 'hunt', line: 'An enemy shot at one of your ExoS. More shots at it in the next ' + TUNE.AUTOPAUSE_FIRE_GAP + ' s do not pause the game again.' },
  { id: 'AP.IDLE', name: 'PAUSED: IDLE', screen: 'hunt', line: 'An ExoS finished its order. A IDLE means ExoS A waits for a new one.' },
  { id: 'AP.OBJECTIVE', name: 'PAUSED: OBJECTIVE', screen: 'hunt', line: 'The objective changed: an UPLINK step, the cargo picked up or passed on, a hit on the transport, or the transport waits at a FORK.' },
  { id: 'FIXED TRACK', name: 'FIXED TRACK', screen: 'contact', line: 'A contact you can FIRE at: held now, not sound only, and ±' + TUNE.PLAYER_FIRE_UNC + ' tiles or better.' },
  { id: 'LOOSE TRACK', name: 'LOOSE TRACK', screen: 'contact', line: 'A contact you can’t FIRE at yet: fuzzy, sound only, or lost for a moment. It can jump about as fixes come in.' },
];
if (TUNE.TIME_MODE === 'live') {
  for (const e of TERMS) if (LIVE_LINES[e.id]) e.line = LIVE_LINES[e.id];
  TERMS.splice(TERMS.findIndex(e => e.id === 'ExoS') + 1, 0, ...LIVE_TERMS);
}

// ---- blocked reasons (A3): what blocks the control, and what would unblock it ----
// short = the word on the greyed button. line = the explain card. ACT_NAME = the button's label.
const ACT_NAME: Record<string, string> = { FIRE: 'FIRE', MORTAR: 'MORTAR', RADAR: 'RADAR', ECM: 'ECM', GHOST: 'GHOST', UPLINK: 'UPLINK', PICKUP: 'PICK UP', HANDOFF: 'HAND OFF',
  MOVE: 'MOVE', MODE: 'NORMAL / SPRINT', ID: 'ID', ORDER: 'HOLD / HURRY', EXTRACT: 'EXTRACT', TURN: 'BUTTONS' };
const PART_LINE = (p: string) => 'The ' + p + ' part is gone, so this stops for the rest of the hunt. REPAIR WORST between hunts repairs it.';
export const WHY_SHORT: Record<string, string> = { NONE: 'NONE', AP: 'NEED AP', EN: 'NEED EN', CAP: 'USED', SOUND: 'HEARD ONLY', FUZZY: 'NO LOCK', RANGE: 'OUT OF RANGE',
  LOS: 'NO SIGHT', AMMO: 'NO AMMO', SHELLS: 'NO SHELLS', CLOSE: 'TOO CLOSE', DONE: 'DONE', HELD: 'CARRIED', ZONE: 'NOT IN ZONE', FORK: 'AT FORK', USED: 'NONE LEFT',
  CARGO: 'CARRIER', SEEN: 'SEEN', ON: 'ON MAP', NOPLAN: 'TAP OR DRAW', WAIT: 'WAIT', LEGS: 'LEG DAMAGED', COOL: 'COOLING',
  ...Object.fromEntries(PART_CODES.map(p => [p, p + ' GONE'])) };
const SHORT_BY_ACT: Record<string, string> = { 'FIRE.NONE': 'NO TARGET', 'MORTAR.NONE': 'NO TARGET', 'ID.NONE': 'TAP ONE', 'RADAR.NONE': 'NO RADAR', 'UPLINK.NONE': 'NO UPLINK',
  'PICKUP.NONE': 'NO CARGO', 'HANDOFF.NONE': 'NO CARGO', 'ORDER.NONE': 'NO TRANSPORT', 'EXTRACT.NONE': 'NONE', 'MOVE.LEGS': 'LEG DAMAGED', 'MODE.LEGS': 'LEG DAMAGED', 'FIRE.LEGS': 'LEGS GONE',
  'MORTAR.LEGS': 'LEGS GONE', 'RADAR.LEGS': 'LEGS GONE', 'ECM.LEGS': 'LEGS GONE', 'GHOST.LEGS': 'LEGS GONE', 'UPLINK.DONE': 'DONE THIS TURN' };
const WHY_LINE: Record<string, string> = {
  'AP': 'Not enough AP. End the turn: each ExoS gets +' + TUNE.AP_PER_TURN + ' AP at the start of its next turn.',
  'EN': 'Not enough EN. Wait a turn: your reactor gives EN back each turn.',
  'FIRE.NONE': 'No contact to shoot at. Find one with your sensors first, then tap it to select it.',
  'FIRE.AMMO': 'No gun rounds left. Buy more on the REFIT tab between hunts (+10 RDS).',
  'FIRE.CAP': 'This ExoS fired ' + TUNE.SHOTS_PER_TURN + ' times this turn. It can fire again next turn.',
  'FIRE.COOL': 'The gun is aiming or cooling down after a shot. It is ready again in ' + TUNE.LIVE_FIRE_COOLDOWN + ' s or less. (LIVE TOY only.)',
  'FIRE.SOUND': 'You only heard this contact. A SOUND fix is never tight enough. Get eyes, RADAR or ESM on it.',
  'FIRE.FUZZY': 'The fix is too fuzzy: FIRE needs ±' + TUNE.PLAYER_FIRE_UNC + ' tiles or better. Get closer, use RADAR, or get eyes on it.',
  'FIRE.RANGE': 'The contact is out of your gun’s range. Move closer.',
  'FIRE.LOS': 'No line of sight. Move until the contact is in view.',
  'MORTAR.NONE': 'No contact for an aimed shell. Tap MORTAR, then tap the map for a blind shell.',
  'MORTAR.SHELLS': 'No mortar shells left. Buy more on the REFIT tab between hunts (+1 SHELL).',
  'MORTAR.CAP': 'This ExoS fired its mortar this turn. It can fire again next turn.',
  'MORTAR.COOL': 'The mortar is cooling down after a shell. It is ready again in ' + TUNE.LIVE_MORTAR_COOLDOWN + ' s or less. (LIVE TOY only.)',
  'MORTAR.SOUND': 'You only heard this contact. Tap the map for a blind shell, or tighten the fix first.',
  'MORTAR.FUZZY': 'The fix is too fuzzy for an aimed shell: it needs ±' + TUNE.MORTAR_MAX_UNC + ' tiles or better. Tap the map for a blind shell.',
  'MORTAR.CLOSE': 'Too close for the mortar. Move away, or pick a point further off.',
  'MORTAR.RANGE': 'Out of mortar range. Move closer, or pick a point nearer.',
  'RADAR.NONE': 'This ExoS has no RADAR fitted. Fit one in the HANGAR.',
  'GHOST.ON': 'Your GHOST is still on the map. You can place a new one when it fades.',
  'UPLINK.NONE': 'This job has no uplink.',
  'UPLINK.RANGE': 'Too far from the uplink. Move into the gold ring.',
  'UPLINK.DONE': 'You used the uplink this turn. UPLINK again next turn.',
  'PICKUP.NONE': 'This job has no cargo.',
  'PICKUP.HELD': 'A lancemate carries the cargo. Their HAND OFF can pass it to you.',
  'PICKUP.RANGE': 'Too far from the cargo. Move within ' + (TUNE.UPLINK_RADIUS + 0.5) + ' tiles of its centre.',
  'HANDOFF.NONE': 'This ExoS doesn’t carry the cargo.',
  'HANDOFF.RANGE': 'No lancemate is close enough. Move within ' + TUNE.RETRIEVE_HANDOFF_RANGE + ' tiles of one.',
  'MOVE.LEGS': 'A damaged leg means CREEP only. Tap CREEP, then MOVE.',
  'MOVE.CARGO': 'The cargo carrier can’t SPRINT. Tap NORMAL or CREEP, then MOVE.',
  'MOVE.AP': 'Not enough AP for any of that move. End the turn, or set a shorter move.',
  'MOVE.EN': 'Not enough EN for that move. Pick a slower move, or wait a turn.',
  'MOVE.NOPLAN': 'No move set yet. Tap the map, or drag from your ExoS to draw a path.',
  'MODE.LEGS': 'A damaged leg means CREEP only, for the rest of the hunt. REPAIR WORST between hunts repairs it.',
  'MODE.CARGO': 'The cargo carrier can’t SPRINT. HAND OFF the cargo to SPRINT again.',
  'ID.NONE': 'No contact selected. Tap a contact first.',
  'ID.SEEN': 'Your eyes already showed what it is. There is nothing to call.',
  'ORDER.NONE': 'There is no transport.',
  'ORDER.FORK': 'The transport waits at a fork. Pick a ROUTE in the bar above the bottom buttons first.',
  'ORDER.USED': 'No orders of this kind left for this hunt.',
  'EXTRACT.NONE': 'This ExoS can’t leave the map.',
  'EXTRACT.ZONE': 'Not in the extraction zone. Move into the green zone at the right edge.',
  'TURN.WAIT': 'It is not your turn yet, or an action is still running. Wait for your ExoS’s turn.',
};
function whyLine(act: string, code: string) {
  const k = act + '.' + code;
  if (WHY_LINE[k]) return WHY_LINE[k];
  if ((PART_CODES as readonly string[]).includes(code)) return PART_LINE(code);
  if (WHY_LINE[code]) return WHY_LINE[code];
  return '';
}
export function whyShort(act: string, code: string) { return SHORT_BY_ACT[act + '.' + code] || WHY_SHORT[code] || code; }
const WHYS: Entry[] = Object.entries(REASONS).flatMap(([act, codes]) => codes.map(code => ({
  id: 'why.' + act + '.' + code, name: ACT_NAME[act] + ': ' + whyShort(act, code), line: whyLine(act, code), screen: 'why' as Screen })));

export const ENTRIES: Entry[] = [...TERMS, ...WHYS];
export const GLOSSARY: Record<string, Entry> = Object.fromEntries(ENTRIES.map(e => [e.id, e]));
const BY_NAME: Record<string, Entry> = Object.fromEntries(ENTRIES.map(e => [e.name.toUpperCase(), e]));
export function gloss(id: string): Entry | null { return GLOSSARY[id] || null; }
// The entry for an on-screen label ("FIRE 62%" → FIRE, "SAVE &amp; QUIT" → SAVE & QUIT), or null
export function byLabel(label: string): Entry | null {
  const t = String(label || '').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim().toUpperCase();
  if (!t) return null;
  if (BY_NAME[t]) return BY_NAME[t];
  const w = t.split(' ');
  for (let n = w.length - 1; n >= 1; n--) { const k = w.slice(0, n).join(' '); if (BY_NAME[k]) return BY_NAME[k]; }
  return null;
}
export function whyEntry(act: string, code: string): Entry | null { return GLOSSARY['why.' + act + '.' + code] || null; }
