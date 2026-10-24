import { json, error } from '@sveltejs/kit';
import { leer, guardar } from '$lib/server/db.js';
import { conIA, procesarEvento } from '$lib/server/ai.js';
import { eventoDemo } from '$lib/server/demo.js';

export function DELETE({ params }) {
	const db = leer();
	db.eventos = db.eventos.filter((e) => e.id !== params.id);
	guardar(db);
	return new Response(null, { status: 204 });
}

/** Corrige el texto de un evento y lo vuelve a procesar. */
export async function PATCH({ params, request }) {
	const { texto } = await request.json().catch(() => ({}));
	if (!texto?.trim()) error(400, 'El texto corregido está vacío.');
	const db = leer();
	const i = db.eventos.findIndex((e) => e.id === params.id);
	if (i < 0) error(404, 'Ese registro ya no existe. Recargá la página.');
	const viejo = db.eventos[i];
	let datos;
	try {
		datos = conIA() ? await procesarEvento(texto, viejo.creado) : eventoDemo(texto, viejo.creado);
	} catch {
		datos = eventoDemo(texto, viejo.creado);
	}
	db.eventos[i] = { ...viejo, ...datos, texto, id: viejo.id, creado: viejo.creado };
	guardar(db);
	return json(db.eventos[i]);
}
