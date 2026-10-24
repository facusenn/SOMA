import { env } from '$env/dynamic/private';
import https from 'node:https';

const URL = 'https://openrouter.ai/api/v1/chat/completions';

// node:https con IPv4 y Content-Length: en algunas redes el fetch de Node (undici) y los
// envíos sin largo fijo se quedan colgados.
function postJSON(url, headers, body) {
	return new Promise((resolve, reject) => {
		headers = { ...headers, 'Content-Length': Buffer.byteLength(body) };
		const req = https.request(url, { method: 'POST', headers, family: 4, timeout: 90000 }, (res) => {
			let data = '';
			res.on('data', (c) => (data += c));
			res.on('end', () => resolve({ status: res.statusCode, text: data }));
		});
		req.on('timeout', () => req.destroy(new Error('Timeout de OpenRouter')));
		req.on('error', reject);
		req.end(body);
	});
}

export const conIA = () => Boolean(env.OPENROUTER_API_KEY);

async function llamar(model, messages, max_tokens = 1500, intentos = 2) {
	try {
		return await llamarUnaVez(model, messages, max_tokens);
	} catch (e) {
		if (intentos <= 1) throw e;
		console.warn('Reintentando OpenRouter:', e.message);
		return llamar(model, messages, max_tokens, intentos - 1);
	}
}

async function llamarUnaVez(model, messages, max_tokens) {
	const res = await postJSON(
		URL,
		{
			Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
			'Content-Type': 'application/json',
			'X-Title': 'SOMA'
		},
		JSON.stringify({ model, messages, max_tokens, temperature: 0.2 })
	);
	if (res.status !== 200) throw new Error(`OpenRouter ${res.status}: ${res.text.slice(0, 300)}`);
	const data = JSON.parse(res.text);
	const texto = data.choices?.[0]?.message?.content ?? '';
	if (data.choices?.[0]?.finish_reason === 'length') throw new Error('Respuesta cortada por largo');
	const json = texto.slice(texto.indexOf('{'), texto.lastIndexOf('}') + 1);
	return JSON.parse(json);
}

const rapido = () => env.OPENROUTER_MODEL_FAST || 'anthropic/claude-haiku-5.5';
const potente = () => env.OPENROUTER_MODEL || 'anthropic/claude-sonnet-5.5';

const SISTEMA_EVENTO = `Sos el registrador de SOMA, una plataforma donde una persona dicta lo que le pasa con su salud.
Convertí el dictado en UN evento. Respondé SOLO un objeto JSON, sin texto extra:
{
 "tipo": "sentir" | "consulta" | "cita" | "estudio" | "medicacion",
 "titulo": string corto (máx 6 palabras),
 "resumen": una oración en tercera persona,
 "fecha": ISO 8601 con zona -03:00 de cuándo ocurrió (por defecto, ahora),
 "sintomas": [strings], "comidas": [strings],
 "intensidad": 1-10 del malestar o null (si dice "energía 3 de 10", el malestar es 7),
 "medico": string|null, "especialidad": string|null, "lugar": string|null,
 "indicaciones": [strings], "medicamento": string|null, "dosis": string|null,
 "cita_fecha": ISO 8601 de la cita futura o null
}
Tipos: "sentir" = cómo se siente, síntomas, comidas; "consulta" = fue al médico y qué le dijo; "cita" = turno o cita futura;
"estudio" = recibió o se hizo un estudio; "medicacion" = le recetaron o empezó/dejó un remedio.
Resolvé fechas relativas ("ayer", "el lunes que viene") contra la fecha actual que te paso. No inventes datos.`;

export async function procesarEvento(texto, ahora) {
	return llamar(rapido(), [
		{ role: 'system', content: SISTEMA_EVENTO },
		{ role: 'user', content: `Fecha y hora actual: ${ahora}\nDictado: "${texto}"` }
	]);
}

const SISTEMA_ESTUDIO = `Leé el estudio médico adjunto y extraé sus datos. Respondé SOLO JSON:
{
 "fecha": "YYYY-MM-DD", "tipo": string (ej. "Análisis de sangre", "Perfil tiroideo", "Ecografía"),
 "titulo": string corto, "lugar": nombre del laboratorio o institución que figura en el estudio, o null,
 "resumen": una oración simple para el paciente,
 "valores": [{"nombre": string, "valor": number, "unidad": string, "min": number|null, "max": number|null,
   "estado": "normal"|"bajo"|"alto"|"suboptimo", "optimo": string|null}]
}
Nombres: usá el nombre común y corto, sin método ni aclaraciones (ej. "Vitamina D", no "Vitamina D (25-OH)";
"Hemoglobina", "Ferritina", "TSH", "T4 libre", "Vitamina B12", "Glucosa", "Magnesio", "Colesterol total").
Estado: "bajo"/"alto" si está fuera del rango del laboratorio. "suboptimo" si está dentro del rango pero lejos del
óptimo publicado; usá estos óptimos y ponelos en "optimo": Ferritina ">50", Vitamina B12 ">400", TSH "0.5–2.5",
Vitamina D ">30", Magnesio ">2.0", Hemoglobina mujer ">12.5". Si no aplica, "optimo": null.
Si es un informe sin valores numéricos (imagen, ecografía), dejá "valores" vacío y poné las conclusiones en "resumen".`;

export async function extraerEstudio(nombre, mime, base64) {
	const adjunto = mime.startsWith('image/')
		? { type: 'image_url', image_url: { url: `data:${mime};base64,${base64}` } }
		: { type: 'file', file: { filename: nombre, file_data: `data:${mime};base64,${base64}` } };
	return llamar(
		potente(),
		[
			{ role: 'system', content: SISTEMA_ESTUDIO },
			{ role: 'user', content: [{ type: 'text', text: `Archivo: ${nombre}` }, adjunto] }
		],
		2500
	);
}

const SISTEMA_ANALISIS = `Sos el motor de análisis de SOMA. Con el historial de eventos y los estudios de una persona,
armá las 10 posibilidades más probables de lo que podría estar padeciendo, ordenadas de más a menos probable.
No es un diagnóstico: es para que la persona lo hable con su médico. Lenguaje simple, rioplatense, sin tecnicismos innecesarios.
Respondé SOLO JSON:
{"items": [{
 "posibilidad": nombre simple (con el término médico entre paréntesis si ayuda),
 "probabilidad": entero 1-99,
 "por_que": 1-2 oraciones citando datos concretos del historial (valores, fechas, síntomas repetidos),
 "evidencia": [ids de eventos o estudios que la sostienen],
 "estudio": qué estudio hacerse para descartarla,
 "decirle": frase en primera persona, lista para leerle al médico,
 "alerta": "alta" | "media" | "baja" (qué tan importante es mostrárselo al médico pronto)
}]}
Dentro de los textos no uses comillas dobles (usá comillas simples si hace falta).
Si hay señales de urgencia (dolor de pecho, síntomas neurológicos agudos), poné esa posibilidad primero, con "alerta": "urgente", y en "estudio" indicá ir a una guardia.`;

export async function analizar(db) {
	const eventos = db.eventos.map(({ id, tipo, fecha, texto, sintomas, comidas, intensidad, indicaciones, medicamento, dosis }) => ({
		id, tipo, fecha, texto, sintomas, comidas, intensidad, indicaciones, medicamento, dosis
	}));
	const estudios = db.estudios.map(({ id, fecha, tipo, resumen, valores }) => ({ id, fecha, tipo, resumen, valores }));
	return llamar(
		potente(),
		[
			{ role: 'system', content: SISTEMA_ANALISIS },
			{ role: 'user', content: JSON.stringify({ paciente: db.paciente, eventos, estudios }) }
		],
		8000
	);
}
