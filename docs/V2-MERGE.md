# Divergence (v2) — merge checklist and release note

Branch `v2-divergence` carries the whole Divergence rule set next to the classic rules. Nothing changes for classic players: every v2 path is gated on `g.v2`, classic saves load as before, and the classic test suite (`tests/sim.js`, `tests/e2e.js`, `tests/turnfixes.js`, `tests/uniques.js`, `tests/mastery.js`) passes unchanged.

## How a player picks it
Title → New game → **Rules**: *Classic* (default) or *Divergence (beta)*. The choice is remembered in the device settings. Scenarios use the classic rules.

## What Divergence changes (release note)
- **No research.** Sparks 💡 fire from what the empire does. Seven ages (Pebble, Marble, Turret, Easel, Puffstack, Glowbit, Pixel), each with 32 foundation and 18 branched Sparks; 20 (first age) or 24 foundation Sparks open a Turning Point into the next age, and an age lasts at least 35 turns. Paired Sparks lock their twin for good. A few cheap Sparks can be studied with Knowledge.
- **Insights 🔮** replace civics, governments and policy cards: one-time decisions that become permanent traits.
- **Claims and Influence 🎯.** A settlement starts with its centre and one worked tile and claims one tile per growth; the first three are free, then each costs Influence and needs a Boundary Marker (a Growth Hall lets claims queue). Migrants carry population between settlements.
- **Warbands.** Up to three fighters plus a Commander share a tile and fight as one exchange (100/60/40%), damage lands on the weakest first, zones of control stop movement next to enemies.
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

## Known gaps (not blocking the merge)
- City Focus slots (spec item) are not built; Town specializations still work under Divergence.
- Great People from Insight payoffs (`spawnNamed` hook) are not built; Great People still come from points.
- No pictures yet for Migrant, Commander, Cookfire, Kiln, Playfield, Boundary Marker and Growth Hall (the game draws its fallback glyphs). Generating them is a paid art run: the owner decides.
- The `cookfire`, `kiln` and `playfield` improvements named by Era 1 Sparks do not exist as improvements yet (the Sparks still give their yields).

## Merge steps
1. Merge the pull request of `v2-divergence` into `main` (a merge commit; the branch history is linear on top of main).
2. The Pages deploy, the Android APK and the Windows build run from `main` as usual; players get the "New version ready" banner.
3. Smoke-check on the phone: New game → Rules: Divergence → found the capital → the 🔬 box shows `0/32 💡`.

## Roll back
Revert the merge commit on `main` (`git revert -m 1 <merge sha>`), or set Rules to Classic: every v2 system is inert for classic games, so a rollback is only needed if the classic path regresses.
