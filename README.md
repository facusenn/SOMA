# SOMA: tu historial clínico holístico

Subís tus estudios y contás cómo te sentís (síntomas, ánimo, sueño, energía). La AI lo ordena en una línea de tiempo y, antes de ir al médico, arma un **resumen de una página para el profesional**, con valores fuera de rango, patrones de casos similares (anónimos) y preguntas para hacer.

**No diagnostica.** Prepara la consulta para que el médico llegue con contexto y el paciente no tenga que contar su historia por cuarta vez.

## Correr local
```
pip install -r requirements.txt
export ANTHROPIC_API_KEY=...   # sin key funciona en modo demo
python app.py
```

## Deploy (Render)
[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/facusenn/rotula)

Build: `pip install -r requirements.txt` · Start: `gunicorn app:app --timeout 120` (o usar el Dockerfile) · Env: `ANTHROPIC_API_KEY`

## Docker
```
docker build -t soma .
docker run -p 8000:8000 -e ANTHROPIC_API_KEY=... soma
```

## Qué hace hoy (MVP)
- **Historia universal**: estudios de cualquier institución (público, prepaga, guardia) en una sola línea de tiempo, con fecha y fuente.
- **Bajo del óptimo**: además de "fuera de rango", marca valores "normales" que están por debajo del óptimo.
- **Diario por voz**: síntomas, ánimo, sueño y energía en lenguaje natural, estructurados por AI, con mirada emocional opcional.
- **Lo que sentís y tus valores**: cruza cada síntoma con los marcadores relacionados (bajo, bajo del óptimo o sin medir).
- **¿Te hiciste ver esto?**: estudios que todavía no aparecen en la historia.
- **Resumen para la consulta**, exportable en varios idiomas (pasaporte de salud).
- **Modo consultorio**: transcribe la consulta y escribe la nota clínica (SOAP).
- **Investigador de caso** (para el médico): hipótesis con evidencia a favor y en contra, citando fuentes, y la próxima mejor pregunta.

SOMA no diagnostica: organiza la información para que el profesional decida con mejor contexto.

## Roadmap
Interoperabilidad HL7 FHIR (Ley 27.706), grafo clínico, consejo de agentes especialistas, red de conocimiento colectivo con consentimiento, alertas con criterios validados, cifrado y auditoría de accesos.
