import adapter from '@sveltejs/adapter-node';

export default {
	kit: {
		adapter: adapter(),
		// Detrás del proxy de Render (y en la red local) el origen que ve el servidor no siempre
		// coincide con el del navegador, y SvelteKit rechazaba las subidas de estudios con 403.
		csrf: { trustedOrigins: ['*'] }
	}
};
