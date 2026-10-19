# Tiny Empires: Godot test build

A vertical slice of Tiny Empires in Godot: the web game's rules engine (`web/js`, unchanged) drives a 3D hex world: a sculpted, shader-textured landscape with animated water, forests, cinematic lighting and a tilt-shift focus effect (FX button), plus borders, settlements and units. No art assets: everything is generated in code. Every empire is AI-run; press **End Turn** (or Space) or **Auto** to watch the game play out. The web game is not affected by anything in this folder.

## Downloads

Every push that touches `godot/` builds a Windows exe and an Android APK on GitHub Actions and publishes them as the **godot-latest** pre-release.

## Opening it in the editor

1. Install the **GodotJS** editor, not plain Godot: release `v1.1.0.beta1-4.6.1` of github.com/godotjs/GodotJS, file `windows-editor-4.6.1-v8.zip` (Godot 4.6.1 with JavaScript support).
2. Run `node tools/godot/bundle.js` from the repo root. It packs the rules engine into `godot/engine/au_bundle.js` (regenerate it after engine changes).
3. Open `godot/project.godot` in that editor and press Play.

`node tools/godot/test-geo.js` checks the map geometry without Godot.

## Files

- `main.js`: the scene: camera, light, sky, HUD, input (mouse, keyboard, touch) and the turn loop.
- `terrain.js`: the sculpted landscape: per-tile height, colour and material targets blended across hex corners and edges into one continuous, crack-free surface, plus noise for rolling ground, hills and mountain ridges; also prop scattering and rivers. Same layout as the web game (pointy-top, odd-r).
- `shaders.js`: the terrain shader (procedural detail, rock on slopes, snow, beaches, dune ripples, surface bump, hex grid) and the water shader (depth colour, shoreline foam, ripples, sun glints).
- `props.js`: low-poly trees, rocks and reeds built in code and instanced across the map.
- `geo.js`: per-turn borders (Civ-style fading bands), settlements and units, draped on the terrain.
- `export_presets.cfg`: Windows and Android presets; the CI fills in the GodotJS export templates.
