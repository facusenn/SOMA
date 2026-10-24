/// <reference types="@sveltejs/kit" />
import { build, files, version } from '$service-worker';

// Cachea la app (JS, CSS, íconos) para que abra rápido e incluso sin conexión.
// Los datos (/api) siempre van a la red: son la historia de la persona y tienen que estar al día.
const CACHE = `soma-${version}`;
const ESTATICOS = [...build, ...files];

self.addEventListener('install', (e) => {
	e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ESTATICOS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
	e.waitUntil(
		caches
			.keys()
			.then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
			.then(() => self.clients.claim())
	);
});

self.addEventListener('fetch', (e) => {
	const req = e.request;
	if (req.method !== 'GET') return;
	const url = new URL(req.url);
	if (url.origin !== location.origin) return;

	if (url.pathname.startsWith('/api/')) {
		e.respondWith(
			fetch(req).catch(
				() =>
					new Response(JSON.stringify({ message: 'Sin conexión. Revisá tu internet.' }), {
						status: 503,
						headers: { 'Content-Type': 'application/json' }
					})
			)
		);
		return;
	}

	if (ESTATICOS.includes(url.pathname)) {
		e.respondWith(caches.match(req).then((r) => r ?? fetch(req)));
		return;
	}

	// Páginas: red primero; sin conexión, la última versión guardada.
	e.respondWith(
		fetch(req)
			.then((res) => {
				if (res.ok && req.mode === 'navigate') {
					const copia = res.clone();
					caches.open(CACHE).then((c) => c.put(req, copia));
				}
				return res;
			})
			.catch(async () => (await caches.match(req)) ?? (await caches.match('/')) ?? Response.error())
	);
});
