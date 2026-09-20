# Tiny Empires v2 ("Civ-Divergence") — work breakdown

Source: the design spec doc "4X Game — Civ-Divergence Design Spec (Claude Code Brief)" (2026-09-20).
Branch: `v2-divergence`. `main` keeps shipping v1 untouched until v2 is playable end to end.

## What the spec replaces, mapped to the codebase

| Spec system | Replaces in v1 | Size of what goes | Status |
| --- | --- | --- | --- |
| Mastery Web (System 1) | 104 techs + 60 civics + Sparks/Insights + 2 mastery tables, tech/civic trees UI, research/civic queues, 30 tech-gated units, 36 tech-gated buildings | data/techs.js, data/mastery.js, ui/tree.js, half of panels.js, research code in game.js | Era 1 content + engine done (side by side, `v2` flag) |
| Narrative Hub (System 2) | 61 policy cards, 10 governments, policy slots UI | game.js civFx, panels.js government tab, leaders' government-linked abilities (4) | Era 1 hubs + engine done; UI to do |
| Era structure (20 of 32) | 8 fixed eras gated by techs | ERAS, era-scaled costs everywhere | Engine counts and advances; Turning Point hub to do |
| City growth (1 tile per pop, Influence-gated, Expansion building) | 7-tile founding, autoExpand, work-tile assignment | game.js foundSettlement/claimTile/autoExpand, citymap.js, AI expansion | DONE (phase 3): centre + first worked tile at founding, 3 free claims, then 10×(n−2) Influence per claim; Boundary Marker (era 0) required from the 4th claim, Growth Hall (era 2) lets claims queue; Influence = 2 + settlements + abilities |
| City Focus slots (3, pop-gated) | 5 Town specializations + City upgrade | game.js specialization, panels | To do (deferred to phase 7 polish; Town specializations still work under v2) |
| Great People from hub payoffs | 7 Great types with points | core/greatpeople.js (113 lines) | To do (spawnNamed hook stubbed) |
| Warbands (3 units per tile, one exchange) | 1 unit per tile, per-unit combat, ZoC | core/units.js movement/attack/ZoC, renderer unit drawing, AI | DONE (phase 4): core/v2/warbands.js; 3 fighters + 1 Commander per tile, one exchange (100/60/40%), weakest dies first, zone of control, Commander +15%/+1 move, Migrant unit, count badge in 2D, fan-out in 3D, AI stacks and builds a Commander |
| Terrain & resources (fewer, richness tiers, category gating) | 26 resources, per-unit strategic gating | data/terrain.js, mapgen, yields, unit requirements, 26 pictures | DONE (phase 5, richness): resource ids kept, every Divergence resource tile is Poor/Normal/Rich (20/60/20), 30% fewer tiles, tier scales yields and a strategic tile supports 1–3 units; pips in 2D/3D and on the tile card |
| Kinfolk (persuasion types, bonds with upkeep) | 49 Free cities with Ties/tiers/Union, Inchibils | core/citystates.js, diplomacy, panels | DONE (phase 5): persuasion per city type (Gifts/Deeds/Faith/Force counts double), Bonds at Patron for Influence upkeep (half yields to the capital, bonus kept), breaking costs -2 Happiness for 20 turns, Unions off under v2 |
| Renown tiers + Migration Pull | Happiness penalty multiplier | game.js happiness, tips | DONE (phase 5, named Moods): Miserable ×0.6 / Unhappy ×0.85 / Content / Happy ×1.1 / Joyful ×1.2 with growth factors, empire mood on the HUD, Migration Pull every 10 turns from Miserable neighbours into Joyful empires |
| Grid | hex (kept) | none | Nothing to do |

## Phases (each ends playable and tested)

1. **Mastery Web + Hubs, Era 1** — engine, Era 1 data, notifications. DONE on the branch: 32 foundation nodes (7/6/7/6/6), 30 branched (8 pairs + 14), 5 hubs, permanent locks, Insight trickle for `cheap` nodes, AI picks branches. Smoke test: tests/v2.js.
   Remaining: trigger tuning (a 120-turn run reaches 20-of-32 by turn 30, far too fast; 23 nodes never fire because their triggers depend on systems not built yet: roads, disasters, ship loss, animal resources), Web panel UI (two lock states shown differently), hub decision dialog, unit unlocks switched from techs to nodes, Turning Point hub.
2. **Cut-over** — new games use v2 only: remove tech/civic research from the turn loop, tree UI, policy slots, governments; leaders' abilities that reference techs/civics/governments (about 12) rewritten; buildings unlocked by nodes; era costs; AI research replaced by "play toward triggers"; save version bump with v1 saves still loading under v1 rules.
3. **City growth** — DONE on the branch (except City Focus slots): first worked tile at founding, +1 claim per pop growth, claims 4+ cost Influence and need a Boundary Marker, a Growth Hall lets more than one claim wait; extra growth becomes specialists. HUD Influence pill, empire and city panel lines, pedia, AI builds the marker early. tests/syntax.js added.
4. **Warbands** — DONE on the branch: up to 3 fighters per tile plus a Commander, one combined exchange (strongest 100%, then 60%, 40%), damage weakest-first with spill-over, zone of control (Pathfinders exempt), Commander +15% strength and +1 move, Migrant (+1 pop elsewhere), Warband line and attack preview on the unit card, move-together toggle, 2D count badge, 3D fan-out, AI gathers next to targets and builds one Commander at 4+ units. tests/warbands.js.
5. **Resources & Kinfolk & Moods** — DONE on the branch (core/v2/society.js): richness tiers on every resource tile with fewer tiles, strategic supply per tier; Kinfolk persuasion and Bonds; five Moods replacing the flat penalty and Migration Pull. Reducing the resource list to 4–5 strategic per era cluster is left for the era content phase. tests/v2phase5.js.
6. **Eras 2–7** — DONE on the branch: data/v2/era2.js…era7.js (Marble, Turret, Easel, Puffstack, Glowbit, Pixel), each 32 foundation + 18 branched nodes, 5 hubs, a Turning Point, joke names for the era's units; every classic unit, building, wonder and national wonder of the era is unlocked by exactly one Spark (33/35 units, 31/38 buildings, 15/20 wonders, 12/12 national; the rest open by era). Ages advance on 20 (first) or 24 foundation Sparks and last at least 35 turns; the last age opens whatever the classic tree still holds. Web panel gets an age selector. tests/v2.js runs 400 turns.
7. **Content and polish** — pictures for new units/buildings (Migrant, Commander, Cookfire, Kiln, Playfield, Expansion buildings), Chibipedia rewrite, tutorial rewrite, tips, 8-language translation of everything new (roughly 1,500 strings), scenarios re-checked.

## Phase 7a: what was reworked for Divergence (abilities, wonders, units, pedia, tips, translations)

Abilities that spoke of technologies, civics or governments now carry a Divergence wording (`descV2`, shown by `G.abilityDesc` in every panel) and an equivalent effect:

| Ability | Classic effect | Divergence equivalent |
| --- | --- | --- |
| Meiji, Pericles | Sparks/Insights add 20% of the cost to research/Heritage | every Spark adds Knowledge/Heritage (20% of a Spark's study cost) |
| Franklin, Henry the Navigator, De Witt | +Gold whenever a technology is learned | +Gold whenever a Spark fires |
| Sejong, Ashurbanipal, Peter | +Heritage whenever a technology is learned / +Knowledge per civic | per Spark / per Insight decision |
| Harun, Hammurabi | first Library/Monument grants a free technology/civic | fires a free foundation Spark |
| Frederick, Sejong, Babylon, China | technologies/civics cost less | studying Sparks costs less |
| Frederick (despot combat), Louis (monarch happiness) | under a government type | always on, at half strength |
| Greece | +1 Happiness per settlement under any government | always on |
| Alexander, Ashurbanipal | capture adds Knowledge to research | capture adds Knowledge to studies |
| Qin, Trung, Afonso | free Walls/Shrine once a technology is known | once the Spark/age allows the building |
| Great Library, Oracle | a free technology/civic | a free foundation Spark |
| Great Scientist | completes the current technology | fires the next foundation Spark of the age |

Chibipedia: the Technologies, Civics, Governments and Policy Cards categories hide in Divergence games; concept entries for Sparks and Insights, Claims and Influence, Warbands, Resource richness, Kinfolk and Bonds, Moods and Migration Pull show only there (classic entries for research, governments, unions and happiness only in classic games). Tips: six Divergence tips (first claims, Warbands, rich resources, Bonds, Moods, a new age); the classic Spark, policy, era, unhappiness and free-city tips stay classic only.

Translations: `web/js/i18n.js` walks the v2 data (Spark names, jokes, trigger texts, hub and branch names, age names, unit joke names, Society tier and persuasion names) and the `descV2` wording; 1,370 new strings translated into the 8 languages (parts `<lang>-v2-*.json`).

Left for the owner: pictures for Uprooters, Bandleader, Scarecrow Crew, Cookfire, Kiln, Playfield, Boundary Marker and Growth Hall (paid generation, needs approval); City Focus slots (spec item deferred); Great People from hub payoffs (`spawnNamed` hook).

## Decisions needed from the owner

1. Keep the 40 empires and 95 leaders? Their abilities are written against v1 systems (techs, policies, governments, Great Person types, city-states). Default: keep them, rewrite the ~20 that reference removed systems.
2. Keep all 8 languages for v2 content from day one, or ship v2 in English first and translate at the end? Default: translate at the end of each phase.
3. Ship v2 as a replacement (v1 saves become legacy) or as a mode next to v1 for a while? Default: replacement at phase 2, v1 saves still loadable.
4. The spec's Era 1 has 33 named Sustenance/… nodes in the tables but asks for exactly 32 (Chase the Goats moved to Branched). Default: a "Goat Path" pasture node fills the seventh Sustenance slot.
5. Insight currency name clashes with v1's "Insight" (civic Sparks). Default: v2 calls the trickle "Insight" and drops the v1 term with the cut-over.

## New units (owner request, after phase 7b)

Renamed: Commander → **Bandleader** (Civ7 has Army Commanders), Migrant → **Uprooters** (Civ7 has Migrants). Ids stay `commander` and `migrant`.

**Scarecrow Crew** (`scarecrow`, Kid Training Spark, cost 30, Str 8, never attacks): bait. To every other empire it renders and reads as a full Warband of the disguise unit (Militia); its attack preview shows a band's strength. When an enemy attacks a tile where the crew stands alone, the crew is spent and every attacker in the exchange loses its remaining movement and attacks and is *shaken*: -4 Strength for 10 turns at bait level 1, -6 for 15 at level 2, -8 for 20 at level 3. Bait levels come from Sparks (`fx.scarecrowLevel`: Tanner's Yard in the Turret Age, Patent Office in the Puffstack Age). With real fighters on the tile the crew is never the target; one crew per tile. Proposed but not built: Curious Kid, Stakers, Drovers, Festival Wagon, Chronicler (see the chat of 2026-09-20).

## After phase 7b: balance of power, Smoke, Climate (owner request)

- Balance of power (shared, classic and Divergence): **Command** (`G.commandMax`, `G.orderCost`, `G.spendOrder`, reset per empire turn; hooks in `U.moveTo`, `U.canAttackTile`, `U.attack`, `U.undoMove`, `U.reachableNow`, `U.needsOrders`; AI sorts units by priority and holds the rest), plus unrest and revolts (`s.unrest`, `G.revoltsTurn`), conquest fatigue, 25/40-turn truces, satiation and cooling towards a runaway. Coalitions, mercy and the runaway war ban were built and then removed at the owner's request (2026-09-20). tests/command.js.
- Smoke: core/v2/smoke.js (sources, sinks, per-settlement net, happiness and heavy effects hooked in `G.settlementYields` and `G.tourism`), Spark effects `smokeSink`, `forestSinkMult`, `smokeGold` on Public Health, Underground Pipes, Garden Suburb, Green Belt, Coal Furnace; haze in both renderers; AI building scores. tests/smoke.js.
- Climate: core/v2/climate.js (`target` by age then by world Smoke, `plan`/`apply` with a 5-turn warning, `g.mapVersion` repaints the 3D ground). tests/climate.js.
