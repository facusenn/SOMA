"""Datos demo: Lucía, 29 años, 8 meses con fatiga y dolor abdominal, 3 médicos, sin respuesta."""
import json

ENTRADAS = [
    ("2026-02-12", "Muy cansada hace semanas, me cuesta levantarme. El clínico dijo que es estrés.", "Semanas", 2, 2, 1,
     {"sintomas": [{"nombre": "fatiga", "zona": None, "intensidad": 7, "cuando": "hace semanas"}],
      "contexto": ["estrés laboral", "consulta clínico: 'estrés'"], "resumen": "Fatiga persistente; atribuida a estrés."}),
    ("2026-03-20", "Me hincho después de comer, sobre todo pastas y pan. Dolor de panza tipo retorcijón.", "Meses", 3, 3, 2,
     {"sintomas": [{"nombre": "distensión abdominal", "zona": "abdomen", "intensidad": 6, "cuando": "post comidas"},
                   {"nombre": "dolor cólico", "zona": "abdomen", "intensidad": 5, "cuando": "post comidas"}],
      "contexto": ["pastas", "pan"], "resumen": "Distensión y dolor cólico tras comer harinas."}),
    ("2026-05-02", "Gastro me dijo colon irritable. Me dio antiespasmódico, no cambió mucho.", "Meses", 2, 3, 2,
     {"sintomas": [{"nombre": "dolor abdominal", "zona": "abdomen", "intensidad": 5, "cuando": None}],
      "contexto": ["diagnóstico previo: colon irritable", "antiespasmódico sin mejoría"],
      "resumen": "Diagnóstico de colon irritable; tratamiento sin respuesta."}),
    ("2026-06-15", "Se me cae mucho el pelo y tengo aftas en la boca seguido. Diarrea 2-3 veces por semana.", "Meses", 2, 2, 2,
     {"sintomas": [{"nombre": "caída de cabello", "zona": "cuero cabelludo", "intensidad": 5, "cuando": None},
                   {"nombre": "aftas orales", "zona": "boca", "intensidad": 4, "cuando": "recurrente"},
                   {"nombre": "diarrea", "zona": "intestino", "intensidad": 6, "cuando": "2-3 veces/semana"}],
      "contexto": [], "resumen": "Caída de cabello, aftas recurrentes y diarrea intermitente."}),
    ("2026-08-03", "Perdí 4 kilos sin hacer dieta. Me mareo al pararme rápido.", "Meses", 2, 3, 1,
     {"sintomas": [{"nombre": "pérdida de peso", "zona": None, "intensidad": None, "cuando": "últimos meses"},
                   {"nombre": "mareo ortostático", "zona": None, "intensidad": 5, "cuando": "al pararse"}],
      "contexto": ["sin dieta"], "resumen": "Pérdida de 4 kg involuntaria y mareos al incorporarse."}),
    ("2026-09-28", "Fui a la guardia por el mareo, me dijeron que tome más agua. Sigo hinchada después de comer.", "Meses", 2, 2, 1,
     {"sintomas": [{"nombre": "mareo", "zona": None, "intensidad": 6, "cuando": None},
                   {"nombre": "distensión abdominal", "zona": "abdomen", "intensidad": 7, "cuando": "post comidas"}],
      "contexto": ["guardia: hidratación"], "resumen": "Consulta en guardia por mareos; persiste distensión."}),
    ("2026-10-20", "Ánimo bajo, siento que nadie me cree. Duermo mal. La panza igual.", "Meses", 1, 2, 1,
     {"sintomas": [{"nombre": "ánimo bajo", "zona": None, "intensidad": 7, "cuando": None},
                   {"nombre": "insomnio", "zona": None, "intensidad": 6, "cuando": None}],
      "contexto": ["frustración con el sistema de salud"], "resumen": "Ánimo bajo e insomnio; síntomas digestivos persisten.",
      "mirada_emocional": "Ocho meses de síntomas sin respuestas desgastan a cualquiera, y esa frustración puede hacer que duermas peor y que el cuerpo se sienta más pesado. ¿Con quién podés compartir cómo te está afectando esto? Hablar con un psicólogo mientras seguís estudiando la causa física puede ayudarte a transitarlo."}),
]


# Estudios de tres instituciones distintas: la historia es de la paciente, no del sanatorio.
ESTUDIOS = [
    ("2026-02-20", "Hospital Provincial de Rosario (público)", "analisis_febrero.jpg", {
        "tipo": "Hemograma y química básica", "fecha": "2026-02-20",
        "valores": [
            {"nombre": "Hemoglobina", "valor": "12.3", "unidad": "g/dL", "referencia": "12-16", "fuera_de_rango": False},
            {"nombre": "Ferritina", "valor": "22", "unidad": "ng/mL", "referencia": "15-150", "fuera_de_rango": False},
            {"nombre": "TSH", "valor": "2.1", "unidad": "mUI/L", "referencia": "0.4-4.0", "fuera_de_rango": False},
            {"nombre": "Glucemia", "valor": "88", "unidad": "mg/dL", "referencia": "70-110", "fuera_de_rango": False},
        ],
        "resumen": "Todo dentro del rango de referencia: informado como normal.",
    }),
    ("2026-07-10", "Sanatorio Parque (prepaga)", "laboratorio_julio.pdf", {
        "tipo": "Análisis de sangre de rutina", "fecha": "2026-07-10",
        "valores": [
            {"nombre": "Hemoglobina", "valor": "10.8", "unidad": "g/dL", "referencia": "12-16", "fuera_de_rango": True},
            {"nombre": "Ferritina", "valor": "8", "unidad": "ng/mL", "referencia": "15-150", "fuera_de_rango": True},
            {"nombre": "VCM", "valor": "76", "unidad": "fL", "referencia": "80-100", "fuera_de_rango": True},
            {"nombre": "Vitamina B12", "valor": "260", "unidad": "pg/mL", "referencia": "200-900", "fuera_de_rango": False},
            {"nombre": "GOT", "valor": "41", "unidad": "U/L", "referencia": "5-35", "fuera_de_rango": True},
        ],
        "resumen": "Hemoglobina y hierro bajos (anemia por falta de hierro). B12 dentro del rango pero baja. Transaminasa levemente alta.",
    }),
    ("2026-09-28", "Guardia Hospital Centenario (público)", "guardia_septiembre.jpg", {
        "tipo": "Laboratorio de guardia", "fecha": "2026-09-28",
        "valores": [
            {"nombre": "Hemoglobina", "valor": "10.5", "unidad": "g/dL", "referencia": "12-16", "fuera_de_rango": True},
            {"nombre": "Glucemia", "valor": "82", "unidad": "mg/dL", "referencia": "70-110", "fuera_de_rango": False},
            {"nombre": "Sodio", "valor": "139", "unidad": "mEq/L", "referencia": "135-145", "fuera_de_rango": False},
        ],
        "resumen": "Hemoglobina sigue baja. Resto sin alteraciones.",
    }),
]

# Casos anónimos de la comunidad (en producción: agregados con consentimiento).
COMUNIDAD = [
    {"patron": "fatiga + distensión post harinas + anemia ferropénica + aftas", "casos": 37,
     "les_sirvio": "Pedir anticuerpos anti-transglutaminasa IgA + IgA total; derivación a gastro para endoscopía con biopsia",
     "resultado_frecuente": "En 21 de 37 se confirmó enfermedad celíaca"},
    {"patron": "diarrea intermitente + pérdida de peso + anemia", "casos": 22,
     "les_sirvio": "Calprotectina fecal; colonoscopía según edad",
     "resultado_frecuente": "Varios con enfermedad inflamatoria intestinal"},
    {"patron": "fatiga + ánimo bajo + insomnio sin alteraciones de laboratorio", "casos": 54,
     "les_sirvio": "Evaluación de salud mental y hábitos de sueño",
     "resultado_frecuente": "Mejoría con abordaje integral"},
]


def seed(conn):
    for fecha, texto, duracion, animo, sueno, energia, est in ENTRADAS:
        conn.execute(
            "INSERT INTO entradas (fecha, texto, duracion, animo, sueno, energia, estructura) VALUES (?,?,?,?,?,?,?)",
            (fecha, texto, duracion, animo, sueno, energia, json.dumps(est, ensure_ascii=False)),
        )
    for fecha, institucion, nombre, ext in ESTUDIOS:
        conn.execute(
            "INSERT INTO estudios (fecha, institucion, nombre_archivo, extraccion) VALUES (?,?,?,?)",
            (fecha, institucion, nombre, json.dumps(ext, ensure_ascii=False)),
        )


# ---------- respaldos: se muestran si no hay API key o Claude no responde ----------

EMOCIONAL_FALLBACK = (
    "Lo que sentís en el cuerpo también puede estar acompañado por lo que estás viviendo: el estrés sostenido "
    "aumenta la tensión muscular y puede intensificar el dolor. ¿Pasó algo estos días que te haya cargado? "
    "Probá una pausa de respiración lenta de 3 minutos, y si se repite, hablarlo con alguien de confianza o un psicólogo."
)

CONSULTA_FALLBACK = """## Motivo de consulta (en palabras del paciente)
"Hace 8 meses estoy cansada, me hincho después de comer y siento que nadie me cree."

## Línea de tiempo
- **Feb 2026**: fatiga persistente. Clínico: atribuido a estrés. Laboratorio en **Hospital Provincial (público)** informado como normal.
- **Mar 2026**: distensión y dolor cólico después de comer pastas y pan.
- **May 2026**: gastroenterología: colon irritable. Antiespasmódico sin mejoría.
- **Jun 2026**: caída de cabello, aftas orales recurrentes, diarrea 2-3 veces por semana.
- **Jul 2026**: laboratorio en **Sanatorio Parque (prepaga)**: anemia microcítica, ferritina 8.
- **Ago 2026**: pérdida de 4 kg involuntaria, mareos ortostáticos.
- **Sep 2026**: **Guardia Hospital Centenario**: Hb 10.5, indicación de hidratación.
- **Oct 2026**: ánimo bajo, insomnio, síntomas digestivos persistentes.

## Síntomas recurrentes
| Síntoma | Desde cuándo | Intensidad prom. | Factores asociados |
|---|---|---|---|
| Fatiga | Feb 2026 | 7/10 | Empeora con el tiempo |
| Distensión abdominal | Mar 2026 | 6.5/10 | Después de harinas |
| Diarrea | Jun 2026 | 6/10 | Sin desencadenante claro |
| Aftas orales | Jun 2026 | 4/10 | |
| Mareo ortostático | Ago 2026 | 5.5/10 | Al incorporarse |

## Bienestar emocional y general
Ánimo, sueño y energía en descenso sostenido (promedio 2/5). Refiere frustración por consultas sin respuesta.

## Estudios: valores a revisar
| Valor | Resultado | Referencia | Óptimo | Estado | Institución y fecha |
|---|---|---|---|---|---|
| Ferritina | 22 → **8** ng/mL | 15-150 | 50-150 | Bajo del óptimo → **bajo** | Público feb → Prepaga jul |
| Hemoglobina | 12.3 → **10.8** → **10.5** g/dL | 12-16 | 13-15.5 | Bajo del óptimo → **bajo** | Feb → Jul → Sep |
| VCM | **76** fL | 80-100 | | **Bajo** | Prepaga jul |
| Vitamina B12 | 260 pg/mL | 200-900 | 400-900 | Bajo del óptimo | Prepaga jul |
| GOT | **41** U/L | 5-35 | | **Alto** | Prepaga jul |

**Tendencia:** en febrero la ferritina y la hemoglobina ya estaban en el límite inferior aunque se informaron como normales.

## Estudios que todavía no aparecen en la historia
- **Anticuerpos anti-transglutaminasa IgA + IgA total**: ¿corresponde descartar celiaquía ante anemia ferropénica sin causa clara?
- **Vitamina D, ácido fólico, zinc**: déficits frecuentes cuando hay malabsorción.
- **Calprotectina fecal**: ante diarrea intermitente y pérdida de peso.

## Patrones en casos similares de la comunidad
37 personas con un patrón parecido (fatiga, distensión con harinas, anemia ferropénica y aftas) registraron que les fue útil pedir **anticuerpos anti-transglutaminasa IgA con IgA total** y una derivación a gastroenterología para evaluar **endoscopía con biopsia**. _Información orientativa y anónima, no es una indicación._

## Preguntas que el paciente quiere hacer
1. ¿La anemia con ferritina baja puede deberse a un problema de absorción?
2. ¿Corresponde descartar enfermedad celíaca antes de cambiar la dieta?
3. ¿La transaminasa elevada se relaciona con el resto del cuadro?
4. ¿Hace falta suplementar hierro o B12 mientras se estudia?
5. ¿Qué seguimiento me sugiere para el ánimo y el sueño?

_Resumen generado con AI a partir de registros del paciente. No reemplaza el criterio médico._
"""

FALTANTES_FALLBACK = """## Lo que ya te hiciste
Hemograma (3 veces), ferritina, TSH, glucemia, B12, GOT y sodio, en un hospital público, una prepaga y una guardia.

## ¿Te hiciste ver esto?
- **Anticuerpos anti-transglutaminasa IgA + IgA total**: la anemia por falta de hierro con hinchazón después de las harinas a veces tiene que ver con la absorción.
- **Vitamina D (25-OH)**: no aparece en ninguno de tus estudios y su déficit se asocia a cansancio.
- **Ácido fólico y zinc**: suelen bajar junto con el hierro cuando el intestino no absorbe bien; las aftas y la caída de pelo son motivo frecuente para mirarlos.
- **Magnesio**: puede influir en el cansancio y el sueño.
- **Calprotectina fecal**: ayuda a evaluar inflamación intestinal ante diarrea y pérdida de peso.
- **Hepatograma completo**: la GOT apareció alta una vez y no se repitió.

## Valores "normales" que conviene mirar de nuevo
- **Ferritina 22** (febrero): dentro del rango (15-150) pero bajo del óptimo (50-150). Cinco meses después estaba en 8.
- **Hemoglobina 12.3** (febrero): en el límite inferior.
- **Vitamina B12 260** (julio): dentro del rango pero bajo del óptimo (400-900).

_Llevá esta lista como preguntas a tu médico: es quien decide qué estudios corresponden._
"""

TRANSCRIPCION_EJEMPLO = (
    "Médica: Hola Lucía, contame qué te trae. "
    "Paciente: Hace ocho meses que estoy muy cansada, me hincho cuando como pan o pastas y tengo diarrea un par de veces por semana. "
    "Médica: Veo en tu resumen que la ferritina bajó de 22 a 8 y la hemoglobina está en 10.5. ¿Perdiste peso? "
    "Paciente: Sí, cuatro kilos sin hacer dieta. "
    "Médica: Te palpo el abdomen... está blando, algo distendido, sin dolor a la palpación. "
    "Bueno, con este cuadro quiero descartar enfermedad celíaca. Te pido anticuerpos antitransglutaminasa IgA con IgA total, "
    "vitamina D, ácido fólico y un hepatograma. No dejes de comer gluten hasta tener el resultado. "
    "Te indico hierro por boca y te veo en tres semanas con los análisis."
)

NOTA_FALLBACK = """## S: Subjetivo
Paciente de 29 años con astenia de 8 meses de evolución, distensión abdominal posprandial asociada a harinas, diarrea 2-3 veces por semana y pérdida de peso de 4 kg no intencional.

## O: Objetivo
Abdomen blando, levemente distendido, no doloroso a la palpación. Laboratorio previo: ferritina 22 → 8 ng/mL; Hb 10.5 g/dL.

## A: Evaluación
Anemia ferropénica con síntomas digestivos. Se plantea descartar enfermedad celíaca.

## P: Plan
- Anticuerpos antitransglutaminasa IgA + IgA total.
- Vitamina D, ácido fólico, hepatograma.
- Hierro vía oral.
- No suspender gluten hasta tener resultados.
- Control en 3 semanas con análisis.

## Para el paciente
Hablamos de tu cansancio y de la anemia. Te vas a hacer análisis para ver si el problema es de absorción (celiaquía), sin dejar el gluten todavía. Mientras, tomás hierro y volvés en 3 semanas.
"""
