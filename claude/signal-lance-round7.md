# Signal Lance: Round 7 status report — "Lance vs the field"

**Date:** 2026-10-01
**Build:** `signal-lance/` project, TypeScript + Vite (about 1,780 lines: sim 890, view 510, plus tune, wiring, page and runner); built file `signal-lance/dist/signal-lance.html`, version tag `r7-s2`
**Branch:** `claude/signal-lance` (repo `FluKanuck/Prototype`), commits `032e619` (step 1), `d8cb811` (version tag chore), `d5c6031` (run 1 change), `0c91458` (run 2 log), `61f47ff` (step 2), `15495f2` (run 3 log), `52cd106` (wrap)
**Live artifact:** https://claude.ai/artifact/NRNixsKxVrcMGNeYp6bB2o (also on GitHub Pages: https://flukanuck.github.io/Prototype/)

## Purpose
Round 7 asked whether a mixed field of weak units gives the player more to plan around than the 1v1 duel. Step 1 added a hidden turret, an emplacement and two patrols. Step 2 gave the player a two-mech lance acting in rolled initiative order. Round 5 had found that "1v1 decides it all", and Jamie scored the old build 0/5 for lack of "variety of content or variables".

## Current status
- **Step 1 (the field, one mech): partly.** The first run won (WIN UPLINK, 3 of 4 kills), but "had no idea what each contact I was shooting actually was", so kills felt anonymous. That was fixed by naming a contact's type when you see it, which Jamie rated "helped". In the next run he "fought what came": he didn't plan around specific contacts or sneak the uplink, and the hidden turret was not a standout moment.
- **Step 2 (the lance, initiative): yes.** One run: WIN CLEAR, 4/4 kills, with mech B destroyed. The two mechs took different jobs: "used A to locate, and then used B to push in with A behind it". He built that split in the loadouts (A radar + passive + ECM; B 2 armour + 40 rounds). Initiative felt "tense, in a good way".
- **Fun test:** 1/5 (said "one more go"). Jamie wrapped after 3 runs, not the ~10 the brief asked for, so this is a thin sample.
- **Biggest thing still missing:** "variety in both map and field, followed by a reason to care".

## What was built
1. **The field** (step 1) replaces the duel bot. It has 1 hidden turret, 1 emplacement and 2 patrols (`TUNE.FIELD`, `TUNE.FIELD_TYPES`), with seeded positions. The turret and emplacement spawn near the uplink, and patrols spawn anywhere reachable.
   - **Turret:** silent until it fires, and fires on a firm lock only.
   - **Emplacement:** pulses radar every 2 of its turns, sweeping 100° each time when it has no contact.
   - **Patrols:** use the old bot brain with Cautious-style values.
   - **Static units:** can't triangulate, so they turn to look along bearings instead. No unit shares information with another.
2. **Muzzle flash, both ways.** The unit being shot at gets a contact on the shooter, about 2 tiles uncertain (`FLASH_UNC`). It shows where the shooter is but is not a firing lock.
3. **Multiple contacts.** Each unit is its own contact; you tap one to select it as the FIRE target. Bearings are tagged per unit, so they never cross into a false fix. Destroyed units leave a wreck.
4. **Outcomes.** You win by WIN UPLINK or WIN CLEAR. The result screen and log show the kill count, plus a line per field unit. INTEL gives the rough composition ("1 emplacement, 2 patrols, reports of a hidden turret").
5. **Pacing.** The enemy phase runs 5× faster while the acting unit isn't a live contact of yours (`ENEMY_UNSEEN_SPEED`), so you don't wait on units you can't see.
6. **Type ID on sight** (run 1 change). Your eyes label a contact with its type, and the label stays while the contact lives. Wrecks are named.
7. **Two-mech lance** (step 2), A and B. Each has its own loadout, toggled on the loadout screen; B starts as a copy of A. Both mechs feed one shared contact picture, so bearings from A and B cross into fixes. Either mech can uplink and progress is shared. You lose when both mechs are destroyed.
8. **Initiative** (step 2). Each round, every living unit rolls `INIT_BASE[type]` plus a random 0 to `INIT_ROLL`. Bases are mech 5, turret 6, patrol 4, emplacement 3, and ties go to the player.
   - Each unit acts on its own activation, and the camera centres on your mech when its turn comes.
   - A strip at the top right shows the order: A and B always, a field unit as "?" only while you track it.
9. **Version tag** on screen (`r7-s2 · MM-DD HH:MM`), added as a chore so Jamie can tell a stale cached copy of the Pages site.
10. **Headless runner.** It now plays the field, then two mechs under initiative. It prints wins by type, average kills, stalls, and per unit type: found, acted, fired, destroyed.

### Headless runner, 20 games — step 1 (one scripted mech)
| Result | Games |
|---|---|
| LOSS | 19 |
| WIN UPLINK | 1 |
| WIN CLEAR | 0 |
| Stalls over 80 turns | 0 |

Finished games averaged 6.4 turns, with 0.35 of the 4 units destroyed per game.

| Unit type | Units | Found | Acted | Fired | Destroyed |
|---|---|---|---|---|---|
| Turret | 20 | 14 | 14 | 14 | 0 |
| Emplacement | 20 | 17 | 20 | 14 | 0 |
| Patrol | 40 | 38 | 40 | 23 | 7 |

### Headless runner, 20 games — step 2 (two scripted mechs, initiative)
| Result | Games |
|---|---|
| LOSS | 17 |
| WIN UPLINK | 2 |
| WIN CLEAR | 1 |
| Stalls over 80 rounds | 0 |

Finished games averaged 7.9 rounds, with 1.30 of the 4 units destroyed per game.

| Unit type | Units | Found | Acted | Fired | Destroyed |
|---|---|---|---|---|---|
| Turret | 20 | 20 | 19 | 19 | 1 |
| Emplacement | 20 | 20 | 20 | 20 | 3 |
| Patrol | 40 | 39 | 40 | 28 | 22 |

The scripted player just walks NORM to the uplink and fires whenever it has a lock. The loss rate measures that script, not balance. Jamie won all 3 of his runs.

## Changes (from the TWEAK LOG)
| # | Symptom | Change | Result |
|---|---|---|---|
| step 1 | "1v1 decides it all"; not enough variables | The field (turret, emplacement, 2 patrols), muzzle flash, WIN CLEAR, unseen-phase speed-up | Played: WIN UPLINK 3/4 |
| run 1 | "had no idea what each contact I was shooting actually was" → kills felt anonymous | Eyes identify a contact's type (label kept while the contact lives); named wrecks. No TUNE change | Helped |
| run 2 | Felt fine; "fought what came" | None | — |
| step 2 | (brief) | Second mech with A/B loadouts; initiative (`INIT_BASE`, `INIT_ROLL 3`); initiative strip | Played: WIN CLEAR 4/4 |
| run 3 | Felt fine; scout/push roles; initiative "tense, in a good way" | None | — |

## Parked (not built)
1. **SIGINT (Jamie):** identify a unit's type from its signal alone, with no eyes needed.
2. A smarter scripted player in the runner (creep, radar, ECM, two-mech roles), so the runner gives balance numbers rather than a "walk in and die" baseline.
3. Rough edges:
   - A contact that fades out completely and is re-acquired by bearings loses its type label.
   - Wrecks are named even if you never identified the unit.
   - One uplink per mech activation means both mechs can uplink in the same round.
   - A mech reaching extraction ends the whole hunt (BAIL).
4. Carried over, still out of scope: an elite enemy mech (`TEMPERS` and `VARIANTS` kept but unused); field units sharing contacts or calling for help; delay or hold actions in initiative; rolled field compositions; new unit types; new maps or zones; persistence; campaign.

## Suggested next step
The lance plus initiative is the first change since Round 4 that Jamie described in positive terms: clear roles and a tense order. The field alone (step 1) did not get him planning around specific contacts. His missing line sets the order: **variety first (map and field), then a reason to care**. A cheap next round could roll the field composition and positions per run from a small pool of the existing unit types, and add one or two map zones that change sightlines or Signal. That way each INTEL briefing asks for a different A/B split. Persistence or a campaign ("a reason to care") should follow once runs differ enough to be worth stringing together. The fun test is 1/5 from only 3 runs, so ask for ~10 runs next round before reading much into the score.
