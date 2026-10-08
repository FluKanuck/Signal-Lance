# Signal Lance: Godot port plan

**Written:** 2026-10-08 by the design lead with Jamie. **Status:** planned. The work starts only after the slice fun test passes (see "Gate").

## Decision
- **Engine:** Godot 4 with GDScript.
- **Why move:** to get the look of the real game: 3D, lidar-dot fog of war, the Blade Runner feel.
- **The hunt stays turn-based.** Real time with active pause is not in this plan. The port changes the engine and the look, not the rules.
- **Not chosen:**
  - TS + three.js. It keeps everything, but Jamie wants the long-term engine.
  - Godot with C#. Godot 4 cannot export C# to the web, so phone testing would end.

## Gate
- The slice fun test with Jamie's testers runs first (needs 3 of 5).
- If it passes, the port starts.
- If it fails, we fix the design in TS first, because a change there takes minutes.
- Writing this plan before the result is fine. Porting before the result is not.

## What we checked (2026-10-08)
- **Godot 4.4.1 runs headless in a cloud session.** It is a 62 MB download, and a GDScript script runs with `--headless -s`. Coding agents can test without Jamie's PC.
- **The web export templates can be downloaded from the session.** So agents can build the GitHub Pages build.
- **Every random roll uses mulberry32.** That covers `rng.ts`, the contract RNG and the company RNG. GDScript can copy it bit for bit with 32-bit masks. JS numbers and GDScript floats are both 64-bit, so the maths can match too.
- **Result:** the Godot rules can be checked **seed for seed** against the TS game. This is the base of the whole plan.

## Size
- **Rules:** `src/sim/` is about 6,200 lines in 33 files, and `src/tune.ts` is 659 lines.
- **View:** `src/view/` and `src/build/` are about 4,000 lines. The view is replaced, not ported.

## Phases (each fits about one weekend)

### 0. Golden logs (in TS)
- Add `npm run sim -- --golden <dir>`.
- For each fixed seed, it writes the rolls, the event log and the end state as JSON.
- Use about 20 hunt seeds, 20 contract seeds and 5 company runs, and include the QA panel seeds.
- These files are the answer key. Commit them.

### 1. Godot shell
- Make a `godot/` folder in the same repo.
- Add `rng.gd` (mulberry32, with a test against the TS output) and `tune.gd` (a 1:1 copy of `tune.ts`, comments kept).
- Add a headless test command: `godot --headless -s tests/run.gd`.
- A setup script for the session installs Godot.
- The first golden test: the same seed gives the same first 1,000 rolls.

### 2. Port the rules (bottom up)
- Port one group at a time. A group is done when its golden logs match.
- Order:
  1. state, world, blocks, packed, zones (the map)
  2. sensors, sound, rwr, ids (finding)
  3. combat, pack, turns, warn, reasons (fighting)
  4. mission, escort, found (jobs)
  5. aar (learn why)
  6. scan, livescan (pre-drop intel)
  7. items, kit, fit (ExoS building)
  8. contract, company, city, personality (the company and the city)
  9. bot, autoplay, invariants, scenarios, huntsave (runner, checks, test bed, save and quit)
- Same rules, same names. No improvements during the port. Note any bug you find in TS, and fix it in both places only after the port matches.

### 3. Godot runner
- `--contracts 20 --check` in Godot gives the same totals as the TS runner.
- After this phase, the rules port is done.

### 4. The look
- **Hunt:** a 3D hunt view on the same rules. That means the map, the ExoS, contacts, the lidar-dot fog of war, drawn routes, look markers and the HUD.
- **Other screens:** company, hangar, scan, city and the books are plain Godot UI for now.
- **Words:** the glossary, long-press cards and greyed-button reasons move over as they are. The writing standard still applies.
- **Phone first:** landscape, touch, buttons 48 px or larger. The mouse still works.

### 5. Testers
- Web export to GitHub Pages, with the tester splash, BASICS and HISTORY.
- Point the QA panel at the Godot build. It runs the same seeds, so we can compare against the last TS batch.
- Once the Godot build passes the QA batch with no new blockers, it replaces the TS build for testers.

## Rules while porting
- **TS stays the live game.** It is frozen except for fixes from the tester results. Each such fix gets a golden log update and goes into the port list.
- **No new features** in either build until phase 3 is done.
- **Agents** keep `sim/`-style rules (no drawing or input) apart from the view in Godot too. Rules scripts never touch nodes.
- **Tests** stay. Port each Vitest file as its group is ported.

## Open questions (decide when we get there)
- The 3D style: low-poly, voxel or lidar points only? Run a look spike in phase 4.
- The camera on a phone: fixed isometric or free?
- Desktop builds (Steam) are later, not part of this plan.
- Real time with active pause stays parked (roadmap #39 area).
