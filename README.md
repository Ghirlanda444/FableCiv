# FableCiv — Ages Unbroken

A single-player 4X strategy game for Android (and any modern browser) in the spirit of the
Civilization series: a hybrid that keeps the classic "one civilization from start to finish"
structure and imports the **Town / City settlement system** of the newest generation.

Design pillars:

- **No era resets.** One continuous technology tree (54 techs) and civics tree (33 civics) across
  seven eras. Nothing is taken away when an era changes.
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
