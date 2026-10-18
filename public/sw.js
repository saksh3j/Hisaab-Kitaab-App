const CACHE_NAME = "hisaab-kitaab-v2";
const PREVIOUS_CACHE_NAME = "hisaab-kitaab-v1";
const CACHE_PREFIX = "hisaab-kitaab-";
const APP_SHELL = [
  "/",
  "/offline.html",
  "/manifest.json",
  "/favicon.ico",
  "/apple-icon.png",
  "/icon-192.png",
  "/icon-512.png",
  "/icon-light-32x32.png",
  "/icon-dark-32x32.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          // Retain one older cache for clients still referencing old hashed assets.
          if (
            key.startsWith(CACHE_PREFIX) &&
            key !== CACHE_NAME &&
            key !== PREVIOUS_CACHE_NAME
          ) {
            return caches.delete(key);
          }
          return Promise.resolve();
        }),
      ),
    ).then(() => self.clients.claim()),
  );
});

const isStaticAsset = (pathname) =>
  pathname.startsWith("/_next/static/") ||
  pathname.endsWith(".js") ||
  pathname.endsWith(".css") ||
  pathname.endsWith(".png") ||
  pathname.endsWith(".jpg") ||
  pathname.endsWith(".jpeg") ||
  pathname.endsWith(".svg") ||
  pathname.endsWith(".webp") ||
  pathname.endsWith(".ico") ||
  pathname.endsWith(".woff2");

const cacheResponse = async (request, response) => {
  if (!response || !response.ok) return response;
  const cache = await caches.open(CACHE_NAME);
  await cache.put(request, response.clone());
  return response;
};

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith("/api/send-ledger")) {
    event.respondWith(fetch(request));
    return;
  }

  if (request.mode === "navigate") {
    const networkResponse = fetch(request).then((response) =>
      cacheResponse("/", response),
    );
    event.waitUntil(networkResponse.catch(() => undefined));
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const shell = await cache.match("/");
        if (shell) {
          // Serve cached HTML immediately so offline launches never wait on fetch.
          return shell;
        }

        try {
          return await networkResponse;
        } catch {
          return (await cache.match("/offline.html")) ?? Response.error();
        }
      }),
    );
    return;
  }

  if (isStaticAsset(url.pathname)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => cacheResponse(request, response));
      }),
    );
    return;
  }

  event.respondWith(
    fetch(request)
      .then((response) => cacheResponse(request, response))
      .catch(() => caches.match(request)),
  );
});
