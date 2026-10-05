/**
 * Bloom Market service worker.
 *
 * Scope of what this caches, and why it is deliberately small:
 *
 *  - HTML is NEVER cached. Every navigation goes to the network, and if that
 *    fails we serve `/offline`. This keeps account-scoped pages — /cart,
 *    /orders, /checkout — from ever being replayed from a cache on a shared or
 *    offline device.
 *  - Only content-hashed build output (`/_next/static`, `/_next/image`) and
 *    the app's own static assets are cached. Those URLs change whenever their
 *    content changes, so a stale hit is not possible.
 *  - /api/*, /auth/*, every non-GET request and every cross-origin request
 *    (Supabase, Paystack, Google) are excluded from the fetch handler
 *    entirely, so auth tokens, payment pages and private data are never
 *    written to the Cache Storage.
 *
 * There is intentionally no offline checkout: paying requires the network, and
 * pretending otherwise would be worse than an honest offline page.
 */

const VERSION = "bm-v1";
const STATIC_CACHE = `${VERSION}-static`;
const OFFLINE_URL = "/offline";

const PRECACHE = [
  OFFLINE_URL,
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/maskable-512.png",
  "/icons/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      // `reload` bypasses the HTTP cache so an update can never precache a
      // stale copy of the offline page.
      .then((cache) =>
        Promise.allSettled(
          PRECACHE.map((url) =>
            fetch(new Request(url, { cache: "reload" })).then((res) =>
              res.ok ? cache.put(url, res) : undefined,
            ),
          ),
        ),
      )
      // A new worker takes over as soon as it is ready; the tab reload is
      // driven by the registrar, which respects prefers-reduced-motion.
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => !key.startsWith(VERSION)).map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

/** True only for same-origin, immutable, hashed static assets. */
function isCacheableStatic(url) {
  if (url.origin !== self.location.origin) return false;
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/_next/image") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/products/") ||
    url.pathname.startsWith("/brand/")
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Anything that isn't a plain GET is left entirely alone, as are API routes,
  // auth routes and all cross-origin traffic.
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/auth/")) {
    return;
  }

  // Navigations: network first, offline page as the fallback. Never cached.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() =>
        caches
          .match(OFFLINE_URL)
          .then((cached) => cached || Response.error()),
      ),
    );
    return;
  }

  // Static assets: serve from cache when present, otherwise fetch and store.
  // Hashed filenames make this safe: a changed asset gets a new URL.
  if (isCacheableStatic(url)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok && response.type === "basic") {
            const copy = response.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        });
      }),
    );
  }
});