# Signal Lance: Round 18 fix list

**Started:** 2026-10-06 at build `r18-s6`. Jamie: "in this round, keep a list of items i'll have you fix and then I'll test it all at once".
**How it works:** Jamie adds items while playing; nothing is built until he says to fix them; then all of them ship in one build and he tests them together.
**Logging:** Jamie sends a screenshot + one line ("this is the issue, add to list"). The agent crops the shot to the game window (the repo is public: never the chat or sidebar), saves it as `claude/fixlist/r18-NN-k.png`, adds the row with his words, commits and pushes.

## Fix list (Jamie)
| # | Item (Jamie's words) | Shots | Status |
|---|---|---|---|
| 1 | Hangar: "The highlighted body part isn't obvious enough, not terrible when looking at a big body part but not the mast, it needs to be more clear" | [1](fixlist/r18-01-1.png) | fixed r18-s7: outlined + named on the wireframe |
| 2 | iPad Pro 12.9 split screen (game in the bottom half, chat above): "id like to be able to split screen like this and have the game in correct aspect to play the game and chat to you easily, can you figure out for it to autoscale correctly". The game window there is very wide and short (~1000 × 370 CSS px): hangar, hunt HUD / buttons and the other panels must fit and stay readable, scaling with the window | [1](fixlist/r18-02-1.png) | fixed r18-s7: UI and map scale with the window, panels fit its height |
| 3 | "add a bit of a buffer from the top of the screen just for easy reading" (all screens; the iPad status bar also sat over the ExoS A / B buttons full screen) | [1](fixlist/r18-02-1.png) | fixed r18-s7: 14 px + safe area |
| 4 | "close button still not working" (iPad) | [1](fixlist/r18-04-1.png) [2](fixlist/r18-04-2.png) | fixed r18-s7: the sheet acts on the touch itself; NEW BUILD reload button for stale pages |
| 5 | Overlapping contact labels: two contacts close together (here a TURRET sentry and an unknown emplacement in the NOISE yard) print their labels and trait lines on top of each other, so neither reads. Jamie: "Yes add it"; again later (two contacts side by side at the yard's top edge): "id like the labels not to overlay" | [1](fixlist/r18-05-1.png) [2](fixlist/r18-05-2.png) | to fix |
| 6 | Show which sensor holds each track's current fix. Jamie: "we almost need graphic beside on the track saying what sensor are responsible for its current fix". Seen after a radar pulse through the container stack (walls) left the emplacement's circle big with nothing saying why (through-wall radar is fuzzy and only shrinks while tracked) | [1](fixlist/r18-06-1.png) | to fix |
| 7 | Shared-cover rule joins the wrong things. Jamie: "Cover needs tweaking with how it decide what cover is tied to what cover. In this the debris should count for cover, as the grey and brown parts of the terrain are not shared cover, and also, my position in the tile should preclude me from being next to it." Seen: A shooting the turret behind 2 debris tiles got "no cover" because the cover piece flood-filled from the debris into the building block (walls + clutter join as one piece, COVER_ITEM_RADIUS 3), and A stood next to that building. Fix: a piece = joined tiles of the same kind only (walls with walls, debris with debris), and "next to" measured from where the suit actually stands | [1](fixlist/r18-07-1.png) | to fix |
| 8 | Move interrupt fires on contacts you already have. Jamie: "i moved forward and i got a pause contact interruption, i already knew they were there, so the contact should not have triggered as they weren't a new contact". Cause: the R17 rule also stops a move when your eyes land on a known contact that wasn't in sight at the start of the move. Fix: stop only for a contact that wasn't on your picture when the move began (re-check the runner: the interrupt was worth ~9 points of wins in R17) | [1](fixlist/r18-08-1.png) | to fix |

## Agent notes (not on the fix list unless Jamie adds them)
### From Jamie's play
1. **Heavy load scenario isn't a telling test.** Being heard by the turret has no consequence before you're past the alley. Rework so weight costs something you see: e.g. a patrol in the alley that hunts what it hears, a longer stretch past the listener, or a route that needs a sprint. (Debrief 1; Jamie: "it'll need a game to show what that weight carries".)
2. **Rate the overload Energy change** (`OVERLOAD_EN_PER_TILE` 0.5, r18-s4) in contract play: helped / worse / couldn't tell. It hasn't been played yet.
3. (now fix list #3) **iPad: the status bar sits over the ExoS A / B buttons** when the page isn't inside the Claude viewer. The panels pad by `--top` only; add `env(safe-area-inset-top)`.
4. (part of fix list #2) **iPad: the hangar only uses the top third of the screen.** Scale the wireframe and readouts up on big screens (tablet layout).
5. (now fix list #1)
6. **Stale cached builds on iPad** (the screenshot showed `r18-s4` after s6 was live). Maybe a "new build: reload" note when the stamp is older than the published one.
7. **QUIT goes to the hangar.** Confirm that's the "start screen" Jamie meant (or the tester splash).

### From the runner (balance, for the debrief to decide)
8. **Hot core never costs wins.** It is found first on IR in ~5–7 of 60–120 hunts (12–16 tiles), but wins by reactor are equal (52% / 52%). Only static turrets read IR. Options: patrols (or one patrol variant) read IR; or a thermal contact alarms nearby units.
9. **Heavy kit dominates.** Bulwark templates 79%, Warden 37%, Wisp 22%. A Warden with the same plates + mortar wins ~81%: plates (weight only) and the mortar carry it. Item 2 is the first lever; plate weight or mortar access are others.
10. **Wisp is fragile:** CORE 1 hit (parts' minimum of 1 each eats its small pool). Base hits or a plate slot on the core.
11. **Sniper turret reads like the sentry by sound** (both "loud shot"). Give it its own shot band (e.g. "crack 16+") or another tell.
12. **Wins rose 52% → 58% when the sniper joined** (every turret slot now 1 in 4, fewer tough gun turrets). Check the field is still hard enough.
13. **Inherited flag:** sound is more than half of the field's first contacts (since R13).

### Parked design follow-ons (need the design lead / Jamie)
14. **Equipment balancing system** for all item stats (Jamie: "we will find a system to balance and tune all the stats of all equipment down the road"). Today the rows keep the hunt's old values where the toy disagreed (autocannon shot 12, not the toy's 6).
15. **LEGS hardpoints are empty** in the cheap set (no mobility modules yet); the sheet says so.
16. **One gun and one mortar per suit** (hangar rule) until several weapons + a weapon picker.
17. **Field fits:** the field keeps the R17 standing EM formula (plates add EM) and flat Energy regen; its fits get designed later (equipment plan C7).
18. **Skins, other frames, alloy / composite chassis** exist in the rows but are hidden from the in-game hangar (the toy shows them all).
19. **Frame size → move sound** isn't modelled (a Bulwark walks as quietly as a Wisp); the catalogue calls the Bulwark "loud on every channel".
20. Earlier parks still open (R17 report): look-menu polish, `FREE_TURNS` / `FACE_WAYPOINTS_MAX` cleanup, the scripted lance never draws paths.

### Still to do to close Round 18
- Play the three scenarios (Heavy load, Back door, Warm core) and ~10 contract hunts across all four job types, then the "does it read and connect?" tap answer.
- Write `claude/signal-lance-round18.md` (checkpoint reached: 3 of 3; parity numbers; sweep per frame and reactor; fits used; scenario answers; overload / IR values at the end).
