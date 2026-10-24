// Hora actual de Argentina en ISO con offset -03:00.
export function ahoraAR() {
	const d = new Date(Date.now() - 3 * 3600 * 1000);
	return d.toISOString().slice(0, 19) + '-03:00';
}
