# Rótula: tu historial clínico holístico

Subís tus estudios y contás cómo te sentís (síntomas, ánimo, sueño, energía). La AI lo ordena en una línea de tiempo y, antes de ir al médico, arma un **resumen de una página para el profesional**, con valores fuera de rango, patrones de casos similares (anónimos) y preguntas para hacer.

**No diagnostica.** Prepara la consulta para que el médico llegue con contexto y el paciente no tenga que contar su historia por cuarta vez.

## Correr local
```
pip install -r requirements.txt
export ANTHROPIC_API_KEY=...   # sin key funciona en modo demo
python app.py
```

## Deploy (Render)
Build: `pip install -r requirements.txt` · Start: `gunicorn app:app --timeout 120` (o usar el Dockerfile) · Env: `ANTHROPIC_API_KEY`

## Docker
```
docker build -t rotula .
docker run -p 8000:8000 -e ANTHROPIC_API_KEY=... rotula
```
