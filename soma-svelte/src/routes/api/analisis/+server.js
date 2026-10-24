import { json, error } from '@sveltejs/kit';
import { leer, guardar } from '$lib/server/db.js';
import { conIA, analizar } from '$lib/server/ai.js';
import { ahoraAR } from '$lib/server/fecha.js';

export function GET() {
	return json(leer().analisis);
}

/** Recalcula el top 10 de posibles problemas con todo el historial. */
export async function POST() {
	const db = leer();
	if (!conIA()) error(503, 'Modo demo: configurá OPENROUTER_API_KEY para recalcular el análisis.');
	let res;
	try {
		res = await analizar(db);
	} catch (e) {
		console.error(e);
		error(502, 'No se pudo generar el análisis. Probá de nuevo.');
	}
	db.analisis = {
		generado: ahoraAR(),
		eventos_analizados: db.eventos.length,
		estudios_analizados: db.estudios.length,
		items: (res.items ?? []).slice(0, 10)
	};
	guardar(db);
	return json(db.analisis);
}
