/*! coi-serviceworker v0.1.7 - Guido Zuidhof, licensed under MIT */
let coepCredentialless = false;
if (typeof window === 'undefined') {
  self.addEventListener("install", () => self.skipWaiting());
  self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

  self.addEventListener("message", (ev) => {
    if (!ev.data) {
      return;
    } else if (ev.data.type === "deregister") {
      self.registration.unregister();
    } else if (ev.data.type === "coepCredentialless") {
      coepCredentialless = ev.data.value;
    }
  });

  self.addEventListener("fetch", function (event) {
    const r = event.request;
    if (r.cache === "only-if-cached" && r.mode !== "same-origin") {
      return;
    }

    const coep = coepCredentialless ? "credentialless" : "require-corp";

    event.respondWith(
      fetch(r)
        .then((response) => {
          if (response.status === 0) {
            return response;
          }

          const newHeaders = new Headers(response.headers);
          newHeaders.set("Cross-Origin-Embedder-Policy", coep);
          newHeaders.set("Cross-Origin-Opener-Policy", "same-origin");

          return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: newHeaders,
          });
        })
        .catch((e) => console.error(e))
    );
  });
} else {
  (() => {
    const coi = {
      shouldRegister: () => true,
      shouldDeregister: () => false,
      coepCredentialless: () => false,
      doReload: () => window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1',
      quiet: false,
      ...window.coi
    };

    const n = navigator;
    if (n.serviceWorker && n.serviceWorker.controller) {
      n.serviceWorker.controller.postMessage({
        type: "coepCredentialless",
        value: coi.coepCredentialless(),
      });

      if (coi.shouldDeregister()) {
        n.serviceWorker.controller.postMessage({ type: "deregister" });
      }
    } else {
      if (coi.shouldRegister()) {
        const src = document.currentScript.src;
        n.serviceWorker.register(src).then(
          (registration) => {
            if (!coi.quiet) console.log("coi-serviceworker registered");
            
            // Reload page on first register to enable the headers
            if (coi.doReload()) {
               window.location.reload();
            }
          },
          (err) => {
            if (!coi.quiet) console.error("coi-serviceworker registration failed: ", err);
          }
        );
      }
    }
  })();
}
