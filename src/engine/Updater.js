/**
 * New-version check on launch.
 *
 * version.json (at the site root) holds the current version. When you publish an update, change it.
 * On every launch the game asks the server for version.json (never from cache). If it differs from
 * the version this browser ran last time, the page clears its cached copies and reloads itself once,
 * so everybody plays the newest version (a forced hard refresh).
 *
 * The service worker (sw.js) also makes every file re-validate with the server, so files are never stale.
 */
const SEEN_KEY = 'pf-version';
const RELOADED_KEY = 'pf-reloaded-for';

const store = (s, k, v) => {
	try {
		if (v === undefined) return s.getItem(k);
		s.setItem(k, v);
	} catch (e) {
		return null;
	}
	return null;
};

export const registerServiceWorker = () => {
	if (!('serviceWorker' in navigator) || location.protocol === 'file:') return;
	navigator.serviceWorker.register('sw.js').catch(() => {});
};

const showUpdating = () => {
	const d = document.createElement('div');
	d.className = 'updating';
	d.textContent = 'New version found - updating…';
	document.body.appendChild(d);
};

/** Resolves true when a reload has been started (the caller should not start the game). */
export const checkForUpdate = async () => {
	if (location.protocol === 'file:') return false;
	let version;
	try {
		const res = await fetch(`version.json?t=${Date.now()}`, { cache: 'no-store' });
		if (!res.ok) return false;
		version = (await res.json()).version;
	} catch (e) {
		return false; // offline: just play
	}
	if (!version) return false;
	const seen = store(localStorage, SEEN_KEY);
	store(localStorage, SEEN_KEY, version);
	if (!seen || seen === version) return false;
	if (store(sessionStorage, RELOADED_KEY) === version) return false; // already refreshed once for it

	store(sessionStorage, RELOADED_KEY, version);
	showUpdating();
	try {
		if (window.caches) for (const k of await caches.keys()) await caches.delete(k);
		const reg = await navigator.serviceWorker?.getRegistration?.();
		await reg?.update?.();
	} catch (e) {
		/* best effort */
	}
	// cache-busting reload: the page itself, then (through the service worker) every file, come fresh
	const url = new URL(location.href);
	url.searchParams.set('v', version);
	location.replace(url.toString());
	return true;
};
