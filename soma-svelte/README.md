# SOMA · demo SvelteKit

Registrás por voz lo que te pasa con tu salud y SOMA lo ordena: historial, estudios y posibles problemas
con qué estudio hacerte para descartarlos y qué decirle al médico. SOMA no es un agente: guarda tu historia
y cualquier agente (Claude, Gemini, ChatGPT) se conecta por la API.

## Correr local

Requiere Node 20.19+ (`nvm use 22`).

```
cp .env.example .env      # poné tu OPENROUTER_API_KEY (sin key corre en modo demo)
npm install
npm run dev               # http://localhost:5173
```

El dictado usa el reconocimiento de voz del navegador: funciona en Chrome/Edge, en `localhost` o con HTTPS.

## Producción (servidor)

```
npm run build
PORT=3000 ORIGIN=https://tu-dominio node build
```

Variables: `OPENROUTER_API_KEY`, `OPENROUTER_MODEL` (análisis y estudios, por defecto `anthropic/claude-sonnet-5.5`),
`OPENROUTER_MODEL_FAST` (registro de eventos, por defecto `anthropic/claude-haiku-5.5`).

## Datos

Todo vive en `data/db.json` (se crea copiando `data/seed.json`, el caso demo de María). Los archivos subidos van a
`data/uploads/`. "Reiniciar demo" en el menú vuelve al seed.

## API para agentes

| Método | Ruta | Qué hace |
| --- | --- | --- |
| POST | `/api/eventos` | Registra un evento: `{ "texto": "me duele la cabeza" }` |
| PATCH / DELETE | `/api/eventos/:id` | Corrige (reprocesa) o borra un evento |
| POST | `/api/estudios` | Sube un estudio (multipart `archivo`, opcional `evento_id`) |
| GET | `/api/historia` | Historia completa |
| GET / POST | `/api/analisis` | Lee / recalcula el top 10 de posibles problemas |
| POST | `/api/reset` | Vuelve a los datos demo |
