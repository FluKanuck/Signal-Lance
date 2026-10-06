# Signal Lance: Round 15 brief — "Pick your fights"

Read claude/code-agent-brief.md and claude/playtest-method.md, then follow this round brief.

**Context:** this is the first round of the **whole-loop slice** (see "The slice" in `claude/signal-lance-roadmap.md`). Gates 1 and 2 are merged. Each component is built thin, then checked with "does it read and connect?". **There is no fun test this round.** The fun test runs once, on the whole slice. This round builds component 2, **Missions**.

**Built in three steps.** Build Step 1, ship it, then Jamie plays it in the test bed and in contracts, debriefs and tunes. Only on Jamie's "next step" do you build Step 2, then Step 3 the same way. **Before each of Steps 2 and 3, open with a short check-in** (one or two questions) to see whether the last step changed the plan. At the Step 3 check-in, ask specifically: does the single fixed map make routes feel solved? If so, block maps may come forward. Specs for later steps can move, and Jamie has the final word. Use tune flags (`MISSION_TYPES`) so earlier types stay playable on their own.

## QUESTION
When the mission is more than "stand on the uplink", does reading the field change which fights you take, how you take them and when you leave?

## WHY
R14: the card and ID read cleanly but decided nothing. Jamie: "irregardless of the enemy type, if around an uplink, I'm going to have to fight it". The missing "and" turned out to be "so I can **pick my fights and choose how to fight it**". He also said: "it just being uplinks is boring right now… mission variety is key for games like this."

## CHANGE
Keep everything from Round 14 (variants, card, ID, `ID_SHOW_FITS`, test bed, Sound/Emissions, pack behind `PACK_ENABLED`, contracts) unless listed here. Rules go in `src/sim/` first, then the view.

### Shared (built with Step 1)
1. **Mission types.** Each briefed job in the job pick (`CONTRACT_HUNTS` 3, two jobs each) rolls a type, seeded, from `TUNE.MISSION_TYPES` (Step 1: `['UPLINK', 'BOUNTY']`; each step adds its type). The two jobs may differ. **The INTEL shows the type before the refit and loadout** (with a one-line goal), so you prep for it. Uplink stays as is.
2. **Mission state in `sim/`:** one `mission` object on the hunt (type, goal progress, result), so later types plug in without touching the uplink code paths. Win, fail and extract results feed the existing contract (`CONTRACT_WINS_NEEDED`, payout, carry-over).
3. **Map anchors are data:** uplink candidates, cargo tiles, escort waypoints and junctions live in one per-map anchors table, not hard-coded in mission logic, so block maps (parked #33) can supply them later without a rewrite. Today that's one entry, for `MAP_SRC`.
4. **Runner:** `--mission <TYPE>` forces a type, and the contract report splits by type (win rate, average pay, rounds).

### Step 1 — BOUNTY (build first)
5. **Bounties:** each of the 9 variants has a bounty in `TUNE.BOUNTY` (credits, commented). Dangerous variants pay more (e.g. a heavy patrol or a gun turret is worth far more than a scout). Set starting values from each variant's FIGHT line, roughly 20–90.
6. **A kill pays its true variant's bounty, however it died** (blind lob, gun or eyes on). An ID isn't needed to get paid. Reading tells you what's worth the risk.
7. **Quota, then push your luck:** `BOUNTY_QUOTA` (start ~150, so about 2–3 mid kills). Reaching it makes the hunt a **win**, and anything above it is kept as a bonus. You can extract (existing `EXTRACT_COLS`) at any time:
   - At or over quota: win; pay = bounties earned (replaces `PAY_WIN` + `PAY_KILL` for this hunt).
   - Under quota: not a win and not a loss (the contract goes on); you keep the bounties earned.
   - Lance destroyed: LOSS, as now.
8. **The field outnumbers the quota:** Bounty uses `BOUNTY_FIELD_EXTRA` (start +2 units, rolled from existing variants, placed `'anywhere'`), so you can't safely take everything and must choose.
9. **HUD:** a bounty counter (`earned / quota`). Each kill pops its bounty. The CARD shows each variant's bounty next to its name.
10. **Log:** `BOUNTY 180/150 · kills: heavy 80, scout 25, … · extracted round N`.
11. **Runner flags:** quota met in fewer than 20% or more than 90% of Bounty hunts; or one variant killed in more than 90% (or fewer than 5%) of the hunts it appears in (it's always or never worth it).
12. **Test bed scenarios:**
    - **"Price list":** a heavy patrol (high bounty) and two scouts (low) on opposite sides. Both routes reach the quota, but one is riskier. Question: "Did the bounty change who you went after?"
    - **"One more?":** the lance starts at quota, near extraction, with a high-bounty emplacement within reach. Question: "Extract or push? Did it feel like a real choice?"

### Step 2 — RETRIEVE (after Step 1 is tuned; check in first)
13. **The cargo** sits on a guarded tile (reuse `UPLINK_CANDIDATES` and `staticPlacement: 'uplink'` for the guards). A suit on its tile spends a **PICK UP** action (`RETRIEVE_PICKUP_AP`) to take it.
14. **The flip:** picking it up is loud (an alarm, using the R13 pack alarm), and the whole field switches from guarding to **hunting the carrier**. They converge and fire on it, using the pack converge logic, on for this type whatever `PACK_ENABLED` says.
15. **Carrying costs:** the carrier can't SPRINT (`RETRIEVE_NO_SPRINT` true). If the carrier is destroyed, the cargo is lost and the hunt fails (not a contract LOSS unless the lance is wiped). A **HAND OFF** to an adjacent suit costs `RETRIEVE_HANDOFF_AP`.
16. **Win:** the carrier reaches extraction. Pay `PAY_WIN` + kills, as uplink.
17. **Scenarios:** "Grab and go" (a light guard; the flip is the test) and "Hot potato" (heavy guards; the hand-off is the test). One tap question each.

### Step 3 — ESCORT (after Step 2 is tuned; check in first)
18. **The ally:** a faction transport suit (unarmed, `ESCORT_HITS`, its own Sound and EMIT like a patrol) starts at the left edge and must reach the right edge. The field can detect and fire on it like any lance unit. Its death fails the hunt.
19. **The route is legs:** a small graph of waypoints across the map (`ESCORT_WAYPOINTS`, hand-picked open tiles), with 2 onward legs at each junction. At a junction the ally **holds** until you tap a leg (a big route button per leg, shown on the map). It then moves `ESCORT_MOVE` tiles per round along that leg.
20. **The lance scouts ahead.** Ambushes are field units placed `'anywhere'` near legs, so reading the field before you choose a leg is the skill.
21. **Win:** the ally reaches extraction. Pay `PAY_WIN` + `ESCORT_BONUS` scaled by the ally's remaining hits, + kills.
22. **Scenarios:** "Fork" (one leg clean, one with a hidden turret whose tell can be heard from the junction) and "Shadow" (a patrol drifting between two legs; time your choice). One tap question each.

### Every step
23. All new values go in `src/tune.ts`, commented. Log rows in `NOTES.md`, and add each step's rules to ASSUMPTIONS.
24. **Tester splash** (`src/view/brief.ts`) per step: what's new in plain words, plus 2–3 tap questions from the debrief focus. Bump `BUILD` (`r15-s1`, `r15-s2`, `r15-s3`).
25. A Vitest test per scenario and per new rule. `npm run sim -- --contracts 20 --check` passes at every step.

## NOT IN THIS ROUND
- Recon, find-the-one, cross-and-extract, hold-the-uplink reworks, or any type beyond these three
- New enemy types or behaviours, other than the Retrieve flip (which reuses the pack logic)
- Variant-specific counterplay (new weaknesses or new behaviours per variant). Watch whether "how to fight it" arrives anyway from bounties and routes
- Faction vs broker jobs, faction standing, the city map, the ship, pre-drop scans, operators, suit building
- An ally you control directly, escort AI beyond following the chosen leg, or a free-drawn route
- Changing the to-hit, ID bonus, pack or sound values (changes go through the debrief)

## DEBRIEF FOCUS
1. **Did the read change the plan?** Per type: in Bounty, did you skip or choose a fight because of the variant? In Retrieve, did you scout the guards before grabbing? In Escort, did what you heard decide the leg? Note anything Jamie points at for "how I fought it".
2. **Does each type have its own tension?** Bounty: the greed choice at quota. Retrieve: the flip. Escort: the junction call. If one feels like "uplink with extra steps", say which and why.

Also ask once, after Step 1: **was the test bed useful** this time? (Still open since R14.)

## DONE
- Each step: its scenarios played, ~2 contracts with that type in the mix, debrief and tune. Then Jamie says "next step".
- After Step 3: ~10 hunts with all four types rolling, then the "does it read and connect?" check (one tap answer per type: *the read changed my plan / it didn't / not sure*). **No fun test this round.**
- Save the status report as claude/signal-lance-round15.md. Include the runner split by type, the scenario tap answers, a test-bed verdict, and a per-type "read and connect" result.
