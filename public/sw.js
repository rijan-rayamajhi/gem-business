const CACHE_VERSION = "v1";
const STATIC_CACHE = `gem-static-${CACHE_VERSION}`;
const PAGE_CACHE = `gem-pages-${CACHE_VERSION}`;

const PRECACHE_URLS = ["/offline.html", "/manifest.webmanifest", "/window.svg", "/globe.svg"];

self.addEventListener("message", (event) => {
  const data = event.data;
  if (!data || typeof data !== "object") return;
  if (data.type === "SKIP_WAITING") {
    self.skipWaiting().catch(() => null);
  }
});

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);
      await cache.addAll(PRECACHE_URLS);
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.map((key) => {
          if (key === STATIC_CACHE || key === PAGE_CACHE) return Promise.resolve();
          if (key.startsWith("gem-static-") || key.startsWith("gem-pages-")) {
            return caches.delete(key);
          }
          return Promise.resolve();
        }),
      );
      await self.clients.claim();
    })(),
  );
});

function isStaticAsset(request) {
  if (request.method !== "GET") return false;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return false;

  if (url.pathname.startsWith("/_next/static/")) return true;

  const dest = request.destination;
  return dest === "script" || dest === "style" || dest === "image" || dest === "font";
}

self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const network = await fetch(request);
          const cache = await caches.open(PAGE_CACHE);
          cache.put(request, network.clone()).catch(() => null);
          return network;
        } catch {
          const cache = await caches.open(PAGE_CACHE);
          const cached = await cache.match(request);
          if (cached) return cached;
          const offline = await caches.match("/offline.html");
          return offline || new Response("Offline", { status: 503, statusText: "Offline" });
        }
      })(),
    );
    return;
  }

  if (isStaticAsset(request)) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(request);
        if (cached) {
          fetch(request)
            .then(async (res) => {
              const cache = await caches.open(STATIC_CACHE);
              await cache.put(request, res.clone());
            })
            .catch(() => null);
          return cached;
        }

        const res = await fetch(request);
        const cache = await caches.open(STATIC_CACHE);
        cache.put(request, res.clone()).catch(() => null);
        return res;
      })(),
    );
  }
});
