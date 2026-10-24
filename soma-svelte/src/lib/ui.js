export const TIPOS = {
	sentir: { label: 'Cómo me siento', corto: 'Me siento', icon: 'heart' },
	consulta: { label: 'Consulta médica', corto: 'Consultas', icon: 'stethoscope' },
	cita: { label: 'Próxima cita', corto: 'Citas', icon: 'calendar' },
	estudio: { label: 'Estudio', corto: 'Estudios', icon: 'flask' },
	medicacion: { label: 'Medicación', corto: 'Medicación', icon: 'pill' }
};

const TZ = 'America/Argentina/Buenos_Aires';

export const hora = (iso) =>
	new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', timeZone: TZ });

export const fechaLarga = (iso) =>
	new Date(iso).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: TZ });

export const fechaCorta = (iso) =>
	new Date(iso.length === 10 ? iso + 'T12:00:00-03:00' : iso).toLocaleDateString('es-AR', {
		day: 'numeric', month: 'short', year: 'numeric', timeZone: TZ
	});

/** Clave de día (YYYY-MM-DD) en hora argentina. */
export const diaAR = (iso) => new Date(iso).toLocaleDateString('en-CA', { timeZone: TZ });

export function etiquetaDia(clave) {
	const hoy = diaAR(new Date().toISOString());
	const ayer = diaAR(new Date(Date.now() - 864e5).toISOString());
	if (clave === hoy) return 'Hoy';
	if (clave === ayer) return 'Ayer';
	const s = fechaLarga(clave + 'T12:00:00-03:00');
	return s[0].toUpperCase() + s.slice(1);
}

export function enCuanto(iso) {
	const dias = Math.round((new Date(diaAR(iso)) - new Date(diaAR(new Date().toISOString()))) / 864e5);
	if (dias <= 0) return 'hoy';
	if (dias === 1) return 'mañana';
	return `en ${dias} días`;
}

export const ESTADOS = {
	normal: { label: 'Normal', color: '#059669', bg: '#e8f8f1' },
	suboptimo: { label: 'Fuera del óptimo', color: '#b45309', bg: '#fff4e0' },
	bajo: { label: 'Bajo', color: '#dc2626', bg: '#fdeeee' },
	alto: { label: 'Alto', color: '#dc2626', bg: '#fdeeee' }
};
