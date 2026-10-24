"""Rótula: tu historial clínico holístico, listo para la próxima consulta.

No diagnostica. Junta lo que vivís (síntomas, ánimo, sueño, estudios de cualquier
institución) y lo convierte en un resumen de una página para que tu médico llegue con contexto.
"""
import base64
import json
import os
import re
import sqlite3
from datetime import date, datetime

import markdown
from flask import Flask, g, redirect, render_template, request, url_for

app = Flask(__name__)
DB_PATH = os.environ.get("DB_PATH", os.path.join(os.path.dirname(__file__), "rotula.db"))
MODEL = os.environ.get("CLAUDE_MODEL", "claude-sonnet-5-5")

_client = None


def claude():
    global _client
    if _client is None and os.environ.get("ANTHROPIC_API_KEY"):
        import anthropic

        _client = anthropic.Anthropic()
    return _client


def ask_text(system, content, max_tokens=2500):
    """Llama a Claude. Devuelve None si no hay API key o falla: la demo nunca se cae."""
    client = claude()
    if client is None:
        return None
    try:
        msg = client.messages.create(
            model=MODEL,
            max_tokens=max_tokens,
            system=system,
            messages=[{"role": "user", "content": content}],
        )
        return msg.content[0].text
    except Exception as e:
        app.logger.warning("Claude falló: %s", e)
        return None


def ask_json(system, content, max_tokens=1500):
    text = ask_text(system + "\nRespondé SOLO con JSON válido, sin texto extra ni ```.", content, max_tokens)
    if text is None:
        return None
    try:
        return json.loads(text[text.find("{") : text.rfind("}") + 1])
    except ValueError:
        return None


def md(text):
    return markdown.markdown(text, extensions=["tables"])


# ---------- rangos: fuera de rango vs bajo del óptimo ----------

# Rangos óptimos orientativos para marcadores comunes. El rango de referencia del
# laboratorio dice "normal"; el óptimo señala lo que conviene conversar con el médico.
OPTIMOS = {
    "ferritina": (50, 150),
    "hemoglobina": (13, 15.5),
    "vitamina b12": (400, 900),
    "b12": (400, 900),
    "vitamina d": (30, 60),
    "25-oh vitamina d": (30, 60),
    "tsh": (1.0, 2.5),
    "hierro": (70, 150),
    "magnesio": (2.0, 2.4),
    "zinc": (80, 120),
    "ácido fólico": (8, 20),
    "acido folico": (8, 20),
    "glucemia": (75, 95),
}


def _num(s):
    m = re.search(r"-?\d+(?:[.,]\d+)?", str(s or ""))
    return float(m.group().replace(",", ".")) if m else None


def _rango(s):
    nums = re.findall(r"\d+(?:[.,]\d+)?", str(s or ""))
    if len(nums) >= 2:
        return float(nums[0].replace(",", ".")), float(nums[1].replace(",", "."))
    return None


def clasificar(v):
    """Agrega estado y rango óptimo a un valor de laboratorio."""
    valor, ref = _num(v.get("valor")), _rango(v.get("referencia"))
    opt = OPTIMOS.get((v.get("nombre") or "").lower().strip())
    if opt is None and ref:  # sin tabla: el quinto inferior/superior del rango es "límite"
        margen = (ref[1] - ref[0]) * 0.2
        opt = (ref[0] + margen, ref[1] - margen)
    estado = "normal"
    if valor is not None and ref and (valor < ref[0] or valor > ref[1]):
        estado = "bajo" if valor < ref[0] else "alto"
    elif valor is not None and opt:
        if valor < opt[0]:
            estado = "bajo_optimo"
        elif valor > opt[1]:
            estado = "alto_optimo"
    elif v.get("fuera_de_rango"):
        estado = "bajo"
    v["estado"] = estado
    v["optimo"] = f"{opt[0]:g}-{opt[1]:g}" if opt else None
    return v


# ---------- base de datos ----------

def db():
    if "db" not in g:
        g.db = sqlite3.connect(DB_PATH)
        g.db.row_factory = sqlite3.Row
    return g.db


@app.teardown_appcontext
def close_db(_):
    conn = g.pop("db", None)
    if conn:
        conn.close()


def init_db():
    conn = sqlite3.connect(DB_PATH)
    conn.executescript(
        """
        CREATE TABLE IF NOT EXISTS entradas (
            id INTEGER PRIMARY KEY, fecha TEXT, texto TEXT, duracion TEXT,
            animo INTEGER, sueno INTEGER, energia INTEGER, estructura TEXT);
        CREATE TABLE IF NOT EXISTS estudios (
            id INTEGER PRIMARY KEY, fecha TEXT, institucion TEXT, nombre_archivo TEXT, extraccion TEXT);
        """
    )
    if conn.execute("SELECT COUNT(*) FROM entradas").fetchone()[0] == 0:
        from seed import seed

        seed(conn)
    conn.commit()
    conn.close()


def historia():
    entradas = db().execute("SELECT * FROM entradas ORDER BY fecha").fetchall()
    estudios = db().execute("SELECT * FROM estudios ORDER BY fecha").fetchall()
    return {
        "diario": [
            {"fecha": e["fecha"], "texto": e["texto"], "desde_cuando": e["duracion"], "animo": e["animo"],
             "sueno": e["sueno"], "energia": e["energia"], "estructura": json.loads(e["estructura"] or "{}")}
            for e in entradas
        ],
        "estudios": [
            {"fecha": s["fecha"], "institucion": s["institucion"],
             **{**(d := json.loads(s["extraccion"] or "{}")), "valores": [clasificar(v) for v in d.get("valores", [])]}}
            for s in estudios
        ],
    }


# ---------- AI ----------

ESTRUCTURAR = """Sos un asistente que ordena el diario de salud de un paciente. No diagnosticás.
Del texto libre extraé: {"sintomas":[{"nombre":str,"zona":str|null,"intensidad":1-10|null}],
"contexto":[str] (comidas, estrés, actividad, ciclo, medicación, cualquier factor de vida mencionado),
"resumen":str (una línea en tercera persona),
"mirada_emocional":str|null}.
Completá "mirada_emocional" SOLO si se pide. En ese caso escribí 2 o 3 oraciones cálidas, en segunda persona:
qué situaciones de estrés o emociones podrían estar acompañando o amplificando lo que siente (el estrés
aumenta la tensión muscular, el dolor y los síntomas digestivos), una pregunta para reflexionar y un recurso
concreto (respiración, pausa, hablar con alguien, psicoterapia). Nunca digas que el síntoma "es" emocional ni
asignes significados simbólicos a partes del cuerpo. Si no se pide, null."""

EXTRAER = """Sos un asistente que lee estudios médicos (análisis, informes) de cualquier institución.
Devolvé: {"tipo":str,"fecha":"YYYY-MM-DD"|null,"institucion":str|null,"valores":[{"nombre":str,"valor":str,
"unidad":str|null,"referencia":"min-max"|null,"fuera_de_rango":bool}],"resumen":str (2 líneas, lenguaje simple, sin diagnosticar)}."""

CONSULTA = """Sos un asistente que prepara la próxima consulta médica de un paciente.
NO diagnosticás ni indicás tratamientos. Escribís para el MÉDICO, en español rioplatense profesional y breve.
Los estudios vienen de distintas instituciones: unificalos. Cada valor trae "estado": bajo/alto (fuera del rango
de referencia) o bajo_optimo/alto_optimo (dentro del rango pero fuera del óptimo orientativo). Mostrá ambos.
Formato markdown con estas secciones exactas:
## Motivo de consulta (en palabras del paciente)
## Línea de tiempo (lista con fechas, consultas previas e institución de cada estudio)
## Síntomas recurrentes (tabla: síntoma | desde cuándo | intensidad promedio | factores asociados)
## Bienestar emocional y general (ánimo, sueño, energía, estresores: tendencia)
## Estudios: valores a revisar (tabla: valor | resultado | referencia | óptimo | estado | institución y fecha). Remarcá tendencias entre estudios.
## Estudios que todavía no aparecen en la historia (qué podría valer la pena evaluar y por qué, como pregunta)
## Patrones en casos similares de la comunidad (orientativo y anónimo)
## Preguntas que el paciente quiere hacer (3 a 5, concretas)
Cerrá con: "_Resumen generado con AI a partir de registros del paciente. No reemplaza el criterio médico._"
"""

FALTANTES = """Sos un asistente que ayuda a un paciente que sigue sintiéndose mal aunque sus estudios dieron "normales".
No diagnosticás. Mirá sus síntomas y los estudios que YA se hizo (de todas las instituciones), y listá qué otros
análisis o evaluaciones NO aparecen todavía y suelen considerarse ante ese cuadro (vitaminas, minerales,
enzimas, anticuerpos, hormonas, derivaciones). Markdown, en segunda persona, español rioplatense:
## Lo que ya te hiciste (una línea)
## ¿Te hiciste ver esto? (lista: **estudio**: por qué podría aportar, en una oración)
## Valores "normales" que conviene mirar de nuevo (los bajo_optimo / alto_optimo)
Cerrá con: "_Llevá esta lista como preguntas a tu médico: es quien decide qué estudios corresponden._"
"""

NOTA = """Sos un asistente de documentación clínica. Recibís la transcripción de una consulta médica (médico y paciente
hablando) y el historial previo del paciente. Escribí la nota clínica para la historia, en markdown, formato SOAP:
## S: Subjetivo
## O: Objetivo (examen físico y datos mencionados)
## A: Evaluación (lo que dijo el médico; NO agregues diagnósticos propios)
## P: Plan (estudios pedidos, indicaciones, control)
## Para el paciente (3 líneas en lenguaje simple: qué se habló y próximos pasos)
Usá solo lo que está en la transcripción; si algo falta, escribí "No consignado"."""


def estructurar(texto, emocional):
    pedido = texto + ("\n\n[El paciente pidió también una mirada emocional.]" if emocional else "")
    data = ask_json(ESTRUCTURAR, pedido, 900)
    if data is None:
        data = {"sintomas": [], "contexto": [], "resumen": texto[:140], "mirada_emocional": None}
        if emocional:
            from seed import EMOCIONAL_FALLBACK

            data["mirada_emocional"] = EMOCIONAL_FALLBACK
    return data


def extraer_estudio(nombre, raw, mime):
    b64 = base64.standard_b64encode(raw).decode()
    kind = "document" if mime == "application/pdf" else "image"
    block = {"type": kind, "source": {"type": "base64", "media_type": mime, "data": b64}}
    data = ask_json(EXTRAER, [block, {"type": "text", "text": "Extraé los datos de este estudio."}], 2500)
    return data or {"tipo": nombre, "fecha": None, "valores": [], "resumen": "No se pudo leer automáticamente."}


# ---------- rutas ----------

@app.route("/")
def index():
    h = historia()
    entradas = db().execute("SELECT * FROM entradas ORDER BY fecha DESC, id DESC").fetchall()
    items = [
        {"tipo": "entrada", "fecha": e["fecha"], "row": e, "data": json.loads(e["estructura"] or "{}")}
        for e in entradas
    ] + [{"tipo": "estudio", "fecha": s["fecha"], "data": s} for s in h["estudios"]]
    items.sort(key=lambda i: i["fecha"], reverse=True)
    instituciones = sorted({s["institucion"] for s in h["estudios"] if s.get("institucion")})
    alertas = sum(1 for s in h["estudios"] for v in s["valores"] if v["estado"] in ("bajo_optimo", "alto_optimo"))
    return render_template("index.html", items=items, hoy=date.today().isoformat(), ai=bool(claude()),
                           instituciones=instituciones, alertas=alertas)


@app.post("/entrada")
def nueva_entrada():
    texto = request.form["texto"].strip()
    if texto:
        emocional = bool(request.form.get("emocional"))
        db().execute(
            "INSERT INTO entradas (fecha, texto, duracion, animo, sueno, energia, estructura) VALUES (?,?,?,?,?,?,?)",
            (request.form.get("fecha") or date.today().isoformat(), texto, request.form.get("duracion"),
             int(request.form.get("animo", 3)), int(request.form.get("sueno", 3)),
             int(request.form.get("energia", 3)), json.dumps(estructurar(texto, emocional), ensure_ascii=False)),
        )
        db().commit()
    return redirect(url_for("index"))


@app.post("/estudio")
def nuevo_estudio():
    f = request.files.get("archivo")
    if f and f.filename:
        data = extraer_estudio(f.filename, f.read(), f.mimetype or "image/jpeg")
        institucion = request.form.get("institucion") or data.get("institucion") or "Sin especificar"
        db().execute(
            "INSERT INTO estudios (fecha, institucion, nombre_archivo, extraccion) VALUES (?,?,?,?)",
            (data.get("fecha") or date.today().isoformat(), institucion, f.filename,
             json.dumps(data, ensure_ascii=False)),
        )
        db().commit()
    return redirect(url_for("index"))


@app.route("/consulta", methods=["GET", "POST"])
def consulta():
    if request.method == "GET":
        return render_template("consulta_form.html")
    from seed import COMUNIDAD, CONSULTA_FALLBACK

    payload = {"motivo": request.form.get("motivo", ""), **historia(), "casos_comunidad_anonimos": COMUNIDAD}
    texto = ask_text(CONSULTA, json.dumps(payload, ensure_ascii=False)) or CONSULTA_FALLBACK
    return render_template("consulta.html", html=md(texto), titulo="Resumen para la consulta",
                           generado=datetime.now().strftime("%d/%m/%Y %H:%M"))


@app.post("/faltantes")
def faltantes():
    from seed import FALTANTES_FALLBACK

    texto = ask_text(FALTANTES, json.dumps(historia(), ensure_ascii=False), 1800) or FALTANTES_FALLBACK
    return render_template("consulta.html", html=md(texto), titulo="¿Te hiciste ver esto?",
                           generado=datetime.now().strftime("%d/%m/%Y %H:%M"))


@app.route("/consultorio", methods=["GET", "POST"])
def consultorio():
    if request.method == "GET":
        from seed import TRANSCRIPCION_EJEMPLO

        return render_template("consultorio.html", ejemplo=TRANSCRIPCION_EJEMPLO)
    from seed import NOTA_FALLBACK

    transcripcion = request.form.get("transcripcion", "")
    payload = {"transcripcion": transcripcion, "historial_previo": historia()}
    texto = ask_text(NOTA, json.dumps(payload, ensure_ascii=False), 1800) or NOTA_FALLBACK
    return render_template("consulta.html", html=md(texto), titulo="Nota clínica (borrador para revisar)",
                           generado=datetime.now().strftime("%d/%m/%Y %H:%M"))


@app.post("/reset")
def reset():
    os.remove(DB_PATH)
    init_db()
    return redirect(url_for("index"))


init_db()

if __name__ == "__main__":
    app.run(debug=True, port=int(os.environ.get("PORT", 5000)))
