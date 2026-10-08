# Haiku vs Sonnet testers

**Date:** 2026-10-08 · **Batch:** `r23-models-1008` · **Sessions:** 14 (14 runs) · **Findings:** 93 from testers, 0 input fallbacks · **Clusters:** 32, plus noise · **Oracle violations:** 0 kinds

The QA panel ran agent testers in personas on the real build (`npm run build:qa`), on iPhone. The judge merged findings by root cause. Each cluster below counts the distinct runs that reported it. The **page** has filters, tester quotes, screenshots and triage. Plan: `claude/signal-lance-qa-harness.md`.

## Top 10 (severity × reach)

| # | Cluster | Cat | Sev | Reach | Evidence |
|---|---|---|---|---|---|
| 1 | **Bailing a hunt drops you on the company map with no result screen; credits fall 300 to 120 unexplained** | missing | major | 7 sessions · 3 personas · iPhone | n/a |
| 2 | **Hunt HUD text and action buttons cover the map and run off the right edge on iPhone** | visual | major | 6 sessions · 3 personas · iPhone | n/a |
| 3 | **Scan screen (radar, drop, zone, apron, ping, ALT, START CLOCK) gives no idea what to do** | confusing | major | 4 sessions · 1 persona · iPhone | n/a |
| 4 | **Drawn MOVE gives no walking feedback, so it reads as 'all AP spent for ~1 tile'** | bug | minor | 7 sessions · 3 personas · iPhone | oracle-disagrees |
| 5 | **Job intel and suit rows use unexplained codes (SND, EYES, EM, COR/LEG/WPN/SNS/BCK, +10 RDS)** | confusing | major | 3 sessions · 1 persona · iPhone | n/a |
| 6 | **Hits show 'HIT WPN/LEG/COR' but no damage or enemy condition; earlier hits vanish** | confusing | major | 3 sessions · 3 personas · iPhone | n/a |
| 7 | **Blocked action buttons (FIRE LOS/RANGE/FUZZY, ECM SNS, UPLINK RANGE) do nothing and give no reason** | ux | minor | 6 sessions · 3 personas · iPhone | n/a |
| 8 | **Key buttons sit below the fold on iPhone (TAKE IT, CONTINUE, CARD CLOSE, BACK)** | ux | minor | 5 sessions · 3 personas · iPhone | n/a |
| 9 | **Pre-hunt scan clock and risk jump while paused after a radar drag or drop-edge tap** | bug | major | 2 sessions · 1 persona · iPhone | tester-only |
| 10 | **Battle HUD is a wall of undefined terms (AP, EN, EMIT, SOUND, IR, ECM, GHOST, LEG bloodied, SNS gone)** | confusing | major | 2 sessions · 1 persona · iPhone | n/a |

## Bugs (5)

### C14 · Drawn MOVE gives no walking feedback, so it reads as 'all AP spent for ~1 tile' — minor

Many testers reported MOVE charging 3-6 AP while the suit moved about a tile. The real positions show the suits did walk the path; what players see is a suit still animating with AP already deducted, the drawn path left on the map, and no 'walking' or arrival cue.

*Reach:* 7 sessions · 3 personas · iPhone · *evidence:* oracle-disagrees (state shows suits moved several tiles (F085 C at x 11.5 vs 0.5-4.6; F017 A ~4 tiles from its turn-2 spot; F005 C at 17,5.6 vs A/B at 12,0.5), and F011/F034 self-corrected. Matches known artifact 1 (screen read mid-move). Lowered from major: the remaining issue is missing move feedback.)

*Repro:* Seed 202 (hunt 4278680494): draw a path for suit C, tap MOVE, look at once and again a few seconds later.

*Suggestion:* Clear the drawn path and show a short 'moving' state until the suit arrives.

*Findings:* F005, F010, F011, F017, F019, F033, F034, F041, F076, F085

### C06 · Pre-hunt scan clock and risk jump while paused after a radar drag or drop-edge tap — major

With the scan clock paused, dragging the radar ring or tapping a drop edge advanced the clock by ~4 ship-min and raised risk by the same amount (STEP counter also went up). The scan text says time only passes while the clock runs, so players lose time they think is frozen.

*Reach:* 2 sessions · 1 persona · iPhone · *evidence:* tester-only (state is only the loadout snapshot; both testers read clock/risk/step numbers directly, so this is not the 'no visible change' tool gap (that part of their note is the artifact). Could be intended action cost with misleading text.)

*Repro:* Seed 101 or 202, HUNT 1 scan screen: START CLOCK, PAUSE, drag the radar ring (or tap 1 WEST EDGE); watch CLOCK/RISK/STEP.

*Suggestion:* Either freeze the clock on paused actions or say on screen that each scan action costs time.

*Findings:* F039, F047

### C17 · END TURN tap right after MOVE is ignored or shows nothing; a second tap is needed — minor

Tapping END TURN straight after a MOVE often does nothing visible; a second tap ends the turn. Even when the first tap works, the enemy phase runs for ~10 s without a clear 'enemy turn' cue. F065 also notes escort pacing feels slow.

*Reach:* 3 sessions · 2 personas · iPhone · *evidence:* consistent (F013 state after the first tap: turn 2, B still active with AP 2, so the tap really was not taken (likely swallowed while the move animates). F054 state shows the enemy phase did run, so that one is feedback only. Kept minor; F065's major mostly reflects pacing.)

*Repro:* Seed 202 hunt 4278680494, turn 2: MOVE suit B 2AP, tap END TURN at once.

*Findings:* F013, F054, F065

### C23 · Suit max hits drop from 8/8 to 6/6 after a bail with no explanation — minor

After quitting hunt 1, all three suits show FINE 6/6 on the SUITS tab where the hunt showed 8/8; nothing says why max hits fell.

*Reach:* 1 session · 1 persona · iPhone · *evidence:* tester-only (state is null for this note; could be a bail penalty or a display mismatch between hunt and company screens.)

*Repro:* Seed 101: take the Neon Mile job, launch hunt 1, QUIT, open SUITS.

*Findings:* F008

### C24 · DEBUG: REROLL JOBS button is visible to players on the jobs screen — minor

A developer-only 'DEBUG: REROLL JOBS' button sits under the scan options on the jobs screen.

*Reach:* 1 session · 1 persona · iPhone · *evidence:* tester-only (No state bears on it; tester saw the button directly.)

*Repro:* Seed 101: take the Kiln Street contract, scroll to the bottom of the jobs screen.

*Suggestion:* Hide it behind a debug flag.

*Findings:* F072

## Missing (1)

### C01 · Bailing a hunt drops you on the company map with no result screen; credits fall 300 to 120 unexplained — major

QUIT > SURE? mid-hunt returns straight to the company map. Credits drop (300 to 120), fuel drops, the contract counter advances and the contract is marked failed, but no result, after-action or bail-cost screen says any of this. Reported by 7 sessions across every persona.

*Reach:* 7 sessions · 3 personas · iPhone

*Repro:* Seed 101: take the Neon Mile broker job, launch hunt 1, QUIT > SURE?. Compare credits/contract number before and after.

*Suggestion:* Route QUIT through the result screen with a line for the bail cost.

*Findings:* F007, F021, F023, F044, F069, F080, F087, F045

## Confusing (12)

### C03 · Scan screen (radar, drop, zone, apron, ping, ALT, START CLOCK) gives no idea what to do — major

The pre-drop scan screen offers RADAR, THERMAL, EM LISTEN, FULL MAP, RING, drop edges and START CLOCK with no explanation of the goal or the terms; FULL MAP even renames other buttons. Fresh recruits did not know what they were meant to do there.

*Reach:* 4 sessions · 1 persona · iPhone

*Repro:* Seed 101/202, take a job, open the HUNT 1 scan screen as a new player.

*Findings:* F040, F068, F070, F046

### C04 · Job intel and suit rows use unexplained codes (SND, EYES, EM, COR/LEG/WPN/SNS/BCK, +10 RDS) — major

Job cards and suit rows on the jobs screen use shorthand (SND, EYES, EM, IR, ears, COR, LEG, WPN, SNS, BCK, '+10 RDS 25 cr') that is never defined, so players pick jobs and gear blind.

*Reach:* 3 sessions · 1 persona · iPhone

*Repro:* Seed 1001: open the jobs screen and read the TAKE JOB 1 card and suit rows.

*Findings:* F025, F062, F026, F060, F059

### C05 · Hits show 'HIT WPN/LEG/COR' but no damage or enemy condition; earlier hits vanish — major

Shooting a patrol only shows the last shot's part hit. There is no damage figure, no patrol health, and no line saying whether it is down, so players cannot judge whether to keep firing.

*Reach:* 3 sessions · 3 personas · iPhone

*Repro:* Seed 101: fire at PATROL U5 several times and read the HUD.

*Findings:* F004, F056, F074

### C07 · Battle HUD is a wall of undefined terms (AP, EN, EMIT, SOUND, IR, ECM, GHOST, LEG bloodied, SNS gone) — major

New players see EMIT, SOUND, IR, ECM, GHOST, FUZZY and part status words like 'LEG bloodied' / 'SNS gone' with no explanation; 'EMIT 0 (-25/turn)' reads as a bad number. Fresh recruits could not tell what any of it did.

*Reach:* 2 sessions · 1 persona · iPhone

*Repro:* Any hunt, fresh player: read the top-left HUD and bottom-right button row.

*Suggestion:* Tap-to-explain on each HUD term.

*Findings:* F029, F049, F032

### C08 · 'CRITICAL: end a turn next to it' is cryptic; suits go DOWN without a clear cause or fix — major

A suit next to a patrol shows 'CRITICAL: end a turn next to it' and then goes DOWN; the message does not name the enemy ('it'), the danger, or how to disengage.

*Reach:* 2 sessions · 1 persona · iPhone

*Repro:* Seed 1001 or 202: end a round with a suit adjacent to a heavy patrol; read the suit row next round.

*Suggestion:* Name the threat and the way out ('next to PATROL U5: move away or it dies').

*Findings:* F037, F055

### C09 · Escort transport rules are opaque: levers unexplained, transport waits at the fork, no damage forecast — major

On ESCORT hunts the HUD shows 'heading for fork at B2 levers: B2 -, C2 -' with no lever control or help, the transport sat still for three rounds, and a turret chipped it each round with no estimate of how long it lasts.

*Reach:* 2 sessions · 2 personas · iPhone · *evidence:* tester-only (F035 was filed as a bug; state carries no transport data. The waiting is most likely the unset lever at the fork rather than a stuck transport, so treated as a rules-visibility problem.)

*Repro:* Seed 1001 (ESCORT, Sweep): play three rounds without touching the fork; watch the TRANSPORT line. Seed 202 for the turret damage.

*Findings:* F035, F031, F086

### C19 · Result screen is cryptic: T1/T4 labels, '???' lines, uplink steps missing, reflection questions without purpose — minor

The result/after-action screen shows unexplained T1/T4 labels and '???' log lines, omits a suit's uplink step, and asks 'why I picked this job' / 'who I angered' without saying what the answers do.

*Reach:* 3 sessions · 3 personas · iPhone

*Repro:* Seed 202: finish or lose a hunt and read DETAILS and the reflection panel.

*Findings:* F018, F057, F093

### C13 · After a lost hunt the jobs screen reads 'HUNT 2/3' with no word on whether the run is over — major

After a FAIL result the game jumps to the jobs list headed 'HUNT 2/3 · wins 0 (need 2)' with a greyed REBUILD; nothing says what the run now needs or whether it can still be won.

*Reach:* 1 session · 1 persona · iPhone

*Repro:* Seed 202: lose a hunt, press SAVE & NEXT.

*Findings:* F058

### C21 · UPLINK distance readout changes with the active suit and phase — minor

The HUD UPLINK line is measured from the active suit, so it jumps (21t to 29t, or 14t/6t/9t within a turn) when the active suit changes, with nothing saying which suit it measures from.

*Reach:* 2 sessions · 2 personas · iPhone

*Repro:* Seed 101 hunt 2798623296: move A closer, end its turn, watch UPLINK when B becomes active.

*Suggestion:* Label it 'A: 21t to uplink'.

*Findings:* F042, F078

### C22 · Unclear whose turn it is: ORDER strip and 'YOUR MOVE' shown on a suit with 0 AP — minor

The turn-order strip and suit list never say in plain words whose turn it is, and a suit with 0 AP still shows YOUR MOVE.

*Reach:* 2 sessions · 1 persona · iPhone

*Repro:* Seed 1001: move A with all 4 AP, then look at the HUD before tapping END TURN.

*Findings:* F052, F064

### C26 · Move mode silently switches to CREEP when the active suit has leg damage — minor

When the active suit changes to one with a bloodied leg, move mode flips from NORMAL to CREEP (buttons read NORM LEGS / SPRINT LEGS) with nothing linking it to the damage.

*Reach:* 1 session · 1 persona · iPhone

*Repro:* Seed 202 hunt 4278680494, turn 2: END TURN from B so C (bloodied leg) becomes active.

*Findings:* F014

### C28 · '(old)' contacts can still be fired on; unclear whether they are in view — minor

A patrol tagged (old) still offers a 66% FIRE, and both shots missed; players cannot tell if the contact is actually visible or where it is.

*Reach:* 1 session · 1 persona · iPhone

*Repro:* Seed 101 hunt 2798623296, turn 2: fire A at PATROL heavy U5 while it reads (old).

*Findings:* F075

## UI / UX (7)

### C15 · Blocked action buttons (FIRE LOS/RANGE/FUZZY, ECM SNS, UPLINK RANGE) do nothing and give no reason — minor

When an action is unavailable the button relabels itself to a short code (LOS, RANGE, FUZZY, SNS) and a tap does nothing, with no message. Players read it as a broken button and do not know what to fix.

*Reach:* 6 sessions · 3 personas · iPhone

*Repro:* Seed 1001: with Mech B's SNS gone, tap ECM SNS. Seed 202: tap FIRE with a target out of sight/range.

*Suggestion:* On tap, show one line: 'No line of sight to U5' / 'Sensor destroyed'.

*Findings:* F006, F016, F084, F043, F036, F077

### C16 · Key buttons sit below the fold on iPhone (TAKE IT, CONTINUE, CARD CLOSE, BACK) — minor

On iPhone, TAKE IT on the contract card, CONTINUE on the splash, CLOSE on the CARD overlay and BACK on the basics page are only reachable after a long scroll, and TAKE IT can sit under the bottom bar.

*Reach:* 5 sessions · 3 personas · iPhone

*Repro:* iPhone viewport: open the splash, then the company contract card.

*Suggestion:* Pin the primary button to the bottom of the viewport.

*Findings:* F024, F061, F066, F020, F088

### C20 · Drop edge choice gives no feedback on the scan screen — minor

Tapping a drop edge (e.g. 1 WEST EDGE) does not highlight it or mark the map; the choice only shows up later on the loadout screen.

*Reach:* 2 sessions · 1 persona · iPhone · *evidence:* tester-only (F027 bug claim rests on 'no visible change' (known artifact 2); F028 confirms the choice registered. Lowered from major.)

*Repro:* Seed 1001/202 scan screen: tap 1 WEST EDGE.

*Suggestion:* Highlight the chosen edge.

*Findings:* F027, F028, F048

### C27 · Unspent AP carries over between turns with no stated rule or cap — minor

Leaving AP unspent carries it into the next turn (B reached AP 6/8) but the HUD never explains the carry-over or its limit.

*Reach:* 1 session · 1 persona · iPhone

*Repro:* Seed 202: end turn with suits A and B on 2 AP and check next turn.

*Findings:* F015

### C29 · Moves stop on every new contact, cutting long walks short — minor

Sprinting toward the uplink kept ending in MOVE STOPPED: CONTACT, refunding some AP, so long moves take many taps.

*Reach:* 1 session · 1 persona · iPhone

*Repro:* Seed 202 hunt 4010287874 (Turret nest): sprint toward the uplink.

*Findings:* F071

### C30 · Map view jumps between moves, making suit positions hard to track — minor

The map camera recentres between moves, so the player loses track of where each suit is.

*Reach:* 1 session · 1 persona · iPhone

*Repro:* Seed 202: move two suits in a row and watch the map view.

*Findings:* F053

### C31 · Unlabelled mech-part buttons on the loadout suit diagram — minor

Three tappable part buttons on the loadout suit diagram have no label.

*Reach:* 1 session · 1 persona · iPhone

*Repro:* Seed 101: open the hunt loadout and look at the suit diagram.

*Findings:* F001

## Visual (4)

### C02 · Hunt HUD text and action buttons cover the map and run off the right edge on iPhone — major

On iPhone the multi-line HUD status block runs under the map and is cut off at the right edge, and the ECM/GHOST/FIRE/END TURN cards sit over the right third of the map. Contact banners and route labels stack on the same area, so testers could not find fork markers or read the objective line.

*Reach:* 6 sessions · 3 personas · iPhone

*Repro:* Seed 202 (ESCORT, Ambush), iPhone: launch hunt 1 and look at the top HUD lines and right-hand button column on turn 2.

*Suggestion:* Wrap HUD lines to the viewport width and keep the button column off the playable map area.

*Findings:* F009, F012, F022, F030, F050, F051, F063, F082

### C18 · Suit name tags overlap on the map, so suits look stacked on one point — minor

Suit labels at the drop point and near the fork pile on top of each other, and the movement-stopped caption overlaps them too. One tester read this as two suits on the same tile.

*Reach:* 3 sessions · 2 personas · iPhone · *evidence:* oracle-disagrees (F079: state has A at (9.6,30.5) and B at (8.5,30.5), separate tiles; the overlap is a label problem, not shared position.)

*Repro:* Seed 202: drop all three suits and look at the drop point.

*Findings:* F002, F083, F073, F079

### C25 · Map is clipped and zooming out does not reveal the UPLINK target — minor

On hunt 1 the map fills only the lower-right corner of the view, zoom-out does not show more of it, and the UPLINK ring stays off screen.

*Reach:* 1 session · 1 persona · iPhone

*Repro:* Seed 101 (hunt 3359317748): tap Z minus twice and look for the UPLINK ring.

*Findings:* F003

### C32 · District labels collide on the CONTRACTS map — polish

District names on the company CONTRACTS map overlap each other.

*Reach:* 1 session · 1 persona · iPhone

*Repro:* Seed 202: open the company CONTRACTS map.

*Findings:* F081

## How it felt (3)

### C10 · Fights are lethal with no read on the threat: a heavy patrol or turret nest wipes suits in a few turns — major

Testers lost a suit to one heavy patrol in about two turns, and a whole lance to a MEDIUM turret job by turn 5, without any sense beforehand that the enemy was that dangerous or what counterplay existed.

*Reach:* 2 sessions · 2 personas · iPhone

*Repro:* Seed 1001 hunt 977825545: leave Mech B near the heavy patrol. Seed 202 hunt 4010287874 (Turret nest): walk to the uplink.

*Findings:* F038, F092

### C11 · Reaching the uplink takes the whole action budget; no route or progress readout — major

UPLINK objectives sit ~28 tiles away; walking eats all AP and sprinting drains EN, with no route, ETA or progress readout, so the objective feels out of reach.

*Reach:* 2 sessions · 2 personas · iPhone

*Repro:* Seed 101 (UPLINK, Fortified): try to walk a suit to the gold ring.

*Findings:* F067, F089, F090

### C12 · Medium contract pays less than its end-of-contract costs (160 cr vs 180 cr) — major

The Dockside job pays 160 cr over 2 hunts but wages 120 + upkeep 60 = 180 cr, and the job card shows no net figure, so taking it looks like a guaranteed loss.

*Reach:* 1 session · 1 persona · iPhone

*Repro:* Seed 202: select Dockside on the company screen and open THE BOOKS.

*Suggestion:* Show a net-profit preview on the job card.

*Findings:* F091

## Device-only issues

None reported by two or more runs on one device only.

## Oracle-only bugs (no tester noticed)

None.

## Models

| Model | Sessions | Notes / session | Valid | Noise | Oracle disagrees | Clusters hit | Only this model (major+) | Avg actions | Avg images | Fallbacks | Screens / session | Hunts finished |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| haiku | 7 | 9.9 | 56 | 0 | 13 | 28 | 19 (6) | 47 | 27 | 0 | 12.0 | 1 |
| sonnet | 7 | 3.4 | 23 | 0 | 1 | 13 | 4 (2) | 47 | 16 | 0 | 12.0 | 2 |

Blind quality pass (an Opus judge scored every finding without knowing the model; 0–2 each):

| Model | Real & correct (2) | Wrong / artifact (0) | Avg real | Avg actionable | Avg insight | High-insight (2) |
|---|---|---|---|---|---|---|
| haiku | 46 | 9 | 1.54 | 1.48 | 0.52 | 4 |
| sonnet | 15 | 1 | 1.58 | 1.25 | 0.38 | 1 |

## Sessions

| Session | Persona | Model | Device | Length | Seed | Actions | Notes | Screens | Summary |
|---|---|---|---|---|---|---|---|---|---|
| b-h-ip-s101 | breaker | haiku | iPhone | short | 101 | 32 | 8 | 11 | Played the start screen, took the Neon Mile broker job, and played hunt 1 (UPLINK) for about 8 game-minutes and one turn; the hunt was going nowhere, so I quit. Top problems: credits fell 300 to 120 on quit with no resul |
| b-h-ip-s202 | breaker | haiku | iPhone | short | 202 | 63 | 10 | 11 | Played one hunt (ESCORT, job from the company map), start to finish, on the breaker persona. Lost on turn 3: transport lost, no pay. Top problems: (1) MOVE spends AP but the suit barely moves on the map, and the drawn pa |
| b-s-ip-s101 | breaker | sonnet | iPhone | short | 101 | 24 | 3 | 12 | Played Round 23 build as breaker on iPhone. Took Neon Mile UPLINK job (low danger, fee 192) from company screen, launched with 3 suits, moved and ended turns for 2 rounds (uplink 28 tiles away, too far for a short sessio |
| b-s-ip-s202 | breaker | sonnet | iPhone | short | 202 | 17 | 3 | 11 | Played escort hunt (3-hunt HIGH contract). Moved one suit, transport took a turret hit on turn 1, bailed via QUIT/SURE? after 1 turn; no win/lose or after-action screen appeared. Top problems: bail gives no result screen |
| fr-h-ip-l1001-h1 | fresh-recruit | haiku | iPhone | long h1 | 1001 | 50 | 14 | 12 | Fresh recruit, hand 1 checkpoint (50/60 actions). Took the Broker job vs Foundry (320 cr, 4 hunts, win 3). Hunt 1 is an escort: scanned with RADAR, dropped at the west edge, and fought a patrol scout (killed) and a heavy |
| fr-h-ip-s101 | fresh-recruit | haiku | iPhone | short | 101 | 38 | 7 | 11 | Signal Lance, fresh recruit Sam. Got through the test-bed splash and took the broker job on the company map. In hunt 1 (UPLINK) I walked suits toward the uplink, about 1 to 3 tiles per turn in sprint, and reached turn 2  |
| fr-h-ip-s202 | fresh-recruit | haiku | iPhone | short | 202 | 40 | 14 | 12 | Fresh recruit, first hunt. Got through title/changelog to the company map, took the broker job vs Corporate, took ESCORT, dropped at the west edge. Lost the transport in round 2 (FAIL, field lost, C Wren KIA). Then the r |
| fr-s-ip-l1001-h1 | fresh-recruit | sonnet | iPhone | long h1 | 1001 | 49 | 6 | 11 | Hand 1: took Spires broker job (medium, 320cr), dropped into an escort hunt 1/4 (need 3 wins). Set transport route NORTH at fork B2, advanced all three suits, no fights yet; one unknown contact south. Top problems: HUD c |
| fr-s-ip-s101 | fresh-recruit | sonnet | iPhone | short | 101 | 57 | 4 | 10 | Played Round 23 build on phone. Took Syndicate broker job (Uplink), launched, sprinted three suits toward the yard for 3 rounds, never met an enemy, then quit at turn 3 (20t from the yard). No result or after-action scre |
| fr-s-ip-s202 | fresh-recruit | sonnet | iPhone | short | 202 | 56 | 2 | 13 | Took Dockside-area UPLINK job (3 suits, medium danger), launched, killed 3 turrets/emplacement, held uplink 3 turns, WON turn 3, +200cr +6 parts. Problems: (1) scan/pre-drop screen with radar/alt/clock gave no plain next |
| tv-h-ip-s101 | tactics-veteran | haiku | iPhone | short | 101 | 62 | 9 | 13 | Played GAMEPLAY BASICS (skimmed most), took the Kiln Street faction job (240 cr, Corp +20, Foundry -25, Syndicate -12 via ally), chose Uplink, launched a 3-suit Warden lance. Fought PATROL heavy: 2 hits, several misses;  |
| tv-h-ip-s202 | tactics-veteran | haiku | iPhone | short | 202 | 47 | 7 | 14 | Read GAMEPLAY BASICS, took the Tallow End escort (384 cr, HIGH) from the company map, launched hunt 1 with three Warden suits and a Steel plate. Turret sentry shot the transport 5/5 to 3/5 while my mechs sat; one FIRE at |
| tv-s-ip-s101 | tactics-veteran | sonnet | iPhone | short | 101 | 80 | 3 | 13 | Played: Neon Mile broker job, then the uplink hunt. Did not finish. Spent the 80 actions walking 3 suits toward a yard 28t away and never got contact. Problems: (1) the uplink trek is too slow, one activation per suit; s |
| tv-s-ip-s202 | tactics-veteran | sonnet | iPhone | short | 202 | 47 | 3 | 14 | Played one hunt (Dockside broker job, uplink objective vs turret nest). Took contract from company screen, read BASICS, launched with default lance. Lance wiped out turn 5 (LOSS, 1 kill, uplink 2/3). Read result screen.  |

*Repro:* every finding stamps the session seed (the tool seeds the company and offers with it) and the hunt seed. Paste `seed N <MISSION>` into PLAY SEED to replay a hunt.
