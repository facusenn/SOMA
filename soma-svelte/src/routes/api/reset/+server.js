import { json } from '@sveltejs/kit';
import { reiniciar } from '$lib/server/db.js';

export function POST() {
	reiniciar();
	return json({ ok: true });
}
