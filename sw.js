const CACHE_NAME = "daily-memo-v1";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
];

// インストール時にアセットをキャッシュ
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// 古いキャッシュを削除
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// ネットワーク優先・失敗時にキャッシュから返す
self.addEventListener("fetch", (event) => {
  // Slack / Cloudflare Worker へのリクエストはキャッシュしない
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((res) => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return res;
      })
      .catch(() => caches.match(event.request))
  );
});
