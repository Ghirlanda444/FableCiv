plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "com.ghirlanda.agesunbroken"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.ghirlanda.tinyempires"
        minSdk = 26
        targetSdk = 34
        // versionCode counts the commits on main (set by the workflow); versionName is the game version
        versionCode = (System.getenv("APP_VERSION_CODE") ?: "1").toInt()
        versionName = System.getenv("APP_VERSION_NAME") ?: "0.3.0"
        buildConfigField("boolean", "REMOTE_FIRST", System.getenv("APP_REMOTE_FIRST") ?: "true")
    }

    sourceSets {
        getByName("main") {
            // The HTML5 game (web) is mapped in directly as the
            // asset directory, so nothing is copied and there is a single source of truth.
            assets.srcDirs("../../web")
        }
    }

    // Store signing: the keystore comes from the environment (see .github/workflows/android-release.yml); without it the release build stays unsigned.
    signingConfigs {
        create("release") {
            val ksPath = System.getenv("ANDROID_KEYSTORE_PATH")
            if (ksPath != null && File(ksPath).exists()) {
                storeFile = File(ksPath)
                storePassword = System.getenv("ANDROID_KEYSTORE_PASSWORD")
                keyAlias = System.getenv("ANDROID_KEY_ALIAS")
                keyPassword = System.getenv("ANDROID_KEY_PASSWORD")
            }
        }
    }
    buildFeatures { buildConfig = true }

    buildTypes {
        getByName("release") {
            if (System.getenv("ANDROID_KEYSTORE_PATH") != null) signingConfig = signingConfigs.getByName("release")
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.appcompat:appcompat:1.7.0")
    implementation("androidx.webkit:webkit:1.11.0")
    implementation("androidx.activity:activity-ktx:1.9.0")
}
