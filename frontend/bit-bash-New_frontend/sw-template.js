/* Bit Bash Bonanza service worker (generated into dist/sw.js at build time).
 *
 * Lets the game keep working after the network is cut: on install it
 * caches every file of this build, then serves pages and assets from the
 * cache whenever the network is unavailable. API calls are never cached.
 *
 * The version string and file list below are filled in by the precache
 * plugin in vite.config.js.
 */
const VERSION = "__VERSION__";
const FILES = __FILES__;
const CACHE = `bbb-shell-${VERSION}`;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(FILES.map((url) => new Request(url, { cache: "reload" }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k.startsWith("bbb-shell-") && k !== CACHE).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // backend/API: never cached

  // Pages: try the network (to pick up new deploys), fall back to the
  // cached app shell so any route still opens offline.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match("/index.html", { cacheName: CACHE }).then((res) => res || caches.match("/"))
      )
    );
    return;
  }

  // Built files are content-hashed, so the cached copy is always right.
  event.respondWith(
    caches.match(request, { cacheName: CACHE }).then(
      (cached) =>
        cached ||
        fetch(request).then((res) => {
          if (res.ok && url.pathname.startsWith("/assets/")) {
            const copy = res.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return res;
        })
    )
  );
});
