import { invalidate } from '$app/navigation';
import { avisar, avisarError } from '$lib/toast.svelte.js';
import { api, subir, validarArchivo } from '$lib/api.js';
import { ui } from '$lib/estado.svelte.js';
import { TIPOS } from '$lib/ui.js';
import { MotorVoz } from '$lib/motorVoz.js';

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
	ui.subida = { nombre: archivo.name, progreso: 0 };
	const form = new FormData();
	form.append('archivo', archivo);
	if (ui.pendienteEstudio) form.append('evento_id', ui.pendienteEstudio.id);
	try {
		const est = await subir('/api/estudios', form, (p) => ui.subida && (ui.subida.progreso = p));
		ui.pendienteEstudio = null;
		await invalidate('soma:db');
		if (est.valores?.length)
			avisar(`${est.valores.length} valores leídos y ordenados`, 'ok', { titulo: `Estudio guardado: ${est.titulo}` });
		else avisar(est.resumen, 'aviso', { titulo: 'Estudio guardado sin valores' });
	} catch (e) {
		avisarError(e, 'No se pudo subir el estudio');
	} finally {
		ui.subiendo = false;
		ui.subida = null;
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

	#motor = null;
	#sostenido = false;
	#inicio = 0;
	#inicioX = 0;
	#reloj;

	static soportado() {
		return typeof window !== 'undefined' && Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
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
		if (this.grabando) return;
		e.preventDefault();
		e.currentTarget.setPointerCapture?.(e.pointerId);
		this.#sostenido = true;
		this.transcripcion = '';
		this.desplazamiento = 0;
		this.#inicio = Date.now();
		this.#inicioX = e.clientX;
		this.segundos = 0;
		this.grabando = true;
		navigator.vibrate?.(15);
		this.#reloj = setInterval(() => (this.segundos = Math.floor((Date.now() - this.#inicio) / 1000)), 250);
		this.#motor = new MotorVoz(window.SpeechRecognition || window.webkitSpeechRecognition, {
			onTexto: (t) => (this.transcripcion = t),
			onFin: (t) => this.#terminar(t),
			onError: (codigo) => {
				this.#cerrar();
				const err = ERRORES_VOZ[codigo] ?? ['No se pudo usar el micrófono', 'Probá de nuevo o escribí lo que te pasó.'];
				avisar(err[1], 'error', { titulo: err[0], id: 'voz' });
			}
		});
		this.#motor.iniciar();
	};

	mover = (e) => {
		if (!this.grabando || !this.#sostenido) return;
		this.desplazamiento = Math.min(0, e.clientX - this.#inicioX);
		if (this.desplazamiento < -CANCELAR) this.cancelar();
	};

	soltar = () => {
		if (!this.grabando || !this.#sostenido) return;
		this.#sostenido = false;
		clearInterval(this.#reloj);
		if (Date.now() - this.#inicio < 400 && !this.transcripcion) {
			this.cancelar();
			avisar('Mantenelo apretado mientras hablás y soltalo al terminar.', 'info', { titulo: 'Mantené apretado el micrófono', id: 'voz' });
			return;
		}
		this.#motor?.detener();
	};

	/** Corta sin registrar nada: deslizar para cancelar o salir de la pantalla. */
	cancelar = () => {
		this.#motor?.cancelar();
		this.#cerrar();
	};

	#cerrar() {
		this.#motor = null;
		this.#sostenido = false;
		clearInterval(this.#reloj);
		this.grabando = false;
		this.desplazamiento = 0;
		this.transcripcion = '';
	}

	#terminar(texto) {
		this.#cerrar();
		const dicho = texto.trim();
		if (dicho) registrar(dicho);
		else avisar('Hablá cerca del micrófono mientras lo mantenés apretado.', 'aviso', { titulo: 'No te escuché', id: 'voz' });
	}
}

export const mmss = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
