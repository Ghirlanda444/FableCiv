# Divergence (v2) — merge checklist and release note

Branch `v2-divergence` carries the whole Divergence rule set next to the classic rules. Nothing changes for classic players: every v2 path is gated on `g.v2`, classic saves load as before, and the classic test suite (`tests/sim.js`, `tests/e2e.js`, `tests/turnfixes.js`, `tests/uniques.js`, `tests/mastery.js`) passes unchanged.

## How a player picks it
Title → New game → **Rules**: *Classic* (default) or *Divergence (beta)*. The choice is remembered in the device settings. Scenarios use the classic rules.

## What Divergence changes (release note)
- **No research.** Sparks 💡 fire from what the empire does. Seven ages (Pebble, Marble, Turret, Easel, Puffstack, Glowbit, Pixel), each with 32 foundation and 18 branched Sparks; 20 (first age) or 24 foundation Sparks open a Turning Point into the next age, and an age lasts at least 35 turns. Paired Sparks lock their twin for good. Knowledge 📚 can study any Spark of the current age instead of waiting for it: cheap ones 30, foundation 60, branch 90, times 1 + half the age, and each study in the same age makes the next 15% dearer (an accelerator, never a replacement for doing things). The AI studies foundation Sparks of its age first.
- **Insights 🔮** replace civics, governments and policy cards: one-time decisions that become permanent traits. Heritage 🎭 (Culture) piles up: every 8 Heritage a turn adds 1 Influence, and once per age it pays for a **Reform** (120 × (1 + 0.75 × age)) that takes back one decided Insight and picks its other branch (Turning Points excepted).
- **Claims and Influence 🎯.** A settlement starts with its centre and one worked tile and claims one tile per growth; the first three are free, then each costs Influence and needs a Boundary Marker (a Growth Hall lets claims queue). Uprooters carry population between settlements.
- **Rivers.** A river settlement has an easy start: its river tiles are claimed free of Influence and Boundary Markers (when a claim is blocked only river tiles light up), it grows 20% cheaper until 8 population, the river soaks up 1 Smoke, and orders to units on your own river tiles cost 1 Command however far they stand.
- **Warbands.** Up to three fighters plus a Bandleader share a tile and fight as one exchange (100/60/40%), damage lands on the weakest first, zones of control stop movement next to enemies.
- **New units.** Bandleader (leads a Warband), Uprooters (carry a citizen between settlements) and the Scarecrow Crew: bait that every other empire sees as a full Warband; whoever attacks it loses the rest of the turn and fights 4/6/8 Strength weaker for 10/15/20 turns depending on the crew's bait level (raised by the Tanner's Yard and Patent Office Sparks).
- **Smoke (pollution).** Industry makes Smoke per settlement (Workshop +1, Ironworks +2, Factory +3, Power Plant +4, Railway +1, worked Mines and Quarries +0.5, crowds from the Puffstack Age on), woods and civic works soak it up (woods 0.5 each, Aqueduct 1, Hospital 1, Sewer 2, National Park 3, Sparks). Net Smoke costs 1 Happiness per 3 (at most 4); at 6 the settlement is heavy: farms and pastures lose 1 Food and its Fame is halved. Haze shows on both maps; the AI builds sinks when smoky.
- **Climate shifts.** World warmth follows the ages (warm Turret Age, cold Easel Age) and then the world's Smoke (mild under 12, warm under 30, hot above). A shift is announced five turns ahead and converts at most 3% of the land at biome borders: tundra thaws, snow becomes tundra, or the reverse; a hot world dries plains next to deserts and drowns a few flat unowned shores. Settlements, wonders and tiles with units never change.
- **Richness.** Fewer resource tiles, each Poor/Normal/Rich; a strategic tile supports 1–3 units.
- **Kinfolk.** Each free city listens to one persuasion that counts double; a Bond (Influence upkeep) replaces the Union.
- **Moods.** Five moods from Miserable to Joyful scale yields and growth; Migration Pull moves families from Miserable neighbours into Joyful empires every ten turns.
- Abilities, wonders and the Great Scientist that spoke of technologies or civics have Divergence wording and equivalents (see docs/V2-PLAN.md). Chibipedia, tips and all 8 languages cover the new rules.

## Pacing (three 400-turn AI runs, small map, prince)
| Age | Median entry turn | Range |
| --- | --- | --- |
| Marble (1) | 64 | 54–85 |
| Turret (2) | 113 | 105–132 |
| Easel (3) | 167 | 156–194 |
| Puffstack (4) | 215 | 207–234 |
| Glowbit (5) | 266 | 258–273 |
| Pixel (6) | 317 | 309–324 |

## Balance of power (both rule sets): Command
Four 300-turn AI games showed one empire swallowing the map. The structural answer is **Command**, an order budget in the spirit of Old World's orders: every turn an empire can order 5 units, plus 1 per settlement, plus command buildings (Palace 3, Barracks 1, Castle 1, Military Academy 2, Telegraph Office 2, Railway Station 1, Airport 2, Grand Arsenal 2), minus bureaucracy beyond eight settlements (1 per 3) and minus 1 per settlement in unrest. A unit's first move or attack of the turn spends 1 Command, 2 when it is more than 5 tiles from any settlement of the empire, 3 beyond 10. A Warband strikes on one order; an undone move refunds it; units out of Command can only fortify, skip or sleep. The AI gives its orders to settlers and units near enemies first and holds the rest. The 🎖️ pill on the top bar shows orders left; the unit card shows each unit's cost. Sparks raise it under Divergence (Big Chief, War College, The Wire).

Around it, the realistic frictions stay: a captured settlement suffers 10+ turns of unrest (half yields, -3 Happiness) and while unrest lasts an unhappy conquest far from its new capital can rise up and return to its living owner; each capture adds war weariness; a truce holds 25 turns (40 after a war that took settlements); an attacker that took two settlements accepts peace; a very large empire is trusted less (-1 attitude a turn from every leader) and its player is warned once. There are no coalitions, no spared last settlements and no war ban: a big empire is beaten by its own reach, not by scripted alliances.

Result over four 300-turn AI games: survivors 3–4 of 5 (from 1–2), and the two largest empires end close in size (17 vs 18, 16 vs 12, 15 vs 19, 10 vs 15 settlements) instead of one empire with 30–38.

## Known gaps (not blocking the merge)
- City Focus slots (spec item) are not built; Town specializations still work under Divergence.
- Great People from Insight payoffs (`spawnNamed` hook) are not built; Great People still come from points.
- No pictures yet for Uprooters, Bandleader, Scarecrow Crew, Cookfire, Kiln, Playfield, Boundary Marker and Growth Hall (the game draws its fallback glyphs). Generating them is a paid art run: the owner decides.
- The `cookfire`, `kiln` and `playfield` improvements named by Era 1 Sparks do not exist as improvements yet (the Sparks still give their yields).

## Merge steps
1. Merge the pull request of `v2-divergence` into `main` (a merge commit; the branch history is linear on top of main).
2. The Pages deploy, the Android APK and the Windows build run from `main` as usual; players get the "New version ready" banner.
3. Smoke-check on the phone: New game → Rules: Divergence → found the capital → the 🔬 box shows `0/32 💡`.

## Roll back
Revert the merge commit on `main` (`git revert -m 1 <merge sha>`), or set Rules to Classic: every v2 system is inert for classic games, so a rollback is only needed if the classic path regresses.
