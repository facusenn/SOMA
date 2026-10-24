import { invalidate } from '$app/navigation';
import { avisar } from '$lib/toast.svelte.js';
import { ui } from '$lib/estado.svelte.js';
import { TIPOS } from '$lib/ui.js';

export const CANCELAR = 110;

/** Registra un evento a partir de texto y refresca la app. */
export async function registrar(texto) {
	ui.procesando = texto;
	try {
		const res = await fetch('/api/eventos', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ texto })
		});
		if (!res.ok) throw new Error();
		const ev = await res.json();
		ui.ultimoId = ev.id;
		ui.ultimo = ev;
		if (ev.tipo === 'estudio') ui.pendienteEstudio = ev;
		await invalidate('soma:db');
		avisar(`Registrado en ${TIPOS[ev.tipo].label}`);
		return ev;
	} catch {
		avisar('No se pudo registrar. Probá de nuevo.', 'error');
	} finally {
		ui.procesando = null;
	}
}

/** Sube un estudio; si hay un evento de estudio pendiente, lo vincula. */
export async function subirEstudio(archivo) {
	if (!archivo) return;
	ui.subiendo = true;
	const form = new FormData();
	form.append('archivo', archivo);
	if (ui.pendienteEstudio) form.append('evento_id', ui.pendienteEstudio.id);
	try {
		const res = await fetch('/api/estudios', { method: 'POST', body: form });
		if (!res.ok) throw new Error();
		const est = await res.json();
		ui.pendienteEstudio = null;
		await invalidate('soma:db');
		avisar(`Estudio guardado: ${est.titulo}`);
	} catch {
		avisar('No se pudo subir el estudio', 'error');
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
		this.#rec.continuous = true;
		this.#rec.interimResults = true;
		this.#rec.onresult = (e) => {
			let texto = '';
			for (const r of e.results) texto += r[0].transcript;
			this.transcripcion = (this.#acumulado + ' ' + texto).replace(/\s+/g, ' ').trim();
		};
		this.#rec.onerror = (e) => {
			if (e.error === 'not-allowed') avisar('Necesitamos permiso para usar el micrófono', 'error');
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
		if (!Dictado.soportado()) {
			avisar('Tu navegador no soporta dictado. Probá con Chrome o escribilo.', 'error');
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
			avisar('Mantené apretado el micrófono para hablar');
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
		else avisar('No te escuché. Probá de nuevo.', 'error');
	}
}

export const mmss = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
