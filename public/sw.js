const CACHE = 'logisaude-andrade2-static';
const OFFLINE_URL = './offline.html';
const STATIC_ASSETS = [
  './offline.html', './portal.html', './operador.html', './gestao.html', './manifest.json',
  './js/app.js', './assets/css/h547-advanced-pwa.css', './assets/img/logisaude-icon.svg'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(STATIC_ASSETS.map(url => new Request(url, { cache: 'reload' }))).catch(() => null)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE && key.indexOf('logisaude-') === 0).map(key => caches.delete(key)))));
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.pathname.indexOf('/api/') !== -1) return;

  const isDoc = req.mode === 'navigate';
  const isCode = url.origin === self.location.origin && /\.(?:js|css|html)(?:$|\?)/.test(url.pathname + url.search);

  // Páginas e código (HTML/JS/CSS): NETWORK-FIRST — sempre pega a versão nova
  // quando online; usa o cache apenas como fallback offline. Isso evita telas
  // "presas" na versão antiga depois de um deploy.
  if (isDoc || isCode) {
    event.respondWith(
      fetch(req).then(res => {
        if (res.ok && url.origin === self.location.origin) {
          const copy = res.clone();
          caches.open(CACHE).then(cache => cache.put(req, copy));
        }
        return res;
      }).catch(() => caches.match(req).then(cached => cached || (isDoc ? caches.match(OFFLINE_URL) : undefined)))
    );
    return;
  }

  // Demais recursos (imagens, fontes, etc.): CACHE-FIRST.
  event.respondWith(
    caches.match(req).then(cached => cached || fetch(req).then(res => {
      const copy = res.clone();
      if (res.ok && (url.origin === self.location.origin)) caches.open(CACHE).then(cache => cache.put(req, copy));
      return res;
    }).catch(() => {
      if (isDoc) return caches.match(OFFLINE_URL);
      return caches.match(req);
    }))
  );
});

self.addEventListener('sync', event => {
  if (event.tag === 'sync-viagens' || event.tag === 'logisaude-sync') {
    event.waitUntil(self.clients.matchAll({ includeUncontrolled: true }).then(clients => {
      clients.forEach(client => client.postMessage({ type: 'LOGISAUDE_SYNC_REQUEST' }));
    }));
  }
});

self.addEventListener('push', event => {
  let data = { title: 'LogiSaúde', body: 'Nova atualização operacional.' };
  try { if (event.data) data = Object.assign(data, event.data.json()); } catch (_) {}
  event.waitUntil(self.registration.showNotification(data.title || 'LogiSaúde', {
    body: data.body || '', icon: './assets/img/logisaude-icon.svg', badge: './assets/img/logisaude-icon.svg', data: data.url || './operador.html'
  }));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const target = event.notification.data || './operador.html';
  event.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    for (const client of list) { if ('focus' in client) { client.navigate(target); return client.focus(); } }
    return clients.openWindow(target);
  }));
});
