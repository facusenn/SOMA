import { leer } from '$lib/server/db.js';
import { conIA } from '$lib/server/ai.js';

export function load({ depends }) {
	depends('soma:db');
	return { db: leer(), conIA: conIA() };
}
