---
name: signal-lance-writing
description: "Signal Lance's house writing standard: 80% of the way to ASD-STE100. Use it whenever you write or change any text a player reads (HUD lines, buttons, long-press explanations, GAMEPLAY BASICS, the tester splash and HISTORY, job cards, result and books screens, CARD) and for round briefs, reports and fix lists. Flavour text keeps its voice but uses the glossary's names."
---

# Signal Lance writing standard

Jamie's rule (2026-10-08): the game's concepts are technical. Every player-facing line must say clearly what happens, with no confusion. We write **80% of the way to ASD-STE100** (Simplified Technical English). We take its clarity and skip its stiffness.

The full STE skill is vendored at `.claude/skills/asd-ste100/` (read its `SKILL.md`). Its linter is `.claude/skills/asd-ste100/scripts/ste-lint.py` (stdlib only, read-only). This file says how much of it we apply.

## Where it applies

| Text | Mode |
|---|---|
| Long-press explanations, greyed-button reasons, HUD lines, warnings, error and blocked messages | **Strict:** every structural rule, and one name per thing |
| GAMEPLAY BASICS, tester splash (`TEST`, `HISTORY`, `QUESTIONS`), CARD, job cards' rules lines, result / WHAT IT COST / THE BOOKS lines, scan panel text | **Strict** for rules and numbers. Short labelled facts ("Fee ×1.2.") are fine |
| Flavour: job INTEL prose, operator lines, district and faction colour, the memorial | **Keeps its voice** (grimdark is the point). It must still use the glossary's names for every game term |
| Round briefs, reports, fix lists, the roadmap, NOTES.md | **STE-flavoured:** the sentence rules apply, and vocabulary is relaxed |
| Code comments | Not covered |

## The rules (the 80%)

1. **One name per thing.** Every term, tag, button and stat has one name, and it's the name the UI shows. Never rotate synonyms (EM / EMIT / ESM, bail / quit / extract). A new term goes in the glossary first, and then into the text.
2. **The glossary is the source.** From R24 on, every term, contact tag and blocked reason has one entry in the game's glossary (one name, one plain line). Long-press, BASICS and button reasons read from it. If you add or rename a term, update the glossary in the same commit.
3. **Short sentences:** 20 words or fewer for an instruction, 25 or fewer for a description. Split a long line into short sentences.
4. **Active voice.** Say who acts: "The patrol hears you", not "you are heard".
5. **Simple tenses.** No "has been", "have added". Keep a compound tense only when it carries a hedge or current relevance ("may have seen you").
6. **One instruction per sentence.** List three or more steps.
7. **No semicolons. No phrasal verbs** (spin up, kick off). Use verbs, not nouns made from verbs. No marketing adjectives.
8. **Don't drop words to save space** when it makes a line ambiguous. Keep the subject, the verb and the article.
9. **Keep every fact, number, condition and hedge.** Never add a fact. If a shorter line loses precision, keep the longer one.
10. **Say why, not only what.** A blocked or greyed control says what blocks it and what would unblock it: "No line of sight. Move until the contact is in view."

What we skip from full STE: the ~900-word dictionary lockdown, and the bans on game words and abbreviations the glossary defines (EMIT, ExoS, AP). An abbreviation is fine once the glossary defines it and long-press explains it.

## How to check

1. Pull the changed strings into a text file and run `python3 -I .claude/skills/asd-ste100/scripts/ste-lint.py <file>`. Fix hard violations. Passive-voice and compound-tense hits are advisory.
2. Search the source for each term you touched, and confirm that it has one name everywhere.
3. Read the line as a first-time player with no one to ask. If they would ask "what does that mean?", it needs a glossary entry or a rewrite.
