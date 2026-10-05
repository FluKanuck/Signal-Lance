# Signal Lance: Round 2 status report — "Know your enemy"

**Date:** 2026-09-30
**Build:** `signal-lance.html` (one self-contained file, about 1,130 lines, vanilla JS + canvas)
**Branch:** `claude/signal-lance` (repo `FluKanuck/Prototype`), commits `533f291` (build) and `c7bdbe6` (debrief log)
**Live artifact:** https://claude.ai/artifact/NRNixsKxVrcMGNeYp6bB2o (same URL as Round 1)

## Purpose

Round 1 fixed the hunt but failed the replay test ("done for now"). The cause was that nothing varied between runs, so the loadout felt solved. Round 2 tested one linked change: **does a varied enemy, briefed before launch, turn the loadout screen into a real decision?**

## Current status

- **The change helped.** The briefing made the player change their build, which answers Round 2's question with a yes.
- **The pull to replay is still weak: "mild, then flat."** Seeing the next briefing was interesting for a few runs, then wore off.
- **A new root cause surfaced.** The hunts differ, but once combat starts it becomes "hitting FIRE as fast as I could. No skill or tactics." The player puts this down to the **controls**: it's hard to fire and manoeuvre at the same time on the phone layout.
- **Round wrapped early at the player's call.** The ~10-run fun test was not formally scored.

## What was built

1. **Enemy temperament**, rolled each run and built from existing knobs (now in `TUNE.TEMPERS`):
   - **Aggressive:** patience 0.5–2 s, commits to a charge on vaguer contacts (4.5 tiles), fires on weak locks (3 tiles).
   - **Patient:** patience 4–10 s, creeps while investigating or searching, fires only on a firm lock (1.2 tiles).
   - **Cautious:** holds at 8 tiles instead of 4, needs a tight contact (2 tiles) before it charges, and pulses radar every 6 s.
2. **Enemy loadout variant**, rolled each run from the player's own modules (now in `TUNE.VARIANTS`):
   - **Standard:** the old fixed enemy.
   - **ECM:** radar swapped for an ECM mask, which is on while it hunts.
   - **Heavy:** 3 armour, no passive. It finds you by pulsing radar every 8 s.
   - **Hunter:** +2 power cells (more radar endurance) and 10 rounds.
3. **INTEL briefing:** one accurate line above LAUNCH, e.g. "INTEL: Patient hunter: creeps, waits you out, shoots only on a firm lock. Running ECM, no radar."
4. **Reporting:** the temperament and variant pair shows on the result screen, in the log line (`vs PATIENT ECM`) and in the DBG overlay.
5. **Small rule mirrors needed to make it work** (all recorded in ASSUMPTIONS):
   - An ECM enemy's jamming gives your passive dashed bearing-only lines.
   - An enemy with no radar skips its radar pulse and charges as soon as it's confident.
   - A radar pulse that finds nothing sends the enemy back to patrol.

## Changes (from the TWEAK LOG)

| # | Symptom | Change | Result |
|---|---|---|---|
| R2 | "Done for now": nothing varies between runs, so the loadout feels solved | New per-run temperament and variant, plus the INTEL briefing. `ENEMY_PATIENCE_MIN`/`MAX`, `ENEMY_CONFIDENT` and `ENEMY_FIRE_UNC` moved into `TEMPERS`. `ENEMY_ARMOUR` and `ENEMY_AMMO` moved into `VARIANTS`. New `ENEMY_BLIND_PULSE` 8 s | **Helped** |
| R2b | Combat is just mashing FIRE, with no skill or tactics. Cause per the player: the controls | No change. `SHOT_SPEED` 25 → 10 was proposed and declined as not the cause | — |

## Parked (not built)

1. **Controls:** firing while manoeuvring is awkward with tap-to-move plus a FIRE button. This is the likely reason combat feels like button-mashing, and it's the top candidate for the next round.
2. **Loadout balance:** the briefing now changes the build. Recheck whether passive still feels mandatory once combat has tactics.
3. **Radar warning (RWR):** a warning when enemy radar paints you.
4. **Unreliable or partial INTEL.**
5. **Enemy ECM ghosts.**
6. **Mid-hunt tells** that reveal the enemy's temperament.
7. **Weighted or no-repeat rolls.**

## Suggested next step

If Signal Lance is picked up again, run a **Round 3 about the combat controls** with one question: *can the player fire and manoeuvre at the same time, so the fight becomes a tactical choice rather than a mashing race?* Candidates include:
- a hold-to-fire or auto-fire toggle at the selected contact
- move orders that keep facing the target
- a dedicated move/stop button

Build one of them only, then re-ask the Round 2 debrief questions. By the method's rule this counts as round 2 of 3 for the replay-pull strand, so a third flat result means move on guilt-free.
