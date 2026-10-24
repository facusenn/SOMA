export const toasts = $state([]);

const DURACION = { ok: 3500, info: 4500, aviso: 6000, error: 7000 };

/**
 * Muestra un aviso. tipo: 'ok' | 'info' | 'aviso' | 'error'.
 * opciones: { titulo, duracion (0 = fijo hasta cerrarlo), id (reemplaza uno existente) }
 */
export function avisar(texto, tipo = 'ok', opciones = {}) {
	const id = opciones.id ?? Math.random().toString(36).slice(2);
	cerrar(id);
	const duracion = opciones.duracion ?? DURACION[tipo] ?? 4000;
	toasts.push({ id, texto, tipo, titulo: opciones.titulo, duracion });
	if (toasts.length > 4) toasts.shift();
	if (duracion) setTimeout(() => cerrar(id), duracion);
	return id;
}

export function cerrar(id) {
	const i = toasts.findIndex((t) => t.id === id);
	if (i >= 0) toasts.splice(i, 1);
}

/** Muestra un error de la app (ErrorSoma o cualquier Error) como aviso. */
export function avisarError(e, tituloPorDefecto = 'Algo salió mal') {
	avisar(e?.detalle ?? e?.message ?? 'Probá de nuevo en unos segundos.', 'error', {
		titulo: e?.titulo ?? tituloPorDefecto,
		id: e?.id
	});
}
