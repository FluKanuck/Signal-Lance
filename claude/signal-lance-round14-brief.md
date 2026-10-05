# Signal Lance: Round 14 brief — "Read the signature"

Read claude/code-agent-brief.md and claude/playtest-method.md, then follow this round brief.

## QUESTION
Does matching a contact's traits against a 9-entry reference card and committing an ID make identification a skill Jamie uses before he has eyes on, because a right call sharpens the track and the aim?

## WHY
R13 (partial, 3 contracts, fun test 2/5 so far): Jamie told EMIT and SOUND apart "at a glance", and a SOUND contact "helped me find something". The channels are readable, but reading them doesn't decide anything yet. He also ticked "oh, *that's* how it works", the feeling SIGINT should be built on. R13's open question ("did being loud cost you anything?") took contracts to answer and still isn't settled, so this round also adds a test bed: hand-placed scenarios that test one mechanic in minutes.

## CHANGE
Keep everything from Round 13 (Sound and Emissions, the pack behind `PACK_ENABLED`, two legs, quick contract toggle, `ZONE_NOISE_AFFECTS_RADAR` false, and everything before it) unless listed here. Rules go in `src/sim/` first, then the view. Build part 0 first and ship it on its own if that's quicker, so Jamie can close R13 while part 1 is built.

### Part 0 — The test bed
1. **Scenarios are data** in `src/sim/scenarios.ts`. Each one has:
   - `name`, `round` (e.g. 13), and `tryThis`: one plain line telling Jamie what to do, e.g. "Two patrols are just out of earshot. Sprint to the uplink. Then reload and creep."
   - a seed, the lance (loadouts, start tiles, facing, any parts already destroyed, Energy, rounds), the field units (type or variant, tile, facing, state such as HUNT or WATCH), the zones, and the uplink tile
   - `tune`: overrides applied only for this scenario (e.g. `{ PACK_ENABLED: true }`). Restore TUNE afterwards.
   - an optional `question`: one tap question with 3–4 answers, asked when the scenario ends
2. **Loading** uses `newHunt(loads, prep)`: the scenario's `prep` replaces the rolled placements. No map editor, no free-spawn menu, nothing typed in by hand. Scenarios are written by the agent from the round brief.
3. **View:** a **TEST BED** button on the loadout screen opens a list of the current round's scenarios first, then older rounds', each showing its name and `tryThis`. A scenario plays as one hunt, outside any contract: no payout, no carry-over. At the end it shows the tap question, then a **RETRY** button (same seed) and **BACK**.
4. **Log:** scenario hunts write a log line tagged `[TESTBED <name>]` with the usual kill, sound and alarm text and the tap answer. They never count toward contract stats or the runner's contract numbers.
5. **Runner:** `npm run sim -- --scenario <name> [--runs N]` plays a scenario with the scripted player. Add at least one Vitest test per scenario that loads it and checks the placements.
6. **R13 scenarios** (both with `PACK_ENABLED: true`):
   - **"Earshot":** the lance starts about 10 tiles from the uplink. Two patrols on LEASH sit just outside SPRINT sound range (7) and inside about 12 tiles, with a building between them and the route. Sprinting should bring them in. Creeping should let the lance slip by. Question: "Did being loud cost you something you could point at?"
   - **"Wounded":** one mech starts with one leg destroyed (CREEP only), the other is healthy, and three patrols are spread around them. Question: "Did the hurt mech feel hunted? Was it fair (you heard them coming) or a dogpile?"

### Part 1 — Read the signature
7. **Variants.** Each field type gets 3 variants, 9 in all, in `TUNE.FIELD_VARIANTS` (each commented). They're data only, built from the knobs that already exist: `COMMS_EMIT` floor, radar on or off and pulse cadence (`EMPL_PULSE_TURNS`), `SOUND_RANGE` for its moves and shot, ARMOUR / BASE_HITS, AMMO, FIRE_UNC, and patrol temper values. **No new behaviours.** Rules for the set:
   - Every variant shares at least one trait you can observe with another variant, often one of a different type, so a single reading never settles it.
   - Every variant has **exactly one separating tell** you can observe, written on the card.
   - The differences matter in a fight (e.g. a heavy patrol takes more hits, a fire-control emplacement locks faster), so knowing which one you face changes the plan.
   - Give them short names, e.g. PATROL: scout / line / heavy; TURRET: sentry / hush / gun; EMPLACEMENT: search / fire-control / relay. Note the full table in ASSUMPTIONS.
   - Compositions keep their type counts. Each slot rolls a variant (seeded, evenly).
8. **Observed traits (sim).** Every player contact keeps a short list of what the lance has actually observed about it: EMIT level band (none / low / high), steady or pulsing (with the pulse interval once two pulses have been seen), moved or still, its loudest sound heard (by radius band), fired or not. Only things your sensors really picked up go in. DBG shows the true variant next to it.
9. **The card (view).** A **CARD** button in the hunt, also reachable from the TEST BED list, opens a one-screen overlay with the 9 variants: name, traits, and the separating tell in bold. Keep it phone-readable in landscape with no scrolling if possible. It's not a database. One line per trait.
10. **Commit an ID.** Tapping a contact shows its observed traits and an **ID** button that opens a picker of the 9 variants. A contact with no ID reads **UNKNOWN** (or SOUND for a pure sound contact, as now). A committed ID shows its name with a "?" until it's confirmed. Re-ID any time, for free.
11. **What an ID does:**
    - **Track by type:** an ID'd static (TURRET or EMPLACEMENT variant) stops growing its uncertainty on your own turn (`UNC_GROW_OWN_TURN` no longer applies), so an aimed lob gets easier to line up. An ID'd mobile variant keeps growing as now. **A wrong ID still applies its type's rule.** If you call a patrol a turret, your track freezes on a spot it has already left. That's the cost of a wrong call, and there's no extra penalty.
    - **Aim:** firing at a contact with the **correct** ID adds `HIT_ID_BONUS` **10** % to the to-hit roll. A wrong ID adds nothing. Show it in the to-hit breakdown as "ID +10".
    - **Eyes on** reveals the true variant, as type ID on sight does today. A wrong committed ID then flips to the truth and is flagged as a miscall for the log.
12. **The field doesn't ID you.** Enemy behaviour is unchanged.
13. **Reporting:** the hunt log adds `· IDs 3 (2 right, 1 wrong, 1 before eyes)` (IDs committed, right or wrong, and how many were committed before any eyes-on contact).
14. **Runner:** the scripted player commits an ID once a contact's traits narrow it to a single variant (use a simple matcher in `sim/`). Report across 20 contracts: the share of contacts ID'd before eyes, the right/wrong rate, and the average number of rounds from first contact to a single-variant read. **Flag** if more than 80% narrow to one variant from the first reading (too easy) or fewer than 20% ever do (unreadable).
15. **R14 scenarios** (pack off unless noted):
    - **"Look-alikes":** two contacts behind buildings at about 12 tiles, one a scout patrol and one a variant that shares its EMIT band. Only waiting a turn (to see one of them move or pulse) separates them. Question: "Did you wait for the tell, guess, or ignore the card?"
    - **"Quiet gun":** a hidden turret variant on a route the lance must cross. Its tell only shows if Jamie listens before moving. Question: "Did a right or wrong ID change what you did next?"
    - Optional third, if it's cheap: an emplacement pair where a correct ID makes an aimed lob possible before eyes.
16. All new values go in `src/tune.ts`, commented. Log R14 rows in `NOTES.md`. Note the variant table, the trait bands and the wrong-ID track rule in ASSUMPTIONS.
17. **Tester splash** (`src/view/brief.ts`): what's new in plain words (contacts are UNKNOWN until you ID them from the CARD, a right ID tightens your track and your aim, and there's a TEST BED button), plus end-of-hunt tap questions shaped by the debrief focus. Bump `BUILD`.

## NOT IN THIS ROUND
- A map editor, a free-spawn sandbox or user-made scenarios. Scenarios are agent-written data only
- New field unit *types*, an elite enemy suit, new compositions, new behaviours for variants (only existing knobs)
- New signature channels (THERMAL, MAGNETIC and the rest), pre-drop scans from the ship, faction-supplied intel, a confidence % on IDs
- Enemies identifying you, enemy ECM ghosts, RWR
- Pay for IDs, a to-hit penalty for a wrong ID, or an ID that costs AP
- Suit building, operators, the city map, saves, art, sound effects
- Retuning the pack, the alarm or the R13 sound values (use the "Earshot" and "Wounded" scenarios to *see* them; changes go through the debrief)

## DEBRIEF FOCUS
1. **Skill or homework?** Did Jamie wait for a tell before committing an ID, guess, or ignore the card? Did a right or wrong call cost or save him something he could point at? If it feels like homework, the first knobs are how many traits the card lists and how fast the traits fill in. If it feels like a giveaway, it's the overlap between variants.
2. **R13 carry-over, via "Earshot":** did being loud cost him something he could point at? Record the answer in this round's report as the R13 close-out.

Also ask once: **is the test bed useful,** faster to learn from than a contract, or just a detour?

## DONE
- Part 0 played (both R13 scenarios at least once each).
- The R14 scenarios played, then ~3–4 contracts (about 10 hunts) with variants on, and the fun test (contracts only).
- Save the status report as claude/signal-lance-round14.md. Include the runner summary, the scenario tap answers, and the R13 close-out line.
