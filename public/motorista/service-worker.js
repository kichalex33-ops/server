const CACHE_NAME = "painel-logistico-motorista-v3";
const BASE_PATH = new URL(self.registration.scope).pathname.replace(/\/$/, "");
const appUrl = (path = "") => `${BASE_PATH}${path.startsWith("/") ? path : `/${path}`}`;

const SHELL_ASSETS = [
  appUrl("/"),
  appUrl("/offline.html"),
  appUrl("/manifest.json"),
  appUrl("/assets/css/app-motorista.css"),
  appUrl("/assets/js/offline-store.js"),
  appUrl("/assets/js/app-motorista.js"),
  appUrl("/assets/icons/icon.svg")
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const requestUrl = new URL(event.request.url);

  if (requestUrl.pathname.includes("/api/")) return;

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => response)
        .catch(() => caches.match(appUrl("/offline.html")))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((cached) => cached || fetch(event.request))
  );
});
