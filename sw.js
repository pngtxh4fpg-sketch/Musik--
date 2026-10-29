// Service Worker: cached nur die App Shell. Supabase Anfragen (API, Audio) werden nie angefasst.
const CACHE = 'music-pwa-v4';
const CDN = [
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.3/dist/umd/supabase.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jsmediatags/3.9.5/jsmediatags.min.js',
];
const SHELL = ['./', './index.html', './manifest.json', ...CDN];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await c.addAll(SHELL);
    try { await c.add('./App_Music_Icon.png'); } catch (_) {}
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET') return;
  const own = url.origin === self.location.origin;
  if (!own && !CDN.includes(req.url)) return; // Supabase u.a. direkt ans Netz

  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const hit = await cache.match(req, { ignoreSearch: true });
    // Stale while revalidate: sofort aus Cache, im Hintergrund aktualisieren
    const refresh = fetch(req).then(r => { if (r && r.status === 200) cache.put(req, r.clone()); return r; }).catch(() => null);
    if (hit) { e.waitUntil(refresh); return hit; }
    const net = await refresh;
    if (net) return net;
    if (req.mode === 'navigate') { const fb = await cache.match('./index.html'); if (fb) return fb; }
    return new Response('', { status: 503, statusText: 'Offline' });
  })());
});
