# Playtest Method — Find the Fun First

A repeatable way to prototype and tune game ideas without sinking weeks into systems before knowing if the game is fun. Proven on Signal Lance (Sept 2026): all 5 build steps finished, 7 tuning changes, every one rated "helped."

## Why this exists

The old pattern: plan deeply, build infrastructure (design bibles, catalogues, tests, CI), reach the first playable, find it isn't fun, lose the spark, move on. The problem wasn't the ideas. It was discovering "not fun" only after heavy investment, and not being able to pinpoint *what* felt wrong.

This method fixes both: test the fun cheaply and early, and let the agent lead the diagnosis with multiple-choice symptoms.

## The pillar test

Every toy tests ONE question, written as one sentence before building. Signal Lance's:

> Prepare in depth, deploy under pressure, watch your plan succeed or fall apart, then learn why.

What Jamie's favourite game moments share: struggle → understanding → a plan → watching the plan work under fire. Toys should aim straight at that feeling.

## Toy rules

1. **One question per toy.** It's a scouting mission, not a foundation.
2. **Time box: ~2 weekends.** When it runs out, run the fun test, finished or not.
3. **Write the "done" line before starting,** as a checklist. Hitting it means you can move on guilt-free.
4. **Forbidden list until the fun test passes:** unit tests, CI, data catalogues, save systems, menus, art, sound, design bibles, second maps/enemies, campaigns, progression. Tempting ideas go on a "later" list.
5. **Phone-playable by default:** one self-contained HTML file (vanilla JS + canvas), published as an artifact, touch-first, landscape. No PC needed.
6. **All tuning values in one `TUNE` object** at the top of the file, each commented.
7. **Build in numbered steps, one per message.** The toy is playable after every step. The agent reports in 3 lines max: what works, how to test on a phone, what's rough.

## The debrief protocol (the part that works)

Jamie often can't pinpoint what feels wrong, so the agent leads. After saying "played":

1. **No suggestions yet.** The agent asks ONE question at a time, max 3 per debrief, as multiple choice.
2. **Options describe feelings or symptoms, never solutions,** plus "Something else" and "It felt fine."
   - Good: "The enemy found me… (a) instantly, no chance to hide (b) about right (c) never, I got bored (d) randomly, it felt unfair"
   - Bad: "Should I lower the detection threshold?"
3. **Broad, then narrow.** First question is always "What was the weakest moment of that run?", then drill into the answer.
4. **Own words get reflected back** as a one-sentence symptom and confirmed before acting.
5. **One change per playtest** (two only if tightly linked), proposed in plain words with the TUNE values old → new and what to notice next run. Applied on "go."
6. **Next debrief opens by rating the last change:** helped / made it worse / couldn't tell. "Worse" gets reverted before trying anything new.

## Tweak log

Kept as a comment block at the top of the file:

```
<step/run> | symptom | change (old → new) | result (filled in next debrief)
```

Also keep an ASSUMPTIONS block: anything ambiguous in the spec gets the simplest option, noted there, and the build keeps going.

## Symptom → knob thinking

The agent uses a cheat sheet like this to generate options (it's not shown during the debrief). Adapt it per toy:

- **Found too fast / no way to hide** → detection thresholds, cover, stealth values
- **Nothing happening / bored** → enemy activity, pacing, map size
- **A system feels useless or trivial** → its cost, duration, reliability, how much info it gives
- **Something is always on / never used** → its cost vs benefit, counterplay
- **Deaths feel unfair** → enemy accuracy, warning cues, reaction delays, player durability
- **Too quick / too slow** → damage, health, ammo, timers
- **Choices don't matter** → spread of costs and benefits, slot or resource limits

## The fun test

Run after the done line is hit (aim for ~10 runs). Three or more yeses means the pillar works:

- [ ] Did I say "one more go" without deciding to?
- [ ] Did I try a build or approach I hadn't planned?
- [ ] Did a loss make me want to fix my plan rather than quit?
- [ ] Did I have an "oh, *that's* how it works" moment?
- [ ] Did someone else ask to play again?

If it fails: change one thing and retest. Three failed rounds means this strand isn't the heart, so move on guilt-free.

**"Not fun" is data, not failure.** Log why, then decide: tune, add one linked change, or move to the next toy.

## Lessons from Signal Lance

- Tuning debriefs fixed the *hunt* fast: 7 changes, all helpful.
- The *replay pull* is a different problem. It came from a lack of variability, not from the tuning. When the hunt feels good but you're "done for now," look at what changes between runs, not at the knobs.
- Agents will add scaffolding and features unless the forbidden list is in the prompt. Keep it there, and paste it back when they drift.
- Spec overrides are fine when a debrief earns them. Log them clearly.
