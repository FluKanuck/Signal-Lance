# Signal Lance Roadmap

**Updated:** 2026-10-05 after the construction deep dive (R13 "Loud gets company" being built). The full map of the game lives in `claude/signal-lance-game-shape.md`.

## North star
Prepare in depth, deploy under pressure, watch your plan succeed or fall apart, then learn why.

**Shape (Jamie, game shape sessions):** an ex-military company of **exosuit** operators (not mechs) aboard a flying ship over a planet-spanning city of faction-held districts. The ship works before the drop (SIGINT), after it (repair, medbay, salvage hold) and between missions (fuel, range), but never on the board. Most enemies are weaker units (turrets, infantry, light-to-heavy vehicles) that are static, roaming or hidden. Enemy suits are the rare elite.

## Strands
| Strand | Question | Status | Rounds used |
|---|---|---|---|
| Hunt | Is finding and fighting with sensors fun? | Passed. R9 mortar, R10 terrain deepened it. R12: to-hit + parts made fights "richer" and different 3/3; % not trusted (cover tuned, untested — checked in R13). Step 2 (aimed shots) parked | 1 (+R8–R10, R12) |
| Enemy behaviour | Does an enemy that hunts you and presses an advantage make fights feel alive? | **R13 written, not built.** Jamie: "enemies felt dumb", "let me off the hook", "don't actually hunt me". Testing alarm, converge, press the wound | 1 (R13) |
| Resource pools | Do separate pools (AP, Energy, Signal, Heat) create real trade-offs? | AP + Energy banked on purpose. Jamie R12: "no risk in having high signal"; sprint noise wrongly stacks. **R13 splits Signal into Emissions (EM, builds, carries far) and Sound (per-turn, short)**. Heat untested | 2 (R4, R13) |
| SIGINT: signature matching | Does reading a signature and matching it against a reference manual (Cold Waters style) make identifying contacts a skill? | Mapped. Cheap test: distinct signatures for the 3 unit types + one-page reference card, in-hunt. Later also pre-drop from the ship, with a risk dial, plus faction-supplied intel | 0 |
| Suit building | Do frame (weight), reactor (power) and signature budgets force a real sacrifice, shaped by the INTEL? | Mapped. Cheap test: 3 frames, 2 reactors, ~6 modules | 0 |
| Combat controls | Can you fire and manoeuvre as a tactical choice? | Passed (R4). R10 noise ended "stand off and pummel" | 3 |
| Replay pull | Does the next run ask a new question? | Reframed into Company after R10 | 5 (reframed) |
| Scale | Does a lance hunting a mixed field turn a duel into a plan? | Yes (R7). Split moved with mortar (R9), steady since | 3 |
| Company / persistence | Does something carried between runs make you care? | Partly (R11): stakes land late (H1 flat, H3 tense). R12: part damage carried | 2 |
| Operators | Do operators with a skill who can be hurt make losses hurt? | Mapped: skills + fragility. Death is a difficulty setting (Ironman / **Standard: critical + extract** / Story); tune around Standard. Recruits: hire in districts, rescue, train crew. Gate 2 opener | 0 |
| Ship | Does outfitting the ship (3–4 slots across before / after / between) make the campaign a plan? | Mapped. Salvage hold caps loot. Gate 2 | 0 |
| City and factions | Does choosing the next contract feel like weighing pay against who you'll anger? | Mapped: flat node map of faction districts; per-faction standing (hated → alert fields, hunters, closed airspace, pricey fuel; liked → intel on their enemies); faction jobs vs deniable broker jobs. Pushed by upkeep + notoriety. Gate 2 | 0 |
| Logistics / economy | Does keeping the company supplied create good decisions? | Payout + refit "helped" H1; R12 C2 earned 380, spent 240. **Now two currencies: credits + fuel** (fuel priced by faction). Parts are items, bought or looted; salvage automatic, capped by the hold | 1 |

**Watch:** the fun test has been 0–2/5 for seven rounds (R6 0, R7 1, R8 0, R9 0, R10 2, R11 1, R12 1), almost all over 1–3 contracts or runs. Each round's new thing gets a positive read, then the pull fades. R13 targets the pillar directly (Signal as risk). If it lands flat over a full ~4–5 contracts, that's a strong signal to rethink what the core loop is asking. The campaign layer is now well mapped; **don't build it until Gate 1 passes.**

## Gates
1. Core loop fun: not passed. Best recent 2/5 (R10). Order: R13 emissions + pack → signature matching in-hunt → suit budget
2. Meta loop fun: started (R11). Contract + carry-over + refit hold as the frame. Order: operators (Standard death rules, recruits) → ship slots + pre-drop scan → city map (fuel, upkeep, factions, standing, faction intel)
3. Content scaling: on hold. Full module catalogue, interiors/rooftops/verticality, block maps, mission types, infantry and vehicles, more factions and districts, Ironman and Story settings
4. Production: narrowly open (TS + Vite, `sim/`/`view/`, runner, Pages, tester splash). Godot, the presentation pass, art and saves stay locked

## Sequence
| Round | Name | Question in short |
|---|---|---|
| 13 | Loud gets company | Step 1: Sound (per-turn, short) vs Emissions (builds, carries far). Step 2: alarm, patrols converge, press the wound. Does getting loud become a real risk? |
| 14 | ? | Recommended: "Read the signature" (signature matching in-hunt with a reference card). Others: suit budget; R12 step 2 (aimed shots); deeper enemy reaction |
| — | Operators | One named operator per suit, one skill, Standard death (critical + extract), injuries that bench them, 2 recruits in one district |
| — | City map | 6–8 districts, 3 factions, standing meters, upkeep per jump, faction fuel prices |
| — | Gate 1 + 2 fun test | ~10 runs / ~4–5 contracts, 3/5 to pass |

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
| 13 | "Loud gets company": split Signal into Emissions + Sound (step 1), then alarm / converge / press the wound (step 2). Gated on step 1 reading clearly. Aimed shots stay parked | Design lead chat: "fights felt richer, enemies felt dumb"; field "let me off the hook", "don't actually hunt me", "no risk in having high signal"; sprint noise shouldn't stack or linger |
| map | Game shape session: **exosuits, not mechs**; flying ship as a mobile base (before / after / between, never on the board); SIGINT = Cold Waters–style signature matching + a risk dial; suits = frame / reactor / signature budget; operators = skills + fragility. Full map in `claude/signal-lance-game-shape.md` | Jamie: "we have an actual game on the back end". Map the whole shape before the next round, without building it; every piece gets a cheap test and a gate |
| map 2 | Open threads closed. **City:** planet-spanning, faction-held districts, flat node travel, danger = faction base + your heat. **Push:** upkeep + per-faction notoriety (alert fields, hunter teams, closed airspace). **Contracts:** faction jobs and deniable broker jobs; basic info at any range, detail by SIGINT range. **Economy:** credits + fuel (priced by faction); parts are items, bought or looted; salvage automatic, capped by the hold. **Standing is two-way:** friendly factions supply intel on their enemies. **Death:** difficulty setting (Ironman / Standard critical + extract / Story), tune around Standard; recruits from districts, rescue, crew training | Jamie's answers in the open threads session. Campaign is mapped but stays unbuilt until Gate 1 passes |
| map 3 | Construction deep dive: **locations = R12 hit parts**; typed hardpoints + 1–2 OPEN; weight = rated load + overload band (move AP, servo Sound); power = reactor output − draw = regen, batteries = pool; signature as **raw bars** (the debrief explains); **tags + mods scoped by location**; the **ship uses the same rules** (overload → fuel). Progression: **wide + sidegrades**; sources = faction markets, broker market, salvage, contract rewards (no reverse-engineering); **items with condition** (Sound / Worn / Failing; hits reliability and signature, never power); ship = refit sections + occasional hull trade-up. Then the **full catalogue** (~250 base rows, MegaMek-inspired breadth, nothing copied): **six signature channels** (VISUAL incl. lidar/EO, ACOUSTIC, THERMAL, EM, ELECTRIC, MAGNETIC = passive mass), sensor/jammer grades 1–3, **armour = plate + skin per location**, active stealth costs your EW. Sim rollout agreed: THERMAL (with the suit-budget round) → MAGNETIC → VISUAL → ELECTRIC, one at a time. Open questions closed: BACK hit only from the rear arc; one mod per location; 2-hardpoint modules rare and same-location; broker sells baseline steel frames, makers the rest; closed airspace = intercept roll vs ship signature; makers = Corporate, Foundry, Syndicate, **Old Army** (gated by company reputation) + broker. Rules in `claude/signal-lance-construction.md`, rows in `claude/signal-lance-catalogue.md` | Jamie asked for a catalogue deep dive during the R13 build. Treated as mapping (like the game shape sessions): nothing is built, and the suit-budget cheap test is sharpened |

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
10. Movement interrupted by a new signal or new LoS — combat
11. Smarter fixes: no fix in impossible spots, no stale cross-referencing — hunt
12. Zones that change movement cost or the observer's own sensors; QUIET does nothing for turrets — hunt
13. RWR, enemy ECM ghosts, aimed radar pulse, passive bearings only on the enemy's turn — hunt
14. Unreliable, partial or out-of-date INTEL; weighted or no-repeat rolls (folds into the signature-matching confidence) — scale / hunt
15. Enemy AI managing its own Emissions/Sound (going quiet, ambushing); recheck passive feeling mandatory — hunt
16. Pre-drop SIGINT scans (now from the ship, Gate 2); recon sniper team for HUMINT — hunt
17. R12 step 2: aimed shots (`HIT_AIMED` −20), per-part repair (`COST_PART_RESTORE` 60). Later: salvage, crits, enemies aiming at parts — combat / company
18. R12 build notes: legs and weapon at 2 hits; show which wall gives cover; visible "disarmed" state; tap-to-show odds breakdown — combat
19. **Emission taxonomy (Jamie R13 chat):** now decided as six channels (catalogue §1); sim rollout in steps. Was: separate EM / IR / EF / acoustic signatures; different sensors and weapons read each differently. Builds on R13's two channels; pairs with reactor heat/IR in suit building — hunt / resource pools

**Quality of life (Gate 1, low)**
20. Fast travel when no enemies tracked; END TURN auto-moves along a plotted path; "you'll stop here" marker — combat

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
33. Block map library: 6–8 interlinking 10×10 blocks, 3×3 grid rolled per hunt. Later: more blocks, themed districts, new tiles
34. Operator progression trees and specialisations
35. Campaign depth: more factions and districts, faction-themed block sets, company personalisation, OSINT contract map
36. IR emitters and modules; Heat pool; builds that change pool generation
37. Full exosuit and ship catalogue: written in `claude/signal-lance-catalogue.md`, rules in `claude/signal-lance-construction.md` (build after the sharpened suit-budget test passes)
38. Interiors, rooftops, close quarters at exosuit scale
48. Ironman and Story difficulty settings (Standard is built first)

**Gate 4: production**
39. Move to 3D, Godot reusing `sim/`; Godot MCP Pro available
40. Art, sound, saves, menus; home-screen icon, dropping the 56px clearance on Pages
41. Presentation pass: new Blade Runner films vibe; lidar-dot world readout with grey fog of war

**Tooling and bugs (low)**
42. Smarter scripted player in the runner (creep, radar, ECM, two-suit roles)
43. R7 rough edges: type label lost on re-acquire; unidentified wrecks named; both suits uplink in one round; one suit at extraction ends the hunt
44. R8 rough edges: artifact and Pages keep separate run logs; same field can repeat across a cycle boundary
45. Ported bug: hidden first hunt at page load; tighter TypeScript types
