import { invalidate } from '$app/navigation';
import { avisar, avisarError } from '$lib/toast.svelte.js';
import { api, validarArchivo } from '$lib/api.js';
import { ui } from '$lib/estado.svelte.js';
import { TIPOS } from '$lib/ui.js';

export const CANCELAR = 110;

const ERRORES_VOZ = {
	'not-allowed': ['Permiso de micrófono bloqueado', 'Habilitalo desde el candado de la barra de direcciones y probá de nuevo.'],
	'service-not-allowed': ['Permiso de micrófono bloqueado', 'Habilitalo desde el candado de la barra de direcciones y probá de nuevo.'],
	'audio-capture': ['No encontramos un micrófono', 'Conectá uno o revisá la configuración de sonido.'],
	network: ['El dictado necesita internet', 'El navegador usa un servicio en línea para pasar tu voz a texto.'],
	'language-not-supported': ['Idioma no disponible', 'Tu navegador no tiene dictado en español. Escribilo en la barra.']
};

/** Registra un evento a partir de texto y refresca la app. */
export async function registrar(texto) {
	ui.procesando = texto;
	try {
		const ev = await api('/api/eventos', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ texto })
		});
		ui.ultimoId = ev.id;
		ui.ultimo = ev;
		if (ev.tipo === 'estudio') ui.pendienteEstudio = ev;
		await invalidate('soma:db');
		avisar(ev.titulo, 'ok', { titulo: `Guardado en ${TIPOS[ev.tipo].label}` });
		return ev;
	} catch (e) {
		avisarError(e, 'No se pudo registrar');
	} finally {
		ui.procesando = null;
	}
}

/** Sube un estudio; si hay un evento de estudio pendiente, lo vincula. */
export async function subirEstudio(archivo) {
	if (!archivo) return;
	try {
		validarArchivo(archivo);
	} catch (e) {
		return avisarError(e);
	}
	ui.subiendo = true;
	const form = new FormData();
	form.append('archivo', archivo);
	if (ui.pendienteEstudio) form.append('evento_id', ui.pendienteEstudio.id);
	try {
		const est = await api('/api/estudios', { method: 'POST', body: form });
		ui.pendienteEstudio = null;
		await invalidate('soma:db');
		if (est.valores?.length)
			avisar(`${est.valores.length} valores leídos y ordenados`, 'ok', { titulo: `Estudio guardado: ${est.titulo}` });
		else avisar(est.resumen, 'aviso', { titulo: 'Estudio guardado sin valores' });
	} catch (e) {
		avisarError(e, 'No se pudo subir el estudio');
	} finally {
		ui.subiendo = false;
	}
}

/**
 * Grabación estilo WhatsApp: mantener apretado graba, soltar envía,
 * deslizar a la izquierda cancela. Usa el dictado nativo del navegador.
 */
export class Dictado {
	grabando = $state(false);
	transcripcion = $state('');
	segundos = $state(0);
	desplazamiento = $state(0);

	#rec;
	#sostenido = false;
	#cancelado = false;
	#inicio = 0;
	#inicioX = 0;
	#reloj;
	#acumulado = '';

	static soportado() {
		return typeof window !== 'undefined' && Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
	}

	#escuchar() {
		const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
		this.#rec = new SR();
		this.#rec.lang = 'es-AR';
		// En Android el modo continuo repite resultados; ahí se usa una frase por vez y se
		// vuelve a escuchar mientras se mantenga apretado (ver onend).
		this.#rec.continuous = !/android/i.test(navigator.userAgent);
		this.#rec.interimResults = true;
		this.#rec.maxAlternatives = 1;
		this.#rec.onresult = (e) => {
			const fragmentos = [this.#acumulado];
			for (const r of e.results) fragmentos.push(r[0].transcript);
			this.transcripcion = unirDictado(fragmentos);
		};
		this.#rec.onerror = (e) => {
			const err = ERRORES_VOZ[e.error];
			if (!err) return;
			this.#cancelado = true;
			this.#sostenido = false;
			avisar(err[1], 'error', { titulo: err[0], id: 'voz' });
		};
		this.#rec.onend = () => {
			// Chrome corta solo tras un silencio: si se sigue manteniendo apretado, sigue escuchando.
			if (this.#sostenido && !this.#cancelado) {
				this.#acumulado = this.transcripcion;
				this.#escuchar();
				return;
			}
			this.#terminar();
		};
		this.#rec.start();
	}

	presionar = (e) => {
		if (!window.isSecureContext) {
			avisar('Abrí SOMA con https:// para poder usar el micrófono.', 'error', { titulo: 'El micrófono necesita una conexión segura', id: 'voz' });
			return;
		}
		if (!Dictado.soportado()) {
			avisar('Usá Chrome, Edge o Safari, o escribí lo que te pasó.', 'aviso', { titulo: 'Este navegador no tiene dictado', id: 'voz' });
			return;
		}
		if (!navigator.onLine) {
			avisar('El dictado necesita internet para pasar tu voz a texto.', 'error', { titulo: 'Sin conexión', id: 'voz' });
			return;
		}
		e.preventDefault();
		e.currentTarget.setPointerCapture?.(e.pointerId);
		this.#sostenido = true;
		this.#cancelado = false;
		this.#acumulado = '';
		this.transcripcion = '';
		this.desplazamiento = 0;
		this.#inicio = Date.now();
		this.#inicioX = e.clientX;
		this.segundos = 0;
		this.grabando = true;
		navigator.vibrate?.(15);
		this.#reloj = setInterval(() => (this.segundos = Math.floor((Date.now() - this.#inicio) / 1000)), 250);
		try {
			this.#escuchar();
		} catch {
			this.grabando = false;
			clearInterval(this.#reloj);
		}
	};

	mover = (e) => {
		if (!this.grabando || !this.#sostenido) return;
		this.desplazamiento = Math.min(0, e.clientX - this.#inicioX);
		if (this.desplazamiento < -CANCELAR) {
			this.#cancelado = true;
			this.soltar();
		}
	};

	soltar = () => {
		if (!this.grabando || !this.#sostenido) return;
		this.#sostenido = false;
		if (Date.now() - this.#inicio < 400 && !this.transcripcion) {
			this.#cancelado = true;
			avisar('Mantenelo apretado mientras hablás y soltalo al terminar.', 'info', { titulo: 'Mantené apretado el micrófono', id: 'voz' });
		}
		clearInterval(this.#reloj);
		this.#rec?.stop();
	};

	#terminar() {
		this.grabando = false;
		this.desplazamiento = 0;
		const dicho = this.transcripcion.trim();
		this.transcripcion = '';
		if (this.#cancelado) return;
		if (dicho) registrar(dicho);
		else avisar('Hablá cerca del micrófono mientras lo mantenés apretado.', 'aviso', { titulo: 'No te escuché', id: 'voz' });
	}
}

const norm = (w) => w.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[.,;:!?¡¿]/g, '');

/**
 * Une fragmentos de dictado sin duplicar palabras. Chrome (sobre todo en Android) devuelve
 * resultados que repiten lo anterior: a veces el texto acumulado ("me doblé" → "me doblé el
 * tobillo") y a veces solapado ("me doblé" + "doblé el tobillo"). Se toma el solapamiento más
 * largo entre el final de lo que ya hay y el comienzo del fragmento nuevo, y solo se agrega lo nuevo.
 */
export function unirDictado(fragmentos) {
	let palabras = [];
	for (const f of fragmentos) {
		const nuevas = f.trim().split(/\s+/).filter(Boolean);
		if (!nuevas.length) continue;
		const a = palabras.map(norm), b = nuevas.map(norm);
		// ¿El fragmento nuevo ya contiene todo lo anterior (resultado acumulado)?
		if (a.length && b.length >= a.length && a.every((w, i) => w === b[i])) {
			palabras = nuevas;
			continue;
		}
		let solape = 0;
		for (let k = Math.min(a.length, b.length); k > 0; k--) {
			if (a.slice(-k).join(' ') === b.slice(0, k).join(' ')) {
				solape = k;
				break;
			}
		}
		palabras = palabras.concat(nuevas.slice(solape));
	}
	// Repeticiones pegadas que deja el reconocedor ("doble doble doble") → una sola.
	return palabras.filter((w, i) => i === 0 || norm(w).length < 3 || norm(w) !== norm(palabras[i - 1])).join(' ');
}

export const mmss = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
