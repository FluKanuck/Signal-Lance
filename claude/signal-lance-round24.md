# Signal Lance: Round 24 status report — "Say what it means"

**Date:** 2026-10-08
**Build:** `signal-lance/` TS project (~10,900 lines of src), `dist/signal-lance.html`, BUILD `r24-s4`
**Branch:** `claude/charming-franklin-tmygre` (repo `FluKanuck/Signal-Lance`), commits d0d9ed3 (s1), ffa2b20 (s2), 4b3e6b9 (s3), 323ca21 + this report (s4)
**Live artifact:** https://claude.ai/artifact/NRNixsKxVrcMGNeYp6bB2o · **QA page:** https://claude.ai/artifact/Wma3pSVagK986FfBHrV9NX

## Purpose
Can a player read the hunt cold, with no one to ask? R24 changed words, layout and feedback only, with no rule changes: one glossary, long-press on anything, greyed buttons that say why, a phone HUD, and the house writing standard on every screen.

## Current status
- **Jamie's check: yes.** Jamie played 2 hunts on his phone. The hunts were understandable (tap question "Did you understand the hunt without needing to ask anyone?": **Yes**).
- **The QA re-check agrees, with a list of gaps.** The panel ran the r23 grid again on the same seeds (28 sessions):
  - 24 of r23's 67 clusters are gone, and 19 shrank.
  - 23 of 28 testers named the explain cards or the greyed-button reasons under "what worked".
  - Jargon is still the top confusion, but the complaint changed. It used to be "nothing is explained". Now it is "this term has no card": "N fit", "(old)", "snd", the FIRE odds parts and the job-card INTEL lines.
- **Still open:**
  - Map clutter got worse (14 → 19 sessions). The new ROUTE bar is one more overlay.
  - Contacts sit under the button columns (8 → 11 sessions).
  - FIRE gives no hit or miss message.
  - Hunts are long walks. That is a pacing problem, which R24 did not touch.
- **Test bed:** no QA tester opened it. "Read it cold" and "Crowded phone" have Jamie's play only.
- **Rules:** no rule changed. The runner check is OK at every step.

## What was built
1. **Checkpoint A (r24-s1): say what it means.**
   - One glossary (`src/view/glossary.ts`): one name per thing, and one plain line for each term.
   - Long-press anything for its explain card. On a computer, right-click it.
   - A tap on a greyed button says what blocks it and what would unblock it. The reason codes come from `sim/reasons.ts`.
   - GAMEPLAY BASICS reads from the glossary.
   - Two new warnings: low hits and LAST SEEN marks.
   - Fix list 1, 2, 3, 6, 10 and 11.
2. **Checkpoint B (r24-s2): the phone HUD.**
   - On short screens, the HUD is one line. Tap it to open the full block.
   - The camera keeps the active ExoS, the selected contact and the objective out from under the buttons.
   - Map labels move apart.
3. **Checkpoint C (r24-s3): the writing pass and the rest of the fix list.**
   - Every screen follows the house standard. The SUITS tab is now REFIT, SUIT BAY is EXOS BAY, and ExoS replaces suit and mech everywhere.
   - The ESCORT ROUTE bar, and warnings when the transport takes a hit.
   - The DROP ZONE line on the scan.
   - Contract books that add up, every fold rule listed, and the completion bonus on job cards.
   - DEBUG REROLL only appears with `?dev` in the URL.
   - Fix list 4, 5, 7, 8, 9, 12 and 13.
4. **QA fixes (r24-s4).**
   - A long-press or a right-click never fires a control.
   - ROUTE bar buttons read the ROUTE entry.
   - Operator first names are unique on a roster.
5. **QA tool:** a `hold` command, explain-card reporting, and ring drags on touch devices. The first wave ran without these and was run again.

## QA (r24-core-1008 vs r23-core-1008)
The full report is `claude/signal-lance-qa-r24-core-1008.md`. The judge's top open clusters:

| # | Cluster | Sessions |
|---|---|---|
| 1 | Hunts are long walks (2–3 tiles an activation, rounds with no enemy) | 11 |
| 2 | Contacts and map tags sit under the side buttons and bottom bar | 11 |
| 3 | Contact tags "N fit" and "(old)" have no card | 10 |
| 4 | HUD words with no card where they appear (snd, the odds parts, "0 AP kept") | 9 |
| 5 | Map labels still overprint (ExoS names, TRANSPORT, tags) | 19 |
| 6 | MOVE spends AP but the ExoS ends short of the path, with no message | 8 |
| 7 | FIRE gives no hit or miss message | 6 |

The top bug, "a long-press or right-click also acts" (8 sessions), is fixed in r24-s4. Still open from that cluster: a hold on the map or on your own ExoS arms a move, and a hold on the scan map moves the ring.

## Runner numbers
No rule changed. `npm run sim -- --contracts 20 --check` is OK at r24-s1, s2, s3 and s4. The unique-names change rolls names more often, so the company RNG stream moves and some seeds play different companies. The checked aggregates still pass.

## Changes (from the TWEAK LOG)
- NEW `LONGPRESS_MS` 450, `WARN_HITS_LEFT` 2, `LASTKNOWN_ROUNDS` 3 (r24-s1). `HUD_COMPACT_H` 430 and `CAM_SAFE_PAD` 10 (r24-s2). All are display only.
- The contract ledger gains start / earned / spent / ops / offered / news. These fields feed the books only.

## Parked (not built)
- REFIT shows a fresh Warden as 6/6 hits, but the hunt counts 8. This needs a rules check, and is queued as its own task.
- A hold on the map arms a move. A hold on the scan map moves the ring.
- The tap that closes an explain card also presses the control under it. This is the design, but testers fall for it. A design call.
- The scan clock may move while paused (2 sessions, not confirmed in state).

## Suggested next step
Round 24 met its question: Jamie reads the hunt cold, and the QA panel's "nothing is explained" complaint became a short list of terms with no card. The next limit is the screen itself. The map has too much on it, contacts hide under the buttons, and FIRE never says what happened. A round on "what just happened" (hit / miss feedback, a clear map, cards for the remaining terms) would close the top QA clusters. Pacing (long walks) is the larger question for the design lead.
