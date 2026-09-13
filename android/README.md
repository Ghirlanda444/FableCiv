# Ages Unbroken – Android wrapper

A thin Android app that runs the HTML5 game in `../web` inside a full-screen WebView.

## Building locally

Requirements: JDK 17, Android SDK with `platforms;android-34` and `build-tools;34.0.0`
(set `ANDROID_HOME` or create `local.properties` with `sdk.dir=...`).

```sh
cd android
./gradlew assembleDebug
```

The APK lands at `app/build/outputs/apk/debug/app-debug.apk`. Install it with
`adb install -r app/build/outputs/apk/debug/app-debug.apk`.

## How the game is packaged

Nothing is copied. `app/build.gradle.kts` maps the game folder in as the asset
directory:

```kotlin
sourceSets { getByName("main") { assets.srcDirs("../../web") } }
```

At runtime `MainActivity` serves those assets with `WebViewAssetLoader` from
`https://appassets.androidplatform.net/assets/index.html`, so `localStorage` and other
origin-bound APIs work as on a real website. Edit files in `../web`, rebuild, done.

The page may define `window.__androidBack()` and return `true` to consume the Android
back gesture (for example to close an in-game menu); otherwise the app goes to the
background.

## CI

`.github/workflows/android.yml` builds the debug APK on every push that
touches `ages-unbroken/**`, uploads it as the `ages-unbroken-debug-apk` artifact, and on
the default branch (or a manual run) publishes it to the `android-latest`
pre-release.
