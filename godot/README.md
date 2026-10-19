# Tiny Empires: Godot test build

A vertical slice of Tiny Empires in Godot, in a hand-painted cartoon style: the web game's rules engine (`web/js`, unchanged) drives a 3D hex world: a sculpted, shader-textured landscape with animated water, forests, cinematic lighting (FX button toggles ambient occlusion), plus borders, settlements and units. The art is KayKit's CC0 Medieval Hexagon and Adventurers packs (see CREDITS.md), recoloured per terrain and per civ; if the models are missing the game falls back to a code-generated look (`--procedural` forces it). Every empire is AI-run; press **End Turn** (or Space) or **Auto** to watch the game play out. The web game is not affected by anything in this folder.

## Downloads

Every push that touches `godot/` builds a Windows exe and an Android APK on GitHub Actions and publishes them as the **godot-latest** pre-release.

## Opening it in the editor

1. Install the **GodotJS** editor, not plain Godot: release `v1.1.0.beta1-4.6.1` of github.com/godotjs/GodotJS, file `windows-editor-4.6.1-v8.zip` (Godot 4.6.1 with JavaScript support).
2. Run `node tools/godot/bundle.js` from the repo root. It packs the rules engine into `godot/engine/au_bundle.js` (regenerate it after engine changes).
3. Open `godot/project.godot` in that editor and press Play.

`node tools/godot/test-geo.js` checks the map geometry without Godot.

## Files

- `main.js`: the scene: camera, light, sky, HUD, input (mouse, keyboard, touch) and the turn loop.
- `terrain.js`: the sculpted landscape in a hand-painted cartoon palette (the default look; `--look=tiles` shows the KayKit hex tiles instead): per-tile height, colour and material targets blended across hex corners and edges into one continuous, crack-free surface, plus noise for rolling ground, hills and mountain ridges; also prop scattering and rivers. Same layout as the web game (pointy-top, odd-r).
- `shaders.js`: the painted terrain shader (brush strokes, warm and cool patches, painted rock and snow, beaches, flowers, soft hex grid), soft cel lighting, wind-swayed nature, and cartoon water (turquoise to deep blue, crisp shoreline foam rings, sparkles).
- `props.js`: chunky round trees, soft pines, palms, bushes, grass tufts, rocks and reeds built in code and instanced across the map (half density on phones).
- `kaykit.js` / `art.js`: which KayKit model goes on each tile (terrain recolours, river pieces matched to the engine's rivers, hills, mountains, forests, grain on worked land), settlements in the owner's colour, and units as animated chibi characters with capes in the owner's colour. Naval and air units have no art yet and stay placeholders.
- `assets/kaykit/`: the models (CC0) and their licences.
- `geo.js`: per-turn borders (Civ-style fading bands), settlements and units, draped on the terrain.
- `export_presets.cfg`: Windows and Android presets; the CI fills in the GodotJS export templates.
