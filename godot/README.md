# Tiny Empires: Godot test build

A vertical slice of Tiny Empires in Godot: the web game's rules engine (`web/js`, unchanged) drives a 3D hex world with lighting, borders, settlements and units. Every empire is AI-run; press **End Turn** (or Space) or **Auto** to watch the game play out. The web game is not affected by anything in this folder.

## Downloads

Every push that touches `godot/` builds a Windows exe and an Android APK on GitHub Actions and publishes them as the **godot-latest** pre-release.

## Opening it in the editor

1. Install the **GodotJS** editor, not plain Godot: release `v1.1.0.beta1-4.6.1` of github.com/godotjs/GodotJS, file `windows-editor-4.6.1-v8.zip` (Godot 4.6.1 with JavaScript support).
2. Run `node tools/godot/bundle.js` from the repo root. It packs the rules engine into `godot/engine/au_bundle.js` (regenerate it after engine changes).
3. Open `godot/project.godot` in that editor and press Play.

`node tools/godot/test-geo.js` checks the map geometry without Godot.

## Files

- `main.js`: the scene: camera, light, sky, HUD, input (mouse, keyboard, touch) and the turn loop.
- `geo.js`: plain-JS geometry (hex terrain, borders, settlement and unit pieces), shared layout with the web game (pointy-top, odd-r).
- `export_presets.cfg`: Windows and Android presets; the CI fills in the GodotJS export templates.
