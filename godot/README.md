# Tiny Empires: Godot test build

A vertical slice of Tiny Empires in Godot, in a hand-painted cartoon style: the web game's rules engine (`web/js`, unchanged) drives a 3D hex world: a sculpted, shader-textured landscape with animated water, forests, cinematic lighting (FX button toggles ambient occlusion), plus a hex grid (Grid button), borders, settlements and units. Settlements are shown Civilization III style: one small 3D town per settlement in its culture's architecture that grows in steps with population (village, small city, city, large city, metropolis), with ramparts once walls are built. Tap a settlement for its city menu; **Show city** zooms in and shows its buildings. Units, buildings, wonders and palaces are the web game's own painted pictures (copied in by `tools/godot/bundle.js`), shown as standees with unique-unit and culture-specific versions; without them the game falls back to simple code-built pieces (`--no-art` forces it). Every empire is AI-run; press **End Turn** (or Space) or **Auto** to watch the game play out. The web game is not affected by anything in this folder.

## Downloads

Every push that touches `godot/` builds a Windows exe and an Android APK on GitHub Actions and publishes them as the **godot-latest** pre-release.

## Opening it in the editor

1. Install the **GodotJS** editor, not plain Godot: release `v1.1.0.beta1-4.6.1` of github.com/godotjs/GodotJS, file `windows-editor-4.6.1-v8.zip` (Godot 4.6.1 with JavaScript support).
2. Run `node tools/godot/bundle.js` from the repo root. It packs the rules engine into `godot/engine/au_bundle.js` and copies the painted pictures into `godot/art` (run it again after engine or art changes).
3. Open `godot/project.godot` in that editor and press Play.

`node tools/godot/test-geo.js` checks the map geometry without Godot.

## Files

- `main.js`: the scene: camera, light, sky, HUD, input (mouse, keyboard, touch) and the turn loop.
- `terrain.js`: the sculpted landscape in a hand-painted cartoon palette: per-tile height, colour and material targets blended across hex corners and edges into one continuous, crack-free surface, plus noise for rolling ground, hills and mountain ridges; also prop scattering and rivers. Same layout as the web game (pointy-top, odd-r).
- `shaders.js`: the painted terrain shader (brush strokes, warm and cool patches, painted rock and snow, beaches, flowers, crisp hex grid on land and sea), soft cel lighting, wind-swayed nature, and cartoon water (turquoise to deep blue, crisp shoreline foam rings, sparkles).
- `props.js`: chunky round trees, soft pines, palms, bushes, grass tufts, rocks and reeds built in code and instanced across the map (half density on phones).
- `city.js`: the settlement models: houses and a central landmark in the culture's style (`AU.PALACE_STYLES`), one fixed layout per size tier, a flag in the owner's colour, ramparts for walls and castles.
- `models/`: 3D models made in Blender from code by `tools/blender/models.py` (resource animals, fields, plants, ores and sea life; trees). Units come from `tools/blender/units.py`: every unit type (`unit_<type>`), a version per culture for the 18 types the painted art varies (`unit_<type>_<culture>`, from culture kits: skin, hair, helmets, hats, shields, swords, cloth) and every civilization's unique unit (`unit_<unique>`); the game picks them in the painted art's order. Settlements (three houses per culture, a landmark for each city size, walls, towers and gate) come from `tools/blender/buildings.py`, coloured in game by the culture's palette; through the owner's eras the houses become stone town houses (Medieval–Renaissance), brick terraces, tenements and factories (Industrial), then flats, glass offices and towers crowned in the culture's style (Modern on), around the same landmark. Rebuild with `pip install bpy` then `python tools/blender/models.py`, `units.py` and `buildings.py`. The Units button switches between 3D and painted units.
- `dressing.js`: resource scenery, Civ 6 style: grazing horses, cattle, sheep, deer and elephants, wheat fields, rice paddies, vineyards and plantations, ore outcrops, gem crystals, quarried stone, salt, oil, fish, crabs, whales and pearls spread over each resource tile (the icon is the painted resource picture on a round badge).
- `sprites.js`: which painted picture each unit and building shows (unique-unit art, then the culture's version, then the shared picture) and where it stands; the Show city view puts the palace or hall in the middle and every building around it, wonders on the outer ring.
- `geo.js`: per-turn borders (Civ-style fading bands) and unit bases, draped on the terrain.
- `export_presets.cfg`: Windows and Android presets; the CI fills in the GodotJS export templates.
