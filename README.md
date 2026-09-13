# FableCiv — Ages Unbroken

A single-player 4X strategy game for Android (and any modern browser) in the spirit of the
Civilization series: a hybrid that keeps the classic "one civilization from start to finish"
structure and imports the **Town / City settlement system** of the newest generation.

Design pillars:

- **No era resets.** One continuous technology tree (104 techs) and civics tree (60 civics) across
  eight eras, every one with a Eureka or Inspiration that grants 40% of its cost when you meet an
  in-game condition. Nothing is taken away when an era changes.
- **Governments and policy cards.** 10 governments with military, economic, diplomatic and wildcard
  slots; 61 policy cards unlocked by civics.
- **Three kinds of wonders.** 20 world wonders (one per world), 12 national wonders (one per
  civilization, needing several copies of a building) and 16 natural wonders placed by the map.
- **Civilopedia** for every object in the game, and a **3D city view** that shows each settlement
  built from its real buildings.
- **Leaders belong to their civilization.** Caesar can only rule Rome, Victoria only England.
  30 civilizations with 71 leaders (two or three per civilization), each leader with their own
  ability on top of the civilization's permanent ability, unique unit and unique building:
  Rome, Japan, China, America, India, Indonesia, Mongolia, Zulu, Persia, Egypt, Celts, Arabia,
  France, England, Aztec, Inca, Maya, Shawnee, Greece, Germany, Russia, Spain, Ottomans, Korea,
  Vietnam, Ethiopia, Mali, Norway, Babylon, Polynesia.
- **Maps.** Six sizes from Tiny (40×26) to Enormous (128×80, 20 civilizations) and eight map
  types: Continents, Pangaea, Fractal, Archipelago, Islands, Donut, Inland Sea, Terra.
- **Game speeds.** Quick, Standard, Epic and Marathon scale research, production, growth and the
  turn limit.
- **Towns and Cities.** New settlements are Towns: no production queue, production becomes gold,
  buildings are bought. Towns specialize (Farming, Mining, Trade Outpost, Fort, Urban Center) and
  feed your Cities. Pay gold to upgrade a Town into a City with a full production queue.
- **No builders.** Each population point claims and improves one tile you choose.
- Hex map with continents, rivers, 26 resources, 28 buildings, 20 wonders, 27 unit types,
  10 governments, diplomacy (war, peace, attitudes), independent camps, three victory types
  (Domination, Science, Score), fog of war, autosave, touch controls (pan, pinch-zoom, tap).

## Graphics modes

The game ships two renderers, switchable from the in-game menu:

- **3D world** (default): a low-poly Three.js scene. Terrain, hills, mountains, forests, rivers and
  borders are generated from the map; every settlement is drawn as a town whose buildings appear as
  models when they are built (walls ring the city, wonders get their own monument, houses grow with
  population). Zoom in to inspect a city, zoom out for the strategic view. Procedural props can be
  replaced by real models later without touching game code.
- **2D classic**: a painted canvas map, lighter on battery and useful on weak devices.

`web/lib/three.min.js` is a local bundle of Three.js r169 so the app works fully offline.

## Layout

```
web/        the game: plain HTML5 + Canvas + JavaScript, no build step
android/    Android Studio / Gradle project wrapping web/ in a full-screen WebView
tests/      headless engine simulation (Node) and Playwright UI smoke tests
```

## Play in a browser

Open `web/index.html` directly, or serve the folder (`npx http-server web`).

## Android APK

Every push runs the GitHub Actions workflow `.github/workflows/android.yml`, which builds
`app-debug.apk`, uploads it as the `ages-unbroken-debug-apk` artifact and publishes it on the
`android-latest` pre-release.
To build locally you need the Android SDK (API 34):

```
cd android && ./gradlew assembleDebug
# -> app/build/outputs/apk/debug/app-debug.apk
```

## Tests

```
node tests/sim.js 150 12345 small     # AI-vs-AI simulation, prints empire stats per 20 turns
node tests/e2e.js                      # Playwright: plays the first 30 turns through the UI
node tests/e2e-long.js 200             # Playwright: AI plays the human seat for 200 turns, re-rendering every panel
```
