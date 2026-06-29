/* sw.js — offline-first service worker for World Cup 2026 site.
   Strategy:
   - App shell (HTML/CSS/JS/icons): stale-while-revalidate, cached on install.
   - API JSON: network-first, fall back to cache when offline.
   - Images: cache-first with fallback to flag placeholder.
*/

const VERSION = "wc26-v11";
const SHELL = [
  "./",
  "./index.html",
  "./404.html",
  "./assets/css/styles.css?v=6",
  "./assets/js/main.js?v=8",
  "./assets/js/i18n.js?v=6",
  "./assets/js/api.js",
  "./assets/js/render.js?v=8",
  "./assets/js/timezone.js?v=7",
  "./assets/js/features.js",
  "./assets/js/notify.js",
  "./assets/js/seo.js",
  "./assets/js/analytics.js",
  "./assets/js/site.config.js",
  "./assets/icons/favicon.svg",
  "./assets/icons/icon-192.png",
  "./site.webmanifest",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  const url = new URL(req.url);

  // Only handle GET requests.
  if (req.method !== "GET") return;

  // API JSON (live data) — network first so live scores stay fresh.
  if (url.origin === "https://worldcup26.ir" && url.pathname.startsWith("/get/")) {
    e.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(VERSION + "-api").then((c) => c.put(req, copy)).catch(() => {});
        return res;
      }).catch(() => caches.match(req).then((r) => r || new Response("[]", { headers: { "Content-Type": "application/json" } })))
    );
    return;
  }

  // Same-origin static shell — stale-while-revalidate.
  if (url.origin === self.location.origin) {
    e.respondWith(
      caches.match(req).then((cached) => {
        const fetchAndCache = fetch(req).then((res) => {
          if (res && res.status === 200 && res.type === "basic") {
            const copy = res.clone();
            caches.open(VERSION).then((c) => c.put(req, copy)).catch(() => {});
          }
          return res;
        }).catch(() => cached);
        return cached || fetchAndCache;
      })
    );
    return;
  }

  // Cross-origin images (flags) — cache-first.
  if (req.destination === "image" || url.origin === "https://flagcdn.com") {
    e.respondWith(
      caches.match(req).then((cached) => cached || fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(VERSION + "-img").then((c) => c.put(req, copy)).catch(() => {});
        return res;
      }).catch(() => cached))
    );
  }
});
