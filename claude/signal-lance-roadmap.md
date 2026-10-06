# Signal Lance Roadmap

**Updated:** 2026-10-06 after Round 17 (Eyes on the street: drawn routes, look markers, interrupt; "moving became part of the hunt"; no fun test, by slice design). The full map of the game lives in `claude/signal-lance-game-shape.md`.

## North star
Prepare in depth, deploy under pressure, watch your plan succeed or fall apart, then learn why.

**Shape (Jamie, game shape sessions):** an ex-military company of **exosuit** operators (not mechs) aboard a flying ship over a planet-spanning city of faction-held districts. The ship works before the drop (SIGINT), after it (repair, medbay, salvage hold) and between missions (fuel, range), but never on the board. Most enemies are weaker units (turrets, infantry, light-to-heavy vehicles) that are static, roaming or hidden. Enemy suits are the rare elite.

## Strands
| Strand | Question | Status | Rounds used |
|---|---|---|---|
| Hunt | Is finding and fighting with sensors fun? | Passed. R9 mortar, R10 terrain deepened it. R12: to-hit + parts made fights "richer" and different 3/3; % now "makes sense" (R13, 2/2 answers). Step 2 (aimed shots) parked | 1 (+R8–R10, R12) |
| Enemy behaviour | Does an enemy that hunts you and presses an advantage make fights feel alive? | R13 built (pack behind a toggle). One pack-on contract: "came for me, fair", 8 alarms, no loss. **Still unproven by play: did being loud cost anything?** "Earshot" not played in R14. Runner says yes (creep found round 2.1 by eyes; sprint round 1.0 by sound). R15 Retrieve flip reuses it: "enemy aimed for the mech with the cargo", felt good | 1 (R13, partial; R15 reuse) |
| Resource pools | Do separate pools (AP, Energy, Signal, Heat) create real trade-offs? | AP + Energy banked on purpose. Jamie R12: "no risk in having high signal"; sprint noise wrongly stacks. R13 split Signal into EMIT + SOUND: read **"at a glance"**; a SOUND contact helped find something; crept instead of sprinting once. Heat untested | 2 (R4, R13) |
| SIGINT: signature matching | Does reading a signature and matching it against a reference manual (Cold Waters style) make identifying contacts a skill? | **R14: legible, but decides nothing.** 9 variants, card, ID; runner 27% ID'd before eyes, no flags. Jamie: "irregardless of the enemy type, if around an uplink, I'm going to have to fight it"; eyes win the race; `ID_SHOW_FITS` helped partly. **R15: the missions gave it the "and".** Bounty, Retrieve, Escort all "the read changed my plan"; Escort fork called from "a mix of all scan results… gut feeling". Later also pre-drop from the ship, plus faction intel | 2 (R14 flat, R15 yes) |
| Suit building | Do frame (weight), reactor (power) and signature budgets force a real sacrifice, shaped by the INTEL? | Mapped. Cheap test: 3 frames, 2 reactors, ~6 modules | 0 |
| Combat controls | Can you fire and manoeuvre as a tactical choice? | Passed (R4). R10 noise ended "stand off and pummel". **R17: drawn routes + look markers (Door Kickers style), interrupt "saved me", facing free (man-sized units)** | 4 |
| Replay pull | Does the next run ask a new question? | Reframed into Company after R10 | 5 (reframed) |
| Scale | Does a lance hunting a mixed field turn a duel into a plan? | Yes (R7). Split moved with mortar (R9), steady since | 3 |
| Company / persistence | Does something carried between runs make you care? | Partly (R11): stakes land late (H1 flat, H3 tense). R12: part damage carried | 2 |
| Operators | Do operators with a skill who can be hurt make losses hurt? | Mapped: skills + fragility. Death is a difficulty setting (Ironman / **Standard: critical + extract** / Story); tune around Standard. Recruits: hire in districts, rescue, train crew. Gate 2 opener | 0 |
| Ship | Does outfitting the ship (3–4 slots across before / after / between) make the campaign a plan? | Mapped. Salvage hold caps loot. Gate 2 | 0 |
| City and factions | Does choosing the next contract feel like weighing pay against who you'll anger? | Mapped: flat node map of faction districts; per-faction standing (hated → alert fields, hunters, closed airspace, pricey fuel; liked → intel on their enemies); faction jobs vs deniable broker jobs. Pushed by upkeep + notoriety. Gate 2 | 0 |
| Logistics / economy | Does keeping the company supplied create good decisions? | Payout + refit "helped" H1; R12 C2 earned 380, spent 240. **Now two currencies: credits + fuel** (fuel priced by faction). Parts are items, bought or looted; salvage automatic, capped by the hold | 1 |

**Watch:** the fun test has been 0–2/5 for seven rounds (R6 0, R7 1, R8 0, R9 0, R10 2, R11 1, R12 1), almost all over 1–3 contracts or runs. **R13 (partial, 3 contracts): 2/5** (unplanned approach, "that's how it works"). **R14 (~2 contracts): 2/5** ("one more go", "that's how it works"), the first "one more go" since R4. Two 2/5s in a row: trending up, but the pull is still short-lived. Each round's new thing gets a positive read, then the pull fades. R13 targets the pillar directly (Signal as risk). If it lands flat over a full ~4–5 contracts, that's a strong signal to rethink what the core loop is asking. The campaign layer is now well mapped; **don't build it until Gate 1 passes.**

## Gates
1+2. **Whole-loop slice (Gates 1 and 2 merged, 2026-10-05):** the fun is in the pieces feeding each other, so a single-strand fun test reads 2/5 forever. Build a thin version of every component, connect them, then run the fun test **once on the whole slice** (~10 hunts / 4–5 contracts, 3/5, with testers). Per component, the check is "does it read and connect?" in the test bed, not the fun test. Time box ~8–10 rounds; if the slice doesn't pass, look hard at the core
3. Content scaling ("expand outward"): on hold until the slice passes. First wave: item condition, hunter teams, closed airspace, more factions, channels beyond THERMAL, Ironman/Story. Then the full catalogue, interiors/verticality, block maps, infantry and vehicles
4. Production: narrowly open (TS + Vite, `sim/`/`view/`, runner, Pages, tester splash). Godot, the presentation pass, art and saves stay locked

## The slice
**Process (Jamie):** each component starts with its **own scoping chat** to decide what goes in, pulling in parked items and whatever earlier components taught us. The thin slices below are starting points, not specs. Then build, test and tune the component (one or two rounds) before moving on.

| # | Component | Starting thin slice | Status |
|---|---|---|---|
| 1 | Hunt | Sensors, EMIT/SOUND, pack, to-hit + parts, mortar, zones, card + ID | Built (R1–R14) |
| 2 | Missions | Uplink + Bounty + Retrieve + Escort, rolled per job | **Built (R15).** 3/3 new types "read changed my plan"; Uplink "not sure" (now the plain baseline). Bounty greed at quota not biting yet |
| 3 | Suit building | Sharpened test in `signal-lance-construction.md` (3 frames, 2 reactors, ~7 modules, 1 mod, + THERMAL) | Mapped |
| 4 | Pre-drop intel (ship) | Ship SIGINT scan with a risk dial; 3 ship slots, fit 2 | Mapped |
| 5 | Operators | One per suit, one skill, Standard (critical + extract), injuries bench, 2 recruits | Mapped |
| 2c | Draw your route | Door Kickers–style drawn path (tap-to-move kept), facing waypoints to look down alleys, movement interrupt (parked #10). Builds on `FREE_TURNS` / `AP_TURN` | **Built (R17).** "Moving became part of the hunt". Controls reworked 3× in-round to Door Kickers style (freehand line, end handle, tap line → tap where to look, draggable eye). Interrupt "saved me" (runner: +9 pts win). `AP_TURN` 1→0. Big districts "about right" |
| 6 | After the drop | Payout, salvage capped by the hold, repair with parts, medbay time | Partly (R11–R12) |
| 7 | Learn why | After-action timeline: who heard whom, wrong calls, where the plan broke (the pillar's last beat) | Not mapped |
| 2b | Block maps | ~6 interlocking 10×10 blocks, 3×3 grid rolled per hunt (parked #33), each block carrying its mission anchors. Timing set by Escort: pull forward if routes feel solved on one map | **Built (R16).** "The map changed my plan". Grid of blocks read "too much like a grid"; became **packed irregular districts** cropped at the edge (`MAP_LAYOUT` packed). Clutter a real choice ("went round it"). Escort got HOLD / HURRY / fork levers; per-mech EXTRACT. Big grids brutal in runner (4×4 17%, 5×3 0%) |
| 8 | Campaign map | 5–6 districts, 2 factions, fuel per jump, upkeep, standing, 3 contracts on offer, faction intel | Mapped |

Build order (lean, revisable at each scoping chat): Missions (R15) → Block maps (R16) → Draw your route (R17) → **Suit building (next: scoping chat)** → Pre-drop intel → Operators + After → Learn why → Campaign map → slice fun test.

## Decisions
| Round | Decision | Why |
|---|---|---|
| 1 | Hunt toy; tuned through debriefs (7 changes, all helped) | Test the sensor-hunt pillar cheaply |
| 2 | Per-run temperament + variant, INTEL briefing | Briefing changes the build; replay "mild, then flat"; FIRE-mashing |
| 3 | WEGO + signal meter (step 2 not built) | 1 run, 0/5; bot ignored the shot cap |
| 4 | I-go-you-go, AP + Energy, move modes, Signal | 3/5 over 8 runs. Missing: "more to plan around" |
| 5 | Rolled uplink objective, leashed bot | Route varies, fight doesn't: "who gets killed first" |
| 6 | Port to TS + Vite, `sim/`/`view/`, runner | Parity confirmed; then 0/5 for lack of variety |
| 7 | Field of 4 light units, then 2-mech lance + initiative | Roles split, initiative tense; 1/5 over 3 runs |
| chore | GitHub Pages copy, full-screen tags, version tag | Play without the viewer bar; spot stale caches |
| 8 | Rolled field composition; hunt fixes | Same split won every field; 0/5 over 3 runs |
| 9 | MORTAR module + blind lob | Split moved; too easy vs static nest; 0/5 over 2 runs |
| 10 | Rolled QUIET/NOISE zones, statics dig in | Ground changed the plan; noise ended stand-off. 2/5 over ~8 runs. Stopped on "nothing at stake" |
| 11 | 3-hunt contract, carry-over, job pick; payout + refit, `REFIT_CAP` 0.8; tester splash | Stakes landed in H3 only; 1/5 over 2 contracts. Missing: "more tactical depth" |
| 12 | To-hit roll (Signal, range, moved, cover) + hit locations; step 2 not started. Cover tuned at wrap (`COVER_RANGE` 1.5→1.0, `COVER_GRAZE` 0.5→0.3) | Parts "changed the fight", fights differed 3/3; % "didn't make sense". 1/5 over 1 contract. "AI needs a serious pass" |
| 13 | "Loud gets company" (result, partial): EMIT/SOUND read at a glance, pack "came for me, fair", hit % makes sense; 2/5 over 3 contracts; loud-cost unproven. Jamie chose to plan R14 rather than finish R13. Before that: "Loud gets company": split Signal into Emissions + Sound (step 1), then alarm / converge / press the wound (step 2). Gated on step 1 reading clearly. Aimed shots stay parked | Design lead chat: "fights felt richer, enemies felt dumb"; field "let me off the hook", "don't actually hunt me", "no risk in having high signal"; sprint noise shouldn't stack or linger |
| map | Game shape session: **exosuits, not mechs**; flying ship as a mobile base (before / after / between, never on the board); SIGINT = Cold Waters–style signature matching + a risk dial; suits = frame / reactor / signature budget; operators = skills + fragility. Full map in `claude/signal-lance-game-shape.md` | Jamie: "we have an actual game on the back end". Map the whole shape before the next round, without building it; every piece gets a cheap test and a gate |
| map 2 | Open threads closed. **City:** planet-spanning, faction-held districts, flat node travel, danger = faction base + your heat. **Push:** upkeep + per-faction notoriety (alert fields, hunter teams, closed airspace). **Contracts:** faction jobs and deniable broker jobs; basic info at any range, detail by SIGINT range. **Economy:** credits + fuel (priced by faction); parts are items, bought or looted; salvage automatic, capped by the hold. **Standing is two-way:** friendly factions supply intel on their enemies. **Death:** difficulty setting (Ironman / Standard critical + extract / Story), tune around Standard; recruits from districts, rescue, crew training | Jamie's answers in the open threads session. Campaign is mapped but stays unbuilt until Gate 1 passes |
| map 3 | Construction deep dive: **locations = R12 hit parts**; typed hardpoints + 1–2 OPEN; weight = rated load + overload band (move AP, servo Sound); power = reactor output − draw = regen, batteries = pool; signature as **raw bars** (the debrief explains); **tags + mods scoped by location**; the **ship uses the same rules** (overload → fuel). Progression: **wide + sidegrades**; sources = faction markets, broker market, salvage, contract rewards (no reverse-engineering); **items with condition** (Sound / Worn / Failing; hits reliability and signature, never power); ship = refit sections + occasional hull trade-up. Then the **full catalogue** (~250 base rows, MegaMek-inspired breadth, nothing copied): **six signature channels** (VISUAL incl. lidar/EO, ACOUSTIC, THERMAL, EM, ELECTRIC, MAGNETIC = passive mass), sensor/jammer grades 1–3, **armour = plate + skin per location**, active stealth costs your EW. Sim rollout agreed: THERMAL (with the suit-budget round) → MAGNETIC → VISUAL → ELECTRIC, one at a time. Open questions closed: BACK hit only from the rear arc; one mod per location; 2-hardpoint modules rare and same-location; broker sells baseline steel frames, makers the rest; closed airspace = intercept roll vs ship signature; makers = Corporate, Foundry, Syndicate, **Old Army** (gated by company reputation) + broker. Rules in `claude/signal-lance-construction.md`, rows in `claude/signal-lance-catalogue.md` | Jamie asked for a catalogue deep dive during the R13 build. Treated as mapping (like the game shape sessions): nothing is built, and the suit-budget cheap test is sharpened |
| 14 | "Read the signature" + **test bed**. Card is 3 variants per type (Jamie: "3 per type"); a right ID = track by type + to-hit +10 (Jamie: "10% is good"); wrong ID costs only the misleading track. Test bed = agent-written scenarios per round, `[TESTBED]` log, fun test still counts contracts only | R13: channels readable but deciding nothing yet; R13's open question took contracts and stayed open. Jamie: "better ways to test the new mechanics… a little button that loads a dev suite" |
| 14 (result) | Read works, mission ignores it. Fun test 2/5 over ~2 contracts. `ID_SHOW_FITS` on (helped partly). Patrol step tells stay close-range for a baseline ExoS; acoustic sensors extend them later (Jamie) | Jamie: "the information just doesn't give us anything other than position for a ranged lob"; "Yes… AND… but I just can't quite figure out what the and is" |
| slice | **Gates 1 and 2 merged into a whole-loop slice.** 8 components, each thin; fun test once on the connected slice. Each component gets its own scoping chat first. Missions is first | Jamie: "no one current item … could get that fun test passed … a spread of larger ideas that need to come together". R14: "I think it just being uplinks is boring right now"; wants mission variety; the "and" = "pick my fights and choose how to fight it" |
| 15 | Missions scope (Jamie): Bounty (variant bounties, quota then push your luck, a kill pays its true variant however it died), Retrieve (grab the guarded cargo; the field flips to hunting the carrier), Escort (a faction ally on a route of legs; you pick the leg at each junction). Uplink kept in the mix. Each hunt rolls its type, shown before refit. Built and tuned one step at a time, with a check-in before Steps 2 and 3; no fun test | Jamie's own types; "mission variety is key". Recon / find-the-one / cross-and-extract not picked |
| 15 (result) | Missions read and connect: Bounty, Retrieve, Escort "the read changed my plan"; Uplink "not sure"; test bed "useful". No fun test (slice). Biggest missing piece: **"bigger loop"** (campaign, operators, ship) | R15 debriefs; fixed map caps route choice |
| 16 | "Rolled ground": ~8 hand-drawn 12×12 blocks with anchors + modifier slots (sound zone, LoS set piece, ground clutter = low cover + slow + noisy, each its own knob), random grid (6×2 … 4×4, min 8 blocks), field scaled by area, escort graph from seams; hive map kept as `MAP_MODE` control. No fun test | R15 Retrieve "only one sensible route" (2b trigger). Jamie: "lots of variations… some real variety"; picked both clutter effects. Movement rework split to R17 so each reads cleanly |
| 16 (result) | Map reads and connects: "the map changed my plan"; final changes "helped", weakest moment "felt fine". Grid → street blockers → **packed districts** (default) → start aprons. Escort controls (HOLD / HURRY / levers), shared cover cancels, EXTRACT per mech (closes #57). No fun test (slice) | Jamie: "still feels too much like a grid… irregular shape library… cut off by the map boundary". Biggest missing piece: drawn routes (R17) |
| 17 | "Eyes on the street": drag-drawn path for this turn only (tap kept), up to 3 facing waypoints (`FREE_TURNS` / `AP_TURN`), eyes checked every step, new contact or LoS stops the move with unspent AP kept, stop-here marker (#20). Side: scrap = low cover `HIT_COVER_LOW` 15 (#62), cover source shown (#18), packed-layout scenarios (#65), escort button (#59). No fun test | R16 "best round in a while" (Jamie). Jamie: "shape the turn for that ExoS and look as you go to aim sensors down alleys"; interrupt = stop, keep AP. Multi-turn walk not picked |
| 17 (result) | Drawn routes read and connect: "moving became part of the hunt"; interrupts "saved me"; weakest moment "felt fine". Spec overrides: freehand line, end handle, tap-to-look eye marker, stop ring removed; facing free (`AP_TURN` 0). Low cover 15 in. Runner 37% → 49%, mostly the interrupt. No fun test (slice) | Jamie: "facings shouldnt cost AP at all" (man-sized units). Next: "whatevers next in the plan" = suit building |
| note | **Lance size: 1–4 ExoS deployed per mission** (Jamie, 2026-10-05; "ExoS", pronounced Ex-Oss, is his placeholder term for the exosuits). Today's builds use 2 | Jamie, during the R14 debrief |

## Parked ideas (by gate)
**Gate 1 candidates (depth)**
1. More LoS blockers; rubble from damaged buildings — hunt
2. Deeper SIGINT display; type ID from signal alone → now the **signature matching** strand — hunt
3. Enemy tiers by AI skill: veterans, elite suit reusing TEMPERS/VARIANTS — scale
4. Enemy indirect fire; shell flight time, smoke, flares, other shell types — combat
5. Mortar balance: proximity splash, bigger base scatter; aimed lob is two taps (low) — combat
6. Verticality in 2D: height tiles changing sightlines and Signal (exosuit scale makes this more relevant; full interiors are Gate 3) — hunt
7. Drones / scouts / expendable recon; deployable jammer or decoy — hunt
8. Enemy AI, beyond R13: react when shot (cover, back off), flank, use zones, call for help as an action, relays and comms jamming — enemy behaviour
9. Initiative delay/hold/interrupt; modules that change initiative — combat
10. ~~Interrupt~~ → done in R17 (stop, keep AP) — combat
11. Smarter fixes: no fix in impossible spots, no stale cross-referencing — hunt
12. Zones that change movement cost or the observer's own sensors; QUIET does nothing for turrets — hunt
13. RWR, enemy ECM ghosts, aimed radar pulse, passive bearings only on the enemy's turn — hunt
14. Unreliable, partial or out-of-date INTEL; weighted or no-repeat rolls (folds into the signature-matching confidence) — scale / hunt
15. Enemy AI managing its own Emissions/Sound (going quiet, ambushing); recheck passive feeling mandatory — hunt
16. Pre-drop SIGINT scans (now from the ship, Gate 2); recon sniper team for HUMINT — hunt
17. R12 step 2: aimed shots (`HIT_AIMED` −20), per-part repair (`COST_PART_RESTORE` 60). Later: salvage, crits, enemies aiming at parts — combat / company
18. R12 build notes: legs and weapon at 2 hits; ~~show which wall gives cover~~ (done R17); visible "disarmed" state; tap-to-show odds breakdown — combat
19. **Emission taxonomy (Jamie R13 chat):** now decided as six channels (catalogue §1); sim rollout in steps. Was: separate EM / IR / EF / acoustic signatures; different sensors and weapons read each differently. Builds on R13's two channels; pairs with reactor heat/IR in suit building — hunt / resource pools

49. Comms detection range: patrol "small radios" (`COMMS_EMIT` 10) carry ~14 tiles; probably needs its own shorter range (R13) — hunt
50. RADAR may be mandatory: the `--loud` bot wins more because radar info outweighs the noise; watch in play (R13) — hunt

**Quality of life (Gate 1, low)**
20. Fast travel when no enemies tracked; END TURN auto-moves along a plotted path; a tap move carrying on by itself after a stop (stop marker done R17, then removed by Jamie) — combat

**Gate 2: a reason to care**
21. Operators: one skill each, injury, fatigue; death per difficulty (Standard: critical + extract); recruits from districts, rescue, crew training — company
22. Changing loadouts or buying modules and parts between hunts — company
23. Logistics and upkeep; fuel priced by faction; salvage hold cap — logistics
24. Escalating contracts, enemies that remember you, contract-specific objectives → now per-faction notoriety (alert fields, hunter teams, closed airspace) — company
25. Multi-path contracts: side missions, bounties, salvage — company
26. Ex-military company; FRAGO-style op brief — company
27. Collateral damage lowers HUMINT reliability — company
28. Saving / resuming a contract across reloads (needs Gate 4 saves) — company
29. R11 build notes: rebuild (200) hard to reach before H3; cap ratchets down each hunt; BAIL only a forfeit — economy
30. The ship: 3–4 module slots across before / after / between; pre-drop scan risk dial — company
46. **City map:** flat node map of faction districts; faction base danger + your heat; contract detail by SIGINT range — campaign
47. **Faction standing:** one meter per faction; faction jobs vs deniable broker jobs; friendly factions supply intel on their enemies — campaign / SIGINT

**Gate 3: content**
31. New enemy types: infantry, light-to-heavy vehicles
32. Mission types: varied objectives, counter-objectives, more victory conditions
33. → slice row 2b. Block map library: 6–8 interlinking 10×10 blocks, 3×3 grid rolled per hunt. Later: more blocks, themed districts, new tiles
34. Operator progression trees and specialisations
35. Campaign depth: more factions and districts, faction-themed block sets, company personalisation, OSINT contract map
36. IR emitters and modules; Heat pool; builds that change pool generation
37. Full exosuit and ship catalogue: written in `claude/signal-lance-catalogue.md`, rules in `claude/signal-lance-construction.md` (build after the sharpened suit-budget test passes)
38. Interiors, rooftops, close quarters at exosuit scale
48. Ironman and Story difficulty settings (Standard is built first)

**Gate 4: production**
39. Move to 3D, Godot reusing `sim/`; Godot MCP Pro available
40. Art, sound, saves, menus; home-screen icon, dropping the 56px clearance on Pages
41. Presentation pass: new Blade Runner films vibe; lidar-dot world readout with grey fog of war + UI aesthetic, "this is what I want": Micrographics Vol.1 by Fox Rockett Studio (foxrockettstudio.com) (2026-10-05)

**Tooling and bugs (low)**
42. Smarter scripted player in the runner (creep, radar, ECM, two-suit roles)
43. R7 rough edges: type label lost on re-acquire; unidentified wrecks named; both suits uplink in one round; one suit at extraction ends the hunt
44. R8 rough edges: artifact and Pages keep separate run logs; same field can repeat across a cycle boundary
45. Ported bug: hidden first hunt at page load; tighter TypeScript types
51. Decoys and masking, to disguise what you are, to hide or lure the enemy — strand: hunt · parked 2026-10-05
52. A "heard nothing close by" reading, so a scout can be told apart at range (R14) — SIGINT
53. Picker hints: the full "only what fits" picker would give the answer away; greying is as far as it goes (R14) — SIGINT
54. Unrated by play: Twin pulse frozen-track lob payoff, Quiet gun miscall cost (R14; test bed now rated "useful", R15) — SIGINT / tooling
55. Make push-your-luck bite at Bounty quota: over-quota pays more, or the field stiffens over time (R15, one data point) — missions
56. Choose or refit the loadout after seeing the job type (R15) — suit building / company
57. ~~Extraction rule~~ → done in R16 (EXTRACT per mech; hunt ends when all are out) — missions
58. Runner: the inherited R13 sound-share flag (raise threshold or revisit sound); scripted lance always picks Escort NORTH and never pushes past quota (folds into #42) (R15) — tooling
59. ~~Done R17.~~ Escort route button can sit under HUD text near the map top (R15) — tooling
60. **District theme and tone** across a whole map (industrial, slum, corporate block sets + matching building assets); zone theme parked with it (Jamie, R16 scoping) — campaign / content
61. Interactive or destructible set pieces (fuel tanks, cranes) (R16 scoping) — hunt
62. Small-unit value done R17 (`HIT_COVER_LOW` 15). **Remaining: scrap cover by size (Jamie, R16):** clutter −15% to hit for small units instead of counting as a wall (−25%); larger units −5% once sizes exist; "low cover" in the odds line — combat
63. Big districts brutal for the scripted lance (4×4 17%, 5×3 0%): `FIELD_SCALE_BY_AREA`, `STREET_KEEP`, grid weights; one debrief question once Jamie has played big maps (R16) — missions / balance
64. Scripted lance ignores levers, HOLD / HURRY and clutter trade-offs; runner understates Escort (folds into #42) (R16) — tooling
65. ~~Done R17~~ (packed-layout scenarios). R16 scenarios still use the old block-grid layout; may want packed-layout versions (R16) — tooling
66. Interrupt knobs if it ever nags: ignore sound-only contacts, or eyes only (R17) — combat
67. Look-menu polish: "✕ LOOK" doesn't follow a pan; hold on your ExoS opens the tooltip instead of a draw (R17) — tooling
68. `FREE_TURNS` / `FACE_WAYPOINTS_MAX` mean little now facing is free; the cap of 3 could go (R17) — combat
69. Scripted lance never draws paths or sets looks, so the runner can't value them (folds into #42) (R17) — tooling
70. "Wait here" waypoint / go codes, Door Kickers style (R17) — combat
71. Facing is free for man-sized ExoS; frame size could later bring turn cost and size-based cover back (R17; feeds suit building) — suit building
