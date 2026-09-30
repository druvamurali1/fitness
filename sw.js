// Offline cache. Bump CACHE when files change so phones pick up the new build.
const CACHE = 'gym-plan-v6';
const FILES = ['./', './index.html', './css/app.css', './manifest.webmanifest', './assets/icon.svg',
  './js/app.js', './js/util.js', './js/store.js', './js/generator.js', './js/charts.js',
  './js/data/exercises.js', './js/data/programs.js', './js/data/diets.js', './js/data/intake.js', './js/data/profiles.js', './js/data/howto.js', './js/data/videos.js',
  './js/views/ui.js', './js/views/onboarding.js', './js/views/today.js', './js/views/week.js', './js/views/progress.js', './js/views/plan.js', './js/views/exercise.js', './js/views/words.js'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
    if (res.ok && new URL(e.request.url).origin === location.origin) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
    return res;
  }).catch(() => hit)));
});
