# Signal Lance: Round 11 brief — "The contract"

Read claude/code-agent-brief.md and claude/playtest-method.md, then follow this round brief.

## QUESTION
Does a 3-hunt contract, where damage, ammo, shells and lost mechs carry over and Jamie picks 1 of 2 briefed jobs each time, make each hunt feel like it matters?

## WHY
Round 10: terrain changed the plan and the fun test rose to 2/5 over ~8 runs, the best since R4. Then runs went "samey" on "nothing at stake". In the design lead debrief Jamie narrowed it to **"no bigger picture"**: each hunt floats alone. This is Gate 2's first slice, brought forward. Consequence comes first; the economy comes second.

## CHANGE
Build in two steps. The game must be playable after step 1 on its own. Ship step 1, report, and wait for "played" and a debrief before starting step 2. **Only start step 2 if the step 1 debrief says carry-over made later hunts feel different.** Otherwise stop, tune step 1, and report.

Keep everything from Round 10 (two-mech lance, initiative, AP, Energy, move modes, Signal, noise ring, damage read, type ID on sight, muzzle flash, uplink, composition roll, MORTAR and blind lob, QUIET/NOISE zones, R8 hunt fixes) unless listed here. Rules go in `src/sim/` first (a small `contract.ts` is fine), then the view.

### Step 1 — Contract with carry-over and a job pick
1. **Contract.** A run is now a contract of `TUNE.CONTRACT_HUNTS` (default 3) hunts. It starts at the loadout screen, as now.
2. **Loadouts lock for the contract.** A and B are configured once at contract start and can't be changed until the contract ends (simplest; note in ASSUMPTIONS).
3. **What carries over between hunts, per mech:**
   - armour damage taken (the damage read continues from where it ended)
   - gun rounds remaining
   - mortar shells remaining
   - destroyed status: a mech destroyed in a hunt **stays gone for the rest of the contract**
   - What resets each hunt: AP, Energy, Signal, ECM state, contacts, facing, position (both mechs spawn fresh as now).
4. **Job pick before each hunt.** Roll 2 jobs from the seeded RNG. Each job is a complete hunt setup: composition, zones, uplink point and seed. The two must use different compositions. Show a job-pick screen with:
   - both INTEL lines, as now
   - the lance's current state: per mech, its damage read (e.g. "BLOODIED"), rounds, shells, or "LOST"
   - hunt counter ("Hunt 2/3") and contract wins so far
   - two big buttons (≥ 48px): TAKE JOB 1 / TAKE JOB 2
   - Hunt 1 also gets a job pick (shown after the loadout is locked).
5. **Playtest pool.** Set `FIELD_PLAYTEST_POOL` to `[]` (full pool), so the job choice has real variety. Turn off the per-build shuffled set's effect on job rolls if it gets in the way; note what you did in ASSUMPTIONS.
6. **Hunt outcomes inside a contract:**
   - WIN UPLINK / WIN CLEAR: hunt won. Go to the next job pick.
   - BAIL (a mech reaches extraction, as now): hunt forfeited, not won. The contract continues.
   - LOSS (both remaining mechs destroyed): **the contract fails** immediately.
   - A hunt with one surviving mech runs as now under initiative, with only that mech.
7. **Contract result.** After hunt 3 (or a contract fail), show a contract result screen:
   - **CONTRACT COMPLETE** if hunts won ≥ `TUNE.CONTRACT_WINS_NEEDED` (default 2) and the lance survived; otherwise **CONTRACT FAILED**.
   - All hunts side by side: job taken, composition, result, kills, mechs lost, and damage carried out.
   - A button back to the loadout screen to start a new contract.
8. **In memory only.** The contract lives in sim state. Reloading the page starts over. This is **not** a save system; note it in ASSUMPTIONS.
9. **Reporting.**
   - Each hunt's log line adds the contract and hunt, e.g. `C3 H2/3 · WIN CLEAR · Sweep · kills 4/4 · A BLOODIED, B LOST`.
   - One contract summary line per contract, e.g. `C3 COMPLETE 2/3 · lost B in H2`.
   - DBG line shows the contract seed and current hunt seed.
10. **Headless runner.** Add `--contracts N`. The scripted lance always takes job 1. Run 20 contracts and report **before** Jamie plays: contracts complete vs failed, hunts reached, mechs lost by hunt number, average damage and ammo entering hunts 2 and 3, and stalls over 80 rounds. Flag it if nearly every contract fails in hunt 1 (carry-over never gets tested) or if nothing is ever carried (stakes are zero).

### Step 2 — Payout and refit (only after a good step 1 debrief)
11. **Payout.** Each hunt pays credits: `TUNE.PAY_WIN` (default 100) for a win, `TUNE.PAY_KILL` (default 20) per kill, 0 for BAIL. Show the running total on the job-pick screen.
12. **Refit between hunts.** On the job-pick screen, before taking a job, Jamie can spend credits:
    - repair one armour hit: `TUNE.COST_REPAIR` (default 15)
    - +10 gun rounds: `TUNE.COST_ROUNDS` (default 10)
    - +1 mortar shell: `TUNE.COST_SHELL` (default 15)
    - rebuild a lost mech with its original loadout, at full armour and starting ammo: `TUNE.COST_REBUILD` (default 200)
    - Nothing can exceed the loadout's starting values. Loadouts still don't change.
13. Credits reset each contract. The contract result screen shows credits earned and spent.
14. **Runner:** the scripted lance spends greedily (repairs first, then rebuild, then ammo). Re-run 20 contracts and report before Jamie plays.

15. All new values go in `src/tune.ts`, commented. Log R11 rows in `NOTES.md`, and note carry-over and contract rules in ASSUMPTIONS.

## NOT IN THIS ROUND
- Pilots, names, skills or pilot loss (parked, next candidate after this)
- Changing loadouts, buying new modules or upgrades between hunts
- Logistics, supply lines, upkeep or anything costing credits outside the refit list
- Saving or resuming a contract across page reloads; any save system
- A campaign map, OSINT contract board, factions, or contracts longer than 3 hunts
- Enemies that remember you between hunts, escalating difficulty, or contract-specific objectives
- Field, zone, mortar or unit-stat changes; new unit types, an elite mech, SIGINT depth
- Rough-edge fixes from R7/R8 unless one blocks the contract
- Menus beyond the job-pick and contract result screens, art, sound

## DEBRIEF FOCUS
1. **Did the past hunt change the next one?** In hunt 2 or 3, did Jamie play differently (more cautious, picked the easier job, avoided a fight, rushed the uplink) because of what an earlier hunt cost him? Did losing a mech sting, or shrug off?
2. **Did the job pick become a real decision?** Did he weigh his lance's condition against the two INTELs, or just take the first one? After step 2: did spending credits feel like a choice or like housekeeping?

Also ask once at the end: **did any hunt feel like it mattered more than an R10 run did?**

## DONE
~10 contracts is a lot of hunts, so aim for **~4–5 contracts** (about 12–15 hunts) + fun test run, then save the status report as
claude/signal-lance-round11.md. Include the runner summaries.
