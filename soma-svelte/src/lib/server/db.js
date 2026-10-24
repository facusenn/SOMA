import fs from 'node:fs';
import path from 'node:path';

const DIR = path.resolve('data');
const DB = path.join(DIR, 'db.json');
const SEED = path.join(DIR, 'seed.json');
export const UPLOADS = path.join(DIR, 'uploads');

export function leer() {
	if (!fs.existsSync(DB)) fs.copyFileSync(SEED, DB);
	return JSON.parse(fs.readFileSync(DB, 'utf8'));
}

export function guardar(db) {
	const tmp = DB + '.tmp';
	fs.writeFileSync(tmp, JSON.stringify(db, null, 1));
	fs.renameSync(tmp, DB);
}

export function reiniciar() {
	fs.copyFileSync(SEED, DB);
}

export const nuevoId = (p) => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
