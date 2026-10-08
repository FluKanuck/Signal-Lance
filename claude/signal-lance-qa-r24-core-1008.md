# QA batch r24-core-1008

**Date:** 2026-10-08 · **Batch:** `r24-core-1008` · **Sessions:** 28 (19 runs) · **Findings:** 297 from testers, 3 input fallbacks · **Clusters:** 63, plus noise · **Oracle violations:** 0 kinds

The QA panel ran agent testers in personas on the real build (`npm run build:qa`), on desktop, iPhone, iPad. The judge merged findings by root cause. Each cluster below counts the distinct runs that reported it. The **page** (https://claude.ai/artifact/Wma3pSVagK986FfBHrV9NX) has filters, tester quotes, screenshots and triage. Plan: `claude/signal-lance-qa-harness.md`.

## Compared with r23-core-1008 (the R24 re-check)

This batch runs the r23 grid again (same 28 sessions, same seeds, the same lead-made `quartermaster`) on build r24-s3. The judge matched every cluster to the r23 clusters with the same root cause (`analysis/compare.json`).

| | r23 | r24 |
|---|---|---|
| Findings (tester) | 275 | 297 |
| Clusters | 67 | 63 |
| r23 clusters with no r24 match (**gone**) | | 24 |
| Fewer sessions report it (**shrunk**) | | 19 pairs |
| Same or more sessions (**same or worse**) | | 29 pairs |
| **New** | | 20 |

**Gone:** the R24 fix list landed. No tester reported these again: the bare bail screen (C06), the bail with no cost warning (C13, C57), FOLDED with no reason (C20), the lame ExoS that can't move (C23), "nobody gains" on broker cards (C51), the hidden face mode (C39), FIRE auto-picking a target (C40), and the BASICS overlap (C66).

**Shrunk:** greyed FIRE with no reason (r23 C02 → r24 C08, 11 → 6 sessions; the remaining complaint is that FIRE gives no hit / miss message, not the reason), the objective distance (C04, 9 → 1), part damage on buttons (C08, 8 → 2), the HUD overrunning the screen (C03, 11 → 5), the DEBUG reroll (C28, 5 → 2, the testers who saw it were on a page loaded before the build), drop zone feedback (C37, 2 → 1). The escort route (r23 C14) split into two smaller clusters (2 + 2 sessions).

**Same or worse, and why:**
- **Jargon is still the top confusion** (r23 C09 / C10 → r24 C05 / C04, 7 → 9 and 7 → 10 sessions). The long-press cards work: 23 of 28 testers named the explain cards or the greyed-button reasons under "what worked". But players meet terms that the cards don't cover ("N fit", "(old)", "snd", "base 75 · sig +2", job-card INTEL lines). r23 testers could not long-press at all, so this is a different, smaller complaint: "this term has no card", not "nothing is explained". Every one of the uncovered terms is listed in the clusters.
- **Map clutter** (r23 C25 → r24 C22, 14 → 19 sessions) and **contacts under the buttons** (r23 C07 → r24 C02, 8 → 11). Checkpoint B moved labels apart and kept the camera clear of the overlays. Testers still see overlap when ExoS stand together, and the new ROUTE bar adds one more overlay (r24 C09).
- **Hunts are long walks** (r23 C11 → r24 C03, 7 → 11). A pacing issue, not a words issue: R24 did not touch it.
- **Hand-2 testers lose the hunt on resume** (r24 C26, 5 sessions): the known relay effect (the hand-off save is between hunts only). Capped at minor.

**New, worth a look:**
- **C01 · A long-press or right-click also acts on the control** (8 sessions, the top bug). Fixed after the batch (see below).
- **C20 · FIRE live on a contact tagged SOUND** (1 session): the state shows a tight fix, so the tag and its card were stale, not FIRE. Evidence: oracle-disagrees.
- **C32 · The tap that closes an explain card also presses the button under it.** This is the design (a tap on a control closes the card and acts). Several testers find it a trap. A design call for the next round.
- **The scan clock moves while paused** (r23 C45 → r24 C18, 1 → 2 sessions). Still unconfirmed in state.

**Test bed not played:** no tester opened the TEST BED, so "Read it cold" and "Crowded phone" have no QA data. Jamie's phone test covers them.

## Fixed after this batch (commit "Fix three QA finds")

- C01, for every button: a long-press or right-click never fires a control now. A control with no glossary entry shows a plain card. ROUTE bar buttons read the ROUTE entry. Still open from C01: a hold on the map or on your own ExoS arms a move, and a hold on the scan map moves the ring.
- Two operators with one first name (r24 cluster with Ezra / Fen / Wren, r23 C67): first names are unique on a roster now.

## How this batch ran

The tool had three gaps at the start: no long-press, explain cards not reported, and ring drags lost on touch. The lead found them in the first wave, fixed the tool and the scan's pointer capture, set the 9 early sessions aside (`qa-runs/r24-core-1008-oldtool/`), and ran them again. Every session in this report ran on the fixed tool. Details: `qa-runs/r24-core-1008/analysis/known-artifacts.md`.

## Top 10 (severity × reach)

| # | Cluster | Cat | Sev | Reach | Evidence |
|---|---|---|---|---|---|
| 1 | **Hunts are long walks: 2-3 tiles per activation, rounds with no enemy in sight** | balance-feel | major | 9 sessions · 6 personas · iPad/desktop/iPhone | n/a |
| 2 | **A long-press or right-click on a control also acts on it (ROUTE, FIRE, CREEP, GHOST, TO THE HANGAR, TAKE JOB, module slot, map)** | bug | major | 8 sessions · 5 personas · desktop/iPhone/iPad | consistent |
| 3 | **Contacts and map tags sit under the side button columns and bottom bar, so taps hit ECM / GHOST / SPRINT instead** | ux | major | 8 sessions · 6 personas · iPhone/iPad/desktop | n/a |
| 4 | **'UNKNOWN · N fit' and '(old)' on contact tags are never defined; the long-press card explains the circle, not 'fit'** | confusing | major | 7 sessions · 4 personas · iPad/desktop/iPhone | n/a |
| 5 | **Map labels (ExoS names, TRANSPORT, SOUND, contact tags, PAINTED, CRITICAL) still print on top of each other** | visual | minor | 14 sessions · 6 personas · desktop/iPhone/iPad | n/a |
| 6 | **Hunt HUD words (snd, EMIT, shots 1/2, 'base 75 · sig +2', '0 AP kept', NO LOCK, NO SIGHT, OUT OF RANGE) are not explained where they appear** | confusing | major | 6 sessions · 4 personas · desktop/iPhone/iPad | n/a |
| 7 | **MOVE spends the AP but the ExoS ends short of, off, or away from the drawn path, with no stop message** | bug | major | 6 sessions · 4 personas · iPad/desktop/iPhone | consistent |
| 8 | **Job card INTEL lines (ESM, EMIT, RADAR, IR, SOUND, EARS 1, SCAN WINDOW) are dense jargon with no explain card** | confusing | major | 5 sessions · 3 personas · desktop/iPad/iPhone | n/a |
| 9 | **FIRE gives no hit or miss message; the result is only in the expanded HUD or a red X** | missing | major | 5 sessions · 4 personas · desktop/iPhone/iPad | consistent |
| 10 | **Hangar module slots (EM array, Mask) and paper-doll part slots have no names and no explain card** | missing | major | 5 sessions · 4 personas · iPhone/desktop | n/a |

## Bugs (13)

### C01 · A long-press or right-click on a control also acts on it (ROUTE, FIRE, CREEP, GHOST, TO THE HANGAR, TAKE JOB, module slot, map) — major

Players hold (or right-click on desktop) a control to read its explain card, and the control acts too: a ROUTE fork is set, FIRE spends the shot, CREEP / GHOST arm, TO THE HANGAR skips the scan, TAKE JOB takes the job, a module slot opens its picker, the scan ring jumps, a hold on the map or own ExoS arms a move. The R24 'hold to explain' promise makes this a trap: the safe way to learn costs a shot, AP, EN or a route.

*Reach:* 8 sessions · 5 personas · desktop/iPhone/iPad · *evidence:* consistent (Known-artifacts item 11 confirms it in code (controls with no glossary entry act on release; desktop right-click still runs pointerup). F016 state: A at 2 AP after the shot. F237: GHOST stayed armed after the card closed and the next map tap placed a decoy (AP 4 to 3, EN 100 to 75).)

*Repro:* Desktop seed 1001 escort: right-click FIRE 77% with a contact selected (AP 1 to 0, FIRE USED). iPhone/iPad: hold ROUTE AT C2 NORTH; hold TO THE HANGAR on the scan.

*Suggestion:* Have explain.ts swallow the release after any long-press / contextmenu, for every control, not only glossary ones.

*Findings:* F008, F016, F050, F173, F184, F209, F236, F237, F244, F255, F295, F198, F172, F176, F191

### C06 · MOVE spends the AP but the ExoS ends short of, off, or away from the drawn path, with no stop message — major

On every device players draw or tap a destination, MOVE shows a cost, and all of it is spent while the ExoS moves about a tile, ends off the line, or walks away from the objective (UPLINK 31t to 33t, 10t to 16t). No MOVE STOPPED line or route preview says why. Still the top movement complaint after R24.

*Reach:* 6 sessions · 4 personas · iPad/desktop/iPhone · *evidence:* consistent (State agrees AP was fully spent (F084 B 7 to 0 AP, 14 EN; F088 C 8 to 0 AP, 16 EN) while B ends next to the patrol at (0.5,3.2) and the uplink distance rose (F059 B at 9.4,37.4). Some short ends are contact stops (F084 B is beside U7) but no message was shown.)

*Repro:* iPad seed 3003 hunt 1 round 2: draw a north-east path from A toward the UPLINK, MOVE; A ends at the west edge. iPad seed 1001: tap east of the transport, MOVE 6AP; A goes far north.

*Suggestion:* Show the walked route before MOVE and print a stop reason (WALL / CONTACT / NO ROUTE) whenever the end tile differs from the target.

*Findings:* F034, F058, F059, F078, F081, F082, F084, F088, F098, F107, F108, F122, F139, F164

### C24 · CTR and Z- do nothing visible on the hunt map — minor

CTR (and Z- / Z+ on some devices) reports no visible change, so ExoS and the transport stay off screen or under the buttons; players drag the map instead.

*Reach:* 5 sessions · 3 personas · iPad/desktop/iPhone · *evidence:* tester-only (No camera field in state. Lowered from major: the map can be dragged. Z+/Z- worked for one tester (F232).)

*Repro:* iPad seed 1001 escort round 3: walk B off the bottom, tap CTR.

*Findings:* F054, F096, F121, F142, F232, F260

### C26 · Resume after a hand-off restarts the current hunt from job pick — minor

Hand 2 players tap RESUME CONTRACT and get job pick for the current hunt with all ExoS FINE and 300 cr, not the live hunt. This is the relay starting from save-end.json (company and contract only), not the game's SAVE & QUIT.

*Reach:* 5 sessions · 5 personas · desktop/iPad · *evidence:* consistent (Known-artifacts item 1: the relay ignores SAVE & QUIT. Kept at minor. F017 state fuel 7 matches hunt-1 spend, not a new charge.)

*Repro:* Any hand 2 session: RESUME CONTRACT.

*Findings:* F017, F163, F180, F221, F294

### C27 · Two operators share a first name (Ezra / Fen / Wren), so wage and level-up lines look doubled — minor

The roster rolls two Ezras, Fens or Wrens. Wage lines list one name twice, level-up lines read 'Fen to level 2 ... Fen to level 2', and with only 3 ExoS dropping, players think the 4th wage is a mistake.

*Reach:* 5 sessions · 4 personas · desktop/iPhone/iPad · *evidence:* consistent (Known-artifacts item 11 confirms it. F100 state ops 4: the 4th operator is a real reserve, so '4 operators' is right; the reporter's major is lowered.)

*Repro:* Desktop seed 101 or 1001: read THE BOOKS wages line.

*Findings:* F018, F021, F100, F109, F166, F281

### C18 · Scan clock and RISK jump while the clock shows paused — major

Two desktop/iPad testers paused the scan clock and then saw it jump (0.25 to 6.25 ship-min, RISK 0.3 to 6.3 with a unit called in; 11.75 to 22.5) while it still read paused. A jump while paused is not the real-time agent effect.

*Reach:* 2 sessions · 2 personas · iPad/desktop · *evidence:* tester-only (State has no clock field. Known-artifacts item 2 says a jump while paused is still a bug claim. Repeat of r23 C45, now in two sessions. Possibly a ring drag or RADAR toggle resumes the clock.)

*Repro:* iPad seed 3003 hunt 1 scan: START CLOCK, PAUSE, then drag the RADAR ring.

*Findings:* F070, F225

### C17 · ROUTE bar fork choices change by themselves: a tap or drag near the bar clears C3, AHEAD ticks NORTH — major

On iPad, a map drag or tap that starts just above the ROUTE AT C3 bar cleared the C3 choice ('Route at C3 cleared. It will wait there.'), twice, and tapping AHEAD on C3 ticked NORTH. The transport then waits at the fork, which the player only notices later.

*Reach:* 1 session · 1 persona · iPad · *evidence:* tester-only (State holds no route data; the toast text the tool reported supports the clear.)

*Repro:* iPad seed 1001 escort hand 1: set C3 NORTH, then drag the map up from just above the ROUTE bar.

*Findings:* F125, F127, F136

### C20 · FIRE is live on a contact tagged 'SOUND · 1 fit' whose card says a SOUND fix is never enough to fire at — major

On desktop seed 303 the tag and card for U5 read SOUND with a ±5.0 fix and 'never enough to FIRE', yet FIRE showed 48% and fired. Either the tag/card is stale or FIRE ignores its own rule.

*Reach:* 1 session · 1 persona · desktop · *evidence:* oracle-disagrees (State shows U5 fix unc 0.3 at its true position, so the shot itself was fair; the tag and card were stale, not FIRE.)

*Repro:* Desktop seed 303 round 6: hold U5, select it, tap FIRE.

*Suggestion:* Refresh the contact tag and card when the fix tightens.

*Findings:* F044

### C32 · A tap that closes an explain card also presses the button under it (or is swallowed on the map) — minor

Closing a card on the move bar also switched NORMAL to SPRINT or CREEP. On the map the opposite happens: the first tap only closes the card, so the move target is not set and MOVE opens another card.

*Reach:* 2 sessions · 2 personas · desktop/iPhone · *evidence:* consistent (Tool reported the tap landed on SPRINT / CREEP and the move mode changed.)

*Repro:* Desktop seed 101: hold CREEP, then tap the card where SPRINT sits under it.

*Findings:* F094, F258, F248

### C43 · Enemy-shot feedback is stale: callout 'no damage' and HUD 'MISS' while the ExoS lost a hit — minor

After the enemy phase the HUD shows only the last shot line ('patrol -> C: MISS (56%)') while C went 8/8 to 7/8, and a map callout said 'PATROL scout no damage' while the HUD said it hit C's CORE.

*Reach:* 2 sessions · 2 personas · iPad · **only on iPad** · *evidence:* consistent (F300 state: C hits 7; F074 state: C hits 6 after the hit, so the damage is real and the lines are incomplete.)

*Repro:* iPad seed 3003 hand 2: END TURN with a patrol near C.

*Suggestion:* List every enemy shot of the phase, not only the last.

*Findings:* F074, F300

### C47 · DBG button and build tag visible on the hunt screen — minor

A small grey DBG button with 'r24-s3' sits under CARD/QUIT on the iPad hunt screen.

*Reach:* 1 session · 1 persona · iPad · *evidence:* consistent (Seen in two sessions; DEBUG REROLL is gone (fix list) but this debug control remains.)

*Repro:* iPad seed 1001 hunt.

*Findings:* F113, F135

### C48 · Two ExoS can stand on the same tile after a move — minor

After A moved east, A and B were drawn at one point with both labels stacked.

*Reach:* 1 session · 1 persona · iPhone · *evidence:* consistent (State: A and B both at (7.5, 19.5).)

*Repro:* iPhone seed 2002 hunt 1 turn 3.

*Findings:* F250

### C49 · HANGAR · TOOLS after the company folded still lets you edit and launch ExoS A, B, C — minor

On a folded company the loadout still lists three ExoS with launch ticked.

*Reach:* 1 session · 1 persona · iPad · *evidence:* consistent (State: folded 'every ExoS is destroyed...', ops 1, yet the loadout screen opened. Lowered from major: nothing can launch from it.)

*Repro:* iPad seed 3003 hand 2: CONTINUE a folded company, HANGAR · TOOLS.

*Findings:* F066

## Missing (6)

### C08 · FIRE gives no hit or miss message; the result is only in the expanded HUD or a red X — major

After FIRE the AP drops and the button reads FIRE USED or ID SEEN, but nothing on the main screen says hit, miss or kill. The line 'B → emplacement: HIT CORE (81%)' and KILLS 1/5 appear only when the one-line HUD is expanded, so players fire twice thinking the first tap did nothing and can't tell a kill from a lost contact.

*Reach:* 5 sessions · 4 personas · desktop/iPhone/iPad · *evidence:* consistent (F148: expanded HUD shows shots 2/2 and a HIT after two taps, so each tap fired; the result was just hidden by R24's one-line HUD.)

*Repro:* iPad seed 1001 escort: select the EMPLACEMENT relay, tap FIRE 81% once, look at the main screen, then expand the HUD.

*Suggestion:* Flash the shot result line on the map for a few seconds regardless of HUD state.

*Findings:* F015, F032, F128, F130, F147, F148, F151, F152, F270, F287, F131

### C11 · Hangar module slots (EM array, Mask) and paper-doll part slots have no names and no explain card — major

On the loadout screen the three part slots on the ExoS diagram expose no text and show selection only as a dashed outline, and holding a module slot (EM array, Mask) gives no card, while POWER, IR and HITS rows do. Players fit modules without knowing what they do.

*Reach:* 5 sessions · 4 personas · iPhone/desktop

*Repro:* Any hunt: TO THE HANGAR, hold the Mask slot and each slot on the diagram.

*Findings:* F024, F049, F256, F170, F181, F226

### C10 · Contacts drop from the list at end of turn or after a move, with no reason; LAST SEEN marks can't be targeted — major

Contact counts fall 8 to 2 or 6 to 0 after one move or END TURN, with only faded 'last seen R3' marks left (grey on grey, hard to read). Static turret fixes expire after a round, so the scan plan is lost and nothing says why or how to get the fix back.

*Reach:* 4 sessions · 3 personas · iPad/desktop/iPhone

*Repro:* iPad seed 2002 turret nest: scan, drop, move C one step, compare CONTACTS before and after.

*Findings:* F123, F217, F234, F290, F298, F263

### C15 · No enemy health readout; players can't tell if another shot will finish a heavy patrol — major

Hits on a heavy patrol show only the last hit line (HIT CORE, HIT ARMS); the contact card gives fix accuracy and FIRE rules but no parts or health, so players can't judge if they are winning.

*Reach:* 2 sessions · 2 personas · desktop/iPad

*Repro:* Desktop seed 2002 hunt 1: fire several times at the PATROL heavy and hold it.

*Findings:* F218, F229, F292

### C42 · Part loss (ARMS, LEG) shows only as a changed button label — minor

When B lost its ARMS the only sign was FIRE reading ARMS GONE; after leg damage the move bar silently forced CREEP with a greyed 'NORMAL LEG DAMAGED'. No line says when it happened.

*Reach:* 2 sessions · 2 personas · iPad/desktop

*Repro:* Desktop seed 2002 hand 2: take leg damage on Ruth.

*Findings:* F158, F230

### C60 · Company screen faction bars, map nodes and job button give no explain card — polish

Holding or right-clicking the standing bars, district nodes or the job button opens nothing; only the REFIT tab explains.

*Reach:* 2 sessions · 1 persona · desktop/iPhone

*Repro:* Desktop or iPhone company screen: hold a standing bar.

*Findings:* F167, F189

## Confusing (17)

### C04 · 'UNKNOWN · N fit' and '(old)' on contact tags are never defined; the long-press card explains the circle, not 'fit' — major

Every contact tag carries 'N fit' and often '(old)', and players can't tell whether '1 fit' is a good fix. The R24 explain card on a contact defines the fix circle (±) and FIRE's ±2 rule but not 'fit' or 'old', so a '1 fit (old)' contact that reads as sharp gets FIRE NO LOCK (too fuzzy).

*Reach:* 7 sessions · 4 personas · iPad/desktop/iPhone

*Repro:* Any hunt with a contact: hold its tag and read the card.

*Suggestion:* Add 'fit' and 'old' to the glossary, or say '1 type fits' on the tag.

*Findings:* F057, F076, F077, F095, F105, F144, F240, F253, F264, F289, F296

### C05 · Hunt HUD words (snd, EMIT, shots 1/2, 'base 75 · sig +2', '0 AP kept', NO LOCK, NO SIGHT, OUT OF RANGE) are not explained where they appear — major

The expanded HUD and move bar pack snd, EMIT, IR, shots n/2, ODDS 'base · sig', and 'MOVE STOPPED: CONTACT (0 AP kept)' into run-on lines. Some cards define a word with another undefined word (ECM card: 'hides your EMIT') or point to a control the hunt lacks (NO LOCK: 'use RADAR'). '0 AP kept' showed while the AP dots read 1.

*Reach:* 6 sessions · 4 personas · desktop/iPhone/iPad

*Repro:* Desktop seed 101 hunt 1: read the move bar 'snd 2', hold ECM, read the NO LOCK card.

*Findings:* F092, F103, F141, F143, F150, F216, F061, F071, F299, F241, F291

### C07 · Job card INTEL lines (ESM, EMIT, RADAR, IR, SOUND, EARS 1, SCAN WINDOW) are dense jargon with no explain card — major

The jobs screen still shows each job as a dense run-on paragraph ('Listens on: SOUND ... ESM: 4 hear your EMIT ... IR: 4') and the two cards differ only in buried details. Holding the terms or the SCAN WINDOW tag gives no card; only the DROPS buttons explain, and their card doesn't define EARS 1.

*Reach:* 5 sessions · 3 personas · desktop/iPad/iPhone

*Repro:* Any company start: open CONTRACTS, take a job, hold an INTEL line and a DROPS 'Fen EARS 1' button.

*Findings:* F005, F033, F110, F133, F168, F179, F190

### C14 · ExoS goes DOWN in one enemy phase; the carry-out rule is only in the expanded HUD and a faint red map line — major

ExoS go from 2/8 to DOWN in one enemy phase. The one-line HUD shows only a small '! C 2' chip; the rule 'end a lancemate's turn next to C to carry its operator out' is in the expanded HUD and a dark red map line nobody can read. The SUITS row says DOWN while the HUD says CRITICAL, so players don't know a rescue is possible, and operators are KIA after a WIN.

*Reach:* 3 sessions · 3 personas · desktop/iPad · *evidence:* consistent (F161 state: C hits 0 / dead true while the HUD offers a rescue. Two names: DOWN (SUITS row) and CRITICAL (HUD / map) for the same state.)

*Repro:* iPad seed 1001 escort hand 2, round 12-13: let C take fire, then read the SUITS row and expand the HUD.

*Suggestion:* Use one word, and show the carry-out line in the one-line HUD while any ExoS is down.

*Findings:* F043, F160, F161, F282, F159

### C16 · ID picker gives no hint which type fits, accepts a wrong guess silently, and later swaps the label with no message — major

ID UNKNOWN lists ten types as sound traits with no word on how '3 fit' maps to them or what a guess changes. A wrong guess ('gun') is accepted with no feedback and later becomes 'PATROL heavy' with no event line.

*Reach:* 3 sessions · 3 personas · iPad · **only on iPad** · *evidence:* tester-only (F083 state: U7 is a tight fix next to A; nothing in state records the ID.)

*Repro:* iPad seed 3003 hand 2: ID U7 as gun in round 1, read CONTACTS in round 4.

*Suggestion:* Print a line when a player ID is overturned.

*Findings:* F146, F293, F083

### C23 · Map marks (SOUND n tags, cyan sensor lines, orange ring, yellow 'Nt' edge arrows, transport diamond) have no key, and holding them explains the ground — minor

Grey 'A SOUND 2.8' tags, fans of cyan/teal lines from the ExoS, the orange ring round the transport, yellow or orange '34t' edge arrows and a green diamond beside the transport have no legend. Holding a tag explains the building or street under it instead, and right-click on the CONTACT banner cleared a planned move.

*Reach:* 5 sessions · 4 personas · iPhone/iPad/desktop

*Repro:* Any hunt: hold the 'A SOUND 2.8' tag and a cyan line.

*Findings:* F052, F115, F120, F126, F157, F207, F210, F138, F246, F257, F188

### C28 · Contract books after a lost or bailed hunt don't explain what was paid or charged — minor

After a FAIL, WHAT IT COST says only 'No hunt pay' and the balance doesn't move; repair/rebuild credits are listed but not deducted (475 cr = 300 + 175); the next screen jumps to HUNT 2/3 with no word on the lost hunt; the fold card says 'contract 2' while the record says 1 contract.

*Reach:* 4 sessions · 4 personas · iPad/desktop

*Repro:* iPad seed 202 escort: lose the transport, read WHAT IT COST, continue.

*Findings:* F276, F202, F283, F279, F067

### C29 · Scan screen RISK, STEP and 'apron' are not explained and give no explain card — minor

The scan text says 'Drop now: 25% of the field awake. Step 2 at 6: 50% chance...' and 'point RADAR at a dim ? apron' with no meaning for RISK, STEP or apron. Holding RISK/STEP, START CLOCK or ALT gives no card, while the CLOCK line does.

*Reach:* 3 sessions · 3 personas · iPad/desktop

*Repro:* Any hunt scan screen: hold the RISK bar.

*Findings:* F111, F169, F182, F204

### C31 · Escort: 'PAINTED · round N' and the red '! C 2' warning chip are not explained — minor

Red 'PAINTED · round 1' tags appear beside ExoS, and the new low-hits chip reads '! C 2'. Holding the chip explains the SOUND ring instead, so players can't tell why C is being shot or what the 2 counts.

*Reach:* 3 sessions · 2 personas · iPad/desktop/iPhone

*Repro:* Desktop seed 2002 hunt 1 round 1: read the tags by A and C; iPhone: hold '! C 2'.

*Findings:* F129, F212, F269

### C21 · CARGO / UPLINK distance goes up while walking toward it (it counts the walking route, unsaid) — major

The HUD CARGO distance rose 42t to 47t to 48t while the lance walked east, because it is the walking route, not a straight line, and nothing says so. Drag paths ended at walls and whole rounds were lost.

*Reach:* 1 session · 1 persona · iPhone

*Repro:* iPhone seed 3003 hand 2 RETRIEVE: walk east and read the CARGO line each round.

*Findings:* F195

### C37 · Route line and HUD don't reflect a set fork: line unchanged, 'heading for B3' after B3 is set, transport tag stuck at 23t — minor

Setting a fork changes only a toast: the green route line keeps bending the same way, the HUD still says 'heading for fork at B3' after B3 is set, the edge tag read 23t for four rounds while the HUD said 'heading east', and the NORTH/SOUTH circles on the map are a second control for the same fork with no label.

*Reach:* 2 sessions · 2 personas · iPad/desktop · *evidence:* tester-only (State holds no transport or route data. F162 may be a stuck transport, not a stale tag.)

*Repro:* Desktop seed 639772 escort: set both forks NORTH and watch the route line.

*Findings:* F140, F162, F186, F187, F154, F155

### C39 · Explain-card figures disagree with the HUD (two ± values, 'CORE hits left 3' vs hits 8/8) — minor

One contact card gives ±1.0 tiles at the top and ±2.5t in its glossary line. An ExoS card says 'CORE hits left 3' while the SUITS row says 8/8.

*Reach:* 2 sessions · 2 personas · desktop/iPhone

*Repro:* Desktop seed 303: hold U5; iPhone seed 3003: hold ExoS B.

*Findings:* F040, F193

### C44 · Enemy CARD has no key and only a bottom CLOSE — minor

CARD lists enemy types with cr amounts and 'core 1', 'firm lock' in small dim text with no heading or key, and its only CLOSE is at the bottom after scrolling.

*Reach:* 2 sessions · 1 persona · desktop/iPhone

*Repro:* Any scan screen: CARD.

*Findings:* F010, F023

### C46 · Bailing is shown as BAILED on the result and BAIL CONTRACT on the button, but logged as QUIT in THE BOOKS — minor

THE BOOKS reads 'Last contract (1, QUIT)' after a CONTRACT BAILED result.

*Reach:* 2 sessions · 2 personas · desktop · **only on desktop**

*Repro:* Desktop seed 303: QUIT, bail, read THE BOOKS.

*Findings:* F047, F101

### C51 · 'MISS (77%)' reads as a 77% miss chance — minor

The result line 'B → emplacement: MISS (77%)' shows the hit chance beside MISS.

*Reach:* 1 session · 1 persona · desktop

*Repro:* Desktop seed 1001 hand 2.

*Findings:* F020

### C53 · AP carries over between turns and piles up, unexplained — minor

B shows 7 AP and C 4 after using AP last round; '+4/turn' doesn't say AP carries.

*Reach:* 1 session · 1 persona · iPad

*Repro:* iPad seed 3003 hand 2.

*Findings:* F079

### C62 · Holding greyed ROSTER FULL explains the ROSTER tab, not the button — polish

The card describes the tab in general, not why recruiting is blocked.

*Reach:* 1 session · 1 persona · desktop

*Repro:* Desktop MARKET, hold ROSTER FULL.

*Findings:* F004

## UI / UX (13)

### C02 · Contacts and map tags sit under the side button columns and bottom bar, so taps hit ECM / GHOST / SPRINT instead — major

Contacts, UNKNOWN tags, route exit circles and the extract arrow drift under ECM / GHOST / FIRE / END TURN and the CREEP/NORMAL/SPRINT bar, or are cut off at the screen edge. A tap meant for a contact switches to SPRINT, toggles ECM (20 EN) or places a GHOST decoy (AP and 25 EN) with no confirm.

*Reach:* 8 sessions · 6 personas · iPhone/iPad/desktop

*Repro:* iPad seed 3003 hunt 1: tap the PATROL scout near the bottom edge; iPhone seed 1001: tap the map near the right button column.

*Findings:* F030, F075, F073, F185, F205, F208, F233, F261, F265, F297, F114, F097, F117, F252, F206, F031, F027

### C12 · Drags and taps on the map silently do nothing, then MOVE opens 'No move set yet' — major

Drags from (or just beside) the active ExoS and taps on open-looking ground sometimes set no path and show nothing; MOVE then opens the 'MOVE: TAP OR DRAW / No move set yet' card. Identical drags worked earlier. Testers needed the target fallback three times, and once the fallback 'done' still set no move. An earlier stray tap can silently become the target.

*Reach:* 5 sessions · 5 personas · iPad/iPhone/desktop · *evidence:* tester-only (State gives positions only; no path or target field. The three fallback entries (F087, F090, F214) are the input-friction records for this cluster.)

*Repro:* iPad seed 3003 hand 2 round 5: drag from suit C at 8 AP north.

*Suggestion:* Say why no path was set (wall, unreachable, drag did not start on the ExoS).

*Findings:* F035, F080, F086, F087, F089, F090, F106, F213, F214, F215, F235, F178

### C09 · ROUTE bar and bottom bars cover the transport, the fork and the contact shooting it — major

The new ESCORT ROUTE bar plus the move-mode and HOLD/HURRY bars take the bottom third to 40% of the map. The transport, the NEXT marker and the threat to it sit under them at the moment a fork must be chosen, the camera follows the active ExoS not the transport, and taps on the hidden contact hit route buttons.

*Reach:* 4 sessions · 3 personas · desktop/iPhone/iPad

*Repro:* iPhone seed 1001 escort, round 2-4: look for the transport and the ROUTE AT B3 fork.

*Suggestion:* Let the ROUTE bar collapse to one line, and keep the transport inside the clear area as B does for the active ExoS.

*Findings:* F009, F025, F026, F029, F119, F124, F156, F174

### C30 · Tap-near-contact selects it, and you can't pick which ExoS acts — minor

A tap near a contact selects it and drops the move target. The ORDER chips and ExoS markers look tappable but do nothing; only END TURN changes the active ExoS.

*Reach:* 3 sessions · 2 personas · iPhone/iPad/desktop

*Repro:* iPhone seed 2002 hunt 1: tap the ground beside an UNKNOWN ring; tap the B chip.

*Findings:* F254, F153, F220

### C33 · Scan exit button (TO THE HANGAR / DROP) changes name, looks disabled, hides while the clock runs, and skips the scan unwarned — minor

The bottom-right scan button reads TO THE HANGAR on hunt 1 and DROP on hunt 2, is grey like a disabled control, vanishes while the clock runs (only PAUSE shows), and when tapped first skips the whole scan with no warning ('Scan: 0 min').

*Reach:* 3 sessions · 3 personas · desktop/iPad

*Repro:* Desktop seed 1001: compare the scan screens of hunt 1 and hunt 2.

*Findings:* F013, F069, F271

### C35 · Map camera re-centres and rescales after each move — minor

After MOVE the camera jumps (about 90 px) or changes zoom so the moved ExoS sits at the same spot; the tiles the player aimed at shift and it's hard to see where the ExoS went.

*Reach:* 3 sessions · 2 personas · iPad/desktop/iPhone

*Repro:* iPhone seed 2002 hunt 1: MOVE twice and compare.

*Findings:* F137, F231, F259

### C36 · Result screen DETAILS and the after-action log are hard to read ('???' rows, own misses missing) — minor

DETAILS is one paragraph of abbreviations (ptl, LINK 24t, sprints 0 hurries 0), every log row starts with '???', and WHAT HAPPENED leaves out the player's own misses.

*Reach:* 3 sessions · 3 personas · iPhone/iPad

*Repro:* iPhone seed 303 escort: lose, read the result.

*Findings:* F053, F277, F288

### C41 · Scan clock runs in real time and drains while players read — minor

After START CLOCK the 8-minute window closes while testers read the panel (0 to 7.75 in a few seconds; 3 s wait cost 3 minutes of risk).

*Reach:* 2 sessions · 2 personas · desktop · **only on desktop**

*Repro:* Any scan: START CLOCK and read the panel.

*Findings:* F037, F224

### C52 · DROPS button cycles operators with no list and benches one silently — minor

A tap on a DROPS button swapped Nadia for reserve Corin with no list shown.

*Reach:* 1 session · 1 persona · iPad

*Repro:* iPad seed 3003 hand 2 jobs screen.

*Findings:* F068

### C55 · Uplink cost (2 AP, +25 EMIT) is unclear before committing — minor

UPLINK shows only numbers; the patrol came the next turn and shot Vel.

*Reach:* 1 session · 1 persona · iPad

*Repro:* iPad seed 3003 hunt 1.

*Findings:* F064

### C56 · Extraction zone is off screen with no arrow when the quota is met — minor

QUOTA MET says extract (right edge) but the strip is past the screen edge with no marker.

*Reach:* 1 session · 1 persona · desktop

*Repro:* Desktop seed 2002 hand 2.

*Findings:* F242

### C59 · Drop zone status updates only after a clock tick — minor

Clearing a drop zone with the RADAR ring while paused still read 'drops 1/3 clear'; it changed to 2/3 only after the clock ran 3 more minutes.

*Reach:* 1 session · 1 persona · desktop

*Repro:* Desktop seed 2002 hand 2 scan: pause, drag the ring onto an apron.

*Findings:* F223

### C63 · HUD collapses to one line on desktop mid-hunt — polish

On desktop the HUD switched to the one-line 'R4 · ExoS B · AP 7/8' form and the AP/EN/EMIT bars went away.

*Reach:* 1 session · 1 persona · desktop

*Repro:* Desktop seed 202 hunt 1 round 4.

*Findings:* F285

## Visual (8)

### C22 · Map labels (ExoS names, TRANSPORT, SOUND, contact tags, PAINTED, CRITICAL) still print on top of each other — minor

At the drop zone 'A Fen', 'B Vel', 'C Fen' and 'TRANSPORT 5/5' print into one clump; around patrols and the uplink EO/ESM/MZL/ACO tags, SOUND readouts, PAINTED, CRITICAL and NEXT MOVE stack into unreadable smears; result-screen map labels bleed behind the panels. R24's de-overlap did not cover the drop clump or tag stacks.

*Reach:* 14 sessions · 6 personas · desktop/iPhone/iPad

*Repro:* Any escort hunt: look at the drop zone at round 1.

*Findings:* F007, F014, F019, F042, F048, F051, F062, F072, F093, F104, F112, F134, F145, F149, F171, F175, F183, F192, F199, F227, F228, F238, F245, F266, F267, F273, F274, F284

### C25 · Hunt HUD line, order chips and top status line cover map labels and each other — minor

The top-left HUD text has no backing and sits over the left of the map; the top-right A/C/B order chips cover UPLINK and contact labels and cut the end of the ROUND line ('shots 0/2') and 'MOVE STOPPED: CONTACT (0 AP kep'.

*Reach:* 4 sessions · 2 personas · desktop/iPad/iPhone

*Repro:* Desktop seed 303 or iPad seed 3003 hunt 1 round 1: read the top lines.

*Findings:* F039, F055, F056, F060, F211, F247, F268

### C34 · Scan screen controls shift position when the clock or status text changes — minor

On desktop the RADAR, HIGH/MID/LOW, START CLOCK and PAUSE buttons move 15-127 px and the map rescales when the clock starts or the status line changes, so controls aren't where the last tap was.

*Reach:* 2 sessions · 2 personas · desktop · **only on desktop**

*Repro:* Desktop seed 303 scan: note the PAUSE x before and after START CLOCK.

*Findings:* F038, F203, F222

### C38 · Explain cards and the expanded HUD stay open, stack and cover controls — minor

The WAIT card stays open into the next turn, a HUD card and a building card stack and cover ECM/GHOST, the expanded hunt HUD stays on top of the CONTRACT BAILED screen, a card covers the DROPS row that was held, and a contact card runs to four paragraphs on a tablet.

*Reach:* 2 sessions · 2 personas · desktop/iPad · *evidence:* consistent (F046 state: mode result with the HUD overlay reported on screen.)

*Repro:* Desktop seed 303: hold WAIT, END TURN; expand the HUD, then QUIT and bail.

*Findings:* F041, F045, F046, F197, F200

### C45 · Small grey text and colour-only states are hard to read (rules boxes, ROSTER FULL, result tags, survey chips) — minor

Roster rules boxes are about 10px grey on dark, ROSTER FULL is dark grey on near-black, result-screen unknown lines differ only by italic orange, EMIT/IR bars use colour, and survey chips show no picked state.

*Reach:* 2 sessions · 2 personas · desktop/iPad

*Repro:* Desktop: open ROSTER and MARKET; result screen survey.

*Findings:* F001, F002, F012, F280, F006

### C54 · Bottom HANGAR / NEW COMPANY bar covers THE BOOKS on iPhone — minor

The fixed bottom bar takes about a quarter of the 343px height and covers the last lines of THE BOOKS.

*Reach:* 1 session · 1 persona · iPhone

*Repro:* iPhone company screen.

*Findings:* F022

### C57 · Ship upgrade text is cut off behind BUY — minor

Ship card text ends mid-sentence ('...is x0.6 as loud') under the BUY button.

*Reach:* 1 session · 1 persona · desktop

*Repro:* Desktop company SHIP tab.

*Findings:* F003

### C61 · District labels Canal Ward and Neon Mile overlap on the city map — polish

Two district names print over each other under node 1.

*Reach:* 1 session · 1 persona · desktop

*Repro:* Desktop seed 101 company screen.

*Findings:* F102

## How it felt (6)

### C03 · Hunts are long walks: 2-3 tiles per activation, rounds with no enemy in sight — major

ExoS cover 2-3 tiles per activation (CREEP about 1 per AP), uplinks and cargo sit 28-49 tiles away, and many rounds pass with no contact on the list. The transport crawls about one tile per round. Hunts still eat the whole session.

*Reach:* 9 sessions · 6 personas · iPad/desktop/iPhone

*Repro:* Any uplink or retrieve hunt: count rounds to the objective.

*Findings:* F036, F099, F165, F194, F219, F239, F243, F249, F251, F262, F275, F116, F091

### C13 · Transport is hit and lost with no visible shooter and little warning — major

In escort hunts the transport drops from 5/5 to 3/5 or to lost while no contact, shot line or last-seen mark shows near it, and the camera is on the active ExoS so the transport is off screen. Results then say 'FIELD LOST' and log '??? seen by something'. Players can't react or tell where to stand.

*Reach:* 5 sessions · 4 personas · desktop/iPad

*Repro:* iPad seed s967098 or desktop seed 639772 escort: pass turns and watch TRANSPORT n/5 in the HUD.

*Suggestion:* Put a bearing or a ? marker on the map for the shooter of each transport hit.

*Findings:* F011, F177, F201, F272, F278, F118

### C19 · Losing the lance folds the company, and nothing before launch warns of it — major

A tester lost all three ExoS in hunt 1 (uplink at 1/3) and the company folded: 6 parts against a rebuild of 8 each. The rebuild cost appears only on the loss screen, and no fallback point or low-hits warning came before each loss.

*Reach:* 1 session · 1 persona · iPad

*Repro:* iPad seed 3003 hunt 1 (UPLINK): lose the lance.

*Findings:* F063, F065

### C40 · Energy drains to 0 with no warning (SPRINT, ECM left on) — minor

ECM left on drained suit A from 100 to 2 EN and another to 0 over several rounds with only the number changing and no warning; players lose ECM and GHOST without noticing.

*Reach:* 2 sessions · 2 personas · iPad/iPhone

*Repro:* iPad seed 1001 escort: toggle ECM on and pass rounds.

*Findings:* F132, F196

### C50 · FIRE 77% missed four shots in a row — minor

Suit A missed four 77% shots at the same heavy patrol; 'base 75 · sig +2' did not explain it.

*Reach:* 1 session · 1 persona · iPad

*Repro:* iPad seed 3003 hand 2 rounds 4-5.

*Findings:* F085

### C58 · Turret nest uplink is trivial until the nest wakes — minor

Turrets didn't fire until C stood in the ring; the hunt was won in 4 turns and sprint noise cost nothing.

*Reach:* 1 session · 1 persona · desktop

*Repro:* Desktop seed 202 hunt 1.

*Findings:* F286

## Device-only issues

- **iPad:** ID picker gives no hint which type fits, accepts a wrong guess silently, and later swaps the label with no message (C16, 3 runs)
- **desktop:** Scan screen controls shift position when the clock or status text changes (C34, 2 runs)
- **desktop:** Scan clock runs in real time and drains while players read (C41, 2 runs)
- **iPad:** Enemy-shot feedback is stale: callout 'no damage' and HUD 'MISS' while the ExoS lost a hit (C43, 2 runs)
- **desktop:** Bailing is shown as BAILED on the result and BAIL CONTRACT on the button, but logged as QUIT in THE BOOKS (C46, 2 runs)

## Oracle-only bugs (no tester noticed)

None.

## Models

| Model | Sessions | Notes / session | Valid | Noise | Oracle disagrees | Clusters hit | Only this model (major+) | Avg actions | Avg images | Fallbacks | Screens / session | Hunts finished |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| sonnet | 15 | 6.3 | 94 | 1 | 0 | 39 | 9 (1) | 85 | 20 | 0 | 13.1 | 5 |
| haiku | 13 | 15.5 | 201 | 0 | 1 | 54 | 24 (4) | 105 | 33 | 3 | 13.5 | 2 |

## Noise / tool limits

- Noise / tool limits: 1 findings

## Sessions

| Session | Persona | Model | Device | Length | Seed | Actions | Notes | Screens | Summary |
|---|---|---|---|---|---|---|---|---|---|
| a-s-dt-l1001-h1 | accessibility | sonnet | desktop | long h1 | 1001 | 94 | 16 | 14 | Played company campaign hunt 1 (escort, FAILED: transport lost to unseen fire after I only passed turns) and part of hunt 2 (uplink, 3 suits near yard, shot one relay emplacement). Visited roster, refit, market, ship, co |
| a-s-dt-l1001-h2 | accessibility | sonnet | desktop | long h2 | 1001 | 101 | 5 | 11 | Hand 2 of company campaign: resumed contract 1, won hunt 2 (uplink, 3 kills) after a heavy patrol, emplacement and turret fight. Wins 1/3 with hunts 3 and 4 both needed. Top problems: resume dropped me at job pick with f |
| a-s-ip-l1001-h1 | accessibility | sonnet | iPhone | long h1 | 1001 | 98 | 7 | 13 | Played company hand 1: took Broker job vs Foundry (320cr, need 3 of 4 hunts), escort hunt 1 on iphone. Reached round 7, transport 3/5 hits, 5 sound-only contacts nearby, no kill yet. Top problems: (1) ROUTE panel and mov |
| a-s-ip-l1001-h2 | accessibility | sonnet | iPhone | long h2 | 1001 | 94 | 4 | 11 | Resumed campaign; hunt 1/4 (escort Job 2) had reset to round 1, so I replayed it to round 8. Funds 300cr, fuel 7/10. Never reached the market, map or a contract end. Top problems: route panel and right-edge buttons swall |
| a-s-pad-s101 | accessibility | sonnet | iPad | short | 101 | 44 | 4 | 15 | Played Uplink contract (Broker job), 3 rounds, bailed. Top problems: sprint drained EN to 0 and one move spent 4AP/44EN for 1 tile; drawn paths silently fail with no reason; job cards are dense jargon. Good: bail warning |
| b-h-dt-s303 | breaker | haiku | desktop | short | 303 | 110 | 11 | 13 | Played the Read-it-cold style first hunt (Retrieve, 4x4, high danger). Took job 1 from the company, scanned, dropped west edge, and played 10 rounds. Lost suits A and C to fire; bailed at round 10 with B at 2 core hits a |
| b-h-ip-s303 | breaker | haiku | iPhone | short | 303 | 88 | 6 | 14 | Played hunt 1 (ESCORT, MEDIUM contract from the company map, Ash Market) to a loss at T10: transport lost after patrol hits took it from 5 to 0. Read the company, job, scan, loadout and result screens. Top problems: (1)  |
| b-h-pad-l3003-h1 | breaker | haiku | iPad | long h1 | 3003 | 107 | 12 | 17 | Played the company campaign on iPad. Read basics, took Neon Mile faction job (3 hunts), picked the uplink hunt, drew paths with drag and MOVE, used hold/explain cards. Hunt 1 (uplink) was lost at turn 11: Yara, Vel and I |
| b-h-pad-l3003-h2 | breaker | haiku | iPad | long h2 | 3003 | 129 | 24 | 13 | Hand 2 of the campaign. Inherited contract 1 FAILED and the company FOLDED (210 cr). Rebuilt with NEW COMPANY (300 cr, fuel 8/10, parts 6/16, four operators). Took the BOUNTY job (hunt 1 of 3, quota 120). Killed a scout  |
| fr-h-dt-s101 | fresh-recruit | haiku | desktop | short | 101 | 43 | 11 | 15 | Fresh recruit (Sam). Read the start changelog, took the Neon Mile broker contract, picked UPLINK, scanned, launched with the Warden, and played 3 turns. No enemy was spotted; suits crawled into walls. Bailed hunt 1 (0 wi |
| fr-h-ip-s101 | fresh-recruit | haiku | iPhone | short | 101 | 69 | 7 | 15 | Played Sam, a fresh recruit. Got through the splash, took the UPLINK job for hunt 1 with three ExoS, and played five turns. The objective stayed 15-19 tiles out because suits drifted around walls, with no route preview.  |
| fr-h-pad-l1001-h1 | fresh-recruit | haiku | iPad | long h1 | 1001 | 130 | 23 | 13 | Played hunt 1 of the Spires contract (ESCORT, 4x4 district, turn 15, 130 of 140 actions). Took the job, scanned, launched, and escorted the transport east. The transport fell to 1 of 5 hits and is still alive; the contra |
| fr-h-pad-l1001-h2 | fresh-recruit | haiku | iPad | long h2 | 1001 | 120 | 31 | 14 | Resumed company hunt 1 of the Spires contract (ESCORT). The RESUME button restarted the hunt from a fresh scan instead of the 1/5 state the last tester left. Took the escort, pushed suits along the road and set routes. K |
| qm-s-pad-s101 | quartermaster | sonnet | iPad | short | 101 | 70 | 3 | 15 | Quartermaster iPad. Took Neon Mile broker contract, UPLINK hunt, launched all three ExoS, played 6 rounds, then bailed (uplink still ~15-20 tiles away). Bail screen and THE BOOKS added up (300-180=120 cr). Problems: 1) U |
| rd-s-dt-l639772-h1 | round-designer | sonnet | desktop | long h1 | 639772 | 99 | 12 | 13 | Round designer, hand 1. Took escort job on Neon Mile, ran 6 rounds; transport 2/5, hunt not finished. Long-press works on tabs, HUD stats, FIRE reasons, last-seen marks, EM LISTEN. Missing on job cards, faction bars, mod |
| rd-s-dt-l639772-h2 | round-designer | sonnet | desktop | long h2 | 639772 | 92 | 10 | 11 | Resumed campaign (landed at hunt 1/4 job pick, took ESCORT again), tested explain cards on job, scan, hangar and hunt screens, played 4 rounds of the escort; no contract end. Problems: (1) many terms do not explain on ri |
| rd-s-ip-l3003-h1 | round-designer | sonnet | iPhone | long h1 | 3003 | 96 | 6 | 11 | Hand 1: took a Foundry-vs-Syndicate faction job, scanned, launched hunt 1 (RETRIEVE) on iPhone. Long-press cards and greyed-button reasons (FIRE, ID, PICK UP, MOVE) read clearly; compact HUD works. Problems: part states, |
| rd-s-ip-l3003-h2 | round-designer | sonnet | iPhone | long h2 | 3003 | 110 | 2 | 10 | Hand 2, RETRIEVE hunt 1/3 (Syndicate vs Foundry), rounds 1-11. Resumed, took job 1, launched, walked three ExoS toward cargo; no enemy contact yet, cargo 23t away. Problems: (1) CARGO distance rises when route detours, n |
| rd-s-pad-s967098 | round-designer | sonnet | iPad | short | 967098 | 76 | 6 | 12 | Played ESCORT hunt 1 on iPad: took broker job, scan, hangar, launched, lost at T7 (transport lost, I mostly idled after the fork). Long-press cards and FIRE NO SIGHT reason worked and read well. Problems: (1) result 'FIE |
| totb-h-dt-l2002-h1 | thumb-on-the-bus | haiku | desktop | long h1 | 2002 | 129 | 17 | 11 | Played the company campaign to a checkpoint at 129 of 140 actions. Took the Glasshouse FACTION JOB (Foundry vs Corporate, HIGH danger, 384 cr fee) and launched Hunt 1 of 2 (BOUNTY, 4x3 district). Bounty is 105 of 120 cr, |
| totb-h-dt-l2002-h2 | thumb-on-the-bus | haiku | desktop | long h2 | 2002 | 129 | 23 | 11 | Hand 2 of the Glasshouse campaign. Resumed contract 1 (Glasshouse), hunt 1 of 2, from the company screen. The saved hunt was gone: the game restarted at hunt 1 with full suits and 0 wins. I scanned, dropped west edge, an |
| totb-h-ip-l2002-h1 | thumb-on-the-bus | haiku | iPhone | long h1 | 2002 | 130 | 11 | 15 | Played the company campaign from the start screen through contract 1 (Foundry vs Corporate faction job, 384 cr fee, HIGH danger) and into hunt 1 of 2 (BOUNTY, quota 120). Launched with three Warden ExoS. Stopped at the h |
| totb-h-ip-l2002-h2 | thumb-on-the-bus | haiku | iPhone | long h2 | 2002 | 130 | 16 | 12 | Picked up hunt 1 of 2 (BOUNTY, quota 120) at turn 13, bounty 50 of 120 after killing two PATROL scouts. Found the hunt slow: many rounds with no contact, FIRE often reads NO SIGHT behind walls, and one UNKNOWN contact ha |
| totb-h-pad-s202 | thumb-on-the-bus | haiku | iPad | short | 202 | 45 | 10 | 12 | Played one escort hunt (contract 1, Tallow End) as Alex, a thumb-first phone player. Got through the splash, company, job and loadout screens and launched. The transport was shot down on turn 2 by a turret and patrol I n |
| tv-s-dt-s202 | tactics-veteran | sonnet | desktop | short | 202 | 61 | 6 | 16 | Played contract 1 (Dockside broker job, medium) hunt 1 UPLINK vs turret nest after reading BASICS. Full-map radar, sprinted in, killed 2 of 4 contacts, uplinked on turn 4: WIN. Read result and details. Problems: (1) down |
| tv-s-ip-s202 | tactics-veteran | sonnet | iPhone | short | 202 | 63 | 2 | 16 | Read BASICS, took Dockside broker job, played hunt 1 UPLINK to a WIN in 3 turns (killed one turret, uplinked 3/3). Read result and DETAILS. Problems: (1) no hit/miss message after FIRE; (2) after-action log omits most of |
| tv-s-pad-l2002-h1 | tactics-veteran | sonnet | iPad | long h1 | 2002 | 97 | 5 | 15 | Played hunt 1/2 of Foundry-vs-Corporate bounty (turret nest, 4x3). Read BASICS, took contract 1, scanned, launched. Killed one heavy patrol (80/120 bounty); still fighting a second heavy and a scout; A lost arms/mast, C  |
| tv-s-pad-l2002-h2 | tactics-veteran | sonnet | iPad | long h2 | 2002 | 87 | 7 | 14 | Hand 2, hunt 1 of Foundry vs Corporate contract (BOUNTY, turret nest). RESUME CONTRACT restarted hunt 1 from the job picker with the hand-off damage gone (major). Rescanned, dropped, crept three suits east. Turret fixes  |

*Repro:* every finding stamps the session seed (the tool seeds the company and offers with it) and the hunt seed. Paste `seed N <MISSION>` into PLAY SEED to replay a hunt.
