package com.ghirlanda.agesunbroken

import android.annotation.SuppressLint
import android.content.res.Configuration
import android.graphics.Color
import android.os.Bundle
import android.view.View
import android.view.ViewGroup
import android.view.WindowManager
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.webkit.WebChromeClient
import androidx.activity.OnBackPressedCallback
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import androidx.webkit.WebViewAssetLoader

/**
 * Full-screen WebView host for the Ages Unbroken HTML5 game.
 *
 * The game files (ages-unbroken/web) are packaged as app assets and served through
 * [WebViewAssetLoader] on the https://appassets.androidplatform.net origin, so that
 * localStorage, IndexedDB and other origin-bound web APIs behave like on a normal site.
 */
class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private lateinit var assetLoader: WebViewAssetLoader

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        WindowCompat.setDecorFitsSystemWindows(window, false)
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        window.statusBarColor = Color.BLACK
        window.navigationBarColor = Color.BLACK

        assetLoader = WebViewAssetLoader.Builder()
            .setDomain(ASSET_DOMAIN)
            .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(this))
            .addPathHandler("/res/", WebViewAssetLoader.ResourcesPathHandler(this))
            .build()

        webView = WebView(this).apply {
            layoutParams = ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
            )
            setBackgroundColor(Color.BLACK)
            setLayerType(View.LAYER_TYPE_HARDWARE, null)
            isHorizontalScrollBarEnabled = false
            isVerticalScrollBarEnabled = false
            overScrollMode = View.OVER_SCROLL_NEVER
        }
        configureSettings(webView.settings)
        webView.webViewClient = GameWebViewClient(assetLoader)
        // A WebChromeClient is required for JS dialogs (alert/confirm) to be shown at all.
        webView.webChromeClient = WebChromeClient()
        setContentView(webView)

        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                askPageThenMaybeLeave()
            }
        })

        val restored = savedInstanceState?.let { webView.restoreState(it) }
        if (restored == null) {
            // The hosted version updates itself (service worker); the bundled copy is the offline fallback.
            webView.loadUrl(if (REMOTE_URL.isNotEmpty()) REMOTE_URL else START_URL)
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun configureSettings(settings: WebSettings) {
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.databaseEnabled = true
        settings.mediaPlaybackRequiresUserGesture = false
        settings.setSupportZoom(false)
        settings.builtInZoomControls = false
        settings.displayZoomControls = false
        settings.loadWithOverviewMode = true
        settings.useWideViewPort = true
        settings.allowFileAccess = false
        settings.allowContentAccess = false
        settings.cacheMode = WebSettings.LOAD_DEFAULT
        settings.mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
        settings.textZoom = 100
    }

    /**
     * Asks the page whether it handled the back gesture. The page may define
     * `window.__androidBack()` returning `true` when it consumed the event (e.g. closed a
     * dialog). If it returns false/null/undefined, the app is sent to the background.
     */
    private fun askPageThenMaybeLeave() {
        webView.evaluateJavascript(
            "(function(){try{return !!(window.__androidBack && window.__androidBack());}catch(e){return false;}})()"
        ) { result ->
            val handled = result != null && result.trim() == "true"
            if (!handled) {
                if (!moveTaskToBack(true)) {
                    finish()
                }
            }
        }
    }

    private fun hideSystemBars() {
        val controller = WindowInsetsControllerCompat(window, webView)
        controller.systemBarsBehavior =
            WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
        controller.hide(WindowInsetsCompat.Type.systemBars())
    }

    override fun onResume() {
        super.onResume()
        webView.onResume()
        webView.resumeTimers()
        hideSystemBars()
    }

    override fun onPause() {
        webView.pauseTimers()
        webView.onPause()
        super.onPause()
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (hasFocus) hideSystemBars()
    }

    override fun onConfigurationChanged(newConfig: Configuration) {
        // configChanges in the manifest keeps this activity (and the WebView) alive on rotate.
        super.onConfigurationChanged(newConfig)
        hideSystemBars()
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        webView.saveState(outState)
    }

    override fun onDestroy() {
        (webView.parent as? ViewGroup)?.removeView(webView)
        webView.destroy()
        super.onDestroy()
    }

    /** Serves app assets through the asset loader and keeps navigation inside the game. */
    private class GameWebViewClient(private val assetLoader: WebViewAssetLoader) : WebViewClient() {

        override fun shouldInterceptRequest(
            view: WebView,
            request: WebResourceRequest
        ): WebResourceResponse? {
            return assetLoader.shouldInterceptRequest(request.url)
        }

        override fun onReceivedError(view: WebView, request: WebResourceRequest, error: android.webkit.WebResourceError) {
            // hosted version unreachable (offline, first run): use the copy packaged in the app
            if (request.isForMainFrame && request.url.toString().startsWith(REMOTE_URL) && REMOTE_URL.isNotEmpty()) view.loadUrl(START_URL)
        }

        override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
            // Only allow navigation within the packaged game; ignore everything else.
            val host = request.url.host
            return host != ASSET_DOMAIN && !(REMOTE_URL.isNotEmpty() && request.url.toString().startsWith(REMOTE_URL))
        }
    }

    companion object {
        private const val ASSET_DOMAIN = "appassets.androidplatform.net"
        private const val START_URL = "https://$ASSET_DOMAIN/assets/index.html"
        /** Hosted copy of the game (GitHub Pages). Empty string = always use the bundled copy. */
        private const val REMOTE_URL = "https://ghirlanda444.github.io/FableCiv/"
    }
}
