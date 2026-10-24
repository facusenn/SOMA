export class ErrorSoma extends Error {
	constructor(titulo, detalle, id) {
		super(detalle);
		this.titulo = titulo;
		this.detalle = detalle;
		this.id = id; // avisos con el mismo id se reemplazan en vez de apilarse
	}
}

const TITULOS = {
	400: 'Faltan datos',
	404: 'No lo encontramos',
	413: 'El archivo es muy pesado',
	502: 'La IA no respondió',
	503: 'Servicio no disponible'
};

/** fetch con errores claros para mostrarle a la persona. */
export async function api(url, opciones) {
	if (typeof navigator !== 'undefined' && !navigator.onLine)
		throw new ErrorSoma('Sin conexión', 'Revisá tu internet y probá de nuevo.', 'red');
	let res;
	try {
		res = await fetch(url, opciones);
	} catch {
		throw new ErrorSoma('No pudimos conectar con SOMA', 'El servidor no responde. Probá en unos segundos.');
	}
	if (!res.ok) {
		const cuerpo = await res.json().catch(() => ({}));
		throw new ErrorSoma(
			TITULOS[res.status] ?? 'Algo salió mal',
			cuerpo.message && !/^Internal Error$/i.test(cuerpo.message) ? cuerpo.message : 'Probá de nuevo en unos segundos.'
		);
	}
	return res.status === 204 ? null : res.json();
}

export const TIPOS_ARCHIVO = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
export const MAX_MB = 15;

/** Valida un estudio antes de subirlo. */
export function validarArchivo(f) {
	if (!f) throw new ErrorSoma('No elegiste ningún archivo', 'Elegí un PDF o una foto del estudio.');
	if (f.type && !TIPOS_ARCHIVO.includes(f.type))
		throw new ErrorSoma('Formato no soportado', 'Subí el estudio en PDF o como foto (JPG, PNG, WEBP o HEIC).');
	if (f.size > MAX_MB * 1024 * 1024)
		throw new ErrorSoma('El archivo es muy pesado', `El máximo es ${MAX_MB} MB. Probá con una foto más liviana.`);
}
