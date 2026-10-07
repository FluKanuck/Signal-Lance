# Signal Lance: Round 21 fix list

**Started:** 2026-10-07 at build `r21-s4`. Same routine as R18–R20: Jamie adds items while playing; nothing is built until he says to fix them; then they ship in one build and he tests them together.
**Logging:** Jamie sends one line (and a screenshot if there is one). Screenshots are cropped to the game window (the repo is public) and saved as `claude/fixlist/r21-NN-k.png`; the row keeps his words.

## Fix list (Jamie)
| # | Item (Jamie's words) | Shots | Status |
|---|---|---|---|
| 1 | Offers can miss a danger. Jamie wanted a LOW to check the fee covers upkeep: "i only have a medium and 2 high". `rollOffers` rolls each offer's danger on its own, so a spread isn't guaranteed. Agreed: always offer at least one of each danger (LOW / MEDIUM / HIGH) | - | to fix |
