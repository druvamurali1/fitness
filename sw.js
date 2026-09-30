// Offline cache. Network first when there is signal, so updates show on the
// next open; the cached copy only serves when the network fails. Bump CACHE
// when files change so old copies are dropped.
const CACHE = 'gym-plan-v21';
const FILES = ['./', './index.html', './css/app.css', './manifest.webmanifest', './assets/icon.svg',
  './js/app.js', './js/util.js', './js/store.js', './js/generator.js', './js/charts.js',
  './js/data/exercises.js', './js/data/programs.js', './js/data/diets.js', './js/data/intake.js', './js/data/profiles.js', './js/data/howto.js', './js/data/howto-more.js', './js/data/exercises-more.js', './js/data/videos.js',
  './js/views/ui.js', './js/views/onboarding.js', './js/views/today.js', './js/views/week.js', './js/views/progress.js', './js/views/plan.js', './js/views/exercise.js', './js/views/words.js'];

self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return; // fonts and video posters: let the browser handle them
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 4000);
      const res = await fetch(e.request, { signal: ctrl.signal, cache: 'no-store' });
      clearTimeout(t);
      if (res.ok) cache.put(e.request, res.clone());
      return res;
    } catch {
      const hit = await cache.match(e.request, { ignoreSearch: true });
      if (hit) return hit;
      if (e.request.mode === 'navigate') return cache.match('./index.html');
      throw new Error('offline and not cached');
    }
  })());
});
