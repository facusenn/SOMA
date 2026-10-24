import { json, error } from '@sveltejs/kit';
import fs from 'node:fs';
import path from 'node:path';
import { leer, guardar, nuevoId, UPLOADS } from '$lib/server/db.js';
import { conIA, extraerEstudio } from '$lib/server/ai.js';
import { ahoraAR } from '$lib/server/fecha.js';

export function GET() {
	return json(leer().estudios);
}

/** Sube un estudio (PDF o imagen), extrae los valores con IA y lo suma a la historia. */
export async function POST({ request }) {
	const form = await request.formData();
	const archivo = form.get('archivo');
	if (!(archivo instanceof File) || !archivo.size) error(400, 'Falta el archivo');
	const id = nuevoId('s');
	const ext = path.extname(archivo.name) || '';
	const buf = Buffer.from(await archivo.arrayBuffer());
	fs.mkdirSync(UPLOADS, { recursive: true });
	fs.writeFileSync(path.join(UPLOADS, id + ext), buf);

	const ahora = ahoraAR();
	let datos = {
		fecha: ahora.slice(0, 10), tipo: 'Estudio', titulo: archivo.name, lugar: null,
		resumen: 'Archivo guardado. Sin IA no se pudieron leer los valores.', valores: []
	};
	if (conIA()) {
		try {
			datos = await extraerEstudio(archivo.name, archivo.type || 'application/pdf', buf.toString('base64'));
		} catch (e) {
			console.error(e);
			datos.resumen = 'Archivo guardado. No se pudieron leer los valores automáticamente.';
		}
	}
	const estudio = { valores: [], ...datos, id, archivo: id + ext, nombre_archivo: archivo.name };
	const db = leer();
	db.estudios.push(estudio);
	// Si viene de un evento dictado ("hoy me dieron los estudios"), se vincula a ese evento.
	const eventoId = form.get('evento_id');
	const evento = eventoId && db.eventos.find((e) => e.id === eventoId);
	if (evento) {
		evento.estudio_id = id;
		evento.lugar ??= estudio.lugar;
	} else db.eventos.push({
		id: nuevoId('e'), tipo: 'estudio', fecha: ahora, creado: ahora,
		texto: `Subí el estudio "${archivo.name}"`, titulo: estudio.titulo, resumen: estudio.resumen,
		sintomas: [], comidas: [], indicaciones: [], intensidad: null, lugar: estudio.lugar, estudio_id: id
	});
	guardar(db);
	return json(estudio, { status: 201 });
}
