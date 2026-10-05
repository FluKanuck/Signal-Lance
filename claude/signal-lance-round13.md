# Signal Lance: Round 13 status report — "Loud gets company" (in progress)

**Date:** 2026-10-05
**Build:** `signal-lance/` TS project (~2,770 lines of src), `dist/signal-lance.html`, BUILD `r13-s2`
**Branch:** `main` (repo `FluKanuck/Signal-Lance`), commits 06b3638 (process + tests), 5f4598f (R13 build), 03b3ea0 (target rule, sound tune), d31fdb0 (test 2 fixes), c03943c (quick contract), and the wrap commit (radar vs NOISE)
**Live artifact:** https://claude.ai/artifact/NRNixsKxVrcMGNeYp6bB2o · testers: https://flukanuck.github.io/Signal-Lance/ (never deployed yet: the GitHub Actions outage of 2026-10-05 kept failing the Pages build)

## Purpose
When noise only lasts the turn it's made and emissions carry far, and a field that hears either one raises the alarm and closes in (pressing hardest on a wounded mech), does getting loud become a real risk Jamie manages on purpose?

## Current status
- **Not finished.** Played: 2 full contracts (pack off) plus 1 quick contract (pack on). The fun test hasn't been run yet. The brief asks for ~4–5 contracts.
- **The step 1 gate passed.** "Could you tell SOUND and EMIT apart?" was answered **"At a glance"** in both pack-off and pack-on hunts. A SOUND contact "Helped me find something".
- **Pack on, first read:** "Came for me, fair". It raised 8 alarms in a 6-round Sweep, which was won by uplink with no mechs lost.
- **Open question:** "Did the sound ring change what you did?" got "Crept instead of sprinting" (C1 H1) but **"No"** with the pack on. It isn't proven yet that being loud costs something Jamie can point at.
- **Hit %:** "Yes" (makes sense) on both answers. The R12 cover tune looks fine.
- **The runner can't judge loud vs quiet.** The scripted lance just walks to the uplink, and being found pulls patrols away from it. With radar, `--loud` even wins more. Treat the runner as a "does it work" check, not a balance check, for this question.

## What was built
1. **Process:** the briefs were loosened (defaults, not hard rules). There are Vitest tests (`npm test`, 36 tests), and the runner gained `--check`, `--set`, `--loud`, `--pack` and `--both`. The scripted player moved to `src/sim/autoplay.ts`.
2. **Step 1, Sound vs Emissions:**
   - EMIT is electronic only (radar, ECM, uplink, comms), and passive hears only EMIT.
   - Sound is one radius per activation (CREEP 2, NORM 4, SPRINT 7, gun 12, mortar 14). It ignores walls and is gone at the unit's next activation. A heard contact is a hollow square labelled SOUND and never gives a lock.
   - HUD: EMIT bar and SOUND readout. Map: a sound ring around each mech, and one at the move preview's destination.
3. **Step 2, the pack** (splash toggle, OFF by default):
   - A field unit that senses a mech alerts others within 8 + 8×EMIT/100 tiles. There's no relay, and a shared contact never gives a lock.
   - Patrols drop the uplink leash (HUNT / SEARCH / LEASH) and go for the most damaged mech (Jamie's rule), sprinting at wounded targets.
4. **Quick test:** a 1-hunt contract toggle (LENGTH) on the loadout screen.
5. **Fixes:**
   - The page now declares UTF-8 at the very start, which fixes the garbled "·", "−" and pips.
   - RADAR now needs its module in the sim; before, only the view hid the button.

**Runner (20 contracts, pack off):** sound share of the field's first contacts went from 70% (6/9 move sounds) to 48% (4/7), then 50.1% after the two-leg change (the flag sits right at its line). Lance passive first contacts went from 30 to 71 once patrols carried comms. No stalls.

## Changes (from the TWEAK LOG)
| # | Symptom | Change | Result |
|---|---|---|---|
| 1 | Runner: sound was 70% of the field's first contacts | `SOUND_RANGE` NORMAL 6 → 4, SPRINT 9 → 7 | Flag cleared (48%), later 50.1% |
| 2 | No bearing lines on patrols (electronic-only passive) | `COMMS_EMIT` PATROL 10 (an EMIT floor), turrets 0 | Helped. "Small radios" range needs tuning later |
| 3 | Couldn't shoot a heard patrol; RADAR did nothing with sensors gone | FIRE/MORTAR say SOUND; heard contacts are hollow; RADAR/ECM/GHOST say SNS | Helped |
| 4 | A broken leg = couldn't move (NORM selected) | **Spec override (Jamie):** two legs (`PART_MIN` LEGS 2): one gone = CREEP only (auto-selected), both = CREEP × `LEGS_GONE_MULT` 0.5 | Helped |
| 5 | Radar fix "where it obviously isn't", outside the cone, circle too big | `ZONE_NOISE_AFFECTS_RADAR` → false (NOISE no longer blurs radar) | Untested (wrapped) |

## Parked (not built)
1. Comms detection range: "small radios" shouldn't carry like today's EMIT 10 (about 14 tiles in open ground). It probably needs its own, shorter range.
2. The runner can't measure loud-vs-quiet risk. A scripted player that hides or uses the gap while patrols are away would fix that (roadmap parked #42).
3. Sound flag at 50.1% of the field's first contacts: watch it, don't chase it.
4. The `--loud` bot wins more because radar's information outweighs the noise. Worth revisiting if RADAR feels mandatory in play.

## Suggested next step
Play the radar-vs-NOISE change, then finish the round: ~2–3 more contracts **with the pack on** (the quick toggle is fine for single checks), then the fun test. The question still open is whether being loud cost Jamie something he could point at. Focus the next debrief there ("did the pack find you *because* you were loud?").
