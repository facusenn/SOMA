import { json, error } from '@sveltejs/kit';
import { leer, guardar, nuevoId } from '$lib/server/db.js';
import { conIA, procesarEvento } from '$lib/server/ai.js';
import { eventoDemo } from '$lib/server/demo.js';
import { ahoraAR } from '$lib/server/fecha.js';

const TIPOS = ['sentir', 'consulta', 'cita', 'estudio', 'medicacion'];

export function GET() {
	return json(leer().eventos);
}

/** Registra un evento a partir de texto libre (dictado o escrito). */
export async function POST({ request }) {
	const { texto } = await request.json();
	if (!texto?.trim()) error(400, 'Falta el texto');
	const ahora = ahoraAR();
	let datos;
	try {
		datos = conIA() ? await procesarEvento(texto.trim(), ahora) : eventoDemo(texto, ahora);
	} catch (e) {
		console.error(e);
		datos = eventoDemo(texto, ahora);
	}
	if (!TIPOS.includes(datos.tipo)) datos.tipo = 'sentir';
	const evento = {
		sintomas: [], comidas: [], indicaciones: [],
		...datos,
		id: nuevoId('e'),
		texto: texto.trim(),
		creado: ahora,
		fecha: datos.fecha || ahora,
		estudio_id: null
	};
	const db = leer();
	db.eventos.push(evento);
	guardar(db);
	return json(evento, { status: 201 });
}
