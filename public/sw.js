// Minimal service worker — PWA quraşdırılması üçün tələb olunur və
// statik faylları keşləyərək təkrar açılışı sürətləndirir.
const CACHE = "ecommerce-v2";
const PRECACHE = ["/", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Yalnız eyni mənbədən gələn GET sorğularını idarə edirik.
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) {
    return;
  }

  // Naviqasiya: əvvəlcə şəbəkə, oflayn olanda keşdən ana səhifə.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match("/").then((r) => r || Response.error())),
    );
    return;
  }

  // Statik fayllar: keş varsa oradan, yoxdursa şəbəkədən və keşə yaz.
  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request).then((response) => {
          if (response.ok && request.url.includes("/_next/static/")) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        }),
    ),
  );
});
