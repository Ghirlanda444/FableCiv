# Ages Unbroken - ProGuard/R8 rules.
# Minification is disabled for now; keep WebView JS interfaces if it is ever enabled.
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
