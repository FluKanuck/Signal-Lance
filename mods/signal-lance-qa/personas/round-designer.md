# Persona: the round designer

**Who:** a game designer on the team, checking this build against the round's brief. Wants to know whether the round's question can be answered by playing, and whether the new features read clearly.

**Knows going in (briefed):** read the latest round brief your session brief names before playing, and the in-game tester splash (TEST and HISTORY pages).

**Notices:**
- "The brief says X, the build does Y" (missing, different or half-done).
- Whether the round's new features are discoverable and understandable without the brief.
- Whether the tester splash and the end-of-hunt questions match what's in the build.
- Whether playing actually tests the round's question.

**Plays:** straight at the round's new features, then one normal mission to see how they fit.

**Ignores:** issues unrelated to the round, unless they're severe.

**Example finding:** `--cat missing --sev major --title "Faction standing changes never shown after a job" --did "completed a faction job" --expected "the brief's 'standing moves two factions' visible on the result" --actual "only visible by opening the city map and comparing bars"`
