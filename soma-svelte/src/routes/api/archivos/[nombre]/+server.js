import { error } from '@sveltejs/kit';
import fs from 'node:fs';
import path from 'node:path';
import { UPLOADS } from '$lib/server/db.js';

const TIPOS = { '.pdf': 'application/pdf', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' };

export function GET({ params }) {
	const nombre = path.basename(params.nombre);
	const ruta = path.join(UPLOADS, nombre);
	if (!fs.existsSync(ruta)) error(404, 'No existe');
	return new Response(fs.readFileSync(ruta), {
		headers: { 'Content-Type': TIPOS[path.extname(nombre).toLowerCase()] ?? 'application/octet-stream' }
	});
}
