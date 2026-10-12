/**
 * Service worker: always "network first, no stale cache".
 * Every file of the game is re-validated with the server on every load, so a new version on
 * GitHub Pages is picked up immediately (no more waiting for the browser cache to expire).
 * The last good copy is kept only as an offline fallback.
 */
const CACHE = 'pastizzis-fighters-runtime';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('fetch', (event) => {
	const req = event.request;
	if (req.method !== 'GET') return;
	const url = new URL(req.url);
	if (url.origin !== self.location.origin) return; // PeerJS etc. go straight to the network

	event.respondWith(
		(async () => {
			try {
				const res = await fetch(req.url, { cache: 'no-cache', credentials: 'same-origin' });
				if (res.ok && !url.search.includes('room=')) {
					const copy = res.clone();
					caches.open(CACHE).then((c) => c.put(url.pathname, copy)).catch(() => {});
				}
				return res;
			} catch (e) {
				const cached = await caches.match(url.pathname);
				if (cached) return cached;
				throw e;
			}
		})()
	);
});
