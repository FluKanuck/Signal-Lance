# Signal Lance: Round 21 brief — "The company"

Read claude/code-agent-brief.md and claude/playtest-method.md, then follow this round brief.

**Context:** the company layer, agreed in the R21 design lead chat (2026-10-07). Pre-drop intel (slice row 4) is done: R20 "the scan changed my plan", Jamie "best scan yet, done". Jamie's biggest missing piece is **"ownership and progression"**, and his read is that **"it will need it all to get any of the feeling in there"**. So this round builds a thin version of the whole company: people, roster, books and ship. It covers slice rows 5 (Operators) and 6 (After the drop) and pulls part of row 8 forward (contracts on offer, fuel, the ship), with no map. It's built in **four checkpoints, each playable and shippable on its own**. This is the biggest round yet: if it stalls, stop at the last checkpoint that works. **No fun test** (it runs once on the whole slice). The check is "does it read and connect?".

## QUESTION
Does owning a company (people who can be hurt and grow, a roster to choose from, money and fuel that run out, a ship you fit) make you care what comes back from a drop, and plan the next contract around it?

## WHY
R18: "a sense of ownership and progression" was missing. R20: the biggest missing piece is "the company layer, owning and upgrading the ship". R11–R12 showed that stakes inside a single contract land late (H1 flat, H3 tense). This round tests stakes that carry **across** contracts.

## CHANGE
Keep everything from R20 (live scan, hangar, missions, packed maps, drawn routes, RWR, test bed, PLAY SEED) unless it's listed here. Rules go in `src/sim/` first (a new `company.ts` is the natural home), then the view. All placeholder numbers below go in `src/tune.ts`, commented. They're there to show the shape, not to balance it. Keep the R11 contract flow behind a flag (`COMPANY_MODE` true / false), so the runner can compare and old scenarios keep working.

### The company container (all checkpoints)
1. **One company, autosaved.** One company slot in localStorage (view side only, try/catch with an in-memory fallback, like `view/screens.ts`). Save after every hunt and every company screen action. A **NEW COMPANY** button (with a confirm) wipes it. A company **code** goes in the log so a bug can be replayed. Jamie opened this narrow notch of Gate 4 (saves) for this round only. No save slots, no cloud, no versioned migration: on a shape mismatch, offer NEW COMPANY.
2. **The company screen** sits between contracts: roster, books, market, contracts on offer, and the ship. The existing job pick, hangar, scan and hunt flow run inside a contract as they do today.

### Checkpoint 1: people (Jamie plays)
3. **Named operators.** Each suit is driven by a named operator (generated from a seeded name list) with **one skill** from a short list (`OP_SKILLS`): STEADY AIM (+to-hit, `SKILL_AIM` +10), QUIET MOVER (move sound −1 step or ×`SKILL_QUIET` 0.7 on the sound range), SHARP EARS (hears ×`SKILL_EARS` 1.3 further), SENSOR TECH (ID / match firms up faster, ×`SKILL_TECH`). Each skill is one hook in an existing rule; don't build a skill framework.
4. **Grow with use.** Each hunt survived adds XP (`OP_XP_HUNT` 1, `OP_XP_WIN` +1). At `OP_LEVELS` [3, 7] the skill steps up (level 2 and 3 values per skill in TUNE). A veteran is shown as such on the roster and in the hunt.
5. **Standard death rules.** A lethal hit drops the operator to **CRITICAL** (the suit is down and stays on the board). Extract them (a lancemate reaches the suit and carries them out, simplest version: the downed suit counts as extracted if a lancemate ends a turn adjacent and later extracts) and they live, **benched** for `OP_BENCH` 2 contracts; otherwise they're **gone** (KIA on the roster, kept in a short memorial list). Note the simplest carry rule in ASSUMPTIONS.
6. **Recruits.** Between contracts, `RECRUITS_OFFERED` 2 recruits with a random skill at level 1 are offered for `COST_HIRE` (from checkpoint 3; free until then).
7. Ship as `r21-s1`. Until checkpoint 2, the company is the two suits of today.

### Checkpoint 2: roster (Jamie plays)
8. **More than you can drop.** The company starts with **3 suits** (each keeps its own hangar fit, extending today's per-suit fit codes) and **4 operators**. Damage on parts carries between hunts and between contracts.
9. **Lance size 1–4.** Before each hunt, pick how many suits drop (1 up to the suits available) and pair an operator with each. Benched and KIA operators can't drop; a suit with a destroyed CORE can't drop until repaired. The sim needs to handle 1–4 player suits (today it is 2). Check initiative, the HUD turn strip, the scan's drop zones and the scripted lance with 1, 3 and 4 suits.
10. A 4th suit has to be bought (checkpoint 3) and needs a bay (checkpoint 4). Until then, the roster caps at 3. Ship as `r21-s2`.

### Checkpoint 3: books (Jamie plays)
11. **Two currencies: credits and fuel.** The company starts with `START_CREDITS` and `START_FUEL`.
12. **Contracts on offer.** Between contracts, `CONTRACTS_OFFERED` 3 contracts, each showing pay, danger (field size / tier, in words), length (hunts, `CONTRACT_HUNTS` 2–4) and **distance in fuel** (`FUEL_PER_JUMP` range). You can only take a contract you have the fuel for. Basic info only: no faction, no map.
13. **Costs per contract.** Wages per operator on the roster (`WAGE_OP`, rising with level: `WAGE_LEVEL_MULT`) and ship upkeep (`UPKEEP_SHIP`) are paid when a contract ends (or is bailed). If you can't pay, the company takes debt once (`DEBT_LIMIT`); past that, **the company folds**. Show a plain end screen with the company's record, then NEW COMPANY.
14. **Parts as items.** Repairs use **parts** (a count, plus credits per repair) instead of today's pure-credit refit. Parts are bought at the market or come from **salvage**: kills drop salvage automatically into the payout, capped by the hold (`HOLD_CAP` in salvage units). Spare salvage sells at the market. This replaces `REFIT_CAP` and `COST_REBUILD` in company mode (keep both for `COMPANY_MODE` false).
15. **A small market.** Between contracts, a seeded rotating stock (`MARKET_STOCK` ~6 lines): parts, fuel, ammo, 1–2 hangar items from the existing `items.ts` rows (only the cheap set unless a row already exists), a suit (frame) now and then (`COST_SUIT`), and recruits (`COST_HIRE`). Item prices go on the item rows (a `price` field). Item stats stay as they are (balancing system later, #76).
16. Ship as `r21-s3`.

### Checkpoint 4: ship (Jamie plays)
17. **One hull, 7 hardpoints.** A Courier-style starting hull: `SHIP_HARDPOINTS` 7, with **2 suit bays built in**. Modules are bought at the market (or a fixed ship shop list, simplest option) and fitted between contracts. One module per hardpoint.
18. **13 modules, one or more from every section of the ship catalogue** (`claude/signal-lance-catalogue.md` §12, our own placeholder values). Each is one hook into an existing rule:
    - **Before the drop:** RADAR ARRAY, THERMAL POD, EM SUITE: that sensor's `SCAN_SPEED` ×`MOD_SCAN_SPEED` 1.4 and its `SCAN_LOUD` ×`MOD_SCAN_LOUD` 0.6. QUIET DROP RIG: the field starts calmer (lower starting alert share).
    - **Drop:** SUIT BAY: carries one more suit (a 3rd or 4th suit needs a bay, so a 4-suit lance costs 2 hardpoints).
    - **After the mission:** REPAIR BAY (fewer parts per repair), MEDBAY (`OP_BENCH` −1 and better odds a CRITICAL operator survives a short carry), SALVAGE HOLD (`HOLD_CAP` up).
    - **Between missions:** FUEL TANKS (max fuel up), EFFICIENT ENGINES (fuel per jump −25%), HULL ARMOUR (soaks painted-ship hits, see 19).
    - **Crew:** OPERATOR BERTHS (operator cap +2; the base cap is `OP_CAP` 4, which checkpoint 2's starting roster fills).
19. **A painted ship takes hits.** When the scan's drop roll paints the ship, it also rolls hull damage (`SHIP_HIT_CHANCE`, `SHIP_HIT_COST` in credits to repair, payable between contracts). HULL ARMOUR soaks one. Show it on the result screen and in the `[SCAN]` log.
20. Ship altitude stays free (no module). Ship as `r21-s4`.

### Every checkpoint
21. **Learn why, thin:** the result screen and the company screen say plainly what changed: who got hurt or levelled, what was paid, what came home in the hold, and why the company is up or down. Log as `[COMPANY]` lines.
22. **Runner:** `--company N` plays N contracts back to back with the scripted lance (simplest picks: highest pay it has fuel for; repair everything it can afford; buy nothing else; drop all fit suits). Report contracts survived, folds, KIA, credits and fuel over time. The runner will undervalue the ship and market. Note that, don't fix it (#42).
23. **Test bed** (fixed seeds): **"Carry them out"** (cp 1): one suit downed CRITICAL two tiles from a lancemate. Question: "Was it worth going back for them?" **"Thin books"** (cp 3): a company one contract from folding, three offers (rich and far, safe and poor, mid). Question: "What decided your pick?" Keep older scenarios working (they run with `COMPANY_MODE` false).
24. **Vitest per new rule:** the company round-trips through save / load identically; XP and level-ups; CRITICAL → extracted = benched, not extracted = KIA; bench counts down per contract; wages and upkeep are charged; debt then fold; salvage capped by the hold; can't take a contract without the fuel; a 3rd / 4th suit needs a bay; each module changes only its own hook; a painted ship rolls hull damage and HULL ARMOUR soaks it; lance size 1–4 runs a hunt without errors.
25. **Tester splash** (`src/view/brief.ts`): what's new per checkpoint in plain words; 2–3 tap questions from the debrief focus. **Update GAMEPLAY BASICS every build** (operators and skills, critical + carry out, the company screen, credits / fuel / parts, the ship's hardpoints). Bump `BUILD`.
26. **Phone first:** the company screen is several short panels or tabs, not one long scroll; every button ≥ 48px; top 56px kept clear.

## NOT IN THIS ROUND
- The city / campaign map, districts, factions, standing, notoriety (#46, #47, #86); closed airspace and intercept rolls
- Fatigue, scars and lasting injuries, rescue recruits, operator skill trees (#21, #34)
- Item condition Sound / Worn / Failing, refit taking ship time (#72), refitting after seeing the job (#56)
- Altitude as gear (#96), the dynamic scan with enemy counter-fits (#94), scan grid types (#95)
- More hulls or hull trade-ups, ship reactor / power draw, crew (beyond operator berths), machine shop, armoury, cryo bay
- Ironman and Story difficulty (#48); Standard rules only
- Bounty over-quota pay (#55), wage scaling beyond the one multiplier
- A smarter scripted lance (#42 / #92); new enemies, maps or item rows; changing to-hit, map, mission or item stat values (changes go through the debrief)
- Any save system beyond the one localStorage slot (no slots, cloud or migrations)

## DEBRIEF FOCUS
1. **Caring what comes back:** did a CRITICAL, a KIA or a veteran change who you dropped, how you played the hunt, or what you bought?
2. **The books bite:** did credits, fuel and the hardpoints force a real choice between contracts and between modules, or was there always an obvious pick?

## DONE
- Checkpoints 1–4 shipped (or the last one that works) and both scenarios played, then **at least 3 contracts on one company** (about 10 hunts), then the "does it read and connect?" check (one tap answer: *the company changed my plan / it didn't / not sure*). **No fun test this round.**
- Save the status report as claude/signal-lance-round21.md. Include: which checkpoint was reached, the `--company` runner numbers, what Jamie's company looked like at the end (roster, levels, KIA, ship fit, credits / fuel), the scenario tap answers, and the company values at the end.
