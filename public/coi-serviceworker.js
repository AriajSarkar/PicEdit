/**
 * PicEdit — Cross-Origin Isolation Service Worker
 *
 * Enables SharedArrayBuffer for WASM threads by injecting COEP/COOP headers
 * on navigation responses ONLY. Sub-resource requests (model downloads, CDN
 * assets, images) pass through untouched to avoid:
 *   - Blocking CDN resources lacking Cross-Origin-Resource-Policy
 *   - Re-streaming large model files through the SW (adds latency)
 *   - Breaking third-party fetch requests
 *
 * Uses "credentialless" COEP mode for broader CDN compatibility.
 *
 * Based on coi-serviceworker v0.1.7 — Guido Zuidhof, MIT license.
 */

if (typeof window === "undefined") {
  // ── Service Worker scope ──────────────────────────────────────

  const COEP = "credentialless"; // "credentialless" is more permissive than "require-corp"

  self.addEventListener("install", () => self.skipWaiting());

  self.addEventListener("activate", (event) => {
    event.waitUntil(self.clients.claim());
  });

  self.addEventListener("message", (ev) => {
    if (!ev.data) return;
    if (ev.data.type === "deregister") {
      self.registration
        .unregister()
        .then(() => self.clients.matchAll())
        .then((clients) =>
          clients.forEach((c) => c.navigate(c.url))
        );
    }
  });

  self.addEventListener("fetch", (event) => {
    const req = event.request;

    // Skip cache-only + cross-mode (browser spec edge case)
    if (req.cache === "only-if-cached" && req.mode !== "same-origin") return;

    // ★ Only modify navigation requests (HTML documents).
    //   Sub-resources (JS, WASM, ONNX models, images, fonts) pass through
    //   directly — no overhead, no CORP blocking, no re-streaming.
    if (req.mode !== "navigate") return;

    event.respondWith(
      fetch(req)
        .then((res) => {
          // Opaque redirects / network errors — pass as-is
          if (res.status === 0) return res;

          const headers = new Headers(res.headers);
          headers.set("Cross-Origin-Embedder-Policy", COEP);
          headers.set("Cross-Origin-Opener-Policy", "same-origin");

          return new Response(res.body, {
            status: res.status,
            statusText: res.statusText,
            headers,
          });
        })
        .catch(() => {
          // Network error during navigation — return a minimal offline page
          return new Response(
            "<!DOCTYPE html><html><head><meta charset=utf-8><title>Offline</title></head>" +
              '<body style="font-family:system-ui;text-align:center;padding:4rem">' +
              "<h1>You are offline</h1><p>Please check your connection and try again.</p>" +
              "<button onclick=location.reload()>Retry</button></body></html>",
            { status: 503, headers: { "Content-Type": "text/html" } }
          );
        })
    );
  });
} else {
  // ── Window scope (registration) ───────────────────────────────

  (() => {
    const cfg = {
      shouldRegister: () => true,
      shouldDeregister: () => false,
      doReload: () =>
        window.location.hostname !== "localhost" &&
        window.location.hostname !== "127.0.0.1",
      quiet: false,
      ...window.coi,
    };

    const sw = navigator.serviceWorker;
    if (!sw) return; // SW not supported (e.g. HTTP without localhost)

    if (sw.controller) {
      // SW already active — nothing to do
      if (cfg.shouldDeregister()) {
        sw.controller.postMessage({ type: "deregister" });
      }
      return;
    }

    if (!cfg.shouldRegister()) return;

    // Determine SW script URL (handles basePath for GH Pages, subpath deploys)
    const scriptURL =
      document.currentScript && document.currentScript.src
        ? document.currentScript.src
        : new URL("coi-serviceworker.js", document.baseURI).href;

    // Guard against infinite reload: only reload once per session
    const RELOAD_KEY = "__coi_reload";
    const needsReload = cfg.doReload() && !sessionStorage.getItem(RELOAD_KEY);

    if (needsReload) {
      sessionStorage.setItem(RELOAD_KEY, "1");
      sw.addEventListener(
        "controllerchange",
        () => window.location.reload(),
        { once: true }
      );
    }

    sw.register(scriptURL, { scope: new URL("./", scriptURL).pathname }).then(
      (reg) => {
        if (!cfg.quiet) console.log("[COI] Service worker registered", reg.scope);
      },
      (err) => {
        if (!cfg.quiet) console.error("[COI] Registration failed:", err);
      }
    );
  })();
}
