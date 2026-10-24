import { json } from '@sveltejs/kit';
import { leer } from '$lib/server/db.js';

/** Historia completa: lo que lee un agente externo conectado a SOMA. */
export function GET() {
	return json(leer());
}
