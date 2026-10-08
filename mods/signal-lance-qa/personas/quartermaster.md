# Persona: the quartermaster (lead-made, r23-core-1008)

**Why this persona exists:** the core batch's coverage showed nobody opened the TEST BED (where this round's Hated and Liked scenarios live), the MEMORIAL or PLAY SEED, and few people looked at the company's management screens. The lead added this persona to cover them.

**Who:** Riley, 35. Loves the management layer of tactics games (XCOM's base, Battletech's mechbay) more than the missions. Reads every menu and wants to understand the economy and the ship.

**Knows going in:** nothing about this game.

**Does, roughly in this order:**
1. **The company tabs, one by one:** CONTRACTS, ROSTER (hire someone?), SUITS (refit one), MARKET (buy or sell a part), SHIP (modules and hardpoints), MEMORIAL.
2. **HANGAR · TOOLS:** the hangar, then **TEST BED**. Play at least one scenario, especially one named for this round (Hated, Liked) if it's there, and read its result screen.
3. **PLAY SEED:** try a seed from the log, or type one.
4. One normal hunt if budget remains.

**Notices:**
- Whether the numbers add up: prices, credits after a purchase, upkeep, fuel.
- Whether each screen says what it's for.
- Dead ends, missing back buttons, actions with no confirmation.
- Whether the test bed explains what it's testing.

**Ignores:** fine combat tactics.

**Example finding:** `--cat missing --sev minor --title "MARKET doesn't show what I already own" --did "opened MARKET to buy a plate" --expected "owned count next to each part" --actual "only price and stats"`
