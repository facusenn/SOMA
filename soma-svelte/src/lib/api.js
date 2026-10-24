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

const sinConexion = () => typeof navigator !== 'undefined' && !navigator.onLine;
const errorSinConexion = () => new ErrorSoma('Sin conexión', 'Revisá tu internet y probá de nuevo.', 'red');
const errorServidor = () => new ErrorSoma('No pudimos conectar con SOMA', 'El servidor no responde. Probá en unos segundos.');

function errorHttp(status, cuerpo) {
	return new ErrorSoma(
		TITULOS[status] ?? 'Algo salió mal',
		cuerpo?.message && !/^Internal Error$/i.test(cuerpo.message) ? cuerpo.message : 'Probá de nuevo en unos segundos.'
	);
}

/** fetch con errores claros para mostrarle a la persona. */
export async function api(url, opciones) {
	if (sinConexion()) throw errorSinConexion();
	let res;
	try {
		res = await fetch(url, opciones);
	} catch {
		throw errorServidor();
	}
	if (!res.ok) throw errorHttp(res.status, await res.json().catch(() => ({})));
	return res.status === 204 ? null : res.json();
}

/**
 * POST de un formulario con avance de subida (fetch no lo informa).
 * onProgreso recibe 0–1 mientras se envía el archivo y 1 cuando ya llegó al servidor.
 */
export function subir(url, form, onProgreso) {
	if (sinConexion()) return Promise.reject(errorSinConexion());
	return new Promise((resolve, reject) => {
		const xhr = new XMLHttpRequest();
		xhr.open('POST', url);
		xhr.upload.onprogress = (e) => e.lengthComputable && onProgreso?.(e.loaded / e.total);
		xhr.upload.onload = () => onProgreso?.(1);
		xhr.onerror = () => reject(errorServidor());
		xhr.onload = () => {
			let cuerpo = {};
			try {
				cuerpo = JSON.parse(xhr.responseText);
			} catch {}
			if (xhr.status >= 200 && xhr.status < 300) resolve(cuerpo);
			else reject(errorHttp(xhr.status, cuerpo));
		};
		xhr.send(form);
	});
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
