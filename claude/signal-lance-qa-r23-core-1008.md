# R23 QA panel: core batch

**Date:** 2026-10-08 · **Batch:** `r23-core-1008` · **Sessions:** 28 (19 runs) · **Findings:** 273 from testers, 2 input fallbacks · **Clusters:** 67, plus noise · **Oracle violations:** 0 kinds

The QA panel ran agent testers in personas on the real build (`npm run build:qa`), on desktop, iPhone, iPad. The judge merged findings by root cause. Each cluster below counts the distinct runs that reported it. The **page** has filters, tester quotes, screenshots and triage. Plan: `claude/signal-lance-qa-harness.md`.

## Top 10 (severity × reach)

| # | Cluster | Cat | Sev | Reach | Evidence |
|---|---|---|---|---|---|
| 1 | **Hunt HUD text and button columns crowd and overprint the map, worst on iPhone** | visual | major | 9 sessions · 5 personas · iPhone/iPad/desktop | n/a |
| 2 | **Objective distance readout (CARGO / UPLINK yard) jumps between suits and rises while moving toward it** | confusing | major | 9 sessions · 5 personas · iPad/desktop/iPhone | consistent |
| 3 | **MOVE spends the AP but the suit ends short of, or off, the drawn path, with no route preview** | bug | major | 8 sessions · 4 personas · desktop/iPhone/iPad | consistent |
| 4 | **FIRE does nothing and gives no reason when the shot is blocked (FUZZY / LOS / RANGE / SOUND)** | ux | major | 8 sessions · 5 personas · desktop/iPhone/iPad | consistent |
| 5 | **Job cards and briefing are walls of unexplained jargon (SND/EM/IR, forks, DROPS, EARS)** | confusing | major | 7 sessions · 4 personas · desktop/iPad/iPhone | n/a |
| 6 | **Bailed contract screen is a bare money line: 'won 0 of 0 hunts', no WHAT IT COST, standing, forfeited fee or operator fates** | missing | major | 7 sessions · 5 personas · iPad/desktop/iPhone | n/a |
| 7 | **Contacts and the objective ring sit under the right-hand buttons and bottom bar, so they can't be seen or tapped** | ux | major | 7 sessions · 5 personas · iPhone/desktop/iPad | n/a |
| 8 | **Part damage (LEG / WPN / SNS gone or bloodied) changes buttons to cryptic 'LEGS', 'WPN', 'SNS' with no explanation** | confusing | major | 7 sessions · 4 personas · desktop/iPhone/iPad | n/a |
| 9 | **Hunt HUD terms (EMIT, SOUND, IR, ECM, GHOST, ORDER '?' slots, 'looks 0/3', move stop) are never defined** | confusing | major | 6 sessions · 3 personas · desktop/iPhone/iPad | n/a |
| 10 | **Contact tags ('UNKNOWN · N fit', ESM, ACO, EO, MZL, enemy part lists) are unexplained** | confusing | major | 5 sessions · 3 personas · iPad/desktop/iPhone | n/a |

## Bugs (7)

### C01 · MOVE spends the AP but the suit ends short of, or off, the drawn path, with no route preview — major

Across all devices, players draw or tap a destination, press MOVE, and see all the AP and EN go while the suit makes little progress, ends somewhere off the line, or walks away from the objective. The route the game takes (around walls and rubble) is never shown before committing, and the camera re-centring on the active suit makes it look as if the suit never moved. This is the most reported hunt problem and it wastes whole turns.

*Reach:* 8 sessions · 4 personas · desktop/iPhone/iPad · *evidence:* consistent (State shows suits do move (F066 A ~5 tiles from spawn, F053 C ~4 tiles, F043 C moved; F164 B went from y 32.1 to 23.5 though reported 'same tile') and AP/EN match the spend, so 'did not move at all' is the camera following the suit (F043 says so); the real gap is the hidden, winding route and short progress per AP.)

*Repro:* Seed 3003 (iPad, breaker): hunt 1 round 1, drag a path from suit A down then east past rubble, tap MOVE 4AP 8EN; AP goes to 0 and CARGO drops only 48t to 46t.

*Suggestion:* Show the actual routed path and where the suit will stop before MOVE is committed.

*Findings:* F041, F043, F053, F066, F078, F079, F081, F085, F207, F237, F238, F274, F098, F197, F202, F210, F233, F230, F158, F164

### C28 · DEBUG: REROLL JOBS button visible on the player jobs screen — minor

A grey DEBUG: REROLL JOBS button sits under the job cards in the player build.

*Reach:* 5 sessions · 3 personas · iPad/desktop/iPhone · *evidence:* consistent (State shows the jobs/loadout stage (mode loadout) where the button is reported; seen in 5 sessions.)

*Repro:* Any seed: take a contract and look below the job cards.

*Suggestion:* Hide it behind a dev flag.

*Findings:* F060, F092, F108, F128, F189

### C19 · Selected contact (including stale radar marks) cannot be cleared and locks FIRE, ID and moves — major

On iPhone, once a contact is SELECTED it stays selected through taps on other contacts, the ground and the own suit, and through end of turn; FIRE and ID act on nothing and ground taps don't set a move. A tap near a contact selects it instead of setting a move. One tester gave up the hunt because of it.

*Reach:* 1 session · 1 persona · iPhone · *evidence:* consistent (State lists the contacts involved (F245 U2 still present at its fix; F242 U6 fix 13.4 vs truth 16.2, i.e. stale); selection itself is not in state. F247's blocker lowered to major: QUIT/other suits still work. Includes one fallback for the same lock.)

*Repro:* Seed 2002 (iPhone, hand 2): select an old radar mark (U2 'old'), then tap a live scout ~43px away, FIRE, ID; SELECTED stays U2.

*Suggestion:* Let a tap on empty ground or the own suit clear the selection.

*Findings:* F242, F245, F241, F247, F231

### C23 · Suit with a bloodied leg can't move at all (tap, MOVE LEGS and drag do nothing) — major

A suit at 3/8 hits with LEG bloodied could not move by any input that turn and was then shot down; nothing said why.

*Reach:* 1 session · 1 persona · iPad · *evidence:* consistent (State has A at AP 4 and position 16.8,23.5 unchanged across both notes, so it didn't move; F161's 'position changed' is the camera, not a real shift.)

*Repro:* Seed 1001 (iPad, hand 2): hunt 2 round 4, suit A with LEG bloodied, tap ground and MOVE LEGS, then drag.

*Findings:* F160, F161

### C45 · Scan clock jumped while it showed paused — minor

One tester paused at 2.75 ship-min, tapped a drop zone, and the clock read 7.25 'paused' with a unit called in. Known harness effect 4 does not explain a jump while paused.

*Reach:* 1 session · 1 persona · desktop · *evidence:* tester-only (State (loadout mode) has no clock data; single report, so major lowered to minor until reproduced.)

*Repro:* Seed 2002 (desktop, hand 2): START CLOCK, wait 3 s, PAUSE, tap 3 SOUTH EDGE, read the clock.

*Findings:* F205

### C48 · Emplacement ID'd as a 'relay' appears to shoot suits — minor

After the game confirmed a contact as EMPLACEMENT relay (pulses every 3rd round), the log shows 'emplacement -> B: HIT SNS', and the tester can't tell whether the relay or a turret downed A.

*Reach:* 1 session · 1 persona · iPad · *evidence:* tester-only (State shows U1 at 30.5,5.5 beside dead A (31.2,5.1), but not its type or who fired; the log line may come from another emplacement. Lowered to minor until checked.)

*Repro:* Seed 2002 (iPad, hand 1): ID the relay contact, stay in its range.

*Findings:* F271

### C51 · Broker job card says 'nobody gains' but lists +5 for two factions — minor

The Old Rail broker offer shows Corporate -10, Foundry +5, Syndicate +5 and then '(deniable: nobody gains)' in the same line.

*Reach:* 1 session · 1 persona · iPhone · *evidence:* tester-only (State shows standings all 0 at that point; nothing bears on the card text.)

*Repro:* Seed 3003 (iPhone): tap the Old Rail broker job on the city map.

*Findings:* F180

## Missing (6)

### C06 · Bailed contract screen is a bare money line: 'won 0 of 0 hunts', no WHAT IT COST, standing, forfeited fee or operator fates — major

After QUIT, the CONTRACT BAILED screen shows one line (won 0 of 0 hunts, fee 0, wages -120, upkeep -60) and nothing else: no standing result (even 'no change'), no mention of the forfeited fee or earned bounty, no word on downed operators. 'Won 0 of 0' contradicts the job's 'need 3'.

*Reach:* 7 sessions · 5 personas · iPad/desktop/iPhone

*Repro:* Any seed: take a faction contract, QUIT mid hunt 1, confirm SURE?, read CONTRACT BAILED.

*Suggestion:* Add the WHAT IT COST block (standing, forfeited fee/bounty, operators) and count the bailed hunt.

*Findings:* F035, F049, F057, F104, F175, F178, F188, F260

### C13 · QUIT's SURE? gives no warning of what a bail costs — major

QUIT asks only SURE?, and the label says extract keeps what you earned; players learn only afterwards that bailing ends the contract, forfeits the fee and charges full wages and upkeep (180 cr).

*Reach:* 4 sessions · 2 personas · desktop/iPhone/iPad

*Repro:* Any seed: tap QUIT in hunt 1, SURE?, compare with the result screen.

*Suggestion:* Put the bail cost on the SURE? confirm.

*Findings:* F105, F121, F248, F253

### C24 · Hits come from shooters the player can't see or locate — major

Suits take repeated hits logged only as 'patrol -> C: HIT COR (46%)' with no bearing or shooter marker, and damage words (scratched/bloodied) aren't numeric.

*Reach:* 1 session · 1 persona · desktop

*Repro:* Seed 202 (desktop): fight scouts for 5 rounds.

*Findings:* F259

### C46 · No enemy health readout; FIRE 'CAP' is unexplained — minor

Hits on an emplacement show 'HIT COR (86%)' but no damage or health, FIRE then reads CAP with no reason, and the trade (two hits for a lost weapon) feels unfair because progress is invisible.

*Reach:* 1 session · 1 persona · iPhone

*Repro:* Seed 101 (iPhone): fire twice at the search emplacement.

*Findings:* F119, F120

### C49 · No preview of what losing the lance will cost before launch — minor

The cost of lost suits (rebuild parts and credits) appears only after the loss, never on the loadout or launch screen.

*Reach:* 1 session · 1 persona · desktop

*Repro:* Any seed: reach LAUNCH HUNT 1.

*Findings:* F221

### C60 · Result screen doesn't explain uplink progress vs a clear win — minor

A WIN CLEAR result shows UPLINK 2/3 with no note that clearing the field overrides the uplink, or what each path pays.

*Reach:* 1 session · 1 persona · iPhone

*Repro:* Seed 202 (iPhone): reach the uplink partway and clear the last turret.

*Findings:* F264

## Confusing (22)

### C04 · Objective distance readout (CARGO / UPLINK yard) jumps between suits and rises while moving toward it — major

The HUD distance to the cargo or uplink changes when the active suit changes and often goes up after moving toward the ring, because it is measured from the active suit along the walking route, but nothing says so. Players conclude their moves go backwards and cannot judge progress.

*Reach:* 9 sessions · 5 personas · iPad/desktop/iPhone · *evidence:* consistent (Positions in state differ per suit (F041/F043), which explains per-suit jumps; F033 tester infers walking-route length. Not a wrong number, an unlabelled one.)

*Repro:* Seed 3003 (desktop or iPad): move suit C toward the cargo, end its turn; the CARGO line jumps (e.g. 29t to 33t) when suit A becomes active.

*Suggestion:* Label it 'from <suit>, walking' or show it per suit.

*Findings:* F033, F038, F056, F075, F103, F118, F157, F208, F182

### C05 · Job cards and briefing are walls of unexplained jargon (SND/EM/IR, forks, DROPS, EARS) — major

The jobs screen INTEL text is dense small type full of SND, EM, IR, passive ears, forks and emplacements, the two jobs look the same, and the DROPS buttons ('Fen EARS 1 ▸', QUIET) and the SCAN WINDOW badge are never explained. New players can't tell what to do or which job is riskier.

*Reach:* 7 sessions · 4 personas · desktop/iPad/iPhone

*Repro:* Any seed: take a contract and read the two job cards.

*Findings:* F003, F014, F030, F091, F107, F127, F059, F146, F190

### C08 · Part damage (LEG / WPN / SNS gone or bloodied) changes buttons to cryptic 'LEGS', 'WPN', 'SNS' with no explanation — major

When a suit's leg, weapon or sensors are hit, NORM/SPRINT become 'NORM LEGS / SPRINT LEGS' and CREEP is forced, FIRE reads 'WPN', ECM reads 'SNS', all greyed with no reason. Players don't know what 'gone' means, whether it lasts the hunt, or what it costs.

*Reach:* 7 sessions · 4 personas · desktop/iPhone/iPad

*Repro:* Seed 303 (desktop): let suit C take a LEG hit in the enemy phase and look at the move buttons.

*Suggestion:* One line on the disabled button: 'leg damaged: creep only (this hunt)'.

*Findings:* F046, F048, F055, F077, F142, F159, F174, F214, F246

### C09 · Hunt HUD terms (EMIT, SOUND, IR, ECM, GHOST, ORDER '?' slots, 'looks 0/3', move stop) are never defined — major

The hunt HUD and controls use EMIT, SOUND, IR, ECM, GHOST, CREEP/NORM/SPRINT, an ORDER strip with '?' slots, 'DRAWN PATH · looks 0/3' and 'MOVE STOPPED: CONTACT' with no tap-to-explain or first-turn hint. EM/IR/EMIT also appear on the scan and CARD without a definition.

*Reach:* 6 sessions · 3 personas · desktop/iPhone/iPad

*Repro:* Any seed: launch hunt 1 and read the top-left HUD and the bottom bar.

*Findings:* F094, F110, F131, F136, F150, F040, F198, F073

### C10 · Contact tags ('UNKNOWN · N fit', ESM, ACO, EO, MZL, enemy part lists) are unexplained — major

Contacts carry labels like 'UNKNOWN · 7 fit', 'IN QUIET', 'ESM A+B+C', 'ACO', 'EO A', 'MZL A' and enemy COR/LEG/WPN lists, with a red ring and 'ZONE ?', and no key. Players can't tell what a contact is, whether it can see or shoot them, or how to ID it.

*Reach:* 5 sessions · 3 personas · iPad/desktop/iPhone

*Repro:* Seed 3003 (iPad): move until a contact is detected and read its tag.

*Findings:* F067, F082, F099, F114, F139, F140, F156, F201

### C12 · Suits go DOWN in the enemy phase with no warning; 'CRITICAL: end a turn next to it' is unexplained — major

Suits drop from bloodied to DOWN during the enemy phase with no low-health warning, and the only follow-up is the HUD line 'CRITICAL: end a turn next to it' while the SUITS row says DOWN. Players don't know the suit can be carried/recovered, or what DOWN costs.

*Reach:* 4 sessions · 4 personas · desktop/iPad · *evidence:* consistent (State agrees the suits are down (F088 C hits 0 dead; F212 A hits 0 dead). DOWN and CRITICAL are the same state shown two ways, not a contradiction. F212's blocker lowered to major: the hunt continues.)

*Repro:* Seed 2002 (desktop, hand 2): take a few COR hits on suit A in the open, end turns; after the enemy phase SUITS reads 'A DOWN' and the HUD 'A CRITICAL'.

*Suggestion:* Warn at low hits, and say in one line what 'end a turn next to it' does.

*Findings:* F015, F088, F162, F165, F212, F213, F216

### C14 · Escort: fork levers are hard to find and set, and route taps give no clear feedback — major

In escort hunts the HUD says 'levers: B2 —, C3 —' and 'tap a route', but the levers are only drawn on the canvas, tapping a route gives no visible change except a far-off HUD word, and one tester saw the opposite fork chosen. The transport's progress isn't shown.

*Reach:* 4 sessions · 3 personas · desktop/iPhone/iPad · *evidence:* tester-only (State has no lever or fork data; the SOUTH/NORTH mismatch (F010) may be the old fork's circle, as the tester suspects.)

*Repro:* Seed 1001 (desktop): escort hunt, at fork C2 tap the circle labelled SOUTH; HUD later reads C2 NORTH.

*Findings:* F006, F008, F010, F028, F134, F251

### C26 · Resume after a hand-off restarts the hunt fresh (mid-hunt progress isn't saved) — minor

Hand 2 players tap RESUME CONTRACT and get a fresh copy of the current hunt (job pick, full rounds, all suits FINE) instead of the live hunt. That's how saves work: the game saves only between hunts. The RESUME label and the lack of a message make it look like lost progress.

*Reach:* 8 sessions · 6 personas · iPhone/iPad/desktop · *evidence:* consistent (State shows the company at the between-hunt save (e.g. F024/F080 loadout mode, fresh record), matching save-between-hunts; known harness effect 1 caps this at minor. Fuel mismatches (F013) come from the hand-off notes, not the save.)

*Repro:* Any long seed: quit the app mid-hunt, reopen, tap RESUME CONTRACT.

*Suggestion:* Say on RESUME that the hunt restarts from its start.

*Findings:* F024, F080, F145, F185, F203, F234, F235, F272, F013, F168

### C16 · Contract money lines don't add up: hunt pay on a loss, wages 30 vs 120, fee/pay figures that disagree — major

After a lost or won hunt, the money screens show figures players can't reconcile: '+25 cr hunt pay' on a LOSS, wages -30 where THE BOOKS said 120, rebuild costs listed but not in the total, and a broker job showing 160 / 300 / 384 / 225 cr in different places.

*Reach:* 3 sessions · 3 personas · iPad/desktop/iPhone

*Repro:* Seed 2002 (desktop, hand 2): lose the lance in hunt 1 and compare WHAT IT COST with CONTRACT FAILED and THE BOOKS.

*Findings:* F166, F218, F220, F263

### C18 · Company, market, roster, suit and loadout stats are unexplained jargon — major

Market items (RWR, EM array, Cold-burn, Mask), standing numbers and NEUTRAL, crew perks and DRIVES letters, part codes COR/LEG/WPN/SNS/BCK, and loadout stats (EM, IR, ACO, POWER, MAST) carry no plain description.

*Reach:* 3 sessions · 2 personas · desktop/iPad

*Repro:* Any seed: open MARKET, ROSTER, SUITS, then the hangar loadout.

*Findings:* F001, F122, F124, F125, F126, F093, F132

### C15 · Contacts vanish from the list (all at once at end of turn) with no message, and there is no way to re-find them — major

Contact counts drop (5 to 4, 4 to 0, 7 to 0) at END TURN with only the counter changing; the pre-drop radar intel disappears and the hunt has no sensor action or last-known marker, so bounty targets can't be relocated.

*Reach:* 2 sessions · 2 personas · iPad · **only on iPad**

*Repro:* Seed 2002 (iPad, hand 2): full-map radar at the scan (7 pings), walk east 3 rounds without sensors, END TURN; contacts 7 to 0.

*Suggestion:* Keep a faded last-known marker for expired contacts.

*Findings:* F068, F071, F265, F273, F275

### C20 · Company 'FOLDED' after a failed contract with credits left, with no stated reason — major

After the lance is wiped out, CONTRACT FAILED says THE COMPANY FOLDED at 20 or 210 cr, while THE BOOKS says folding comes only from debt. The real reason is not shown on the screen.

*Reach:* 2 sessions · 2 personas · iPad · **only on iPad** · *evidence:* oracle-disagrees (State's folded reason is 'every ExoS is destroyed and there is no way to rebuild one', so the fold is by rule, not a debt bug; the screen just doesn't say why.)

*Repro:* Seed 1001 (iPad, hand 2): lose all three suits in hunt 2, SAVE & NEXT.

*Suggestion:* Print the fold reason on the CONTRACT FAILED screen.

*Findings:* F089, F167

### C22 · Scan screen controls (RADAR / THERMAL / EM LISTEN, ALT, RISK, STEP, ship-min) are unexplained — major

The scan planning screen offers sensor and altitude toggles, a risk meter and a ship-minute clock with no line on what each does or what to watch.

*Reach:* 2 sessions · 1 persona · iPhone/iPad

*Repro:* Any seed: take a job and reach the scan screen.

*Findings:* F109, F129

### C31 · CARD enemy reference has no title or key, and is tiny on phone — minor

CARD opens three columns of enemy types with costs and terms (EMIT low/high, core 4, tight lock) and no heading, no key and no link to the selected contact; on iPhone it's too small to read.

*Reach:* 4 sessions · 2 personas · desktop/iPad/iPhone

*Repro:* Any seed: tap CARD in the hunt or on the scan.

*Findings:* F100, F148, F252, F243

### C34 · Sound rings and teal sensor lines on the hunt map have no key — minor

Grey rings with ticks, 'A SOUND 4' tags and fans of teal/cyan lines from the suits appear with no legend.

*Reach:* 3 sessions · 2 personas · desktop/iPad

*Repro:* Seed 101 (desktop): sprint a suit and look at the map.

*Findings:* F039, F096, F097, F153

### C35 · ID picker lists enemy types with no guidance on which fits or how a guess is judged — minor

ID UNKNOWN shows ten types as sound descriptions with strikethroughs and 'N fit' but doesn't say how to match the contact or what picking one changes.

*Reach:* 2 sessions · 2 personas · iPhone · **only on iPhone**

*Repro:* Seed 2002 (iPhone): select a contact, tap ID UNKNOWN.

*Findings:* F115, F232, F244

### C39 · Tapping your own suit arms a hidden 'TAP WHERE TO FACE' mode — minor

Tapping the active suit (e.g. to clear a selection) switches to facing mode, and the next drag turns the suit instead of moving it.

*Reach:* 2 sessions · 2 personas · iPad/iPhone

*Repro:* Seed 2002 (iPhone, hand 2): with a contact selected, tap your own suit.

*Findings:* F087, F240

### C40 · FIRE targets an earlier or auto-picked contact without making it clear — minor

FIRE shoots, or reads RANGE for, the previously selected or auto-chosen contact (a far scout) rather than the near heavy, and the SELECTED line is the only clue.

*Reach:* 2 sessions · 2 personas · desktop · **only on desktop**

*Repro:* Seed 202 (desktop): move next to a scout with a far scout still selected; FIRE reads RANGE.

*Findings:* F211, F258

### C41 · Unspent AP carries over to the next turn with no explanation — minor

A suit that ends with AP unspent starts the next turn with extra AP (8 or 7 pips, '+4/turn'), and nothing says AP carries over.

*Reach:* 2 sessions · 2 personas · iPad/desktop

*Repro:* Seed 3003 (iPad): end suit C's turn with 4 AP unspent.

*Findings:* F069, F215

### C50 · Suit status summaries disagree with what happened (SCRATCHED with LEG gone; LOST vs recovered) — minor

After hunt 2 the jobs screen shows suit A 'SCRATCHED' with its LEG gone and B 'LOST' though the result said recovered, with no pilot shown for B.

*Reach:* 1 session · 1 persona · desktop

*Repro:* Seed 1001 (desktop, hand 2): finish hunt 2 and read the next jobs screen.

*Findings:* F017

### C54 · 'Nobody stirs' vs '+25% awake' (Hated) contradict on the scan panel — minor

The scan risk text says 'Drop now: nobody stirs... 25% awake' then 'Foundry HATES you: +25% awake on top', and it's unclear whether the hate penalty is included.

*Reach:* 1 session · 1 persona · iPad

*Repro:* Test bed Hated scenario: TAKE IT and read the scan risk text.

*Findings:* F170

### C67 · Two operators share the name Wren — minor

Suits A and C are both piloted by 'Wren', and the wage line lists Wren twice.

*Reach:* 1 session · 1 persona · desktop

*Repro:* Seed 202 (desktop): take a job and read the drop buttons.

*Findings:* F255

## UI / UX (19)

### C02 · FIRE does nothing and gives no reason when the shot is blocked (FUZZY / LOS / RANGE / SOUND) — major

Tapping FIRE (and ID SEEN) with a selected contact often does nothing at all: no shot, no message, AP and shots unchanged. The button's second word (FUZZY, LOS, RANGE, SOUND) is the only reason, and players read it as a mode or a lit, usable button. END TURN and shot results are also only shown in small HUD lines.

*Reach:* 8 sessions · 5 personas · desktop/iPhone/iPad · *evidence:* consistent (State shows AP unspent after the tap (F076 A ap 1, F163 C ap 5), so no shot was taken; the block reason is just never surfaced.)

*Repro:* Seed 3003 (iPad, breaker hand 1): round 7, suit A's move stops on a SOUND contact; FIRE reads FIRE SOUND, lit; tap it and nothing happens.

*Suggestion:* On a blocked tap, print the reason (no line of sight / fix too loose / out of range) in the HUD.

*Findings:* F009, F023, F095, F047, F074, F076, F083, F143, F163, F239, F268, F229

### C07 · Contacts and the objective ring sit under the right-hand buttons and bottom bar, so they can't be seen or tapped — major

The camera lets enemies and the UPLINK ring drift under the ECM/GHOST/FIRE column and the move-mode bar. Taps meant for a contact hit the button on top, and the objective is only findable via the UPLINK RANGE button.

*Reach:* 7 sessions · 5 personas · iPhone/desktop/iPad

*Repro:* Seed 3003 (iPhone, hand 2): a heavy patrol appears near the right edge; tap it and the tap lands on ECM.

*Suggestion:* Keep the map's usable area inset from the overlay columns.

*Findings:* F027, F186, F228, F257, F113, F116, F102, F155, F183

### C29 · Scan clock runs in real time and drains while players read the panel — minor

After START CLOCK the scan clock keeps running while players read or scroll, so the window closes and risk climbs before they place the radar or pick a drop zone. Much of the speed is agent think-time, but the clock running while you read is a fair note; PAUSE exists.

*Reach:* 4 sessions · 3 personas · iPhone/desktop

*Repro:* Any seed: on the scan screen tap START CLOCK and scroll the panel.

*Findings:* F051, F192, F222, F256

### C32 · Tapping an unreachable spot or a building gives no feedback, or spends AP with no route — minor

Tapping a destination that can't be reached shows nothing (MOVE stays TAP OR DRAW), or MOVE spends AP with no route shown and the suit doesn't advance.

*Reach:* 3 sessions · 3 personas · desktop/iPad

*Repro:* Seed 303 (desktop): select suit A with 4 AP, tap a point up-right inside a block, tap MOVE.

*Findings:* F044, F135, F209

### C33 · Camera re-centres on the active suit, so taps and drags land on the wrong spot — minor

When the active suit changes, or after a move, the camera pans, so a tap or drag made during the pan lands on a different tile, and contacts drift under the finger.

*Reach:* 3 sessions · 3 personas · iPad/iPhone

*Repro:* Seed 101 (iPad): end C's turn and immediately drag a path from suit A.

*Findings:* F032, F117, F270

### C37 · Drop zone pick gives no feedback on the scan screen — minor

Tapping a drop zone button or numbered circle shows no change and the panel keeps asking for a pick, so players think it failed; the next screen shows the pick did register.

*Reach:* 2 sessions · 1 persona · desktop/iPhone · *evidence:* oracle-disagrees (F224 claims the pick can't be made (blocker), but the same session's F225 found the next screen says 'drop: north edge', so it registered silently; lowered to minor.)

*Repro:* Seed 2002 (iPhone, hand 1): pause the scan, tap 1 WEST EDGE, then 2 NORTH EDGE.

*Suggestion:* Highlight the chosen zone.

*Findings:* F206, F224, F225

### C38 · Hangar paper-doll slot hotspots have no text labels — minor

The three slot hotspots on the suit diagram are exposed as unlabelled controls; only the canvas drawing shows MAST/BACK, so screen-reader users can't tell them apart.

*Reach:* 2 sessions · 1 persona · desktop/iPhone

*Repro:* Any seed: open the loadout screen.

*Findings:* F005, F025

### C43 · Long panels put BACK only at the bottom (Gameplay Basics, Test bed list) — minor

GAMEPLAY BASICS and the TEST BED list show their only exit after scrolling the whole page.

*Reach:* 2 sessions · 2 personas · iPhone/iPad

*Repro:* Open GAMEPLAY BASICS from the splash on iPhone.

*Findings:* F261, F172

### C44 · Z+ / Z- zoom buttons show no visible change on the hunt — minor

Tapping Z- (or Z+) on the hunt map shows no change on iPhone.

*Reach:* 2 sessions · 2 personas · iPhone · **only on iPhone**

*Repro:* Seed 1001 (iPhone): tap Z- twice in the hunt.

*Findings:* F021, F227

### C42 · Radar ring won't drag on desktop (possibly FULL MAP on; the RING/FULL MAP button label confuses) — minor

Two desktop reports in one long run say the radar ring won't drag onto the cargo. The lead verified the drag works on desktop, so FULL MAP radar was likely on (no ring to drag), and the button reading 'FULL MAP RADAR' while the ring shows invites that mix-up.

*Reach:* 1 session · 1 persona · desktop · *evidence:* tester-only (Known harness effect 3: desktop drag verified working (seed 101); lowered from major.)

*Repro:* Seed 2002 (desktop): on the scan, check whether the button reads RING RADAR (full map on), then drag the ring.

*Suggestion:* Label the button by current state, e.g. 'RADAR: RING'.

*Findings:* F191, F204

### C52 · Scan screen layout jumps between states — minor

Toggling FULL MAP RADAR, START CLOCK or PAUSE rescales the map and moves the button column 20-80 px, so controls aren't where the last tap was.

*Reach:* 1 session · 1 persona · desktop

*Repro:* Seed 1001 (desktop): on the scan, tap FULL MAP RADAR, START CLOCK, PAUSE.

*Findings:* F004

### C53 · Drop zone buttons sit below the fold on the iPhone scan panel — minor

On iPhone the drop zone row appears only far down the panel after PAUSE, while the clock runs.

*Reach:* 1 session · 1 persona · iPhone

*Repro:* Seed 2002 (iPhone): START CLOCK and look for the drop buttons.

*Findings:* F223

### C56 · Stray tap toggled ECM and drained energy unnoticed — minor

A map tap near the right edge hit the ECM button, which toggled ECM on at 20 EN/turn; the label doesn't read as a toggle.

*Reach:* 1 session · 1 persona · iPad

*Repro:* Seed 101 (iPad): tap the map near the ECM button.

*Findings:* F034

### C57 · QUIT's SURE? confirm reverts too quickly — minor

SURE? flips back to QUIT within moments, so slow or low-motor players may never confirm.

*Reach:* 1 session · 1 persona · iPad

*Repro:* Seed 101 (iPad): tap QUIT, wait a moment, tap SURE?.

*Findings:* F036

### C58 · Move mode resets per suit and turn without clear indication — minor

The new active suit can start in CREEP when the last was SPRINT; the mode shows only in small HUD text, so taps waste AP.

*Reach:* 1 session · 1 persona · desktop

*Repro:* Seed 1001 (desktop, hand 2): sprint B and C, end turn, A becomes active.

*Findings:* F018

### C59 · Cargo pick-up range is unexplained — minor

PICK UP stays 'RANGE' while the cargo looks adjacent and the HUD reads 'cargo 2t away'; the needed range is never stated.

*Reach:* 1 session · 1 persona · desktop

*Repro:* Seed 639772 (desktop, hand 2): move next to the cargo and tap PICK UP.

*Findings:* F176

### C61 · Ship module purchase has no confirmation or undo — minor

BUY 180 cr on a ship module spends instantly and auto-fits with no undo or sell.

*Reach:* 1 session · 1 persona · iPad

*Repro:* Seed 101 (iPad): SHIP tab, BUY Radar Array.

*Findings:* F169

### C62 · PLAY SEED gives unclear feedback and keeps bad input — minor

A bad seed only swaps the header text, the box keeps the old text so the next entry concatenates, and no example seed is shown.

*Reach:* 1 session · 1 persona · iPad

*Repro:* Hangar: type 'r23-s5', PLAY SEED, then type 12345 and PLAY SEED.

*Findings:* F173

### C63 · LAUNCH HUNT button looks disabled — minor

LAUNCH HUNT 1 is grey like a disabled control; only a small '✓ launches' line says it's ready.

*Reach:* 1 session · 1 persona · desktop

*Repro:* Any seed: reach the loadout screen.

*Findings:* F193

## Visual (8)

### C03 · Hunt HUD text and button columns crowd and overprint the map, worst on iPhone — major

The top-left HUD text block runs over the map (and off the right edge on iPad), the button columns and bottom bar leave a narrow map strip on phones, and map labels collide with HUD lines. On iPhone the play area is a small strip.

*Reach:* 9 sessions · 5 personas · iPhone/iPad/desktop

*Repro:* Any seed on iPhone (734x343): launch hunt 1 and look at the map.

*Findings:* F020, F026, F052, F054, F064, F133, F149, F194, F249, F262, F266, F112, F199

### C25 · Map labels (suit names, SOUND, contact tags, PAINTED) overprint each other — minor

Suit name labels at drop, SOUND readouts, contact/ESM tags, PAINTED and CONTACT banners stack into unreadable smears, on every device and in the result replay.

*Reach:* 10 sessions · 4 personas · desktop/iPhone/iPad

*Repro:* Seed 303 (desktop): launch hunt 1; 'B Ines' and 'C Hollis' overlap.

*Suggestion:* De-overlap labels (offset or stack) near tokens.

*Findings:* F007, F022, F031, F037, F042, F045, F065, F072, F084, F111, F138, F141, F144, F154, F200, F217, F226, F236, F250

### C27 · Selected states and small text are faint (tabs, driver letters, survey chips, footers) — minor

Selected tabs and A/B/C driver buttons differ only by a faint grey; survey and test-bed answer chips show no picked state; rules footers are tiny grey text.

*Reach:* 4 sessions · 4 personas · desktop/iPad

*Repro:* Any seed: open ROSTER and tap A/B/C; answer the result survey.

*Findings:* F002, F016, F123, F171, F219

### C36 · City map shows the faction holding each district by colour only — minor

District nodes are orange/purple/blue circles; the holder appears only in text after tapping, which fails colour-blind players. On iPhone the sticky bottom buttons also cover TAKE IT.

*Reach:* 3 sessions · 1 persona · desktop/iPhone/iPad

*Repro:* Any seed: open CONTRACTS and look at the city map.

*Suggestion:* Add a faction letter to each node.

*Findings:* F012, F019, F029

### C55 · Company screen bottom HANGAR / NEW COMPANY bar covers the offer card and books — minor

On iPhone the sticky bottom buttons overlap TAKE IT and THE BOOKS text, and NEW COMPANY sits one tap from the offers.

*Reach:* 1 session · 1 persona · iPhone

*Repro:* Seed 3003 (iPhone): open the company screen and tap an offer.

*Findings:* F181

### C64 · City map district labels overlap each other and route lines — minor

'Neon Mile' and 'Ash Market' labels overlap each other and the links; job numbers over Old Rail look garbled.

*Reach:* 1 session · 1 persona · iPad

*Repro:* Seed 202 (iPad): look at the company city map.

*Findings:* F254

### C65 · Scan map edge clips the CARGO label and drop zone markers — minor

On iPad the CARGO label and numbered drop circles 1-3 are cut off at the scan map frame.

*Reach:* 1 session · 1 persona · iPad

*Repro:* Seed 3003 (iPad): pause the scan clock and read the map.

*Findings:* F063

### C66 · Gameplay Basics legend: SOUND label overlaps the EMIT line — minor

In the GAMEPLAY BASICS legend the SOUND ring label sits on top of the EMIT explanation.

*Reach:* 1 session · 1 persona · iPad

*Repro:* Open GAMEPLAY BASICS from the start screen.

*Findings:* F058

## How it felt (5)

### C11 · Hunts are long walks: about 2 tiles per AP on 40-64 tile maps, so a contract rarely finishes in a session — major

Players measure roughly 2 tiles per 4-AP NORM move and many turns to cross a 40-plus tile map; uplink and retrieve hunts take 80-plus actions, and no tester reached a contract's end-of-contract standing result.

*Reach:* 5 sessions · 4 personas · iPad/desktop/iPhone

*Repro:* Seed 3003 (iPad): move all three suits 4 AP toward a cargo 42t away and watch the counter.

*Findings:* F070, F086, F151, F195, F177, F184, F187

### C17 · Bailing costs full wages and upkeep (180 cr) and can push a company into debt — major

A bail on turn 5 of hunt 1 charges the full 120 wages + 60 upkeep and forfeits the fee, taking a fresh company from 300 to 120 cr or into debt, short of the next contract's costs.

*Reach:* 3 sessions · 3 personas · desktop · **only on desktop**

*Repro:* Seed 303 (desktop): QUIT hunt 1 at turn 5; company 300 to 120 cr.

*Findings:* F050, F106, F179

### C21 · Escort transport is lost with little warning — major

The transport drops from 5/5 to 1/5 or is 'seen by something' with only a long HUD line, then the hunt fails with no chance to react.

*Reach:* 2 sessions · 2 personas · desktop/iPad

*Repro:* Seed 1001 (desktop or iPad): escort hunt, follow the transport for 4-7 rounds.

*Findings:* F011, F137

### C30 · SPRINT's EN label is per tile, not per AP, and one sprint drains nearly all energy — minor

SPRINT reads '3t/AP 4EN', but a 3-4 AP sprint costs 36-48 EN, so one move empties EN and leaves no ECM/GHOST. The label reads as EN per AP; the cost actually charged is per tile.

*Reach:* 4 sessions · 3 personas · desktop/iPad · *evidence:* consistent (F152 state C EN 62 after starting at 100, matching the ~38 EN charged.)

*Repro:* Seed 2002 (iPad): set SPRINT, move 3 AP, compare EN spent with the button label.

*Suggestion:* Write it as '4EN/tile' and show EN left on the MOVE button.

*Findings:* F101, F152, F196, F267, F269

### C47 · Shots at 39-59% odds felt like they missed far too often — minor

One tester landed 2 of 8 shots shown at 39-59% and lost the lance with 0 kills. Small sample.

*Reach:* 1 session · 1 persona · iPad

*Repro:* Seed 3003 (iPad, hand 2): hunt 1 rounds 5-7.

*Findings:* F090

## Device-only issues

- **desktop:** Bailing costs full wages and upkeep (180 cr) and can push a company into debt (C17, 3 runs)
- **iPad:** Contacts vanish from the list (all at once at end of turn) with no message, and there is no way to re-find them (C15, 2 runs)
- **iPad:** Company 'FOLDED' after a failed contract with credits left, with no stated reason (C20, 2 runs)
- **iPhone:** ID picker lists enemy types with no guidance on which fits or how a guess is judged (C35, 2 runs)
- **desktop:** FIRE targets an earlier or auto-picked contact without making it clear (C40, 2 runs)
- **iPhone:** Z+ / Z- zoom buttons show no visible change on the hunt (C44, 2 runs)

## Oracle-only bugs (no tester noticed)

None.

## Models

| Model | Sessions | Notes / session | Valid | Noise | Oracle disagrees | Clusters hit | Only this model (major+) | Avg actions | Avg images | Fallbacks | Screens / session | Hunts finished |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| sonnet | 15 | 5.1 | 77 | 0 | 0 | 42 | 18 (1) | 81 | 22 | 0 | 12.5 | 2 |
| haiku | 13 | 15.1 | 188 | 3 | 5 | 49 | 25 (7) | 89 | 27 | 2 | 13.8 | 4 |

## Noise / tool limits

- Noise / tool limits: 4 findings

## Sessions

| Session | Persona | Model | Device | Length | Seed | Actions | Notes | Screens | Summary |
|---|---|---|---|---|---|---|---|---|---|
| a-s-dt-l1001-h1 | accessibility | sonnet | desktop | long h1 | 1001 | 96 | 11 | 12 | Played company hand 1: browsed city map, roster, suits, market; took Spires broker job (320cr). Hunt 1 (escort, 3 suits) lost at round 7 when a heavy patrol killed the transport. Contract continues at hunt 2 of 4 (need 3 |
| a-s-dt-l1001-h2 | accessibility | sonnet | desktop | long h2 | 1001 | 94 | 7 | 11 | Hand 2 of campaign: won hunt 2 (uplink, 2 kills, +175cr) after B went DOWN and was carried out; B was rebuilt (Pell drives). Started hunt 3 (uplink, 34t), sprinting east, nothing resolved. Problems: B DOWN and 'LOST' mes |
| a-s-ip-l1001-h1 | accessibility | sonnet | iPhone | long h1 | 1001 | 102 | 5 | 11 | Played company hand 1: browsed roster/suits/market, took escort job 2 (Broker vs Foundry, 320cr), skipped scan, launched. Reached round 7 escorting transport through forks (B2 north, C2 ahead), shot at patrols. Contract  |
| a-s-ip-l1001-h2 | accessibility | sonnet | iPhone | long h2 | 1001 | 85 | 5 | 11 | Hand 2, escort hunt 1/4 (medium danger Foundry job). Resume showed a fresh hunt, not h1's mid-hunt state. Set fork B2 NORTH, killed 2 of 4 heavy patrols, transport 5/5 now holding at fork C2 awaiting route. Top problems: |
| a-s-pad-s101 | accessibility | sonnet | iPad | short | 101 | 65 | 8 | 13 | Played Neon Mile broker job (contract 1) from company map to an UPLINK hunt; bailed after 6 rounds with uplink still ~20 route tiles away and no enemy fight. Result: CONTRACT BAILED. Top problems: (1) UPLINK distance rea |
| b-h-dt-s303 | breaker | haiku | desktop | short | 303 | 67 | 14 | 13 | Played a short session: named tester, took the 768 cr Retrieve hunt at The Stacks (HIGH danger), launched with three Wardens, ran five turns, then bailed with QUIT. Cargo went from 32t to 22t away at best; suits took rep |
| b-h-ip-s303 | breaker | haiku | iPhone | short | 303 | 47 | 7 | 13 | Played from the start screen into contract 1 (Foundry vs Corporate, RETRIEVE, 4x4). Set the scan, started the clock, and the clock ran to deadline while I read the panel. Launched hunt 1, drew paths and moved suits towar |
| b-h-pad-l3003-h1 | breaker | haiku | iPad | long h1 | 3003 | 129 | 21 | 13 | Played the company campaign on iPad: contract 1 (Neon Mile, Syndicate vs Foundry faction job, 360 cr) and into Hunt 1 (retrieve), about 10 rounds in. Cargo still 9 tiles out. Top problems: (1) MOVE charged all AP while s |
| b-h-pad-l3003-h2 | breaker | haiku | iPad | long h2 | 3003 | 104 | 11 | 16 | Resumed h1's campaign at contract 1 (Neon Mile faction job) and played hunt 1 of 3 (retrieve) to a loss at turn 8. RESUME CONTRACT restarted the hunt from a blank scan, so h1's clock and moves were gone. Clock ran during |
| fr-h-dt-s101 | fresh-recruit | haiku | desktop | short | 101 | 68 | 16 | 15 | Fresh recruit, first hunt. Took the Neon Mile broker job (Uplink, low danger, 192 cr) and launched hunt 1 with three Wardens. Stats (EM, IR, ACO, EMIT, ECM, GHOST, RADAR, sound rings, contacts) were not explained anywher |
| fr-h-ip-s101 | fresh-recruit | haiku | iPhone | short | 101 | 59 | 15 | 15 | Fresh recruit on iPhone. Got past the changelog splash, took a broker job, built a 3-suit loadout and launched UPLINK. Played 5 rounds: found contacts, ID'd an emplacement, took a shot that stripped suit C's weapon. Neve |
| fr-h-pad-l1001-h1 | fresh-recruit | haiku | iPad | long h1 | 1001 | 129 | 23 | 14 | Sam, fresh recruit, on iPad. Started the company campaign: took the Spires broker job, read the map, roster, suits and market, then launched Hunt 1 (escort). Lost the transport at turn 4, so hunt 1 failed. Launched Hunt  |
| fr-h-pad-l1001-h2 | fresh-recruit | haiku | iPad | long h2 | 1001 | 112 | 24 | 14 | Resumed Sam's company run (contract 1, hunt 2 of 4, uplink at yard C3). RESUME dropped me on the job pick, not the live hunt, so I retook the uplink. Radar ring would not drag. Lost all 3 suits by turn 10 to unseen shoot |
| qm-s-pad-s101 | quartermaster | sonnet | iPad | short | 101 | 33 | 5 | 11 | Riley: toured CONTRACTS, ROSTER, SUITS, MARKET, SHIP, MEMORIAL, hangar, TEST BED (played Hated and Liked scan stages and answered both), tried PLAY SEED. No hunt played. Economy math adds up (300-30 fuel-15 parts+8 sell= |
| rd-s-dt-l639772-h1 | round-designer | sonnet | desktop | long h1 | 639772 | 92 | 2 | 13 | Hand 1: read splash, took a Syndicate-vs-Foundry faction job (240 cr, 2 hunts) from the new city map, played hunt 1 (uplink, 6 turns), then bailed to see a contract end. Top problems: (1) bailed result has no standing or |
| rd-s-dt-l639772-h2 | round-designer | sonnet | desktop | long h2 | 639772 | 74 | 4 | 13 | Played hand 2: took Foundry-vs-Syndicate Low job (Tallow End, 144cr, 2 hunts), sprinted the lance to the guarded cargo, Wren lost legs and went CRITICAL, Nadia lost weapon; could not pick cargo up (range unclear), bailed |
| rd-s-ip-l3003-h1 | round-designer | sonnet | iPhone | long h1 | 3003 | 96 | 5 | 11 | Round designer, hand 1. Company screen/city map reads well: faction bars, district map, offer card with Complete-it standing lines. Took Syndicate vs Foundry faction job (360cr, MEDIUM), uplink hunt 1/3. After 9 rounds A |
| rd-s-ip-l3003-h2 | round-designer | sonnet | iPhone | long h2 | 3003 | 95 | 3 | 11 | Continued the Syndicate vs Foundry contract (hunt 1/3). RESUME restarted the hunt fresh, all suits FINE. Played the Retrieve job: sprinted then walked about 60 tiles, shot a heavy patrol, A lost its weapon, and the cargo |
| rd-s-pad-s967098 | round-designer | sonnet | iPad | short | 967098 | 32 | 1 | 13 | Round designer, iPad. Read splash, took Syndicate-vs-Corporate faction job from the city map, played hunt 1 (UPLINK, 32 tiles away). Rushed, lost suit B and drained A's energy by turn 4, bailed. Standing stayed 0 (bail), |
| totb-h-dt-l2002-h1 | thumb-on-the-bus | haiku | desktop | long h1 | 2002 | 129 | 14 | 11 | Hand 1 of the company campaign, to checkpoint. Took the Glasshouse faction job (384 cr, HIGH) over the Sump Gate broker job, then hunt 1 (RETRIEVE, 5x2 district, 8-min scan). Radar drag on the scan did nothing, clock ran |
| totb-h-dt-l2002-h2 | thumb-on-the-bus | haiku | desktop | long h2 | 2002 | 59 | 19 | 14 | Continued the Glasshouse contract (C1) and hunt 1 of 2 (retrieve, job 2). The saved hunt was gone on RESUME: it dropped me on the pre-drop job list and I re-picked job 2, so the notebook's live turn-10 state did not carr |
| totb-h-ip-l2002-h1 | thumb-on-the-bus | haiku | iPhone | long h1 | 2002 | 130 | 12 | 12 | Played hand 1 of the company campaign: took the Foundry vs Corporate job (384 cr, HIGH danger), launched a BOUNTY hunt. Quota met (135/120, 5 kills) on turn 7 but no extraction yet, so the contract is still running at my |
| totb-h-ip-l2002-h2 | thumb-on-the-bus | haiku | iPhone | long h2 | 2002 | 99 | 14 | 15 | Hand 2 of the campaign. Resumed Contract 1 at Hunt 1 (BOUNTY, 120 cr quota). RESUME restarted the hunt at 0/120, so hand 1's 135 progress was gone. Launched three suits, played eight turns, zero kills. An old radar mark  |
| totb-h-pad-s202 | thumb-on-the-bus | haiku | iPad | short | 202 | 23 | 6 | 15 | Took a broker job at Tallow End (HIGH, fee 384), then ESCORT hunt 1 on the scan and loadout screens. Launched, moved suits, and the transport stalled at the B2 fork with the lever unset. Bailed after 2 turns (QUIT, SURE? |
| tv-s-dt-s202 | tactics-veteran | sonnet | desktop | short | 202 | 97 | 6 | 14 | Desktop veteran. Read BASICS, took low-danger Foundry-vs-Syndicate faction job (216cr), full-map scan, one bounty hunt. Killed 3 scouts (75/120) in 6 rounds, then bailed: scouts kept slipping out of LOS and C went bloodi |
| tv-s-ip-s202 | tactics-veteran | sonnet | iPhone | short | 202 | 77 | 4 | 15 | Played Dockside broker job (hunt 1 of 2, Uplink). Won in 4 turns by clearing all 4 emplacements/turrets; read result and after-action, stopped at hunt 2 prep. Problems: (1) pay unclear: card 160, header 300/fee 160, resu |
| tv-s-pad-l2002-h1 | tactics-veteran | sonnet | iPad | long h1 | 2002 | 85 | 7 | 15 | Hand 1: company campaign, started 300cr/fuel 8/10, read BASICS, took Stacks RETRIEVE (Corporate vs Foundry, medium, 480cr, 4 hunts need 3). Hunt 1: crept/sprinted ~28 tiles, passive bearings fixed an emplacement, killed  |
| tv-s-pad-l2002-h2 | tactics-veteran | sonnet | iPad | long h2 | 2002 | 97 | 4 | 13 | Hand 2: resumed campaign; RESUME gave a fresh job pick (hunt state lost). Took BOUNTY (4x4 district, quota 120). Scanned full-map radar (7 pings), dropped west, walked 8 rounds SE with 3 suits; contacts vanished after ro |

*Repro:* every finding stamps the session seed (the tool seeds the company and offers with it) and the hunt seed. Paste `seed N <MISSION>` into PLAY SEED to replay a hunt.
