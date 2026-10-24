"""Datos demo: Lucía, 29 años, 8 meses con fatiga y dolor abdominal, 3 médicos, sin respuesta."""
import json

ENTRADAS = [
    ("2026-02-12", "Muy cansada hace semanas, me cuesta levantarme. El clínico dijo que es estrés.", 2, 2, 1,
     {"sintomas": [{"nombre": "fatiga", "zona": None, "intensidad": 7, "cuando": "hace semanas"}],
      "contexto": ["estrés laboral", "consulta clínico: 'estrés'"], "resumen": "Fatiga persistente; atribuida a estrés."}),
    ("2026-03-20", "Me hincho después de comer, sobre todo pastas y pan. Dolor de panza tipo retorcijón.", 3, 3, 2,
     {"sintomas": [{"nombre": "distensión abdominal", "zona": "abdomen", "intensidad": 6, "cuando": "post comidas"},
                   {"nombre": "dolor cólico", "zona": "abdomen", "intensidad": 5, "cuando": "post comidas"}],
      "contexto": ["pastas", "pan"], "resumen": "Distensión y dolor cólico tras comer harinas."}),
    ("2026-05-02", "Gastro me dijo colon irritable. Me dio antiespasmódico, no cambió mucho.", 2, 3, 2,
     {"sintomas": [{"nombre": "dolor abdominal", "zona": "abdomen", "intensidad": 5, "cuando": None}],
      "contexto": ["diagnóstico previo: colon irritable", "antiespasmódico sin mejoría"],
      "resumen": "Diagnóstico de colon irritable; tratamiento sin respuesta."}),
    ("2026-06-15", "Se me cae mucho el pelo y tengo aftas en la boca seguido. Diarrea 2-3 veces por semana.", 2, 2, 2,
     {"sintomas": [{"nombre": "caída de cabello", "zona": "cuero cabelludo", "intensidad": 5, "cuando": None},
                   {"nombre": "aftas orales", "zona": "boca", "intensidad": 4, "cuando": "recurrente"},
                   {"nombre": "diarrea", "zona": "intestino", "intensidad": 6, "cuando": "2-3 veces/semana"}],
      "contexto": [], "resumen": "Caída de cabello, aftas recurrentes y diarrea intermitente."}),
    ("2026-08-03", "Perdí 4 kilos sin hacer dieta. Me mareo al pararme rápido.", 2, 3, 1,
     {"sintomas": [{"nombre": "pérdida de peso", "zona": None, "intensidad": None, "cuando": "últimos meses"},
                   {"nombre": "mareo ortostático", "zona": None, "intensidad": 5, "cuando": "al pararse"}],
      "contexto": ["sin dieta"], "resumen": "Pérdida de 4 kg involuntaria y mareos al incorporarse."}),
    ("2026-09-28", "Fui a la guardia por el mareo, me dijeron que tome más agua. Sigo hinchada después de comer.", 2, 2, 1,
     {"sintomas": [{"nombre": "mareo", "zona": None, "intensidad": 6, "cuando": None},
                   {"nombre": "distensión abdominal", "zona": "abdomen", "intensidad": 7, "cuando": "post comidas"}],
      "contexto": ["guardia: hidratación"], "resumen": "Consulta en guardia por mareos; persiste distensión."}),
    ("2026-10-20", "Ánimo bajo, siento que nadie me cree. Duermo mal. La panza igual.", 1, 2, 1,
     {"sintomas": [{"nombre": "ánimo bajo", "zona": None, "intensidad": 7, "cuando": None},
                   {"nombre": "insomnio", "zona": None, "intensidad": 6, "cuando": None}],
      "contexto": ["frustración con el sistema de salud"], "resumen": "Ánimo bajo e insomnio; síntomas digestivos persisten."}),
]

ESTUDIOS = [
    ("2026-07-10", "laboratorio_julio.pdf", {
        "tipo": "Análisis de sangre de rutina", "fecha": "2026-07-10",
        "valores": [
            {"nombre": "Hemoglobina", "valor": "10.8", "unidad": "g/dL", "referencia": "12-16", "fuera_de_rango": True},
            {"nombre": "Ferritina", "valor": "8", "unidad": "ng/mL", "referencia": "15-150", "fuera_de_rango": True},
            {"nombre": "VCM", "valor": "76", "unidad": "fL", "referencia": "80-100", "fuera_de_rango": True},
            {"nombre": "Vitamina B12", "valor": "210", "unidad": "pg/mL", "referencia": "200-900", "fuera_de_rango": False},
            {"nombre": "TSH", "valor": "2.1", "unidad": "mUI/L", "referencia": "0.4-4.0", "fuera_de_rango": False},
            {"nombre": "GOT", "valor": "41", "unidad": "U/L", "referencia": "5-35", "fuera_de_rango": True},
        ],
        "resumen": "Hemoglobina y hierro bajos (anemia por falta de hierro). B12 en el límite inferior. Transaminasa levemente alta.",
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
    for fecha, texto, animo, sueno, energia, est in ENTRADAS:
        conn.execute(
            "INSERT INTO entradas (fecha, texto, animo, sueno, energia, estructura) VALUES (?,?,?,?,?,?)",
            (fecha, texto, animo, sueno, energia, json.dumps(est, ensure_ascii=False)),
        )
    for fecha, nombre, ext in ESTUDIOS:
        conn.execute(
            "INSERT INTO estudios (fecha, nombre_archivo, extraccion) VALUES (?,?,?)",
            (fecha, nombre, json.dumps(ext, ensure_ascii=False)),
        )


# Se muestra si no hay API key o Claude no responde: la demo nunca queda en blanco.
CONSULTA_FALLBACK = """## Motivo de consulta (en palabras del paciente)
"Hace 8 meses estoy cansada, me hincho después de comer y siento que nadie me cree."

## Línea de tiempo
- **Feb 2026**: fatiga persistente. Clínico: atribuido a estrés.
- **Mar 2026**: distensión y dolor cólico después de comer pastas y pan.
- **May 2026**: gastroenterología: colon irritable. Antiespasmódico sin mejoría.
- **Jun 2026**: caída de cabello, aftas orales recurrentes, diarrea 2-3 veces por semana.
- **Jul 2026**: laboratorio: anemia microcítica, ferritina 8.
- **Ago 2026**: pérdida de 4 kg involuntaria, mareos ortostáticos.
- **Sep 2026**: guardia por mareos: indicación de hidratación.
- **Oct 2026**: ánimo bajo, insomnio, síntomas digestivos persistentes.

## Síntomas recurrentes
| Síntoma | Frecuencia | Intensidad prom. | Factores asociados |
|---|---|---|---|
| Fatiga | Continua desde feb | 7/10 | Empeora con el tiempo |
| Distensión abdominal | Casi diaria | 6.5/10 | Después de harinas |
| Diarrea | 2-3/semana | 6/10 | Sin desencadenante claro |
| Aftas orales | Recurrentes | 4/10 | |
| Mareo ortostático | Frecuente | 5.5/10 | Al incorporarse |

## Bienestar general
Ánimo, sueño y energía en descenso sostenido (promedio 2/5). Refiere frustración por consultas sin respuesta.

## Estudios: valores a revisar
- **Hemoglobina 10.8 g/dL** (ref. 12-16), **VCM 76 fL**: anemia microcítica.
- **Ferritina 8 ng/mL** (ref. 15-150): depósito de hierro bajo.
- **GOT 41 U/L** (ref. 5-35): elevación leve.
- B12 210 pg/mL: en el límite inferior.

## Patrones en casos similares de la comunidad
37 personas con un patrón parecido (fatiga, distensión con harinas, anemia ferropénica y aftas) registraron que les fue útil pedir **anticuerpos anti-transglutaminasa IgA con IgA total** y una derivación a gastroenterología para evaluar **endoscopía con biopsia**. _Información orientativa y anónima, no es una indicación._

## Preguntas que el paciente quiere hacer
1. ¿La anemia con ferritina baja puede deberse a un problema de absorción?
2. ¿Corresponde descartar enfermedad celíaca antes de cambiar la dieta?
3. ¿La transaminasa elevada se relaciona con el resto del cuadro?
4. ¿Hace falta suplementar hierro o B12 mientras se estudia?
5. ¿Qué seguimiento le sugiere para el ánimo y el sueño?

_Resumen generado con AI a partir de registros del paciente. No reemplaza el criterio médico._
"""
