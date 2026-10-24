// Modo demo: reglas simples cuando no hay key de OpenRouter.
const reglas = [
	['cita', /(turno|cita|tengo (que ir|consulta)|el (lunes|martes|miércoles|jueves|viernes)|mañana tengo)/i],
	['estudio', /(estudio|análisis|analisis|resultado|laboratorio|ecograf|radiograf)/i],
	['medicacion', /(recet|pastilla|remedio|tomo |tomar|mg\b|ibuprofeno|omeprazol|antibi)/i],
	['consulta', /(fui al|fui a la|doctor|doctora|médic|medic|me dijo)/i]
];

export function eventoDemo(texto, ahora) {
	const tipo = reglas.find(([, r]) => r.test(texto))?.[0] ?? 'sentir';
	const titulos = { sentir: 'Cómo me siento', consulta: 'Consulta médica', cita: 'Próxima cita', estudio: 'Nuevo estudio', medicacion: 'Medicación' };
	const cita = new Date(ahora);
	cita.setDate(cita.getDate() + 3);
	cita.setHours(10, 0, 0, 0);
	return {
		tipo,
		titulo: titulos[tipo],
		resumen: texto,
		fecha: ahora,
		sintomas: [], comidas: [], intensidad: null, medico: null, especialidad: null, lugar: null,
		indicaciones: [], medicamento: null, dosis: null,
		cita_fecha: tipo === 'cita' ? cita.toISOString() : null
	};
}
