# Signal Lance: Round 19 brief — "Listen before you land"

Read claude/code-agent-brief.md and claude/playtest-method.md, then follow this round brief.

**Context:** slice row 4, **Pre-drop intel (ship)**, agreed in the R19 design lead chat (2026-10-07). Jamie kept the build order (the company layer, his "sense of ownership and progression", comes straight after). Like R18, it's built in **three checkpoints, each playable and shippable on its own**; if the round stalls, stop at the last one that works. **No fun test** (it runs once on the whole slice). The check is "does it read and connect?".

## QUESTION
Does choosing how long the ship listens (more intel vs a more awake, better-reinforced field) change your plan before turn 1, and does that plan hold up in the hunt?

## WHY
R18 "best one yet": builds show up in the hunt. The pillar's "prepare in depth" beat still starts at turn 1; the ship's SIGINT scan (game shape: "a longer listen gives a cleaner match, but the ship emits for longer") moves it before the drop. Jamie also asked to roll in the RWR (#74) and specced its display in this chat.

## CHANGE
Keep everything from R18 (hangar, power, weight, BACK, THERMAL, sense tags, PLAY SEED, drawn routes, packed districts, the four missions, test bed) unless it's listed here. Rules in `src/sim/` first, then the view.

### Checkpoint 1: the reveal ladder (Jamie plays)
1. **A pre-drop scan screen** between the job pick and the hangar, with one **listen dial**: 0 (skip) / SHORT / MEDIUM / LONG. Each step up reveals everything below it plus:
   - **SHORT:** the field roster (which types, which variants, how many) and **zone extents** (outlines, type unknown).
   - **MEDIUM:** **zone types** (QUIET / NOISE etc.) and **2–3 drop zones** to choose from (see 2).
   - **LONG:** **contact blips**: each field unit as a fuzzy circle with a signature read (best-guess type/variant, with confidence), using the same CARD language as the hunt. Mobile units' blips are where they were at the scan (they will have moved).
   - Matches can be wrong; reuse the in-hunt confidence rules where they exist, simplest option otherwise (note it in ASSUMPTIONS).
2. **Drop zones:** today there's one spawn (`SPAWN_APRON`, `SPAWN_LOOK`). Add candidate spawn aprons on other edges of the packed district (same clearing rule). Below MEDIUM you get today's default spawn; at MEDIUM+ you pick one. The scan's revealed info carries into the hunt as starting tracks/notes (blips become stale contacts; zones drawn).
3. **INTEL and the hangar come after the scan**, so the build can answer what you heard.
4. New TUNE: `SCAN_ENABLED` (true; off = R18 flow), `SCAN_BLIP_UNC` (tiles of blip fuzz at LONG), `DROP_ZONES` (count offered), each commented. Ship as `r19-s1`.

### Checkpoint 2: the cost ladder (Jamie plays)
5. **The longer the listen, the more the ship emits.** Costs stack by step (values in TUNE, starting guesses, tuned in the debrief):
   - **Field wakes:** from MEDIUM, a share of the field starts **alert** (reuse R13 pack alarm / converge logic, on for this hunt whatever `PACK_ENABLED` says, like Retrieve does), statics start dug in.
   - **More enemies:** each step adds a chance of **extra starting units** (on top of `FIELD_SCALE_BY_AREA`).
   - **Ship painted:** at LONG, a chance the field reads where you'll land: an **ambush group** placed toward the chosen drop zone (outside the apron, not on it).
6. New TUNE: `SCAN_ALERT_SHARE` per step, `SCAN_EXTRA_CHANCE` per step, `SCAN_PAINT_CHANCE`, `SCAN_AMBUSH` (size), each commented. INTEL/the scan screen says plainly what each step risks (the player chooses with the costs visible; the outcome is rolled).
7. Runner: `--listen <0|1|2|3>` and a sweep across the four; report win rate per listen level. Ship as `r19-s2`.

### Checkpoint 3: the RWR (Jamie plays)
8. **Item:** catalogue row `rwr` (S hardpoint, wt 1, draw 0) becomes fittable in the hangar (add it to the cheap set). It warns when an **enemy radar paints the suit** (radar pulse/sweep or a lock that covers it). Field units with radar: today's radar carriers (emplacement etc.).
9. **The scope:** a ring around the selected ExoS with three **range rings: close / medium / far**. The band is a **guess from signal strength** (a loud radar can read closer than it is). Bands as tile spans in TUNE (starting guesses: close 3–6, medium 9–15, far 15–25).
10. **A warning = a spoke** from the centre out to its band ring, bearing error ±`RWR_BEARING_ERR` (start 10°; ESM is 3°). At the tip: an **icon for the warning type** (search sweep vs lock/track) and the **best-guess ID** from the CARD, "?" when unsure. Warnings fade over `RWR_LIFE` turns and refresh if painted again.
11. **Heard standing vs heard moving** (the core of Jamie's spec):
    - **Standing:** a solid, sharp spoke.
    - **Moving:** the sim checks every step of a drawn route, so record the exact tile (P0), bearing (θ) and band. Then:
      - a small **"heard here" tick** on your path with a short **world-fixed bearing line** from it (like an ESM line);
      - on the scope, **both**: a faint **frozen spoke** at θ as received, and a dashed **re-aimed wedge** from where you are now (P1) covering the **guessed emitter strip** (the stretch of the bearing line from the band's near edge to its far edge, from P0), widened by the bearing error; an **arc** joins the frozen spoke to the wedge centre.
      - This is plain geometry (parallax): close-band warnings swing and widen fast, far ones barely move; walking along the line keeps it tight, walking across it fans it out. **No per-tile rotation knob.**
      - **Stale cap:** once P1 is inside the strip's near edge (you've walked past the guess), drop the wedge and keep only the frozen spoke, marked stale.
12. Tap a spoke/wedge to highlight its "heard here" tick and show the ID line. `RWR_ENABLED` (true) turns it off. Ship as `r19-s3`.

### Every step
13. New values in `src/tune.ts`, commented; TWEAK LOG and ASSUMPTIONS in `NOTES.md`.
14. Test bed scenarios (packed layout, fixed seeds):
    - **"Long listen"** (cp 1–2): LONG scan forced, painted ship, ambush toward the drop. Question: "Did what you heard change where you landed?"
    - **"Quiet drop"** (cp 1–2): skip the scan on the same seed. Question: "Did you miss the intel?"
    - **"Painted on the move"** (cp 3): walk a drawn route past a radar emplacement's sweep. Question: "Could you tell where it was from?"
15. Vitest per new rule: each listen step reveals its layer and no more; drop zone choice moves the spawn; alert share / extra units / ambush follow the TUNE values; RWR fires only when painted; band from strength; re-aimed wedge geometry (worked case: heard due north, walk 4 tiles east, medium 9–15 → centre ≈ −18°, wedge ≈ −34° … −5° with ±10°); stale cap.
16. **Tester splash** (`src/view/brief.ts`): what's new per checkpoint in plain words, 2–3 tap questions from the debrief focus. **Update GAMEPLAY BASICS every build** (scan dial, drop zones, RWR scope: solid = heard standing, faint + wedge = heard moving). Bump `BUILD`.

## NOT IN THIS ROUND
- Extra objectives / opportunities found by the scan (parked #84)
- The mission clock (no mission has a time limit yet; parked #85)
- Notoriety / heat in the area, threats aimed at the ship itself (parked #86, campaign)
- Escort pre-moving during the listen (Jamie: no)
- Ship slots / ship outfitting, fuel cost of a listen, the company layer (next component)
- Mid-hunt reinforcements arriving (extra units start on the map only)
- Enemy RWR, enemy reacting to being painted; aimed radar pulse (#13); the trigram (#73)
- Changing to-hit, map, mission or item balance values (changes go through the debrief)

## DEBRIEF FOCUS
1. **The choice:** did you pick a listen level for a reason, and did its cost show up when you landed (awake field, extra units, ambush)?
2. **Dominance:** does one setting always win (always LONG, always skip)? Cross-check with the runner sweep.

At checkpoint 3, also ask once: "Heard while moving: could you read where the radar was?"

## DONE
- Checkpoints 1–3 shipped and scenarios played, then ~10 hunts across all four mission types, then the "does it read and connect?" check (one tap answer: *the scan changed my plan / it didn't / not sure*). **No fun test this round.**
- Save the status report as claude/signal-lance-round19.md. Include: which checkpoint was reached, the runner sweep per listen level, which levels Jamie picked and why, scenario tap answers, and the scan cost / RWR values at the end.
