// Motor de dictado sobre la Web Speech API, sin dependencias de la UI (se puede probar con un
// reconocedor falso). Lo usa la clase Dictado de dictado.svelte.js.

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

/**
 * Escucha mientras esté activo y entrega el texto UNA sola vez al terminar.
 * Cada sesión del reconocedor es una frase; las pausas se cubren reabriéndolo en onend.
 */
export class MotorVoz {
	#SR;
	#rec = null;
	#activo = false;
	#entregado = true;
	#previas = ''; // texto de las sesiones ya cerradas
	#sesion = ''; // texto de la sesión en curso (reconstruido entero en cada onresult)

	constructor(SR, { onTexto, onFin, onError, lang = 'es-AR' }) {
		this.#SR = SR;
		this.onTexto = onTexto;
		this.onFin = onFin;
		this.onError = onError;
		this.lang = lang;
	}

	iniciar() {
		this.#activo = true;
		this.#entregado = false;
		this.#previas = '';
		this.#sesion = '';
		try {
			this.#abrir();
		} catch {
			this.#fallar('start');
		}
	}

	/** Deja de escuchar; el texto se entrega en el onend de la sesión abierta. */
	detener() {
		this.#activo = false;
		try {
			this.#rec?.stop();
		} catch {
			this.#entregar();
		}
	}

	/** Corta sin entregar nada (deslizar para cancelar, salir de la pantalla). */
	cancelar() {
		this.#activo = false;
		this.#entregado = true;
		const rec = this.#rec;
		this.#rec = null;
		try {
			rec?.abort();
		} catch {
			// ya estaba cerrado
		}
	}

	#abrir() {
		const rec = new this.#SR();
		this.#rec = rec;
		this.#sesion = '';
		rec.lang = this.lang;
		// continuous = false siempre: Chrome de Android acepta true pero se reinicia por dentro y
		// apila cada versión parcial en results, y el texto sale duplicado.
		rec.continuous = false;
		rec.interimResults = true;
		rec.maxAlternatives = 1;
		rec.onresult = (e) => {
			if (this.#rec !== rec) return;
			// Se reconstruye la sesión entera desde el índice 0 y se ASIGNA: sumar desde resultIndex
			// repite los resultados finales que Chrome a veces reemite.
			const fragmentos = [];
			for (let i = 0; i < e.results.length; i++) fragmentos.push(e.results[i][0].transcript);
			this.#sesion = unirDictado(fragmentos);
			this.onTexto?.(unirDictado([this.#previas, this.#sesion]));
		};
		rec.onerror = (e) => {
			if (this.#rec !== rec) return;
			// Sin voz en una pausa o sesión cortada: no es un error, onend vuelve a abrir.
			if (e.error === 'no-speech' || e.error === 'aborted') return;
			this.#fallar(e.error);
		};
		rec.onend = () => {
			if (this.#rec !== rec) return;
			this.#previas = unirDictado([this.#previas, this.#sesion]);
			this.#sesion = '';
			if (!this.#activo) return this.#entregar();
			try {
				this.#abrir();
			} catch {
				this.#activo = false;
				this.#entregar();
			}
		};
		rec.start();
	}

	#fallar(codigo) {
		this.#activo = false;
		this.#entregado = true;
		const rec = this.#rec;
		this.#rec = null;
		try {
			rec?.abort();
		} catch {
			// ya estaba cerrado
		}
		this.onError?.(codigo);
	}

	#entregar() {
		if (this.#entregado) return;
		this.#entregado = true;
		this.#rec = null;
		this.onFin?.(unirDictado([this.#previas, this.#sesion]));
	}
}
