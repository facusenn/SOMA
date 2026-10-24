"""Rótula: tu historial clínico holístico, listo para la próxima consulta.

No diagnostica. Ordena lo que vivís (síntomas, ánimo, sueño, estudios) y lo
convierte en un resumen de una página para que tu médico llegue con contexto.
"""
import base64
import json
import os
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


def ask_json(system, content, max_tokens=1500):
    """Pide a Claude una respuesta JSON. Devuelve None si no hay API key o falla."""
    client = claude()
    if client is None:
        return None
    try:
        msg = client.messages.create(
            model=MODEL,
            max_tokens=max_tokens,
            system=system + "\nRespondé SOLO con JSON válido, sin texto extra ni ```.",
            messages=[{"role": "user", "content": content}],
        )
        text = msg.content[0].text.strip()
        text = text[text.find("{") : text.rfind("}") + 1]
        return json.loads(text)
    except Exception as e:  # la demo nunca se tiene que caer
        app.logger.warning("Claude falló: %s", e)
        return None


def ask_text(system, content, max_tokens=2500):
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
            id INTEGER PRIMARY KEY, fecha TEXT, texto TEXT,
            animo INTEGER, sueno INTEGER, energia INTEGER, estructura TEXT);
        CREATE TABLE IF NOT EXISTS estudios (
            id INTEGER PRIMARY KEY, fecha TEXT, nombre_archivo TEXT, extraccion TEXT);
        """
    )
    if conn.execute("SELECT COUNT(*) FROM entradas").fetchone()[0] == 0:
        from seed import seed

        seed(conn)
    conn.commit()
    conn.close()


# ---------- AI ----------

ESTRUCTURAR = """Sos un asistente que ordena el diario de salud de un paciente.
Del texto libre extraé: {"sintomas":[{"nombre":str,"zona":str|null,"intensidad":1-10|null,"cuando":str|null}],
"contexto":[str] (comidas, estrés, actividad, ciclo, medicación, cualquier factor de vida mencionado),
"resumen":str (una línea en tercera persona)}. No diagnostiques."""

EXTRAER = """Sos un asistente que lee estudios médicos (análisis, informes, imágenes de laboratorio).
Devolvé: {"tipo":str,"fecha":str|null,"valores":[{"nombre":str,"valor":str,"unidad":str|null,
"referencia":str|null,"fuera_de_rango":bool}],"resumen":str (2 líneas, lenguaje simple, sin diagnosticar)}."""

CONSULTA = """Sos un asistente que prepara la próxima consulta médica de un paciente.
NO diagnosticás ni indicás tratamientos. Escribís para el MÉDICO, en español rioplatense profesional y breve.
Formato markdown con estas secciones exactas:
## Motivo de consulta (en palabras del paciente)
## Línea de tiempo (lista con fechas, lo más relevante)
## Síntomas recurrentes (tabla: síntoma | frecuencia | intensidad promedio | factores asociados)
## Bienestar general (ánimo, sueño, energía: tendencia)
## Estudios: valores a revisar (solo los fuera de rango o en el límite)
## Patrones en casos similares de la comunidad (qué estudios o derivaciones les sirvieron a personas con patrones parecidos; aclarar que es información orientativa y anónima)
## Preguntas que el paciente quiere hacer (3 a 5, concretas)
Cerrá con: "_Resumen generado con AI a partir de registros del paciente. No reemplaza el criterio médico._"
"""


def estructurar(texto):
    data = ask_json(ESTRUCTURAR, texto, 800)
    return data or {"sintomas": [], "contexto": [], "resumen": texto[:140]}


def extraer_estudio(nombre, raw, mime):
    b64 = base64.standard_b64encode(raw).decode()
    if mime == "application/pdf":
        block = {"type": "document", "source": {"type": "base64", "media_type": mime, "data": b64}}
    else:
        block = {"type": "image", "source": {"type": "base64", "media_type": mime, "data": b64}}
    data = ask_json(EXTRAER, [block, {"type": "text", "text": "Extraé los datos de este estudio."}], 2000)
    return data or {"tipo": nombre, "fecha": None, "valores": [], "resumen": "No se pudo leer automáticamente."}


def generar_consulta(entradas, estudios, motivo):
    from seed import COMUNIDAD

    payload = {
        "motivo": motivo,
        "diario": [
            {"fecha": e["fecha"], "texto": e["texto"], "animo": e["animo"], "sueno": e["sueno"],
             "energia": e["energia"], "estructura": json.loads(e["estructura"] or "{}")}
            for e in entradas
        ],
        "estudios": [{"fecha": s["fecha"], **json.loads(s["extraccion"] or "{}")} for s in estudios],
        "casos_comunidad_anonimos": COMUNIDAD,
    }
    md = ask_text(CONSULTA, json.dumps(payload, ensure_ascii=False))
    if md is None:
        from seed import CONSULTA_FALLBACK

        md = CONSULTA_FALLBACK
    return md


# ---------- rutas ----------

@app.route("/")
def index():
    entradas = db().execute("SELECT * FROM entradas ORDER BY fecha DESC, id DESC").fetchall()
    estudios = db().execute("SELECT * FROM estudios ORDER BY fecha DESC, id DESC").fetchall()
    items = [
        {"tipo": "entrada", "fecha": e["fecha"], "row": e, "data": json.loads(e["estructura"] or "{}")}
        for e in entradas
    ] + [
        {"tipo": "estudio", "fecha": s["fecha"], "row": s, "data": json.loads(s["extraccion"] or "{}")}
        for s in estudios
    ]
    items.sort(key=lambda i: i["fecha"], reverse=True)
    return render_template("index.html", items=items, hoy=date.today().isoformat(), ai=bool(claude()))


@app.post("/entrada")
def nueva_entrada():
    texto = request.form["texto"].strip()
    if texto:
        db().execute(
            "INSERT INTO entradas (fecha, texto, animo, sueno, energia, estructura) VALUES (?,?,?,?,?,?)",
            (request.form.get("fecha") or date.today().isoformat(), texto,
             int(request.form.get("animo", 3)), int(request.form.get("sueno", 3)),
             int(request.form.get("energia", 3)), json.dumps(estructurar(texto), ensure_ascii=False)),
        )
        db().commit()
    return redirect(url_for("index"))


@app.post("/estudio")
def nuevo_estudio():
    f = request.files.get("archivo")
    if f and f.filename:
        raw = f.read()
        mime = f.mimetype or "image/jpeg"
        data = extraer_estudio(f.filename, raw, mime)
        db().execute(
            "INSERT INTO estudios (fecha, nombre_archivo, extraccion) VALUES (?,?,?)",
            (data.get("fecha") or date.today().isoformat(), f.filename, json.dumps(data, ensure_ascii=False)),
        )
        db().commit()
    return redirect(url_for("index"))


@app.route("/consulta", methods=["GET", "POST"])
def consulta():
    if request.method == "GET":
        return render_template("consulta_form.html")
    motivo = request.form.get("motivo", "")
    entradas = db().execute("SELECT * FROM entradas ORDER BY fecha").fetchall()
    estudios = db().execute("SELECT * FROM estudios ORDER BY fecha").fetchall()
    md = generar_consulta(entradas, estudios, motivo)
    html = markdown.markdown(md, extensions=["tables"])
    return render_template("consulta.html", html=html, generado=datetime.now().strftime("%d/%m/%Y %H:%M"))


@app.post("/reset")
def reset():
    os.remove(DB_PATH)
    init_db()
    return redirect(url_for("index"))


init_db()

if __name__ == "__main__":
    app.run(debug=True, port=int(os.environ.get("PORT", 5000)))
