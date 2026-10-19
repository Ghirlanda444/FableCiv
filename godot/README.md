# Tiny Empires: Godot test build

A vertical slice of Tiny Empires in Godot, in a hand-painted cartoon style: the web game's rules engine (`web/js`, unchanged) drives a 3D hex world: a sculpted, shader-textured landscape with animated water, forests, cinematic lighting (FX button toggles ambient occlusion), plus borders, settlements and units. Units, buildings, wonders and palaces are the web game's own painted pictures (copied in by `tools/godot/bundle.js`), shown as standees with unique-unit and culture-specific versions; without them the game falls back to simple code-built pieces (`--no-art` forces it). Every empire is AI-run; press **End Turn** (or Space) or **Auto** to watch the game play out. The web game is not affected by anything in this folder.

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
- `shaders.js`: the painted terrain shader (brush strokes, warm and cool patches, painted rock and snow, beaches, flowers, soft hex grid), soft cel lighting, wind-swayed nature, and cartoon water (turquoise to deep blue, crisp shoreline foam rings, sparkles).
- `props.js`: chunky round trees, soft pines, palms, bushes, grass tufts, rocks and reeds built in code and instanced across the map (half density on phones).
- `sprites.js`: which painted picture each unit and building shows (unique-unit art, then the culture's version, then the shared picture) and where it stands; cities show their palace or hall and every building they have built, wonders on the outer ring.
- `geo.js`: per-turn borders (Civ-style fading bands), settlements and units, draped on the terrain.
- `export_presets.cfg`: Windows and Android presets; the CI fills in the GodotJS export templates.
