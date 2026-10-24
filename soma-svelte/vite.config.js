import { sveltekit } from '@sveltejs/kit/vite';
import basicSsl from '@vitejs/plugin-basic-ssl';
import { defineConfig } from 'vite';

// HTTPS=1 levanta con certificado autofirmado: el micrófono del navegador
// solo funciona con HTTPS cuando se entra desde otro equipo de la red.
export default defineConfig({
	plugins: [sveltekit(), process.env.HTTPS && basicSsl()]
});
