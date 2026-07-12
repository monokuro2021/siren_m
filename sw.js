const CACHE_NAME = 'mirisiren-cache-v1';
const urlsToCache = [
  './',
  './index.html',
  './style.css',
  './game.js',
  './manifest.json',
  './images/ミリちゃん_アイコン.png',
  './images/ミリちゃん_CLOSE.png',
  './sounds/coingame.mp3',
  './sounds/tousen.mp3',
  './sounds/batu.mp3',
  './sounds/clear_bgm.mp3',
  './bgm/chare.mp3'
];

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        // 1つでも失敗しても全体を失敗させない
        return Promise.all(
          urlsToCache.map(function(url) {
            return cache.add(url).catch(function(err) {
              console.log('キャッシュ失敗:', url, err);
            });
          })
        );
      })
  );
});

self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        if (response) {
          return response;
        }
        return fetch(event.request).catch(function(err) {
          console.log('ネットワーク取得失敗:', event.request.url, err);
        });
      })
  );
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.filter(function(cacheName) {
          return cacheName !== CACHE_NAME;
        }).map(function(cacheName) {
          return caches.delete(cacheName);
        })
      );
    })
  );
});
