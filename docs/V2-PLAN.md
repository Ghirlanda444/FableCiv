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
| Terrain & resources (fewer, richness tiers, category gating) | 26 resources, per-unit strategic gating | data/terrain.js, mapgen, yields, unit requirements, 26 pictures | To do |
| Kinfolk (persuasion types, bonds with upkeep) | 49 Free cities with Ties/tiers/Union, Inchibils | core/citystates.js, diplomacy, panels | To do |
| Renown tiers + Migration Pull | Happiness penalty multiplier | game.js happiness, tips | To do |
| Grid | hex (kept) | none | Nothing to do |

## Phases (each ends playable and tested)

1. **Mastery Web + Hubs, Era 1** — engine, Era 1 data, notifications. DONE on the branch: 32 foundation nodes (7/6/7/6/6), 30 branched (8 pairs + 14), 5 hubs, permanent locks, Insight trickle for `cheap` nodes, AI picks branches. Smoke test: tests/v2.js.
   Remaining: trigger tuning (a 120-turn run reaches 20-of-32 by turn 30, far too fast; 23 nodes never fire because their triggers depend on systems not built yet: roads, disasters, ship loss, animal resources), Web panel UI (two lock states shown differently), hub decision dialog, unit unlocks switched from techs to nodes, Turning Point hub.
2. **Cut-over** — new games use v2 only: remove tech/civic research from the turn loop, tree UI, policy slots, governments; leaders' abilities that reference techs/civics/governments (about 12) rewritten; buildings unlocked by nodes; era costs; AI research replaced by "play toward triggers"; save version bump with v1 saves still loading under v1 rules.
3. **City growth** — DONE on the branch (except City Focus slots): first worked tile at founding, +1 claim per pop growth, claims 4+ cost Influence and need a Boundary Marker, a Growth Hall lets more than one claim wait; extra growth becomes specialists. HUD Influence pill, empire and city panel lines, pedia, AI builds the marker early. tests/syntax.js added.
4. **Warbands** — DONE on the branch: up to 3 fighters per tile plus a Commander, one combined exchange (strongest 100%, then 60%, 40%), damage weakest-first with spill-over, zone of control (Pathfinders exempt), Commander +15% strength and +1 move, Migrant (+1 pop elsewhere), Warband line and attack preview on the unit card, move-together toggle, 2D count badge, 3D fan-out, AI gathers next to targets and builds one Commander at 4+ units. tests/warbands.js.
5. **Resources & Kinfolk & Renown** — 4–5 strategic resources per era-cluster with richness tiers, luxury variety by tier, fewer resource tiles; Kinfolk persuasion types and bonds with upkeep; Renown tiers and Migration Pull.
6. **Eras 2–7** — 6 × (50 nodes + 5 hubs + 10 units) generated to the Era 1 template, then balance.
7. **Content and polish** — pictures for new units/buildings (Migrant, Commander, Cookfire, Kiln, Playfield, Expansion buildings), Chibipedia rewrite, tutorial rewrite, tips, 8-language translation of everything new (roughly 1,500 strings), scenarios re-checked.

## Decisions needed from the owner

1. Keep the 40 empires and 95 leaders? Their abilities are written against v1 systems (techs, policies, governments, Great Person types, city-states). Default: keep them, rewrite the ~20 that reference removed systems.
2. Keep all 8 languages for v2 content from day one, or ship v2 in English first and translate at the end? Default: translate at the end of each phase.
3. Ship v2 as a replacement (v1 saves become legacy) or as a mode next to v1 for a while? Default: replacement at phase 2, v1 saves still loadable.
4. The spec's Era 1 has 33 named Sustenance/… nodes in the tables but asks for exactly 32 (Chase the Goats moved to Branched). Default: a "Goat Path" pasture node fills the seventh Sustenance slot.
5. Insight currency name clashes with v1's "Insight" (civic Sparks). Default: v2 calls the trickle "Insight" and drops the v1 term with the cut-over.
