# Signal Lance: Round 24 brief — "Say what it means"

Read claude/code-agent-brief.md and claude/playtest-method.md, then follow this round brief.

**Context:** All 8 slice components are built (R15–R23). The first QA panel (`r23-core-1008`, 28 sessions, 67 clusters) shows one main block between a fresh tester and the fun. The player can't tell what things mean or why nothing happened. Jamie: "built, but not readable yet". This round is the readability pass before the slice goes to Jamie's tester pool. It is also the first round under the house writing standard: `.claude/skills/signal-lance-writing/SKILL.md` (80% of the way to ASD-STE100). The STE skill itself is vendored at `.claude/skills/asd-ste100/`. Read both before you write any text.

Three checkpoints. Each one ships on its own: **A = the glossary and long-press**, **B = the phone HUD**, **C = the writing pass**. Build the fix list (`claude/signal-lance-r24-fix-list.md`) alongside. Most of its items are reason lines that A makes easy.

## QUESTION
With a long-press explain layer written to the house standard and a trimmed phone HUD, can a fresh player read the hunt and the screens around it without outside help?

## WHY
- The QA testers met undefined terms on every screen: EMIT, ESM, 'UNKNOWN · 7 fit', SND / EM / IR, DROPS, EARS, CAP and part codes (C05, C09, C10, C18, C22, C31, C34, C35).
- Greyed and blocked buttons do nothing and give no reason (C02, C08).
- On iPhone, the HUD text and button columns cover the map, and contacts slide under the buttons (C03, C07, C25).
- The game knew things and did not tell the player. A suit drops to DOWN with no warning (C12). Contacts disappear with no last-known mark (C15).

## CHANGE
Keep everything from r23-s6 unless it is listed here. **This round changes words, layout and feedback. It changes no rules.** A blocked reason the view needs comes from `sim/` as a reason code. The sim decides the reason, and the view words it. New values go in `src/tune.ts`, each one commented.

### Checkpoint A: one glossary, long-press anything

1. **The glossary** (`src/view/glossary.ts`). It has one entry per term, contact tag, map mark, stat, part state and blocked reason: `{ id, name, line, see? }`.
   - `name` is the exact on-screen label. `line` is one or two plain sentences of 25 words or fewer, in strict mode.
   - **One name per thing.** Where the game uses two names for one thing, pick one and rename the label everywhere. Start from the term list at the end of this brief, and log each rename in ASSUMPTIONS.
   - It covers at least the terms in clusters C05, C09, C10, C18, C22, C31, C34 and C35. That means:
     - the HUD: EMIT, SOUND, IR, ECM, GHOST, CREEP / NORM / SPRINT, AP, EN, the ORDER strip and its '?' slots, 'looks 0/3', MOVE STOPPED
     - contact tags: UNKNOWN · N fit, ESM, ACO, EO, MZL, IN QUIET, ZONE ?, SELECTED, old radar marks
     - parts: COR / LEG / WPN / SNS / BCK, and scratched / bloodied / gone
     - suit states: DOWN and CRITICAL, including what carrying a suit out does
     - the scan: RADAR / THERMAL / EM LISTEN, ALT, RISK, STEP, ship-min, SCAN WINDOW, drop zones, EARS, QUIET
     - jobs and the city: faction job, broker job, HATED / NEUTRAL / LIKED, forks, levers
     - the market and loadout: EM, IR, ACO, POWER, MAST, RWR, and each module's one-line purpose
     - CARD: EMIT low / high, core N, tight lock
     - map marks: sound rings, sensor lines, PAINTED
2. **Long-press anything** (`LONGPRESS_MS`, ~450). A long-press on a button, HUD term, contact, map mark, stat or job-card term opens an explain card. The card shows the glossary name and line.
   - A long-press never fires the button, starts a drag or sets a move.
   - Any tap closes the card. On desktop, right-click does the same as a long-press.
   - The card sits in the same slot as the opened HUD panel (B6), so it doesn't cover what you pressed.
   - Log `[ASK] <id>` for each long-press. The QA panel and Jamie can then see what people needed explained.
3. **A greyed or blocked control explains itself on a normal tap.** The card shows what blocks it and what would unblock it. Example: "No line of sight. Move until the contact is in view."
   - This covers FIRE (FUZZY / LOS / RANGE / SOUND / CAP), ID, ECM when sensors are gone, NORM and SPRINT when a leg is gone, UPLINK RANGE, PICK UP RANGE (C59) and LAUNCH (C63).
   - The reason codes come from `sim/`. This closes fix-list items 1 (C02) and 2 (C08).
4. **GAMEPLAY BASICS reads from the glossary.** Group it by screen (city, scan, loadout, hunt, results). Its first line and the splash both say: "Long-press anything to see what it is." Put BACK at the top as well as the bottom (C43).
5. **Two warnings that the game knows and doesn't show yet:**
   - **Low hits (C12):** when a suit has `WARN_HITS_LEFT` hits or fewer left, its token and its SUITS row show a warning mark. A HUD line says "A: 2 hits left". The DOWN / CRITICAL line says in one sentence what ending a turn next to the suit does.
   - **Last-known contacts (C15):** a contact that drops off the list leaves a faded mark labelled "last seen T<n>". The mark stays for `LASTKNOWN_ROUNDS` rounds. It can't be targeted, and a long-press explains it.

### Checkpoint B: the phone HUD

6. **Compact HUD on short screens** (height ≤ `HUD_COMPACT_H`, ~430 px, so iPhone landscape). The top-left text block shrinks to one line: active suit, AP / EN, and the objective distance, labelled per fix-list item 3, e.g. "CARGO 29t from A".
   - A tap on the line opens the full block as a panel, and the next tap closes it. The explain card uses the same slot.
   - Desktop and iPad keep today's block unless it overruns the screen edge (C03).
7. **Keep the map clear of the overlays (C07).** The button columns and the bottom bar cover part of the map. The camera and pan keep three things in the uncovered area: the active suit, the selected contact and the objective ring. Measure that area from the real overlay rectangles.
8. **De-overlap labels near tokens (C25).** When suit names, SOUND tags, contact tags or PAINTED collide, they stack or move apart. This applies in the hunt and on the after-action map.

### Checkpoint C: the writing pass

9. **Rewrite the rules text on every screen to the house standard.** That covers:
   - HUD lines, and button labels where they are unclear
   - job cards' rules lines and the scan panel
   - CARD headings and key
   - result, WHAT IT COST and THE BOOKS lines, and confirm dialogs Run the vendored linter on the changed strings.
   - **Flavour text keeps its voice** (job INTEL prose, operator lines, the memorial), but it uses the glossary's names.
   - The splash's HISTORY pages were already rewritten in the design lead session. Check them against the final glossary names only.
10. **Tester splash** (`src/view/brief.ts`): this round's TEST page, plus 2–3 tap questions (see DEBRIEF FOCUS). Bump `BUILD`.

### Test bed and tests

11. **Test bed:**
    - **"Read it cold":** one hand-placed hunt turn. It has FIRE blocked by LOS, a suit with a LEG gone and a suit with 2 hits left. It also has a last-known mark and an UNKNOWN contact with an ESM tag. Question: "Could you tell what each thing meant? Could you tell why each greyed button was greyed?"
    - **"Crowded phone":** contacts and the objective near the right edge, on a short screen. Question: "Could you see and tap every contact?"
12. **Vitest:**
    - Every glossary line has 25 words or fewer and no semicolons. No two entries share a name, and no name has two entries.
    - Every reason code that `sim/` can return has a glossary entry.
    - The last-known mark expires after `LASTKNOWN_ROUNDS`. The low-hits warning switches at `WARN_HITS_LEFT`.
    - The safe-area function keeps a point inside the uncovered rect.
    - The R24 fix-list bugs C19 and C23 each have a test.

## NOT IN THIS ROUND
- Weekly wages on a real timescale (#110). It is important, so it gets its own scoping chat next.
- MOVE route preview (C01, #111) and hunt pacing (C11, #112).
- Picture or diagram explainers, a coached first hunt, a tutorial mission.
- Any rule, balance or TUNE change outside the new display knobs. No new content.
- The other QA "later" clusters (#113) and smarter bot tactics (#42).
- Rewriting flavour text into STE.

## DEBRIEF FOCUS
1. **Did the clusters shrink?** Run the QA panel's core preset on the final build, on the same seeds as `r23-core-1008`. Compare the clusters before and after. Look at the jargon, HUD and warning clusters (C03, C05, C07, C09, C10, C12, C15, C18, C22, C25, C31, C34, C35) and the fix-list clusters. Count the `[ASK]` lines: which terms did testers long-press most? Did the judge report "two names" anywhere?
2. **Can Jamie read it cold?** He plays at least 2 hunts on his phone. Ask one tap question: "Did you understand the hunt without needing to ask anyone?" (Yes / Mostly / No / Something else). Then ask the usual weakest-moment question.

## FIX LIST
`claude/signal-lance-r24-fix-list.md` (13 items from the QA triage). Build it alongside the change. Items 1–2 close with A3. Re-check every item, including the r23-s6 ones (C26, C13, C57), in the QA re-run.

## DONE
- Checkpoints A, B and C shipped. Both test-bed scenarios work. The fix list is built.
- Jamie plays at least 2 hunts on his phone and answers the tap question. **No fun test:** the slice fun test runs next, with the tester pool.
- The QA panel runs on the final build (sl-qa, core preset). The report compares it with `r23-core-1008`.
- Save the status report as claude/signal-lance-round24.md.

## Term list (one name per thing, from the HISTORY rewrite)
These are the places where one thing has two or more names, found while rewriting HISTORY. Settle each one in the glossary and rename the on-screen label to match.
1. **mech / ExoS / suit:** the biggest one. HISTORY now says ExoS for the machine. BASICS, the SUITS tab, the SUIT BAY module and STAYS ABOARD still say "suit". Pick one, or define "suit" as the ExoS slot.
2. **ExoS passive sensor:** "EM ears", "passive EM", "EM", "ESM", "passive sensors". HISTORY uses ESM (the contact tag). EM LISTEN stays for the ship's scan sensor only. The old tags EM / VIS / SND / EYE are now EO / RDR / ESM / IR / ACO / MZL / LINK / SHIP.
3. **heat / IR / THERMAL / Thermal optics:** four names for one channel. Give each its role, or merge them.
4. **noise:** it means EMIT + SOUND (R13) and also the NOISE zone. Give it one meaning.
5. **job / contract / offer:** a FACTION JOB or BROKER JOB on the map is a contract offer. Settle which word means what.
6. **intel:** the free scan intel from a LIKED faction, and INTEL, the job-card listing. Two things share one name.
7. **turning point / moment:** HISTORY says turning point. `aar.ts` and BASICS say moment.
8. **NORM / NORMAL:** the button says NORM, while the HUD and HANGAR say NORMAL.
9. **levers / fork setting (lit ✓):** the Escort fork control has two names (ties in with fix-list item 12).
10. **ALARM / LINK:** the old notes say ALARM, but the UI tag reads LINK.
11. **loadout screen / HANGAR:** HISTORY uses HANGAR.
12. **land / drop, "where you land" / drop zone:** HISTORY uses drop and drop zone.
13. **QUIT / BAIL CONTRACT / SAVE & QUIT / EXTRACT:** keep each for its own action. The glossary says which does what.
14. **REPAIR / REPAIR WORST:** the button reads REPAIR WORST.
