# Signal Lance: Round 23 brief — "Who you'll anger"

Read claude/code-agent-brief.md and claude/playtest-method.md, then follow this round brief.

**Context:** slice row 8, "Campaign map", the last slice component. Scoped in the R23 design lead chat (2026-10-07). R22's after-action page reads and connects ("Yes, it changed my plan"). Jamie's biggest missing piece: "City map and factions (placeholder) and a better runner bot." **Testing is headless (Jamie):** runner batches stand in for play, and Jamie tunes from the numbers. He is saving fresh human eyes for a larger tester pool on the whole slice. No fun test (slice).

Two checkpoints, each shippable on its own: **A = the city**, **B = runner personalities**. Ship A, run its sanity batch, then build B. B is what makes this round's numbers mean anything, so it isn't optional.

## QUESTION
On a city map of faction districts, does picking the next contract become a trade between pay and who you'll anger, so that different ways of picking (top pay, loyal, deniable, cautious, aggressive) end up in clearly different places?

## WHY
R21 + R22: the company and the after-action page connect, but contracts are three offers floating in space. Nothing remembers who you worked against. The game-shape cheap test has never run: "Does picking the next contract feel like weighing pay against who you'll anger?" Every R22 company number measured one scripted bot that always grabs the top fee, never carries out, and never buys (#42, #101).

## CHANGE
Keep everything from R22 unless it's listed here. Rules go in `src/sim/` first (a new `city.ts` is the natural home), then the view. New values go in `src/tune.ts`, commented.

### Checkpoint A: the city (sim, then view)

1. **A seeded city per company:** `CITY_DISTRICTS` [6, 8] districts on a flat node map. Each node links to 2–3 neighbours. Three factions (placeholder names, e.g. Corporate, Foundry, Syndicate), each holding 2–3 districts. Each faction gives its districts a base danger. The ship sits in one district.
2. **Travel:** a jump to a neighbouring district costs fuel. This replaces today's per-offer `FUEL_PER_JUMP` range: the fuel to reach a contract is the path cost on the map (`CITY_FUEL_PER_LINK`). The fuel price in a district is set by the faction that holds it (see 5). Keep `FUEL_MAX`, `START_FUEL` and the market.
3. **Contracts live in districts.** Keep three offers (today's flow), each placed in a district and shown on the map. Each offer is one of two kinds:
   - **Faction job:** posted by a faction against a rival faction. Pay × `CITY_FACTION_PAY` (above 1). Completing it raises the employer's standing and lowers the target's.
   - **Broker job:** deniable, against a faction. Pay × `CITY_BROKER_PAY` (below 1). The target's standing drops by a smaller amount, and nobody gains.
   Basic info shows on every offer: employer, target, job type, pay, danger, fuel to reach. Danger = the target faction's base + your notoriety with it (see 4). Keep "offers never all one danger" (R21 fix).
4. **Standing, one meter per faction, both ways** (Jamie: "both ways, cheap effects"), from `STANDING_MIN` to `STANDING_MAX` (e.g. −100 … +100). Thresholds `STANDING_HATED` and `STANDING_LIKED` set three bands: HATED / NEUTRAL / LIKED. Deltas: `STANDING_EMPLOYER_GAIN`, `STANDING_TARGET_LOSS`, `STANDING_BROKER_LOSS`, plus a slow drift back toward 0 per contract (`STANDING_DRIFT`), so a grudge can fade.
5. **What standing does:** every effect reuses something already built.
   - **Hated:** that faction's fields start more alert (reuse the R20 `SCAN_RISK_ALERT` / alert share path, adding `STANDING_HATED_ALERT` to the share). Fuel in its districts costs `STANDING_HATED_FUEL_MULT` × `FUEL_PRICE`. Its danger rating goes up a step.
   - **Liked:** its jobs pay `STANDING_LIKED_PAY` × on top of the fee (Jamie's #47). On contracts **against its enemies**, the pre-drop scan starts with free intel: the R20 EM roster or a band-1 layer already filled in (`STANDING_LIKED_INTEL`, simplest option, noted in ASSUMPTIONS). Fuel in its districts is cheaper (`STANDING_LIKED_FUEL_MULT`).
6. **The city screen replaces the offers panel.** Keep it to one landscape phone screen, because R21 said "busy, a lot of screens" (#100): map on the left, three standing bars along the top, the tapped district's offer on the right. Buttons ≥ 48px, top 56px clear. The after-action page's WHAT IT COST gets standing lines ("Foundry −15, you hit their uplink ← T6").
7. **Autosave** carries the city and standing (it extends the R21 company save; no new save system).
8. **Log** `[CITY]` lines: jump, offer picked (employer, target, kind), standing change, fuel price paid.

### Checkpoint B: runner personalities

9. **Personalities in TUNE** (`BOT_PERSONALITY`), each a set of weights the scripted lance keeps **across both layers**, the hunt and the campaign (Jamie: "same runner plays similarly in the campaign layer"):
   - **Cautious:** creeps, scans longer, bails earlier, always carries out CRITICALs, takes LOW danger, prefers brokers, keeps a fuel reserve.
   - **Aggressive:** sprints, pushes past the Bounty quota, takes HIGH danger, takes faction jobs whoever they anger.
   - **Loyal:** sticks to one faction's jobs (the first it works for) and lives with being hated by the others.
   - **Mercenary:** top fee in reach, every time (today's default).
   Hunt-side weights touch only behaviour the bot already has (move mode, bail threshold, quota push, scan time). Don't build new bot tactics; #42's deeper AI stays parked.
10. **Two fixes every personality gets** (they're why R22's numbers measured the bot): carry out a CRITICAL operator when a suit can reach them (#101; Cautious always, others by weight), and buy repairs and parts between contracts when it can afford them.
11. **Runner:** `--personality cautious|aggressive|loyal|mercenary|all`. `all` runs the same seeds once per personality and prints them side by side: folds (and why), contracts played / completed, KIA, credits and fuel over time, end standing per faction, the share of contracts taken in hated territory, and how often the top-fee offer was turned down. Keep `--pick low` as an alias for cautious's contract pick. Wire it into the `/sl-balance` mod if it's a small change.

### Test bed and tests

12. **Test bed** (fixed seeds, the thin books style, no hunt played): **"Hated"**, a company hated by one faction looking at an offer in its district (alert share, fuel price, danger shown), and **"Liked"**, the same offer from a friendly faction against its enemy (pay bonus, free intel shown on the scan). Question for both: "Could you see what your standing cost or earned you?" Keep older scenarios working.
13. **Vitest:** the map is connected and seeded; path fuel matches the jump count; faction and broker jobs move standing by the right deltas; the bands switch at their thresholds; hated raises the alert share and fuel price; liked adds pay and intel; drift moves toward 0; the save round-trips the city; each personality's contract pick follows its rule on a fixed offer set.
14. **Tester splash** (`src/view/brief.ts`): what's new in plain words plus 2–3 tap questions. Update GAMEPLAY BASICS (the city screen, faction vs broker jobs, standing bands and what they do). Bump `BUILD`.

## NOT IN THIS ROUND
- Hunter teams, closed airspace, intercept rolls (the full notoriety set)
- New enemy types, faction-themed fields or block sets, district themes (#60)
- Recruits by district, faction markets or makers, Old Army gating
- More than 3 factions or 8 districts; a moving front, faction wars, territory changing hands
- A painted ship raising heat (#86); scan-found side objectives (#84)
- The LLM QA panel (#106; its own round, before the slice fun test)
- New bot tactics beyond the personality weights (#42 stays parked)
- Economy retuning outside the new city knobs, unless the batches make a clear case. Propose it to Jamie first and log it in the TWEAK LOG

## DEBRIEF FOCUS
Testing is **headless by Jamie's call**. The runner numbers stand in for play.
1. **Is the choice real?** With `--personality all` over `--company 10 --companies 20` (or larger): do the personalities end in clearly different places (folds, credits, standing, contracts completed), or does one style win on every measure? If Mercenary always wins, anger has no price. If Loyal always folds, liking a faction is worth nothing.
2. **Does standing behave?** Does it spiral (everyone hated by contract 5, or nobody ever hated)? How often is the top-fee offer in hated territory, and what does taking it cost? Include 2–3 sample company histories (one per personality) in plain lines so Jamie can judge whether they tell a story.

## DONE
- Checkpoint A shipped with a sanity batch (`--company 10 --companies 20`, today's mercenary bot); checkpoint B shipped; both test-bed scenarios working.
- Headless batches with `--personality all`. Report the numbers to Jamie and propose TUNE changes (standing knobs first). Apply on his "go", rerun, and log old → new in the TWEAK LOG.
- **No fun test** (slice; the fun test runs once on the whole slice with Jamie's tester pool).
- Save the status report as claude/signal-lance-round23.md, with the numbers before and after tuning and the sample histories.
